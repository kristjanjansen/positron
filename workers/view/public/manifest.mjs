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
//   src   — for a `page` row, WHERE THAT FILE LIVES. Both the deploy and the
//           dev server read it, so a page outside demo/ is declared once here
//           rather than hand-written into build.mjs's copy list AND
//           demo/server.mjs's rewrite. There were two such pages and four such
//           edits; the third would have been another two, in two files, with
//           nothing to notice if only one was made.
//   one   — one line: what it does
//   tags  — the tech it actually uses; demo/shell/caps.mjs reads REQUIREMENTS
//           off these, so there is no second `needs:` list to forget
//   why   — for a row with no target: why it is not clickable
//
//   created — the day the page first landed, and it is WRITTEN DOWN rather
//           than derived. A creation date is immutable, so a literal here can
//           never go stale — while `git log` would answer differently the
//           moment a file is moved, and this repo has already renamed every
//           demo directory once (`10f6b3b`, slugs replacing numbers), which
//           flattened sixteen of these dates to the rename's own day.

// The requirement table lives in demo/shell/caps.mjs, beside the probes that
// test for it — one table, read here at render time, so a row's `data-needs`
// and the browser's answer can never disagree about what a name means.
import { needsOf } from './shell/caps.mjs';

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
  { name: 'transport', act: 0, created: '2026-09-04', built: true,
    one: 'twenty things happen a second apart — how close to on time each one lands',
    tags: ['timeline'] },
  { name: 'lanes', act: 0, created: '2026-09-04', built: true,
    one: 'an audio lane and a data lane on one transport',
    tags: ['timeline', 'WebAudio'] },
  { name: 'loops', act: 0, created: '2026-09-04', built: true,
    one: 'one recording placed three times — a slice, the same slice faster, and a loop',
    tags: ['timeline'] },
  { name: 'score', act: 0, created: '2026-09-04', built: true,
    one: 'a score round-trips byte-identically and refuses mutation',
    tags: ['timeline'] },
  { name: 'vclick', act: 0, created: '2026-09-07', built: true,
    one: 'a Csound score compiled to a timeline — the tempo map is an integral, the repeat is a quotation',
    tags: ['timeline', 'Csound', 'WebAudio'] },

  { name: 'llhls', act: 1, created: '2026-09-04', built: true,
    one: 'the tuned v6 player on a live input this page starts and stops',
    tags: ['LL-HLS', 'Stream', 'container'],
    // a cold container + ffmpeg + Stream ingest is ~30 s; without this the
    // harness asserts against a 204 and calls a working demo broken
    settleMs: 75000 },
  { name: 'webrtc', act: 1, created: '2026-09-04', built: true,
    one: 'the same live input over WHEP; same burned-in clock as 06',
    tags: ['WebRTC', 'WHEP', 'Stream'],
    settleMs: 75000 },
  { name: 'moq', act: 1, created: '2026-09-05', built: true, settleMs: 20000,
    one: 'browser to browser over MoQ, the fast tier',
    tags: ['MoQ', 'WebTransport', 'WebCodecs'] },

  { name: 'room', act: 2, created: '2026-09-04', built: true,
    one: 'join a room and see the others; peer to peer, the relay only signals',
    tags: ['getUserMedia', 'WebRTC', 'relay'] },
  { name: 'cues', act: 2, created: '2026-09-04', built: true,
    one: 'fire one cue; every open copy of the page acts on it, tokenless',
    tags: ['DO', 'WS', 'relay'] },
  // The demo ABOUT the socket, rather than one that happens to use it: the
  // message shape written down, the exact bytes shown both ways, and the
  // history the relay refuses to keep. settleMs covers asking the recorder to
  // join the room before anything is sent — every assert here sits behind that.
  // The picture, drawn twice. `gl: true` is what puts it in demo/verify-gl.mjs
  // rather than demo/verify.mjs — the ordinary harness runs Chrome with
  // --disable-gpu, where getContext('webgl2') returns null and every assert
  // here would be unreachable.
  { name: 'mirror', act: 0, created: '2026-09-11', built: true, gl: true, settleMs: 5000,
    one: 'the same shader drawn by your browser and by a Raspberry Pi, side by side',
    tags: ['WebGL2', 'WebCodecs', 'H.264', 'WS'] },

  // A room from one 32-bit number, and the first WebXR page here. `gl: true`
  // for the same reason `mirror` has it — demo/verify.mjs runs Chrome with
  // --disable-gpu, where getContext('webgl2') is null and every assert on this
  // page would be unreachable.
  //
  // ⚠️ TWO OF ITS ASSERTS CANNOT BE REACHED BY ANY DESKTOP BROWSER — that an
  // immersive session started, and that a floor-relative space resolved. They
  // are the Quest-only branch, and they are why demo/verify-quest.mjs has to
  // exist before this page's green means anything about a headset. Until it
  // does, the headset half is HUMAN-VERIFIED and the page says so on its face.
  // The Immersive Web Emulator satisfies both on a laptop, which makes it
  // useful for writing the page and worthless as evidence about a device —
  // research/quest-xr calls that "the iPhone mistake in a new accent".
  { name: 'scene', act: 0, created: '2026-09-11', built: true, gl: true, settleMs: 6000,
    one: 'a room built from one number — roll it, and the same number rebuilds it exactly',
    tags: ['WebXR', 'WebGL2', 'relay', 'seeded'] },

  { name: 'wire', act: 2, created: '2026-09-10', built: true, settleMs: 6000,
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
  { name: 'take', act: 3, created: '2026-09-07', built: true, settleMs: 13000,
    one: 'record two takes; they land end to end on one line and it plays and scrubs as one',
    tags: ['getUserMedia', 'MediaRecorder', 'timeline', 'local only'] },
  // The round trip a browser can make on its own: publish out through a worker
  // that holds the key, subscribe back, and record the copy that came back.
  // settleMs covers the WHIP handshake, the WHEP handshake and one take.
  { name: 'keep', act: 3, created: '2026-09-08', built: true, settleMs: 30000,
    one: 'send a picture out, record the copy that comes back, and scrub it',
    tags: ['getUserMedia', 'WHIP', 'WHEP', 'timeline'] },
  { name: 'record', act: 3, created: '2026-09-04', built: true,
    one: 'record in segments and ship each one, so disk stays flat',
    tags: ['MediaRecorder', 'R2'] },
  { name: 'replay', act: 3, created: '2026-09-04', built: true,
    one: 'a 190 s show off R2, played with the eight cues it was recorded with',
    tags: ['HLS', 'R2', 'timeline'] },
  { name: 'seek', act: 3, created: '2026-09-04', built: true,
    one: 'seek inside that recording; the fold at any position must be exact',
    tags: ['HLS', 'R2', 'timeline'] },

  { name: 'looper', act: 4, created: '2026-09-04', built: true,
    one: 'a keyboard into a WebAudio synth, then loop what you played',
    tags: ['WebAudio', 'AudioWorklet'] },
  { name: 'carry', act: 4, created: '2026-09-10', built: true,
    one: 'press a key; the sound you hear has been to a server and back',
    tags: ['WebSocket', 'AudioWorklet', 'PCM'] },
  { name: 'instrument', act: 4, created: '2026-09-04', built: true,
    one: 'play an instrument that is somewhere else, and hear how late it is',
    tags: ['WebMIDI', 'relay', 'WebAudio', 'WebRTC'] },
  { name: 'jam', act: 4, created: '2026-09-04', built: true,
    one: 'two browsers on one pulse, on a peer-corrected clock',
    tags: ['WS', 'relay', 'WebAudio'] },

  // The archival horizon and the timeline library, meeting for the first time:
  // a deck positioned in 1965, which is a NEGATIVE epoch. Catalogue metadata is
  // committed; the media streams from ERR and nothing is stored here.
  { name: 'reel', act: 5, created: '2026-09-08', built: true,
    one: 'every 1965 newsreel on one line, at the day it was broadcast',
    tags: ['ERR', 'archive', 'timeline'] },
  { name: 'now', act: 5, created: '2026-09-08', built: true,
    one: 'one live ERR channel on a line whose right-hand end is the present moment',
    tags: ['HLS', 'live', 'timeline', 'DVR'],
    // master + a 218 KB media playlist + first fragments + first PDT + one EPG
    // fetch + a 13-point two-byte sweep, all behind control 0
    settleMs: 26000 },
  { name: 'flipper', act: 5, created: '2026-09-04', built: true,
    one: 'eight live ERR channels in equal cells; the bar scrubs the 2 h DVR',
    tags: ['HLS', 'icecast', 'DVR'],
    settleMs: 14000 },
  { name: 'kurenniemi', act: 5, created: '2026-08-28', built: false, page: '/proto/kurenniemi/',
    one: "Erkki Kurenniemi's corpus, media from archive.org",
    tags: ['timeline', 'not shelled'] },
  { name: 'megatimeline', act: 5, created: '2026-08-27', built: false, page: '/proto/megatimeline/',
    one: 'the ERR archive as one zoomable century, 1908 to 2026',
    tags: ['canvas', 'DO cache', 'not shelled'] },
  { name: 'remixer', act: 5, created: '2026-08-27', built: false, page: '/proto/remixer/',
    one: 'stack archive recordings from any year on one playhead',
    tags: ['HLS', 'timeline', 'not shelled'] },

  { name: 'studio', act: 6, created: '2026-08-26', built: false,
    one: 'the operator surface: go live, fire cues, archive the show',
    tags: ['WebRTC', 'DO', 'R2'],
    why: 'consumes 10 through 14' },
  { name: 'capture', act: 4, created: '2026-09-05', built: true, settleMs: 26000,
    one: 'camera in, segments out, played back on the timeline',
    tags: ['getUserMedia', 'MediaRecorder', 'R2', 'timeline'] },
  // the first page where all three legs meet: live over a real WebRTC hop, the
  // FAR END of that hop recorded, and the recording scrubbed on the deck
  { name: 'show', act: 3, created: '2026-09-05', built: true, settleMs: 9000,
    one: 'live over WebRTC, recorded off the far end of that hop, replayed on the timeline',
    tags: ['getUserMedia', 'WebRTC', 'MediaRecorder', 'timeline'] },

  // 26 is Act 5 with 19: both are ERR's live output, one television and one
  // radio, and both are here because the archive work needs the live end of the
  // same pipe. `built` flips the moment positron-shout answers.
  { name: 'shout', act: 5, created: '2026-09-06', built: true, settleMs: 12000,
    one: 'an icecast stream through Cloudflare — the relay adds the CORS that makes it measurable',
    tags: ['Icecast', 'Workers', 'WebAudio'] },


  // Act 0 with 04 score: this is library machinery with a picture on it, not a
  // network demo — it touches nothing outside the page.
  { name: 'strip', act: 0, created: '2026-09-04', built: true,
    one: 'deep time, uncertain dates, and a statistic that names what it dropped',
    tags: ['timeline', 'canvas'] },
  // 🔴 THE GRANULATOR, ON ITS OWN PAGE, and the split is the point. It used to
  // be an INSERT on /box/ wrapping the instruments — and a grain cloud has no
  // note-off, so releasing a key swapped one drone for another and every
  // instrument's envelope, attack and patch character were washed out before
  // you heard them. The patch selector and the die both stopped doing anything
  // audible. The engine is not at fault; wrapping an instrument in it was.
  // Here, being droney is the point rather than a defect.
  { name: 'grains', act: 4, created: '2026-09-12', built: true, settleMs: 45000,
    one: 'a granular engine on a Raspberry Pi, rolled from a seed you can get back',
    tags: ['SuperCollider', 'relay', 'PCM', 'live board'] },

  // Not a demo of anything — a page where every reusable control is present and
  // wired to nothing, so one can be looked at and pushed around without a board,
  // a relay or a stream. `built: false` because it publishes no `__demo` and
  // asserts nothing: it is a mirror for the components, not a claim about them.
  { name: 'kit', act: 0, created: '2026-09-12', built: false, page: '/kit/',
    src: 'demo/kit/index.html',
    one: 'every reusable control on one page, wired to nothing',
    tags: ['shell', 'no network'] },

  // ── pages that are not shelled demos, but are the point of the whole rig ──
  //
  // Both live outside demo/, so `built` stays false — it means "a shelled page
  // under demo/<name>/ that demo/verify.mjs runs", and neither is that. `page`
  // is what makes a row clickable anyway.

  // rig/box/listen.html, deployed to /box/ by workers/view/build.mjs. The Pi
  // in the other building, played from here: its own instrument library, a
  // random hour of 1965 Estonian radio, and pappus chewing either one up.
  { name: 'box', act: 4, created: '2026-09-10', built: false, page: '/box/',
    src: 'rig/box/listen.html',
    one: 'play a Raspberry Pi in another building — its instruments, 1965 radio, and a granulator over both',
    tags: ['WS', 'relay', 'PCM', 'live board'] },

  // A CHECKUP, not a player — and that is what makes it shippable. The playing
  // page (rig/m1/play.html) needs a peer with Ableton open, so it
  // is a dead link for a visitor; asking whether the rig is set up is a real
  // answer in BOTH states, and the interesting one is usually "it is not".
  //
  // MEASURED 2026-09-11, the whole chain end to end: the studio's own output
  // recorded at -91.0 dB with nothing sent and 0.0 dB peak with a chord held —
  // 91 dB apart, so the separation is not ambient noise. That run also found
  // the output clipping at full scale, which nothing else had noticed.
  //
  // For the record, from 2026-09-10 and not what this page shows: playing it
  // costs 6.00 ms typical over a direct peer link against 68.90 ms via the
  // relay, and presses over 100 ms go 0 of 100 against 4 of 100.
  // `rack` was a demo and is archived at archive/demos/rack-index.html, pulled
  // before the M1 <-> Live side is rearchitected rather than left pointing at a
  // design that is about to change. What it proved is worth keeping here: the
  // chain runs end to end — midisend -> IAC -> Live -> Arturia Stage-73 V2 ->
  // BlackHole — with a held chord reading -29.1 dB peak against a -91.0 dB
  // silence baseline, 61.9 dB of separation, and its checkup found the output
  // clipping at full scale when nothing else had. rig/m1/ and plan-rack.md hold
  // the rest.
];

