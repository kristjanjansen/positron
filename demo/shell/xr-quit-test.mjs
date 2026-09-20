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
// the page reported a way out as present. `/weight/`, `/floor/` and
// `xr-panel.mjs` all had the missing line, so no shared code was wrong and
// nothing in the repo could disagree with anything.
//
// 🔴 THE DESIGN CHANGED, SO THIS CHECK CHANGED WITH IT. The old build was a
// grep: a file that DRAWS a way out must also ADVANCE it, matched on the
// argument (`inputSources`) rather than on the method name, because `/blocks/`
// updates its room, its hands and its document and a name match stayed green
// with the quit's own call deleted. That check now grades a shape nobody can
// write: `mountXRQuit` takes the SESSION and advances the hold from the
// session's own frame loop, and the object it hands back HAS NO `update`. A
// check about a line that cannot be forgotten is a check that cannot fail, and
// CLAUDE.md is clear that this is worse than no check.
//
// So it grades two things instead, and the first one is new in kind:
//
//   · **THE SHARED PATH, BY RUNNING IT.** The hold is pure arithmetic over a
//     list of gamepads and a frame clock, so a fake session drives the real
//     `mountXRQuit` here on a laptop with no browser, no GL and no headset: a
//     button held long enough ends the session, a button released early does
//     not, and the page contributes NOTHING to either. Every assert below is
//     reached without a single call to `update` or `draw`, which is the whole
//     claim of the design stated as a test that would go red if it stopped
//     being true.
//   · **THE PAIRING, IN THE SOURCE.** A file that enters an immersive session
//     must mount the way out on it. That is still static, and it still has to
//     be: no harness can enter a session, and a file that never mounts one is a
//     line that is NOT there.
//
// ⚠️ A STATIC CHECK IS A WEAK CHECK AND IT IS SAID HERE RATHER THAN DISCOVERED
// LATER. The second half proves the call exists, not that the page reached it.
// The first half is the one that proves behaviour, and it proves it about this
// module rather than about any page.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as QUIT from './xr-quit.mjs';

const { mountXRQuit, createQuitHold, DIST_M, RING_DEG } = QUIT;

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' · ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' · ' + detail : ''}`); }
};

console.log('\n== the way out of a headset ==');

// ─────────────────────────────────────────────────────────────────────────
// 1. THE SHARED PATH, DRIVEN
// ─────────────────────────────────────────────────────────────────────────
/**
 * A session that is nobody's session: a list of buttons, a frame loop and an
 * `end()` that counts. It is deliberately the MINIMUM `mountXRQuit` touches, so
 * a mount that started reaching for anything else would fail here rather than
 * in a headset.
 *
 * ⚠️ THE FRAME STEP IS 11 ms, which is a 90 Hz headset. It matters: the first
 * frame carries no elapsed time at all, so a hold is always one frame behind
 * the wall clock, and a test that drove exactly `HOLD_MS` of frames would sit
 * 11 ms short and read as a hold that does not fire.
 */
