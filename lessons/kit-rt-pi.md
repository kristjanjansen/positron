# Kit lessons: rt-pi.mjs

The long comments cut from `demo/shell/rt-pi.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-rt-pi.md#<anchor>`.

<a id="header"></a>

## rt-pi.mjs, file header

demo/shell/rt-pi.mjs: the runtime of a Raspberry Pi node on /connect/
(node-runtime.mjs SITES). Its face is the board's presence badge and a Join
button, the way /remote/circuit/ and /remote/piano/ reach the Pi (board.mjs).

🔴 NOTHING JOINS BEFORE THAT PRESS. A link to a pi-1 port opens nothing; Join
opens the room, asks the board, holds the lease, and puts the board's sound
into the page's one context. The room is `roomFor({ slug: 'connect' })`:
`?room=` when given, a private `connect-test-<6>` under a check, and the
studio's own `studio-1` only for a person on a visit.
