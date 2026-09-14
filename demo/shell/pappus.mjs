// demo/shell/pappus.mjs — the board's granulator, set up the way it expects.
//
// `bootScsynth` (`/shell/scsynth.mjs`) brings SuperCollider up. This brings up
// PAPPUS on top of it: the buffers the graph reads, the seventeen grain windows,
// the gate buffers, and the synth itself.
//
// 🔴 WITHOUT THIS, A LOADED PAPPUS FIRES NOTHING AND MAKES NO SOUND, and says
// nothing about why. MEASURED on `/radio1965/` while it was being written:
// engine up in 531 ms, definition taken in 22 ms, `/s_new` answered `/n_go` —
// and then `0 grains reported in 2.5 s` with the meter at `0.0000`. Every
// visible step succeeded. The graph reads its envelope windows and its gates
// out of BUFFERS, and unallocated buffers are not an error to scsynth, they are
// silence.
//
// ⚠️ IT WAS INSIDE `demo/grains/engine.mjs` AND WAS LIFTED, NOT COPIED. Two
// pages now run this graph and a drift between two copies of the buffer plan
// would be silent at both ends — which is the shape `checkCompiledDefs()`
// exists to refuse for the definition itself.

const SR = 48000;
export const ENV0 = 10;                  // 17 grain windows, ENV0 … ENV0+16
export const GATE0 = 27;                 // two gate buffers
export const WAVE0 = 29;                 // the two PosSource wavetables
export const PAPPUS_NODE = 3000, SOURCE_NODE = 3001;

/**
 * Every buffer the graph expects, by number.
 *
 * ⚠️ ALLOCATED IN FULL EVEN WHEN A PAGE USES ONLY SOME. The numbers are the
 * graph's, not ours; allocating a subset means a page that later touches an
 * unallocated one gets silence rather than a complaint, which is the failure
 * this file was written to stop happening twice.
 */
export function bufferPlan(sourceTable = 4096) {
  const plan = [
    [0, Math.round(60.0 * SR), 1], [1, Math.round(60.0 * SR), 1],
    [2, Math.round(0.1 * SR), 1], [3, Math.round(0.1 * SR), 1],
    [4, Math.round(11.0 * SR), 1],
  ];
  for (let i = 5; i <= 9; i++) plan.push([i, SR * 2, 2]);
  for (let i = 0; i < 17; i++) plan.push([ENV0 + i, 256, 1]);
  plan.push([GATE0, 16, 1], [GATE0 + 1, 16, 1]);
  plan.push([WAVE0, sourceTable, 1], [WAVE0 + 1, sourceTable, 1]);
  return plan;
}

/**
 * The seventeen grain windows, from the engine's own formula.
 *
 * ⚠️ REBUILT HERE, NOT COPIED FROM THE BOARD. `Engine_Pappus.sc` fills them
 * with `Env([0,1,0],[p,1-p],\sine)` discretised to 256, and this is that
 * formula. They are not the board's BYTES; if a sound comparison ever needs
 * them to be, `/b_getn` off the board's scsynth and diff (research §10.10).
 */
export function cosWindow(p) {
  const a = new Array(256);
  for (let i = 0; i < 256; i++) {
    const x = i / 255;
    a[i] = x < p ? 0.5 - 0.5 * Math.cos(Math.PI * (x / p))
                 : 0.5 - 0.5 * Math.cos(Math.PI * (1 - (x - p) / (1 - p)));
  }
  return a;
}

/**
 * Allocate and fill what the graph reads.
 *
 * ⚠️ `/done /b_allocPtr`, NOT `/done /b_alloc`. SuperSonic rewrites the command
 * into its own pointer-based one and answers in THAT name, so a matcher waiting
 * for the reply scsynth documents waits for ever — measured, and it read as a
 * wedged engine rather than as a renamed reply (research §10.8).
 */
export async function allocBuffers(eng, { sourceTable = 4096, log = () => {} } = {}) {
  const plan = bufferPlan(sourceTable);
  let allocated = 0; const refused = [];
  for (const [n, frames, ch] of plan) {
    const got = await eng.sendAndWait(
      (m) => (m[0] === '/done' || m[0] === '/fail') && (m[1] === '/b_alloc' || m[1] === '/b_allocPtr'),
      10000, '/b_alloc', n, frames, ch);
    if (got && got[0] === '/done') allocated++; else refused.push(n);
  }
  // the grain windows, narrow to wide
  for (let i = 0; i <= 16; i++) {
    const p = Math.min(0.96, Math.max(0.04, 0.5 + ((i / 8) - 1) * 0.5));
    eng.send('/b_setn', ENV0 + i, 0, 256, ...cosWindow(p));
  }
  // 🔴 THE GATES, OPEN. A Pappus whose gate buffer is zeros is silent for ever
  // after and nothing says so — `note.panic` on the board has done exactly this
  // three times (HANDOFF: `msrc 1`, `src`/`lock`, `notes.gate`). State a page
  // depends on and never sets is state that will eventually be wrong.
  const ones = new Array(16).fill(1);
  eng.send('/b_setn', GATE0, 0, 16, ...ones);
  eng.send('/b_setn', GATE0 + 1, 0, 16, ...ones);
  await eng.sleep(250);
  log(`${allocated} of ${plan.length} buffers${refused.length ? ` — ${refused.join(',')} refused` : ''}`);
  return { allocated, total: plan.length, refused };
}

