// demo/grains/engine.mjs — the LEFT pane of `/grains/`: real SuperCollider,
// running the board's own Pappus graph, in the tab.
//
// 🔴 WHAT THIS REPLACED AND WHY. This pane used to be
// `demo/shell/granular-worklet.js`, 251 lines of hand-written granulator, under
// a page whose own line said *"the same granulator in this page and on a
// Raspberry Pi"*. That claim was false: a reimplementation that sounds similar
// is not the same instrument, and every disagreement between the two panes had
// two possible causes — the settings, or the fact that they were different
// programs. Now both ends load the SAME compiled `pappus.scsyndef`, so a
// disagreement is about one instrument in two places.
//
// 📄 The measurement this is built on is
// `research/supercollider-browser-2026-09.md` §10: TINY (64,733 B, 1,467
// building blocks, 103 settings) loads into the SuperSonic engine in 11–12 ms,
// answers `/n_go`, makes a sound against a silence control that reads exactly
// 0.000000, and its `SendReply` grain reports reach the page at 8.00 / 4.00 /
// 15.99 a second against the board's 8.0 / 4.0 / 16.0. LITE does not load and
// the reason is bytes.
//
// ── the engine lives in `demo/shell/vendor/`, and that is a decision ───────
//
// `LAYOUT.md` rule 6 puts somebody else's binary under `demo/<slug>/vendor/`,
// and this is the SECOND deliberate departure from it — the first being the
// WebXR controller meshes, for the same reason and argued there. SuperSonic was
// at `demo/patch/vendor/` while `patch` was the only page that wanted it.
// `patch` is off the site now (`demo/manifest.mjs`), so `/patch/…` is a URL
// with nothing behind it: fetching the engine from there would be the
// `moq.mjs` failure exactly — a module holding a path that a rename had moved,
// 404ing with nothing saying so, killing the page for a reason no log line
// mentions.
//
// 🔴 AND A SECOND COPY UNDER `demo/grains/vendor/` WOULD BE WORSE THAN IT
// LOOKS. It is 1.7 MB of AGPL WebAssembly; two copies can drift apart, and the
// drift is SILENT because each page goes on working. One copy, one home, and
// the protection `LAYOUT.md` rule 6 was providing is replaced rather than
// dropped: `build.mjs`'s `checkPresent()` refuses the build when a listed file
// is not on disk (a binary is never imported, so no import check can see it)
// and `checkVendorUrls()` refuses it when a `/…/vendor/…` string in any shipped
// source has nothing deployed behind it. Both were proved by breaking them.
//
// ⚠️ It is deliberately NOT reachable through `demo/shell/`'s enumeration:
// `shellFiles()` takes one directory level and web extensions only, so neither
// the `.wasm` nor anything under `vendor/` is swept up. Every file below costs
// somebody a named line in the allowlist, which is the containment argument
// working rather than a gap to widen.
//
// ── the two definitions, and where they come from ──────────────────────────
//
// 🔴 NEITHER IS BUILT HERE. Both are compiled by sclang ON THE BOARD by
// `rig/box/norns/writedefs.scd`, because the page's whole claim is that the
// browser runs the graph the Pi runs. `demo/grains/defs/PROVENANCE.json`
// records the hash of the `.sc` each one came from, and `build.mjs` REFUSES the
// build when a hash disagrees — a stale artefact is otherwise silent in the
// worst direction, with the tab running last week's graph beside the board's.
//
// 🔴 AND PAPPUS IS NOT A SELF-CONTAINED INSTRUMENT. `Engine_Pappus.sc:518` is
// `in = LeakDC.ar([In.ar(inbusl, 1), In.ar(inbusr, 1)])` — it granulates
// whatever is ON A BUS, and the bus is filled from outside the definition. On
// the board that is JACK (fluidsynth, Yoshimi, the radio). In a browser there
// is no JACK and nothing fills that bus, so a Pappus loaded here alone
// granulates silence. `PosSource.scsyndef` is the second definition and it is
// what makes the pane sound: the same one the board runs, rendering the same
// description this page sends over the relay.
//
// ⚠️ NOTHING IS FETCHED UNTIL SOMEBODY PRESSES SOMETHING. The import of
// `supersonic.js` is inside `startPappus()`, so visiting the page costs the
// page. A static import at the top would put 1.86 MB on every visit.
//
// LICENCE, recorded here rather than in somebody's memory: the engine is
// scsynth (GPL-3.0-or-later) on Sam Aaron's clockwork (AGPL-3.0-or-later) and
// the combined work is AGPL-3.0-or-later — the one licence where SERVING IT
// OVER A NETWORK is the trigger, and positron.studio serves it.
// `demo/shell/vendor/LICENSE-supersonic-*` are the texts as shipped.
import { sourceArgs, SOURCE_TABLE } from '/shell/source-args.mjs';

