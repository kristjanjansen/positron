# Page comments: away

The full comments cut from the code under demo/ for away, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="away-1"></a>
## away-1: demo/away/index.html, inline script, line 11

````js
  // demo/away/index.html: listen to the Circuit in another building.
  //
  // Asked 2026-09-30: *"make other demo for this, 'away', do not touch knobs
  // tdemo. allow me just to listen in circuit audio from pi in wave visualizer"*,
  // then *"use stnd waverform display not video canvas on away"*. The picture is
  // the kit's `createWaveView`, handed the last few seconds of what arrived.
  //
  // 🔴 THE CIRCUIT IS AN INPUT IN A ROOM OF ITS OWN, NOT THE BOARD'S ONE SLOT.
  // Asked the same day: *"can we support both yoshimi and circuit?"*. The board
  // streams each hardware input into `<room>-<name>` (rig/board/inputs.mjs), so
  // this page joins `studio-1-circuit` and Yoshimi in `studio-1` is untouched by
  // anything here, and the other way round.
  //
  // 🔴 LISTEN HOLDS A LEASE, AND THAT IS WHAT RUNS THE CAPTURE. The board cannot
  // see a listener, so while Listen is on this page says `input.want` every
  // `RENEW_MS` and the board stops capturing a minute after the last one. A
  // visit alone starts nothing; it joins the room and shows whether the board is
  // there.
  //
  // 🔴 A NODE ON THE PATCHBAY SINCE 2026-10-06 (plans/plan-routing-migration.md
  // step 5). The page says what it is in the studio's discovery room through
  // `bay-node.mjs`: its keys as a MIDI out and its picture as an audio in, on a
  // site of this tab's own. It JOINS ON A PRESS (Listen, or a key a person
  // plays), never on load, so a visit puts nothing on the owner's desk. The
  // lease is `openers.mjs`'s `createLease`, the one the patchbay uses, and the
  // picture wears `link-badge.mjs`'s word while Listen is on, counted from the
  // frames that reached this page. No patch view: the owner's answer on the
  // stage was *"perhaps just visual indication of picture happening"*.
````

<a id="away-2"></a>
## away-2: demo/away/index.html, inline script, line 63

````js
  // Well inside the board's 60 s lease, so one lost message costs nothing.
  // ⚠️ THE NUMBER IS `openers.mjs`'s `RENEW_MS` NOW, which is this page's own
  // 20 s lifted into the kit; `createLease` defaults to it.
  // 10 ms frames on the direct path unless `?frame=20`, which is there to
  // measure one against the other (plans/plan-away-webrtc.md §5.3, P3).
````

<a id="away-3"></a>
## away-3: demo/away/index.html, inline script, line 74

````js
    // 🔴 LISTEN AND ONLINE ARE ONE BUTTON, asked 2026-09-30: *"listen + online
    // is same button"*. The kit's presence button, wearing the badge
    // `createBoard` already drives, so the face says whether the board is
    // there and a press starts or stops listening. Built below, once the board
    // exists, and appended to the control row where the harness presses.
````

<a id="away-4"></a>
## away-4: demo/away/index.html, inline script, line 85

````js
    // ⚠️ NO `relay:` FROM THE QUERY SINCE 2026-10-06. This page handed
    // `createBoard` its own `?relay=` unchecked, so a link could point it at
    // any relay. `wire.mjs` reads `?relay=` itself and honours only a ws://
    // address on this machine, which is what the stand-in board needs.
````

<a id="away-5"></a>
## away-5: demo/away/index.html, inline script, line 91

````js
    // 🔴 80 ms, DOWN FROM 160, BECAUSE THE LUMPS ARE GONE. MEASURED 2026-09-30:
    // with arecord at its default 125 ms period the frames arrived in bursts
    // (p90 gap 117 ms) and 160 was what rode them; at a 10 ms period the gaps
    // read p50 19.9, p90 23.2, max 94.5. The playout raises its own floor when
    // it runs dry, up to `maxCushionMs`, so a start that is too low costs one
    // click and then corrects itself.
````

<a id="away-6"></a>
## away-6: demo/away/index.html, inline script, line 126

