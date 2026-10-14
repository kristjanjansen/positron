// demo/shell/midi.mjs: a real keyboard, where there is one, calling the same two functions
// as the on-screen keys. A note-on at velocity 0 is a note-off. No Web MIDI (Safari) is
// said once and is not a fault.
// why: lessons/kit-midi.md#header

import { DESK } from './instruments.mjs';

/**
 * Is this port the Evolution: the pattern is read from instruments.mjs and typed nowhere
 * else. CoreMIDI names it by model, MK-425C, not by brand.
 * why: lessons/kit-midi.md#evolution
 */
export const EVOLUTION = DESK.find((e) => e.maker === 'Evolution');
/** @param {string} name  a MIDI port name, possibly empty */
export const isEvolution = (name) => EVOLUTION.match.test(name || '');
/** @param {string[]} names  every input port name, as `createMidi` hands them over */
export const evolutionIn = (names = []) => names.some(isEvolution);

/**
 * Offer a keyboard's Loop while the Evolution is plugged in, withdraw it when it goes.
 * Logs only on a change; a check drives it with a made up list of names.
 * @param keys   a `createKeyboard` built with `loop` on
 * @param names  input port names
 * @param log    `d.log`, or nothing
 * @returns {boolean} whether `Loop` is in the row now
 * why: lessons/kit-midi.md#offer-loop-for
 */
export function offerLoopFor(keys, names = [], log = null) {
  const had = keys.loopOffered();
  const now = keys.offerLoop(evolutionIn(names));
  if (now !== had) {
    log?.(now
      ? 'the Evolution is here, so Loop is back in the keyboard’s footer'
      : 'the Evolution has gone, so Loop has left the footer and anything '
        + 'it was playing has stopped. The takes are still on their slots');
  }
  return now;
}

/** the input names off a `MIDIAccess`, for a page that opened MIDI itself */
export const inputNames = (access) =>
  [...(access?.inputs?.values?.() ?? [])].map((p) => p.name || '');

/**
 * The check every keyboard page makes about Loop, written once: five claims, the second
 * a negative control. heard is counted by the page past its own handler; the row is put
 * back as the ports really are. timed: false skips the two claims that cost about 1 s.
 * @returns {Promise<void>}
 * why: lessons/kit-midi.md#check-evolution-loop
 */
export async function checkEvolutionLoop(d, { keys, ports, heard, real = () => [], key = null, timed = true }) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const inRow = () => keys.loopOffered()
    && !!keys.el.querySelector('.kpad-grp-end')?.contains(keys.loop.el);
  /* the leftmost key, found by its note rather than by a letter a page may not bind */
  const k = key ?? keys.keyOf(keys.base);
  ports([]);
  const none = inRow();
  ports(['Circuit', 'Fast Track Pro']);
  const others = inRow();
  d.assert('with no Evolution plugged in the keyboard offers no Loop',
    keys.loop !== null && none === false,
    `no ports: Loop ${none ? 'in' : 'out of'} the row`);
  d.assert('NEGATIVE CONTROL: a Circuit and a Fast Track Pro do not bring Loop',
    others === false, `ports Circuit and Fast Track Pro: Loop ${others ? 'in' : 'out of'} the row`);
  ports(['MK-425C USB MIDI Keyboard']);
  const evo = inRow();
  d.assert('an Evolution port brings Loop into the keyboard’s footer',
    evo === true, `port "MK-425C USB MIDI Keyboard": Loop ${evo ? 'in' : 'out of'} the row`);
  if (!timed) { ports(real()); return; }

  /* A take of two presses of one key, closed, then a lap and a margin. The lap
     floor is 250 ms, so 350 ms is a whole turn. */
  keys.loops.clear(0); keys.loops.forget();
  keys.loop.el.click(); keys.loops.settle(0);
  keys.press(k, 'pointer'); await wait(40); keys.release(k, 'pointer');
  await wait(60);
  keys.press(k, 'pointer'); await wait(40); keys.release(k, 'pointer');
  keys.loop.el.click(); keys.loops.settle(0);
  const h0 = heard();
  await wait(350);
  const h1 = heard();
  const going = keys.loops.state(0);
  d.assert('a loop played on the on-screen keys comes back round through this page’s own note path',
    going === 'looping' && h1 - h0 >= 1,
    `${keys.taped(0)} movement(s) taped, state ${going}, and ${h1 - h0} note(s) reached `
    + 'the page’s sound path in the lap after the take closed');

  ports(['Circuit']);
  const gone = { inRow: inRow(), state: keys.loops.state(0), taped: keys.taped(0) };
  const h2 = heard();
  await wait(350);
  const h3 = heard();
  d.assert('the Evolution going takes Loop away, stops the loop and keeps its take',
    gone.inRow === false && gone.state === 'stopped' && gone.taped > 0 && h3 === h2,
    `Loop ${gone.inRow ? 'in' : 'out of'} the row, slot ${gone.state} with ${gone.taped} `
    + `movement(s) kept, and ${h3 - h2} note(s) sounded in the lap after`);
  keys.loops.clear(0); keys.loops.forget();
  ports(real());
}

