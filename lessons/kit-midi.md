# Kit lessons: midi.mjs

The long comments cut from `demo/shell/midi.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-midi.md#<anchor>`.

<a id="header"></a>

## midi.mjs, file header

demo/shell/midi.mjs — a real keyboard, where there is one.

⚠️ ONE PATH, NOT A SECOND ONE. A note number is a note number, and what
crosses the relay cannot tell a piano from a tapped screen — which is the
point `demo/instrument` already makes in its own words. So MIDI lights the
same keys and calls the same two functions the on-screen keyboard calls,
rather than growing a route of its own that then has to be kept in step.

🔴 A NOTE-ON AT VELOCITY 0 IS A NOTE-OFF. Most keyboards send it that way and
many never send 0x80 at all, so treating every 0x90 as "on" leaves every note
hanging — and on this project's pages the hanging note is on an instrument in
another building. This is the single most common way a first MIDI
implementation is wrong.

⚠️ AND A BROWSER WITHOUT WEB MIDI IS NOT A FAULT. Safari has none at all. The
page says so once and carries on with the keys it drew itself, because a demo
that reports a missing optional capability as an error teaches its reader that
red means nothing.

<a id="evolution"></a>

## midi.mjs, EVOLUTION

🔴 IS THIS PORT THE EVOLUTION, ASKED ONCE FOR EVERY KEYBOARD PAGE. Asked
2026-09-30: *"enable loop button and fucntioanly on onscreen keyboar when
evolution is connceted"*, on every page that draws keys. `/nola/` carried the
test as its own regular expression and `/evo/` as a second copy; both were
spellings of the entry `instruments.mjs` already keeps for this keyboard, so
the pattern is READ from there and nowhere else types it.
⚠️ THE MODEL NUMBER, NOT THE BRAND. CoreMIDI calls the port `MK-425C USB MIDI
Keyboard`, so the word `Evolution` is in nobody's port list, and
`instruments.mjs` records that measurement beside the pattern.

<a id="offer-loop-for"></a>

## midi.mjs, offerLoopFor

🔴 OFFER A KEYBOARD'S `Loop` WHILE THE EVOLUTION IS PLUGGED IN, AND TAKE IT
AWAY WHEN IT GOES. This is `/nola/`'s `onPorts` body lifted out whole, so
every page answers the question with the same test and says it in the same
two log lines. `createMidi({ loop: kb })` calls it on every port change; a
page with MIDI of its own calls it with its own list of input names.
⚠️ AND IT IS THE PATH A CHECK DRIVES. Handing it a made up list is the same
call a cable makes, so *an Evolution appeared* and *a Circuit appeared* are
both reachable on a desk with nothing plugged in.
⚠️ IT LOGS ONLY ON A CHANGE, or a keyboard that reports itself twice says it
twice. A log line is for something that happened.
@param keys   a `createKeyboard` built with `loop` on
@param names  input port names
@param log    `d.log`, or nothing
@returns {boolean} whether `Loop` is in the row now

<a id="check-evolution-loop"></a>

## midi.mjs, checkEvolutionLoop

🔴 THE CHECK EVERY KEYBOARD PAGE MAKES ABOUT IT, WRITTEN ONCE. A page hands
over its keyboard, its `d`, the call that answers a port change, and a counter
of notes that reached ITS OWN sound path, which is the half only the page
knows: the board on `/away/` and `/knobs/`, the synth voices on
`/instrument/`, the lamp on `/evo/`, which has no sound at all.
⚠️ FIVE CLAIMS, AND THE SECOND IS THE NEGATIVE CONTROL THAT PROVES THE TEST.
A pattern that matched every name would pass the second claim and fail this
one, which is the sabotage it was proved with.
⚠️ `heard` IS COUNTED BY THE PAGE, ON THE FAR SIDE OF ITS OWN HANDLER, never
by the keyboard, whose own counter would agree with itself whatever the page
did with a note. `key` is a letter the keyboard draws, pressed the way a
finger presses it.
⚠️ AND IT PUTS THE ROW BACK AS THE PORTS REALLY ARE, so a person with the
Evolution plugged in is not left without `Loop` by a check.
⚠️ `timed: false` MAKES ONLY THE THREE CLAIMS THAT COST NO TIME. MEASURED
2026-09-30 on `/nola/`: the two timed claims add about a second, and that
page's checks already run to within that of `verify.mjs`'s 24 s ceiling, so
its last 16 asserts stopped arriving and the run still read green. `/nola/`
grades a loop sounding over MIDI on its own and `/kit/` grades a withdrawn
loop stopping with its take kept, so it takes the three and not the two.
@returns {Promise<void>}

<a id="create-midi"></a>

## midi.mjs, createMidi

