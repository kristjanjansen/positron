// demo/shell/slide.mjs, ONE SLIDE, drawn from plain data, and a small player.
//
// 🔴 A SLIDE IS A KIT COMPONENT NOW, AND `/slides/` IS AN ARCHIVE. Asked
// 2026-10-05: *"keep slides as it was for an archive with font picker and
// sample content etc let it be then let's focus on the kit make a new tab
// there slides and methodically slide by slide"*. The engine in
// `demo/slides/deck.mjs` stays where it is and nothing imports it from here;
// what moved is the IDEA, rebuilt as one component that renders one slide and
// knows nothing about a talk. plans/plan-slides.md section 13 has the record.
//
// WHAT IT DRAWS. A 16:9 box sized off its container with container units, the
// six step type scale (size, line height and tracking per step, declared ONCE
// in `SCALE` below and written into the stylesheet as custom properties by
// `scaleCss()`), and the parts a slide is made of:
//
//   say        the headline, step 4 (3 in a split), top left, one sentence, no full stop
//   sayStep    the headline a step or two down for a whole talk of them, 2026-10-07
//              (*"iside slides use lesser text size"*, the positron deck)
//   statement  the sentence is the slide, step 5, up to three lines
//   big        one figure, step 6, with `under` at step 3 beneath it
//   text       a paragraph, step 3 (or `textStep`)
//   list       up to three lines, dimmed
//   stack      [label, value, unit] rows, decimal points in one column
//   rows       { head, body, align, frame }, a table padded into character
//              columns; `frame` 'none' rules a line between rows across
//              the full width, absent is plain lines
//   lines      [[step, text], ...], each line at its own step, for specimens
//   cap        the caption, step 1, bottom left, always
//   mark       true puts the β+ at the foot of a title slide (2026-10-07)
//   title      THE OPENING OF A TALK, step 5, with `by` at step 3 and `date`
//              and `place` at step 2 under it, on the bottom edge (see
//              TITLE_STEPS); a title slide carries nothing else
//   slot       any element: a kit component, a picture, a diagram
//   layout     'stack' (default), 'top', 'left', 'split', 'band' (no 'right',
//              removed 2026-10-05: *"no right align needed"*). `band` is
//              two rows, 2:1: the slot or the big figure centred in a darker
//              well across the top two thirds, the words under it on the
//              slide's own ground (2026-10-06: *"its better to use vertical
//              sections here. top 2/3 is darker ... below in lighter area
//              title an desc"*)
//   side       for 'split', which side the slot is on: 'left' or 'right'
//   cols       for 'split', the words column to the slot's: '1:1' (default)
//              or '1:2', the words a third of the slide and the slot two
//              thirds, the divide at exactly one third from the words' edge
//              (2026-10-06, the synths deck: *"use 1:2 cols layout"*)
//   bottom     for 'split', true sets the headline and the words together on
//              the foot of their column (the same day: *"align text to
//              bottom of slide"*)
//
// Marks in any string: `*x*` paints x in `--hi`, `[x|tech]` paints x in the
// hue `diagram.mjs` gives that technology (`[Cloudflare|cloudflare]`), at the
// strength the diagram names a box in, so a word and a box can be joined by
// colour. `` `x` `` is a name out of a program (`volume`, `process`), set in
// the slide's monospace face inside sans text, 2026-10-06 (*"var name is in
// monospace inside text"*). It is uncoloured until `hueVars(root, hueOf)`
// gives it the hue `hueOf` answers for that name, which is how a slide's
// words take the colour its knobs and its code box already wear (*"in the
// text use variable name with colorcoding"*): one book, never a picked colour.
//
// 🔴 A SLIDE SET IS PLAIN DATA. Every key above is a string, a number or an
// array of them, except `slot`, which may be a function `(host) => ctl` or a
// plain `{ kind, ...options }` resolved through a `slots` map the caller
// passes (`createSlide(spec, { slots })`). So a talk can be a JSON file of
// specs plus one map from kind to builder, and the same specs render as static
// slides or inside `createSlidePlayer`. What is missing for a set page is
// written in plans/plan-slides.md section 13.
//
// THE FACE IS JETBRAINS MONO, self-hosted under `shell/vendor/` (copied from
// the archive's own vendor folder, which keeps its seven). One face, no picker:
// the picker is the archive's.
//
// 🔴 KEYS BELONG TO THE PLAYER'S OWN PANEL, NEVER TO `window`. `/kit/` has
// transport bars, a keyboard with a letter row and step grids, all of which
// take arrows or space, and `deck.mjs` listened on `document`. The player
// listens on its panel's root, which takes focus, and a key it handles is
// stopped there so it never reaches a bar's `window` listener as well.
//
// px COMPONENTS ON A SLIDE. A control sized in px is either laid out at a
// fixed logical width and scaled into its slot (`fitBox`, the way a projector
// scales a picture; pointer maths survives it because every kit control reads
// its own `getBoundingClientRect`, which is the transformed box), or given a
// size in the slide's own container units where the component already reads
// its size from CSS (a wave view's `--wave-h`, a video panel's width).

