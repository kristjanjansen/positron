// demo/shell/circuit-cc.mjs — every synth parameter a Novation Circuit will
// take over an ordinary control change, and which channel it listens on.
//
// 🔴 GENERATED FROM NOVATION'S CIRCUIT PROGRAMMER'S REFERENCE GUIDE v1.1, by
// parsing the document rather than by reading its tables by eye. **98 control
// change parameters**: 52 for the synths, 28 for the drums, 18 for the session.
// The document also carries 276 NRPN parameters, which are four messages each
// and are not here yet.
//
// 🔴 WHY THIS MATTERS MORE THAN IT LOOKS: an editor built on this needs NO
// SysEx at all, and therefore **cannot touch flash**. `plans/plan-circuit-editor.md`
// §1: `Replace Current Patch` and `Replace Patch` differ by one byte at offset
// 6, and the second one overwrites a patch permanently on a device with no
// factory reset. Nothing reachable through this table can do that.
//
// 🔴 THE CHANNEL IS PART OF THE ADDRESS AND IS NEVER DROPPED. `ch: '1/2'` means
// Synth 1 on channel 1 and Synth 2 on channel 2; `'10'` is the drums; `'16'` is
// the session, which is where the master filter lives. **CC 74 is the synth
// filter on 1 and 2 AND the master filter on 16, and CC 80 is macro knob 1 on
// channel 1 and drum 4 pan on channel 10.** A table keyed by controller number
// alone would merge them, which is `plans/plan-device-layouts.md` §5.3's rule
// with a worked example.
//
// ⚠️ A RANGE HERE IS THE WIRE'S RANGE, NOT THE READING. Several parameters are
// centred: `52 - 76` means -12 to +12 semitones with 64 at the middle. The
// document's own notes carry the mapping; this keeps the numbers a page has to
// send.

