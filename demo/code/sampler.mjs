// demo/code/sampler.mjs: the sampling core of /nola/, lifted for
// the sampler concept pages (sampler/000, 010, 020) and pointed at our R2
// bucket instead of the site's own static files.
//
// What is the same as /nola/ (demo/nola/index.html), and why it matters:
//   - the RHODES is fifteen notes at uneven steps and five velocity layers,
//     layer 1 the hardest, picked by the author's own SFZ crossfade table, with
//     his fallback where two layers have holes;
//   - a tie between two recordings goes to the lower one (his SFZ says so);
//   - the damper is a ramp, never a stop(), and the pedal is /shell/pedal.mjs;
//   - a key struck again damps the voice it is about to replace;
//   - 64 voices, oldest taken first past that;
//   - a note let go while its recording was still loading SOUNDS and is damped
//     at once, rather than being dropped or ringing on;
//   - every URL is fetched and decoded once.
//
// THE PIANO IS THE SALAMANDER GRAND (plans/plan-piano-samples.md), since
// 2026-10-11, replacing /nola/'s FluidR3 render, which MEASURED brighter than
// a Yamaha C5 struck as hard as it can be, phase cancelling above middle C and
// cut dead at 3.13 s. Thirty notes three apart, A0 to C8 (the same grid, so
// `nearestIn` is unchanged), four velocity bands hard switched (v1, v6, v11,
// v16 of Salamander's sixteen), capped at 8 s with a 1.5 s fade, and the 88
// key-off release samples played when the damper falls. Made by
// demo/resources/fetch-salamander.mjs, served from R2 at sampler/salamander/web/.
// A press fetches ONE file, the one it plays; the rest of its octave, the
// octave's releases and the other bands follow behind it, one file at a time.
// The FluidR3 piano is still here as PIANO_FLUID (program 2) and still in R2
// at sampler/piano/, so nothing that pointed at it breaks.
//
// What is different from /nola/: the files come from R2 (`positron-station`,
// served by the station worker at /media/, CORS `*`), nothing at all is opened
// before the first note, and an instrument is chosen by a MIDI program change
// (0 piano, 1 Rhodes), which is how every instrument on this desk is switched.
import { createPedal, SUSTAIN_CC } from '/shell/pedal.mjs';

export const BASE = 'https://positron-station.kristjan-jansen.workers.dev/media/sampler/';

/** Thirty notes three apart, 21 to 108. */
export const PIANO_NOTES = Array.from({ length: 30 }, (_, i) => 21 + i * 3);
/** Fifteen notes at the author's uneven steps. */
export const RHODES_NOTES = [29, 35, 40, 45, 50, 55, 59, 62, 65, 71, 76, 81, 86, 91, 96];

/** The recording a note is played from. A tie goes to the lower one. */
export const nearestIn = (notes, note) => notes.reduce(
  (best, n) => (Math.abs(n - note) < Math.abs(best - note) ? n : best), notes[0]);

export const VOICES = 64;
/** How long a note sounds whose key was already up when its recording arrived. */
const LATE_S = 0.3;
/** The loudest FluidR3 piano file, measured on /nola/ 2026-09-22 by decoding all thirty. */
const FLUID_PEAK = 0.097;
/**
 * The loudest Salamander v16 file as encoded, decoded back, from
 * PROVENANCE-salamander.json (`peak.web`). ONE number for the whole set, so the
 * 18 dB the recordings carry between v1 and v16 is kept (plan section 4.2).
 */
const SALAMANDER_PEAK = 0.9085;
/** The loudest Rhodes file, from PROVENANCE-rhodes.json. */
const RHODES_PEAK = 0.9981;
/** Where one note played as hard as possible lands. */
const LOUDEST = 0.30;

const clampVel = (vel) => Math.max(1, Math.min(127, Math.round(vel)));

/** What one press is worth, before the damper: the instrument's own rule, or /nola/'s curve. */
export const velGain = (ins, vel) => (ins.gain ? ins.gain(vel)
  : (LOUDEST / ins.peak) * Math.pow(clampVel(vel) / 127, 1.5));

/**
 * The Salamander's four bands, hard switched, no crossfade (plan section 4.1).
 * Salamander's own SFZ ranges for these files are 1-26, 47-50, 81-88, 121-127.
 */
