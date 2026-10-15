// demo/shell/keyboard.mjs: the one on-screen keyboard, and the pad under it.
// A key is lit by a NOTE, never by the press that caused it: `press()`/`release()` only report,
// `lightNote()` paints. A swipe scrolls the row and plays nothing; a drag plays once a note sounds.
// why: lessons/kit-keyboard.md#header

// A white key's floor is 49 px, two thirds of 74, measured at 390 CSS px on `/knobs/`.
// It clears Apple's 44 pt touch minimum by 5 px and Android's 48 dp by 1: there is no room below it.
// why: lessons/kit-keyboard.md#key-floor
import { createToggle } from './toggle.mjs';
// `numloop.mjs` owns which slot is doing what; this file owns what recording and looping mean.
// why: lessons/kit-keyboard.md#numloop-import
// `RATIOS` and `TEMPO_BAND` size the tempo and ratio cells' reserved widths, read off the module
// that decides them so a new ratio cannot leave a cell too narrow.
// why: lessons/kit-keyboard.md#ratios-import
import { createNumLoop, RATIOS, TEMPO_BAND } from './numloop.mjs';
// Notes to a chord name is `name.mjs`, not `chords.mjs` (which goes the other way).
// The chord cell's reserved width is computed from its `RECOGNISED` and `NOTE_LETTERS`.
// why: lessons/kit-keyboard.md#name-import
import { nameChord, RECOGNISED, NOTE_LETTERS } from './name.mjs';
// A key sounds two frames after the touch, outside the gesture, so building a keyboard installs
// the audio waker (see `audio.mjs`) or an iPhone keeps the page's AudioContext suspended.
// why: lessons/kit-keyboard.md#wake-audio
import { wakeAudioOnGesture } from './audio.mjs';

// Where a black key sits, as fractions of its own width (research/piano-key-proportions-2026-09.md):
// C#/D# a sixth, F#/A# a quarter, G# none, outward. Centring makes D, G, A 59 % of C's width.
// Keyed on pitch class, not letter, so any letter map still works.
// why: lessons/kit-keyboard.md#sharp-off
// 5 px, about an eighth of a key: clears the raised sharp's overlap while the name stays on its key.
// why: lessons/kit-keyboard.md#nudge-px
export const NUDGE_PX = 5;

export const SHARP_OFF = { 1: -1 / 6, 3: 1 / 6, 6: -1 / 4, 8: 0, 10: 1 / 4 };

// Half of the piano offset: measured on `/nola/` at 42.7 px a white key, nudge 0/0.5/1 gives narrowest
// white 16.51/19.78/23.04 px and black centre 1.00/2.27/5.54 px off its join. One for one trade.
// why: lessons/kit-keyboard.md#sharp-nudge
export const SHARP_NUDGE = 0.5;

/**
 * Put one key in the grid, and hand back the running white count.
 * Exported so `roll.mjs` lines up with the keys from the same arithmetic, never a second copy.
 * @param {HTMLElement} node   the element to place
 * @param {{sharp:boolean, whites:number, pitchClass:number}} o
 * @returns {number} the white count after this key
 * why: lessons/kit-keyboard.md#placekey
 */
export function placeKey(node, { sharp, whites, pitchClass }) {
  node.style.gridColumn = String(whites + 1);
  if (sharp) {
    const off = SHARP_OFF[pitchClass] * SHARP_NUDGE;
    if (off) node.style.setProperty('--k-off', String(off));
    // With no white key before it there is no join to straddle, so the sharp sits flush left.
    // why: lessons/kit-keyboard.md#opens-on-sharp
    if (whites === 0) node.style.transform = 'none';
  }
  return sharp ? whites : whites + 1;
}

export const KEY_MIN_PX = 49;

// 0.66, wider than a piano's 0.58, the same two thirds as the whites. 32 px of 49 is under the 44 px
// minimum; it pays with 46 px of height and by winning the overlap.
// why: lessons/kit-keyboard.md#black-ratio
export const BLACK_RATIO = 0.66;

// 10 px sideways inside the first two animation frames is a swipe: the row scrolls, no note is sent.
// 10 px is just over Chrome's ~8 px touch slop; 2 frames measured 33 ms at 60 Hz. The bias is toward
// the swipe. The note waits for the verdict: a finger pays ~33 ms, a mouse 0.1 ms.
// why: lessons/kit-keyboard.md#swipe
export const SWIPE_PX = 10;
export const SWIPE_FRAMES = 2;

/** QWERTY as a piano octave: the home row is white, the row above holds sharps. */
// `l` is 14, the D above the top C, because the whites are `a s d f g h j k l` and the blacks
// `w e t y u`. 13 would put a white letter on a black key.
// why: lessons/kit-keyboard.md#qwerty
export const QWERTY_CHROMATIC = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, l: 14 };
export const SHARP_KEYS = new Set(['w', 'e', 't', 'y', 'u']);

/**
 * A keyboard of N semitones. 25 keys is `span: 24`. Letters come off the map's values, never its order
 * (`QWERTY_CHROMATIC` has a gap at 13); a key with no letter gets the id `hi<semitone>`.
 * @param {number} [span] semitones from leftmost to rightmost key inclusive, so 24 gives 25 keys.
 * @returns {{map, keys, sharps, letters, whites}} `createKeyboard`'s four arguments plus the white count.
 *   Spread it: `createKeyboard(host, { ...keyRange(24), base: 48 })`.
 * why: lessons/kit-keyboard.md#keyrange
 */
export const KEY_SPAN_25 = 24;

