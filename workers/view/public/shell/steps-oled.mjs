// demo/shell/steps-oled.mjs: a drum step pattern on the Pi's 128x64 OLED, in the firmware kit's
// calls (oled-ui.wasm through panel-screen.mjs), so the Pi and /devices/drums/ draw the same bytes.
// Lit pixels on dark only: no inverted box, no text cut out of a fill. No DOM, node imports it.
// why: lessons/kit-steps-oled.md#header

export const W = 128, H = 64;
/** 16 square steps: a 7 px pitch, a 5 px cell, the grid 9 px in from each side, so nothing sits at the
 *  panel's outermost pixels (the real screen read as cut at its edges). */
const PITCH = 7, CW = 5, X0 = Math.floor((128 - 15 * PITCH - CW) / 2);
/** 8 rows of squares, 56 px, 4 px clear top and bottom; with a lane cursor the grid rides up 2 px. */
export const MAX_ROWS = 8;
/** How an empty step is drawn, and how the running step is marked. */
export const EMPTIES = ['outline', 'dot', 'pixel', 'underline', 'none'];
export const HEADS = ['frame', 'lane'];

/** A row as a list of on steps, from a '1010' string or an array of truthy values. */
const rowOn = (row, n) => {
  const out = new Array(n).fill(false);
  if (typeof row === 'string') for (let i = 0; i < n; i++) out[i] = row[i] === '1' || row[i] === 'x';
  else if (Array.isArray(row)) for (let i = 0; i < n; i++) out[i] = !!row[i];
  return out;
};

/** Where step `c` of row `r` is drawn when there are `rows` rows: `{ x, y, w, h }`, a square, the grid centred. */
export function stepCell(r, c, rows, head = 'frame') {
  const R = Math.max(1, Math.min(MAX_ROWS, rows)), room = head === 'lane' ? H - 4 : H;
  const top = Math.floor((room - R * PITCH + 2) / 2);
  return { x: X0 + c * PITCH, y: top + r * PITCH, w: CW, h: CW };
}

const box = (ui, x, y, w, h) => { ui.fill(x, y, w, 1, 1); ui.fill(x, y + h - 1, w, 1, 1); ui.fill(x, y, 1, h, 1); ui.fill(x + w - 1, y, 1, h, 1); };

/**
 * `drawStepsOled(ui, s)`: `s` is `{ pattern, steps, step, look: { empty, head } }`, one row of the grid
 * a voice. An on step is a filled square; `empty` says how an off one is drawn; `step` (-1 none) is
 * the running step, marked by `head`: a frame round its column, or a bar in a lane under the grid.
 */
export function drawStepsOled(ui, s) {
  const R = Math.max(1, Math.min(MAX_ROWS, (s.pattern || s.voices || []).length || 1));
  const steps = Math.max(1, Math.min(16, s.steps || 16));
  const empty = EMPTIES.includes(s.look?.empty) ? s.look.empty : 'outline';
  const head = HEADS.includes(s.look?.head) ? s.look.head : 'frame';
  const pattern = s.pattern || [];
  for (let r = 0; r < R; r++) {
    const on = rowOn(pattern[r], steps);
    for (let c = 0; c < steps; c++) {
      const { x, y, w, h } = stepCell(r, c, R, head);
      if (on[c]) ui.fill(x, y, w, h, 1);
      else if (empty === 'outline') box(ui, x, y, w, h);
      else if (empty === 'dot') ui.fill(x + 2, y + 2, 2, 2, 1);
      else if (empty === 'pixel') ui.fill(x + 2, y + 2, 1, 1, 1);
      else if (empty === 'underline') ui.fill(x, y + h - 1, w, 1, 1);
    }
  }
  const step = Number.isInteger(s.step) ? s.step : -1;
  if (step < 0 || step >= steps) return;
  const a = stepCell(0, step, R, head), z = stepCell(R - 1, step, R, head);
  // the frame sits in the 2 px gutter round the column, so it never touches a square
  if (head === 'frame') box(ui, a.x - 1, a.y - 1, a.w + 2, z.y + z.h - a.y + 2);
  else ui.fill(a.x, H - 4, a.w, 2, 1);
}
