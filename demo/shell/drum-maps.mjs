// demo/shell/drum-maps.mjs: General MIDI drum notes, and each drum instrument's own notes keyed by
// them. Pure and import free, so rig/board ships it and graph-registry.mjs is handed it.
// why: lessons/kit-drum-maps.md#header

/**
 * The GM drum voices the sequencer can name, by voice key. Notes match demo/drums/voices.mjs
 * `NOTE` (drum-maps-test.mjs asserts it), names are what a person reads.
 */
export const GM_VOICES = {
  kick: { note: 36, name: 'kick' }, snare: { note: 38, name: 'snare' },
  hhc: { note: 42, name: 'closed hat' }, hho: { note: 46, name: 'open hat' },
  clap: { note: 39, name: 'clap' }, tomlo: { note: 45, name: 'low tom' },
  tomhi: { note: 50, name: 'high tom' }, cowbell: { note: 56, name: 'cowbell' },
  rim: { note: 37, name: 'rim shot' }, ride: { note: 51, name: 'ride' },
  crash: { note: 49, name: 'crash' }, shaker: { note: 70, name: 'shaker' },
  tamb: { note: 54, name: 'tambourine' }, claves: { note: 75, name: 'claves' },
  congalo: { note: 64, name: 'low conga' }, congahi: { note: 63, name: 'high conga' },
  tommid: { note: 47, name: 'mid tom' }, agogo: { note: 67, name: 'agogo' },
};
/** A GM note's name, or the number when it is not one of GM_VOICES. */
export const gmName = (n) => Object.values(GM_VOICES).find((v) => v.note === Number(n))?.name ?? String(n);

/**
 * A device's drum map: `map` is GM note -> the device's note (null is identity), `labels` the
 * device's names for its notes. Notes the map lacks are dropped by the `drummap` transform.
 * The Circuit's notes are DOCUMENTED (Drum Notes Table; 60, 62, 64 also measured), 65 never
 * measured, and which GM voice goes to which slot is INFERRED: the slot's sound is per session.
 * why: lessons/kit-drum-maps.md#circuit
 */
export const DRUM_MAPS = {
  gm: { name: 'gm', label: 'General MIDI', channel: 10, map: null, labels: {} },
  circuit: {
    name: 'circuit', label: 'Circuit drums', channel: 10,
    map: { 36: 60, 38: 62, 42: 64, 46: 65 },
    labels: { 60: 'drum 1', 62: 'drum 2', 64: 'drum 3', 65: 'drum 4' },
  },
};

/**
 * One row per mapped GM note, `{ from, name, to, label, line }`, `line` reading `36 kick -> 60 drum 1`.
 * Takes a map entry or a resolved drummap transform (both carry `map` and `labels`).
 */
export function drumRows(m) {
  if (!m || m.map === null) return [];
  return Object.entries(m.map || {}).map(([from, to]) => {
    const name = gmName(from), label = m.labels?.[to] || '';
    return { from: Number(from), name, to, label, line: `${from} ${name} -> ${to}${label ? ` ${label}` : ''}` };
  }).sort((a, b) => a.from - b.from);
}

/** Does this map play a GM note: identity plays everything, otherwise only its keys. */
export const plays = (m, note) => !!m && (m.map === null || m.map?.[note] !== undefined);
