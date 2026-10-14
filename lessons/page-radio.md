# Page comments: radio

The full comments cut from the code under demo/ for radio, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="radio-1"></a>
## radio-1: demo/radio/blend/index.html, inline script, line 33

````js
  // A simple radio as a patchbay: one ERR station and one Ida station, each an
  // external site, into a crossfader in this tab, into the speakers. The streams
  // come through positron's own relay (`cf-shout`, the positron-shout worker), which holds ONE upstream
  // connection per mount, exactly as /archive/radio/ reaches them. `?base=` points the
  // page at demo/fake-station.mjs instead.
  //
  // NOTHING OPENS ON A VISIT. No AudioContext and no fetch to either station
  // until somebody presses play. The patch is held from load so the picture
  // does not change with play; an `external` node refuses a link out of it
  // without `consent: true`, so the page names it where the link is made.
````

<a id="radio-2"></a>
## radio-2: demo/radio/blend/index.html, inline script, line 97

````js
  // The whole patch is held from load, so the picture is the same playing or
  // stopped. Holding a link opens nothing: the streams open only on play,
  // which is the press where a person asks to listen, so the station link is
  // made with that consent named here rather than at the press.
````

<a id="radio-3"></a>
## radio-3: demo/radio/blend/index.html, inline script, line 129

````js
  // The sound follows the links the bay holds, as the archived effects concept did (archive/concepts/effects.md): a station
  // reaches the fader only along relay -> fader, its wave only along relay ->
  // wave, and the fader the speakers only along fader -> speaker. Unlink one
  // and that edge goes quiet.
````

<a id="radio-4"></a>
## radio-4: demo/radio/key/autoplay-test.mjs, module, line 1

````js
// demo/radio/key/autoplay-test.mjs. Autoplay's chord choice and voice
// leading, with no browser at all.
//
//   node demo/radio/key/autoplay-test.mjs
//
// Mostly NEGATIVE CONTROLS, written so that the bug each names would fail it:
// a chooser that ignores the chroma, one that never repeats or always repeats,
// a voicer that always returns root position, one that leaves the range, one
// that measures motion to the nearest note rather than voice to voice. Count
// them with `grep -c 'NEGATIVE CONTROL' demo/radio/key/autoplay-test.mjs`.
````

<a id="radio-5"></a>
## radio-5: demo/radio/key/autoplay-test.mjs, module, line 53

````js
// ...and it is a cost at all: C, E, G and A nearly level fit I and vi
// almost exactly as well (C and E in both, G against A), and the near tie is
// broken toward whichever is NOT sounding. With no repeat cost the I's lean
// keeps I from I, and vi's own fit keeps vi from vi.
````

<a id="radio-6"></a>
## radio-6: demo/radio/key/autoplay-test.mjs, module, line 97

````js
// A long walk round the circle of fifths, always moving least, sinks a
// semitone or two a chord and the range is what turns it round. Printed, not
// graded: the middle voice averages 58.0 here against a range middle of 61.5,
// on the most one-sided progression there is. On the three R2 recordings it
// averaged 61.8, 63.9 and 65.5 (autoplay-chords.mjs), so no pull to the middle
// was added.
````

<a id="radio-7"></a>
## radio-7: demo/radio/key/autoplay.mjs, module, line 1

````js
// demo/radio/key/autoplay.mjs: which chord autoplay plays next, and
// where the pad's three voices go to play it. Plain arithmetic, no WebAudio and
// no DOM, so `autoplay-test.mjs` beside it grades it in node and
// `research/tools/tempo-key/autoplay-chords.mjs` runs it over our R2 recordings.
//
// Asked 2026-10-13 on /radio/key/: *"it feels repeating same chords all
// the time"*. Autoplay was a fixed I vi IV V loop, four seconds a chord, every
// chord in root position, restarting on I at every key change. The owner chose
// two changes:
//
// 1. THE CHORD FOLLOWS THE RADIO. At each change the seven triads of the
//    detected key are scored against the pitch classes the station is sounding
//    NOW (a few seconds of chroma, not the detector's 30 s key memory): the
//    share of that chroma that lands on the chord's notes, plus a small lean
//    toward I, IV, V and vi, minus a small cost for repeating the chord already
//    sounding and for root motions that sound like a step backwards. When the
//    key is unsure or the chroma says nothing (flat, or empty), it walks
//    I IV V vi instead of falling silent.
// 2. VOICE LEADING. The new chord is voiced as the close position (root, first
//    or second inversion, at any octave inside the pad's range) whose three
//    voices move the fewest semitones from the previous chord's three, lowest
//    to lowest, so a note the two chords share is held. The bass is not voiced
//    here: it keeps the chord's root, as before.
//
// ⚠️ NOT THE KIT'S `voiceChord(..., { mode: 'lead' })` FROM demo/shell/chords.mjs,
// on purpose. That one measures each note's distance to the NEAREST note of the
// other chord, so two voices may both count as close to one note. A pad has
// three voices that each go somewhere, so the motion here is paired: sorted
// voice to sorted voice, which is what "moves the voices least" means.
````

<a id="radio-8"></a>
## radio-8: demo/radio/key/autoplay.mjs, module, line 54

````js
// How much each scale step is favoured before the radio has its say: a
// little for the home chord, less for IV, V and vi, nothing for ii and iii,
// and a cost for the diminished triad on vii, which a pad holding it for four
// seconds turns into a sound nobody expected.
````

<a id="radio-9"></a>
## radio-9: demo/radio/key/autoplay.mjs, module, line 59

````js
// Root motion in scale steps, up, mod 7, and what it costs. Down a fifth (up
// a fourth, 3) and down a third (5) are the strongest moves and cost nothing;
// up a second (1) and up a fifth (4) are ordinary; up a third (2) is weaker;
// down a second (6), V to IV or vi to V, is the one that sounds like going
// backwards. 0 is the repeat, which has its own cost.
````

<a id="radio-10"></a>
## radio-10: demo/radio/key/autoplay.mjs, module, line 65

````js
// The one constant that trades following the radio against variety. MEASURED
// 2026-10-13 offline on our three R2 recordings against essentia's chord
// track (research/tools/tempo-key/autoplay-chords.mjs): at 0.06 autoplay
// almost never repeats but see-saws I vi I vi while the station sits on one
// chord; at 0 it holds the station's chord for most of a song; 0.03 agrees
// with essentia best on average and see-saws least.
````

