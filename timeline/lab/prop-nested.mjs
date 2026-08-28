#!/usr/bin/env node
// timeline/lab/prop-nested.mjs — property arms for v0.5:
//
//   suite 6  FRAGMENT QUOTATION   nested.mjs rule 7 (`nest.add({… in, out})`)
//   suite 7  deck.setRange()      transport.mjs v0.5, incl. the CURSOR arm
//
// A SEPARATE FILE from prop-test.mjs on purpose: prop-test.mjs is owned by a
// sibling agent this cycle, so these arms live beside it rather than inside it.
// Same virtual runtime, same determinism, same exit code.
//
//   node timeline/lab/prop-nested.mjs [--verbose]
//   node timeline/lab/prop-nested.mjs --seeds 100    (accepted; these arms are
//                                                     exhaustive, not sampled)
//
// The motivating sentence, from plan-timeline §−1 / C10: *a new work is a score
// that QUOTES archive timelines*. Nobody quotes a whole broadcast. Before this
// suite a nested span could only play the child's WHOLE range, which is the one
// thing a quotation never is.

import { createDeck, createVirtualRuntime, createCursor } from '../transport.mjs';
import { createNest } from '../nested.mjs';
import { mediaMaster } from '../media-master.mjs';
import {
  quotation, isQuotation, quotationEquals, score, parseScore, scoreToJSON, scoreRefs,
  loadScore, refDeck, deckRef, marksOf, exportProvenance, validateProvenance, npt, toReviewRating,
  // suite 14 (§8): a loop is a quotation with repetition
  normalizeRepeat, repeatGeometry, loopPhase, provenanceRows, NS,
} from '../score.mjs';
import { renderDeck, offlineDeck, createRenderRuntime } from '../render.mjs';
import { buildJsonlIndex, jsonlStore } from '../store.mjs';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const VERBOSE = process.argv.includes('--verbose');
let failures = 0, checks = 0;
function check(label, seed, cond, detail) {
  checks++;
  if (!cond) { failures++; console.error(`FAIL [${label} seed=${seed}] ${detail}`); }
  else if (VERBOSE) console.log(`ok   ${label}/${seed}  ${detail || ''}`);
}
function throws(fn) { try { fn(); return null; } catch (e) { return e.message; } }

// --- the shared virtual runtime (two decks, one clock) ----------------------
function sharedVR(startMs = 1_000_000) {
  const vr = createVirtualRuntime(startMs);
  const cbs = new Set();
  let started = false;
  vr.newHost = () => {
    let mine = null;
    return {
      name: 'virtual',
      start(cb, ms) {
        mine = cb; cbs.add(cb);
        if (!started) { started = true; vr.host.start(() => { for (const c of [...cbs]) c(); }, ms || 25); }
      },
      stop() { if (mine) cbs.delete(mine); },
      setTimer: (d, f) => vr.host.setTimer(d, f),
    };
  };
  return vr;
}

// A child worth quoting: five overlapping notes across 4 s, so every fragment
// boundary lands INSIDE at least one held note — the case where "seek to `in`
// and assert" is not the same as "start from silence".
const NOTES = [
  { n: 60, on: 100, off: 400 }, { n: 62, on: 500, off: 1200 },
  { n: 64, on: 900, off: 2500 }, { n: 67, on: 1500, off: 3800 },
  { n: 72, on: 2600, off: 3000 },
];
const CHILD_END = 4000;
const heldAt = (t) => NOTES.filter((x) => x.on <= t && x.off > t).map((x) => x.n).sort((a, b) => a - b);
const CHILD_RATES = [0.25, 0.5, 1, 2, 4];

// suite 11/13 add two knobs and change nothing for suites 6-9: `shift` moves
// the whole child (a RE-CUT source: a restored leader spliced in front), and
// `absentState`/`silence` is rule 9's declaration.
function makeChild(vr, sink, range = [0, CHILD_END], { shift = 0, marks = null, absentState, silence } = {}) {
  const items = [];
  for (const x of NOTES) {
    items.push({ at: x.on + shift, kind: 'note', payload: { raw: [144, x.n, 90] } });
    items.push({ at: x.off + shift, kind: 'note', payload: { raw: [128, x.n, 0] } });
  }
  for (const m of marks || []) items.push({ at: m.at + shift, kind: 'mark', id: m.id, payload: { label: m.label } });
  return createDeck({
    clock: vr.clock, tickHost: vr.newHost(), items, range,
    adapters: {
      note: {
        caps: { catchUp: 'reduce', rates: CHILD_RATES, reducible: true, seekable: true,
                ...(absentState ? { absentState } : {}) },
        ...(silence ? { silence } : {}),
        actuate(p) {
          const [s, n] = p.raw;
          if ((s & 0xf0) === 0x90) sink.live.add(n); else sink.live.delete(n);
          sink.fires++; sink.firedAt.push(+p.at);
        },
        reduce(payloads) {
          const held = new Map();
          for (const p of payloads) { const [s, n, v] = p.raw; if ((s & 0xf0) === 0x90 && v > 0) held.set(n, p); else held.delete(n); }
          return held;
        },
        assertState(held, info) {
          sink.live = new Set(held.keys());
          sink.asserts.push({ pos: +info.pos.toFixed(3), reason: info.reason, keys: [...held.keys()].sort((a, b) => a - b) });
        },
      },
    },
  });
}
const newSink = () => ({ live: new Set(), asserts: [], fires: 0, firedAt: [] });
const heldNow = (sink) => [...sink.live].sort((a, b) => a - b);

// ===========================================================================
// suite 6a — the fragment IS the span: length, entry edge, exit edge, exact
//            seek anywhere inside.
// ===========================================================================
{
  const vr = sharedVR();
  const sink = newSink();
  const child = makeChild(vr, sink);
  const parent = createDeck({ clock: vr.clock, tickHost: vr.newHost(), range: [0, 40000], items: [] });
  const nest = createNest(parent, { toleranceMs: 5, hardSeekMs: 200 });

  const AT = 5000, IN = 700, OUT = 2800, RATE = 1;
  const sp = nest.add({ id: 'q', at: AT, rate: RATE, deck: child, in: IN, out: OUT });

  // 7a — the span occupies (out - in) / rate of PARENT time
  check('frag-span', 0, Math.abs(sp.parentDur - (OUT - IN) / RATE) < 1e-9,
    `parentDur ${sp.parentDur} !== (out-in)/rate ${(OUT - IN) / RATE}`);
  check('frag-span', 0, String(nest.fragment('q')) === String([IN, OUT]) && sp.in === IN && sp.out === OUT,
    `fragment ${nest.fragment('q')} !== [${IN}, ${OUT}]`);
  check('frag-span', 0, nest.trim('q').fragment === true && nest.trim('q').clamped === false &&
    String(nest.trim('q').deckRange) === String([0, CHILD_END]),
    `trim report wrong: ${JSON.stringify(nest.trim('q'))}`);
  // 7g — TRIM DOES NOT MUTATE THE CHILD
  check('frag-span', 0, String(child.range) === String([0, CHILD_END]),
    `trim mutated the child's range: ${child.range}`);
  check('frag-span', 0, Math.abs(nest.trim('q').quotedFraction - (OUT - IN) / CHILD_END) < 1e-6,
    `quotedFraction ${nest.trim('q').quotedFraction}`);

  // 7b — ENTRY asserts at `in`, and `in` is inside a held note, so the reducer
  //      must state that edge (not silence).
  parent.seek(AT - 1);
  check('frag-entry', 0, child.position() === IN,
    `absent-before must park the child at IN=${IN}, got ${child.position()}`);
  // NOTE (rule 7b/7c, consequence): absence parks at the FRAGMENT edge, so a
  // quotation whose `in` cuts a held event is parked HOLDING it — that is what
  // "this quotation opens on a ringing chord" means, and it is the same state
  // the quotation will open with. Silence-while-absent is only free when the
  // fragment boundary is a silent one.
  check('frag-entry', 0, String(heldNow(sink)) === String(heldAt(IN)),
    `parked at IN the child must state IN's edge: [${heldNow(sink)}] !== [${heldAt(IN)}]`);
  sink.asserts.length = 0;
  parent.seek(AT);
  check('frag-entry', 0, Math.abs(child.position() - IN) < 1e-9,
    `entry must seek the child to IN=${IN}, got ${child.position()}`);
  check('frag-entry', 0, String(heldNow(sink)) === String(heldAt(IN)) && heldAt(IN).length > 0,
    `entry held [${heldNow(sink)}] !== reduce(<=${IN}) [${heldAt(IN)}] — the edge was not stated`);
  check('frag-entry', 0, sink.asserts.some((a) => a.reason === 'seek' && Math.abs(a.pos - IN) < 1e-9),
    `no reduce-on-seek ran IN THE CHILD at IN (${JSON.stringify(sink.asserts)})`);

  // 7d — a parent seek ANYWHERE inside maps to in + (parentPos - at)*rate, exact
  let worst = 0;
  for (const u of [0, 1, 137.5, 700, 1301.25, (OUT - IN) - 1e-3, OUT - IN]) {
    sink.asserts.length = 0;
    parent.seek(AT + u);
    const want = IN + u * RATE;
    worst = Math.max(worst, Math.abs(child.position() - want));
    check('frag-seek', u, Math.abs(child.position() - want) < 1e-9,
      `parent ${AT + u} -> child ${child.position()}, want in + u*rate = ${want}`);
    check('frag-seek', u, String(heldNow(sink)) === String(heldAt(want)),
      `held [${heldNow(sink)}] !== reduce(<=${want}) [${heldAt(want)}]`);
    check('frag-seek', u, Math.abs(nest.childPos('q') - want) < 1e-9, `nest.childPos disagrees`);
    check('frag-seek', u, Math.abs(nest.parentPos('q', want) - (AT + u)) < 1e-9, `nest.parentPos is not the inverse`);
  }
  if (VERBOSE) console.log(`      worst fragment seek error ${worst}`);

  // 7c — `out` behaves as the child's END: absent past it, asserted AT out.
  //      OUT=2800 sits inside notes 67 and 72, so a WRONG implementation that
  //      parked at the deck's end (4000, silence) would still show "nothing
  //      held" — this asserts the position, and that the child does not run on.
  parent.seek(AT + (OUT - IN) + 500);
  check('frag-exit', 0, nest.present('q') === false && !child.playing(),
    'past `out` the child must be absent and paused');
  check('frag-exit', 0, child.position() === OUT,
    `absent-after must park the child at OUT=${OUT} (its end for this quotation), got ${child.position()}`);
  check('frag-exit', 0, String(heldNow(sink)) === String(heldAt(OUT)),
    `parked at OUT the child must state OUT's edge: [${heldNow(sink)}] !== [${heldAt(OUT)}]`);
  const posAtExit = child.position();
  parent.play(); vr.advanceTo(vr.now() + 1500); nest.servo();
  check('frag-exit', 0, !child.playing() && child.position() === posAtExit,
    `the child ran past its quotation end: ${child.position()}`);
  parent.pause();

  // playing THROUGH the fragment fires only what is inside it
  sink.fires = 0; sink.firedAt.length = 0;
  parent.seek(AT); parent.play();
  vr.advanceTo(vr.now() + (OUT - IN) + 400);
  nest.servo();
  parent.pause();
  const outside = sink.firedAt.filter((t) => t < IN || t > OUT);
  check('frag-play', 0, outside.length === 0,
    `playing the quotation fired events OUTSIDE [${IN}, ${OUT}]: ${outside}`);
  check('frag-play', 0, sink.firedAt.length > 0, 'the quotation fired nothing at all');

  nest.dispose(); parent.dispose(); child.dispose();
}

// ===========================================================================
// suite 6b — clamping degrades OUT LOUD; in >= out is rejected at add()
// ===========================================================================
{
  const vr = sharedVR();
  const sink = newSink();
  const child = makeChild(vr, sink);
  const parent = createDeck({ clock: vr.clock, tickHost: vr.newHost(), range: [0, 40000], items: [] });
  const nest = createNest(parent, { toleranceMs: 5 });

  const sp = nest.add({ id: 'wide', at: 1000, rate: 1, deck: child, in: -900, out: 9000 });
  const tr = nest.trim('wide');
  check('frag-clamp', 0, tr.clamped === true && tr.degraded === true && String(tr.chose) === String([0, CHILD_END]),
    `clamp not reported: ${JSON.stringify(tr)}`);
  check('frag-clamp', 0, String(tr.wanted) === String([-900, 9000]) && /clamped/.test(tr.reason || ''),
    `the WANTED fragment and a reason must survive the clamp: ${JSON.stringify(tr)}`);
  check('frag-clamp', 0, Math.abs(sp.parentDur - CHILD_END) < 1e-9,
    `a clamped fragment must occupy the CLAMPED length, got ${sp.parentDur}`);
  check('frag-clamp', 0, nest.driftStats().spans[0].trim.clamped === true,
    'driftStats must carry the trim report (a degradation is never hidden)');
  check('frag-clamp', 0, String(child.range) === String([0, CHILD_END]), 'clamping must not mutate the child');

  // one-sided clamp
  nest.add({ id: 'half', at: 20000, rate: 1, deck: child, in: 3000, out: 99999 });
  check('frag-clamp', 1, String(nest.fragment('half')) === String([3000, CHILD_END]) && nest.trim('half').clamped,
    `one-sided clamp wrong: ${nest.fragment('half')}`);

  // 7f — in >= out rejected AT add()
  check('frag-reject', 0, /strictly before/.test(throws(() => nest.add({ id: 'x1', at: 0, deck: child, in: 2000, out: 2000 })) || ''),
    'in === out must be rejected at add()');
  check('frag-reject', 0, /strictly before/.test(throws(() => nest.add({ id: 'x2', at: 0, deck: child, in: 3000, out: 1000 })) || ''),
    'in > out must be rejected at add()');
  check('frag-reject', 0, nest.span('x1') === null && nest.span('x2') === null,
    'a rejected add() must leave no span behind');

  // wholly outside is a rejection, not a clamp to nothing
  check('frag-reject', 0, /entirely outside/.test(throws(() => nest.add({ id: 'x3', at: 0, deck: child, in: 9000, out: 12000 })) || ''),
    'a fragment wholly past the child must be rejected, not clamped to an empty span');
  check('frag-reject', 0, /finite/.test(throws(() => nest.add({ id: 'x4', at: 0, deck: child, in: NaN, out: 10 })) || ''),
    'a non-finite in/out must be rejected');

  nest.dispose(); parent.dispose(); child.dispose();
}

