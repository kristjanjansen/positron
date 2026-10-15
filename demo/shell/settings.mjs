// demo/shell/settings.mjs: what a `settings` answer on /connect/ may set, per instrument type, read
// off each runtime's own parameter source so a name or a range is never typed twice. Numbers only:
// a named sound (a synth wave, a sampler program, a Plaits patch) is a `patch` transform on a link.

import { PARAMS as SYNTH } from './synth-params.mjs';
import { KNOBS as PLAITS } from './plaits-params.mjs';
import { DEFAULTS as GRAIN_DEFAULTS, PATCHES as GRAIN_PATCHES, PROGRAM as GRAIN_PROGRAM } from '../granulator/grain-ring.mjs';

const round = (v) => +Number(v).toPrecision(4);

// The synth: every row whose value is a number, over its knob's whole travel (wave is a patch).
const synth = SYNTH.filter((p) => typeof p.value(p.min) === 'number')
  .map((p) => ({ name: p.name, lo: round(p.value(p.min)), hi: round(p.value(p.max)) }));

// Plaits: the knob row as /code/plaits/ draws it.
const plaits = PLAITS.map((k) => ({ name: k.name, lo: k.min, hi: k.max }));

// The grain ring: a control's `spec:` in the program where it has one, else the span its own
// patches and defaults use. A control no patch moves (lock) is left out.
const SPEC = Object.fromEntries([...GRAIN_PROGRAM.matchAll(/\\(\w+)\.kr\([^)]*?spec:\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/g)]
  .map((m) => [m[1], [Number(m[2]), Number(m[3])]]));
const grains = Object.keys(GRAIN_DEFAULTS).map((name) => {
  const seen = [GRAIN_DEFAULTS[name], ...GRAIN_PATCHES.map((p) => p.set[name]).filter((v) => typeof v === 'number'), ...(SPEC[name] || [])];
  return { name, lo: Math.min(...seen), hi: Math.max(...seen) };
}).filter((s) => s.hi > s.lo);

/** Catalogue type to the settings its runtime takes on value-in as `{ of: 'param', name, v }`. */
export const SETTINGS = { synth, plaits, grains };

/** The settings a value-in takes, as the words its port label carries, or ''. */
export function paramsText(type) {
  const list = SETTINGS[type];
  return list?.length ? `params: ${list.map((s) => `${s.name} ${s.lo}..${s.hi}`).join(', ')}` : '';
}

/** A value-in's label with its settings in it, so a model reading the label knows them. */
export const withParams = (label, type) => (paramsText(type) ? `${label} (${paramsText(type)})` : label);

/**
 * One node's settings checked against its type. Answers `{ set, why }`: `set` the values to deliver
 * (a numeric string read as a number), `why` one sentence per refusal.
 */
export function checkSettings(type, node, asked) {
  const list = SETTINGS[type], set = {}, why = [];
  if (!list) return { set, why: [`${node} takes no settings here`] };
  if (!asked || typeof asked !== 'object' || Array.isArray(asked)) return { set, why: [`the settings for ${node} are not a list of names and values`] };
  for (const [name, raw] of Object.entries(asked)) {
    const s = list.find((x) => x.name === name);
    if (!s) { why.push(`${node} has no setting called ${JSON.stringify(name)}; it has ${list.map((x) => x.name).join(', ')}`); continue; }
    const v = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
    if (typeof v !== 'number' || !Number.isFinite(v)) { why.push(`${node} ${name} takes a number, and the answer gave ${JSON.stringify(raw)}`); continue; }
    if (v < s.lo || v > s.hi) { why.push(`${node} ${name} runs ${s.lo}..${s.hi}, and the answer asked ${v}`); continue; }
    set[name] = v;
  }
  return { set, why };
}
