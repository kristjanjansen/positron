// demo/shell/rt-grains.mjs: a `grains` node on /connect/, grain-ring.mjs on the page's scsynth.
// grains:audio-in is written round an eight second ring; grains leave on grains:audio-out.
// why: lessons/kit-rt-grains.md#header

import { createRingEngine, PATCHES } from '/granulator/grain-ring.mjs';
import { createStepper } from './stepper.mjs';

export function make({ log, reroute }) {
  const engine = createRingEngine({ log });
  let input = null, out = null, grains = 0, up = false, at = 0;
  // The face is the granulator's patch picker, the same patches /granulator/grains/ offers.
  const say = document.createElement('p');
  say.className = 'cn-face-say';
  const choose = (i) => {
    at = (i + PATCHES.length) % PATCHES.length;
    step.show(PATCHES[at].name, at);
    say.textContent = PATCHES[at].says;
    if (up) engine.fixed(PATCHES[at].set);
  };
  const step = createStepper({ what: 'patch', prev: () => choose(at - 1), next: () => choose(at + 1),
    pick: { options: PATCHES.map((p) => p.name), at: 0, onPick: (i) => choose(i) } });
  const face = document.createElement('div');
  face.className = 'cn-panel';
  face.append(step.el, say);
  say.textContent = PATCHES[0].says;
  return {
    engine, face, slot: 'panel', patch: () => PATCHES[at].name, choose,
    start(ctx) {
      input = ctx.createGain();
      engine.boot({ ctx, input, log, grain: () => { grains++; } }).then((r) => {
        // The engine opens closed; its wire to the speakers is this page's router.
        out = r.out; out.gain.value = 1; up = true;
        engine.fixed(PATCHES[at].set);
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
    close() { face.remove(); if (up) engine.run(false); try { out?.disconnect(); } catch { /* not connected */ } },
  };
}