<a id="radio-11"></a>
## radio-11: demo/radio/key/autoplay.mjs, module, line 159

````js
/**
 * Voice a triad against the chord before it.
 * @param {number[]|null} prev  the notes sounding now, or null for a first chord
 * @param {number[]} pcs        the new chord's pitch classes, root first
 * @param {{lo:number, hi:number, home:number}} range  the pad's notes, and where a first chord sits
 * @returns {{notes:number[], motion:number|null, held:number}}
 *   `held` is how many notes the two chords keep in place.
 * With nothing before it the chord goes in root position nearest `home`. A
 * tie on motion goes to the voicing whose middle note sits nearest the middle
 * of the range. What stops a progression that always takes the smallest step
 * from sinking for ever is the range itself: at the edge the only placements
 * left are the ones further in.
 */
````

<a id="radio-12"></a>
## radio-12: demo/radio/key/autoplay.mjs, module, line 192

````js
/** Root position, as autoplay voiced every chord before 2026-10-13: the root
 *  on scale step `step` above `base + tonic`, third and fifth stacked on it. */
````

<a id="radio-13"></a>
## radio-13: demo/radio/key/index.html, style, line 17

````css
  /* The key's notes are rings, the kit's `ai` lamp, in the accent rather than
     the proposal lilac (asked: *"suggested cricles are yellow"*): a ring is a
     note you could play, and playing it fills it. */
````

<a id="radio-14"></a>
## radio-14: demo/radio/key/index.html, style, line 20

````css
  /* asked *"nonyellow circle borders: even grayer"* */
````

<a id="radio-15"></a>
## radio-15: demo/radio/key/index.html, style, line 22

````css
  /* Asked: *"only circles that autoplay plays are yellow-bordered. when on
     autoplay keep thay hellow. others grayer"*. The rest of the key's notes
     stay grey rings; the notes of the chord autoplay is holding are yellow
     rings for as long as the chord lasts. Since 2026-10-13 the chord is
     voiced to move least, so the rings are the exact notes the pad plays, not
     the chord's letters in every octave. */
````

<a id="radio-16"></a>
## radio-16: demo/radio/key/index.html, style, line 29

````css
  /* The footer's labels in the kit's form label style, `.pos-field-l`'s
     declarations (asked: *"use std form label styling"*). */
````

<a id="radio-17"></a>
## radio-17: demo/radio/key/index.html, inline script, line 56

````js
  // concepts radio/040, KEY, 2026-10-11. /radio/live/ with the tempo
  // detector swapped for a key detector. Asked: *"010 key dertect, live
  // stations"*. The live source, the level, the wave, the speakers and the
  // patchbay are radio/030's, line for line. One idea per page, so what was
  // about tempo went: the tempo detector, the beat lines over the wave, the
  // tempo scope, and the fx box with its mix knob and click (that box was
  // driven by the tempo, so with no tempo it had nothing to do).
  //
  // The station plays LIVE through our own relay (`cf-shout`, the
  // positron-shout worker, which holds ONE upstream connection per mount
  // however many tabs listen), read with the kit's createMp3Stream exactly as
  // /radio/blend/ reads it. `?base=` points the page at
  // demo/fake-station.mjs instead.
  //
  // 🔴 NOTHING OPENS ON A VISIT, AND ONE STATION AT A TIME. Every connection to
  // an ERR mount is counted in a public broadcaster's listener statistics
  // (CLAUDE.md, "What costs real money and somebody else's server"), so a
  // stream is opened only on Play, closed on Stop, and closed BEFORE the next
  // one opens when the station is switched while playing. Under ?selfcheck=1 the
  // page never opens a stream at all: Play logs that a check is running and
  // plays nothing.
  //
  // Ida is ADTS AAC, the two ERR mounts MP3. createMp3Stream reads both.
````

<a id="radio-18"></a>
## radio-18: demo/radio/key/index.html, inline script, line 105

````js
  // ── the bay ─────────────────────────────────────────────────────────────
  // A live station is AUDIO all the way: the station's site into the relay,
  // the relay into the level node in this tab, and the level node's
  // `audio-out` feeds the wave, the speakers and the key detector. The key
  // detector's readings leave on a value port for the keyboard.
````

<a id="radio-19"></a>
## radio-19: demo/radio/key/index.html, inline script, line 145

````js
  // ── the links, held from load so the picture does not change with play ────
  // Holding a link opens nothing. A link out of an `external` node is refused
  // without `consent: true`, and the consent is the Play press, the moment a
  // person asks to listen, so it is named here where the link is made, as on
  // /radio/blend/.
````

<a id="radio-20"></a>
## radio-20: demo/radio/key/index.html, inline script, line 172

````js
  // Autoplay's chord to the pad, its root to the bass. The octave up and
  // octave down links that were here went 2026-10-11 (*"radio 040 sound is
  // still orgaby and lame"*): a chord stacked in three octaves on bright saws
  // is an organ registration, and it filled every band the radio needs.
````

<a id="radio-21"></a>
## radio-21: demo/radio/key/index.html, inline script, line 217

````js
  // The key on the kit keyboard, two octaves from C3, which fill the panel
  // without stretching a key. The seven notes of the detected key are grey
  // rings, the chord autoplay plays (or would play) yellow ones; a note that
  // sounds, from a finger or from autoplay, fills its ring in the accent.
````

<a id="radio-22"></a>
## radio-22: demo/radio/key/index.html, inline script, line 234

````js
      // Rings only: a filled dot means a note is sounding, from a finger or
      // from autoplay, and nothing else (asked: *"inner circles only appear
      // when auto or manual play"*), so the home note carries no dot of its own.
````

<a id="radio-23"></a>
## radio-23: demo/radio/key/index.html, inline script, line 245

````js
  // ── the pad synth and the bass ──────────────────────────────────────────
  // Asked: *"pad is very churchlike and eats so many fequencyies and sounds
  // lame. perhaps bassy + paddy"*, then *"still orgaby and lame"*. So two
  // voices. The PAD is five saws spread across the stereo field a few cents
  // apart, through a low lowpass that drifts slowly (one shared LFO), with a
  // slow swell and a long release; the whole pad is high passed so it leaves
  // the bottom to the bass, and a generated room reverb sits behind it. The
  // BASS is the chord's root an octave under the pad: a sine with a triangle
  // an octave above it for small speakers, short attack, darker filter.
  // Then *"its also slow to react, old chords stay"*: a 3 s release and a full
  // reverb let each chord bleed under the next, so 0.5 s in, 1 s out, less room.
