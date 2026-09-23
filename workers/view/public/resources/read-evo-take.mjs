// demo/resources/read-evo-take.mjs. Is a rotary on the MK-425C smoothed.
//
//   node demo/resources/read-evo-take.mjs ~/Downloads/evo-take-*.json
//
// 🔴 WHAT THE QUESTION ACTUALLY IS. Asked 2026-09-23: *"can you detect cc
// smoothinng. tap and measure when i turn c1-c8 on evi"*. A knob is a
// potentiometer read by an ADC, and between the two there may be nothing, or a
// filter, or a rate limiter. None of the three manuals says which, because they
// describe what the knobs SEND and never how they are read.
//
// 🔴 AND IT IS ANSWERABLE OFF THE WIRE, WHICH IS THE WHOLE REASON FOR THE TAP.
// Each of the three leaves a different signature in a stream of CC messages,
// and the signatures do not overlap:
//
//   NOTHING          consecutive values jump by whatever the hand did. A fast
//                    turn skips values, and the same physical sweep produces
//                    FEWER messages when it is faster.
//   A FILTER         consecutive values step by one almost always, even on a
//                    fast turn, because the output is chasing the input rather
//                    than reporting it. The tell is that a fast sweep produces
//                    about as many messages as a slow one, and that the stream
//                    keeps arriving AFTER the hand has stopped.
//   A RATE LIMITER   messages arrive at a near constant interval whatever the
//                    hand is doing, and the step size is what varies.
//
// ⚠️ SO THE MEASUREMENT IS THREE HISTOGRAMS AND NOT ONE NUMBER: the step between
// consecutive values, the gap between consecutive messages, and how the two move
// together. A mean over a take containing both a slow sweep and a fast one
// describes neither, which is the trap this project has already paid for once on
// the chord takes.
// ⚠️ AND A TAKE WITH ONLY ONE SPEED IN IT CANNOT ANSWER THIS. The script says so
// rather than printing a confident number: what separates a filter from nothing
// is how the stream CHANGES between a slow turn and a fast one.

import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('usage: node demo/resources/read-evo-take.mjs <evo-take.json>');
  process.exit(1);
}
const doc = JSON.parse(readFileSync(path, 'utf8'));
const ev = (doc.events || []).filter((e) => Number.isFinite(e.cc));
if (!ev.length) { console.error('that take has no control messages in it'); process.exit(1); }

const span = (ev[ev.length - 1].t - ev[0].t) / 1000;
console.log(`${ev.length} control messages over ${span.toFixed(1)} s, recorded ${doc.when}`);

/* ── one stream per controller, because they are different knobs ────────── */
const byCc = new Map();
for (const e of ev) {
  if (!byCc.has(e.cc)) byCc.set(e.cc, []);
  byCc.get(e.cc).push(e);
}
console.log(`${byCc.size} controller(s): ${[...byCc.keys()].sort((a, b) => a - b).join(', ')}\n`);

const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0;
};

