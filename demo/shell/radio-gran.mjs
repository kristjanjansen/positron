// demo/shell/radio-gran.mjs — the radio-into-Pappus machine, with no page on it.
//
// 🔴 WHY THIS EXISTS, AND IT IS THE SECOND COPY BECOMING A COMPONENT.
// `/radio/` is a station list, an audio graph, a wasm SuperCollider, twelve
// finished sounds, a modulator spec and a grain clock that locks to a loop, all
// inside one 4,985-line page. `/videoradio/` is the same machine with the
// instrument panel taken off and a shader in its place. Building a second copy
// of any of that inside a new page is the failure `/kit/` exists to catch, and
// `research/vr-sound-visual-2026-09.md §6` already left the feature extractor
// open in exactly these terms: *"add `demo/shell/features.mjs` as a kit
// component, or lift what `radio` already has? Both are defensible;
// building a third copy inside a new page is not."*
//
// ⚠️ 🔴 `/radio/` HAS NOT BEEN MOVED ONTO THIS YET, AND UNTIL IT IS THERE
// ARE TWO IMPLEMENTATIONS. This header is the reason to finish the job rather
// than a record that it was done. `field.mjs` carries the same warning about
// `wire` and it is the same situation: the table below and the one at
// `demo/radio/index.html:2820` are the same twelve sounds typed twice, and
// a drift between them is SILENT because both pages go on working. What to do,
// in order: delete `PATCHES`, `SCAN_RANGE`, `patternOf`, `liveSteps`,
// `predictedRate`, `STATIONS`, `srcOf`, `nominalKbps`, the modulator `specs`
// and `followers` blocks, `writePatch`, the band arithmetic inside `meterTick`
// and the arithmetic half of `lockGrainsToLoop` from that page, and import them
// from here. Nothing in this file touches the DOM, so nothing in that page's
// layout has to move.
//
// ⚠️ WHAT IS DELIBERATELY NOT HERE: the audio graph, the loop's ring, the
// transport, the fader, the pickers, the scope and every assert. Those are a
// PAGE's, and the two pages want different ones. What is here is what is true
// of the ENGINE and of the RELAY whoever is asking.
//
// 🔴 AND ONE THING HERE IS NEW RATHER THAN LIFTED, WHICH IS WHY IT IS A MODULE
// AND NOT A FILE OF CONSTANTS. `writePatch` on `/radio/` writes a whole
// patch in one shot, which is right for pressing a button and useless for a
// page that has to travel from one sound to another over eight seconds. The
// split into `writeDiscrete` and `writeContinuous` is what makes a morph
// expressible, and the line between them is an argument about the engine:
// `Select.kr` indices, gate figures and chords cannot be interpolated, and
// pretending otherwise plays a chord nobody wrote.
//
// 🔴 AND SO IS THE TOUR CLOCK AT THE BOTTOM, ADDED 2026-09-16 WHEN `/radio/`
// WAS ASKED FOR THE SAME MOVEMENT. `/videoradio/` still carries its own inline
// copy of that arithmetic and should be moved onto this one; the numbers are
// the same numbers and two of them are already in two files. That is the same
// warning as the one above about the twelve sounds, and it is here rather than
// in a commit message because nothing type-checks a duplicate.

import { spec } from './pappus-mod.mjs';
import { setParam, GATE0 } from './pappus.mjs';

/**
 * The seconds Pappus holds. `mbuflen`, and every page that draws a grain
 * position has to rescale by `RING_SECONDS / BUF_SECONDS` (see `pappus.mjs`).
 *
 * ⚠️ IT IS EIGHT AND NOT SIXTY, and the argument is written out at
 * `demo/radio/index.html:2654`: the ring has to be FILLED before the
 * granulator sounds like itself, and at sixty that wait is a minute, which puts
 * every assert outside the harness's budget and a visitor in front of silence.
 */
export const BUF_SECONDS = 8;

