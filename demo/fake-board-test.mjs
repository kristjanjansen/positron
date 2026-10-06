// demo/fake-board-test.mjs: the stand-in relay and board, graded with no browser.
//
//   node demo/fake-board-test.mjs
//
// Opens nothing off this machine: every socket is to a relay it starts on
// 127.0.0.1 with a port the OS picks.
//
// NEGATIVE CONTROLS, 9 of them, written so the bug they name fails them:
//   - `relayOverride` refuses a public host, an http URL, a path, and nothing
//   - a SILENT board's frames fail the same pulse test a working one passes
//   - a board whose MIDI port is gone counts nothing and says why
//   - B never sees A's `ping`, and a third socket is refused at maxSockets
//   - a `-full` room never opens and its stats say full

import { relayOverride } from './shell/wire.mjs';
import { startRelay } from './fake-relay.mjs';
import { startBoard, toneFrame, RATE, FRAME, loopbackRelay } from './fake-board.mjs';
import { graphProblem } from './shell/graph-registry.mjs';

let pass = 0, fail = 0;
const ok = (label, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok    ${label}${detail ? `  (${detail})` : ''}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail ? `  (${detail})` : ''}`); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** A client: joins, keeps everything it heard, can wait for a message. */
function join(base, room) {
  const heard = [], bins = [];
  const ws = new WebSocket(`${base}/room/${room}/ws`);
  ws.binaryType = 'arraybuffer';
  let id = 0;
  const opened = new Promise((res, rej) => { ws.onopen = () => res(true); ws.onerror = () => res(false); });
  ws.onmessage = (e) => {
    if (typeof e.data === 'string') { heard.push(e.data === 'pong' ? 'pong' : JSON.parse(e.data)); }
    else bins.push(e.data);
  };
  const send = (msg) => { const m = { id: `t${++id}`, from: 'test', sent: Date.now(), seq: id, ...msg }; ws.send(JSON.stringify(m)); return m.id; };
  const answer = async (type, re, ms = 3000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const m = heard.find((x) => x && x.type === type && (re == null || x.re === re));
      if (m) return m;
      await wait(20);
    }
    return null;
  };
  return { ws, heard, bins, opened, send, answer, close: () => ws.close() };
}

/** Peak of each frame, from the raw relay bytes (12 byte header, then int16). */
const peaks = (bins) => bins.map((b) => {
  const s = new Int16Array(b, 12);
  let hi = 0; for (const v of s) { const a = Math.abs(v) / 32768; if (a > hi) hi = a; }
  return hi;
});
/** Does it pulse: loud frames AND quiet-but-not-silent frames. */
const pulses = (p) => p.some((x) => x > 0.45) && p.some((x) => x > 0.2 && x < 0.35);

// ── wire.mjs ?relay= ─────────────────────────────────────────────────────────
console.log('\n[relayOverride]');
ok('a loopback ws:// relay is taken', relayOverride('?relay=ws://127.0.0.1:8897') === 'ws://127.0.0.1:8897');
ok('localhost and a trailing slash are taken', relayOverride('?relay=ws://localhost:9/') === 'ws://localhost:9');
ok('NEGATIVE: a public host is refused', relayOverride('?relay=wss://evil.example') === null);
ok('NEGATIVE: an http URL is refused', relayOverride('?relay=http://127.0.0.1:8897') === null);
ok('NEGATIVE: a path is refused', relayOverride('?relay=ws://127.0.0.1:8897/room/x') === null && relayOverride('') === null);
ok('the fake board refuses a relay off this machine', !loopbackRelay('wss://ws.positron.studio') && loopbackRelay('ws://127.0.0.1:1'));

// ── the tone, pure ───────────────────────────────────────────────────────────
console.log('\n[tone]');
const pk = (f) => Math.max(...f.map(Math.abs)) / 32768;
const on = pk(toneFrame(Math.round(0.1 * RATE))), off = pk(toneFrame(Math.round(0.3 * RATE)));
ok('a frame in the pulse is louder than one between pulses', on > 0.45 && off > 0.2 && off < 0.35, `${on.toFixed(3)} against ${off.toFixed(3)}`);
ok('the pulse is where it should be, so a reversal can be told', pk(toneFrame(Math.round(0.6 * RATE))) > 0.45 && pk(toneFrame(Math.round(0.8 * RATE))) < 0.35);
ok('NEGATIVE: silent frames are zero and fail the pulse test', pk(toneFrame(0, FRAME, { silent: true })) === 0
  && !pulses([0, 0, 0]));

// ── the relay ────────────────────────────────────────────────────────────────
console.log('\n[fake-relay]');
const relay = startRelay({ port: 0, quiet: true, maxSockets: 2 });
await new Promise((r) => relay.on('listening', r));
const R = `ws://127.0.0.1:${relay.address().port}`;
const a = join(R, 'r1'), b = join(R, 'r1');
await Promise.all([a.opened, b.opened]);
a.send({ type: 'hello.test' });
a.ws.send('ping');
a.ws.send(new Uint8Array([1, 2, 3]).buffer);
await wait(200);
ok('a message reaches the other socket', b.heard.some((m) => m?.type === 'hello.test'));
ok('and comes back to its sender, as the relay echoes', a.heard.some((m) => m?.type === 'hello.test'));
ok('ping is answered pong to the sender', a.heard.includes('pong'));
ok('NEGATIVE: the other socket never sees the ping or the pong', !b.heard.includes('pong') && !b.heard.includes('ping'));
ok('binary is relayed unchanged', b.bins.length === 1 && new Uint8Array(b.bins[0]).join() === '1,2,3');
const c = join(R, 'r1');
ok('NEGATIVE: a third socket is refused at maxSockets 2', (await c.opened) === false);
const st = await (await fetch(`${R.replace('ws', 'http')}/room/r1/stats`)).json();
ok('stats speak the relay shape', st.sockets === 2 && st.limits.maxSockets === 2 && st.limits.msgPerSec === 1000, JSON.stringify({ sockets: st.sockets }));
const f = join(R, 'x-full');
const fst = await (await fetch(`${R.replace('ws', 'http')}/room/x-full/stats`)).json();
ok('NEGATIVE: a -full room never opens and its stats say full', (await f.opened) === false && fst.sockets >= fst.limits.maxSockets);
a.close(); b.close();
relay.close();

