// demo/shell/bar-drill-test.mjs: the drill's verdicts, and its agreement with
// the harness it copies, with no browser at all.
//
//   node demo/shell/bar-drill-test.mjs
//
// Two halves. The first grades the six verdicts `bar-drill.mjs` makes, and a
// named proportion of them are NEGATIVE CONTROLS: a bar that says it is playing
// and has not moved, a pause that drifts by one unit, a seek that lands 3 per
// cent out, a strip of dark pixels. Those are the bars the drill exists to
// fail, so a verdict that passed everything would go red here.
//
// The second half is the reason this file exists. `bar-drill.mjs` is the
// harness's drill re-run by a page, and two copies of one measurement are a
// measurement that will disagree. So this reads `demo/verify.mjs`, strips its
// comments (an absence or presence asserted over raw source grades the prose,
// `positron-verify`), and requires every number in `DRILL` to be the number
// the harness uses.
//
// NOT GRADED HERE: `drillBar` itself, which needs a document, a real bar and
// real time. `/kit/`'s TAB PAGE block runs it against a live bar and against a
// bar whose clock is frozen, which must fail exactly one row.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  DRILL, judgePosition, judgeLattice, judgePlay, judgePause, judgeSeek, judgeInk, countInk,
} from './bar-drill.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ': ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ': ' + detail : ''}`); }
};

console.log('the verdicts');
ok('a number is a position', judgePosition(0).pass);
ok('NEGATIVE: undefined is not a position, which is the wrapper-over-api bug', !judgePosition(undefined).pass);
ok('a null lattice is allowed', judgeLattice(null).pass);
ok('an array lattice is allowed', judgeLattice([0.5, 1, 2]).pass);
ok('NEGATIVE: undefined lattice fails', !judgeLattice(undefined).pass);

ok('play: playing and further on passes', judgePlay({ pos: 0 }, { pos: 480, playing: true }).pass);
ok('NEGATIVE: playing and not moved fails, which is the frozen clock', !judgePlay({ pos: 0 }, { pos: 0, playing: true }).pass);
ok('NEGATIVE: moved but not playing fails', !judgePlay({ pos: 0 }, { pos: 480, playing: false }).pass);

ok('pause: stopped and still passes', judgePause(1000, 1000.5, false).pass);
ok('NEGATIVE: drifting by one unit fails', !judgePause(1000, 1001, false).pass);
ok('NEGATIVE: still but playing fails', !judgePause(1000, 1000, true).pass);

ok('seek: half way passes', judgeSeek(30_000, [0, 60_000]).pass);
ok('seek: inside 2 per cent passes', judgeSeek(31_100, [0, 60_000]).pass);
ok('NEGATIVE: 3 per cent out fails', !judgeSeek(31_800, [0, 60_000]).pass);
ok('NEGATIVE: never moved from 0 fails', !judgeSeek(0, [0, 60_000]).pass);
ok('seek: a range not starting at 0 aims at its own middle', judgeSeek(150, [100, 200]).pass && !judgeSeek(100, [100, 200]).pass);

const px = (rgbs) => {
  // one pixel per stride, so each entry is one sample
  const a = new Uint8ClampedArray(rgbs.length * 4 * DRILL.inkStride);
  rgbs.forEach(([r, g, b], i) => { const o = i * 4 * DRILL.inkStride; a[o] = r; a[o + 1] = g; a[o + 2] = b; a[o + 3] = 255; });
  return a;
};
ok('ink: one bright sample counts', countInk(px([[0, 0, 0], [200, 200, 0]])) === 1);
ok('NEGATIVE: a dark strip has no ink, 30+30+30 is the floor', countInk(px([[30, 30, 30], [10, 10, 10]])) === 0);
ok('ink verdict', judgeInk(3, 1).pass && !judgeInk(0, 3).pass);

console.log('the harness says the same numbers');
const here = fileURLToPath(new URL('../verify.mjs', import.meta.url));
const raw = readFileSync(here, 'utf8');
const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const from = code.indexOf('if (meta.hasT)');
const to = code.indexOf("ok('strip has ink'", from);
const block = from >= 0 && to > from ? code.slice(from, to) : '';
ok('found the drill block in verify.mjs', block.length > 500, `${block.length} chars`);

const has = (name, re) => ok(name, re.test(block), String(re));
has(`play waits ${DRILL.playMs} ms`, new RegExp(`click\\(\\)\`\\);\\s*await sleep\\(${DRILL.playMs}\\)`));
has(`pause waits ${DRILL.pauseMs} ms then ${DRILL.holdMs} ms`,
  new RegExp(`await sleep\\(${DRILL.pauseMs}\\);[\\s\\S]{0,80}const a[\\s\\S]{0,80}await sleep\\(${DRILL.holdMs}\\)`));
has(`hold tolerance is ${DRILL.holdTol}`, new RegExp(`Math\\.abs\\(b - a\\) < ${DRILL.holdTol}\\b`));
has(`the seek key is ${DRILL.seekKey}`, new RegExp(`key:"${DRILL.seekKey}"`));
has(`the key waits ${DRILL.keyMs} ms`, new RegExp(`key:"${DRILL.seekKey}"[^\\n]*\\n\\s*await sleep\\(${DRILL.keyMs}\\)`));
has(`the seek aims at ${DRILL.seekFrac}`, new RegExp(`\\* ${DRILL.seekFrac};`));
has(`the seek tolerance is ${DRILL.seekTol}`, new RegExp(`\\* ${DRILL.seekTol}[,)]`));
has('play reads playing and a larger position', /t1\.playing && t1\.pos > t0\.pos/);
has('lattice is null or an array', /t0\.lattice === null \|\| Array\.isArray\(t0\.lattice\)/);

const inkFrom = code.indexOf("canvas.pos-strip')");
const ink = inkFrom > 0 ? code.slice(inkFrom, code.indexOf("ok('strip has ink'", inkFrom) + 60) : '';
ok(`ink samples every ${DRILL.inkStride}th pixel`, ink.includes(`4 * ${DRILL.inkStride}`));
ok(`ink floor is ${DRILL.inkFloor}`, ink.includes(`> ${DRILL.inkFloor}`));
ok(`ink tries ${DRILL.inkTries} times`, ink.includes(`tries < ${DRILL.inkTries}`));

console.log(`\n${pass}/${pass + fail} ok`);
process.exit(fail ? 1 : 0);
