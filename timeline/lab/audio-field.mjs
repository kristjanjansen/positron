// timeline/lab/audio-field.mjs: what the three signals in plan-audio-shader
// actually produce at runtime, measured on the real page.
//
//   node timeline/lab/audio-field.mjs                      # local server, 60 s
//   node timeline/lab/audio-field.mjs --seconds 90
//   BASE=https://positron.studio node timeline/lab/audio-field.mjs
//   node timeline/lab/audio-field.mjs --json out.json      # keep the raw numbers
//
// It SKIPS CLEANLY when Chrome is absent, when the relay has no station up, or
// when the granulator never boots. Skipping prints why and exits 0. A check nobody
// can run is a check nobody runs (`csound-oracle.mjs`, same rule).
//
// ── WHY THIS EXISTS, AND WHY IT IS NOT A SHADER ────────────────────────────
//
// `plan-audio-shader.md` §8 makes a measurement the first commit, and §2.3
// says why:
//
//   "The parameter row is on the NEAR side of the wire and the grain row is on
//    the FAR side, and a good-looking field will hide the difference. If the
//    shader shows `size` moving, that proves `setInterval` ran, not that
//    scsynth heard anything."
//
// That is `createMidiLane`'s `scheduled()` in a new medium: it counted what the
// page QUEUED and read identically to delivery while every note was being
// scheduled fifty-six years out. So every number below is labelled by WHICH
// SIDE OF THE WIRE it was counted on, and §4 exists only to make the two
// disagree on purpose.
//
// ── THE FOUR TAPS, AND WHERE EACH SITS ─────────────────────────────────────
//
//   1. `/pgrain`          FAR.  A second listener on the engine's own `in`
//                         event. The page's `onReply` consumes `/pgrain` from
//                         the reply ring, but SuperSonic's emitter holds a SET
//                         of listeners and calls all of them, so ours sees the
//                         raw message the page saw: `[addr, nodeID, replyID,
//                         pos, dur, voice, half]`.
//   2. `eng.send`         NEAR. Wrapped, so every `/n_set` and `/n_setn` the
//                         page writes is timestamped as it leaves. This is
//                         exactly what the plan's row 2 would draw.
//   3. `scope.feed`       NEAR of the audio boundary. `meterTick` calls it with
//                         the SAME `Float32Array` it just read off the page's
//                         analyser, as its last act, so wrapping it gives the
//                         frame clock and the exact samples with no second
//                         timer and no second analysis.
//   4. `/s_get` replies   FAR. Our own listener timestamps them on arrival.
//                         ⚠️ NOT `eng.sendAndWait`, whose `waitFor` polls the
//                         reply array every 10 ms. That quantum is larger than
//                         the thing being measured, and it would have been
//                         reported as the answer.
//
// ⚠️ WE DO NOT EDIT THE PAGE. The analyser capture is installed with
// `Page.addScriptToEvaluateOnNewDocument`, which patches
// `AudioContext.prototype.createAnalyser` before any page script runs; the rest
// is monkey-patching after load. So this measures `/radio/` as deployed,
// which is the only version worth measuring.
//
// ── TWO THINGS THE ENGINE SOURCE GIVES US FOR FREE ─────────────────────────
//
// READ `rig/board/norns/Engine_Pappus.sc:849`:
//     SendReply.ar(vtrig * report, '/pgrain', [pos, dur, i, half]);
// and `:682`:
//     dur = Lag.kr(msize, lagt).clip(0.002, 8).min(winspansec);
//
// 🔴 So `/pgrain`'s `dur` is `msize` AFTER the 20 ms one-pole and after two
// clips. It is not a copy of what the page sent; it is what the audio used.
// That makes the grain row a far-side echo of one parameter, already on the
// wire, with no new plumbing. It is the sharpest near/far instrument this page
// has. §4 uses it alongside `/s_get`, because the two see different
// things: `/s_get` reads the control BEFORE the lag at millisecond resolution,
// `dur` reads it AFTER the lag at the grain rate.
//
// ⚠️ AND `/s_get` CANNOT SEE THE LAG AT ALL. It answers with the control value
// scsynth holds, which is the input to `Lag.kr(…, 0.02)` and not its output. A
// latency measured through it is a floor: the audio is a further ~60 ms behind
// (three time constants), INFERRED, and §4 prints it as such rather than
// folding it into a measured number.

import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolvePath(HERE, '..', '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Skip, do not fail: this file grades a page, and an absent page is not a bug. */
function skip(why) {
  console.log(`\naudio-field SKIPPED: ${why}`);
  process.exit(0);
}

// ── arguments ──────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] != null ? argv[i + 1] : dflt;
};
const SECONDS = Math.max(10, Number(arg('seconds', 60)) || 60);
const JSON_OUT = arg('json', null);
const SWEEP = !argv.includes('--no-sweep');

// ══ 0 · the lanes, read from the page rather than typed here ═══════════════
//
// 🔴 A SHARED MEASUREMENT IN TWO FILES IS A MEASUREMENT THAT WILL DISAGREE
// (CLAUDE.md, `--sld-col`). The spec table that decides what a modulation MEANS
// lives inside `startModulator`'s closure in `demo/radio/index.html` and is
// not exported, so it is extracted from the source by brace matching rather
// than copied. If the block moves or stops being a plain literal this says so
// and the report falls back to engine units. It never quietly substitutes a
// table of its own, because a lane table that has drifted would make every
// "fraction of its lane" number below wrong in a way nothing could see.
async function readLanes() {
  const path = `${REPO}/demo/radio/index.html`;
  try {
    const src = await readFile(path, 'utf8');
    const i = src.indexOf('specs: {');
    if (i < 0) return { specs: null, why: 'no `specs: {` in the page' };
    let depth = 0; const j = src.indexOf('{', i); let k = j;
    for (; k < src.length; k++) {
      if (src[k] === '{') depth++;
      else if (src[k] === '}' && --depth === 0) break;
    }
    const specs = new Function(`return (${src.slice(j, k + 1)})`)();
    if (!specs || Object.keys(specs).length < 8) return { specs: null, why: 'the block parsed to too few destinations' };
    // and the engine control name each one is written under
    const mi = src.indexOf('const MOD_CMD = {');
    let cmd = {};
    if (mi >= 0) {
      const a = src.indexOf('{', mi);
      let d2 = 0; let b = a;
      for (; b < src.length; b++) {
        if (src[b] === '{') d2++;
        else if (src[b] === '}' && --d2 === 0) break;
      }
      try { cmd = new Function(`return (${src.slice(a, b + 1)})`)(); } catch { cmd = {}; }
    }
    return { specs, cmd, why: null };
  } catch (e) { return { specs: null, why: `${e.message}` }; }
}

/** `pappus-mod.mjs`'s own warp, imported rather than re-implemented. */
let specOf = null;
try { ({ spec: specOf } = await import(`${REPO}/demo/shell/pappus-mod.mjs`)); }
catch (e) { skip(`could not import demo/shell/pappus-mod.mjs (${e.message})`); }

const { specs: LANES, cmd: MOD_CMD, why: LANE_WHY } = await readLanes();
const LANE = LANES ? Object.fromEntries(Object.entries(LANES).map(([k, v]) => [k, { ...specOf(v), n: v.n || 0, quant: v.quant || 0 }])) : null;
const engineName = (dest) => (MOD_CMD && MOD_CMD[dest]) || `m${dest}`;

// ══ 0b · preflight ═════════════════════════════════════════════════════════
if (!existsSync(CHROME)) skip(`no Chrome at ${CHROME}`);

const RELAY = 'https://shout.positron.studio';
let stationsUp = [];
try {
  const r = await fetch(`${RELAY}/health`, { signal: AbortSignal.timeout(20000) });
  const j = await r.json();
  stationsUp = Object.entries(j.stations || {}).filter(([, s]) => s.up).map(([id]) => id);
} catch (e) { skip(`the relay did not answer /health (${e.message}). This page has nothing to granulate.`); }
if (!stationsUp.length) skip('no station on the relay is up. The page would boot no granulator.');

// 🔴 COUNT THE OTHER BROWSERS BEFORE BLAMING THE NUMBERS. Same rule
// `verify.mjs` prints: a second Chrome of your own competes for bandwidth and
// for relay sockets, and the result reads as a finding about the page.
const peers = (() => {
  try {
    return execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8' }).split('\n')
      .filter((l) => /Google Chrome/.test(l) && /--remote-debugging-port=/.test(l) && !/--type=/.test(l))
      .filter((l) => Number(l.trim().split(/\s+/)[0]) !== process.pid).length;
  } catch { return 0; }
})();

// ══ 0c · a server, unless we are told to use the deploy ════════════════════
let server = null;
let BASE = process.env.BASE || null;
if (!BASE) {
  try {
    const { serve, PORT } = await import(`${REPO}/demo/server.mjs`);
    server = await serve(PORT);
    BASE = `http://127.0.0.1:${server.address().port}`;
  } catch (e) { skip(`could not start the demo server (${e.message}); try BASE=https://positron.studio`); }
}

