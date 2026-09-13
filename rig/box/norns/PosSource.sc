// PosSource — the material, as one description rendered at both ends.
//
// 🔴 WHY THIS EXISTS. `grains` draws two granulators side by side — one in a
// browser, one on this board — and they sound nothing alike. The biggest reason
// by a distance is that they are not chewing the same thing: the page
// granulates a table of sine partials and the board granulates whatever
// instrument happens to be running (plan-twins.md §1). A page that puts two
// panes side by side is claiming they are comparable, and until the material is
// the same that claim is false.
//
// ── A TABLE OF SINES, WHICH IS NOT THE ARBITRARY CHOICE IT LOOKS LIKE ───────
//
// ⚠️ plan-twins §4a argued the additive constraint away, on the grounds that
// once scsynth runs in the TAB `Saw.ar` is `Saw.ar` on both machines and is
// identical by construction. Every word of that is true and it is true of a
// future that has not happened: the tab runs an AudioWorklet today, wasm
// scsynth is explicitly queued behind "re-ask whether it is worth it"
// (plan-twins §4b step 3), and until that is decided THE TWO ENDS ARE DIFFERENT
// ENGINES. While they are, a spec that says `saw` means a 1/n table of sines in
// the browser and `Saw.ar` here — two different sounds wearing one name, which
// is the exact confound the whole document exists to remove, now hidden behind
// a word instead of visible in a table.
//
// So: the client sends an AMPLITUDE TABLE, not a waveform name, and this def
// plays a sum of sines at integer multiples of a fundamental.
// `demo/shell/source.mjs` owns the tables (`saw` is 1/n, `square` is 1/n over
// the odds) and owns the normalisation; both ends call its `partialsOf`, and
// neither invents a number.
//
// 🔴 THE TABLE IS A WAVETABLE, AND THAT IS A MEASUREMENT RATHER THAN A STYLE.
//
// Writing a spec's partials out as one `SinOsc` each is the obvious rendering
// and it is the wrong one. Measured on the board, six voices of twenty-four
// partials with a per-partial Nyquist gate:
//
//     DEF bytes=46815 ugens=1151
//     exception in GraphDef_Load: exceeded number of interconnect buffers.
//     *** ERROR: SynthDef posSource not found
//
// 1,151 UGens is most of Pappus's whole TINY graph (1,467) for a drone, 46,815
// bytes is two thirds of the `/d_recv` ceiling, and scsynth refused to load it
// at `numWireBufs` 64 AND at 128 — the pool the norns README already names as
// the constraint Pappus sits close to. `Mix.fill` holds every partial live at
// once, so the wire count scales with the table.
//
// A WAVETABLE costs ONE `Osc.ar` per voice whatever the table holds: the same
// sound out of about ninety UGens instead of 1,151. `/b_gen sine1` fills it
// with exactly the amplitudes the client sent — ⚠️ `normalize: false`, because
// that argument DEFAULTS TO TRUE and would quietly throw the spec's level away
// while everything still made a sound.
//
// ⚠️ TWO TABLES AND A CROSSFADE, because swapping a buffer under a running
// `Osc.ar` is a step in the waveform. A click on a GRANULATOR'S INPUT is worse
// than a click anywhere else: it is written into the ring buffer, and every
// grain that later reads that spot fires it again. The two oscillators share one
// frequency input from the first block, so they are phase-locked and the fade is
// between spectra rather than between two drifting phases.
//
// There is no `shape` control, and that is the same measurement in a smaller
// costume: the first version carried `Select.ar` over sine / saw / pulse / table
// on the theory that three extra oscillators cost nothing, and `Select.ar`
// evaluates every branch. An oscillator shape comes back as one line the day it
// can be compared against anything.
//
// ── how it is wired ─────────────────────────────────────────────────────────
//
// Pappus reads its input from a BUS — `context.in_b[0].index` (an array; note
// `context.out_b.index` is a single bus, which is the asymmetry that has to be
// read out of Engine_Pappus.sc rather than guessed). So this writes to that bus
// and the granulator picks it up with NO JACK RE-PATCH of SuperCollider itself.
//
//   Synth(\posSource, [\out, ctx.in_b[0].index], ctx.xg, \addToHead);
//
// ⚠️ `addToHead`, AND IT IS LOAD-BEARING. Engine_Pappus adds its synth
// `addToTail` (Engine_Pappus.sc:2077). `Out.ar` SUMS into a bus and scsynth
// runs nodes in order, so a source added at the tail would write the bus AFTER
// the granulator had already read it — silence, one block late, for ever.
//
// ⚠️ AND `Out.ar` SUMMING IS ALSO WHY THE INSTRUMENT HAS TO GO. scsynth's input
// busses are filled from JACK at the top of every block, so whatever is patched
// to `SuperCollider:in_1` is ALREADY in this bus before this synth adds to it.
// Two materials in one buffer is not "the same input at both ends", it is a
// third thing neither end can describe. `sourceFeed()` in jacksynth.mjs
// disconnects the instrument for exactly this reason — and it cannot simply be
// stopped, because the instrument's chain is what carries the capture that
// streams the result back.
//
// ── the traps, each already paid for in this repo ───────────────────────────
//
// ⚠️ NOTHING ABOVE NYQUIST, AND A WAVETABLE CANNOT GATE IT PER PARTIAL. A
// partial past half the sample rate does not fold over politely — it aliases
// down to a frequency that is in neither end's table, and an input check would
// then be comparing two different mistakes rather than two renderings of one
// spec. One table serves every voice, so the check has to be made by the CLIENT
// before it is sent: `sourceArgs()` in `pappus.mjs` refuses a spec whose
// partials `partialsOf` had to drop, with the count in words. ⚠️ That guard is
// now the only one there is — the per-partial gate that used to sit in this def
// went with the explicit oscillators.
//
// ⚠️ THE AMPLITUDES ARRIVE FINISHED. `partialsOf` normalises the table so that
// every partial in phase sums to exactly `level` across the WHOLE chord, which
// is the quantity a granulator's input gain cares about. So one voice's table
// sums to a sixth of it and the six voices add back up — and there is no
// further scaling in this def, because doing that arithmetic twice is two
// authorities on one number, which is the mistake plan-twins is about one level
// up.
//
// ⚠️ A NODE ID IS NOT EVIDENCE THAT A SYNTH EXISTS. `Synth.new` allocates an id
// on the CLIENT and returns before the server has read the message, so it
// answers 1002 just as cheerfully for a def that failed to load. That is what
// the run above did: the box reported `node 1002, engineOn true` about a synth
// that had never been built. `/pos/confirm` in `run-pappus.scd` asks the SERVER
// for a control value instead, which only answers if the node is really there.

