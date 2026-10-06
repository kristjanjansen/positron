// demo/fau/presets.mjs: the programs `/fau/` opens with.
//
// 🔴 IN THEIR OWN FILE SINCE 2026-10-06, SO THE TEXT THE PAGE SHIPS AND THE
// TEXT COMPILED AHEAD OF TIME ARE ONE TEXT. `demo/resources/build-faust-aot.mjs`
// imports this list and compiles the Organ into `demo/resources/faust/`, and
// `workers/view/build.mjs` refuses a build whose artefact was compiled from a
// different Organ. `demo/shell/code-lang-test.mjs` imports it too, where it
// used to read the page with a regular expression. `/collide/` already keeps
// its presets this way, in `demo/collide/presets.mjs`.
// ⚠️ THE FAUST TEXT IS BYTE FOR BYTE WHAT THE PAGE HELD: only the JavaScript
// around it lost the page's two space indent.

/**
 * The presets, and each one is a whole instrument in the box.
 *
 * 🔴 THE THREE MAGIC NAMES ARE `freq`, `gain` AND `gate`. A Faust DSP becomes
 * one VOICE of a polyphonic instrument by declaring those three, and the
 * runtime replicates it. Rename any of them and the keyboard stops reaching
 * it, which is a thing a visitor can do by accident and the log says so.
 *
 * ⚠️ AND THE COMPRESSION IS A DICTIONARY, NOT MAGIC, WHICH IS WHY `djembe` IS
 * HERE. 0.27 kB of source becoming 17.21 kB of machine code is real, and it is
 * real because `pm.djembe_ui_MIDI` is a NAME for something living in the
 * 2.41 MB of library that was already downloaded. The moment the sound is
 * something nobody wrote a library function for, the source is as long as the
 * sound is complicated: the STK waveguide piano is 21.92 kB of it. Both halves
 * of that belong on the page rather than only the flattering one.
 * ⚠️ THOSE TWO FIGURES READ `75 bytes` AND `12,820 bytes` UNTIL 2026-09-25 AND
 * BOTH WERE STALE. The djembe grew its comments on 2026-09-24 and nothing here
 * moved with it. RE-MEASURED that day against this file's own source, which is
 * the only reason the new pair is worth anything.
 *
 * ── A BLANK LINE AFTER EVERY COMMENT, AND IT IS ONLY THIS LISTING ──────────
 *
 * 🔴 ASKED 2026-09-25 AS *"add nl after comments"*, WITH A WORKED EXAMPLE
 * RATHER THAN A DESCRIPTION, AND THE SCOPE WAS PUT TO THE OWNER AND ANSWERED:
 * the Faust listing shown on this page, not a repository sweep and not a
 * convention for new JavaScript. So it applies to the `code` strings below and
 * to nothing else in this file.
 * ✅ **THE FORM IS: A COMMENT ON ITS OWN LINE IS FOLLOWED BY A BLANK LINE
 * BEFORE THE CODE IT INTRODUCES.** Two comment lines in a row are one comment
 * and take one blank line after the pair, because the blank separates the
 * comment from its code rather than the lines from each other.
 * ⚠️ **A TRAILING COMMENT GETS NOTHING, AND THAT IS NOT AN OVERSIGHT.**
 * `gate = button("gate");   // 1 while a key is held down` introduces no code:
 * the code is to its left and already read. A blank line under it would
 * separate two statements that belong together.
 * ⚠️ **AND IT COSTS FOUR TO SIX LINES A PRESET, WHICH IS WHY `rows` MOVED.**
 * See the code box below: the box is sized to the longest listing, MEASURED
 * rather than guessed, and this ask changed which number that is.
 */
