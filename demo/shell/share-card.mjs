// demo/shell/share-card.mjs: the site's share card, 1200 by 630, as an SVG
// string written with no DOM: the front page's hero (the wordmark with its
// dot in the accent, the headline with its full stop in the accent, the line
// and the small line, all read from HERO in hero.mjs) over its imaginary
// patchbay (heroBay() drawn by bay-svg.mjs). Asked 2026-10-13: *"Build
// frontpage og card and apply to all pages"*, then *"What headless chrome?!!?
// See ../eccm etc"*.
//
// eccm's src/og/card.mjs and trip's og-card.ts are the model: text laid out
// from the font's own advance widths (font-metrics.mjs), a greedy wrap with a
// balance search, every colour a literal, and an FNV-1a hash over what the
// card is so its URL changes when the picture does. Rasterised by resvg:
// workers/view/og/render.mjs at build. It runs in a browser too, which is how
// /kit/share/ shows the SVG beside the PNG made from it.
//
// ⚠️ THE NAME IS A HASH OF THE SVG ITSELF PLUS TEMPLATE_V. The SVG is the whole
// input to the rasteriser, so it changes whenever anything visible does (a
// word in HERO, a wire in the hero's bay, a colour, a size). What it cannot see
// is the TTFs and resvg's own version: bump TEMPLATE_V when either changes.
import { HERO, heroBay } from './hero.mjs';
import { drawBay, textWidth, xml, INK, FAMILY } from './bay-svg.mjs';
import M from './font-metrics.mjs';

// bump on a change the SVG cannot show (a face, resvg): it is in every hash
export const TEMPLATE_V = 1;
export const W = 1200, H = 630;
export const SITE = 'https://positron.studio';
export const SITE_NAME = 'positron.studio';

// The frame. 64 on the left and the top, the bay given whatever is left above
// the bottom margin, centred as the front page centres it in its column.
const PAD = 64;
// The type, the hero's own rules (shell.css .pos-hero*) at a card's size: the
// eye mono 400 tracked .14em in --dim, the headline mono 600 at -.04em in
// --fg, the line Geist 400 in --fg, the small line Geist 400 in --dim2. The
// gaps between them are the hero's (18, 24, 18, 32) times the same factor.
const K = 1.2;
const TYPE = {
  eye: { face: 'mono', weight: 400, size: 16, track: 0.14, lh: 1.2, fill: INK.dim },
  head: { face: 'mono', weight: 600, size: 58, track: -0.04, lh: 1.08, fill: INK.fg },
  line: { face: 'sans', weight: 400, size: 24, track: -0.01, lh: 1.45, fill: INK.fg },
  small: { face: 'sans', weight: 400, size: 18, track: 0, lh: 1.5, fill: INK.dim2 },
};
const GAPS = { head: 18 * K, line: 20 * K, small: 12 * K, bay: 28 * K };

const width = (s, t) => textWidth(s, t.face, t.size, { weight: t.weight, tracking: t.track * t.size });
function wrap(text, t, maxW) {
  const words = text.split(/\s+/).filter(Boolean), lines = [];
  let cur = '';
  for (const w of words) { const next = cur ? `${cur} ${w}` : w; if (cur && width(next, t) > maxW) { lines.push(cur); cur = w; } else cur = next; }
  if (cur) lines.push(cur);
  return lines;
}
// the narrowest measure that keeps the line count: text-wrap: balance by hand,
// eccm's balance() (the hero sets `text-wrap: balance` on every line of it)
function balance(text, t, maxW) {
  const n = wrap(text, t, maxW).length;
  if (n < 2) return wrap(text, t, maxW);
  let lo = 0, hi = maxW;
  for (let i = 0; i < 16; i++) { const mid = (lo + hi) / 2; if (wrap(text, t, mid).length > n) lo = mid; else hi = mid; }
  return wrap(text, t, hi);
}
// One block of text. `accent` puts the last character of the last line in
// --hi (the full stop), `dot` replaces a space with an accent dot (the eye).
function block(lines, t, x, y0, { accent = false, dot = false } = {}) {
  const fam = FAMILY[t.face];
  const asc = M[`${t.face}${t.weight}`].cap;
  let y = y0 + asc * t.size + (t.lh - 1) * t.size / 2;
  const out = [];
  lines.forEach((l, i) => {
    let inner = xml(l);
    if (dot) inner = l.split(' ').map(xml).join(`<tspan fill="${INK.hi}">.</tspan>`);
    if (accent && i === lines.length - 1 && /\.$/.test(l)) inner = `${xml(l.slice(0, -1))}<tspan fill="${INK.hi}">.</tspan>`;
    out.push(`<text x="${x}" y="${y.toFixed(1)}" font-family="${xml(fam)}" font-weight="${t.weight}" font-size="${t.size}"${t.track ? ` letter-spacing="${+(t.track * t.size).toFixed(2)}"` : ''} fill="${t.fill}">${inner}</text>`);
    y += t.lh * t.size;
  });
  return { svg: out.join(''), bottom: y0 + lines.length * t.lh * t.size };
}

