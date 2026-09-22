// demo/shell/pedal.mjs. The sustain pedal, and what a key release means.
//
// Lifted out of `demo/muta/index.html`, which grew it on 2026-09-22 in answer
// to *"how can i get long sustaned notes, drony ones? i do have sustain pedal
// but"*. Half of a keyboard is under the player's foot and none of it was
// reaching any instrument on this site.
//
// 🔴 A SUSTAIN PEDAL IS THE ABSENCE OF THE DAMPER, NOT THE PRESENCE OF A
// SUSTAIN. `rig/board/synth.mjs` already wrote the sentence this module is
// built on: *"A struck piano has no sustain to release, but it does have a
// damper."* Nothing here adds anything to a note. What it does is decide
// WHETHER AND HOW FAST the note is taken away, which is why the page is handed
// a `release` and never a `hold`.
//
// ── THE FOUR THINGS A FIRST IMPLEMENTATION GETS WRONG ───────────────────────
//
// 🔴 1. TWO SETS, NOT ONE. What is under a finger and what is only under the
// foot are different questions, and one set cannot answer both. A key pressed
// AGAIN while the pedal is down leaves the pedal with nothing to release later,
// so lifting the pedal cannot steal a note somebody is still holding.
//
// 🔴 2. THE THRESHOLD IS 64, NOT 127, AND IT READS AS A TYPO BECAUSE THE
// CONTROLLER NUMBER IS ALSO 64. 📄 DOCUMENTED at midi.org, fetched 2026-09-22:
// controller 64 is `Damper Pedal on/off (Sustain)`, *"≤63 off, ≥64 on"*, and
// controllers 65 to 69 share the threshold. A test for `=== 127` works on a
// cheap switch pedal and fails on an expensive one.
//
// 🔴 3. IT ACTS ONLY ON A CHANGE. A pedal held down repeats its value, and a
// page that released every held note on each repeat would stutter under a foot
// that is not moving.
//
// 🔴 4. SWITCHING THE KEYBOARD OFF FORGETS THE FOOT. A pedal left down across a
// switch off would hold the next session's first note for ever, and nothing on
// screen would say why.
//
// ── THREE THINGS THAT ARE ABOUT THIS DESK ───────────────────────────────────
//
// 🔴 WHICH CONTROLLER THE PEDAL IN THIS BUILDING SENDS IS UNVERIFIED, WHICH IS
// WHY `cc` IS AN OPTION. `research/evo-mk425c-face-2026-09-21.md` records the
// rear panel printing `SUSTAIN - C21`, and the manual quoted in
// `plans/plan-fasttrack-mk425c.md` §4.5 says the footswitch is *"fully MIDI
// assignable"*. So 64 is the DEFAULT and not a measurement. `demo/evo/`,
// `demo/circuit/` and `demo/twelve/` all draw `demo/shell/midi-log.mjs` with
// the raw bytes in a column, and four seconds in front of any of them settles
// it.
//
// 🔴 AND ITS POLARITY IS SENSED AT POWER UP, WHICH IS WHY `raw()` EXISTS.
// 📄 DOCUMENTED, the MK-425C manual verbatim: *"On power up, the sustain pedal
// is assumed to be in the OFF position. So, if you want the sustain pedal to be
// off when it is unpressed, make sure the pedal is unpressed when you power
// up."* A pedal held down while the keyboard boots is inverted for the whole
// session. **A page cannot tell an inverted pedal from a pedal somebody is
// holding and must not pretend to.** What it can do is print the raw value
// beside the reading, so `64 = 127, pedal down` is visible to a player whose
// foot is nowhere near it.
//
// ⚠️ SOSTENUTO (66) AND UNA CORDA (67) ARE REFUSED, NOT FORGOTTEN. The middle
// pedal is a third set and about fifteen lines, and nothing on this desk sends
// it. The left pedal shifts the action so the hammer strikes fewer strings,
// which changes timbre and not just volume: there is no cheap version, and the
// version that turns the volume down is a lie. `plans/plan-nola.md` §5.2.

/** Controller 64. 📄 midi.org: `Damper Pedal on/off (Sustain)`. */
export const SUSTAIN_CC = 64;

/** 📄 midi.org, for controllers 64 to 69: 63 or less is off, 64 or more is on. */
export const PEDAL_ON = 64;

/**
 * 🔴 0.12 s, TAKEN FROM `rig/board/synth.mjs` RATHER THAN INVENTED HERE.
 * A real damper takes 50 to 150 ms to silence a string and longer in the bass,
 * so a note-off is a ramp and not a `stop()`. That file picked this number for
 * the same reason and there is no argument for a second one.
 */
