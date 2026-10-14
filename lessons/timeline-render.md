# timeline-render

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `timeline/render.mjs`

### header

Above `import { createDeck, createAudioLane } from './transport.mjs';`, lines 1 to 145 before the cut.

~~~js
// timeline/render.mjs — OFFLINE RENDER: the second driver over the one engine.
// v0.6. Plain ESM, no deps. Node and browser (the audio half needs an
// OfflineAudioContext, so that part is browser-only).
//
// ===========================================================================
// THE DOCTRINE, and it is not ours — it is Remotion's `/docs/flickering`, the
// most explicit statement of it in the whole browser-A/V survey:
//
//     render workers are independent parallel tabs with NO SHARED WALL CLOCK
//   ⇒ "There is no real timing synchronization and results will differ across
//      machines"
//   ⇒ therefore the render has NO WALL CLOCK AT ALL.
//
// Motion Canvas ships the same split as a second driver over one core
// (`Player` rAF-gated vs `Renderer` "does not use an update loop… plays through
// the animation as fast as it can"); Elementary ships
// `@elemaudio/offline-renderer`; `OfflineAudioContext` is the standardised
// audio half ("renders as quickly as possible… fulfilling the returned promise
// with the rendered result as an AudioBuffer").
//
// WE GOT THE SEAMS FOR FREE AND HAD NEVER USED THEM:
//   · `createVirtualRuntime()` in transport.mjs is already a deterministic
//     ClockSource + TickHost — it is the CI gate for the C2 property test;
//   · the audio lane takes its AudioContext BY ARGUMENT;
//   · the tick host is pluggable per deck.
// So this file is not a second engine. It is a frame-stepping DRIVER plus the
// two things the seams did not already provide:
//   (1) a virtual runtime that can host MANY tick hosts on one clock (the
//       scheduler's and the audio lane's), which `createVirtualRuntime` cannot
//       — its single host's `start()` overwrites the previous callback;
//   (2) an `OfflineAudioContext` whose `currentTime` RIDES THE VIRTUAL CLOCK,
//       because a bare OfflineAudioContext's `currentTime` is pinned at 0 until
//       `startRendering()` and the audio lane's anchor would collapse onto it.
//       That is a real finding: "the audio lane takes a context by argument so
//       OfflineAudioContext drops in" is TRUE ONLY THROUGH THIS SHIM.
//
// TWO LIMITS OF THE AUDIO HALF, both verified rather than assumed:
//
//   (a) `OfflineAudioContext` CARRIES NO DETERMINISM GUARANTEE. The spec says it
//       "renders as quickly as possible… fulfilling the returned promise with
//       the rendered result as an AudioBuffer" and says NOTHING about
//       bit-exactness. So the event trace is the contract this file guarantees
//       (it is our arithmetic on our virtual clock); audio PCM equality is
//       something to MEASURE. Measured here: identical hashes twice in-process
//       AND across two separate browser processes, for a one-sample-impulse
//       graph and for a real DSP graph (sawtooth -> swept biquad -> exponential
//       envelope, 2ch/48k, rms identical to 9 dp) — headless Chromium, macOS
//       arm64, 2026-08-28. `hashAudioBuffer()` exists so a fleet can re-verify
//       that per browser/build instead of trusting this paragraph.
//   (b) WEB AUDIO IS `[Exposed=Window]`. Verified: inside a dedicated Worker
//       `OfflineAudioContext`, `AudioContext` and `BaseAudioContext` are all
//       `undefined`. So an offline AUDIO render cannot leave a document's main
//       thread. `renderDeck()`'s wall lane has no such limit — it is pure JS
//       over a virtual clock — so a render farm parallelises across DOCUMENTS
//       (Remotion Lambda's shape: N tabs), never across workers in one page.
//
// ===========================================================================
// THE DELIVERABLE IS A PROPERTY, NOT A FEATURE:
//
//     renderDeck(deck, o) twice  ⇒  BYTE-IDENTICAL event trace
//     renderDeck(deck, o)        ⇒  same events, same order, same count as
//                                   real-time playback (only the timing moves)
//
// asserted in `timeline/lab/prop-render.mjs`.
//
// ===========================================================================
// WHAT THIS MODE CANNOT MAKE DETERMINISTIC — stated up front, because the
// honest half of a determinism claim is its boundary. The transport, the
// scheduler, the reduce/assertState fold, the cursor and the audio lane are all
// pure functions of the virtual clock and are therefore exactly reproducible.
// AN ADAPTER IS NOT, and the library cannot make it so:
//
//   · anything reading a REAL DEVICE — a media element's `currentTime`, a MIDI
//     port, a camera, `getOutputTimestamp()` off audio hardware;
//   · anything doing I/O — `fetch`, WebSocket, IndexedDB;
//   · `Math.random` / `crypto.getRandomValues` (Remotion forbids unseeded
//     randomness outright, for exactly this reason);
//   · anything reading a wall clock directly — `Date.now`, `performance.now`,
//     `new Date()` — INCLUDING via `requestAnimationFrame`.
//
// ===========================================================================
// v0.7 — THE NEST (plan-timeline §8.8's last open seam: "`renderDeck` cannot
// see a nest"). Until this version the renderer was excellent on a FLAT deck
// and blind to the composition layer — fragment quotation, loops, phasing,
// disintegration — which is where all the interesting work is. A nested render
// folds the child decks through the nest's own position map:
//
//     fragment   childPos = clamp(in + (parentPos − at)·rate)
//     loop       childPos = in + ((parentPos − at)·rate) mod (out − in)
//
// and it does that by RUNNING THE SHIPPED NEST, not by re-deriving it here. The
// renderer supplies the two things a nest needs from its host and nothing else:
//
//   (1) A TICK HOST FOR THE WRAP. §8.8 measured that a loop boundary polled by
//       `servo()` loses material (one downbeat per wrap, 2100/2400 onsets) and
//       that a boundary COMMITTED as a one-shot does not. That finding is about
//       SCHEDULING DISCIPLINE, not about wall clocks, so it survives into the
//       offline mode unchanged — and the render runtime is already a multi-host
//       TickHost factory, so the offline path does not lack a TickHost, it has
//       a DETERMINISTIC one. `offlineNest()` wires it. A nest built without one
//       still renders, reproducibly, and the render SAYS `boundary:'polled'`
//       and how many wraps were taken late — because polled is not a timing
//       artefact offline, it is a DIFFERENT EVENT SET, and a render that
//       quietly produced one would be reproducible and wrong.
//   (2) THE SERVO'S LOOP. `nest.servo()` has no timers by design; the client's
//       rAF loop calls it. Offline the FRAME LOOP is that client loop — one
//       `servo()` per frame, after the clock has moved and before `onFrame`.
//       Pass `servo:false` to run the render on the committed boundary alone;
//       that is the negative control, and it is asserted in prop-render.
//
// An UNBOUNDED loop is refused, and the refusal is `nest.renderBound()`'s, not
// a second one written here: call `renderDeck(parent)` with no window and the
// window comes from `renderBound()`, which throws LOOP_UNBOUNDED naming the
// spans. Naming the end yourself (`{from, to}`) is still allowed — that is
// exactly `renderBound({until})` — and then the render REPORTS which spans were
// bounded by the window rather than by the score.
//
// A DEGRADED CHILD IS REPORTED, NEVER OVERRIDDEN. `caps.rates:[1]` on a child
// adapter refuses the parent's 1.5×; the nest chooses the nearest lattice point
// and says so, and that report rides out in `r.nest.rates[]` with
// `degraded:true`. The render does not "fix" it by rendering the rate the score
// asked for, because that would be a render of a performance that cannot happen.
//
// WHAT THE NEST RENDER IS MORE OF THAN PLAYBACK: cross-deck simultaneity. Two
// decks firing at the same instant are ordered by (time, timer-id) inside one
// `advanceTo`, so the render fixes a total order that NO wall clock provides
// (two schedulers, two hosts, no shared tick). Same events, same count, same
// per-deck order, same final state — but the interleaving between decks is a
// render property, not a transport contract. Stated here so nobody proves a
// regression against it.
// ===========================================================================
//
// The mode's answer is to REPORT rather than to silently produce a different
// result: `renderDeck()` audits every registered adapter before the first frame
// and returns `audit`, with `onNondeterministic: 'throw'` available for a CI
// gate. The audit has two halves and they are honestly different in strength:
//   DECLARED  — `caps.deterministic === true | false`, the adapter's own word.
//   SUSPECTED — a source-text scan of the adapter's functions. It is a
//               HEURISTIC and it says so: it cannot see through a closure, an
//               imported helper, a bound native or a dynamic property read.
//               A clean scan is NOT a proof; a dirty scan IS a reason to look.
// The one thing the mode can actually FIX rather than report is unseeded
// randomness, and only on request: `seedRandom: <int>` swaps `Math.random` for
// a seeded mulberry32 for the duration of the render and counts the draws.
// ===========================================================================
~~~

