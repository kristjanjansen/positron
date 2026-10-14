# Page comments: typist

The full comments cut from the code under demo/ for typist, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="typist-1"></a>
## typist-1: demo/typist/machines/fx.mjs, module, line 1

````js
// demo/typist/machines/fx.mjs: the fx box of /typist/machines/.
//
// Typewriter characters made from ONE Hermes Precisa 305 sample set, one per
// positive index, every one generated from its number by the same logic
// (asked: *"why handtuned? just universal logic?"*). A character is two
// halves, and they live where each can be done:
//   - `rate`, a playback rate per key type (letter, space, return, bell,
//     delete). Pitch and length belong to the sampler, because a buffer's rate
//     is set where it starts. The typewriter takes it from its own index input.
//   - everything else, a chain of filters, a body, a little drive and a short
//     room, built here as WebAudio nodes on the fx box.
// The box builds the chosen chain on a switch and ramps the old and the new
// output gains over FADE seconds, so a change in the middle of a strike does
// not click. The same `chain()` runs on an OfflineAudioContext, which is how
// the characters are measured against each other.
````

<a id="typist-2"></a>
## typist-2: demo/typist/machines/fx.mjs, module, line 76

````js
/**
 * The character for an index, 1 based, GENERATED from the index with no
 * special case, so the same index is always the same machine and every index
 * is a different one.
 * ⚠️ THE MAIN DIMENSIONS ARE A LOW DISCREPANCY SEQUENCE, NOT RANDOM DRAWS.
 * Seeded draws gave neighbours that sounded alike (2, 5 and 7 all keyed near
 * 1.2). Each main dimension k puts index n at frac(0.5 + n * a_k), a_k an
 * irrational step (the golden ratio for the pitch, square roots for the rest),
 * which spreads any run of consecutive indices evenly and never repeats
 * exactly; a seeded draw (mulberry32, `shell/seed.mjs`) only
 * jitters it and picks the minor things. Every range still sounds like a
 * typewriter, and the level comes down as the boosts and the drive go up, so
 * no index is broken or much louder than another.
 */
````

<a id="typist-3"></a>
## typist-3: demo/typist/machines/fx.mjs, module, line 94

````js
// 🔴 MACHINE 0 IS THE ORIGINAL (asked 2026-10-11, *"machine 0 should be
// original (no paramter to fx)"*, *"or disabed / enabled signal you choose"*):
// the index stays the one signal, and 0 means the fx box passes the sound
// through untouched, every key at its recorded pitch. 1 and up are generated.
````

<a id="typist-4"></a>
## typist-4: demo/typist/machines/fx.mjs, module, line 100

````js
/**
 * 🔴 DISTINCT, 0 TO 1: HOW FAR A MACHINE IS FROM THE ORIGINAL (asked 2026-10-11,
 * *"2 and 8 sounds too extreme. make it more closer to original in general.
 * distictivness as sepaate knob"*). Every parameter is drawn as before for the
 * index, then blended toward the original by `amt`: pitch in log steps toward
 * 1, the filters toward wide open, shelf, peak, drive and room toward none,
 * the grit toward 16 bits. 0 is the original for every index, 1 the full
 * machine. DISTINCT is the default.
 */
````

<a id="typist-5"></a>
## typist-5: demo/typist/machines/fx.mjs, module, line 137

````js
  // 🔴 NARROWER RANGES SINCE 2026-10-11, NOTHING METALLIC OR THIN. Asked:
  // *"2 is reall metally, do not like"*, *"4 is metally and htin too"*, *"do not
  // like those"*. At full distinctness 2 had a +5.9 dB peak at 3.7 kHz, Q 2,
  // with drive, and 4 played 1.74 times fast through a 3.4 ms comb. So: pitch
  // 0.8 to 1.15 (faster reads as thin and toy), the peak only in the body,
  // 150 to 1500 Hz, gentle and broad, no comb, no bit grit, a light drive on a
  // third of them, a low pass that only darkens, a small quiet room. Machines
  // differ in pitch, body, warmth and room.
