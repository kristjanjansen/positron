// demo/shell/hardware.mjs: the one way a demo asks for sound and MIDI: `createHardware(d, { onAudio, onMidi })`.
// One gesture buys both; never await `ctx.resume()`, it may never settle; report the capability
// (no API, refused, none plugged in) in its own words; `onMidi` gets the whole access, for loopback.
// why: lessons/kit-hardware.md#header

import { el } from './shell.mjs';

export function createHardware(d, {
  label = 'Play with sound and MIDI', onAudio, onMidi, onMidiIn,
} = {}) {
  // The label says what the press gets. Nothing reads it back: callers hold `button`.
  // why: lessons/kit-hardware.md#label
  const btn = el('button', 'pos-pri', label, { type: 'button' });
  // Two pickers, each labelled with its direction: MIDI in and out are different devices.
  // why: lessons/kit-hardware.md#pickers
  const outPick = el('select', 'pos-hw-pick', null, { 'aria-label': 'MIDI output device' });
  const inPick = el('select', 'pos-hw-pick', null, { 'aria-label': 'MIDI input device' });
  const outTag = el('span', 'pos-hw-tag', 'out');
  const inTag = el('span', 'pos-hw-tag', 'in');
  for (const e of [outPick, inPick, outTag, inTag]) e.hidden = true;
  // All three live in `.pos-controls`: verify.mjs presses only that row, and a picker belongs
  // beside the button that turned the device on.
  // why: lessons/kit-hardware.md#controls-row
  const row = document.querySelector('.pos-controls') || d.el;
  row.append(btn, outTag, outPick, inTag, inPick);

  const state = {
    audio: 'off', midi: 'off', midiIn: 'off',
    ctx: null, port: null, ports: [], inPort: null, inPorts: [], access: null,
  };
  let enabled = false;

  // The picker is the one place that says what MIDI is doing; a non-device state is its only option.
  // why: lessons/kit-hardware.md#only
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
    btn.textContent = 'Sound and MIDI on';

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
      // The picker appears once access is granted, even empty: it shows the page looked and found none.
      // why: lessons/kit-hardware.md#refreshout
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
