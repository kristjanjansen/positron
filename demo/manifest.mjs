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
//   room  — 'fixed' means DO NOT give this demo a private room per harness
//           run. Every other page's room name is a rendezvous it invented, and
//           a fixed one is a shared mutable global in the WebSocket layer —
//           two runs of the suite land in the same room and watch each other's
//           traffic. These four are different: `studio-1` is the ADDRESS OF
//           THE RASPBERRY PI, `m1-1` is the studio Mac's agent, and `wire`'s
//           whole subject is the history its room already holds. Renaming
//           those does not isolate a run, it points it at nothing.
//           ⚠️ It does not make them safe to run in parallel either — there is
//           one Pi with one JACK graph. A room was never that constraint.
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
import { cardHTML } from './shell/card.mjs';

// ⚠️ NO ARTICLE IN AN ACT TITLE, AND IT IS THE SAME RULE THE DIAGRAMS ALREADY
// FOLLOW. Five of these seven were already bare and two were not, so the front
// page read `the substrate` over `one stream` over `many people`: a list where
// two members are phrases and five are names. Asked for in one line, *"rm 'the'
// from the titles"*, and the argument is in CLAUDE.md under labels: a title is a
// NAME, and names do not take articles.
export const ACTS = new Map([
  [0, 'substrate'],
  [1, 'one stream'],
  [2, 'many people'],
  [3, 'capture and return'],
  [4, 'instruments'],
  [5, 'archives'],
  [6, 'composition'],
]);