// ══ 0d · Chrome, on a port and a profile the OS chose ══════════════════════
//
// A fixed port is a shared mutable global and so is a shared profile (CLAUDE.md
// twice over), so both are per-run and the port is read back from the profile.
let PROFILE; let SWEPT = 0;
try {
  const { claimProfile } = await import(`${REPO}/demo/harness-profile.mjs`);
  const c = claimProfile('lab-audio-field-udd');
  PROFILE = c.dir; SWEPT = c.swept || 0;
} catch { PROFILE = `/private/tmp/claude-501/lab-audio-field-udd-${process.pid}`; }
await rm(`${PROFILE}/Default/Cache`, { recursive: true, force: true }).catch(() => {});

const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  // NEVER LET SOUND GATE THE WORK: `AudioContext.resume()` and `play()` both
  // wait on a gesture in a real browser and NEITHER REJECTS, so a headless run
  // without this hangs rather than failing (CLAUDE.md).
  '--autoplay-policy=no-user-gesture-required', '--mute-audio',
], { stdio: ['ignore', 'pipe', 'pipe'] });
chrome.stderr.on('data', () => {});

let wsUrl = null; let cdpPort = null;
for (let i = 0; i < 80 && !wsUrl; i++) {
  await sleep(250);
  try {
    if (!cdpPort) cdpPort = Number((await readFile(`${PROFILE}/DevToolsActivePort`, 'utf8')).split('\n')[0]);
    if (!cdpPort) { cdpPort = null; continue; }
    wsUrl = (await (await fetch(`http://127.0.0.1:${cdpPort}/json/version`)).json()).webSocketDebuggerUrl;
  } catch { /* still coming up */ }
}
if (!wsUrl) { chrome.kill('SIGKILL'); server?.close(); skip('chrome did not come up'); }

const ws = new WebSocket(wsUrl);
await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = bad; });
let msgId = 0;
const pending = new Map();
const pageErrors = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { ok, bad } = pending.get(m.id); pending.delete(m.id);
    m.error ? bad(new Error(JSON.stringify(m.error))) : ok(m.result);
  } else if (m.method === 'Runtime.exceptionThrown') {
    pageErrors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
  }
};
const send = (method, params = {}, sessionId) => new Promise((ok, bad) => {
  const id = ++msgId;
  pending.set(id, { ok, bad });
  ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  // The near/far phase is a long measurement inside ONE evaluate, so the
  // timeout has to be longer than the measurement rather than longer than a
  // round trip.
  setTimeout(() => { if (pending.delete(id)) bad(new Error(`cdp timeout: ${method}`)); }, 240000);
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S('Page.enable'); await S('Runtime.enable');

async function ev(expr, awaitPromise = true) {
  const r = await S('Runtime.evaluate', { expression: expr, awaitPromise, returnByValue: true });
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'eval failed');
  }
  return r.result.value;
}

// ══ 1 · the analyser capture, before any page script runs ══════════════════
//
// The page never hands its analyser to anything a probe can reach, and the six
// followers are computed from it. Patching the constructor is the only way in
// that does not edit the page. And which analyser is WHICH is then settled by
// MEASUREMENT rather than by creation order (§2 below), because an order is a
// fact about today's source and the file is being edited by somebody else.
await S('Page.addScriptToEvaluateOnNewDocument', {
  source: `(() => {
    const store = (window.__probeAnalysers = []);
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const orig = AC.prototype.createAnalyser;
    AC.prototype.createAnalyser = function (...a) {
      const n = orig.apply(this, a);
      try {
        store.push({ node: n, at: performance.now(),
                     where: String(new Error().stack || '').split('\\n').slice(1, 4).join(' | ') });
      } catch {}
      return n;
    };
  })();`,
});

await S('Page.navigate', { url: `${BASE}/radio/` });

// The page starts listening from the transport bar's own click and from nowhere
// else. `startListening` is wired into the bar in the capture phase. ⚠️ AND
// THE BAR IS NOT THERE AT LOAD: this page builds its controls only once the
// station probe has answered, so a fixed wait is a race that reports "no
// control" about a page that is still coming up. Poll for it.
let pressed = null;
for (let i = 0; i < 60 && !pressed; i++) {
  await sleep(500);
  // ⚠️ `.tbar-toggle` FIRST, AND THE NAME IS NOT THE ONE `verify.mjs` USES.
  // That harness presses `.pos-controls button, .tbar-x`; `tbar-x` is the class
  // for an EXTRA button a page adds to the bar (READ
  // demo/shell/transport-bar.mjs:136), and the play/pause control is
  // `tbar-toggle` (READ :115). This page declares no controls at all, so on
  // 2026-09-15 `.tbar-x` matched nothing and the run reported "no transport
  // control" about a page that was up and fine.
  pressed = await ev(`(() => {
    const b = document.querySelector('.tbar-toggle')
      || document.querySelector('.tbar-x') || document.querySelector('.pos-controls button');
    if (!b || b.disabled) return null;
    b.click();
    return b.className;
  })()`).catch(() => null);
}
if (!pressed) { await bail('no transport control to press after 30 s'); }

// ── wait for the engine, and for the page to finish grading itself ─────────
//
// ⚠️ `finish()` PRESSES ITS OWN BUTTONS. The page's self-check holds the
// modulator, clicks `›` and `‹`, and reads a dozen controls back. So a
// measurement started before it lands is measuring a page that is exercising
// itself. Wait for the assert burst to stop growing.
let engUp = false;
for (let i = 0; i < 240 && !engUp; i++) {
  await sleep(500);
  engUp = await ev(`!!(window.__eng && window.__scope)`).catch(() => false);
  if (!engUp) {
    const err = await ev(`window.__granErr || null`).catch(() => null);
    if (err) { await bail(`the granulator refused: ${String(err).slice(0, 300)}`); }
  }
}
if (!engUp) await bail('the granulator never booted within 120 s');

// 🔴 PAST THE SHELL'S OWN ASSERTS, NOT PAST THE FIRST ONE. `mount()` lands two
// asserts at t+0 on EVERY shelled page and publishes the count as
// `__demo.shellAsserts` (READ demo/shell/shell.mjs:272). A wait for "some
// asserts, then quiet" is satisfied by those two in the first second. So the
// first version of this file started measuring forty seconds before the page's
// own `finish()` ran, and `finish()` CALLS `modulator.hold(true)` and clicks the
// patch buttons. The whole parameter row would have been measured on a page that
// was deliberately holding still, and it would have read as a finding.
const shellN = await ev(`window.__demo?.shellAsserts ?? 0`).catch(() => 0);
let lastN = -1; let stable = 0;
for (let i = 0; i < 300 && stable < 5; i++) {
  await sleep(500);
  const n = await ev(`(window.__demo?.asserts || []).length`).catch(() => 0);
  if (n === lastN && n > shellN) stable++; else { stable = 0; lastN = n; }
}
const selfCheck = await ev(`(() => {
  const a = window.__demo?.asserts || [];
  return { n: a.length, shell: window.__demo?.shellAsserts ?? 0,
           bad: a.filter((x) => !x.pass).map((x) => x.label) };
})()`);
if (selfCheck.n <= selfCheck.shell) {
  console.log(`  ⚠️  the page never got past its ${selfCheck.shell} shell asserts. Its own self-check`);
  console.log('      may still run during the measurement, and it holds the modulator while it does.');
}
// and give the self-check's `hold(false)` a moment to land
await sleep(1500);

// ⚠️ `__demo.logs` HOLDS OBJECTS, NOT STRINGS. They are `{ t, msg, kind }`, so a regex run
// straight over the array matches nothing and returns null, which reads as "the
// page never said" rather than as "we looked in the wrong shape".
const station = await ev(`(() => {
  const L = (window.__demo?.logs || []).map((l) => (typeof l === 'string' ? l : l.msg || ''));
  const relay = L.find((l) => /relay /.test(l)) || '';
  const m = relay.match(/\\/s\\/([A-Za-z0-9_-]+)/) || relay.match(/relay\\s+(\\S+)/);
  return m ? String(m[1]).split('/').pop() : null;
})()`).catch(() => null);

// ── 1b · the frame rate BEFORE anything of ours is in the frame ────────────
//
// plan §6.3: "Nobody has measured the headroom", and §8 makes it step 0b. The
// tap below runs INSIDE `meterTick`, so a rate measured after it is installed
// is a rate this script is part of. Measure it first, with a loop that does
// nothing but write a timestamp.
const PRE_FRAMES = await ev(`new Promise((ok) => {
  const t = [];
  const t0 = performance.now();
  const step = () => { t.push(performance.now()); if (performance.now() - t0 < 4000) requestAnimationFrame(step); else ok(t); };
  requestAnimationFrame(step);
})`).catch(() => []);

