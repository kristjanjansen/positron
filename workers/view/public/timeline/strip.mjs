// timeline/strip.mjs — THE strip visualizer. Canvas, no framework, no build step.
//
// plan-timeline §0/§6 promised this from the beginning ("rebuilt four times;
// build it once as a component"). By the time it got written it had been
// hand-drawn FIVE times and none of the five agreed:
//
//   proto/jam/jam.html            a native <input type=range>. No marks at all,
//                                 but the ONLY one with a real drag guard.
//   proto/selfrec/replay-grid     cue ticks + span bars, percent-of-range, a
//                                 2000 ms hardcoded lead-in, no time axis.
//   proto/instrument/play.js      two lanes that are PITCH axes, one audible one
//                                 not, percent-of-range reimplemented verbatim,
//                                 a different hardcoded lead-in (250 ms).
//   proto/remixer/compose.html    span lanes + a nested-deck lane, as absolutely
//                                 positioned <div>s in percent of a fixed
//                                 ARR_END; the QUOTATION span was never drawn.
//   proto/paths/paths.js          the richest: four overlaid lanes, stepped
//                                 lineWidth/alpha, tier-driven hatching, a 14x
//                                 playhead inset, an evidence-only toggle.
//
// Everything below is mined from those five and from the two research files
// that settle the open questions:
//
//   research/timeline-own-prior-art-2026-08.md §4
//     · dual cursor: a wall-clock line beside the playhead, so the GAP is the
//       accumulated pause/rate offset;
//     · "the view-window model is the unsolved wall in ALL generations" —
//       5000 px / 10 s / 30 s ceilings in four repos, tick density hardcoded at
//       two scales, zoom nowhere. {originTime, pxPerSecond, scrollX} +
//       virtualized draw + tick LOD are day-one requirements here;
//     · follow-mode that DISENGAGES on user scroll (demo9 re-centred every
//       frame and fought the user — the recorded failure);
//     · two renderers over one array; per-author idToColor hash;
//     · control-is-the-display.
//
//   research/spatiotemporal-uncertainty-2026-08.md §8.4 + §9.1
//     · the render decision is SETTLED by a controlled study (Gschwandtner et
//       al. 2016): AMBIGUATION — a two-tone bar, saturated certain core and
//       lighter possible flanks — for "when / how long"; gradient/density ONLY
//       for "how likely at t". So: two-tone bands per row, never a per-row
//       curve, and NEVER a dash for uncertainty (dash is spoken for by §5b's
//       tratteggio, which encodes inferred PAYLOAD, a different axis);
//     · the per-lane aggregate is an aoristic sum: one bin per PIXEL COLUMN,
//       mass 1/(b-a) per item, drawn as HEIGHT (height does not clip the way
//       alpha does), optionally divided by the overlapping-period count.
//
// DOCTRINE: LANES ARE QUERIES, NOT CONTAINERS. A lane declares what it wants
// from the deck; the strip asks the deck for it, every frame, inside the
// visible window and under the current evidence policy. No client ever pushes a
// row into a lane, and the evidence-only toggle is therefore not a filter this
// component applies — it is a question the DECK answers.

// ---------------------------------------------------------------------------
// Shared drawing primitives. Exported because a client with its own PROJECTION
// (proto/paths draws the same lanes in x/y space, not on a time axis; its 14x
// inset draws them again, zoomed) must reuse the styling, not re-derive it.
// ---------------------------------------------------------------------------

/** §5b tratteggio: hatch is a function of the row's own declared TIER, never
 *  hand-assigned per lane. A tier-2 lane arrives hatched differently without a
 *  line of styling written for it. */
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
export function styleFor(deck, kind, base = {}) {
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

/** Render one thing ALONE into an offscreen canvas and count painted pixels.
 *  proto/paths' laneInk(), lifted: the only honest proof that a lane actually
 *  put marks on a canvas, and the measurement its evidence-only toggle is
 *  verified with (restored lanes must paint exactly 0 px). */
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
  // `sum` is total alpha MASS, and it is the measurement a feathered edge needs:
  // a gradient ramp keeps almost every pixel above an 8/255 gate, so a pixel
  // COUNT cannot see the difference between a hard edge and a soft one, while
  // the mass can. (Found by measuring: the count moved 0.6 %, the mass 12.7 %.)
  return mode === 'sum' ? sum : mode === 'both' ? { count: n, sum } : n;
}

// ---------------------------------------------------------------------------
// TICK LOD — the thing every generation hardcoded at one or two densities, and
// the reason five strips all had a ceiling (5000 px / 10 s / 30 s). It is a
// pure function of pxPerSecond: pick the smallest interval off a nice ladder
// whose on-screen spacing clears a minimum, and the smallest MAJOR interval
// that clears a label's width and is a whole multiple of the minor.
//
// The ladder deliberately reaches from 1 ms (MIDI jitter, 5000 px/s) to a
// century (the ERR archive horizon, 1e-7 px/s) with no branch anywhere.
// ---------------------------------------------------------------------------

const SEC = 1000, MIN = 60 * SEC, HR = 60 * MIN, DAY = 24 * HR, YR = 365.2425 * DAY;
const KYR = 1e3 * YR, MYR = 1e6 * YR, GYR = 1e9 * YR;
export const TICK_LADDER = [
  1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500,
  SEC, 2 * SEC, 5 * SEC, 10 * SEC, 15 * SEC, 30 * SEC,
  MIN, 2 * MIN, 5 * MIN, 10 * MIN, 15 * MIN, 30 * MIN,
  HR, 2 * HR, 3 * HR, 6 * HR, 12 * HR,
  DAY, 2 * DAY, 7 * DAY, 14 * DAY, 30 * DAY, 91 * DAY, 182 * DAY,
  YR, 2 * YR, 5 * YR, 10 * YR, 20 * YR, 25 * YR, 50 * YR, 100 * YR,
  // DEEP TIME (§9.6, read from ChronoZoom's source, not believed from a blog):
  // the log of the viewport span selects the TICK SOURCE; it never warps the
  // axis. So deep time is not a different projection, it is more rungs — and
  // the rungs are what was missing. MEASURED before this was written: with the
  // ladder stopping at 100 y, fitting 13.8 Gyr into 1400 px chose major = 100 y
  // at 1.0e-5 px, and the axis loop ran **138,000,000** times per frame with a
  // moveTo/lineTo/fillText each. That is the deep-time bug: not precision, an
  // unbounded draw loop. (The precision ceiling is real too and is stated at
  // `ulpMs` below.)
  200 * YR, 500 * YR,
  KYR, 2 * KYR, 5 * KYR, 10 * KYR, 20 * KYR, 50 * KYR, 100 * KYR, 200 * KYR, 500 * KYR,
  MYR, 2 * MYR, 5 * MYR, 10 * MYR, 20 * MYR, 50 * MYR, 100 * MYR, 200 * MYR, 500 * MYR,
  GYR, 2 * GYR, 5 * GYR, 10 * GYR,
];

/** The IEEE-754 quantum of a position, in ms. `ulp(x) = 2^-52 · 2^floor(log2 x)`.
 *  This is the honest ceiling on "absolute ms" as a position domain (§4's
 *  non-negotiable) and it is not a matter of taste:
 *    · integer ms are EXACT to 2^53 = 9.007e15 ms = 285,426.8 years;
 *    · at 13.8 Gyr (4.355e20 ms) one ulp is 65,536 ms = 65.536 s, so a
 *      millisecond span at the Big Bang does not exist as a number;
 *    · `t += 1` STALLS (t + 1 === t) at t >= 9.313e15 ms ~ 295 kyr, which is
 *      how an accumulating tick loop hangs rather than drifts.
 *  Used to derive the zoom ceiling instead of hand-authoring one per era the
 *  way ChronoZoom's `deeperZoomConstraints` does. */
