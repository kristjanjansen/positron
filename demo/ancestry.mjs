// demo/ancestry.mjs — WALK FROM AN ELEMENT TO THE ROOT AND PRINT, FOR EVERY
// ANCESTOR, ONE PROPERTY'S VALUE, ITS RECT, AND WHICH KIND OF CONTEXT IT MAKES.
//
//   node demo/ancestry.mjs fau '.fau-src textarea' padding-left
//   node demo/ancestry.mjs nola '.panel-plate' padding-top --width 375
//
// 🔴 IT EXISTS BECAUSE *"edge to edge"* WAS ANSWERED BY ZEROING THREE INSETS
// AND ASKED AGAIN THE NEXT DAY BECAUSE THERE WERE FOUR. The fourth was
// `.panel-case`'s own `padding: 0 var(--panel-pad)`, on the case, which no page
// rule touched, and **a child cannot reach its way out of a parent's padding
// however many of its own rules say 0.** `positron-ui` already gives the cure
// in words: *"Walk from the element to the surface and print every ancestor's
// padding, border and rect. It is one loop and it ends the argument."* This is
// that loop, as a command, so it is run rather than remembered.
//
// ✅ **AND IT SAYS WHICH ANCESTOR ESTABLISHES WHAT**, because the three things
// a positioned or overflowing child cares about are decided by three different
// ancestors and nothing on screen says which: the nearest STACKING CONTEXT
// (what a `z-index` is relative to), the nearest CONTAINING BLOCK (what an
// `absolute` child is placed against), and the nearest BLOCK FORMATTING CONTEXT
// (where margin collapsing stops). Each is printed with the reason it counts.
// ⚠️ The containing-block answer is cross-checked against `el.offsetParent`,
// which the browser computes independently; disagreement is this file's own
// self-test failing and is printed as such.
//
// ⚠️ **TWO THINGS ON THE LISTS THAT SURPRISE PEOPLE.** `overflow: clip` does
// NOT make a block formatting context while `overflow: hidden` does, so `clip`
// is excluded from the BFC reasons on purpose. And `container-type` other than
// `normal` DOES make one, silently, which is why adding a container query turns
// margin collapsing off inside it.
//
// 🔴 **THE PORT IS READ BACK FROM THE PROFILE, NEVER GUESSED**, for the reason
// `verify.mjs` records: a fixed port and `/json/list` attach to whatever Chrome
// is already there. The draft this was adopted from did exactly that.

import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : fallback; };
const bare = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
const [slug, SELECTOR, PROP = 'padding-left'] = bare;
const BASE = flag('base', process.env.DEMO_BASE || 'http://127.0.0.1:8890');
const WIDTH = Number(flag('width', 0)) || 0;
const WAIT = Number(flag('wait', 2000));

if (!slug || !SELECTOR) {
  console.error('usage: node demo/ancestry.mjs <slug> <selector> [property] [--width px] [--base URL] [--wait ms]');
  process.exit(2);
}

const PROFILE = await mkdtemp(join(tmpdir(), 'positron-anc-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--mute-audio',
], { stdio: ['ignore', 'pipe', 'pipe'] });
chrome.stderr.on('data', () => {});
// ⚠️ CHROME DIES WITH THIS PROCESS, WHATEVER KILLED IT. A run that threw
// after launch left a headless Chrome alive, and the next verify run marked
// itself as not evidence because of it. `exit` fires on a normal end, an
// uncaught throw and a SIGTERM; SIGINT is turned into an exit so it fires too.
process.on('exit', () => { try { chrome.kill(); } catch { /* already gone */ } });
process.on('SIGINT', () => process.exit(130));

