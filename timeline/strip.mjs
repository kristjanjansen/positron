// The strip visualizer, canvas, no framework: view {originTime, pxPerSecond, scrollX}, tick LOD,
// uncertainty as two-tone ambiguation (never a dash; a dash is tratteggio for inferred payload).
// Lanes are queries, not containers: the strip asks the deck every frame under its evidence policy.
// why: lessons/timeline-strip.md#header

// Shared drawing primitives, exported so a client with its own projection reuses the styling.
// why: lessons/timeline-strip.md#primitives

// Hatch follows the row's declared tier. The strip's text uses `--mono`, read once (a canvas cannot
// read var()); with no document, the old stack. A canvas keeps the face it drew in, so redraw when
// it loads.
// why: lessons/timeline-strip.md#mono
const MONO_STACK = 'ui-monospace, Menlo, monospace';
let monoFace = null;
function mono() {
  if (monoFace) return monoFace;
  let v = '';
  try { v = getComputedStyle(document.documentElement).getPropertyValue('--mono').trim(); } catch { /* no document */ }
  if (v) monoFace = v;
  return v || MONO_STACK;
}

export const HATCH = { 0: null, 1: [7, 4], 2: [3, 3], 3: [2, 6] };
export const hatchFor = (tier) => HATCH[tier] || (tier > 3 ? [1, 5] : null);

/** Deterministic, palette-free per-id colour (the lineage's idToColor): hue
 *  0-360, s 65-85, l 55-65. Survives reload, needs no registry. */
export function idToColor(id, { s = 72, l = 60 } = {}) {
  let h = 2166136261;
  const str = String(id);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  const u = (h >>> 0) / 4294967296;
  return `hsl(${Math.round(u * 360)} ${s + (u * 20 | 0) % 20}% ${l}%)`;
}

/** A lane's look derived from the DECK's provenance rollup rather than from a
 *  table keyed by a name the client chose. Colour/width from the reconstruction
 *  METHOD, hatch from the TIER. This is proto/paths' specFor(), generalised. */
export function styleFor(deck, kind, given = {}) {
  // Drop undefined keys before the spread, or `color: undefined` erases its own default.
  // why: lessons/timeline-strip.md#undefined-keys
  const base = {};
  for (const k in given) if (given[k] !== undefined) base[k] = given[k];
  const p = (deck && deck.provenanceOf && deck.provenanceOf(kind)) || null;
  const tier = p ? p.tier : 0;
  return {
    color: base.color || (kind !== undefined ? idToColor(kind) : '#9fb0c8'),
    width: base.width ?? (tier ? 2.4 : 1.4),
    alpha: base.alpha ?? (tier ? 0.55 : 0.95),
    ...base,
    dash: base.dash !== undefined ? base.dash : hatchFor(tier),
    tier, method: p && p.method, source: p && p.source,
    confidence: p && p.confidence, restored: !!(p && p.restored),
  };
}

/** One polyline, one spec. The definition proto/paths, the strip's continuous
 *  renderer and the strip's waveform renderer all share. */
export function strokePoly(ctx, pts, spec) {
  if (!pts || pts.length < 2) return;
  ctx.save();
  ctx.strokeStyle = spec.color; ctx.globalAlpha = spec.alpha ?? 1; ctx.lineWidth = spec.width ?? 1;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (spec.dash) ctx.setLineDash(spec.dash);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.restore();
}

// Render one thing alone offscreen and count painted pixels: proof a lane put marks on a canvas.
// why: lessons/timeline-strip.md#lane-ink
export function laneInk(draw, w, h, { alphaGate = 8, mode = 'count' } = {}) {
  const off = typeof OffscreenCanvas === 'function'
    ? new OffscreenCanvas(w, h)
    : Object.assign(document.createElement('canvas'), { width: w, height: h });
  off.width = w; off.height = h;
  const ctx = off.getContext('2d');
  draw(ctx);
  const d = ctx.getImageData(0, 0, w, h).data;
  let n = 0, sum = 0;
  for (let i = 3; i < d.length; i += 4) { if (d[i] > alphaGate) n++; sum += d[i]; }
  // `sum` is alpha mass, which sees a feathered edge where a pixel count cannot (12.7% vs 0.6%).
  // why: lessons/timeline-strip.md#sum
  return mode === 'sum' ? sum : mode === 'both' ? { count: n, sum } : n;
}

// Tick LOD, a pure function of pxPerSecond: the smallest interval off a ladder from 1 ms to deep
// time
// whose spacing clears a minimum, and a major that clears a label and is a multiple of it.
// why: lessons/timeline-strip.md#tick-lod

const SEC = 1000, MIN = 60 * SEC, HR = 60 * MIN, DAY = 24 * HR, YR = 365.2425 * DAY;
const KYR = 1e3 * YR, MYR = 1e6 * YR, GYR = 1e9 * YR;
export const TICK_LADDER = [
  1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500,
  SEC, 2 * SEC, 5 * SEC, 10 * SEC, 15 * SEC, 30 * SEC,
  MIN, 2 * MIN, 5 * MIN, 10 * MIN, 15 * MIN, 30 * MIN,
  HR, 2 * HR, 3 * HR, 6 * HR, 12 * HR,
  DAY, 2 * DAY, 7 * DAY, 14 * DAY, 30 * DAY, 91 * DAY, 182 * DAY,
  YR, 2 * YR, 5 * YR, 10 * YR, 20 * YR, 25 * YR, 50 * YR, 100 * YR,
  // Deep time is more rungs, never a warped axis; without them 13.8 Gyr in 1400 px looped
  // 138,000,000 times.
  // why: lessons/timeline-strip.md#deep-time
  200 * YR, 500 * YR,
  KYR, 2 * KYR, 5 * KYR, 10 * KYR, 20 * KYR, 50 * KYR, 100 * KYR, 200 * KYR, 500 * KYR,
  MYR, 2 * MYR, 5 * MYR, 10 * MYR, 20 * MYR, 50 * MYR, 100 * MYR, 200 * MYR, 500 * MYR,
  GYR, 2 * GYR, 5 * GYR, 10 * GYR,
];

// The IEEE-754 quantum of a position in ms. Integer ms are exact to 2^53 (285,426.8 years); at 13.8
// Gyr
// one ulp is 65.536 s; `t += 1` stalls past 9.313e15 ms. Used to derive the zoom ceiling.
// why: lessons/timeline-strip.md#ulp
export function ulpMs(t) {
  const a = Math.abs(t);
  if (!(a > 0) || !Number.isFinite(a)) return Number.MIN_VALUE;
  return Math.max(Number.MIN_VALUE, Number.EPSILON * Math.pow(2, Math.floor(Math.log2(a))));
}
// px/s at which one pixel is one representable step of the position domain.
// why: lessons/timeline-strip.md#zoom-ceiling
export const zoomCeilingPps = (t) => 1000 / ulpMs(t);
/** The JS `Date` wall: `new Date(ms).toISOString()` THROWS beyond ±8.64e15 ms
 *  (±273,790 y). formatTime() must never hand a deep-time position to Date. */
export const DATE_WALL_MS = 8.64e15;

// pxPerSecond is the only input. Returns {minor, major, digits, fmt}, with a label formatter
// matched to the zoom.
// why: lessons/timeline-strip.md#tick-lod-sig
export function tickLOD(pxPerSecond, { minMinorPx = 7, minMajorPx = 68 } = {}) {
  const px = (ms) => (ms / 1000) * pxPerSecond;
  // Major first: it must clear a label. Picking minor first strands the calendar ladder.
  // why: lessons/timeline-strip.md#major-first
  let major = TICK_LADDER[TICK_LADDER.length - 1];
  for (const t of TICK_LADDER) { major = t; if (px(t) >= minMajorPx) break; }
  // Minor: smallest step that clears spacing and divides the major, else the smallest that clears.
  // why: lessons/timeline-strip.md#minor
  let minor = null, fallback = null;
  for (const t of TICK_LADDER) {
    if (t >= major) break;
    if (px(t) < minMinorPx) continue;
    if (fallback === null) fallback = t;
    if (Math.abs(major / t - Math.round(major / t)) < 1e-9) { minor = t; break; }
  }
  if (minor === null) minor = fallback === null ? major : fallback;
  const digits = major < SEC ? (major < 10 ? 3 : major < 100 ? 2 : 1) : 0;
  return { minor, major, digits, fmt: (ms, absolute) => formatTime(ms, major, absolute) };
}

/** Label format chosen by the MAJOR interval, so the axis reads at every zoom.
 *  Position-domain ms are relative by default; an absolute wall-clock domain
 *  (replay-grid's) is detected by magnitude and printed as a clock time. */
export function formatTime(ms, major = SEC, absolute) {
  if (!Number.isFinite(ms)) return '';
  // `absolute` is declared, not guessed. Past +-8.64e15 ms `new Date()` throws, so deep positions
  // degrade to the relative regime.
  // why: lessons/timeline-strip.md#absolute
  if ((absolute === undefined ? Math.abs(ms) > 1e12 : absolute) && Math.abs(ms) <= DATE_WALL_MS && major < KYR) {
    const d = new Date(ms);
    if (major >= DAY) return d.toISOString().slice(0, 10);
    if (major >= MIN) return d.toTimeString().slice(0, 5);
    return d.toTimeString().slice(0, 8);
  }
  const neg = ms < 0; const a = Math.abs(ms);
  const h = Math.floor(a / HR), m = Math.floor((a % HR) / MIN), s = (a % MIN) / 1000;
  const sign = neg ? '-' : '';
  // Deep time: the unit follows the major interval, so one axis reads in one unit.
  // why: lessons/timeline-strip.md#deep-unit
  if (major >= KYR) {
    const [u, sym] = major >= GYR ? [GYR, 'Ga'] : major >= MYR ? [MYR, 'Ma'] : [KYR, 'ka'];
    const dg = major >= 10 * u ? 0 : major >= u ? 1 : 2;
    return `${sign}${(a / u).toFixed(dg)} ${sym}`;
  }
  // a RELATIVE domain that spans days or years still has to read: the cultural-
  // heritage horizon puts a 40-year archive on the same axis as a MIDI phrase.
  if (major >= YR) return `${sign}${(a / YR).toFixed(major >= 10 * YR ? 0 : 1)}y`;
  if (major >= DAY) return `${sign}${Math.floor(a / DAY)}d`;
  if (major >= MIN) return `${sign}${h ? h + ':' : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(Math.floor(s)).padStart(2, '0')}`;
  if (major >= SEC) return `${sign}${h ? h + ':' : ''}${m ? String(m).padStart(h ? 2 : 1, '0') + ':' : ''}${String(Math.floor(s)).padStart(m || h ? 2 : 1, '0')}`;
  const d = major < 10 ? 3 : major < 100 ? 2 : 1;
  return `${sign}${m ? String(m) + ':' : ''}${s.toFixed(d).padStart(m ? 2 + d + 1 : 0, '0')}`;
}

// Calendar axis, opt in with `calendar: true`: ticks on real 1 January, first of the month or
// midnight, UTC. The ms ladder's year steps never land on a 1 January.
// why: lessons/timeline-strip.md#calendar

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MO = YR / 12;
const rung = (u, n, ms) => ({ u, n, ms });
/** Coarsest last. `u` is y (years), m (months), d (days) or t (a ms step
 *  inside a day, taken off TICK_LADDER so midnight is always on the grid). */
export const CALENDAR_LADDER = [
  ...TICK_LADDER.filter((t) => t < DAY && DAY % t === 0).map((t) => rung('t', t, t)),
  ...[1, 2, 5, 10, 15].map((n) => rung('d', n, n * DAY)),
  ...[1, 2, 3, 6].map((n) => rung('m', n, n * MO)),
  ...[1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000]
    .map((n) => rung('y', n, n * YR)),
];
// A label's width decides the major spacing, so a ruler of bare years is not
// held to the room a time of day needs. Measured on 10px ui-monospace at about
// 6 px a character: `1500` is 24 px, `Mar 1850` 48, `12:30:05` 48.
const CAL_LABEL_PX = { y: 44, m: 60, d: 60, t: 68 };

// A year as read: `1500`, `-500` (astronomical, year 0 exists). BC was refused: no year 0.
// why: lessons/timeline-strip.md#calendar-year
export function calendarYear(y) { return String(y); }

function utc(y, m = 0, d = 1) {
  // NOT Date.UTC: it reads years 0 to 99 as 1900 to 1999.
  const D = new Date(0); D.setUTCFullYear(y, m, d); D.setUTCHours(0, 0, 0, 0);
  return D.getTime();
}

/** Which calendar step labels the ruler at this zoom, and which marks between. */
export function calendarLOD(pxPerSecond, { minMinorPx = 7 } = {}) {
  const px = (ms) => (ms / 1000) * pxPerSecond;
  let major = CALENDAR_LADDER[CALENDAR_LADDER.length - 1];
  for (const r of CALENDAR_LADDER) if (px(r.ms) >= CAL_LABEL_PX[r.u]) { major = r; break; }
  const divides = (a, b) => (a.u === b.u ? b.n % a.n === 0
    : a.u === 'm' && b.u === 'y' ? 12 % a.n === 0
    : a.u === 'd' ? a.n === 1 || b.u === 'd'
    : a.u === 't' ? true : false);
  let minor = null;
  for (const r of CALENDAR_LADDER) {
    if (r.ms >= major.ms) break;
    if (px(r.ms) >= minMinorPx && divides(r, major)) { minor = r; break; }
  }
  return { major, minor: minor || major };
}

/** Every tick of one rung between t0 and t1, at most `max` of them. */
export function calendarTicks(r, t0, t1, max = 4096) {
  const out = [];
  if (r.u === 't') {
    for (let t = Math.ceil(t0 / r.n) * r.n; t <= t1 && out.length < max; t += r.n) out.push(t);
    return out;
  }
  const D = new Date(t0);
  let y = D.getUTCFullYear(), m = D.getUTCMonth();
  if (r.u === 'y') {
    for (let yy = Math.floor(y / r.n) * r.n; out.length < max; yy += r.n) {
      const t = utc(yy); if (t > t1) break; if (t >= t0) out.push(t);
    }
  } else if (r.u === 'm') {
    m = Math.floor(m / r.n) * r.n;
    for (; out.length < max; m += r.n) {
      const t = utc(y, m); if (t > t1) break; if (t >= t0) out.push(t);
    }
  } else {
    // Days 1, 1+n, 1+2n, none closer than half a step to the next first, which is day `len + 1`.
    // why: lessons/timeline-strip.md#month-days
    for (; out.length < max; m++) {
      const first = utc(y, m); if (first > t1) break;
      const len = Math.round((utc(y, m + 1) - first) / DAY);
      for (let d = 1; d < len + 1 - r.n / 2 || d === 1; d += r.n) {
        const t = first + (d - 1) * DAY;
        if (t > t1 || out.length >= max) break;
        if (t >= t0) out.push(t);
      }
    }
  }
  return out;
}

const p2 = (n) => String(n).padStart(2, '0');
// Below a second the hour is dropped, so a label still fits its 68 px.
const hhmm = (D, sec, ms) => (ms
  ? `${p2(D.getUTCMinutes())}:${p2(D.getUTCSeconds())}.${String(D.getUTCMilliseconds()).padStart(3, '0')}`
  : `${p2(D.getUTCHours())}:${p2(D.getUTCMinutes())}` + (sec ? `:${p2(D.getUTCSeconds())}` : ''));

/** The ruler's label for one tick: as short as the step allows, with the
 *  coarser unit printed only where it turns over (a year at 1 January, a month
 *  at its first, a day at midnight). */
export function calendarLabel(t, r) {
  if (!Number.isFinite(t) || Math.abs(t) > DATE_WALL_MS) return '';
  const D = new Date(t);
  const y = D.getUTCFullYear(), m = D.getUTCMonth(), d = D.getUTCDate();
  if (r.u === 'y') return calendarYear(y);
  if (r.u === 'm') return m === 0 ? calendarYear(y) : `${MONTHS[m]} ${calendarYear(y)}`;
  const midnight = D.getUTCHours() === 0 && D.getUTCMinutes() === 0 && D.getUTCSeconds() === 0 && D.getUTCMilliseconds() === 0;
  if (r.u === 'd' || midnight) return d === 1 ? `${MONTHS[m]} ${calendarYear(y)}` : `${d} ${MONTHS[m]}`;
  return hhmm(D, r.n < MIN, r.n < SEC);
}

