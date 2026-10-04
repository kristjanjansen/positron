// demo/shell/timebase-test.mjs: when a light event lands against a heavy link, with no browser.
//
//   node demo/shell/timebase-test.mjs
//
// `timebase.mjs` takes every time it uses as an argument, so the whole policy
// is gradable here. Every expected value below is worked out by hand in the
// comment above it, from the module's stated rule and not from its code,
// because a test that recomputes the module's formula catches a typo and never
// a misreading (the `timeline/csound.mjs` lesson).
//
// ELEVEN OF THE 39 ARE NEGATIVE CONTROLS, marked `NEGATIVE CONTROL` and counted
// at the end. They are written so the bug they name fails them.
//
// SEVEN SABOTAGES, MEASURED 2026-10-04, each run on a copy of the module in a
// scratch directory with this file beside it, 39/39 before every one:
//
//   S1  the median replaced by the last observation         2 red
//   S2  the peer offset's sign flipped                      8 red
//   S3  a step never confirmed, so the line never moves     2 red
//   S4  an unknown stamp clock read as 0 when following     1 red
//   S5  the rate ignored when anchoring a recording         1 red
//   S6  `decide` firing now when it cannot tell             1 red
//   S7  deviants pushed straight into the median window     3 red
//
// ⚠️ S2 HAS A SURVIVOR AND IT IS RIGHT TO SURVIVE. `following the video,
// shared 60000 fires at local 59929.5` stays green with the sign flipped,
// because when the light event and the video are stamped on the same shared
// clock, follow is `S - d` and the receiver's own offset cancels out. A
// receiver that follows a shared-stamped link does not need to have agreed a
// clock itself; only the senders do. Kept, not tuned away (plan §3.3).
//
// WHAT IS NOT GRADED HERE: whether any real transport's observations look
// like the ones fed in. The jitter, the step sizes and the latencies are
// positron's measured figures (plan §3), but they are typed in, not observed.
// Grading against a real stream is plan step 3 and later.

import { createTimebase, beatToShared, nextBeat } from './timebase.mjs';

let pass = 0, fail = 0, neg = 0;
const ok = (name, cond, detail = '') => {
  if (name.startsWith('NEGATIVE CONTROL')) neg++;
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ', ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ', ' + detail : ''}`); }
};
const near = (a, b, e = 1e-6) => typeof a === 'number' && Math.abs(a - b) <= e;

console.log('\n== the peer clock ==');
{
  // shared = local + offset. 137.5 is the injected skew rig/peer.mjs's own
  // self-test uses, kept so the two files read alike.
  const tb = createTimebase({ offsetMs: 137.5 });
  ok('local 1000 is shared 1137.5', near(tb.toShared(1000), 1137.5), String(tb.toShared(1000)));
  ok('shared 1137.5 is local 1000', near(tb.toLocal(1137.5), 1000), String(tb.toLocal(1137.5)));

  const none = createTimebase();
  ok('NEGATIVE CONTROL: no peer clock is null, not zero',
    none.toShared(1000) === null && none.toLocal(1000) === null);
  const r = none.fireAt({ due: { shared: 60_000 } }, 59_000);
  ok('NEGATIVE CONTROL: a scheduled event holds without a peer clock',
    r.local === null && /peer clock/.test(r.why), r.why);
  none.setOffset(0);
  ok('an offset of exactly 0 is a real answer once given', near(none.toLocal(60_000), 60_000));
}

