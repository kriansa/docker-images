# firefox-kiosk — agent notes

See [README.md](README.md) for what this image is, its contract and how to build it. This file is
the trap list: failures whose symptom points nowhere near the cause. Each one cost hours once.

Every trap below has its full reasoning in a comment at the place it applies — the `Dockerfile`,
`rootfs/etc/kiosk/*`, `rootfs/usr/local/bin/*`. Read that comment before changing the line it
guards; this file exists so you know which line to look at.

## Symptom → cause

**Every video is black, audio plays fine.** Firefox has no H.264 decoder. It ships none on Linux and
dlopens the system `libavcodec`, so a minimal image has nothing to decode with. A page that carries
its own JavaScript decoder will fall back to it and merely feel slow, which hides the cause. Two
packages, and the second is easy to miss: `ffmpeg-free` makes H.264 play at all;
`libavcodec-freeworld` (RPM Fusion) makes it *hardware* decoded, because Fedora's stock build
substitutes software-only libopenh264 and the VA-API hwaccel attaches to the native decoder it
omits. The tell is `VP8/VP9/AV1 SWDEC HWDEC` beside `H264 SWDEC` — hardware decoding for every
codec except H.264.

**Hardware decode silently stops and CPU climbs.** The RDD sandbox is blocking VA-API
initialisation — `MOZ_DISABLE_RDD_SANDBOX=1` is the one decode variable this image still needs.
The log fills with `vaInitialize failed` from the RDD process. Measured with it removed: hwaccel
errors 0 → 92 and GPU decoder utilisation 11% → 1%, while video kept rendering, so nothing looks
broken from the outside.

**`support=H264 SWDEC HWDEC` does not mean hardware decode is in use.** It advertises what is
available. It read exactly the same in the failing case above, so it cannot confirm the decode path
on its own — GPU decoder utilisation and the hwaccel error count are what distinguish use from
availability.

**labwc exits immediately, roughly five times a second.** Either Xwayland is missing — Fedora builds
labwc `+xwayland` and it treats an absent binary as fatal, with no rc.xml switch — or `rc.xml`
failed to parse. XML forbids `--` inside a comment, so command-line flags cannot be written there
with their dashes, and labwc treats a parse error as fatal too.

**`Unable to initialize capture method`, with no mention of Wayland, then every encoder fails.**
Sunshine reads `WAYLAND_DISPLAY` itself and does not apply libwayland's `wayland-0` default. As a
sibling s6 service of labwc it inherits no display. Confusingly, `wayland-info` run by hand in the
same container works, because ordinary clients *do* apply the default.

**`Missing Wayland wire for wlr-export-dmabuf`.** Screencopy is missing. Sunshine's error names a
protocol it no longer binds; the global it looks for is `zwlr_screencopy_manager_v1`.

**A `sunshine.conf` value is reported as an unknown value.** Its parser strips a trailing `#` comment
but keeps the whitespace before it, so `encoder = nvenc   # fast` sets `"nvenc   "`. Keep every
comment on its own line.

**`podman exec` says an s6 tool is not found.** s6-overlay's binaries live in `/command`, which only
`/init` puts on `PATH`. Call them by absolute path — that is why `drop-privs` uses
`/command/s6-applyuidgid`.

**The container starts cleanly, then cannot open `/dev/uinput` or the render node.** `s6-setuidgid`
re-derives supplementary groups from `/etc/group` and discards the host groups podman granted with
`--group-add`. `drop-privs` carries the inherited list through instead, minus gid 0.

**Alt-Tab, the root menu or a window-close binding work inside the kiosk.** labwc loads its full
default bindings whenever the config defines none at all. An empty `<keyboard>` section is not
enough — one no-op key binding *and* one no-op mouse binding are what suppress them.

**Clients need re-pairing after every restart, and the app list is empty.** The volume is mounted
somewhere other than `/data`. `sunshine.conf` is seeded once and records absolute paths, so its copy
on that volume still names the path it was seeded at for `pkey`, `cert`, `credentials_file`,
`file_state` and `file_apps`. Sunshine reads and writes those inside the container instead of on the
volume, so nothing it generates survives. Seeding will not rewrite them: fix the mount point, or
rewrite those five keys by hand.

**An app or host renamed in the Sunshine web UI goes back to its old name after a restart.** Not a
bug and not Sunshine losing the edit. `kiosk-seed` re-asserts `sunshine_name` and the app's `name`
on every start from `SUNSHINE_HOST_NAME` and `SUNSHINE_APP_NAME`, the same way it re-asserts
`bind_address`. The environment owns both names; the UI cannot. Change the variable instead.

**A deploy reports `changed=0` but the container runs the old image.** Rebuilding under the same tag
changes nothing the quadlet can see. Restart the unit explicitly until the image reference is a
versioned registry tag.

## Things that look wrong and are not

- **`Failed to gain CAP_SYS_ADMIN`** on every start. Sunshine asks for it to use the KMS capture
  backend, which cannot address a compositor-virtual output anyway. The `wlr` backend needs no
  capability.
- **`setpriority failed` / `CAP_SYS_NICE capability is missing`.** Sunshine wants to raise its
  encoder threads above everything else on the box. Granting it would let this container outrank
  whatever else shares the host and its GPU.
- **A video black for the first thirty seconds.** On a page with several of them they come up one
  at a time; judge the display two or three minutes after a restart. Restarting Firefox alone
  settles them faster than restarting the app — `pkill -f "firefox --kiosk"`, and labwc's `-S` loop
  respawns it.

## Constraints to preserve

- **Observe Sunshine's client API (47984) with `ss`, and ask 47989 over plain HTTP for its state.**
  A TLS probe that aborts its handshake — anything with `curl --max-time` — leaves a socket in
  `CLOSE-WAIT`, and enough of those stop the port accepting. A diagnostic that degrades the thing it
  measures produces evidence that is worse than none.
- **Keep the output pinned.** `stream-prep` asserts a fixed mode and ignores `SUNSHINE_CLIENT_*` on
  purpose: every client shares one session, so sizing the output to whoever connected last resizes
  it under everyone already watching.
- **`channels` buys concurrent viewers, not concurrent users.** It is co-op sharing of a single
  session — one screen, one cursor — and it does not change the `SUNSHINE_SERVER_BUSY` that clients
  gate on when deciding whether to offer a launch. Per-client desktops mean a different server
  entirely, not a setting.
- **The image is vendor-neutral, and keeping it that way was measured.** `LIBVA_DRIVER_NAME`,
  `NVD_BACKEND` and `NVD_MAX_INSTANCES` were each removed and verified: libva finds the vendor
  driver unaided, `direct` is already the backend it selects, and the instance cap never applied —
  it was a wrong fix for what turned out to be a missing codec. `MOZ_ENABLE_WAYLAND` went the same
  way, since Firefox enables Wayland whenever `WAYLAND_DISPLAY` is set. Swapping the GPU for another
  brand should need no edit; re-adding any of them re-couples the image to one vendor.
- **Several environment variables are inert here.** `WLR_NO_HARDWARE_CURSORS` disables cursor planes,
  a DRM-backend property the headless backend does not have; `GBM_BACKENDS_PATH` is unnecessary on
  Fedora; `__GLX_VENDOR_LIBRARY_NAME` is X11-only. They appear in every headless-streaming guide
  online because those were written against DRM setups, so expect to meet them again.
