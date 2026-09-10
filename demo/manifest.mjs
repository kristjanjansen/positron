// demo/manifest.mjs — the story order and what each demo is, once.
//
// Both index pages and workers/view/build.mjs render from this, so there is no
// second place to forget a row.
//
//   built — a shelled demo under /demo/<name>/; demo/verify.mjs runs these
//
// THE ARRAY ORDER IS THE STORY ORDER, and a demo's identity is its SLUG. There
// used to be an `n` on every row, in the directory name, in the URL and hard
// coded inside each page's own mount() — five places to keep in step, which is
// four too many. Moving a demo now means moving a line in this array; nothing
// is renamed and no link changes meaning.
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
  { name: 'transport', act: 0, built: true,
    one: 'twenty things happen a second apart — how close to on time each one lands',
    tags: ['timeline'] },
  { name: 'lanes', act: 0, built: true,
    one: 'an audio lane and a data lane on one transport',
    tags: ['timeline', 'WebAudio'] },
  { name: 'loops', act: 0, built: true,
    one: 'one recording placed three times — a slice, the same slice faster, and a loop',
    tags: ['timeline'] },
  { name: 'score', act: 0, built: true,
    one: 'a score round-trips byte-identically and refuses mutation',
    tags: ['timeline'] },
  { name: 'vclick', act: 0, built: true,
    one: 'a Csound score compiled to a timeline — the tempo map is an integral, the repeat is a quotation',
    tags: ['timeline', 'Csound', 'WebAudio'] },

  { name: 'llhls', act: 1, built: true,
    one: 'the tuned v6 player on a live input this page starts and stops',
    tags: ['LL-HLS', 'Stream', 'container'],
    // a cold container + ffmpeg + Stream ingest is ~30 s; without this the
    // harness asserts against a 204 and calls a working demo broken
    settleMs: 75000 },
  { name: 'webrtc', act: 1, built: true,
    one: 'the same live input over WHEP; same burned-in clock as 06',
    tags: ['WebRTC', 'WHEP', 'Stream'],
    settleMs: 75000 },
  { name: 'moq', act: 1, built: true, settleMs: 20000,
    one: 'browser to browser over MoQ, the fast tier',
    tags: ['MoQ', 'WebTransport', 'WebCodecs'] },

  { name: 'room', act: 2, built: true,
    one: 'join a room and see the others; peer to peer, the relay only signals',
    tags: ['WebRTC', 'relay'] },
  { name: 'cues', act: 2, built: true,
    one: 'fire one cue; every open copy of the page acts on it, tokenless',
    tags: ['DO', 'WS', 'relay'] },
  // The demo ABOUT the socket, rather than one that happens to use it: the
  // message shape written down, the exact bytes shown both ways, and the
  // history the relay refuses to keep. settleMs covers asking the recorder to
  // join the room before anything is sent — every assert here sits behind that.
  { name: 'wire', act: 2, built: true, settleMs: 6000,
    one: 'compose a message, watch the exact bytes go and come back, and read the history',
    tags: ['WS', 'DO', 'SQLite'] },

  // The only network-free row in Act 3, and the act's simplest complete
  // instance: make a recording yourself, then scrub it. Everything after this
  // adds exactly one thing — `record` adds disk economics, `replay` and `seek`
  // add a pre-existing show and an exact fold, `show` adds a real WebRTC hop.
  //
  // settleMs does TWO jobs here and only the second one matters. The harness
  // gives it to control 0 (`Use the camera`), which needs none of it; what
  // earns the 13 s is that the same number sizes the wait for the FIRST
  // assert, and every assert on this page sits behind a recording that runs to
  // a 10 s cap. Shrink it and the suite reads zero asserts and calls a working
  // page broken.
  { name: 'take', act: 3, built: true, settleMs: 13000,
    one: 'record two takes; they land end to end on one line and it plays and scrubs as one',
    tags: ['MediaRecorder', 'timeline', 'local only'] },
  // The round trip a browser can make on its own: publish out through a worker
  // that holds the key, subscribe back, and record the copy that came back.
  // settleMs covers the WHIP handshake, the WHEP handshake and one take.
  { name: 'keep', act: 3, built: true, settleMs: 30000,
    one: 'send a picture out, record the copy that comes back, and scrub it',
    tags: ['WHIP', 'WHEP', 'timeline'] },
  { name: 'record', act: 3, built: true,
    one: 'record in segments and ship each one, so disk stays flat',
    tags: ['MediaRecorder', 'R2'] },
  { name: 'replay', act: 3, built: true,
    one: 'a 190 s show off R2, played with the eight cues it was recorded with',
    tags: ['HLS', 'R2', 'timeline'] },
  { name: 'seek', act: 3, built: true,
    one: 'seek inside that recording; the fold at any position must be exact',
    tags: ['HLS', 'R2', 'timeline'] },

  { name: 'looper', act: 4, built: true,
    one: 'a keyboard into a WebAudio synth, then loop what you played',
    tags: ['WebAudio', 'AudioWorklet'] },
  { name: 'instrument', act: 4, built: true,
    one: 'play into another browser; note numbers cross, MIDI bytes do not',
    tags: ['WebMIDI', 'relay', 'WebAudio'] },
  { name: 'jam', act: 4, built: true,
    one: 'two browsers on one pulse, on a peer-corrected clock',
    tags: ['WS', 'relay', 'WebAudio'] },

  // The archival horizon and the timeline library, meeting for the first time:
  // a deck positioned in 1965, which is a NEGATIVE epoch. Catalogue metadata is
  // committed; the media streams from ERR and nothing is stored here.
  { name: 'reel', act: 5, built: true,
    one: 'every 1965 newsreel on one line, at the day it was broadcast',
    tags: ['ERR', 'archive', 'timeline'] },
  { name: 'now', act: 5, built: true,
    one: 'one live ERR channel on a line whose right-hand end is the present moment',
    tags: ['HLS', 'live', 'timeline', 'DVR'],
    // master + a 218 KB media playlist + first fragments + first PDT + one EPG
    // fetch + a 13-point two-byte sweep, all behind control 0
    settleMs: 26000 },
  { name: 'flipper', act: 5, built: true,
    one: 'eight live ERR channels in equal cells; the bar scrubs the 2 h DVR',
    tags: ['HLS', 'icecast', 'DVR'],
    settleMs: 14000 },
  { name: 'kurenniemi', act: 5, built: false, page: '/proto/kurenniemi/',
    one: "Erkki Kurenniemi's corpus, media from archive.org",
    tags: ['timeline', 'not shelled'] },
  { name: 'megatimeline', act: 5, built: false, page: '/proto/megatimeline/',
    one: 'the ERR archive as one zoomable century, 1908 to 2026',
    tags: ['canvas', 'DO cache', 'not shelled'] },
  { name: 'remixer', act: 5, built: false, page: '/proto/remixer/',
    one: 'stack archive recordings from any year on one playhead',
    tags: ['HLS', 'timeline', 'not shelled'] },

  { name: 'studio', act: 6, built: false,
    one: 'the operator surface: go live, fire cues, archive the show',
    tags: ['WebRTC', 'DO', 'R2'],
    why: 'consumes 10 through 14' },
  { name: 'capture', act: 4, built: true, settleMs: 26000,
    one: 'camera in, segments out, played back on the timeline',
    tags: ['getUserMedia', 'MediaRecorder', 'R2', 'timeline'] },
  // the first page where all three legs meet: live over a real WebRTC hop, the
  // FAR END of that hop recorded, and the recording scrubbed on the deck
  { name: 'show', act: 3, built: true, settleMs: 9000,
    one: 'live over WebRTC, recorded off the far end of that hop, replayed on the timeline',
    tags: ['WebRTC', 'MediaRecorder', 'timeline'] },

  // 26 is Act 5 with 19: both are ERR's live output, one television and one
  // radio, and both are here because the archive work needs the live end of the
  // same pipe. `built` flips the moment positron-shout answers.
  { name: 'shout', act: 5, built: true, settleMs: 12000,
    one: 'an icecast stream through Cloudflare — the relay adds the CORS that makes it measurable',
    tags: ['Icecast', 'Workers', 'WebAudio'] },


  // Act 0 with 04 score: this is library machinery with a picture on it, not a
  // network demo — it touches nothing outside the page.
  { name: 'strip', act: 0, built: true,
    one: 'deep time, uncertain dates, and a statistic that names what it dropped',
    tags: ['timeline', 'canvas'] },
];

