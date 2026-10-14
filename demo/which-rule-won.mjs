// node demo/which-rule-won.mjs <slug> '<selector>' <property> [--width N] [--base URL]: every
// declaration for one property and which won, via CDP CSS.getMatchedStylesForNode, re-ranked for
// `!important` (CDP's order ignores it), skipping longhand echoes; cannot see @scope or @container.
// why: lessons/harness.md#which-rule-won

import { launchChrome, connectCdp } from './chrome.mjs';

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

const browser = await launchChrome({ prefix: 'positron-won', args: ['--disable-gpu', '--mute-audio'] });
const cdp = await connectCdp(browser.wsUrl);
const { ws } = cdp;
const sheets = new Map();               // styleSheetId -> header, for a source URL and line
cdp.on((m) => { if (m.method === 'CSS.styleSheetAdded') sheets.set(m.params.header.styleSheetId, m.params.header); });
const { S } = await cdp.page();
await S('Page.enable');
await S('DOM.enable');
// `CSS.enable` before navigating, or every sheet's styleSheetAdded is missed.
// why: lessons/harness.md#css-enable
await S('CSS.enable');
if (WIDTH) {
  // The same emulation `shot.mjs` uses, so a question about a phone layout is
  // asked OF the phone layout. A media block that only applies at 390 px has no
  // answer at 756.
  const mobile = WIDTH <= 560;
  await S('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: mobile ? 812 : 900, deviceScaleFactor: mobile ? 3 : 1, mobile });  // the phone is an iPhone mini, as in shot.mjs
}
await S('Page.navigate', { url: `${BASE}/${slug}/` });
await sleep(WAIT);

const { root } = await S('DOM.getDocument', { depth: -1 });
const { nodeId } = await S('DOM.querySelector', { nodeId: root.nodeId, selector: SELECTOR });
if (!nodeId) { ws.close(); await browser.close(); throw new Error(`no element matches ${SELECTOR} on /${slug}/`); }

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
// The computed value is resolved (`0.3125rem` reads `5px`): a mismatch is a prompt, not a verdict.
// why: lessons/harness.md#resolved
console.log(`\ncomputed ${PROPERTY} = ${got && got.value}${winner ? `   (the winner said ${winner.prop.value})` : ''}`);

ws.close();
await browser.close();
