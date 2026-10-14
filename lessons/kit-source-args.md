# Kit lessons: source-args.mjs

The long comments cut from `demo/shell/source-args.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-source-args.md#<anchor>`.

<a id="header"></a>

## source-args.mjs, file header

demo/shell/source-args.mjs — one spec, turned into the numbers `PosSource`
wants, in ONE place for the two machines that now run that definition.

🔴 WHY IT MOVED HERE. This was `sourceArgs()` in `rig/board/pappus.mjs`, where
it was fine while the board was the only end running `PosSource.sc`. It is
not any more: `/grains/` loads the SAME compiled definition into wasm
scsynth in the tab, so the browser has to build the same amplitude table,
the same semitone array and the same three scalars. Reimplementing that in
the page would be two authorities on one number — which is the mistake
`plans/plan-twins.md` is about, one level down, and the reason `partialsOf` is
shared rather than copied.

⚠️ IT IS THE EXPANSION AND NOTHING ELSE. No engine, no wire, no OSC. The two
callers differ only in how they deliver it: the box sends `/pos/table` and
`/pos/set` to sclang, the page sends `/b_gen sine1` and `/n_set` to its own
scsynth. Both get the numbers from here.

<a id="source-sizes"></a>

## source-args.mjs, SOURCE_VOICES, SOURCE_PARTIALS

⚠️ THE DEF'S ARRAY SIZES, AND THEY ARE STRUCTURAL. A SynthDef's control array
is fixed when the def is built (`PosSource.sc`, `maxVoices` / `maxPartials`),
so these are not limits chosen here — they are a fact about the compiled
graph, mirrored. `setn` past the end of a control array is not an error in
scsynth, it writes into whatever control comes next, so a spec that does not
fit is REFUSED by name rather than truncated into a different sound.

<a id="source-args"></a>

## source-args.mjs, sourceArgs

The spec, as the numbers `PosSource` wants.

🔴 ONE SHARED TABLE, AND THE REFUSAL IS THE POINT. `partialsOf` normalises
across the partials that SURVIVE Nyquist, so if it drops any, two voices no
longer share one amplitude table and a single 24-entry control cannot
describe the sound. That is refused here with the count in words, rather than
sent anyway — a board rendering a quietly different spectrum from the page is
precisely the confound this whole path exists to remove, and it would show up
as "the comparison is noisy".

<a id="no-level-shape"></a>

## source-args.mjs, sourceArgs, no level and no shape

⚠️ NO `level` AND NO `shape`. The table carries the level — `partialsOf`
normalised it — and scaling again in the def would be a second authority
on one number. `shape` is not a control at all: the engine renders a
table, and a waveform NAME cannot cross to a different engine without
meaning two different sounds (PosSource.sc's header).
