// node demo/verify.mjs [slug ...]: every built demo through the __demo contract, asserting on
// window.__demo, never DOM ids. Raw CDP over node's WebSocket, no dependencies.
// why: lessons/harness.md#verify

import { execFileSync } from 'node:child_process';
import { serve, PORT as HTTP_PORT } from './server.mjs';
import { DEMOS } from './manifest.mjs';
import { launchChrome, connectCdp } from './chrome.mjs';
import { startStation } from './fake-station.mjs';
import { startTapes } from './fake-tapes.mjs';
import { startErr } from './fake-err.mjs';
import { startBoard } from './fake-board.mjs';

// Chrome, its port and its per-run profile come from demo/chrome.mjs, which
// kills it and removes the profile on every path out.
// why: .claude/skills/positron-verify "A fixed port is a shared mutable global"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const want = process.argv.slice(2).filter((a) => !a.startsWith('--'));   // `--deep` is a tier, not a slug
// `gl: true` demos go to demo/verify-gl.mjs: this harness runs with --disable-gpu, where WebGL2 is
// null.
// why: lessons/harness.md#gl
const all = DEMOS.filter((d) => d.built && (!want.length || want.includes(d.name)));
const handedOff = all.filter((d) => d.gl);
const targets = all.filter((d) => !d.gl);
if (handedOff.length) {
  const n = handedOff.length;
  console.log(`(${handedOff.map((d) => d.name).join(', ')} ${n === 1 ? 'needs' : 'need'} a GPU — this harness runs --disable-gpu; use node demo/verify-gl.mjs)`);
}
if (!targets.length) { console.error('nothing for this harness to verify'); process.exit(handedOff.length ? 0 : 1); }

// Count other harness browsers and say so, since stray Chromes have turned runs red. `-f` matches
// the
// asker too, so our own pid and debugging port are excluded. Informational, never fatal.
// why: lessons/harness.md#peers
const peerBrowsers = (excludePort) => {
  try {
    return execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8' })
      .split('\n')
      .filter((l) => /Google Chrome/.test(l) && /--remote-debugging-port=(\d+)/.test(l))
      // Count browser processes only (no `--type=`): helpers inherit the command line, about ten
      // per browser.
      // why: lessons/harness.md#one-browser
      .filter((l) => !/--type=/.test(l))
      .filter((l) => Number(l.trim().split(/\s+/)[0]) !== process.pid)
      .filter((l) => !(excludePort && l.includes(`--remote-debugging-port=${excludePort}`)))
      .map((l) => {
        const port = (l.match(/--remote-debugging-port=(\d+)/) || [])[1];
        const udd = (l.match(/--user-data-dir=(\S+)/) || [])[1] || '?';
        return { port, udd };
      })
      // and a browser is its PORT: a relaunch on the same port is still one
      .filter((p, i, a) => a.findIndex((q) => q.port === p.port) === i);
  } catch { return []; }            // ps is not the subject; never fail on it
};
const peersAtStart = peerBrowsers(null);
if (peersAtStart.length) {
  const where = [...new Set(peersAtStart.map((p) => p.udd))];
  console.log(`⚠️  ${peersAtStart.length} other headless Chrome${peersAtStart.length === 1 ? '' : 's'} `
    + `already running (${where.slice(0, 3).join(', ')}${where.length > 3 ? ', …' : ''}).`);
  console.log('   A demo that needs the relay, the board or bandwidth can read RED for that reason alone.');
  console.log('   Run any failing demo ALONE before believing it: node demo/verify.mjs <slug>');
}

