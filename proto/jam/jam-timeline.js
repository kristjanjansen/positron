// proto/jam/jam-timeline.js — the seam between the jam demo and the timeline
// library (timeline/transport.mjs). FIRST real client of the library.
//
// Before: jam-core.js replayed its log through a hand-rolled 25 ms / 120 ms
// `pending[]` loop with one closure per event, no cancellation path, and no
// pause / seek / rate at all (the graveyard shape, four generations running).
// After: the {p0,t0,rate} vector + the lookahead scheduler drive the demo's
// EXISTING actuate() path. Nothing about rendering is duplicated here.
//
// This module also contains the ONE seam the library does not ship: an adapter
// registry. A real client thinks in per-kind adapters `{actuate, caps, reduce}`;
// the library only offers `onFire` (all kinds, unfiltered) + `setPolicy(kind, …)`.
// registerAdapter() below is the ~12 lines every client would otherwise rewrite.

import {
  createTransport, createScheduler, workerTickHost, mainTickHost, observePosition,
} from '/timeline/transport.mjs';

/** Register a kind adapter against a scheduler.
 *  adapter = { actuate(payload, driftRec), caps, reduce?(payloads, pos), assertState?(state, info) }
 *  caps.catchUp selects the library's per-kind policy: 'burst' | 'drop' | 'reduce'. */
export function registerAdapter(sched, kind, adapter) {
  const offFire = sched.onFire((ev, rec) => { if (ev.kind === kind) adapter.actuate(ev.payload, rec); });
  const catchUp = (adapter.caps && adapter.caps.catchUp) || 'burst';
  if (catchUp === 'reduce' && adapter.reduce && adapter.assertState) {
    // stall catch-up: fold the missed window to state and assert it, instead of
    // machine-gunning N notes at once (the musical answer to a frozen tab)
    sched.setPolicy(kind, {
      reduce: (batch, info) => adapter.assertState(adapter.reduce(batch.map((e) => e.payload), info.pos), info),
    });
  } else sched.setPolicy(kind, catchUp);
  return offFire;
}

/** A transport deck over a flat event log: play / pause / seek / rate.
 *  `log` entries are {at µs, kind, source, raw, display}; the deck's position
 *  domain is ms since the first event, offset by LEAD_IN so position 0 sits
 *  strictly before every event (so a seek(0) replays the whole session). */
export function makeDeck({
  log, adapter, kind = 'midi', tickHost = 'worker',
  tickMs = 25, horizonMs = 100, lateGraceMs = 150, leadInMs = 250, tailMs = 250,
  onPosition, onDrift,
} = {}) {
  const src = [...log].sort((a, b) => a.at - b.at);
  const originUs = src.length ? src[0].at : 0;
  const items = src.map((e, i) => {
    const at = (e.at - originUs) / 1000 + leadInMs;
    return { at, payload: { i, at, raw: e.raw, source: e.source, display: e.display } };
  });
  const durationMs = (items.length ? items[items.length - 1].at : 0) + tailMs;

  const host = tickHost === 'main' ? mainTickHost() : workerTickHost();
  const transport = createTransport();                       // wall clock (library default)
  const sched = createScheduler(transport, { tickMs, horizonMs, lateGraceMs, host });
  registerAdapter(sched, kind, adapter);
  for (const it of items) sched.schedule({ at: it.at, kind, id: 'r' + it.payload.i, payload: it.payload });
  sched.start();                                             // rate is 0 → nothing fires yet

  let drift = [];                                            // the library's drift channel, accumulated
  function pump() {
    const rows = sched.drainDrift();
    if (rows.length) { drift.push(...rows); onDrift && onDrift(rows, drift); }
    return drift.length;
  }
  const pumpIv = setInterval(pump, 100);
  const offPos = observePosition(transport, (s) => { onPosition && onPosition(s.pos, durationMs); });

  const heldAt = (p) => adapter.reduce(items.filter((x) => x.at <= p).map((x) => x.payload), p);

  /** seek = move the vector, then silence and re-assert reduce(events ≤ t).
   *  The scheduler reconciles its own statuses (≤ pos → passed, > pos → pending),
   *  so the reducer and the lane agree on the boundary and nothing double-fires. */
  function seek(posMs) {
    const p = Math.max(0, Math.min(durationMs, posMs));
    transport.seek(p);
    if (adapter.reduce && adapter.assertState) adapter.assertState(heldAt(p), { pos: p, reason: 'seek' });
    return pump(), p;
  }

  return {
    transport, sched, items, durationMs, leadInMs, kind, hostName: host.name,
    play() { transport.play(); },
    pause() { transport.pause(); pump(); },
    setRate(r) { transport.setRate(r); },
    seek,
    position: () => transport.position(),
    rate: () => transport.rate,
    playing: () => transport.playing,
    /** every fire's {intendedUs, firedUs, deltaMs, origin} — the drift channel */
    drift: () => (pump(), drift.slice()),
    fireCount: () => pump(),
    resetDrift() { sched.drainDrift(); drift = []; },
    expectedHeld: (posMs) => [...heldAt(posMs).keys()].sort((a, b) => a - b),
    audit: () => sched.audit(),
    stats: () => sched.stats(),
    dispose() { clearInterval(pumpIv); offPos(); sched.dispose(); },
  };
}

/** p50/p95 over a numeric array (harness + HUD share one definition). */
export function pstats(xs) {
  const s = xs.filter((x) => x !== null && Number.isFinite(x)).sort((a, b) => a - b);
  const q = (f) => (s.length ? +s[Math.min(s.length - 1, Math.floor(s.length * f))].toFixed(2) : null);
  return { n: s.length, p50: q(0.5), p95: q(0.95), min: q(0), max: q(0.999) };
}
