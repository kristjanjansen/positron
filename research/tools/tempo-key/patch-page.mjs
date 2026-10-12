// Writes a copy of radio/030's page with one candidate change to its tempo
// detector, for our-tempo.mjs --page. The page itself is never touched.
//
//   node research/tools/tempo-key/patch-page.mjs <candidate> <out.html> [param]
//
// Each candidate replaces an exact string and refuses to run if the string is
// not there, so a page that moved on cannot be measured as if it had not.
import { readFileSync, writeFileSync } from 'node:fs';

const [cand, dest, param] = process.argv.slice(2);
const PAGE = new URL('../../../demo/concepts/radio/030/index.html', import.meta.url).pathname;
let html = readFileSync(PAGE, 'utf8');
const swap = (a, b) => { if (!html.includes(a)) throw new Error(`${cand}: anchor not found: ${a.slice(0, 60)}`); html = html.replace(a, b); };

const PHASE_SET = '    t.beatAt = t.newest - bestPh / rate;\n';
const SCORE = `    const score = (ph) => { let sum = 0; for (let j = 0; ; j++) { const c = span - 1 - ph - j * P; if (c < R) break;
      sum += Math.exp(-(j * P / rate) / PH_DECAY_S) * (pulse(low, c) + HAT_BETA * pulse(hat, c + P / 2)); } return sum; };
`;

if (cand === 'keep') {
  // Phase continuity: the grid the last reading drew, carried forward, is kept
  // unless the best phase beats it by more than M (default 0.25).
  const M = +(param ?? 0.25);
  swap(PHASE_SET, `${SCORE}    if (t.beatAt != null) {
      const ph0 = ((((t.newest - t.beatAt) * rate) % P) + P) % P;
      if (bestSum < score(ph0) * (1 + ${M})) bestPh = ph0;
    }
${PHASE_SET}`);
} else if (cand === 'keepnear') {
  // As keep, and the carried grid may also slide up to 1/16 beat toward the best
  // nearby phase, so a small tempo error does not walk it off the kick.
  const M = +(param ?? 0.25);
  swap(PHASE_SET, `${SCORE}    if (t.beatAt != null) {
      const ph0 = ((((t.newest - t.beatAt) * rate) % P) + P) % P;
      let nb = ph0, ns = score(ph0);
      for (let d = -P / 16; d <= P / 16; d += 0.5) { const q = ((ph0 + d) % P + P) % P, s = score(q); if (s > ns) { ns = s; nb = q; } }
      if (bestSum < ns * (1 + ${M})) bestPh = nb;
    }
${PHASE_SET}`);
} else if (cand === 'adapt') {
  // The hats' side is MEASURED, not assumed: the low bands find their own best
  // grid, the hat band is folded on it, and only if the hats sit more on the
  // offbeat than on the beat (by `ratio`) is the dance music term used. If they
  // sit on the beat, the beat envelope is the bands weighted `wy` (hats
  // included) and there is no offbeat term. `keep` adds the phase continuity of
  // the `keep` candidate on top (0 is off).
  // param: 'ratio=1,keep=0.25,wy=1|1|1|1'
  const P0 = Object.fromEntries((param || '').split(',').filter(Boolean).map((kv) => kv.split('=')));
  const ratio = +(P0.ratio ?? 1), keep = +(P0.keep ?? 0), wy = (P0.wy ?? '1|1|1|1').split('|').map(Number);
  const LOOP = `    let bestPh = 0, bestSum = -Infinity;
    for (let ph = 0; ph < P; ph += 0.5) {
      let sum = 0;
      for (let j = 0; ; j++) {
        const c = span - 1 - ph - j * P;
        if (c < R) break;
        const w = Math.exp(-(j * P / rate) / PH_DECAY_S);
        sum += w * (pulse(low, c) + HAT_BETA * pulse(hat, c + P / 2));
      }
      if (sum > bestSum) { bestSum = sum; bestPh = ph; }
    }
${PHASE_SET}`;
  swap(LOOP, `    const train = (e, ph, off) => { let s = 0; for (let j = 0; ; j++) { const c = span - 1 - ph - j * P; if (c < R) break; s += Math.exp(-(j * P / rate) / PH_DECAY_S) * pulse(e, c + off); } return s; };
    let phL = 0, sL = -Infinity;
    for (let ph = 0; ph < P; ph += 0.5) { const s = train(low, ph, 0); if (s > sL) { sL = s; phL = ph; } }
    const offHats = train(hat, phL, P / 2) > ${ratio} * train(hat, phL, 0);
    const WY = ${JSON.stringify(wy)};
    const env = offHats ? low : new Float32Array(span);
    if (!offHats) for (let i = 0; i < span; i++) { const j = (t.w - span + i + t.n) % t.n; for (let b = 0; b < BANDS.length; b++) env[i] += WY[b] * t.bands[b][j]; }
    const score = (ph) => train(env, ph, 0) + (offHats ? HAT_BETA * train(hat, ph, P / 2) : 0);
    let bestPh = 0, bestSum = -Infinity;
    for (let ph = 0; ph < P; ph += 0.5) { const s = score(ph); if (s > bestSum) { bestSum = s; bestPh = ph; } }
    t.offHats = offHats;
    if (${keep} > 0 && t.beatAt != null) {
      const ph0 = ((((t.newest - t.beatAt) * rate) % P) + P) % P;
      let nb = ph0, ns = score(ph0);
      for (let d = -P / 16; d <= P / 16; d += 0.5) { const q = ((ph0 + d) % P + P) % P, s = score(q); if (s > ns) { ns = s; nb = q; } }
      if (bestSum < ns * (1 + ${keep})) bestPh = nb;
    }
${PHASE_SET}`);
} else if (cand === 'none') {
  // unchanged
} else throw new Error('unknown candidate ' + cand);
writeFileSync(dest, html);
