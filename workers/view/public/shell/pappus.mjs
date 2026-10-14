// demo/shell/pappus.mjs: the board's granulator (Pappus) on top of `bootScsynth`: its buffers,
// seventeen grain windows, gate buffers and the synth. Without them a loaded Pappus fires
// nothing and makes no sound, silently: unallocated buffers are silence to scsynth.
// why: lessons/kit-pappus.md#header

const SR = 48000;
/**
 * The capture ring is 60 s and a reported grain position is a fraction of all of it, not of
 * `mbuflen`; a page drawing grains on the live window rescales by `RING_SECONDS / mbuflen`.
 * why: lessons/kit-pappus.md#ring-seconds
 */
export const RING_SECONDS = 60;
export const ENV0 = 10;                  // 17 grain windows, ENV0 … ENV0+16
export const GATE0 = 27;                 // two gate buffers
export const WAVE0 = 29;                 // the two PosSource wavetables
export const PAPPUS_NODE = 3000, SOURCE_NODE = 3001;

/**
 * Every buffer the graph expects, by number, allocated in full even when a page uses some:
 * an unallocated one is silence, not an error.
 * why: lessons/kit-pappus.md#buffer-plan
 */
export function bufferPlan(sourceTable = 4096) {
  const plan = [
    [0, Math.round(RING_SECONDS * SR), 1], [1, Math.round(RING_SECONDS * SR), 1],
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
 * The seventeen grain windows, from Engine_Pappus.sc's own formula, not the board's bytes
 * (`/b_getn` off the board to compare, research section 10.10).
 * why: lessons/kit-pappus.md#cos-window
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
 * Allocate and fill what the graph reads. SuperSonic answers `/done /b_allocPtr`, not
 * `/done /b_alloc` (research section 10.8).
 * why: lessons/kit-pappus.md#alloc-buffers
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
  // The gates, open: a zero gate buffer silences Pappus for ever, so it is always set here.
  // why: lessons/kit-pappus.md#gates-open
  const ones = new Array(16).fill(1);
  eng.send('/b_setn', GATE0, 0, 16, ...ones);
  eng.send('/b_setn', GATE0 + 1, 0, 16, ...ones);
  await eng.sleep(250);
  log(`${allocated} of ${plan.length} buffers${refused.length ? ` · ${refused.join(',')} refused` : ''}`);
  return { allocated, total: plan.length, refused };
}

/**
 * Start the granulator. `inbusl 2 inbusr 3` are the first hardware inputs, where bootScsynth's
 * `input` writes; the def's defaults 0 and 1 granulate the output bus, a feedback path.
 * why: lessons/kit-pappus.md#start-pappus
 */
export async function startPappusSynth(eng, { node = PAPPUS_NODE, inbusl = 2, inbusr = 3, outbus = 0, addAction = 1 } = {}) {
  const go = await eng.sendAndWait(
    (m) => m[0] === '/n_go' || (m[0] === '/fail' && m[1] === '/s_new'), 8000,
    '/s_new', 'pappus', node, addAction, 0, 'inbusl', inbusl, 'inbusr', inbusr, 'outbus', outbus);
  return !!(go && go[0] === '/n_go');
}

/**
 * One setting on the granulator. An array goes as `/n_setn`: `gates` and `probs` are
 * eight-element arrays and `/n_set` would write only the first.
 * why: lessons/kit-pappus.md#set-param
 */
export function setParam(eng, cmd, value, node = PAPPUS_NODE) {
  if (Array.isArray(value)) eng.send('/n_setn', node, cmd, value.length, ...value);
  else eng.send('/n_set', node, cmd, value);
}

/**
 * The settings that make a Pappus audible: started alone it sits at mix, gain, thru, dry 0.
 * A grain count is not sound (4 to 5 grains a window with the output at 0.00000), and all-zero
 * `gates` never fires. `live: true` reads the input bus; `false` the held buffer (/grains/).
 * why: lessons/kit-pappus.md#audible-defaults
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