// ── the relay, and which stations are on it ────────────────────────────────
//
// 🔴 THE THIRD COLUMN IS THE STATION'S NOMINAL BITRATE AND IT IS NOT A SHARED
// CONSTANT. `NOMINAL_KBPS = 128` was true of every mount here until IDA Radio
// arrived at 320, and a check that compares a measured rate against one shared
// number fails on every run for a station that is behaving perfectly.
//
// ⚠️ TWO OF THESE ARE AAC, NOT MP3. `mp3-stream.mjs` picks its frame scanner off
// the response's `content-type`, so no page has to know which is which, and no
// URL here claims a container.
// 🔴 IDA IS BACK, 2026-09-16, ON INSTRUCTION: *"bring ida's back to radio (if
// single listener)"* and *"bring ida to videoradio too"*. The condition in the
// first message is the whole argument. It was removed because their operator
// counted roughly 100 concurrent clients against their limit and traced them
// here; the relay now holds ONE upstream connection per mount and fans it out,
// so the number they count is one however many people are listening.
// `workers/shout/worker.mjs` carries the measurement and the caveat that the
// operator has not been re-asked.
//
// 🔴 AND THEY ARE LAST IN THIS ARRAY, WHICH IS NOT A PREFERENCE. What made the
// original mistake expensive was not carrying these mounts, it was one line
// that moved them to the FRONT: every page opens the first entry it finds, so
// reordering an array pointed every visitor and every harness run at their
// server at once. At 320 kbit/s they are 2.5x the weight of anything else here.
// Do not move them up.
export const STATIONS = [
  // Radio 1965 removed 2026-09-15 at the uuu.ee operator's request.
  ['Klassika', 'klassikaraadio', 128],
  ['Viker', 'vikerraadio', 128],
  ['R2', 'raadio2', 128],
  ['R4', 'raadio4', 128],
  ['Tallinn', 'raadiotallinn', 128],
  ['Ida TLL', 'ida-tallinn', 320],
  ['Ida HEL', 'ida-helsinki', 320],
  // Back, last, 2026-09-16. See the note in `workers/shout/worker.mjs`: the
  // relay holds one upstream per mount now, so this is one listener at their
  // server however many people are on this site.
  ['Radio 1965', 'radio1965', 128],
];

export const RELAY = 'https://shout.positron.studio';
export const srcOf = (base, id) => `${base}/${id}`;
export const nameOf = (id) => (STATIONS.find(([, s]) => s === id) || [id])[0];
export const nominalKbps = (id) => STATIONS.find(([, s]) => s === id)?.[2] ?? 128;
export const indexOfId = (id) => STATIONS.findIndex(([, s]) => s === id);

