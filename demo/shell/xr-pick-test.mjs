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
import { holdM, GRIP_PARTS, FACE_TILT, BODY_PROFILE } from './xr-room.mjs';
import { dedupe, SAME_THING_M } from './xr-hands.mjs';

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
  // 🔴 THE POSE, AFTER THE HEADSET SAID IT WAS WRONG. Reported from a Quest 3:
  // *"tablet works but looks to sky not to me (x rot 90 missing)"*. Identity
  // grip — the hand at the origin, its -Z (the thumb, and the top plate) along
  // world -Z, so the plate faces the way a plate faces and nothing is rotated
  // into a pose that flatters the answer.
  const I = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1]);
  const M = holdM(I);
  const n = [M[8], M[9], M[10]];
  const gY = [I[4], I[5], I[6]];                 // across the handle, back at you
  const gnZ = [-I[8], -I[9], -I[10]];            // up the controller, the thumb
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const hM = Math.hypot(M[4], M[5], M[6]);
  const up = [M[4] / hM, M[5] / hM, M[6] / hM];

  // 🔴 THE REGRESSION, NAMED BY ITS OWN NUMBER. The bug read EXACTLY 1.0000
  // here — the face pointing straight along the controller, i.e. at the
  // ceiling. It must now be sin(FACE_TILT), which is the lean and nothing more.
  ok('the tablet does not face along the controller — the bug that did read exactly 1.0',
     Math.abs(dot(n, gnZ)) < 0.5 && near(dot(n, gnZ), Math.sin(FACE_TILT), 1e-6),
     `its face against the controller's own axis: ${dot(n, gnZ).toFixed(4)} (the lean, sin ${(FACE_TILT * 180 / Math.PI).toFixed(0)}°), and it was 1.0000`);

  ok('...it faces ACROSS the handle, back at whoever is holding it',
     near(dot(n, gY), Math.cos(FACE_TILT), 1e-6),
     `${(Math.acos(Math.max(-1, Math.min(1, dot(n, gY)))) * 180 / Math.PI).toFixed(1)}° off square across the handle, which is the lean`);

  ok('...and its own top edge points up the controller, so it reads the right way up',
     dot(up, gnZ) > 0.9, `up against the thumb's direction: ${dot(up, gnZ).toFixed(4)}`);

  // 🔴 RIGHT-HANDED, OR BACKFACE CULLING EATS IT. Three columns with a negative
  // determinant flip the winding, and the room draws with CULL_FACE on — so a
  // mirrored basis is an invisible tablet, which reads as "the tablet was never
  // built" rather than as a sign error. A ROTATION cannot break this; a column
  // negated by hand to make the picture look right can, which is the whole
  // reason the fix above was a rotation.
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
     `${wOut.toFixed(3)} x ${hOut.toFixed(3)} m at ${TABLET.px}x${TABLET.py} px`);

  // An eye out along the tablet's own normal, looking back at it — which is
  // where a face is once the wrist is turned. The centre must read 0.5, 0.5 and
  // the distance must be the one that was asked for.
  const C = [M[12], M[13], M[14]];
  const eye = [C[0] + n[0] * 0.35, C[1] + n[1] * 0.35, C[2] + n[2] * 0.35];
  const back = [-n[0], -n[1], -n[2]];
  const hit = pickQuad(M, eye, back);
  ok('a ray back down the tablet\'s own normal lands in the middle of it',
     !!hit && near(hit.u, 0.5, 1e-3) && near(hit.v, 0.5, 1e-3) && near(hit.t, 0.35, 1e-3),
     hit ? `u ${hit.u.toFixed(3)} v ${hit.v.toFixed(3)} at ${hit.t.toFixed(3)} m` : 'no hit');

  // NEGATIVE CONTROL: the same ray from behind the face is refused, so the
  // screen has a front and it is the side that leans towards you.
  const behind = [C[0] - n[0] * 0.35, C[1] - n[1] * 0.35, C[2] - n[2] * 0.35];
  ok('...and the same ray from behind it is refused, so the screen has a front',
     pickQuad(M, behind, n) === null);

  // ⚠️ AND IT CLEARS THE CONTROLLER IT IS ON. The tablet grew by two thirds; a
  // slab whose bottom edge is inside the head of the stand-in reads as a
  // modelling fault, and the lift is the number that would be wrong.
  const topOfHead = Math.max(...BODY_PROFILE.map(([z]) => -z));
  const bottomEdge = Math.hypot(C[0], C[1] - 1, C[2]) - (TABLET.h / 2) * Math.cos(FACE_TILT);
  const gap = bottomEdge - topOfHead;
  ok('the tablet sits ON the controller — not buried in its head, not floating above it',
     gap > 0 && gap < 0.03,
     `${(gap * 1000).toFixed(1)} mm between its lower edge and the top of the head`
     + ' (it was -0.4 mm — inside — when the tablet grew by two thirds)');
}

