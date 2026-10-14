// node demo/verify-gl.mjs [slug]: `gl: true` demos on the real GPU (--disable-gpu has no WebGL2). A
// software rasteriser is refused first: SwiftShader is 3.4x a Pi GPU, 8.2x slower than this laptop.
// Pictures are asserted structurally, never against golden images.
// why: lessons/harness.md#verify-gl
import { serve } from './server.mjs';
import { DEMOS } from './manifest.mjs';
import { launchChrome, connectCdp } from './chrome.mjs';
import { startStation } from './fake-station.mjs';

// Chrome's port and per-run profile come from demo/chrome.mjs. A fixed port once
// attached this file to the previous run's Chrome and reported its flags.
const HTTP_PORT = 8892;                     // not verify.mjs's 8890: both may run
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = process.env.DEMO_BASE ? null : await serve(HTTP_PORT);
// The port actually bound, which may not be the one asked for.
// why: lessons/harness.md#gl-bound-port
const BASE = process.env.DEMO_BASE || `http://127.0.0.1:${server.address().port}`;
// (`server` is null only when DEMO_BASE is set, and then it is not read.)

// The target list is checked after the renderer, so a GPU-less box cannot read `0 green`.
// why: lessons/harness.md#gl-targets
const want = process.argv.slice(2).filter((a) => !a.startsWith('--'));
// Two tiers as in verify.mjs: DEMO_DEEP=1 or --deep is selfcheck=2 with the full settleMs.
// why: lessons/harness.md#gl-tiers
const DEEP = process.env.DEMO_DEEP === '1' || process.argv.includes('--deep');
const settleOf = (t) => (DEEP || t.lightSettleMs == null ? t.settleMs : t.lightSettleMs);
console.log(DEEP ? 'tier: DEEP, the long-running checks included'
  : 'tier: ordinary (DEMO_DEEP=1 node demo/verify-gl.mjs ... adds the long-running checks)');
const targets = DEMOS.filter((d) => d.built !== false && d.gl)
  .filter((d) => !want.length || want.includes(d.name));

// `videoradio` rotates ERR mounts, so it gets the fake-station stand-in; DEMO_QUERY base= still
// wins,
// and none is started against DEMO_BASE.
// why: lessons/harness.md#gl-videoradio
const standIn = new Map();
if (!process.env.DEMO_BASE && targets.some((t) => t.name === 'videoradio')) {
  const station = startStation({ port: 0, quiet: true });
  if (!station) {
    console.log('⚠️  the stand-in station needs ffmpeg and could not be built, so `videoradio` '
      + 'is graded against nothing rather than against ERR.');
    standIn.set('videoradio', 'http://127.0.0.1:9');
  } else {
    await new Promise((r) => station.on('listening', r));
    standIn.set('videoradio', `http://127.0.0.1:${station.address().port}`);
    console.log(`stand-in station ${standIn.get('videoradio')} (nobody's radio)`);
  }
}

// No --disable-gpu and no SwiftShader: the renderer is asserted, not assumed.
// why: lessons/harness.md#gl-no-disable-gpu
const browser = await launchChrome({
  prefix: 'positron-verify-gl', clearCache: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
}).catch((e) => { server?.close(); throw e; });
const cdp = await connectCdp(browser.wsUrl);
const { ws } = cdp;
const { S } = await cdp.page();
const evalIn = async (expr) => {
  const r = await S('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'threw');
  return r.result.value;
};

await S('Page.enable');
await S('Runtime.enable');

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`  ${c ? 'ok   ' : 'FAIL '} ${n}${d ? `  — ${d}` : ''}`); };

// The first assert, before any page: which renderer this run got.
// why: lessons/harness.md#gl-renderer
await S('Page.navigate', { url: `${BASE}/` });
await sleep(800);
const RENDER = await evalIn(`(() => {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2');
  if (!gl) return { webgl2: false, why: 'getContext("webgl2") returned null' };
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    webgl2: true,
    renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    // Which instrument could time a GPU pass here, and at what granularity.
    // §2.6: timestamp-query is quantised to 65.5 us so a cheap pass reads 0 or
    // 65.5 and nothing between; the EXT is raw nanoseconds and Chromium-only.
    timers: [
      gl.getExtension('EXT_disjoint_timer_query_webgl2') ? 'EXT_disjoint_timer_query_webgl2' : null,
    ].filter(Boolean),
  };
})()`);

console.log(`\n[renderer]`);
ok('a WebGL2 context exists at all', RENDER.webgl2 === true, RENDER.why ?? 'yes');
const SOFT = /swiftshader|llvmpipe|software|mesa offscreen/i;
const isSoft = RENDER.webgl2 && SOFT.test(String(RENDER.renderer));
ok('...and it is REAL HARDWARE, not a software rasteriser',
   RENDER.webgl2 && !isSoft,
   RENDER.webgl2 ? `${RENDER.vendor} · ${RENDER.renderer}` : '—');
