// rig/box/cc-test.mjs — does a controller move the SOUND, or only the counters?
//
//   node rig/box/cc-test.mjs --room studio-1
//   node rig/box/cc-test.mjs --room studio-1 --bank 95 --program 6
//
// 🔴 STEP 0 OF `plan-controller.md`, AND IT IS THAT PLAN'S OWN LOAD-BEARING
// UNKNOWN. `/knobs/` can be green in every cell it has and still be a page
// where nothing happens: the send gate is graded with no browser, the relay
// echoes what it delivered, and the board reports what it wrote to the synth.
// All three can read correct while the patch quietly ignores CC 74, because a
// synth's answer to a controller it does not map is to carry on playing exactly
// as it was. No error, no silence, nothing on the wire. That is the same shape
// `yoshimi-test.mjs` was written for, where a program change onto an empty slot
// was indistinguishable from one onto a full one.
//
// So this checks by ear, in the only way a script can: hold one note, move one
// controller, and ask whether the BRIGHTNESS of what comes back moved with it.
// `measure().centroid` is the spectral centroid of the captured audio, which is
// what a filter sweep changes and what a volume change does not.
//
// ⚠️ IT INCLUDES THE NEGATIVE CONTROL, because a difference test that cannot
// fail is not a test: the same patch, the same note, the controller UNCHANGED,
// measured twice. That pair has to come back SAME, and its distance is printed,
// so every threshold below can be read against the floor it sits on rather than
// against a number somebody picked.
//
// ⚠️ THIS TOUCHES A SHARED INSTRUMENT IN ANOTHER BUILDING. It starts audio if
// nothing is playing, holds a note for a few seconds at a time, and puts the
// controller back where it found it. Run it when a person says the board is
// free.
import { format, parse, randomId, RELAY_BASE } from '../../demo/shell/wire.mjs';
import { measure, distance } from './measure.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const ROOM = arg('room', 'studio-1');
const BANK = Number(arg('bank', 95));
const PROGRAM = Number(arg('program', 6));      // 95/6 is `Analog Filter 1`
const NOTE = Number(arg('note', 40));
const CTRL = Number(arg('ctrl', 74));           // 74 cutoff, 71 resonance
const FROM = `cc-${randomId(6)}`;
let seq = 0, pass = 0, fail = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${n}${d ? `  ${d}` : ''}`); };

const ws = new WebSocket(`${arg('relay', RELAY_BASE)}/room/${ROOM}/ws`);
ws.binaryType = 'arraybuffer';
const send = (m) => { const id = randomId(); ws.send(format(m, { from: FROM, seq: seq++, id })); return id; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let frames = [], replies = [];
ws.onmessage = (e) => {
  if (typeof e.data !== 'string') { frames.push(new Int16Array(e.data.slice(12))); return; }
  const { kind, msg } = parse(e.data);
  if (kind === 'json' && msg.from !== FROM) replies.push(msg);
};
const reply = (t, ms = 9000, pick = () => true) => new Promise((res, rej) => {
  const t0 = Date.now();
  const iv = setInterval(() => {
    const m = replies.find((r) => r.type === t && pick(r));
    if (m) { clearInterval(iv); res(m); } else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error(`no ${t} in ${ms} ms — is a box in "${ROOM}"?`)); }
  }, 25);
});
const answer = (id, type, ms = 9000) => reply(type, ms, (r) => r.re === id);

/** Hold the note with the controller at `v`, and measure what comes back. */
async function at(v, { hold = 1500 } = {}) {
  send({ type: 'ctl.set', channel: 0, set: [[CTRL, v]] });
  await wait(250);                       // the board drains every 5 ms; this is the synth's own settle
  frames = [];
  send({ type: 'note.on', channel: 0, note: NOTE, vel: 110 });
  await wait(hold);
  const m = measure(frames);
  send({ type: 'note.off', channel: 0, note: NOTE });
  send({ type: 'note.panic' });
  await wait(900);                       // a tail outlives the note
  return m;
}
const octaves = (a, b) => Math.abs(Math.log2(Math.max(1, a.centroid) / Math.max(1, b.centroid)));

ws.onopen = async () => {
  try {
    console.log(`room ${ROOM} · bank ${BANK} program ${PROGRAM} · note ${NOTE} · CC ${CTRL}\n`);
    // ⚠️ `audio.status` ANSWERS `audio.started`, NOT `audio.status`. Asking for
    // the name of the question rather than the name of the answer is nine
    // seconds of silence and a report that no board is in the room.
    const st = await answer(send({ type: 'audio.status' }), 'audio.started');
    console.log(`the board says: ${st.source || 'nothing'} playing`);
    if (!st.source) {
      await answer(send({ type: 'audio.start', source: 'yoshimi' }), 'audio.started', 30000);
      await wait(2500);
    }
    send({ type: 'voice.select', channel: 0, bank: BANK, program: PROGRAM });
    await wait(900);                     // an .xiz comes off an SD card

    // ── the negative control FIRST, so the floor is known before any claim ──
    console.log('\nthe floor: the same patch, the same note, the controller unmoved');
    const a1 = await at(64);
    const a2 = await at(64);
    const floor = distance(a1, a2);
    console.log(`      twice at 64            centroid ${a1.centroid.toFixed(0)} Hz then ${a2.centroid.toFixed(0)} Hz · ${octaves(a1, a2).toFixed(2)} octaves apart`);
    ok('an unmoved controller measures the SAME twice', octaves(a1, a2) < 0.25,
      `${octaves(a1, a2).toFixed(2)} octaves of drift, and the claims below need more than that`);

    // ── the sweep ────────────────────────────────────────────────────────
    console.log(`\nCC ${CTRL}, five positions`);
    const steps = [0, 32, 64, 96, 127];
    const got = [];
    for (const v of steps) {
      const m = await at(v);
      got.push({ v, m });
      console.log(`      ${String(v).padStart(3)}                    peak ${m.peak.toFixed(4)} · centroid ${m.centroid.toFixed(0)} Hz`);
    }
    const cents = got.map((g) => g.m.centroid);
    const up = cents.every((c, i) => i === 0 || c >= cents[i - 1] * 0.97);
    const down = cents.every((c, i) => i === 0 || c <= cents[i - 1] * 1.03);
    const span = octaves(got[got.length - 1].m, got[0].m);
    ok('the controller moves the brightness at all', span > 0.25,
      `${span.toFixed(2)} octaves between 0 and 127, against a floor of ${octaves(a1, a2).toFixed(2)}`);
    ok('and it moves it MONOTONICALLY', up || down,
      up ? 'brighter all the way up' : down ? 'darker all the way up' : `not in one direction: ${cents.map((c) => c.toFixed(0)).join(' -> ')} Hz`);
    ok('by at least an octave, which is a filter rather than a tint', span >= 1,
      `${span.toFixed(2)} octaves`);

    send({ type: 'ctl.set', channel: 0, set: [[CTRL, 64]] });   // put it back where it was
    await wait(300);
    console.log(`\n${pass}/${pass + fail} green${fail ? ` · ${fail} FAILED` : ''}\n`);
    ws.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.error(`\n${e.message}\n`);
    try { send({ type: 'note.panic' }); } catch { /* the socket may be gone */ }
    ws.close();
    process.exit(1);
  }
};
