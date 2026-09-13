// demo/shell/source-args.mjs — one spec, turned into the numbers `PosSource`
// wants, in ONE place for the two machines that now run that definition.
//
// 🔴 WHY IT MOVED HERE. This was `sourceArgs()` in `rig/box/pappus.mjs`, where
// it was fine while the board was the only end running `PosSource.sc`. It is
// not any more: `/grains/` loads the SAME compiled definition into wasm
// scsynth in the tab, so the browser has to build the same amplitude table,
// the same semitone array and the same three scalars. Reimplementing that in
// the page would be two authorities on one number — which is the mistake
// `plan-twins.md` is about, one level down, and the reason `partialsOf` is
// shared rather than copied.
//
// ⚠️ IT IS THE EXPANSION AND NOTHING ELSE. No engine, no wire, no OSC. The two
// callers differ only in how they deliver it: the box sends `/pos/table` and
// `/pos/set` to sclang, the page sends `/b_gen sine1` and `/n_set` to its own
// scsynth. Both get the numbers from here.
import { partialsOf } from './source.mjs';

/**
 * ⚠️ THE DEF'S ARRAY SIZES, AND THEY ARE STRUCTURAL. A SynthDef's control array
 * is fixed when the def is built (`PosSource.sc`, `maxVoices` / `maxPartials`),
 * so these are not limits chosen here — they are a fact about the compiled
 * graph, mirrored. `setn` past the end of a control array is not an error in
 * scsynth, it writes into whatever control comes next, so a spec that does not
 * fit is REFUSED by name rather than truncated into a different sound.
 */
export const SOURCE_VOICES = 6, SOURCE_PARTIALS = 24;

/** The wavetable's length in buffer entries — `PosSource.sc`'s `tableSize`. */
export const SOURCE_TABLE = 4096;

/**
 * The spec, as the numbers `PosSource` wants.
 *
 * 🔴 ONE SHARED TABLE, AND THE REFUSAL IS THE POINT. `partialsOf` normalises
 * across the partials that SURVIVE Nyquist, so if it drops any, two voices no
 * longer share one amplitude table and a single 24-entry control cannot
 * describe the sound. That is refused here with the count in words, rather than
 * sent anyway — a board rendering a quietly different spectrum from the page is
 * precisely the confound this whole path exists to remove, and it would show up
 * as "the comparison is noisy".
 */
export function sourceArgs(spec = {}, rate = 48000) {
  const plan = partialsOf(spec, rate);
  const s = plan.spec;
  if (s.chord.length > SOURCE_VOICES) {
    return { ok: false, reason: `${s.chord.length} notes; the engine's def holds ${SOURCE_VOICES}`, plan };
  }
  if (s.count > SOURCE_PARTIALS) {
    return { ok: false, reason: `${s.count} partials; the engine's def holds ${SOURCE_PARTIALS}`, plan };
  }
  if (plan.dropped > 0) {
    return { ok: false, reason: `${plan.dropped} partials land above Nyquist, so the voices no longer share one table`, plan };
  }
  // Voice 0's table, at the finished amplitudes. Every voice shares it when
  // nothing was dropped — which is what the guard above makes true.
  const amps = new Array(SOURCE_PARTIALS).fill(0);
  for (const p of plan.partials) if (p.voice === 0) amps[p.partial - 1] = p.amp;
  const semis = new Array(SOURCE_VOICES).fill(0);
  for (let v = 0; v < SOURCE_VOICES; v++) semis[v] = s.chord[v] ?? s.chord[s.chord.length - 1] ?? 0;
  return {
    ok: true, plan,
    // ⚠️ NO `level` AND NO `shape`. The table carries the level — `partialsOf`
    // normalised it — and scaling again in the def would be a second authority
    // on one number. `shape` is not a control at all: the engine renders a
    // table, and a waveform NAME cannot cross to a different engine without
    // meaning two different sounds (PosSource.sc's header).
    scalars: { hz: s.hz, nvoices: s.chord.length, spread: s.spread },
    semis, amps,
    partials: plan.partials.length,
  };
}
