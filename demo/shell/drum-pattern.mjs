// demo/shell/drum-pattern.mjs: one drum pattern as plain data, shared by /devices/drums/ and the board's
// sequencer. Rows name General MIDI voices (drum-maps.mjs GM_VOICES), one character a step.
// Pure: no clock, no socket. why: lessons/kit-drum-pattern.md#header

import { GM_VOICES } from './drum-maps.mjs';

export const PATTERN_V = 1;
export const STEPS = 16;
export const BPM_MIN = 40, BPM_MAX = 240;
export const MAX_ROWS = 16;

/** A step's length in ms, four steps a beat. */
export const stepMs = (bpm) => 60000 / (bpm * 4);

/**
 * Check and copy a pattern. Answers `{ ok: true, pattern }` or `{ ok: false, why }`.
 * `{ v: 1, name, bpm, steps: 16, rows: [{ voice, steps: '1000100010001000', mute }] }`.
 */
export function normalizePattern(p) {
  if (!p || typeof p !== 'object') return { ok: false, why: 'a pattern is an object' };
  if (p.v !== undefined && p.v !== PATTERN_V) return { ok: false, why: `pattern version ${p.v} is not ${PATTERN_V}` };
  const bpm = p.bpm === undefined ? 120 : p.bpm;
  if (!Number.isFinite(bpm) || bpm < BPM_MIN || bpm > BPM_MAX) return { ok: false, why: `bpm is a number from ${BPM_MIN} to ${BPM_MAX}, not ${JSON.stringify(p.bpm)}` };
  const steps = p.steps === undefined ? STEPS : p.steps;
  if (steps !== STEPS) return { ok: false, why: `a pattern is ${STEPS} steps, not ${JSON.stringify(p.steps)}` };
  if (!Array.isArray(p.rows) || !p.rows.length) return { ok: false, why: 'a pattern has a list of rows' };
  if (p.rows.length > MAX_ROWS) return { ok: false, why: `a pattern has at most ${MAX_ROWS} rows, not ${p.rows.length}` };
  const rows = [];
  for (const [i, r] of p.rows.entries()) {
    if (!r || !GM_VOICES[r.voice]) return { ok: false, why: `row ${i + 1} names ${JSON.stringify(r?.voice)}, which is not one of ${Object.keys(GM_VOICES).join(', ')}` };
    const s = String(r.steps ?? '');
    if (!new RegExp(`^[01]{${STEPS}}$`).test(s)) return { ok: false, why: `row ${i + 1} (${r.voice}) is ${STEPS} characters of 0 and 1, not ${JSON.stringify(r.steps)}` };
    rows.push({ voice: r.voice, steps: s, mute: r.mute === true });
  }
  return { ok: true, pattern: { v: PATTERN_V, name: typeof p.name === 'string' ? p.name.slice(0, 24) : '', bpm, steps, rows } };
}

/** The GM notes one step plays: every unmuted row with a 1 there. */
export function notesAt(pattern, step) {
  const out = [];
  for (const r of pattern?.rows || []) if (!r.mute && r.steps[step] === '1') out.push(GM_VOICES[r.voice].note);
  return out;
}

/** A pattern from a grid: `voices` are row keys, `grid` rows of booleans. */
export function patternOf(voices, grid, bpm, name = '') {
  return { v: PATTERN_V, name, bpm, steps: STEPS,
    rows: voices.map((voice, r) => ({ voice, steps: Array.from({ length: STEPS }, (_, s) => (grid?.[r]?.[s] ? '1' : '0')).join(''), mute: false })) };
}
