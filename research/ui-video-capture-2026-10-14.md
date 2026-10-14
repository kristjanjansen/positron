# UI video capture for Instagram Stories and Reels, 2026-10-14

Research only. Asked, in the background: *"In bg research what local mcp tools
or diy we can do for ui video capture for ig stories etc"*, then mid task:
*"For ig gfx it can be actual demo, we could use typist engine etc"*. No file in
positron was changed except this one: no code, no build, no deploy, no commit.

**The marks.** TESTED means run on this laptop today, with the scratch script
`cap-test.mjs` in the session scratchpad, against `http://127.0.0.1:8890`, in
headless Google Chrome 155.0.8059.40, every Chrome killed and every temp
profile removed afterwards. READ means a file in this repository read today.
DOCS means a web page read today, cited. INFERENCE is reasoning that nothing
measured.

## The verdict

**Build `demo/reel.mjs` on CDP `Page.startScreencast` for the picture, an
injected WebAudio tap recorded by `MediaRecorder` for the sound, and Homebrew
ffmpeg (`libx264`, AAC) for the file. Pages gain an opt-in `?reel=1` frame mode
that hides the furniture and plays a scripted take.** Every piece of it ran
here today. It is the same browser and the same CDP plumbing `demo/shot.mjs`
already uses, it needs nothing installed, it captures DOM, SVG, canvas and
WebGL alike, and the audio tap needs no line of page code because the harness
injects it with `Page.addScriptToEvaluateOnNewDocument`, so a visitor's page is
byte for byte what it was.

Keep one secondary route: **virtual time frame stepping** (`--smooth`), for
silent pieces like the patchbay hero, where perfectly even frames matter more
than sound. It ran here at 12 frames a second of wall time and is exact.

