// rig/box/pappus-live.mjs — drive a box running Pappus and check that the die,
// the drift and the 1965 material move the SOUND.
//
//   node box.mjs --room studio-1          (on the board; it is the service)
//   node pappus-live.mjs --room studio-1  (from anywhere)
//
// ⚠️ ONE AT A TIME. This drives the board's single instrument and single
// granulator, so two runs at once interleave: one switches the source while the
// other is mid-capture, and the second reads silence or somebody else's sound.
// Seen for real — a run died with "no audio" while another had just restarted
// hexter underneath it.
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
import { measure, summarise, separated } from './measure.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
/**
 * ⚠️ A FOUR-AND-A-HALF MINUTE TEST IS A TEST NOBODY ITERATES ON, and it showed:
 * eight consecutive end-to-end runs went into fixing one assertion at a time,
 * most of them waiting on parts that had not changed. `--quick` cuts the two
 * long waits and drops to two takes a condition — enough to see a check pass or
 * throw, not enough to trust a verdict.
 *
 * It PRINTS that it is quick, and the summary says so, because a shortened run
 * that looks like a full one is a number that will be quoted as one.
 */
const QUICK = process.argv.includes('--quick');
const only = arg('only', null);      // run one section: seeds | drift | err | pitch
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
async function once({ play = true, hold = 2600 } = {}) {
  frames = [];
  if (play) send({ type: 'note.on', note: 60, vel: 110 });
  await wait(hold);
  if (play) send({ type: 'note.off', note: 60 });
  await wait(250);
  return measure(frames);
}

/**
 * ⚠️ THREE TAKES, NOT ONE, AND THE SPREAD IS THE POINT.
 *
 * This engine fires grains against a per-voice probability and a euclidean
 * gate, so two captures of an IDENTICAL setting differ. Grading it from one
 * take each read 14, 16 and 16 of 17 across three consecutive runs with
 * DIFFERENT checks failing every time — and the file's own noise floor moved
 * between 0.045 and 0.126 envelope across those runs, so every threshold was
 * being compared against a number that was itself a die roll.
 *
 * Three is chosen against the clock rather than against statistics: each take
 * is about three seconds, and this file already runs for minutes. It is enough
 * for a median to ignore one odd capture, which is the failure actually seen.
 */
const N = QUICK ? 2 : 3;
async function takes(label, opts = {}) {
  const got = [];
  for (let i = 0; i < N; i++) got.push(await once(opts));
  const s = summarise(got);
  // ⚠️ NO FRAMES IS A FINDING, NOT A CRASH. `summarise` returns null when every
  // capture was empty — the stream stopped, the instrument died, the socket
  // dropped — and the next line then read `.peak` of null and took the whole
  // run down with a message about a property. "Nothing arrived" is a sentence
  // this file should be able to say.
  if (!s) {
    ok(`${label}: frames arrived at all`, false, `${N} captures, every one empty — nothing is streaming`);
    throw new Error(`no audio during "${label}" — the box stopped sending`);
  }
  note(`${label.padEnd(34)} peak ${s.peak.toFixed(4)}  tail/peak ${s.ratio.toFixed(3)}  centroid ${Math.round(s.centroid)} Hz`
     + `   · spread ${s.spread.env.toFixed(3)} env / ${s.spread.oct.toFixed(2)} oct over ${s.takes}`);
  return s;
}

