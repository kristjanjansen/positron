// demo/shell/note-grid.mjs. Note events, drawn where they fall in a pattern.
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
// Circuit pattern has no milliseconds in it (sixteen steps, no tempo stored),
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
import { createPanelValues } from './video-panel.mjs';

/** Steps in a Circuit pattern. Not a guess: `circuit-session.mjs` reads 16. */
export const STEPS = 16;

/** Steps in a beat, so the column headings can say 1 2 3 4. */
export const BEAT = 4;

/**
 * How tall one pattern's row is.
 * ⚠️ IT WAS 22 UNTIL 2026-10-12 AND THAT WAS MOST OF THE MESS. MEASURED on
 * `/kit/timeline/`: the specimen's two patterns made a picture 44 px tall in
 * which fifteen semitones shared 19 px, 1.3 px a semitone under a 3 px note, so
 * a rising line and a falling one were two smears. 40 gives the same fifteen
 * semitones 2.2 px each, which a reader can follow by eye.
 */
export const ROW_H = 40;

/**
 * 🔴 A NOTE IS DRAWN AT LEAST THIS TALL. With one scale over the whole picture,
 * a session spanning 96 semitones in one row puts two adjacent notes inside a
 * fraction of a pixel of each other, and a canvas drawing a 0.2 px rectangle
 * draws a grey smear. Three pixels is the smallest thing that still reads as a
 * mark rather than as noise.
 */
export const NOTE_H = 3;

/** Air between a row's rule and the highest or lowest note in it. */
export const ROW_INSET = 4;

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
 * `inset` keeps the top and bottom notes off the row's own rules; the pure
 * arithmetic is graded at 0, where the top of the range is the top of the row.
 */
export function place(e, { rows, lo, hi }, rowH = ROW_H, inset = 0) {
  const row = rows.indexOf(e.region);
  if (row < 0) return null;
  const span = hi - lo;
  const frac = span > 0 ? (e.note - lo) / span : 0.5;
  // Up the row, not down it: a higher note sits higher.
  const inRow = inset + (rowH - 2 * inset - NOTE_H) * (1 - frac);
  return { row, y: row * rowH + inRow, step: e.step };
}

/**
 * Where a step starts, as a musician counts it: beat, then step in the beat.
 * Step 0 is `1.1`, step 5 is `2.2`, step 15 is `4.4`. The column headings print
 * the beat, so the first figure here is the number above the note.
 */
export function startOf(step, beat = BEAT) {
  const s = Math.floor(Number(step));
  if (!Number.isFinite(s) || s < 0) return '';
  return `${Math.floor(s / beat) + 1}.${(s % beat) + 1}`;
}

/**
 * How long a note is, in words a footer cell can hold.
 * ⚠️ THE GRID DOES NOT KNOW THE GATE'S UNIT AND DOES NOT GUESS IT. The Circuit
 * writes a gate in steps minus one or in sixths of a step depending on a header
 * byte (`research/circuit-session-notes-2026-09-21.md`, a reading on 31 of 31),
 * and `notesIn` hands over the raw byte. So a caller that knows passes
 * `length` in steps on the event, and the grid draws and prints that; one that
 * does not gets the raw gate, labelled as a gate rather than dressed as steps.
 */
export function lengthOf(e) {
  const n = Number(e?.length);
  if (Number.isFinite(n) && n > 0) {
    const t = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '');
    return `${t} step${n === 1 ? '' : 's'}`;
  }
  return Number.isFinite(Number(e?.gate)) ? `gate ${e.gate}` : '';
}

/** Every event in one pattern, in reading order: by step, then low to high. */
function rowOrder(events, region) {
  return events.filter((e) => e.region === region)
    .sort((a, b) => a.step - b.step || a.note - b.note);
}

/**
 * Which note a key moves to, or null when it moves nowhere.
 * Left and Right walk one pattern in reading order, so the notes of a chord are
 * visited low to high. Up and Down change pattern and land on the note nearest
 * in time, the higher one on a tie. Home and End are the ends of the pattern.
 * Pure, so the walk is graded with no browser.
 */
