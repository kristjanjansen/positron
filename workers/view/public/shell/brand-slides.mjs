// demo/shell/brand-slides.mjs: the brand's slides, one by one, for /kit/logo/, and `drawMark`.
// Nothing here opens anything; only the slide face's Greek subset is fetched, when a β is laid out.
// why: lessons/kit-brand-slides.md#header

/**
 * The logo is `β+` at step 6 with the accent on the + alone, positron and studio at step 4 under it.
 * Wordmarks cut `positron.studio` into rows of five and three, at step 4 so five rows fit the inset.
 * why: lessons/kit-brand-slides.md#logo-wordmarks
 */
/**
 * Icons drawn at the pixel sizes they really have, raised and inline + side by side.
 * Whole number scales only for anything enlarged, or the pixels come out uneven.
 * why: lessons/kit-brand-slides.md#icons
 */
const FACE = "'Slide JetBrains Mono'";
const ink = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const faceReady = () => (document.fonts?.load ? document.fonts.load(`600 32px ${FACE}`, 'β+').catch(() => {}) : Promise.resolve());

/** β+ into a square canvas `px` device pixels wide, on a tile of `shape`. */
export function drawMark(cv, px, { sup, shape }) {
  cv.width = cv.height = px;
  const c = cv.getContext('2d');
  c.clearRect(0, 0, px, px);
  c.fillStyle = ink('--card2') || '#151b26';
  c.beginPath();
  if (shape === 'circle') c.arc(px / 2, px / 2, px / 2, 0, Math.PI * 2);
  else c.roundRect(0, 0, px, px, px * (shape === 'ios' ? 0.2237 : 0.18));
  c.fill();
  // measured at 100 px, then scaled to the box the shape leaves: a circle
  // keeps to its middle, a favicon fills nearly all of its tile
  const room = px * (shape === 'circle' ? 0.6 : shape === 'ios' ? 0.7 : 0.9);
  const ps = sup ? 0.55 : 1;
  c.font = `600 100px ${FACE}`;
  const b = c.measureText('β');
  c.font = `600 ${100 * ps}px ${FACE}`;
  const p = c.measureText('+');
  const w100 = b.width + p.width, h100 = b.actualBoundingBoxAscent + b.actualBoundingBoxDescent;
  const k = room / Math.max(w100, h100);
  const size = 100 * k;
  const x0 = (px - w100 * k) / 2;
  const base = (px - h100 * k) / 2 + b.actualBoundingBoxAscent * k;
  c.textBaseline = 'alphabetic';
  c.font = `600 ${size}px ${FACE}`;
  c.fillStyle = ink('--fg') || '#e6e6e6';
  c.fillText('β', x0, base);
  c.font = `600 ${size * ps}px ${FACE}`;
  c.fillStyle = ink('--hi') || '#ffd400';
  // raised: the +'s top on the β's top; inline: on the β's baseline
  const py = sup ? base - b.actualBoundingBoxAscent * k + p.actualBoundingBoxAscent * k : base;
  c.fillText('+', x0 + b.width * k, py);
}

const VARIANTS = [['raised', true], ['inline', false]];

/** A slot of two columns, one per variant, each filled by `fill(col, sup)`; redrawn on every resize. */
function iconSlot(fill, variants = VARIANTS) {
  return (host) => {
    const row = document.createElement('div');
    row.className = 'dk-icons';
    row.dataset.n = String(variants.length);
    const cols = variants.map(([word, sup]) => {
      const col = document.createElement('div');
      col.className = 'dk-col';
      col.dataset.variant = word;
      row.append(col);
      return { col, sup };
    });
    host.append(row);
    const draw = () => { for (const { col, sup } of cols) { col.replaceChildren(); fill(col, sup, host); } };
    faceReady().then(() => { draw(); new ResizeObserver(draw).observe(host); });
    return null;
  };
}

const canvas = (cls) => { const cv = document.createElement('canvas'); cv.className = cls; return cv; };

/**
 * The favicon at 16 and 32 px, inline mark only: at 16 px a raised + is two yellow pixels.
 * why: lessons/kit-brand-slides.md#favicon
 */
const favicon = iconSlot((col, sup, host) => {
  const sizes = document.createElement('div');
  sizes.className = 'dk-sizes';
  for (const n of [16, 32]) {
    const cv = canvas('dk-real');
    drawMark(cv, n, { sup, shape: 'tile' });
    cv.style.width = cv.style.height = `${n}px`;
    sizes.append(cv);
  }
  col.append(sizes);
}, [['inline', false]]);

/**
 * The installed app: iOS's rounded square and Android's circle mask, name under. Raised mark only.
 * why: lessons/kit-brand-slides.md#appicon
 */
const appIcon = iconSlot((col, sup, host) => {
  const dpr = devicePixelRatio || 1;
  const n = Math.max(24, Math.floor(Math.min(host.clientHeight * 0.55, host.clientWidth * 0.2)));
  const pair = document.createElement('div');
  pair.className = 'dk-sizes dk-apps';
  for (const shape of ['ios', 'circle']) {
    const fig = document.createElement('div');
    fig.className = 'dk-app';
    const cv = canvas('dk-real');
    drawMark(cv, Math.round(n * dpr), { sup, shape });
    cv.style.width = cv.style.height = `${n}px`;
    const name = document.createElement('span');
    name.textContent = 'positron';
    fig.append(cv, name);
    pair.append(fig);
  }
  col.append(pair);
}, [['raised', true]]);

/**
 * The logo horizontal: β+ at step 6 beside positron over studio at step 4, centred on each other.
 * why: lessons/kit-brand-slides.md#logorow
 */
function logoRow(host) {
  const row = document.createElement('div');
  row.className = 'dk-logo-row';
  const mark = document.createElement('p');
  mark.className = 'sl-t sl-t6 dk-mark';
  const plus = document.createElement('span');
  plus.className = 'sl-hi';
  plus.textContent = '+';
  mark.append('β', plus);
  const words = document.createElement('div');
  for (const w of ['positron', 'studio']) {
    const p = document.createElement('p');
    p.className = 'sl-t sl-t4 dk-word';
    p.textContent = w;
    words.append(p);
  }
  row.append(mark, words);
  host.append(row);
  return null;
}

/**
 * THE SLIDES, in the order the deck played them, one spec each. `/kit/logo/`
 * puts each in a block of its own with `createSlide`, so the names are also
 * the slides' `aria-label`s, which `brand-slides.css` keys on.
 */
export const BRAND_SLIDES = [
  { name: 'logo', layout: 'left', lines: [[6, 'β*+*'], [4, 'positron'], [4, 'studio']] },
  { name: 'logo horizontal', slot: logoRow },
  { name: 'wordmark in fives', lines: ['posit', 'ron*.*s', 'tudio'].map((t) => [4, t]) },
  { name: 'wordmark in threes', lines: ['pos', 'itr', 'on*.*', 'stu', 'dio'].map((t) => [4, t]) },
  { name: 'favicon', slot: favicon, cap: 'the favicon at 16 and 32 px' },
  { name: 'app icon', slot: appIcon, cap: 'the installed app, as iOS rounds it and Android masks it' },
];
