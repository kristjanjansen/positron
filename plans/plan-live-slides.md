# plan: live instruments on a slide

Asked 2026-10-06, verbatim: *"in bg figure out to build working exmaples of
stynths etc on a slide. does it need a separate page or can somehow lazyload its
stuff. when on a page, can it use stuff from the page (a la fau loadaer /
compiler)"*

Status: PLAN ONLY. Nothing in `demo/` was edited. Every number below is marked
MEASURED (with the command, all run 2026-10-06 on this laptop) or READ (with the
file and line it came from). Prior work read first, per the memory rule *"read
plans before planning"*: `plans/plan-slides.md` (sections 5, 11, 13 and the
2026-10-05 entries), `plans/plan-fau.md` (sections 1.4, 2.1, 2.2, 4.1, 6.2),
`plans/plan-kit-split.md` (sections 2 and 4), `LAYOUT.md` rule 6 and the
`checkCompiledDefs()` paragraph, `demo/shell/slide.mjs`, `demo/shell/decks.mjs`,
`demo/shell/worklet.mjs`, `demo/shell/scsynth.mjs`, and the engine sections of
`/fau/`, `/collide/`, `/muta/`, `/nola/`, `/csound/` and `/tom/`.

---

## 1. The verdict

**No separate page. A synth slide lazy loads, and the cheapest working Faust
synth on a slide costs 38 KB on the wire, not 1 MB, because it does not need
the compiler at all.**

1. **A slot can load its engine on the press and on nothing else.** Everything
   an instrument needs is either a module (`import()` on the press), a worklet
   (`addModule` on the press) or a binary (`fetch` on the press), and the slide
   engine already gives a slot a place to keep it. What the engine does NOT give
   is a gesture verb: `createSlidePlayer` builds every slide's slot up front and
   calls `start()` on slide 0 at construction (READ, `slide.mjs`, `specs.map(...
   createSlide ...)` and `go(0)` before `return`), so **`start()` can never be
   the thing that loads or sounds**. The press inside the slot is.
2. **Faust ahead of time is the find.** A Faust program compiled at build time
   by the same vendored libfaust, in node, and shipped as its compiled factory,
   plays in the browser through `faustwasm.mjs` alone. MEASURED in headless
   Chrome: the Organ preset compiled ahead of time and the Organ compiled live
   by libfaust in the tab produce **the same RMS to every printed digit,
   0.029763811585458978**, and the ahead of time path moved **37,976 B on the
   wire** (faustwasm.mjs 34,161 plus the instrument 3,815) against
   **1,004,577 B** for the live compiler. That is a 26x difference, and it is
   what makes a synth affordable on the front page.
3. **Borrowing the host page's engine works because ES modules are already
   singletons, and does not work today because `/fau/`'s engine is not a
   module.** `bootCompiler()`, `audio()` and `attach()` are page-local
   functions inside `demo/fau/index.html` (READ, lines 748 to 1060). Move them
   into `demo/shell/faust.mjs` with memoised loaders and every slide on
   `/fau/` gets the page's compiler for free, with no registry. The one thing
   that is not a module, the AudioContext, gets one small shared module of its
   own.
4. **First example: the Organ, ahead of time, replacing the picture in `/kit/`
   SLIDES' FAU ON A SLIDE block, then the same slot in a front page deck.**
   Order and risks in section 7.

---

## 2. Which instruments can run on a slide, and what each costs

Bytes are the vendored files on disk (`wc -c`) and brotli at quality 11 from
node's zlib, which is what my probe server sent; the edge's own compression
level was not measured and may differ. Boot and compile times say where they
were measured. "Visit today" is what the instrument's own page does before any
press.

