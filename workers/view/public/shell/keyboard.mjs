// demo/shell/keyboard.mjs — the ONE on-screen keyboard, and the pad under it.
//
// Extracted from `instrument`, which had the good one: black keys drawn as
// black keys, pointer capture so a held finger is a held note, and a separate
// colour for a note somebody ELSE played. `rig/m1` had grown eight
// equal grey buttons instead, and its mapping drifted diatonic because the
// picture could not show a sharp — the shape constrains the mapping, so the
// shape comes first.
//
// THE RULE THAT MATTERS: a key is lit by a NOTE, never by the press that caused
// it. Light it from the press and a note arriving over MIDI or from another
// player does not light, while a local press stays lit after its note stops.
// `press()` and `release()` therefore only report; `lightNote()` paints.
//
// ── THE PAD, and why it is part of the keyboard rather than part of a page ──
//
// Octave down, octave up, notes off. /keys/ declared these three as ordinary
// controls, which put them in the row at the TOP of the page — a hand's width
// away from the keys they act on, and after four other buttons that do
// something else entirely. They are not page controls: every one of them is
// about the keyboard and nothing else, and any page that draws a keyboard wants
// all three. So they are drawn with it, always, and a page gets them without
// asking. There is no option to turn the pad off: one keyboard that sometimes
// has an octave control is two components.
//
// ⚠️ NO OCTAVE NUMBER ON THE PAD, on purpose. Every key already prints its own
// note name (`C4`, `A#4`), and all of them move together when the octave does —
// so the octave is written across the keyboard in thirteen places. A
// fourteenth, in a different place, is a second copy that can disagree.
//
// 🔴 `verify.mjs` CANNOT PRESS THESE. It presses `.pos-controls button, .tbar-x`
// with `element.click()` and nothing else, and the pad is deliberately NOT in
// `.pos-controls` — that is the whole point of moving it. So a page that ships
// the pad and asserts nothing about it has three ungraded controls, which is
// how `mirror` lost two asserts while reading green. The effect is observable
// without a click and does not need one: `shiftOctave()` returns the new base,
// `base` reads it back, and every key's printed note name moves with it. A
// page in the suite should drive those from its own check — the same bargain
// `slider.mjs` makes with `set()`. (Today the two pages that draw a pad,
// `/keys/` and `/kit/`, are both `built: false` and the suite never opens
// either, so there is nothing for them to assert INTO; that is a gap in
// coverage, not a gap in this file.)
//
// ── A FINGER, 2026-09-17 ────────────────────────────────────────────────────
//
// This was a flat row of thirteen equal slivers that only a mouse could use.
// Four rounds of real phone reports later it is a piano that scrolls.
//
// 🔴 IT IS A PIANO NOW, NOT A CHROMATIC ROW. Eight white keys in a grid, five
// black ones RAISED over the boundaries between them, narrower and shorter and
// painted on top, which is the shape everybody already knows how to read. The
// black key's column is worked out from the map rather than hard-coded, so a
// caller that passes a different set of letters still gets a keyboard.
//   ⚠️ THE OVERLAP IS A HIT-TEST PROBLEM AND IT SOLVES ITSELF. A raised black
//   key covers the top corners of the two whites beside it, so a finger aiming
//   at C# lands on a point that is inside C and inside C# at once. The hit test
//   is `document.elementFromPoint`, which returns the TOPMOST element, and the
//   black keys are the topmost because they are painted last. Nothing had to be
//   written for it; what had to be written is the assert. MEASURED while trying
//   to break it: TWO things in `shell.css` deliver that priority and either one
//   alone is enough, so a single sabotage of either reads green. The assert has
//   to sample BOTH sides of a black key, because the white on its left is
//   covered by DOM order in every arrangement and only the right side depends
//   on the stacking at all.
//
// 🔴 A SWIPE SCROLLS THE ROW AND PLAYS NOTHING. A DRAG PLAYS ONLY ONCE A NOTE
// IS ALREADY SOUNDING. Instructed in those words: *"Drag to play happens when
// playing is there"*. One horizontal gesture across the keys has to mean two
// opposite things, and this is the rule that separates them. The numbers are
// `SWIPE_FRAMES` and `SWIPE_PX` below.
//
// 🔴 AND THE SCROLLING IS THE PLATFORM'S, NOT OURS. `touch-action: pan-x` on
// the row hands the gesture to the browser, which brings its own momentum and
// its own rubber-band at the ends for nothing. The edge-hold autoscroll that
// used to live here is GONE: it existed because `touch-action: none` meant a
// finger could not move the row at all, and a hand-rolled ramp beside a native
// scroller is two answers to one question.
//
// ── WHAT WAS HERE AND IS NOT ─────────────────────────────────────────────────
//
// 🔴 HOLD-TO-RETRIGGER IS REMOVED, ASKED FOR AND THEN UNASKED. *"Rm
// retriggering"*. The measurement it produced is worth more than the feature
// and is kept here because nothing else records it. MEASURED on the board in
// `studio-1` on 2026-09-17, one note, twice, amplitude envelope of a 3 s hold
// against the same note retriggered every 250 ms:
//   · It made NO audible pulse on either patch this project uses. Peak to dip
//     1.07 to 1.16, against a held note's own floor of 1.04 to 1.13. The two
//     ranges overlap, so there is no rhythm in it to hear.
//   · What it moved was the LEVEL, in opposite directions. `AddSynth Morph`
//     came out 1.7x LOUDER retriggered, because its release tail outlives a
//     250 ms period and the tails stack. `Analog Filter 1` came out 2.9x
//     QUIETER, because it takes about two seconds to swell and a repeat never
//     lets it get there.
//   · Neither patch is plucked, so the pizzicato case is UNVERIFIED and nothing
//     on that board can answer it.
// The one piece of machinery worth remembering: `press()` and `release()` are
// the single funnel every note goes through, by every route. That is where a
// recorder attaches, and it is why the hold could be added and removed in one
// place.

