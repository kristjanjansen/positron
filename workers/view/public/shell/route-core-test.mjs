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
// NAIVE SUITE BY PASSING EVERYTHING THROUGH. Counted 2026-10-03:
//   - Inside the vectors, 24 of the 91 input steps and link attempts (71 steps,
//     20 links) are there to be dropped, held, refused or left alone, each one
//     marked NEGATIVE CONTROL in its vector's `notes` or listed under `refused`.
//   - Every vector is also run against a COPY OF ITS OWN EXPECTATION WITH ITS
//     LAST BYTE FLIPPED, and that comparison must FAIL. Ten asserts that check
//     the check can fail. ⚠️ The first version flipped only data bytes and went
//     red on 10, whose last event is a one byte F8: the self check caught itself.
//   - Five direct refusals at link time (unknown op, bad args, an input range
//     written backwards, a duplicate id, a kind nobody named).
//   So 15 of the 47 asserts are negative controls outright, 21 run the vectors
//   and 11 check that the vectors name only known ops, kinds, verbs and codes.
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
// ⚠️ WHAT NO SABOTAGE HERE TOUCHED: `transpose`, `velocity`, `only`, `drop`,
// `range`, `vrange`, `fixed` and `deny()` have no vector yet. They are bay's
// ops carried over so its transforms run here unchanged, and until a vector
// names them they are code, not contract.

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
const vectors = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()
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
