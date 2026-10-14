// demo/shell/range-slider-test.mjs: the two handle arithmetic, no browser (node demo/shell/range-slider-test.mjs).
// `createRangeSlider` is never called here: band pixels, the two grid items, the two tab stops
// and the reused lane are asserted on /kit/.
// why: lessons/kit-range-slider.md#test-header

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nearestHandle, limitsFor, clampPair, spanPixels, MIN_GAP }
  from './range-slider.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
function ok(what, cond, detail = '') {
  if (cond) { pass++; console.log(`  ok   ${what}${detail ? `  ${detail}` : ''}`); return; }
  fail++;
  console.log(`  FAIL ${what}${detail ? `  ${detail}` : ''}`);
}

// ── which handle a press takes hold of ─────────────────────────────────────
ok('a press nearer the start takes the start, and nearer the end takes the end',
  nearestHandle(0.1, 0.2, 0.8) === 'from' && nearestHandle(0.9, 0.2, 0.8) === 'to'
  && nearestHandle(0.3, 0.2, 0.8) === 'from' && nearestHandle(0.7, 0.2, 0.8) === 'to');

// |0.5 - 0.8| is 0.30000000000000004, so an exact tie answered differently by position; `TIE` fixes it.
// why: lessons/kit-range-slider.md#test-tie
ok('a press halfway between the two answers the same way wherever they are standing',
  nearestHandle(0.5, 0.2, 0.8) === nearestHandle(0.5, 0.4, 0.6)
  && nearestHandle(0.5, 0.2, 0.8) === 'to',
  `0.2 and 0.8 gave ${nearestHandle(0.5, 0.2, 0.8)}, `
  + `0.4 and 0.6 gave ${nearestHandle(0.5, 0.4, 0.6)}`);

ok('NEGATIVE CONTROL: an exact tie test is what those two distances break',
  Math.abs(0.5 - 0.2) !== Math.abs(0.5 - 0.8)
  && Math.abs(0.5 - 0.4) === Math.abs(0.5 - 0.6),
  `${Math.abs(0.5 - 0.2)} against ${Math.abs(0.5 - 0.8)}`);

// A collapsed pair must open in both directions: left press takes the start, right the end.
// why: lessons/kit-range-slider.md#test-collapsed
ok('a collapsed pair opens in BOTH directions, which is what the tie rule is for',
  nearestHandle(0.1, 0.5, 0.5) === 'from' && nearestHandle(0.9, 0.5, 0.5) === 'to',
  'left of a stacked pair grabs the start, right of it grabs the end');

ok('NEGATIVE CONTROL: a rule that always answered the same handle would fail the line above',
  nearestHandle(0.1, 0.5, 0.5) !== nearestHandle(0.9, 0.5, 0.5));

ok('a press on top of one handle takes that one',
  nearestHandle(0.2, 0.2, 0.8) === 'from' && nearestHandle(0.8, 0.2, 0.8) === 'to');

// ── what a handle may reach, which is what aria reports ────────────────────
{
  const base = { from: 30, to: 90, min: 0, max: 127 };
  const a = limitsFor('from', base);
  const b = limitsFor('to', base);
  ok('the start may go from the scale floor up to wherever the end is standing',
    a.lo === 0 && a.hi === 90, `${a.lo} to ${a.hi}`);
  ok('the end may go from wherever the start is standing up to the ceiling',
    b.lo === 30 && b.hi === 127, `${b.lo} to ${b.hi}`);
  // Each handle's reported limits stop at its neighbour, or a screen reader is told a lie.
  // why: lessons/kit-range-slider.md#test-aria-limits
  ok('neither handle is ever told it can reach the other side of its neighbour',
    a.hi <= base.to && b.lo >= base.from);

  const g = limitsFor('from', { ...base, gap: 5 });
  ok('a gap keeps the two apart by that much and shows in the limits',
    g.hi === 85, `${g.hi} with a gap of 5 against ${a.hi} with none`);
}

ok('a collapsed pair reports one number at both ends of the handle that is stuck',
  limitsFor('from', { from: 50, to: 50, min: 0, max: 127 }).hi === 50
  && limitsFor('to', { from: 50, to: 50, min: 0, max: 127 }).lo === 50);

ok('the default gap lets them touch, because a leg with no travel is a real setting',
  MIN_GAP === 0);

// ── the invariant ──────────────────────────────────────────────────────────
{
  const base = { from: 30, to: 90, min: 0, max: 127 };
  const pushed = clampPair({ ...base, which: 'from', next: 120 });
  ok('a start dragged past the end stops AT the end and does not push it',
    pushed.from === 90 && pushed.to === 90, `${pushed.from} and ${pushed.to}`);
  /* 🔴 NOT PUSHING IS THE DECISION, and the reason is that a shove loses the
     value nobody touched. A page reading `to` after a push gets a number that
     was never set by anybody and has no way to tell. */
  ok('NEGATIVE CONTROL: the end is exactly where it was, so nothing was carried along',
    pushed.to === base.to);

  const low = clampPair({ ...base, which: 'to', next: -40 });
  ok('an end dragged below the start stops at the start, the same way round',
    low.to === 30 && low.from === 30, `${low.from} and ${low.to}`);

  ok('the scale ends still hold',
    clampPair({ ...base, which: 'from', next: -9 }).from === 0
    && clampPair({ ...base, which: 'to', next: 400 }).to === 127);

  const g = clampPair({ ...base, which: 'from', next: 120, gap: 8 });
  ok('with a gap the two stop that far apart rather than touching',
    g.from === 82 && g.to === 90, `${g.from} and ${g.to}, 8 apart`);
}