/**
 * Which mounts are up, asked of the relay rather than of the mounts.
 *
 * 🔴 ONE REQUEST THAT ALWAYS ANSWERS 200, AND THAT IS THE ENTIRE POINT. Fetching
 * a dead mount directly answers 502, **and the browser logs that to the console
 * with no way to suppress it**, so a page that probes mounts trips its own
 * console check and shows a visitor a red line about somebody else's server.
 * `/health` moves the question to the thing that knows and reports "down" as
 * data.
 *
 * 🔴 AND IT ASKS ABOUT NAMED STATIONS, NEVER ALL OF THEM BY DEFAULT. `/health`
 * opens one upstream connection per station it is asked about, so an unnarrowed
 * probe makes every page load cost the broadcaster six. That is how three ERR
 * mounts came to answer this relay 502 in 9 ms while serving a laptop normally.
 *
 * ⚠️ A STATION MISSING FROM THE ANSWER IS `undefined`, NEVER `false`. "We did
 * not get an answer about it" and "it is down" have opposite consequences, and
 * `caps.mjs` already states the rule: an unknown never blocks.
 *
 * @returns {Promise<Map<string, boolean|undefined>>}
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

// ── the twelve sounds ──────────────────────────────────────────────────────
//
// 🔴 EIGHT SOUNDS THAT DIFFER IN KIND, NOT TWELVE SETS OF NUMBERS, and the
// distinction is what the previous two sets got wrong. REPORTED three times as
// *"radio granulator patches heard almost same"*, after a round of widening the
// ranges and a round of adding movement, neither of which could have helped:
// seven of the old seven used `scanmode 1`, five of them sat between -0.10x and
// +0.25x read speed, and six had the sixteen-step gate switched off. Seven
// variations on one architecture. So this set is laid out along the axes the
// engine actually has, one patch pushed to each end:
//
//   mode        DELAY, POSITION and STRETCH, all three
//   read speed  -1.00 · +0.08 · +0.25 · +0.50 · +1.00 · +2.00 · frozen
//   overlap     2 (four-second grains) up to 26 (a cloud)
//   rhythm      three patches on a real gate figure
//   space       one bone dry, one drowned
//   blend       `burnt` at `sos 0.45`, which is the radio with the granulator as
//               an effect rather than the other way round
//
// ⚠️ `sos` BELOW 0.6 IS NOT A FLAVOUR, IT IS THE GRANULATOR TURNED OFF.
// `sxf = (msos.max(mlock)/0.6).clip(0,1)` crossfades grains against the LIVE
// INPUT, so 0.6 is the first value that is all grains. `burnt`'s 0.45 is the one
// deliberate exception and it is a different thing to hear, not a quieter one.
//
// ⚠️ `mod` IS PART OF THE SOUND. A patch is a PLACE and a MOTION: two patches
// with the same numbers and different routes are two different instruments,
// which is the whole answer to "they all sound the same". See `pappus-mod.mjs`
// for why none of this is in the SynthDef.
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

  // ⚠️ `lock 1` HOLDS WHATEVER THE RING CONTAINS AT THE INSTANT IT LANDS,
  // including the dead air between two programmes. A page that freezes has to
  // read its own meter afterwards and say which it caught, or a caught silence
  // is indistinguishable from a broken engine.
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

  // 🔴 A ROUTING ONTO `rate` IS THE ONE THING THAT UNPICKS A RHYTHM. The grain
  // clock is the only timing this instrument has, so the patches whose point is
  // a figure have NO route onto `rate`: this one moves `size` instead, which
  // changes how long a grain is and not when it happens.
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
 * 🔴 THE READ HEAD IS THREE DIFFERENT QUANTITIES AND ONE CONTROL.
 * `Engine_Pappus.sc:719` selects between a SPEED (mode 1), a PLACE (mode 2) and
 * a LAG (modes 3 and 4), so a page that shows one lane for all three is telling
 * the truth about one patch in three. In STRETCH the lane IS the speed, in the
 * engine's own terms: `speed = winspan x (3*mscan - 1)`.
 *
 * ⚠️ AND IT IS WHY A MORPH MAY NOT INTERPOLATE `scan` ACROSS A MODE CHANGE. See
 * `morphOf` below: halfway between a speed and a lag is neither.
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
 * The sixteen steps this patch wants in the gate buffer.
 *
 * 🔴 IT IS NOT A CONVENIENCE. An eight-element `pattern` produces an OSC message
 * that SAYS sixteen values and carries eight, which scsynth discards without a
 * word: the patch then plays on whatever the buffer already held and the page
 * goes on reporting the figure it asked for.
 *
 * ⚠️ IT REPEATS RATHER THAN ZERO-FILLING, because with `elen 16` a repeat plays
 * an eight-step figure twice, which is what writing eight steps means, and a
 * zero-fill would silently give half a bar of silence.
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

// ── the modulator's lanes ──────────────────────────────────────────────────
//
// 🔴 EVERY ONE OF THESE IS THE ENGINE'S OWN RANGE, AND THEY DECIDE WHAT A
// ROUTING MEANS. A modulation is applied in the control's WARPED space, so an
// LFO on grain length multiplies and divides rather than adding and
// subtracting: get one of these wrong and a musical amount becomes a slam.
export const MOD_SPECS = {
  rate: { min: 0.1, max: 100, warp: 'exp' },     // grains per second
  size: { min: 0.002, max: 4, warp: 'exp' },     // grain length; the engine clips at 8
  scan: { min: 0, max: 1 },                      // read head; a SPEED in STRETCH
  spray: { min: 0, max: 1 },                     // read-point jitter
  swarm: { min: 0, max: 1 },                     // detuned duplicates
  strum: { min: 0, max: 0.125 },                 // grain-period subdivision
  // 🔴 THE FLOOR IS 0.62, NOT 0. `sxf = (msos.max(mlock)/0.6).clip(0,1)`
  // crossfades the grains against the LIVE INPUT, so a lane reaching zero would
  // make a slow sine switch the instrument off twice a minute.
  sos: { min: 0.62, max: 1 },
  // A `Select.kr` index over seventeen windows, read per grain, so it wants a
  // stepped source and a fractional index is not a value that can be read back.
  contour: { min: 0, max: 16, quant: 1 },
  wow: { min: 0, max: 1 },
  // ⚠️ THESE THREE ARE GLOBAL CONTROLS with no `m` prefix, which `MOD_CMD`
  // below knows and a spec table that only listed lane ends did not.
  drive: { min: 0, max: 1 },
  crush: { min: 0, max: 1 },
  noise: { min: 0, max: 1 },
  winstart: { min: 0, max: 0.6 },
  winend: { min: 0.4, max: 1 },
  // An array, written with `/n_setn`, one shape rotated across the eight voices.
  probs: { min: 0, max: 1, n: 8 },
};

/**
 * 🔴 THE DESTINATION ORDER IS FROZEN, THE WAY `pattern.mjs`'s `ROW` IS FROZEN.
 * A page that packs these into a data texture and a shader compiled against a
 * different order do not fail; they draw a plausible wrong picture. Anything
 * reading this as a layout must also read `LAYOUT_VERSION` and refuse a
 * mismatch.
 */