export const PIANO_BANDS = Object.freeze([
  { layer: 1, lo: 1, hi: 40 },
  { layer: 6, lo: 41, hi: 72 },
  { layer: 11, lo: 73, hi: 104 },
  { layer: 16, lo: 105, hi: 127 },
]);
export const bandOf = (vel) => { const v = clampVel(vel); return PIANO_BANDS.find((b) => v <= b.hi); };
/** The Salamander layer a velocity plays. */
export const bandFor = (vel) => bandOf(vel).layer;
/**
 * Within a band the level rises 6 dB from its bottom to its top; between bands
 * the recordings carry the step themselves. INFERRED in the plan (section 4.2)
 * from Salamander's own `amp_veltrack=75`; tune by ear.
 */
export const BAND_SPAN_DB = 6;
export function pianoGain(vel) {
  const v = clampVel(vel), b = bandOf(v);
  const db = -BAND_SPAN_DB * (b.hi - v) / (b.hi - b.lo);
  return (LOUDEST / SALAMANDER_PEAK) * Math.pow(10, db / 20);
}
/**
 * A key-off sample's level, from Salamander's Data/hammer.txt: `volume=-37`,
 * `amp_veltrack=82` on SFZ's default square curve, `rt_decay=2` dB for every
 * second the note was held. On the set's one normalising constant.
 */
export const RELEASE_DB = -37;
export function releaseGain(vel, heldSec = 0) {
  const v = clampVel(vel) / 127;
  return (LOUDEST / SALAMANDER_PEAK) * Math.pow(10, RELEASE_DB / 20)
    * (0.18 + 0.82 * v * v) * Math.pow(10, (-2 * Math.max(0, heldSec)) / 20);
}
/** The 88 keys with a release sample. */
export const RELEASE_KEYS = Object.freeze(Array.from({ length: 88 }, (_, i) => 21 + i));
const pad3 = (n) => String(n).padStart(3, '0');

/** The author's crossfade table from jRhodes3d-mono.sfz. Layer 5 is the softest. */
const RHODES_XF = [
  { layer: 5, lo: 1, hi: 60, in: null, out: [25, 60] },
  { layer: 4, lo: 25, hi: 84, in: [25, 60], out: [61, 84] },
  { layer: 3, lo: 61, hi: 103, in: [61, 84], out: [85, 103] },
  { layer: 2, lo: 85, hi: 119, in: [85, 103], out: [104, 119] },
  { layer: 1, lo: 104, hi: 127, in: [104, 119], out: null },
];
function xfGain(g, vel) {
  if (vel < g.lo || vel > g.hi) return 0;
  if (g.in && vel <= g.in[1]) return (vel - g.in[0]) / (g.in[1] - g.in[0]);
  if (g.out && vel >= g.out[0]) return (g.out[1] - vel) / (g.out[1] - g.out[0]);
  return 1;
}
/** The layer that is loudest in his crossfade at this velocity, softest first on a tie. */
export function layerFor(vel) {
  let best = RHODES_XF[0], top = -1;
  for (const g of RHODES_XF) { const v = xfGain(g, vel); if (v > top) { top = v; best = g; } }
  return best.layer;
}

/** Layers 1 and 3 have holes at the top; his regions play 2 and 4 there. */
const RHODES_ABSENT = new Set(['81-1', '86-1', '91-1', '96-1',
  '71-3', '76-3', '81-3', '86-3', '91-3', '96-3']);
const RHODES_FALLBACK = { 1: 2, 3: 4 };
export function rhodesLayerAt(note, layer) {
  let l = layer;
  while (RHODES_ABSENT.has(`${note}-${l}`)) {
    const next = RHODES_FALLBACK[l];
    if (!next || next === l) return null;
    l = next;
  }
  return l;
}

/** The octave a recording sits in, for the fetch that follows a press. */
const octaveOf = (n) => Math.floor(n / 12);

