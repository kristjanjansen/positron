// demo/shell/xr-pick-test.mjs: the tablet's arithmetic, with no headset.
//   node demo/shell/xr-pick-test.mjs
// The corner case matters: the centre reads 0.5, 0.5 under every mirror. Four negative controls.
// why: lessons/kit-xr-pick.md#test-header

import { writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pickQuad, uvToPixels } from './xr-pick.mjs';
import {
  controlAt, valueFromU, DEFAULT_CONTROLS, TABLET, MONO_ADV,
  isButton, btnLabelW, createXRTablet, QUIT_CONTROL,
} from './xr-tablet.mjs';
import { holdM, GRIP_PARTS, FACE_TILT, BODY_PROFILE, boundaryOf, wallYaw } from './xr-room.mjs';
import { dedupe, SAME_THING_M } from './xr-hands.mjs';

/**
 * A copy of `xr-tablet.mjs` with extra controls in its array, imported for real: layout
 * is derived at load from `DEFAULT_CONTROLS`, so pushing onto it later changes nothing.
 * @param {string} lines  control literals, inserted at the TOP of the array
 * @param {string} tail   control literals, inserted at the BOTTOM of it
 * why: lessons/kit-xr-pick.md#test-module-with
 */
async function moduleWith(lines = '', tail = '') {
  const src = readFileSync(new URL('./xr-tablet.mjs', import.meta.url), 'utf8');
  const head = 'export const DEFAULT_CONTROLS = [\n';
  let marked = src.replace(head, `${head}${lines}`);
  if (tail) {
    // The array's own closing bracket, found from its opening one, not the file's first `];`.
    // why: lessons/kit-xr-pick.md#test-closing-bracket
    const at = marked.indexOf(head);
    const close = marked.indexOf('\n];\n', at);
    marked = `${marked.slice(0, close + 1)}${tail}${marked.slice(close + 1)}`;
  }
  const tmp = join(tmpdir(), `xr-tablet-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
  try {
    writeFileSync(tmp, marked);
    return { mod: await import(`file://${tmp}`), why: '' };
  } catch (e) { return { mod: null, why: `${e.name}: ${e.message}` }; }
  finally { try { rmSync(tmp); } catch { /* it may not have been written */ } }
}

/**
 * The tablet with `QUIT_CONTROL` appended, the only place the button kind still exists,
 * so its branches in layout, hit test, input and state stay graded.
 * why: lessons/kit-xr-pick.md#test-with-quit
 */
const WITH_QUIT = await moduleWith('', '  QUIT_CONTROL,\n');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' · ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' · ' + detail : ''}`); }
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
  // Catches an R/U swap the centre case cannot: a quad turned 90 degrees in yaw.
  // why: lessons/kit-xr-pick.md#test-yaw
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
  // Identity grip: the hand at the origin, its -Z along world -Z, nothing pre-rotated.
  // why: lessons/kit-xr-pick.md#test-pose
  const I = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1]);
  const M = holdM(I);
  const n = [M[8], M[9], M[10]];
  const gY = [I[4], I[5], I[6]];                 // across the handle, back at you
  const gnZ = [-I[8], -I[9], -I[10]];            // up the controller, the thumb
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const hM = Math.hypot(M[4], M[5], M[6]);
  const up = [M[4] / hM, M[5] / hM, M[6] / hM];

  // The regression read exactly 1.0 here (facing the ceiling); now sin(FACE_TILT).
  // why: lessons/kit-xr-pick.md#test-face-regression
  ok('the tablet does not face along the controller (the bug that did read exactly 1.0)',
     Math.abs(dot(n, gnZ)) < 0.5 && near(dot(n, gnZ), Math.sin(FACE_TILT), 1e-6),
     `its face against the controller's own axis: ${dot(n, gnZ).toFixed(4)} (the lean, sin ${(FACE_TILT * 180 / Math.PI).toFixed(0)}°), and it was 1.0000`);

  ok('...it faces ACROSS the handle, back at whoever is holding it',
     near(dot(n, gY), Math.cos(FACE_TILT), 1e-6),
     `${(Math.acos(Math.max(-1, Math.min(1, dot(n, gY)))) * 180 / Math.PI).toFixed(1)}° off square across the handle, which is the lean`);

  ok('...and its own top edge points up the controller, so it reads the right way up',
     dot(up, gnZ) > 0.9, `up against the thumb's direction: ${dot(up, gnZ).toFixed(4)}`);

  // Right-handed, or CULL_FACE hides the tablet: a negated column flips the winding.
  // why: lessons/kit-xr-pick.md#test-right-handed
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

  // An eye out along the tablet's own normal, looking back at it. The centre must read
  // 0.5, 0.5 and the distance must be the one asked for.
  // why: lessons/kit-xr-pick.md#test-eye
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

  // The tablet's bottom edge must clear the stand-in controller's head.
  // why: lessons/kit-xr-pick.md#test-clears-controller
  const topOfHead = Math.max(...BODY_PROFILE.map(([z]) => -z));
  const bottomEdge = Math.hypot(C[0], C[1] - 1, C[2]) - (TABLET.h / 2) * Math.cos(FACE_TILT);
  const gap = bottomEdge - topOfHead;
  ok('the tablet sits ON the controller: not buried in its head, not floating above it',
     gap > 0 && gap < 0.03,
     `${(gap * 1000).toFixed(1)} mm between its lower edge and the top of the head`
     + ' (it was -0.4 mm, inside, when the tablet grew by two thirds)');
}

