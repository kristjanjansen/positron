// demo/shell/route-core-test.mjs: the routing core against route-vectors/, no browser or socket.
// The vectors' expectations are derived by hand, never by running the core. 31 of 115 asserts
// are negative controls, and each vector's last byte flipped must fail. Run: node <this file>.
// why: lessons/kit-route-core.md#test-header
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
