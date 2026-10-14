// node relay-compare.mjs --room r [--relay ws://localhost:8895]: one board, two relays.
// ping (board.ping to pong) and sound (note.on to first loud frame), both timed in this process's
// clock, since the board's clock shares no origin with it.
// why: lessons/rig-board-tests.md#relay-compare-header
import { format, parse, randomId, RELAY_BASE } from '../../demo/shell/wire.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const ROOM = arg('room', 'cmp'), RELAY = arg('relay', RELAY_BASE), N = +arg('n', 12);
const FROM = `cmp-${randomId(6)}`;
let seq = 0;
const ws = new WebSocket(`${RELAY}/room/${ROOM}/ws`);
ws.binaryType = 'arraybuffer';
const send = (m) => ws.send(format(m, { from: FROM, seq: seq++, by: 'tool' }));

let replies = [], onFrame = null;
ws.onmessage = (e) => {
  if (typeof e.data !== 'string') {
    const pcm = new Int16Array(e.data, 12);
    let s = 0; for (let i = 0; i < pcm.length; i++) s += pcm[i] * pcm[i];
    onFrame?.(Math.sqrt(s / pcm.length) / 32768);
    return;
  }
  const { kind, msg } = parse(e.data);
  if (kind === 'json' && msg.from !== FROM) replies.push(msg);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reply = (t, ms = 6000) => new Promise((res, rej) => {
  const t0 = Date.now();
  const iv = setInterval(() => {
    const m = replies.find((r) => r.type === t);
    if (m) { clearInterval(iv); res(m); } else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error(`no ${t}`)); }
  }, 5);
});
const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return { median: s[Math.floor(s.length / 2)], min: s[0], p95: s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] };
};
const fmt = (o) => `median ${o.median.toFixed(1)} ms · min ${o.min.toFixed(1)} · p95 ${o.p95.toFixed(1)}`;

ws.onopen = async () => {
  try {
    console.log(`${RELAY}  room ${ROOM}\n`);
    send({ type: 'board.ping' }); await reply('board.pong');

    const pings = [];
    for (let i = 0; i < N; i++) {
      replies = [];
      const t0 = performance.now();
      send({ type: 'board.ping' });
      await reply('board.pong');
      pings.push(performance.now() - t0);
      await wait(60);
    }
    console.log(`  ping   ${fmt(stats(pings))}`);

    send({ type: 'audio.start', source: 'synth' });
    await reply('audio.started');
    await wait(600);

    const sounds = [];
    let discarded = 0;
    for (let i = 0; i < N; i++) {
      // Wait for confirmed quiet or discard the round: a ringing tail reads as an impossible 0.9 ms
      // onset.
      // why: lessons/rig-board-tests.md#relay-compare-quiet
      let quiet = 0, sawQuiet = false;
      await new Promise((res) => {
        const t = setTimeout(() => { onFrame = null; res(); }, 3000);
        onFrame = (rms) => {
          if (rms < 0.004) { if (++quiet > 6) { sawQuiet = true; onFrame = null; clearTimeout(t); res(); } }
          else quiet = 0;
        };
      });
      if (!sawQuiet) { discarded++; send({ type: 'note.panic' }); await wait(400); continue; }
      const t0 = performance.now();
      const t = await new Promise((res) => {
        onFrame = (rms) => { if (rms > 0.02) { onFrame = null; res(performance.now() - t0); } };
        send({ type: 'note.on', note: 60 + (i % 5), vel: 110 });
        setTimeout(() => { onFrame = null; res(null); }, 3000);
      });
      if (t !== null) sounds.push(t);
    }
    console.log(`  sound  ${sounds.length ? fmt(stats(sounds)) : 'no onsets seen'}   (${sounds.length}/${N} kept${discarded ? `, ${discarded} discarded — never went quiet` : ''})`);
    // One frame is 20 ms, and the note must cross the wire twice. Anything
    // under that is not a latency, it is a collector bug.
    if (sounds.length && Math.min(...sounds) < 5) console.log('  ⚠️  a sub-5 ms onset survived — the baseline is still not clean');
    send({ type: 'note.panic' }); send({ type: 'audio.stop' });
    await wait(300);
    process.exit(0);
  } catch (e) { console.error(e.message); process.exit(1); }
};
