// demo/shell/timebase.mjs: when a light event should land against a heavy link's picture or
// sound (plans/plan-routing-time.md, graded by timebase-test.mjs). Every time is passed in.
// Clocks: local (performance ms), shared (local + peer offsetMs, null until agreed, never 0),
// stamp (the link's own media time). Links feed `{ local, stamp }` observations; the median
// holds, and only a run of `stepCount` deviants past `stepMs` re-anchors.
// Events: `{ at }`, `{ at, follow }`, `{ stamp, on }` (`on` a string), `{ beat, clock }`.
// `at` is when the thing happens; the envelope send stamp is `sent`.
// Cannot tell holds and never fires: every method answers null and `decide` turns it into `hold`.
// why: lessons/kit-timebase.md#header

/** Median of a non-empty array of finite numbers. Even counts take the mean of the middle two. */
function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const finite = (x) => typeof x === 'number' && Number.isFinite(x);

/**
 * @param {object} [o]
 * @param {number|null} [o.offsetMs]  peer offset, shared = local + offsetMs. null = not agreed.
 * @param {number} [o.windowN]        observations kept per link for the median [9]
 * @param {number} [o.stepMs]         a deviation past this is a candidate step [120]
 * @param {number} [o.stepCount]      this many deviants in a row, same side, is a step [3]
 */