````

<a id="typist-6"></a>
## typist-6: demo/typist/machines/fx.mjs, module, line 161

````js
/** Every index is named by its number (asked: *"all machine n's"*). */
````

<a id="typist-7"></a>
## typist-7: demo/typist/machines/fx.mjs, module, line 164

````js
/**
 * The fx box on a live context. `set(n)` builds that index's chain, feeds it,
 * ramps its output up and the old one's down over FADE, and drops the old
 * chain once the ramp is over, so at most two chains work, and only for the
 * length of a fade. Any positive index is a machine.
 */
````

<a id="typist-8"></a>
## typist-8: demo/typist/machines/fx.mjs, module, line 255

````js
/**
 * THE LOUDNESS TRIM. The ranges above make every machine sound like a
 * typewriter but not equally loud: MEASURED before this, one strike through
 * indexes 1 to 12 ranged from 0.0064 to 0.047 RMS, 17 dB, and the quiet ones
 * read as broken. So each index is measured once, offline, on a letter
 * strike, and given the gain that brings it to the original strike's loudness, within 0.5 to 4.
 * Cached per index, so a switch back costs nothing.
 */
````

<a id="typist-9"></a>
## typist-9: demo/typist/machines/index.html, style, line 12

````css
  /* concepts typist/020, TYPEWRITERS, 2026-10-11. 010's paper and sampler,
     with the sound going through an fx box of its own. Asked: *"do 020 as
     multiple sounds, ... can i be separate fx box takes audio in / out and
     index or smth?"*, then *"can be more than 4, support somehting that makes
     sense and then repeating. or unique all the time, choose"* (unique was
     chosen), *"only keep stepper"*, *"all machine n's"* and *"why
     handtuned? just universal logic?"*. So `web:fx` takes audio in, audio out
     and an index on `value-in`, and a stepper (`web:pick`) sends it any
     positive number, each one a machine generated from that number by one
     rule (`fx.mjs`). The samples are 010's,
     the same nine CC0 cuts of a Hermes Precisa 305 in R2, provenance in
     `../typewriter/SOURCES.md`. Nothing is fetched until the first key press. */
````

<a id="typist-10"></a>
## typist-10: demo/typist/machines/index.html, inline script, line 77

````js
  // ── the typewriter: a sampler of one Hermes Precisa 305 ─────────────────
  // Nine short files from our R2 bucket, decoded once into AudioBuffers and
  // played with one AudioBufferSourceNode per key, so a press costs no fetch
  // and no decode. NOTHING OPENS ON A VISIT: the AudioContext is made and the
  // files are fetched on the first key press, which is also the gesture a
  // browser needs before it lets a page make sound.
  // R2, through the station worker's /media/ door, which answers CORS for any origin.
````

<a id="typist-11"></a>
## typist-11: demo/typist/machines/index.html, inline script, line 169

````js
    // The press that wakes the typewriter always sounds, however long the
    // samples took (asked 2026-10-11, *"first typing is not hear"*); only a
    // press that arrives while they are still coming down is dropped if late.
````

<a id="typist-12"></a>
## typist-12: demo/typist/machines/index.html, inline script, line 178

````js
  // ── the patchbay ─────────────────────────────────────────────────────────
  // 010's graph with an fx box between the typewriter and the speakers, and a
  // stepper whose number reaches the fx box through the bay. The number also
  // reaches the typewriter, on a second value input, because a machine's pitch
  // per key type is a playback rate, and a rate is set where a sample starts.
````

<a id="typist-13"></a>
## typist-13: demo/typist/machines/index.html, inline script, line 197

````js
  // DISTINCT, how far from the original, arrives on its own input at each end
  // (asked 2026-10-11, *"distictivness as sepaate knob"*), 0 to 1.
