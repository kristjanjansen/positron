// demo/shell/board-collide-test.mjs: board-collide.mjs against the stand-in board.
//
//   node demo/shell/board-collide-test.mjs
//
// plans/plan-pi-supercollider-defs.md step 2. No browser and no Pi: the
// stand-in (`demo/fake-board.mjs`) on a relay of its own on 127.0.0.1, its
// clock pushed 230 to 270 ms away from this machine's, answering through the
// board's own `rig/board/scollide.mjs` over a fake scsynth that counts, on its
// side of the wire, how early each bundle arrived.
//
// WHAT IS MEASURED, and what would make each row go red:
//   - the offset this module finds against the injected skew (clock/020 found
//     one to within 2.4 ms; the bar here is 5 ms on a loopback relay);
//   - a drum pattern at 120 bpm handed over at AHEAD 250, the hits handed over
//     against the hits the stand-in started, and `late` and `droppedLate` 0;
//   - SABOTAGE 1: AHEAD 10 makes the board count late or dropped hits;
//   - SABOTAGE 2: the estimator's sign flipped puts every `at` about twice the
//     skew out, and the board drops every hit as too old;
//   - `same: true` for every program: this tab's WebCrypto hash against the
//     board's node:crypto hash of its own compile.
// ⚠️ A LOOPBACK RELAY IS ~1 ms, so this grades the arithmetic and the verbs,
// never the relay's tail. Step 6 on the Pi is what reads `late` over 1000 hits.

import { startBoard } from '../fake-board.mjs';
import { format, parse, randomId } from './wire.mjs';
import { createBoardCollide, AHEAD } from './board-collide.mjs';
import { skewSample } from '../../proto/looper/peer.mjs';
import { voices } from '../drums/voices.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? `  (${detail})` : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n         ${detail}` : ''}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A board handle over a socket: `ask` and `send`, as createBoard has. */
async function socketBoard(url, room) {
  const ws = new WebSocket(`${url}/room/${room}/ws`);
  const from = `tab-${randomId(6)}`;
  let seq = 0;
  const waiters = [];
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = (e) => {
    if (typeof e.data !== 'string' || e.data === 'pong') return;
    const { kind, msg } = parse(e.data);
    if (kind !== 'json' || msg.from === from) return;
    for (let i = waiters.length - 1; i >= 0; i--) {
      const w = waiters[i];
      if (w.type === msg.type && msg.re === w.id) { clearTimeout(w.timer); waiters.splice(i, 1); w.resolve(msg); }
    }
  };
  const send = (msg) => { const id = randomId(); ws.send(format({ ...msg, id }, { from, seq: seq++, id, by: 'tool' })); return id; };
  const ask = (msg, type, ms) => new Promise((resolve) => {
    const id = send(msg);
    const w = { id, type, resolve, timer: setTimeout(() => { waiters.splice(waiters.indexOf(w), 1); resolve(null); }, ms) };
    waiters.push(w);
  });
  return { ask, send, close: () => ws.close() };
}

/**
 * The drum machine's scheduler, as `drum-machine.mjs` runs it: every TICK, hand
 * over every step due before now + ahead, one message per step.
 */
async function play(kit, { ahead, bars = 2, bpm = 120 }) {
  const PATTERN = { kick: [0, 4, 8, 12], snare: [4, 12], hhc: [0, 2, 6, 8, 10, 14], hho: [3, 11] };
  const stepMs = 60000 / (bpm * 4), TICK = 25, steps = 16 * bars;
  const t0 = performance.now() + 50;
  let next = 0, sent = 0;
  while (next < steps) {
    const horizon = performance.now() + ahead;
    while (next < steps && t0 + next * stepMs < horizon) {
      const s = next % 16, perfAt = t0 + next * stepMs;
      const list = Object.entries(PATTERN).filter(([, at]) => at.includes(s))
        .map(([name]) => ({ name, perfAt, ...(name === 'hhc' ? { choke: 'hho' } : {}) }));
      if (list.length) { kit.hits(list); sent += list.length; }
      next++;
    }
    await sleep(TICK);
  }
  await sleep(ahead + 500);
  return sent;
}