export const SALAMANDER_BASE = `${BASE}salamander/web/`;
export const PIANO = {
  id: 'piano', name: 'Piano', program: 0,
  notes: PIANO_NOTES, peak: SALAMANDER_PEAK, gain: pianoGain,
  file: (note, band) => `${SALAMANDER_BASE}p${pad3(note)}-v${band}.m4a`,
  pick: (near, vel) => bandFor(vel),
  layerAt: (near, layer) => layer,
  /** The key-off sample for this KEY (chromatic), or null outside A0 to C8. */
  release: (key) => (key >= 21 && key <= 108 ? `${SALAMANDER_BASE}rel${pad3(key)}.m4a` : null),
  releaseGain,
  /** A press waits on its one file. */
  plan: (near, band) => ({ key: `piano ${near} v${band}`, says: `piano note ${near} at band v${band}`,
    urls: [PIANO.file(near, band)] }),
  /** What follows it, in order: the key's release, the octave at that band, the octave's releases, the other bands. */
  behind: (near, band, key) => {
    const oct = PIANO_NOTES.filter((n) => octaveOf(n) === octaveOf(near));
    const keys = RELEASE_KEYS.filter((k) => octaveOf(k) === octaveOf(near));
    return [
      PIANO.release(key),
      ...oct.map((n) => PIANO.file(n, band)),
      ...keys.filter((k) => k !== key).map((k) => PIANO.release(k)),
      ...PIANO_BANDS.filter((b) => b.layer !== band).flatMap((b) => oct.map((n) => PIANO.file(n, b.layer))),
    ].filter(Boolean);
  },
};
/** /nola/'s FluidR3 piano, as it was before 2026-10-11, at program 2. Still in R2 at sampler/piano/. */
export const PIANO_FLUID = {
  id: 'piano-fluid', name: 'FluidR3 piano', program: 2,
  notes: PIANO_NOTES, peak: FLUID_PEAK,
  file: (note) => `${BASE}piano/${note}.mp3`,
  pick: () => null,
  layerAt: () => null,
  plan: (near) => {
    const oct = octaveOf(near);
    return { key: `piano-fluid ${oct}`, says: 'this piano octave',
      urls: PIANO_NOTES.filter((n) => octaveOf(n) === oct).map((n) => PIANO_FLUID.file(n)) };
  },
};
export const RHODES = {
  id: 'rhodes', name: 'Rhodes', program: 1,
  notes: RHODES_NOTES, peak: RHODES_PEAK,
  file: (note, layer) => `${BASE}rhodes/rhodes-${String(note).padStart(3, '0')}-${layer}.m4a`,
  pick: (near, vel) => rhodesLayerAt(near, layerFor(vel)),
  layerAt: rhodesLayerAt,
};

/**
 * What one press needs in hand before it sounds: one Salamander file, an
 * octave of the FluidR3 piano, or every layer of one Rhodes note.
 */
export function planFor(ins, near, layer) {
  if (ins.plan) return ins.plan(near, layer);
  const layers = [1, 2, 3, 4, 5].filter((l) => !RHODES_ABSENT.has(`${near}-${l}`));
  return { key: `rhodes ${near}`, says: `Rhodes note ${near} at every velocity`,
    urls: layers.map((l) => ins.file(near, l)) };
}

/**
 * A sampler engine. Takes MIDI-shaped events ({ cls, d1, d2 }) on `midi(ev)`:
 * notes, CC 64 as the damper pedal, and a program change that picks one of
 * `instruments` by its `program` number.
 *
 * @param {object} o
 * @param {object[]} [o.instruments]  PIANO, and RHODES if the page has it
 * @param {(line:string, kind?:string)=>void} [o.log]
 * @param {(on:boolean)=>void} [o.onFetch]  a fetch began (true) or settled (false)
 * @param {(ins:object)=>void} [o.onProgram]  the instrument changed
 * @param {number[]} [o.warm]  [lo, hi] notes to fetch when an instrument is switched to
 * @param {() => AudioContext} [o.context]  a context to play in; left out, the first note makes one
 */
