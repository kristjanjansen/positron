// demo/shell/rt-keys.mjs: a `keys` node on /connect/ (node-runtime.mjs): the kit keyboard, C3 to A4; plays to
// keys:midi-out, lights keys from keys:midi-in. The first press starts the sound, on `pointerdown` too,
// because the keyboard decides a press two frames later, outside the gesture.
// why: lessons/kit-rt-keys.md#header

import { createKeyboard, keyRange } from './keyboard.mjs';

export function make({ send, wake }) {
  const host = document.createElement('div');
  let sent = 0;
  const note = (n, d2) => { sent++; send('midi-out', { cls: 'note', ch: 1, d1: n, d2 }); };
  const kb = createKeyboard(host, {
    ...keyRange(21), base: 48,
    onDown: (n, how) => { if (how === 'midi') return; wake(); note(n, 100); },
    onUp: (n, how) => { if (how === 'midi') return; note(n, 0); },
  });
  host.addEventListener('pointerdown', () => wake(), { capture: true });
  return {
    face: host, slot: 'keys', kb,
    deliver: { 'midi-in': (e) => { if (e?.cls === 'note') kb.lightNote(e.d1, !!e.d2); } },
    heard: () => sent,
    stop() { kb.panic?.(); },
    close() { kb.panic?.(); kb.destroy?.(); host.remove(); },
  };
}