````

<a id="radio-24"></a>
## radio-24: demo/radio/key/index.html, inline script, line 301

````js
  // Equal power: the dry side is cos, the wet side sin, of the knob's quarter
  // turn, so the middle is neither louder nor quieter than the ends. The wet
  // side is lifted by WET_TRIM because the pad is a quiet voice beside a
  // levelled station.
````

<a id="radio-25"></a>
## radio-25: demo/radio/key/index.html, inline script, line 317

````js
  // The pad's level follows the station's energy as it arrives on its
  // value-in: about the pad's own level at the station's ordinary loudness,
  // down to a fifth in the quiet and up to one and a half times on the loud.
  // With no station playing, nothing arrives and the pad sits at its own level.
````

<a id="radio-26"></a>
## radio-26: demo/radio/key/index.html, inline script, line 411

````js
  // ── autoplay ────────────────────────────────────────────────────────────
  // While ticked, the pad plays a chord of the key the footer names every
  // AUTO_S seconds, and at once when the key changes; it waits silently while
  // there is no key yet. Until 2026-10-13 that was a fixed I vi IV V loop in
  // root position, restarting on I at every key change, and the owner's word
  // for it was *"it feels repeating same chords all the time"*. Now (both
  // halves are pure functions in ./autoplay.mjs, graded by autoplay-test.mjs):
  // 1. The chord follows the radio: of the key's seven triads, the one whose
  //    notes hold most of what the station sounded over the last CHORD_TAU_S
  //    seconds, with a small lean to I, IV, V and vi and a small cost for
  //    repeating the chord sounding. That chroma is the detector's half second
  //    picture, arriving on autoplay's value-in with the key, eased here; the
  //    detector's 30 s sum is for the key and is not used for the chord. When
  //    the key's confidence is low or the chroma is flat, it walks I IV V vi.
  // 2. Each chord is voiced as the inversion inside PAD_LO..PAD_HI that moves
  //    the three voices least from the chord before, so shared notes hold.
  //    The bass keeps the chord's root, as before.
  // Bar lines from a tempo detector are a later step; AUTO_S stays.
````

<a id="radio-27"></a>
## radio-27: demo/radio/key/index.html, inline script, line 434

````js
  // Asked: *"cinfidence level -> note volime?"*, then *"do steeper but have
  // ineria not to be annoying"*. Autoplay's loudness is CC 11 on its own
  // channel, a level and not a velocity, so a chord already sounding swells
  // and fades with it. The target is silent at AUTO_CONF_LO and below and full
  // at AUTO_CONF_HI, and the level eases toward it with a time constant of
  // AUTO_TAU_S, so a confidence that flickers moves it hardly at all and a
  // key that firms up brings it in over a few seconds.
````

<a id="radio-28"></a>
## radio-28: demo/radio/key/index.html, inline script, line 488

````js
  // With Autoplay off, the chord it would open on is shown as yellow rings
  // (asked: *"when autoplay is off, color the would-play notes border
  // yellow"*): the home chord, in root position. With it on, the chord it is
  // holding is.
````

<a id="radio-29"></a>
## radio-29: demo/radio/key/index.html, inline script, line 506

````js
  // A held note is HELD: a note the new chord shares with the one sounding
  // gets no note off and no new note on, so the pad does not breathe out and
  // in again on it, and a chord that repeats simply goes on sounding. Only
  // the voices that move are released and struck.
````

<a id="radio-30"></a>
## radio-30: demo/radio/key/index.html, inline script, line 557

