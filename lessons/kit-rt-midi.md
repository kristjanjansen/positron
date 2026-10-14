# Kit lessons: rt-midi.mjs

The long comments cut from `demo/shell/rt-midi.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-rt-midi.md#<anchor>`.

<a id="header"></a>

## rt-midi.mjs, file header

demo/shell/rt-midi.mjs: the runtime of a `midi` node on /connect/
(node-runtime.mjs): every MIDI keyboard plugged into this machine, through the
kit's midi-devices.mjs, as the one `web:midi` box. Its face is a button that
asks the browser for MIDI, and the names of what is plugged in.

🔴 THE PERMISSION IS ASKED ONLY ON A PERSON'S PRESS OF THAT BUTTON, never on a
link or a visit. midi-devices.mjs keeps its device nodes on a bay of this
runtime's own, so the inputs it finds are not new boxes on the page; their
notes leave on web:midi:midi-out.
