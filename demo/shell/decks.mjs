// demo/shell/decks.mjs: the slide decks, played on the front page.
//
// 🔴 A DECK IS NOT A PAGE. Asked 2026-10-06, after a first deck had been built
// as /brand/ with a card linking to it: *"use 2col slidedeck here. no separate
// page"*. So a deck is plain data here, and the front page puts one half width
// player per deck under its `slides` heading, two a row, one below 560 px of
// the row's own width (the container query `/cam/` and the kit's HALF WIDTH
// PLAYERS use). Both front page renderers call `mountDecks`: demo/index.html
// locally and workers/view/menu.html on the edge, so there is one copy of it.
//
// ⚠️ NOTHING HERE OPENS ANYTHING. A slide is drawn from its data; the only
// files a deck costs are the slide face's, from this origin.
// ⚠️ AND THE `synths` DECK KEEPS THAT ON A VISIT. Its second slide draws a
// scope, code and a plate; the Faust runtime and the compiled program are
// fetched by a `Test tone` press and by nothing else, the live compiler only
// by a press after the code was edited, and the only AudioContext is the
// page's shared one, made by that press (`demo/shell/slide-synth.mjs`).

import { createSlidePlayer } from './slide.mjs';
import { SYNTH_STEPS } from './synth-steps.mjs';
import { synthSlot } from './slide-synth.mjs';

/**
 * THE BRAND DECK, the first one. Its first slide is the logo, moved out of
 * /kit/'s BRAND part on 2026-10-06 (*"a first slidedeck Brand where you move
 * our positron logo attempt"*). A positron is the particle of beta plus decay,
 * so the mark is `β+`: β at step 6, the largest step the scale has, and
 * positron and studio under it at step 4 (3 on 2026-10-05, then *"for β+ logo
 * make wordmark + 1 step larger"* on 2026-10-06). The accent is on the `+` alone,
 * because the charge is what makes it a positron. The β comes from JetBrains
 * Mono's Greek subset, which slide.css declares and the browser fetches only
 * when a β is laid out. `slide.css` sets the three lines solid and raises the +.
 *
 * Then the wordmarks, asked the same day as *"experiment with wordmarks"*
 * with two grids typed out: `positron.studio` cut into rows of five and of
 * three. A mono face makes the cut a grid with every letter in a column. Both
 * at step 4, the largest at which five rows fit the inset (74 per cent of the
 * height), so the wordmark is one size on every slide (*"same font size on
 * each slide workdmarks"*), the logo's included.
 * Centred on the slide (the default `stack` layout with no headline), asked
 * as *"center workmarks slide 2 and 3"*; the rows are the same width in a
 * mono face, so centring them keeps every letter in its column.
 * The dot wears the accent (*"on workmarks color . to yellow"*), as the + does on the logo.
 */
/**
 * ICONS, asked 2026-10-06: *"add icons simulations to brand slides (ico and
 * pwa) using β+ (no superscript?) try both actually"*. β+ drawn into canvases
 * at the pixel sizes the icons really have, so a 16 px favicon shows the
 * pixels a tab would get rather than a picture of them, and every slide puts
 * the two marks side by side: the + raised as on the logo, and the + inline.
 * ⚠️ WHOLE NUMBER SCALES ONLY for anything drawn larger than it is, the rule
 * the OLED slides follow: a 16 px icon enlarged is shown at 4x or 5x, never
 * at 4.6x, or its pixels come out uneven and the simulation lies.
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
 * The favicon at 16 and 32 px, as they are drawn. The enlarged 16 and the mock
 * tab went the same day (*"no need for icon on tab and largtest icon"*). The INLINE mark only since 2026-10-06, chosen with a screenshot of
 * its 16 and 32 px: *"keep these for icons"*. At 16 px a raised + is two
 * yellow pixels; inline it stays a plus.
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
 * The installed app: the rounded square iOS draws and the circle Android masks
 * to, with the name under. The RAISED mark only since 2026-10-06, chosen from
 * the two with a screenshot of it: *"keep these for app logos. add hor gap a
 * biiit"*; the favicon slide still compares both.
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
 * THE LOGO, HORIZONTAL, asked 2026-10-06 as *"add horizontal versoin for brand
 * slide 1"*: the same β+ at step 6 with the + raised, and positron over studio
 * at step 4 beside it instead of under it, the two blocks centred on each
 * other. Built from the slide's own type classes (`sl-t6`, `sl-t4`), so every
 * size is still a step of the slide's scale.
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
 * SYNTHS IN CODE, asked 2026-10-06: *"do slide deck Synths in code in the fau
 * examples ... keep it simple. add to frontpage"*, and cut to TWO SLIDES the
 * same day: *"rm fau slides c-f. first layout Synths / in code (better desc),
 * no body text"*, then a split with the title and what is going on on the
 * left and one instrument panel on the right (`demo/shell/slide-synth.mjs`).
 * The intro sets its two lines the way the brand deck's logo sets its three:
 * declared `lines` at step 6, the largest the scale has, solid, on the left
 * edge, with only a caption under them. The program is compiled ahead of time
 * (`demo/resources/build-faust-aot.mjs`), so `Test tone` costs a few kB and no
 * compiler until somebody edits the code.
 */
const SYNTHS = [
  { name: 'synths in code', layout: 'left', lines: [[6, 'Synths'], [6, 'in *code*']],
    cap: 'a few lines of Faust become a sound in this page' },
  ...SYNTH_STEPS.map((st) => ({
    name: st.name, layout: 'split', side: 'right', say: 'A sine in two lines',
    text: 'A short Faust program, compiled ahead of time, makes this tone. '
      + 'Edit it and the browser compiles yours.',
    slot: synthSlot(st),
  })),
];

export const DECKS = [
  { name: 'brand', slides: [
    { name: 'logo', layout: 'left', lines: [[6, 'β*+*'], [4, 'positron'], [4, 'studio']] },
    { name: 'logo horizontal', slot: logoRow },
    { name: 'wordmark in fives', lines: ['posit', 'ron*.*s', 'tudio'].map((t) => [4, t]) },
    { name: 'wordmark in threes', lines: ['pos', 'itr', 'on*.*', 'stu', 'dio'].map((t) => [4, t]) },
    { name: 'favicon', slot: favicon, cap: 'the favicon at 16 and 32 px' },
    { name: 'app icon', slot: appIcon, cap: 'the installed app, as iOS rounds it and Android masks it' },
  ] },
  { name: 'synths', slides: SYNTHS },
];

/** One player per deck into every `[data-decks]` holder under `root`. */
export function mountDecks(root = document) {
  const players = [];
  for (const host of root.querySelectorAll('[data-decks]')) {
    const row = document.createElement('div');
    row.className = 'pos-decks-in';
    for (const deck of DECKS) {
      const p = createSlidePlayer(deck.slides);
      p.el.dataset.deck = deck.name;
      row.append(p.el);
      players.push(p);
    }
    host.replaceChildren(row);
  }
  return players;
}
