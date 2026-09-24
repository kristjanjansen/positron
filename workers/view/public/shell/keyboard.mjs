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
import { createToggle } from './toggle.mjs';
/* 🔴 THE SAME MACHINE `/num/` WAS BUILT TO GET RIGHT, AND NOT A SECOND COPY OF
   IT. Asked 2026-09-23: *"num works. how come you can not add it to keyboard"*.
   Nothing prevented it: the ten slot state machine was already written and
   already graded with no browser, and this component had one tape and one
   button. `numloop.mjs` owns WHICH slot is doing what; the keyboard owns what
   recording and looping MEAN, which is the same division the page keeps with the
   keyboard. */
import { createNumLoop } from './numloop.mjs';

/**
 * 🔴 WHERE A BLACK KEY SITS, AS FRACTIONS OF ITS OWN WIDTH, FROM
 * `research/piano-key-proportions-2026-09.md`. Seven white keys have to share
 * five black ones, so the two groups cannot both sit on their joins and leave
 * the whites equal: centring makes D, G and A **59 per cent** of C's back
 * width, where a piano keeps every white within 8 per cent of every other.
 * C# and D# move by a sixth, F# and A# by a quarter, G# not at all, outward
 * from the middle of the group.
 * ⚠️ IT IS READ OFF THE PITCH CLASS, NOT THE LETTER, because a caller may pass
 * its own `map` and keying this on `w`/`e`/`t`/`y`/`u` would break the promise
 * that a keyboard can be built from any letters.
 */
/**
 * 🔴 5 px, WHICH IS ABOUT AN EIGHTH OF A KEY AND IS ALL THERE IS TO SPEND. A
 * sharp is 66 per cent of a white and straddles the join, so it eats about a
 * third of the white on that side. Moving a name a third of a key would put it
 * against the far edge; 5 px clears the overlap that was photographed while
 * leaving the name visibly ON its key.
 */
export const NUDGE_PX = 5;

export const SHARP_OFF = { 1: -1 / 6, 3: 1 / 6, 6: -1 / 4, 8: 0, 10: 1 / 4 };

/**
 * 🔴 HOW MUCH OF THAT OFFSET TO ACTUALLY TAKE, AND IT IS HALF. Asked
 * 2026-09-23 with a crop of `F♯3` sitting off the line above it: *"black keys
 * should be centered to verical line / white key gap"*, then *"or bit in
 * between current and ideal..."*.
 * ⚠️ THE TWO ENDS ARE BOTH DEFENSIBLE AND NEITHER IS FREE. At 0 every black key
 * centres on the join it straddles, which is what the piano roll's rules point
 * at and what the eye expects when a line runs down the picture; the cost is
 * that the white keys BEHIND them stop being equal, because seven whites
 * sharing five blacks cannot have both. At 1 the whites are within a few per
 * cent of each other, which is what a real piano does and what
 * `research/piano-key-proportions-2026-09.md` measured, and the cost is that a
 * black key never lines up with anything above it.
 * ✅ 0.5 IS THE ASK TAKEN LITERALLY, AND ALL THREE SETTINGS WERE MEASURED ON
 * `/nola/` AT 42.7 px A WHITE KEY RATHER THAN ARGUED ABOUT:
 *
 *   nudge 0    narrowest white strip 16.51 px, black centre 1.00 px off its join
 *   nudge 0.5  narrowest white strip 19.78 px, black centre 2.27 px off its join
 *   nudge 1    narrowest white strip 23.04 px, black centre 5.54 px off its join
 *
 * ⚠️ SO THE TRADE IS 3.3 px OF THE NARROWEST WHITE KEY FOR 3.3 px OF
 * ALIGNMENT, almost exactly one for one, and neither end is free. Half gives
 * back most of the alignment a reader notices while leaving the narrowest strip
 * 3 px wider than centring would.
 * ⚠️ AND 1.00 px IS NOT ZERO AT NUDGE 0, which is the measurement saying
 * something the arithmetic does not: a black key is 66 per cent of a white and
 * the column gap is taken off its width, so a `translateX(-50%)` lands it half
 * a gap off the join by construction.
 */
export const SHARP_NUDGE = 0.5;

/**
 * Put one key in the grid, and hand back the running white count.
 *
 * 🔴 EXPORTED BECAUSE A SECOND DRAWING OF THE SAME KEYBOARD EXISTS NOW.
 * `demo/shell/roll.mjs` draws a dot per key ABOVE an instrument, and the one
 * thing a roll must do is line up with the keys under it. `/nola/`'s chord
 * charts already failed at exactly that and were corrected: same width, same
 * key size, different base, so a shape could not be carried down the page,
 * which is the only thing a chart is for. **Two copies of this arithmetic is
 * that defect waiting to happen again**, so there is one copy and both
 * drawings call it.
 *
 * @param {HTMLElement} node   the element to place
 * @param {{sharp:boolean, whites:number, pitchClass:number}} o
 * @returns {number} the white count after this key
 */
export function placeKey(node, { sharp, whites, pitchClass }) {
  node.style.gridColumn = String(whites + 1);
  if (sharp) {
    const off = SHARP_OFF[pitchClass] * SHARP_NUDGE;
    if (off) node.style.setProperty('--k-off', String(off));
    // ⚠️ A KEYBOARD THAT OPENS ON A SHARP KEEPS IT ON THE EDGE. With no white
    // key before it there is no join to straddle, so the pull-back comes off
    // and it sits flush at the left instead of hanging half outside the row.
    if (whites === 0) node.style.transform = 'none';
  }
  return sharp ? whites : whites + 1;
}

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
/**
 * 🔴 `l` IS THE FOURTEENTH AND IT IS A D, NOT A C SHARP. Asked 2026-09-23:
 * *"l dhould work in asd keyboard"*. This ran `a` to `k`, one octave and its
 * top C, so the finger sitting on `l` played nothing at all.
 * ⚠️ IT IS 14 BECAUSE THE LAYOUT IS A PIANO AND NOT A ROW. The white keys are
 * `a s d f g h j k l` and the blacks sit above them on `w e t y u`, so the
 * letter after the top C is the D ABOVE it and the C sharp between them belongs
 * to `o`. Numbering `l` as 13 would put a white letter on a black key and every
 * shape a hand knows would be one key out.
 * ⚠️ AND `o` AND `p` ARE DELIBERATELY NOT HERE. One letter was asked for; the
 * pair that completes that octave is two more lines and nobody has asked.
 */
