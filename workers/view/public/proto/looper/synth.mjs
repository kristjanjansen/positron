// proto/looper/synth.mjs — the instrument. Two implementations behind one
// interface, because the measurement has to run in both places:
//
//   createVoices(ctx, …)   real WebAudio, sample-accurate, what you hear
//   createLogVoices(…)     no audio at all, records every call with its stamps
//
// The looper never knows which one it is driving, so measure.mjs (node, virtual
// clock) and index.html (browser, real clock, real ears) exercise the SAME
// scheduling decisions.
//
// ---------------------------------------------------------------------------
// TWO PATHS, ON PURPOSE, AND THE DIFFERENCE IS THE POINT
// ---------------------------------------------------------------------------
// MONITOR path — your own playing, heard immediately. Started at
// `ctx.currentTime` inside the input handler. It must NOT wait for the wall
// lane's 25 ms lookahead tick: a performer hearing their own note a tick late
// is the one latency a looper may never add.
//
// LOOP path — the recorded copy, played by the deck. Started at
// `when.audioTime`, the instant `caps.audio` converts the wall lane's intent
// into AudioContext seconds. Decided on a coarse tick, rendered on the sample
// grid.
//
// Both are logged with their intended and actual instants so the A/B in
// NOTES.md M3 is a measurement and not an argument.
//
// ---------------------------------------------------------------------------
// WHY PLAYBACK NOTES ARE PAIRED (on + duration) AND NOT TWO EDGES
// ---------------------------------------------------------------------------
// projectToPhase() pairs each on with its off and stores `durMs`, so a playback
// voice is scheduled ONCE, complete with its release, and cannot be left
// hanging by a lost note-off. That is the right default and it is also why the
// §8.3 re-arm claim needs a NEGATIVE CONTROL to mean anything: `noteMode:
// 'edges'` re-splits notes into independent on/off events, which is what a live
// MIDI stream actually is, and then a trimmed note-off really does leave a
// voice ringing forever unless the wrap re-arms the lane. The looper ships
// 'paired'; the measurement runs both.

/** ADSR in seconds — short attack, so an onset detector sees a real edge. */
export const ENV = { a: 0.004, d: 0.06, s: 0.55, r: 0.09 };

// ===========================================================================
// The real instrument
// ===========================================================================

/**
 * @param {AudioContext} ctx
 * @param {object} o
 * @param {AudioNode} [o.dest] where to connect (default ctx.destination)
 * @param {function} [o.onOnset] called with every scheduled onset row
 * @param {'paired'|'edges'} [o.noteMode]
 * @param {boolean} [o.rearm] false = the negative control for §8.3
 */
