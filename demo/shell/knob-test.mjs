// demo/shell/knob-test.mjs: the knob's arithmetic, without a browser. `createKnob` needs a
// `document` and is graded on `/kit/`; here, the two pure functions and the drag loop as
// arithmetic, where a stepped knob that never moves would otherwise go unseen.
// why: lessons/kit-knob.md#test-header

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { snapTo, knobPlaces, easeOut, RECEIVE_GLIDE_MS } from './knob.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'knob.mjs'), 'utf8');
/**
 * The same file with every comment taken out, so an absence assert grades code, not prose.
 * why: lessons/kit-knob.md#test-code
 */
const code = src.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');

let ok = 0, bad = 0;
const is = (what, cond, detail) => {
  if (cond) { ok++; console.log(`  ok   ${what}${detail ? ` · ${detail}` : ''}`); }
  else { bad++; console.log(`  FAIL ${what} · ${detail}`); }
};

/** The travel in pixels, read off the component rather than typed here. */
const SWEEP = Number(src.match(/const SWEEP = (\d+)/)?.[1]);

// ── the snap ───────────────────────────────────────────────────────────────

{
  const o = { min: 1, max: 8, step: 1 };
  const got = [1.2, 1.6, 4.49, 4.5, 7.9, 0, 99].map((n) => snapTo(n, o));
  is('a stepped knob lands only on whole steps, and never outside its ends',
    JSON.stringify(got) === JSON.stringify([1, 2, 4, 5, 8, 1, 8]),
    `1.2 1.6 4.49 4.5 7.9 0 99 became ${got.join(' ')}`);

  // Without the six places this is 3.0000000000000004.
  // why: lessons/kit-knob.md#test-fraction
  is('a fractional step does not leak floating point into the value',
    snapTo(2.96, { min: 1, max: 4, step: 0.1 }) === 3
    && snapTo(-0.34, { min: -1, max: 1, step: 0.05 }) === -0.35,
    `2.96 became ${snapTo(2.96, { min: 1, max: 4, step: 0.1 })}, `
    + `-0.34 became ${snapTo(-0.34, { min: -1, max: 1, step: 0.05 })}`);

  // Negative control: with no step the call is the ends and nothing else, so a snap applied
  // to every knob would go red here.
  // why: lessons/kit-knob.md#test-no-step
  const free = [1.2, 4.49, 7.9, 99].map((n) => snapTo(n, { min: 1, max: 8 }));
  is('NEGATIVE CONTROL: with no step nothing is rounded, only held inside the ends',
    JSON.stringify(free) === JSON.stringify([1.2, 4.49, 7.9, 8]),
    `1.2 4.49 7.9 99 stayed ${free.join(' ')}`);
}

// ── how many decimals the number is printed at ─────────────────────────────

{
  is('a 0 to 127 knob prints whole numbers, because its smallest move is 0.71',
    knobPlaces({ min: 0, max: 127 }) === 0,
    `${(127 / SWEEP).toFixed(4)} per pixel over a ${SWEEP} px travel, so 0 places`);

  // At 0 places a -1 to 1 attenuverter would show only -1, 0 and 1.
  // why: lessons/kit-knob.md#test-attenuverter
  is('a -1 to 1 attenuverter keeps two places, which whole numbers would destroy',
    knobPlaces({ min: -1, max: 1 }) === 2 && knobPlaces({ min: 0, max: 1 }) === 2,
    `-1..1 gets ${knobPlaces({ min: -1, max: 1 })} places, 0..1 gets ${knobPlaces({ min: 0, max: 1 })}`);

  is('a stepped knob prints its step’s own decimals, the way a slider infers them',
    knobPlaces({ min: 1, max: 8, step: 1 }) === 0
    && knobPlaces({ min: 0, max: 1, step: 0.25 }) === 2
    && knobPlaces({ min: 0, max: 1, step: 0.125 }) === 3,
    'step 1 gets 0, step 0.25 gets 2, step 0.125 gets 3');

  // The widest string is the wider end at this precision; minus and point are one advance each.
  // why: lessons/kit-knob.md#test-widest
  const widest = (o) => Math.max(...[o.min, o.max]
    .map((n) => n.toFixed(knobPlaces(o)).length));
  is('the reserved width is the wider end at the chosen precision, sign and point included',
    widest({ min: 0, max: 127 }) === 3 && widest({ min: -1, max: 1 }) === 5
    && widest({ min: 1, max: 8, step: 1 }) === 1,
    `0..127 reserves 3, -1..1 reserves 5 (-1.00), 1..8 by ones reserves 1`);

  is('NEGATIVE CONTROL: the count is capped, so no range asks for more than four places',
    knobPlaces({ min: 0, max: 0.00001 }) === 4 && knobPlaces({ min: 0, max: 1e6 }) === 0,
    `a 0.00001 range gets ${knobPlaces({ min: 0, max: 0.00001 })}, `
    + `a million gets ${knobPlaces({ min: 0, max: 1e6 })}`);
}

