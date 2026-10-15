// demo/shell/rt-synth.mjs: the runtime of a `synth` node on /connect/
// (node-runtime.mjs): the kit voice (synth-voice.mjs), played by synth:midi-in,
// set by synth:value-in, heard on synth:audio-out. No face of its own.

import { createVoice } from './synth-voice.mjs';
import { WAVES } from './synth-params.mjs';

export function make({ log }) {
  const v = createVoice();
  let notes = 0;
  const told = new Set();
  return {
    voice: v,
    deliver: {
      'midi-in': (e) => {
        if (e?.cls !== 'note') return;
        notes++;
        if (e.d2) v.noteOn(e.d1, e.d2); else v.noteOff(e.d1);
      },
      'value-in': (e) => {
        if (e?.of !== 'param') return;
        // An unknown name is said once and ignored, as patch-synth.mjs does.
        if (!v.set(e.name, e.v) && !told.has(e.name)) { told.add(e.name); log(`the synth has no ${e.name}, so it ignores it`); }
      },
    },
    start: (ctx) => v.start(ctx),
    audio: { out: () => v.out() },
    param: (name) => v.get(name),
    /** A patch link names a wave; the wave param takes its index. */
    patch(name) { const i = WAVES.indexOf(String(name).toLowerCase()); if (i >= 0) v.set('wave', i); },
    heard: () => notes,
    stop: () => v.panic(),
    close: () => v.close(),
  };
}
