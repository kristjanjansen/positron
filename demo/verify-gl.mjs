// demo/verify-gl.mjs — THE HARNESS THAT CAN SEE A GPU.
//
//   node demo/verify-gl.mjs              every demo that declares `gl: true`
//   node demo/verify-gl.mjs mirror       just this one
//
// ⚠️ WHY THIS EXISTS AT ALL, AND WHY IT IS A SEPARATE FILE.
//
// `verify.mjs` launches Chrome with `--disable-gpu`, and under that flag
// `canvas.getContext('webgl2')` returns **null** — not slow, absent. Measured
// on this machine, with verify.mjs's own flags:
//
//     webgl2 = false,  error = "no webgl2"
//
// So every assert in a visual demo would be unreachable, and per CLAUDE.md a
// page whose first assert sits behind that reports "asserted nothing" — which
// reads as broken — or asserts its own fallback and reads as fine. That is this
// project's most expensive recurring failure: 261/261 while a demo was fatally
// broken on iPhone; 291 asserts across three pages that had never played a
// frame of HLS. Visuals would reproduce it exactly.
//
// ⚠️ AND THE OBVIOUS FIX IS WORSE THAN THE BUG. Adding
// `--enable-unsafe-swiftshader` turns the suite green against a CPU rasteriser.
// Measured, same shader, same page:
//
//     --disable-gpu                      no context at all
//     --enable-unsafe-swiftshader        SwiftShader   170.7 Mpix/s
//     GPU allowed                        ANGLE Metal  1392.1 Mpix/s
//     (and the real Raspberry Pi GPU, §3.4)              50.3 Mpix/s
//
// The CPU rasteriser on a laptop is **3.4x faster than the real Pi GPU** and
// **8.2x slower than the real laptop GPU**. A harness "fixed" that way prints
// plausible numbers about a machine that does not exist: it would pass a page
// that crawls on a phone and fail one that flies on a laptop. So this file
// REFUSES to grade a run on a software rasteriser, and that refusal is the
// first assert — the same rule as the BUILD stamp, for the same reason.
// Without it every number below is unattributable.
//
// ⚠️ A GOLDEN IMAGE CANNOT BE THE ANSWER EITHER. The same shader with identical
// fixed inputs summed 48,147,330 of red on ANGLE Metal and 68,001,881 on
// SwiftShader — a 41% difference — because `fract(sin(dot(p,k)) * 43758.5453)`,
// the standard GLSL hash, amplifies last-bit float differences into unrelated
// noise. So "the picture is right" is asserted STRUCTURALLY by the page (it
// drew, it moved, it is not a flat field), never by comparing pixels across
// machines.
import { spawn } from 'node:child_process';
import { rm, readFile } from 'node:fs/promises';
import { serve } from './server.mjs';
import { DEMOS } from './manifest.mjs';

const CHROME = process.env.CHROME
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// ⚠️ A FIXED CDP PORT MEANS YOU MAY BE TALKING TO THE PREVIOUS BROWSER.
// Proving this file's own guard worked took two attempts: the first run of the
// SwiftShader test reported ANGLE Metal, because a Chrome from the run before
// was still alive on the fixed port — so the new flags never applied and the
// harness attached to the old browser. The numbers were about a process that
// had been started with different flags entirely. That is the same shape as the
// contaminated governor A/B in plan-visuals §3.4, and the fix is to let Chrome
// choose the port and read back which one it took.
const HTTP_PORT = 8892;                     // not verify.mjs's 8890: both may run
// 🔴 AND THE PROFILE IS PER-PROCESS, FOR THE SAME REASON AS THE PORT ABOVE.
// A fixed one was the last shared mutable global in this file: two agents
// running this harness in one checkout got one profile, one lock — and one of
// them got killed by the other's `pkill`, mid-run, reading as "chrome did not
// come up". The port lesson and the profile are the same lesson.
const PROFILE = `/private/tmp/claude-501/positron-verify-gl-${process.pid}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = process.env.DEMO_BASE ? null : await serve(HTTP_PORT);
// The port ACTUALLY bound, which may not be the one asked for — see
// serve()'s comment about a dev server already holding it.
const BASE = process.env.DEMO_BASE || `http://127.0.0.1:${server.address().port}`;
// (`server` is null only when DEMO_BASE is set, and then it is not read.)