function fakeSession({ buttons = 2 } = {}) {
  const pad = { buttons: Array.from({ length: buttons }, () => ({ pressed: false })) };
  const src = { gamepad: pad, handedness: 'right' };
  const listeners = {};
  let queue = [], ended = 0, t = 0;
  return {
    inputSources: [src],
    requestAnimationFrame(cb) { queue.push(cb); return queue.length; },
    addEventListener(name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
    end() { ended++; return Promise.resolve(); },
    press(i = 0) { pad.buttons[i].pressed = true; return this; },
    release() { for (const b of pad.buttons) b.pressed = false; return this; },
    /** `ms` of session frames, at 11 ms each. */
    run(ms, step = 11) {
      const n = Math.max(1, Math.round(ms / step));
      for (let i = 0; i < n; i++) {
        const due = queue; queue = [];
        t += step;
        for (const cb of due) cb(t, { fake: true });
      }
      return this;
    },
    fire(name) { for (const fn of listeners[name] || []) fn({ type: name }); },
    get ends() { return ended; },
    get pending() { return queue.length; },
  };
}

/** One mounted way out on one fake session. `gl` is null throughout: nothing
 *  below draws, which is the point. A page that draws nothing still has a way
 *  out. */
function mounted(opts = {}) {
  const s = fakeSession();
  const seen = { quits: 0 };
  const q = mountXRQuit(null, s, { onQuit: () => { seen.quits++; }, ...opts });
  return { s, q, seen };
}

{
  const { s, q } = mounted();
  ok('mounting puts a callback on the session with no line from the page',
    s.pending === 1 && q.driven, `${s.pending} callback, driven ${q.driven}`);
  s.run(1100);
  ok('the session drives the hold by itself', q.frames === 100 && s.pending === 1,
    `${q.frames} frames, ${s.pending} callback still queued`);
  ok('nothing pressed is nothing held', !q.holding && q.progress === 0 && q.armed,
    `armed ${q.armed}, progress ${q.progress}`);
}

{
  // 🔴 THE ONE THAT MATTERS. No `update`, no `draw`, no page: hold a button and
  // the session ends.
  const { s, q, seen } = mounted();
  s.run(110).press().run(3300);
  ok('a button held long enough ends the session, with no page line at all',
    seen.quits === 1 && s.ends === 1 && q.progress === 1,
    `onQuit ${seen.quits}, end() ${s.ends}, progress ${q.progress}`);
  s.run(1100);
  ok('and it fires exactly once, however long the button stays down',
    seen.quits === 1 && s.ends === 1, `onQuit ${seen.quits}, end() ${s.ends}`);
}

{
  // 🔴 NEGATIVE CONTROL. Without this the assert above is satisfied by a mount
  // that ends the session on any press, or on none.
  const { s, q, seen } = mounted();
  s.run(110).press().run(2500);
  ok('a button released early does NOT end the session',
    seen.quits === 0 && s.ends === 0 && q.progress < 1,
    `progress ${q.progress.toFixed(2)}, end() ${s.ends}`);
  s.release().run(110);
  ok('and letting go cancels the hold to zero rather than banking it',
    q.progress === 0 && !q.holding, `progress ${q.progress}`);
  s.press().run(2500);
  ok('so two long presses do not add up to one exit',
    seen.quits === 0 && s.ends === 0, `end() ${s.ends}`);
}

{
  // 🔴 THE PRESS THAT OPENED THE PAGE IS NOT A PRESS TO LEAVE IT. Every page
  // used to need its own guard for this and only `xr-panel.mjs` had one.
  const s = fakeSession();
  s.press();
  const q = mountXRQuit(null, s, {});
  s.run(2000);
  ok('a button already down when the session starts does not count',
    !q.armed && !q.holding && s.ends === 0,
    `armed ${q.armed}, progress ${q.progress}`);
  // ...but it must not be able to trap anybody either.
  s.run(1300);
  ok('a stuck button arms anyway, so it cannot be the reason somebody is trapped',
    q.armed && q.holding, `armed ${q.armed} after ${q.frames} frames`);
  s.run(3300);
  ok('and that stuck button then ends the session like any other hold',
    s.ends === 1, `end() ${s.ends}`);
}

{
  // 🔴 `onQuit` IS TEARDOWN, NOT THE EXIT. This is the exact line that went
  // missing from `/blocks/`: a page that does not end the session must not be
  // able to leave somebody in a room.
  const { s, seen } = mounted();
  s.run(110).press().run(3300);
  ok('the module ends the session even though the page never calls end()',
    s.ends === 1 && seen.quits === 1, `end() ${s.ends}`);
}

{
  const s = fakeSession();
  mountXRQuit(null, s, { onQuit: () => { throw new Error('the page broke'); } });
  s.run(110).press().run(3300);
  ok('and it ends the session even when the page throws on its way out',
    s.ends === 1, `end() ${s.ends}`);
}

{
  const s = fakeSession();
  const a = mountXRQuit(null, s, {});
  const b = mountXRQuit(null, s, {});
  ok('mounting twice on one session hands back the one mount, not two holds',
    a === b && s.pending === 1, `${s.pending} callback`);
}

{
  const { s, q } = mounted();
  s.run(110);
  const was = q.frames;
  s.fire('end');
  s.run(1100);
  ok('a session that has ended stops driving, so a re-entry gets a fresh mount',
    !q.driven && q.frames === was, `driven ${q.driven}, frames ${q.frames} of ${was}`);
}

{
  // The arithmetic on its own, with no session at all, because this is where
  // every bug the hold has ever had actually lived.
  let fired = 0;
  const h = createQuitHold({ holdMs: 1000, onQuit: () => { fired++; } });
  h.update([], 0.05);                                   // one frame, nothing down
  const src = [{ gamepad: { buttons: [{ pressed: true }] } }];
  for (let i = 0; i < 12; i++) h.update(src, 0.05);     // 600 ms
  ok('the hold reports how far it has got, so a ring has something to draw',
    Math.abs(h.progress - 0.6) < 0.01 && h.holding && h.pressed === 0,
    `progress ${h.progress.toFixed(2)} on button ${h.pressed}`);
  for (let i = 0; i < 12; i++) h.update(src, 0.05);
  ok('and it fires once at the top', fired === 1 && h.progress === 1, `fired ${fired}`);
  // ⚠️ A STALLED FRAME MUST NOT ADVANCE A HOLD BY A SECOND. The hold measures a
  // deliberate press and a stall is not one.
  let fired2 = 0;
  const h2 = createQuitHold({ holdMs: 1000, onQuit: () => { fired2++; } });
  h2.update([], 0.05);
  h2.update(src, 5);
  ok('one enormous frame cannot end a session on its own',
    fired2 === 0 && h2.progress <= 0.11, `progress ${h2.progress.toFixed(2)}`);
}

// ─────────────────────────────────────────────────────────────────────────
// 2. THE SHAPE THAT COST A SESSION CANNOT BE WRITTEN
// ─────────────────────────────────────────────────────────────────────────
{
  const { q } = mounted();
  ok('the mounted way out has no update() for a page to forget',
    typeof q.update === 'undefined' && typeof q.draw === 'function',
    'draw only');
  ok('and the module no longer hands out a badge that nothing drives',
    !('createXRQuit' in QUIT) && typeof QUIT.mountXRQuit === 'function',
    `exports: ${Object.keys(QUIT).sort().join(', ')}`);
}

// ─────────────────────────────────────────────────────────────────────────
// 3. EVERY FILE THAT ENTERS A SESSION MOUNTS THE WAY OUT ON IT
// ─────────────────────────────────────────────────────────────────────────
/**
 * Every file under `demo/`. `archive/` is deliberately not walked: a retired
 * page is a record of what was there, and holding it to a rule written after it
 * was retired would make the archive lie.
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
 * 🔴 COMMENTS ARE NOT CODE, AND THIS CHECK READ THEM FOR ONE RUN.
 *
 * FOUND BY SABOTAGE, 2026-09-19: with `xr-panel.mjs`'s actual `mountXRQuit`
 * call broken on purpose, its line stayed GREEN, because the sentence three
 * hundred lines above it explaining what `mountXRQuit(gl, session)` does
 * matches the regex perfectly. A file that only TALKS about the way out would
 * have passed, which is the `s.includes(<substring>)` trap CLAUDE.md names
 * three bugs from, met for the second time in this one file.
 *
 * ⚠️ IT IS DELIBERATELY BLUNT. Block comments, HTML comments, and `//` to the
 * end of a line unless a `:` is in front of it, which is what keeps a URL in a
 * string from eating the rest of its line. It is not a parser and does not need
 * to be: what it has to do is stop prose being read as a call.
 */
const code = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');

/**
 * 🔴 WHAT MAKES A FILE ONE OF THESE: IT ASKS FOR A SESSION. Not that it imports
 * the module, not that it mentions a headset. `navigator.xr.requestSession` is
 * the one call that puts a person somewhere they cannot get out of by looking
 * away, so it is the call that has to be paired.
 * ⚠️ IT IS MATCHED WITH THE `navigator.xr` IN FRONT OF IT. `requestSession`
 * alone appears in comments all over this repo and as a method on the stub
 * inside `demo/verify-quest.mjs`, and a check that fails a harness for owning a
 * fake is a check people learn to ignore.
 */
const ENTERS = /navigator\s*\.\s*xr\s*\.\s*requestSession\s*\(/;
/**
 * ⚠️ THE IMPORT DOES NOT COUNT, THE CALL DOES. A file that imports the module
 * and never mounts one has no way out to get wrong, and matching on the import
 * alone would pass the exact page that was reported. This is the
 * `s.includes(<substring>)` trap CLAUDE.md names: guard on the call.
 */
const MOUNTS = /mountXRQuit\s*\(/;
const IMPORT_LINE = /import\s*\{[^}]*mountXRQuit[^}]*\}[^\n]*/g;
const OLD_API = /createXRQuit\s*\(/;
const enters = (src) => ENTERS.test(code(src));
const mounts = (src) => MOUNTS.test(code(src).replace(IMPORT_LINE, ''));

/**
 * ⚠️ THE MODULE THAT DEFINES IT IS NOT A CALLER, and neither is this file. Both
 * match every regex above perfectly. That is the substring trap in its own
 * costume, and the first build of the old check failed `xr-quit.mjs` for not
 * calling the methods it declares.
 */
const files = sources(join(ROOT, 'demo'))
  .filter((p) => !p.endsWith('xr-quit-test.mjs') && !p.endsWith('shell/xr-quit.mjs'));
const enter = files.filter((p) => enters(readFileSync(p, 'utf8')));

ok('at least one file enters a session, so this check has something to check',
  enter.length > 0, `${enter.length} file(s)`);

for (const p of enter) {
  const src = readFileSync(p, 'utf8');
  const rel = relative(ROOT, p);
  const has = mounts(src);
  ok(`${rel} mounts the way out on the session it enters`, has,
    has ? 'mountXRQuit' : (OLD_API.test(code(src))
      ? 'NO mountXRQuit, and it still calls createXRQuit, which this module no longer exports'
      : 'NO mountXRQuit, so there is no way out of that session'));
}

/**
 * 🔴 THE NEGATIVE CONTROLS, AND WITHOUT THEM THE LOOP ABOVE IS WORTH NOTHING. A
 * check that reports every file as fine is indistinguishable from a check that
 * cannot fail, so the same two regexes are run against sources written to be
 * wrong.
 */
const NO_WAY_OUT = `
  import { mountXRQuit } from '/shell/xr-quit.mjs';
  const session = await navigator.xr.requestSession('immersive-vr', {});
  session.requestAnimationFrame(onXR);
`;
ok('the check FAILS a file that imports the way out and never mounts it',
  enters(NO_WAY_OUT) && !mounts(NO_WAY_OUT), 'imports it, enters, no mount');

/**
 * 🔴 AND IT FAILS A FILE THAT ONLY TALKS ABOUT MOUNTING ONE. This control was
 * added after the sabotage above found the check passing a file whose real call
 * had been broken, on the strength of a sentence in a comment.
 */
const ONLY_PROSE = `
  // The way out is mountXRQuit(gl, session), which puts the hold on the
  // session's own frame loop. /* and mountXRQuit(gl, session) again */
  <!-- and mountXRQuit(gl, session) in an HTML comment -->
  const session = await navigator.xr.requestSession('immersive-vr', {});
`;
ok('and it FAILS a file that only mentions it in comments',
  enters(ONLY_PROSE) && !mounts(ONLY_PROSE), 'three mentions, no call');

const SHIPPED_BUG = `
  const session = await navigator.xr.requestSession('immersive-vr', {});
  xrQuit = createXRQuit(gl, { onQuit: () => session.end() });
  room.update(dt); hands.update(frame, space); doc.update(things);
  xrQuit.draw(vp, grips, eye);
`;
ok('and it FAILS the shape that was actually shipped, three other updates and all',
  enters(SHIPPED_BUG) && !mounts(SHIPPED_BUG), 'builds and draws, never mounted');

const GOOD = `
  const session = await navigator.xr.requestSession('immersive-vr', {});
  quit = mountXRQuit(gl, session, { onQuit: () => stopEverything() });
  quit.draw(eyeVP, eyeView);
`;
ok('and it PASSES one that mounts, so it is not simply failing everything',
  enters(GOOD) && mounts(GOOD), 'enters and mounts');

// ─────────────────────────────────────────────────────────────────────────
// 4. WHAT THE RING IS
// ─────────────────────────────────────────────────────────────────────────
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

/**
 * 🔴 AND THE RING IS NOT INSIDE WHAT SOMEBODY IS HOLDING. DIRECTED 2026-09-19:
 * it sits in front of the viewer rather than at the controllers, and the one
 * thing that can go wrong with a head locked thing is putting it where a hand
 * already is. An arm is about 0.7 m.
 */
ok('the ring sits beyond arm\'s reach', DIST_M >= 1.0, `${DIST_M} m`);
ok('and it is a few degrees across rather than a wall',
  RING_DEG >= 2 && RING_DEG <= 12, `${RING_DEG}°`);

console.log(`\n${pass}/${pass + fail} ok${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
