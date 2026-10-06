// demo/shell/slide-test.mjs, the slide component graded with no browser.
//
//   node demo/shell/slide-test.mjs
//
// What is pure in `slide.mjs` is graded here: the scale and the custom
// properties written from it, a step's caption, the headline rule, the marks,
// the padded table, the spec checker, and two claims about the source (the
// player's keys are not window-wide, the face files exist and ship).
//
// 🔴 NEGATIVE CONTROLS, per positron-verify's convention for this directory:
// 22 of the checks below, named NEGATIVE, are written so that the bug they name fails them
// (a scale that is too flat, a headline with each banned mark, a full stop
// inside a number that must NOT be flagged, a hue typo, a bad layout, a split
// with no side, the key detector pointed at a file known to listen on
// `document`, a table frame nobody declared, a cell wider than its column, a
// title slide carrying a headline, a speaker with no title, a date that is not
// a day, and a tap in the middle or on a box with no width), because a checker that passes everything and one that refuses
// everything both look green against valid input alone.
//
// NOT GRADED HERE, and graded on `/kit/`'s SLIDES tab instead: anything that
// needs a document. `createSlide`, `createSlidePlayer`, `createSlideLog`,
// `fitBox` and `slideDiagram` are never called; the computed size, line height and
// tracking of every step, the 16:9 box, the caption corner, the split sides,
// spills, the components responding at slide scale and the player's keys are
// all measured there.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  SCALE, STEPS, stepSize, stepOf, stepCaption, scaleCss, plain, parseMarks, lintWords,
  evStep, wordsStep, padRows, padRow, colStarts, tableStep, FRAMES, COL_GAP, normalise, LAYOUTS,
  TITLE_STEPS, talkDate, tapZone, swipeStep, SWIPE_PX,
} from './slide.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? '  ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? '  ' + detail : ''}`); }
};
const throws = (fn) => { try { fn(); return false; } catch { return true; } };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
// Comments out, so an absence is asserted over CODE and never over prose that
// happens to describe it (positron-verify, `instrument-test.mjs`).
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

console.log('\n== the slide ==');

/* ── the scale ─────────────────────────────────────────────────────────── */
/** Everything a scale must be, as a list of what it is not. */
function scaleProblems(sc) {
  const bad = [];
  const n = sc.steps.length;
  for (let i = 2; i <= n; i++) {
    const r = sc.base * sc.ratio ** (i - 1) / (sc.base * sc.ratio ** (i - 2));
    if (r < 1.25) bad.push(`step ${i} is only ${r.toFixed(2)}x step ${i - 1}`);
  }
  for (let i = 1; i < n; i++) {
    if (!(sc.steps[i].lh < sc.steps[i - 1].lh)) bad.push(`line height does not open as step ${i + 1} drops to ${i}`);
    if (!(sc.steps[i].ls <= sc.steps[i - 1].ls)) bad.push(`tracking does not close as step ${i} grows to ${i + 1}`);
  }
  if (sc.steps[0].ls !== 0) bad.push('step 1 is tracked');
  if (sc.base < 2) bad.push('the base is under the 8H floor of 2 per cent');
  return bad;
}
ok('six steps, numbered 1 to 6', STEPS.join() === '1,2,3,4,5,6');
ok('the scale is a scale: each step 1.5x the last, line height opening and tracking closing as it drops',
  scaleProblems(SCALE).length === 0, scaleProblems(SCALE).join('; ') || 'no problems');
ok('NEGATIVE: a scale at ratio 1.1 is refused, so the check can fail',
  scaleProblems({ ...SCALE, ratio: 1.1 }).length >= 5, `${scaleProblems({ ...SCALE, ratio: 1.1 }).length} problems`);
ok('NEGATIVE: a scale whose line height closes as it drops is refused',
  scaleProblems({ ...SCALE, steps: SCALE.steps.map((s, i) => ({ ...s, lh: 1 + i * 0.1 })) }).length >= 5);
ok('step 3 is the archive\'s 9 per cent, exactly', near(stepSize(3), 9));
ok('step 6 is 30.375 per cent, and steps outside 1 to 6 throw',
  near(stepSize(6), 30.375) && throws(() => stepSize(0)) && throws(() => stepSize(7)) && throws(() => stepSize(2.5)));
ok('stepOf carries the three numbers', JSON.stringify(stepOf(4)) === JSON.stringify({ n: 4, size: 13.5, lh: 1.1, ls: -0.03 }));
ok('a step caption names its size, line height and tracking',
  stepCaption(6) === 'step 6 30.38 cqh, line 1.00, tracking -0.060 em' && stepCaption(1) === 'step 1 4.00 cqh, line 1.45, tracking 0 em',
  `"${stepCaption(6)}" and "${stepCaption(1)}"`);

const css = scaleCss('.sl');
const decl = (name) => (css.match(new RegExp(`${name}:\\s*([^;]+);`)) || [])[1];
ok('the custom properties: the base in cqh, each step a calc off the one below',
  decl('--sl-1') === 'calc(var(--sl-base) * 1cqh)'
  && [2, 3, 4, 5, 6].every((n) => decl(`--sl-${n}`) === `calc(var(--sl-${n - 1}) * var(--sl-ratio))`)
  && decl('--sl-base') === '4' && decl('--sl-ratio') === '1.5');
ok('every line height and tracking is written from SCALE, once each',
  SCALE.steps.every((s) => decl(`--sl-${s.n}-lh`) === String(s.lh) && decl(`--sl-${s.n}-ls`) === `${s.ls}em`
    && css.split(`--sl-${s.n}-lh:`).length === 2));

/* ── words ─────────────────────────────────────────────────────────────── */
ok('a headline with none of the banned marks passes', lintWords('Latency is read off a burned clock').length === 0);
ok('a figure with a decimal point is not a full stop', lintWords('Two clocks agree to 1.8 ms').length === 0);
for (const [t, why] of [
  ['Latency: read off a clock', 'a colon'], ['Read it; then trust it', 'a semicolon'],
  ['Read it \u2014 then trust it', 'an em dash'], ['Read it - then trust it', 'a spaced hyphen'],
  ['Read it \u00b7 trust it', 'a middot'], ['Read it off a clock.', 'a full stop'],
]) ok(`NEGATIVE: ${why} in a headline is reported`, lintWords(t).length === 1, lintWords(t).join());
ok('a hyphenated word is not a dash', lintWords('A self-check never runs for a visitor').length === 0);

const runs = parseMarks('MoQ *26.2* through [Cloudflare|cloudflare] to the [Pi|Raspberry]');
ok('marks become runs: plain, accent, hue',
  runs.length === 6 && runs[1].hi && runs[1].text === '26.2' && runs[3].hue === 28 && runs[3].text === 'Cloudflare'
  && runs[5].tech === 'raspberry', JSON.stringify(runs.map((r) => r.text)));
ok('NEGATIVE: a hue name nobody declared throws rather than printing a plain word',
  throws(() => parseMarks('[x|cloudflair]')));
ok('plain() takes the marks out and keeps the words', plain('*26.2* ms on [Pi|raspberry]') === '26.2 ms on Pi');

/* ── tables ────────────────────────────────────────────────────────────── */
const t = padRows({ head: ['', 'p50', 'p99'], body: [['MoQ', '*26.2*', '104.8'], ['WHEP', '67.0', '84.1']], align: 'lrr' });
const ends = t.lines.slice(1).map((l) => plain(l).lastIndexOf('.'));
ok('a right column ends in one character position, and a mark takes no column',
  ends[0] === ends[1] && plain(t.lines[1]).indexOf('26.2') === plain(t.lines[2]).indexOf('67.0'),
  t.lines.map((l) => JSON.stringify(plain(l))).join(' '));
ok('evidence drops to step 2 at four rows', evStep(3) === 3 && evStep(4) === 2);
// a live log pads each row against DECLARED widths, so a row on its own must
// land in the same character columns as the same row inside a whole table
const W = [6, 5, 6, 3];
const r1 = padRow(['0.3', 'timer', '2.30', 'ms'], W, 'rlrl'), r2 = padRow(['12.5', 'frame', '104.80', 'ms'], W, 'rlrl');
ok('a row padded on its own keeps its decimal point in the column of every other',
  r1.lastIndexOf('.') === r2.lastIndexOf('.') && r1.indexOf('timer') === r2.indexOf('frame'), `${JSON.stringify(r1)} ${JSON.stringify(r2)}`);
ok('padRows is padRow over the widest cell, with starts every width plus the gap',
  t.lines[1] === padRow(['MoQ', '*26.2*', '104.8'], t.widths, 'lrr') && colStarts([3, 4]).join() === `0,${3 + COL_GAP}`);
ok('NEGATIVE: a cell wider than its column is never cut and never throws, it pushes its row along',
  !throws(() => padRow(['1234567'], [3])) && padRow(['1234567'], [3]) === '1234567');
ok('a framed table drops to step 2 at three lines, a plain one at four',
  tableStep(3, 'none') === 2 && tableStep(2, 'none') === 3 && tableStep(3, '') === 3 && tableStep(4, '') === 2);
ok('the one frame is none, and a table may have it or not',
  FRAMES.join() === 'none' && !throws(() => normalise({ rows: { body: [['a']], frame: 'none' } }))
  && !throws(() => normalise({ rows: { body: [['a']] } })));
ok('NEGATIVE: the rounded box is gone and throws now', throws(() => normalise({ rows: { body: [['a']], frame: 'box' } })));
ok('NEGATIVE: a frame nobody declared throws', throws(() => normalise({ rows: { body: [['a']], frame: 'rounded' } })));
ok('in a split the words go one step down, never below step 1',
  wordsStep(4, 'split') === 3 && wordsStep(4, 'stack') === 4 && wordsStep(1, 'split') === 1 && wordsStep(3, 'left') === 3);

/* ── the spec ──────────────────────────────────────────────────────────── */
ok('a bare spec is a stack', normalise({ say: 'x' }).layout === 'stack');
ok('all five layouts are known, right was removed', LAYOUTS.join() === 'stack,top,left,split,band');
ok('a split with a slot and a side is fine',
  !throws(() => normalise({ layout: 'split', side: 'left', slot: () => null, say: 'x' })));
ok('NEGATIVE: an unknown layout throws', throws(() => normalise({ layout: 'centre' })));
ok('NEGATIVE: a split with no side throws', throws(() => normalise({ layout: 'split', slot: () => null })));
ok('NEGATIVE: a split with no slot throws', throws(() => normalise({ layout: 'split', side: 'left' })));
ok('a side on a slide that is not a split throws', throws(() => normalise({ layout: 'left', side: 'left' })));
ok('a misspelt key throws rather than drawing nothing', throws(() => normalise({ sya: 'x' })));
ok('a statement carrying evidence throws', throws(() => normalise({ say: 'x', statement: true, big: '1' })));
ok('a line at step 7 throws', throws(() => normalise({ lines: [[7, 'x']] })));

/* ── the title slide ───────────────────────────────────────────────────── */
ok('a title slide is the talk at step 5, who at step 3, when at step 2, each a declared step and in that order',
  TITLE_STEPS.title === 5 && TITLE_STEPS.by === 3 && TITLE_STEPS.date === 2
  && Object.values(TITLE_STEPS).every((n) => STEPS.includes(n)), JSON.stringify(TITLE_STEPS));
ok('a title slide is laid out top unless it says so, and carries a caption',
  normalise({ title: 'x', by: 'y', date: '2026-10-05', place: 'z', cap: 'c' }).layout === 'top');
ok('NEGATIVE: a title slide carrying a headline or a figure throws',
  throws(() => normalise({ title: 'x', say: 'y' })) && throws(() => normalise({ title: 'x', big: '1' })));
ok('NEGATIVE: a speaker with no title throws', throws(() => normalise({ by: 'y' })));
ok('NEGATIVE: a title slide in a split or stack layout throws',
  throws(() => normalise({ title: 'x', layout: 'stack' })));
ok('an ISO day is said as a person says it, anything else is printed as written',
  talkDate('2026-10-05') === '5 October 2026' && talkDate('2026-01-31') === '31 January 2026' && talkDate('autumn 2026') === 'autumn 2026',
  `${talkDate('2026-10-05')}, ${talkDate('2026-01-31')}`);
ok('NEGATIVE: an ISO date that is not a day throws, in talkDate and in the spec',
  throws(() => talkDate('2026-02-30')) && throws(() => normalise({ title: 'x', date: '2026-13-01' })));

/* ── a tap on a player ─────────────────────────────────────────────────── */
ok('a tap on the left third is back, on the right third forward',
  tapZone(10, 300) === -1 && tapZone(290, 300) === 1 && tapZone(99, 300) === -1 && tapZone(201, 300) === 1);
ok('NEGATIVE: a tap in the middle third steps nowhere, its edges included',
  tapZone(150, 300) === 0 && tapZone(100, 300) === 0 && tapZone(200, 300) === 0);
ok('NEGATIVE: a box with no width, or no x, steps nowhere',
  tapZone(10, 0) === 0 && tapZone(NaN, 300) === 0 && tapZone(10, -5) === 0);

/* ── a swipe on a player ───────────────────────────────────────────────── */
ok('a finger moved left goes forward and moved right goes back',
  swipeStep(-80, 5) === 1 && swipeStep(80, -5) === -1 && swipeStep(-SWIPE_PX, 0) === 1);
ok('NEGATIVE: a short drag, or one more down than across, turns nothing',
  swipeStep(-SWIPE_PX + 1, 0) === 0 && swipeStep(-60, 50) === 0 && swipeStep(0, 200) === 0);
ok('NEGATIVE: no numbers, no step',
  swipeStep(NaN, 0) === 0 && swipeStep(-80, Infinity) === 0);

/* ── the source ────────────────────────────────────────────────────────── */
const SRC = readFileSync(join(HERE, 'slide.mjs'), 'utf8');
const C = code(SRC);
/** A keydown listener on window or document (or bare, which is window), in code. */
const globalKeys = (c) => [...c.matchAll(/([\w.]*?)\.?addEventListener\(\s*'keydown'/g)]
  .some((m) => m[1] === '' || /^(window|document)$/.test(m[1].split('.').pop()));
// ⚠️ ONE DOCUMENT LISTENER IS ALLOWED SINCE 2026-10-06, AND ONLY IN FULL
// SCREEN (*"add keyboard control to slides in fullscreen"*): entering full
// screen hides the focused ⛶, so the focus falls to the body. It must open by
// returning unless this player is full, which is when nothing else on the page
// is on screen to want the keys.
const FULL_ONLY = /document\.addEventListener\('keydown', \(e\) => \{\s*if \(!panel\.isFull\(\)/;
ok('the player\'s keys are heard on its panel and stopped there, never on window or document outside full screen',
  /panel\.el\.addEventListener\('keydown'/.test(C) && FULL_ONLY.test(C) && !globalKeys(C.replace(FULL_ONLY, ''))
    && /e\.stopPropagation\(\)/.test(C));
ok('NEGATIVE: a document listener that does not first ask for full screen is still found',
  globalKeys("document.addEventListener('keydown', (e) => { onKey(e); });".replace(FULL_ONLY, '')));
const DECK = join(HERE, '../slides/deck.mjs');
ok('NEGATIVE: the same detector finds the archive deck\'s document-wide listener',
  existsSync(DECK) && globalKeys(code(readFileSync(DECK, 'utf8'))));

const CSS = readFileSync(join(HERE, 'slide.css'), 'utf8');
const urls = [...CSS.matchAll(/url\('\/shell\/(vendor\/[^']+)'\)/g)].map((m) => m[1]);
const BUILD = readFileSync(join(HERE, '../../workers/view/build.mjs'), 'utf8');
ok('the face files exist under shell/vendor and the build lists each one, licence included, the Greek 600 for the logo\'s β among them',
  urls.length === 3 && urls.some((u) => /greek-600/.test(u)) && urls.every((u) => existsSync(join(HERE, u)) && BUILD.includes(`'shell/${u}'`))
  && BUILD.includes("'shell/vendor/LICENSE-jetbrains-mono'") && existsSync(join(HERE, 'vendor/LICENSE-jetbrains-mono')),
  urls.join(', '));
ok('no em dash and no middot in the module or its stylesheet',
  !/[\u2014\u00b7]/.test(SRC) && !/[\u2014\u00b7]/.test(CSS));
ok('nothing in a comment reads as an import to the build', !/\/\/.*import\(|\*.*import\(/.test(SRC));

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
