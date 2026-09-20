// rig/board/pappus.mjs — the granulator's surface: what a roll of the dice means,
// and how a sound built on the board gets into it.
//
// Pappus has 106 commands and no patches. "Random" therefore cannot mean a
// program change, and a page of 106 sliders is not an instrument — so the two
// things this module owns are a DIE that lands somewhere playable and a slow
// DRIFT that keeps the sound alive with no control on screen at all.
//
// Every range below was read out of `Engine_Pappus.sc` on the board, with the
// line cited, because two of them were wrong before it was read — see ROLL BUGS
// at the bottom of this header.
//
// ── what the engine actually is ───────────────────────────────────────────
// Pappus is not a synth with presets. Each of its two granulators continuously
// records its AUDIO INPUT into a 60-second circular buffer and plays grains out
// of that buffer. So the sound is whatever went in, and everything here is
// about how it is read back rather than how it is made.
//
//   msrc / nsrc   1 OFF (hold what the buffer already has)   Engine_Pappus.sc:~440
//                 2 STEREO · 3 MONO L · 4 MONO R
//
// ⚠️ ROLL BUGS this module fixes, both found by reading the engine:
//
//   1. `scanmode` was rolled 0..2. The engine does `Select.ar(mscanmode - 1, …)`
//      over a FOUR-element array (line 570), so it is ONE-based: 0 indexes -1,
//      which is out of range, and modes 3 and 4 were unreachable. One roll in
//      three sent an invalid mode.
//   2. `contour` was rolled 1..8. The engine clips it to 0..16 (line 577) and
//      allocates 17 envelope shapes (line 204), so half the shapes could never
//      come up.
import { createSocket } from 'node:dgram';
import { oscMessage } from './jacksynth.mjs';
// 🔴 ONE EXPANDER, TWO MACHINES. `partialsOf` turns a spec into the exact list
// of sines both ends have to make, and it is imported rather than reimplemented
// — the page calls the same function on the same spec. Reimplementing it here
// would be two authorities on one number, which is the mistake plan-twins is
// about, one level down. (push.sh ships every `../../` import beside the board.)
import { partialsOf } from '../../demo/shell/source.mjs';
// 🔴 AND ONE EXPANDER FOR `PosSource` TOO, FOR THE SAME REASON, ONE LEVEL UP.
// `sourceArgs` used to be written out below. It moved to `demo/shell/` the day
// `/grains/` started loading the SAME compiled `PosSource.scsyndef` into wasm
// scsynth in the tab: the browser has to build the same amplitude table, the
// same semitone array and the same three scalars, and a second copy of that
// arithmetic is two authorities on one number.
import { sourceArgs, SOURCE_VOICES, SOURCE_PARTIALS } from '../../demo/shell/source-args.mjs';
export { sourceArgs, SOURCE_VOICES, SOURCE_PARTIALS };


export const SCLANG_PORT = 57120, SCLANG_ADDR = '/pappus/cmd';

/**
 * Where sclang forwards the per-grain reports. ⚠️ DECIDED IN `run-pappus.scd`
 * AND MIRRORED HERE, and that is one number in two files — which this project
 * has a rule about. It is here rather than there because node is the end that
 * BINDS it; if it ever moves, both change or neither works, and the failure is
 * silent in the worst direction (the socket binds, nothing arrives, and the
 * page reads "this granulator fires no grains" about one firing hundreds a
 * second).
 */
export const GRAIN_PORT = 57321;

/** The doors `run-pappus.scd` opens for the generated material. */
export const POS_ON = '/pos/on', POS_SET = '/pos/set', POS_SETN = '/pos/setn',
             POS_TABLE = '/pos/table', POS_CONFIRM = '/pos/confirm';

/**
 * The smallest OSC reader that can read what sclang sends: an address, a type
 * tag string, then ints and floats. It is here rather than in a library
 * because `jacksynth.mjs` only ever needed to WRITE OSC — this is the first
 * thing in the board that has to read any.
 */
function readOsc(b) {
  let i = 0;
  const str = () => {
    const z = b.indexOf(0, i);
    const v = b.toString('ascii', i, z);
    i = (z + 4) & ~3;                  // OSC pads every string to four bytes
    return v;
  };
  const addr = str();
  if (i >= b.length) return { addr, args: [] };
  const tags = str();
  const args = [];
  for (const t of tags.slice(1)) {
    if (t === 'i') { args.push(b.readInt32BE(i)); i += 4; }
    else if (t === 'f') { args.push(b.readFloatBE(i)); i += 4; }
    else if (t === 's') { args.push(str()); }
    else return { addr, args };        // a tag we do not read stops the parse
  }
  return { addr, args };
}

