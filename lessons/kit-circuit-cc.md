# Kit lessons: circuit-cc

The longer comments cut from `demo/shell/circuit-cc.mjs` and `demo/shell/circuit-cc-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-circuit-cc.md#<anchor>`.

<a id="header"></a>

## `circuit-cc.mjs` module header

```text
demo/shell/circuit-cc.mjs — every synth parameter a Novation Circuit will
take over an ordinary control change, and which channel it listens on.

🔴 GENERATED FROM NOVATION'S CIRCUIT PROGRAMMER'S REFERENCE GUIDE v1.1, by
parsing the document rather than by reading its tables by eye. **98 control
change parameters**: 52 for the synths, 28 for the drums, 18 for the session.
The document also carries 276 NRPN parameters, which are four messages each
and are not here yet.

🔴 WHY THIS MATTERS MORE THAN IT LOOKS: an editor built on this needs NO
SysEx at all, and therefore **cannot touch flash**. `plans/plan-circuit-editor.md`
§1: `Replace Current Patch` and `Replace Patch` differ by one byte at offset
6, and the second one overwrites a patch permanently on a device with no
factory reset. Nothing reachable through this table can do that.

🔴 THE CHANNEL IS PART OF THE ADDRESS AND IS NEVER DROPPED. `ch: '1/2'` means
Synth 1 on channel 1 and Synth 2 on channel 2; `'10'` is the drums; `'16'` is
the session, which is where the master filter lives. **CC 74 is the synth
filter on 1 and 2 AND the master filter on 16, and CC 80 is macro knob 1 on
channel 1 and drum 4 pan on channel 10.** A table keyed by controller number
alone would merge them, which is `plans/plan-device-layouts.md` §5.3's rule
with a worked example.

⚠️ A RANGE HERE IS THE WIRE'S RANGE, NOT THE READING. Several parameters are
centred: `52 - 76` means -12 to +12 semitones with 64 at the middle. The
document's own notes carry the mapping; this keeps the numbers a page has to
send.

🔴 `sec` IS THE DOCUMENT'S OWN `Section` COLUMN, AND 28 OF THESE ROWS CARRIED
A HEADING OFF THE PREVIOUS PAGE UNTIL 2026-09-21. They read `song select`.
MEASURED that day against the Programmer's Reference on this disk, in the
PDF's own coordinates: the Synths 1 & 2 table on page 3 and the Session
Control table on page 11 both open with a `Section` column at the left edge,
x=47.1 and x=46.85, and every value here for `'1/2'` and `'16'` is one of
those cells verbatim. **The Drum Control table on page 10 has no `Section`
column at all.** Its first column header is `Parameter` at x=140.1, and the
only thing printed above those 28 rows is the page heading `Drum Control` at
x=41.3. So a parse carrying the last section forward met nothing that could
overwrite it, and what it was still holding was `song select`, the last row
of the `Supported System Common Messages` table at the foot of page 9. In
plain `pdftotext` reading order that string is the line immediately before
`Drum Control`.
⚠️ AND THE TELL WAS THE CASE, VISIBLE WITHOUT OPENING THE PDF. Every
`Section` cell in that document is Title Case and every message name is lower
case, so `song select` was the one lower case value in a column of `Voice`,
`Oscillator` and `Master Filter`. `circuit-cc-test.mjs` asserts that shape
now, so the next leak of this kind fails a test rather than reaching a page.
⚠️ `Drum Control` IS A TABLE HEADING RATHER THAN A `Section` CELL, which is a
real mismatch with the ten other names in this column and is said here rather
than hidden. It sits at the level of `Synths 1 & 2` and `Session Control`,
not at the level of `Voice`. It is the closest thing the document prints over
those rows, and the document prints nothing else.
⚠️ THE FOUR DRUMS ARE NOT FOUR SECTIONS HERE, BECAUSE THE DOCUMENT DOES NOT
MAKE THEM ONE. Their names carry the part, and a page wanting a panel each
regroups in the page, the way `/shape/` splits one `Oscillator` into `OSC 1`
and `OSC 2`. Novation's own panel prints four track buttons reading `Drum 1`
to `Drum 4` under a `DRUMS` bracket (`plans/plan-panel-layouts.md` §2.1), so
that split has a source. It is a presentation decision and it does not belong
in the wire's own record.

🔴 THERE IS NO GENERATOR IN THIS REPOSITORY, SO THIS TABLE IS HAND EDITED
FROM HERE ON AND NOTHING WILL SILENTLY UNDO THE LINE ABOVE. The parse was ad
hoc inside one session and only its output was committed. The flip side is
that a future re-parse reproduces the bug unless it is told not to: **a
section is only ever the value of a `Section` COLUMN, so the carried value is
cleared at every table heading rather than held across one**, and a table
without that column has no section to give.

⚠️ THE HEADER ABOVE SAYS v1.1 AND THE ONLY COPY ON THIS DISK IS v1.3, which
is what the paragraphs above were checked against:
`~/Downloads/Files/2025-01/Circuit Programmer's Reference Guide 1.3_2.pdf`.
MEASURED: 95 of these 98 rows appear in v1.3 with the same name and the same
controller number, and v1.3 carries no control change row this table lacks.
The three that did not match are `macro knob 1`, `2` and `3 position`, which
fall inside a region of pages 5 and 6 that `pdftotext` cannot read at all.
Their numbers are CC 80, 81 and 82 by this desk's own sweep rather than by
the document, which is the assert below. **Nobody has compared v1.1 against
v1.3 here, and no copy of v1.1 was fetched to do it.**
```

<a id="param"></a>

## `circuit-cc.mjs` param

```text
One parameter, by channel group and controller number.
⚠️ BOTH ARGUMENTS, ALWAYS. Asking for CC 74 without a channel is asking a
question with two right answers.
```

<a id="test-header"></a>

## `circuit-cc-test.mjs` circuit-cc-test module header

```text
demo/shell/circuit-cc-test.mjs — the Circuit's control change table.

  node demo/shell/circuit-cc-test.mjs

