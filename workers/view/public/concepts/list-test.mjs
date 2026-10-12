// demo/concepts/list-test.mjs: every card description on /concepts/ against the
// card rule in .claude/skills/positron-describe/SKILL.md. No browser.
//
//   node demo/concepts/list-test.mjs
//
// Fails on a `say` (CONCEPTS or DEMO_CARDS) over 100 characters, or holding an
// em dash, a middot or a semicolon, and prints each offender with its length.
// Also on a backtick: until 2026-10-12 thirty demo cards carried the plan's
// evidence column (`fau/index.html:356`) as their card text, and a code path
// is never card text.
// Asked 2026-10-12 on the WebRTC loopback card: *"too long. make a rule to
// skill"*. 100 characters is about three lines on a card at 1280 and at 375.
import { CONCEPTS, DEMO_CARDS } from './list.mjs';

export const MAX = 100;
const BANNED = [['—', 'em dash'], ['·', 'middot'], [';', 'semicolon'], ['`', 'backtick']];

const cards = [
  ...CONCEPTS.map((c) => [c.n, c.say]),
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

for (const { id, why, say } of bad) console.log(`FAIL ${id}: ${why.join(', ')}\n     ${say}`);
const lens = cards.map(([, s]) => (s || '').length).sort((a, b) => a - b);
const median = lens[Math.floor(lens.length / 2)];
console.log(`${cards.length} cards, ${bad.length} failing, median ${median}, longest ${lens.at(-1)} (limit ${MAX})`);
process.exit(bad.length ? 1 : 0);