// Pages on somebody else's server are graded against stand-ins automatically (fake-station,
// fake-tapes, fake-err); DEMO_QUERY comes first, so `base=` can point a run elsewhere when asked.
// PEER_IN_PAGE: pages holding both ends of a WebRTC leg in one browser (see the grant below).
// why: lessons/harness.md#stand-ins
const PEER_IN_PAGE = new Set(['capture', 'wire']);
/** slug -> the `?base=` its page is pointed at, filled in as each one comes up. */
const standIn = new Map();
const standIns = [];
// The archived radio demo is `archive/radio` (folder demo/archive/radio/).
// why: lessons/harness.md#archive-radio
if (all.some((t) => t.name === 'archive/radio')) {
  const station = startStation({ port: 0, quiet: true });
  if (!station) {
    console.log('⚠️  the stand-in station needs ffmpeg and could not be built, so `archive/radio` '
      + 'will be graded against nothing rather than against ERR.');
  } else {
    await new Promise((r) => station.on('listening', r));
    standIn.set('archive/radio', `http://127.0.0.1:${station.address().port}`);
    standIns.push(station);
    console.log(`stand-in station ${standIn.get('archive/radio')} (nobody's radio)`);
  }
}
if (all.some((t) => t.name === 'tapes')) {
  const archive = startTapes({ port: 0, quiet: true });
  if (!archive) {
    console.log('⚠️  the stand-in archive needs ffmpeg and could not be built, so `tapes` '
      + 'will be graded against nothing rather than against archive.org.');
  } else {
    await new Promise((r) => archive.on('listening', r));
    standIn.set('tapes', `http://127.0.0.1:${archive.address().port}`);
    standIns.push(archive);
    console.log(`stand-in archive ${standIn.get('tapes')} (nobody's archive)`);
  }
}
// No ERR page today; the list and stand-in wiring stay so the next one is one slug here.
// why: lessons/harness.md#err-pages
const ERR_PAGES = [];
let errAt = null;
if (all.some((t) => ERR_PAGES.includes(t.name))) {
  const err = startErr({ port: 0, quiet: true });
  if (!err) {
    console.log('⚠️  the stand-in broadcaster needs ffmpeg and could not be built, so `flipper` '
      + 'will be graded against nothing rather than against ERR.');
  } else {
    await new Promise((r) => err.on('listening', r));
    errAt = `http://127.0.0.1:${err.address().port}`;
    // `/wall` is the arrangement where channel 0 refuses its newest minutes.
    // why: lessons/harness.md#wall
    standIn.set('flipper', `${errAt}/wall`);
    standIns.push(err);
    console.log(`stand-in broadcaster ${errAt} (nobody's ERR)`);
  }
}

// Board pages meet demo/fake-board.mjs and its own fake relay via `?relay=`, never studio-1.
// `listening: true` holds the lease as another listener would; `board=1` is not added, so the
// page's own guards stay graded. Add a page with one line here.
// why: lessons/harness.md#board-pages
const BOARD_PAGES = ['away'];
if (all.some((t) => BOARD_PAGES.includes(t.name))) {
  const fb = startBoard({ port: 0, quiet: true, listening: true });
  const relayUrl = await fb.ready;
  for (const n of BOARD_PAGES) standIn.set(n, { relay: relayUrl });
  standIns.push(fb);
  console.log(`stand-in board ${relayUrl}/room/studio-1 (nobody's Raspberry Pi, on nobody's relay)`);
}

// DEMO_BASE=https://positron.studio node demo/verify.mjs  -> verify the DEPLOY
const server = process.env.DEMO_BASE ? null : await serve(HTTP_PORT);
// The port actually bound, which may not be the one asked for.
// why: lessons/harness.md#bound-port
const BASE = process.env.DEMO_BASE || `http://127.0.0.1:${server.address().port}`;
// `server` is null only with DEMO_BASE. Two tiers: selfcheck=1 waits a page's `lightSettleMs`;
// DEMO_DEEP=1 or --deep is selfcheck=2 and waits the full `settleMs`.
// why: lessons/harness.md#tiers
const DEEP = process.env.DEMO_DEEP === '1' || process.argv.includes('--deep');
// A row with only `lightSettleMs` keeps it in the deep tier: deep never waits less.
const settleOf = (t) => (DEEP ? (t.settleMs ?? t.lightSettleMs) : (t.lightSettleMs ?? t.settleMs));
console.log(`base ${BASE}`);
console.log(DEEP ? 'tier: DEEP, the long-running checks included'
  : 'tier: ordinary (DEMO_DEEP=1 node demo/verify.mjs ... adds the long-running checks)');