````js
  // ── the key detector ────────────────────────────────────────────────────
  // An AnalyserNode on the levelled sound, read every KEY_HOP_S on the main
  // thread. Its spectrum is folded into twelve pitch classes (a chromagram),
  // those are summed with a decay of KEY_TAU_S, and the sum is matched against
  // the 24 major and minor key profiles. Everything between the markers below
  // is plain arithmetic on the analyser's dB spectrum, no WebAudio, so the
  // offline check reads this very block out of this file and runs it on our
  // R2 recordings and on synthetic music of known key (plans/plan-key-
  // detection.md has the method, the sources and every candidate measured).
  //
  // 1. Peaks only. Every local maximum of the spectrum between 55 Hz and 2 kHz
  //    and within 35 dB of the loudest, its frequency refined by a parabola
  //    through the three bins, becomes a pitch in fractional semitones. Its
  //    weight is its height above that floor in dB, which is the compression
  //    that keeps one loud bass note from outvoting a chord, faded in over the
  //    bottom octave of the band (55 to 110 Hz) and out over the top one (1 to
  //    2 kHz).
  // 2. Tuning. How far the peaks sit from the equal tempered grid, as a
  //    circular mean weighted by the peaks and eased over 2 s, is taken off
  //    before a pitch is rounded to its class. A peak halfway between two
  //    semitones counts for nothing.
  // 3. Harmonics. A peak 19 semitones (a twelfth, the third harmonic) or 28
  //    (the fifth harmonic) over a louder one counts for 30%.
  // 4. Each frame is normalised to sum 1, so a loud moment and a quiet one
  //    count alike, then summed into `acc` with a decay of 30 s (and into
  //    `now`, the picture, over half a second).
  // 5. The 24 keys are the Temperley (Kostka-Payne) profiles rotated to each
  //    tonic, scored by correlation with `acc`. The best is the key; a key
  //    already shown stays until another beats it by 0.05. Confidence is
  //    the winner's correlation times its margin over the runner-up (a margin
  //    of 0.1 or more counts in full).
  //
  // 🔴 WHY TEMPERLEY AND WHY THE HARMONICS STEP, MEASURED 2026-10-11 OFFLINE on
  // our three R2 recordings of the day (about three minutes each). There is NO
  // ground truth: nobody has said what key any of it is in. With Krumhansl-
  // Kessler profiles and no harmonics step the detector read every recording a
  // FIFTH ABOVE what Temperley read (Raadio 2 Bb minor against Eb minor, Raadio
  // 4 Ab minor against E major), on 89% and 80% of readings. A fifth up is
  // where a note's third harmonic lands, so the harmonics step went in, and
  // with it the two profile sets mostly AGREE: same key on 72% (Raadio 2), 76%
  // (Raadio 4) and 77% (Ida) of readings. Temperley was the steadier of the two
  // (switches after the first 15 s: 2, 1 and 0 against 9, 1 and 6), so it is
  // the one used. A 32768 point analyser (0.7 s, 1.4 Hz bins) was steadier than
  // 16384 on Raadio 4, and 20 s of decay steadier than 10 on Raadio 4 and Ida.
  //
  // 🔴 WHY THE FADE AT THE BAND EDGES, MEASURED 2026-10-11 OFFLINE, LATER THE
  // SAME DAY, against two things that need no listener. (a) 72 synthetic
  // pieces of 40 s in all 24 keys (piano and saw chords, bass, melody, drums,
  // tuned up to 30 cents off), scored MIREX style (right 1, fifth 0.5,
  // relative 0.3, parallel 0.2). (b) Each R2 recording pitch shifted by -5 to
  // +6 semitones: the answer should move by exactly the shift, and how often
  // it does is a number with no ground truth in it. Before, with a hard edge
  // at 55 Hz and 2 kHz, a 50 dB floor, 20 s of decay and a 0.02 stickiness:
  // synthetic 0.73 (48 pieces) and 0.56 (24 held out), the shifted recordings
  // agreed 35% (Raadio 2), 63% (Raadio 4) and 72% (Ida) of the time, mostly
  // by jumping a FIFTH as bass notes and their harmonics crossed an edge.
  // After, with the fade, a 35 dB floor, 30 s and 0.05: synthetic 0.78 and
  // 0.65, shifted 82%, 99% and 98%, switches after 15 s 2, 0 and 0 against 2,
  // 1 and 2, a first answer at 3 to 4 s either way, and about 29 against 37
  // µs of CPU per 0.1 s hop. The fade alone did most of it (66%, 87%, 87%).
  // Every major piece now reads right and no piece reads a fifth off. Other
  // profiles (Albrecht-Shanahan, Shaath, Faraldo's edma and bgate, Krumhansl)
  // scored up to 0.05 higher on the synthetic set and were less steady or less
  // consistent on the radio, so Temperley stays.
  //
  // ⚠️ A RELATIVE KEY IS THE SAME SEVEN NOTES. F# major and Eb minor, the two
  // readings Raadio 2 sways between, differ only in which note is home, which a
  // pitch class histogram can barely tell. The runner-up in the footer is
  // there for that reason. On the synthetic set it is still the only error:
  // 15 of 48 pieces, all minor read as their relative major. Twelve are
  // progressions that never raise the seventh (i VI III VII, i iv VII III),
  // whose notes are exactly the relative major's, and three are i VII VI V.
  // Weighting the bass toward the tonic fixed some of those and broke the
  // radio's consistency (Raadio 2 fell to 47%), so it is not in.
  // KEY CORE BEGIN
````

<a id="radio-31"></a>
## radio-31: demo/radio/key/index.html, inline script, line 773

````js
  // ── the level: one gain per station, from a running RMS ──────────────────
  // radio/030's, unchanged. The stream's RMS BEFORE the gain, read every
  // LEVEL_READ_MS, followed slowly (LEVEL_SLOW_S) and fast (LEVEL_FAST_S); the
  // louder sets the target LEVEL_RMS / rms, raise only, at most LEVEL_MAX (36
  // dB). Down fast, up slow, held under LEVEL_FLOOR, a limiter after the gain.
  // MEASURED on the captures: Ida is music at about -44 dB RMS for most of its
  // length with one 25 s stretch at -14 dB, so the gain has to reach about 28
  // to 30 dB and come down within a fraction of a second. The key detector
  // hears the levelled sound, though with every frame normalised it cares
  // about the spectrum's shape over the floor, not its loudness.
````

<a id="radio-32"></a>
## radio-32: demo/radio/key/index.html, inline script, line 862

````js
  // ── the energy signal ───────────────────────────────────────────────────
  // The levelled station's RMS every 50 ms, eased up in about 80 ms and down
  // in about 400, divided by ENERGY_REF (the RMS the levelling aims at,
  // -16 dBFS), so 1 is the station at its ordinary loudness.
````

<a id="radio-33"></a>
## radio-33: demo/radio/key/index.html, inline script, line 888

````js
    // 🔴 A HARNESS NEVER OPENS A LIVE STREAM. Every connection to an ERR mount
    // lands in a public broadcaster's audience statistics, and Ida's server is
    // somebody else's too, so under ?selfcheck=1 Play opens nothing, makes no
    // AudioContext and plays nothing.
````

<a id="radio-34"></a>
## radio-34: demo/radio/live/index.html, inline script, line 31

````js
  // concepts radio/030, LIVE TEMPO, 2026-10-11. /radio/tempo/ with one
  // thing changed, the source. Asked: *"do beats 005 with live radios"*. The
  // detector, the wave with its beat lines, the tempo scope, the fx box and the
  // mix knob are radio/020's, line for line. Instead of a recording looped
  // from our bucket, the station plays LIVE through our own relay
  // (`cf-shout`, the positron-shout worker, which holds ONE upstream connection
  // per mount however many tabs listen), read with the kit's createMp3Stream
  // exactly as /radio/blend/ reads it. `?base=` points the page at
  // demo/fake-station.mjs instead.
  //
  // 🔴 NOTHING OPENS ON A VISIT, AND ONE STATION AT A TIME. Every connection to
  // an ERR mount is counted in a public broadcaster's listener statistics
  // (CLAUDE.md, "What costs real money and somebody else's server"), so a
  // stream is opened only on Play, closed on Stop, and closed BEFORE the next
  // one opens when the station is switched while playing. Under ?selfcheck=1 the
  // page never opens a stream at all: Play logs that a check is running and
  // plays nothing.
  //
  // Ida is ADTS AAC, the two ERR mounts MP3. createMp3Stream reads both: it
  // picks the framing from the response's content-type and configures the
  // decoder from the first frame's header (mp3-stream.mjs, "TWO CODECS"), as
  // /radio/blend/ already plays ida-tallinn. No media element.
  //
  // The mounts are workers/shout/worker.mjs's: `raadio2` and `raadio4` (ERR,
  // 128 kbit/s MP3) and `ida-tallinn` (Ida Radio Tallinn).
