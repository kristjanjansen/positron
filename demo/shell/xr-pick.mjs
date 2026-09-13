// demo/shell/xr-pick.mjs — where a controller's ray lands on a flat rectangle.
//
// Thirty floating-point operations and one divide, per quad, per ray, per frame.
// Two rays and four quads at 90 fps is about 22,000 of them a second on a part
// that is shading 3360x1760 twice at 90 Hz, so it does not appear in any
// measurement anybody could take — said here so that nobody proposes a
// bounding-volume hierarchy for four rectangles. `plan-xr-hands` §5.3.
//
// 🔴 IT IS ALL ARITHMETIC ON TWO Float32Array(16)s, WHICH IS WHY IT IS IN ITS
// OWN FILE. A press landing in the wrong place is the defect this whole design
// is most likely to ship, and it is the one a laptop can grade EXACTLY — no
// headset, no browser, no GPU. `node demo/shell/xr-pick-test.mjs` is the grader
// and three of its six cases are negative controls, because a check that cannot
// fail is decoration.
//
// ⚠️ THE FACING CONVENTION IS MEASURED HERE RATHER THAN ASSUMED, and it is the
// one thing in this file worth reading twice. Both quads this repo points at —
// `xr-panel.mjs`'s `placeFacing` and `xr-room.mjs`'s `holdM` — are built so
// their local +Z comes BACK AT THE VIEWER. So for a hit on the FRONT of either,
// the ray direction and the quad's normal point opposite ways and `d · N` is
// NEGATIVE.
//
// 🔴 `plan-xr-hands` §5.4 warns against writing `if (den > 0) return null` and
// says it "rejects every valid hit". THAT SENTENCE IS WRONG — its own worked
// example two lines above derives `den ≈ -1` for a valid hit, which that line
// would KEEP. The warning is right about the hazard and wrong about the sign,
// which is exactly the shape of thing that gets copied. So this file does not
// carry a bare sign test at all: it computes a NAMED `front` and the test file
// asserts both directions, so the convention is a measurement rather than a
// recollection.

/**
 * Where a ray meets a rectangle, in the rectangle's own coordinates.
 *
 * @param {Float32Array|number[]} M  the quad's model matrix, column-major. Its
 *        first column is local +X scaled by the quad's WIDTH, its second local
 *        +Y scaled by its HEIGHT, its third the normal, its fourth the centre.
 * @param {number[]} o  where the ray starts — `[m[12], m[13], m[14]]` of a pose
 * @param {number[]} d  which way it goes, a UNIT vector — `[-m[8],-m[9],-m[10]]`
 * @param {object} [opt]
 * @param {boolean} [opt.backface]  accept a hit on the back too. Default false:
 *        a surface you can press through the back of is one that answers when
 *        you point AWAY from it, which reads as broken tracking.
 * @returns {{t:number, u:number, v:number, x:number, y:number, front:boolean}|null}
 *        `t` in metres along the ray (when `d` is unit), `u`/`v` in 0..1 with
 *        the origin at the TOP LEFT — the same way round as the shader reads
 *        the texture — and `x`/`y` in -0.5..+0.5, which is the range of the
 *        quad's own vertices.
 */
export function pickQuad(M, o, d, { backface = false } = {}) {
  const nx = M[8], ny = M[9], nz = M[10];
  const den = d[0] * nx + d[1] * ny + d[2] * nz;
  // Parallel. Not a near miss — there is no plane crossing at all.
  if (Math.abs(den) < 1e-6) return null;
  const front = den < 0;
  if (!front && !backface) return null;
  const wx = M[12] - o[0], wy = M[13] - o[1], wz = M[14] - o[2];
  const t = (wx * nx + wy * ny + wz * nz) / den;
  if (t <= 0) return null;                       // behind you
  const px = o[0] + t * d[0], py = o[1] + t * d[1], pz = o[2] + t * d[2];
  const vx = px - M[12], vy = py - M[13], vz = pz - M[14];
  const rx = M[0], ry = M[1], rz = M[2];
  const ux = M[4], uy = M[5], uz = M[6];
  // ⚠️ DIVIDED BY THE SQUARED LENGTH, and that is not a normalisation typo.
  // `R` and `U` are NOT unit vectors — the width and the height are baked into
  // those columns. Dividing by `R·R` normalises AND rescales in one step, so
  // `x` and `y` come out directly in -0.5..+0.5 with no separate scale term and
  // nothing to keep in step when a quad's metres change.
  const rr = rx * rx + ry * ry + rz * rz;
  const uu = ux * ux + uy * uy + uz * uz;
  if (rr < 1e-12 || uu < 1e-12) return null;     // a quad with no size is not a target
  const x = (vx * rx + vy * ry + vz * rz) / rr;
  const y = (vx * ux + vy * uy + vz * uz) / uu;
  if (Math.abs(x) > 0.5 || Math.abs(y) > 0.5) return null;
  // 🔴 READ OFF THE SHADER, NEVER DERIVED TWICE. `xr-room.mjs`'s HOLD_VS and
  // `xr-panel.mjs`'s PANEL_VS both say `vUv = vec2(aPos.x + 0.5, 0.5 - aPos.y)`.
  // If that line ever changes, this one changes with it and the corner case in
  // the test file is what says so.
  return { t, u: x + 0.5, v: 0.5 - y, x, y, front };
}

/**
 * A point on a quad, in the pixels of the canvas drawn on it.
 *
 * Separate from `pickQuad` because it is the step where a silent offset gets
 * introduced — `plan-xr-hands` §5.3 measured three conversions between a `u,v`
 * and a strip hit test, every one of them a plausible wrong answer with no
 * error anywhere. One function, one place to be wrong, one place the test file
 * can grade.
 */
export const uvToPixels = (u, v, w, h) => ({ px: u * w, py: v * h });