// The cache is emptied every run: a media element's opaque entry for an m3u8
// is served to hls.js's later XHR for the same URL and rejected as CORS.
// why: .claude/skills/positron-verify "An engine switch invalidates the harness's HTTP cache"
const browser = await launchChrome({
  prefix: 'demo-verify-udd', clearCache: true,
  args: [
    '--disable-gpu', '--autoplay-policy=no-user-gesture-required', '--mute-audio',
    // OPT IN: Chrome's generated camera, for a page whose subject is a camera
    // (`/cam/`). Off by default, because with it every camera page in a run
    // publishes, and some of those publishes are Stream recordings.
    ...(process.env.DEMO_FAKE_CAMERA === '1'
      ? ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] : []),
  ],
}).catch((e) => { server?.close(); throw e; });
if (browser.swept) console.log(`(swept ${browser.swept} profile dir(s) left by killed runs)`);
const cdpPort = browser.port;

const cdp = await connectCdp(browser.wsUrl, { timeout: 30000 });
const { ws, send } = cdp;
const { sessionId, S } = await cdp.page();
await S('Page.enable'); await S('Runtime.enable'); await S('Log.enable'); await S('Network.enable');

let errors = [];
let failedReqs = [];
let abortedReqs = [];
let edgeMisses = [];   // LL-HLS live-edge part 404s: expected churn, capped
// Upstream refusals a demo asks for on purpose: counted and capped, never ignored, and labelled.
// why: lessons/harness.md#probed
let probed = [];
const reqUrl = new Map();   // requestId -> url, so a failure can be attributed
// DEMO_HOSTS=1 prints the hosts each demo touched, from Network.requestWillBeSent. Off by default.
// why: lessons/harness.md#hosts
const SHOW_HOSTS = process.env.DEMO_HOSTS === '1';
let hostHits = new Map();

// A rights refusal is recognised by ERR's host or the stand-in's own address plus the segment
// path, and from the whole log line: Chrome files CORS violations with an empty url.
// why: lessons/harness.md#err-refusal
const errRefusal = (s) => /live\.err\.ee/.test(s)
  || (errAt && s.includes(errAt)
      && /\/live\/[a-z0-9]+\/seg-\d+\.(?:ts|m4s)/.test(s));
cdp.on((m) => {
  if (m.sessionId !== sessionId) return;
  if (m.method === 'Network.requestWillBeSent') {
    const u = m.params.request?.url || '';
    reqUrl.set(m.params.requestId, u);
    if (SHOW_HOSTS) {
      // `data:` and `blob:` have no host and are this machine's own memory.
      try { const h = new URL(u).host; if (h) hostHits.set(h, (hostHits.get(h) || 0) + 1); }
      catch { /* not a URL with a host */ }
    }
  }
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    const e = m.params.entry;
    // A 404 on an LL-HLS part is normal at the live edge: recorded separately and capped.
    // why: lessons/harness.md#part-404
    if (/seg_\d+_part|_part_all\.mp4|\.m4s(\?|$)/.test(e.url || '') && /\b404\b/.test(e.text || '')) {
      edgeMisses.push(e.url);
    } else if (/webRTC\/play/.test(e.url || '') && /\b409\b/.test(e.text || '')) {
      // A 409 on a WHEP play URL means nothing publishes to the input: recorded and capped, never
      // ignored.
      // why: lessons/harness.md#whep-409
      probed.push(e.url);
    } else if (/webRTC\/play/.test(e.url || '') && /\b400\b/.test(e.text || '')) {
      // Cloudflare WHEP refuses a single-track offer with a 400; allowed and capped.
      // why: lessons/harness.md#whep-400
      probed.push(e.url);
    } else if (/shout\.positron\.studio/.test(e.url || '') && /\b50[02]\b/.test(e.text || '')) {
      // A 502 from `shout` is an origin down upstream; capped, since past the ceiling it is our
      // relay.
      // why: lessons/harness.md#shout-502
      probed.push(e.url);
    } else if (/positron-vain\.[^/]+\.workers\.dev|vain\.positron\.studio/.test(e.url || '')
               && /\b(404|413|415)\b/.test(e.text || '')) {
      // Deliberate refusals (413, 415, 404) asserted on the page; Chrome logs every 4xx. Capped.
      // why: lessons/harness.md#vain
      probed.push(e.url);
    } else if (/pub\.positron\.studio\/ice/.test(e.url || '') && /\b(404|503)\b/.test(e.text || '')) {
      // `/ice` 503 (no TURN key) or 404 (an older worker) means no relay; a 429 or 502 still goes
      // red.
      // why: lessons/harness.md#ice
      probed.push(e.url);
    } else if (/\.archive\.org/.test(e.url || '') && /\b5\d\d\b/.test(e.text || '')) {
      // archive.org 5xx on a metadata probe is their node; capped, since past it the archive is
      // down.
      // why: lessons/harness.md#archive-5xx
      probed.push(e.url);
    } else if (/^blob:/.test(e.url || '')
               && /ERR_REQUEST_RANGE_NOT_SATISFIABLE/.test(e.text || '')) {
      // Asking a recording blob its duration seeks past the end and logs a 416. `blob:` only: a 416
      // on
      // http is a real range bug. Capped.
      // why: lessons/harness.md#blob-416
      probed.push(e.url);
    } else if (errRefusal(`${e.url || ''} ${e.text || ''}`)
               && /\b403\b|CORS|ERR_FAILED/.test(e.text || '')) {
      // A rights refusal is a 403 without ACAO, reported as CORS. Capped: past it, it is an outage.
      // why: lessons/harness.md#rights
      probed.push(e.url);
    } else errors.push(e.url && !(e.text || "").includes(e.url) ? `${e.text} (${e.url})` : e.text);   // the address, or a 404 cannot be found
  }
  if (m.method === 'Network.loadingFailed') {
    // ERR_ABORTED is our own navigation tearing down media requests: recorded, not counted as
    // failure.
    // why: lessons/harness.md#aborted
    const url = reqUrl.get(m.params.requestId) || '';
    if (m.params.errorText === 'net::ERR_ABORTED') abortedReqs.push(m.params.errorText);
    else if (m.params.corsErrorStatus && errRefusal(url)) probed.push(url);
    // The same blob 416 on the network channel; `blob:` only, capped through `probed`.
    // why: lessons/harness.md#blob-416-net
    else if (/^blob:/.test(url) && m.params.errorText === 'net::ERR_REQUEST_RANGE_NOT_SATISFIABLE') probed.push(url);
    else failedReqs.push(`${m.params.errorText}${url ? ` ${url.slice(0, 70)}` : ''}`);
  }
});

