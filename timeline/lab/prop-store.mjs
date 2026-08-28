// timeline/lab/prop-store.mjs — the STORE property test. Standalone:
//
//     node timeline/lab/prop-store.mjs                 # full (builds a 1M-row fixture once)
//     node timeline/lab/prop-store.mjs --quick         # 100k instead of 1M, no bench
//     node timeline/lab/prop-store.mjs --no-do         # skip the network arm
//     node --expose-gc timeline/lab/prop-store.mjs     # exact heap numbers
//
// Five arms, matching the five claims store.mjs makes:
//   store-memory  the memory backend is BEHAVIOURALLY IDENTICAL to today's array
//                 (same rows, same order, same brackets, same cursor trajectory)
//   store-jsonl   1M rows: cmp/call ~constant, resident memory bounded,
//                 seek-anywhere correct, and a COLD seek reports its miss policy
//   store-do      the deployed elektron-instrument KEPT session, read-only:
//                 same event count, same order
//   store-append  3 appends MID-PLAYBACK land in order; the cursor stays valid
//   bench         rows x backend x (open, cold seek, warm advance, memory)
//
// Exits nonzero on violation. MACHINE RULE: port 8892 only (bench-store.mjs).

import { performance } from 'node:perf_hooks';
import {
  memoryStore, jsonlStore, doStore, openStore, isGhost, driveStore,
} from '../store.mjs';
import { createCursor, createTransport, createVirtualRuntime, createDeck } from '../transport.mjs';
import {
  ensureFixture, serveFixtures, genRows, mulberry32, runBench, formatTable,
  DO_BASE, DO_SESSION,
} from './bench-store.mjs';

const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const NO_DO = args.includes('--no-do');
const NO_BENCH = args.includes('--no-bench') || QUICK;
const BIG = args.includes('--rows') ? +args[args.indexOf('--rows') + 1] : (QUICK ? 100_000 : 1_000_000);
const VERBOSE = args.includes('--verbose');

let failures = 0, checks = 0;
function check(arm, ok, msg, extra) {
  checks++;
  if (ok) { if (VERBOSE) console.log(`  ok   ${arm}: ${msg}`); return true; }
  failures++;
  console.error(`  FAIL ${arm}: ${msg}${extra === undefined ? '' : `\n       ${JSON.stringify(extra)}`}`);
  return false;
}
const say = (s) => console.log(s);

