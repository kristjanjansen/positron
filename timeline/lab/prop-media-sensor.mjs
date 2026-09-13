#!/usr/bin/env node
// timeline/lab/prop-media-sensor.mjs — L4b's SENSOR, and the two ways it can
// lie about a picture that is not moving.
//
//   node timeline/lab/prop-media-sensor.mjs [--verbose]
//
// `timeline/lab/prop-nested.mjs` suite 9 already asserts that a frame sample is
// carried, goes stale, and is rejected across a discontinuity — all of it with
// an element that is PLAYING. This file is the paused half, and it exists
// because that half shipped broken:
//
//   MEASURED on `demo/memento/` (2026-09-13). After a seek with the element
//   PAUSED, the playhead crept forward ~180 ms over the next 250 ms while
//   `currentTime` sat still at the position it had been sent to, then snapped
//   back when the frame sample went stale. It failed the shared `keyboard seek
//   lands` check at `2437 ~ 2225`, and the page worked around it with
//   `useRvfc: false`. The cause: L4b carries a frame sample onto the wall clock
//   as `mediaTime + (wall − expectedDisplayTime) × rate`, and `rate` was read
//   off `playbackRate` alone — WHICH IS 1 ON A PAUSED ELEMENT.
//
// Four checks, and S2/S4 are as important as S1/S3: they are what stops the
// creep being "fixed" by turning the sensor off, which is the repair that makes
// every test here pass and L4b pointless.
//
//   S1  a PAUSED element is not extrapolated          (the reported defect)
//   S2  a PLAYING element still is                    (positive control)
//   S3  while the picture is frozen, a sample older than the last move of
//       `currentTime` is old news and is dropped      (the second guard, which
//                                                      was written down in the
//                                                      file and never wired)
//   S4  …and that test is NOT applied while the picture is moving (positive
//       control: `currentTime` moves every tick during playback and is noticed
//       a tick late, so an unconditional version of S3 switches the sensor off
//       for good — and a fake whose currentTime never changes cannot see it)
//
// Plain node ESM, no deps, no network. Real wall time is the subject here, so
// the sleeps are real and short; the deck runs on the virtual clock as usual.

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

// ===========================================================================
// S1 — THE DEFECT. A paused element after a seek: the picture is frozen on one
//      frame, `currentTime` sits on it, and the playhead must sit on it too for
//      as long as nobody presses anything. Before the fix this read ~+150 ms.
// ===========================================================================
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

// ===========================================================================
// S2 — POSITIVE CONTROL. The carry is the whole point of L4b (measured: it took
//      365 corrections down to 18 at a 5 ms band). A PLAYING element's frame
//      sample must still be carried onto now at `playbackRate`.
// ===========================================================================
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

// ===========================================================================
// S3 — THE SECOND GUARD. Paused, and `currentTime` was moved AFTER the last
//      presented frame (a small scrub — SMALLER than jumpMs, so the existing
//      rejection cannot see it). The frame on the glass is the old one; the
//      only thing that knows where the element was sent is `currentTime`.
// ===========================================================================
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

// ===========================================================================
// S4 — POSITIVE CONTROL FOR S3, AND THE TRAP. `currentTime` moves on nearly
//      every tick during playback, and this file notices it a tick LATE (at
//      `wall`, inside tick()). So an UNCONDITIONAL "the frame must be newer
//      than the last currentTime change" test rejects every sample during
//      ordinary playback and switches L4b off for good.
//
//      ⚠️ A fake element whose currentTime never changes passes that broken
//      version. This check moves it, which is the only reason it can fail.
// ===========================================================================
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
