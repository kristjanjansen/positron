// rig/box/live-test.mjs — drive a running box over the REAL relay and check
// that what comes back is sound.
//
// The distinction this file exists for: "frames are arriving" and "the
// instrument is working" are different claims, and three readings in 2026-09
// confused them — a live, unmuted, enabled audio track carrying digital silence
// looks exactly like a working one from every angle except the samples. So the
// check is RMS before a note against RMS after it.
//
//   node box.mjs --room box-test &
//   node live-test.mjs --room box-test
import { format, parse, randomId, RELAY_BASE } from '../../demo/shell/wire.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const ROOM = arg('room', 'box-test');
const FROM = `test-${randomId(6)}`;
let seq = 0, pass = 0, fail = 0;
const is = (n, got, want) => { const o = got === want; o ? pass++ : fail++; console.log(`  ${o ? 'ok  ' : 'FAIL'} ${n}${o ? '' : `  got ${got}, want ${want}`}`); };
const ok = (n, cond, detail = '') => { cond ? pass++ : fail++; console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${n}${detail ? `  ${detail}` : ''}`); };

const RELAY = arg('relay', RELAY_BASE);
const ws = new WebSocket(`${RELAY}/room/${ROOM}/ws`);
ws.binaryType = 'arraybuffer';
const send = (m) => ws.send(format(m, { from: FROM, seq: seq++, by: 'tool' }));

let frames = [], replies = [], lastSeq = -1, gaps = 0;
ws.onmessage = (e) => {
  if (typeof e.data !== 'string') {
    const dv = new DataView(e.data);
    const s = dv.getUint32(0, true);
    if (lastSeq >= 0 && s !== lastSeq + 1) gaps += s - lastSeq - 1;
    lastSeq = s;
    const pcm = new Int16Array(e.data, 12);
    let sum = 0;
    for (let i = 0; i < pcm.length; i++) sum += pcm[i] * pcm[i];
    frames.push({ seq: s, rms: Math.sqrt(sum / pcm.length) / 32768, at: performance.now() });
    return;
  }
  const { kind, msg } = parse(e.data);
  if (kind === 'json' && msg.from !== FROM) replies.push(msg);
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reply = (type, ms = 3000) => new Promise((res, rej) => {
  const t0 = Date.now();
  const iv = setInterval(() => {
    const m = replies.find((r) => r.type === type);
    if (m) { clearInterval(iv); res(m); }
    else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error(`no ${type} in ${ms} ms — is a box in "${ROOM}"?`)); }
  }, 25);
});

ws.onopen = async () => {
  try {
    console.log(`room ${ROOM}\n`);
    console.log('the box answers');
    // ⚠️ THIS CHECK COULD NOT PASS BETWEEN 2026-09-16 AND 2026-09-18, AND IT
    // WAS NOT THIS FILE'S FAULT. The board's pong carried an `at` field, `at`
    // is an envelope field, `format()` throws on the collision, and the handler
    // answered `box.error` instead. So the reply never arrived and this read
    // as a board that was not there. The board sends `pongAt` now.
    // ⚠️ THE FIELD IS NOT READ HERE AND MUST NOT BE. The board's clock and this
    // process's clock share no origin, so a round trip is only measurable in
    // ONE clock: see `relay-compare.mjs`, which times it in its own.
    send({ type: 'box.ping' });
    const pong = await reply('box.pong');
    ok('box.ping -> box.pong', !!pong);

    send({ type: 'ports.get' });
    const ports = await reply('ports.list');
    ok(`ports.list has ports (backend ${ports.backend})`, ports.ports.length > 0, `${ports.ports.length} ports`);

    console.log('\nthe synth starts with nothing plugged in');
    send({ type: 'audio.start', source: 'synth' });
    const started = await reply('audio.started');
    is('audio.started ok', started.ok, true);
    is('source is the internal synth', started.source, 'synth');
    is('50 messages a second', started.msgPerSec, 50);

    // SILENCE FIRST. Without this the loud reading has nothing to be loud
    // against, and a constant hum would read as a working instrument.
    frames = [];
    await wait(700);
    const quiet = frames.slice();
    ok('frames arrive before any note', quiet.length > 20, `${quiet.length} in 700 ms`);
    const quietRms = quiet.reduce((a, f) => a + f.rms, 0) / Math.max(1, quiet.length);
    ok('and they are silent', quietRms < 0.001, `rms ${quietRms.toExponential(1)}`);

    console.log('\na note is played');
    frames = [];
    send({ type: 'note.on', note: 65, vel: 110 });
    await reply('note.ack');
    // Long enough for the decay to be visible: this note's envelope is ~1.36 s,
    // so 2.5 s leaves it at about a sixth of its peak. A 700 ms window showed
    // no decay at all and the check read as a defect in the synth.
    await wait(2500);
    const loud = frames.slice();
    const loudRms = loud.reduce((a, f) => a + f.rms, 0) / Math.max(1, loud.length);
    const peak = Math.max(...loud.map((f) => f.rms));
    // THE assertion. Everything else can pass on a stream of zeroes.
    ok('the samples carry sound', loudRms > 0.01, `rms ${quietRms.toExponential(1)} -> ${loudRms.toFixed(4)}, peak ${peak.toFixed(4)}`);
    // Measure from the ONSET, not from frame 0: the first frames here are still
    // silence, because note.on had to reach the box. Indexing a fixed frame
    // compared pre-note silence against the note and called it a failure.
    const onset = loud.findIndex((f) => f.rms > 0.01);
    const tail = loud.at(-1).rms;
    ok('a note has an onset', onset >= 0, `frame ${onset} of ${loud.length}`);
    ok('and it decays like a struck string', onset >= 0 && tail < peak * 0.5,
      `peak ${peak.toFixed(4)} -> ${tail.toFixed(4)} after ${((loud.length - onset) * 0.02).toFixed(1)}s`);

    console.log('\nthe stream itself');
    const span = (frames.at(-1).at - quiet[0].at) / 1000;
    const rate = (quiet.length + loud.length) / span;
    ok('about 50 frames a second', Math.abs(rate - 50) < 6, `${rate.toFixed(1)}/s over ${span.toFixed(1)}s`);
    is('nothing was dropped', gaps, 0);

    send({ type: 'note.panic' });
    send({ type: 'audio.stop' });
    const stopped = await reply('audio.stopped');
    is('stops cleanly', stopped.ok, true);

    console.log(`\n${pass}/${pass + fail} green`);
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.error('\n' + e.message);
    process.exit(1);
  }
};
