// demo/shell/reel-line.mjs: the year of 1965 on one line, newsreels and radio
// in two lanes at the days they went out. /reel/'s timeline, moved here so a
// second page can have the same line without a copy of it.
//
// Asked 2026-10-13: *"do reel-demo-like patchbay version ... timeline is same"*
// (/concepts/archives/000/). The line is this file; what plays is the page's.
//
// 🔴 THIS FILE OPENS NOTHING AT ERR. It reads `/reel/1965.json`, which is our
// own catalogue (metadata only, no media), and it draws, picks, steps and
// scrubs. Every reach for arhiiv.err.ee or vod.err.ee is in a page, behind a
// press, counted by that page's `reachERR`. The line hands a page two moments
// and nothing else: `onPress(it)`, a press on a mark, and `onLand(it)`, a scrub
// or a press on nothing that has come to rest on a broadcast. What either one
// costs a broadcaster is the page's decision, made where its count is.
//
// Every comment below came with the code from demo/reel/index.html, where it
// was written; the dates and reports in them are that page's.

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

// ERR'S NEWSREEL TITLES ARE GENUINELY ALL-CAPS — 288 of 298, against 11 of
// 494 on the radio side. That is the film archive's own record, typed on a
// card, not a rendering accident, and it is why the two columns look unlike
// each other. Shouting is hard to read next to a lowercase lead, so this
// page sentence-cases them FOR DISPLAY ONLY: the fixture, the link and the
// slug keep exactly what ERR holds.
//
// The limit, stated rather than hidden: with no name list there is no way to
// tell a proper noun from a common one inside a shouted line, so a personal
// or place name that is not the first word comes back lowercase. A title
// that is already mixed-case is left untouched, which is what keeps the
// radio side — where capitals mean something — exact.
export const sentenceCase = (t) => {
  if (!t || t !== t.toUpperCase()) return t || '';
  // NOT after a full stop. In Estonian a period is also the ordinal marker —
  // `1965. aasta` is "the year 1965" and the next word is lowercase — and in
  // a catalogue of short titles ordinals outnumber sentence ends, so
  // capitalising after every `.` gets "1965. Aasta esimesed abiellujad".
  return t.toLowerCase().replace(/(^|[!?]\s+)(\p{Ll})/gu, (_m, lead, ch) => lead + ch.toUpperCase());
};

// ONE LANE. The other 16 films — 16 mm rushes and a few the catalogue files
// under no series — are a different kind of thing recorded for a different
// reason, and a lane holding "everything that is not the other lane" is a
// leftovers bin rather than a lane. `AK filmikroonika` alone is a series: one
// newsreel, weekly, for a year.
export const SERIES = 'AK filmikroonika 1958-1991';

/**
 * The line. Built in two steps because /reel/ builds its transport bar on the
 * deck BEFORE the strip goes on the page, and that order is its DOM order.
 *
 *   const line = createReelLine({ onPress, onLand });
 *   const bar = createTransportBar(host, line.deck, ...);   // optional
 *   line.mount(host, { footer: { lines: 3 } });
 *   await line.ready;
 *
 * @param {object} o
 * @param {(it: object) => void} o.onPress  a press (not a drag) on a mark
 * @param {(it: object) => void} o.onLand   a scrub that came to rest on a
 *   broadcast other than the day already picked
 * @param {string} [o.fixture]  the catalogue, `/reel/1965.json`
 */