export function ulpMs(t) {
  const a = Math.abs(t);
  if (!(a > 0) || !Number.isFinite(a)) return Number.MIN_VALUE;
  return Math.max(Number.MIN_VALUE, Number.EPSILON * Math.pow(2, Math.floor(Math.log2(a))));
}
/** px/s at which ONE PIXEL equals one representable step of the position domain.
 *  Zooming past it draws a grid finer than the numbers behind it — ChronoZoom's
 *  "you cannot zoom to a day inside the Hadean", derived from the float rather
 *  than declared per era. */
export const zoomCeilingPps = (t) => 1000 / ulpMs(t);
/** The JS `Date` wall: `new Date(ms).toISOString()` THROWS beyond ±8.64e15 ms
 *  (±273,790 y). formatTime() must never hand a deep-time position to Date. */
export const DATE_WALL_MS = 8.64e15;

/**
 * @param pxPerSecond  the ONLY input — LOD is a function of zoom, not of a mode
 * @returns {{minor, major, digits, fmt}} intervals in ms plus a matched label
 *          formatter, so the axis never prints "0:00:03.000" at hour zoom nor
 *          "0:03" at millisecond zoom.
 */
export function tickLOD(pxPerSecond, { minMinorPx = 7, minMajorPx = 68 } = {}) {
  const px = (ms) => (ms / 1000) * pxPerSecond;
  // MAJOR first: the labelled interval must clear a label's width, and that is
  // the only hard constraint. (Picking minor first and then hunting a multiple
  // of it strands the calendar ladder — a year is not a whole number of 91-day
  // steps, so the search would never reach year ticks.)
  let major = TICK_LADDER[TICK_LADDER.length - 1];
  for (const t of TICK_LADDER) { major = t; if (px(t) >= minMajorPx) break; }
  // MINOR: the smallest step that clears the minimum spacing AND divides the
  // major, so the minors never crawl out from under the labels. If nothing
  // divides it, take the smallest that clears — an approximate grid beats none.
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
  // `absolute` is a DECLARATION, not a guess: replay-grid's domain is absolute
  // wall ms while a 60-year ERR relative domain is the same magnitude, so the
  // strip passes deck.range[0] > 1e12 rather than letting a threshold decide.
  // …and a DEEP-TIME position is never a Date: `new Date(1e16).toISOString()`
  // throws RangeError, so an absolute deck reaching past ±8.64e15 ms would take
  // the axis down. Past the wall the absolute domain degrades to the relative
  // deep-time regime, which is the only reading that exists there anyway.
  if ((absolute === undefined ? Math.abs(ms) > 1e12 : absolute) && Math.abs(ms) <= DATE_WALL_MS && major < KYR) {
    const d = new Date(ms);
    if (major >= DAY) return d.toISOString().slice(0, 10);
    if (major >= MIN) return d.toTimeString().slice(0, 5);
    return d.toTimeString().slice(0, 8);
  }
  const neg = ms < 0; const a = Math.abs(ms);
  const h = Math.floor(a / HR), m = Math.floor((a % HR) / MIN), s = (a % MIN) / 1000;
  const sign = neg ? '-' : '';
  // DEEP TIME regime-swap: the unit follows the MAJOR interval, not the value,
  // so one axis reads in one unit (ChronoZoom's `cosmos`/`calendar`/`date` tick
  // sources, picked by log10(span)). `-13800000000y` is what the ladder printed
  // before this existed.
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

// ---------------------------------------------------------------------------
// AORISTIC AGGREGATE — §8.4.2 / §9.1 / M4 (Jugel 2014). One bin per PIXEL
// COLUMN, each item contributing total mass 1 spread as 1/(b−a) per ms, drawn
// as HEIGHT (height does not clip the way `globalAlpha = min(0.4, …)` did).
//
// ⚠️ MEASURED, and it collapses a term the brief carried as separate: §9.5 asks
// for mass 1/(b−a) "divided by the number of overlapping periods" (aoristAAR's
// period_correction). WITH ONE BIN PER PIXEL COLUMN THOSE ARE THE SAME
// OPERATION — the pixel column IS the period, an item overlaps (b−a)/colMs of
// them, and 1 ÷ that count is exactly the colMs/(b−a) that the 1/(b−a) weight
// already deposits per column. Verified numerically (strip-verify B2): the two
// formulations agree to 0 ulp on column-aligned items and the 1/(b−a) form is
// the CORRECT one on clipped items, because it divides by the item's TRUE
// duration rather than by its visible one. There is no third factor to apply.
//
// `norm = mass/n` is kept and is a DIFFERENT statistic (mean mass per
// contributing item). It must NOT drive the height: dividing by the count
// deletes the count, which is the quantity a histogram is for.
// ---------------------------------------------------------------------------

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
    // AN UNBOUNDED ITEM CONTRIBUTES ZERO, AND THAT IS THE ARITHMETIC, NOT A
    // POLICY: mass 1/(b−a) with b−a = ∞ is 0 everywhere. It is reported rather
    // than filtered, because "dropped 3 open spans" and "3 spans added nothing"
    // are the same fact and only one of them is visible.
    if (s.to !== null && s.to !== undefined && !Number.isFinite(s.to)) { stat.open++; continue; }
    // A POINT is not a degenerate span to be skipped — it is the one item we
    // know EXACTLY, mass 1 in its own column. Dropping points (which the first
    // implementation did, via `Number.isFinite(s.to)`) makes a crisp archive
    // read as empty next to a smeared one.
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

/** short human duration for a stated method line — the column width is half the
 *  method and a statistic whose bin size is invisible is not stated. */
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

// ---------------------------------------------------------------------------
// Span extraction. Three shapes, in priority order, and every one of them
// degrades cleanly into the next:
//
//   1. row.payload.when  — the uncertainty sibling's bounds. Accepts
//      {outerFrom, innerFrom, innerTo, outerTo, kind} and {from,to,inner…}.
//      Absent inner bounds => the whole band is SKIRT, which §8.4.3 says is
//      honest and needs no special case.
//   2. lane.span(row)    — the client says so explicitly.
//   3. phase pairing     — {phase:'enter'|'exit'} keyed by lane.group(row).
//      This is the repo's actual media-span convention (compose, replay-grid,
//      instrument all emit it) and it is the reason a "span lane" can be a
//      pure query over the same flat item log everything else reads.
//
// A row that yields no end is a POINT and falls through to the tick renderer.
// ---------------------------------------------------------------------------

// `ref` is nested.mjs's span id, `lane`/`tag` are the media-span convention in
// selfrec/remixer — so the three shapes already in the repo pair with no
// per-client configuration at all.
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
  // `smeared` is the discriminator the renderer was missing. Without it a span
  // that came from a `when` bracket and a span that came from a note-on/note-off
  // pair are the same object, and the renderer drew them with the SAME INK — a
  // wholly-unknown position and a fully attested duration, indistinguishable.
  // `rule`/`verbatim` are carried for the ignorance affordance ("narrow this"),
  // which is a link to the evidence, not a decoration.
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

// ---------------------------------------------------------------------------
// THE THREE STATES — §7.9's "`necessary` has THREE answers, not two", made
// visible. This is a transcription of transport.mjs's `certAccepts()` into the
// render path, deliberately not a paraphrase of it: strip-verify A1 asserts
// row-for-row agreement with `deck.window(kind, t0, t1, {certainty:'necessary'})`
// on the real corpus, so if the two ever diverge a test fails rather than a
// picture lies.
//
//   'crisp'         the span carries no `when` at all — a note-on/note-off pair,
//                   a recording's enter/exit. Attested at both ends. NOT an
//                   uncertainty state, and the bug this fixes is that the old
//                   renderer drew it with the same ink as the case below.
//   'core'          ordered inner pair → inner containment answers "certainly
//                   within" exactly. Two-tone ambiguation, and the only state in
//                   which a saturated core rectangle is a true statement.
//   'outer'         no inner pair, but the whole outer bracket lies inside the
//                   query window → outer containment is SOUND BUT INCOMPLETE.
//   'unanswerable'  no inner pair and the bracket is not contained → undecidable
//                   from what the row carries. transport EXCLUDES and REPORTS;
//                   the strip must therefore SHOW the exclusion, not let the row
//                   silently vanish, which is the failure mode §9.7 says every
//                   surveyed renderer shipped.
//
// The state is a function of the row AND THE WINDOW, which is the finding worth
// keeping: zoom in far enough and a sound row becomes undecidable, zoom out and
// it recovers. The epistemics are not a property of the archive, they are a
// property of the question — and on a zoomable axis the question changes with
// the wheel. Measured on the Kurenniemi corpus in strip-verify A3.
// ---------------------------------------------------------------------------

export function whenState(s, t0, t1) {
  if (!s || !s.smeared) return 'crisp';
  if (s.innerFrom !== null && s.innerTo !== null && s.innerFrom <= s.innerTo) return 'core';
  if (Number.isFinite(s.to) && t0 <= s.from && s.to <= t1) return 'outer';
  return 'unanswerable';
}

/** the ambiguation tones. Two lightness values of ONE hue is what the study
 *  compared; alpha is our lightness because the lane background is fixed. */
const TONE = { skirt: 0.30, core: 0.88, crisp: 0.85, ghost: 0.10, bar: 0.92 };

// ---------------------------------------------------------------------------
// The default renderers. `registerRenderer` makes the set open: "two renderers
// over one array" (§4) is a registry keyed by name, chosen per lane.
// Every one of them receives the same context object.
// ---------------------------------------------------------------------------

const RENDERERS = new Map();
export function registerRenderer(name, fn) { RENDERERS.set(name, fn); return () => RENDERERS.delete(name); }

/** discrete ticks — one mark per row. `latch` recolours marks BEHIND the
 *  playhead (replay-grid's fired-cue idea) and, because it is recomputed from
 *  the position every frame, un-fires them on rewind. */
registerRenderer('ticks', (ctx, L, C) => {
  const { x, style } = C;
  const y0 = L.y, h = L.height;
  ctx.save();
  ctx.globalAlpha = style.alpha ?? 0.95;
  for (const r of C.rows) {
    const px = Math.round(x(r.at)) + 0.5;
    const fired = L.latch && r.at <= C.pos;
    // `colorOfRow(row, fired)` is the per-row hook the spans renderer has had
    // as `colorOf` since the start; ticks only ever offered one colour for the
    // whole latched half, which cannot say WHICH mark went wrong. Falsy falls
    // straight back to the two-colour behaviour, so no existing lane changes.
    ctx.strokeStyle = (L.colorOfRow && L.colorOfRow(r, fired))
      || (fired ? (L.firedColor || '#7fd18c') : style.color);
    // The SECOND per-row channel. One lane, two facts: colour for the value,
    // width for a property of the row itself. Cheaper and clearer than a second
    // lane, which needs a label, occupies height forever, and reads as a
    // separate subject rather than an annotation on this one.
    ctx.lineWidth = (L.widthOfRow && L.widthOfRow(r, fired)) || style.width || 1.4;
    if (style.dash) ctx.setLineDash(style.dash); else ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(px, y0 + 2); ctx.lineTo(px, y0 + h - 2); ctx.stroke();
  }
  ctx.restore();
});

/** spans, with §9.1's AMBIGUATION: a two-tone bar — saturated certain core,
 *  lighter possible flanks. No dash for uncertainty (§8.4.5); dash here means
 *  tratteggio, i.e. the PAYLOAD was inferred. Degrades to an all-skirt band
 *  when the row carries no `when`, which is the common case today. */
registerRenderer('spans', (ctx, L, C) => {
  const { x, style } = C;
  const rowsByKey = new Map();
  let slot = 0;
  const spans = C.spans;
  if (L.stack !== false) for (const s of spans) if (!rowsByKey.has(s.key)) rowsByKey.set(s.key, slot++);
  // `slots` caps the stack (compose stacked 128 MIDI notes into 8 rows by hand);
  // `slotOf` lets a lane place a span on a real axis — pitch, participant, tier.
  const nSlots = Math.max(1, Math.min(L.slots || Infinity, rowsByKey.size));
  // `barPad` is the breathing room above and below the bar in its slot. A
  // span sitting hard against its lane edges reads as a background band
  // rather than as an object with ends.
  const barPad = L.barPad ?? 3;
  const barH = L.stack === false ? L.height - barPad * 2 : Math.max(3, (L.height - barPad * 2) / nSlots - 2);
  ctx.save();
  // `bars:false` gives the AGGREGATE ITS OWN LANE. A stacked span lane and a
  // per-column silhouette want the same pixels, and the silhouette loses — the
  // statistic ends up drawn behind twenty bands. Separating them is also the
  // honest layout: the individuals and the statistic over them are two claims,
  // and §9.5's "pair the curve with a rug of individuals" is the pairing that
  // belongs INSIDE the aggregate lane, not the bands.
  for (const s of L.bars === false ? [] : spans) {
    if (s.point) continue;
    const to = Number.isFinite(s.to) ? s.to : C.t1;
    if (to < C.t0 || s.from > C.t1) continue;                       // virtualized
    const row = L.stack === false ? 0
      : L.slotOf ? (L.slotOf(s) % nSlots + nSlots) % nSlots
      : (rowsByKey.get(s.key) || 0) % nSlots;
    const y = L.y + 3 + row * (barH + 2);
    const xa = x(s.from), xb = x(to);
    const col = L.colorOf ? L.colorOf(s) : (L.color || (L.byKey ? idToColor(s.key) : style.color));
    const prov = s.row && s.row.provenance;
    const st = whenState(s, C.t0, C.t1);
    s.state = st;                               // read back by spanStates()/hover
    // `barGap` insets the DRAWN bar without touching the span's real extent.
    // Adjacent spans — the passes of a loop — share an edge exactly, and two
    // rounded rectangles meeting at a shared edge still read as one long bar.
    // A hairline of lane between them is what makes three things three.
    const gap = L.barGap ?? 0;
    // A FLOOR YOU CAN SEE, and no wider. 1.5 px is a hairline that reads as a
    // scratch; 2 px is a mark. Four was tried and is too much — the floor is
    // there so a clip does not VANISH, not so it looks bigger than it is, and
    // every pixel above the minimum is a pixel of lie about the duration.
    // Above it the width stays strictly proportional.
    const bw = Math.max(2, xb - xa - gap);
    const soft = s.kind === 'vagueness';
    // EDGE = when.kind, and the two are opposite claims about the world (§7):
    //   ignorance — there IS a boundary, the catalogue lost it. The bound is a
    //     FACT ("certainly not before earliest"), so it gets a hard terminator
    //     and an invitation to narrow, because finding the day is a repair.
    //   vagueness — there is no boundary. A hard edge would be the falsification,
    //     so the band is feathered and there is NO narrowing affordance at all.
    // Never a dash for either (§8.4.5): dash is tratteggio's, one axis down.
    const feather = soft ? Math.min(22, Math.max(2, bw * 0.34)) : 0;
    // A slice is a THING, and a thing has ends. Square corners let adjacent
    // slices — the three passes of a loop — melt into one bar, which is exactly
    // the reading the picture must not give. The radius is small and capped at
    // a third of the width so a narrow span stays a bar rather than a pill.
    const rad = Math.min(2, bw / 3, barH / 3);
    const band = (alpha, x0 = xa, w0 = bw) => {
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
      // EXCLUDED AND REPORTED, drawn as such: a ghost outline with almost no
      // fill. It is visible (you can see what the query threw away) and it can
      // never be mistaken for an answer.
      band(TONE.ghost);
      ctx.globalAlpha = 0.55; ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.strokeRect(xa + 0.5, y + 0.5, Math.max(1, bw - 1), barH - 1);
    } else {
      // AMBIGUATION (Gschwandtner et al. 2016): lighter tone = the possible
      // flanks. This is the skirt, and it is the whole bracket.
      band(TONE.skirt);
      if (st === 'core' && !L.allSkirt) {
        // …and the saturated core, the ONE place a saturated rectangle is true.
        const ia = x(s.innerFrom), ib = x(s.innerTo);
        ctx.globalAlpha = TONE.core; ctx.fillStyle = col;
        ctx.fillRect(ia, y, Math.max(1.5, ib - ia), barH);
      } else if (st === 'outer' && !L.allSkirt) {
        // THE EMPTY CORE, AND WHY IT IS NOT NOTHING. All 22 Kurenniemi rows have
        // innerFrom/innerTo null, so a two-tone design that draws "no core" as
        // an absence renders the only real archive we have as a lie by omission:
        // the reader sees one flat tone and cannot tell it from `allSkirt`, from
        // a crisp span, or from a rendering bug.
        // The fix is not to invent a core. It is that AMBIGUATION DEGENERATES
        // HERE — with an empty core it has one tone, and one tone is not an
        // encoding. So fall back to the SAME STUDY'S OTHER RECOMMENDATION for
        // the SAME task: Gschwandtner et al. recommend "ambiguation OR ERROR
        // BARS for judging durations and temporal bounds". An error bar spanning
        // the outer bracket says exactly what the row says — bounds known,
        // extent within them unrecorded — and cannot be read as a core, because
        // it is not a filled region at all.
        const my = y + barH / 2;
        const cap = Math.max(3, barH * 0.34);
        ctx.globalAlpha = TONE.bar; ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        // …and the CAPS are the outer bounds asserted as facts, so they belong
        // to ignorance only. A capped error bar on a VAGUE row would put a hard
        // endpoint on a concept that has none — the same falsification the
        // feathered band exists to avoid. Vagueness gets the rule, fading out,
        // and no caps: an extent with no ends, which is the claim.
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
        ctx.globalAlpha = 0.75; ctx.strokeStyle = col; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xa + 0.5, y); ctx.lineTo(xa + 0.5, y + barH);
        ctx.moveTo(xb - 0.5, y); ctx.lineTo(xb - 0.5, y + barH);
        ctx.stroke();
        // the "narrow this" affordance: a 4 px caret at the head of the band.
        // Present ONLY for ignorance, because only ignorance can be repaired.
        if (L.narrowable !== false && bw > 16 && barH >= 7) {
          ctx.globalAlpha = 0.9; ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(xa + 2, y + 1); ctx.lineTo(xa + 6, y + 1); ctx.lineTo(xa + 2, y + 5);
          ctx.closePath(); ctx.fill();
        }
      }
    }
    ctx.setLineDash([]);
    // TRATTEGGIO — a derived row is hatched at its own tier, on top, in ink
    // that is not spoken for by uncertainty.
    if (prov) {
      ctx.globalAlpha = 0.9; ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.setLineDash(hatchFor(prov.tier) || [3, 3]);
      ctx.strokeRect(xa + 0.5, y + 0.5, Math.max(1, xb - xa - 1), barH - 1);
      ctx.setLineDash([]);
    }
    if (s.open) {                                                   // feathered right edge
      const g = ctx.createLinearGradient(xb - 24, 0, xb, 0);
      g.addColorStop(0, col); g.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.5; ctx.fillStyle = g; ctx.fillRect(xb - 24, y, 24, barH);
    }
    // `labelOf` is handed the bar's WIDTH. Without it the narrowest span is
    // the one that loses its label — and the narrowest span is often the one
    // whose label matters most, since narrow is usually the thing being shown.
    if (L.labels !== false && xb - xa > 30 && barH >= 9) {
      ctx.globalAlpha = 0.95; ctx.fillStyle = '#04121a';
      ctx.font = '10px ui-monospace, Menlo, monospace';
      // TOP-LEFT. A label on the baseline of a tall bar floats in the middle of
      // nothing and drifts as the bar's height changes; anchored to the corner
      // it stays where the eye goes first and is the same distance from the
      // edge whatever height the lane is given.
      ctx.fillText(String(L.labelOf ? L.labelOf(s, { bw }) : s.key), xa + 5, y + 11.5);
    }
  }
  ctx.restore();
  if (L.aggregate) drawAoristic(ctx, L, C, spans);
});