// ── one physical thing, one stand-in ──────────────────────────────────────
{
  // 🔴 THE DOUBLE CONTROLLER, EXACTLY AS THE DEVICE REPORTED IT. Taken from the
  // log of 2026-09-13: one input source and two tracked ones, with the SAME
  // hand appearing twice under the same profile. This is the shape that drew
  // two stand-ins for one hand, and it is pure arithmetic, so it is graded here
  // rather than on a head.
  const at = (where, handedness, profile, x, hasHand = false) => ({
    where, handedness, profile, hasHand,
    m: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, 0.8, -0.2, 1]),
    src: {},
  });
  const twice = dedupe([
    at('I0', 'right', 'meta-quest-touch-plus', 0.13),
    at('T1', 'right', 'meta-quest-touch-plus', 0.13),
  ]);
  ok('the same controller in both arrays is drawn ONCE',
     twice.kept.length === 1 && twice.kept[0].where === 'I0' && twice.dropped.length === 1,
     twice.dropped[0] || `kept ${twice.kept.length}`);

  // ⚠️ AND A HAND OVER A CONTROLLER ON THE SAME WRIST: the controller wins,
  // because it is the object that is physically there and it is the one with
  // buttons on it.
  const both = dedupe([
    at('I0', 'right', 'oculus-hand', 0.13, true),
    at('T1', 'right', 'meta-quest-touch-plus', 0.13),
  ]);
  ok('a hand and a controller on one wrist draw the controller, not both',
     both.kept.length === 1 && both.kept[0].profile === 'meta-quest-touch-plus',
     `kept ${both.kept.map((k) => k.where + ':' + k.profile).join(', ')}`);

  // 🔴 NEGATIVE CONTROL, AND IT IS THE ONE THAT MATTERS. A rule that collapses
  // everything would also pass both cases above. Two REAL controllers, one per
  // hand, must both survive — that is the case a distance-only test breaks if
  // the threshold grows, and the case a handedness-only test breaks when a
  // runtime reports `none`.
  const two = dedupe([
    at('I0', 'right', 'meta-quest-touch-plus', 0.13),
    at('I1', 'left', 'meta-quest-touch-plus', -0.26),
  ]);
  ok('two real controllers, one per hand, are still two stand-ins',
     two.kept.length === 2 && two.dropped.length === 0);

  // NEGATIVE CONTROL: `handedness` can be `none`, so the distance test has to
  // carry the case on its own — and it has to carry it BOTH ways.
  const anon = dedupe([
    at('I0', 'none', 'generic-trigger', 0.13),
    at('T1', 'none', 'generic-trigger', 0.13 + SAME_THING_M / 2),
  ]);
  const apart = dedupe([
    at('I0', 'none', 'generic-trigger', 0.13),
    at('T1', 'none', 'generic-trigger', 0.13 + SAME_THING_M * 4),
  ]);
  ok('with no handedness at all, two poses in one place collapse and two apart do not',
     anon.kept.length === 1 && apart.kept.length === 2,
     `${SAME_THING_M} m apart is the line`);
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
