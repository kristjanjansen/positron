// demo/fau/presets.mjs: the programs /fau/ opens with. demo/resources/build-faust-aot.mjs compiles
// the Organ from this list, and workers/view/build.mjs refuses an artefact from a different Organ.
// See lessons/page-fau.md#fau-6

/**
 * The presets, each a whole instrument. `freq`, `gain` and `gate` make a DSP one voice of a
 * polyphonic instrument; rename one and the keyboard stops reaching it. In the listings a comment
 * on its own line takes a blank line before its code; a trailing comment takes none.
 * See lessons/page-fau.md#fau-7
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
    /* The instrument of demo/shell/rhodes.mjs in four lines: a tine at a high ratio, a body at 1:1,
       and a carrier both phase-modulate.
       See lessons/page-fau.md#fau-8 */
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
    /* Karplus-Strong: the one preset with `~`, a delay line feeding itself whose length is the pitch.
       `keep` drops to 0.9 when the gate goes so the key-up is heard. 8.61 kB machine code, 16.47 kB a
       voice, 68 ms cold; the library it uses is already downloaded.
       See lessons/page-fau.md#fau-9 */
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
    /* Subtractive: a sawtooth with a filter driven by its own envelope, then the room on the mix.
       21.29 kB machine code (9.42 kB without the room) and 108 bytes a voice, so the room runs once.
       See lessons/page-fau.md#fau-10 */
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
    /* pm.clarinet_ui_MIDI from physmodels.lib, already in the downloaded library. Compiled polyphonic
       here it takes 273 to 344 ms in the browser, the slowest preset, still far under the STK piano's
       1,690 ms which is refused.
       See lessons/page-fau.md#fau-11 */
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
