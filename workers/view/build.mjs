// build.mjs — assemble workers/view/public/ from the repo's protos.
//
//   node build.mjs                 -> public/, the deploy artefact (committed)
//   node build.mjs --out /tmp/x    -> anywhere else; public/ untouched. Use this
//                                     to ask "does the build still pass?".
//
// Why a build step instead of pointing wrangler's `assets.directory` at the
// repo root: the repo root holds `.env` (13 live secrets). An assets directory
// is uploaded VERBATIM AND PUBLICLY. So we copy an explicit allowlist of files
// — never a directory glob — into public/, and nothing else can leak.
//
// The layout MIRRORS THE REPO on purpose. Every page's imports then resolve
// untouched, exactly as they do under its own dev server:
//   proto/deck      `../../timeline/transport.mjs` → /timeline/transport.mjs
//   proto/remixer     `/timeline/transport.mjs`      → /timeline/transport.mjs
//   proto/deck      `./ingest.mjs`                  → /proto/deck/…
// That is the "solve it in the asset layout, not in the proto" rule.
//
// ⚠️ THERE WAS A CACHE-EXPLODING STEP HERE and the page it served is archived;
// `explode()` still exists further down, unused, for the next proto that ships
// a committed cache. See the note beside it.

import zlib from 'node:zlib';
import { mkdir, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, join, extname, resolve, sep } from 'node:path';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const DEPLOY_OUT = join(HERE, 'public');

// ── where the build lands ───────────────────────────────────────────────────
//
// 🔴 A FIXED OUTPUT DIRECTORY IS A SHARED MUTABLE GLOBAL. That is this repo's
// own rule about ports — *"let the OS choose and read back what you got"* — and
// `public/` is the same shape wearing a directory: it is `rm -rf`'d and
// rewritten on every run. Two builds at once and one of them empties the
// directory the other is copying into, with nothing in either output saying so.
// MEASURED 2026-09-14: one ordinary build left **60 files dirty, none of them
// written by a person**, which is what every other agent's `git status` then
// has to be read through.
//
// `--out <dir>` (or `BUILD_OUT=<dir>`) builds somewhere else. Use it whenever
// the question is *"does the build still pass?"* — which is what the four
// refusals at the bottom of this file exist to answer — because then the answer
// costs nothing in the shared tree.
//
// ⚠️ IT IS DELIBERATELY NOT THE DEFAULT. `public/` is the deploy artefact and
// it is committed on purpose: `git log --oneline -- workers/view/public` is how
// anyone answers *"what was actually on the edge when that log was written?"*.
// A scratch build must never be mistaken for one, so it says so on the way in
// and on the way out.
const OUT = (() => {
  const i = process.argv.indexOf('--out');
  if (i >= 0 && !process.argv[i + 1]) {
    console.error('--out needs a directory');
    process.exit(1);
  }
  const v = i >= 0 ? process.argv[i + 1] : process.env.BUILD_OUT;
  return v ? resolve(v) : DEPLOY_OUT;
})();
const SCRATCH = OUT !== DEPLOY_OUT;

// the demo story order, single-sourced from demo/manifest.mjs
// rowHTML/noteHTML come from the manifest too. They used to be duplicated here
// AND in demo/index.html, so fixing one left the other printing `undefined`.
const { DEMOS: DEMO_MANIFEST, NOTES: NOTES_MANIFEST, byGroup, groupHTML, noteHTML, extraPages } =
  await import(new URL('../../demo/manifest.mjs', import.meta.url));

