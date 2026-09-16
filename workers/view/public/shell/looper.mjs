// demo/shell/looper.mjs — the looper, for every page that keeps seconds of sound.
//
// 🔴 IT WAS `/radio/`'S AND IS NOW EVERY PAGE'S, ASKED FOR IN THOSE WORDS:
// *"make it use same looping ui as radio (make it global)"*. What was on that
// page was a vocabulary of ways to play a kept lap, a button glued to LOOP that
// cycles → ← ⇆, a ring that keeps the sound, and one voice that reads the lap
// under whichever way is showing. None of that is about radio. Two pages had a
// LOOP button and only one of them could turn a loop round, which is the shape
// this repo already paid for three times: a control that exists in one page and
// nowhere else is a component that has not been noticed yet.
//
// The split, which is the whole of why this is a module and not a copy:
//
//   THIS FILE owns what a loop IS. The ring, the kept buffer, the mirrored
//   copy, the voice, the lap, where the sound has got to, the button's face.
//   THE PAGE owns what else happens on its own graph: which node stops being
//   heard while a loop plays, what the log calls the thing it is looping, and
//   what its picture does.
//
// ⚠️ TWO PAGES REACH `keep()` AND `close()` AT DIFFERENT MOMENTS, AND BOTH ARE
// RIGHT. On a live station the sound the loop will play HAS NOT ARRIVED YET, so
// the first press opens a window and the second closes it: `keep` on the bar's
// `fill`, `close` on its `set`. On a tape both marks are behind you and the bar
// loops the file itself, so the first lap comes off the tape while the ring
// fills: `keep` on `set`, `close` on the first `wrap`. From there the two pages
// are the same instrument.
//
// ⚠️ NEGATIVE PLAYBACK RATES DO NOT EXIST. `AudioBufferSourceNode.playbackRate`
// will not go below zero in any shipping engine, so backwards is a MIRRORED
// COPY of the samples and pingpong is the two joined end to end. That is the
// reason this module has to hold the audio at all: a page cannot play a media
// element backwards, and a kept lap it can.
//
// The arithmetic is separated from the wiring on purpose: `ringOrder`,
// `planVoice` and `headOf` are pure and are graded by `looper-test.mjs`, with
// no browser and no audio hardware. Every bug this module has ever had was in
// one of those three (a ring copied from the wrong index sounds like an edit
// nobody made; a pingpong head that was a ramp sat at the right edge for the
// whole return half).

/**
 * 🔴 THE WAYS, AND THE ORDER OF THIS TABLE IS LOAD-BEARING. Every check in
 * `/radio/` drives a way BY NUMBER, so `pingpong` is fifth rather than third:
 * renumbering them would make four asserts grade a different way than their own
 * labels claim. Each is a different MECHANISM rather than a different number of
 * one, which is the rule the twelve sounds were rebuilt under.
 *
 *   round  the kept seconds as they arrived        the default
 *   back   the same samples, mirrored              a direction
 *   half   the same lap, twice as long             a speed
 *   chop   a sixteenth of the lap, repeating       a length
 *   pingpong  forwards then backwards, seamless    a direction
 */
export const LOOP_WAYS = [
  ['round', 'round'], ['back', 'back'], ['half', 'half'], ['chop', 'chop'],
  ['pingpong', 'pingpong'],
];

/**
 * 🔴 THE THREE THE BUTTON CYCLES, IN THE ORDER IT CYCLES THEM. Directions, and
 * only directions: `half` is what a rate row beside it is for and `chop` is a
 * length with no control today. Both are still reachable and both are still
 * driven by the checks, which is a loose end written down rather than left to
 * be found.
 */
export const LOOP_TURN = [0, 1, 4];

/**
 * The face of the button for each way. ⚠️ A GLYPH IS THE STATE, NOT THE NEXT
 * PRESS, which is the opposite of what LOOP's own word does. The difference is
 * that LOOP has three states with two names and this has three states with
 * three faces: showing the next one would mean the button never says which way
 * the loop you are listening to is running.
 */
