// One scope, both waves, each held from its own onset (/remote/collide/, /drums/remote/): the Pi's
// copy arrives 100 to 300 ms late and splices, so a free scope jitters. One scale for both. 'onset'
// finds the Pi's note after the trigger; 'match' (drums, never quiet) matches the loudness shape.
// See lessons/page-remote.md#remote-31
import { createWaveShape, captureTrace } from '/shell/synth-view.mjs';

const FLAT = Array(512).fill(0);
const BLK = 48;                                   // 1 ms at 48 kHz

/** The first rising zero crossing after the first onset at or after `from`, or -1. */
function onsetFrom(buf, from, win) {
  const n = buf.length, pk = [];
  for (let i = Math.max(0, from - 30 * BLK); i + BLK <= n; i += BLK) {
    let m = 0; for (let j = i; j < i + BLK; j++) { const a = buf[j] < 0 ? -buf[j] : buf[j]; if (a > m) m = a; }
    pk.push([i, m]);
  }
  for (let k = 0; k < pk.length; k++) {
    const [i, m] = pk[k];
    if (i < from) continue;
    let before = 0; for (let j = Math.max(0, k - 30); j < k; j++) before = Math.max(before, pk[j][1]);
    if (m > 0.002 && m > before * 3) {
      for (let z = i + 1; z < n - win; z++) if (buf[z - 1] < 0 && buf[z] >= 0) return z;
      return -1;
    }
  }
  return -1;
}

/** Peak of every 1 ms block of `buf` from `from`, `count` of them. */
function envelope(buf, from, count) {
  const out = new Float32Array(count);
  for (let b = 0; b < count; b++) {
    let m = 0; const i0 = from + b * BLK;
    for (let j = i0; j < i0 + BLK && j < buf.length; j++) { const a = buf[j] < 0 ? -buf[j] : buf[j]; if (a > m) m = a; }
    out[b] = m;
  }
  return out;
}

/**
 * @param {object} [o]
 * @param {number} [o.win]      samples in a window (1024, 21 ms at 48 kHz, on 020)
 * @param {number} [o.slide]    'onset': how far the Pi's window may slide forward
 * @param {string} [o.axis]     the x axis words, the window's length
 * @param {'onset'|'match'} [o.find]  how the Pi's onset is found (above)
 * @param {number} [o.slackMs]  how far before the trigger this tab's onset may lie
 * @param {number} [o.refMs]    'match': the loudness shape matched, from this tab's onset
 * @param {number} [o.minLagMs] 'match': the Pi's copy no sooner than this after this tab's
 * @param {number} [o.maxLagMs] 'match': and no later than this
 * @param {number} [o.back]     'match': the final slide, this many samples either way
 */
