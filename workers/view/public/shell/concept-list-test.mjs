// demo/shell/concept-list-test.mjs: every card description on the front page against the
// card rule in .claude/skills/positron-describe/SKILL.md. No browser.
//
//   node demo/shell/concept-list-test.mjs
//
// Fails on a `say` (CONCEPTS or DEMO_CARDS) over 100 characters, or holding an
// em dash, a middot or a semicolon, and prints each offender with its length.
// Also on a backtick: until 2026-10-12 thirty demo cards carried the plan's
// evidence column (`fau/index.html:356`) as their card text, and a code path
// is never card text.
// Asked 2026-10-12 on the WebRTC loopback card: *"too long. make a rule to
// skill"*. 100 characters is about three lines on a card at 1280 and at 375.
// And, since 2026-10-13 when the concepts became the front page at
// /<group>/<slug>/ (*"rename all with group/slug, rm numbers"*), every row's id:
// two segments, the folder one of CONCEPT_DIRS, the slug the title in
// lowercase words joined by hyphens, no number for a segment, no id twice, and a
// page on disk at demo/<id>/index.html.
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

const slugOf = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const seen = new Set();
for (const c of CONCEPTS) {
  const why = [];
  const [dir, slug, ...rest] = String(c.id || '').split('/');
  if (!c.id || rest.length || !slug) why.push('id is not <group>/<slug>');
  else {
    if (!CONCEPT_DIRS.includes(dir)) why.push(`folder ${dir} is not in CONCEPT_DIRS`);
    if (slug !== slugOf(c.title)) why.push(`slug ${slug} is not the title's, ${slugOf(c.title)}`);
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
