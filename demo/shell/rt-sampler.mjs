// demo/shell/rt-sampler.mjs: the runtime of a `sampler` node on /connect/
// (node-runtime.mjs): /code/piano/'s SuperCollider sampler (code/sc-sampler.mjs)
// in the page's one context, playing the Salamander piano and the Rhodes from
// our own bucket. Notes and program changes in on sampler:midi-in, sound out
// on sampler:audio-out.
// 🔴 A RECORDING IS FETCHED ONLY FOR A NOTE PLAYED, and only while a store is
// linked into sampler:file-in; with none, a note says so and sounds nothing.

import { PIANO, RHODES } from '/code/sampler.mjs';
import { createScSampler } from '/code/sc-sampler.mjs';

export function make({ upstream, log, wake, reroute }) {
  let ctx = null, notes = 0, told = false, readFrom = null;
  const sampler = createScSampler({ instruments: [PIANO, RHODES], warm: [48, 69], log, context: () => ctx,
    onReady: () => reroute() });
  return {
    sampler,
    deliver: {
      'midi-in': (e) => {
        const store = upstream('file-in');
        if (!store?.url) { if (!told) { told = true; log('the sampler has no samples linked into its file-in, so it is silent'); } return; }
        if (e?.cls === 'note') notes++;
        if (!ctx) wake();
        // The store says once that it is being read; the sampler fetches each file it needs from it.
        if (readFrom !== store) { readFrom = store; store.read(); }
        sampler.midi(e);
      },
    },
    start(c) { ctx = c; sampler.warm('the page woke'); },
    audio: { out: () => sampler.out() },
    heard: () => notes,
    stop: () => sampler.panic(),
    close() { sampler.panic(); try { sampler.out()?.disconnect(); } catch { /* not connected */ } },
  };
}
