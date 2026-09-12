// demo/shell/midi.mjs — a real keyboard, where there is one.
//
// ⚠️ ONE PATH, NOT A SECOND ONE. A note number is a note number, and what
// crosses the relay cannot tell a piano from a tapped screen — which is the
// point `demo/instrument` already makes in its own words. So MIDI lights the
// same keys and calls the same two functions the on-screen keyboard calls,
// rather than growing a route of its own that then has to be kept in step.
//
// 🔴 A NOTE-ON AT VELOCITY 0 IS A NOTE-OFF. Most keyboards send it that way and
// many never send 0x80 at all, so treating every 0x90 as "on" leaves every note
// hanging — and on this project's pages the hanging note is on an instrument in
// another building. This is the single most common way a first MIDI
// implementation is wrong.
//
// ⚠️ AND A BROWSER WITHOUT WEB MIDI IS NOT A FAULT. Safari has none at all. The
// page says so once and carries on with the keys it drew itself, because a demo
// that reports a missing optional capability as an error teaches its reader that
// red means nothing.

/**
 * @param {object} o
 * @param {(note:number, vel:number)=>void} o.onDown
 * @param {(note:number)=>void} o.onUp
 * @param {(cc:number, value:number, ch:number)=>void} [o.onControl]
 * @param {(line:string, kind?:string)=>void} [o.log]
 * @param {(n:number)=>void} [o.onPorts]  called with the input count, on every change
 * @returns {{ports:()=>number, state:()=>string, close:()=>void}}
 */
export function createMidi({ onDown, onUp, onControl, log = () => {}, onPorts = () => {} } = {}) {
  let ports = 0, state = 'asking', access = null;

  const wire = (port) => {
    port.onmidimessage = (e) => {
      const [st, a, b] = e.data;
      const kind = st & 0xf0, ch = st & 0x0f;
      if (kind === 0x90 && b > 0) onDown?.(a, b, ch);
      else if (kind === 0x80 || (kind === 0x90 && b === 0)) onUp?.(a, ch);
      else if (kind === 0xb0) onControl?.(a, b, ch);
    };
  };

  const recount = () => {
    ports = 0;
    for (const p of access.inputs.values()) { wire(p); ports++; }
    state = ports ? 'connected' : 'none plugged in';
    onPorts(ports);
  };

  (async () => {
    if (!navigator.requestMIDIAccess) {
      state = 'unsupported';
      onPorts(0);
      log('this browser has no MIDI — the keys on screen still play', 'warn');
      return;
    }
    try {
      access = await navigator.requestMIDIAccess({ sysex: false });
      recount();
      // Plugging a keyboard in after the page loaded is the ordinary case, not
      // an edge one — a page that only looks once is a page you have to reload.
      access.onstatechange = recount;
      log(ports ? `${ports} MIDI input${ports === 1 ? '' : 's'} — play it`
                : 'no MIDI keyboard plugged in; the keys on screen still play');
    } catch (e) {
      state = 'refused';
      onPorts(0);
      log(`MIDI was refused — ${e.message}`, 'warn');
    }
  })();

  return {
    ports: () => ports,
    state: () => state,
    close: () => {
      if (!access) return;
      for (const p of access.inputs.values()) p.onmidimessage = null;
      access.onstatechange = null;
    },
  };
}
