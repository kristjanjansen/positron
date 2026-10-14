#!/usr/bin/env node
// node timeline/lab/prop-media-sensor.mjs [--verbose]: L4b paused. S1 a paused element is not
// extrapolated, S2 a playing one is, S3 frozen, a sample older than currentTime's last move is
// dropped, S4 not during playback. Real short sleeps; the deck on the virtual clock.
// why: lessons/timeline-lab.md#pms-header

import { createDeck, createVirtualRuntime } from '../transport.mjs';
import { mediaMaster } from '../media-master.mjs';

const VERBOSE = process.argv.includes('--verbose');
let failures = 0, checks = 0;
function check(label, cond, detail) {
  checks++;
  if (!cond) { failures++; console.error(`FAIL [${label}] ${detail}`); }
  else if (VERBOSE) console.log(`ok   ${label}  ${detail || ''}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- the fakes: same shape as prop-nested.mjs suite 8/9, plus `paused` --------
function fakeMedia(t0 = 0) {
  const o = { currentTime: t0, paused: false, ended: false, readyState: 4, seeking: false,
              rateWrites: 0, listeners: {} };
  Object.defineProperty(o, 'playbackRate', { get: () => 1, set: () => { o.rateWrites++; } });
  o.addEventListener = (k, f) => { (o.listeners[k] = o.listeners[k] || []).push(f); };
  o.removeEventListener = (k, f) => { o.listeners[k] = (o.listeners[k] || []).filter((x) => x !== f); };
  return o;
}
function fakeVideo(t0 = 0) {
  const o = fakeMedia(t0);
  o.frameCbs = [];
  o.requestVideoFrameCallback = (cb) => { o.frameCbs.push(cb); return o.frameCbs.length; };
  /** deliver one presented frame; returns the wall time it was presented at, so
   *  a test can say what the carry SHOULD be rather than hard-coding a sleep */
  o.presentFrame = (mediaTime, edtOffset = 0) => {
    const cbs = o.frameCbs.splice(0);
    const now = performance.now();
    for (const cb of cbs) cb(now, { mediaTime, expectedDisplayTime: now + edtOffset,
      presentationTime: now, presentedFrames: 1, width: 4, height: 4 });
    return now + edtOffset;
  };
  return o;
}

function rig(startPosMs) {
  const vr = createVirtualRuntime(1_000_000);
  const deck = createDeck({
    clock: vr.clock, tickHost: vr.host, items: [], range: [0, 20000],
    adapters: {},
  });
  deck.seek(startPosMs);
  return { vr, deck };
}

// S1: a paused element after a seek: the playhead stays on the frozen frame (it crept about +150
// ms).
// why: lessons/timeline-lab.md#pms-s1
{
  const { deck } = rig(2225);
  const el = fakeVideo(2.225);
  el.paused = true;
  const mm = mediaMaster(deck, el, { anchorMs: 0, toleranceMs: 5, stallMs: 100000 });
  mm.tick();                                   // arms the frame callback
  el.presentFrame(2.225, 0);                   // the frame the seek landed on
  mm.tick();
  const settled = mm.tick().pos;
  await sleep(150);                            // ← real wall time, nothing else moves
  const r = mm.tick();
  check('S1 paused-not-extrapolated', Math.abs(r.pos - 2225) < 3,
    `a PAUSED element must not be carried onto the wall clock: settled ${settled.toFixed(1)}, `
    + `150 ms later ${r.pos.toFixed(1)} (want 2225)`);
  check('S1 deck-follows', Math.abs(deck.position() - 2225) < 3,
    `…and the deck must be where the picture is: ${deck.position().toFixed(1)}`);
  check('S1 sensor-still-on', mm.stats().rvfc.used >= 1,
    `…with the sensor still USED, not switched off: ${JSON.stringify(mm.stats().rvfc)}`);
  mm.dispose(); deck.dispose();
}

// S2: positive control: a playing element's sample is carried at playbackRate.
// why: lessons/timeline-lab.md#pms-s2
{
  const { deck } = rig(1020);
  const el = fakeVideo(1.0);                   // playing: paused = false
  const mm = mediaMaster(deck, el, { anchorMs: 0, toleranceMs: 5, stallMs: 100000 });
  mm.tick();
  const edt = el.presentFrame(1.020, 0);       // the glass is 20 ms ahead of currentTime
  await sleep(100);
  const r = mm.tick();
  const want = 1020 + (performance.now() - edt);
  check('S2 playing-is-carried', Math.abs(r.pos - want) < 5,
    `a PLAYING element's frame sample must still be carried onto now: ${r.pos.toFixed(1)} `
    + `(want ~${want.toFixed(1)}; 1020 would mean the carry was deleted, 1000 the sensor)`);
  check('S2 counted-as-used', mm.stats().rvfc.used >= 1,
    `…and counted as used: ${JSON.stringify(mm.stats().rvfc)}`);
  mm.dispose(); deck.dispose();
}