/**
 * 🔴 49 px, WHICH IS TWO THIRDS OF 74. Asked for in those words: *"Keys 2/3 on
 * wideneds"*. The history in one line, all MEASURED at 390 CSS px on
 * `/knobs/`: thirteen equal keys at **24.77 px**, then thirteen at 74, now
 * eight white keys at 49.
 * ⚠️ AND 44 px IS THE FLOOR THIS IS NOW CLOSE TO. Apple's minimum touch target
 * is 44 pt and Android's is 48 dp; 49 clears the first by 5 px and the second
 * by 1. There is no room left underneath it, so the next request to make the
 * keys smaller is a request to make them too small to hit, and that is worth
 * saying before it arrives rather than after.
 * ⚠️ IT IS A FLOOR, NOT A WIDTH, and it is UNCONDITIONAL now. It used to be
 * armed by a container query and `(pointer: coarse)` so that a desktop layout
 * could not move; with eight columns instead of thirteen a white key is wider
 * than 49 px in any container over about 413 px, so the floor only ever binds
 * on a narrow one and the two queries were inert. One rule, no breakpoint.
 */
export const KEY_MIN_PX = 49;

/**
 * 🔴 A BLACK KEY IS TWO THIRDS OF A WHITE ONE, WHICH IS WIDER THAN A PIANO'S.
 * A real piano's black key is 13.7 mm against 23.5, so 0.58. This is 0.66, the
 * same two thirds the whites were just taken to, so the page carries one ratio
 * instead of two.
 * ⚠️ AND IT IS STILL THE SMALLEST TARGET ON THE PAGE. 0.66 of 49 is 32 px,
 * which is under the 44 px minimum and cannot be fixed by widening it further
 * without the keyboard ceasing to look like a keyboard. Two things pay for it:
 * a black key is 46 px TALL, so the target is 32 by 46 rather than 32 square,
 * and it WINS the overlap, so a finger that is half on C and half on C# gets
 * C#. That is the honest cost of piano geometry and it is a trade rather than
 * an oversight.
 */
export const BLACK_RATIO = 0.66;

