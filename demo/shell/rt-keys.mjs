// demo/shell/rt-keys.mjs: the runtime of a `keys` node on /connect/
// (node-runtime.mjs). Its face is the kit keyboard, C3 to A4 as on
// /synth/keyboard/; what it plays leaves on keys:midi-out, what arrives on
// keys:midi-in lights a key.
//
// The first press on it starts the page's sound (plans/plan-connect-ui.md D4).
// `pointerdown` is listened for as well as `onDown`, because the keyboard
// decides a press two frames later and a context made there is outside the gesture.

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
