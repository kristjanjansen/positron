// The granulator's surface: a seeded die that lands somewhere playable, and a slow drift. Ranges
// are read from Engine_Pappus.sc with line numbers. Each granulator records its input into a 60 s
// ring and plays grains from it; msrc/nsrc: 1 OFF (hold), 2 STEREO, 3 MONO L, 4 MONO R.
// why: lessons/rig-board-synth.md#p-header
import { createSocket } from 'node:dgram';
import { oscMessage } from './jacksynth.mjs';
// `partialsOf` is imported, not reimplemented: the page calls the same function on the same spec.
// why: lessons/rig-board-synth.md#partials
import { partialsOf } from '../../demo/shell/source.mjs';
// `sourceArgs` lives in demo/shell/ because the tab loads the same PosSource def and needs the same
// table.
// why: lessons/rig-board-synth.md#source-args
import { sourceArgs, SOURCE_VOICES, SOURCE_PARTIALS } from '../../demo/shell/source-args.mjs';
export { sourceArgs, SOURCE_VOICES, SOURCE_PARTIALS };


export const SCLANG_PORT = 57120, SCLANG_ADDR = '/pappus/cmd';

// Where sclang forwards per-grain reports; decided in run-pappus.scd and mirrored here (node binds
// it).
// If one moves without the other, nothing arrives and nothing says so.
// why: lessons/rig-board-synth.md#grain-port
export const GRAIN_PORT = 57321;

/** The doors `run-pappus.scd` opens for the generated material. */
export const POS_ON = '/pos/on', POS_SET = '/pos/set', POS_SETN = '/pos/setn',
             POS_TABLE = '/pos/table', POS_CONFIRM = '/pos/confirm';

// The smallest OSC reader for what sclang sends: address, typetags, ints and floats.
// why: lessons/rig-board-synth.md#read-osc
export function readOsc(b) {
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

// A seeded PRNG: every roll carries its seed, and passing it back reproduces the roll.
// why: lessons/rig-board-synth.md#mulberry
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The continuous parameters worth rolling. `scale: 'log'` because RATE spans 0.5 to 24 grains/s and
// a
// linear roll lands four in five above 5/s.
// why: lessons/rig-board-synth.md#params
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

// Integer modes with the engine's real ranges, all one-based except `contour` (0..16).
// why: lessons/rig-board-synth.md#modes
export const MODES = [
  // name        lo  hi   engine
  ['scanmode',   1,  4],  // :570, 1 STRETCH, 2 POSITION, 3 DELAY SYNC, 4 DELAY FREE; why: lessons/rig-board-synth.md#scanmode
  ['spraymode',  1,  4],  // :665
  ['swarmmode',  1,  4],  // :596, 1 DETUNE, 2 fifths, 3 octaves, 4 wide; why: lessons/rig-board-synth.md#swarmmode
  ['contour',    0, 16],  // :577  ZERO-based, 17 envelope shapes
];

// Six characters: the character is rolled first and narrows the ranges, so faces differ in kind.
// Anything a character does not name keeps the full range.
// why: lessons/rig-board-synth.md#characters
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
    // A narrowed range crossing or starting at zero falls back to linear, not NaN.
    // why: lessons/rig-board-synth.md#log-fallback
    const log = scale === 'log' && a > 0 && b > 0;
    out[name] = round3(log ? lerpLog(a, b, rnd()) : lerp(a, b, rnd()));
  }
  for (const [name, lo, hi] of MODES) {
    out[name] = lo + Math.floor(rnd() * (hi - lo + 1));
  }
  return out;
}

// The two granulators get different characters. The rest of the chain is rolled too, with corrected
// ranges: pmodel 1..2, pgraintype 1..8 (loop files from 4), and a chord choice that is no longer
// dead code.
// why: lessons/rig-board-synth.md#roll-chain
function rollChain(rnd, root) {
  const f = (lo, hi) => round3(lerp(lo, hi, rnd()));
  const i = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const arr = (n, lo, hi) => Array.from({ length: n }, () => f(lo, hi));
  const bits = (n, p) => Array.from({ length: n }, () => (rnd() < p ? 1 : 0));
  // A pattern guaranteed to fire inside the length read, drawing from the same stream so a seed
  // reproduces.
  // why: lessons/rig-board-synth.md#least
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
              // `elen` is a step count, not a fraction: at or below 1 the pattern reads index 0
              // forever, and 80% of
              // old rolls gated one or both granulators off.
              // why: lessons/rig-board-synth.md#elen
              melen, nelen },
    // The pattern must fire within `elen`: short patterns of zeros are common.
    // why: lessons/rig-board-synth.md#must-fire
    euclid: { epattern: least(bits(16, 0.5), melen), epattern2: least(bits(16, 0.4), nelen) },
    resonator: { pfrq, pamp: Array.from({ length: 48 }, (_, k) => round3(rnd() * Math.exp(-k / 22))),
                 pdamp: f(0.1, 0.9), pbright: f(0, 1), pstruct: f(0, 1), ppos: f(0, 1),
                 pmodel: i(1, 2), pgrain: f(0, 0.7), pgraintype: i(1, 8), root, chord },
    taps: { taptimes: arr(8, 0.02, 1.2), taplevels: arr(8, 0, 0.8),
            tappans: arr(8, -1, 1), tappitch: arr(8, -7, 7),
            sfb: f(0, 0.6), stilt: f(-1, 1), stiltxover: f(200, 4000) },
  };
}

