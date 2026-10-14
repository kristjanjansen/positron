// demo/shell/rt-knob.mjs: the runtime of one knob on /connect/
// (node-runtime.mjs). One node per parameter, `web:knob-<name>` (decision D2),
// a turn leaving on its value-out as `{ of: 'param', name, v }`. The dial's
// travel and reading are synth-params.mjs's when the name is one of its.

import { createKnob } from './knob.mjs';
import { PARAMS, knobRaw } from './synth-params.mjs';

// Made after the engines in one sync, so it can open at the value its engine holds.
export const after = true;

export function make({ id, send, peerParam }) {
  // knob-cutoff-2 is the cutoff knob of a second synth (node-runtime.mjs knobFor).
  const name = id.split(':')[1].replace(/^knob-?/, '').replace(/-\d+$/, '') || 'knob';
  const p = PARAMS.find((x) => x.name === name) ?? { name, min: 0, max: 127, value: (r) => r, format: null };
  const now = peerParam(name);
  let sent = 0;
  const knob = createKnob({
    label: name === 'q' ? 'Q' : name, min: p.min, max: p.max, step: p.step, format: p.format,
    value: now !== undefined ? knobRaw(name, now) : (p.min + p.max) / 2,
    onInput: (r) => { sent++; send('value-out', { of: 'param', name, v: p.value(r) }); },
  });
  return {
    face: knob.el, slot: 'knob', name, knob,
    heard: () => sent,
    close() { knob.el.remove(); },
  };
}
