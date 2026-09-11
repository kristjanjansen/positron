// rig/box/pappus-live.mjs — drive a box running Pappus and check that the die,
// the drift and the 1965 material move the SOUND.
//
//   node box.mjs --room studio-1          (on the board; it is the service)
//   node pappus-live.mjs --room studio-1  (from anywhere)
//
// The claim under test is not "OSC was sent". Nothing downstream of the socket
// answers: sclang takes a message for a command that does not exist, or a value
// out of range, and says nothing at all — so a roll that changed everything and
// a roll that changed nothing look identical from the sending end. That is the
// same shape as the patch stepper, and it is why this grades by ear.
//
// ⚠️ It includes the NEGATIVE CONTROLS, because a difference test that cannot
// fail is not a test:
//
//   * the SAME seed twice must come back SAME — if that reads as "different",
//     the measurement is picking up drift or noise rather than the roll, and
//     every other line here is worthless;
//   * the drift must move the sound with NOTHING sent at all.
import { format, parse, randomId, RELAY_BASE } from '../../demo/shell/wire.mjs';
import { measure, distance } from './measure.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const ROOM = arg('room', 'studio-1');
const FROM = `pl-${randomId(6)}`;
let seq = 0, pass = 0, fail = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${n}${d ? `  ${d}` : ''}`); };
const note = (s) => console.log(`       ${s}`);

const ws = new WebSocket(`${arg('relay', RELAY_BASE)}/room/${ROOM}/ws`);
ws.binaryType = 'arraybuffer';
const send = (m) => { const id = randomId(); ws.send(format(m, { from: FROM, seq: seq++, id })); return id; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let frames = [], replies = [], lastSeq = -1, gaps = 0, allFrames = 0;
ws.onmessage = (e) => {
  if (typeof e.data !== 'string') {
    const s = new DataView(e.data).getUint32(0, true);
    if (lastSeq >= 0 && s > lastSeq + 1) gaps += s - lastSeq - 1;
    lastSeq = s; allFrames++;
    frames.push(new Int16Array(e.data.slice(12)));
    return;
  }
  const { kind, msg } = parse(e.data);
  if (kind === 'json' && msg.from !== FROM) replies.push(msg);
};
const reply = (t, ms = 20000, pick = () => true) => new Promise((res, rej) => {
  const t0 = Date.now();
  const iv = setInterval(() => {
    const m = replies.find((r) => r.type === t && pick(r));
    if (m) { clearInterval(iv); res(m); } else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error(`no ${t} in ${ms} ms — is a box in "${ROOM}"?`)); }
  }, 25);
});
const answer = (id, type, ms = 20000) => reply(type, ms, (r) => r.re === id);
/** One named engine command, straight through the box. See box.mjs `params.set`. */
const set = async (cmd, ...args) => {
  const r = await answer(send({ type: 'params.set', cmd, args }), 'params.set');
  if (!r.ok) throw new Error(`${cmd}: ${r.reason}`);
};

/**
 * One take: play a note, capture what comes back, measure it.
 *
 * The granulator is not an instrument with an attack — it is a buffer being
 * read continuously — so the note is there to give the capture something with
 * a beginning. The measurement starts from the onset for the same reason the
 * patch test does: the first frames are still crossing the internet.
 */
async function take(label, { play = true, hold = 2600 } = {}) {
  frames = [];
  if (play) send({ type: 'note.on', note: 60, vel: 110 });
  await wait(hold);
  if (play) send({ type: 'note.off', note: 60 });
  await wait(250);
  const m = measure(frames);
  note(`${label.padEnd(34)} peak ${m.peak.toFixed(4)}  tail/peak ${m.ratio.toFixed(3)}  centroid ${Math.round(m.centroid)} Hz  (${m.n} frames)`);
  return m;
}

await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('relay would not open')); });
console.log(`\n== pappus, live in "${ROOM}" ==\n`);

try {
  // ── raise the chain ───────────────────────────────────────────────────────
  // hexter is the feeder: an insert can only reach what is on the JACK graph,
  // and fluidsynth writes to a pipe.
  console.log('  raising hexter (a JACK chain takes ~13 s) ...');
  const s = await answer(send({ type: 'audio.start', source: 'hexter' }), 'audio.started', 60000);
  ok('a JACK instrument is up for the insert to wrap', s.ok !== false, s.source ?? '');

  console.log('  switching pappus on (first time compiles 2,030 lines, ~40 s) ...');
  const fx = await answer(send({ type: 'fx.pappus', on: true }), 'fx.pappus', 90000);
  ok('pappus is inserted', fx.ok === true, fx.reason ?? `wrapping ${fx.instrument}`);
  if (!fx.ok) throw new Error(fx.reason);

  // ⚠️ PRIME THE BUFFER. Pappus granulates a 60-second recording of its input,
  // and that recording starts EMPTY — so the first take read `peak 0.0000,
  // centroid 0 Hz` and the "same seed twice" control failed on silence against
  // sound rather than on anything to do with the roll. Play into it first.
  console.log('  priming the grain buffer (it starts empty, and an empty granulator is silent) ...');
  for (const n of [48, 55, 60, 64, 67]) { send({ type: 'note.on', note: n, vel: 110 }); await wait(700); send({ type: 'note.off', note: n }); }
  await wait(1500);

  // ── the die ───────────────────────────────────────────────────────────────
  const SEED_A = 424242, SEED_B = 8675309;

  const rA = await answer(send({ type: 'params.random', seed: SEED_A }), 'params.rolled');
  ok('a roll names its character and carries its seed back',
     rA.ok && rA.seed === SEED_A && typeof rA.character?.m === 'string' && rA.character.m !== rA.character.n,
     `${rA.character?.m}/${rA.character?.n} · seed ${rA.seed}`);
  await wait(1200);
  const a1 = await take(`seed ${SEED_A} (${rA.character.m}/${rA.character.n})`);

  // NEGATIVE CONTROL. The same seed must land in the same place. If this reads
  // "different" the rest of the file is measuring noise.
  await answer(send({ type: 'params.random', seed: SEED_A }), 'params.rolled');
  await wait(1200);
  const a2 = await take(`seed ${SEED_A} again`);
  const same = distance(a1, a2);
  note(`same seed twice:  envelope ${same.env.toFixed(3)} · brightness ${same.oct.toFixed(2)} octaves  <- the noise floor`);

  const rB = await answer(send({ type: 'params.random', seed: SEED_B }), 'params.rolled');
  await wait(1200);
  const b = await take(`seed ${SEED_B} (${rB.character.m}/${rB.character.n})`);
  const diff = distance(a1, b);
  note(`two seeds:        envelope ${diff.env.toFixed(3)} · brightness ${diff.oct.toFixed(2)} octaves`);

  ok('NEGATIVE CONTROL: the same seed reproduces the same sound',
     same.env < 0.15 && same.oct < 0.5, `envelope ${same.env.toFixed(3)} · ${same.oct.toFixed(2)} oct`);
  ok('two different seeds sound different',
     diff.env > same.env * 1.5 || diff.oct > Math.max(0.5, same.oct * 2),
     `envelope ${diff.env.toFixed(3)} vs ${same.env.toFixed(3)} · brightness ${diff.oct.toFixed(2)} vs ${same.oct.toFixed(2)} oct`);

  // ── the drift ─────────────────────────────────────────────────────────────
  // Nothing is sent between these two takes. If they differ, the box moved the
  // sound on its own, which is the whole claim.
  const d0 = await answer(send({ type: 'params.state' }), 'params.state');
  ok('the drift is running without having been asked for', d0.drift?.on === true,
     `${d0.drift?.nudges} nudges so far`);

  const m1 = await take('drift, first look');
  console.log('  waiting 45 s with NOTHING sent ...');
  await wait(45000);
  const m2 = await take('drift, 45 s later, nothing sent');
  const moved = distance(m1, m2);
  const d1 = await answer(send({ type: 'params.state' }), 'params.state');
  note(`scan walked ${d0.drift?.scan} -> ${d1.drift?.scan} · ${d1.drift.nudges - d0.drift.nudges} nudges in the gap`);
  ok('the sound moves on its own, with nothing sent',
     moved.env > same.env || moved.oct > same.oct,
     `envelope ${moved.env.toFixed(3)} · brightness ${moved.oct.toFixed(2)} oct, against a noise floor of ${same.env.toFixed(3)}/${same.oct.toFixed(2)}`);
  ok('...and it did not wander out of the character it was given',
     moved.oct < 2.5, `brightness moved ${moved.oct.toFixed(2)} octaves`);

  // ── 1965 ──────────────────────────────────────────────────────────────────
  const found = await answer(send({ type: 'source.search', limit: 100 }), 'source.found', 30000);
  ok('the box can reach ERR\'s 1965 audio archive', found.ok && found.total > 500,
     `${found.total} items, page of ${found.items.length}`);

  const pick = found.items[7];
  const loaded = await answer(send({ type: 'source.load', slug: pick.slug, atSec: 120, dur: 60 }), 'source.loaded', 90000);
  ok('a minute of 1965 lands in the grain buffers', loaded.ok === true,
     loaded.ok ? `${loaded.date} · ${loaded.title} · ${loaded.tookMs} ms · ${loaded.buffers} buffers` : loaded.reason);
  if (!loaded.ok) throw new Error(loaded.reason);
  await wait(2000);

  // The SAME roll, so the only thing that changed is what is in the buffer.
  // Comparing against a drifted take would have been comparing two changes.
  await answer(send({ type: 'params.random', seed: SEED_A }), 'params.rolled');
  await wait(1200);
  const err = await take(`1965 under seed ${SEED_A}`);
  ok('...and it makes a sound', err.peak > 0.004, `peak ${err.peak.toFixed(4)}`);
  const vsBefore = distance(a2, err);
  ok('the same roll over 1965 sounds unlike the same roll over the synth',
     vsBefore.env > same.env || vsBefore.oct > Math.max(0.4, same.oct),
     `envelope ${vsBefore.env.toFixed(3)} · brightness ${vsBefore.oct.toFixed(2)} oct, against ${same.env.toFixed(3)}/${same.oct.toFixed(2)}`);

  // ⚠️ THE REGRESSION GUARD FOR THE BUG THAT MADE ALL OF THIS UNREADABLE.
  // `src 1` zeroes the record gain but the write head keeps going, and with
  // nothing retaining the old sample it writes SILENCE over the whole live
  // window in one pass — one to twelve seconds. So a take started right after
  // the load caught the material on its way out, and every reading of this
  // feature was right about the second it was taken and wrong about the
  // feature. A single take cannot tell "loaded" from "loaded and already being
  // erased"; only a second one, later, can. `lock` is what holds it.
  console.log('  waiting 25 s to see whether the material is still there ...');
  await wait(25000);
  const still = await take('1965, 25 s after loading');
  ok('the loaded minute is HELD, not erased under the write head',
     still.peak > 0.004, `peak ${still.peak.toFixed(4)} against ${err.peak.toFixed(4)} at the load`);

  // ── does a key pitch the grains? ─────────────────────────────────────────
  //
  // ⚠️ THIS CANNOT BE ASKED OF 1965 THROUGH THE WHOLE CHAIN, and asking it that
  // way read FAILED for a day against an engine that was working. Two reasons,
  // both about measuring the quantity in question:
  //
  //   the CHAIN — 48 resonators tuned to a fixed chord, eight delay taps and a
  //   reverb sit between the grains and the capture, and not one of them follows
  //   a key. Through a resonator-heavy roll, pressing four octaves moved the
  //   measured brightness by -0.05 octaves per octave. Through a roll that goes
  //   straight out, the same four octaves moved it by 1.77.
  //
  //   the MATERIAL — a two-second spectral centroid of grains scattered over a
  //   minute of SPEECH is dominated by which words the grains landed on. The
  //   same sweep gave -1.92 octaves at -12 semitones (right) and +0.34 at -12
  //   on the next take (nonsense). Speech has no pitch to measure.
  //
  // So this records ONE HELD NOTE into the buffer, locks it, mutes everything
  // that cannot follow a key, and sweeps. Measured that way the ladder is
  // monotonic and unambiguous: 251 · 335 · 473 · 878 · 1578 Hz.
  //
  // It asserts DIRECTION AND ORDER rather than exact ratios. Pitching a harmonic
  // series up moves a centroid by more than the pitch ratio as upper partials
  // come into the band, so "+12 semitones is exactly +1.00 octaves" is a claim
  // about the spectrum of the material, not about the engine.
  await answer(send({ type: 'source.clear' }), 'source.cleared');
  await answer(send({ type: 'params.drift', on: false }), 'params.drifted');
  // ⚠️ ROLL FIRST, and a KNOWN seed. This block inherits whatever the previous
  // checks left behind — a tilt that buries the recording, a contour, a window
  // — and it recorded 50x quieter in the suite than the same code did standing
  // alone, for exactly that reason. Every parameter the sweep depends on is
  // either rolled here or set below; nothing is inherited.
  await answer(send({ type: 'params.random', seed: SEED_B }), 'params.rolled');
  await set('mtilt', 0); await set('ntilt', 0);
  await set('msos', 0); await set('nsos', 0);     // do not freeze while recording
  await wait(800);
  send({ type: 'note.on', note: 60, vel: 110 });
  await wait(6000);
  send({ type: 'note.off', note: 60 });
  await set('msrc', 1); await set('nsrc', 1);
  await set('mlock', 1); await set('nlock', 1);
  await set('pamp', ...Array(48).fill(0));
  await set('taplevels', ...Array(8).fill(0));
  for (const k of ['pwet', 'swet', 'rverb', 'noise', 'drive', 'crush',
                   'pin1', 'pin2', 'sin1', 'sin2', 'kin1', 'kin2']) await set(k, 0);
  await set('oin1', 1); await set('oin2', 0);
  await set('mrate', 12); await set('msize', 0.2); await set('mspray', 0); await set('mswarm', 0);
  await set('mtilt', 0);          // tilt is baked in at RECORD time — keep it neutral
  await set('mscan', 0.5); await set('mbuflen', 4); await set('mwinstart', 0); await set('mwinend', 1);
  await set('melen', 1); await set('epattern', ...Array(16).fill(1));
  await set('gates', 1, 0, 0, 0, 0, 0, 0, 0);
  await set('gates2', 0, 0, 0, 0, 0, 0, 0, 0);
  await set('probs', 1, 1, 1, 1, 1, 1, 1, 1);
  await wait(1500);
  const ladder = [];
  for (const st of [-12, -7, 0, 7, 12]) {
    await set('pitches', st, 0, 0, 0, 0, 0, 0, 0);
    await wait(700);
    frames = []; await wait(2400);
    ladder.push({ st, m: measure(frames) });
  }
  note(`pitch ladder  ${ladder.map((r) => `${r.st > 0 ? '+' : ''}${r.st}:${Math.round(r.m.centroid)}Hz`).join('  ')}`);
  ok('every rung of the pitch ladder sounds', ladder.every((r) => r.m.peak > 0.004),
     ladder.map((r) => r.m.peak.toFixed(3)).join(' '));
  // ⚠️ ONLY THE UPWARD RUNGS ARE ASSERTED, AND THE REASON IS THE MEASURE.
  // Over three runs the rungs at or below zero all landed between 225 and
  // 434 Hz in no reliable order — -12 read HIGHER than 0 in one of them — while
  // +7 and +12 were clean and far above every time. That is not the engine
  // being erratic downward: a grain clock at 12/s with a 0.2 s envelope puts a
  // broadband floor under everything, and when the pitched partials move DOWN
  // into it the centroid stops following them. Brightness can see a grain
  // pitched up and cannot see one pitched down.
  //
  // So this asserts what the instrument can answer and says the rest in words,
  // rather than asserting five rungs and going amber on a working engine every
  // third run.
  const up = ladder.filter((r) => r.st >= 0);
  const rising = up.every((r, i) => i === 0 || r.m.centroid > up[i - 1].m.centroid);
  ok('a higher key pitches the grains up', rising,
     rising ? `${up.map((r) => Math.round(r.m.centroid) + ' Hz').join(' -> ')} (below zero, brightness cannot resolve it — see comment)`
            : 'the upward rungs are not in order');
  // A LOWER BOUND ONLY, on purpose. Brightness is a PROXY for pitch and it
  // over-reads: pitching a harmonic series up brings upper partials into the
  // band, so the centroid climbs faster than the pitch ratio — measured 3.23
  // octaves of brightness for the two octaves of key the sweep asked for. How
  // much faster depends on the spectrum of whatever was recorded, which is not
  // a property of the engine, so an upper bound would be asserting something
  // nobody can predict and it would fail on a different note. The real
  // assertions are the two above: every rung sounds, and the order is right.
  // This one only says the movement is large rather than a rounding artefact.
  const span = Math.log2(ladder.at(-1).m.centroid / up[0].m.centroid);
  ok('...and the movement is large, not a rounding artefact', span > 1.2,
     `${span.toFixed(2)} octaves of brightness for the one octave of key above zero (a proxy that over-reads)`);

  // ── the frame rate, which is the tell for two sources at once ────────────
  ok('one clean source, not two', gaps < allFrames * 0.05, `${allFrames} frames, ${gaps} dropped at the relay`);

  send({ type: 'source.clear' });
  send({ type: 'note.panic' });
} catch (e) {
  fail++;
  console.log(`\n  FAIL ${e.message}`);
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
ws.close();
process.exit(fail ? 1 : 0);