// ⚠️ TWO LITERAL PREFIXES, EACH IN ONE PLACE. `build.mjs` reads these exact
// strings out of this file and refuses the build if nothing is deployed behind
// them, so they are written out rather than assembled.
const VENDOR = '/shell/vendor/';
const DEFS = '/grains/defs/';

/**
 * The buffers the compiled graph hard-codes, in the order `prAlloc` allocates
 * them — `gbufl.bufnum` is a LITERAL in the graph rather than an argument, so
 * getting this order wrong is not an error, it is a granulator reading a
 * buffer nothing allocated.
 *
 * 0-1 the grain rings, 2-3 the second granulator's (0.1 s stubs on LITE and
 * below), 4 the delay line, 5-9 the five shipped loops, 10-26 the seventeen
 * grain windows, 27-28 the euclidean gate. Then 29-30, which are OURS: the two
 * wavetables `PosSource` reads.
 *
 * 🔴 THIS IS TINY'S NUMBERING AND ONLY TINY'S. BARE reads none of the loop
 * files, so its windows start five lower — and with the wrong numbering the
 * gate buffer is never allocated, the gate reads 0, and the granulator fires no
 * grains and makes no sound WHILE PASSTHROUGH STILL WORKS. That reads as "the
 * graph has no grain clock" about a harness that mis-numbered a buffer
 * (research §10.8). The page ships TINY, so this file knows one numbering.
 */
const SR = 48000;
export const WAVE0 = 29;                 // the two PosSource wavetables
const ENV0 = 10, GATE0 = 27;
function bufferPlan() {
  const plan = [
    [0, Math.round(60.0 * SR), 1], [1, Math.round(60.0 * SR), 1],
    [2, Math.round(0.1 * SR), 1], [3, Math.round(0.1 * SR), 1],
    [4, Math.round(11.0 * SR), 1],
  ];
  for (let i = 5; i <= 9; i++) plan.push([i, SR * 2, 2]);
  for (let i = 0; i < 17; i++) plan.push([ENV0 + i, 256, 1]);
  plan.push([GATE0, 16, 1], [GATE0 + 1, 16, 1]);
  plan.push([WAVE0, SOURCE_TABLE, 1], [WAVE0 + 1, SOURCE_TABLE, 1]);
  return plan;
}

/**
 * The seventeen grain windows, from the engine's own formula.
 *
 * ⚠️ THESE ARE REBUILT HERE, NOT COPIED FROM THE BOARD. `Engine_Pappus.sc`
 * fills them with `Env([0,1,0],[p,1-p],\sine)` discretised to 256, and this is
 * that formula. They are not the board's BYTES; if a sound comparison ever
 * needs them to be, `/b_getn` off the board's scsynth and diff (research
 * §10.10).
 */
function cosWindow(p) {
  const a = new Array(256);
  for (let i = 0; i < 256; i++) {
    const x = i / 255;
    a[i] = x < p ? 0.5 - 0.5 * Math.cos(Math.PI * (x / p))
                 : 0.5 - 0.5 * Math.cos(Math.PI * (1 - (x - p) / (1 - p)));
  }
  return a;
}

/** The node numbers, fixed so `/s_get` and `/n_set` have something to name. */
export const PAPPUS_NODE = 3000, SOURCE_NODE = 3001;