````

<a id="radio-35"></a>
## radio-35: demo/radio/live/index.html, inline script, line 73

````js
  // ── the bay ─────────────────────────────────────────────────────────────
  // A live station is AUDIO all the way: the station's site into the relay,
  // the relay into the level node in this tab, and the level node's
  // `audio-out` feeds the wave, the speakers and the detector.
````

<a id="radio-36"></a>
## radio-36: demo/radio/live/index.html, inline script, line 98

````js
    // Holding a link opens nothing. A link out of an `external` node is refused
    // without `consent: true`, and the consent is the Play press, the moment a
    // person asks to listen, so it is named here where the link is made, as on
    // /radio/blend/.
````

<a id="radio-37"></a>
## radio-37: demo/radio/live/index.html, inline script, line 115

````js
    // 🔴 A HARNESS NEVER OPENS A LIVE STREAM. Every connection to an ERR mount
    // lands in a public broadcaster's audience statistics, and Ida's server is
    // somebody else's too, so under ?selfcheck=1 Play opens nothing, makes no
    // AudioContext and plays nothing.
````

<a id="radio-38"></a>
## radio-38: demo/radio/live/index.html, inline script, line 125

````js
    // ⚠️ THE SOURCE IS LIVE HERE, AND NOTHING ABOUT WHERE A BEAT LANDS CHANGES.
    // The stream reaches this tab a few seconds behind the station (the relay,
    // the network and createMp3Stream's cushion), but the detector never sees
    // the station's clock. It hears the samples this tab plays and stamps them
    // with `e.playbackTime`, so beats are placed on the tab's audio clock as
    // before, against the very sound the speakers play, and the click is
    // scheduled on that same clock. What is new is that a reading cannot look
    // ahead or loop: the first one waits MIN_S of sound after the stream starts.
    // The press is the person asking to listen: only now does a stream open,
    // and only the one station picked.
````

<a id="radio-39"></a>
## radio-39: demo/radio/live/index.html, inline script, line 141

````js
  // ── the level: one gain per station, from a running RMS ──────────────────
  // radio/020 levels each recording as it is decoded, per 1 s block, toward
  // -16 dB RMS, raise only, up to 36 dB, then a tanh knee. A live stream has no
  // whole file to measure ahead of, so here the gain follows the sound as it
  // arrives. MEASURED on the captures (the session, 2026-10-11): Ida is music
  // at about -44 dB RMS (peaks -30) for most of its length with one 25 s
  // stretch at -14 dB, against Raadio 2's -15.5 mean. So the gain has to reach
  // about 28 to 30 dB AND come down within a fraction of a second when a loud
  // stretch arrives.
  //
  // How: the stream's RMS BEFORE the gain (so the gain never measures itself),
  // read every LEVEL_READ_MS, followed twice, slowly over LEVEL_SLOW_S and fast
  // over LEVEL_FAST_S. The louder of the two sets the target LEVEL_RMS / rms,
  // never under 1 (raise only, a loud station is left alone) and never over
  // LEVEL_MAX (36 dB, as radio/020). The gain falls to a lower target fast
  // (LEVEL_DOWN_S) and rises to a higher one slowly (LEVEL_UP_S), so it never
  // rises into a loud stretch and it never pumps on a single drum hit. Under
  // LEVEL_FLOOR (a gap, a silence) it holds, so a pause is not raised into
  // hiss. A DynamicsCompressor set as a limiter after the gain takes what gets
  // over the top in the moment before the gain has come down, which is the
  // tanh knee's job in radio/020. Each station keeps its gain, so coming back to
  // Ida starts where Ida was. The detector hears the levelled sound too.
  // ⚠️ The limiter delays everything after it by its few ms of look-ahead,
  // the detector and the speakers alike, so they stay in step with each other.
````

<a id="radio-40"></a>
## radio-40: demo/radio/rig.mjs, module, line 1

````js
// demo/radio/rig.mjs: what /radio/tempo/ and /radio/live/ share, one copy
// since 2026-10-14 (they carried it line for line). The wave with its beat
// lines, the tempo detector and its scope, the fx box with its click and mix
// knob, the station picker, Play, and the links between them. A page brings
// its source: the stations, the nodes up to the player's `audio-out`, the
// links into it, and how a station starts and stops.
````

<a id="radio-41"></a>
## radio-41: demo/radio/rig.mjs, module, line 106

````js
  // The beats on the wave: a canvas over the scope, drawn on the scope's own
  // seconds (4 across, the newest at the right edge), so a mark scrolls left
  // with the sound it was placed on. Each is as bright as the reading that
  // placed it was sure.
````

<a id="radio-42"></a>
## radio-42: demo/radio/rig.mjs, module, line 120

````js
  /** Where now sits on the tempo scope: fixed at 5/6 of the width. Following
   *  where new beat lines appear was tried and taken back the same day (*"move
   *  dot to 5/6 of w. keep it steady"*). */
````

<a id="radio-43"></a>
## radio-43: demo/radio/rig.mjs, module, line 125

````js
  // The tempo scope: every reading that arrived on the display's in-port, time
  // across (the last TEMPO_S seconds, the newest at nowAt() of the width) and bpm up, the
  // detector's whole range. Asked 2026-10-11: *"show all condidences"*, *"same
  // h as waveform . no horiz grid"*, *"zoom in time, show less hsitoric"* and
  // *"show bpm and conf on all times"*. So nothing is withheld: the chosen
  // tempo is the line, each segment as bright as its confidence, every
  // candidate the detector weighed is a dot as bright as its score, and the
  // pointer reads any moment out in full. The labels on the line and the
  // vertical lines came off the same day (*"no need for annotations"*, *"rm
  // radio 020 vert line on viz"*). The range is the corner label. 15 s across is a quarter of the 60 it was.
````

<a id="radio-44"></a>
## radio-44: demo/radio/rig.mjs, module, line 155

````js
    // Under STEADY the reading is not a fact, so no number is shown: readings
    // at 0.5 or more were 92% within 4% of the reference tools, under it 54%
    // (research/tempo-key-eval-2026-10-12.md 4.2). The line still draws, dimmed.