// ---------------------------------------------------------------------------
// ARM 1 — store-memory: byte-compatible with today's array.
//
// "Today's array" here is literal: createCursor(rows) straight off a plain JS
// array, which is exactly what transport.mjs's cursorFor(kind) builds over
// byKind's lane. If the store's memory backend diverges from that in ANY probe,
// every measured number in Checkpoint 7 stops meaning what it says.
// ---------------------------------------------------------------------------
async function armMemory() {
  say('\n[store-memory] identical to today\'s array');
  const rand = mulberry32(1234);
  // the prop-test trace shape: ties at the same ms + 1 ms clusters + sparse
  const rows = [];
  let at = 0;
  for (let i = 0; i < 3000; i++) {
    const r = rand();
    if (r < 0.15 && rows.length) at = rows[rows.length - 1].at;         // exact tie
    else if (r < 0.35) at = +(at + 1).toFixed(3);                        // 1 ms cluster
    else at = +(at + rand() * 60).toFixed(3);                            // sparse
    rows.push({ at, kind: ['midi', 'pointer', 'cue'][i % 3], seq: i, payload: { v: i } });
  }
  const truthArr = rows.map((r) => ({ ...r }));

  const reader = await memoryStore(rows).open();
  check('store-memory', reader.rows === rows, 'reader.rows is the SAME array object (identity, not a copy)');
  check('store-memory', reader.count === rows.length, 'count matches');

  // same rows, same order
  const sl = reader.slice(0, reader.count);
  check('store-memory', sl.length === truthArr.length &&
    sl.every((r, i) => r.at === truthArr[i].at && r.seq === truthArr[i].seq && r.kind === truthArr[i].kind),
    'slice(0,count) reproduces the array exactly, in order');

  // same brackets AND the same cursor trajectory (comparisons, hits, searches)
  const truth = createCursor(truthArr);
  const probes = [];
  let p = -50;
  for (let i = 0; i < 6000; i++) { probes.push(p); p += rand() * 30; }         // forward sweep
  for (let i = 0; i < 400; i++) probes.push(rand() * rows[rows.length - 1].at); // random access
  for (let i = probes.length - 1; i >= 0; i -= 7) probes.push(probes[i]);       // backward walk

  let mismatch = null;
  for (const pos of probes) {
    const a = truth.bracket(pos, 1);
    const b = reader.bracketAt(pos, 1);
    if (!a && !b) continue;
    if (!a || !b || a.i !== b.i || a.u !== b.u || a.aAt !== b.aAt || a.bAt !== b.bAt ||
        a.a.seq !== b.a.seq || a.b.seq !== b.b.seq ||
        a.prevs.length !== b.prevs.length || a.nexts.length !== b.nexts.length) { mismatch = { pos, a, b }; break; }
  }
  check('store-memory', !mismatch, 'every bracket (i, u, aAt, bAt, a, b, prevs, nexts) equals the raw-array cursor',
    mismatch && { pos: mismatch.pos, ai: mismatch.a && mismatch.a.i, bi: mismatch.b && mismatch.b.i });

  const ts = truth.stats(), rs = reader.stats().cursor;
  check('store-memory', ts.comparisons === rs.comparisons && ts.searches === rs.searches &&
    ts.advances === rs.advances && ts.hits === rs.hits,
    `identical cursor trajectory: ${ts.comparisons} comparisons / ${ts.searches} searches / ${ts.advances} advances / ${ts.hits} hits`,
    { truth: ts, store: rs });
  check('store-memory', reader.stats().misses === 0 && reader.resident().residentFraction === 1,
    'a memory backend never misses and is 100% resident');

  // ... and a DECK driven off the store fires the same ids in the same order.
  const mk = (items) => {
    const vr = createVirtualRuntime(0);
    const fired = [];
    const deck = createDeck({
      clock: vr.clock, tickHost: vr.host, autoStart: true, tailMs: 10,
      items: items.map((r) => ({ at: r.at, kind: 'k', id: `e${r.seq}`, payload: r })),
      adapters: { k: { caps: { catchUp: 'burst' }, actuate: (pl) => fired.push(pl.seq) } },
    });
    deck.play(); vr.advanceTo(rows[rows.length - 1].at + 100); deck.pause(); deck.dispose();
    return fired;
  };
  const fA = mk(truthArr), fB = mk(reader.slice(0, reader.count));
  check('store-memory', fA.length === fB.length && fA.every((v, i) => v === fB[i]),
    `a deck driven from the store fires the identical sequence (${fA.length} fires)`);
  await reader.close();
}