/**
 * A seeded PRNG, because an unrepeatable die is a die you cannot use.
 *
 * The old `randomise()` called Math.random directly, so a roll that landed on
 * something good was gone the moment you pressed anything else. Every roll here
 * carries the seed that produced it; passing it back reproduces the roll
 * exactly. That is the single biggest improvement in this file and it is six
 * lines.
 */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The continuous parameters worth rolling, per granulator.
 *
 * `scale: 'log'` matters and is not decoration. RATE spans 0.5 to 24 grains a
 * second; rolled linearly, four rolls in five land above 5/s — dense — and the
 * sparse half of the range, where you can hear individual grains, is
 * effectively unreachable. The ear hears both of these logarithmically, so the
 * roll has to be logarithmic or the die only ever finds one kind of sound.
 */
export const PARAMS = [
  // name      lo     hi     scale    what it does
  ['rate',     0.5,   24,    'log'],  // grains per second
  ['size',     0.02,  0.4,   'log'],  // grain length, seconds
  ['scan',     0,     1,     'lin'],  // where in the 60 s buffer grains come from
  ['spray',    0,     0.6,   'lin'],  // scatter around that point
  ['swarm',    0,     0.9,   'lin'],  // detuned duplicates per voice
  ['tilt',    -1,     1,     'lin'],  // spectral tilt, baked into the recording
  ['delay',    0,     0.8,   'lin'],
  ['sos',      0,     0.7,   'lin'],  // sound-on-sound: 1 is frozen
  ['strum',    0,     0.5,   'lin'],
];

/**
 * The integer modes, with the ranges the engine actually clips to. All of these
 * are ONE-based except `contour`, which is the trap that made the old roll send
 * an out-of-range value a third of the time.
 */
export const MODES = [
  // name        lo  hi   engine
  ['scanmode',   1,  4],  // :570  1 STRETCH · 2 POSITION · 3 DELAY SYNC · 4 DELAY FREE
  ['spraymode',  1,  4],  // :665
  ['swarmmode',  1,  4],  // :596  1 DETUNE · 2 fifths · 3 octaves · 4 wide
  ['contour',    0, 16],  // :577  ZERO-based, 17 envelope shapes
];

/**
 * SIX CHARACTERS, and this is the actual answer to "improve the randomisation".
 *
 * A uniform roll across nine parameters lands in the middle of all nine almost
 * every time, which is one sound — a mid-density, mid-length wash — wearing
 * different numbers. What makes a die playable is that its faces are DIFFERENT
 * KINDS of thing, so the character is rolled first and the numbers are rolled
 * inside it.
 *
 * Each entry narrows the ranges above. Anything a character does not name keeps
 * the full range, so a character constrains rather than dictates.
 */
export const CHARACTERS = {
  grain:   { rate: [0.5, 3],   size: [0.05, 0.2],  spray: [0, 0.15], swarm: [0, 0.2],  sos: [0, 0.2] },
  cloud:   { rate: [6, 16],    size: [0.08, 0.25], spray: [0.2, 0.5], swarm: [0.3, 0.7] },
  smear:   { rate: [1, 4],     size: [0.25, 0.4],  spray: [0.1, 0.4], sos: [0.3, 0.6] },
  stutter: { rate: [8, 24],    size: [0.02, 0.06], spray: [0, 0.1],  strum: [0.2, 0.5] },
  drone:   { rate: [0.5, 2],   size: [0.3, 0.4],   spray: [0, 0.2],  sos: [0.5, 0.7], swarm: [0.4, 0.9] },
  shatter: { rate: [12, 24],   size: [0.02, 0.05], spray: [0.35, 0.6], swarm: [0.5, 0.9] },
};
export const CHARACTER_NAMES = Object.keys(CHARACTERS);

const lerp = (lo, hi, u) => lo + (hi - lo) * u;
const lerpLog = (lo, hi, u) => lo * Math.pow(hi / lo, u);
const round3 = (v) => +v.toFixed(3);

/**
 * Roll one granulator inside a character.
 */
function rollSide(rnd, character) {
  const narrow = CHARACTERS[character] || {};
  const out = {};
  for (const [name, lo, hi, scale] of PARAMS) {
    const [a, b] = narrow[name] || [lo, hi];
    // A narrowed range may cross zero or start at zero, where a log
    // interpolation is undefined — fall back to linear rather than emit NaN.
    const log = scale === 'log' && a > 0 && b > 0;
    out[name] = round3(log ? lerpLog(a, b, rnd()) : lerp(a, b, rnd()));
  }
  for (const [name, lo, hi] of MODES) {
    out[name] = lo + Math.floor(rnd() * (hi - lo + 1));
  }
  return out;
}

/**
 * THE TWO GRANULATORS GET DIFFERENT CHARACTERS.
 *
 * Rolling both from one distribution is what made every roll sound like one
 * thing played twice — which is exactly the complaint the engine's own comment
 * makes about sharing a buffer: "two granulators sharing a capture buffer are
 * not two granulators, they are one buffer read twice." The same is true of the
 * parameters. Pairing an ordinary character against a contrasting one is the
 * whole reason there are two.
 */
