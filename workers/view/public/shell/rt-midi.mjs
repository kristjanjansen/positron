// demo/shell/rt-midi.mjs: the runtime of a `midi` node on /connect/
// (node-runtime.mjs): every MIDI keyboard plugged into this machine, through the
// kit's midi-devices.mjs, as the one `web:midi` box. Its face is a button that
// asks the browser for MIDI, and the names of what is plugged in.
//
// 🔴 THE PERMISSION IS ASKED ONLY ON A PERSON'S PRESS OF THAT BUTTON, never on a
// link or a visit. midi-devices.mjs keeps its device nodes on a bay of this
// runtime's own, so the inputs it finds are not new boxes on the page; their
// notes leave on web:midi:midi-out.

import { createBay } from './bay.mjs';
import { createMidiDevices } from './midi-devices.mjs';
import { createButtonGroup } from './button-group.mjs';

export function make({ send, wake, log }) {
  let sent = 0, asked = 0, closed = false;
  const own = createBay();
  const status = document.createElement('p');
  status.className = 'cn-face-say';
  status.textContent = 'no MIDI keyboard asked for yet';
  const devices = createMidiDevices({
    bay: own, site: 'web', to: [], log,
    message: (e, { hold }) => {
      if (closed) return;   // the inputs keep their listeners; a closed box says nothing
      const [b0, d1, d2 = 0] = e.data;
      const st = b0 & 0xf0, ch = (b0 & 0x0f) + 1;
      if (st !== 0x90 && st !== 0x80) return;
      const on = st === 0x90 && d2 > 0;
      hold(d1, on);
      sent++;
      send('midi-out', { cls: 'note', ch, d1, d2: on ? d2 : 0 });
    },
    // An unplugged keyboard lets go of what it held, on the page's own port.
    onRelease: (n) => { if (closed) return; sent++; send('midi-out', { cls: 'note', ch: 1, d1: n, d2: 0 }); },
    onChange: () => say(),
  });
  function say() {
    const names = [...devices.plugged].map((id) => own.node(id)?.label || id);
    status.textContent = names.length ? `playing from ${names.join(', ')}` : 'MIDI is on, nothing is plugged in';
  }
  const buttons = createButtonGroup({ buttons: [{ id: 'ask', label: 'Use a MIDI keyboard', onPress: () => ask() }] });
  async function ask() {
    wake();
    asked++;
    const access = await devices.ask();
    if (!access) { status.textContent = 'this browser gave no MIDI, or it was refused'; return null; }
    buttons.enable('ask', false, 'MIDI is on');
    return access;
  }
  const face = document.createElement('div');
  face.className = 'cn-panel';
  face.append(buttons.el, status);
  return {
    face, slot: 'panel',
    /** A MIDIAccess handed in rather than asked for: a check's fake, never the browser's prompt. */
    attach(access) { devices.attach(access); buttons.enable('ask', false, 'MIDI is on'); },
    asked: () => asked,
    plugged: () => devices.plugged.size,
    heard: () => sent,
    close() { closed = true; face.remove(); },
  };
}