export const PRESETS = [
  {
    id: 'organ',
    label: 'Organ',
    what: 'three partials and an envelope, which is the one to edit first',
    code: `import("stdfaust.lib");   // brings in os, en and si, used below

freq = hslider("freq", 440, 40, 8000, 0.01);   // the note a key asked for
gain = hslider("gain", 0.5, 0, 1, 0.01);       // how hard that key was hit
gate = button("gate");                         // 1 while a key is held down

// the knobs: how loud the octave and the twelfth are, and the release

oct   = hslider("oct", 0.5, 0, 0.6, 0.01) : si.polySmooth(gate, 0.999, 1);
quint = hslider("quint", 0.25, 0, 0.5, 0.01) : si.polySmooth(gate, 0.999, 1);
rel   = hslider("rel[scale:log]", 0.35, 0.02, 3, 0.01);

// attack, decay, sustain, release. Seconds, except the 0.7 which is a level

env  = en.adsr(0.005, 0.12, 0.7, rel, gate);

// three sine partials: the note, its octave, and its twelfth

tone = os.osc(freq) + oct * os.osc(freq * 2) + quint * os.osc(freq * 3);

// what you hear. <: splits one signal into the two the speakers want

process = tone * env * gain * 0.2 <: _, _;
effect  = _, _;   // runs once after the mixer. _ is a wire that changes nothing
`,
  },
  {
    /* 🔴 THE SAME INSTRUMENT AS `demo/shell/rhodes.mjs`, WRITTEN AGAIN IN
       FOUR LINES. That file is 60 lines of per-sample JavaScript arithmetic
       and its header explains the sound: a TINE operator at a high ratio
       decaying in tens of milliseconds, a BODY at 1:1 decaying over a second,
       and a carrier both of them phase-modulate. This is that description
       with the loops taken out, which is what a signal language is for. */
    id: 'rhodes',
    label: 'Rhodes',
    what: 'a tine, a body and a carrier they both bend, which is the DX7 electric piano',
    code: `import("stdfaust.lib");   // brings in os, en and si, used below

freq = hslider("freq", 440, 40, 8000, 0.01);   // the note a key asked for
gain = hslider("gain", 0.5, 0, 1, 0.01);       // how hard that key was hit
gate = button("gate");                         // 1 while a key is held down

// the knobs: how far the tine and the body bend the note, and how long it rings

index = hslider("index", 0.02, 0, 1, 0.01) : si.polySmooth(gate, 0.999, 1);
decay = hslider("decay[scale:log]", 1.4, 0.3, 4, 0.01);

// the tine: 14 times the note, gone in 20 ms. This is the hammer hitting it

knock = os.osc(freq * 14) * en.ar(0.001, 0.02, gate) * 3.2 * gain;

// the body: the note itself, ringing on for about a second

body  = os.osc(freq) * en.ar(0.001, 0.9, gate) * 1.1;
env   = en.adsr(0.002, decay, 0.0, 0.4, gate);   // 0.0 sustain, so it dies away

// both of them bend the carrier's pitch instead of being added to it,
// which is FM, and it is what makes this a Rhodes and not three oscillators

process = os.osc(freq + (knock + body) * freq * index) * env * gain * 0.3 <: _, _;
effect  = _, _;
`,
  },
  {
    /* 🔴 THE THIRD, ADDED 2026-09-28 IN PLACE OF `Bell`, WHICH IS THE ROW THE
       ASK TOOK OUT: *"rm bell and hall from fau they do not diffentiate"*.
       `Bell` was the Rhodes with `3.51` typed where a whole number had been,
       and its own comment said so, so a visitor stepping onto it learned a
       number rather than a mechanism.
       🔴 WHAT THIS ONE SHOWS AND NOTHING ELSE ON THE PAGE DOES IS `~`, THE
       OPERATOR THAT LETS A SIGNAL READ ITS OWN OUTPUT. Everything else here
       runs forwards: the Organ adds oscillators up, the Rhodes bends one with
       another, and the two library names below hide whatever they do. This
       patch has no oscillator in it at all. Twelve milliseconds of noise go
       into a delay line that feeds itself, the LENGTH of that delay is the
       pitch, and the fraction that survives a lap is the decay. It is
       Karplus-Strong, the cheapest physical model there is, and it is the
       counterweight to `Djembe` and `Clarinet`: the same kind of thing those
       two name in one word, written out where a visitor can change it.
       ✅ MEASURED 2026-09-28, compiled the way THIS page compiles, which is
       polyphonic with a voice, an effect and a mixer: 68 ms cold and 27 to
       30 ms warm, 8.61 kB of machine code, 16.47 kB a voice. That per-voice
       figure is the only one on this page that is a BUFFER rather than a
       table or almost nothing, which is what a delay line is.
       ⚠️ NOTHING NEW CROSSES THE WIRE. `no`, `de` and `fi` are all inside the
       2.41 MB of library the page has already downloaded, the same condition
       the Clarinet below was chosen under.
       ⚠️ AND THE DAMPER IS ONE TERM RATHER THAN A SECOND ENVELOPE. A string
       with a constant feedback rings on after the key comes up, which is what
       a real one does and is wrong on a keyboard with eight voices and a
       sustain pedal, because then nothing the foot does can be told apart
       from the instrument ignoring it. `keep` drops to 0.9 when the gate
       goes. MEASURED offline at 440 Hz: an RMS of 0.0009 in the first tenth
       of a second after the key lifts, against 0.075 in the first tenth it
       was held. */
    id: 'pluck',
    label: 'Pluck',
    what: 'a burst of noise in a loop that reads its own output, which is a string',
    code: `import("stdfaust.lib");   // brings in no, en, de and fi, used below

freq = hslider("freq", 440, 40, 8000, 0.01);   // the note a key asked for
gain = hslider("gain", 0.5, 0, 1, 0.01);       // how hard that key was hit
gate = button("gate");                         // 1 while a key is held down

// twelve milliseconds of noise, which is the finger leaving the string

burst = no.noise * en.ar(0.001, 0.012, gate) * gain;

// the knobs: how bright the string is, and how much of each lap is lost

cutoff = hslider("cutoff[scale:log]", 5000, 500, 12000, 1);
damp   = hslider("damp[scale:log]", 0.001, 0.0003, 0.03, 0.0001);

// one lap of the loop. How long the lap is IS the note, and how much of it
// comes back is the decay, which drops to 0.9 when the key lifts

keep = 0.9 + (0.1 - damp) * gate;
lap  = de.fdelay(2048, ma.SR / freq - 1) : fi.lowpass(1, cutoff) : *(keep);

// ~ feeds the output back into the + it is written on, one sample later

process = burst : (+ ~ lap) * 0.4 <: _, _;
effect  = _, _;
`,
  },
  {
    /* 🔴 THE FOURTH, ADDED 2026-09-28 IN PLACE OF `Hall`, AND IT KEEPS THE ONE
       THING `Hall` WAS FOR. That row was the Organ verbatim with
       `effect = dm.freeverb_demo;` under it, which is a real lesson about the
       last line of every listing sitting on a voice the page already had. The
       room moves here, onto a voice that is nobody else's.
       🔴 AND THE VOICE IS THE THIRD WAY OF MAKING A SOUND, WHICH THIS PAGE
       DID NOT HAVE. The Organ adds oscillators together and the Rhodes bends
       one with another, so both of them BUILD the sound up. This one starts
       with a sawtooth, which has every harmonic of the note in it already,
       and takes most of that away again with a filter whose corner is driven
       by an envelope of its own rather than by the volume.
       ✅ MEASURED 2026-09-28, compiled the way this page compiles: 106 to
       118 ms, 21.29 kB of machine code, and 108 BYTES a voice, which is the
       smallest per-voice figure this page has ever printed and is worth
       having beside the Organ's 262.26 kB. A sawtooth and a two pole filter
       keep almost nothing; `os.osc` carries a 65,536 entry sine table.
       ⚠️ AND THE ROOM IS NOT IN THOSE 108 BYTES, WHICH IS WHAT THE ASSERT
       BELOW GRADES. MEASURED the same day by compiling this listing twice,
       once as it stands and once with a bare wire on the last line:
       21.29 kB against 9.42 kB of machine code, and 108 bytes a voice either
       way, so the room really does run once on the mix.
       ⚠️ NOTHING NEW CROSSES THE WIRE. `dm` is `demos.lib` and `fi` is
       `filters.lib`, both already in the downloaded library. */
    id: 'sweep',
    label: 'Sweep',
    what: 'a sawtooth with most of it taken away again by a filter that moves',
    code: `import("stdfaust.lib");   // brings in os, en, fi, si and dm, used below

freq = hslider("freq", 440, 40, 8000, 0.01);   // the note a key asked for
gain = hslider("gain", 0.5, 0, 1, 0.01);       // how hard that key was hit
gate = button("gate");                         // 1 while a key is held down
cutoff = hslider("cutoff[scale:log]", 8000, 100, 8000, 1) : si.smoo;
res    = hslider("res[scale:log]", 6, 0.7, 8, 0.01);
depth  = hslider("depth", 11, 0, 24, 0.1) : si.polySmooth(gate, 0.999, 1);

saw = os.sawtooth(freq);                     // every harmonic is in here already
env = en.adsr(0.005, 0.2, 0.6, 0.3, gate);   // this envelope is on the volume

// and this one is on the corner the filter cuts at, which is where the sound
// is. It opens depth times the note above it, never past the cutoff, and shuts

cut = min(cutoff, freq * (1 + depth * en.ar(0.002, 0.5, gate)));

process = saw : fi.resonlp(cut, res, 1) * env * gain * 0.12 <: _, _;

// a real room, and it runs once on the mix rather than once per voice

effect  = dm.freeverb_demo;
`,
  },
  {
    id: 'djembe',
    label: 'Djembe',
    what: 'a drum somebody else modelled, named in one line',
    code: `import("stdfaust.lib");   // brings in os, en and pm, used below

// a physical model somebody else wrote, taken whole out of the library.
// pm is physmodels. It builds its own controls, which is what _ui_ means

process = pm.djembe_ui_MIDI <: _, _;
effect  = _, _;
`,
  },
  {
    /* 🔴 ADDED 2026-09-25 ON *"add more patches if you have"*, AND `if you
         have` WAS READ AS THE CONDITION IT IS. This one is not invented:
       `plan-fau.md` §1.4 names `pm.clarinet_ui_MIDI` as the measured example
       behind its own headline sentence, *"61 bytes of source becomes a
       clarinet"*, and `physmodels.lib` is already inside the 2.41 MB of
       library this page downloads. Nothing new crosses the wire for it.
       🔴 AND THE PLAN'S COMPILE TIME DOES NOT TRANSFER TO THIS PAGE, MEASURED
       2026-09-25 BEFORE IT WAS ADDED. §2.2 records 94 to 106 ms; compiled the
       way THIS page compiles, which is polyphonic with a voice, an effect and
       a mixer, it is 273 to 344 ms on this desk. The plan's figure is a MONO
       compile and this page has never made one. That is the slowest preset
       here and it is still an order of magnitude under the STK piano's
       1,690 ms, which is the one refused.
       ⚠️ `nearly three times over the next one` STOOD HERE UNTIL 2026-09-28
       AND `Sweep` MOVED IT. RE-MEASURED that day with the vendored compiler
       under node, every preset the same way so that only the ratio is being
       quoted: clarinet 241 to 260 ms against Sweep's 106 to 118, which is
       about twice rather than three times. The 273 to 344 above is the
       in-browser figure and is unchanged.
       ⚠️ `pm.brass_ui_MIDI` COMPILES IN 155 ms AND WAS NOT CHOSEN. It is in
       the same library and it would have been the cheaper row; it has never
       been measured in this repository, and picking a sound on a number the
       page does not otherwise care about is how provenance gets lost. */
    id: 'clarinet',
    label: 'Clarinet',
    what: 'the same one line as the drum with a blown tube behind it instead of a struck skin',
    code: `import("stdfaust.lib");   // brings in os, en and pm, used below

// another name out of the same library as the drum, and a blown tube keeps
// a delay line per voice where a struck skin keeps almost nothing

process = pm.clarinet_ui_MIDI <: _, _;
effect  = _, _;
`,
  },
];
