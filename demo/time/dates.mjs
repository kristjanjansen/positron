// demo/time/dates.mjs: the DATES tab of /time/, which was /strip/.
//
// Two thousand years on one line, where many of the dates are a bracket rather
// than a day. This was the SANDBOX for `timeline/strip.mjs`, and it still is:
// every thing the component can do is pointed at a fixture small enough to
// read. The history of each decision is in git under `demo/strip/index.html`.
//
// 🔴 ITS CHECKS USED TO RUN ON EVERY PRESS OF `Fit`, FOR A VISITOR TOO. They
// were cheap, and the one that moved the view was already gated, but a page
// that grades itself when a person presses a button is grading in front of
// them. `Fit` fits now, and the checks run from the page's one check pass.
// ⚠️ AND THE BAR IS GLUED TO THE STRIP, WHICH THE OLD PAGE WAS NOT. The other
// four tabs were glued on 2026-09-25 (*"timeline demos: glue transport and
// timelines"*) and this one was missed because it sat in another group. The
// bar passes `scrub: false` because the strip is its position surface, which
// is the claim gluing makes.

import { el, fmtNum } from '/shell/shell.mjs';
import { SELFCHECK } from '/shell/selfcheck.mjs';
import { createTransportBar } from '/shell/transport-bar.mjs';
import { createStripView } from '/shell/strip.mjs';
import { createGlue } from '/shell/glue.mjs';
import { createDeck } from '/timeline/transport.mjs';
import { zoomCeilingPps, ulpMs, DATE_WALL_MS, calendarLOD, calendarDate, calendarSpan, calendarStep,
  calendarLabel, calendarTicks } from '/timeline/strip.mjs';
import { markAdapter } from '/shell/fixture.mjs';

const YEAR = 365.2425 * 24 * 3600 * 1000;
const SPAN = 2000 * YEAR;
const t0 = Date.UTC(100, 0, 1);
const yr = (year) => t0 + (year - 100) * YEAR;
const GLYPH = { exact: '·', ignorance: '?', vagueness: '~' };

/** Four cells, all in calendar words (asked 2026-10-05 as *"fix time"*):
 *  the date under the playhead at the ruler's own precision, how much time is
 *  in view, the ruler's step, and how many of the dates are on screen. They
 *  were `year`, `grid`, `finest 0.004 ms` and `zoom left 7.0e13 ×`, and the
 *  last two measured the float behind the axis, which no visitor can use: at
 *  year 1100 the float allows a 256th of a millisecond, so the calendar runs
 *  out of meaning long before the number does. Those limits are still
 *  asserted, in `check`. */
// What this tab is, in the fixed box under the tab row (`tab-page.mjs` rule 6).
export const about = 'Two thousand years on one line, where many dates are a range rather than a day. Zoom in until each mark shows how sure its date is.';

export const readout = { date: '', 'in view': '', grid: '', 'dates shown': '' };