if (RENDER.timers.length) console.log(`         GPU timing available: ${RENDER.timers.join(', ')}`);
else console.log('         GPU timing: none available here — a page must say "cannot measure", not print a zero');

if (!RENDER.webgl2 || isSoft) {
  // Refuse to grade the rest: a SwiftShader run is about a machine nobody has.
  // why: lessons/harness.md#gl-refuse
  console.log(`\n  ⚠ REFUSING TO GRADE ANYTHING ELSE.`);
  console.log(`    ${isSoft ? 'This is a software rasteriser. Its numbers describe no real device:' : 'There is no GPU context here.'}`);
  if (isSoft) console.log('    it is ~3.4x faster than a real Raspberry Pi GPU and ~8.2x slower than a real laptop GPU.');
  console.log('    Run this on a machine with a GPU, or fix the flags — never add --enable-unsafe-swiftshader.\n');
  ws.close(); await browser.close(); server?.close();
  process.exit(1);
}

// ── then the pages ───────────────────────────────────────────────────────────
if (!targets.length) {
  console.log(`\n${want.length
    ? `no demo named ${want.join(', ')} declares gl: true in manifest.mjs`
    : 'no demo declares gl: true yet — but this machine can grade one when there is'}`);
  console.log(`renderer: ${RENDER.vendor} · ${RENDER.renderer}\n`);
  ws.close(); await browser.close(); server?.close();
  process.exit(fail ? 1 : 0);
}

for (const t of targets) {
  console.log(`\n[${t.name}]`);
  // selfcheck=1 like verify.mjs, after DEMO_QUERY so an override wins.
  // why: lessons/harness.md#gl-selfcheck
  const q = [process.env.DEMO_QUERY, DEEP ? 'selfcheck=2' : 'selfcheck=1',
    standIn.has(t.name) ? `base=${standIn.get(t.name)}` : ''].filter(Boolean).join('&');
  const query = `?${q}`;
  await S('Page.navigate', { url: `${BASE}/${t.name}/${query}` });
  await sleep(1500);

  // The page reports its renderer and it must agree with the harness's.
  // why: lessons/harness.md#gl-page-renderer
  const said = await evalIn(`window.__demo?.gl?.renderer ?? null`);
  ok('the page reports which renderer it got', typeof said === 'string' && said.length > 0, said ?? 'it does not');
  if (typeof said === 'string') {
    ok('...and it agrees with this harness', said === RENDER.renderer,
       said === RENDER.renderer ? said : `page says ${said}, harness saw ${RENDER.renderer}`);
  }

  // Press every control; a page whose only control is its transport bar's play gets that pressed.
  // why: lessons/harness.md#gl-controls
  const SEL = `'.pos-controls button'`;
  const n = await evalIn(`document.querySelectorAll(${SEL}).length`);
  const onlyBar = n === 0 && await evalIn(`!!document.querySelector('.tbar-toggle')`);
  if (onlyBar) {
    await evalIn(`document.querySelector('.tbar-toggle').click()`);
    console.log('         (pressed the transport bar\'s play, the only control on the page)');
    await sleep(settleOf(t) ?? 4000);
  }
  for (let i = 0; i < n; i++) {
    await evalIn(`document.querySelectorAll(${SEL})[${i}].click()`);
    await sleep(i === 0 ? (settleOf(t) ?? 4000) : 1200);
  }
  // A page with no controls is still waited for (`ready`, bounded).
  // why: lessons/harness.md#gl-no-controls
  for (let i = 0; i < 60; i++) {
    if (await evalIn(`!!window.__demo?.ready`)) break;
    await sleep(500);
  }
  // A page that never said ready is reported with its last words, printed, not asserted.
  // why: lessons/harness.md#gl-never-ready
  if (!(await evalIn(`!!window.__demo?.ready`))) {
    const tail = await evalIn(`JSON.stringify((window.__demo?.logs ?? []).slice(-8).map((l) => l.msg ?? String(l)))`);
    console.log(`         not ready after 30 s; its last log lines:\n           ${JSON.parse(tail || '[]').join('\n           ')}`);
  }
  const asserts = await evalIn(`JSON.stringify(window.__demo?.asserts ?? [])`);
  const list = JSON.parse(asserts || '[]');
  ok('the page asserted something', list.length > 0, `${list.length}`);
  // The shell's assert records are {label, pass, detail}, not {name, ok}.
  // why: lessons/harness.md#gl-records
  for (const a of list) ok(`page: ${a.label}`, a.pass, a.detail ?? '');
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}`);
console.log(`renderer: ${RENDER.vendor} · ${RENDER.renderer}\n`);
ws.close(); await browser.close(); server?.close();
process.exit(fail ? 1 : 0);