async function run({ skewMs, ahead, sabotageSign = false, label }) {
  const fb = startBoard({ port: 0, quiet: true, skewMs });
  try {
    const url = await fb.ready;
    const board = await socketBoard(url, 'studio-1');
    const skew = sabotageSign ? (t0, t1, t2) => { const r = skewSample(t0, t1, t2); return { ...r, offset: -r.offset }; } : skewSample;
    const kit = createBoardCollide({ board, skew });
    const st = await kit.start();
    const loads = [];
    for (const v of voices()) loads.push(await kit.load(v.name, v.program));
    await kit.burst(10);
    const handed = await play(kit, { ahead });
    const stats = await kit.stats();
    const far = fb.stats().collide.scsynth;
    board.close();
    return { label, skewMs, ahead, started: st?.ok, loads, offset: kit.offset(), rtt: kit.rtt(), handed: kit.handed(), sent: handed, stats, far };
  } finally { fb.close(); }
}

const skewMs = 230 + Math.random() * 40;
console.log(`board-collide against the stand-in, its clock ${skewMs.toFixed(1)} ms ahead of this machine's`);

const a = await run({ skewMs, ahead: AHEAD.relay, label: 'AHEAD 250' });
ok('the collide engine starts on the stand-in', a.started === true);
ok('all four drums load, and the board\'s bytes are this tab\'s (same: true)', a.loads.every((r) => r?.ok && r.same === true),
  a.loads.map((r) => `${r?.name} ${r?.same}`).join(', '));
const err = Math.abs(a.offset - skewMs);
ok('the offset found is the injected skew, within 5 ms', err < 5, `found ${a.offset.toFixed(2)} ms against ${skewMs.toFixed(2)}, error ${err.toFixed(2)} ms at a ${a.rtt.toFixed(2)} ms round trip`);
ok('every hit handed over was started by the stand-in', a.handed === a.sent && a.far.started === a.handed && a.stats.started === a.handed,
  `handed ${a.handed}, board started ${a.stats.started}, fake scsynth started ${a.far.started}`);
ok('at AHEAD 250, late 0 and dropped 0 on the board, and no bundle arrived after its time', a.stats.late === 0 && a.stats.droppedLate === 0 && a.far.lateAtServer === 0,
  `late ${a.stats.late}, droppedLate ${a.stats.droppedLate}, lateAtServer ${a.far.lateAtServer}, lead ${a.far.minLeadMs?.toFixed(1)} to ${a.far.maxLeadMs?.toFixed(1)} ms`);
ok('the closed hat choked the open hat on the board', a.stats.chokes > 0, `${a.stats.chokes} chokes`);

const b = await run({ skewMs, ahead: 10, label: 'SABOTAGE AHEAD 10' });
ok('SABOTAGE: at AHEAD 10 the board counts late or dropped hits', b.stats.late + b.stats.droppedLate > 0,
  `late ${b.stats.late}, droppedLate ${b.stats.droppedLate} of ${b.handed}, lead ${b.far.minLeadMs?.toFixed(1)} to ${b.far.maxLeadMs?.toFixed(1)} ms`);

const c = await run({ skewMs, ahead: AHEAD.relay, sabotageSign: true, label: 'SABOTAGE SIGN' });
ok('SABOTAGE: with the offset\'s sign flipped every at is about twice the skew out, and every hit is dropped',
  c.stats.droppedLate === c.handed && c.stats.started === 0 && Math.abs(c.offset + skewMs) < 5,
  `offset ${c.offset.toFixed(1)} ms, droppedLate ${c.stats.droppedLate} of ${c.handed}, started ${c.stats.started}`);

console.log(`\n${pass}/${pass + fail} green`);
process.exit(fail ? 1 : 0);
