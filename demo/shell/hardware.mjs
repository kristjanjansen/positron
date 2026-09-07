// demo/shell/hardware.mjs — the ONE way a demo asks for real hardware.
//
// Sound and MIDI are the two things on this site a page cannot simply have:
// both need a user gesture (iOS grants audio only inside one, and Chrome
// prompts for MIDI), both can be absent, refused, or present-but-empty, and
// both were being hand-rolled per page with a different answer each time.
//
//   const hw = createHardware(d, { onAudio, onMidi });
//
// Rules it enforces so no page has to remember them:
//   · ONE gesture buys both. Two buttons means two gestures and a page that
//     works differently depending on which you pressed.
//   · NEVER AWAIT `ctx.resume()`. It does not reject when refused — it simply
//     never settles, so anything after it never runs. Two demos lost a session
//     to this.
//   · REPORT THE CAPABILITY, NOT THE ERROR. "no such API", "you said no" and
//     "granted, nothing plugged in" are three different answers, and collapsing
//     them into one error string is how this project once published a false
//     claim about iOS. Each gets its own words.
//   · A device list is a CHOICE, not a guess. If there is more than one output
//     the page offers them; it defaults to the first and says which.
//   · `onMidi(port, access)` hands over the whole access object, not just the
//     chosen output. A loopback port (macOS IAC) returns everything sent to it
//     on the matching INPUT, which is the only way to measure what the output
//     lane actually did without external hardware.

import { el } from './shell.mjs';

export function createHardware(d, {
  label = 'Enable sound & MIDI', onAudio, onMidi, onMidiIn,
} = {}) {
  const btn = el('button', 'd-pri', label, { type: 'button' });
  // TWO pickers, each labelled in the UI with its direction. MIDI in and MIDI
  // out are different devices doing different jobs — one is told when to act,
  // the other reports when something happened — and a control called just
  // "MIDI" cannot say which one you are choosing.
  const outPick = el('select', 'd-hw-pick', null, { 'aria-label': 'MIDI output device' });
  const inPick = el('select', 'd-hw-pick', null, { 'aria-label': 'MIDI input device' });
  const outTag = el('span', 'd-hw-tag', 'out');
  const inTag = el('span', 'd-hw-tag', 'in');
  for (const e of [outPick, inPick, outTag, inTag]) e.hidden = true;
  // ALL THREE LIVE IN `.d-controls`. Two reasons, and both were learned the
  // hard way in one sitting: verify.mjs presses every button in that row and
  // nothing else, so a control mounted anywhere else is one the suite cannot
  // reach — it read as "page asserted nothing" and looked like a broken demo.
  // And a device picker that sits BELOW the thing it configures reads as
  // output rather than as a control; it belongs beside the button that turned
  // the device on.
  const row = document.querySelector('.d-controls') || d.el;
  row.append(btn, outTag, outPick, inTag, inPick);

  const state = {
    audio: 'off', midi: 'off', midiIn: 'off',
    ctx: null, port: null, ports: [], inPort: null, inPorts: [], access: null,
  };
  let enabled = false;

  // ONE PLACE SAYS WHAT MIDI IS DOING, and it is the picker itself. A separate
  // status line repeated what the picker and the readout already showed, and a
  // second copy of a fact is a second thing that can be stale. Anything that is
  // not a device — unsupported, refused, none plugged in — becomes the picker's
  // only (disabled) option, so the control is always the answer.
  function only(sel, tag, text) {
    sel.replaceChildren(el('option', '', text, { value: '' }));
    sel.hidden = false; tag.hidden = false; sel.disabled = true;
  }

  /** One picker, one direction. `ports()` is re-read on every device change. */
  function wire(sel, tag, ports, onPick, none) {
    const refresh = () => {
      const list = ports();
      sel.replaceChildren();
      sel.hidden = false; tag.hidden = false;
      if (!list.length) { only(sel, tag, none); return null; }
      sel.disabled = false;
      for (const p of list) sel.append(el('option', '', p.name, { value: p.id }));
      return list;
    };
    sel.addEventListener('change', () => {
      const p = ports().find((x) => x.id === sel.value);
      if (p) onPick(p);
    });
    return refresh;
  }

  btn.addEventListener('click', () => {
    if (enabled) return;
    enabled = true;
    btn.disabled = true;
    btn.textContent = 'Enabled';

    // --- audio, synchronously inside the gesture ---------------------------
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      ctx.resume();                       // fire and move on; see the header
      state.ctx = ctx;
      state.audio = ctx.state;
      onAudio?.(ctx);
      // resume() settles later than this handler, so report the state again
      ctx.onstatechange = () => { state.audio = ctx.state; };
    } catch (e) {
      state.audio = `refused: ${e.name}`;
      d.log(`sound refused: ${e.name}`, 'bad');
    }

    // --- midi, on the same gesture, never awaited by anything above --------
    if (!navigator.requestMIDIAccess) {
      state.midi = state.midiIn = 'unsupported';
      only(outPick, outTag, 'MIDI unsupported');
      return;
    }
    state.midi = state.midiIn = 'asking';
    only(outPick, outTag, 'looking…'); only(inPick, inTag, 'looking…');
    navigator.requestMIDIAccess({ sysex: false }).then((access) => {
      state.access = access;   // onMidi gets it too: inputs are how a loopback is measured
      // The picker appears as soon as access is granted, even with nothing
      // plugged in — an empty list saying "no MIDI device" tells you the page
      // looked and found none, where a hidden control is indistinguishable
      // from a page that never asked. It also has somewhere to put a device
      // when you plug one in, which `onstatechange` will do live.
      const refreshOut = wire(outPick, outTag, () => [...access.outputs.values()],
        (p) => { state.port = p; state.midi = p.name.slice(0, 24); onMidi?.(p, access); },
        'no MIDI output device');
      const refreshIn = wire(inPick, inTag, () => [...access.inputs.values()],
        (p) => { state.inPort = p; state.midiIn = p.name.slice(0, 24); onMidiIn?.(p, access); },
        'no MIDI input device');
      const all = () => {
        const outs = refreshOut();
        if (outs && (!state.port || !outs.some((p) => p.id === state.port.id))) {
          state.port = outs[0]; state.midi = outs[0].name.slice(0, 24);
          outPick.value = outs[0].id; onMidi?.(outs[0], access);
        }
        const ins = refreshIn();
        if (ins && (!state.inPort || !ins.some((p) => p.id === state.inPort.id))) {
          state.inPort = ins[0]; state.midiIn = ins[0].name.slice(0, 24);
          inPick.value = ins[0].id; onMidiIn?.(ins[0], access);
        }
        state.ports = [...access.outputs.values()];
        state.inPorts = [...access.inputs.values()];
      };
      access.onstatechange = all;
      all();
    }).catch((e) => {
      state.midi = state.midiIn = `refused: ${e.name}`;
      only(outPick, outTag, `MIDI refused: ${e.name}`);
    });
  });

  return { el: row, state, button: btn, outPick, inPick };
}
