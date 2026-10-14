// demo/shell/synth-steps.mjs: the Faust programs of the `synths` deck, one source for the slide's
// code box and the ahead-of-time build (`checkFaustAot` refuses a stale artefact). All mono, each
// adding one thing; `mono: true` is read by the build and the slide alike. No DOM, no import.
// why: lessons/kit-synth-steps.md#header

/** The programs, in deck order. `id` names the artefacts: `/resources/faust/<id>.json`. */
export const SYNTH_STEPS = [
  {
    id: 'sine',
    name: 'a sine in code',
    mono: true,
    // Half volume; short single-line comments that fit the half width panel.
    // why: lessons/kit-synth-steps.md#step-sine
    code: `import("stdfaust.lib");

// 440 Hz at half volume
process = os.osc(440) * 0.5;
`,
  },
  {
    id: 'volume',
    name: 'the volume on a knob',
    mono: true,
    // The sine's 0.5 as a slider starting at 0.5; slide-synth.mjs draws every slider as a knob.
    // why: lessons/kit-synth-steps.md#step-volume
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
    // The 440 as a slider after the volume, so the knob row reads volume then freq. Linear, no
    // `[scale:log]`; a short comment over each knob and a blank line between blocks.
    // why: lessons/kit-synth-steps.md#step-freq
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
    // The volume and freq program with `os.osc` changed to `os.sawtooth`, the wave with overtones
    // for the filter that follows.
    // why: lessons/kit-synth-steps.md#step-saw
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
    // The saw with a `cutoff` knob and a two pole low pass: source, filter, then modulation.
    // why: lessons/kit-synth-steps.md#step-filter
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
    // A third control, an `nentry` with `[style:radio{...}]` drawn as a choice of sine and saw,
    // and `select2` picking between the two oscillators inside `process`.
    // why: lessons/kit-synth-steps.md#step-radio
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