// ── one physical thing, one stand-in ──────────────────────────────────────
{
  // The double controller as a Quest reported it: one hand twice under the same profile.
  // why: lessons/kit-xr-pick.md#test-double-controller
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

  // A hand over a controller on the same wrist: the controller wins.
  // why: lessons/kit-xr-pick.md#test-hand-over-controller
  const both = dedupe([
    at('I0', 'right', 'oculus-hand', 0.13, true),
    at('T1', 'right', 'meta-quest-touch-plus', 0.13),
  ]);
  ok('a hand and a controller on one wrist draw the controller, not both',
     both.kept.length === 1 && both.kept[0].profile === 'meta-quest-touch-plus',
     `kept ${both.kept.map((k) => k.where + ':' + k.profile).join(', ')}`);

  // Negative control: two real controllers, one per hand, both survive.
  // why: lessons/kit-xr-pick.md#test-two-controllers
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
  // why: lessons/kit-xr-pick.md#test-margins
  ok('the margins are not controls',
     controlAt(0.5, 0.99) === null && controlAt(0.5, 0.005) === null);

  // The track is inset by the tablet margin, so the ends are not at u 0 and u 1.
  // why: lessons/kit-xr-pick.md#test-slider-ends
  const L = TABLET.lane, W = TABLET.designW;
  const lo = valueFromU(0, c[0]), hi = valueFromU(1, c[0]);
  ok('dragging to either end of the track reaches the control\'s own ends',
     near(lo, c[0].min) && near(hi, c[0].max),
     `${lo} .. ${hi} against a declared ${c[0].min} .. ${c[0].max}`);

  // A share of the travel, not of the lane or the tablet (`slider.mjs`'s rule).
  // why: lessons/kit-xr-pick.md#test-share-of-travel
  const midU = (L.x + L.knobW / 2 + L.travel / 2) / W;
  ok('...and the middle of the TRAVEL is the middle of the range',
     near(valueFromU(midU, c[0]), (c[0].min + c[0].max) / 2),
     `${valueFromU(midU, c[0])} at u ${midU.toFixed(3)} · the middle of the TABLET (u 0.5) would read ${valueFromU(0.5, c[0])}`);

  // Negative control: a share of the lane would hang the knob `knobW` past the lane.
  // why: lessons/kit-xr-pick.md#test-ends-flush
  const endsFlush = Math.abs((L.x + L.travel) + L.knobW - (L.x + L.w)) < 1e-9;
  ok('the knob\'s two ends land flush inside the lane, neither short nor over',
     endsFlush && L.travel > 0 && L.travel < L.w,
     `travel ${L.travel} of a ${L.w} lane, knob ${L.knobW} · ${L.travel + L.knobW} back to ${L.w}`);

  // NEGATIVE CONTROL: past the end is clamped, not extrapolated.
  ok('a drag that runs off the end is clamped rather than extrapolated',
     valueFromU(-3, c[0]) === c[0].min && valueFromU(4, c[0]) === c[0].max);

  // The lane matches the shipped `.sld-lane` (96x34, knob 20), asserted rather than trusted.
  // why: lessons/kit-xr-pick.md#test-lane-proportions
  ok('the tablet\'s lane has the shipped control\'s proportions',
     Math.abs(L.w / L.h - 96 / 34) < 0.15 && near(L.knobW / L.h, 20 / 34, 1e-9),
     `${(L.w / L.h).toFixed(2)}:1 against 2.82:1 · knob ${(L.knobW / L.h).toFixed(3)} of the lane against 0.588`);

  // `HEAD_W` assumes a mono advance, so it is checked against the widest slider label.
  // Sliders only: a button's label is drawn inside the button.
  // why: lessons/kit-xr-pick.md#test-head-column
  const widest = Math.max(...c.filter((x) => !isButton(x)).map((x) => x.label.length));
  ok('the head column is wide enough for the longest label on it',
     TABLET.headW >= widest * TABLET.kit.labelPx * (MONO_ADV + TABLET.kit.labelTrack) - 1e-6,
     `${TABLET.headW.toFixed(0)} design px for ${widest} characters`);
}