// S3: paused, currentTime moved after the last frame by less than jumpMs: currentTime wins.
// why: lessons/timeline-lab.md#pms-s3
{
  const { deck } = rig(1000);
  const el = fakeVideo(1.0);
  el.paused = true;
  const mm = mediaMaster(deck, el, { anchorMs: 0, toleranceMs: 5, jumpMs: 250, stallMs: 100000 });
  mm.tick();
  el.presentFrame(1.000, 0);
  const before = mm.tick().pos;
  el.currentTime = 1.100;                      // a 100 ms scrub, well inside jumpMs
  const r = mm.tick();                         // no new frame presented yet
  check('S3 superseded-dropped', Math.abs(r.pos - 1100) < 3,
    `a frame older than the last move of currentTime must be DROPPED, not believed: `
    + `${r.pos.toFixed(1)} (want 1100; 1000 is the stale picture, and before was ${before.toFixed(1)})`);
  check('S3 counted', mm.stats().rvfc.superseded >= 1,
    `…and counted, so it is a number and not a belief: ${JSON.stringify(mm.stats().rvfc)}`);
  const held = mm.tick();
  check('S3 sticky-until-a-frame', Math.abs(held.pos - 1100) < 3,
    `…and it stays dropped while the picture stays behind: ${held.pos.toFixed(1)}`);
  el.presentFrame(1.100, 0);                   // the compositor catches up
  const after = mm.tick();
  check('S3 releases', Math.abs(after.pos - 1100) < 3 && mm.stats().rvfc.used >= 2,
    `…and the sensor comes back the moment a frame is presented — this is a drop, not a `
    + `disable (${after.pos.toFixed(1)}, ${JSON.stringify(mm.stats().rvfc)})`);
  mm.dispose(); deck.dispose();
}

// S4: positive control for S3: during playback currentTime moves every tick and is noticed late, so
// an
// unconditional S3 switches the sensor off. This check moves currentTime, so it can fail.
// why: lessons/timeline-lab.md#pms-s4
{
  const { deck } = rig(1000);
  const el = fakeVideo(1.0);
  const mm = mediaMaster(deck, el, { anchorMs: 0, toleranceMs: 5, stallMs: 100000 });
  mm.tick();
  el.presentFrame(1.000, 0);
  mm.tick();
  let used = 0;
  for (let i = 1; i <= 6; i++) {               // six ordinary frames of playback
    el.currentTime = 1.0 + i * 0.016;          // the decoder advances…
    mm.tick();                                 // …and the tick notices it a tick late
    el.presentFrame(1.0 + i * 0.016, 0);       // …and the compositor presents it
    mm.tick();
    used = mm.stats().rvfc.used;
  }
  check('S4 playback-not-gated', used >= 6 && mm.stats().rvfc.superseded === 0,
    `ordinary playback moves currentTime every tick: the sensor must stay ON through it `
    + `(used ${used}, superseded ${mm.stats().rvfc.superseded} — 0 used would be the `
    + `unconditional form of S3, which reads as a working guard and is a switched-off sensor)`);
  mm.dispose(); deck.dispose();
}

if (failures) {
  console.error(`prop-media-sensor: ${failures} VIOLATION(S) in ${checks} checks`);
  process.exit(1);
}
console.log(`prop-media-sensor OK: ${checks} checks, 0 violations`);
console.log('L4b paused OK: a paused element is NOT carried onto the wall clock (the memento defect) / a playing one still is / a frame older than the last move of currentTime is dropped while the picture is frozen, counted, and comes back when a frame is presented / and that test is not applied during playback, where currentTime moves every tick');