console.log('\n== a link read by its own stamps (LL-HLS PDT, a recording) ==');
{
  // An LL-HLS link about 4 s behind: at local L the PDT on the glass is L - 4000,
  // so d = stamp - local = -4000. Five polls with +-10 ms of read jitter:
  // d = -4000, -4010, -3990, -4005, -3995, sorted -4010 -4005 -4000 -3995 -3990,
  // median -4000. A cue stamped 7500 is presented at local 7500 + 4000 = 11500.
  const tb = createTimebase();
  tb.link('hls');
  const polls = [[10_000, 6_000], [10_100, 6_090], [10_200, 6_210], [10_300, 6_295], [10_400, 6_405]];
  for (const [local, stamp] of polls) tb.observe('hls', { local, stamp });
  const t = tb.fireAt({ due: { stamp: 7_500, on: 'hls' } }, 10_400);
  ok('a cue stamped 7500 fires at local 11500', near(t.local, 11_500), `${t.local}, ${t.why}`);
  ok('a stamp-on-link cue needs no peer clock (none was given)', tb.offsetMs === null && t.local !== null);

  // One late timer read: d = -3000, 1000 ms off the median, past stepMs 120.
  // It is one deviant of the three a step needs, so nothing moves: still 11500.
  const one = tb.observe('hls', { local: 10_500, stamp: 7_500 });
  ok('NEGATIVE CONTROL: one late read does not move the cue',
    near(tb.fireAt({ due: { stamp: 7_500, on: 'hls' } }, 10_500).local, 11_500) && one.moved === false,
    one.why);

  // A normal read after it clears the deviant: d = 10_600 -> stamp 6_600, d -4000.
  tb.observe('hls', { local: 10_600, stamp: 6_600 });
  ok('a normal read after a lone deviant clears it', tb.stats('hls').pending === 0);

  // hls.js raises its target by 1 s per stall and a drift-seek moves the
  // playhead (MEASURED, positron-streaming). Model a 2 s step later: three reads
  // at d = -6000. After the third the line moves and the cue lands at
  // 7500 + 6000 = 13500.
  let moved = null;
  for (const local of [11_000, 11_100, 11_200]) moved = tb.observe('hls', { local, stamp: local - 6_000 });
  ok('three reads 2 s later move the line', moved.moved === true && tb.stats('hls').moves === 1, moved.why);
  ok('and the same cue now fires at local 13500', near(tb.fireAt({ due: { stamp: 7_500, on: 'hls' } }, 11_200).local, 13_500),
    String(tb.fireAt({ due: { stamp: 7_500, on: 'hls' } }, 11_200).local));
}
{
  // Two deviants then a normal read: no step (pending cleared), line unchanged.
  const tb = createTimebase();
  tb.link('hls');
  for (const l of [0, 100, 200]) tb.observe('hls', { local: l, stamp: l - 4_000 });
  tb.observe('hls', { local: 300, stamp: 300 - 6_000 });
  tb.observe('hls', { local: 400, stamp: 400 - 6_000 });
  tb.observe('hls', { local: 500, stamp: 500 - 4_000 });
  tb.observe('hls', { local: 600, stamp: 600 - 6_000 });
  ok('NEGATIVE CONTROL: two deviants, a normal read, one more deviant is not a step',
    tb.stats('hls').moves === 0 && near(tb.stats('hls').d, -4_000), JSON.stringify(tb.stats('hls')));

  // Deviants that alternate sides are jitter, not a step: +500, -500, +500.
  const j = createTimebase();
  j.link('w');
  for (const l of [0, 100, 200]) j.observe('w', { local: l, stamp: l - 70 });
  j.observe('w', { local: 300, stamp: 300 - 70 + 500 });
  j.observe('w', { local: 400, stamp: 400 - 70 - 500 });
  j.observe('w', { local: 500, stamp: 500 - 70 + 500 });
  ok('NEGATIVE CONTROL: deviants alternating sides never make a step',
    j.stats('w').moves === 0 && near(j.stats('w').d, -70), JSON.stringify(j.stats('w')));

  // A refused observation changes nothing.
  const before = j.stats('w').d;
  const r = j.observe('w', { local: NaN, stamp: 5 });
  ok('NEGATIVE CONTROL: a non-finite observation is refused and moves nothing',
    r.ok === false && j.stats('w').d === before && j.stats('w').refused === 1, r.why);
}

