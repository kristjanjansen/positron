// The SuperCollider sampler /code/piano/ plays: wasm scsynth running the board's posSampler1/2
// (rig/board/norns/possampler-defs.scd, written as bytes, not byte compared) with the board's
// voice core, summed to mono as the Pi sends it. Same calls as `createSampler`; a visit only hints.
// See lessons/page-code.md#code-54
import { createPedal, SUSTAIN_CC } from '/shell/pedal.mjs';
import { bootScsynth, loadScsynth, prefetchScsynth } from '/shell/scsynth.mjs';
import { graph, RATE, OP } from '/shell/synthdef.mjs';
import { PIANO, RHODES, PIANO_NOTES, RHODES_NOTES, RELEASE_KEYS, nearestIn, planFor, velGain }
  from '/code/sampler.mjs';

// The two SynthDefs as bytes. Env.asr(0.001, 1, rel, -6) as EnvGen reads it: start 0, two
// segments, release node 1, then (level, time, shape 5, curve) per segment, after EnvGen's
// own inputs: gate, levelScale 1, levelBias 0, timeScale 1, doneAction 2.
// See lessons/page-code.md#code-55
export function samplerDef(ch) {
  const g = graph(`posSampler${ch}`);
  const k = g.value;
  const [out, buf, rate, amp, gate, rel] = g.params([['out', 0], ['buf', 0], ['rate', 1], ['amp', 0.1], ['gate', 1], ['rel', 0.12]]);
  const env = g.block('EnvGen', RATE.sample, [gate, k(1), k(0), k(1), k(2),
    k(0), k(2), k(1), k(-99), k(1), k(0.001), k(5), k(-6), k(0), rel, k(5), k(-6)]);
  const scale = g.block('BufRateScale', RATE.slow, [buf]);
  const r = g.block('BinaryOpUGen', RATE.slow, [rate, scale], 1, OP.mul);
  const play = g.block('PlayBuf', RATE.sample, [buf, r, k(1), k(0), k(0), k(2)], ch);
  const sig = [];
  for (let i = 0; i < ch; i++) {
    const se = g.block('BinaryOpUGen', RATE.sample, [{ from: play.from, out: i }, env], 1, OP.mul);
    sig.push(g.block('BinaryOpUGen', RATE.sample, [se, amp], 1, OP.mul));
  }
  g.block('Out', RATE.sample, [out, ...sig], 0, 0);
  return g.bytes();
}

// ── the sets, as rig/board/scsampler.mjs SETS has them ──────────────────
// Buffer numbers fixed per file the Pi's way: Rhodes 100 up, Salamander notes
// 300 up (notes by layers 1, 6, 11, 16), releases 500 up. Keyed by URL here.
const BUFNUM = new Map();
PIANO_NOTES.flatMap((n) => [1, 6, 11, 16].map((l) => PIANO.file(n, l))).forEach((u, i) => BUFNUM.set(u, 300 + i));
RELEASE_KEYS.forEach((key, i) => BUFNUM.set(PIANO.release(key), 500 + i));
RHODES_NOTES.flatMap((n) => [1, 2, 3, 4, 5].map((l) => (RHODES.layerAt(n, l) === l ? RHODES.file(n, l) : null)))
  .filter(Boolean).forEach((u, i) => BUFNUM.set(u, 100 + i));
const SETS = {
  0: { id: 'piano', name: 'Piano', program: 0, ins: PIANO, gain: PIANO.gain, releaseGain: PIANO.releaseGain,
    fileFor: (near, vel) => PIANO.file(near, PIANO.pick(near, vel)), releaseFor: (key) => PIANO.release(key) },
  1: { id: 'rhodes', name: 'Rhodes', program: 1, ins: RHODES, gain: (vel) => velGain(RHODES, vel),
    fileFor: (near, vel) => { const l = RHODES.pick(near, vel); return l == null ? null : RHODES.file(near, l); } },
};

