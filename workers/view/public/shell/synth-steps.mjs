// demo/shell/synth-steps.mjs: the Faust programs of the `synths` deck, one per slide.
//
// 🔴 ONE SOURCE FOR TWO READERS. The deck (`demo/shell/decks.mjs`, through
// `demo/shell/slide-synth.mjs`) shows each `code` in a code box, and
// `demo/resources/build-faust-aot.mjs` compiles the same strings ahead of time
// into `demo/resources/faust/<id>.*`, which is what a key press on the slide
// plays. `workers/view/build.mjs` (`checkFaustAot`) refuses a build whose
// artefact was compiled from a different text, so the program on the slide and
// the program in the speaker cannot drift apart. Asked 2026-10-06: *"do slide
// deck Synths in code in the fau examples. intro, basic osc (2 col view, synth
// in side), osc paramters, ...add elements to synth... keep it simple"*.
//
// 🔴 EACH PROGRAM IS THE ONE BEFORE IT PLUS ONE THING, written in `/fau/`'s
// preset style (`demo/fau/presets.mjs`): a polyphonic voice declaring `freq`,
// `gain` and `gate`, which the runtime sets from a key, `<: _, _` for the two
// speakers. No comments inside the code, because the slide's own headline and
// caption say what the new lines are, and a line under 53 characters is what
// half a front page player can still show (see `slide-synth.mjs`).
// ⚠️ `knobs` NAMES THE SLIDERS THE SLIDE PUTS ON KNOBS: the ones this step
// added, not every slider in the program. The earlier ones keep their default,
// which is in the text.
// ⚠️ NO DOM AND NO IMPORT, so node reads this for the ahead of time build and
// the build's stale check.

const HEAD = `import("stdfaust.lib");

freq = hslider("freq", 440, 20, 4000, 1);
gain = hslider("gain", 0.5, 0, 1, 0.01);
gate = button("gate");
`;

const PARAMS = `
wave   = hslider("wave", 1, 0, 1, 1);
detune = hslider("detune", 1.5, 0, 6, 0.01);

osc(f) = select2(wave, os.osc(f), os.sawtooth(f));
tone   = (osc(freq) + osc(freq + detune)) / 2;
`;

const ENV = `
attack  = hslider("attack", 0.01, 0.001, 1, 0.001);
release = hslider("release", 0.4, 0.01, 2, 0.01);

env = en.adsr(attack, 0.1, 0.8, release, gate);
`;

const FILTER = `
cutoff = hslider("cutoff[scale:log]", 900, 80, 8000, 1);
res    = hslider("res", 3, 0.7, 10, 0.01);
`;

const ECHO = `
time     = hslider("time", 0.3, 0.05, 1, 0.01);
feedback = hslider("feedback", 0.4, 0, 0.9, 0.01);

echo   = + ~ (de.delay(65536, ma.SR * time) * feedback);
effect = echo, echo;
`;

/** The steps, in deck order. `id` names the artefacts: `/resources/faust/<id>.json`. */
export const SYNTH_STEPS = [
  {
    id: 'osc',
    name: 'one oscillator',
    say: 'One oscillator',
    cap: 'a sine at the key’s pitch, sounding while the key is held',
    knobs: [],
    code: `${HEAD}
process = os.osc(freq) * gain * gate * 0.3 <: _, _;
`,
  },
  {
    id: 'osc2',
    name: 'oscillator parameters',
    say: 'Two knobs change the oscillator',
    cap: 'wave picks a sine or a saw, detune beats a second one against it',
    knobs: ['wave', 'detune'],
    code: `${HEAD}${PARAMS}
process = tone * gain * gate * 0.3 <: _, _;
`,
  },
  {
    id: 'env',
    name: 'an envelope',
    say: 'An envelope shapes each note',
    cap: 'attack fades a note in, release lets it ring after the key',
    knobs: ['attack', 'release'],
    code: `${HEAD}${PARAMS}${ENV}
process = tone * env * gain * 0.3 <: _, _;
`,
  },
  {
    id: 'filter',
    name: 'a filter',
    say: 'A filter takes the edge off',
    cap: 'cutoff is where it starts to cut, res rings at that point',
    knobs: ['cutoff', 'res'],
    code: `${HEAD}${PARAMS}${ENV}${FILTER}
voice   = tone * env * gain * 0.3;
process = voice : fi.resonlp(cutoff, res, 1) <: _, _;
`,
  },
  {
    id: 'echo',
    name: 'an echo',
    say: 'An echo runs once on the mix',
    cap: 'the effect comes after all eight voices, so they share one echo',
    knobs: ['time', 'feedback'],
    code: `${HEAD}${PARAMS}${ENV}${FILTER}
voice   = tone * env * gain * 0.3;
process = voice : fi.resonlp(cutoff, res, 1) <: _, _;
${ECHO}`,
  },
];

/** Where a step's ahead of time instrument is served. */
export const synthUrl = (id) => `/resources/faust/${id}.json`;
