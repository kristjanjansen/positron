# timeline-nested

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `timeline/nested.mjs`

### rules

Above `// 10. A LOOP IS A QUOTATION WITH REPETITION (plan-timeline §8). 'add({… repeat}`..., lines 1 to 118 before the cut.

~~~js
// timeline/nested.mjs — COMPOSITION ACROSS TIMELINES: a span that is itself a
// deck. The last structural piece of the library (PROGRESS 6q).
//
// Four clients in, every one of them could put *media* on a timeline and none
// of them could put a *timeline* on a timeline. `transport.sync()` slaves a
// vector to exactly one external master, and a deck's position is a single
// scalar — so "a stored instrument session dropped into an arrangement beside a
// 1965 broadcast" had no representation. It does now:
//
//     nest.add({ id, at, rate, deck })                // a nested/offset span
//     nest.add({ id, at, rate, deck, in, out })       // …QUOTING A FRAGMENT
//
// One transport drives another DECK's position instead of an element's
// currentTime, through the SAME sync() contract. Everything below is the
// consequence of that one sentence.
//
// THE RULES, stated once and enforced here:
//
// 1. POSITION DOMAINS DO NOT MIX. The child's position domain is its own (its
//    `range`, whatever units and origin it chose). The parent maps
//        childPos = clamp(child.range, child.range[0] + (parentPos - at) * rate)
//    and the span occupies (child.range[1]-child.range[0])/rate ms of PARENT
//    time. Outside that window the child is ABSENT — paused, and asserted at
//    the boundary it left through. Absence is content.
//
// 2. RATE COMPOSES MULTIPLICATIVELY, AND DEGRADES OUT LOUD. The child's
//    effective rate is parentRate × span.rate. The child's own adapters
//    declare what they can honestly play (`caps.rates`); the intersection of
//    those is the child's rate lattice. If the composed rate is not on it we
//    choose the nearest *in log space* and SAY SO — `span.rateReport` carries
//    {wanted, chose, degraded, allowed}, and the servo's correction count is
//    the price of the lie we did not tell. Rate 0 (pause) is always
//    expressible and never degrades.
//
// 3. SEEK IN THE PARENT IS A SEEK IN THE CHILD — a real `deck.seek()`, not a
//    `sync()`. That is what makes reduce-on-seek run *inside* the nested span,
//    so `assertState(reduce(prefix ≤ t))` still holds one level down (held
//    notes are re-asserted, media elements are re-anchored). `sync()` is
//    reserved for the servo: a correction must never re-fire anything.
//
// 4. A NESTED CHILD NEVER MASTERS THE PARENT'S CLOCK — unless the span is
//    declared `master: true`, and at most one span per parent may be. The
//    default is `follow`: the parent leads, the child is slaved (sync inside
//    the dead band, a real seek past `hardSeekMs`). With `master: true` the
//    direction reverses and the important half of the rule applies: if the
//    child contains its own clock master (a media element inside the session),
//    that master governs ONLY WITHIN THE CHILD — the parent slaves to the
//    CHILD'S POSITION, never to the element. One indirection, and the two
//    masters cannot fight: the element moves the child's vector, the child's
//    vector moves the parent's.
//
// 5. DRIFT NESTS, IT DOES NOT FLATTEN. `nest.driftStats()` returns the parent's
//    span table with each child's own drift channel (and ITS nest, recursively)
//    hanging off it. A p95 measured across two position domains would be a
//    number about nothing.
//
// 6. CYCLES ARE REJECTED AT `add()` TIME, not discovered at play time. A deck
//    may not contain itself, nor any of its ancestors. Depth is capped at
//    MAX_NEST_DEPTH (8 decks in a chain) — the limit exists because seek and
//    assert recurse through the whole chain synchronously.
//
// 7. A SPAN QUOTES A FRAGMENT, NOT A WHOLE. `add({… in, out})` selects a
//    sub-range of the CHILD's domain, and that is the whole point of the
//    format: plan-timeline §−1 says a new work is a score that QUOTES archive
//    timelines, and nobody quotes a whole broadcast. `in`/`out` default to the
//    child's own `range`, so rule 1 is the special case `in = c0, out = c1`.
//
//    a. The span occupies `(out - in) / rate` of PARENT time.
//    b. `in` IS the child's start for this span: entry seeks the child to `in`
//       and asserts there, exactly as the whole-range case asserts at `c0`.
//    c. `out` IS the child's end: past it the child is absent, parked and
//       asserted at `out`.
//    d. A parent seek anywhere inside maps to `in + (parentPos - at) * rate`,
//       exactly (the same affine map, with a different origin).
//    e. `in`/`out` outside the child's range CLAMP, and the clamp is REPORTED
//       (`span.trim` / `nest.trim(id)` carries {wanted, chose, clamped,
//       reason}) — never silently. A fragment entirely outside the range is a
//       rejection, not a clamp to nothing.
//    f. `in >= out` is rejected at `add()`.
//    g. **TRIM DOES NOT MUTATE THE CHILD.** The fragment lives on the SPAN
//       record; `deck.range` is untouched. That is what lets the SAME deck be
//       quoted twice, at two different fragments, in one arrangement — the
//       "timelines referencing timelines" case, and the thing trim is FOR. The
//       consequence enforced below: a span that is ABSENT must not park or
//       pause the child when a SIBLING quotation of that same deck is present
//       (`otherPresentOn`), and two quotations of one deck may not OVERLAP in
//       parent time — a deck has one position, so an overlap is not a trim
//       problem but an arithmetic impossibility, and it is rejected at add().
//
// 8. A QUOTATION IS A VALUE (timeline/score.mjs, plan-timeline §7.7 / C10).
//    `add()` also takes a serialisable `quotation({ref, at, rate, in, out,
//    provenance})` — which names its source by IDENTITY, not by object — and
//    `nest.toScore()` turns a live arrangement back into one. `in`/`out` may be
//    `{mark: 'chorus-3'}`, resolved against the child's own `mark` lane at ADD
//    time, so a score survives a re-cut of its source that numbers would not.
//    Numeric in/out is untouched: rule 7 is unchanged, it just gained an
//    address type.
//
// 9. ABSENCE MAY BE SILENT, AND THE NEST NEVER LEARNS WHAT A NOTE IS. Rule 7b/c
//    parks the child at the fragment edge and asserts there — so a quotation
//    whose `in` cuts a held note is parked HOLDING it, and a MIDI actuator sits
//    on that note for the whole time the span is absent. An adapter may declare
//    `caps.absentState: 'silence'` and implement `silence(info)`; the nest calls
//    it after the park and knows nothing about what was silenced. The default
//    is `'hold'` — today's behaviour, and the right one for a video frame.
//    Declaring 'silence' without implementing `silence()` is a DEGRADATION, and
//    it is reported (`span.absent.degraded`, `driftStats().spans[].absent`),
//    never guessed at.
//
// No timers live in here (the vector law): `servo()` is called by the client's
// existing rAF/interval loop, exactly like the media servo every media client
// already runs. ONE EXCEPTION, added by rule 10 and only for loops: the wrap
// boundary is COMMITTED as a cancellable one-shot on a caller-supplied TickHost
// — the same mechanism transport.mjs uses to commit every event. The vector law
// is untouched: `position()` is still pure, and the timer actuates, it does not
// integrate.
//
// Plain ESM, browser+node, no deps beyond the library itself.
~~~

