// demo/shell/rt-grains.mjs: a `grains` node on /connect/, grain-ring.mjs on the page's scsynth.
// grains:audio-in is written round an eight second ring; grains leave on grains:audio-out.
// why: lessons/kit-rt-grains.md#header

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