// ══ 2 · the taps ═══════════════════════════════════════════════════════════
const TAPS = String.raw`(() => {
  if (window.__F) return 'already';
  const eng = window.__eng, scope = window.__scope;
  const PAPPUS_NODE = 3000;
  const now = () => performance.now();

  // A histogram is the right shape for "range and distribution", and it is
  // bounded: an array of every sample is a second uncounted cap.
  function hist(lo, hi, bins) {
    const h = { lo, hi, bins, c: new Array(bins).fill(0), n: 0, min: Infinity, max: -Infinity, sum: 0, sum2: 0, under: 0, over: 0 };
    h.push = (v) => {
      if (!Number.isFinite(v)) return;
      h.n++; h.sum += v; h.sum2 += v * v;
      if (v < h.min) h.min = v;
      if (v > h.max) h.max = v;
      const i = Math.floor((v - lo) / (hi - lo) * bins);
      if (i < 0) h.under++; else if (i >= bins) h.over++; else h.c[i]++;
    };
    return h;
  }
  const dump = (h) => ({ lo: h.lo, hi: h.hi, c: h.c, n: h.n, min: h.min, max: h.max,
                         sum: h.sum, sum2: h.sum2, under: h.under, over: h.over });

  const F = {
    t0: now(),
    // ── 1 · grains, FAR ──────────────────────────────────────────────────
    g: { t: [], pos: [], dur: [], voice: [], half: [], n: 0, dropped: 0, cap: 60000 },
    // ── 2 · parameter writes, NEAR ───────────────────────────────────────
    s: { n: 0, dropped: 0, cap: 60000, rows: [], byName: {} },
    // ── 3 · the frame clock and the six followers' raw inputs, NEAR ──────
    f: { n: 0, dropped: 0, cap: 20000, rows: [], bands: null, sr: 0, fft: 0,
         analyserIdx: -1, analyserWhere: null, idTries: 0, idNonZero: 0 },
    // ── 4 · /s_get round trips, FAR ──────────────────────────────────────
    ask: { pend: [], seq: 0 },
    ever: {},
    notes: [],
    on: true,
  };
  window.__F = F;

  // 🔴 A SECOND LISTENER, NOT A REPLACEMENT. SuperSonic's emitter holds a Set
  // per event and calls every member inside its own try/catch, so the page's
  // 'onReply' still runs and still consumes '/pgrain' from the reply ring.
  eng.sonic.on('in', (m) => {
    if (!F.on) return;
    const t = now();
    if (m[0] === '/pgrain') {
      const g = F.g;
      if (g.n >= g.cap) { g.dropped++; return; }
      g.n++;
      g.t.push(t); g.pos.push(m[3]); g.dur.push(m[4]); g.voice.push(m[5]); g.half.push(m[6]);
      return;
    }
    // a /s_get answer is ['/n_set', nodeID, name, value]; /s_getn answers
    // ['/n_setn', nodeID, name, count, ...values].
    if ((m[0] === '/n_set' || m[0] === '/n_setn') && Number(m[1]) === PAPPUS_NODE) {
      const name = String(m[2]);
      const value = m[0] === '/n_setn' ? Number(m[4]) : Number(m[3]);
      const all = m[0] === '/n_setn' ? m.slice(4).map(Number) : null;
      for (let i = 0; i < F.ask.pend.length; i++) {
        if (F.ask.pend[i].name === name) {
          const p = F.ask.pend.splice(i, 1)[0];
          p.done({ value, all, tReq: p.tReq, tReply: t });
          return;
        }
      }
    }
  });

  // NEAR: everything this page writes, timestamped as it leaves. 'setParam'
  // reads 'eng.send' at call time, so replacing the property is enough.
  F.rawSend = eng.send;
  eng.send = (...m) => {
    if (F.on && (m[0] === '/n_set' || m[0] === '/n_setn')) {
      const s = F.s;
      const name = String(m[2]);
      const arr = m[0] === '/n_setn' ? m.slice(4) : null;
      const v0 = arr ? arr[0] : Number(m[3]);
      // ⚠️ CUMULATIVE, AND IT SURVIVES reset(). A destination that is written
      // ONCE when the patch is applied and never again looks identical to one
      // that was never routed at all, if the only record starts after the
      // patch. The ever map is what separates "routed and inert" from
      // "not routed".
      const e = (F.ever[name] = F.ever[name] || { n: 0, min: Infinity, max: -Infinity, first: now(), last: 0 });
      e.n++; e.last = now();
      if (v0 < e.min) e.min = v0;
      if (v0 > e.max) e.max = v0;
      if (s.n < s.cap) {
        s.n++;
        s.rows.push([now(), name, v0, arr ? arr.length : 0]);
        (s.byName[name] = s.byName[name] || []).push([now(), v0]);
      } else s.dropped++;
    }
    return F.rawSend(...m);
  };
  F.askRaw = (name) => new Promise((done) => {
    const t = now();
    F.ask.pend.push({ name, tReq: t, done });
    F.rawSend('/s_get', PAPPUS_NODE, name);
    setTimeout(() => {
      const i = F.ask.pend.findIndex((p) => p.tReq === t && p.name === name);
      if (i >= 0) { F.ask.pend.splice(i, 1); done(null); }
    }, 2500);
  });
  F.set = (name, v) => F.rawSend('/n_set', PAPPUS_NODE, name, v);

  // ── the frame tap ────────────────────────────────────────────────────────
  //
  // 'meterTick' ends with 'scope.feed(buf, ctx.sampleRate)', and 'buf' is the
  // very array it read off the page's analyser three statements earlier. So
  // this runs once per frame, sees the exact samples, and needs no clock.
  const BANDS = 24, B_LO = 40, B_HI = 12000;   // plan §4.2 row 0
  const edges = [];
  for (let i = 0; i <= BANDS; i++) edges.push(B_LO * Math.pow(B_HI / B_LO, i / BANDS));
  // ⚠️ THE FLOOR IS -160, NOT -120, AND IT MOVED BECAUSE IT WAS BEING HIT.
  // getFloatFrequencyData reports -Infinity for a bin with nothing in it (the
  // page guards for exactly that), so a quiet station drags a band's mean below
  // any floor a histogram picks. At -120 the quietest band put 377 of 1800
  // frames under the edge and the report printed -120.0 as if it were a
  // reading. A percentile at a histogram's own boundary is the boundary, not a
  // measurement, so the edge moved down and the count is printed either way.
  F.f.bands = { edges, hist: Array.from({ length: BANDS }, () => hist(-160, 0, 160)) };
  F.f.rmsDb = hist(-160, 0, 160);
  F.f.centroid = hist(0, 8000, 160);
  F.f.flat = hist(0, 1, 200);
  F.f.dt = hist(0, 60, 120);
  F.f.lag = hist(0, 2048, 64);           // samples advanced between frames
  // 🔴 THE INSTRUMENT'S OWN COST, BECAUSE IT SITS INSIDE THE FRAME IT IS
  // TIMING. A frame rate measured with this tap installed is a frame rate this
  // tap is part of; without this number there is no way to tell a page that is
  // short of headroom from a probe that took it.
  F.f.tap = hist(0, 20, 200);

  let freq = null, prevMag = null, prevBuf = null, lastT = 0;

  function identify(buf) {
    // 🔴 BY MEASUREMENT, NOT BY ORDER. Fill a scratch array from each captured
    // analyser and keep the one whose samples ARE the samples 'meterTick' just
    // handed us. Creation order would be a fact about today's source; this is a
    // fact about which node the page actually read.
    const store = window.__probeAnalysers || [];
    F.f.analyserCount = store.length;
    F.f.idTries++;
    let nz = 0;
    for (let i = 0; i < buf.length; i += 97) if (buf[i] !== 0) { nz++; if (nz > 3) break; }
    if (nz <= 3) return false;            // silence identifies nothing
    F.f.idNonZero++;
    for (let k = 0; k < store.length; k++) {
      const a = store[k].node;
      if (a.fftSize !== buf.length) continue;
      const tmp = new Float32Array(a.fftSize);
      a.getFloatTimeDomainData(tmp);
      let same = true;
      for (let i = 0; i < buf.length && same; i += 61) if (tmp[i] !== buf[i]) same = false;
      if (same) {
        F.f.analyserIdx = k; F.f.analyserWhere = store[k].where;
        F.f.analyserCount = store.length;
        return true;
      }
    }
    return false;
  }

  const origFeed = scope.feed.bind(scope);
  scope.feed = function (buf, sr) {
    const t = performance.now();
    try { if (F.on) onFrame(buf, sr); } catch (e) { F.notes.push('frame tap: ' + e.message); F.on = false; }
    F.f.tap.push(performance.now() - t);
    return origFeed(buf, sr);
  };

  function onFrame(buf, sr) {
    const t = now();
    const f = F.f;
    f.sr = sr;
    if (lastT) f.dt.push(t - lastT);
    lastT = t;

    // rms, from the page's own samples and the page's own formula
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);

    // HOW MUCH OF THIS READ IS NEW. Cross-correlate the tail of this frame
    // against the previous one, every 8th frame, and report the advance in
    // samples. §2.1 of the plan INFERS 61% overlap at 60 Hz from the window
    // length; this measures it.
    if (prevBuf && (f.n % 8 === 0)) {
      const W = 128, span = buf.length - W;
      let best = -1, bestS = -Infinity;
      for (let lag = 0; lag <= span; lag += 8) {
        let s = 0;
        for (let i = 0; i < W; i++) s += prevBuf[lag + i] * buf[i];
        if (s > bestS) { bestS = s; best = lag; }
      }
      if (best >= 0) f.lag.push(best);
    }
    if (!prevBuf || prevBuf.length !== buf.length) prevBuf = new Float32Array(buf.length);
    prevBuf.set(buf);

    if (f.analyserIdx < 0 && !identify(buf)) { f.n++; return; }
    const an = (window.__probeAnalysers || [])[f.analyserIdx]?.node;
    if (!an) { f.n++; return; }
    const bins = an.frequencyBinCount;
    if (!freq || freq.length !== bins) { freq = new Float32Array(bins); prevMag = new Float32Array(bins); }
    an.getFloatFrequencyData(freq);
    f.fft = an.fftSize;

    // 'bandEdges()' in the page, verbatim: 20 Hz to 10 kHz, split at 300 and
    // 2000, and the same guard against an empty bin reporting -Infinity.
    const binHz = sr / an.fftSize;
    const lo = Math.max(1, Math.round(20 / binHz));
    const a = Math.round(300 / binHz), b = Math.round(2000 / binHz);
    const hi = Math.min(bins - 1, Math.round(10000 / binHz));
    let sLow = 0, sMid = 0, sHigh = 0, sAll = 0, sFreq = 0, sFlux = 0, sLog = 0, nLog = 0;
    for (let i = lo; i <= hi; i++) {
      const m = Number.isFinite(freq[i]) ? Math.pow(10, freq[i] / 20) : 0;
      sAll += m; sFreq += m * i * binHz;
      const d2 = m - prevMag[i];
      if (d2 > 0) sFlux += d2;
      if (i < a) sLow += m; else if (i < b) sMid += m; else sHigh += m;
      prevMag[i] = m;
      if (m > 0) { sLog += Math.log(m); nLog++; }
    }
    const n = hi - lo + 1;
    const centroid = sAll > 0 ? sFreq / sAll : 0;
    const tone = centroid > 0 ? Math.max(0, Math.min(1, Math.log(centroid / 100) / Math.log(80))) : 0;
    // spectral flatness: geometric over arithmetic mean, the quantity plan
    // §4.2 row 3 x=3 wants. Bins that read exactly 0 are left out of the
    // geometric mean rather than zeroing it.
    const flat = (nLog > 0 && sAll > 0) ? Math.exp(sLog / nLog) / (sAll / n) : 0;

    f.rmsDb.push(rms > 0 ? 20 * Math.log10(rms) : -100);
    f.centroid.push(centroid);
    f.flat.push(flat);

    // the 24 log bands of plan §4.2 row 0, as dB
    const E = f.bands.edges;
    for (let k = 0; k < BANDS; k++) {
      const i0 = Math.max(1, Math.round(E[k] / binHz));
      const i1 = Math.min(bins - 1, Math.round(E[k + 1] / binHz));
      let s = 0, c = 0;
      for (let i = i0; i <= i1; i++) { if (Number.isFinite(freq[i])) { s += Math.pow(10, freq[i] / 20); c++; } }
      f.bands.hist[k].push(c > 0 && s > 0 ? 20 * Math.log10(s / c) : -120);
    }

    if (f.rows.length < f.cap) {
      f.rows.push([t, rms, sLow / Math.max(1, a - lo), sMid / Math.max(1, b - a),
                   sHigh / Math.max(1, hi - b + 1), tone, sFlux / n, centroid, flat]);
    } else f.dropped++;
    f.n++;
  }

  F.dump = () => ({
    t0: F.t0, now: now(),
    g: { n: F.g.n, dropped: F.g.dropped, t: F.g.t, pos: F.g.pos, dur: F.g.dur, voice: F.g.voice, half: F.g.half },
    s: { n: F.s.n, dropped: F.s.dropped, rows: F.s.rows, ever: F.ever },
    f: { n: F.f.n, dropped: F.f.dropped, sr: F.f.sr, fft: F.f.fft,
         analyserIdx: F.f.analyserIdx, analyserWhere: F.f.analyserWhere,
         analyserCount: F.f.analyserCount, idTries: F.f.idTries, idNonZero: F.f.idNonZero,
         rows: F.f.rows, dt: dump(F.f.dt), lag: dump(F.f.lag), tap: dump(F.f.tap),
         rmsDb: dump(F.f.rmsDb), centroid: dump(F.f.centroid), flat: dump(F.f.flat),
         bandEdges: F.f.bands.edges, bands: F.f.bands.hist.map(dump) },
    notes: F.notes,
  });
  F.reset = () => {
    F.g = { t: [], pos: [], dur: [], voice: [], half: [], n: 0, dropped: 0, cap: F.g.cap };
    F.s = { n: 0, dropped: 0, cap: F.s.cap, rows: [], byName: {} };
    F.f.rows = []; F.f.n = 0; F.f.dropped = 0;
  };
  return 'ok';
})()`;