// ── the allowlist ───────────────────────────────────────────────────────────
// [ repo-relative source, public/-relative destination ]
const FILES = [
  // shared timeline library — loaded by remixer and deck, never copied
  // into either proto. One canonical copy, same as the dev servers alias.
  ['timeline/transport.mjs', 'timeline/transport.mjs'],
  ['timeline/media-master.mjs', 'timeline/media-master.mjs'],

  // ⚠️ `megatimeline` WAS HERE AND IS IN `archive/`. Four entries came out with
  // it — the page, its viewport and gesture modules, and the census it fetched
  // from the ROOT (`/census.json`), which nothing else ever read. Its two
  // committed JSONL caches were exploded into static assets a little further
  // down; those calls are gone too, so the build no longer writes nine search
  // results and one item that had no reader. The source is under `archive/`.

  // 2. remixer
  ['proto/remixer/index.html', 'proto/remixer/index.html'],
  ['proto/remixer/hls.min.js', 'proto/remixer/hls.min.js'],

  // 3. deck — renamed from `aikajana` 2026-09-15; the corpus plus archive.org
  //    media, nothing proxied
  ['proto/deck/index.html', 'proto/deck/index.html'],
  ['proto/deck/corpus.json', 'proto/deck/corpus.json'],

  // 4. flipper (live ERR channels; streams are CORS-clear, no proxy)
  ['proto/flipper/index.html', 'proto/flipper/index.html'],
  ['proto/flipper/hls.min.js', 'proto/flipper/hls.min.js'],

  // 5. looper — an INSTRUMENT, not a viewer, and the first page here with no
  // upstream of any kind: no ERR, no proxy, no Durable Object, no network at
  // all once loaded. It needs three more library modules than the viewers do,
  // and the AudioWorklet processor, which is fetched at runtime by URL
  // (`addModule('./onset-worklet.js')`) rather than imported — easy to forget,
  // and the failure mode is a silent ear that detects nothing.
  ['timeline/nested.mjs', 'timeline/nested.mjs'],
  ['timeline/score.mjs', 'timeline/score.mjs'],
  ['timeline/csound.mjs', 'timeline/csound.mjs'],         // 05 vclick compiles a score in the page
  ['timeline/logdeck.mjs', 'timeline/logdeck.mjs'],       // nested.mjs imports pstats
  ['proto/looper/index.html', 'proto/looper/index.html'],
  ['proto/looper/looper.mjs', 'proto/looper/looper.mjs'],
  ['proto/looper/synth.mjs', 'proto/looper/synth.mjs'],
  ['proto/looper/peer.mjs', 'proto/looper/peer.mjs'],
  ['proto/looper/onset-worklet.js', 'proto/looper/onset-worklet.js'],

  // MoQ audio return (shell/moq-audio.mjs). The wrapper and the PCM worklets
  // live under proto/jam because that is where they were measured (session 6i,
  // 35.8 ms key->ear); the shell module is the only consumer and the build
  // refuses it if these are missing, which is how they got listed at all.
  ['proto/jam/moq/www/moq-synth.js', 'proto/jam/moq/www/moq-synth.js'],
  ['proto/jam/playout-worklet.js', 'proto/jam/playout-worklet.js'],

  // ── the demo sequence (plans/plan-demos.md) ─────────────────────────────────────
  // strip.mjs is REQUIRED here: every Act 0 demo imports it, and
  // proto/megatimeline/index.html has imported /timeline/strip.mjs since
  // commit 3647696 without it ever being allowlisted — which is why
  // megatimeline has been dead on the public URL. Adding it fixes both.
  ['timeline/strip.mjs', 'timeline/strip.mjs'],
  ['demo/manifest.mjs', 'manifest.mjs'],
  // demo/shell is ENUMERATED, not listed: see shellFiles() below. A hand-kept
  // list meant a new shell module deployed as a 404 while local verify passed,
  // because the dev server serves the repo directly and only the deploy strips
  // to public/. That is a silent break, so the list is gone.
  ...shellFiles(),
  // 06 imports the v6 player UNCHANGED rather than reimplementing it
  ['src/low-latency-player.js', 'src/low-latency-player.js'],

  // ── six Circuit patches, so `/pack/` has something to open ────────────────
  //
  // 🔴 THESE ARE THE OWNER'S OWN PATCHES AND PUBLISHING THEM WAS ASKED FOR IN
  // WORDS. `/pack/` shows nothing until a file lands and `New Pack.circuitpack`
  // is NOT published, so a visitor met an upload box and an empty page. The
  // request was *"can we get some sample patches in to choose from?"*, then
  // *"at least one"*, and the publishing question was put to the owner rather
  // than assumed: *"that is your sound design going onto a public URL, so I am
  // not doing it unless you say"*, answered *"do it"*.
  //
  // 🔴 A PATCH IS NOT A PACK, AND THAT DISTINCTION IS THE WHOLE SAFETY OF THIS
  // BLOCK. `New Pack.circuitpack` holds 32 of somebody's SESSIONS and stays off
  // this list for good. These are six 350 byte synth patches with no session
  // data in them at all.
  //
  // ✅ AND EVERY ONE WAS CHECKED BEFORE IT WAS WRITTEN, not after. Each is
  // exactly 350 bytes and each carries `00` at offset 6, which is
  // `Replace Current Patch` and lands in RAM. The extractor THROWS on a length
  // that is not 350, on a byte 6 that is not `00`, and on anything `readPatch`
  // calls `writesFlash`, because `01` at that offset is `Replace Patch` and
  // writes flash on an instrument with no factory reset.
  //
  // ⚠️ SIX AND NOT ONE, AND NOT SIXTY FOUR. The ask was `at least one`; six is
  // what it takes to make the page's picture move. Between them they cover six
  // waveforms, three filter types, all three voice modes and 0 to 4 mod slots
  // in use, so pressing through them changes every box in the diagram. Sixty
  // four would be publishing the bank.
  ['demo/resources/patches/aciiid.syx', 'resources/patches/aciiid.syx'],
  ['demo/resources/patches/flamed.syx', 'resources/patches/flamed.syx'],
  ['demo/resources/patches/aggie.syx', 'resources/patches/aggie.syx'],
  ['demo/resources/patches/frosted-glass.syx', 'resources/patches/frosted-glass.syx'],
  ['demo/resources/patches/smooth-pad.syx', 'resources/patches/smooth-pad.syx'],
  ['demo/resources/patches/twins.syx', 'resources/patches/twins.syx'],
  // 🔴 `/notes/` IS NOT SHIPPED. It rendered two essays on the front page, and
  // those have moved to `research/`, which is where writing that argues or
  // reports lives and which is not deployed. A viewer page with nothing left to
  // view is furniture, so the three lines go together rather than leaving a URL
  // that 404s whatever you ask it for. `demo/notes/index.html` stays in the
  // repo: putting a note back is these lines and a row in `NOTES`.

  // The box listener: play a Raspberry Pi in another building from a phone.
  // It needs nothing else deployed — proto/jam/playout-worklet.js is already
  // listed above for the MoQ return path, and the page talks only to
  // ws.positron.studio. Served at /keys/.
  // ⚠️ FROM THE MANIFEST, NOT LISTED HERE. `demoFiles()` enumerates BUILT demos;
  // a page that is not one — the box's listener in rig/, the component sandbox —
  // used to need a hand-written line here AND a matching rewrite in
  // demo/server.mjs. Two pages, four edits, in two files, with nothing to notice
  // if only one of the pair was made. Each declares its own `src` now.
  // ── SuperCollider's own sound server, vendored ────────────────────────────
  //
  // ⚠️ LISTED BY NAME, because `shellFiles()` enumerates ONE directory level and
  // filters to web extensions — it would take neither the `.wasm` nor anything
  // under `vendor/chunks/`. That is the containment argument working as
  // intended rather than a gap to widen: this is 1.86 MB of third-party binary
  // and it should cost somebody a deliberate line.
  //
  // 🔴 IT MOVED HERE FROM `demo/patch/vendor/` ON 2026-09-13, AND THE REASON IS
  // THAT `patch` IS OFF THE SITE. Its row is gone from `demo/manifest.mjs`, so
  // nothing under `demo/patch/` is copied any more — and `/grains/` now boots
  // this engine to run Pappus in the tab. A page fetching `/patch/vendor/…`
  // would be asking for a URL with nothing behind it, which is `moq.mjs`
  // exactly: a module holding a path a rename had moved, 404ing with nothing
  // saying so, killing the page for a reason no log line mentions.
  //
  // 🔴 AND NOT A SECOND COPY UNDER `demo/grains/vendor/`, which `LAYOUT.md`
  // rule 6 would suggest. Two copies of a 1.7 MB AGPL binary can drift apart
  // and the drift is SILENT, because each page goes on working. One copy; the
  // protection the rule was giving is replaced by `checkPresent()` and
  // `checkVendorUrls()` below, both proved by breaking them. Same argument, and
  // the same departure, as the controller meshes in the next block.
  //
  // 🔴 THE CHUNKS ARE NOT OPTIONAL EVEN THOUGH THEY ARE NEVER FETCHED.
  // `supersonic.js` holds `import("./chunks/midi_manager-….js")` and one for
  // gamepads — dynamic imports that a page using neither will never run, but
  // `checkImports()` reads the source and would refuse the build over them, and
  // rightly: an import with no deployed file is a 404 waiting for the first
  // person to plug in a controller. `chunk-V5WXEJ46.js` IS loaded, statically.
  //
  // LICENCE: the engine is scsynth (GPL-3.0-or-later) on clockwork
  // (AGPL-3.0-or-later) and the combined work is AGPL-3.0-or-later — the one
  // licence where serving over a network is the trigger, and this serves it
  // over a network. The texts ship beside the binaries rather than living in
  // somebody's memory. ⚠️ `sonic-pi-beep.scsyndef` and its MIT synthdefs
  // licence did NOT come across: that was `patch`'s demo asset and nothing
  // fetches it any more, and a vendored file with no consumer in the shared kit
  // is a thing for somebody to wonder about later.
  ['demo/shell/vendor/supersonic.js', 'shell/vendor/supersonic.js'],
  ['demo/shell/vendor/chunks/chunk-V5WXEJ46.js', 'shell/vendor/chunks/chunk-V5WXEJ46.js'],
  ['demo/shell/vendor/chunks/gamepad_manager-G6XPZUN2.js', 'shell/vendor/chunks/gamepad_manager-G6XPZUN2.js'],
  ['demo/shell/vendor/chunks/midi_manager-LJCLWFJF.js', 'shell/vendor/chunks/midi_manager-LJCLWFJF.js'],
  ['demo/shell/vendor/clockwork_audio_worklet.js', 'shell/vendor/clockwork_audio_worklet.js'],
  ['demo/shell/vendor/scsynth-nrt.wasm', 'shell/vendor/scsynth-nrt.wasm'],
  ['demo/shell/vendor/LICENSE-supersonic-scsynth', 'shell/vendor/LICENSE-supersonic-scsynth'],
  ['demo/shell/vendor/LICENSE-supersonic-scsynth-core', 'shell/vendor/LICENSE-supersonic-scsynth-core'],

  // ── the two definitions `/grains/` loads into that engine ─────────────────
  //
  // 🔴 NOT VENDORED AND NOT BUILT HERE: these are compiled by sclang ON THE
  // BOARD, by `rig/board/norns/writedefs.scd`, out of the same
  // `Engine_Pappus.sc` and `PosSource.sc` the Raspberry Pi's own service
  // compiles. `/grains/` claims the browser runs the graph the board runs, and
  // that claim is only true while these bytes came from there.
  //
  // ⚠️ `demoFiles()` cannot take them — a subdirectory, and `.scsyndef` is not
  // a web extension — so they are named here, and `checkCompiledDefs()` below
  // refuses the build when either one has drifted from the source it was
  // compiled from. A stale artefact is silent in the worst direction: the tab
  // runs last week's graph beside the board's today, and the page goes on
  // saying they are the same instrument.
  ['demo/grains/defs/pappus-tiny.scsyndef', 'grains/defs/pappus-tiny.scsyndef'],
  ['demo/grains/defs/possource.scsyndef', 'grains/defs/possource.scsyndef'],
  ['demo/grains/defs/PROVENANCE.json', 'grains/defs/PROVENANCE.json'],

  // ── the controller models, vendored ───────────────────────────────────────
  //
  // ⚠️ LISTED BY NAME for the same reason `patch/vendor/` is: `shellFiles()`
  // enumerates ONE directory level and filters to web extensions, so it takes
  // neither a `.glb` nor anything under `shell/vendor/`. The wall is working;
  // this is a deliberate line through it.
  //
  // 🔴 AND THEY ARE UNDER `shell/`, NOT UNDER A DEMO'S `vendor/`, WHICH IS A
  // DEPARTURE FROM `LAYOUT.md` RULE 6 AND IS ARGUED THERE. The consumer is
  // `demo/shell/xr-room.mjs`, which BOTH `scene` and `mirror` import — so a
  // per-slug path would mean one page's controllers came out of a directory
  // named after the other page. The hazard that rule exists to prevent is
  // `moq.mjs`'s: a shared module holding a path a rename had moved, 404ing
  // silently. What replaces it is the existence check below, which refuses the
  // build rather than shipping the 404.
  //
  // LICENCE: MIT, Copyright (c) 2019 Amazon —
  // `@webxr-input-profiles/assets@1.0.20`, `immersive-web/webxr-input-profiles`.
  // 217,984 + 213,868 bytes. The text and the provenance ship beside them.
  ['demo/shell/vendor/meta-quest-touch-plus-left.glb', 'shell/vendor/meta-quest-touch-plus-left.glb'],
  ['demo/shell/vendor/meta-quest-touch-plus-right.glb', 'shell/vendor/meta-quest-touch-plus-right.glb'],
  ['demo/shell/vendor/LICENSE-webxr-input-profiles', 'shell/vendor/LICENSE-webxr-input-profiles'],

  // ── the typeface `/weight/` is made of, vendored ────────────────────────────
  //
  // ⚠️ LISTED BY NAME, and this one would have been missed by looking: a font
  // is not an `import`, so `checkImports()` cannot see it, AND `.woff2` is not
  // in `demoFiles()`'s extension set, so even at the top of `demo/weight/` it
  // would not have been copied. That is the `manifest.webmanifest` failure
  // exactly — `/items/` renamed one file and shipped a 404 to production
  // because an allowlist declined silently. `checkVendorUrls()` below is what
  // now refuses the build instead, which is why the page's `@font-face` writes
  // its `src` as a QUOTED `/weight/vendor/…` string.
  //
  // 🔴 TWO FILES, BECAUSE ESTONIAN IS SPLIT ACROSS TWO OF THEM. Ä Ö Ü Õ are in
  // `latin` (U+00xx) and Š Ž are in `latin-ext` (U+0160, U+017E). Dropping
  // either one does not fail: the browser substitutes a system face for the
  // letters it cannot find, per glyph, with no 404 and no exception — one
  // letter of one word in the wrong typeface. The page measures that rather
  // than trusting it (`text.mjs`, `ensureFont`).
  //
  // ⚠️ THE PAGE DOES NOT NAME THE TYPEFACE — it asks for `weight-display` and
  // `weight-text`, two aliases its stylesheet points at whatever is listed here.
  // So a font change is these three lines, two files, and the `src` pair in the
  // page; nothing in `text.mjs` or in any assert moves. Keep it that way.
  //
  // LICENCE: SIL Open Font License 1.1 — Gabarito, via `google/fonts`
  // (`ofl/gabarito`). The two subsets are Google's own builds; the licence
  // ships beside them.
  ['demo/weight/vendor/gabarito-latin.woff2', 'weight/vendor/gabarito-latin.woff2'],
  ['demo/weight/vendor/gabarito-latin-ext.woff2', 'weight/vendor/gabarito-latin-ext.woff2'],
  ['demo/weight/vendor/LICENSE-gabarito', 'weight/vendor/LICENSE-gabarito'],

  // ── Plaits and Warps, compiled to WebAssembly, for `/muta/` ─────────────────
  //
  // ⚠️ LISTED BY NAME FOR THE THIRD REASON IN A ROW AND IT IS THE SAME ONE:
  // `.wasm` is not in `demoFiles()`'s extension set and `vendor/` is a
  // subdirectory, so these artefacts would be declined silently and the page
  // would ship pointing at a 404. `checkVendorUrls()` below is what refuses
  // the build instead, which is why `demo/muta/index.html` writes both URLs as
  // quoted `/muta/vendor/*.wasm` strings.
  //
  // 🔴 UNDER THE PAGE, NOT IN `demo/shell/`, WHICH IS LAYOUT.md RULE 6.
  // One page reads it. Promoting 188 KB of somebody else's DSP into the shared
  // kit invites a second page to import it without noticing what it costs, and
  // the two exceptions already recorded there (the controller meshes, wasm
  // scsynth) both moved because TWO pages needed them.
  //
  // LICENCE: MIT, Emilie Gillet, for BOTH, and it is worth checking per module
  // rather than per repository. `plaits/` and `stmlib/` are STM32F projects,
  // which is the half of the eurorack grant that is MIT rather than GPL:
  // `plaits/makefile` says `FAMILY = f37x` and `warps/makefile` says
  // `FAMILY = f4xx`. The panel graphics are NOT taken and are the one thing in
  // that ecosystem that could not be. The licences, the upstream commits and
  // the source digests baked into each wasm live in `demo/muta/vendor/`; the
  // build recipe for both is `demo/muta/build/build.sh`.
  //
  // ⚠️ `PROVENANCE-*.json` IS DELIBERATELY NOT DEPLOYED. The page reads each
  // build stamp out of the WASM ITSELF (`plai_build()`, `warp_build()`), which
  // is the copy that cannot drift from the thing making the sound. A second
  // copy served beside it would be a number that agrees by construction, which
  // LESSONS #82 records as two witnesses who are one witness.
  ['demo/muta/vendor/plai.wasm', 'muta/vendor/plai.wasm'],
  ['demo/muta/vendor/LICENSE-plaits', 'muta/vendor/LICENSE-plaits'],
  ['demo/muta/vendor/warp.wasm', 'muta/vendor/warp.wasm'],
  ['demo/muta/vendor/LICENSE-warps', 'muta/vendor/LICENSE-warps'],

  // ── the Faust compiler itself, for `/fau/` ─────────────────────────────────
  //
  // ⚠️ THE FOURTH CASE OF THE SAME RULE: `demoFiles()` takes neither a `.wasm`
  // nor a subdirectory, and `.data` is not a web extension at all, so all four
  // of these would be declined in silence and the page would ship pointing at
  // four 404s. `checkVendorUrls()` is what refuses the build instead, which is
  // why `demo/fau/index.html` writes each of them out as a whole quoted path in
  // one object at the top of the file. ⚠️ AND WHY NEITHER FILE SPELLS A VENDOR
  // PATH IN PROSE: this check reads comments as well as code, and refused this
  // very build over an ellipsis standing in for a file name.
  //
  // 🔴 6,162,473 BYTES OF COMPILER, WHICH IS 2.49 TIMES THE VENDORED SCSYNTH
  // ALREADY IN THIS REPOSITORY OVER BROTLI. `plans/plan-fau.md` §1 prices it
  // file by file: 3,598,106 for the compiler, 2,407,445 that is not data at all
  // but the 53 standard library `.lib` files as plain Faust source, and 156,922
  // of Emscripten glue. The page fetches none of it on a visit — the first
  // press does — and says in its own log what pressing will cost.
  //
  // ⚠️ WHETHER THE EDGE COMPRESSES `libfaust-wasm.data` IS UNVERIFIED and it is
  // the difference between 1.0 MB and 2.9 MB over the wire. It has no extension
  // Cloudflare recognises. One `curl -I -H 'Accept-Encoding: br'` against the
  // deployed copy settles it, and this list is where the rename would go if the
  // answer is no. `plans/plan-fau.md` §11 item 3.
  //
  // LICENCE: LGPL 2.1 or later. The text shipped in the package is the FAUST
  // wasm copyright header (GRAME, 2021-2024) over the full LGPL 2.1, and it is
  // vendored verbatim beside the binaries. ⚠️ npm's own metadata for
  // `@grame/faustwasm@0.18.5` says `LGPL-3.0`, which disagrees with the file in
  // the tarball; the file is what ships here and what a reader can check.
  // ⚠️ THE STANDARD LIBRARY IS A PATCHWORK and the licence above does not cover
  // it: of the 53 `.lib` files inside the `.data` blob, five declare
  // `LicenseRef-LGPL-2.1-or-later-with-Faust-exception`, THREE declare
  // `STK-4.3`, two declare `LGPL with exception`, one `LGPL-2.1-or-later`, and
  // 42 declare nothing at all. `plans/plan-fau.md` §7.2 lists them.
  ['demo/fau/vendor/libfaust-wasm.wasm', 'fau/vendor/libfaust-wasm.wasm'],
  ['demo/fau/vendor/libfaust-wasm.data', 'fau/vendor/libfaust-wasm.data'],
  ['demo/fau/vendor/libfaust-wasm.js', 'fau/vendor/libfaust-wasm.js'],
  ['demo/fau/vendor/faustwasm.mjs', 'fau/vendor/faustwasm.mjs'],
  ['demo/fau/vendor/LICENSE-faustwasm', 'fau/vendor/LICENSE-faustwasm'],

  ...extraPages(),
  ...demoFiles(),
];

