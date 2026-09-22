// demo/shell/pedal-test.mjs. The sustain pedal's arithmetic, with no audio.
//
//   node demo/shell/pedal-test.mjs
//
// `createPedal` is two sets, a threshold and a change filter, and every bug a
// sustain pedal has ever had lives in one of them: a lift that steals a note
// still under a finger, a test for 127 that works on a cheap pedal and fails on
// an expensive one, a repeat that stutters under a foot that is not moving, and
// a foot remembered across a switch off. None of those needs a browser, and
// `plans/plan-nola.md` §5.1 names all four before any of them was written.
//
// NINETEEN OF THESE ARE NEGATIVE CONTROLS: they are written so that the bug they
// describe would fail them, rather than so that today's code passes. The bug is
// named in the comment above each one.
//
// 🔴 AND SEVEN DELIBERATE SABOTAGES TAKE BETWEEN 1 AND 4 OF THEM RED, MEASURED
// 2026-09-22 rather than claimed: a threshold of `=== 127` costs 2, a `keyDown`
// that does not take a note off the foot costs 3, no change filter costs 1, a
// panic that keeps the foot costs 2, a `keyUp` reading only `was` costs 2, a
// constant damper time costs 4, and a `forgetKeys` that leaves the keys alone
// costs 1. That list is the only reason to believe any of this grades anything.
//
// 🔴 ONE OF THOSE SABOTAGES CAME BACK GREEN THE FIRST TIME AND FOUND A REAL
// DEFECT. `if (!keysDown.has(n))` at the pedal lift, copied over from
// `/muta/`, was UNREACHABLE: the two sets are disjoint by construction, so the
// test could never be false. Removing it changed nothing, which is this
// project's own signal for a dead guard. What the hunt for a reachable path
// then turned up is test 19, a duplicate note off releasing a note twice, which
// was a live bug in `/muta/` and is fixed in both.

