# Kit lessons: circuit-syx

The longer comments cut from `demo/shell/circuit-syx.mjs` and `demo/shell/circuit-syx-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-circuit-syx.md#<anchor>`.

<a id="header"></a>

## `circuit-syx.mjs` module header

```text
demo/shell/circuit-syx.mjs
A Novation Circuit SysEx stream, read: the 7 to 8 packing that carries whole
sessions over MIDI, and the command byte that says whether a file would write
flash.

🔴 NOTHING HERE SENDS ANYTHING ANYWHERE, AND NOTHING HERE PACKS. There is no
Web MIDI, no output port, no network call, and no function that turns bytes
INTO a SysEx stream. Reading one is safe. Building one is the first half of
sending one, so it does not exist. `circuit-syx-test.mjs` asserts the absence
over the exported names and over this file's own source text.

🔴 AND THE REASON THIS EXISTS IS A FILE THAT LIES ABOUT WHAT IT IS.
`on_the_run.circuitpack`, off archive.org, is NOT a zip. It is a bare SysEx
stream, and MEASURED it carries 64 patch messages whose command byte is `01`
on every one, at locations 0 through 63, all distinct. `01` is `Replace
Patch`, the one that writes FLASH, and those locations are every synth slot on
an instrument with no factory reset. `CLAUDE.md` says the 128 loose `.syx`
files in `purchased/` are safe because byte 6 is `00` on every one. That is
true of `purchased/` and it is NOT true of the wider archive.
✅ SO `survey()` ANSWERS THE SAFETY QUESTION FIRST, before anything else about
the file, and a page that opens one of these should show that answer before it
shows a single patch name.

✅ THE SESSION TRANSPORT IS GRADED, NOT ASSUMED. Decoded this way, **66 of 66
sessions** out of `on_the_run.circuitpack` and `factory_16.syx` parse AND
round trip byte identical through `demo/shell/circuit-session.mjs`. Those are
66 session images from two sources that have nothing to do with the owner's
instrument, which is a far harder grade than the owner's own 32.

⚠️ 33 SESSIONS PER FILE AND NOT 32, in both files measured. The Circuit has 32
slots. What the 33rd is, is NOT KNOWN. A scratch slot or the currently loaded
one are both readings and neither is measured.
```

<a id="messages"></a>

## `circuit-syx.mjs` messages

```text
Every `F0 ... F7` message in a stream, as views into the input.
⚠️ Bytes outside a message are skipped rather than refused, because these
files are concatenations and a stray byte between messages is not a reason to
refuse the 6,930 that parse.
```

<a id="sessionsin"></a>

## `circuit-syx.mjs` sessionsIn

```text
The 53,248 byte session images a stream carries, in order.
⚠️ A trailing partial session is DROPPED and counted rather than returned
half built, and `survey()` reports the count, because a short last session
returned silently is a wrong answer that looks like an empty one.
```

<a id="writesflash"></a>

## `circuit-syx.mjs` survey writesFlash

```text
🔴 FIRST, AND IT IS FIRST ON PURPOSE.
```

<a id="test-header"></a>

## `circuit-syx-test.mjs` circuit-syx-test module header

```text
demo/shell/circuit-syx-test.mjs
The SysEx stream reader, graded on a known signal first and on real files
second.

  node demo/shell/circuit-syx-test.mjs

🔴 THE UNPACKER IS GRADED ON A SYNTHETIC GROUP BEFORE IT IS POINTED AT A FILE,
WHICH IS THE `wobble-test.mjs` RULE. A floor proves an instrument does not
invent movement; only a KNOWN signal proves it can see any. Two builds of that
tool measured the wrong quantity and passed their floor perfectly. So the
first four asserts here decode a group whose answer is written out by hand.

🔴 AND THE REAL FILES ARE NOT IN THIS REPOSITORY AND MUST NOT BE. They came off
an archive.org item that carries no licence, and `purchased/` is gitignored for
the same reason. The file checks SKIP CLEANLY when they are absent, the way
`timeline/lab/csound-oracle.mjs` skips where Csound is not installed, and the
skip NAMES what goes unmeasured rather than passing quietly.
```

<a id="candidates"></a>

## `circuit-syx-test.mjs` CANDIDATES

```text
🔴 THE FILES ARE LOOKED FOR IN `purchased/` FIRST AND A SCRATCHPAD SECOND,
AND THE ORDER IS THE POINT. A scratchpad path is session specific and gets
swept, so a test that only knows one is a test that silently stops measuring
anything the day the directory goes. `purchased/` is gitignored, durable, and
already the documented home for third party material that is not ours to
publish.
⚠️ NOTHING IS COPIED THERE BY THIS FILE. It looks, it does not move, because
`on_the_run.circuitpack` writes flash on all 64 synth slots and deciding where
that file lives is not a test's decision to make.
```

<a id="tmp-purchages"></a>

## `circuit-syx-test.mjs` tmp/purchages

```text
⚠️ `tmp/purchages` SINCE 2026-09-21, asked for by name. `tmp/` is ignored
as a whole, so the durability argument this file makes is unchanged: a
directory git never sees cannot be swept by a clean.
```

<a id="mask"></a>

## `circuit-syx-test.mjs` mask 0x15

```text
🔴 mask 0x15 is bits 0, 2 and 4, so data bytes 0, 2 and 4 get their high bit
back and the other four do not. Worked out on paper, not by running the code.
```

<a id="short-group"></a>

## `circuit-syx-test.mjs` short final group

```text
⚠️ 293 IS NOT A MULTIPLE OF 8, AND THE LAST GROUP IS SHORT ON PURPOSE.
36 whole groups carry 252 bytes and the 37th carries 4, which is 256.
```

<a id="mask-control"></a>

## `circuit-syx-test.mjs` mask negative control

```text
🔴 THE NEGATIVE CONTROL ON THE KNOWN SIGNAL. A decoder that ignored the mask
entirely would pass "it returns 7 bytes" and fail here.
```

<a id="sessions"></a>

## `circuit-syx-test.mjs` session images

```text
✅ THE GRADE THAT MATTERS: 33 session images from a file that has nothing
to do with the owner's instrument, through the container model.
```

<a id="safety"></a>

## `circuit-syx-test.mjs` on_the_run safety

```text
🔴 THE SAFETY READING, AND IT IS THE FIRST THING A PAGE SHOWS.
```

<a id="sabotage"></a>

## `circuit-syx-test.mjs` reversed mask sabotage

```text
🔴 THE SABOTAGE THAT PROVES THE PACKING DIRECTION IS MEASURED AND NOT
ASSUMED. Read the mask the other way round, bit 6 minus k instead of bit k,
and the same 6,864 carriers still produce 33 files of exactly 53,248 bytes.
The length is no evidence at all. What collapses is the content.
```

<a id="no-packer"></a>

## `circuit-syx-test.mjs` no packer

```text
🔴 AND THE ONE THAT IS SPECIFIC TO THIS MODULE: THERE IS NO PACKER. An
unpacker is a reader. A packer is the first half of a sender.
```
