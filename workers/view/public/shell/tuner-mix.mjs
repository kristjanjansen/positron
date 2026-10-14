// demo/shell/tuner-mix.mjs: what an AM dial does to the stations on it, lifted
// out of /radio/tuner/ so /social/radio/ tunes by the same maths. Pure: no
// AudioContext until pinkNoise is handed one.

export const CLEAR_W = 0.035, ECHO_W = 0.13, ECHO_MAX = 0.35;

/**
 * mix(t) for stations at points `at` (0 to 1) on the dial. Clear is a narrow
 * bell on the station; echo is a wide bell, faint, and only what clear leaves;
 * noise fills what no station holds; the whistle is the beat of a carrier
 * slightly off tune, silent dead on and gone far away, its pitch rising with
 * the distance.
 */
export function createMix(stations) {
  return function mix(t) {
    const st = stations.map((s) => {
      const dist = Math.abs(t - s.at);
      const clear = Math.exp(-((dist / CLEAR_W) ** 2));
      const echo = ECHO_MAX * Math.exp(-((dist / ECHO_W) ** 2)) * (1 - clear);
      // Off tune the sidebands go first, so the clear path also dulls.
      const bright = 1200 + 2300 * Math.exp(-((dist / 0.03) ** 2));
      return { dist, clear, echo, bright };
    });
    const best = Math.max(...st.map((s) => s.clear));
    const near = st.reduce((a, s, i) => (s.dist < st[a].dist ? i : a), 0);
    const nd = st[near].dist;
    return {
      st, near,
      noise: 0.04 + 0.26 * (1 - best),
      whistle: 0.05 * (1 - Math.exp(-((nd / 0.012) ** 2))) * Math.exp(-((nd / 0.07) ** 2)),
      pitch: Math.min(3200, 150 + 40000 * nd),
    };
  };
}

/** Pink-ish noise, `seconds` long, to loop (Paul Kellet's economy filter). */
export function pinkNoise(ctx, seconds = 4) {
  const n = ctx.sampleRate * seconds, buf = ctx.createBuffer(1, n, ctx.sampleRate), a = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.0990460; b1 = 0.96300 * b1 + w * 0.2965164; b2 = 0.57000 * b2 + w * 1.0526913;
    a[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12;
  }
  return buf;
}