export function build({ panel, set, log }) {
  // SHAPED LIKE AN ARCHIVE: dates crowd towards the present and get vaguer
  // further back. Deterministic, so one load draws what the last one drew.
  const items = [];
  for (let i = 0; i < 22; i++) {
    const u = i / 21;
    const year = Math.round(1990 - 1840 * (1 - u) * (1 - u));
    const half = year < 1400 ? Math.max(6, Math.round((1400 - year) / 14)) : 0;
    // IGNORANCE is a date that exists and is not known, VAGUENESS one that was
    // never sharp: drawn alike, not the same claim.
    const kind = !half ? null : (i % 2 ? 'vagueness' : 'ignorance');
    // A bracketed row sits at its EARLIEST bound, so `at` claims no precision
    // the row does not have.
    const row = { id: `d${i}`, kind: 'era', at: yr(year - half),
                  payload: { label: String(year), sure: kind || 'exact' } };
    if (kind) {
      row.when = { kind, earliest: yr(year - half), latest: yr(year + half),
                   rule: 'positron-demo-bracket@1' };
    }
    items.push(row);
  }
  const bracketed = items.filter((r) => r.when).length;

  const { adapter } = markAdapter({ rates: [0.25, 0.5, 1, 2] });
  const deck = createDeck({ items, adapters: { era: adapter }, range: [t0, t0 + SPAN] });
  // 🔴 OPEN ON A REAL DATE. Position 0 is 1970, where `ulpMs(0)` is the
  // smallest denormal and three of the four numbers measured the origin.
  deck.seek(t0 + SPAN / 2);

  const host = el('div');
  // The clock prints a date, because hours on a two millennia deck are a true
  // number nobody can read. `publish: false`: SCHEDULE's bar is the page's.
  const bar = createTransportBar(host, deck, {
    scrub: false, publish: false,
    fmt: (pos, range) => `${calendarDate(pos)} / ${calendarSpan(range[1] - range[0])}`,
  });

  const HI = getComputedStyle(document.documentElement).getPropertyValue('--hi').trim() || '#ffd400';
  const view = createStripView(host, deck, {
    size: 'auto',
    // 🔴 FOLLOW OFF: following put the playhead at 28% and slid every dated
    // thing off the left edge before the first frame.
    follow: false,
    // DATES on the axis, not a distance from 1970.
    absolute: true,
    // ...and ruled in real years, months and days, as a calendar is, rather
    // than in thousands of years counted from 1970 (`-1.0 ka`), which is
    // what the ms ladder printed here until 2026-10-05.
    calendar: true,
    // The `in view` cell says it, in a box that is there at every width; the
    // strip's own gutter copy dropped out at 375 and repeated it at 1280.
    zoomReadout: false,
    lanes: [
      // The mark becomes its character where the zoom has made room.
      // `gutterReserve` is the widest line each lane can show, so the gutter
      // is sized for `22 of 22` and does not narrow at `0 of 0`, which moved
      // the plot's left edge under a reader zooming in.
      { id: 'sure', kind: 'era', label: 'how sure', height: 26, as: 'ticks',
        color: HI, width: 2, glyphOf: (r) => GLYPH[r.payload?.sure] || '',
        gutterReserve: `${items.length} of ${items.length} legible` },
      { id: 'span', kind: 'era', label: 'brackets', height: 30, as: 'spans',
        color: HI, stack: false, labels: false,
        gutterReserve: `${items.length} bracketed` },
      // The bracketed rows only: a written date is a point mass and would
      // flatten every bracket's smear to half a pixel.
      { id: 'spread', kind: 'era', label: 'spread out', height: 46, as: 'spans',
        filter: (r) => !!r.when, bars: false, aggregate: true,
        gutterReserve: `${bracketed} of ${bracketed} counted` },
    ],
  });
  const { strip } = view;
  const pair = createGlue(bar.el, view.surface);

  /** Per-lane numbers beside their own ink, one short line each. */
  function gutters() {
    const by = {};
    const g = strip.lanes().find((L) => L.id === 'sure')?.glyphState;
    if (g) by.sure = [`${g.drawn} of ${g.had} legible`];
    const st = strip.spanStates('span');
    if (st) by.span = [`${st.smeared} bracketed`];
    const a = strip.aggregateStat('spread');
    if (a) by.spread = [`${a.counted} of ${a.items} counted`];
    for (const L of strip.lanes()) if (by[L.id]) L.subLabel = by[L.id];
  }

  /** How many of the dates touch the view, bracket and all. */
  const shown = (t0, t1) => items.filter((r) =>
    (r.when ? r.when.latest : r.at) >= t0 && (r.when ? r.when.earliest : r.at) <= t1).length;

  // 🔴 THE PLOT CAN WIDEN AFTER THE FIT, AND THEN THE VIEW SHOWS MORE TIME THAN
  // WAS FITTED. MEASURED 2026-10-05 on the 1280 shot: fitted to 2000 years,
  // drawn as 4,862, every date in the left third, because the fit ran before
  // the panel had its final width. So a change of plot width with the view
  // otherwise untouched keeps the SPAN, not the scale. A zoom or a pan changes
  // the view and is left alone.
  let last = null;
  function keepSpan() {
    const v = strip.view();
    const [a, b] = strip.visible();
    const w = ((b - a) * v.pxPerSecond) / 1000;
    if (last && Math.abs(w - last.w) > 1 && v.pxPerSecond === last.pps
        && v.originTime === last.origin && v.scrollX === last.scroll) {
      strip.fit(last.a, last.b, { pad: 0 });
      return keepSpan();
    }
    last = { w, a, b, pps: v.pxPerSecond, origin: v.originTime, scroll: v.scrollX };
    return [a, b];
  }

  function refresh() {
    const [a, b] = keepSpan();
    const v = strip.view();
    const t = deck.position();
    const { major } = calendarLOD(v.pxPerSecond);
    set('date', calendarDate(t, major));
    set('in view', calendarSpan(b - a));
    set('grid', calendarStep(major));
    set('dates shown', `${shown(a, b)} of ${items.length}`);
    gutters();
    strip.invalidate();
  }

  /**
   * ZOOM ABOUT THE PLAYHEAD, NOT ABOUT THE MIDDLE OF THE PLOT. `zoomIn()` holds
   * the plot's centre still, which is the playhead only if nothing has moved
   * it by a pixel, and every pixel off is multiplied by each press after it.
   * MEASURED 2026-10-05: after 28 presses the view was 9 to 18 Feb 1100 with
   * the playhead on 1 Jan 1100, off the left edge. So the playhead's own x is
   * the anchor and stays where it is on screen; if it is already off screen it
   * is brought to the middle first, because zooming about a point nobody can
   * see is zooming away from it.
   */
  function zoom(f) {
    const t = deck.position();
    const [a, b] = strip.visible();
    const w = strip.timeToX(b) - strip.timeToX(a);
    let px = strip.timeToX(t);
    if (!(px >= 0 && px <= w)) {
      const v = strip.view();
      strip.setView({ scrollX: v.scrollX + px - w / 2 });
      px = w / 2;
    }
    strip.zoomAt(f, px);
    refresh();
  }

  const btn = (label, onclick, cls = '') => {
    const b = el('button', cls, label, { type: 'button' });
    b.onclick = onclick;
    return b;
  };
  const row = el('div', 'time-row');
  row.append(
    btn('Zoom in', () => zoom(1.5)),
    btn('Zoom out', () => zoom(1 / 1.5)),
    // Primary: it is the one that puts the whole subject in view.
    btn('Fit', () => { strip.fit(); refresh(); }, 'pos-pri'),
  );
  panel.add(pair, row);
  strip.fit();
  setInterval(refresh, 250);
  refresh();
  log(`${(SPAN / YEAR).toFixed(0)} years, ${bracketed} of ${items.length} dates carry a bracket`);

  return {
    deck, bar,
    // ⚠️ TWO FRAMES ON: a strip fitted before its panel has laid out fits its whole range into the width it had then, MEASURED on the first 1280 shot as 20 s drawn in about 160 px.
    show() { requestAnimationFrame(() => requestAnimationFrame(() => { strip.fit(); refresh(); })); },
    hide() { if (deck.playing()) deck.pause(); },
    bars: [{ name: 'dates', bar, strip: view.el }],
    async check({ A }) {
      const tab = panel.el;
      A('one bar and one strip, and they are one surface',
        tab.querySelectorAll('.tbar').length === 1
          && tab.querySelectorAll('canvas.pos-strip').length === 1
          && bar.el.parentElement === view.surface.parentElement
          && !!bar.el.parentElement?.classList.contains('pos-glue'),
        `${tab.querySelectorAll('.tbar').length} bar(s), `
        + `${tab.querySelectorAll('canvas.pos-strip').length} strip(s), `
        + `in .${bar.el.parentElement?.className}`);
      strip.fit(); refresh();
      const t = deck.position();
      A('the zoom stops at a number, not at infinity', Number.isFinite(zoomCeilingPps(t)),
        `${fmtNum(zoomCeilingPps(t))} px a second at ${new Date(t).getUTCFullYear()}`);
      A('the further from now, the coarser the smallest step',
        ulpMs(DATE_WALL_MS) > ulpMs(t), `${ulpMs(t)} ms here, ${ulpMs(DATE_WALL_MS)} ms at the wall`);
      A('past 8.64e15 ms a date is no longer a date', DATE_WALL_MS === 8.64e15, String(DATE_WALL_MS));

      // THE STATISTIC IS READ OFF THE PICTURE: `aggregateStat` is what the
      // last frame actually drew, not a second computation beside it.
      strip.draw();
      const a = strip.aggregateStat('spread');
      A('uncertain dates spread out, they do not spike', !!a && a.max > 0 && a.cols > 1,
        a ? `${a.cols} columns, tallest ${a.max.toFixed(4)}` : 'the lane drew nothing');
      A('the spread keeps the weight it was given', !!a && a.total > 0, a ? a.total.toFixed(3) : 'none');
      // THE LEDGER BALANCES AT EVERY ZOOM: counted plus added-nothing is all.
      A('the spread accounts for every bracket it was handed',
        !!a && a.items === a.counted + a.open && a.items <= bracketed,
        a ? `${a.items} of ${bracketed} brackets in this window, counted ${a.counted},`
          + ` added nothing ${a.open}, cut by the edge ${a.clipped}` : 'none');
      A('it names the method it used', !!a && typeof a.method === 'string' && a.method.length > 0,
        a ? a.method : 'none');
      // THE RULER IS A CALENDAR: fitted, every label is a whole year on a
      // round step, the same writing the `date` cell uses. It read `-1.0 ka`
      // and `0.0 ka` beside a cell reading `1100` until 2026-10-05.
      const cal = calendarLOD(strip.view().pxPerSecond).major;
      const [v0, v1] = strip.visible();
      const labels = calendarTicks(cal, v0, v1).map((x) => calendarLabel(x, cal));
      // `ticks.calendar` is set only by the calendar ruler's own draw, so this
      // goes red if the strip fell back to the ms ladder.
      const drawn = strip.readout().ticks?.calendar;
      A('the ruler reads whole years on a round step when the whole span is in view',
        drawn === calendarStep(cal) && cal.u === 'y' && labels.length >= 2
          && labels.every((l) => /^-?\d+$/.test(l) && +l % cal.n === 0),
        `every ${drawn || '(ms ladder drew it)'}: ${labels.join(' ')}`);

      // A RELATIONSHIP, NOT A COUNT: zoom in and more characters appear, zoom
      // out and they go. Saved and restored inside one task.
      if (SELFCHECK) {
        const saved = strip.view();
        const glyphs = () => {
          strip.draw();
          return strip.lanes().find((L) => L.id === 'sure')?.glyphState || { had: 0, drawn: 0 };
        };
        strip.fit();
        const wide = glyphs();
        strip.fit(yr(1900), yr(2000));
        const close = glyphs();
        strip.setView(saved); strip.draw();
        A('zoom in far enough and a mark says how sure its date is',
          wide.had > wide.drawn && close.drawn === close.had && close.drawn > 0,
          `${wide.drawn} of ${wide.had} legible across 2000 years, `
          + `${close.drawn} of ${close.had} across the last hundred`);
      }
      const st = strip.spanStates('span');
      log(`${st.smeared} of ${items.length} dates are a bracket, ${st.ignorance} unknown, ${st.vagueness} vague`);
    },
  };
}
