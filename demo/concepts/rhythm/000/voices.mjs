// demo/concepts/rhythm/000/voices.mjs: the four drum voices /concepts/rhythm/000/
// plays, each a small program in /collide/'s subset of SuperCollider, compiled
// in this tab and run on scsynth compiled to WebAssembly.
//
// Asked 2026-10-12 (BACKLOG, "A rhythm concept group"): *"make new grpup
// concept rythm. make a 16 x 4 grid pad componetn (global one), 4 sc (or fau?)
// synths for kick snare hho hhc and patchbay. 000"*.
//
// WHY SUPERCOLLIDER AND NOT FAUST. Two reasons, both about machinery that
// already exists. First, `scsynth.mjs` has `sendAt`, an OSC bundle with a
// timetag that SuperSonic maps to the speakers' clock, so a hit can be handed
// over ahead of time and sound at its time: the scheduling half is already
// built. A Faust voice in this kit is one AudioWorkletNode whose parameters
// are set by message, so a gate at an exact future sample would be new code.
// Second, a drum hit is a node that starts, decays and frees itself
// (`doneAction: 2`), which is what scsynth does with no bookkeeping, four
// definitions on one engine, any number of hits overlapping. Faust would need
// a polyphonic wrapper per voice or four always-running worklets.
//
// THE SUBSET HAS NO BPF, NO XLine AND NO Decay, so every sweep is an EnvGen
// scaled and offset, and every band is an HPF. That is enough for an 808-ish
// kit and keeps each program a dozen lines a reader can follow.
//
// 🔴 THE OPERATORS ARE LEFT TO RIGHT, AS IN SuperCollider: `a * b + c * d` is
// `((a * b) + c) * d`. Every last line below is written for that.

/** General MIDI's drum notes, which is what the sequencer sends and what each
 *  wire into a voice lets through. */
export const NOTE = { kick: 36, snare: 38, hhc: 42, hho: 46 };

export const KICK = `// a sine whose pitch falls fast, plus a click at the front
{ |amp = 0.8|

    // the pitch falls from 160 Hz to 50 Hz in the first 60 ms: the thump
    var pitch = EnvGen.kr(Env.perc(0.001, 0.06)) * 110 + 50;

    // the body rings for under half a second, then the node frees itself
    var env = EnvGen.kr(Env.perc(0.002, 0.42), doneAction: 2);

    // four milliseconds of bright noise, the beater hitting the skin
    var click = HPF.ar(WhiteNoise.ar(EnvGen.kr(Env.perc(0.0005, 0.004))), 2000);

    SinOsc.ar(pitch) * env + (click * 0.3) * amp
}`;

export const SNARE = `// a short pitched body under a longer burst of noise
{ |amp = 0.45|

    // the drum head: 240 Hz falling to 180 Hz, gone in a tenth of a second
    var body = SinOsc.ar(EnvGen.kr(Env.perc(0.001, 0.03)) * 60 + 180)
        * EnvGen.kr(Env.perc(0.001, 0.1));

    // the wires under the drum: noise above 1.2 kHz for a fifth of a second
    var wires = HPF.ar(WhiteNoise.ar(1), 1200) * EnvGen.kr(Env.perc(0.001, 0.2), doneAction: 2);

    body * 0.8 + wires * amp
}`;

/** Six square waves at the 808's own cymbal frequencies, mixed and filtered
 *  high, which is what makes a hat sound metallic rather than like noise. */
const METAL = 'Mix(Pulse.ar([205.3, 304.4, 369.6, 522.7, 540, 800], 0.5, 0.4))';

export const HHC = `// six square waves, filtered high, cut off after 60 ms
{ |amp = 1|

    // the 808's six cymbal oscillators, mixed, only their top left in
    var metal = HPF.ar(HPF.ar(${METAL}, 7000), 7000);

    // a little noise for the sizzle
    var air = HPF.ar(WhiteNoise.ar(0.3), 8000);

    // short: the closed hat is a tick
    var env = EnvGen.kr(Env.perc(0.001, 0.06), doneAction: 2);

    metal + air * env * amp
}`;

export const HHO = `// the same metal, left to ring, and cut short by the gate
{ |amp = 1, gate = 1|

    var metal = HPF.ar(HPF.ar(${METAL}, 7000), 7000);
    var air = HPF.ar(WhiteNoise.ar(0.3), 8000);

    // long: the open hat rings for half a second
    var ring = EnvGen.kr(Env.perc(0.002, 0.5), doneAction: 2);

    // the choke: held open while the gate is 1, gone 15 ms after it closes
    var choke = EnvGen.kr(Env.adsr(0.001, 0.01, 1, 0.015), gate, doneAction: 2);

    metal + air * ring * choke * amp
}`;

/** In grid order, top to bottom: what the row is called, the bay node, the
 *  definition's name on the server, its program and its note. */
export const VOICES = [
  { key: 'kick', label: 'kick', name: 'kick', program: KICK, note: NOTE.kick },
  { key: 'snare', label: 'snare', name: 'snare', program: SNARE, note: NOTE.snare },
  { key: 'hho', label: 'open hat', name: 'hho', program: HHO, note: NOTE.hho },
  { key: 'hhc', label: 'closed hat', name: 'hhc', program: HHC, note: NOTE.hhc },
];

/** How long each hit is expected to live, seconds, so a choke is only sent to
 *  an open hat that is still ringing (a `/n_set` to a node that has already
 *  freed itself is a `/fail` from the engine). */
export const LIFE = { kick: 0.42, snare: 0.2, hho: 0.5, hhc: 0.06 };
