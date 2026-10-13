// demo/granulator/grain-ring.mjs: the grain ring's program, and the
// patches that are sets of its control values. /granulator/granulator/ shows
// the text in its code box, compiles it with `/shell/sclang-lite.mjs` in the
// tab, and runs it on the tab's scsynth. Kept apart from the page so
// `sclang-lite-test.mjs` can compile the same text with no browser.
//
// THE PROGRAM. What comes in is written round an eight second mono buffer by
// BufWr; GrainBuf reads grains out of it; SendReply tells the page about every
// grain: where it read, how long it is, where the write head was, and its
// playback rate (negative when it plays backwards). `\mix` blends the input against the grains on the last line,
// with equal power so the middle does not dip; it is the page's wet/dry knob
// and no patch sets it. Every number a patch moves is a named control, so a patch is
// a set of `/n_set` values and never a different graph. An edit to the text is
// a different graph, and the page starts it in place of the old one with the
// same values, on the same buffer.
//
// SINCE 2026-10-13 IT HAS AN ECHO, A TONE, A TAPE THAT SLOWS AND A WAY BACKWARDS,
// for the Dub patch and the ones after it. `\tone` is a low pass on the
// grains. `\echo`, `\time` and `\dark` are a delay whose output comes back
// into its own input (LocalIn, DelayC, LocalOut), through a low pass at `dark`
// each time round, which is what makes a dub echo darker on every repeat.
// `\drop` and `\ramp` slow both heads by up to `drop` over every `1 / ramp`
// seconds, then spring back: a tape stop on a loop. `\dir` -1 plays every grain
// backwards (GrainBuf takes a negative rate and wraps the ring both ways).
// Every one of them is neutral at its default (DEFAULTS), so a patch that does
// not name them sounds as before.
//
// AND SINCE 2026-10-13 A BEAT GRID, for /granulator/beat-granulator/ (*"make followup
// demo with ida, dub and add tempo detection and feed it into granulator"*).
// `\lock` 1 takes the even grains off `Impulse` and onto a Phasor that goes
// round `density` times a second (`secs / frames` is one over the sample
// rate, as the buffer was allocated) and that `\beat` sets back to 0 when the
// page raises it on a beat. GrainBuf, TRand and SendReply all fire when their
// trigger goes from 0 or below to above 0, so the ramp shifted down by half
// fires once a turn, at the top. With `density` a whole number of grains a
// beat the grains land on the beat. Scattered grains (Dust) still come at
// random and count only on the low half of a turn. `\lock` 0 is the old
// graph's sound exactly: the Impulse at its old rate and the ramp times 0.
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
  // a tape slowing down: over every 1 / ramp seconds both heads fall by drop, then spring back
  var slow = 1 - (\\drop.kr(0) * ((LFSaw.kr(\\ramp.kr(0.5)) + 1) * 0.5));
  // the read head: speed 1 follows the input, below 1 stretches it
  var read = Phasor.ar(\\sync.kr(0), \\speed.kr(1) * slow, 0, frames, write);
  // grains a second, evenly or at random
  var density = \\density.kr(20, spec: [0.5, 64, \\exp]);
  var scatter = \\scatter.kr(0);
  // lock 1 puts the even grains on the beat: a ramp round density times a
  // second, set back to its start on every beat (beat 0 to 1)
  var lock = \\lock.kr(0);
  var grid = Phasor.ar(\\beat.kr(0), density * secs / frames, 0, 1);
  var trig = Impulse.ar(density * (1 - scatter) * (1 - lock)) + Dust.ar(density * scatter) + ((((grid + 0.5) % 1) - 0.5) * lock * (1 - scatter));
  // each grain's length, place, pitch and side; dir -1 plays every grain backwards
  var size = \\size.kr(0.1, spec: [0.02, 4, \\exp]);
  var jitter = \\jitter.kr(0);
  var pos = read / frames - (\\back.kr(0.5) / secs) + (TRand.ar(jitter.neg, jitter, trig) / secs) % 1;
  var pitch = \\pitch.kr(1) * slow;
  var detune = \\detune.kr(0);
  var rate = TRand.ar(pitch * (1 - detune), pitch * (1 + detune), trig) * \\dir.kr(1);
  var pan = \\pan.kr(0.5);
  // tone is a low pass on the grains, open at 20 kHz
  var grains = LPF.ar(GrainBuf.ar(2, trig, size, buf, rate, pos, 2, TRand.ar(pan.neg, pan, trig)), \\tone.kr(20000));
  // the echo: what went in comes back after time seconds, echo as loud each
  // time round, and darker each time through a low pass at dark
  var echo = \\echo.kr(0);
  var tail = DelayC.ar((grains + LocalIn.ar(2)) * echo, 1.5, \\time.kr(0.375, 0.3));
  var mix = \\mix.kr(1);
  LocalOut.ar(HPF.ar(LPF.ar(tail, \\dark.kr(20000)), 60));
  BufWr.ar(input * (1 - freeze), buf, write);
  // tell the page about every grain
  SendReply.ar(trig, '/grain', [pos, size, write / frames, rate]);
  // quieter as more grains overlap, then mix: 0 is only the input, 1 only grains and their echo
  ((grains + tail) * \\amp.kr(1.5) / (density * size + 1).sqrt * (mix * 0.5pi).sin) + (input * (mix * 0.5pi).cos)
}`;

/** The ring's length, which the page allocates and the program reads back with BufDur. */
export const RING_SECONDS = 8;

/**
 * What a control sits at when a patch does not name it. Every control added
 * after the first five patches is NEUTRAL here, so a patch that names none of
 * them sounds as it did: `tone` 20 kHz is the low pass open, `echo` 0 sends
 * nothing round the echo, `drop` 0 never slows the tape, `dir` 1 plays forwards.
 */
export const DEFAULTS = { freeze: 0, speed: 1, back: 0.5, density: 20, scatter: 0, size: 0.1, jitter: 0,
  pitch: 1, detune: 0, pan: 0.5, amp: 1.5, tone: 20000, echo: 0, time: 0.375, dark: 20000, drop: 0, ramp: 0.5, dir: 1, lock: 0 };

/**
 * Ten sounds, each a set of control values on the one program, each one
 * musical idea. `size` and `density` are the two knobs every check leans on,
 * so every patch names both. The first is the one the page opens on.
 *
 * Asked 2026-10-13 (BACKLOG): *"make more interstin ganulator parches. do dub,
 * put ida rec default and dub degault"*. Cloud and Shimmer are the old ones
 * with an echo; Freeze, Stutter and Stretch became Frozen choir, Gate and Slow
 * motion. `amp` levels them against each other, measured on the Ida recording.
 */
export const PATCHES = [
  // Tape stop first, the default (asked 2026-10-13, *"raadio 2 and tape stop default"*).
  { name: 'Tape stop', says: 'the tape winds down to a stop every two and a half seconds and springs back',
    set: { size: 0.15, density: 30, pitch: 1, back: 0.1, speed: 1, scatter: 0, freeze: 0,
      jitter: 0, detune: 0, pan: 0.2, drop: 0.9, ramp: 0.4, tone: 10000, amp: 0.95 } },
  // A moment half a second back, repeating every 0.43 s and darker each time
  // round, the tape sagging a little over ten seconds.
  { name: 'Dub', says: 'half a second back, low and dark, echoing a long tail',
    set: { size: 0.35, density: 10, pitch: 1, back: 0.5, speed: 1, scatter: 0.15, freeze: 0,
      jitter: 0.03, detune: 0.004, pan: 0.9, tone: 2200, echo: 0.72, time: 0.43, dark: 1400, drop: 0.06, ramp: 0.1, amp: 1.35 } },
  { name: 'Cloud', says: 'grains at random from the last two seconds, spread wide in a short room',
    set: { size: 0.25, density: 40, pitch: 1, back: 2, speed: 1, scatter: 1, freeze: 0,
      jitter: 1.5, detune: 0.02, pan: 0.9, tone: 9000, echo: 0.3, time: 0.19, dark: 5000, amp: 1.5 } },
  { name: 'Frozen choir', says: 'one held moment, long grains pulled apart in pitch like a chord',
    set: { size: 1.2, density: 20, pitch: 1, back: 1, speed: 0, scatter: 0.5, freeze: 1,
      jitter: 0.06, detune: 0.03, pan: 1, tone: 6000, echo: 0.4, time: 0.61, dark: 3000, amp: 1.4 } },
  { name: 'Gate', says: 'short chops of the live sound eight times a second, the echo on the off beat',
    set: { size: 0.06, density: 8, pitch: 1, back: 0.03, speed: 1, scatter: 0, freeze: 0,
      jitter: 0, detune: 0, pan: 0, echo: 0.45, time: 0.1875, dark: 7000, amp: 2.0 } },
  { name: 'Slow motion', says: 'the read head at an eighth of the speed, so the sound crawls and keeps its pitch',
    set: { size: 0.5, density: 16, pitch: 1, back: 0.2, speed: 0.125, scatter: 0.3, freeze: 0,
      jitter: 0.02, detune: 0.004, pan: 0.6, tone: 12000, echo: 0.25, time: 0.7, dark: 4000, amp: 1.6 } },
  { name: 'Shimmer', says: 'every grain an octave up, scattered wide, with a bright echo',
    set: { size: 0.35, density: 24, pitch: 2, back: 1.5, speed: 1, scatter: 0.6, freeze: 0,
      jitter: 0.5, detune: 0.01, pan: 0.8, echo: 0.55, time: 0.5, dark: 9000, amp: 1.35 } },
  { name: 'Backwards', says: 'long grains played in reverse, so every sound swells in and stops',
    set: { size: 0.6, density: 6, pitch: 1, back: 1.2, speed: 1, scatter: 0.4, freeze: 0,
      jitter: 0.3, detune: 0.003, pan: 0.7, dir: -1, tone: 9000, echo: 0.35, time: 0.5, dark: 4000, amp: 1.4 } },
  { name: 'Undertow', says: 'an octave down, slow and smeared, a dark drone under the sound',
    set: { size: 1.5, density: 10, pitch: 0.5, back: 2, speed: 0.5, scatter: 0.8, freeze: 0,
      jitter: 1, detune: 0.006, pan: 0.8, tone: 1200, echo: 0.5, time: 0.9, dark: 800, amp: 1.4 } },
  { name: 'Sparks', says: 'tiny grains two octaves up, at random from the last three seconds',
    set: { size: 0.025, density: 48, pitch: 4, back: 3, speed: 1, scatter: 1, freeze: 0,
      jitter: 3, detune: 0.06, pan: 1, echo: 0.3, time: 0.21, dark: 12000, amp: 1.8 } },
];

/** Every control value of a patch, defaults filled in. */
export const valuesOf = (p) => ({ ...DEFAULTS, ...p.set });
