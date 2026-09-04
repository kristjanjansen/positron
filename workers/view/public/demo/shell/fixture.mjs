// demo/shell/fixture.mjs — the minimum honest adapter, shared by Act 0.
//
// Act 0 has no network and no media, so it needs a kind that actuates something
// observable and can be re-folded on seek. That is exactly the four-part
// adapter contract: {caps, actuate, reduce, assertState}.

/**
 * A kind whose "actuation" is appending to a list. reduce()/assertState() make
 * it seek-correct: after any seek the fold is recomputed from the rows, so the
 * demo shows the real two-phase behaviour rather than approximating it.
 */
export function markAdapter({ rates = [0.25, 0.5, 1, 2, 4], onFire } = {}) {
  const fired = [];
  return {
    fired,
    adapter: {
      caps: { rates, continuous: false, assertOnSeek: true },
      actuate(payload, ev) {
        fired.push({ at: ev?.at ?? null, payload });
        onFire?.(payload, ev);
      },
      /** state at a position = every mark at or before it */
      reduce(rows, pos) {
        const seen = rows.filter((r) => r.at <= pos);
        return { count: seen.length, last: seen.length ? seen[seen.length - 1].payload : null };
      },
      assertState(state) {
        fired.length = 0;
        for (let i = 0; i < state.count; i++) fired.push({ at: null, payload: null });
        return state;
      },
    },
  };
}

/** n marks evenly spaced over durationMs. */
export function marks(n, durationMs, kind = 'mark') {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ at: Math.round((i * durationMs) / n), kind, id: `m${i}`, payload: { i } });
  }
  return out;
}