import { createPedal, damperSec, PEDAL_SAYS, SUSTAIN_CC, PEDAL_ON, DAMP_MIN, DAMP_MAX }
  from './pedal.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? '   ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? '   ' + detail : ''}`); }
};
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

/** A pedal that writes down every release instead of making a sound. */
function rig(opts = {}) {
  const let_go = [];
  const moved = [];
  const p = createPedal({
    release: (note, sec) => let_go.push({ note, sec }),
    onPedal: (down, value, freed) => moved.push({ down, value, freed }),
    ...opts,
  });
  return { p, let_go, moved, notes: () => let_go.map((r) => r.note) };
}

console.log('\n== the sustain pedal ==');

// ── the threshold ───────────────────────────────────────────────────────────

// 1. The number and the threshold are both 64, which reads as a typo and is not.
ok('the sustain controller and its threshold are both 64',
  SUSTAIN_CC === 64 && PEDAL_ON === 64, `cc ${SUSTAIN_CC}, on at ${PEDAL_ON}`);

// 2. NEGATIVE CONTROL. 64 is DOWN. A test for `=== 127` reads this as up, works
//    on every switch pedal on every desk, and fails on the expensive one.
{
  const { p } = rig();
  p.control(64, 64);
  ok('a value of 64 puts the pedal down, which a test for 127 would miss',
    p.down() === true, `64 -> ${p.down() ? 'down' : 'up'}`);
}

// 3. NEGATIVE CONTROL. 63 is UP, so the boundary is between them and not at 0.
{
  const { p } = rig();
  p.control(64, 63);
  ok('a value of 63 leaves the pedal up', p.down() === false,
    `63 -> ${p.down() ? 'down' : 'up'}`);
}

// ── two sets, not one ───────────────────────────────────────────────────────

// 4. The plain case: key down, pedal down, key up, and the note is still there.
{
  const { p, notes } = rig();
  p.keyDown(60);
  p.control(64, 127);
  p.keyUp(60);
  ok('a key released with the pedal down keeps its note',
    notes().length === 0 && p.held() === 1, `${p.held()} held by the foot`);
  p.control(64, 0);
  ok('and lifting the pedal takes it away',
    notes().join(',') === '60' && p.held() === 0, `released ${notes().join(',') || 'nothing'}`);
}

// 5. NEGATIVE CONTROL, AND IT IS THE ONE THE SECOND SET EXISTS FOR. A key
//    pressed AGAIN while the pedal is down must not be stolen when the pedal
//    lifts. One set cannot tell these two notes apart.
{
  const { p, notes } = rig();
  p.keyDown(60); p.keyDown(64);
  p.control(64, 127);
  p.keyUp(60); p.keyUp(64);            // both now held by the foot
  p.keyDown(60);                        // and 60 is put back under a finger
  p.control(64, 0);
  ok('lifting the pedal cannot steal a key that is back under a finger',
    notes().join(',') === '64', `released ${notes().join(',') || 'nothing'}, 60 should survive`);
  ok('and that key is still down afterwards',
    p.fingers() === 1 && p.held() === 0, `${p.fingers()} under a finger`);
}

// 6. Re-pedalling. Notes released while the pedal was UP stay released; a note
//    still under a finger is re-captured the next time the pedal goes down.
{
  const { p, notes } = rig();
  p.keyDown(60); p.keyUp(60);          // gone, with no pedal under it
  p.keyDown(64);                        // still held
  p.control(64, 127);
  p.keyUp(64);
  p.control(64, 0);
  ok('re-pedalling takes the notes that were held and not the ones already gone',
    notes().join(',') === '60,64' && notes().length === 2,
    `released ${notes().join(',')}, each once`);
}

// ── acting only on a change ─────────────────────────────────────────────────

// 7. NEGATIVE CONTROL. A pedal held down repeats its value. A page that acted
//    on every message would release every held note on each repeat, which
//    stutters under a foot that is not moving.
{
  const { p, moved } = rig();
  p.control(64, 127); p.control(64, 127); p.control(64, 120); p.control(64, 127);
  ok('a pedal repeating itself moves nothing',
    moved.length === 1 && p.moves() === 1, `${p.moves()} moves from four messages`);
}

// 8. And a controller this pedal is not listening to is ignored outright,
//    including the two pedals `plan-nola.md` §5.2 refuses by name.
{
  const { p, moved } = rig();
  ok('sostenuto and una corda are not this pedal',
    p.control(66, 127) === false && p.control(67, 127) === false && moved.length === 0,
    'cc 66 and cc 67 both refused');
}

// ── the foot is forgotten, and the keys are not always ──────────────────────

// 9. NEGATIVE CONTROL. A pedal left down across a switch off would hold the
//    next session's first note for ever, and nothing on screen would say why.
{
  const { p, notes } = rig();
  p.keyDown(60);
  p.control(64, 127);
  p.keyUp(60);
  p.panic();
  ok('a panic forgets the foot as well as the notes',
    p.down() === false && p.held() === 0 && p.fingers() === 0 && p.raw() === 0,
    `down ${p.down()}, raw ${p.raw()}`);
  p.keyDown(72); p.keyUp(72);
  ok('so the next note after a panic is not held by a pedal nobody is pressing',
    notes().join(',') === '72', `released ${notes().join(',') || 'nothing'}`);
}

// 10. NEGATIVE CONTROL, THE OTHER WAY. `forgetKeys` is NOT a smaller panic.
//     `/muta/` calls it when its engine silences its own voices behind the
//     page's back, and the foot has not moved, so clearing `down` would be a
//     second lie on top of the first.
{
  const { p } = rig();
  p.keyDown(60);
  p.control(64, 127);
  p.forgetKeys();
  ok('forgetting the keys leaves the foot exactly where it is',
    p.down() === true && p.raw() === 127 && p.held() === 0 && p.fingers() === 0,
    `down ${p.down()}, raw ${p.raw()}`);
}

// 11. NEGATIVE CONTROL. A note off with no note on is RELEASED and never HELD.
//     Holding one invents a note that lifting the pedal would then stop, on a
//     page where nobody played it; releasing one can never hang.
{
  const { p, notes } = rig();
  p.control(64, 127);
  p.keyUp(99);
  ok('a note nobody played is released rather than taken by the pedal',
    notes().join(',') === '99' && p.held() === 0, `held ${p.held()}`);
}

// ── the damper is a ramp, not a stop ────────────────────────────────────────

// 12. The floor is `rig/board/synth.mjs`'s number and the ceiling is a guess,
//     and both are bounds rather than a curve to be clever about.
ok('a release at nought takes the shortest damper time',
  near(damperSec(0), DAMP_MIN) && near(damperSec(127), DAMP_MAX),
  `${damperSec(0)}s at 0, ${damperSec(127)}s at 127`);

// 13. NEGATIVE CONTROL. It must rise with the value, or half pedalling is a
//     reading that says the same thing at every position of the foot.
{
  let rising = true;
  for (let v = 1; v <= 127; v++) if (damperSec(v) <= damperSec(v - 1)) rising = false;
  ok('the damper time rises with every step of the pedal', rising,
    `${damperSec(32).toFixed(3)}s at 32, ${damperSec(63).toFixed(3)}s at 63`);
}

// 14. And a value off the end of the range is clamped rather than extrapolated.
ok('a value outside 0 to 127 is clamped',
  near(damperSec(-40), DAMP_MIN) && near(damperSec(999), DAMP_MAX),
  `${damperSec(-40)}s and ${damperSec(999)}s`);

// 15. The release a page is handed carries the time, so a page never computes
//     one. A pedal lifted at 40 damps more slowly than one dropped to 0.
{
  const a = rig(); a.p.keyDown(60); a.p.control(64, 127); a.p.keyUp(60); a.p.control(64, 0);
  const b = rig(); b.p.keyDown(60); b.p.control(64, 127); b.p.keyUp(60); b.p.control(64, 40);
  ok('the page is handed the damper time with the note',
    near(a.let_go[0].sec, DAMP_MIN) && b.let_go[0].sec > a.let_go[0].sec,
    `${a.let_go[0].sec.toFixed(3)}s off, ${b.let_go[0].sec.toFixed(3)}s at 40`);
}

// ── what kind of pedal is on the desk ───────────────────────────────────────

// 16. NEGATIVE CONTROL, AND IT IS `caps.mjs`'s RULE ONE MODULE ALONG: a probe
//     that could not answer returns `unknown`, because "we did not look" must
//     not read as "it is a switch".
{
  const { p } = rig();
  ok('a pedal that has said nothing is neither a switch nor continuous',
    p.switchy() === null, `${p.switchy()}`);
  p.control(64, 127); p.control(64, 0);
  ok('one that has only ever sent 0 and 127 is a switch', p.switchy() === true);
  p.control(64, 40);
  ok('and one value in between is enough to prove it is not', p.switchy() === false);
}

// ── a pedal on another controller number ────────────────────────────────────

// 17. The footswitch on the keyboard in this building is *"fully MIDI
//     assignable"* and nobody has read what it sends, so 64 is a default and
//     the number is an option.
{
  const { p, notes } = rig({ cc: 67 });
  p.keyDown(60);
  ok('a pedal told to listen to another controller ignores 64',
    p.control(64, 127) === false && p.down() === false);
  p.control(67, 127);
  p.keyUp(60);
  ok('and holds the note when its own controller arrives',
    p.down() === true && notes().length === 0 && p.held() === 1, `cc ${p.cc}`);
}

// ── a pedal whose polarity was sensed wrong at power up ─────────────────────

// 21. MEASURED on the keyboard in this building 2026-09-23: two press and
//     release gestures both arrived as `B1 40 00` then `B1 40 7F` 0.40 s later,
//     so pressing sends 0 and releasing sends 127. `flip` reads it the right
//     way up without touching the instrument.
{
  const { p, notes } = rig({ flip: true });
  p.control(64, 0);
  ok('a flipped pedal reads 0 as the foot going down', p.down() === true && p.flipped() === true);
  p.keyDown(60); p.keyUp(60);
  ok('so a key let go while it is pressed is kept', notes().length === 0 && p.held() === 1);
  p.control(64, 127);
  ok('and 127 is the foot coming off it', p.down() === false && notes().join(',') === '60');
}

// 22. NEGATIVE CONTROL, AND IT IS THE POINT OF `raw()` EXISTING AT ALL. The
//     correction must NOT reach the wire value, or a page printing
//     `64 is 0, so the pedal reads down` would print the corrected number and
//     hide the one fact that cell was added to carry.
{
  const { p } = rig({ flip: true });
  p.control(64, 0);
  ok('the raw value is what arrived, not what it was corrected to',
    p.raw() === 0 && p.down() === true, `raw ${p.raw()}, reads ${p.down() ? 'down' : 'up'}`);
}

// 23. NEGATIVE CONTROL. An unflipped pedal is unchanged by any of the above,
//     because the default has to stay the specification.
{
  const { p } = rig();
  p.control(64, 0);
  ok('a pedal nobody flipped still reads 0 as up',
    p.down() === false && p.flipped() === false);
}

// 24. And the damper time follows the CORRECTED value, or a flipped pedal
//     released to 0 would damp as slowly as one held wide open.
{
  const a = rig({ flip: true }); a.p.control(64, 127);
  const b = rig();               b.p.control(64, 0);
  ok('the damper time follows the reading rather than the wire',
    near(a.p.damper(), b.p.damper()),
    `${a.p.damper().toFixed(3)}s flipped at 127, ${b.p.damper().toFixed(3)}s plain at 0`);
}

// ── a control on the page is not the instrument ─────────────────────────────

// 25. NEGATIVE CONTROL, AND IT IS THE ONE THAT CAUGHT A SHIPPED DEFECT. A
//     SUSTAIN switch on a page says `the dampers are up`; it is not a keyboard
//     with a backwards footswitch. Running it through `control()` under `flip`
//     reversed it too, which is a switch that turns sustain off.
{
  const a = rig({ flip: true }), b = rig();
  a.p.set(true); b.p.set(true);
  ok('a switch on the page puts the pedal down whichever way the wire is read',
    a.p.down() === true && b.p.down() === true,
    `flipped ${a.p.down()}, plain ${b.p.down()}`);
  ok('and the same byte through the wire disagrees with it, which is the point',
    (() => { const c = rig({ flip: true }); c.p.control(64, 127); return c.p.down() === false; })(),
    'a flipped pedal reads 127 as the foot coming off');
}

// 26. And `raw` after a switch press is the byte a pedal in that state WOULD
//     have sent here, so a page printing it beside the reading has something
//     true to print rather than a stale number from the last real message.
{
  const a = rig({ flip: true }), b = rig();
  a.p.set(true); b.p.set(true);
  ok('the raw value a switch leaves behind matches this instrument',
    a.p.raw() === 0 && b.p.raw() === 127, `flipped ${a.p.raw()}, plain ${b.p.raw()}`);
}

// 27. NEGATIVE CONTROL. `wire()` is the one home for that arithmetic, and a
//     check that hard coded 127 would be wrong the moment somebody opened the
//     page upside down.
{
  const a = rig({ flip: true }), b = rig();
  ok('the byte a pedal would send is the opposite one when it is read upside down',
    a.p.wire(true) === 0 && a.p.wire(false) === 127
    && b.p.wire(true) === 127 && b.p.wire(false) === 0,
    `flipped down=${a.p.wire(true)}, plain down=${b.p.wire(true)}`);
}

// 28. A switch repeating itself moves nothing, the same as a pedal does.
{
  const { p, moved } = rig();
  p.set(true); p.set(true); p.set(false); p.set(false);
  ok('a switch pressed twice in the same direction moves the foot once each way',
    moved.length === 2 && p.moves() === 2, `${p.moves()} moves from four calls`);
}

// 29. NEGATIVE CONTROL. A panic must leave the raw value meaning UP on THIS
//     instrument, not the literal 0. On a flipped pedal 0 means down, so a
//     panic used to leave the reading contradicting `down`, and the damper time
//     is read off the reading: every release after a panic took 0.9 s instead
//     of 0.12.
{
  for (const flip of [false, true]) {
    const { p, let_go } = rig({ flip });
    p.control(64, p.wire(true));
    p.keyDown(60);
    p.panic();
    ok(`a panic leaves the pedal reading up, flip ${flip}`,
      p.down() === false && p.raw() === p.wire(false) && near(p.damper(), DAMP_MIN),
      `raw ${p.raw()}, damper ${p.damper().toFixed(3)}s`);
    p.keyDown(72); p.keyUp(72);
    ok(`and the next release is damped in ${DAMP_MIN}s rather than ${DAMP_MAX}s, flip ${flip}`,
      near(let_go[let_go.length - 1].sec, DAMP_MIN),
      `${let_go[let_go.length - 1].sec.toFixed(3)}s`);
  }
}

// ── the words ───────────────────────────────────────────────────────────────

// 18. Nothing a visitor reads carries an em dash or a middot. CLAUDE.md, and
//     the reason this is code rather than a sweep is that two formatters in
//     `shell.mjs` were stamping middots in under a comment calling one "already
//     this project's separator".
{
  const strings = [PEDAL_SAYS.down, PEDAL_SAYS.up, PEDAL_SAYS.switchy, PEDAL_SAYS.continuous,
    PEDAL_SAYS.freed(1), PEDAL_SAYS.freed(3), PEDAL_SAYS.raw(64, 127, true)];
  ok('no em dash and no middot in anything the pedal says',
    strings.every((s) => !s.includes('—') && !s.includes('·')), `${strings.length} strings`);
  ok('one note freed is said in the singular',
    PEDAL_SAYS.freed(1).endsWith('1 note') && PEDAL_SAYS.freed(3).endsWith('3 notes'),
    PEDAL_SAYS.freed(1));
}

// 19. NEGATIVE CONTROL, AND IT IS THE ONE THAT FOUND A REAL BUG. A keyboard
//     sending two releases for one key is ordinary: a note on at velocity 0
//     followed by a real 0x80 is the commonest shape of it. Reading only
//     "was this key down" sends the second one past the pedal to the
//     instrument, so the note stops under a foot that is still down and the
//     lift releases it a second time afterwards.
{
  const { p, let_go, notes } = rig();
  p.keyDown(60);
  p.control(64, 127);
  p.keyUp(60); p.keyUp(60);
  ok('a second note off for a note the foot is holding does nothing',
    let_go.length === 0 && p.held() === 1, `${let_go.length} released, ${p.held()} held`);
  p.control(64, 0);
  ok('and the note is then released exactly once',
    notes().join(',') === '60' && let_go.length === 1, `released ${notes().join(',')}`);
}

// 20. NEGATIVE CONTROL FOR THE INVARIANT THE LIFT NOW RELIES ON: the two sets
//     are disjoint, because `keyDown` takes a note off the foot. A lift
//     releases everything the foot holds and does not re-check, so this is the
//     only thing standing between a re-pressed key and being cut off.
{
  const { p, notes } = rig();
  p.keyDown(60); p.control(64, 127); p.keyUp(60);   // 60 is on the foot
  p.keyDown(60);                                     // and taken back off it
  ok('a key pressed again while the pedal is down leaves the foot holding nothing',
    p.held() === 0 && p.fingers() === 1, `${p.held()} held, ${p.fingers()} under a finger`);
  p.control(64, 0);
  ok('so lifting the pedal releases nothing at all',
    notes().length === 0, `released ${notes().join(',') || 'nothing'}`);
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