### loop-rule

Above `import { pstats } from './logdeck.mjs';`, lines 120 to 152 before the cut.

~~~js
// 10. A LOOP IS A QUOTATION WITH REPETITION (plan-timeline §8). `add({… repeat})`
//     — a count, `{untilMs}`, or `'infinite'` — and rule 7d's affine map takes
//     **modulo instead of clamp** (§8.2):
//         childPos = in + ((parentPos − at)·rate) mod (out − in)
//     Everything else follows unchanged, which is the whole claim. What the
//     build had to settle (§8.7) is here and nowhere else:
//
//     a. THE WRAP RE-SEEKS, IT DOES NOT RE-FIRE. At the boundary the nest calls
//        a real `child.seek(in)` — so reduce-on-seek runs one level down, and
//        every EDGE-valued lane re-arms from the fragment's entry state. A
//        note-on from repetition 1 cannot be held in repetition 3, because
//        repetition 3 began by asserting what is held at `in`. That is rule 3
//        applied to a boundary the parent generates instead of the user.
//     b. LEVEL-VALUED LANES CARRY (§8.3). A lane declaring `caps.loopState:
//        'carry'` (or `caps.valued: 'level'`) is re-asserted AFTER the re-seek
//        with `reduce(prefix ≤ out)` — the level the iteration ENDED in. A
//        filter sweep set in repetition 3 is still there in repetition 4; a
//        note is not. §8.3 said this needs "no new adapter vocabulary"; it
//        needs exactly one word, because transport.mjs has no edge/level flag
//        (`absentState` is the nearest thing and it is about ABSENCE). The
//        default is 'rearm' — the safe direction, matching `absentState:'hold'`.
//     c. A WRAP IS NOT AN EVENT IN THE LOG. `nest.onWrap(cb)` and the optional
//        `adapter.loopWrap(info)` are CALLBACKS. Appending a `loop-wrap` row
//        would make an infinite loop an infinite log, which is §8.7's store
//        question answered by refusing to create it.
//     d. AN UNBOUNDED LOOP IS BOUND AT add() TIME to the parent's own range,
//        and says so (`span.unbounded`, `nest.loop(id).boundedTo`). It cannot
//        be RENDERED: `nest.renderBound()` throws `LOOP_UNBOUNDED` rather than
//        handing renderDeck a window nothing in the score justifies.
//     e. HARD CUT AT THE WRAP. There is no crossfade here at all, because a
//        crossfade across a splice is §5b tier 1 — a reconstruction — and a
//        reconstruction is an appended lane with a tier, not a nest parameter.
//        `nest.loop(id).joint` says `'cut'` and names the alternative.
~~~

