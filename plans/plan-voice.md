# plan-voice — "split my keyboard, bass below, pads above"

Status: **not started.** Written 2026-09-10 from a spoken request, against a box
that now exists in `rig/board` (38/38 + 13/13 green) and a multitimbral instrument
that was proved on arm64 Linux the same day.

Read `plans/plan-hardware.md` §8 first. This is §8.3 and §8.4 taken from a metaphor to
one worked example.

---

## 0. The request, as I read it

> "I want my current MIDI keyboard to split. In the lower end, give me some
> beefy bass. In the upper, some nice atmospheric pads."

One sentence. It contains **five** decisions, only two of which were spoken:

| decision | said? |
|---|---|
| which keyboard | no — "my current" |
| where the split falls | **no** |
| what "beefy bass" is | no — an adjective, not a program |
| what "atmospheric pads" is | no — same |
| that there are two zones | yes |

Everything unstated has to be **chosen and then said back**, never chosen
silently. §5 is about why that is the whole design and not a nicety.

---

## 1. What already exists, and what is missing

Green today, in `rig/board`:

- a **document that is checked before it is applied**, with a `plan` twin that
  changes nothing (`patch.plan` / `patch.apply`)
- a **naming layer** — "circuit" resolves to `20:0`, ambiguity is reported
  rather than broken by picking the first match
- a **multitimbral instrument** — FluidSynth, 16 channels, 16 programs, driven
  over the relay, with named voices (`bass`, `pad`, `strings`, …)
- a check that **changing the voice changes the sound**, not merely the config

Missing, and it is small:

- **zones.** A note range mapped to a channel. This is the new document.
- **adjectives.** "beefy", "atmospheric" — §4.
- **the spoken half.** §3.

---

## 2. A split is a value, like a patch

```jsonc
{ "v": 1, "name": "bass under, pads over",
  "source": "arturia",                    // resolved against real ports
  "zones": [
    { "to":   59, "voice": "synthbass", "channel": 0, "transpose": -12 },
    { "from": 60, "voice": "warmpad",   "channel": 1 }
  ] }
```

Same rules as the patch document, for the same reason — **a wrong split is
almost silent.** Half the keyboard plays the wrong instrument, or nothing, and
nothing errors.

- every `voice` resolves to a real program in the loaded soundfont, or is named
  unresolvable
- zones that **overlap** or leave a **gap** are reported, not silently layered
  or silently deaf
- `source` resolves against ports ALSA actually reports
- two zones on one channel is refused: the second program change wins and one
  zone would silently sound like the other

⚠️ **`transpose` is not decoration.** "Beefy bass" played in the left hand of a
61-key controller is often an octave above where a bass belongs. Getting this
wrong sounds like a bad patch rather than a wrong setting, so it is part of the
document and part of what gets said back.

---

## 3. Where each part runs

    phone or laptop            Cloudflare              the box
    ---------------            ----------              -------
    speech -> text             text -> document        document -> zones
    (Web Speech API)           (Workers AI)            (validated, applied)
                                                       notes -> channels
                                                       audio -> relay

**Not on the box.** `plan-hardware` §8.3 already argued it: the Pi has no
microphone, 2 GB of RAM, and no reason to hold a model. It also must not be
able to *need* one — the box has to work when the voice half is down, driven by
`ask.mjs`, a browser, or a phone.

**The box validates regardless of who wrote the document.** A model that
produced it is one more untrusted client. This is `plan-score`'s rule and the
reason `patch.plan` exists: never let a generated thing be authoritative over a
thing that can be checked.

---

## 4. The adjective problem, which is the actual work

"Beefy bass" is not a program number. GM has eight basses and the difference
between 38 *Synth Bass 1* and 39 *Synth Bass 2* is not something anyone says
out loud.

Three layers, cheapest first:

1. **A vocabulary the box owns.** `bass`, `pad`, `rhodes`, `strings` already
   exist in `fluid.mjs`'s `VOICES`. Extend it with the words people actually
   use — `beefy`, `warm`, `bright`, `dark`, `airy` — as *modifiers* over a
   family, not as separate entries.
