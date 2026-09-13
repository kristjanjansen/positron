// demo/patch/engine.mjs — SuperCollider's own sound server, compiled to
// WebAssembly, wrapped in the four things this page asks of it: come up, take a
// file, play it, and say how loud it got.
//
// ⚠️ IT LIVES BESIDE THE PAGE, NOT IN `demo/shell/`, and that is a deliberate
// line. `demo/shell/synthdef.mjs` and `synthdef-audio.mjs` are about the FILE
// FORMAT and have no dependency on any engine — any page can use them. This is
// 1.86 MB of vendored third-party WebAssembly with one caller, and promoting it
// to the shared kit would invite a second page to import it without noticing
// what it costs.
//
// 🔴 NOTHING HERE IS FETCHED UNTIL SOMEBODY ASKS. The import of
// `./vendor/supersonic.js` is inside `start()`, so visiting the page costs the
// page and nothing else. A static import at the top would put 1.86 MB on every
// visit to a page whose first paragraph is about a 330-byte file, which would
// be funny and also wrong.
//
// LICENCE, recorded here rather than in somebody's memory: the engine is
// scsynth (GPL-3.0-or-later) on Sam Aaron's clockwork (AGPL-3.0-or-later) and
// the combined work is AGPL-3.0-or-later. AGPL is the one licence where
// SERVING IT OVER A NETWORK is the trigger, and positron.studio serves it. The
// project's stance (CLAUDE.md, `positron is R&D`) is that licences are
// footnotes here rather than gates — this is the footnote, in the file.
// `vendor/LICENSE-*` are the texts as shipped. The `.scsyndef` beside them is
// from `supersonic-scsynth-synthdefs`, which is MIT.
//
// ⚠️ TWO NUMBERS THE ENGINE REPORTS THAT MUST NEVER BE DISPLAYED.
// `/status.reply`'s `avgCPU` and `peakCPU` read 0 at every load in this build,
// including at 8,585 building blocks (research §2.1). A cell that never changes
// is not a measurement. `glitchCount` is the counter that moves.

const VENDOR = new URL('./vendor/', import.meta.url).href;

/**
 * Boot it, and hand back the small surface this page uses.
 *
 * `ctx` is the page's own AudioContext so that both engines are measured on one
 * clock — but each gets its OWN analyser, because "how loud did SuperCollider
 * get" and "how loud did the browser get" are two questions and a shared meter
 * could only ever answer their sum.
 */
export async function startEngine({ audioContext, log = () => {} } = {}) {
  const t0 = performance.now();
  const { SuperSonic } = await import('./vendor/supersonic.js');
  const importMs = performance.now() - t0;

  // ⚠️ `coreBaseURL` ALONE DOES NOT WORK, measured in research §7: the engine
  // fetched `baseURL + 'wasm/scsynth-nrt.wasm'` and 404'd, following the
  // recipe in the package's own README. Every URL is given explicitly here, and
  // the vendored files sit flat so there is no second layout to be wrong about.
  const sonic = new SuperSonic({
    baseURL: VENDOR,
    wasmBaseURL: VENDOR,
    workletUrl: `${VENDOR}clockwork_audio_worklet.js`,
    ...(audioContext ? { audioContext } : {}),
  });

  const replies = [];
  sonic.on('in', (m) => { replies.push(m); if (replies.length > 200) replies.shift(); });

  const t1 = performance.now();
  await sonic.init();
  const bootMs = performance.now() - t1;

  const ctx = sonic.audioContext;
  const meter = ctx.createAnalyser();
  meter.fftSize = 2048;
  // Route the engine through the meter and then on to the speakers — the
  // measurement is IN the path, not a tap off a branch that might be muted.
  sonic.node.disconnect();
  sonic.node.connect(meter);
  meter.connect(ctx.destination);
  const frame = new Float32Array(meter.fftSize);

  log(`SuperCollider up in ${Math.round(bootMs)} ms · ${sonic.mode} · ${ctx.sampleRate} Hz`
    + ` · module ${Math.round(importMs)} ms`);

  /** Wait for one reply, or say plainly that none came. */
  const waitFor = (match, ms = 4000) => new Promise((resolve) => {
    const un = sonic.on('in', (m) => { if (match(m)) { un(); clearTimeout(t); resolve(m); } });
    const t = setTimeout(() => { un(); resolve(null); }, ms);
  });

  let node = 2100;

  return {
    bootMs,
    importMs,
    mode: sonic.mode,
    sampleRate: ctx.sampleRate,
    audioContext: ctx,

    /**
     * Hand over the bytes.
     *
     * 🔴 THE ANSWER IS THE ENGINE'S REPLY, NOT THE CALL'S RETURN VALUE.
     * research §8 measured `loadSynthDef()` returning `{name, size}` for a
     * definition the server never received — a green reply that is not
     * evidence. This sends the raw bytes and waits for the server to say
     * `/done /d_recv` in its own voice, and reports `false` when it does not.
     * There is no failure reply to wait for: over 64 KiB the server says
     * NOTHING AT ALL (research §8.2), which is why the timeout is the answer
     * rather than an error.
     */
    async load(bytes) {
      const done = waitFor((m) => m[0] === '/done' && m[1] === '/d_recv');
      sonic.send('/d_recv', bytes);
      return !!(await done);
    },

    /** Start one, at the root, and keep its number so it can be stopped. */
    play(name, params = {}) {
      const id = ++node;
      const flat = [];
      for (const [k, v] of Object.entries(params)) flat.push(k, v);
      sonic.send('/s_new', name, id, 0, 0, ...flat);
      return id;
    },

    set(id, name, value) { sonic.send('/n_set', id, name, value); },

    /** What the SERVER thinks a parameter is — the far side of the wire. */
    async ask(id, name) {
      const reply = waitFor((m) => m[0] === '/n_set' && m[1] === id, 2000);
      sonic.send('/s_get', id, name);
      const m = await reply;
      return m ? m[3] : null;
    },

    free(id) { if (id) sonic.send('/n_free', id); },
    freeAll() { sonic.send('/g_freeAll', 0); },

    /** Loudness now, as a root-mean-square over one analyser window. */
    level() {
      meter.getFloatTimeDomainData(frame);
      let s = 0;
      for (const v of frame) s += v * v;
      return Math.sqrt(s / frame.length);
    },

    replies,
    shutdown: () => sonic.shutdown(),
  };
}