### nest-of

Above `export function nestOf(deck) { return (deck && NESTS.get(deck)) || null; }`, lines 178 to 185 before the cut.

~~~js
/** Throws if linking parent -> child would make a cycle or exceed the depth
 *  cap. Exported so a client can ask before it builds. */
/** The nest a deck is the PARENT of, or null. Exported so the offline renderer
 *  can FOLD a nest it was not handed: `renderDeck(parent)` on a deck that has a
 *  nest must render the composition, not the two span markers. The map is
 *  already maintained (`NESTS`) — this only makes it readable, and it is the
 *  whole of the seam plan-timeline §8.8 called "`renderDeck` cannot see a
 *  nest". Recursive by construction: `nestOf(child)` walks one level down. */
~~~

### create-nest

Above `export function createNest(parent, {`, lines 227 to 236 before the cut.

~~~js
/**
 * @param parent  a deck (createDeck / makeLogDeck). It must have a `range`
 *                covering the nested spans. Either declare it at construction,
 *                or — since transport v0.5 — call `parent.setRange('auto')`
 *                after the last `nest.add()`: add() schedules the span's two
 *                items, so the derived range already covers them.
 * @param kind    the parent-domain event kind for nested spans
 * @param toleranceMs  servo dead band, both directions (sync's toleranceMs)
 * @param hardSeekMs   follow mode: past this error, seek the child instead
 */
~~~

### wrap-grace

Above `wrapGraceMs = 150,`, lines 244 to 245 before the cut.

~~~js
// rule 10a: how late a wrap may still play the head of its pass. The default
// IS transport.mjs's `lateGraceMs`, deliberately — one constant, one meaning.
~~~

### tick-host

Above `tickHost = null,`, lines 247 to 254 before the cut.

~~~js
// rule 10a: THE WRAP IS COMMITTED, NOT POLLED. A TickHost (the same object
// `createDeck({tickHost})` takes) whose `setTimer` the nest arms one-shot for
// the exact instant of the next loop boundary — the identical mechanism the
// scheduler uses to commit every event, so a wrap-adjacent event has the same
// firing-error distribution as any other event and not a worse one.
// Without it the boundary is discovered by `servo()` instead, which is
// correct but late by up to one client-loop period, and the nest SAYS SO
// (`nest.loop(id).boundary === 'polled'`) rather than quietly stuttering.
~~~

### phase-of

Above `const phaseOf = (sp, pos) => loopPhase((pos - sp.at) * sp.rate, sp.c1 - sp.c0, s`..., lines 265 to 269 before the cut.

~~~js
// rule 7d: the fragment map. c0 IS `in`, so this is the whole-range map with
// a different origin — and it stays exact because it is still one multiply.
// rule 10 / §8.2: a LOOPING span is the same map with MODULO instead of
// clamp. `loopPhase` lives in score.mjs so the nest, the property arms and a
// client all phrase the loop with one function.
~~~

### to-parent

Above `const toParent = (sp, cpos, iter = sp.iter || 0) =>`, lines 275 to 278 before the cut.

~~~js
/** The inverse. A loop has MANY parent positions per child position — one per
 *  repetition — so the caller must say which, and the default is the span's
 *  current one. Getting this wrong is how a mastering loop would teleport the
 *  parent back one iteration on every wrap. */
~~~

### parks-it

Above `const parksIt = (sp, pos) => {`, lines 290 to 293 before the cut.

~~~js
/** rule 7g: when EVERY quotation of a deck is absent they would all want to
 *  park it, at different edges, and the last writer would win at random. The
 *  child parks at the edge of the quotation the playhead is NEAREST to (ties
 *  go to insertion order) — deterministic, and the edge you actually left. */
~~~

### adapters-of

Above `const adaptersOf = (deck) => (typeof deck.adapter === 'function'`, lines 305 to 314 before the cut.

~~~js
/** RULE 9. The adapters of a child deck, for the one purpose of asking them
 *  to be silent. `deck.adapters` is the constructor-registered map that
 *  transport.mjs already exposes.
 *
 *  ✔ SEAM CLOSED (transport v0.6): the hook this note asked for — `deck
 *  .adapter(kind)` reading the scheduler's own map, and a `deck.silence()`
 *  that fans out internally — now exists, so an adapter registered AFTER
 *  construction is reachable. The fallback below is kept for a deck that
 *  predates it (logdeck, a hand-rolled facade); rule 10's `loopLanes()` uses
 *  the closed seam directly. */
~~~

### silence-child

Above `function silenceChild(sp, park, reason) {`, lines 319 to 321 before the cut.

~~~js
/** Ask every lane of the child that declared `caps.absentState:'silence'` to
 *  be silent. The nest passes a reason and a position and learns nothing about
 *  what a note is — that is the whole point of putting this on the adapter. */
~~~

### wrap-boundary

Above `/** Split the child's lanes into the ones that RE-ARM at a wrap and the ones`, lines 352 to 352 before the cut.

