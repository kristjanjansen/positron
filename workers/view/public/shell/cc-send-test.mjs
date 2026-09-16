// demo/shell/cc-send-test.mjs — what a hand on a slider puts on the wire.
//
//   node demo/shell/cc-send-test.mjs
//
// `makeCcSend` is pure: it holds no socket, no clock and no page, so the whole
// of the send discipline is gradable here rather than by watching a board in
// another building and wondering. That matters more than usual for this
// subject, because EVERY FAILURE MODE OF A CONTROL PLANE IS SILENT. A value
// thinned away leaves a filter in the wrong place with no error anywhere, and
// the relay tells a sender nothing at all when its bucket bites.
//
// FOUR OF THESE ARE NEGATIVE CONTROLS: they are written so the bug they name
// would fail them, rather than so today's code passes.

import { makeCcSend, SEND_GATE_MS, RESTATE_MS, SWITCHES } from './cc-adapter.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' · ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' · ' + detail : ''}`); }
};

console.log('\n== the send gate ==');

const CUT = 74, RES = 71;      // filter cutoff and resonance, the two sliders

// ── 1. a sweep is thinned to the gate's rate ────────────────────────────────
// A finger on a slider emits as fast as the browser will report it. What can
// be HEARD is bounded by the board's 20 ms audio frame, so everything above
// one message per controller per frame is load nobody hears.
{
  const g = makeCcSend();
  const msgs = [];
  for (let t = 0; t <= 1000; t += 5) {          // 201 moves, 5 ms apart
    g.put(CUT, Math.round((t / 1000) * 127));
    const m = g.tick(t);
    if (m) msgs.push({ t, m });
  }
  const expected = Math.round(1000 / SEND_GATE_MS) + 1;
  ok('a sweep is thinned to one message per frame',
    msgs.length <= expected && msgs.length >= expected - 2,
    `${g.stats.offered} moves offered, ${msgs.length} messages, ${g.stats.thinned} thinned`);

  // 2. NEGATIVE CONTROL. Thinning must keep the NEWEST value, not the one that
  //    happened to be in hand when the gate opened. A gate that sends a stale
  //    value is a filter lagging a finger, which reads as latency rather than
  //    as a bug.
  const last = msgs[msgs.length - 1].m.set[0][1];
  ok('what goes out is the newest value, not a stale one', last === 127,
    `last message carried ${last}, the sweep ended at 127`);
}

// ── 3. the endpoint is never thinned ───────────────────────────────────────
// The last value of a gesture is the one that stays true until the next
// gesture, so it is the one value that must never be dropped. `createSlider`
// gives this for free: `onInput` while moving, `onChange` on release.
{
  const g = makeCcSend();
  g.put(CUT, 40);
  g.tick(0);                                   // opens the gate for CUT at t=0
  g.put(CUT, 41);
  const thinned = g.tick(5);                   // inside the gate: held back
  g.put(CUT, 99, { end: true });
  const ended = g.tick(6);                     // still inside it, and goes anyway
  ok('a value inside the gate is held back', thinned === null, 'tick at 5 ms returned nothing');
  ok('the endpoint goes out inside the gate',
    !!ended && ended.set[0][0] === CUT && ended.set[0][1] === 99,
    `tick at 6 ms carried ${ended ? ended.set[0][1] : 'nothing'}`);
}

// ── 4. the gate is per controller ──────────────────────────────────────────
// NEGATIVE CONTROL for the obvious implementation: one timestamp for the whole
// gate. With that bug, the second slider is silenced by the first for a frame,
// which is exactly the case this demo exists to show off.
{
  const g = makeCcSend();
  g.put(CUT, 10);
  const first = g.tick(0);
  g.put(RES, 20);
  const second = g.tick(1);                    // 1 ms later: a global gate would eat it
  ok('one controller does not gate another',
    !!second && second.set.length === 1 && second.set[0][0] === RES,
    `cutoff went at 0 ms, resonance at 1 ms: ${second ? 'both out' : 'the second was eaten'}`);
  ok('the first message was the first controller',
    !!first && first.set[0][0] === CUT, 'cutoff');
}

// ── 5. two sliders moving together travel in ONE message ───────────────────
// The relay's budget is counted in messages, so a message carrying two pairs
// costs exactly what one carrying one costs.
{
  const g = makeCcSend();
  g.put(CUT, 91);
  g.put(RES, 40);
  const m = g.tick(0);
  ok('two sliders batch into one message',
    !!m && m.set.length === 2 && g.stats.messages === 1,
    `${m ? m.set.length : 0} pairs in ${g.stats.messages} message`);
}

// ── 6. switches are never gated ────────────────────────────────────────────
{
  const g = makeCcSend();
  const pedal = [...SWITCHES][0];
  g.put(pedal, 127);
  g.tick(0);
  g.put(pedal, 0);
  const m = g.tick(2);                         // well inside the gate
  ok('a switch is not thinned',
    !!m && m.set[0][0] === pedal && m.set[0][1] === 0,
    `${pedal} down then up, 2 ms apart, both out`);
}

// ── 7. the console is restated with nothing moving ─────────────────────────
// The whole repair a level plane needs: a lost LAST value is wrong forever,
// and a periodic full statement fixes it with no ack and no retransmit queue.
{
  const g = makeCcSend();
  g.put(CUT, 64); g.put(RES, 12);
  g.tick(0);
  ok('nothing is said while nothing moves and nothing is due',
    g.tick(100) === null, 'a tick 100 ms in returned nothing');
  const r = g.tick(RESTATE_MS + 1);
  ok('the whole console is restated on its own cadence',
    !!r && r.restate === true && r.set.length === 2,
    `${r ? r.set.length : 0} controllers restated at ${RESTATE_MS} ms`);
  const both = new Map(r.set);
  ok('a restatement carries the values that are actually live',
    both.get(CUT) === 64 && both.get(RES) === 12,
    `cutoff ${both.get(CUT)}, resonance ${both.get(RES)}`);
}

// ── 8. NEGATIVE CONTROL: an empty console says nothing ─────────────────────
// A restatement of nothing is a message a page sends forever for no reason.
{
  const g = makeCcSend();
  ok('a console with nothing in it never restates',
    g.tick(0) === null && g.tick(RESTATE_MS * 3) === null,
    'two ticks, no puts, no messages');
}

// ── 9. the arithmetic against the relay's real bucket ──────────────────────
// ⚠️ THE RELAY'S CAPS ARE 1000/s AND 2000 BURST SINCE 2026-09-13, read from
// `workers/relay/src/index.js`. This is the load a two-slider sweep makes.
{
  const g = makeCcSend();
  for (let t = 0; t <= 1000; t += 4) { g.put(CUT, t & 127); g.put(RES, (t >> 1) & 127); g.tick(t); }
  const share = (g.stats.messages / 1000) * 100;
  ok('a two-handed sweep is a few per cent of the relay',
    g.stats.messages <= 60 && share < 10,
    `${g.stats.messages} messages a second, ${share.toFixed(1)}% of 1000/s`);
}

// ── 10. what was offered is what was sent or was overtaken ────────────────
// 🔴 THE COUNTER THIS CHECK EXISTS FOR WAS WRONG AND NOTHING COULD DISAGREE
// WITH IT. `thinned` counted ticks rather than values, so a page that ticks
// more often than a hand moves reported more thinning for the same gesture.
// A conservation law is what makes that visible.
{
  const g = makeCcSend();
  for (let t = 0; t <= 500; t++) {            // a hand at ~60 Hz, a pump at 100 Hz
    if (t % 16 === 0) g.put(CUT, t & 127);
    if (t % 10 === 0) g.tick(t);
  }
  g.tick(100000);                              // drain anything still held
  const st = g.stats;
  ok('offered is sent plus overtaken, with nothing unaccounted for',
    st.offered === st.sent + st.thinned,
    `${st.offered} offered = ${st.sent} sent + ${st.thinned} overtaken`);

  // NEGATIVE CONTROL, and it is the bug in one line: ticking more often must
  // not raise the count by itself, because the hand did not move any faster.
  const slow = makeCcSend();
  for (let t = 0; t <= 500; t++) {
    if (t % 16 === 0) slow.put(CUT, t & 127);
    if (t % 50 === 0) slow.tick(t);
  }
  slow.tick(100000);
  // ⚠️ THE DIRECTION IS THE CLAIM, AND WRITING IT AS "ABOUT THE SAME" WAS
  // WRONG. Draining less often really does let more values overtake each other,
  // so the two counts SHOULD differ and the slow one should be larger. What
  // must never happen is the opposite: ticking MORE often reporting MORE
  // thinning, which is what the old counter did, because it was counting the
  // page's timer rather than the hand.
  ok('ticking more often reports LESS thinning, never more',
    st.thinned <= slow.stats.thinned,
    `${st.thinned} overtaken at 100 Hz against ${slow.stats.thinned} at 20 Hz, from the same hand`);
}

console.log(`\n${pass}/${pass + fail} green${fail ? ` · ${fail} FAILED` : ''}\n`);
process.exit(fail ? 1 : 0);