/**
 * The rest of the chain: the window into the buffer, the euclidean gate, the
 * 48 resonators, and the eight delay taps.
 *
 * Carried over from the roll this supersedes — it covered all of this and the
 * granulator surface alone would have been a regression — with four range
 * corrections, each read out of the engine:
 *
 *   `pmodel`      1..2, was 0..2   (:1110, and it clips, so 0 and 1 were one mode)
 *   `pgraintype`  1..8, was 0..2   (:947/:954 — 1-3 are washes, 4+ pick one of
 *                                   the five shipped loop files, which were
 *                                   unreachable entirely)
 *   the chord     was DEAD CODE: `[0,3,7,10,14,17][x] !== undefined ? A : B`
 *                 is always true, because index 0 and index 1 of that array are
 *                 both defined. The major chord could never be chosen.
 */
function rollChain(rnd, root) {
  const f = (lo, hi) => round3(lerp(lo, hi, rnd()));
  const i = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const arr = (n, lo, hi) => Array.from({ length: n }, () => f(lo, hi));
  const bits = (n, p) => Array.from({ length: n }, () => (rnd() < p ? 1 : 0));
  /**
   * A pattern that is guaranteed to fire inside the length that will be read.
   *
   * Draws the bit to force from the SAME stream, so the roll stays a pure
   * function of the seed — a repair that consumed a variable number of draws
   * would make a seed reproduce only sometimes, which is worse than the bug.
   */
  const least = (pat, len) => {
    const forced = Math.floor(rnd() * len);
    if (!pat.slice(0, len).some((b) => b)) pat[forced] = 1;
    return pat;
  };

  // A real coin, so both chords are reachable. Minor-with-extensions against a
  // major seventh is the difference between a brooding wash and a bright one,
  // and half the rolls should be each.
  const chord = rnd() < 0.5 ? [0, 3, 7, 10, 14, 17] : [0, 4, 7, 11];
  const pfrq = Array.from({ length: 48 }, (_, k) =>
    +(440 * Math.pow(2, ((root + chord[k % chord.length] + 12 * Math.floor(k / chord.length / 2)) - 69) / 12)).toFixed(2));

  // The euclid LENGTHS are drawn before the patterns, because a pattern has to
  // be checked against the length that will actually be read.
  const melen = i(2, 16), nelen = i(2, 16);

  return {
    window: { mbuflen: f(1, 12), nbuflen: f(1, 12),
              mwinstart: f(0, 0.4), nwinstart: f(0, 0.4),
              mwinend: f(0.6, 1), nwinend: f(0.6, 1),
              // ⚠️ `elen` IS A STEP COUNT, NOT A FRACTION, and rolling it 0.2..1
              // switched the granulators OFF in most rolls. The engine reads the
              // pattern as `(estep + mephase*i).floor % melen.max(1)`
              // (Engine_Pappus.sc:654) and advances it with
              // `Stepper.ar(trig, 0, 0, (melen - 1).max(0), 1)` (:558) — so any
              // value at or below 1 makes the modulo `% 1`, which is 0 for every
              // voice at every step. The pattern is then read at index 0 forever,
              // and if that bit is a 0 the granulator never fires a grain.
              //
              // Measured over 20,000 rolls of the old code: **30.5% of rolls
              // gated BOTH granulators off and 49.6% gated exactly one** — so
              // only about a fifth of rolls left the instrument running at all.
              // Seed 372057 is one of the dead ones, which is why a buffer
              // holding a minute of material measured 0.0798 before a roll and
              // 0.0050 after.
              // Nothing reported an error; the die simply produced silence most
              // of the time, and that read as "granular is subtle".
              melen, nelen },
    // ⚠️ AND THE PATTERN MUST FIRE. A voice reads `epattern[step]`, so a run of
    // zeros inside the active length is silence with the gate wide open. At
    // p=0.5 over sixteen steps an all-zero pattern is rare; inside a SHORT one
    // it is not — with a length of 2 the odds of both steps being 0 are one in
    // four. `least` guarantees a hit in the first `elen` steps, which is the
    // difference between a rhythm and a rest.
    euclid: { epattern: least(bits(16, 0.5), melen), epattern2: least(bits(16, 0.4), nelen) },
    resonator: { pfrq, pamp: Array.from({ length: 48 }, (_, k) => round3(rnd() * Math.exp(-k / 22))),
                 pdamp: f(0.1, 0.9), pbright: f(0, 1), pstruct: f(0, 1), ppos: f(0, 1),
                 pmodel: i(1, 2), pgrain: f(0, 0.7), pgraintype: i(1, 8), root, chord },
    taps: { taptimes: arr(8, 0.02, 1.2), taplevels: arr(8, 0, 0.8),
            tappans: arr(8, -1, 1), tappitch: arr(8, -7, 7),
            sfb: f(0, 0.6), stilt: f(-1, 1), stiltxover: f(200, 4000) },
  };
}

/**
 * The eight grain voices, as a rolled chord.
 *
 * ⚠️ Rolled ONLY when nothing is loaded into the buffers. Once material is
 * loaded and the keyboard is driving `pitches`/`gates`, a roll that also wrote
 * them would silently take the instrument away from whoever is playing it —
 * and it would look like the keyboard had stopped working.
 */