// The eight voices as a rolled chord, only when nothing is loaded and no keyboard drives them.
// why: lessons/rig-board-synth.md#roll-voices
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

  // The whole chain is rolled (the seed brings any roll back); ranges stay musical, not maximal.
  // why: lessons/rig-board-synth.md#whole-chain
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
    // Routing: how much of each granulator reaches each stage, which decides what each skips.
    // why: lessons/rig-board-synth.md#routing
    pin1: f(0, 1), pin2: f(0, 1), sin1: f(0, 1), sin2: f(0, 1),
    kin1: f(0, 1), kin2: f(0, 1), oin1: f(0, 1), oin2: f(0, 1),
  };

  const m = rollSide(rnd, mChar), n = rollSide(rnd, nChar);
  const root = 60 + Math.floor(rnd() * 20) - 12;
  return { seed, character: { m: mChar, n: nChar }, m, n, global,
           chain: rollChain(rnd, root), voices: rollVoices(rnd, root) };
}

// Movement with no control, run by the board: relative to the roll, two sines at a golden ratio so
// it never repeats, integers never drift. `scan` has the widest, slowest swing (it changes what you
// hear).
// why: lessons/rig-board-synth.md#drift
const PHI = 1.6180339887;
export const DRIFT = [
  // name, excursion, period in seconds (fractional and roughly coprime)
  // why: lessons/rig-board-synth.md#drift-table
  ['scan',     0.22,       181.3],
  ['spray',    0.08,        97.7],
  ['swarm',    0.10,       131.1],
  ['tilt',     0.12,       157.9],
  ['size',     0.15,        73.3],   // as a FRACTION of the value, not absolute
  ['sos',      0.06,       113.7],
];
const DRIFT_RELATIVE = new Set(['size']);   // proportional, because size is log-ish
const DRIFT_NAMES = new Set(DRIFT.map(([name]) => name));

// `mscan` -> ['m', 'scan'], or null: the last thing set becomes the drift's centre, so a page that
// never rolls still moves. Only the six continuous DRIFT parameters.
// why: lessons/rig-board-synth.md#drift-target
export function driftTarget(cmd) {
  const m = /^([mn])([a-z]+)$/.exec(String(cmd));
  return m && DRIFT_NAMES.has(m[2]) ? [m[1], m[2]] : null;
}

// Each drifting parameter at time tSec around the roll's values; pure. `side` offsets the phase so
// the two granulators never move together.
// why: lessons/rig-board-synth.md#drift-values
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