/** §8.4.2: the aggregate is where a curve belongs, and it belongs as HEIGHT.
 *
 *  A STATISTIC, NOT A CURVE. PeriodO rejected fuzzy per-record curves in words
 *  worth keeping — "natural language is already a compact and easily indexable
 *  way to represent imprecision … rather than imposing an arbitrary mapping to
 *  parameterized curves" — and a smooth silhouette over pixel bins implies a
 *  density between the bins that nobody computed. So this draws a STEP: one
 *  rectangle per pixel column, verticals included, no interpolation anywhere.
 *  The first implementation drew `lineTo(i, …)` between column tops, which is a
 *  linear interpolation across the bin boundary — the exact invention refused.
 *
 *  And it states its method on the canvas: bin width, item count, and the peak
 *  VALUE, because the height is normalised to the visible peak and a normalised
 *  height whose divisor is off-screen is not a number. Pair with a RUG of
 *  individuals (§9.5, rcarbon's barCodes) so the reader can always see how many
 *  rows made the shape.
 */
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
    ctx.font = '9px ui-monospace, Menlo, monospace';
    const drop = a.open ? ` · ${a.open} open→0` : '';
    ctx.fillText(`${a.method} · peak ${a.max.toFixed(3)} · n=${a.counted}${drop}`, 3, base - h - 2);
  }
  ctx.restore();
}

