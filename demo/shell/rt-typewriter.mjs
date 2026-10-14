// demo/shell/rt-typewriter.mjs: the runtime of a `typewriter` node on /connect/
// (node-runtime.mjs): /typist/'s Hermes Precisa 305 (typist/sampler.mjs),
// sounding what arrives on typewriter:value-in into typewriter:audio-out.
// 🔴 THE SAMPLES ARE READ ON THE FIRST KEY, from the store linked into
// typewriter:file-in (our own R2), never on a visit or a link. With no store
// linked there is nothing to play, and it says so once.

import { createSamples, createVoice } from '/typist/sampler.mjs';

export function make({ upstream, log }) {
  let ctx = null, out = null, voice = null, samples = null, text = 0, told = false;
  function ensure() {
    const store = upstream('file-in');
    if (!store?.url) {
      if (!told) { told = true; log('the typewriter has no samples linked into its file-in, so it is silent'); }
      return null;
    }
    if (!samples) {
      samples = createSamples({ base: store.read() });
      samples.load(ctx).catch((e) => { log(`the typewriter did not load: ${e.message}`, 'warn'); samples = null; });
      voice = createVoice(ctx, samples, { out, tuning: () => ({ rate: {} }) });
    }
    return voice;
  }
  return {
    deliver: {
      'value-in': (e) => {
        if (e?.of !== 'text' && typeof e?.kind !== 'string') return;
        text++;
        if (!ctx) return;
        const v = ensure();
        if (!v) return;
        if (samples.ready) v.sound(e.kind || '', e.text || '', e.column || 0);
        else samples.loading?.then(() => v.sound(e.kind || '', e.text || '', e.column || 0), () => {});
      },
    },
    start(c) { ctx = c; out = ctx.createGain(); },
    audio: { out: () => out },
    heard: () => text,
    strikes: () => voice?.started ?? 0,
    loaded: () => !!samples?.ready,
    close() { try { out?.disconnect(); } catch { /* not connected */ } },
  };
}