export const DEMOS = [
  { name: 'transport', group: 'timeline', act: 0, created: '2026-09-04', built: true,
    one: 'twenty things happen a second apart, and each one reports how close to on time it landed',
    tags: ['timeline'] },
  { name: 'lanes', group: 'timeline', act: 0, created: '2026-09-04', built: true,
    one: 'an audio lane and a data lane on one transport',
    tags: ['timeline', 'WebAudio'] },
  { name: 'loops', group: 'timeline', act: 0, created: '2026-09-04', built: true,
    one: 'one recording placed three times: a slice, the same slice faster, and a loop',
    tags: ['timeline'] },
  { name: 'score', group: 'timeline', act: 0, created: '2026-09-04', built: true,
    one: 'a score round-trips byte-identically and refuses mutation',
    tags: ['timeline'] },
  { name: 'vclick', group: 'timeline', act: 0, created: '2026-09-07', built: true,
    one: 'a Csound score compiled to a timeline. The tempo map is an integral and the repeat is a quotation',
    tags: ['timeline', 'Csound', 'WebAudio'] },
  { name: 'click', group: 'timeline', act: 0, created: '2026-09-14', built: true,
    one: 'U:’s wireless click track, playing their own score with nothing on the wire',
    tags: ['timeline', 'Csound'] },

  { name: 'llhls', group: 'transports', act: 1, created: '2026-09-04', built: true,
    one: 'the tuned v6 player on a live input this page starts and stops',
    tags: ['LL-HLS', 'Stream', 'container'],
    // a cold container + ffmpeg + Stream ingest is ~30 s; without this the
    // harness asserts against a 204 and calls a working demo broken
    settleMs: 75000 },
  { name: 'webrtc', group: 'transports', act: 1, created: '2026-09-04', built: true,
    one: 'the same live input over WHEP; same burned-in clock as 06',
    tags: ['WebRTC', 'WHEP', 'Stream'],
    settleMs: 75000 },
  { name: 'moq', group: 'transports', act: 1, created: '2026-09-05', built: true, settleMs: 30000,
    one: 'browser to browser over MoQ, the fast tier',
    tags: ['MoQ', 'WebTransport', 'WebCodecs'] },

  { name: 'room', group: 'transports', act: 2, created: '2026-09-04', built: true,
    one: 'join a room and see the others; peer to peer, the relay only signals',
    tags: ['getUserMedia', 'WebRTC', 'relay'] },
  { name: 'cues', group: 'transports', act: 2, created: '2026-09-04', built: true,
    one: 'fire one cue; every open copy of the page acts on it, tokenless',
    tags: ['DO', 'WS', 'relay'] },
  // Act 2 with `cues` and for the same reason — one act reaching everybody —
  // but on a delay instead of at once, and out to phones rather than to open
  // tabs. The claim it demonstrates is that a store can wake AT a time from the
  // same object that holds the state deciding it, with no machine polling in
  // between, so `settleMs` has to cover the whole demonstration. It is carried
  // by `Publish now`, which is control 0 and the only control the harness gives
  // this budget to: it publishes at once and hands its item a moment four
  // seconds out to put itself away at, which is the unattended wake. About five
  // seconds of work, and the ten-second button asserts only what is true
  // immediately, because an assert made behind that wait would never be read.
  //
  // ⚠️ IT IS ALSO THE ONE INSTALLABLE PAGE HERE, AND ONLY THIS ONE. Its
  // manifest and its service worker are scoped to `/items/`; positron.studio is
  // deliberately not a progressive web app, because a site-wide worker is a
  // cache and this project's whole debugging discipline rests on the BUILD
  // stamp saying which build is live.
  { name: 'items', group: 'vain', act: 2, created: '2026-09-14', built: true, settleMs: 11000,
    one: 'write an item. At the moment you named, it publishes itself and tells the phones',
    tags: ['DO', 'alarms', 'push', 'PWA'] },
  // The demo ABOUT the socket, rather than one that happens to use it: the
  // message shape written down, the exact bytes shown both ways, and the
  // history the relay refuses to keep. settleMs covers asking the recorder to
  // join the room before anything is sent — every assert here sits behind that.
  // The picture, drawn twice. `gl: true` is what puts it in demo/verify-gl.mjs
  // rather than demo/verify.mjs — the ordinary harness runs Chrome with
  // --disable-gpu, where getContext('webgl2') returns null and every assert
  // here would be unreachable.
  { name: 'mirror', group: 'xr', act: 0, created: '2026-09-11', built: true, gl: true, xr: true, settleMs: 5000, room: 'fixed',
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
  { name: 'blocks', group: 'xr', act: 0, created: '2026-09-11', built: true, gl: true, xr: true, settleMs: 6000,
    one: 'square bricks on a grid. Pick one up and it snaps to whatever you set it on',
    tags: ['WebXR', 'WebGL2', 'relay', 'seeded'] },

  // Typography with a position rather than a place on a page. `gl: true` and
  // `xr: true` for the reason mirror, blocks and floor carry them: verify.mjs
  // runs --disable-gpu, where getContext('webgl2') is null.
  // ⚠️ `settleMs` COVERS A DISTANCE TRANSFORM PER WORD, AND THE CHECKS RENDER.
  // Six fields are computed in JavaScript at load, measured around 25 ms each
  // on this machine, and the asserts then draw every word off-screen twice to
  // read its size out of the pixels. The first assert sits behind all of it.
  { name: 'held', group: 'xr', act: 0, created: '2026-09-15', built: true, gl: true, xr: true, settleMs: 8000,
    one: 'one sentence broken across four walls, each word as big as it is short. Point at one and type your own over it',
    tags: ['WebXR', 'WebGL2', 'fonts'] },

  // 🔴 THE ONE XR ROW WITH NO `gl: true`, AND THAT IS THE POINT OF IT. Its
  // subject is SOUND, so everything it can answer without a headset it answers
  // in the ordinary harness: the window baselines, the decode path, the
  // main-thread callback rate, and the headset guard broken on purpose three
  // ways. It draws one small panel through demo/shell/xr-panel.mjs, and that
  // module builds no graphics context until somebody presses Enter VR, so
  // --disable-gpu costs this page nothing.
  // ⚠️ IT TOUCHES NO THIRD-PARTY MOUNT, WHICH IS WHY IT EXISTS AT ALL. The
  // questions it asks were asked of /videoradio/ first, and that page plays
  // ERR mounts whose operator told us on 2026-09-16 that our connections
  // corrupt their listener statistics. This one reads from our own R2 worker,
  // so "the headset went silent" and "somebody else's station was down" can
  // never be the same observation.
  // `settleMs` covers control 0: a watch window, the gate shut on purpose for
  // half a second, and a second watch window after it reopens.
  /**
   * 🔴 `earshot` WAS A DEMO FOR ONE EVENING AND IT IS ARCHIVED AT
   * `archive/demos/earshot-index.html`. IT ASKED FOUR QUESTIONS AND GOT FOUR
   * ANSWERS, WHICH IS WHY IT IS GONE RATHER THAN IN SPITE OF IT.
   *
   * An instrument built to settle one thing is furniture once that thing is
   * settled: nobody opens it twice, and a row on the front page is a promise
   * that there is something to look at. What it MEASURED is in CLAUDE.md under
   * WebXR, on a Quest, 2026-09-16, 68 s and 3322 frames:
   *
   *   the AudioContext survives an immersive session and is never suspended;
   *   48000 Hz, base 4.00 ms, out 24.00 ms in the window and IDENTICAL inside;
   *   AudioDecoder decodes mp3 in there with 0 errors, 140 ms against 998;
   *   a main-thread ScriptProcessorNode holds 11.9/s of 11.72 nominal;
   *   90.0 fps throughout with all of it running at once.
   *
   * ⚠️ AND THE LEVEL METER WAS PROVED TO BE A METER INSIDE THE SESSION, which
   * is what makes the rest of those numbers mean anything: shutting the gate
   * took the far side to 0.0000 while the near side held at 0.7050. Without
   * that, a zero in there is indistinguishable from a page that had stopped
   * measuring.
   *
   * So: nothing about audio is a reason not to build a headset page here. If
   * the question ever reopens, the page is in `archive/demos/` and it touched
   * no third-party mount: it decoded from our own station Worker.
   */

  { name: 'wire', group: 'transports', act: 2, created: '2026-09-10', built: true, settleMs: 6000, room: 'fixed',
    one: 'compose a message, watch the exact bytes go and come back, and read the history',
    tags: ['WS', 'DO', 'SQLite'] },

  // The only network-free row in Act 3, and the act's simplest complete
  // instance: make a recording yourself, then scrub it. Everything after this
  // adds exactly one thing — `record` adds disk economics, `replay` adds a
  // pre-existing show, `show` adds a real WebRTC hop.
  //
  // settleMs does TWO jobs here and only the second one matters. The harness
  // gives it to control 0 (`Use the camera`), which needs none of it; what
  // earns the 13 s is that the same number sizes the wait for the FIRST
  // assert, and every assert on this page sits behind a recording that runs to
  // a 10 s cap. Shrink it and the suite reads zero asserts and calls a working
  // page broken.
  { name: 'take', group: 'capture', act: 3, created: '2026-09-07', built: true, settleMs: 13000,
    one: 'record two takes; they land end to end on one line and it plays and scrubs as one',
    tags: ['getUserMedia', 'MediaRecorder', 'timeline', 'local only'] },
  // The 2025 experiment finished: an automation lane bound to a media clip,
  // which died at one missing mapping — an absolute stamp had to reach a
  // foreign media element's own position and then a pixel, and nothing
  // converted. The clip is generated IN THE PAGE so the clock burned into the
  // picture can be read back and compared with the playhead, which is the check
  // the prototype could not make: it proved its four mappings against its own
  // arithmetic.
  //
  // settleMs does the same two jobs it does on `take`. Control 0 does not exist
  // here, so only the second one counts: it sizes the wait for the FIRST
  // assert, and every assert sits behind a recorded clip, a drawn pass and a
  // five-point seek sweep. Shrink it and the suite reads zero asserts and calls
  // a working page broken.
  { name: 'memento', group: 'capture', act: 3, created: '2026-09-13', built: true, settleMs: 13000,
    one: 'move a knob while a clip plays; it lands on the same line and comes back in the right place',
    tags: ['MediaRecorder', 'timeline', 'canvas', 'local only'] },
  // The round trip a browser can make on its own: publish out through a worker
  // that holds the key, subscribe back, and record the copy that came back.
  // settleMs covers the WHIP handshake, the WHEP handshake and one take.
  { name: 'keep', group: 'capture', act: 3, created: '2026-09-08', built: true, settleMs: 30000,
    one: 'send a picture out, record the copy that comes back, and scrub it',
    tags: ['getUserMedia', 'WHIP', 'WHEP', 'timeline'] },
  { name: 'record', group: 'capture', act: 3, created: '2026-09-04', built: true,
    one: 'record in segments and ship each one, so disk stays flat',
    tags: ['MediaRecorder', 'R2'] },
  // 🔴 `settleMs` HERE IS NOT FOR A SLOW CONTROL, BECAUSE THIS PAGE HAS NO
  // CONTROLS. The Load button was removed on instruction and the transport's
  // own ▸ does the loading, so the page's checks hang off a press the harness
  // makes before the control loop rather than inside it. `verify.mjs` uses this
  // number twice, and the second use is what is wanted: the wait for a page's
  // FIRST assert. Replay's first assert is the loop check, which has to let the
  // shared transport checks finish, then play two laps of a real picture and
  // watch where it gets to.
  { name: 'replay', group: 'capture', act: 3, created: '2026-09-04', built: true, settleMs: 6000,
    one: 'a 190 s show off R2, played with the eight cues it was recorded with',
    tags: ['HLS', 'R2', 'timeline'] },
  // `seek` was a demo and is archived at archive/demos/seek-index.html, removed
  // 2026-09-16 on instruction. It played this same show and asked the timeline
  // which cues had happened by any position, 24 asks around the eight cues plus
  // a five-stop jump sweep, and it counted a cue firing more than 1.5 s after
  // its own moment as a retroactive burst. The loop button it graded is still
  // graded: `replay`, `radio` and `tapes` all press it and assert on the wrap.

  { name: 'looper', group: 'instruments', act: 4, created: '2026-09-04', built: true,
    one: 'a keyboard into a WebAudio synth, then loop what you played',
    tags: ['WebAudio', 'AudioWorklet'] },
  { name: 'instrument', group: 'instruments', act: 4, created: '2026-09-04', built: true,
    one: 'play an instrument that is somewhere else, and hear how late it is',
    tags: ['WebMIDI', 'relay', 'WebAudio', 'WebRTC'] },
  { name: 'jam', group: 'instruments', act: 4, created: '2026-09-04', built: true,
    one: 'two browsers on one pulse, on a peer-corrected clock',
    tags: ['WS', 'relay', 'WebAudio'] },

  // The archival horizon and the timeline library, meeting for the first time:
  // a deck positioned in 1965, which is a NEGATIVE epoch. Catalogue metadata is
  // committed; the media streams from ERR and nothing is stored here.
  { name: 'reel', group: 'xr', act: 5, created: '2026-09-08', built: true,
    one: 'every 1965 newsreel on one line, at the day it was broadcast',
    tags: ['archive', 'timeline'] },
  { name: 'now', group: 'transports', act: 5, created: '2026-09-08', built: true,
    one: 'one live television channel on a line whose right-hand end is the present moment',
    tags: ['HLS', 'live', 'timeline', 'DVR'],
    // master + a 218 KB media playlist + first fragments + first PDT + one EPG
    // fetch + a 13-point two-byte sweep, all behind control 0
    settleMs: 26000 },
  // `gl: true` and `xr: true` for the same reason mirror and blocks carry them:
  // `verify.mjs` runs --disable-gpu, where getContext('webgl2') returns null, so
  // a GPU page graded there reports a defect that belongs to the harness.
  // `node demo/verify-gl.mjs` is the grader.
  { name: 'floor', group: 'xr', act: 5, created: '2026-09-14', built: true, gl: true, xr: true,
    one: 'every 1965 newsreel face up on a floor you walk over, and any of them plays where it lies',
    tags: ['WebGL2', 'WebXR', 'archive', 'HLS'],
    // 298 thumbnails arrive as you look at them; a cold floor is a few seconds
    // of fetching before there is much to see
    settleMs: 4000 },
  { name: 'flipper', group: 'transports', act: 5, created: '2026-09-04', built: true,
    one: 'eight live television channels in equal cells; the bar scrubs the 2 h DVR',
    tags: ['HLS', 'icecast', 'DVR'],
    settleMs: 14000 },
  // Everything that could be reached about one artist, before anything is
  // played: 122 rows out of fourteen archives, saying when it is from, who
  // holds it, what it is, whether there is a file and what its licence allows.
  // Refs only — nothing is copied here. `demo/resources/build-corpus.mjs`
  // gathers it and folds in the shorter list `aikajana` plays from, and the
  // page re-checks that fold from the other end so the two cannot disagree.
  { name: 'resources', group: 'kurenniemi', act: 5, created: '2026-09-14', built: true,
    one: 'every reachable source and asset of Erkki Kurenniemi: who holds it, when, and what it allows',
    tags: ['archive', 'provenance'] },
  // The same corpus as the row above, on an axis instead of in a table: one
  // mark per record, as wide as its date is vague, and the twenty-six a browser
  // can open are pressable. Named for the thing you can hear, because that is
  // the reason it exists rather than the table.
  { name: 'tapes', group: 'kurenniemi', act: 5, created: '2026-09-15', built: true,
    one: 'every Kurenniemi recording that plays, laid end to end as one long tape',
    tags: ['timeline', 'uncertainty', 'archive'] },
  // The deck that gathered it, under its own name since 2026-09-14 — it was
  // called `kurenniemi` until the row above took that slug.
  { name: 'deck', group: 'kurenniemi', act: 5, created: '2026-08-28', built: false, page: '/proto/deck/',
    one: "Erkki Kurenniemi's corpus on one deck, media from archive.org",
    tags: ['timeline', 'not shelled'] },
  // ⚠️ `megatimeline` IS OFF THE MENU AND STILL ON THE EDGE. The row is gone;
  // the page, its viewport module, its gesture module and the committed census
  // are all still built and still answer at <https://positron.studio/proto/megatimeline/>,
  // because taking a row off a list and deleting a deployed page are different
  // acts and only the first was asked for. Moving the files into `archive/` is
  // a second, larger step — four entries out of the build's allowlist and a URL
  // that starts 404ing — and it is decided on purpose rather than as a side
  // effect of tidying the front page.
  { name: 'remixer', group: 'transports', act: 5, created: '2026-08-27', built: false, page: '/proto/remixer/',
    one: 'stack archive recordings from any year on one playhead',
    tags: ['HLS', 'timeline', 'not shelled'] },

  // ⚠️ `studio` IS GONE FROM THE LIST AND THERE WAS NOTHING TO ARCHIVE. It never
  // had a page: the row was a placeholder carrying `why: 'consumes 10 through
  // 14'`, which is a promise rather than a demo, and it had sat on the front
  // page unbuilt since 2026-08-26. `plan-studio.md` still holds the argument
  // for it, which is where a proposal belongs. A row for a page that does not
  // exist makes the list longer and the reader's odds worse.
  { name: 'capture', group: 'capture', act: 4, created: '2026-09-05', built: true, settleMs: 26000,
    one: 'camera in, segments out, played back on the timeline',
    tags: ['getUserMedia', 'MediaRecorder', 'R2', 'timeline'] },
  // the first page where all three legs meet: live over a real WebRTC hop, the
  // FAR END of that hop recorded, and the recording scrubbed on the deck
  { name: 'show', group: 'capture', act: 3, created: '2026-09-05', built: true, settleMs: 9000,
    one: 'live over WebRTC, recorded off the far end of that hop, replayed on the timeline',
    tags: ['getUserMedia', 'WebRTC', 'MediaRecorder', 'timeline'] },

  // 26 is Act 5 with 19: both are ERR's live output, one television and one
  // radio, and both are here because the archive work needs the live end of the
  // same pipe. `built` flips the moment positron-shout answers.
  // ⚠️ `shout` IS OFF THE LIST AND ITS WORKER IS UNTOUCHED. The demo page was a
  // measurement OF the relay — status, CORS, bitrate, burst, underruns — and
  // `/radio/` now makes the same relay do something you can hear, which is
  // the better demonstration of the same fact. 🔴 `workers/shout/` STAYS AND
  // MUST: it is the thing that carries the station's plain-HTTP mount to a
  // secure page, and deleting it takes `/radio/` and `/grains/` with it.
  // The page's own source is under `archive/`.

  // Act 5 with shout, and deliberately NOT a second copy of it: same relay,
  // different subject. `shout` asks what Cloudflare costs in front of an
  // Icecast stream; this one is a station somebody actually runs, and it is
  // here because their mount is plain HTTP on port 8001 — which a page on
  // positron.studio may not load at all. The relay is the difference between a
  // page that works and a page that cannot, rather than between a page that
  // measures and one that does not.
  // ⚠️ `settleMs` HERE IS CARRIED ENTIRELY BY ITS SECOND JOB, AND THAT HAS GONE
  // BACK AND FORTH TWICE. The harness applies it to control 0 and to the
  // first-assert budget. This page declared no controls, then declared
  // `Automate` on 2026-09-16, then had it removed the same day — so control 0 is
  // once again the transport's loop-way `.tbar-x`, which returns instantly and
  // takes nothing from the sleep. The number is sized by the second use and has
  // not moved through any of it: a wasm scsynth boot, 31 buffer allocations, a
  // definition, an eight-second ring fill, a 2.5 s level, two 700 ms ink
  // samples and a 1.2 s deafness control before the page says anything at all.
  { name: 'radio', rank: 0, group: 'vain', act: 5, created: '2026-09-14', built: true, settleMs: 30000,
    one: 'six live radio stations from Tallinn and Helsinki, granulated in the tab by hand, or by sliders that sweep themselves back and forth',
    tags: ['Icecast', 'Workers', 'WebAudio', 'live'] },
  // The same machine as the row above with the instrument panel taken off: it
  // walks its own twelve sounds, moves its own blend, changes station on its own
  // and loops itself in time, and the only picture is a shader of what the
  // granulator is doing rather than of what it sounds like. It imports the
  // stations, the sounds and the lanes from `demo/shell/radio-gran.mjs`.
  // ⚠️ AND IT IS THE ONLY PAGE THAT DOES, SINCE 2026-09-16. `/radio/` imported
  // the same module while it had a tour of its own; the tour was removed on
  // instruction and those were its only imports, so the two pages now share the
  // module's subject and none of its code. See `archive/radio-automate/`.
  // ⚠️ `gl: true` PUTS IT IN `demo/verify-gl.mjs` RATHER THAN `demo/verify.mjs`:
  // the ordinary harness runs Chrome with --disable-gpu, where
  // getContext('webgl2') returns null and every assert here would be
  // unreachable, which reads as green.
  // ⚠️ AND `settleMs` COVERS A WHOLE BOOT BEFORE THE PAGE SAYS ANYTHING. Play is
  // control 0, and behind it sit a relay health call, a decoder, a wasm scsynth,
  // 31 buffer allocations, a definition, an eight-second ring fill and then a
  // burst of checks that drives a morph, a loop and a station change.
  // 🔴 BACK UNDER `väin`, ON INSTRUCTION 2026-09-16: *"move videoradio to vain
  // group"*. It moved to the headset group earlier the same day, on the
  // argument that a group should say what a visitor will GET rather than what
  // the page grew out of. The headset half has since been archived on
  // instruction — *"arvhice videoradio vr, it did not worked out"* — so what a
  // visitor gets is a picture in a window, made of the radio next to it, and
  // `väin` is where that belongs.
  // ⚠️ `xr` AND THE `WebXR` TAG WENT WITH IT. There is no Run in VR control to
  // scroll under a thumb any more, and a tag naming an API the page no longer
  // calls is a description that has drifted from the thing it describes.
  { name: 'videoradio', group: 'vain', act: 5, created: '2026-09-15', built: true,
    gl: true, settleMs: 45000,
    one: 'the same radio and granulator, playing itself, drawn as the instrument rather than as the sound',
    tags: ['WebGL2', 'Icecast', 'WebAudio', 'live'] },
  // The other end of the same station: what it broadcast, kept. A broadcast at
  // the bitrate their own server records is 57.6 MB an hour, which does not fit
  // through a Worker in one request on this zone, so it goes in pieces of
  // 16 MiB and comes back with byte ranges. `settleMs` covers an upload, a
  // sidecar and a seek, all of which land in one burst at the end.
  // ⚠️ `crate`, NOT `vain`. The slug named the ORGANISATION, and `vain` is
  // already this file's group name for Väin's pages, so one word meant a demo
  // and a group at once. A crate is what a long recording arrives in, and it is
  // a THING rather than a transaction, which is how every other slug here reads:
  // `tapes`, `blocks`, `reel`, `rack`. The group, the worker and the bucket keep
  // the organisation's name, because those really are Väin's and this page is
  // ours.
  { name: 'crate', group: 'vain', act: 5, created: '2026-09-15', built: true, settleMs: 25000,
    one: 'one audio file into R2 in pieces of 16 MiB, played back and scrubbed from where it landed',
    tags: ['R2', 'Workers', 'uncertainty', 'archive'] },
  // The far end of `crate`: once whole programmes are in R2, a running order is
  // a playlist of BYTE RANGES into them and the station needs no encoder at all.
  // ⚠️ `settleMs` is 50 s because the claim being checked is that the sound
  // CROSSES a programme boundary, and the programmes are 40 s long. A shorter
  // settle would assert that a station plays, which is not the subject.
  { name: 'station', group: 'vain', act: 5, created: '2026-09-15', built: true, settleMs: 50000,
    one: 'a schedule played as one stream: a text file names which seconds of which recording come next',
    tags: ['HLS', 'R2', 'DO', 'mediaSession', 'archive'] },


  // Act 0 with 04 score: this is library machinery with a picture on it, not a
  // network demo — it touches nothing outside the page.
  { name: 'strip', group: 'timeline', act: 0, created: '2026-09-04', built: true,
    one: 'deep time, uncertain dates, and a statistic that names what it dropped',
    tags: ['timeline', 'canvas'] },
  // The studio Mac as an instrument: the same page as /keys/, pointed at a
  // different machine. What crosses the relay is a note NUMBER, so neither end
  // knows what kind of computer the other one is.
  //
  // ⚠️ NO LOOPBACK DEVICE. A Core Audio process tap takes a copy of what Live
  // renders while that audio carries on to the speakers — so BlackHole, the
  // Multi-Output Device and Live's own output setting are all out of the path.
  // MEASURED over the relay: silence 0.00000, keys down -5.3 dBFS.
  { name: 'rack', group: 'instruments', act: 4, created: '2026-09-12', built: true, settleMs: 12000, room: 'fixed',
    one: 'play Ableton Live on a studio Mac from here, with no virtual audio cable',
    tags: ['Ableton Live', 'CoreMIDI', 'CoreAudio tap', 'relay', 'PCM'] },

  // 🔴 THE GRANULATOR, ON ITS OWN PAGE, and the split is the point. It used to
  // be an INSERT on /keys/ wrapping the instruments — and a grain cloud has no
  // note-off, so releasing a key swapped one drone for another and every
  // instrument's envelope, attack and patch character were washed out before
  // you heard them. The patch selector and the die both stopped doing anything
  // audible. The engine is not at fault; wrapping an instrument in it was.
  // Here, being droney is the point rather than a defect.
  // The same subject as `grains`, on this machine instead of on the Pi — and it
  // exists because the board's granulator could not be shown to respond to any
  // of its own parameters, while this one reports every grain it fires.
  // Promoted from proto/paths/, which was finished and measured and had never
  // been given a page — hold 24.19 px against Catmull-Rom 0.036, and 93.4% of
  // the drawn line invented. The adapter was the asset; its hand-rolled UI is
  // what the kit replaces.
  { name: 'draw', group: 'timeline', act: 0, created: '2026-09-13', built: true,
    one: 'record a gesture, play it back, and see how much of the line was never recorded',
    tags: ['pointer', 'timeline', 'canvas'] },
  // The last of the protos to be given a page, promoted from proto/text/: the
  // text recorder this lineage failed to write five times. Every earlier one
  // listened to `keydown` and rebuilt the cursor by hand, so every one refused
  // arrow keys and the newest regressed to append-only. This writes down what
  // each change DID to the document, which is what makes a seek a fold rather
  // than a replay — 73 edits captured through a real browser, rebuilt to the
  // browser's own text character for character.
  { name: 'typist', group: 'timeline', act: 0, created: '2026-09-13', built: true,
    one: 'type, and it types itself back. Drag to any moment and the words and the cursor come back',
    tags: ['timeline', 'text', 'local only'] },
  // 🔴 TWO ENGINES ON ONE PAGE, and `dust` is the other half of it. They were
  // two pages about one subject and the split cost the better half of each:
  // `dust` had the picture — a granulator in the page reports every grain it
  // fires, so every mark is MEASURED — and this had the claim, which is that
  // the same thing is running on a Raspberry Pi in another building. Side by
  // side with a crossfade, the difference between the two panes IS the subject,
  // and the page now checks a granulator even when the board is down.
  // 🔴 `the same granulator` IS TRUE NOW, AND IT WAS NOT BEFORE (2026-09-13).
  // This line said it while the left pane was a 251-line AudioWorklet written
  // for this page — a reimplementation that sounds similar is not the same
  // instrument. Both panes load the SAME `pappus.scsyndef`, compiled by sclang
  // ON THE BOARD, one into wasm scsynth in the tab and one into the Pi's own
  // sound server. ⚠️ `AudioWorklet` is off the tags for the same reason: the
  // tag drives `caps.mjs`, and what this page now needs is WebAssembly and an
  // audio output, not a hand-written worklet.
  { name: 'grains', group: 'instruments', act: 4, created: '2026-09-12', built: true, settleMs: 60000, room: 'fixed',
    one: 'one granulator, running in this page and on a Raspberry Pi at once, with a blend between them',
    tags: ['SuperCollider', 'WebAssembly', 'relay', 'PCM', 'live board'] },

  // 🔴 CONTROLLERS, NOT NOTES, AND THE TWO ARE DIFFERENT KINDS OF TRAFFIC. A
  // note is an EDGE: on and off are two halves of one object and losing either
  // wedges the instrument. A controller value is a LEVEL: every message is a
  // complete statement of where a knob is, the last one is the only one that
  // stays true, and losing one is harmless the instant the next arrives. So
  // this page coalesces instead of queueing, sends at most one value per slider
  // per 20 ms, and states the whole console again every 500 ms rather than
  // asking for an ack. plan-controller.md has the arithmetic and the reasons.
  // ⚠️ `room: 'fixed'` because `studio-1` is the ADDRESS OF THE RASPBERRY PI.
  // A private room does not give a second client its own board: there is one
  // JACK graph and one instrument, so this page and `/keys/` take turns.
  // ⚠️ `settleMs` sizes the wait after control 0 ONLY, and control 0 is `Play`,
  // which on a cold board brings Yoshimi up over ten to forty seconds.
  /**
   * 🔴 THE FIRST PAGE TO USE `tabs.mjs`, WHICH HAS EXISTED WITH NO CALLER. It
   * was on `/items/` for one commit and taken off, because three names over one
   * list and one form is furniture. Three genuinely different views of one show
   * is the case it was written for, and a component with no user is a component
   * nothing grades.
   */
  // ⚠️ `capture`, NOT `video`. There is no `video` group and `byGroup` THREW
  // rather than quietly dropping the row, which is the whole reason that check
  // exists: an ungrouped demo still renders a complete-looking front page and
  // the only way to notice is to count. Caught by the build on the first run.
  { name: 'stage', group: 'capture', act: 4, created: '2026-09-17', built: true,
    one: 'three views of one show, each a panel with the same picture in it',
    tags: ['canvas', 'tabs', 'fullscreen'] },

  { name: 'knobs', group: 'instruments', act: 4, created: '2026-09-16', built: true, settleMs: 20000, room: 'fixed',
    one: 'play a synthesizer in another building, and turn its knobs while you do',
    tags: ['WS', 'relay', 'MIDI CC', 'PCM', 'live board'] },

  // 🔴 THE INSTRUMENT IS THE FILE. `plan-visuals` §1.2 says a fragment shader is
  // a DOCUMENT — "~2 KB of GLSL plus ~200 bytes of parameters reproduces it at
  // any resolution" — and works out when generated code may cross a wire. This
  // is the sound half of that argument, which had never been written down: a
  // SuperCollider synth definition is a few hundred bytes that completely
  // describe an instrument, they survive the relay unchanged, and at the far
  // end TWO different engines read the same ones.
  //
  // ⚠️ NOT THE QUESTION research §5 ANSWERED. That one priced shipping scsynth
  // as a demo's sound engine — 1,701,983 B against a 6,659 B worklet, correctly
  // no. The engine here is a reader fetched once and only when asked; the
  // subject is the asset that travels.
  //
  // settleMs covers a 1.7 MB fetch, the engine boot (~630 ms measured), three
  // round trips over the relay and six loudness windows. Every assert on this
  // page sits behind control 0.
  //
  // ⚠️ THREE OF ITS TWENTY ASSERTS ARE ABOUT SOMEBODY ELSE'S NETWORK, so a red
  // run here is not automatically a regression — the same caveat CLAUDE.md
  // already carries for `now` and `carry`. MEASURED by taking the relay away
  // (`--host-resolver-rules=MAP ws.positron.studio 127.0.0.1:1`): 17 of 20,
  // the three round-trip asserts saying `nothing came back`, and nothing hung.
  // 🔴 `patch` IS OFF THE SITE — asked for, and it has already served its
  // purpose. It existed to ask whether a synth definition can travel as a
  // message the way a shader does; the answer is yes, and it is now a fact
  // rather than a page. What it proved is in
  // `research/supercollider-browser-2026-09.md` §10 and in the commits, and the
  // thing it proved is being built INTO `grains`, where two granulators can run
  // the same definition instead of one page demonstrating that they could.
  //
  // ⚠️ THE FILES STAY ON DISK AND ARE NOT DEAD. `demo/patch/vendor/` holds the
  // vendored, licensed SuperSonic engine and `engine.mjs` boots, meters and
  // collects OSC from it — that is the infrastructure the `grains` rewire runs
  // on. Removing the ROW takes the page off the deploy; deleting the directory
  // would take the engine with it. When `grains` has moved what it needs to a
  // shared home, the leftovers can go.

  // Not a demo of anything — a page where every reusable control is present and
  // wired to nothing, so one can be looked at and pushed around without a board,
  // a relay or a stream. `built: false` because it publishes no `__demo` and
  // asserts nothing: it is a mirror for the components, not a claim about them.
  { name: 'kit', group: 'kit', act: 0, created: '2026-09-12', // 🔴 `true` NOW, AND THE FLAG MEANT TWO THINGS. `built: false` was doing
    // double duty: hide this from the index, and skip it in `verify.mjs`, which
    // filters on the same field. So the one page whose entire job is to make
    // component drift visible was the one page the suite could not look at, and
    // CLAUDE.md recorded that as open work without noticing the flag was the
    // cause. It carries `mount()` and eight asserts now, so it is a page the
    // harness grades like any other.
    built: true, page: '/kit/',
    src: 'demo/kit/index.html',
    one: 'every reusable control on one page, wired to nothing',
    tags: ['shell', 'no network'] },

  // 🔴 `unlisted` IS A THIRD STATE AND THE TWO THAT EXISTED COULD NOT SAY THIS.
  // `built: true` deploys a page, runs it in `verify.mjs` AND puts a card on the
  // front page; `built: false` takes it out of the suite. What was wanted here
  // is a page that is deployed and graded and NOT advertised: the box beside
  // every demo title collects what visitors write, and a link to the pile of it
  // on the front page invites a reader to treat other people's notes as part of
  // the work. `byGroup()` drops it, so both index renderers drop it — there is
  // one of those now and it is in this file.
  // ⚠️ UNLISTED IS NOT SECRET, and the page says so on itself. Anything else
  // would be a token, and a token pasted into a public page is a published one.
  { name: 'feedback', group: 'kit', act: 0, created: '2026-09-15', built: true, unlisted: true,
    // Its first assert sits behind an arm, a socket, an echo and a read back,
    // and `verify.mjs` walks off 400 ms after a count stops growing — which for
    // a count still at zero is immediately. This is the budget for that phase.
    settleMs: 9000,
    one: 'what visitors wrote into the box beside every demo title',
    tags: ['DO', 'WS', 'relay'] },

  // ── pages that are not shelled demos, but are the point of the whole rig ──
  //
  // Both live outside demo/, so `built` stays false — it means "a shelled page
  // under demo/<name>/ that demo/verify.mjs runs", and neither is that. `page`
  // is what makes a row clickable anyway.

  /**
   * 🔴 `keys` IS RETIRED, 2026-09-17: *"keys seems to be dead. bring keyboard to
   * knobs and archive keys"*. The page is at `archive/keys/`, its keyboard is on
   * `/knobs/`, and the deployed `/keys/` is gone with no redirect written — the
   * same as `radio1965` and `box` before it.
   *
   * ⚠️ IT WAS `box` UNTIL 2026-09-16 and `rig/box/` keeps its name, because the
   * BOARD is still the box: `box.mjs`, `box.hello`, `box.alive`. What left
   * `rig/box/` is one HTML file; everything `push.sh` ships to the Raspberry Pi
   * is untouched.
   * ⚠️ AND IT NEVER HAD A HARNESS. `node demo/verify.mjs keys` answered `nothing
   * for this harness to verify` for its whole life, because it was not a built
   * demo — which is how it could be silent for a visitor while every counter it
   * displayed read correct. `archive/keys/README.md` has what was and was not
   * proved about that silence.
   */


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
/**
 * 🔴 EMPTY, AND THAT IS THE DECISION RATHER THAN AN OVERSIGHT. It carried two
 * essays, `positron and U:` and `an instrument in a box`, on a front page whose
 * question is "what is here to open". A document that argues is not something
 * to open and it does not belong in a list of things that are; both have moved
 * to `research/`, which is where writing that REPORTS or ARGUES lives.
 * `noteHTML` and `groupHTML` still handle a populated list, so putting one back
 * is adding a row here.
 */
export const NOTES = [];

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
/**
 * The link target for a row.
 *
 * ⚠️ `?xr=1` ON THE HEADSET ROWS, AND IT CANNOT START THE SESSION ITSELF.
 * WebXR needs a TRANSIENT USER ACTIVATION, so no link can enter VR — the page
 * still needs one press. What the flag buys is that the press is the first
 * thing under your hand: the page scrolls its own Run-in-VR control into view
 * and focuses it, so from the index it is link, tap, in.
 */
/**
 * ⚠️ `query` IS A ROW'S OWN EXTRA PARAMETERS, AND IT MERGES WITH `?xr=1`.
 * `earshot` needs `report=1` to beacon from a machine that is not a headset,
 * and it also wants the headset offer under the visitor's thumb, so the two
 * cannot be a choice between them. Written once here rather than as a link
 * somebody types into the front page by hand, which is the second place this
 * project keeps learning not to have.
 */
export const targetOf = (d) => {
  if (!d.built) return d.page || null;
  const q = [d.xr ? 'xr=1' : '', d.query || ''].filter(Boolean).join('&');
  return `/${d.name}/${q ? `?${q}` : ''}`;
};

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
    // 🔴 THE HEADSET PAGES FIRST, then newest. They are the newest thing this
    // project can do and the only two that need a device to be seen at all, so
    // a visitor with one in their hands should not have to scroll past
    // everything else to find them. ⚠️ `xr` is a FLAG, not a tag — a `WebXR`
    // tag would reach `caps.mjs`, which turns tags into REQUIREMENTS, and both
    // of these pages work perfectly well in an ordinary browser. Marking them
    // as needing a headset would un-link them for everybody who has not got
    // one, which is the opposite of the point.
    .sort((a, b) => (b[0].xr ? 1 : 0) - (a[0].xr ? 1 : 0)
      || (b[0].created || '').localeCompare(a[0].created || '') || a[1] - b[1])
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
/**
 * The front page's sections, in the order they are read.
 *
 * 🔴 A SECOND AXIS, ON PURPOSE, AND IT IS NOT THE ACTS. `ACTS` is the STORY —
 * the order to walk the demos in to be taught something, and it is what the
 * sequence is for. A visitor arriving at the front page is not being taught;
 * they are looking for a THING, and the thing has a subject: a headset, a
 * radio station, one man's archive, ERR's. Sorting that list by recency
 * answered a question nobody asked ("what changed?") and sorting it by act
 * answered one they cannot have yet ("where does this fit in the argument?").
 *
 * ⚠️ NEITHER AXIS REPLACES THE OTHER and neither is derived from the other.
 * `held` is act 0 because it teaches how a picture is drawn, and it is in the
 * headset group because that is where you would go looking for it.
 */
/**
 * 🔴 THERE IS NO SECTION NAMED AFTER A BROADCASTER ANY MORE, AND THAT IS NOT
 * TIDINESS. Asked 2026-09-16, *"hide the ERR archive from frontpage"* and
 * *"no err refs"*, the same evening they told us our connections were
 * corrupting their listener statistics (CLAUDE.md). A heading advertising whose
 * streams this site pulls is the one thing on the front page they would be
 * shown first. The pages are unchanged and still reachable; what has gone is
 * the section, the name in three one-line descriptions, and the `ERR` tag on
 * two cards. `reel` joins the newsreels that are already in a headset, and the
 * two live channel pages go to `technologies`, which is what they demonstrate.
 *
 * ⚠️ AND NO ARTICLES. Asked in the same breath, *"rm 'the' from the titles"*.
 * Five of these were bare and three were not, so the column read `the timeline`
 * over `instruments` over `capture`: a list where some members are names and
 * some are phrases. Same rule as the diagram labels in CLAUDE.md.
 */
export const GROUPS = new Map([
  ['xr', 'in a headset'],
  ['vain', 'väin'],
  ['kurenniemi', 'kurenniemi'],
  ['instruments', 'instruments'],
  ['capture', 'capture'],
  ['timeline', 'timeline'],
  ['transports', 'technologies'],
  ['kit', 'kit'],
]);

/**
 * The demos in sections, newest first inside each.
 *
 * 🔴 IT REFUSES AN UNGROUPED ROW rather than dropping it. A demo with no
 * `group` would simply not appear on the front page — the worst shape a
 * failure can take here, because the page still renders, still looks complete,
 * and the only way to notice is to count. Same argument as `mount()` throwing
 * on an odd readout.
 */
export function byGroup(list = DEMOS) {
  // ⚠️ DROPPED HERE RATHER THAN IN EACH RENDERER, because there are two index
  // renderers (this file's own and the build's, which both call this) and a row
  // that has to be hidden in two places is a row that will show up in one. See
  // `unlisted` on the `feedback` row for what it is for.
  list = list.filter((d) => !d.unlisted);
  const lost = list.filter((d) => !GROUPS.has(d.group));
  if (lost.length) {
    throw new Error(`these rows have no group, so the front page would not show them: `
      + lost.map((d) => `${d.name}${d.group ? ` (group "${d.group}" is not in GROUPS)` : ''}`).join(', '));
  }
  // ⚠️ `rank` PUTS ONE ROW AT THE FRONT OF ITS GROUP and everything else stays
  // newest first. A group's leading card is the one somebody should open, which
  // is an editorial fact and not a date — `radio` is what väin IS, and it
  // happens to share a creation day with the page beside it, so recency could
  // not even break the tie consistently.
  return [...GROUPS].map(([id, title]) => ({
    id, title,
    rows: byNewest(list.filter((d) => d.group === id))
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)),
  })).filter((g) => g.rows.length);
}