~~~js
// --- rule 10a/10b: THE WRAP BOUNDARY ---------------------------------------
~~~

### loop-lanes

Above `function loopLanes(deck) {`, lines 354 to 363 before the cut.

~~~js
/** Split the child's lanes into the ones that RE-ARM at a wrap and the ones
 *  that CARRY across it (§8.3's edge/level distinction, per kind).
 *
 *  transport.mjs carries no edge/level flag — the survey is unambiguous — so
 *  this reads `caps.loopState: 'rearm' | 'carry'`, accepting `caps.valued:
 *  'level' | 'edge'` (proto/automation/NOTES.md's own words) as a synonym.
 *  The DEFAULT IS 'rearm', for the same reason `absentState` defaults to
 *  'hold': a silent wrong guess about state that survives a boundary is worse
 *  than a lane that has to say what it is. Declaring 'carry' on a lane the
 *  transport cannot re-fold is a reported degradation, never a guess. */
~~~

### wrap

Above `const WRAP_LEAD_MS = 1e-6;`, lines 388 to 430 before the cut.

~~~js
/**
 * §8.7, answered: a loop RE-SEEKS the child, it does not re-fire its events.
 * The archaeology settles it three independent ways
 * (research/loops-prior-art-2026-08.md): tracker has no re-fire operation to
 * have; `time/timeline-emitter.js` stored `played:true` ON THE EVENT, so a
 * second pass needed a hand-unwind — mutable per-event cursor state makes a
 * loop structurally unbuildable; and proto/remixer already replaced
 * N×`play()` with one `seek(0); play()` because the layers then STAY together
 * instead of only starting together.
 *
 * Order matters and this is the order:
 *   1. tell the adapters that ASKED for the boundary (`loopWrap`) — before,
 *      so a real MIDI lane can flush ahead of the fold rather than after it;
 *   2. `child.seek(in)` — a REAL seek, so reduce+assertState runs one level
 *      down and every edge-valued lane re-arms from what is held at `in`;
 *   3. re-assert the CARRY lanes at `out` — the level the iteration ended in.
 *
 * Step 1 IS OPT-IN, and that is the archaeology's headline: **the wrap is not
 * an event, it is the absence of one.** tracker's loop is `(((beat −
 * startBeat) % len) + len) % len` with NO wrap handler, and it rings notes
 * across the boundary on purpose, because a fire-and-forget envelope has no
 * held state to leak. A lane opts in by implementing `loopWrap()`; a lane
 * with no reducer is not even touched by step 2 (transport's assertAt skips
 * it), so it rings across the wrap exactly as tracker's does.
 *
 * Step 2 is what makes "no stuck notes, ever" structural rather than
 * disciplinary, for the lanes that DO hold state: repetition N does not
 * inherit repetition N−1's state, it states its own.
 */
/**
 * WHERE THE WRAP SEEKS, and it is not quite `in`.
 *
 * `deck.seek(p)` reconciles: everything at `at <= p` becomes `passed`. So a
 * seek to exactly `in` FOLDS an event sitting exactly on `in` instead of
 * firing it — which is right for a fragment (rule 7b: entry asserts at `in`)
 * and wrong for a loop, where that event is the downbeat and the tape has
 * come round to play it. A quotation is `[in, out)`, half-open, so the
 * wrap seeks a hair BEFORE `in`: the fold is still the state strictly before
 * the downbeat, and the downbeat is still pending and commits immediately.
 *
 * The one case the library cannot fix from here is `in === deck.range[0]`,
 * where the seek clamps and the hair is lost. That is REPORTED, not hidden.
 */
~~~

### wrap-top

Above `const lateMs = (pos - (sp.at + toIter * sp.onePassMs)) * sp.rate;`, lines 447 to 468 before the cut.

~~~js
// A WRAP ALWAYS SEEKS TO THE TOP OF THE PASS, never to `toChild(pos)`.
// Two reasons, and the second is the one that was measured:
//   · a committed one-shot may fire a hair EARLY, and `toChild` would then
//     read the last microsecond of the OLD iteration off the map;
//   · a backstopped wrap is late by however long the client's loop took,
//     and seeking to `in + off` would deliberately SKIP that much of the
//     new pass — a lost downbeat, which is exactly the artefact. Seeking to
//     the top instead fires it, `off` ms late, which is what lateGrace is
//     for; the servo's next sync closes the position error without
//     re-firing anything.
//
// …UP TO A POINT, and the point is the transport's own `lateGraceMs`. That
// constant is already the library's answer to *how late may an event still
// fire?*, so it is also the answer to *how late may a wrap still play the
// head of its pass?* Past it — a 30 s blurred tab — the material was
// genuinely missed, and the child lands where the clock says instead of
// playing a head it would immediately have to jump out of.
// SIGNED distance from the boundary, in child ms — negative when a
// committed one-shot fires a hair early. Reading `phaseOf(pos).off` here
// instead was a real bug: an early timer saw off ≈ L, decided it was a
// 2-second-late catch-up, and seeked to the END of the pass it was about
// to play. 141 of 2400 onsets vanished before this line existed.
~~~

