// demo/shell/xr-pick-test.mjs — the tablet's arithmetic, with no headset.
//
//   node demo/shell/xr-pick-test.mjs
//
// `plan-xr-hands` §6.5 puts this FIRST, before any device work, and the reason
// is worth restating: four coordinate spaces stand between a controller's ray
// and a slider moving — the quad, the tablet's canvas, the control's row, the
// control's value — and every one of them is pure arithmetic on two
// `Float32Array(16)`s. A press that lands in the wrong place is the defect this
// design is most likely to ship, and it is the one a laptop grades EXACTLY
// while a headset can only grade it by eye.
//
// ⚠️ THE CORNER CASE IS THE ONE THAT EARNS ITS PLACE, and it has to be a corner
// rather than the centre. The centre hits at 0.5, 0.5 under EVERY mirror,
// transpose and axis swap you could make — a statistic that is constant by
// construction over the defects it is meant to catch, which is this project's
// definition of a blind measurement. The top-left is what distinguishes `0,0`
// from `1,1`, `1,0` and `0,1` — the four ways `vUv = (aPos.x + 0.5,
// 0.5 - aPos.y)` can be re-derived wrong.
//
// FOUR of the cases below are NEGATIVE CONTROLS: a check that cannot fail is
// decoration, the convention `diagram-test.mjs` already set here.

import { pickQuad, uvToPixels } from './xr-pick.mjs';
import { controlAt, valueFromU, DEFAULT_CONTROLS, TABLET } from './xr-tablet.mjs';
import { holdM, GRIP_PARTS } from './xr-room.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
};
const near = (a, b, eps = 1e-4) => Math.abs(a - b) <= eps;

// ── a quad 2 m in front of you, facing back at you ────────────────────────
// Built the way `placeFacing` builds one: local +Z comes BACK at the viewer, so
// a valid hit has `d · N` negative. Width 1.2 m, height 0.8 m.
const W = 1.2, H = 0.8;
const FACING = new Float32Array([
  W, 0, 0, 0,
  0, H, 0, 0,
  0, 0, 1, 0,
  0, 1.5, -2, 1,
]);
const EYE = [0, 1.5, 0];
const at = (target) => {
  const d = [target[0] - EYE[0], target[1] - EYE[1], target[2] - EYE[2]];
  const l = Math.hypot(...d);
  return [d[0] / l, d[1] / l, d[2] / l];
};

{
  const h = pickQuad(FACING, EYE, at([0, 1.5, -2]));
  ok('a ray through the quad\'s centre lands at u 0.5, v 0.5',
     !!h && near(h.u, 0.5) && near(h.v, 0.5) && near(h.t, 2),
     h ? `u ${h.u.toFixed(3)} v ${h.v.toFixed(3)} at ${h.t.toFixed(3)} m` : 'no hit');
}

{
  // The quad's own top-left vertex: local (-0.5, +0.5) -> world (-W/2, +H/2).
  const h = pickQuad(FACING, EYE, at([-W / 2, 1.5 + H / 2, -2]));
  ok('...and the TOP-LEFT corner lands at u 0, v 0, not at 1,1',
     !!h && near(h.u, 0, 2e-3) && near(h.v, 0, 2e-3),
     h ? `u ${h.u.toFixed(4)} v ${h.v.toFixed(4)}` : 'no hit');
}

{
  // 🔴 CATCHES AN R/U SWAP, which the centre case cannot see. Same quad turned
  // 90 degrees in yaw and stood off to the side; its centre must still read
  // 0.5, 0.5 and its own top-left must still read 0, 0.
  const YAW = new Float32Array([
    0, 0, W, 0,          // local +X now runs along world +Z
    0, H, 0, 0,
    1, 0, 0, 0,          // normal along world +X, back at an eye to its right
    -2, 1.5, 0, 1,
  ]);
  const c = pickQuad(YAW, EYE, at([-2, 1.5, 0]));
  const tl = pickQuad(YAW, EYE, at([-2, 1.5 + H / 2, -W / 2]));
  ok('a quad turned 90 degrees still reads 0.5,0.5 at its centre and 0,0 at its own top-left',
     !!c && near(c.u, 0.5) && near(c.v, 0.5)
     && !!tl && near(tl.u, 0, 2e-3) && near(tl.v, 0, 2e-3),
     c && tl ? `centre ${c.u.toFixed(3)},${c.v.toFixed(3)} · corner ${tl.u.toFixed(3)},${tl.v.toFixed(3)}`
             : 'a ray missed');
}

