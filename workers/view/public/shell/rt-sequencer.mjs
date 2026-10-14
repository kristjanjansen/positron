// demo/shell/rt-sequencer.mjs: a `sequencer` node on /connect/ with /drums/machine/'s face (rt-drums.mjs).
// Every step leaves on sequencer:midi-out; a pattern on sequencer:value-in sets the grid.
// why: lessons/kit-rt-sequencer.md#header

import { machineFor } from './rt-drums.mjs';

export async function make({ bay, send, wake, log }) {
  let sent = 0, patterns = 0;
  const m = await machineFor(bay, { wake, log, sequence: (ev) => { sent++; send('midi-out', ev); } });
  const face = document.createElement('div');
  face.className = 'cn-panel';
  face.append(m.surface);
  // Play on the bar is the first press that needs sound; the machine makes no context of its own.
  face.addEventListener('pointerdown', () => wake(), { capture: true });
  return {
    face, slot: 'panel', machine: m.api,
    deliver: {
      'value-in': (e) => {
        if (e?.of !== 'pattern' || !Array.isArray(e.rows)) return;
        patterns++;
        const g = m.api.grid, rows = m.api.VOICES.length, steps = m.api.shape().steps;
        for (let r = 0; r < rows; r++) for (let s = 0; s < steps; s++) g.set(r, s, !!e.rows[r]?.[s], 'quiet');
      },
    },
    heard: () => sent,
    patterns: () => patterns,
    stop() { m.api.stop(); },
    close() {
      m.api.stop();
      m.hook.sequence = () => {};
      face.remove();
    },
  };
}
