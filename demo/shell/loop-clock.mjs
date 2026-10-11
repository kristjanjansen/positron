// demo/shell/loop-clock.mjs: a MIDI loop drawn as a clock.
//
// Built 2026-10-11 for /concepts/sampler/050/, from plans/plan-loop-ui.md
// sections 4.1 (loop clock) and 4.8 (approach rings), asked as *"Okay, build."*.
//
// THE PICTURE. The seam is at 12 o'clock and time runs clockwise; one turn is
// the loop's length. A note's distance from the middle is its pitch, low notes
// inside and high notes outside, over the range of the notes in the loop with
// a floor of one octave so two notes a tone apart do not fill the whole disc.
// A note is a dot at its onset and an arc to its release, so a note held over
// the seam is an arc that crosses 12 o'clock. A hand from the middle says where
// the loop is now. Marks stay where they are and only the hand moves, so a new
// note is the one thing on the picture that changed (plan section 2, Rensink).
//
// ⚠️ A RENDERER AND NOTHING ELSE. It owns no clock, no timer and no audio, the
// numloop.mjs rule: the page calls draw() every animation frame with the
// looper's own state, and a page that stops calling stops the picture. So the
// same piece can draw a second loop later without a second clock to keep in
// step.
//
// ⚠️ ITS SIZE NEVER DEPENDS ON WHAT IT DRAWS. The canvas is square, as wide as
// its box up to MAX_PX, and the box's width is set by the page around it. The
// backing store follows a ResizeObserver, never a draw.
//
// ⚠️ COLOURS ARE READ FROM THE TOKENS ONCE. A canvas cannot read var(), and
// ctx.font with var(--mono) in it is silently ignored (positron-ui, xy-pad.mjs).

const SHEET_ID = 'pos-lclock-css';
const MAX_PX = 380;
const MIN_SPAN = 12;          // semitones: the narrowest pitch range drawn
const FLASH_MS = 220;         // how long a note glows after the hand reaches it
const APPROACH_MS = 450;      // how early an approach ring appears
const APPROACH_ONSETS = 3;    // how many onsets ahead get one
const CHORD_MS = 40;          // onsets this close are one onset, for the rings
const TAU = Math.PI * 2;

function ensureSheet() {
  if (document.getElementById(SHEET_ID)) return;
  const st = document.createElement('style');
  st.id = SHEET_ID;
  // The box paints its own ground: inside a glue a part with none lets the
  // seam colour through its whole area (positron-ui, the ground under a glued
  // part). The canvas is a block, or it sits on a text baseline and leaves a
  // strip under it that a glue draws as a second line.
  st.textContent = '.pos-lclock { background: var(--card); display: flex; justify-content: center; padding: 16px 0; min-width: 0; }'
    + ` .pos-lclock-c { display: block; width: min(100%, ${MAX_PX}px); aspect-ratio: 1 / 1; height: auto; }`;
  document.head.append(st);
}

/**
 * Pair note ons with their offs, per layer and pitch. An off that comes before
 * its on in the list is the release after the seam, so the span wraps. An on
 * with no off at all is a key still down: it runs to `now`.
 * @returns {{ on: number, off: number|null, d1: number, d2: number, layer: number }[]}
 */
export function noteSpans(events) {
  const open = new Map(), spans = [], early = new Map();
  for (const e of events) {
    const k = `${e.layer || 0}:${e.d1}`;
    if (e.d2) {
      // a second on for a key already open closes the first one there
      if (open.has(k)) { const s = open.get(k); s.off = e.at; }
      const s = { on: e.at, off: null, d1: e.d1, d2: e.d2, layer: e.layer || 0 };
      open.set(k, s); spans.push(s);
    } else if (open.has(k)) {
      open.get(k).off = e.at; open.delete(k);
    } else {
      if (!early.has(k)) early.set(k, []);
      early.get(k).push(e.at);
    }
  }
  // what is still open takes the earliest unclaimed off of its key: the wrap
  for (const [k, s] of open) {
    const offs = early.get(k);
    if (offs && offs.length) s.off = offs.shift();
  }
  return spans;
}

/**
 * @param {object} [o]
 * @param {string} [o.label]  the canvas's accessible name
 * @returns {{ el: HTMLElement, draw: (state: object) => void, stat: () => object }}
 */
