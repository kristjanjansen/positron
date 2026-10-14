// demo/shell/slide.mjs: one 16:9 slide drawn from plain data (say, statement, big, text,
// list, stack, rows, lines, cap, title, slot, layout, side, cols, bottom), and a player
// whose keys belong to its own panel, never to `window`. Keys and marks: see the lesson.
// why: lessons/kit-slide.md#header

import { el } from './shell.mjs';
import { createVideoPanel } from './video-panel.mjs';
import { createStepper } from './stepper.mjs';
import { createDiagram, TECH_HUE } from './diagram.mjs';
import { toggle as fsToggle, exit as fsExit, isFull, watch as fsWatch } from './fullscreen.mjs';
import { centreSymbol } from './symbol.mjs';

// ── the scale, declared once ────────────────────────────────────────────────
// One base, one ratio, six steps: size in cqh of the slide's height, line height opens
// as size drops, tracking closes as size grows. Every other type number derives from it.
// why: lessons/kit-slide.md#scale
export const SCALE = Object.freeze({
  base: 4,
  ratio: 1.5,
  steps: Object.freeze([
    Object.freeze({ n: 1, lh: 1.45, ls: 0 }),
    Object.freeze({ n: 2, lh: 1.3, ls: -0.005 }),
    Object.freeze({ n: 3, lh: 1.2, ls: -0.012 }),
    Object.freeze({ n: 4, lh: 1.1, ls: -0.03 }),
    Object.freeze({ n: 5, lh: 1.05, ls: -0.045 }),
    Object.freeze({ n: 6, lh: 1, ls: -0.06 }),
  ]),
});
// Step 1 tracks at 0 because it is read as words.
// why: lessons/kit-slide.md#tracking
export const STEPS = SCALE.steps.map((s) => s.n);

/** A step's size as a share of the slide's height, in per cent. */
export function stepSize(n, scale = SCALE) {
  if (!Number.isInteger(n) || n < 1 || n > scale.steps.length) throw new Error(`no step ${n}`);
  return scale.base * scale.ratio ** (n - 1);
}
/** A step's three numbers, size in per cent of the slide's height. */
export function stepOf(n, scale = SCALE) {
  const s = scale.steps[n - 1];
  if (!s) throw new Error(`no step ${n}`);
  return { n, size: stepSize(n, scale), lh: s.lh, ls: s.ls };
}
/** What a step is, in words, for a caption: the three numbers the slide is set to. */
export function stepCaption(n, scale = SCALE) {
  const { size, lh, ls } = stepOf(n, scale);
  return `step ${n} ${size.toFixed(2)} cqh, line ${lh.toFixed(2)}, tracking ${ls === 0 ? '0' : ls.toFixed(3)} em`;
}
/**
 * The scale as custom properties on `sel`, which is the only place they are
 * written. Each size is `calc` off the one below so nothing is typed twice, and
 * `cqh` in it resolves where it is USED, inside the slide, which is the size
 * container, so every step is a share of the slide it sits on.
 */
export function scaleCss(sel = '.sl', scale = SCALE) {
  const p = [`--sl-base: ${scale.base}`, `--sl-ratio: ${scale.ratio}`, '--sl-1: calc(var(--sl-base) * var(--sl-u, 1cqh))'];
  for (let n = 2; n <= scale.steps.length; n++) p.push(`--sl-${n}: calc(var(--sl-${n - 1}) * var(--sl-ratio))`);
  for (const s of scale.steps) p.push(`--sl-${s.n}-lh: ${s.lh}`, `--sl-${s.n}-ls: ${s.ls}em`);
  return `${sel} { ${p.join('; ')}; }`;
}

