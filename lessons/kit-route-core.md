# Kit lessons: route-core.mjs, route-core-test.mjs

The long comments cut from `demo/shell/route-core.mjs` and `demo/shell/route-core-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-route-core.md#<anchor>`.

<a id="header"></a>

## route-core.mjs, file header

demo/shell/route-core.mjs: the routing core, L0 of `plans/plan-route-core.md`.

A table of ports and links, a closed list of ops, and a gate at the
destination. It knows nothing about any instrument, any input method or any
computer, and it is written so that a C port can be a line by line copy:
integers only, no strings on the hot path beyond the op name lookup, no
clock of its own, and no feedback of what it writes back into its inputs.

🔴 THE CONTRACT IS `demo/shell/route-vectors/*.json`, NOT THIS FILE. Every
expected output in there was derived by hand, and `route-core-test.mjs` runs
them. A behaviour that is not in a vector is not a promise, and a second
implementation that passes the vectors and disagrees with this file on
something else has found a missing vector, not a bug in itself.

⚠️ `bay.mjs` STAYS THE VALIDATOR IN FRONT OF THIS. It refuses with a reason
and a fix in words; this refuses with a short code, because a microcontroller
has no room for the words. The op names and arguments are bay's where the two
overlap (`channel`, `transpose`, `velocity`, `only`, `drop`, `range`,
`vrange`, `fixed`, `cc`), so a bay link's transforms are this core's ops
without translation. `scale`, `toggle`, `thin`, `curve`, `velcurve` and
`notecc` are the plan's §4 ops that bay does not have yet.

⚠️ TWO OPS CARRY STATE (`toggle`, `thin`) AND ONE READS TIME (`thin`), so the
core is a pure function of the event, the link AND that link's state. The
plan says "a pure function of the event and the link", which was true of
every op except the two it listed itself.

Imports only `midi-kinds.mjs`, which imports nothing, so `rig/board/push.sh`
can ship the pair by following direct imports.

<a id="default-verb"></a>

## route-core.mjs, `DEFAULT_VERB`

⚠️ THE DEFAULT FOR A PORT WITH NO PROFILE, from the plan's §6: allow for
everything except SysEx, which is confirm. A precaution, not a wall.

<a id="is-note-on"></a>

## route-core.mjs, `isNoteOn`

⚠️ A NOTE ON AT VELOCITY 0 IS A RELEASE, here and everywhere below.

<a id="wide"></a>

## route-core.mjs, `wide()`

A 7 bit point as a 14 bit bend value: p * 128, except 127, which is 16383.
⚠️ SO 64 IS THE BEND'S CENTRE 8192 AND 127 ITS TOP, and an identity table
leaves every bend exactly as it was (vector 24). Read as a plain p * 128, a
table's top would be 16256 and a bend at full could never get there.

<a id="op-velocity"></a>

## route-core.mjs, op `velocity`

Scale note on velocity. ⚠️ ONLY A NOTE ON: bay tests `d2 === 0`, so it
would scale an 8n note off's release velocity. Harmless, and different.
🔴 IN EXACT INTEGER THOUSANDTHS, NOT A FLOAT, as `route_core.c` does it.
`Math.round(45 * 0.7)` is 31, because the product is 31.499999999999996 in
a double, and the tie 31.5 rounds to 32. MEASURED 2026-10-03: 28 scales
from 0.001 to 4.000 disagreed with the C on a float tie, every one rounded
down here. Vector 20 holds two of them. A scale that is under half a
thousandth rounds to 0 and is refused, as the C refuses it.

<a id="op-scale"></a>

## route-core.mjs, op `scale`

A CC value from lo..hi onto lo2..hi2, clamped first, ties away from zero.
🔴 LO2 ABOVE HI2 INVERTS, AND THAT IS THE WHOLE REASON THERE ARE FOUR
ARGUMENTS. Only CC `cc` when it is given, every CC when it is not.
⚠️ NAMED `scale` AND NOT THE PLAN'S `range`, because `range` in bay is
already the note number filter, and one word meaning two ops in two files
is the vocabulary problem `midi-kinds.mjs` was written to end.

<a id="op-thin"></a>

## route-core.mjs, op `thin`

