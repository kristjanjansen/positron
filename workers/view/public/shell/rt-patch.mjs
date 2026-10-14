// demo/shell/rt-patch.mjs: the runtime of a `patch` node on /connect/ (node-runtime.mjs).
// A pick leaves on patch:midi-out as one program change, 0 to 63 (the Circuit's gate).
// why: lessons/kit-rt-patch.md#header

import { createPicker } from './picker.mjs';

const N = 64;

export function make({ send, wake }) {
  let at = 0, sent = 0;
  const label = (i) => `patch ${i + 1}`;
  function pick(i) {
    at = (i + N) % N;
    picker.show(label(at), at);
    sent++;
    send('midi-out', { cls: 'program', ch: 1, d1: at });
  }
  const picker = createPicker({ what: 'patch', prev: () => pick(at - 1), next: () => pick(at + 1), onPick: (i) => pick(i) });
  picker.options(Array.from({ length: N }, (_, i) => label(i)), 0);
  picker.show(label(0), 0);
  picker.el.addEventListener('pointerdown', () => wake(), { capture: true });
  const face = document.createElement('div');
  face.className = 'cn-panel';
  face.append(picker.el);
  return {
    face, slot: 'panel', pick,
    at: () => at,
    heard: () => sent,
    close() { face.remove(); },
  };
}
