// rig/box/pappus-test.mjs — the roll and the drift, with no board, no JACK and
// no sound card. Both are pure functions, which is why they can be checked at
// all; the parts that talk to sclang are checked on the board by ear and by the
// frame rate, not here.
//
// Two of these are NEGATIVE CONTROLS — they run the OLD formulas and require
// the check to REJECT them. A check nobody has seen fail is a check you do not
// know you have.
import { rollPappus, driftValues, driftTarget, mulberry32, PARAMS, MODES, DRIFT, CHARACTERS, CHARACTER_NAMES,
         errSearch, errExcerpt, errStatus } from './pappus.mjs';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
};

const range = (name) => {
  const p = PARAMS.find((x) => x[0] === name);
  if (p) return [p[1], p[2]];
  const m = MODES.find((x) => x[0] === name);
  return m ? [m[1], m[2]] : null;
};

console.log('\n== the roll ==');

// 1. Reproducible. This is the whole reason the seed exists.
{
  const a = rollPappus(12345), b = rollPappus(12345);
  ok('the same seed gives the same roll', JSON.stringify(a) === JSON.stringify(b),
     `seed 12345 · ${a.character.m}/${a.character.n} · rate ${a.m.rate}`);
}

// 2. ...and different seeds do not. (Otherwise #1 passes on a constant.)
{
  const a = rollPappus(1), b = rollPappus(2);
  ok('a different seed gives a different roll', JSON.stringify(a) !== JSON.stringify(b),
     `${a.character.m}/${a.character.n} vs ${b.character.m}/${b.character.n}`);
}

// 3. Every value in range, over a real sample. This is the check the old roll fails.
{
  let bad = [];
  for (let s = 0; s < 500; s++) {
    const r = rollPappus(s);
    for (const side of ['m', 'n']) {
      for (const [name, v] of Object.entries(r[side])) {
        const [lo, hi] = range(name);
        if (!(v >= lo && v <= hi)) bad.push(`${side}${name}=${v} outside ${lo}..${hi}`);
        const isMode = MODES.some((x) => x[0] === name);
        if (isMode && !Number.isInteger(v)) bad.push(`${side}${name}=${v} not an integer`);
      }
    }
  }
  ok('500 rolls, every value inside the engine\'s own range', bad.length === 0, bad.slice(0, 3).join(' · ') || '0 bad');
}

// 3b. NEGATIVE CONTROL — the OLD roll, verbatim, must be rejected by the check
//     above. Without this the check could be vacuous.
{
  const oldScanmode = () => Math.floor(Math.random() * 3);      // was: 0..2
  const oldContour  = () => 1 + Math.floor(Math.random() * 8);  // was: 1..8
  let scanBad = 0, contourReach = new Set();
  for (let i = 0; i < 500; i++) {
    const sm = oldScanmode(); const [lo] = range('scanmode');
    if (sm < lo) scanBad++;
    contourReach.add(oldContour());
  }
  const [, contourHi] = range('contour');
  ok('NEGATIVE CONTROL: the old scanmode roll is rejected', scanBad > 0,
     `${scanBad}/500 sent 0, which the engine indexes as -1`);
  ok('NEGATIVE CONTROL: the old contour roll could not reach every shape',
     contourReach.size < contourHi + 1,
     `reached ${contourReach.size} of ${contourHi + 1} shapes`);
}

// 4. The log scale reaches the sparse half. This is the measurable difference
//    between "rolled the numbers" and "rolled a sound you can hear grains in".
{
  const N = 2000;
  let logSparse = 0, linSparse = 0;
  const [lo, hi] = range('rate');
  const rnd = mulberry32(99);
  for (let s = 0; s < N; s++) {
    if (rollPappus(s).m.rate < 3) logSparse++;
    if (lo + (hi - lo) * rnd() < 3) linSparse++;   // what a linear roll would do
  }
  const lp = (100 * logSparse / N).toFixed(1), np = (100 * linSparse / N).toFixed(1);
  ok('rolls reach the sparse half of RATE far more often than a linear roll would',
     logSparse > linSparse * 1.8, `under 3 grains/s: ${lp}% here vs ${np}% linear`);
}

