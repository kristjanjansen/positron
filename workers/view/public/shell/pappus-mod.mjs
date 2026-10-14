// demo/shell/pappus-mod.mjs: the LFOs, Turing machine and envelope followers that
// upstream Pappus runs in Lua, stepping controls at 25 Hz. The engine lags controls by
// 20 ms, so steps do not zipper; every source is a function of the audio clock.
// why: lessons/kit-pappus-mod.md#header

/**
 * A control's own space. `map`/`unmap` are the slider's warp, so a modulation is
 * applied on the lane: on an exponential control it is a ratio, not an amount.
 * why: lessons/kit-pappus-mod.md#spec
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
 * The amount is cubed (as upstream): it is a fraction of the whole range, so 0.5 -> 0.125.
 * why: lessons/kit-pappus-mod.md#taper
 */
const taper = (amt) => amt * amt * Math.abs(amt);

/**
 * An envelope follower: a one-pole with separate attack and release, fed by the radio.
 * Defaults are upstream's: attack 0.01 s, release 0.35 s, sensitivity 6.
 * why: lessons/kit-pappus-mod.md#env-follower
 */
export function createEnvFollower({ attack = 0.01, release = 0.35, sens = 6 } = {}) {
  let env = 0;
  return {
    /** @param {number} x raw level (rms). @param {number} dt seconds since the last call. */
    push(x, dt) {
      // The coefficient comes from `dt`, so times do not depend on the call rate.
      // why: lessons/kit-pappus-mod.md#env-coefficient
      const t = x > env ? attack : release;
      const k = t > 0 ? 1 - Math.exp(-Math.max(0, dt) / t) : 1;
      env += (x - env) * k;
      return env;
    },
    value: () => clamp01(env * sens),
    reset() { env = 0; },
  };
}

/**
 * Shapes. `t` is phase 0..1; every one returns -1..1. `step` and `glide` read a
 * sixteen-slot memory instead: see `advance()` and `read()`.
 * why: lessons/kit-pappus-mod.md#shapes
 */
const SHAPES = {
  sine: (t) => Math.sin(2 * Math.PI * t),
  tri: (t) => 4 * Math.abs(t - 0.5) - 1,
  saw: (t) => 2 * t - 1,
  square: (t) => (t < 0.5 ? 1 : -1),
};

const SLOTS = 16;

/**
 * Sample-and-hold with upstream's Turing machine: sixteen slots on a loop, each step
 * rewrites its slot with probability 1 - machine. The step index comes from the clock;
 * skipped steps still each get their rewrite (at most sixteen). `glide` cosine-eases.
 * why: lessons/kit-pappus-mod.md#advance
 */
function advance(r, t) {
  const x = t * (r.hz ?? 0.5) + (r.phase ?? 0);
  const step = Math.floor(x);
  if (r.lastStep == null) r.lastStep = step - 1;
  if (step > r.lastStep) {
    const n = Math.min(SLOTS, step - r.lastStep);
    for (let k = 0; k < n; k++) {
      const idx = (((step - n + 1 + k) % SLOTS) + SLOTS) % SLOTS;
      if (Math.random() >= (r.machine ?? 0)) r.slots[idx] = Math.random() * 2 - 1;
    }
    r.lastStep = step;
  }
  return { i: ((step % SLOTS) + SLOTS) % SLOTS, frac: x - step };
}

/**
 * The modulator: sources, routings, and one tick that writes what moved.
 *
 * @param {object} o
 * @param {(name: string, value: number|number[]) => void} o.send   writes one control
 * @param {() => number} o.now                             the AUDIO clock, in seconds
 * @param {Record<string, {min:number,max:number,warp?:string,n?:number,quant?:number}>} o.specs
 * @param {Record<string, {attack?:number,release?:number,sens?:number}>} [o.followers]
 * @param {number} [o.deadband]  fraction of a lane below which nothing is sent
 * @param {(msg:string)=>void} [o.warn]  told about a routing it had to drop
 */