At most `hz` continuous values a second, one budget per link.
⚠️ MEASURED FROM THE LAST ONE KEPT, and in integers: `(t - kept) * hz >= 1000`.
⚠️ IT DROPS THE LAST VALUE OF A FAST SWEEP, which leaves the destination
short of where the knob stopped. A trailing send needs a tick, and the core
has no clock; that is an open question in the plan, not settled here.
🔴 A t EARLIER THAN THE LAST KEPT IS KEPT, AND THE BUDGET RESTARTS FROM IT
(vector 22). Until 2026-10-03 this file dropped it and the C kept it. Read
as "no time has passed" instead, a clock that restarts at 0 under a core
that does not would silence every knob on the link until the new clock
passed the old one, which could be hours. Kept, the worst case is one value
too many. The C's unsigned difference, there for its 49 day wrap, already
read it this way.

<a id="op-curve"></a>

## route-core.mjs, op `curve`

A CC, touch or bend value through `points`, a table of up to 16 `[in, out]`
pairs (vectors 23 and 24). `cls` narrows it to one of the three kinds and
`cc` to one CC number; with neither it curves all three.
⚠️ A BEND IS CURVED IN ITS OWN 14 BITS, with each point read through `wide`,
so a table drawn once in 0..127 serves a knob and a wheel alike.
⚠️ A CHANNEL TOUCH (Dn) CARRIES ITS PRESSURE IN THE SECOND BYTE, a poly touch
(An) in the third.
⚠️ THE TABLE IS COPIED WHEN THE LINK IS MADE, as `route_core.c` copies it
into its table store, so changing the authored array later changes nothing.

<a id="op-velcurve"></a>

## route-core.mjs, op `velcurve`

A note on's velocity through `points`, the same table and arithmetic as
`curve` (vector 25). 🔴 CLAMPED TO 1..127 AFTER, so a table that reaches 0
cannot turn a note on into a release. A release is left alone.

<a id="create-core"></a>

## route-core.mjs, `createCore()`, ports, links and events

A port: `{ id, dir: 'in'|'out'|'both', accepts?: [kind], policy?: {kind: verb},
rules?: [{ match: [byte|null], do: verb }] }`. A rule's match is a byte
prefix and `null` in it matches any byte. The first rule that matches wins
over the per kind policy, and only the first chunk of a SysEx is read.

A link: `{ id, from, to, ops: [{ op, ...args }] }`.
An event: `{ port, t, bytes }`. What comes out is `{ port, t, bytes, link }`.

<a id="policy-canon"></a>

## route-core.mjs, `addPort()`, policy keys

⚠️ A POLICY KEY GOES THROUGH `canonKind` TOO, so `{ pitchbend: 'deny' }`
denies bend (vector 21). It was read verbatim until 2026-10-03, and the
older spelling was silently ignored, which reads as a gate that works.

<a id="link-cycle"></a>

## route-core.mjs, `link()`, cycles

🔴 A LINK THAT CLOSES A LOOP IS REFUSED NOW, NOT FOUND LATER. A self
link is the smallest loop and `reaches(x, x)` says so at once.

<a id="rule-short"></a>

## route-core.mjs, `gate()`, a short first chunk

⚠️ A FIRST CHUNK SHORTER THAN THE RULE IS JUDGED ON WHAT IT HAS. A
head too short to read byte 6 matches the confirm rule rather than
slipping past it.

<a id="f7-chunk"></a>

## route-core.mjs, `feed()`, an F7 chunk

🔴 A CHUNK THAT IS ONLY F7, OR STARTS WITH ONE, IS THE OPEN STREAM'S LAST
CHUNK (vector 19). F7 is a status byte, so it reads as kind 'other', and
until 2026-10-03 such a chunk was dropped and left the stream open: the
terminator never reached anyone and the next stray data bytes were taken
as more of that stream. With no stream open it is still dropped.

<a id="unlink"></a>

## route-core.mjs, `unlink()`

Remove a link and release what it left sounding: a note off per held note
(channel then note ascending), then CC 123 on every channel it ever
delivered a note on. ⚠️ THE RELEASE SKIPS THE GATE ON PURPOSE. It is the
safety message, and a port that took the notes takes their release.

<a id="test-header"></a>

