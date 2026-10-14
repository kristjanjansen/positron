// demo/shell/reel-line.mjs: 1965 on one line, newsreels and radio in two lanes by broadcast day.
// Opens nothing at ERR: it reads our own /reel/1965.json and hands the page `onPress` and `onLand`;
// every reach for ERR is the page's, behind a press.
// why: lessons/kit-reel-line.md#header

import { createStripView } from './strip.mjs';
import { createDeck } from '/timeline/transport.mjs';

export const YEAR_FROM = Date.UTC(1965, 0, 1);
export const YEAR_TO   = Date.UTC(1966, 0, 1);
export const ARHIIV = 'https://arhiiv.err.ee';
export const DAY = 86400000;
export const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

// ONE TABLE FOR THE TWO ARCHIVES' INK, read by the lane that draws the marks
// AND by the key above the column, so the two cannot drift apart. Typing the
// same yellow twice is how a legend starts being needed.
export const INK = {
  video: { on: '#ffd400', off: 'hsl(50 62% 40%)' },
  audio: { on: 'hsl(185 80% 62%)', off: 'hsl(185 45% 34%)' },
};

// ERR's newsreel titles are all caps (288 of 298); sentence-cased for display only.
// Mixed-case titles are left alone; proper nouns past the first word come back lowercase.
// why: lessons/kit-reel-line.md#sentence-case
export const sentenceCase = (t) => {
  if (!t || t !== t.toUpperCase()) return t || '';
  // Not after a full stop: in Estonian `1965. aasta` is an ordinal and the next word stays lowercase.
  // why: lessons/kit-reel-line.md#sentence-case-period
  return t.toLowerCase().replace(/(^|[!?]\s+)(\p{Ll})/gu, (_m, lead, ch) => lead + ch.toUpperCase());
};

// One lane: AK filmikroonika is the series; the other 16 films are a different kind of thing.
// why: lessons/kit-reel-line.md#series
export const SERIES = 'AK filmikroonika 1958-1991';

/**
 * The line, built in two steps so /reel/ can put its transport bar on the deck first:
 *   const line = createReelLine({ onPress, onLand }); line.mount(host, { footer: { lines: 3 } });
 * @param {object} o
 * @param {(it: object) => void} o.onPress  a press (not a drag) on a mark
 * @param {(it: object) => void} o.onLand   a scrub that came to rest on a broadcast other than the day picked
 * @param {string} [o.fixture]  the catalogue, `/reel/1965.json`
 * why: lessons/kit-reel-line.md#create-reel-line
 */
