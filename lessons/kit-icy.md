# Kit lessons: icy

The longer comments cut from `demo/shell/icy.mjs` and `demo/shell/icy-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-icy.md#<anchor>`.

<a id="header"></a>

## `icy.mjs` module header

```text
demo/shell/icy.mjs — the SHOUTcast/Icecast in-band text channel, demuxed.

An Icecast response with `Icy-MetaData: 1` is not pure MP3. After every
`icy-metaint` bytes of audio comes ONE length byte (in units of 16) and that
many bytes of text — `StreamTitle='…';StreamUrl='…'` — and then audio again.
Almost every slot is EMPTY: a station only writes when something changes.
MEASURED on Raadio Tallinn: metaint 16000 at 128 kbps, so one slot per second
exactly, and 1 of 29 carried text over 25 s.

⚠️ THIS LIVED INSIDE `shout`'s PAGE AND WAS LIFTED HERE RATHER THAN COPIED.
A second page (`radio`) needed the same forty lines, and this repo has
paid twice for two copies of one function — `rowHTML` printed `undefined`
over every demo name for an afternoon, and `moq.mjs` held a URL that had been
renamed away. CLAUDE.md's rule is the reason this file exists: *"A control
that exists in one page and nowhere else is a component that has not been
noticed yet, not a special case."*

It is a pure byte demuxer: no fetch, no element, no DOM. Whoever owns the
stream feeds it chunks and gets callbacks; what to DO with a title is the
page's business, which is why `onTitle` is a callback and not a DOM write.
```

<a id="icydemuxer"></a>

## `icy.mjs` icyDemuxer

```text
@param {number} metaint  bytes of audio between metadata slots. 0 or NaN
  means the station sent no `icy-metaint`, and then `eat` is a no-op —
  deliberately, because a stream without the header is not broken, it is
  just not talking.
@param {{onTitle?: (t: string) => void, onSlot?: () => void,
         onMeta?: (text: string) => void,
         onAudio?: (bytes: Uint8Array) => void}} handlers
  onSlot fires once per slot INCLUDING the empty ones — which is the only
  way to know the channel is alive rather than merely quiet. onMeta fires
  only for slots that carried bytes. onTitle fires only when the title
  actually CHANGED, so a station that repeats itself does not look like a
  station that is doing something.

  🔴 onAudio HANDS BACK THE AUDIO WITH THE TEXT TAKEN OUT, and it was added
  the day a caller needed the samples rather than the titles. Until then both
  callers fed this demuxer purely to read the station's text and let an
  `<audio>` element fetch the SAME STREAM A SECOND TIME for the sound — so
  the audio bytes arriving here were simply dropped on the floor. When
  `/archive/radio/` had to decode for itself (WebKit does not route a media
  element into WebAudio — see mp3-stream.mjs), there was nowhere for the bytes
  to come out. ⚠️ A demuxer that throws away half of what it demuxes reads as
  complete right up until somebody wants the other half.

  It fires one or more times per chunk, in order, never across a metadata
  slot — so concatenating everything it emits is the pure MP3 stream.
@returns {(chunk: Uint8Array) => void}
```

<a id="no-metaint"></a>

## `icy.mjs` no metaint

```text
⚠️ NO `icy-metaint` MEANS EVERY BYTE IS AUDIO, not that there is nothing
to do. This returned early before `onAudio` existed, which was harmless
while the only product was titles and is a silent no-sound bug now.
```

<a id="spare"></a>

## `icy.mjs` spare

```text
⚠️ THE LEFTOVER IS THE WHOLE TRICK. A slot's length byte and its text can
land in different network chunks, so state has to survive a chunk
boundary — parsing each chunk independently loses a title roughly
whenever one straddles, which is silent and looks like a quiet station.
```

<a id="test-header"></a>

## `icy-test.mjs` icy-test module header

```text
demo/shell/icy-test.mjs — node demo/shell/icy-test.mjs

The demuxer was LIFTED out of `shout`'s page, and the audio branch was
rewritten on the way: the original kept every un-consumed audio byte in
`spare` and re-tested against a constant `need`; this one discards them and
decrements `need`. Equivalent in theory, 16 KB lighter, and exactly the kind
of "obviously the same" change that loses a title at a chunk boundary.

So: a synthetic Icecast stream, fed at every chunk size from 1 byte upward,
checked against what was put in. A title that straddles a chunk is the case
that matters and is the case a naive parser drops.
```

<a id="audio-out"></a>

## `icy-test.mjs` audio out

```text
── 🔴 THE AUDIO MUST COME BACK OUT, BYTE FOR BYTE ────────────────────────
`onAudio` is what `mp3-stream.mjs` decodes, so "the titles were right" says
nothing about whether the sound survived. The expected payload is every
`METAINT`-byte run with the text taken out; one byte of metadata left in it
is a click in the output, and one byte of audio dropped desynchronises the
MP3 frame scanner for ever after.
```

<a id="no-metaint-2"></a>

## `icy-test.mjs` no metaint

```text
⚠️ AND WITH NO `icy-metaint` EVERY BYTE IS AUDIO. This returned early before
`onAudio` existed — harmless while the only product was titles, and a
no-sound bug the moment somebody wanted the samples.
```

<a id="control"></a>

## `icy-test.mjs` wrong metaint control

```text
AND THE GUARD ITSELF: a deliberately broken demuxer must FAIL this test,
or the test is decoration. Feed it a stream built with the WRONG metaint.
```
