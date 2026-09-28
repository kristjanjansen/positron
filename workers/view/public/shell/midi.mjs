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
 * @param {(note:number, vel:number, ch:number, at:number)=>void} o.onDown
 *   `at` is the MIDI message's own `DOMHighResTimeStamp`, not this handler's.
 * @param {(note:number, ch:number, at:number)=>void} o.onUp
 * @param {(cc:number, value:number, ch:number, at:number)=>void} [o.onControl]
 * @param {(line:string, kind?:string)=>void} [o.log]
 * @param {(n:number, names:string[])=>void} [o.onPorts]  called with the input
 *   count and the port NAMES, on every change.
 *   🔴 THE NAMES ARE THE SECOND ARGUMENT SINCE 2026-09-28, AND A COUNT COULD
 *   NOT HAVE ANSWERED THE QUESTION THAT NEEDED THEM. `/nola/` shows its `Loop`
 *   control only while the Evolution is plugged in (*"rm loop button when
 *   evolution keyboad is not connected"*), and *something is plugged in* and
 *   *that keyboard is plugged in* are different facts. A page that wants to
 *   know which device this is has to be told which device this is.
 *   ⚠️ IT IS AN ADDED ARGUMENT AND NOT A CHANGED ONE, so every caller written
 *   before it reads exactly what it read. A new property that silently switches
 *   a page's behaviour is the shape of loss `positron-verify` records as 27
 *   asserts becoming 17, every one of them green.
 *   ⚠️ AND THE MATCHING IS THE PAGE'S. This file does not know what an Evolution
 *   is, which is the same division it already keeps about what a note means.
 * @returns {{ports:()=>number, names:()=>string[], state:()=>string, close:()=>void}}
 */
export function createMidi({
  onDown, onUp, onControl, onProgram, log = () => {}, onPorts = () => {},
  /**
   * 🔴 EVERY MESSAGE, BEFORE ANYTHING IS DECIDED ABOUT IT, AND IT EXISTS BECAUSE
   * SILENCE IS THE ONE ANSWER THIS FILE COULD NOT GIVE. Reported 2026-09-23:
   * *"there is no events when i press numpad"*. The dispatch below handles four
   * kinds and drops the rest on the floor with no log line, so a device sending
   * aftertouch, pitch bend, SysEx, a bank select this page ignores, or anything
   * on a channel nobody is reading looks EXACTLY like a cable that is not
   * plugged in. Those are opposite problems with one symptom.
   * ⚠️ IT IS A DIAGNOSTIC AND NOT A ROUTE. Nothing should play notes from here:
   * it is for a page to say what arrived when what arrived was nothing it knows.
   */
  onAny = null,
} = {}) {
  let ports = 0, state = 'asking', access = null;
  /** the input port names, rebuilt on every change, so a page can say which device */
  const names = [];

  const wire = (port) => {
    port.onmidimessage = (e) => {
      const [st, a, b] = e.data;
      const kind = st & 0xf0, ch = st & 0x0f;
      onAny?.(e.data, ch, e.timeStamp);
      /* 🔴 THE TIMESTAMP IS THE MESSAGE'S, NOT THIS HANDLER'S, AND THEY ARE NOT
         THE SAME NUMBER. `e.timeStamp` is a `DOMHighResTimeStamp` on the same
         clock as `performance.now()`, taken when the browser received the
         message; a busy main thread can run this callback milliseconds later,
         and a page measuring press to sound from inside its own handler has
         already thrown that delay away. `/nola/` reports it, so it is passed.
         ⚠️ WHAT NEITHER OF THEM SEES is the keyboard's own scanning delay and
         the USB stack, which is everything between the felt of the key and the
         event. No browser API can measure it. */
      if (kind === 0x90 && b > 0) onDown?.(a, b, ch, e.timeStamp);
      else if (kind === 0x80 || (kind === 0x90 && b === 0)) onUp?.(a, ch, e.timeStamp);
      else if (kind === 0xb0) onControl?.(a, b, ch, e.timeStamp);
      /* 🔴 PROGRAM CHANGE IS TWO BYTES, NOT THREE, AND THAT IS WHY IT NEEDED ITS
         OWN LINE RATHER THAN FALLING OUT OF THE CONTROL ONE. `0xc0` carries a
         single data byte, so `b` is `undefined` and every handler above would
         have read a number that is not there.
         ⚠️ AND IT IS WHAT A NUMBER PAD SENDS. Added 2026-09-23 for *"control 1 2
         3 with evo 1 2 3 numpads"*: the MK-425C's ten assignable buttons send a
         bank select pair and then a program change, so a page listening only for
         notes and controllers hears a keypad as silence. */
      else if (kind === 0xc0) onProgram?.(a, ch, e.timeStamp);
    };
  };

  const recount = () => {
    ports = 0;
    names.length = 0;
    /* ⚠️ `name` CAN BE null ON A PORT, so the empty string stands in for it
       rather than a `null` a caller's regular expression would throw on. */
    for (const p of access.inputs.values()) { wire(p); names.push(p.name || ''); ports++; }
    state = ports ? 'connected' : 'none plugged in';
    onPorts(ports, [...names]);
  };

  (async () => {
    if (!navigator.requestMIDIAccess) {
      state = 'unsupported';
      onPorts(0, []);
      log('this browser has no MIDI, but the keys on screen still play', 'warn');
      return;
    }
    try {
      access = await navigator.requestMIDIAccess({ sysex: false });
      recount();
      // Plugging a keyboard in after the page loaded is the ordinary case, not
      // an edge one — a page that only looks once is a page you have to reload.
      access.onstatechange = recount;
      /* ⚠️ NO MIDDOT. This line joined the count and `play it` with one, which
         is two facts glued into a sentence, and it reaches every page that opens
         MIDI. The shared ones are decided once, which is here. */
      log(ports ? `${ports} MIDI input${ports === 1 ? '' : 's'}. Play one.`
                : 'no MIDI keyboard plugged in; the keys on screen still play');
    } catch (e) {
      state = 'refused';
      onPorts(0, []);
      log(`MIDI was refused: ${e.message}`, 'warn');
    }
  })();

  return {
    ports: () => ports,
    /** the input port names, copied, for a page asking which device is there */
    names: () => [...names],
    state: () => state,
    close: () => {
      if (!access) return;
      for (const p of access.inputs.values()) p.onmidimessage = null;
      access.onstatechange = null;
    },
  };
}
