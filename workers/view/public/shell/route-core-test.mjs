// demo/shell/route-core-test.mjs: the routing core against its vectors, with
// no browser, no socket and no instrument.
//
//   node demo/shell/route-core-test.mjs
//
// 🔴 THE VECTORS ARE THE CONTRACT AND THIS FILE ONLY RUNS THEM. Every file in
// `demo/shell/route-vectors/` carries its expected output DERIVED BY HAND, with
// the arithmetic in its `notes`, and none was produced by running
// `route-core.mjs`. A vector written by running the code grades the code
// against itself and passes every bug it already has.
//
// NEGATIVE CONTROLS, AND THE PROPORTION IS STATED BECAUSE A ROUTER PASSES A
// NAIVE SUITE BY PASSING EVERYTHING THROUGH. Recounted 2026-10-04 after 23 to
// 26 landed, one per op the plan's §12 listed as not yet in the reference:
//   - Inside the vectors, 92 of the 276 input steps and link attempts (214
//     steps, 62 links) are there to be dropped, held, refused or left alone,
//     each one marked NEGATIVE CONTROL in its vector's `notes` or listed under
//     `refused`. It was 24 of 91 across 01 to 10, 57 of 165 across 01 to 17
//     and 67 of 210 across 01 to 22; 23 to 26 bring 25 of 66.
//     Counted per step: a step dropped on one link and kept on the other
//     counts once.
//   - Every vector is also run against a COPY OF ITS OWN EXPECTATION WITH ITS
//     LAST BYTE FLIPPED, and that comparison must FAIL. Twenty-six asserts that
//     check the check can fail. ⚠️ The first version flipped only data bytes and
//     went red on 10, whose last event is a one byte F8: the self check caught
//     itself.
//   - Five direct refusals at link time (unknown op, bad args, an input range
//     written backwards, a duplicate id, a kind nobody named).
//   So 31 of the 115 asserts are negative controls outright, 56 run the vectors
//   (26 refusals, 26 outputs, 4 held counts) and 28 check that the vectors are
//   well formed (the count, index.json, and one per vector naming only known
//   ops, kinds, verbs and codes). It was 99 before 23 to 26.
//
// 🔴 SABOTAGED ONCE, 2026-10-03, ON A SCRATCH COPY of `route-core.mjs`,
// `midi-kinds.mjs`, this file and the vectors, so the live file was never
// broken while another session shared the checkout. Each change run alone, then
// the copy restored and read 47/47 again. Red asserts per sabotage, MEASURED:
//   1. ties rounded half up (`Math.round(num / den)`): 1 red (05). ⚠️ It was 0
//      red before 05 gained its negative tie: 04's tie is positive and both
//      rules agree on it. Found by planning this sabotage, not by running it.
//   2. truncation instead of rounding: 2 red (04, 05).
//   3. the cycle check removed from `link()`: 2 red (07 refusals and output).
//   4. `unlink()` releases nothing: 1 red (08).
//   5. the gate's `confirm` treated as `allow`: 2 red (09 output and held).
//   6. `thin` measured from the last event SEEN, not the last KEPT: 1 red (10).
//   7. a note on at velocity 0 counted as a press: 2 red (06 flips on it, 08
//      then thinks 64 is still sounding and releases it).
//   8. ops skipped and the gate wide open, a core that passes everything:
//      9 red across 8 of the 10 vectors (only 01 and 07 have nothing to change).
//   9. links dispatched newest first: 3 red (01, 08, 09, the interleaved ones).
//  10. `accepts` not checked: 1 red (02).
//
// 🔴 SABOTAGED AGAIN, 2026-10-03, ONCE PER OP THAT 11 TO 17 FIRST NAMED, the
// same way: a scratch copy of the core, the test and the vectors, each change
// alone, the copy restored and read 77/77. Red asserts, MEASURED:
//  11. `transpose` clamps to 0..127 instead of dropping: 1 red (11).
//  12. `velocity` scales every note, releases included: 1 red (12).
//  13. `velocity` without its floor of 1: 1 red (12, where 0.25 of v 1 would
//      become a release).
//  14. `only` passes everything: 1 red (13).
//  15. `drop` drops nothing: 1 red (13).
//  16. `range` filters note ons only and lets every note off through: 1 red (14).
//  17. `range` with its top bound exclusive: 1 red (14).
//  18. `vrange` filters releases on their velocity too: 1 red (15).
//  19. `fixed` sets the velocity of every note, releases included: 1 red (16).
//  20. `deny()` does nothing: 1 red (17, the later confirm releases both).
//  21. a denied SysEx stream delivers its later chunks: 1 red (17).
//  22. ops skipped and the `allow` check removed from the gate (`accepts` still
//      read): 14 red across 14 of the 17 vectors. Only 01, 02 and 07 have
//      nothing for it to change. 09's held count survives this one, because the
//      entry is still pushed onto the held list before it is delivered.
//
// 🔴 SABOTAGED A THIRD TIME, 2026-10-03, ONCE PER THING 18 TO 22 DECIDE, the
// same way, the copy restored and read 99/99. Red asserts, MEASURED:
//  23. the release on unlink sorted DESCENDING, note offs and CC 123 both:
//      1 red (18). It was 0 red before 18, in both languages: 08 leaves one
//      note sounding, so the order was a sentence and not a promise.
//  24. only the note offs descending: 1 red (18).
//  25. only the CC 123s descending: 1 red (18).
//  26. the release in play order, no sort at all: 1 red (18).
//  27. a chunk that is only F7 dropped and the stream left open, as it was:
//      1 red (19).
//  28. `velocity` as `Math.round(v * scale)`, as it was: 1 red (20, the tie
//      45 at 0.7). 12 stays green, its scales are exact in binary.
//  29. `velocity` taking any scale above 0, as it did: 2 red (20 refusals, and
//      its output, since 0.0004 then links and floors every note on to 1).
//  30. a policy key read verbatim, as it was: 1 red (21). Its held count stays
//      green, because touch then falls to allow and nothing is held at the end
//      either way.
//  31. `thin` reading a backwards t as no time passed: 1 red (22).
//
// 🔴 SABOTAGED A FOURTH TIME, 2026-10-04, ONCE OR MORE PER OP 23 TO 26 NAME
// (`curve`, `velcurve`, `notecc`), the same way, the copy restored and read
// 115/115. Red asserts, MEASURED:
//  32. `curve` ignoring its `cc`: 1 red (23, CC 7 gets curved).
//  33. `curve` ignoring its `cls`: 1 red (24). 🔴 IT WAS 0 RED ON THE FIRST RUN.
//      24's l2 was a full identity table, so a CC curved by it came out
//      unchanged and looked exactly like a CC skipped. l2 is now identity only
//      from 64 up, which still grades a bend's exactness at and above centre.
//  34. a bend's points read as plain p * 128, so 127 is 16256: 1 red (24).
//  35. a bend curved on its MSB alone, the LSB kept: 1 red (24).
//  36. a channel touch's pressure read from the third byte: 1 red (24).
//  37. `curveAt` truncating: 3 red (23, 24, 25, it is shared by both curves).
//  38. `curveAt` with `Math.round`: 1 red (24, the negative tie -1.5).
//  39. `curveAt` extrapolating past both end points instead of clamping, then
//      floored to the value's range: 2 red (23, 25). 🔴 THE SAME AT THE LOW END
//      ALONE WAS 0 RED ON THE FIRST RUN. 23's first out was 0, so an
//      extrapolation floored at 0 read as the clamp. Its first out is 4 now.
//      23's top clamp is still blind to this (its last out is 127), and 25's
//      is not (its last out is 120).
//  40. points with equal inputs allowed: 2 red (25 refusals and output).
//  41. no limit of 16 points: 2 red (23 refusals and output).
//  42. `velcurve` without its floor of 1: 1 red (25).
//  43. `velcurve` curving releases too: 1 red (25).
//  44. `notecc` reading a note on at velocity 0 as a press: 1 red (26).
//  45. `notecc` sending every CC on channel 1: 1 red (26).
//  46. `notecc`'s `'vel'` read as a fixed 127: 1 red (26).
//  47. `notecc` taking any word for `on`: 2 red (26 refusals and output).
// ⚠️ ONE SABOTAGE OF THE THIRD RUN WENT GREEN AND IS EQUIVALENT, NOT A HOLE: `deny()` emptying
// its list without marking the entry denied. The entry is unreachable, the held
// count reads from the list, and a later chunk of that stream is appended to
// the orphan and never delivered, so nothing a vector can observe differs.
// ⚠️ `deny()`'s return value, how many it dropped, is not read by any vector:
// the runner calls it and discards the answer.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createCore, fromHex, toHex, OP_NAMES, VERBS, REFUSALS } from './route-core.mjs';
import { canonKind } from './midi-kinds.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? '\n       ' + detail : ''}`); }
};

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'route-vectors');
// `index.json` is the list a browser reads, because a page cannot list a directory.
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'index.json').sort();
const INDEX = JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8'));
const vectors = FILES
  .map((f) => ({ file: f, ...JSON.parse(readFileSync(join(DIR, f), 'utf8')) }));