/**
 * Allowlist entries for every BUILT demo, generated from demo/manifest.mjs so
 * the list stops being hand-maintained (plans/plan-demos.md, order of work step 8).
 *
 * This reads a directory, which the rule above forbids — but the rule exists
 * because the REPO ROOT holds .env. Enumeration here is confined to
 * demo/<nn>-<name>/ and filtered to web extensions, so there is no path by
 * which a secret enters public/.
 */
/**
 * Every web file in demo/shell, deployed flat at /shell/.
 *
 * Same containment argument as demoFiles(): a single known subdirectory,
 * filtered to web extensions, so no secret can reach public/.
 */
function shellFiles() {
  const out = [];
  const OK = new Set(['.mjs', '.js', '.css']);
  let entries = [];
  try { entries = readdirSync(join(REPO, 'demo/shell'), { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    if (!e.isFile() || !OK.has(extname(e.name))) continue;
    out.push([`demo/shell/${e.name}`, `shell/${e.name}`]);
  }
  return out;
}

/**
 * Refuse to ship a demo whose /shell/… or ./… import has no file in public/.
 *
 * This is the check that would have caught the 404 above before it went out:
 * the page imported /shell/moq.mjs, the copy list did not carry it, and
 * nothing complained until a browser asked for it on the live site.
 *
 * IT SCANS MODULES, NOT JUST PAGES, and it did not always. While it read HTML
 * only, `demo/shell/moq.mjs` went on importing `/08-moq/moq-vendor.js` for the
 * whole life of the slug rename — a 404 that killed the module, so `moq` and
 * `ladder` never reached `__demo.ready` and asserted NOTHING. Both read as red
 * for a plausible wrong reason (no relay on this network) and stayed that way.
 * A page is not the only thing that can import; the check has to follow the
 * imports wherever they live.
 */
function checkImports(copied) {
  const have = new Set(copied.map(([, dst]) => dst));
  const missing = [];
  const SCAN = new Set(['.html', '.mjs', '.js']);
  for (const [src, dst] of copied) {
    if (!SCAN.has(extname(dst))) continue;
    let text = '';
    try { text = readFileSync(join(REPO, src), 'utf8'); } catch { continue; }
    const dir = dirname(dst);
    // ⚠️ `[^'"\n]`, AND THE NEWLINE IS THE PART THAT WAS MISSING. Without it
    // the `import…` alternative runs across line breaks, so any IDENTIFIER
    // containing the word — `importMs` — swallowed everything up to the next
    // quoted string and reported `grains/engine.mjs imports /status.reply`
    // about an OSC address in a comparison twelve lines below it. It refused a
    // build over two things that are not imports, and `demo/patch/engine.mjs`
    // had the same variable and passed only because the string that followed it
    // happened to be a real deployed path. A guard that can refuse for a reason
    // that is not true teaches people to edit the guard.
    // A multi-line `import { … } from '…'` is still caught: its specifier
    // follows `from`, which is the second alternative.
    for (const m of text.matchAll(/(?:import[^'"\n]*?|from\s*)['"](\.\/[^'"]+|\/[^'"]+)['"]/g)) {
      const spec = m[1];
      if (spec.startsWith('./')) {
        const rel = (dir === '.' ? '' : dir + '/') + spec.slice(2);
        if (!have.has(rel)) missing.push(`${dst} imports ${spec} -> ${rel}`);
      } else {
        const rel = spec.replace(/^\//, '').split('?')[0];
        // /src/… and /proto/… are carried by the explicit list above; only
        // flag it when nothing in the copy set provides it.
        if (!have.has(rel)) missing.push(`${dst} imports ${spec} -> ${rel}`);
      }
    }
  }
  if (missing.length) {
    console.error('\nBUILD REFUSED — imports with no deployed file:');
    for (const m of missing) console.error('  ' + m);
    process.exit(1);
  }
}

function demoFiles() {
  const out = [];
  // ⚠️ MEDIA TOO. This was code and stylesheets only, so a demo that carries a
  // sound file shipped the page and not the sound — a 404 the page cannot
  // recover from and the build had no reason to mention. `dust` carries two
  // 1965 excerpts; the allowlist is still an allowlist, because this directory
  // is the wall that keeps `enumerate, don't list` away from the repo root.
  // 🔴 `.webmanifest` IS ON THIS LIST BECAUSE LEAVING IT OFF SHIPPED A 404 TO
  // PRODUCTION. `/items/` renamed `manifest.json` to `manifest.webmanifest` to
  // get the spec content type, the build silently declined to copy it, and the
  // deploy went out with `<link rel="manifest">` pointing at nothing — the one
  // file an iPhone reads to decide whether a page may be installed at all.
  // ⚠️ AN ALLOWLIST FAILS SILENTLY BY DESIGN, which is the point of it; what
  // was missing is that nothing ASKED whether every local URL in a page has a
  // file behind it. `checkImports()` does that for modules only.
  // 🔴 `.mp4` ADDED 2026-09-18 FOR THE SAME REASON `.m4a` IS HERE, AND IT
  // FAILED IN THE SAME SILENT WAY FIRST. `/stage/` gained a public domain film
  // as its default background; the build copied the film's provenance JSON
  // beside it and declined the film, so the page would have shipped with a
  // `<video>` pointing at a 404 and the build would have said `copied 182
  // files` about it. That is the `.webmanifest` story again, third time.
  const OK = new Set(['.html', '.mjs', '.js', '.css', '.json', '.webmanifest',
                      '.m4a', '.mp3', '.opus', '.ogg', '.wav', '.webm',
                      '.mp4', '.m4v',
                      '.png', '.jpg', '.jpeg', '.svg', '.webp']);
  for (const d of DEMO_MANIFEST) {
    if (!d.built) continue;
    const dir = `demo/${d.name}`;
    let entries = [];
    try { entries = readdirSync(join(REPO, dir), { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isFile()) continue;
      if (!OK.has(extname(e.name))) continue;
      // deployed WITHOUT the demo/ prefix: the public URL is /<nn>-<name>/
      out.push([`${dir}/${e.name}`, `${dir.replace(/^demo\//, '')}/${e.name}`]);
    }
  }
  return out;
}

// ── deployed-copy rewrites ──────────────────────────────────────────────────
// The ONLY edits made to any proto's bytes, applied to the COPY in public/.
// The files in proto/ are not touched. Each one exists because the source
// hardcodes a dev-server localhost URL that cannot resolve from a phone.
// ── appended to the deployed copy ───────────────────────────────────────────
// A BACK LINK for the archive pages, which predate the index and have no way
// to reach it — on a phone the only exit is the browser gesture.
//
// APPENDED rather than substituted, deliberately: the first attempt used
// REWRITES with "</html>" as the anchor and build.mjs correctly refused,
// because proto/megatimeline/index.html has no closing tag. A position:fixed
// anchor works wherever it lands in the body, so it needs no anchor at all.
//
// Deployed copy only: under each proto's own dev server "/" is the repo root,
// not the index, so the link would point at nothing there.
const BACK = '<a href="/" style="position:fixed;left:8px;bottom:8px;z-index:99999;'
  + 'font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;'
  + 'color:#ffd400;background:#0b0e14cc;border:1px solid #2b3546;border-radius:4px;'
  + 'padding:7px 10px;text-decoration:none">\u2190 demos</a>';

const APPEND = {
  'proto/deck/index.html': BACK,
  'proto/remixer/index.html': BACK,
};
/**
 * A digest of the bytes about to be copied — four hex, enough to tell two
 * trees apart and short enough to read off a phone.
 *
 * ⚠️ TOLERATE AN UNREADABLE FILE RATHER THAN THROWING HERE. `checkPresent()` is
 * what reports a missing file — by name, with the build refused and nothing
 * deleted — and it runs a few hundred lines below this. An ENOENT thrown out of
 * the stamp would pre-empt it with a stack trace, which is exactly the raw
 * failure that check exists to replace.
 */
const treeDigest = () => {
  const h = createHash('sha256');
  for (const [src] of FILES) {
    h.update(src);
    try { h.update(readFileSync(join(REPO, src))); } catch { h.update('\0absent'); }
  }
  return h.digest('hex').slice(0, 4);
};

// A build id the browser can report back. git sha + build time + the tree.
//
// ⚠️ THE SHA AND THE CLOCK ARE EACH INSUFFICIENT, FOR DIFFERENT REASONS. The
// sha alone is not enough because an uncommitted edit deploys under the
// previous one — which is why the time was added. But a time says WHEN, never
// WHOSE: two working trees at one sha, built seconds apart by two agents, then
// differ by a number that looks like a clock and carries nothing about which
// tree shipped. `Attribute a run to a build before iterating on it` quietly
// stops working there, because the stamp DID change and it is the wrong
// build's. The digest is over the bytes themselves, so two identical trees
// stamp identically and two different ones cannot.
const BUILD_STAMP = `${execSync('git rev-parse --short HEAD', { cwd: REPO }).toString().trim()}`
  + `-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}`
  + `-${treeDigest()}`;

const REWRITES = {
  'demo/shell/shell.mjs': [
    [`export const BUILD = 'dev';`, `export const BUILD = '${BUILD_STAMP}';`],
  ],
  'proto/flipper/index.html': [
    // flipper has NO viewport meta. research/mobile-2026-08.md §3 lists exactly
    // this bug — "the single biggest bug on three of the four public surfaces"
    // — and fixed it in megatimeline, remixer, aikajana and replay. flipper
    // was not in that pass, so it still lays out at 980 px and a phone renders
    // it shrunk to ~40%. Measured at a true 390 px layout it is already fluid:
    // 0 px horizontal overflow, tiles and HUD intact, three live streams
    // playing. So the deployed copy gets the same one line the other three
    // carry, verbatim. proto/flipper/index.html itself is NOT modified — the
    // missing meta is a real gap in that proto and belongs in its own commit.
    ['<meta charset="utf-8">',
      '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'],
  ],
};

// ── canonical query hash (MUST match src/index.js byte for byte) ────────────
const canon = (v) =>
  Array.isArray(v) ? v.map(canon)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]))
      : v;

async function queryHash(queryParams) {
  const bytes = new TextEncoder().encode(JSON.stringify(canon(queryParams)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// ── favicon: a 32x32 PNG wrapped in an ICO container, built here ────────────
// e+ — the positron. A bold lowercase 'e' (a ring with a lower-right aperture
// plus a crossbar) and a superscript plus, in the menu's palette.
function favicon() {
  const N = 32, px = Buffer.alloc(N * N * 4);
  const put = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= N || y >= N) return;
    const i = (y * N + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
  };
  const BG = [0x0b, 0x0e, 0x14], HI = [0xff, 0xd4, 0x00];
  // rounded corners, drawn by leaving the four corner arcs transparent — the
  // same 6 px radius the SVG in demo/shell/shell.mjs uses. KEEP THE TWO IN
  // SYNC: this is the .ico a bare browser asks for, that one is what a demo
  // page declares, and a user sees whichever the tab happens to have.
  const RAD = 6;
  const inRounded = (x, y) => {
    const dx = Math.min(x, N - 1 - x), dy = Math.min(y, N - 1 - y);
    if (dx >= RAD || dy >= RAD) return true;
    return Math.hypot(RAD - dx, RAD - dy) <= RAD + 0.5;
  };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (inRounded(x, y)) put(x, y, BG);

  // the 'e': an annulus with the lower-right wedge removed. Smaller than it
  // was, so the whole glyph sits inside the rounded field instead of running
  // off the bottom-right corner.
  //
  // The aperture is 11°-38° and shell.mjs's SVG must agree. It was 5°-62°,
  // which removed the terminal and clipped the crossbar, and the letter read as
  // a bitten circle rather than an 'e'.
  const cx = 13.5, cy = 19.3, R = 8.6, r = 5.4;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d > R || d < r) continue;
    const a = (Math.atan2(y - cy, x - cx) * 180) / Math.PI;   // y down: +90 = down
    if (a > 11 && a < 38) continue;                            // the aperture — KEEP IN SYNC with shell.mjs
    put(x, y, HI);
  }
  // the crossbar is what makes a ring an 'e'
  for (let y = Math.round(cy - 1.4); y <= Math.round(cy + 1.1); y++)
    for (let x = Math.round(cx - R + 2.9); x <= Math.round(cx + R - 1.1); x++) put(x, y, HI);

  // the superscript plus — the charge, and the whole name
  const pxc = 24.5, pyc = 8, arm = 3.2, th = 1.1;
  const R2 = (v) => Math.round(v);
  for (let x = R2(pxc - arm); x <= R2(pxc + arm); x++) for (let y = R2(pyc - th); y <= R2(pyc + th); y++) put(x, y, HI);
  for (let y = R2(pyc - arm); y <= R2(pyc + arm); y++) for (let x = R2(pxc - th); x <= R2(pxc + th); x++) put(x, y, HI);

  const raw = Buffer.alloc(N * (N * 4 + 1));
  for (let y = 0; y < N; y++) {
    raw[y * (N * 4 + 1)] = 0;                                               // filter: none
    px.copy(raw, y * (N * 4 + 1) + 1, y * N * 4, (y + 1) * N * 4);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4);
  ihdr[8] = 8; ihdr[9] = 6;                                                 // 8-bit RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  const dir = Buffer.alloc(22);                       // ICONDIR + one ICONDIRENTRY
  dir.writeUInt16LE(0, 0); dir.writeUInt16LE(1, 2); dir.writeUInt16LE(1, 4);
  dir[6] = N; dir[7] = N; dir[8] = 0; dir[9] = 0;
  dir.writeUInt16LE(1, 10); dir.writeUInt16LE(32, 12);
  dir.writeUInt32LE(png.length, 14); dir.writeUInt32LE(22, 18);
  return Buffer.concat([dir, png]);
}

// ── run ─────────────────────────────────────────────────────────────────────
//
// 🔴 EVERY REFUSAL FIRST, BEFORE ONE BYTE IS WRITTEN OR DELETED — AND THAT WAS
// NOT TRUE UNTIL 2026-09-14, WHILE `checkPresent`'S OWN COMMENT SAID IT WAS.
// All four calls sat BELOW the copy loop, so a listed file that was not on disk
// did not produce the named refusal this file goes to such trouble to write: it
// produced a raw `ENOENT` from `copyFile` in the middle of the run, on top of
// an `OUT` that had already been emptied — a half-built output directory and a
// stack trace, which is the exact failure the comment claimed was prevented.
// MEASURED by moving `scsynth-nrt.wasm` aside and watching it happen.
//
// The checks read FILES and the repo, never OUT, so there was never a reason
// for them to be down there. Function declarations hoist; the calls moved and
// nothing else did.
checkImports(FILES);
checkPresent(FILES);
checkVendorUrls(FILES);
checkCompiledDefs();
checkOut(OUT);

// ⚠️ SAY WHICH BUILD THIS IS, BEFORE IT RUNS AND AGAIN AFTER. A scratch build
// that is mistaken for a real one is a deploy nobody made; a real one mistaken
// for a scratch build is sixty files somebody has to explain.
console.log(SCRATCH ? `SCRATCH BUILD -> ${OUT} (public/ untouched)` : `build -> ${OUT}`);
console.log(`stamp ${BUILD_STAMP}`);

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// the menu page — the only page this worker authors itself. Its list is
// GENERATED from demo/manifest.mjs (plans/plan-demos.md step 8) so there is no second
// place to forget. Number and name only; a row with no target renders greyed.
{
  // 🔴 GROUPED BY SUBJECT on the front page, story order everywhere else.
  // `byGroup()` returns copies for exactly that reason — the array is still the
  // sequence — and it REFUSES a row with no group rather than quietly leaving
  // it off the one page everybody opens.
  const rows = byGroup(DEMO_MANIFEST).map((g) => '  ' + groupHTML(g)).join('\n');
  // 🔴 NO HEADING AND NO LIST WHEN THERE ARE NO NOTES. `NOTES` has been empty
  // since the last one was struck, and this wrote the word `notes` over an
  // `<ol>` with nothing in it on every build: a section that promises something
  // and delivers a gap, which is `shell.css`'s empty-readout rule one page up.
  // Reported as *"rm empty notes"*. A container with nothing in it must not
  // paint its edges, and a heading is an edge.
  const notes = NOTES_MANIFEST.length
    ? '<h2 class="pos-act-h">notes</h2>\n<ol class="pos-acts">'
      + NOTES_MANIFEST.map((n) => '  ' + noteHTML(n)).join('\n') + '</ol>'
    : '';
  const menu = await readFile(join(HERE, 'menu.html'), 'utf8');
  if (!menu.includes('<!--DEMOS-->')) throw new Error('menu.html lost its <!--DEMOS--> marker');
  if (!menu.includes('<!--NOTES-->')) throw new Error('menu.html lost its <!--NOTES--> marker');
  await writeFile(join(OUT, 'index.html'),
    menu.replace('<!--DEMOS-->', rows).replace('<!--NOTES-->', notes));
}

// favicon.ico — generated, not committed. Browsers request /favicon.ico for
// every page whether or not the HTML asks for one; without this the four
// protos (which declare no icon, and three of which we must not edit) each log
// a 404 to the console, and "zero console errors" stops being true.
await writeFile(join(OUT, 'favicon.ico'), favicon());

// ── _headers — the half of the noindex that the Worker cannot reach ──────────
//
// 🔴 STATIC ASSETS ARE SERVED BY THE EDGE BEFORE THE WORKER RUNS. `src/index.js`
// wraps every response IT returns in `X-Robots-Tag`, and that covers `/api/*`,
// `/err-img`, `/icy/*`, `/report`, `/notes/<slug>` and the 404. It covers none
// of the fifty pages, none of the modules and none of the committed cache,
// because for those the Worker is never invoked at all. This file is what
// covers them, and the two must keep saying the same thing.
//
// ⚠️ `_headers` IS A CONFIG FILE, NOT AN ASSET. Cloudflare reads it at upload
// and does not serve it, so this does not put a file at /_headers. `/*` matches
// every path on every hostname this Worker answers, which includes the
// `workers.dev` name that `workers_dev: true` keeps alive.
//
// To turn indexing back on when the site IS ready: delete this block, delete
// `NOINDEX`/`marked()`/`ROBOTS` from src/index.js, and drop the meta pass in
// the copy loop below. Nothing else knows about any of it.
await writeFile(join(OUT, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n');

// ── the noindex meta, on every page, whoever wrote the page ─────────────────
//
// The header above is the control that actually works. This is the second
// channel, and it exists because a header is invisible in the file: somebody
// reading a page's source should be able to see that it is not meant to be
// found. 45 of the 50 pages already carried it when this landed.
//
// ⚠️ IT PATCHES THE DEPLOYED COPY ONLY, which is the same treatment
// `proto/flipper/index.html` already gets for its missing viewport, and for the
// same reason: three of the four protos must not be edited. A page in demo/
// should carry the tag in its own source, and this is the net under it.
// ⚠️ AND IT SAYS HOW MANY IT CAUGHT. A build step that silently repairs pages
// cannot be told apart from one that has nothing to repair, so the count is
// printed: if it ever rises, a new page shipped without the tag.
const ROBOTS_META = '<meta name="robots" content="noindex, nofollow">';
const CHARSET = '<meta charset="utf-8">';
const patched = [];

function withRobotsMeta(src, text) {
  if (text.includes('name="robots"')) return text;
  patched.push(src);
  // After the charset declaration, which every page here opens with, so the
  // encoding is still declared inside the first 1024 bytes. A page without one
  // gets the tag at the very top, where it is still inside the head.
  return text.includes(CHARSET)
    ? text.replace(CHARSET, `${CHARSET}\n${ROBOTS_META}`)
    : `${ROBOTS_META}\n${text}`;
}

for (const [src, dst] of FILES) {
  const to = join(OUT, dst);
  await mkdir(dirname(to), { recursive: true });
  const rewrites = REWRITES[src];
  const append = APPEND[src];
  const isPage = extname(dst) === '.html';
  if (rewrites || append || isPage) {
    let text = await readFile(join(REPO, src), 'utf8');
    for (const [from, into] of rewrites || []) {
      if (!text.includes(from)) throw new Error(`rewrite target vanished in ${src}: ${from}`);
      text = text.split(from).join(into);
    }
    if (append) text += '\n' + append + '\n';
    if (isPage) text = withRobotsMeta(src, text);
    await writeFile(to, text);
    if (rewrites || append) {
      console.log(`  ${rewrites ? `rewrote ${dst} (${rewrites.length} substitution(s))` : `copied ${dst}`}${append ? ' + back link' : ''}`);
    }
  } else {
    await copyFile(join(REPO, src), to);
  }
}
console.log(patched.length
  ? `  noindex meta added to ${patched.length} page(s) that lacked it: ${patched.join(', ')}`
  : '  noindex meta: every page carried it already');
{
  // Stripping the demo/ prefix on deploy made it possible for two sources to
  // land on one destination (demo/index.html and the generated menu both wanted
  // index.html). Refuse rather than let the later copy win silently.
  const seen = new Map();
  for (const [src, dst] of FILES) {
    if (seen.has(dst)) throw new Error(`duplicate destination ${dst}: ${seen.get(dst)} and ${src}`);
    seen.set(dst, src);
  }
}
// Same spirit as the duplicate-destination guard above, for the other silent
// break: an import with nothing deployed behind it.

/**
 * 🔴 REFUSE THE BUILD IF A LISTED FILE IS NOT THERE.
 *
 * `checkImports` catches a MODULE that imports something undeployed. It cannot
 * catch a BINARY, because a binary is not imported — it is fetched by URL, and
 * a URL is just a string to every check in this file. So a vendored asset that
 * was renamed, or never committed, would copy-fail somewhere in the middle of
 * the run with a raw ENOENT, or — worse, if the list were edited but the file
 * left behind — ship a 404 that only a headset would ever meet.
 *
 * That is `moq.mjs` again: a module holding a path that moved. The controller
 * models live under `shell/vendor/` precisely because the module that wants
 * them is shared, so this check is what makes that safe. It runs BEFORE
 * anything is copied, so a missing file is a refusal rather than a half-built
 * output directory.
 */
function checkPresent(copied) {
  const gone = copied.filter(([src]) => !existsSync(join(REPO, src))).map(([src]) => src);
  if (gone.length) {
    console.error('\nBUILD REFUSED — listed files that are not on disk:');
    for (const g of gone) console.error('  ' + g);
    process.exit(1);
  }
}

/**
 * 🔴 REFUSE AN `--out` THAT WOULD DELETE SOMETHING THIS BUILD DID NOT WRITE.
 *
 * The run section empties OUT with `rm -rf`. For `public/` that is correct and
 * has been for a year. For a directory somebody typed on the command line it is
 * a loaded gun pointed at whatever they mistyped — and the whole point of
 * `--out` is that it gets typed, often, by people and agents in a hurry.
 *
 * So three refusals, in rising order of how bad the mistake would be: never the
 * repo or anything containing it; never a directory that has files in it which
 * this build did not put there. A build output is recognisable — it always has
 * `index.html` and `favicon.ico`, both of which this file authors itself — so
 * "did we write this?" is answerable without keeping a marker file around.
 *
 * ⚠️ An EMPTY or ABSENT directory is fine and is the common case: `--out` into
 * a fresh temp dir is the whole intended use.
 */
function checkOut(out) {
  const refuse = (why) => {
    console.error(`\nBUILD REFUSED — --out ${out}:`);
    console.error('  ' + why);
    process.exit(1);
  };
  if (out === REPO || out === HERE) refuse('that is the repo, not an output directory');
  if (REPO.startsWith(out + sep)) refuse('that directory contains the repo');
  let entries = null;
  try { entries = readdirSync(out); } catch { return; }      // absent is fine
  if (!entries.length) return;                                // empty is fine
  if (!entries.includes('index.html') || !entries.includes('favicon.ico')) {
    refuse(`it holds ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} `
      + 'and does not look like a build output (no index.html + favicon.ico). '
      + 'Refusing to empty a directory this build did not write.');
  }
}

/**
 * 🔴 AND REFUSE A `vendor/` URL IN THE SOURCE WITH NOTHING DEPLOYED BEHIND IT.
 *
 * The other half of the same hazard, from the other end: `xr-room.mjs` holds
 * the string `/shell/vendor/` and builds a filename from a profile id. If the
 * directory were renamed, `checkPresent` above would still pass — the files
 * exist, they are just somewhere else — and the module would 404 at runtime on
 * a headset, which is the most expensive place this repo has to find anything.
 *
 * So the literal paths in the source are checked too. Only fixed ones can be:
 * a name built from a runtime value cannot be known here, which is why the
 * runtime ALSO falls back to a drawn stand-in and says on the tablet's own face
 * which one you are looking at. Three guards, because this exact class of bug
 * has already cost two demos a day of reading red for the wrong reason.
 */
function checkVendorUrls(copied) {
  const have = new Set(copied.map(([, dst]) => dst));
  const bad = [];
  for (const [src, dst] of copied) {
    if (!['.html', '.mjs', '.js'].includes(extname(dst))) continue;
    let text = '';
    try { text = readFileSync(join(REPO, src), 'utf8'); } catch { continue; }
    // ⚠️ `defs` AS WELL AS `vendor`, ADDED 2026-09-13. `/grains/` fetches two
    // compiled SynthDefs from `/grains/defs/`. They are not vendored — they are
    // build artefacts of the Raspberry Pi — but the hazard is identical: a
    // string in the source, no import to follow, and a 404 at runtime that
    // leaves the page booting for ever with nothing in the log.
    for (const m of text.matchAll(/['"`](\/[A-Za-z0-9_-]+\/(?:vendor|defs)\/[^'"`${}]*)['"`]/g)) {
      const rel = m[1].replace(/^\//, '');
      // a bare directory prefix is a base that gets a filename appended at
      // runtime — check the DIRECTORY has something in it
      const isDir = rel.endsWith('/');
      const ok = isDir ? [...have].some((h) => h.startsWith(rel)) : have.has(rel);
      if (!ok) bad.push(`${dst} points at ${m[1]}`);
    }
  }
  if (bad.length) {
    console.error('\nBUILD REFUSED — vendor/defs paths in the source with nothing deployed behind them:');
    for (const b of bad) console.error('  ' + b);
    process.exit(1);
  }
}

/**
 * 🔴 AND REFUSE A COMPILED SynthDef THAT NO LONGER MATCHES ITS SOURCE.
 *
 * `demo/grains/defs/*.scsyndef` are built by sclang ON THE BOARD out of
 * `rig/board/norns/Engine_Pappus.sc` and `PosSource.sc`. `/grains/` loads them
 * into wasm scsynth in the tab and claims, in its own first paragraph, that the
 * browser is running the graph the Raspberry Pi is running.
 *
 * That claim has one silent failure and this is it: somebody edits the engine,
 * the board recompiles on its next restart, and the checked-in artefact does
 * not — so the tab runs the OLD graph beside the board's new one and every
 * number on the page goes on agreeing, because both ends are still measured
 * the same way. Nothing 404s, nothing throws, and the page's whole subject is
 * quietly false.
 *
 * `PROVENANCE.json` records the md5 of every source and every artefact. This
 * re-takes both and refuses the build on any disagreement, with the recipe in
 * the message — the artefact cannot be rebuilt here, so the refusal has to say
 * where it is rebuilt.
 *
 * ⚠️ IT IS A HASH OF THE SOURCE, NOT OF THE COMPILER. A different sclang could
 * still produce different bytes from the same `.sc`; that is why the artefact's
 * own hash is checked too, so at least "the file in the repo is the file that
 * was weighed" is never in doubt.
 */
function checkCompiledDefs() {
  const dir = 'demo/grains/defs';
  let doc;
  try { doc = JSON.parse(readFileSync(join(REPO, dir, 'PROVENANCE.json'), 'utf8')); }
  catch (e) {
    console.error(`\nBUILD REFUSED — ${dir}/PROVENANCE.json could not be read: ${e.message}`);
    process.exit(1);
  }
  const bad = [];
  const sum = (rel) => createHash('md5').update(readFileSync(join(REPO, rel))).digest('hex');
  for (const [rel, want] of Object.entries(doc.sources || {})) {
    let got = null;
    try { got = sum(rel); } catch { bad.push(`${rel} is not on disk`); continue; }
    if (got !== want) bad.push(`${rel} has changed — ${want} recorded, ${got} on disk`);
  }
  for (const [name, meta] of Object.entries(doc.artefacts || {})) {
    const rel = `${dir}/${name}`;
    let got = null;
    try { got = sum(rel); } catch { bad.push(`${rel} is not on disk`); continue; }
    if (got !== meta.md5) bad.push(`${rel} is not the file that was weighed — ${meta.md5} recorded, ${got} on disk`);
  }
  if (bad.length) {
    console.error('\nBUILD REFUSED — the compiled SynthDefs /grains/ ships no longer match what they came from:');
    for (const b of bad) console.error('  ' + b);
    console.error(`\n  Recompile on the board and re-take the hashes:\n  ${doc.howToRemake}`);
    process.exit(1);
  }
}
console.log(`copied ${FILES.length} files`);

// explode the committed JSONL caches into addressable static assets
async function explode(jsonl, key2path) {
  let n = 0;
  const text = await readFile(join(REPO, jsonl), 'utf8');
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const { key, value } = JSON.parse(line);
    const rel = await key2path(key);
    if (!rel) continue;
    const to = join(OUT, rel);
    await mkdir(dirname(to), { recursive: true });
    // `value` is the upstream response body, already a JSON string
    await writeFile(to, typeof value === 'string' ? value : JSON.stringify(value));
    n++;
  }
  return n;
}

// ⚠️ THE EXPLODED CACHES WENT WITH MEGATIMELINE. They turned its two committed
// JSONL files into one static asset per entry, so a cache hit was a plain file
// read and ERR was never called for a query already on disk. Nothing else ever
// read them: the page that asked for `cache/search/…` and `cache/item/…` is the
// page now in `archive/`. `explode()` and `queryHash()` are left in this file —
// they are the mechanism, and the next proto with a committed cache wants them.
console.log('cache: nothing to explode — megatimeline is archived');
console.log(SCRATCH
  ? `\nSCRATCH BUILD OK — ${OUT}. Nothing in public/ changed and nothing is deployed from here.`
  : `\nbuild ok — ${OUT}, stamp ${BUILD_STAMP}. Deploy with: node workers/view/deploy.mjs`);