// 5. The two granulators are not one sound twice.
{
  let same = 0;
  for (let s = 0; s < 300; s++) { const r = rollPappus(s); if (r.character.m === r.character.n) same++; }
  ok('the two granulators never draw the same character', same === 0, `${same}/300 collided`);
}

// 6. A character actually constrains — drone is slow, shatter is not.
{
  let droneMax = 0, shatterMin = Infinity, nd = 0, ns = 0;
  for (let s = 0; s < 800; s++) {
    const r = rollPappus(s);
    for (const side of ['m', 'n']) {
      if (r.character[side] === 'drone')   { droneMax = Math.max(droneMax, r[side].rate); nd++; }
      if (r.character[side] === 'shatter') { shatterMin = Math.min(shatterMin, r[side].rate); ns++; }
    }
  }
  ok('a character narrows the range it names', droneMax <= CHARACTERS.drone.rate[1] && shatterMin >= CHARACTERS.shatter.rate[0],
     `drone max ${droneMax}/s (n=${nd}) · shatter min ${shatterMin}/s (n=${ns})`);
}

// 7. The rest of the chain is rolled too — dropping it to gain characters
//    would have been a regression, so it is asserted rather than assumed.
{
  const r = rollPappus(31);
  const has = (o, ks) => ks.every((k) => o[k] !== undefined);
  ok('the roll still covers the whole chain, not just the granulators',
     has(r.chain.window, ['mbuflen', 'mwinstart', 'mwinend', 'melen'])
     && r.chain.euclid.epattern.length === 16
     && r.chain.resonator.pfrq.length === 48 && r.chain.resonator.pamp.length === 48
     && r.chain.taps.taptimes.length === 8
     && has(r.global, ['drive', 'crush', 'crushmode', 'noise', 'noisetype', 'rverb', 'rtime', 'pin1', 'oin2']),
     '48 resonators · 8 taps · 16 euclid steps · colour · reverb · routing');
}

// 8. NEGATIVE CONTROL — the chord selector the old roll used is always true, so
//    one of its two chords could never be chosen. Run it and show it.
{
  let major = 0;
  for (let k = 0; k < 200; k++) {
    // verbatim from the roll this supersedes
    const chord = [0, 3, 7, 10, 14, 17][Math.random() < 0.5 ? 0 : 1] !== undefined ? [0, 3, 7, 10, 14, 17] : [0, 4, 7, 11];
    if (chord.length === 4) major++;
  }
  ok('NEGATIVE CONTROL: the old chord selector could never pick the major chord', major === 0,
     `${major}/200 rolls reached it — index 0 and 1 of that array are both defined, so the test is always true`);
}

// 9. ...and the replacement reaches both, roughly evenly.
{
  let major = 0;
  for (let s = 0; s < 400; s++) if (rollPappus(s).chain.resonator.chord.length === 4) major++;
  ok('both chords are now reachable', major > 120 && major < 280, `${major}/400 major`);
}

// 10. Mode ranges across the merged surface. `crushmode` and `noisetype` were
//     rolled 0..2; the engine indexes `mode - 1`, and noisetype 4..8 selects
//     one of the five shipped loop files, which were unreachable entirely.
{
  const seen = { crushmode: new Set(), noisetype: new Set(), pmodel: new Set(), pgraintype: new Set() };
  for (let s = 0; s < 600; s++) {
    const r = rollPappus(s);
    seen.crushmode.add(r.global.crushmode); seen.noisetype.add(r.global.noisetype);
    seen.pmodel.add(r.chain.resonator.pmodel); seen.pgraintype.add(r.chain.resonator.pgraintype);
  }
  const lo = (s) => Math.min(...s), hi = (s) => Math.max(...s);
  ok('every mode in the chain is one-based and reaches its top value',
     lo(seen.crushmode) === 1 && hi(seen.crushmode) === 3
     && lo(seen.noisetype) === 1 && hi(seen.noisetype) === 8
     && lo(seen.pmodel) === 1 && hi(seen.pmodel) === 2
     && lo(seen.pgraintype) === 1 && hi(seen.pgraintype) === 8,
     `crushmode ${lo(seen.crushmode)}-${hi(seen.crushmode)} · noisetype ${lo(seen.noisetype)}-${hi(seen.noisetype)} (4+ are the loop files) · pgraintype ${lo(seen.pgraintype)}-${hi(seen.pgraintype)}`);
}

