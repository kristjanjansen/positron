// demo/which-rule-won.mjs — FOR ONE ELEMENT AND ONE PROPERTY, EVERY DECLARATION
// THAT WAS MADE FOR IT, WHERE EACH CAME FROM, AND WHICH ONE WON.
//
//   node demo/which-rule-won.mjs kit '.pos-rows-r' padding-left
//   node demo/which-rule-won.mjs nola '.panel-plate' padding-top --width 390
//   node demo/which-rule-won.mjs fau '.fau-src textarea' padding-top --base https://positron.studio
//
// 🔴 IT EXISTS BECAUSE THIRTY CASCADE INCIDENTS IN THIS REPOSITORY WERE FOUND BY
// `getComputedStyle` AND ALMOST NEVER BY READING THE FILE, AND `getComputedStyle`
// ONLY SAYS WHAT WON, NEVER WHO. A component's `padding: 7px 9px` SHORTHAND at
// (0,2,1) beat a page's `padding-top` longhand at (0,1,1) on `/fau/` while the
// source read as correct, and the page sheet loading later did not help, because
// weight decides before order does. Nothing on the page said so. This prints
// `<- via shorthand padding: 7px 9px` beside the winner, which is that incident
// made visible in one line.
//
// ✅ **`CSS.getMatchedStylesForNode` IS THE ONLY COMPLETE SOURCE, AND IT IS
// CDP-ONLY.** `getComputedStyle` returns resolved values with no provenance and
// reads `0.3125rem` back as `5px`. `getMatchedCSSRules` was removed from Chrome in
// 64 and never existed in Firefox. No npm package wraps this. So this file drives
// Chrome the same way `verify.mjs` and `shot.mjs` do, raw CDP over node's global
// WebSocket, no dependencies.
//
// 🔴 **THE ARRAY CDP HANDS BACK IS ALREADY IN CASCADE ORDER, EXCEPT THAT IT
// IGNORES `!important`.** MEASURED on a crafted page with layers, an id rule, an
// important rule and an inline style: `.imp !important` sat at index 5 below
// `#only` at index 9 while the computed value was the important one. So taking
// the last match is wrong whenever importance is in play, and it looks right on
// every page that has none. This file re-ranks: origin band, then layer order,
// then specificity, then source order, with importance inverting both the
// origin bands and the layer order, which is what the spec says it does.
//
// ⚠️ **BLINK ALSO EMITS EXPANDED LONGHAND ECHOES WITH NO `range`, WHICH MUST BE
// SKIPPED**, or every shorthand is counted twice. DevTools' own frontend does
// `if (style.range && !property.range) continue`, and so does this.
//
// ⚠️ **INHERITANCE STOPS AT THE NEAREST DECLARING ANCESTOR.** An earlier draft
// ranked across depths and reported a grandparent's `color` over the parent's,
// because `inheritedFrom = 0` is falsy. The symptom was a plausible wrong answer
// rather than an error, which is the worst kind.
//
// 🔴 **THE PORT IS READ BACK FROM THE PROFILE, NEVER GUESSED.** The draft this
// was adopted from launched on a fixed port and asked `/json/list`, which attaches
// to whatever Chrome is already on that port. `verify.mjs` pays for that lesson
// at length: a guessed port can be somebody else's browser. `--remote-debugging-
// port=0` and `DevToolsActivePort` is the house pattern and this follows it.
//
// ⚠️ **WHAT IT STILL CANNOT SEE**, stated rather than papered over: `@scope`
// proximity (CDP does not rank it), whether a `@container` block is active (CDP's
// `CSSContainerQuery` carries no `active` boolean while `CSSSupports` does),
// shadow tree-scope distance, and a value winning because a transition is
// running (that is `CSS.getAnimatedStylesForNode`, experimental).

import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : fallback; };
const bare = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
const [slug, SELECTOR, PROPERTY] = bare;
const BASE = flag('base', process.env.DEMO_BASE || 'http://127.0.0.1:8890');
const WIDTH = Number(flag('width', 0)) || 0;
const WAIT = Number(flag('wait', 2000));

if (!slug || !SELECTOR || !PROPERTY) {
  console.error('usage: node demo/which-rule-won.mjs <slug> <selector> <property> [--width px] [--base URL] [--wait ms]');
  process.exit(2);
}

/* ── the cascade, as bands ─────────────────────────────────────────────────
   Origin bands low to high. Importance INVERTS the author/UA order, which is
   why important declarations get their own bands rather than a boolean. */
