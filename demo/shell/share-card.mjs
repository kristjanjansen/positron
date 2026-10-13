// demo/shell/share-card.mjs: the site's share images as SVG strings written
// with no DOM: the front page's hero type alone (the wordmark with its dot in
// the accent, the headline on two lines with its full stop in the accent, the
// line and the small line, all read from HERO in hero.mjs). The 1200 by 630
// card is every page's og:image; the 1080 by 1350 portrait is for Instagram,
// posted by hand and tagged on no page. Asked 2026-10-13: *"Build frontpage og
// card and apply to all pages"*, *"What headless chrome?!!? See ../eccm etc"*,
// then *"No patchbay. Do like frontpage. Do also ig image"*.
//
// eccm's src/og/card.mjs and trip's og-card.ts are the model: text laid out
// from the font's own advance widths (font-metrics.mjs), a greedy wrap with a
// balance search, every colour a literal, and an FNV-1a hash over what the
// card is so its URL changes when the picture does. Rasterised by resvg:
// workers/view/og/render.mjs at build. It runs in a browser too, which is how
// /kit/share/ shows the SVG beside the PNG made from it.
//
// ⚠️ THE NAME IS A HASH OF THE SVG ITSELF PLUS TEMPLATE_V. The SVG is the whole
// input to the rasteriser, so it changes whenever anything visible does. What
// it cannot see is the TTFs and resvg's own version: bump TEMPLATE_V when
// either changes.
import { HERO } from './hero.mjs';
import { textWidth, xml, INK, FAMILY } from './bay-svg.mjs';
import M from './font-metrics.mjs';

// bump on a change the SVG cannot show (a face, resvg): it is in every hash.
// 2 since 2026-10-13: the patchbay came off both cards (*"No patchbay. Do like
// frontpage. Do also ig image"*).
export const TEMPLATE_V = 2;
export const W = 1200, H = 630;
export const IG_W = 1080, IG_H = 1350;
export const SITE = 'https://positron.studio';
export const SITE_NAME = 'positron.studio';

// 🔴 THE HERO'S TYPE AND NOTHING ELSE, 2026-10-13. The first card set the hero
// small over the imaginary patchbay and the owner said *"No patchbay. Do like
// frontpage. Do also ig image"*. So a card is the front page's hero block alone:
// the wordmark, the headline on two lines, the line and the small line, at the
// front page's own sizes and gaps (shell.css .pos-hero* at the desk, where the
// clamps sit at their maxima: 13, 56, 22, 16 px, gaps 18, 24, 18), scaled up
// as one block until it fills the frame. bay-svg.mjs stays for a card that
// wants a patch later.
const TYPE = {
  eye: { face: 'mono', weight: 400, size: 13, track: 0.14, lh: 1.2, fill: INK.dim },
  head: { face: 'mono', weight: 600, size: 56, track: -0.04, lh: 1.08, fill: INK.fg },
  line: { face: 'sans', weight: 400, size: 22, track: -0.01, lh: 1.45, fill: INK.fg },
  small: { face: 'sans', weight: 400, size: 16, track: 0, lh: 1.5, fill: INK.dim2 },
};
const GAPS = { head: 18, line: 24, small: 18 };
// .pos-hero-l carries max-width: 32em, which is what wraps the line onto two
// at the desk; the headline wraps in the column (Connect anything / to
// everything.), and on a card it is always those two lines.
const LINE_MAX = 32 * TYPE.line.size;

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
// the headline on exactly two lines, broken where the two come out most even
function twoLines(text, t) {
  const words = text.split(/\s+/);
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const ls = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
    const wd = Math.max(...ls.map((l) => width(l, t)));
    if (!best || wd < best.wd) best = { ls, wd };
  }
  return best ? best.ls : [text];
}
const blockW = (lines, t) => Math.max(...lines.map((l) => width(l, t)));

