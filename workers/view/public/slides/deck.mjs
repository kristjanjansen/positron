// The slide deck engine shared by /slides/ and /talk/ (plans/plan-slides.md).
// One deck a page: the word hues are module state set by createDeck.
// See lessons/page-slides.md#slides-12

import { el, createReport } from '/shell/shell.mjs';
import { createVideoPanel } from '/shell/video-panel.mjs';
import { createStepper } from '/shell/stepper.mjs';
import { createDiagram, TECH_HUE } from '/shell/diagram.mjs';
import { createStepGrid } from '/shell/step-grid.mjs';
import { burn, videoHue, FRAME_W, FRAME_H } from '/shell/pattern.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const frame = () => new Promise((r) => requestAnimationFrame(() => r()));

// ── the face ────────────────────────────────────────────────────────────────
// One face, JetBrains Mono; `?face=` is ignored. `FACES` stays a list so the
// measuring pass below reads the same with one entry.
// See lessons/page-slides.md#slides-13
export const FACES = [
  { id: 'jetbrains', name: 'JetBrains',   family: 'SL JetBrains Mono' },
];
const faceStack = (f) => `'${f.family}', var(--mono)`;

// ── the marks in a slide string ─────────────────────────────────────────────
// `*x*` paints x in `--hi`; `[x|box]` paints x in the hue of the diagram's box.
// Only top level boxes lend a hue: the diagram colours no inner box's bold name.
// See lessons/page-slides.md#slides-14

/** A box's name, lower-cased, to the hue the diagram paints it in. */
let NAME_HUE = new Map();
function huesFrom(spec) {
  const m = new Map();
  (function walk(list) {
    for (const n of list || []) {
      // A `here` box paints no hue (diagram.mjs, HUELESS_KINDS), so it lends none.
      if (n.tech && n.kind !== 'here' && TECH_HUE[n.tech] != null) m.set(n.label.toLowerCase(), TECH_HUE[n.tech]);
      walk(n.children);
    }
  })(spec?.nodes);
  return m;
}

/** The text with the marks out. */
export const plain = (t) => String(t ?? '').replace(/\*/g, '').replace(/\[([^|\]]+)\|[^\]]+\]/g, '$1');
/** A fragment of `t` with each `*x*` as a `--hi` span and each `[x|box]` in
 *  the hue of the diagram box called `box`. A name with no box throws, so a
 *  typo cannot quietly print a plain word. */
export function rich(t) {
  const f = document.createDocumentFragment();
  String(t ?? '').split(/(\*[^*]+\*|\[[^|\]]+\|[^\]]+\])/).forEach((part) => {
    if (!part) return;
    let m;
    if (/^\*[^*]+\*$/.test(part)) f.append(el('span', 'sl-hi', part.slice(1, -1)));
    else if ((m = part.match(/^\[([^|\]]+)\|([^\]]+)\]$/))) {
      const hue = NAME_HUE.get(m[2].toLowerCase());
      if (hue == null) throw new Error(`no box called ${m[2]} lends a hue`);
      const sp = el('span', 'sl-hue', m[1]);
      sp.dataset.box = m[2].toLowerCase();
      sp.style.setProperty('--sl-hue', String(hue));
      f.append(sp);
    } else f.append(document.createTextNode(part));
  });
  return f;
}
/** Evidence is at step 3, or step 2 at four rows or more, because four rows at
 *  step 3 do not fit under a two line headline (plans/plan-slides.md 3). */
export const evStep = (rows) => (rows > 3 ? 2 : 3);

/** Pad `rows` into lines of text whose columns are character positions. */
function padRows({ head, body, align }) {
  const all = head ? [head, ...body] : body;
  const n = Math.max(...all.map((r) => r.length));
  const w = Array.from({ length: n }, (_, c) => Math.max(...all.map((r) => plain(r[c]).length)));
  const gap = '  ';
  // Padded on the visible length, so an accent mark takes no column.
  const line = (r) => w.map((cw, c) => {
    const t = String(r[c] ?? ''), fill = ' '.repeat(cw - plain(t).length);
    return align[c] === 'r' ? fill + t : t + fill;
  }).join(gap).replace(/\s+$/, '');
  const starts = []; let x = 0;
  for (const cw of w) { starts.push(x); x += cw + gap.length; }
  return { lines: all.map(line), starts, widths: w, head: !!head };
}

/**
 * A stack of figures. `rows` is [label, value, unit]; a live stack sets a value
 * later through `set(i, t)`.
 * See lessons/page-slides.md#slides-15
 */
export function stackOf(rows) {
  const g = el('div', `sl-stack sl-t sl-t${evStep(rows.length)}`);
  const nums = [];
  for (const [label, value, unit] of rows) {
    const n = el('span', 'sl-num');
    n.append(rich(value));
    nums.push(n);
    g.append(el('span', 'sl-dim', label), n, el('span', 'sl-unit', unit || ''));
  }
  return { el: g, nums, set: (i, t) => { nums[i].textContent = t; } };
}

// ── live elements ───────────────────────────────────────────────────────────
// `live(host)` runs on first showing (a hidden box measures 0), opens nothing, and
// returns { start, stop, value, subject }, plus `windowMs` and `fit` when needed.
// See lessons/page-slides.md#slides-16

/** A component laid out at `w` logical px and scaled into `host`. */
export function fitBox(host, w) {
  const outer = el('div', 'sl-fit');
  const inner = el('div', 'sl-fit-in');
  inner.style.setProperty('--fit-w', `${w}px`);
  outer.append(inner);
  host.append(outer);
  const fit = () => {
    const ow = outer.clientWidth, oh = outer.clientHeight;
    const ih = inner.offsetHeight || 1;
    if (!ow || !oh) return;
    const k = Math.min(ow / w, oh / ih);
    inner.style.setProperty('--fit-k', String(k));
    inner.style.setProperty('--fit-x', `${(ow - w * k) / 2}px`);
    inner.style.setProperty('--fit-y', `${(oh - ih * k) / 2}px`);
  };
  const ro = new ResizeObserver(fit);
  ro.observe(outer); ro.observe(inner);
  return { outer, inner, fit };
}