### runtime

Above `export function createRenderRuntime(startMs = 0) {`, lines 150 to 159 before the cut.

~~~js
// ---------------------------------------------------------------------------
// The render runtime: one deterministic clock, MANY tick hosts.
//
// `createVirtualRuntime()` exports a single host, so a deck and an audio lane
// cannot both `start()` on it — the second call replaces the first's callback.
// A render needs at least two. Same laws otherwise: time advances only through
// `advanceTo()`, and due timers and ticks fire in exact (time, id) order with
// the clock SET TO THEIR DUE MOMENT, so nothing observes a time it did not
// happen at.
// ---------------------------------------------------------------------------
~~~

### offline-deck

Above `export function offlineDeck(spec = {}) {`, lines 224 to 228 before the cut.

~~~js
/** A deck built for offline render: same createDeck, deterministic seams
 *  already wired, and it carries its runtime so renderDeck() can find it.
 *  `{runtime}` shares one clock with an already-built offline deck — which is
 *  what a NEST needs: a parent and its children must ride the same virtual
 *  clock or the composition is not a composition. */
~~~

### offline-nest

Above `export function offlineNest(parent, opts = {}) {`, lines 237 to 245 before the cut.

~~~js
/**
 * A nest whose WRAP BOUNDARY is committed on the render runtime — the offline
 * twin of `createNest(parent, {tickHost: workerTickHost()})`.
 *
 * This is one line and it is the whole difference between a loop that renders
 * the event set playback produces and one that does not (§8.8: the boundary is
 * a committed one-shot, never polled). `createNest` is unmodified; the renderer
 * just hands it a deterministic host instead of a worker.
 */