// 11. The voices are rolled — but they are a separate block, so a caller with a
//     keyboard attached can decline them without declining the rest.
{
  const r = rollPappus(5);
  ok('the grain voices are a block of their own, so a keyboard can keep them',
     r.voices.pitches.length === 8 && r.voices.gates.length === 8 && !('pitches' in r.global) && !('pitches' in r.m),
     `root ${r.voices.root} · pitches ${r.voices.pitches.join(',')}`);
}

console.log('\n== the drift ==');

const base = rollPappus(7).m;

// 7. It stays in range, over an hour of it.
{
  let bad = [];
  for (let t = 0; t < 3600; t += 0.5) {
    const v = driftValues(base, t, 0);
    for (const [name, val] of Object.entries(v)) {
      const [lo, hi] = range(name);
      if (!(val >= lo && val <= hi)) bad.push(`${name}=${val} at t=${t}`);
    }
  }
  ok('an hour of drift never leaves the parameter\'s range', bad.length === 0, bad.slice(0, 2).join(' · ') || '7200 samples clean');
}

// 8. It MOVES. (The point, and the thing a broken LFO would silently not do.)
{
  const seen = {};
  for (let t = 0; t < 600; t += 1) {
    const v = driftValues(base, t, 0);
    for (const [k, val] of Object.entries(v)) (seen[k] ||= []).push(val);
  }
  const spread = Object.fromEntries(Object.entries(seen).map(([k, a]) => [k, +(Math.max(...a) - Math.min(...a)).toFixed(3)]));
  ok('every drifting parameter actually moves over ten minutes',
     Object.values(spread).every((s) => s > 0.005),
     Object.entries(spread).map(([k, s]) => `${k} ±${(s / 2).toFixed(3)}`).join(' · '));
}

// 9. Integer modes do NOT move. A mode change mid-grain is a click.
{
  const v = driftValues(base, 123.4, 0);
  const touched = MODES.map((m) => m[0]).filter((n) => n in v);
  ok('no integer mode is ever drifted', touched.length === 0, touched.join(',') || 'scanmode/spraymode/swarmmode/contour all untouched');
}

// 10. The two granulators do not breathe together.
{
  let maxGap = 0;
  for (let t = 0; t < 400; t += 1) {
    const a = driftValues(base, t, 0), b = driftValues(base, t, 1);
    maxGap = Math.max(maxGap, Math.abs(a.scan - b.scan));
  }
  ok('the two granulators drift out of phase with each other', maxGap > 0.05, `widest scan gap ${maxGap.toFixed(3)}`);
}

// 11. It does not repeat. Two sines at the golden ratio: the same value at the
//     same phase of the slow sine should NOT bring the same neighbourhood back.
{
  const p = DRIFT.find((d) => d[0] === 'scan')[2];
  const a = driftValues(base, 0, 0).scan;
  const b = driftValues(base, p, 0).scan;        // one slow cycle later
  const c = driftValues(base, p * 2, 0).scan;    // two
  ok('one full cycle of the slow sine does not return the same value',
     Math.abs(a - b) > 0.005 || Math.abs(a - c) > 0.005,
     `scan ${a} -> ${b} -> ${c} across ${p} s cycles`);
}

// 12. Drift is centred on the roll, not on the middle of the range.
{
  let sum = 0, n = 0;
  for (let t = 0; t < 4000; t += 0.5) { sum += driftValues(base, t, 0).scan; n++; }
  const mean = sum / n;
  ok('drift is centred on what the roll set, not on the middle of the range',
     Math.abs(mean - base.scan) < 0.05, `roll set scan ${base.scan}, mean over an hour ${mean.toFixed(3)}`);
}