export function keyRange(span = KEY_SPAN_25) {
  const map = {}, keys = [], sharps = new Set(), letters = new Set();
  /* the five pitch classes a piano paints black, which is a fact about a
     keyboard rather than about this letter map */
  const BLACK = new Set([1, 3, 6, 8, 10]);
  const letterAt = Object.fromEntries(
    Object.entries(QWERTY_CHROMATIC).map(([k, v]) => [v, k]));
  let whites = 0;
  for (let i = 0; i <= span; i++) {
    const id = letterAt[i] ?? `hi${i}`;
    map[id] = i;
    keys.push(id);
    if (BLACK.has(((i % 12) + 12) % 12)) sharps.add(id); else whites++;
    if (letterAt[i]) letters.add(id);
  }
  return { map, keys, sharps, letters, whites };
}

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
 * @param pad      `false` draws no octave pair and no `Panic`, for a chord
 *                 chart rather than an instrument. See the block beside it.
 * @returns {{el, keysEl, pad, noteOf, keyOf, press, release, base, shiftOctave,
 *            panic, lightNote, notes, chord, timing, destroy}}
 *          `el` is the WHOLE component — keys plus pad — so a page that places
 *          it by hand places both. `keysEl` is the key row alone.
 */
export function createKeyboard(host, {
  base = 60, map = QWERTY_CHROMATIC, sharps = SHARP_KEYS,
  onDown = () => {}, onUp = () => {}, keys: keyOpts = null,
  onPanic = null, onOctave = null, minBase = 24, maxBase = 96, letters = true,
  pad: wantPad = true, sustain: wantSustain = false, onSustain = null,
  /** `true` offers `Loop`; `'evolution'` builds it withdrawn, for `midi.mjs` to offer */
  loop: wantLoop = false, onLoop = null,
  /** how many takes this keyboard can hold. One is the button on its own; ten is
   *  a number pad driving it. */
  loops: wantLoops = 1,
  /** where this component says what its loop is doing. `d.log`, normally. */
  log = null,
  /** name the chord being held, in the footer. See the block beside it. */
  chord: wantChord = true,
  // `foot: true` adds a row of the page's own under the pad, returned as `api.foot`. The component
  // owns its rule and edges so no page hand-builds a border inside `.kbd`'s padding.
  // why: lessons/kit-keyboard.md#opt-foot
  foot: wantFoot = false,
  // The box spans its host instead of sizing to the keys. See `full` below.
  // why: lessons/kit-keyboard.md#opt-full
  full = false,
  swipeFrames = SWIPE_FRAMES, swipePx = SWIPE_PX,
} = {}) {
  wakeAudioOnGesture();
  // `letters` may be a Set of keys that carry a letter; the window bindings stay all or nothing.
  // why: lessons/kit-keyboard.md#opt-letters
  const keys = keyOpts || Object.keys(map);
  const noteOf = (k) => base + map[k];
  // A key carries its note name on top, because that is what an octave shift changes.
  // why: lessons/kit-keyboard.md#key-labels
  // `#`, not `♯` U+266F: neither vendored face has U+266F, and `#` matches the chord labels.
  // why: lessons/kit-keyboard.md#note-names
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  // A key is named as a note only; the scale degree naming was removed.
  // why: lessons/kit-keyboard.md#notename
  const noteName = (n) => `${NOTE_NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
  // A key's background never changes; a dot says held here, held elsewhere or part of a chord.
  // At rest there is no dot. The dot element is always in the DOM so the key's grid never shifts.
  // why: lessons/kit-keyboard.md#label-dot
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
  // `full` makes the box span its host; the keys keep their own 49 to 62 px range inside it. Opt in.
  // why: lessons/kit-keyboard.md#full
  if (full) el.classList.add('kbd-full');
  const keysEl = make('div', 'keys');
  const els = new Map();
  const letterOf = new Map();         // element -> letter, for the hit test
  const colOf = new Map();            // letter -> white column it was placed at

  // One grid column per white key; a black takes the column starting at its join and `shell.css`
  // pulls it back by half its width plus half a gap. `--k-cols` is the white count, 8 an octave.
  // why: lessons/kit-keyboard.md#key-grid
  // Black keys are offset like a real piano's, not centred: measured at 390 px the narrowest white goes
  // 19.67 to 27.00 px, row width stays 413 px. Read off the pitch class, not the letter.
  // why: lessons/kit-keyboard.md#black-offsets
  // Which shoulder of a white key has a black key on it decides where its name sits.
  // Asked of this keyboard's own map, since an edge key has no neighbour on screen.
  // why: lessons/kit-keyboard.md#shoulders
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
      // A length, not a percentage: `translateX` on a percentage is of the label, which varies in width.
      // why: lessons/kit-keyboard.md#name-nudge
      if (right && !left) b.style.setProperty('--kn-x', `${-NUDGE_PX}px`);
      else if (left && !right) b.style.setProperty('--kn-x', `${NUDGE_PX}px`);
    }
    colOf.set(k, whites);
    whites = placeKey(b, { sharp, whites, pitchClass: ((map[k] % 12) + 12) % 12 });
    els.set(k, b);
    letterOf.set(b, k);
    keysEl.append(b);
  }
  keysEl.style.setProperty('--k-cols', String(Math.max(1, whites)));
  el.append(keysEl);

  // Pointer capture is on the row so a slide is one gesture, hit-tested per move with
  // `elementFromPoint` (topmost wins, so the raised black key wins). Capture is wrapped: it throws on
  // a scripted event. A touch is undecided and silent until the verdict; mouse and stylus are not.
  // why: lessons/kit-keyboard.md#finger
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

  // Move a gesture onto a key, sounding and releasing as it goes. While undecided it only
  // remembers where the finger is; `playing` makes it audible.
  // why: lessons/kit-keyboard.md#moveto
  function moveTo(t, k) {
    if (!t || t.key === k) return;
    const was = t.key;
    t.key = k;
    if (!t.playing) return;
    if (was != null && !heldByAnother(was, t)) release(was, 'pointer');
    if (k != null) press(k, 'pointer');
  }

  // Timed on `requestAnimationFrame`: a 30 ms `setTimeout` set during a touch measured 101 ms in
  // Chrome, which deprioritises timers for about 100 ms after a touch begins.
  // why: lessons/kit-keyboard.md#armverdict
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
    // Sideways only: the row scrolls sideways, and sliding down off the keys is leaving the keyboard.
    // why: lessons/kit-keyboard.md#sideways
    if (!t.playing && Math.abs(t.x - t.x0) >= swipePx) { abandon(e.pointerId); return; }
    moveTo(t, keyAtPoint(t.x, t.y));
  });

  // `touch-action` is read once at touch start, so this non-passive `touchmove` stops the browser
  // scrolling once a note sounds. Never while undecided, or a swipe could not scroll.
  // why: lessons/kit-keyboard.md#ontouchmove
  const onTouchMove = (e) => {
    for (const t of touches.values()) if (t.playing) { e.preventDefault(); return; }
  };
  keysEl.addEventListener('touchmove', onTouchMove, { passive: false });

  // `lostpointercapture` delivers no pointerup, so it ends the touch too; `pointercancel` means the
  // browser took it for a scroll. Same path: what sounded stops.
  // why: lessons/kit-keyboard.md#endtouch
  const endTouch = (e) => abandon(e.pointerId);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    keysEl.addEventListener(type, endTouch);
  }

  // Two quick taps are two notes, never a zoom: `pan-x` says nothing about double tap, so
  // `preventDefault` on a second `touchend` inside 350 ms. The audio waker still hears the event.
  // why: lessons/kit-keyboard.md#double-tap
  let lastTouchEnd = 0;
  const onTouchEnd = (e) => {
    const now = e.timeStamp;
    if (now - lastTouchEnd < 350 && e.cancelable) e.preventDefault();
    lastTouchEnd = now;
  };
  keysEl.addEventListener('touchend', onTouchEnd, { passive: false });


  // No word on the octave pair: the keys already print their octave.
  // why: lessons/kit-keyboard.md#pad
  // `pad: false` is for a chord chart, which is a picture and not an instrument. Not a way to move
  // the pad elsewhere: a page building its own octave buttons hand-rolls a control that exists.
  // why: lessons/kit-keyboard.md#pad-optional
  const pad = make('div', 'kpad');
  // Two boxes and `space-between` instead of an auto margin, so a wrapped line starts at the left.
  // Adding or removing a control is one line and no CSS.
  // why: lessons/kit-keyboard.md#pad-groups
  const padStart = make('div', 'kpad-grp kpad-grp-start');
  const padEnd = make('div', 'kpad-grp kpad-grp-end');
  // It wears `.step`, the stepper's segmented geometry; `shell.css` only changes the size here.
  // why: lessons/kit-keyboard.md#octpair
  // why: lessons/kit-keyboard.md#naming-pair

  const octPair = make('span', 'step pos-seg kpad-oct');
  // Shift transposes by a semitone without changing the drawn shape: every key's name moves and a key
  // plays what it says. Callers derive sharps from the key index, assuming base C.
  // why: lessons/kit-keyboard.md#transpose
  const mkOct = (text, title, steps) => {
    const b = make('button', 'ico', text, { type: 'button', title });
    b.onclick = (e) => api.shiftBy(e.shiftKey ? Math.sign(steps) : steps);
    octPair.append(b);
    return b;
  };
  const downBtn = mkOct('−', 'down one octave (z), or one semitone with shift', -12);
  const upBtn = mkOct('+', 'up one octave (x), or one semitone with shift', 12);
  // Whatever is appended here is built above: appending before its `const` is a temporal dead zone.
  // why: lessons/kit-keyboard.md#pad-order
  padStart.append(octPair);
  // The displacement from where this keyboard started, which no key shows. Whole octaves read `+1`;
  // anything else carries its unit, `+7st`.
  // why: lessons/kit-keyboard.md#displacement
  const atEl = make('span', 'kpad-at', '');
  const HOME = base;
  const paintAt = () => {
    const d = base - HOME;
    atEl.textContent = d === 0 ? '0'
      : d % 12 === 0 ? `${d > 0 ? '+' : '−'}${Math.abs(d) / 12}`
      : `${d > 0 ? '+' : '−'}${Math.abs(d)}st`;
    // Deleted, never set to `''`: `[data-home]` matches on presence.
    // why: lessons/kit-keyboard.md#data-home
    if (d === 0) atEl.dataset.home = '1'; else delete atEl.dataset.home;
  };
  padStart.append(atEl);
  // The chord being held, in a cell reserved in `ch` for the widest name `name.mjs` can return, so
  // the row never moves in x. A separate cell, not a joined string. `--dim` sure, `--dim2` a guess.
  // why: lessons/kit-keyboard.md#chord-cell
  const LETTER_CH = Math.max(...NOTE_LETTERS.map((l) => l.length));
  const CHORD_CH = LETTER_CH + Math.max(...RECOGNISED.map(([q]) => q.length))
                 + 1 + LETTER_CH;
  const chordEl = wantChord ? make('span', 'kpad-chord', '') : null;
  if (chordEl) {
    chordEl.style.minWidth = `${CHORD_CH}ch`;
    padStart.append(chordEl);
  }
  // Only with `loop`. No tempo is an empty cell, never `0` or `120`; `heard` or `set` says where it
  // came from; `as played` is a refused snap. Widths reserved from `TEMPO_BAND` and `RATIOS`.
  // why: lessons/kit-keyboard.md#tune-cells
  const TEMPO_CH = String(Math.round(TEMPO_BAND[1])).length + ' bpm '.length
                 + Math.max('heard'.length, 'set'.length);
  const RATIO_CH = Math.max('as played'.length, 'first'.length,
                            ...RATIOS.map((x) => x.label.length + 1));
  const tempoEl = wantLoop ? make('span', 'kpad-tempo', '') : null;
  const ratioEl = wantLoop ? make('span', 'kpad-ratio', '') : null;
  if (tempoEl) {
    tempoEl.style.minWidth = `${TEMPO_CH}ch`;
    ratioEl.style.minWidth = `${RATIO_CH}ch`;
    padStart.append(tempoEl, ratioEl);
  }
  // `Stop`: it stops every note and every loop.
  // why: lessons/kit-keyboard.md#stop
  const panicBtn = make('button', '', 'Stop', {
    type: 'button', title: 'stop every note and every loop',
  });
  panicBtn.onclick = () => api.panic();
  // The damper toggle in the pad. It only reports a foot went down; the page decides what that does.
  // Off by default.
  // why: lessons/kit-keyboard.md#sustain
  // `Loop` is a keyboard function, not a page mode. The component reports on/off; the page decides
  // what looping is on its own graph. Off by default.
  // why: lessons/kit-keyboard.md#loop-button
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
  // The far end's box pushes these right and keeps them together on a wrap. A fourth control is
  // one more entry here and no CSS.
  // why: lessons/kit-keyboard.md#pad-end
  padEnd.append(...[loopBtn?.el, sustainBtn?.el, panicBtn].filter(Boolean));
  pad.append(padStart, padEnd);
  if (wantPad) el.append(pad);
  // The page's row goes in last; its rule bleeds through `--kbd-pad` to the box border. See
  // `.kbd-foot` in `shell.css`.
  // why: lessons/kit-keyboard.md#foot-el
  const footEl = wantFoot ? make('div', 'kbd-foot') : null;
  if (footEl) el.append(footEl);

  host.append(el);

  const held = new Set();

  // One funnel: every note this component produces goes through one `press` and one `release`.
  // why: lessons/kit-keyboard.md#funnel
  // Set while inside the page's callback, so `lightNote` can tell this component's own note coming
  // back from one the page played, and a key press is not taped twice.
  // why: lessons/kit-keyboard.md#viakey
  let viaKey = 0;

  // Two sets: `held` keys from this funnel and `fingerNotes` lit from outside (MIDI). `hint`, `remote`
  // and `ai` are not in it. Notes, not keys, so a note past the drawn range still counts.
  // why: lessons/kit-keyboard.md#sounding
  const sounding = () => {
    const out = new Set();
    for (const k of held) out.add(noteOf(k));
    for (const n of fingerNotes) out.add(n);
    return [...out];
  };

  // Below two notes the cell is empty: the key already says it. No settling window; the name may
  // flicker while a chord is rolled, the layout does not.
  // why: lessons/kit-keyboard.md#paintchord
  function paintChord() {
    if (!chordEl) return;
    const down = sounding();
    const r = down.length >= 2 ? nameChord(down) : null;
    chordEl.textContent = r?.ok ? r.label : '';
    // Deleted, never set to `''`: `[data-sure]` matches on presence.
    // why: lessons/kit-keyboard.md#data-sure
    if (r?.sure) chordEl.dataset.sure = '1'; else delete chordEl.dataset.sure;
  }

  function press(k, how = 'key') {
    if (!(k in map) || held.has(k)) return;
    held.add(k);
    onTape(k, true);
    viaKey++;
    try { onDown(noteOf(k), how); } finally { viaKey--; }
    paintChord();
  }

  function release(k, how = 'key') {
    if (!held.has(k)) return;
    held.delete(k);
    onTape(k, false);
    viaKey++;
    try { onUp(noteOf(k), how); } finally { viaKey--; }
    paintChord();
  }

  // The loop lives in the keyboard, not a page: playback goes through `press`/`release` with `how`
  // `loop`. It records keys, so it follows the octave pad. A lap is the take; no clock, no grid.
  // why: lessons/kit-keyboard.md#loop
  // Ten takes, run by `numloop.mjs`'s state machine. A take is a list of key movements, no audio.
  // why: lessons/kit-keyboard.md#slots
  const SLOTS = Math.max(1, Math.round(wantLoops));
  const takes = Array.from({ length: SLOTS }, () => ({
    tape: null,        // the movements, or null when this slot is empty
    at: 0,             // when the first movement landed. See the lead-in note below
    lap: 0,            // how long one turn is
    timers: new Set(), // pending timeouts; each one leaves the set when it fires
    going: false,      // is this slot playing right now
    rec: false,        // is this slot taking movements right now
    keys: new Set(),   // what this slot has down, which is NOT the same as `held`
    notes: new Set(),
    outside: 0,        // movements that came in past the keys, for the log
    pressedAt: 0,      // when the button was touched. See `onTouch` below
    // `numloop.mjs`'s whole fit answer, or null while empty: `lap` alone cannot say if or why it snapped.
    // why: lessons/kit-keyboard.md#take-fit
    fit: null,
  }));

  // Notes coming back, not going in: without it loop 2 would record loop 1 and compound every lap.
  // why: lessons/kit-keyboard.md#replaying
  let replaying = 0;

  // A note can be held by a finger and a loop at once and a set cannot count, so a loop never
  // presses or releases a note a finger is on.
  // why: lessons/kit-keyboard.md#fingernotes
  const fingerNotes = new Set();

  // The take starts at the first note, not at the button. Trailing silence is kept, the lead-in dropped.
  // why: lessons/kit-keyboard.md#startclock
  const startClock = (t, at) => { if (!t.at) t.at = at; };

  // A loop button lands late, so arming reaches back to the start of the phrase (from when nothing
  // sounded), at most 1200 ms ago. The buffer holds 4 s of movements, not audio.
  // why: lessons/kit-keyboard.md#pre-roll
  const PRE_ROLL = 4000, REACH_BACK = 1200;
  const recent = [];

  // The buffer holds only what no take has claimed, or arming take 2 would replay take 1's phrase.
  // why: lessons/kit-keyboard.md#remember
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

  // MIDI notes never reach `press`, but every page lights what it sounds, so the loop records at
  // `lightNote`. Records the note, not a key, so it does not follow the octave pad.
  // why: lessons/kit-keyboard.md#tapenote
  // Carries velocity, or a layered sampler replays a soft phrase as a hard one. `null` means nobody
  // said, and the page's default stands.
  // why: lessons/kit-keyboard.md#velocity
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

  // Stopping mid note must release it, or the due note-off never comes.
  // why: lessons/kit-keyboard.md#stoptake
  const stopTake = (i) => {
    const t = takes[i];
    for (const timer of t.timers) clearTimeout(timer);
    t.timers.clear();
    t.going = false;
    t.rec = false;
    // Lets go of what the loop had down and nothing else; a finger's note stays.
    // why: lessons/kit-keyboard.md#stoptake-keys
    for (const k of t.keys) release(k, 'loop');
    t.keys.clear();
    for (const n of t.notes) { if (!fingerNotes.has(n)) onUp(n, 'loop'); }
    t.notes.clear();
  };

  // Every event is due at `anchor + n * lap`, never relative to the last round, so timer lateness
  // does not accumulate. A due time in the past fires at once rather than being skipped.
  // why: lessons/kit-keyboard.md#absolute-grid
  /* A timer that leaves `t.timers` when it fires, so the set holds only what is
     still pending rather than growing by a lap's worth of events every lap. */
  const later = (t, fn, ms) => {
    const id = setTimeout(() => { t.timers.delete(id); fn(); }, ms);
    t.timers.add(id);
  };

  const runTake = (i) => {
    const t = takes[i];
    t.anchor = performance.now();
    let lapNo = 0;
    const round = () => {
      if (!t.going) return;
      const base = t.anchor + lapNo * t.lap;
      for (const e of t.tape) {
        later(t, () => {
          if (!t.going) return;
          replaying++;
          try {
            // A key replays through `press` (follows the pad, lights up); a note past the keys goes to the page.
            // why: lessons/kit-keyboard.md#replay-kinds
            if (e.k !== undefined) {
              // `held` mixes fingers and loops, so `t.keys` says which keys this loop pressed.
              // why: lessons/kit-keyboard.md#replay-finger
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
        }, Math.max(0, base + e.t - performance.now()));
      }
      lapNo++;
      later(t, round, Math.max(0, t.anchor + lapNo * t.lap - performance.now()));
    };
    round();
  };

  // 250 ms floor on the lap: a near-zero take looped 118 times in 260 ms in `/kit/`'s check.
  // why: lessons/kit-keyboard.md#min-lap
  const MIN_LAP = 250;

  const paintLoop = () => {
    if (!loopBtn) return;
    const s = machine.state(0);
    loopBtn.set(s === 'recording' || s === 'looping', true);
    if (s === 'empty') loopBtn.el.removeAttribute('data-loop');
    else loopBtn.el.setAttribute('data-loop', s);
  };

  // The ratio cell describes the take most recently closed, and lets go when that slot is cleared.
  // why: lessons/kit-keyboard.md#lastfit
  let lastFit = null, lastFitSlot = -1;

  // Empty cell for no tempo, `as played` for a refused snap. Side effect free: only readers are called.
  // why: lessons/kit-keyboard.md#painttune
  const paintTune = () => {
    if (!tempoEl) return;
    const tu = machine.tempo();
    if (!(tu.bpm > 0) || tu.source === 'none') {
      tempoEl.textContent = '';
      delete tempoEl.dataset.said;
    } else {
      tempoEl.textContent = `${Math.round(tu.bpm)} bpm ${tu.source === 'given' ? 'set' : 'heard'}`;
      if (tu.source === 'given') tempoEl.dataset.said = '1';
      else delete tempoEl.dataset.said;
    }
    /* The unit going means every slot is empty, so there is no take left for the
       cell to be describing. `numloop.mjs` owns when that happens and this only
       reads it. */
    if (!machine.unit()) { lastFit = null; lastFitSlot = -1; }
    ratioEl.textContent = !lastFit ? ''
      : lastFit.first ? 'first'
      : lastFit.snapped ? `x${lastFit.label}`
      : 'as played';
  };

  const enterLoop = (i, to, was) => {
    const t = takes[i];
    const n = SLOTS > 1 ? `loop ${i + 1}` : 'loop';
    if (to === 'recording') {
      t.tape = []; t.at = 0; t.outside = 0; t.going = false; t.rec = true; t.fit = null;
      // The phrase already played goes in first; see `phraseStart`. Notes inside the 250 ms double press
      // window are in the buffer and arrive here.
      // why: lessons/kit-keyboard.md#phrase-first
      const from = phraseStart(t.pressedAt);
      if (from) {
        t.at = from;
        for (const m of recent) {
          if (m.at < from) continue;
          const e = { down: m.down, t: Math.round(m.at - from) };
          if (m.k !== undefined) e.k = m.k; else { e.note = m.note; e.v = m.vel; t.outside++; }
          t.tape.push(e);
        }
        // Arming consumes what it reached back for, so a second take cannot claim the same phrase.
        // why: lessons/kit-keyboard.md#claim-once
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
        // Measured to the press, not the settle, or the 250 ms double press wait lands inside the lap
        // (12 % at a 2 s loop). `onTouch` stamps the real moment.
        // why: lessons/kit-keyboard.md#lap-press
        const raw = t.at ? Math.round(t.pressedAt - t.at) : 0;
        if (!t.tape || !t.tape.length) {
          // Nothing played is not a loop: the slot goes back to empty.
          // why: lessons/kit-keyboard.md#empty-take
          stopTake(i);
          t.tape = null;
          machine.clear(i);
          log?.(`nothing was played into ${n}, so there is no loop`, 'warn');
          paintLoop();
          paintTune();
          onLoop?.(false, { slot: i, state: 'empty' });
          return;
        }
        // `fitLap` is the one call that aligns a lap to the first. The 250 ms floor applies first; onsets
        // are key-downs only, or hold lengths would read as gaps and double the tempo.
        // why: lessons/kit-keyboard.md#fitlap
        const heardBefore = machine.tempo().source;
        const fit = machine.fitLap(i, Math.max(MIN_LAP, raw), {
          onsets: t.tape.filter((e) => e.down).map((e) => e.t),
        });
        t.lap = fit.lap;
        t.fit = fit;
        lastFit = fit; lastFitSlot = i;
        const fromKeys = t.tape.length - t.outside;
        log?.(`${n} is going round: ${t.tape.length} movement(s) over ${t.lap} ms`
            + `${raw < MIN_LAP ? `, the take being ${raw} ms and held to the 250 ms floor` : ''}`
            + `${t.outside ? `, ${t.outside} of them played past the keys on screen` : ''}`
            + `${fromKeys && t.outside ? ` and ${fromKeys} on them` : ''}`);
        // A lap that changed under a player must say so; `fit.why` is the deciding module's own sentence.
        // why: lessons/kit-keyboard.md#log-fit
        log?.(fit.why);
        if (heardBefore === 'none' && machine.tempo().source !== 'none') {
          log?.(machine.tempo().why);
        }
      } else {
        log?.(`${n} is playing again`);
      }
      t.going = true;
      runTake(i);
      // Sent on replay as well as close: `t.fit` is a fact about the take, not the press.
      // why: lessons/kit-keyboard.md#onloop-fields
      onLoop?.(true, { slot: i, state: 'looping', lap: t.lap, moves: t.tape.length,
                       outside: t.outside,
                       ratio: t.fit?.label || '', snapped: !!t.fit?.snapped,
                       bpm: machine.tempo().bpm, tempoSource: machine.tempo().source });
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
      t.fit = null;
      // The cell lets go with the slot it was describing.
      // why: lessons/kit-keyboard.md#clear-ratio
      if (i === lastFitSlot) { lastFit = null; lastFitSlot = -1; }
      if (had) log?.(`${n} thrown away, ${had} movement(s) with it`);
      onLoop?.(false, { slot: i, state: 'empty' });
    }
    paintLoop();
    paintTune();
  };

  // `/num/`'s machine press for press: empty, recording, looping, stopped. A double press throws a take
  // away. The button is slot 1, so `loops: 1` is one take on one button.
  // why: lessons/kit-keyboard.md#machine
  const machine = createNumLoop({
    slots: SLOTS,
    onTouch: (i) => { takes[i].pressedAt = performance.now(); },
    onEnter: (i, to, o) => enterLoop(i, to, o.was),
  });
  // Painted once at build so the two cells open empty by decision.
  // why: lessons/kit-keyboard.md#painttune-build
  paintTune();

  function setLoop() { machine.press(0); }

  /**
   * Offer the `Loop` control or take it away; the page decides what `connected` means. A sounding loop
   * is stopped and kept, never cleared. The tempo and ratio cells go with it, which lets the row fit
   * on one line at 375 px. Removed and re-appended, not `[hidden]`.
   * @param {boolean} present
   * @returns {boolean} whether the control is now in the row
   * why: lessons/kit-keyboard.md#offerloop
   */
  function offerLoop(present) {
    if (!loopBtn) return false;
    const want = !!present;
    if (want === padEnd.contains(loopBtn.el)) return want;
    if (want) {
      padEnd.prepend(loopBtn.el);
      /* The two cells were appended last, so appending puts them back where
         they were: after the chord name and before the row's far end. */
      if (tempoEl) padStart.append(tempoEl, ratioEl);
    } else {
      for (let i = 0; i < SLOTS; i++) {
        /* `recording` needs two presses: one closes the take into a loop and the
           second stops it. Reading the state again between them is what makes
           that two steps rather than an assumption about the walk. */
        if (machine.state(i) === 'recording') { machine.press(i); machine.settle(i); }
        if (machine.state(i) === 'looping') { machine.press(i); machine.settle(i); }
      }
      loopBtn.el.remove();
      if (tempoEl) { tempoEl.remove(); ratioEl.remove(); }
    }
    paintLoop();
    return want;
  }

  // An octave button at the end of the range that still looks pressable is a
  // control that lies about having somewhere to go.
  function paintPad() {
    downBtn.disabled = base <= minBase;
    upBtn.disabled = base >= maxBase;
    paintAt();
  }
  paintPad();
  // `loop: 'evolution'` builds the control withdrawn; `midi.mjs` calls `offerLoop` when it sees the
  // port. Absent then offered, never a control vanishing under a hand.
  // why: lessons/kit-keyboard.md#loop-evolution
  if (wantLoop === 'evolution') offerLoop(false);

  // `z` and `x` move the octave, under the left hand and away from `a`..`k`.
  // why: lessons/kit-keyboard.md#oct-keys
  const OCT_KEYS = { z: -1, x: 1 };

  // preventDefault ONLY on mapped keys, or typing anywhere else on the page
  // stops working.
  const onKeyDown = (e) => {
    if (e.repeat) return;
    // Not while somebody is typing in a field: this listener is on `window`.
    // why: lessons/kit-keyboard.md#not-typing
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
  // The letter row is optional because two keyboards on one page both hear `window`.
  // why: lessons/kit-keyboard.md#letters
  if (letters) {
    addEventListener('keydown', onKeyDown);
    addEventListener('keyup', onKeyUp);
    addEventListener('blur', onBlur);
  }

  /** Split zones: `[{ lo, hi, label }]` by note. A narrow track at each split point and each
   *  zone named above its keys; `[]` puts the plain keyboard back. Kept across octave shifts. */
  let zoneList = [], zoneEls = [];
  function zones(list = zoneList) {
    zoneList = list || [];
    zoneEls.forEach((e) => e.remove()); zoneEls = [];
    const whiteKeys = keys.filter((k) => !sharps.has(k));
    if (!zoneList.length) {
      keysEl.style.removeProperty('grid-template-columns');
      keysEl.classList.remove('kbd-zoned');
      for (const [k, b] of els) { b.style.gridColumn = String(colOf.get(k) + 1); b.style.gridRow = ''; }
      return;
    }
    const zoneOf = (n) => zoneList.findIndex((z) => n >= (z.lo ?? 0) && n <= (z.hi ?? 127));
    const tracks = [], trackOf = [], runs = [];
    whiteKeys.forEach((k, i) => {
      const z = zoneOf(noteOf(k));
      if (i > 0 && z !== runs[runs.length - 1].z) { tracks.push('var(--k-split, 14px)'); runs.push({ z, from: tracks.length }); }
      else if (i === 0) runs.push({ z, from: 0 });
      trackOf[i] = tracks.length;
      tracks.push('minmax(var(--k-min, 49px), var(--k-max, 62px))');
      runs[runs.length - 1].to = tracks.length;
    });
    keysEl.style.gridTemplateColumns = tracks.join(' ');
    keysEl.classList.add('kbd-zoned');
    for (const [k, b] of els) {
      const c = colOf.get(k);
      b.style.gridColumn = String((trackOf[c] ?? tracks.length) + 1);
      b.style.gridRow = '2';
    }
    for (const r of runs) {
      const lab = make('div', 'kbd-zone', r.z >= 0 ? zoneList[r.z].label || '' : '');
      lab.style.gridColumn = `${r.from + 1} / ${r.to + 1}`;
      lab.style.gridRow = '1';
      keysEl.append(lab);
      zoneEls.push(lab);
    }
  }
  const api = {
    el, keysEl, pad, zones,
    // The page's own row inside the keyboard's box, or `null` without `foot: true`.
    // why: lessons/kit-keyboard.md#api-foot
    foot: footEl,
    /** the three pad buttons, in the order they are drawn — for a page's own check */
    padButtons: [downBtn, upBtn, panicBtn],
    /** the displacement readout, so a check reads what a player reads */
    atEl,
    // The damper control, or `null`. `set(on, quiet)` moves the lamp without calling back into the page.
    // why: lessons/kit-keyboard.md#api-sustain
    sustain: sustainBtn,
    /** the `Loop` toggle, or null when the caller did not ask for one */
    loop: loopBtn,
    // Put the `Loop` control in or out of the row; see `offerLoop`.
    // why: lessons/kit-keyboard.md#api-offerloop
    offerLoop,
    /** whether the `Loop` control is in the row right now */
    loopOffered: () => !!loopBtn && padEnd.contains(loopBtn.el),
    // The takes: `press(i)` with a slot gives `/num/`'s behaviour. The page maps its pad to slots.
    // `settle` is for a check: it runs a held press now.
    // why: lessons/kit-keyboard.md#api-loops
    loops: {
      press: (i) => machine.press(i),
      settle: (i) => machine.settle(i),
      clear: (i) => machine.clear(i),
      // Empties the reach-back buffer, not a take, so the next arm starts from silence.
      // why: lessons/kit-keyboard.md#loops-forget
      forget: () => { recent.length = 0; },
      /** one turn of a take in ms, for a page reporting on its own timing */
      lap: (i) => takes[i]?.lap || 0,
      /** what is on a take, so a tap can compare it against what was heard */
      tape: (i) => (takes[i]?.tape ? takes[i].tape.map((e) => ({ ...e })) : []),
      state: (i) => machine.state(i),
      states: () => machine.states(),
      slots: SLOTS,
      // `bpm` is `null` when nobody has played one; `source` and `why` say where it came from.
      // why: lessons/kit-keyboard.md#loops-tempo
      tempo: () => machine.tempo(),
      /** the length every later loop is aligned to and which slot set it, or null */
      unit: () => machine.unit(),
      // How this slot's lap was fitted, or `null`. A copy, so a caller cannot edit it.
      // why: lessons/kit-keyboard.md#loops-fit
      fit: (i) => (takes[i]?.fit ? { ...takes[i].fit } : null),
      // A page with its own clock states the tempo; the cell then says `set`, not `heard`.
      // why: lessons/kit-keyboard.md#loops-assume
      assume(bpm) { const r = machine.assume(bpm); paintTune(); return r; },
      // Drop the unit and tempo without clearing a slot, so a check can put the keyboard back.
      // why: lessons/kit-keyboard.md#loops-releaseunit
      releaseUnit() { machine.releaseUnit(); paintTune(); },
    },
    /** what a loop is doing, for a page that wants to say so and for a check */
    looping: (i = 0) => !!takes[i]?.going,
    /** how many key movements are on a take, or 0 when there is none */
    taped: (i = 0) => (takes[i]?.tape ? takes[i].tape.length : 0),
    /** how far this keyboard has moved from where it was built, in semitones */
    displacement: () => base - HOME,
    // why: lessons/kit-keyboard.md#removed-naming
    noteOf, keyOf, press, release,
    get base() { return base; },
    // Move the whole keyboard by octaves. Held notes are released first at their old pitch.
    // why: lessons/kit-keyboard.md#shiftoctave
    shiftOctave(delta, opts) { return api.shiftBy(delta * 12, opts); },
    // Move the whole keyboard by semitones; `shiftOctave` calls this, so one clamp and one relabel.
    // why: lessons/kit-keyboard.md#shiftby
    shiftBy(steps, { min = minBase, max = maxBase } = {}) {
      for (const k of [...held]) release(k, 'key');
      const was = base;
      base = Math.max(min, Math.min(max, base + steps));
      for (const k of keys) label(els.get(k), k);      // every note name moved
      if (zoneList.length) zones();
      paintPad();
      // Only on a real move: at the end of the range the press did nothing,
      // and a log line saying the octave changed when it did not is worse
      // than silence.
      if (base !== was) onOctave?.(base);
      return base;
    },
    // Stop everything: held keys release through the normal path, then the paint is cleared by hand
    // because a MIDI-lit note was never pressed here. `remote` keys are left alone.
    // why: lessons/kit-keyboard.md#panic
    panic() {
      // Forget the fingers too, or a pointer still down sends a second note-off or re-presses on move.
      // why: lessons/kit-keyboard.md#panic-fingers
      for (const t of touches.values()) if (t.raf) cancelAnimationFrame(t.raf);
      touches.clear();
      for (const k of [...held]) release(k, 'panic');
      // Every loop stops too, through the same walk `offerLoop(false)` uses.
      // why: lessons/kit-keyboard.md#panic-loops
      for (let i = 0; i < SLOTS; i++) {
        if (machine.state(i) === 'recording') { machine.press(i); machine.settle(i); }
        if (machine.state(i) === 'looping') { machine.press(i); machine.settle(i); }
      }
      for (const t of takes) {
        for (const n of t.notes) onUp(n, 'panic');
        t.notes.clear();
        t.keys.clear();
      }
      for (const b of els.values()) b.classList.remove('down');
      // Notes lit from outside go with the paint, or the footer names a chord after Stop.
      // why: lessons/kit-keyboard.md#panic-fingernotes
      fingerNotes.clear();
      paintChord();
      onPanic?.();
    },
    // Paint a key. `who` is 'self', 'remote', 'hint' or 'ai': separate classes, so a key can be hinted
    // and held at once. `hint` is muted grey: a chord nobody is holding.
    // why: lessons/kit-keyboard.md#lightnote
    lightNote(note, on, who = 'self', vel = null) {
      const k = keyOf(note);
      // Where a note played past the keys reaches the loop. Only 'self' counts; `viaKey` excludes our own.
      // why: lessons/kit-keyboard.md#lightnote-tape
      if (who === 'self' && !viaKey && !replaying) {
        if (on) fingerNotes.add(note); else fingerNotes.delete(note);
      }
      if (who === 'self' && !viaKey) tapeNote(note, !!on, vel);
      // Repainted here because a MIDI note only arrives through `lightNote`. Before `if (!k) return`,
      // so a note past the drawn range still counts.
      // why: lessons/kit-keyboard.md#lightnote-chord
      paintChord();
      if (!k) return;
      // `ai` is a smaller mark inside the dot, so a proposal and a held key show at once.
      // why: lessons/kit-keyboard.md#ai-lamp
      const cls = who === 'remote' ? 'remote' : who === 'hint' ? 'hint'
        : who === 'ai' ? 'ai' : 'down';
      els.get(k)?.classList.toggle(cls, !!on);
    },
    /** every note this keyboard can produce, for a caller that needs the range */
    notes: () => keys.map(noteOf),
    // The footer's reading and its element, so a check can read it and measure that it does not move.
    // why: lessons/kit-keyboard.md#api-chord
    chord: () => {
      const down = sounding();
      const r = down.length >= 2 ? nameChord(down) : null;
      return { el: chordEl, notes: down, name: chordEl ? chordEl.textContent : '',
               sure: !!r?.sure, reading: r };
    },
    // The two loop cells' drawn text and elements, read off the screen, not re-derived from state.
    // why: lessons/kit-keyboard.md#api-tune
    tune: () => ({
      tempoEl,
      ratioEl,
      tempo: tempoEl ? tempoEl.textContent : '',
      ratio: ratioEl ? ratioEl.textContent : '',
      reading: machine.tempo(),
      unit: machine.unit(),
    }),
    /** what this keyboard was built with, so a check can grade the numbers as well as the machinery */
    timing: { swipeFrames, swipePx, keyMinPx: KEY_MIN_PX, blackRatio: BLACK_RATIO },
    // Three listeners are on `window`, so removing the element does not remove the keyboard. For checks.
    // why: lessons/kit-keyboard.md#destroy
    destroy() {
      for (let i = 0; i < SLOTS; i++) stopTake(i);
      api.panic();
      if (letters) {
        removeEventListener('keydown', onKeyDown);
        removeEventListener('keyup', onKeyUp);
        removeEventListener('blur', onBlur);
      }
      keysEl.removeEventListener('touchmove', onTouchMove);
      keysEl.removeEventListener('touchend', onTouchEnd);
      el.remove();
    },
  };
  return api;
}
