# Kit lessons: synth-params.mjs

The long comments cut from `demo/shell/synth-params.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-synth-params.md#<anchor>`.

<a id="header"></a>

## synth-params.mjs, file header

demo/shell/synth-params.mjs: the parameters a synth voice takes, as knobs.
Split 2026-10-14 out of demo/synth/patch-synth.mjs (plans/plan-connect-ui.md
slice 2): only what the /connect/ synth's five parameters need, the pitch
arithmetic, the exponential knob travel and the readings. patch-synth.mjs
still holds its own copy until it moves onto this file (the page-move list
at the end of the plan).

Pure and import free, so node-runtime.mjs and its test can read the names.