export const MOD_DESTS = ['rate', 'size', 'scan', 'spray', 'swarm', 'strum', 'sos',
  'contour', 'wow', 'drive', 'crush', 'noise', 'winstart', 'winend', 'probs'];
export const LAYOUT_VERSION = 1;

/** Each destination's lane, already built, so nobody calls `spec()` per frame. */
export const LANES = Object.fromEntries(
  Object.entries(MOD_SPECS).map(([k, v]) => [k, { ...spec(v), n: v.n || 0, quant: v.quant || 0 }]));

/**
 * 🔴 SIX FOLLOWERS OFF ONE ANALYSER READ, AND THE POINT IS THAT THEY ARE ALL THE
 * STATION. Loudness alone is one gesture: everything it drives moves together.
 * Split the same audio into bands and the sources stop agreeing. On speech `mid`
 * moves while `low` sits still, `high` follows sibilance, `tone` says where the
 * energy is rather than how much of it there is, and `flux` is near zero on a
 * sustained chord and high on an announcer.
 *
 * ⚠️ SENSITIVITY IS PER SOURCE AND HAS TO BE. `tone` is already 0..1, so
 * upstream's sens 6 pins it at the ceiling where it stops following anything.
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
 * Where a modulated control is actually written.
 *
 * ⚠️ NOT EVERY CONTROL WEARS THE `m`. `kwow`, `drive`, `crush`, `noise` and the
 * eight-element arrays are global, one stage for both granulators, so the prefix
 * would name a control this definition does not have. scsynth discards an
 * unknown control IN SILENCE, which is a routing that runs, reports, and never
 * reaches a sample.
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
 * This patch's routes, with the ones a delay mode cannot carry removed.
 *
 * ⚠️ `winstart`/`winend` ARE REFUSED IN A DELAY MODE. `delaypos` is a position in
 * the WHOLE lap while `BufWr` writes at the un-windowed phase, so a narrowed
 * window puts the read head nowhere near the write head and "four seconds
 * behind" quietly becomes something else, with nothing on screen saying so.
 */