export const QWERTY_CHROMATIC = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, l: 14 };
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
  pad: wantPad = true, sustain: wantSustain = false, onSustain = null,
  loop: wantLoop = false, onLoop = null,
  /** how many takes this keyboard can hold. One is the button on its own; ten is
   *  a number pad driving it. */
  loops: wantLoops = 1,
  /** where this component says what its loop is doing. `d.log`, normally. */
  log = null,
  names: wantNames = true,
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
  const keys = keyOpts || Object.keys(map);
  const noteOf = (k) => base + map[k];
  // A key carries two names: the note it plays and the letter that plays it.
  // The note goes on TOP because it is the one that changes — an octave shift
  // moves every note name and no letter — and because a player reading a
  // keyboard is looking for a pitch, not for a keystroke.
  /* 🔴 `♯` U+266F, NOT `#`. The number sign is a transcription of the sharp
     that a typewriter could reach, and `shell.css` now binds U+266D to U+266F
     to a subset of Bravura Text so it is drawn as notation rather than as
     punctuation. The letters beside it stay in the mono face, which is what the
     `unicode-range` is for. */
  const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  /**
   * 🔴 THE OTHER WAY OF NAMING A KEY, ASKED FOR 2026-09-23: *"add small
   * radiobutton [C | 1th] (correc?) to swich CDE 123 markup (not sure on this
   * theouri)"*. The uncertainty in the ask is fair and the answer is that both
   * namings are real and neither is a nickname for the other: `C` is the note,
   * an absolute pitch; `1` is the DEGREE, which says what that note does in a
   * key and is the same language the roman numerals over a chord are in.
   * ⚠️ SO A DEGREE NEEDS A TONIC AND A LETTER DOES NOT. Without one there is
   * nothing to be the first of, and the default is the keyboard's own leftmost
   * pitch class, which on every page here is a C.
   * ⚠️ AND IT CARRIES NO OCTAVE NUMBER. `1` is a role rather than a place, and
   * `1₃` would be two answers to one question in five characters.
   */
  /* ⚠️ `♭`, NOT `b`. The flat sign is the notation and the letter is a
     transcription of it that a keyboard happens to have; the mono face has it,
     and `b2` beside a row of note names containing a B is genuinely ambiguous. */
  const DEGREES = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];
  let tonic = ((base % 12) + 12) % 12;
  let naming = 'letter';
  const noteName = (n) => (naming === 'degree'
    ? DEGREES[(((n - tonic) % 12) + 12) % 12]
    : `${NOTE_NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`);
  /**
   * 🔴 A DOT WHERE THE LETTER USED TO BE, AND THE KEY'S BACKGROUND NO LONGER
   * MOVES AT ALL. Asked 2026-09-23: *"do not change bg colors. do colored dots
   * istead. rm wasd hints, dots will be there. lightlightgray dots for hints,
   * yellow for actual presses."*
   *
   * ⚠️ AND A KEY AT REST DRAWS NO DOT AT ALL. Asked 2026-09-23: *"rm dots from
   * keyboard by defualt"*. The first version marked every key the computer
   * keyboard can reach with a faint one, which is what the drawn letter used to
   * mean, and thirteen permanent dots under a row of keys is a picture of the
   * bindings rather than of the instrument. The dot now says only what is
   * HAPPENING: held here, held elsewhere, or part of a chord somebody picked.
   * ⚠️ `letters` THEREFORE ONLY DECIDES WHETHER THE COMPUTER KEYBOARD IS BOUND,
   * and a Set passed to it no longer changes what is drawn, because nothing is.
   * The binding was always all or nothing.
   *
   * ⚠️ AND THE DOT IS ALWAYS IN THE DOM, EVEN WHEN IT SAYS NOTHING. `.k` is a
   * three row grid and the bottom row used to be reserved by a letter that only
   * some keys had; an element that appears and disappears would change a key's
   * inner layout per key. It is drawn transparent and painted by class.
   */
  const label = (b, k) => {
    b.textContent = '';
    const nn = document.createElement('span'); nn.className = 'kn'; nn.textContent = noteName(noteOf(k));
    b.append(nn);
    const kd = document.createElement('span');
    kd.className = 'kd';
    b.append(kd);
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
  /**
   * 🔴 WHICH SHOULDER OF A WHITE KEY HAS A BLACK KEY ON IT, WHICH IS WHAT
   * DECIDES WHERE ITS NAME CAN SIT. A raised sharp covers the top corner of the
   * white it straddles, and `BACKLOG.md` photographed the result on two pages:
   * `F4` with its `4` under `F#4`, `B4` reading as `34` under `A#4`.
   * ⚠️ IT IS ASKED OF THIS KEYBOARD'S OWN MAP rather than assumed from the
   * pitch class, because a caller may hand over any set of keys: the two
   * outermost keys of a two octave layout have a neighbour in theory and none
   * on screen, and a name nudged away from a key that is not there is a name
   * pushed off centre for nothing.
   */
  const semitones = new Set(keys.map((k) => map[k]));
  const blackAt = (semi) => {
    for (const k of keys) if (map[k] === semi && sharps.has(k)) return true;
    return false;
  };

  let whites = 0;
  for (const k of keys) {
    const sharp = sharps.has(k);
    const b = make('div', `k${sharp ? ' sharp' : ''}`);
    label(b, k);
    if (!sharp) {
      const left = semitones.has(map[k] - 1) && blackAt(map[k] - 1);
      const right = semitones.has(map[k] + 1) && blackAt(map[k] + 1);
      /* Away from one, centred between two or none. `NUDGE_PX` is a length
         rather than a percentage because `translateX` on a percentage is a
         fraction of the LABEL, which is two or three characters wide and would
         move `C3` and `D#3` by different amounts. */
      if (right && !left) b.style.setProperty('--kn-x', `${-NUDGE_PX}px`);
      else if (left && !right) b.style.setProperty('--kn-x', `${NUDGE_PX}px`);
    }
    whites = placeKey(b, { sharp, whites, pitchClass: ((map[k] % 12) + 12) % 12 });
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
  /**
   * 🔴 TWO SEGMENTS RATHER THAN A SWITCH, because neither naming is the
   * absence of the other. A switch says on or off, and `C` is not `1` turned
   * off. It wears `.step`, which is the stepper's segmented geometry, for the
   * reason the octave pair beside it does: copying four rules at a new height
   * is how two controls drift into looking like two kinds of thing.
   * ⚠️ IT IS DRAWN ONLY WITH THE PAD, so a chord chart does not grow a control
   * nobody can use, which is the same rule the pad itself follows.
   */
  const nameSeg = make('span', 'step pos-seg kpad-names');
  const mkName = (text, mode, title) => {
    const b = make('button', '', text, { type: 'button', title });
    b.onclick = () => api.setNaming(mode);
    nameSeg.append(b);
    return b;
  };
  /* 🔴 THE TWO STANDARD TERMS, ASKED FOR IN THIS ORDER: *"c | 1 - someting more
     descriptive?"*, then `C D E | 1 2 3`, then *"Notes | Degrees"*, 2026-09-23.
     These are what the two namings are CALLED: note names are absolute, a C is
     a C in any key, and scale degrees are relative, so `1` moves when the key
     does. The glyphs showed which was which and named neither, and a word a
     reader can look up beats a demonstration they have to decode. */
  const letterBtn = mkName('Notes', 'letter', 'name the keys as notes, which do not move');
  const degreeBtn = mkName('Degrees', 'degree',
    'name the keys as scale degrees, which move with the key');
  const paintNaming = () => {
    for (const [b, mode] of [[letterBtn, 'letter'], [degreeBtn, 'degree']]) {
      if (naming === mode) b.dataset.on = '1'; else delete b.dataset.on;
      b.setAttribute('aria-pressed', naming === mode ? 'true' : 'false');
    }
  };
  paintNaming();

  const octPair = make('span', 'step pos-seg kpad-oct');
  /* 🔴 SHIFT MOVES ONE SEMITONE, AND THE PICTURE DOES NOT CHANGE SHAPE.
     Asked 2026-09-23: *"shift +- should transpose with semitones"*. There were
     two readings of that and only one is cheap. Moving the WINDOW by a semitone
     makes the leftmost key a C#, and every caller decides which keys are sharps
     from the key INDEX (`BLACK.has(i % 12)`), which assumes the base is a C, so
     the drawn black and white pattern would stop matching the notes it plays
     and the whole layout would have to be recomputed from the note.
     ✅ WHAT HAPPENS INSTEAD IS WHAT TRANSPOSE MEANS ON A HARDWARE KEYBOARD: the
     keyboard keeps its shape, every key's printed note name moves with it, and
     a key still plays exactly what it says. The MK-425C on this desk does the
     same thing. */
  const mkOct = (text, title, steps) => {
    const b = make('button', 'ico', text, { type: 'button', title });
    b.onclick = (e) => api.shiftBy(e.shiftKey ? Math.sign(steps) : steps);
    octPair.append(b);
    return b;
  };
  const downBtn = mkOct('−', 'down one octave (z), or one semitone with shift', -12);
  const upBtn = mkOct('+', 'up one octave (x), or one semitone with shift', 12);
  /* ⚠️ THE NAMING COMES FIRST: *"change order of c|1 and +-"*, 2026-09-23. It
     says what the keys are CALLED, and the pair after it says where they are,
     so the row reads in the order somebody needs it.
     🔴 AND IT IS BUILT ABOVE, NOT HERE. Appending it before its own `const` was
     a temporal dead zone that threw on every keyboard page at once, reported in
     four words: *"Cannot access 'nameSeg' before initialization"*. Third one
     today, and the shape is always the same: a declaration shadows its whole
     block from the top, and moving an APPEND is enough to open one. */
  if (wantNames) pad.append(nameSeg);
  pad.append(octPair);
  /**
   * 🔴 HOW FAR FROM HOME, WHICH AMENDS THIS FILE'S OWN RULE AND IS NOT THE
   * THING THAT RULE REFUSED. The header says there is no octave number on the
   * pad, because every key already prints its own note name and *"a fourteenth,
   * in a different place, is a second copy that can disagree"*. That is true of
   * the octave a key is IN, and this is not that: it is the DISPLACEMENT from
   * where this keyboard started, which no key shows and nothing else can say.
   * Asked 2026-09-23 as *"show -1 +1 etc to the right on +- on keyboard"*.
   * ⚠️ TWO FORMATS, AND EACH ONE IS UNAMBIGUOUS BECAUSE ONLY ONE CARRIES A
   * UNIT. Whole octaves read `+1` and `-2`, which is what the ask asked for and
   * what the buttons do on their own. Anything else is a semitone count and
   * says so, `+7st`, because `+7` alone would be read as seven octaves by
   * somebody who had just pressed the button seven times.
   */
  const atEl = make('span', 'kpad-at', '');
  const HOME = base;
  const paintAt = () => {
    const d = base - HOME;
    atEl.textContent = d === 0 ? '0'
      : d % 12 === 0 ? `${d > 0 ? '+' : '−'}${Math.abs(d) / 12}`
      : `${d > 0 ? '+' : '−'}${Math.abs(d)}st`;
    /* ⚠️ DELETED, NEVER SET TO THE EMPTY STRING. `[data-home]` matches on
       PRESENCE, so `= ''` would leave every keyboard that has ever been at home
       looking like it still is. That is a defect this project has already
       measured once, in `video-panel.mjs`'s full screen state. */
    if (d === 0) atEl.dataset.home = '1'; else delete atEl.dataset.home;
  };
  pad.append(atEl);
  const panicBtn = make('button', '', 'Notes off', {
    type: 'button', title: 'stop every note that is still sounding',
  });
  panicBtn.onclick = () => api.panic();
  /**
   * 🔴 THE SUSTAIN LIVES IN THE KEYBOARD'S OWN FOOTER NOW. Asked 2026-09-23:
   * *"integrate sustain to footer, create toggle button, big and small, use
   * small below keyboard, left from notes off"*. It is the same argument the
   * pad itself was built on: an octave pair, a `Notes off` and a damper are all
   * controls ABOUT the keys, and a hand's width away at the top of the page is
   * the wrong place for any of them. `/nola/` and `/fau/` each drew their own
   * switch in their own row, which is two pages solving one problem twice.
   * ⚠️ THE COMPONENT DRAWS IT AND THE PAGE OWNS WHAT IT MEANS. Nothing here
   * knows about `demo/shell/pedal.mjs`, two sets of notes or a damper time: it
   * reports that a foot went down, and the page decides what that does to its
   * own graph. That is the same division `pedal.mjs` already states.
   * ⚠️ AND IT IS OFF BY DEFAULT, because a chord chart and a keyboard nobody
   * sustains should not grow a control they cannot use.
   */
  /**
   * 🔴 THE ROW IS `Loop`, `Sustain`, `Notes off`, STATED IN THOSE WORDS, and it
   * is a keyboard function rather than a page mode. Asked 2026-09-23 as *"wait
   * make it a keyboard funcion, a button in bottom rihjt (left from sustain)
   * called 'Loop'"*, after a first reading that would have made it a third option
   * on `/nola/`'s roll picker.
   * ⚠️ AND THE ORDER TOOK THREE MESSAGES, WHICH IS WORTH RECORDING BECAUSE THE
   * FIRST TWO WERE READ WRONG. *"move loop button to right"* and then *"loop is
   * leftmost of 3 in riht"* were both read as *move Loop along the row*, so it
   * went to the middle and then to the end. What they were about was the GROUP:
   * two `margin-left: auto` on one flex line split the free space instead of
   * sharing it, so `Loop` was stranded out in the row rather than sitting with
   * the others, and it was leftmost of three that were not together. Settled by
   * *"buttons: Loop Sustain Notes off"*, which is where it started.
   * 🔴 SO THE DEFECT WAS THE GAP AND THE REPORT NAMED A POSITION. Moving the
   * button twice was answering the words rather than the picture, and the
   * stylesheet is where it was wrong the whole time.
   * ⚠️ THE CORRECTION IS THE INTERESTING PART AND IS WHY IT IS HERE. A mode is
   * something a PAGE is in and excludes the others; looping what you play is
   * something you do WHILE typing chords, or while the page is learning them, or
   * on a page that has neither. It belongs to the instrument, beside the damper,
   * which is the same argument the sustain button itself was moved on.
   * ⚠️ AND THE COMPONENT DRAWS IT AND THE PAGE OWNS WHAT IT MEANS. Nothing here
   * records or plays anything: it reports that the button went on or off, and a
   * page decides what looping IS on its own graph. Same division as the damper.
   * ⚠️ OFF BY DEFAULT, because a keyboard nobody loops should not grow a control
   * it cannot use.
   */
  const loopBtn = wantLoop
    ? createToggle({ label: 'Loop', size: 'small',
                     title: 'record what you play and play it back around, '
                          + 'until you switch it off',
                     onChange: () => setLoop() })
    : null;
  const sustainBtn = wantSustain
    ? createToggle({ label: 'Sustain', size: 'small',
                     title: 'hold the notes on after the keys come up, the way a pedal does',
                     onChange: (on) => onSustain?.(on) })
    : null;
  /* 🔴 THE ROW SAYS WHERE ITS OWN GROUPS ARE, AND THE STYLESHEET NO LONGER
     GUESSES. The first of these takes the free space and pushes the rest to the
     right; the others sit tight against it. Adding a fourth control is one more
     entry in this array and no CSS at all, which is the opposite of what the
     `margin-left: auto` on every toggle did when `Loop` arrived. */
  const rightSide = [loopBtn?.el, sustainBtn?.el, panicBtn].filter(Boolean);
  rightSide.forEach((node, i) => {
    node.classList.add(i === 0 ? 'kpad-right' : 'kpad-tight');
    pad.append(node);
  });
  if (wantPad) el.append(pad);

  host.append(el);

  const held = new Set();

  // 🔴 ONE FUNNEL. Every note this component produces goes through exactly one
  // `press` and one `release`, by every route there is: a finger, a slide
  // across the keys, the letter row, a page calling `api.press`. That is what
  // let hold-to-retrigger be added and removed in one place, and it is where a
  // recorder would attach if the loop idea in `BACKLOG.md` is ever built.
  /* 🔴 THE FUNNEL MARKS ITSELF WHILE IT IS INSIDE THE PAGE'S CALLBACK, and the
     one thing that reads this is `lightNote`. A page's `onDown` almost always
     lights the key it was just handed, so without a mark the component cannot
     tell its OWN note coming back from a note the page played on its own, and a
     key press would be taped twice. `release` is the half that proves it is
     needed: it deletes from `held` BEFORE calling `onUp`, so a membership test
     answers the wrong way on every key up. */
  let viaKey = 0;

  function press(k, how = 'key') {
    if (!(k in map) || held.has(k)) return;
    held.add(k);
    onTape(k, true);
    viaKey++;
    try { onDown(noteOf(k), how); } finally { viaKey--; }
  }

  function release(k, how = 'key') {
    if (!held.has(k)) return;
    held.delete(k);
    onTape(k, false);
    viaKey++;
    try { onUp(noteOf(k), how); } finally { viaKey--; }
  }

  /**
   * 🔴 THE LOOP LIVES HERE, WHERE THE FILE ALREADY SAID IT WOULD. The comment
   * above `press` has read *"it is where a recorder would attach if the loop
   * idea in BACKLOG.md is ever built"* since that funnel was made, and this is
   * that. Asked 2026-09-23: *"do not wire nola, its gloabl keyboard fn. nola
   * gets just chords as if i played htem"*, after a first build put the tape on
   * one page.
   * ⚠️ THAT CORRECTION IS THE WHOLE ARCHITECTURE. A page owning the tape is one
   * page solving a problem every page with keys has, and it would have had to
   * know about recording, laps and scheduling to get chords it already knows how
   * to play. Here it needs no code at all: playback goes through `press` and
   * `release`, so a looped note is indistinguishable from a finger, arrives on
   * the page's own `onDown` with `how` saying `loop`, lights the key, feeds the
   * roll and takes the damper.
   * ⚠️ IT RECORDS KEYS, NOT NOTES, so a loop follows the octave pad: shift the
   * keyboard while a loop is running and it transposes with you. That is a
   * consequence rather than a decision, and it is the one a keyboard should
   * have.
   * ⚠️ AND THE LAP IS THE TAKE. There is no clock in this component and no tempo
   * anywhere near it, so a loop is as long as what you played, first press to
   * the moment you pressed `Loop` again. Rounding to a beat would invent a grid
   * nobody set.
   */
  /**
   * 🔴 TEN TAKES, NOT ONE, AND THE STATE MACHINE IS `/num/`'s. Asked 2026-09-23:
   * *"num works. how come you can not add it to keyboard"*, and the honest answer
   * was that nothing prevented it. `numloop.mjs` had been built, graded with no
   * browser and proved against the real number pad; this component had one tape
   * and one button, so the two halves of a looper were sitting in the repository
   * not talking to each other.
   * ⚠️ THE DIVISION IS THE SAME ONE THIS FILE ALREADY KEEPS. `numloop.mjs` owns
   * WHICH slot is recording, looping, stopped or empty, and knows nothing about
   * audio or keys. This owns what those words MEAN: a take is a list of key
   * movements, a lap is how long it ran, and playing one back is pressing keys.
   * ⚠️ A TAKE IS A KEY MOVEMENT LIST AND NOTHING ELSE. No audio is copied, so ten
   * loops cost ten arrays of small objects and the sound is made fresh every lap
   * by the page, exactly as it is for a finger.
   */
  const SLOTS = Math.max(1, Math.round(wantLoops));
  const takes = Array.from({ length: SLOTS }, () => ({
    tape: null,        // the movements, or null when this slot is empty
    at: 0,             // when the first movement landed. See the lead-in note below
    lap: 0,            // how long one turn is
    timers: [],
    going: false,      // is this slot playing right now
    rec: false,        // is this slot taking movements right now
    keys: new Set(),   // what this slot has down, which is NOT the same as `held`
    notes: new Set(),
    outside: 0,        // movements that came in past the keys, for the log
    pressedAt: 0,      // when the button was touched. See `onTouch` below
  }));

  /* 🔴 ONE FLAG FOR *THESE NOTES ARE COMING BACK, NOT GOING IN*, AND IT REPLACED
     A PER SLOT ONE THE MOMENT THERE WAS MORE THAN ONE SLOT. A note replayed by
     loop 1 reaches the page, which lights it, which is where the tape listens, so
     without this loop 2 would record loop 1 while it recorded you and the two
     would compound every lap. The old single loop checked its OWN `looping`,
     which is exactly the test that stops working when a second slot exists. */
  let replaying = 0;

  /**
   * 🔴 WHAT YOUR FINGERS ARE HOLDING, WHICH IS NOT WHAT THE LOOP IS HOLDING, AND
   * CONFUSING THE TWO MADE THE PAGE FORGET REAL NOTES. Reported 2026-09-23:
   * *"pressing loop, just repssing is cutting off sound, does not held note"*,
   * and `/nola/`'s own tap said it exactly: *"the wire says 57,61 and the page
   * says nothing"*.
   * 🔴 A NOTE CAN BE HELD BY A FINGER AND BY A LOOP AT ONCE, AND A SET CANNOT
   * COUNT. When a loop replayed a note somebody was also holding, the loop's
   * note-off went to the page and the page let go of the FINGER'S note: the wire
   * still had the key down, the page had nothing, and the sound stopped under
   * your hand. Stopping a loop did the same thing in one go, which is the *"just
   * pressing is cutting off sound"* half.
   * ⚠️ AND THE KEY PATH WAS WORSE THAN THE NOTE PATH. Replay did `held.delete(k)`
   * before pressing, to force a retrigger, which ERASES a finger's hold outright
   * rather than shadowing it.
   * ✅ SO A LOOP NEVER TOUCHES A NOTE A FINGER IS ON. It does not press one that
   * is already sounding under a hand and it never releases one, which leaves the
   * player in charge of their own notes and costs the loop a doubled attack it
   * could not have made audible anyway.
   */
  const fingerNotes = new Set();

  /* 🔴 THE TAKE STARTS AT THE FIRST NOTE, NOT AT THE BUTTON. Reported as *"still
     no looping"* with the machinery correct and graded on both paths, then said
     plainly: *"arm should as long as it takes when i start to play"*. The clock
     used to start when the button was armed, so arming, getting your hands down
     and then playing put every one of those seconds INSIDE the take: the loop
     came round and did nothing at all until the lead-in had elapsed again, which
     is indistinguishable from a loop button that does not work.
     ⚠️ THE TRAILING SILENCE IS KEPT AND ONLY THE LEAD-IN IS DROPPED. Where you
     stop is a decision and a rest at the end of a phrase should survive. Where
     you START is not a decision, it is how long it took to get ready. */
  const startClock = (t, at) => { if (!t.at) t.at = at; };

  /**
   * 🔴 A LOOP BUTTON ALWAYS LANDS LATE, SO THE TAKE REACHES BACK. Asked
   * 2026-09-23: *"when loop button lands bit later, do consider earlier played
   * keys"*. You play the phrase and then press, because pressing first and
   * playing into silence is not how anybody plays. Without this the first chord
   * of every take is the one you lose, and the loop comes round a beat short of
   * what you meant.
   * ⚠️ IT REACHES BACK TO THE START OF THE PHRASE, NOT BY A FIXED TIME. A window
   * would cut a long chord in half and keep half of the one before it. A phrase
   * here is simply *from when nothing was sounding*, which is a boundary the
   * movements already carry and needs no clock and no tempo.
   * ⚠️ AND IT IS 1200 ms OF REACH, WHICH IS A JUDGEMENT. If the last thing you
   * played was longer ago than that, arming means arming and the take starts
   * empty, or every loop would open with whatever happened to be lying around.
   * ⚠️ THE BUFFER IS PRUNED TO 4 s AND HOLDS MOVEMENTS, NOT AUDIO. It costs a few
   * small objects and exists whether or not anything is armed, because the whole
   * point is to have kept what you did before you decided to keep it.
   */
  const PRE_ROLL = 4000, REACH_BACK = 1200;
  const recent = [];

  /* 🔴 THE BUFFER ONLY HOLDS WHAT NO TAKE HAS CLAIMED. Found by the two slot
     check: a phrase recorded LIVE into take 1 was still sitting in the buffer, so
     arming take 2 a moment later reached back and took the same performance
     again, and the player would have heard it twice with nothing on screen
     saying why. A movement that went into a take is committed; the buffer is for
     what nobody has kept yet, which is the whole idea of a pre-roll. */
  const remember = (mv) => {
    if (takes.some((t) => t.rec)) return;
    recent.push(mv);
    while (recent.length && mv.at - recent[0].at > PRE_ROLL) recent.shift();
  };

  /** where the phrase still in the buffer began, or 0 if it is too old to want */
  const phraseStart = (by) => {
    let downs = 0, startAt = 0;
    for (const m of recent) {
      if (m.down) { if (downs === 0) startAt = m.at; downs++; } else downs = Math.max(0, downs - 1);
    }
    if (!startAt) return 0;
    const lastAt = recent[recent.length - 1].at;
    return lastAt > by - REACH_BACK ? startAt : 0;
  };

  const onTape = (k, down) => {
    if (replaying) return;
    const at = performance.now();
    remember({ k, down, at });
    for (const t of takes) {
      if (!t.rec) continue;
      startClock(t, at);
      t.tape.push({ k, down, t: Math.round(at - t.at) });
    }
  };

  /**
   * 🔴 A NOTE THE PAGE PLAYED WITHOUT TOUCHING THESE KEYS, AND IT IS THE WHOLE
   * REASON THE FIRST BUILD WAS SILENT. Reported 2026-09-23: *"can not hear
   * looping"*. The funnel above is honest about what it covers, which is *every
   * note this COMPONENT produces*: a finger, a slide, the letter row, a page
   * calling `api.press`. A MIDI keyboard produces none of them. `/nola/` takes
   * its own `midiDown` straight to its own `press`, so the component never saw a
   * note, the tape stayed empty, and a loop with nothing in it is correctly
   * silent. Playing the same notes on screen worked perfectly.
   * 🔴 THIS IS THE THIRD TIME THAT SHAPE HAS COST A SESSION ON THIS PAGE. The
   * Rhodes was inaudible over MIDI and audible on screen for the same reason a
   * layer down, and the fix is the same sentence: the on-screen path and the MIDI
   * path are two paths, and anything that must be true of PLAYING has to sit
   * where both of them pass.
   * ✅ AND BOTH OF THEM PASS THROUGH `lightNote`. Every page here lights the key
   * it is sounding, by every route, which makes that the note level funnel this
   * component already had and had named after the lamp. So the loop records there
   * and no page needs a line of code, which is what *"do not wire nola, its
   * gloabl keyboard fn"* asks for.
   * ⚠️ IT RECORDS THE NOTE AND NOT A KEY, so unlike a finger it does not follow
   * the octave pad, and it can hold a note this keyboard does not draw. Both are
   * right: what arrived was a note number somebody played, and the pad moves
   * which keys are on screen rather than what a MIDI keyboard sent.
   */
  /**
   * 🔴 AND IT CARRIES VELOCITY, BECAUSE A LOOP THAT DOES NOT IS PLAYING SOMETHING
   * ELSE. Asked 2026-09-23: *"do y preserve velocity at all?"*, and the answer
   * was no: every looped note came back at a flat 100 whatever was played. On a
   * page with velocity LAYERS that is not a loudness error, it is the wrong
   * RECORDING: `/nola/` picks a different sample for a soft note and a hard one,
   * so a quiet phrase came back as a different instrument played hard.
   * ⚠️ ONLY THE NOTE PATH HAS ONE. A key on screen is a click and has no
   * velocity to preserve, which is why a page gives those a flat value of its
   * own. `null` here means *nobody said*, and the page's default stands.
   */
  const tapeNote = (note, down, vel) => {
    if (replaying) return;
    const at = performance.now();
    remember({ note, down, at, vel });
    for (const t of takes) {
      if (!t.rec) continue;
      startClock(t, at);
      t.outside++;
      t.tape.push({ note, down, v: vel, t: Math.round(at - t.at) });
    }
  };

  /* 🔴 STOPPING A LOOP MID NOTE MUST NOT LEAVE THE NOTE ON. Cutting the timers
     stops the next movement arriving, which means the note-off that was due never
     comes: what a player hears is the loop stopping with a chord still sounding,
     and the only way out is `Notes off`. */
  const stopTake = (i) => {
    const t = takes[i];
    for (const timer of t.timers) clearTimeout(timer);
    t.timers = [];
    t.going = false;
    t.rec = false;
    /* ⚠️ AND STOPPING LETS GO OF WHAT THE LOOP HAD DOWN AND NOTHING ELSE. A note
       a finger is on stays down, which is the other half of *"pressing loop is
       cutting off sound"*. */
    for (const k of t.keys) release(k, 'loop');
    t.keys.clear();
    for (const n of t.notes) { if (!fingerNotes.has(n)) onUp(n, 'loop'); }
    t.notes.clear();
  };

  /**
   * 🔴 EVERY EVENT IS SCHEDULED AGAINST AN ABSOLUTE GRID, NOT AGAINST THE ROUND
   * BEFORE IT, AND THE DIFFERENCE IS WHETHER A LOOP KEEPS TIME. Reported
   * 2026-09-23: *"loops do not sound right (timings)"*.
   * A round used to end with `setTimeout(round, lap)`, so the next round began
   * whenever that timer actually fired. A timer is never early and is routinely a
   * few milliseconds late, and the lateness was then the ORIGIN for that round's
   * own events, so every lap inherited the drift of every lap before it. A loop
   * does not drift a little, it drifts CUMULATIVELY: ten laps of 4 ms late is 40
   * ms, a hundred is nearly half a beat, and the phrase walks away from itself
   * while each individual timer looks fine.
   * ✅ THE ANCHOR IS THE MOMENT THE LOOP STARTED AND NOTHING MOVES IT. Round `n`
   * is `anchor + n * lap`, so a round that fires late schedules its events at the
   * times they were always due and simply has less notice. Error stops
   * accumulating and becomes the jitter of one timer, which is the floor a page
   * cannot get under.
   * ⚠️ AND A DUE TIME IN THE PAST IS FIRED AT ONCE RATHER THAN SKIPPED. A note
   * that is a few milliseconds late is a note; a note that is dropped is a hole
   * in the phrase, and the hole is far easier to hear.
   */
  const runTake = (i) => {
    const t = takes[i];
    t.anchor = performance.now();
    let lapNo = 0;
    const round = () => {
      if (!t.going) return;
      const base = t.anchor + lapNo * t.lap;
      for (const e of t.tape) {
        t.timers.push(setTimeout(() => {
          if (!t.going) return;
          replaying++;
          try {
            /* 🔴 TWO KINDS OF MOVEMENT AND THEY REPLAY DIFFERENTLY. A key goes
               back through `press`, so it follows the octave pad and lights up
               like a finger. A note played past the keys has no key to press, so
               it is handed to the page directly, marked `loop` the same way. */
            if (e.k !== undefined) {
              /* ⚠️ A KEY A FINGER IS ON IS LEFT ALONE, BOTH WAYS. `held` holds
                 fingers and loops together, so `t.keys` is what says this loop
                 pressed it and a key held by anything else is not ours to move. */
              if (e.down) {
                if (!held.has(e.k) || t.keys.has(e.k)) {
                  held.delete(e.k); press(e.k, 'loop'); t.keys.add(e.k);
                }
              } else if (t.keys.has(e.k)) { release(e.k, 'loop'); t.keys.delete(e.k); }
            } else if (e.down) {
              if (!fingerNotes.has(e.note)) { onDown(e.note, 'loop', e.v); t.notes.add(e.note); }
            } else if (t.notes.has(e.note) && !fingerNotes.has(e.note)) {
              onUp(e.note, 'loop'); t.notes.delete(e.note);
            }
          } finally { replaying--; }
        }, Math.max(0, base + e.t - performance.now())));
      }
      lapNo++;
      t.timers.push(setTimeout(round,
        Math.max(0, t.anchor + lapNo * t.lap - performance.now())));
    };
    round();
  };

  /**
   * 🔴 250 ms IS A JUDGEMENT ON THE LAP AND NOT ON THE EVENTS. Found by the check
   * in `/kit/`, which presses four keys with no waiting between them: the take
   * was a few milliseconds long and the loop turned 118 times in 260 ms, which is
   * a stuck note with extra steps. A person cannot play a take that short but CAN
   * arm and press again straight away, which is the same take.
   */
  const MIN_LAP = 250;

  const paintLoop = () => {
    if (!loopBtn) return;
    const s = machine.state(0);
    loopBtn.set(s === 'recording' || s === 'looping', true);
    if (s === 'empty') loopBtn.el.removeAttribute('data-loop');
    else loopBtn.el.setAttribute('data-loop', s);
  };

  const enterLoop = (i, to, was) => {
    const t = takes[i];
    const n = SLOTS > 1 ? `loop ${i + 1}` : 'loop';
    if (to === 'recording') {
      t.tape = []; t.at = 0; t.outside = 0; t.going = false; t.rec = true;
      /* 🔴 THE PHRASE YOU HAD ALREADY PLAYED GOES IN FIRST. See `phraseStart`.
         It also means the 250 ms a press waits to find out whether it is half of
         a double one costs no notes: anything played inside that window is in the
         buffer and arrives here. */
      const from = phraseStart(t.pressedAt);
      if (from) {
        t.at = from;
        for (const m of recent) {
          if (m.at < from) continue;
          const e = { down: m.down, t: Math.round(m.at - from) };
          if (m.k !== undefined) e.k = m.k; else { e.note = m.note; e.v = m.vel; t.outside++; }
          t.tape.push(e);
        }
        /* 🔴 A PHRASE IS CLAIMED ONCE. Found by the two slot check, which armed a
           second take 120 ms after the first had captured a phrase and got the
           SAME phrase again: the buffer still held it, so both takes opened with
           one performance and the player would hear it twice with no way to see
           why. Arming consumes what it reached back for. */
        recent.length = 0;
      }
      log?.(t.tape.length
        ? `${n} armed, and it caught the ${t.tape.length} movement(s) you had `
          + 'already played. Press again to send it round'
        : `${n} armed. The take starts at your first note, so take your time, `
          + 'then press again to send it round');
    } else if (to === 'looping') {
      if (was === 'recording') {
        t.rec = false;
        /* 🔴 THE LAP IS MEASURED TO THE PRESS AND NOT TO THE SETTLE, WHICH IS THE
           ONE PLACE THE DOUBLE PRESS WINDOW WOULD HAVE BEEN AUDIBLE. A press is
           held for 250 ms to find out whether it is half of a double one, so
           closing a take on the settle would put that 250 ms inside the lap: at a
           two second loop that is 12 per cent too long, every turn, for ever.
           `onTouch` stamps the real moment and this reads it. */
        const raw = t.at ? Math.round(t.pressedAt - t.at) : 0;
        if (!t.tape || !t.tape.length) {
          /* ⚠️ NOTHING PLAYED IS NOT A LOOP, so the slot goes back to empty
             rather than sitting on with nothing behind it. */
          stopTake(i);
          t.tape = null;
          machine.clear(i);
          log?.(`nothing was played into ${n}, so there is no loop`, 'warn');
          paintLoop();
          onLoop?.(false, { slot: i, state: 'empty' });
          return;
        }
        t.lap = Math.max(MIN_LAP, raw);
        const fromKeys = t.tape.length - t.outside;
        log?.(`${n} is going round: ${t.tape.length} movement(s) over ${t.lap} ms`
            + `${raw < MIN_LAP ? `, the take being ${raw} ms and held to the 250 ms floor` : ''}`
            + `${t.outside ? `, ${t.outside} of them played past the keys on screen` : ''}`
            + `${fromKeys && t.outside ? ` and ${fromKeys} on them` : ''}`);
      } else {
        log?.(`${n} is playing again`);
      }
      t.going = true;
      runTake(i);
      onLoop?.(true, { slot: i, state: 'looping', lap: t.lap, moves: t.tape.length,
                       outside: t.outside });
    } else if (to === 'stopped') {
      const still = t.keys.size + t.notes.size;
      stopTake(i);
      log?.(`${n} stopped${still ? `, and ${still} note(s) it still had down were let go` : ''}`);
      onLoop?.(false, { slot: i, state: 'off' });
    } else {
      /* empty, which is the double press meaning *throw this away* */
      const had = t.tape ? t.tape.length : 0;
      stopTake(i);
      t.tape = null;
      if (had) log?.(`${n} thrown away, ${had} movement(s) with it`);
      onLoop?.(false, { slot: i, state: 'empty' });
    }
    paintLoop();
  };

  /**
   * 🔴 THE MACHINE IS `/num/`'s, PRESS FOR PRESS. A slot walks empty, recording,
   * looping, stopped and then alternates for ever, and a double press inside the
   * window throws it away or, on an empty slot, silences the others and records.
   * ⚠️ AND THE BUTTON IS SLOT 1. A keyboard with `loops: 1` is exactly what it
   * was before this, one take on one button, which is why no page had to change.
   */
  const machine = createNumLoop({
    slots: SLOTS,
    onTouch: (i) => { takes[i].pressedAt = performance.now(); },
    onEnter: (i, to, o) => enterLoop(i, to, o.was),
  });

  function setLoop() { machine.press(0); }

  // An octave button at the end of the range that still looks pressable is a
  // control that lies about having somewhere to go.
  function paintPad() {
    downBtn.disabled = base <= minBase;
    upBtn.disabled = base >= maxBase;
    paintAt();
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
      // Shift is a semitone here for the same reason it is on the buttons, and
      // `z`/`x` are the only two keys this component takes from the page.
      api.shiftBy(OCT_KEYS[k] * (e.shiftKey ? 1 : 12));
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
    /** the displacement readout, so a check reads what a player reads */
    atEl,
    /**
     * The damper control, or `null` on a keyboard that did not ask for one.
     * ⚠️ IT KEEPS `set(on, quiet)`, WHICH IS WHAT A PAGE NEEDS RATHER THAN A
     * PREFERENCE. A real pedal moving has to move the lamp WITHOUT calling back
     * into the page that is already handling the pedal, or the page answers its
     * own message. `/nola/` asserts exactly that and the assert would go with
     * this method.
     */
    sustain: sustainBtn,
    /** the `Loop` toggle, or null when the caller did not ask for one */
    loop: loopBtn,
    /**
     * 🔴 THE TAKES, AND THIS IS WHAT A NUMBER PAD DRIVES. Asked 2026-09-23:
     * *"num works. how come you can not add it to keyboard"*. A page that has a
     * numeric pad on its MIDI keyboard calls `press(i)` with the slot and gets
     * the whole of `/num/`'s behaviour: record, loop, stop, play again, and a
     * double press inside the window to throw it away.
     * ⚠️ THE PAGE OWNS THE PAD AND THIS OWNS THE LOOP, which is the same division
     * as everywhere else here. Nothing in this component listens to MIDI, so a
     * page maps a program change to a slot number and stops there.
     * ⚠️ `settle` IS FOR A CHECK, and it says so on `numloop.mjs`: it runs a held
     * press now rather than waiting out the double press window, which only a
     * clock or a test can know is safe.
     */
    loops: {
      press: (i) => machine.press(i),
      settle: (i) => machine.settle(i),
      clear: (i) => machine.clear(i),
      /**
       * Throw away the movements an arm would otherwise reach back for.
       * ⚠️ IT IS NOT A SECOND `clear`. That empties a TAKE; this empties the
       * rolling buffer behind `phraseStart`, so the next arm starts from silence
       * whatever was played a moment ago. A check needs it because its blocks run
       * back to back in milliseconds, which is a gesture no player can make, and
       * a page wanting a deliberately empty arm can use it too.
       */
      forget: () => { recent.length = 0; },
      /** one turn of a take in ms, for a page reporting on its own timing */
      lap: (i) => takes[i]?.lap || 0,
      /** what is on a take, so a tap can compare it against what was heard */
      tape: (i) => (takes[i]?.tape ? takes[i].tape.map((e) => ({ ...e })) : []),
      state: (i) => machine.state(i),
      states: () => machine.states(),
      slots: SLOTS,
    },
    /** what a loop is doing, for a page that wants to say so and for a check */
    looping: (i = 0) => !!takes[i]?.going,
    /** how many key movements are on a take, or 0 when there is none */
    taped: (i = 0) => (takes[i]?.tape ? takes[i].tape.length : 0),
    /** how far this keyboard has moved from where it was built, in semitones */
    displacement: () => base - HOME,
    /** the naming control's two buttons, in the order they are drawn */
    nameButtons: [letterBtn, degreeBtn],
    /** `letter` or `degree`. Relabels every key; nothing else moves. */
    setNaming(mode) {
      naming = mode === 'degree' ? 'degree' : 'letter';
      paintNaming();
      for (const k of keys) label(els.get(k), k);
      return naming;
    },
    naming: () => naming,
    /**
     * Which pitch class is `1`.
     *
     * ⚠️ A PAGE THAT KNOWS THE KEY SHOULD SAY SO. `/nola/` reads one off the
     * first chord in its line and prints it in the log; a keyboard left to
     * guess calls its own leftmost key the tonic, which is right until somebody
     * plays in anything but C.
     */
    setTonic(pc) {
      tonic = (((pc | 0) % 12) + 12) % 12;
      for (const k of keys) label(els.get(k), k);
      return tonic;
    },
    tonic: () => tonic,
    noteOf, keyOf, press, release,
    get base() { return base; },
    /**
     * Move the whole keyboard by octaves. Any note still held is released
     * FIRST and at its old pitch — shifting under a held key would send a
     * note-off for a note that was never started, and leave the real one
     * sounding forever.
     */
    shiftOctave(delta, opts) { return api.shiftBy(delta * 12, opts); },
    /**
     * Move the whole keyboard by SEMITONES. `shiftOctave` is this with a
     * multiplication in front of it, so there is one clamp, one release and one
     * relabel rather than two of each.
     */
    shiftBy(steps, { min = minBase, max = maxBase } = {}) {
      for (const k of [...held]) release(k, 'key');
      const was = base;
      base = Math.max(min, Math.min(max, base + steps));
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
    lightNote(note, on, who = 'self', vel = null) {
      const k = keyOf(note);
      /* 🔴 AND THIS IS WHERE A NOTE PLAYED PAST THE KEYS REACHES THE LOOP. See
         `tapeNote`. Only the plain lamp counts: `hint`, `ai` and `remote` are
         somebody else's notes or a suggestion nobody played, and looping those
         would record a proposal as a performance. `viaKey` excludes this
         component's own notes coming back through the page's callback. */
      if (who === 'self' && !viaKey && !replaying) {
        if (on) fingerNotes.add(note); else fingerNotes.delete(note);
      }
      if (who === 'self' && !viaKey) tapeNote(note, !!on, vel);
      if (!k) return;
      /* 🔴 `ai` IS A FOURTH LAMP AND NOT A FOURTH COLOUR OF THE SAME ONE. Asked
         2026-09-23: *"when fading, fade them also in keyboard so smaller are on
         top of larger"*. A proposal and a key under a finger are two different
         facts about one key and a player needs to see both at once, so this one
         paints a smaller mark INSIDE the dot rather than recolouring it. */
      const cls = who === 'remote' ? 'remote' : who === 'hint' ? 'hint'
        : who === 'ai' ? 'ai' : 'down';
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