export function stepFrom(events, plan, from, key) {
  const list = Array.isArray(events) ? events : [];
  if (!list.length) return null;
  if (!from) return rowOrder(list, plan.rows[0])[0] || null;
  const row = rowOrder(list, from.region);
  const i = row.indexOf(from);
  if (key === 'ArrowLeft') return i > 0 ? row[i - 1] : null;
  if (key === 'ArrowRight') return i >= 0 && i < row.length - 1 ? row[i + 1] : null;
  if (key === 'Home') return row[0] === from ? null : row[0];
  if (key === 'End') return row[row.length - 1] === from ? null : row[row.length - 1];
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    const r = plan.rows.indexOf(from.region) + (key === 'ArrowUp' ? -1 : 1);
    if (r < 0 || r >= plan.rows.length) return null;
    let best = null;
    for (const e of rowOrder(list, plan.rows[r])) {
      const d = Math.abs(e.step - from.step), bd = best ? Math.abs(best.step - from.step) : Infinity;
      if (d < bd || (d === bd && e.note >= best.note)) best = e;
    }
    return best;
  }
  return null;
}

/** The footer's cells: key, label, and the widest thing each can ever say. */
export const FOOT = [
  { key: 'note', label: 'note', reserve: 8 },       // `C#-2`, or `not MIDI`
  { key: 'number', label: 'number', reserve: 3 },   // 0 to 132
  { key: 'pattern', label: 'pattern', reserve: 2 }, // 1 to 16
  { key: 'start', label: 'start', reserve: 3 },     // 1.1 to 4.4
  { key: 'length', label: 'length', reserve: 11 },  // `15.83 steps`, `gate 96`
  { key: 'velocity', label: 'velocity', reserve: 3 },
];

/** What the footer says about one event, cell by cell. Empty for none. */
export function footOf(e) {
  if (!e) return Object.fromEntries(FOOT.map((f) => [f.key, '']));
  return {
    note: noteName(e.note) || 'not MIDI',
    number: String(e.note),
    pattern: String(e.region + 1),
    start: startOf(e.step),
    length: lengthOf(e),
    velocity: String(e.velocity ?? ''),
  };
}

/**
 * @param {HTMLElement} host
 * @param {object} [o]
 * @param {number} [o.rowH]   pixels per pattern row
 * @param {string} [o.label]  what the picture is, for a screen reader
 * @param {(e:object|null)=>void} [o.onPick]  the note in focus changed
 *
 * 🔴 REWORKED 2026-10-12 ON *"its a mess. rm hover intereacvtion. add footer to
 * show note info. figure out left lane col. column headers?"*.
 * - NO HOVER. Pointing at the picture changes nothing. A press picks the note
 *   nearest it, and the arrows walk the notes (`stepFrom`), from the canvas,
 *   which is one tab stop.
 * - THE NOTE IN FOCUS IS ALWAYS ONE NOTE. `set()` picks the first note of the
 *   first pattern, so the footer is never an empty row that fills in on the
 *   first press, and a press or a key moves it. There is no playhead here: a
 *   Circuit pattern in a file has no clock, so nothing plays it.
 * - THE FOOTER IS CELLS IN RESERVED WIDTHS (`createPanelValues`, the kit's own
 *   footer row), so a value changing never moves its neighbour, and the row
 *   wraps by its reserves rather than by what it holds, so its height depends
 *   on the box and never on the note.
 * - THE LEFT COLUMN IS THE PATTERN NUMBER, NOT A KEYBOARD. A row is one
 *   pattern with its own small pitch scale inside it, so there is no single
 *   pitch per row for a key to name; the exact note is the footer's job. It is
 *   a DOM column as wide as its widest label, sticky when the grid scrolls
 *   sideways, and its rows ARE the grid's rows, so it cannot drift from them.
 * - THE COLUMN HEADINGS ARE THE FOUR BEATS, each spanning four step tracks of
 *   the same CSS grid the picture sits in, so they line up by construction.
 */
