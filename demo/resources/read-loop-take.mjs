// demo/resources/read-loop-take.mjs. Does a loop keep time.
//
//   node demo/resources/read-loop-take.mjs ~/Downloads/nola-take-*.json
//
// 🔴 WHAT THE QUESTION IS. Asked 2026-09-23: *"tap. loops do not sound right
// (timings)"*. A loop is a list of movements and a lap, replayed with timers, and
// there are exactly three ways that can sound wrong:
//
//   DRIFT      every lap starts a little later than the one before, so the phrase
//              walks away from itself. The tell is that the error GROWS with the
//              lap number rather than scattering around zero.
//   JITTER     each lap starts on time but individual notes wander inside it. The
//              tell is a spread that does not grow.
//   THE WRONG LAP  the loop keeps perfect time at a length nobody played, usually
//              because the take was closed at a different moment than it felt.
//
// ⚠️ AND THEY NEED DIFFERENT REPAIRS, WHICH IS WHY THE SCRIPT SEPARATES THEM
// RATHER THAN PRINTING ONE NUMBER. Drift is a scheduling bug and is fixed in the
// code. Jitter is the platform and has a floor. A wrong lap is a capture
// question and no amount of scheduling will help it.
//
// ⚠️ IT READS `plays`, NOT `events`. `events` is what arrived on the WIRE, and a
// looped note never touches the wire, so a recording of what arrived says nothing
// about what came back. `plays` is what the page SOUNDED, with `how` saying
// whether a finger or a lap did it.

import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('usage: node demo/resources/read-loop-take.mjs <nola-take.json>');
  process.exit(1);
}
const doc = JSON.parse(readFileSync(path, 'utf8'));
const plays = doc.plays || [];
if (!plays.length) {
  console.error('that take has no sounded notes in it. Open the page with ?rec=1, play, '
    + 'loop something, then press SAVE TAKE');
  process.exit(1);
}

const byLoop = plays.filter((e) => e.how === 'loop');
const byHand = plays.filter((e) => e.how !== 'loop');
const span = (plays[plays.length - 1].t - plays[0].t) / 1000;
console.log(`${plays.length} sounded note(s) over ${span.toFixed(1)} s, recorded ${doc.when}`);
console.log(`${byHand.length} played by hand, ${byLoop.length} came back from a loop\n`);

for (const l of doc.loops || []) {
  console.log(`take ${l.slot}: ${l.state}, lap ${l.lap} ms, ${l.tape.length} movement(s)`);
}
if (!byLoop.length) {
  console.log('\nNOTHING CAME BACK FROM A LOOP in this take, so there is no timing to read. '
    + 'Record a loop, let it turn a few times, and save while it is still going.');
  process.exit(0);
}

/* ── one stream per note, because a lap repeats the same note ──────────────── */
const runs = new Map();
for (const e of byLoop) {
  const key = `${e.n}:${e.down ? 'on' : 'off'}`;
  if (!runs.has(key)) runs.set(key, []);
  runs.get(key).push(e.t);
}

/* 🔴 THE LAP IS MEASURED FROM THE SOUND, NOT READ OFF THE TAKE, or this would be
   grading the page against its own intention. Each note that came back more than
   twice gives an interval per turn; the median across all of them is what the
   loop actually ran at. */
const gaps = [];
for (const [, ts] of runs) for (let i = 1; i < ts.length; i++) gaps.push(ts[i] - ts[i - 1]);
if (!gaps.length) {
  console.log('\nEvery note came back only once, so no interval can be measured. '
    + 'Let the loop turn at least twice before saving.');
  process.exit(0);
}
const sorted = [...gaps].sort((a, b) => a - b);
const heard = sorted[Math.floor(sorted.length / 2)];
const stated = (doc.loops || []).find((l) => l.tape.length)?.lap ?? 0;

console.log(`\nMEASURED LAP ${heard} ms, over ${gaps.length} turn(s) of individual notes`);
if (stated) {
  const off = heard - stated;
  console.log(`  the take says ${stated} ms, so the loop is running ${off >= 0 ? '+' : ''}`
    + `${off} ms ${Math.abs(off) <= 2 ? '(which is nothing)' : 'per turn'}`);
}

/* ── drift against jitter, which is the whole point ────────────────────────── */
let worst = null;
for (const [key, ts] of runs) {
  if (ts.length < 3) continue;
  const first = ts[0];
  /* Where each turn SHOULD have landed if the loop kept perfect time, against
     where it did. A growing error is drift; a scattered one is jitter. */
  const errs = ts.map((t, i) => Math.round(t - (first + i * heard)));
  const last = errs[errs.length - 1];
  const spread = Math.max(...errs) - Math.min(...errs);
  if (!worst || Math.abs(last) > Math.abs(worst.last)) worst = { key, errs, last, spread, n: ts.length };
}
if (!worst) {
  console.log('\nNo note came back three times, which is the fewest that can tell drift '
    + 'from jitter. Let the loop turn a few more times.');
  process.exit(0);
}
console.log(`\nnote ${worst.key.split(':')[0]} came back ${worst.n} times. Error against a `
  + `perfect grid, per turn:`);
console.log(`  ${worst.errs.join(', ')} ms`);

/* 🔴 THE TEST IS WHETHER THE ERROR GROWS, NOT WHETHER IT IS LARGE. A steady 6 ms
   is inaudible and a 6 ms that becomes 60 over ten turns is the phrase walking
   away. Compare the first half's mean against the last half's. */
const half = Math.floor(worst.errs.length / 2);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const early = mean(worst.errs.slice(0, half)), late = mean(worst.errs.slice(half));
const growth = late - early;
console.log(`  first half averages ${early.toFixed(1)} ms, last half ${late.toFixed(1)}, `
  + `spread ${worst.spread} ms`);

if (Math.abs(growth) > 5 && Math.abs(growth) > worst.spread / 3) {
  console.log(`\n  READS AS DRIFT: the error GREW by ${growth.toFixed(1)} ms between the `
    + 'first half of the take and the last. Each lap is inheriting the lateness of the one '
    + 'before it, which is a scheduling bug and not the platform.');
} else if (worst.spread > 25) {
  console.log(`\n  READS AS JITTER: the error scatters over ${worst.spread} ms without `
    + 'growing, so the loop is keeping its place and individual notes are wandering inside '
    + 'it. That is timer accuracy and it has a floor a page cannot get under.');
} else {
  console.log(`\n  READS AS KEEPING TIME: ${worst.spread} ms of scatter and no growth. `
    + 'If it still sounds wrong, the LAP is wrong rather than the scheduling, which is a '
    + 'question about where the take was closed and not about timers.');
}

/* ── and whether the shape inside one lap survived ─────────────────────────── */
const firstLap = byLoop.filter((e) => e.t < byLoop[0].t + heard);
console.log(`\n${firstLap.length} note(s) in the first turn. Their spacing, in ms:`);
console.log(`  ${firstLap.slice(1).map((e, i) => Math.round(e.t - firstLap[i].t)).join(', ') || 'one note only'}`);
const tape = (doc.loops || []).find((l) => l.tape.length)?.tape || [];
if (tape.length) {
  console.log(`what the take says it should be:`);
  console.log(`  ${tape.slice(1).map((e, i) => e.t - tape[i].t).join(', ')}`);
}

console.log('\n⚠️ EVERY LINE ABOVE IS ABOUT THIS BROWSER ON THIS MACHINE. Timer accuracy is '
  + 'not a property of the code alone, and a take recorded while something else was busy '
  + 'reads worse than the same code on a quiet machine.');
