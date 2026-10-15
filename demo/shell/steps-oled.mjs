// demo/shell/steps-oled.mjs: a drum step pattern on the Pi's 128x64 OLED, in the firmware kit's
// calls (oled-ui.wasm through panel-screen.mjs), so the Pi and /devices/drums/ draw the same bytes.
// Lit pixels on dark only: no inverted box, no text cut out of a fill. No DOM, node imports it.
// why: lessons/kit-steps-oled.md#header

export const W = 128, H = 64;
/** Where the grid starts, one step's pitch and width: 16 steps end at x 126. */
const X0 = 16, PITCH = 7, CW = 6;
/** The grid's height above the playhead lane. */
const GRID_H = 52, LANE_Y = 56;

/** A row as a list of on steps, from a '1010' string or an array of truthy values. */
const rowOn = (row, n) => {
  const out = new Array(n).fill(false);
  if (typeof row === 'string') for (let i = 0; i < n; i++) out[i] = row[i] === '1' || row[i] === 'x';
  else if (Array.isArray(row)) for (let i = 0; i < n; i++) out[i] = !!row[i];
  return out;
};

/**
 * `drawStepsOled(ui, s)`: `s` is `{ voices, pattern, step, voice, playing }`. `voices` are short
 * labels (two letters fit), `pattern` one row per voice, `step` the playhead (-1 none), `voice` the
 * row the keys edit (-1 none), `playing` false draws the playhead hollow, as a cursor.
 */
export function drawStepsOled(ui, s) {
  const voices = (s.voices || []).slice(0, 6), R = Math.max(1, voices.length);
  const steps = Math.max(1, Math.min(16, s.steps || 16));
  const pitch = Math.floor(GRID_H / R), ch = Math.max(3, pitch - 3);
  const step = Number.isInteger(s.step) ? s.step : -1;
  const pattern = s.pattern || [];
  voices.forEach((label, r) => {
    const y = r * pitch, mid = y + Math.floor(ch / 2);
    // the row the keys edit: a small lit triangle left of its label
    if (r === s.voice) for (let i = 0; i < 3; i++) ui.fill(i, mid - 2 + i, 1, 5 - 2 * i, 1);
    ui.text(4, y + Math.max(0, Math.floor((ch - ui.cap) / 2)), String(label).slice(0, 2));
    const on = rowOn(pattern[r], steps);
    for (let c = 0; c < steps; c++) {
      const x = X0 + c * PITCH;
      if (on[c]) ui.fill(x, y, CW, ch, 1);
      // the playhead's column: an off step is an outline, so the column reads without a fill
      else if (c === step) { ui.fill(x, y, CW, 1, 1); ui.fill(x, y + ch - 1, CW, 1, 1); ui.fill(x, y, 1, ch, 1); ui.fill(x + CW - 1, y, 1, ch, 1); }
      // an off step: a 2x2 dot on a beat, one pixel elsewhere
      else if (c % 4 === 0) ui.fill(x + 2, mid, 2, 2, 1);
      else ui.fill(x + 2, mid, 1, 1, 1);
    }
  });
  // the playhead lane: a bar under the step, filled while playing, hollow as a cursor when stopped
  if (step >= 0 && step < steps) {
    const x = X0 + step * PITCH;
    if (s.playing) ui.fill(x, LANE_Y, CW, 4, 1);
    else { ui.fill(x, LANE_Y, CW, 1, 1); ui.fill(x, LANE_Y + 3, CW, 1, 1); ui.fill(x, LANE_Y, 1, 4, 1); ui.fill(x + CW - 1, LANE_Y, 1, 4, 1); }
  }
  // the beats under the lane, a short tick at each
  for (let c = 0; c < steps; c += 4) ui.fill(X0 + c * PITCH, H - 2, 2, 1, 1);
}