export function createNoteGrid(host, { rowH = ROW_H, label = '', onPick = null } = {}) {
  const wrap = el('div', 'pos-ngrid');
  const scroll = el('div', 'pos-ngrid-scroll');
  const grid = el('div', 'pos-ngrid-grid');
  const corner = el('div', 'pos-ngrid-corner', 'pattern');
  grid.append(corner);
  for (let b = 0; b < STEPS / BEAT; b++) {
    const h = el('div', 'pos-ngrid-beat', String(b + 1));
    h.style.gridColumn = `${2 + b * BEAT} / span ${BEAT}`;
    grid.append(h);
  }
  // The lane is a plain box spanning every step track; the canvas is absolute
  // inside it, because a canvas in a grid track offers its own pixel width as
  // a minimum and the tracks would grow to fit the backing store.
  const lane = el('div', 'pos-ngrid-lane');
  const canvas = el('canvas', 'pos-ngrid-c');
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  lane.append(canvas);
  grid.append(lane);
  scroll.append(grid);

  const foot = el('div', 'pos-ngrid-foot');
  const values = createPanelValues(FOOT);
  foot.append(values.el);
  wrap.append(scroll, foot);
  host.append(wrap);
  // ⚠️ HIDDEN UNTIL THERE IS SOMETHING TO DRAW, which is the same rule the drop
  // footer and the empty table heading follow: a container with nothing in it
  // must not paint its edges.
  wrap.hidden = true;

  let events = [], plan = layout([]), picked = null, said = '', labs = [];

  const tok = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };

  function rows() {
    for (const l of labs) l.remove();
    labs = plan.rows.map((r, i) => {
      const l = el('div', 'pos-ngrid-lab', String(r + 1));
      l.style.gridRow = String(i + 2);
      grid.insertBefore(l, lane);
      return l;
    });
    grid.style.setProperty('--ng-rows', String(Math.max(1, plan.rows.length)));
    grid.style.setProperty('--ng-row', `${rowH}px`);
    lane.style.gridRow = `2 / span ${Math.max(1, plan.rows.length)}`;
  }

  function paint() {
    const w = lane.clientWidth;
    const h = plan.rows.length * rowH;
    if (!w || !h) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const colW = w / STEPS;
    const line = tok('--line', '#232c3a');

    // The step grid, quiet, and the four beats a shade stronger. A Circuit
    // pattern is four beats of four and the eye needs the beat lines to count.
    g.fillStyle = line;
    for (let s = 0; s < STEPS; s++) {
      g.globalAlpha = s % BEAT === 0 ? 1 : 0.45;
      g.fillRect(Math.round(s * colW), 0, 1, h);
    }
    g.globalAlpha = 0.45;
    for (let r = 1; r < plan.rows.length; r++) g.fillRect(0, r * rowH, w, 1);
    g.globalAlpha = 1;

    // 🔴 THE NOTES. Velocity is ALPHA rather than colour, because this project
    // spends colour on state and a note has none: it is not late, early or
    // refused, it is simply in the file. The one note in focus is the one
    // thing in the accent, because it is the one thing chosen.
    const dim = tok('--dim', '#9aa7bd'), hi = tok('--hi', '#ffd400');
    const draw = (e, colour, alpha) => {
      const p = place(e, plan, rowH, ROW_INSET);
      if (!p) return;
      const len = Math.max(1, Math.min(STEPS - p.step, Number(e.length) > 0 ? Number(e.length) : 1));
      g.globalAlpha = alpha;
      g.fillStyle = colour;
      g.fillRect(p.step * colW + 2, p.y, Math.max(2, len * colW - 3), NOTE_H);
    };
    for (const e of events) {
      if (e === picked) continue;
      const v = Math.max(0, Math.min(127, e.velocity || 0));
      draw(e, dim, 0.35 + 0.65 * (v / 127));
    }
    if (picked) draw(picked, hi, 1);
    g.globalAlpha = 1;
  }

  function at(x, y) {
    const colW = lane.clientWidth / STEPS;
    let best = null, bestD = Infinity;
    for (const e of events) {
      const p = place(e, plan, rowH, ROW_INSET);
      if (!p) continue;
      const cx = (p.step + 0.5) * colW;
      const cy = p.y + NOTE_H / 2;
      const d = Math.abs(cx - x) / colW + Math.abs(cy - y) / rowH;
      if (d < bestD) { bestD = d; best = e; }
    }
    return bestD < 1 ? best : null;
  }

  /** Keep the note in focus inside the scroller, moving only the scroller. */
  function reveal() {
    if (!picked) return;
    const p = place(picked, plan, rowH, ROW_INSET);
    const colW = lane.clientWidth / STEPS;
    const labW = corner.getBoundingClientRect().width;
    const x0 = lane.offsetLeft + p.step * colW, x1 = x0 + colW;
    if (x0 - labW < scroll.scrollLeft) scroll.scrollLeft = Math.max(0, x0 - labW - colW);
    else if (x1 > scroll.scrollLeft + scroll.clientWidth) scroll.scrollLeft = x1 - scroll.clientWidth + colW;
    const y0 = lane.offsetTop + p.y, head = corner.getBoundingClientRect().height;
    if (y0 - head < scroll.scrollTop) scroll.scrollTop = Math.max(0, y0 - head - rowH / 2);
    else if (y0 + rowH > scroll.scrollTop + scroll.clientHeight) scroll.scrollTop = y0 + rowH - scroll.clientHeight;
  }

  function pick(e, { quiet = false } = {}) {
    picked = e || null;
    const f = footOf(picked);
    for (const k of Object.keys(f)) values.set(k, f[k]);
    paint();
    columns();
    if (!quiet) onPick?.(picked);
  }

  canvas.addEventListener('pointerdown', (ev) => {
    const b = canvas.getBoundingClientRect();
    const e = at(ev.clientX - b.left, ev.clientY - b.top);
    if (e && e !== picked) pick(e);
  });
  canvas.addEventListener('keydown', (ev) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(ev.key)) return;
    // ⚠️ prevented even at an end, or an arrow at the last note scrolls the page.
    ev.preventDefault();
    const e = stepFrom(events, plan, picked, ev.key);
    if (e) { pick(e); reveal(); }
  });

  function summary() {
    /* ⚠️ THE RANGE IS NAMED FROM THE NOTES THAT REALLY ARE NOTES. Printing
       `C1 to ` with a blank at the end because the top value is 132 is a
       caption reporting our own decoder's gap as if it were music. */
    const top = plan.hi > 127 ? 127 : plan.hi;
    said = plan.count
      ? `${plan.count} note${plan.count === 1 ? '' : 's'} across `
        + `${plan.regions} of 16 patterns, ${noteName(plan.lo)} to ${noteName(top)}`
        + (plan.over ? `, and ${plan.over} above the MIDI range that we cannot read` : '')
      : '';
    canvas.setAttribute('aria-label', [label, said].filter(Boolean).join('. '));
  }

  /**
   * Six, three, two or one columns of footer cells, whichever is the most that
   * fit this box: never five and one. The widest cell is measured at its
   * reserve, so the answer does not change with the note on show.
   */
  function columns() {
    const row = values.el;
    const w = row.clientWidth;
    if (w <= 0 || row.hidden) return;
    const cells = [...row.children];
    const cell = Math.max(...cells.map((c) => c.getBoundingClientRect().width));
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    const n = [6, 3, 2].find((k) => k * cell + (k - 1) * gap <= w) || 1;
    if (row.style.getPropertyValue('--ng-cols') !== String(n)) row.style.setProperty('--ng-cols', String(n));
  }

  const ro = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => { paint(); columns(); }) : null;
  ro?.observe(lane);
  ro?.observe(foot);

  return {
    el: wrap,
    canvas,
    /** The box that scrolls, for a check measuring the sticky column. */
    scroller: scroll,
    /**
     * @param {Array} list note events from `circuit-session.mjs`'s `notesIn`
     */
    set(list) {
      events = Array.isArray(list) ? list : [];
      plan = layout(events);
      wrap.hidden = plan.count === 0;
      rows();
      summary();
      pick(stepFrom(events, plan, null), { quiet: true });
    },
    clear() {
      events = []; plan = layout([]);
      wrap.hidden = true;
      rows();
      summary();
      pick(null, { quiet: true });
      const g = canvas.getContext('2d');
      g?.clearRect(0, 0, canvas.width, canvas.height);
    },
    /** Put a note in focus, as a press would. */
    pick: (e) => pick(events.includes(e) ? e : null),
    /** The note in focus, or null. */
    picked: () => picked,
    /** What the footer cells say, read off the DOM rather than recomputed. */
    footer: () => Object.fromEntries(values.keys().map((k) => [k, values.cell(k).textContent])),
    /** One footer value box, for a check that measures it. */
    footCell: (k) => values.cell(k),
    /** A sentence about the whole picture, for a screen reader and a check. */
    says: () => said,
    /** What is drawn, for a check that wants the numbers rather than the ink. */
    facts: () => ({ ...plan, rowH, steps: STEPS, beat: BEAT }),
    /** Lit pixels in the note lane, rules included. */
    ink() {
      const g = canvas.getContext('2d');
      if (!g || !canvas.width) return 0;
      const px = g.getImageData(0, 0, canvas.width, canvas.height).data;
      let n = 0;
      for (let i = 3; i < px.length; i += 4) if (px[i] > 24) n++;
      return n;
    },
    /** Where one event landed, so a check can prove pitch really moves it. */
    place: (e) => place(e, plan, rowH),
    repaint: paint,
  };
}