const tapped = await ev(TAPS);
if (tapped !== 'ok' && tapped !== 'already') await bail(`the taps did not install (${tapped})`);

// ══ 3 · phase A, a free run on whatever patch the page came up on ═══════════
const patchName = await ev(`(() => {
  const s = document.querySelector('.pos-pick select');
  if (s && s.options[s.selectedIndex]) return s.options[s.selectedIndex].text;
  return null;
})()`).catch(() => null);

console.log(`\naudio-field · plan-audio-shader §8 step 0, on the real page`);
console.log(`  base     ${BASE}`);
console.log(`  station  ${station || '(could not read it off the log)'}   (relay reports up: ${stationsUp.join(', ')})`);
console.log(`  page     ${selfCheck.n} asserts, ${selfCheck.bad.length} failing${selfCheck.bad.length ? ` (${selfCheck.bad.join('; ')})` : ''}`);
if (peers) console.log(`  ⚠️  ${peers} other debug Chrome(s) were running. Bandwidth and relay sockets are shared.`);
if (SWEPT) console.log(`  (swept ${SWEPT} profile dir(s) left by killed runs)`);
if (LANE_WHY) console.log(`  ⚠️  the lane table could not be read (${LANE_WHY}); lane fractions are omitted below`);
console.log(`\n  collecting ${SECONDS} s …`);

// 🔴 THE NEAR SIDE'S OWN CLAIM, READ OFF THE PAGE. `moving` is a count of
// ROUTINGS the modulator holds (READ demo/radio/index.html, `d.set('moving',
// modulator.moving().length)`), which is a fact about what the page intends.
// §2 puts it beside a count of what actually crossed the wire.
const readoutMoving = await ev(`window.__demo?.readout?.moving ?? null`).catch(() => null);

await ev(`window.__F.reset()`);
const A_T0 = Date.now();
await sleep(SECONDS * 1000);
const A = await ev(`JSON.stringify(window.__F.dump())`).then(JSON.parse);
const A_SEC = (Date.now() - A_T0) / 1000;