No MCP server is worth adopting for this. Every one that records is a wrapper
over the same CDP screencast (or Playwright's 1 Mbit VP8 or VP9 encoder),
records no audio, and would need a package install.

## 1. What is on this machine (TESTED, nothing installed)

- `/opt/homebrew/bin/ffmpeg` **9.0.1**, built with `libx264`, `libx265`,
  `h264_videotoolbox`, `hevc_videotoolbox`, `libvpx`, `libopus`, AAC. Also
  `ffmpeg@7`. Homebrew binaries run here; this is the encoder.
- `/Applications/Google Chrome.app` **155.0.8059.40**, the browser `shot.mjs`
  and `verify.mjs` already drive.
- Node **25.9.0**, global `WebSocket`, so raw CDP needs no package (as
  `shot.mjs` does it).
- macOS 27.0.1 with `/usr/sbin/screencapture` (`-v`, `-V`, `-R`, `-g`, `-k`)
  and `/usr/bin/avconvert`.
- Casks already present: **OBS**, **BetterCapture**, **Audio Hijack**,
  **Polypane**. Manual recorders, not tested today.
- No `package.json` or `node_modules` in positron. Other checkouts hold
  `playwright-core` **1.60.0** (`~/personal/visualia`) and `puppeteer-core`
  **24.40.0** (`~/personal/kus`), not used.
- **MCP config:** `~/.claude.json` has no global `mcpServers`; the only project
  server is Figma for the design system repo. positron has no `.mcp.json`. The
  `claude-in-chrome` extension tools are available in this session.

## 2. MCP servers

| server | local? | output | quality and rate | audio | 1080x1920? | source |
| --- | --- | --- | --- | --- | --- | --- |
| **Playwright MCP** `browser_start_video` / `--save-video=WxH` | yes, via `npx @playwright/mcp` (an install) | WebM | VP8 at a **hardcoded 1 Mbit/s realtime** profile up to 1.63; **VP9 and an `fps` option from 1.64**. Bitrate still not settable | **no** | `size` sets the video size; the viewport is separate. Frames come from CDP screencast, so see the DIP limit in 3.1 | DOCS |
| **Chrome DevTools MCP** `screencast_start` / `screencast_stop` | yes, `npx chrome-devtools-mcp --experimentalScreencast=true` (an install) | `.webm` or `.mp4` | not documented; a third party measured a **2.6x timing stretch** (10 s of clock became 23 s of file) and dead air between agent tool calls | **no** | `emulate` takes `'<w>x<h>x<dpr>,mobile'`, so the viewport yes | DOCS |
| **screen-recorder-mcp** (jakubkrzysztofsikora) | yes, Node plus Homebrew ffmpeg `avfoundation` | the whole desktop | display resolution, real time | only a microphone input | only by placing a window that size on a Retina screen | DOCS |
| **claude-in-chrome `gif_creator`** | drives the owner's REAL Chrome, not headless | **animated GIF** built from screenshots taken around actions | quality 1 to 30, frames only at actions, overlays and a watermark on by default | **no** | no. `shot.mjs` records that `resize_window` reported 400x860 and the page laid out at 1429 px | READ (tool schema), not run |

Why none of them: (1) none captures sound, and most pages here are WebAudio;
(2) each records through the same CDP screencast the DIY route uses, so they add
a layer, not a capability; (3) an agent driving a page by tool calls cannot hold
a musical tempo, which is the dead air problem in the Chrome DevTools issue;
(4) each is an `npx` install, and Playwright also downloads its own Chromium
into `~/Library/Caches/ms-playwright`, a binary under `$HOME`, which is the
shape ThreatLocker kills (INFERENCE; `channel: 'chrome'` would use the
installed Chrome instead).

## 3. DIY routes

### 3.1 CDP `Page.startScreencast` into ffmpeg (TESTED)

Front page `/`, 5 s, JPEG quality 90:

| viewport | frames | rate | frame gap median / p95 / max | frame size | JPEG |
| --- | --- | --- | --- | --- | --- |
| 540x960 at dpr 2, mobile | 281 | **56.4 fps** | 16.7 / 18.5 / 268 ms | **540x960** | 67 KB |
| 540x960 at dpr 2 plus `scale: 2` | 280 | 56.2 fps | 16.7 / 18.5 / 267 ms | **540x960** | 69 KB |
| 1080x1920 at dpr 1, `html { zoom: 2 }` | 279 | **56.2 fps** | 16.7 / 18.6 / 267 ms | **1080x1920** | 197 KB |

- 🔴 **The screencast is delivered in CSS pixels, not device pixels.** At dpr 2
  `maxWidth: 1080` still gave 540x960, and the emulation `scale` did not change
  it. So a sharp 1080x1920 needs a 1080 CSS px viewport at dpr 1.
- ✅ **`zoom: 2` on a 1080 viewport renders text and SVG sharp** (looked at:
  the hero headline, the bay's port labels and wires at full resolution). But
  the media query does NOT enter (`matchMedia('(max-width: 560px)')` false,
  `innerWidth` 1231 because the desk layout overflowed), so a reel frame must
  be its own composition, not the phone layout. `typist/paper.mjs` is a size
  container (`cqi`), so the paper follows its frame and not the window.
- ⚠️ **A canvas under `zoom: 2` is stretched**, because `devicePixelRatio`
  stays 1 and the backing store is sized from it (INFERENCE from how zoom
  works; not photographed). A canvas page in reel mode must size its backing
  store by the reel scale.
- Frames arrive only when something changes (the 268 ms max was a still
  moment), so the encoder repeats the latest frame on a fixed clock. Done in
  Node, 30 fps CFR, `libx264 -crf 18 yuv420p +faststart`: a 5 s 1080x1920 file
  of **214 KB**, H.264, 149 frames. Correct.
- Captures whatever Chrome composites, so WebGL is included.
- No audio, ever.

### 3.2 Playwright `recordVideo` (DOCS)

The same screencast, encoded by Playwright's bundled ffmpeg at a hardcoded
1 Mbit/s VP8 (VP9 from 1.64), CSS pixel resolution, no audio. Text gets
mosquito noise at that bitrate. Anything it does, 3.1 does better with the
encoder in our hands. Not tested; the local copy is 1.60 (VP8).

### 3.3 In-page `MediaRecorder` on `canvas.captureStream()` plus a WebAudio tap (TESTED)

- **The tap is injected, not written into pages.** One
  `addScriptToEvaluateOnNewDocument` patches `AudioNode.prototype.connect` so
  any connection to a context's `destination` also feeds a
  `MediaStreamAudioDestinationNode` on that context. About 40 pages create
  their own `AudioContext` (`grep`, READ), so a tap at the shell would miss
  most of them; at the prototype it catches all.
- On `/synth/keyboard/`, keys pressed with CDP `Input.dispatchKeyEvent`, Chrome
  launched with `--mute-audio` and `--autoplay-policy=no-user-gesture-required`:
  context **running**, recorded **AAC 48 kHz stereo, mean -17.2 dB, max
  -0.1 dB**. So the desk stays silent and the file still has the sound.
- `MediaRecorder.isTypeSupported` in Chrome 155 is **true** for
  `video/mp4;codecs=avc1.640028,mp4a.40.2`, `video/mp4;codecs=avc1,opus`,
  `video/mp4`, `video/webm;codecs=vp9,opus`, `video/webm;codecs=h264,opus`.
  A 1080x1920 canvas plus the tap recorded straight to **MP4, H.264 High
  level 4.0 plus AAC**, at about 57 fps, the format Instagram wants without a
  transcode.
- ⚠️ `shell.mjs` `recorderMime()` puts WebM first; a reel recorder wants MP4
  first.
- ⚠️ `--mute-audio` must be kept: `shot.mjs` uses it so a shot never sounds on
  the desk, and the tap does not need the speakers.
- Only canvas pages. A DOM or SVG page has no `captureStream`.
- 🔴 **The take must be scripted in-process, not driven by tool calls**, so
  that notes keep time (the Chrome DevTools MCP issue in section 2).

### 3.4 `getDisplayMedia` tab capture (TESTED, and it fails headless)

`--auto-accept-this-tab-capture` plus `preferCurrentTab: true` granted the
capture with no prompt and the track **claimed** 1080x1920 at 60 fps. The file
was **756x460** (the headless window, not the emulated viewport), **7.6 fps**,
with H.264 decode errors, and the audio track was **silent, max -91 dB**
(`--mute-audio` mutes tab capture too, INFERENCE). Not a route headless. In a
headed Chrome it would work but puts a sharing bar and the owner's desk in the
loop.

### 3.5 Virtual time frame stepping (TESTED)

`Emulation.setVirtualTimePolicy` `pause`, then per frame `advance` with a
16.67 ms budget, wait for `virtualTimeBudgetExpired`, `captureScreenshot`. On
`/` at 540x960 dpr 2:

- 60 frames, **5,053 ms wall, 11.9 frames a second of render**; 1 s of 60 fps
  costs about 5 s, a 15 s Story about 75 s.
- `performance.now()` advanced **exactly 1000.0 ms**; all **60 of 60 frames
  distinct**; each PNG **1080x1920**, 171 KB, because `captureScreenshot`
  honours dpr where the screencast does not. Encoded to 60 fps H.264 cleanly.
- ⚠️ `requestAnimationFrame` kept firing on the wall clock: **304 calls** in
  that 1 s of virtual time. Animation driven by the time it is handed is exact;
  animation that steps per call runs about 5x fast. Each page has to be checked.
- 🔴 **No audio.** The audio thread runs in real time and ignores virtual time.
- `HeadlessExperimental.beginFrame` is the other deterministic API and needs
  the old headless shell; not tried.
- For comparison, real time `captureScreenshot` in a loop at 1080x1920 managed
  **13.0 fps** (52 shots in 4 s, JPEG 187 KB). Too slow for live capture.

### 3.6 Screencast picture plus tapped sound, muxed (TESTED, with an open defect)

`/synth/keyboard/` at 1080x1920 dpr 1, `zoom: 2`, screencast at JPEG 92 and
an audio-only `MediaRecorder` (`audio/webm;codecs=opus`, 192 kbit) on the tap,
both stamped by wall clock (recorder start minus first frame: **-11 ms**),
muxed with `-itsoffset`: **1080x1920 H.264 High at 30 fps plus AAC**, plays.
⚠️ The audio file came out **2.0 s** against about 2.8 s of picture and had no
silence at the start where 300 ms of silence was expected. Sync accuracy was
NOT measured and that mismatch is not explained. It is the first thing to
settle before the recommended route is trusted.

### 3.7 macOS `screencapture -v` (DOCS and `-h`, not run)

Records a display or a rect (`-R x,y,w,h`) to `.mov`, `-V` seconds, `-k` shows
clicks, `-g` adds audio **from the default input, which is a microphone, not
the page**. Needs Screen Recording permission for the terminal and a visible
window. A 1080x1920 capture needs a 540x960 point window on a Retina screen.
Not run, because it would prompt for that permission. BetterCapture and OBS
(both installed) do the same with system audio, by hand.

### Comparison

| route | picture | frame timing | audio | effort | fits the kit |
| --- | --- | --- | --- | --- | --- |
| **3.1 screencast + ffmpeg** | 1080x1920 sharp at dpr 1 with a reel frame; any DOM, SVG, WebGL | ~56 fps live, damage driven, retimed to CFR | none by itself | low: `shot.mjs` plus a frame loop | best: same CDP, same Chrome |
| 3.2 Playwright recordVideo | CSS px, 1 Mbit VP8/VP9 | ~25 to 30 | none | low, needs an install | poor |
| **3.3 MediaRecorder canvas + tap** | full backing store; canvas only | real time ~57 fps | **real** | medium | canvas pages |
| 3.4 getDisplayMedia | 756x460 headless | 7.6 fps | silent | low | fails |
| **3.5 virtual time** | 1080x1920 at dpr 2, exact | perfect 60 | none | medium | silent pieces |
| 3.6 = 3.1 + tap audio | as 3.1 | as 3.1 | **real**, sync unproven | medium | **recommended** |
| 3.7 screencapture -v | display pixels | real time | mic only | by hand | none |

## 4. Instagram specs (DOCS)

| | Story | Reel |
| --- | --- | --- |
| size | **1080x1920, 9:16** (720 px minimum width) | 1080x1920, 9:16 |
| length | **up to 60 s per Story segment**; longer is split | up to 20 min; over **3 min not recommended to new audiences** |
| file | MP4 (or MOV), **H.264**, **AAC**, under 4 GB | same, AAC at 128 kbit or more |
| frame rate | **30 fps** recommended | 30 fps |
| bitrate | ~3.5 Mbit/s cited by guides; Instagram re-encodes anyway | same |
| safe zone | top **~14% (~250 to 270 px)**, bottom **~20% (~340 to 380 px)**, sides **~6% (~65 px)** | top 14%, bottom **35%** (caption, buttons), sides 6% |

- Audio matters on Reels (sound on by default, music is the format's culture)
  and less on Stories (often watched muted). Recording real sound costs little
  here, so record it on everything and let the post decide.
- The bottom figure differs between sources (20% for Stories, 35% for Reels).
  Designing to 14% top and 35% bottom fits both: a usable band of about
  **1080x980 px**, from y 270 to y 1250.
- The `plans/plan-og-insta-images.md` note "about the top and bottom 250 px"
  (MEMORY there) is right for the top and too small for the bottom of a Reel.
- Encode with `-r 30` (record at 60, deliver 30), `-c:v libx264 -profile:v
  high -crf 18 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k -ar
  48000`. CRF 18 at 1080x1920 for these flat dark pages came out at 0.2 to
  0.4 Mbit/s, far under any limit.

Sources:
[teleprompter.com](https://www.teleprompter.com/blog/instagram-video-size-guide),
[socialpilot.co](https://www.socialpilot.co/instagram-marketing/instagram-video-size-specifications),
[influencermarketinghub.com](https://influencermarketinghub.com/instagram-video-size/),
[adstellar.ai](https://www.adstellar.ai/blog/instagram-story-specs),
[postfa.st](https://postfa.st/sizes/instagram/reels),
[superscale.ai](https://superscale.ai/learn/meta-ad-sizes),
[adsuploader.com safe zones](https://adsuploader.com/blog/meta-ads-safe-zones),
[1clickreport.com](https://www.1clickreport.com/blog/meta-ads-creative-safe-zones-2026-guide).
All secondary: Meta's own Business Help Center page answered 404 to a fetch
and Instagram's help is behind a login, so no first party number was read.

MCP and Playwright sources:
[Playwright MCP video tools](https://playwright.dev/mcp/tools/video),
[playwright-mcp issue 1506](https://github.com/microsoft/playwright-mcp/issues/1506),
[Playwright release notes](https://playwright.dev/docs/release-notes),
[Playwright VP8 deep dive](https://dev.to/mutsuntsai/replacing-playwrights-hardcoded-vp8-encoder-a-deep-dive-into-page-screencast-43ee),
[Chrome DevTools MCP tool reference](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/tool-reference.md),
[chrome-devtools-mcp issue 878](https://github.com/ChromeDevTools/chrome-devtools-mcp/issues/878),
[hve-video-director issue 4](https://github.com/nebrass/hve-video-director/issues/4),
[screen-recorder-mcp](https://glama.ai/mcp/servers/jakubkrzysztofsikora/screen-recording).

## 5. The story material is a real demo: `?reel=1` (asked mid task)

*"For ig gfx it can be actual demo, we could use typist engine etc"*. Yes, and
it suits the capture route: the screencast records whatever the page draws, so
a Story is the page itself, in a frame, playing a take.

### Which pages make good 9:16 material

| page | why | render | sound | external source? |
| --- | --- | --- | --- | --- |
| **`/typist/score/`** Multi typer | up to 6 white papers typing themselves from a **seeded** score, each through its own typewriter; `createChatGrid({ fixed: true })` already has a **3:4 phone frame** and stacks 1 to 3 | DOM, `pre` text, container queries | Hermes Precisa samples | samples from `positron-station.kristjan-jansen.workers.dev`, our own worker |
| **`/typist/playback/`** Playback | a paper writes itself again, deletions included, with sound; needs a recorded take fed in | DOM | same samples | same |
| `/typist/typewriter/` | one paper, the bell at the margin | DOM | samples | same |
| **the hero** `demo/shell/hero.mjs` | the front page's patchbay with animated wires, PHONE patch already chosen under 561 px; the OG plan froze its clock and got byte identical frames | SVG + rAF | none | none |
| `/synth/keyboard/`, `/synth/timeline/`, `/drums/machine/` | a bay plus keys or steps lighting in time | DOM/SVG/canvas | WebAudio | none (TESTED keyboard) |
| `/shader/landscape/`, `/shader/mirror/` | full frame WebGL2 | WebGL2 | landscape plays a radio recording | landscape's source goes through `grain-rig.mjs` `createSources`; check whose server before any capture. Mirror and camera pages need a camera |
| `/synth/dots/` | WebGL2 piano | WebGL2 | WebAudio | fetches something; check |

The typist pages are the best first candidates: white paper on dark, large
type, motion that reads in a second, real sound, deterministic text, and a
layout that already follows its frame rather than the window.

### What a page needs to run as a Story

A shell feature, done once in `demo/shell/` (one agent, before any page work,
per CLAUDE.md), then a few lines per page:

1. **`?reel=1` is read once in `mount()` and the default is off**, the same
   pattern as `SELFCHECK` in `demo/shell/selfcheck.mjs`. A visitor never sees
   it and a visit opens nothing new.
2. **Furniture hidden**: header, concept nav, `pos-what`, log, readout, footer,
   the transport bar unless it is part of the picture.
3. **One frame**: `body` becomes a 1080x1920 box on `--bg`, its content a
   540x960 CSS column at `zoom: 2` (because the screencast is CSS pixels, 3.1),
   with the safe band marked by padding: 135 CSS px top, 315 bottom (14% and
   35%), 32 sides. Optionally the wordmark `POSITRON.STUDIO` from the hero in
   the top band, which the UI will cover only partly.
4. **Canvas pages scale their backing store by the reel zoom**, or the canvas
   is blurred (3.1).
5. **A scripted take**: `mount({ reel: async (take) => { ... } })` registers
   the page's own script: typist/score presses play on its transport and sets
   `n` from the query; keyboard plays a phrase through its own `noteOn` path;
   the hero simply runs. It publishes `window.__reel = { ready, start(),
   done, duration }`. In-process, so notes hold their tempo.
6. **Optional `seed=`** for pages with randomness, so a retake is the same
   take.

### How it pairs with the capture route

`demo/reel.mjs` opens `/<slug>/?reel=1&...`, injects the audio tap, waits for
`__reel.ready`, starts the screencast and the audio recorder on the same wall
clock, calls `__reel.start()`, stops at `__reel.done` or `--seconds`, muxes.
The page decides what happens; the script only records. For the silent hero,
`--smooth` takes virtual time frames instead (3.5).

## 6. `demo/reel.mjs`, the shape

```
node demo/reel.mjs typist/score --query n=3 --seconds 15
node demo/reel.mjs synth/keyboard --seconds 10
node demo/reel.mjs hero --smooth --seconds 8          # virtual time, no audio
node demo/reel.mjs typist/score --base https://positron.studio
```

- **Inputs**: slug; `--seconds` (cap 60 for a Story); `--query` for the page;
  `--fps` delivered (30); `--smooth` for virtual time; `--base` (127.0.0.1:8890
  by default, never anybody else's server); `--out` (default `tmp/reels/`,
  not committed, not deployed, like the Instagram images in the OG plan).
- **Chrome**: `--headless=new --mute-audio --autoplay-policy=no-user-gesture-required`,
  temp profile from `mkdtemp`, killed and removed in `finally` and on
  `process.on('exit')`, as `shot.mjs` does it.
- **Viewport**: `Emulation.setDeviceMetricsOverride { width: 1080, height:
  1920, deviceScaleFactor: 1, mobile: true }` (or 540x960 at dpr 2 with
  `--smooth`).
- **Audio**: the prototype tap from 3.3, injected, and an audio-only
  `MediaRecorder`; the file is read back as base64 over `Runtime.evaluate`.
- **Picture**: `Page.startScreencast` JPEG 92, every frame acked, frames held
  with their timestamps, laid onto a 60 fps clock then delivered at 30.
- **Output**: `tmp/reels/<group>-<slug>-<stamp>.mp4`, 1080x1920 H.264 High,
  yuv420p, AAC 48 kHz 192 kbit, faststart; plus a poster JPEG of the first
  frame for the Reel cover; plus a printed line: duration, frames, fps, audio
  max dB, and the A/V offset used.
- **Checks it prints, not grades**: whether audio is silent (max below -60 dB
  means the tap missed a context), and sideways overflow of the frame, the
  same honesty `shot.mjs` has.
- **It never adds `?selfcheck=1`.** A Story is what a visitor sees.

## 7. What could not be settled

- **A/V sync of route 3.6.** The audio file was 2.0 s against ~2.8 s of
  picture, with sound where silence was expected at its start. Needs a clap
  test: a page frame that flashes white and clicks on the same audio clock,
  then compare the onset in the file to the flash.
- **Whether every page's animation keeps time under virtual time** (rAF kept
  firing on the wall clock).
- **Canvas sharpness under `zoom: 2`** was inferred, not photographed.
- **Instagram's first party numbers.** Only secondary guides were readable;
  the bottom safe zone differs between them.
- **The tab audio silence** in 3.4 was attributed to `--mute-audio` without a
  run without it.
- **`screencapture -v`, OBS, BetterCapture** were not run.
- **Which external sources** `/shader/landscape/` and `/synth/dots/` reach
  were not traced; check before capturing either.
- Whether a Chrome update changes screencast resolution behaviour.

## 8. Cost

About 25 minutes of wall time; seven headless Chrome runs of 5 to 10 s each
against the local server only, no external server opened (no ERR, no
archive.org); a dozen web searches and fetches. Scratch files and test videos
are in the session scratchpad, not in the repository.