// One UDP socket to sclang, the applied state and the drift timer, separate from jacksynth.mjs so
// the
// surface works while the insert is bypassed.
// why: lessons/rig-board-synth.md#open
export function openPappus({ port = SCLANG_PORT, host = '127.0.0.1', onLog } = {}) {
  const udp = createSocket('udp4');

  // Grains the engine reports (sclang batches at 250 ms), kept in a ring of GRAIN_KEEP; `seen` is
  // the
  // uncapped count, so "few grains" differs from "few kept".
  // why: lessons/rig-board-synth.md#grains
  const GRAIN_KEEP = 400;
  let grainRing = [], grainSeen = 0, grainAt = 0;
  const grainUdp = createSocket('udp4');
  // What the server says it holds, from /pos/confirm control values; the client-side node id is not
  // evidence.
  // why: lessons/rig-board-synth.md#src-state
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
  // `rolled` is the last die roll (reported); `centre` is what the drift circles, also moved by
  // params.set.
  // why: lessons/rig-board-synth.md#rolled
  let rolled = null;
  let centre = null;
  // `t0` is the drift's phase origin, reset only by a roll; `centredAt` is when the centre last
  // moved.
  // why: lessons/rig-board-synth.md#clocks
  let timer = null, t0 = Date.now(), centredAt = null, moved = 0;

  const send = (cmd, ...args) => {
    const m = oscMessage(SCLANG_ADDR, [cmd, ...args]);
    udp.send(m, 0, m.length, port, host);
  };
  // Scalars and arrays are different messages (n_set, n_setn); arity cannot tell them apart.
  // why: lessons/rig-board-synth.md#pos-raw
  const posRaw = (addr, args) => {
    const m = oscMessage(addr, args);
    udp.send(m, 0, m.length, port, host);
  };
  const posOn = (on) => posRaw(POS_ON, [on ? 1 : 0]);
  const posSet = (name, v) => posRaw(POS_SET, [name, v]);
  const posSetn = (name, vals) => posRaw(POS_SETN, [name, ...vals]);
  const posConfirm = () => posRaw(POS_CONFIRM, []);
  // Its own door: the amplitudes are a wavetable sclang double-buffers and crossfades.
  // why: lessons/rig-board-synth.md#pos-table
  const posTable = (amps) => posRaw(POS_TABLE, amps);

  /** Send one side's values with its m/n prefix. */
  const sendSide = (pre, vals) => { for (const [k, v] of Object.entries(vals)) send(pre + k, v); };

  // `voices: false` leaves pitches and gates to the keyboard that owns them.
  // why: lessons/rig-board-synth.md#apply
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

  // One named command, taken as the new centre if the drift moves it. Not `send`, which the drift
  // uses:
  // re-centring there would integrate the drift's own output.
  // why: lessons/rig-board-synth.md#set
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
    // Every grain since the last ask, then the ring empties, so a late reader gets no fake burst.
    // why: lessons/rig-board-synth.md#take-grains
    takeGrains() {
      const list = grainRing; grainRing = [];
      const seen = grainSeen; grainSeen = 0;
      return { list, seen, at: grainAt };
    },
    /** Ask the engine to report, or to stop. Off is the default. */
    report(on) { send('report', on ? 1 : 0); return !!on; },

    // Material built from the page's spec; scalars go last so no transient lands in the granulator.
    // why: lessons/rig-board-synth.md#source
    source(spec, { rate = 48000 } = {}) {
      const a = sourceArgs(spec, rate);
      if (!a.ok) return { ok: false, reason: a.reason, partials: a.plan.partials.length };
      srcOn = false; srcNode = -1; srcVoices = -1; srcHz = -1; srcAt = 0;
      posOn(true);
      posTable(a.amps);
      posSetn('semis', a.semis);
      for (const [k, v] of Object.entries(a.scalars)) posSet(k, v);
      // Confirm after the values, or the reply confirms the def's defaults.
      // why: lessons/rig-board-synth.md#confirm-after
      posConfirm();
      return { ok: true, partials: a.partials, spec: a.plan.spec, top: a.plan.partials.reduce((t, p) => Math.max(t, p.hz), 0) };
    },
    /** Ask again. Cheap, and it is how a caller waits for the engine's answer. */
    sourceConfirm() { posConfirm(); },
    /** Release it. The def's own envelope frees the node once it has faded. */
    sourceOff() { srcOn = false; srcNode = -1; srcVoices = -1; srcHz = -1; posOn(false); return true; },
    // What the engine said: `node` -1 with no synth; `ms` since its last answer.
    // why: lessons/rig-board-synth.md#source-state
    sourceState: () => ({ on: srcOn, node: srcNode, voices: srcVoices, hz: srcHz,
                          ms: srcAt ? Date.now() - srcAt : null }),

    send,
    set,
    roll: (seed, opts) => apply(rollPappus(seed), opts),
    apply,
    current: () => rolled,
    // What the drift is circling.
    // why: lessons/rig-board-synth.md#centre
    centre: () => centre,

    // 8 Hz: smooth and cheap, over localhost UDP, never the relay.
    // why: lessons/rig-board-synth.md#start-drift
    startDrift: (hz = 8) => {
      if (timer) return false;
      timer = setInterval(tick, 1000 / hz);
      timer.unref?.();
      onLog?.(`drift on · ${DRIFT.length} parameters · slowest cycle ${Math.max(...DRIFT.map((d) => d[2]))} s`);
      return true;
    },
    stopDrift: () => { if (timer) { clearInterval(timer); timer = null; onLog?.('drift off'); return true; } return false; },
    drifting: () => !!timer,
    // Nudges sent and where scan is; `sinceMs` is since the centre landed (125 ms ticks at 8 Hz).
    // why: lessons/rig-board-synth.md#drift-stats
    driftStats: () => {
      const t = (Date.now() - t0) / 1000;
      return {
        on: !!timer, nudges: moved,
        sinceMs: centredAt ? Date.now() - centredAt : null,
        // Both halves, phase-shifted, so neither side is guessed.
        // why: lessons/rig-board-synth.md#both-halves
        scan: centre ? driftValues(centre.m, t, 0).scan ?? null : null,
        scanN: centre ? driftValues(centre.n, t, 1).scan ?? null : null,
      };
    },

    // Notes into grains: eight voices, `pitches` as semitone offsets with `gates`, resent whole
    // each note.
    // why: lessons/rig-board-synth.md#notes
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
    // A direct `gates` write updates this mirror so `notes.gate` matches the engine; `held` is
    // untouched,
    // since nobody pressed a key.
    // why: lessons/rig-board-synth.md#adopt
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

// ERR's archive path is in archive/box-pappus/pappus-err.js; PosSource and source() are what
// remain.
// why: lessons/rig-board-synth.md#err-gone