// ── the centre the drift circles ─────────────────────────────────────────────
//
// A page that sets its sound directly instead of rolling a die still needs the
// slow movement to have something to move AROUND. `driftTarget` is the pure
// half of that: which raw engine commands name a parameter the drift moves.
// The socket half is checked on the board, by the nudge count climbing.
console.log('\n== the centre the drift circles ==');

// 13. Both sides of both spellings, and every drifting name.
{
  const hits = DRIFT.map(([name]) => [driftTarget('m' + name), driftTarget('n' + name)]);
  ok('every drifting parameter is reachable as a command on both halves',
     hits.every(([a, b], i) => a?.[0] === 'm' && b?.[0] === 'n'
                            && a?.[1] === DRIFT[i][0] && b?.[1] === DRIFT[i][0]),
     DRIFT.map(([n]) => 'm' + n + '/n' + n).join(' '));
}

// 14. ...and the negative control, which is the half that matters. A centre
//     that accepted anything would carry keys the drift never reads, and
//     `mrate` would look like it was being moved when integers never drift.
{
  const no = ['mrate', 'nrate', 'pitches', 'gates', 'scan', 'mscanmode', 'msrc', 'mlock', 'xscan', ''];
  const wrong = no.filter((c) => driftTarget(c) !== null);
  ok('a command the drift does not move is not taken as a centre',
     wrong.length === 0, wrong.length ? `accepted ${wrong.join(',')}` : no.length + ' rejected, including mrate and a bare scan');
}

// 15. The centre is what `driftValues` reads, so setting one parameter has to
//     move that parameter's band and leave the others where the roll left them.
{
  const moved = { ...base, scan: 0.10 };
  const a = driftValues(base, 300, 0), b = driftValues(moved, 300, 0);
  ok('moving the centre moves that parameter and nothing else',
     Math.abs(a.scan - b.scan) > 0.05
       && DRIFT.filter(([n]) => n !== 'scan').every(([n]) => a[n] === b[n]),
     `scan ${a.scan} -> ${b.scan}, ${DRIFT.length - 1} others unchanged`);
}

// 16. A centre of one parameter is a legal centre — a page sets `mscan` before
//     it has set anything else, and the drift must move that and say nothing
//     about the five it has never been told.
{
  const v = driftValues({ scan: 0.5 }, 123.4, 0);
  ok('a partial centre drifts what it has and invents nothing',
     Number.isFinite(v.scan) && Object.keys(v).length === 1,
     `keys: ${Object.keys(v).join(',') || 'none'}`);
}

// ── being gentle with somebody else's archive ────────────────────────────────
//
// ERR blocked this board on 2026-09-11 after a day of testing — connection
// refused from the Pi while the same host answered 200 from a laptop. These
// check the three things that caused it. Every one of them counts REQUESTS, on
// a stubbed `fetch`, because "it seemed faster" is not evidence about traffic.
console.log('\n== gentle with the archive ==');

const realFetch = globalThis.fetch;
const stub = (impl) => { globalThis.fetch = impl; };
const restore = () => { globalThis.fetch = realFetch; };