### reseek

Trailing comment on line 493 before the cut.

~~~js
sp.deck.seek(want);                                    // 2 — the re-seek
~~~

### carry

Above `for (const k of lanes.carry) {`, lines 494 to 501 before the cut.

~~~js
// 3 — THE CARRY. Fold at `out` (the level the iteration ended in) but
// assert at the PLAYHEAD, which is where the child now is. `assertAt(c1, k)`
// did both in one call and therefore reported `out` as the position — the
// "works; slightly untrue" seam proto/loops recorded and could not close,
// because `deck.assertState(kind, state, info)` did not exist until v0.7.
// Guarded, not assumed: `reduceAt` returns null/undefined for a lane the
// evidence policy excludes, and asserting that would push a null into a
// level lane's actuator — the exact shape of the fire-side hole v0.7 closed.
~~~

### committed

Above `function disarmWrap(sp) { if (sp.timerCancel) { try { sp.timerCancel(); } catch `..., lines 514 to 535 before the cut.

~~~js
// --- THE COMMITTED BOUNDARY -------------------------------------------------
//
// The gate: *loops stay in time and do not lag on re-seek.* Two things keep
// that true, and they are deliberately separate:
//
//   POSITION IS ARITHMETIC AND NEVER PAUSES. `toChild` is re-derived from the
//   parent's vector every call — never integrated, never "add one loop
//   length" — so the timing error at wrap 500 is the error at wrap 1. There
//   is nothing to accumulate because nothing accumulates.
//
//   THE RE-SEEK IS A STATE OPERATION, NOT A TRANSPORT ONE. `deck.seek()`
//   re-anchors the vector and re-folds; it does not stop the transport, does
//   not move the rate, and does not re-issue play(). transport.mjs's own seek
//   handler ends with `scan(now)` — *"re-arm immediately, don't wait a tick"* —
//   so the next iteration's lookahead is committed inside the same call.
//
// What was missing was WHEN. A boundary discovered by polling `servo()` is
// late by up to one client-loop period, and everything in that window is
// folded rather than fired: a 40 ms hole in the head of every pass. So the
// boundary is COMMITTED, exactly as an event is — one cancellable one-shot
// per span, re-armed from the ITERATION INDEX (`at + k·onePass`) and never
// from the last boundary, so it cannot drift either.
~~~

### monotonic

Above `const next = Math.max(phaseOf(sp, pos).iter + 1, sp.iter + 1);`, lines 546 to 549 before the cut.

~~~js
// MONOTONIC BY CONSTRUCTION. A one-shot is allowed to fire a hair early, so
// `phaseOf(pos).iter` can still read the OLD repetition just after a wrap;
// taking the max with `iter + 1` is what stops that from re-arming the
// boundary we just took, forever. (It did, once. This line is that bug.)
~~~

### from-index

Trailing comment on line 552 before the cut.

~~~js
const at = sp.at + next * sp.onePassMs;                                // FROM THE INDEX
~~~

### presence

Above `const presenceCbs = new Set();`, lines 565 to 570 before the cut.

~~~js
// PRESENCE IS AN EVENT, not only a counter. `sp.enters`/`sp.exits` have always
// been incremented here and there was no way to subscribe to them, so a client
// could see that a quotation had come and gone but never when — which for a
// score made of quotations is the arrival and departure of every piece in it.
// Symmetric with onWrap: fire-and-forget, and a throwing listener is the
// listener's problem, never the nest's.
~~~

### assert-span

Above `function assertSpan(sp, parentPos, present, entry = null) {`, lines 593 to 595 before the cut.

~~~js
/** Put the child exactly where the parent says it should be. This IS what a
 *  seek means one level down (rule 3) — a real child seek, so the child's own
 *  reduce/assertState runs and holds. */
~~~

### park

Above `const park = parentPos < sp.at ? sp.c0 : sp.endPark;`, lines 607 to 620 before the cut.

~~~js
// Leave through the boundary we actually left through, so the child's
// reducer asserts the edge state. With a fragment those boundaries are
// `in` and `out` (rule 7b/7c), not the deck's own ends.
//
// This used to be inside `if (sp.present !== false)` — i.e. it parked
// ONLY on the present -> absent transition. Fragments made the bug
// visible: play past a span (parked at `out`, present=false), then seek
// to BEFORE it, and the child stayed at `out` because the transition had
// already been spent. Absence is a POSITION, not an edge event, so the
// park is now driven by where the child actually is.
// rule 10: "the edge you actually left through" is not always `out` for a
// loop. `repeat:{untilMs}` may CUT the last pass, and the child then left
// through the cut — parking it at `out` would assert a state the
// performance never reached. `endPark` is that position, computed once.
~~~

### silence-once

Above `if (sp.silencedAt !== park) { silenceChild(sp, park, 'absent'); sp.silencedAt = `..., lines 624 to 626 before the cut.