{
  // NEGATIVE CONTROL. From behind, aiming at the centre. `t` is positive and
  // the point is inside the rectangle — everything except the facing is a hit,
  // which is precisely why the facing has to be tested rather than assumed.
  const behind = [0, 1.5, -4];
  const d = [0, 0, 1];
  const h = pickQuad(FACING, behind, d);
  const withBack = pickQuad(FACING, behind, d, { backface: true });
  ok('a ray from BEHIND the quad misses, and says so only because of the facing test',
     h === null && !!withBack && near(withBack.u, 0.5) && near(withBack.v, 0.5),
     withBack ? `refused in front-only; backface:true would have hit at ${withBack.t.toFixed(2)} m`
              : 'the backface case did not hit either, so this control proves nothing');
}

{
  // NEGATIVE CONTROL: parallel to the quad, so there is no crossing at all.
  ok('a ray parallel to the quad misses', pickQuad(FACING, EYE, [1, 0, 0]) === null);
}

{
  // NEGATIVE CONTROL: 1 mm outside the edge. The tightest case there is, and
  // the one a tolerance typed anywhere would swallow.
  const inside = pickQuad(FACING, EYE, at([-W / 2 + 0.001, 1.5, -2]));
  const outside = pickQuad(FACING, EYE, at([-W / 2 - 0.001, 1.5, -2]));
  ok('a ray 1 mm outside the edge misses, and 1 mm inside it hits',
     !!inside && outside === null,
     inside ? `inside at u ${inside.u.toFixed(4)}` : 'the inside case missed too');
}

{
  // NEGATIVE CONTROL: a quad with no size is not a target. A zero column would
  // otherwise divide by zero and hand back NaN, which compares false against
  // every bound and so reads as a miss BY ACCIDENT rather than on purpose.
  const flatQ = new Float32Array([0, 0, 0, 0, 0, H, 0, 0, 0, 0, 1, 0, 0, 1.5, -2, 1]);
  ok('a quad with no width is refused rather than answering NaN',
     pickQuad(flatQ, EYE, at([0, 1.5, -2])) === null);
}

// ── the tablet, held on a grip pose ───────────────────────────────────────
{
  // 🔴 THE POSE THE OWNER ASKED FOR: flat ON the controller's square top face,
  // square to the controller's own axes, NOT at an angle. Identity grip — the
  // hand at the origin, its -Z (the thumb, and the top plate) along world -Z.
  const I = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1]);
  const M = holdM(I);
  const n = [M[8], M[9], M[10]];
  const g = [-I[8], -I[9], -I[10]];              // the grip's own -Z
  const dotN = n[0] * g[0] + n[1] * g[1] + n[2] * g[2];
  // The tablet's face looks the way the top plate looks: straight along the
  // grip's -Z, to within floating point. An angled tablet reads under 1.0 here
  // and that is the whole of the complaint this replaced.
  ok('the tablet lies square on the controller\'s top face, not at an angle',
     near(dotN, 1, 1e-6), `its face against the controller\'s own axis: ${dotN.toFixed(6)}`);

  // And it is perpendicular to the handle: the tablet's own right and up both
  // lie in the plane the handle is normal to, i.e. neither has any component
  // along the grip's -Z.
  const rDot = M[0] * g[0] + M[1] * g[1] + M[2] * g[2];
  const uDot = M[4] * g[0] + M[5] * g[1] + M[6] * g[2];
  ok('...and both of its own axes are perpendicular to the controller',
     near(rDot, 0, 1e-6) && near(uDot, 0, 1e-6),
     `right ${rDot.toFixed(6)} · up ${uDot.toFixed(6)}`);

  // 🔴 RIGHT-HANDED, OR BACKFACE CULLING EATS IT. Three columns with a negative
  // determinant flip the winding, and the room draws with CULL_FACE on — so a
  // mirrored basis is an invisible tablet, which reads as "the tablet was never
  // built" rather than as a sign error.
  const det =
    M[0] * (M[5] * M[10] - M[6] * M[9])
    - M[4] * (M[1] * M[10] - M[2] * M[9])
    + M[8] * (M[1] * M[6] - M[2] * M[5]);
  ok('the tablet\'s basis is right-handed, so its front face is not culled away',
     det > 0, `determinant ${det.toExponential(3)} (it is w*h, and it must be positive)`);

  // The size is the declared one, read back off the matrix rather than retyped.
  const wOut = Math.hypot(M[0], M[1], M[2]), hOut = Math.hypot(M[4], M[5], M[6]);
  ok('...and it is the size the config declares',
     near(wOut, TABLET.w, 1e-6) && near(hOut, TABLET.h, 1e-6),
     `${wOut.toFixed(3)} x ${hOut.toFixed(3)} m`);

  // An eye out along the controller's own axis, looking back down it — which is
  // where a face is when somebody turns the top face towards themselves. The
  // tablet's centre must read 0.5, 0.5 from there and its distance must be the
  // one that was asked for.
  const C = [M[12], M[13], M[14]];
  const eye = [C[0] + g[0] * 0.35, C[1] + g[1] * 0.35, C[2] + g[2] * 0.35];
  const back = [-g[0], -g[1], -g[2]];
  const hit = pickQuad(M, eye, back);
  ok('a ray back down the controller\'s own axis lands in the middle of the tablet',
     !!hit && near(hit.u, 0.5, 1e-3) && near(hit.v, 0.5, 1e-3) && near(hit.t, 0.35, 1e-3),
     hit ? `u ${hit.u.toFixed(3)} v ${hit.v.toFixed(3)} at ${hit.t.toFixed(3)} m` : 'no hit');

  // NEGATIVE CONTROL, and it is the one that says the tablet is on the TOP
  // face rather than under it: the same ray from the other side of the grip —
  // the butt of the handle — meets the tablet's back and is refused.
  const under = [C[0] - g[0] * 0.35, C[1] - g[1] * 0.35, C[2] - g[2] * 0.35];
  ok('...and the same ray from under the controller is refused, so the face is on top',
     pickQuad(M, under, g) === null);
}