/** @type {{ch:string, sec:string, name:string, cc:number, lo:number, hi:number}[]} */
export const CIRCUIT_CC = [
  { ch: '1/2', sec: 'Voice', name: 'Polyphony Mode', cc: 3, lo: 0, hi: 2 },
  { ch: '1/2', sec: 'Voice', name: 'Portamento Rate', cc: 5, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Voice', name: 'Pre-Glide', cc: 9, lo: 52, hi: 76 },
  { ch: '1/2', sec: 'Voice', name: 'Keyboard Octave', cc: 13, lo: 58, hi: 69 },
  { ch: '1/2', sec: 'Oscillator', name: 'osc 1 wave', cc: 19, lo: 0, hi: 29 },
  { ch: '1/2', sec: 'Oscillator', name: 'osc 1 wave interpolate', cc: 20, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Oscillator', name: 'osc 1 pulse width index', cc: 21, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Oscillator', name: 'osc 1 virtual sync depth', cc: 22, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Oscillator', name: 'osc 1 density', cc: 24, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Oscillator', name: 'osc 1 density detune', cc: 25, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Oscillator', name: 'osc 1 semitones', cc: 26, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Oscillator', name: 'osc 1 cents', cc: 27, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Oscillator', name: 'osc 1 pitchbend', cc: 28, lo: 52, hi: 76 },
  { ch: '1/2', sec: 'Oscillator', name: 'osc 2 wave', cc: 29, lo: 0, hi: 29 },
  { ch: '1/2', sec: 'Oscillator', name: 'osc 2 wave interpolate', cc: 30, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Oscillator', name: 'osc 2 pulse width index', cc: 31, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Oscillator', name: 'osc 2 virtual sync depth', cc: 33, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Oscillator', name: 'osc 2 density', cc: 35, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Oscillator', name: 'osc 2 density detune', cc: 36, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Oscillator', name: 'osc 2 semitones', cc: 37, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Oscillator', name: 'osc 2 cents', cc: 39, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Oscillator', name: 'osc 2 pitchbend', cc: 40, lo: 52, hi: 76 },
  { ch: '1/2', sec: 'Mixer', name: 'osc 1 level', cc: 51, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Mixer', name: 'osc 2 level', cc: 52, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Mixer', name: 'ring mod level', cc: 54, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Mixer', name: 'noise level', cc: 56, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Mixer', name: 'pre FX level', cc: 58, lo: 52, hi: 82 },
  { ch: '1/2', sec: 'Mixer', name: 'post FX level', cc: 59, lo: 52, hi: 82 },
  { ch: '1/2', sec: 'Filter', name: 'routing', cc: 60, lo: 0, hi: 2 },
  { ch: '1/2', sec: 'Filter', name: 'drive', cc: 63, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Filter', name: 'drive type', cc: 65, lo: 0, hi: 6 },
  { ch: '1/2', sec: 'Filter', name: 'type', cc: 68, lo: 0, hi: 5 },
  { ch: '1/2', sec: 'Filter', name: 'frequency', cc: 74, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Filter', name: 'tracking', cc: 69, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Filter', name: 'resonance', cc: 71, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Filter', name: 'Q normalize', cc: 78, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Filter', name: 'env 2 to frequency', cc: 79, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Envelope', name: 'env 1 velocity', cc: 108, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Envelope', name: 'env 1 attack', cc: 73, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Envelope', name: 'env 1 decay', cc: 75, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Envelope', name: 'env 1 sustain', cc: 70, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Envelope', name: 'env 1 release', cc: 72, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Effects and EQ', name: 'distortion level', cc: 91, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Effects and EQ', name: 'chorus level', cc: 93, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Macro Knob', name: 'macro knob 1 position', cc: 80, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Macro Knob', name: 'macro knob 2 position', cc: 81, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Macro Knob', name: 'macro knob 3 position', cc: 82, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Macro Knob', name: 'macro knob 4 position', cc: 83, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Macro Knob', name: 'macro knob 5 position', cc: 84, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Macro Knob', name: 'macro knob 6 position', cc: 85, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Macro Knob', name: 'macro knob 7 position', cc: 86, lo: 0, hi: 127 },
  { ch: '1/2', sec: 'Macro Knob', name: 'macro knob 8 position', cc: 87, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 1 patch select', cc: 8, lo: 0, hi: 63 },
  { ch: '10', sec: 'song select', name: 'drum 1 level', cc: 12, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 1 pitch', cc: 14, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 1 decay', cc: 15, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 1 distortion', cc: 16, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 1 EQ', cc: 17, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 1 pan', cc: 77, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 2 patch select', cc: 18, lo: 0, hi: 63 },
  { ch: '10', sec: 'song select', name: 'drum 2 level', cc: 23, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 2 pitch', cc: 34, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 2 decay', cc: 40, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 2 distortion', cc: 42, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 2 EQ', cc: 43, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 2 pan', cc: 78, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 3 patch select', cc: 44, lo: 0, hi: 63 },
  { ch: '10', sec: 'song select', name: 'drum 3 level', cc: 45, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 3 pitch', cc: 46, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 3 decay', cc: 47, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 3 distortion', cc: 48, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 3 EQ', cc: 49, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 3 pan', cc: 79, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 4 patch select', cc: 50, lo: 0, hi: 63 },
  { ch: '10', sec: 'song select', name: 'drum 4 level', cc: 53, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 4 pitch', cc: 55, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 4 decay', cc: 57, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 4 distortion', cc: 61, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 4 EQ', cc: 76, lo: 0, hi: 127 },
  { ch: '10', sec: 'song select', name: 'drum 4 pan', cc: 80, lo: 0, hi: 127 },
  { ch: '16', sec: 'Reverb', name: 'synth 1 send level', cc: 88, lo: 0, hi: 127 },
  { ch: '16', sec: 'Reverb', name: 'synth 2 send level', cc: 89, lo: 0, hi: 127 },
  { ch: '16', sec: 'Reverb', name: 'drum 1 send level', cc: 90, lo: 0, hi: 127 },
  { ch: '16', sec: 'Reverb', name: 'drum 2 send level', cc: 106, lo: 0, hi: 127 },
  { ch: '16', sec: 'Reverb', name: 'drum 3 send level', cc: 109, lo: 0, hi: 127 },
  { ch: '16', sec: 'Reverb', name: 'drum 4 send level', cc: 110, lo: 0, hi: 127 },
  { ch: '16', sec: 'Delay', name: 'synth 1 send level', cc: 111, lo: 0, hi: 127 },
  { ch: '16', sec: 'Delay', name: 'synth 2 send level', cc: 112, lo: 0, hi: 127 },
  { ch: '16', sec: 'Delay', name: 'drum 1 send level', cc: 113, lo: 0, hi: 127 },
  { ch: '16', sec: 'Delay', name: 'drum 2 send level', cc: 114, lo: 0, hi: 127 },
  { ch: '16', sec: 'Delay', name: 'drum 3 send level', cc: 115, lo: 0, hi: 127 },
  { ch: '16', sec: 'Delay', name: 'drum 4 send level', cc: 116, lo: 0, hi: 127 },
  { ch: '16', sec: 'Master Filter', name: 'frequency', cc: 74, lo: 0, hi: 127 },
  { ch: '16', sec: 'Master Filter', name: 'resonance', cc: 71, lo: 0, hi: 127 },
  { ch: '16', sec: 'Mixer', name: 'synth 1 level', cc: 12, lo: 0, hi: 127 },
  { ch: '16', sec: 'Mixer', name: 'synth 2 level', cc: 14, lo: 0, hi: 127 },
  { ch: '16', sec: 'Mixer', name: 'synth 1 pan', cc: 117, lo: 0, hi: 127 },
  { ch: '16', sec: 'Mixer', name: 'synth 2 pan', cc: 118, lo: 0, hi: 127 },
];

/** Everything on one channel group: '1/2', '10' or '16'. */
export function onChannel(ch) {
  return CIRCUIT_CC.filter((p) => p.ch === ch);
}

/** The sections, in the order the reference prints them. */
export function sections(ch) {
  const out = [];
  for (const p of onChannel(ch)) if (p.sec && !out.includes(p.sec)) out.push(p.sec);
  return out;
}

/**
 * One parameter, by channel group and controller number.
 * ⚠️ BOTH ARGUMENTS, ALWAYS. Asking for CC 74 without a channel is asking a
 * question with two right answers.
 */
export function param(ch, cc) {
  return CIRCUIT_CC.find((p) => p.ch === ch && p.cc === cc) || null;
}

/** The three bytes for a parameter and a value, on a given MIDI channel 1-16. */
export function ccBytes(midiCh, cc, value) {
  const c = Math.max(0, Math.min(15, midiCh - 1));
  return [0xb0 | c, cc & 0x7f, Math.max(0, Math.min(127, Math.round(value))) & 0x7f];
}
