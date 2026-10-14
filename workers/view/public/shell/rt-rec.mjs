// demo/shell/rt-rec.mjs: the `rec` node on /connect/ (note-recorder.mjs). Record takes what reaches
// rec:midi-in; Play sends it out of rec:midi-out at the times it came.
// why: lessons/kit-rt-rec.md#header

import { createNoteRecorder } from './note-recorder.mjs';

export function make({ send, wake }) {
  let out = 0;
  const recorder = createNoteRecorder({ send: (ev) => { out++; send('midi-out', ev); } });
  recorder.transport.button('rec').classList.add('cc-rec');
  const face = document.createElement('div');
  face.className = 'cn-panel';
  face.append(recorder.transport.el, recorder.table.el);
  // Play is a press that will need the page's sound.
  face.addEventListener('pointerdown', () => wake(), { capture: true });
  return {
    face, slot: 'panel', recorder,
    deliver: { 'midi-in': (e) => { if (e?.cls === 'note') recorder.take(e); } },
    heard: () => recorder.notes.length,
    sent: () => out,
    stop: () => recorder.stop(),
    close() { recorder.stop(); face.remove(); },
  };
}
