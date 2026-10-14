// demo/shell/rt-grains.mjs: the runtime of a `grains` node on /connect/
// (node-runtime.mjs): /granulator/grains/'s grain ring (grain-ring.mjs
// `createRingEngine`), on scsynth in the page's one context. What arrives on
// grains:audio-in is written round its eight second ring; its grains leave on
// grains:audio-out, and every grain the engine reports is counted.

import { createRingEngine } from '/granulator/grain-ring.mjs';

export function make({ log, reroute }) {
  const engine = createRingEngine({ log });
  let input = null, out = null, grains = 0, up = false;
  return {
    engine,
    start(ctx) {
      input = ctx.createGain();
      engine.boot({ ctx, input, log, grain: () => { grains++; } }).then((r) => {
        // The engine opens closed; its wire to the speakers is this page's router.
        out = r.out; out.gain.value = 1; up = true;
        // A silent branch off the meter keeps the engine pulled when no link
        // takes its sound: Web Audio pulls, and an engine nobody pulls stops.
        const pull = ctx.createGain(); pull.gain.value = 0;
        r.meter.connect(pull); pull.connect(ctx.destination);
        reroute();
      }, (e) => log(`the granulator did not come up: ${e?.message || e}`, 'bad'));
    },
    audio: { in: () => input, out: () => out },
    up: () => up,
    heard: () => grains,
    close() { if (up) engine.run(false); try { out?.disconnect(); } catch { /* not connected */ } },
  };
}