| instrument | engine | what a press must fetch, raw / brotli | boot | compile | worklet | visit today | on a slide? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Faust, ahead of time** (proposed) | `faustwasm.mjs` runtime plus a compiled factory | 216,533 / 34,161 runtime; Organ 13,332 / 3,815 (voice 5,578 wasm, effect 2,328, mixer 502, two JSON 4,924) | 4.5 to 6.5 ms `createNode` | none in the tab | yes, a blob processor from `faustwasm` | n/a | **YES, recommended first** |
| **Faust, live** (`/fau/`) | libfaust 2.89.2 in the tab | 6,379,006 / 1,004,577 (wasm 520,372, data 411,578, glue 38,466, runtime 34,161) | 60 to 75 ms headless on loopback, 54 ms node (plan-fau 2.1) | Organ 63 ms headless, 13 to 15 ms warm in node (plan-fau 2.2); STK piano 1,690 ms, blocking | yes | fetches all four files and compiles the Organ on a visit (READ, fau 69 to 88) | only where the compiler is already loaded, i.e. on `/fau/` itself (section 4) |
| **SuperCollider** (`/collide/`) | SuperSonic wasm scsynth plus `sclang-lite.mjs` | 1,701,983 / 348,054 wasm, 125,542 / 33,542 js, 30,263 / 7,709 worklet, plus sclang-lite 52,375 / 14,508 | **621 to 752 ms** (READ, research/scsynth-wasm-official-2026-09.md:141, research/supercollider-browser-2026-09.md:731) | under 1 ms, no fetch (READ, collide header) | yes | compiles on visit, engine on first touch (READ, collide 43 to 51) | possible, second; 0.4 MB and most of a second of boot behind a press |
| **Plaits** (`/muta/`) | Mutable firmware compiled to wasm, own worklet | 200,710 / 114,920 wasm, 22,519 / 7,545 worklet | fetch measured by the page, not here | none | yes, `addModule('/muta/muta-worklet.js')` | fetches the wasm on visit (READ, muta 1200 to 1243) | possible; **demands a 48 kHz context** (READ, muta 1259 to 1262), which constrains a shared context |
| **Csound score** (`/csound/`) | `timeline/csound.mjs` score compiler plus browser oscillators | the score modules only, 69,378 raw for the page's two | none | arithmetic | no | nothing (READ, score.mjs 114, 272) | yes, cheap; but it is a click and a score, not an instrument to play |
| **Piano and Rhodes samples** (`/nola/`) | a sampler over `/nola/*.mp3` and `rhodes-*.m4a`, 4,207,125 B in the directory | two to four files, about 60 KB, per region of the keyboard (READ, nola 501) | decode per file | none | no | nothing (READ, nola 406 to 421, assert at 2726) | yes, and it already loads per note; the lazy pattern exists |
| **Synthesised Rhodes** (`demo/shell/rhodes.mjs`) | per-sample JavaScript on the main thread | 2,684 / 1,158 | none | none | no (worklet planned, not built) | n/a | yes but **36.4 ms per voice render at note 21** (READ, worklet.mjs 13) is a stall on a projector |
| **Browser oscillators from a synthdef** (`synthdef-audio.mjs`) | WebAudio nodes built from a `.scsyndef` | 18,960 / 6,031 for `synthdef.mjs`, plus the def | none | none | no | n/a | yes, near free; refuses any UGen it does not know (READ, header) |
| `/tom/` | samples out of a pack the visitor drops | the visitor's own pack | | | no | nothing; `?pack=<url>` only (READ, tom 204 to 213) | **no**: there is no default sound, and the owner's sessions are private |
| `/twelve/`, `/evo/`, `/circuit/`, `/dump/` | real hardware over WebMIDI | nothing | | | no | | **no**: needs the MIDI permission prompt and the instrument on this desk |
| `/shape/`, `/knobs/`, `/away/`, `/grains/` | the Raspberry Pi over the relay | a relay socket | | | | | **no**: every press would take a seat in a room shared with a machine in another building |

**CPU, idle and playing: NOT MEASURED HERE.** What is known: plan-fau 6.2
measured the 21,916 B STK piano rendering at **114x to 160x realtime** offline,
so the 218 B Organ is cheaper by a wide margin. What is mechanism and READ, not
measured: a running AudioContext pulls every worklet every 128 frames (2.67 ms
at 48 kHz) whether or not a key is down, and a Faust poly node runs its mixer
and effect every quantum; `ctx.suspend()` stops the pull entirely. The way to
put a number on it is one run of `top -pid <Chrome audio utility process>`
with the Organ armed and silent, armed and holding a chord, and suspended. It
belongs in step 6's measurements, not in a guess here.

**Key to sound: NOT a latency claim.** The probe read 54 to 65 ms from `keyOn`
to the first analyser window above 0.001, both paths alike. That number is
mostly the probe: a 2048 sample analyser window is 43 ms at 48 kHz and the poll
was every 10 ms. It says the node sounds; it says nothing about latency.

---

