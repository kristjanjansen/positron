// demo/shell/rt-knob.mjs: one knob node per parameter on /connect/, `web:knob-<name>` (decision D2).
// A turn leaves on its value-out as `{ of: 'param', name, v }`; travel and reading come from
// synth-params.mjs when the name is one of its.
// why: lessons/kit-rt-knob.md#header

import { createKnob } from './knob.mjs';
import { PARAMS, knobRaw } from './synth-params.mjs';

// Made after the engines in one sync, so it can open at the value its engine holds.
export const after = true;

export function make({ id, send, peerParam, peerSpec }) {
  // knob-cutoff-2 is the cutoff knob of a second synth (node-runtime.mjs knobFor).
  const name = id.split(':')[1].replace(/^knob-?/, '').replace(/-\d+$/, '') || 'knob';
  // Not a synth parameter: the travel the engine it turns gives for the name, as its own page's knob has it.
  const spec = PARAMS.some((x) => x.name === name) ? null : peerSpec(name);
  const p = PARAMS.find((x) => x.name === name)
    ?? (spec ? { name, min: spec.min, max: spec.max, value: (r) => r, format: null, at: spec.value } : { name, min: 0, max: 127, value: (r) => r, format: null });
  const now = peerParam(name);
  let sent = 0;
  const knob = createKnob({
    label: name === 'q' ? 'Q' : name, min: p.min, max: p.max, step: p.step, format: p.format,
    value: now !== undefined ? knobRaw(name, now) : p.at ?? (p.min + p.max) / 2,
    onInput: (r) => { sent++; send('value-out', { of: 'param', name, v: p.value(r) }); },
  });
  // An engine that holds no value for this name yet gets the knob's, over the link, as a page sends its starting value.
  if (now === undefined && spec) { sent++; send('value-out', { of: 'param', name, v: p.value(knob.value()) }); }
  return {
    face: knob.el, slot: 'knob', name, knob,
    heard: () => sent,
    close() { knob.el.remove(); },
  };
}
