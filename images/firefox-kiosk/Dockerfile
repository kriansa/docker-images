FROM registry.fedoraproject.org/fedora:44

# Pinned so the image tag and the binaries inside it can never drift apart.
ARG SUNSHINE_VERSION=2026.914.233613
ARG S6_OVERLAY_VERSION=3.2.3.2

LABEL org.opencontainers.image.authors="Daniel Pereira <daniel@garajau.com.br>"
LABEL org.opencontainers.image.source="https://github.com/kriansa/docker-images"

RUN dnf -y install --setopt=install_weak_deps=False \
      # labwc pulls wlroots, libseat and libinput. wlr-randr drives the output mode at stream
      # start; labwc implements wlr-output-management, so this is the standard tool rather than a
      # compositor-specific IPC client.
      labwc wlr-randr \
      firefox \
      # NOT optional, and the single most important line in this file. Firefox ships no H.264
      # decoder of its own on Linux — it dlopens the system libavcodec at runtime. Without it,
      # `MediaSource.isTypeSupported('video/mp4; codecs="avc1.640029")` is false, Firefox reports
      # `support=H264 NONE`, and EVERY video element is black while audio plays normally. A page
      # that carries its own JavaScript decoder will fall back to it and merely look slow rather
      # than broken, which is how this hides. This is also a prerequisite for VA-API/NVDEC below:
      # the hardware path runs through libavcodec too, so without this there is nothing to
      # accelerate.
      ffmpeg-free \
      # libgbm is Mesa's; the NVIDIA *backend* for it arrives from CDI at runtime. libglvnd is the
      # vendor-neutral EGL/GLES loader — the NVIDIA vendor libraries and 10_nvidia.json also arrive
      # from CDI, so nothing NVIDIA is baked into this image and it stays driver-version agnostic.
      mesa-libgbm libglvnd-egl libglvnd-gles vulkan-loader \
      # Hardware video decode in Firefox. libva-nvidia-driver is elFarto's VA-API -> NVDEC shim;
      # vainfo is how you prove it actually loaded, which it fails silently not to.
      libva libva-utils libva-nvidia-driver \
      # Without fonts Firefox renders every glyph as a tofu box. The single most common "the image
      # is broken" surprise in a minimal browser container.
      google-noto-sans-fonts google-noto-color-emoji-fonts dejavu-sans-fonts \
      # Diagnostics the bring-up plan depends on: wayland-info proves which globals the compositor
      # advertises, libinput list-devices proves whether Sunshine's virtual devices were ever seen,
      # and grim gets a frame out to look at when the stream shows something unexpected.
      wayland-utils libinput-utils grim procps-ng \
      # kiosk-seed re-asserts the app name inside apps.json on every start. That is a JSON edit to a
      # file the web UI also rewrites, so it needs a real parser: the app is matched by its prep-cmd
      # rather than by position, which sed cannot do and which is what keeps a UI-added app from
      # being renamed by mistake.
      jq \
      # Idle cursor hiding, which labwc cannot do alone and Firefox does not do for this kiosk.
      # wtype presses the binding rc.xml maps to HideCursor, through the virtual-keyboard protocol
      # so no /dev/uinput access is involved — and so the keystroke does not count as pointer
      # activity. The idle-refresh service uses it the same way to press F5. The timer comes from libinput (libinput-utils, above), NOT from a compositor idle
      # notification; see the cursor-idle service for why that distinction is load-bearing.
      wtype \
      xz tar \
      # Not optional, however much it looks it. Fedora's labwc is built +xwayland, and a labwc
      # built that way treats a missing /usr/bin/Xwayland as FATAL — it logs "cannot create
      # xwayland server" and exits, which under s6 is a crash loop roughly every 0.2s. There is no
      # rc.xml switch to turn it off either; the only related key in the binary is
      # xwaylandPersistence, which governs how long it stays up, not whether it starts. Nothing
      # here actually uses X — Firefox is Wayland-native — so this is a dependency of the
      # compositor, not a feature.
      xorg-x11-server-Xwayland \
 # Installed by URL rather than from a repo so the exact build is pinned and auditable; dnf still
 # resolves its dependencies.
 && dnf -y install \
      "https://github.com/LizardByte/Sunshine/releases/download/v${SUNSHINE_VERSION}/Sunshine-${SUNSHINE_VERSION}-1.fc44.x86_64.rpm" \
 # Fedora's libavcodec-free deliberately ships no native H.264 decoder — it substitutes libopenh264,
 # which is software-only. The VA-API hwaccel attaches to the native decoder, so with the stock
 # package Firefox reports "H264 SWDEC" while VP8/VP9/AV1 report "SWDEC HWDEC": hardware decoding
 # works for every codec except H.264, which is the one most streamed video actually uses.
 # libavcodec-freeworld from RPM Fusion restores the native decoder and with it the VA-API path.
 #
 # This is the only third-party repository in the image, and it is pulled in for exactly one package.
 && dnf -y install "https://mirrors.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm" \
 && dnf -y install --setopt=install_weak_deps=False libavcodec-freeworld \
 && dnf clean all && rm -rf /var/cache/dnf /var/lib/dnf/history*

# Deliberately NOT installed:
#   pipewire / pulseaudio — this app streams no audio (stream_audio = disabled in sunshine.conf).