// ⚠️ THE TARGET LIST IS CHECKED AFTER THE RENDERER, NOT BEFORE IT. Exiting
// early on "no visual demos yet" meant this file could not answer the question
// it exists for — CAN this machine grade a picture — and it read `0 green` on a
// box with no GPU at all, which is the same thing it reads on a box with one.
const want = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const targets = DEMOS.filter((d) => d.built !== false && d.gl)
  .filter((d) => !want.length || want.includes(d.name));

await rm(`${PROFILE}/Default/Cache`, { recursive: true, force: true }).catch(() => {});
// ⚠️ BEFORE the spawn, not after: Chrome writes this file as it starts, and
// removing it afterwards deletes the very thing being waited for.
await rm(`${PROFILE}/DevToolsActivePort`, { force: true }).catch(() => {});
// ⚠️ THERE USED TO BE A `pkill` HERE AND IT IS GONE ON PURPOSE. Chrome refuses
// to start on a LOCKED profile and simply exits, so a leftover browser from the
// previous run made this harness sit out its whole poll and report "chrome did
// not come up" — a Chrome problem in appearance, a stale process in fact. The
// kill fixed that and introduced a worse one: matched on a path that was the
// same for everybody, it reached the OTHER AGENT'S run as readily as the
// previous one. A per-process profile cannot be locked by anything but this
// process, so the problem the kill solved no longer exists and the collision it
// caused goes with it. A recovery action is not free (CLAUDE.md).

// ⚠️ NO `--disable-gpu`, AND NO SWIFTSHADER FLAG. The point of this file is the
// real device. `--headless=new` does use the GPU where one is available, which
// is why the renderer is asserted rather than assumed.
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--no-default-browser-check',
  '--autoplay-policy=no-user-gesture-required', '--mute-audio',
], { stdio: ['ignore', 'pipe', 'pipe'] });
chrome.stderr.on('data', () => {});

// Port 0 means "pick one", and Chrome writes it into the profile. Reading it
// back is what guarantees this is OUR browser and not one left running.
let wsUrl = null, cdpPort = null;
for (let i = 0; i < 60 && !wsUrl; i++) {
  await sleep(250);
  try {
    cdpPort = (await readFile(`${PROFILE}/DevToolsActivePort`, 'utf8')).split('\n')[0].trim();
    if (!cdpPort) continue;
    wsUrl = (await (await fetch(`http://127.0.0.1:${cdpPort}/json/version`)).json()).webSocketDebuggerUrl;
  } catch { /* not up yet */ }
}
if (!wsUrl) { chrome.kill(); server?.close(); throw new Error('chrome did not come up'); }

const ws = new WebSocket(wsUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let msgId = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  }
};
// ⚠️ THE BROWSER ENDPOINT HAS NO `Page` DOMAIN. `/json/version`'s socket talks
// to the BROWSER; `Page.navigate` and `Runtime.evaluate` live on a page target,
// so one has to be created and attached to first. Without it the very first
// call comes back `'Page.enable' wasn't found`, which reads like a Chrome
// version problem and is not one. verify.mjs does the same two lines.
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++msgId;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (method, params = {}) => send(method, params, sessionId);
const evalIn = async (expr) => {
  const r = await S('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'threw');
  return r.result.value;
};

await S('Page.enable');
await S('Runtime.enable');

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`  ${c ? 'ok   ' : 'FAIL '} ${n}${d ? `  — ${d}` : ''}`); };

