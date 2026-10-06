// demo/shell/synth-steps.mjs: the Faust program of the `synths` deck.
//
// 🔴 ONE SOURCE FOR TWO READERS. The deck (`demo/shell/decks.mjs`, through
// `demo/shell/slide-synth.mjs`) shows `code` in an editable code box, and
// `demo/resources/build-faust-aot.mjs` compiles the same string ahead of time
// into `demo/resources/faust/<id>.*`, which is what `Test tone` plays while the
// box still holds it. `workers/view/build.mjs` (`checkFaustAot`) refuses a build
// whose artefact was compiled from a different text, so the program on the
// slide and the program in the speaker cannot drift apart.
//
// 🔴 SEVEN PROGRAMS SINCE 2026-10-06 (the filter and the LFO on it came
// last, after the saw), ALL MONO, EACH ADDING ONE THING. The
// second is the first with its 0.5 turned into a slider (*"slode 3: make 0.5
// into knob 0..1"*), which the slide draws as a knob; the third is the second
// with its 440 on a slider too (*"slide 4 is freq"*), two knobs in one row;
// the fourth swaps the sine for a sawtooth, and the fifth chooses between
// them with a radio.
// What follows is about the first.
// 🔴 ONE PROGRAM UNTIL THEN, AND IT IS MONO WITH ITS NUMBERS TYPED IN.
// Asked: *"rm fau slides c-f ... editable code, hardcoded params for minimal
// sine and then fau nameplate and test tone button on right"*. The deck was an
// intro and five steps that grew a polyphonic voice by one element a slide
// (wave and detune, an envelope, a filter, an echo); those four later steps,
// their compiled files and their provenance went the same day. What is left is
// the smallest program that makes a sound: no `freq`, `gain` or `gate`, so no
// key and no knob, and one output, so the runtime builds a MONO node
// (`faust.mjs`, `mono: true`) that sounds while it is connected and is silent
// while it is not. That is the whole of what `Test tone` switches.
// ⚠️ `mono: true` IS READ BY THE AHEAD OF TIME BUILD AND BY THE SLIDE, which
// must agree: a mono artefact is one `.wasm` and no mixer.
// ⚠️ NO DOM AND NO IMPORT, so node reads this for the ahead of time build and
// the build's stale check.