/* Every pair that comes out of `clampPair` obeys the invariant, whatever goes
   in. Swept rather than sampled, because an off by one at one end of a scale is
   exactly the shape a hand picked case misses. */
{
  let bad = 0, tried = 0;
  for (let from = 0; from <= 127; from += 11) {
    for (let to = from; to <= 127; to += 13) {
      for (const next of [-50, 0, 1, 63, 126, 127, 400]) {
        for (const which of ['from', 'to']) {
          tried++;
          const p = clampPair({ from, to, which, next, min: 0, max: 127 });
          if (!(p.from <= p.to && p.from >= 0 && p.to <= 127)) bad++;
        }
      }
    }
  }
  ok('over a sweep of starts, ends and targets the start is never past the end',
    bad === 0 && tried > 500, `${tried} pairs, ${bad} crossed`);
}

// ── the band ───────────────────────────────────────────────────────────────
{
  const W = 200, K = 20;
  const full = spanPixels(0, 1, W, K);
  ok('the band runs from the start handle CENTRE to the end handle centre',
    full.left === K / 2 && full.width === W - K,
    `left ${full.left}, width ${full.width}, so it ends at ${full.left + full.width} in a ${W} px lane`);
  /* The handle travels `W - K` and is drawn from its left edge, so its centre at
     t is `t*(W-K) + K/2`. The band's two ends have to be those two numbers or
     it is a fifth of a lane longer than the range it stands for. */
  const half = spanPixels(0.25, 0.75, W, K);
  ok('a half open range is half the travel wide and starts a quarter along it',
    half.left === 0.25 * (W - K) + K / 2 && half.width === 0.5 * (W - K),
    `left ${half.left}, width ${half.width}`);

  const none = spanPixels(0.4, 0.4, W, K);
  ok('a collapsed pair draws a band of no width rather than a negative one',
    none.width === 0 && none.left === 0.4 * (W - K) + K / 2, `width ${none.width}`);

  const crossed = spanPixels(0.8, 0.2, W, K);
  ok('a crossed pair still cannot draw backwards',
    crossed.width === 0, `width ${crossed.width}`);

  const tiny = spanPixels(0, 1, 10, 20);
  ok('a lane narrower than a handle gives no travel and no negative width',
    tiny.width === 0 && tiny.left === 10, `left ${tiny.left}, width ${tiny.width}`);
}

// ── what the file says about itself ────────────────────────────────────────
{
  const src = fs.readFileSync(path.join(HERE, 'range-slider.mjs'), 'utf8');

  // The single slider's classes from shell.css are reused, checked rather than claimed.
  // why: lessons/kit-range-slider.md#test-reuse
  const reused = ['sld', 'sld-head', 'sld-l', 'sld-lane', 'sld-knob', 'sld-v'];
  const missing = reused.filter((c) => !src.includes(`'${c}`) && !src.includes(`${c} `));
  ok('it wears the single slider\'s own classes rather than inventing a second set',
    missing.length === 0, missing.length ? `missing ${missing.join(', ')}` : reused.join(', '));

  // Two children, a head and a lane: `.sld-group .sld { display: contents }` aligns a stack.
  // why: lessons/kit-range-slider.md#test-two-children
  ok('the root is appended exactly one head and one lane',
    /wrap\.append\(head, lane\)/.test(src));

  // One writer: `write` is the only caller of `clampPair`, so pointer, keys and `set()` agree.
  // why: lessons/kit-range-slider.md#test-one-writer
  const body = src.slice(src.indexOf('export function createRangeSlider'));
  const clamps = (body.match(/clampPair\(/g) || []).length;
  const setsA = (body.match(/a = pair\.from/g) || []).length;
  const setsB = (body.match(/b = pair\.to/g) || []).length;
  ok('inside the component the two values are assigned in exactly one place',
    setsA === 1 && setsB === 1 && clamps === 2,
    `${clamps} clamps, one for the pair a caller opens with and one in write()`);

  ok('there is no invisible hand in here, and the file says why',
    !src.includes('planMove') && src.includes('NO INVISIBLE HAND HERE'));

  const dash = String.fromCharCode(0x2014), middot = String.fromCharCode(0x00b7);
  ok('no em dash and no middot anywhere in the module, comments included',
    !src.includes(dash) && !src.includes(middot),
    `${src.split('\n').length} lines`);
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
