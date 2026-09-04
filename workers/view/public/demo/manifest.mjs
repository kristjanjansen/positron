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

/**
 * built  — a shelled demo under /demo/<n>-<name>/; demo/verify.mjs runs these.
 * page   — an explicit link target for a page that exists but is not shelled yet.
 * Rows with neither render greyed: a visible plan, not a dead link.
 */
export const DEMOS = [
  { n: '01', name: 'transport',    act: 0, built: true },
  { n: '02', name: 'lanes',        act: 0, built: true },
  { n: '03', name: 'nest',         act: 0, built: true },
  { n: '04', name: 'score',        act: 0, built: true },
  { n: '05', name: 'strip',        act: 0, built: true },

  { n: '06', name: 'llhls',        act: 1, built: false },
  { n: '07', name: 'webrtc',       act: 1, built: false },
  { n: '08', name: 'moq',          act: 1, built: false },
  { n: '09', name: 'ladder',       act: 1, built: false },

  { n: '10', name: 'room',         act: 2, built: false },
  { n: '11', name: 'grid',         act: 2, built: false },
  { n: '12', name: 'cues',         act: 2, built: false },

  { n: '13', name: 'record',       act: 3, built: false },
  { n: '14', name: 'replay',       act: 3, built: true },
  { n: '15', name: 'seek',         act: 3, built: true },

  { n: '16', name: 'looper',       act: 4, built: true },
  { n: '17', name: 'instrument',   act: 4, built: false },
  { n: '18', name: 'jam',          act: 4, built: false },

  { n: '19', name: 'flipper',      act: 5, built: false, page: '/proto/flipper/' },
  { n: '20', name: 'kurenniemi',   act: 5, built: false, page: '/proto/kurenniemi/' },
  { n: '21', name: 'megatimeline', act: 5, built: false, page: '/proto/megatimeline/' },
  { n: '22', name: 'remixer',      act: 5, built: false, page: '/proto/remixer/' },

  { n: '23', name: 'studio',       act: 6, built: false },
];

export const byN = (n) => DEMOS.find((d) => d.n === n);