export function createReelLine({ onPress = () => {}, onLand = () => {}, fixture = '/reel/1965.json' } = {}) {
  // ── the year ──────────────────────────────────────────────────────────────
  // ABSOLUTE POSITIONS, AND NEGATIVE ONES. 1965 is before the epoch, so every
  // position here is a negative number of milliseconds. That is the first deck
  // in this project ever placed outside 1970 — and it found a real bug on the
  // way: `createDeck` opened its playhead at 0, which for any range not
  // containing zero is OUTSIDE the range. Fixed in the library, not worked
  // around here.
  const deck = createDeck({ items: [], adapters: {}, range: [YEAR_FROM, YEAR_TO] });

  let items = [], radio = [], current = null, view = null, openOn = null;
  // THE DAY THAT IS PICKED, IN ITS TWO HALVES. `current` is the one that was
  // chosen; a day usually brings a newsreel AND a radio programme, and a scrub
  // that stops over either of them has landed on the day already picked rather
  // than on a new one.
  let halves = { picture: null, sound: null };

  // A CLIP IS AS WIDE AS IT IS LONG.
  //
  // It was a day wide until the catalogue could say otherwise, and it could not:
  // there is no duration field in ERR's item API. What there IS is a SHOT LIST
  // with real millisecond begin/end times, so the last shot's end is a real
  // figure — collected for 296 of the 298 films, median 2.2 min, longest 67.
  //
  // That works only because clips sit at MIDDAY. A bar drawn from midnight at
  // its true length would claim the film went out at 00:00, which nobody knows;
  // from midday it says "somewhere in this day, and this long", with room either
  // side. The two changes are one decision.
  //
  // Two films have no shot list. They draw at the median rather than at zero —
  // and the line under the strip says the length is unknown when you point at
  // one, because a bar you can see is not a number you can trust.
  let MEDIAN_MS = 132000, sharedDays = 0;   // replaced once the fixture is in
  const lengthOf = (it) => it.playedMs ?? it.catalogueMs ?? MEDIAN_MS;
  const laneFor = (id, label) => ({
    id, kind: 'part', label, height: 44, barPad: 6,
    as: 'spans', stack: false, barGap: 1, terse: true, alpha: 0.85, spanLine: false,
    // TWO HUES, because they are two archives. Yellow is the site's own and the
    // films are ours to show; radio gets teal, far enough round the circle to be
    // told apart at a two-pixel mark. Neither is a quality signal — nothing here
    // is measured — so colour carries identity only, and the playing one is the
    // same hue at full brightness rather than a different colour.
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
    // THREE SHORT LINES, AND IT WAS FOUR FACTS IN THREE. The date and the
    // length were one string with a middot holding them apart, and the fourth
    // line said which medium this is, which is what the lane it is drawn in is
    // called: the gutter beside the mark says `newsreels` or `radio` an inch
    // away. These are the lines the FOOTER under the strip shows, one per row,
    // each clipped to its own row, so a long title ellipsises rather than
    // wrapping and pushing the last line out of a fixed box.
    describeRow: (r) => {
      const p = r.payload;
      const len = p.playedMs ? `${(p.playedMs / 60000).toFixed(1)} min, measured`
        : p.catalogueMs ? `${(p.catalogueMs / 60000).toFixed(1)} min, per the shot list`
        : 'length unknown until played';
      return [sentenceCase(p.title).slice(0, 46), p.date, len];
    },
  });

  // EVERY BROADCAST, BY DAY. Stepping through one lane skips whole weeks the
  // other lane is the only witness to, and stepping through both as a flat
  // list hands you the same afternoon twice — once for its film and once for
  // its radio — on the 283 days where both survive. So the unit is the DAY:
  // one press, one broadcast day, and the day brings whichever halves of it
  // reached us. The film represents a day when there is one, because the film
  // is what carries the picture.
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
    // ⚠️ FIRST FROM WHERE THE PLAYHEAD STANDS, NOT FROM THE YEAR'S START.
    // The page opens on the first newsreel's day, and the radio archive
    // has marks days before it, so "the first" measured from 1 January
    // jumped the playhead BACK to a radio programme the reader never saw
    // on screen, and `verify.mjs`'s "play advances position" caught the
    // clock going backwards. Past the last mark, the very first one.
    const all = [...items, ...radio];
    const earliest = (xs) => xs.reduce((a, b) => (!a || b.at < a.at ? b : a), null);
    const at = deck.position();
    return earliest(all.filter((it) => it.at >= at)) || earliest(all);
  };

  // ⚠️ THE ARITHMETIC IS PURE AND THE STATE IS THE THIN WRAPPER ROUND IT, so
  // a check can grade the mapping with nothing open and nothing picked.
  // A position here is a moment in 1965: a clip is drawn from the day it went
  // out and is as wide as it is long, so `position - item.at` IS how far into
  // the film the playhead has got.
  const intoOf = (item, pos) => (pos - item.at) / 1000;

  // THE VIEW STAYS INSIDE THE YEAR. Centring on a clip near either end pushed
  // the window past it, so the axis read 1964-12-24 on a page whose whole
  // subject is 1965 — empty months either side of the material, labelled with
  // a year that has nothing on this line. The window keeps its width and
  // slides inward instead of being cropped, so the zoom the reader chose
  // survives being near an edge.
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
   * PICK A DAY ON THE LINE. Moves the playhead, frames the view, colours the
   * mark, and opens NOTHING. Returns both halves of the day.
   */
  function pick(it) {
    current = it || null;
    if (it) {
      // The playhead goes to the day it was broadcast, and the view follows if
      // the day is off the edge — stepping to something you cannot see is not
      // stepping to it.
      deck.seek(it.at);
      // KEEP THE READER'S ZOOM. Stepping re-centres on the new day at whatever
      // span is currently shown — it does not snap back to the opening view,
      // because someone who zoomed out to see the month meant it.
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

  // ── scrubbing the year ────────────────────────────────────────────────────
  /**
   * 🔴 THE PLAYHEAD FOLLOWS THE FINGER. THE BROADCAST NEAREST WHERE IT STOPS IS
   * WHAT PLAYS. Asked 2026-09-19: *"maek scrub work"*, and until then the strip
   * had no `onSeek` at all, so it fell back to `deck.seek`: a drag moved the
   * line and nothing else happened.
   *
   * ⚠️ THIS AXIS IS NOT `/tapes/`'S, WHICH IS WHY IT IS NOT A COPY OF IT. A
   * tape runs end to end, so every position on that line is inside some
   * recording. A year of weekly broadcasts is mostly GAP: the median newsreel
   * is 2.2 minutes and the next one is a week away, so almost every position a
   * finger can stop on has nothing under it at all. Landing on the nearest is
   * therefore the only reading of a scrub that can always be honoured.
   *
   * ⚠️ AND THE EXPENSIVE HALF WAITS FOR THE HAND TO STOP AND LET GO. `onSeek`
   * fires continuously through a drag; loading on every call would tear the
   * media element down and build it again once per broadcast crossed, which is
   * the lane flashing that `/tapes/` reported, and here it would also ask ERR
   * for a stream URL per film crossed. So the landing wants two things: 140 ms
   * of stillness, which is a hand that has stopped rather than one that is
   * still going, and a finger that is off the glass.
   */
  // WHICH LANE THE FINGER IS IN. `onSeek` is handed a position and nothing
  // else, and the two lanes are two archives, so a drag along the radio lane
  // has to land on radio. The strip resolves the lane for its own hover and
  // does not publish it, so the y is read here off the same geometry its
  // `laneAt` uses: lane boxes are in canvas units, and a client y scales into
  // them through the canvas's rect.
  let pointerLane = null, pressAt = null;
  const laneAtClientY = (clientY) => {
    const r = view.strip.canvas.getBoundingClientRect();
    if (!r.height) return null;
    const y = (clientY - r.top) * (view.strip.state.height / r.height);
    return view.strip.lanes().find((L) => L.show && y >= L.y && y < L.y + L.height) || null;
  };
  // HOW NEAR A BROADCAST IS TO A MOMENT: the distance to its SPAN, not to its
  // start. A mark is minutes wide against days of gap, so the two answers
  // differ only when somebody has zoomed right in, which is exactly when a
  // finger resting inside a clip means that clip.
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
    // 🔴 NOTHING PLAYS UNDER A FINGER THAT IS STILL DOWN. A hand can stop for
    // 140 ms halfway through a drag and go on, and opening a stream at that
    // moment is a broadcast chosen by a pause in somebody's movement rather
    // than by where they let go. The landing is KEPT rather than dropped: the
    // release below runs it.
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
    // What a landing does is the page's: keep going if it was going, and
    // otherwise just pick it. A scrub across a stopped year is somebody
    // reading the line, and opening a stream under every finger that comes
    // to rest is the cost these pages exist not to impose.
    onLand(it);
  }

  /**
   * Put the line on the page.
   * @param {Element} host
   * @param {object} [o]
   * @param {false|object} [o.footer]  the strip's footer, `{ lines: 3 }` on
   *   /reel/. `false` draws none, and the strip's own tooltip says the same
   *   three lines on hover instead.
   */
  function mount(host, { footer = false } = {}) {
    view = createStripView(host, deck, {
      size: 'auto', follow: false, gutter: 150,
      // DECLARED, not guessed. The strip's fallback asks `range[0] > 1e12`, which
      // is 2001-09-09 — every date before that, and every negative one, fails it,
      // so 1965 would print as a duration instead of a date.
      absolute: true,
      // TWO LANES, ONE DAY. Both are positioned by the date they went out, so a
      // newsreel and a radio programme from the same day sit at the same place —
      // which is the thing neither archive's own interface can show you, and the
      // reason to put them on a line at all.
      lanes: [laneFor('ak', 'newsreels'), laneFor('radio', 'radio')],
      // Named rather than inline, so a check can drive the same entry a finger
      // does. What a check grades is `nearestOf`, which is the half of the
      // decision that needs nothing from ERR.
      onSeek: (at) => stripSeek(at),
      // THE LANE'S OWN THREE LINES AND NOTHING ABOVE THEM. The strip's default
      // block opens with the lane name and the time under the pointer, which
      // here is `newsreels` (the gutter an inch to the left already says it) and
      // the date (which `describeRow` already carries), and in a three line box
      // that header pushed the length off the bottom. Off a mark, the default
      // stands, so the box still says where the pointer is.
      describeHit: (hit) => (hit.row && hit.lane.describeRow ? hit.lane.describeRow(hit.row) : null),
      // See /reel/ for why its three lines go UNDER the line rather than over
      // it (*"add feature to timeline: footer section"*, 2026-09-19).
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
     * PRESS A MARK TO PLAY IT.
     *
     * ⚠️ A PRESS, NOT A DRAG, and that became load-bearing the moment the drag
     * above started meaning something. A plain drag on this strip SEEKS, and the
     * strip stops updating its hover for the duration of one, so the hit sitting
     * in `hover` at the end of a drag is the mark the drag STARTED on. Without
     * the six pixels, every scrub would finish by playing whatever it set off
     * from.
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
      // A press on nothing is still a position: it lands on the broadcast
      // nearest it, exactly as a drag does. ⚠️ AND IT LANDS HERE RATHER THAN
      // WAITING FOR THE TIMER, because a press held longer than 140 ms has
      // already spent the timer while the finger was down and there is no second
      // one coming.
      if (!it) { if (scrubTo) landScrub(); return; }
      // A press on a mark is an ANSWER, so the drag's deferred landing has
      // nothing left to decide. Without this the timer fires 140 ms later and
      // lands on whatever was nearest that pixel, which is usually the mark just
      // pressed and is not always it.
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

    // A MONTH. That is a view about the YEAR rather than about one film: roughly
    // twenty-four newsreels on screen at once, which is what makes the shape of
    // the series visible — weekly, all year, with the gaps where a week was
    // missed.
    //
    // Each clip is a 2 px mark at this span, and that is the floor doing its
    // job rather than a failure. A 2.2-minute film in a month is 0.005 % of the
    // view; nothing shows that honestly AND legibly at once. So the width is
    // proportional wherever there is room for it to be, the floor keeps a clip
    // from vanishing, and the strip prints its own span so the trade is visible
    // instead of mysterious. Zoom in and the bars become bars.
    const SPAN = 30 * DAY;
    // Open on a day where BOTH survive, so the thing the page does is visible
    // before anyone presses anything. Most days pair — 283 of them — but the
    // first newsreel of the year is not one of them, and opening on a silent
    // day makes the page look like it only has half the material.
    //
    // 🔴 THE VIEW OPENS THERE. NOTHING IS PICKED AND NOTHING IS FETCHED.
    // Framing the month and standing the playhead on the day costs no bytes and
    // says the same thing: here is where the material starts.
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