export const DAMP_MIN = 0.12;

/**
 * ⚠️ 0.9 s IS A GUESS AND IS MARKED AS ONE. It is what a damper riding just
 * clear of the strings ought to cost, and NOTHING ON THIS DESK CAN GRADE IT: a
 * switch pedal only ever sends 0 and 127, so the whole range between them is
 * unreachable here. `plans/plan-nola.md` §7 lists the listening test.
 */
export const DAMP_MAX = 0.9;

/**
 * How long a note takes to die, at a given pedal value.
 *
 * 🔴 HALF PEDALLING IS A CONTINUOUS QUANTITY, AND THE BOOLEAN ABOVE THROWS IT
 * AWAY. A continuous pedal sends the whole 0 to 127 range on controller 64: the
 * damper rides just clear of the strings and SHORTENS the decay rather than
 * stopping it. Above the threshold the note is held and this never runs; below
 * it, the value still says how firmly the damper landed.
 */
export function damperSec(value) {
  const v = Math.max(0, Math.min(127, Math.round(Number(value) || 0)));
  return DAMP_MIN + (DAMP_MAX - DAMP_MIN) * (v / 127);
}

/**
 * 🔴 ONE WORDING FOR BOTH PAGES, FOR THE REASON `looper.mjs` KEEPS `LOOP_SAYS`.
 * A sentence copied into two pages is a sentence that will be improved in one
 * of them. ⚠️ And nothing here carries an em dash or a middot: every string a
 * visitor reads goes through a page's log, and `demo/shell/pedal-test.mjs`
 * checks these rather than trusting a sweep.
 */