export const routesOf = (p) => (p.mod || []).filter((r) =>
  !(p.scanmode >= 3 && (r.dest === 'winstart' || r.dest === 'winend')));

// ── writing a patch, in two halves ─────────────────────────────────────────
//
// 🔴 THE SPLIT IS THE ARGUMENT, AND THE LINE BETWEEN THEM IS THE ENGINE'S.
// `/radio/` writes a whole patch on a button press and that is right there.
// A page that TRAVELS from one sound to another needs to know which fields can
// be a value in between and which cannot, and the answer is not a matter of
// taste:
//
//   · `scanmode`, `spraymode`, `swarmmode`, `crushmode` and `noisetype` are
//     `Select.kr` and `Select.ar` INDICES. 2.5 is not a mode.
//   · `contour` is a `Select.kr` over seventeen envelope windows, read per
//     grain, and a fractional index is a value that cannot be read back the way
//     it was sent.
//   · `gates`, `pitches` and `tappitch` are a CHORD in semitones. Half of
//     `[0, 3, 7]` and `[-12, -7, 0]` is a chord nobody wrote.
//   · `elen`, `ephase` and `pattern` are a gate FIGURE, read at audio rate by a
//     `Stepper` on the grain trigger. A figure has no halfway.
//   · `lock` is a freeze. It is on or it is off.
//
// Everything else is a continuous control behind a 20 ms `Lag.kr`, which is
// exactly what stepping at 25 Hz is built to receive.
const setBoth = (eng, name, v) => { setParam(eng, `m${name}`, v); setParam(eng, `n${name}`, v); };

/**
 * The half that cannot be interpolated, plus every constant this rung needs.
 *
 * 🔴 IT WRITES EVERY FIELD, EVERY TIME. Each message is fire-and-forget, so a
 * write that only sets what changed inherits whatever the last one left behind,
 * silently. This repo has paid for that three times (`msrc 1`, `src`/`lock`,
 * `notes.gate`).
 *
 * ⚠️ THE SECOND GRANULATOR IS WRITTEN AND DOES NOT EXIST ON THIS RUNG
 * (`graw2 = DC.ar([0,0])` on LITE, and TINY implies LITE). It is two messages
 * and it keeps one function for a board that may be on a different rung.
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
  // 🔴 THE SIXTEEN-STEP PATTERN IS A BUFFER, NOT A CONTROL, and one that does
  // not want a rhythm has to write the ones BACK or it inherits the last
  // patch's figure silently.
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
 * 🔴 THESE ONES TRAVEL AS A RATIO, THE REST AS A DIFFERENCE. `pappus-mod.mjs`
 * makes the argument for modulation and it is the same argument for a morph: a
 * grain length halfway between 50 ms and 4 s is 450 ms if you go geometrically
 * and 2.02 s if you go linearly, and only the first spends any time in the part
 * of the lane where a granulator stops being a delay and becomes a texture.
 * Delay times, cycle lengths and filter frequencies are pitches or rhythms and
 * behave the same way.
 *
 * ⚠️ A ZERO ENDPOINT FALLS BACK TO LINEAR, because a ratio to zero has no
 * meaning and `slowed` really does hold every tap time at 0.
 */
const GEOMETRIC = new Set(['rate', 'size', 'scycle', 'sxover', 'noisetone', 'taptimes']);
const blend = (a, b, k, geo) =>
  (geo && a > 0 && b > 0 ? a * ((b / a) ** k) : a + (b - a) * k);