// ── words ───────────────────────────────────────────────────────────────────
/** The text with the marks taken out. */
export const plain = (t) => String(t ?? '').replace(/[*`]/g, '').replace(/\[([^|\]]+)\|[^\]]+\]/g, '$1');

/** The marks in a string as runs: `{ text }`, `{ text, hi: true }`, `{ text, hue, tech }`, `{ text, code: true }`. */
export function parseMarks(t, hues = TECH_HUE) {
  const out = [];
  for (const part of String(t ?? '').split(/(\*[^*]+\*|\[[^|\]]+\|[^\]]+\]|`[^`]+`)/)) {
    if (!part) continue;
    let m;
    if (/^\*[^*]+\*$/.test(part)) out.push({ text: part.slice(1, -1), hi: true });
    else if (/^`[^`]+`$/.test(part)) out.push({ text: part.slice(1, -1), code: true });
    else if ((m = part.match(/^\[([^|\]]+)\|([^\]]+)\]$/))) {
      const tech = m[2].trim().toLowerCase();
      // A name with no hue throws, so a typo cannot quietly print a plain word.
      if (hues[tech] == null) throw new Error(`no hue called ${tech}`);
      out.push({ text: m[1], hue: hues[tech], tech });
    } else out.push({ text: part });
  }
  return out;
}

/**
 * Colour every `` `name` `` under `root` by `hueOf(name)`: a finite number
 * puts `data-hue` and `--param-hue` on it, the two the code box's
 * `.pos-tk-pvar` and a knob already read, anything else takes both off, so a
 * name with no knob stays in the slide's ink. Returns how many it coloured.
 * Called again whenever the book changes, it never leaves a stale hue.
 * @param {ParentNode} root
 * @param {(name: string) => number|null} hueOf
 */
export function hueVars(root, hueOf = () => null) {
  let n = 0;
  for (const c of root.querySelectorAll('code.sl-var')) {
    const hue = hueOf(c.dataset.var);
    if (typeof hue === 'number' && Number.isFinite(hue)) {
      c.dataset.hue = String(hue);
      c.style.setProperty('--param-hue', String(hue));
      n++;
    } else {
      delete c.dataset.hue;
      c.style.removeProperty('--param-hue');
    }
  }
  return n;
}

/**
 * What a headline may not carry: no colon, semicolon, dash or middot, no final stop.
 * Returns every problem (empty when none), never throws.
 * why: lessons/kit-slide.md#lint-words
 */
export function lintWords(t) {
  const s = plain(t);
  const bad = [];
  if (/[:;]/.test(s)) bad.push('a colon or semicolon');
  if (/[\u2013\u2014]|\s-\s/.test(s)) bad.push('a dash');
  if (/\u00b7/.test(s)) bad.push('a middot');
  if (/\.\s*$/.test(s)) bad.push('a full stop at the end');
  if (!s.trim()) bad.push('no words');
  return bad;
}

/** Evidence is at step 3, or step 2 at four rows or more, because four rows at
 *  step 3 do not fit under a two line headline (plans/plan-slides.md 3). */
export const evStep = (rows) => (rows > 3 ? 2 : 3);

/**
 * In a split or band the words go one step down: step 4 holds 9 mono characters a line
 * in half a slide, step 3 holds 13. `big` and declared `lines` keep their step.
 * why: lessons/kit-slide.md#words-step
 */
export const wordsStep = (step, layout) => Math.max(1, layout === 'split' || layout === 'band' ? step - 1 : step);

/** The two spaces between character columns, in every table and log. */
export const COL_GAP = 2;

/**
 * One row padded into columns of the given widths, `align[c]` 'r' or left.
 * Padded on the VISIBLE length, so an accent mark takes no column. A cell
 * wider than its column is never cut and pushes the rest of its row along,
 * which a live log avoids by declaring widths that hold its widest value.
 */
export function padRow(r, widths, align = '') {
  return widths.map((cw, c) => {
    const t = String(r[c] ?? ''), fill = ' '.repeat(Math.max(0, cw - plain(t).length));
    return align[c] === 'r' ? fill + t : t + fill;
  }).join(' '.repeat(COL_GAP)).replace(/\s+$/, '');
}

/** Where each column starts, in characters, for these widths. */
export function colStarts(widths) {
  const starts = []; let x = 0;
  for (const cw of widths) { starts.push(x); x += cw + COL_GAP; }
  return starts;
}

/** Pad `rows` into lines of text whose columns are character positions. */
export function padRows({ head = null, body = [], align = '' }) {
  const all = head ? [head, ...body] : body;
  const n = Math.max(0, ...all.map((r) => r.length));
  const w = Array.from({ length: n }, (_, c) => Math.max(...all.map((r) => plain(r[c]).length)));
  return { lines: all.map((r) => padRow(r, w, align)), starts: colStarts(w), widths: w, head: !!head };
}

/**
 * A table's frame. Absent: plain padded lines. `none`: a 1 px rule between rows, full
 * width, no vertical lines (alignment already marks a column).
 * why: lessons/kit-slide.md#frames
 */
export const FRAMES = ['none'];

/**
 * A framed row carries 0.3 em of air above and below its glyphs, so a table
 * of three lines is about one line taller than a plain one, and at three lines
 * or more it drops to step 2 rather than spilling under a two line headline.
 */
export const tableStep = (lines, frame) => (frame ? (lines > 2 ? 2 : 3) : evStep(lines));

// ── the slide model ─────────────────────────────────────────────────────────
export const LAYOUTS = ['stack', 'top', 'left', 'split', 'band'];
/** A split's words column to its slot, see `cols` in the header. */
export const SPLIT_COLS = ['1:1', '1:2'];
const KEYS = new Set(['name', 'layout', 'side', 'cols', 'bottom', 'say', 'sayStep', 'statement', 'big', 'under', 'text', 'textStep',
  'list', 'stack', 'rows', 'lines', 'cap', 'slot', 'notes', 'title', 'by', 'date', 'place', 'mark']);

/**
 * The title slide's steps: title 5 (about 26 characters in two lines), by 3, date and
 * place 2, dimmed. Title top left, who and when on the bottom edge.
 * why: lessons/kit-slide.md#title-steps
 */
export const TITLE_STEPS = Object.freeze({ title: 5, by: 3, date: 2 });
const TITLE_ONLY = ['title', 'by', 'date', 'place', 'cap', 'name', 'notes', 'layout', 'mark'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];
/**
 * A talk's date as people say it: `2026-10-05` is `5 October 2026`. Anything
 * that is not an ISO day is printed as it was written, so `autumn 2026` is
 * allowed; an ISO day that is not a real day throws.
 */
export function talkDate(t) {
  const s = String(t ?? '').trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const real = new Date(Date.UTC(y, mo - 1, d));
  if (real.getUTCMonth() !== mo - 1 || real.getUTCDate() !== d) throw new Error(`no day called ${s}`);
  return `${d} ${MONTHS[mo - 1]} ${y}`;
}

/**
 * Where a tap steps a player: left third -1, right third 1, middle 0, so a stray tap
 * does not turn a page.
 * why: lessons/kit-slide.md#tap-zone
 */
export function tapZone(x, w) {
  if (!(w > 0) || !Number.isFinite(x)) return 0;
  return x < w / 3 ? -1 : x > (2 * w) / 3 ? 1 : 0;
}

// A swipe of `SWIPE_PX`, `SWIPE_RATIO` times more across than down, steps a slide
// (left goes forward). Returns -1, 0 or 1. A tap or swipe on OWN_TAPS is the control's.
// why: lessons/kit-slide.md#swipe
const OWN_TAPS = 'button, a, input, select, textarea, [role="slider"], [contenteditable], .k, [data-own-taps]';
export const SWIPE_PX = 40;
export const SWIPE_RATIO = 1.5;
export function swipeStep(dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
  if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < SWIPE_RATIO * Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}

/**
 * A spec checked and filled in, with no document. Throws on a shape that
 * cannot be drawn (an unknown key, layout or step, a split with no slot or no
 * side), because those are the author's mistakes and are said where the spec
 * is written. Words are graded by `lintWords`, not here.
 */
export function normalise(spec) {
  if (!spec || typeof spec !== 'object') throw new Error('a slide is an object');
  for (const k of Object.keys(spec)) if (!KEYS.has(k)) throw new Error(`a slide has no key called ${k}`);
  if ((spec.by || spec.date || spec.place) && !spec.title) throw new Error('who, when and where open a talk, so they need a title');
  if (spec.mark && !spec.title) throw new Error('the β+ opens a talk, so it is on a title slide');
  if (spec.title) {
    for (const k of Object.keys(spec)) if (!TITLE_ONLY.includes(k)) throw new Error(`a title slide is the talk's name, who, when and where, not ${k}`);
    if (spec.layout && spec.layout !== 'top') throw new Error('a title slide is laid out top, its name above and who and when on the bottom edge');
    if (spec.date != null) talkDate(spec.date);
  }
  const layout = spec.layout || (spec.title ? 'top' : 'stack');
  if (!LAYOUTS.includes(layout)) throw new Error(`no layout called ${layout}`);
  if (layout === 'split') {
    if (!spec.slot) throw new Error('a split slide needs a slot, the thing beside the words');
    if (spec.side !== 'left' && spec.side !== 'right') throw new Error('a split slide says which side its slot is on, left or right');
    if (spec.cols != null && !SPLIT_COLS.includes(spec.cols)) throw new Error(`a split's cols are ${SPLIT_COLS.join(' or ')}, not ${spec.cols}`);
    if (spec.bottom != null && typeof spec.bottom !== 'boolean') throw new Error('bottom is true or false');
  } else {
    if (spec.side) throw new Error(`side is for a split slide, not ${layout}`);
    if (spec.cols != null || spec.bottom != null) throw new Error(`cols and bottom are for a split slide, not ${layout}`);
  }
  if (layout === 'band' && !spec.slot && !spec.big) throw new Error('a band slide needs a slot or a big figure for its top two thirds');
  if (spec.statement && (spec.big || spec.rows || spec.stack || spec.list)) {
    throw new Error('a statement is the whole slide, so it carries no evidence');
  }
  for (const [n] of spec.lines || []) stepOf(n);
  if (spec.textStep != null) stepOf(spec.textStep);
  if (spec.sayStep != null) stepOf(spec.sayStep);
  if (spec.list && spec.list.length > 4) throw new Error('a list is two to four lines');
  if (spec.rows && spec.rows.frame != null && !FRAMES.includes(spec.rows.frame)) {
    throw new Error(`a table frame is none, not ${spec.rows.frame}`);
  }
  return { ...spec, layout };
}