// The hero block laid out at the front page's sizes in a column `measure` wide:
// its lines, and its width and height in those units.
function layout(measure) {
  const rows = [
    { t: TYPE.eye, lines: [HERO.eye.toUpperCase()], dot: true, gap: 0 },
    { t: TYPE.head, lines: twoLines(HERO.head, TYPE.head), accent: true, gap: GAPS.head },
    { t: TYPE.line, lines: balance(HERO.line, TYPE.line, Math.min(measure, LINE_MAX)), gap: GAPS.line },
    { t: TYPE.small, lines: balance(HERO.small, TYPE.small, measure), gap: GAPS.small },
  ];
  const w = Math.max(...rows.map((r) => blockW(r.lines, r.t)));
  const h = rows.reduce((a, r) => a + r.gap + r.lines.length * r.t.lh * r.t.size, 0);
  return { rows, w, h };
}

// One block of text at scale k. `accent` puts a closing full stop in --hi,
// `dot` replaces a space with an accent dot (the wordmark).
function block(r, x, y0, k) {
  const { t } = r, size = t.size * k, fam = FAMILY[t.face];
  const cap = M[`${t.face}${t.weight}`].cap;
  let y = y0 + cap * size + (t.lh - 1) * size / 2;
  const out = [];
  r.lines.forEach((l, i) => {
    let inner = xml(l);
    if (r.dot) inner = l.split(' ').map(xml).join(`<tspan fill="${INK.hi}">.</tspan>`);
    if (r.accent && i === r.lines.length - 1 && /\.$/.test(l)) inner = `${xml(l.slice(0, -1))}<tspan fill="${INK.hi}">.</tspan>`;
    out.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="${xml(fam)}" font-weight="${t.weight}" font-size="${+size.toFixed(2)}"${t.track ? ` letter-spacing="${+(t.track * size).toFixed(2)}"` : ''} fill="${t.fill}">${inner}</text>`);
    y += t.lh * size;
  });
  return out.join('');
}

/**
 * The hero alone in a `w` by `h` frame with `pad` on every side: the column
 * measure that lets the block grow largest is searched for (a wide frame keeps
 * the line on two lines, a tall one lets it run to more), the block is scaled
 * by that factor and centred in the frame.
 */
function heroCard(w, h, pad, kind) {
  let best = null;
  for (let m = 360; m <= 1000; m += 8) {
    const L = layout(m);
    const k = Math.min((w - 2 * pad) / L.w, (h - 2 * pad) / L.h);
    if (!best || k > best.k + 1e-6) best = { L, k, m };
  }
  const { L, k } = best;
  const x = pad, parts = [];
  const tall = (r) => r.lines.length * r.t.lh * r.t.size * k;
  const slack = h - 2 * pad - L.h * k;
  if (slack < 0.2 * h) {
    // a wide frame: the block as the front page stacks it, centred
    let y = (h - L.h * k) / 2;
    for (const r of L.rows) { y += r.gap * k; parts.push(block(r, x, y, k)); y += tall(r); }
  } else {
    // a tall frame, which the two line headline fills across long before it
    // fills down: the wordmark on the top margin, the small line on the bottom
    // one, and the headline and the line centred between them, so the frame
    // is filled by the same type at the same size rather than by two empty bands
    const [eye, head, line, small] = L.rows;
    parts.push(block(eye, x, pad, k));
    parts.push(block(small, x, h - pad - tall(small), k));
    const midH = tall(head) + line.gap * k + tall(line);
    let y = (h - midH) / 2;
    parts.push(block(head, x, y, k)); y += tall(head) + line.gap * k;
    parts.push(block(line, x, y, k));
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
    + `<rect width="${w}" height="${h}" fill="${INK.bg}"/>${parts.join('')}</svg>`;
  const version = fnv(`${svg}|${TEMPLATE_V}`);
  return { svg, alt: ALT, version, path: `/og/${kind}-${version}.png`, width: w, height: h, scale: k, headSize: TYPE.head.size * k };
}
const ALT = `${SITE_NAME}: ${HERO.head} ${HERO.line} ${HERO.small}`;

/** The site card, the og:image of every page: `{ svg, alt, version, path, width, height }`. */
export const siteCard = () => heroCard(W, H, 72, 'site');
/** The Instagram portrait, 1080 by 1350, tagged on no page: posted by hand. */
export const igCard = () => heroCard(IG_W, IG_H, 96, 'ig');

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