export const WAY_GLYPH = { round: '→', back: '←', pingpong: '⇆', half: '→', chop: '→' };
export const WAY_SAYS = {
  round: 'playing forwards. press for backwards',
  back: 'playing backwards. press for there and back',
  pingpong: 'playing there and back. press for forwards',
  half: 'playing forwards, at half speed',
  chop: 'repeating one slice',
};
export const LOOP_SAYS = {
  round: 'the kept seconds, round, the way they arrived',
  back: 'the kept seconds backwards',
  half: 'half speed, so it comes round twice as slowly and an octave down',
  chop: 'one slice of the loop, repeating',
  pingpong: 'the kept seconds forwards, then the same samples backwards, without a seam',
};

// A slice is a sixteenth of the lap, floored at a length that is still a rhythm
// rather than a pitch: a sixteenth of a hand-closed 0.6 s window is 37 ms, which
// repeats at 27 Hz, which is a buzz and not a stutter.
export const CHOP_DIV = 16;
export const CHOP_MIN_S = 0.12;

// 12 ms either way rather than a step. A gain cut mid-sample is a click, and a
// click every time a loop opens or closes is the page making the noise.
const CUT = 0.012;

const clamp01 = (f) => Math.min(1, Math.max(0, f));

/**
 * Where the oldest kept sample sits in the ring.
 *
 * ⚠️ NOT ZERO ONCE IT HAS WRAPPED. The ring's write head is the oldest sample
 * the moment it is full, so copying from index 0 plays the seconds in two
 * pieces with the join in the middle, which sounds like an edit nobody made.
 */
export function ringOrder({ filled, len, w }) {
  return filled >= len ? ((w % len) + len) % len : 0;
}

/**
 * What one voice reads, for a way and a place to pick it up.
 *
 * `unit` is one pass of the KEPT seconds, which is what a picture of the loop is
 * as wide as. `whole` is the buffer this way actually reads, which is twice
 * `unit` under pingpong. `fromFrac` is a fraction of the PICTURE, so a press
 * does not throw you back to the top of the loop.
 *
 * 🔴 `null` MEANS THE TOP OF THE LOOP AND IT IS NOT THE SAME AS `0`. Zero is the
 * left edge of the picture, and under `back` the top of the loop is the RIGHT
 * edge: the mirrored buffer's first sample is the kept seconds' last one. A new
 * loop opening backwards at picture 0 mirrors to an offset of the buffer's whole
 * duration, where there is nothing left to read.
 */
export function planVoice({ way, unit, fromFrac = null, rate = 1 }) {
  const back = way === 'back';
  const ping = way === 'pingpong';
  const whole = ping ? unit * 2 : unit;
  const lap = way === 'chop'
    ? Math.min(whole, Math.max(CHOP_MIN_S, whole / CHOP_DIV))
    : whole;
  const cont = Number.isFinite(fromFrac);
  const f = cont ? clamp01(fromFrac) : 0;
  // Where that fraction of the PICTURE sits in the buffer this voice reads.
  // ⚠️ AGAINST `unit`, NEVER `whole`: under pingpong the buffer is twice the
  // picture, and against `whole` a press at the middle of the wave would pick
  // the sound up at the turn.
  const here = cont ? (back ? 1 - f : f) * unit : 0;
  const from = way === 'chop' ? Math.min(Math.max(0, here), Math.max(0, whole - lap)) : 0;
  return {
    back, ping, whole, unit,
    lapFrom: from,
    lapTo: from + lap,
    // 🔴 WHERE IT ACTUALLY STARTS READING, AND IT WAS ALWAYS THE TOP ONCE.
    // `loopStart`/`loopEnd` bound the lap; the second argument to `start()` is
    // where inside it to begin, and they are different numbers. Only `chop` was
    // getting this, so pressing ← jumped the sound to the far end of the picture.
    begin: way === 'chop' ? from : here,
    rate: (way === 'half' ? 0.5 : 1) * rate,
  };
}