export function createReelLine({ onPress = () => {}, onLand = () => {}, fixture = '/reel/1965.json' } = {}) {
  // Absolute positions, all negative: 1965 is before the epoch.
  // why: lessons/kit-reel-line.md#the-year
  const deck = createDeck({ items: [], adapters: {}, range: [YEAR_FROM, YEAR_TO] });

  let items = [], radio = [], current = null, view = null, openOn = null;
  // The picked day's two halves; a scrub stopping over either has landed on the day already picked.
  // why: lessons/kit-reel-line.md#halves
  let halves = { picture: null, sound: null };

  // A clip is as wide as it is long (last shot's end; median 2.2 min) and sits at midday.
  // The two films with no shot list draw at the median and say their length is unknown.
  // why: lessons/kit-reel-line.md#clip-width
  let MEDIAN_MS = 132000, sharedDays = 0;   // replaced once the fixture is in
  const lengthOf = (it) => it.playedMs ?? it.catalogueMs ?? MEDIAN_MS;
  const laneFor = (id, label) => ({
    id, kind: 'part', label, height: 44, barPad: 6,
    as: 'spans', stack: false, barGap: 1, terse: true, alpha: 0.85, spanLine: false,
    // Two hues for two archives; colour is identity only, the playing one is the same hue brighter.
    // why: lessons/kit-reel-line.md#two-hues
    colorOf: (sp) => {
      const on = sp.row?.payload?.slug === current?.slug;
      const ink = INK[id === 'radio' ? 'audio' : 'video'];
      return on ? ink.on : ink.off;
    },
    labelOf: (sp, { bw }) => (bw > 90 ? sentenceCase(sp.row?.payload?.title).slice(0, 40) : ''),
    rows: () => (id === 'radio' ? radio : items).map((it) => ({
      at: it.at, id: it.slug, kind: 'part',
      payload: { durMs: lengthOf(it), ...it },
    })),
    // Three short lines, one per footer row, each clipped to its row; the lane gutter names the medium.
    // why: lessons/kit-reel-line.md#describe-row
    describeRow: (r) => {
      const p = r.payload;
      const len = p.playedMs ? `${(p.playedMs / 60000).toFixed(1)} min, measured`
        : p.catalogueMs ? `${(p.catalogueMs / 60000).toFixed(1)} min, per the shot list`
        : 'length unknown until played';
      return [sentenceCase(p.title).slice(0, 46), p.date, len];
    },
  });

  // Stepping unit is the broadcast day (283 days have both halves); the film represents it when there is one.
  // why: lessons/kit-reel-line.md#days
  let days = [];
  const rebuildDays = () => {
    const byDate = new Map();
    for (const it of items) byDate.set(it.date, it);
    for (const r of radio) if (!byDate.has(r.date)) byDate.set(r.date, r);
    days = [...byDate.values()].sort((a, b) => a.at - b.at);
  };

  /** The broadcast day before or after the picked one (or the playhead). */
  const next = (by) => {
    if (!days.length) return null;
    const at = current ? current.at : deck.position();
    const n = by > 0
      ? days.find((x) => x.at > at)
      : [...days].reverse().find((x) => x.at < at);
    return !n || n === current ? null : n;
  };

  /** The first mark of either lane from where the playhead stands; past the
   *  last mark, the very first one. */
  const firstFromPlayhead = () => {
    // First measured from the playhead, not 1 January, or play jumps backwards.
    // why: lessons/kit-reel-line.md#first-from-playhead
    const all = [...items, ...radio];
    const earliest = (xs) => xs.reduce((a, b) => (!a || b.at < a.at ? b : a), null);
    const at = deck.position();
    return earliest(all.filter((it) => it.at >= at)) || earliest(all);
  };

  // Pure arithmetic: a clip starts at the day it went out, so `position - item.at` is how far in.
  // why: lessons/kit-reel-line.md#into-of
  const intoOf = (item, pos) => (pos - item.at) / 1000;

  // The view stays inside 1965: the window keeps its width and slides inward, so the zoom survives.
  // why: lessons/kit-reel-line.md#fit-in-year
  const fitInYear = (from, to) => {
    const w = Math.min(to - from, YEAR_TO - YEAR_FROM);
    let a = from, b = a + w;
    if (a < YEAR_FROM) { a = YEAR_FROM; b = a + w; }
    if (b > YEAR_TO) { b = YEAR_TO; a = b - w; }
    view.strip.fit(a, b);
  };

  function gutters() {
    if (!view) return;
    const lane = view.strip.lanes().find((l) => l.id === 'ak');
    const list = items;
    if (lane) {
      // WHAT THIS LANE HAS, and nothing it has not measured. No durations here:
      // only films that have been PLAYED have a measured length, and a range
      // derived from two of them would be a fabricated figure.
      lane.subLabel = list.length
        ? [`${list.length} newsreels`,
           `${list[0].date.slice(5)} to ${list[list.length - 1].date.slice(5)}`,
           'one a week, all year']
        : null;
    }
    view.strip.invalidate();
  }

  /**
   * Pick a day: moves the playhead, frames the view, colours the mark, opens nothing.
   * why: lessons/kit-reel-line.md#pick
   */
  function pick(it) {
    current = it || null;
    if (it) {
      // The playhead goes to the day it was broadcast, and the view follows if
      // the day is off the edge — stepping to something you cannot see is not
      // stepping to it.
      deck.seek(it.at);
      // Keep the reader's zoom: re-centre at the current span.
      // why: lessons/kit-reel-line.md#pick-zoom
      const v = view.strip.view();
      const span = (view.strip.canvas.width / (window.devicePixelRatio || 1)) * 1000 / v.pxPerSecond;
      const left = v.originTime + (v.scrollX / v.pxPerSecond) * 1000;
      // `span > 0` because a canvas that has not been measured yet reports a
      // width of 0, and re-centring on a view with no width asks `fit` for an
      // empty window.
      if (span > 0 && (it.at < left || it.at > left + span)) fitInYear(it.at - span / 2, it.at + span / 2);
    }
    // BOTH HALVES OF THE DAY, whichever one was picked. Picking a newsreel
    // finds that date's radio and picking a radio programme finds that date's
    // newsreel, so the two columns and what actually plays always agree.
    const picture = !it ? null : it.kind === 'video' ? it : items.find((v) => v.date === it.date) || null;
    const sound   = !it ? null : it.kind === 'audio' ? it : radio.find((r) => r.date === it.date) || null;
    halves = { picture, sound };
    view.strip.invalidate();
    return { picture, sound };
  }

  // The playhead follows the finger; the broadcast nearest where it lands is what plays, after
  // 140 ms of stillness and a released finger. The lane comes from the pointer y, read off the
  // strip's lane geometry.
  // why: lessons/kit-reel-line.md#scrub
  let pointerLane = null, pressAt = null;
  const laneAtClientY = (clientY) => {
    const r = view.strip.canvas.getBoundingClientRect();
    if (!r.height) return null;
    const y = (clientY - r.top) * (view.strip.state.height / r.height);
    return view.strip.lanes().find((L) => L.show && y >= L.y && y < L.y + L.height) || null;
  };
  // Distance to a broadcast's span, not its start, so a finger inside a clip means that clip.
  // why: lessons/kit-reel-line.md#nearest-of
  const nearestOf = (at, pool) => {
    let best = null, gap = Infinity;
    for (const it of pool) {
      const from = it.at, to = it.at + lengthOf(it);
      const g = at < from ? from - at : at > to ? at - to : 0;
      if (g < gap) { gap = g; best = it; }
    }
    return best;
  };
  let scrubTo = null, scrubTimer = 0;
  const cancelScrub = () => { clearTimeout(scrubTimer); scrubTimer = 0; scrubTo = null; };
  function stripSeek(at) {
    // The line moves NOW, whatever is loaded underneath it. Deferring this as
    // well would be a scrub with no feedback, which is worse than a flash.
    deck.seek(at);
    scrubTo = { at, lane: pointerLane?.id || null };
    clearTimeout(scrubTimer);
    scrubTimer = setTimeout(landScrub, 140);
  }
  function landScrub() {
    scrubTimer = 0;
    // Nothing plays under a finger still down; the landing is kept for the release.
    // why: lessons/kit-reel-line.md#land-scrub-held
    if (pressAt) return;
    const s = scrubTo; scrubTo = null;
    if (!s) return;
    // The lane the drag was in, when it was in one. A finger on the axis or in
    // the gutter has not said which archive it means, so it gets the nearest
    // broadcast of either kind.
    const pool = s.lane === 'radio' ? radio : s.lane === 'ak' ? items : days;
    const it = nearestOf(s.at, pool.length ? pool : days);
    // Already picked. A day brings both of its halves, so a drag that stops
    // over a newsreel's own radio programme has landed on the day it is on.
    if (!it || it === halves.picture || it === halves.sound) return;
    // What a landing does is the page's decision.
    // why: lessons/kit-reel-line.md#land-scrub-on-land
    onLand(it);
  }

  /**
   * Put the line on the page. @param {Element} host
   * @param {object} [o] @param {false|object} [o.footer]  `{ lines: 3 }` on /reel/; false uses the tooltip
   * why: lessons/kit-reel-line.md#mount
   */
  function mount(host, { footer = false } = {}) {
    view = createStripView(host, deck, {
      size: 'auto', follow: false, gutter: 150,
      // Declared: the strip's `range[0] > 1e12` guess fails for 1965 and prints a duration.
      // why: lessons/kit-reel-line.md#absolute
      absolute: true,
      // Both lanes positioned by broadcast date, so a day's film and radio line up.
      // why: lessons/kit-reel-line.md#two-lanes
      lanes: [laneFor('ak', 'newsreels'), laneFor('radio', 'radio')],
      // Named rather than inline, so a check can drive the same entry a finger
      // does. What a check grades is `nearestOf`, which is the half of the
      // decision that needs nothing from ERR.
      onSeek: (at) => stripSeek(at),
      // On a mark, only the lane's three lines; off one, the strip's default.
      // why: lessons/kit-reel-line.md#describe-hit
      describeHit: (hit) => (hit.row && hit.lane.describeRow ? hit.lane.describeRow(hit.row) : null),
      // See /reel/ for why its three lines go under the line.
      // why: lessons/kit-reel-line.md#footer
      ...(footer ? { footer } : {}),
    });

    const c = view.strip.canvas;
    c.addEventListener('pointerdown', (e) => {
      pointerLane = laneAtClientY(e.clientY);
      pressAt = { x: e.clientX, y: e.clientY };
    });
    c.addEventListener('pointermove', (e) => { pointerLane = laneAtClientY(e.clientY); });
    // A gesture somebody else claimed is not a choice of broadcast.
    c.addEventListener('pointercancel', () => { pressAt = null; cancelScrub(); });
    /**
     * Press a mark to play it: a press, not a drag (6 px), since a drag seeks and leaves
     * `hover` on the mark it started from.
     * why: lessons/kit-reel-line.md#press-mark
     */
    c.addEventListener('pointerup', (e) => {
      const p = pressAt; pressAt = null;
      if (!p || Math.abs(e.clientX - p.x) > 6 || Math.abs(e.clientY - p.y) > 6) {
        // A DRAG, so this release IS the answer. The timer may already have run
        // and stood off because the hand was still down; either way the landing
        // happens now rather than never.
        if (scrubTo) landScrub();
        return;
      }
      const h = view.strip.state?.hover;
      const slug = h?.row?.payload?.slug;
      const it = slug && (items.find((x) => x.slug === slug) || radio.find((x) => x.slug === slug));
      // A press on nothing lands on the nearest broadcast now: a long press already spent the timer.
      // why: lessons/kit-reel-line.md#press-nothing
      if (!it) { if (scrubTo) landScrub(); return; }
      // A press on a mark answers; cancel the drag's deferred landing.
      // why: lessons/kit-reel-line.md#press-cancel
      cancelScrub();
      onPress(it);
    });
    return view;
  }

  // ── load the year ─────────────────────────────────────────────────────────
  // Waits for `mount`, because the opening view is a fact about the strip.
  let mounted;
  const isMounted = new Promise((r) => { mounted = r; });
  const mountAndSay = (host, o) => { const v = mount(host, o); mounted(); return v; };
  const ready = (async () => {
    const fx = await (await fetch(fixture)).json();
    await isMounted;
    items = fx.items.filter((i) => i.kind === 'video' && i.series === SERIES);
    radio = fx.items.filter((i) => i.kind === 'audio');
    const filmDays = new Set(items.map((i) => i.date));
    sharedDays = radio.filter((r) => filmDays.has(r.date)).length;
    rebuildDays();
    const known = items.map((i) => i.catalogueMs).filter(Boolean).sort((a, b) => a - b);
    if (known.length) MEDIAN_MS = known[known.length >> 1];
    gutters();

    // A month: the series' weekly shape is visible. Clips are 2 px marks at this span; the strip
    // prints its span so the trade is visible.
    // why: lessons/kit-reel-line.md#span
    const SPAN = 30 * DAY;
    // Open on a day where both survive. The view opens there; nothing is picked or fetched.
    // why: lessons/kit-reel-line.md#open-on
    const radioDays = new Set(radio.map((r) => r.date));
    openOn = items.find((i) => radioDays.has(i.date)) || items[0];
    fitInYear(openOn.at - SPAN / 2, openOn.at + SPAN / 2);
    deck.seek(openOn.at);
  })();

  return {
    deck,
    mount: mountAndSay,
    ready,
    get view() { return view; },
    get items() { return items; },
    get radio() { return radio; },
    get days() { return days; },
    get current() { return current; },
    get halves() { return halves; },
    get openOn() { return openOn; },
    get sharedDays() { return sharedDays; },
    get medianMs() { return MEDIAN_MS; },
    pick, next, firstFromPlayhead, intoOf, nearestOf, gutters, lengthOf,
  };
}
