// demo/shell/knob-test.mjs — the knob's arithmetic, without a browser.
//
// 🔴 WHAT THIS FILE CAN AND CANNOT SEE, SAID AT THE TOP SO NOBODY READS IT AS
// COVERAGE IT DOES NOT HAVE. `createKnob` needs a `document`, so the dial, the
// drag and the reserved width are graded on `/kit/`. What is graded here is the
// two pure functions the stepped knob is built out of, plus the DRAG LOOP
// rewritten as arithmetic, which is where the only real bug in this change
// lives and which no screenshot would ever show.
//
// 🔴 THE BUG THIS EXISTS TO CATCH, AND IT IS THE OBVIOUS IMPLEMENTATION. The
// pointer moves a knob by `span / SWEEP` a pixel. On a one to eight knob that
// is 0.039, so every single pixel rounds straight back to where it started, and
// the continuous knob's `acc = 0` after each move then throws that pixel away.
// **The knob never moves, at any speed, and nothing about it looks wrong.**
// `driveDrag` below is the same three lines the component runs, so a regression
// there goes red here in milliseconds instead of being found by somebody
// dragging a dial and giving up.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { snapTo, knobPlaces } from './knob.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'knob.mjs'), 'utf8');
/**
 * The same file with every comment taken out.
 *
 * 🔴 AN ABSENCE ASSERTED OVER THE WHOLE FILE GRADES THE PROSE. This one went red
 * on its first run for the best possible reason: the comment above the line it
 * grades says *"Writing `num.style.minWidth` from here would be a rule nothing
 * can override"*, and a check reading the raw source found that sentence and
 * concluded the defect was present. The same trap is live in
 * `instrument-test.mjs`, where two asserts match comment text and pass.
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

  /* ⚠️ THE SIX PLACES ARE NOT TIDINESS. Without them this is
     3.0000000000000004, which prints a decimal nobody asked for and compares
     unequal to the step above it. */
  is('a fractional step does not leak floating point into the value',
    snapTo(2.96, { min: 1, max: 4, step: 0.1 }) === 3
    && snapTo(-0.34, { min: -1, max: 1, step: 0.05 }) === -0.35,
    `2.96 became ${snapTo(2.96, { min: 1, max: 4, step: 0.1 })}, `
    + `-0.34 became ${snapTo(-0.34, { min: -1, max: 1, step: 0.05 })}`);

  /* 🔴 THE NEGATIVE CONTROL: with no step the same call is the ends and nothing
     else, which is what every knob on the site had before today. Without this,
     a snap accidentally applied to every knob would satisfy the two asserts
     above and silently quantise thirty pages. */
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

  /* 🔴 THE CASE A BLANKET "NO DECIMALS" WOULD HAVE DESTROYED. `/muta/` has
     three attenuverters running -1 to 1, and at 0 places they would show -1, 0
     and 1 and nothing else, which is a three position switch. */
  is('a -1 to 1 attenuverter keeps two places, which whole numbers would destroy',
    knobPlaces({ min: -1, max: 1 }) === 2 && knobPlaces({ min: 0, max: 1 }) === 2,
    `-1..1 gets ${knobPlaces({ min: -1, max: 1 })} places, 0..1 gets ${knobPlaces({ min: 0, max: 1 })}`);

  is('a stepped knob prints its step’s own decimals, the way a slider infers them',
    knobPlaces({ min: 1, max: 8, step: 1 }) === 0
    && knobPlaces({ min: 0, max: 1, step: 0.25 }) === 2
    && knobPlaces({ min: 0, max: 1, step: 0.125 }) === 3,
    'step 1 gets 0, step 0.25 gets 2, step 0.125 gets 3');

  /* ⚠️ THE PLACES ARE WHAT RESERVES THE WIDTH, so the widest string a knob can
     print is the wider of its two ends AT THIS PRECISION. A minus sign and a
     point are each one advance in a monospaced face. */
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
 * The three lines `pointermove` runs, as arithmetic.
 *
 * ⚠️ IT IS A COPY AND IT IS SUPPOSED TO BE ONE. Grading the component's own
 * handler would need a `document`, a pointer capture and a stream of synthetic
 * events, and what is worth grading is the ACCOUNTING, which is two lines. The
 * assert below pins the component's source against it so the copy cannot drift
 * quietly.
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
  /* 🔴 THE WHOLE REASON THIS FILE EXISTS. Thirty pixels of hand on a one to
     eight knob is more than a step, and the obvious implementation returns the
     value it started at. */
  const slow = driveDrag({ min: 1, max: 8, step: 1, from: 1, pixels: 30 });
  is('a stepped knob moves under a slow drag, one pixel at a time',
    slow > 1, `30 pixels from 1 reached ${slow}`);

  /* The travel is `SWEEP` pixels for the whole range whatever the range is, so
     a full sweep from the bottom lands on the top and not short of it. */
  const full = driveDrag({ min: 1, max: 8, step: 1, from: 1, pixels: SWEEP });
  is('a full sweep crosses the whole travel, landing on the last step',
    full === 8, `${SWEEP} pixels from 1 reached ${full}`);

  /* ⚠️ HALF A STEP IS WHERE IT TURNS OVER, which is `snapTo`'s rule arriving
     through the accumulator rather than through a single `set`. */
  const eighth = Math.round(SWEEP / 7);
  const one = driveDrag({ min: 1, max: 8, step: 1, from: 1, pixels: Math.round(eighth * 0.4) });
  const two = driveDrag({ min: 1, max: 8, step: 1, from: 1, pixels: Math.round(eighth * 0.6) });
  is('less than half a step holds, more than half a step moves one',
    one === 1 && two === 2,
    `${Math.round(eighth * 0.4)} px held at ${one}, ${Math.round(eighth * 0.6)} px reached ${two}`);

  /* 🔴 THE NEGATIVE CONTROL, AND IT IS THE ONE THAT PROTECTS THIRTY PAGES. On a
     continuous knob the same loop must be byte for byte the old behaviour: the
     accumulator lands on exactly 0 every time, so 90 pixels of travel is
     exactly half the range and no residue is carried anywhere. */
  const half = driveDrag({ min: 0, max: 127, from: 0, pixels: SWEEP / 2 });
  is('NEGATIVE CONTROL: with no step the same loop is exactly the travel it always was',
    Math.abs(half - 127 / 2) < 1e-9,
    `${SWEEP / 2} pixels of a ${SWEEP} px travel reached ${half}, against ${127 / 2} expected`);

  /* ⚠️ AND AT THE END OF THE TRAVEL THE RESIDUE IS DROPPED RATHER THAN BANKED.
     `hold` caps `want` at the end, so `want` and `got` are both the end and the
     accumulator lands on 0. A banked overshoot would mean a knob pushed hard
     into its top needs the same push back before it moves at all. */
  const pushed = driveDrag({ min: 0, max: 127, from: 0, pixels: SWEEP * 2 });
  const back = driveDrag({ min: 0, max: 127, from: 127, pixels: -1 });
  is('a knob pushed past its end banks no overshoot, so one pixel back moves it',
    pushed === 127 && back < 127,
    `${SWEEP * 2} px reached ${pushed}, and one pixel back from the top gives ${back.toFixed(3)}`);
}

