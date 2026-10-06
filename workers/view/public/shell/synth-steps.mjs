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
// 🔴 TWO PROGRAMS SINCE 2026-10-06, BOTH MONO. The second is the first with its
// 0.5 turned into a slider (*"slode 3: make 0.5 into knob 0..1"*), which the
// slide draws as a knob. What follows is about the first.
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
    code: `import("stdfaust.lib"); // has os.osc

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
    code: `import("stdfaust.lib"); // has os.osc

// 440 Hz, its volume on a knob
volume = hslider("volume", 0.5, 0, 1, 0.01);
process = os.osc(440) * volume;
`,
  },
];

/** Where a program's ahead of time instrument is served. */
export const synthUrl = (id) => `/resources/faust/${id}.json`;