/** A rule's match in a vector is hex with `xx` for any byte. */
const matchOf = (s) => String(s).trim().split(/\s+/).map((h) => (h.toLowerCase() === 'xx' ? null : parseInt(h, 16)));

/** Run one vector through a fresh core. Answers what came out, what was refused and what is held. */
function run(v) {
  const core = createCore();
  for (const p of v.ports) core.addPort({ ...p, rules: (p.rules || []).map((r) => ({ match: matchOf(r.match), do: r.do })) });
  const refused = [];
  for (const l of v.links) {
    const r = core.link(l);
    if (!r.ok) refused.push({ link: l.id, reason: r.reason });
  }
  const out = [];
  for (const s of v.in) {
    const t = s.t ?? 0;
    if (s.unlink !== undefined) out.push(...core.unlink(s.unlink, t));
    else if (s.confirm !== undefined) out.push(...core.confirm(s.confirm, t));
    else if (s.deny !== undefined) core.deny(s.deny);
    else out.push(...core.input({ port: s.port, t, bytes: fromHex(s.bytes) }));
  }
  const held = {};
  for (const p of v.ports) held[p.id] = core.held(p.id);
  return { out, refused, held };
}

const line = (e) => `${e.port} @${e.t ?? 0} ${typeof e.bytes === 'string' ? toHex(fromHex(e.bytes)) : toHex(e.bytes)}`;
const sameOut = (got, want) => got.length === want.length && got.every((e, i) => line(e) === line(want[i]));
const diff = (got, want) => `want [${want.map(line).join(' | ')}]\n       got  [${got.map(line).join(' | ')}]`;
const refusedLine = (r) => r.map((x) => `${x.link}:${x.reason}`).join(' ');
const heldOk = (got, want) => Object.entries(want).every(([k, n]) => got[k] === n);