````

<a id="radio-45"></a>
## radio-45: demo/radio/rig.mjs, module, line 170

````js
  // ── the tempo detector: /radio/tempo.mjs, shared by both pages since
  // 2026-10-12. Every step of it, every constant and every measurement behind
  // them is written there. It hears the player's sound on its own link and
  // sends each reading out on BPM_EV.
````

<a id="radio-46"></a>
## radio-46: demo/radio/rig.mjs, module, line 210

````js
  // The tempo scope. No grid lines and no time label (*"rm 15sc label"*). The
  // range in the top left corner.
````

<a id="radio-47"></a>
## radio-47: demo/radio/rig.mjs, module, line 222

````js
    // Now sits at nowAt() of the width, the last TEMPO_S seconds to its left,
    // and no lines up the scope. Asked 2026-10-11: *"rm radio 020 vert line on
    // viz. make yellow dot around 2/3 of w"*.
````

<a id="radio-48"></a>
## radio-48: demo/radio/rig.mjs, module, line 242

````js
    // The dot is NOW and stays at xNow (*"can yellow dot just steady on lover
    // wiz"*): the line runs on from the last reading to it, so the dot never
    // drifts left between readings and jumps back when one arrives.
````

<a id="radio-49"></a>
## radio-49: demo/radio/rig.mjs, module, line 254

````js
    // No labels on the line since 2026-10-11 (*"no need for annotations"*):
    // the footer says the bpm and confidence, the pointer reads any moment.
````

<a id="radio-50"></a>
## radio-50: demo/radio/rig.mjs, module, line 329

````js
  // ── the fx box ──────────────────────────────────────────────────────────
  // in -> dry gain (1 - mix) -------------------------------------------> out
  // in -> two high passes (12 dB each) -> music gain (mix * MUSIC_AT_1) -> out
  //       drum voices -> saturation -> drum gain (mix) -----------------> out
  // At mix 0 the output is the input through a gain of exactly 1. Turning up,
  // the low cut rises from CUT_LO to CUT_HI (geometrically, so the middle of
  // the knob is the middle of the octaves) and the drum comes up, so the
  // middle is a blend and the top is thin music under a dominant drum. Asked
  // 2026-10-11: *"max mix make music whay thinner and bd dominent"*.
  //
  // 🔴 AND THE LOUDNESS STAYS WHERE THE DRY RADIO IS AT EVERY MIX, asked the
  // same day as *"keep volume the same in all mix settings"*. The music and the
  // drum go through one makeup gain, and every LEVEL_MS a loop compares the
  // output's loudness with the input's (both K weighted, as a loudness meter
  // weighs them: a high shelf of +4 dB above 1.7 kHz and a cut below 38 Hz,
  // mean squares eased over LEVEL_TAU_S) and nudges that gain toward equal. It
  // touches only the wet side, so at mix 0 the output is still the input.
````

<a id="radio-51"></a>
## radio-51: demo/radio/rig.mjs, module, line 401

````js
  // A tempo the detector is sure of sets the grid; one under DRUM_FLOOR takes
  // the grid away and the drum stops. The pictures show every reading; only
  // the drum waits for a sure one, because a kick on a wrong grid is heard.
  // 0.5: MEASURED offline 2026-10-11, the steady stretches of both recordings
  // read 0.6 to 0.9 and Raadio 4's last minute, which has no steady beat,
  // reads under 0.3.
````

<a id="radio-52"></a>
## radio-52: demo/radio/rig.mjs, module, line 413

````js
  // A click, not a bass drum, since 2026-10-11 (*"is bd sound laggy? make click
  // isntead"*). The drum was on its grid to 2.5 ms (MEASURED by the agent that
  // built it), but a sine falling to a 52 Hz body puts its weight 20 to 70 ms
  // after the onset, so it is heard late. A click has all its energy in its
  // first 2 ms: a burst of white noise and a 2.5 kHz tick, gone in 15 ms.
````

<a id="radio-53"></a>
## radio-53: demo/radio/tempo.mjs, module, line 1