~~~

### nest-tree

Above `export function nestTree(root) {`, lines 257 to 267 before the cut.

~~~js
/**
 * Walk a nest and everything under it, in a STABLE order (insertion order of
 * spans, depth-first), producing:
 *   nests  [{nest, path}]        — servo order, outermost first
 *   spans  [{path, id, sp, nest}]
 *   decks  [{deck, label, spans}] — one row per DECK (a deck may be quoted more
 *                                   than once; a deck has one scheduler, so the
 *                                   trace tag is per deck, not per span)
 * The label is the path of the span that FIRST reached the deck, so it names a
 * position in the arrangement and is reproducible from the arrangement alone.
 */
~~~

### audit

Above `export function auditAdapters(deck) {`, lines 313 to 315 before the cut.

~~~js
/** Audit every registered adapter. See the header for why this is two halves
 *  of different strength — `declared` is the adapter's word, `suspected` is a
 *  source-text heuristic that CANNOT see through closures. */
~~~

### hash-text

Above `export function hashText(s) {`, lines 359 to 361 before the cut.

~~~js
/** FNV-1a 64-bit (as two 32-bit halves, hex) over a string. Synchronous, so it
 *  works identically in node and the browser; the REAL determinism assert is
 *  string equality of the trace text — this is the short form to print. */
~~~

### hash-audio

Above `export function hashAudioBuffer(buf) {`, lines 372 to 372 before the cut.

