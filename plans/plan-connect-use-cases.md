# plan-connect-use-cases: examples only /connect/ can make

Status (2026-10-14): open. A plan only; the page's examples are unchanged.

> Asked 2026-10-14: *"rethink connect use cases. most to not make sense or are
> weak copies of demos"* (BACKLOG.md, Open).

https://positron.studio/connect/ (deployed today, BUILD `3fcfb4e7-191710-7a38`),
`demo/connect/index.html`, the `EXAMPLES` array.

## 0. The answer

1. **The copying is a rule, not an accident.** Each example carries the concept
   page it reproduces, and the self-check asserts *"every example is something a
   concept page already does"* (`demo/connect/index.html`, the assert after the
   `cant` loop). The reason was written before any node ran on this page:
   *"so no example promises something no page does"* (`lessons/page-connect.md#connect-2`).
   Today 26 node types have runtimes here (`demo/shell/node-runtime.mjs`), so the
   guard that matters is different: **every part an example uses runs here.**
   The page already computes that (`runsOf`, which dims a pill).
2. **An example earns a place only when no page makes that patch.** Three ways
   to get there today, one later:
   - **across groups**: two parts that live on different pages meet (the drum
     machine plays Plaits);
   - **across sites**: this tab and the Pi in one patch where no remote page
     pairs them (the drum machine plays the Circuit);
   - **one source, two places**: a fan-out no page draws (one keyboard plays the
     synth and lights the Pico);
   - **across people** (not possible yet, §4): a part on somebody else's page in
     the room. This is the case nothing else on the site can do at all.
3. **Replace all 20 with the 12 in §3.** All 12 were linked on 2026-10-14 by the
   page's own self-check, and every part in them has a runtime. **None was
   listened to**: "links and runs" is measured, "sounds right" is not.

## 1. The 20 today, and why each goes

Read from `EXAMPLES` on 2026-10-14. "dim" means a part has no runtime here, so
the pill only draws. "press only" means a paid or external part.

| example | copies | verdict |
| --- | --- | --- |
| let the keys play the synth | synth/keyboard | copy |
| play plaits from my midi keyboard | code/plaits | copy |
| play the circuit in the studio | remote/circuit | copy |
| change the circuit's patch | remote/circuit | copy, and a picker rather than a patch |
| play the piano on the pi | remote/piano | copy |
| a knob opens supercollider's filter | code/collide | copy |
| a knob bends the mirror shader | shader/mirror | copy |
| show me plaits' waveform | code/plaits | copy, one wire |
| grain a radio recording | granulator/grains | copy |
| grains in time with the recording | granulator/beat | copy, dim (tempo) |
| what key is the live radio in? | radio/key | copy, press only, dim (relay, level, key) |
| the dial tunes the radio | radio/tuner | copy, dim (dial, tuner) |
| camera through the dither shader | video/shader | copy |
| send the camera through stream and back | video/webrtc | copy, press only (Stream is billed) |
| the drum machine plays its drums | drums/machine | copy, the inside of one instrument |
| the camera plays the drums | drums/camera | copy, dim (pixelate) |
| loop what i play into the piano | code/piano | copy, dim (looper) |
| record what i play and play it back | synth/recorder | copy |
| typing plays the typewriter | typist/typewriter | copy |
| the keys light up the pico | synth/dots | copy |

Twenty of twenty copy a page one to one; six of them do not even run here.

## 2. What was tried, and how

The candidates were added to a scratch copy of the page and run through its own
self-check (`?selfcheck=1`, headless, 2026-10-14). That check links each
example on a fresh bay with a person's consent and reports refusals in words;
the pill's `data-runs` says whether every part has a runtime. The scratch page
is deleted.

- **12 of 14 linked and run.**
- **Refused: one Pi sound into two places.** *"watch what the circuit plays"*
  linked `pi-1:circuit:audio-out` to the scope and to the speakers, and the
  second link was refused: *"circuit audio-out only travels by relay or
  datachannel or jack, and at internet-many the table offers moq or llhls."* A
  remote sound reaches one place here. Two places need a split on this side
  (a `level` or `mix` node, which have no runtime yet) or a different transport.
- **Refused: two shaders in a row.** `web:shader` has no `video-in` (it makes
  its own picture from `program-in` and `value-in`), so the camera cannot pass
  through the dither shader and then the mirror shader.
