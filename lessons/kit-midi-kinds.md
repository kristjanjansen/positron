# Kit lessons: midi-kinds.mjs

The long comments cut from `demo/shell/midi-kinds.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-midi-kinds.md#<anchor>`.

<a id="header"></a>

## midi-kinds.mjs, file header

demo/shell/midi-kinds.mjs — the one list of MIDI message kinds.

🔴 THREE LISTS DISAGREED UNTIL 2026-10-03, AND THIS IS STEP 0 OF BOTH
`plans/plan-route-core.md` AND `plans/plan-universal-routing.md`.
`bay.mjs` said `bend` and `touch` and had no `transport`; `rig/board/alsa.mjs`
said `pitchbend` and `aftertouch` and had one; `rig/board/inputs.mjs` named
its refusals in neither. A patch written against one was refused by another
for a spelling, which reads as a broken link rather than a vocabulary.

⚠️ PURE AND IMPORT FREE ON PURPOSE. `rig/board/push.sh` ships only the
`../../demo/shell/` files a `rig/board/*.mjs` imports DIRECTLY, and does not
follow imports of imports, so this file must never import anything.

<a id="kinds"></a>

## midi-kinds.mjs, KINDS

Every kind a port may accept or refuse, and a link may carry.
⚠️ `sysex` IS HERE SO THAT IT CAN BE REFUSED BY NAME.
⚠️ `clock` AND `transport` ARE TWO KINDS. A port that wants tempo and not
somebody else's start and stop is an ordinary request, and one kind could
not say it.

<a id="kind-of"></a>

## midi-kinds.mjs, kindOf

The kind of a raw message, from its status byte, or 'other'.
Running status is not handled: a message here always carries its status.
⚠️ NOTE OFF IS A NOTE, and so is a note on at velocity 0.