🔴 THE POINT OF THIS FILE IS THAT IT CHECKS THE TABLE AGAINST A DIFFERENT
SOURCE FROM THE ONE IT CAME FROM. `circuit-cc.mjs` was parsed out of
Novation's Programmer's Reference Guide. Every assertion below that names a
number compares it against something THIS DESK measured through `/dump/` and
wrote into `research/measured-devices-2026-09-20.md`. A test that re-derived the
numbers from the same document would catch a typo and could never catch a
misreading, which is exactly what `timeline/csound.mjs` was 22/22 green
about for months.
```

<a id="macros"></a>

## `circuit-cc-test.mjs` macros

```text
MEASURED here on 2026-09-20: 583 messages, a full sweep, every macro seen.
```

<a id="master-filter"></a>

## `circuit-cc-test.mjs` master filter channel

```text
MEASURED here: the master filter answers on channel 16 and nowhere else.
🔴 AND THE SAME CONTROLLER NUMBER MEANS SOMETHING ELSE ON THE SYNTHS, which
is the whole reason this table is keyed by a pair.
```

<a id="cc80"></a>

## `circuit-cc-test.mjs` CC 80 collision

```text
🔴 THE COLLISION THAT PROVES THE KEY. CC 80 is macro knob 1 on the synths
and drum 4 pan on channel 10, in one instrument.
```

<a id="drum-sections"></a>

## `circuit-cc-test.mjs` drum sections

```text
🔴 ALL 28 DRUM ROWS READ `song select` UNTIL 2026-09-21. `circuit-cc.mjs`'s
   header carries the measurement; the short version is that the Drum Control
   table on page 10 has no `Section` column, so a parse carrying the last
   section forward was still holding the foot of page 9.
   ⚠️ AND THIS ASSERT IS A DOCUMENT CLAIM RATHER THAN A MEASUREMENT, which is
   unlike every assert above it and is worth saying out loud. This desk has
   never measured a drum control change at all: `research/measured-devices-2026-09-20.md`
   has channel 10 as notes 60, 62 and 64 at a fixed velocity of 96 and nothing
   more, so there is no second source to hold the drums' section against.
```

<a id="not-sections"></a>

## `circuit-cc-test.mjs` NOT_SECTIONS

```text
🔴 A NEGATIVE CONTROL FOR THE WHOLE COLUMN RATHER THAN FOR THE DRUMS. What
   failed was a heading from a NEIGHBOURING table leaking in, so the guard is
   the things that sit beside the parameter tables and are not sections: the
   reference's Supported Realtime and Supported System Common message names.
   Put `song select` back on any one row and this goes red.
```

<a id="lower-case"></a>

## `circuit-cc-test.mjs` lower case sections

```text
⚠️ AND THE CHEAPER TELL, WHICH WAS ON SCREEN FOR A DAY BEFORE ANYBODY
   OPENED THE PDF. The reference sets every `Section` cell in Title Case and
   every message name in lower case, so a lower case section is a value that
   came from somewhere other than the Section column.
```

<a id="clamp"></a>

## `circuit-cc-test.mjs` clamp

```text
⚠️ CLAMPED RATHER THAN WRAPPED. A value of 200 that wraps to 72 is a
parameter moving to somewhere nobody asked for, which reads as a broken
instrument rather than a broken number.
```

<a id="no-flash"></a>

## `circuit-cc-test.mjs` no flash

```text
🔴 NOTHING IN THIS TABLE CAN WRITE FLASH, and that is the safety claim an
editor built on it rests on. Every row is a control change, so the only
status byte reachable is 0xB0.
```
