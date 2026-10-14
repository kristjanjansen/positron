// demo/shell/numloop-test.mjs: the ten slot looper's arithmetic, no browser.
// Sabotage measured: five deliberate breakages each turn this red (6, 4, 1, 2 and 1 reds).
// why: lessons/kit-numloop.md#test-header

import {
  createNumLoop, NEXT, STATES,
  detectBpm, snapRatio, quantiseTimes, groupOnsets,
  RATIOS, MAX_STRETCH, MIN_FIT, CHANCE, CHORD_MS,
} from './numloop.mjs';

let pass = 0, fail = 0;
const ok = (what, cond, saw) => {
  if (cond) { pass++; console.log(`  ok   ${what}   ${saw}`); }
  else { fail++; console.log(`  FAIL ${what}   ${saw}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. the walk somebody described, in the words they described it in
{
  const seen = [];
  const n = createNumLoop({ onEnter: (i, s) => seen.push(`${i}:${s}`) });
  for (let k = 0; k < 4; k++) { n.press(0); n.settle(0); }
  ok('a number walks record, loop, stop, play again',
    seen.join(' ') === '0:recording 0:looping 0:stopped 0:looping',
    seen.join(' '));
  n.destroy();
}

// 2. and it goes on toggling for ever rather than cycling back to empty.
// The claim is the set {looping, stopped}, not a particular state per press.
// why: lessons/kit-numloop.md#test-2-toggle
{
  const n = createNumLoop();
  const after = [];
  for (let k = 0; k < 12; k++) { n.press(0); n.settle(0); after.push(n.state(0)); }
  const settled = after.slice(2);
  ok('past the first two presses it only ever toggles play and stop',
    settled.every((s) => s === 'looping' || s === 'stopped')
      && new Set(settled).size === 2 && STATES.includes(n.state(0)),
    `twelve presses read ${after.join(' ')}`);
  n.destroy();
}

// 3. NEGATIVE CONTROL, and it is the reason the table is exported rather than
//    written inline: nothing in the walk may lead back to `empty`, because the
//    ONLY way back is the double press.
{
  ok('NEGATIVE CONTROL: no single press anywhere leads back to empty',
    Object.entries(NEXT).every(([, to]) => to !== 'empty'),
    Object.entries(NEXT).map(([a, b]) => `${a}->${b}`).join(' '));
}

// 4. ten machines, not one
{
  const n = createNumLoop();
  n.press(0); n.settle(0);                       // 0 recording
  n.press(3); n.settle(3); n.press(3); n.settle(3); // 3 looping
  ok('pressing one number does not touch another',
    n.state(0) === 'recording' && n.state(3) === 'looping' && n.held() === 2,
    `slot 0 ${n.state(0)}, slot 3 ${n.state(3)}, ${n.held()} live`);
  n.destroy();
}

// 5. A double press must not walk the machine: click fires twice before dblclick. On an empty slot it
// reaches recording in one step.
// why: lessons/kit-numloop.md#test-5-double
{
  const seen = [];
  const n = createNumLoop({ doubleMs: 40, onEnter: (i, s) => seen.push(s) });
  n.press(0);
  n.press(0);                                    // inside the window
  await sleep(80);
  ok('a double press on an empty slot records at once, without walking the cycle',
    n.state(0) === 'recording' && seen.join(',') === 'recording',
    `state ${n.state(0)}, saw ${seen.join(',') || 'nothing'}`);
  n.destroy();
}

// 5b. and it silences whatever else was playing, without throwing it away
{
  const n = createNumLoop({ doubleMs: 40 });
  n.press(1); n.settle(1); n.press(1); n.settle(1);   // 1 looping
  n.press(2); n.settle(2);                            // 2 recording
  n.press(0); n.press(0); await sleep(80);            // double press on empty 0
  ok('a double press on an empty slot stops the other loops and starts recording',
    n.state(0) === 'recording' && n.state(1) === 'stopped' && n.state(2) === 'recording',
    `0 ${n.state(0)}, 1 ${n.state(1)}, 2 ${n.state(2)}`);
  n.press(1); n.settle(1);
  ok('NEGATIVE CONTROL: and the stopped loop is still there, one press from playing',
    n.state(1) === 'looping',
    `one press brought slot 1 back to ${n.state(1)}`);
  n.destroy();
}

// 6. and a double press on a LOOPING slot throws the loop away
{
  const n = createNumLoop({ doubleMs: 40 });
  n.press(0); await sleep(60);
  n.press(0); await sleep(60);                   // looping
  const was = n.state(0);
  n.press(0); n.press(0); await sleep(60);
  ok('and a double press on a loop empties it',
    was === 'looping' && n.state(0) === 'empty',
    `${was} then ${n.state(0)}`);
  n.destroy();
}

// 7. NEGATIVE CONTROL: two presses far enough apart are two presses
{
  const n = createNumLoop({ doubleMs: 30 });
  n.press(0); await sleep(60);
  n.press(0); await sleep(60);
  ok('NEGATIVE CONTROL: two slow presses are two presses, not a double one',
    n.state(0) === 'looping',
    `two presses 60 ms apart left it ${n.state(0)}`);
  n.destroy();
}

// 8. The cost, asserted: every single press is late by the window.
// why: lessons/kit-numloop.md#test-8-cost
{
  const seen = [];
  const n = createNumLoop({ doubleMs: 50, onEnter: (i, s) => seen.push(s), onTouch: () => seen.push('touch') });
  n.press(0);
  const atOnce = seen.slice();
  await sleep(90);
  ok('a press is reported at once and committed late, which is what the lamp needs',
    atOnce.join(',') === 'touch' && seen.join(',') === 'touch,recording',
    `immediately "${atOnce.join(',')}", after the window "${seen.join(',')}"`);
  n.destroy();
}

// 8b. pending() is already true inside onTouch, which a page paints its lamp from.
// why: lessons/kit-numloop.md#test-8b-pending
{
  let sawPending = null;
  const n = createNumLoop({ doubleMs: 40, onTouch: (i) => { sawPending = n2.pending(i); } });
  // eslint-disable-next-line no-var
  var n2 = n;
  n.press(0);
  ok('a slot is already pending when the touch is reported, which is what the lamp reads',
    sawPending === true, `pending inside onTouch was ${sawPending}`);
  n.destroy();
}

// 9. pending says whether a press is still in the air
{
  const n = createNumLoop({ doubleMs: 40 });
  n.press(1);
  const during = n.pending(1);
  await sleep(70);
  ok('a slot says whether a press of it is still waiting to be judged',
    during === true && n.pending(1) === false,
    `pending ${during} during the window, ${n.pending(1)} after`);
  n.destroy();
}

// 10. a slot out of range is refused rather than growing the array
{
  const n = createNumLoop({ slots: 10 });
  n.press(10); n.press(-1); n.settle(10);
  ok('NEGATIVE CONTROL: a number this pad does not have changes nothing',
    n.states().length === 10 && n.states().every((s) => s === 'empty'),
    `${n.states().length} slots, ${n.states().filter((s) => s !== 'empty').length} touched`);
  n.destroy();
}

// 11. clearing one leaves the rest alone
{
  const n = createNumLoop();
  n.press(0); n.settle(0); n.press(1); n.settle(1);
  n.clear(0);
  ok('clearing one slot leaves the others where they were',
    n.state(0) === 'empty' && n.state(1) === 'recording',
    `slot 0 ${n.state(0)}, slot 1 ${n.state(1)}`);
  n.destroy();
}

// 12. a bank with no slots is a mistake worth throwing on
{
  let threw = false;
  try { createNumLoop({ slots: 0 }); } catch { threw = true; }
  ok('a looper with no numbers refuses to be built', threw, threw ? 'threw' : 'built one');
}

// Tempo and alignment: two loops are aligned when their wraps coincide, counted over a span.
// wrapsIn only multiplies a lap and counts; it does not repeat the snapping arithmetic.
// why: lessons/kit-numloop.md#test-tempo-section

/** every moment a loop of this lap comes round inside a span, t=0 excluded */
const wrapsIn = (spanMs, lapMs) => {
  const out = [];
  for (let t = lapMs; t <= spanMs; t += lapMs) out.push(t);
  return out;
};
const together = (a, b) => { const s = new Set(b); return a.filter((t) => s.has(t)); };

// 13. a tempo read off the gaps, and the number is one a reader can check
{
  const n = createNumLoop();
  // four onsets half a second apart. 500 ms a beat is 120 a minute, by hand.
  const t = n.fitLap(0, 2000, { onsets: [0, 500, 1000, 1500] });
  const tempo = n.tempo();
  ok('four onsets half a second apart are read as 120 beats a minute, detected rather than assumed',
    Math.round(tempo.bpm) === 120 && tempo.source === 'detected' && tempo.fit === 1
      && tempo.intervals === 3 && t.first === true,
    `${Math.round(tempo.bpm)} bpm, ${tempo.source}, fit ${tempo.fit}, ${tempo.intervals} gaps`);
  n.destroy();
}

// 14. The answer to a take with no rhythm in it is not 120.
// why: lessons/kit-numloop.md#test-14-no-rhythm
{
  const one = createNumLoop();
  one.fitLap(0, 1500, { onsets: [0] });
  const silence = createNumLoop();
  silence.fitLap(0, 1500, { onsets: [] });
  const a = one.tempo(), b = silence.tempo();
  ok('NEGATIVE CONTROL: one note is not a tempo and silence is not 120, both say so',
    a.bpm === null && a.source === 'none' && a.why.length > 20
      && b.bpm === null && b.source === 'none',
    `one note "${a.source}" ${a.bpm}, silence "${b.source}" ${b.bpm}`);
  one.destroy(); silence.destroy();
}

// 15. The chance floor under fit, measured: TOL covers 2 * TOL of a beat, so random takes score about
// CHANCE and must rarely pass MIN_FIT.
// why: lessons/kit-numloop.md#test-15-chance
{
  let seed = 0x9e3779b9;
  const rnd = () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const TAKES = 400;
  let called = 0, fitSum = 0;
  for (let k = 0; k < TAKES; k++) {
    const onsets = Array.from({ length: 12 }, () => Math.round(rnd() * 6000)).sort((a, b) => a - b);
    const t = detectBpm(onsets);
    if (t.source === 'detected') called++;
    fitSum += t.fit;
  }
  const rate = called / TAKES, meanFit = fitSum / TAKES;
  ok('NEGATIVE CONTROL: takes with no rhythm in them are mostly refused, and their mean fit sits near chance',
    rate < 0.25 && meanFit < MIN_FIT && meanFit > 0.1,
    `${called} of ${TAKES} random takes called a tempo (${Math.round(rate * 100)} per cent), `
    + `mean fit ${meanFit.toFixed(2)} against a chance floor of ${CHANCE.toFixed(2)} and a threshold of ${MIN_FIT}`);
}

// 16. Aligned loops come round together for ever; unaligned ones meet only at their common multiple.
// why: lessons/kit-numloop.md#test-16-wraps
{
  const n = createNumLoop();
  const first = n.fitLap(0, 2000, { onsets: [0, 500, 1000, 1500] });
  const second = n.fitLap(1, 1100, { onsets: [0, 550] });
  const SPAN = 60000;
  const wa = wrapsIn(SPAN, first.lap), wb = wrapsIn(SPAN, second.lap);
  const met = together(wa, wb);
  ok('a loop aligned to the first comes round with it every single time, counted over a minute',
    second.snapped === true && second.label === '1/2' && second.lap === 1000
      && wa.length === 30 && wb.length === 60 && met.length === 30 && met.length === wa.length,
    `unit ${first.lap} ms wrapped ${wa.length} times, the ${second.label} loop at ${second.lap} ms `
    + `wrapped ${wb.length}, and they came round together ${met.length} times`);

  // the same take, unaligned, which is what this feature is for
  const raw = wrapsIn(SPAN, 1100);
  const metRaw = together(wa, raw);
  ok('NEGATIVE CONTROL: the same take left at the length it was played meets the unit almost never',
    metRaw.length < 5 && metRaw.length < met.length / 6,
    `at its played length of 1100 ms it wrapped ${raw.length} times in the minute and met the unit `
    + `${metRaw.length} time(s), against ${met.length}`);
  n.destroy();
}

// 16b. and the same holds the other way round, a loop that is LONGER than the unit
{
  const n = createNumLoop();
  const a = n.fitLap(0, 1000, { onsets: [0, 250, 500, 750] });
  const b = n.fitLap(1, 3800, { onsets: [0, 250] });
  const SPAN = 60000;
  const wb = wrapsIn(SPAN, b.lap), wa = wrapsIn(SPAN, a.lap);
  const met = together(wb, wa);
  ok('a loop four times the unit also comes round on it every time, counted',
    b.label === '4' && b.lap === 4000 && wb.length === 15 && met.length === 15,
    `the ${b.label} loop at ${b.lap} ms wrapped ${wb.length} times and met the unit ${met.length} times`);
  n.destroy();
}

// 17. A take too far from any allowed ratio is refused with a reason: outside the span, and in a gap.
// why: lessons/kit-numloop.md#test-17-refused
{
  const n = createNumLoop();
  n.fitLap(0, 2000, { onsets: [0, 500, 1000, 1500] });
  const far = n.fitLap(1, 20000, { onsets: [0, 500] });
  const gap = n.fitLap(2, 2800, { onsets: [0, 500] });
  ok('a take far outside the ratios keeps the length it was played at, and says so',
    far.snapped === false && far.lap === 20000 && far.ratio === null && /per cent/.test(far.why),
    `20000 against a unit of 2000: ${far.snapped ? 'snapped' : 'refused'} at ${far.lap} ms`);
  ok('and so does one that falls between two ratios rather than near either',
    gap.snapped === false && gap.lap === 2800 && gap.stretch > MAX_STRETCH,
    `2800 against 2000 is ${gap.stretch.toFixed(2)} of a stretch, past the ${MAX_STRETCH} ceiling`);
  n.destroy();
}

// 18. Powers of two only, so a triplet length is refused rather than becoming a quarter.
// why: lessons/kit-numloop.md#test-18-triplet
{
  ok('NEGATIVE CONTROL: every allowed ratio is a power of two, so nothing here can snap to a third',
    RATIOS.length === 5 && RATIOS.every((x) => Number.isInteger(Math.log2(x.r))),
    RATIOS.map((x) => x.label).join(', '));
  const third = snapRatio(1000, 3000);
  ok('NEGATIVE CONTROL: a take exactly a third of the unit is refused rather than mangled to a quarter',
    third.snapped === false && third.lap === 1000,
    `a third of the unit came back ${third.snapped ? `snapped to ${third.lap}` : `refused at ${third.lap} ms`}`);
}

// 19. The unit survives clearing the first loop; a later take still snaps to it.
// why: lessons/kit-numloop.md#test-19-unit
{
  const n = createNumLoop();
  n.fitLap(0, 2000, { onsets: [0, 500, 1000, 1500] });
  n.fitLap(1, 1000, { onsets: [0, 500] });
  n.clear(0);
  const stillThere = n.unit();
  const later = n.fitLap(2, 1900, { onsets: [0, 500] });
  ok('clearing the loop that set the unit does not take the unit with it',
    stillThere !== null && stillThere.ms === 2000 && stillThere.from === 0
      && later.snapped === true && later.label === '1' && later.lap === 2000,
    `after clearing slot 0 the unit read ${stillThere?.ms} ms from slot ${stillThere?.from}, `
    + `and a later 1900 ms take snapped to ${later.lap}`);
  n.clear(1); n.clear(2);
  const gone = n.unit(), t = n.tempo();
  ok('and it goes when every slot is empty, together with the tempo',
    gone === null && t.bpm === null && t.source === 'none',
    `with nothing held the unit is ${gone} and the tempo is ${t.source}`);
  n.destroy();
}

// 19b. NEGATIVE CONTROL: the double press on an empty slot STOPS the others and
//      does not clear them, so it must not release the unit either
{
  const n = createNumLoop({ doubleMs: 40 });
  n.press(0); n.settle(0); n.fitLap(0, 2000, { onsets: [0, 500, 1000, 1500] });
  n.press(0); n.settle(0);                              // slot 0 looping
  n.press(5); n.press(5); await sleep(80);              // double press on empty 5
  const u = n.unit();
  ok('NEGATIVE CONTROL: a double press on an empty slot silences the others and keeps the unit',
    n.state(0) === 'stopped' && u !== null && u.ms === 2000 && n.lap(0) === 2000,
    `slot 0 ${n.state(0)} holding ${n.lap(0)} ms, unit ${u?.ms} ms`);
  n.destroy();
}

// 20. the unit is the first take's own length and nothing rounds it
{
  const n = createNumLoop();
  const first = n.fitLap(0, 1837, { onsets: [0, 500, 1000, 1500] });
  ok('the first loop keeps the length it was played at, so the reference is the performance',
    first.lap === 1837 && first.first === true && n.unit().ms === 1837,
    `a 1837 ms first take became ${first.lap} ms`);
  const t = n.tempo();
  ok('and how many beats it came to is reported as a separate reading rather than folded into the tempo',
    Math.round(t.bpm) === 120 && Math.abs(t.unitBeats - 3.674) < 0.01,
    `${Math.round(t.bpm)} bpm with the unit measuring ${t.unitBeats.toFixed(3)} beats, which argues with it`);
  n.destroy();
}

// 21. quantising notes is opt in and its default moves nothing
{
  const played = [10, 260, 505];
  const off = quantiseTimes(played, 125);
  const full = quantiseTimes(played, 125, 1);
  const half = quantiseTimes(played, 125, 0.5);
  ok('NEGATIVE CONTROL: quantising is opt in, so by default not one note moves',
    off.join(',') === played.join(','), `${played.join(',')} came back ${off.join(',')}`);
  ok('asked for, it pulls notes onto the grid, and half strength takes half the error out',
    full.join(',') === '0,250,500' && half.join(',') === '5,255,502.5',
    `full ${full.join(',')}, half ${half.join(',')}`);
}

// 22. the tempo is found once and a later take may not replace it
{
  const n = createNumLoop();
  n.fitLap(0, 2000, { onsets: [0, 500, 1000, 1500] });          // 120
  n.fitLap(1, 1500, { onsets: [0, 375, 750, 1125] });           // would read 160
  const t = n.tempo();
  ok('a later take does not rewrite a tempo that is already known',
    Math.round(t.bpm) === 120, `after a second take at 160 the tempo still reads ${Math.round(t.bpm)}`);
  n.destroy();
}

// 22b. but a take that finds one when none was known fills it in
{
  const n = createNumLoop();
  n.fitLap(0, 1200, { onsets: [0] });                            // nothing to read
  const before = n.tempo().source;
  n.fitLap(1, 1200, { onsets: [0, 500, 1000, 1500] });
  const after = n.tempo();
  ok('and a take that finds one where none was known fills it in',
    before === 'none' && after.source === 'detected' && Math.round(after.bpm) === 120,
    `"${before}" became "${after.source}" at ${Math.round(after.bpm)} bpm`);
  n.destroy();
}

// 23. a page with a real clock hands one over and nothing is inferred
{
  const n = createNumLoop();
  n.assume(140);
  const t = n.tempo();
  ok('a page with its own clock can say what the tempo is, and it is marked given rather than detected',
    t.bpm === 140 && t.source === 'given' && Math.abs(t.gridMs - 60000 / 140 / 4) < 1e-9,
    `${t.bpm} bpm, ${t.source}, a sixteenth is ${t.gridMs.toFixed(2)} ms`);
  n.destroy();
}

// 24. aligning can be switched off, and then nothing is moved
{
  const n = createNumLoop({ align: false });
  n.fitLap(0, 2000, { onsets: [0, 500, 1000, 1500] });
  const b = n.fitLap(1, 1100, { onsets: [0, 500] });
  ok('NEGATIVE CONTROL: with aligning off a take keeps its own length and says which it is',
    b.snapped === false && b.lap === 1100 && /switched off/.test(b.why),
    `1100 ms came back ${b.lap} ms`);
  n.destroy();
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