/** The kit's own readout, measuring this screen. */
export function liveReadout(host) {
  const { inner, fit } = fitBox(host, 360);
  const r = createReport({ readout: { fps: '', frames: '' }, showLog: false, joined: false });
  inner.append(r.readoutEl);
  // `frames` too, since `fps` reads 60.0 for a whole second on a refresh-locked screen.
  // See lessons/page-slides.md#slides-17
  let raf = 0, last = 0, times = [], shown = 0, count = 0;
  const tick = (t) => {
    count++;
    if (last) times.push(t - last);
    if (times.length > 60) times.shift();
    last = t;
    if (t - shown > 250 && times.length > 4) {
      const mean = times.reduce((a, b) => a + b, 0) / times.length;
      r.set('fps', (1000 / mean).toFixed(1));
      r.set('frames', count);
      shown = t;
    }
    raf = requestAnimationFrame(tick);
  };
  return {
    start() { last = 0; times = []; shown = 0; raf = requestAnimationFrame(tick); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
    value: () => r.readoutEl.textContent,
    subject: () => r.readoutEl,
    fit,
  };
}

/** The site's test picture, `pattern.mjs`, burning its clock row live. */
export function livePicture(host) {
  const c = el('canvas');
  c.width = FRAME_W; c.height = FRAME_H;
  host.append(c);
  const ctx = c.getContext('2d');
  let raf = 0, n = 0;
  const tick = () => {
    burn(ctx, FRAME_W, FRAME_H, n++, { hue: videoHue(1) });
    raf = requestAnimationFrame(tick);
  };
  return {
    start() { tick(); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
    value: () => n,
    subject: () => c,
  };
}

/**
 * A diagram by diagram.mjs, a lit box walking through it. Box names only: `sub`
 * and link labels are stripped, and each top level `desc` is slide text set one
 * line under its box, with that row reserved before the picture is fitted.
 * See lessons/page-slides.md#slides-18
 */
export function liveDiagram(spec, { w = 760 } = {}) {
  const tops = spec.nodes;
  const clean = {
    ...spec,
    nodes: tops.map(function strip(n) {
      const { desc, sub, ...rest } = n;
      return rest.children ? { ...rest, children: rest.children.map(strip) } : rest;
    }),
    links: (spec.links || []).map(({ label, ...rest }) => rest),
  };
  const build = (host) => {
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
    /** The top level boxes' groups, in spec order, matched by name (a name
     *  that wraps is two text runs, so spaces are not compared). */
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
      const cs = getComputedStyle(row);
      const lh = parseFloat(cs.lineHeight);
      const any = descs.some(Boolean);
      const gap = any ? lh / 2 : 0;
      const resv = any ? gap + 2 * lh : 0;
      const k = Math.min(ow / w, Math.max(1, oh - resv) / ih);
      const x = (ow - w * k) / 2, y = (oh - ih * k - resv) / 2;
      inner.style.setProperty('--fit-k', String(k));
      inner.style.setProperty('--fit-x', `${x}px`);
      inner.style.setProperty('--fit-y', `${y}px`);
      if (!any) return;
      const ob = outer.getBoundingClientRect();
      const rects = boxes().map((g) => g?.querySelector('.pos-dg-box').getBoundingClientRect() || null);
      // A line may be as wide as its column: up to half way to the next box's
      // centre on either side, less half a line of air, and never past the
      // region's edge. A box is narrower than the words that say what it is.
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
    requestAnimationFrame(fit);
    let timer = 0, at = -1;
    const step = () => {
      const lit = [...dg.svg.querySelectorAll('.pos-dg-n')].filter((g) => !g.querySelector('.pos-dg-cbox'));
      lit.forEach((g) => { delete g.dataset.on; });
      if (!lit.length) return;
      at = (at + 1) % lit.length;
      lit[at].dataset.on = '1';
    };
    return {
      start() { step(); timer = setInterval(step, 700); },
      stop() { clearInterval(timer); timer = 0; },
      value: () => at,
      subject: () => dg.svg,
      windowMs: 760,
      dg, fit, descs, boxes, row,
    };
  };
  build.diagram = true;
  build.spec = spec;
  return build;
}

/**
 * A kit step grid at a made-up tempo, and how many ms after its time each step
 * appears. The grid's clock is a frame clock, so a step lands on the next frame.
 * See lessons/page-slides.md#slides-19
 */
export function liveSteps(host) {
  const { inner, fit } = fitBox(host, 480);
  const strip = el('div');
  inner.append(strip);
  const grid = createStepGrid({
    strip, rows: 2, steps: 16,
    readOnly: true,
    rate: { bpm: 120, whose: 'this slide, which made it up' },
  });
  for (const [r, s] of [[0, 0], [0, 4], [0, 8], [0, 12], [1, 2], [1, 6], [1, 10], [1, 14]]) grid.set(r, s, true, 'quiet');
  const st = stackOf([['late', '0.00', 'ms'], ['worst', '0.00', 'ms']]);
  host.append(st.el);
  const ms = grid.clock.stepMs();
  let t0 = 0, steps = 0, worst = 0;
  grid.clock.onStep(() => {
    const late = (performance.now() - t0) % ms;
    steps++;
    if (steps > 1 && late > worst) worst = late;
    st.set(0, late.toFixed(2).padStart(5));
    st.set(1, worst.toFixed(2).padStart(5));
  });
  return {
    start() { steps = 0; worst = 0; t0 = performance.now(); grid.clock.play(); },
    stop() { grid.clock.stop(); },
    value: () => steps,
    subject: () => st.el,
    stack: st.el,
    fit,
  };
}

// ── the deck ────────────────────────────────────────────────────────────────
// A slide: name, say, statement, big, list, rows, stack, live, cap, link, notes
// (the page's talk comment spells them out). Every number cites its source above.
// See lessons/page-slides.md#slides-20

/**
 * @param d          the page's `mount()` result
 * @param o.slides   the talk
 * @param o.hues     the diagram spec whose boxes lend their hue to `[x|box]`
 */
export function createDeck(d, { slides, hues = null }) {
  NAME_HUE = huesFrom(hues);
  const SLIDES = slides;

  const nodes = SLIDES.map((s, i) => {
    const node = el('section', 'sl-slide', null, { 'aria-label': `slide ${i + 1}`, 'aria-roledescription': 'slide' });
    node.hidden = true;
    const box = el('div', 'sl-in');
    node.append(box);
    const say = el('h2', s.statement ? 'sl-t sl-t5 sl-say sl-st' : 'sl-t sl-t4 sl-say');
    say.append(rich(s.say));
    const ev = el('div', s.live?.diagram ? 'sl-ev sl-ev-dg' : 'sl-ev');
    if (s.statement) ev.append(say); else box.append(say);
    let table = null, stack = null;
    if (s.list) {
      const ul = el('ul', `sl-list sl-t sl-t${evStep(s.list.length)} sl-dim`);
      for (const t of s.list) { const li = el('li'); li.append(rich(t)); ul.append(li); }
      ev.append(ul);
    }
    if (s.big) { const p = el('p', 'sl-t sl-t6 sl-big'); p.append(rich(s.big)); ev.append(p); }
    if (s.rows) {
      const p = padRows(s.rows);
      table = el('div', `sl-rows sl-t sl-t${evStep(p.lines.length)}`);
      p.lines.forEach((t, r) => {
        const row = el('div', r === 0 && p.head ? 'sl-dim' : '');
        row.append(rich(t));
        table.append(row);
      });
      table.layout = p;
      table.align = s.rows.align;
      ev.append(table);
    }
    if (s.stack) {
      stack = stackOf(s.stack).el;
      ev.append(stack);
    }
    box.append(ev);
    let cap = null, url = null;
    if (s.cap) {
      cap = el('p', 'sl-t sl-t1 sl-cap');
      cap.append(rich(s.cap));
      if (s.link !== undefined) {
        url = `https://positron.studio/${s.link}${s.link && !s.link.includes('#') ? '/' : ''}`;
        cap.append(el('br'), el('a', '', url, { href: url }));
      }
      box.append(cap);
    }
    return { spec: s, node, box, ev, say, cap, url, table, stack, ctl: null };
  });

  const stepper = createStepper({ prev: () => go(at - 1), next: () => go(at + 1), what: 'slide' });
  const count = el('span', 'sl-count', '');
  const panel = createVideoPanel({
    left: stepper,
    centre: count,
    fullMode: 'hover',
    onFull: (full) => d.log(full ? 'presenting, full screen' : 'back in the page'),
  });
  panel.el.classList.add('sl-panel');
  for (const n of nodes) panel.stage.append(n.node);

  // Speaker notes: under the panel, in the deck, shown only with `?notes=1`.
  const notesEl = el('div', 'sl-notes', null, { 'aria-live': 'polite' });
  let notesOn = new URLSearchParams(location.search).get('notes') === '1';
  notesEl.hidden = !notesOn;
  const wrap = el('div', 'sl-deck');
  wrap.append(panel.el, notesEl);
  d.stack.add(wrap);
  const showNotes = (on) => {
    notesOn = !!on;
    notesEl.hidden = !notesOn;
    fillNotes();
    return notesOn;
  };
  function fillNotes() {
    notesEl.textContent = '';
    const t = nodes[at]?.spec.notes;
    if (!notesOn || !t) return;
    const p = el('p');
    p.append(rich(t));
    notesEl.append(p);
  }

  // One face, so no picker and no `?face=` in the address.
  // See lessons/page-slides.md#slides-21
  let face = FACES[0];
  function setFace(f) {
    face = f;
    wrap.style.setProperty('--sl-face', faceStack(f));
    return document.fonts.load(`600 20px '${f.family}'`);
  }
  setFace(face);

  let at = -1;
  function go(i) {
    const next = Math.max(0, Math.min(SLIDES.length - 1, i));
    if (next === at) return at;
    const was = nodes[at];
    if (was) { was.node.hidden = true; was.ctl?.stop(); }
    at = next;
    const n = nodes[at];
    n.node.hidden = false;
    if (n.spec.live && !n.ctl) n.ctl = n.spec.live(n.ev);
    n.ctl?.start();
    count.textContent = `${at + 1} / ${SLIDES.length}`;
    stepper.buttons[0].disabled = at === 0;
    stepper.buttons[stepper.buttons.length - 1].disabled = at === SLIDES.length - 1;
    history.replaceState(null, '', `#${at + 1}`);
    fillNotes();
    return at;
  }

  const blank = (on) => {
    const s = panel.stage;
    const want = on ?? !s.hasAttribute('data-blank');
    if (want) s.dataset.blank = '1'; else delete s.dataset.blank;
    return want;
  };

  // Keys: a clicker sends PageUp, PageDown, F5, Escape and a full stop. Escape leaves
  // the fallback cover too, and on a desktop Escape, `f` and F5 are the way out.
  // See lessons/page-slides.md#slides-22
  const NEXT = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ' ']);
  const PREV = new Set(['ArrowLeft', 'ArrowUp', 'PageUp']);
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (t && /^(BUTTON|A)$/.test(t.tagName) && (e.key === ' ' || e.key === 'Enter')) return;
    let did = true;
    if (NEXT.has(e.key)) go(at + 1);
    else if (PREV.has(e.key)) go(at - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(SLIDES.length - 1);
    else if (e.key === '.' || e.key === 'b' || e.key === 'B') blank();
    else if (e.key === 'f' || e.key === 'F' || e.key === 'F5') panel.full(!panel.isFull());
    else if (e.key === 'Escape' && panel.isFull()) panel.full(false);
    else did = false;
    if (did) e.preventDefault();
  });

  const fromHash = () => Number((location.hash.match(/^#(\d+)$/) || [])[1]) || 1;
  go(fromHash() - 1);
  // A typed or linked `#7` lands on slide 7 without a reload.
  addEventListener('hashchange', () => go(fromHash() - 1));

  const deck = {
    d, SLIDES, nodes, panel, stepper, count, wrap, notesEl,
    go, blank, setFace, showNotes,
    at: () => at, face: () => face, notesOn: () => notesOn,
  };
  window.__demo.slides = {
    count: SLIDES.length, index: () => at, go, blank, names: SLIDES.map((s) => s.name), notes: showNotes,
  };
  return deck;
}

// ── the checks ──────────────────────────────────────────────────────────────
// A colour as the screen gets it. `color-mix` computes to `oklab(...)`, which
// is not three numbers out of 255, so every colour goes through a canvas pixel.
const toRGB = (() => {
  let cx = null;
  return (c) => {
    cx ||= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1);
    const [r, g, b] = cx.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
  };
})();
const lum = (c) => {
  const m = toRGB(c).match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const px = (node, prop = 'font-size') => parseFloat(getComputedStyle(node).getPropertyValue(prop));
const key = (k) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

/** The x of one character's left or right edge, from the text itself, counted
 *  across every text node, so an accent span is walked through. */
const charX = (elm, i, side = 'left') => {
  if (i < 0) return NaN;
  const w = document.createTreeWalker(elm, NodeFilter.SHOW_TEXT);
  for (let t = w.nextNode(); t; t = w.nextNode()) {
    if (i < t.length) {
      const r = document.createRange();
      r.setStart(t, i); r.setEnd(t, i + 1);
      return r.getBoundingClientRect()[side];
    }
    i -= t.length;
  }
  return NaN;
};
const spread = (xs) => Math.max(...xs) - Math.min(...xs);

/** Every column of a padded table, measured from the glyphs. A left column is
 *  its first character's left edge, a right column its last character's right
 *  edge, and a figure with a decimal point is that point's left edge. */
function tableSpread(n) {
  const rows = [...n.table.children];
  const { starts, widths, head } = n.table.layout;
  let worst = 0, what = '';
  starts.forEach((s, c) => {
    const right = n.table.align[c] === 'r';
    const xs = [], dots = [];
    rows.forEach((row, r) => {
      const txt = row.textContent;
      const cell = txt.slice(s, s + widths[c]);
      if (!cell.trim()) return;
      const i = right ? s + widths[c] - 1 : s + cell.search(/\S/);
      xs.push(charX(row, right ? i : s, right ? 'right' : 'left'));
      const dot = cell.indexOf('.');
      if (!(head && r === 0) && dot >= 0) dots.push(charX(row, s + dot));
    });
    for (const [list, kind] of [[xs, right ? 'right edge' : 'left edge'], [dots, 'decimal point']]) {
      if (list.length < 2) continue;
      const sp = spread(list);
      if (!(sp <= worst)) { worst = sp; what = `column ${c + 1} ${kind}`; }
    }
  });
  return { worst, what };
}

/** The decimal points of a stack of figures, from the glyphs. */
function stackSpread(stackEl) {
  const xs = [...stackEl.querySelectorAll('.sl-num')].map((nEl) => charX(nEl, nEl.textContent.indexOf('.')));
  return { worst: spread(xs), n: xs.length, nan: xs.some((x) => Number.isNaN(x)) };
}

/**
 * The self-check every deck gets. A page passes what is particular to it.
 *
 * @param o.range    [min, max] slides
 * @param o.kitLive  names of slides that must carry a live part of the kit
 * @param o.minLive  how many live slides at least
 * @param o.hueSlide the slide whose diagram the hued words are compared with
 * @param o.minHued  how many slides at least carry a hue (default 3)
 */
export async function checkDeck(deck, { range = [12, 16], kitLive = [], minLive = 4, hueSlide = 'machines', minHued = 3 } = {}) {
  const { d, SLIDES, nodes, panel, stepper, count, wrap } = deck;
  const A = d.assert;
  const go = deck.go, at = () => deck.at();
  const t0 = performance.now();
  // The face in before counting requests; it loads from `/shell/vendor/`.
  // See lessons/page-slides.md#slides-23
  const loaded = await Promise.all(FACES.map((f) => Promise.all([
    document.fonts.load(`600 20px '${f.family}'`), document.fonts.load(`400 20px '${f.family}'`)])));
  const missing = FACES.filter((f, i) => !loaded[i].every((l) => l.length)
    || !document.fonts.check(`600 20px '${f.family}'`));
  A(`the deck's face loads at 400 and 600 from the site's own vendor folder`,
    missing.length === 0, missing.map((f) => f.family).join(', ') || FACES.map((f) => f.id).join(' '));
  const resBefore = performance.getEntriesByType('resource')
    .filter((r) => new URL(r.name).pathname !== '/_log').length;

  const famNow = getComputedStyle(nodes[0].node.querySelector('.sl-say')).fontFamily;
  A('the talk is set in JetBrains Mono, whatever the address says',
    FACES.length === 1 && FACES[0].id === 'jetbrains' && famNow.includes('JetBrains Mono'),
    famNow);

  const [lo, hi] = range;
  A(`the talk is ${lo} to ${hi} slides and the panel holds every one`,
    SLIDES.length >= lo && SLIDES.length <= hi && panel.stage.querySelectorAll('.sl-slide').length === SLIDES.length,
    `${SLIDES.length} declared, ${panel.stage.querySelectorAll('.sl-slide').length} drawn`);

  // The wording rules, read off the deck itself. A dot inside a name
  // (`hls.js`) is not a full stop; one at the end is.
  const badSay = SLIDES.filter((s) => /[:;\u2014\u2013\u00b7]|\s-\s|\.$|\.\s/.test(s.say));
  const badAny = SLIDES.filter((s) => /[\u2014\u00b7]/.test([s.say, s.cap, s.notes, ...(s.list || [])].join(' ')));
  A('no headline carries a colon, semicolon, dash, middot or full stop, and nothing carries an em dash or middot',
    badSay.length === 0 && badAny.length === 0, [...badSay, ...badAny].map((s) => s.name).join(', ') || `${SLIDES.length} clean`);

  go(0);
  const [prevB] = stepper.buttons, nextB = stepper.buttons[stepper.buttons.length - 1];
  nextB.click();
  const a1 = at();
  prevB.click();
  const a0 = at();
  prevB.click();
  A('next moves forward one and previous moves back one', a1 === 1 && a0 === 0, `${a1}, ${a0}`);
  A('previous on the first slide stays there and is switched off',
    at() === 0 && prevB.disabled, `at ${at()}, disabled ${prevB.disabled}`);
  go(SLIDES.length - 1);
  nextB.click();
  A('next on the last slide stays there and is switched off',
    at() === SLIDES.length - 1 && nextB.disabled, `at ${at()}, disabled ${nextB.disabled}`);
  A('the footer counts the slide it is on', count.textContent === `${SLIDES.length} / ${SLIDES.length}`, count.textContent);

  go(0);
  const seen = [];
  for (const k of ['ArrowRight', 'PageDown', ' ', 'ArrowLeft', 'PageUp', 'End', 'Home', 'ArrowDown', 'ArrowUp']) {
    key(k); seen.push(at());
  }
  const last = SLIDES.length - 1;
  A('arrows, PageUp and PageDown, space, Home and End all move the deck',
    seen.join() === `1,2,3,2,1,${last},0,1,0`, seen.join());
  go(2);
  A('the address carries the slide, so a reload lands on it', location.hash === '#3', location.hash);

  // Every live element is built once, by showing its slide, so the measuring
  // pass below has every box to measure.
  for (let i = 0; i < SLIDES.length; i++) go(i);

  // The scale, read off the two numbers it is declared from, and each step as
  // a share of the slide's own height.
  const pcs = getComputedStyle(wrap);
  const base = parseFloat(pcs.getPropertyValue('--sl-base')), rr = parseFloat(pcs.getPropertyValue('--sl-ratio'));
  const STEPS = [1, 2, 3, 4, 5, 6].map((k) => base * rr ** (k - 1) / 100);
  const LS = [1, 2, 3, 4, 5, 6].map((k) => parseFloat(pcs.getPropertyValue(`--sl-${k}-ls`)) || 0);
  const LH = [1, 2, 3, 4, 5, 6].map((k) => parseFloat(pcs.getPropertyValue(`--sl-${k}-lh`)));
  const stepOf = (size, h) => STEPS.findIndex((f) => Math.abs(size - f * h) < 0.5) + 1;
  const hl = nodes.findIndex((n) => !n.spec.statement && n.spec.big);
  go(hl); await frame();
  const s0 = nodes[hl].node, h0 = s0.getBoundingClientRect().height;
  const L = px(nodes[hl].say);
  A('the headline renders at step 4, 13.5 per cent of the slide height, 1.5 times the old 9',
    stepOf(L, h0) === 4 && Math.abs(L - STEPS[3] * h0) < 0.5,
    `${L.toFixed(2)} px in a ${h0.toFixed(1)} px slide at ${innerWidth} px wide, base ${base}, ratio ${rr}`);
  const XL = px(s0.querySelector('.sl-big'));
  A('one number renders at step 6, the top of the scale',
    stepOf(XL, h0) === 6, `${XL.toFixed(2)} px, ${(XL / h0 * 100).toFixed(2)} per cent`);
  const vp = panel.stage.getBoundingClientRect();
  A('in the page the slide is the panel picture, 16:9 and edge to edge',
    Math.abs(h0 - vp.height) < 1 && Math.abs(s0.getBoundingClientRect().width - vp.width) < 1,
    `slide ${s0.getBoundingClientRect().width.toFixed(1)} x ${h0.toFixed(1)}, stage ${vp.width.toFixed(1)} x ${vp.height.toFixed(1)}`);

  // ── the measuring pass: every slide, every face, two widths ──
  // All slides lay out at once, unseen, one synchronous layout per face and width.
  // A fitted picture is re-fitted by hand: its ResizeObserver does not run here.
  // See lessons/page-slides.md#slides-24
  const was = deck.face(), wasAt = at();
  const tm = performance.now();
  const meas = document.createElement('canvas').getContext('2d');
  const widths = [['sl-w686', 'a 1280 page'], ['sl-narrow', 'a 375 page']];
  const R = Object.fromEntries(widths.map(([, w]) => [w, {
    lines: [], longSay: [], spill: [], capOff: [], capFace: [], off: [], cols: [], dots: [], budgets: [],
    sizes: new Map(), offStep: [], track: [], dgGap: [], dgd: [], dgdN: 0,
  }]));
  panel.stage.classList.add('sl-measure');
  for (const [cls, w] of widths) {
    wrap.classList.add(cls);
    await frame(); await frame();   // the fitted pictures re-fit on resize
    const r = R[w];
    r.panel = Math.round(panel.el.getBoundingClientRect().width);
    for (const f of FACES) {
      setFaceQuiet(deck, f);
      const lines = [];
      for (let i = 0; i < SLIDES.length; i++) {
        const n = nodes[i], say = n.node.querySelector('.sl-say');
        n.ctl?.fit?.();
        const h = n.node.getBoundingClientRect().height;
        const nl = Math.round(say.getBoundingClientRect().height / px(say, 'line-height'));
        lines.push(nl);
        if (nl > (n.spec.statement ? 3 : 2)) r.longSay.push(`${f.id} ${n.spec.name} ${nl}`);
        // Every size on a slide, outside the scaled part of a kit component,
        // is a step, and its tracking is that step's.
        if (f === FACES[0]) {
          for (const t of n.node.querySelectorAll('.sl-in *')) {
            // Only an element that holds text of its own sets a size anybody reads.
            if (t.closest('.sl-fit-in') || ![...t.childNodes].some((c) => c.nodeType === 3 && c.data.trim())) continue;
            const size = px(t), k = stepOf(size, h);
            r.sizes.set(k, (r.sizes.get(k) || 0) + 1);
            if (!k) { r.offStep.push(`${n.spec.name} ${t.tagName.toLowerCase()} ${(size / h * 100).toFixed(2)}`); continue; }
            const ls = parseFloat(getComputedStyle(t).letterSpacing) || 0;
            if (Math.abs(ls - LS[k - 1] * size) > 0.05) r.track.push(`${n.spec.name} step ${k} ${ls.toFixed(2)} against ${(LS[k - 1] * size).toFixed(2)}`);
          }
          const want = n.spec.statement ? 5 : 4;
          if (stepOf(px(say), h) !== want) r.offStep.push(`${n.spec.name} headline not step ${want}`);
        }
        const b0 = n.box.getBoundingClientRect(), cs = getComputedStyle(n.box);
        const inL = b0.left + parseFloat(cs.paddingLeft), inR = b0.right - parseFloat(cs.paddingRight);
        const inB = b0.bottom - parseFloat(cs.paddingBottom), inT = b0.top + parseFloat(cs.paddingTop);
        for (const c of n.node.querySelectorAll('.sl-say, .sl-ev > *, .sl-cap, .sl-rows > div, .sl-stack > *, .sl-dgd > span')) {
          const b = c.getBoundingClientRect();
          if (b.bottom > inB + 1 || b.top < inT - 1 || b.left < inL - 1 || b.right > inR + 1
            || c.scrollWidth > c.clientWidth + 1) r.spill.push(`${f.id} ${n.spec.name}`);
        }
        // The caption: step 1, the chosen face, its left and bottom edges on the inset.
        if (n.cap) {
          const b = n.cap.getBoundingClientRect();
          const size = px(n.cap);
          if (Math.abs(b.left - inL) > 2 || Math.abs(b.bottom - inB) > 2 || stepOf(size, h) !== 1) {
            r.capOff.push(`${f.id} ${n.spec.name} left ${(b.left - inL).toFixed(1)} bottom ${(b.bottom - inB).toFixed(1)} size ${size.toFixed(2)}`);
          }
          if (!getComputedStyle(n.cap).fontFamily.includes(f.family)) r.capFace.push(`${f.id} ${n.spec.name}`);
        }
        // A diagram: the air above it, and what each top level box is, set
        // under its column, centred on the box, in the face at step 1.
        if (n.ctl?.dg) {
          const want = STEPS[1] * h * LH[1];
          const gapPx = n.ctl.dg.svg.getBoundingClientRect().top - say.getBoundingClientRect().bottom;
          r.dgGap.push([`${f.id} ${n.spec.name}`, gapPx, want]);
          const bs = n.ctl.boxes();
          n.ctl.descs.forEach((sp, j) => {
            if (!sp) return;
            r.dgdN++;
            const g = bs[j];
            const bb = g?.querySelector('.pos-dg-box')?.getBoundingClientRect();
            const sb = sp.getBoundingClientRect();
            const off = bb ? Math.abs((sb.left + sb.right) / 2 - (bb.left + bb.right) / 2) : NaN;
            const lines2 = Math.round(sb.height / px(sp, 'line-height'));
            if (!(off <= 2) || stepOf(px(sp), h) !== 1 || !getComputedStyle(sp).fontFamily.includes(f.family)
              || lines2 > 2 || sb.top < (bb?.bottom ?? Infinity)) {
              r.dgd.push(`${f.id} ${n.spec.name} ${sp.dataset.box} off ${Number.isNaN(off) ? 'no box' : off.toFixed(1)} lines ${lines2}`);
            }
          });
        }
        // What is under a headline sits in the middle of the inset.
        const sub = n.ctl?.subject?.() || n.ev.querySelector('.sl-list, .sl-big, .sl-rows, .sl-stack');
        if (n.spec.statement) { /* the sentence is the slide, nothing under it */ } else if (sub) {
          const b = sub.getBoundingClientRect();
          r.off.push([n.spec.name, Math.abs((b.left + b.right) / 2 - (inL + inR) / 2)]);
        } else r.off.push([n.spec.name, NaN]);
        // The character columns and the decimal points, from the glyphs.
        if (n.table) {
          const t = tableSpread(n);
          r.cols.push([`${f.id} ${n.spec.name} ${t.what}`, t.worst]);
        }
        const st = n.stack || n.ctl?.stack;
        if (st) {
          const s = stackSpread(st);
          r.dots.push([`${f.id} ${n.spec.name}`, s.nan ? NaN : s.worst, s.n]);
        }
        if (i === 0) {
          // Characters a line holds at a step: the inset over one advance plus
          // that step's tracking.
          const adv = (k) => {
            const size = STEPS[k - 1] * h;
            meas.font = `600 ${size}px '${f.family}'`;
            return meas.measureText('0').width + LS[k - 1] * size;
          };
          r.budgets.push(`${f.id} ${[4, 5, 3].map((k) => Math.floor((inR - inL) / adv(k))).join('/')}`);
        }
      }
      r.lines.push(`${f.id} ${lines.join('')}`);
    }
    wrap.classList.remove(cls);
  }
  panel.stage.classList.remove('sl-measure');
  await deck.setFace(was, true);
  go(wasAt);
  await frame();
  d.log(`measuring pass ${(performance.now() - tm).toFixed(0)} ms; characters a line holds at steps 4/5/3, ${widths[0][1]}: ${R[widths[0][1]].budgets.join(', ')}`);

  const anyDiagram = nodes.some((n) => n.ctl?.dg);
  for (const [, w] of widths) {
    const r = R[w], tag = `in ${r.panel} px, the panel in ${w}`;
    A(`every headline is two lines or fewer and every statement three or fewer, in all ${FACES.length} faces, ${tag}`,
      r.longSay.length === 0, r.longSay.join(', ') || r.lines.join(', '));
    A(`every size on every slide is one of the six steps of the scale, ${tag}`,
      r.offStep.length === 0 && r.sizes.size > 0,
      r.offStep.slice(0, 6).join(', ')
        || [...r.sizes].sort((p, q) => p[0] - q[0]).map(([k, c]) => `step ${k} x${c}`).join(', '));
    A(`every step's text is tracked at that step's declared letter spacing, ${tag}`,
      r.track.length === 0,
      r.track.slice(0, 4).join(', ') || LS.map((v, k) => `step ${k + 1} ${v}em`).join(', '));
    A(`nothing on any slide runs past its inset in any face, ${tag}`, r.spill.length === 0,
      [...new Set(r.spill)].join(', ') || 'all inside');
    A(`every caption is SMALL, in the chosen face, its left and bottom edges on the inset within 2 px, ${tag}`,
      r.capOff.length === 0 && r.capFace.length === 0,
      [...r.capOff, ...r.capFace.map((x) => `${x} wrong face`)].slice(0, 6).join(', ')
        || `${nodes.filter((n) => n.cap).length} captions in ${FACES.length} faces`);
    const offBad = r.off.filter(([, o]) => !(o <= 2));
    A(`everything under a headline is centred in the slide within 2 px, ${tag}`, offBad.length === 0,
      offBad.length ? offBad.slice(0, 6).map(([nm, o]) => `${nm} ${Number.isNaN(o) ? 'none' : o.toFixed(1)}`).join(', ')
        : `worst ${Math.max(...r.off.map(([, o]) => o)).toFixed(2)} px over ${r.off.length}`);
    const colBad = r.cols.filter(([, s]) => !(s <= 0.5));
    A(`every character column in every table lines up within 0.5 px in all ${FACES.length} faces, ${tag}`,
      r.cols.length >= FACES.length * 3 && colBad.length === 0,
      colBad.length ? colBad.slice(0, 4).map(([k, s]) => `${k} ${s.toFixed(2)}`).join(', ')
        : `${r.cols.length} tables, worst ${Math.max(...r.cols.map(([, s]) => s)).toFixed(2)} px`);
    const dotBad = r.dots.filter(([, s]) => !(s <= 0.5));
    A(`every stack of figures has its decimal points within 0.5 px in all ${FACES.length} faces, the live one included, ${tag}`,
      r.dots.length >= FACES.length * 3 && dotBad.length === 0,
      dotBad.length ? dotBad.slice(0, 4).map(([k, s]) => `${k} ${Number.isNaN(s) ? 'unread' : s.toFixed(2)}`).join(', ')
        : `${r.dots.length} stacks, worst ${Math.max(...r.dots.map(([, s]) => s)).toFixed(2)} px`);
    if (anyDiagram) {
      const gapBad = r.dgGap.filter(([, g, want]) => !(g >= want - 0.5));
      A(`every diagram has at least one step 2 line of air under the headline, in all ${FACES.length} faces, ${tag}`,
        r.dgGap.length > 0 && gapBad.length === 0,
        (gapBad.length ? gapBad : r.dgGap).slice(0, 3).map(([k, g, want]) => `${k} ${g.toFixed(1)} px against ${want.toFixed(1)}`).join(', '));
      A(`what each diagram box is sits under its column, centred on the box within 2 px, in the face at step 1, two lines at most, ${tag}`,
        r.dgdN > 0 && r.dgd.length === 0,
        r.dgd.slice(0, 4).join(', ') || `${r.dgdN} lines over ${FACES.length} faces`);
    }
  }
  const left = nodes.every((n) => getComputedStyle(n.node.querySelector('.sl-say')).textAlign !== 'center');
  A('and the headline itself stays left aligned', left);
  if (anyDiagram) {
    const native = panel.stage.querySelectorAll('.pos-dg-sub, .pos-dg-llab').length;
    const capShown = [...panel.stage.querySelectorAll('.pos-dg-cap')].filter((c) => getComputedStyle(c).display !== 'none').length;
    A('no diagram on a slide draws its own small text, no box sub, no line label and no caption line',
      native === 0 && capShown === 0, `${native} sub or label, ${capShown} caption lines shown`);
  }

  // Every face really is monospaced: `i` and `m` take one advance each.
  const notMono = FACES.filter((f) => {
    meas.font = `600 100px '${f.family}'`;
    return Math.abs(meas.measureText('i').width - meas.measureText('m').width) > 0.01;
  });
  A('every face on the switcher is monospaced, i as wide as m',
    notMono.length === 0, notMono.map((f) => f.id).join(', ') || `${FACES.length} of ${FACES.length}`);

  go(0); await frame();
  const ink = getComputedStyle(nodes[hl].say).color;
  const ground = getComputedStyle(panel.stage).backgroundColor;
  const cr = ratio(ink, ground);
  A('the headline is at least 7:1 against the slide ground', cr >= 7, `${cr.toFixed(1)}:1`);

  // The accent and the hues, counted per slide. Neither is on every slide,
  // and neither is on most of one.
  const counted = nodes.map((n) => [n.spec.name, n.node.querySelectorAll('.sl-hi').length,
    n.node.querySelectorAll('.sl-hue').length]).filter(([, h, u]) => h + u);
  const crowded = nodes.filter((n) => {
    const words = n.node.textContent.split(/\s+/).filter(Boolean).length;
    return n.node.querySelectorAll('.sl-hi, .sl-hue').length * 2 > words;
  }).map((n) => n.spec.name);
  A('yellow and the diagram hues mark some words on some slides, never most of a slide and never every slide',
    counted.length >= 4 && counted.length < SLIDES.length && crowded.length === 0
      && counted.some(([, h]) => h) && counted.filter(([, , u]) => u).length >= minHued,
    counted.map(([nm, h, u]) => `${nm} ${h} yellow ${u} hue`).join(', ')
      + `, ${counted.length} of ${SLIDES.length} slides` + (crowded.length ? `, too many on ${crowded.join(', ')}` : ''));
  const hiEl = panel.stage.querySelector('.sl-hi');
  const hcr = hiEl ? ratio(getComputedStyle(hiEl).color, ground) : 0;
  A('the yellow accent is at least 7:1 against the slide ground', hcr >= 7, `${hcr.toFixed(1)}:1`);

  // Every hued word is the colour the diagram draws that box's name in: focusing
  // each box renders its bold name in its hue, one word per box to compare against.
  // See lessons/page-slides.md#slides-25
  const mi = SLIDES.findIndex((sl) => sl.name === hueSlide);
  go(mi); await frame(); await frame();
  const dgm = nodes[mi].ctl.dg;
  const drawn = new Map();
  for (const g of dgm.svg.querySelectorAll('.pos-dg-n')) {
    g.dispatchEvent(new FocusEvent('focus'));
    for (const b of dgm.svg.parentNode.querySelectorAll('.pos-dg-cap strong')) {
      if (b.style.color) drawn.set(b.textContent.trim().toLowerCase(), getComputedStyle(b).color);
    }
    g.dispatchEvent(new PointerEvent('pointerleave'));
  }
  const hues = [...panel.stage.querySelectorAll('.sl-hue')];
  const hueBad = [], hueCr = new Map();
  for (const sp of hues) {
    const c = getComputedStyle(sp).color, want = drawn.get(sp.dataset.box);
    if (c !== want) hueBad.push(`${sp.textContent} ${c} against ${want ?? 'nothing drawn'}`);
    hueCr.set(sp.dataset.box, ratio(c, ground));
  }
  A('every hued word is exactly the colour the diagram draws its box\'s name in',
    hues.length >= 3 && hueBad.length === 0,
    hueBad.slice(0, 4).join(', ') || `${hues.length} words, ${[...new Set(hues.map((sp) => sp.dataset.box))].join(', ')}`);
  const worstHue = Math.min(...hueCr.values());
  A('every hue is at least 4.5:1 against the slide ground', worstHue >= 4.5,
    [...hueCr].map(([k, v]) => `${k} ${v.toFixed(1)}:1`).join(', '));

  // Live elements run while their slide is shown and stop when it is not.
  // One look per live slide: its own value has to move across the window and
  // every other live element's must not, which proves the stop as well.
  const live = nodes.map((n, i) => (n.spec.live ? i : -1)).filter((i) => i >= 0);
  const moved = [], stopped = [];
  for (const i of live) {
    go(i); await sleep(60);
    const v0 = live.map((j) => nodes[j].ctl.value());
    await sleep(nodes[i].ctl.windowMs || 320);
    const v1 = live.map((j) => nodes[j].ctl.value());
    live.forEach((j, k) => {
      if (j === i) moved.push(`${SLIDES[i].name} ${v0[k] !== v1[k] ? 'moved' : 'STILL'} (${v0[k]} to ${v1[k]})`);
      else if (v0[k] !== v1[k]) stopped.push(`${SLIDES[j].name} ran while ${SLIDES[i].name} was shown`);
    });
  }
  A(`at least ${minLive === 4 ? 'four' : minLive} slides carry a live part of the kit`,
    live.length >= minLive && kitLive.every((nm) => live.some((i) => SLIDES[i].name === nm)),
    live.map((i) => SLIDES[i].name).join(', '));
  A('every live element changes while its slide is shown',
    moved.every((m) => !m.includes('STILL')), moved.join(', '));
  A('and stops when the slide is left', stopped.length === 0, stopped.join(', ') || 'all stopped');
  const dgs = nodes.filter((n) => n.ctl?.dg);
  const dgBad = dgs.filter((n) => n.ctl.dg.mode !== 'row' || n.ctl.dg.cuts.length);
  A('every diagram on a slide drew in a row and cut nothing',
    dgs.length > 0 && dgBad.length === 0,
    dgs.map((n) => `${n.spec.name} ${n.ctl.dg.mode}, ${n.ctl.dg.cuts.length} cut`).join(', '));

  go(0);
  key('.');
  const blanked = panel.stage.hasAttribute('data-blank')
    && getComputedStyle(nodes[0].node).visibility === 'hidden';
  key('b');
  A('a full stop blanks the slide and b brings it back',
    blanked && !panel.stage.hasAttribute('data-blank'), `${blanked}`);

  // Presenting: full screen, by whichever route this browser has.
  await panel.full(true); await frame(); await frame();
  const fs = nodes[0].node.getBoundingClientRect();
  const fsL = px(nodes[0].say);
  const fullOk = panel.isFull() && Math.abs(fs.width / fs.height - 16 / 9) < 0.01
    && fs.width <= innerWidth + 1 && fs.height <= innerHeight + 1
    && stepOf(fsL, fs.height) === (nodes[0].spec.statement ? 5 : 4);
  // The way-out button: none over a slide where a fine pointer can hover.
  const desk = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const fsx = panel.el.querySelector('.pos-fsx');
  const fsxDisplay = fsx ? getComputedStyle(fsx).display : 'absent';
  await panel.full(false); await frame();
  A(`full screen keeps the slide 16:9 inside the screen and the first slide at its step`,
    fullOk, `${panel.support?.() ?? ''} ${fs.width.toFixed(0)} x ${fs.height.toFixed(0)} in ${innerWidth} x ${innerHeight}, ${fsL.toFixed(1)} px`);
  A('and leaving it gives the panel its own shape back',
    !panel.isFull() && Math.abs(nodes[0].node.getBoundingClientRect().height - panel.stage.getBoundingClientRect().height) < 1);
  A('on a desktop no way-out button is drawn over a slide in full screen',
    desk && fsx && fsxDisplay === 'none', `hover and fine pointer ${desk}, button ${fsx ? fsxDisplay : 'absent'}`);
  const leaves = [];
  for (const k of ['Escape', 'f']) {
    await panel.full(true); await frame();
    const inFull = panel.isFull();
    key(k);
    await frame(); await frame();
    leaves.push(`${k} ${inFull && !panel.isFull() ? 'left' : `stayed (was full ${inFull})`}`);
    if (panel.isFull()) { await panel.full(false); await frame(); }
  }
  A('and Escape and f each leave full screen, so the keyboard is the way out',
    leaves.every((x) => x.endsWith('left')), leaves.join(', '));

  // `/_log` is the shell's own mirror of the log to the dev server, posted
  // only on 127.0.0.1, and is the shell's request rather than this page's.
  const mine = (list) => list.filter((r) => new URL(r.name).pathname !== '/_log');
  const res = mine(performance.getEntriesByType('resource'));
  const foreign = res.filter((r) => new URL(r.name).origin !== location.origin);
  A('with the faces in, stepping every slide fetched nothing, and nothing came from another host',
    res.length === resBefore && foreign.length === 0,
    `${resBefore} before, ${res.length} after, ${foreign.length} foreign`
      + (res.length !== resBefore ? `: ${res.slice(resBefore).map((r) => new URL(r.name).pathname).join(' ')}` : ''));
  go(0);
  return { t0, STEPS, stepOf, px, key, frame, R };
}

/** The face without touching the picker or the log, for the measuring pass. */
function setFaceQuiet(deck, f) {
  deck.wrap.style.setProperty('--sl-face', faceStack(f));
}
