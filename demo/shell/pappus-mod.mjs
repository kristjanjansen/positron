// demo/shell/pappus-mod.mjs — the movement Pappus has and our tab does not.
//
// 🔴 WHY THIS EXISTS, AND IT IS A DIAGNOSIS RATHER THAN A FEATURE. Upstream
// Pappus has eight LFOs with two destinations each, six shapes, rates from
// 0.005 Hz to 12 Hz, a Turing machine on its sample-and-hold, and an envelope
// follower its own source calls *"the most musical source in the box"*.
// **NONE OF IT IS IN THE SYNTHDEF.** It all lives in the Lua half, which pushes
// `/n_set` sixty times a second at a running graph. We load the compiled graph
// and get the granulator with none of the motion.
//
// So every patch this project ships is a set of FROZEN NUMBERS, and two sets of
// frozen numbers both producing a static wash sound alike however far apart the
// numbers are. REPORTED as *"patches still too similar and not too
// interesting"*, after a round of widening the ranges that could not have
// helped: it moved the numbers further apart without making any of them move.
//
// ── three things that make this safe, all of them checked ──────────────────
//
// 1. 🔴 **IT WILL NOT ZIPPER, AND THAT WAS THE REAL RISK.**
//    `Engine_Pappus.sc:485` sets `lagt = 0.02` and nearly every control goes
//    through it — `msize`, `mrate`, `mscan`, `mswarm`, `mstrum`, the window
//    ends — all `Lag.kr(…, lagt)`, with `mbuflen` on 0.1. The engine already
//    smooths stepped control changes over 20 ms. Stepping parameters from a
//    timer is what Pappus is built to receive.
//
// 2. **20 ms of lag also sets the rate.** Above ~50 Hz the lag throws the extra
//    messages away, so 25 Hz is an argument rather than a taste: fast enough
//    that the lag has something to smooth, slow enough that nothing is wasted.
//
// 3. 🔴 **EVERY SOURCE IS A FUNCTION OF THE AUDIO CLOCK, NEVER AN ACCUMULATOR.**
//    `phase = (now * hz + offset) % 1`. A late tick, a dropped tick, a tab that
//    was in the background — all cost RESOLUTION and none of them cost PHASE,
//    because the next tick still reads the wave exactly where it should be.
//    That is what makes a plain `setInterval` adequate here, and it is why the
//    plan's objection to "a per-frame wire this page cannot prove arrived" does
//    not apply: this is a sampler of a continuous function, and the sampling
//    rate is free to wobble. ⚠️ The ONE piece that genuinely integrates is the
//    envelope follower, and it is given the real elapsed time so a long gap
//    decays it correctly rather than pretending no time passed.
//
// ── the two decisions worth stealing from upstream ─────────────────────────
//
// Both are invisible from the engine and both are the difference between a
// modulation that is musical and one that is a knob being waggled.

/**
 * A control's own space. `map`/`unmap` are the slider's warp, so a modulation
 * is applied where the LANE is, not where the number is.
 *
 * 🔴 THIS IS THE ONE THAT MATTERS. Upstream: `spec:map(clamp(spec:unmap(base)
 * + d, 0, 1))`. On an exponential control that makes a modulation a constant
 * RATIO rather than a constant amount — an LFO on grain length multiplies and
 * divides, so the same wobble is musical at 2 ms and at 8 s. Added in the
 * engine's own units instead, a depth that breathes at the top of the lane is
 * a stutter at the bottom and inaudible in the middle.
 */
export function spec({ min, max, warp }) {
  const exp = warp === 'exp' && min > 0;
  const ratio = exp ? Math.log(max / min) : 0;
  const span = max - min;
  return {
    min, max, exp,
    map: (t) => (exp ? min * Math.exp(ratio * clamp01(t)) : min + clamp01(t) * span),
    unmap: (x) => (exp ? Math.log(Math.max(min, x) / min) / ratio : (span ? (x - min) / span : 0)),
  };
}

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

/**
 * 🔴 THE AMOUNT IS CUBED, AND UPSTREAM SAYS WHY IN A COMMENT. The amount is a
 * fraction of the WHOLE parameter range, so 0.2 was already a huge gesture:
 * `val * amt * amt * abs(amt)`. Cubed, 0.5 becomes 0.125 and a routing set by
 * feel lands somewhere usable instead of slamming the lane end to end.
 */
const taper = (amt) => amt * amt * Math.abs(amt);

/**
 * An envelope follower — a one-pole with separate attack and release.
 *
 * 🔴 ITS SOURCE IS THE RADIO, WHICH IS THE WHOLE POINT ON THIS PAGE. Upstream
 * offers OUT / GS1 / GS2 / IN L+R / LEFT / RIGHT and calls the input *"the most
 * musical source in the box"*. Here the input is a live radio station, so the
 * station plays the granulator: loud passages shorten the grains and lift the
 * rate, quiet ones open into long smears. Nothing else available to this page
 * is correlated with the material at all.
 *
 * Defaults are upstream's: attack 0.01 s, release 0.35 s, sensitivity 6.
 */