- **Not tried in sound.** Nothing was heard. The Pi examples need the Pi up and
  a person's Listen in `studio-1`, which a check never does (the page's own rule).

## 3. The proposal: twelve examples

Each line is the pill's text, the links, and why no page makes it. The ones on
the Pi need the board answering. Order: this tab first, then the Pi.

| # | pill | links | why it is not a copy |
| --- | --- | --- | --- |
| 1 | the drum machine plays plaits | sequencer midi-out to plaits midi-in, plaits to speakers | the drums page and the Plaits page never meet |
| 2 | granulate plaits as i play | keys to plaits, plaits audio-out to grains audio-in, grains to speakers | the granulator only ever hears a recording |
| 3 | one keyboard plays the synth and lights the pico | keys to synth to speakers, and keys to pico to OLED | one out port into two in ports, which no page draws |
| 4 | granulate the piano as i play it | keys to sampler (piano samples from R2), sampler audio-out to grains, grains to speakers | a played instrument into the granulator, not a file |
| 5 | the drum machine plays the circuit | sequencer midi-out to pi-1 circuit midi-in, circuit to speakers | a grid in this tab drives hardware in the studio |
| 6 | the drum machine plays the pi piano | sequencer to pi-1 sampler, sampler to speakers | the same, into the Pi's piano |
| 7 | record here, play it back on the circuit | keys to rec, rec midi-out to pi-1 circuit, circuit to speakers | a take made here, played back by the real instrument |
| 8 | granulate the circuit | keys to circuit, circuit audio-out to grains here, grains to speakers | hardware sound processed in this tab |
| 9 | plaits here and the circuit there, one keyboard | keys to plaits and to circuit, both to speakers | two instruments at two sites from one out port |
| 10 | my midi keyboard plays the pi drums | MIDI keyboard to pi-1 drums, drums to speakers | a real keyboard at this desk into the Pi's drums |
| 11 | the studio camera through my dither shader | pi-1 camera video-out to dither here, dither to screen | the studio's picture processed in this tab |
| 12 | a knob here bends the shader on the pi | knob value-out to pi-1 shader value-in, pi-1 shader video-out to screen | a control here, a GPU there, the picture back here |

⚠️ **#12 is close to /shader/remote/**, which already shows the Pi's shader
here. It stays only if the knob is the point; drop it if the owner reads it as
a copy.

What changes in the page with them:
- `EXAMPLES` loses the second field (the page it copies), and the assert
  *"every example is something a concept page already does"* becomes its
  inverse: **no example's links equal one page's patch**, plus **every part of
  every example has a runtime** (no dim pills).
- The pill list shows two groups, *here* and *with the studio*, because a Pi
  example that does nothing while the board is away should say so before it is
  pressed. The presence dot the groups already have can carry it.
- The model is told about the new ports (the check already flags
  `web:shader:video-in` and three others as missing from the 64 it sends).

## 4. The case that matters most, and why it is not in the twelve

**Across people.** The live layer already hears every page that announces its
graph in a room (Listen, `studio-1` or any room). But a heard page's boxes are
drawn with `pressable: false`: you can see somebody else's keys and cannot
link to them. So *"my keys play your synth"*, *"everybody's phone is one key of
a chord"* and *"your camera on my screen"* are the things only /connect/ could
ever do, and none can be an example yet. What it would take, read from the code
and not built:

1. A heard node's ports become pressable.
2. A link across two browsers rides the relay room as a `cf-relay` link (the
   transport table already offers it for MIDI and values).
3. The far page has to accept a link it did not make. Consent is the hard part:
   a page must never start sounding or open a camera because a stranger linked
   to it. A person on the far page confirms, the same way a person confirms a
   model's proposal here.

This is a plan of its own (`plan-connect-rooms`, not written), and it is the
reason to keep /connect/ at all rather than fold it into the kit.

## 5. Decisions for the owner

- **D1** Replace all 20 with §3, or keep two or three copies as a way in for a
  first visitor? Recommended: replace all; the cards on the front page already
  are the way in.
- **D2** #12 in or out.
- **D3** Is §4 (links to other people's pages, with their consent) the next
  thing to plan?

## 6. Cost

Writing the twelve and the inverse assert is one page change and one verify
run (`DEMO_FAKE_CAMERA=1 node demo/verify.mjs connect`, 106/106 before). The Pi
examples need a listening check on the real board by a person, because the
harness never listens in `studio-1`.