function rollVoices(rnd, root) {
  // A scale rather than free intervals, or it is atonal by construction.
  const SCALE = [0, 2, 3, 5, 7, 8, 10, 12, -5, -12];
  const pick = () => Array.from({ length: 8 }, () => SCALE[Math.floor(rnd() * SCALE.length)]);
  const bits = (p) => Array.from({ length: 8 }, () => (rnd() < p ? 1 : 0));
  const probs = () => Array.from({ length: 8 }, () => round3(lerp(0.4, 1, rnd())));
  return { root, pitches: pick(), pitches2: pick(), gates: bits(0.55), gates2: bits(0.45), probs: probs(), probs2: probs() };
}

export function rollPappus(seed = (Math.random() * 0xffffffff) >>> 0) {
  const rnd = mulberry32(seed);
  const mChar = CHARACTER_NAMES[Math.floor(rnd() * CHARACTER_NAMES.length)];
  let nChar = CHARACTER_NAMES[Math.floor(rnd() * CHARACTER_NAMES.length)];
  // One re-draw, never a loop: a loop on a seeded PRNG consumes an unbounded
  // number of draws and makes the roll's own reproducibility depend on how many
  // times it happened to collide.
  if (nChar === mChar) nChar = CHARACTER_NAMES[(CHARACTER_NAMES.indexOf(mChar) + 1 + Math.floor(rnd() * (CHARACTER_NAMES.length - 1))) % CHARACTER_NAMES.length];

  // The whole chain is rolled, not a sample of it. An earlier draft rolled it
  // sparsely, on the theory that a roll changing everything teaches you
  // nothing — but the SEED already solves that, and better: you can return to
  // any roll exactly instead of hoping the next one keeps what you liked. For
  // an engine with 106 knobs and no presets, a die that hands you a whole world
  // is the point.
  //
  // Ranges stay musical rather than maximal — wet levels off the ceiling,
  // feedback short of runaway — because a die that mostly produces mush is one
  // nobody presses twice. They are carried over from the roll this supersedes.
  const f = (lo, hi) => round3(lerp(lo, hi, rnd()));
  const i = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const global = {
    // COLOUR. `crushmode` is 1..3 and `noisetype` 1..8 (1-3 washes, 4-8 pick
    // one of the five shipped loop files); both were rolled 0..2 before, so the
    // loops were unreachable and mode 3 never came up.
    drive: f(0, 0.6), crush: f(0, 0.5), crushmode: i(1, 3), loss: f(0, 0.5),
    noise: f(0, 0.3), noisetype: i(1, 8), noisedecay: f(0.05, 1), noisetone: f(0, 1),
    kwow: f(0, 0.4),
    // REVERB and the filterbank's tail.
    rverb: f(0.1, 0.7), rtime: f(0.5, 6), rshimmer: f(0, 0.5), rshimmersemi: i(-12, 12),
    sdiffuse: f(0, 0.9), swet: f(0.1, 0.7), scycle: f(0.1, 2), pwet: f(0.15, 0.85),
    // ROUTING — how much of each granulator reaches each stage. This changes
    // the character more than any single knob, because it decides whether
    // either granulator skips a part of the chain at all.
    pin1: f(0, 1), pin2: f(0, 1), sin1: f(0, 1), sin2: f(0, 1),
    kin1: f(0, 1), kin2: f(0, 1), oin1: f(0, 1), oin2: f(0, 1),
  };

  const m = rollSide(rnd, mChar), n = rollSide(rnd, nChar);
  const root = 60 + Math.floor(rnd() * 20) - 12;
  return { seed, character: { m: mChar, n: nChar }, m, n, global,
           chain: rollChain(rnd, root), voices: rollVoices(rnd, root) };
}

/**
 * ── MOVEMENT, with no control on screen ──────────────────────────────────
 *
 * The brief was "subtle movement, no slider", so this is not a control the page
 * exposes — it is something the board does. It runs in the board process, which
 * means the sound keeps moving at three in the morning with nobody connected,
 * which is what §8.7 of plan-hardware means by the board being an OBJECT rather
 * than a SESSION.
 *
 * Three rules, each of which is the difference between drift and noise:
 *
 * 1. **Drift is relative to the roll, never absolute.** Each parameter moves in
 *    a band around whatever the last roll set it to, so movement never walks
 *    the sound out of its character. Re-rolling re-centres it.
 *
 * 2. **Two sines at incommensurate periods, never one.** A single sine is a
 *    cycle a listener learns in a minute. Two at a golden ratio never repeat,
 *    so nothing on the page ever comes back around.
 *
 * 3. **Integers never drift.** A mode is an edge, not a position — crossing one
 *    mid-note is a click, not a movement. Only the continuous parameters move.
 *
 * `scan` gets the widest excursion and the slowest period because it is the
 * only parameter that changes WHAT you are hearing rather than how: it walks
 * the read head through sixty seconds of recorded material. The rest are how.
 */
