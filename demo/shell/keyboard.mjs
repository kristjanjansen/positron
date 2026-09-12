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
// Octave down, octave up, notes off. /box/ declared these three as ordinary
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
// `/box/` and `/kit/`, are both `built: false` and the suite never opens
// either, so there is nothing for them to assert INTO; that is a gap in
// coverage, not a gap in this file.)

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
 *                 sound is made somewhere this component cannot reach — /box/
 *                 sends the board its own all-notes-off, because a note the
 *                 board is holding was never a key on this keyboard.
 * @param minBase  lowest / highest leftmost note the octave buttons will reach.
 * @param maxBase  They stop at the ends rather than wrapping: a keyboard that
 *                 jumps from the bottom of the range to the top on one press
 *                 reads as a fault.
 * @returns {{el, keysEl, pad, noteOf, keyOf, press, release, base, shiftOctave,
 *            panic, lightNote, notes}}
 *          `el` is the WHOLE component — keys plus pad — so a page that places
 *          it by hand places both. `keysEl` is the key row alone.
 */
export function createKeyboard(host, {
  base = 60, map = QWERTY_CHROMATIC, sharps = SHARP_KEYS,
  onDown = () => {}, onUp = () => {}, keys: keyOpts = null,
  onPanic = null, onOctave = null, minBase = 24, maxBase = 96,
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
  const els = new Map();
  for (const k of keys) {
    const b = make('div', `k${sharps.has(k) ? ' sharp' : ''}`);
    label(b, k);
    // pointerdown/up rather than click, so a HELD finger is a held note; capture
    // so that sliding off the key still releases it.
    b.addEventListener('pointerdown', (e) => { b.setPointerCapture(e.pointerId); press(k, 'pointer'); });
    b.addEventListener('pointerup', () => release(k, 'pointer'));
    b.addEventListener('pointercancel', () => release(k, 'pointer'));
    els.set(k, b);
    keysEl.append(b);
  }
  el.append(keysEl);

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
  const octPair = make('span', 'step kpad-oct');
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
    // ⚠️ NOT WHILE SOMEBODY IS TYPING. `wire` has a compose box and `/box/` a
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
  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);
  // A tab that loses focus never sees keyup, which is a stuck note.
  addEventListener('blur', () => { for (const k of [...held]) release(k, 'key'); });

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
      for (const k of [...held]) release(k, 'panic');
      for (const b of els.values()) b.classList.remove('down');
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
  };
  return api;
}