/** One whole date, written to the precision of a step: `1100`, `Mar 1100`,
 *  `3 Mar 1100`, `3 Mar 1100 14:20`. For a readout, a clock or a tooltip. */
export function calendarDate(t, r = rung('d', 1, DAY)) {
  if (!Number.isFinite(t) || Math.abs(t) > DATE_WALL_MS) return '';
  const D = new Date(t);
  const y = calendarYear(D.getUTCFullYear()), m = MONTHS[D.getUTCMonth()], d = D.getUTCDate();
  if (r.u === 'y') return y;
  if (r.u === 'm') return `${m} ${y}`;
  if (r.u === 'd') return `${d} ${m} ${y}`;
  return `${d} ${m} ${y} ${hhmm(D, r.n < MIN, false)}${r.n < SEC ? '.' + String(D.getUTCMilliseconds()).padStart(3, '0') : ''}`;
}

/** A length of time in the calendar's own words: `2000 years`, `3 months`,
 *  `1 day`, `6 hours`. Rounded, because it answers *how long*, not *exactly*. */
export function calendarSpan(ms) {
  const a = Math.abs(ms);
  if (!Number.isFinite(a)) return '';
  const say = (v, one) => {
    const n = v >= 10 ? Math.round(v) : +v.toPrecision(2);
    return `${n.toLocaleString('en-US')} ${one}${n === 1 ? '' : 's'}`;
  };
  if (a >= YR * 0.995) return say(a / YR, 'year');
  if (a >= MO * 0.995) return say(a / MO, 'month');
  if (a >= DAY) return say(a / DAY, 'day');
  if (a >= HR) return say(a / HR, 'hour');
  if (a >= MIN) return say(a / MIN, 'minute');
  if (a >= SEC) return say(a / SEC, 'second');
  return say(a, 'millisecond');
}
/** A rung in words, for a readout: `200 years`, `1 month`, `6 hours`. */
export const calendarStep = (r) => {
  if (r.u === 't') return calendarSpan(r.n);
  const one = { y: 'year', m: 'month', d: 'day' }[r.u];
  return `${r.n.toLocaleString('en-US')} ${one}${r.n === 1 ? '' : 's'}`;
};

// Aoristic aggregate: one bin per pixel column, mass 1/(b-a) per ms, drawn as height. Per-column
// binning already is the period correction (verified to 0 ulp). `norm` must not drive the height.
// why: lessons/timeline-strip.md#aoristic

export function aoristic(spans, t0, t1, cols) {
  const mass = new Float64Array(cols), n = new Float64Array(cols), norm = new Float64Array(cols);
  const w = (t1 - t0) / cols;
  const stat = {
    mass, n, norm, max: 0, peakCol: -1, colMs: w,
    // the ledger: a statistic that does not say what it dropped is a curve that
    // implies a density we do not have, which is exactly what PeriodO refused.
    items: 0, counted: 0, total: 0, open: 0, points: 0, clipped: 0,
    method: '',
  };
  if (!(w > 0)) return stat;
  for (const s of spans) {
    stat.items++;
    // An unbounded item contributes zero by arithmetic; reported, not filtered.
    // why: lessons/timeline-strip.md#unbounded
    if (s.to !== null && s.to !== undefined && !Number.isFinite(s.to)) { stat.open++; continue; }
    // A point is mass 1 in its own column, never skipped.
    // why: lessons/timeline-strip.md#point
    const isPoint = s.point || s.to === null || s.to === undefined || s.to === s.from;
    const from = isPoint ? s.from : Math.min(s.from, s.to);
    const to = isPoint ? s.from : Math.max(s.from, s.to);
    if (!Number.isFinite(from)) continue;
    const a = Math.max(from, t0), b = Math.min(to, t1);
    if (!(b >= a)) continue;
    if (from < t0 || to > t1) stat.clipped++;
    if (isPoint) stat.points++;
    const dur = to - from;
    // RATCLIFFE'S WEIGHT: each item carries total mass 1, spread 1/(b−a) per ms,
    // so a decade-precise item cannot outvote a day-precise one by being wide.
    const per = dur > 0 ? 1 / dur : 1 / w;
    const i0 = Math.max(0, Math.floor((a - t0) / w));
    const i1 = Math.min(cols - 1, Math.floor((b - t0) / w));
    for (let i = i0; i <= i1; i++) {
      const lo = Math.max(a, t0 + i * w), hi = Math.min(b, t0 + (i + 1) * w);
      const m = per * Math.max(hi - lo, dur > 0 ? 0 : w);
      mass[i] += m; stat.total += m;
      n[i] += 1;
    }
    stat.counted++;
  }
  for (let i = 0; i < cols; i++) {
    norm[i] = n[i] ? mass[i] / n[i] : 0;
    if (mass[i] > stat.max) { stat.max = mass[i]; stat.peakCol = i; }
  }
  stat.method = `aoristic Σ 1/(b−a) · 1 bin/px (${cols} cols, ${fmtDur(w)}/col)`;
  return stat;
}

// A short duration for the stated method line: a bin size must be visible.
// why: lessons/timeline-strip.md#fmt-dur
function fmtDur(ms) {
  const a = Math.abs(ms);
  if (a >= GYR) return `${(a / GYR).toPrecision(3)} Ga`;
  if (a >= MYR) return `${(a / MYR).toPrecision(3)} Ma`;
  if (a >= KYR) return `${(a / KYR).toPrecision(3)} ka`;
  if (a >= YR) return `${(a / YR).toPrecision(3)} y`;
  if (a >= DAY) return `${(a / DAY).toPrecision(3)} d`;
  if (a >= HR) return `${(a / HR).toPrecision(3)} h`;
  if (a >= SEC) return `${(a / SEC).toPrecision(3)} s`;
  return `${a.toPrecision(3)} ms`;
}

// Span extraction in priority order: row.payload.when bounds, lane.span(row), then enter/exit
// phase pairing keyed by lane.group(row). A row with no end is a point.
// why: lessons/timeline-strip.md#span-extraction

// `ref` (nested.mjs) and `lane`/`tag` pair with no per-client configuration.
// why: lessons/timeline-strip.md#group-key
const groupKey = (lane, r) =>
  (lane.group ? lane.group(r)
    : (r.payload && (r.payload.lane ?? r.payload.tag ?? r.payload.ref ?? r.payload.id)) ?? r.id ?? r.kind);
/** A lane may DECLARE its pairing semantics instead of the rows carrying them:
 *  a MIDI note-on/note-off is a span, but nothing in the log says `phase`. */
const phaseOf = (lane, r) => (lane.phase ? lane.phase(r) : (r.payload || {}).phase);

function whenOf(w) {
  if (!w || typeof w !== 'object') return null;
  // The settled shape (transport v0.6 §U1) is earliest/latest; the rest are
  // tolerated legacy spellings. Reading only the aliases silently lost every
  // real `when` row to the point renderer.
  const oF = w.earliest ?? w.outerFrom ?? w.from ?? w.earliestStart;
  const oT = w.latest ?? w.outerTo ?? w.to ?? w.latestEnd;
  if (!Number.isFinite(oF) || !Number.isFinite(oT)) return null;
  const iF = Number.isFinite(w.innerFrom ?? w.latestStart) ? (w.innerFrom ?? w.latestStart) : null;
  const iT = Number.isFinite(w.innerTo ?? w.earliestEnd) ? (w.innerTo ?? w.earliestEnd) : null;
  // `smeared` tells a `when` bracket from an attested pair, which must not share ink.
  // `rule`/`verbatim` feed the "narrow this" link to the evidence.
  // why: lessons/timeline-strip.md#smeared
  return {
    from: oF, to: oT, innerFrom: iF, innerTo: iT,
    kind: w.kind || null, certain: iF !== null && iT !== null && iF <= iT,
    smeared: true, rule: w.rule || null, verbatim: w.verbatim ?? null, edtf: w.edtf ?? null,
  };
}

export function spansOf(rows, lane = {}) {
  const out = [], open = new Map();
  for (const r of rows) {
    const p = r.payload || {};
    const w = whenOf(p.when || r.when);
    if (w) { out.push({ ...w, row: r, key: groupKey(lane, r) }); continue; }
    if (lane.span) {
      const s = lane.span(r);
      if (s && Number.isFinite(s.from) && Number.isFinite(s.to)) {
        const ww = whenOf(s.when) || {};
        out.push({ from: s.from, to: s.to, innerFrom: ww.innerFrom ?? null, innerTo: ww.innerTo ?? null,
                   kind: ww.kind || null, certain: !!ww.certain, smeared: !!ww.smeared,
                   rule: ww.rule ?? null, verbatim: ww.verbatim ?? null,
                   row: r, key: s.key ?? groupKey(lane, r) });
        continue;
      }
    }
    const dur = p.durMs ?? p.dur ?? p.durationMs;
    if (Number.isFinite(dur)) {
      out.push({ from: r.at, to: r.at + dur, innerFrom: null, innerTo: null, certain: false, row: r, key: groupKey(lane, r) });
      continue;
    }
    const phase = phaseOf(lane, r);
    if (phase === 'enter' || phase === 'on' || phase === 'start') { open.set(groupKey(lane, r), r); continue; }
    if (phase === 'exit' || phase === 'off' || phase === 'end') {
      const k = groupKey(lane, r), a = open.get(k);
      if (a) { open.delete(k); out.push({ from: a.at, to: r.at, innerFrom: null, innerTo: null, certain: false, row: a, endRow: r, key: k }); }
      continue;
    }
    out.push({ from: r.at, to: null, point: true, row: r, key: groupKey(lane, r) });
  }
  // an unterminated span is honest content (a recording that was still running):
  // it runs to +Infinity and the renderer feathers its right edge.
  for (const [k, a] of open) out.push({ from: a.at, to: Infinity, open: true, innerFrom: null, innerTo: null, certain: false, row: a, key: k });
  return out;
}

// Three states, transcribed from transport.mjs's certAccepts() (strip-verify A1 checks they agree):
// crisp, core, outer, unanswerable. The state depends on the window, so zoom can change it.
// why: lessons/timeline-strip.md#when-state

export function whenState(s, t0, t1) {
  if (!s || !s.smeared) return 'crisp';
  if (s.innerFrom !== null && s.innerTo !== null && s.innerFrom <= s.innerTo) return 'core';
  if (Number.isFinite(s.to) && t0 <= s.from && s.to <= t1) return 'outer';
  return 'unanswerable';
}

/** the ambiguation tones. Two lightness values of ONE hue is what the study
 *  compared; alpha is our lightness because the lane background is fixed. */
const TONE = { skirt: 0.30, core: 0.88, crisp: 0.85, ghost: 0.10, bar: 0.92 };

// Default renderers in an open registry keyed by name, chosen per lane; all get the same context.
// why: lessons/timeline-strip.md#renderers

const RENDERERS = new Map();
export function registerRenderer(name, fn) { RENDERERS.set(name, fn); return () => RENDERERS.delete(name); }

// Marks keep BIN_GAP_PX apart; where they cannot, the lane draws one mark per bin, coloured by the
// worst row (`rankOfRow`, else the rarest colour) and sized by count. `bin: true` opts in; not
// 'char'.
// why: lessons/timeline-strip.md#bins
export const BIN_GAP_PX = 2;

/** The spans a live view steps through, in ms: round numbers a ruler reads. */
export const LIVE_STEPS = [1000, 2000, 5000, 10000, 20000, 30000, 60000, 120000, 300000, 600000,
  1200000, 1800000, 3600000, 7200000, 3 * 3600000, 6 * 3600000, 12 * 3600000, 24 * 3600000];

/** A line of width `lw` CSS px centred so both its edges land on whole device
 *  pixels: the left edge on the device pixel nearest `xv`. */
function snapX(xv, lw, dpr = 1) {
  const wDev = Math.max(1, Math.round(lw * dpr));
  return (Math.round(xv * dpr) + wDev / 2) / dpr;
}
/** A tick's colour, the one rule the renderer and the hover share. */
function tickColour(L, r, pos, style) {
  const fired = !!L.latch && r.at <= pos;
  return (L.colorOfRow && L.colorOfRow(r, fired)) || (fired ? (L.firedColor || '#7fd18c') : style.color);
}
/** How many marks in view wear each colour, for a lane that gives no rank. */
function colourRarity(L, rows, colourOf) {
  const m = new Map();
  if (!L.rankOfRow) for (const r of rows) { const c = colourOf(r); m.set(c, (m.get(c) || 0) + 1); }
  return m;
}
/** The worst row of a set, by the lane's `rankOfRow` or by colour rarity. */
function worstRow(L, rows, colourOf, rarity) {
  let best = rows[0], bestK = -Infinity;
  for (const r of rows) {
    const k = L.rankOfRow ? Number(L.rankOfRow(r)) || 0 : -(rarity.get(colourOf(r)) || 0);
    if (k >= bestK) { bestK = k; best = r; }
  }
  return best;
}

/** Group the rows in view into bins of `binPx`, or say they need none. Pure
 *  arithmetic on the x of each row, so the renderer and the hover agree. */
function binRows(L, all, x, style, width) {
  // only what is in view counts: a lane whose rows ignore the window (a page's
  // own `rows`) must not be binned, or scaled, by marks off either edge
  const rows = all.filter((r) => { const px = x(r.at); return px >= -8 && px <= width + 8; });
  const markPx = Math.max(1, Math.round(L.width ?? style.width ?? 1));
  const binPx = markPx + BIN_GAP_PX;
  const xs = rows.map((r) => x(r.at)).sort((a, b) => a - b);
  let minGap = Infinity;
  for (let i = 1; i < xs.length; i++) minGap = Math.min(minGap, xs[i] - xs[i - 1]);
  if (!(minGap < binPx)) return { binned: false, markPx, binPx, minGapPx: Number.isFinite(minGap) ? minGap : null };
  const bins = new Map();
  for (const r of rows) {
    const i = Math.floor(x(r.at) / binPx);
    let b = bins.get(i);
    if (!b) bins.set(i, (b = { i, rows: [] }));
    b.rows.push(r);
  }
  let maxN = 0, minN = Infinity;
  for (const b of bins.values()) { maxN = Math.max(maxN, b.rows.length); minN = Math.min(minN, b.rows.length); }
  return { binned: true, markPx, binPx, bins, maxN, minN, minGapPx: minGap };
}

