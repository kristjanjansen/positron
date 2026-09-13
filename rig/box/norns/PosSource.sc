// PosSource — the material, as one SynthDef run in two places.
//
// 🔴 WHY THIS IS A SYNTHDEF AND NOT TWO GENERATORS. `grains` draws two
// granulators side by side and they sound nothing alike, and the biggest reason
// by a distance is that they are not chewing the same thing (plan-twins.md).
// The first attempt at a fix built the source twice — once in WebAudio, once
// here — and specified it additively, as a table of sine partials, because "a
// sawtooth" is a DIFFERENT sawtooth in every engine: WebAudio's wavetable is
// unspecified, `Saw.ar` is band-limited another way, Csound's `vco2` a third.
//
// That reasoning was correct and it solved a problem we are deciding not to
// have. scsynth runs on the board and `PAPPUS_TINY` is proven to load in a
// browser, so once the tab runs scsynth there is ONE engine on two machines:
// `Saw.ar` is `Saw.ar`, identical by construction, and restricting the source
// to sines would forbid a real sawtooth, noise, a sample and every richer
// material later for no remaining reason.
//
// So: a shape here is whatever the engine can make. A sine is where it starts
// and is not the ceiling.
//
// ── how it is wired ─────────────────────────────────────────────────────────
//
// Pappus reads its input from a BUS — `context.in_b[0].index` (an array; note
// `context.out_b.index` is a single bus, which is the asymmetry that has to be
// read out of Engine_Pappus.sc rather than guessed). So this writes to that bus
// and the granulator picks it up with NO JACK RE-PATCH. That matters: a
// re-patch is what made `fx.pappus` answer `ok` seven seconds before anything
// could be heard, because the JACK port existed long before the engine did.
//
//   Synth(\posSource, [\out, ~pappusInBus, \shape, 1, \hz, 130.81]);
//
// ── the traps, each already paid for in this repo ───────────────────────────
//
// ⚠️ `shape` IS ZERO-BASED AND CLIPPED. Engine_Pappus does `Select.ar(mscanmode
// - 1, ...)` on a ONE-based control, and a value outside the range does not
// error — it is silence, or it is mode 0 of something that has no mode 0.
// LESSONS #62: `msrc 0` is not a source at all, and every probe taken with it
// measured an empty buffer while looking like a sweep. So: 0-based, clipped at
// both ends, and the client sends a name it looked up rather than a number it
// counted.
//
// ⚠️ `Select.ar` EVALUATES EVERY BRANCH. All four oscillators run whichever one
// you are listening to. That is the price of switching without a click and it
// is paid on purpose; it is also why this def stays small.
//
// ⚠️ NOTHING ABOVE NYQUIST. An additive partial past half the sample rate does
// not fold over politely — it aliases down to a frequency that is in neither
// end's table, and an input check would then be comparing two different
// mistakes rather than two renderings of one spec. Gated per partial.
//
// ⚠️ `level` IS NORMALISED BY THE CLIENT, not here. `demo/shell/source.mjs`'s
// `partialsOf` already computes the sum of the amplitude table, both ends call
// it, and the result arrives as `norm`. Computing it twice — once in JavaScript
// and once in sclang — is two implementations of one number, which is the same
// mistake as two sawtooths one level down.

PosSource {
	// Voices are structural: an array size is fixed when the def is built, so a
	// chord is a DEF-TIME choice and not a control. Six covers what `grains`
	// holds today (C3 G3 C4 E4 G4 C5).
	classvar <maxVoices = 6;
	// The additive shape's ceiling. 24 partials of a 130 Hz fundamental reaches
	// 3.1 kHz, which is inside Nyquist by a wide margin at any sane fundamental
	// — the per-partial gate below is for the case somebody sets `hz` high.
	classvar <maxPartials = 24;

	*add { |name = \posSource|
		SynthDef(name, { |out = 0, gate = 1,
			shape = 0,          // 0 sine · 1 saw · 2 pulse · 3 additive
			hz = 130.81,
			level = 0.16,       // the peak the client asked for
			norm = 1.0,         // the client's own sum of the amplitude table
			spread = 0,         // cents, GRADED up the chord — uniform is a tuning error
			count = 12,         // additive partial count
			width = 0.5,        // pulse width
			lagTime = 0.05|

			var chord, voices, sig, env, sr;

			sr = SampleRate.ir;

			// ⚠️ SMOOTHED, EVERY ONE. These arrive from a page over a relay, one
			// message per change, and a step in a frequency or a gain is a click
			// — which on a granulator's INPUT becomes a click in every grain
			// that later reads that part of the buffer.
			hz = Lag.kr(hz, lagTime);
			level = Lag.kr(level, lagTime);
			spread = Lag.kr(spread, lagTime);
			count = Lag.kr(count, lagTime);
			width = Lag.kr(width, lagTime);

			chord = #[0, 7, 12, 16, 19, 24];

			voices = chord.collect { |semi, v|
				var f, cents, sine, saw, pulse, additive;

				// the detune widens UP the chord, so the top voice is the
				// detuned one — every voice shifted by the same amount is
				// mistuning, not width
				cents = spread * (v / (maxVoices - 1));
				f = hz * (2 ** (semi / 12)) * (2 ** (cents / 1200));

				sine  = SinOsc.ar(f);
				saw   = Saw.ar(f);
				pulse = Pulse.ar(f, width);

				// The additive table, and the ONLY reason it is still here: its
				// spectrum is known in closed form, so it is what the input
				// check measures against. It is a fixture, not the design.
				additive = Mix.fill(maxPartials, { |i|
					var n = i + 1;
					// `n <= count` is a comparison against a control, so it is a
					// k-rate 0/1 — lagged, or turning the count up clicks.
					var live = Lag.kr((n <= count).asInteger, lagTime);
					// and nothing at or above Nyquist, ever
					var safe = (f * n) < (sr * 0.45);
					SinOsc.ar(f * n) * (1 / n) * live * safe;
				});

				Select.ar(shape.clip(0, 3), [sine, saw, pulse, additive]);
			};

			// One mono sum. ⚠️ MONO IS THE DECISION (plan-twins §4), and it is
			// declared here rather than inferred downstream: the board sends one
			// channel and a source that quietly produced two would be a channel
			// count nobody announced, which is the failure CLAUDE.md has a rule
			// about.
			sig = Mix(voices) / maxVoices;
			sig = sig * (level / max(norm, 1e-9));

			// A gate, so the source can be released rather than freed under a
			// granulator that is mid-grain.
			env = EnvGen.kr(Env.asr(0.02, 1, 0.08), gate, doneAction: Done.freeSelf);

			Out.ar(out, sig * env);
		}).add;
	}

	// The names, in the order `shape` selects them. The client looks a name up
	// here rather than counting — see the zero-based trap above.
	*shapes { ^[\sine, \saw, \pulse, \additive] }
}