## route-core-test.mjs, file header, negative controls and sabotage runs

demo/shell/route-core-test.mjs: the routing core against its vectors, with
no browser, no socket and no instrument.

  node demo/shell/route-core-test.mjs

🔴 THE VECTORS ARE THE CONTRACT AND THIS FILE ONLY RUNS THEM. Every file in
`demo/shell/route-vectors/` carries its expected output DERIVED BY HAND, with
the arithmetic in its `notes`, and none was produced by running
`route-core.mjs`. A vector written by running the code grades the code
against itself and passes every bug it already has.

NEGATIVE CONTROLS, AND THE PROPORTION IS STATED BECAUSE A ROUTER PASSES A
NAIVE SUITE BY PASSING EVERYTHING THROUGH. Recounted 2026-10-04 after 23 to
26 landed, one per op the plan's §12 listed as not yet in the reference:
  - Inside the vectors, 92 of the 276 input steps and link attempts (214
    steps, 62 links) are there to be dropped, held, refused or left alone,
    each one marked NEGATIVE CONTROL in its vector's `notes` or listed under
    `refused`. It was 24 of 91 across 01 to 10, 57 of 165 across 01 to 17
    and 67 of 210 across 01 to 22; 23 to 26 bring 25 of 66.
    Counted per step: a step dropped on one link and kept on the other
    counts once.
  - Every vector is also run against a COPY OF ITS OWN EXPECTATION WITH ITS
    LAST BYTE FLIPPED, and that comparison must FAIL. Twenty-six asserts that
    check the check can fail. ⚠️ The first version flipped only data bytes and
    went red on 10, whose last event is a one byte F8: the self check caught
    itself.
  - Five direct refusals at link time (unknown op, bad args, an input range
    written backwards, a duplicate id, a kind nobody named).
  So 31 of the 115 asserts are negative controls outright, 56 run the vectors
  (26 refusals, 26 outputs, 4 held counts) and 28 check that the vectors are
  well formed (the count, index.json, and one per vector naming only known
  ops, kinds, verbs and codes). It was 99 before 23 to 26.

🔴 SABOTAGED ONCE, 2026-10-03, ON A SCRATCH COPY of `route-core.mjs`,
`midi-kinds.mjs`, this file and the vectors, so the live file was never
broken while another session shared the checkout. Each change run alone, then
the copy restored and read 47/47 again. Red asserts per sabotage, MEASURED:
  1. ties rounded half up (`Math.round(num / den)`): 1 red (05). ⚠️ It was 0
     red before 05 gained its negative tie: 04's tie is positive and both
     rules agree on it. Found by planning this sabotage, not by running it.
  2. truncation instead of rounding: 2 red (04, 05).
  3. the cycle check removed from `link()`: 2 red (07 refusals and output).
  4. `unlink()` releases nothing: 1 red (08).
  5. the gate's `confirm` treated as `allow`: 2 red (09 output and held).
  6. `thin` measured from the last event SEEN, not the last KEPT: 1 red (10).
  7. a note on at velocity 0 counted as a press: 2 red (06 flips on it, 08
     then thinks 64 is still sounding and releases it).
  8. ops skipped and the gate wide open, a core that passes everything:
     9 red across 8 of the 10 vectors (only 01 and 07 have nothing to change).
  9. links dispatched newest first: 3 red (01, 08, 09, the interleaved ones).
 10. `accepts` not checked: 1 red (02).

🔴 SABOTAGED AGAIN, 2026-10-03, ONCE PER OP THAT 11 TO 17 FIRST NAMED, the
same way: a scratch copy of the core, the test and the vectors, each change
alone, the copy restored and read 77/77. Red asserts, MEASURED:
 11. `transpose` clamps to 0..127 instead of dropping: 1 red (11).
 12. `velocity` scales every note, releases included: 1 red (12).
 13. `velocity` without its floor of 1: 1 red (12, where 0.25 of v 1 would
     become a release).
 14. `only` passes everything: 1 red (13).
 15. `drop` drops nothing: 1 red (13).
 16. `range` filters note ons only and lets every note off through: 1 red (14).
 17. `range` with its top bound exclusive: 1 red (14).
 18. `vrange` filters releases on their velocity too: 1 red (15).
 19. `fixed` sets the velocity of every note, releases included: 1 red (16).
 20. `deny()` does nothing: 1 red (17, the later confirm releases both).
 21. a denied SysEx stream delivers its later chunks: 1 red (17).
 22. ops skipped and the `allow` check removed from the gate (`accepts` still
     read): 14 red across 14 of the 17 vectors. Only 01, 02 and 07 have
     nothing for it to change. 09's held count survives this one, because the
     entry is still pushed onto the held list before it is delivered.