const PHI = 1.6180339887;
export const DRIFT = [
  // name      excursion   period, seconds   (fractional and mutually prime-ish:
  //                                          CLAUDE.md — use fractional offsets
  //                                          in every cadence)
  ['scan',     0.22,       181.3],
  ['spray',    0.08,        97.7],
  ['swarm',    0.10,       131.1],
  ['tilt',     0.12,       157.9],
  ['size',     0.15,        73.3],   // as a FRACTION of the value, not absolute
  ['sos',      0.06,       113.7],
];
const DRIFT_RELATIVE = new Set(['size']);   // proportional, because size is log-ish
const DRIFT_NAMES = new Set(DRIFT.map(([name]) => name));

/**
 * Which side and which parameter a raw engine command names — `mscan` ->
 * `['m','scan']` — or null when it is not one the drift moves.
 *
 * 🔴 THIS IS WHAT GIVES A PAGE THAT DOES NOT ROLL A CENTRE TO MOVE AROUND.
 * The drift circles whatever the last DICE ROLL set, and `grains` sets each
 * parameter directly instead of rolling: six named patches, no die. So the
 * board's timer turned over with nothing to circle, `nudges` stayed 0 and
 * `scan` came back null, for as long as anybody cared to wait — a readout
 * cell that could not change, which is the `missed: 1` fault in CLAUDE.md.
 * With this, the last thing anybody SET is the centre, whether a die chose it
 * or a person did.
 *
 * ⚠️ It is deliberately narrow. `mrate` is not here because an integer-ish
 * grain rate is not drifted, and `pitches` is not here because it is a
 * keyboard's, not a parameter's. A centre is only ever the six continuous
 * parameters in `DRIFT` — anything else in it would be carried around and
 * never read.
 */
export function driftTarget(cmd) {
  const m = /^([mn])([a-z]+)$/.exec(String(cmd));
  return m && DRIFT_NAMES.has(m[2]) ? [m[1], m[2]] : null;
}

/**
 * What every drifting parameter should be at time `tSec`, given the values the
 * roll set. Pure — which is what makes it testable with no board, no JACK and
 * no sound card.
 *
 * `side` shifts the phase so the two granulators never move together; without
 * it they breathe in unison and the pair sounds like one wide voice.
 */
export function driftValues(base, tSec, side = 0) {
  const out = {};
  for (const [name, exc, period] of DRIFT) {
    const b = base[name];
    if (b === undefined) continue;
    const [lo, hi] = PARAMS.find((p) => p[0] === name).slice(1, 3);
    const ph = side * 0.37;                       // a third of a cycle apart
    const a = Math.sin(2 * Math.PI * (tSec / period + ph));
    const c = Math.sin(2 * Math.PI * (tSec / (period * PHI) + ph * PHI));
    const lfo = (a + c) / 2;                      // in -1 .. 1, never repeating
    const span = DRIFT_RELATIVE.has(name) ? Math.abs(b) * exc : (hi - lo) * exc;
    out[name] = round3(Math.min(hi, Math.max(lo, b + lfo * span)));
  }
  return out;
}

/**
 * ── the live surface ─────────────────────────────────────────────────────
 *
 * One UDP socket to sclang, the applied state, and the drift timer. The socket
 * is this module's own rather than `jacksynth.mjs`'s, so the granulator's
 * parameter surface can be driven whether or not an instrument is up — the
 * engine keeps running while it is bypassed, and a drift that stopped when the
 * insert was switched off would be a drift you could hear stop.
 */
