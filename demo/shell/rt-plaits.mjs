// demo/shell/rt-plaits.mjs: the runtime of a plaits node on /connect/: /code/plaits/'s voice, knob row
// and patch picker. Notes in on plaits:midi-in, sound out on plaits:audio-out; a knob acts as value-in.
// why: lessons/kit-rt-plaits.md#header

import { createKnob } from './knob.mjs';
import { createKnobGrid } from './knob-grid.mjs';
import { createPicker } from './picker.mjs';
import { createPlaitsVoice, createPlaitsKeys, PATCHES, P, KNOBS } from '/code/plaits-voice.mjs';

export function make({ log, wake, reroute }) {
  let ctx = null, notes = 0, params = 0;
  const voice = createPlaitsVoice({ log, voices: 6, context: () => ctx, onUp: () => reroute() });
  voice.setGain(PATCHES[0].gain);
  // A note before the page's sound is up wakes it, as a key on /code/plaits/ boots the voice.
  const keys = createPlaitsKeys(voice, { boot: () => { wake(); return voice.boot(); } });
  const byName = new Map(KNOBS.map((k) => [k.name, k]));
  function set(name, v) {
    const k = byName.get(name);
    if (!k) return false;
    params++;
    if (k.param === 'transpose') keys.setTranspose(v);
    else voice.send({ t: 'param', id: P[k.param], value: k.round ? Math.round(v) : v });
    return true;
  }
  const knobs = new Map(KNOBS.map((k) => [k.name, createKnob({
    label: k.short || k.name, title: k.name, min: k.min, max: k.max, step: k.step, value: k.value, home: k.value, hand: true,
    format: k.format, onInput: (v) => set(k.name, v),
  })]));
  for (const k of KNOBS) set(k.name, k.value);
  params = 0;
  const grid = createKnobGrid(knobs, { row: true });
  let at = 0;
  const pick = (i) => {
    at = i;
    patches.show(PATCHES[i].name, i);
    const p = PATCHES[i];
    voice.setGain(p.gain);
    const want = { model: p.engine, harmonics: p.harmonics, timbre: p.timbre, morph: p.morph, decay: p.decay, colour: p.colour };
    for (const [name, v] of Object.entries(want)) set(name, knobs.get(name).receive(v, { from: 'patch', force: true }));
  };
  const step = (by) => pick((at + by + PATCHES.length) % PATCHES.length);
  const patches = createPicker({ what: 'patch', prev: () => step(-1), next: () => step(+1), onPick: (i) => pick(i) });
  patches.options(PATCHES.map((p) => p.name), 0);
  patches.show(PATCHES[0].name, 0);
  const face = document.createElement('div');
  face.className = 'cn-panel';
  face.append(patches.el, grid.el);
  // A press on the panel is a person's: it starts the sound, and a pointer over it fetches the wasm.
  face.addEventListener('pointerdown', () => wake(), { capture: true });
  face.addEventListener('pointerenter', () => voice.warm().catch(() => {}), { once: true });
  return {
    face, slot: 'panel', voice, knobs, keys,
    deliver: {
      'midi-in': (e) => {
        if (e?.cls !== 'note') return;
        notes++;
        if (e.d2 > 0) keys.noteOn(e.d1, e.d2); else keys.noteOff(e.d1);
      },
      'value-in': (e) => { if (e?.of === 'param' && !set(e.name, e.v)) log(`Plaits has no ${e.name}, so it ignores it`); },
    },
    start(c) { ctx = c; voice.boot(); },
    audio: { out: () => voice.out() },
    level: () => voice.level(),
    ready: () => voice.ready(),
    heard: () => notes,
    params: () => params,
    stop: () => voice.allOff(),
    close() { voice.allOff(); try { voice.out()?.disconnect(); } catch { /* not connected */ } face.remove(); },
  };
}
