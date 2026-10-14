// demo/shell/pedal.mjs: the sustain pedal, which decides whether and how fast a note is
// taken away (a release, never a hold). Two sets, threshold 64 not 127, act only on a change,
// switching off forgets the foot. cc is an option and flip exists: polarity is sensed at power up.
// why: lessons/kit-pedal.md#header

/** Controller 64. 📄 midi.org: `Damper Pedal on/off (Sustain)`. */
export const SUSTAIN_CC = 64;

/** 📄 midi.org, for controllers 64 to 69: 63 or less is off, 64 or more is on. */
export const PEDAL_ON = 64;

/**
 * 0.12 s, the same as rig/board/synth.mjs: a real damper takes 50 to 150 ms.
 * why: lessons/kit-pedal.md#damp-min
 */
export const DAMP_MIN = 0.12;

/**
 * 0.9 s is a guess: a switch pedal only sends 0 and 127, so nothing here can grade it.
 * why: lessons/kit-pedal.md#damp-max
 */
export const DAMP_MAX = 0.9;

/**
 * How long a note takes to die at a given pedal value; a continuous pedal's half pedalling
 * shortens the decay below the threshold.
 * why: lessons/kit-pedal.md#damper-sec
 */
export function damperSec(value) {
  const v = Math.max(0, Math.min(127, Math.round(Number(value) || 0)));
  return DAMP_MIN + (DAMP_MAX - DAMP_MIN) * (v / 127);
}

/**
 * One wording for every page; pedal-test.mjs checks it for em dashes and middots.
 * why: lessons/kit-pedal.md#pedal-says
 */
export const PEDAL_SAYS = {
  down: 'the sustain pedal is down, so notes hold after the key comes up',
  up: 'the sustain pedal is up',
  /** @param {number} n how many notes the foot let go of */
  freed: (n) => `the sustain pedal is up, and let go of ${n} note${n === 1 ? '' : 's'}`,
  /**
   * The inverted pedal, said as the raw value beside the reading.
   * why: lessons/kit-pedal.md#says-raw
   */
  raw: (cc, value, down) => `controller ${cc} is ${value}, so the pedal reads ${down ? 'down' : 'up'}`,
  switchy: 'this pedal sends only 0 and 127, so it is a switch and half pedalling cannot show',
  continuous: 'this pedal sends values in between, so half pedalling shortens the decay',
};

/**
 * @param {object} o
 * @param {number} [o.cc] which controller the pedal sends. 64 is the default and
 *   is NOT a measurement of the pedal in this building. See the header.
 * @param {(note:number, sec:number)=>void} o.release  take this note away, over
 *   `sec` seconds. A page owns what that means on its own graph; this module
 *   owns whether and when.
 * @param {boolean} [o.flip] read the controller upside down, for a pedal whose
 *   polarity was sensed wrong at power up. See the header.
 * @param {(down:boolean, value:number, freed:number)=>void} [o.onPedal] the foot
 *   moved. Called only on a CHANGE, never on a repeat.
 * @returns {{keyDown, keyUp, control, panic, forgetKeys, down, raw, held,
 *            fingers, damper, switchy, moves, cc}}
 * why: lessons/kit-pedal.md#create-pedal
 */
