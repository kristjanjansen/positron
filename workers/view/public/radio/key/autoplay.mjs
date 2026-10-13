// demo/radio/key/autoplay.mjs: which chord autoplay plays next, and
// where the pad's three voices go to play it. Plain arithmetic, no WebAudio and
// no DOM, so `autoplay-test.mjs` beside it grades it in node and
// `research/tools/tempo-key/autoplay-chords.mjs` runs it over our R2 recordings.
//
// Asked 2026-10-13 on /radio/key/: *"it feels repeating same chords all
// the time"*. Autoplay was a fixed I vi IV V loop, four seconds a chord, every
// chord in root position, restarting on I at every key change. The owner chose
// two changes:
//
// 1. THE CHORD FOLLOWS THE RADIO. At each change the seven triads of the
//    detected key are scored against the pitch classes the station is sounding
//    NOW (a few seconds of chroma, not the detector's 30 s key memory): the
//    share of that chroma that lands on the chord's notes, plus a small lean
//    toward I, IV, V and vi, minus a small cost for repeating the chord already
//    sounding and for root motions that sound like a step backwards. When the
//    key is unsure or the chroma says nothing (flat, or empty), it walks
//    I IV V vi instead of falling silent.
// 2. VOICE LEADING. The new chord is voiced as the close position (root, first
//    or second inversion, at any octave inside the pad's range) whose three
//    voices move the fewest semitones from the previous chord's three, lowest
//    to lowest, so a note the two chords share is held. The bass is not voiced
//    here: it keeps the chord's root, as before.
//
// ⚠️ NOT THE KIT'S `voiceChord(..., { mode: 'lead' })` FROM demo/shell/chords.mjs,
// on purpose. That one measures each note's distance to the NEAREST note of the
// other chord, so two voices may both count as close to one note. A pad has
// three voices that each go somewhere, so the motion here is paired: sorted
// voice to sorted voice, which is what "moves the voices least" means.

export const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** The triad on scale step `step` (0 to 6) of a key: its pitch classes, root first. */
export function triad(tonic, mode, step) {
  const sc = SCALE[mode];
  return [step, step + 2, step + 4].map((k) => (tonic + sc[k % 7]) % 12);
}

/** The chord's quality from its intervals: 'maj', 'min', 'dim' or 'aug'. */
export function quality(pcs) {
  const third = (pcs[1] - pcs[0] + 12) % 12, fifth = (pcs[2] - pcs[0] + 12) % 12;
  if (third === 4) return fifth === 8 ? 'aug' : 'maj';
  return fifth === 6 ? 'dim' : 'min';
}

/** `I`, `vi`, `vii°`: upper case major, lower case minor, a ring for diminished. */
export function romanOf(tonic, mode, step) {
  const q = quality(triad(tonic, mode, step));
  const r = ROMAN[step];
  return q === 'maj' ? r : q === 'aug' ? `${r}+` : q === 'dim' ? `${r.toLowerCase()}°` : r.toLowerCase();
}

// How much each scale step is favoured before the radio has its say: a
// little for the home chord, less for IV, V and vi, nothing for ii and iii,
// and a cost for the diminished triad on vii, which a pad holding it for four
// seconds turns into a sound nobody expected.
export const STEP_LEAN = [0.06, 0, 0, 0.03, 0.03, 0.03, -0.06];
// Root motion in scale steps, up, mod 7, and what it costs. Down a fifth (up
// a fourth, 3) and down a third (5) are the strongest moves and cost nothing;
// up a second (1) and up a fifth (4) are ordinary; up a third (2) is weaker;
// down a second (6), V to IV or vi to V, is the one that sounds like going
// backwards. 0 is the repeat, which has its own cost.
export const MOVE_COST = [0, 0.01, 0.02, 0, 0.01, 0, 0.03];
// The one constant that trades following the radio against variety. MEASURED
// 2026-10-13 offline on our three R2 recordings against essentia's chord
// track (research/tools/tempo-key/autoplay-chords.mjs): at 0.06 autoplay
// almost never repeats but see-saws I vi I vi while the station sits on one
// chord; at 0 it holds the station's chord for most of a song; 0.03 agrees
// with essentia best on average and see-saws least.
export const REPEAT_COST = 0.03;
// Below this key confidence, or when the chroma's loudest class is less than
// FLAT_PEAK times its mean, the chroma is not trusted and autoplay walks.
export const MIN_CONF = 0.1, FLAT_PEAK = 1.25;
// The walk: I, IV, V, vi, in scale steps.
export const WALK = [0, 3, 4, 5];
// Chord tones weighed: the root and third say which chord it is, the fifth
// is shared by more of the neighbours.
const TONE_W = [1, 1, 0.8];

/** How much the chroma is a chord's: the weighted share of it on the chord's notes. */
export function fit(chroma, pcs) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += chroma[i] > 0 ? chroma[i] : 0;
  if (!(sum > 0)) return 0;
  let on = 0;
  pcs.forEach((pc, i) => { on += TONE_W[i] * Math.max(0, chroma[pc]); });
  return on / sum;
}

/** Is there anything in this chroma to follow: not empty, and not flat. */
export function chromaSays(chroma, flatPeak = FLAT_PEAK) {
  if (!chroma || chroma.length !== 12) return false;
  let sum = 0, top = 0;
  for (const v of chroma) { const x = v > 0 ? v : 0; sum += x; if (x > top) top = x; }
  return sum > 0 && top / (sum / 12) >= flatPeak;
}