/**
 * Where the SOUND is, as a fraction of the kept seconds a picture draws.
 *
 * From the voice's own clock rather than from a deck's, because a deck's
 * fraction is only the same thing until a loop can run backwards, at half
 * speed, or a slice at a time. ⚠️ MIRRORED UNDER `back`: sample `i` of the
 * reversed buffer is sample `n - 1 - i` of what the picture shows.
 *
 * 🔴 PINGPONG IS A TRIANGLE AND IT WAS A RAMP THAT STUCK. The voice reads one
 * buffer of `2 x unit`, so divided by `unit` and clamped the line crossed the
 * picture over the first half and then sat at the right edge for the whole
 * return, which is the half a reader is listening for.
 */
export function headOf({ back, ping, unit, lapFrom, lapTo, off, rate, elapsed }) {
  const lap = lapTo - lapFrom;
  if (!(lap > 0) || !(unit > 0)) return null;
  const into = Math.max(0, elapsed) * rate;
  // ⚠️ FROM WHERE THE VOICE WAS TOLD TO BEGIN, not from the top of its lap. A
  // way change picks the sound up where it already was, so a head computed from
  // `lapFrom` alone runs a whole lap out of step with what you hear.
  const at = lapFrom + (((off - lapFrom) + into) % lap);
  const f = ping ? (at <= unit ? at : 2 * unit - at)
    : back ? unit - at
    : at;
  return clamp01(f / unit);
}

/**
 * The looper itself.
 *
 *   seconds   how long the ring holds, which is the longest loop this page can
 *             promise. A button promising more than the page can deliver is a
 *             control that lies at the moment it is used.
 *   log       `(text, kind)`, the page's own logger.
 *   onWay     `(wayName, lapSeconds)` after a way change that moved the sound,
 *             for a page with something to retune to the lap.
 *
 * 🔴 IT IS BUILT WITHOUT AN `AudioContext` AND GIVEN ONE LATER, WHICH IS NOT
 * FUSSINESS. Every page here builds its graph on the first press, because an
 * `AudioContext` made at load is a suspended context on a real browser, and the
 * transport bar is built long before that: the bar needs `wayExtra()` at
 * construction and the ring needs a sample rate. Splitting the two is what lets
 * one object own both ends. Before `attach()` every audio verb is a no-op, which
 * is right: there is no sound yet to loop.
 */
