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
// 🔴 ONE PROGRAM SINCE 2026-10-06, AND IT IS MONO WITH ITS NUMBERS TYPED IN.
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
    // single line comments in the code, asked 2026-10-06 as *"add comments to
    // fau code (single line ones)"* and *"why we multily with 0.1?"*
    // each comment kept short enough not to wrap in the half width panel
    code: `import("stdfaust.lib"); // has os.osc

// 440 Hz at a tenth of full scale
process = os.osc(440) * 0.1;
`,
  },
];

/** Where a program's ahead of time instrument is served. */
export const synthUrl = (id) => `/resources/faust/${id}.json`;