export function createVoices(ctx, {
  dest = null, onOnset = null, maxVoices = 24, noteMode = 'paired', rearm = true,
  gain = 0.16,
} = {}) {
  const out = ctx.createGain();
  out.gain.value = gain;

  // ONE FILTER PER LAYER, so the `cc` lane has something audible to carry
  // across a wrap that the `note` lane must NOT carry.
  const layerNodes = new Map();      // layer -> {gain, filter, muted}
  const live = [];                   // active voices, for stealing and counting
  let peak = 0, stolen = 0, seq = 0;
  const monitorLive = new Map();     // note -> voice, for the live path

  // A started ConstantSourceNode(0) keeps the bus from latching silent —
  // without it Chrome hands a downstream AudioWorklet an EMPTY input array and
  // an onset detector sees nothing at all (HANDOFF's trap list; it cost a
  // previous session real time).
  const keepBusAlive = ctx.createConstantSource();
  keepBusAlive.offset.value = 0;
  keepBusAlive.connect(out);
  keepBusAlive.start();

  out.connect(dest || ctx.destination);

  function layerNode(layer) {
    let n = layerNodes.get(layer);
    if (!n) {
      const g = ctx.createGain(); g.gain.value = 1;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 4000; f.Q.value = 4;
      f.connect(g); g.connect(out);
      n = { gain: g, filter: f, muted: false };
      layerNodes.set(layer, n);
    }
    return n;
  }

  /** the one place a voice is built; `t` is an AudioContext instant */
  function voice({ hz, vel = 100, t, durSec, layer = 0, tag, key }) {
    const node = layerNode(layer);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o1.type = 'sawtooth'; o2.type = 'sawtooth';
    o1.frequency.value = hz; o2.frequency.value = hz;
    o2.detune.value = 7;                       // two saws, 7 cents apart
    const peakG = Math.max(0.02, (vel / 127) ** 1.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peakG, t + ENV.a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peakG * ENV.s), t + ENV.a + ENV.d);
    o1.connect(g); o2.connect(g); g.connect(node.filter);
    o1.start(t); o2.start(t);

    const v = { id: ++seq, o1, o2, g, t, layer, key, tag, released: false, stop: null };
    if (durSec != null) release(v, t + Math.max(0.01, durSec));
    live.push(v);
    peak = Math.max(peak, live.length);
    if (live.length > maxVoices) { stolen++; release(live[0], ctx.currentTime, true); }
    return v;
  }

  function release(v, t, now = false) {
    if (v.released) return;
    v.released = true;
    const at = Math.max(t, now ? ctx.currentTime : t);
    try {
      v.g.gain.cancelScheduledValues(at);
      v.g.gain.setValueAtTime(Math.max(0.0002, v.g.gain.value), at);
      v.g.gain.exponentialRampToValueAtTime(0.0001, at + ENV.r);
      v.o1.stop(at + ENV.r + 0.005); v.o2.stop(at + ENV.r + 0.005);
    } catch { /* already stopped */ }
    const drop = () => { const i = live.indexOf(v); if (i >= 0) live.splice(i, 1); };
    v.o1.onended = drop;
    v.stop = at + ENV.r;
  }

  const api = {
    out, ctx,
    // --- the LOOP path (driven by the deck) --------------------------------
    noteOn(p, rec, when, ref) {
      const node = layerNode(p.layer);
      if (node.muted) return;
      // `when.audioTime` is the intended instant in AudioContext seconds. When
      // the adapter did not declare caps.audio (or the fire was late enough
      // that the bridge refuses), fall back to "now" and SAY SO in the row —
      // never silently pretend the fallback was scheduled.
      // THE INTENT, IN AUDIO SECONDS, whether or not we can honour it.
      // `when.audioTime` already carries the declared `leadMs`; removing it
      // again gives the instant the note was *meant* to sound at, which is the
      // only target worth measuring against. Keeping both is what makes the
      // A/B in NOTES.md M3 possible at all: without `intendedAudioT` the
      // fallback path scores a perfect zero by definition, because it is
      // compared against the very instant it settled for.
      const leadSec = when ? (when.leadMs || 0) / 1000 : 0;
      const intendedAudioT = when ? when.audioTime - leadSec : null;
      const bridged = !!(when && !when.late);
      const t = bridged ? when.audioTime : ctx.currentTime;
      const durSec = noteMode === 'paired' && p.durMs != null ? p.durMs / 1000 : null;
      const v = voice({ hz: p.hz, vel: p.vel, t, durSec, layer: p.layer, key: p.note, tag: 'loop' });
      onOnset && onOnset({
        path: 'loop', note: p.note, layer: p.layer, phase: rec ? rec.at : null,
        childPos: ref && ref.deck ? ref.deck.position() : null,
        iter: ref && ref.iter ? ref.iter() : null,
        audioT: t, intendedAudioT, leadMs: when ? when.leadMs : null,
        ctxTime: ctx.currentTime, wallUs: rec ? rec.firedUs : null,
        intendedUs: rec ? rec.intendedUs : null, deltaMs: rec ? rec.deltaMs : null,
        earlyMs: when ? when.earlyMs : null, sampleAccurate: bridged, bridged,
        trimmed: !!p.trimmed, voiceId: v.id,
      });
    },
    noteOff(p) {
      for (const v of live.slice()) if (v.key === p.note && v.tag === 'loop' && !v.released) release(v, ctx.currentTime);
    },
    cc(p, rec, when) {
      const node = layerNode(p.layer || 0);
      const t = when && !when.late ? when.audioTime : ctx.currentTime;
      const hz = 200 * Math.pow(2, (p.value / 127) * 5.2);   // 200 Hz .. ~7.3 kHz
      try { node.filter.frequency.setValueAtTime(hz, Math.max(t, ctx.currentTime)); } catch {}
      onOnset && onOnset({ path: 'cc', ctrl: p.ctrl, value: p.value, layer: p.layer || 0,
        audioT: t, ctxTime: ctx.currentTime, hz });
    },
    /** §8.3's re-arm: silence what the previous pass left ringing, BEFORE the
     *  fold. With `rearm:false` this is a no-op and the negative control runs. */
    wrap(info) {
      if (!rearm) return;
      const t = ctx.currentTime;
      for (const v of live.slice()) if (v.tag === 'loop' && !v.released) release(v, t);
    },
    assert(present, info) {
      // MIDI chase made audible: after a seek the sounding set must equal the
      // held set at the new position. Notes that should not be sounding stop;
      // notes that should be, and are not, start now.
      const want = new Map((present || []).map((p) => [p.note, p]));
      for (const v of live.slice()) {
        if (v.tag !== 'loop') continue;
        if (!want.has(v.key)) release(v, ctx.currentTime);
        else want.delete(v.key);
      }
      for (const p of want.values()) {
        voice({ hz: p.hz, vel: p.vel, t: ctx.currentTime, durSec: null, layer: p.layer, key: p.note, tag: 'loop' });
      }
    },
    allOff() { const t = ctx.currentTime; for (const v of live.slice()) release(v, t); },

    // --- the MONITOR path (your own playing, immediate) --------------------
    monitorOn(r) {
      const v = voice({ hz: 440 * Math.pow(2, (r.note - 69) / 12), vel: r.vel,
                        t: ctx.currentTime, durSec: null, layer: 'mon', key: r.note, tag: 'mon' });
      monitorLive.set(r.note, v);
      onOnset && onOnset({ path: 'monitor', note: r.note, audioT: ctx.currentTime,
        ctxTime: ctx.currentTime, srcAt: r.at, handlerAt: r.handlerAt, stampSkewMs: r.stampSkewMs });
    },
    monitorOff(r) { const v = monitorLive.get(r.note); if (v) { release(v, ctx.currentTime); monitorLive.delete(r.note); } },
    monitorCc(r) { api.cc({ ctrl: r.ctrl, value: r.value, layer: 'mon' }, null, null); },

    setLayerMuted(layer, m) { const n = layerNode(layer); n.muted = m; n.gain.gain.value = m ? 0 : 1; },
    voiceCount: () => live.length,
    loopVoiceCount: () => live.filter((v) => v.tag === 'loop' && !v.released).length,
    peakVoices: () => peak,
    stolenVoices: () => stolen,
    resetPeak() { peak = live.length; },
    /** the latency a looper has to compensate for, straight from the UA */
    latency: () => ({
      base: ctx.baseLatency ?? null,
      output: ctx.outputLatency ?? null,
      totalMs: ((ctx.baseLatency || 0) + (ctx.outputLatency || 0)) * 1000,
      sampleRate: ctx.sampleRate,
    }),
    dispose() { try { keepBusAlive.stop(); out.disconnect(); } catch {} },
  };
  return api;
}