console.log('\n== route-core: the vectors are well formed ==');

ok(`at least ten vectors (${vectors.length})`, vectors.length >= 10);
ok('index.json names exactly the vector files, so /rout/ runs every one',
  JSON.stringify(INDEX) === JSON.stringify(FILES), `index ${INDEX.join(',')} files ${FILES.join(',')}`);
for (const v of vectors) {
  const ops = v.links.flatMap((l) => (l.ops || []).map((o) => o.op));
  const kinds = v.ports.flatMap((p) => [...(p.accepts || []), ...Object.keys(p.policy || {})]);
  const verbs = v.ports.flatMap((p) => [...Object.values(p.policy || {}), ...(p.rules || []).map((r) => r.do)]);
  ok(`${v.file}: names only known ops, kinds, verbs and refusal codes`,
    typeof v.name === 'string' && Array.isArray(v.in) && Array.isArray(v.out)
      && ops.every((o) => OP_NAMES.includes(o))
      && kinds.every((k) => canonKind(k) !== null)
      && verbs.every((x) => VERBS.includes(x))
      && (v.refused || []).every((r) => REFUSALS.includes(r.reason)),
    `ops ${ops.join(',')} kinds ${kinds.join(',')} verbs ${verbs.join(',')}`);
}

console.log('\n== route-core: every vector ==');

for (const v of vectors) {
  const got = run(v);
  ok(`${v.file}: refusals at link time`, refusedLine(got.refused) === refusedLine(v.refused || []),
    `want [${refusedLine(v.refused || [])}] got [${refusedLine(got.refused)}]`);
  ok(`${v.file}: ${v.name}`, sameOut(got.out, v.out), diff(got.out, v.out));
  if (v.held) ok(`${v.file}: held at the end`, heldOk(got.held, v.held), `want ${JSON.stringify(v.held)} got ${JSON.stringify(got.held)}`);
}

console.log('\n== route-core: the comparison can fail (NEGATIVE CONTROLS) ==');

for (const v of vectors) {
  const got = run(v);
  const broken = v.out.length
    ? v.out.map((e, i) => (i === v.out.length - 1 ? { ...e, bytes: toHex(fromHex(e.bytes).map((b, j, all) => (j === all.length - 1 ? b ^ 1 : b))) } : e))
    : [{ port: 'nowhere', t: 0, bytes: 'F8' }];
  ok(`${v.file}: one byte changed in the expectation reads as different`, !sameOut(got.out, broken));
}

console.log('\n== route-core: refusals made directly (NEGATIVE CONTROLS) ==');

{
  const core = createCore();
  core.addPort({ id: 'a', dir: 'in' });
  core.addPort({ id: 'b', dir: 'out' });
  ok('an op nobody defined is refused: unknown-op',
    core.link({ id: 'x1', from: 'a', to: 'b', ops: [{ op: 'arpeggiate' }] }).reason === 'unknown-op');
  ok('a channel of 17 is refused: bad-args',
    core.link({ id: 'x2', from: 'a', to: 'b', ops: [{ op: 'channel', to: 17 }] }).reason === 'bad-args');
  ok('a scale whose input range is backwards is refused: bad-args, since only the OUTPUT may invert',
    core.link({ id: 'x3', from: 'a', to: 'b', ops: [{ op: 'scale', lo: 100, hi: 20, lo2: 0, hi2: 127 }] }).reason === 'bad-args');
  core.link({ id: 'y', from: 'a', to: 'b', ops: [] });
  ok('a second link with the same id is refused: duplicate',
    core.link({ id: 'y', from: 'a', to: 'b', ops: [] }).reason === 'duplicate');
  let threw = false;
  try { core.addPort({ id: 'c', dir: 'out', accepts: ['notes'] }); } catch { threw = true; }
  ok('a port that accepts a kind nobody named is refused when it is added', threw);
}

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
