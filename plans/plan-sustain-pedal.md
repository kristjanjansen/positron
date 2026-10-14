# Sustain pedal: what the owner's presses measured, and what the looper should do about it

Status (2026-10-14): done. demo/code/piano/index.html ignores a press within SPRING_MS 70 of a release, refuses loops under MIN_LOOP_MS 500 and clears on a hold, at https://positron.studio/code/piano/.

2026-10-11. Asked: *"i want to copy and analyze sustain now, hardness to double
etc"*, then *"sustain analysis?"* and *"what about sustain pedal anaysis"*.

The reading behind this (pedal hardware, foot timing, what loopers do) is
`research/sustain-pedal-pressing-2026-10-11.md`, sections 1 to 4. Section 5
there is the measurement below in full. This plan is the short form and the
decisions it asks for.

| tag | means |
| --- | --- |
| **MEASURED** | computed in Node from the owner's pasted 015 export, 2026-10-11 15:23 |
| **INFERRED** | follows from the measurement, not tested on its own |
| **PROPOSED** | a change nobody has built yet |

## Verdict

The pedal is not the main problem. **The MK-425C reads its pedal jack only
about 15 times a second (every 65.95 ms)**, so a light quick tap can fall
between two looks, a double tap cannot be faster than 132 ms, and every pedal
time on this keyboard is right only to within 66 ms. The looper on
`/concepts/sampler/020/` treats every press as the next step, so an extra
press (a spring back, or a double that came out as a triple) flips it into
the wrong state. Three small changes to 020 make it forgiving; a faster pedal
interface is the only cure for the 66 ms.

## 1. The run (MEASURED)

74 CC 64 messages, 37 presses, MK-425C USB MIDI Keyboard, channel 2, values 0
and 127 only (a switch pedal), polarity normal, no repeated values.

- **Every message is within 1.81 ms of a 65.95 ms grid.** Phase lock 0.9974
  over all 74. 015 stamps each message with the event's own `timeStamp` and
  rounds nothing, so the grid is the keyboard's scan, about **15.2 Hz**.
- **How long the pedal was held**, in scan ticks:

  | ticks | ms | presses |
  | --- | --- | --- |
  | 1 | 66 | 13 |
  | 2 | 132 | 16 |
  | 3 | 198 | 6 |
  | 4 or 5 | 264 to 330 | 2 |

- **Foot up before the next press, inside a burst:** 1 tick 3 times, 2 ticks
  14 times, 3 or 5 ticks twice.
- **Bursts** (presses whose gap is at most 6 ticks): **18 bursts, 6 single,
  6 double, 5 triple, 1 quadruple.**
- **Three re-presses one tick after a release**, at 43.72 s, 45.30 s and
  47.68 s, each right after a short press.

## 2. What it means (INFERRED)

- **"Heavy to push"**: a third of the presses were seen for one tick, so they
  lasted under about 130 ms. A tap shorter than one tick can be missed
  entirely. A firm, slightly longer press is what this keyboard needs.
- **"Doubles are hard"**: the fastest possible double is 132 ms press to
  press (down one tick, up one tick); the owner's usual double was 264 ms. If
  every burst was meant as a double, only a third came out as two presses.
- **The one tick re-presses** look like the pedal springing back after a
  short press, or a contact bouncing on release. At a 66 ms scan they cannot
  be told apart from a deliberate press.
- **Loop timing**: a loop taken press to press is right only to plus or
  minus one tick, 66 ms, on this keyboard, whatever the page does.

## 3. What 020's looper should do (PROPOSED)

Today 020 flips between *start recording* and *loop* on every press. The
export shows the damage: *"020 would loop 0.132 s"* and *"0.199 s"*, loops
made from a spring back or the third press of a double.

1. **Ignore a press within one tick, about 70 ms, of a release.** That is the
   spring back signature measured above, and nothing finer is visible anyway.
2. **No loop shorter than about 0.5 s.** A press that would close a loop
   under that keeps recording instead. (Boss uses 0.25 s; 0.5 s also covers a
   spring back plus one tick.)
3. **Optional, only if a second action is wanted: a burst of presses within
   about 400 ms is one gesture.** One press records or closes the loop; two or
   more could clear it. The research note recommends NOT adding a double at
   all and using a long hold (about 1 s) for clear, because a hold acts on the
   press at once and never waits to see if a second press is coming. That
   choice is the owner's.

## 4. To decide

- **Build 1 and 2 in 020?** They change nothing for a clean single press.
- **Clear on a double, on a hold, or not at all?**
- **Hardware:** a pedal into a faster interface (the Pi's MIDI, or a
  continuous pedal on a keyboard that reports it finely) is the only way past
  66 ms. Worth trying only if the looper's timing still feels off after 1 and 2.

## 5. Not measured yet

- **Whether the MK-425C's notes are on the same 66 ms grid**, or only the
  pedal. One 015 run with a few key presses settles it.
- The four short tests in the research note, section 4 (polarity, fastest
  taps, counted presses, steady beat), were not run as such; this was a free
  run.
- Which edge, press or release, is steadier for this foot.