/** The site card: `{ svg, alt, version, path, width, height }`. */
export function siteCard() {
  const measure = W - 2 * PAD;
  const parts = [];
  let y = PAD - 6;   // the eye's line box carries its own half leading above the caps
  const eye = block([HERO.eye.toUpperCase()], TYPE.eye, PAD, y, { dot: true });
  parts.push(eye.svg); y = eye.bottom + GAPS.head;
  const head = block(balance(HERO.head, TYPE.head, measure), TYPE.head, PAD, y, { accent: true });
  parts.push(head.svg); y = head.bottom + GAPS.line;
  const line = block(balance(HERO.line, TYPE.line, measure), TYPE.line, PAD, y);
  parts.push(line.svg); y = line.bottom + GAPS.small;
  const small = block(balance(HERO.small, TYPE.small, measure), TYPE.small, PAD, y);
  parts.push(small.svg); y = small.bottom + GAPS.bay;

  // The bay at the width the front page draws it (900), then scaled into what
  // is left, as the hero scales it to its column with `zoom`.
  const hb = heroBay(false);
  const bay = drawBay(hb.bay, hb);
  const k = Math.min(1.25, measure / bay.width, (H - PAD + 16 - y) / bay.height);
  const bx = (W - bay.width * k) / 2;
  parts.push(`<g transform="translate(${bx.toFixed(2)} ${y.toFixed(2)}) scale(${k.toFixed(4)})">${bay.body}</g>`);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + `<rect width="${W}" height="${H}" fill="${INK.bg}"/>${parts.join('')}</svg>`;
  const version = fnv(`${svg}|${TEMPLATE_V}`);
  return { svg, alt: siteAlt(hb.bay), version, path: `/og/site-${version}.png`, width: W, height: H, bayScale: k };
}

// What the picture shows, in words, from the same data: the wordmark, the
// headline, and the bay's three columns by their labels.
function siteAlt(bay) {
  const nodes = bay.nodes(), links = bay.links();
  const into = new Set(links.map((l) => l.to.split(':').slice(0, 2).join(':')));
  const outOf = new Set(links.map((l) => l.from.split(':').slice(0, 2).join(':')));
  const names = (f) => nodes.filter(f).map((n) => n.label || n.id);
  const list = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
  const first = names((n) => !into.has(n.id)), mid = names((n) => into.has(n.id) && outOf.has(n.id)), last = names((n) => !outOf.has(n.id));
  return `${SITE_NAME}: ${HERO.head} A patchbay wiring ${list(first)} through ${list(mid)} to ${list(last)}.`;
}

/** FNV-1a, 8 hex, eccm's and trip's cardVersion. */
export function fnv(str) {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(str)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/**
 * The share tags for one page, as HTML lines: og:site_name, og:type, og:title,
 * og:description, og:url, og:image with its width, height, type and alt, and
 * twitter:card. `url` is the page's path on the site; `card` is siteCard()'s
 * answer (one card for every page, for now).
 */
export function shareTags({ title, description, url, card }) {
  const abs = (p) => new URL(p, SITE).href;
  const tags = [
    ['og:site_name', SITE_NAME], ['og:type', 'website'], ['og:title', title],
    description ? ['og:description', description] : null,
    ['og:url', abs(url)], ['og:image', abs(card.path)],
    ['og:image:width', card.width], ['og:image:height', card.height],
    ['og:image:type', 'image/png'], ['og:image:alt', card.alt],
  ].filter(Boolean).map(([p, c]) => `<meta property="${p}" content="${xml(c)}">`);
  tags.push('<meta name="twitter:card" content="summary_large_image">');
  return tags;
}