🔴 SABOTAGED A THIRD TIME, 2026-10-03, ONCE PER THING 18 TO 22 DECIDE, the
same way, the copy restored and read 99/99. Red asserts, MEASURED:
 23. the release on unlink sorted DESCENDING, note offs and CC 123 both:
     1 red (18). It was 0 red before 18, in both languages: 08 leaves one
     note sounding, so the order was a sentence and not a promise.
 24. only the note offs descending: 1 red (18).
 25. only the CC 123s descending: 1 red (18).
 26. the release in play order, no sort at all: 1 red (18).
 27. a chunk that is only F7 dropped and the stream left open, as it was:
     1 red (19).
 28. `velocity` as `Math.round(v * scale)`, as it was: 1 red (20, the tie
     45 at 0.7). 12 stays green, its scales are exact in binary.
 29. `velocity` taking any scale above 0, as it did: 2 red (20 refusals, and
     its output, since 0.0004 then links and floors every note on to 1).
 30. a policy key read verbatim, as it was: 1 red (21). Its held count stays
     green, because touch then falls to allow and nothing is held at the end
     either way.
 31. `thin` reading a backwards t as no time passed: 1 red (22).

🔴 SABOTAGED A FOURTH TIME, 2026-10-04, ONCE OR MORE PER OP 23 TO 26 NAME
(`curve`, `velcurve`, `notecc`), the same way, the copy restored and read
115/115. Red asserts, MEASURED:
 32. `curve` ignoring its `cc`: 1 red (23, CC 7 gets curved).
 33. `curve` ignoring its `cls`: 1 red (24). 🔴 IT WAS 0 RED ON THE FIRST RUN.
     24's l2 was a full identity table, so a CC curved by it came out
     unchanged and looked exactly like a CC skipped. l2 is now identity only
     from 64 up, which still grades a bend's exactness at and above centre.
 34. a bend's points read as plain p * 128, so 127 is 16256: 1 red (24).
 35. a bend curved on its MSB alone, the LSB kept: 1 red (24).
 36. a channel touch's pressure read from the third byte: 1 red (24).
 37. `curveAt` truncating: 3 red (23, 24, 25, it is shared by both curves).
 38. `curveAt` with `Math.round`: 1 red (24, the negative tie -1.5).
 39. `curveAt` extrapolating past both end points instead of clamping, then
     floored to the value's range: 2 red (23, 25). 🔴 THE SAME AT THE LOW END
     ALONE WAS 0 RED ON THE FIRST RUN. 23's first out was 0, so an
     extrapolation floored at 0 read as the clamp. Its first out is 4 now.
     23's top clamp is still blind to this (its last out is 127), and 25's
     is not (its last out is 120).
 40. points with equal inputs allowed: 2 red (25 refusals and output).
 41. no limit of 16 points: 2 red (23 refusals and output).
 42. `velcurve` without its floor of 1: 1 red (25).
 43. `velcurve` curving releases too: 1 red (25).
 44. `notecc` reading a note on at velocity 0 as a press: 1 red (26).
 45. `notecc` sending every CC on channel 1: 1 red (26).
 46. `notecc`'s `'vel'` read as a fixed 127: 1 red (26).
 47. `notecc` taking any word for `on`: 2 red (26 refusals and output).
⚠️ ONE SABOTAGE OF THE THIRD RUN WENT GREEN AND IS EQUIVALENT, NOT A HOLE: `deny()` emptying
its list without marking the entry denied. The entry is unreachable, the held
count reads from the list, and a later chunk of that stream is appended to
the orphan and never delivered, so nothing a vector can observe differs.
⚠️ `deny()`'s return value, how many it dropped, is not read by any vector:
the runner calls it and discards the answer.