// ── the stylesheet ──────────────────────────────────────────────────────────
// `slide.css` holds every rule; the scale is written here from `SCALE`, once.
const CSS_HREF = '/shell/slide.css';
const SCALE_ID = 'pos-slide-scale';
function ensureCss() {
  if (typeof document === 'undefined') return;
  // A page links slide.css itself; one that forgot still gets it, because a
  // slide drawn with no stylesheet is a column of unstyled words.
  if (![...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.getAttribute('href') === CSS_HREF)) {
    document.head.append(el('link', '', null, { rel: 'stylesheet', href: CSS_HREF }));
  }
  if (!document.getElementById(SCALE_ID)) {
    const s = el('style', '', scaleCss('.sl'));
    s.id = SCALE_ID;
    document.head.append(s);
  }
}

/** A fragment of `t` with each mark as a span. */
export function rich(t) {
  const f = document.createDocumentFragment();
  for (const r of parseMarks(t)) {
    if (r.hi) f.append(el('span', 'sl-hi', r.text));
    else if (r.code) {
      const c = el('code', 'sl-var', r.text);
      c.dataset.var = r.text;
      f.append(c);
    }
    else if (r.hue != null) {
      const sp = el('span', 'sl-hue', r.text);
      sp.dataset.tech = r.tech;
      // per instance, so a custom property and never the property itself
      sp.style.setProperty('--sl-hue', String(r.hue));
      f.append(sp);
    } else f.append(document.createTextNode(r.text));
  }
  return f;
}