// The voice core, copied from rig/board/scsampler.mjs createSamplerCore (that file needs
// node:child_process). Changed only for the browser: `send(address, ...args)`, buffers keyed
// by URL, no FluidR3 set.
// See lessons/page-code.md#code-56
const VOICES = 32;
function createSamplerCore({ send, buffers, programs, onProgram = () => {}, now = () => performance.now() / 1000 }) {
  let program = programs[0], nextId = 2000;
  const live = [];
  const stat = { started: 0, stolen: 0, dropped: 0, ended: 0, releases: 0, last: null, peakVoices: 0 };
  const release = (note, sec) => {
    let fell = null;
    for (const v of live) if (v.note === note && !v.damped) { damp(v, sec); fell ??= v; }
    const set = fell && SETS[fell.program];
    const url = set?.releaseFor?.(note);
    const b = url && buffers.get(url);
    if (!b) return;
    const amp = set.releaseGain(fell.vel, now() - fell.at) * (b.channels === 2 ? 0.5 : 1);
    send('/s_new', b.channels === 2 ? 'posSampler2' : 'posSampler1', nextId++, 1, 0, 'buf', b.bufnum, 'rate', 1, 'amp', amp);
    stat.releases++;
  };
  const pedal = createPedal({ cc: SUSTAIN_CC, release });
  function damp(v, sec) {
    if (v.damped) return;
    v.damped = true;
    send('/n_set', v.id, 'rel', Math.max(0.005, sec), 'gate', 0);
  }
  function remove(v) { const i = live.indexOf(v); if (i >= 0) live.splice(i, 1); }
  function noteOn(note, vel) {
    if (!(note >= 0 && note <= 127)) return { ok: false };
    const set = SETS[program];
    pedal.keyDown(note);
    const near = nearestIn(set.ins.notes, note);
    const url = set.fileFor(near, vel);
    const b = url == null ? null : buffers.get(url);
    if (!b) { stat.dropped++; return { ok: false, dropped: true }; }
    for (const v of live) if (v.note === note) damp(v, 0.04);
    while (live.length >= VOICES) { const old = live[0]; damp(old, 0.02); remove(old); stat.stolen++; }
    const rate = Math.pow(2, (note - near) / 12);
    const amp = set.gain(vel) * (b.channels === 2 ? 0.5 : 1);
    const id = nextId++;
    send('/s_new', b.channels === 2 ? 'posSampler2' : 'posSampler1', id, 1, 0, 'buf', b.bufnum, 'rate', rate, 'amp', amp);
    live.push({ id, note, damped: false, program, vel, at: now() });
    stat.started++;
    stat.peakVoices = Math.max(stat.peakVoices, live.length);
    stat.last = { set: set.id, note, near, file: url.split('/').pop(), rate: +rate.toFixed(4), amp: +amp.toFixed(4), id };
    return { ok: true, ...stat.last };
  }
  function setProgram(p) {
    if (!SETS[p] || !programs.includes(p)) return { ok: false };
    if (p === program) return { ok: true, changed: false };
    program = p;
    for (const v of [...live]) { damp(v, 0.06); remove(v); }
    onProgram(SETS[p]);
    return { ok: true, changed: true };
  }
  function ended(id) { const v = live.find((x) => x.id === id); if (v) { remove(v); stat.ended++; } }
  function panic() { for (const v of [...live]) { damp(v, 0.02); remove(v); } pedal.panic?.(); }
  return {
    noteOn, noteOff: (n) => pedal.keyUp(n), control: (c, v) => pedal.control(c, v), program: setProgram, ended, panic,
    current: () => SETS[program], sounding: () => live.length, pedalDown: () => pedal.down(),
    stat: () => ({ ...stat, voices: live.length, program }),
  };
}

/** How long a note sounds whose key was already up when its recording arrived (sampler.mjs's rule). */
const LATE_S = 0.3;