/**
 * Start the granulator.
 *
 * ⚠️ `inbusl 2 inbusr 3` IS THE BOARD'S OWN WIRING, not a browser convenience:
 * two output channels come first, so busses 2 and 3 are the first hardware
 * INPUTS — which is where `bootScsynth`'s `input` node writes. The def's own
 * defaults are 0 and 1, so leaving them unset granulates the OUTPUT bus, a
 * feedback path that sounds like a broken instrument rather than a wiring
 * mistake.
 */
export async function startPappusSynth(eng, { node = PAPPUS_NODE, inbusl = 2, inbusr = 3, outbus = 0, addAction = 1 } = {}) {
  const go = await eng.sendAndWait(
    (m) => m[0] === '/n_go' || (m[0] === '/fail' && m[1] === '/s_new'), 8000,
    '/s_new', 'pappus', node, addAction, 0, 'inbusl', inbusl, 'inbusr', inbusr, 'outbus', outbus);
  return !!(go && go[0] === '/n_go');
}

/**
 * One setting on the granulator.
 *
 * ⚠️ AN ARRAY IS A DIFFERENT MESSAGE, AND GUESSING WHICH FROM THE ARITY IS HOW
 * A ONE-ELEMENT ARRAY BECOMES A SCALAR. `gates` and `probs` are eight-element
 * control arrays in this definition, and `/n_set` would write only the first,
 * leaving seven voices at whatever they held.
 */
export function setParam(eng, cmd, value, node = PAPPUS_NODE) {
  if (Array.isArray(value)) eng.send('/n_setn', node, cmd, value.length, ...value);
  else eng.send('/n_set', node, cmd, value);
}

/**
 * 🔴 THE SETTINGS THAT MAKE A PAPPUS AUDIBLE AT ALL. A synth started by
 * `startPappusSynth()` alone sits at `mix 0, gain 0, thru 0, dry 0` — ASKED OF
 * THE SERVER with `/s_get`, not inferred — so it granulates correctly and
 * outputs silence.
 *
 * 🔴 AND A GRAIN COUNT IS NOT EVIDENCE IT IS AUDIBLE. MEASURED: with the input
 * deliberately disconnected, the graph still fired 4–5 grains per window while
 * the output bus read exactly **0.00000**. "Grains are firing and reported" and
 * "sound is coming out" are different claims about different quantities, and
 * reading the first as progress toward the second cost a full debugging round
 * on `/radio1965/`.
 *
 * ⚠️ `gates` IS THE ONE THAT DECIDES WHETHER THE INSTRUMENT EXISTS. The
 * engine's trigger is `trig * (gates[i] > 0.001) * coin * egate`, so all-zeros
 * is a granulator that never fires — while PASSTHROUGH STILL WORKS, so it goes
 * on answering every question and making no grains.
 *
 * `live: true` points the granulator at its input bus (`src 2`, unlocked) —
 * the case where something outside scsynth is filling it. `false` is the held
 * buffer, which is what `/grains/` uses.
 */
export function applyAudibleDefaults(eng, { node = PAPPUS_NODE, live = true, sos = 0.6, bufSeconds = 8 } = {}) {
  const set = (c, v) => setParam(eng, c, v, node);
  for (const h of ['m', 'n']) {
    set(`${h}scanmode`, 2);
    set(`${h}src`, live ? 2 : 1);
    set(`${h}lock`, live ? 0 : 1);
    set(`${h}sos`, sos);
    set(`${h}buflen`, bufSeconds);
  }
  set('amp', 1);
  set('ingain', 1);
  set('run', 1);
  set('gates', [1, 0, 0, 0, 0, 0, 0, 0]);
  set('gates2', [1, 0, 0, 0, 0, 0, 0, 0]);
  set('probs', [1, 1, 1, 1, 1, 1, 1, 1]);
  set('probs2', [1, 1, 1, 1, 1, 1, 1, 1]);
}