// Discrete ticks, one per row; `latch` recolours marks behind the playhead and un-fires on rewind.
// why: lessons/timeline-strip.md#ticks
registerRenderer('ticks', (ctx, L, C) => {
  const { x, style } = C;
  const y0 = L.y, h = L.height;
  ctx.save();
  ctx.globalAlpha = style.alpha ?? 0.95;
  // `marks: 'char'`: the character is the mark, a middot where none fits. Opt in, because a middot
  // already means something on some lanes.
  // why: lessons/timeline-strip.md#char-marks
  const charMarks = L.marks === 'char' && !!L.glyphOf;
  // ── the binned path (see BIN_GAP_PX) ──
  const wantBin = !charMarks && (L.bin === true || (L.bin !== false && C.bin));
  const B = wantBin ? binRows(L, C.rows, x, style, C.width) : null;
  if (B && B.binned) {
    const colourOf = (r) => tickColour(L, r, C.pos, style);
    const rarity = colourRarity(L, C.rows, colourOf);
    const top = y0 + 2, full = Math.max(1, h - 4);
    const drawn = [];
    for (const b of [...B.bins.values()].sort((p, q) => p.i - q.i)) {
      const w = worstRow(L, b.rows, colourOf, rarity);
      // A bin of one is a third of the lane at least; heights differ only when bins differ by more
      // than one row.
      // why: lessons/timeline-strip.md#flat
      const flat = B.maxN - B.minN <= 1;
      const bh = flat ? full : Math.max(3, Math.round(full * (0.35 + 0.65 * (b.rows.length / B.maxN))));
      const bx = C.snap ? Math.round(b.i * B.binPx * C.dpr) / C.dpr : b.i * B.binPx;
      ctx.fillStyle = colourOf(w);
      ctx.fillRect(bx, top + full - bh, B.markPx, bh);
      drawn.push({ x: bx, w: B.markPx, n: b.rows.length });
    }
    L._bin = { binned: true, markPx: B.markPx, binPx: B.binPx, gapPx: BIN_GAP_PX, rows: C.rows.length, bins: drawn.length, maxN: B.maxN, drawn };
    ctx.restore();
    return;
  }
  L._bin = B ? { binned: false, markPx: B.markPx, binPx: B.binPx, gapPx: BIN_GAP_PX, rows: C.rows.length, minGapPx: B.minGapPx } : null;
  const glyphs = [];
  for (const r of C.rows) {
    const px = Math.round(x(r.at)) + 0.5;
    const fired = L.latch && r.at <= C.pos;
    // `colorOfRow(row, fired)` per row; falsy falls back to the two-colour latch.
    // why: lessons/timeline-strip.md#color-of-row
    const col = (L.colorOfRow && L.colorOfRow(r, fired))
      || (fired ? (L.firedColor || '#7fd18c') : style.color);
    if (charMarks) { glyphs.push([px, r, col]); continue; }   // the letter IS the mark
    ctx.strokeStyle = col;
    // `widthOfRow` is a second per-row channel, cheaper than a second lane.
    // why: lessons/timeline-strip.md#width-of-row
    ctx.lineWidth = (L.widthOfRow && L.widthOfRow(r, fired)) || style.width || 1.4;
    if (style.dash) ctx.setLineDash(style.dash); else ctx.setLineDash([]);
    // On a LIVE strip a mark sits on whole DEVICE pixels, its line centred so
    // its edges do too, so nothing shimmers between steps or at 2x and 3x.
    const lx = C.snap ? snapX(x(r.at), ctx.lineWidth, C.dpr) : px;
    ctx.beginPath(); ctx.moveTo(lx, y0 + 2); ctx.lineTo(lx, y0 + h - 2); ctx.stroke();
    if (L.glyphOf) glyphs.push([px, r, col]);
  }
  // Glyphs only where the zoom leaves room, tested against both neighbours; `L.glyphState`
  // publishes
  // how many fit.
  // why: lessons/timeline-strip.md#glyphs
  if (glyphs.length) {
    ctx.font = L.glyphFont || `10px ${mono()}`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = 1;
    const yc = y0 + h / 2, pad = 2;
    let drawn = 0, dotted = 0;
    // A middot takes the tick's colour. Full: the row has no character. Faded: there is one, no
    // room.
    // why: lessons/timeline-strip.md#dot
    const dot = (px, col, faded) => {
      ctx.globalAlpha = faded ? 0.45 : 0.95;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(px, yc, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    };
    for (let i = 0; i < glyphs.length; i++) {
      const [px, r, col] = glyphs[i];
      const g = L.glyphOf(r);
      // Under 'char' the glyph carries the latch colour; otherwise the unfired ink.
      // why: lessons/timeline-strip.md#glyph-ink
      const ink = L.glyphColor
        || (charMarks ? col : ((L.colorOfRow && L.colorOfRow(r, false)) || style.color));
      if (!g) { if (charMarks) { dot(px, ink, false); dotted++; } continue; }
      const w = ctx.measureText(g).width;
      const need = w / 2 + 2;
      const left = i > 0 ? px - glyphs[i - 1][0] : Infinity;
      const right = i < glyphs.length - 1 ? glyphs[i + 1][0] - px : Infinity;
      if (Math.min(left, right) < need * 2) {
        if (charMarks) { dot(px, ink, true); dotted++; }
        continue;
      }
      // A backing so the tick does not strike through the letter; none under 'char'.
      // why: lessons/timeline-strip.md#backing
      if (!charMarks) {
        ctx.fillStyle = C.theme && C.theme.lane ? C.theme.lane : '#151a24';
        ctx.fillRect(px - w / 2 - pad, yc - 6, w + pad * 2, 12);
      }
      ctx.fillStyle = ink;
      ctx.fillText(g, px, yc + 3.5);
      drawn++;
    }
    L.glyphState = { had: glyphs.length, drawn, dotted };
    ctx.textAlign = 'start';
  } else if (L.glyphOf) L.glyphState = { had: 0, drawn: 0, dotted: 0 };
  ctx.restore();
});

// Spans as two-tone ambiguation: saturated core, lighter flanks; all skirt with no `when`.
// why: lessons/timeline-strip.md#spans
registerRenderer('spans', (ctx, L, C) => {
  const { x, style } = C;
  const rowsByKey = new Map();
  let slot = 0;
  const spans = C.spans;
  if (L.stack !== false) for (const s of spans) if (!rowsByKey.has(s.key)) rowsByKey.set(s.key, slot++);
  // `slots` caps the stack; `slotOf` places a span on a real axis.
  // why: lessons/timeline-strip.md#slots
  const nSlots = Math.max(1, Math.min(L.slots || Infinity, rowsByKey.size));
  // `barPad` is the breathing room above and below the bar in its slot. A
  // span sitting hard against its lane edges reads as a background band
  // rather than as an object with ends.
  const barPad = L.barPad ?? 3;
  const barH = L.stack === false ? L.height - barPad * 2 : Math.max(3, (L.height - barPad * 2) / nSlots - 2);
  // `currentOf(s)` marks the span in hand by strength and a ring, not colour; dims only when one is
  // current.
  // why: lessons/timeline-strip.md#current
  const anyCur = L.currentOf ? spans.some((s) => L.currentOf(s)) : false;
  // Half strength, no less: below about 0.5 the bars stop reading as bars.
  // why: lessons/timeline-strip.md#dim
  const DIM = L.dimTo ?? 0.5;
  // and its labels dim less than its bars: a title is the row's identity, and
  // the point of dimming is to rank the bars, not to make the archive unreadable
  const DIM_LABEL = L.dimLabelTo ?? 0.62;
  ctx.save();
  // `bars: false` gives the aggregate its own lane, so the statistic is not drawn behind the bands.
  // why: lessons/timeline-strip.md#bars-false
  for (const s of L.bars === false ? [] : spans) {
    if (s.point) continue;
    const to = Number.isFinite(s.to) ? s.to : C.t1;
    if (to < C.t0 || s.from > C.t1) continue;                       // virtualized
    const row = L.stack === false ? 0
      : L.slotOf ? (L.slotOf(s) % nSlots + nSlots) % nSlots
      : (rowsByKey.get(s.key) || 0) % nSlots;
    const y = L.y + 3 + row * (barH + 2);
    // Write each bar's y and height back for hitTest; only the draw knows the geometry.
    // why: lessons/timeline-strip.md#hit-geometry
    s._y = y; s._h = barH;
    const xa = x(s.from), xb = x(to);
    const col = L.colorOf ? L.colorOf(s) : (L.color || (L.byKey ? idToColor(s.key) : style.color));
    const isCur = anyCur && !!L.currentOf(s);
    const dim = anyCur && !isCur ? DIM : 1;
    const prov = s.row && s.row.provenance;
    const st = whenState(s, C.t0, C.t1);
    s.state = st;                               // read back by spanStates()/hover
    // `barGap` insets the drawn bar so adjacent spans read as separate.
    // why: lessons/timeline-strip.md#bar-gap
    const gap = L.barGap ?? 0;
    // A 2 px floor so a clip does not vanish; above it the width stays proportional.
    // why: lessons/timeline-strip.md#floor
    const bw = Math.max(2, xb - xa - gap);
    const soft = s.kind === 'vagueness';
    // when.kind: ignorance gets a hard edge and a narrowing link; vagueness is feathered, no link.
    // why: lessons/timeline-strip.md#edges
    const feather = soft ? Math.min(22, Math.max(2, bw * 0.34)) : 0;
    // Small rounded ends (at most a third of the width) so adjacent slices stay separate things.
    // why: lessons/timeline-strip.md#radius
    const rad = Math.min(2, bw / 3, barH / 3);
    // The label's ink follows the bar's drawn alpha, or vague (0.30) bars get dark ink on dark.
    // why: lessons/timeline-strip.md#label-ink
    let drawnAlpha = 0;
    const band = (a0, x0 = xa, w0 = bw) => {
      // `drawnAlpha` includes the dim, since the label ink reads it.
      // why: lessons/timeline-strip.md#drawn-alpha
      const alpha = a0 * dim;
      drawnAlpha = Math.max(drawnAlpha, alpha);
      ctx.globalAlpha = alpha; ctx.fillStyle = col;
      if (!feather) {
        if (rad > 0.5 && ctx.roundRect) {
          ctx.beginPath(); ctx.roundRect(x0, y, w0, barH, rad); ctx.fill();
        } else ctx.fillRect(x0, y, w0, barH);
        return;
      }
      const g = ctx.createLinearGradient(x0, 0, x0 + w0, 0);
      const f = Math.min(0.49, feather / w0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(f, col);
      g.addColorStop(1 - f, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x0, y, w0, barH);
    };

    if (st === 'crisp') {
      // attested at both ends: one tone, full strength, hard edges. It is not a
      // smear and must not borrow a smear's ink.
      band(L.allSkirt ? TONE.skirt : TONE.crisp);
    } else if (st === 'unanswerable') {
      // Excluded and reported: a ghost outline, visible and never an answer.
      // why: lessons/timeline-strip.md#ghost
      band(TONE.ghost);
      ctx.globalAlpha = 0.55 * dim; ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.strokeRect(xa + 0.5, y + 0.5, Math.max(1, bw - 1), barH - 1);
    } else {
      // AMBIGUATION (Gschwandtner et al. 2016): lighter tone = the possible
      // flanks. This is the skirt, and it is the whole bracket.
      band(TONE.skirt);
      if (st === 'core' && !L.allSkirt) {
        // …and the saturated core, the ONE place a saturated rectangle is true.
        const ia = x(s.innerFrom), ib = x(s.innerTo);
        ctx.globalAlpha = TONE.core * dim; ctx.fillStyle = col;
        ctx.fillRect(ia, y, Math.max(1.5, ib - ia), barH);
      } else if (st === 'outer' && !L.allSkirt) {
        // An empty core degenerates ambiguation to one tone, so draw an error bar over the outer
        // bracket.
        // why: lessons/timeline-strip.md#empty-core
        const my = y + barH / 2;
        const cap = Math.max(3, barH * 0.34);
        ctx.globalAlpha = TONE.bar * dim; ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        // Caps assert outer bounds as facts, so ignorance only; vagueness gets a fading rule, no
        // caps.
        // why: lessons/timeline-strip.md#caps
        ctx.beginPath();
        if (soft) {
          const g = ctx.createLinearGradient(xa, 0, xb, 0);
          const f = Math.min(0.49, feather / Math.max(1, bw));
          g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(f, col);
          g.addColorStop(1 - f, col); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.strokeStyle = g;
          ctx.moveTo(xa, my); ctx.lineTo(xb, my);
        } else {
          ctx.strokeStyle = col;
          ctx.moveTo(xa + 0.75, my); ctx.lineTo(xb - 0.75, my);
          ctx.moveTo(xa + 0.75, my - cap); ctx.lineTo(xa + 0.75, my + cap);
          ctx.moveTo(xb - 0.75, my - cap); ctx.lineTo(xb - 0.75, my + cap);
        }
        ctx.stroke();
      }
      // IGNORANCE gets its hard terminators and its affordance; VAGUENESS gets
      // neither, and the feathered band above already said why.
      if (!soft && s.smeared && bw > 3) {
        ctx.globalAlpha = 0.75 * dim; ctx.strokeStyle = col; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xa + 0.5, y); ctx.lineTo(xa + 0.5, y + barH);
        ctx.moveTo(xb - 0.5, y); ctx.lineTo(xb - 0.5, y + barH);
        ctx.stroke();
        // the "narrow this" affordance: a 4 px caret at the head of the band.
        // Present ONLY for ignorance, because only ignorance can be repaired.
        if (L.narrowable !== false && bw > 16 && barH >= 7) {
          ctx.globalAlpha = 0.9 * dim; ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(xa + 2, y + 1); ctx.lineTo(xa + 6, y + 1); ctx.lineTo(xa + 2, y + 5);
          ctx.closePath(); ctx.fill();
        }
      }
    }
    ctx.setLineDash([]);
    // A derived row is hatched at its tier, on top.
    // why: lessons/timeline-strip.md#tratteggio
    if (prov) {
      ctx.globalAlpha = 0.9 * dim; ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.setLineDash(hatchFor(prov.tier) || [3, 3]);
      ctx.strokeRect(xa + 0.5, y + 0.5, Math.max(1, xb - xa - 1), barH - 1);
      ctx.setLineDash([]);
    }
    if (s.open) {                                                   // feathered right edge
      const g = ctx.createLinearGradient(xb - 24, 0, xb, 0);
      g.addColorStop(0, col); g.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.5 * dim; ctx.fillStyle = g; ctx.fillRect(xb - 24, y, 24, barH);
    }
    // The one in hand gets a hairline on its own edge (rows are 2 px apart), before the label.
    // why: lessons/timeline-strip.md#ring
    if (isCur) {
      // The edge and fill behind the label are the bar's own colour, a solid block.
      // why: lessons/timeline-strip.md#solid
      ctx.globalAlpha = 0.92; ctx.fillStyle = col;
      if (rad > 0.5 && ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(xa, y, Math.max(1, bw), barH, rad); ctx.fill();
      } else ctx.fillRect(xa, y, Math.max(1, bw), barH);
      drawnAlpha = 0.92;
    }
    // `labelOf` gets the bar's width, so a narrow span can still choose a label.
    // why: lessons/timeline-strip.md#label-width
    if (L.labels !== false && xb - xa > 30 && barH >= 9) {
      // Dark ink on a solid bar, light ink on a faint one. 0.55 is between the
      // skirt (0.30) and everything else (0.85 and up), so the choice is never
      // close.
      ctx.globalAlpha = 0.95 * (anyCur && !isCur ? DIM_LABEL : 1);
      ctx.fillStyle = drawnAlpha >= 0.55 ? '#04121a' : '#dfe6ea';
      // 11 px, not 10: diacritics go first at 10.
      // why: lessons/timeline-strip.md#label-size
      ctx.font = `11px ${mono()}`;
      // Top-left, vertically centred on the bar's actual height.
      // why: lessons/timeline-strip.md#label-place
      ctx.textBaseline = 'middle';
      ctx.fillText(String(L.labelOf ? L.labelOf(s, { bw }) : s.key), xa + 8, y + barH / 2 + 0.5);
      ctx.textBaseline = 'alphabetic';
    }
  }
  ctx.restore();
  if (L.aggregate) drawAoristic(ctx, L, C, spans);
});

// The aggregate as height, a step per pixel column with no interpolation between bins, with the
// method (bin width, count, peak value) stated on the canvas. Pair with a rug.
// why: lessons/timeline-strip.md#draw-aoristic
function drawAoristic(ctx, L, C, spans) {
  const cols = Math.max(1, Math.round(C.width));
  const a = aoristic(spans, C.t0, C.t1, cols);
  L._aoristic = a;
  if (!a.max) return;
  const h = L.bars === false ? L.height - 16 : Math.min(L.height * 0.45, 26);
  const base = L.y + L.height - 1;
  ctx.save();
  ctx.globalAlpha = 0.55; ctx.fillStyle = L.aggregateColor || '#5b6c86';
  ctx.beginPath(); ctx.moveTo(0, base);
  for (let i = 0; i < cols; i++) {
    const top = base - (a.mass[i] / a.max) * h;
    ctx.lineTo(i, top); ctx.lineTo(i + 1, top);            // STEP, never a ramp
  }
  ctx.lineTo(cols, base); ctx.closePath(); ctx.fill();
  // the rug: one hairline per individual at its EARLIEST bound, so the curve can
  // never claim a population the rows do not have.
  if (L.rug !== false) {
    ctx.globalAlpha = 0.5; ctx.strokeStyle = L.aggregateColor || '#5b6c86'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const s of spans) {
      const px = Math.round(C.x(s.from)) + 0.5;
      if (px < 0 || px > cols) continue;
      ctx.moveTo(px, base - 3); ctx.lineTo(px, base);
    }
    ctx.stroke();
  }
  if (L.aggregateLegend !== false && L.height >= 26 && C.width > 210) {
    ctx.globalAlpha = 0.8; ctx.fillStyle = '#8f9bb0';
    ctx.font = `9px ${mono()}`;
    // Plain words on the canvas; clauses drop from the end until the line fits (the formula is in
    // `a.method`).
    // why: lessons/timeline-strip.md#legend
    const head = 'how likely each moment is';
    const from = `, from ${a.counted} dated ranges`;
    const per = `, ${C.calendar ? calendarSpan(a.colMs) : fmtDur(a.colMs)} a pixel`;
    const drop = a.open ? `, ${a.open} with no end left out` : '';
    const room = C.width - 6;
    const line = [head + from + per + drop, head + from + per, head + from, head]
      .find((s) => ctx.measureText(s).width <= room);
    if (line) ctx.fillText(line, 3, base - h - 2);
  }
  ctx.restore();
}