// ── the way out, which is a button and not a slider ───────────────────────
// A way out must never fire unasked and must be able to fire; both are graded on the
// copy's module (`WITH_QUIT`), since the shipped one has no such row.
// why: lessons/kit-xr-pick.md#test-way-out
const QT = WITH_QUIT.mod;
const QCONTROLS = QT?.DEFAULT_CONTROLS ?? [];
const BTN_C = QCONTROLS.find(isButton) ?? null;
/** The middle of the button's own rectangle, in the tablet's u,v. */
const btnUV = () => {
  const i = QCONTROLS.indexOf(BTN_C);
  const top = QT.TABLET.rowsTop + i * QT.TABLET.rowH + (QT.TABLET.rowContent - QT.TABLET.btn.h) / 2;
  return { u: (QT.TABLET.btn.x + QT.TABLET.btn.w / 2) / QT.TABLET.designW,
           v: (top + QT.TABLET.btn.h / 2) / QT.TABLET.designH };
};
{
  ok('the shipped tablet has no way out on it any more, and the button kind is still gradable',
     !DEFAULT_CONTROLS.some(isButton) && !!BTN_C && BTN_C.key === QUIT_CONTROL.key
     && BTN_C.leaves === true,
     !QT ? `the copy would not load: ${WITH_QUIT.why}`
         : `shipped: [${DEFAULT_CONTROLS.map((c) => c.key).join(', ')}]`
           + ` · graded against a copy carrying "${BTN_C?.label}"`);

  const mid = btnUV();
  const at = QT.controlAt(mid.u, mid.v);
  ok('the last row of the tablet is the way out, and it is a button rather than a slider',
     !!at && at.control === BTN_C && isButton(at.control) && at.i === QCONTROLS.length - 1,
     at ? `${at.control.key} · "${at.control.label}" · held ${at.control.hold} ms` : 'nothing there');

  // Negative control: unlike a slider, the button does not own its whole row.
  // why: lessons/kit-xr-pick.md#test-button-row
  const i = QCONTROLS.indexOf(BTN_C);
  const top = QT.TABLET.rowsTop + i * QT.TABLET.rowH + (QT.TABLET.rowContent - QT.TABLET.btn.h) / 2;
  const vAt = (py) => py / QT.TABLET.designH;
  const above = QT.controlAt(mid.u, vAt(top - QT.TABLET.kit.btnRingOffset));
  const below = QT.controlAt(mid.u, vAt(top + QT.TABLET.btn.h + QT.TABLET.kit.rowGap / 2));
  const leftOf = QT.controlAt((QT.TABLET.btn.x / 2) / QT.TABLET.designW, mid.v);
  const rightOf = QT.controlAt((QT.TABLET.designW - QT.TABLET.btn.x / 2) / QT.TABLET.designW, mid.v);
  ok('...and only its own rectangle is it: not the ring\'s air, the gap, or the margins',
     above === null && below === null && leftOf === null && rightOf === null,
     `above ${above === null} · below ${below === null} · left ${leftOf === null} · right ${rightOf === null}`);

  // The button has to hold its own label at the stylesheet's own type size —
  // the same monospace assumption `HEAD_W` makes, checked against a different
  // box. The PAGE measures the real face against this number.
  ok('the button is wide enough for the words on it',
     btnLabelW(BTN_C) <= QT.TABLET.btn.w,
     `"${BTN_C.label}" needs ${btnLabelW(BTN_C).toFixed(0)} of ${QT.TABLET.btn.w} design px`);
}