import { el } from './shell.mjs';
import { createVideoPanel } from './video-panel.mjs';
import { createStepper } from './stepper.mjs';
import { createDiagram, TECH_HUE } from './diagram.mjs';
import { toggle as fsToggle, exit as fsExit, isFull, watch as fsWatch } from './fullscreen.mjs';
import { centreSymbol } from './symbol.mjs';

// ── the scale, declared once ────────────────────────────────────────────────
/**
 * 🔴 ONE BASE, ONE RATIO, SIX STEPS, the scale `plans/plan-slides.md` section 3
 * settled and measured on `/slides/`. Size is a share of the slide's HEIGHT in
 * per cent (so `cqh`), line height is unitless and OPENS as the size drops, and
 * tracking is in em and CLOSES as the size grows. Every other number about type
 * in this file and in `slide.css` is derived from these.
 *   step 1  caption, box words under a diagram
 *   step 2  evidence with four rows
 *   step 3  evidence, a paragraph, a list
 *   step 4  the headline
 *   step 5  a statement
 *   step 6  one figure
 */
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
// ⚠️ THE TRACKING CLOSED FURTHER ON THE LARGE STEPS, 2026-10-05, asked as
// *"biit more negat tracking on large sizes"*: it was 0, -0.005, -0.01, -0.02,
// -0.03 and -0.04 em, and it is the values above. Step 1 stays at 0, because
// it is read as words; a mono face at display size reads loose without it.
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
 * 🔴 WHAT A HEADLINE MAY NOT CARRY, from plans/plan-slides.md section 2: one
 * sentence, so no colon, semicolon, dash or middot buying a second clause, and
 * no full stop at the end. Returns the problems, empty when there are none.
 * A REPORT, not a throw, because the kit grades it and a page author should
 * see every problem at once rather than the first.
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
 * 🔴 IN A SPLIT THE WORDS GO ONE STEP DOWN, AND IT IS A RULE IN CODE, NOT A
 * CHOICE PER SLIDE. Half a slide is 41 per cent of its width, which is 72.9
 * per cent of its height, and a mono advance is 0.6 em: step 4 holds 9
 * characters a line there, so `Latency is read off a burned clock` took four
 * lines and pushed its caption off the slide (MEASURED by the kit's spill
 * assert, four splits red). Step 3 holds 13 and step 2 holds 20. A `big`
 * figure and declared `lines` keep their step, because they name it.
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
 * 🔴 A TABLE'S FRAME, CHOSEN PER SLIDE. Asked 2026-10-05: *"i do not see
 * tables layout. horiz lines but try with rounded corner outer border and
 * not"*. Absent, a table is plain padded lines. `none` draws a 1 px `--line`
 * rule between rows (the header's included) and nothing outside them, across
 * the full width of the evidence. No vertical lines: a column is a character
 * position, and a rule between columns would say twice what the alignment
 * already says. ⚠️ `box`, a rounded outer edge, was removed the same evening:
 * *"tables full w. no roundex box"*.
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
 * 🔴 THE TITLE SLIDE'S STEPS, CHOSEN ONCE AND NOT PER TALK. Asked 2026-10-05
 * from the slides list as *"so slide title"*: the opening of a talk, its name,
 * who speaks and when.
 *   title  step 5, the statement step. A talk's name is one sentence read from
 *          the back of the room, and step 5 holds 13 characters a line (a mono
 *          advance is 0.6 em, 20.25 cqh of a 177.8 cqh wide slide less its
 *          inset), so a name of up to about 26 characters is two balanced
 *          lines. Step 6 is spent on one figure and holds 8 a line, which
 *          breaks any title into a column of words.
 *   by     step 3, the evidence step: read second, and still read at a glance.
 *   date and place  step 2, dimmed, the quietest words a talk opens with and
 *          the last thing anybody looks for.
 * The title sits top left where every headline sits; who and when sit on the
 * bottom edge, the `top` layout's own arrangement, so the air between them is
 * the slide's and no number places either.
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
 * 🔴 WHERE A TAP STEPS A PLAYER, from the x of the tap across the slide's
 * width: the left third is back (-1), the right third is forward (1), the
 * middle third is nothing (0), so a stray tap on a phone does not turn a page
 * and the middle stays free for the panel's own way out.
 */
export function tapZone(x, w) {
  if (!(w > 0) || !Number.isFinite(x)) return 0;
  return x < w / 3 ? -1 : x > (2 * w) / 3 ? 1 : 0;
}

/**
 * A SWIPE STEPS A SLIDE, asked 2026-10-06 as *"add keyboard control to slides
 * in fullscreen and mobile support"*. A finger moved left goes forward and
 * moved right goes back, the way every phone turns a page, at any size and in
 * or out of full screen. It must travel `SWIPE_PX` and be clearly sideways
 * (`SWIPE_RATIO` times further across than down), so a vertical scroll of the
 * page past a deck never turns a slide. Returns -1, 0 or 1.
 */
// What on a slide is its own to press: a tap or a swipe that lands on one of
// these is never a page turn.
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
    // `h`, a logical height to scale by when it is taller than the content, so
    // several boxes of different heights come out at ONE scale (2026-10-06,
    // *"2 and 3 use same size of fau"*): the shorter one is centred, not grown
    k = Math.min(ow / w, oh / Math.max(ih, h));
    // `fill`: the box takes the slot's whole width at that scale (never less
    // than `w`), so what is around it is the slot's own inset on every side
    // and not a wide gap left and right (2026-10-06, *"make padding same from
    // top and left and right and bottom"*); its content reflows to the width
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
 * A diagram on a slide: BOX NAMES ONLY, and what each top level box is goes
 * under its column as slide text at step 1. The archive's rule, asked
 * 2026-10-05: *"do not use diagram native descs below but use slides text and
 * postion"*. Every `sub` and link `label` is taken out before the diagram sees
 * the spec, and a top level node's `desc` is set under that box.
 * ⚠️ 580 LOGICAL px, NOT 640, since the edges went thick (`slide.css` has the
 * arithmetic): the narrowest width that keeps a row of columns, so the box
 * padding and gaps come out larger against a name drawn one size down.
 * Returns a slot builder.
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
 * @param o.full     a ⛶ on the slide that fills the screen with it
 * @returns { el, frame, spec, parts, ctl, start, stop, fullBtn, full(want), isFull() }
 *
 * 🔴 `full: true`, asked 2026-10-05 as *"add go to fullscreen button (active
 * when mouseover) on all kit slide samples"*. The ⛶ is the video panel's
 * (the same glyph, `ico` look and ink centring), shown while a pointer is on
 * the slide or the slide holds focus, and always on a screen with no hover,
 * where it is also the way back out. The FRAME goes full through
 * `fullscreen.mjs` (the real API, else the `position: fixed` cover), so the
 * slide inside it stays a size container and every step keeps its share of the
 * slide's height. Escape leaves on both paths: the real API takes it itself and
 * `watch` handles the cover. Then *"fill full bg but keep border"*: the whole
 * screen takes the slide's ground and the 16:9 box keeps its edge and corner.
 *   `frame` is the inline size container the slide is sized off; `el` is the
 *   slide. `ctl` is whatever the slot builder returned (its `start` and `stop`
 *   are called by `start()` and `stop()`, and by the player on show and hide).
 */