/** Written notes, rendered by /notes/ from markdown. */
export const NOTES = [
  { doc: 'uuu-positron', title: 'positron and U:',
    one: 'two answers to one problem, where they already agree, and six ways to cowork' },
  { doc: 'hardware-box', title: 'an instrument in a box',
    one: 'what the smallest machine is that can be the instrument at the far end' },
];

export const bySlug = (name) => DEMOS.find((d) => d.name === name);

/**
 * Pages that live outside demo/ and are copied in: [source, destination].
 *
 * ⚠️ `built: true` demos are ENUMERATED by build.mjs from the directory and are
 * not in here. This is only the exceptions — the box's listener, which lives in
 * rig/, and the component sandbox, which is not a demo.
 */
export const extraPages = () =>
  DEMOS.filter((d) => !d.built && d.src && d.page)
       .map((d) => [d.src, `${d.page.replace(/^\/|\/$/g, '')}/index.html`]);

/** the link target for a row, or null when it has none */
export const targetOf = (d) => (d.built ? `/${d.name}/` : d.page || null);

/**
 * Newest first, and the array is left alone.
 *
 * ⚠️ THE ARRAY ORDER IS STILL THE STORY ORDER — this returns a COPY. The build
 * and every other reader keep reading `DEMOS` in acts; only the front page
 * sorts, because the front page answers a different question ("what is new
 * here?") from the one the sequence answers ("where do I start?").
 *
 * Ties are broken by position in DEMOS rather than by name, so a day that
 * landed six demos at once still reads in the order they were meant to be
 * read, and the sort is stable across runs.
 */
