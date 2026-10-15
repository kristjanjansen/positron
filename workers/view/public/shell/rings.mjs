// demo/shell/rings.mjs: the dot piano's rings on a 1 bit 128x64 panel, generalised from the Pico
// firmware (rig/pico/rings/main.c) so any panel can draw them: the Pi's screen through
// panel-screen.mjs, its simulator, and anything else with a `px(x, y)`.
// Every pitch from C3 to G4 has a ring, low notes inside; the picture turns clockwise under a pen at
// the top at 0.7 rad/s, so a held note draws an arc. A released arc keeps turning and fades over 3 s,
// which on one bit is thinning: every pixel, every 2nd, 4th, 8th, then none.
// why: lessons/kit-rings.md#header

export const LO = 48, HI = 67;               // C3 the innermost ring, G4 the outermost
const R_IN = 4, R_OUT = 28;                  // pixels: 64 high with a pen above the outer ring
const LIFE_MS = 3000, MAXS = 48;
const TURN = 0.7 / 1000;                     // radians a millisecond, the shader's speed on /synth/dots/
const FULL = 2 * Math.PI * (0xFC000000 / 2 ** 32);   // a held note never quite closes its ring

/** Strokes in, pixels out. `t` is milliseconds on any one clock the caller keeps. */
export function createRings({ w = 128, h = 64 } = {}) {
  let strokes = [];                          // { n, held, on, off }
  const pen = new Map();                     // note -> its stroke while held
  let volume = 100;                          // CC 7, as the firmware reads it
  return {
    noteOn(n, t) {
      if (n < LO || n > HI || pen.has(n)) return;
      if (strokes.length >= MAXS) strokes.shift();
      const s = { n, held: true, on: t, off: 0 };
      strokes.push(s); pen.set(n, s);
    },
    noteOff(n, t) {
      const s = pen.get(n);
      if (!s) return;
      s.held = false; s.off = t; pen.delete(n);
    },
    panic(t) { for (const n of [...pen.keys()]) this.noteOff(n, t); },
    volume(v) { volume = Math.max(0, Math.min(127, v)); },
    /** Anything left to draw at `t`: a held note, or one still fading. */
    alive(t) { return strokes.some((s) => s.held || t - s.off < LIFE_MS); },
    /** The picture at `t`, one `px(x, y)` per lit pixel. */
    draw(px, t) {
      const cx = w / 2, cy = h / 2;
      px(cx, 0); px(cx, 1);                  // the pen, above the outermost ring
      for (const s of strokes) {
        const end = s.held ? t : s.off;
        const span = Math.min(FULL, (end - s.on) * TURN);
        // a point drawn at time u sits turn(t) - turn(u) clockwise of the pen
        const start = (t - end) * TURN;
        const fade = s.held ? 1 : 1 - (t - s.off) / LIFE_MS;
        if (fade <= 0) continue;
        const level = fade * volume;
        const every = level > 84 ? 1 : level > 42 ? 2 : level > 16 ? 4 : level > 4 ? 8 : 0;
        if (!every) continue;
        const r = R_IN + Math.floor((R_OUT - R_IN) * (s.n - LO) / (HI - LO));
        arc(px, cx, cy, r, start, span, every);
      }
      strokes = strokes.filter((s) => s.held || t - s.off <= LIFE_MS);
    },
  };
}

// An arc of radius r, clockwise from a0 (0 at the top) for span radians, one point per pixel of
// arc, every `every`th drawn; rounding as the firmware's Q14 sine does.
function arc(px, cx, cy, r, a0, span, every) {
  const step = 1 / r, steps = Math.floor(span / step) + 1;
  let lx = -999, ly = -999, k = 0;
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (i < steps ? i * step : span);
    const x = cx + Math.round(r * Math.sin(a)), y = cy - Math.round(r * Math.cos(a));
    if (x === lx && y === ly) continue;
    lx = x; ly = y;
    if (k++ % every === 0) px(x, y);
  }
}
