# firefox-kiosk

A container that streams a browser to Moonlight clients. It runs a headless
[labwc](https://labwc.github.io/) session with Firefox in kiosk mode, and
[Sunshine](https://docs.lizardbyte.dev/projects/sunshine/) encodes that session with NVENC and
serves it over Moonlight's protocol.

The point is to keep the browser on the machine with the GPU and leave the client decoding a
finished H.264 stream, so a thin client far too weak to render the page itself can still display it.
Nothing in the image is tied to a particular site — the page it opens is `$STREAM_HOME_URL`.

Published as `ghcr.io/kriansa/docker-images/firefox-kiosk`.

## The contract

A deployment depends on all of these. Changing any of them breaks it from the outside, silently:

| | |
|---|---|
| Runs as | uid/gid **10000** for every service, so the volume has a single owner |
| State | everything under **`/data`** — see `rootfs/usr/local/bin/kiosk-seed` for the layout |
| Sunshine app name | **`$SUNSHINE_APP_NAME`** — clients launch it by name |
| Start page | **`$STREAM_HOME_URL`** |
| Bind address | **`$SUNSHINE_BIND_ADDRESS`**, or Sunshine listens on every interface |
| Ingress origin | **`$SUNSHINE_CSRF_ORIGINS`** must match the reverse proxy's hostname, or its login is refused |
| Clients | **`$SUNSHINE_CHANNELS`** — how many may share the session |
| Codecs | H.264 and HEVC. **No AV1** — Ampere has no AV1 encoder |

## Why these parts

**Fedora**, because the NVIDIA Container Toolkit's CDI spec injects driver libraries into
`/usr/lib64` and the GBM backend into `/usr/lib64/gbm` — which on Fedora is already Mesa's backend
directory, so `libgbm` finds `nvidia-drm_gbm.so` with no `GBM_BACKENDS_PATH` and nothing depends on
the CDI hook teaching `ld.so` about a foreign libdir. Fedora also has the only official Sunshine RPM.

**labwc**, because Sunshine's `wlr` capture needs `zwlr_screencopy_manager_v1`, `zxdg_output_manager_v1`
and `zwp_linux_dmabuf_v1`, and labwc advertises all three plus the successor
`ext_image_copy_capture_manager_v1`. It also implements `wlr-output-management`, which sway does not,
so the standard `wlr-randr` sets the output mode instead of a compositor-specific IPC client.

**s6-overlay**, for one ordering constraint that matters: Sunshine validates its encoders at startup
by performing a real capture, so starting it before an output exists makes it conclude NVENC is
unusable — silently, for the life of the process. `output-ready` gates it. Firefox is not an s6
service; labwc launches it with `-S`, so the compositor owns that ordering itself.

**wtype**, because the pointer has to be hidden when idle and nothing else will do it. Firefox only
hides the cursor during its own fullscreen video playback, which is not the state this kiosk sits
in. labwc has no cursor-timeout setting in any released version — only a `HideCursor` action, and
actions fire only from bindings — so the `cursor-idle` service synthesises the keystroke `rc.xml`
maps to it. The timer comes from libinput rather than a compositor idle notification, because
Firefox holds a Wayland idle inhibitor while playing video and a video wall therefore never goes
idle.

## Configuration: seeded once, or enforced every start

Two policies, and the split is deliberate — see `rootfs/usr/local/bin/kiosk-seed`.

**Seeded once**: `sunshine.conf` as a whole, `apps.json`, the Firefox profile's `user.js`. Sunshine
rewrites its config from the web UI and Firefox owns its profile, so re-asserting these would
discard changes made through the UI.

The same rule is why the state directory cannot be migrated. `/data` replaced an earlier `/state`,
and a volume written under the old name keeps a `sunshine.conf` whose `pkey`, `cert` and `file_apps`
still point at `/state/...` — paths seeding will never rewrite. Sunshine would regenerate its
certificates on every start and no client would stay paired. Start from an empty volume instead:
clients pair once more and the web UI password is set again.

**Enforced every start**: `bind_address`, `csrf_allowed_origins`, `channels`, `sunshine_name`, and
the app's `name` inside `apps.json`. These are individual values re-asserted inside files that are
otherwise left alone, so everything else the UI changed survives. Each is set from outside the
image, so it has to follow what it was given: seeded once, they would keep a stale answer after the
address, the ingress hostname or the name changed, and the failure would look like a Sunshine bug.
The cost is that none of them can be changed from the web UI — an edit there lasts until the next
restart and is then overwritten.

The two names are `$SUNSHINE_APP_NAME`, which clients launch by, and `$SUNSHINE_HOST_NAME`, the
machine Moonlight lists before a client picks an app. Changing either and restarting always takes
effect, on a fresh volume or an existing one. The app entry is found by its `stream-prep` prep-cmd
rather than by its position, so an app added through the web UI is never renamed by mistake — and
if the entry is deleted there, nothing is recreated.

**Locked by policy**: anything about the GPU lives in `rootfs/etc/kiosk/policies.json`, not in
`user.js`. Firefox applies policies from the image on every start, so they cannot drift; a `user.js`
seeded into an existing profile would keep the old answer forever.

## Building and testing

CI builds this on every push that touches `images/firefox-kiosk/**`, and that build proves only that
the image assembles. It cannot prove the image *works*: a GitHub runner has no NVIDIA GPU, no
`/dev/uinput` and no CDI spec, so nothing below the first `dnf install` is exercised there.

To build it by hand, from this directory:

```sh
podman build -t firefox-kiosk:dev .
```

Run it with the full device and namespace set. A run with fewer devices proves nothing about a
deployment, because the permission model is most of the risk:

```sh
podman run --rm --name kiosk-dev \
  --network=host \
  --userns=host \
  --group-add "$(getent group input  | cut -d: -f3)" \
  --group-add "$(getent group render | cut -d: -f3)" \
  --group-add "$(getent group video  | cut -d: -f3)" \
  --device nvidia.com/gpu=all \
  --device /dev/uinput \
  -v /dev/input:/dev/input:rw \
  -v /run/udev:/run/udev:ro \
  --device-cgroup-rule 'c 13:* rmw' \
  --shm-size=512m \
  --tmpfs /run/user/10000:rw,mode=0700,size=64m \
  -v /var/tmp/kiosk-data:/data:Z \
  -e STREAM_HOME_URL=https://example.com/ \
  -e SUNSHINE_BIND_ADDRESS=<this host's address> \
  firefox-kiosk:dev
```

**Host networking is not a convenience.** Sunshine builds its virtual keyboard and mouse on
`/dev/uinput` *after* labwc has already enumerated its devices, so they arrive as a hotplug — and
hotplug is delivered over a netlink uevent socket, which is scoped to the network namespace. Publish
Sunshine's ports individually instead and labwc never configures those devices: video is perfect and
input is dead. (For reference, the published-port set that produces that failure is 47984, 47989,
47990 and 48010 TCP plus 47998-48000 UDP.)

## Verifying

A picture on screen is weak evidence — a silently degraded stack looks identical to a working one.
Each of these checks a different link.

```sh
# Codec support. THE most important check: without libavcodec Firefox decodes no H.264 at all,
# and every video is black while audio plays normally. Needs MOZ_LOG (below).
podman logs <container> 2>&1 | grep -aE "Broadcast support from|IsTypeSupported.*avc1"

# Encoder. "Trying encoder [nvenc]" with no failure after it; a fallback is silent otherwise.
podman exec <container> grep -aE "Trying encoder|Encoder \[" /data/sunshine/sunshine.log

# Input. The three libvirtualhid devices only exist while a client streams.
podman logs <container> 2>&1 | grep "configuring input device"

# GPU. labwc and firefox as type G, sunshine as C+G.
nvidia-smi

# What is actually on screen.
podman exec <container> drop-privs grim /tmp/f.png
```

The target for the first is `support=H264 SWDEC HWDEC`. To get that detail, add these to the
container temporarily and restart — at level 5 they are enormous, so remove them afterwards:

```
MOZ_LOG=PlatformDecoderModule:5,MediaSource:4
NVD_LOG=1
```
