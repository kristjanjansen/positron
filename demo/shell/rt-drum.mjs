// demo/shell/rt-drum.mjs: the runtime of a drum node on /connect/: /drums/machine/'s four voices
// (GM notes 36, 38, 46, 42), from drum:midi-in to drum:audio-out. No face; boots on the first sound press.
// why: lessons/kit-rt-drum.md#header

import { machineFor } from './rt-drums.mjs';

export async function make({ bay, wake, log, reroute }) {
  let notes = 0;
  const m = await machineFor(bay, { wake, log });
  return {
    machine: m.api,
    deliver: {
      'midi-in': (e) => { if (e?.cls === 'note' && e.d2 > 0) { notes++; m.api.play(e); } },
    },
    start() { m.api.boot().then(() => reroute(), () => {}); },
    audio: { out: () => m.api.mixOut() },
    heard: () => notes,
    level: () => m.api.level(),
    close() { try { m.api.mixOut()?.disconnect(); } catch { /* not connected */ } },
  };
}