for (const [cc, list] of [...byCc.entries()].sort((a, b) => a[0] - b[0])) {
  if (list.length < 8) { console.log(`CC ${cc}: ${list.length} messages, too few to read\n`); continue; }
  const steps = [], gaps = [];
  for (let i = 1; i < list.length; i++) {
    steps.push(Math.abs(list[i].v - list[i - 1].v));
    gaps.push(list[i].t - list[i - 1].t);
  }
  /* A move is a run of messages with no long silence in it, which is what one
     turn of the hand looks like on the wire. */
  const moves = [];
  let cur = [list[0]];
  for (let i = 1; i < list.length; i++) {
    if (list[i].t - list[i - 1].t > 250) { moves.push(cur); cur = []; }
    cur.push(list[i]);
  }
  moves.push(cur);
  const real = moves.filter((m) => m.length >= 4);

  const byOne = steps.filter((s) => s === 1).length;
  console.log(`CC ${cc}: ${list.length} messages in ${real.length} move(s), `
    + `range ${Math.min(...list.map((e) => e.v))} to ${Math.max(...list.map((e) => e.v))}`);
  console.log(`  steps between values: median ${pct(steps, 0.5)}, 90th ${pct(steps, 0.9)}, `
    + `max ${Math.max(...steps)}, and ${(100 * byOne / steps.length).toFixed(0)} per cent are 1`);
  console.log(`  gaps between messages: median ${pct(gaps, 0.5)} ms, 10th ${pct(gaps, 0.1)}, `
    + `90th ${pct(gaps, 0.9)}`);

  /* 🔴 THE READING THAT DECIDES IT: the same sweep at two speeds. A move's SPEED
     is how much value it covered per second; its DENSITY is how many messages it
     spent per unit of value. Unsmoothed, density falls as speed rises because
     the hand outruns the sampling. Filtered, density holds. */
  const shape = real.map((m) => {
    const dv = Math.abs(m[m.length - 1].v - m[0].v);
    const dt = (m[m.length - 1].t - m[0].t) / 1000;
    return { dv, dt, speed: dt > 0 ? dv / dt : 0, density: dv > 0 ? m.length / dv : 0, n: m.length };
  }).filter((s) => s.dv >= 8 && s.dt > 0.05);

  if (shape.length < 2) {
    console.log('  NOT ENOUGH TO SAY. One move of any size cannot separate a filter from '
      + 'nothing: what tells them apart is how the stream changes between a slow turn and '
      + 'a fast one. Record a slow sweep and a fast one on the same knob.\n');
    continue;
  }
  shape.sort((a, b) => a.speed - b.speed);
  const slow = shape[0], fast = shape[shape.length - 1];
  console.log(`  slowest move ${slow.speed.toFixed(0)} units/s at ${slow.density.toFixed(2)} `
    + `messages per unit, fastest ${fast.speed.toFixed(0)} units/s at `
    + `${fast.density.toFixed(2)}`);
  const ratio = slow.density > 0 ? fast.density / slow.density : 0;
  const spread = fast.speed / Math.max(1, slow.speed);
  /**
   * 🔴 A FILTER CAPS THE WIRE SPEED, AND THAT BREAKS THE OBVIOUS TEST. Found by
   * grading this script on a synthetic filtered knob before any real take
   * existed. The obvious reading is *density holds while the hand speeds up*,
   * and a filtered knob never lets the hand speed up ON THE WIRE at all: the
   * output chases the input at its own rate, so a frantic sweep and a slow one
   * arrive as the same stream and the comparison has nothing to compare.
   * ⚠️ SO A NARROW SPREAD IS THE INTERESTING CASE AND NOT THE USELESS ONE, and
   * this script cannot tell it from *you only turned at one speed*, because
   * nothing on the wire says what the hand did. Only the player knows, so it
   * says both readings and asks rather than picking one.
   */
  if (spread < 2) {
    console.log(`  THE WIRE NEVER WENT MORE THAN ${spread.toFixed(1)} TIMES FASTER, and that `
      + 'is either the whole finding or nothing at all.');
    console.log('    If you turned this knob at ONE speed, it says nothing: turn it '
      + 'deliberately slowly, then as fast as you can, and record both.');
    console.log('    If you really did turn it much faster and the wire did not, the output '
      + 'is CAPPED, which is a filter or a rate limiter and is the answer.');
  } else if (ratio > 0.8) {
    console.log(`  READS AS SMOOTHED OR RATE LIMITED: density held at ${(ratio * 100).toFixed(0)} `
      + 'per cent of the slow move while the wire went '
      + `${spread.toFixed(1)} times faster.`);
  } else {
    console.log(`  READS AS UNSMOOTHED: density fell to ${(ratio * 100).toFixed(0)} per cent `
      + `when the wire went ${spread.toFixed(1)} times faster, which is a knob being `
      + 'sampled rather than chased.');
  }
  /* The ceiling itself, which is the number a capped output has and a sampled
     one does not. */
  const speeds = shape.map((s) => s.speed);
  console.log(`  fastest the wire ever went: ${Math.max(...speeds).toFixed(0)} units/s `
    + `over ${shape.length} move(s), slowest ${Math.min(...speeds).toFixed(0)}`);
  /* ⚠️ THE OTHER TELL, AND IT IS THE ONE THAT CANNOT BE FAKED BY A FAST HAND: a
     filter goes on emitting after the hand stops, so the last messages of a move
     step by one and slow down. Nothing does that. */
  const tail = real.map((m) => m.slice(-4)).filter((s) => s.length === 4);
  const tailOnes = tail.filter((s) => s.every((e, i) => i === 0 || Math.abs(e.v - s[i - 1].v) === 1));
  console.log(`  ${tailOnes.length} of ${tail.length} moves end in four single unit steps, `
    + 'which is what a filter settling looks like\n');
}

console.log('⚠️ EVERY LINE ABOVE IS ABOUT THE INSTRUMENT ON THIS DESK. Another unit of the '
  + 'same model may read differently, and nothing here was read from a manual.');
