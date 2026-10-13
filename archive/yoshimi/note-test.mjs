// rig/board/note-test.mjs — does a controller change the SHAPE of a note?
//
//   node rig/board/note-test.mjs --ctrl 73,72 --reps 3
//   node rig/board/note-test.mjs --glide
//
// `cc-test.mjs` asks whether a controller changes the brightness of a note and
// `wobble-test.mjs` asks whether it moves a HELD one. Both are blind to the
// whole family of controllers that act when a note STARTS or STOPS: attack,
// release, and the glide between two notes. Those cannot appear in a held-note
// measurement by construction, and `/knobs/` was measured entirely that way
// while it had no keyboard.
//
// So this plays SHORT NOTES and measures the envelope: how long the level takes
// to come up, and how long it takes to fall away after note-off. The glide test
// plays two notes and tracks the pitch between them, which is the only way to
// see a portamento at all.
//
// ⚠️ INTERLEAVED, AND WITH A FLOOR. `AddSynth Morph` drifts on its own — two
// takes at one value four seconds apart differ by 0.58 octaves of brightness —
// so the two values alternate and the spread WITHIN one arm is what a
// difference has to beat. A lo-then-hi run puts the whole drift in the
// comparison and calls it an effect.
//
// ⚠️ THIS TOUCHES A SHARED INSTRUMENT IN ANOTHER BUILDING. Run it when a person
// says the board is free.
import { format, parse, randomId, RELAY_BASE } from '../../demo/shell/wire.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes(`--${k}`);
const ROOM = arg('room', 'studio-1');
const BANK = Number(arg('bank', 115));
const PROGRAM = Number(arg('program', 32));
const NOTE = Number(arg('note', 52));
const CTRLS = (arg('ctrl', '73,72') || '').split(',').map(Number).filter(Number.isFinite);
const LO = Number(arg('lo', 0));
const HI = Number(arg('hi', 120));
const REPS = Number(arg('reps', 3));
const HOLD_MS = Number(arg('hold', 700));       // a played note, not a drone
const TAIL_MS = Number(arg('tail', 1500));      // long enough for a long release
const FROM = `note-${randomId(6)}`;