// ===========================================================================
// suite 6c — THE POINT OF THE WHOLE THING: the SAME deck quoted TWICE at two
//            different fragments in one arrangement. Timelines referencing
//            timelines: one stored session, two quotations, both correct.
// ===========================================================================
{
  const vr = sharedVR();
  const sink = newSink();
  const child = makeChild(vr, sink);
  const parent = createDeck({ clock: vr.clock, tickHost: vr.newHost(), range: [0, 40000], items: [] });
  const nest = createNest(parent, { toleranceMs: 5, hardSeekMs: 200 });

  const A = { at: 2000, in: 200, out: 1400 };     // opens INSIDE note 60
  const B = { at: 12000, in: 2400, out: 3600 };   // opens INSIDE notes 64+67
  const a = nest.add({ id: 'A', at: A.at, rate: 1, deck: child, in: A.in, out: A.out });
  const b = nest.add({ id: 'B', at: B.at, rate: 1, deck: child, in: B.in, out: B.out });

  check('frag-twice', 0, nest.quotationsOf(child).length === 2,
    'one deck must be reachable through both quotations');
  check('frag-twice', 0, String(child.range) === String([0, CHILD_END]),
    `two quotations must leave the child's range alone: ${child.range}`);
  check('frag-twice', 0, Math.abs(a.parentDur - 1200) < 1e-9 && Math.abs(b.parentDur - 1200) < 1e-9,
    `the two quotations must have their own lengths: ${a.parentDur} / ${b.parentDur}`);

  // each quotation seeks exactly into ITS OWN fragment
  for (const [id, Q] of [['A', A], ['B', B]]) {
    for (const u of [0, 1, 613.25, Q.out - Q.in]) {
      sink.asserts.length = 0;
      parent.seek(Q.at + u);
      const want = Q.in + u;
      check('frag-twice', id, Math.abs(child.position() - want) < 1e-9,
        `quotation ${id}: parent ${Q.at + u} -> child ${child.position()}, want ${want}`);
      check('frag-twice', id, String(heldNow(sink)) === String(heldAt(want)),
        `quotation ${id} @${want}: held [${heldNow(sink)}] !== [${heldAt(want)}]`);
      check('frag-twice', id, nest.present(id) === true && nest.present(id === 'A' ? 'B' : 'A') === false,
        `quotation ${id}: presence is not exclusive`);
    }
  }

  // BOTH PLAY CORRECTLY — the regression a naive "absence parks the child"
  // implementation fails: entering B makes A absent, and A's exit would drag
  // the shared child back to A's `out` and pause it.
  for (const [id, Q] of [['A', A], ['B', B]]) {
    sink.fires = 0; sink.firedAt.length = 0;
    parent.seek(Q.at);
    parent.play();
    let played = 0;
    // stop SHORT of the exit boundary: at at+parentDur the exit item fires and
    // the quotation is correctly over (that edge is asserted in frag-exit).
    for (let i = 0; i < 10; i++) { vr.advanceTo(vr.now() + 100); nest.servo(); played += 100; }
    check('frag-twice-play', id, child.playing(),
      `quotation ${id}: the shared child must be PLAYING inside its own quotation`);
    check('frag-twice-play', id, Math.abs(child.position() - (Q.in + played)) < 1e-6,
      `quotation ${id}: child at ${child.position()} after ${played} ms, want ${Q.in + played}`);
    const outside = sink.firedAt.filter((t) => t < Q.in || t > Q.out);
    check('frag-twice-play', id, outside.length === 0,
      `quotation ${id} fired events from OUTSIDE its fragment: ${outside}`);
    check('frag-twice-play', id, sink.firedAt.length > 0, `quotation ${id} fired nothing`);
    parent.pause();
  }

  // between the two quotations the child IS absent — parked at A's `out`
  parent.seek(6000);
  check('frag-twice', 'gap', nest.present('A') === false && nest.present('B') === false && !child.playing(),
    'between two quotations the child must be absent');
  check('frag-twice', 'gap', child.position() === A.out,
    `between quotations the child parks at the one it LEFT (A.out=${A.out}), got ${child.position()}`);

  // an OVERLAP of two quotations of one deck is arithmetic nonsense: rejected
  const ov = throws(() => nest.add({ id: 'C', at: A.at + 600, rate: 1, deck: child, in: 0, out: 800 }));
  check('frag-twice', 'overlap', /OVERLAPPING parent window/.test(ov || ''),
    `overlapping quotations of one deck must be rejected at add(), got: ${ov}`);
  // …but a non-overlapping THIRD quotation is fine, including a rate change
  const c = nest.add({ id: 'C', at: 25000, rate: 2, deck: child, in: 1000, out: 3000 });
  check('frag-twice', 'third', Math.abs(c.parentDur - 1000) < 1e-9,
    `a 2x quotation of a 2000 ms fragment must occupy 1000 ms of parent time, got ${c.parentDur}`);
  parent.seek(25000 + 400);
  check('frag-twice', 'third', Math.abs(child.position() - (1000 + 400 * 2)) < 1e-9,
    `rate composes inside a fragment: child ${child.position()}, want 1800`);

  nest.dispose(); parent.dispose(); child.dispose();
}

// ===========================================================================
// suite 7 — deck.setRange(): additive, and it must not disturb the CURSOR,
//           which is now the only positional reader in the library.
// ===========================================================================
{
  const vr = sharedVR();
  const sink = newSink();
  const deck = makeChild(vr, sink, [0, 4000]);
  const rangeRef = deck.range;

  check('setrange', 0, deck.durationMs === 4000, `durationMs ${deck.durationMs}`);
  deck.setRange([0, 9000]);
  check('setrange', 0, deck.durationMs === 5000 || deck.durationMs === 9000, `durationMs must follow the range: ${deck.durationMs}`);
  check('setrange', 0, deck.durationMs === 9000, `durationMs must be max-min = 9000, got ${deck.durationMs}`);
  check('setrange', 0, deck.range === rangeRef && String(deck.range) === String([0, 9000]),
    'deck.range must keep its IDENTITY across a range change (nested spans and HUDs hold it)');
  check('setrange', 0, deck.seek(8000) === 8000, 'the widened window must be seekable');
  check('setrange', 0, deck.rangeGen() === 1, `rangeGen ${deck.rangeGen()}`);

  // narrowing with the playhead outside: a REAL seek, so the state re-folds
  deck.seek(3500);
  sink.asserts.length = 0;
  deck.setRange([0, 1000]);
  check('setrange', 1, deck.position() === 1000, `narrowing must move the playhead into the window, got ${deck.position()}`);
  check('setrange', 1, String(heldNow(sink)) === String(heldAt(1000)),
    `narrowing must RE-FOLD (held [${heldNow(sink)}] !== reduce(<=1000) [${heldAt(1000)}])`);
  check('setrange', 1, sink.asserts.some((a) => a.reason === 'seek'),
    'the clamp must be a real seek (reduce + assertState), not a silent position patch');

  // items scheduled at runtime + setRange('auto') — the remixer's actual case
  deck.setRange([0, 9000]);
  deck.schedule({ at: 7200, kind: 'note', id: 'late-on', payload: { raw: [144, 40, 90] } });
  deck.schedule({ at: 7600, kind: 'note', id: 'late-off', payload: { raw: [128, 40, 0] } });
  deck.setRange('auto');
  check('setrange', 2, deck.lastAt() === 7600 && deck.range[1] === 7600,
    `setRange('auto') must derive from the furthest scheduled item (+tailMs): ${deck.range}`);
  deck.seek(7400);
  check('setrange', 2, deck.reduceAt('note', 7400).has(40),
    'an item scheduled AFTER construction must be in the fold at its position');

  check('setrange', 3, /max > min/.test(throws(() => deck.setRange([500, 500])) || ''), 'max <= min must be rejected');
  check('setrange', 3, /\[min, max\]/.test(throws(() => deck.setRange([1])) || ''), 'a malformed range must be rejected');
  check('setrange', 3, String(deck.range) === String([0, 7600]), 'a rejected setRange must not move the window');
  deck.dispose();
}

// --- the CURSOR arm: a range change + a runtime item insertion must not make
//     the O(1) positional reader wrong (it caches an index into the lane).
{
  const vr = sharedVR();
  const step = 100, n = 400;
  const items = [];
  for (let i = 0; i < n; i++) items.push({ at: i * step, kind: 'curve', payload: { v: i * step } });
  const deck = createDeck({
    clock: vr.clock, tickHost: vr.newHost(), items, range: [0, (n - 1) * step],
    adapters: {
      curve: {
        caps: { continuous: true, interpolate: true },
        actuate() {},
        interpolate: (a, b, u) => a.v + (b.v - a.v) * u,
      },
    },
  });
  const probe = (p) => deck.sampleAt('curve', p);
  const bad = [];
  for (const p of [0, 55, 1234.5, 20000, 39899]) if (Math.abs(probe(p) - p) > 1e-6) bad.push([p, probe(p)]);
  check('setrange-cursor', 0, bad.length === 0, `cursor wrong before the range change: ${JSON.stringify(bad)}`);
  const c0 = deck.cursorStats('curve').cursor.comparisons;

  deck.setRange([0, 60000]);                      // widen
  deck.schedule({ at: 45000, kind: 'curve', payload: { v: 45000 } });   // insert PAST the cached index
  deck.schedule({ at: 12345, kind: 'curve', payload: { v: 12345 } });   // insert BEHIND it
  deck.setRange('auto');

  const bad2 = [];
  for (const p of [0, 55, 12344, 12345, 12346, 20000, 39899, 41000, 44000, 45000, 46000]) {
    const want = p <= 39900 ? p : (p <= 45000 ? 39900 + (p - 39900) * (45000 - 39900) / (45000 - 39900) : 45000);
    const got = probe(p);
    if (Math.abs(got - Math.min(45000, p)) > 1e-6 && Math.abs(got - want) > 1e-6) bad2.push([p, got]);
  }
  check('setrange-cursor', 1, bad2.length === 0,
    `the cursor must stay exact across a range change + runtime insertions: ${JSON.stringify(bad2)}`);
  const st = deck.cursorStats('curve').cursor;
  check('setrange-cursor', 1, st.comparisons > c0 && st.comparisons - c0 < 400,
    `the cursor must still be a cursor, not a rescan: ${st.comparisons - c0} comparisons for 11 probes over ${n + 2} rows`);
  check('setrange-cursor', 1, deck.range[1] === 45000, `setRange('auto') after insertions: ${deck.range}`);

  // and the exported cursor is unchanged for a client's own lane
  const rows = [{ at: 0 }, { at: 10 }, { at: 20 }];
  const cur = createCursor(rows);
  cur.bracket(15);
  rows.splice(1, 0, { at: 5 });                    // a client mutating its own lane
  check('setrange-cursor', 2, cur.bracket(7).a.at === 5 && cur.bracket(7).b.at === 10,
    'createCursor must re-locate after its rows array is mutated under it');
  deck.dispose();
}

