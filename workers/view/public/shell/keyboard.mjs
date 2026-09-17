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
// Three things this had never done, asked for together because each one needs
// the one before it.
//
// 🔴 A KEY IS AS WIDE AS IT IS TALL ON A PHONE, AND THE ROW SCROLLS. MEASURED
// on `/knobs/` at 390 CSS px before the change: thirteen keys across 358 px of
// page, **24.77 px each**, against a 44 px minimum touch target. That is a
// keyboard you cannot hit. The floor is `--k-min` and the keys keep `flex: 1`,
// so a wide screen still divides the room between them and nothing about the
// desktop layout moves; a narrow one hits the floor and overflows, and the row
// is a scroller.
//
// 🔴 SLIDING ACROSS THE KEYS PLAYS THEM. That is what a piano does and this
// could not, because every key called `setPointerCapture` ON ITSELF — so the
// first key a finger touched owned the gesture and no other key ever saw it.
// The capture moves to the ROW: one pointer, hit-tested against whatever is
// under it, releasing the note it leaves and sounding the note it enters.
// Capture is still needed, and on the row it is the thing that makes a finger
// dragged off the bottom of the keyboard still deliver its `pointerup`.
//
// 🔴 AND A FINGER THAT SLID TO THE EDGE KEEPS GOING. Wider keys mean about
// five of thirteen are on screen, so reaching the rest cannot need a second
// gesture while a note is held. Sliding into the band at either end scrolls the
// row under the finger, which sounds each key it brings in.
//   ⚠️ ARMED BY TRAVEL, NOT BY POSITION, and that is what keeps it from
//   fighting the hold below. A finger PUT DOWN in the band does not scroll; a
//   finger that ARRIVED there by sliding does. So the outermost key can still
//   be held, and a glissando does not stop at the screen edge.
//
// 🔴 AND A KEY HELD PAST A SECOND RETRIGGERS ITSELF. `press`/`release` are the
// one funnel every route goes through — a finger, the QWERTY row, a page
// calling `api.press` — so the hold belongs here rather than in a page, and all
// of them get it.
//   ⚠️ THE WHOLE SAFETY STORY IS `notes off`, ON INSTRUCTION. There is no
//   ceiling and no dead-man's timer: the pad already carries a button that
//   releases everything and calls the page's `onPanic`, and a stuck retrigger
//   is one tap from over. What IS here is the cheap half that falls out of the
//   code anyway — a `pointerup`, a `pointercancel`, a lost capture, an octave
//   shift and a window blur all run the ordinary release path, and the ordinary
//   release path stops the retrigger.
//   ⚠️ A RECORDER WOULD ATTACH AT `press`/`release` AND NOWHERE ELSE. Every
//   note this component produces, by any route and including a retrigger, is
//   exactly one call to each. That is the seam; nothing is built on it here.

/**
 * 🔴 74 px, WHICH IS THE KEY'S OWN HEIGHT AND EXACTLY 3.0x WHAT WAS THERE.
 * MEASURED 2026-09-17 at 390 CSS px: 24.77 px a key. 74 is 1.68x Apple's 44 pt
 * minimum target and 1.54x Android's 48 dp, so a finger that lands off-centre
 * is still on the key it aimed at. It is also square, which is the reason to
 * prefer it over any neighbouring number: the key's height is already 74 and a
 * second measurement that agrees with one already on the page cannot drift
 * away from it.
 * ⚠️ IT IS A FLOOR, NOT A WIDTH. Thirteen keys at 74 plus twelve 3 px gaps is
 * 998 px, so anything narrower than that scrolls and anything wider divides the
 * room evenly as before. The switch is in `shell.css`, on a CONTAINER query
 * plus `(pointer: coarse)`: the first asks how much room the keyboard has
 * rather than how wide the window is, and the second catches a phone held
 * sideways, where there is room and there is still a finger.
 */
export const KEY_MIN_PX = 74;

/**
 * The band at each end of the row that scrolls, and how fast.
 *
 * 🔴 44 px IS A FINGER. It is the same number as Apple's minimum touch target,
 * which is the project's standing unit for "a finger's worth of screen", and it
 * is 0.59 of a key — so the outer half of the outermost key scrolls and the
 * inner half does not, which is a boundary a hand can feel.
 *
 * 🔴 90 TO 600 px/s IS 1.2 TO 7.8 KEYS A SECOND, on a 77 px slot. The bottom
 * is a deliberate crawl for placing the row; the top crosses the whole
 * thirteen-key run in 1.6 s, which is a fast glissando and not a jump. It ramps
 * with how far into the band the finger is, so the speed is chosen by the hand
 * rather than by a mode.
 *
 * 🔴 AND 24 px OF TRAVEL ARMS IT — a third of a key. Below that is the wobble
 * of a finger resting on glass, which must not scroll a keyboard somebody is
 * holding a note on.
 */