~~~js
/** Hash the PCM of a rendered AudioBuffer — the audio half's byte-identity. */
~~~

### render-deck-banner

Above `/**`, lines 396 to 398 before the cut.

~~~js
// ---------------------------------------------------------------------------
// renderDeck — the frame-stepping driver.
// ---------------------------------------------------------------------------
~~~

### render-deck

Above `export function renderDeck(deck, {`, lines 400 to 435 before the cut.

~~~js
/**
 * Step the transport by EXACT frame increments on a deterministic runtime,
 * firing every event in order, exactly once, with no wall-clock dependence and
 * no real-time waiting.
 *
 *   const deck = offlineDeck({items, adapters, range: [0, 10000]});
 *   const r = renderDeck(deck, {from: 0, to: 10000, fps: 30,
 *                              onFrame: ({frameIndex, pos, state}) => draw(...)});
 *   r.traceText   // the canonical event trace — byte-identical across runs
 *   r.traceHash   // its FNV-1a 64 short form
 *   r.audit       // what could not be made deterministic, and why
 *
 * @param deck  a deck built on a render runtime (`offlineDeck()`), or any deck
 *              plus an explicit `{runtime}`. A deck on a WALL clock is refused:
 *              silently rendering it would reintroduce exactly the "results
 *              differ across machines" failure this mode exists to remove.
 * @param opts
 *   from, to      the position window, inclusive of both ends
 *                 [required — UNLESS the deck has a nest, in which case they
 *                  default to `nest.renderBound()`, which throws
 *                  LOOP_UNBOUNDED on an infinite loop rather than inventing
 *                  a window nothing in the score justifies]
 *   fps           frames per second of POSITION time                     [30]
 *   rate          transport rate during the render                        [1]
 *   onFrame       ({frameIndex, pos, state, timeUs, deck, children}) per frame
 *   stateKinds    kinds to pre-fold into `state` each frame               [[]]
 *   trace         collect the event trace                               [true]
 *   seedRandom    int — swap Math.random for a seeded stream, and count  [null]
 *   onNondeterministic  'report' | 'throw'                          ['report']
 *   startPos      seek here before frame 0 (default `from`)
 *   nest          a nest to fold; `undefined` auto-detects `nestOf(deck)`;
 *                 `false` renders the parent FLAT (the pre-v0.7 behaviour,
 *                 kept because "render only this deck's own lanes" is a real
 *                 request and silently changing it would be a regression)
 *   servo         call `nest.servo()` once per frame                    [true]
 */
~~~

### nest-first

Above `const nest = nestOpt === false || nestOpt === null ? null : (nestOpt || nestOf(d`..., lines 460 to 462 before the cut.

~~~js
// --- v0.7: THE NEST. Resolve it before the window, because on a nested deck
// the WINDOW COMES FROM THE NEST (`renderBound()`), and that is the call that
// refuses an unbounded loop.
~~~

### child-clocks

Above `for (const d of tree.decks) {`, lines 480 to 482 before the cut.

~~~js
// Every deck in the composition must be on the RENDER'S clock. One child on a
// wall clock is the whole failure back again, one level down and harder to
// see — so it is refused by name, not averaged into a caveat.
~~~

### child-lanes

Above `const childOffs = [];`, lines 550 to 554 before the cut.

~~~js
// --- v0.7: the CHILD lanes. One listener per DECK (a deck has one scheduler,
// however many times it is quoted), tagged `s:<label>`. A child row therefore
// has a DIFFERENT SHAPE from a parent row — `{f,s,k,id,at,o,i,d}` vs
// `{f,k,id,at,o,i,d}` — which keeps a FLAT render's trace bytes exactly what
// they were before this version, so no existing hash moved.
~~~

### wraps

Above `const wrapRows = [];`, lines 577 to 579 before the cut.

~~~js
// rule 10c, honoured: a wrap is a CALLBACK, never a row in the log. It is not
// in `trace` either — it gets its own bounded list and its own hash, so the
// wrap set is provable without an infinite loop ever becoming an infinite log.
~~~

### advance