// ── the board ────────────────────────────────────────────────────────────────
async function board(opts = {}) {
  const bd = startBoard({ port: 0, quiet: true, beatMs: 1000, ...opts });
  const url = await bd.ready;
  return { bd, url };
}

console.log('\n[fake-board, main room]');
{
  const { bd, url } = await board();
  const p = join(url, 'studio-1');
  await p.opened;
  const g = await p.answer('board.alive', null, 500) || (p.send({ type: 'graph.ask' }), await p.answer('board.alive', null, 2000));
  ok('graph.ask is answered with a beat carrying a readable graph', !!g?.graph && graphProblem(g.graph) === '', g?.graph ? `${g.graph.ports.length} ports` : 'no beat');
  const cin = g?.graph?.ports.find((x) => x.id === 'studio-1:circuit:in');
  ok('the Circuit input refuses SysEx in the graph, the never class', cin?.never?.includes('sysex'));
  ok('no GPU is announced, because the stand-in sends no picture', !g?.graph?.ports.some((x) => x.medium === 'video'));
  const id = p.send({ type: 'audio.start', source: 'yoshimi' });
  const r = await p.answer('audio.started', id);
  ok('audio.start answers audio.started in its own name', r?.ok === true && r.source === 'yoshimi');
  await wait(1100);
  const pp = peaks(p.bins);
  const seqs = p.bins.map((x) => new DataView(x).getUint32(0, true));
  ok('frames arrive at about fifty a second, 960 samples each', p.bins.length >= 45 && p.bins.every((x) => x.byteLength === 12 + FRAME * 2), `${p.bins.length} in 1.1 s`);
  ok('in sequence with no gaps', seqs.every((s, i) => i === 0 || s === seqs[i - 1] + 1));
  ok('and the sound in them pulses', pulses(pp), `peaks ${Math.min(...pp).toFixed(2)} to ${Math.max(...pp).toFixed(2)}`);
  p.send({ type: 'ctl.set', channel: 0, set: [[74, 10], [74, 20], [71, 5]] });
  const mid = p.send({ type: 'ctl.meter' });
  const m = await p.answer('ctl.meter', mid);
  ok('ctl.set is counted on the board side, folds included', m?.in === 3 && m.out === 2 && m.folded === 1, JSON.stringify(m && { in: m.in, out: m.out, folded: m.folded }));
  p.close(); bd.close();
}

console.log('\n[fake-board, input room]');
{
  const { bd, url } = await board();
  const p = join(url, 'studio-1-circuit');
  await p.opened;
  const w = p.send({ type: 'input.want' });
  const r = await p.answer('input.wanted', w);
  ok('input.want takes a lease and starts the capture', r?.ok === true && r.started === true && r.leaseLeftMs > 50_000, `${r?.leaseLeftMs} ms`);
  await wait(800);
  ok('the input streams the pulsing tone', pulses(peaks(p.bins)), `${p.bins.length} frames`);
  p.send({ type: 'midi.send', bytes: [0x90, 60, 100] });
  p.send({ type: 'midi.send', bytes: [0x80, 60, 0] });
  const sx = p.send({ type: 'midi.send', bytes: [0xF0, 0x7E, 0x7F] });
  const refused = await p.answer('midi.refused', sx);
  ok('SysEx is refused by the board\'s own gate, with a reason', !!refused?.why, refused?.why);
  const s = p.send({ type: 'audio.status' });
  const st2 = await p.answer('audio.started', s);
  ok('the board counts what it WROTE and says so in its status', st2?.midi?.out === 2 && st2.midi.refused === 1 && bd.stats().midiWritten === 2,
    JSON.stringify(st2?.midi));
  p.close(); bd.close();
}

console.log('\n[fake-board, sabotaged]');
{
  const { bd, url } = await board({ silent: true, portGone: true });
  const p = join(url, 'studio-1-circuit');
  await p.opened;
  await p.answer('input.wanted', p.send({ type: 'input.want' }));
  await wait(600);
  ok('NEGATIVE: a silent board streams frames that fail the pulse test', p.bins.length > 10 && !pulses(peaks(p.bins)), `${p.bins.length} frames, peak ${Math.max(0, ...peaks(p.bins))}`);
  const n = p.send({ type: 'midi.send', bytes: [0x90, 60, 100] });
  const why = await p.answer('midi.refused', n);
  const st3 = await p.answer('audio.started', p.send({ type: 'audio.status' }));
  ok('NEGATIVE: a board whose port is gone counts nothing and says why', st3?.midi?.out === 0 && /could not be written/.test(why?.why || ''), why?.why);
  p.close(); bd.close();
}

console.log('\n[fake-board, a listener elsewhere]');
{
  const { bd, url } = await board({ listening: true });
  const p = join(url, 'studio-1-circuit');
  await p.opened;
  await wait(800);
  ok('with listening, frames arrive without this client asking', p.bins.length > 20, `${p.bins.length} frames`);
  p.close(); bd.close();
}

console.log(`\n${pass}/${pass + fail} ok`);
process.exit(fail ? 1 : 0);
