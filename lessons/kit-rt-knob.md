# Kit lessons: rt-knob.mjs

The long comments cut from `demo/shell/rt-knob.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-rt-knob.md#<anchor>`.

<a id="header"></a>

## rt-knob.mjs, file header

demo/shell/rt-knob.mjs: the runtime of one knob on /connect/
(node-runtime.mjs). One node per parameter, `web:knob-<name>` (decision D2),
a turn leaving on its value-out as `{ of: 'param', name, v }`. The dial's
travel and reading are synth-params.mjs's when the name is one of its.