/**
 * A component sized in px, laid out at `w` logical px and scaled into `host`.
 * The scale is a custom property, never the transform written by hand.
 */
export function fitBox(host, w, { h = 0, top = false, fill = false } = {}) {
  const outer = el('div', 'sl-fit');
  const inner = el('div', 'sl-fit-in');
  inner.style.setProperty('--fit-w', `${w}px`);
  outer.append(inner);
  host.append(outer);
  let k = 0;
  const fit = () => {
    const ow = outer.clientWidth, oh = outer.clientHeight;
    const ih = inner.offsetHeight || 1;
    if (!ow || !oh) return k;
    // `h`, a logical height to scale by when it is taller than the content, so boxes of
    // different heights share one scale: the shorter one is centred, not grown
    // why: lessons/kit-slide.md#fit-h
    k = Math.min(ow / w, oh / Math.max(ih, h));
    // `fill`: the box takes the slot's whole width at that scale (never less than `w`), so
    // the slot's own inset is the air on every side; its content reflows to the width
    // why: lessons/kit-slide.md#fit-fill
    const wNow = fill ? Math.max(w, ow / k) : w;
    inner.style.setProperty('--fit-w', `${wNow}px`);
    inner.style.setProperty('--fit-k', String(k));
    inner.style.setProperty('--fit-x', `${(ow - wNow * k) / 2}px`);
    // `top`: anchored to the top rather than centred, so content that grows
    // (a knob row appearing) grows downward and nothing above it moves
    inner.style.setProperty('--fit-y', `${top ? Math.max(0, (oh - Math.max(ih, h) * k) / 2) : (oh - ih * k) / 2}px`);
    return k;
  };
  const ro = new ResizeObserver(fit);
  ro.observe(outer); ro.observe(inner);
  return { outer, inner, fit, k: () => k, w };
}

/**
 * A diagram on a slide: box names only, each top-level `desc` set under its column at
 * step 1. 580 logical px, the narrowest that keeps a row of columns. Returns a slot builder.
 * why: lessons/kit-slide.md#slide-diagram
 */