export function createEnvFollower({ attack = 0.01, release = 0.35, sens = 6 } = {}) {
  let env = 0;
  return {
    /** @param {number} x raw level (rms). @param {number} dt seconds since the last call. */
    push(x, dt) {
      // ⚠️ THE COEFFICIENT IS DERIVED FROM `dt`, NOT A FIXED FRACTION. A fixed
      // one makes the attack and release times depend on how often this happens
      // to be called, which is the same class of mistake as a per-block glide.
      const t = x > env ? attack : release;
      const k = t > 0 ? 1 - Math.exp(-Math.max(0, dt) / t) : 1;
      env += (x - env) * k;
      return env;
    },
    value: () => clamp01(env * sens),
    reset() { env = 0; },
  };
}

/** Shapes. `t` is phase 0..1; every one returns -1..1. */
const SHAPES = {
  sine: (t) => Math.sin(2 * Math.PI * t),
  tri: (t) => 4 * Math.abs(t - 0.5) - 1,
  saw: (t) => 2 * t - 1,
  square: (t) => (t < 0.5 ? 1 : -1),
};

/**
 * The modulator: sources, routings, and one tick that writes what moved.
 *
 * @param {object} o
 * @param {(name: string, value: number) => void} o.send   writes one control
 * @param {() => number} o.now                             the AUDIO clock, in seconds
 * @param {Record<string, {min:number,max:number,warp?:string}>} o.specs
 * @param {number} [o.deadband]  fraction of a lane below which nothing is sent
 */
export function createModulator({ send, now, specs, deadband = 0.005 } = {}) {
  const S = Object.fromEntries(Object.entries(specs).map(([k, v]) => [k, spec(v)]));
  const env = createEnvFollower();
  const base = {};              // where each destination sits with no modulation
  let routes = [];
  let lastSent = {};
  let lastNow = null;
  let held = false;
  const st = { ticks: 0, sends: 0, skipped: 0, env: 0 };

  return {
    /** The value a destination returns to. Set from the patch, in engine units. */
    setBase(name, v) { base[name] = v; },
    /** @param {Array<{src:string, dest:string, amt:number, hz?:number, shape?:string}>} list */
    setRoutes(list) {
      routes = (list || []).filter((r) => S[r.dest]);
      // ⚠️ A DESTINATION THAT STOPS BEING MODULATED MUST GO HOME. Without this
      // it keeps whatever the last tick left it at, so a patch change would
      // inherit the previous patch's wobble as a static offset — silently, and
      // only on the controls that happened to be moving.
      for (const name of Object.keys(lastSent)) {
        if (!routes.some((r) => r.dest === name) && base[name] != null) {
          send(name, base[name]);
        }
      }
      lastSent = {};
    },
    /** Feed the follower. `level` is whatever the page's meter reads. */
    level(v) {
      const t = now();
      const dt = lastNow == null ? 0.04 : Math.max(0, t - lastNow);
      lastNow = t;
      st.env = env.push(Math.max(0, v || 0), dt);
    },
    /** One pass. Call it about 25 times a second; being late is harmless. */
    tick() {
      if (held) return;
      st.ticks++;
      const t = now();
      // Accumulate per destination: two routings onto one control ADD, in the
      // control's own space, the way two LFOs on one knob do upstream.
      const want = {};
      routes.forEach((r, i) => {
        const s = S[r.dest];
        if (!s || base[r.dest] == null) return;
        const v = r.src === 'env'
          ? env.value() * 2 - 1
          // ⚠️ PHASES SPREAD ROUND THE CYCLE, `i / routes.length`, which is
          // upstream's `(i-1)/NLFO`. Sources at one rate starting together are
          // one source; started apart they are a texture.
          : (SHAPES[r.shape] || SHAPES.sine)(((t * (r.hz ?? 0.1)) + i / Math.max(1, routes.length)) % 1);
        want[r.dest] = (want[r.dest] ?? 0) + v * taper(r.amt ?? 0);
      });

      for (const [name, d] of Object.entries(want)) {
        const s = S[name];
        const at = s.map(s.unmap(base[name]) + d);
        // 🔴 A DEAD-BAND, AND IT IS WHAT KEEPS THE TRAFFIC HONEST. Sending 25
        // messages a second per routing regardless of whether anything moved
        // makes a 0.005 Hz source — a two-hundred-second wave — cost exactly as
        // much as a 12 Hz one. Measured against the LANE rather than the value,
        // so a control at the bottom of an exponential range is not spammed by
        // changes too small to be a step anywhere on it.
        const prev = lastSent[name];
        if (prev != null && Math.abs(s.unmap(at) - s.unmap(prev)) < deadband) { st.skipped++; continue; }
        lastSent[name] = at;
        st.sends++;
        send(name, at);
      }
    },
    /**
     * Stop moving and put every destination back on its base.
     *
     * 🔴 A CHECK THAT READS A CONTROL BACK CANNOT READ A MOVING ONE. The page's
     * "did the patch reach the engine" assert compares `/s_get` against the
     * patch's number, and the moment anything modulates that control the two
     * legitimately differ — MEASURED the first time this ran: `msize
     * 2.4448649883270264 not 1.8`, which is the modulator working and the
     * assert asking the wrong question. Holding separates them: with nothing
     * moving, the read-back grades delivery; with it moving, the check below
     * grades the movement.
     */
    hold(yes) {
      held = !!yes;
      if (!held) return;
      for (const name of Object.keys(lastSent)) {
        if (base[name] != null) send(name, base[name]);
      }
      lastSent = {};
    },
    stats: () => ({ ...st, routes: routes.length, held }),
  };
}