export function createSlide(spec, { host = null, slots = {}, full = false } = {}) {
  ensureCss();
  const s = normalise(spec);
  const frame = el('div', 'sl-frame');
  const node = el('section', 'sl', null, { 'aria-roledescription': 'slide' });
  if (s.name) node.setAttribute('aria-label', s.name);
  node.dataset.layout = s.layout;
  if (s.side) node.dataset.side = s.side;
  // ⚠️ 1:1 WRITES NO ATTRIBUTE, so every split before this option is untouched
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
    // 🔴 THE β+ AS CONTENT OF THE OPENING SLIDE, 2026-10-07, asked as *"put logo
    // to bottom left, respect slide paddings, make it bigger. onluy on
    // frontpage of slides! its like content"*. Last in the bottom block, so it
    // stands on the slide's own inset under who and when, at step 4 with the +
    // raised as on the logo. It was a corner glyph on every slide for an hour.
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
 * A LIVE TABULAR LOG for a slot: a header row and rows under it, padded into
 * character columns like a `rows` table and ruled like a `frame: 'none'` one.
 * Asked 2026-10-05: *"show 2col layout with live logs / live tabular logs"*.
 *
 * 🔴 A FIXED BOX, AND THE NEWEST ROW AT THE BOTTOM. The log takes the height
 * its slot gives it and never its content's, so nothing on the slide moves
 * while it fills (positron-ui: a live surface is a fixed box). A new row is
 * appended at the foot and the body is scrolled to it, so the oldest rows
 * leave the top; past `cap` rows the oldest are removed from the document too.
 * 🔴 THE WIDTHS ARE DECLARED, NOT MEASURED, because a live log's widest value
 * has not arrived yet: a column sized to the rows so far would widen when a
 * longer one came and every column right of it would jump.
 *
 * @param o.head    the column names, the header row
 * @param o.widths  characters per column; a column is never narrower than its name
 * @param o.align   'r' or 'l' per column, numbers right so their decimals line up
 * @param o.step    the type step, 1 or 2 (a slot is half a slide)
 * @param o.cap     rows kept in the document
 * @returns { el, add(cells), count(), rows(), clear() }
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
 * A PLAYER: slides inside a `createVideoPanel`, previous and next in its left
 * slot, the count in the middle, the panel's own ⛶ on the right.
 *
 * 🔴 THE KEYS ARE THE PANEL'S. The panel root takes focus (a press anywhere on
 * it gives it), and keydown is heard on that root only: Right, Down, PageDown
 * and Space for next, Left, Up and PageUp for previous (a Logitech clicker
 * sends PageUp and PageDown), Home and End, `f` and F5 for full screen, Escape
 * to leave it. A key it uses is stopped there, so a transport bar's `window`
 * listener and a keyboard's letter row never hear it. A key aimed at a field,
 * a slider lane or a knob inside a slide is left to that control.
 *
 * 🔴 IN FULL SCREEN ON A PHONE A TAP STEPS IT, asked 2026-10-05 from the
 * slides list as item 11, *"touch: stepping a player in full screen on a
 * phone"*. Full screen hides the footer (`fullMode: 'hover'`) and a phone has
 * no keys, so there was no way to the next slide at all. A tap on the left
 * third goes back and on the right third goes forward (`tapZone`); the middle
 * does nothing. Chosen over keeping the footer in full screen (`'footer'`),
 * because the footer is a 54 px row taken out of a phone's landscape height,
 * which is already the short side of a 16:9 slide, and because the edges of
 * the screen are where every reader on a phone already turns a page. A tap on
 * a control inside a slide (a knob, a button, a link) is the control's.
 * ⚠️ ONLY ON A SCREEN WITH NO HOVER AND ONLY WHILE FULL. On a desk the slide is
 * pressed to give the panel its keys and a press there must not turn a page.
 *
 * @param specs        the slides, plain data
 * @param o.slots      as for `createSlide`
 * @param o.onStep     (index) after every move
 * @param o.title      { text, href }: a link in the count's slot instead of `N / M`
 * @param o.touch      () => true when this is a screen with no hover; the
 *                     default asks `(hover: none)`, and `touchMode(fn)` swaps it
 * @returns { el, panel, slides, go, at, count, next, prev, keys, taps, touchMode }
 */
