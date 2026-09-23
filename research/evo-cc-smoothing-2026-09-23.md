# Are the MK-425C's rotaries smoothed? Measured 2026-09-23

**No. They are sampled and reported, not chased.** Measured off the wire on the
unit on this desk, 5,228 control messages over 72.4 s, all eight rotaries swept
end to end at two deliberate speeds.

Asked as *"can you detect cc smoothinng. tap and measure when i turn c1-c8 on
evi"*.

## Why the question needed a measurement at all

A knob is a potentiometer read by an ADC, and between the two there may be
**nothing, a filter, or a rate limiter**. 📄 **None of the three manuals says
which.** They describe what the knobs SEND and never how they are read, and
`research/evo-mk425c-face-2026-09-21.md` records every printed reading without a
word on sampling.

🔴 **AND IT IS ANSWERABLE OFF THE WIRE AND ONLY OFF THE WIRE.** Everything
downstream of `/evo/`'s `take()` has already thrown the timing away, so the tap
records raw control messages with timestamps and nothing else:
`demo/evo/index.html` behind `?rec=1`, read back by
`demo/resources/read-evo-take.mjs`.

## The three signatures, and why they do not overlap

| | what it looks like on the wire |
| --- | --- |
| **nothing** | steps jump by whatever the hand did, and a FASTER sweep produces FEWER messages |
| **a filter** | steps are 1 almost always, and the wire speed is CAPPED however fast the hand goes |
| **a rate limiter** | gaps are near constant whatever the hand does, and the step size varies |

## The decisive reading

**A move's wire speed is how much value it covered per second. Its density is how
many messages it spent per unit of value.** Unsmoothed, density falls as speed
rises, because the hand outruns the scanner. Filtered, density holds, because the
output is running at its own rate.

```
cc  moves  slowest  fastest  spread  density hi->lo
  5      2       50       70     1.4  2.17 -> 1.41
 71      2       64      119     1.9  1.01 -> 0.94
 72      2        8       19     2.4  12.09 -> 1.74
 73      4       15      155    10.5  6.02 -> 1.14
 74      1       20       20     1.0  5.09 -> 5.09
 84      2       59      112     1.9  1.23 -> 1.02
 91      2        7       55     7.6  17.54 -> 2.24
 93      3       28      101     3.6  2.10 -> 1.31
```

🔴 **CC 73 WENT 10.5 TIMES FASTER ON THE WIRE AND ITS DENSITY FELL TO 22 PER
CENT.** A filter or a rate limiter cannot do that: capping the output is the
whole of what they are. CC 91 is the same story at 7.6 times and 13 per cent.
**The wire is not capped**, and the fastest it ever went was **155 units/s**.

## The corroboration

**45 per cent of steps skip at least one value**, with a single jump of **15**.

```
step size:  1 -> 2858   2 -> 1175   3 -> 585   4 -> 238   5 -> 118   ...   max 15
```

A smoothed output steps by one almost always, because it is interpolating toward
a target it has not reached. This one reports where the knob is.

## What else the take says about the hardware

⚠️ **THE SCAN RUNS AT ROUGHLY 150 TO 200 Hz**, which is fast for a 2004
controller. The gap histogram has a floor and a clear mode: **min 2 ms, median
6 ms, commonest 5 ms**. That is why a slow sweep looks so dense: CC 91 spent
**17.5 messages per unit** at 7 units/s, the knob barely moving while the scanner
kept reporting.

✅ **ALL EIGHT SWEPT THE FULL 0 TO 127.** No knob has a dead zone or a clipped
range.

## A test in the tool that does not work, recorded so nobody trusts it

🔴 **`N of N moves end in four single unit steps, which is what a filter settling
looks like` FIRED ON SEVEN OF EIGHT KNOBS AND MEANS NOTHING.** A hand
decelerating to a stop produces exactly the same signature as a filter settling,
so the test is confounded and cannot separate the two. It is still printed,
because removing it quietly would leave the next reader to re-derive that it is
useless, but **the density reading is what carries the result and it says the
opposite**.

## A hole this found in the tool before any real take existed

🔴 **THE OBVIOUS TEST IS BROKEN BY THE THING IT IS TESTING FOR.** The first
version asked *did density hold while the hand sped up*, and **a filtered knob
never lets the hand speed up on the wire at all**. Graded on a synthetic filtered
knob, a frantic sweep and a slow one arrived as the same stream and the
comparison had nothing to compare.

✅ **SO A NARROW SPREAD IS THE INTERESTING CASE, NOT THE USELESS ONE**, and the
tool cannot tell it from *you only turned at one speed*, because nothing on the
wire says what the hand did. It prints both readings and asks. That is why the
instruction to record is *slowly, then as fast as you can*, and why CC 74 above,
with one move and a spread of 1.0, says nothing at all.

## What this does not settle

⚠️ **IT IS THIS UNIT, THROUGH THIS BROWSER.** Another MK-425C may differ, and the
timestamps are `performance.now()` at the Web MIDI boundary rather than at the
cable, so the 2 ms floor is a floor on what is observable here and not proof of
the scanner's own period.
⚠️ **NOTHING HERE CAME FROM A MANUAL**, and no manual contradicts it either,
because none of them discusses sampling at all.
⚠️ **AND IT SAYS NOTHING ABOUT THE WHEELS.** Pitch bend on this instrument is
seven bit inside a fourteen bit message, measured separately at 106 messages with
an LSB of 0 on every one, and the mod wheel was not part of this take.