// The polyline: attested rows plus edge samples when sparse, a per-column min/max envelope when
// dense.
// Hatched when tier >= 1.
// why: lessons/timeline-strip.md#continuous
registerRenderer('continuous', (ctx, L, C) => {
  const { x, style } = C;
  const val = L.value || ((p) => (typeof p === 'number' ? p : p && (p.value ?? p.y ?? p.x)));
  const rows = C.rows;
  const lo = L.min ?? C.autoMin, hi = L.max ?? C.autoMax;
  const span = (hi - lo) || 1;
  const y = (v) => L.y + L.height - 3 - ((v - lo) / span) * (L.height - 6);
  const dense = rows.length > C.width * 2;
  if (dense) {
    ctx.save();
    ctx.globalAlpha = style.alpha ?? 0.8; ctx.strokeStyle = style.color; ctx.lineWidth = 1;
    if (style.dash) ctx.setLineDash(style.dash);
    ctx.beginPath();
    let col = -1, mn = Infinity, mx = -Infinity;
    const flush = () => { if (col >= 0 && mn <= mx) { ctx.moveTo(col + 0.5, y(mn)); ctx.lineTo(col + 0.5, y(mx)); } };
    for (const r of rows) {
      const c = Math.round(x(r.at));
      const v = val(r.payload);
      if (!Number.isFinite(v)) continue;
      if (c !== col) { flush(); col = c; mn = mx = v; }
      else { if (v < mn) mn = v; if (v > mx) mx = v; }
    }
    flush(); ctx.stroke(); ctx.restore();
    return;
  }
  const pts = [];
  const edge = (t) => {
    if (!C.deck.sampleAt || L.kind === undefined) return null;
    try { const p = C.deck.sampleAt(L.kind, t, { evidence: C.evidence }); const v = val(p); return Number.isFinite(v) ? { x: x(t), y: y(v) } : null; }
    catch { return null; }
  };
  // The line stops where the data stops; `edge` samples only when rows extend past the window.
  // `L.span` overrides the extent.
  // why: lessons/timeline-strip.md#data-ends
  const first = rows.length ? rows[0].at : null;
  const last = rows.length ? rows[rows.length - 1].at : null;
  const from = L.span?.[0] ?? first;
  const to = L.span?.[1] ?? last;
  if (from !== null && from < C.t0) { const a = edge(C.t0); if (a) pts.push(a); }
  for (const r of rows) { const v = val(r.payload); if (Number.isFinite(v)) pts.push({ x: x(r.at), y: y(v) }); }
  if (to !== null && to > C.t1) { const b = edge(C.t1); if (b) pts.push(b); }
  strokePoly(ctx, pts, style);
  if (L.dots !== false && rows.length < C.width / 6) {
    ctx.save(); ctx.fillStyle = style.color; ctx.globalAlpha = 0.9;
    for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
});

// A peaks array as a mirrored envelope, one column per pixel.
// why: lessons/timeline-strip.md#waveform
registerRenderer('waveform', (ctx, L, C) => {
  const { x, style } = C;
  const mid = L.y + L.height / 2, half = L.height / 2 - 2;
  ctx.save();
  ctx.fillStyle = style.color; ctx.globalAlpha = style.alpha ?? 0.75;
  for (const r of C.rows) {
    const peaks = L.peaks ? L.peaks(r) : (r.payload && (r.payload.peaks || r.payload.waveform));
    if (!peaks || !peaks.length) continue;
    const durMs = (L.durOf ? L.durOf(r) : (r.payload && (r.payload.durMs ?? r.payload.dur))) || 0;
    if (!durMs) continue;
    const x0 = x(r.at), x1 = x(r.at + durMs);
    const c0 = Math.max(0, Math.floor(x0)), c1 = Math.min(C.width, Math.ceil(x1));
    for (let c = c0; c < c1; c++) {
      const u = (c - x0) / (x1 - x0);
      const i0 = Math.floor(u * peaks.length);
      const i1 = Math.max(i0 + 1, Math.floor(((c + 1 - x0) / (x1 - x0)) * peaks.length));
      let m = 0;
      for (let i = i0; i < i1 && i < peaks.length; i++) { const v = Math.abs(peaks[i]); if (v > m) m = v; }
      const hgt = Math.max(0.5, m * half);
      ctx.fillRect(c, mid - hgt, 1, hgt * 2);
    }
  }
  ctx.restore();
});

// ---------------------------------------------------------------------------
// createStrip
// ---------------------------------------------------------------------------

// createStrip(canvas, deck, opts): the strip owns the canvas. opts: lanes (queries: kind, filter,
// as,
// render), view, evidence, follow, playhead (false for a map), onSeek, onHover, hud.
// why: lessons/timeline-strip.md#create-strip
export function createStrip(canvas, deck, opts = {}) {
  const ctx = canvas.getContext('2d');
  const S = {
    lanes: [], view: { originTime: 0, pxPerSecond: 20, scrollX: 0 },
    evidence: opts.evidence !== undefined ? opts.evidence : undefined,
    // Certainty defaults rather than throws: silence widens the net, it does not fabricate.
    // why: lessons/timeline-strip.md#certainty
    certainty: opts.certainty || 'possible',
    follow: opts.follow !== false, followEdge: opts.followEdge ?? 0.82, followBack: opts.followBack ?? 0.28,
    // WHAT follow tracks. null means the playhead, which is every page that
    // has ever used this. See the comment over `followPos`.
    followTarget: opts.followTarget || null,
    userScrolled: false, dragging: false, hover: null, pos: 0,
    wallAnchor: null,                 // {pos, wall}, the dual cursor's origin; why: lessons/timeline-strip.md#wall-anchor
    width: 0, height: 0, dpr: 1,
    dirty: true, raf: 0, disposed: false,
    spanCache: new Map(), cacheGen: -1,
    errors: [],
    theme: {
      bg: '#0b0d12', axis: '#232838', axisMinor: '#181c27', ink: '#c9d2e4', dim: '#7a8291',
      playhead: '#ffffff', wall: '#ff9f43', lane: '#151a24', gutter: '#0f1319',
      // The loop's grey is the wave's (`--dim2`), so one state has one colour.
      // why: lessons/timeline-strip.md#loop-grey
      loop: '#6a7280',
      // An inactive lane's opacity, from the kit's `--ctl-off`; this is the fallback.
      // why: lessons/timeline-strip.md#off
      off: 0.55,
      ...(opts.theme || {}),
    },
    gutterPx: opts.gutter ?? 92,
    gutterBase: opts.gutter ?? 92,
    // The gutter is measured from its text, bounded by `gutterBase` and `gutterMaxFrac`; a fixed 46
    // px
    // truncated every label on a phone. `narrowAt`/`gutterNarrow` do nothing now.
    // why: lessons/timeline-strip.md#gutter
    gutterMaxFrac: opts.gutterMaxFrac ?? 0.42,
    gutterKey: null,
    axisH: opts.axisHeight ?? 20,
    // is the position domain absolute wall ms (replay-grid) or 0-based (jam)?
    absolute: opts.absolute !== undefined ? opts.absolute : !!(deck.range && deck.range[0] > 1e12),
    // CALENDAR AXIS: ruled in real years, months and days rather than in ms
    // multiples (see `calendarLOD`). Opt in, and only for an absolute domain.
    calendar: !!opts.calendar,
    // Live run mode (see `startLive`); null unless asked.
    // why: lessons/timeline-strip.md#live
    live: opts.live ? { from: 0, minSpan: 8000, ...(typeof opts.live === 'object' ? opts.live : {}),
                        started: false, running: false, held: false } : null,
    // MINIMUM SEPARATION (see BIN_GAP_PX): off unless asked, on under `live`.
    bin: opts.bin !== undefined ? !!opts.bin : !!opts.live,
  };
  const T = S.theme;

  // -- lanes as queries ------------------------------------------------------
  function setLanes(list) {
    S.lanes = (list || []).map((l, i) => {
      const L = {
        id: l.id || l.kind || `lane-${i}`,
        // 24 px default: a name and one number.
        // why: lessons/timeline-strip.md#height
        height: l.height ?? 24,
        as: l.as || null,
        show: l.show !== false,
        ...l,
      };
      // What the page asked for, kept apart from `height`, because an
      // `autoHeight` strip raises `height` to what the gutter needs (see
      // `gutterNeed`) and must be able to lower it again when the lines go.
      L._askedH = L.height;
      return L;
    });
    S.spanCache.clear(); S.cacheGen = -1;
    layout();
    invalidate();
    return S.lanes;
  }
  function layout() {
    // Sized here, not in resize(): pages set labels later. Cached on the text, the only honest
    // trigger.
    // why: lessons/timeline-strip.md#gutter-here
    const key = `${S.width}|${S.lanes.map((L) => (L.show ? `${L.label ?? L.id}\u0001${subLabelsOf(L).join('\u0002')}\u0001${[].concat(L.gutterReserve ?? []).join('\u0002')}` : '')).join('\u0003')}`;
    if (key !== S.gutterKey) { S.gutterKey = key; S.gutterPx = gutterWidthFor(S.width); }
    // On an `autoHeight` strip a lane is as tall as its description plus GUT_AIR above and below.
    // A fixed-height strip keeps the asked height.
    // why: lessons/timeline-strip.md#lane-height
    for (const L of S.lanes) {
      const asked = L._askedH ?? L.height;
      L.height = opts.autoHeight && L.show ? Math.max(asked, gutterNeed(L)) : asked;
    }
    let y = S.axisH;
    for (const L of S.lanes) { L.y = y; if (L.show) y += L.height; }
    // `minHeight` is a floor, never a height; the ground is painted to the canvas bottom.
    // `contentH` is
    // the canvas height and `lanesH` where drawing stops, for checks that sample the picture.
    // why: lessons/timeline-strip.md#min-height
    S.lanesH = y;
    S.contentH = Math.max(y, opts.minHeight || 0);
  }

  // The evidence policy every query resolves to; undefined lets the deck decide.
  // why: lessons/timeline-strip.md#evidence
  const ev = () => S.evidence;

  function rowsFor(L, t0, t1) {
    if (!deck.window) return [];
    const kinds = L.kinds || (L.kind !== undefined ? L.kind : undefined);
    let rows;
    // Forwarded, and a no-op on a span lane (it queries the whole lane), which is why whenState()
    // re-derives the predicate per visible window.
    // why: lessons/timeline-strip.md#certainty-knob
    const q = {};
    if (ev() !== undefined) q.evidence = ev();
    if (S.certainty !== 'possible') q.certainty = S.certainty;
    try { rows = deck.window(kinds, t0, t1, Object.keys(q).length ? q : undefined); }
    catch (e) { note(L.id, e); return []; }
    if (L.filter) rows = rows.filter(L.filter);
    if (L.rows) rows = L.rows(rows);              // last-mile client shaping
    return rows;
  }

  // Span lanes pair before they virtualize: query the whole lane once and cache; invalidated by the
  // deck's rangeGen, an evidence change and strip.invalidate().
  // why: lessons/timeline-strip.md#spans-for
  function spansFor(L) {
    const gen = `${deck.rangeGen ? deck.rangeGen() : 0}|${JSON.stringify(ev() ?? null)}|${S.certainty}|${L.gen || 0}`;
    const hit = S.spanCache.get(L.id);
    if (hit && hit.gen === gen) return hit.spans;
    const spans = spansOf(rowsFor(L, -Infinity, Infinity), L);
    S.spanCache.set(L.id, { gen, spans });
    return spans;
  }

  /** the three answers of `necessary` plus the crisp case, tallied over the
   *  CURRENT window. Shared by the API and by the readout, because the count in
   *  the quality line and the count a test reads must be one computation. */
  function spanStatesOf(L) {
    const t0 = tAt(0), t1 = tAt(plotW());
    const spans = spansFor(L).filter((s) => !s.point && (Number.isFinite(s.to) ? s.to : t1) >= t0 && s.from <= t1);
    const o = { n: spans.length, crisp: 0, core: 0, outer: 0, unanswerable: 0, ignorance: 0, vagueness: 0, smeared: 0, window: [t0, t1] };
    for (const s of spans) {
      o[whenState(s, t0, t1)]++;
      if (s.smeared) { o.smeared++; if (s.kind === 'ignorance') o.ignorance++; else if (s.kind === 'vagueness') o.vagueness++; }
    }
    return o;
  }
  const isSpanLane = (L) => (L.as || autoKind(L)) === 'spans';

  function note(where, e) {
    const msg = `${where}: ${e && e.message ? e.message : e}`;
    if (!S.errors.includes(msg)) S.errors.push(msg);
  }

  // -- the view window -------------------------------------------------------
  // x(t) = (t - originTime)/1000 * pxPerSecond - scrollX,  in CONTENT px
  // (the gutter is a translate, not part of the mapping).
  const x = (t) => ((t - S.view.originTime) / 1000) * S.view.pxPerSecond - S.view.scrollX;
  const tAt = (px) => S.view.originTime + ((px + S.view.scrollX) / S.view.pxPerSecond) * 1000;
  const plotW = () => Math.max(1, S.width - S.gutterPx);

  // Zoom-in ceiling from IEEE-754: stop where a pixel is finer than one step of the position domain
  // (0.0153 px/s at 13.8 Gyr, 4.10e6 at a 2026 epoch). `maxSpan` (ms) bounds zoom-out, off by
  // default.
  // why: lessons/timeline-strip.md#zoom-bounds
  function floorPps() {
    const span = typeof opts.maxSpan === 'function' ? opts.maxSpan() : opts.maxSpan;
    return Number.isFinite(span) && span > 0 ? (plotW() * 1000) / span : 0;
  }
  function capPps(pps, tAtCursor) {
    const ceil = zoomCeilingPps(tAtCursor);
    const floor = floorPps();
    const capped = Math.max(1e-30, floor, Math.min(pps, 1e7, ceil));
    S.zoom = { pps: capped, wanted: pps, ceilingPps: ceil, ulpMs: ulpMs(tAtCursor),
               clamped: capped < pps * (1 - 1e-12) || capped > pps * (1 + 1e-12),
               floorPps: floor || null,
               by: floor && capped <= floor * (1 + 1e-12) && pps < floor ? 'max-span'
                 : capped >= 1e7 ? 'hard-cap'
                   : capped < 1e7 && ceil <= 1e7 && capped >= ceil * (1 - 1e-12) ? 'float-resolution' : null };
    return capped;
  }
  function setView(v) {
    Object.assign(S.view, v);
    if (!(S.view.pxPerSecond > 0)) S.view.pxPerSecond = 1e-9;
    S.view.pxPerSecond = capPps(S.view.pxPerSecond, S.view.originTime + S.view.scrollX / S.view.pxPerSecond * 1000);
    invalidate();
    return { ...S.view };
  }
  function fit(from, to, { pad = 0.02 } = {}) {
    const r = deck.range || [0, deck.durationMs || 1000];
    let a = from ?? r[0], b = to ?? r[1];
    if (!(b > a)) b = a + 1000;
    const w = b - a, p = w * pad;
    a -= p; b += p;
    return setView({ originTime: a, pxPerSecond: (plotW() * 1000) / (b - a), scrollX: 0 });
  }
  // Frame `t` at a fraction across the view with `span` ms showing; 0.38, left of centre, so most
  // of
  // the view is ahead. fit() still centres a range.
  // why: lessons/timeline-strip.md#frame
  function frame(t, span, at = 0.38) {
    const w = Math.max(1, span);
    return setView({ originTime: t - w * at, pxPerSecond: (plotW() * 1000) / w, scrollX: 0 });
  }
  /** zoom about a screen x, so the point under the cursor stays put */
  function zoomAt(factor, screenX = plotW() / 2) {
    holdLive();
    const t = tAt(screenX);
    const pps = Math.max(1e-9, capPps(S.view.pxPerSecond * factor, t));
    S.view.pxPerSecond = pps;
    S.view.scrollX = ((t - S.view.originTime) / 1000) * pps - screenX;
    invalidate();
    return { ...S.view };
  }

  // Follow pages rather than re-centring, disengages on any user scroll, drag or zoom;
  // setFollow(true) re-engages. It tracks the newest fact (the playhead, or a page's target such as
  // the write head).
  // why: lessons/timeline-strip.md#follow
  function followPos() {
    if (!S.followTarget) return S.pos;
    const t = S.followTarget();
    return Number.isFinite(t) ? t : S.pos;
  }
  function followTick() {
    if (S.live && S.live.started && !S.live.held) return;   // the live fit owns the view
    if (!S.follow || S.userScrolled) return;
    const px = x(followPos()), w = plotW();
    if (px > w * S.followEdge || px < 0) S.view.scrollX += px - w * S.followBack;
  }
  // Pass null to go back to the playhead; a dragged strip stays dragged.
  // why: lessons/timeline-strip.md#follow-target
  function setFollowTarget(fn) {
    S.followTarget = typeof fn === 'function' ? fn : null;
    followTick();
    invalidate();
    return !!S.followTarget;
  }
  function setFollow(on) {
    S.follow = !!on;
    if (on) { S.userScrolled = false; followTick(); }
    opts.onFollowChange && opts.onFollowChange(S.follow, S.userScrolled);
    invalidate();
    return S.follow;
  }
  function disengage() {
    holdLive();
    if (!S.follow || S.userScrolled) return;
    S.userScrolled = true;
    opts.onFollowChange && opts.onFollowChange(S.follow, true);
  }

  // The dual cursor: a wall-clock line beside the playhead; the gap is the pause and rate offset.
  // Never re-anchored implicitly.
  // why: lessons/timeline-strip.md#arm-wall
  function armWall(posMs = deck.position ? deck.position() : 0) {
    S.wallAnchor = { pos: posMs, wall: (typeof performance !== 'undefined' ? performance.now() : Date.now()) };
    invalidate();
    return S.wallAnchor;
  }
  // Put the wall cursor away when what it measured has stopped.
  // why: lessons/timeline-strip.md#disarm-wall
  function disarmWall() {
    S.wallAnchor = null;
    invalidate();
    return null;
  }
  function wallPos() {
    if (!S.wallAnchor) return null;
    if (S.wallAnchor.frozen != null) return S.wallAnchor.frozen;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return S.wallAnchor.pos + (now - S.wallAnchor.wall);
  }
  // Live run (`live: true` or { minSpan, from }): startLive(at) arms the wall cursor as the write
  // head; stopLive() freezes it. A reader's zoom holds the view (double click returns it); binning
  // goes on.
  // why: lessons/timeline-strip.md#start-live
  function startLive(at = 0, o = {}) {
    S.live = { from: 0, minSpan: 8000, ...(S.live || {}), ...o, started: true, running: true, held: false, span: 0 };
    if (opts.bin === undefined) S.bin = true;
    armWall(at);
    return liveState();
  }
  function stopLive() {
    if (!S.live || !S.live.running) return liveState();
    if (S.wallAnchor) S.wallAnchor.frozen = wallPos();
    S.live.running = false;
    invalidate();
    return liveState();
  }
  function holdLive() { if (S.live && S.live.started && !S.live.held) S.live.held = true; }
  function resumeLive() { if (S.live && S.live.held) { S.live.held = false; invalidate(); } return liveState(); }
  function liveState() {
    return S.live ? { from: S.live.from, minSpan: S.live.minSpan, started: S.live.started, running: S.live.running,
                      held: S.live.held, at: wallPos(), span: S.live.span ?? null } : null;
  }
  /** A few pixels of air each side, so the head's triangle is never cut. */
  const LIVE_AIR_PX = 6;
  // The live view steps through LIVE_STEPS spans, zooming out only past LIVE_EDGE, so marks stand
  // still
  // while the cursor walks. The span only grows.
  // why: lessons/timeline-strip.md#live-steps
  const LIVE_EDGE = 0.92;
  function liveSpan(Lv, now) {
    const need = Math.max(Lv.minSpan, (Number.isFinite(now) ? now - Lv.from : 0) / LIVE_EDGE);
    const prev = Lv.span || 0;
    if (prev >= need) return prev;
    return LIVE_STEPS.find((st) => st >= need) ?? Math.ceil(need / LIVE_STEPS.at(-1)) * LIVE_STEPS.at(-1);
  }
  function liveFit() {
    const Lv = S.live;
    if (!Lv || Lv.held) return;
    Lv.span = liveSpan(Lv, Lv.started ? wallPos() : null);
    const pps = capPps(Math.max(1, plotW() - 2 * LIVE_AIR_PX) * 1000 / Lv.span, Lv.from + Lv.span);
    S.view.pxPerSecond = pps;
    S.view.originTime = Lv.from - (LIVE_AIR_PX / pps) * 1000;
    S.view.scrollX = 0;
  }

  // Auto-arming the wall on first play is off unless `armWall: true`: no page wanted it, and on a
  // fixture it only counts how long ago playback stopped.
  // why: lessons/timeline-strip.md#arm-wall-opt
  if (opts.armWall === true && deck.transport && deck.transport.onState) {
    const off = deck.transport.onState((st) => {
      if (st && st.reason === 'play' && !S.wallAnchor) armWall(deck.position());
    });
    S._offState = off;
  }

  // The quality line reports the deck's numbers, never the strip's, and the three-answer tally
  // across visible span lanes.
  // why: lessons/timeline-strip.md#quality
  function visibleStates() {
    const o = { n: 0, crisp: 0, core: 0, outer: 0, unanswerable: 0, smeared: 0, ignorance: 0, vagueness: 0 };
    for (const L of S.lanes) {
      // `bars: false` lanes are skipped, so an aggregate lane does not double-count.
      // why: lessons/timeline-strip.md#count-marks
      if (!L.show || L.bars === false) continue;
      let s = null;
      try { if (!isSpanLane(L)) continue; s = spanStatesOf(L); } catch (e) { note(L.id, e); continue; }
      for (const k of Object.keys(o)) o[k] += s[k];
    }
    return o;
  }
  function readout() {
    const kinds = [...new Set(S.lanes.filter((L) => L.show && L.kind !== undefined).map((L) => L.kind))];
    let acct = null, drift = null, dstats = null;
    try { acct = deck.evidenceAccounting ? deck.evidenceAccounting(kinds.length ? kinds : undefined) : null; } catch (e) { note('accounting', e); }
    try { dstats = deck.driftStats ? deck.driftStats() : (deck.sched && deck.sched.driftStats ? deck.sched.driftStats() : null); } catch (e) { note('driftStats', e); }
    try {
      const rows = deck.drift ? deck.drift() : [];
      if (rows.length) {
        const d = rows.slice(-500).map((r) => Math.abs(r.deltaMs)).sort((a, b) => a - b);
        drift = { n: rows.length, p50: +d[d.length >> 1].toFixed(2), p95: +d[Math.min(d.length - 1, Math.floor(d.length * 0.95))].toFixed(2), max: +d[d.length - 1].toFixed(2) };
      }
    } catch (e) { note('drift', e); }
    const pol = deck.evidence ? deck.evidence() : null;
    let posAcct = null;
    try { posAcct = deck.positionAccounting ? deck.positionAccounting(kinds.length ? kinds : undefined) : null; } catch (e) { note('positionAccounting', e); }
    return {
      policy: (pol && pol.label) || (S.evidence && (typeof S.evidence === 'string' ? S.evidence : `restored(tier<=${S.evidence.restored.maxTier})`)) || 'unset',
      accounting: acct, inventedPct: acct && acct.total ? +(100 * acct.inventedFraction).toFixed(1) : 0,
      // U4's ledger, on the same line as the evidence one: two absences, two
      // axes, both reported or neither.
      certainty: S.certainty, position: posAcct, states: visibleStates(),
      smearedPct: posAcct && posAcct.total ? +(100 * (posAcct.smeared / posAcct.total)).toFixed(1) : 0,
      drift, driftStats: dstats,
      zoom: S.zoom || null, ticks: S.axisTicks || null, gutter: S.gutterPx,
      view: { ...S.view }, lod: tickLOD(S.view.pxPerSecond),
      pos: S.pos, wall: wallPos(), gapMs: wallPos() === null ? null : +(wallPos() - S.pos).toFixed(1),
      follow: S.follow, followEngaged: S.follow && !S.userScrolled,
      // WHERE follow is looking, so a check can tell the two targets apart
      // rather than inferring it from a view that moved.
      followPos: followPos(), followsPlayhead: !S.followTarget,
      live: liveState(), bin: S.bin,
      errors: S.errors.slice(),
    };
  }

  // -- drawing ---------------------------------------------------------------
  function resize() {
    const r = canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(r.width || canvas.width));
    const cssH = Math.max(1, Math.round(r.height || canvas.height));
    S.dpr = Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1);
    if (canvas.width !== Math.round(cssW * S.dpr) || canvas.height !== Math.round(cssH * S.dpr)) {
      canvas.width = Math.round(cssW * S.dpr); canvas.height = Math.round(cssH * S.dpr);
    }
    S.width = cssW; S.height = cssH;
    // the width changed, so the cached decision is stale; `layout()` re-takes it
    S.gutterKey = null;
  }

  // The tick loop is index-based (`first + i*step`), never accumulating (it stalls past 9.313e15
  // ms),
  // and count-bounded by MAX_TICKS, reported when it clamps.
  // why: lessons/timeline-strip.md#max-ticks
  const MAX_TICKS = 4096;
  // A ruler label sits right of its tick, left of it at the plot's edge, and is skipped if it would
  // overlap the previous one.
  // why: lessons/timeline-strip.md#ruler-label
  let labelEnd = -Infinity;
  function tickLabel(s, px) {
    const w = ctx.measureText(s).width;
    let lx = px + 3;
    if (lx + w > plotW()) {
      lx = px - 3 - w;
      if (lx < 0 || lx < labelEnd + 6) return;
    }
    ctx.fillText(s, lx, 10);
    labelEnd = lx + w;
  }
  function drawAxis() {
    const t0 = tAt(0), t1 = tAt(plotW());
    if (calOn(t0, t1)) { drawCalendarAxis(t0, t1); return; }
    const { minor, major, fmt } = tickLOD(S.view.pxPerSecond);
    ctx.save();
    ctx.strokeStyle = T.axisMinor; ctx.lineWidth = 1; ctx.beginPath();
    const firstMinor = Math.ceil(t0 / minor) * minor;
    const nMinor = Math.floor((t1 - firstMinor) / minor) + 1;
    // virtualized: the loop runs over the VISIBLE ticks only, never over the
    // whole timeline. This is why a 40-year archive and a 200 ms MIDI phrase
    // cost the same.
    for (let i = 0; i < nMinor && i < MAX_TICKS; i++) {
      const t = firstMinor + i * minor;
      if (Math.abs(t % major) < minor / 2) continue;
      const px = Math.round(x(t)) + 0.5;
      ctx.moveTo(px, S.axisH - 4); ctx.lineTo(px, S.axisH);
    }
    ctx.stroke();
    ctx.strokeStyle = T.axis; ctx.beginPath();
    ctx.font = `10px ${mono()}`; ctx.fillStyle = T.dim;
    labelEnd = -Infinity;
    const firstMajor = Math.ceil(t0 / major) * major;
    const nMajor = Math.floor((t1 - firstMajor) / major) + 1;
    for (let i = 0; i < nMajor && i < MAX_TICKS; i++) {
      const t = firstMajor + i * major;
      const px = Math.round(x(t)) + 0.5;
      ctx.moveTo(px, 0); ctx.lineTo(px, S.contentH);
      tickLabel(fmt(t, S.absolute), px);
    }
    ctx.stroke();
    ctx.restore();
    S.axisTicks = { minor: Math.max(0, nMinor), major: Math.max(0, nMajor), clamped: nMinor > MAX_TICKS || nMajor > MAX_TICKS };
    if (S.axisTicks.clamped) note('axis', `tick LOD asked for ${Math.max(nMinor, nMajor)} ticks; drew ${MAX_TICKS}. The ladder does not reach this zoom.`);
  }

  // The calendar ruler holds only inside the Date wall. Past it the ms ladder's
  // deep-time regime is the only reading there is, so it falls back to that.
  const calOn = (t0, t1) => S.calendar && Math.abs(t0) <= DATE_WALL_MS && Math.abs(t1) <= DATE_WALL_MS;
  function drawCalendarAxis(t0, t1) {
    const { minor, major } = calendarLOD(S.view.pxPerSecond);
    const majors = calendarTicks(major, t0, t1, MAX_TICKS + 1);
    const minors = minor === major ? [] : calendarTicks(minor, t0, t1, MAX_TICKS + 1);
    const on = new Set(majors);
    ctx.save();
    ctx.strokeStyle = T.axisMinor; ctx.lineWidth = 1; ctx.beginPath();
    for (const t of minors.slice(0, MAX_TICKS)) {
      if (on.has(t)) continue;
      const px = Math.round(x(t)) + 0.5;
      ctx.moveTo(px, S.axisH - 4); ctx.lineTo(px, S.axisH);
    }
    ctx.stroke();
    ctx.strokeStyle = T.axis; ctx.beginPath();
    ctx.font = `10px ${mono()}`; ctx.fillStyle = T.dim;
    labelEnd = -Infinity;
    for (const t of majors.slice(0, MAX_TICKS)) {
      const px = Math.round(x(t)) + 0.5;
      ctx.moveTo(px, 0); ctx.lineTo(px, S.contentH);
      tickLabel(calendarLabel(t, major), px);
    }
    ctx.stroke();
    ctx.restore();
    S.axisTicks = { minor: minors.length, major: majors.length, clamped: minors.length > MAX_TICKS || majors.length > MAX_TICKS, calendar: calendarStep(major) };
    if (S.axisTicks.clamped) note('axis', `calendar ruler asked for more than ${MAX_TICKS} ticks; drew ${MAX_TICKS}.`);
  }

  // One right-hand inset (`gutRoom(x)`) for both the sizer and the clipper, and one left edge for
  // name and numbers (GUT_TEXT_X), clear of the swatch.
  // why: lessons/timeline-strip.md#gutter-insets
  const GUT_TEXT_X = 18, GUT_SWATCH_X = 8, GUT_PAD = 10;
  const gutRoom = (x) => S.gutterPx - x - GUT_PAD;
  // The gutter's line spacing sets the minimum lane height; 11/22 groups the numbers under the
  // name.
  // Some lanes sit exactly at the limit, and `gutterFit()` reports any dropped line.
  // why: lessons/timeline-strip.md#gutter-rhythm
