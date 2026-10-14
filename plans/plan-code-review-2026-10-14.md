# Code review and simplification proposal, 2026-10-14

Asked: *"In bg do comprehensive code revirew and simplification proposal"*.

This is a proposal. No code was changed, nothing was staged, committed or
deployed. No browser was started and no external server was contacted. Every
number below was measured on 2026-10-14 against the working tree at
`36e99503` (plus the uncommitted `BACKLOG.md`, `demo/index.html` and
`.claude/skills/` edits of other agents, which were not read as findings).
Scratch scripts live in the session scratchpad, not in the repo.

## Verdict

1. **The code works and the kit is converging.** I found no page
   hand-rolling a slider, table or transport bar. The patchbay family has one
   module per job, with one exception (`bay-svg.mjs`, below).
2. **There are about 19 real correctness bugs in the kit and 9 in the
   workers.** Most of them are teardown leaks: a timer, an AudioContext, a
   peer connection or a reconnect that outlives `close()`. Two of them corrupt
   behaviour a visitor can hear: a note-off that becomes a note-on, and a
   loop head drawn at the wrong rate.
3. **The weight is not in dead code. It is in comments and tracked
   generated files.**
   - `shell.css` is 70.6 per cent comment (5,702 of 8,080 lines). Dead
     selectors are about 1 per cent of it.
   - The kit (`demo/shell/*.mjs`, tests excluded) carries 39,543 comment
     lines against 32,934 code lines.
   - About 245,000 tracked lines are esbuild bundles in `rig/moq/spike/www/`.
     Another 15,808 are a bundle in the retired `workers/moq-safari/`.
4. **Some things in the tree must not go public as they are:** five tracked
   `.wrangler/cache/wrangler-account.json` files (account id and email), a
   tracked private key, and a 47 MB `.so` binary. The repo was being prepared
   to go public, so this is the first phase.
5. **Nothing runs the kit's 55 unit tests.** I ran them: 2 are red today, and
   3 pass while testing nothing.

## How it was measured

| what | command |
| --- | --- |
| files in scope | `git ls-files \| grep -v '^workers/view/public/' \| grep -E '\.(mjs\|js\|html\|css)$' \| wc -l` gives 938 |
| demo count | `node -e "import('./demo/manifest.mjs')..."` gives 56 rows, 55 built (`deck` unbuilt), 42 concept cards in 10 `CONCEPT_DIRS` |
| comment vs code | scratch `cmt.mjs`: counts `//`, `/* */` and `<!-- -->` lines per file |
| modules with no importer | scratch `refs.mjs`, then `git grep -n "/<name>.mjs"` by hand on each hit, then a check that no `import()` with a variable or a string path reaches it |
| unused exports | scratch `exports.mjs`: every `export` name in `demo/shell/*.mjs`, word-grepped across every tracked file except its own module (`.md` excluded) |
| unit tests | scratch `runtests.mjs`: `node demo/shell/<x>-test.mjs` with a 60 s timeout; `board-collide-test` and `mp3-frames-test` skipped because they open sockets to the relay and to shout |
| options nobody passes | scratch `opts.mjs`: destructured `{ ... } = {}` parameters of exported `create*` factories, searched for in their callers |
| CSS | a separate audit with its own parser (dead classes, structure, inline styles) |
| duplication | a separate audit with a line-run detector (identical runs of non-comment lines) |
| workers and rig | a separate read-only audit |

I spot-checked the delegated audits by hand:
- `diff` of the two `engine-node.mjs` copies;
- the CSS classes `pos-xr-offer`, `tbar-live` and `pos-bgroup-cols`;
- `wire.mjs:254-385`, `board.mjs:260`, `looper.mjs:440-452` and
  `patchbay.mjs:99-110`;
- `ingest/worker.mjs:309-329`;
- the tracked `.wrangler`, `.pem`, `.so` and `__pycache__` files.

All of them held.

---

## A. Correctness bugs

Ranked by harm to a visitor, then by effort to fix. "Confidence" is about
whether the bug exists, from reading the code. None was reproduced in a
browser.

### A1. Kit (`demo/shell/`)