/**
 * One demo as a card.
 *
 * ⚠️ THE MARKUP IS `card.mjs`'s AND NOT THIS FILE'S. That module holds the one
 * renderer both the build and the browser use; this function only decides what
 * a DEMO puts in one. The `data-needs` goes through untouched because
 * `caps.mjs` reads it in the browser afterwards, on whatever markup it finds.
 */
export function demoCardHTML(d) {
  const href = targetOf(d);
  const needs = needsOf(d);
  return cardHTML({
    // ⚠️ `title` OVERRIDES THE SHOWN NAME AND `name` IS STILL THE IDENTITY. It is
    // unused today — `kurenniemi` became `resources` and `aikajana` became
    // `deck` as REAL renames, directory and URL and all, which is the right way
    // round: a card that says one thing while its address says another is two
    // names for one page. The hook stays for the case where a slug must not
    // move (an address somebody has written down) and the label must.
    title: d.title || d.name,
    desc: d.one || '',
    tags: d.tags || [],
    href: href || '',
    why: href ? '' : d.why || '',
    attrs: (d.xr ? ' data-xr="1"' : '') + (needs.length ? ` data-needs="${needs.join(' ')}"` : ''),
  });
}

/** A whole section: its name and its cards. */
export function groupHTML(g) {
  return `<h2 class="pos-act-h">${g.title}</h2>`
    + `<div class="pos-cards" style="--card-min:210px">`
    + g.rows.map(demoCardHTML).join('') + '</div>';
}

