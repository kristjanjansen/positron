// demo/manifest.mjs — the story order and what each demo is, once.
//
// Both index pages and workers/view/build.mjs render from this, so there is no
// second place to forget a row.
//
//   built — a shelled demo under /demo/<n>-<name>/; demo/verify.mjs runs these
//   page  — explicit target for a page that exists but is not shelled yet
//   one   — one line: what it does
//   tags  — the tech it actually uses
//   why   — for a row with no target: why it is not clickable

export const ACTS = new Map([
  [0, 'the substrate'],
  [1, 'one stream'],
  [2, 'many people'],
  [3, 'capture and return'],
  [4, 'instruments'],
  [5, 'archives'],
  [6, 'the composition'],
]);

export const DEMOS = [
  { n: '01', name: 'transport', act: 0, built: true,
    one: 'play, pause, rate and seek on one clock; reports its drift',
    tags: ['timeline'] },
  { n: '02', name: 'lanes', act: 0, built: true,
    one: 'an audio lane and a data lane on one transport',
    tags: ['timeline', 'WebAudio'] },
  { n: '03', name: 'nest', act: 0, built: true,
    one: 'a deck quoted twice inside another, once looping three times',
    tags: ['timeline'] },
  { n: '04', name: 'score', act: 0, built: true,
    one: 'a score round-trips byte-identically and refuses mutation',
    tags: ['timeline'] },
  { n: '05', name: 'strip', act: 0, built: true,
    one: 'deep time, uncertain dates, and a statistic that names what it dropped',
    tags: ['timeline', 'canvas'] },

  { n: '06', name: 'llhls', act: 1, built: true,
    one: 'the tuned v6 player on a live input this page starts and stops',
    tags: ['LL-HLS', 'Stream', 'container'],
    // a cold container + ffmpeg + Stream ingest is ~30 s; without this the
    // harness asserts against a 204 and calls a working demo broken
    settleMs: 75000 },
  { n: '07', name: 'webrtc', act: 1, built: true,
    one: 'the same live input over WHEP; same burned-in clock as 06',
    tags: ['WebRTC', 'WHEP', 'Stream'],
    settleMs: 75000 },
  { n: '08', name: 'moq', act: 1, built: true, settleMs: 20000,
    one: 'browser to browser over MoQ, the fast tier',
    tags: ['MoQ', 'WebTransport', 'WebCodecs'] },
  { n: '09', name: 'ladder', act: 1, built: true,
    one: 'one source, two transports, the same clock burned into both pictures',
    tags: ['LL-HLS', 'WHEP', 'container'],
    settleMs: 80000 },

  { n: '10', name: 'room', act: 2, built: true,
    one: 'join a room and see the others; peer to peer, the relay only signals',
    tags: ['WebRTC', 'relay'] },
  { n: '11', name: 'grid', act: 2, built: true,
    one: 'N participants, tiered: one featured, a few live, the rest a wall',
    tags: ['WebRTC', 'SFU', 'canvas'] },
  { n: '12', name: 'cues', act: 2, built: true,
    one: 'fire one cue; every open copy of the page acts on it, tokenless',
    tags: ['DO', 'WS', 'relay'] },

  { n: '13', name: 'record', act: 3, built: true,
    one: 'record in segments and ship each one, so disk stays flat',
    tags: ['MediaRecorder', 'R2'] },
  { n: '14', name: 'replay', act: 3, built: true,
    one: 'a 190 s show off R2, played with the eight cues it was recorded with',
    tags: ['HLS', 'R2', 'timeline'] },
  { n: '15', name: 'seek', act: 3, built: true,
    one: 'seek inside that recording; the fold at any position must be exact',
    tags: ['HLS', 'R2', 'timeline'] },

  { n: '16', name: 'looper', act: 4, built: true,
    one: 'a keyboard into a WebAudio synth, then loop what you played',
    tags: ['WebAudio', 'AudioWorklet'] },
  { n: '17', name: 'instrument', act: 4, built: true,
    one: 'play into another browser; note numbers cross, MIDI bytes do not',
    tags: ['WebMIDI', 'relay', 'WebAudio'] },
  { n: '18', name: 'jam', act: 4, built: true,
    one: 'two browsers on one pulse, on a peer-corrected clock',
    tags: ['WS', 'relay', 'WebAudio'] },

  { n: '19', name: 'flipper', act: 5, built: true,
    one: 'eight live ERR channels in equal cells; the bar scrubs the 2 h DVR',
    tags: ['HLS', 'icecast', 'DVR'],
    settleMs: 14000 },
  { n: '20', name: 'kurenniemi', act: 5, built: false, page: '/proto/kurenniemi/',
    one: "Erkki Kurenniemi's corpus, media from archive.org",
    tags: ['timeline', 'not shelled'] },
  { n: '21', name: 'megatimeline', act: 5, built: false, page: '/proto/megatimeline/',
    one: 'the ERR archive as one zoomable century, 1908 to 2026',
    tags: ['canvas', 'DO cache', 'not shelled'] },
  { n: '22', name: 'remixer', act: 5, built: false, page: '/proto/remixer/',
    one: 'stack archive recordings from any year on one playhead',
    tags: ['HLS', 'timeline', 'not shelled'] },

  { n: '23', name: 'studio', act: 6, built: false,
    one: 'the operator surface: go live, fire cues, archive the show',
    tags: ['WebRTC', 'DO', 'R2'],
    why: 'consumes 10 through 14' },
  { n: '24', name: 'capture', act: 4, built: true, settleMs: 26000,
    one: 'camera in, segments out, played back on the timeline',
    tags: ['getUserMedia', 'MediaRecorder', 'R2', 'timeline'] },
];

/** Written notes, rendered by /notes/ from markdown. */
export const NOTES = [
  { doc: 'uuu-positron', title: 'positron and U:',
    one: 'two answers to one problem, where they already agree, and six ways to cowork' },
];

export const byN = (n) => DEMOS.find((d) => d.n === n);

/** the link target for a row, or null when it has none */
export const targetOf = (d) => (d.built ? `/${d.n}-${d.name}/` : d.page || null);
