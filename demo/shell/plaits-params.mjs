// demo/shell/plaits-params.mjs: the Plaits vocabulary both ends speak, pure and import free so the
// board (rig/board/plaits.mjs) and the page (demo/code/plaits-voice.mjs) read one list.

/** The parameter ids, as muta-worklet.js and plaits_shim.cc spell them. */
export const P = {
  engine: 0, note: 1, harmonics: 2, timbre: 3, morph: 4, decay: 5, lpgColour: 6,
  fmAmount: 11, timbreModAmount: 12, morphModAmount: 13,
};

/** The sixteen models in `plaits/dsp/voice.cc`'s order, as /muta/'s MODELS. */
export const MODELS = [
  'virtual analog', 'waveshaping', 'two operator FM', 'granular formant',
  'harmonic', 'wavetable', 'chord', 'speech',
  'swarm', 'filtered noise', 'particle noise', 'string',
  'modal', 'bass drum', 'snare drum', 'hi-hat',
];

// The patches, all sustained, the first is the default. `engine` indexes MODELS, `decay` is the
// gate's close time. `gain` trims each patch's held A3 to about 0.1 RMS at the scope (they
// spanned 0.022 to 0.146, about 16 dB), on Plaits' own output.
// See lessons/page-code.md#code-35
export const PATCHES = [
  { name: 'Wavetable drift', engine: 5, harmonics: 0.3, timbre: 0.3, morph: 0.55, decay: 0.85, colour: 0.6, gain: 1.05 },
  // Two operator FM set low and soft. The steadiest tone of the set (centroid within 5 Hz over
  // 3 s on A3), so the timbre knob takes it from a near sine to a reedy tone.
  // See lessons/page-code.md#code-36
  { name: 'Soft FM', engine: 2, harmonics: 0.25, timbre: 0.4, morph: 0.3, decay: 0.85, colour: 0.5, gain: 0.75 },
  { name: 'Vowel choir', engine: 3, harmonics: 0.4, timbre: 0.45, morph: 0.5, decay: 0.85, colour: 0.5, gain: 1 },
  // The waveshaper as a low growling drone: a triangle folded by timbre,
  // asymmetry from morph. The one rough, buzzing voice of the set.
  { name: 'Growl drone', engine: 1, harmonics: 0.3, timbre: 0.6, morph: 0.35, decay: 0.85, colour: 0.5, gain: 0.8 },
  { name: 'Sung vowels', engine: 7, harmonics: 0.25, timbre: 0.5, morph: 0.35, decay: 0.85, colour: 0.5, gain: 2.2 },
  { name: 'Long string', engine: 11, harmonics: 0.2, timbre: 0.45, morph: 0.92, decay: 0.9, colour: 0.5, gain: 3.5 },
  { name: 'Wind', engine: 9, harmonics: 0.35, timbre: 0.55, morph: 0.4, decay: 0.9, colour: 0.6, gain: 1 },
];

// The panel /code/plaits/ and /connect/ both show; the reasons are beside /code/plaits/.
// See lessons/page-code.md#code-37
/** The models in a knob cell's six letters, MODELS' order. */
export const MODEL_SHORT = ['analog', 'shaper', 'FM', 'formant', 'additive', 'table', 'chord', 'speech',
  'swarm', 'noise', 'dust', 'string', 'modal', 'kick', 'snare', 'hat'];
/**
 * Every parameter /muta/ exposes, as one row of knobs in its order. `param` is the key in P it
 * sets (rounded when `round`), or 'transpose' for pitch, which offsets the keys rather than
 * reaching Plaits. `id` is a knob node's name.
 * See lessons/page-code.md#code-38
 */
export const KNOBS = [
  { name: 'model', min: 0, max: 15, step: 1, value: PATCHES[0].engine, param: 'engine', round: true,
    format: (v) => MODEL_SHORT[Math.round(v)] ?? '' },
  { name: 'pitch', min: -24, max: 24, step: 1, value: 0, param: 'transpose',
    format: (v) => `${v > 0 ? '+' : ''}${Math.round(v)}` },
  { name: 'harmonics', short: 'harm', value: PATCHES[0].harmonics, param: 'harmonics' },
  { name: 'timbre', value: PATCHES[0].timbre, param: 'timbre' },
  { name: 'morph', value: PATCHES[0].morph, param: 'morph' },
  { name: 'timbre CV', short: 'T CV', id: 'timbre-cv', min: -1, max: 1, value: 0, param: 'timbreModAmount' },
  { name: 'FM CV', id: 'fm-cv', min: -1, max: 1, value: 0, param: 'fmAmount' },
  { name: 'morph CV', short: 'M CV', id: 'morph-cv', min: -1, max: 1, value: 0, param: 'morphModAmount' },
  { name: 'decay', value: PATCHES[0].decay, param: 'decay' },
  { name: 'colour', value: PATCHES[0].colour, param: 'lpgColour' },
].map((k) => ({ min: 0, max: 1, id: k.name, ...k }));

/** The names a `value-in` event may carry (`{ of: 'param', name, v }`), in KNOBS' order. */
export const PARAM_NAMES = KNOBS.map((k) => k.name);

/** How a patch sets the knobs, as /connect/'s picker does: knob name to value. */
export const patchKnobs = (p) => ({ model: p.engine, harmonics: p.harmonics, timbre: p.timbre, morph: p.morph,
  decay: p.decay, colour: p.colour });