@param {object} o
@param {(note:number, vel:number, ch:number, at:number)=>void} o.onDown
 `at` is the MIDI message's own `DOMHighResTimeStamp`, not this handler's.
@param {(note:number, ch:number, at:number)=>void} o.onUp
@param {(cc:number, value:number, ch:number, at:number)=>void} [o.onControl]
@param {(line:string, kind?:string)=>void} [o.log]
@param {(n:number, names:string[])=>void} [o.onPorts]  called with the input
 count and the port NAMES, on every change.
 🔴 THE NAMES ARE THE SECOND ARGUMENT SINCE 2026-09-28, AND A COUNT COULD
 NOT HAVE ANSWERED THE QUESTION THAT NEEDED THEM. `/nola/` shows its `Loop`
 control only while the Evolution is plugged in (*"rm loop button when
 evolution keyboad is not connected"*), and *something is plugged in* and
 *that keyboard is plugged in* are different facts. A page that wants to
 know which device this is has to be told which device this is.
 ⚠️ IT IS AN ADDED ARGUMENT AND NOT A CHANGED ONE, so every caller written
 before it reads exactly what it read. A new property that silently switches
 a page's behaviour is the shape of loss `positron-verify` records as 27
 asserts becoming 17, every one of them green.
 ⚠️ AND THE MATCHING IS THE PAGE'S. This file does not know what an Evolution
 is, which is the same division it already keeps about what a note means.
@returns {{ports:()=>number, names:()=>string[], state:()=>string, close:()=>void}}

<a id="on-any"></a>

## midi.mjs, createMidi, onAny

🔴 EVERY MESSAGE, BEFORE ANYTHING IS DECIDED ABOUT IT, AND IT EXISTS BECAUSE
SILENCE IS THE ONE ANSWER THIS FILE COULD NOT GIVE. Reported 2026-09-23:
*"there is no events when i press numpad"*. The dispatch below handles four
kinds and drops the rest on the floor with no log line, so a device sending
aftertouch, pitch bend, SysEx, a bank select this page ignores, or anything
on a channel nobody is reading looks EXACTLY like a cable that is not
plugged in. Those are opposite problems with one symptom.
⚠️ IT IS A DIAGNOSTIC AND NOT A ROUTE. Nothing should play notes from here:
it is for a page to say what arrived when what arrived was nothing it knows.

<a id="loop-option"></a>

## midi.mjs, createMidi, loop

🔴 A KEYBOARD WHOSE `Loop` FOLLOWS THE EVOLUTION. Pass the `createKeyboard`
and every port change runs `offerLoopFor` on it with this module's `log`,
so a page writes one option instead of copying `/nola/`'s callback. It runs
on the refused and unsupported paths too, with no names, because *this
browser cannot see a MIDI port* is also *the Evolution is not here*.
⚠️ BUILD THE KEYBOARD WITH `loop: 'evolution'` AS WELL, which starts it
withdrawn. A page that opens MIDI only on a press would otherwise show `Loop`
until that press, and a control that vanishes under a hand is worse than
one that arrives.

<a id="timestamp"></a>

## midi.mjs, createMidi, the message timestamp

🔴 THE TIMESTAMP IS THE MESSAGE'S, NOT THIS HANDLER'S, AND THEY ARE NOT
        THE SAME NUMBER. `e.timeStamp` is a `DOMHighResTimeStamp` on the same
        clock as `performance.now()`, taken when the browser received the
        message; a busy main thread can run this callback milliseconds later,
        and a page measuring press to sound from inside its own handler has
        already thrown that delay away. `/nola/` reports it, so it is passed.
        ⚠️ WHAT NEITHER OF THEM SEES is the keyboard's own scanning delay and
        the USB stack, which is everything between the felt of the key and the
        event. No browser API can measure it.

<a id="program-change"></a>

## midi.mjs, createMidi, program change

🔴 PROGRAM CHANGE IS TWO BYTES, NOT THREE, AND THAT IS WHY IT NEEDED ITS
        OWN LINE RATHER THAN FALLING OUT OF THE CONTROL ONE. `0xc0` carries a
        single data byte, so `b` is `undefined` and every handler above would
        have read a number that is not there.
        ⚠️ AND IT IS WHAT A NUMBER PAD SENDS. Added 2026-09-23 for *"control 1 2
        3 with evo 1 2 3 numpads"*: the MK-425C's ten assignable buttons send a
        bank select pair and then a program change, so a page listening only for
        notes and controllers hears a keypad as silence.

<a id="ports-log"></a>

## midi.mjs, createMidi, the ports log line

⚠️ NO MIDDOT. This line joined the count and `play it` with one, which
        is two facts glued into a sentence, and it reaches every page that opens
        MIDI. The shared ones are decided once, which is here.