// ── THE FIRST ASSERT, BEFORE ANY PAGE ────────────────────────────────────────
// Which renderer this run got. Everything after it is a claim about that
// renderer and nothing else, so it is established once, loudly, up front.
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
  // ⚠️ REFUSE, do not carry on. A run graded on SwiftShader is a run about a
  // machine nobody has. Reporting it as a pass is the failure this file exists
  // to prevent, and reporting it as "1 failure among 40 passes" buries it.
  console.log(`\n  ⚠ REFUSING TO GRADE ANYTHING ELSE.`);
  console.log(`    ${isSoft ? 'This is a software rasteriser. Its numbers describe no real device:' : 'There is no GPU context here.'}`);
  if (isSoft) console.log('    it is ~3.4x faster than a real Raspberry Pi GPU and ~8.2x slower than a real laptop GPU.');
  console.log('    Run this on a machine with a GPU, or fix the flags — never add --enable-unsafe-swiftshader.\n');
  ws.close(); chrome.kill(); server?.close();
  process.exit(1);
}

// ── then the pages ───────────────────────────────────────────────────────────
if (!targets.length) {
  console.log(`\n${want.length
    ? `no demo named ${want.join(', ')} declares gl: true in manifest.mjs`
    : 'no demo declares gl: true yet — but this machine can grade one when there is'}`);
  console.log(`renderer: ${RENDER.vendor} · ${RENDER.renderer}\n`);
  ws.close(); chrome.kill(); server?.close();
  process.exit(fail ? 1 : 0);
}

for (const t of targets) {
  console.log(`\n[${t.name}]`);
  const query = process.env.DEMO_QUERY ? `?${process.env.DEMO_QUERY}` : '';
  await S('Page.navigate', { url: `${BASE}/${t.name}/${query}` });
  await sleep(1500);

  // The page must report its own renderer, always — a visitor on a software
  // rasteriser is a real visitor and the page should say so rather than quietly
  // being slow. And it must AGREE with what this harness found, or one of them
  // is describing a different context.
  const said = await evalIn(`window.__demo?.gl?.renderer ?? null`);
  ok('the page reports which renderer it got', typeof said === 'string' && said.length > 0, said ?? 'it does not');
  if (typeof said === 'string') {
    ok('...and it agrees with this harness', said === RENDER.renderer,
       said === RENDER.renderer ? said : `page says ${said}, harness saw ${RENDER.renderer}`);
  }

  // Press every control, in order — the same contract as verify.mjs, and for
  // the same stated reason: a control the harness cannot press is a subject the
  // suite cannot reach.
  const n = await evalIn(`document.querySelectorAll('.pos-controls button').length`);
  for (let i = 0; i < n; i++) {
    await evalIn(`document.querySelectorAll('.pos-controls button')[${i}].click()`);
    await sleep(i === 0 ? (t.settleMs ?? 4000) : 1200);
  }
  // ⚠️ AND A PAGE WITH NO CONTROLS MUST STILL BE WAITED FOR. `mirror` starts
  // itself and runs its own checks, so there is nothing to press — pressing
  // zero buttons and reading immediately would report "asserted nothing" about
  // a page that was mid-check. Wait for `ready`, bounded, then read whatever is
  // there and let the count speak.
  for (let i = 0; i < 60; i++) {
    if (await evalIn(`!!window.__demo?.ready`)) break;
    await sleep(500);
  }
  const asserts = await evalIn(`JSON.stringify(window.__demo?.asserts ?? [])`);
  const list = JSON.parse(asserts || '[]');
  ok('the page asserted something', list.length > 0, `${list.length}`);
  // The shell's assert records are {label, pass, detail} — not {name, ok}.
  for (const a of list) ok(`page: ${a.label}`, a.pass, a.detail ?? '');
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}`);
console.log(`renderer: ${RENDER.vendor} · ${RENDER.renderer}\n`);
ws.close(); chrome.kill(); server?.close();
process.exit(fail ? 1 : 0);