| # | where | bug | concrete failure | conf. |
| --- | --- | --- | --- | --- |
| 1 | `bay.mjs:242,322,343` with `wish/index.html:1388,1441` | The bay's MIDI event `{cls, ch, d1, d2}` has no status. Every op takes "note with d2 > 0" to be a note-on. | A keyboard that sends note-off as `0x80 nn 64` goes through `/wish/` and is written back as `0x90 nn 64`. Every released key re-triggers and notes stick. Behind a `vrange hi 63` layer, the note-off of a soft note is dropped, so that note sticks too. | high |
| 2 | `wire.mjs:304` and `:385` | `setTimeout(connect, backoff)` is not stored. `close()` sets `closed` but `connect()` never checks it (the check at `:287` runs only in `onclose`). | The relay blips and a reconnect is queued. The user presses Leave inside the 0.3 to 5 s window. A new socket opens anyway, `bay-node` sets `me` again, and the page stays in the room (on `studio-1`, beside the Pi) with nothing to close it. | high |
| 3 | `board.mjs:260` and `:830` | `setInterval(driverTick, 250)` is never cleared. `close()` clears only `rttTimer`. | Every `boardOn()` (`openers.mjs:151`, `midi-node`) leaks a 4 Hz timer for the life of the page. After close it can still log "the instrument is yours again". | high |
| 4 | `openers.mjs:222,235` | The synth opener's `close` never calls `ctx.close()`. `dropSource` at `:202` does. | Opening and closing a synth link N times leaves N live AudioContexts holding the device. | high |
| 5 | `looper.mjs:447-452` | `setRate` updates `src.playbackRate` but not `voiceRate`, `at` or `off`, which `headFrac()` at `:440` uses. | Picking 2x while a loop runs draws the head at half the real speed. The next `setWay` restarts the sound from the wrong place, which is audible. | high |
| 6 | `transport-bar.mjs:1467` against `:1021-1030` | Space calls `cmd.play()` or `cmd.pause()` directly. It skips the button's `stopLap()` and `leaveEnd()`. | During a back or ping-pong lap, Space plays forward while `driveLap` seeks back every frame, so it stutters. At the end, Space does nothing where the button restarts. | high |
| 7 | `live.mjs:268,290,409` | A failed WHEP or WHIP offer never closes `pc`. A throw after a 2xx WHIP never DELETEs the session. | Each failed Start leaks an `RTCPeerConnection`. On `/cam/` the one-camera input stays held until it idles out, and the next try gets 409. | high |
| 8 | `moq-audio.mjs:112,129,161` | `close()` leaves the capture worklet connected and its `onmessage` set. `st.transitMs` grows without a cap and is sorted on every `stats()`. | Each publish and stop cycle stacks another live capture node that calls a closed encoder each render quantum. The readouts slow down the longer the page is open. `moq.mjs` `samples` has the same growth. | high |
| 9 | `midi-node.mjs:220-237` | `opened.has(key)` is checked before an `await openBoard()` that can take up to 6 s, and set after it. | A double press, or `request()` retrying after its 8 s timeout, opens two boards. The first one, with its 1 s poll and `midimessage` listener, is never closed. A close that arrives in that window is lost. | medium |
| 10 | `board.mjs:290-379` | `ctx` is assigned before `await addModule(PLAYOUT_URL)`. | A second `startAudio()` during the await gets a context with no playout, and `holdSource` throws. If `addModule` rejects, every later call returns that dead context: silent for the rest of the page's life. | medium |
| 11 | `keyboard.mjs:1465,1491,1993,2113` | Neither `panic()` nor `destroy()` stops running takes. `t.timers` grows by about (events + 1) per lap. | A loop goes on calling `onDown` and `onUp` after the keyboard is destroyed, and Panic does not stop it either. | medium |
| 12 | `patchbay.mjs:99-110` | The relay-hop cache key is `from -> to` without the transforms, and a cache hit refreshes `options` but not `transforms` or `enabled`. | A cross-site link changed from `transpose 12` to `transpose 7` keeps drawing and printing `transpose 12`. | medium |
| 13 | `moq.mjs:316-327,404-408` | No `stop()` exists while it waits for the catalog (up to 25 tries of about 5 s). `stop()` never closes the encoder or decoder. | Stop pressed during that wait does nothing. When the catalog arrives, decoding starts after the user stopped. | medium |
| 14 | `hero.mjs:177-189` with `bay-traffic.mjs:164` | `draw()` runs on every change of the 560 px query and calls `life.add`. The traffic list only grows. | Resizing a desk window back and forth across 560 px adds 6 or 7 animated rows each time, evaluated every frame, on the front page. `patchbay.mjs` `trace()` at `:196-215` grows the same way. | medium |
| 15 | `shell.mjs:333` against `:690-699` | `api.logs` is capped at 400 but the DOM log never trims. | A page that logs periodically grows its `<pre>` for hours, and the screen disagrees with `__demo.logs`. | medium |
| 16 | `shell.mjs:1024` | The shipper deduplicates on the first 60 characters, and the last 2 s are never flushed on `pagehide`. | Two different device-log lines with a common 60-character prefix count as one repeat, and the second line's text is lost. That hurts exactly the logs that phones and headsets are debugged from. | medium |
| 17 | `knob.mjs:525` | `receive(..., { force: true })` sets `dragging = false` mid-drag, so pointerup returns early. | An auto-moving knob stays parked after the drag, and pointer capture is not released. | medium-low |

Suspected but not confirmed:
- `knob.set(NaN)` sticks (`knob.mjs:127`), but no caller passes NaN.
- `mp3-stream` `started` never settles on a fetch failure (`:197`).
- `createMidi().close()` before access resolves (`midi.mjs:273`).
- `bay-node` `leave()` during `join()`.
- The step-grid rAF clock drops a hit when a frame is longer than one step
  (`step-grid.mjs:723-731`).
- `detectBpm` at exactly 80 bpm reports 160 (`numloop.mjs:246`).

### A2. Harness and dev server

| # | where | bug | failure | conf. |
| --- | --- | --- | --- | --- |
| 18 | `demo/verify.mjs:290,1211` | Chrome is killed only on the normal path. There is no `finally` and no `process.on('exit')` (`grep -c "process.on('exit'" demo/verify.mjs demo/verify-gl.mjs` gives 0 and 0). Uncaught throws are at `:872` (`t0.pos.toFixed`), `:911` (`rng[0]`) and `:967` (a click by stale index). | A run that throws orphans headless Chrome and the stand-in servers. That breaks the 2026-10-11 rule in CLAUDE.md. | high |
| 19 | `verify.mjs:255` with `manifest.mjs:361` | `settleOf` returns `t.settleMs`, which is undefined, under `DEMO_DEEP` for rows that declare only `lightSettleMs` (`llhls`, `webrtc`, `capture`). | The deep tier waits less (650 ms, first budget 0) than the light tier for `capture`. | high |
| 20 | `server.mjs:62` | `decodeURIComponent` throws in an async handler with no try. | A request for `/%E0%A4%A` kills the dev server, and the same `serve()` runs inside `verify.mjs`. Separately, `/_log` (`:119-133`) answers `access-control-allow-origin: *`, so any website open on this machine can append to `.tap/log.jsonl`. | medium |
| 21 | `workers/view/deploy.mjs` | `built` and `beforeUpload` are two `fingerprint(PUBLIC)` calls made back to back, so the "changed between build and upload" interlock covers a window of milliseconds. A build that lands during the spawned `build.mjs` is not detected. | The interlock reads as protection it does not give. | high (that the window is tiny); low harm |

### A3. Workers