# s6-overlay. Checksums are verified rather than trusted, because these are fetched over the network
# at build time from outside the distro's signing chain.
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz /tmp/
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz.sha256 /tmp/
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-x86_64.tar.xz /tmp/
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-x86_64.tar.xz.sha256 /tmp/
RUN cd /tmp \
 && sha256sum -c s6-overlay-noarch.tar.xz.sha256 s6-overlay-x86_64.tar.xz.sha256 \
 && tar -C / -Jxpf s6-overlay-noarch.tar.xz \
 && tar -C / -Jxpf s6-overlay-x86_64.tar.xz \
 && rm -f /tmp/s6-overlay-*

# uid 10000 mirrors hermes and is high enough never to collide with a distro-allocated id. -M
# because the home directory lives on the volume: baking it into an image layer would shadow the
# mount. The three supplementary groups are the host's (input/render/video), joined by the quadlet
# with --group-add; they are named here only so the names resolve inside the container.
RUN groupadd -g 10000 kiosk \
 && useradd -u 10000 -g 10000 -M -d /data/home -s /usr/sbin/nologin kiosk

COPY rootfs/ /

# Enterprise policies, unlike prefs, cannot be overridden from about:config — which matters on a
# machine anyone who can pair a Moonlight client can drive. Fedora's Firefox lives in /usr/lib64.
RUN mkdir -p /usr/lib64/firefox/distribution \
 && mv /etc/kiosk/policies.json /usr/lib64/firefox/distribution/policies.json \
 && chmod 0755 /usr/local/bin/*

# --- environment ---------------------------------------------------------------------------
# Required. Each of these is the difference between working and a specific silent failure; CLAUDE.md
# lists the ones that look necessary here and are not.
ENV XDG_RUNTIME_DIR=/run/user/10000 \
    XDG_SESSION_TYPE=wayland \
    HOME=/data/home \
    # `headless` alone provides NO input backend at all, so Sunshine's virtual devices would never
    # reach the compositor. libinput has to be named alongside it.
    WLR_BACKENDS=headless,libinput \
    # wlroots creates ZERO headless outputs by default. =1 yields HEADLESS-1 at 1280x720@60Hz,
    # which is the profile Moonlight clients most commonly ask for, so the primary case needs no
    # mode set.
    WLR_HEADLESS_OUTPUTS=1 \
    # No logind and no seatd here. libseat's `noop` backend is explicitly skipped during
    # autodetection, so it must be named or labwc exits "No backend was able to open a seat".
    # noop open()s device nodes directly with no privilege escalation, which is why the quadlet's
    # supplementary groups are load-bearing.
    LIBSEAT_BACKEND=noop \
    # Suppresses wlroots' fatal "no input devices" at startup. Insurance, not strictly required.
    WLR_LIBINPUT_NO_DEVICES=1 \
    # CDI injects exactly one render node, so this is redundant — set so the choice is stated
    # rather than emergent.
    WLR_RENDER_DRM_DEVICE=/dev/dri/renderD128 \
    # Sunshine reads this variable itself to locate the compositor and does NOT fall back to
    # libwayland's "wayland-0" default the way ordinary clients do. Without it, Sunshine is a
    # sibling s6 service of labwc rather than a child, so it inherits no display and reports only
    # "Unable to initialize capture method" — no mention of Wayland at all — and then every encoder
    # fails for want of something to capture. Confusingly, wayland-info run by hand in the same
    # container works fine, because libwayland DOES apply the default.
    # labwc calls wl_display_add_socket_auto(), which in a fresh container always lands on
    # wayland-0; wait-for-output is what guarantees the socket exists before Sunshine looks.
    WAYLAND_DISPLAY=wayland-0 \
    # Removing THIS one, by contrast, measurably breaks decode: the RDD sandbox blocks VA-API
    # initialisation, the log fills with `vaInitialize failed`, and Firefox silently falls back to
    # software. Note the capability line still reads `support=H264 SWDEC HWDEC` throughout — that
    # advertises what is available, not what is in use, so GPU decoder utilisation is what catches
    # it.
    #
    # The cost is real: this disables the sandbox around the media-decoder process, a bitstream
    # parser. Whether that is worth paying depends on where STREAM_HOME_URL points. For a fixed
    # page on a trusted network it is a fair trade; for a kiosk aimed at the open web it is not —
    # unset it there and accept software decode.
    MOZ_DISABLE_RDD_SANDBOX=1 \
    # The page the kiosk opens on. Overridden by the quadlet.
    STREAM_HOME_URL=about:blank \
    # The app name Moonlight clients see and launch by. Re-asserted by kiosk-seed on every start,
    # so changing it here and restarting always takes effect — and so renaming the app from the web
    # UI lasts only until the next restart.
    SUNSHINE_APP_NAME=Firefox \
    # The machine name Moonlight lists before a client picks an app. Same treatment as the app name
    # above. Set it empty to drop the key and let Sunshine use the host's own name.
    SUNSHINE_HOST_NAME=firefox-kiosk \
    KIOSK_OUTPUT_MODE=1280x720@60Hz \
    # Seconds of pointer stillness before the cursor is hidden, by the cursor-idle service.
    KIOSK_CURSOR_IDLE_SECONDS=5 \
    # Seconds without pointer or keyboard input before the idle-refresh service reloads the page,
    # and again each time that much more passes with no input. 0 turns it off.
    KIOSK_IDLE_REFRESH_SECONDS=0 \
    # A failed startup should crash the container so systemd's Restart=always owns recovery,
    # rather than leaving a half-built session up looking healthy.
    S6_BEHAVIOUR_IF_STAGE2_FAILS=2 \
    S6_KEEP_ENV=1

ENTRYPOINT ["/init"]