~~~js
// RULE 9: the park ASSERTED the edge — whatever `in`/`out` cut is now
// held. An adapter that declared how to be silent gets asked, exactly
// once per park position (a re-park at a different edge re-asks).
~~~

### entry

Above `const off = sp.loop ? phaseOf(sp, parentPos).off : 0;`, lines 633 to 662 before the cut.

~~~js
// rule 10: `in` IS INCLUSIVE ON EVERY PASS, INCLUDING THE FIRST. Rule 7b
// says entry seeks to `in` and asserts there — which folds an event sitting
// exactly on `in` rather than firing it. For a single pass that is right
// (you started there). For a loop it would make pass 1 the only pass
// missing its downbeat, so entry takes the same hair-before-`in` lead a
// wrap takes, and every repetition sounds identical.
//
// ✦ FOUND BY THE OFFLINE RENDERER (2026-08-30). The test used to be
// `phaseOf(pos).off === 0` — an exact float equality that holds only when
// the ENTER event is actuated at EXACTLY `at`. On a virtual clock it always
// is (a committed one-shot fires at its due instant), so every property arm
// passed. In WALL-CLOCK playback the enter fire carries the scheduler's
// ordinary lateness, `off` was a few ms, and pass 1 — and only pass 1 —
// folded its downbeat: the same score rendered 8 onsets offline and played
// 7 in real time. The wrap was never the problem; the ENTRY was.
//
// The distinguisher is ARRIVED vs JUMPED, and the adapter contract already
// hands it over: `actuate(payload, rec)` with `phase:'enter'` IS an
// arrival; an `assertState` after a seek JUMPED, and rule 10a says a jump
// folds ("you jumped, you did not arrive"). The only remaining question is
// whether the arrival is too late to still play the head of its pass, and
// `wrapGraceMs` is already the library's answer to exactly that question —
// the identical bound `wrapSpan` uses, for the identical reason.
//
// (The first attempt at this bounded `off` by the fire's own `rec.deltaMs`
// and FAILED: `deltaMs` is sampled at the top of fire() and `off` is read
// from `parent.position()` a few instructions later, so `off > deltaMs`
// ALWAYS, by the cost of the intervening reads — measured, the entry seek
// went to child 0.98876953125 instead of −1e-6. A bound that is beaten by
// its own measurement overhead is not a bound.)
~~~

### seek-iteration

Above `if (sp.loop) { sp.iter = iterAt(sp, parentPos); armWrap(sp); }`, lines 666 to 668 before the cut.

~~~js
// rule 10a: a SEEK is a seek, at any depth and into any repetition. It
// lands in whichever iteration the arithmetic says and folds there; it does
// NOT wrap, so nothing carries — you jumped, you did not arrive.
~~~

### rates

Above `get rates() {`, lines 678 to 698 before the cut.

~~~js
/**
 * THE PARENT'S PLAYABLE RATES ARE ITS CHILDREN'S, DIVIDED BY THE RATE
 * EACH QUOTATION ASKS FOR.
 *
 * A span plays its child at `parentRate * sp.rate`, and that product has
 * to be in the child's `caps.rates`. So the parent rates that keep one
 * span legal are `{a / sp.rate}` over that span's allowed set, and the
 * parent's lattice is the intersection across every span.
 *
 * Worked, because the division is the part that surprises: a quotation at
 * 2x of a child allowing [0.25, 0.5, 1, 2] can be honoured at parent
 * rates [0.125, 0.25, 0.5, 1] — NOT at 2, which would ask the child for
 * 4. Beside a plain 1x quotation of the same child the intersection is
 * [0.25, 0.5, 1], and the 2x button correctly disappears.
 *
 * A GETTER, not a value: `deck.caps(kind)` hands back this object by
 * reference and spans arrive after the adapter is registered, so a
 * computed-once array would describe an empty nest forever. `undefined`
 * while there are no spans, so the transport bar falls back to its honest
 * static label rather than to an empty lattice.
 */
~~~

### delta

Above `if (sp) assertSpan(sp, parent.position(), p.phase === 'enter',`, lines 721 to 723 before the cut.

~~~js
// `rec.deltaMs` is how late THIS fire is — the transport has measured it
// since v0.3 and the nest never read it. It is what tells an ENTRY apart
// from a seek that happens to land on the same position (see assertSpan).
~~~

### follow

Above `transport(st) {`, lines 727 to 732 before the cut.

~~~js
/** play / pause / rate are NOT seeks — nothing re-asserts on them, but the
 *  child still has to follow the parent's transport (rule 4, follow half).
 *  This used to be a hand-written `parent.transport.onState()` filter here;
 *  since v0.4 the library reads `caps.followsTransport` and delivers exactly
 *  play/pause/rate (never 'seek' — that is reduce+assertState — and never
 *  'sync': a servo correction must not cascade). */
~~~

### present

Above `if (parent.playing() && r.chose > 0 && sp.present !== false) sp.deck.play(); els`..., lines 741 to 751 before the cut.

