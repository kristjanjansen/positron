// demo/shell/rt-pico.mjs: the runtime of a `pico` node on /connect/
// (node-runtime.mjs): /synth/dots/'s emulated Pico (pico.mjs
// `createPicoDevice`), the rings firmware on an RP2040 in a worker. Notes in on
// pico:midi-in; every screen it draws leaves on pico:video-out, handed only to
// the runtimes that link reaches (an OLED). Its face says what it is doing and
// starts it; nothing is fetched before that press or the first note.

import { createPicoDevice } from './pico.mjs';
import { createButtonGroup } from './button-group.mjs';

export function make({ log, downstream }) {
  let notes = 0;
  const say = document.createElement('p');
  say.className = 'cn-face-say';
  say.textContent = 'Pico (emulated), off: a note or Start boots it';
  const pico = createPicoDevice({
    onFrame: (px) => { for (const rt of downstream('video-out')) rt.frame?.(px); },
    onState: (st) => {
      say.textContent = `Pico (emulated), ${st}`;
      if (st !== 'loading') buttons.enable('start', false, st);
    },
    log,
  });
  const buttons = createButtonGroup({ buttons: [{ id: 'start', label: 'Start', onPress: () => pico.start() }] });
  const face = document.createElement('div');
  face.className = 'cn-panel';
  face.append(buttons.el, say);
  return {
    face, slot: 'panel', pico,
    deliver: { 'midi-in': (e) => { if (e?.cls === 'note' || e?.cls === 'cc') { notes++; pico.midi(e); } } },
    heard: () => notes,
    frames: () => pico.frames(),
    close() { face.remove(); },
  };
}
