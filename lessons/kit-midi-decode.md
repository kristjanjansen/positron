# Kit lessons: midi-decode.mjs, midi-decode-test.mjs

The long comments cut from `demo/shell/midi-decode.mjs` and `demo/shell/midi-decode-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-midi-decode.md#<anchor>`.

<a id="header"></a>

## midi-decode.mjs, file header

demo/shell/midi-decode.mjs — bytes in, a row out. No browser, no device.

🔴 WHY THIS IS A MODULE AND NOT A FUNCTION INSIDE `/dump/`. Everything here is
pure, so it can be graded by `node demo/shell/midi-decode-test.mjs` against
byte streams whose answers are known in advance. A decoder living inside a
page can only ever be tested by plugging something in, and what a device
happens to send today is not a known answer, so it cannot test a decoder.
`demo/shell/looper-test.mjs` is the precedent and made the same argument.

🔴 RAW BYTES ARE NEVER REPLACED BY A READING OF THEM. Every row this returns
carries `bytes` alongside `reading`, and the page shows both. A relative
encoder reads as a position if you only interpret it, and that is exactly the
question somebody points this page at a mixer to settle.

⚠️ A NOTE-ON AT VELOCITY 0 IS A NOTE-OFF. `midi.mjs` already carries this
warning and it belongs here too: most keyboards send it that way and many
never send 0x80 at all.

<a id="note-name"></a>

## midi-decode.mjs, noteName

A note number as a name. Middle C is C4 here, which is the Yamaha/MIDI
convention where note 60 is C4.

⚠️ THERE IS NO AGREED ANSWER AND EVERY CHOICE IS WRONG SOMEWHERE. Roland
calls note 60 C3 and Yamaha calls it C4, so a name is a CONVENTION and the
NUMBER is the fact. That is why the page shows the number in its own column
and the name only inside the reading.

<a id="cc-names"></a>

## midi-decode.mjs, CC

What the MIDI specification says a controller number means.

🔴 THIS IS A CONVENTION AND NOT A FACT ABOUT ANY DEVICE, AND THIS PROJECT HAS
ALREADY BEEN BITTEN BY TREATING IT AS ONE. In General MIDI, 76 and 77 are
vibrato rate and depth. On Yoshimi they are FM amplitude and resonance
centre, which was measured here on a real instrument after a slider labelled
from this table turned out to move nothing. So a name out of this table is
shown as `by convention` and never as what the knob you just turned does.

<a id="is-flood"></a>

## midi-decode.mjs, isFlood

🔴 CLOCK AND ACTIVE SENSING ARE FLOODS AND THE PAGE COUNTS THEM RATHER THAN
LISTING THEM. Clock is 24 per quarter note, so a mixer running at 120 bpm
sends 48 a second for as long as it is on, and active sensing is about three
a second forever. Either one fills a table in seconds and buries the one
message somebody pressed a button to see. This is the flag the page reads to
decide which pile a message goes in.

<a id="device-inquiry"></a>

## midi-decode.mjs, deviceInquiry

MIDI Device Inquiry: the one question every device is supposed to understand.

🔴 IT IS UNIVERSAL SYSEX, NOT A VENDOR EXTENSION, so it is the only way to ask
four different manufacturers' boxes the same question. A device that answers
returns its own firmware revision, which otherwise takes a menu dive on one
device and a web application on another.
⚠️ `0x7F` IS THE ALL-CHANNELS ADDRESS. A device listening on any SysEx
channel replies.

<a id="read-inquiry-reply"></a>

## midi-decode.mjs, readInquiryReply

The reply, if that is what this is.

⚠️ THE MANUFACTURER ID IS ONE BYTE OR THREE, and `0x00` is the escape into
the three byte form rather than a manufacturer. Reading it as one byte always
makes every three byte manufacturer look like the same nonexistent one.
@returns {string} '' when these bytes are not an inquiry reply

<a id="makers"></a>

## midi-decode.mjs, MAKERS

The four makers on this desk, plus the ones a reader is likeliest to meet.
⚠️ NOT A COMPLETE TABLE and it must never pretend to be: an id that is not
here is printed as the id, which is still the fact.

<a id="classify-encoder"></a>

## midi-decode.mjs, classifyEncoder

Is this controller sending POSITIONS or CLICKS?

🔴 THE QUESTION THIS WHOLE PAGE EXISTS FOR. TASCAM publishes no controller
numbers for the Model 12 in Mackie Control mode at any firmware revision, so
whether its pan knobs send an absolute position or a relative click is not
answerable from any document. It IS answerable in about four seconds of
turning one knob.

A relative encoder sends a small number for clockwise and the same small
number with bit 6 set for counter clockwise, so its values cluster near 0x01
and near 0x41 and NEVER sweep the range. An absolute one walks 0 to 127.

⚠️ IT RETURNS `unknown` UNTIL THERE IS ENOUGH TO SAY, AND `unknown` IS A REAL
ANSWER. Four messages cannot tell these apart: an absolute knob nudged four
times sends four neighbouring values, which is exactly what a relative one
looks like. A page that guesses from four is a page that is confidently wrong
half the time.

@param {number[]} values every value seen for one (channel, controller)
@returns {{verdict:'absolute'|'relative'|'unknown', why:string}}

<a id="encoder-sign-bit"></a>

## midi-decode.mjs, classifyEncoder, sign bit