~~~js
// `sp.present !== false` — A SPAN THE PLAYHEAD HAS NOT ENTERED YET MUST
// NOT BE STARTED, even when the playhead is inside its window by the
// eps tolerance. Found by rendering a NEST INSIDE A NEST: an outer wrap
// seeks the middle deck to `in − 1e-6`, which is inside the inner
// span's window (eps 0.5 ms) but BEFORE its enter event, so the inner
// child was still parked at `c0` (rule 7c's absent park) — and starting
// it there made an event sitting exactly on `c0` fire 'tick-late', then
// fire AGAIN when the enter actuated and re-seeked a hair before `c0`.
// Two fires of one event, which breaks exactly-once. `present === null`
// (never asserted) still plays: that is a deck that was never seeked,
// and refusing it would be the regression.
~~~

### follower

Above `const offState = () => {};`, lines 773 to 774 before the cut.

~~~js
// (the play/pause/rate follower is adapter.transport() above — v0.4's
// caps.followsTransport, which is exactly this filter, written once.)
~~~

### boundary

Above `boundary: () => (boundaryHost ? 'lookahead' : 'polled'),`, lines 783 to 787 before the cut.

~~~js
/** rule 10a, reported: is the wrap boundary COMMITTED on a tick host, or
 *  discovered by whatever loop calls `servo()`? An offline render must be
 *  able to ask, because 'polled' offline is not a timing artefact — it is a
 *  DIFFERENT EVENT SET, and a render that quietly produced one would be
 *  reproducible and wrong. */
~~~

### add

Above `add(spec = {}, extra = {}) {`, lines 790 to 804 before the cut.

~~~js
/** Add a nested/offset span, optionally QUOTING A FRAGMENT of the child
 *  (`in`/`out`, rule 7). Throws on cycle / depth (rule 6), on `in >= out`,
 *  on a fragment wholly outside the child's range, and on two quotations of
 *  one deck overlapping in parent time.
 *
 *  @param spec {id, at, rate, deck, in, out, master, ref?, provenance?, meta?}
 *              `in`/`out` are positions in the CHILD's domain and default
 *              to `deck.range` — the whole-range case is the default case.
 *              They may also be `{mark:'chorus-3', offset?}` (rule 8).
 *              — OR — a QUOTATION VALUE from score.mjs, in which case the
 *              deck comes from `extra.resolve ?? nest's resolve` applied to
 *              `quotation.ref`. That is the whole of "a score can be loaded
 *              in a process that has never seen the decks".
 *  @param extra {resolve, markKind, deck}
 */
~~~

### fragment

Above `const mk = extra.markKind || markKind;`, lines 829 to 834 before the cut.

~~~js
// --- rule 7: the fragment. The child is NEVER touched: everything below
// lands on the SPAN record, so one deck can carry many quotations. ------
//
// rule 8: `in`/`out` are ADDRESSES now — a number, or `{mark:'chorus-3'}`
// resolved against the child's own mark lane. Resolution happens HERE, at
// add() time, so everything downstream still sees two numbers.
~~~

### unbounded

Above `const hi = parent.range && parent.range[1];`, lines 866 to 869 before the cut.

~~~js
// 10d — an unbounded loop still has to enter a schedule, and a schedule
// is made of finite instants. It is bound to the PARENT'S OWN RANGE,
// which is the only end this arrangement can honestly name, and the
// binding is reported rather than pretended away.
~~~

### overlap

Above `for (const [oid, o] of spans) {`, lines 880 to 884 before the cut.

~~~js
// 7g: one deck has ONE position — two quotations of it may not be present
// at the same parent instant. That is arithmetic, not policy.
// rule 10: and a LOOP is present for all N repetitions, so the window the
// overlap test uses is the whole run. Two loops of one deck collide
// immediately, which is right — a deck has one position.
~~~

### two-items

Above `parent.schedule({ at, kind, id: '${kind}-${id}-in',`, lines 928 to 928 before the cut.

~~~js
// one span, TWO items — a span is an interval, not an instant
~~~

### backstop

Above `if (sp.loop && parent.playing() && sp.rateReport && sp.rateReport.chose > 0) {`, lines 953 to 965 before the cut.

~~~js
// rule 10a — THE WRAP, detected as arithmetic and collapsed by it.
// The iteration index is a pure function of the parent's position, so a
// 30-second tab blur under a 2-second loop is ONE re-seek into the
// iteration we actually landed in, never fifteen replayed passes.
// (research/loops-prior-art-2026-08.md's wrap-artefact catalogue:
// "tab-blur burst is unbounded under an infinite loop" — that defect
// has no way in here, because nothing counts wraps to know where it is.)
// THE BACKSTOP, and only that: with a boundary host armed, the wrap has
// already happened at the instant and `it === sp.iter` here. This path
// catches the cases a committed one-shot cannot: no host supplied, a
// throttled/blurred tab, a clock that jumped. Only FORWARD — a boundary
// timer is allowed to fire a hair early, and bouncing back would be the
// stutter this whole mechanism exists to remove.
~~~

### degraded-master