/**
 * Boot scsynth, load both definitions, start them in the right order, and hand
 * back the small surface `/grains/` drives.
 *
 * Every slow thing is in here on purpose: this is called from the page's own
 * control 0, which is the only control `verify.mjs` gives a settle budget.
 */
export async function startPappus({ audioContext, log = () => {}, onGrain = null } = {}) {
  const t0 = performance.now();
  const { SuperSonic } = await import(`${VENDOR}supersonic.js`);
  const moduleMs = performance.now() - t0;

  // ⚠️ `coreBaseURL` ALONE DOES NOT WORK (research §7): the engine fetches
  // `baseURL + 'wasm/scsynth-nrt.wasm'` and 404s. Every URL explicitly.
  const sonic = new SuperSonic({
    baseURL: VENDOR,
    wasmBaseURL: VENDOR,
    workletUrl: `${VENDOR}clockwork_audio_worklet.js`,
    ...(audioContext ? { audioContext } : {}),
  });

  const replies = [];
  sonic.on('in', (m) => {
    // 🔴 THE GRAINS, ON THE FAR SIDE OF THE WIRE. `SendReply.ar(vtrig * report,
    // '/pgrain', [pos, dur, i, half])` in the engine — so this count is the
    // GRAPH's, not anything this page asked for, and it stops when `report`
    // goes off. Payload: [nodeID, replyID, pos, dur, voice, half].
    if (m[0] === '/pgrain') { onGrain?.({ pos: m[2], dur: m[3], voice: m[4], half: m[5] }); return; }
    replies.push(m);
    if (replies.length > 400) replies.shift();
  });

  const t1 = performance.now();
  await sonic.init();
  const bootMs = performance.now() - t1;
  const ctx = sonic.audioContext;

  // The meter is IN the path, not a tap off a branch that might be muted — the
  // deafness control has to measure what the speakers would get.
  //
  // 🔴 AND THE WHOLE CHAIN REACHES THE DESTINATION BEFORE ANYTHING ELSE
  // HAPPENS, WHICH COST A RUN. Web Audio PULLS: a node with no path to the
  // destination is never asked to process, and this engine's worklet is where
  // `/b_alloc` is serviced — so with the output left dangling for the caller to
  // connect later, the first buffer answered
  // `[OSCRewriter] /b_alloc 0 allocation failed: Buffer 0 allocation timeout
  // (5000ms)` and every allocation after it. It reads exactly like a wedged
  // engine and it is a disconnected graph. The caller gets `out`'s GAIN to
  // blend with, never the connection.
  const meter = ctx.createAnalyser();
  meter.fftSize = 2048;
  const out = ctx.createGain();
  out.gain.value = 0.9;
  sonic.node.disconnect();
  sonic.node.connect(meter);
  meter.connect(out);
  out.connect(ctx.destination);
  const frame = new Float32Array(meter.fftSize);

  // 🔴 NOTHING IS CONNECTED TO `sonic.node.input`, AND THAT IS THE BROWSER'S
  // VERSION OF UNPLUGGING THE INSTRUMENT. scsynth fills its input busses from
  // the host before any node runs, so anything routed in here would SUM with
  // what `PosSource` writes — two materials in one buffer, which is a third
  // thing neither end can describe. `sourceFeed()` in `jacksynth.mjs`
  // disconnects one JACK link on the board for exactly this reason.

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  /**
   * ⚠️ MARK THE REPLY LIST BEFORE THE SEND. research §8's own trap: a matcher
   * that searches the whole history answers with an EARLIER send's `/done`, and
   * this boot has thirty-odd `/done`-shaped replies in flight.
   */
  const waitFor = (match, ms) => new Promise((resolve) => {
    const mark = replies.length;
    const iv = setInterval(() => {
      for (let i = mark; i < replies.length; i++) {
        if (match(replies[i])) { clearInterval(iv); clearTimeout(t); resolve(replies[i]); return; }
      }
    }, 10);
    const t = setTimeout(() => { clearInterval(iv); resolve(null); }, ms);
  });
  const sendAndWait = (match, ms, ...msg) => { const w = waitFor(match, ms); sonic.send(...msg); return w; };

  log(`SuperCollider up in ${Math.round(bootMs)} ms · ${sonic.mode} · ${ctx.sampleRate} Hz`
    + ` · module ${Math.round(moduleMs)} ms`);

  const status = async () => {
    const r = await sendAndWait((m) => m[0] === '/status.reply', 4000, '/status');
    return r ? { ugens: r[2], synths: r[3], groups: r[4], defs: r[5] } : null;
  };

  sonic.send('/notify', 1);
  await sleep(250);

  // ── the buffers ────────────────────────────────────────────────────────
  // ⚠️ `/done /b_allocPtr`, NOT `/done /b_alloc`. SuperSonic rewrites the
  // command into its own pointer-based one and answers in THAT name, so a
  // matcher waiting for the reply scsynth documents waits for ever — measured,
  // and it read as a wedged engine rather than as a renamed reply (research
  // §10.8).
  const plan = bufferPlan();
  let allocated = 0; const allocFailed = [];
  for (const [n, frames, ch] of plan) {
    const got = await sendAndWait(
      (m) => (m[0] === '/done' || m[0] === '/fail') && (m[1] === '/b_alloc' || m[1] === '/b_allocPtr'),
      10000, '/b_alloc', n, frames, ch);
    if (got && got[0] === '/done') allocated++; else allocFailed.push(n);
  }
  for (let i = 0; i <= 16; i++) {
    const p = Math.min(0.96, Math.max(0.04, 0.5 + ((i / 8) - 1) * 0.5));
    sonic.send('/b_setn', ENV0 + i, 0, 256, ...cosWindow(p));
  }
  const ones = new Array(16).fill(1);
  sonic.send('/b_setn', GATE0, 0, 16, ...ones);
  sonic.send('/b_setn', GATE0 + 1, 0, 16, ...ones);
  await sleep(250);
  log(`${allocated} of ${plan.length} buffers${allocFailed.length ? ` — ${allocFailed.join(',')} refused` : ''}`);

  // ── the two definitions ────────────────────────────────────────────────
  /**
   * 🔴 THE ANSWER IS `/done /d_recv` IN THE ENGINE'S OWN VOICE. Not
   * `loadSynthDef()`'s return value — research §8 measured it returning
   * `{name, size}` for a definition the server never received — and not
   * `loadedSynthDefs`, measured going 1→2→3 across three sends of which one
   * loaded. Over the engine's ceiling the server says NOTHING AT ALL, so the
   * timeout is the answer rather than an error.
   */
  async function recv(url) {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, why: `${url} answered ${res.status}` };
    const bytes = new Uint8Array(await res.arrayBuffer());
    const before = await status();
    const t = performance.now();
    const done = await sendAndWait((m) => m[0] === '/done' && m[1] === '/d_recv', 20000, '/d_recv', bytes);
    const after = await status();
    return {
      ok: !!done, bytes: bytes.length, ms: Math.round(performance.now() - t),
      defs: [before?.defs ?? null, after?.defs ?? null],
      why: done ? null : 'the engine never said it had received it',
    };
  }

  const loadedSource = await recv(`${DEFS}possource.scsyndef`);
  const loadedGraph = await recv(`${DEFS}pappus-tiny.scsyndef`);
  log(`Pappus TINY: ${loadedGraph.bytes} B, ${loadedGraph.ok ? `taken in ${loadedGraph.ms} ms` : loadedGraph.why}`
    + ` · the material: ${loadedSource.bytes} B, ${loadedSource.ok ? 'taken' : loadedSource.why}`);

  const ready = loadedGraph.ok && loadedSource.ok;
  let started = false, order = null, running = null;

  if (ready) {
    // 🔴 ORDER, AND IT IS NOT A DETAIL. `Out.ar` SUMS into a bus and scsynth
    // runs nodes in tree order, so a reader placed before its writer hears the
    // PREVIOUS block — one block late, for ever, which reads as "it nearly
    // works" rather than as a wiring mistake. The board has the same rule and
    // solves it the same way (`PosSource.sc`'s header: Engine_Pappus adds
    // `addToTail`, the source goes `addToHead`).
    //
    // ⚠️ `inbusl 2 inbusr 3` IS THE BOARD'S OWN WIRING, not a browser
    // convenience: `context.in_b[0]` on the board is bus 2 (two output
    // channels come first), and `PosSource` writes to that ONE mono bus, so
    // the granulator gets material on the left and silence on the right at
    // BOTH ends. Copying the asymmetry is the point.
    const go = await sendAndWait((m) => m[0] === '/n_go' || (m[0] === '/fail' && m[1] === '/s_new'), 8000,
      '/s_new', 'pappus', PAPPUS_NODE, 1, 0, 'inbusl', 2, 'inbusr', 3, 'outbus', 0);
    const src = await sendAndWait((m) => m[0] === '/n_go' || (m[0] === '/fail' && m[1] === '/s_new'), 8000,
      '/s_new', 'posSource', SOURCE_NODE, 0, 0,
      'out', 2, 'b0', WAVE0, 'b1', WAVE0 + 1, 'xf', 0);
    started = !!(go && go[0] === '/n_go') && !!(src && src[0] === '/n_go');
    await sleep(200);
    running = await status();
    // 🔴 ASSERTED, NOT ASSUMED. `/g_queryTree` is the server's own answer about
    // its node tree, so this is the far side of the wire saying the writer runs
    // first — which nothing on this side could know.
    const tree = await sendAndWait((m) => String(m[0]) === '/g_queryTree.reply', 5000, '/g_queryTree', 0, 0);
    if (tree) {
      const flat = tree.map((x) => (typeof x === 'number' ? x : String(x)));
      const iS = flat.indexOf(SOURCE_NODE), iP = flat.indexOf(PAPPUS_NODE);
      order = { source: iS, granulator: iP, sourceFirst: iS >= 0 && iP >= 0 && iS < iP, reply: flat };
    }
    log(started
      ? `the graph is running — ${running?.ugens} building blocks, ${running?.synths} of them started`
        + `${order ? `, the material ${order.sourceFirst ? 'ahead of' : 'BEHIND'} the granulator` : ''}`
      : 'the graph would not start');
  }

  let wave = 0;        // which wavetable `PosSource` is crossfaded to
  let reporting = false;

  const api = {
    bootMs, moduleMs, mode: sonic.mode, sampleRate: ctx.sampleRate, audioContext: ctx,
    out, ready, started, order, running,
    graph: loadedGraph, source: loadedSource,

    /**
     * One setting, on the granulator. The page sends the same name to both ends.
     *
     * ⚠️ AN ARRAY IS A DIFFERENT MESSAGE, AND GUESSING WHICH FROM THE ARITY IS
     * HOW A ONE-ELEMENT ARRAY BECOMES A SCALAR. `gates` and `probs` are
     * eight-element control arrays in this definition, and `/n_set` would write
     * only the first — leaving seven voices at whatever they held. `run-pappus`
     * splits the same pair of doors (`/pos/set` against `/pos/setn`) for
     * exactly this reason.
     */
    set(cmd, value) {
      if (Array.isArray(value)) sonic.send('/n_setn', PAPPUS_NODE, cmd, value.length, ...value);
      else sonic.send('/n_set', PAPPUS_NODE, cmd, value);
    },

    /** What the SERVER thinks a setting is — the far side of the wire. */
    async ask(cmd, node = PAPPUS_NODE) {
      const r = await sendAndWait((m) => m[0] === '/n_set' && m[1] === node && m[2] === cmd, 3000,
        '/s_get', node, cmd);
      return r ? r[3] : null;
    },

    /**
     * The material, from the same spec and the same expander the board uses.
     *
     * 🔴 TWO WAVETABLES AND A CROSSFADE, AND THE FILL ALWAYS LANDS ON THE ONE
     * THAT IS NOT PLAYING. `Osc.ar` reads its buffer every sample, so writing
     * the buffer it is reading is a step in the middle of a waveform — and a
     * click on a GRANULATOR'S INPUT is written into the ring and re-fired by
     * every grain that later reads that spot.
     *
     * ⚠️ `/b_gen sine1` WITH FLAGS 6, WHICH IS wavetable|clear AND NOT
     * normalize. Normalise defaults ON in sclang's wrapper and would throw the
     * spec's level away while everything still made a sound — the page and the
     * board at two different levels with two matching readouts. 6 is the same
     * `(amps, false, true, true)` the board sends.
     */
    async setSource(spec) {
      const a = sourceArgs(spec, ctx.sampleRate);
      if (!a.ok) return a;
      const next = 1 - wave;
      const filled = await sendAndWait((m) => (m[0] === '/done' || m[0] === '/fail') && String(m[1]).startsWith('/b_gen'),
        8000, '/b_gen', WAVE0 + next, 'sine1', 6, ...a.amps);
      if (!filled || filled[0] !== '/done') return { ok: false, reason: 'the engine would not fill the table', plan: a.plan };
      wave = next;
      sonic.send('/n_setn', SOURCE_NODE, 'semis', a.semis.length, ...a.semis);
      for (const [k, v] of Object.entries(a.scalars)) sonic.send('/n_set', SOURCE_NODE, k, v);
      sonic.send('/n_set', SOURCE_NODE, 'xf', wave);
      return a;
    },

    /**
     * What the ENGINE says it is holding — the same question the board answers
     * through `/pos/confirm`, asked here directly.
     *
     * 🔴 A NODE ID IS NOT EVIDENCE THAT A SYNTH EXISTS. `/s_get` replies only
     * for a node that is really there holding the value it really holds, which
     * is why this is the claim the page asserts rather than "we sent it".
     */
    async askSource() {
      const voices = await api.ask('nvoices', SOURCE_NODE);
      const hz = await api.ask('hz', SOURCE_NODE);
      return voices === null || hz === null ? null : { voices, hz };
    },

    /** Per-grain reports on or off. ⚠️ OFF BY DEFAULT in the engine. */
    report(on) { reporting = !!on; sonic.send('/n_set', PAPPUS_NODE, 'report', on ? 1 : 0); },
    reporting: () => reporting,

    /** Loudness now, root-mean-square over one analyser window. */
    level() {
      meter.getFloatTimeDomainData(frame);
      let s = 0;
      for (const v of frame) s += v * v;
      return Math.sqrt(s / frame.length);
    },

    status,
    replies,
    shutdown: () => { try { sonic.shutdown(); } catch { /* going away anyway */ } },
  };
  return api;
}

