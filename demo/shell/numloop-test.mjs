// demo/shell/numloop-test.mjs. The ten slot looper's arithmetic, no browser.
//
// 🔴 WHY THIS EXISTS BEFORE THE PAGE DOES. Asked 2026-09-23: *"can make a
// separate tmp demo too get it right 'num'"*, and the part worth getting right
// first is not the drawing, it is a four state machine with ten instances and a
// timing window in it. `looper.mjs` and `name.mjs` are both graded this way for
// the same reason: everything that can be wrong here is wrong with no pixels
// involved.

import { createNumLoop, NEXT, STATES } from './numloop.mjs';

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

// 2. and it goes on toggling for ever rather than cycling back to empty
//    ⚠️ THE CLAIM IS THE SET, NOT THE PARTICULAR STATE, and the first version of
//    this check asserted `looping` at nine presses and went red. It walks
//    recording, looping, stopped and then alternates, so an odd press after the
//    first two is a STOP. Writing the expected state out by hand is doing the
//    machine's arithmetic a second time and getting it wrong; what is actually
//    promised is that it never falls out of the pair.
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

// 5. 🔴 THE TRAP. A double press must CLEAR and must not walk the machine on the
//    way, which is what a naive wiring to `click` does.
{
  const seen = [];
  const n = createNumLoop({ doubleMs: 40, onEnter: (i, s) => seen.push(s) });
  n.press(0);
  n.press(0);                                    // inside the window
  await sleep(80);
  ok('a double press on an empty slot clears it and never records',
    n.state(0) === 'empty' && !seen.includes('recording'),
    `state ${n.state(0)}, saw ${seen.join(',') || 'nothing'}`);
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

// 8. 🔴 THE COST, ASSERTED RATHER THAN DESCRIBED. Every single press is late by
//    the window, and a page that hid that would feel broken.
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

// 8b. 🔴 AND `pending` IS ALREADY TRUE INSIDE `onTouch`, which is what a page
//     paints its lamp from. The first version called `onTouch` before booking
//     the press, so a page reading `pending()` there saw false and the key never
//     lit. `/num/` found it on its first run; this is the check that keeps it
//     found.
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

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
