// rig/box/wobble-test.mjs — does a controller make the sound MOVE?
//
//   node rig/box/wobble-test.mjs --ctrl 76 --bank 115 --program 32
//
// `cc-test.mjs` asks whether a controller changes the brightness of a held
// note, which is the right question for a filter and the wrong one for a
// vibrato: an LFO leaves the average brightness and the average level exactly
// where it found them and moves them up and down instead. A centroid test reads
// that as "nothing happened", so a controller that is doing its job looks like
// a dead one.
//
// So this tracks the PITCH of the held note and asks whether it moves. That is
// the quantity in question: a vibrato is a frequency wobble, and the first two
// builds of this file measured the LEVEL instead. They read the same 19.15 Hz
// for every controller at every value, and the positive control that caught it
// was a cutoff driven by hand at 2.0 Hz which came back as 0.85 Hz and 5% deep,
// because sweeping a filter does almost nothing to loudness. Two numbers come
// out: how FAST the pitch moves, in Hz, and how FAR, in cents.
//
// 🔴 THE NOTE IS HELD ONCE, FOR THE WHOLE RUN. `cc-test.mjs` re-triggers between
// takes, which is correct for it and would be a trap here: attack, decay and
// every other envelope control change what a NEW note does, so a re-triggering
// harness reports them as movers while a page that holds one note hears nothing
// from them at all. `/knobs/` holds one note. This holds one note.
//
// ⚠️ AND IT TAKES THE FLOOR FIRST, at one value, twice. A run earlier today
// skipped that and produced a table of five controllers that could not be told
// apart from the patch moving on its own, which is exactly what `AddSynth Morph`
// does.
//
// ⚠️ THIS TOUCHES A SHARED INSTRUMENT IN ANOTHER BUILDING. Run it when a person
// says the board is free.
import { format, parse, randomId, RELAY_BASE } from '../../demo/shell/wire.mjs';
import { measure } from './measure.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const ROOM = arg('room', 'studio-1');
const BANK = Number(arg('bank', 115));
const PROGRAM = Number(arg('program', 32));     // 115/32 is `AddSynth Morph`
const NOTE = Number(arg('note', 48));
const CTRLS = (arg('ctrl', '76') || '').split(',').map(Number).filter(Number.isFinite);
const LO = Number(arg('lo', 0));
const HI = Number(arg('hi', 120));
const HOLD_MS = Number(arg('hold', 4000));
// ⚠️ A RATE CONTROL IS INERT AT ZERO DEPTH, so a sweep of one that reads flat
// proves nothing until the other one is held up. `--with 1=127` pins a second
// controller for the whole run and prints it, because a reading taken under a
// held controller is a different reading and has to say so.
const WITH = (arg('with', '') || '').split(',').filter(Boolean)
  .map((p) => p.split('=').map(Number));
/**
 * 🔴 `--reps N` INTERLEAVES THE TWO VALUES INSTEAD OF TAKING ONE THEN THE OTHER,
 * WHICH IS THE ONLY HONEST DESIGN ON A PATCH THAT DRIFTS. `AddSynth Morph` moves
 * 0.58 octaves of brightness between two takes at ONE value four seconds apart,
 * so lo-then-hi puts the whole drift inside the comparison and calls it an
 * effect. Alternating lo, hi, lo, hi averages the drift into both arms, and the
 * spread WITHIN each arm is the floor the difference has to clear.
 */
const REPS = Number(arg('reps', 0));
const FROM = `wob-${randomId(6)}`;