/** continuous — the polyline. Two regimes, chosen by density, so there is no
 *  ceiling at either end:
 *    rows-per-column <= 2  ->  the attested rows themselves, plus deck.sampleAt
 *                              at both window edges so the line reaches them;
 *    denser              ->  a per-column min/max envelope over the real rows,
 *                              which is the only non-aliasing answer and costs
 *                              one pass.
 *  Hatched when the lane's tier >= 1 (§5b), never when it is attested. */
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
  const a = edge(C.t0); if (a) pts.push(a);
  for (const r of rows) { const v = val(r.payload); if (Number.isFinite(v)) pts.push({ x: x(r.at), y: y(v) }); }
  const b = edge(C.t1); if (b) pts.push(b);
  strokePoly(ctx, pts, style);
  if (L.dots !== false && rows.length < C.width / 6) {
    ctx.save(); ctx.fillStyle = style.color; ctx.globalAlpha = 0.9;
    for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
});

/** waveform — a peaks array on the payload (the shape the ERR audio lanes
 *  provide). Drawn as a mirrored envelope, one column per pixel, so a
 *  three-hour broadcast and a 200 ms sample use the same code. */
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

/**
 * @param canvas  an HTMLCanvasElement. The strip owns it (DPR, resize, events).
 * @param deck    a timeline deck (transport.mjs createDeck / logdeck makeLogDeck).
 * @param opts
 *   lanes    [{id, kind|kinds|filter, label, height, as, render?, …}]
 *            LANES ARE QUERIES: `kind` names a deck lane, `filter(row)` narrows
 *            the whole log, `as` picks a renderer ('ticks'|'spans'|'continuous'|
 *            'waveform' or any registered name), `render(ctx,L,C)` overrides.
 *   view     {originTime, pxPerSecond, scrollX} — partial; missing parts are
 *            fitted to deck.range.
 *   evidence 'attested' | {restored:{maxTier:n}} | 'all' — asked of the DECK.
 *   follow   boolean, default true
 *   onSeek   (posMs) => void; defaults to deck.seek
 *   onHover  (detail|null) => void
 *   hud      an element the strip writes its quality readout into
 */
