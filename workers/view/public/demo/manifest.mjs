// demo/manifest.mjs — the story order, once. The index renders from this, and
// workers/view/build.mjs can generate its allowlist from it instead of being
// hand-maintained.

export const ACTS = new Map([
  [0, 'the substrate — no network'],
  [1, 'one stream'],
  [2, 'many people'],
  [3, 'capture and return'],
  [4, 'instruments'],
  [5, 'archives'],
  [6, 'the composition'],
]);

/** built:false rows render greyed in the index — visible plan, not a dead link. */
export const DEMOS = [
  { n: '01', name: 'transport',    act: 0, built: true,  shows: 'one clock' },
  { n: '02', name: 'lanes',        act: 0, built: true,  shows: 'audio + data on one transport' },
  { n: '03', name: 'nest',         act: 0, built: true,  shows: 'a timeline inside a timeline' },
  { n: '04', name: 'score',        act: 0, built: true,  shows: 'a score is a value' },
  { n: '05', name: 'strip',        act: 0, built: true,  shows: 'deep time, uncertainty' },

  { n: '06', name: 'llhls',        act: 1, built: false, shows: 'tuned low-latency player' },
  { n: '07', name: 'webrtc',       act: 1, built: false, shows: 'glass-to-glass' },
  { n: '08', name: 'moq',          act: 1, built: false, shows: 'the fast tier' },
  { n: '09', name: 'ladder',       act: 1, built: false, shows: 'all three, one source' },

  { n: '10', name: 'room',         act: 2, built: false, shows: 'join, see each other' },
  { n: '11', name: 'grid',         act: 2, built: false, shows: 'N up, tiered' },
  { n: '12', name: 'cues',         act: 2, built: false, shows: 'fire one cue' },

  { n: '13', name: 'record',       act: 3, built: false, shows: 'local, then R2' },
  { n: '14', name: 'replay',       act: 3, built: true,  shows: 'R2 show + its 8 cues' },
  { n: '15', name: 'seek',         act: 3, built: true,  shows: 'the fold is exact' },

  { n: '16', name: 'looper',       act: 4, built: true,  shows: 'keyboard + WebAudio, no MIDI' },
  { n: '17', name: 'instrument',   act: 4, built: false, shows: 'remote MIDI' },
  { n: '18', name: 'jam',          act: 4, built: false, shows: 'two players, one pulse' },

  { n: '19', name: 'flipper',      act: 5, built: false, shows: 'live ERR channels' },
  { n: '20', name: 'kurenniemi',   act: 5, built: false, shows: 'one corpus' },
  { n: '21', name: 'megatimeline', act: 5, built: false, shows: '1908 → 2026' },
  { n: '22', name: 'remixer',      act: 5, built: false, shows: 'compose from the archive' },

  { n: '23', name: 'studio',       act: 6, built: false, shows: 'the operator surface' },
];

export const byN = (n) => DEMOS.find((d) => d.n === n);