| # | where | bug | failure | conf. |
| --- | --- | --- | --- | --- |
| 22 | `workers/shout/worker.mjs:520,591,664` | `open()` checks `this.reader`, then awaits `fetch(origin)`. The DO input gate does not cover an outbound fetch, and `pump` never checks that `this.reader` is still its own reader. | Two listeners arriving together open **two upstream connections to an ERR mount**, mix the audio, and the first to end drops everyone. Each duplicate appears in ERR's listener statistics, which is the harm CLAUDE.md names. | medium-high |
| 23 | `workers/store` `#onMessage` (lines 145-189) | `meta.seen++` and a `storage.put` on every relayed frame. Binary frames are kept up to 1 MB, capped at 1000 rows. `/clear-all` and `/room/<n>/clear` have no auth. | A recorded room with a knob in it writes about 60 times a second, which costs real money, and holds up to about 1 GB per room. Anyone can wipe it. | high (cost) |
| 24 | `workers/feedback` (lines 63,165-166) | The origin check reads a self-reported `m.origin`, and the rate limit is keyed on a self-reported `m.from`. | Anyone on the public relay floods the room, and CAP 2000 rolls the real notes out. | high |
| 25 | `workers/mail/src/index.js:211,265` | The sender's full address goes into a public room readable at `GET /feedback` with no auth. If `sayIntoRoom` throws, the mail is lost before `setReject`. | Email addresses are published. This may be a design choice: the owner decides. | high that it happens |
| 26 | `workers/pub/worker.mjs:242-247` | `#iceHits`, `#whipHits` and `#camHits` are in memory. `/stage/start`, `/stage/stop` and `/logs/clear` have no auth. | The ICE minting limits reset on every eviction. Anyone can stop the stage film or wipe the device log. | medium |
| 27 | `workers/relay/src/index.js:145,160-166` | `/room/<x>-cam/key` answers 204 or 403 with no rate limit, and the buckets are a WeakMap that refills on wake. | Unlimited key guessing. How much that matters depends on how long `PI_CAM_KEY` is. | medium |
| 28 | `workers/ingest/worker.mjs:311` against `:328,340` | `/open` stores `addr: 'tier:trusted'`, but `/seg` and `/close` recompute the ip and UA hash. `#charge` then also checks the open tier's limits. | Every trusted-tier segment gets 403. Its only client was selfrec, which is retired, so delete it rather than fix it (see C). | high |
| 29 | `workers/station/worker.mjs:36-37`; `workers/ingest` sweep | A malformed `%` gives an uncaught 500. The `a:<addr>` records and `expiresAt: null` sessions are never deleted. | Low. | medium |

---

## B. What must not go public (do this before anything else)

`.gitignore:27` already ignores `.wrangler/`. These were committed before
that rule existed.

| file | what it holds | command |
| --- | --- | --- |
| `.wrangler/cache/wrangler-account.json` | Cloudflare account id and email | `git ls-files \| grep '\.wrangler/'` gives 5 |
| `proto/archive/.wrangler/cache/wrangler-account.json` | same | |
| `workers/{cues,moq-safari,rtc}/.wrangler/cache/wrangler-account.json` | same | |
| `rig/moq/mtx/moq-key.pem` (and `moq-cert.pem`) | an EC private key, self-signed `CN=moq-mtx-local`, expired 2026-09-05 | `git ls-files \| grep pem` |
| `rig/obs-cloud/obs/plugin/obs-moq.so` (47 MB), `rig/obs-cloud/quic-test/moq-clock-ietf` (8 MB) | compiled binaries | |
| `rig/relay/__pycache__/*.pyc`, `proto/m2m/__pycache__/*.pyc` | bytecode | |

`git rm --cached` removes them from the next commit only. They stay in
history. Whether history needs `git filter-repo` (as was done for the Circuit
pack) is the owner's decision, and **I could not settle it**: the key is
expired and self-signed, and the account id is not a secret on its own.

---

## C. Dead code

### C1. Kit modules nothing deployed imports

Each one was checked with `git grep -n "/<name>.mjs"` across everything, and
for `import()` with a variable. None was found.

| module | lines | only users | note |
| --- | --- | --- | --- |
| `demo/shell/worklet.mjs` | 183 | `worklet-test.mjs` (217) | A finished technique that nothing adopted. `plans/plan-fau.md:1161` and `plans/plan-live-slides.md:15` name it as the plan. **Keep it or archive it: the owner's call.** |
| `demo/shell/local-remote.mjs` | 497 | `local-remote-test.mjs` (167), plus a CSS block at `shell.css:7768-8059` (about 290 lines, most of it comment) | `BACKLOG.md:197` (2026-10-12) took it out of /kit/ and says "the component stays". `createLocalRemote` now has no caller anywhere. |
| `demo/shell/synthdef-audio.mjs` | 223 | `demo/patch/index.html:48` | `demo/patch/` is not deployed (below), so nothing that ships uses it. |
| `demo/shell/err-live.mjs` | n/a | `demo/archive/tv/index.html:49` (deployed), `archive/demos/*` | Alive, through the archive only. |
| `demo/shell/moog.mjs`, `source-args.mjs` | n/a | `rig/board/synth.mjs:18`, `rig/board/pappus.mjs:45` | Alive on the Pi. They are also deployed to `/shell/`, which costs nothing. |

### C2. A page folder that is not deployed

`demo/patch/`:
- 12 tracked files: `index.html` and `engine.mjs` (788 lines), plus
  `vendor/` (1.9 MB).
- It has no manifest row and is not in `CONCEPT_DIRS`. `build.mjs:210-212`
  says "nothing under `demo/patch/` is copied any more".
- `cmp` shows its `vendor/supersonic.js`, `scsynth-nrt.wasm`,
  `clockwork_audio_worklet.js` and `chunks/*` are **byte-identical** to
  `demo/shell/vendor/`.
- Last touched 2026-09-21.

Moving the folder to `archive/` frees `synthdef-audio.mjs` (223) and 1.9 MB
of duplicate binaries.

`demo/crate/` and `demo/talk/` are empty, untracked directories on disk. They
are harmless.

### C3. Exports nobody imports

- 282 exports in `demo/shell/*.mjs` are used nowhere outside their own
  module:
  - 143 are used by no other file at all;
  - 139 are used only by their own `-test.mjs`.
- Most are used inside their module, so the `export` keyword is just
  unneeded.
- **32 are referenced exactly once in their module, at the declaration**, so
  they are dead in full. They include:
  - `circuit-patch.mjs` `CATEGORY_DERIVED`, `macroLegs`
  - `circuit-session.mjs` `STEP_GRID_LEN`, `VELOCITY_PER_NOTE`
  - `circuit-syx.mjs` `STREAM_HEAD`, `PATCH_HEAD`
  - `hand.mjs` `moveAt`, `moveNamed`
  - `local-remote.mjs` `createLocalRemote`
  - `openers.mjs` `OPENER_KINDS`
  - `pattern.mjs` `CHECK_BITS`
  - `source.mjs` `buildSource`
  - `step-grid.mjs` `RULER_H`, `stepRulesBuilt`
  - `suggest.mjs` `classOfQuality`
  - `symbol.mjs` `createSymbolButton`
  - `synthdef.mjs` `RATE_NAME`, `OP_NAME`
  - `xr-panel.mjs` `passthroughSupported`
  - 13 more that only a test reads (`bay.mjs` `OP_SAYS`, `numloop.mjs`
    `quantiseTimes`, `xr-tablet.mjs` `btnLabelW`, and others)
