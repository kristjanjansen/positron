// demo/concepts/sampler/grain-ring.mjs: the grain ring's program, and the
// patches that are sets of its control values. /archive/grain-ring/ (concepts sampler/060 until it was archived) shows
// the text in its code box, compiles it with `/shell/sclang-lite.mjs` in the
// tab, and runs it on the tab's scsynth. Kept apart from the page so
// `sclang-lite-test.mjs` can compile the same text with no browser.
//
// THE PROGRAM. What comes in is written round an eight second mono buffer by
// BufWr; GrainBuf reads grains out of it; SendReply tells the page about every
// grain: where it read, how long it is, where the write head was, and its
// playback rate. `\mix` blends the input against the grains on the last line,
// with equal power so the middle does not dip; it is the page's wet/dry knob
// and no patch sets it. Every number a patch moves is a named control, so a patch is
// a set of `/n_set` values and never a different graph. An edit to the text is
// a different graph, and the page starts it in place of the old one with the
// same values, on the same buffer.
//
// The comments in it are for a visitor reading the box: short and plain.
export const PROGRAM = `// grains read out of an eight second ring of what comes in
{
  var buf = \\buf.kr(0);
  var frames = BufFrames.kr(buf);
  var secs = BufDur.kr(buf);
  // what comes in, one channel
  var input = Mix(In.ar(\\inbus.kr(2), 2)) * 0.5;
  // write what comes in round the ring, until freeze holds it
  var freeze = \\freeze.kr(0);
  var write = Phasor.ar(0, 1 - freeze, 0, frames);
  // the read head: speed 1 follows the input, below 1 stretches it
  var read = Phasor.ar(\\sync.kr(0), \\speed.kr(1), 0, frames, write);
  // grains a second, evenly or at random
  var density = \\density.kr(20, spec: [0.5, 64, \\exp]);
  var scatter = \\scatter.kr(0);
  var trig = Impulse.ar(density * (1 - scatter)) + Dust.ar(density * scatter);
  // each grain's length, place, pitch and side
  var size = \\size.kr(0.1, spec: [0.02, 4, \\exp]);
  var jitter = \\jitter.kr(0);
  var pos = read / frames - (\\back.kr(0.5) / secs) + (TRand.ar(jitter.neg, jitter, trig) / secs) % 1;
  var pitch = \\pitch.kr(1);
  var detune = \\detune.kr(0);
  var rate = TRand.ar(pitch * (1 - detune), pitch * (1 + detune), trig);
  var pan = \\pan.kr(0.5);
  var grains = GrainBuf.ar(2, trig, size, buf, rate, pos, 2, TRand.ar(pan.neg, pan, trig));
  var mix = \\mix.kr(1);
  BufWr.ar(input * (1 - freeze), buf, write);
  // tell the page about every grain
  SendReply.ar(trig, '/grain', [pos, size, write / frames, rate]);
  // quieter as more grains overlap, then mix: 0 is only the input, 1 only grains
  (grains * \\amp.kr(1.5) / (density * size + 1).sqrt * (mix * 0.5pi).sin) + (input * (mix * 0.5pi).cos)
}`;

/** The ring's length, which the page allocates and the program reads back with BufDur. */
export const RING_SECONDS = 8;

/** What a control sits at when a patch does not name it. */
export const DEFAULTS = { freeze: 0, speed: 1, back: 0.5, density: 20, scatter: 0, size: 0.1, jitter: 0,
  pitch: 1, detune: 0, pan: 0.5, amp: 1.5 };

/**
 * Five sounds, each a set of control values on the one program. `size` and
 * `density` are the two knobs, so every patch names both.
 */
export const PATCHES = [
  { name: 'Cloud', says: 'grains at random from the last two seconds, spread wide',
    set: { density: 40, scatter: 1, size: 0.25, back: 2, jitter: 1.5, detune: 0.02, pan: 0.9 } },
  { name: 'Freeze', says: 'the ring stops recording and one moment is held',
    set: { freeze: 1, speed: 0, back: 1, density: 30, scatter: 0.5, size: 0.4, jitter: 0.08, detune: 0.005, pan: 0.6 } },
  { name: 'Stutter', says: 'one short piece a quarter second back, repeated in time',
    set: { density: 8, scatter: 0, size: 0.12, back: 0.25, jitter: 0, pan: 0 } },
  { name: 'Stretch', says: 'the read head at a quarter speed, so the sound slows and keeps its pitch',
    set: { speed: 0.25, back: 0.2, density: 24, scatter: 0, size: 0.18, jitter: 0.01, pan: 0.3 } },
  { name: 'Shimmer', says: 'every grain an octave up, scattered and wide',
    set: { pitch: 2, detune: 0.01, density: 24, scatter: 0.6, size: 0.35, back: 1.5, jitter: 0.5, pan: 0.8 } },
];

/** Every control value of a patch, defaults filled in. */
export const valuesOf = (p) => ({ ...DEFAULTS, ...p.set });