````

<a id="typist-14"></a>
## typist-14: demo/typist/machines/index.html, inline script, line 235

````js
  /**
   * THE ROUTER, as /synth/patch-synth.mjs's: reads `bay.links()` and connects exactly the
   * audio links that are held, out to in, after disconnecting every out. With
   * no link into the fx box, nothing reaches it; with no link out of it,
   * nothing reaches the speakers.
   */
````

<a id="typist-15"></a>
## typist-15: demo/typist/machines/index.html, inline script, line 258

````js
  // `file` and `audio` are stream media on the wire, lit rather than pulsed.
  // The file wire is lit while the samples come down and for 600 ms after, so
  // a fetch from the local server is still seen; the audio wires while a
  // sample sounds, plus the fx box's room.
````

<a id="typist-16"></a>
## typist-16: demo/typist/machines/index.html, inline script, line 293

````js
  // The stepper is the `web:pick` node: any positive number, sent through the
  // bay. Its list grows as it is stepped, so there is no last machine. It
  // starts at Machine 0, the original, and after every choice the focus goes
  // back to the paper (asked 2026-10-11, *"when witching patchs get my focys
  // back to typewriter"*).
````

<a id="typist-17"></a>
## typist-17: demo/typist/machines/index.html, inline script, line 332

````js
  // Read only, the fx box: the index that last ARRIVED at each end, every
  // arrival with the link it came on, the audio links the router connected,
  // how many chains are live (two only during a fade), and an offline render
  // of one sample through one machine, measured.
````

<a id="typist-18"></a>
## typist-18: demo/typist/paper.mjs, module, line 1

````js
// demo/typist/paper.mjs: one sheet of paper, lifted out of
// /typist/paper/ for /typist/score/, which shows several.
// 000, 010 and 020 still carry their own copy and are unchanged.
//
// ONE BOX, TWO LAYERS PINNED TOGETHER, the way /typist/ does it. The
// <textarea> on top is invisible and takes every keystroke and every tap (so a
// phone opens its keyboard); the <pre> underneath draws the text and a block
// cursor at the offsets the browser reports. Both carry `.tpp-type` and nothing
// else sets a metric on either, or they drift apart by a character.
//
// The sheet is a size container, so its type and its margins follow the sheet
// and not the window: one paper across a desk gets 000's 64 character column
// at up to 20 px, and one of six on a phone gets small type and narrow margins.
//
//   const p = createPaper({ label: 'paper 1', onInput: (e) => ... });
//   host.append(p.el);
//   p.type('a'); p.type('\n'); p.back(); p.clear();
````

<a id="typist-19"></a>
## typist-19: demo/typist/paper/index.html, style, line 12

````css
  /* concepts typist/000, PAPER, 2026-10-11. Asked: *"something which you
     similar to video panel, and there you have footer with full screen, and
     the top area is just white paper, white, and black or very dark type in
     our brand font, and there is also a cursor, a bit more blocky, and the
     first demo is just something you can type in, maybe a example message"*.
     Nothing here opens anything and nothing makes a sound (that is 010). */
````

<a id="typist-20"></a>
## typist-20: demo/typist/paper/index.html, inline script, line 66

````js
  // ── the patchbay (asked 2026-10-11, *"can we patchbay 000?"*) ───────────
  // The keyboard is a node whose typing leaves on `keys:value-out`, shaped
  // text; the paper takes it on `paper:value-in`. One link, inside this tab.
  // Every keystroke is one event along it, so the wire pulses as you type;
  // the paper draws from the textarea as before.
````

<a id="typist-21"></a>
## typist-21: demo/typist/playback/index.html, style, line 11