// ── the hold, with no clock to wait for ───────────────────────────────────
// Two stub canvases; nothing calls `draw()`. Graded: which control a press took, what a
// clock does to it, what fires. Every call takes its timestamp, so nothing waits.
// why: lessons/kit-xr-pick.md#test-hold-stub
globalThis.document = {
  documentElement: {},
  createElement: () => ({ width: 0, height: 0, getContext: () => ({}) }),
};
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' });

// Every tablet below is the copy's: the shipped list has no button, so it would pass vacuously.
// why: lessons/kit-xr-pick.md#test-copy-tablets
{
  const hit = (uv) => ({ t: 0.3, u: uv.u, v: uv.v, front: true });
  const mid = btnUV();
  const SPAN = BTN_C.hold;
  const build = () => {
    let left = 0;
    const t = QT.createXRTablet({ ctx: { left: () => { left++; } } });
    return { t, fired: () => t.fired(), leftCount: () => left };
  };

  // A press is not a press-and-hold.
  // why: lessons/kit-xr-pick.md#test-press-not-hold
  {
    const { t, fired, leftCount } = build();
    t.press(hit(mid), 0);
    const onPress = fired().length;
    t.drag(hit(mid), SPAN * 0.6);
    const partWay = fired().length;
    ok('a press on the way out does nothing, and neither does most of the hold',
       onPress === 0 && partWay === 0 && leftCount() === 0 && t.hold()?.p > 0.5,
       `${(t.hold().p * 100).toFixed(0)}% of the way through ${SPAN} ms and nothing has happened`);

    // ...and the far side of the boundary: held to the end it fires, once.
    t.drag(hit(mid), SPAN);
    const went = fired();
    t.drag(hit(mid), SPAN * 3);            // still down, long past the end
    const again = fired();
    ok('...and held all the way it fires exactly once, however long you keep holding',
       went.length === 1 && went[0] === BTN_C && went[0].leaves === true
       && again.length === 0 && leftCount() === 1 && t.hold() === null,
       `fired ${went.length} at ${SPAN} ms, ${again.length} more at ${SPAN * 3} ms`);
  }

  // NEGATIVE CONTROL: letting go early. The abort that costs nothing to find.
  {
    const { t, fired, leftCount } = build();
    t.press(hit(mid), 0);
    t.drag(hit(mid), SPAN * 0.9);
    t.release(SPAN * 0.9);
    t.drag(hit(mid), SPAN * 5);            // the trigger is up; time cannot help
    ok('letting go at 90% of the hold does nothing at all',
       fired().length === 0 && leftCount() === 0 && t.hold() === null && t.holding() === false,
       'released at 90% and five spans later it still has not fired');
  }

  // Negative control: running off the button resets the hold, it does not pause it.
  // why: lessons/kit-xr-pick.md#test-hold-resets
  {
    const { t, fired, leftCount } = build();
    t.press(hit(mid), 0);
    t.drag(hit(mid), SPAN * 0.9);
    t.drag(null, SPAN * 0.95);             // the ray ran off the tablet
    const reset = t.hold();
    t.drag(hit(mid), SPAN * 1.0);          // back on, but only 50 ms in
    const back = t.hold();
    ok('running the ray off it resets the hold to zero rather than pausing it',
       reset?.p === 0 && reset.on === false && fired().length === 0 && leftCount() === 0
       && back.p < 0.2 && t.holding() === true,
       `off it: ${(reset.p * 100).toFixed(0)}% · back on, ${SPAN} ms after the press, it reads ${(back.p * 100).toFixed(0)}% and not 100`);
  }

  // Negative control: `applyAll` at session start must skip buttons, or every session quits.
  // why: lessons/kit-xr-pick.md#test-apply-all
  {
    let dots = null, left = 0;
    const t = QT.createXRTablet({ ctx: { room: { setGrid: ({ alpha }) => { dots = alpha; } }, left: () => { left++; } } });
    t.applyAll();
    ok('opening a session pushes the sliders and does NOT fire the way out',
       dots !== null && left === 0 && t.fired().length === 0,
       `the dots went to ${dots} and the way out fired ${left} times`);
  }

  // A failed hold logs which of three happened: let go early, ray off it, press never landed.
  // why: lessons/kit-xr-pick.md#test-three-causes
  {
    const { t } = build();
    t.press(hit(mid), 0);
    const said = t.notes();
    t.drag(hit(mid), SPAN * 0.4);
    t.release(SPAN * 0.4);
    const after = t.notes();
    ok('the tablet says in words what became of a hold, and drains what it said',
       said.length === 1 && /holding/.test(said[0]) && /800 ms/.test(said[0])
       && after.length === 1 && /40%/.test(after[0]) && t.notes().length === 0,
       `${said[0]} || ${after[0]}`);
  }
}