export function createStrip(canvas, deck, opts = {}) {
  const ctx = canvas.getContext('2d');
  const S = {
    lanes: [], view: { originTime: 0, pxPerSecond: 20, scrollX: 0 },
    evidence: opts.evidence !== undefined ? opts.evidence : undefined,
    // U3: unlike the evidence policy this DEFAULTS rather than throws — silence
    // about certainty widens the net, it does not fabricate.
    certainty: opts.certainty || 'possible',
    follow: opts.follow !== false, followEdge: opts.followEdge ?? 0.82, followBack: opts.followBack ?? 0.28,
    userScrolled: false, dragging: false, hover: null, pos: 0,
    wallAnchor: null,                 // {pos, wall} — the dual cursor's origin
    width: 0, height: 0, dpr: 1,
    dirty: true, raf: 0, disposed: false,
    spanCache: new Map(), cacheGen: -1,
    errors: [],
    theme: {
      bg: '#0b0d12', axis: '#232838', axisMinor: '#181c27', ink: '#c9d2e4', dim: '#7a8291',
      playhead: '#ffffff', wall: '#ff9f43', lane: '#151a24', gutter: '#0f1319',
      ...(opts.theme || {}),
    },
    gutterPx: opts.gutter ?? 92,
    gutterBase: opts.gutter ?? 92,
    // NARROW-VIEWPORT gutter: at 360 px a 92 px label column eats a quarter of
    // the plot. The gutter is the one piece of chrome that can shrink without
    // changing a single measured number, because `plotW()` is derived from it
    // and every renderer already draws in plot space. Desktop is untouched:
    // the clamp only engages below `narrowAt`.
    narrowAt: opts.narrowAt ?? 520,
    gutterNarrow: opts.gutterNarrow ?? 46,
    axisH: opts.axisHeight ?? 20,
    // is the position domain absolute wall ms (replay-grid) or 0-based (jam)?
    absolute: opts.absolute !== undefined ? opts.absolute : !!(deck.range && deck.range[0] > 1e12),
  };
  const T = S.theme;

  // -- lanes as queries ------------------------------------------------------
  function setLanes(list) {
    S.lanes = (list || []).map((l, i) => ({
      id: l.id || l.kind || `lane-${i}`,
      height: l.height ?? 28,
      as: l.as || null,
      show: l.show !== false,
      ...l,
    }));
    S.spanCache.clear(); S.cacheGen = -1;
    layout();
    invalidate();
    return S.lanes;
  }
  function layout() {
    let y = S.axisH;
    for (const L of S.lanes) { L.y = y; if (L.show) y += L.height; }
    S.contentH = y;
  }

  /** The evidence policy every query resolves to. `undefined` means "let the
   *  deck's own policy decide" — which is the forced choice of §5b, not a
   *  default this component invents. */
  const ev = () => S.evidence;

  function rowsFor(L, t0, t1) {
    if (!deck.window) return [];
    const kinds = L.kinds || (L.kind !== undefined ? L.kind : undefined);
    let rows;
    // U3's knob, forwarded. It is a no-op on a SPAN lane (those query the whole
    // lane so they can pair, and (−∞,∞) contains every bracket, so `necessary`
    // accepts everything) — which is exactly why the strip re-derives the
    // predicate per VISIBLE window in whenState(). Stated because a knob that
    // is silently inert is worse than an absent one.
    const q = {};
    if (ev() !== undefined) q.evidence = ev();
    if (S.certainty !== 'possible') q.certainty = S.certainty;
    try { rows = deck.window(kinds, t0, t1, Object.keys(q).length ? q : undefined); }
    catch (e) { note(L.id, e); return []; }
    if (L.filter) rows = rows.filter(L.filter);
    if (L.rows) rows = L.rows(rows);              // last-mile client shaping
    return rows;
  }

  /** Span lanes must PAIR before they can virtualize, so they query the whole
   *  lane once and cache; the draw is still virtualized (spans outside the
   *  window are skipped). The cache is invalidated by the deck's rangeGen, by
   *  an evidence change and by strip.invalidate(). */
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

  /** DEEP-TIME ZOOM CEILING, derived from IEEE-754 rather than authored per era.
   *  ChronoZoom caps zoom depth with a hand-written `deeperZoomConstraints`
   *  table ("you cannot zoom to a day inside the Hadean"). The same rule falls
   *  out of the float for free: stop where one pixel is finer than one
   *  representable step of the position domain, because past that the grid is
   *  finer than the numbers under it. MEASURED consequences, both surprising:
   *    · at 13.8 Gyr the ceiling is 0.0153 px/s — one ulp is 65.536 s there, so
   *      the deepest honest view still spans 1400 px x 65.536 s = 25.5 HOURS.
   *      "You cannot zoom to a minute inside the Hadean, but you can zoom to a
   *      day" — ChronoZoom's per-era cap, arrived at by arithmetic;
   *    · at a 2026 wall-clock epoch stamp it is 4.10e6 px/s, which means the
   *      component's existing hard cap of 1e7 px/s was ALREADY 2.4x past the
   *      double's resolution for every `absolute` deck we ship. Nobody had
   *      zoomed there, so nobody had seen it.
   *  Reported, never silent. */
  function capPps(pps, tAtCursor) {
    const ceil = zoomCeilingPps(tAtCursor);
    const capped = Math.max(1e-30, Math.min(pps, 1e7, ceil));
    S.zoom = { pps: capped, wanted: pps, ceilingPps: ceil, ulpMs: ulpMs(tAtCursor),
               clamped: capped < pps * (1 - 1e-12), by: capped >= 1e7 ? 'hard-cap' : capped < 1e7 && ceil <= 1e7 && capped >= ceil * (1 - 1e-12) ? 'float-resolution' : null };
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
  /** zoom about a screen x, so the point under the cursor stays put */
  function zoomAt(factor, screenX = plotW() / 2) {
    const t = tAt(screenX);
    const pps = Math.max(1e-9, capPps(S.view.pxPerSecond * factor, t));
    S.view.pxPerSecond = pps;
    S.view.scrollX = ((t - S.view.originTime) / 1000) * pps - screenX;
    invalidate();
    return { ...S.view };
  }

  // -- follow mode -----------------------------------------------------------
  // demo9 re-centred EVERY FRAME and fought the user. This does not: the window
  // is a PAGE. It stays where it is until the playhead crosses followEdge, then
  // flips once. Any user scroll/drag/zoom disengages follow entirely, and only
  // a control (setFollow(true)) re-engages it.
  function followTick() {
    if (!S.follow || S.userScrolled) return;
    const px = x(S.pos), w = plotW();
    if (px > w * S.followEdge || px < 0) S.view.scrollX += px - w * S.followBack;
  }
  function setFollow(on) {
    S.follow = !!on;
    if (on) { S.userScrolled = false; followTick(); }
    opts.onFollowChange && opts.onFollowChange(S.follow, S.userScrolled);
    invalidate();
    return S.follow;
  }
  function disengage() {
    if (!S.follow || S.userScrolled) return;
    S.userScrolled = true;
    opts.onFollowChange && opts.onFollowChange(S.follow, true);
  }

  // -- the dual cursor -------------------------------------------------------
  // The lineage's best idea (§4): a wall-clock "now" line beside the playhead.
  // The GAP between them IS the accumulated pause + rate offset since the strip
  // was armed. It is never re-anchored implicitly — that would erase exactly
  // the quantity it exists to show.
  function armWall(posMs = deck.position ? deck.position() : 0) {
    S.wallAnchor = { pos: posMs, wall: (typeof performance !== 'undefined' ? performance.now() : Date.now()) };
    invalidate();
    return S.wallAnchor;
  }
  function wallPos() {
    if (!S.wallAnchor) return null;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return S.wallAnchor.pos + (now - S.wallAnchor.wall);
  }
  if (opts.armWall !== false && deck.transport && deck.transport.onState) {
    // arm on the first play, so the gap counts from the moment the piece started
    const off = deck.transport.onState((st) => {
      if (st && st.reason === 'play' && !S.wallAnchor) armWall(deck.position());
    });
    S._offState = off;
  }

  // -- readout ---------------------------------------------------------------
  /** The quality line: what the DECK says about how much of this picture was
   *  invented, and how well the transport is keeping time. Both are the deck's
   *  numbers; the strip never computes either. */
  /** the three-answer tally across every visible span lane. It belongs in the
   *  QUALITY LINE, not only in the ghosts: "12 rows undecidable at this zoom" is
   *  the sentence a curator needs, and a ghost you have to notice is not a
   *  report. */
  function visibleStates() {
    const o = { n: 0, crisp: 0, core: 0, outer: 0, unanswerable: 0, smeared: 0, ignorance: 0, vagueness: 0 };
    for (const L of S.lanes) {
      // `bars:false` lanes draw no bands, so counting them would double-count
      // any kind that also has a band lane — which is exactly the shape an
      // aggregate-in-its-own-lane creates. The quality line counts MARKS.
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
      zoom: S.zoom || null, ticks: S.axisTicks || null,
      view: { ...S.view }, lod: tickLOD(S.view.pxPerSecond),
      pos: S.pos, wall: wallPos(), gapMs: wallPos() === null ? null : +(wallPos() - S.pos).toFixed(1),
      follow: S.follow, followEngaged: S.follow && !S.userScrolled,
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
    S.gutterPx = cssW < S.narrowAt ? Math.min(S.gutterBase, S.gutterNarrow) : S.gutterBase;
  }

  // The tick loop is INDEX-BASED (`first + i*step`), never accumulating, for two
  // measured reasons: `t += minor` STALLS outright once minor <= ulp(t)/2 —
  // t + 1 === t at t >= 9.313e15 ms (~295 kyr), so an accumulating loop at deep
  // time hangs the tab rather than drifting — and even below that the
  // accumulation drifts by one ulp per tick. It is also COUNT-BOUNDED: the LOD
  // guarantees ~plotW/7 visible ticks, but a guarantee is not a bound, and the
  // ladder's old ceiling of 100 y turned a 13.8 Gyr view into 138,000,000
  // fillText calls. The clamp is reported, never silent.
  const MAX_TICKS = 4096;
  function drawAxis() {
    const { minor, major, fmt } = tickLOD(S.view.pxPerSecond);
    const t0 = tAt(0), t1 = tAt(plotW());
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
    ctx.font = '10px ui-monospace, Menlo, monospace'; ctx.fillStyle = T.dim;
    const firstMajor = Math.ceil(t0 / major) * major;
    const nMajor = Math.floor((t1 - firstMajor) / major) + 1;
    for (let i = 0; i < nMajor && i < MAX_TICKS; i++) {
      const t = firstMajor + i * major;
      const px = Math.round(x(t)) + 0.5;
      ctx.moveTo(px, 0); ctx.lineTo(px, S.contentH);
      ctx.fillText(fmt(t, S.absolute), px + 3, 10);
    }
    ctx.stroke();
    ctx.restore();
    S.axisTicks = { minor: Math.max(0, nMinor), major: Math.max(0, nMajor), clamped: nMinor > MAX_TICKS || nMajor > MAX_TICKS };
    if (S.axisTicks.clamped) note('axis', `tick LOD asked for ${Math.max(nMinor, nMajor)} ticks; drew ${MAX_TICKS}. The ladder does not reach this zoom.`);
  }

  function drawGutter() {
    ctx.save();
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    ctx.fillStyle = T.gutter; ctx.fillRect(0, 0, S.gutterPx, S.height);
    ctx.strokeStyle = T.axis; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(S.gutterPx + 0.5, 0); ctx.lineTo(S.gutterPx + 0.5, S.height); ctx.stroke();
    ctx.font = '10px ui-monospace, Menlo, monospace';
    // truncate by MEASUREMENT, not by a hardcoded character count: a lane label
    // must fit whatever gutter the client asked for.
    const avail = S.gutterPx - 15;
    const clip = (s) => {
      if (ctx.measureText(s).width <= avail) return s;
      let n = s.length;
      while (n > 1 && ctx.measureText(s.slice(0, n) + '…').width > avail) n--;
      return s.slice(0, n) + '…';
    };
    for (const L of S.lanes) {
      if (!L.show) continue;
      const st = L._style || {};
      ctx.fillStyle = st.color || T.ink; ctx.globalAlpha = 0.9;
      ctx.fillRect(4, L.y + 4, 3, Math.min(14, L.height - 8));
      ctx.fillStyle = T.ink;
      ctx.fillText(clip(String(L.label ?? L.id)), 11, L.y + 13);
      // the per-lane label GUTTER states the lane's own clock and whether it is
      // AUDIBLE — proto/instrument's two ideas, which nothing else carried.
      const caps = (deck.caps && L.kind !== undefined) ? (() => { try { return deck.caps(L.kind); } catch { return null; } })() : null;
      const sub = [];
      if (caps && caps.lane) sub.push(caps.lane);
      else if (caps && caps.domain) sub.push(caps.domain);
      if (caps && caps.audible === false) sub.push('silent');
      if (st.tier) sub.push(`tier ${st.tier}`);
      // A lane's OWN NUMBERS belong beside its own ink, not in a table
      // somewhere else that the reader has to join up by colour. `subLabel` is
      // the client's line (or lines) under the label — typical and worst, or
      // "no feedback" for a lane that cannot say.
      const client = L.subLabel === undefined || L.subLabel === null ? []
        : [].concat(L.subLabel).filter(Boolean).map(String);
      // A lane that says something about itself REPLACES the derived line
      // rather than queueing behind it. The derived line names the lane's clock
      // domain, which is worth having when nothing better is on offer and is
      // noise the moment the client has real numbers — and on a short lane it
      // was pushing those numbers out of the row entirely.
      const all = client.length ? client : (sub.length ? [sub.join(' · ')] : []);
      ctx.fillStyle = T.dim; ctx.globalAlpha = 0.8;
      for (let i = 0; i < all.length; i++) {
        const y = L.y + 24 + i * 11;
        if (y > L.y + L.height - 2) break;         // never spill into the next lane
        ctx.fillText(clip(all[i]), 11, y);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawCursors() {
    const w = plotW();
    ctx.save();
    const wp = wallPos();
    if (wp !== null && opts.wallStyle === 'head') {
      // A SECOND PLAYHEAD, in the wall colour. `take` arms this line as a
      // RECORDING head, and a recording head is a position like any other — so
      // it gets the playhead's shape (solid, 1.5 px, a triangle on top) rather
      // than the dashes and the gap band below, which belong to the drift
      // reading and would be measuring nothing here.
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
        ctx.setLineDash([4, 3]);
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
        // the label sits BELOW the axis, on its own backing, so it never fights
        // the tick labels it is measuring against
        if (gap > 34) {
          ctx.font = '9px ui-monospace, Menlo, monospace';
          const lbl = `${((wp - S.pos) / 1000).toFixed(2)} s offset`;
          const w = ctx.measureText(lbl).width + 6;
          const lx = Math.min(Math.max(0, Math.min(px, wx) + gap / 2 - w / 2), Math.max(0, S.width - S.gutterPx - w));
          ctx.globalAlpha = 0.92; ctx.fillStyle = 'rgba(8,10,16,.85)';
          ctx.fillRect(lx, S.axisH + 1, w, 11);
          ctx.fillStyle = T.wall;
          ctx.fillText(lbl, lx + 3, S.axisH + 9.5);
        }
      }
    }
    // HOW WIDE THE VIEW IS, top left. Not decoration: every question about this
    // component so far — why is a clip one pixel, why do the ticks land on the
    // 27th, is this a week or a year — is a question about the span on screen,
    // and answering it meant reading numbers out of the console. `zoom: false`
    // turns it off.
    if (opts.zoomReadout !== false) {
      const span = (plotW() * 1000) / S.view.pxPerSecond;
      const U = [[31556952e3, 'y'], [2629746e3, 'mo'], [604800e3, 'w'], [86400e3, 'd'],
                 [3600e3, 'h'], [60e3, 'min'], [1000, 's']];
      const [div, unit] = U.find(([n]) => span >= n) || [1, 'ms'];
      const n = span / div;
      const txt = `${n < 10 ? n.toFixed(1) : Math.round(n)} ${unit}`;
      // IN THE GUTTER, not over the plot. Drawn at the plot's left edge it sat
      // exactly on top of the marks — and the first thing it was used for was
      // hunting a clip that turned out to be underneath it. A readout that
      // hides the thing it is describing is worse than no readout.
      ctx.font = '9px ui-monospace, Menlo, monospace';
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = T.dim || '#8b93a1';
      ctx.fillText(txt, 8, 11);
    }

    const px = Math.round(x(S.pos)) + 0.5;
    ctx.globalAlpha = 1; ctx.strokeStyle = T.playhead; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, S.contentH); ctx.stroke();
    ctx.fillStyle = T.playhead;
    ctx.beginPath(); ctx.moveTo(px - 4, 0); ctx.lineTo(px + 4, 0); ctx.lineTo(px, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function laneContext(L, t0, t1) {
    const style = L._style = styleFor(deck, L.kind, {
      color: L.color, width: L.width, alpha: L.alpha, dash: L.dash,
    });
    const C = {
      deck, x, tAt, t0, t1, width: plotW(), pos: S.pos, evidence: ev(), style,
      hover: S.hover, view: S.view,
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

  /** A lane that does not say what it is gets asked the DECK: an adapter that
   *  declares caps.continuous is a polyline, one that emits phase pairs is a
   *  span lane, anything else is ticks. The client is not made to repeat what
   *  the adapter already stated. */
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

  function draw() {
    if (S.disposed) return;
    resize();
    layout();
    // AUTOFIT. layout() already knows the exact height the lanes need — axis
    // plus every visible lane — so a fixed canvas height is either dead space
    // below the last lane or a lane clipped off the bottom. Both happened: 01
    // ran a 72 px lane in a 120 px box, and 02 grew a third lane when a MIDI
    // device appeared and pushed it out of view. Re-resize once after setting
    // the height, so this frame draws at the new size rather than the next one.
    if (opts.autoHeight && Math.abs(parseFloat(canvas.style.height || '0') - S.contentH) > 0.5) {
      canvas.style.height = `${S.contentH}px`;
      resize();
      layout();
    }
    S.pos = deck.position ? deck.position() : 0;
    followTick();
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
    // lane backgrounds first, so bands read against their own row
    for (const L of S.lanes) {
      if (!L.show) continue;
      g.fillStyle = T.lane; g.globalAlpha = 0.55;
      g.fillRect(0, L.y, plotW(), L.height - 1);
      g.globalAlpha = 1;
    }
    drawAxis();
    // DRAW ORDER IS FIDELITY ORDER (proto/paths' legibility trick): a lane
    // declaring a higher tier goes down FIRST, wider and fainter, so attested
    // material reads ON TOP of what was invented for it.
    const order = S.lanes.filter((L) => L.show).map((L, i) => ({ L, i }))
      .sort((a, b) => (styleFor(deck, b.L.kind).tier - styleFor(deck, a.L.kind).tier) || a.i - b.i);
    for (const { L } of order) {
      const C = laneContext(L, t0, t1);
      try {
        if (L.render) L.render(g, L, C);
        else {
          const fn = RENDERERS.get(C.as);
          if (fn) fn(g, L, C);
        }
      } catch (e) { note(L.id, e); }
    }
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
    g.font = '10px ui-monospace, Menlo, monospace';
    // A line may be a plain string or {text, colour}. A coloured line gets the
    // same swatch its lane's marks carry, which is the join between a number in
    // here and the ink out there — the lane-stats table earns its readability
    // the same way, and a tooltip listing four lanes needs it more.
    const lines = (h.lines || h.text.split('\n')).map((l) => (typeof l === 'string' ? { text: l } : l));
    // A thin BAR, the same 3 px mark the gutter puts beside a lane name, not a
    // square — the tooltip and the gutter are labelling the same lanes and a
    // reader should not have to learn two shapes for one idea.
    const PAD = 9, LH = 13, SW = 3, SH = 9, GAP = 7;
    const swatched = lines.some((l) => l.colour);
    const indent = swatched ? SW + GAP : 0;
    const w = Math.max(...lines.map((l) => g.measureText(l.text).width)) + PAD * 2 + indent;
    const bh = lines.length * LH + PAD * 2 - 3;
    let bx = h.px + 10, by = Math.max(2, h.py - bh - 8);
    if (bx + w > plotW()) bx = h.px - w - 10;
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
      for (const s of C.spans) {
        const to = Number.isFinite(s.to) ? s.to : Infinity;
        if (t >= s.from - tol && t <= to + tol) return { lane: L, span: s, row: s.row, t };
      }
      return { lane: L, t };
    }
    let best = null, bd = Infinity;
    for (const r of C.rows || []) { const d = Math.abs(r.at - t); if (d < bd) { bd = d; best = r; } }
    if (best && bd <= tol * 3) return { lane: L, row: best, t };
    return { lane: L, t };
  }

  function describe(hit) {
    if (!hit) return null;
    const L = hit.lane, r = hit.row;
    const out = [`${L.label ?? L.id}  ${formatTime(hit.t, tickLOD(S.view.pxPerSecond).major, S.absolute)}`];
    if (hit.span) {
      const s = hit.span;
      const M = tickLOD(S.view.pxPerSecond).major;
      // `spanLine: false` — for a lane whose bars are already labelled with
      // their own extent. Repeating it in the tooltip spends the reader's
      // attention on something the picture has already said.
      if (L.spanLine !== false) {
        out.push(`span ${formatTime(s.from, M, S.absolute)} → ${Number.isFinite(s.to) ? formatTime(s.to, M, S.absolute) : '(open)'}`);
      }
      // the hover says WHICH OF THE THREE ANSWERS this row gives to "certainly
      // in view", in words, because the mark alone cannot carry the reason.
      const st = whenState(s, tAt(0), tAt(plotW()));
      if (st === 'core') out.push(`certain core ${formatTime(s.innerFrom, M, S.absolute)} → ${formatTime(s.innerTo, M, S.absolute)}  [inner containment]`);
      else if (st === 'outer') out.push('NO INNER BRACKET — "certainly in view" answered by OUTER containment: sound, incomplete');
      else if (st === 'unanswerable') out.push('NO INNER BRACKET and the bracket is not contained — "certainly in view" is UNDECIDABLE here (zoom out to recover it)');
      if (s.kind) out.push(`when.kind ${s.kind}${s.kind === 'ignorance' ? ' — a real day the catalogue lost: narrowable' : ' — no fact of the matter: not narrowable'}`);
      if (s.rule) out.push(`positioned by rule ${s.rule}`);
      if (s.verbatim) out.push(`verbatim ${String(s.verbatim).slice(0, 48)}`);
    }
    if (r) {
      // `terse` drops the identity and provenance lines. They exist for the
      // heritage case, where "attested" against "RESTORED tier 2" is the whole
      // point — and on a lane with no restorations in it they are noise that
      // reads as a claim: a reader seeing a green bar labelled `attested` will
      // reasonably conclude the COLOUR means attested. It does not.
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
      // What the row MEASURED is not in the row: drift, arrival, decode time all
      // live beside the log. `describeRow` lets the lane say it without any of
      // that leaking into the strip.
      if (L.describeRow) { const x = L.describeRow(r); if (x) out.push(...[].concat(x)); }
    }
    // A UNIFIED TOOLTIP. Some pages are ABOUT the relationship between lanes,
    // and there the per-lane tooltip answers the wrong question: it tells you
    // about the row you happened to touch, when what you want is every lane at
    // that instant, side by side. `describeHit` replaces the whole block; the
    // default lines are handed over so a client can extend rather than replace.
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

  // -- TOUCH -----------------------------------------------------------------
  // The five ancestors were all built with a mouse. A finger is a different
  // instrument and the difference is not "the same events, fatter":
  //
  //   · A mouse has a RESTING position, so hover is free and a press is
  //     unambiguous. A finger has neither: press IS the first contact, so
  //     press-to-seek (the desktop default) makes every touch a destructive
  //     seek before the user has said what they wanted. Touch therefore defers:
  //     the gesture is UNDECIDED until it moves past the slop or the finger
  //     lifts. Drag => pan. Lift-without-drag => tap => seek.
  //   · There is no wheel, so zoom must be PINCH, and pinch must be about the
  //     MIDPOINT, not the centre — the same invariant zoomAt() already keeps
  //     for the cursor (the time under the fingers does not move).
  //   · There is no hover, so the tooltip must have a tap equivalent, and it
  //     must be STICKY (a finger that is still down covers the thing it is
  //     describing).
  //
  // touch-action DISCIPLINE — the whole contract in one declaration:
  //   `pan-y`  the page keeps the VERTICAL axis; the strip owns the horizontal
  //            one and pinch. A vertical swipe scrolls the page and the browser
  //            hands us a pointercancel, which is exactly the right outcome and
  //            costs no code. A client that fills the viewport and has no page
  //            scroll to protect passes touchAction:'none'.
  // Nothing here calls preventDefault on a touch stream: the declaration does
  // the work, so the listeners stay passive-friendly and never fight the
  // compositor.
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
  /** ZOOM ABOUT THE MIDPOINT: the time that was under the midpoint at pinch
   *  start is still under the midpoint now. That is the same law zoomAt() keeps
   *  for a wheel, written for two moving anchors instead of one fixed one — so
   *  a pinch that also slides pans for free, which is what a hand expects. */
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
    // the PLAYHEAD is a 1.5 px line — unhittable with a finger. Give it the
    // full finger radius and a press inside it SCRUBS (the one place where a
    // touch drag is a seek and not a pan). Desktop keeps its 1 px precision:
    // this branch is only reachable from a touch pointer.
    touchGesture = Math.abs(px - x(S.pos)) <= TOUCH.slop ? 'scrub' : 'undecided';
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

  // SCRUBBING PAUSES THE TRANSPORT, and puts it back on release.
  //
  // Dragging the head while the deck is running is two authorities writing one
  // position: the drag sets it, the transport advances it, and the head fights
  // the finger. Every editor pauses for the duration of a scrub for this
  // reason. `resumeAfterScrub` remembers only that WE paused, so a drag that
  // starts on a paused deck leaves it paused.
  let resumeAfterScrub = false;
  function holdForScrub() {
    // DECIDED FRESH ON EVERY DRAG, never accumulated. If a previous drag ended
    // in a way that skipped `onUp` — a cancelled pointer, a lost capture — a
    // sticky `true` would make the NEXT release start playback on a deck the
    // reader had deliberately paused. Reported as "it starts playing sometimes
    // when I move the cursor". Assigning rather than OR-ing is the whole fix.
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
    // shift-drag PANS (and disengages follow); plain drag SEEKS — control is
    // the display, and the drag guard is jam.html's, the only one of the five
    // that had one.
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
  // iOS Safari still ships its own pinch (`gesturestart`) alongside the
  // standard pointer stream; without this the page zooms and our pinch never
  // gets its second pointer. Harmless everywhere else — nothing else fires it.
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
  }

  // -- the loop --------------------------------------------------------------
  // The strip owns no transport tick. It repaints when the deck moves or when
  // something it drew changed — never on a timer of its own.
  function loop() {
    if (S.disposed) return;
    const p = deck.position ? deck.position() : 0;
    if (S.dirty || p !== S.pos || (S.wallAnchor && (deck.playing ? deck.playing() : false))) draw();
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
    /** the lane declarations — QUERIES; replace them and the picture changes
     *  without a row moving anywhere */
    lanes: () => S.lanes,
    setLanes,
    show(id, on) { const L = S.lanes.find((l) => l.id === id); if (L) { L.show = on !== false; layout(); invalidate(); } return !!L; },
    view: () => ({ ...S.view }), setView, fit, zoomAt,
    zoomIn: (f = 1.5) => zoomAt(f), zoomOut: (f = 1.5) => zoomAt(1 / f),
    setFollow, follow: () => ({ on: S.follow, engaged: S.follow && !S.userScrolled }),
    armWall, wallPos, gapMs: () => (wallPos() === null ? null : wallPos() - S.pos),
    /** E3: the strip asks the DECK. It never filters rows itself, so an
     *  evidence-only view is the deck refusing to serve, not a hidden layer. */
    setEvidence(p) {
      S.evidence = p;
      if (deck.setEvidence && opts.deckPolicy !== false) { try { deck.setEvidence(p); } catch (e) { note('setEvidence', e); } }
      invalidate();
      return deck.evidence ? deck.evidence() : p;
    },
    evidence: () => (deck.evidence ? deck.evidence() : S.evidence),
    /** U3's knob on the picture. 'necessary' does NOT hide the rows it cannot
     *  answer for — it GHOSTS them, because a query that silently drops what it
     *  cannot decide is the failure mode the whole survey found. */
    setCertainty(c) {
      if (c !== 'possible' && c !== 'necessary') throw new Error(`certainty: use 'possible' | 'necessary', got ${JSON.stringify(c)}`);
      S.certainty = c; invalidate(); return c;
    },
    certainty: () => S.certainty,
    /** THE COUNT BEHIND THE PICTURE. The three answers of `necessary` plus the
     *  crisp case, tallied over what is on screen RIGHT NOW — so the claim
     *  "22/22 rows have an empty core" is a number a test can read, and so is
     *  the fact that the tally CHANGES WITH ZOOM. */
    spanStates(id) {
      const L = S.lanes.find((l) => l.id === id);
      return L ? spanStatesOf(L) : null;
    },
    /** the DATA half of the ignorance affordance: which rows can be repaired,
     *  by which rule, and against which verbatim string. Vagueness is excluded
     *  by construction — offering to "resolve" a vague date is a lie about the
     *  world, not a missing feature. */
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
    /** what the fingers are currently doing — the only way a headless harness
     *  can tell a pan from a pinch from a tap without reading pixels. */
    gesture: () => ({ mode: touchGesture, pointers: touches.size, pinching: !!pinch, slop: TOUCH.slop }),
    hover: () => S.hover,
    readout, invalidate, draw,
    timeToX: x, xToTime: tAt, tickLOD: () => tickLOD(S.view.pxPerSecond),
    /** per-lane painted-pixel probe: render ONE lane alone offscreen and count.
     *  The evidence-only toggle is verified with this — a restored lane must
     *  paint exactly 0 px, not a faint one. */
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
  // A live registry of every strip on the page. A touch harness cannot reach a
  // strip a client keeps in a module-scoped closure (proto/paths does), and
  // "add a global to every client" is five edits to files this component does
  // not own. One array, spliced on dispose, costs nothing and makes the shared
  // component testable wherever it is mounted.
  if (typeof globalThis !== 'undefined') (globalThis.__strips || (globalThis.__strips = [])).push(api);
  return api;
}

export default createStrip;
