// The voice /code/collide/ and /remote/collide/ play: a program in /collide/'s subset of
// SuperCollider, compiled in the tab and run on wasm scsynth. Knobs: bright (filter opening,
// floor at twice the note) and decay (seconds). Nothing opens on a visit: warm(), then wake(ctx).
// See lessons/page-code.md#code-1
import { bootScsynth, loadScsynth } from '/shell/scsynth.mjs';
import { compile } from '/shell/sclang-lite.mjs';

export const PROGRAM = `// a key opens the gate and letting it go closes it
{ |freq = 220, amp = 0.2, gate = 1|

    // how far the filter opens above the note, 0 shut to 1 wide open
    var bright = \\bright.kr(0.4, 0.05, spec: [0, 1]);

    // how long a held note takes to fall to its quiet sustain, in seconds
    var decay = \\decay.kr(0.8, spec: [0.05, 3]);

    // the volume: a quick attack, the decay, a quiet sustain, a short release
    var env = EnvGen.kr(Env.adsr(0.005, decay, 0.1, 0.3), gate, doneAction: 2);

    // the filter falls back to the note over the same decay
    var fenv = EnvGen.kr(Env.perc(0.005, decay));

    // two saws a fraction apart, one in each speaker
    var sig = Saw.ar(freq * [1, 1.006], mul: amp);

    // the cutoff starts up to 24 times the note and falls to twice it
    sig = RLPF.ar(sig, fenv * bright * 22 + 2 * freq, 0.3);

    sig * env
}`;

/** The definition's name on the server. One name, as /collide/ does. */
export const DEF = 'collide';

/**
 * One engine playing PROGRAM, or whatever `load(text)` last compiled. An edit is the voice
 * for the next note; a held note finishes on the program it started with (`held`).
 * @param {object} [o]
 * @param {(line: string, kind?: string) => void} [o.log]
 * @param {string} [o.who]  what the log calls this engine
 * See lessons/page-code.md#code-2
 */
