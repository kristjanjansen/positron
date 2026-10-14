# Consolidating plans/ and research/, a proposal

Status (2026-10-14): open. Nothing in it has been done; every merge and move waits for the owner's yes.

Asked 2026-10-14: *"In bg review research abd plans and clean up, mark them done, perhaos consolidate?"*. The marking is done: every plan and research document now carries one `Status (2026-10-14): ...` line under its title, and `plans/README.md` and `research/README.md` index them. This document is the "perhaps consolidate" half. **Nothing below has been done.** A moved or merged path breaks every comment that cites it, and the 2026-09-20 move into `plans/` cost a rewrite of 129 files.

## How the references were counted

For every document, `grep -rlF <basename>` over the whole checkout (no `.git`, no `node_modules`), on 2026-10-14, before the two README files existed. That covers code comments, `CLAUDE.md`, `.claude/skills/`, `HANDOFF.md`, `BACKLOG.md`, `PROGRESS.md`, `LESSONS.md`, `SUMMARY.md`, `archive/` and the other documents. Matching on the basename catches a citation written with or without the `plans/` prefix.

- **`workers/view/public/` is the generated build.** A hit there is a copy of a `demo/` file and is fixed by the next `node build.mjs`, not by hand. The counts below give it separately.
- **`archive/` should not be rewritten.** Its rule is that an archive records what was there. So a citation from `archive/` breaks quietly, and it should stay broken or be covered by a stub.
- **Outside the repository**, the owner's auto-memory names `research/timeline-own-prior-art-2026-08.md`, `research/music-jamming-2026-08.md`, `research/err-live-feeds-2026-08.md` and `research/err-archives-2026-08.md`. None of these is proposed to move. The same memory also names `plans/plan-eccm-setup.md` and `plans/lineage.md`, and neither exists today: those two are already stale.

## The cheap way to do any of it: leave a stub

Whatever moves or merges, the old path can keep a three line file: the title, `Moved to <new path> on <date>.`, and nothing else. Every citation then still resolves, and a reader is one click from the content. Nothing has to be rewritten, and that includes the `archive/` citations that must not be rewritten. The cost is that the folder does not get shorter, which is half of what consolidating is for.

**Recommendation: use stubs for every move or merge that has a citation from code, a skill, CLAUDE.md or archive/, and delete outright only the documents with no citation outside plans/ and research/.**

## Part 1: merges, by subject

Each group lists its members, what a merge would break, and a recommendation. "Breaks" means citations of the files that would stop existing, so the file the others merge INTO breaks nothing. The counts are files, not lines.

### 1.1 The routing lineage: do not merge

`plan-patchbay.md`, `plan-route-core.md`, `plan-routing-migration.md`, `plan-universal-routing.md`, `plan-routing-time.md`. They are one lineage (model, core, migration, registry, time), and each extends the one before it.

- What a merge breaks: **plan-routing-migration 60 files** (26 in public; in demo/ it is cited by `bay.mjs`, `graph-registry.mjs`, `wire.mjs`, `midi-graph.mjs`, `openers.mjs`, five test files, `fake-board.mjs`, `verify.mjs`, and the circuit, collide, twelve, nola, muta, fau, away, dump, evo and partitur pages). Also **plan-universal-routing 30** (`rig/board/board.mjs`, `beat.mjs`, `test.mjs`, `graph-registry.mjs`, `bay.mjs`, `midi-kinds.mjs`), **plan-routing-time 27** (`timebase.mjs`, `link-options.mjs`, `bay-node.mjs`, four /sync/ files), **plan-patchbay 23** (`bay.mjs`, `graph-registry.mjs`, `midi-node.mjs`, `workers/wish/src/wish.mjs`), and **plan-route-core 21** (`route-core.mjs`, `midi-kinds.mjs`, `rig/route-core/route_core.h`, `rig/pico/firmware/midi_parse.h`).
- Statuses: patchbay and route-core are done; migration, universal and routing-time are partly done.
- **Recommendation: leave all five where they are.** They are the most cited documents in the repository, and their statuses differ. `plans/README.md` already puts them side by side.