## 3. Separate page or lazy load, and the contract a live slot needs

### 3.1 What the slide engine does today (READ, `demo/shell/slide.mjs`)

- `createSlide(spec, { slots })` runs the slot builder **when the slide is
  created**, and `createSlidePlayer(specs)` creates **every slide of the deck at
  construction**, hidden. So a slot builder runs on a visit for every slide in
  every deck on the page, seen or not.
- The player calls `go(0)` before returning, which calls `slides[0].start()`,
  which calls `ctl.start()`. **So `start()` runs on a visit, with no gesture,
  for the first slide of every player**, and on every step after.
- `go()` calls `stop()` on the slide it leaves. There is no `dispose`, and the
  player has no teardown of its own.
- The phone full screen tap zone steps a slide on a tap in the left or right
  third unless the target is inside `button, a, input, select, textarea,
  [role="slider"], [contenteditable]`. **A keyboard key is a `div.k`** (READ,
  `keyboard.mjs:599`), so on a phone in full screen a tap on a key in the outer
  thirds would play the note AND turn the page. Not measured, read; it has to
  be fixed before a playable keyboard goes on a slide (section 7, risk 3).

### 3.2 So the verdict on "separate page": no

A separate page buys nothing a press cannot: the only thing a page has that a
slot lacks is a gesture, and the slot's own Play button or first key IS a
gesture. What the page model does give, and a slide must copy, is the
discipline every sound page here already has: **a visit fetches nothing heavy,
builds no AudioContext and asks about no MIDI; the first touch does all three**
(READ, the same rule on `/fau/`, `/collide/`, `/muta/` and `/nola/`).

### 3.3 The contract, proposed

A slot builder returns a `ctl`. Today it may have `start` and `stop`. A live
slot needs four verbs and one rule.

| verb | who calls it | what it may do |
| --- | --- | --- |
| `build(host)` (the slot function itself) | `createSlide`, on a visit | draw the instrument: keys, knobs, a Play button, the plate. **No `import()`, no `fetch`, no AudioContext, no MIDI.** |
| `arm()` (new, internal to the slot) | the slot's own press: its Play button, its first key | `import()` the engine module, `fetch` the binaries, ask the shared context for itself, `createNode`, connect. Idempotent and self-healing (a failed fetch clears the promise, which is `/muta/`'s `warmUp` shape). |
| `start()` | the player, on show, **including on a visit** | re-enable the slot's keys. If, and only if, it was armed and sounding when it was left, it may resume. **It never arms.** |
| `stop()` | the player, on leave | `allNotesOff`, disconnect from the output, release the context (below). Nothing else: the factory and the node stay, so coming back is instant. |
| `dispose()` (new, optional) | a player teardown that does not exist yet, and `pagehide` | `node.destroy()`, drop the factory. Only worth adding when a deck can be unmounted (a deck inside a tab, a rebuilt front page row). |

**The rule: `start()` is a step, and a step must open nothing.** That is the
standing rule for `/reel/`, applied to the player. A slot that loads on
`start()` would load on every front page visit, because slide 0 is started at
construction.

### 3.4 One AudioContext per page, owned by whoever pressed last

Thirteen files construct their own AudioContext today (MEASURED, `grep -c` for
the three spellings across `demo/*/index.html` and `demo/shell/*.mjs`), and no
shared module exists (MEASURED, grep for a shared accessor found none). A page
with two players, or a deck on `/fau/`, should not make a second sound device.

Proposed `demo/shell/audio.mjs`, about 60 lines:

- `sharedAudio({ sampleRate = 48000 } = {})` creates the context on first call,
  synchronously, so it must be called inside a gesture; later calls return it
  and fire `resume()` unawaited (`positron-verify`: never let sound gate the
  work). **48000 because Plaits requires it** and nothing else here minds
  (READ: Faust takes the context's rate, scsynth takes the context it is
  handed, `/nola/` decodes into whatever rate it gets). A caller asking for a
  rate the existing context does not have gets the context and a `false` it
  must report, the way `/muta/` reports a 44100 today.
- `claim(owner)` makes `owner` the one sounding slot on the page and calls the
  previous owner's `stop()`. **One sounding slide per page**, because two
  keyboards fighting for one pair of speakers is not a demo, and because it
  makes "who stopped this" a one-line answer.