export function byNewest(list = DEMOS) {
  return list
    .map((d, i) => [d, i])
    .sort((a, b) => (b[0].created || '').localeCompare(a[0].created || '') || a[1] - b[1])
    .map(([d]) => d);
}

/** `2026-09-11` -> `11 Sep`. Fixed width in the mono column either side of the month. */
export function shortDate(iso) {
  if (!iso) return '';
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [, m, d] = iso.split('-');
  return `${Number(d)} ${M[Number(m) - 1]}`;
}

/**
 * ONE renderer for an index row, because there were two.
 *
 * `demo/index.html` and `workers/view/build.mjs` each carried their own copy of
 * this function. Dropping the `n` field fixed the build's copy and left the
 * local one printing `undefined` over every demo name — the exact failure this
 * file's own header claims cannot happen ("no second place to forget a row").
 * The header was aspirational; now it is true.
 *
 * The first column used to be the row's POSITION. It is now the day the page
 * landed, because the front page sorts by that: a rank number that renumbers
 * itself whenever the sort changes is a column that cannot be quoted, while a
 * date is the same fact wherever the row appears.
 *
 * `opt.missing` is a list of capability names this browser answered NO to —
 * `demo/shell/caps.mjs` produces it. When `opt.blocked` is set the row is drawn
 * unlinked WITH ITS REASON IN WORDS, never simply dropped: a missing row and a
 * row that cannot run here are different facts, and hiding one as the other is
 * the same defect as a blank cell that collapses "we did not look" into "we
 * looked and it was fine".
 */
