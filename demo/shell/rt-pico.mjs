// demo/shell/rt-pico.mjs: a `pico` node on /connect/, the emulated Pico of /synth/dots/ in a worker.
// Notes in on pico:midi-in; screens out on pico:video-out to linked runtimes (an OLED).
// Nothing is fetched before its face is pressed or the first note arrives.
// why: lessons/kit-rt-pico.md#header

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