// ══ 4 · phase C, near against far ═════════════════════════════════════════
//
// Four separate questions, and the instrument is checked before any of them is
// believed (CLAUDE.md: a partial result that is too tidy is a broken collector).
const NEARFAR = String.raw`(async () => {
  const F = window.__F, out = { };
  const ask = F.askRaw;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ── C0 · does the readback DISCRIMINATE, and is it blind anywhere? ───────
  //
  // 🔴 EVERY CASE HERE IS RUN FROM A NON-ZERO BASE ON PURPOSE. The first
  // version set a control that was already 0, wrote to a misspelled name, read
  // 0 back, and reported that the write had been refused. It had proved
  // nothing at all: 0 before and 0 after is a statistic that is constant by
  // construction over its subject, which CLAUDE.md calls blind rather than weak.
  out.c0 = {};
  F.set('mswarm', 0.37);
  await sleep(150);
  out.c0.positive = await ask('mswarm');            // a real write must land
  F.set('mswarmXYZ', 0.42);                          // a name the engine has not got
  await sleep(200);
  out.c0.afterBadWrite = await ask('mswarm');        // must be unchanged
  out.c0.badNameRead = await ask('mswarmXYZ');       // what does the engine say?
  out.c0.otherBadName = await ask('mTotallyMadeUp'); // and about one never written
  F.set('mswarm', 0);
  await sleep(120);
  out.c0.restored = await ask('mswarm');

  // ── C0b · does every name the page writes EXIST on the node? ─────────────
  //
  // 🔴 THE EXACT FAILURE MOD_CMD WAS WRITTEN TO PREVENT, AUDITED. The page's
  // own note says scsynth discards an unknown control in silence, so a routing
  // can run, report, and never reach a single sample. Write a distinctive
  // value inside each lane, read it back, put the original back. A name the
  // engine has is one that answers with what was just written.
  out.c0b = [];
  for (const [dest, cmd, probe] of PROBES) {
    const was = await ask(cmd);
    if (!was) { out.c0b.push({ dest, cmd, answered: false }); continue; }
    // ⚠️ THE PAGE IS STILL WRITING WHILE THIS RUNS. A destination the modulator
    // is driving can be overwritten between our write and our read, which would
    // report a control that exists as one that does not. Count the page's own
    // writes across the window and mark the reading inconclusive rather than
    // negative.
    const n0 = (F.ever[cmd] || { n: 0 }).n;
    F.set(cmd, probe);
    await sleep(120);
    const got = await ask(cmd);
    const n1 = (F.ever[cmd] || { n: 0 }).n;
    F.set(cmd, was.value);
    await sleep(40);
    out.c0b.push({ dest, cmd, answered: true, was: was.value, probe,
                   got: got ? got.value : null, contended: n1 > n0,
                   held: !!(got && Math.abs(got.value - Math.fround(probe)) < 1e-5) });
  }

  // ── C1 · what this instrument can resolve ───────────────────────────────
  // Everything in C2 is a time measured through a request and a reply, so the
  // round trip is the floor. Measure it before quoting anything smaller.
  const rtt = [];
  for (let i = 0; i < 60; i++) {
    const r = await ask('mstrum');
    if (r) rtt.push(r.tReply - r.tReq);
  }
  out.c1 = { rtt };

  // ── C2 · a step, repeated, on a control nothing is modulating ───────────
  //
  // ⚠️ REPEATED, BECAUSE A SINGLE READING IS NOT A NUMBER. The plan's own §6.4
  // records the same preview measured four times on one laptop answering 0.24x,
  // 0.72x, 0.73x and 0.82x. NEAR is the instant /n_set left the page; FAR is the
  // instant scsynth first answered with the new value.
  out.c2 = [];
  for (const [name, lo, hi] of [['mswarm', 0.11, 0.73], ['mstrum', 0.017, 0.101]]) {
    const base = await ask(name);
    const hits = [];
    for (let k = 0; k < 15; k++) {
      const to = (k % 2) ? lo : hi;
      F.set(name, (k % 2) ? hi : lo);
      await sleep(120);
      const tSend = performance.now();
      F.set(name, to);
      let hit = null, polls = 0;
      for (let i = 0; i < 200 && hit == null; i++) {
        const r = await ask(name);
        if (!r) break;
        polls++;
        if (Math.abs(r.value - Math.fround(to)) < 1e-6) hit = r.tReply - tSend;
      }
      if (hit != null) hits.push([hit, polls]);
    }
    if (base) F.set(name, base.value);
    out.c2.push({ name, hits });
  }

  // ── C3 · the live disagreement, while the modulator is running ──────────
  out.c3 = {};
  const names = Object.keys(F.s.byName).filter((n) => (F.s.byName[n] || []).length > 8);
  out.c3.candidates = names;
  for (const name of names.slice(0, 3)) {
    const rows = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 12000) {
      const r = await ask(name);
      if (!r) break;
      rows.push([r.tReq, r.tReply, r.value]);
    }
    out.c3[name] = { rows, hist: (F.s.byName[name] || []).slice() };
  }

  // ── C5 · make the two sides disagree ON PURPOSE ─────────────────────────
  //
  // 🔴 THIS IS THE ONE A PRETTY FIELD WOULD HIDE. Write msize from OUTSIDE the
  // page. The engine takes it and the grains take it; the page's own record of
  // what it last sent does not change, because nothing told it. A row drawn
  // from the near side goes on showing the old value, and it looks exactly as
  // healthy as it did a second ago.
  {
    const near0 = (F.s.byName['msize'] || []).slice(-1)[0] || null;
    const far0 = await ask('msize');
    const grains0 = F.g.n;
    const FORCE = 0.019;                       // far from any patch value here
    const tForce = performance.now();
    F.set('msize', FORCE);
    const far1 = await ask('msize');
    await sleep(1200);
    const far2 = await ask('msize');
    // what did the grains that fired in that second actually use?
    const used = [];
    for (let i = grains0; i < F.g.n; i++) if (F.g.t[i] > tForce) used.push(F.g.dur[i]);
    // and how long until the page overwrites it without ever knowing?
    let tBack = null;
    const t1 = performance.now();
    while (performance.now() - t1 < 8000) {
      const last = (F.s.byName['msize'] || []).slice(-1)[0];
      if (last && last[0] > tForce) { tBack = last[0] - tForce; break; }
      await sleep(25);
    }
    out.c5 = { near0, far0: far0 ? far0.value : null, force: FORCE,
               far1: far1 ? far1.value : null, far2: far2 ? far2.value : null,
               usedMin: used.length ? Math.min.apply(null, used) : null,
               usedMax: used.length ? Math.max.apply(null, used) : null,
               usedN: used.length, tBack,
               nearStill: (F.s.byName['msize'] || []).slice(-1)[0] || null };
  }
  return out;
})()`;

// The probe list is built HERE, from the page's own lane table, so the value
// written to each control is inside the range that control declares. A probe
// outside a lane would be clipped by the engine and read back as "not held"
// about a control that is perfectly fine.
const PROBES = LANES
  ? Object.entries(LANES).filter(([, v]) => !v.n).map(([dest, v]) => {
    const sp = specOf(v);
    let probe = sp.map(0.37);
    if (v.quant) probe = Math.round(probe / v.quant) * v.quant;
    return [dest, engineName(dest), probe];
  })
  : [];

console.log('  near against far …');
const C = await ev(`(() => { const PROBES = ${JSON.stringify(PROBES)}; return ${NEARFAR}; })()`)
  .catch((e) => ({ error: String(e.message).slice(0, 300) }));

// ══ 5 · phase B, the patch sweep ══════════════════════════
//
// "Which of the 22 numbers actually MOVE" cannot be answered on one patch: the
// patch is the thing that decides. So press the page's own next button twelve
// times and watch the wire. ⚠️ PRESS THE BUTTON, NEVER CALL `applyPatch`. The
// page's own self-check carries that rule and the reason with it (`/floor/`
// spent five rounds on a handler called directly, which steps straight over the
// wiring the check is about).
const PATCH_SECS = 6;
let SWEEP_OUT = [];
const FWD = `[...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === '\u203a')`;
if (SWEEP) {
  // ⚠️ EXACTLY ONE OF THEM, OR PRESS NONE. There is one `createPicker` on this
  // page today and the station row is a `createChoice`, but a second picker
  // would make `[0]` a different control and the sweep would be a measurement
  // of the wrong row with nothing on screen saying so.
  const nFwd = await ev(`${FWD}.length`);
  if (nFwd !== 1) {
    console.log(`  (patch sweep skipped: found ${nFwd} "next" buttons, wanted exactly 1)`);
    SWEEP_OUT = null;
  } else {
    console.log(`  sweeping the patches, ${PATCH_SECS} s each …`);
    for (let i = 0; i < 12; i++) {
      await ev(`${FWD}[0].click()`);
      await sleep(700);                       // the glide the sliders take
      const name = await ev(`(() => {
        const s = document.querySelector('.pos-pick select');
        if (s) return s.options[s.selectedIndex] ? s.options[s.selectedIndex].text : null;
        const n = document.querySelector('.pos-pick .name, .pos-pick-name');
        return n ? n.textContent.trim() : null;
      })()`).catch(() => null);
      await ev(`window.__F.reset()`);
      await sleep(PATCH_SECS * 1000);
      const d = await ev(`JSON.stringify((() => {
        const F = window.__F;
        const by = {};
        for (const r of F.s.rows) { (by[r[1]] = by[r[1]] || []).push(r[2]); }
        // 🔴 HOW MANY GRAINS LAND IN ONE BUCKET IN ONE FRAME, which is the only
        // thing the plan's row 1 R cap (255) and its A "refused" counter are
        // about. Bucketed exactly as the plan does: 64 across the 8 s window,
        // after the same 60/8 rescale off the ring the page applies.
        const cell = new Map(); let worst = 0, worstFrame = 0;
        const frame = new Map();
        for (let i = 0; i < F.g.n; i++) {
          const w = Math.min(1, Math.max(0, F.g.pos[i] * 60 / 8));
          const b = Math.min(63, Math.floor(w * 64));
          const f = Math.floor(F.g.t[i] / (1000 / 60));
          const k = f + ':' + b;
          const v = (cell.get(k) || 0) + 1; cell.set(k, v);
          if (v > worst) worst = v;
          const q = (frame.get(f) || 0) + 1; frame.set(f, q);
          if (q > worstFrame) worstFrame = q;
        }
        return { grains: F.g.n, secs: ${PATCH_SECS}, worstCell: worst, worstFrame,
                 dests: Object.fromEntries(Object.entries(by).map(([k, vs]) =>
                   [k, { n: vs.length, min: Math.min(...vs), max: Math.max(...vs) }])),
                 voices: [...new Set(F.g.voice)].sort() };
      })())`).then(JSON.parse).catch(() => null);
      if (d) SWEEP_OUT.push({ ...d, name });
    }
  }
}

// ══ 6 · report ═════════════════════════════════════════════════════════════
const pct = (h, p) => {
  // p10/p50/p90 out of a histogram, by walking the bins
  const want = h.n * p;
  let seen = h.under;
  if (seen >= want) return h.lo;
  for (let i = 0; i < h.c.length; i++) {
    seen += h.c[i];
    if (seen >= want) return h.lo + (i + 0.5) * (h.hi - h.lo) / h.c.length;
  }
  return h.hi;
};
const f2 = (x, n = 2) => (Number.isFinite(x) ? x.toFixed(n) : '(none)');
const quant = (xs, p) => {
  if (!xs.length) return NaN;
  const a = xs.slice().sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor(a.length * p))];
};
// ⚠️ NOT `Math.min(...xs)`. A spread of sixty thousand grains is a RangeError,
// and it would arrive as "the collector failed" rather than as "the array was
// long". Reduce instead.
const mn = (xs) => xs.reduce((a, b) => (b < a ? b : a), Infinity);
const mx = (xs) => xs.reduce((a, b) => (b > a ? b : a), -Infinity);

const say = (s = '') => console.log(s);