````js
// The tempo detector of /radio/tempo/ and /radio/live/, one
// copy for both since 2026-10-12. The two pages carried it line for line
// (checked with `diff` the day it moved), so a change to it is made here once
// and research/tools/tempo-key/our-tempo.mjs imports this very file to measure
// it offline. /radio/key/ has no tempo and does not use it.
//
//   const det = createTempoDetector(ctx, { pull, playing: () => playing, onReading: (ev) => bay.send(BPM_EV, ev) });
//   source.connect(det.in);
//
// `det.conf` is the last reading's confidence. A reading is
// { of: 'param', name: 'bpm', v, confidence, beatAt, beats, candidates }.
// STEADY is the confidence under which a page says "no steady beat" instead
// of a number (asked 2026-10-12, plan-tempo-key-improve.md item 2).
//
// ── the tempo detector. Plain WebAudio and a little arithmetic.
// 1. Four bands of the sound: below 150 Hz (the kick and the bass), around
//    400 Hz, around 1.5 kHz (snares, voices) and above 4 kHz (hats), merged
//    into one four channel input.
// 2. Each band's energy through a follower (the square, smoothed by two one
//    pole low passes at FOLLOW_HZ), read every HOP samples on a log scale, and
//    how much it ROSE since the hop before. The rises, summed over the bands,
//    are the onset envelope. Before it is used, its own one second running
//    mean is taken off and only what stands above that is kept.
// 3. Every half second, the autocorrelation of the last WIN_S seconds of that
//    envelope. Each tempo from LO to HI scores the mean of its correlation at
//    one, two and four beats, plus half of it at half a beat (a beat that
//    splits in two, as nearly all pop does), times a prior that falls off
//    either side of 120 bpm (a Gaussian in octaves, PRIOR_OCT wide). The
//    peaks of that score are the CANDIDATES, and all of them are sent.
// 4. The chosen one is the best candidate, with a bonus of STICK for staying
//    within 3% of the last choice, and the line is the median of the last
//    five choices.
// 5. The confidence is how strong that score is, 1 - exp(-score / CONF_K),
//    times how many of the last eight choices agree with it (half weight),
//    times how far the best peak stands above the second (CONF_R0, CONF_P).
// 6. With the period known, the phase, from each band's own rises kept in a
//    ring beside the sum, compressed less than the tempo's (PH_LOGK). A beat
//    envelope weighs the bands PH_W (the low band whole, the hats not at
//    all). Every offset into the last PH_SPAN_S seconds
//    is scored as a pulse train: at each beat back, the beat envelope under a
//    Gaussian PH_SIG_S wide, plus HAT_BETA times the hat band half a beat
//    later, each beat counting less with age (PH_DECAY_S). The best offset is
//    the last beat, on this tab's audio clock. The beats on that grid since
//    the last reading go with it, and the wave draws them.
//
// 🔴 WHY, MEASURED 2026-10-11 OFFLINE ON BOTH RECORDINGS, after *"there is
// very steady beat on r2"* and *"impove yr algis"*. The detector before this
// read Raadio 2 as 127 and 84.7 by turns (84.7 is 127 times 2/3: the song's
// pattern repeats every one and a half beats, and the old score could not
// tell that from a beat), with a median confidence of 0.21, because that
// confidence was the bare correlation at one beat of a two band envelope.
// The kicks and bass in the low band come every 0.235 s, and the envelope
// correlates more at 2, 4 and 8 of those than at 3, 5 and 7, so the beat is
// two of them: 127.0 bpm on the kick grid. After: 358 of 359 readings within
// 3% of 127.0 on Raadio 2 (re-measured against the kick grid) and every one
// of the 231 in Raadio 4's first two minutes, where it was 127 to 129 before
// as well. Raadio 4's last minute has no steady beat (a 55 s window's best
// score is 0.02 against 0.48 in its first two minutes) and its confidence
// falls there, which is right.
//
// 🔴 WHY THE PHASE STEP IS A PULSE TRAIN WITHOUT THE HATS, MEASURED 2026-10-11
// OFFLINE after *"beats are often uppeat"* and *"radio 2 is upbeat. not
// good."* (research/beat-tracking-2026-10-11.md). The step before took the
// phase from the four band sum over 4 s, and on Raadio 2 put 48% of its
// beats exactly half a beat off the kick. The hat band above 4 kHz sits on
// the offbeat in that music and every band is log compressed on its own, so
// a quiet hat's rise counted as much as a loud kick's, and the low band could
// not outvote it because the bass comes back on the offbeat too. With the
// hats out of the beat envelope, a pulse train over 6 s and the hats scored
// half a beat later, drawn beats on the kick go from 50% to 97% on Raadio 2
// and half a beat off from 48% to 3%. Raadio 4 stays at 100%, and Ida (a
// steady kick at 131.2 bpm and almost nothing above 4 kHz) goes from 97% to
// 98%. The weights were chosen on Raadio 2, and the hats half a beat later is
// a dance music prior that would pull the wrong way where the hats land on
// the beat.
//
// 🔴 WHY THE PHASE STEP MEASURES THE HATS' SIDE AND KEEPS ITS GRID, MEASURED
// 2026-10-12 OFFLINE after *"not good perf of bmp"* on radio/030
// (research/tempo-key-eval-2026-10-12.md section 4.4, plans/plan-tempo-key-improve.md
// item 1). The step above chose a phase afresh every half second with no
// memory, and assumed the hats sit on the offbeat. On three Ida takes where
// they do not, the drawn beat sat half a beat off beat_this's 17 to 52% of the
// time and the grid jumped 23 to 27 times a minute. So step 6 is now:
//   a. The low bands (PH_W) find their own best grid first.
//   b. The hat band is folded on that grid. Only when the hats sit more on the
//      offbeat than on the beat, by PH_RATIO, is the HAT_BETA offbeat term
//      used; otherwise the beat envelope is all four bands at PH_Y and there is
//      no offbeat term.
//   c. The last reading's grid, carried forward and allowed to slide PH_SLIDE
//      of a beat toward the best nearby phase, is kept unless the best new
//      phase beats it by more than PH_KEEP.
// Pooled over six recordings (Raadio 2 and 4, four Ida takes) against
// beat_this: on the beat 63% to 77%, half a beat off 27% to 11%, grid jumps
// 21.4 to 4.5 a minute. Raadio 2 85% to 83% on. The tempo is untouched.
// Keep alone, without (b), cut the jumps and left "on" at 62%: it held the
// wrong grid as steadily as the right one. PH_RATIO 1, 1.5 and 2 gave 75, 77
// and 78% on, so it is not knife edge. Chosen on those six recordings.
//
// 🔴 WHY THE PHASE HAS ITS OWN LOG SCALE AND THE CONFIDENCE ASKS FOR A CLEAR
// WINNER, MEASURED 2026-10-12 OFFLINE after *"Build better tempo detector."*,
// same six recordings and tooling. Each band's level is log1p(K * energy) before
// its rise is taken. At the tempo's K = 1e4 a quiet band's rise counts nearly as
// much as a loud one's, which is right for finding a period and wrong for
// placing a beat: the phase reads its own rises at PH_LOGK = 5e2, where the
// loud kick outweighs the rest. On the beat 77.2% to 81.3%, half off 11.0% to
// 8.0%, grid jumps 4.5 to 3.8 a minute; Raadio 2 82.5 to 91.5% on. 1e2, 2e2,
// 3e2, 5e2, 1e3, 3e3 and 1e4 were tried (on 79.8, 81.1, 80.5, 81.3, 79.9, 77.1,
// 77.2); the same 1e3 on the TEMPO's rises cost Ida 1354 2 points exact and was
// dropped. The tempo is untouched by it.
// The confidence was the score and the agreement only, and a reading whose
// second best period scored nearly as high as the first was shown as steady as
// one with a clear winner. Times ((1 - r2) / (1 - CONF_R0)) ** CONF_P, capped at
// 1, where r2 is the second peak's score over the first: shown right 73.4% to
// 75.9% of scored readings, shown wrong 6.3% to 5.0%, no steady beat 26.6% to
// 25.0%. CONF_P = 0.5 and CONF_R0 = 0.5 with CONF_K = 0.16 gives 75.2, 4.0 and
// 26.6 instead: fewer wrong, no more often confident. Chosen on these six
// recordings; left out one at a time the fitted constants move (K 0.12 to 0.13,
// R0 0.6 to 0.7) and the held out recording gained or held in five of six.
````