- Modules with the most outside-unused exports: `circuit-sample` 28,
  `circuit-session` 23, `xr-room` 15, `synth-view` 13, `circuit-patch` 13.

### C4. Options nobody passes

1,049 destructured options on exported factories were checked, and 200 are
never passed by any non-test caller. Many of those are test seams (`now`,
`net`, `clock`), which are legitimate. The clear cases:
- `createPatchbay({ details })` (55 callers, never true). The details button
  and box at `patchbay.mjs:135-165` are an archived path, deliberately, per the
  comment at `:138` and BACKLOG.
- `createTransportBar({ settling })` (61 callers).
- `createBoard({ iceUrl, inSelfcheck })` (16).
- `createKitPage({ indexLabel, build })` (14).
- `createMp3Stream({ blockMs, floorMs, ceilingMs })` (7).
- `createDrop({ area, maxBytes })` (4).
- `createFullscreenExit({ glyph, aria })` (5).
- `createXRPanels({ dist, clear, deadManMs, surface })` (2).

The `createPico` hits are a parser false positive.

### C5. The 2026-10-13 retirements

The six deleted workers still hold **18,810 tracked lines**, including 2,096
lines of handler code:

| worker | lines |
| --- | --- |
| moq-safari | 16,339 (`public/play.js` alone is 15,808) |
| instrument | 1,105 |
| rtc | 800 |
| selfrec | 223 |
| osc | 175 |
| cues | 168 |

`workers/jam` (138) was retired 2026-09-04.

**Each still has a `wrangler.jsonc` with a custom-domain route.** A
`npx wrangler deploy` typed in the wrong folder brings a deleted worker back
onto `positron.studio`. That is the risk, more than the lines.

`workers/pub` behind the 410:
- About 25 dead lines in `worker.mjs`:
  - the bare `/whip` branch at `:574`;
  - `?tracks=` on `/start` at `:481-486`;
  - the `extra` argument at `:883-887`;
  - the main-role `/status` and `cam:` at `:414-417`.
- **About 330 of 772 lines** in `container/server.mjs`: the RTMPS
  test-pattern leg, the testsrc2, drawtext and burn filters, and the encode
  branch of `whipArgs`. The DO now calls only `/start-whip` with
  `film-copy`.
- `wrangler.jsonc` `PUB_SOURCE: "testsrc2"` and `PUB_BURN: "1"` no longer
  affect anything.
- `/watch`, `/status`, `/start` and `/stop` are still reached through
  `/stage/*`, so those handlers stay.

Retired pages and harnesses that are still in the deploy or the tree:
- `demo/llhls/` and `demo/webrtc/` (1,304 lines) are built rows, unlisted,
  that answer "retired" on press.
- `demo/verify-native.mjs` (155) and `demo/verify-safari.mjs` (221) refuse
  with exit 2.
- `BACKLOG.md:148` still holds an open item to re-point them at a page with
  a stream, so **they wait on that item**.

rig and src:
- Six files point at retired hosts and are already marked RETIRED.
- One is not marked: `rig/obs-pro/stream.mjs:23-24` hardcodes the deleted
  `positron-demo` and `whep-rig` UIDs.
- `src/timed-messages.js` (282) and `src/demo.html` (134) served only cues.
- `src/low-latency-player.v5.js` (335) is used only by
  `rig/resilience-v6.html`.

### C6. Dead in `workers/view` (the site's own worker)

- The ERR proxy (`/api/search`, `/api/item`, `/api/stats`, `serveCached`,
  and the `Gate` DO, lines 32-143, 273-325, 425-429 and 492-605): **about 300
  of 605 lines**. Its only callers are `archive/megatimeline` and
  `archive/remixer`, which are not deployed. Removing `Gate` needs a
  `deleted_classes` migration.
- `/icy/` (`:409-416`) is a stub. `/notes/` (`:444-451`) always 404s.
  `/report` is called only from archive pages.
- `workers/view/verify.mjs` (314) drives `/proto/megatimeline/` and
  `/api/stats`, which no longer exist. `verify-report.json` (272) and
  `shots/*.png` (1.4 MB) go with it.
- `build.mjs` `explode()`, `queryHash()` and `canon` (about 38 lines,
  `:810-820` and `:1284-1299`) are unused and kept on purpose (`:1305`).

### C7. Dead CSS (small)

- 12 dead classes and 22 wholly dead rules in `shell.css`: 39 rule lines, or
  102 with their comments. Largest:
  - `.pos-xr-offer` (`:1758-1771`)
  - the headset-recede section (`:4937-4957`) and `.pos-acts` (`:1716`)
  - `.tbar-live` (`:1600-1609`)
  - `.pos-bgroup-cols` (`:6401-6411`)
  - `.pos-bgroup-half` (`:6354-6358`)
  - `.pos-index` (`:475,553,554`, and `demo/index.html:111-112` overrides
    it)
  - `.kpad-l` (`:4663-4669`)
  - `.pos-hw` (`:1035`) and `.pos-fb-note` (`:3244`)
- `kit-page.css:422-424` `.kit-swatch*`.
- 13 classes look dead but are built dynamically (`pos-tk-${type}`,
  `panel-fixed-${side}`, `sld-end-${...}`). They are live.
- 7 custom properties are defined and never read: `--mi-magenta`,
  `--mi-orange`, `--mi-blue`, `--mi-maroon`, `--mi-maroon-lit`, `--pad-bar`,
  `--span-n`.
- 6 are read but never set, so their fallback always applies:
  `--roll-row-h`, `--k-dot`, `--k-pad`, `--sld-seam`, `--wrap`, `--pad`.

---

## D. Duplication