export function slideDiagram(spec, { w = 580 } = {}) {
  const tops = spec.nodes;
  const clean = {
    ...spec,
    nodes: tops.map(function strip(n) {
      const { desc, sub, ...rest } = n;
      return rest.children ? { ...rest, children: rest.children.map(strip) } : rest;
    }),
    links: (spec.links || []).map(({ label, ...rest }) => rest),
  };
  return (host) => {
    const outer = el('div', 'sl-fit');
    const inner = el('div', 'sl-fit-in');
    inner.style.setProperty('--fit-w', `${w}px`);
    outer.append(inner);
    host.append(outer);
    const dg = createDiagram(inner, clean);
    const row = el('div', 'sl-dgd sl-t sl-t1');
    outer.append(row);
    const descs = tops.map((n) => {
      if (!n.desc) return null;
      const sp = el('span');
      sp.append(rich(n.desc));
      sp.dataset.box = n.label;
      row.append(sp);
      return sp;
    });
    const flat = (t) => String(t ?? '').replace(/\s+/g, '');
    const boxes = () => {
      const groups = [...dg.svg.querySelectorAll('.pos-dg-n')];
      const out = []; let j = 0;
      for (const n of tops) {
        while (j < groups.length && flat(groups[j].querySelector('.pos-dg-lab')?.textContent) !== flat(n.label)) j++;
        out.push(groups[j++] || null);
      }
      return out;
    };
    const fit = () => {
      const ow = outer.clientWidth, oh = outer.clientHeight;
      const ih = inner.offsetHeight || 1;
      if (!ow || !oh) return;
      const lh = parseFloat(getComputedStyle(row).lineHeight) || 0;
      const any = descs.some(Boolean);
      const gap = any ? lh / 2 : 0;
      // two lines of words reserved before the picture is fitted, so the
      // picture and its words are centred together
      const resv = any ? gap + 2 * lh : 0;
      const k = Math.min(ow / w, Math.max(1, oh - resv) / ih);
      inner.style.setProperty('--fit-k', String(k));
      inner.style.setProperty('--fit-x', `${(ow - w * k) / 2}px`);
      inner.style.setProperty('--fit-y', `${(oh - ih * k - resv) / 2}px`);
      if (!any) return;
      const ob = outer.getBoundingClientRect();
      const rects = boxes().map((g) => g?.querySelector('.pos-dg-box')?.getBoundingClientRect() || null);
      const cx = rects.map((r) => (r ? r.left + r.width / 2 - ob.left : NaN));
      let bottom = 0;
      rects.forEach((r, i) => {
        if (!r || !descs[i]) return;
        bottom = Math.max(bottom, r.bottom - ob.top);
        const prev = i > 0 && Number.isFinite(cx[i - 1]) ? (cx[i] - cx[i - 1]) / 2 : cx[i];
        const next = i < cx.length - 1 && Number.isFinite(cx[i + 1]) ? (cx[i + 1] - cx[i]) / 2 : ow - cx[i];
        const half = Math.max(r.width / 2, Math.min(prev, next, cx[i], ow - cx[i]) - gap / 2);
        descs[i].style.setProperty('--dgd-x', `${cx[i]}px`);
        descs[i].style.setProperty('--dgd-w', `${2 * half}px`);
      });
      row.style.setProperty('--dgd-y', `${bottom + gap}px`);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(outer); ro.observe(inner);
    return { dg, fit, descs, boxes, subject: () => dg.svg };
  };
}

/**
 * ONE SLIDE.
 *
 * @param spec       see the top of this file
 * @param o.host     where to put it; omitted, the caller appends `el`
 * @param o.slots    { kind: (host, options) => ctl } for a `slot: { kind }`
 * @param o.full     a fullscreen button on the slide, through fullscreen.mjs
 * @returns { el, frame, spec, parts, ctl, start, stop, fullBtn, full(want), isFull() }
 * `frame` is the size container; `ctl` is what the slot builder returned.
 * why: lessons/kit-slide.md#create-slide
 */
export function createSlide(spec, { host = null, slots = {}, full = false } = {}) {
  ensureCss();
  const s = normalise(spec);
  const frame = el('div', 'sl-frame');
  const node = el('section', 'sl', null, { 'aria-roledescription': 'slide' });
  if (s.name) node.setAttribute('aria-label', s.name);
  node.dataset.layout = s.layout;
  if (s.side) node.dataset.side = s.side;
  // 1:1 writes no attribute, so older splits are untouched
  // why: lessons/kit-slide.md#cols-attr
  if (s.cols && s.cols !== '1:1') node.dataset.cols = s.cols;
  if (s.bottom) node.dataset.bottom = '';
  frame.append(node);
  const box = el('div', 'sl-in');
  node.append(box);

  const parts = { say: null, words: null, ev: null, slot: null, cap: null, table: null, stack: null, lines: [],
    title: null, by: null, when: null };
  // The text column: the headline and what proves it. In a split it is one
  // grid cell and the slot is the other; otherwise it is the whole column.
  const words = el('div', 'sl-words');
  parts.words = words;
  box.append(words);

  if (s.title) {
    // a title slide is the opening of a talk, so its name is the page's
    // heading level of a slide, and its own class (TITLE_STEPS)
    node.dataset.kind = 'title';
    const t = el('h2', `sl-t sl-t${TITLE_STEPS.title} sl-say sl-title`);
    t.append(rich(s.title));
    parts.title = t;
    words.append(t);
  }
  if (s.say) {
    const say = el('h2', s.statement ? 'sl-t sl-t5 sl-say sl-st' : `sl-t sl-t${wordsStep(s.sayStep || 4, s.layout)} sl-say`);
    say.append(rich(s.say));
    parts.say = say;
  }
  const ev = el('div', 'sl-ev');
  parts.ev = ev;
  if (parts.say && !s.statement) words.append(parts.say);
  if (s.statement && parts.say) ev.append(parts.say);
  for (const [n, t] of s.lines || []) {
    const p = el('p', `sl-t sl-t${n} sl-line`);
    p.dataset.step = String(n);
    p.append(rich(t));
    parts.lines.push(p);
    ev.append(p);
  }
  // a band's top two thirds: the slot or the big figure, centred in the well
  const well = s.layout === 'band' ? el('div', 'sl-well') : null;
  if (well) { parts.well = well; box.prepend(well); }
  if (s.big) {
    const p = el('p', 'sl-t sl-t6 sl-big');
    p.append(rich(s.big));
    (well || ev).append(p);
    if (s.under) { const u = el('p', 'sl-t sl-t3 sl-dim sl-under'); u.append(rich(s.under)); ev.append(u); }
  }
  if (s.text) {
    const p = el('p', `sl-t sl-t${wordsStep(s.textStep || 3, s.layout)} sl-text`);
    p.append(rich(s.text));
    parts.text = p;
    ev.append(p);
  }
  if (s.list) {
    const ul = el('ul', `sl-list sl-t sl-t${wordsStep(evStep(s.list.length), s.layout)} sl-dim`);
    for (const t of s.list) { const li = el('li'); li.append(rich(t)); ul.append(li); }
    ev.append(ul);
  }
  if (s.stack) {
    const g = el('div', `sl-stack sl-t sl-t${wordsStep(evStep(s.stack.length), s.layout)}`);
    for (const [label, value, unit] of s.stack) {
      const n = el('span', 'sl-num');
      n.append(rich(value));
      g.append(el('span', 'sl-dim', label), n, el('span', 'sl-unit', unit || ''));
    }
    parts.stack = g;
    ev.append(g);
  }
  if (s.rows) {
    const p = padRows(s.rows);
    const frame = s.rows.frame || '';
    const table = el('div', `sl-rows sl-t sl-t${wordsStep(tableStep(p.lines.length, frame), s.layout)}`);
    if (frame) table.dataset.frame = frame;
    p.lines.forEach((t, r) => {
      const row = el('div', r === 0 && p.head ? 'sl-row sl-dim' : 'sl-row');
      row.append(rich(t));
      table.append(row);
    });
    table.layout = p;
    table.align = s.rows.align || '';
    parts.table = table;
    ev.append(table);
  }
  if (s.by) {
    const p = el('p', `sl-t sl-t${TITLE_STEPS.by} sl-by`);
    p.append(rich(s.by));
    parts.by = p;
    ev.append(p);
  }
  if (s.date || s.place) {
    // one line, date then place, joined by a comma as a person would say it
    const p = el('p', `sl-t sl-t${TITLE_STEPS.date} sl-dim sl-when`);
    p.append(rich([s.date ? talkDate(s.date) : '', s.place || ''].filter(Boolean).join(', ')));
    parts.when = p;
    ev.append(p);
  }
  if (s.mark) {
    // The mark is content of the opening slide: last in the bottom block, step 4.
    // why: lessons/kit-slide.md#mark
    const m = el('p', 'sl-t sl-t4 sl-mark', 'β', { 'aria-label': 'positron' });
    m.append(el('span', 'sl-hi', '+'));
    parts.mark = m;
    ev.append(m);
  }
  words.append(ev);

  let ctl = null;
  if (s.slot) {
    const slot = el('div', 'sl-slot');
    parts.slot = slot;
    // In a split the slot is its own column; otherwise it is part of the
    // evidence, under whatever words there are, taking the height left.
    if (s.layout === 'split') {
      if (s.side === 'left') box.prepend(slot); else box.append(slot);
    } else if (well) well.append(slot);
    else ev.append(slot);
    const build = typeof s.slot === 'function' ? s.slot
      : s.slot instanceof Element ? (h) => { h.append(s.slot); return null; }
      : (s.slot.kind && slots[s.slot.kind]) ? (h) => slots[s.slot.kind](h, s.slot)
      : null;
    if (!build) throw new Error(`no slot builder for ${s.slot.kind || 'that slot'}`);
    ctl = build(slot) || null;
  }

  if (s.cap) {
    const cap = el('p', 'sl-t sl-t1 sl-cap');
    cap.append(rich(s.cap));
    parts.cap = cap;
    // a band has one row for words, so the caption is the last of them
    (well ? words : box).append(cap);
  }

  let fullBtn = null;
  if (full) {
    fullBtn = el('button', 'ico sl-full', '⛶', { type: 'button', title: 'fill the screen', 'aria-label': 'fill the screen' });
    centreSymbol(fullBtn);
    node.append(fullBtn);
    fullBtn.addEventListener('click', () => flip());
  }
  let watched = false;
  const flip = async () => {
    // the class has to follow an exit nobody drove, so it is watched, once,
    // from the first press; a slide nobody fills adds no listener at all
    if (!watched) { fsWatch(frame); watched = true; }
    return fsToggle(frame);
  };

  if (host) host.append(frame);
  let running = false;
  return {
    el: node, frame, spec: s, parts, ctl, fullBtn,
    async full(want = true) {
      if (want === isFull(frame)) return want;
      if (want) await flip(); else await fsExit(frame);
      return isFull(frame);
    },
    isFull: () => isFull(frame),
    start() { if (!running) { running = true; ctl?.start?.(); } },
    stop() { if (running) { running = false; ctl?.stop?.(); } },
    running: () => running,
  };
}

/**
 * A live tabular log for a slot, in a fixed box with the newest row at the foot.
 * Widths are declared, not measured, so columns never jump when a long value arrives.
 *
 * @param o.head    the column names, the header row
 * @param o.widths  characters per column; a column is never narrower than its name
 * @param o.align   'r' or 'l' per column, numbers right so their decimals line up
 * @param o.step    the type step, 1 or 2 (a slot is half a slide)
 * @param o.cap     rows kept in the document
 * @returns { el, add(cells), count(), rows(), clear() }
 * why: lessons/kit-slide.md#slide-log
 */
export function createSlideLog({ head, widths, align = '', step = 1, cap = 40 } = {}) {
  ensureCss();
  if (!Array.isArray(head) || !Array.isArray(widths) || head.length !== widths.length) {
    throw new Error('a slide log names its columns and gives each a width');
  }
  if (step !== 1 && step !== 2) throw new Error('a slide log is at step 1 or 2');
  const w = widths.map((n, c) => Math.max(n, plain(head[c]).length));
  const root = el('div', `sl-log sl-t sl-t${step}`);
  const top = el('div', 'sl-row sl-dim sl-log-head', padRow(head, w, align));
  const body = el('div', 'sl-log-body');
  root.append(top, body);
  let added = 0;
  return {
    el: root, head: top, body, widths: w, starts: colStarts(w),
    add(cells) {
      const row = el('div', 'sl-row');
      row.append(rich(padRow(cells, w, align)));
      body.append(row);
      while (body.children.length > cap) body.firstElementChild.remove();
      body.scrollTop = body.scrollHeight;
      added++;
      return row;
    },
    count: () => added,
    rows: () => [...body.children],
    clear() { body.replaceChildren(); },
  };
}

/**
 * A player: slides inside a `createVideoPanel`, prev and next, the count, fullscreen.
 * Keys are heard on the panel root only and stopped there; a key aimed at a control
 * inside a slide is left to it. Full screen with no hover: a tap steps (`tapZone`).
 *
 * @param specs        the slides, plain data
 * @param o.slots      as for `createSlide`
 * @param o.onStep     (index) after every move
 * @param o.title      { text, href }: a link in the count's slot instead of `N / M`
 * @param o.touch      () => true when this is a screen with no hover; the
 *                     default asks `(hover: none)`, and `touchMode(fn)` swaps it
 * @returns { el, panel, slides, go, at, count, next, prev, keys, taps, touchMode }
 * why: lessons/kit-slide.md#player
 */
export function createSlidePlayer(specs, { slots = {}, onStep = () => {}, title = null,
  touch = () => typeof matchMedia === 'function' && matchMedia('(hover: none)').matches } = {}) {
  ensureCss();
  if (!Array.isArray(specs) || !specs.length) throw new Error('a player needs at least one slide');
  if (title && !(title.text && title.href)) throw new Error('a player title needs text and href');
  let at = -1;
  const stepper = createStepper({ prev: () => go(at - 1), next: () => go(at + 1), what: 'slide' });
  // A title takes the count's slot as a link to the deck's page. An `<a>` so Enter
  // navigates; the player's keys leave Enter and space on a link alone.
  // why: lessons/kit-slide.md#title-link
  const count = title
    ? el('a', 'sl-count sl-title', title.text, { href: title.href })
    : el('span', 'sl-count', '');
  const panel = createVideoPanel({ left: stepper, centre: count, fullMode: 'hover' });
  panel.el.classList.add('sl-player');
  panel.el.tabIndex = 0;
  panel.el.setAttribute('aria-roledescription', 'slide player');
  const slides = specs.map((spec) => {
    const s = createSlide(spec, { slots });
    s.el.hidden = true;
    // The stage is the size container in a player, so the slide letterboxes
    // in full screen; the frame wrapper is not used here.
    panel.stage.append(s.el);
    return s;
  });

  function go(i) {
    const next = Math.max(0, Math.min(slides.length - 1, i));
    if (next === at) return at;
    const was = slides[at];
    if (was) { was.el.hidden = true; was.stop(); }
    at = next;
    slides[at].el.hidden = false;
    slides[at].start();
    if (!title) count.textContent = `${at + 1} / ${slides.length}`;
    stepper.buttons[0].disabled = at === 0;
    stepper.buttons[stepper.buttons.length - 1].disabled = at === slides.length - 1;
    onStep(at);
    return at;
  }

  const NEXT = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ' ']);
  const PREV = new Set(['ArrowLeft', 'ArrowUp', 'PageUp']);
  let heard = 0;
  const onKey = (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t instanceof Element) {
      if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (t.closest('[role="slider"]')) return;
      if (/^(BUTTON|A)$/.test(t.tagName) && (e.key === ' ' || e.key === 'Enter')) return;
    }
    let did = true;
    if (NEXT.has(e.key)) go(at + 1);
    else if (PREV.has(e.key)) go(at - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(slides.length - 1);
    else if (e.key === 'f' || e.key === 'F' || e.key === 'F5') panel.full(!panel.isFull());
    else if (e.key === 'Escape' && panel.isFull()) panel.full(false);
    else did = false;
    if (!did) return;
    heard++;
    e.preventDefault();
    e.stopPropagation();
  };
  panel.el.addEventListener('keydown', onKey);
  // In full screen any key in the document is this player's: the focus falls to the body
  // when the footer hides, so the panel also takes focus as it goes full.
  // why: lessons/kit-slide.md#full-keys
  document.addEventListener('keydown', (e) => {
    if (!panel.isFull() || panel.el.contains(e.target)) return;
    onKey(e);
  });
  new MutationObserver(() => {
    if (panel.isFull() && !panel.el.contains(document.activeElement)) panel.el.focus({ preventScroll: true });
  }).observe(panel.el, { attributes: true, attributeFilter: ['class', 'data-full'] });
  // A press on the slide gives the panel the keys, the way clicking a video
  // player does; a press on one of its buttons focuses the button, which is
  // inside the root and so still heard.
  panel.stage.addEventListener('pointerdown', () => panel.el.focus({ preventScroll: true }));
  let tapped = 0;
  panel.stage.addEventListener('click', (e) => {
    if (!panel.isFull() || !touch()) return;
    // a keyboard key (`.k`) and anything marked `data-own-taps` are the
    // slide's own, so a tap on a key plays the note and does not turn the page
    const c = e.target instanceof Element ? e.target.closest(OWN_TAPS) : null;
    if (c && panel.stage.contains(c)) return;
    const r = panel.stage.getBoundingClientRect();
    const z = tapZone(e.clientX - r.left, r.width);
    if (!z) return;
    tapped++;
    go(at + z);
  });

  // A SWIPE, on a touch screen, in or out of full screen (see `swipeStep`).
  // Only a finger counts, a mouse drag never does, and a swipe that starts on
  // one of the slide's own controls is the control's.
  let swiped = 0, from = null;
  panel.stage.addEventListener('pointerdown', (e) => {
    from = e.pointerType === 'touch' && !(e.target instanceof Element && e.target.closest(OWN_TAPS))
      ? { x: e.clientX, y: e.clientY, id: e.pointerId } : null;
  });
  const endSwipe = (e) => {
    if (!from || e.pointerId !== from.id) return;
    const z = swipeStep(e.clientX - from.x, e.clientY - from.y);
    from = null;
    if (!z) return;
    swiped++;
    go(at + z);
  };
  panel.stage.addEventListener('pointerup', endSwipe);
  panel.stage.addEventListener('pointercancel', () => { from = null; });

  go(0);
  return {
    el: panel.el, panel, slides, go, count,
    /** how many swipes this player has stepped on, for an assert */
    swipes: () => swiped,
    at: () => at,
    next: () => go(at + 1),
    prev: () => go(at - 1),
    /** how many keys this player has acted on, for an assert */
    keys: () => heard,
    /** how many taps this player has stepped on, for an assert */
    taps: () => tapped,
    /** swap what says this is a screen with no hover, for a check */
    touchMode(fn) { touch = fn; },
    stop() { slides[at]?.stop(); },
    start() { slides[at]?.start(); },
  };
}
