// demo/shell/param-knobs-test.mjs: the knob row's arithmetic, with no browser.
//
//   node demo/shell/param-knobs-test.mjs
//
// 🔴 WHAT THIS CAN AND CANNOT GRADE. `createParamKnobs` needs a `document`, so
// the row, the rebuild and the value kept across a recompile are graded on
// `/kit/`, `/collide/` and `/fau/`. What is graded here is `mapSpec`,
// `unmapSpec` and `placesFor`, against numbers worked out by hand from
// `ControlSpec` and its warps in SuperCollider's `Spec.sc` (read at 19954900),
// which is a different source from this file's own arithmetic.
//
// 🔴 NEGATIVE CONTROLS, per this directory's convention: a linear map passes
// every check at the ends of an exponential range, because both warps agree
// there, so the middle is what separates them. MEASURED 2026-09-30, 14 ok,
// then three sabotaged copies of the module (`PK_MODULE=<path>`):
//
//   `exp` mapped as `lin`                      2 red, the middle and the round trip
//   the step never applied                     1 red, the step check
//   places from the linear rule on `exp`       1 red, the release's 0.05

const M = await import(process.env.PK_MODULE || './param-knobs.mjs');
const { mapSpec, unmapSpec, placesFor } = M;

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? `  (${detail})` : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `  (${detail})` : ''}`); }
};
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

const rel = { min: 0.05, max: 6, warp: 'exp', step: 0 };
ok('an exponential spec maps its ends to its ends',
  near(mapSpec(0, rel), 0.05) && near(mapSpec(1, rel), 6), `${mapSpec(0, rel)}, ${mapSpec(1, rel)}`);
// ExponentialWarp.map: (max / min) ** x * min, so the middle is the geometric mean.
ok('NEGATIVE CONTROL: and its middle is the geometric mean, sqrt(0.05 * 6) = 0.5477, where a linear map would say 3.025',
  near(mapSpec(0.5, rel), Math.sqrt(0.05 * 6)), mapSpec(0.5, rel).toFixed(4));
ok('NEGATIVE CONTROL: 1.5 s, the Pad\'s release, sits at 0.7103 of the travel, and back',
  near(unmapSpec(1.5, rel), Math.log(30) / Math.log(120), 1e-9) && near(mapSpec(unmapSpec(1.5, rel), rel), 1.5, 1e-9),
  unmapSpec(1.5, rel).toFixed(4));
ok('unmap holds a value outside the range at its end, which is ControlSpec.unmap\'s clip',
  unmapSpec(9, rel) === 1 && unmapSpec(0.001, rel) === 0);

const lin = { min: 100, max: 8000, warp: 'lin', step: 1 };
ok('a linear spec maps its middle to its middle', mapSpec(0.5, lin) === 4050);
ok('NEGATIVE CONTROL: and a step of 1 lands on whole numbers, which is .round(step)',
  mapSpec(0.3333, lin) === Math.round(100 + 0.3333 * 7900), String(mapSpec(0.3333, lin)));
const rev = { min: 1, max: -1, warp: 'lin' };
ok('a reversed range runs backwards, as ControlSpec lets it', mapSpec(0, rev) === 1 && mapSpec(1, rev) === -1
  && near(unmapSpec(0.5, rev), 0.25));

// CurveWarp with curve -4 on 0..1: grow = e^-4, a = 1 / (1 - grow), map(0.5) = (0 + a) - a * grow ** 0.5.
const curve = { min: 0, max: 1, warp: -4 };
const g = Math.exp(-4), a = 1 / (1 - g);
ok('a curve number is CurveWarp: -4 puts the middle of the travel at 0.8808',
  near(mapSpec(0.5, curve), a - a * Math.sqrt(g)) && near(unmapSpec(mapSpec(0.3, curve), curve), 0.3),
  mapSpec(0.5, curve).toFixed(4));
ok('sin and cos are SineWarp and CosineWarp: sin(0.25pi) and 0.5 - cos(0.5pi) / 2 at the middle',
  near(mapSpec(0.5, { min: 0, max: 1, warp: 'sin' }), Math.SQRT1_2)
    && near(mapSpec(0.5, { min: 0, max: 1, warp: 'cos' }), 0.5)
    && near(unmapSpec(mapSpec(0.2, { min: 0, max: 1, warp: 'sin' }), { min: 0, max: 1, warp: 'sin' }), 0.2));

ok('NEGATIVE CONTROL: the release prints two places, 0.05 and 6.00, and not the one place the linear rule gives that range',
  placesFor(rel) === 2, String(placesFor(rel)));
ok('a cutoff from 100 to 8000 on an exponential warp prints whole numbers',
  placesFor({ min: 100, max: 8000, warp: 'exp' }) === 0);
ok('a step decides the places by itself', placesFor({ min: 0, max: 1, step: 0.01 }) === 2
  && placesFor(lin) === 0);
ok('and a linear 0 to 1 prints what knob.mjs would print for it', placesFor({ min: 0, max: 1 }) === 2);
ok('every place count is decided once from the spec, so the same spec gives the same answer',
  placesFor(rel) === placesFor({ ...rel }));

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