// ===========================================================================
// The node-side stub — no audio, every call recorded with its stamps
// ===========================================================================

export function createLogVoices({ clock, onOnset = null, rearm = true, latencyMs = 0 } = {}) {
  const calls = [];
  const held = new Map();            // note -> {layer, at}
  const muted = new Set();           // layers currently gated OUT
  let peak = 0, wraps = 0;
  const now = () => (clock ? clock.now() : 0);

  const api = {
    calls,
    noteOn(p, rec, when, ref) {
      held.set(`${p.layer}:${p.note}`, { ...p, firedAt: now() });
      peak = Math.max(peak, held.size);
      const row = {
        path: 'loop', note: p.note, layer: p.layer, phase: rec ? rec.at : null,
        childPos: ref && ref.deck ? ref.deck.position() : null,
        iter: ref && ref.iter ? ref.iter() : null,
        wallUs: rec ? rec.firedUs : null, intendedUs: rec ? rec.intendedUs : null,
        deltaMs: rec ? rec.deltaMs : null, trimmed: !!p.trimmed, durMs: p.durMs,
        // a gated layer still FIRES — the scheduler is unaware of mute — it
        // simply makes no sound. Recording that distinction is what lets a test
        // tell "started at the downbeat" from "started and was inaudible".
        muted: muted.has(p.layer),
      };
      calls.push(row); onOnset && onOnset(row);
      // paired notes retire on their own duration, exactly as a real voice does
      if (p.durMs != null) setTimeout0(() => held.delete(`${p.layer}:${p.note}`));
    },
    noteOff(p) { held.delete(`${p.layer}:${p.note}`); },
    cc(p, rec) { calls.push({ path: 'cc', ctrl: p.ctrl, value: p.value, layer: p.layer, at: now() }); },
    wrap(info) { wraps++; if (!rearm) return; for (const k of [...held.keys()]) held.delete(k); },
    assert(present) { held.clear(); for (const p of present || []) held.set(`${p.layer}:${p.note}`, p); },
    allOff() { held.clear(); },
    monitorOn(r) { calls.push({ path: 'monitor', note: r.note, srcAt: r.at, handlerAt: r.handlerAt, stampSkewMs: r.stampSkewMs }); },
    monitorOff() {}, monitorCc() {},
    setLayerMuted(layer, m) { if (m) muted.add(layer); else muted.delete(layer); },
    mutedLayers: () => [...muted],
    voiceCount: () => held.size,
    loopVoiceCount: () => held.size,
    peakVoices: () => peak,
    stolenVoices: () => 0,
    resetPeak() { peak = held.size; },
    wrapCount: () => wraps,
    // A stub reports zero latency because it has no output — EXCEPT when a test
    // is deliberately modelling a speaker, which is the only way to exercise
    // overdub compensation without a human in the loop.
    latency: () => ({ base: null, output: null, totalMs: latencyMs, sampleRate: null }),
    dispose() {},
  };
  // the virtual clock has no setTimeout; retirement is immediate there, which
  // is correct — a paired voice's duration is not the thing under test in node
  function setTimeout0(fn) { fn(); }
  return api;
}