export function openPappus({ port = SCLANG_PORT, host = '127.0.0.1', onLog } = {}) {
  const udp = createSocket('udp4');

  // ── the grains the engine reports ────────────────────────────────────────
  //
  // 🔴 THIS IS THE ONE THING NOTHING DOWNSTREAM CAN RECONSTRUCT. A page drawing
  // this granulator beside one running in a browser could mark every grain on
  // the browser's side and none on this one, because a grain inferred from an
  // output envelope might be a note, a delay tap or a reverb swell. The engine
  // reports each one as `GrainBuf` is triggered (see `report` in
  // Engine_Pappus.sc), sclang batches them at 250 ms, and this is where they
  // land.
  //
  // ⚠️ A RING, NOT A LIST. Nothing here knows when a reader will next ask, and
  // at 24 grains a second across sixteen voices an unbounded array is a leak
  // with a slow fuse. `seen` is the honest count and is NOT capped — it is what
  // lets a reader tell "few grains" from "few kept".
  const GRAIN_KEEP = 400;
  let grainRing = [], grainSeen = 0, grainAt = 0;
  const grainUdp = createSocket('udp4');
  // 🔴 WHAT THE SERVER SAYS IT HOLDS — AND THE FIRST VERSION OF THIS WAS A LIE
  // THAT READ AS EVIDENCE. It reported the node id sclang answered with, which
  // `Synth.new` allocates on the CLIENT before the server has read the message:
  // measured on the board, it answered `node 1002, engineOn true` about a def
  // that had failed to load, and a page would have drawn "the board is chewing
  // the same material" over silence. `/pos/confirm` asks scsynth for a CONTROL
  // VALUE instead, so nothing arrives here unless the node is really there with
  // the numbers really in it.
  let srcNode = -1, srcOn = false, srcAt = 0, srcVoices = -1, srcHz = -1;
  grainUdp.on('message', (b) => {
    let m;
    try { m = readOsc(b); } catch { return; }
    if (m.addr === '/possrc' && m.args.length >= 2) {
      srcOn = (m.args[0] | 0) > 0; srcNode = m.args[1] | 0;
      srcVoices = m.args.length > 2 ? Math.round(m.args[2]) : -1;
      srcHz = m.args.length > 3 ? m.args[3] : -1;
      srcAt = Date.now();
      return;
    }
    if (m.addr !== '/pgrain' || !m.args.length) return;
    grainAt = Date.now();
    grainSeen += m.args[0] | 0;
    // pairs of (position in the buffer, which half fired it)
    for (let i = 1; i + 1 < m.args.length; i += 2) {
      grainRing.push({ pos: m.args[i], half: m.args[i + 1] | 0 });
    }
    if (grainRing.length > GRAIN_KEEP) grainRing = grainRing.slice(-GRAIN_KEEP);
  });
  grainUdp.on('error', () => { /* nothing is listening; that is not an error here */ });
  try { grainUdp.bind(GRAIN_PORT, '127.0.0.1'); } catch { /* already bound */ }
  /**
   * TWO THINGS, AND THEY USED TO BE ONE. `rolled` is the last dice roll, which
   * is what `params.state` reports and what a page draws a character from.
   * `centre` is what the drift circles, and it is also moved by a plain
   * `params.set` — so a page that never rolls still has something to move
   * around. Reporting a set-derived centre AS a roll would put a character and
   * a seed on screen that no die ever produced.
   */
  let rolled = null;
  let centre = null;
  /**
   * Two clocks, for the same reason. `t0` is the drift's PHASE origin and only
   * a roll resets it; `centredAt` is when the centre last moved. A slider drag
   * sends a `params.set` every few milliseconds, and resetting the phase on
   * each one would pin the drift at t=0 — the nudge counter climbing while
   * nothing in the sound moves, which is the one failure this page's readout
   * exists to make impossible.
   */
  let timer = null, t0 = Date.now(), centredAt = null, moved = 0;

  const send = (cmd, ...args) => {
    const m = oscMessage(SCLANG_ADDR, [cmd, ...args]);
    udp.send(m, 0, m.length, port, host);
  };
  // The generated material's three doors. ⚠️ SCALARS AND ARRAYS ARE DIFFERENT
  // MESSAGES — `n_set` and `n_setn` — and sclang cannot tell which a value
  // wants from its arity, so a one-element array would silently become a
  // scalar and write only the first entry of a 24-entry table.
  const posRaw = (addr, args) => {
    const m = oscMessage(addr, args);
    udp.send(m, 0, m.length, port, host);
  };
  const posOn = (on) => posRaw(POS_ON, [on ? 1 : 0]);
  const posSet = (name, v) => posRaw(POS_SET, [name, v]);
  const posSetn = (name, vals) => posRaw(POS_SETN, [name, ...vals]);
  const posConfirm = () => posRaw(POS_CONFIRM, []);
  // ⚠️ ITS OWN DOOR, NOT `setn`. The amplitudes are not a control any more —
  // they are a WAVETABLE, and sclang has to fill the buffer that is not
  // currently being read and then crossfade to it. That is three server
  // operations in an order only sclang can hold.
  const posTable = (amps) => posRaw(POS_TABLE, amps);

  /** Send one side's values with its m/n prefix. */
  const sendSide = (pre, vals) => { for (const [k, v] of Object.entries(vals)) send(pre + k, v); };

  /**
   * `voices: false` leaves `pitches`/`gates` alone, which is what a roll must
   * do while a keyboard owns them — otherwise the roll silently takes the
   * instrument away from whoever is playing it, and it reads as the keyboard
   * having stopped working rather than as the die having done something.
   */
  const apply = (roll, { voices = true } = {}) => {
    sendSide('m', roll.m);
    sendSide('n', roll.n);
    for (const [k, v] of Object.entries(roll.global)) send(k, v);
    // The window and the euclidean gate are per-granulator names already.
    for (const [k, v] of Object.entries(roll.chain.window)) send(k, v);
    for (const [k, v] of Object.entries(roll.chain.euclid)) send(k, ...v);
    const { root, chord, ...res } = roll.chain.resonator;
    for (const [k, v] of Object.entries(res)) Array.isArray(v) ? send(k, ...v) : send(k, v);
    for (const [k, v] of Object.entries(roll.chain.taps)) Array.isArray(v) ? send(k, ...v) : send(k, v);
    if (voices) {
      const { root: _r, ...vv } = roll.voices;
      for (const [k, v] of Object.entries(vv)) send(k, ...v);
    }
    rolled = roll;
    centre = { m: { ...roll.m }, n: { ...roll.n } };
    t0 = centredAt = Date.now();
    return roll;
  };

  /**
   * One named engine command, sent — and taken as the new centre when it names
   * a parameter the drift moves. Returns what it re-centred, or null.
   *
   * ⚠️ NOT `send`. `tick()` sends the drifted values through `send`, so a
   * `send` that re-centred would feed the drift its own output back and
   * integrate: the sound would walk away from the character instead of
   * circling it. This is the one door a person's parameter comes through;
   * `send` stays the raw one.
   */
  const set = (cmd, ...args) => {
    send(cmd, ...args);
    const hit = driftTarget(cmd);
    if (!hit || typeof args[0] !== 'number' || !Number.isFinite(args[0])) return null;
    centre ??= { m: {}, n: {} };
    centre[hit[0]][hit[1]] = args[0];
    centredAt = Date.now();
    return hit;
  };

  const tick = () => {
    if (!centre) return;
    const t = (Date.now() - t0) / 1000;
    sendSide('m', driftValues(centre.m, t, 0));
    sendSide('n', driftValues(centre.n, t, 1));
    moved++;
  };

  return {
    /**
     * Every grain reported since the last ask, and then the ring is emptied —
     * so two readers cannot both claim the same grains, and a reader that
     * stops asking does not accumulate a backlog it will later draw all at
     * once as a burst that never happened.
     */
    takeGrains() {
      const list = grainRing; grainRing = [];
      const seen = grainSeen; grainSeen = 0;
      return { list, seen, at: grainAt };
    },
    /** Ask the engine to report, or to stop. Off is the default. */
    report(on) { send('report', on ? 1 : 0); return !!on; },

    /**
     * The material, built on the board from the page's own description.
     *
     * ⚠️ THE SCALARS GO LAST. `nvoices` silences the voices above the chord and
     * `amps` carries the level, so setting the table before the count means one
     * block at most where a six-voice table is playing through four voices —
     * inaudible, but it is also the order that cannot produce a loud transient,
     * and a granulator's input is exactly where a transient becomes permanent.
     */
    source(spec, { rate = 48000 } = {}) {
      const a = sourceArgs(spec, rate);
      if (!a.ok) return { ok: false, reason: a.reason, partials: a.plan.partials.length };
      srcOn = false; srcNode = -1; srcVoices = -1; srcHz = -1; srcAt = 0;
      posOn(true);
      posTable(a.amps);
      posSetn('semis', a.semis);
      for (const [k, v] of Object.entries(a.scalars)) posSet(k, v);
      // ⚠️ AFTER THE VALUES, NEVER BEFORE. The reply carries the control values
      // scsynth actually holds, so asking first would confirm the def's
      // DEFAULTS and call them the spec — a check that passes on a board that
      // never received anything.
      posConfirm();
      return { ok: true, partials: a.partials, spec: a.plan.spec, top: a.plan.partials.reduce((t, p) => Math.max(t, p.hz), 0) };
    },
    /** Ask again. Cheap, and it is how a caller waits for the engine's answer. */
    sourceConfirm() { posConfirm(); },
    /** Release it. The def's own envelope frees the node once it has faded. */
    sourceOff() { srcOn = false; srcNode = -1; srcVoices = -1; srcHz = -1; posOn(false); return true; },
    /**
     * What the ENGINE said, not what was asked for. `node` is `-1` when sclang
     * has no synth; `ms` is how long ago it last answered, so a stale claim
     * reads as stale rather than as current.
     */
    sourceState: () => ({ on: srcOn, node: srcNode, voices: srcVoices, hz: srcHz,
                          ms: srcAt ? Date.now() - srcAt : null }),

    send,
    set,
    roll: (seed, opts) => apply(rollPappus(seed), opts),
    apply,
    current: () => rolled,
    /** What the drift is circling — a roll's values, or whatever was set since. */
    centre: () => centre,

    /**
     * 8 Hz. Fast enough that a slow sine is smooth rather than stepped, slow
     * enough to be nothing: this is localhost UDP to sclang, not the relay, so
     * it never touches the 60 msg/s budget that the relay silently enforces.
     */
    startDrift: (hz = 8) => {
      if (timer) return false;
      timer = setInterval(tick, 1000 / hz);
      timer.unref?.();
      onLog?.(`drift on · ${DRIFT.length} parameters · slowest cycle ${Math.max(...DRIFT.map((d) => d[2]))} s`);
      return true;
    },
    stopDrift: () => { if (timer) { clearInterval(timer); timer = null; onLog?.('drift off'); return true; } return false; },
    drifting: () => !!timer,
    /**
     * A readout cell that moves: how many nudges have gone out, and where scan
     * is now. `sinceMs` is how long ago the CENTRE landed, not how long the
     * timer has run — a page uses it to tell "no tick yet" from "not moving",
     * and at 8 Hz those are 125 ms apart.
     */
    driftStats: () => {
      const t = (Date.now() - t0) / 1000;
      return {
        on: !!timer, nudges: moved,
        sinceMs: centredAt ? Date.now() - centredAt : null,
        // BOTH HALVES, because reporting only side m made any page drawing
        // where the engine reads have one measured centre and one it had to
        // fall back to asking for — an asymmetry with no cause. `side` shifts
        // the phase, so the two are genuinely different numbers.
        scan: centre ? driftValues(centre.m, t, 0).scan ?? null : null,
        scanN: centre ? driftValues(centre.n, t, 1).scan ?? null : null,
      };
    },

    /**
     * NOTES INTO GRAINS — what makes a recording playable as an instrument.
     *
     * Each granulator has eight voices, and `pitches` is eight SEMITONE offsets
     * (Engine_Pappus.sc:293 — "the same 2**(n/12) convention as `pitches`"),
     * with `gates` opening each one. So a note is a voice slot, and eight-note
     * polyphony comes free.
     *
     * ⚠️ `pitches` is a setn of all eight at once, so voices are tracked here
     * and the whole array is resent on every note. There is no per-voice
     * message to send instead.
     */
    notes: makeVoices(send),

    close: () => {
      if (timer) clearInterval(timer);
      try { udp.close(); } catch { /* already */ }
      try { grainUdp.close(); } catch { /* already */ }
    },
  };
}

