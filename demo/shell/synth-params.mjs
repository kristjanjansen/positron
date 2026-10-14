// demo/shell/synth-params.mjs: the parameters a synth voice takes, as knobs.
// Split 2026-10-14 out of demo/synth/patch-synth.mjs (plans/plan-connect-ui.md
// slice 2): only what the /connect/ synth's five parameters need, the pitch
// arithmetic, the exponential knob travel and the readings. patch-synth.mjs
// still holds its own copy until it moves onto this file (the page-move list
// at the end of the plan).
//
// Pure and import free, so node-runtime.mjs and its test can read the names.

export const WAVES = ['sine', 'triangle', 'sawtooth', 'square'];
export const hz = (n) => 440 * 2 ** ((n - 69) / 12);

/** Exponential travel for a knob whose raw value runs 0 to 127. */
export const expo = (lo, hi) => ({
  to: (raw) => lo * (hi / lo) ** (raw / 127),
  from: (v) => (127 * Math.log(v / lo)) / Math.log(hi / lo),
});
const C = expo(80, 8000), A = expo(0.003, 2), R = expo(0.02, 3);
export const hzText = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${Math.round(v)} Hz`);
export const sText = (v) => (v >= 1 ? `${v.toFixed(2)} s` : `${Math.round(v * 1000)} ms`);

/**
 * One row per parameter: `raw` is what the dial shows, `value(raw)` what
 * travels along the link, `raw0(v)` the dial position for a value.
 */
export const PARAMS = [
  { name: 'wave', min: 0, max: 3, step: 1, value: (r) => WAVES[Math.round(r)], raw0: (v) => WAVES.indexOf(v),
    format: (r) => WAVES[Math.round(r)].replace('sawtooth', 'saw') },
  { name: 'cutoff', min: 0, max: 127, value: C.to, raw0: C.from, format: (r) => hzText(C.to(r)) },
  { name: 'q', min: 0.7, max: 15, value: (r) => r, raw0: (v) => v, format: (r) => r.toFixed(1) },
  { name: 'attack', min: 0, max: 127, value: A.to, raw0: A.from, format: (r) => sText(A.to(r)) },
  { name: 'release', min: 0, max: 127, value: R.to, raw0: R.from, format: (r) => sText(R.to(r)) },
];
export const PARAM_NAMES = PARAMS.map((p) => p.name);

/** The dial position for parameter `name` at value `v`, clamped to its travel. */
export function knobRaw(name, v) {
  const p = PARAMS.find((x) => x.name === name);
  if (!p) return v;
  const r = p.raw0(v);
  return Math.max(p.min, Math.min(p.max, Number.isFinite(r) ? r : p.min));
}