export function createTimebase({ offsetMs = null, windowN = 9, stepMs = 120, stepCount = 3 } = {}) {
  let offset = finite(offsetMs) ? offsetMs : null;
  const links = new Map();

  const toShared = (local) => (offset == null || !finite(local) ? null : local + offset);
  const toLocal = (shared) => (offset == null || !finite(shared) ? null : shared - offset);

  function link(id, { stampOffsetMs, stepMs: sMs, windowN: wN } = {}) {
    let L = links.get(id);
    if (!L) {
      L = { id, stampOffsetMs: null, stepMs, windowN, rate: null, window: [], pending: [], moves: 0, seen: 0, refused: 0 };
      links.set(id, L);
    }
    if (stampOffsetMs !== undefined) L.stampOffsetMs = finite(stampOffsetMs) ? stampOffsetMs : null;
    if (finite(sMs)) L.stepMs = sMs;
    if (finite(wN) && wN >= 1) L.windowN = Math.floor(wN);
    return stats(id);
  }

  /**
   * One presentation: `stamp` was on the glass at `local`, playing at `rate`.
   * Answers `{ ok, moved, why }`. A refused observation changes nothing.
   */
  function observe(id, { local, stamp, rate = 1 } = {}) {
    const L = links.get(id);
    if (!L) return { ok: false, moved: false, why: `no link ${id}` };
    if (!finite(local) || !finite(stamp) || !finite(rate) || rate < 0) {
      L.refused++;
      return { ok: false, moved: false, why: 'an observation needs finite local, stamp and a rate of 0 or more' };
    }
    L.seen++;
    const d = stamp - rate * local;
    // A rate change is a new line, not a deviation from the old one.
    if (L.rate !== rate) {
      const had = L.window.length > 0;
      L.rate = rate; L.window = [d]; L.pending = [];
      if (had) L.moves++;
      return { ok: true, moved: had, why: had ? 'rate changed' : 'first observation' };
    }
    const m = median(L.window);
    const dev = d - m;
    if (Math.abs(dev) <= L.stepMs) {
      L.pending = [];
      L.window.push(d);
      if (L.window.length > L.windowN) L.window.shift();
      return { ok: true, moved: false, why: '' };
    }
    // A deviant. It moves nothing until enough of them agree on a side.
    if (L.pending.length && Math.sign(L.pending[0] - m) !== Math.sign(dev)) L.pending = [];
    L.pending.push(d);
    if (L.pending.length >= stepCount) {
      L.window = L.pending.slice(-L.windowN);
      L.pending = [];
      L.moves++;
      return { ok: true, moved: true, why: `stepped ${dev > 0 ? 'earlier' : 'later'} by about ${Math.round(Math.abs(dev))} ms` };
    }
    return { ok: true, moved: false, why: 'deviant, held until confirmed' };
  }

  const line = (id) => {
    const L = links.get(id);
    return L && L.window.length ? { L, d: median(L.window), rate: L.rate } : null;
  };

  /** The stamp on the glass at local time `local`, or null. */
  function stampAt(id, local) {
    const k = line(id);
    return k && finite(local) ? k.rate * local + k.d : null;
  }

  /** The local time at which `stamp` is presented, or null (no line, or paused). */
  function localForStamp(id, stamp) {
    const k = line(id);
    if (!k || !finite(stamp) || !(k.rate > 0)) return null;
    return (stamp - k.d) / k.rate;
  }

  /**
   * How far behind the shared clock this link's glass is here, in ms: the
   * shared time now minus the shared time of the moment being presented.
   * Null without a peer clock, without an observation, or when nobody knows
   * how this link's stamps sit on the shared clock.
   */
  function lag(id, local) {
    const L = links.get(id);
    if (!L || L.stampOffsetMs == null) return null;
    const s = stampAt(id, local), now = toShared(local);
    return s == null || now == null ? null : now - (s + L.stampOffsetMs);
  }

  function sharedOfEvent(ev) {
    if (ev.at != null) return finite(ev.at) ? ev.at : null;
    if (finite(ev.beat) && ev.clock) return beatToShared(ev.clock, ev.beat);
    return null;
  }

  /**
   * When to fire `ev`, as a local time. `leadMs` is the sink's own output
   * latency (AudioContext.outputLatency for a sound, a display frame for a
   * light), subtracted so the event lands on the ear or the glass on time
   * rather than leaving this page on time.
   * @returns {{ local: number|null, why: string }}
   */
  function fireAt(ev, nowLocal, { leadMs = 0 } = {}) {
    const e = ev && typeof ev === 'object' ? ev : {};
    const lead = finite(leadMs) ? leadMs : 0;
    // A sender still writing the shape this module had for one day wanted the
    // event scheduled. Firing it on arrival would be the wrong moment, so hold.
    if (e.due != null) return { local: null, why: 'malformed: due was folded into at on 2026-10-04' };
    const byStamp = e.stamp != null || typeof e.on === 'string';
    const timed = byStamp || e.at != null || e.beat != null || e.clock != null || e.follow != null;
    if (!timed) return finite(nowLocal) ? { local: nowLocal, why: 'as it happens' } : { local: null, why: 'no local time' };

    if (byStamp) {
      if (!finite(e.stamp) || typeof e.on !== 'string') return { local: null, why: 'malformed: stamp needs a finite stamp and a link id in on' };
      if (!links.has(e.on)) return { local: null, why: `no link ${e.on}` };
      const t = localForStamp(e.on, e.stamp);
      return t == null ? { local: null, why: `${e.on} has no line to read a stamp off (unobserved or paused)` }
        : { local: t - lead, why: `when ${e.on} presents ${e.stamp}` };
    }

    const S = sharedOfEvent(e);
    if (S == null) return { local: null, why: 'malformed: needs a finite at, beat with clock, or stamp with on' };
    const base = toLocal(S);
    if (base == null) return { local: null, why: 'no peer clock agreed yet' };
    if (e.follow == null) return { local: base - lead, why: 'scheduled on the peer clock' };
    if (!links.has(e.follow)) return { local: null, why: `no link ${e.follow}` };
    const g = lag(e.follow, nowLocal);
    return g == null ? { local: null, why: `the lag of ${e.follow} here cannot be told` }
      : { local: base + g - lead, why: `following ${e.follow}, ${Math.round(g)} ms behind` };
  }

  /**
   * The scheduler's verdict for `ev` at `nowLocal`.
   *   fire    due now or within `horizonMs` (an audio lane commits ahead); `local` is exact
   *   wait    due later than the horizon
   *   hold    cannot tell; ask again next tick
   *   missed  later than `pastWindowMs`, so it is surfaced rather than played
   */
  function decide(ev, nowLocal, { horizonMs = 0, pastWindowMs = 15000, leadMs = 0 } = {}) {
    const { local, why } = fireAt(ev, nowLocal, { leadMs });
    if (local == null || !finite(nowLocal)) return { act: 'hold', local: null, lateMs: null, why };
    if (local > nowLocal + horizonMs) return { act: 'wait', local, lateMs: null, why };
    const lateMs = Math.max(0, nowLocal - local);
    return { act: lateMs > pastWindowMs ? 'missed' : 'fire', local, lateMs, why };
  }

  function stats(id) {
    const L = links.get(id);
    if (!L) return null;
    return { id, n: L.window.length, d: L.window.length ? median(L.window) : null, rate: L.rate,
             moves: L.moves, pending: L.pending.length, seen: L.seen, refused: L.refused, stampOffsetMs: L.stampOffsetMs };
  }

  return {
    setOffset(ms) { offset = finite(ms) ? ms : null; },
    get offsetMs() { return offset; },
    toShared, toLocal, link, observe, stampAt, localForStamp, lag, fireAt, decide, stats,
    links: () => [...links.keys()],
  };
}

/** A beat on a loop clock `{ bpm, epoch }` (shared ms) as a shared time. Null if the clock is not usable. */
export function beatToShared(clock, beat) {
  if (!clock || !finite(clock.bpm) || !(clock.bpm > 0) || !finite(clock.epoch) || !finite(beat)) return null;
  return clock.epoch + beat * 60000 / clock.bpm;
}

/**
 * The first beat at or after shared time `shared` whose index is a multiple of
 * `every` (4 for a bar of four). Answers `{ beat, shared }` or null.
 */
export function nextBeat(clock, shared, every = 1) {
  if (beatToShared(clock, 0) == null || !finite(shared) || !(every >= 1)) return null;
  const len = 60000 / clock.bpm;
  const raw = (shared - clock.epoch) / len;
  const k = Math.ceil(raw / every - 1e-9) * every;
  return { beat: k, shared: beatToShared(clock, k) };
}
