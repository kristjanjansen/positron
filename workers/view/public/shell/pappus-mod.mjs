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

/**
 * Shapes. `t` is phase 0..1; every one returns -1..1.
 *
 * ⚠️ `step` AND `glide` ARE NOT HERE because they are not functions of phase
 * alone — they read a sixteen-slot memory that the clock indexes. See
 * `advance()` and `read()`. Upstream has the same six (`LFO_SHAPES`, `:2035`) and the same
 * split: four are arithmetic, two are a machine.
 */
const SHAPES = {
  sine: (t) => Math.sin(2 * Math.PI * t),
  tri: (t) => 4 * Math.abs(t - 0.5) - 1,
  saw: (t) => 2 * t - 1,
  square: (t) => (t < 0.5 ? 1 : -1),
};

const SLOTS = 16;

/**
 * The sample-and-hold, with upstream's Turing machine on it.
 *
 * 🔴 THIS IS THE ONE THAT MAKES A GRANULATOR SOUND COMPOSED RATHER THAN
 * WAGGLED, and it is the piece the diagnosis at the top of this file was
 * really about. A sine on a grain length is a wobble; sixteen values on a loop
 * that rewrite themselves slowly is a PART. Upstream (`:2054–2075`): sixteen
 * slots read on a loop, and each step rewrites its own slot with a fresh random
 * value with probability `1 − machine`. At `machine 0` it is free random and
 * never repeats; at 1 the sixteen values loop for ever; in between the pattern
 * drifts one value at a time, which is the setting worth having.
 *
 * 🔴 THE STEP INDEX COMES FROM THE CLOCK AND ONLY THE VALUES ARE STATE. That is
 * the same rule the rest of this file follows — `step = floor(t·hz + phase)` —
 * and it is what keeps a Turing route honest when a tick is late: the pattern
 * stays where the clock says it is instead of sliding. ⚠️ A late tick that
 * skipped steps still runs the rewrite decision ONCE PER SKIPPED STEP (bounded
 * at sixteen, which is a whole lap), or a backgrounded tab would come back with
 * a pattern that had aged less than the music it is playing under.
 *
 * `glide` is the cosine ease between the previous slot and the current one
 * (`:2205–2207`), which is what makes a stepped source usable on a continuous
 * control like grain length.
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
   * 🔴 ONE FOLLOWER PER NAMED MEASUREMENT, AND THE PAGE OWNS THE MEASURING.
   * Upstream offers one follower with a source switch (OUT / GS1 / GS2 / IN L+R
   * / LEFT / RIGHT). Here the interesting sources are all derived from the same
   * audio the page is already analysing for its meter — loudness, three bands,
   * where the energy sits, how fast it is changing — so the page hands in raw
   * numbers by name and this holds the envelope for each.
   *
   * ⚠️ SENSITIVITY IS PER NAME AND MUST BE. `rms` wants upstream's 6; a
   * centroid that is already 0..1 saturates instantly at 6 and would sit
   * pinned at the top looking like a broken follower.
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
   * A routing is read ONCE PER TICK and then sampled per element.
   *
   * 🔴 THE SPLIT EXISTS BECAUSE `advance()` MUTATES. A Turing route owns
   * sixteen values and a step counter, and an array destination reads it eight
   * times in one tick — so evaluating the whole source per element would run
   * the rewrite decision eight times a step and shred the pattern it exists to
   * hold. Advance once; read eight times.
   */
  function prepare(r, t) {
    if (r.f) return { kind: 'env', v: r.f.value() * 2 - 1 };
    if (r.shape === 'step' || r.shape === 'glide') return { kind: 'turing', r, ...advance(r, t) };
    return { kind: 'shape', r, t };
  }

  /**
   * −1..1 for element `j` of `n`.
   *
   * ⚠️ THE OFFSET IS A DIFFERENT QUANTITY FOR EACH KIND, which is why it is not
   * one number passed in. A continuous shape wants a FRACTION of its cycle
   * (`j/n`), so eight voices sit evenly round one wave. A sixteen-slot memory
   * wants a WHOLE SLOT (`j`), so eight voices read eight consecutive steps of
   * the same pattern — rotate a sine by a slot and you get nothing; rotate a
   * pattern by a fraction and you get a value that is not in it.
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
        // 🔴 AN UNKNOWN SOURCE IS REFUSED, NOT QUIETLY TURNED INTO A SINE. The
        // first version tested `src === 'env'` and let everything else fall
        // through to a shape, so `src: 'lfo2'` or a typo became a 0.1 Hz sine —
        // a routing that works, sounds plausible and is not the one written.
        if (!f && r.src !== 'lfo') { st.dropped++; warn(`no such source: ${r.src}`); continue; }
        keep.push({ ...r, f, slots: null, lastStep: null });
      }
      // ⚠️ PHASES SPREAD ROUND THE CYCLE, `i / n`, which is upstream's
      // `(i-1)/NLFO` (`:3033`). Sources at one rate starting together are one
      // source; started apart they are a texture.
      keep.forEach((r, i) => {
        if (r.phase == null) r.phase = i / Math.max(1, keep.length);
        if (r.shape === 'step' || r.shape === 'glide') {
          r.slots = Array.from({ length: SLOTS }, () => Math.random() * 2 - 1);
        }
      });
      // ⚠️ A DESTINATION THAT STOPS BEING MODULATED MUST GO HOME. Without this
      // it keeps whatever the last tick left it at, so a patch change would
      // inherit the previous patch's wobble as a static offset — silently, and
      // only on the controls that happened to be moving.
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
          // 🔴 AN ARRAY DESTINATION GETS ONE PHASE PER ELEMENT, which is the
          // whole reason it is worth modulating. `probs` is eight per-voice
          // firing probabilities; one shape rotated across them makes voices
          // come and go in turn. ⚠️ A FOLLOWER HAS NO PHASE, so on an array it
          // moves all eight together — a duck rather than a rotation, which is
          // honest and is not the same gesture.
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
          // ⚠️ AN INTEGER CONTROL IS ROUNDED HERE, NOT LEFT TO THE ENGINE.
          // `mcontour` is a `Select.kr` index (`:726`); handing it 7.4 asks the
          // server to decide, and a destination whose value the page cannot
          // read back the way it sent it cannot be graded by an assert.
          if (s.quant) v = Math.round(v / s.quant) * s.quant;
          at[j] = v;
        }
        // 🔴 A DEAD-BAND, AND IT IS WHAT KEEPS THE TRAFFIC HONEST. Sending 25
        // messages a second per routing regardless of whether anything moved
        // makes a 0.005 Hz source — a two-hundred-second wave — cost exactly as
        // much as a 12 Hz one. Measured against the LANE rather than the value,
        // so a control at the bottom of an exponential range is not spammed by
        // changes too small to be a step anywhere on it.
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
    /** Which destinations are being moved right now, for a page to display. */
    moving: () => [...new Set(routes.map((r) => r.dest))],
    stats: () => ({ ...st, routes: routes.length, held,
                    env: Object.fromEntries(Object.entries(F).map(([k, f]) => [k, f.value()])) }),
  };
}