Above `runtime.advanceTo(t0 + (i * 1000) / fps / rate);`, lines 605 to 608 before the cut.

~~~js
// ONE advance per frame; everything due inside the interval fires in
// (time, id) order with the clock set to its own due moment. A committed
// WRAP is one of those due things, so it lands at its exact instant and
// the head of the new pass commits inside the SAME advance.
~~~

### servo

Above `if (servo) for (const { nest: n } of tree.nests) { servoCalls++; servoCorrection`..., lines 610 to 613 before the cut.

~~~js
// THE SERVO'S LOOP IS THE FRAME LOOP. `nest.servo()` owns no timers by
// design (the vector law); a client calls it from its rAF loop, and
// offline the frame loop IS that client. Outermost nest first, so a
// parent's correction reaches its grandchildren in the same frame.
~~~

### children

Above `const children = tree.spans.map(({ path, id, sp, nest: n }) => ({`, lines 623 to 624 before the cut.

~~~js
// A nested renderer needs to know WHERE EACH CHILD IS to draw it. That
// is the nest's position map, read, never re-derived here.
~~~

### pause-at-end

Above `if (pauseAtEnd) deck.transport.pause();`, lines 632 to 641 before the cut.

~~~js
// `pauseAtEnd: false` exists for ONE reason and it is a real property of
// offline audio: an OfflineAudioContext has not rendered anything yet when
// the last frame is stepped. `createAudioLane` cancels every COMMITTED node
// on any transport state change (correct — a pause must not leave notes
// ringing), so a closing `pause()` would `stop()` and `disconnect()` the
// entire scheduled graph microseconds before `startRendering()` reads it,
// and the render would come out SILENT. Measured, not theorised: that is
// exactly what the first run of run-render.mjs produced (7 nodes, all
// 'pending', 0 nonzero samples). renderDeckAudio() therefore pauses AFTER
// the buffer exists.
~~~

### nest-report

Above `function buildNestReport(nest, tree, x) {`, lines 676 to 677 before the cut.

~~~js
/** Everything the composition layer did, reported rather than inferred. Split
 *  out because it is all reading — the render is already over when it runs. */
~~~

### audio-target

Above `export function offlineAudioTarget(ctx, runtime, { startMs } = {}) {`, lines 739 to 754 before the cut.

~~~js
/**
 * An OfflineAudioContext whose `currentTime` RIDES THE VIRTUAL CLOCK.
 *
 * Why this is necessary and not decoration: `createAudioLane` anchors wall time
 * to audio time by sampling `clock.now()` and `ctx.currentTime` together, then
 * schedules `node.start(anchor.audio + (wallT - anchor.wall)/1000)`. A bare
 * OfflineAudioContext reports `currentTime === 0` until `startRendering()` and
 * never advances during scheduling, so every re-anchor would map "now" back to
 * 0 and every node would be started ~one lookahead horizon into the buffer,
 * regardless of its real position. With this shim the anchor is exact and
 * constant: audioTimeFor(wall) === (wall - t0)/1000 for every sample of it.
 *
 * Everything except `currentTime` is delegated to the real context, with
 * methods bound to it (a native AudioContext method throws on a foreign
 * receiver, which is why this is a Proxy and not Object.create).
 */
~~~

### render-audio

Above `export async function renderDeckAudio(deck, {`, lines 769 to 800 before the cut.