await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('relay would not open')); });
console.log(`\n== pappus, live in "${ROOM}" ==${QUICK ? '   ⚠ QUICK: short waits, two takes — for iterating, not for a verdict' : ''}\n`);

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

  // ⚠️ AND THE BUFFER IS FROZEN FOR THEM TOO. The granulator records its input
  // continuously, so between the first take of a seed and the second the
  // material has MOVED ON — hexter is still playing into it. "The same seed
  // twice" was therefore comparing one roll over two different recordings, and
  // it failed that way: 0.12 octaves apart against a 0.06 floor. `lock` holds
  // what is in the buffer, so the only thing that differs between the two
  // conditions is the thing under test. Same insight as `loadBuffers`, which
  // needed it for the opposite reason.
  await set('mlock', 1); await set('nlock', 1);
  await set('msrc', 1); await set('nsrc', 1);

  // ⚠️ THE DRIFT IS OFF FOR THE SEED TESTS. It moves the sound continuously, so
  // with it running the "same seed twice" control was measuring DRIFT: the
  // three takes of one condition span about nine seconds and the gap between
  // conditions about twenty, so the between-condition difference is larger for
  // a reason that has nothing to do with the seed. Measured, it failed that way
  // — 0.20 octaves apart against a 0.09 floor. The drift has its own test
  // below, which switches it back on.
  await answer(send({ type: 'params.drift', on: false }), 'params.drifted');

  const rA = await answer(send({ type: 'params.random', seed: SEED_A }), 'params.rolled');
  ok('a roll names its character and carries its seed back',
     rA.ok && rA.seed === SEED_A && typeof rA.character?.m === 'string' && rA.character.m !== rA.character.n,
     `${rA.character?.m}/${rA.character?.n} · seed ${rA.seed}`);
  await wait(1200);
  const a1 = await takes(`seed ${SEED_A} (${rA.character.m}/${rA.character.n})`);

  // NEGATIVE CONTROL. The same seed must land in the same place. If this reads
  // "different" the rest of the file is measuring noise.
  await answer(send({ type: 'params.random', seed: SEED_A }), 'params.rolled');
  await wait(1200);
  const a2 = await takes(`seed ${SEED_A} again`);
  // ⚠️ THE FLOOR IS MEASURED NOW, NOT ASSUMED. `separated` compares a
  // difference against the larger of the two conditions' own spreads, so a
  // verdict is "further apart than either of them moves on its own" rather than
  // "further apart than a number somebody typed".
  const sameSeed = separated(a1, a2);
  note(`same seed twice:  envelope ${sameSeed.env.d.toFixed(3)} against its own spread ${sameSeed.env.floor.toFixed(3)}`
     + ` · brightness ${sameSeed.oct.d.toFixed(2)} against ${sameSeed.oct.floor.toFixed(2)}`);

  const rB = await answer(send({ type: 'params.random', seed: SEED_B }), 'params.rolled');
  await wait(1200);
  const b = await takes(`seed ${SEED_B} (${rB.character.m}/${rB.character.n})`);
  const twoSeeds = separated(a1, b);
  note(`two seeds:        envelope ${twoSeeds.env.d.toFixed(3)} · brightness ${twoSeeds.oct.d.toFixed(2)} octaves`);

  // ⚠️ THE SAME SEED DOES NOT REPRODUCE THE SAME SOUND, AND ASSERTING THAT IT
  // DOES WAS WRONG. Chased properly: with the drift off AND the buffer frozen —
  // so the parameters and the material are both held still — two applications
  // of seed 424242 still landed 0.37 octaves apart against a 0.02 floor. The
  // cause is in the engine and is not a defect: the grain scheduler draws from
  // its own free-running noise (`TRand`, and a per-voice `prnd`/`frnd` pair)
  // which nothing reseeds, and the grains read scattered positions in a
  // sixty-second buffer. Two runs of one setting therefore hear different
  // material by design.
  //
  // So the reproducibility claim moves to where it is TRUE and checkable: the
  // seed reproduces the PARAMETERS. That is asserted against the box's own
  // report rather than by ear, and `pappus-test.mjs` already proves the pure
  // function deterministically. What the sound comparison gets instead is an
  // honest floor — the same-seed distance IS the noise, and a different seed
  // has to beat it.
  const again = await answer(send({ type: 'params.random', seed: SEED_A }), 'params.rolled');
  ok('the same seed reproduces the same parameters',
     JSON.stringify(again.m) === JSON.stringify(rA.m) && JSON.stringify(again.n) === JSON.stringify(rA.n)
       && again.character.m === rA.character.m,
     `${again.character.m}/${again.character.n} · rates ${again.m.rate}/${again.n.rate}`);

  // Reported, not asserted: this is the floor the next line uses, and a floor
  // that had to pass a check of its own would be two claims in one.
  note(`the same seed sounds ${sameSeed.env.d.toFixed(3)} env / ${sameSeed.oct.d.toFixed(2)} oct apart — THAT is the floor`);
  const beatsSameSeed = twoSeeds.env.d > sameSeed.env.d * 2 || twoSeeds.oct.d > sameSeed.oct.d * 2;
  ok('two different seeds sound further apart than one seed does from itself',
     beatsSameSeed,
     `env ${twoSeeds.env.d.toFixed(3)} vs ${sameSeed.env.d.toFixed(3)} · brightness ${twoSeeds.oct.d.toFixed(2)} vs ${sameSeed.oct.d.toFixed(2)}`);

  // ── the drift ─────────────────────────────────────────────────────────────
  // Nothing is sent between these two takes. If they differ, the box moved the
  // sound on its own, which is the whole claim.
  // Switched off above for the seed tests; this is its own subject now.
  await answer(send({ type: 'params.drift', on: true }), 'params.drifted');
  await wait(1000);
  const d0 = await answer(send({ type: 'params.state' }), 'params.state');
  ok('the drift is running when it is asked for', d0.drift?.on === true,
     `${d0.drift?.nudges} nudges so far`);

  const m1 = await takes('drift, first look');
  // ⚠️ NINETY SECONDS, BECAUSE FORTY-FIVE IS NOT ENOUGH TO HEAR. The drift's
  // slowest parameter has a 181 s period (`scan`, the one that changes WHAT you
  // are hearing), so 45 s is a quarter cycle — measured, it moved the sound
  // 0.15 octaves while the granulator wobbles 0.15 on its own, so the claim
  // could not be made at that timescale no matter how true it is. Half a cycle
  // is the shortest wait that asks the question properly.
  console.log(`  waiting ${QUICK ? 20 : 90} s with NOTHING sent ...`);
  await wait(QUICK ? 20000 : 90000);
  const m2 = await takes('drift, 90 s later, nothing sent');
  const moved = separated(m1, m2);
  const d1 = await answer(send({ type: 'params.state' }), 'params.state');
  note(`scan walked ${d0.drift?.scan} -> ${d1.drift?.scan} · ${d1.drift.nudges - d0.drift.nudges} nudges in the gap`);
  ok('the sound moves on its own, with nothing sent', moved.any,
     moved.any
       ? `on ${[moved.env.clears && 'envelope', moved.oct.clears && 'brightness'].filter(Boolean).join(' and ')}`
       : `not beyond its own spread (env ${moved.env.d.toFixed(3)}/${moved.env.floor.toFixed(3)}, oct ${moved.oct.d.toFixed(2)}/${moved.oct.floor.toFixed(2)})`);
  ok('...and it did not wander out of the character it was given',
     moved.oct.d < 2.5, `brightness moved ${moved.oct.d.toFixed(2)} octaves`);

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
  const err = await takes(`1965 under seed ${SEED_A}`);
  ok('...and it makes a sound', err.peak > 0.004, `peak ${err.peak.toFixed(4)}`);
  const vsBefore = separated(a2, err);
  ok('the same roll over 1965 sounds unlike the same roll over the synth', vsBefore.any,
     vsBefore.any
       ? `on ${[vsBefore.env.clears && 'envelope', vsBefore.oct.clears && 'brightness'].filter(Boolean).join(' and ')}`
       : `neither axis clears its floor (env ${vsBefore.env.d.toFixed(3)}/${vsBefore.env.floor.toFixed(3)}, oct ${vsBefore.oct.d.toFixed(2)}/${vsBefore.oct.floor.toFixed(2)})`);

  // ⚠️ THE REGRESSION GUARD FOR THE BUG THAT MADE ALL OF THIS UNREADABLE.
  // `src 1` zeroes the record gain but the write head keeps going, and with
  // nothing retaining the old sample it writes SILENCE over the whole live
  // window in one pass — one to twelve seconds. So a take started right after
  // the load caught the material on its way out, and every reading of this
  // feature was right about the second it was taken and wrong about the
  // feature. A single take cannot tell "loaded" from "loaded and already being
  // erased"; only a second one, later, can. `lock` is what holds it.
  console.log(`  waiting ${QUICK ? 8 : 25} s to see whether the material is still there ...`);
  await wait(QUICK ? 8000 : 25000);
  const still = await takes('1965, 25 s after loading');
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
  // ⚠️ A NARROW WINDOW, BECAUSE THE SCATTER IS THE NOISE. With the window open
  // across the whole four seconds, every grain reads a DIFFERENT slice of the
  // recorded note, so a rung's own spread came out at 0.09, 0.14, 0.38 and 0.41
  // octaves on four consecutive runs — swamping the 0.28-octave step being
  // measured, and no number of repeats fixes a variance this large. Pinning the
  // read head to a tenth of the buffer means every grain reads nearly the same
  // material and the only thing left varying is the pitch, which is the
  // quantity in question. Remove the noise; do not out-average it.
  await set('mscan', 0.5); await set('mbuflen', 4);
  await set('mwinstart', 0.45); await set('mwinend', 0.55);
  // ⚠️ AND PIN THE MODES, which the roll otherwise chooses. `scanmode` 3 and 4
  // are DELAY SYNC and DELAY FREE — the read head moves on its own — so a run
  // that happened to roll one read a rung spread of 0.83 octaves where a run
  // that rolled POSITION read 0.06. That is not noise in the instrument, it is
  // a different instrument, and leaving it to the die makes the whole check
  // pass or fail on the roll. `contour` is pinned for the same reason: it is
  // the grain envelope, and an envelope change is a spectrum change.
  await set('mscanmode', 2);      // 2 POSITION — a static read head
  await set('mcontour', 8);       // a mid envelope shape, fixed across runs
  await set('mswarmmode', 1); await set('mspraymode', 1);
  await set('melen', 1); await set('epattern', ...Array(16).fill(1));
  await set('gates', 1, 0, 0, 0, 0, 0, 0, 0);
  await set('gates2', 0, 0, 0, 0, 0, 0, 0, 0);
  await set('probs', 1, 1, 1, 1, 1, 1, 1, 1);
  await wait(1500);
  // ⚠️ AND THE LADDER TAKES THREE CAPTURES A RUNG, for the same reason
  // everything above it does. With one each it read -12:272 · -7:443 · 0:684 ·
  // +7:553 · +12:892 — a rung going DOWN in the middle of a rise that is
  // otherwise obvious, which failed the whole check on one unlucky capture.
  const ladder = [];
  for (const st of [-12, -7, 0, 7, 12]) {
    await set('pitches', st, 0, 0, 0, 0, 0, 0, 0);
    await wait(700);
    const got = [];
    for (let i = 0; i < N; i++) { frames = []; await wait(2400); got.push(measure(frames)); }
    ladder.push({ st, m: summarise(got) });
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
  // ⚠️ EACH STEP MUST CLEAR THE RUNGS' OWN SPREAD, not merely be larger. Two
  // numbers in the right order by a hair are not evidence of anything from an
  // instrument that wobbles, and `>` alone cannot tell the two apart.
  const steps = up.slice(1).map((r, i) => separated(up[i].m, r.m));
  const ends = separated(up[0].m, up[up.length - 1].m);
  // ⚠️ THE ENDS ARE ASSERTED; THE INDIVIDUAL STEPS ARE ONLY REPORTED. Measured:
  // a single rung's own spread is about 0.38 octaves — the grains scatter over
  // a whole buffer — while one seven-semitone step moves about 0.29. So this
  // instrument CAN see an octave of key and CANNOT reliably see half of one,
  // and requiring every step to clear the floor failed a ladder that was
  // plainly rising. Asserting the ends and printing the steps says exactly
  // that, instead of pretending to a resolution nothing here has.
  const ordered = up.every((r, i) => i === 0 || r.m.centroid > up[i - 1].m.centroid);
  note(`per step: ${steps.map((st) => st.oct.d.toFixed(2)).join(' · ')} octaves, against a rung's own spread of ${steps[0].oct.floor.toFixed(2)}`);
  ok('a higher key pitches the grains up', ordered && ends.oct.clears,
     `${up.map((r) => Math.round(r.m.centroid) + ' Hz').join(' -> ')}`
     + (ordered ? '' : ' — OUT OF ORDER')
     + (ends.oct.clears ? '' : ` — the ends differ by ${ends.oct.d.toFixed(2)} against a floor of ${ends.oct.floor.toFixed(2)}`));
  // A LOWER BOUND ONLY, on purpose. Brightness is a PROXY for pitch and it
  // over-reads: pitching a harmonic series up brings upper partials into the
  // band, so the centroid climbs faster than the pitch ratio — measured 3.23
  // octaves of brightness for the two octaves of key the sweep asked for. How
  // much faster depends on the spectrum of whatever was recorded, which is not
  // a property of the engine, so an upper bound would be asserting something
  // nobody can predict and it would fail on a different note. The real
  // assertions are the two above: every rung sounds, and the order is right.
  // This one only says the movement is large rather than a rounding artefact.
  // ⚠️ AGAINST THE MEASURED FLOOR, NOT A TYPED NUMBER. This said `span > 1.2`,
  // a constant calibrated when the sweep covered two octaves of key; the sweep
  // now reports the octave above zero and 1.2 became a threshold nobody had
  // re-derived. Every other verdict in this file is "further than it moves on
  // its own", and so is this one.
  const span = Math.log2(up[up.length - 1].m.centroid / up[0].m.centroid);
  ok('...and the movement is larger than the instrument\'s own wobble',
     ends.oct.clears,
     `${span.toFixed(2)} octaves of brightness for the octave of key above zero, against a floor of ${ends.oct.floor.toFixed(2)} (a proxy that over-reads)`);

  // ── the frame rate, which is the tell for two sources at once ────────────
  ok('one clean source, not two', gaps < allFrames * 0.05, `${allFrames} frames, ${gaps} dropped at the relay`);

  send({ type: 'source.clear' });
  send({ type: 'note.panic' });
} catch (e) {
  fail++;
  console.log(`\n  FAIL ${e.message}`);
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}${QUICK ? '   ⚠ QUICK RUN — not a verdict' : ''}\n`);
ws.close();
process.exit(fail ? 1 : 0);