````js
  /* 🔴 THE LINK'S WORD ON THE PICTURE IT FEEDS: STARTING, RECEIVING or STALLED,
     from the frames that reached THIS page, the far side of the wire. The
     video panel's own tag look (`.pos-vp-tag`), top left, hidden while Listen
     is off. The presence badge beside the name says whether the board is
     there; this says whether its sound is arriving here, which is a different
     question with a different answer when the board is up and capturing
     nothing. */
````

<a id="away-7"></a>
## away-7: demo/away/index.html, inline script, line 140

````js
  // ── playing it ───────────────────────────────────────────────────────────
  //
  // 🔴 A PART IS A CHANNEL, AND A DRUM IS ALSO A NOTE. `plans/plan-circuit-model12.md`
  // §3.1 and §3.2: Synth 1 on channel 1, Synth 2 on channel 2, all four drums on
  // channel 10 with Drum 1 at note 60 and Drum 2 at 62 (+2, +2, +1, not even).
  // So on a drum part every key plays that one drum, and the key only chooses
  // how hard.
  // ⚠️ THE BOARD DECIDES WHAT REACHES THE INSTRUMENT, NOT THIS PAGE. It lets
  // note on, note off and all notes off through on 1, 2 and 10 and refuses the
  // rest (rig/board/inputs.mjs `midiVerdict`), because a room name is not a
  // password and the Circuit has no factory reset.
````

<a id="away-8"></a>
## away-8: demo/away/index.html, inline script, line 188

````js
  // ── the patch ────────────────────────────────────────────────────────────
  //
  // 🔴 A PROGRAM CHANGE ON CHANNEL 1 OR 2, AND ONLY THERE. Asked 2026-09-30:
  // *"use instument panel for away and patch selector"*. 📄 The Circuit's own
  // table (`plans/plan-circuit-model12.md` §3.7): on 1 and 2 a program change
  // selects one of 64 synth patches into RAM; on 16 it selects a SESSION. The
  // board's gate (`midiVerdict` in rig/board/inputs.mjs) is what enforces that,
  // not this page. A drum part has no patch here: drums change by CC, which
  // the gate refuses, so the picker is switched off on one.
  // ⚠️ IT OPENS EMPTY, BECAUSE NOTHING SAYS WHICH PATCH THE CIRCUIT IS ON.
  // The board sends nothing back about the instrument's state, so a name here
  // before a choice would be a claim nobody measured. It shows what THIS page
  // last sent to each synth.
````

<a id="away-9"></a>
## away-9: demo/away/index.html, inline script, line 239

````js
    /* 🔴 `Loop` WHILE THE EVOLUTION IS PLUGGED IN, asked 2026-09-30 for every
       keyboard page. A looped note comes back through `onDown` marked `loop`, so
       it goes to the Circuit by exactly the route a finger does, and a note the
       take heard over MIDI keeps the velocity it was played with. */
````

<a id="away-10"></a>
## away-10: demo/away/index.html, inline script, line 250

````js
  // ── the instrument ───────────────────────────────────────────────────────
  // Asked 2026-09-30 with the patch selector. The kit's panel owns the order,
  // the seams and the insets: the picture, the part row, the keys, and a plate
  // with ONLINE beside the name and the patch at the far end, unlabelled.
````

<a id="away-11"></a>
## away-11: demo/away/index.html, inline script, line 262

````js
  // ── MIDI in, from a keyboard on this machine ─────────────────────────────
  // Asked for on a press, or opened by itself only when the browser has
  // ALREADY said yes: `requestMIDIAccess` is a prompt, and a visit asks nothing.
  // Every incoming note goes to the part chosen above, whatever channel the
  // keyboard itself sends on.
````

<a id="away-12"></a>
## away-12: demo/away/index.html, inline script, line 290

````js
  // ── lag: key press to sound ──────────────────────────────────────────────
  //
  // 🔴 MEASURED ON THE SOUND, NOT ADDED UP FROM PARTS. Asked 2026-09-30:
  // *"show lag"*. A press stamps the clock and remembers how loud the last
  // 200 ms were; the first frame that comes back at least twice that loud (and
  // above a floor) is the note arriving. Its arrival time plus the cushion the
  // playout is holding is when it leaves the speakers, which is what a player
  // feels. Adding a ping to a buffer would be a number about the pipe, not
  // about this note.
  // ⚠️ OVER A LOUD LOOP IT CAN MISS OR MISFIRE, and it says so rather than
  // guessing: a Circuit pattern already playing can hide a quiet note or land
  // its own beat inside the window. No onset in `ONSET_WAIT_MS` leaves the cell
  // alone and says why in the log.