/**
 * The average loudness over a window, taken AFTER the change has landed.
 *
 * 🔴 A MAXIMUM STRADDLES A CHANGE — an analyser window still holds 42 ms of the
 * old signal, and a maximum keeps it for ever, so a peak read straight after
 * turning something down reports that turning it down did nothing.
 */
export async function levelOver(read, ms, settleMs = 0) {
  if (settleMs) await new Promise((r) => setTimeout(r, settleMs));
  const until = performance.now() + ms;
  let sum = 0, n = 0;
  while (performance.now() < until) {
    sum += read();
    n++;
    await new Promise((r) => setTimeout(r, 20));
  }
  return n ? sum / n : 0;
}

/**
 * What the engine cost on the wire, asked of the browser rather than quoted.
 * ⚠️ `encodedBodySize` with NO fallback — `transferSize` is 0 for a cached
 * response, so a second visit would report that the engine is free. Entries are
 * deduplicated by name because the wasm appears twice in the timing. It returns
 * `atLeast` because the AudioWorklet module is fetched inside the worklet's own
 * scope and never appears in the page's resource timing at all.
 */
export function engineBytes() {
  const seen = new Map();
  for (const r of performance.getEntriesByType('resource')) {
    if (!/\/shell\/vendor\//.test(r.name)) continue;
    if (/\.(scsyndef|glb)$/.test(r.name)) continue;   // an asset, not the reader
    seen.set(r.name, Math.max(seen.get(r.name) || 0, r.encodedBodySize || 0));
  }
  let bytes = 0;
  for (const v of seen.values()) bytes += v;
  return { atLeast: bytes, files: seen.size };
}
