# Kit lessons: rt-drums.mjs

The long comments cut from `demo/shell/rt-drums.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-rt-drums.md#<anchor>`.

<a id="header"></a>

## rt-drums.mjs, file header

demo/shell/rt-drums.mjs: the one drum machine (drums/drum-machine.mjs) that
the `sequencer` and `drum` runtimes of one /connect/ bay share. The machine
is /drums/machine/'s, its four SuperCollider voices in the page's one
context; the sequencer's notes leave on /connect/'s own sequencer:midi-out
(`sequence`), and what arrives on drum:midi-in is played by the voices
(`api.play`), so the link between the two boxes is what carries every hit.
Kept for the bay's life once made: a second scsynth for a relink would be a
second engine for the same four drums.