/** Eight voice slots, oldest stolen, for both granulators at once. */
function makeVoices(send) {
  const N = 8;
  const pitch = new Array(N).fill(0), gate = new Array(N).fill(0), held = new Array(N).fill(null);
  let order = 0; const age = new Array(N).fill(0);
  const flush = () => {
    send('pitches', ...pitch); send('gates', ...gate);
    send('pitches2', ...pitch); send('gates2', ...gate);
  };
  return {
    on(note, _vel = 100, root = 60) {
      let i = held.indexOf(null);
      // Steal the oldest rather than dropping the note: a granulator with all
      // eight gates open and a ninth key pressed should sound, and silence
      // would read as a broken keyboard.
      if (i < 0) { i = age.indexOf(Math.min(...age)); }
      held[i] = note; pitch[i] = note - root; gate[i] = 1; age[i] = ++order;
      flush(); return i;
    },
    off(note) {
      const i = held.indexOf(note);
      if (i < 0) return -1;
      held[i] = null; gate[i] = 0; age[i] = 0;
      flush(); return i;
    },
    panic() { held.fill(null); gate.fill(0); age.fill(0); flush(); },
    /**
     * 🔴 SOMEBODY WROTE `gates` DIRECTLY, SO THIS MIRROR HAS TO FOLLOW IT.
     *
     * `state()` is what `params.state` reports as `notes.gate`, and it was the
     * KEYBOARD's model rather than the engine's. `params.set {cmd:'gates'}`
     * goes straight out as OSC and never passed through here — so a page that
     * opened the gates itself (which `/grains/` now does, because it plays no
     * notes into the granulator) left the board reporting
     * `[0,0,0,0,0,0,0,0]` about a granulator firing grains.
     *
     * ⚠️ Two authorities on one number, and the wrong one was being published.
     * A readout that contradicts the thing it describes is worse than none —
     * measured 2026-09-14 as `0 of the board's 8 voices open` printed beside a
     * board reporting 2.2 grains a second.
     *
     * ⚠️ `held` IS DELIBERATELY NOT TOUCHED. Nobody pressed a key, so no note
     * is being held; claiming one would be the same mistake in the other
     * direction. Voices opened this way are open and unheld, which is exactly
     * what a granulator driven as an insert is.
     */
    adopt(g) {
      if (!Array.isArray(g)) return;
      for (let i = 0; i < N && i < g.length; i++) {
        gate[i] = g[i] > 0.001 ? 1 : 0;
        if (!gate[i]) { held[i] = null; age[i] = 0; }
      }
    },
    state: () => ({ held: held.slice(), pitch: pitch.slice(), gate: gate.slice() }),
  };
}

/**
 * 🔴 ERR'S 1965 ARCHIVE LEFT THIS FILE ON 2026-09-16, ALL OF IT.
 *
 * `errSearch`, `errItem`, `errExcerpt`, `errStatus` and `loadBuffers` pulled a
 * broadcast out of `arhiiv.err.ee`, cut a minute of it to a WAV with ffmpeg and
 * wrote that into the four grain buffers. No page in `demo/` ever called any of
 * them, and every connection this repo opens to ERR appears in a public
 * broadcaster's audience measurement. So a path to their archive from a board
 * nobody is watching was exposure with nothing on the other side of it.
 *
 * `archive/box-pappus/pappus-err.js` is the code, verbatim, including the
 * politeness this file had earned the hard way: a disk cache for a year that
 * ended sixty years ago, a floor between requests, and a backoff that stopped
 * asking when ERR said no. Read that before writing anything like it again.
 *
 * ⚠️ WHAT DID NOT GO: `PosSource` and everything around `source()` above. That
 * material is BUILT on this board from a spec `/grains/` sends, touches nobody
 * else's server, and is the whole point of that page.
 */