/** The walk's next step after `prev`: from I to IV to V to vi and round, and
 *  from anything off the walk back to I. */
export function walkNext(prev) {
  const i = WALK.indexOf(prev);
  return i < 0 ? WALK[0] : WALK[(i + 1) % WALK.length];
}

/**
 * The chord to play next.
 * @param {number[]|null} chroma  twelve pitch class weights, C first, the last few seconds
 * @param {{tonic:number, mode:'major'|'minor', confidence?:number}} key
 * @param {number|null} prev      the scale step sounding now, or null
 * @param {object} [o]            the constants above, for an offline sweep
 * @returns {{step:number, pcs:number[], roman:string, how:'radio'|'walk', scores:number[]}}
 */
export function chooseChord(chroma, key, prev = null, o = {}) {
  const { tonic, mode } = key;
  const { minConf = MIN_CONF, flatPeak = FLAT_PEAK, repeatCost = REPEAT_COST, lean = STEP_LEAN, moveCost = MOVE_COST } = o;
  const conf = Number.isFinite(key.confidence) ? key.confidence : 0;
  const make = (step, how, scores = []) => ({ step, pcs: triad(tonic, mode, step), roman: romanOf(tonic, mode, step), how, scores });
  if (conf < minConf || !chromaSays(chroma, flatPeak)) return make(walkNext(prev), 'walk');
  const scores = [];
  for (let step = 0; step < 7; step++) {
    let s = fit(chroma, triad(tonic, mode, step)) + lean[step];
    if (prev != null) s -= step === prev ? repeatCost : moveCost[(step - prev + 7) % 7];
    scores.push(s);
  }
  let best = 0;
  for (let step = 1; step < 7; step++) if (scores[step] > scores[best]) best = step;
  return make(best, 'radio', scores);
}

/** Every close position of a triad (three inversions, every octave) with all
 *  three notes inside `lo`..`hi`, each sorted low to high. */
export function placements(pcs, lo, hi) {
  const out = [];
  for (let inv = 0; inv < 3; inv++) {
    const order = [pcs[inv], pcs[(inv + 1) % 3], pcs[(inv + 2) % 3]];
    for (let base = lo - 12; base <= hi; base++) {
      if ((base % 12 + 12) % 12 !== order[0]) continue;
      const notes = [base];
      for (const pc of order.slice(1)) {
        let n = notes[notes.length - 1] + 1;
        while ((n % 12 + 12) % 12 !== pc) n++;
        notes.push(n);
      }
      if (notes[0] >= lo && notes[2] <= hi) out.push(notes);
    }
  }
  return out;
}

/** Total semitones the voices travel, lowest to lowest. */
export function motion(a, b) {
  const x = [...a].sort((p, q) => p - q), y = [...b].sort((p, q) => p - q);
  let m = 0;
  for (let i = 0; i < Math.min(x.length, y.length); i++) m += Math.abs(x[i] - y[i]);
  return m;
}

/**
 * Voice a triad against the chord before it.
 * @param {number[]|null} prev  the notes sounding now, or null for a first chord
 * @param {number[]} pcs        the new chord's pitch classes, root first
 * @param {{lo:number, hi:number, home:number}} range  the pad's notes, and where a first chord sits
 * @returns {{notes:number[], motion:number|null, held:number}}
 *   `held` is how many notes the two chords keep in place.
 * With nothing before it the chord goes in root position nearest `home`. A
 * tie on motion goes to the voicing whose middle note sits nearest the middle
 * of the range. What stops a progression that always takes the smallest step
 * from sinking for ever is the range itself: at the edge the only placements
 * left are the ones further in.
 */
export function voiceLead(prev, pcs, range) {
  const { lo, hi } = range;
  const home = range.home ?? Math.round((lo + hi) / 2);
  const all = placements(pcs, lo, hi);
  if (!all.length) throw new Error(`no close position of ${pcs} fits ${lo}..${hi}`);
  const mid = (lo + hi) / 2;
  if (!prev || prev.length !== 3) {
    const roots = all.filter((p) => p[0] % 12 === pcs[0]);
    const pick = roots.reduce((b, p) => (Math.abs(p[0] - home) < Math.abs(b[0] - home) ? p : b), roots[0]);
    return { notes: pick, motion: null, held: 0 };
  }
  let pick = null, best = Infinity, bestOff = Infinity;
  for (const p of all) {
    const m = motion(prev, p), off = Math.abs(p[1] - mid);
    if (m < best || (m === best && off < bestOff)) { pick = p; best = m; bestOff = off; }
  }
  const held = pick.filter((n) => prev.includes(n)).length;
  return { notes: pick, motion: best, held };
}

/** Root position, as autoplay voiced every chord before 2026-10-13: the root
 *  on scale step `step` above `base + tonic`, third and fifth stacked on it. */
export function rootPosition(tonic, mode, step, base) {
  const sc = SCALE[mode], root = base + tonic;
  return [step, step + 2, step + 4].map((k) => root + sc[k % 7] + 12 * Math.floor(k / 7));
}

/** Eases a short chroma toward each new frame: `acc` is changed in place.
 *  `dt` seconds since the frame before, `tau` the window in seconds. */
export function chromaEase(acc, frame, dt, tau) {
  const k = 1 - Math.exp(-Math.max(0, dt) / tau);
  for (let i = 0; i < 12; i++) acc[i] += ((frame[i] > 0 ? frame[i] : 0) - acc[i]) * k;
  return acc;
}