// ---------------------------------------------------------------------------
// ARM 2 — store-jsonl: 1M rows over Range-fetched pages.
//
// The fixture's rows carry seq === their row index, so `bracket.a.seq === b.i`
// is a total ground truth for the page arithmetic without ever holding 1M rows
// in memory — which is the entire point of the exercise.
// ---------------------------------------------------------------------------
async function armJsonl() {
  say(`\n[store-jsonl] ${BIG.toLocaleString()} rows, Range-fetched pages + index sidecar`);
  const t0 = performance.now();
  const fx = await ensureFixture(BIG);
  say(`  fixture ${(fx.bytes / 1048576).toFixed(1)} MB, sidecar ${(fx.indexBytes / 1024).toFixed(1)} KB ` +
      `(${fx.index.pageCount} pages x ${fx.index.pageRows} rows)${fx.cached ? ' [cached]' : ` in ${((performance.now() - t0) / 1000).toFixed(1)}s`}`);
  check('store-jsonl', fx.indexBytes < fx.bytes / 500,
    `the sidecar is O(rows/pageRows): ${(fx.indexBytes / 1024).toFixed(1)} KB index for ${(fx.bytes / 1048576).toFixed(1)} MB of log (${(fx.bytes / fx.indexBytes).toFixed(0)}x)`);

  const srv = await serveFixtures();
  try {
    // --- (a) COLD SEEK reports its miss policy honestly, before anything else.
    const cold = await jsonlStore({ url: srv.url(fx.jsonl), indexUrl: srv.url(fx.idx) }).open();
    const lastAt = fx.index.pages[fx.index.pages.length - 1].lastAt;
    const farPos = lastAt * 0.77;
    const seen = [];
    const offMiss = cold.onMiss((m) => seen.push(m));
    const br0 = cold.bracketAt(farPos);
    check('store-jsonl', br0 && br0.cold === true && br0.ghosts > 0,
      `a cold seek to ${farPos.toFixed(0)} ms answers, flags itself cold, and does NOT stall`, br0 && { cold: br0.cold, ghosts: br0.ghosts });
    check('store-jsonl', seen.length > 0 && seen[0].policy === 'late' && seen[0].action === 'fire-late' && seen[0].origin === 'store-miss',
      `the miss is REPORTED with the policy that produced it: ${seen.length} record(s), ${seen[0] && seen[0].action}`, seen[0]);
    check('store-jsonl', isGhost(br0.a) || isGhost(br0.b), 'the answer is a flagged GHOST, never a silently wrong row');
    // ghost keys are monotone: the bisect converged on the RIGHT page
    check('store-jsonl', br0.page === Math.floor(seen[0].i / fx.index.pageRows) ||
      Math.abs(fx.index.pages[br0.page].firstAt - farPos) < lastAt,
      'the ghost key kept the binary search on the correct page');
    const truePage = (() => {
      let lo = 0, hi = fx.index.pages.length - 1;
      while (lo < hi) { const m = (lo + hi + 1) >> 1; if (fx.index.pages[m].firstAt <= farPos) lo = m; else hi = m - 1; }
      return lo;
    })();
    check('store-jsonl', br0.page === truePage,
      `cold bracket landed on page ${br0.page}; the true page for that position is ${truePage}`);
    offMiss();
    // now REPAIR: ensure the window and re-read — same position, real rows
    await cold.ensure(farPos, farPos + 1000);
    const br1 = cold.bracketAt(farPos);
    check('store-jsonl', br1 && br1.cold === false && br1.a.seq === br1.i && br1.b.seq === br1.i + 1,
      `after ensure() the same position is warm and exact: a.seq=${br1 && br1.a.seq} === i=${br1 && br1.i}`);
    check('store-jsonl', br1.aAt <= farPos && farPos <= br1.bAt, 'the pair actually straddles the position');
    await cold.close();

    // --- (b) the other two policies say something different, and say it clearly
    for (const policy of ['skip', 'stall']) {
      const r = await jsonlStore({ url: srv.url(fx.jsonl), indexUrl: srv.url(fx.idx), missPolicy: policy }).open();
      const recs = [];
      r.onMiss((m) => recs.push(m));
      r.bracketAt(lastAt * 0.31);
      const sl = r.slice(1000, 1010);
      check('store-jsonl', recs.length > 0 && recs[0].policy === policy &&
        recs[0].action === (policy === 'skip' ? 'gap' : 'stall'),
        `missPolicy '${policy}' reports action '${recs[0] && recs[0].action}'`);
      if (policy === 'skip') check('store-jsonl', sl.length === 0 && sl.gaps.length === 1 && sl.gaps[0][0] === 1000,
        `'skip' omits the rows and reports the gap ${JSON.stringify(sl.gaps)}`);
      await r.close();
    }

    // --- (c) SEEK ANYWHERE, 200 times, with bounded residency
    const reader = await jsonlStore({ url: srv.url(fx.jsonl), indexUrl: srv.url(fx.idx), maxPages: 8 }).open();
    const rand = mulberry32(99);
    let bad = null, maxResident = 0;
    for (let s = 0; s < 200; s++) {
      const pos = lastAt * rand();
      await reader.ensure(pos, pos + 500);
      const br = reader.bracketAt(pos);
      if (!br || br.cold || br.a.seq !== br.i || !(br.aAt <= pos && pos <= br.bAt)) { bad = { pos, br }; break; }
      maxResident = Math.max(maxResident, reader.resident().rows);
    }
    check('store-jsonl', !bad, '200 random seek-anywhere reads are exact (a.seq === i, pair straddles pos)',
      bad && { pos: bad.pos, i: bad.br && bad.br.i, seq: bad.br && bad.br.a && bad.br.a.seq, cold: bad.br && bad.br.cold });
    const res = reader.resident();
    check('store-jsonl', maxResident <= res.ceilingRows,
      `resident set stayed inside the ceiling: max ${maxResident} rows <= ${res.ceilingRows} (${res.maxPages} pages x ${res.pageRows}) over a ${res.totalRows.toLocaleString()}-row log`);

    // --- (d) cmp/call stays ~constant as n grows, and so does the CEILING.
    //     "bounded memory for an unbounded log" is exactly this: the ceiling is
    //     a function of maxPages x pageRows and of NOTHING ELSE.
    const sweepCmp = async (rd, from, steps, stepMs) => {
      await rd.ensure(from, from + steps * stepMs);
      const c0 = rd.stats().cursor ? rd.stats().cursor.comparisons : 0;
      for (let k = 0; k < steps; k++) rd.bracketAt(from + k * stepMs);
      return (rd.stats().cursor.comparisons - c0) / steps;
    };
    const small = await ensureFixture(10_000);
    const rSmall = await jsonlStore({ path: small.jsonl, indexPath: small.idx }).open();
    const cSmall = await sweepCmp(rSmall, small.index.pages[0].firstAt, 4000, 8);   // 8 ms steps ~ a 120 Hz render
    const cBig = await sweepCmp(reader, fx.index.pages[Math.floor(fx.index.pages.length / 2)].firstAt, 4000, 8);
    const cSmallRes = rSmall.resident(), cBigRes = reader.resident();
    check('store-jsonl', cSmallRes.ceilingRows === cBigRes.ceilingRows,
      `the memory CEILING is independent of n: ${cBigRes.ceilingRows.toLocaleString()} rows at 10k and at ${BIG.toLocaleString()} ` +
      `(${(cBigRes.residentFraction * 100).toFixed(3)}% of the big log, ${(cSmallRes.residentFraction * 100).toFixed(1)}% of the small one)`);
    check('store-jsonl', cBig < 6 && cSmall < 6 && Math.abs(cBig - cSmall) < 1.5,
      `forward-sweep comparisons/call is flat in n: ${cSmall.toFixed(2)} at 10k rows, ${cBig.toFixed(2)} at ${BIG.toLocaleString()} rows (a rescan would be ~${(BIG / 2).toLocaleString()})`);
    say(`  cmp/call 10k=${cSmall.toFixed(2)}  ${(BIG / 1000).toFixed(0)}k=${cBig.toFixed(2)}   ` +
        `resident ${res.rows}/${res.ceilingRows} rows (${(res.residentFraction * 100).toFixed(3)}%)  ` +
        `requests ${reader.stats().requests}`);
    await rSmall.close();
    await reader.close();
  } finally { await srv.close(); }
}