/**
 * The SuperCollider sampler.
 * @param {object} o
 * @param {object[]} [o.instruments]  PIANO, and RHODES if the page has it (sampler.mjs's objects)
 * @param {(line:string, kind?:string)=>void} [o.log]
 * @param {(on:boolean)=>void} [o.onFetch]  a fetch began (true) or settled (false)
 * @param {(ins:object)=>void} [o.onProgram]  the instrument changed (sampler.mjs's object)
 * @param {(eng:object)=>void} [o.onReady]  the engine is up
 * @param {number[]} [o.warm]  [lo, hi] notes to fetch when the Rhodes is switched to
 * @param {() => AudioContext} [o.context]  a context to play in; left out, the first intent makes one
 * See lessons/page-code.md#code-57
 */
export function createScSampler({ instruments = [PIANO], log = () => {}, onFetch = () => {},
  onProgram = () => {}, onReady = () => {}, warm: warmRange = null, context: given = null } = {}) {
  prefetchScsynth();
  const programs = instruments.map((x) => x.program).filter((p) => SETS[p]);
  let ctx = null, eng = null, ready = null, settle = null, attempt = null;
  const buffers = new Map();       // url -> { bufnum, channels, frames }
  const inflight = new Map();
  const queue = [];
  let draining = false, loading = 0;
  const held = new Set(), waiting = new Map();   // note -> true once its key came up while its file was loading
  const stat = { files: 0, bytes: 0, urls: [], loadMs: [], started: 0, late: 0, programs: [], firstAt: null,
    // When each part of the boot finished, ms after the intent that started it.
    timing: { intent: null, intentAt: null, engineLoadedMs: null, initMs: null, notifyMs: null, defsMs: null,
      runningMs: null, readyMs: null, attempts: 0, contextAtIntent: null } };

  // ── timestamped sends ────────────────────────────────────────────────────
  // Everything the core sends inside one call goes at the same time: now, or
  // the `at` the caller gave. The pedal's own release runs inside that call too.
  let at = null;
  const atTime = (t, fn) => { const was = at; at = t; try { return fn(); } finally { at = was; } };
  const send = (...m) => { if (!eng) return; if (at == null) eng.send(...m); else eng.sendAt(at, ...m); };
  const core = createSamplerCore({
    send, buffers, programs,
    onProgram: (set) => { log(`program change ${set.program}: SuperCollider plays the ${set.name} now`); onProgram(set.ins); },
  });

  /** The context, made once and asked to run on every call (a press is a gesture; a hover is not). */
  function context() {
    if (!ctx) ctx = given ? given() : new AudioContext({ latencyHint: 'interactive' });
    // Fire and move on: resume() waits on a gesture and never rejects.
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    return ctx;
  }

  /**
   * Boot on intent; later calls return the same promise. A suspended context only downloads: its
   * worklet does nothing, a boot into it hangs past SuperSonic's 5 s wait. It boots once running.
   * See lessons/page-code.md#code-58
   */
  function warm(why = 'intent') {
    context();
    if (ready) return ready;
    stat.timing.intent = why;
    stat.timing.intentAt = performance.now();
    stat.timing.contextAtIntent = ctx.state;
    ready = new Promise((res, rej) => { settle = { res, rej }; });
    ready.catch(() => {});
    boot();
    return ready;
  }

  function boot() {
    if (attempt) return;
    stat.timing.attempts++;
    const t0 = stat.timing.intentAt;
    const since = () => Math.round(performance.now() - t0);
    attempt = (async () => {
      try {
        await loadScsynth();
        stat.timing.engineLoadedMs = since();
        if (ctx.state !== 'running') {
          await new Promise((res) => {
            const go = () => { if (ctx.state === 'running') { ctx.removeEventListener('statechange', go); res(); } };
            ctx.addEventListener('statechange', go);
            go();
          });
          stat.timing.runningMs = since();
        }
        const e = await bootScsynth({
          audioContext: ctx,
          log: (line) => log(line.replaceAll(' · ', ', ')),
          // scsynth's word that a voice ended, so the core's count stays true.
          onReply: (m) => {
            if (m[0] === '/n_end') { core.ended(m[1]); return true; }
            return m[0] === '/n_go' || m[0] === '/n_off' || m[0] === '/n_on' || m[0] === '/n_move';
          },
        });
        stat.timing.initMs = Math.round(e.bootMs);
        stat.timing.notifyMs = Math.round(e.notifyMs);
        // The capture's sum, then both speakers. `out` is bootScsynth's trim at
        // 0.9; the Pi has none, so it is 1 here.
        e.sonic.node.disconnect();
        const split = ctx.createChannelSplitter(2);
        const sum = ctx.createGain();
        sum.channelCount = 1; sum.channelCountMode = 'explicit'; sum.channelInterpretation = 'discrete';
        e.sonic.node.connect(split);
        split.connect(sum, 0, 0); split.connect(sum, 1, 0);
        sum.connect(e.meter);
        e.out.gain.value = 1;
        const td = performance.now();
        for (const ch of [1, 2]) {
          const got = await e.sendAndWait((m) => m[0] === '/done' && m[1] === '/d_recv', 20000, '/d_recv', samplerDef(ch));
          if (!got) throw new Error(`scsynth never said it had posSampler${ch}`);
        }
        stat.timing.defsMs = Math.round(performance.now() - td);
        stat.timing.readyMs = since();
        eng = e;
        log(`SuperCollider in this tab ${stat.timing.readyMs} ms after the ${stat.timing.intent}, the two sampler definitions taken in ${stat.timing.defsMs} ms`);
        settle.res(eng);
        onReady(eng);
      } catch (err) {
        attempt = null;
        log(`SuperCollider did not come up: ${err.message}`, 'bad');
        settle.rej(err);
        ready = null;
      }
    })();
  }

  // ── recordings ───────────────────────────────────────────────────────────
  /** One recording into a scsynth buffer, once. Its bytes come down while the engine boots. */
  function load(url) {
    if (buffers.has(url)) return Promise.resolve();
    if (inflight.has(url)) return inflight.get(url);
    const job = (async () => {
      const t = performance.now();
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${url.split('/').slice(-2).join('/')} answered ${res.status}`);
        const ab = await res.arrayBuffer();
        stat.bytes += ab.byteLength; stat.files++; stat.urls.push(url);
        const e = await warm('recording');
        const bufnum = BUFNUM.get(url);
        const info = await e.sonic.loadSample(bufnum, ab);
        buffers.set(url, { bufnum, channels: info.numChannels, frames: info.numFrames });
        stat.loadMs.push(Math.round(performance.now() - t));
      } catch (e) { log(`a recording did not load: ${e.message}`, 'warn'); }
    })().finally(() => inflight.delete(url));
    inflight.set(url, job);
    return job;
  }
  function track(p) {
    loading++; onFetch(true);
    return p.finally(() => { loading--; onFetch(false); });
  }
  /** Files a press does not wait for, one at a time behind it (sampler.mjs's order). */
  function behind(urls) {
    for (const u of urls) if (!buffers.has(u) && !queue.includes(u)) queue.push(u);
    if (draining) return;
    draining = true;
    track((async () => { while (queue.length) await load(queue.shift()); })()).finally(() => { draining = false; });
  }

  // ── notes ────────────────────────────────────────────────────────────────
  async function noteOn(note, vel, when = null) {
    if (!(note >= 0 && note <= 127)) return;
    held.add(note);
    waiting.set(note, false);
    // Inside the press: the context is asked to run here, where a gesture lets it.
    const booted = warm('key');
    try {
      const set = core.current();
      const near = nearestIn(set.ins.notes, note);
      const layer = set.ins.pick(near, vel);
      const url = set.ins.file(near, layer);
      if (!buffers.has(url)) await track(Promise.all(planFor(set.ins, near, layer).urls.map(load)));
      if (set.ins.behind) behind(set.ins.behind(near, layer, note));
      await booted;
      const early = waiting.get(note);
      waiting.delete(note);
      const r = atTime(when, () => core.noteOn(note, vel));
      if (!r.ok) return;
      stat.started++;
      stat.firstAt ??= performance.now();
      // A key let go while its recording was still coming sounds for LATE_S and
      // is then damped, so a first click is heard.
      if (early) {
        stat.late++;
        setTimeout(() => { if (!held.has(note)) core.noteOff(note); }, LATE_S * 1000);
      }
    } catch { waiting.delete(note); }
  }
  function noteOff(note, when = null) {
    held.delete(note);
    if (waiting.has(note)) { waiting.set(note, true); return; }
    atTime(when, () => core.noteOff(note));
  }
  function program(p) {
    stat.programs.push(p);
    if (!programs.includes(p)) { log(`program ${p} is not an instrument here`, 'warn'); return; }
    const r = core.program(p);
    if (!r.changed) return;
    // A program change is a press, so this is not a visit: the engine boots,
    // and the Rhodes notes the keys on screen reach come down, so its first
    // note is not a cold fetch (010's warm).
    warm('program change');
    if (warmRange && p === RHODES.program) {
      const near = new Set();
      for (let n = warmRange[0]; n <= warmRange[1]; n++) near.add(nearestIn(RHODES.notes, n));
      for (const n of near) track(Promise.all(planFor(RHODES, n).urls.map(load)));
    }
  }
  function panic() {
    queue.length = 0;
    held.clear();
    core.panic();
  }
  /** One MIDI-shaped event, as the bay delivers it. `at` is when it should sound. */
  function midi(e) {
    const when = Number.isFinite(e.at) ? e.at : null;
    if (e.cls === 'note') return e.d2 ? noteOn(e.d1, e.d2, when) : noteOff(e.d1, when);
    if (e.cls === 'cc' && e.d1 === SUSTAIN_CC) { atTime(when, () => core.control(e.d1, e.d2)); return; }
    if (e.cls === 'program') return program(e.d1);
  }

  /**
   * Press to speakers on the live path: the context's base plus output latency. Do not add a
   * block: scsynth already starts a bundle about 2.5 ms late, and a block more put replays 3 ms late.
   * See lessons/page-code.md#code-59
   */
  function latencyMs() {
    if (!ctx) return 0;
    return ((ctx.baseLatency || 0) + (ctx.outputLatency || 0)) * 1000;
  }

  return {
    midi, noteOn, noteOff, program, panic, warm, latencyMs,
    inst: () => core.current().ins,
    sounding: () => core.sounding(),
    loading: () => loading > 0 || draining,
    ctx: () => ctx,
    engine: () => eng,
    /** The engine's way out once it is up (bootScsynth's `out`), for a caller with its own router. */
    out: () => eng?.out ?? null,
    ready: () => !!eng,
    stat: () => ({ ...stat, urls: [...stat.urls], loadMs: [...stat.loadMs], programs: [...stat.programs],
      timing: { ...stat.timing }, buffers: buffers.size, voices: core.sounding(), inst: core.current().id,
      core: core.stat(), engine: 'scsynth', state: ctx?.state || 'none',
      underruns: ctx?.playbackStats?.underrunEvents ?? null, sampleRate: ctx?.sampleRate ?? null }),
  };
}

/**
 * The intent that boots the engine, on an element: a pointer over it, a touch,
 * a pointer down (which is also the key) or a focus inside it. Each listener
 * goes after its first call.
 * See lessons/page-code.md#code-60
 */
export function warmOnIntent(el, sampler) {
  const go = (e) => { sampler.warm(e.type); for (const t of TYPES) el.removeEventListener(t, go); };
  const TYPES = ['pointerover', 'pointerdown', 'touchstart', 'focusin'];
  for (const t of TYPES) el.addEventListener(t, go, { passive: true });
}