Above `const masters = sp.master && !(sp.rateReport && sp.rateReport.degraded);`, lines 971 to 977 before the cut.

~~~js
// A DEGRADED CHILD CANNOT MASTER. If the composed rate had to be
// rounded onto the child's lattice, the child is running at a rate the
// parent did not ask for — letting it drive the parent's clock would
// silently impose that rate on the whole arrangement. So mastering is
// SUSPENDED for as long as the degradation lasts: the parent leads, the
// child is re-anchored by sync corrections, and the suspension is
// counted (`masterSuspended`) rather than hidden.
~~~

### parent-pos

Above `parentPos: (id, cpos, iter) => { const sp = spans.get(id); return sp ? toParent(`..., lines 1002 to 1005 before the cut.

~~~js
/** The inverse map. A LOOP has one parent position per repetition, so
 *  `iter` selects which; it defaults to the span's current one. The offline
 *  renderer calls this once per (item, iteration) to EXPAND a loop's audio,
 *  which is why the parameter is public and not just internal. */
~~~

### quotations-of

Above `quotationsOf: (deck) => [...spans.values()].filter((sp) => sp.deck === deck),`, lines 1013 to 1013 before the cut.

~~~js
/** every span quoting this deck — the "one timeline, many quotations" read */
~~~

### loop

Above `loop(id) {`, lines 1018 to 1021 before the cut.

~~~js
/** Everything a loop is, reported rather than inferred: what `repeat` said,
 *  how long one pass is in both domains, where the playhead is inside the
 *  repetition, how many wraps have happened, which lanes carry, and — the
 *  §8.7 answers — whether it is bounded and what the joint at the wrap is. */
~~~

### joint

Above `joint: 'cut',`, lines 1038 to 1042 before the cut.

~~~js
// §8.7's fourth question. There is no crossfade parameter, on purpose:
// a blend across a splice is §5b tier 1 and belongs in a declared
// reconstruction lane (or, per the archaeology, on the SOURCE — the
// lineage's only blend is Tone.GrainPlayer's grain `overlap`, a
// property of the player, not of the loop).
~~~

### on-wrap

Above `onWrap(cb) { wrapCbs.add(cb); return () => wrapCbs.delete(cb); },`, lines 1047 to 1049 before the cut.

~~~js
/** rule 10c: the wrap is a CALLBACK, never a row. Appending a `loop-wrap`
 *  event would make an infinite loop an infinite log — §8.7's store
 *  question answered by not creating the problem. */
~~~

### on-presence

Above `onPresence(cb) { presenceCbs.add(cb); return () => presenceCbs.delete(cb); },`, lines 1051 to 1053 before the cut.

~~~js
/** A quotation arriving or leaving: {span, ref, present, parentPos, reason,
 *  enters, exits}. `reason` is 'inside' | 'outside' | 'sibling' — the last
 *  being rule 7g, another quotation of the same deck holding it right now. */
~~~

### render-bound

Above `renderBound({ until } = {}) {`, lines 1060 to 1071 before the cut.

~~~js
/**
 * §8.7, THE RENDERER: an infinite loop cannot be rendered, so ASKING FOR
 * THE WINDOW is where the refusal lives — not inside renderDeck, which is
 * handed two numbers and has no way to know one of them was invented.
 *
 *     const {from, to} = nest.renderBound();          // throws if unbounded
 *     renderDeck(parent, {from, to, fps: 30});
 *
 * `renderDeck` already refuses a non-finite `to` ("needs finite {from, to}"),
 * which is the same refusal one level down; this one can name the SPAN.
 * @throws {Error} code LOOP_UNBOUNDED
 */
~~~

### quotation

Above `quotation(id) {`, lines 1097 to 1101 before the cut.

~~~js
/** The serialisable quotation VALUE for one span — `{ref, at, rate, in,
 *  out, provenance}`, frozen, JSON-safe, with no live reference in it.
 *  A mark address stays a mark address, and carries `wasAt`: what it
 *  resolved to when this score was written, so a later load can say out loud
 *  that the mark MOVED. */
~~~

### to-score

Above `toScore(opts = {}) {`, lines 1116 to 1117 before the cut.

~~~js
/** THE ROUND TRIP, outbound half: a live arrangement -> a value that
 *  `JSON.stringify` accepts and `loadScore()` reads back. */
~~~

### register

Above `NESTS.set(parent, nest);`, lines 1162 to 1166 before the cut.

~~~js
// Registered HERE, not in add(): `nestOf(parent)` is how the offline renderer
// discovers a composition, and a nest with no spans yet is still a nest — a
// deck that HAS one must not look flat just because it is empty. (It used to
// be set in add(), which made `renderDeck(parent)` on an empty nest fail with
// "needs finite {from, to}" instead of rendering the parent's own range.)
~~~

### nested-drift

Above `export function nestedDrift(deck) {`, lines 1173 to 1174 before the cut.

~~~js
/** One deck's drift channel, with ITS nest hanging off it — recursively.
 *  Never averaged across domains (rule 5). */
~~~