export function createLoopClock(o = {}) {
  ensureSheet();
  const wrap = document.createElement('div');
  wrap.className = 'pos-lclock';
  const canvas = document.createElement('canvas');
  canvas.className = 'pos-lclock-c';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', o.label || 'the loop as a clock');
  wrap.append(canvas);
  const ctx = canvas.getContext('2d');

  const css = getComputedStyle(document.documentElement);
  const tok = (n, fb) => (css.getPropertyValue(n) || '').trim() || fb;
  const C = {
    rim: tok('--line2', '#2b3546'),
    guide: tok('--line', '#1f2937'),
    seam: tok('--dim2', '#6a7280'),
    hand: tok('--fg', '#e6e6e6'),
    text: tok('--dim', '#8b93a1'),
    rec: tok('--rec', '#e5484d'),
    mono: tok('--mono', 'ui-monospace, Menlo, monospace'),
  };
  // Layer 0, the take, is the quiet ink; every overdub gets a hue of its own.
  // The maker colours are taken because they carry no meaning in this project
  // (shell.css says so), unlike --ok, --warn, --bad and the accent --hi.
  const LAYERS = [
    tok('--fg2', '#b6bcc7'),
    tok('--mi-teal-lit', '#5fb9b9'),
    tok('--mi-orange', '#d08048'),
    tok('--ai', '#b39ae8'),
    tok('--mi-blue', '#4898b0'),
    tok('--mi-maroon-lit', '#c85071'),
  ];
  const layerInk = (k) => LAYERS[k % LAYERS.length];

  let W = 0, dpr = 1, paints = 0, last = null;
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(canvas.clientWidth);
    if (w === W && canvas.width) return false;
    W = w;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = canvas.width;
    return true;
  }
  new ResizeObserver(() => { if (size() && last) paint(last); }).observe(wrap);

  /**
   * One frame. Every field is the looper's own state, read fresh.
   * @param {object} s
   * @param {number}  s.len        the loop's length in ms, 0 while there is none
   * @param {number}  s.pos        where the loop is, ms from the seam
   * @param {object[]} s.events    { at, d1, d2, layer? }, sorted by at
   * @param {boolean} [s.recording] the first take is being recorded
   * @param {number}  [s.elapsed]  ms into that take
   * @param {number}  [s.span]     ms one turn stands for while recording
   * @param {boolean} [s.overdub]  an overdub is being recorded
   * @param {number}  [s.layer]    the layer being recorded
   * @param {number}  [s.lookback] ms the take reaches back before a press
   */
  function paint(s) {
    if (!W) return;
    paints++;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, W);
    const cx = W / 2, cy = W / 2;
    const R = W / 2 - 10;              // the rim, room outside it for a ring
    const r0 = R * 0.3;                // the lowest note's radius
    const r1 = R - 14;                 // the highest note's radius
    const dot = Math.max(2.5, W / 110);
    const line = Math.max(2, W / 150);

    const looping = s.len > 0 && !s.recording;
    // One turn: the loop while there is one; while the first take records, the
    // same window the strip shows, which grows by half again each time it fills.
    const turn = looping ? s.len : Math.max(1, s.span || s.elapsed * 1.5 || 4000);
    const head = looping ? s.pos : (s.recording ? s.elapsed : null);
    const ang = (t) => -Math.PI / 2 + (t / turn) * TAU;

    // the face: rim, a faint inner ring where the lowest notes sit, the seam
    ctx.lineWidth = 1;
    ctx.strokeStyle = C.rim;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = C.guide;
    ctx.beginPath(); ctx.arc(cx, cy, r0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = C.seam;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy - R + 7); ctx.lineTo(cx, cy - R - 7); ctx.stroke();
    // how far a take reaches back before a press, as a short stretch of rim
    // ending at the seam (plans/plan-looper-accuracy.md, LOOKBACK_MS)
    if (looping && s.lookback) {
      ctx.lineWidth = 2; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(cx, cy, R, ang(-s.lookback), ang(0)); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const spans = noteSpans(s.events || []);
    if (!spans.length && head === null) { last = s; return; }

    // pitch to radius over the notes present, a floor of MIN_SPAN
    let lo = Infinity, hi = -Infinity;
    for (const n of spans) { lo = Math.min(lo, n.d1); hi = Math.max(hi, n.d1); }
    if (hi - lo < MIN_SPAN) { const mid = (lo + hi) / 2; lo = mid - MIN_SPAN / 2; hi = mid + MIN_SPAN / 2; }
    const rad = (p) => r0 + ((p - lo) / (hi - lo)) * (r1 - r0);

    // while recording, the stretch recorded so far is a red arc on the rim
    if (s.recording && head !== null) {
      ctx.strokeStyle = C.rec; ctx.globalAlpha = 0.55; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, R, ang(0), ang(Math.min(head, turn))); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const rings = [];
    for (const n of spans) {
      const r = rad(n.d1);
      const ink = layerInk(n.layer);
      // a key still down runs to where the hand is
      const held = n.off === null;
      const off = held ? (head ?? n.on) : n.off;
      const wraps = off < n.on;
      // where the hand is against this note, this lap
      let state = 'ahead';
      if (head !== null) {
        const inside = wraps ? (head >= n.on || head <= off) : (head >= n.on && head <= off);
        if (held || inside) state = 'sounding';
        // while the first take records nothing has been passed yet: it is all
        // the loop being made, so none of it dims
        else if (looping && head > n.on) state = 'passed';
      }
      const since = head === null ? Infinity : (head - n.on + (looping && head < n.on ? s.len : 0));
      const flash = since >= 0 && since < FLASH_MS ? 1 - since / FLASH_MS : 0;
      const alpha = state === 'passed' ? 0.3 : state === 'sounding' ? 1 : 0.75;

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = ink; ctx.fillStyle = ink;
      ctx.lineWidth = state === 'sounding' ? line * 1.5 : line;
      ctx.lineCap = 'round';
      const a0 = ang(n.on), a1 = ang(wraps ? off + turn : off);
      if (a1 - a0 > 0.002) { ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(cx + r * Math.cos(a0), cy + r * Math.sin(a0), dot, 0, TAU); ctx.fill();
      if (flash > 0) {
        ctx.globalAlpha = 0.5 * flash;
        ctx.beginPath(); ctx.arc(cx + r * Math.cos(a0), cy + r * Math.sin(a0), dot + 2 + 5 * flash, 0, TAU); ctx.fill();
      }
      if (looping && head !== null) {
        const until = n.on >= head ? n.on - head : n.on + s.len - head;
        if (until > 0 && until <= APPROACH_MS) rings.push({ until, r, a0, ink });
      }
    }
    ctx.globalAlpha = 1;

    // approach rings: the next few onsets, a ring closing onto each dot
    rings.sort((a, b) => a.until - b.until);
    let onsets = 0, at = -Infinity;
    for (const g of rings) {
      if (g.until - at > CHORD_MS) { onsets++; at = g.until; }
      if (onsets > APPROACH_ONSETS) break;
      const k = g.until / APPROACH_MS;            // 1 far, 0 arriving
      ctx.globalAlpha = 0.55 * (1 - k);
      ctx.strokeStyle = g.ink; ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(cx + g.r * Math.cos(g.a0), cy + g.r * Math.sin(g.a0), dot + 2 + 14 * k, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // the hand, red while something is being written into the loop
    if (head !== null) {
      const a = ang(Math.min(head, turn));
      ctx.strokeStyle = s.recording || s.overdub ? C.rec : C.hand;
      ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + 6 * Math.cos(a), cy + 6 * Math.sin(a));
      ctx.lineTo(cx + (R + 4) * Math.cos(a), cy + (R + 4) * Math.sin(a));
      ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, TAU); ctx.fill();
    }

    // the loop's length in the middle, once there is one
    if (looping) {
      ctx.fillStyle = C.text;
      ctx.font = `${Math.round(Math.max(11, W / 30))}px ${C.mono}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${(s.len / 1000).toFixed(2)} s`, cx, cy + Math.max(14, r0 * 0.45));
    }
    last = s;
  }

  return {
    el: wrap,
    draw(s) { if (!W) size(); paint(s); },
    stat: () => ({ paints, size: W, dpr }),
  };
}