export function rowHTML(d, i, opt = {}) {
  const href = opt.blocked ? null : targetOf(d);
  const bits = [];
  // ⚠️ NO ACT PILL. Every row carried the name of its act in a yellow pill —
  // `the substrate`, `one stream`, `many people` — which is the loudest ink on
  // a row whose subject is the demo, and it repeated down the column because
  // neighbours share an act. The act is still the story order and still groups
  // the sequence page; it is not a label each row has to wear.
  for (const t of d.tags || []) bits.push(`<span class="pos-tag">${t}</span>`);
  const why = opt.blocked ? opt.says : d.why;
  if (why) bits.push(`<span class="pos-why">${why}</span>`);
  const open = href ? `<a href="${href}">` : '<a>';
  const needs = needsOf(d);
  return `<li class="pos-row${href ? '' : ' todo'}"${d.xr ? ' data-xr="1"' : ''}${needs.length ? ` data-needs="${needs.join(' ')}"` : ''}>${open}`
    + `<span class="n">${shortDate(d.created)}</span>`
    + `<span class="nm">${d.name}</span>`
    + `<span class="pos-one">${d.one || ''}</span>`
    + `<span class="pos-meta">${bits.join('')}</span>`
    + '</a></li>';
}

/** and the note row, for the same reason */
export function noteHTML(n) {
  return '<li class="pos-row"><a href="/notes/' + n.doc + '">'
    + '<span class="n">·</span>'
    + '<span class="nm">' + n.title + '</span>'
    + '<span class="pos-one">' + n.one + '</span>'
    + '</a></li>';
}