say('');
say('═══ 1 · THE GRAIN STREAM · FAR SIDE ═══════════════════════════════════');
say(`  MEASURED over ${f2(A_SEC, 1)} s on patch "${patchName || '?'}".`);
{
  const g = A.g;
  const rate = g.n / A_SEC;
  say(`  ${g.n} grains, ${f2(rate, 2)} a second${g.dropped ? ` (⚠️ ${g.dropped} dropped by the tap's cap)` : ''}.`);
  if (g.n === 0) say('  ⚠️  ZERO. That is not a distribution, it is a broken collector or a silent engine.');
  else {
    const iv = [];
    for (let i = 1; i < g.t.length; i++) iv.push(g.t[i] - g.t[i - 1]);
    say(`  arrival gap ms   p10 ${f2(quant(iv, 0.1))}  p50 ${f2(quant(iv, 0.5))}  p90 ${f2(quant(iv, 0.9))}  max ${f2(mx(iv))}`);
    const pos = g.pos, dur = g.dur;
    say(`  pos  (fraction of the 60 s ring, engine's own field)`);
    say(`       min ${f2(mn(pos), 4)}  p10 ${f2(quant(pos, 0.1), 4)}  p50 ${f2(quant(pos, 0.5), 4)}  p90 ${f2(quant(pos, 0.9), 4)}  max ${f2(mx(pos), 4)}`);
    say(`       spanning ${f2((mx(pos) - mn(pos)) * 60, 2)} s of the ring; the page rescales by 60/8 onto its 8 s axis`);
    const win = pos.map((p) => Math.min(1, Math.max(0, p * 60 / 8)));
    const B = 64, bk = new Array(B).fill(0);
    for (const p of win) bk[Math.min(B - 1, Math.floor(p * B))]++;
    const used = bk.filter((c) => c > 0).length;
    say(`       on the plan's 64 buckets: ${used} of 64 ever occupied, busiest ${mx(bk)} grains in ${f2(A_SEC, 0)} s`);
    say(`  dur  (seconds; READ Engine_Pappus.sc:682, this is msize AFTER Lag.kr(0.02) and two clips)`);
    say(`       min ${f2(mn(dur), 5)}  p10 ${f2(quant(dur, 0.1), 5)}  p50 ${f2(quant(dur, 0.5), 5)}  p90 ${f2(quant(dur, 0.9), 5)}  max ${f2(mx(dur), 5)}`);
    if (LANE?.size) {
      const u = dur.map((d) => LANE.size.unmap(d));
      const lo = mn(u), hi = mx(u);
      say(`       on the page's own 0.002..4 s exponential lane: ${f2(lo, 4)}..${f2(hi, 4)} of 0..1`);
      say(`       = ${f2((hi - lo) * 255, 1)} steps of an 8-bit channel (plan §4.2 row 1 G)`);
      const distinct = new Set(dur.map((d) => Math.round(LANE.size.unmap(d) * 255))).size;
      say(`       distinct 8-bit codes actually produced: ${distinct}`);
    }
    const vc = {}; for (const v of g.voice) vc[v] = (vc[v] || 0) + 1;
    const hc = {}; for (const v of g.half) hc[v] = (hc[v] || 0) + 1;
    say(`  voice  ${JSON.stringify(vc)}   (plan §4.2 row 1 B maps 0..7 to 0..224)`);
    if (Object.keys(vc).length === 1) say('         🔴 ONE VALUE. A channel carrying it cannot change on this patch.');
    say(`  half   ${JSON.stringify(hc)}`);
    if (Object.keys(hc).length === 1) {
      say('         🔴 ONE VALUE, and READ Engine_Pappus.sc:996 and :1016 say it always will be here:');
      say('         `half` is not a stereo side, it is WHICH OF THE TWO GRANULATORS fired: 0 for the');
      say('         `m` one, 1 for the `n` one. The `n` granulator is DC.ar([0,0]) in this tab, so this');
      say('         field is constant by construction and grain-scope already draws it as a side.');
    }
  }
}

say('');
say('═══ 2 · THE PARAMETER STREAM · NEAR SIDE ══════════════════════════');
{
  const by = {};
  for (const row of A.s.rows) (by[row[1]] = by[row[1]] || []).push([row[0], row[2]]);
  const ever = A.s.ever || {};
  const all = LANES ? Object.keys(LANES) : [];
  say(`  MEASURED: ${A.s.n} control writes in ${f2(A_SEC, 1)} s = ${f2(A.s.n / A_SEC, 2)} a second, across ${Object.keys(by).length} names.`);
  say(`  The modulator's own clock is 25 Hz (READ demo/radio/index.html, MOD_HZ = 25).`);
  say(`  Declared destinations: ${all.length} (${all.length - 1} scalars + probs x8 = ${all.length - 1 + 8} numbers).`);
  say(`  The page's own readout says moving = ${JSON.stringify(readoutMoving)}. That is a count of ROUTINGS on the near side.`);
  say('  ⚠️ the `ever` column counts from the instant this probe went on, which is after the page has');
  say('     booted and applied its patch. A destination written once at patch time and never again');
  say('     shows 0 here, so 0 means "nothing since we started looking", never "never".');
  say('');
  say(`  ${'destination'.padEnd(12)} ${'engine'.padEnd(11)} ${'writes/s'.padStart(9)} ${'ever'.padStart(6)} ${'min'.padStart(10)} ${'max'.padStart(10)} ${'lane span'.padStart(10)}  8-bit steps`);
  for (const dest of all) {
    const cmd = engineName(dest);
    const rows = by[cmd] || [];
    const vs = rows.map((r) => r[1]);
    const lane = LANE?.[dest];
    const span = (lane && vs.length) ? Math.abs(lane.unmap(mx(vs)) - lane.unmap(mn(vs))) : null;
    const e = ever[cmd];
    say(`  ${dest.padEnd(12)} ${cmd.padEnd(11)} ${f2(rows.length / A_SEC, 2).padStart(9)} `
      + `${String(e ? e.n : 0).padStart(6)} `
      + `${(vs.length ? f2(mn(vs), 4) : '(none)').padStart(10)} ${(vs.length ? f2(mx(vs), 4) : '(none)').padStart(10)} `
      + `${(span == null ? '(none)' : f2(span, 4)).padStart(10)}  ${span == null ? '(none)' : f2(span * 255, 1)}`);
  }
  const moved = all.filter((d) => (by[engineName(d)] || []).length > 2);
  const everOnly = all.filter((d) => !moved.includes(d) && ever[engineName(d)]);
  say('');
  say(`  🔴 ${moved.length} of ${all.length} destinations were written more than twice in this window: ${moved.join(', ') || '(none)'}.`);
  if (everOnly.length) {
    say(`  🔴 ${everOnly.length} more were written a HANDFUL of times since the tap went on and then stopped:`);
    for (const d of everOnly) {
      const e = ever[engineName(d)];
      say(`     ${d}: ${e.n} write(s), ${f2(e.min, 4)}..${f2(e.max, 4)}. Routed and inert reads exactly like not routed`);
      say(`       on any surface that only counts destinations.`);
    }
  }
  say(`  The rest are constant by construction here. A texture channel for one of them cannot change,`);
  say('  which CLAUDE.md calls blind rather than weak.');
  for (const d of moved) {
    const perSec = (by[engineName(d)] || []).length / A_SEC;
    say(`     ${d}: ${f2(perSec, 2)} writes/s against 25 ticks/s, so ${f2(100 * (1 - perSec / 25), 1)}% of ticks sent nothing`);
    say(`       (the 0.005-of-a-lane dead-band, READ pappus-mod.mjs deadband).`);
  }
  const other = Object.keys(by).filter((c) => !all.some((d) => engineName(d) === c));
  if (other.length) say(`  (other control names on the wire in the same window, not modulator traffic: ${other.join(', ')})`);
}

say('');
say('═══ 3 · THE AUDIO STREAM · NEAR OF THE AUDIO BOUNDARY ═════════════════');
{
  const f = A.f;
  if (PRE_FRAMES.length > 2) {
    const d = [];
    for (let i = 1; i < PRE_FRAMES.length; i++) d.push(PRE_FRAMES[i] - PRE_FRAMES[i - 1]);
    say(`  step 0b, the page BEFORE this probe is in its frame: ${f2(1000 * (PRE_FRAMES.length - 1) / (PRE_FRAMES[PRE_FRAMES.length - 1] - PRE_FRAMES[0]), 2)} frames a second,`);
    say(`  gap p50 ${f2(quant(d, 0.5))} ms, p90 ${f2(quant(d, 0.9))} ms, max ${f2(mx(d))} ms over ${d.length} frames.`);
  }
  if (f.analyserIdx < 0) {
    say(`  ⚠️  the page's analyser was never identified (${f.idTries} frames tried, ${f.idNonZero} with signal).`);
    say('      Nothing below this line is available. Check the instrument before believing any absence.');
  } else {
    say(`  MEASURED with the probe installed: ${f.n} frames in ${f2(A_SEC, 1)} s = ${f2(f.n / A_SEC, 2)} frames a second.`);
    if (f.tap?.n) {
      say(`  ⚠️  and the probe is INSIDE that frame: it costs p50 ${f2(pct(f.tap, 0.5), 3)} ms, p90 ${f2(pct(f.tap, 0.9), 3)} ms,`);
      say(`      max ${f2(f.tap.max, 2)} ms per frame. Subtract it before reading the rate above as the page's.`);
    }
    say(`  The analyser was identified by comparing SAMPLES, not by creation order:`);
    say(`  index ${f.analyserIdx} of ${f.analyserCount} created, fftSize ${f.fft}, sampleRate ${f.sr}.`);
    say(`    ${String(f.analyserWhere || '').split('|')[1]?.trim() || String(f.analyserWhere || '').slice(0, 120)}`);
    const dt = f.dt;
    say(`  frame gap ms     p10 ${f2(pct(dt, 0.1))}  p50 ${f2(pct(dt, 0.5))}  p90 ${f2(pct(dt, 0.9))}  max ${f2(dt.max)}`);
    const win = f.fft / f.sr * 1000;
    say(`  INFERRED: a ${f.fft}-sample window at ${f.sr} Hz is ${f2(win, 1)} ms, so it is fully refreshed`);
    say(`            ${f2(1000 / win, 2)} times a second. That is the independent-information rate.`);
    const lg = f.lag;
    if (lg.n) {
      say(`  MEASURED rather than inferred: the buffer advanced p10 ${f2(pct(lg, 0.1), 0)} / p50 ${f2(pct(lg, 0.5), 0)} / p90 ${f2(pct(lg, 0.9), 0)} samples`);
      say(`            between consecutive reads (cross-correlation, n=${lg.n}), so p50 overlap is `
        + `${f2(100 * (1 - pct(lg, 0.5) / f.fft), 1)}% and p50 new content is ${f2(1000 * pct(lg, 0.5) / f.sr, 1)} ms.`);
    }
    say('');
    say('  What meterTick computes every frame, and what it actually spanned on this material:');
    say(`    rms dBFS      p10 ${f2(pct(f.rmsDb, 0.1), 1)}  p50 ${f2(pct(f.rmsDb, 0.5), 1)}  p90 ${f2(pct(f.rmsDb, 0.9), 1)}   ⚠️ NOT LUFS: no K-weighting, no gating.`);
    say(`    centroid Hz   p10 ${f2(pct(f.centroid, 0.1), 0)}  p50 ${f2(pct(f.centroid, 0.5), 0)}  p90 ${f2(pct(f.centroid, 0.9), 0)}`);
    say(`    flatness      p10 ${f2(pct(f.flat, 0.1), 4)}  p50 ${f2(pct(f.flat, 0.5), 4)}  p90 ${f2(pct(f.flat, 0.9), 4)}`);
    say('');
    say('  The 24 log bands of plan §4.2 row 0, 40 Hz to 12 kHz, mean magnitude per bin in dB:');
    say(`    ${'band Hz'.padStart(14)}  ${'p10'.padStart(7)} ${'p50'.padStart(7)} ${'p90'.padStart(7)}  ${'range'.padStart(6)}  (dB+72)/72 at p10..p90`);
    let worstLo = Infinity, worstHi = -Infinity;
    for (let k = 0; k < f.bands.length; k++) {
      const h = f.bands[k];
      const lo = f.bandEdges[k], hi = f.bandEdges[k + 1];
      const p10 = pct(h, 0.1), p50 = pct(h, 0.5), p90 = pct(h, 0.9);
      worstLo = Math.min(worstLo, p10); worstHi = Math.max(worstHi, p90);
      say(`    ${`${Math.round(lo)}-${Math.round(hi)}`.padStart(14)}  ${f2(p10, 1).padStart(7)} ${f2(p50, 1).padStart(7)} ${f2(p90, 1).padStart(7)}  ${f2(p90 - p10, 1).padStart(6)}  ${f2((p10 + 72) / 72, 3)}..${f2((p90 + 72) / 72, 3)}`
        + (h.under || h.over ? `   ⚠️ ${h.under} frame(s) below this histogram's floor, ${h.over} above its ceiling` : ''));
    }
    say(`    across every band: p10 floor ${f2(worstLo, 1)} dB, p90 ceiling ${f2(worstHi, 1)} dB.`);
    say(`    the plan's (dB+72)/72 maps that to ${f2((worstLo + 72) / 72, 3)}..${f2((worstHi + 72) / 72, 3)} of 0..1.`);
  }
}

say('');
say('═══ 4 · NEAR AGAINST FAR · THE NUMBER THIS SCRIPT EXISTS FOR ══════════');
if (C.error) say(`  ⚠️  the near/far phase threw: ${C.error}`);
else {
  const c0 = C.c0 || {};
  const v = (r) => (r ? f2(r.value, 5) : 'NO ANSWER');
  say('  4a · does the readback discriminate? (break it on purpose, from a non-zero base)');
  say(`     set mswarm 0.37, read back            -> ${v(c0.positive)}     a real write lands`);
  say(`     write mswarmXYZ 0.42, read mswarm     -> ${v(c0.afterBadWrite)}     unchanged, so the bad name did not leak`);
  say(`     read mswarmXYZ (just written 0.42)    -> ${v(c0.badNameRead)}`);
  say(`     read mTotallyMadeUp (never written)   -> ${v(c0.otherBadName)}`);
  say(`     set mswarm 0, read back               -> ${v(c0.restored)}`);
  const blind = c0.badNameRead && Math.abs(c0.badNameRead.value) < 1e-9;
  if (blind) {
    say('     🔴 SO /s_get ANSWERS 0 FOR A CONTROL THE ENGINE HAS NOT GOT, rather than refusing.');
    say('        The write was discarded in silence AND the read-back cannot say so. A check that');
    say('        compares a read-back against an expected 0 therefore passes on a misspelled name.');
  }
  say('');
  say('  4b · does every name the page writes actually exist on the node?');
  say('     (write a value inside the lane, read it back, put the original back)');
  for (const r of (C.c0b || [])) {
    if (!r.answered) { say(`     ${r.dest.padEnd(10)} ${r.cmd.padEnd(11)} no answer at all`); continue; }
    say(`     ${r.dest.padEnd(10)} ${r.cmd.padEnd(11)} was ${f2(r.was, 4).padStart(8)} wrote ${f2(r.probe, 4).padStart(8)} read ${f2(r.got, 4).padStart(8)}  `
      + `${r.held ? 'HELD' : (r.contended ? 'inconclusive, the page overwrote it' : '🔴 NOT HELD')}`);
  }
  {
    const held = (C.c0b || []).filter((r) => r.held).length;
    const bad = (C.c0b || []).filter((r) => r.answered && !r.held && !r.contended);
    say(`     ${held} of ${(C.c0b || []).length} scalar destinations are names this engine really has.`);
    if (bad.length) say(`     🔴 ${bad.length} are NOT: ${bad.map((r) => `${r.dest} (${r.cmd})`).join(', ')}`);
    say('     (probs is an 8-element array written with /n_setn and is not in this table.)');
  }
  say('');
  const rtt = (C.c1?.rtt) || [];
  say('  4c · what this instrument can resolve');
  if (rtt.length) {
    say(`     /s_get round trip ms   p10 ${f2(quant(rtt, 0.1))}  p50 ${f2(quant(rtt, 0.5))}  p90 ${f2(quant(rtt, 0.9))}  max ${f2(mx(rtt))}  n=${rtt.length}`);
    say('     Nothing below may be quoted finer than this.');
    say('     ⚠️ AND /s_get READS THE CONTROL BEFORE Lag.kr(msize, 0.02) (READ Engine_Pappus.sc:485, :682),');
    say('        so every latency here is a FLOOR. INFERRED: the audio is a further 20 ms (one time');
    say('        constant, 63% there) to 60 ms (three, 95% there) behind what this reads.');
  } else say('     ⚠️ no round trips completed. Nothing below is trustworthy.');
  say('');
  say('  4d · a step on a control nothing is modulating, repeated');
  for (const st of (C.c2 || [])) {
    const hs = (st.hits || []).map((h) => h[0]);
    if (!hs.length) { say(`     ${st.name}: 🔴 the engine NEVER reported the new value. That is a write that did not land.`); continue; }
    say(`     ${st.name}: /n_set to first read-back carrying it, p10 ${f2(quant(hs, 0.1))}  p50 ${f2(quant(hs, 0.5))}  `
      + `p90 ${f2(quant(hs, 0.9))}  max ${f2(mx(hs))} ms, n=${hs.length} steps`);
    say(`       polls needed: p50 ${f2(quant(st.hits.map((h) => h[1]), 0.5), 0)}. A p50 inside one round trip means the`);
    say('       engine had it before we could ask twice.');
  }
  say('');
  say('  4e · the live disagreement, while the modulator is running');
  const cands = C.c3?.candidates || [];
  say(`     controls the page wrote often enough to grade: ${cands.join(', ') || '(none)'}`);
  for (const name of cands.slice(0, 3)) {
    const d = C.c3[name];
    if (!d || !d.rows?.length) { say(`     ${name}: no readbacks`); continue; }
    const hist = d.hist || [];
    const lastAtOrBefore = (t) => { let val = null; for (const h of hist) { if (h[0] <= t) val = h[1]; else break; } return val; };
    let matchReq = 0, matchReply = 0; const ages = []; const errs = [];
    for (const row of d.rows) {
      const tq = row[0], tr = row[1], held = row[2];
      const aq = lastAtOrBefore(tq), ar = lastAtOrBefore(tr);
      if (aq != null && Math.abs(Math.fround(aq) - held) < 1e-6) matchReq++;
      if (ar != null && Math.abs(Math.fround(ar) - held) < 1e-6) matchReply++;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i][0] <= tr && Math.abs(Math.fround(hist[i][1]) - held) < 1e-6) { ages.push(tr - hist[i][0]); break; }
      }
      if (ar != null) {
        const dest = Object.keys(LANES || {}).find((k) => engineName(k) === name);
        const lane = dest ? LANE[dest] : null;
        errs.push(lane ? Math.abs(lane.unmap(ar) - lane.unmap(held)) : Math.abs(ar - held));
      }
    }
    say(`     ${name}: ${d.rows.length} read-backs against ${hist.length} sends`);
    say(`       held == what the page had sent when the REQUEST left:  ${matchReq} of ${d.rows.length} (${f2(100 * matchReq / d.rows.length, 1)}%)`);
    say(`       held == what the page had sent when the REPLY arrived: ${matchReply} of ${d.rows.length} (${f2(100 * matchReply / d.rows.length, 1)}%)`);
    if (ages.length) {
      say(`       🔴 age of the value the engine was holding: p50 ${f2(quant(ages, 0.5))} ms, p90 ${f2(quant(ages, 0.9))} ms, max ${f2(mx(ages))} ms (n=${ages.length}).`);
      say('          That is the dead-band, not latency: the page writes only when the value MOVES, so');
      say(`          a texture uploaded 60 times a second would carry the same number for ${f2(quant(ages, 0.5) / 1000, 1)} s`);
      say(`          at the median, which is about ${f2(quant(ages, 0.5) * 60 / 1000, 0)} identical uploads in a row.`);
    }
    if (errs.length) {
      say(`       |held - last sent| as a fraction of the lane: p50 ${f2(quant(errs, 0.5), 5)}  p90 ${f2(quant(errs, 0.9), 5)}  max ${f2(mx(errs), 5)}`);
      say(`       = p90 ${f2(quant(errs, 0.9) * 255, 2)} and max ${f2(mx(errs) * 255, 2)} steps of an 8-bit channel.`);
    }
  }
  say('');
  say('  4f · the two sides made to disagree ON PURPOSE');
  if (C.c5) {
    const c5 = C.c5;
    say(`     msize was written from OUTSIDE the page to ${f2(c5.force, 4)} s.`);
    say(`       the engine took it:            /s_get -> ${f2(c5.far1, 5)} immediately, ${f2(c5.far2, 5)} after 1.2 s`);
    say(`       the grains that fired used it: ${c5.usedN} grains, dur ${f2(c5.usedMin, 5)}..${f2(c5.usedMax, 5)} s`);
    say(`       the PAGE's last-sent record:   ${c5.nearStill ? f2(c5.nearStill[1], 5) : '(none)'} s, unchanged, because nothing told it`);
    if (c5.nearStill && Number.isFinite(c5.far2)) {
      const dest = 'size';
      const lane = LANE?.[dest];
      const err = lane ? Math.abs(lane.unmap(c5.nearStill[1]) - lane.unmap(c5.far2)) : Math.abs(c5.nearStill[1] - c5.far2);
      say(`       🔴 near against far: ${f2(err, 4)} of the lane = ${f2(err * 255, 1)} steps of an 8-bit channel.`);
      say('          A parameter row drawn from the near side would have shown the old value the whole time,');
      say('          steady and healthy-looking, while the instrument was somewhere else entirely.');
    }
    say(`       the page overwrote it after ${c5.tBack == null ? 'more than 8 s (it never did)' : `${f2(c5.tBack)} ms`},`);
    say('       and it never knew it had been wrong.');
  } else say('     (not run)');
  say('');
  say('  4g · the far-side echo that needs no new wire');
  {
    const g = A.g, by = {};
    for (const row of A.s.rows) (by[row[1]] = by[row[1]] || []).push([row[0], row[2]]);
    const sizes = by[engineName('size')] || [];
    if (sizes.length > 5 && g.dur.length > 5) {
      const at = (t) => { let val = null; for (const h of sizes) { if (h[0] <= t) val = h[1]; else break; } return val; };
      let best = null;
      for (let off = 0; off <= 400; off += 5) {
        let sum = 0, n = 0;
        for (let i = 0; i < g.t.length; i++) {
          const want = at(g.t[i] - off);
          if (want == null) continue;
          sum += Math.abs(want - g.dur[i]); n++;
        }
        if (n > 5) { const e = sum / n; if (!best || e < best.e) best = { off, e, n }; }
      }
      const e0 = (() => { let sum = 0, n = 0; for (let i = 0; i < g.t.length; i++) { const w = at(g.t[i]); if (w == null) continue; sum += Math.abs(w - g.dur[i]); n++; } return n ? sum / n : NaN; })();
      say('     /pgrain dur IS msize after Lag.kr(0.02) (READ Engine_Pappus.sc:682), so the grain row already');
      say('     carries a far-side copy of one parameter with no new plumbing.');
      say(`       ${sizes.length} msize writes in the window, first at +${f2((sizes[0][0] - A.t0) / 1000, 1)} s, last at +${f2((sizes[sizes.length - 1][0] - A.t0) / 1000, 1)} s.`);
      say(`       Only grains after the first write can be compared: ${best ? best.n : 0} of ${g.n}.`);
      if (best) {
        say(`       mean |sent - used| at zero shift: ${f2(e0 * 1000, 3)} ms of grain length over ${best.n} grains.`);
        say(`       best shift found over 0..400 ms: ${best.off} ms, error ${f2(best.e * 1000, 3)} ms, an improvement of ${f2(100 * (1 - best.e / e0), 1)}%.`);
        say(`       ⚠️ grains arrive at ${f2(g.n / A_SEC, 1)}/s, so this can only resolve a lag to about ${f2(1000 * A_SEC / g.n, 0)} ms.`);
        if (Math.abs(1 - best.e / e0) < 0.05) {
          say('       A shift that buys nothing is not a lag of zero. On this patch the parameter barely');
          say('       moves between grains, so the two series agree at every shift and the instrument is blind.');
        }
      }
    } else say('     not enough size traffic or grains in this window to align the two series.');
  }
}

