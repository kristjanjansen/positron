// demo/shell/rt-drum.mjs: the runtime of a `drum` node on /connect/
// (node-runtime.mjs): /drums/machine/'s four SuperCollider voices (kick,
// snare, open and closed hat, General MIDI notes 36, 38, 46, 42 on any
// channel), played by what arrives on drum:midi-in and heard on drum:audio-out.
// No face of its own; the engine boots on the page's first sound press.

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
