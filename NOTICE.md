# What the MIT licence does not cover

`LICENSE` is MIT and it covers the code written here. It does not cover
everything in this repository, and this file is the index of what it does not.

🔴 **NOTHING HERE IS NEW WORK.** Every third-party thing in this tree already
arrived with its own `LICENSE-*` file beside it, written when it was vendored.
**Those files are the authority and this one is a table of contents.** If a
line here disagrees with the file it points at, the file wins.

## The one that constrains the whole site

🔴 **TWO PAGES ARE AGPL-3.0-or-later AND SERVING THEM IS THE TRIGGER.**
`demo/grains/` and `demo/patch/` run scsynth (GPL-3.0-or-later) on Sam Aaron's
SuperSonic clockwork (AGPL-3.0-or-later), so the combined work is
AGPL-3.0-or-later. Both pages have said so in their own source since they were
written. **AGPL is the licence where running it over a network counts as
distributing it**, and positron.studio serves it, so the obligation to offer the
source was already live while this repository was private. Publishing it is what
satisfies that, rather than what creates it.

| what | where | licence text |
| --- | --- | --- |
| scsynth WebAssembly build | `demo/patch/vendor/scsynth-nrt.wasm` | `demo/patch/vendor/LICENSE-supersonic-scsynth` |
| SuperSonic core | the same directory | `LICENSE-supersonic-scsynth-core` |
| SuperSonic synthdefs | the same directory | `LICENSE-supersonic-scsynth-synthdefs` (MIT) |
| the shell's copy | `demo/shell/vendor/` | `LICENSE-supersonic-scsynth`, `-core` |

## Everything else that came from somewhere else

| what | where | licence text |
| --- | --- | --- |
| Faust compiler, WebAssembly | `demo/fau/vendor/libfaust-wasm.wasm` | `demo/fau/vendor/LICENSE-faustwasm` (GNU Lesser) |
| Mutable Instruments Plaits DSP | `demo/muta/vendor/plai.wasm` | `demo/muta/vendor/LICENSE-plaits` |
| Mutable Instruments Warps DSP | `demo/muta/vendor/warp.wasm` | `demo/muta/vendor/LICENSE-warps` |
| Jeff Learman's jRhodes3d, his own 1977 Rhodes Mark I Stage 73 | 99 files under `demo/nola/` | `demo/nola/LICENSE-jrhodes3d` |
| Bravura music font | `demo/shell/vendor/` | `LICENSE-bravura` (SIL Open Font License) |
| Gabarito typeface | `demo/weight/vendor/` | `LICENSE-gabarito` (SIL Open Font License) |
| WebXR input profiles | `demo/shell/vendor/` | `LICENSE-webxr-input-profiles` (MIT) |
| chord transition tables | `demo/resources/chord-tables.json` | `demo/resources/LICENSE-chord-tables` |
| two Csound scores, from `tarmoj/vclick` | used by `demo/click/` | GPL-3.0, attributed in `demo/click/index.html` |
| hls.js 1.7.1, unmodified | `proto/remixer/hls.min.js` and `proto/flipper/hls.min.js`, byte identical | Apache-2.0, [video-dev/hls.js](https://github.com/video-dev/hls.js) |

## Recordings, films and archive material

🔴 **NOT MINE TO LICENCE, AND NOT LICENSED HERE.** The recordings, films,
photographs and archive metadata this site plays belong to the institutions and
people who made them: among others MIMproject, Yle, AV-arkki, the Finnish
National Gallery, the National Library of Finland, and the Estonian public
broadcaster. **Every row carries its holder** in `demo/resources/corpus.json`
and in the tables the resources pages draw from it. Reuse is a question for the
holder, not for me, and the MIT grant above does not reach it.

⚠️ **AND THE PAGES THAT PLAY A BROADCASTER'S LIVE STREAM ARE NOT AN INVITATION
TO RUN THEM.** Every connection made to one of those mounts lands in that
broadcaster's audience figures. `AGENTS.md` and `CLAUDE.md` both carry the rule
and name the local stand-ins that cost nobody anything.

## What was checked, and what was not

✅ **CHECKED 2026-09-24**: that every `LICENSE-*` file listed above exists in the
tree, and that the two AGPL pages declare it in their own source.
⚠️ **NOT CHECKED**: whether each vendored licence has been read end to end
against how the thing is used here. They were read when each was vendored and
they have not been re-read for this file. **Read the file beside the code before
relying on a row in this table**, which is the same rule this repository applies
to every other number it writes down.