/**
 * The average loudness over a window, which is the measurement this page needs
 * and NOT the one it first took.
 *
 * 🔴 A MAXIMUM STRADDLES A CHANGE. The first version of this probe read the
 * PEAK over 700 ms immediately after turning the loudness down, and reported
 * that turning it down did nothing — because the analyser's window still held
 * 42 ms of the loud signal and a maximum keeps it forever. The same reading
 * also could not tell a real change from the 1.1 Hz beating of two detuned
 * oscillators. A mean, taken after the change has had time to land, answers the
 * question that was actually asked. This is CLAUDE.md's "measure the quantity
 * in question, not one adjacent to it", in the smallest possible costume.
 */
export async function levelOver(read, ms, settleMs = 0) {
  if (settleMs) await new Promise((r) => setTimeout(r, settleMs));
  const until = performance.now() + ms;
  let sum = 0, n = 0;
  while (performance.now() < until) {
    sum += read();
    n++;
    await new Promise((r) => setTimeout(r, 25));
  }
  return n ? sum / n : 0;
}

/**
 * What the engine actually cost on the wire, asked of the browser rather than
 * read off a package listing.
 *
 * 🔴 THIS IS THE NUMBER THE WHOLE ARGUMENT TURNS ON, so it is MEASURED here
 * rather than quoted. `research/supercollider-browser-2026-09.md` §5 priced
 * 1,701,983 B of engine against a 6,659 B worklet and concluded a demo page
 * cannot justify 256x — which is right about a demo's sound engine and says
 * nothing about an ASSET FORMAT, where the engine is fetched once and the thing
 * that travels is the file. Printing both beside each other is the only honest
 * way to leave that judgement with the reader.
 *
 * ⚠️ THREE THINGS MEASURED HERE THE SLOW WAY, EACH BECAUSE THE FAST WAY LIED.
 * `transferSize` is 0 for a cached response, so a second visit would report
 * that the engine is free — `encodedBodySize` is the one to trust, with NO
 * fallback, because the fallback added a phantom 300 B. The wasm appears TWICE
 * in the timing (one full row and one with an empty body), so entries are
 * deduplicated by name or the engine is counted once and a bit. And the
 * AudioWorklet module — 30,263 B of it — is fetched inside the WORKLET's own
 * scope and never appears in the page's resource timing at all, which is why
 * this returns `atLeast` rather than a total: a number that silently omits part
 * of what it is pricing flatters the thing it is pricing.
 */
export function engineBytes() {
  const seen = new Map();
  for (const r of performance.getEntriesByType('resource')) {
    if (!/\/patch\/vendor\//.test(r.name)) continue;
    if (/\.scsyndef$/.test(r.name)) continue;      // that is an asset, not the reader
    const was = seen.get(r.name) || 0;
    seen.set(r.name, Math.max(was, r.encodedBodySize || 0));
  }
  let bytes = 0;
  for (const v of seen.values()) bytes += v;
  return { atLeast: bytes, files: seen.size };
}