````css
  /* concepts typist/030, PLAYBACK, 2026-10-11. Asked: *"030 is single typist
     but uses timeline (text visualization, see original typing demo) and
     transport to play back. plays from first to last. no permanet store"*.
     000's paper, and under it /typist/'s line: the same deck, transport bar
     and strip with the same three lanes, drawn the same way. Every change is
     kept in memory only, so a reload starts from an empty sheet. Nothing here
     opens anything and nothing makes a sound. */
````

<a id="typist-22"></a>
## typist-22: demo/typist/playback/index.html, inline script, line 55

````js
  // ── the recording, in memory and nowhere else ───────────────────────────
  // `whole` is the paper as you left it, built one change at a time. While the
  // transport plays, the paper shows the recording instead, and `whole` is
  // what comes back when you type again.
````

<a id="typist-23"></a>
## typist-23: demo/typist/playback/index.html, inline script, line 91

````js
  // ── the deck: the same kit /typist/ plays its log on ────────────────────
  // The paper during playback is the fold of the first `upTo` changes. Every
  // way in (a fire, a seek, the transport taking over) goes through `showUpTo`,
  // so a change that arrives twice is shown once.
````

<a id="typist-24"></a>
## typist-24: demo/typist/playback/index.html, inline script, line 115

````js
  // One rate and no rate control (asked: *"030 add sound. no rate controls"*):
  // the bar draws no rate choice for a lattice of one.
````

<a id="typist-25"></a>
## typist-25: demo/typist/playback/index.html, inline script, line 134

````js
    // MEASURED in Chrome: with the box rewritten inside beforeinput, the text
    // lands in the right place and the caret does not move with it. So on that
    // one key the caret is worked out from the selection and the change in
    // length, and put where it belongs afterwards.
````

<a id="typist-26"></a>
## typist-26: demo/typist/playback/index.html, inline script, line 278

````js
  // ── the sound ────────────────────────────────────────────────────────────
  // /typist/typewriter/'s Hermes Precisa 305 samples from R2, through the
  // shared sampler. NOTHING LOADS ON A VISIT: the AudioContext and the files
  // come with the first key or the first press anywhere on the page, which is
  // also the gesture a browser asks for before it will sound.
````

<a id="typist-27"></a>
## typist-27: demo/typist/sampler.mjs, module, line 1

````js
// demo/typist/sampler.mjs: the Hermes Precisa 305 sampler of
// /typist/typewriter/ and /typist/machines/, lifted for /typist/score/, where
// several typewriters share ONE set of decoded buffers. 010 and 020 still carry
// their own copy and are unchanged.
//
// Two halves, because 030 has one of the first and many of the second:
//   - `createSamples()`: the nine files from our R2 bucket, fetched and decoded
//     once into AudioBuffers on the first `load(ctx)`, which a page calls on a
//     press and never on a visit. Provenance in `typewriter/SOURCES.md`.
//   - `createVoice(ctx, samples, ...)`: one typewriter. One
//     AudioBufferSourceNode per key into the voice's own `out` gain, so a press
//     costs no fetch and no decode; the pitch per key type comes from a
//     character (`machines/fx.mjs`), read when a sample starts.
````

<a id="typist-28"></a>
## typist-28: demo/typist/score/index.html, style, line 11

````css
  /* concepts typist/040, MULTI TYPER, 2026-10-11. Asked: *"multi-typer, which
     supports multiple columns. So for two, it's two. For three, it's three
     columns. For four, it's a grid, two by two, etc. Figure out the layouts.
     ... sample texts. Doesn't have to be editable, just to show out how a
     layout would work"*, then *"030 typist: layout sound and patchbay for
     multitype"* and *"no distict knob, use default"*. N papers in one frame,
     each typed by a typist of its own through a typewriter of its own, every
     typewriter through its own fx box (`../machines/fx.mjs`, Machine k for paper
     k, at the default distinctness), all into one speaker. Not wired to
     other people (that is 040). Nothing is fetched and nothing sounds until
     the first press of play or of a key.
     2026-10-12: *"add timeline with typing score. mov play to transport.
     dim lanes in timeline that are not active (depends num of typist)"*. The
     typists' seeded walk is a score now, one lane per typist under the
     frame, played by the transport bar, and the lanes beyond the count are
     dimmed with the strip's `setActive`. */
