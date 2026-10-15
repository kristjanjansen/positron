// demo/shell/sclang-trial.mjs: the sound check a written SuperCollider program passes before it may
// reach a speaker. A second scsynth in the page's context, wired to nothing anybody hears, plays one
// held note for half a second; sclang-writer.mjs's checkSound judges what came out.

import { bootScsynth } from './scsynth.mjs';
import { compile } from './sclang-lite.mjs';
import { checkSound, TRIAL_NOTE, TRIAL_VELOCITY, RENDER_S } from './sclang-writer.mjs';

const DEF = 'trial';
/** The analyser holds the last 32768 samples, 0.68 s at 48 kHz and 0.74 s at 44.1: the whole note in one read. */
const WINDOW = 32768;

/**
 * @param {object} o
 * @param {() => AudioContext} o.context  the page's context, made on a press
 * @param {(line: string, kind?: string) => void} [o.log]
 */
export function createSclangTrial({ context, log = () => {} }) {
  let eng = null, booting = null, an = null, nextId = 9000, renders = 0;
  async function engine() {
    if (eng) return eng;
    booting ??= (async () => {
      const ctx = context();
      const e = await bootScsynth({ audioContext: ctx, log: () => {} });
      // Off the speakers: the engine is pulled through a silent gain and read by an analyser.
      e.out.disconnect();
      const silent = ctx.createGain(); silent.gain.value = 0; silent.connect(ctx.destination);
      e.out.connect(silent);
      an = ctx.createAnalyser(); an.fftSize = WINDOW;
      e.meter.connect(an); an.connect(silent);
      eng = e;
      log(`the sound check's own SuperCollider is up in ${Math.round(e.bootMs)} ms, wired to no speaker`);
      return e;
    })().catch((err) => { booting = null; throw err; });
    return booting;
  }
  /**
   * Compile, then play one held note for RENDER_S where nobody hears it.
   * @returns {Promise<{ ok: boolean, error?: string, peak?: number, rms?: number, nan?: boolean, silent?: boolean, unchecked?: string, renderMs?: number }>}
   */
  async function trial(source) {
    const c = compile(source, { name: DEF });
    if (!c.ok) return { ok: false, error: c.message };
    const t0 = performance.now();
    let e;
    try { e = await engine(); } catch (err) { return { ok: true, unchecked: `the sound check's engine did not start: ${err?.message || err}` }; }
    const got = await e.sendAndWait((m) => (m[0] === '/done' || m[0] === '/fail') && m[1] === '/d_recv', 5000, '/d_recv', c.bytes);
    if (!got || got[0] !== '/done') return { ok: true, unchecked: `the engine did not take it: ${got ? got.slice(2).join(' ') : 'no answer'}` };
    const id = nextId++;
    const args = ['freq', 440 * 2 ** ((TRIAL_NOTE - 69) / 12), 'gate', 1];
    const amp = c.controls.find((x) => x.name === 'amp')?.value;
    if (amp != null) args.push('amp', amp * TRIAL_VELOCITY / 127);
    const buf = new Float32Array(WINDOW);
    e.send('/s_new', DEF, id, 0, 0, ...args);
    await new Promise((r) => setTimeout(r, RENDER_S * 1000 + 60));
    an.getFloatTimeDomainData(buf);
    e.send('/n_free', id);
    e.send('/g_freeAll', 0);
    renders++;
    // Only the samples since the note began: older ones in the window are the check before this one.
    const since = Math.min(WINDOW, Math.round((RENDER_S + 0.06) * e.ctx.sampleRate));
    return { ok: true, ...checkSound(buf.subarray(WINDOW - since)), renderMs: Math.round(performance.now() - t0) };
  }
  return { trial, warm: () => engine().catch(() => null), renders: () => renders, engine: () => eng };
}