const ORIGIN_RANK = { 'user-agent': 0, injected: 1, regular: 2, inspector: 3 };
const IMPORTANT_ORIGIN_RANK = { regular: 10, inspector: 11, injected: 12, 'user-agent': 13 };
const clean = (v) => String(v).replace(/\s*!important\s*$/, '');

/** The highest specificity among the selectors of a rule that actually matched. */
function specOf(rm) {
  const sels = rm.rule.selectorList.selectors;
  let best = [0, 0, 0];
  for (const i of rm.matchingSelectors) {
    const s = sels[i] && sels[i].specificity;
    if (!s) continue;
    const v = [s.a, s.b, s.c];
    if (v[0] > best[0] || (v[0] === best[0] && (v[1] > best[1] || (v[1] === best[1] && v[2] > best[2])))) best = v;
  }
  return best;
}

const PROFILE = await mkdtemp(join(tmpdir(), 'positron-won-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--mute-audio',
], { stdio: ['ignore', 'pipe', 'pipe'] });
chrome.stderr.on('data', () => {});

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
const sheets = new Map();               // styleSheetId -> header, for a source URL and line
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.method === 'CSS.styleSheetAdded') sheets.set(m.params.header.styleSheetId, m.params.header);
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
await S('DOM.enable');
// ⚠️ `CSS.enable` BEFORE NAVIGATING, or `styleSheetAdded` is missed for every
// sheet the page loads and the source column reads `(no stylesheet header)`.
await S('CSS.enable');
if (WIDTH) {
  // The same emulation `shot.mjs` uses, so a question about a phone layout is
  // asked OF the phone layout. A media block that only applies at 390 px has no
  // answer at 756.
  const mobile = WIDTH <= 560;
  await S('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 900, deviceScaleFactor: mobile ? 2 : 1, mobile });
}
await S('Page.navigate', { url: `${BASE}/${slug}/` });
await sleep(WAIT);

const { root } = await S('DOM.getDocument', { depth: -1 });
const { nodeId } = await S('DOM.querySelector', { nodeId: root.nodeId, selector: SELECTOR });
if (!nodeId) { ws.close(); chrome.kill(); throw new Error(`no element matches ${SELECTOR} on /${slug}/`); }

const ms = await S('CSS.getMatchedStylesForNode', { nodeId });
const layerTree = await S('CSS.getLayersForNode', { nodeId }).catch(() => null);

// Layer name -> order. Higher order is higher priority. The implicit outer
// layer's own order is what unlayered rules get, which is why "unlayered beats
// every layer" is a number to sort on rather than a special case.
const layerOrder = new Map();
(function walk(n, prefix) {
  if (!n) return;
  const name = prefix ? `${prefix}.${n.name}` : n.name;
  layerOrder.set(n.name, n.order); layerOrder.set(name, n.order);
  for (const s of n.subLayers || []) walk(s, n.name === 'implicit outer layer' ? '' : name);
})(layerTree && layerTree.rootLayer, '');
const IMPLICIT = layerTree ? layerTree.rootLayer.order : 0;

const hits = [];
const collect = (rm, i, list) => {
  const r = rm.rule;
  for (const p of r.style.cssProperties) {
    if (p.name === PROPERTY && !(r.style.range && !p.range)) {
      list.push({ kind: 'rule', prop: p, rule: r, rm, order: i, spec: specOf(rm), shorthand: false });
    }
    for (const l of (p.longhandProperties || [])) {
      if (l.name !== PROPERTY) continue;
      list.push({ kind: 'rule', prop: { ...l, value: clean(l.value), important: p.important, range: p.range },
        rule: r, rm, order: i, spec: specOf(rm), shorthand: `${p.name}: ${clean(p.value)}` });
    }
  }
};
const collectInline = (style, list) => {
  for (const p of (style ? style.cssProperties : [])) {
    if (!p.range) continue;
    if (p.name === PROPERTY) list.push({ kind: 'inline', prop: p, order: 1e6, spec: [1, 0, 0] });
    for (const l of (p.longhandProperties || [])) {
      if (l.name === PROPERTY) list.push({ kind: 'inline', prop: { ...l, value: clean(l.value), important: p.important, range: p.range },
        order: 1e6, spec: [1, 0, 0], shorthand: `${p.name}: ${clean(p.value)}` });
    }
  }
};

ms.matchedCSSRules.forEach((rm, i) => collect(rm, i, hits));
collectInline(ms.inlineStyle, hits);

function rank(h) {
  const origin = h.kind === 'inline' ? 'regular' : h.rule.origin;
  const imp = !!h.prop.important;
  const band = imp ? IMPORTANT_ORIGIN_RANK[origin] : ORIGIN_RANK[origin];
  let layer = IMPLICIT;
  if (h.kind === 'rule' && h.rule.layers && h.rule.layers.length) {
    const nm = h.rule.layers[h.rule.layers.length - 1].text;   // innermost first in the array
    layer = layerOrder.has(nm) ? layerOrder.get(nm) : 0;
  }
  if (imp) layer = -layer;                                      // importance inverts layer order too
  return [band, layer, h.kind === 'inline' ? 1 : 0, h.spec[0], h.spec[1], h.spec[2], h.order];
}
const cmp = (a, b) => { const A = rank(a), B = rank(b); for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) return A[i] - B[i]; return 0; };