````

<a id="typist-29"></a>
## typist-29: demo/typist/score/index.html, style, line 28

````css
  /* ── the frame and the papers ─────────────────────────────────────────
     `createChatGrid` in demo/shell/chat-ui.mjs, which was lifted from this
     page: one grid of six tracks, papers edge to edge with no seam, and with
     `fixed: true` one frame shape at every count, 16:9 at the desk and 3:4
     under 560 px (asked: *"keep aspect ratio / h on all typist couts"*), the
     frame (not the window) stacking one to three and going two across for
     four to six. Every paper paints its own white. */
````

<a id="typist-30"></a>
## typist-30: demo/typist/score/index.html, inline script, line 60

````js
  // ── the texts ────────────────────────────────────────────────────────────
  // Six typists, each a different kind of typing (asked: *"make 6 typist more
  // varied. one tyoing and clearing a lot. one contructng concrete poetry, one
  // drawing ascci mixed with text"*). 1, 5 and 6 write letters; 2 writes and
  // rubs out, over and over; 3 builds concrete poetry out of spaces and line
  // breaks; 4 draws in characters and writes around the drawing. So four
  // papers already show three of the kinds. `\b` in a text is the backspace
  // key. `pace` slows (above 1) or speeds (below 1) a typist.
````

<a id="typist-31"></a>
## typist-31: demo/typist/score/index.html, inline script, line 101

````js
  // ── the sound ────────────────────────────────────────────────────────────
  // ONE sample set for every typewriter, decoded once. Each paper has a voice
  // (its typewriter, into its own `out` gain), an fx box built for its index
  // as it arrives, and they all meet in one `master`. NOTHING OPENS ON A
  // VISIT: the AudioContext is made and the files fetched on the first press.
````

<a id="typist-32"></a>
## typist-32: demo/typist/score/index.html, inline script, line 141

````js
  // ── the patchbay ─────────────────────────────────────────────────────────
  // Per paper k: `keys-k` (the typist, its typing as text) to `paper-k` and to
  // `typewriter-k`; `typewriter-k` audio to `fx-k`; `fx-k` audio to the one
  // `speaker`. One `cf-r2:typewriter` feeds every typewriter. The index of
  // each paper comes from ONE node, `machines`, with one out port per paper
  // (`value-out` for paper 1, `value-out-2` for paper 2, ...) sending k to
  // `fx-k` and to `typewriter-k`'s second value input, as 020's stepper does.
  // A constant node per paper would be six more boxes saying one number each.
  // Links exist only for the papers shown, so `bay.links()` is the truth the
  // router and the picture both read.
````

<a id="typist-33"></a>
## typist-33: demo/typist/score/index.html, inline script, line 222

````js
  /**
   * THE ROUTER, as 020's: reads `bay.links()` and connects exactly the audio
   * links that are held, out to in, after disconnecting every out. A paper
   * that is not shown holds no links, so its typewriter reaches nothing.
   */
````

<a id="typist-34"></a>
## typist-34: demo/typist/score/index.html, inline script, line 249

````js
    // The press that wakes the typewriters always sounds, however long the
    // samples took (010 and 020's fix, commits d404cc6c and 38bf10ee).
    // A typist's letter that arrives before the samples (an unmute while the
    // typists run) wakes them and is not played late.
````

<a id="typist-35"></a>
## typist-35: demo/typist/score/index.html, inline script, line 264