console.log('\n== a link whose stamps are on the shared clock (follow) ==');
{
  // A WHEP-like link whose sender stamps peer-clock time (stampOffsetMs 0), on a
  // receiver whose offset is 137.5. A frame captured at shared 50000 is shown 67
  // ms later (WHEP p50 glass to glass, MEASURED) at shared 50067 = local 49929.5.
  // d = 50000 - 49929.5 = 70.5. lag = shared now - shared presented
  //   = (L + 137.5) - (L + 70.5) = 67.
  const tb = createTimebase({ offsetMs: 137.5 });
  tb.link('whep', { stampOffsetMs: 0 });
  tb.observe('whep', { local: 49_929.5, stamp: 50_000 });
  ok('the lag is 67 ms', near(tb.lag('whep', 49_929.5), 67), String(tb.lag('whep', 49_929.5)));
  // A light event that happened at shared 60000, following the video:
  // shared 60000 is local 59862.5, plus 67 = 59929.5.
  const f = tb.fireAt({ due: { shared: 60_000, follow: 'whep' } }, 59_000);
  ok('following the video, shared 60000 fires at local 59929.5', near(f.local, 59_929.5), `${f.local}, ${f.why}`);
  // Without follow it fires on the peer clock: local 59862.5.
  ok('without follow it fires at local 59862.5', near(tb.fireAt({ due: { shared: 60_000 } }, 59_000).local, 59_862.5));
  // A sound sink with Quest's MEASURED 24 ms output latency leaves 24 ms early.
  ok('a 24 ms output latency fires 24 ms earlier, local 59838.5',
    near(tb.fireAt({ due: { shared: 60_000 } }, 59_000, { leadMs: 24 }).local, 59_838.5));
}
{
  // LL-HLS by PDT: the stamps are Cloudflare's ingest clock, which nobody has put
  // on the peer clock. Following it must HOLD, not assume 0.
  const tb = createTimebase({ offsetMs: 0 });
  tb.link('hls');
  tb.observe('hls', { local: 10_000, stamp: 6_000 });
  const r = tb.fireAt({ due: { shared: 20_000, follow: 'hls' } }, 10_000);
  ok('NEGATIVE CONTROL: following a link with an unknown stamp clock holds', r.local === null, r.why);
  // Calibrated later (plan step 4 measures it): stamp + 250 = shared.
  // d = -4000, lag = L - (L - 4000 + 250) = 3750, so shared 20000 lands at 23750.
  tb.link('hls', { stampOffsetMs: 250 });
  ok('once calibrated at +250 ms the lag is 3750', near(tb.lag('hls', 10_000), 3_750), String(tb.lag('hls', 10_000)));
  ok('and shared 20000 following it fires at local 23750',
    near(tb.fireAt({ due: { shared: 20_000, follow: 'hls' } }, 10_000).local, 23_750));
  ok('calibrating kept the observation', tb.stats('hls').n === 1);
}

console.log('\n== the scheduler verdict ==');
{
  const tb = createTimebase({ offsetMs: 137.5 });
  const ev = { due: { shared: 60_000 } };                        // local 59862.5
  ok('before it is due: wait', tb.decide(ev, 59_800).act === 'wait');
  ok('within a 100 ms horizon: fire, with the exact local time',
    tb.decide(ev, 59_800, { horizonMs: 100 }).act === 'fire' && near(tb.decide(ev, 59_800, { horizonMs: 100 }).local, 59_862.5));
  const late = tb.decide(ev, 59_872.5);
  ok('10 ms late: fire, lateMs 10', late.act === 'fire' && near(late.lateMs, 10), JSON.stringify(late));
  ok('20 s late against a 15 s window: missed', tb.decide(ev, 59_862.5 + 20_000).act === 'missed');
  ok('as it happens fires now', tb.decide({ type: 'light.set' }, 5_000).act === 'fire'
    && near(tb.decide({ type: 'light.set' }, 5_000).local, 5_000));
  const unk = createTimebase().decide(ev, 59_862.5, { horizonMs: Infinity });
  ok('NEGATIVE CONTROL: cannot tell is hold even with an infinite horizon', unk.act === 'hold', unk.why);
}

