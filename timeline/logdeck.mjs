// timeline/logdeck.mjs — the *flat capture log* front end for transport.mjs.
//
// Every client of this library so far stores its performance as one flat log of
// rows stamped in EPOCH MICROSECONDS, and every one of them has had to write
// the same eight lines to get from there to the library's {at ms} item domain:
// find the origin, subtract it, divide by 1000, add a lead-in so position 0
// sits strictly before the first event. proto/jam wrote it first
// (proto/jam/jam-timeline.js `makeDeck`, the 39-line seam); the instrument
// client needed it again — but with TWO note lanes and a media lane on ONE
// timeline, which `makeDeck`'s single-`kind` signature cannot express.
//
// So the seam moves up here and grows a `lanes` array. `makeDeck({log, adapter,
// kind})` is exactly `makeLogDeck({lanes: [{kind, rows: log, adapter}]})`.
//
// A lane may emit more than one item per row (`expand`) — a media-span row is a
// start/end PAIR on the timeline, which is how proto/selfrec/replay-grid.html
// schedules its tiles.
//
// Plain ESM, no deps, browser+node. Nothing here knows what a note is.

import { createDeck } from './transport.mjs';

/**
 * @param lanes   [{kind, rows:[{at µs,…}], adapter, expand?(row,i)->[{atUs|atMs,id?,payload?}]}]
 * @param originUs  explicit position-domain origin (default: earliest row)
 * @param leadInMs  position 0 sits this far BEFORE the origin, so seek(0)
 *                  replays the whole session instead of starting mid-note
 * everything else is handed straight to createDeck().
 */
export function makeLogDeck({
  lanes = [], originUs, leadInMs = 250, tailMs = 250, adapters = {}, items: extra = [], ...opts
} = {}) {
  let origin = originUs;
  if (origin === undefined) {
    for (const ln of lanes) for (const r of ln.rows || []) if (origin === undefined || r.at < origin) origin = r.at;
    if (origin === undefined) origin = 0;
  }
  const toPos = (atUs) => (atUs - origin) / 1000 + leadInMs;
  const toAtUs = (pos) => Math.round((pos - leadInMs) * 1000 + origin);

  const items = [...extra];
  const ads = { ...adapters };
  for (const ln of lanes) {
    if (ln.adapter) ads[ln.kind] = ln.adapter;
    const rows = [...(ln.rows || [])].sort((a, b) => a.at - b.at);
    rows.forEach((row, i) => {
      const parts = ln.expand ? ln.expand(row, i, toPos) : [{ atUs: row.at, payload: row }];
      for (const p of parts) {
        if (!p) continue;
        const at = p.atMs !== undefined ? p.atMs : toPos(p.atUs);
        items.push({ at, kind: ln.kind, id: p.id ?? `${ln.kind}-${i}`, payload: { i, at, ...p.payload } });
      }
    });
  }

  const deck = createDeck({ items, adapters: ads, tailMs, ...opts });
  return Object.assign(deck, {
    originUs: origin, leadInMs, toPos, toAtUs,
    laneCount: (kind) => items.filter((it) => it.kind === kind).length,
    /** the keys the reducer says should be asserted at posMs — C2's left-hand
     *  side, for any reducer returning a Map or a Set (held notes, present
     *  tiles, fired cue ids). */
    reducedKeys(kind, posMs) {
      const s = deck.reduceAt(kind, posMs);
      if (!s) return [];
      return [...(typeof s.keys === 'function' ? s.keys() : s)].sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
    },
  });
}

/** p50/p95 over a numeric array (harness + HUD share one definition). */
export function pstats(xs) {
  const s = xs.filter((x) => x !== null && Number.isFinite(x)).sort((a, b) => a - b);
  const q = (f) => (s.length ? +s[Math.min(s.length - 1, Math.floor(s.length * f))].toFixed(2) : null);
  return { n: s.length, p50: q(0.5), p95: q(0.95), min: q(0), max: q(0.999) };
}