````

<a id="away-13"></a>
## away-13: demo/away/index.html, inline script, line 373

````js
  // ── what the board says it is playing ────────────────────────────────────
  // What the board is capturing goes in the log when it changes, not in a
  // cell: asked 2026-09-30, *"rm playing from readout"*.
````

<a id="away-14"></a>
## away-14: demo/away/index.html, inline script, line 399

````js
  // ── Listen ───────────────────────────────────────────────────────────────
  // ⚠️ MUTE DISCONNECTS THE SPEAKERS, IT DOES NOT SUSPEND THE CONTEXT.
  // board.mjs reads a suspended context as the browser refusing sound and says
  // "tap anywhere", which would be a false instruction after a deliberate mute.
  // ⚠️ AND MUTE STOPS RENEWING RATHER THAN SAYING `input.stop`, because somebody
  // else may be listening to the same input; the lease lapses on its own.
  // ⚠️ THE LEASE IS `createLease` FROM `openers.mjs`, the patchbay's own, which
  // was lifted out of this page. It asks at once and renews every `RENEW_MS`;
  // the ask is wrapped so each answer still says what the board is capturing.
````

<a id="away-15"></a>
## away-15: demo/away/index.html, inline script, line 442

````js
  // ── a node on the patchbay ───────────────────────────────────────────────
  //
  // 🔴 THE DISCOVERY ROOM IS THE BOARD'S MAIN ROOM, NOT THE INPUT ROOM THIS PAGE
  // LISTENS IN. `?room=` here names the input room (`studio-1-circuit`), so
  // the bay room is that name without its `-<input>`, which is where the Pi
  // and `/patchbay/` meet. Under a harness with no `?room=` it is the run's
  // own room (`roomFor`), never `studio-1`.
````

<a id="away-16"></a>
## away-16: demo/away/index.html, inline script, line 453

````js
  /** The port the Pi announces for the Circuit's MIDI in (`boardGraph`), on
   *  site `pi-1` since 2026-10-10 while its room stays `studio-1`. */
````

<a id="away-17"></a>
## away-17: demo/away/index.html, inline script, line 469

````js
  /* 🔴 WHAT THIS PAGE ANSWERS WHEN `/patchbay/` ASKS FOR ONE OF ITS LINKS. The
     keys reach the Circuit in the room this page listens in, always, and that
     is the one link it has: asked for, it is already open and says so. Any
     other destination, and a close, is refused in words, because the keys here
     are a person's hands on one instrument and a remote page does not get to
     move them somewhere else or take them away. */
````

<a id="away-18"></a>
## away-18: demo/away/index.html, inline script, line 534

````js
    /* `Loop` follows the Evolution, and a loop reaches `board.send`, counted by
       the board module on the far side of this page: a harness run is refused
       there, so this is every note that was on its way to the Circuit and
       nothing was heard. */
````

<a id="away-19"></a>
## away-19: demo/away/index.html, inline script, line 558

````js
  /* 🔴 THE BADGE READS THE FAR SIDE. Run only with frames arriving (the stand-in
     board holds a listener, so they do under the harness): the page's own
     badge, started on the frame counter the waveform reads, has to say
     receiving, and a NEGATIVE CONTROL on a count that never grows must not.
     Nothing is sent and no lease is taken: the badge is display only. */
````

<a id="away-20"></a>
## away-20: demo/away/index.html, inline script, line 581

````js
  /* 🔴 THE PAGE AS A NODE, GRADED IN THE RUN'S OWN ROOM. A visit joins nothing;
     the harness joins on purpose and a stand-in patchbay in the same room asks
     for the page's one link, another destination, and a close, and gets a yes
     and two refusals in this page's words. A request about a port that is not
     this page's gets no answer at all, which is the owner rule from the other
     side. Only against a relay on this machine: a harness has no business
     holding sockets on the production relay to find this out. */
````