// ── and the claim this file is here to check ──────────────────────────────
{
  // A second control of an existing kind is one line: a copy with one line added grows
  // by exactly one row, the row hit-tests, and the fingerprint counts three.
  // why: lessons/kit-xr-pick.md#test-one-line
  const line = "  { key: 'probe', label: 'probe', unit: 'x', min: 0, max: 10, value: 5, apply: () => {} },\n";
  const { mod: two, why } = await moduleWith(line);

  const grew = two && two.TABLET.designH === TABLET.designH + TABLET.rowH;
  // The second row of the copy: inserted at the top, so the shipped control moves down.
  // why: lessons/kit-xr-pick.md#test-row-moves
  const rowMid = two
    ? two.controlAt(0.5, (TABLET.rowsTop + TABLET.rowH + TABLET.rowContent / 2) / two.TABLET.designH)
    : null;
  ok('a second control of a kind that already exists really is ONE LINE',
     !!two && two.TABLET.controls.length === DEFAULT_CONTROLS.length + 1 && grew
     && two.TABLET.fingerprint.includes(`${DEFAULT_CONTROLS.length + 1} control(s)`)
     && two.TABLET.fingerprint.includes('probe 0..10x')
     && rowMid?.control?.key === DEFAULT_CONTROLS[0].key
     && Math.abs(two.TABLET.lane.w - TABLET.lane.w) < 1e-9,
     two
       ? `${two.TABLET.controls.length} controls · ${TABLET.designH} -> ${two.TABLET.designH} design px`
         + ` · the lane is still ${two.TABLET.lane.w} · ${two.TABLET.fingerprint.match(/\[[^\]]*\]/)?.[0]}`
       : `the copy would not load: ${why}`);
}

