// demo/concepts/sampler/sampler.mjs: the sampling core of /nola/, lifted for
// the sampler concept pages (sampler/000, 010, 020) and pointed at our R2
// bucket instead of the site's own static files.
//
// What is the same as /nola/ (demo/nola/index.html), and why it matters:
//   - the PIANO is thirty recordings three semitones apart, A0 to C8, so every
//     key is at most one semitone from a file and plays it at 2^(shift/12);
//   - the RHODES is fifteen notes at uneven steps and five velocity layers,
//     layer 1 the hardest, picked by the author's own SFZ crossfade table, with
//     his fallback where two layers have holes;
//   - a tie between two recordings goes to the lower one (his SFZ says so);
//   - level is the player's: one curve over velocity, scaled per instrument by
//     the loudest file, because the piano files sit 21 dB down and the Rhodes
//     files at full scale;
//   - the damper is a ramp, never a stop(), and the pedal is /shell/pedal.mjs;
//   - a key struck again damps the voice it is about to replace;
//   - 64 voices, oldest taken first past that;
//   - a note let go while its recording was still loading SOUNDS and is damped
//     at once, rather than being dropped or ringing on;
//   - the piano loads an octave at a time, the Rhodes every layer of one note,
//     keyed by URL, each URL fetched and decoded once.
//
// What is different: the files come from R2 (`positron-station`, served by the
// station worker at /media/, CORS `*`), nothing at all is opened before the
// first note, and an instrument is chosen by a MIDI program change (0 piano,
// 1 Rhodes), which is how every instrument on this desk is switched.
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
/** The loudest piano file, measured on /nola/ 2026-09-22 by decoding all thirty. */
const PIANO_PEAK = 0.097;
/** The loudest Rhodes file, from PROVENANCE-rhodes.json. */
const RHODES_PEAK = 0.9981;
/** Where one note played as hard as possible lands. */
const LOUDEST = 0.30;

/** What one press is worth, before the damper. /nola/'s curve, unchanged. */
export const velGain = (ins, vel) =>
  (LOUDEST / ins.peak) * Math.pow(Math.max(1, Math.min(127, vel)) / 127, 1.5);

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

export const PIANO = {
  id: 'piano', name: 'Piano', program: 0,
  notes: PIANO_NOTES, peak: PIANO_PEAK,
  file: (note) => `${BASE}piano/${note}.mp3`,
  layerAt: () => null,
};
export const RHODES = {
  id: 'rhodes', name: 'Rhodes', program: 1,
  notes: RHODES_NOTES, peak: RHODES_PEAK,
  file: (note, layer) => `${BASE}rhodes/rhodes-${String(note).padStart(3, '0')}-${layer}.m4a`,
  layerAt: rhodesLayerAt,
};

/** What one press needs in hand: an octave of piano, or every layer of one Rhodes note. */
export function planFor(ins, near) {
  if (ins.id === 'piano') {
    const oct = Math.floor(near / 12);
    return { key: `piano ${oct}`, says: 'this piano octave',
      urls: ins.notes.filter((n) => Math.floor(n / 12) === oct).map((n) => ins.file(n)) };
  }
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
 */
export function createSampler({ instruments = [PIANO], log = () => {}, onFetch = () => {},
  onProgram = () => {}, warm = null } = {}) {
  let ctx = null, out = null, inst = instruments[0], loading = 0;
  const buffers = new Map();      // url -> AudioBuffer
  const wanted = new Map();       // plan key -> promise, so a chord fetches once
  const voices = [];              // { note, src, gain, damped, inst }
  const held = new Set();         // notes under a finger
  const stat = { files: 0, bytes: 0, urls: [], started: 0, late: 0, programs: [], firstAt: null };

  function ensure() {
    if (ctx) return ctx;
    ctx = new AudioContext({ latencyHint: 'interactive' });
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

  function fetchPlan(p) {
    if (wanted.has(p.key)) return wanted.get(p.key);
    const need = p.urls.filter((u) => !buffers.has(u));
    const t0 = performance.now();
    loading++; onFetch(true);
    const job = (async () => {
      ensure();
      // In parallel: the first note waits on the slowest file, not on the sum.
      await Promise.all(need.map(async (u) => {
        try { buffers.set(u, await ctx.decodeAudioData(await pull(u))); }
        catch (e) { log(`a recording did not load: ${e.message}`, 'warn'); }
      }));
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
  function release(note, sec) {
    for (const v of [...voices]) if (v.note === note && !v.damped) damp(v, sec);
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
    const layer = ins.layerAt(near, layerFor(vel));
    const url = ins.file(near, layer);
    if (!buffers.has(url)) await fetchPlan(planFor(ins, near));
    const buf = buffers.get(url);
    if (!buf) return;
    // The key may be up by now: it sounds, and the damper goes straight on.
    const alreadyUp = !held.has(note) && !pedal.down();
    for (const v of [...voices]) if (v.note === note) damp(v, 0.04);
    while (voices.length >= VOICES) { const old = voices[0]; damp(old, 0.02); endVoice(old); }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = Math.pow(2, (note - near) / 12);
    const g = ctx.createGain();
    g.gain.value = velGain(ins, vel);
    src.connect(g).connect(out);
    const v = { note, src, gain: g, damped: false, inst: ins.id, near, layer, rate: src.playbackRate.value };
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
    if (alreadyUp) { stat.late++; setTimeout(() => { if (!held.has(note) && !pedal.down()) damp(v, pedal.damper()); }, LATE_S * 1000); }
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
    if (warm && next.id !== 'piano') {
      const near = new Set();
      for (let n2 = warm[0]; n2 <= warm[1]; n2++) near.add(nearestIn(next.notes, n2));
      ensure();
      for (const n2 of near) fetchPlan(planFor(next, n2));
    }
  }

  function panic() {
    for (const v of [...voices]) { if (ctx) damp(v, 0.02); endVoice(v); }
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
    inst: () => inst,
    sounding: () => voices.length,
    loading: () => loading > 0,
    ctx: () => ctx,
    stat: () => ({ ...stat, urls: [...stat.urls], programs: [...stat.programs], buffers: buffers.size,
      voices: voices.length, inst: inst.id, state: ctx?.state || 'none' }),
  };
}