export const EDGE_PX = 44;
const SCROLL_MIN = 90, SCROLL_MAX = 600;
const ARM_PX = 24;

/**
 * 🔴 A SECOND, THEN FOUR A SECOND.
 *
 * `HOLD_MS` 1000: a whole note at 120 bpm is 2 s and a half note is 1 s, so a
 * second is past every duration ordinary playing produces and a player who
 * never wants this will never meet it. It is also the number the request used
 * ("longer than x sec"), and a round second is a threshold somebody can feel
 * coming rather than discover.
 *
 * `RETRIG_MS` 250: four a second, which is sixteenth notes at 120 bpm. Faster
 * reads as a broken note rather than a pulse, and on an instrument at the far
 * end of a relay it also stops being separable from its own round trip.
 *
 * ⚠️ WHAT IT COSTS. Each retrigger is one `note.off` and one `note.on`, so a
 * held key is 8 messages a second to whatever the page is driving. The relay's
 * own limits, READ from `workers/relay/src/index.js` on 2026-09-17, are 1000
 * messages a second with a burst of 2000 — so a hand holding every key it can
 * reach is under one per cent of the budget. (CLAUDE.md still quotes 60 and
 * 120; those were raised and the note there is stale.)
 *
 * ⚠️ AND A NOTE-OFF FIRST IS NOT OPTIONAL. A second `note.on` for a note that
 * is already sounding is a new voice on a polyphonic synth, and the first one
 * is then holding with nothing left to release it.
 */
export const HOLD_MS = 1000;
export const RETRIG_MS = 250;

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
 * @param holdMs   how long a key must be held before it starts retriggering,
 *                 and how often it does. `holdMs: 0` turns it off for a page
 *                 whose instrument cannot take it. Both default to the numbers
 *                 argued for at the top of this file; they are arguments rather
 *                 than constants so a page's own check can grade the machinery
 *                 without spending a second and a quarter of a harness run
 *                 inside one assert.
 * @param retrigMs
 * @returns {{el, keysEl, pad, noteOf, keyOf, press, release, base, shiftOctave,
 *            panic, lightNote, notes, retriggering, timing}}
 *          `el` is the WHOLE component — keys plus pad — so a page that places
 *          it by hand places both. `keysEl` is the key row alone.
 */