🔴 THE SIGN IS BIT 6, AND THE MAGNITUDE IS THE OTHER SIX BITS. A signed bit
relative encoder sends `0x01..0x3F` for one direction and `0x41..0x7F` for
the other, so the WHOLE range is in play and a fast turn really does send
63. What makes it relative is not where the values sit, it is that they
come in a small set of magnitudes MIRRORED across bit 6.

🔴 THE FIRST BUILD ASKED WHETHER THE VALUES SAT NEAR 1 AND NEAR 65, AND
MEASUREMENT KILLED IT. A TASCAM Model 12's MULTI JOG, read through this
module on 2026-09-20, sent exactly six values in 525 messages: `0x04` 172
times and `0x44` 189 times, `0x3F` 48 times and `0x7F` 48 times, `0x02` 35
times and `0x42` 33 times. Three magnitudes, each mirrored, and `0x3F` and
`0x7F` landing on the same count to the message. **This function called
that `unknown`**, because 63 and 127 fell outside a window that was guessed
rather than measured. A textbook relative encoder read as no answer at all.

<a id="create-nrpn"></a>

## midi-decode.mjs, createNrpn

NRPN is FOUR messages that mean ONE thing, and the four are ordinary CC
messages that also mean themselves.

🔴 THE PAGE SHOWS BOTH. The four rows stay in the table, because whether a
device rides this convention at all is the open question for the Circuit,
which Novation never wrote down. Folding them into one row would answer the
question by assuming it.

⚠️ 99 IS MSB AND 98 IS LSB, WHICH IS THE OPPOSITE ORDER FROM THE NUMBERS.
RPN is 101 and 100 and is a different address space with the same shape.

<a id="classify-bend"></a>

## midi-decode.mjs, classifyBend

Is a pitch bend really fourteen bits, or seven bits in a fourteen bit
message?

🔴 BOTH DEVICES ON THIS DESK FAKE IT, IN TWO DIFFERENT DISGUISES, AND THE
OBVIOUS TEST IS FOOLED BY ONE OF THEM. MEASURED 2026-09-20:
- An **Evolution MK-425C** wheel sends `E0 00 <msb>`: the LSB is always zero.
 "Does the LSB move" catches this one.
- A **TASCAM Model 12** MCU fader sends `E0 22 22`, `E0 23 23`, `E0 26 26`:
 **the LSB is a copy of the MSB.** The LSB moves on every message, so "does
 the LSB move" answers FOURTEEN BIT, confidently, about a control with 128
 positions.

⚠️ SO THE QUESTION IS WHETHER THE LSB IS INDEPENDENT OF THE MSB, never
whether it changes. A statistic that is constant by construction over your
subject is not a weak measurement, it is a blind one, and this is the same
shape: a duplicated byte varies perfectly and carries nothing.

@param {Array<Uint8Array|number[]>} messages every pitch bend seen on one channel
@returns {{bits:7|14|0, why:string, positions:number}}

<a id="test-header"></a>

## midi-decode-test.mjs, file header

demo/shell/midi-decode-test.mjs — the decoder's arithmetic, no browser.

🔴 IT GRADES THE DECODER AGAINST STREAMS WHOSE ANSWER IS KNOWN, WHICH IS THE
ONLY KIND THAT CAN GRADE ANYTHING. Four real devices are plugged into this
machine, and not one of them can test this file: what a device happens to
send today is not a known answer, so pointing the page at a mixer proves the
page runs and proves nothing about whether it reads correctly.

⚠️ FOUR OF THESE ARE NEGATIVE CONTROLS and they are the half that proves the
instrument. A decoder that called everything relative would pass "it found a
relative encoder". These require it to call an absolute one absolute, to
refuse a verdict on too few samples, to leave a non-reply unparsed, and to
leave an NRPN without an address incomplete.

  node demo/shell/midi-decode-test.mjs

<a id="test-note-off-word"></a>

## midi-decode-test.mjs, note off reading

🔴 THIS ASSERT USED TO READ `.includes('velocity 0')` AND PASSED VACUOUSLY
UNDER THE SABOTAGE, because a decoder that wrongly calls it a note ON also
writes `velocity 0` in its reading. That is CLAUDE.md's substring rule inside
a file written to catch exactly this. Assert the word that only the CORRECT
branch produces.

<a id="test-absolute-near-zero"></a>

## midi-decode-test.mjs, absolute knob near zero

🔴 THE TRAP, AND IT WAS A REAL BUG. An absolute knob at the BOTTOM of its
range, nudged gently, puts every value inside the low cluster and produces
few distinct ones, which is what a relative encoder also looks like if you
only ask "are the values clustered". The first build of the classifier
called this relative. There is no way to tell them apart from one
direction, so the honest answer is that there is no answer yet.

<a id="test-tascam-jog"></a>

## midi-decode-test.mjs, Tascam jog histogram

🔴 THE EXACT HISTOGRAM OF A TASCAM MODEL 12 MULTI JOG, read through this
module on 2026-09-20 over 525 messages. It is here because the first build
of `classifyEncoder` called it `unknown`: the clusters were guessed as 1-15
and 65-79, and a real MCU encoder uses the whole of 0x01..0x3F and
0x41..0x7F, so a fast turn sending 63 fell outside the window.
⚠️ NOTE `0x3F` AND `0x7F` AT THE SAME COUNT. That symmetry is the signature.

<a id="test-tascam-fader"></a>

## midi-decode-test.mjs, Tascam fader

🔴 A TASCAM Model 12 MCU fader: the low byte is a COPY of the high byte.
These are real bytes off the wire. The naive test asks whether the LSB
moves, and it moves on every one of these, so the naive test answers
FOURTEEN BIT about a control with 128 positions.