````js
  // THE SCORE. Each typist walks its text one character at a time at a human
  // pace: a base gap of its own (seeded, so the six never fall into step),
  // jittered, longer after a space, longer still after punctuation and at a
  // line's end, and now and then a hesitation. That walk used to run live off
  // a timer; it is worked out once here instead, so every key of every typist
  // has a place on the line (asked 2026-10-12: *"add timeline with typing
  // score. mov play to transport"*), and the transport plays it, seeks it and
  // loops it. Same seeds, same gaps, so it is the same typing as before, once
  // through each sheet.
````

<a id="typist-36"></a>
## typist-36: demo/typist/score/index.html, inline script, line 334

````js
  // The deck's side of the score: a key that fires is sent from typist k's
  // `keys` port, so it reaches paper k and typewriter k along the links the
  // bay holds, exactly as the live typist's did. A typist beyond the count
  // holds no links and sends nothing, and its lane is dimmed.
````

<a id="typist-37"></a>
## typist-37: demo/typist/score/index.html, inline script, line 415

````js
  // ── the line: one lane per typist, the letter as the mark ──────────────
  // /typist/'s way of drawing a recording, over a score instead: a letter or
  // a digit is drawn as itself, a key with no shape (a space, a line break)
  // gets the strip's dot, and a backspace is a dot in /typist/'s "taken back"
  // red, so typist 2's rubbing out reads as red along its row.
````

<a id="typist-38"></a>
## typist-38: demo/typist/score/index.html, inline script, line 458

````js
  // The whole score in view, as /typist/ fits its line to the recording.
  // ⚠️ NOT AT BUILD TIME: the canvas has no width until it is on the page, and
  // a fit then MEASURED 168 px of plot and left the 38.6 s score in the first
  // third of a 554 px line. So it fits when the strip's width is known and
  // again whenever that width changes.
````

<a id="typist-39"></a>
## typist-39: demo/typist/typewriter/index.html, style, line 12

````css
  /* concepts typist/010, TYPEWRITER, 2026-10-11. 000's paper plus a
     typewriter sounding every key. Asked: *"Second one is type with sound. So
     there is a sample which comes from our storage, similar where the NOLA
     samples are coming, but the sample is has to be public domain typewriter
     sound"*, *"more like a sampler"*. The sounds are nine CC0 cuts of a Hermes
     Precisa 305 in our R2 bucket, provenance in `SOURCES.md` beside this page.
     Nothing is fetched until the first key press. */
````

<a id="typist-40"></a>
## typist-40: demo/typist/typewriter/index.html, inline script, line 68

````js
  // ── the typewriter: a sampler of one Hermes Precisa 305 ─────────────────
  // Nine short files from our R2 bucket, decoded once into AudioBuffers and
  // played with one AudioBufferSourceNode per key, so a press costs no fetch
  // and no decode. NOTHING OPENS ON A VISIT: the AudioContext is made and the
  // files are fetched on the first key press, which is also the gesture a
  // browser needs before it lets a page make sound.
  // R2, through the station worker's /media/ door, which answers CORS for any origin.
````

<a id="typist-41"></a>
## typist-41: demo/typist/typewriter/index.html, inline script, line 146

````js
    // The press that wakes the typewriter always sounds, however long the
    // samples took (asked 2026-10-11, *"first typing is not hear"*).
````

<a id="typist-42"></a>
## typist-42: demo/typist/typewriter/index.html, inline script, line 154

````js
  // ── the patchbay ─────────────────────────────────────────────────────────
  // 000's keyboard to paper, plus the keyboard to the typewriter, the
  // typewriter to the speaker, and the files the typewriter plays coming from
  // our R2 bucket. The bucket is a node of this page's own bay and announces
  // nothing (asked: *"web:typewriter has lins to cf storate"*).
````

<a id="typist-43"></a>
## typist-43: demo/typist/typewriter/index.html, inline script, line 179

````js
  // `file` and `audio` are stream media on the wire, lit rather than pulsed.
  // The file wire is lit while the samples come down and for 600 ms after, so
  // a fetch from the local server is still seen; the audio wire while a
  // sample sounds.
````
