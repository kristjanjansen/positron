// demo/shell/xr-pick.mjs: where a controller's ray lands on a flat rectangle. About 30 flops a
// quad, graded exactly by xr-pick-test.mjs. Quads here face +Z back at the viewer, so a front
// hit has a negative `d . N`; `front` is named and the test asserts both directions.
// why: lessons/kit-xr-pick.md#header

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
  // Divided by the squared length on purpose: the columns carry width and height, so this
  // normalises and rescales at once and `x`, `y` land in -0.5..+0.5.
  // why: lessons/kit-xr-pick.md#squared-length
  const rr = rx * rx + ry * ry + rz * rz;
  const uu = ux * ux + uy * uy + uz * uz;
  if (rr < 1e-12 || uu < 1e-12) return null;     // a quad with no size is not a target
  const x = (vx * rx + vy * ry + vz * rz) / rr;
  const y = (vx * ux + vy * uy + vz * uz) / uu;
  if (Math.abs(x) > 0.5 || Math.abs(y) > 0.5) return null;
  // Matches HOLD_VS and PANEL_VS: `vUv = vec2(aPos.x + 0.5, 0.5 - aPos.y)`; the test's corner
  // case catches a change.
  // why: lessons/kit-xr-pick.md#uv-shader
  return { t, u: x + 0.5, v: 0.5 - y, x, y, front };
}

/**
 * A point on a quad in the canvas's pixels. Its own function because a silent offset gets in
 * here; one place to be wrong and one to test.
 * why: lessons/kit-xr-pick.md#uv-to-pixels
 */
export const uvToPixels = (u, v, w, h) => ({ px: u * w, py: v * h });