/**
 * 🔴 WHAT SEPARATES A SWIPE FROM A PRESS: 10 px OF SIDEWAYS TRAVEL INSIDE THE
 * FIRST TWO ANIMATION FRAMES.
 *
 * A finger that lands and covers 10 px before the verdict is a swipe. The row
 * scrolls and NOTHING SOUNDS: there is no note to release, because the note was
 * never sent. A finger that is still there at the verdict is a press. Its note
 * sounds, and from that moment the row is frozen under it and sliding across
 * the keys plays them, which is the glissando.
 *
 * `SWIPE_PX` 10: Chrome's own touch slop, the distance it waits before starting
 * a scroll, is about 8 px. Ten is just over it, and a resting finger's wobble on
 * glass is 2 to 4 px and never trips it.
 *
 * 🔴 `SWIPE_FRAMES` 2, AND FRAMES RATHER THAN MILLISECONDS IS THE POINT.
 * Two frames is the shortest window that can see more than one touch sample,
 * and touch is sampled at the display's own rate, so the same COUNT is the same
 * number of samples on every screen. MEASURED here at 60 Hz: **33 ms**, against
 * **48 ms** for a 30 ms deadline, because a deadline in milliseconds rounds up
 * to the next frame anyway and often skips one. On a 120 Hz phone it is about
 * 17 ms; that is UNVERIFIED, since nothing here has a phone.
 * ⚠️ AND THE SPEED IT SEPARATES AT MOVES WITH THE SCREEN: 10 px in two frames
 * is about 300 px/s at 60 Hz and 600 px/s at 120 Hz. A flick meant to throw a
 * row is 800 px/s and up, so both sit under it, but the margin is thinner on a
 * fast screen and that is the honest cost of tying the window to frames.
 * ⚠️ THE BIAS IS DELIBERATE AND IT IS TOWARD THE SWIPE, on instruction: a stray
 * note goes to a shared instrument in another building, and a scroll that
 * needed a second try costs nobody anything.
 *
 * 🔴 AND THE NOTE WAITS FOR THE VERDICT RATHER THAN BEING TAKEN BACK. That is
 * the whole trade in this feature and both halves of it are real.
 *   · WHAT IT COSTS: MEASURED from `pointerdown` to the key lighting, six takes
 *     each on `/knobs/`. A finger: median **33 ms**. A mouse: median **0.1 ms**,
 *     because nothing on a desktop can steal a drag and a mouse never waits.
 *     On `/knobs/` press to sound is about 190 ms already (36 ms round trip,
 *     153 ms of cushion, both MEASURED and both printed on the page), so this
 *     is +17%. On `/instrument/`, which makes its own sound in this browser,
 *     33 ms is most of the latency there is.
 *   · WHAT THE OTHER ONE WOULD HAVE COST: sounding on `pointerdown` and
 *     releasing when the gesture turns out to be a swipe. Zero added latency,
 *     and every swipe sends a `note.on` and a `note.off` about 30 ms apart over
 *     the relay to a Raspberry Pi in another building. MEASURED on that board:
 *     both patches take longer than 40 ms to reach level, so the blip would be
 *     close to inaudible THERE and a plain click on `/instrument/`'s local
 *     WebAudio. It is still two messages and a note nobody asked for.
 */
export const SWIPE_PX = 10;
export const SWIPE_FRAMES = 2;

/** QWERTY as a piano octave: the home row is white, the row above holds sharps. */
export const QWERTY_CHROMATIC = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12 };
export const SHARP_KEYS = new Set(['w', 'e', 't', 'y', 'u']);

/**
 * @param host     element to append the keyboard to
 * @param base     MIDI note of the leftmost key (60 = middle C)
 * @param onDown   (note, how) — how is 'key' | 'pointer' | 'midi' | 'panic'
 * @param onUp     (note, how)
 * @param onOctave (base) — the octave moved, from the pad or from a call.
 *                 A page that wants to say so in its log hooks this rather
 *                 than wrapping every route that can move it.
 * @param onPanic  extra work when `notes off` is pressed, for a page whose
 *                 sound is made somewhere this component cannot reach — /keys/
 *                 sends the board its own all-notes-off, because a note the
 *                 board is holding was never a key on this keyboard.
 * @param minBase  lowest / highest leftmost note the octave buttons will reach.
 * @param maxBase  They stop at the ends rather than wrapping: a keyboard that
 *                 jumps from the bottom of the range to the top on one press
 *                 reads as a fault.
 * @param swipeFrames  the verdict window and the distance that decides it,
 * @param swipePx      argued for at the top of this file. They are arguments
 *                     only so a page's own check can drive both branches
 *                     deliberately; no page passes them.
 * @param letters  `true` for all keys, `false` for none, or a Set of which keys
 *                 carry a letter. A 25 key layout has no 25 letters to give.
 * @param pad      `false` draws no octave pair and no `Notes off`, for a chord
 *                 chart rather than an instrument. See the block beside it.
 * @returns {{el, keysEl, pad, noteOf, keyOf, press, release, base, shiftOctave,
 *            panic, lightNote, notes, timing, destroy}}
 *          `el` is the WHOLE component — keys plus pad — so a page that places
 *          it by hand places both. `keysEl` is the key row alone.
 */
