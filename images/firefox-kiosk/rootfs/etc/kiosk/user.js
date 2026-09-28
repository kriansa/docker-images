// Seeded into /data/firefox/user.js on first start ONLY.
//
// Seeding once rather than baking it into the profile on every start is deliberate: a user.js that
// re-asserts itself would stomp anything changed in about:config while debugging, which is exactly
// when you need to change things. Once the profile exists, this file is history.

// ---- first run / onboarding ------------------------------------------------------------
// A wall display must never come up showing a welcome tour, and there is no one at the keyboard
// to dismiss one.
user_pref("browser.startup.homepage_override.mstone", "ignore");
user_pref("browser.aboutwelcome.enabled", false);
user_pref("browser.messaging-system.whatsNewPanel.enabled", false);
user_pref("browser.rights.3.shown", true);
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("datareporting.policy.dataSubmissionPolicyBypassNotification", true);
user_pref("browser.topsites.contile.enabled", false);
user_pref("browser.newtabpage.activity-stream.showSponsored", false);

// ---- restart hygiene -------------------------------------------------------------------
// One shared profile under a restart loop will eventually be killed mid-write. The recovery and
// "Firefox is already running" dialogs are unrecoverable here: the only input device is the stream,
// and the stream is showing the dialog.
user_pref("browser.sessionstore.resume_from_crash", false);
user_pref("browser.sessionstore.restore_on_demand", false);
user_pref("toolkit.startup.max_resumed_crashes", -1);
user_pref("browser.startup.page", 0);

// ---- rendering ---------------------------------------------------------------------------
// gfx.webrender.all, widget.dmabuf.force-enabled and media.hardware-video-decoding.enabled are NOT
// set here. They are locked by policies.json in the image, because they are facts about this GPU
// rather than preferences — and because this file is seeded once and would therefore keep a stale
// answer forever on an existing volume. See the codec checks in README.md.
//
// WebGL stays enabled (Firefox's default). Video-heavy pages use it for YUV->RGB conversion, so
// disabling it would push that work onto the CPU on exactly the pages this kiosk exists to display.

// ---- streaming ergonomics --------------------------------------------------------------
// Smooth scrolling looks worse through a 60fps encoder than it does locally, because the
// in-between frames are all partial and cost bitrate that the static image would not.
user_pref("general.smoothScroll", false);
user_pref("browser.tabs.warnOnClose", false);
user_pref("browser.download.useDownloadDir", true);
user_pref("browser.download.dir", "/data/home/Downloads");
// Cap the disk cache so the profile cannot grow into the volume. 10G total, and Sunshine's own
// state is kilobytes, so this is effectively the volume's sizing.
user_pref("browser.cache.disk.capacity", 2097152);
// No update machinery in an immutable image: it cannot succeed, and it will nag.
user_pref("app.update.auto", false);