export function createLooper({ seconds = 20, channels = 2, log = () => {},
  onWay = null } = {}) {
  let ctx = null, ring = null, loopOut = null, tapNode = null;
  let buf = null, mirrored = null, joined = null, src = null;
  let way = 0, rate = 1;
  // The voice's own clock: when it started, the slice it laps over, where in
  // that slice it was told to begin, its rate, and which buffer it is reading.
  let at = 0, lapFrom = 0, lapTo = 0, off = 0, voiceRate = 1, back = false, ping = false;
  let bar = null;

  /** The same seconds, backwards. See the note at the head of this file. */
  function reversedCopy(b) {
    const o = ctx.createBuffer(b.numberOfChannels, b.length, b.sampleRate);
    for (let c = 0; c < b.numberOfChannels; c++) {
      const s = b.getChannelData(c), d = o.getChannelData(c);
      for (let i = 0, n = b.length; i < n; i++) d[i] = s[n - 1 - i];
    }
    return o;
  }

  /** Two buffers end to end, for pingpong. */
  function joinedCopy(a, b) {
    const o = ctx.createBuffer(a.numberOfChannels, a.length + b.length, a.sampleRate);
    for (let c = 0; c < a.numberOfChannels; c++) {
      const d = o.getChannelData(c);
      d.set(a.getChannelData(c), 0);
      d.set(b.getChannelData(c), a.length);
    }
    return o;
  }

  /**
   * Start, or restart, the one voice that plays the kept seconds.
   *
   * ⚠️ A DIP, NOT A CUT. A buffer source cannot change its buffer or its loop
   * points cleanly while it runs, so a way change is a new voice, and swapping
   * one mid-sample is a click every time somebody presses a button. The first
   * voice of a loop needs none of that: `loopOut` is still at zero and the
   * caller ramps it up straight afterwards.
   */
  function startVoice(fromFrac) {
    if (!ctx || !buf) return;
    const name = LOOP_WAYS[way][1];
    const plan = planVoice({ way: name, unit: buf.duration, fromFrac, rate });
    if ((plan.back || plan.ping) && !mirrored) mirrored = reversedCopy(buf);
    /**
     * 🔴 PINGPONG IS ONE BUFFER, NOT TWO VOICES TAKING TURNS. Alternating two
     * sources on a timer puts a gap or an overlap at every turn, and at these
     * lap lengths that is a click twice a lap. Forwards followed by the same
     * samples backwards is a single buffer whose end already matches its start,
     * so `loop: true` joins it to itself with nothing to hear, and the join in
     * the middle is seamless by construction: the last sample forwards IS the
     * first sample backwards.
     */
    if (plan.ping && !joined) joined = joinedCopy(buf, mirrored);
    const reading = plan.ping ? joined : plan.back ? mirrored : buf;
    const swap = !!src;
    const now = ctx.currentTime;
    const when = swap ? now + CUT : now;

    const v = ctx.createBufferSource();
    v.buffer = reading;
    v.loop = true;
    v.loopStart = plan.lapFrom;
    v.loopEnd = plan.lapTo;
    v.playbackRate.value = plan.rate;
    v.connect(loopOut);
    if (swap) {
      const g = loopOut.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0, when);
      g.linearRampToValueAtTime(1, when + CUT);
    }
    v.start(when, plan.begin);
    // ⚠️ THE OLD ONE STOPS AT THE INSTANT THE NEW ONE STARTS, SCHEDULED RATHER
    // THAN TIMED. A `setTimeout` stop leaves both voices in `loopOut` for as
    // long as the timer is late, which is two copies of the loop at different
    // phases: the thing that sounds like a broken instrument.
    const dying = src;
    if (dying) { try { dying.stop(when); } catch { /* already done */ } }
    src = v;
    at = when; lapFrom = plan.lapFrom; lapTo = plan.lapTo; off = plan.begin;
    voiceRate = plan.rate; back = plan.back; ping = plan.ping;
  }

  /** The button's face, written HERE and nowhere else, so a way reached from
   *  the code and a way reached by pressing cannot disagree about what shows. */
  function paintWay() {
    const b = bar?.loopExtra?.('way');
    if (!b) return;
    const w = LOOP_WAYS[way][1];
    b.textContent = WAY_GLYPH[w];
    b.title = b.disabled ? b.title : WAY_SAYS[w];
    b.setAttribute('aria-label', `${LOOP_SAYS[w]}. press to change which way it plays`);
  }

  const api = {
    /**
     * Give it the graph.
     *
     *   tap   the node whose output is kept. Upstream of any fader, so a loop is
     *         the material rather than a recording of where a blend happened to
     *         be standing.
     *   out   where the kept seconds are played back into. Downstream of it
     *         everything gets the loop for free: a granulator chews it, an
     *         analyser measures it, a meter reads what actually left.
     */
    attach(context, { tap, out }) {
      if (ctx) return api;
      ctx = context;
      const len = Math.max(1, Math.round(seconds * ctx.sampleRate));
      ring = {
        len,
        ch: Array.from({ length: channels }, () => new Float32Array(len)),
        w: 0, filled: 0, on: false,
      };
      /**
       * ⚠️ A SCRIPT PROCESSOR AS A TAP, deliberately rather than lazily. It is
       * deprecated and it runs on the main thread, which is the objection; what
       * it does here is copy two blocks into a typed array and return, and a
       * worklet would be a second file and a module load for that. It is wired
       * to a SILENT sink so it is pulled without reaching the speakers: a node
       * that is not connected to the destination is not scheduled at all, which
       * is the trap that makes a tap look like it is working and record nothing.
       */
      tapNode = ctx.createScriptProcessor(4096, channels, channels);
      tapNode.onaudioprocess = (e) => {
        if (!ring.on) return;
        const n = e.inputBuffer.length;
        for (let c = 0; c < channels; c++) {
          const s = e.inputBuffer.getChannelData(Math.min(c, e.inputBuffer.numberOfChannels - 1));
          const dst = ring.ch[c];
          let w = ring.w;
          for (let i = 0; i < n; i++) { dst[w] = s[i]; w = w + 1 === ring.len ? 0 : w + 1; }
          if (c === channels - 1) ring.w = w;
        }
        ring.filled = Math.min(ring.len, ring.filled + n);
      };
      const tapSink = ctx.createGain();
      tapSink.gain.value = 0;
      tap.connect(tapNode);
      tapNode.connect(tapSink);
      tapSink.connect(ctx.destination);
      // Where a finished loop is played back. Its own gain, so a page can take
      // its live path down and bring it back without touching any fader.
      loopOut = ctx.createGain();
      loopOut.gain.value = 0;
      loopOut.connect(out);
      return api;
    },
    attached: () => !!ctx,
    /** The gain the kept seconds come out of, for a page that needs to meter it. */
    node: () => loopOut,
    /** Samples in the ring right now, and whether it has been round. */
    caught: () => ring?.filled ?? 0,
    full: () => !!ring && ring.filled >= ring.len,
    seconds,
    buffer: () => buf,
    /** What the voice is actually reading, which is the mirror under `back`.
     *  A check can compare it with `buffer()` sample by sample. */
    voiceBuffer: () => (src ? src.buffer : null),
    /**
     * 🔴 THE NODE THE SOUND ACTUALLY COMES OUT OF, published for a check.
     * Which buffer it holds, how long its lap is and what rate it runs at are
     * three facts about the audio graph rather than three variables a page set,
     * and a check that reads the second kind passes over a row wired to nothing
     * at all.
     */
    voice: () => src,
    /** The mirrored copy, once something has needed one. "Reversed" is the one
     *  claim a buffer identity cannot make, so a check compares the samples. */
    mirror: () => mirrored,
    playing: () => !!src,
    lapSeconds: () => lapTo - lapFrom,

    /** Start keeping. The ring is emptied, so a loop is never half of an older one. */
    keep() {
      if (!ring) return;
      ring.w = 0; ring.filled = 0; ring.on = true;
    },

    /**
     * Stop keeping, make a buffer of it and start the voice.
     * Returns the seconds kept, or 0 when there was nothing to keep.
     */
    close() {
      if (!ctx || !ring) return 0;
      ring.on = false;
      const n = ring.filled;
      // A window that caught nothing is not a loop. It happens when nothing was
      // actually playing at the press, and saying so is better than looping
      // silence and letting somebody wonder.
      // 🔴 SILENTLY, ON INSTRUCTION 2026-09-16: *"rm all loop messages."*. It
      // said `nothing was playing, so there is nothing to loop`, which is true
      // and is a sentence about a loop. The caller gets 0 and the button goes
      // back to `off`, which is the same fact in the two channels that already
      // carry it.
      if (n < ctx.sampleRate * 0.25) return 0;
      const b = ctx.createBuffer(channels, n, ctx.sampleRate);
      const start = ringOrder(ring);
      for (let c = 0; c < channels; c++) {
        const dst = b.getChannelData(c), s = ring.ch[c];
        for (let i = 0; i < n; i++) dst[i] = s[(start + i) % ring.len];
      }
      // ⚠️ THE SECONDS ARE KEPT AND THE VOICE THAT PLAYS THEM IS A SEPARATE
      // THING. This is the material; the way decides which part of it a voice
      // reads, and a way change rebuilds the voice without touching it.
      buf = b; mirrored = null; joined = null;
      // 🔴 IT OPENS THE WAY THE BUTTON IS SHOWING, rather than resetting to
      // `round`. The button is on the bar with no loop running, so a direction
      // can be chosen BEFORE pressing LOOP, and a control reading ← over a
      // sound running forwards is the page lying about itself. The normalising
      // happens in `stop()`, where the button is the only thing left to be true
      // to.
      startVoice(null);
      loopOut.gain.setTargetAtTime(1, ctx.currentTime, 0.005);
      return n / ctx.sampleRate;
    },

    /** Take the loop off: fade out, drop the voice, drop the material. */
    stop() {
      if (ring) ring.on = false;
      if (!ctx) return;
      loopOut.gain.setTargetAtTime(0, ctx.currentTime, 0.005);
      // Stopped a beat after the fade, or the tail is cut off by its own stop.
      const dying = src; src = null;
      if (dying) setTimeout(() => { try { dying.stop(); } catch { /* already done */ } }, 120);
      buf = null; mirrored = null; joined = null;
      // ⚠️ THE DIRECTION SURVIVES THE LOOP AND ONLY A WAY WITH NO FACE IS PUT
      // BACK. Somebody who chose ← meant ←, and taking it away the moment a loop
      // ends makes the choice something that has to be re-made every time.
      // `half` and `chop` have no face on the bar, so leaving the button showing
      // → over a loop that would come back chopped is the one case where keeping
      // it would be the lie.
      if (!LOOP_TURN.includes(way)) api.setWay(0, { quiet: true });
    },

    /** 0..1 through the kept seconds, or null when no voice is running. */
    headFrac() {
      if (!src || !buf) return null;
      return headOf({ back, ping, unit: buf.duration, lapFrom, lapTo, off,
                      rate: voiceRate, elapsed: ctx.currentTime - at });
    },

    rate: () => rate,
    setRate(r) {
      rate = r;
      // `half` still halves it from the code, so the row and the way multiply
      // rather than fight.
      if (src) src.playbackRate.value = (LOOP_WAYS[way][1] === 'half' ? 0.5 : 1) * r;
    },

    way: () => way,
    wayName: () => LOOP_WAYS[way][1],
    setWay(i, { quiet = false } = {}) {
      const n = Math.max(0, Math.min(LOOP_WAYS.length - 1, i | 0));
      const changed = n !== way;
      way = n;
      paintWay();
      // Nothing changed, or there is nothing to play it on yet. Either way the
      // button now says what the next loop will do and no voice is disturbed.
      if (!changed || !src || !buf) return;
      const name = LOOP_WAYS[n][1];
      startVoice(api.headFrac());     // pick the sound up where it already is
      const lap = lapTo - lapFrom;
      onWay?.(name, lap);
      // The button's own face says which way the next lap runs, and the sound
      // says it louder than any line of prose could. See above.

    },
    /** One press of the button glued to LOOP: → then ← then ⇆ then → again.
     *  ⚠️ A WAY THAT IS NOT IN `LOOP_TURN` LANDS ON THE FIRST: pressing after
     *  `half` or `chop` is a reader asking for a direction, and the honest
     *  answer is the first direction rather than an index arithmetic accident. */
    cycle() {
      const i = LOOP_TURN.indexOf(way);
      api.setWay(LOOP_TURN[(i + 1) % LOOP_TURN.length]);
    },

    /**
     * The entry for `createTransportBar`'s `loopExtras`, so a page declares the
     * button by handing over this and nothing else.
     *
     * ⚠️ `always: true` KEEPS IT ON THE BAR WITH NO LOOP RUNNING, and it is not
     * an inert control: it changes what the NEXT press of LOOP does.
     */
    wayExtra() {
      return {
        id: 'way', label: WAY_GLYPH[LOOP_WAYS[way][1]], always: true,
        aria: 'which way the loop plays',
        title: WAY_SAYS[LOOP_WAYS[way][1]],
        onPress: () => api.cycle(),
      };
    },
    /** Hand over the bar so the face can be written. Call it straight after
     *  `createTransportBar`, which is the first moment the button exists. */
    bind(b) { bar = b; paintWay(); return api; },

    /**
     * 🔴 A LOOP LONGER THAN THE RING CANNOT BE TURNED ROUND, AND THE BUTTON HAS
     * TO SAY SO RATHER THAN SIT THERE. A page that marks its loop on a file can
     * mark one of any length; this holds `seconds` of it. Greying the button
     * with the reason on it is what `caps.mjs` does for a demo this browser
     * cannot run, and for the same reason: a control that looks live and does
     * nothing is worse than one that says why it cannot.
     */
    sayTooLong(why) {
      const b = bar?.loopExtra?.('way');
      if (!b) return;
      b.disabled = !!why;
      b.title = why || WAY_SAYS[LOOP_WAYS[way][1]];
    },
  };
  return api;
}