~~~js
/**
 * Render a deck's WALL lane and an AUDIO lane together, offline, into an
 * AudioBuffer. Browser-only (needs OfflineAudioContext).
 *
 *   const r = await renderDeckAudio(deck, {
 *     from: 0, to: 4000, fps: 30,
 *     audioItems: [{at: 500, kind: 'click'}, …],
 *   });
 *   r.audio.hash   // byte-identity of the rendered PCM
 *
 * The audio lane is the SHIPPED `createAudioLane` — unmodified, taking its
 * context by argument exactly as it always has. Proving that seam works with a
 * different kind of context is half the point of this function existing.
 *
 * v0.7 — A NEST GETS AUDIO TOO, and this is where §8.5's two pieces stop being
 * live-only demos and become rendered files:
 *
 *     childAudio: [{span: 'q', items: [{at, kind, id}, …], makeNode}]
 *
 * A child lane is a `createAudioLane` on the CHILD's transport, sharing the one
 * OfflineAudioContext and the one virtual clock. That composes correctly for
 * free, and the reason is worth stating: the lane maps `transport.timeAt(ev.at)`
 * (the CHILD's position -> wall) and then wall -> audio through the shared
 * anchor, so a child event's sample index is the composition's arithmetic, not
 * a second copy of it. A LOOP therefore repeats its audio without any code
 * here: `child.seek()` at the wrap is a transport state change, `createAudioLane`
 * cancels the committed nodes and re-pends everything after the seek point, and
 * the next pass commits again — the same mechanism that makes a live loop work.
 *
 * The `[Exposed=Window]` limit is unchanged and it is the shape of a render
 * farm: one document per render, N documents in parallel, never N workers.
 */
~~~

### nest-window

Above `const nest = renderOpts.nest === false || renderOpts.nest === null`, lines 814 to 816 before the cut.

~~~js
// The window may come from the nest (renderBound) exactly as in renderDeck —
// and it has to be resolved HERE, because the buffer length is a function of
// it and an OfflineAudioContext's length is fixed at construction.
~~~

### lane-mode

Above `const boundTo = mode === 'lane' ? row.sp.deck.transport : deck.transport;`, lines 844 to 846 before the cut.

~~~js
// 'lane' binds the lane to the CHILD's transport. It is kept because it is
// the obvious design and because it is WRONG OFFLINE, measurably — see the
// note above expandSpanTimes().
~~~

### no-pause

Above `r = renderDeck(deck, { from, to, fps, rate, ...renderOpts, nest: nest || false, `..., lines 866 to 870 before the cut.

~~~js
// pauseAtEnd:false — see the note in renderDeck. Nothing may touch the
// transport (and therefore the lane's committed nodes) until the buffer is
// rendered; the virtual clock does not advance on its own, so leaving the
// transport 'playing' between the last frame and startRendering() costs
// nothing and changes no position.
~~~

### expand

Above `function expandSpanTimes(tree, path, childAt) {`, lines 891 to 919 before the cut.

~~~js
/**
 * THE SEAM AT THE NEST'S AUDIO BOUNDARY, and it is the one the flat renderer's
 * closing `transport.pause()` already taught — one level down, and this time
 * caused BY THE COMPOSITION rather than by the renderer's epilogue.
 *
 * MEASURED, on a real OfflineAudioContext (Chromium, macOS arm64, 2026-08-30):
 * a child audio lane bound to the CHILD's transport rendered **1 nonzero sample
 * out of an expected 7** for a 3-pass loop. The cause is not the anchor and not
 * the map — both are exact — it is that `createAudioLane` subscribes to
 * `transport.onState` and calls `cancelCommitted()` on EVERY state change,
 * which is exactly right live (a seek must not leave notes ringing) and exactly
 * wrong offline. Offline, nothing has played when the graph is built: the whole
 * buffer is rendered at `startRendering()`, so a node stopped and disconnected
 * at wrap 1 never sounds at all. And a loop's wrap IS a `child.seek()` — the
 * mechanism §8.8 chose on purpose — so a looping child cancels its own audio,
 * once per repetition, by design.
 *
 * The fix is not a flag on the lane; it is a change of what an offline render
 * IS. **Offline, a loop is EXPANDED, not replayed.** The renderer maps each
 * child-domain audio item to its parent-domain time ONCE PER REPETITION —
 * through the nest's own inverse map, `nest.parentPos(id, cpos, iter)`, so the
 * expansion cannot disagree with the position map the event lanes use — and
 * schedules them all on a lane bound to the ROOT transport, which never seeks
 * during a render. A loop inside a loop expands multiplicatively, which is why
 * this is recursive.
 *
 * `mode:'lane'` keeps the broken path reachable, because a negative control you
 * can run is worth more than a paragraph you can read.
 */
~~~
