# Kit lessons: note-recorder.mjs

The long comments cut from `demo/shell/note-recorder.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-note-recorder.md#<anchor>`.

<a id="header"></a>

## note-recorder.mjs, file header

demo/shell/note-recorder.mjs: /synth/recorder/'s recorder, notes in and the
same notes played back out at the times they came, with its Record and Play
and its table of what was taken. Lifted 2026-10-14 from that page for
/connect/ (plans/plan-connect-ui.md, the convergence rule). /synth/timeline/,
/synth/dots/ and /room/words/ still carry their own copy.

A page hands it `send(ev)`, where a played note goes (its rec:midi-out), and
`onStop()`, what a stop does besides (silence its synth); it calls `take(e)`
with every note that reaches its rec:midi-in.
