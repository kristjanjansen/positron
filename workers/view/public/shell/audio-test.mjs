// demo/shell/audio-test.mjs, the shared AudioContext's owner arithmetic, with
// no audio at all.
//
//   node demo/shell/audio-test.mjs
//
// `audio.mjs` is one context and one owner, and every way it can be wrong is a
// question of who is told what and in which order: a context made twice, a
// visit that makes one, an owner that is not stopped when another claims, a
// release from somebody who no longer owns it suspending the one who does, a
// tab going to the background with a note still sounding. None of that needs a
// browser, so a hub is built over a fake context that records what was done to
// it, and the arithmetic is graded here.
//
// 🔴 EIGHT OF THESE ARE NEGATIVE CONTROLS, named NEGATIVE below: written so that
// the bug they name fails them, rather than so that today's code passes. A hub
// that never suspends and one that suspends on every call both look green to a
// check that only asks whether claiming works.
// ✅ MEASURED 2026-10-06, five sabotages of a copy of `audio.mjs`, 25 ok before
// each: the owner written AFTER the old owner's stop takes 2 red, a release
// that does not check who is asking 3, a claim that stops nobody 1, suspend
// replaced by close 5, and a background tab that stops the owner without
// releasing it 1. Every one goes red on the check written for it.
//
// NOT GRADED HERE: a real AudioContext, its sample rate on a real device, and
// whether a suspended context really stops the audio thread. Those need a
// browser and are the `/fau/` page's (it runs on this module) and, later, the
// SLIDES page's (`plans/plan-live-slides.md` section 7).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createAudioHub } from './audio.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? '  ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? '  ' + detail : ''}`); }
};

/** A context that does nothing and remembers everything. */
function fakeContext(sampleRate) {
  const c = {
    sampleRate, state: 'running', calls: [],
    resume() { c.calls.push('resume'); c.state = 'running'; return Promise.resolve(); },
    suspend() { c.calls.push('suspend'); c.state = 'suspended'; return Promise.resolve(); },
    close() { c.calls.push('close'); c.state = 'closed'; return Promise.resolve(); },
  };
  return c;
}
/** A document with one event list and a visibility state the test sets. */
function fakeDocument() {
  const on = new Map();
  return {
    visibilityState: 'visible',
    addEventListener(t, fn) { if (!on.has(t)) on.set(t, []); on.get(t).push(fn); },
    fire(t) { for (const fn of on.get(t) || []) fn(); },
    listeners: (t) => (on.get(t) || []).length,
  };
}
function hubOver() {
  const doc = fakeDocument();
  const built = [];
  const hub = createAudioHub({
    make: ({ sampleRate }) => { const c = fakeContext(sampleRate); built.push(c); return c; },
    doc: () => doc,
  });
  return { hub, doc, built };
}
/** An owner that counts its stops and may release itself, the way a slot does. */
function slot(name, hub, { releases = true } = {}) {
  const s = { name, stops: 0, stop() { s.stops++; if (releases) hub.release(s); } };
  return s;
}

console.log('\n== the shared AudioContext ==');

// ── the module itself, on import ──────────────────────────────────────────