export function createOverlayScope({ win = 1024, slide = 960, axis = '21 ms', height = 160, find = 'onset',
  slackMs = 0, refMs = 150, minLagMs = 60, maxLagMs = 400, back = 480, lateMs = 1500 } = {}) {
  const wave = createWaveShape({ name: 'here', colour: '--hi', height, points: FLAT,
    over: { name: 'Pi', colour: '--mi-blue', points: FLAT }, axes: { x: axis } });
  const held = { local: null, pi: null }, heldGen = { local: 0, pi: 0 };
  /** 'onset': this tab's window kept; 'match': also when its onset was, in context seconds, and its loudness shape. */
  const ref = { at: 0, env: null };
  const shifts = [], lags = [];
  const captures = { local: 0, pi: 0, missed: 0 };
  let holdGen = 0;

  /** How far into `buf` from `at` the window best matches `r`, `lo` to `hi` samples. */
  function bestShift(r, buf, at, lo = 0, hi = slide) {
    let best = lo, bestC = -Infinity;
    for (let sh = lo; sh <= hi; sh += 2) {
      let c = 0; for (let i = 0; i < win; i += 2) c += r[i] * buf[at + sh + i];
      if (c > bestC) { bestC = c; best = sh; }
    }
    return best;
  }

  /** 'match': where in `buf` the Pi's copy of this tab's onset lies, or -1 (not all heard yet: -2). */
  function matchIn(buf, nowCtx, rate) {
    const n = buf.length;
    const idxOf = (t) => Math.round(n - (nowCtx - t) * rate);
    const lo = idxOf(ref.at + minLagMs / 1000), hi = idxOf(ref.at + maxLagMs / 1000);
    const blocks = ref.env.length;
    if (lo - back < 0) return -1;
    // The shape read reaches `blocks` past `hi`, the final slide `back + win`.
    if (hi + Math.max(blocks * BLK, back + win) > n) return -2;
    const env = envelope(buf, lo, Math.floor((hi - lo) / BLK) + blocks);
    let rr = 0; for (const v of ref.env) rr += v * v;
    let best = -1, bestC = 0.5;                    // under 0.5 is no match at all
    for (let s = 0; s + blocks <= env.length; s++) {
      let c = 0, ee = 0;
      for (let b = 0; b < blocks; b++) { c += ref.env[b] * env[s + b]; ee += env[s + b] * env[s + b]; }
      const k = ee > 0 && rr > 0 ? c / Math.sqrt(ee * rr) : 0;
      if (k > bestC) { bestC = k; best = s; }
    }
    if (best < 0) return -1;
    const coarse = lo + best * BLK;
    return coarse - back + bestShift(held.local, buf, coarse - back, 0, 2 * back);
  }

  /**
   * A trigger: take each side's window from its own onset, once it has one.
   * `at` is the trigger's time on `ctx`'s clock (a key: now; a hit: when it is
   * due). `sides.local()` and `sides.pi()` answer that side's AnalyserNode, or null.
   * See lessons/page-remote.md#remote-32
   */
  function hold({ ctx, at, sides }) {
    if (!ctx) return;
    const gen = ++holdGen, t0 = performance.now();
    for (const k of ['local', 'pi']) {
      const tick = () => {
        if (gen !== holdGen) return;
        const late = performance.now() - t0 > lateMs;
        const an = sides[k]();
        if (!an) { if (!late) setTimeout(tick, 40); return; }
        const buf = new Float32Array(an.fftSize);
        an.getFloatTimeDomainData(buf);
        const nowCtx = ctx.currentTime, rate = ctx.sampleRate;
        const from = Math.round(buf.length - (nowCtx - at) * rate) - Math.round(slackMs / 1000 * rate);
        if (k === 'pi' && find === 'match') {
          // Waits for this tab's window first: the Pi's is found by matching it.
          if (heldGen.local !== gen || !ref.env) { if (late) captures.missed++; else setTimeout(tick, 40); return; }
          const p = matchIn(buf, nowCtx, rate);
          if (p >= 0) {
            held.pi = buf.slice(p, p + win); heldGen.pi = gen; captures.pi++;
            lags.push(((p - buf.length) / rate + nowCtx - ref.at) * 1000);
            paint(); return;
          }
          if (p === -1 || late) { captures.missed++; return; }
          setTimeout(tick, 40); return;
        }
        const o = from >= 0 ? onsetFrom(buf, from, win) : -1;
        const need = k === 'local' && find === 'match' ? Math.max(win, Math.round(refMs / 1000 * rate)) : win + slide;
        if (o >= 0 && o + need <= buf.length) {
          // 'onset': the Pi's window slides to where it best matches this tab's.
          const sh = find === 'onset' && k === 'pi' && held.local && heldGen.local === gen ? bestShift(held.local, buf, o) : 0;
          held[k] = buf.slice(o + sh, o + sh + win); heldGen[k] = gen; shifts.push(sh); captures[k]++;
          if (k === 'local' && find === 'match') {
            ref.at = nowCtx - (buf.length - o) / rate;
            ref.env = envelope(buf, o, Math.floor(refMs / 1000 * rate / BLK));
          }
          paint(); return;
        }
        if (from < 0 || late) { captures.missed++; return; }
        setTimeout(tick, 40);
      };
      setTimeout(tick, 40);
    }
  }

  function paint() {
    let peak = 0;
    for (const b of [held.local, held.pi]) if (b) for (const v of b) peak = Math.max(peak, Math.abs(v));
    const full = Math.max(peak * 1.1, 1e-4);
    const pts = (b) => (b ? Array.from(captureTrace(b, 0, b.length, 512), (v) => Math.max(-1, Math.min(1, v / full))) : FLAT);
    wave.set({ points: pts(held.local), over: { name: 'Pi', colour: '--mi-blue', points: pts(held.pi) } });
  }

  return { el: wave.el, wave, held, heldGen, shifts, lags, captures, hold, paint };
}
