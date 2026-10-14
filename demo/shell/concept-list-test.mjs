// demo/shell/concept-list-test.mjs: every card `say` against positron-describe's card rule (100 chars,
// no em dash, middot, semicolon or backtick), and every id: two segments, a CONCEPT_DIRS folder, one
// plain lowercase word, unique, not the group's name, with demo/<id>/index.html on disk. No browser.
// why: lessons/kit-concept-list.md#test-header
import { existsSync } from 'node:fs';
import { CONCEPTS, DEMO_CARDS, CONCEPT_DIRS } from './concept-list.mjs';

export const MAX = 100;
const BANNED = [['—', 'em dash'], ['·', 'middot'], [';', 'semicolon'], ['`', 'backtick']];

const cards = [
  ...CONCEPTS.map((c) => [c.id, c.say]),
  ...Object.entries(DEMO_CARDS).map(([slug, c]) => [slug, c.say]),
];

const bad = [];
for (const [id, say] of cards) {
  const why = [];
  if (typeof say !== 'string' || !say.trim()) why.push('empty');
  else {
    if (say.length > MAX) why.push(`${say.length} chars`);
    for (const [ch, name] of BANNED) if (say.includes(ch)) why.push(name);
  }
  if (why.length) bad.push({ id, why, say });
}

const seen = new Set();
for (const c of CONCEPTS) {
  const why = [];
  const [dir, slug, ...rest] = String(c.id || '').split('/');
  if (!c.id || rest.length || !slug) why.push('id is not <group>/<slug>');
  else {
    if (!CONCEPT_DIRS.includes(dir)) why.push(`folder ${dir} is not in CONCEPT_DIRS`);
    if (!/^[a-z]+$/.test(slug)) why.push(`slug ${slug} is not one plain lowercase word`);
    if (slug === dir) why.push(`slug ${slug} repeats its group`);
    if (/^\d+$/.test(slug) || /^\d+$/.test(dir)) why.push('a number for a segment');
    if (!existsSync(new URL(`../${c.id}/index.html`, import.meta.url))) why.push('no page at demo/' + c.id + '/index.html');
  }
  if (seen.has(c.id)) why.push('id twice');
  seen.add(c.id);
  if ('n' in c) why.push('an `n` field, the numbered scheme');
  if (why.length) bad.push({ id: c.id, why, say: c.title });
}

for (const { id, why, say } of bad) console.log(`FAIL ${id}: ${why.join(', ')}\n     ${say}`);
const lens = cards.map(([, s]) => (s || '').length).sort((a, b) => a - b);
const median = lens[Math.floor(lens.length / 2)];
console.log(`${cards.length} cards, ${bad.length} failing, median ${median}, longest ${lens.at(-1)} (limit ${MAX})`);
process.exit(bad.length ? 1 : 0);
