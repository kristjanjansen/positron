// demo/shell/source-args.mjs: one spec into the numbers PosSource wants, for the board (rig/board/pappus.mjs)
// and /grains/'s wasm scsynth alike, so there is one authority. The expansion only: no engine, no wire.
// why: lessons/kit-source-args.md#header
import { partialsOf } from './source.mjs';

/**
 * The def's control array sizes (PosSource.sc), structural: setn past the end writes into the next
 * control, so a spec that does not fit is refused by name.
 * why: lessons/kit-source-args.md#source-sizes
 */
export const SOURCE_VOICES = 6, SOURCE_PARTIALS = 24;

/** The wavetable's length in buffer entries — `PosSource.sc`'s `tableSize`. */
export const SOURCE_TABLE = 4096;

/**
 * The spec as PosSource's numbers. One shared amplitude table, so partials dropped at Nyquist are
 * refused with the count rather than sent as a quietly different spectrum.
 * why: lessons/kit-source-args.md#source-args
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
    // No level (the table carries it) and no shape (a waveform name means different sounds on two engines).
    // why: lessons/kit-source-args.md#no-level-shape
    scalars: { hz: s.hz, nvoices: s.chord.length, spread: s.spread },
    semis, amps,
    partials: plan.partials.length,
  };
}