async function ev(expr) {
  const r = await S('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

// Drag across every `[data-gesture]` element with real pointer events, on a Lissajous path
// (a straight drag ties every interpolator). Timestamps are supplied, 16 ms apart.
// why: lessons/harness.md#gesture
async function gesture() {
  const n = await ev(`document.querySelectorAll('[data-gesture]').length`);
  if (!n) return 0;
  const STEPS = 200, STEP_MS = 16;          // 200 samples over 3.2 s
  for (let k = 0; k < n; k++) {
    // Scroll into view and re-read the rectangle: an event below the 800x600 viewport lands on
    // nothing.
    // why: lessons/harness.md#scroll
    const b = await ev(`(() => {
      const e = document.querySelectorAll('[data-gesture]')[${k}];
      e.scrollIntoView({ block: 'center' });
      const r = e.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height,
               vw: innerWidth, vh: innerHeight };
    })()`);
    if (!b || b.w < 20 || b.h < 20) continue;
    // and clamp to what is actually on screen, for a surface taller than the
    // viewport even after scrolling
    const top = Math.max(0, b.y), bot = Math.min(b.vh, b.y + b.h);
    if (bot - top < 20) continue;
    b.y = top; b.h = bot - top;
    // inset, so the ends of the path are not clamped against the edges
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const ax = b.w * 0.40, ay = b.h * 0.38;
    const at = (i) => {
      const u = i / STEPS;
      return { x: cx + ax * Math.sin(2 * Math.PI * u + 0.4), y: cy + ay * Math.sin(4 * Math.PI * u) };
    };
    // TimeSinceEpoch, in SECONDS, which is what the CDP Input domain wants.
    const t0 = Date.now() / 1000;
    const p0 = at(0);
    await S('Input.dispatchMouseEvent', { type: 'mousePressed', x: p0.x, y: p0.y, button: 'left', clickCount: 1, buttons: 1, timestamp: t0 });
    for (let i = 1; i <= STEPS; i++) {
      const p = at(i);
      await S('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y, button: 'left', buttons: 1, timestamp: t0 + (i * STEP_MS) / 1000 });
    }
    const pn = at(STEPS);
    await S('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pn.x, y: pn.y, button: 'left', clickCount: 1, buttons: 0, timestamp: t0 + (STEPS * STEP_MS) / 1000 });
    await sleep(120);
  }
  return n;
}

// Type into every `[data-typing]` element with real keys: characters, a Backspace and an arrow key.
// Timing here is the harness's round trips (insertText takes no timestamp).
// why: lessons/harness.md#typing
async function typing() {
  const n = await ev(`document.querySelectorAll('[data-typing]').length`);
  if (!n) return 0;
  let done = 0;
  const focus = (k) => ev(`(() => {
    const e = document.querySelectorAll('[data-typing]')[${k}];
    if (!e || e.disabled || e.readOnly) return false;
    e.scrollIntoView({ block: 'center' });
    e.focus();
    return document.activeElement === e;
  })()`);
  for (let k = 0; k < n; k++) {
    let ok = await focus(k);
    // If every field refuses focus, press the primary control once and try again. The count is
    // fields actually typed into.
    // why: lessons/harness.md#arm-first
    if (!ok) {
      await ev(`document.querySelector('.pos-controls button.pos-pri')?.click()`);
      await sleep(400);
      ok = await focus(k);
    }
    if (!ok) continue;
    done++;
    for (const step of [
      { text: 'the harness types' },
      { key: 'Backspace' }, { key: 'Backspace' }, { key: 'Backspace' },
      { text: 'ed this' },
      { key: 'ArrowLeft' }, { key: 'ArrowLeft' }, { key: 'ArrowLeft' }, { key: 'ArrowLeft' },
      { text: 'really ' },
    ]) {
      if (step.text) {
        await S('Input.insertText', { text: step.text });
      } else {
        // a named key needs both halves; `windowsVirtualKeyCode` is what makes
        // Backspace and the arrows act rather than merely arrive
        const code = { Backspace: 8, ArrowLeft: 37, ArrowRight: 39 }[step.key];
        for (const type of ['keyDown', 'keyUp']) {
          await S('Input.dispatchKeyEvent', {
            type, key: step.key, code: step.key,
            windowsVirtualKeyCode: code, nativeVirtualKeyCode: code,
          });
        }
      }
      await sleep(40);
    }
    await sleep(200);
  }
  return done;
}

// ── run ─────────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
// The separator every suite line is printed with.
// why: lessons/harness.md#separator
const ok = (label, cond, detail) => {
  if (cond) { pass++; console.log(`  ok    ${label}${detail !== undefined ? `  · ${detail}` : ''}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail !== undefined ? `  · ${detail}` : ''}`); }
};

for (const t of targets) {
  console.log(`\n[${t.name}]`);
  errors = []; failedReqs = []; abortedReqs = []; edgeMisses = []; probed = []; reqUrl.clear();
  hostHits = new Map();
  // DEMO_QUERY is added to every page (e.g. `DEMO_QUERY='codec=vp8' node demo/verify.mjs moq`).
  // Each run gets a private room per demo, `<demo>-test-<hash>`, except `room: 'fixed'` rows, which
  // name a machine (studio-1) or a shared history. A device is still exclusive.
  // why: lessons/harness.md#own-room
  const own = t.room === 'fixed' ? '' : `room=${t.name.replace(/\//g, '-')}-test-${Math.random().toString(36).slice(2, 8)}`;
  // selfcheck tells a page it is being graded, so destructive checks stay out of a visit.
  // why: lessons/harness.md#selfcheck
  const q = [process.env.DEMO_QUERY, own, DEEP ? 'selfcheck=2' : 'selfcheck=1',
    standIn.has(t.name) ? (typeof standIn.get(t.name) === 'object'
      ? `relay=${standIn.get(t.name).relay}` : `base=${standIn.get(t.name)}`) : ''].filter(Boolean).join('&');
  const query = q ? `?${q}` : '';
  // PEER_IN_PAGE pages get audioCapture only (reset first): without it Chrome offers one host
  // candidate,
  // which on a VPN routes nowhere, and an in-page WebRTC pair never connects.
  // why: lessons/harness.md#audio-grant
  await send('Browser.resetPermissions').catch(() => {});
  if (PEER_IN_PAGE.has(t.name)) {
    await send('Browser.grantPermissions', { origin: new URL(BASE).origin, permissions: ['audioCapture'] });
  }
  await S('Page.navigate', { url: `${BASE}/${t.name}/${query}` });
  await sleep(1400);

  // Ready within 7.4 s unless the page declares `bootMs` in the manifest; an unready page is not
  // graded.
  // why: lessons/harness.md#boot-wait
  let ready = false;
  const bootTries = Math.max(40, Math.ceil(((t.bootMs || 0) - 1400) / 150));
  for (let i = 0; i < bootTries && !ready; i++) {
    ready = await ev('!!(window.__demo && window.__demo.ready)');
    if (!ready) await sleep(150);
  }
  ok('__demo.ready', ready);
  if (!ready) {
    // Print whether `__demo` exists at all: missing means the module never finished.
    // why: lessons/harness.md#no-demo
    console.log(`        __demo: ${await ev('typeof window.__demo')}`
      + `, ready ${await ev('window.__demo ? typeof window.__demo.ready : "n/a"')}`
      + `, asserts ${await ev('(window.__demo && window.__demo.asserts && window.__demo.asserts.length) ?? "n/a"')}`);
    console.log(`        failed: ${await ev('window.__demo && window.__demo.failed')}`);
    // Print the console here, since a page that never becomes ready skips the console check later.
    // why: lessons/harness.md#console
    for (const e of errors.slice(0, 5)) console.log(`        console: ${String(e).split('\n')[0].slice(0, 160)}`);
    if (!errors.length) console.log('        console: nothing, so it is hanging rather than throwing');
    continue;
  }

  const meta = await ev('({ name: __demo.name, keys: Object.keys(__demo.readout), hasT: !!__demo.transport, readoutOptOut: !!__demo.readoutOptOut })');
  ok('identity matches manifest', meta.name === t.name, meta.name);
  // A page with no readout must say `readout: null`; an absent field still fails.
  // why: lessons/harness.md#readout
  ok(meta.readoutOptOut ? 'declares that it has no readout, on purpose' : 'declares a readout',
    meta.readoutOptOut || meta.keys.length > 0,
    meta.readoutOptOut ? 'the page itself is the readout' : meta.keys.join(','));

  // This drill has a twin in demo/shell/bar-drill.mjs; bar-drill-test.mjs reads this file and fails
  // when a number moves here alone. Change both.
  // why: lessons/harness.md#drill-twin
  if (meta.hasT) {
    const t0 = await ev('({ pos: __demo.transport.position, playing: __demo.transport.playing, seekable: __demo.transport.seekable, lattice: __demo.transport.lattice, rate: __demo.transport.rate, toggles: __demo.transport.toggles !== false })');
    ok('transport published', typeof t0.pos === 'number', `pos ${t0.pos}`);
    ok('rate lattice from caps', t0.lattice === null || Array.isArray(t0.lattice), JSON.stringify(t0.lattice));

    // A bar may have no play button (`toggle: false`); `!== false` so older bars keep the drill.
    // why: lessons/harness.md#no-toggle
    if (!t0.toggles) console.log('        this bar has no play button, so the play/pause drill is skipped');
    else {
    // The toggle of the bar being graded (`__demo.transport`), not the first one in the document.
    // why: lessons/harness.md#toggle
    const TOGGLE = '__demo.transport.el.querySelector(".tbar-toggle")';
    // play advances position
    await ev(`${TOGGLE}.click()`);
    await sleep(500);
    const t1 = await ev('({ pos: __demo.transport.position, playing: __demo.transport.playing })');
    ok('play advances position', t1.playing && t1.pos > t0.pos, `${t0.pos.toFixed(0)} -> ${t1.pos.toFixed(0)}`);

    // pause holds it
    await ev(`${TOGGLE}.click()`);
    await sleep(300);
    const a = await ev('__demo.transport.position');
    await sleep(300);
    const b = await ev('__demo.transport.position');
    ok('pause holds position', !(await ev('__demo.transport.playing')) && Math.abs(b - a) < 1, `${a.toFixed(1)} == ${b.toFixed(1)}`);
    }

    // seek via the keyboard table the component owns
    if (t0.seekable) {
      // A bar in a closed `data-own-keys` tab hears no key, so open its tab as a person would, then
      // restore.
      // why: lessons/harness.md#open-tab
      const opened = await ev(`(() => {
        const p = __demo.transport.el.closest('[data-own-keys][hidden]');
        if (!p) return false;
        const root = p.parentNode.parentNode;
        const i = [...p.parentNode.children].indexOf(p);
        window.__drillWas = root.querySelector(':scope > .pos-tabs-bar > [aria-selected="true"]');
        root.querySelector(':scope > .pos-tabs-bar').children[i].click();
        return true;
      })()`);
      if (opened) await sleep(100);
      await ev('document.body.focus(); window.dispatchEvent(new KeyboardEvent("keydown",{key:"5",bubbles:true}))');
      await sleep(250);
      if (opened) await ev('window.__drillWas && window.__drillWas.click()');
      const mid = await ev('__demo.transport.position');
      const rng = await ev('__demo.transport.range');
      const target = rng[0] + (rng[1] - rng[0]) * 0.5;
      ok('keyboard seek lands', Math.abs(mid - target) < (rng[1] - rng[0]) * 0.02, `${mid.toFixed(0)} ~ ${target.toFixed(0)}`);
    }
  }

  const strip = await ev('!!document.querySelector("canvas.pos-strip")');
  if (strip) {
    // Sample after a frame and retry: a strip resize clears the canvas before its redraw. Not a
    // tolerance.
    // why: lessons/harness.md#sample
    const sample = () => ev(`(async () => {
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const c = document.querySelector('canvas.pos-strip');
      const g = c.getContext('2d');
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 4 * 53) if (d[i] + d[i+1] + d[i+2] > 90) lit++;
      return lit;
    })()`);
    let ink = 0, tries = 0;
    for (; tries < 3 && !ink; tries++) ink = await sample();
    ok('strip has ink', ink > 0, `${ink} lit samples${tries > 1 ? ` (${tries} tries)` : ''}`);
  }

  // Press every control in order, `.tbar-x` too. Then `data-gesture` elements get a real CDP drag,
  // since `element.click()` fires no pointer events.
  // why: lessons/harness.md#controls
  const SEL = '.pos-controls button, .tbar-x';
  const labels = await ev(`[...document.querySelectorAll(${JSON.stringify(SEL)})].map(b => b.textContent)`);
  for (let i = 0; i < (labels || []).length; i++) {
    await ev(`document.querySelectorAll(${JSON.stringify(SEL)})[${i}].click()`);
    // Control 0 waits `settleMs` from the manifest for live infrastructure; others 650 ms.
    // why: lessons/harness.md#settle
    await sleep(i === 0 && settleOf(t) ? settleOf(t) : 650);
  }
  if (labels?.length) console.log(`        (pressed ${labels.map((l) => JSON.stringify(l)).join(', ')})`);

  // Input comes after the controls: a page may need arming before it is drawn on.
  // why: lessons/harness.md#input-after
  const drawn = await gesture();
  if (drawn) console.log(`        (drew on ${drawn} surface${drawn > 1 ? 's' : ''})`);
  const typed = await typing();
  if (typed) console.log(`        (typed into ${typed} field${typed > 1 ? 's' : ''})`);

  // Wait while a control is `data-busy`, capped: a running handler has not finished.
  // why: lessons/harness.md#busy
  const busyCount = () =>
    ev(`document.querySelectorAll('.pos-controls button[data-busy="1"]').length`);
  let waited = 0;
  for (let i = 0; i < 100 && (await busyCount()) > 0; i++) { await sleep(400); waited += 400; }
  if (waited) console.log(`        (waited ${(waited / 1000).toFixed(1)} s for a control to finish)`);

  // Async checks: wait for the assert count to settle, with FIRST_ASSERT_CEIL for a page's first
  // assert (not `settleMs`, already spent on control 0).
  // why: lessons/harness.md#first-assert
  const FIRST_ASSERT_CEIL = 30000;
  const countAsserts = () => ev('(window.__demo && __demo.asserts.length) || 0');
  let n = await countAsserts();
  // The wait is armed by the page's `ready`, not by a zero count: shell asserts land at t+0.
  // why: lessons/harness.md#is-ready
  const isReady = () => ev('!!(window.__demo && window.__demo.ready)');
  const firstBudget = Math.ceil(Math.min(settleOf(t) || 0, FIRST_ASSERT_CEIL) / 400);
  // One loop: done when ready and the count has stopped. `shellAsserts` says which rows are the
  // shell's.
  // why: lessons/harness.md#one-loop
  const shellN = await ev('(window.__demo && window.__demo.shellAsserts) || 0');
  for (let i = 0; i < firstBudget && n <= shellN; i++) {
    await sleep(400);
    n = await countAsserts();
  }
  // Stop when the count has stopped growing for GROWTH_PATIENCE polls (2.0 s) and the page is
  // ready.
  // Pages hold notes and go quiet by design; 60 tries is a 24 s ceiling, free for a fast page.
  // why: lessons/harness.md#growth
  const GROWTH_PATIENCE = 5, GROWTH_TRIES = 60;
  let prev = -1, quiet = 0, done = await isReady();
  for (let i = 0; i < GROWTH_TRIES && (quiet < GROWTH_PATIENCE || !done); i++) {
    prev = n;
    await sleep(400);
    n = await countAsserts();
    quiet = n === prev ? quiet + 1 : 0;
    done = await isReady();
  }

  const asserts = await ev('__demo.asserts');
  ok('page asserted something', (asserts || []).length > 0, String((asserts || []).length));
  for (const a of asserts || []) ok(`page: ${a.label}`, a.pass, a.detail ?? undefined);

  // Folded into this one assert rather than added as a new one: a conditional
  // assert would make the suite total vary run to run, and a shrinking total
  // is exactly how four asserts went missing unnoticed earlier.
  const EDGE_CEILING = 25;
  // The flipper page asks ERR for segments on purpose: 45 ordinary, 72 deep, measured on the
  // stand-in.
  // why: lessons/harness.md#probe-ceiling
  const PROBE_CEILING = 90;
  // Name the kind of miss: a WHEP 409 when the rig is off is not an outage.
  // why: lessons/harness.md#edge
  const edgeOk = edgeMisses.length <= EDGE_CEILING;
  const probedOk = probed.length <= PROBE_CEILING;
  ok('no console errors', errors.length === 0 && edgeOk && probedOk,
    (errors.slice(0, 2).join(' | ') || '0')
    + (edgeMisses.length ? `  (+${edgeMisses.length} live-edge part 404${edgeMisses.length > 1 ? 's' : ''}`
      + `${edgeOk ? ', normal' : ` — OVER the ceiling of ${EDGE_CEILING}`})` : '')
    + (probed.length ? `  (+${probed.length} upstream refusal${probed.length > 1 ? 's' : ''} the demos probe for`
      + `${probedOk ? ', expected' : ` — OVER the ceiling of ${PROBE_CEILING}`})` : ''));
  ok('no failed requests', failedReqs.length === 0, failedReqs.slice(0, 2).join(' | ') || '0');
  if (SHOW_HOSTS) {
    const hosts = [...hostHits.entries()].sort((x, y) => y[1] - x[1]);
    console.log(`        hosts: ${hosts.length ? hosts.map(([h, n]) => `${h} x${n}`).join(', ') : 'none'}`);
  }
  if (abortedReqs.length) {
    console.log(`        (${abortedReqs.length} aborted on teardown — expected for a media page)`);
  }
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}`);
// Counted again at the end, and printed only on failure.
// why: lessons/harness.md#peers-again
if (fail) {
  const peersNow = peerBrowsers(cdpPort);
  const n = Math.max(peersAtStart.length, peersNow.length);
  if (n) {
    console.log(`\n⚠️  ${n} other headless Chrome${n === 1 ? ' was' : 's were'} running alongside this suite`
      + `${peersAtStart.length !== peersNow.length ? ` (${peersAtStart.length} at the start, ${peersNow.length} now)` : ''}.`);
    console.log('   THIS RUN IS NOT EVIDENCE OF A REGRESSION until the failing demos are re-run alone.');
  }
}
ws.close(); server?.close();
// SIGKILL and wait for Chrome's own exit before the profile goes, or a Chrome
// still shutting down recreates it. why: positron-verify "kill() ASKS"
await browser.close();
// The stand-ins go with the run. A server left listening on a port is the small
// version of the thing this harness exists to avoid.
for (const s of standIns) s.close();
process.exit(fail ? 1 : 0);