/**
 * @param {object} o
 * @param {(note:number, vel:number, ch:number, at:number)=>void} o.onDown
 *   `at` is the MIDI message's own `DOMHighResTimeStamp`, not this handler's.
 * @param {(note:number, ch:number, at:number)=>void} o.onUp
 * @param {(cc:number, value:number, ch:number, at:number)=>void} [o.onControl]
 * @param {(line:string, kind?:string)=>void} [o.log]
 * @param {(n:number, names:string[])=>void} [o.onPorts]  called with the input
 *   count and the port names, on every change. Matching a name is the page's job.
 * @returns {{ports:()=>number, names:()=>string[], state:()=>string, close:()=>void}}
 * why: lessons/kit-midi.md#create-midi
 */
export function createMidi({
  onDown, onUp, onControl, onProgram, log = () => {}, onPorts = () => {},
  /**
   * Every message before dispatch, a diagnostic and not a route: unhandled kinds otherwise
   * look exactly like an unplugged cable.
   * why: lessons/kit-midi.md#on-any
   */
  onAny = null,
  /**
   * A keyboard whose Loop follows the Evolution, via offerLoopFor on every port change.
   * Build it with loop: 'evolution' too, so Loop starts withdrawn.
   * why: lessons/kit-midi.md#loop-option
   */
  loop: loopKeys = null,
} = {}) {
  const ported = (n, list) => {
    onPorts(n, list);
    if (loopKeys) offerLoopFor(loopKeys, list, log);
  };
  let ports = 0, state = 'asking', access = null;
  /** the input port names, rebuilt on every change, so a page can say which device */
  const names = [];

  const wire = (port) => {
    port.onmidimessage = (e) => {
      const [st, a, b] = e.data;
      const kind = st & 0xf0, ch = st & 0x0f;
      onAny?.(e.data, ch, e.timeStamp);
      // The message's own timeStamp (performance.now clock), not the handler's, which a busy
      // thread delays. Keyboard scanning and USB delay are invisible to any browser API.
      // why: lessons/kit-midi.md#timestamp
      if (kind === 0x90 && b > 0) onDown?.(a, b, ch, e.timeStamp);
      else if (kind === 0x80 || (kind === 0x90 && b === 0)) onUp?.(a, ch, e.timeStamp);
      else if (kind === 0xb0) onControl?.(a, b, ch, e.timeStamp);
      // Program change is two bytes, so it has its own line. The MK-425C number pad sends
      // a bank select pair and then a program change.
      // why: lessons/kit-midi.md#program-change
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
    ported(ports, [...names]);
  };

  (async () => {
    if (!navigator.requestMIDIAccess) {
      state = 'unsupported';
      ported(0, []);
      log('this browser has no MIDI, but the keys on screen still play', 'warn');
      return;
    }
    try {
      access = await navigator.requestMIDIAccess({ sysex: false });
      recount();
      // Plugging a keyboard in after the page loaded is the ordinary case, not
      // an edge one — a page that only looks once is a page you have to reload.
      access.onstatechange = recount;
      // Shared by every page that opens MIDI, so the wording is decided here, as cells not glue.
      // why: lessons/kit-midi.md#ports-log
      log(ports ? `${ports} MIDI input${ports === 1 ? '' : 's'}. Play one.`
                : 'no MIDI keyboard plugged in; the keys on screen still play');
    } catch (e) {
      state = 'refused';
      ported(0, []);
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