| # | what | where | removable | risk |
| --- | --- | --- | --- | --- |
| D1 | **byte-identical file** | `demo/collide/engine-node.mjs` and `demo/muta/engine-node.mjs`: `diff` is empty, 329 lines each. Its own header (`:18`) says "A COPY, AND IT SAYS SO" | 329 | low |
| D2 | the `cc-*` page furniture | 23 pages. For example `.cc-top > .pos-bgroup {flex:none;width:auto}` in 17 pages, `.cc-say` in 17, `.pos-vp-foot .cc-say` in 14, `.cc-pair` in 7. 39 inline rules repeat in 3 or more pages | 438 declarations | medium |
| D3 | the medium palette | the `--md-*` and `.md-*` block in 7 pages (`synth/keyboard`, `dots`, `recorder`, `timeline`, `room/words`, `kit/patchbay`, `archive/pico-router`), against `MEDIUM_COLOURS` in `patchbay.mjs:25` and a second build of the CSS in `hero.mjs:140-149`. The comments point at the dead `/concepts/misc/000/` | about 70 | low |
| D4 | MIDI inputs as bay device nodes | the same `plugged`, `slotFor`, `plug`, `unplug` and `devices` block in `synth/keyboard:103-180`, `code/plaits:204-262`, `code/piano:604-662`, `remote/circuit:483-562` | about 120 | medium |
| D5 | Chrome and CDP start-up | about 40 lines each in `shot.mjs:99`, `which-rule-won.mjs:95`, `ancestry.mjs:57` (those three identical apart from the profile prefix), `verify.mjs:268`, `verify-gl.mjs:135`, `verify-quest.mjs:262`, `verify-native.mjs:75`. One shared `launchChrome()` with exit and SIGINT kills also fixes A2 #18 | about 220 | low-medium |
| D6 | **the one diverging patchbay module** | `bay-svg.mjs:72-209`, born 2026-10-13 (`686ff2db`), says it is "that file's `render()` in its ACROSS arrangement, line for line". 47 lines are byte-identical with `bay-view.mjs:96-200,305-345`, and about 90 differ only by renames. Every desk-layout change now has to be made twice. `/kit/share/` checks agreement only at the hero's width | about 80 | medium |
| D7 | radio concept infrastructure | `radio/live` and `radio/tempo` share **337 identical non-comment lines** (station open, play, stop, beat canvas, tempo strip, fx chain). `radio/key` shares 147 with `live`. A `demo/radio/radio-rig.mjs` would follow `granulator/grain-rig.mjs` and `drums/drum-machine.mjs` | about 300 | medium (external streams: stand-ins only) |
| D8 | typist paper CSS | about 12 rules in `typist/machines`, `paper` and `typewriter` | about 80 | low |
| D9 | small helpers | 8 named `nodeOf` copies with nothing exported from `bay.mjs`; `hero.mjs:77` `bayOf` against `kit/patchbay:119` `fakeBay`; 4 private `el()` builders (`panel-layout:97`, `fader:85`, `keyboard:526`, `knob:248`); `fit()` and `tok()` canvas helpers in 3 places; 29 `new AudioContext` sites while `audio.mjs` `sharedAudio` has 2 users | 50 to 100 | low, except AudioContext (medium: it changes sound behaviour) |
| D10 | workers | 9 `json()` helpers, 16 inline `access-control-allow-origin: '*'`, 6 hand-written preflights, 3 constant-time compares, 4 short SHA-256 helpers. The relay-recorder DO is nearly line for line the same in `store` and `feedback` (about 70 lines) | about 150 | low |
| D11 | rig | `collector.py` and `collector2.py` (about 80 per cent the same); `resilience.html` is a subset of `resilience-v6.html` | about 165 | none |

Converging or diverging? **Converging, apart from D6.**
- `bay.mjs` is the hub, imported by about 70 pages.
- `patchbay.mjs` draws for about 55 pages.
- `bay-traffic` and `port-ink` serve only `patchbay`, `hero` and
  `kit/patchbay`.
- Medium colours live in one module, with the D3 pages as the leftovers.

**Not to merge:** `bay.mjs:208` and `route-core.mjs:119` both implement the
MIDI ops. They differ on purpose: route-core works on bytes with integer
thousandths for parity with `route_core.c`. Give them one shared set of test
vectors, not shared code.

Concept pages copying each other is deliberate per `positron-concepts`
("later pages copy an earlier one and add one thing"). D7 and D8 are listed
only because the copied part is infrastructure, not the lesson.

---

## E. Simplification

### E1. Comments are the mass

Measured with scratch `cmt.mjs`: comment lines against code lines.

| file | total | comment | code | comment/code |
| --- | --- | --- | --- | --- |
| `demo/shell/shell.css` | 8,081 | 5,702 | 2,096 | 2.72 |
| `demo/nola/index.html` | 5,169 | 2,969 | 1,986 | 1.49 |
| `demo/wish/index.html` | 5,008 | 3,162 | 1,677 | 1.89 |
| `demo/stage/index.html` | 4,480 | 2,693 | 1,643 | 1.64 |
| `demo/muta/index.html` | 3,315 | 2,168 | 1,025 | 2.12 |
| `demo/evo/index.html` | 2,729 | 1,679 | 920 | 1.82 |
| `demo/tapes/index.html` | 3,024 | 1,850 | 1,088 | 1.70 |
| `demo/shape/index.html` | 2,539 | 1,520 | 886 | 1.72 |
| `demo/shell/diagram.mjs` | 2,749 | 1,405 | 1,242 | 1.13 |
| `demo/shell/xr-room.mjs` | 2,200 | 1,212 | 927 | 1.31 |
| all `demo/shell/*.mjs` except tests (163 files) | | 39,543 | 32,934 | 1.20 |
| all in-scope files except archives and vendor | | 154,891 | 458,146 | 0.34 (the vendored bundles drag this down) |

**81 files over 300 lines have more comment than code**, 63,588 comment lines
between them.

The `shell.css` hardware panel section alone (`:6825-7767`) is 943 lines,
**744 of them comment and 166 code**.

Spot-checking 6 distinctive phrases from `shell.css` comments: 5 appear
nowhere else in the repo. So these comments are mostly the only copy of an
incident record, and CLAUDE.md's "move a rule verbatim, do not summarise" binds
them. The proposal is therefore a **move, not a delete**:
- the history goes to a `css-history.md` reference under `positron-compose`
  (or to `LESSONS.md`);
- one line stays behind, naming the rule and pointing at the anchor.

Done for `shell.css`, that takes the file from about 8,080 lines to about
2,600 with identical rules. It is verifiable byte for byte: blank the comments
before and after, then `cmp`.

### E2. Tracked generated files

