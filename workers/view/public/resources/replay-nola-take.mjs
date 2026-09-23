// demo/resources/replay-nola-take.mjs. Play a recorded take back through the
// real recogniser, at every candidate setting, and see what would be learned.
//
//   node demo/resources/replay-nola-take.mjs ~/Downloads/nola-take-*.json
//
// 🔴 THE POINT IS THAT THE TAKE IS THE WIRE AND NOT A CONCLUSION. `read-nola-
// take.mjs` says what the hands did; this says what the PAGE would have made of
// it, using `demo/shell/name.mjs` itself rather than a copy of its arithmetic,
// so a setting can be chosen against real playing instead of a guess.
// ⚠️ AND IT SWEEPS RATHER THAN SCORES. There is no right answer to compare
// against, because nobody wrote down what they meant to play. What it can show
// is how violently the output moves with each knob, and a knob that changes
// everything is a knob nobody should be guessing.

import { readFileSync } from 'node:fs';
import { createSettler, createTally, nameChord, chordKey } from '../shell/name.mjs';

const path = process.argv[2];
if (!path) { console.error('usage: node demo/resources/replay-nola-take.mjs <take.json>'); process.exit(1); }
const doc = JSON.parse(readFileSync(path, 'utf8'));
const ev = doc.events || [];

/** Run the take through one setting and report what the page would have done. */
function run({ windowMs, minNotes, gate, times }) {
  const settler = createSettler({ windowMs, minNotes });
  const tally = createTally({ times, minHoldMs: gate, slots: 6 });
  const held = new Set();
  const named = [];
  let unsure = 0, tooFew = 0;

  /* The page settles on a timer. Replaying, the timer is just the next event:
     a settle is due `windowMs` after the last change, so anything that happens
     later than that has a settle before it. */
  let dueAt = null;
  const settleNow = (at) => {
    const got = settler.settle(at);
    dueAt = null;
    if (!got) return;
    if (!got.enough) { tooFew++; return; }
    const r = nameChord(got.notes);
    if (!r || !r.sure) { unsure++; return; }
    named.push({ at, key: chordKey(r.root, r.quality), name: r.name });
    tally.hold(chordKey(r.root, r.quality), at);
  };

  for (const e of ev) {
    if (dueAt !== null && e.t >= dueAt) settleNow(dueAt);
    if (e.on !== undefined) held.add(e.on);
    else if (e.off !== undefined) held.delete(e.off);
    /* Fingers moved, so whatever was being held is banked and a new settle
       starts, which is exactly what `heardChange` does on the page. */
    tally.release(e.t);
    const due = settler.held([...held], e.t);
    dueAt = due;
  }
  if (dueAt !== null) settleNow(dueAt);
  tally.release(ev[ev.length - 1].t + 1);

  const admitted = tally.check(ev[ev.length - 1].t + 2);
  return {
    named: named.length, unsure, tooFew,
    distinct: new Set(named.map((n) => n.key)).size,
    learned: tally.rows(),
    names: tally.rows().map((k) => named.find((n) => n.key === k)?.name || k),
    scores: tally.scores(ev[ev.length - 1].t + 2).slice(0, 8),
    full: admitted.full,
  };
}

console.log(`${ev.length} messages over ${((ev[ev.length - 1].t - ev[0].t) / 1000).toFixed(1)} s\n`);

console.log('THE SETTLE WINDOW, which decides whether two chords are one chord');
console.log('window  named  unsure  too few  distinct');
for (const windowMs of [50, 70, 90, 120, 160, 200, 300]) {
  const r = run({ windowMs, minNotes: 3, gate: 0, times: 2 });
  console.log(`${String(windowMs).padStart(6)}  ${String(r.named).padStart(5)}  `
    + `${String(r.unsure).padStart(6)}  ${String(r.tooFew).padStart(7)}  ${String(r.distinct).padStart(8)}`);
}

console.log('\nTHE HOLD FLOOR, at the best window, and what it throws away');
for (const gate of [0, 100, 150, 200, 300, 400]) {
  const r = run({ windowMs: 90, minNotes: 3, gate, times: 2 });
  console.log(`  gate ${String(gate).padStart(4)} ms  learned ${r.learned.length}  ${r.names.join(' ')}`);
}

console.log('\nHOW MANY TIMES YOU HAVE TO COME BACK, at the best window and a low floor');
for (const times of [2, 3, 4, 5]) {
  const r = run({ windowMs: 90, minNotes: 3, gate: 120, times });
  console.log(`  times ${times}  learned ${r.learned.length}${r.full ? ' (list full)' : ''}  ${r.names.join(' ')}`);
}

console.log('\nWHAT WAS ACTUALLY PLAYED, heaviest first, at window 90 and floor 120');
const best = run({ windowMs: 90, minNotes: 3, gate: 120, times: 3 });
for (const s of best.scores) console.log(`  ${s.key.padEnd(10)} ${Math.round(s.ms)} ms`);
console.log(`\n${best.named} confident readings, ${best.unsure} too ambiguous to name, `
  + `${best.tooFew} under ${3} notes.`);