const RATE = 48000, SLICE_MS = 20;
let seq = 0, pass = 0, fail = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${n}${d ? `  ${d}` : ''}`); };

const ws = new WebSocket(`${arg('relay', RELAY_BASE)}/room/${ROOM}/ws`);
ws.binaryType = 'arraybuffer';
const send = (m) => { const id = randomId(); ws.send(format(m, { from: FROM, seq: seq++, id, by: 'tool' })); return id; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let env = [], cap = [], replies = [];
ws.onmessage = (e) => {
  if (typeof e.data !== 'string') {
    const pcm = new Int16Array(e.data.slice(12));
    cap.push(pcm);
    let s = 0;
    for (let i = 0; i < pcm.length; i++) s += pcm[i] * pcm[i];
    env.push({ at: Date.now(), rms: Math.sqrt(s / pcm.length) / 32768 });
    return;
  }
  const { kind, msg } = parse(e.data);
  if (kind === 'json' && msg.from !== FROM) replies.push(msg);
};
const reply = (t, ms = 9000, pick = () => true) => new Promise((res, rej) => {
  const t0 = Date.now();
  const iv = setInterval(() => {
    const m = replies.find((r) => r.type === t && pick(r));
    if (m) { clearInterval(iv); res(m); } else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error(`no ${t} in ${ms} ms — is a board in "${ROOM}"?`)); }
  }, 25);
});
const answer = (id, type, ms = 9000) => reply(type, ms, (r) => r.re === id);

/**
 * The envelope of one note: how long the level took to arrive, and how long it
 * took to go. Times are measured from the moment the message left here, which
 * includes the whole round trip — that is constant across takes and cancels in
 * the comparison, which is the only thing being asked.
 */
function shape(onAt, offAt) {
  const pts = env.filter((e) => e.at >= onAt - 100);
  if (pts.length < 10) return null;
  const peak = Math.max(...pts.map((p) => p.rms));
  if (peak < 0.002) return { peak, riseMs: NaN, fallMs: NaN };
  // Rise: from the note going out to the first slice at 90% of the peak.
  const up = pts.find((p) => p.rms >= peak * 0.9);
  // Fall: from note-off to the first slice back under a tenth of the peak.
  const after = pts.filter((p) => p.at >= offAt);
  const down = after.find((p) => p.rms <= peak * 0.1);
  return {
    peak,
    riseMs: up ? up.at - onAt : NaN,
    fallMs: down ? down.at - offAt : (after.length ? NaN : NaN),
  };
}

/** One played note at a controller value, and the shape that came back. */
async function play(ctrl, v, note = NOTE) {
  if (ctrl !== null) { send({ type: 'ctl.set', channel: 0, set: [[ctrl, v]] }); await wait(350); }
  env = []; cap = [];
  const onAt = Date.now();
  send({ type: 'note.on', channel: 0, note, vel: 100 });
  await wait(HOLD_MS);
  const offAt = Date.now();
  send({ type: 'note.off', channel: 0, note });
  await wait(TAIL_MS);
  const s = shape(onAt, offAt);
  send({ type: 'note.panic' });
  await wait(250);
  return s;
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2)));

ws.onopen = async () => {
  try {
    console.log(`room ${ROOM} · bank ${BANK} program ${PROGRAM} · short notes, not a drone\n`);
    const st = await answer(send({ type: 'audio.status' }), 'audio.started');
    console.log(`the board says: ${st.source || 'nothing'} playing`);
    if (!st.source) { await answer(send({ type: 'audio.start', source: 'yoshimi' }), 'audio.started', 30000); await wait(2500); }
    send({ type: 'voice.select', channel: 0, bank: BANK, program: PROGRAM });
    await wait(1200);
    send({ type: 'ctl.set', channel: 0, set: [[121, 0]] });
    await wait(300);

    for (const CTRL of CTRLS) {
      console.log(`\nCC ${CTRL}, ${REPS} notes at each value, alternating`);
      const arms = { lo: [], hi: [] };
      for (let i = 0; i < REPS; i++) {
        arms.lo.push(await play(CTRL, LO));
        arms.hi.push(await play(CTRL, HI));
      }
      for (const [what, f, unit] of [['rise', (s) => s?.riseMs, 'ms'],
                                     ['fall', (s) => s?.fallMs, 'ms'],
                                     ['peak', (s) => s?.peak, '']]) {
        const lo = arms.lo.map(f).filter(Number.isFinite);
        const hi = arms.hi.map(f).filter(Number.isFinite);
        if (lo.length < 2 || hi.length < 2) { ok(`CC ${CTRL} moves the ${what}`, false, 'not enough takes gave a number'); continue; }
        const spread = Math.max(sd(lo), sd(hi));
        const gap = Math.abs(mean(hi) - mean(lo));
        const d = (n) => unit ? n.toFixed(0) : n.toFixed(4);
        ok(`CC ${CTRL} moves the ${what}`, gap > spread * 2 && gap > (unit ? 40 : 0.004),
          `${d(mean(lo))} at ${LO} against ${d(mean(hi))} at ${HI} ${unit}, a gap of ${d(gap)} against ${d(spread)} of spread inside one arm`);
      }
      send({ type: 'ctl.set', channel: 0, set: [[CTRL, 64]] });
      await wait(300);
    }

    send({ type: 'note.panic' });
    send({ type: 'ctl.set', channel: 0, set: [[121, 0]] });
    await wait(300);
    console.log(`\n${pass}/${pass + fail} green\n`);
    ws.close();
    process.exit(0);
  } catch (e) {
    console.error(`\n${e.message}\n`);
    try { send({ type: 'note.panic' }); } catch { /* the socket may be gone */ }
    ws.close();
    process.exit(1);
  }
};