- `release(owner)` and, when nobody holds it, `ctx.suspend()`, which is what
  takes the audio thread to zero between demos. **Suspend, never close**: a
  closed context needs a new gesture to replace, and the next press is the
  gesture anyway, but a suspended one costs nothing and keeps every registered
  worklet.
- `document.visibilitychange` to hidden calls the owner's `stop()`. A front page
  left in a background tab must not hold a sound device.

### 3.5 Two players, full screen, the keys

- **Two players on one page**: one context, one owner. `faustwasm` registers a
  worklet processor once per context per factory hash
  (`gWorkletProcessors`, a WeakMap keyed by context, READ, `faustwasm.mjs`
  6400 to 6455), so two Organ slides on one page register one processor. On two
  contexts they would register twice.
- **Full screen** changes nothing about audio. `fullscreen.mjs` moves the frame,
  not the graph. The iPhone fallback is a fixed cover over the same element.
- **Keys**: the player owns arrows, Space, PageUp and PageDown, Home, End, `f`
  and Escape on its panel. A slide keyboard is built with `letters: false`
  (the kit's FAU ON A SLIDE already does, READ kit 2480 to 2540), so the
  computer keyboard never plays it; the pointer does.
- **MIDI never on a slide.** `createMidi` asks for permission the moment it is
  built (READ, fau 194 to 199). A deck on the front page asking a visitor about
  a MIDI keyboard is the prompt this project already moved off `/fau/`'s visit.

---

## 4. Borrowing what the host page already loaded

The owner's example is `/fau/`: it compiles on a visit, so libfaust is already
in the tab when a reader reaches a slide on that page. The question is whether
the slide can use that instance instead of a second copy.

### 4.1 What is shared for free, and what is not

- **A module is a singleton per page.** Two `import('/fau/vendor/faustwasm.mjs')`
  calls from two modules return the same module record, so the runtime, its
  static factory cache (`FaustCompiler.gFactories`, keyed by a hash of name,
  code, args and poly) and its per-context processor registry are shared with
  no work (READ, `faustwasm.mjs` 1709 to 1745 and 6400 to 6455).
- **libfaust itself is NOT shared.** `instantiateFaustModuleFromFile` builds a
  fresh Emscripten instance on every call, by importing the glue through a new
  blob URL (READ, `faustwasm.mjs` 10 to 30). Call it twice and the tab holds two
  compilers and fetched the 1 MB twice unless the HTTP cache answered.
- **`/fau/`'s compiler is a page-local closure.** `let faust = null` and
  `bootCompiler()` live inside the page's module script (READ, fau 785 to 830),
  next to the `console.error` shim that keeps Emscripten's abort off the
  console. Nothing outside that script can reach it.
- **`/collide/` imports a shared module but boots a fresh engine per call.**
  `bootScsynth()` in `demo/shell/scsynth.mjs` takes an `audioContext` and is not
  memoised (READ, scsynth.mjs 34 to 60). `/muta/`'s `warmUp` is memoised but
  page-local.

### 4.2 Proposed shape: memoised loaders in shell modules, no registry

**Recommended.** A registry (`provide('faust', ...)`, `want('faust')`) is the
answer when the thing to share is page state. Here it is a loaded engine, and
the module map already is the registry. So:

`demo/shell/faust.mjs` exports, each memoised at module level:

| export | does | cost the first time |
| --- | --- | --- |
| `faustRuntime()` | `import('/fau/vendor/faustwasm.mjs')` | 34 KB |
| `faustCompiler()` | the runtime plus libfaust, with `/fau/`'s `console.error` shim moved in verbatim | 1 MB |
| `hasCompiler()` | true once `faustCompiler()` has settled, without starting it | nothing |
| `faustFactory(url)` | fetch one ahead of time artefact set (section 5) and rebuild `{ voiceFactory, effectFactory, mixerModule }` with `WebAssembly.compile` | 3.8 KB for the Organ |
| `faustCompile(name, code)` | compile live through `faustCompiler()` | 63 ms headless for the Organ |
| `faustNode(ctx, parts, voices)` | `new FaustPolyDspGenerator().createNode(ctx, voices, name, voice, mixer, effect)` | 4.5 to 6.5 ms |

A slide slot then reads: **compiler already in the tab? compile the source live
(and show that it did); otherwise fetch the ahead of time factory.** On `/fau/`
that means a slide plays whatever the page compiled with no second copy of
anything; on the front page it means 38 KB.

`demo/shell/audio.mjs` (section 3.4) is the one piece that is not a module
loader, and it is the only shared mutable thing proposed.

**What `/fau/` has to change for this to be true**: replace `bootCompiler()`
with `faustCompiler()`, `audio()` with `sharedAudio()` plus its own master gain
and meter on top, and build its node through `faustNode()`. Its asserts that
count `/fau/vendor/` resources stay valid because the same files load once.
This is a refactor of the page with the most comments in the repository and
the most visitor-facing claims about bytes, so it is its own step with its own
verify run, not part of the first slide.

**Alternative, refused as the main answer, kept as an escape hatch**: a page
passing its own builders through `createSlide(spec, { slots })`. It already
works with no new code, and it is the right tool for a page-only demo (a slide
that plays the page's current text box). It is the wrong tool for sharing an
engine, because `mountDecks()` on the front page has no page to ask, and two
pages would grow two builders for one instrument.

**`/collide/` and `/muta/` follow the same pattern later**: `scsynth.mjs` gains
a memoised `scsynth(ctx)` beside `bootScsynth`, and `/muta/`'s `warmUp` and
`open` move to `demo/shell/plaits.mjs`. Neither is needed for the first
example.

---

## 5. Faust ahead of time: what ships and how it stays honest

MEASURED, `node aot.mjs` in the scratchpad: the vendored libfaust compiles the
Organ preset (read out of `demo/fau/index.html`'s `PRESETS`) in node and writes:

| file | bytes | brotli |
| --- | --- | --- |
| voice wasm | 5,578 | 1,830 |
| effect wasm | 2,328 | 866 |
| mixer32 wasm | 502 | 271 |
| JSON (voice and effect `json`, both `shaKey`s) | 4,924 | 848 |
| **instrument total** | **13,332** | **3,815** |

`createNode` takes the factories as arguments and reads only `json`, `module`,
`shaKey` and `soundfiles` from them, plus the mixer module (READ,
`faustwasm.mjs` 6360 to 6470). A factory rebuilt in the browser as `{ shaKey,
code, module: await WebAssembly.compile(bytes), json, poly, soundfiles: {} }`
is accepted, and MEASURED it sounds identically to the live compile.

Three things the build has to own, all precedents already in this repository:

1. **The `.wasm` files are listed by name in `workers/view/build.mjs`**, because
   `demoFiles()` takes no `.wasm` (READ, `LAYOUT.md` rule 6; build.mjs 236,
   333, 408, 452 list the existing ones). Proposed home:
   `demo/resources/faust/organ.voice.wasm` and siblings, beside
   `demo/resources/pico/oled-ui.wasm`, which is the same kind of thing (a
   compiled artefact a slide loads on demand).
2. **A stale artefact must refuse the build.** It is `checkCompiledDefs()`'s
   failure mode exactly: edit the Organ on `/fau/` and the slide plays the old
   one, nothing 404s, and every number still agrees. So a `PROVENANCE.json`
   beside the artefacts records the md5 of the source text, the compiler
   version (`2.89.2`) and the flags (`-ftz 2`), and the build refuses on any
   disagreement with the recompile command in the message.
3. **One source for the preset.** Today the Organ text lives inline in
   `demo/fau/index.html`. The script that compiles it should read it from
   `demo/fau/presets.mjs` (`/collide/` already has one) so the page and the
   artefact cannot hold two copies. Until that move happens the script can read
   the page, which is what my probe did, but that is a regex over HTML and is a
   stopgap.

The script: `node demo/resources/build-faust-aot.mjs [--check]`, the shape of
`build-mimproject-images.mjs --check`. It runs where the compiler runs in node
already (`demo/shell/code-lang-test.mjs` boots it the same way, READ 222 to
235).

---

## 6. The front page

### 6.1 What it costs now (MEASURED)

Headless Chrome on `demo/index.html` through my static server, 3 s after load:
**18 resources, 301,089 B encoded, 1,009,736 B decoded.** The deck machinery is
already in that: `slide.mjs` 12,373, `diagram.mjs` 42,113 (imported
statically by `slide.mjs`), `video-panel.mjs` 11,721, `slide.css` 7,889,
`fullscreen.mjs` 4,182, `decks.mjs` 3,109, `symbol.mjs` 2,698, `stepper.mjs`
1,760, together **85,845 B encoded**. One player is mounted. No AudioContext.

### 6.2 What a synth deck adds, and when

| moment | adds | how it stays at that |
| --- | --- | --- |
| a visit | the slot's own drawing code, a keyboard and a plate: `keyboard.mjs` and `instrument-panel.mjs` if they are not already loaded, plus a few hundred bytes of slot | the slot module imports no engine statically; the engine is behind `import()` inside `arm()` |
| a step onto the synth slide | nothing | `start()` never arms (3.3) |
| the first press | **37,976 B** and one AudioContext | `faustRuntime()` plus `faustFactory()` |
| every press after | nothing | memoised |
| leaving the slide, or the tab | the audio thread suspended | `stop()` plus `release()` |

**What the index can afford, as a rule**: on a visit, only what draws. On a
press, tens of kilobytes from this origin. **Never** the 1 MB libfaust path,
never a relay socket, never MIDI, never anything off another server. At 38 KB
the Faust Organ fits; SuperCollider at about 0.4 MB and 0.6 to 0.75 s of boot
fits only behind a press that says what it is about to do, and is not
recommended for the index.

⚠️ **The static import graph is the trap.** `decks.mjs` today imports only
`slide.mjs`. A synth slot written as `import { faustNode } from
'./faust.mjs'` at the top of `decks.mjs` costs every visitor the shell module
(small) and, if `faust.mjs` itself ever imports the runtime statically, 216 KB
decoded on every visit. `faust.mjs` must reach the runtime only through
`import()`, and an assert must say so (section 7).

---

## 7. Harness: how a live slide is graded without running anything for a visitor

Where: in whichever page owns SLIDES. Today that is `/kit/`; `plans/plan-kit-split.md`
proposes `/kit/slides`. Everything below lives behind `SELFCHECK` like every
other kit slide check, and nothing in it runs for a visitor.

Asserts, each one reading the far side of a boundary rather than a counter the
slot keeps:

1. **A visit loaded no engine.** `performance.getEntriesByType('resource')`
   holds nothing under `/fau/vendor/` or `/resources/faust/` before the press,
   which is `/fau/`'s own method (READ, fau 718 to 740). Negative control: a
   sabotage that imports `faustwasm.mjs` statically from the slot module turns
   it red.
2. **A step opened nothing.** Step through the whole deck with the player's
   `go()`; the resource list is unchanged and no AudioContext exists
   (`audio.mjs` exposes `contexts()` for the check, a count kept by the module
   that constructs them, which is the far side for this purpose).
3. **The press sounds.** Drive the slot's real gesture (a pointer press on a
   key through CDP is what `verify.mjs` already does for `data-gesture`), read
   an analyser on the shared context, require RMS above a floor. This is the
   memory rule *gate feedback on outcome*: a lit key is not evidence.
4. **The slide made the sound the page would.** Render the Organ through the
   ahead of time factory and, on `/fau/`, through the live compile, and compare
   RMS. MEASURED today: identical to every printed digit. On `/kit/` there is
   no compiler, so the kit asserts against a constant recorded in
   `PROVENANCE.json` at build time, which is a second source and not a
   paraphrase of the first.
5. **Leaving stops it.** `go()` away; the owner is released, `ctx.state` reads
   `suspended`, and the analyser falls under the floor within one release time.
   Negative control: a `stop()` that forgets `release()` turns it red.
6. **One owner.** Arm two synth slides in two players; the first one's
   `stop()` ran when the second claimed. Negative control: `claim()` that does
   not stop the previous owner.
7. **The tap zone leaves a key alone.** With `touchMode(() => true)` and the
   player in full screen, a click on a key in the outer third plays the note
   and does not step. Red today by reading (3.1), and it is the assert that
   proves the fix.

Assert count: seven new page asserts on the SLIDES page, 4 of them with a
sabotage named. After adding them, diff the per-page count, because the
SLIDES part already has 58 asserts plus a 5 assert bar drill (READ,
plan-kit-split.md section 2.1 table).

**Offline rendering** would make 3 to 5 independent of the audio device, and it
did not work in my probe: an `OfflineAudioContext` with the Faust node and a
`keyOn` before `startRendering` rendered **RMS 0** (MEASURED, first probe run).
The likely cause is that `keyOn` travels over the node's port and the offline
render finished before it was delivered; that is INFERRED, not confirmed. The
realtime context with `--autoplay-policy=no-user-gesture-required`, which the
harness already launches with, gave a clean reading, so the checks above use
it.

---

## 8. The first example, the order of work, and the risks

**The Organ, ahead of time, on `/kit/` SLIDES, replacing the picture in FAU ON
A SLIDE.** That block already draws the code box, two knobs, 25 keys and the
plate at slide scale, and says in its own comment that it is *"a picture of
the instrument, not the instrument"* (READ, kit 2485). Making it play is the
smallest change that answers the owner, and the front page reuses the same
slot afterwards.

Order, with what each step is graded by:

1. **`demo/shell/audio.mjs`**: `sharedAudio`, `claim`, `release`, `contexts`,
   the visibility stop. A pure-module test for the owner arithmetic
   (`audio-test.mjs`, with negative controls), no browser.
2. **`demo/resources/build-faust-aot.mjs`** plus `PROVENANCE.json` and the three
   artefacts, and `build.mjs`'s by-name lines and stale refusal. Graded by
   breaking it: edit one character of the preset, the build must refuse.
3. **`demo/shell/faust.mjs`**: the six exports, memoised, the runtime only
   through `import()`.
4. **`demo/shell/slide-synth.mjs`** with `liveFaust({ preset })`, the slot
   builder: draws on build, arms on press, the four verbs. Shared and not in the
   kit page, because `plans/plan-slides.md` section 13 already says slot
   builders should leave the kit for a shared module, and because the front
   page needs the same one.
5. **`slide.mjs`**: the tap zone exempts a slot's own controls
   (`[data-own-taps]` on the slot, or `.k` added to the list). One line plus
   assert 7. ⚠️ `slide.mjs` is being edited by the owner and the main session
   right now; this step waits for them.
6. **`/kit/` SLIDES**: FAU ON A SLIDE becomes live, asserts 1 to 7, one
   targeted `node demo/verify.mjs kit` and the per-page count diffed. CPU idle
   and playing measured here with `top`, which closes the hole in section 2.
7. **The front page**: a deck in `DECKS` with the Organ slide, a caption that
   links `https://positron.studio/fau/`. Measure the index's resource list
   before and after a visit (must be unchanged) and after a press (must be
   +37,976 B or close to it on the edge's own compression).
8. **`/fau/` borrows**: the page moves onto `faust.mjs` and `audio.mjs`, so a
   deck there plays the page's compile. Its own verify run, its assert count
   diffed.
9. Later and optional: `scsynth.mjs` memoised for a SuperCollider slide;
   `plaits.mjs` for a Plaits slide.

Risks:

1. **iPhone is unmeasured for every claim here.** `faustwasm` passes a
   `WebAssembly.Module` inside `processorOptions`; `/muta/` measured that
   posting a Module over a worklet's PORT arrives nowhere in headless Chrome 141
   (READ, muta 1281 to 1288). `processorOptions` is a different road and
   `/fau/` uses it in production, but whether anyone has played `/fau/` on an
   iPhone is not recorded in what I read. One `node demo/verify-native.mjs`
   cannot answer it either; it needs a phone.
2. **Two kit editors at once.** `demo/kit/index.html`, `slide.mjs`,
   `slide.css` and `decks.mjs` are being edited now, and `plan-kit-split.md`
   may move SLIDES to its own page. Steps 1 to 4 touch none of those files and
   can land first; 5 to 7 wait.
3. **The tap zone defect is live the moment any playable key reaches a phone
   in full screen** (3.1). It is a read, not a measurement, so step 5 starts by
   measuring it red.
4. **A stale artefact plays silently wrong.** Covered by the provenance
   refusal, which is the only reason ahead of time is safe here.
5. **The edge's brotli is not my brotli.** Every encoded byte count above is
   node's zlib at quality 11 through a local server. The deployed numbers can be
   larger; `/fau/` logs both sizes on a visit and the slide should too.
6. **The `start()` on construction.** Any future slot author who loads in
   `start()` costs every front page visitor the load. The rule goes in
   `slide.mjs`'s header beside the slot contract, and assert 2 is what catches
   it.

---

## 9. What was refused, and why

- **A separate page per live slide.** It buys a gesture, and the slot already
  has one. It also contradicts *"use 2col slidedeck here. no separate page"*
  (READ, decks.mjs header).
- **libfaust on the front page, even behind a press.** 1,004,577 B on the wire
  for a feature the ahead of time path delivers in 37,976 B with an identical
  sound. It stays where it earns its weight, on `/fau/`, where the visitor is
  typing Faust.
- **Loading or sounding in `start()`.** It runs on a visit for every first
  slide (3.1).
- **MIDI, relay sockets and real hardware on a slide.** A permission prompt, a
  seat in a room shared with the Raspberry Pi, or an instrument on this desk;
  none is a thing a visitor to a deck has asked for.
- **`/tom/` on a slide.** No default sound exists, and the only packs on this
  machine are the owner's sessions, which are private.
- **A registry (`provide`/`want`).** The module map already shares loaded
  engines; a registry would be a second, mutable copy of that fact. It stays
  available as the escape hatch through `createSlide`'s `slots` option.
- **Closing the AudioContext on stop.** Suspend costs nothing and keeps the
  registered processors; close forces a rebuild on the next press.
- **Running the full suite or `/kit/` verify for this plan.** Not needed: every
  claim either came from a headless probe of my own in the scratchpad or from
  reading code. Zero `verify.mjs` runs were spent.

---

## 10. What could not be settled

1. **CPU idle and playing**, for any engine. Method in section 2; it is step 6.
2. **iPhone and Safari**, for the ahead of time path and for a slide synth at
   all (risk 1).
3. **Why the offline render was silent.** Inferred to be port delivery timing;
   not confirmed. It only matters if the checks want offline rendering, and the
   realtime path works.
4. **The deployed byte counts** for the artefacts and for `faustwasm.mjs`
   through the edge.
5. **Memory of a second libfaust instance.** Two `instantiateFaustModuleFromFile`
   calls in one tab were not measured; the design avoids the question by
   memoising.
6. **Whether browsers cap concurrent AudioContexts at a number that matters
   here.** Not measured and not looked up; one context per page makes it moot.
7. **Whether the 54 to 65 ms key to sound reading means anything.** It does
   not, as a latency (section 2). A real number needs the analyser to be read
   at render quantum granularity, which is a worklet meter, not an analyser
   poll.

---

## 11. Measurement log, 2026-10-06

All run from the scratchpad
(`/private/tmp/claude-501/-Users-s32863-personal-positron/933a8596-18cd-4774-95f2-d3d822512b38/scratchpad`),
none of it in the repository. Chrome launched headless with a per-run profile
in the scratchpad, killed with SIGKILL and its profile removed after each run;
no profile was left behind (checked with `ls -d prof-*`).

| claim | command |
| --- | --- |
| vendor raw and brotli sizes | `node probe-faust.mjs` (node zlib, brotli quality 11, gzip 9) |
| libfaust boots in node, Organ compiles, factory sizes | `node probe-faust.mjs` (boot 44 ms; compile 68.0 then 29.6 ms, two runs) |
| ahead of time artefacts written | `node aot.mjs`, into `www/` |
| AOT vs live in headless Chrome, bytes, RMS | `node run.mjs` (four alternating runs: aot, libfaust, aot, libfaust; RMS 0.029763811585458978 in every run; libfaust boot 60.1 and 75.1 ms, compile 62.6 ms on the warm runs) |
| the first libfaust run read 8,861 ms of boot | the same command before the server cached its brotli: my server compressing 6 MB per request, NOT a browser number, discarded |
| offline render silent | `node run.mjs`, first version with `OfflineAudioContext`, RMS 0 |
| front page cost today | `node run-index.mjs` (`demo/index.html`, 18 resources, 301,089 B encoded) |
| demo count | `node -e "import('./demo/manifest.mjs').then(m => console.log(m.DEMOS.length))"`: **46** |
| AudioContext constructors | `grep -c` across `demo/*/index.html` and `demo/shell/*.mjs`: 13 files |

Verified today: everything marked MEASURED above, the demo count (46), the
slide engine's build-everything-and-start-slide-0 behaviour (read in the file
as it stands at 08:30 on 2026-10-06, while it is being edited), and the
`/fau/` engine being page-local. Taken from earlier documents and not re-run:
plan-fau's compile and render times, the scsynth boot times, `/muta/`'s and
`/nola/`'s byte figures, and `rhodes.mjs`'s 36.4 ms.
