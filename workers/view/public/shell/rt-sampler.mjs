// demo/shell/rt-sampler.mjs: the `sampler` node on /connect/: code/sc-sampler.mjs in the page's one
// context. A recording is fetched only for a note played, and only while a store is linked into
// sampler:file-in; with none, a note says so and sounds nothing.
// why: lessons/kit-rt-sampler.md#header

import { SAMPLER_SET } from '/code/sampler.mjs';
import { createScSampler } from '/code/sc-sampler.mjs';

export function make({ upstream, log, wake, reroute }) {
  let ctx = null, notes = 0, told = false, readFrom = null;
  // A patch chosen on a link is a program change held until the engine is up or a note is played,
  // so choosing one fetches nothing (sc-sampler's program change warms the Rhodes).
  let want = null, chose = null, applied = null;
  const sampler = createScSampler({ instruments: SAMPLER_SET, warm: [48, 69], log, context: () => ctx,
    onReady: () => reroute() });
  const apply = () => { if (want !== null && want !== applied) { applied = want; sampler.program(want); } };
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
        apply();
        sampler.midi(e);
      },
    },
    /** A `patch` transform on a link into midi-in names one of SAMPLER_SET. */
    patch(name) {
      const ins = SAMPLER_SET.find((i) => i.name === name);
      if (!ins) { log(`the sampler has no patch called ${name}`, 'warn'); return false; }
      chose = ins.name; want = ins.program;
      if (sampler.ready() && upstream('file-in')?.url) apply();
      log(`the sampler plays ${ins.name} from its next note`);
      return true;
    },
    chosen: () => chose,
    start(c) { ctx = c; sampler.warm('the page woke'); },
    audio: { out: () => sampler.out() },
    heard: () => notes,
    stop: () => sampler.panic(),
    close() { sampler.panic(); try { sampler.out()?.disconnect(); } catch { /* not connected */ } },
  };
}