export function rowHTML(d, i, opt = {}) {
  const href = opt.blocked ? null : targetOf(d);
  const bits = [];
  if (ACTS.has(d.act)) bits.push(`<span class="d-act">${ACTS.get(d.act)}</span>`);
  for (const t of d.tags || []) bits.push(`<span class="d-tag">${t}</span>`);
  const why = opt.blocked ? opt.says : d.why;
  if (why) bits.push(`<span class="d-why">${why}</span>`);
  const open = href ? `<a href="${href}">` : '<a>';
  const needs = needsOf(d);
  return `<li class="d-row${href ? '' : ' todo'}"${needs.length ? ` data-needs="${needs.join(' ')}"` : ''}>${open}`
    + `<span class="n">${shortDate(d.created)}</span>`
    + `<span class="nm">${d.name}</span>`
    + `<span class="d-one">${d.one || ''}</span>`
    + `<span class="d-meta">${bits.join('')}</span>`
    + '</a></li>';
}

/** and the note row, for the same reason */
export function noteHTML(n) {
  return '<li class="d-row"><a href="/notes/' + n.doc + '">'
    + '<span class="n">·</span>'
    + '<span class="nm">' + n.title + '</span>'
    + '<span class="d-one">' + n.one + '</span>'
    + '</a></li>';
}
