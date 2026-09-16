// archive/box-pappus/page-half.js: the granulator half of `/box/`, removed 2026-09-16.
//
// Verbatim, in the order it stood in `rig/box/listen.html`. It is NOT a module
// and must not be imported: most of it closes over names that exist only inside
// that page. Read `README.md` beside it FIRST. The BOARD half of Pappus is not
// archived and must not be deleted: `/grains/` still drives it.

// ── 1. above the socket state, where the effect switch used to be drawn ──
  // Pappus is an effect, so it is a switch beside the instruments rather than
  // one of them: it wraps whatever is playing, and can go on and off underneath.
  // The effect lives on the SAME line as the instruments, pushed right: it is
  // not a fourth instrument, it wraps whichever one is chosen, and the gap says
  // so better than a second row would.

// ── 2. what the board says its insert is ─────────────────────────────────
  /**
   * What the BOARD says its insert is — `'pappus'` or `null`, and `undefined`
   * until it has said anything.
   *
   * ⚠️ NOT A GUESS AND NOT THIS PAGE'S REQUEST. Two pages drive one Raspberry
   * Pi and until 2026-09-14 each of them assumed its own last message was still
   * true. The board is the only end that knows, so this follows what it says
   * and never what this page asked for.
   */
  let insert;


// ── 3. on connect, inside ws.onopen. THE `send` ON THE LAST LINE STAYS IN
//       THE PAGE: it is what keeps the granulator out of this page's own sound.
      // 🔴 TAKE THE GRANULATOR OUT, BECAUSE THIS PAGE CANNOT EXPRESS IT.
      // The insert belongs to `grains` now and its controls were cut from here
      // — but cutting a control does not clear the STATE it used to set, and
      // the board is shared hardware. An insert left in by a `grains` tab that
      // was simply closed goes on wrapping whatever this page plays, and with
      // nothing arriving it feeds its own delay: MEASURED 2026-09-12, the board
      // streamed a steady **-6.1 dBFS** subsonic drone (everything a multiple
      // of ~8.8 Hz) while `box.alive` reported `voices: 0` — true about notes
      // and false about sound. One `fx.pappus {on:false}` took it to digital
      // silence, which is the A/B.
      //
      // 🔴 `onlyIfIdle`, ADDED 2026-09-14, AND IT DOES NOT WEAKEN ANY OF THAT.
      // The fault above is an insert left by a tab that CLOSED, and a closed
      // tab stops talking — so the board still clears it, measured in
      // `rig/box/insert-test.mjs`. What this stops is the OTHER half of the
      // same coin: two pages share one Raspberry Pi, `/grains/` switches the
      // granulator ON because it is that page's entire subject, and this page
      // switched it off merely by LOADING. Whichever you opened last won,
      // silently, and the other went on drawing a picture that was no longer
      // true.
      //
      // ⚠️ THE BOARD ANSWERS OUT LOUD EITHER WAY, and that matters more than
      // the arbitration: a refusal names the holder and how long ago it was
      // heard from, and this page logs it. An arbitration nobody can see turns
      // a visible problem into an invisible one.
      send({ type: 'fx.pappus', on: false, onlyIfIdle: true });

// ── 4. following an insert this page does not own, in ws.onmessage ──────
      // 🔴 THE GRANULATOR, WHICH THIS PAGE DOES NOT CONTROL AND MUST NOT HIDE.
      // The board reports its insert in `fx.pappus`, in `audio.started` and in
      // the five-second `box.alive` — so a change made by a `/grains/` tab in
      // another window shows up here without this page asking for anything.
      // ⚠️ ONLY WHEN IT CHANGES. A line that re-stated the same fact every five
      // seconds would bury the log, and a live SENTENCE that rewrites itself is
      // the thing CLAUDE.md has a rule about.
      if (m.fx !== undefined && m.fx !== insert) {
        insert = m.fx;
        d.log(insert
          ? `another page has the granulator in the sound${m.fxBy ? ` — it asked ${m.fxAgoSec} s ago` : ''}`
            + ' · this page has no controls for it, so what you hear is being shaped elsewhere'
          : 'the granulator is out of the sound — what you hear is the instrument', insert ? 'warn' : 'info');
      }
      // And the one case this page DID ask about: it asked for the granulator
      // to go and was told no, with a reason. Said once, when it happens.
      if (m.type === 'fx.pappus' && m.kept) d.log(`left the granulator in — ${m.reason}`, 'warn');

// ── 5. the "random" comment above the octave keys ───────────────────────
  // "random" means a different thing per instrument. Pappus has no patches at
  // all — it has 106 parameters — so rolling a program number there does
  // nothing audible, which is exactly how it sounded.

// ── 6. the diagram: one box inside `Raspberry Pi`, and the box above it ──
          { id: 'synth', label: 'instruments', sub: 'Yoshimi, hexter',
            note: 'The programs that actually make the sound, plus **FluidSynth** for the '
                + 'sampled one. A patch change is an ordinary MIDI program change.' },
          { id: 'pappus', label: 'pappus', sub: 'SuperCollider',
            note: 'A granulator the sound can be run through on its way out. Another page '
                + 'can switch it in, which is why this one reports it rather than owning it.' },

// ── 7. the diagram: the two links it stood between ──────────────────────
      // ⚠️ NO LABELS INSIDE A CONTAINER. The gap two stacked children share is
      // sixteen pixels tall, so a name in it runs under both boxes;
      // `createDiagram` refuses one and reports it. What travels is in the note.
      { from: 'synth', to: 'pappus',
        note: 'Audio, on the board, between two programs on it. Nothing crosses a network '
            + 'here and nothing is encoded.' },
      { from: 'pappus', to: 'cap',
        note: 'Whatever is actually going to the speakers, granulated or not, on its way to '
            + 'being sent back.' },