let wsUrl = null, port = null;
for (let i = 0; i < 60 && !wsUrl; i++) {
  await sleep(250);
  try {
    if (!port) port = Number((await readFile(`${PROFILE}/DevToolsActivePort`, 'utf8')).split('\n')[0]);
    if (!Number.isFinite(port) || !port) { port = null; continue; }
    wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl;
  } catch { /* not up yet */ }
}
if (!wsUrl) { chrome.kill(); throw new Error('chrome did not come up'); }

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
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
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++msgId;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S('Page.enable');
await S('Runtime.enable');
if (WIDTH) {
  const mobile = WIDTH <= 560;
  await S('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: mobile ? 812 : 900, deviceScaleFactor: mobile ? 3 : 1, mobile });  // the phone is an iPhone mini, as in shot.mjs
}
await S('Page.navigate', { url: `${BASE}/${slug}/` });
await sleep(WAIT);

/* One function, evaluated in the page. It reads computed styles and rects and
   hands back JSON; nothing here changes the page. */
const FN = `(() => {
  const name = (n) => n.tagName.toLowerCase() + (n.id ? '#' + n.id : '')
    + (typeof n.className === 'string' && n.className.trim() ? '.' + n.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
  const set = (v) => v && v !== 'none' && v !== 'normal' && v !== 'auto';

  // A stacking context: what a z-index is relative to.
  // https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Stacking_context
  function stacking(el, cs, pcs) {
    const r = [];
    if (el === document.documentElement) r.push('root');
    if (cs.position !== 'static' && cs.zIndex !== 'auto') r.push('position:' + cs.position + '+z-index:' + cs.zIndex);
    if (cs.position === 'fixed' || cs.position === 'sticky') r.push('position:' + cs.position);
    if (pcs && /flex|grid/.test(pcs.display) && cs.zIndex !== 'auto') r.push('flex/grid child+z-index:' + cs.zIndex);
    if (parseFloat(cs.opacity) < 1) r.push('opacity:' + cs.opacity);
    for (const p of ['transform', 'scale', 'rotate', 'translate', 'perspective', 'filter', 'backdropFilter', 'mixBlendMode', 'maskImage', 'clipPath', 'containerType'])
      if (set(cs[p])) r.push(p + ':' + cs[p]);
    if (cs.isolation === 'isolate') r.push('isolation:isolate');
    if (/paint|layout|strict|content/.test(cs.contain)) r.push('contain:' + cs.contain);
    if (/(transform|opacity|filter|perspective|z-index|rotate|scale|translate|mix-blend-mode|isolation|contain)/.test(cs.willChange)) r.push('will-change:' + cs.willChange);
    return r;
  }
  // A containing block: what an absolute or fixed child is placed against.
  // https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_display/Containing_block
  function containing(cs) {
    const r = [];
    if (cs.position !== 'static') r.push('position:' + cs.position);
    for (const p of ['transform', 'translate', 'scale', 'rotate', 'perspective', 'filter', 'backdropFilter'])
      if (set(cs[p])) r.push(p + ':' + cs[p]);
    if (/transform|perspective|filter/.test(cs.willChange)) r.push('will-change:' + cs.willChange);
    if (/paint|layout|strict|content/.test(cs.contain)) r.push('contain:' + cs.contain);
    if (cs.containerType && cs.containerType !== 'normal') r.push('container-type:' + cs.containerType);
    return r;
  }
  // A block formatting context: where margin collapsing stops. clip is NOT one.
  // https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_display/Block_formatting_context
  function bfc(cs) {
    const r = [];
    if (cs.display === 'flow-root') r.push('display:flow-root');
    if (cs.float !== 'none') r.push('float:' + cs.float);
    if (cs.position === 'absolute' || cs.position === 'fixed') r.push('position:' + cs.position);
    if (/inline-block|table-cell|table-caption|flex|grid/.test(cs.display)) r.push('display:' + cs.display);
    if (cs.overflow !== 'visible' && cs.overflow !== 'clip') r.push('overflow:' + cs.overflow);
    if (/paint|layout|strict|content/.test(cs.contain)) r.push('contain:' + cs.contain);
    if (cs.containerType && cs.containerType !== 'normal') r.push('container-type:' + cs.containerType);
    return r;
  }

  const el = document.querySelector(${JSON.stringify(SELECTOR)});
  if (!el) return JSON.stringify({ missing: true });
  const chain = []; for (let n = el; n; n = n.parentElement) chain.push(n);
  const rows = chain.map((n, i) => {
    const cs = getComputedStyle(n), pcs = chain[i + 1] ? getComputedStyle(chain[i + 1]) : null;
    const b = n.getBoundingClientRect();
    return {
      depth: i, el: name(n), value: cs.getPropertyValue(${JSON.stringify(PROP)}),
      pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(parseFloat),
      border: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map(parseFloat),
      rect: { x: +b.left.toFixed(1), y: +b.top.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) },
      stacking: stacking(n, cs, pcs), containing: containing(cs), bfc: bfc(cs),
      clips: cs.overflow !== 'visible' ? cs.overflow : '',
      scrolls: /scroll|auto/.test(cs.overflowX + cs.overflowY) && (n.scrollWidth > n.clientWidth || n.scrollHeight > n.clientHeight),
    };
  });
  return JSON.stringify({ rows, offsetParent: el.offsetParent ? name(el.offsetParent) : null });
})()`;

const { result } = await S('Runtime.evaluate', { expression: FN, returnByValue: true });
const o = JSON.parse(result.value);
if (o.missing) { ws.close(); chrome.kill(); throw new Error(`no element matches ${SELECTOR} on /${slug}/`); }

const f = (n) => (Number.isFinite(n) ? String(n) : '?');
console.log(`\n/${slug}/  ${SELECTOR}  walking to the root, reading ${PROP}${WIDTH ? `, at ${WIDTH} px` : ''}`);
console.log('='.repeat(96));
console.log(`${'depth'.padEnd(6)}${'element'.padEnd(26)}${PROP.padEnd(14)}${'pad t r b l'.padEnd(18)}${'border'.padEnd(12)}${'rect x,y w x h'.padEnd(24)}contexts`);
for (const r of o.rows) {
  const ctx = [
    r.stacking.length ? `SC(${r.stacking.join(' ')})` : '',
    r.containing.length ? `CB(${r.containing.join(' ')})` : '',
    r.bfc.length ? `BFC(${r.bfc.join(' ')})` : '',
    r.clips ? `clips:${r.clips}` : '', r.scrolls ? 'SCROLLS' : '',
  ].filter(Boolean).join('  ');
  console.log(
    `${String(r.depth).padEnd(6)}${r.el.slice(0, 25).padEnd(26)}${String(r.value).padEnd(14)}`
    + `${r.pad.map(f).join(' ').padEnd(18)}${r.border.map(f).join(' ').padEnd(12)}`
    + `${`${r.rect.x},${r.rect.y} ${r.rect.w}x${r.rect.h}`.padEnd(24)}${ctx}`,
  );
}

const first = (k) => o.rows.slice(1).find((r) => r[k] && r[k].length);
const cb = first('containing');
/* ⚠️ `offsetParent` IS `body` WHEN NOTHING ABOVE IS POSITIONED. That is the
   spec's own fallback and not a positioned ancestor, so it AGREES with a
   `(none)` here. The first run of this file on `/nola/` flagged exactly that
   case as a disagreement, which is a self-test crying wolf on the commonest
   page shape there is. A real disagreement is a named ancestor on one side and
   a different named one on the other. */
const opIsFallback = !o.offsetParent || /^(body|html)\b/.test(o.offsetParent);
const disagree = cb ? (o.offsetParent && cb.el !== o.offsetParent && !opIsFallback) : !opIsFallback;
console.log(`\nnearest ancestor making a stacking context : ${(first('stacking') || {}).el || '(none)'}`);
console.log(`nearest ancestor that is a containing block : ${(cb || {}).el || '(none)'}   (offsetParent says ${o.offsetParent || '(none)'}${disagree ? '  <- DISAGREE, this file is wrong somewhere' : ''})`);
console.log(`nearest ancestor making a formatting context: ${(first('bfc') || {}).el || '(none)'}`);
// 🔴 THE LINE THAT ENDS THE "EDGE TO EDGE" ARGUMENT: how many boxes between the
// element and the root are insetting it, and by how much on the left.
const insetting = o.rows.slice(1).filter((r) => r.pad[3] > 0 || r.border[3] > 0);
console.log(`\n${insetting.length} ancestor(s) inset the left edge: ${insetting.map((r) => `${r.el} ${r.pad[3]}+${r.border[3]}`).join(', ') || '(none)'}`);

ws.close();
chrome.kill();
await sleep(200);
await rm(PROFILE, { recursive: true, force: true }).catch(() => {});