/**
 * One sound on the way to another.
 *
 * `k` is 0 at `a` and 1 at `b`. What comes back is a whole set of continuous
 * values plus the discrete patch that should be LOADED at this instant, so a
 * caller never has to decide which side of the crossover it is on twice.
 *
 * 🔴 `scan` IS INTERPOLATED ONLY WHEN BOTH ENDS AGREE ABOUT WHAT IT MEANS. In
 * STRETCH it is a speed, in POSITION a place, in DELAY a lag: halfway between
 * a speed and a lag is neither, and writing it would move the read head
 * somewhere neither patch asks for while the page reports a morph going
 * smoothly. When the modes differ it steps with the mode.
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
 * The half that can be a value in between, written to the engine.
 *
 * ⚠️ `skip` IS NOT AN OPTIMISATION, IT IS WHAT STOPS TWO WRITERS FIGHTING. A
 * modulated destination is written 25 times a second by `createModulator` from
 * `base + modulation`; a morph writing the same control at the same rate makes
 * the two alternate, which is a 25 Hz square wave on a control that is supposed
 * to be gliding. A morph moves the BASE of a routed destination and writes
 * everything else itself.
 *
 * 🔴 IN A DELAY MODE THE WINDOW MUST BE THE WHOLE LAP, AND IT IS ENFORCED HERE
 * RATHER THAN TRUSTED TO A TABLE. Only STRETCH and POSITION may carry a window.
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
  // ⚠️ A DELAY MODE IS FORCED TO THE WHOLE LAP AND NOT SKIPPABLE. `routesOf`
  // has already refused a routing onto these there, so `skip` cannot hold them
  // and there is nothing to fight with.
  if (delayMode) { setBoth(eng, 'winstart', 0); setBoth(eng, 'winend', 1); }
  else {
    if (!no('winstart')) setBoth(eng, 'winstart', v.winstart);
    if (!no('winend')) setBoth(eng, 'winend', v.winend);
  }
  // ⚠️ THE READ HEAD IS WRITTEN LAST OF THE GRANULATOR'S SETTINGS, because which
  // command it is depends on the mode, and the mode has to be the one in force.
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
 * 🔴 THE WHOLE TEMPO QUESTION, ANSWERED IN ARITHMETIC.
 *
 * A loop is an `AudioBuffer` of an exact number of samples played with
 * `loop = true`, so its period is exactly that many samples: MEASURED by looping
 * 384000 samples of noise and finding the lag at which the recording repeats,
 * 384000 at speed 1 and 768000 at 0.5, BIT IDENTICAL, residual exactly 0. The
 * grain clock is `Phasor.ar(t_sync, mrate x SampleDur)` in the same context, so
 * its period is exactly `SampleRate / mrate` samples: MEASURED from the engine's
 * own output over 24 grains, **24000.0 +/- 0.2 samples against 24000 asked
 * for**, twice. Two exact periods can be made to divide each other, and then
 * they never drift.
 *
 * A figure of `elen` steps at `rate` grains a second has a bar of `elen / rate`
 * seconds, and this is the nearest rate that fits a WHOLE NUMBER of those bars
 * into the loop. The nudge is at most half a bar's worth.
 *
 * ⚠️ IT LOCKS TO THE LOOP'S LENGTH AT SPEED 1. Every loop speed offered here is
 * a power of two, so a loop that is `k` bars long at speed 1 is `k x 2^m` bars
 * long at any of them: still whole, still locked, nothing to recompute.
 *
 * ⚠️ FEWER THAN TWO BARS IN THE LOOP IS REFUSED RATHER THAN FUDGED. Halving a
 * grain rate to make one bar fit would be a page changing the sound to satisfy
 * its own arithmetic, and the refusal has to be said in words.
 *
 * @returns {{rate: number|null, laps: number, bars: number, why: string}}
 */
