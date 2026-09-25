// demo/shell/note-grid.mjs — note events, drawn where they fall in a pattern.
//
// 🔴 ASKED FOR TWICE, 2026-09-21: *"can we see actual notes on timeline in
// https://positron.studio/pack/#sessions"*, then *"so can you show notes in
// timeline in pack?"*. The events had been decoded since that morning and the
// page was printing a COUNT of them, which is the one thing about music that
// carries no music in it.
//
// 🔴 IT IS NOT `strip.mjs` AND THAT IS A DECISION. A strip draws lanes of marks
// against a DECK, in milliseconds, and its mark colour is reserved: the project
// rule is that colour says HOW A MARK LANDED and never which lane it is in. A
// Circuit pattern has no milliseconds in it — sixteen steps, no tempo stored —
// and the thing worth seeing is PITCH, which a strip has no axis for. Bending
// either one to fit would have cost the rule or cost the picture.
//
// 🔴 AND IT IS NOT A PIANO ROLL OF THE WHOLE SESSION EITHER, for a reason that
// is about the instrument rather than about drawing. A session holds sixteen
// patterns of sixteen steps; they are alternatives, not a timeline, so laying
// them end to end would invent an order the file does not have, and stacking
// them on one x axis would overlay sixteen different patterns at step 1. One
// ROW PER PATTERN is the only arrangement that says what is there.
//
// ⚠️ ONE PITCH SCALE FOR THE WHOLE PICTURE, NOT ONE PER ROW. A per-row scale
// would make the same height mean a different note in each row, which is a
// chart that punishes the reader for comparing it. The scale comes from the
// events handed in, so a session that lives in one octave gets that octave.
//
// ⚠️ EMPTY PATTERNS ARE LEFT OUT AND COUNTED. Sixteen rows of which five hold
// anything is mostly a picture of nothing; the rows that are missing are said
// in words instead, which is the same answer `table.mjs` gives about a heading
// it had to cut.
//
// MEASURED on the owner's pack, which is what the sizes below are chosen
// against: 29 of 32 sessions hold notes, 5,095 events in all, up to 16 regions
// holding notes in one session and up to 78 events in one region, pitch 36 to
// 132 across the pack and velocity 1 to 127.

import { el } from './shell.mjs';

/** Steps in a Circuit pattern. Not a guess: `circuit-session.mjs` reads 16. */
export const STEPS = 16;

/** How tall one pattern's row is, and the floor the picture will not go under. */
export const ROW_H = 22;

/** Room for the row label, in pixels. Wide enough for `16` and a count. */
export const GUTTER = 54;

/**
 * 🔴 A NOTE IS DRAWN AT LEAST THIS TALL. With one scale over the whole picture,
 * a session spanning 96 semitones in a 22 px row puts two adjacent notes inside
 * a quarter of a pixel of each other, and a canvas drawing a 0.2 px rectangle
 * draws a grey smear. Three pixels is the smallest thing that still reads as a
 * mark rather than as noise.
 */
export const NOTE_H = 3;

/** The note names, so a hover can say `C4` rather than `60`. */
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * MIDI note number to the name a musician would say.
 * ⚠️ MIDDLE C IS C3 HERE, WHICH IS WHAT THE CIRCUIT ITSELF SAYS. The octave
 * numbering of note 60 is not standardised: Yamaha calls it C3, Roland C4, and
 * the MIDI specification does not say. `research/measured-devices-2026-09-20.md` records
 * the Circuit's own drum pads at notes 60, 62, 64 and 65, and the instrument
 * labels that octave 3, so a page about Circuit sessions uses the Circuit's
 * numbering and says so rather than picking the commoner one.
 */
export function noteName(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v) || v < 0 || v > 127) return '';
  return `${NAMES[((v % 12) + 12) % 12]}${Math.floor(v / 12) - 2}`;
}

/**
 * Which patterns hold anything, and the pitch range over all of them.
 * @param {Array<{region:number, step:number, note:number, velocity:number}>} events
 * @returns {{rows:number[], lo:number, hi:number, count:number, regions:number}}
 */