// Nothing declared on the element itself means the value is inherited. Walk
// the chain CDP handed over, and STOP at the first ancestor that declares it.
let inheritedFrom = null;
if (!hits.length) {
  for (let d = 0; d < (ms.inherited || []).length && inheritedFrom === null; d++) {
    const entry = ms.inherited[d];
    const cand = [];
    entry.matchedCSSRules.forEach((rm, i) => collect(rm, i, cand));
    collectInline(entry.inlineStyle, cand);
    if (cand.length) { cand.sort(cmp); hits.push(...cand); inheritedFrom = d; }
  }
}

hits.sort(cmp);
const winner = hits[hits.length - 1];

const where = (h) => {
  if (h.kind === 'inline') return 'style="" attribute';
  const hd = sheets.get(h.rule.styleSheetId);
  if (!hd) return h.rule.origin === 'user-agent' ? 'user agent stylesheet' : '(no stylesheet header)';
  const rg = h.prop.range || (h.rule.style && h.rule.style.range)
    || (h.rule.selectorList.selectors[0] && h.rule.selectorList.selectors[0].range);
  const line = rg ? hd.startLine + rg.startLine + 1 : '?';
  const col = rg ? (rg.startLine === 0 ? hd.startColumn + rg.startColumn : rg.startColumn) + 1 : '?';
  return `${hd.sourceURL || '(inline <style>)'}:${line}:${col}${hd.isInline ? ' [inline sheet]' : ''}`;
};

console.log(`\n/${slug}/  ${SELECTOR}  {  ${PROPERTY}  }${WIDTH ? `  at ${WIDTH} px` : ''}`);
console.log('='.repeat(72));
if (inheritedFrom !== null) console.log(`(nothing declares ${PROPERTY} on it: INHERITED from ancestor ${inheritedFrom + 1} up)`);
if (!hits.length) console.log(`(nothing declares ${PROPERTY} anywhere up the tree: the value is the initial one)`);
for (const h of hits) {
  const won = h === winner;
  console.log(
    `${won ? 'WON  ' : '  -  '}${`${h.prop.name}: ${h.prop.value}${h.prop.important ? ' !important' : ''}`.padEnd(34)}`
    + `| ${(h.kind === 'inline' ? '(inline)' : h.rule.selectorList.text.slice(0, 40)).padEnd(42)}`
    + `| ${(h.kind === 'inline' ? 'inline' : h.rule.origin).padEnd(10)}`
    + `| layer=${(h.kind === 'rule' && h.rule.layers && h.rule.layers.length ? h.rule.layers.map((l) => l.text).join('/') : '-').padEnd(10)}`
    + `| spec=${h.spec.join(',')}`
    + (h.shorthand ? `  <- via shorthand ${h.shorthand}` : ''),
  );
  console.log(`       ${where(h)}`);
}

const cs = await S('CSS.getComputedStyleForNode', { nodeId });
const got = cs.computedStyle.find((p) => p.name === PROPERTY);
// ⚠️ THE COMPUTED VALUE IS RESOLVED, SO `0.3125rem` READS BACK AS `5px` AND
// `navy` AS `rgb(0, 0, 128)`. A mismatch here is a prompt to look, not a verdict.
console.log(`\ncomputed ${PROPERTY} = ${got && got.value}${winner ? `   (the winner said ${winner.prop.value})` : ''}`);

ws.close();
chrome.kill();
await sleep(200);
await rm(PROFILE, { recursive: true, force: true }).catch(() => {});
