// demo/shell/radio-gran.mjs: the radio-into-Pappus machine (relay, twelve sounds, modulator,
// patch writing, tempo lock, tour clock), no DOM. /archive/radio/ still carries its own copy.
// The tour clock exports have no caller today; /videoradio/ is meant to move onto them.
// why: lessons/kit-radio-gran.md#header

import { spec } from './pappus-mod.mjs';
import { setParam, GATE0 } from './pappus.mjs';

/**
 * The seconds Pappus holds (`mbuflen`); rescale grain positions by RING_SECONDS / BUF_SECONDS.
 * Eight, not sixty: the ring must fill before the granulator sounds like itself.
 * why: lessons/kit-radio-gran.md#buf-seconds
 */
export const BUF_SECONDS = 8;

// The relay's stations. The third column is each station's nominal kbit/s, not a shared constant.
// Two are AAC; mp3-stream.mjs picks the scanner from content-type. Pages open the first entry,
// so the 320 kbit/s IDA mounts stay last.
// why: lessons/kit-radio-gran.md#stations
export const STATIONS = [
  // Radio 1965 removed at the uuu.ee operator's request.
  // why: lessons/kit-radio-gran.md#stations-radio1965
  ['Klassika', 'klassikaraadio', 128],
  ['Viker', 'vikerraadio', 128],
  ['R2', 'raadio2', 128],
  ['R4', 'raadio4', 128],
  ['Tallinn', 'raadiotallinn', 128],
  ['Ida TLL', 'ida-tallinn', 320],
  ['Ida HEL', 'ida-helsinki', 320],
  // The relay holds one upstream per mount, so this is one listener at their server.
  // why: lessons/kit-radio-gran.md#stations-ida
  ['Radio 1965', 'radio1965', 128],
];

export const RELAY = 'https://shout.positron.studio';
export const srcOf = (base, id) => `${base}/${id}`;
export const nameOf = (id) => (STATIONS.find(([, s]) => s === id) || [id])[0];
export const nominalKbps = (id) => STATIONS.find(([, s]) => s === id)?.[2] ?? 128;
export const indexOfId = (id) => STATIONS.findIndex(([, s]) => s === id);

/**
 * Which mounts are up, asked of the relay's /health (always 200, so no console 502s).
 * Asks only named stations: each one costs an upstream connection. Missing means undefined, never false.
 * @returns {Promise<Map<string, boolean|undefined>>}
 * why: lessons/kit-radio-gran.md#ask-health
 */
