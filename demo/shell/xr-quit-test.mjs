// demo/shell/xr-quit-test.mjs — is there really a way out of every headset page.
//
//   node demo/shell/xr-quit-test.mjs
//
// 🔴 WHY THIS EXISTS. REPORTED 2026-09-19: *"i was not able to get out"*. The
// cause was `/blocks/` calling `createXRQuit` and `draw` on every frame and
// never once calling `update`, so the hold could not advance, the ring could not
// fill and the session could not end. There was no way out of that page at all.
//
// ⚠️ IT LOOKED CORRECT FROM EVERY ANGLE THAT CAN BE LOOKED FROM. The object was
// built, its shader compiled, the badge was drawn at both hands every frame, and
// the page reported a way out as present. `/held/`, `/floor/` and
// `xr-panel.mjs` all had the missing line, so no shared code was wrong and
// nothing in the repo could disagree with anything.
//
// 🔴 AND THE DEFECT IS A LINE THAT IS NOT THERE, WHICH IS WHY THIS IS STATIC.
// No browser check can see a call that was never made: a harness cannot enter an
// immersive session, and even in one, `update` not being called is
// indistinguishable from nobody pressing a button. What CAN be checked without a
// headset is the pairing, in the source: a file that draws a way out must also
// advance it.
//
// ⚠️ A STATIC CHECK IS A WEAK CHECK AND IT IS SAID HERE RATHER THAN DISCOVERED
// LATER. It proves the call exists, not that it runs, not that it runs every
// frame, and not that the session ends when the ring fills. Only a Quest can say
// those. It catches the one failure that has actually happened.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' · ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' · ' + detail : ''}`); }
};

/**
 * Every file under `demo/` that BUILDS a quit badge. `archive/` is deliberately
 * not walked: a retired page is a record of what was there, and holding it to a
 * rule written after it was retired would make the archive lie.
 */
function sources(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (/\.(html|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

/**
 * ⚠️ THE IMPORT DOES NOT COUNT, THE CALL DOES. A file that imports the module
 * and never constructs one has no way out to get wrong, and matching on the
 * import alone would have made `xr-tablet.mjs` and every file that merely
 * MENTIONS the module a failure. This is the `s.includes(<substring>)` trap
 * CLAUDE.md names: guard on the exact construction.
 */
const BUILDS = /createXRQuit\s*\(/;
const IMPORT_ONLY = /import\s*\{[^}]*createXRQuit/;

/**
 * ⚠️ THE MODULE THAT DEFINES IT IS NOT A CALLER. `export function createXRQuit(`
 * matches a construction regex perfectly, so the first run of this check failed
 * `xr-quit.mjs` for not calling the two methods it declares. That is the
 * substring trap in its own costume, caught by running the check rather than by
 * reading it.
 */
const files = sources(join(ROOT, 'demo'))
  .filter((p) => !p.endsWith('xr-quit-test.mjs') && !p.endsWith('shell/xr-quit.mjs'));
const builders = files.filter((p) => {
  const src = readFileSync(p, 'utf8');
  // Strip the import line, then look for a real call.
  return BUILDS.test(src.replace(IMPORT_ONLY, ''));
});

console.log('\n== the way out of a headset ==');

ok('at least one page builds a way out, so this check has something to check',
  builders.length > 0, `${builders.length} file(s)`);

/**
 * 🔴 THE PAIRING. `update` advances the hold and `draw` shows how far it has
 * got. A file with `draw` and no `update` is the bug that was reported: a ring
 * that cannot fill. A file with `update` and no `draw` is the other half of the
 * same fault, and it is worse to be in: the session WILL end after a long hold
 * and nothing on screen says it is about to.
 *
 * 🔴 AND IT MATCHES THE ARGUMENT, NOT THE METHOD NAME. THE FIRST BUILD OF THIS
 * CHECK WAS WORTHLESS AND ONLY SABOTAGE SAID SO: it tested `/\.update\s*\(/`,
 * and `/blocks/` calls `.update(` on its room, its hands and its document, so
 * deleting the quit's own call left the check **fully green**. That is the
 * `s.includes(<substring>)` trap CLAUDE.md names three bugs from, met while
 * writing a check whose own comment already quoted the rule.
 * ⚠️ `inputSources` IS THE DISCRIMINATOR BECAUSE IT IS THE ARGUMENT NOTHING ELSE
 * TAKES. Every caller passes the session's input sources first, and no other
 * `update` in this repo is handed them. A name can be anything a page likes;
 * what the call is FOR is in what goes into it.
 */
const ADVANCES = /\.update\s*\(\s*[\w.]*inputSources/;
for (const p of builders) {
  const src = readFileSync(p, 'utf8');
  const rel = relative(ROOT, p);
  const hasUpdate = ADVANCES.test(src);
  const hasDraw = /\.draw\s*\(/.test(src);
  ok(`${rel} advances the hold it draws`, hasUpdate && hasDraw,
    `update ${hasUpdate ? 'called' : 'MISSING'} · draw ${hasDraw ? 'called' : 'MISSING'}`);
}

/**
 * 🔴 NEGATIVE CONTROL, AND WITHOUT IT THE LOOP ABOVE IS WORTH NOTHING. A check
 * that reports every file as fine is indistinguishable from a check that cannot
 * fail, so the same test is run against the source of the bug that was actually
 * shipped: a page that builds the badge and draws it and never updates it.
 */
const BROKEN = `
  import { createXRQuit } from '/shell/xr-quit.mjs';
  xrQuit = createXRQuit(gl, { onQuit: () => session.end() });
  xrQuit.draw(vp, grips, eye);
`;
const brokenSrc = BROKEN.replace(IMPORT_ONLY, '');
ok('the check FAILS the shape that was shipped, which is what makes it a check',
  BUILDS.test(brokenSrc) && !ADVANCES.test(BROKEN),
  'builds and draws, never updates');
/**
 * ⚠️ AND A SECOND CONTROL, FOR THE HOLE THE FIRST ONE MISSED. The shipped bug
 * was in a file FULL of other `update` calls, so a control with none of them
 * cannot tell a good discriminator from a bad one. This one has three.
 */
const BUSY_BROKEN = `
  xrQuit = createXRQuit(gl, {});
  room.update(dt); hands.update(frame, space); doc.update(things);
  xrQuit.draw(vp, grips, eye);
`;
ok('and it fails that shape inside a file that updates three other things',
  BUILDS.test(BUSY_BROKEN) && !ADVANCES.test(BUSY_BROKEN),
  'three other update calls, still no way out');

/**
 * 🔴 NO WORDS ON THE BADGE. INSTRUCTED 2026-09-19: *"circular coundown (no
 * labels)"*. The module used to draw its `label` into the texture, and a
 * sentence in a comment saying it no longer does is exactly the kind of claim
 * this project keeps finding stale. `fillText` is the one call that can put a
 * word there.
 */
const quitSrc = readFileSync(join(HERE, 'xr-quit.mjs'), 'utf8');
ok('the badge draws no text at all', !/fillText\s*\(/.test(quitSrc),
  'no fillText in xr-quit.mjs');

/**
 * ⚠️ AND THE HOLD IS LONG ENOUGH TO BE DELIBERATE. A number this small is not
 * worth a test on its own; what it is worth is a floor, because the value was
 * 900 ms while the exit was one named button and every button is live now. A
 * brush is under 300 ms and a deliberate press about 500.
 */
const hold = Number((quitSrc.match(/const HOLD_MS = (\d+)/) || [])[1]);
ok('the hold cannot be reached by accident', hold >= 1500, `${hold} ms`);

console.log(`\n${pass}/${pass + fail} ok${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
