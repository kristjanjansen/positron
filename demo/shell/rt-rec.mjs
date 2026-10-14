// demo/shell/rt-rec.mjs: the runtime of a `rec` node on /connect/
// (node-runtime.mjs): /synth/recorder/'s recorder (note-recorder.mjs). What
// reaches rec:midi-in while Record is on is taken; Play sends the same notes
// out of rec:midi-out at the times they came. Its face is Record, Play and the
// table of what was taken.

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
