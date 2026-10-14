// Flat capture logs in epoch microseconds to the library's ms items, for several lanes on one
// timeline:
// makeLogDeck({ lanes: [{ kind, rows, adapter, expand? }] }). Knows nothing of notes.
// why: lessons/timeline-misc.md#logdeck

import { createDeck } from './transport.mjs';

// lanes [{kind, rows [{at us}], adapter, expand?(row, i)}], originUs (default earliest row),
// leadInMs
// (position 0 sits before the origin); everything else goes to createDeck().
// why: lessons/timeline-misc.md#make-log-deck
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
        // Control fields are injected after the payload spread, or the row's own epoch-us `at`
        // overwrites the
        // computed one; the row's stamp stays reachable as `atUs`.
        // why: lessons/timeline-misc.md#control-fields
        const { at: rowAt, ...rest } = p.payload || {};
        items.push({
          at, kind: ln.kind, id: p.id ?? `${ln.kind}-${i}`,
          payload: { ...rest, ...(rowAt !== undefined && rest.atUs === undefined ? { atUs: rowAt } : {}), i, at },
        });
      }
    });
  }

  const deck = createDeck({ items, adapters: ads, tailMs, ...opts });
  return Object.assign(deck, {
    originUs: origin, leadInMs, toPos, toAtUs,
    laneCount: (kind) => items.filter((it) => it.kind === kind).length,
    // The keys the reducer asserts at posMs, for a reducer returning a Map or a Set.
    // why: lessons/timeline-misc.md#reduced-keys
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