export function lockRate(seconds, { rate, elen = 1, name = 'this sound', subdivide = false } = {}) {
  if (!(seconds > 0) || !(rate > 0)) return { rate: null, laps: 0, bars: 0, why: 'there is no loop' };
  const n = Math.max(1, elen || 1);
  const bars = seconds * rate / n;
  const laps = Math.round(bars);
  if (laps < 2) {
    // 🔴 THE OTHER WAY THE TWO PERIODS CAN DIVIDE EACH OTHER, AND WITHOUT IT
    // SHORT LOOPS NEVER LOCK AT ALL. A figure longer than half the loop cannot
    // fit into it twice, and the refusal above is right about that. It is not
    // the only lock available: if the LOOP fits a whole number of times into
    // the BAR, the two periods still divide each other exactly and the figure
    // simply takes `m` laps to finish. MEASURED on `/videoradio/` before this
    // existed: with laps of two and three seconds most of the twelve sounds
    // refused every time, which reads in the log as the page failing rather
    // than as arithmetic declining. Off by default, because a page that plays
    // one long loop has no such problem and should hear the refusal.
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
 * 🔴 LIFTED, NOT REWRITTEN, AND THE TWO GUARDS ARE WHY.
 * `plan-audio-shader.md §8 step 2` says it in as many words: `meterTick` is
 * already written, already tuned, and already carries the two things a second
 * author would miss. An empty FFT bin reports `-Infinity`, and one NaN in the
 * sum poisons every follower at once; and the flux is POSITIVE ONLY, because a
 * decay is not an event.
 *
 * ⚠️ THE ANALYSER MUST HAVE `smoothingTimeConstant = 0`. `getFloatFrequencyData`
 * applies it PER CALL, so a flux follower on a smoothed analyser measures the
 * blend rather than the programme, and the same page reads differently at 60,
 * 72, 90 and 120 Hz.
 *
 * ⚠️ THE BUFFERS ARE HOISTED. Three typed arrays a frame at 60 Hz is 1.4 MB a
 * second of garbage for numbers that are overwritten immediately.
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
 * A reported grain position, moved onto the axis a page draws.
 *
 * Pappus records into a sixty-second ring and reads grains out of a window
 * `mbuflen` seconds long, and `/pgrain`'s `pos` is a fraction of the RING. A
 * page drawing on a picture of the live window has to rescale, or every mark
 * lands in the left 13% of it. `RING_SECONDS` is exported by `pappus.mjs` for
 * the same reason this is exported here: a number typed twice can disagree with
 * the buffer it describes.
 */
export const winPos = (p, ringSeconds, bufSeconds = BUF_SECONDS) =>
  Math.min(1, Math.max(0, (p ?? 0) * ringSeconds / bufSeconds));

// ── the tour: a page working its own instrument ────────────────────────────
//
// 🔴 EVERY PHASE IS A FUNCTION OF THE CLOCK AND NOTHING IS AN ACCUMULATOR.
// `pappus-mod.mjs` makes the argument and it applies to anything left running
// for hours: a late tick, a dropped tick or a backgrounded tab costs
// RESOLUTION and never POSITION, because the next tick still reads the tour
// exactly where it should be. A counter incremented per tick comes back from a
// minimised window playing a sound it should have left twenty minutes ago.
//
// ⚠️ THE ARITHMETIC IS PURE AND TAKES NO ENGINE, so a page can grade it with
// nothing running. `tourAt` is total: every real `elapsedMs` and every `n >= 1`
// answers, including a negative elapsed, which is what a page that seeds the
// clock BACKWARDS to open on the sound already loaded hands it.
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
 * 🔴 THE BLEND IS A FUNCTION OF WHERE THE TOUR IS, NOT A FREE-RUNNING SHAPE,
 * and the difference is legible rather than cosmetic. It opens from the station
 * toward the granulator over the first half of a sound and comes back over the
 * second, so the handover between two sounds always happens while the station
 * is still audible. A sine on a clock of its own eventually puts the deepest
 * part of the granulator exactly on a crossover, which is the one moment the
 * instrument has least to say.
 *
 * ⚠️ NEITHER END IS 0 OR 1. At 0 the granulator is inaudible and any picture of
 * it is drawing something nobody is hearing; at 1 the station is gone and what
 * is left is an instrument with no material.
 */
export const breathe = (within, lo, hi) =>
  lo + (hi - lo) * (0.5 - 0.5 * Math.cos(2 * Math.PI * within));