// GUT_SUB_STEP 12, not 10 (lines touched) nor 13 (36 px lanes dropped their last line, silently).
// why: lessons/timeline-strip.md#gut-step
  const GUT_NAME_Y = 11, GUT_SUB_Y = 22, GUT_SUB_STEP = 12;
  // Air above and below a description: 16 px between descriptions against 4 to 5 px inside one.
  // why: lessons/timeline-strip.md#gut-air
  const GUT_AIR = 8;

  /** The gutter face's cap height, measured once from the font rather than
   *  typed, so the description block is measured on its ink. */
  let capH = null;
  function gutCap() {
    if (capH !== null) return capH;
    ctx.save();
    ctx.font = `10px ${mono()}`;
    capH = ctx.measureText('H').actualBoundingBoxAscent || 7;
    ctx.restore();
    return capH;
  }

  // The lines a lane draws under its name; one function for the drawer and gutterNeed.
  // why: lessons/timeline-strip.md#gutter-lines
  function gutterLinesOf(L) {
    const subs = subLabelsOf(L);
    if (subs.length > 1 && ctx.measureText(subs.join(', ')).width <= gutRoom(GUT_TEXT_X)) return [subs.join(', ')];
    return subs;
  }

  /** The description block, cap top of the name to the last line's baseline. */
  const blockH = (n) => gutCap() + (n ? (GUT_SUB_Y - GUT_NAME_Y) + (n - 1) * GUT_SUB_STEP : 0);

  /** How tall a lane must be to hold its description with `GUT_AIR` round it.
   *  A name alone needs 24 at most, which is the default lane, so a lane with
   *  no lines under its name never grows. */
  function gutterNeed(L) {
    ctx.save();
    ctx.font = `10px ${mono()}`;
    const n = gutterLinesOf(L).length;
    ctx.restore();
    return n ? Math.ceil(blockH(n) + 2 * GUT_AIR) : 0;
  }

  // A lane's own lines: the client's numbers, else the derived clock domain; one source for sizer
  // and drawer.
  // why: lessons/timeline-strip.md#sub-labels
  function subLabelsOf(L) {
    const st = L._style || {};
    const caps = (deck.caps && L.kind !== undefined) ? (() => { try { return deck.caps(L.kind); } catch { return null; } })() : null;
    const sub = [];
    if (caps && caps.lane) sub.push(caps.lane);
    else if (caps && caps.domain) sub.push(caps.domain);
    if (caps && caps.audible === false) sub.push('silent');
    if (st.tier) sub.push(`tier ${st.tier}`);
    // `subLabel` replaces the derived line rather than queueing behind it.
    // why: lessons/timeline-strip.md#sub-label
    const client = L.subLabel === undefined || L.subLabel === null ? []
      : [].concat(L.subLabel).filter(Boolean).map(String);
    // Joined with `, `, never a middot.
    // why: lessons/timeline-strip.md#comma
    return client.length ? client : (sub.length ? [sub.join(', ')] : []);
  }

  /** How wide the label column has to be to say what it is for. */
  function gutterWidthFor(cssW) {
    const base = S.gutterBase;
    if (!S.lanes || !S.lanes.length) return base;
    ctx.save();
    ctx.font = `10px ${mono()}`;
    let need = 0;
    for (const L of S.lanes) {
      if (!L.show) continue;
      need = Math.max(need, GUT_TEXT_X + ctx.measureText(String(L.label ?? L.id)).width);
      for (const s of subLabelsOf(L)) need = Math.max(need, GUT_TEXT_X + ctx.measureText(s).width);
      // `gutterReserve`: lines measured and never drawn, so the gutter does not narrow when a count
      // shrinks.
      // why: lessons/timeline-strip.md#reserve
      for (const s of [].concat(L.gutterReserve ?? [])) need = Math.max(need, GUT_TEXT_X + ctx.measureText(String(s)).width);
    }
    ctx.restore();
    // The cap is max(base, fraction), so a narrow canvas never clamps below the base.
    // why: lessons/timeline-strip.md#cap
    const cap = Math.max(base, Math.round(cssW * S.gutterMaxFrac));
    // `ceil`, not `round`: rounding down leaves the widest line a sub-pixel short, and the clipper
    // cuts it.
    // why: lessons/timeline-strip.md#ceil
    return Math.ceil(Math.min(cap, Math.max(base, need + GUT_PAD)));
  }

  function drawGutter() {
    ctx.save();
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    ctx.fillStyle = T.gutter; ctx.fillRect(0, 0, S.gutterPx, S.height);
    ctx.strokeStyle = T.axis; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(S.gutterPx + 0.5, 0); ctx.lineTo(S.gutterPx + 0.5, S.height); ctx.stroke();
    ctx.font = `10px ${mono()}`;
    // Truncate by measurement, against the inset the text actually has.
    // why: lessons/timeline-strip.md#truncate
    const TEXT_X = GUT_TEXT_X, SWATCH_X = GUT_SWATCH_X;
    const clip = (s, avail) => {
      if (ctx.measureText(s).width <= avail) return s;
      let n = s.length;
      while (n > 1 && ctx.measureText(s.slice(0, n) + '…').width > avail) n--;
      return s.slice(0, n) + '…';
    };
    for (const L of S.lanes) {
      if (!L.show) continue;
      const st0 = L._style || {};
      // A lane that colours its own marks and names no colour shows its swatch and name in ink.
      // why: lessons/timeline-strip.md#per-row
      const perRow = !L.color && !!(L.colorOf || L.colorOfRow || L.byKey || L.render
        || (L.aggregate && L.bars === false));
      const st = perRow ? { ...st0, color: undefined } : st0;
      // A lane that is not active right now (`setActive`) dims its whole
      // description by the theme's `off`, the same factor its marks get.
      const k = L.active === false ? (T.off ?? 0.55) : 1;
      const all = gutterLinesOf(L);
      const nameOnly = all.length === 0;
      const name = clip(String(L.label ?? L.id), gutRoom(TEXT_X));
      const cap = gutCap();
      // The swatch spans the whole description, cap top to last baseline, centred in the lane. A
      // lane too
      // short for it keeps the name at GUT_NAME_Y and drops lines as before.
      // why: lessons/timeline-strip.md#swatch
      let nameY, swatchY, swatchH;
      if (nameOnly) {
        // A one-line lane is centred on its swatch by the font's ascent.
        // why: lessons/timeline-strip.md#one-line
        swatchH = 9;
        swatchY = L.y + Math.round((L.height - swatchH) / 2);
        const asc = ctx.measureText(name).actualBoundingBoxAscent || 7;
        nameY = swatchY + swatchH / 2 + asc / 2;
      } else {
        const bh = blockH(all.length);
        nameY = L.height >= bh + 2 * GUT_AIR
          ? L.y + Math.round((L.height - bh) / 2) + cap
          : L.y + GUT_NAME_Y;
      }
      // The name carries the lane's colour mixed toward the ink: identity at a fraction, legibility
      // first.
      // why: lessons/timeline-strip.md#name-colour
      ctx.fillStyle = st.color
        ? `color-mix(in oklab, ${st.color} 42%, ${T.ink})`
        : T.ink;
      ctx.globalAlpha = k;
      ctx.fillText(name, TEXT_X, nameY);
      // the per-lane label GUTTER states the lane's own clock and whether it is
      // AUDIBLE, or the client's own numbers (`subLabel`), joined onto one line
      // where they fit side by side (`gutterLinesOf`).
      ctx.fillStyle = T.dim; ctx.globalAlpha = 0.8 * k;
      // What did not fit is recorded for gutterFit(); lines are cut, never ellipsized.
      // why: lessons/timeline-strip.md#dropped
      let shown = 0, lastY = nameY;
      for (let i = 0; i < all.length; i++) {
        const y = nameY + (GUT_SUB_Y - GUT_NAME_Y) + i * GUT_SUB_STEP;
        if (y > L.y + L.height - 2) break;         // never spill into the next lane
        ctx.fillText(clip(all[i], gutRoom(TEXT_X)), TEXT_X, y);
        shown++; lastY = y;
      }
      if (!nameOnly) { swatchY = Math.round(nameY - cap); swatchH = Math.max(4, Math.round(lastY - swatchY)); }
      ctx.fillStyle = st.color || T.ink; ctx.globalAlpha = 0.9 * k;
      ctx.fillRect(SWATCH_X, swatchY, 3, Math.max(4, swatchH));
      L._gutterFit = {
        lines: all.length, shown, dropped: all.length - shown,
        // Where the description landed, relative to the lane's own top, so a
        // check can measure the bar against the block and the row it labels.
        box: {
          lane: L.height,
          swatch: [swatchY - L.y, swatchY - L.y + Math.max(4, swatchH)],
          text: [+(nameY - L.y - (nameOnly ? (ctx.measureText(name).actualBoundingBoxAscent || 7) : cap)).toFixed(1), +(lastY - L.y).toFixed(1)],
        },
      };
      ctx.globalAlpha = 1;
    }
    // How wide the view is, in the gutter's ruler row against the plot edge.
    // why: lessons/timeline-strip.md#zoom-readout
    const zt = zoomText();
    if (zt) {
      ctx.font = `9px ${mono()}`;
      const w = ctx.measureText(zt).width;
      if (w <= S.gutterPx - SWATCH_X - GUT_PAD) {
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = T.dim || '#8b93a1';
        ctx.fillText(zt, S.gutterPx - GUT_PAD - w, 10);
      }
    }
    ctx.restore();
  }

  // "<span> in view", right-aligned in the gutter on the ruler's baseline, drawn with the transform
  // reset; none if the gutter is too narrow. `zoomReadout: false` turns it off.
  // why: lessons/timeline-strip.md#zoom-text
  function zoomText() {
    if (opts.zoomReadout === false) return '';
    const span = (plotW() * 1000) / S.view.pxPerSecond;
    const U = [[31556952e3, 'y'], [2629746e3, 'mo'], [604800e3, 'w'], [86400e3, 'd'],
               [3600e3, 'h'], [60e3, 'min'], [1000, 's']];
    const [div, unit] = U.find(([n]) => span >= n) || [1, 'ms'];
    const n = span / div;
    return `${n < 10 ? n.toFixed(1) : Math.round(n)} ${unit} in view`;
  }

  // The loop on the line, from `deck.loopView`: armed draws one edge and a wash to the playhead, on
  // draws two edges, off nothing. Wash under the lanes, edges over them. `loop: false` turns it
  // off.
  // why: lessons/timeline-strip.md#loop-now
  function loopNow() {
    if (opts.loop === false) return null;
    const v = deck.loopView;
    if (!v || v.a == null) return null;
    const on = v.b != null;
    const far = on ? v.b : S.pos;
    return { on, at: v.a, from: Math.min(v.a, far), to: Math.max(v.a, far) };
  }

  function drawLoopBand(g) {
    const L = loopNow();
    if (!L) return;
    const ax = x(L.from), bx = x(L.to);
    if (!(bx - ax > 0.5)) return;
    g.save();
    // 0.12 is the wave's own alpha for this band, not a number chosen here.
    g.globalAlpha = 0.12; g.fillStyle = T.loop;
    g.fillRect(ax, 0, bx - ax, S.contentH);
    g.restore();
  }

  function drawLoopEdges(g) {
    const L = loopNow();
    if (!L) return;
    const w = plotW();
    g.save();
    g.strokeStyle = T.loop; g.lineWidth = 1; g.globalAlpha = 1; g.setLineDash([]);
    for (const t of L.on ? [L.from, L.to] : [L.at]) {
      const px = Math.round(x(t)) + 0.5;
      if (px < -1 || px > w + 1) continue;
      g.beginPath(); g.moveTo(px, 0); g.lineTo(px, S.contentH); g.stroke();
    }
    g.restore();
  }

  function drawCursors() {
    const w = plotW();
    ctx.save();
    const wp = wallPos();
    if (S.live) {
      // LIVE: the write head is the cursor, in the playhead's shape and ink,
      // and nothing else is drawn. Before the run starts there is no head.
      if (wp !== null) {
        const wx = Math.round(x(wp)) + 0.5;
        if (wx >= -1 && wx <= w + 1) {
          ctx.globalAlpha = 1; ctx.strokeStyle = T.playhead; ctx.lineWidth = 1.5; ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(wx, 0); ctx.lineTo(wx, S.contentH); ctx.stroke();
          ctx.fillStyle = T.playhead;
          ctx.beginPath(); ctx.moveTo(wx - 4, 0); ctx.lineTo(wx + 4, 0); ctx.lineTo(wx, 6); ctx.closePath(); ctx.fill();
        }
      }
      ctx.restore();
      return;
    }
    if (wp !== null && opts.wallStyle === 'head') {
      // An armed wall drawn as a second playhead (a recording head) in the wall colour.
      // why: lessons/timeline-strip.md#record-head
      const wx = Math.round(x(wp)) + 0.5;
      if (wx >= -1 && wx <= w + 1) {
        ctx.globalAlpha = 1; ctx.strokeStyle = T.wall; ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(wx, 0); ctx.lineTo(wx, S.contentH); ctx.stroke();
        ctx.fillStyle = T.wall;
        ctx.beginPath(); ctx.moveTo(wx - 4, 0); ctx.lineTo(wx + 4, 0); ctx.lineTo(wx, 6); ctx.closePath(); ctx.fill();
      }
    } else if (wp !== null) {
      const wx = x(wp);
      if (wx >= -1 && wx <= w + 1) {
        ctx.strokeStyle = T.wall; ctx.globalAlpha = 0.85; ctx.lineWidth = 1;
        // `wallDash` sets the second cursor's dash.
        // why: lessons/timeline-strip.md#wall-dash
        ctx.setLineDash(opts.wallDash || [4, 3]);
        ctx.beginPath(); ctx.moveTo(Math.round(wx) + 0.5, 0); ctx.lineTo(Math.round(wx) + 0.5, S.contentH); ctx.stroke();
        ctx.setLineDash([]);
      }
      // the GAP is the quantity: draw it as a band between the two lines and
      // label it, because a gap you cannot measure is decoration.
      const px = x(S.pos);
      const gap = Math.abs(wx - px);
      if (gap > 2) {
        ctx.globalAlpha = 0.14; ctx.fillStyle = T.wall;
        ctx.fillRect(Math.min(px, wx), 0, gap, S.axisH);
        // The gap label sits below the axis on its own backing; `wallLabel: false` for a page that
        // prints it.
        // why: lessons/timeline-strip.md#wall-label
        if (gap > 34 && opts.wallLabel !== false) {
          ctx.font = `9px ${mono()}`;
          const lbl = `${((wp - S.pos) / 1000).toFixed(2)} s`;
          const w = ctx.measureText(lbl).width + 6;
          const lx = Math.min(Math.max(0, Math.min(px, wx) + gap / 2 - w / 2), Math.max(0, S.width - S.gutterPx - w));
          ctx.globalAlpha = 0.92; ctx.fillStyle = 'rgba(8,10,16,.85)';
          ctx.fillRect(lx, S.axisH + 1, w, 11);
          ctx.fillStyle = T.wall;
          ctx.fillText(lbl, lx + 3, S.axisH + 9.5);
        }
      }
    }
    // The span readout is drawn by `drawGutter()`, in the gutter's axis row.
    // See `zoomText()` for why it moved out of here.

    // `playhead: false` for a strip that is a map: a sweeping line reads as everything it crosses
    // sounding.
    // `currentOf` says which bar is in hand.
    // why: lessons/timeline-strip.md#no-playhead
    if (opts.playhead !== false) {
      const px = Math.round(x(S.pos)) + 0.5;
      ctx.globalAlpha = 1; ctx.strokeStyle = T.playhead; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, S.contentH); ctx.stroke();
      ctx.fillStyle = T.playhead;
      ctx.beginPath(); ctx.moveTo(px - 4, 0); ctx.lineTo(px + 4, 0); ctx.lineTo(px, 6); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function laneContext(L, t0, t1) {
    const style = L._style = styleFor(deck, L.kind, {
      color: L.color, width: L.width, alpha: L.alpha, dash: L.dash,
    });
    const C = {
      deck, x, tAt, t0, t1, width: plotW(), pos: S.pos, evidence: ev(), style,
      hover: S.hover, view: S.view,
      // the palette, so a renderer that needs to paint a backing uses the
      // lane's OWN background rather than guessing a hex that is right today
      theme: T,
      // so a renderer that states a length (the aggregate's legend) says it
      // in the same units as the ruler above it
      calendar: S.calendar,
      bin: S.bin,
      // whole device pixels for marks on a live strip (see `snapX`)
      snap: !!S.live, dpr: S.dpr,
    };
    const as = L.as || autoKind(L);
    if (as === 'spans') C.spans = spansFor(L).filter((s) => (Number.isFinite(s.to) ? s.to : t1) >= t0 && s.from <= t1);
    else C.rows = rowsFor(L, t0, t1);
    if (as === 'continuous' && (L.min === undefined || L.max === undefined)) {
      const val = L.value || ((p) => (typeof p === 'number' ? p : p && (p.value ?? p.y ?? p.x)));
      let mn = Infinity, mx = -Infinity;
      for (const r of C.rows) { const v = val(r.payload); if (Number.isFinite(v)) { if (v < mn) mn = v; if (v > mx) mx = v; } }
      if (!Number.isFinite(mn)) { mn = 0; mx = 1; }
      if (mn === mx) { mn -= 1; mx += 1; }
      C.autoMin = L._mn = mn; C.autoMax = L._mx = mx;
    }
    C.as = as;
    return C;
  }

  // A lane that does not say what it is asks the deck's adapter (continuous, spans, else ticks).
  // why: lessons/timeline-strip.md#auto-kind
  function autoKind(L) {
    if (L._as) return L._as;                                  // probed once, not once a frame
    if (L.render) return (L._as = 'custom');
    if (L.phase || L.span || L.slotOf) return (L._as = 'spans');  // a declared pairing IS the declaration
    if (L.kind !== undefined && deck.caps) {
      try {
        const c = deck.caps(L.kind) || {};
        if (c.continuous) return (L._as = 'continuous');
        if (c.waveform || c.peaks) return (L._as = 'waveform');
      } catch { /* no adapter for this kind: fall through */ }
    }
    const probe = rowsFor(L, -Infinity, Infinity).slice(0, 4);
    if (!probe.length) return 'ticks';                        // nothing to probe yet: retry next frame
    if (probe.some((r) => r.payload && (r.payload.phase || r.payload.when || Number.isFinite(r.payload.durMs)))) return (L._as = 'spans');
    if (probe.some((r) => r.payload && Array.isArray(r.payload.peaks))) return (L._as = 'waveform');
    return (L._as = 'ticks');
  }

  // One reusable plot-space layer for quietened lanes; with no document the lane draws at full
  // strength.
  // why: lessons/timeline-strip.md#quiet-layer
  let quietCv = null;
  function quietLayer() {
    if (!quietCv) {
      if (typeof document === 'undefined' || !document.createElement) return null;
      quietCv = document.createElement('canvas');
    }
    if (quietCv.width !== canvas.width) quietCv.width = canvas.width;
    if (quietCv.height !== canvas.height) quietCv.height = canvas.height;
    const q = quietCv.getContext('2d');
    q.setTransform(1, 0, 0, 1, 0, 0);
    q.globalAlpha = 1;
    q.clearRect(0, 0, quietCv.width, quietCv.height);
    // Saved before the clip, since setTransform does not undo a clip; the caller restores.
    // why: lessons/timeline-strip.md#save-clip
    q.save();
    q.setTransform(S.dpr, 0, 0, S.dpr, S.gutterPx * S.dpr, 0);
    q.beginPath(); q.rect(0, 0, plotW(), S.height); q.clip();
    return q;
  }

  function draw() {
    if (S.disposed) return;
    resize();
    layout();
    // `autoHeight` sets the canvas to the height layout() computed and re-resizes once for this
    // frame.
    // why: lessons/timeline-strip.md#autofit
    if (opts.autoHeight && Math.abs(parseFloat(canvas.style.height || '0') - S.contentH) > 0.5) {
      canvas.style.height = `${S.contentH}px`;
      resize();
      layout();
    }
    S.pos = deck.position ? deck.position() : 0;
    followTick();
    liveFit();
    if (opts.whole && !S.userScrolled) {
      // `whole: true` keeps the deck's whole range in view at every width, the
      // fixed-length counterpart of `live`.
      const r = deck.range || [0, 1000];
      const key = `${plotW()}|${r[0]}|${r[1]}`;
      if (key !== S.wholeKey) { S.wholeKey = key; fit(); }
    }
    const g = ctx;
    g.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    g.clearRect(0, 0, S.width, S.height);
    g.fillStyle = T.bg; g.fillRect(0, 0, S.width, S.height);
    // everything below draws in PLOT space: the gutter is a translate, so no
    // renderer ever has to know it exists.
    g.save();
    g.translate(S.gutterPx, 0);
    g.beginPath(); g.rect(0, 0, plotW(), S.height); g.clip();
    const t0 = tAt(0), t1 = tAt(plotW());
    // Lane backgrounds first, at full lane height: the old 1 px gap drew a dark rule between lanes.
    // Lanes are told apart by name, swatch and marks; bands alternate at 0.55.
    // why: lessons/timeline-strip.md#bands
    for (const L of S.lanes) {
      if (!L.show) continue;
      g.fillStyle = T.lane; g.globalAlpha = 0.55;
      g.fillRect(0, L.y, plotW(), L.height);
      g.globalAlpha = 1;
    }
    drawLoopBand(g);
    drawAxis();
    // Draw order is fidelity order: higher tiers first, wider and fainter, attested on top.
    // why: lessons/timeline-strip.md#draw-order
    const order = S.lanes.filter((L) => L.show).map((L, i) => ({ L, i }))
      .sort((a, b) => (styleFor(deck, b.L.kind).tier - styleFor(deck, a.L.kind).tier) || a.i - b.i);
    for (const { L } of order) {
      const C = laneContext(L, t0, t1);
      // An inactive lane is drawn on a layer laid down at `off`, since renderers set their own
      // alpha.
      // why: lessons/timeline-strip.md#quiet
      const quiet = L.active === false ? quietLayer() : null;
      const into = quiet || g;
      if (quiet) quiet.font = g.font;
      try {
        if (L.render) L.render(into, L, C);
        else {
          const fn = RENDERERS.get(C.as);
          if (fn) fn(into, L, C);
        }
      } catch (e) { note(L.id, e); }
      if (quiet) {
        quiet.restore();
        g.save();
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalAlpha = T.off ?? 0.55;
        g.drawImage(quiet.canvas, 0, 0);
        g.restore();
      }
    }
    drawLoopEdges(g);
    drawCursors();
    if (S.hover && opts.tooltip !== false) drawTooltip(g);
    g.restore();
    drawGutter();
    if (opts.hud) writeHud();
    S.dirty = false;
  }

  function drawTooltip(g) {
    const h = S.hover;
    if (!h || !h.text) return;
    g.save();
    g.font = `10px ${mono()}`;
    // A line is a string or {text, colour}; a coloured line gets its lane's swatch.
    // why: lessons/timeline-strip.md#tooltip-lines
    const raw = (h.lines || h.text.split('\n')).map((l) => (typeof l === 'string' ? { text: l } : l));
    // Lines wrap at about 40 characters rather than widening the box over the picture; a
    // continuation
    // keeps its colour and drops its swatch.
    // why: lessons/timeline-strip.md#wrap
    const CH = 40;
    const lines = [];
    for (const src of raw) {
      const words = String(src.text).split(' ');
      let cur = '', first = true;
      for (const word of words) {
        const next = cur ? cur + ' ' + word : word;
        if (next.length > CH && cur) {
          lines.push({ ...src, text: cur, colour: first ? src.colour : null });
          first = false;
          cur = word;
        } else cur = next;
      }
      lines.push({ ...src, text: cur, colour: first ? src.colour : null });
    }
    // A 3 px bar, the gutter's own mark.
    // why: lessons/timeline-strip.md#swatch-bar
    const PAD = 9, LH = 13, SW = 3, SH = 9, GAP = 7;
    const swatched = lines.some((l) => l.colour);
    const indent = swatched ? SW + GAP : 0;
    const w = Math.max(...lines.map((l) => g.measureText(l.text).width)) + PAD * 2 + indent;
    const bh = lines.length * LH + PAD * 2 - 3;
    let bx = h.px + 10, by = Math.max(2, h.py - bh - 8);
    if (bx + w > plotW()) bx = h.px - w - 10;
    // Lifted to stay above the bottom edge.
    // why: lessons/timeline-strip.md#lift
    const floor = S.height - 2;
    if (by + bh > floor) by = Math.max(2, floor - bh);
    if (bx < 2) bx = 2;
    g.fillStyle = 'rgba(8,10,16,.94)'; g.strokeStyle = T.axis;
    g.fillRect(bx, by, w, bh); g.strokeRect(bx + 0.5, by + 0.5, w, bh);
    lines.forEach((l, i) => {
      const y = by + PAD + 8 + i * LH;
      if (l.colour) {
        g.fillStyle = l.colour;
        g.fillRect(bx + PAD, y - SH + 1, SW, SH);
      }
      g.fillStyle = l.dim ? T.dim : T.ink;
      // a line with no swatch is not a lane, so it starts at the margin rather
      // than in the column the lanes share
      g.fillText(l.text, bx + PAD + (l.colour ? indent : 0), y);
    });
    g.restore();
  }

  function writeHud() {
    const r = readout();
    const bits = [
      `${(S.pos / 1000).toFixed(3)} s`,
      `${S.view.pxPerSecond >= 1 ? S.view.pxPerSecond.toFixed(1) : S.view.pxPerSecond.toExponential(1)} px/s`,
      `tick ${formatTime(r.lod.major, r.lod.major)}`,
      r.gapMs === null ? null : `wall gap ${(r.gapMs / 1000).toFixed(2)} s`,
      r.accounting && r.accounting.restored ? `${r.inventedPct}% invented` : null,
      r.position && r.position.smeared ? `${r.smearedPct}% smeared (${r.position.withInner}/${r.position.smeared} with a core)` : null,
      `evidence ${r.policy}`,
      r.certainty === 'possible' ? null : `certainty ${r.certainty}`,
      r.states && r.states.smeared
        ? `in view: ${r.states.core} core · ${r.states.outer} outer-sound · ${r.states.unanswerable} UNDECIDABLE`
        : null,
      r.zoom && r.zoom.clamped ? `zoom capped ${r.zoom.by} (1 px = ${r.zoom.ulpMs.toPrecision(3)} ms)` : null,
      r.drift ? `drift n=${r.drift.n} p95 ${r.drift.p95} ms` : (r.driftStats ? `drift n=${r.driftStats.total}` : null),
      r.follow ? (r.followEngaged ? 'follow' : 'follow (disengaged)') : null,
    ].filter(Boolean);
    opts.hud.textContent = bits.join('  ·  ');
  }

  function invalidate() { S.dirty = true; S.spanCache.clear(); }
  // The face may land after the first frame; the gutter's cap height is
  // measured once from it, so both are taken again when it does.
  try {
    document.fonts?.load?.(`400 10px ${mono()}`).catch(() => {}).then(() => { capH = null; invalidate(); });
  } catch { /* no document */ }

  // -- interactions ----------------------------------------------------------
  const seek = (p) => (opts.onSeek ? opts.onSeek(p) : deck.seek && deck.seek(p));
  const localX = (e) => {
    const r = canvas.getBoundingClientRect();
    return (e.clientX - r.left) * (S.width / r.width) - S.gutterPx;
  };
  const localY = (e) => {
    const r = canvas.getBoundingClientRect();
    return (e.clientY - r.top) * (S.height / r.height);
  };
  function laneAt(y) { for (const L of S.lanes) if (L.show && y >= L.y && y < L.y + L.height) return L; return null; }

  /** `tolPx` is the FINGER SLOP and nothing else: the hit geometry is identical
   *  on both inputs, only the radius differs (6 px for a mouse, `touchSlop` for
   *  a finger). Desktop precision is therefore unchanged by definition. */
  function hitTest(px, py, tolPx = 6) {
    const L = laneAt(py);
    if (!L) return null;
    const t = tAt(px), tol = (tolPx / S.view.pxPerSecond) * 1000;
    const C = laneContext(L, tAt(px - 400), tAt(px + 400));
    if (C.as === 'spans') {
      // Hit the sub-row the pointer is in (from the renderer's `_y`/`_h`), with the time match as
      // fallback.
      // why: lessons/timeline-strip.md#sub-row
      let loose = null;
      for (const s of C.spans) {
        const to = Number.isFinite(s.to) ? s.to : Infinity;
        if (t < s.from - tol || t > to + tol) continue;
        if (s._y != null && py >= s._y - 1 && py <= s._y + s._h + 1) return { lane: L, span: s, row: s.row, t };
        if (!loose) loose = { lane: L, span: s, row: s.row, t };
      }
      return loose || { lane: L, t };
    }
    // A BINNED lane is hit by its bin, the same arithmetic the renderer used,
    // and answers with how many rows the bin holds and the worst of them.
    if (C.as === 'ticks' && L._bin && L._bin.binned) {
      const bp = L._bin.binPx, i = Math.floor(px / bp);
      const all = rowsFor(L, tAt(0), tAt(plotW()));
      const rows = all.filter((r) => Math.floor(x(r.at) / bp) === i);
      if (!rows.length) return { lane: L, t };
      const style = L._style || styleFor(deck, L.kind, { color: L.color, width: L.width });
      const colourOf = (r) => tickColour(L, r, S.pos, style);
      const worst = worstRow(L, rows, colourOf, colourRarity(L, all, colourOf));
      return { lane: L, row: worst, t, bin: { n: rows.length, ms: (bp / S.view.pxPerSecond) * 1000 } };
    }
    let best = null, bd = Infinity;
    for (const r of C.rows || []) { const d = Math.abs(r.at - t); if (d < bd) { bd = d; best = r; } }
    if (best && bd <= tol * 3) return { lane: L, row: best, t };
    return { lane: L, t };
  }

  function describe(hit) {
    if (!hit) return null;
    const L = hit.lane, r = hit.row;
    // A calendar strip says a date the way its ruler does, at the ruler's step.
    const fmtAt = calOn(tAt(0), tAt(plotW()))
      ? ((t) => calendarDate(t, calendarLOD(S.view.pxPerSecond).major))
      : ((t) => formatTime(t, tickLOD(S.view.pxPerSecond).major, S.absolute));
    const out = [`${L.label ?? L.id}  ${fmtAt(hit.t)}`];
    if (hit.span) {
      const s = hit.span;
      // `spanLine: false` for bars already labelled with their extent.
      // why: lessons/timeline-strip.md#span-line
      if (L.spanLine !== false) {
        out.push(`span ${fmtAt(s.from)} → ${Number.isFinite(s.to) ? fmtAt(s.to) : '(open)'}`);
      }
      // The hover says in words which of the three answers this row gives.
      // why: lessons/timeline-strip.md#state-words
      const st = whenState(s, tAt(0), tAt(plotW()));
      // Two or three short lines in catalogue words, not the project's vocabulary.
      // why: lessons/timeline-strip.md#short
      if (s.kind === 'ignorance') out.push('the exact date is lost, not absent');
      else if (s.kind === 'vagueness') out.push('no exact date exists');
      if (s.verbatim) out.push(String(s.verbatim).slice(0, 48));
    }
    if (r && hit.bin) {
      // A BIN: how many it holds, then the worst of them in the lane's own words.
      const ms = hit.bin.ms >= 10 ? Math.round(hit.bin.ms) : +hit.bin.ms.toFixed(1);
      const what = L.describeRow ? [].concat(L.describeRow(r) || []).join(', ') : '';
      out.push(hit.bin.n === 1 ? `1 in ${ms} ms${what ? `: ${what}` : ''}` : `${hit.bin.n} in ${ms} ms, worst${what ? `: ${what}` : ''}`);
    } else if (r) {
      // `terse` drops identity and provenance lines on lanes with no restorations.
      // why: lessons/timeline-strip.md#terse
      if (!L.terse) {
        out.push(`id ${r.id ?? '–'}  kind ${r.kind ?? L.kind ?? '–'}`);
        if (r.provenance) out.push(`RESTORED tier ${r.provenance.tier} · ${r.provenance.method} · conf ${(+r.provenance.confidence).toFixed(3)}`);
        else out.push('attested');
      } else if (r.provenance) {
        out.push(`restored, not observed — tier ${r.provenance.tier}`);
      }
      const p = r.payload || {};
      const keys = L.terse ? [] : Object.keys(p).filter((k) => k !== 'i' && k !== 'at' && k !== 'atUs').slice(0, 4);
      if (keys.length) out.push(keys.map((k) => `${k}=${fmtVal(p[k])}`).join(' '));
      // `describeRow` adds what the row measured, kept beside the log.
      // why: lessons/timeline-strip.md#describe-row
      if (L.describeRow) { const x = L.describeRow(r); if (x) out.push(...[].concat(x)); }
    }
    // `describeHit` replaces the whole tooltip, for pages about every lane at one instant.
    // why: lessons/timeline-strip.md#describe-hit
    if (opts.describeHit) {
      const custom = opts.describeHit(hit, out);
      if (custom) {
        const lines = [].concat(custom);
        const text = lines.map((l) => (typeof l === 'string' ? l : l.text)).join('\n');
        return { ...hit, text, detail: lines, lines };
      }
    }
    return { ...hit, text: out.join('\n'), detail: out };
  }
  const fmtVal = (v) => (typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(2)) : Array.isArray(v) ? `[${v.slice(0, 4)}]` : String(v).slice(0, 18));

  // Touch: a gesture is undecided until it moves past the slop (pan) or lifts (tap, seek); pinch
  // zooms about the midpoint; a tap opens a sticky tooltip. `pan-y` leaves vertical scroll to the
  // page.
  // why: lessons/timeline-strip.md#touch
  const TOUCH = {
    slop: opts.touchSlop ?? 22,      // finger radius for hit targets / playhead
    tapPx: opts.tapSlop ?? 10,       // movement under which a press is a TAP
    tapMs: opts.tapMs ?? 400,
  };
  const touches = new Map();         // pointerId -> {x, y, x0, y0, t0}
  let pinch = null;                  // {d0, pps0, midT}
  let touchGesture = null;           // 'undecided' | 'pan' | 'scrub' | 'pinch'
  const isTouch = (e) => e.pointerType === 'touch' || e.pointerType === 'pen';

  function pinchStart() {
    const [a, b] = [...touches.values()];
    const d0 = Math.max(1, Math.abs(a.x - b.x));
    const midX = (a.x + b.x) / 2;
    pinch = { d0, pps0: S.view.pxPerSecond, midT: tAt(midX) };
    touchGesture = 'pinch';
    disengage();
  }
  // Zoom about the midpoint: the time under it stays under it, so a sliding pinch also pans.
  // why: lessons/timeline-strip.md#pinch
  function pinchMove() {
    if (!pinch || touches.size < 2) return;
    const [a, b] = [...touches.values()];
    const d = Math.max(1, Math.abs(a.x - b.x));
    const midX = (a.x + b.x) / 2;
    const pps = Math.max(1e-9, capPps(pinch.pps0 * (d / pinch.d0), pinch.midT));
    S.view.pxPerSecond = pps;
    S.view.scrollX = ((pinch.midT - S.view.originTime) / 1000) * pps - midX;
    invalidate();
  }

  /** the tap equivalent of hover: sticky, cleared by the next gesture. */
  function tapInspect(px, py) {
    const hit = describe(hitTest(px, py, TOUCH.slop));
    if (hit) { hit.px = px; hit.py = py; hit.touch = true; }
    S.hover = hit; S.dirty = true;
    opts.onHover && opts.onHover(hit);
  }

  function onTouchDown(e) {
    const px = localX(e), py = localY(e);
    touches.set(e.pointerId, { x: px, y: py, x0: px, y0: py, t0: (typeof performance !== 'undefined' ? performance.now() : Date.now()) });
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    if (touches.size === 2) { pinchStart(); return; }
    if (touches.size > 2) return;
    if (px < 0) { touchGesture = null; return; }
    // A finger within the slop of a drawn playhead scrubs; not with no playhead, nor while live.
    // why: lessons/timeline-strip.md#scrub
    touchGesture = opts.playhead !== false && !S.live && Math.abs(px - x(S.pos)) <= TOUCH.slop ? 'scrub' : 'undecided';
    S.dragX = px;
    if (touchGesture === 'scrub') { S.dragging = true; disengage(); holdForScrub(); }
  }

  function onTouchMove(e) {
    const p = touches.get(e.pointerId);
    if (!p) return;
    p.x = localX(e); p.y = localY(e);
    if (touchGesture === 'pinch') { pinchMove(); return; }
    if (touches.size !== 1) return;
    const dx = p.x - p.x0, dy = p.y - p.y0;
    if (touchGesture === 'undecided') {
      if (Math.abs(dx) < TOUCH.tapPx && Math.abs(dy) < TOUCH.tapPx) return;
      // past the slop and still ours (the page would have cancelled us if it
      // had claimed the gesture) => this is a PAN.
      touchGesture = 'pan'; S.dragging = true; S.dragX = p.x; disengage();
      if (S.hover) { S.hover = null; opts.onHover && opts.onHover(null); }
    }
    if (touchGesture === 'scrub') { seek(tAt(p.x)); S.dirty = true; return; }
    if (touchGesture === 'pan') { S.view.scrollX -= p.x - S.dragX; S.dragX = p.x; S.dirty = true; }
  }

  function onTouchUp(e) {
    const p = touches.get(e.pointerId);
    touches.delete(e.pointerId);
    canvas.releasePointerCapture && e.pointerId !== undefined &&
      canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId) && canvas.releasePointerCapture(e.pointerId);
    if (touchGesture === 'pinch') {
      pinch = null;
      // a lifted finger during a pinch hands the survivor a fresh pan origin
      // rather than teleporting the view by the whole midpoint delta
      if (touches.size === 1) { const r = touches.values().next().value; touchGesture = 'pan'; S.dragX = r.x; S.dragging = true; }
      else { touchGesture = null; S.dragging = false; }
      invalidate(); return;
    }
    if (touchGesture === 'undecided' && p && e.type !== 'pointercancel') {
      const dt = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - p.t0;
      const moved = Math.max(Math.abs(p.x - p.x0), Math.abs(p.y - p.y0));
      if (dt <= TOUCH.tapMs && moved < TOUCH.tapPx && p.x >= 0) { seek(tAt(p.x)); tapInspect(p.x, p.y); }
    }
    if (touches.size === 0) { touchGesture = null; S.dragging = false; releaseAfterScrub(); }
    invalidate();
  }

  // Scrubbing pauses the transport and resumes it on release only if we paused it.
  // why: lessons/timeline-strip.md#scrub-pause
  let resumeAfterScrub = false;
  function holdForScrub() {
    // Decided fresh on every drag, never OR-ed, so a lost onUp cannot start playback later.
    // why: lessons/timeline-strip.md#fresh
    const playing = typeof deck.playing === 'function' ? deck.playing() : false;
    resumeAfterScrub = playing;
    if (playing && typeof deck.pause === 'function') deck.pause();
  }
  function releaseAfterScrub() {
    if (!resumeAfterScrub) return;
    resumeAfterScrub = false;
    if (typeof deck.play === 'function') deck.play();
  }

  let dragMode = null;
  function onDown(e) {
    if (isTouch(e)) return onTouchDown(e);
    const px = localX(e);
    if (px < 0) return;
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    // Shift-drag pans and disengages follow; a plain drag seeks.
    // why: lessons/timeline-strip.md#drag-mode
    dragMode = e.shiftKey || e.button === 1 ? 'pan' : 'seek';
    S.dragging = true;
    if (dragMode === 'seek') { holdForScrub(); seek(tAt(px)); } else disengage();
    S.dragX = px;
    invalidate();
  }
  function onMove(e) {
    if (isTouch(e)) return onTouchMove(e);
    const px = localX(e), py = localY(e);
    if (S.dragging) {
      if (dragMode === 'seek') seek(tAt(px));
      else { S.view.scrollX -= px - S.dragX; S.dragX = px; }
      S.dirty = true;
      return;
    }
    if (px < 0) { if (S.hover) { S.hover = null; S.dirty = true; opts.onHover && opts.onHover(null); } return; }
    const hit = describe(hitTest(px, py));
    if (hit) { hit.px = px; hit.py = py; }
    S.hover = hit; S.dirty = true;
    opts.onHover && opts.onHover(hit);
  }
  function onUp(e) {
    if (isTouch(e)) return onTouchUp(e);
    S.dragging = false; dragMode = null;
    releaseAfterScrub();
    canvas.releasePointerCapture && e.pointerId !== undefined && canvas.releasePointerCapture(e.pointerId);
  }
  function onWheel(e) {
    const px = localX(e);
    if (px < 0) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey || e.shiftKey) zoomAt(Math.pow(1.0018, -e.deltaY), px);
    else { S.view.scrollX += e.deltaX || e.deltaY; disengage(); invalidate(); }
  }
  const onLeave = (e) => {
    // a TOUCH pointer "leaves" the moment it lifts, which would erase the
    // sticky tap tooltip one frame after it appeared. Only a mouse leaving is
    // a real loss of attention.
    if (e && isTouch(e)) return;
    if (S.hover) { S.hover = null; S.dirty = true; opts.onHover && opts.onHover(null); }
  };
  // iOS Safari's own pinch (`gesturestart`) is cancelled so ours gets its second pointer.
  // why: lessons/timeline-strip.md#gesture-event
  const onGesture = (e) => e.preventDefault();
  if (opts.interact !== false) {
    canvas.style.touchAction = opts.touchAction || 'pan-y';
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    // a cancel is a release that never arrives as one: without this the deck
    // stays paused and the next drag resumes something it did not stop
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('gesturestart', onGesture);
    canvas.addEventListener('gesturechange', onGesture);
    if (opts.zoom !== false) canvas.addEventListener('wheel', onWheel, { passive: false });
    // a live strip a reader has zoomed or panned goes back to the whole run
    canvas.addEventListener('dblclick', () => { if (S.live && S.live.held) resumeLive(); });
  }

  // Repaint when the deck moves or something drawn changed, never on a timer. An armed wall moves
  // in
  // real time, so it repaints every frame until disarmWall().
  // why: lessons/timeline-strip.md#repaint
  function loop() {
    if (S.disposed) return;
    const p = deck.position ? deck.position() : 0;
    if (S.dirty || p !== S.pos || (S.wallAnchor && S.wallAnchor.frozen == null)) draw();
    S.raf = requestAnimationFrame(loop);
  }

  resize();                       // fit() needs a real plot width, not 0
  setLanes(opts.lanes || []);
  if (opts.view) setView(opts.view); else fit();
  // if the canvas is laid out later (a hidden panel, a late stylesheet) the
  // first non-zero measurement re-fits once rather than leaving a 1 px window
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => {
      const had = S.width;
      resize();
      if (!had && S.width && !opts.view) fit(); else invalidate();
    });
    ro.observe(canvas);
    S._ro = ro;
  }
  if (typeof requestAnimationFrame === 'function' && opts.loop !== false) S.raf = requestAnimationFrame(loop);
  else draw();

  const api = {
    canvas, deck, state: S,
    // The lane declarations: queries; replace them and the picture changes.
    // why: lessons/timeline-strip.md#lanes
    lanes: () => S.lanes,
    setLanes,
    show(id, on) { const L = S.lanes.find((l) => l.id === id); if (L) { L.show = on !== false; layout(); invalidate(); } return !!L; },
    // setActive(ids) dims every other lane (marks and gutter) by `off`; null makes all active.
    // Dimmed, never hidden. Returns the active ids.
    // why: lessons/timeline-strip.md#set-active
    setActive(ids) {
      const on = ids == null ? null : new Set([].concat(ids));
      for (const L of S.lanes) L.active = on ? on.has(L.id) : true;
      invalidate();
      return api.active();
    },
    active: () => S.lanes.filter((L) => L.active !== false).map((L) => L.id),
    view: () => ({ ...S.view }), setView, fit, frame, zoomAt,
    zoomIn: (f = 1.5) => zoomAt(f), zoomOut: (f = 1.5) => zoomAt(1 / f),
    setFollow, follow: () => ({ on: S.follow, engaged: S.follow && !S.userScrolled }),
    setFollowTarget, followPos,
    startLive, stopLive, resumeLive, live: liveState,
    /** How the last draw drew a ticks lane: one by one or binned, and where. */
    binState: (id) => { const L = S.lanes.find((l) => l.id === id); return L ? (L._bin || null) : null; },
    armWall, disarmWall, wallPos, gapMs: () => (wallPos() === null ? null : wallPos() - S.pos),
    /** E3: the strip asks the DECK. It never filters rows itself, so an
     *  evidence-only view is the deck refusing to serve, not a hidden layer. */
    setEvidence(p) {
      S.evidence = p;
      if (deck.setEvidence && opts.deckPolicy !== false) { try { deck.setEvidence(p); } catch (e) { note('setEvidence', e); } }
      invalidate();
      return deck.evidence ? deck.evidence() : p;
    },
    evidence: () => (deck.evidence ? deck.evidence() : S.evidence),
    // 'necessary' ghosts rows it cannot answer for rather than hiding them.
    // why: lessons/timeline-strip.md#set-certainty
    setCertainty(c) {
      if (c !== 'possible' && c !== 'necessary') throw new Error(`certainty: use 'possible' | 'necessary', got ${JSON.stringify(c)}`);
      S.certainty = c; invalidate(); return c;
    },
    certainty: () => S.certainty,
    // The three answers plus crisp, tallied over what is on screen now (it changes with zoom).
    // why: lessons/timeline-strip.md#span-states
    spanStates(id) {
      const L = S.lanes.find((l) => l.id === id);
      return L ? spanStatesOf(L) : null;
    },
    // Which rows can be repaired, by which rule, against which verbatim string; never vague ones.
    // why: lessons/timeline-strip.md#narrowable
    narrowable(id) {
      const L = S.lanes.find((l) => l.id === id);
      if (!L) return null;
      return spansFor(L)
        .filter((s) => s.smeared && s.kind === 'ignorance')
        .map((s) => ({ id: s.row && s.row.id, rule: s.rule, verbatim: s.verbatim, edtf: s.edtf,
                       widthMs: Number.isFinite(s.to) ? s.to - s.from : Infinity, key: s.key }))
        .sort((a, b) => b.widthMs - a.widthMs);
    },
    /** the aggregate AS A STATISTIC: its method string, its bin width, its
     *  ledger. Populated by the last draw of an `aggregate` lane. */
    aggregateStat(id) {
      const L = S.lanes.find((l) => l.id === id);
      const a = L && L._aoristic;
      if (!a) return null;
      return { method: a.method, colMs: a.colMs, cols: a.mass.length, max: a.max, peakCol: a.peakCol,
               total: a.total, items: a.items, counted: a.counted, open: a.open, points: a.points, clipped: a.clipped };
    },
    // Did every gutter line fit in its lane? From the last draw; an undrawn lane reports `lines:
    // null`.
    // why: lessons/timeline-strip.md#gutter-fit
    gutterFit: () => S.lanes.filter((L) => L.show).map((L) => ({
      id: L.id, label: String(L.label ?? L.id), height: L.height, asked: L._askedH ?? L.height,
      active: L.active !== false,
      ...(L._gutterFit || { lines: null, shown: 0, dropped: 0 }),
    })),
    // What the fingers are doing, so a harness can tell pan, pinch and tap apart.
    // why: lessons/timeline-strip.md#gesture-state
    gesture: () => ({ mode: touchGesture, pointers: touches.size, pinching: !!pinch, slop: TOUCH.slop }),
    hover: () => S.hover,
    readout, invalidate, draw,
    timeToX: x, xToTime: tAt, tickLOD: () => tickLOD(S.view.pxPerSecond),
    /** the times at the plot's left and right edges, gutter excluded */
    visible: () => [tAt(0), tAt(plotW())],
    // Render one lane alone offscreen and count; a restored lane must paint exactly 0 px.
    // why: lessons/timeline-strip.md#ink-of
    inkOf(id, o = {}) {
      const L = S.lanes.find((l) => l.id === id);
      if (!L) return null;
      const t0 = tAt(0), t1 = tAt(plotW());
      const C = laneContext(L, t0, t1);
      const y = L.y; const saved = L.y; L.y = 0;
      const n = laneInk((c) => {
        const fn = L.render || RENDERERS.get(C.as);
        try { fn && fn(c, L, { ...C, pos: S.pos }); } catch (e) { note(L.id, e); }
      }, Math.max(1, Math.round(plotW())), Math.max(1, Math.round(L.height)), o);
      L.y = saved; void y;
      return n;
    },
    ink() { const o = {}; for (const L of S.lanes) o[L.id] = this.inkOf(L.id); return o; },
    dispose() {
      S.disposed = true;
      if (typeof globalThis !== 'undefined' && globalThis.__strips) {
        const i = globalThis.__strips.indexOf(api); if (i >= 0) globalThis.__strips.splice(i, 1);
      }
      if (S.raf) cancelAnimationFrame(S.raf);
      if (S._ro) S._ro.disconnect();
      if (S._offState) try { S._offState(); } catch { /* already gone */ }
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('gesturestart', onGesture);
      canvas.removeEventListener('gesturechange', onGesture);
      canvas.removeEventListener('wheel', onWheel);
    },
  };
  // A live registry of strips (`globalThis.__strips`), spliced on dispose, so a harness can reach
  // them.
  // why: lessons/timeline-strip.md#registry
  if (typeof globalThis !== 'undefined') (globalThis.__strips || (globalThis.__strips = [])).push(api);
  return api;
}

export default createStrip;
