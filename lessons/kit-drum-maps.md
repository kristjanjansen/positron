# Kit lessons: drum maps

<a id="header"></a>

## `drum-maps.mjs` header

General MIDI drum notes, and each drum instrument's own notes keyed by them (`plans/plan-pi-sequencer.md` §3.4). Import free on purpose: `rig/board` imports it directly so `push.sh` ships it, and `graph-registry.mjs` is handed it rather than importing it. `GM_VOICES` must carry the same notes as `demo/drums/voices.mjs` `NOTE`; `rig/board/sequencer-test.mjs` asserts it, so the two tables cannot drift.

<a id="circuit"></a>

## the Circuit's map

| GM voice | GM note | Circuit slot | Circuit note | label |
| --- | --- | --- | --- | --- |
| kick | 36 | drum 1 | 60 | notes DOCUMENTED, pairing INFERRED |
| snare | 38 | drum 2 | 62 | as above |
| closed hat | 42 | drum 3 | 64 | as above |
| open hat | 46 | drum 4 | 65 | 65 DOCUMENTED only, never measured on this desk |

The Circuit's four drums are one MIDI track on channel 10 (DOCUMENTED, `plans/plan-circuit-model12.md` §3.1). 60, 62 and 64 were MEASURED off its own pads on 2026-09-20 (`research/measured-devices-2026-09-20.md:174`); 65 was not hit in that capture. The gaps are +2, +2, +1: anybody writing 66 for the fourth gets a silent drum. A Circuit drum is a SLOT, not a kick: which sound is in it is whatever the loaded session says, and the board's gate refuses the drum patch CCs (8, 18, 44, 50 on channel 10), so the pairing is a default the owner confirms by ear.