// ---------------------------------------------------------------------------
// ARM 3 — store-do: the deployed elektron-instrument KEPT session. READ-ONLY.
// ---------------------------------------------------------------------------
async function armDo() {
  say(`\n[store-do] ${DO_SESSION} @ ${DO_BASE} (read-only)`);
  let truth;
  try {
    const r = await fetch(`${DO_BASE}/session/${DO_SESSION}?from=0&limit=20000`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    truth = await r.json();
  } catch (e) {
    console.error(`  SKIP store-do: session unreachable (${e.message})`);
    return;
  }
  const reader = await doStore({ base: DO_BASE, session: DO_SESSION, pageRows: 128 }).open();
  check('store-do', reader.count === truth.total,
    `event count reproduced: ${reader.count} === ${truth.total}`);
  await reader.ensureIndex(0, reader.count - 1);         // pull every page (4 of them)
  let bad = null;
  const got = [];
  for (let i = 0; i < reader.count; i++) {
    const a = reader.at(i), b = truth.events[i];
    got.push(a);
    if (isGhost(a)) { bad = { i, why: 'ghost after ensureIndex' }; break; }
    if (a.at !== b.at || a.kind !== b.kind || a.source !== b.source || a.seq !== b.seq) { bad = { i, a, b }; break; }
  }
  check('store-do', !bad, `all ${reader.count} rows match the API's own order, field for field`, bad);
  check('store-do', got.every((r, i) => i === 0 || r.at >= got[i - 1].at),
    'rows are non-decreasing in `at` — the cursor contract holds over a paged DO read');
  const lanes = reader.lanes.map((l) => `${l.source}/${l.kind}:${l.n}`).join(' ');
  say(`  ${reader.count} rows, ${reader.resident().pages.length} pages @ ${reader.pageRows}; lanes ${lanes}`);
  // the positional read works over pages the API cannot query positionally
  const mid = truth.events[Math.floor(truth.events.length / 2)].at;
  const br = reader.bracketAt(mid);
  check('store-do', br && br.a.at <= mid && mid <= br.b.at && !br.cold,
    `bracketAt over the DO-paged log straddles a real stamp (i=${br && br.i})`);
  await reader.close();
}

// ---------------------------------------------------------------------------
// ARM 4 — store-append: the log grows UNDER the playhead.
//
// Real transport, virtual clock, rate 1. The reader is JSONL-backed (the hard
// case: an immutable indexed prefix plus a live tail). Three appends land at
// three different moments; the cursor is never reset and never re-seeks.
// ---------------------------------------------------------------------------
async function armAppend() {
  say('\n[store-append] 3 appends mid-playback, cursor stays valid');
  const fx = await ensureFixture(10_000);
  const reader = await jsonlStore({ path: fx.jsonl, indexPath: fx.idx }).open();
  const n0 = reader.count;
  const lastAt = reader.at(n0 - 1).at;
  await reader.ensureIndex(n0 - 4096, n0 - 1);

  const vr = createVirtualRuntime(0);
  const transport = createTransport({ clock: vr.clock });
  // put the playhead 200 ms before the end of the indexed log and play forward
  const start = lastAt - 200;
  transport.seek(start);
  transport.play(1);

  const observed = [];
  const appended = [];
  const cursorIs = [];
  let injected = 0;
  let lastI = -1;
  for (let step = 0; step < 600; step++) {
    vr.advanceTo(step * 2);                       // 2 ms per step, rate 1 => +2 ms position
    const pos = transport.position();
    // the horizon read the scheduler would do
    const br = reader.bracketAt(pos);
    if (br) {
      cursorIs.push(br.i);
      if (br.i !== lastI) { observed.push(br.a); lastI = br.i; }
    }
    // THE LIVE APPENDS: 60 ms ahead of the playhead, one every 150 steps
    if (injected < 3 && step > 0 && step % 150 === 0) {
      const row = { at: +(pos + 60).toFixed(3), kind: 'cue', seq: 1_000_000 + injected, payload: { live: injected } };
      const res = reader.appendBatch([row]);
      appended.push(row);
      check('store-append', res.appended === 1 && res.rejected === 0 && res.cursorReset === false,
        `append #${injected + 1} at pos ${row.at} accepted with NO cursor reset`, res);
      injected++;
    }
  }
  transport.pause();
  // the LAST row of a log is only ever the RIGHT member of a bracket (the cursor
  // indexes pairs, so j <= n-2). Once the playhead is past it, count it as walked.
  {
    const br = reader.bracketAt(transport.position());
    if (br && transport.position() >= br.bAt) observed.push(br.b);
  }

  check('store-append', reader.count === n0 + 3, `count grew ${n0} -> ${reader.count}`);
  check('store-append', reader.tailCount === 3 && reader.indexedCount === n0,
    'the live tail is separate from the immutable indexed prefix, and is never evicted');
  check('store-append', reader.stats().cursorResets === 0,
    'THE PROOF: the cursor was never reset — an append at the end cannot move an index it holds');
  check('store-append', cursorIs.every((v, i) => i === 0 || v >= cursorIs[i - 1]),
    'the cursor index advanced monotonically across every append');

  const seenLive = observed.filter((r) => r && r.payload && r.payload.live !== undefined).map((r) => r.payload.live);
  check('store-append', seenLive.length === 3 && seenLive[0] === 0 && seenLive[1] === 1 && seenLive[2] === 2,
    `all 3 appended rows were reached by the moving playhead, IN ORDER: [${seenLive}]`, { seenLive, observedTail: observed.slice(-6).map((r) => r && r.seq) });
  check('store-append', observed.every((r, i) => i === 0 || r.at >= observed[i - 1].at),
    'the sequence the playhead walked is still sorted after three live appends');

  // an OUT-OF-ORDER append is the one case that CAN move an index; it is taken,
  // kept sorted, and REPORTED (never silent) — the DO's per-source rule in miniature
  const back = reader.appendBatch([{ at: reader.at(reader.count - 3).at - 1, kind: 'cue', seq: 2_000_000, payload: { late: true } }]);
  check('store-append', back.appended === 1 && back.reordered === 1,
    `an out-of-order append is inserted in sorted position and reported: reordered=${back.reordered}, cursorReset=${back.cursorReset}`);
  const tail = reader.slice(reader.count - 5, reader.count);
  check('store-append', tail.every((r, i) => i === 0 || r.at >= tail[i - 1].at),
    'the log is still sorted after the out-of-order insert');
  await reader.close();

  // and the same thing through the FULL deck: overdub during playback
  {
    const rows = genRows(200);
    const vr2 = createVirtualRuntime(0);
    const fired = [];
    const deck = createDeck({
      clock: vr2.clock, tickHost: vr2.host, autoStart: true, tailMs: 500,
      items: rows.map((r) => ({ at: r.at, kind: 'k', id: `e${r.seq}`, payload: r })),
      adapters: { k: { caps: { catchUp: 'burst' }, actuate: (pl) => fired.push(pl.seq) } },
    });
    const mem = await memoryStore(rows).open();
    const n0m = rows.length;         // memoryStore shares the array BY IDENTITY: rows.length moves
    deck.play();
    for (let s = 0; s < 3; s++) {
      vr2.advanceTo(rows[rows.length - 1].at * (0.2 + s * 0.2));
      const at = deck.position() + 50;
      const row = { at, kind: 'k', seq: 900_000 + s, payload: { live: s } };
      deck.schedule({ at, kind: 'k', id: `live${s}`, payload: row });
      mem.appendBatch([row]);
    }
    vr2.advanceTo(rows[rows.length - 1].at + 400);
    deck.pause();
    const live = fired.filter((v) => v >= 900_000);
    check('store-append', live.length === 3 && live[0] === 900_000 && live[1] === 900_001 && live[2] === 900_002,
      `a running deck fires the 3 live-appended events in order too: [${live}]`);
    check('store-append', mem.count === n0m + 3 && mem.stats().cursorResets === 0,
      'the memory store mirrored the same 3 appends with no cursor reset',
      { count: mem.count, expected: n0m + 3, resets: mem.stats().cursorResets, appends: mem.stats().appends });
    deck.dispose(); await mem.close();
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
const t0 = performance.now();
await armMemory();
await armJsonl();
if (!NO_DO) await armDo(); else say('\n[store-do] skipped (--no-do)');
await armAppend();

if (!NO_BENCH) {
  say('\n[bench] rows x backend x (open, cold seek, warm advance, memory)');
  const rows = await runBench({ sizes: [10_000, 100_000, BIG], withDo: !NO_DO, log: (s) => say(s) });
  say(formatTable(rows));
  if (!global.gc) say('  (heap MB are un-GC\'d deltas; run with `node --expose-gc` for exact numbers)');
}

const secs = ((performance.now() - t0) / 1000).toFixed(1);
if (failures) {
  console.error(`\nprop-store: ${failures} VIOLATION(S) in ${checks} checks (${secs}s)`);
  process.exit(1);
}
console.log(`\nprop-store OK: ${checks} checks, 0 violations (${secs}s)`);
console.log('  memory === today\'s array (rows, order, brackets, cursor trajectory, deck fire sequence)');
console.log(`  jsonl @ ${BIG.toLocaleString()} rows: flat cmp/call, bounded residency, exact seek-anywhere, cold seek reports fire-late`);
console.log('  do: the KEPT instrument session reproduced count-for-count and order-for-order, read-only');
console.log('  append-live: 3 appends under a moving playhead, in order, zero cursor resets');
