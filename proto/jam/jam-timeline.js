// proto/jam/jam-timeline.js — the seam between the jam demo and the timeline
// library (timeline/transport.mjs). FIRST real client of the library.
//
// v2: the seam is nearly GONE. registerAdapter() and the whole deck (transport
// + scheduler + adapter dispatch + position observable + drift accumulation +
// reduce-on-seek) moved UPSTREAM into the library as createDeck(); the six API
// gaps this file used to paper over are closed in timeline/transport.mjs v0.2.
// What is left here is the only genuinely jam-shaped thing: mapping a flat
// {at µs} capture log into the library's {at ms} item domain with a lead-in.

import { createDeck } from '/timeline/transport.mjs';

/** A transport deck over a flat event log: play / pause / seek / rate.
 *  `log` entries are {at µs, kind, source, raw, display}; the deck's position
 *  domain is ms since the first event, offset by LEAD_IN so position 0 sits
 *  strictly before every event (so a seek(0) replays the whole session). */
export function makeDeck({
  log, adapter, kind = 'midi', tickHost = 'worker', leadInMs = 250, tailMs = 250, ...opts
} = {}) {
  const src = [...log].sort((a, b) => a.at - b.at);
  const originUs = src.length ? src[0].at : 0;
  const items = src.map((e, i) => {
    const at = (e.at - originUs) / 1000 + leadInMs;
    return { at, kind, id: 'r' + i, payload: { i, at, raw: e.raw, source: e.source, display: e.display } };
  });
  const deck = createDeck({ items, adapters: { [kind]: adapter }, tickHost, tailMs, ...opts });
  return Object.assign(deck, {
    leadInMs, kind,
    /** the sounding set the reducer says should be held at posMs (C2's LHS) */
    expectedHeld: (posMs) => [...deck.reduceAt(kind, posMs).keys()].sort((a, b) => a - b),
  });
}

/** p50/p95 over a numeric array (harness + HUD share one definition). */
export function pstats(xs) {
  const s = xs.filter((x) => x !== null && Number.isFinite(x)).sort((a, b) => a - b);
  const q = (f) => (s.length ? +s[Math.min(s.length - 1, Math.floor(s.length * f))].toFixed(2) : null);
  return { n: s.length, p50: q(0.5), p95: q(0.95), min: q(0), max: q(0.999) };
}