export function createSampler({ instruments = [PIANO], log = () => {}, onFetch = () => {},
  onProgram = () => {}, warm = null, context = null } = {}) {
  let ctx = null, out = null, inst = instruments[0], loading = 0;
  const buffers = new Map();      // url -> AudioBuffer
  const inflight = new Map();     // url -> promise, so a press and the queue behind it never fetch one file twice
  const wanted = new Map();       // plan key -> promise, so a chord fetches once
  const voices = [];              // { note, src, gain, damped, inst, vel, at }
  const held = new Set();         // notes under a finger
  const queue = [];               // urls to fetch behind a press, one at a time
  let draining = false;
  const stat = { files: 0, bytes: 0, urls: [], started: 0, late: 0, releases: 0, programs: [], firstAt: null };

  function ensure() {
    if (ctx) return ctx;
    ctx = context ? context() : new AudioContext({ latencyHint: 'interactive' });
    // Fire and move on: resume() waits on a gesture and never rejects.
    ctx.resume().catch(() => {});
    out = ctx.createGain();
    out.connect(ctx.destination);
    return ctx;
  }

  async function pull(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url.split('/').slice(-2).join('/')} answered ${res.status}`);
    const buf = await res.arrayBuffer();
    stat.bytes += buf.byteLength; stat.files++; stat.urls.push(url);
    return buf;
  }

  /** One file into a buffer, once. A failure is forgotten so the next ask tries again. */
  function load(u) {
    if (buffers.has(u)) return Promise.resolve();
    if (inflight.has(u)) return inflight.get(u);
    ensure();
    const job = (async () => {
      try { buffers.set(u, await ctx.decodeAudioData(await pull(u))); }
      catch (e) { log(`a recording did not load: ${e.message}`, 'warn'); }
    })().finally(() => inflight.delete(u));
    inflight.set(u, job);
    return job;
  }

  /** Files a press does not wait for, fetched one at a time behind it. */
  function behind(urls) {
    for (const u of urls) if (!buffers.has(u) && !queue.includes(u)) queue.push(u);
    if (draining) return;
    draining = true;
    loading++; onFetch(true);
    (async () => {
      while (queue.length) await load(queue.shift());
    })().finally(() => { draining = false; loading--; onFetch(false); });
  }

  function fetchPlan(p) {
    if (wanted.has(p.key)) return wanted.get(p.key);
    const need = p.urls.filter((u) => !buffers.has(u));
    const t0 = performance.now();
    loading++; onFetch(true);
    const job = (async () => {
      ensure();
      // In parallel: the first note waits on the slowest file, not on the sum.
      await Promise.all(need.map(load));
      if (need.length) log(`${need.length} recording${need.length === 1 ? '' : 's'} for ${p.says} `
        + `came from R2 in ${Math.round(performance.now() - t0)} ms`);
    })().finally(() => {
      loading--; onFetch(false);
      // A file that did not arrive is asked for again on the next press.
      if (p.urls.some((u) => !buffers.has(u))) wanted.delete(p.key);
    });
    wanted.set(p.key, job);
    return job;
  }

  /** The damper: a ramp to silence, then a stop well after it. */
  function damp(v, sec) {
    if (v.damped) return;
    v.damped = true;
    const now = ctx.currentTime;
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setTargetAtTime(0, now, Math.max(0.005, sec / 3));
    try { v.src.stop(now + sec * 1.5); } catch { /* already stopped */ }
  }
  function endVoice(v) { const i = voices.indexOf(v); if (i >= 0) voices.splice(i, 1); }
  function take(v) { if (ctx) damp(v, 0.02); endVoice(v); }
  /** Room for one more voice: the oldest goes past the cap. */
  function room() { while (voices.length >= VOICES) take(voices[0]); }

  /**
   * The key-off sound, when the damper actually lands on a sounding string.
   * Not on a key up under the pedal (pedal.mjs never calls release then), not
   * on a key struck again, not on a steal. Skipped in silence if its file has
   * not arrived yet: it is a detail, and a press never waits for it.
   */
  function keyOff(v) {
    const ins = instruments.find((x) => x.id === v.inst);
    const url = ins?.release?.(v.note);
    const buf = url && buffers.get(url);
    if (!buf) return;
    room();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = ins.releaseGain(v.vel, ctx.currentTime - v.at);
    src.connect(g).connect(out);
    const r = { note: null, src, gain: g, damped: false, inst: ins.id, rel: v.note };
    src.onended = () => endVoice(r);
    src.start();
    voices.push(r);
    stat.releases++;
  }

  /** The damper falls on a key: every voice of it ramps out, and a piano string makes its key-off sound. */
  function release(note, sec) {
    let fell = null;
    for (const v of [...voices]) if (v.note === note && !v.damped) { damp(v, sec); fell ??= v; }
    if (fell) keyOff(fell);
  }
  const pedal = createPedal({ cc: SUSTAIN_CC, release });

  async function noteOn(note, vel) {
    if (note < 0 || note > 127) return;
    pedal.keyDown(note);
    held.add(note);
    ensure();
    // The instrument is read once, here, so a switch during a fetch cannot
    // change a note that started before it.
    const ins = inst;
    const near = nearestIn(ins.notes, note);
    const layer = ins.pick(near, vel);
    const url = ins.file(near, layer);
    if (!buffers.has(url)) await fetchPlan(planFor(ins, near, layer));
    // What this press will want next, behind it, never in front of it.
    if (ins.behind) behind(ins.behind(near, layer, note));
    const buf = buffers.get(url);
    if (!buf) return;
    // The key may be up by now: it sounds, and the damper goes straight on.
    const alreadyUp = !held.has(note) && !pedal.down();
    for (const v of [...voices]) if (v.note === note) damp(v, 0.04);
    room();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = Math.pow(2, (note - near) / 12);
    const g = ctx.createGain();
    g.gain.value = velGain(ins, vel);
    src.connect(g).connect(out);
    const v = { note, src, gain: g, damped: false, inst: ins.id, near, layer, rate: src.playbackRate.value,
      vel, at: ctx.currentTime };
    src.onended = () => endVoice(v);
    src.start();
    voices.push(v);
    stat.started++;
    stat.last = { inst: ins.id, note, near, layer, rate: +v.rate.toFixed(4), file: url.split('/').pop() };
    stat.firstAt ??= performance.now();
    // A note whose key came up while its file was loading (the press that
    // wakes the sampler, almost always, as a click is shorter than a fetch)
    // sounds for LATE_S and is then damped. /nola/ damps it at once, which on
    // a first click is a blip too short to hear as the key you pressed.
    if (alreadyUp) {
      stat.late++;
      setTimeout(() => { if (!held.has(note) && !pedal.down() && !v.damped) { damp(v, pedal.damper()); keyOff(v); } }, LATE_S * 1000);
    }
  }

  function noteOff(note) {
    held.delete(note);
    pedal.keyUp(note);
  }

  function program(n) {
    const next = instruments.find((x) => x.program === n);
    stat.programs.push(n);
    if (!next) { log(`program ${n} is not an instrument here`, 'warn'); return; }
    if (next === inst) return;
    inst = next;
    if (ctx) for (const v of [...voices]) { damp(v, 0.06); endVoice(v); }
    log(`program change ${n}: the sampler plays the ${next.name} now`);
    onProgram(next);
    // A program change is a press, so this is not a visit: fetch the notes the
    // keys on screen reach, so the first note on the new instrument is not a
    // cold fetch (/nola/'s repair, reported three times there).
    if (warm && next.id === 'rhodes') {
      const near = new Set();
      for (let n2 = warm[0]; n2 <= warm[1]; n2++) near.add(nearestIn(next.notes, n2));
      ensure();
      for (const n2 of near) fetchPlan(planFor(next, n2));
    }
  }

  function panic() {
    queue.length = 0;
    for (const v of [...voices]) take(v);
    held.clear();
    pedal.panic?.();
  }

  /** One MIDI-shaped event, as the bay delivers it. */
  function midi(e) {
    if (e.cls === 'note') return e.d2 ? noteOn(e.d1, e.d2) : noteOff(e.d1);
    if (e.cls === 'cc' && e.d1 === SUSTAIN_CC) { pedal.control(e.d1, e.d2); return; }
    if (e.cls === 'program') return program(e.d1);
  }

  return {
    midi, noteOn, noteOff, program, panic,
    /** Its one way out, once a note has made the context; a caller with its own router connects it. */
    out: () => out,
    inst: () => inst,
    sounding: () => voices.length,
    loading: () => loading > 0,
    ctx: () => ctx,
    stat: () => ({ ...stat, urls: [...stat.urls], programs: [...stat.programs], buffers: buffers.size,
      voices: voices.length, inst: inst.id, state: ctx?.state || 'none' }),
  };
}