export function createKeyboard(host, {
  base = 60, map = QWERTY_CHROMATIC, sharps = SHARP_KEYS,
  onDown = () => {}, onUp = () => {}, keys: keyOpts = null,
  onPanic = null, onOctave = null, minBase = 24, maxBase = 96, letters = true,
  pad: wantPad = true,
  swipeFrames = SWIPE_FRAMES, swipePx = SWIPE_PX,
} = {}) {
  /**
   * 🔴 `letters` MAY BE A SET NOW, AND THE RULE IT ENFORCES IS UNCHANGED.
   * The rule below is *a key labelled `a` that does nothing when you press `a`
   * is worse than a key with no letter on it*, and a boolean could only apply
   * it to a whole keyboard. A 25 key layout has no 25 letters to give: the
   * computer keyboard has one octave's worth and `z` and `x` are already the
   * octave pair here. A Set says WHICH keys have one, so the middle octave of
   * `/nola/` stays playable from the keys under your hands and the two outer
   * octaves carry note names only.
   * ⚠️ THE BINDINGS ARE STILL ALL OR NOTHING, on purpose. They are three
   * listeners on `window` and they already refuse a key that is not in the map,
   * so a Set changes what is DRAWN and nothing about what is heard.
   */
  const hasLetter = (k) => (letters instanceof Set ? letters.has(k) : !!letters);
  const keys = keyOpts || Object.keys(map);
  const noteOf = (k) => base + map[k];
  // A key carries two names: the note it plays and the letter that plays it.
  // The note goes on TOP because it is the one that changes — an octave shift
  // moves every note name and no letter — and because a player reading a
  // keyboard is looking for a pitch, not for a keystroke.
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteName = (n) => `${NOTE_NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
  const label = (b, k) => {
    b.textContent = '';
    const nn = document.createElement('span'); nn.className = 'kn'; nn.textContent = noteName(noteOf(k));
    b.append(nn);
    // ⚠️ THE LETTER IS ONLY DRAWN IF IT DOES SOMETHING. A key labelled `a` that
    // does nothing when you press `a` is worse than a key with no letter on it.
    if (hasLetter(k)) {
      const kk = document.createElement('span'); kk.className = 'kk'; kk.textContent = k;
      b.append(kk);
    }
  };
  const keyOf = (note) => keys.find((k) => noteOf(k) === note) ?? null;
  const make = (tag, cls, text, attrs) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    return e;
  };

  const el = make('div', 'kbd');
  const keysEl = make('div', 'keys');
  const els = new Map();
  const letterOf = new Map();         // element -> letter, for the hit test

  // ── where a key goes ─────────────────────────────────────────────────────
  //
  // 🔴 THE GRID HAS ONE COLUMN PER WHITE KEY AND THE BLACK ONES SIT ON THE
  // JOINS. A white takes the next free column. A black takes the column that
  // STARTS at the boundary it belongs on, and `shell.css` pulls it back by half
  // its own width plus half a gap, so it straddles the join the way a piano's
  // does. Both are read off the map rather than hard-coded, so a caller that
  // passes its own letters still gets a keyboard rather than a pile.
  //
  // ⚠️ THE COLUMN COUNT IS PUBLISHED AS `--k-cols`, because a stylesheet cannot
  // count the children. It is the number of WHITE keys, which is 8 for an
  // octave and not 13.
  //
  // ⚠️ AND A KEYBOARD THAT OPENS ON A SHARP KEEPS IT ON THE EDGE. With no white
  // key before it there is no join to straddle, so the pull-back is taken off
  // and it sits flush at the left. Nothing in this project does that today; it
  // is one line and the alternative is half a key hanging outside the row.
  /**
   * 🔴 A REAL PIANO DOES NOT CENTRE ITS BLACK KEYS ON THE JOINS, AND THIS ONE
   * DID. From `research/piano-key-proportions-2026-09.md`, 2026-09-17. Seven
   * white keys have to share five black ones, so the two groups cannot both sit
   * on their joins and leave the whites equal: centring makes D, G and A **59
   * per cent** of C's back width, where a piano keeps every white within 8 per
   * cent of every other.
   *
   * The offsets are fractions of the black key's own width: C# and D# by a
   * sixth, F# and A# by a quarter, G# not at all, outward from the middle of the
   * group. MEASURED on this component at 390 px with the layout applied from a
   * harness: the narrowest white strip goes **19.67 px to 27.00** and the spread
   * between strips **14.66 to 2.44**, while the row width stays 413 px and the
   * hit test stays at 0 misses in 15 probes. Nothing about the fit changes.
   *
   * ⚠️ IT IS READ OFF THE PITCH CLASS, NOT THE LETTER. A caller may pass its own
   * `map`, so keying this on `w`/`e`/`t`/`y`/`u` would break the promise that a
   * keyboard can be built from any letters. The note's distance above its own C
   * is what decides which of the five a sharp is.
   * ⚠️ AND EVERY MUSIC APP EXAMINED THAT DRAWS A PIANO OFFSETS THEM, except
   * LMMS. GarageBand uses a single constant, ±4.0 pt, on both phone and tablet;
   * Ardour's own shift table works out to exactly the sixths and quarters used
   * here. The pair is kept rather than a constant because a constant gives
   * 24.56 px of narrowest strip against 27.00, at identical cost.
   */
  const SHARP_OFF = { 1: -1 / 6, 3: 1 / 6, 6: -1 / 4, 8: 0, 10: 1 / 4 };

  let whites = 0;
  for (const k of keys) {
    const sharp = sharps.has(k);
    const b = make('div', `k${sharp ? ' sharp' : ''}`);
    label(b, k);
    b.style.gridColumn = String(whites + 1);
    if (sharp) {
      const pc = ((map[k] % 12) + 12) % 12;
      const off = SHARP_OFF[pc];
      if (off) b.style.setProperty('--k-off', String(off));
    }
    if (sharp && whites === 0) b.style.transform = 'none';
    if (!sharp) whites++;
    els.set(k, b);
    letterOf.set(b, k);
    keysEl.append(b);
  }
  keysEl.style.setProperty('--k-cols', String(Math.max(1, whites)));
  el.append(keysEl);

  // ── a finger on the keys ─────────────────────────────────────────────────
  //
  // 🔴 THE CAPTURE IS ON THE ROW. It used to be on each key, which is what made
  // a glissando impossible: `b.setPointerCapture()` retargets every later event
  // for that pointer to `b`, so the second key a sliding finger reached never
  // saw it. One capture on the row means one gesture, hit-tested per move.
  //
  // ⚠️ `document.elementFromPoint`, NOT the event's target. Under capture the
  // target IS the row for the whole gesture, so it says nothing about which key
  // is under the finger. It is also what gives a raised black key priority
  // where it covers a white one, for free: it returns the TOPMOST element.
  //
  // ⚠️ AND THE CAPTURE IS WRAPPED. A `PointerEvent` built in script is
  // untrusted and `setPointerCapture` throws on it, so a page's own check could
  // not drive this path at all. Nothing downstream needs the capture to have
  // succeeded.
  //
  // 🔴 A TOUCH IS UNDECIDED WHEN IT LANDS. `playing` is false until the verdict
  // and NO NOTE HAS BEEN SENT; `moveTo` refuses to sound anything while it is
  // false, so an undecided finger crossing three keys is silent. A mouse or a
  // stylus is decided at birth, because nothing can take a drag away from one.
  const touches = new Map();   // pointerId -> {key, x, y, x0, y0, playing, timer}

  function keyAtPoint(x, y) {
    const t = document.elementFromPoint(x, y);
    if (!t || !keysEl.contains(t)) return null;
    const b = t.closest('.k');
    return b ? (letterOf.get(b) ?? null) : null;
  }

  /** Is any OTHER finger still on this key? Two fingers on one key are one note. */
  const heldByAnother = (k, self) => {
    for (const t of touches.values()) if (t !== self && t.playing && t.key === k) return true;
    return false;
  };

  /**
   * Move a gesture onto a key, sounding and releasing as it goes. While the
   * gesture is undecided this only remembers where the finger is: `playing` is
   * what makes it audible, which is the whole of *"drag to play happens when
   * playing is there"*.
   */
  function moveTo(t, k) {
    if (!t || t.key === k) return;
    const was = t.key;
    t.key = k;
    if (!t.playing) return;
    if (was != null && !heldByAnother(was, t)) release(was, 'pointer');
    if (k != null) press(k, 'pointer');
  }

  /**
   * 🔴 THE VERDICT IS TIMED ON `requestAnimationFrame`, AND A `setTimeout`
   * MEASURED 3.4x LATE. This was `setTimeout(startPlaying, 30)` and MEASURED
   * 2026-09-17 in headless Chrome: a bare `setTimeout(30)` on the same page
   * lands at 30 to 32 ms, and the SAME call made from inside a `pointerdown`
   * handler during a touch lands at **101 ms**, four takes, 100.5 to 101.9.
   * Chrome's renderer scheduler deprioritises timer queues for about 100 ms
   * after a touch begins, so the one clock that must not be late during a touch
   * is the one that stops working during one. Animation frames are on the
   * compositor's path and are not deprioritised.
   * ⚠️ THE SYMPTOM IS THE THING TO REMEMBER: every number in the code was
   * right, the constant said 30, and the instrument was 100 ms late. A timer
   * read against a stopwatch on an idle page proves nothing about a timer set
   * while a finger is down.
   */
  function armVerdict(id, t) {
    let frames = 0;
    const step = () => {
      t.raf = 0;
      if (touches.get(id) !== t || t.playing) return;
      if (++frames >= swipeFrames) startPlaying(t);
      else t.raf = requestAnimationFrame(step);
    };
    t.raf = requestAnimationFrame(step);
  }

  /** The verdict went to the press: sound whatever the finger is on, and keep the row still. */
  function startPlaying(t) {
    if (t.playing) return;
    t.playing = true;
    if (t.raf) { cancelAnimationFrame(t.raf); t.raf = 0; }
    if (t.key != null) press(t.key, 'pointer');
  }

  /** The verdict went to the swipe: forget the gesture and let the browser scroll. */
  function abandon(id) {
    const t = touches.get(id);
    if (!t) return;
    if (t.raf) cancelAnimationFrame(t.raf);
    touches.delete(id);
    if (t.playing && t.key != null && !heldByAnother(t.key, t)) release(t.key, 'pointer');
  }

  keysEl.addEventListener('pointerdown', (e) => {
    const k = keyAtPoint(e.clientX, e.clientY);
    if (k == null) return;                       // the gap between two keys
    try { keysEl.setPointerCapture(e.pointerId); } catch { /* a scripted event; see above */ }
    const t = { key: k, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY,
                playing: false, raf: 0 };
    touches.set(e.pointerId, t);
    if (e.pointerType === 'touch') armVerdict(e.pointerId, t);
    else startPlaying(t);
  });

  keysEl.addEventListener('pointermove', (e) => {
    const t = touches.get(e.pointerId);
    if (!t) return;                              // a mouse crossing the keys with no button down
    t.x = e.clientX; t.y = e.clientY;
    // ⚠️ THE DISTANCE IS SIDEWAYS ONLY. The row scrolls sideways, so only
    // sideways travel can be a swipe; a finger that slides DOWN off the keys is
    // leaving the keyboard, which is a different thing and already handled.
    if (!t.playing && Math.abs(t.x - t.x0) >= swipePx) { abandon(e.pointerId); return; }
    moveTo(t, keyAtPoint(t.x, t.y));
  });

  // 🔴 ONCE A NOTE IS SOUNDING THE BROWSER MUST NOT TAKE THE GESTURE, AND
  // `touch-action` CANNOT SAY THAT. It is read once when the finger lands and
  // cannot be changed mid-gesture, so `pan-x` leaves the browser free to start
  // scrolling at any later moment — which would arrive as a `pointercancel` in
  // the middle of a glissando. A non-passive `touchmove` that calls
  // `preventDefault` while anything is playing is the only thing that stops it,
  // and it is the reason `touch-action: pan-x` and this listener are one
  // mechanism rather than two.
  // ⚠️ IT MUST NOT FIRE WHILE UNDECIDED. Preventing the default during the
  // verdict window would stop the scroll that a swipe is asking for, before we
  // have decided it is a swipe.
  const onTouchMove = (e) => {
    for (const t of touches.values()) if (t.playing) { e.preventDefault(); return; }
  };
  keysEl.addEventListener('touchmove', onTouchMove, { passive: false });

  // ⚠️ `lostpointercapture` IS IN HERE ON PURPOSE. A capture taken away by the
  // browser mid-gesture delivers no pointerup and no pointercancel, and the
  // note it was holding would sound until something else stopped it.
  // ⚠️ AND `pointercancel` IS THE BROWSER SAYING IT TOOK THE GESTURE FOR A
  // SCROLL. It runs the same path: whatever was sounding stops, and what was
  // never sounded never was.
  const endTouch = (e) => abandon(e.pointerId);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    keysEl.addEventListener(type, endTouch);
  }


  // ── the pad ──────────────────────────────────────────────────────────────
  // ⚠️ NO WORD AT ALL. It was `octave` once before the pair — better than a word
  // on each button, and still one more thing to read on a control whose two
  // glyphs sit under a row of keys that are already labelled with their octave
  // number. Thirteen keys reading `C4` say what − and + move. Two
  // buttons that have to be read to be told apart are not one control.
  /**
   * 🔴 THE PAD IS OPTIONAL SINCE 2026-09-23, AND THE RULE ABOVE SAID IT NEVER
   * WOULD BE. That rule reads *"There is no option to turn the pad off: one
   * keyboard that sometimes has an octave control is two components"*, and it
   * was right about every caller it had, because every one was an INSTRUMENT.
   * `/nola/` draws a list of CHORD CHARTS: a row of small keyboards with a
   * chord lit on each, which nobody plays an octave on and nobody sends a panic
   * from. An octave pair and a `Notes off` under each of twelve chords is a
   * screen of controls that do not belong to anything.
   * ⚠️ SO THE RULE'S OWN ARITHMETIC IS WHAT CHANGED, NOT ITS REASONING. It says
   * a keyboard that sometimes has an octave control is two components; a
   * picture of a chord and an instrument you play ARE two things, and this is
   * the flag that says which one a caller wants. The alternative was a second
   * module drawing a second piano, and two drawings of a piano is exactly what
   * this file exists to prevent.
   * ⚠️ AND IT IS NOT A WAY TO MOVE THE PAD SOMEWHERE ELSE. A page that turns it
   * off and builds its own octave buttons has hand rolled a control that
   * exists, which is the thing `/keys/` did before this component was written.
   */
  const pad = make('div', 'kpad');
  // ⚠️ IT WEARS `.step`, WHICH IS THE STEPPER'S CLASS, AND THAT IS THE POINT.
  // The segmented geometry — borders overlapped by a pixel so a join is one
  // line, corners rounded only on the outer two, the hovered button raised so
  // its own border is not painted over — is already solved once in `.step`
  // (see stepper.mjs). Copying those four rules at a new height is how two
  // controls drift into looking like two kinds of thing; shell.css only
  // changes the SIZE here.
  const octPair = make('span', 'step pos-seg kpad-oct');
  const mkOct = (text, title, delta) => {
    const b = make('button', 'ico', text, { type: 'button', title });
    b.onclick = () => api.shiftOctave(delta);
    octPair.append(b);
    return b;
  };
  const downBtn = mkOct('−', 'down one octave (z)', -1);
  const upBtn = mkOct('+', 'up one octave (x)', 1);
  pad.append(octPair);
  const panicBtn = make('button', 'kpad-right', 'Notes off', {
    type: 'button', title: 'stop every note that is still sounding',
  });
  panicBtn.onclick = () => api.panic();
  pad.append(panicBtn);
  if (wantPad) el.append(pad);

  host.append(el);

  const held = new Set();

  // 🔴 ONE FUNNEL. Every note this component produces goes through exactly one
  // `press` and one `release`, by every route there is: a finger, a slide
  // across the keys, the letter row, a page calling `api.press`. That is what
  // let hold-to-retrigger be added and removed in one place, and it is where a
  // recorder would attach if the loop idea in `BACKLOG.md` is ever built.
  function press(k, how = 'key') {
    if (!(k in map) || held.has(k)) return;
    held.add(k);
    onDown(noteOf(k), how);
  }

  function release(k, how = 'key') {
    if (!held.has(k)) return;
    held.delete(k);
    onUp(noteOf(k), how);
  }

  // An octave button at the end of the range that still looks pressable is a
  // control that lies about having somewhere to go.
  function paintPad() {
    downBtn.disabled = base <= minBase;
    upBtn.disabled = base >= maxBase;
  }
  paintPad();

  // ⚠️ `z` AND `x` ARE THE OCTAVE, and they are part of the keyboard for the
  // same reason the pad is: the row `a`..`k` is an octave of notes, and the one
  // thing you need while playing it is the octave it sits in. Reaching for a
  // mouse to move it is the interruption the pad already exists to remove — and
  // a page that draws a keyboard should not have to bind this itself.
  //
  // They are next to each other, under the left hand, below the note row: the
  // same place a tracker and a hardware synth put them, and far enough from
  // `a`..`k` that a mis-press is a mis-press rather than a wrong note.
  const OCT_KEYS = { z: -1, x: 1 };

  // preventDefault ONLY on mapped keys, or typing anywhere else on the page
  // stops working.
  const onKeyDown = (e) => {
    if (e.repeat) return;
    // ⚠️ NOT WHILE SOMEBODY IS TYPING. `wire` has a compose box and `/keys/` a
    // room field; a global keydown that swallows `z` would make them unusable,
    // and this listener is on `window`.
    const t = e.target;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName || ''))) return;
    const k = e.key.toLowerCase();
    if (k in OCT_KEYS && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      api.shiftOctave(OCT_KEYS[k]);
      return;
    }
    if (k in map) { e.preventDefault(); press(k, 'key'); }
  };
  const onKeyUp = (e) => { const k = e.key.toLowerCase(); if (k in map) release(k, 'key'); };
  // A tab that loses focus never sees keyup, which is a stuck note.
  const onBlur = () => { for (const k of [...held]) release(k, 'key'); };
  /**
   * 🔴 THE LETTER ROW IS OPTIONAL, BECAUSE TWO KEYBOARDS ON ONE PAGE BOTH HEAR
   * IT. Added 2026-09-17 for `/kit/`, which now shows a full-width keyboard and
   * a narrow one side by side: both bind `window`, so one press of `a` sounded
   * two notes and lit two keys, which in a gallery reads as a broken component
   * rather than as two components doing what they were told.
   * ⚠️ THE DRAWN LETTERS GO WITH IT. A key labelled `a` that does nothing when
   * you press `a` is worse than a key with no letter on it.
   */
  if (letters) {
    addEventListener('keydown', onKeyDown);
    addEventListener('keyup', onKeyUp);
    addEventListener('blur', onBlur);
  }

  const api = {
    el, keysEl, pad,
    /** the three pad buttons, in the order they are drawn — for a page's own check */
    padButtons: [downBtn, upBtn, panicBtn],
    noteOf, keyOf, press, release,
    get base() { return base; },
    /**
     * Move the whole keyboard by octaves. Any note still held is released
     * FIRST and at its old pitch — shifting under a held key would send a
     * note-off for a note that was never started, and leave the real one
     * sounding forever.
     */
    shiftOctave(delta, { min = minBase, max = maxBase } = {}) {
      for (const k of [...held]) release(k, 'key');
      const was = base;
      base = Math.max(min, Math.min(max, base + (delta * 12)));
      for (const k of keys) label(els.get(k), k);      // every note name moved
      paintPad();
      // Only on a real move: at the end of the range the press did nothing,
      // and a log line saying the octave changed when it did not is worse
      // than silence.
      if (base !== was) onOctave?.(base);
      return base;
    },
    /**
     * Stop everything. Every held key is released through the normal path, so
     * the page's own `onUp` sends whatever note-off it would have sent anyway
     * and nothing special has to be taught about panics.
     *
     * ⚠️ AND THEN THE PAINT IS CLEARED BY HAND, which is the one place the
     * "light from the note, never from the press" rule is set aside. A note
     * lit over MIDI is a note this component never saw pressed, so releasing
     * held keys cannot clear it — and a key still glowing under a button
     * labelled `notes off` is the component contradicting itself in public.
     * `remote` keys are left alone: those are somebody ELSE's notes on
     * somebody else's machine, and this button does not reach them.
     */
    panic() {
      // ⚠️ AND THE FINGERS ARE FORGOTTEN TOO. A pointer still down when this is
      // pressed would otherwise keep its `key` and send a second note-off on
      // lift, or re-press on its next move — which is a keyboard that starts
      // playing again immediately after being told to stop.
      for (const t of touches.values()) if (t.raf) cancelAnimationFrame(t.raf);
      touches.clear();
      for (const k of [...held]) release(k, 'panic');
      for (const b of els.values()) b.classList.remove('down');
      onPanic?.();
    },
    /**
     * paint a key. `who` is 'self', 'remote' or 'hint', and they are three
     * different colours.
     *
     * 🔴 `hint` IS MUTED GREY AND IT IS DELIBERATELY THE QUIETEST OF THE THREE.
     * Asked for on `/nola/` 2026-09-23: *"a parser that shows hilited keys
     * (muted gray) on keyboard"*. The other two say something HAPPENED, a
     * finger here or a player elsewhere, and this one says something COULD:
     * these are the notes of a chord, nobody is holding them. Painting that in
     * an ink that means an event would be the colour rule this project already
     * holds for marks, one component along, where a colour says how a thing
     * landed and never which lane it is in.
     * ⚠️ THE THREE ARE SEPARATE CLASSES RATHER THAN ONE ATTRIBUTE, so a key can
     * be hinted AND held at once, which is exactly what happens when somebody
     * plays along with a chord on screen.
     */
    lightNote(note, on, who = 'self') {
      const k = keyOf(note);
      if (!k) return;
      const cls = who === 'remote' ? 'remote' : who === 'hint' ? 'hint' : 'down';
      els.get(k)?.classList.toggle(cls, !!on);
    },
    /** every note this keyboard can produce, for a caller that needs the range */
    notes: () => keys.map(noteOf),
    /** what this keyboard was built with, so a check can grade the numbers as well as the machinery */
    timing: { swipeFrames, swipePx, keyMinPx: KEY_MIN_PX, blackRatio: BLACK_RATIO },
    /**
     * ⚠️ THREE LISTENERS OF THIS COMPONENT'S ARE ON `window`, NOT ON ITS OWN
     * ELEMENT, so removing the element does not remove the keyboard: `a`..`k`
     * and `z`/`x` go on reaching it, and every note it sends goes to a page
     * that cannot see it any more. No page needs this — a demo's keyboard
     * lives as long as the demo — but a page's own CHECK builds throwaway ones,
     * and a check that leaves live keyboards bound to the window has changed
     * the page it was grading.
     */
    destroy() {
      api.panic();
      if (letters) {
        removeEventListener('keydown', onKeyDown);
        removeEventListener('keyup', onKeyUp);
        removeEventListener('blur', onBlur);
      }
      keysEl.removeEventListener('touchmove', onTouchMove);
      el.remove();
    },
  };
  return api;
}