// ===========================================================================
// suite 8 — mediaMaster(): the media-element clock-master law, with the
//           NEGATIVE CONTROL that makes the replay-grid bug a measured fact
//           rather than a claim. Same virtual runtime; the element is faked.
// ===========================================================================
function fakeMedia(t0 = 0) {
  const o = { currentTime: t0, paused: false, ended: false, readyState: 4, seeking: false,
              rateWrites: 0, listeners: {} };
  Object.defineProperty(o, 'playbackRate', { get: () => 1, set: () => { o.rateWrites++; } });
  o.addEventListener = (k, f) => { (o.listeners[k] = o.listeners[k] || []).push(f); };
  o.removeEventListener = (k, f) => { o.listeners[k] = (o.listeners[k] || []).filter((x) => x !== f); };
  return o;
}
function burstDeck(vr, fired, folded) {
  const items = [];
  for (let i = 1; i <= 10; i++) items.push({ at: i * 1000, kind: 'cue', id: `C${i}`, payload: { id: `C${i}` } });
  return createDeck({
    clock: vr.clock, tickHost: vr.newHost(), items, range: [0, 20000],
    adapters: {
      cue: {
        // exactly replay-grid's cue kind: a cue is a note, never silently dropped
        caps: { catchUp: 'burst', seekable: true, reducible: true },
        actuate: (p) => fired.push(p.id),
        reduce: (ps) => new Set(ps.map((p) => p.id)),
        assertState: (s) => { folded.set = [...s].sort(); },
      },
    },
  });
}
{
  const vr = sharedVR();

  // --- NEGATIVE CONTROL: the block replay-grid used to run. A discontinuity
  //     answered with sync() leaves every skipped cue `pending`, and a
  //     catchUp:'burst' lane fires ALL of them on the next tick.
  const firedA = [], foldedA = {};
  const deckA = burstDeck(vr, firedA, foldedA);
  deckA.seek(500); deckA.play();
  vr.advanceTo(vr.now() + 200);
  const beforeA = firedA.length;
  deckA.sync(9500);                                  // <- the old code, verbatim
  vr.advanceTo(vr.now() + 300);
  const burstA = firedA.length - beforeA;
  check('media-master', 'control', burstA >= 8,
    `NEGATIVE CONTROL: sync() across a 9 s discontinuity must BURST the skipped cues (got ${burstA}, fired ${firedA.join(',')})`);
  deckA.pause(); deckA.dispose();

  // --- L2: the helper routes the same discontinuity to seek() -> FOLD
  const firedB = [], foldedB = {};
  const deckB = burstDeck(vr, firedB, foldedB);
  const el = fakeMedia(0.5);
  const events = [];
  const mm = mediaMaster(deckB, el, {
    anchorMs: 0, toleranceMs: 40, jumpMs: 250, stallMs: -1,
    stallPolicy: 'hold', autoPlayPause: true, onEvent: (e) => events.push(e),
  });
  deckB.seek(500); deckB.play();
  el.currentTime = 0.52; mm.tick();
  vr.advanceTo(vr.now() + 200);
  const beforeB = firedB.length;
  el.currentTime = 9.5;                              // AN EXTERNAL SCRUB
  mm.tick();
  const landedB = deckB.position();
  vr.advanceTo(vr.now() + 300);
  const burstB = firedB.length - beforeB;
  check('media-master', 'L2', burstB === 0,
    `a discontinuity must SEEK (fold), not sync (burst): ${burstB} cues burst — ${firedB.slice(beforeB).join(',')}`);
  check('media-master', 'L2', events.some((e) => e.reason === 'jump' && Math.abs(e.jumpMs) > 250),
    `the jump must be REPORTED, not silent: ${JSON.stringify(events)}`);
  check('media-master', 'L2', String(foldedB.set) === String(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9']),
    `the skipped cues must be FOLDED into the state: ${foldedB.set}`);
  check('media-master', 'L2', Math.abs(landedB - 9500) < 1e-6,
    `the vector must land exactly on the master: ${landedB}`);

  // --- L2 lower half: a SMALL error is drift and must be a sync (no re-fire)
  const beforeC = firedB.length;
  el.currentTime = (deckB.position() + 120) / 1000;
  const r = mm.tick();
  check('media-master', 'L2b', r.reason === 'sync' && firedB.length === beforeC,
    `a 120 ms error must sync and re-fire nothing (reason=${r && r.reason}, +${firedB.length - beforeC} fires)`);

  // --- L1: the master is NEVER nudged
  check('media-master', 'L1', el.rateWrites === 0, `the helper wrote playbackRate ${el.rateWrites} times`);

  // --- L4: the timeupdate backstop is installed on the master
  check('media-master', 'L4', (el.listeners.timeupdate || []).length === 1,
    `the hidden-tab timeupdate backstop must be attached exactly once (${(el.listeners.timeupdate || []).length})`);

  // --- L5: seeking / not-ready is not a clock
  el.seeking = true;
  check('media-master', 'L5', mm.tick() === null, 'a SEEKING element must not drive the vector');
  el.seeking = false;

  // --- L3 'hold': a stalled master stalls the playhead with the picture
  el.currentTime = deckB.position() / 1000;
  mm.tick(); mm.tick();
  check('media-master', 'L3-hold', !deckB.playing() && mm.stalled(),
    `a stalled master must pause the deck (playing=${deckB.playing()}, stalled=${mm.stalled()})`);
  check('media-master', 'L3-hold', events.some((e) => e.reason === 'stall'), 'the stall must be reported');
  mm.dispose();
  check('media-master', 'L4', (el.listeners.timeupdate || []).length === 0, 'dispose must detach the backstop');
  deckB.dispose();

  // --- L3 'release': N tiles — give the role up instead of holding
  const firedD = [], foldedD = {};
  const deckD = burstDeck(vr, firedD, foldedD);
  const el2 = fakeMedia(1.0);
  const evD = [];
  let released = 0;
  const mm2 = mediaMaster(deckD, () => ({ el: el2, pos: el2.currentTime * 1000, key: 'p1' }), {
    stallMs: -1, stallPolicy: 'release', autoPlayPause: false,
    onEvent: (e) => { evD.push(e); if (e.reason === 'release') released++; },
  });
  deckD.seek(1000); deckD.play();
  mm2.tick(); mm2.tick();
  check('media-master', 'L3-release', released === 1 && deckD.playing() && !mm2.driving(),
    `'release' must give up the role and let the client free-run (released=${released}, playing=${deckD.playing()})`);
  check('media-master', 'L3-release', evD.some((e) => e.reason === 'acquire'), 'acquiring the role is reported too');
  mm2.dispose(); deckD.pause(); deckD.dispose();
}

// ===========================================================================
// suite 9 — L4b: requestVideoFrameCallback.mediaTime as the servo's SENSOR.
//
// The measured reason this law is shaped the way it is (timeline/lab/
// run-sensor.mjs, real headless playback): read as a BARE NUMBER, `mediaTime`
// sits 0.22-0.90 frame AHEAD of `currentTime` — that is display latency, not
// error, and swapping sensors tick-by-tick on it made the servo strictly WORSE
// (corrections 9 -> 380 at a 20 ms band). Carried onto `now` through
// `expectedDisplayTime` — which is what the spec ships the pair for — the same
// playback corrects 365 -> 18 times at a 5 ms band. So the law is: CARRY IT,
// and fall back to currentTime whenever the frame sample cannot be trusted.
// ===========================================================================
function fakeVideo(t0 = 0) {
  const o = fakeMedia(t0);
  o.frameCbs = [];
  o.requestVideoFrameCallback = (cb) => { o.frameCbs.push(cb); return o.frameCbs.length; };
  /** deliver one presented frame: mediaTime seconds, shown at `edtOffset` ms
   *  from now in the performance.now() timebase (rVFC's expectedDisplayTime is
   *  in the FUTURE when the callback runs — that is the whole point). */
  o.presentFrame = (mediaTime, edtOffset = 0) => {
    const cbs = o.frameCbs.splice(0);
    const now = performance.now();
    for (const cb of cbs) cb(now, { mediaTime, expectedDisplayTime: now + edtOffset,
      presentationTime: now, presentedFrames: 1, width: 4, height: 4 });
  };
  return o;
}
{
  const vr = sharedVR();
  const anchor = 0;

  // --- N1: NO rVFC (Firefox < 132, every <audio>) — nothing changes at all
  {
    const fired = [], folded = {};
    const deck = burstDeck(vr, fired, folded);
    const el = fakeMedia(1.0);                        // plain element: no rVFC
    const mm = mediaMaster(deck, el, { anchorMs: anchor, toleranceMs: 40, stallMs: -1 });
    deck.seek(1000);
    const r = mm.tick();
    check('rvfc', 'N1', mm.stats().rvfc.supported === false && mm.stats().rvfc.frames === 0,
      `an element without requestVideoFrameCallback must report supported=false (${JSON.stringify(mm.stats().rvfc)})`);
    check('rvfc', 'N1', Math.abs(r.pos - 1000) < 1e-9,
      `…and the position must be exactly anchor + currentTime*1000 (${r.pos})`);
    check('rvfc', 'N1', mm.sensorStats().n === 0, 'and no disagreement rows are collected');
    mm.dispose(); deck.dispose();
  }

  // --- N2: a fresh frame IS carried onto now, and the servo sees mediaTime
  {
    const fired = [], folded = {};
    const deck = burstDeck(vr, fired, folded);
    const el = fakeVideo(1.0);
    const mm = mediaMaster(deck, el, { anchorMs: anchor, toleranceMs: 5, stallMs: -1 });
    deck.seek(1000);
    mm.tick();                                        // registers the callback
    check('rvfc', 'N2', mm.stats().rvfc.supported === true && el.frameCbs.length === 1,
      `a video element must get exactly one armed frame callback (${el.frameCbs.length})`);
    el.presentFrame(1.020, 0);                        // the frame on the glass is 20 ms ahead
    const r = mm.tick();
    check('rvfc', 'N2', r.pos > 1015 && r.pos < 1030,
      `the servo must read the PRESENTED frame's mediaTime carried onto now (~1020, got ${r.pos})`);
    check('rvfc', 'N2', mm.stats().rvfc.used >= 1 && mm.stats().rvfc.frames === 1,
      `the frame sample must be USED and counted (${JSON.stringify(mm.stats().rvfc)})`);
    check('rvfc', 'N2', el.frameCbs.length === 1, 'the one-shot callback must be re-armed for the next frame');
    const s = mm.sensorStats();
    check('rvfc', 'N2', s.raw.n >= 1 && Math.abs(s.raw.signedMax - 20) < 3 && Math.abs(s.carried.signedMax - 20) < 3,
      `both the RAW and the CARRIED disagreement must be recorded (${JSON.stringify({ raw: s.raw.signedMax, carried: s.carried.signedMax })})`);
    // and pos() agrees with tick() without touching the accounting
    const usedBefore = mm.stats().rvfc.used;
    check('rvfc', 'N2', Math.abs(mm.pos() - r.pos) < 3 && mm.stats().rvfc.used === usedBefore,
      'pos() must apply the same correction and change no counter');
    mm.dispose(); deck.dispose();
  }

  // --- N3: a STALE frame sample is not a sample. This is the hidden-tab and
  //     stalled-decoder path: rVFC stops, `timeupdate` does not.
  {
    const fired = [], folded = {};
    const deck = burstDeck(vr, fired, folded);
    const el = fakeVideo(1.0);
    const mm = mediaMaster(deck, el, { anchorMs: anchor, toleranceMs: 5, stallMs: -1, rvfcStaleMs: -1 });
    deck.seek(1000);
    mm.tick(); el.presentFrame(1.020, 0);
    const r = mm.tick();
    check('rvfc', 'N3', Math.abs(r.pos - 1000) < 1e-9 && mm.stats().rvfc.stale >= 1 && mm.stats().rvfc.used === 0,
      `a stale frame must fall back to currentTime and be counted (pos ${r.pos}, ${JSON.stringify(mm.stats().rvfc)})`);
    mm.dispose(); deck.dispose();
  }

  // --- N4: a frame sample from BEFORE a discontinuity must never be carried
  //     across it — otherwise the sensor could change which branch L2 takes.
  {
    const fired = [], folded = {};
    const deck = burstDeck(vr, fired, folded);
    const el = fakeVideo(1.0);
    const mm = mediaMaster(deck, el, { anchorMs: anchor, toleranceMs: 5, jumpMs: 250, stallMs: -1 });
    deck.seek(1000);
    mm.tick(); el.presentFrame(1.020, 0); mm.tick();
    el.currentTime = 9.5;                             // AN EXTERNAL SCRUB; the last frame is stale news
    const r = mm.tick();
    check('rvfc', 'N4', mm.stats().rvfc.rejected >= 1,
      `a frame sample disagreeing by more than jumpMs must be REJECTED (${JSON.stringify(mm.stats().rvfc)})`);
    check('rvfc', 'N4', r.reason === 'jump' && Math.abs(r.pos - 9500) < 1e-9,
      `…and L2 must still see the raw currentTime and SEEK there (reason ${r.reason}, pos ${r.pos})`);
    check('rvfc', 'N4', String(folded.set) === String(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9']),
      `…folding the skipped cues exactly as before the sensor changed: ${folded.set}`);
    mm.dispose(); deck.dispose();
  }

  // --- N5/N6: both opt-outs really opt out (Remotion excludes VFR sources)
  for (const [label, opts] of [['N5', { useRvfc: false }], ['N6', { variableFps: true }]]) {
    const fired = [], folded = {};
    const deck = burstDeck(vr, fired, folded);
    const el = fakeVideo(1.0);
    const mm = mediaMaster(deck, el, { anchorMs: anchor, toleranceMs: 5, stallMs: -1, ...opts });
    deck.seek(1000);
    mm.tick();
    el.presentFrame(1.020, 0);
    const r = mm.tick();
    check('rvfc', label, el.frameCbs.length === 0 && mm.stats().rvfc.frames === 0 &&
                         mm.stats().rvfc.supported === false && Math.abs(r.pos - 1000) < 1e-9,
      `${JSON.stringify(opts)} must register NO callback and leave the currentTime path untouched (pos ${r.pos}, cbs ${el.frameCbs.length})`);
    mm.dispose(); deck.dispose();
  }
}

// ===========================================================================
// suite 10 — A QUOTATION IS A VALUE, and a SCORE ROUND-TRIPS. The C10 property:
//            an arrangement, serialised to JSON, reloaded in a FRESH RUNTIME
//            that has only the bytes and a resolver, plays IDENTICALLY.
//
// "Identically" is not a vibe: the trace below records, at every step of a
// fixed script, the parent position, both children's positions, both children's
// held-note sets, and the full ordered list of every event either child fired.
// Two traces are compared as strings.
// ===========================================================================
const MARKS_DEF = [
  { id: 'chorus-3', at: 900, label: 'Chorus 3' },
  { id: 'chorus-4', at: 2500, label: 'Chorus 4' },
  { id: 'coda', at: 3600, label: 'Coda' },
];

/** the fixed script both runtimes run — seeks in and out of every span, plays
 *  across boundaries, and ends by scrubbing backwards (the case that found the
 *  park bug in rule 7c). */
const SCRIPT = [
  { seek: 0 }, { seek: 1500 }, { seek: 2000 }, { seek: 2600 }, { play: 900 },
  { seek: 12000 }, { seek: 12400 }, { play: 1200 }, { seek: 30000 },
  { seek: 6000 }, { seek: 2100 }, { play: 400 }, { seek: 0 }, { seek: 25400 },
];

function runScript(vr, parent, nest, kids) {
  const trace = [];
  const snap = (tag) => trace.push([tag,
    +parent.position().toFixed(4),
    ...kids.map((k) => +k.deck.position().toFixed(4)),
    ...kids.map((k) => heldNow(k.sink).join('.')),
    ...kids.map((k) => k.sink.fires),
    ...kids.map((k) => k.sink.firedAt.map((t) => +t.toFixed(3)).join('.')),
    ...nest.spans().map((sp) => `${sp.id}:${sp.present}:${sp.enters}/${sp.exits}`),
  ].join('|'));
  snap('init');
  for (const step of SCRIPT) {
    if (step.seek !== undefined) { parent.seek(step.seek); snap(`seek${step.seek}`); }
    else {
      parent.play();
      for (let i = 0; i < step.play / 100; i++) { vr.advanceTo(vr.now() + 100); nest.servo(); }
      parent.pause();
      snap(`play${step.play}`);
    }
  }
  return trace;
}

/** one arrangement, built two ways: by hand (A) or from a score (B). */
function arrangement(make) {
  const vr = sharedVR();
  const sinks = [newSink(), newSink()];
  const alpha = makeChild(vr, sinks[0], [0, CHILD_END], { marks: MARKS_DEF });
  const beta = makeChild(vr, sinks[1], [0, CHILD_END], { marks: MARKS_DEF });
  refDeck(alpha, 'alpha'); refDeck(beta, 'beta');
  const parent = createDeck({ clock: vr.clock, tickHost: vr.newHost(), range: [0, 40000], items: [] });
  const nest = createNest(parent, { toleranceMs: 5, hardSeekMs: 200, resolve: (r) => ({ alpha, beta }[r]) });
  const kids = [{ deck: alpha, sink: sinks[0] }, { deck: beta, sink: sinks[1] }];
  make({ nest, alpha, beta, parent });
  return { vr, parent, nest, kids, alpha, beta,
    dispose() { nest.dispose(); parent.dispose(); alpha.dispose(); beta.dispose(); } };
}

{
  // --- A: build by hand, mixing every address form and a master span --------
  const A = arrangement(({ nest, alpha, beta }) => {
    nest.add({ id: 'q1', at: 2000, rate: 1, deck: alpha, in: 200, out: 1400,
      provenance: { source: 'ERR 1965-03-12 broadcast', asserter: 'kj', tier: 0,
        certainty: [{ locus: 'name', cert: 0.95, resp: 'kj', note: 'this is the Kurenniemi segment' },
                    { locus: 'start', cert: 0.6, resp: 'kj', note: 'tape splice, +/- 2 s' }] } });
    nest.add({ id: 'q2', at: 12000, rate: 1, deck: alpha, in: { mark: 'chorus-4' }, out: 3600 });
    nest.add({ id: 'q3', at: 25000, rate: 2, deck: beta, in: 1000, out: 3000,
      provenance: { source: 'IA rip, uploader unknown', asserter: null, tier: 1, method: 'catmull-rom',
        certainty: [{ locus: 'name', cert: 0.4, note: 'attribution is an aggregator claim' }] } });
  });

  const s = A.nest.toScore({ id: 'ekstra-1', meta: { title: 'a score that quotes traces' } });
  check('score-value', 0, s.quotations.length === 3 && s.id === 'ekstra-1',
    `toScore must yield one quotation per span: ${JSON.stringify(s).slice(0, 120)}`);
  check('score-value', 0, s.quotations.every(isQuotation), 'every entry must be a quotation value');
  check('score-value', 0, String(scoreRefs(s).sort()) === 'alpha,beta',
    `a score must name its sources: ${scoreRefs(s)}`);
  // a VALUE: frozen, no live object anywhere, JSON-total
  check('score-value', 0, Object.isFrozen(s) && Object.isFrozen(s.quotations[0]), 'a quotation/score must be frozen');
  check('score-value', 0, (() => { try { s.quotations[0].at = 9; } catch { return true; } return s.quotations[0].at === 2000; })(),
    'a quotation must not be mutable');
  const json = scoreToJSON(s);
  check('score-value', 0, !/\[object|function|undefined/.test(json) && json.length > 200,
    'a score must serialise with no live reference in it');
  check('score-value', 0, /"mark":"chorus-4"/.test(json) && /"wasAt":2500/.test(json),
    `a mark address must survive serialisation as a MARK, stamped with what it resolved to: ${json}`);
  check('score-value', 0, /"locus":"start"/.test(json) && /"cert":0.6/.test(json),
    "TEI @locus must survive serialisation — boundary uncertainty is not identity uncertainty");
  // equality is structural, not referential
  const s2 = parseScore(json);
  check('score-value', 0, quotationEquals(s.quotations[0], s2.quotations[0]) &&
    s.quotations[0] !== s2.quotations[0], 'a re-parsed quotation must be EQUAL and not identical');
  check('score-value', 0, scoreToJSON(s2) === json, 'parse(serialise(x)) must be a fixed point');
  check('score-value', 0, !quotationEquals(s.quotations[0], s.quotations[1]), 'different quotations must not compare equal');
  check('score-value', 0, quotationEquals(quotation({ ref: 'a', at: 1, rate: 1, in: 2, out: 3 }),
    quotation({ in: 2, rate: 1, out: 3, at: 1, ref: 'a' })), 'quotation equality must be key-order-insensitive');
  check('score-value', 0, /identity/i.test(throws(() => quotation({ at: 0 })) || ''),
    'a quotation without a ref must be rejected — identity is not optional');

  // --- B: a FRESH RUNTIME with only the JSON and a resolver -----------------
  const traceA = runScript(A.vr, A.parent, A.nest, A.kids);
  let loaded = null;
  const B = arrangement(({ nest, alpha, beta }) => {
    // the ONLY thing crossing the boundary is `json` and this resolver.
    loaded = loadScore(JSON.parse(json), (ref) => ({ alpha, beta }[ref]), { nest });
  });
  check('score-load', 0, loaded.spans.length === 3 && loaded.report.refs.length === 2,
    `loadScore must instantiate every quotation: ${JSON.stringify(loaded.report)}`);
  const traceB = runScript(B.vr, B.parent, B.nest, B.kids);

  check('score-roundtrip', 0, traceA.length === traceB.length, `trace lengths differ: ${traceA.length} vs ${traceB.length}`);
  let firstDiff = -1;
  for (let i = 0; i < Math.min(traceA.length, traceB.length); i++) if (traceA[i] !== traceB[i]) { firstDiff = i; break; }
  check('score-roundtrip', 0, firstDiff === -1,
    firstDiff < 0 ? '' : `THE C10 PROPERTY FAILED at step ${firstDiff}:\n  A: ${traceA[firstDiff]}\n  B: ${traceB[firstDiff]}`);
  if (VERBOSE) console.log(`      round-trip trace: ${traceA.length} steps, ${traceA.join('\n').length} chars, identical`);

  // and the reloaded arrangement re-serialises to the SAME score
  check('score-roundtrip', 0, scoreToJSON(B.nest.toScore({ id: 'ekstra-1', meta: s.meta })) === json,
    'toScore(loadScore(x)) must be x — the round trip is a fixed point, not an approximation');

  // a resolver that cannot supply a ref fails LOUDLY, naming what it needed
  const miss = throws(() => loadScore(JSON.parse(json), () => null, { parent: B.parent }));
  check('score-load', 1, /alpha/.test(miss || '') && /resolve/.test(miss || ''),
    `an unresolvable ref must name the refs the score needs: ${miss}`);
  check('score-load', 1, /resolve/.test(throws(() => loadScore(s, undefined, { parent: B.parent })) || ''),
    'loadScore without a resolver must be rejected — without one a score is just bytes');
  check('score-load', 1, /version/.test(throws(() => parseScore({ v: 99, quotations: [] })) || ''),
    'an unknown score version must be rejected, not guessed at');
  check('score-load', 1, /identity/i.test(throws(() => {
    const orphan = makeChild(A.vr, newSink());
    const n = createNest(A.parent, { kind: 'orphan-span' });
    n.add({ id: 'z', at: 35000, deck: orphan }); n.toScore();
  }) || ''), 'toScore must refuse to serialise a deck with no identity rather than invent one');

  A.dispose(); B.dispose();
}

// ===========================================================================
// suite 11 — MARKS: content addressing, and the case that is the whole reason
//            for it — A MARK THAT MOVED. The source is re-cut (600 ms of
//            restored leader spliced in front); the score still lands on the
//            music. The numbers it would otherwise have stored do not.
// ===========================================================================
{
  const SHIFT = 600;
  const vr = sharedVR();
  const sinkV1 = newSink();
  const v1 = makeChild(vr, sinkV1, [0, CHILD_END], { marks: MARKS_DEF });
  refDeck(v1, 'tape-A');
  check('marks', 0, marksOf(v1).length === 3 && marksOf(v1)[0].id === 'chorus-3',
    `a deck's mark lane must be readable as {id, at, label}: ${JSON.stringify(marksOf(v1))}`);

  const p1 = createDeck({ clock: vr.clock, tickHost: vr.newHost(), range: [0, 40000], items: [] });
  const n1 = createNest(p1, { toleranceMs: 5 });
  const spM = n1.add({ id: 'byMark', at: 5000, rate: 1, deck: v1, in: { mark: 'chorus-3' }, out: { mark: 'coda' } });
  const spN = n1.add({ id: 'byNumber', at: 15000, rate: 1, deck: v1, in: 900, out: 3600 });
  check('marks', 0, String(n1.fragment('byMark')) === String([900, 3600]),
    `a mark address must resolve to the mark's position: ${n1.fragment('byMark')}`);
  check('marks', 0, String(n1.fragment('byMark')) === String(n1.fragment('byNumber')),
    'a mark and the number it resolves to must be the same quotation TODAY');
  check('marks', 0, n1.marks('byMark').in.matchedBy === 'id' && n1.marks('byNumber') === null,
    'only a mark address gets a mark report');
  check('marks', 0, /does not resolve/.test(throws(() => n1.add({ id: 'x', at: 30000, deck: v1, in: { mark: 'nope' }, out: 3000 })) || ''),
    'an unresolvable mark must fail at add(), naming the marks that do exist');
  check('marks', 0, marksOf(v1).length === 3 && String(v1.range) === String([0, CHILD_END]),
    'reading marks must not disturb the deck');
  // the mark's musical truth, captured before the re-cut
  const musicAtMark = heldAt(900);
  const json = scoreToJSON(n1.toScore({ id: 'recut-proof' }));
  check('marks', 0, /"wasAt":900/.test(json), `the score must record what the mark resolved to when written: ${json}`);

  // --- THE RE-CUT: 600 ms of restored leader spliced in front. Marks moved
  //     WITH the music, because a mark is an event on the same lane.
  const vr2 = sharedVR();
  const sinkV2 = newSink();
  const v2 = makeChild(vr2, sinkV2, [0, CHILD_END + SHIFT], { shift: SHIFT, marks: MARKS_DEF });
  refDeck(v2, 'tape-A');
  const p2 = createDeck({ clock: vr2.clock, tickHost: vr2.newHost(), range: [0, 40000], items: [] });
  const { nest: n2, report } = loadScore(JSON.parse(json), () => v2, { parent: p2, toleranceMs: 5 });

  check('marks-moved', 0, String(n2.fragment('byMark')) === String([900 + SHIFT, 3600 + SHIFT]),
    `the mark-addressed quotation must FOLLOW the re-cut: ${n2.fragment('byMark')}`);
  check('marks-moved', 0, String(n2.fragment('byNumber')) === String([900, 3600]),
    `the number-addressed quotation must NOT follow it (that is the point): ${n2.fragment('byNumber')}`);
  check('marks-moved', 0, report.movedMarks.length === 2 && /moved/.test(report.note || ''),
    `a moved mark must be REPORTED, never silently followed: ${JSON.stringify(report.movedMarks)}`);
  check('marks-moved', 0, report.movedMarks.every((m) => m.moved.deltaMs === SHIFT),
    `the report must say how far it moved: ${JSON.stringify(report.movedMarks.map((m) => m.moved))}`);

  // and now the sentence the whole mechanism exists for:
  p2.seek(5000);                                     // entry of the mark quotation
  const heldByMark = heldNow(sinkV2);
  p2.seek(15000);                                    // entry of the number quotation
  const heldByNumber = heldNow(sinkV2);
  check('marks-moved', 0, String(heldByMark) === String(musicAtMark) && musicAtMark.length > 0,
    `the MARK-addressed quotation opens on the same music as before the re-cut: [${heldByMark}] vs [${musicAtMark}]`);
  check('marks-moved', 0, String(heldByNumber) !== String(musicAtMark),
    `the NUMBER-addressed quotation opens on DIFFERENT music after the re-cut ([${heldByNumber}]) — ` +
    'if this ever passes trivially the test has stopped proving anything');
  check('marks-moved', 0, String(heldByNumber) === String(heldAt(900 - SHIFT)),
    `…and specifically on whatever now sits at the old number: [${heldByNumber}]`);

  n1.dispose(); p1.dispose(); v1.dispose(); n2.dispose(); p2.dispose(); v2.dispose();
}

// ===========================================================================
// suite 12 — RULE 9: caps.absentState / silence(). A quotation parked at its
//            edge asserts whatever `in`/`out` cut, so a MIDI actuator holds an
//            edge note for the whole time the span is absent. An adapter may
//            declare how to be silent; the nest never learns what a note is.
// ===========================================================================
{
  const IN = 700, OUT = 2800, AT = 5000;            // both edges cut held notes
  const mk = (opts) => {
    const vr = sharedVR();
    const sink = newSink();
    const silenced = [];
    const child = makeChild(vr, sink, [0, CHILD_END], {
      ...opts,
      silence: opts.withSilence ? (info) => { silenced.push(info); sink.live = new Set(); } : undefined,
    });
    const parent = createDeck({ clock: vr.clock, tickHost: vr.newHost(), range: [0, 40000], items: [] });
    const nest = createNest(parent, { toleranceMs: 5 });
    nest.add({ id: 'q', at: AT, rate: 1, deck: child, in: IN, out: OUT });
    return { vr, sink, child, parent, nest, silenced,
      dispose() { nest.dispose(); parent.dispose(); child.dispose(); } };
  };

  // --- NEGATIVE CONTROL: no declaration -> today's behaviour, unchanged.
  const hold = mk({});
  hold.parent.seek(AT + (OUT - IN) + 500);
  check('absent', 'hold', heldAt(OUT).length > 0 && String(heldNow(hold.sink)) === String(heldAt(OUT)),
    `default absentState must HOLD the edge state (a video frame wants exactly this): [${heldNow(hold.sink)}]`);
  check('absent', 'hold', hold.nest.absent('q') === null || hold.nest.absent('q').mode === 'hold',
    'an adapter that declared nothing must be reported as holding');
  hold.dispose();

  // --- the declaration
  const sil = mk({ absentState: 'silence', withSilence: true });
  sil.parent.seek(AT + 400);                        // inside: normal assertion
  check('absent', 'silence', String(heldNow(sil.sink)) === String(heldAt(IN + 400)) && sil.silenced.length === 0,
    `inside the quotation nothing is silenced: [${heldNow(sil.sink)}]`);
  sil.parent.seek(AT + (OUT - IN) + 500);           // past `out`
  check('absent', 'silence', sil.silenced.length === 1 && sil.silenced[0].kind === 'note',
    `going absent must call the adapter's silence() exactly once: ${JSON.stringify(sil.silenced)}`);
  check('absent', 'silence', sil.silenced[0].pos === OUT && sil.silenced[0].reason === 'absent' &&
    sil.silenced[0].span === 'q' && sil.silenced[0].in === IN && sil.silenced[0].out === OUT,
    `silence() must be told where and why, and for which quotation: ${JSON.stringify(sil.silenced[0])}`);
  check('absent', 'silence', heldNow(sil.sink).length === 0 && heldAt(OUT).length > 0,
    `a quotation whose \`out\` cuts a held note must not hold it while absent: [${heldNow(sil.sink)}]`);
  check('absent', 'silence', sil.child.position() === OUT,
    'silencing must not move the child off its park (absence is still a POSITION)');
  const rep = sil.nest.absent('q');
  check('absent', 'silence', rep.mode === 'silence' && String(rep.kinds) === 'note' && rep.degraded.length === 0,
    `the absent report must name the lanes silenced: ${JSON.stringify(rep)}`);
  check('absent', 'silence', sil.nest.driftStats().spans[0].silences === 1,
    'driftStats must carry the silence count');

  // idempotent: staying absent must not re-silence every tick
  sil.parent.seek(AT + (OUT - IN) + 900);
  sil.parent.seek(AT + (OUT - IN) + 1300);
  check('absent', 'silence', sil.silenced.length === 1,
    `staying absent must not re-fire silence(): ${sil.silenced.length} calls`);
  // …but leaving through the OTHER edge is a different park, and re-silences
  sil.parent.seek(AT - 500);
  check('absent', 'silence', sil.silenced.length === 2 && sil.silenced[1].pos === IN,
    `parking at the other edge must re-ask: ${JSON.stringify(sil.silenced.map((s) => s.pos))}`);
  // SELF-HEALING: re-entering re-folds and re-asserts, with no help from rule 9
  sil.parent.seek(AT + 400);
  check('absent', 'silence', String(heldNow(sil.sink)) === String(heldAt(IN + 400)),
    `re-entering must restore the state by the ordinary fold: [${heldNow(sil.sink)}]`);
  sil.dispose();

  // --- a declaration the adapter cannot back is a DEGRADATION, out loud
  const lie = mk({ absentState: 'silence' });        // declares it, implements nothing
  lie.parent.seek(AT + (OUT - IN) + 500);
  const lr = lie.nest.absent('q');
  check('absent', 'degraded', lr.degraded.length === 1 && /implements no silence\(\)/.test(lr.degraded[0].reason),
    `declaring absentState with no silence() must be reported: ${JSON.stringify(lr)}`);
  check('absent', 'degraded', lr.mode === 'hold' && String(heldNow(lie.sink)) === String(heldAt(OUT)),
    'a degraded silence must fall back to holding, not to guessing');
  check('absent', 'degraded', lie.nest.driftStats().spans[0].absentDegradations === 1,
    'the degradation must reach driftStats');
  lie.dispose();

  // --- an unknown mode is also a degradation, never a silent no-op
  const weird = mk({ absentState: 'mute-ish' });
  weird.parent.seek(AT + (OUT - IN) + 500);
  check('absent', 'unknown', /not a mode this nest knows/.test((weird.nest.absent('q').degraded[0] || {}).reason || ''),
    `an unknown absentState must be reported: ${JSON.stringify(weird.nest.absent('q'))}`);
  weird.dispose();
}

// ===========================================================================
// suite 13 — PROVENANCE THAT SURVIVES THE DOOR: three carriers, validated
//            against published field names.
// ===========================================================================
{
  const vr = sharedVR();
  const sink = newSink();
  const child = makeChild(vr, sink, [0, CHILD_END], { marks: MARKS_DEF });
  refDeck(child, 'kurenniemi-1972');
  const parent = createDeck({ clock: vr.clock, tickHost: vr.newHost(), range: [0, 40000], items: [] });
  const nest = createNest(parent, { toleranceMs: 5 });
  nest.add({ id: 'A', at: 5000, rate: 1, deck: child, in: { mark: 'chorus-3' }, out: { mark: 'coda' },
    provenance: { source: 'Internet Archive rip; uploader unknown', asserter: 'kj', tier: 0,
      certainty: [{ locus: 'name', cert: 0.85, resp: 'kj', note: 'attribution is an aggregator claim' },
                  { locus: 'start', cert: 0.5, resp: 'kj', note: 'tape splice', widthMs: 2000 }] } });
  nest.add({ id: 'B', at: 20000, rate: 2, deck: child, in: 200, out: 800,
    provenance: { source: 'restored', tier: 1, method: 'catmull-rom' } });

  // --- (a) C2PA-shaped ----------------------------------------------------
  const c = exportProvenance(nest, { carrier: 'c2pa' });
  check('export-c2pa', 0, c.validation.ok, `C2PA shape must validate: ${JSON.stringify(c.validation.errors)}`);
  check('export-c2pa', 0, c.validation.seen.temporal >= 3 && c.validation.seen.ratings >= 2,
    `there must be real TEMPORAL regions and real reviewRatings: ${JSON.stringify(c.validation.seen)}`);
  const act = c.doc.assertions[0].data.actions[0];
  check('export-c2pa', 0, c.doc.assertions[0].label === 'c2pa.actions.v2' && Array.isArray(act.changes),
    'the actions assertion must carry Action.changes (§18.15.4.6)');
  const roi = act.changes[0].region[0];
  check('export-c2pa', 0, roi.type === 'temporal' && roi.time.type === 'npt' &&
    roi.time.start === npt(5000) && roi.time.end === npt(5000 + 2700),
    `the region must be a temporal npt range over PARENT time: ${JSON.stringify(roi)}`);
  check('export-c2pa', 0, typeof roi.time.start === 'string' && typeof roi.time.end === 'string',
    'npt start/end are tstr in the CDDL — numbers will not round-trip through c2pa-rs');
  check('export-c2pa', 0, act.digitalSourceType.endsWith('/digitalCapture') &&
    c.doc.assertions[0].data.actions[1].digitalSourceType.endsWith('/algorithmicallyEnhanced'),
    `the IPTC digitalSourceType must follow §5b's tier: ${act.digitalSourceType}`);
  const bnd = act.changes.find((x) => x.name === 'A:start');
  check('export-c2pa', 0, bnd && bnd.region[0].time.start === npt(5000 - 2000) && bnd.role === 'c2pa.areaOfInterest',
    `TEI @locus='start' must become its own region — C2PA cannot say WHICH part of a claim a rating qualifies: ${JSON.stringify(bnd)}`);
  check('export-c2pa', 0, toReviewRating(0.85) === 4 && toReviewRating(0) === 1 && toReviewRating(1) === 5,
    'confidence must map onto the int-range 1..5 rating-map');
  const ing = c.doc.assertions.find((a) => a.label === 'c2pa.ingredient.v3');
  check('export-c2pa', 0, ing && ing.data.metadata.regionOfInterest.region[0].time.start === npt(900),
    `§18.16.13 (normative): the portion of the INGREDIENT used must be a regionOfInterest in the SOURCE's domain: ${JSON.stringify(ing && ing.data.metadata.regionOfInterest)}`);
  check('export-c2pa', 0, JSON.stringify(act.parameters).includes('"locus":"start"'),
    'the unquantised TEI model must survive verbatim in our namespace, since no C2PA field holds it');
  check('export-c2pa', 0, c.caveats.length >= 4 && c.caveats.some((x) => /NOT SIGNED/.test(x)) &&
    c.caveats.some((x) => /verify-site|conformance/.test(x)),
    'every export must carry what it is NOT: unsigned, and unreadable by any shipping tool');

  // negative control: the validator must actually reject a wrong spelling
  const wrong = JSON.parse(JSON.stringify(c.doc));
  wrong.assertions[0].data.actions[0].changes[0].region[0].type = 'time';
  wrong.assertions[0].data.actions[0].regionOfInterest = {};
  const v2 = validateProvenance(wrong, 'c2pa');
  check('export-c2pa', 1, !v2.ok && v2.errors.length >= 2,
    `NEGATIVE CONTROL: a misspelled range type and a misplaced field must FAIL: ${JSON.stringify(v2)}`);
  const wrong2 = JSON.parse(JSON.stringify(c.doc));
  wrong2.assertions[0].metadata.reviewRatings[0].value = 7;
  check('export-c2pa', 1, !validateProvenance(wrong2, 'c2pa').ok, 'a rating outside 1..5 must fail');

  // --- (b) EXT-X-DATERANGE ------------------------------------------------
  const h = exportProvenance(nest, { carrier: 'hls', anchor: '2026-08-28T09:00:00.000Z' });
  check('export-hls', 0, h.validation.ok, `HLS tags must validate: ${JSON.stringify(h.validation.errors)}`);
  check('export-hls', 0, h.tags.length === 2 && h.tags.every((t) => t.startsWith('#EXT-X-DATERANGE:')),
    `one tag per claim: ${h.tags.length}`);
  check('export-hls', 0, /ID="A",CLASS="org\.elektron\.timeline\.quotation",START-DATE="2026-08-28T09:00:05\.000Z"/.test(h.tags[0]),
    `START-DATE is WALL CLOCK (anchor + parent position): ${h.tags[0]}`);
  check('export-hls', 0, /X-ORG-ELEKTRON-REF="kurenniemi-1972"/.test(h.tags[0]) &&
    /X-ORG-ELEKTRON-IN=0\.9/.test(h.tags[0]) && /X-ORG-ELEKTRON-CERT-START=0\.5/.test(h.tags[0]),
    `client attributes must be reverse-DNS X- and carry the TEI loci: ${h.tags[0]}`);
  check('export-hls', 0, /DURATION=2\.7/.test(h.tags[0]), `DURATION is decimal SECONDS of parent time: ${h.tags[0]}`);
  check('export-hls', 0, !validateProvenance(['#EXT-X-DATERANGE:CLASS="x",X_BAD=1'], 'hls').ok,
    'NEGATIVE CONTROL: a missing ID and a non-conforming client attribute must fail');
  check('export-hls', 0, /anchor/.test(throws(() => exportProvenance(nest, { carrier: 'hls', anchor: 'not-a-date' })) || ''),
    'HLS export without a real wall-clock anchor must be rejected, not defaulted');

  // --- (c) OTIO-shaped ----------------------------------------------------
  const o = exportProvenance(nest, { carrier: 'otio', title: 'ekstra-1' });
  check('export-otio', 0, o.validation.ok, `OTIO shape must validate: ${JSON.stringify(o.validation.errors)}`);
  const track = o.doc.tracks.children[0];
  const clips = track.children.filter((x) => x.OTIO_SCHEMA === 'Clip.2');
  check('export-otio', 0, o.validation.seen.clips === 2 && track.children.some((x) => x.OTIO_SCHEMA === 'Gap.1'),
    `two clips and a real Gap between them: ${track.children.map((x) => x.OTIO_SCHEMA)}`);
  check('export-otio', 0, clips[0].source_range.start_time.value === 900 && clips[0].source_range.start_time.rate === 1000,
    `source_range is in the SOURCE's domain at rate 1000 (ms — no 23.976 rounding class exists here): ${JSON.stringify(clips[0].source_range)}`);
  check('export-otio', 0, clips[0].media_reference.target_url === 'elektron:deck/kurenniemi-1972',
    'the media reference must name the deck by the same ref a score uses');
  check('export-otio', 0, clips[1].effects[0].OTIO_SCHEMA === 'LinearTimeWarp.1' && clips[1].effects[0].time_scalar === 2,
    `a rate != 1 must become a LinearTimeWarp: ${JSON.stringify(clips[1].effects)}`);
  check('export-otio', 0, clips[0].metadata['org.elektron.timeline'].certainty.some((x) => x.locus === 'start'),
    'the namespaced metadata dict is the only carrier that loses NOTHING');
  check('export-otio', 0, clips[0].markers.length === 2 && clips[0].markers[0].OTIO_SCHEMA === 'Marker.2',
    `mark addresses must surface as OTIO markers: ${JSON.stringify(clips[0].markers.map((m) => m.name))}`);
  const badOtio = JSON.parse(JSON.stringify(o.doc));
  badOtio.tracks.children[0].children.find((x) => x.OTIO_SCHEMA === 'Clip.2').metadata = { elektron: {} };
  check('export-otio', 0, !validateProvenance(badOtio, 'otio').ok,
    'NEGATIVE CONTROL: a non-namespaced metadata key must fail (reverse-DNS is the convention that makes the hook safe)');

  // --- a SCORE exports too (no live decks needed for the numeric case) -----
  const sc = nest.toScore({ id: 'ekstra-1' });
  const cs = exportProvenance(sc, { carrier: 'c2pa', resolve: () => child });
  check('export-score', 0, cs.validation.ok && cs.rows.length === 2 && cs.rows[0].ref === 'kurenniemi-1972',
    `a stored score must export the same claims as the live arrangement: ${JSON.stringify(cs.validation.errors)}`);
  check('export-score', 0, /unknown carrier/.test(throws(() => exportProvenance(sc, { carrier: 'xmp' })) || ''),
    'an unknown carrier must be rejected');

  nest.dispose(); parent.dispose(); child.dispose();
}

// --- suite 13b: a DECK subject — "these seconds were reconstructed" ---------
{
  const vr = sharedVR();
  const items = [];
  for (const t of [0, 1000, 5000, 6000]) items.push({ at: t, kind: 'curve', payload: { v: t } });
  const deck = createDeck({
    clock: vr.clock, tickHost: vr.newHost(), items, range: [0, 6000], evidence: 'all',
    adapters: { curve: { caps: { continuous: true, interpolate: true, tier: 1 }, actuate() {},
      interpolate: (a, b, u) => ({ v: a.v + (b.v - a.v) * u }) } },
  });
  refDeck(deck, 'pointer-trace');
  const rc = deck.registerReconstructor('catmull', { from: 'curve', tier: 1, method: 'catmull-rom', hz: 20 });
  rc.run();
  const d = exportProvenance(deck, { carrier: 'c2pa' });
  check('export-deck', 0, d.validation.ok && d.rows.length === 1 && d.rows[0].kind === 'reconstruction',
    `a deck with a reconstructor must export a time-ranged restoration claim: ${JSON.stringify(d.validation.errors)}`);
  const a0 = d.doc.assertions[0].data.actions[0];
  check('export-deck', 0, a0.action === 'c2pa.edited' && a0.digitalSourceType.endsWith('/algorithmicallyEnhanced') &&
    a0.changes[0].region[0].type === 'temporal',
    `§5b tier 1 must land on IPTC algorithmicallyEnhanced over a temporal region: ${JSON.stringify(a0.digitalSourceType)}`);
  check('export-deck', 0, d.rows[0].confidence !== null && d.rows[0].confidence <= 1,
    `the reconstructor's own confidence curve must reach the export: ${d.rows[0].confidence}`);
  const h = exportProvenance(deck, { carrier: 'hls', anchor: 0 });
  check('export-deck', 0, h.validation.ok && /X-ORG-ELEKTRON-TIER=1/.test(h.tags[0]),
    `…and onto the live lane as an X- attribute: ${h.tags[0]}`);
  deck.dispose();
}

// ===========================================================================
// suite 14 — LOOPS (plan-timeline §8; nested.mjs rule 10).
//
// A loop is a QUOTATION WITH REPETITION, so every arm below is the fragment
// suite's arm with `repeat` added and nothing else changed. That is the claim
// being tested: §8.2 says the mechanism already exists and a loop is the same
// affine map with MODULO instead of CLAMP. If any of these needed new
// machinery, the claim was wrong.
//
// The archaeology (research/loops-prior-art-2026-08.md) supplies three of the
// arms directly: the wrap is opt-in (14i), the stop must be exact or `repeat:n`
// lies (14e), and a blur must collapse rather than burst (14f).
// ===========================================================================

// a child with THREE kinds, because the whole of §8.3 is that they behave
// differently at the wrap:
//   `note`  EDGE-valued  — re-arms per iteration (caps.valued:'edge')
//   `cc`    LEVEL-valued — carries across the wrap (caps.valued:'level')
//   `ping`  fire-and-forget, NO reducer — tracker's case: nothing to leak, so
//           the wrap does not touch it and it rings across the boundary
const LNOTES = [{ n: 60, on: 100, off: 400 }, { n: 62, on: 800, off: 1200 }, { n: 64, on: 1500, off: 3800 }];
function makeLoopChild(vr, sink, { absentState, silence, ccLoopState, wrapHeard } = {}) {
  const items = [];
  for (const x of LNOTES) {
    items.push({ at: x.on, kind: 'note', payload: { raw: [144, x.n, 90] } });
    items.push({ at: x.off, kind: 'note', payload: { raw: [128, x.n, 0] } });
  }
  items.push({ at: 50, kind: 'cc', payload: { key: 74, v: 10 } });     // BEFORE `in`
  items.push({ at: 1000, kind: 'cc', payload: { key: 74, v: 99 } });   // INSIDE the loop
  items.push({ at: 900, kind: 'ping', payload: { tag: 'p' } });
  return createDeck({
    clock: vr.clock, tickHost: vr.newHost(), items, range: [0, CHILD_END],
    adapters: {
      note: {
        caps: { catchUp: 'reduce', reducible: true, seekable: true, rates: CHILD_RATES,
                valued: 'edge', ...(absentState ? { absentState } : {}), ...(wrapHeard ? { loopWrap: true } : {}) },
        ...(silence ? { silence } : {}),
        ...(wrapHeard ? { loopWrap: (i) => sink.wraps.push({ kind: i.kind, from: i.from, to: i.to, joint: i.joint, held: [...sink.live] }) } : {}),
        actuate(p) { const [s, n] = p.raw; if ((s & 0xf0) === 0x90) sink.live.add(n); else sink.live.delete(n); sink.fires++; sink.firedAt.push(+p.at); },
        reduce(payloads) { const h = new Map(); for (const p of payloads) { const [s, n, v] = p.raw; if ((s & 0xf0) === 0x90 && v > 0) h.set(n, p); else h.delete(n); } return h; },
        assertState(h, info) { sink.live = new Set(h.keys()); sink.asserts.push({ pos: +info.pos.toFixed(3), reason: info.reason, keys: [...h.keys()].sort((a, b) => a - b) }); },
      },
      cc: {
        caps: { catchUp: 'reduce', reducible: true, seekable: true, rates: CHILD_RATES,
                ...(ccLoopState ? { loopState: ccLoopState } : { valued: 'level' }) },
        actuate(p) { sink.cc.set(p.key, p.v); sink.ccFires++; },
        reduce(payloads) { const m = new Map(); for (const p of payloads) m.set(p.key, p.v); return m; },
        assertState(m) { sink.cc = new Map(m); sink.ccAsserts++; },
      },
      ping: { caps: { rates: CHILD_RATES }, actuate() { sink.pings++; } },
    },
  });
}
const newLoopSink = () => ({ live: new Set(), asserts: [], fires: 0, firedAt: [], cc: new Map(), ccFires: 0, ccAsserts: 0, pings: 0, wraps: [] });
function loopRig(opts = {}) {
  const vr = sharedVR();
  const sink = newLoopSink();
  const child = makeLoopChild(vr, sink, opts);
  const parent = createDeck({ clock: vr.clock, tickHost: vr.newHost(), range: [0, 400000], items: [] });
  const nest = createNest(parent, { toleranceMs: 5, hardSeekMs: 200 });
  refDeck(child, opts.ref || 'tape');
  return { vr, sink, child, parent, nest };
}
/** run the virtual clock forward `ms` of PARENT time, servoing like a client */
function runFor(vr, nest, ms, step = 5) { for (let t = 0; t < ms; t += step) { vr.advanceTo(vr.now() + step); nest.servo(); } }

// --- 14a — `repeat` IS A FIELD OF THE VALUE ---------------------------------
{
  const cases = [
    ['count', 7, 7], ['until', { untilMs: 5000 }, { untilMs: 5000 }], ['infinite', 'infinite', 'infinite'],
    ['one-is-no-loop', 1, undefined], ['absent', undefined, undefined],
  ];
  for (const [label, given, want] of cases) {
    const q = quotation({ ref: 'tape', at: 5000, in: 700, out: 2700, rate: 1, repeat: given });
    check('repeat-value', 0, JSON.stringify(q.repeat) === JSON.stringify(want),
      `${label}: repeat normalised to ${JSON.stringify(q.repeat)}, wanted ${JSON.stringify(want)}`);
    // THE ROUND TRIP, byte-identical — the same guarantee every other field has
    const j = JSON.stringify(q);
    const back = quotation(JSON.parse(j));
    check('repeat-value', 0, JSON.stringify(back) === j && quotationEquals(back, q),
      `${label}: quotation -> JSON -> quotation is not byte-identical\n  ${j}\n  ${JSON.stringify(back)}`);
    const s = score({ id: 's', quotations: [q] });
    const sj = scoreToJSON(s);
    check('repeat-value', 0, scoreToJSON(parseScore(sj)) === sj,
      `${label}: score -> JSON -> parseScore is not byte-identical`);
  }
  // `repeat: 1` and no repeat are THE SAME VALUE — a loop of one is not a loop
  check('repeat-value', 0, quotationEquals(quotation({ ref: 'a', repeat: 1 }), quotation({ ref: 'a' })),
    'repeat:1 must normalise away — "played once" is the absence of a loop');
  // and the rejections name the field
  for (const bad of [0, -1, 2.5, {}, { untilMs: 0 }, { untilMs: -1 }, 'forever', [], { count: 3 }]) {
    const m = throws(() => quotation({ ref: 'a', repeat: bad }));
    check('repeat-value', 0, m && /repeat/.test(m), `repeat: ${JSON.stringify(bad)} must be rejected by name, got ${m}`);
  }
  // geometry: the three forms, in parent ms
  const g1 = repeatGeometry({ in: 700, out: 2700, rate: 1, repeat: 7 });
  check('repeat-value', 0, g1.iterations === 7 && g1.parentDurMs === 14000 && g1.childTotal === 14000 && !g1.unbounded,
    `count geometry wrong: ${JSON.stringify(g1)}`);
  const g2 = repeatGeometry({ in: 0, out: 2000, rate: 2, repeat: { untilMs: 5000 } });
  check('repeat-value', 0, g2.parentDurMs === 5000 && g2.childTotal === 10000 && g2.iterations === 5 && !g2.partialLast,
    `{untilMs} geometry must be PARENT ms and compose with rate: ${JSON.stringify(g2)}`);
  const g3 = repeatGeometry({ in: 0, out: 2000, rate: 1, repeat: 'infinite' });
  check('repeat-value', 0, g3.unbounded && g3.iterations === Infinity && g3.parentDurMs === Infinity,
    `infinite geometry wrong: ${JSON.stringify(g3)}`);
}

// --- 14b — THE MAP: modulo instead of clamp, exact ---------------------------
{
  const { vr, child, parent, nest } = loopRig();
  const AT = 5000, IN = 700, OUT = 2700, L = OUT - IN, N = 50;
  const sp = nest.add({ id: 'q', at: AT, rate: 1, deck: child, in: IN, out: OUT, repeat: N });
  check('loop-map', 0, sp.parentDur === N * L, `a repeated span occupies N*(out-in)/rate of parent time: ${sp.parentDur} !== ${N * L}`);
  check('loop-map', 0, nest.loop('q').iterations === N && nest.loop('q').lengthMs === L,
    `nest.loop() must report the geometry: ${JSON.stringify(nest.loop('q'))}`);

  // THE ANALYTIC EXPECTATION. Not "what the code did" — what §8.2's formula says.
  // The one deliberate exception is the WRAP LEAD: landing exactly on a
  // boundary parks the child a hair (1e-6 ms) BEFORE `in`, so the event sitting
  // exactly on `in` is still pending and fires instead of being folded. Every
  // other position is exact to the float.
  const LEAD = 1e-6;
  const analytic = (pos) => IN + ((pos - AT) % L);
  for (const k of [0, 1, 2, 6, 7, 49]) {
    for (const d of [0, 1, 123, 999.5, L - 1, L - 0.5]) {
      const pos = AT + k * L + d;
      parent.seek(pos);
      const want = analytic(pos);
      const tol = d === 0 ? LEAD + 1e-9 : 1e-9;
      check('loop-map', k, Math.abs(child.position() - want) <= tol,
        `repetition ${k} +${d}ms: childPos ${child.position()} !== in + ((parentPos-at) mod L) = ${want} (tol ${tol})`);
      check('loop-map', k, nest.iteration('q') === k, `repetition index at +${d} of rep ${k} is ${nest.iteration('q')}`);
    }
  }
  // the MIDDLE of repetition 7 (1-based: index 6), the arm named in the brief
  // the LEAD itself, stated as a property: at a boundary the child sits exactly
  // one lead before `in`, and that is why a loop keeps its downbeat.
  parent.seek(AT + 3 * L);
  check('loop-lead', 0, Math.abs(child.position() - (IN - LEAD)) < 1e-12,
    `landing on a boundary parks the child ${LEAD} ms before IN so the event ON \`in\` is still pending: ${child.position()}`);
  const mid = AT + 6 * L + L / 2;
  parent.seek(mid);
  check('loop-seek7', 0, child.position() === IN + L / 2 && nest.iteration('q') === 6,
    `a parent seek into the middle of repetition 7 must land at in+L/2=${IN + L / 2}: got ${child.position()} in iteration ${nest.iteration('q')}`);
  // rule 7c still holds at the very end: `out` IS the child's end, not `in`
  parent.seek(AT + N * L);
  check('loop-map', 0, child.position() === OUT,
    `the final instant of the last repetition parks at OUT (${OUT}), not back at IN — got ${child.position()}`);
  parent.seek(AT + N * L + 5000);
  check('loop-map', 0, child.position() === OUT && nest.present('q') === false,
    `past the last repetition the span is ABSENT and parked at OUT: pos=${child.position()} present=${nest.present('q')}`);
  parent.seek(AT - 1);
  check('loop-map', 0, child.position() === IN, `before the loop the child parks at IN: ${child.position()}`);
  // loopPhase is the one definition — the nest may not have its own
  for (const k of [0, 1, 2, 7, 50]) {
    const ph = loopPhase(k * L, L, N * L);
    const wantIter = k >= N ? N - 1 : k, wantOff = k >= N ? L : 0;
    check('loop-phase', k, ph.iter === wantIter && ph.off === wantOff,
      `loopPhase(${k}L) = {iter:${ph.iter}, off:${ph.off}}, wanted {iter:${wantIter}, off:${wantOff}}`);
  }
  // {untilMs} CUTS the last pass, and the cut is where the arithmetic says
  const { child: c2, parent: p2, nest: n2 } = loopRig({ ref: 'tape2' });
  n2.add({ id: 'u', at: 0, rate: 1, deck: c2, in: 0, out: 2000, repeat: { untilMs: 5000 } });
  check('loop-until', 0, n2.span('u').parentDur === 5000 && n2.loop('u').partialLast === true,
    `{untilMs:5000} over a 2000 ms loop is 5000 ms of parent time with a partial last pass: ${JSON.stringify(n2.loop('u'))}`);
  p2.seek(4999);
  check('loop-until', 0, Math.abs(c2.position() - 999) < 1e-9, `the cut pass maps normally: ${c2.position()}`);
  p2.seek(5000);
  check('loop-until', 0, c2.position() === 1000, `at {untilMs} the child parks WHERE THE LOOP WAS CUT (1000), not at out: ${c2.position()}`);
  // rate composes with the loop exactly as it does with a fragment
  const { child: c3, parent: p3, nest: n3 } = loopRig({ ref: 'tape3' });
  n3.add({ id: 'r', at: 1000, rate: 2, deck: c3, in: 0, out: 2000, repeat: 4 });
  check('loop-rate', 0, n3.span('r').parentDur === 4000, `rate 2 halves each pass: ${n3.span('r').parentDur} !== 4000`);
  p3.seek(1000 + 2500);
  check('loop-rate', 0, c3.position() === 1000 && n3.iteration('r') === 2,
    `at parent+2500 with rate 2 the child is 5000 child-ms in = repetition 2, offset 1000: got ${c3.position()} rep ${n3.iteration('r')}`);
}

// --- 14c/14d — THE WRAP: re-seek, edges re-arm, levels carry ----------------
{
  const { vr, sink, child, parent, nest } = loopRig();
  const AT = 1000, IN = 700, OUT = 2700, L = 2000, N = 55;
  nest.add({ id: 'q', at: AT, rate: 1, deck: child, in: IN, out: OUT, repeat: N });
  const seen = [];
  nest.onWrap((i) => seen.push(i));
  check('loop-lanes', 0, String(nest.loop('q').lanes.carry) === 'cc' && nest.loop('q').lanes.rearm.includes('note'),
    `§8.3: cc is level-valued and CARRIES, note is edge-valued and RE-ARMS: ${JSON.stringify(nest.loop('q').lanes)}`);

  parent.seek(AT); parent.play(1);
  // note 64 is on at child 1500 and off at 3800 — i.e. it is STILL HELD at
  // `out`. That is the stuck-note generator: without a re-arm it accumulates.
  const held = [], ccAt = [];
  let maxHeld = 0, everStuckFrom = null;
  const perIterFires = [];
  let lastIter = 0, firesAtIterStart = 0;
  for (let t = 0; t < N * L + 200; t += 5) {
    vr.advanceTo(vr.now() + 5); nest.servo();
    const it = nest.iteration('q');
    if (it !== lastIter) { perIterFires.push(sink.fires - firesAtIterStart); firesAtIterStart = sink.fires; lastIter = it; }
    maxHeld = Math.max(maxHeld, sink.live.size);
    if (sink.live.size > 2) everStuckFrom = everStuckFrom ?? it;
  }
  check('loop-wrap', 0, seen.length === N - 1 && nest.loop('q').wraps === N - 1,
    `${N} repetitions is exactly ${N - 1} wraps — got ${seen.length} callbacks / ${nest.loop('q').wraps} counted`);
  check('loop-wrap', 0, seen.every((w, i) => w.to === i + 1 && w.from === i),
    'every wrap reports the repetition it left and the one it entered, in order');
  check('loop-wrap', 0, seen.every((w) => Math.abs(w.childPos - IN) <= 1e-6 + 1e-9 && w.in === IN && w.out === OUT && w.joint === 'cut'),
    `a wrap lands at IN (less the wrap lead), names the fragment, and declares a HARD CUT: ${JSON.stringify(seen[0])}`);

  // NO STUCK NOTES, EVER, ACROSS 50+ WRAPS. The child holds at most the notes
  // the reducer says are held at that position — never an accumulation.
  check('loop-stuck', 0, maxHeld <= 2 && everStuckFrom === null,
    `held-note count peaked at ${maxHeld} across ${N - 1} wraps (first over-hold in repetition ${everStuckFrom}) — ` +
    'a note-on from an earlier repetition is being retained across the boundary');
  // and the RE-SEEK is what did it: every wrap left a fold in the assert log
  const wrapAsserts = sink.asserts.filter((a) => a.pos === IN && a.reason === 'seek');
  check('loop-reseek', 0, wrapAsserts.length >= N - 1,
    `each wrap must run reduce-on-seek AT IN (§8.7: re-seek, not re-fire) — ${wrapAsserts.length} folds at ${IN} for ${N - 1} wraps`);
  // NOT a re-fire: each repetition fires the SAME number of events, and the
  // count does not grow. (A re-firing loop replays the prefix and the count
  // climbs; that is the timeline-emitter `played:true` failure inverted.)
  const uniq = [...new Set(perIterFires)];
  check('loop-nofire', 0, uniq.length <= 2 && Math.max(...perIterFires) === Math.min(...perIterFires.slice(1)),
    `every repetition must fire the same events: per-iteration fire counts ${JSON.stringify(perIterFires.slice(0, 6))}…`);

  // §8.3 LEVEL: cc=99 is set at child 1000, INSIDE the loop. A plain re-seek to
  // `in` would fold it back to 10 (the value at child 50, before `in`). The
  // carry is the whole difference, and this is the sample that shows it.
  const ccJustAfterWrap = [];
  parent.seek(AT); parent.play(1);
  sink.cc = new Map();
  let prev = 0;
  for (let t = 0; t < 8 * L; t += 5) {
    vr.advanceTo(vr.now() + 5); nest.servo();
    const it = nest.iteration('q');
    if (it !== prev) { ccJustAfterWrap.push({ it, cc: sink.cc.get(74) }); prev = it; }
  }
  check('loop-level', 0, ccJustAfterWrap.length >= 3 && ccJustAfterWrap.every((r) => r.cc === 99),
    `§8.3: a LEVEL set in repetition N is still set at the top of repetition N+1 — ` +
    `saw ${JSON.stringify(ccJustAfterWrap.slice(0, 4))} (10 = the pre-\`in\` value, i.e. the carry did not happen)`);

  // …and the NEGATIVE CONTROL: the same lane declared 'rearm' loses it, which
  // is what proves the carry is the cap and not an accident of the fold.
  {
    const r = loopRig({ ref: 'tape-rearm', ccLoopState: 'rearm' });
    r.nest.add({ id: 'q', at: AT, rate: 1, deck: r.child, in: IN, out: OUT, repeat: 8 });
    r.parent.seek(AT); r.parent.play(1);
    const rows = []; let p = 0;
    for (let t = 0; t < 5 * L; t += 5) { r.vr.advanceTo(r.vr.now() + 5); r.nest.servo(); const it = r.nest.iteration('q'); if (it !== p) { rows.push(r.sink.cc.get(74)); p = it; } }
    check('loop-level', 0, rows.length >= 3 && rows.every((v) => v === 10),
      `NEGATIVE CONTROL: caps.loopState:'rearm' must NOT carry — the level folds back to the pre-\`in\` value: ${JSON.stringify(rows)}`);
    check('loop-level', 0, String(r.nest.loop('q').lanes.carry) === '',
      `…and the lane is reported as re-arming, not carrying: ${JSON.stringify(r.nest.loop('q').lanes)}`);
  }
}

// --- 14e — THE EXACT STOP (the archaeology's ~1.6 s tail) -------------------
{
  // "repeat was only ever infinite in the entire lineage; the one hard datum
  // about stopping is that it left a ~1.6 s audio tail because committed events
  // had no cancel path." So: assert the stop, do not assume it.
  const silenced = [];
  const r = loopRig({ ref: 'tape-stop', absentState: 'silence', silence: (i) => { silenced.push(i.reason); r.sink.live = new Set(); } });
  const AT = 500, IN = 700, OUT = 2700, L = 2000, N = 4;
  r.nest.add({ id: 'q', at: AT, rate: 1, deck: r.child, in: IN, out: OUT, repeat: N });
  r.parent.seek(AT); r.parent.play(1);
  runFor(r.vr, r.nest, N * L + 3000);
  check('loop-stop', 0, r.nest.loop('q').wraps === N - 1,
    `repeat:${N} is exactly ${N - 1} wraps and then it STOPS: ${r.nest.loop('q').wraps}`);
  check('loop-stop', 0, r.nest.present('q') === false && r.child.position() === OUT,
    `after the last repetition the span is absent, parked at OUT: present=${r.nest.present('q')} pos=${r.child.position()}`);
  check('loop-stop', 0, r.sink.live.size === 0 && silenced.length > 0,
    `THE EXACT STOP: nothing may ring after the last repetition. held=${[...r.sink.live]} silence()=${silenced.length} calls. ` +
    'Without this, repeat:4 sounds like "four and a bit" — the lineage measured that tail at ~1.6 s.');
  const before = r.sink.fires;
  runFor(r.vr, r.nest, 5000);
  check('loop-stop', 0, r.sink.fires === before,
    `and nothing fires afterwards: ${r.sink.fires - before} events escaped past the end of the loop`);
  // the default (no absentState) HOLDS the edge — rule 9 is unchanged by loops
  const h = loopRig({ ref: 'tape-hold' });
  h.nest.add({ id: 'q', at: AT, rate: 1, deck: h.child, in: IN, out: OUT, repeat: N });
  h.parent.seek(AT); h.parent.play(1);
  runFor(h.vr, h.nest, N * L + 500);
  check('loop-stop', 0, h.sink.live.size === 1,
    `the DEFAULT still holds whatever \`out\` cut (rule 9's 'hold'), loop or not: ${[...h.sink.live]}`);
}

// --- 14f — the blur collapses, it does not burst ----------------------------
{
  // wrap-artefact catalogue: "tab-blur burst is unbounded under an infinite
  // loop". It cannot happen here, because the iteration index is a pure
  // function of the parent's position and nothing counts wraps to know where
  // it is. A 30 s stall under a 2 s loop is ONE re-seek.
  const r = loopRig({ ref: 'tape-blur' });
  const AT = 0, IN = 0, OUT = 2000, L = 2000;
  r.nest.add({ id: 'q', at: AT, rate: 1, deck: r.child, in: IN, out: OUT, repeat: 'infinite' });
  r.parent.seek(0); r.parent.play(1);
  runFor(r.vr, r.nest, 500);
  const w0 = r.nest.loop('q').wraps;
  r.vr.advanceTo(r.vr.now() + 30000);          // the blur: no servo tick for 30 s
  r.nest.servo();                              // …and one tick when it comes back
  const w1 = r.nest.loop('q').wraps;
  check('loop-blur', 0, w1 - w0 === 1,
    `a 30 s stall under a 2 s loop must collapse to ONE wrap, not 15: ${w1 - w0}`);
  check('loop-blur', 0, r.nest.iteration('q') === 15 && r.child.position() === IN + ((30500) % L),
    `…and it lands in the repetition the clock says (15), at the right offset: rep ${r.nest.iteration('q')} pos ${r.child.position()}`);
  check('loop-blur', 0, r.sink.live.size <= 2, `…with nothing left ringing from the fifteen passes nobody heard: ${[...r.sink.live]}`);
}

// --- 14g — THE RENDERER refuses an unbounded loop ---------------------------
{
  const r = loopRig({ ref: 'tape-render' });
  r.nest.add({ id: 'bounded', at: 0, deck: r.child, in: 0, out: 2000, repeat: 4 });
  const b = r.nest.renderBound();
  check('loop-render', 0, b.from === 0 && b.to === 8000 && b.unbounded.length === 0,
    `a BOUNDED loop names its own render window: ${JSON.stringify(b)}`);

  const u = loopRig({ ref: 'tape-inf' });
  u.nest.add({ id: 'forever', at: 0, deck: u.child, in: 0, out: 2000, repeat: 'infinite' });
  let err = null;
  try { u.nest.renderBound(); } catch (e) { err = e; }
  check('loop-render', 0, err && err.code === 'LOOP_UNBOUNDED' && err.spans.join() === 'forever',
    `§8.7: renderBound() must REFUSE an unbounded loop by name, not hang. got ${err && err.code}`);
  check('loop-render', 0, /repeat:'infinite'/.test(err.message) && /\{until/.test(err.message),
    'the refusal must say what to do instead (pass {until}, or bound the repeat)');
  const withUntil = u.nest.renderBound({ until: 6000 });
  check('loop-render', 0, withUntil.to === 6000 && withUntil.unbounded.join() === 'forever',
    `…and an EXPLICIT bound is accepted, still reporting which spans were unbounded: ${JSON.stringify(withUntil)}`);
  // one level down: renderDeck itself already refuses a non-finite window, which
  // is the same refusal without the ability to name the span.
  const od = offlineDeck({ items: [{ at: 0, kind: 'k', payload: {} }], range: [0, 1000], adapters: { k: { caps: { deterministic: true }, actuate() {} } } });
  const m = throws(() => renderDeck(od, { from: 0, to: Infinity, fps: 30 }));
  check('loop-render', 0, m && /finite/.test(m), `renderDeck must refuse a non-finite window: ${m}`);
  od.dispose();

  // A BOUNDED loop must still RENDER, and render REPRODUCIBLY — a loop may not
  // cost determinism. Two renders of the same looped arrangement, byte-identical.
  const hashes = [];
  for (let pass = 0; pass < 2; pass++) {
  const rt = createRenderRuntime(0);      // a FRESH runtime per pass — a render
                                          // is reproducible from time zero, not
                                          // from wherever the last one stopped
  const mkChild = () => createDeck({ clock: rt.clock, tickHost: rt.newHost(), range: [0, 2000],
    items: [{ at: 100, kind: 'n', id: 'a', payload: { v: 1 } }, { at: 900, kind: 'n', id: 'b', payload: { v: 2 } }],
    adapters: { n: { caps: { catchUp: 'reduce', reducible: true, seekable: true, deterministic: true },
      actuate() {}, reduce(ps) { return ps.length; }, assertState() {} } } });
  {
    const ch = mkChild();
    const par = createDeck({ clock: rt.clock, tickHost: rt.newHost(), range: [0, 20000], items: [] });
    par.renderRuntime = rt;
    const ne = createNest(par);
    ne.add({ id: 'q', at: 0, deck: ch, in: 0, out: 1000, repeat: 5 });
    const bound = ne.renderBound();
    const res = renderDeck(par, { ...bound, fps: 50, runtime: rt });
    hashes.push(res.traceHash);
    ne.dispose(); ch.dispose(); par.dispose();
  }
  }
  check('loop-render', 0, hashes[0] === hashes[1],
    `a bounded loop must render byte-identically twice: ${hashes[0]} vs ${hashes[1]}`);
}

// --- 14h — THE STORE: a loop is a BOUNDED WINDOW QUERY ----------------------
{
  // §8.7 feared an infinite loop would pin pages forever. It cannot: a loop
  // re-seeks a FIXED fragment, so the window it asks for is the same window
  // every pass. What has to be measured is that the loop resolves to a bounded
  // WINDOW QUERY and never a full scan — the resident set is then constant
  // whatever `repeat` says.
  const rows = [];
  for (let i = 0; i < 40000; i++) rows.push({ at: i * 10, kind: 'n', id: `e${i}`, payload: { i } });
  const tmp = join(tmpdir(), `loop-store-${process.pid}.jsonl`);
  writeFileSync(tmp, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  const idx = await buildJsonlIndex(tmp, { pageRows: 512 });
  const reader = await jsonlStore({ path: tmp, index: idx.index, pageRows: 512, maxPages: 8 }).open();
  const IN = 120000, OUT = 122000;                     // a 2 s fragment, 200 rows
  const want = reader.pagesForWindow(IN, OUT);
  await reader.ensure(IN, OUT);
  const first = reader.resident();
  const seenPageSets = new Set();
  for (let wrap = 0; wrap < 1000; wrap++) {
    // one pass of the loop, as the servo would drive it: re-seek to `in`, read
    // the fragment, arrive at `out`.
    await reader.ensure(IN, OUT);
    reader.slice(IN, OUT);
    seenPageSets.add(reader.resident().pages.join(','));
  }
  const last = reader.resident();
  check('loop-store', 0, last.pages.length === first.pages.length && last.pages.length <= reader.pageRows && last.pages.length <= 8,
    `1000 wraps must not grow the resident set: ${first.pages.length} -> ${last.pages.length} pages`);
  check('loop-store', 0, seenPageSets.size === 1,
    `…and the resident set must be the SAME set every pass (a loop is one bounded window query): ${seenPageSets.size} distinct sets`);
  check('loop-store', 0, want.length <= 2 && last.pinned.join(',') === want.join(','),
    `the fragment is ${want.length} page(s) and stays pinned: want=${want} pinned=${last.pinned}`);
  const st = reader.stats();
  check('loop-store', 0, st.loads <= want.length + 2 && st.evictions === 0,
    `1000 wraps over one fragment must load each page ONCE and evict nothing: loads=${st.loads} evictions=${st.evictions}`);
  check('loop-store', 0, st.ensureFast >= 999,
    `…so 999 of the 1000 ensures are the synchronous fast path: ${st.ensureFast}`);
  reader.close(); unlinkSync(tmp);
}

// --- 14i — the wrap is OPT-IN (the archaeology's headline) ------------------
{
  // tracker schedules `(((beat - startBeat) % len) + len) % len` and has NO
  // wrap handler: nothing is reset, re-armed, silenced or faded at pos 0, and
  // notes ring across the boundary ON PURPOSE. A lane with no held state must
  // not be given a boundary it never asked for.
  const r = loopRig({ ref: 'tape-optin', wrapHeard: true });
  const AT = 0, IN = 0, OUT = 2000, L = 2000;
  r.nest.add({ id: 'q', at: AT, rate: 1, deck: r.child, in: IN, out: OUT, repeat: 6 });
  r.parent.seek(0); r.parent.play(1);
  runFor(r.vr, r.nest, 6 * L);
  check('loop-optin', 0, r.sink.wraps.length === 5 && r.sink.wraps.every((w) => w.kind === 'note'),
    `only the lane that IMPLEMENTS loopWrap() hears the boundary: ${JSON.stringify(r.sink.wraps.map((w) => w.kind))}`);
  check('loop-optin', 0, r.nest.loop('q').lastWrap.heard.join() === 'note',
    `…and the wrap report names exactly who heard it: ${JSON.stringify(r.nest.loop('q').lastWrap.heard)}`);
  // `ping` has no reduce/assertState at all — transport's assertAt skips it, so
  // the re-seek never touches it and it behaves exactly as tracker's does.
  check('loop-optin', 0, r.sink.pings === 6,
    `a fire-and-forget lane fires once per repetition and is otherwise untouched by the wrap: ${r.sink.pings}`);

  // declaring the cap without implementing it is a reported DEGRADATION
  const d = loopRig({ ref: 'tape-degraded' });
  // re-declare the note lane's cap without the function
  const bad = createDeck({ clock: d.vr.clock, tickHost: d.vr.newHost(), range: [0, 4000],
    items: [{ at: 100, kind: 'note', payload: { raw: [144, 60, 90] } }],
    adapters: { note: { caps: { loopWrap: true, catchUp: 'reduce', reducible: true, rates: CHILD_RATES },
      actuate() {}, reduce(ps) { return ps.length; }, assertState() {} } } });
  d.nest.add({ id: 'b', at: 0, deck: bad, in: 0, out: 2000, repeat: 3 });
  d.parent.seek(0); d.parent.play(1);
  runFor(d.vr, d.nest, 2 * 2000 + 100);
  const degs = d.nest.loop('b').degradations;
  check('loop-optin', 0, degs.some((x) => x.kind === 'note' && x.wanted === 'loopWrap' && /implements no loopWrap/.test(x.reason)),
    `caps.loopWrap declared but not implemented must be REPORTED, not silently skipped: ${JSON.stringify(degs)}`);
  bad.dispose();
}

// --- 14j — a loop SURVIVES THE DOOR (score round trip, live) ----------------
{
  const r = loopRig({ ref: 'tape-score' });
  r.nest.add({ id: 'q', at: 3000, rate: 1, deck: r.child, in: 700, out: 2700, repeat: 9 });
  r.nest.add({ id: 'u', at: 40000, rate: 1, deck: r.child, in: 0, out: 1000, repeat: { untilMs: 3000 } });
  const s = r.nest.toScore({ id: 'loops' });
  const j = scoreToJSON(s);
  check('loop-score', 0, s.quotations[0].repeat === 9 && JSON.stringify(s.quotations[1].repeat) === '{"untilMs":3000}',
    `toScore() must carry repeat: ${j}`);
  check('loop-score', 0, scoreToJSON(parseScore(j)) === j, 'a score with loops round-trips byte-identically');

  // load it in a FRESH runtime that has only the bytes and a resolver
  const vr2 = sharedVR(2_000_000);
  const sink2 = newLoopSink();
  const child2 = makeLoopChild(vr2, sink2);
  const parent2 = createDeck({ clock: vr2.clock, tickHost: vr2.newHost(), range: [0, 400000], items: [] });
  const { nest: n2 } = loadScore(j, () => child2, { parent: parent2, toleranceMs: 5, hardSeekMs: 200 });
  check('loop-score', 0, n2.loop('q').iterations === 9 && n2.span('q').parentDur === 18000,
    `the loaded arrangement loops exactly as the live one did: ${JSON.stringify(n2.loop('q'))}`);
  parent2.seek(3000 + 6 * 2000 + 1000);
  check('loop-score', 0, child2.position() === 1700 && n2.iteration('q') === 6,
    `…and a seek into repetition 7 of the LOADED score lands identically: ${child2.position()} rep ${n2.iteration('q')}`);
  check('loop-score', 0, scoreToJSON(n2.toScore({ id: 'loops' })) === j,
    'toScore(loadScore(x)) === x, with repeat');

  // the three provenance carriers each say something about the repeat
  const rows = provenanceRows(r.nest);
  check('loop-score', 0, rows[0].repeat === 9 && rows[0].iterations === 9 && rows[0].parentOut === 3000 + 18000,
    `provenanceRows must claim N passes' worth of parent time: ${JSON.stringify(rows[0])}`);
  const c2 = exportProvenance(r.nest, { carrier: 'c2pa' });
  check('loop-score', 0, c2.validation.ok && c2.doc.assertions[0].data.actions[0].parameters[NS].repeat === 9,
    `C2PA carries repeat in our namespace and still validates: ${JSON.stringify(c2.validation.errors)}`);
  check('loop-score', 0, c2.caveats.some((x) => /REPEAT DOES NOT SURVIVE/.test(x)),
    'and says out loud that no carrier has a word for a loop');
  const hl = exportProvenance(r.nest, { carrier: 'hls', anchor: 0 });
  check('loop-score', 0, hl.validation.ok && /X-ORG-ELEKTRON-REPEAT="9"/.test(hl.tags[0]), `HLS X- attribute: ${hl.tags[0]}`);
  const ot = exportProvenance(r.nest, { carrier: 'otio' });
  check('loop-score', 0, ot.validation.ok && ot.doc.tracks.children[0].children.find((c) => c.name === 'q').metadata[NS].repeat === 9,
    'OTIO namespaced metadata carries it verbatim (and no OTIO tool will act on it)');

  // an UNBOUNDED loop still exports, and is flagged rather than given a fake end
  const u = loopRig({ ref: 'tape-inf2' });
  u.nest.add({ id: 'f', at: 0, deck: u.child, in: 0, out: 2000, repeat: 'infinite' });
  const ur = provenanceRows(score({ quotations: [u.nest.quotation('f')] }), { resolve: () => u.child });
  check('loop-score', 0, ur[0].unbounded === true && ur[0].parentOut === 2000,
    `an unbounded quotation reports ONE pass and flags itself, rather than inventing an end: ${JSON.stringify(ur[0])}`);
}

if (failures) {
  console.error(`prop-nested: ${failures} VIOLATION(S) in ${checks} checks`);
  process.exit(1);
}
console.log(`prop-nested OK: ${checks} checks, 0 violations`);
console.log('fragment OK: (out-in)/rate span length / entry seeks+asserts at `in` / `out` is the child\'s end / parent seek maps exact / clamp reported / in>=out + wholly-outside + overlapping-quotation rejected / THE SAME DECK QUOTED TWICE, both playing correctly, child range untouched');
console.log('rVFC (L4b) OK: an element without requestVideoFrameCallback is untouched / a fresh frame\'s mediaTime is CARRIED onto now through expectedDisplayTime and used / a stale sample falls back to currentTime (the hidden-tab path) / a sample from before a discontinuity is REJECTED so L2 still sees the raw currentTime and seeks / useRvfc:false and variableFps:true register no callback at all');
console.log('mediaMaster OK: NEGATIVE CONTROL (sync across a 9 s gap BURSTS a catchUp:burst lane) / the helper SEEKS instead and folds / small errors still sync with no re-fire / the master is never nudged / timeupdate backstop attached+detached / seeking is not a clock / stall holds (1 element) and releases (N tiles)');
console.log('score OK (C10): a quotation is a FROZEN VALUE naming its source by identity / toScore -> JSON -> loadScore in a FRESH RUNTIME with only bytes + a resolver plays IDENTICALLY (trace-for-trace) / toScore(loadScore(x)) === x / an unresolvable ref and an unnamed deck fail loudly');
console.log('marks OK: {mark:\'chorus-3\'} resolves against the child\'s own mark lane at add() / numeric in/out unchanged / after a RE-CUT the mark-addressed quotation opens on the SAME MUSIC and the number-addressed one does not, and the move is reported');
console.log('absentState OK (rule 9): default holds the edge / a declared silence() is called once per park, told where/why/which quotation, and re-entry self-heals by the ordinary fold / declaring it without implementing it is a reported DEGRADATION, as is an unknown mode');
console.log('provenance export OK: C2PA Action.changes[].regionOfInterest temporal npt + reviewRatings 1-5 + ingredient regionOfInterest (§18.16.13) / EXT-X-DATERANGE with reverse-DNS X- attributes off a wall-clock anchor / OTIO Clip.2 + LinearTimeWarp + Marker.2 + namespaced metadata / all three validated against published field names, with negative controls');
console.log('setRange OK: durationMs follows / range keeps its identity / narrowing re-folds with a real seek / runtime items + auto / cursor exact and still O(1) across a range change and lane insertions');
