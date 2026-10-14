// demo/shell/audio-test.mjs: the shared AudioContext's owner arithmetic over a fake context.
// 8 negative controls, named NEGATIVE. A real context and device are graded on /fau/.
// why: lessons/kit-audio.md#test-header

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
  // Negative: a source claim, stripped of comments first so the header's own sentence cannot match.
  // why: lessons/kit-audio.md#test-import
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
  // The order case: A's release inside the claim must not suspend the context B is about to use.
  // why: lessons/kit-audio.md#test-order
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

// ── a suspend while a resume is in flight, the way Chrome really orders them ─

// A fake that keeps `state` stale for a moment after `resume()`, as Chrome does (1.5 to 3 ms),
// so a suspend inside that window wedges the context; the cases below grade the order.
// why: lessons/kit-audio.md#chromecontext
function chromeContext() {
  const c = {
    sampleRate: 48000, state: 'suspended', rendering: false, calls: [], inFlight: 0,
    resume() {
      c.calls.push('resume');
      if (c.state === 'running') return Promise.resolve();
      c.rendering = true;                  // the audio thread is told to start now
      c.inFlight++;
      return new Promise((r) => setTimeout(() => {
        c.inFlight--;
        c.state = 'running';               // and the state is posted back later
        r();
      }, 2));
    },
    suspend() {
      c.calls.push('suspend');
      c.rendering = false;                 // stops the device whatever state reads
      if (c.state === 'running') c.state = 'suspended';
      return Promise.resolve();
    },
    close() { c.calls.push('close'); c.state = 'closed'; c.rendering = false; return Promise.resolve(); },
  };
  return c;
}
const settle = () => new Promise((r) => setTimeout(r, 20));
const wedged = (c) => c.state === 'running' && !c.rendering;
{
  const doc = fakeDocument();
  const hub = createAudioHub({ make: () => chromeContext(), doc: () => doc });
  const ctx = hub.sharedAudio();
  const A = slot('A', hub), B = slot('B', hub), C = slot('C', hub);
  await settle();
  ok('the Chrome-like fake starts: one resume, running and rendering', ctx.state === 'running' && ctx.rendering);
  hub.claim(A);
  hub.release(A);
  ok('a release suspends it', ctx.state === 'suspended' && !ctx.rendering);

  // a press: sharedAudio() and claim() fire resume(), then a compile fails in a couple of ms and releases
  hub.sharedAudio();
  hub.claim(B);
  await new Promise((r) => setTimeout(r, 0));
  hub.release(B);
  await settle();
  ok('NEGATIVE: a release while the press’s resume is in flight leaves the context suspended, not running and frozen',
    ctx.state === 'suspended' && !ctx.rendering && !wedged(ctx),
    `state ${ctx.state}, ${ctx.rendering ? 'rendering' : 'not rendering'}, calls ${ctx.calls.join(' ')}`);

  // the next press, on another slide: it has to sound
  hub.sharedAudio();
  hub.claim(C);
  await settle();
  ok('NEGATIVE: and the next claim after it renders, rather than reading running over a frozen clock',
    ctx.state === 'running' && ctx.rendering && hub.owner() === C,
    `state ${ctx.state}, ${ctx.rendering ? 'rendering' : 'NOT RENDERING'}`);

  // a step then Start within the same task: the release suspends, the claim resumes
  hub.release(C);
  const D = slot('D', hub);
  hub.sharedAudio();
  hub.claim(D);
  await settle();
  ok('a release then a claim in the same task ends running and rendering', ctx.state === 'running' && ctx.rendering && hub.owner() === D,
    `state ${ctx.state}, ${ctx.rendering ? 'rendering' : 'NOT RENDERING'}`);

  // a claim arriving while the deferred suspend waits must win
  hub.release(D);
  const E = slot('E', hub), F = slot('F', hub);
  hub.sharedAudio(); hub.claim(E);
  hub.release(E);                         // deferred behind the resume
  hub.sharedAudio(); hub.claim(F);        // and a newer owner before it lands
  await settle();
  ok('NEGATIVE: a suspend held back behind a resume is dropped when somebody claims in the meantime',
    ctx.state === 'running' && ctx.rendering && hub.owner() === F, `state ${ctx.state}, ${ctx.rendering ? 'rendering' : 'NOT RENDERING'}, owner ${hub.owner()?.name}`);
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
