// demo/shell/xr-quit-test.mjs (node demo/shell/xr-quit-test.mjs): is there a way out of every headset page.
// Drives the real mountXRQuit with a fake session (no update, no draw, no page), then checks
// statically that every file entering a session mounts the way out on it.
// why: lessons/kit-xr-quit.md#test-header

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

/**
 * 1. THE SHARED PATH, DRIVEN. A session that is nobody's: the minimum mountXRQuit touches.
 * Frames step 11 ms (90 Hz); the first carries no time, so a hold is one frame behind.
 * why: lessons/kit-xr-quit.md#test-fake-session
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
  // No update, no draw, no page: hold a button and the session ends.
  // why: lessons/kit-xr-quit.md#test-hold-ends
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
  // Negative control: an early release must not end it.
  // why: lessons/kit-xr-quit.md#test-negative
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
  // The press that opened the page is not a press to leave it.
  // why: lessons/kit-xr-quit.md#test-opening-press
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
  // `onQuit` is teardown, not the exit: the session ends regardless of the page.
  // why: lessons/kit-xr-quit.md#test-on-quit
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
  // A stalled frame must not advance a hold by a second.
  // why: lessons/kit-xr-quit.md#test-stall
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

/**
 * 3. EVERY FILE THAT ENTERS A SESSION MOUNTS THE WAY OUT ON IT.
 * Every file under demo/; archive/ is not walked.
 * why: lessons/kit-xr-quit.md#test-sources
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
 * Comments are not code: strip them so a sentence about mountXRQuit cannot pass a file.
 * Deliberately blunt; a `//` after a `:` is kept so URLs survive.
 * why: lessons/kit-xr-quit.md#test-code
 */
const code = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');

/**
 * A file is one of these if it calls `navigator.xr.requestSession(` (matched with the prefix,
 * so verify-quest.mjs's stub does not count).
 * why: lessons/kit-xr-quit.md#test-enters
 */
const ENTERS = /navigator\s*\.\s*xr\s*\.\s*requestSession\s*\(/;
/**
 * The call counts, not the import.
 * why: lessons/kit-xr-quit.md#test-mounts
 */
const MOUNTS = /mountXRQuit\s*\(/;
const IMPORT_LINE = /import\s*\{[^}]*mountXRQuit[^}]*\}[^\n]*/g;
const OLD_API = /createXRQuit\s*\(/;
const enters = (src) => ENTERS.test(code(src));
const mounts = (src) => MOUNTS.test(code(src).replace(IMPORT_LINE, ''));

/**
 * The defining module and this file are not callers.
 * why: lessons/kit-xr-quit.md#test-files
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
 * Negative controls: the same regexes run against sources written to be wrong.
 * why: lessons/kit-xr-quit.md#test-controls
 */
const NO_WAY_OUT = `
  import { mountXRQuit } from '/shell/xr-quit.mjs';
  const session = await navigator.xr.requestSession('immersive-vr', {});
  session.requestAnimationFrame(onXR);
`;
ok('the check FAILS a file that imports the way out and never mounts it',
  enters(NO_WAY_OUT) && !mounts(NO_WAY_OUT), 'imports it, enters, no mount');

/**
 * And it fails a file that only talks about mounting one.
 * why: lessons/kit-xr-quit.md#test-only-prose
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

/**
 * 4. WHAT THE RING IS. No words on the badge: `fillText` is the one call that could put one there.
 * why: lessons/kit-xr-quit.md#test-no-words
 */
const quitSrc = readFileSync(join(HERE, 'xr-quit.mjs'), 'utf8');
ok('the badge draws no text at all', !/fillText\s*\(/.test(quitSrc),
  'no fillText in xr-quit.mjs');

/**
 * Every button is live, so the hold has a floor: a brush is under 300 ms, a press about 500.
 * why: lessons/kit-xr-quit.md#test-hold-floor
 */
const hold = Number((quitSrc.match(/const HOLD_MS = (\d+)/) || [])[1]);
ok('the hold cannot be reached by accident', hold >= 1500, `${hold} ms`);

/**
 * The ring sits in front of the viewer, beyond an arm (about 0.7 m).
 * why: lessons/kit-xr-quit.md#test-ring-distance
 */
ok('the ring sits beyond arm\'s reach', DIST_M >= 1.0, `${DIST_M} m`);
ok('and it is a few degrees across rather than a wall',
  RING_DEG >= 2 && RING_DEG <= 12, `${RING_DEG}°`);

console.log(`\n${pass}/${pass + fail} ok${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