// ── the drag, which is the loop snapping breaks ────────────────────────────

/**
 * The three lines `pointermove` runs, as arithmetic. A copy on purpose; an assert below
 * pins the component's source against it so it cannot drift.
 * why: lessons/kit-knob.md#test-drivedrag
 */
function driveDrag({ min, max, step = 0, from, pixels, each = 1 }) {
  const span = max - min;
  const per = span / SWEEP;
  let v = snapTo(from, { min, max, step });
  let acc = 0;
  for (let i = 0; i < Math.abs(pixels); i++) {
    acc += Math.sign(pixels) * each;
    if (Math.abs(acc) < 0.001) continue;
    const want = Math.min(max, Math.max(min, v + acc * per));
    const got = snapTo(want, { min, max, step });
    acc = (want - got) / per;
    v = got;
  }
  return v;
}

{
  // Thirty pixels on a one to eight knob is more than a step; the obvious code returns the start.
  // why: lessons/kit-knob.md#test-slow
  const slow = driveDrag({ min: 1, max: 8, step: 1, from: 1, pixels: 30 });
  is('a stepped knob moves under a slow drag, one pixel at a time',
    slow > 1, `30 pixels from 1 reached ${slow}`);

  /* The travel is `SWEEP` pixels for the whole range whatever the range is, so
     a full sweep from the bottom lands on the top and not short of it. */
  const full = driveDrag({ min: 1, max: 8, step: 1, from: 1, pixels: SWEEP });
  is('a full sweep crosses the whole travel, landing on the last step',
    full === 8, `${SWEEP} pixels from 1 reached ${full}`);

  // Half a step is where it turns over, `snapTo`'s rule arriving through the accumulator.
  // why: lessons/kit-knob.md#test-half-step
  const eighth = Math.round(SWEEP / 7);
  const one = driveDrag({ min: 1, max: 8, step: 1, from: 1, pixels: Math.round(eighth * 0.4) });
  const two = driveDrag({ min: 1, max: 8, step: 1, from: 1, pixels: Math.round(eighth * 0.6) });
  is('less than half a step holds, more than half a step moves one',
    one === 1 && two === 2,
    `${Math.round(eighth * 0.4)} px held at ${one}, ${Math.round(eighth * 0.6)} px reached ${two}`);

  // Negative control: a continuous knob's accumulator lands on exactly 0, so 90 px is exactly
  // half the range.
  // why: lessons/kit-knob.md#test-continuous
  const half = driveDrag({ min: 0, max: 127, from: 0, pixels: SWEEP / 2 });
  is('NEGATIVE CONTROL: with no step the same loop is exactly the travel it always was',
    Math.abs(half - 127 / 2) < 1e-9,
    `${SWEEP / 2} pixels of a ${SWEEP} px travel reached ${half}, against ${127 / 2} expected`);

  // At the end of the travel the residue is dropped, not banked, or a knob pushed into its top
  // needs the same push back before it moves.
  // why: lessons/kit-knob.md#test-pushed
  const pushed = driveDrag({ min: 0, max: 127, from: 0, pixels: SWEEP * 2 });
  const back = driveDrag({ min: 0, max: 127, from: 127, pixels: -1 });
  is('a knob pushed past its end banks no overshoot, so one pixel back moves it',
    pushed === 127 && back < 127,
    `${SWEEP * 2} px reached ${pushed}, and one pixel back from the top gives ${back.toFixed(3)}`);
}

// ── the component really runs this arithmetic ──────────────────────────────

