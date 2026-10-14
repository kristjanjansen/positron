// demo/shell/fixture.mjs: the minimum honest adapter for Act 0, which has no network and no media:
// the four-part contract {caps, actuate, reduce, assertState}.
// why: lessons/kit-fixture.md#header

/**
 * A kind whose actuation appends to a list; reduce() and assertState() make it seek-correct.
 * why: lessons/kit-fixture.md#markadapter
 */
export function markAdapter({ rates = [0.25, 0.5, 1, 2, 4], onFire } = {}) {
  const fired = [];
  return {
    fired,
    adapter: {
      caps: { rates, continuous: false, assertOnSeek: true },
      actuate(payload, ev) {
        // `at` is a POSITION; `wall` is when it actually happened. Comparing a
        // lane against anything needs the second one — the audio lane logs
        // intendedUs in the same wall domain.
        fired.push({ at: ev?.at ?? null, wall: Date.now(), payload });
        onFire?.(payload, ev);
      },
      /**
       * State at a position is every mark at or before it; reduceAt() already hands the prefix of payloads.
       * why: lessons/kit-fixture.md#reduce
       */
      reduce(rows) {
        return { count: rows.length, last: rows.length ? rows[rows.length - 1] : null };
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