export const PEDAL_SAYS = {
  down: 'the sustain pedal is down, so notes hold after the key comes up',
  up: 'the sustain pedal is up',
  /** @param {number} n how many notes the foot let go of */
  freed: (n) => `the sustain pedal is up, and let go of ${n} note${n === 1 ? '' : 's'}`,
  /** 🔴 THE INVERTED PEDAL, SAID IN THE ONE PLACE A PAGE CAN HONESTLY SAY IT. */
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
 */
export function createPedal({ cc = SUSTAIN_CC, flip = false, release = () => {},
                              onPedal = () => {} } = {}) {
  /* WHAT IS UNDER A FINGER, AND WHAT IS ONLY UNDER THE FOOT. */
  const keysDown = new Set(), pedalHolds = new Set();
  let down = false, raw = 0, moves = 0, betweener = false, seen = false;

  /**
   * 🔴 THE CORRECTED VALUE, AND `raw` IS DELIBERATELY NOT CORRECTED WITH IT.
   * MEASURED on the keyboard in this building 2026-09-23: two press and release
   * gestures in front of `/evo/` both arrived as `B1 40 00` followed 0.40 s
   * later by `B1 40 7F`, which reads as pressing sending **0** and releasing
   * sending **127**, the opposite way round from the specification. The manual
   * says why: the polarity is sensed at power up, so a pedal held down, or a
   * normally closed one, is inverted for the whole session.
   * ⚠️ AND THE FIX ON THE INSTRUMENT IS BETTER THAN THE FIX HERE. Power the
   * keyboard up with the pedal unpressed and it corrects itself. This exists
   * because the property expires at the next power cycle and nobody should have
   * to restart an instrument to play a page.
   * ⚠️ `raw()` STAYS THE WIRE VALUE, which is the whole reason it exists: a page
   * printing `64 is 0, so the pedal reads down` is showing a reader the
   * correction happening. Printing the corrected number would hide the one fact
   * the cell was added to carry.
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
     * A key came up. Returns true if the note was really taken away, false if
     * the foot kept it.
     *
     * 🔴 A NOTE NOBODY WAS HOLDING IS RELEASED ANYWAY AND IS NEVER TAKEN BY THE
     * PEDAL. Releasing one costs nothing and can never hang; HOLDING one
     * invents a note that lifting the pedal would then stop, on a page where
     * nobody played it. Note offs with no matching note on are ordinary: a
     * panic, an engine that silenced its own voices, a keyboard replugged
     * mid-chord. This is the half of the asymmetry that matters, because a stuck
     * note is the worst failure a MIDI page has, and a spurious release is not
     * a failure at all.
     */
    keyUp(note) {
      const was = keysDown.delete(note);
      /* 🔴 AND A SECOND NOTE OFF FOR A NOTE THE FOOT ALREADY HAS RELEASES IT
         TWICE, WHICH IS WHY `was` IS NOT THE WHOLE TEST. A keyboard sending two
         releases for one key is ordinary (a note on at velocity 0 followed by a
         real 0x80 is the commonest shape of it), and reading only `was` sends
         the second one straight past the pedal to the instrument: the note
         stops under a foot that is still down, and the lift releases it again
         afterwards. FOUND BY SABOTAGE, not by reading. */
      if (down && (was || pedalHolds.has(note))) { pedalHolds.add(note); return false; }
      release(note, damperSec(reading()));
      return true;
    },

    /**
     * A controller arrived. Returns true if the foot actually moved.
     *
     * ⚠️ IT READS EVERY VALUE AND ACTS ON THE CHANGES. The raw value is kept
     * whatever it is, because `raw()` is what makes an inverted pedal visible
     * and a pedal that repeats 127 is still reporting where it is.
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
      /* 🔴 EVERYTHING THE FOOT HOLDS, AND THE FILTER THAT USED TO BE HERE WAS
         DEAD CODE. `/muta/` wrote `if (!keysDown.has(n))` on this line, which
         is the two-set rule stated a second time, and the two sets are DISJOINT
         by construction, because `keyDown` takes a note off the foot the moment
         a finger is back on it. So that test could never be false.
         ⚠️ IT WAS FOUND BY SABOTAGE AND WOULD NOT HAVE BEEN FOUND BY READING.
         Removing the filter left the whole test file green, which is this
         project's own signal that a guard is not reachable: LESSONS' dead CSS
         rule and dead `fullSupport()` branch are the same shape. Two guards on
         one rule, only one of them reachable, and the unreachable one reads as
         correct for ever. The rule is enforced in ONE place now, at `keyDown`,
         and test 5 in `pedal-test.mjs` goes red when that place is broken. */
      const freed = [...pedalHolds];
      pedalHolds.clear();
      const sec = damperSec(reading());
      for (const note of freed) release(note, sec);
      onPedal(false, value, freed.length);
      return true;
    },

    /**
     * The foot moved, said by a control on the page rather than by a wire.
     *
     * 🔴 THIS EXISTS BECAUSE `flip` CORRECTED THE PAGE'S OWN SWITCH TOO, AND
     * THAT WAS A CONTROL THAT LIED. A SUSTAIN switch on a page is not the
     * instrument: it is somebody saying `the dampers are up`, and running that
     * through `control()` meant the correction for a backwards KEYBOARD also
     * reversed a button nobody had mis-wired. MEASURED under `?flip=1`, which
     * took four asserts red and would have shipped a switch that turned sustain
     * off.
     * ⚠️ `raw` IS STILL SET, to the byte a pedal in this state WOULD have sent
     * on this instrument. A page printing the raw value beside the reading has
     * to have something to print, and a stale number from the last real message
     * would be worse than none.
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
     * The byte a pedal in this state would put on the wire HERE, flip included.
     *
     * ⚠️ IT IS FOR A CHECK, and it exists so the arithmetic has one home. A
     * page's own check drives `control()` because that is the only part of the
     * real MIDI path a harness can reach, and hard coding 127 there makes every
     * pedal assert wrong the moment somebody opens the page upside down.
     */
    wire: (nowDown) => (flip ? (nowDown ? 0 : 127) : (nowDown ? 127 : 0)),

    /**
     * Forget everything, foot included. For a page switching its keyboard off.
     * It releases NOTHING: a page doing this is already sending its own
     * all-notes-off, and a second one down a path this module cannot see is how
     * a panic ends up being sent twice.
     */
    panic() {
      const held = pedalHolds.size + keysDown.size;
      keysDown.clear();
      pedalHolds.clear();
      down = false;
      /* 🔴 THE BYTE THAT MEANS UP HERE, NOT THE NUMBER 0, AND THIS LINE SAID 0
         UNTIL 2026-09-23. On a pedal read upside down, 0 IS the foot going
         down, so a panic left `down` false beside a raw value meaning down, and
         the damper time is read off the raw value: every release after a panic
         took 0.9 s instead of 0.12. MEASURED as one red assert on `/nola/`
         under `?flip=1`, on a page where nothing else was wrong.
         ⚠️ THE SHAPE IS THE LESSON. A reset that writes a LITERAL into a field
         whose meaning depends on a setting is a reset that is only correct at
         the default. */
      raw = api.wire(false);
      return held;
    },

    /**
     * Forget what is down, and keep the foot where it is.
     *
     * ⚠️ THIS IS NOT `panic()` WITH LESS IN IT. `/muta/` needs it because its
     * engine silences every level-patched voice when a drone starts, so notes
     * the page still thinks are down no longer exist and a pedal lifting later
     * would send note offs for notes nobody is holding. The foot has not moved,
     * so clearing `down` would be a second lie on top of the first.
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