### 1.2 The /stage/ plans: merge the two overruled ones into a history section, or leave them

`plan-stage-live.md` (done), `plan-stage-hls-webrtc.md` (done), `plan-stage-hls-record.md` (overruled), `plan-stage-patchbay.md` (overruled, shelved). One page, written 18 September to 5 October.

- What it breaks: stage-hls-record has 4 files (`HANDOFF.md`, `demo/stage/index.html`, `plan-stage-patchbay.md`). stage-patchbay has 10 (`demo/partitur/wall.mjs`, `demo/partitur/score.mjs`, `demo/shell/bay.mjs`, `HANDOFF.md`, `plan-flipper-patchbay`, `plan-node-kind`, `plan-routing-migration`).
- **Recommendation: move stage-hls-record and stage-patchbay to `archive/plans/` with stubs (see Part 2). Do not merge.** stage-patchbay is cited from live code as the reason for a design.

### 1.3 Nodes: already resolved by the statuses

`plan-nodes.md` (superseded by `plan-nodes-revisited.md`), `plan-nodes-revisited.md` (partly done), `plan-node-kind.md` (open, waits on the owner).

- What it breaks: plan-nodes has 6 files (`rig/board/jack.mjs`, `BACKLOG.md`, `plan-synth-patch`, `plan-nodes-revisited`, `plan-midi2`, `plan-routing-migration`).
- **Recommendation: move plan-nodes to `archive/plans/` with a stub. Keep node-kind separate, because it is an open question for the owner, not history.**

### 1.4 The looper: one stub, the rest separate

`plan-looper.md` (superseded by `plan-remote-looper.md`), `plan-remote-looper.md` (open), `plan-loop-ui.md` (open; 050 Loop clock was built and then removed 2026-10-12, and 060 and 070 were never built), `plan-looper-accuracy.md` (done), `plan-sustain-pedal.md` (done) and `research/sustain-pedal-pressing-2026-10-11.md`.

- What it breaks: **plan-looper 14 files**, nearly all in `proto/looper/` and `proto/jam/`, plus `SUMMARY.md` and `workers/jam/RETIRED.md`. plan-sustain-pedal has 7 (`demo/code/piano/index.html`, `archive/concepts/sampler-015.md`). plan-looper-accuracy has 7 (`demo/code/piano/index.html`).
- **Recommendation: move plan-looper to `archive/plans/` with a stub. Leave the rest.** The sustain pedal plan already calls itself the short form of the research's section 5, so merging the two would remove a document the piano page cites and add nothing.

### 1.5 Tempo, key and beat: merge the two key plans only

