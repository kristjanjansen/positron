// demo/shell/steps-oled.mjs: a drum step pattern on the Pi's 128x64 OLED, in the firmware kit's
// calls (oled-ui.wasm through panel-screen.mjs), so the Pi and /devices/drums/ draw the same bytes.
// Lit pixels on dark only: no inverted box, no text cut out of a fill. No DOM, node imports it.
// why: lessons/kit-steps-oled.md#header

export const W = 128, H = 64;
/** 16 steps across the whole width: an 8 px pitch, a 6 px cell, 1 px clear of each edge. */
const PITCH = 8, CW = 6, X0 = 1;

/** A row as a list of on steps, from a '1010' string or an array of truthy values. */
const rowOn = (row, n) => {
  const out = new Array(n).fill(false);
  if (typeof row === 'string') for (let i = 0; i < n; i++) out[i] = row[i] === '1' || row[i] === 'x';
  else if (Array.isArray(row)) for (let i = 0; i < n; i++) out[i] = !!row[i];
  return out;
};

/** Where step `c` of row `r` is drawn when there are `rows` rows: `{ x, y, w, h }`. */
export function stepCell(r, c, rows) {
  const R = Math.max(1, Math.min(6, rows)), band = Math.floor(H / R), h = Math.min(band - 4, 10);
  return { x: X0 + c * PITCH, y: r * band + Math.floor((band - h) / 2), w: CW, h };
}

/**
 * `drawStepsOled(ui, s)`: `s` is `{ voices, pattern, steps }`, one row of the grid a voice. The grid
 * alone for now: an on step is a filled cell, an off step its outline. No names, no playhead.
 */
export function drawStepsOled(ui, s) {
  const R = Math.max(1, Math.min(6, (s.voices || s.pattern || []).length || 1));
  const steps = Math.max(1, Math.min(16, s.steps || 16));
  const pattern = s.pattern || [];
  for (let r = 0; r < R; r++) {
    const on = rowOn(pattern[r], steps);
    for (let c = 0; c < steps; c++) {
      const { x, y, w, h } = stepCell(r, c, R);
      if (on[c]) ui.fill(x, y, w, h, 1);
      else { ui.fill(x, y, w, 1, 1); ui.fill(x, y + h - 1, w, 1, 1); ui.fill(x, y, 1, h, 1); ui.fill(x + w - 1, y, 1, h, 1); }
    }
  }
}