// ── u,v to a control and a value ──────────────────────────────────────────
{
  const c = DEFAULT_CONTROLS;
  const first = controlAt(0.5, 0.25);
  ok('the top row of the tablet is the first control',
     first?.i === 0 && first.control.key === c[0].key, first ? first.control.key : 'none');
  // NEGATIVE CONTROLS: the footer is not a control, and neither is the margin
  // above the first row. A hit test that answered "row 0" for the whole face
  // would pass every case above and turn the line that says the shape is a
  // stand-in into a slider.
  ok('the footer and the top margin are not controls',
     controlAt(0.5, 0.99) === null && controlAt(0.5, 0.005) === null);

  // 🔴 THE SLIDER'S ENDS, AND THEY ARE NOT AT u 0 AND u 1. The track is inset
  // by the tablet's own margin, so a value read straight off `u` would be short
  // at both ends by exactly that inset — a slider that cannot reach its own
  // maximum, with every number in the readout still green.
  const lo = valueFromU(0, c[0]), hi = valueFromU(1, c[0]);
  const mid = valueFromU(0.5, c[0]);
  ok('dragging to either end of the track reaches the control\'s own ends',
     near(lo, c[0].min) && near(hi, c[0].max),
     `${lo} .. ${hi} against a declared ${c[0].min} .. ${c[0].max}`);
  ok('...and the middle of the track is the middle of the range',
     near(mid, (c[0].min + c[0].max) / 2), `${mid}`);
  // NEGATIVE CONTROL: past the end is clamped, not extrapolated. A ray that
  // slides off the side of the tablet while the trigger is down must not drive
  // the number past what the control says it can be.
  ok('a drag that runs off the end is clamped rather than extrapolated',
     valueFromU(-3, c[0]) === c[0].min && valueFromU(4, c[0]) === c[0].max);
}

{
  const { px, py } = uvToPixels(0.25, 0.75, 768, 528);
  ok('u,v converts to canvas pixels with the origin at the top left',
     px === 192 && py === 396, `${px}, ${py}`);
}

{
  // The fingerprint is what one headset run in VR and one in AR are compared
  // on. It must be built out of things with no session in them at all — if a
  // mode ever leaks into the controller UI, these two strings stop matching and
  // one log line beside another says so without a third run.
  ok('the controller UI describes itself in a line with no session in it',
     typeof TABLET.fingerprint === 'string' && TABLET.fingerprint.length > 30
     && !/\bvr\b|\bar\b|immersive|passthrough|opaque/i.test(TABLET.fingerprint),
     TABLET.fingerprint);
  ok('the controller stand-in is drawn from a fixed list of parts, and says how many',
     Array.isArray(GRIP_PARTS) && GRIP_PARTS.length >= 2
     && TABLET.fingerprint.includes(`${GRIP_PARTS.length} part`),
     `${GRIP_PARTS.length} parts`);
}

console.log(`\n${pass} ok, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