export function createModulator({ send, now, specs, followers, deadband = 0.005,
                                  warn = () => {} } = {}) {
  const S = Object.fromEntries(Object.entries(specs).map(([k, v]) => [k, { ...spec(v), n: v.n || 0, quant: v.quant || 0 }]));
  /**
   * One follower per named measurement the page hands in. Sensitivity is per name:
   * a 0..1 centroid pins at upstream's 6.
   * why: lessons/kit-pappus-mod.md#followers
   */
  const F = {};
  for (const [name, cfg] of Object.entries(followers || { rms: {} })) F[name] = createEnvFollower(cfg);

  const base = {};              // where each destination sits with no modulation
  let routes = [];
  let lastSent = {};
  let lastNow = null;
  let held = false;
  const st = { ticks: 0, sends: 0, skipped: 0, dropped: 0 };

  /** `env` -> the `rms` follower; `env.tone` -> the `tone` one; `lfo` -> a shape. */
  function follower(src) {
    if (src === 'env') return F.rms;
    if (src.startsWith('env.')) return F[src.slice(4)];
    return null;
  }

  /**
   * A routing is read once per tick and sampled per element: `advance()` mutates, so
   * running it per element would rewrite a Turing pattern eight times a step.
   * why: lessons/kit-pappus-mod.md#prepare
   */
  function prepare(r, t) {
    if (r.f) return { kind: 'env', v: r.f.value() * 2 - 1 };
    if (r.shape === 'step' || r.shape === 'glide') return { kind: 'turing', r, ...advance(r, t) };
    return { kind: 'shape', r, t };
  }

  /**
   * -1..1 for element `j` of `n`. A shape offsets by a fraction of its cycle (`j/n`),
   * a slot memory by a whole slot (`j`).
   * why: lessons/kit-pappus-mod.md#read
   */
  function read(p, j, n) {
    if (p.kind === 'env') return p.v;
    if (p.kind === 'turing') {
      const r = p.r;
      const i = ((p.i + j) % SLOTS + SLOTS) % SLOTS;
      const cur = r.slots[i];
      if (r.shape === 'step') return cur;
      const prev = r.slots[(i - 1 + SLOTS) % SLOTS];
      return prev + (cur - prev) * (0.5 - 0.5 * Math.cos(Math.PI * p.frac));
    }
    const fn = SHAPES[p.r.shape] || SHAPES.sine;
    const ph = p.t * (p.r.hz ?? 0.1) + (p.r.phase ?? 0) + (n > 1 ? j / n : 0);
    return fn(((ph % 1) + 1) % 1);
  }

  return {
    /** The value a destination returns to. Set from the patch, in engine units. */
    setBase(name, v) { base[name] = Array.isArray(v) ? v.slice() : v; },
    /**
     * @param {Array<{src:string, dest:string, amt:number, hz?:number,
     *                shape?:string, machine?:number}>} list
     */
    setRoutes(list) {
      const keep = [];
      for (const r of (list || [])) {
        if (!S[r.dest]) { st.dropped++; warn(`no such destination: ${r.dest}`); continue; }
        const f = follower(r.src);
        // An unknown source is refused and counted, never turned into a sine.
        // why: lessons/kit-pappus-mod.md#unknown-source
        if (!f && r.src !== 'lfo') { st.dropped++; warn(`no such source: ${r.src}`); continue; }
        keep.push({ ...r, f, slots: null, lastStep: null });
      }
      // Phases spread round the cycle, `i / n`, as upstream's `(i-1)/NLFO` (`:3033`).
      // why: lessons/kit-pappus-mod.md#phases
      keep.forEach((r, i) => {
        if (r.phase == null) r.phase = i / Math.max(1, keep.length);
        if (r.shape === 'step' || r.shape === 'glide') {
          r.slots = Array.from({ length: SLOTS }, () => Math.random() * 2 - 1);
        }
      });
      // A destination no longer modulated goes back to its base, or it keeps a stale offset.
      // why: lessons/kit-pappus-mod.md#go-home
      for (const name of Object.keys(lastSent)) {
        if (!keep.some((r) => r.dest === name) && base[name] != null) send(name, base[name]);
      }
      routes = keep;
      lastSent = {};
    },
    /** Feed the followers. Keys are follower names; unknown ones are ignored. */
    sense(values) {
      const t = now();
      const dt = lastNow == null ? 0.04 : Math.max(0, t - lastNow);
      lastNow = t;
      for (const [name, v] of Object.entries(values || {})) {
        F[name]?.push(Math.max(0, Number(v) || 0), dt);
      }
    },
    /** The one-source form this page started with. */
    level(v) { this.sense({ rms: v }); },
    /** One pass. Call it about 25 times a second; being late is harmless. */
    tick() {
      if (held) return;
      st.ticks++;
      const t = now();
      // Accumulate per destination: two routings onto one control ADD, in the
      // control's own space, the way two LFOs on one knob do upstream.
      const want = {};
      for (const r of routes) {
        const s = S[r.dest];
        if (!s || base[r.dest] == null) continue;
        const n = s.n || 1;
        let acc = want[r.dest];
        if (!acc) { acc = want[r.dest] = new Array(n).fill(0); }
        const p = prepare(r, t);
        for (let j = 0; j < n; j++) {
          // An array destination gets one phase per element, so voices come and go in turn.
          // A follower has no phase and moves all of them together.
          // why: lessons/kit-pappus-mod.md#array-phase
          acc[j] += read(p, j, n) * taper(r.amt ?? 0);
        }
      }

      for (const [name, d] of Object.entries(want)) {
        const s = S[name];
        const b = base[name];
        const n = s.n || 1;
        const at = new Array(n);
        for (let j = 0; j < n; j++) {
          const from = s.n ? b[j] : b;
          let v = s.map(s.unmap(from) + d[j]);
          // An integer control is rounded here (`mcontour` is a `Select.kr` index) so it reads back.
          // why: lessons/kit-pappus-mod.md#quant
          if (s.quant) v = Math.round(v / s.quant) * s.quant;
          at[j] = v;
        }
        // A dead-band measured on the lane, so a slow source costs only what moves.
        // why: lessons/kit-pappus-mod.md#deadband
        const prev = lastSent[name];
        if (prev != null) {
          let moved = false;
          for (let j = 0; j < n; j++) {
            if (Math.abs(s.unmap(at[j]) - s.unmap(s.n ? prev[j] : prev)) >= deadband) { moved = true; break; }
          }
          if (!moved) { st.skipped++; continue; }
        }
        lastSent[name] = s.n ? at : at[0];
        st.sends++;
        send(name, s.n ? at : at[0]);
      }
    },
    /**
     * Stop moving and put every destination back on its base, so a read-back check grades
     * delivery rather than the modulation.
     * why: lessons/kit-pappus-mod.md#hold
     */
    hold(yes) {
      held = !!yes;
      if (!held) return;
      for (const name of Object.keys(lastSent)) {
        if (base[name] != null) send(name, base[name]);
      }
      lastSent = {};
    },
    /** Which destinations are being moved right now, for a page to display. */
    moving: () => [...new Set(routes.map((r) => r.dest))],
    stats: () => ({ ...st, routes: routes.length, held,
                    env: Object.fromEntries(Object.entries(F).map(([k, f]) => [k, f.value()])) }),
  };
}