// 13. A closed year is asked for ONCE, ever.
{
  let calls = 0;
  const rows = { activeList: { audioCount: 543, data: [{ type: 'audio', data: [
    { url: 'a-slug', date: '1965-01-10', heading: 'a programme', lead: '' },
  ] }] } };
  stub(async () => { calls++; return { ok: true, status: 200, headers: new Headers(), json: async () => rows }; });
  const dir = mkdtempSync(`${tmpdir()}/pappus-test-`);
  const before = process.env.XDG_CACHE_HOME;
  // ⚠️ CLEAR IT FIRST, NOT ONLY AFTERWARDS. Cleaning up only at the end left
  // the file behind whenever a run died early, and the NEXT run then saw zero
  // requests where it expected one and read FAILED — a test that fails because
  // the last one passed. Watched it happen once; a cache test has to own both
  // ends of the cache.
  const stale = `${errStatus().cacheDir}/search--2208988800--2177452801-1-1.json`;
  rmSync(stale, { force: true });
  try {
    // The cache directory is chosen at import time, so this cannot redirect it —
    // which is the honest thing to say: the test asks the REAL cache whether it
    // asks twice, using a year nothing else uses.
    const YEAR = { from: -2208988800, to: -2177452801 };     // 1900, so no real run collides
    const a = await errSearch({ ...YEAR, limit: 1 });
    const b = await errSearch({ ...YEAR, limit: 1 });
    ok('a year that ended sixty years ago is fetched once, not twice',
       calls === 1 && b.cached === true, `${calls} request(s) for two asks · second was cached=${b.cached}`);
    ok('and the cached answer is the same answer', a.total === b.total && a.items[0]?.slug === b.items[0]?.slug,
       `${b.total} items, first ${b.items[0]?.slug}`);
  } finally {
    restore();
    if (before === undefined) delete process.env.XDG_CACHE_HOME;
    rmSync(dir, { recursive: true, force: true });
    // Do not leave a fake 1900 in the real cache. A test that litters the thing
    // it is testing is a test that changes the next run.
    rmSync(stale, { force: true });
  }
}

// 14. An excerpt already on disk is not pulled again.
//     This is the heavy one: `errExcerpt` runs ffmpeg against their HLS, so one
//     "load" is a stream of segment fetches with no `fetch` call to notice.
{
  const out = `${tmpdir()}/pappus-test-excerpt.wav`;
  writeFileSync(out, Buffer.alloc(4096));       // bigger than a header, so it counts
  const r = await errExcerpt({ hls: 'https://example.invalid/none.m3u8', atSec: 0, durSec: 60, out,
                               ffmpeg: '/nonexistent-ffmpeg' });
  // ⚠️ The ffmpeg path is deliberately not a program. If the cache is ever
  // bypassed this throws ENOENT rather than passing quietly, so the test cannot
  // succeed for the wrong reason.
  ok('an excerpt already on disk is served locally, and ffmpeg is never run',
     r.cached === true && r.tookMs === 0, `cached=${r.cached}`);
  rmSync(out, { force: true });
}

// 15. NEGATIVE CONTROL for the same check: a file too small to be an excerpt
//     must NOT be treated as one, or a failed pull caches itself forever.
{
  const out = `${tmpdir()}/pappus-test-stub.wav`;
  writeFileSync(out, Buffer.alloc(44));         // a bare WAV header: a failed pull
  let threw = null;
  try { await errExcerpt({ hls: 'https://example.invalid/none.m3u8', out, ffmpeg: '/nonexistent-ffmpeg' }); }
  catch (e) { threw = e; }
  ok('NEGATIVE CONTROL: a truncated excerpt is re-pulled rather than served',
     threw !== null, threw ? 'it tried to pull it again, as it should' : 'it served a 44-byte file as audio');
  rmSync(out, { force: true });
}

// 16. A refusal stops the asking. The guard that did not exist is the reason
//     the block happened at all.
{
  let calls = 0;
  stub(async () => { calls++; return { ok: false, status: 429, headers: new Headers(), json: async () => ({}) }; });
  try {
    const YEAR = { from: -2208988800, to: -2177452800 };    // a year with no cache file
    let first = null, second = null;
    try { await errSearch({ ...YEAR, limit: 1 }); } catch (e) { first = e; }
    try { await errSearch({ ...YEAR, limit: 1 }); } catch (e) { second = e; }
    ok('a 429 is not answered with another request', calls === 1,
       `${calls} request(s) after two asks into a refusing archive`);
    ok('...and the second ask says it is holding off, rather than failing',
       second?.holdingOff === true, second?.message ?? 'no error at all');
    ok('the hold-off is reportable, so a page can say why nothing happened',
       errStatus().holdingOff === true && errStatus().forMs > 0,
       `${Math.round(errStatus().forMs / 1000)} s · ${errStatus().lastError}`);
  } finally { restore(); }
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