export async function askHealth(base, ids = STATIONS.map(([, id]) => id), { timeoutMs = 6000 } = {}) {
  const out = new Map();
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/health?only=${ids.join(',')}`,
      { signal: ac.signal, cache: 'no-store' });
    if (!res.ok) return out;
    const j = await res.json();
    if (!j?.stations) return out;
    // `=== true`, not truthy: a shape we do not recognise must read as unknown.
    for (const id of ids) {
      const s = j.stations[id];
      if (s && typeof s.up === 'boolean') out.set(id, s.up === true);
    }
  } catch { /* no answer is not the same as a "no" */ }
  finally { clearTimeout(t); }
  return out;
}

// Sounds laid out along the engine's axes (mode, read speed, overlap, rhythm, space, blend).
// `sos` below 0.6 crossfades to the live input; only `burnt` (0.45) does that on purpose.
// `mod` is part of the sound: same numbers with different routes is a different instrument.
// why: lessons/kit-radio-gran.md#patches
export const PATCHES = [
  // DELAY mode: the read point sits a fixed distance behind the write head
  // rather than crawling through a window, so what comes out is the station
  // itself, four seconds ago, in grains long enough that words survive.
  { name: 'four seconds ago',
    says: 'the station itself, four seconds late, in pieces you can still follow',
    mod: [
      { src: 'env', dest: 'size', amt: 0.50 },
      { src: 'env.flux', dest: 'spray', amt: 0.35 },
    ],
    scanmode: 3, scan: 0.5, rate: 9, size: 0.28, contour: 6,
    sos: 0.75, lock: 0, tilt: 0, ingain: 1, comp: 0.20,
    spray: 0.06, spraymode: 1, swarm: 0, swarmmode: 1, strum: 0,
    elen: 1, ephase: 0, pattern: null,
    gates: [1, 0, 0, 0, 0, 0, 0, 0],
    pitches: [0, 0, 0, 0, 0, 0, 0, 0],
    probs: [1, 1, 1, 1, 1, 1, 1, 1],
    swet: 0.12, scycle: 2.0, sfb: 0.20, stilt: 0, sxover: 700, sdiffuse: 0.20,
    taptimes: [0.75, 1.5, 2.25, 3.0], tappans: [-0.6, 0.6, -0.3, 0.3],
    tappitch: [0, 0, 0, 0],
    drive: 0.10, crush: 0, crushmode: 1,
    noise: 0, noisetype: 2, noisedecay: 0.8, noisetone: 800, noisedyn: 1.0,
    wow: 0.10, rverb: 0.15, rtime: 0.30 },

  // Both levers at once, which no other patch here takes: delay mode for the
  // material and a gate figure for the time. Every number in it divides eight
  // seconds, so a full loop is eight one-second figures and the echoes at 0.5,
  // 1, 2 and 4 seconds are sixteen, eight, four and two to a lap.
  { name: 'dub',
    says: 'the sound two seconds late, chopped on a figure, answering itself',
    mod: [
      { src: 'env', dest: 'sos', amt: 0.30 },
      { src: 'lfo', shape: 'tri', hz: 0.035, dest: 'drive', amt: 0.30 },
      { src: 'env.high', dest: 'spray', amt: 0.25 },
    ],
    scanmode: 3, scan: 0.25, rate: 8, size: 0.24, contour: 6,
    sos: 0.72, lock: 0, tilt: 0.10, ingain: 1, comp: 0.22,
    spray: 0.04, spraymode: 1, swarm: 0, swarmmode: 1, strum: 0,
    elen: 8, ephase: 0.25,
    pattern: [1, 0, 0, 0, 1, 0, 1, 0],
    gates: [1, 1, 0, 0, 0, 0, 0, 0],
    pitches: [0, 0, 0, 0, 0, 0, 0, 0],
    probs: [1, 0.85, 1, 1, 1, 1, 1, 1],
    swet: 0.55, scycle: 1.5, sfb: 0.48, stilt: 0.15, sxover: 800, sdiffuse: 0.55,
    taptimes: [0.5, 1.0, 2.0, 4.0], tappans: [-0.8, 0.8, -0.45, 0.45],
    tappitch: [0, 0, 0, 0],
    drive: 0.22, crush: 0, crushmode: 1,
    noise: 0, noisetype: 2, noisedecay: 0.8, noisetone: 900, noisedyn: 1.0,
    wow: 0.12, rverb: 0.30, rtime: 0.55 },

  // Pappus is a time-stretcher before it is a texture machine, and this is the
  // proof: one voice at pitch 0, a dense enough grain rate to read as
  // continuous, every colour stage at zero. `speed = winspan x (3*mscan - 1)`,
  // so 0.4167 is +0.25x, with the pitch where it was.
  { name: 'slowed',
    says: 'the sound at a quarter speed, pitch intact, nothing added',
    mod: [],
    scanmode: 1, scan: 0.4167, rate: 28, size: 0.10, contour: 8,
    sos: 0.62, lock: 0, tilt: 0, ingain: 1, comp: 0.15,
    spray: 0.02, spraymode: 1, swarm: 0, swarmmode: 1, strum: 0,
    elen: 1, ephase: 0, pattern: null,
    gates: [1, 0, 0, 0, 0, 0, 0, 0],
    pitches: [0, 0, 0, 0, 0, 0, 0, 0],
    probs: [1, 1, 1, 1, 1, 1, 1, 1],
    swet: 0, scycle: 1, sfb: 0, stilt: 0, sxover: 700, sdiffuse: 0,
    taptimes: [0, 0, 0, 0], tappans: [0, 0, 0, 0], tappitch: [0, 0, 0, 0],
    drive: 0, crush: 0, crushmode: 1,
    noise: 0, noisetype: 1, noisedecay: 0.5, noisetone: 700, noisedyn: 1,
    wow: 0, rverb: 0, rtime: 0.3 },

  // `lock 1` holds whatever the ring holds, silence included; a page must read its meter after.
  // why: lessons/kit-radio-gran.md#patches-lock
  { name: 'one note held',
    says: 'one instant of the broadcast, frozen and stacked into a chord',
    mod: [
      { src: 'lfo', shape: 'sine', hz: 0.011, dest: 'sos', amt: 0.50 },
      { src: 'lfo', shape: 'glide', hz: 0.06, machine: 0.9, dest: 'contour', amt: 0.70 },
      { src: 'env.tone', dest: 'spray', amt: 0.40 },
    ],
    scanmode: 2, scan: 0.42, rate: 45, size: 0.16, contour: 16,
    sos: 0.90, lock: 1, tilt: 0.15, ingain: 1, comp: 0.25,
    spray: 0.25, spraymode: 2, swarm: 0.60, swarmmode: 2, strum: 0.02,
    elen: 1, ephase: 0, pattern: null,
    gates: [1, 1, 1, 1, 1, 1, 0, 0],
    pitches: [0, 3, 7, 10, 14, 19, 0, 0],
    probs: [1, 1, 1, 1, 1, 1, 1, 1],
    swet: 0.75, scycle: 7.0, sfb: 0.55, stilt: -0.15, sxover: 600, sdiffuse: 0.80,
    taptimes: [2.0, 4.0, 6.0, 7.5], tappans: [-0.7, 0.7, -0.4, 0.4],
    tappitch: [0, 12, 7, 19],
    drive: 0.12, crush: 0, crushmode: 1,
    noise: 0.08, noisetype: 2, noisedecay: 1.2, noisetone: 1100, noisedyn: 1.0,
    wow: 0.25, rverb: 0.72, rtime: 0.85 },

  { name: 'fast forward',
    says: 'the last eight seconds at double speed, dry and unadorned',
    mod: [
      { src: 'lfo', shape: 'tri', hz: 0.06, dest: 'scan', amt: 0.35 },
      { src: 'env', dest: 'rate', amt: 0.30 },
    ],
    scanmode: 1, scan: 1.0, rate: 34, size: 0.05, contour: 8,
    sos: 0.68, lock: 0, tilt: 0.10, ingain: 1, comp: 0.10,
    spray: 0.03, spraymode: 1, swarm: 0, swarmmode: 1, strum: 0,
    elen: 1, ephase: 0, pattern: null,
    gates: [1, 0, 0, 0, 0, 0, 0, 0],
    pitches: [0, 0, 0, 0, 0, 0, 0, 0],
    probs: [1, 1, 1, 1, 1, 1, 1, 1],
    swet: 0.04, scycle: 0.5, sfb: 0.10, stilt: 0, sxover: 800, sdiffuse: 0.10,
    taptimes: [0, 0, 0, 0], tappans: [0, 0, 0, 0], tappitch: [0, 0, 0, 0],
    drive: 0.10, crush: 0, crushmode: 1,
    noise: 0, noisetype: 1, noisedecay: 0.5, noisetone: 700, noisedyn: 1,
    wow: 0, rverb: 0.05, rtime: 0.25 },

  // No route onto `rate` here: the grain clock is the rhythm. This one moves `size` instead.
  // why: lessons/kit-radio-gran.md#patches-sixteenth
  { name: 'the sixteenth',
    says: 'a sixteen-step figure, four voices playing it four steps apart',
    mod: [
      { src: 'lfo', shape: 'step', hz: 1, machine: 0.90, dest: 'probs', amt: 0.80 },
      { src: 'env', dest: 'size', amt: 0.30 },
      { src: 'env.high', dest: 'contour', amt: 0.50 },
    ],
    scanmode: 1, scan: 0.5, rate: 16, size: 0.055, contour: 0,
    sos: 0.70, lock: 0, tilt: 0.20, ingain: 1, comp: 0.20,
    spray: 0.10, spraymode: 3, swarm: 0.20, swarmmode: 1, strum: 0.05,
    elen: 16, ephase: 0.25,
    pattern: [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0],
    gates: [1, 1, 1, 1, 0, 0, 0, 0],
    pitches: [0, 7, 12, 19, 0, 0, 0, 0],
    probs: [1, 0.9, 0.8, 0.7, 1, 1, 1, 1],
    swet: 0.22, scycle: 0.75, sfb: 0.30, stilt: 0.20, sxover: 900, sdiffuse: 0.30,
    taptimes: [0.25, 0.5, 1.0, 2.0], tappans: [-0.8, 0.8, -0.5, 0.5],
    tappitch: [0, 0, 12, 12],
    drive: 0.50, crush: 0.40, crushmode: 2,
    noise: 0.10, noisetype: 3, noisedecay: 0.2, noisetone: 2200, noisedyn: 2.0,
    wow: 0.05, rverb: 0.25, rtime: 0.40 },

  { name: 'strummed',
    says: 'a chord rolled out one note at a time, twice a second',
    mod: [
      { src: 'env.tone', dest: 'strum', amt: 0.45 },
      { src: 'lfo', shape: 'step', hz: 0.5, machine: 0.88, dest: 'probs', amt: 0.45 },
    ],
    scanmode: 1, scan: 0.5, rate: 2, size: 0.35, contour: 8,
    sos: 0.68, lock: 0, tilt: 0.08, ingain: 1, comp: 0.20,
    spray: 0.05, spraymode: 1, swarm: 0, swarmmode: 1, strum: 0.125,
    elen: 1, ephase: 0, pattern: null,
    gates: [1, 1, 1, 1, 1, 1, 1, 1],
    pitches: [-12, -5, 0, 7, 12, 16, 19, 24],
    probs: [1, 1, 1, 1, 1, 1, 1, 1],
    swet: 0.28, scycle: 2.0, sfb: 0.25, stilt: 0.05, sxover: 800, sdiffuse: 0.40,
    taptimes: [1.0, 2.0, 4.0, 8.0], tappans: [-0.6, 0.6, -0.35, 0.35],
    tappitch: [0, 0, 12, 12],
    drive: 0.12, crush: 0, crushmode: 1,
    noise: 0, noisetype: 2, noisedecay: 0.6, noisetone: 1200, noisedyn: 1.0,
    wow: 0.05, rverb: 0.30, rtime: 0.50 },

  { name: 'two seconds of it',
    says: 'two seconds out of the eight, stretched over four and read again',
    mod: [
      { src: 'lfo', shape: 'tri', hz: 0.013, phase: 0, dest: 'winstart', amt: 0.60 },
      { src: 'lfo', shape: 'tri', hz: 0.013, phase: 0, dest: 'winend', amt: 0.60 },
      { src: 'env.flux', dest: 'spray', amt: 0.30 },
    ],
    scanmode: 1, scan: 1.0, rate: 24, size: 0.18, contour: 10,
    winstart: 0.25, winend: 0.50,
    sos: 0.66, lock: 0, tilt: 0.05, ingain: 1, comp: 0.22,
    spray: 0.06, spraymode: 3, swarm: 0.25, swarmmode: 1, strum: 0,
    elen: 1, ephase: 0, pattern: null,
    gates: [1, 1, 0, 0, 0, 0, 0, 0],
    pitches: [0, -12, 0, 0, 0, 0, 0, 0],
    probs: [1, 1, 1, 1, 1, 1, 1, 1],
    swet: 0.30, scycle: 2.0, sfb: 0.30, stilt: 0, sxover: 800, sdiffuse: 0.45,
    taptimes: [1.0, 2.0, 3.0, 4.0], tappans: [-0.7, 0.7, -0.4, 0.4],
    tappitch: [0, 0, 0, 0],
    drive: 0.08, crush: 0, crushmode: 1,
    noise: 0.04, noisetype: 2, noisedecay: 0.9, noisetone: 1300, noisedyn: 1.0,
    wow: 0.06, rverb: 0.35, rtime: 0.55 },

  { name: 'cut up',
    says: 'the sound a second at a time, with one second in four left out',
    mod: [
      { src: 'lfo', shape: 'step', hz: 0.25, machine: 0.90, dest: 'probs', amt: 0.50 },
      { src: 'env', dest: 'size', amt: 0.25 },
    ],
    scanmode: 3, scan: 0.5, rate: 1, size: 1.0, contour: 4,
    sos: 0.70, lock: 0, tilt: 0, ingain: 1, comp: 0.25,
    spray: 0.02, spraymode: 1, swarm: 0, swarmmode: 1, strum: 0,
    elen: 4, ephase: 0,
    pattern: [1, 0, 1, 1],
    gates: [1, 1, 0, 0, 0, 0, 0, 0],
    pitches: [0, 0, 0, 0, 0, 0, 0, 0],
    probs: [1, 0.5, 1, 1, 1, 1, 1, 1],
    swet: 0.35, scycle: 2.0, sfb: 0.35, stilt: 0.10, sxover: 800, sdiffuse: 0.40,
    taptimes: [1.0, 2.0, 4.0, 6.0], tappans: [-0.7, 0.7, -0.4, 0.4],
    tappitch: [0, 0, 0, 0],
    drive: 0.15, crush: 0, crushmode: 1,
    noise: 0, noisetype: 2, noisedecay: 0.8, noisetone: 900, noisedyn: 1.0,
    wow: 0.08, rverb: 0.30, rtime: 0.50 },

  { name: 'ground',
    says: 'half a grain a second, four seconds each, reversed and an octave down',
    mod: [
      { src: 'env', dest: 'size', amt: 0.40 },
      { src: 'lfo', shape: 'glide', hz: 0.02, machine: 0.85, dest: 'swarm', amt: 0.60 },
      { src: 'env.low', dest: 'probs', amt: -0.40 },
    ],
    scanmode: 1, scan: 0.0, rate: 0.5, size: 4.0, contour: 14,
    sos: 0.80, lock: 0, tilt: -0.55, ingain: 1, comp: 0.30,
    spray: 0.40, spraymode: 3, swarm: 0.85, swarmmode: 3, strum: 0.10,
    elen: 1, ephase: 0, pattern: null,
    gates: [1, 1, 1, 0, 0, 0, 0, 0],
    pitches: [-12, -7, 0, 0, 0, 0, 0, 0],
    probs: [1, 1, 1, 1, 1, 1, 1, 1],
    swet: 0.50, scycle: 8.0, sfb: 0.50, stilt: -0.50, sxover: 500, sdiffuse: 0.60,
    taptimes: [2.0, 4.0, 6.0, 8.0], tappans: [-0.5, 0.5, -0.9, 0.9],
    tappitch: [-12, -12, 0, 0],
    drive: 0.30, crush: 0, crushmode: 1,
    noise: 0.15, noisetype: 2, noisedecay: 1.5, noisetone: 400, noisedyn: 1.2,
    wow: 0.90, rverb: 0.55, rtime: 0.75 },

  { name: 'dust',
    says: 'twenty-six grains sounding at once, drifting as one body',
    mod: [
      { src: 'lfo', shape: 'sine', hz: 0.03, dest: 'spray', amt: 0.50 },
      { src: 'env', dest: 'rate', amt: 0.40 },
      { src: 'env.flux', dest: 'size', amt: -0.35 },
    ],
    scanmode: 1, scan: 0.667, rate: 62, size: 0.42, contour: 10,
    sos: 0.85, lock: 0, tilt: 0.05, ingain: 1, comp: 0.35,
    spray: 0.90, spraymode: 2, swarm: 0.35, swarmmode: 1, strum: 0,
    elen: 1, ephase: 0, pattern: null,
    gates: [1, 1, 0, 0, 0, 0, 0, 0],
    pitches: [0, 12, 0, 0, 0, 0, 0, 0],
    probs: [1, 1, 1, 1, 1, 1, 1, 1],
    swet: 0.60, scycle: 4.0, sfb: 0.45, stilt: 0.10, sxover: 700, sdiffuse: 0.90,
    taptimes: [1.0, 2.0, 3.0, 4.0], tappans: [-0.9, 0.9, -0.6, 0.6],
    tappitch: [0, 0, 7, 7],
    drive: 0.20, crush: 0, crushmode: 1,
    noise: 0.06, noisetype: 2, noisedecay: 0.9, noisetone: 1400, noisedyn: 1.1,
    wow: 0.15, rverb: 0.50, rtime: 0.65 },

  { name: 'burnt',
    says: 'the station itself, overdriven and crushed, with grains under it',
    mod: [
      { src: 'env', dest: 'size', amt: 0.35 },
      { src: 'lfo', shape: 'step', hz: 0.7, machine: 0.80, dest: 'crush', amt: 0.55 },
      { src: 'lfo', shape: 'glide', hz: 0.045, machine: 0.9, dest: 'drive', amt: 0.45 },
    ],
    scanmode: 1, scan: 0.36, rate: 7, size: 0.70, contour: 12,
    sos: 0.45, lock: 0, tilt: 0.30, ingain: 1, comp: 0.40,
    spray: 0.18, spraymode: 3, swarm: 0.15, swarmmode: 1, strum: 0,
    elen: 1, ephase: 0, pattern: null,
    gates: [1, 1, 0, 0, 0, 0, 0, 0],
    pitches: [0, 0, 0, 0, 0, 0, 0, 0],
    probs: [1, 1, 1, 1, 1, 1, 1, 1],
    swet: 0.30, scycle: 3.0, sfb: 0.55, stilt: 0.35, sxover: 1100, sdiffuse: 0.35,
    taptimes: [0.5, 1.0, 2.0, 4.0], tappans: [-0.4, 0.4, -0.7, 0.7],
    tappitch: [0, 0, 0, 0],
    drive: 0.80, crush: 0.70, crushmode: 3,
    noise: 0.45, noisetype: 3, noisedecay: 0.4, noisetone: 1800, noisedyn: 2.2,
    wow: 0.70, rverb: 0.35, rtime: 0.50 },
];

/**
 * The read head is a speed (mode 1), a place (mode 2) or a lag (modes 3, 4): Engine_Pappus.sc:719.
 * So a morph may not interpolate `scan` across a mode change (see morphOf).
 * why: lessons/kit-radio-gran.md#scan-range
 */
export const SCAN_RANGE = {
  1: { label: 'read speed', min: -1, max: 2, unit: '×', digits: 2,
       toUi: (mscan) => 3 * mscan - 1, toEngine: (x) => (x + 1) / 3 },
  2: { label: 'read position', min: 0, max: 1, unit: '', digits: 2,
       toUi: (x) => x, toEngine: (x) => x },
  3: { label: 'time behind', min: 0, max: BUF_SECONDS, unit: 's', digits: 2,
       toUi: (x) => x * BUF_SECONDS, toEngine: (x) => x / BUF_SECONDS },
};

const ALL_ONES = new Array(16).fill(1);
export const PATTERN_SLOTS = 16;

/**
 * The sixteen steps this patch wants in the gate buffer. Fewer values are silently dropped
 * by scsynth; an eight-step figure repeats rather than zero-fills.
 * why: lessons/kit-radio-gran.md#pattern-of
 */
export const patternOf = (p) => {
  const src = p.pattern ?? ALL_ONES;
  if (src.length === PATTERN_SLOTS) return src;
  return Array.from({ length: PATTERN_SLOTS }, (_, i) => src[i % src.length]);
};

/** How many of the steps the engine will actually read are open. */
export const liveSteps = (p) => patternOf(p).slice(0, Math.max(1, p.elen))
  .reduce((n, x) => n + (x > 0.001 ? 1 : 0), 0);

/**
 * What this patch's own numbers say its grain rate must be.
 *
 * `report` fires once per GATED voice per trigger, and the trigger is
 * `trig x (gates[i] > 0.001) x coin x egate`, so the rate is the grain clock
 * times the open voices' probabilities times the share of steps that are open.
 * An arithmetic prediction a measured rate can be graded against, rather than a
 * level.
 */
export const predictedRate = (p, rate = p.rate) => rate
  * p.gates.reduce((sum, g, i) => sum + (g > 0.001 ? p.probs[i] : 0), 0)
  * (liveSteps(p) / Math.max(1, p.elen));

/** How many of the eight voices this patch opens. */
export const voicesOf = (p) => p.gates.reduce((n, g) => n + (g > 0.001 ? 1 : 0), 0);

// The engine's own ranges. Modulation applies in the warped space, so a wrong range turns
// a musical amount into a slam.
// why: lessons/kit-radio-gran.md#mod-specs
export const MOD_SPECS = {
  rate: { min: 0.1, max: 100, warp: 'exp' },     // grains per second
  size: { min: 0.002, max: 4, warp: 'exp' },     // grain length; the engine clips at 8
  scan: { min: 0, max: 1 },                      // read head; a SPEED in STRETCH
  spray: { min: 0, max: 1 },                     // read-point jitter
  swarm: { min: 0, max: 1 },                     // detuned duplicates
  strum: { min: 0, max: 0.125 },                 // grain-period subdivision
  // Floor 0.62: below 0.6 `sxf` crossfades to the live input and a lane would switch it off.
  // why: lessons/kit-radio-gran.md#mod-specs-sos
  sos: { min: 0.62, max: 1 },
  // A `Select.kr` index over seventeen windows, read per grain, so it wants a
  // stepped source and a fractional index is not a value that can be read back.
  contour: { min: 0, max: 16, quant: 1 },
  wow: { min: 0, max: 1 },
  // These three are global controls with no `m` prefix (see MOD_CMD).
  // why: lessons/kit-radio-gran.md#mod-specs-global
  drive: { min: 0, max: 1 },
  crush: { min: 0, max: 1 },
  noise: { min: 0, max: 1 },
  winstart: { min: 0, max: 0.6 },
  winend: { min: 0.4, max: 1 },
  // An array, written with `/n_setn`, one shape rotated across the eight voices.
  probs: { min: 0, max: 1, n: 8 },
};

/**
 * Frozen order: a data texture packed in another order draws a plausible wrong picture.
 * Readers using it as a layout check LAYOUT_VERSION.
 * why: lessons/kit-radio-gran.md#mod-dests
 */
export const MOD_DESTS = ['rate', 'size', 'scan', 'spray', 'swarm', 'strum', 'sos',
  'contour', 'wow', 'drive', 'crush', 'noise', 'winstart', 'winend', 'probs'];
export const LAYOUT_VERSION = 1;

/** Each destination's lane, already built, so nobody calls `spec()` per frame. */
export const LANES = Object.fromEntries(
  Object.entries(MOD_SPECS).map(([k, v]) => [k, { ...spec(v), n: v.n || 0, quant: v.quant || 0 }]));

/**
 * Six followers off one analyser read, so the sources disagree (bands, tone, flux).
 * Sensitivity is per source: `tone` is already 0..1.
 * why: lessons/kit-radio-gran.md#mod-followers
 */
export const MOD_FOLLOWERS = {
  rms: { attack: 0.01, release: 0.35, sens: 6 },
  low: { attack: 0.02, release: 0.40, sens: 9 },
  mid: { attack: 0.01, release: 0.30, sens: 11 },
  high: { attack: 0.006, release: 0.25, sens: 14 },
  tone: { attack: 0.05, release: 0.50, sens: 1 },
  flux: { attack: 0.004, release: 0.22, sens: 2.5 },
};
export const FOLLOWER_NAMES = Object.keys(MOD_FOLLOWERS);

/**
 * Where a modulated control is written. Global controls have no `m` prefix, and scsynth
 * drops an unknown control silently.
 * why: lessons/kit-radio-gran.md#mod-cmd
 */
export const MOD_CMD = { wow: 'kwow', drive: 'drive', crush: 'crush', noise: 'noise',
                         probs: 'probs', gates: 'gates' };
/** 20 ms of `Lag.kr` upstream throws anything faster away. */
export const MOD_HZ = 25;

/** The value each destination returns to with nothing moving it. */
export const basesOf = (p) => ({
  rate: p.rate, size: p.size, scan: p.scan, spray: p.spray, swarm: p.swarm,
  strum: p.strum, sos: p.sos, contour: p.contour, wow: p.wow, drive: p.drive,
  crush: p.crush, noise: p.noise, winstart: p.winstart ?? 0, winend: p.winend ?? 1,
  probs: p.probs,
});

/**
 * This patch's routes, minus `winstart`/`winend` in a delay mode, where a narrowed window
 * moves the read head away from the write head.
 * why: lessons/kit-radio-gran.md#routes-of
 */
export const routesOf = (p) => (p.mod || []).filter((r) =>
  !(p.scanmode >= 3 && (r.dest === 'winstart' || r.dest === 'winend')));

// Discrete fields (Select indices, contour, chords, gate figures, lock) cannot be interpolated;
// everything else is continuous behind a 20 ms Lag.kr.
// why: lessons/kit-radio-gran.md#write-split
const setBoth = (eng, name, v) => { setParam(eng, `m${name}`, v); setParam(eng, `n${name}`, v); };

/**
 * The half that cannot be interpolated, plus the rung's constants. Writes every field every
 * time: messages are fire-and-forget. The second granulator is written even where it is absent.
 * why: lessons/kit-radio-gran.md#write-discrete
 */
export function writeDiscrete(eng, p, { bufSeconds = BUF_SECONDS } = {}) {
  setBoth(eng, 'scanmode', p.scanmode);
  setBoth(eng, 'contour', p.contour);
  setBoth(eng, 'buflen', bufSeconds);
  setBoth(eng, 'lock', p.lock);
  setBoth(eng, 'src', 2);                    // STEREO. 1 is OFF and OFF ERASES.
  setBoth(eng, 'spraymode', p.spraymode);
  setBoth(eng, 'swarmmode', p.swarmmode);
  setBoth(eng, 'elen', p.elen);
  setBoth(eng, 'ephase', p.ephase);
  setParam(eng, 'gates', p.gates);
  setParam(eng, 'pitches', p.pitches);
  setParam(eng, 'probs', p.probs);
  setParam(eng, 'tappitch', [...p.tappitch, 0, 0, 0, 0]);
  setParam(eng, 'crushmode', p.crushmode);
  setParam(eng, 'noisetype', p.noisetype);
  // The pattern is a buffer: write the ones back or the last patch's figure stays.
  // why: lessons/kit-radio-gran.md#write-discrete-pattern
  eng.send('/b_setn', GATE0, 0, 16, ...patternOf(p));

  // the stages this rung compiles out, and the constants, written every time
  setParam(eng, 'pwet', 0);                  // RESONATOR: compiled out on TINY
  setParam(eng, 'pin1', 0.7); setParam(eng, 'pin2', 0);
  setParam(eng, 'sin1', 0); setParam(eng, 'sin2', 0);
  setParam(eng, 'kin1', 0); setParam(eng, 'kin2', 0);
  setParam(eng, 'oin1', 0); setParam(eng, 'oin2', 0);
  setParam(eng, 'shold', 0);
  // Upstream's own tap level law, `(1/sqrt(active)) x (1 - 0.35*step/n)` with
  // four taps lit. It normalises for how many are on and pushes later taps back,
  // which reads as depth rather than as a row.
  setParam(eng, 'taplevels', [0.467, 0.423, 0.380, 0.336, 0, 0, 0, 0]);
  setParam(eng, 'loss', 0);                  // two lowpasses on this rung
  setParam(eng, 'rshimmer', 0);              // compiled out on TINY
  setParam(eng, 'limceil', 0.98855);
  setParam(eng, 'amp', 1);
  setParam(eng, 'fade', 1);
  setParam(eng, 'bypass', 0);
  setParam(eng, 'run', 1);
  setParam(eng, 'report', 1);
}

/** Every field that CAN be a value in between, pulled out of a patch. */
export function continuousOf(p) {
  return {
    scan: p.scan, rate: p.rate, size: p.size,
    sos: p.sos, tilt: p.tilt, ingain: p.ingain, comp: p.comp,
    spray: p.spray, swarm: p.swarm, strum: p.strum,
    winstart: p.winstart ?? 0, winend: p.winend ?? 1,
    swet: p.swet, scycle: p.scycle, sfb: p.sfb, stilt: p.stilt,
    sxover: p.sxover, sdiffuse: p.sdiffuse,
    taptimes: [...p.taptimes], tappans: [...p.tappans],
    drive: p.drive, crush: p.crush,
    noise: p.noise, noisedecay: p.noisedecay, noisetone: p.noisetone, noisedyn: p.noisedyn,
    wow: p.wow, rverb: p.rverb, rtime: p.rtime,
  };
}

/**
 * These travel as a ratio, the rest as a difference (lengths, times, frequencies).
 * A zero endpoint falls back to linear.
 * why: lessons/kit-radio-gran.md#geometric
 */
const GEOMETRIC = new Set(['rate', 'size', 'scycle', 'sxover', 'noisetone', 'taptimes']);
const blend = (a, b, k, geo) =>
  (geo && a > 0 && b > 0 ? a * ((b / a) ** k) : a + (b - a) * k);

/**
 * One sound on the way to another: `k` 0 at `a`, 1 at `b`; returns continuous values and
 * the discrete patch to load now. `scan` interpolates only when both modes agree.
 * why: lessons/kit-radio-gran.md#morph-of
 */
export function morphOf(a, b, k) {
  const t = Math.min(1, Math.max(0, k));
  // smoothstep, so a morph starts and ends still rather than at full speed
  const s = t * t * (3 - 2 * t);
  const past = s >= 0.5;
  const va = continuousOf(a), vb = continuousOf(b);
  const out = {};
  for (const key of Object.keys(va)) {
    const x = va[key], y = vb[key];
    if (Array.isArray(x)) out[key] = x.map((v, i) => blend(v, y[i], s, GEOMETRIC.has(key)));
    else out[key] = blend(x, y, s, GEOMETRIC.has(key));
  }
  const sameMode = a.scanmode === b.scanmode;
  out.scan = sameMode ? blend(a.scan, b.scan, s, false) : (past ? b.scan : a.scan);
  return { values: out, at: past ? b : a, k: s, sameMode };
}

/**
 * The interpolable half. `skip` leaves routed destinations to the modulator, or the two
 * writers alternate at 25 Hz. A delay mode forces the window to the whole lap.
 * why: lessons/kit-radio-gran.md#write-continuous
 */
export function writeContinuous(eng, v, { scanmode, bufSeconds = BUF_SECONDS, skip = null } = {}) {
  const delayMode = scanmode >= 3;
  const no = (name) => skip && skip.has(name);
  if (!no('rate')) setBoth(eng, 'rate', v.rate);
  if (!no('size')) setBoth(eng, 'size', v.size);
  if (!no('sos')) setBoth(eng, 'sos', v.sos);
  if (!no('spray')) setBoth(eng, 'spray', v.spray);
  if (!no('swarm')) setBoth(eng, 'swarm', v.swarm);
  if (!no('strum')) setBoth(eng, 'strum', v.strum);
  setBoth(eng, 'tilt', v.tilt);
  // A delay mode is forced to the whole lap; routesOf already refuses routes onto it.
  // why: lessons/kit-radio-gran.md#write-continuous-window
  if (delayMode) { setBoth(eng, 'winstart', 0); setBoth(eng, 'winend', 1); }
  else {
    if (!no('winstart')) setBoth(eng, 'winstart', v.winstart);
    if (!no('winend')) setBoth(eng, 'winend', v.winend);
  }
  // Read head last: its command depends on the mode in force.
  // why: lessons/kit-radio-gran.md#write-continuous-scan
  if (!no('scan')) {
    if (delayMode) setBoth(eng, 'delay', v.scan * bufSeconds);
    else setBoth(eng, 'scan', v.scan);
  }
  setParam(eng, 'swet', v.swet);
  setParam(eng, 'scycle', v.scycle);
  setParam(eng, 'sfb', v.sfb);
  setParam(eng, 'stilt', v.stilt);
  setParam(eng, 'stiltxover', v.sxover);
  setParam(eng, 'sdiffuse', v.sdiffuse);
  setParam(eng, 'taptimes', [...v.taptimes, 0, 0, 0, 0]);
  setParam(eng, 'tappans', [...v.tappans, 0, 0, 0, 0]);
  if (!no('drive')) setParam(eng, 'drive', v.drive);
  if (!no('crush')) setParam(eng, 'crush', v.crush);
  if (!no('noise')) setParam(eng, 'noise', v.noise);
  setParam(eng, 'noisedecay', v.noisedecay);
  setParam(eng, 'noisetone', v.noisetone);
  setParam(eng, 'noisedyn', v.noisedyn);
  if (!no('wow')) setParam(eng, 'kwow', v.wow);
  setParam(eng, 'rverb', v.rverb);
  setParam(eng, 'rtime', v.rtime);
  setParam(eng, 'mcomp', v.comp);
  setParam(eng, 'ingain', v.ingain);
}

/** Both halves, for a caller that is landing on a patch rather than crossing one. */
export function writePatch(eng, p, opts = {}) {
  writeDiscrete(eng, p, opts);
  writeContinuous(eng, continuousOf(p), { ...opts, scanmode: p.scanmode });
}

// ── the grain clock, tuned to a loop ───────────────────────────────────────

/**
 * Nearest grain rate that fits a whole number of `elen / rate` bars into the loop. Both periods
 * are sample exact (measured 24000.0 +/- 0.2 samples), so they never drift. Fewer than two bars
 * is refused, not fudged. @returns {{rate: number|null, laps: number, bars: number, why: string}}
 * why: lessons/kit-radio-gran.md#lock-rate
 */
export function lockRate(seconds, { rate, elen = 1, name = 'this sound', subdivide = false } = {}) {
  if (!(seconds > 0) || !(rate > 0)) return { rate: null, laps: 0, bars: 0, why: 'there is no loop' };
  const n = Math.max(1, elen || 1);
  const bars = seconds * rate / n;
  const laps = Math.round(bars);
  if (laps < 2) {
    // The other lock: the loop fits a whole number of times into the bar, and the figure takes
    // `m` laps. Off by default; short loops otherwise never lock.
    // why: lessons/kit-radio-gran.md#lock-rate-subdivide
    if (subdivide) {
      const m = Math.max(1, Math.min(64, Math.round(1 / Math.max(1e-6, bars))));
      return { rate: n / (seconds * m), laps: 1 / m, bars,
        why: m === 1 ? `one figure of ${n} steps to each lap`
                     : `one figure of ${n} steps over ${m} laps` };
    }
    return { rate: null, laps, bars,
      why: Math.abs(bars - laps) < 1e-6 && laps >= 1
        ? `${name} already fills the loop exactly, so nothing was tuned`
        : `${name} cannot be tuned to a loop this short: its figure is longer than half of it` };
  }
  return { rate: laps * n / seconds, laps, bars,
    why: n > 1 ? `${laps} bars of ${n} steps to each lap`
               : `${laps} grains to each lap` };
}

// ── the six numbers the instrument listens to ──────────────────────────────

/**
 * Lifted from meterTick with its guards: -Infinity bins must not reach the sum, flux is positive only.
 * The analyser needs smoothingTimeConstant = 0; buffers are hoisted (1.4 MB/s of garbage otherwise).
 * why: lessons/kit-radio-gran.md#create-features
 */
export function createFeatures(analyser, sampleRate) {
  const bins = analyser.frequencyBinCount;
  const timeBuf = new Float32Array(analyser.fftSize);
  const freqBuf = new Float32Array(bins);
  const magBuf = new Float32Array(bins);
  const prevMag = new Float32Array(bins);
  const binHz = sampleRate / analyser.fftSize;
  // Bin edges from the REAL sample rate rather than an assumed one.
  const lo = Math.max(1, Math.round(20 / binHz));
  const a = Math.round(300 / binHz);
  const b = Math.round(2000 / binHz);
  const hi = Math.min(bins - 1, Math.round(10000 / binHz));

  return {
    timeBuf,
    /** @returns {{rms, low, mid, high, tone, flux, centroid}} */
    read() {
      analyser.getFloatTimeDomainData(timeBuf);
      let sum = 0;
      for (let i = 0; i < timeBuf.length; i++) sum += timeBuf[i] * timeBuf[i];
      const rms = Math.sqrt(sum / timeBuf.length);

      analyser.getFloatFrequencyData(freqBuf);
      let sLow = 0, sMid = 0, sHigh = 0, sAll = 0, sFreq = 0, sFlux = 0;
      for (let i = lo; i <= hi; i++) {
        // dBFS to linear. `-Infinity` is a REAL value here and `10 ** (-Inf/20)`
        // is 0, which is correct; a NaN anywhere in the sum is not.
        const m = Number.isFinite(freqBuf[i]) ? 10 ** (freqBuf[i] / 20) : 0;
        magBuf[i] = m;
        sAll += m; sFreq += m * i * binHz;
        const d2 = m - prevMag[i];
        if (d2 > 0) sFlux += d2;              // ONSETS ONLY: a decay is not an event
        if (i < a) sLow += m; else if (i < b) sMid += m; else sHigh += m;
      }
      prevMag.set(magBuf);
      const n = hi - lo + 1;
      const centroid = sAll > 0 ? sFreq / sAll : 0;
      // Where the energy sits, 100 Hz to 8 kHz on a log axis, already 0..1.
      const tone = centroid > 0
        ? Math.max(0, Math.min(1, Math.log(centroid / 100) / Math.log(80))) : 0;
      return {
        rms,
        low: sLow / Math.max(1, a - lo),
        mid: sMid / Math.max(1, b - a),
        high: sHigh / Math.max(1, hi - b + 1),
        tone,
        flux: sFlux / n,
        centroid,
      };
    },
  };
}

/**
 * A `/pgrain` pos (fraction of the ring) moved onto the live window's axis.
 * why: lessons/kit-radio-gran.md#win-pos
 */
export const winPos = (p, ringSeconds, bufSeconds = BUF_SECONDS) =>
  Math.min(1, Math.max(0, (p ?? 0) * ringSeconds / bufSeconds));

// Every phase is a function of the clock, never an accumulator, so a late tick costs
// resolution, not position. Pure and total, negative elapsed included.
// why: lessons/kit-radio-gran.md#tour
export const DWELL_MS = 22000;          // how long one sound is held
export const MORPH_MS = 9000;           // how long the slide into the next takes
export const SLOT_MS = DWELL_MS + MORPH_MS;

/**
 * Which two sounds this instant is between, and how far across.
 *
 * `within` is 0..1 through one slot, `k` is 0 for the whole dwell and then
 * 0..1 across the morph, `a` is the sound being left and `b` the one being
 * gone to. Feed `k` to `morphOf`.
 *
 * @param {number} elapsedMs  since the tour was started
 * @param {number} n          how many sounds there are
 */
export function tourAt(elapsedMs, n, { dwellMs = DWELL_MS, morphMs = MORPH_MS } = {}) {
  const slotMs = dwellMs + morphMs;
  const dwellFrac = dwellMs / slotMs;
  const pos = elapsedMs / slotMs;
  const slot = Math.floor(pos);
  const within = pos - slot;
  const count = Math.max(1, n | 0);
  const a = ((slot % count) + count) % count;
  const b = (a + 1) % count;
  const k = within <= dwellFrac ? 0 : (within - dwellFrac) / (1 - dwellFrac);
  return { slot, within, a, b, k };
}

/**
 * Blend follows the tour position: out toward the granulator and back within one sound, so
 * handovers happen while the station is audible. Neither end is 0 or 1.
 * why: lessons/kit-radio-gran.md#breathe
 */
export const breathe = (within, lo, hi) =>
  lo + (hi - lo) * (0.5 - 0.5 * Math.cos(2 * Math.PI * within));