/** The programs, in deck order. `id` names the artefacts: `/resources/faust/<id>.json`. */
export const SYNTH_STEPS = [
  {
    id: 'sine',
    name: 'a sine in code',
    mono: true,
    // half volume, asked 2026-10-06 as *"make it half volume"* (it was 0.1)
    // single line comments in the code, asked 2026-10-06 as *"add comments to
    // fau code (single line ones)"* and *"why we multily with 0.1?"*
    // each comment kept short enough not to wrap in the half width panel
    code: `import("stdfaust.lib");

// 440 Hz at half volume
process = os.osc(440) * 0.5;
`,
  },
  {
    id: 'volume',
    name: 'the volume on a knob',
    mono: true,
    // the sine's 0.5 as a slider, asked 2026-10-06 as *"slode 3: make 0.5
    // into knob 0..1"*; it starts at 0.5, where the slide before left it, and
    // `slide-synth.mjs` draws every slider the program declares as a knob
    code: `import("stdfaust.lib");

// volume knob
volume = hslider("volume", 0.5, 0, 1, 0.01);

process = os.osc(440) * volume;
`,
  },
  {
    id: 'pitch',
    name: 'the pitch on a knob',
    mono: true,
    // the 440 as a slider beside the volume, asked 2026-10-06 as *"slide 4 is
    // freq"*, and in this order: *"volume = hslider(...); freq = hslider(...);
    // this order, progressing. add comments"*. So it is slide 3's program
    // plus one line, the knob row reads volume then freq, and each slider
    // line carries a comment short enough not to wrap in the panel.
    // ⚠️ NO `[scale:log]`, although `param-knobs.mjs` honours it (warp
    // `exp`): the line is the owner's, written linear, and it stays short
    // THE OWNER'S LAYOUT, 2026-10-06, from a screenshot of their own edit:
    // *"use this layout as i pointed"*. No comment on the import, a short
    // comment over each knob, a blank line between the blocks; slides 2 and
    // 3 follow it
    code: `import("stdfaust.lib");

// volume knob
volume = hslider("volume", 0.5, 0, 1, 0.01);

// freq knob
freq = hslider("freq", 440, 50, 2000, 1);

process = os.osc(freq) * volume;
`,
  },
  {
    id: 'saw',
    name: 'a sawtooth',
    mono: true,
    // HIDDEN 2026-10-06, asked as *"hide sawtooth and its selection"*, and
    // BACK the same evening as the filter's source: a filter takes overtones
    // away and a sine has none, so the step before the filter is the wave
    // that has them (*"what abut filter? see some synth building tutorials
    // what is rigth order?"*, then *"do filter, lfo"*)
    // slide 5, asked 2026-10-06 as *"sawtooth"* from four offered next steps:
    // slide 4's program with one word changed, `os.osc` to `os.sawtooth`, so
    // the step is the wave's shape and the scope shows it
    code: `import("stdfaust.lib");

// volume knob
volume = hslider("volume", 0.5, 0, 1, 0.01);

// freq knob
freq = hslider("freq", 440, 50, 2000, 1);

// a sawtooth instead of a sine
process = os.sawtooth(freq) * volume;
`,
  },
  {
    id: 'filter',
    name: 'a filter on a knob',
    mono: true,
    // after the sawtooth, asked 2026-10-06 as *"do filter, lfo (for filter?)"*:
    // the saw's program with a `cutoff` knob and a two pole low pass, the
    // order every subtractive tutorial teaches (source, filter, envelope,
    // modulation). Turned down, the saw goes dark as its overtones go
    code: `import("stdfaust.lib");

// volume knob
volume = hslider("volume", 0.5, 0, 1, 0.01);

// freq knob
freq = hslider("freq", 440, 50, 2000, 1);

// cutoff knob
cutoff = hslider("cutoff", 2000, 100, 8000, 1);

// a low pass keeps what is under the cutoff
process = os.sawtooth(freq) : fi.lowpass(2, cutoff) * volume;
`,
  },
  {
    id: 'lfo',
    name: 'an lfo on the filter',
    mono: true,
    // the same ask, its second half: a slow sine moving the cutoff up and down
    // around the knob, `rate` how fast and `depth` how far. Depth stops at
    // 0.9 so the swept cutoff never reaches 0 Hz
    code: `import("stdfaust.lib");

// volume knob
volume = hslider("volume", 0.5, 0, 1, 0.01);

// freq knob
freq = hslider("freq", 440, 50, 2000, 1);

// cutoff knob
cutoff = hslider("cutoff", 2000, 100, 8000, 1);

// lfo knobs
rate = hslider("rate", 2, 0.1, 10, 0.1);
depth = hslider("depth", 0.5, 0, 0.9, 0.01);

// the lfo sweeps the cutoff
sweep = cutoff * (1 + depth * os.osc(rate));

process = os.sawtooth(freq) : fi.lowpass(2, sweep) * volume;
`,
  },
  {
    id: 'wave',
    name: 'a wave to choose',
    mono: true,
    // HIDDEN with `saw`, the same ask
    hidden: true,
    // slide 6, asked 2026-10-06 as *"how to make it a radio (sawtooth?)"*:
    // slide 4's program with a third control, an `nentry` whose
    // `[style:radio{...}]` the slide draws as a choice of sine and saw
    // (`slide-synth.mjs`), and `select2` picking between the two oscillators
    // inside `process` (a variable of its own for the switch was tried and
    // taken back the same day: *"no need for tone var"*)
    code: `import("stdfaust.lib");

// volume knob
volume = hslider("volume", 0.5, 0, 1, 0.01);

// freq knob
freq = hslider("freq", 440, 50, 2000, 1);

// wave choice
wave = nentry("wave[style:radio{'sine':0;'saw':1}]", 0, 0, 1, 1);

process = select2(wave, os.osc(freq), os.sawtooth(freq)) * volume;
`,
  },
];

/** Where a program's ahead of time instrument is served. */
export const synthUrl = (id) => `/resources/faust/${id}.json`;