PosSource {
	// Voices are structural: an array size is fixed when the def is built, so
	// the MAXIMUM chord is a def-time choice. Six covers what `grains` holds
	// today (C3 G3 C4 E4 G4 C5); `nvoices` silences the rest.
	classvar <maxVoices = 6;
	// The table's length. 24 partials of a 130 Hz fundamental on the top voice
	// of that chord reaches 12.6 kHz, inside Nyquist by a wide margin.
	classvar <maxPartials = 24;
	// The wavetable, in samples as `Buffer.alloc` counts them — `/b_gen` in
	// wavetable format uses two entries per point, so this is a 2,048-point
	// table. ⚠️ A POWER OF TWO, which `Osc` requires; and far more points than
	// 24 partials need, because a longer table costs memory while a short one
	// costs interpolation noise in the material every measurement downstream is
	// taken through.
	classvar <tableSize = 4096;

	*add { |name = \posSource|
		SynthDef(name, { |out = 0, gate = 1,
			hz = 130.81,
			nvoices = 6,
			// the chord, in semitones above `hz`
			semis = #[0, 7, 12, 16, 19, 24],
			// The two wavetables and the crossfade between them. `xf` is 0 for
			// `b0` and 1 for `b1`; `run-pappus.scd` fills the one that is NOT
			// playing and then moves this, so a new spectrum arrives as a fade
			// rather than as a step.
			b0 = 0, b1 = 1, xf = 0,
			// cents, GRADED up the chord — uniform is a tuning error, not width
			spread = 0,
			lagTime = 0.05,
			// ⚠️ LONGER THAN `lagTime`, AND ON PURPOSE. A frequency glide can be
			// short because the ear follows it; a spectrum crossfade is between
			// two different sounds, and 50 ms of that is a lurch.
			fadeTime = 0.25|

			var voices, sig, env, den, pan;

			// ⚠️ SMOOTHED. These arrive from a page over a relay, one message per
			// change, and a step in a frequency is a click — which on a
			// granulator's INPUT becomes a click in every grain that later reads
			// that part of the buffer.
			hz = Lag.kr(hz, lagTime);
			spread = Lag.kr(spread, lagTime);
			// LinXFade2 pans -1..+1 and `xf` is 0..1, because a client should not
			// have to know which UGen is behind a control. LINEAR rather than
			// equal-power: the two tables are the same waveform at two spectra
			// and are strongly correlated, so an equal-power law would bulge in
			// the middle instead of holding level.
			pan = (Lag.kr(xf.clip(0, 1), fadeTime) * 2) - 1;

			// ⚠️ `nvoices - 1`, NOT `maxVoices - 1`, AND THE DIFFERENCE IS
			// AUDIBLE. `partialsOf` grades the detune over the chord it was
			// given; grading over the def's maximum instead would put the top
			// voice of a four-note chord at three fifths of the cents the page
			// put it at, so the two ends would be a few cents apart for a reason
			// no measurement could name. `max(1)` because a one-voice chord has
			// no width to grade and would divide by zero.
			den = (nvoices - 1).max(1);

			voices = maxVoices.collect { |v|
				var f, cents, on;

				// 1 while this voice is in the chord, 0 above it. Lagged, or
				// shortening the chord clicks.
				on = Lag.kr((nvoices > v).asInteger, lagTime);

				cents = spread * (v / den);
				f = hz * (2 ** (semis[v] / 12)) * (2 ** (cents / 1200));

				LinXFade2.ar(Osc.ar(b0, f), Osc.ar(b1, f), pan) * on;
			};

			// ⚠️ MONO IS THE DECISION (plan-twins §4), declared here rather than
			// inferred downstream: the board sends one channel, and a source that
			// quietly produced two would be a channel count nobody announced.
			sig = Mix(voices);

			// A gate, so the source can be released rather than freed under a
			// granulator that is mid-grain.
			env = EnvGen.kr(Env.asr(0.02, 1, 0.08), gate, doneAction: Done.freeSelf);

			Out.ar(out, sig * env);
		}).add;
	}
}