// ── which of your room's surfaces get dots ────────────────────────────────
// The grid writes no depth, so every surface handed to it superimposes. The list is
// the eleven surfaces a Quest 3 reported.
// why: lessons/kit-xr-pick.md#test-surfaces
{
  const q = (label, y, vertical) => ({ label, y, vertical });
  const room = [
    q('floor', 0.00, false), q('ceiling', 2.45, false),
    q('wall', 1.2, true), q('wall', 1.2, true), q('wall', 1.2, true), q('wall', 1.2, true),
    q('door', 1.0, true), q('window', 1.3, true),
    q('bed', 0.52, false), q('shelf', 1.10, false), q('shelf', 1.55, false),
  ];
  const shell = boundaryOf(room);
  const flat = shell.filter((x) => !x.vertical);
  ok('dots go on the room, not on what is standing in it',
     shell.length === 8 && flat.length === 2
     && flat.some((x) => x.label === 'floor') && flat.some((x) => x.label === 'ceiling')
     && !shell.some((x) => ['bed', 'shelf'].includes(x.label)),
     `${room.length} surfaces in, ${shell.length} dotted: [${shell.map((x) => x.label).join(', ')}]`);

  // Negative control: exactly one horizontal surface may be the ground.
  // why: lessons/kit-xr-pick.md#test-one-ground
  const twoLow = boundaryOf([q('other', 0.00, false), q('other', 0.45, false)]);
  ok('...and only ONE surface is ever the ground, even with nothing labelled',
     twoLow.length === 1 && twoLow[0].y === 0,
     `two unlabelled horizontals at 0.00 and 0.45 m · kept the one at ${twoLow[0].y.toFixed(2)}`);

  // Negative control: a runtime that classifies nothing still gets its surfaces drawn.
  // why: lessons/kit-xr-pick.md#test-blind-runtime
  const blind = [{ label: 'unlabelled', y: 0, vertical: false }];
  ok('...and a runtime that says nothing useful still gets its surfaces drawn',
     boundaryOf(blind).length === 1 && boundaryOf([]).length === 0,
     'one unlabelled surface stays one; an empty list stays empty');
}

// ── which way round your room is ──────────────────────────────────────────
// The angle a brick turns to meet a real wall: bricks are square to the reference
// space, and the room is not.
// why: lessons/kit-xr-pick.md#test-wall-yaw
{
  const DEG = Math.PI / 180;
  /** A wall whose normal points at `deg`, `area` square metres of it. */
  const wall = (deg, area = 6) => ({
    vertical: true, size: [area / 2, 2], n: [Math.sin(deg * DEG), 0, Math.cos(deg * DEG)],
  });
  const four = (deg) => [wall(deg), wall(deg + 90), wall(deg + 180), wall(deg + 270)];

  const got = wallYaw(four(17));
  ok('four walls of a room turned 17° say the room is turned 17°',
     Math.abs(got / DEG - 17) < 0.01,
     `${(got / DEG).toFixed(3)}° from four normals 90° apart`);

  // Negative control: four walls 90 degrees apart cancel in a plain mean; fold by four.
  // why: lessons/kit-xr-pick.md#test-fold-by-four
  const square = wallYaw(four(0));
  ok('...and a room square to the headset asks for no turn at all',
     Math.abs(square) < 1e-9, `${(square / DEG).toFixed(6)}°`);

  // Negative control: no walls measured means no turn.
  // why: lessons/kit-xr-pick.md#test-no-walls
  ok('...and with nothing measured it asks for no turn either',
     wallYaw([]) === 0 && wallYaw([{ vertical: false, n: [0, 1, 0], size: [4, 4] }]) === 0,
     'an empty list and a floor both read 0');

  // Area is the weight: an 8 m2 wall at 20 degrees outvotes a 0.2 m2 sliver at 40.
  // why: lessons/kit-xr-pick.md#test-area-weight
  const mixed = wallYaw([{ ...wall(20), size: [4, 2] }, { ...wall(40), size: [0.1, 2] }]);
  ok('...and a big wall outvotes a sliver beside a door',
     Math.abs(mixed / DEG - 20) < 1.2 && Math.abs(mixed / DEG - 30) > 8,
     `8 m² at 20° and 0.2 m² at 40° give ${(mixed / DEG).toFixed(2)}°, and an unweighted mean would give 30°`);
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
