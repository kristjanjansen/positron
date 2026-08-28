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

function makeChild(vr, sink, range = [0, CHILD_END]) {
  const items = [];
  for (const x of NOTES) {
    items.push({ at: x.on, kind: 'note', payload: { raw: [144, x.n, 90] } });
    items.push({ at: x.off, kind: 'note', payload: { raw: [128, x.n, 0] } });
  }
  return createDeck({
    clock: vr.clock, tickHost: vr.newHost(), items, range,
    adapters: {
      note: {
        caps: { catchUp: 'reduce', rates: CHILD_RATES, reducible: true, seekable: true },
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

if (failures) {
  console.error(`prop-nested: ${failures} VIOLATION(S) in ${checks} checks`);
  process.exit(1);
}
console.log(`prop-nested OK: ${checks} checks, 0 violations`);
console.log('fragment OK: (out-in)/rate span length / entry seeks+asserts at `in` / `out` is the child\'s end / parent seek maps exact / clamp reported / in>=out + wholly-outside + overlapping-quotation rejected / THE SAME DECK QUOTED TWICE, both playing correctly, child range untouched');
console.log('rVFC (L4b) OK: an element without requestVideoFrameCallback is untouched / a fresh frame\'s mediaTime is CARRIED onto now through expectedDisplayTime and used / a stale sample falls back to currentTime (the hidden-tab path) / a sample from before a discontinuity is REJECTED so L2 still sees the raw currentTime and seeks / useRvfc:false and variableFps:true register no callback at all');
console.log('mediaMaster OK: NEGATIVE CONTROL (sync across a 9 s gap BURSTS a catchUp:burst lane) / the helper SEEKS instead and folds / small errors still sync with no re-fire / the master is never nudged / timeupdate backstop attached+detached / seeking is not a clock / stall holds (1 element) and releases (N tiles)');
console.log('setRange OK: durationMs follows / range keeps its identity / narrowing re-folds with a real seek / runtime items + auto / cursor exact and still O(1) across a range change and lane insertions');