/**
 * 🔴 AND IT COUNTS THE ONES THAT CANNOT BE NOTES, WHICH IS A HOLE IN OUR OWN
 * DECODER FOUND BY TRYING TO DRAW ITS OUTPUT. MEASURED 2026-09-21 over the
 * owner's pack: **105 of 5,095 events carry a note number above 127**, which
 * is impossible in MIDI. The values are 128, 129, 130, 131 and 132, clustered
 * rather than scattered, and their velocities and gates look ordinary. So the
 * byte `notesIn()` reads as a pitch is not only a pitch, and masking bit 7 off
 * does not rescue them either: it would turn them into notes 0, 1, 2, 3 and 4,
 * which is five octaves below anything else in the file.
 * ⚠️ **THEY ARE DRAWN AND THEY ARE COUNTED SEPARATELY**, never quietly clamped.
 * A clamp would pile them all on the top line of the picture and make a chord
 * that is not in the file, which is this project's named hazard: an instrument
 * that reports something rather than reporting that it does not know.
 */
export function layout(events) {
  const list = Array.isArray(events) ? events : [];
  const seen = new Set();
  let lo = Infinity, hi = -Infinity, over = 0;
  for (const e of list) {
    seen.add(e.region);
    if (e.note > 127) over++;
    if (e.note < lo) lo = e.note;
    if (e.note > hi) hi = e.note;
  }
  const rows = [...seen].sort((a, b) => a - b);
  return {
    rows,
    lo: rows.length ? lo : 0,
    hi: rows.length ? hi : 0,
    count: list.length,
    regions: rows.length,
    over,
  };
}

/**
 * Where one event lands, in the picture's own coordinates.
 * ⚠️ A SESSION WHOSE NOTES ARE ALL ONE PITCH HAS NO RANGE TO DIVIDE BY, and a
 * drum pattern is exactly that. It is centred rather than put at the top or
 * dropped, because `lo === hi` is a real and common answer.
 */
export function place(e, { rows, lo, hi }, rowH = ROW_H) {
  const row = rows.indexOf(e.region);
  if (row < 0) return null;
  const span = hi - lo;
  const frac = span > 0 ? (e.note - lo) / span : 0.5;
  // Up the row, not down it: a higher note sits higher.
  const inRow = (rowH - NOTE_H) * (1 - frac);
  return { row, y: row * rowH + inRow, step: e.step };
}

/**
 * @param {HTMLElement} host
 * @param {object} [o]
 * @param {number} [o.rowH]   pixels per pattern row
 * @param {string} [o.label]  what the caption says when something is drawn
 */
