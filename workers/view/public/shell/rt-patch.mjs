// demo/shell/rt-patch.mjs: the runtime of a `patch` node on /connect/
// (node-runtime.mjs). Its face is the kit picker; a pick leaves on
// patch:midi-out as one program change, which is how every instrument on this
// desk is switched. 64 programs, 0 to 63, the most the Circuit's gate lets
// through. A name read back from an instrument is that instrument page's.

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