| what | size | command |
| --- | --- | --- |
| `rig/moq/spike/www/*.js`: 15 esbuild bundles of `rig/moq/spike/src` | about 245,000 lines, 8.8 MB | `git ls-files rig/moq \| xargs wc -l` |
| `workers/moq-safari/public/play.js` (retired) | 15,808 | |
| `proto/jam/moq/www/moq-jam.js`, `moq-synth.js` | 14,860 + 21,942 | `moq-synth.js` is deployed (`build.mjs:131`), `moq-jam.js` is not |
| `proto/m2m/logs/` | 1,128 tracked files | `git ls-files proto/m2m \| sed 's\|/[^/]*$\|\|' \| sort \| uniq -c` |
| tracked `.log` files repo-wide | 797 | `git ls-files \| grep -E '\.log$' \| wc -l` |
| `workers/view/public/` | 664 tracked generated files | the build artefact. It is committed on purpose ("build, as deployed" commits) |

The repo pack is 110 MB. Untracking the bundles and logs does not shrink
history, but it stops them being diffed, grepped and counted. (They made up
most of the top 18 files in my own first count.)

### E3. `shell.css` structure

- **0 `@layer`, 0 `@container`.** 21 `@media` blocks over 7 distinct
  queries. `max-width: 560px` is scattered across 7 places (`:630`, `:1596`,
  `:2888`, `:3065`, `:3936`, `:7568`, `:8050`), and there are four phone and
  desk thresholds (560/561, 600, 620, 720), plus 599 in `demo/index.html`.
- `!important` appears 4 times on 2 lines. `:2737` is redundant with the
  global reduced-motion rule at `:1802`, and so are the `animation:none` and
  `transition:none` parts of 7 other reduced-motion blocks (`:791` entirely).
- `:root` is declared 7 times (`:50,502,1988,2601,3099,3630,3748`).
  - 48 selectors are duplicated in the same media context (63 extra
    declarations).
  - Some splits are far apart: `.pos-dg-*` at `:4802` and `:5365` (inside
    the symbol section), `.pos-pg-labs` at `:2751` and `:7014`,
    `.tbar-badge:empty` at `:1647` and `:5228`.
- **There is no spacing scale.** 251 literal px uses across 30 distinct
  values: 10 (43 uses), 8 (25), 14 (21), 12 (19), 6 (17), 5 (15), 3 (14),
  4 (14), 9 (12), 1 (11), 7 (9), 16 (8), 20 (7). About 100 more already use
  tokens (`--panel-gap`, `--kbd-pad`, `--panel-pad`, `--ctl-gap`,
  `--pad-btn`).
- Proposed scale: `--s-2 4 6 8 10 12 14 16 20 24 32 40`. It covers 165 of the
  251 uses (66 per cent). The odd values (3, 5, 7, 9: 50 uses) are often
  commented as derived ("the 5px is the knob's radius"), so they become
  `calc()` of their source rather than being snapped.
- Proposed layers: `@layer reset, base, layout, components, responsive;`
  - Page `<style>` blocks stay unlayered, so they win without extra
    weight.
  - The reduced-motion `!important` sits in `reset`, where a layered
    `!important` is strongest.
  - All media blocks go in `responsive`.
- Inline page CSS: **93 of 119 demo pages carry a `<style>` block**, 5,109
  lines (1,336 code, 3,446 comment). 188 inline rules restyle a kit class. The
  most restyled are `.pos-bgroup` (19 pages), `.pos-pick` (16), `.pos-vp-foot`
  (15), `.pos-vp-stage` (12) and `.pos-choice` (9). Several of those say the
  kit default is wrong for how the kit is used, which is D2.

### E4. Oversized modules

The largest kit modules (non-test):

| module | lines |
| --- | --- |
| `diagram.mjs` | 2,748 |
| `xr-room.mjs` | 2,199 |
| `xr-panel.mjs` | 2,141 |
| `keyboard.mjs` | 2,126 |
| `transport-bar.mjs` | 1,686 |
| `bay.mjs` | 1,637 |
| `scan-field.mjs` | 1,219 |
| `synth-view.mjs` | 1,218 |
| `circuit-sample.mjs` | 1,217 |
| `sclang-lite.mjs` | 1,151 |
| `shell.mjs` | 1,074 |

Every one of these drops to about half once its comments move (E1). After
that, none of them is large enough to split for size alone. I do not propose
splitting any module before the comment move, because the code line counts
(for example `diagram.mjs` 1,242 code, `bay.mjs` about 800) are reasonable
for what they do.

---

## F. Build and deploy risk

| # | risk | where | proposal |
| --- | --- | --- | --- |
| F1 | **`shellFiles()` ships every `.mjs`, `.js` and `.css` in `demo/shell/` from the WORKING TREE, untracked files included.** That means all 55 `*-test.mjs` files (20,300 lines) go public at `/shell/*-test.mjs`: `ls workers/view/public/shell/*-test.mjs \| wc -l` gives 55. So would any scratch file an agent leaves there. | `build.mjs:538-549` | Skip `-test.mjs`, and enumerate through `git ls-files demo/shell` so an untracked file cannot ship. `deploy.mjs` already warns about untracked files under `demo/`, but only warns. |
| F2 | The deploy interlock compares two fingerprints taken milliseconds apart. | `deploy.mjs`, `built` and `beforeUpload` | Fingerprint before spawning the build too, or take a lock file in `public/` for the duration of the build. |
| F3 | `npx wrangler deploy` with no `package.json` anywhere: `ls package.json workers/view/node_modules` finds neither. The wrangler version is whatever npx resolves that day. | `deploy.mjs` | Pin it: `npx wrangler@<version>`. |
| F4 | Seven `wrangler.jsonc` files for deleted workers still carry custom-domain routes. | `workers/{cues,instrument,moq-safari,osc,rtc,selfrec,jam}/wrangler.jsonc` | Delete those configs, or move the folders into `archive/`. |
| F5 | The archive is deployed whole by enumeration (`archiveFiles()`, `build.mjs:709-731`): `demo/archive/` is 22 files and 11,223 lines. That is intended. Top-level `archive/` (119 files, 36,660 lines of code) is not deployed, except `archive/typist.md` and `archive/concepts/*.md`. It costs nothing at deploy time. | | none |
| F6 | `checkImports()` reads only static `import`/`from` strings. A dynamic `import(\`/shell/${x}.mjs\`)` would ship a 404 without the build noticing. I found none today. | `build.mjs:566` | Note only. |
| F7 | The kit unit tests are not run by anything. There is no runner and no `package.json`. | | A 30-line `demo/shell/run-tests.mjs` (the scratch `runtests.mjs` is that) run before `deploy.mjs`. It takes about 8 s for all 53 offline tests. |

