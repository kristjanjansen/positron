// demo/shell/keyboard.mjs — the ONE on-screen keyboard.
//
// Extracted from `instrument`, which had the good one: black keys drawn as
// black keys, pointer capture so a held finger is a held note, and a separate
// colour for a note somebody ELSE played. `rig/pro-instrument` had grown eight
// equal grey buttons instead, and its mapping drifted diatonic because the
// picture could not show a sharp — the shape constrains the mapping, so the
// shape comes first.
//
// THE RULE THAT MATTERS: a key is lit by a NOTE, never by the press that caused
// it. Light it from the press and a note arriving over MIDI or from another
// player does not light, while a local press stays lit after its note stops.
// `press()` and `release()` therefore only report; `lightNote()` paints.

/** QWERTY as a piano octave: the home row is white, the row above holds sharps. */
export const QWERTY_CHROMATIC = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12 };
export const SHARP_KEYS = new Set(['w', 'e', 't', 'y', 'u']);

/**
 * @param host   element to append the keyboard to
 * @param base   MIDI note of the leftmost key (60 = middle C)
 * @param onDown (note, how) — how is 'key' | 'pointer' | 'midi'
 * @param onUp   (note, how)
 */
export function createKeyboard(host, {
  base = 60, map = QWERTY_CHROMATIC, sharps = SHARP_KEYS,
  onDown = () => {}, onUp = () => {}, keys: keyOpts = null,
} = {}) {
  const keys = keyOpts || Object.keys(map);
  const noteOf = (k) => base + map[k];
  const keyOf = (note) => keys.find((k) => noteOf(k) === note) ?? null;

  const el = document.createElement('div');
  el.className = 'keys';
  const els = new Map();
  for (const k of keys) {
    const b = document.createElement('div');
    b.className = `k${sharps.has(k) ? ' sharp' : ''}`;
    b.textContent = k;
    // pointerdown/up rather than click, so a HELD finger is a held note; capture
    // so that sliding off the key still releases it.
    b.addEventListener('pointerdown', (e) => { b.setPointerCapture(e.pointerId); press(k, 'pointer'); });
    b.addEventListener('pointerup', () => release(k, 'pointer'));
    b.addEventListener('pointercancel', () => release(k, 'pointer'));
    els.set(k, b);
    el.append(b);
  }
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

  // preventDefault ONLY on mapped keys, or typing anywhere else on the page
  // stops working.
  const onKeyDown = (e) => { if (e.repeat) return; const k = e.key.toLowerCase(); if (k in map) { e.preventDefault(); press(k, 'key'); } };
  const onKeyUp = (e) => { const k = e.key.toLowerCase(); if (k in map) release(k, 'key'); };
  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);
  // A tab that loses focus never sees keyup, which is a stuck note.
  addEventListener('blur', () => { for (const k of [...held]) release(k, 'key'); });

  return {
    el, noteOf, keyOf, press, release,
    /** paint a key. `who` is 'self' or 'remote'; they are different colours. */
    lightNote(note, on, who = 'self') {
      const k = keyOf(note);
      if (!k) return;
      els.get(k)?.classList.toggle(who === 'remote' ? 'remote' : 'down', !!on);
    },
    /** every note this keyboard can produce, for a caller that needs the range */
    notes: () => keys.map(noteOf),
  };
}