export function createNoteGrid(host, { rowH = ROW_H, label = '' } = {}) {
  const wrap = el('div', 'pos-ngrid');
  const canvas = el('canvas', 'pos-ngrid-c');
  const gut = el('div', 'pos-ngrid-gut', '');
  wrap.append(canvas, gut);
  host.append(wrap);
  // ⚠️ HIDDEN UNTIL THERE IS SOMETHING TO DRAW, which is the same rule the drop
  // footer and the empty table heading follow: a container with nothing in it
  // must not paint its edges.
  wrap.hidden = true;

  let events = [], plan = layout([]), hover = null, said = '';

  const tok = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };

  function paint() {
    const w = canvas.clientWidth;
    const h = plan.rows.length * rowH;
    if (!w || !h) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.height = `${h}px`;
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    const lane = Math.max(1, w - GUTTER);
    const colW = lane / STEPS;

    // The step grid, quiet, and the four beats a shade stronger. A Circuit
    // pattern is four beats of four and the eye needs the bar lines to count.
    for (let s = 0; s <= STEPS; s++) {
      g.fillStyle = tok('--line', '#232c3a');
      g.globalAlpha = s % 4 === 0 ? 1 : 0.45;
      g.fillRect(GUTTER + s * colW, 0, 1, h);
    }
    g.globalAlpha = 1;
    for (let r = 1; r < plan.rows.length; r++) {
      g.fillStyle = tok('--line', '#232c3a');
      g.globalAlpha = 0.45;
      g.fillRect(GUTTER, r * rowH, lane, 1);
    }
    g.globalAlpha = 1;

    // The row labels, in the gutter, which is the same arrangement `strip.mjs`
    // uses for its lanes.
    g.font = `400 10px ${tok('--mono', 'monospace')}`;
    g.textBaseline = 'middle';
    for (let r = 0; r < plan.rows.length; r++) {
      g.fillStyle = tok('--dim2', '#7a879c');
      g.fillText(`${plan.rows[r] + 1}`, 6, r * rowH + rowH / 2);
    }

    // 🔴 THE NOTES. Velocity is ALPHA rather than colour, because this project
    // spends colour on state and a note has none: it is not late, early or
    // refused, it is simply in the file. Alpha also survives the one-bit
    // question a colour scale cannot, which is *is anything here at all*.
    for (const e of events) {
      const p = place(e, plan, rowH);
      if (!p) continue;
      const v = Math.max(0, Math.min(127, e.velocity || 0));
      g.globalAlpha = 0.35 + 0.65 * (v / 127);
      g.fillStyle = hover && hover.e === e ? tok('--hi', '#ffd400') : tok('--dim', '#9aa7bd');
      g.fillRect(GUTTER + p.step * colW + 1, p.y, Math.max(2, colW - 2), NOTE_H);
    }
    g.globalAlpha = 1;
  }

  function at(x, y) {
    const w = canvas.clientWidth;
    const lane = Math.max(1, w - GUTTER);
    const colW = lane / STEPS;
    let best = null, bestD = Infinity;
    for (const e of events) {
      const p = place(e, plan, rowH);
      if (!p) continue;
      const cx = GUTTER + (p.step + 0.5) * colW;
      const cy = p.y + NOTE_H / 2;
      const d = Math.abs(cx - x) / colW + Math.abs(cy - y) / rowH;
      if (d < bestD) { bestD = d; best = { e, x: cx, y: cy }; }
    }
    return bestD < 1 ? best : null;
  }

  canvas.addEventListener('pointermove', (ev) => {
    const b = canvas.getBoundingClientRect();
    const was = hover?.e;
    hover = at(ev.clientX - b.left, ev.clientY - b.top);
    if (hover?.e !== was) { say(); paint(); }
  });
  canvas.addEventListener('pointerleave', () => {
    if (!hover) return;
    hover = null; say(); paint();
  });

  function say() {
    if (hover) {
      const e = hover.e;
      const name = noteName(e.note);
      said = `pattern ${e.region + 1}, step ${e.step + 1}, `
        + (name ? `${name} (note ${e.note})` : `note ${e.note}, which is above the MIDI range`)
        + `, velocity ${e.velocity}`;
    } else {
      /* ⚠️ THE RANGE IS NAMED FROM THE NOTES THAT REALLY ARE NOTES. Printing
         `C1 to ` with a blank at the end because the top value is 132 is a
         caption reporting our own decoder's gap as if it were music. */
      const top = plan.hi > 127 ? 127 : plan.hi;
      said = plan.count
        ? `${plan.count} note${plan.count === 1 ? '' : 's'} across `
          + `${plan.regions} of 16 patterns, ${noteName(plan.lo)} to ${noteName(top)}`
          + (plan.over ? `, and ${plan.over} above the MIDI range that we cannot read` : '')
          + (label ? `. ${label}` : '')
        : '';
    }
    gut.textContent = said;
  }

  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => paint()) : null;
  ro?.observe(canvas);

  return {
    el: wrap,
    canvas,
    /**
     * @param {Array} list note events from `circuit-session.mjs`'s `notesIn`
     */
    set(list) {
      events = Array.isArray(list) ? list : [];
      plan = layout(events);
      hover = null;
      wrap.hidden = plan.count === 0;
      say();
      paint();
    },
    clear() {
      events = []; plan = layout([]); hover = null;
      wrap.hidden = true;
      say();
      const g = canvas.getContext('2d');
      g?.clearRect(0, 0, canvas.width, canvas.height);
    },
    /** What the caption is saying, so a check can read it rather than the pixels. */
    says: () => said,
    /** What is drawn, for a check that wants the numbers rather than the ink. */
    facts: () => ({ ...plan, rowH, steps: STEPS }),
    /**
     * Lit pixels in the note lane. The differential a check needs, and it
     * deliberately EXCLUDES the gutter so a label cannot be mistaken for music.
     */
    ink() {
      const g = canvas.getContext('2d');
      if (!g || !canvas.width) return 0;
      const dpr = canvas.width / Math.max(1, canvas.clientWidth);
      const x0 = Math.round(GUTTER * dpr) + 2;
      const w = canvas.width - x0;
      if (w <= 0) return 0;
      const px = g.getImageData(x0, 0, w, canvas.height).data;
      let n = 0;
      for (let i = 3; i < px.length; i += 4) if (px[i] > 24) n++;
      return n;
    },
    /** Where one event landed, so a check can prove pitch really moves it. */
    place: (e) => place(e, plan, rowH),
    repaint: paint,
  };
}