**Unit test results, 2026-10-14** (53 run, 2 skipped because they open
sockets):
- **`diagram-test.mjs`: 90 ok, 3 failed.** The asserts at `:707` and nearby
  expect the one-column arrow to end at the box and its corners in the
  machine's padding. `diagram.mjs` changed on 2026-10-05 (`2eaae3bc`,
  "returns run left and forward dives run right"). The test was last changed
  2026-09-22. So it is probably **a stale test after a deliberate design
  change**, but I could not confirm that without looking at the picture.
- **`step-grid-test.mjs`: 34 ok, 1 failed.** The test regex at `:212` wants
  `border-right: 0` in `.pos-pg-labs`, and the CSS now says
  `border-inline: 0` (`shell.css:7014`). This is a stale test, not a bug.
- **`circuit-patch-test`, `circuit-session-test` and `unzip-test` pass while
  testing nothing.** They print "New Pack.circuitpack is not here". The pack
  left this repository on 2026-09-24, so these three have been vacuous for
  three weeks. That is the "a green with no coverage is the worst control"
  lesson from CLAUDE.md. They need a pack path argument (for example
  `?pack=` style, as `/pack/` got) and an exit code that is not 0 when they
  read nothing.

---

## Proposals, ranked by value to effort

Lines are what leave the tree. "Verify" names the cheapest check that can
fail.