console.log('\n== a recording, and its rate ==');
{
  // Playing at 1x: at local 1000 the playhead is at 0 ms, d = -1000. A cue at
  // media 30000 fires at local 31000.
  const tb = createTimebase();
  tb.link('rec');
  tb.observe('rec', { local: 1_000, stamp: 0 });
  ok('at 1x, media 30000 is local 31000', near(tb.localForStamp('rec', 30_000), 31_000));
  // Varispeed to 2x: at local 5000 the playhead is at 8000. 22000 of media to go
  // at 2 per ms of local is 11000, so local 16000. The rate change re-anchors.
  const r = tb.observe('rec', { local: 5_000, stamp: 8_000, rate: 2 });
  ok('at 2x from (5000, 8000), media 30000 is local 16000', near(tb.localForStamp('rec', 30_000), 16_000),
    String(tb.localForStamp('rec', 30_000)));
  ok('a rate change counts as a move', r.moved === true && tb.stats('rec').moves === 1, r.why);
  tb.observe('rec', { local: 6_000, stamp: 10_000, rate: 0 });
  const p = tb.fireAt({ due: { stamp: 30_000, on: 'rec' } }, 6_000);
  ok('NEGATIVE CONTROL: a paused recording holds its cues', p.local === null, p.why);
}

console.log('\n== the loop clock ==');
{
  // 122 bpm (the Circuit's own tempo, plan-xr-together): a beat is 60000/122 =
  // 491.8032787 ms. Beat 4 from epoch 1000000 is 1000000 + 1967.2131148.
  const clock = { bpm: 122, epoch: 1_000_000 };
  ok('beat 4 at 122 bpm is 1001967.2131', near(beatToShared(clock, 4), 1_001_967.2131148, 1e-4), String(beatToShared(clock, 4)));
  // At 1000500 we are 1.0167 beats in, so the next beat is 2, at 1000983.6066.
  const nb = nextBeat(clock, 1_000_500);
  ok('the next beat after 1000500 is beat 2 at 1000983.6066', nb.beat === 2 && near(nb.shared, 1_000_983.6065574, 1e-4), JSON.stringify(nb));
  ok('the next bar of four after 1000500 is beat 4', nextBeat(clock, 1_000_500, 4).beat === 4);
  ok('a time exactly on a beat is that beat', nextBeat(clock, beatToShared(clock, 8), 4).beat === 8);
  const tb = createTimebase({ offsetMs: -9.85 });                  // the Pi correction /jam/ MEASURED
  // beat 4 shared 1001967.2131 is local 1001967.2131 + 9.85 = 1001977.0631.
  ok('a beat due on the loop clock fires on the peer clock',
    near(tb.fireAt({ due: { beat: 4, clock } }, 1_000_000).local, 1_001_977.0631148, 1e-4));
  ok('NEGATIVE CONTROL: a clock with no tempo is not a clock', beatToShared({ bpm: 0, epoch: 0 }, 1) === null
    && tb.fireAt({ due: { beat: 1, clock: { bpm: 0, epoch: 0 } } }, 0).local === null);
}

console.log('\n== malformed input from the wire ==');
{
  const tb = createTimebase({ offsetMs: 0 });
  const bad = [
    { due: 'soon' },
    { due: { stamp: 'x', on: 'hls' } },
    { due: { stamp: 5, on: 'nobody' } },
    { due: { shared: 5, follow: 'nobody' } },
    { due: {} },
  ];
  const got = bad.map((e) => tb.fireAt(e, 0));
  ok('NEGATIVE CONTROL: five malformed events all hold and none throws',
    got.every((g) => g.local === null), got.map((g) => g.why).join(' | '));
}

console.log(`\n${pass} ok, ${fail} failed, ${neg} of them negative controls`);
process.exit(fail ? 1 : 0);