export function createKeyboard(host, {
  base = 60, map = QWERTY_CHROMATIC, sharps = SHARP_KEYS,
  onDown = () => {}, onUp = () => {}, keys: keyOpts = null,
  onPanic = null, onOctave = null, minBase = 24, maxBase = 96,
  holdMs = HOLD_MS, retrigMs = RETRIG_MS,
} = {}) {
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
    const kk = document.createElement('span'); kk.className = 'kk'; kk.textContent = k;
    b.append(nn, kk);
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
  // the pulse lasts exactly one retrigger, so the number lives in one place
  el.style.setProperty('--retrig-ms', `${retrigMs}ms`);
  const els = new Map();
  const letterOf = new Map();         // element -> letter, for the hit test
  for (const k of keys) {
    const b = make('div', `k${sharps.has(k) ? ' sharp' : ''}`);
    label(b, k);
    els.set(k, b);
    letterOf.set(b, k);
    keysEl.append(b);
  }
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
  // is under the finger; the hit test is the only thing that does. It is also
  // what lets the row scroll UNDER a still finger and change the note.
  //
  // ⚠️ AND THE CAPTURE IS WRAPPED. A `PointerEvent` built in script is
  // untrusted and `setPointerCapture` throws on it, so a page's own check could
  // not drive this path at all. Nothing downstream needs the capture to have
  // succeeded — it buys a pointerup from outside the element, which a scripted
  // gesture does not need because it aims its own events.
  const touches = new Map();   // pointerId -> {key, x, y, x0, y0, armed}

  function keyAtPoint(x, y) {
    const t = document.elementFromPoint(x, y);
    if (!t || !keysEl.contains(t)) return null;
    const b = t.closest('.k');
    return b ? (letterOf.get(b) ?? null) : null;
  }

  /** Is any OTHER finger still on this key? Two fingers on one key are one note. */
  const heldByAnother = (k, self) => {
    for (const t of touches.values()) if (t !== self && t.key === k) return true;
    return false;
  };

  function moveTo(t, k) {
    if (!t || t.key === k) return;
    const was = t.key;
    t.key = k;
    if (was != null && !heldByAnother(was, t)) release(was, 'pointer');
    if (k != null) press(k, 'pointer');
  }

  const scrollable = () => keysEl.scrollWidth - keysEl.clientWidth > 1;

  /** px/s, signed. 0 when the finger is outside the band, off the row, or there is nowhere to go. */
  function edgeVelocity(t) {
    if (!t.armed || !scrollable()) return 0;
    const r = keysEl.getBoundingClientRect();
    // Off the top or the bottom of the keys is not playing, so it is not scrolling either.
    if (t.y < r.top || t.y > r.bottom) return 0;
    const fromLeft = t.x - r.left, fromRight = r.right - t.x;
    const d = Math.min(fromLeft, fromRight);
    if (d > EDGE_PX) return 0;
    const depth = Math.min(1, Math.max(0, (EDGE_PX - d) / EDGE_PX));
    const v = SCROLL_MIN + (SCROLL_MAX - SCROLL_MIN) * depth;
    return fromLeft < fromRight ? -v : v;
  }

  let raf = 0, lastFrame = 0;
  function tick(now) {
    raf = 0;
    // First frame of a gesture has no previous timestamp; capped so a tab that
    // was away does not jump the row a screen and a half on one frame.
    const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
    lastFrame = now;
    let v = 0;
    // One row, so one finger drives it: the first one in a band wins. Two
    // fingers in opposite bands would otherwise cancel, which reads as a jam.
    for (const t of touches.values()) { v = edgeVelocity(t); if (v) break; }
    if (v && dt) {
      const before = keysEl.scrollLeft;
      keysEl.scrollLeft = before + v * dt;
      // The row moved under every finger, not only the one in the band.
      if (keysEl.scrollLeft !== before) for (const t of touches.values()) moveTo(t, keyAtPoint(t.x, t.y));
    }
    if (touches.size) raf = requestAnimationFrame(tick);
    else lastFrame = 0;
  }
  // ⚠️ THE LOOP STARTS WHEN A FINGER ARMS, NOT WHEN ONE GOES DOWN. Started on
  // pointerdown it ran for the whole of every held note, and `edgeVelocity`
  // reads `scrollWidth` and a bounding rect, so a key held on a desktop where
  // nothing can scroll was paying for a forced layout sixty times a second to
  // be told there is nowhere to go.
  const startTicking = () => { if (!raf) raf = requestAnimationFrame(tick); };

  keysEl.addEventListener('pointerdown', (e) => {
    const k = keyAtPoint(e.clientX, e.clientY);
    if (k == null) return;                       // the 3 px between two keys
    try { keysEl.setPointerCapture(e.pointerId); } catch { /* a scripted event; see above */ }
    const t = { key: null, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, armed: false };
    touches.set(e.pointerId, t);
    moveTo(t, k);
  });

  keysEl.addEventListener('pointermove', (e) => {
    const t = touches.get(e.pointerId);
    if (!t) return;                              // a mouse crossing the keys with no button down
    t.x = e.clientX; t.y = e.clientY;
    if (!t.armed && Math.hypot(t.x - t.x0, t.y - t.y0) >= ARM_PX) { t.armed = true; startTicking(); }
    moveTo(t, keyAtPoint(t.x, t.y));
  });

  // ⚠️ `lostpointercapture` IS IN HERE ON PURPOSE. A capture taken away by the
  // browser mid-gesture delivers no pointerup and no pointercancel, and the
  // note it was holding would sound until something else stopped it.
  const endTouch = (e) => {
    const t = touches.get(e.pointerId);
    if (!t) return;
    touches.delete(e.pointerId);
    if (t.key != null && !heldByAnother(t.key, t)) release(t.key, 'pointer');
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    keysEl.addEventListener(type, endTouch);
  }

  // ── the pad ──────────────────────────────────────────────────────────────
  // ⚠️ NO WORD AT ALL. It was `octave` once before the pair — better than a word
  // on each button, and still one more thing to read on a control whose two
  // glyphs sit under a row of keys that are already labelled with their octave
  // number. Thirteen keys reading `C4` say what − and + move. Two
  // buttons that have to be read to be told apart are not one control.
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
  const panicBtn = make('button', 'kpad-right', 'notes off', {
    type: 'button', title: 'stop every note that is still sounding',
  });
  panicBtn.onclick = () => api.panic();
  pad.append(panicBtn);
  el.append(pad);

  host.append(el);

  const held = new Set();
  // letter -> {wait, every, how, on} for a key that is being held. Every entry
  // is removed by `release`, which is the only way a note here ever stops.
  const holds = new Map();

  function press(k, how = 'key') {
    if (!(k in map) || held.has(k)) return;
    held.add(k);
    onDown(noteOf(k), how);
    if (!holdMs || how === 'panic') return;
    const h = { how, on: false, every: 0, wait: 0 };
    h.wait = setTimeout(() => startRetrigger(k, h), holdMs);
    holds.set(k, h);
  }

  function release(k, how = 'key') {
    if (!held.has(k)) return;
    stopRetrigger(k);
    held.delete(k);
    onUp(noteOf(k), how);
  }

  /**
   * ⚠️ IT REPORTS THE `how` THE NOTE STARTED WITH, not a fourth word. A page
   * branching on `how` is branching on where the note came from, and a
   * retriggered note came from the same finger the first one did — a new value
   * would take every page down an unwritten branch for a note that is not a new
   * kind of note.
   * 🔴 AND THE COMPONENT HAS TO DRAW THE PULSE, BECAUSE THE PAGE'S LIGHT
   * CANNOT. MEASURED 2026-09-17 by polling the key's classes every 10 ms
   * through a two second hold: the `down` class changed **once**, at the start.
   * A page's `onUp` and `onDown` land in the same tick, so `lightNote` turns
   * the fill off and on again before anything is painted, and a retriggering
   * key looks exactly like a held one. That is the worst case for a feature
   * whose instrument is in another building: with the board down, a page with
   * this running and a page with nothing running are the same picture.
   * So `.retrig` is a ring that says the mode is on, and `.beat` is restarted
   * on every hit — `remove`, a forced reflow, `add` — which is the only way to
   * replay a CSS animation and the only way to keep the picture in step with
   * the notes rather than with its own clock.
   */
  function startRetrigger(k, h) {
    if (!held.has(k) || holds.get(k) !== h) return;
    h.on = true;
    els.get(k)?.classList.add('retrig');
    const beat = () => {
      const b = els.get(k);
      if (!b) return;
      b.classList.remove('beat');
      void b.offsetWidth;                  // or the animation is never restarted
      b.classList.add('beat');
    };
    beat();
    h.every = setInterval(() => {
      if (!held.has(k)) { stopRetrigger(k); return; }
      const n = noteOf(k);
      onUp(n, h.how);
      onDown(n, h.how);
      beat();
    }, retrigMs);
  }

  function stopRetrigger(k) {
    const h = holds.get(k);
    if (!h) return;
    holds.delete(k);
    clearTimeout(h.wait);
    clearInterval(h.every);
    els.get(k)?.classList.remove('retrig', 'beat');
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
  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);
  addEventListener('blur', onBlur);

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
      touches.clear();
      for (const k of [...held]) release(k, 'panic');
      for (const b of els.values()) b.classList.remove('down', 'retrig');
      onPanic?.();
    },
    /** paint a key. `who` is 'self' or 'remote'; they are different colours. */
    lightNote(note, on, who = 'self') {
      const k = keyOf(note);
      if (!k) return;
      els.get(k)?.classList.toggle(who === 'remote' ? 'remote' : 'down', !!on);
    },
    /** every note this keyboard can produce, for a caller that needs the range */
    notes: () => keys.map(noteOf),
    /** the letters whose held note has started retriggering, for a page's own check */
    retriggering: () => [...holds].filter(([, h]) => h.on).map(([k]) => k),
    /** what this keyboard was built with, so a check can grade the numbers as well as the machinery */
    timing: { holdMs, retrigMs, edgePx: EDGE_PX, keyMinPx: KEY_MIN_PX },
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
      removeEventListener('keydown', onKeyDown);
      removeEventListener('keyup', onKeyUp);
      removeEventListener('blur', onBlur);
      cancelAnimationFrame(raf); raf = 0;
      el.remove();
    },
  };
  return api;
}