<a id="radio-54"></a>
## radio-54: demo/radio/tempo.mjs, module, line 138

````js
// Under this confidence a page shows "no steady beat" and no number. MEASURED
// 2026-10-12: readings at 0.5 or more are 92% within 4% of the tools, under 0.5
// only 54%, and they are 20% of readings. The click already waits for the same
// 0.5 (DRUM_FLOOR on the pages).
````

<a id="radio-55"></a>
## radio-55: demo/radio/tempo/index.html, inline script, line 30

````js
  // concepts radio/020 (beats/000 for an afternoon, 2026-10-11: *"move radio 020 to beats group into 000"*, then *"move beats concepts to radio, rename accordingly"*), TEMPO, 2026-10-11. Recordings of ERR's Raadio 2 and 4
  // and of Ida, kept in our own R2 bucket (`positron-station`, read through the station
  // worker's /media/, CORS `*`, as /code/piano/ reads its piano),
  // played in this tab into the radio's wave, the speakers and a tempo
  // detector, whose tempo travels as events along a `value` link into a
  // display of its own. Asked: *"In radio demo we had some bpm detect demo.
  // Dearcive. Rm granulator just a radio waves and sepatare visualizer. Use r2
  // and ida. Bring to cocept to naming syrem"*. The granulator that stood here
  // is in git history before this change.
  //
  // NOTHING OPENS ON A VISIT, AND NOTHING EVER OPENS IDA'S SERVER. Play fetches
  // the recording from our bucket, once per page, and loops it. `?src=<url>`
  // points the page at another recording (a local file for a check).
````

<a id="radio-56"></a>
## radio-56: demo/radio/tempo/index.html, inline script, line 44

````js
  // 🔴 ERR's RAADIO 2 AND RAADIO 4, AND IDA SINCE 2026-10-11 ~11:44 UTC. Asked
  // first *"Ida is offline. Work on radio 2 and 4 from err"*, because the first
  // capture of Ida was digital silence, and then *"add ida"* once a second
  // capture had sound in it (3:09, mean -27.2 dB). Each station was captured
  // ONCE, about three minutes through our own relay (positron-shout, one
  // listener; Raadio 2 and 4 at 10:18 UTC, Ida from mount ida-tallinn at about
  // 11:44 UTC), and kept in our bucket, so a visit, a play and a loop never
  // reach ERR's or Ida's servers. Ida is ADTS AAC (44.1 kHz stereo), the other
  // two MP3: nothing below reads the extension or the content type, and
  // decodeAudioData sniffs the bytes.
````

<a id="radio-57"></a>
## radio-57: demo/radio/tempo/index.html, inline script, line 55

````js
    // Named as recordings, so none is taken for the live station (asked
    // 2026-10-13, *"when you have radio recordings, suffix patch names with
    // '... recording'"*). /radio/live/ plays them live and keeps the plain names.
````

<a id="radio-58"></a>
## radio-58: demo/radio/tempo/index.html, inline script, line 68

````js
  // ── the bay ─────────────────────────────────────────────────────────────
  // A recording is a FILE in the bucket and becomes sound only in this tab, so
  // the bucket's port is `file-out` into a player, and the player's
  // `audio-out` feeds the wave, the speakers and the detector.
````

<a id="radio-59"></a>
## radio-59: demo/radio/tempo/index.html, inline script, line 113

````js
  // Every recording brought to one loudness once, as it is decoded, SECOND BY
  // SECOND (asked 2026-10-11, *"ida signal is soooo weak"*, then *"still weak
  // sinal in ida. measyre"*). MEASURED on the Ida capture in 5 s blocks: the
  // music is -44 dB RMS with peaks at -30 for all but 25 s, and 110 to 135 s is
  // something else at -14 dB that clips at +3. One gain for the whole file, as
  // the first version did, was set by that loud stretch and raised the music
  // only 8 dB, to about -36. So the gain is per LEVEL_S second block: each
  // block raised (never lowered) toward LEVEL_RMS, by at most LEVEL_MAX_DB, the
  // gains eased across blocks so a loud block is not pumped into, and the gain
  // ramps between block centres. Anything over KNEE is bent under 1 with a
  // tanh. Raadio 2 (-15.5 mean) is left almost alone. The detector hears the
  // levelled sound too.
````

<a id="radio-60"></a>
## radio-60: demo/radio/tuner/index.html, style, line 22

````css
  /* The dial scale: each station's name centred on the point the engine tunes
     it at. The point is a share of the handle's TRAVEL, not of the lane, which
     is how slider.mjs places its handle, so a name sits under the handle when
     the handle sits on that station. */
````

<a id="radio-61"></a>
## radio-61: demo/radio/tuner/index.html, inline script, line 44

````js
  // An AM tuner as a patchbay: /radio/blend/ with four stations and a noise
  // source, all into one tuner effect, whose dial picks which station is clear
  // and lets the neighbours bleed in as echoes. `?base=` points the page at
  // demo/fake-station.mjs instead of the relay.
  //
  // NOTHING OPENS ON A VISIT. No AudioContext and no fetch until play. The
  // whole patch is held from load, so the picture does not change with play.
  //
  // 🔴 PLAY OPENS FOUR CONNECTIONS TO OTHER PEOPLE'S SERVERS PER LISTENER,
  // through the relay: three ERR mounts and one Ida mount. So ERR counts THREE
  // listeners for every person who presses play here, not one, and its
  // audience figures are what it reports to its board. They open only on the
  // press, because that is a person asking to listen. Never probe them; test
  // against the stand-in.
````

<a id="radio-62"></a>
## radio-62: demo/radio/tuner/index.html, inline script, line 118

````js
  // ── how the dial maps to sound ──────────────────────────────────────────
  // d is the distance from the dial to a station's point. Clear is a narrow
  // bell on the station; echo is a wide bell, faint, and only what clear
  // leaves; noise fills what no station holds; the whistle is the beat of a
  // carrier slightly off tune, silent dead on and gone far away, its pitch
  // rising with the distance.
````

<a id="radio-63"></a>
## radio-63: demo/radio/tuner/index.html, inline script, line 291

````js
  // No labels on the dial since 2026-10-13 (*"rm labels"*): no 531 / 1602 ends
  // and no station names under it; the marks still exist for paintScale, unshown.
````