`plan-key-detection.md` (done), `plan-key-detection-2.md` (open: the 1 kHz band waits on the owner's listening test), `plan-tempo-key-improve.md` (partly done), `plan-beat-detection.md` (partly done), `research/beat-tracking-2026-10-11.md`, `research/tempo-key-eval-2026-10-12.md`.

- What it breaks: plan-key-detection-2 is cited by `BACKLOG.md` only (1 file). plan-key-detection has 4 (`BACKLOG.md`, `HANDOFF.md`, `research/tempo-key-eval`, `plan-key-detection-2`). plan-tempo-key-improve has 9 (`demo/radio/tempo.mjs`, `demo/radio/tempo/index.html`, `demo/radio/live/index.html`).
- **Recommendation: append plan-key-detection-2 to plan-key-detection as a section "Second pass, 2026-10-12", and leave a stub.** That is one BACKLOG line to rewrite. Leave the tempo and beat documents alone: they are cited by the radio pages.

### 1.6 The archived radio demo: merge into plan-radio.md

`plan-radio.md`, `plan-radio-patches.md`, `plan-radio-sound.md` (all done, and the demo is now `demo/archive/radio/`, still served), plus `plan-grain-presets.md` (done). `plan-radio-messages.md` (open) is a different subject.

- What it breaks: patches has 3 files and sound has 4, all `demo/archive/radio/index.html` (and its public copy), `plan-board-modulation` and `plan-radio-patches`.
- **Recommendation: merge patches and sound into plan-radio as two sections, with stubs.** Do not rewrite the comment in `demo/archive/radio/index.html`, because that page is archived; the stub carries the citation. It is low value: three files become one plus two stubs.

### 1.7 Held in Human: merge the three readings

`plan-held-in-human-score.md` (done), `plan-held-in-human-2d.md` (done), `plan-held-in-human-3d.md` (open), and `research/held-in-human-score-2026-09-19.txt` (the verbatim score, which never merges).

- What it breaks: 2d is cited by `demo/held/index.html` (1 file plus its public copy). 3d is cited by plan-2d only. The score plan has 8 files, including `demo/resources/build-held-in-human.mjs` and `held-in-human.json`.
- **Recommendation: merge 2d and 3d into plan-held-in-human-score.md as parts 2 and 3, with stubs, and rewrite the one comment in `demo/held/index.html`.** This is the cleanest merge on the list: one piece, three readings, each pointing at the others.

### 1.8 XR: leave it

`plan-xr.md` (retired), `plan-xr-room.md` (done), `plan-xr-hands.md` (done), `plan-xr-together.md` (open), and `research/quest-xr-2026-09.md`.

- What it breaks: plan-xr has 7 files (5 of them plans, plus `research/quest-xr` and `archive/videoradio-xr/plan-videoradio-xr.md`). plan-xr-room has 9 (`demo/shell/xr-panel.mjs`, `panel.mjs`, `demo/mirror/index.html`).
- **Recommendation: move plan-xr to `archive/plans/` with a stub, and leave the others.** Merging a done, a done and an open plan hides which part is still open.

### 1.9 Circuit: two small merges at most

Plans: `plan-circuit-editor.md`, `plan-circuit-synth-editor.md`, `plan-circuit-model12.md`, `plan-device-layouts.md`, `plan-circuit-patches.md`, `plan-circuit-samples.md`, `plan-pack-page.md`. Research: `circuit-session-format`, `circuit-session-notes`, `circuit-archive`, `circuit-soundbank` (all 2026-09-21), `dump-samples-2026-09-21`. All are done.

- What it breaks: circuit-synth-editor has 4 files (`demo/shape/index.html`, `demo/shell/circuit-patch.mjs`). circuit-editor has 18. circuit-patches has 6 and **is cited by CLAUDE.md** as the backup procedure. circuit-soundbank has 11 and **is cited by CLAUDE.md** as the record of the inference about `Send to Circuit`. circuit-session-format has 7 and session-notes has 11 (`circuit-session.mjs`, `note-grid.mjs`, `shell.css`, `demo/pack/index.html`).
- **Recommendation: merge plan-circuit-synth-editor into plan-circuit-editor (same day, same subject, both feeding /shape/), with a stub and two comment rewrites. Leave everything else.** The Circuit documents carry the safety rules about the owner's sessions, and CLAUDE.md points into two of them by name. That is reason enough not to touch them.

### 1.10 Pico and the Pi screen: leave it

`plan-pico.md` (partly done), `plan-sampler-pi-pico.md` (partly done), `plan-pi-oled.md` (open, waits on a module not yet bought), and research `pico-open-issues-and-modular-2026-10-04`, `pico-synths-and-cv-2026-10-04`, `pi-screens-estonia-2026-10-04`.

- What it breaks: plan-sampler-pi-pico has 10 files (`rig/board/board.mjs`, `scsampler.mjs`, `jacksynth.mjs`, `demo/remote/piano/index.html`). plan-pi-oled has 1 (`BACKLOG.md`).
- **Recommendation: leave it.** Two of the three plans are partly done and one is open. A merge now would bury the open part.

### 1.11 Panels: merge, cheaply

`plan-panel-component.md` and `plan-panel-layouts.md`, both done: the layout code and the device arrangements it draws.

- What it breaks: panel-component has 2 files (`demo/kit/devices/index.html` and its public copy).
- **Recommendation: merge panel-component into panel-layouts, with a stub and one comment rewrite.** Optional.

### 1.12 The board granulator and the Pi box: move, do not merge

`plan-board-modulation.md` and `plan-board-pappus.md` (both retired). `plan-instrument.md` (retired) and `plan-hardware.md` (done).

- **Recommendation: move the three retired ones (see Part 2). Leave plan-hardware**, which has 14 citations including `rig/board/README.md`.

### 1.13 Research merges

| group | members | what a merge breaks | recommendation |
| --- | --- | --- | --- |
| Timeline prior art | `timeline-prior-art-2026-08`, `timeline-art-prior-art`, `timeline-own-prior-art-2026-08` | own-prior-art has **20 files** (`timeline/transport.mjs`, `timeline/strip.mjs`, `demo/shell/pointer-adapter.mjs`, `text-adapter.mjs`, `proto/*`, owner memory). The other two have 3 each, all research files | Fold `timeline-prior-art` (3 KB) and `timeline-art-prior-art` (5 KB) into own-prior-art as sections, with stubs. Do not move own-prior-art |
| Browser AV editors | `browser-av-editors-2026-08`, `browser-av-editors-wide-2026-08` | wide has 3 (`timeline/score.mjs`, `timeline/lab/NOTES.md`); the first has 5 (`timeline/lab/*`) | Leave. Together they are 185 KB, and wide corrects the first's verdict in its section 10. A merge adds length, not clarity |
| Kurenniemi chain | `kurenniemi-archive-2026-08`, `kurenniemi-sources-2026-09`, `kurenniemi-audio-hunt-2026-09`, `ojanen-ekis-notes`, `corpus-from-thesis-2026-09` | audio-hunt has 0; sources has 4 (`PROGRESS.md` and research files); archive has 6 (`archive/demos/talk-index.html`, `plan-slides`); corpus-from-thesis has 5 (`demo/resources/corpus.json`, `build-corpus.mjs`) | Fold `kurenniemi-audio-hunt` into `kurenniemi-sources` (0 citations, so a stub is optional). Leave the rest; each one corrects the one before, and the corrections are the record. `ojanen-ekis-thesis.md` (815 KB, a source text) never merges |
| ERR archive | `err-archives-2026-08`, `err-remixer-2026-08` (retired), `err-stage-theatre-2026-09-18` | remixer has 4 (`archive/megatimeline/server.mjs`, `archive/remixer/NOTES.md`, two plans); stage-theatre has 1 (`BACKLOG.md`); err-archives has 14 including `.claude/skills/positron-streaming/SKILL.md`, `workers/view/src/index.js` and owner memory | Leave err-archives. Remixer: stub-move to `archive/plans/` (Part 2). Stage-theatre: leave, it is its own question |
| Cloudflare Containers | `cf-containers-2026-08`, `cf-containers-next-2026-10-07` | first has 8 (`demo/shell/moq.mjs`, `rig/obs-*/NOTES.md`); next has 4 (`workers/pub/wrangler.jsonc`, `workers/pub/worker.mjs`) | Leave. Both are cited from code, and next re-measures the first on purpose |
| Chords | `chord-learning-2026-09-23`, `chord-suggester-benchmark-2026-09-23` | 18 and 8 files, mostly `demo/shell/` and `demo/resources/` | Leave. Both are heavily cited |
| Compose strands | `cascade-cures`, `glued-containers`, `layout-systems`, `ui-corrections-taxonomy` (all 2026-09-26) | three of the four are cited by `.claude/skills/positron-compose/SKILL.md`, which another agent is rewriting today | **Do not touch while the skills rewrite is in flight.** Leave afterwards too: the skill is their consolidation |
| SynthDef size | `synthdef-size-limit-2026-09`, `scsynth-wasm-official-2026-09` (+ `supercollider-browser-2026-09`) | 8 and 9 files, including `demo/shell/synthdef.mjs`, `sclang-lite.mjs`, `rig/board/norns/Engine_Pappus.sc`, `LESSONS.md` | Leave |
| U: | `uuu-integration-2026-09`, `uuu-positron` | 8 each, including `timeline/csound.mjs`, `demo/csound/score.mjs`, `LESSONS.md` and `.claude/skills/positron-history/SKILL.md` | Leave |
| Radio Tallinn 1965 | `radio1965-app-2026-09`, `radio1965-server-2026-09-15`, `radio-tallinn-1965-2026-08` | app 0, server 0, tallinn 2 (`archive/demos/talk-index.html`, `plan-slides`) | Merge app and server into one `radio1965-2026-09.md` (no citations, no stubs needed). Leave tallinn, which is cited from the archive |
| Evo keyboard | `evo-mk425c-face-2026-09-21`, `evo-cc-smoothing-2026-09-23` | smoothing has 0; face has 9 (`demo/evo`, `pedal.mjs`, `instruments.mjs`) | Fold smoothing (5 KB) into face as a section. No citation breaks |
| Pico pair | `pico-open-issues-and-modular-2026-10-04`, `pico-synths-and-cv-2026-10-04` | 3 each (`BACKLOG.md`, `HANDOFF.md`, `plan-pico`, `plan-sampler-pi-pico`) | Leave. Both are partly done on different halves |

## Part 2: moves to `archive/plans/`

`archive/plans/` already exists and holds one file (`looper-local-relay.mjs`). These are the documents whose status is retired, overruled or superseded, with what a move breaks. Paths inside a moved file that start `plans/` keep resolving from the repository root, so a move breaks citations OF the file, never citations IN it.

### Safe to move: no citation from code, a skill, CLAUDE.md or archive/

| document | status | citations (all of them) |
| --- | --- | --- |
| `plan-station.md` | retired | none |
| `plan-session.md` | retired | `plan-m2m.md` |
| `plan-vain-upload.md` | retired | `research/station-one-source-2026-09.md` |
| `plan-isolated-deploys.md` | overruled | `BACKLOG.md` |
| `plan-instrument.md` | retired | `plan-remote-looper.md`, `plan-hardware.md` |
| `plan-glass.md` | retired | `PROGRESS.md`, `plan-take.md` |
| `plan-board-modulation.md` | retired | `plan-audio-shader.md`, `plan-pi-oled.md`, `plan-midi2.md` |
| `plan-voice.md` | superseded by /wish/ | `research/quest-xr-2026-09.md`, `plan-camera.md`, `plan-pico.md` |
| `plan-flipper-patchbay.md` | overruled | `BACKLOG.md`, `HANDOFF.md`, `research/free-live-tv-sources-2026-10-05.md`, `plan-routing-migration.md` |
| `research/free-live-tv-sources-2026-10-05.md` | retired | `HANDOFF.md`, `BACKLOG.md` |

Each of these would cost rewriting one to four lines, all in standing files or other plans. A stub makes even that unnecessary.

### Movable only with a stub: cited from code, a skill, archive/ or proto/

| document | status | what cites it |
| --- | --- | --- |
| `plan-board-pappus.md` | retired | `rig/board/README.md` |
| `plan-names.md` | overruled | `archive/videoradio-xr/plan-videoradio-xr.md`, `plan-radio-messages.md` |
| `plan-patch.md` | retired | `research/supercollider-browser`, `plan-nodes-revisited`, `plan-routing-migration` |
| `plan-megatimeline.md` | retired | `SUMMARY.md`, `archive/megatimeline/NOTES.md` |
| `plan-demos.md` | superseded by the concepts front page | `workers/view/build.mjs`, `plan-flipper-patchbay` |
| `plan-rack.md` | retired | `demo/manifest.mjs`, `archive/demos/README.md`, `plan-circuit-model12` |
| `plan-jam.md` | retired | `rig/peer.mjs`, four plans |
| `plan-controller.md` | retired | `archive/yoshimi/cc-test.mjs`, `archive/demos/knobs-index.html`, five plans |
| `plan-xr.md` | retired | `archive/videoradio-xr/plan-videoradio-xr.md`, `research/quest-xr`, five XR plans |
| `plan-nodes.md` | superseded | `rig/board/jack.mjs`, `BACKLOG.md`, four plans |
| `plan-studio.md` | retired | `studio/engine.mjs`, `demo/manifest.mjs`, `proto/centralrec/NOTES.md`, `SUMMARY.md`, `plan-timeline` |
| `plan-m2m.md` | retired | `workers/rtc/NOTES.md`, `SUMMARY.md`, `PROGRESS.md`, four documents |
| `plan-live-timeline.md` | retired | `demo/fake-err.mjs`, `demo/slides/index.html`, three `archive/demos/` pages, three plans |
| `plan-twins.md` | retired | `demo/shell/source.mjs`, `source-args.mjs`, `archive/shell/granular-worklet.js`, `archive/demos/grains-index.html`, `rig/board/norns/PosSource.sc`, `CHAIN.md`, `plan-patch` |
| `plan-looper.md` | superseded | six `proto/looper/` files, `proto/jam/jam-core.js`, `workers/jam/RETIRED.md`, `SUMMARY.md`, two plans |
| `plan-stage-hls-record.md` | overruled | `demo/stage/index.html`, `HANDOFF.md`, `plan-stage-patchbay` |
| `plan-stage-patchbay.md` | overruled | `demo/partitur/wall.mjs`, `score.mjs`, `demo/shell/bay.mjs`, `HANDOFF.md`, three plans |
| `plan-cam-llhls.md` | retired | `demo/video/llhls/index.html`, `demo/shell/live.mjs`, `demo/cam/index.html`, `workers/pub/worker.mjs`, `workers/pub/container/server.mjs`, `HANDOFF.md`, `BACKLOG.md` |
| `research/err-remixer-2026-08.md` | retired | `archive/megatimeline/server.mjs`, `archive/remixer/NOTES.md`, two plans |
| `research/scsynth-live-input-2026-09.md` | retired | `demo/archive/radio/index.html`, `plan-radio` |
| `research/yoshimi-wasm-2026-10-13.md` | retired | `.claude/skills/positron-hardware/SKILL.md`, `archive/yoshimi/README.md`, `research/tools/yoshimi-wasm/README.md`, `BACKLOG.md`, `plan-retire-yoshimi` |

⚠️ **`plan-cam-llhls.md` should not move at all.** Its status is retired because /cam/'s RTMPS leg is gone, but the same publish lives on as https://positron.studio/video/llhls/, whose page and `workers/pub/worker.mjs` cite it as the design. It is a retired name on a live mechanism.

⚠️ **`research/yoshimi-wasm-2026-10-13.md` should wait** until the skills rewrite that is in flight today has finished, because `positron-hardware` cites it.

## What I recommend, in order

1. **Keep the statuses and the two indexes, and stop there for most of it.** They answer "is this done?", which was the real cost of 199 documents. Most of the merges above save little and break real citations.
2. **Do the merges that break nothing or almost nothing:** radio1965 app with server (0 citations), evo-cc-smoothing into evo-mk425c-face (0), kurenniemi-audio-hunt into kurenniemi-sources (0), the two small timeline prior-art files into own-prior-art (research-only citations), and Held in Human 2d and 3d into the score plan (one code comment).
3. **Move the ten safe documents to `archive/plans/`**, each with a stub at its old path. A stub costs one tiny file and keeps BACKLOG, HANDOFF and PROGRESS readable without rewriting them.
4. **Leave the other moves for now.** With stubs they would be safe, but each one leaves a stub behind, so the folder gets no shorter. The index already says which documents are history.
5. **Never move or merge without the index updating in the same change**, and do it in one commit made by the session, not by an agent. Use `git mv` only when no other agent holds staged work, and commit path-limited.

## What I could not settle

- **Whether "archived but still served" should read as done or retired.** I chose done, with the archive named in the evidence. That is about 15 plans (reel, held, shape, pack, tom, time, sync, draw, nola, the radio set, tutorial-layout). If the owner reads `/archive/` as retired, those rows flip, and they become move candidates as well.
- **The reference counts match on file names**, so they miss a citation written as a bare slug ("the patchbay plan") and would count a name that happens to match. They are a floor, not an exact figure.
- **`plan-code-review-2026-10-14.md` and `research/ui-video-capture-2026-10-14.md`** were written today by other agents. The first is not marked or indexed. The second is in the research index as open, but its file has no status line, because it was not in my list when the marking ran.
