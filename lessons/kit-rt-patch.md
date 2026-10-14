# Kit lessons: rt-patch.mjs

The long comments cut from `demo/shell/rt-patch.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-rt-patch.md#<anchor>`.

<a id="header"></a>

## rt-patch.mjs, file header

demo/shell/rt-patch.mjs: the runtime of a `patch` node on /connect/
(node-runtime.mjs). Its face is the kit picker; a pick leaves on
patch:midi-out as one program change, which is how every instrument on this
desk is switched. 64 programs, 0 to 63, the most the Circuit's gate lets
through. A name read back from an instrument is that instrument page's.