say('');
if (SWEEP && SWEEP_OUT && SWEEP_OUT.length) {
  say('');
  say('═══ 5 · THE PATCH SWEEP · which destinations move at all ══════════════');
  say(`  MEASURED, 6 s per patch, pressing the page's own › button.`);
  say(`  ${'patch'.padEnd(20)} ${'grains/s'.padStart(9)} ${'voices'.padStart(6)} ${'max/frame'.padStart(9)} ${'max/cell'.padStart(8)} ${'moving'.padStart(6)}  destinations written`);
  for (const p of SWEEP_OUT) {
    const dests = Object.keys(p.dests || {});
    const modul = dests.filter((c) => (p.dests[c].n > 3) && (p.dests[c].max !== p.dests[c].min));
    say(`  ${String(p.name || '?').slice(0, 20).padEnd(20)} ${f2(p.grains / p.secs, 1).padStart(9)} `
      + `${String((p.voices || []).length).padStart(6)} ${String(p.worstFrame ?? '?').padStart(9)} ${String(p.worstCell ?? '?').padStart(8)} `
      + `${String(modul.length).padStart(6)}  ${modul.join(' ') || '(none)'}`);
  }
  say('  max/frame is grains anywhere in one 16.7 ms frame; max/cell is grains in ONE of the plan\'s');
  say('  64 buckets in one frame, which is the only number row 1\'s 255 cap and its refused counter');
  say('  are about.');
  const everMoved = new Set();
  for (const p of SWEEP_OUT) for (const [c, v] of Object.entries(p.dests || {})) if (v.n > 3 && v.max !== v.min) everMoved.add(c);
  say('');
  say(`  🔴 across every patch, ${everMoved.size} control names ever moved: ${[...everMoved].join(', ')}`);
} else if (SWEEP) {
  say('');
  say('  (the patch sweep found no › button to press, so it was skipped)');
}

if (pageErrors.length) {
  say('');
  say(`⚠️  ${pageErrors.length} uncaught page error(s) during the run:`);
  for (const e of pageErrors.slice(0, 5)) say(`    ${String(e).slice(0, 200)}`);
}

if (JSON_OUT) {
  await writeFile(JSON_OUT, JSON.stringify({ base: BASE, station, seconds: A_SEC, A, C, sweep: SWEEP_OUT, lanes: LANES }, null, 1));
  say(`\n  raw numbers written to ${JSON_OUT}`);
}

await done(0);

// ── shutdown ───────────────────────────────────────────────────────────────
//
// ⚠️ `kill()` ASKS; IT DOES NOT STOP. CLAUDE.md: a still-shutting-down Chrome
// recreates the profile directory the handler has just deleted, which is a
// cleanup that runs, reports nothing and does nothing. SIGKILL and await exit.
async function done(code) {
  try { ws.close(); } catch { /* already gone */ }
  const bye = new Promise((r) => chrome.once('exit', r));
  chrome.kill('SIGKILL');
  await Promise.race([bye, sleep(4000)]);
  server?.close();
  process.exit(code);
}
async function bail(why) {
  console.log(`\naudio-field SKIPPED: ${why}`);
  await done(0);
}