{
  // A pure function graded here and not called there is a decoration.
  // why: lessons/kit-knob.md#test-export
  is('the component snaps through the exported function rather than its own copy',
    /return snapTo\(n, \{ min, max, step: stp \}\)/.test(src)
    && /const dp = knobPlaces\(/.test(src),
    'clamp() is snapTo and dp is knobPlaces');

  is('the drag spends the accumulator by what the value moved, rather than zeroing it',
    /acc = \(want - got\) \/ per;/.test(src) && !/\n\s*acc = 0;\s*\n\s*\}\);/.test(src),
    'acc keeps whatever the snap ate');

  /* The wheel and the arrow keys both have a floor of one step, or the control
     `step` was built for has two inert input devices. */
  is('the wheel and the arrow keys both have a floor of one step',
    /Math\.max\(\(span \/ SWEEP\) \* \(e\.shiftKey \? FINE : 1\) \* 6, stp\)/.test(src)
    && /const one = stp \|\| Math\.max\(/.test(src),
    'the wheel takes Math.max(..., stp) and the keys take stp || the old amount');

  // The invisible hand counts real steps: `hand-drive.mjs` refuses under about thirty.
  // why: lessons/kit-knob.md#test-hand-steps
  is('a stepped knob tells the invisible hand its real step count, not the travel',
    /const steps = stp \? Math\.max\(1, Math\.round\(span \/ stp\)\) : SWEEP;/.test(src),
    'steps is span / step when there is a step');

  is('a step wider than the travel, or no wider than nothing, is refused at build time',
    /!\(stp > 0 && stp <= span\)/.test(src)
    && /throw new Error\(`a knob's step is above 0/.test(src),
    'a switch wearing a dial is said in front of the author');

  // The width is a custom property, never `num.style.minWidth`, which nothing could override.
  // why: lessons/kit-knob.md#test-width
  is('the reserved width is published as a custom property rather than written as one',
    /setProperty\('--knob-num-w'/.test(code) && !/\.style\.minWidth/.test(code),
    '--knob-num-w, read by .pos-knob-v in shell.css, and no inline min-width in the code');
}

// ── a value from somewhere else ──
// why: lessons/kit-knob.md#test-receive-section
{
  // `receive` sends nothing; graded on its body with comments stripped.
  // why: lessons/kit-knob.md#test-receive
  const start = code.indexOf('function receive(');
  let depth = 0, end = start;
  for (let i = code.indexOf(') {', start) + 2; i < code.length; i++) { if (code[i] === '{') depth++; else if (code[i] === '}' && --depth === 0) { end = i; break; } }
  const fn = code.slice(start, end + 1);
  is('receive exists and never calls onInput or onChange, so nothing it draws is sent',
    start > 0 && fn.length > 200 && !/onInput\(|onChange\(/.test(fn), `${fn.length} characters of body`);
  is('NEGATIVE: and the same test does find the call in a drag, so it can fail',
    /onInput\(v, src\)/.test(code), 'set() calls onInput(v, src)');
  is('receive steps aside while a person is dragging or has just moved it',
    /if \(!force && \(dragging \|\| now\(\) - userAt < RECEIVE_HOLD_MS\)\)/.test(fn), 'held off and counted as ignored');
  const pts = [0, 0.25, 0.5, 0.75, 1].map(easeOut);
  is('the glide eases out, starts at 0, ends at 1 and never goes back',
    pts[0] === 0 && pts[4] === 1 && pts.every((p, i) => i === 0 || p > pts[i - 1]) && pts[1] > 0.25,
    pts.map((p) => p.toFixed(3)).join(' '));
  is('the glide is short enough to read as a turn and not a wait',
    RECEIVE_GLIDE_MS >= 120 && RECEIVE_GLIDE_MS <= 200, `${RECEIVE_GLIDE_MS} ms`);
  // NEGATIVE: a forced value mid-drag ends the drag through the lift's own path.
  // `dragging = false` alone left pointerup returning early: capture held, hand parked.
  is('a forced value mid-drag ends the drag as a lift does, releasing capture and resuming the hand',
    /if \(dragging\) endDrag\(dragId\)/.test(fn) && !/dragging = false/.test(fn)
    && /releasePointerCapture\(id\)[\s\S]*handApi\?\.resume\(\)/.test(code.slice(code.indexOf('function endDrag(id)'), code.indexOf('const stop ='))),
    'receive calls endDrag');
}

console.log(`\n${ok} ok, ${bad} failed`);
if (bad) process.exit(1);