// ── the component really runs this arithmetic ──────────────────────────────

{
  /* 🔴 A PURE FUNCTION GRADED HERE AND NOT CALLED THERE IS A DECORATION. Same
     shape as `instrument-test.mjs`'s absence assert, and the same reason. */
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

  /* ⚠️ THE INVISIBLE HAND COUNTS REAL STEPS WHEN THERE ARE ANY. `hand-drive.mjs`
     refuses a hand under about thirty steps, and reporting SWEEP would have
     talked it out of a refusal that is correct on an eight voice knob. */
  is('a stepped knob tells the invisible hand its real step count, not the travel',
    /const steps = stp \? Math\.max\(1, Math\.round\(span \/ stp\)\) : SWEEP;/.test(src),
    'steps is span / step when there is a step');

  is('a step wider than the travel, or no wider than nothing, is refused at build time',
    /!\(stp > 0 && stp <= span\)/.test(src)
    && /throw new Error\(`a knob's step is above 0/.test(src),
    'a switch wearing a dial is said in front of the author');

  /* 🔴 THE WIDTH IS A CUSTOM PROPERTY, NEVER THE PROPERTY. A component writing
     `num.style.minWidth` writes a rule nothing can override, which is the
     defect `video-panel.mjs` shipped with its `aspect` option. */
  is('the reserved width is published as a custom property rather than written as one',
    /setProperty\('--knob-num-w'/.test(code) && !/\.style\.minWidth/.test(code),
    '--knob-num-w, read by .pos-knob-v in shell.css, and no inline min-width in the code');
}

console.log(`\n${ok} ok, ${bad} failed`);
if (bad) process.exit(1);