| rank | proposal | files | removes | risk | verify |
| --- | --- | --- | --- | --- | --- |
| 1 | Untrack the account caches, the key, the binaries and the `.pyc` files (B) | listed in B | 9 files, 55 MB of binaries from HEAD | none | `git ls-files \| grep -E '\.wrangler/\|\.pem$\|\.so$\|pycache'` prints nothing |
| 2 | `shellFiles()` skips `-test.mjs` and enumerates tracked files only (F1) | `workers/view/build.mjs` | 55 public files | low | `node workers/view/build.mjs --out <scratch>`, then `ls <scratch>/shell/*-test.mjs` finds nothing and the build passes `checkImports` |
| 3 | Fix `wire.close()` (A1 #2): store the timer, clear it in `close()`, check `closed` in `connect()` | `demo/shell/wire.mjs` | adds about 3 lines | low | `node demo/shell/wire-test.mjs` plus a new negative-control assert; `node demo/verify.mjs synth/keyboard` |
| 4 | Fix the teardown leaks: `board` interval, synth `ctx.close()`, `live.mjs` `pc.close()` and DELETE, `moq-audio` disconnect and cap, `keyboard` takes on destroy (A1 #3, 4, 7, 8, 11) | `board.mjs`, `openers.mjs`, `live.mjs`, `moq-audio.mjs`, `moq.mjs`, `keyboard.mjs` | adds about 25 lines | low-medium | the module tests that exist (`live-test`, `instrument-test`), then `node demo/verify.mjs <the two or three pages that use each>` and compare assert counts |
| 5 | A shared `launchChrome()` with exit, SIGINT and throw kills, used by all 7 harnesses (D5, A2 #18) | `demo/harness-profile.mjs` (grow it), `verify*.mjs`, `shot.mjs`, `which-rule-won.mjs`, `ancestry.mjs` | about 220 | low-medium | `node demo/shot.mjs kit/devices 375 1280`, then `pgrep -fl "Google Chrome.*--headless"` prints nothing; then throw on purpose inside a scratch copy and check again |
| 6 | Note-off as a status (A1 #1): carry `off: true` on the event (or test `cls === 'off'`), and make `velocity`, `vrange` and `fixed` respect it | `bay.mjs`, `wish/index.html:1388,1441` | adds about 10 | medium (MIDI on the desk) | `node demo/shell/bay-test.mjs` with a new `0x80 nn 64` vector; then a real keyboard on `/wish/` |
| 7 | `looper.setRate` re-anchors (`at`, `off`, `voiceRate`) and Space goes through the toggle's handler (A1 #5, #6) | `looper.mjs`, `transport-bar.mjs` | adds about 6 | low | `node demo/shell/looper-test.mjs` with a rate-change assert; `node demo/verify.mjs <one transport page>` |
| 8 | Workers: shout `opening` promise and reader guard (A3 #22); store writes `meta` on an alarm, not per frame (#23); auth on store `/clear*` and pub `/stage/*`, `/logs/clear` (#23, #26) | `workers/shout`, `workers/store`, `workers/pub` | adds about 40 | medium (deploys a worker) | no harness exists for these. `node workers/mail/test.mjs` is the only worker test. **Never verified against ERR.** For shout, use `demo/fake-station.mjs` as the origin |
| 9 | Delete the dead workers' trees and configs (C5, F4), keeping each `RETIRED.md` in `archive/workers/<name>/` | `workers/{cues,instrument,moq-safari,osc,rtc,selfrec,jam}` | 18,810 + 138 | low | `git grep -nE '(cues\|instrument\|osc\|rtc\|selfrec)\.positron\.studio' -- demo workers/view` prints nothing |
| 10 | Remove the dead pub container leg and vars (C5) | `workers/pub/container/server.mjs`, `worker.mjs`, `wrangler.jsonc` | about 355 | medium (container rebuild) | `DEMO_DEEP=1 node demo/verify.mjs stage` (uses its own input, not an external server) |
| 11 | Remove the view ERR proxy, the `Gate` DO (with a `deleted_classes` migration), `/icy/`, `/notes/`, `workers/view/verify.mjs`, the report and the shots (C6) | `workers/view/src/*`, `wrangler.jsonc` | about 650 + 1.4 MB | medium (a DO migration on the site worker) | `node workers/view/build.mjs --out <scratch>`; after the deploy, `curl -sI https://positron.studio/` and one page |
| 12 | Delete `engine-node.mjs` duplicate (D1) | `demo/muta/engine-node.mjs`, `demo/muta/index.html:330` | 329 | low | `node demo/check-html.mjs demo/muta/index.html`; `node demo/verify.mjs muta collide` |
| 13 | Move `demo/patch/` to `archive/`, and `synthdef-audio.mjs` with it (C2) | `demo/patch/`, `demo/shell/synthdef-audio.mjs` | 1,011 lines + 1.9 MB | none (not deployed) | `node workers/view/build.mjs --out <scratch>` passes |
| 14 | Fix or retire the 5 broken or vacuous unit tests, and add the runner (F7) | `diagram-test`, `step-grid-test`, `circuit-patch-test`, `circuit-session-test`, `unzip-test`, a new `demo/shell/run-tests.mjs` | adds about 30 | none | the runner exits 0, and exits 1 when one assert is broken on purpose |
| 15 | Untrack the spike bundles and logs (E2) and add them to `.gitignore` | `rig/moq/spike/www/*.js`, `proto/m2m/logs/`, the `*.log` files | about 245,000 lines + 1,128 log files from HEAD | none for the site; the spike needs `npm run build` in `rig/moq/spike` to regenerate | `git ls-files rig/moq/spike/www \| wc -l` gives 0, and `rig/moq/spike/package.json` still has its build script |
| 16 | Medium palette and `cc-*` furniture into the kit (D2, D3) | `shell.css`, `patchbay.mjs` (export `MEDIUM_CSS`), `hero.mjs`, about 25 pages | about 500 declarations | medium (many pages, CSS order) | `node demo/check-html.mjs` on each touched page; `node demo/which-rule-won.mjs video/webrtc '.cc-top > .pos-bgroup' flex-grow`; `node demo/verify.mjs video/webrtc radio/key remote/piano`; one `node demo/shot.mjs` at 375 and 1280 |
| 17 | Delete the dead CSS, unused custom properties and redundant reduced-motion rules (C7, E3) | `shell.css`, `kit-page.css`, `demo/index.html:111-112` (**the session is editing it now, so it waits**) | about 120 | very low | `git grep -n <class> -- demo src proto timeline` prints nothing for each |
| 18 | `bay-svg` and `bay-view` share one pure `layoutAcross()` (D6) | `bay-view.mjs`, `bay-svg.mjs` | about 80, and one copy of the desk layout | medium (share card and every concept picture) | `node demo/shell/bay-test.mjs`; `node demo/verify.mjs kit/share` (it asserts box-for-box agreement); a shot of `/` |
| 19 | `createMidiDevices()` kit module (D4) | new `demo/shell/midi-devices.mjs`, 4 concept pages | about 120 | medium | `check-html` on the 4 pages, one look, and a real keyboard |
| 20 | Unexport or delete the 32 fully dead exports (C3) | about 20 kit modules | about 60 | low | each module's `-test.mjs`; `node workers/view/build.mjs --out <scratch>` |
| 21 | **Move the comment history out of `shell.css`** (E1) into a reference file, verbatim | `shell.css`, a new reference file under `.claude/skills/positron-compose/` (**after the skill rewrite lands**) | about 5,400 lines out of `shell.css` | process risk, rendering none | the comment-blanked CSS is `cmp`-identical before and after |
| 22 | `@layer` and the spacing scale (E3) | `shell.css` | line-neutral | medium-high (every page override's win or loss changes) | `which-rule-won` on every property in the inline-override list, for `evo`, `nola`, `circuit`, `llhls`; shots at 375 and 1280 |
| 23 | Radio rig and typist paper as page-group modules (D7, D8) | `demo/radio/*`, `demo/typist/*` | about 380 | medium; radio only against the stand-ins | `node demo/verify.mjs radio/live radio/tempo radio/key` with `demo/fake-station.mjs` up, **never with `DEMO_BASE`** |
| 24 | Worker helpers into `workers/_lib/` (D10) | 9 workers | about 150 | medium (touches every worker's deploy) | per-worker `npx wrangler deploy --dry-run` |

---

## Phases, each one approvable on its own

**Phase 0: before the repo goes public (proposals 1, 2).**
- Half an hour of work.
- Nothing a visitor sees changes, except that 55 test files stop being
  served.
- Ships with the next deploy.
- The history question in B is a separate decision.

**Phase 1: bugs a visitor can hit (3, 4, 6, 7).**
- Kit only, about 50 lines added.
- Each change is verified on the two or three pages that use the module,
  never the full suite.
- Deploy once, at the end of the phase.

**Phase 2: harness hygiene (5, 14).**
- Shared Chrome launcher, test runner, the 5 bad tests.
- Ends with orphaned Chromes structurally impossible, and a red unit test
  visible before deploy.

**Phase 3: worker fixes (8).**
- Separate, because each is a worker deploy and the shout one touches the
  ERR path. It is verified only against `fake-station`.

**Phase 4: deletions with no visible effect (9, 10, 11, 12, 13, 15, 17,
20).**
- About 21,000 lines of source and 245,000 lines of bundle leave HEAD.
- 11 includes a Durable Object migration, so it can be split off if
  preferred.

**Phase 5: consolidation (16, 18, 19, 23, 24).**
- About 1,200 lines.
- Medium risk, one page group at a time.

**Phase 6: `shell.css` (21, then 22).**
- 21 first: it is a pure move and makes 22 readable.
- 22 last: it is the only proposal whose risk is high, because unlayered page
  rules start winning everywhere at once.

## What I could not settle

- **Whether the 3 `diagram-test` failures are stale tests or a regression.**
  The code changed deliberately after the test. Only a look at a one-column
  diagram with a machine around it tells which.
- **Whether `mail` putting full sender addresses into a public feed is
  intended.** It may be the design.
- **Whether the workers' `webSocketClose() {}` without `ws.close()` is fine**
  on `compatibility_date` 2026-08-01. It depends on runtime auto-reply
  behaviour that I could not check offline.
- **Whether git history needs rewriting** for the account caches and the
  key.
- **Whether `worklet.mjs` and `local-remote.mjs` are dead or waiting.** Both
  are named in plans as the intended way. Unused today is a fact; abandoned
  is not.
- **Nothing was run in a browser**, so every kit bug is read from code, with
  a concrete scenario but no reproduction. The CSS findings have no computed
  values behind them.
- **The 200 "options nobody passes" include test seams.** Only the
  `create*` cases listed in C4 were looked at by hand.
- **A full selfcheck-gating sweep of all 56 pages was not done.** The kit
  modules that check gate correctly. The 30-odd concept pages that never
  mention `selfcheck` contain no asserts.
- `board-collide-test` and `mp3-frames-test` were not run, because they open
  sockets to the relay and to shout.