export function createCollideVoice({ log = () => {}, who = 'SuperCollider' } = {}) {
  const t0 = performance.now();
  let compiled = compile(PROGRAM, { name: DEF });
  const compileMs = performance.now() - t0;
  if (!compiled.ok) throw new Error(`the voice did not compile: ${compiled.message}`);
  /** name -> value, from the program's own defaults, then whatever a knob said. */
  const values = new Map(compiled.knobs.map((k) => [k.name, k.value]));
  const ampOf = (r) => r.controls.find((c) => c.name === 'amp')?.value ?? null;
  /** The program the engine holds now, which is what the next `/s_new` names. */
  let onServer = null;
  /** One queue, so loads reach the server in the order they compiled. */
  let chain = Promise.resolve();

  let eng = null, waking = null, junction = null, nextId = 2000;
  /** note -> node id, for the keys held now. */
  const held = new Map();
  /** every node still on the server, held or releasing, until its `/n_end`. */
  const live = new Set();
  const stat = { started: 0, sets: 0, ended: 0, loadMs: null, bootMs: null };
  /** Notes pressed while the engine was coming up, played once it is. */
  const waiting = new Map();

  function heard(m) {
    if (m[0] !== '/n_end') return false;
    live.delete(m[1]);
    stat.ended++;
    return true;
  }

  /** The engine's download, on intent: no context, no boot. */
  const warm = () => loadScsynth().catch(() => {});

  /**
   * Boot scsynth in `ctx` and load the definition. Its sound comes out of
   * `out()`, which is connected to nothing: the caller routes it.
   * See lessons/page-code.md#code-3
   */
  function wake(ctx) {
    if (eng) return Promise.resolve(eng);
    waking ??= (async () => {
      const e = await bootScsynth({ audioContext: ctx, log, onReply: heard });
      stat.bootMs = Math.round(e.bootMs);
      // Off the speakers and onto `junction`, which the page routes by the bay's links. The silent
      // pull to the destination must stay: an engine nobody pulls never processes and its
      // `/d_recv` times out (scsynth.mjs).
      // See lessons/page-code.md#code-4
      e.out.disconnect();
      const pull = ctx.createGain(); pull.gain.value = 0; pull.connect(ctx.destination);
      e.out.connect(pull);
      junction = ctx.createGain();
      e.out.connect(junction);
      const sent = await send(e, compiled);
      if (!sent.ok) throw new Error(sent.error);
      eng = e;
      log(`${who} took the program in ${stat.loadMs} ms, booted in ${stat.bootMs} ms`);
      for (const [n, v] of waiting) noteOn(n, v);
      waiting.clear();
      return e;
    })().catch((err) => { waking = null; log(`${who} did not start: ${err?.message || err}`, 'bad'); throw err; });
    return waking;
  }

  /** `/d_recv` one compile and wait for the engine's own `/done`. */
  async function send(e, r) {
    const t = performance.now();
    const got = await e.sendAndWait((m) => (m[0] === '/done' || m[0] === '/fail') && m[1] === '/d_recv', 5000, '/d_recv', r.bytes);
    if (!got || got[0] !== '/done') return { ok: false, error: `${who} did not take the program: ${got ? got.slice(2).join(' ') : 'no answer'}` };
    stat.loadMs = Math.round(performance.now() - t);
    onServer = r;
    return { ok: true, ms: stat.loadMs };
  }

  /**
   * Compile `text` and, once the engine is up, hand it over. A failure keeps the last good
   * program and answers `{ ok: false, error }` with the compiler's line and column.
   * See lessons/page-code.md#code-5
   */
  function load(text) {
    const run = chain.then(async () => {
      const t = performance.now();
      const r = compile(text, { name: DEF });
      const ms = performance.now() - t;
      if (!r.ok) return { ok: false, error: r.message, ms };
      if (eng) { const sent = await send(eng, r); if (!sent.ok) return sent; }
      compiled = r;
      return { ok: true, ms, bytes: r.bytes.length, warnings: r.warnings, missing: [...values.keys()].filter((n) => !drives(n)) };
    });
    chain = run.catch(() => {});
    return run;
  }
  /** Whether the program loaded now has a control called `name`. */
  const drives = (name) => compiled.controls.some((c) => c.name === name);

  /** The engine's sound for the page's router, null until it is up. */
  const out = () => (eng ? junction : null);

  const mtof = (n) => 440 * 2 ** ((n - 69) / 12);
  function noteOn(note, vel = 100) {
    if (!eng) { waiting.set(note, vel); return null; }
    if (held.has(note)) noteOff(note);
    const id = nextId++;
    const def = onServer;
    const args = ['freq', mtof(note), 'gate', 1];
    // A velocity scales the program's own `amp`, 127 being what it wrote.
    const amp = ampOf(def);
    if (amp != null) args.push('amp', amp * vel / 127);
    for (const [k, v] of values) args.push(k, v);
    eng.send('/s_new', DEF, id, 0, 0, ...args);
    held.set(note, { id, def });
    live.add(id);
    stat.started++;
    return id;
  }
  function noteOff(note) {
    waiting.delete(note);
    const h = held.get(note);
    if (!h) return;
    held.delete(note);
    // How a note is let go is the program it started on, as /collide/ does:
    // a gate an EnvGen reads closes it, a program that never frees itself is
    // cut, and one that frees itself with no gate is left to end.
    if (h.def.gateUsed && h.def.freesItself) eng?.send('/n_set', h.id, 'gate', 0);
    else if (!h.def.freesItself) { eng?.send('/n_free', h.id); live.delete(h.id); }
  }
  /** A knob: the value for every note to come, and `/n_set` to every node still sounding. */
  function param(name, v) {
    if (!values.has(name)) return false;
    values.set(name, v);
    if (eng) for (const id of live) { eng.send('/n_set', id, name, v); stat.sets++; }
    return true;
  }
  function panic() {
    held.clear(); live.clear(); waiting.clear();
    eng?.send('/g_freeAll', 0);
  }

  return {
    get compiled() { return compiled; },
    compileMs, values, stat, warm, wake, load, drives, out, noteOn, noteOff, param, panic,
    engine: () => eng, held: () => [...held.keys()], live: () => live.size,
  };
}

/** RMS of an analyser's current window, and the buffer it read into. */
export function rmsOf(an, buf) {
  an.getFloatTimeDomainData(buf);
  let s = 0;
  for (const v of buf) s += v * v;
  return Math.sqrt(s / buf.length);
}
export const dbfs = (rms) => (rms > 0 ? 20 * Math.log10(rms) : -Infinity);