{
  const before = globalThis.AudioContext;
  let constructed = 0;
  globalThis.AudioContext = class { constructor() { constructed++; } };
  const m = await import('./audio.mjs');
  ok('importing the module makes no context', constructed === 0 && m.contexts() === 0,
    `${constructed} constructed, contexts() ${m.contexts()}`);
  ok('and nobody owns anything on a visit', m.audioOwner() === null);
  globalThis.AudioContext = before;
}
{
  /* 🔴 NEGATIVE: a source claim, stripped of comments first, because the rule
     the header states ("no window or document read on import") would be
     matched by its own sentence otherwise. Anything at module top level that
     touches `document` or `window` or builds a context breaks it. */
  const src = readFileSync(join(HERE, 'audio.mjs'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const top = src.split('\n').filter((l) => /^\S/.test(l) && !/^(export |function |let |const |\}|import )/.test(l));
  const topCalls = src.split('\n').filter((l) => /^(let|const) /.test(l) && /new |document|window|addEventListener/.test(l));
  ok('NEGATIVE: nothing at the top level of audio.mjs runs on import',
    top.length === 0 && topCalls.length === 0, [...top, ...topCalls].join(' | ') || 'only declarations');
}

// ── one context ───────────────────────────────────────────────────────────

{
  const { hub, built, doc } = hubOver();
  ok('a hub makes nothing until it is asked', hub.contexts() === 0 && built.length === 0
    && doc.listeners('visibilitychange') === 0);
  const a = hub.sharedAudio();
  ok('the first call makes one context at 48000', hub.contexts() === 1 && a.sampleRate === 48000,
    `${a.sampleRate}`);
  const b = hub.sharedAudio();
  const c = hub.sharedAudio({ sampleRate: 44100 });
  ok('NEGATIVE: a second and a third call make no second context', hub.contexts() === 1
    && built.length === 1 && a === b && b === c, `${built.length} built`);
  ok('a caller asking for another rate gets the one context, at the rate it has',
    c.sampleRate === 48000, `asked 44100, got ${c.sampleRate}`);
  ok('every later call resumes it, so a context the browser suspended comes back',
    a.calls.filter((x) => x === 'resume').length === 3, a.calls.join(' '));
  ok('the visibility listener is added once, with the context',
    doc.listeners('visibilitychange') === 1);
}
{
  const { hub } = hubOver();
  const a = hub.sharedAudio({ sampleRate: 44100 });
  ok('the first caller sets the rate', a.sampleRate === 44100);
}

// ── one owner ─────────────────────────────────────────────────────────────

{
  const { hub } = hubOver();
  const ctx = hub.sharedAudio();
  const A = slot('A', hub), B = slot('B', hub);
  hub.claim(A);
  ok('claiming makes the owner', hub.owner() === A && A.stops === 0);
  hub.claim(A);
  ok('NEGATIVE: claiming again does not stop the owner it already is', A.stops === 0, `${A.stops} stops`);
  hub.claim(B);
  ok('NEGATIVE: a second claim stops the first owner, once', A.stops === 1 && B.stops === 0,
    `A ${A.stops}, B ${B.stops}`);
  ok('and the second owner holds it', hub.owner() === B);
  /* 🔴 THE ORDER CASE. A's stop() released A from inside the claim; had the
     owner still been A at that moment, that release would have suspended the
     context B is about to sound in. */
  ok('NEGATIVE: the old owner releasing itself inside the claim does not suspend the new one',
    ctx.state === 'running' && !ctx.calls.includes('suspend'), ctx.calls.join(' '));
  ok('NEGATIVE: a release from somebody who is not the owner does nothing',
    hub.release(A) === false && hub.owner() === B && ctx.state === 'running');
  ok('the owner releasing suspends the context', hub.release(B) === true
    && hub.owner() === null && ctx.state === 'suspended');
  ok('NEGATIVE: and never closes it', !ctx.calls.includes('close'), ctx.calls.join(' '));
  hub.claim(A);
  ok('the next claim resumes a suspended context', ctx.state === 'running' && hub.owner() === A);
  ok('a release with no owner at all is refused', hub.release(null) === false);
}
{
  const { hub } = hubOver();
  let threw = false;
  try { hub.claim(null); } catch { threw = true; }
  ok('a claim with no owner throws rather than clearing the owner', threw);
  const A = slot('A', hub);
  hub.claim(A);
  ok('a claim before any context is made records the owner and opens nothing',
    hub.owner() === A && hub.contexts() === 0);
}

// ── the tab going to the background ───────────────────────────────────────

{
  const { hub, doc } = hubOver();
  const ctx = hub.sharedAudio();
  const A = slot('A', hub);
  hub.claim(A);
  doc.visibilityState = 'visible';
  doc.fire('visibilitychange');
  ok('a visibility change to visible stops nobody', A.stops === 0 && hub.owner() === A);
  doc.visibilityState = 'hidden';
  doc.fire('visibilitychange');
  ok('hidden stops the owner and suspends the context', A.stops === 1
    && hub.owner() === null && ctx.state === 'suspended');
}
{
  /* An owner whose stop() forgets to release. The hub lets go for it, or a
     background tab would hold the device for as long as it stayed open. */
  const { hub, doc } = hubOver();
  const ctx = hub.sharedAudio();
  const A = slot('A', hub, { releases: false });
  hub.claim(A);
  doc.visibilityState = 'hidden';
  doc.fire('visibilitychange');
  ok('NEGATIVE: hidden suspends even when the owner forgot to release',
    A.stops === 1 && hub.owner() === null && ctx.state === 'suspended', ctx.calls.join(' '));
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