/** Written notes, rendered by /notes/ from markdown. */
export const NOTES = [
  { doc: 'uuu-positron', title: 'positron and U:',
    one: 'two answers to one problem, where they already agree, and six ways to cowork' },
];

export const bySlug = (name) => DEMOS.find((d) => d.name === name);

/** the link target for a row, or null when it has none */
export const targetOf = (d) => (d.built ? `/${d.name}/` : d.page || null);

/**
 * ONE renderer for an index row, because there were two.
 *
 * `demo/index.html` and `workers/view/build.mjs` each carried their own copy of
 * this function. Dropping the `n` field fixed the build's copy and left the
 * local one printing `undefined` over every demo name — the exact failure this
 * file's own header claims cannot happen ("no second place to forget a row").
 * The header was aspirational; now it is true.
 *
 * `i` is the row's POSITION, and the number shown is display rather than
 * identity: reorder the array and the list renumbers while nothing is renamed.
 */
export function rowHTML(d, i) {
  const href = targetOf(d);
  const tags = (d.tags || []).map((t) => `<span class="d-tag">${t}</span>`).join('');
  const open = href ? `<a href="${href}">` : '<a>';
  return `<li class="d-row${href ? '' : ' todo'}">${open}`
    + `<span class="n">${String(i + 1).padStart(2, '0')}</span>`
    + `<span class="nm">${d.name}</span>`
    + `<span class="d-one">${d.one || ''}</span>`
    + `<span class="d-meta">${tags}</span>`
    + '</a></li>';
}

/** and the note row, for the same reason */
export function noteHTML(n) {
  return '<li class="d-row"><a href="/notes/?doc=' + n.doc + '">'
    + '<span class="n">·</span>'
    + '<span class="nm">' + n.title + '</span>'
    + '<span class="d-one">' + n.one + '</span>'
    + '</a></li>';
}