export function createSlidePlayer(specs, { slots = {}, onStep = () => {}, title = null,
  touch = () => typeof matchMedia === 'function' && matchMedia('(hover: none)').matches } = {}) {
  ensureCss();
  if (!Array.isArray(specs) || !specs.length) throw new Error('a player needs at least one slide');
  if (title && !(title.text && title.href)) throw new Error('a player title needs text and href');
  let at = -1;
  const stepper = createStepper({ prev: () => go(at - 1), next: () => go(at + 1), what: 'slide' });
  // 🔴 THE TITLE TAKES THE COUNT'S SLOT, asked 2026-10-06: *"title is on footer
  // on 1/2 w it replaces page count and becomes link to slides/(slug) page"*, the
  // slug written in brackets here because a slash and a star open a comment.
  // A half width player on the front page names its deck where the `N / M`
  // would be, as a link to the deck's own page, which keeps the count. An `<a>`
  // so Enter and a click navigate; the player's keys leave Enter and space on a
  // link alone and still take the arrows (see `onKey`).
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
  // 🔴 IN FULL SCREEN THE KEYS ARE THE WHOLE DOCUMENT'S, asked 2026-10-06 as
  // *"add keyboard control to slides in fullscreen"*. Entering full screen
  // hides the footer, and with it the ⛶ that was just pressed and held the
  // focus, so the focus fell back to the body and no arrow reached the panel.
  // So while this player fills the screen, a key heard anywhere in the
  // document is this player's (one player can be full at a time), and the
  // panel takes the focus as it goes full, so its own listener hears it first.
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