2. **A model picks within the family**, given the real program list read from
   the loaded soundfont. Not from memory of General MIDI: soundfonts differ,
   and a program that is a pad in one is a sound effect in another.
3. **Correction is a first-class move**, because 1 and 2 will be wrong often.
   "warmer", "less", "an octave down" must work as follow-ups against the
   document just applied.

⚠️ **Do not let the model emit program numbers directly.** It should choose a
*name* from a list the box supplied, so an unknown name is a caught error rather
than a wrong instrument. This is the same rule as refusing `carry` rather than
approximating it.

---

## 5. The reply is the interface

The box must answer in the words the request used:

> *"Synth Bass 2 below B3, dropped an octave. Warm Pad from middle C up."*

Three things this buys, none of them cosmetic:

- **the unstated decisions become visible** — the split point and the transpose
  were never spoken, and this is the only moment they can be corrected
- **it is the acceptance test.** If the box cannot say what it did, it does not
  know, and something applied a guess.
- **it makes correction cheap.** "No, lower" is a sentence; opening a UI is not.

**No confirmation step.** A split is instant, audible and reversible — applying
it and saying so is faster and more honest than asking first. `plan` stays
available for the cases where you want to look before it lands.

---

## 6. What ALSA cannot do — the same wall as `carry`

**A split cannot be expressed in `aconnect`.** An ALSA subscription carries
every message the source emits: no note-range filter, no channel remap, no
transpose. This is the same finding as `carry` (§8.4, narrowed 2026-09-10) and
it lands the same way — the box does it in **JS**, per note, reading MIDI in and
choosing a channel out.

⚠️ That makes the box the note path, which §8.4 warns against. Accept it here,
and keep the warning where it belongs:

- **notes** may go through the box. A range test and a channel assignment cost
  microseconds, and the box is already the note path for the relay.
- **clock and transport must not.** Route them direct, and measure the jitter
  the box adds before trusting it with anything timing-shaped.

---

## 7. Traps

- **A zone that resolves but never sounds.** The keyboard is connected, the
  document is valid, the program change went out — and the zone is silent
  because nothing was patched into the box's input. Check the *sound*, per zone,
  the way `fluid-test.mjs` checks that two voices differ. A valid document is
  not a working instrument.
- **Both zones sounding the same** is the signature failure of a program change
  that did not take. It reads as "the split did not work" and it is not that.
- **Gaps and overlaps.** `to: 59` and `from: 61` leaves middle C dead. Refuse.
- **Speech gets the number wrong.** "F sharp three" and "F sharp 3" and "F#3"
  are one thing; "below middle C" is another. Resolve note names in the box,
  where they can be checked, not in the model.
- **The correction must address the same document.** "Warmer" applied to a
  stale copy re-applies whatever else has changed since.
- **Do not make voice the only way in.** Everything here must be reachable from
  `ask.mjs` with a JSON document. Voice is a *client*, exactly like the browser.

---

## 8. Build order

**P1 — zones in the box.** The document, its validation, and note routing to
channels. Testable with no hardware and no voice: send `note.on` over the relay,
assert it lands on the right channel with the right program. This is most of
the value and none of the risk.

**P2 — say it back.** The box returns a sentence describing what it applied.
Also with no voice.

**P3 — text to document.** A Worker, given the box's real port and program
lists. Typed input first — voice adds nothing to this step and hides its errors.

**P4 — speech to text.** Web Speech API in the browser. Last, because it is the
only part that is somebody else's model and the only part that cannot be tested
deterministically.

**P5 — correction.** "warmer", "lower", "an octave down" against the standing
document.

Each step is usable alone. P1 and P2 make a keyboard split that is driven by
typing, which is already the thing asked for minus the microphone.

---

## 9. Definition of done

1. A split document is validated against real ports and a real soundfont, and
   gaps, overlaps and channel collisions are refused with the reason in words.
2. Notes below the point play one program, above it another, **verified by the
   audio differing**, not by the config.
3. The box says what it did in a sentence, including the decisions nobody spoke.
4. Everything works from `ask.mjs` with no browser and no microphone.
5. Clock and transport are still routed direct, and the jitter the box adds to
   notes is measured rather than assumed.
