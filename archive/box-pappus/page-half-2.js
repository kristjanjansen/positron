// archive/box-pappus/page-half-2.js — the LAST of the granulator in
// rig/box/listen.html, removed 2026-09-16 on a second instruction:
// "get rid of both". NOT A MODULE; do not import it.
// `page-half.js` beside this is what left in the first pass.

// ── the flag the board's reports were followed into ──────────────────────
  /**
   * Whether the board says a granulator is in the sound, which on this page is
   * only ever a thing to WARN about.
   *
   * 🔴 THE GRANULATOR CAME OUT OF THIS PAGE ON 2026-09-16, ON INSTRUCTION, AND
   * `archive/box-pappus/` HAS THE CODE AND THE REASONING. `/box/` never had a
   * control for it and drew it anyway. What is left is the one message that
   * takes it out of this page's sound, and this flag, which exists so that the
   * one case the message can be REFUSED is not silent: a live `/grains/` tab
   * holds the insert, and then what you hear is not the instrument.
   *
   * ⚠️ IT STARTS `null` RATHER THAN `undefined`, WHICH IS THE WHOLE EDIT. It
   * used to open at `undefined`, so the board's first `fx: null` counted as a
   * change and every ordinary visit logged a line about a granulator nobody had
   * met. Silence is the correct report for the normal case.
   */
  let insert = null;

// ── the message sent on connect, and the comment that defended it ────────
      // 🔴 THE ONE LINE OF GRANULATOR LEFT ON THIS PAGE, AND IT IS WHAT MAKES
      // THE PICTURE TRUE. The granulator belongs to `/grains/` and is not drawn
      // here since 2026-09-16, but an undrawn insert is not an absent one: the
      // board is shared hardware, and one left in by a `grains` tab that was
      // simply CLOSED goes on wrapping whatever this page plays and feeds its
      // own delay. MEASURED 2026-09-12, a steady -6.1 dBFS subsonic drone while
      // `box.alive` reported `voices: 0`, true about notes and false about
      // sound. One `fx.pappus {on:false}` took it to digital silence.
      //
      // ⚠️ `onlyIfIdle` SO A LIVE `grains` TAB IS NOT STAMPED ON. A closed tab
      // stops talking and is still cleared (`rig/box/insert-test.mjs`); an open
      // one is refused, out loud, with the holder and the ages in the reply.
      // That refusal is the only granulator line this page logs.
      // `archive/box-pappus/` has what was taken out and why.
      send({ type: 'fx.pappus', on: false, onlyIfIdle: true });

// ── the one log line, which fired when the board refused ─────────────────
      // 🔴 THE ONE CASE WORTH A LINE: THIS PAGE ASKED FOR THE GRANULATOR TO GO
      // AND IT IS STILL THERE. The board reports its insert in `fx.pappus`, in
      // `audio.started` and in the five-second `box.alive`, so a `/grains/` tab
      // in another window shows up here without this page asking for anything.
      // ⚠️ ONLY WHEN IT CHANGES, AND ONLY WHEN IT IS IN. Re-stating the same
      // fact every five seconds buries the log, and saying "there is no
      // granulator" to somebody who never met one is the page discussing a
      // thing it has no control over.
      if (m.fx !== undefined && m.fx !== insert) {
        insert = m.fx;
        if (insert) d.log(`a granulator is in the sound${m.fxBy ? `, put there by another page ${m.fxAgoSec} s ago` : ''}`
          + ' · this page has no control over it, so what you hear is not the instrument by itself', 'warn');
      }