let seq = 0, pass = 0, fail = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${n}${d ? `  ${d}` : ''}`); };

const ws = new WebSocket(`${arg('relay', RELAY_BASE)}/room/${ROOM}/ws`);
ws.binaryType = 'arraybuffer';
const send = (m) => { const id = randomId(); ws.send(format(m, { from: FROM, seq: seq++, id, by: 'tool' })); return id; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let cap = [], replies = [];
ws.onmessage = (e) => {
  if (typeof e.data !== 'string') { cap.push(new Int16Array(e.data.slice(12))); return; }
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

const RATE = 48000;

/**
 * 🔴 A TREMOLO IS A LEVEL WOBBLE AND A VIBRATO IS A PITCH ONE, AND THIS FILE
 * MEASURED ONLY THE SECOND. Asked 2026-09-17 after it reported that this
 * instrument has no LFO: *"Sure there is no lfo?"*. The right question, because
 * the claim was over-general in two ways at once. It was measured on ONE patch,
 * `AddSynth Morph`, so a patch with no LFO configured proves nothing about the
 * instrument. And it tracked PITCH, so an amplitude LFO would have read as flat
 * no matter how obvious it was to a listener.
 *
 * The envelope is one level per 20 ms slice, which sees anything under 25 Hz.
 * Smoothed over five slices before counting, because without that the crossing
 * counter rides slice-to-slice noise at very nearly Nyquist and reports the same
 * saturated number about everything: the FIRST build of this file did exactly
 * that and read 19.15 Hz to four figures about every controller at every value.
 */
function levelWobble(pcm) {
  const N = Math.floor(RATE * 0.02);
  const raw = [];
  for (let o = 0; o + N <= pcm.length; o += N) {
    let s = 0;
    for (let i = 0; i < N; i++) s += pcm[o + i] * pcm[o + i];
    raw.push(Math.sqrt(s / N) / 32768);
  }
  const W = 5;
  const lvl = [];
  for (let i = 0; i + W <= raw.length; i++) {
    let s = 0;
    for (let j = 0; j < W; j++) s += raw[i + j];
    lvl.push(s / W);
  }
  const n = lvl.length;
  if (n < 24) return { hz: NaN, depth: NaN, mean: NaN };
  const mean = lvl.reduce((a, b) => a + b, 0) / n;
  const xs = lvl.map((_, i) => i - (n - 1) / 2);
  const sxx = xs.reduce((a, x) => a + x * x, 0) || 1;
  const slope = xs.reduce((a, x, i) => a + x * lvl[i], 0) / sxx;
  const r = lvl.map((v, i) => v - (mean + slope * xs[i]));
  const rms = Math.sqrt(r.reduce((a, v) => a + v * v, 0) / n);
  const gate = rms * 0.4;
  let cross = 0, side = 0;
  for (const v of r) {
    if (v > gate) { if (side < 0) cross++; side = 1; }
    else if (v < -gate) { if (side > 0) cross++; side = -1; }
  }
  const secs = n * 0.02;
  return { hz: (cross / 2) / secs, depth: mean ? rms / mean : 0, mean };
}

/**
 * The pitch of each 2048-sample window, by autocorrelation, every 512 samples.
 * A 20 ms slice is far too short to ask about a 130 Hz note directly: one slice
 * holds about two and a half cycles and an FFT of it resolves 50 Hz, which is
 * several semitones. Autocorrelation over 2048 samples resolves a fraction of
 * one, and the parabolic step on the peak takes it well under a cent.
 */
function pitchTrack(pcm) {
  const W = 2048, HOP = 512, LO = 120, HI = 600;    // lags: 400 Hz down to 80 Hz
  const out = [];
  for (let o = 0; o + W + HI < pcm.length; o += HOP) {
    let best = 0, bestLag = 0, e0 = 0;
    for (let i = 0; i < W; i++) e0 += pcm[o + i] * pcm[o + i];
    if (e0 < W * 400 * 400) { out.push(null); continue; }        // too quiet to ask
    const c = new Float64Array(HI + 1);
    for (let lag = LO; lag <= HI; lag++) {
      let s = 0;
      for (let i = 0; i < W; i++) s += pcm[o + i] * pcm[o + i + lag];
      c[lag] = s;
      if (s > best) { best = s; bestLag = lag; }
    }
    if (!bestLag || bestLag <= LO || bestLag >= HI) { out.push(null); continue; }
    const a = c[bestLag - 1], b = c[bestLag], d = c[bestLag + 1];
    const denom = a - 2 * b + d;
    const lag = bestLag + (denom ? 0.5 * (a - d) / denom : 0);
    out.push(RATE / lag);
  }
  return out;
}

/**
 * How fast and how far the pitch moves, with the slow drift taken out.
 * A held note wanders, and a wander is not a vibrato: without detrending, a
 * patch that simply sags reads as an enormous one.
 */
function wobble(pcm) {
  const track = pitchTrack(pcm).filter((f) => f !== null);
  const n = track.length;
  if (n < 24) return null;
  const sorted = [...track].sort((a, b) => a - b);
  const centre = sorted[n >> 1];
  const cents = track.map((f) => 1200 * Math.log2(f / centre));
  const mean = cents.reduce((a, b) => a + b, 0) / n;
  const xs = cents.map((_, i) => i - (n - 1) / 2);
  const sxx = xs.reduce((a, x) => a + x * x, 0) || 1;
  const slope = xs.reduce((a, x, i) => a + x * cents[i], 0) / sxx;
  const r = cents.map((v, i) => v - (mean + slope * xs[i]));
  const rms = Math.sqrt(r.reduce((a, v) => a + v * v, 0) / n);
  // A crossing counts only once the pitch has travelled a fair way past the
  // middle, so tracker noise sitting on the line cannot ring up the count.
  const gate = rms * 0.4;
  let cross = 0, side = 0;
  for (const v of r) {
    if (v > gate) { if (side < 0) cross++; side = 1; }
    else if (v < -gate) { if (side > 0) cross++; side = -1; }
  }
  const secs = n * (512 / RATE);
  return { hz: (cross / 2) / secs, cents: rms, hz0: centre };
}

const joinCap = () => {
  const n = cap.reduce((a, f) => a + f.length, 0);
  const out = new Int16Array(n);
  let o = 0;
  for (const f of cap) { out.set(f, o); o += f.length; }
  return out;
};

/**
 * 🔴 THE ANALYSER IS GRADED BEFORE THE SYNTH IS, ON TONES WHOSE WOBBLE IS KNOWN
 * EXACTLY. Two builds of this file failed here rather than on the board: one
 * saturated its counter and reported 19.15 Hz about everything, the next
 * reported 0.85 Hz for a 2.0 Hz drive. Both passed a floor perfectly, because a
 * metric that finds nothing anywhere cannot invent movement either. A floor says
 * the instrument does not lie. Only a known signal says it can see.
 */
function selfTest() {
  const make = (hz, depthCents, secs = 5) => {
    const n = Math.round(RATE * secs), out = new Int16Array(n);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / RATE;
      const f = 130.81 * Math.pow(2, (depthCents * Math.sin(2 * Math.PI * hz * t)) / 1200);
      phase += (2 * Math.PI * f) / RATE;
      out[i] = Math.round(9000 * (Math.sin(phase) + 0.4 * Math.sin(2 * phase)));
    }
    return out;
  };
  const flat = wobble(make(0, 0));
  const slow = wobble(make(2.0, 40));
  const fast = wobble(make(6.0, 40));
  const shallow = wobble(make(6.0, 8));
  console.log('the analyser, on tones whose wobble is known exactly');
  console.log(`      no vibrato             ${flat.hz.toFixed(2)} Hz · ${flat.cents.toFixed(1)} cents`);
  console.log(`      2.0 Hz, 40 cents       ${slow.hz.toFixed(2)} Hz · ${slow.cents.toFixed(1)} cents`);
  console.log(`      6.0 Hz, 40 cents       ${fast.hz.toFixed(2)} Hz · ${fast.cents.toFixed(1)} cents`);
  console.log(`      6.0 Hz, 8 cents        ${shallow.hz.toFixed(2)} Hz · ${shallow.cents.toFixed(1)} cents`);
  ok('a steady tone reads as steady', flat.cents < 3, `${flat.cents.toFixed(1)} cents of tracker noise, which is the floor every reading below sits on`);
  ok('it reads 2.0 Hz as 2.0 Hz', Math.abs(slow.hz - 2) < 0.5, `${slow.hz.toFixed(2)} Hz`);
  ok('it reads 6.0 Hz as 6.0 Hz', Math.abs(fast.hz - 6) < 0.9, `${fast.hz.toFixed(2)} Hz`);
  ok('it tells 40 cents from 8', shallow.cents < slow.cents / 2, `${shallow.cents.toFixed(1)} against ${slow.cents.toFixed(1)}`);
  ok('and it does not need a big wobble to find the rate', Math.abs(shallow.hz - 6) < 0.9, `${shallow.hz.toFixed(2)} Hz at 8 cents deep`);

  // The LEVEL analyser, on tones whose tremolo is known exactly.
  const am = (hz, depth, secs = 5) => {
    const n = Math.round(RATE * secs), out = new Int16Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / RATE;
      const g = 1 + depth * Math.sin(2 * Math.PI * hz * t);
      out[i] = Math.round(9000 * g * Math.sin(2 * Math.PI * 130.81 * t));
    }
    return out;
  };
  const flatL = levelWobble(am(0, 0));
  const trem4 = levelWobble(am(4.0, 0.35));
  const trem7 = levelWobble(am(7.0, 0.35));
  console.log('the level analyser, on tones whose tremolo is known exactly');
  console.log(`      no tremolo             ${flatL.hz.toFixed(2)} Hz · ${(flatL.depth * 100).toFixed(1)}%`);
  console.log(`      4.0 Hz, 35%            ${trem4.hz.toFixed(2)} Hz · ${(trem4.depth * 100).toFixed(1)}%`);
  console.log(`      7.0 Hz, 35%            ${trem7.hz.toFixed(2)} Hz · ${(trem7.depth * 100).toFixed(1)}%`);
  ok('a steady tone has no tremolo', flatL.depth < 0.03, `${(flatL.depth * 100).toFixed(1)}% of level noise`);
  ok('it reads a 4 Hz tremolo as 4 Hz', Math.abs(trem4.hz - 4) < 0.6, `${trem4.hz.toFixed(2)} Hz`);
  ok('and a 7 Hz one as 7 Hz', Math.abs(trem7.hz - 7) < 0.9, `${trem7.hz.toFixed(2)} Hz`);
}

/** Put the controller at `v` and watch the note that is already sounding. */
async function at(ctrl, v) {
  send({ type: 'ctl.set', channel: 0, set: [[ctrl, v]] });
  await wait(800);                    // the LFO needs a moment to take the new rate
  cap = [];
  await wait(HOLD_MS);
  // Both questions off one capture: does the PITCH move, and does the TIMBRE.
  // A controller can be real and do neither in a way a level meter can see, so
  // the brightness comes from `measure()`, which is what `cc-test.mjs` grades a
  // filter sweep on.
  // ⚠️ `wobble` RETURNS NULL when the note has no pitch to track, and spreading
  // a null leaves a take whose fields are silently absent rather than a take
  // that says it could not answer. A bandwidth of 0 does exactly that.
  const joined = joinCap();
  const w = wobble(joined) || { hz: NaN, cents: NaN, hz0: NaN };
  const L = levelWobble(joined);
  return { ...w, ...measure(cap), tremHz: L.hz, tremDepth: L.depth };
}

ws.onopen = async () => {
  try {
    selfTest();
    console.log(`\nroom ${ROOM} · bank ${BANK} program ${PROGRAM} · note ${NOTE} held throughout\n`);
    const st = await answer(send({ type: 'audio.status' }), 'audio.started');
    console.log(`the board says: ${st.source || 'nothing'} playing`);
    if (!st.source) {
      await answer(send({ type: 'audio.start', source: 'yoshimi' }), 'audio.started', 30000);
      await wait(2500);
    }
    send({ type: 'voice.select', channel: 0, bank: BANK, program: PROGRAM });
    await wait(1200);
    send({ type: 'ctl.set', channel: 0, set: [[121, 0]] });      // reset all controllers
    await wait(300);
    if (WITH.length) {
      send({ type: 'ctl.set', channel: 0, set: WITH });
      console.log(`held throughout: ${WITH.map(([c, v]) => `CC ${c} at ${v}`).join(', ')}`);
      await wait(400);
    }
    send({ type: 'note.on', channel: 0, note: NOTE, vel: 100 });
    await wait(1500);


    if (REPS) {
      for (const CTRL of CTRLS) {
        console.log(`\nCC ${CTRL}, ${REPS} takes at each value, alternating`);
        const arms = { lo: [], hi: [] };
        for (let i = 0; i < REPS; i++) {
          arms.lo.push(await at(CTRL, LO));
          arms.hi.push(await at(CTRL, HI));
        }
        const pick = (a, f) => a.map(f);
        const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
        const sd = (xs) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2)));
        for (const [what, f, unit] of [['brightness', (m) => m.centroid, 'Hz'],
                                       ['level', (m) => m.peak, ''],
                                       ['pitch wobble', (m) => m.cents || 0, 'cents'],
                                       ['tremolo rate', (m) => m.tremHz || 0, 'Hz'],
                                       ['tremolo depth', (m) => (m.tremDepth || 0) * 100, '%']]) {
          const lo = pick(arms.lo, f), hi = pick(arms.hi, f);
          const spread = Math.max(sd(lo), sd(hi));
          const gap = Math.abs(mean(hi) - mean(lo));
          const d = (n) => unit === 'Hz' ? n.toFixed(0) : n.toFixed(unit ? 1 : 4);
          // The floor is the spread WITHIN an arm. A gap smaller than the noise
          // each arm already carries is not a difference anybody can hear.
          ok(`CC ${CTRL} moves the ${what}`, gap > spread * 2 && spread > 0,
            `${d(mean(lo))} at ${LO} against ${d(mean(hi))} at ${HI} ${unit}, `
            + `a gap of ${d(gap)} against ${d(spread)} of spread inside one arm`);
        }
        send({ type: 'ctl.set', channel: 0, set: [[CTRL, 64]] });
        await wait(300);
      }
      send({ type: 'note.off', channel: 0, note: NOTE });
      send({ type: 'note.panic' });
      send({ type: 'ctl.set', channel: 0, set: [[121, 0]] });
      await wait(300);
      console.log(`\n${pass}/${pass + fail} green\n`);
      ws.close();
      process.exit(0);
    }

    for (const CTRL of CTRLS) {
      console.log(`\nCC ${CTRL}`);
      const f1 = await at(CTRL, 64);
      const f2 = await at(CTRL, 64);
      if (!f1 || !f2) throw new Error('no audio came back — is the room carrying the board?');
      const floorHz = Math.abs(f2.hz - f1.hz);
      const floorDepth = Math.abs(f2.cents - f1.cents);
      console.log(`      twice at 64            ${f1.hz.toFixed(2)} then ${f2.hz.toFixed(2)} Hz · ${f1.cents.toFixed(1)} then ${f2.cents.toFixed(1)} cents · centroid ${f1.centroid.toFixed(0)} then ${f2.centroid.toFixed(0)} Hz`);
      const lo = await at(CTRL, LO);
      const hi = await at(CTRL, HI);
      console.log(`      ${String(LO).padStart(3)}                    ${lo.hz.toFixed(2)} Hz · ${lo.cents.toFixed(1)} cents · centroid ${lo.centroid.toFixed(0)} Hz · peak ${lo.peak.toFixed(4)}`);
      console.log(`      ${String(HI).padStart(3)}                    ${hi.hz.toFixed(2)} Hz · ${hi.cents.toFixed(1)} cents · centroid ${hi.centroid.toFixed(0)} Hz · peak ${hi.peak.toFixed(4)}`);
      const oct = (a, b) => Math.abs(Math.log2(Math.max(1, a.centroid) / Math.max(1, b.centroid)));
      const floorOct = oct(f1, f2), movedOct = oct(lo, hi);
      ok(`CC ${CTRL} moves the TIMBRE past its own floor`, movedOct > Math.max(floorOct * 2, 0.25),
        `${movedOct.toFixed(2)} octaves of brightness against a floor of ${floorOct.toFixed(2)}`);
      const movedHz = Math.abs(hi.hz - lo.hz), movedDepth = Math.abs(hi.cents - lo.cents);
      // 🔴 A RATE IS ONLY A RATE IF THERE IS A WOBBLE TO HAVE ONE. Without this
      // gate the test went green on 3.44 Hz of "travel" while the pitch was flat
      // to a fifth of a cent: with nothing crossing the middle but tracker
      // noise, the crossing count is free to wander, and a reading that is free
      // to wander will eventually clear any floor.
      const real = Math.max(lo.cents || 0, hi.cents || 0) > 3;
      ok(`CC ${CTRL} moves the RATE past its own floor`, real && movedHz > Math.max(floorHz * 2, 0.3),
        real ? `${movedHz.toFixed(2)} Hz of travel against a floor of ${floorHz.toFixed(2)}`
             : `the pitch never moves more than ${Math.max(lo.cents, hi.cents).toFixed(1)} cents, so there is no rate to measure`);
      ok(`CC ${CTRL} moves the DEPTH past its own floor`, movedDepth > Math.max(floorDepth * 2, 4),
        `${movedDepth.toFixed(1)} cents of travel against a floor of ${floorDepth.toFixed(1)}`);
      send({ type: 'ctl.set', channel: 0, set: [[CTRL, 64]] });
      await wait(300);
    }

    send({ type: 'note.off', channel: 0, note: NOTE });
    send({ type: 'note.panic' });
    send({ type: 'ctl.set', channel: 0, set: [[121, 0]] });
    await wait(300);
    console.log(`\n${pass}/${pass + fail} green${fail ? ` · ${fail} did not clear the floor` : ''}\n`);
    ws.close();
    process.exit(0);
  } catch (e) {
    console.error(`\n${e.message}\n`);
    try { send({ type: 'note.off', channel: 0, note: NOTE }); send({ type: 'note.panic' }); } catch { /* the socket may be gone */ }
    ws.close();
    process.exit(1);
  }
};