export function createPedal({ cc = SUSTAIN_CC, flip = false, release = () => {},
                              onPedal = () => {} } = {}) {
  // What is under a finger, and what is only under the foot.
  // why: lessons/kit-pedal.md#two-sets
  const keysDown = new Set(), pedalHolds = new Set();
  let down = false, raw = 0, moves = 0, betweener = false, seen = false;

  /**
   * The corrected value; raw() stays the wire value so the correction stays visible.
   * The keyboard here sent 0 on press and 127 on release; powering it up unpressed fixes it.
   * why: lessons/kit-pedal.md#reading
   */
  const reading = () => (flip ? 127 - raw : raw);

  const api = {
    cc,

    /** A key went down, by any route. Idempotent: pressing a sounding key again
     *  is a real thing a player does, and it takes the note back off the foot. */
    keyDown(note) {
      keysDown.add(note);
      pedalHolds.delete(note);
    },

    /**
     * A key came up; true if the note was taken away, false if the foot kept it.
     * A note nobody held is released anyway and never held: a spurious release is harmless,
     * a stuck note is not.
     * why: lessons/kit-pedal.md#key-up
     */
    keyUp(note) {
      const was = keysDown.delete(note);
      // A second note off for a note the foot already has stays with the foot, not only `was`.
      // why: lessons/kit-pedal.md#double-off
      if (down && (was || pedalHolds.has(note))) { pedalHolds.add(note); return false; }
      release(note, damperSec(reading()));
      return true;
    },

    /**
     * A controller arrived; true if the foot moved. Every value updates raw, only changes act.
     * why: lessons/kit-pedal.md#control
     */
    control(n, value) {
      if (n !== cc) return false;
      raw = value;
      seen = true;
      // Anything that is not an endpoint proves the pedal is continuous, which
      // is the only way a page can honestly claim half pedalling is reachable.
      if (value !== 0 && value !== 127) betweener = true;
      const nowDown = reading() >= PEDAL_ON;
      if (nowDown === down) return false;
      down = nowDown;
      moves++;
      if (down) { onPedal(true, value, 0); return true; }
      // Everything the foot holds. The sets are disjoint, enforced once in keyDown.
      // why: lessons/kit-pedal.md#freed
      const freed = [...pedalHolds];
      pedalHolds.clear();
      const sec = damperSec(reading());
      for (const note of freed) release(note, sec);
      onPedal(false, value, freed.length);
      return true;
    },

    /**
     * The foot moved, said by a page control: not run through flip, which corrects only a wire.
     * raw is set to the byte this instrument would have sent.
     * why: lessons/kit-pedal.md#set
     */
    set(nowDown) {
      raw = api.wire(nowDown);
      seen = true;
      if (nowDown === down) return false;
      down = nowDown;
      moves++;
      if (down) { onPedal(true, raw, 0); return true; }
      const freed = [...pedalHolds];
      pedalHolds.clear();
      const sec = damperSec(reading());
      for (const note of freed) release(note, sec);
      onPedal(false, raw, freed.length);
      return true;
    },

    /**
     * The byte a pedal in this state would send here, flip included, for a check driving control().
     * why: lessons/kit-pedal.md#wire
     */
    wire: (nowDown) => (flip ? (nowDown ? 0 : 127) : (nowDown ? 127 : 0)),

    /**
     * Forget everything, foot included, releasing nothing: the page sends its own all-notes-off.
     * why: lessons/kit-pedal.md#panic
     */
    panic() {
      const held = pedalHolds.size + keysDown.size;
      keysDown.clear();
      pedalHolds.clear();
      down = false;
      // The byte that means up here, not 0: on a flipped pedal 0 is down.
      // why: lessons/kit-pedal.md#panic-raw
      raw = api.wire(false);
      return held;
    },

    /**
     * Forget what is down and keep the foot where it is, for an engine that silenced its voices.
     * why: lessons/kit-pedal.md#forget-keys
     */
    forgetKeys() {
      keysDown.clear();
      pedalHolds.clear();
    },

    /** Is the damper off the strings. */
    down: () => down,
    /** The last value this controller sent, whatever it was. The inverted-pedal
     *  tell: a page prints this beside `down` and a player can see it lying. */
    raw: () => raw,
    /** How many notes the foot is holding, which is the number nobody can see. */
    held: () => pedalHolds.size,
    /** How many keys are under a finger. */
    fingers: () => keysDown.size,
    /** How long a release takes right now, in seconds. */
    damper: () => damperSec(reading()),
    /** Is this pedal being read upside down. */
    flipped: () => flip,
    /** `true` once a value other than 0 or 127 has arrived. `null` until any
     *  value has, because "we have not looked" must not read as "it is a
     *  switch". That is `caps.mjs`'s `unknown` rule, one module along. */
    switchy: () => (seen ? !betweener : null),
    /** How many times the foot has changed state. */
    moves: () => moves,
  };
  return api;
}
