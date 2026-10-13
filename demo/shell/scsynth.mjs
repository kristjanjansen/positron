// demo/shell/scsynth.mjs — real SuperCollider in a tab, for any page that wants it.
//
// 🔴 THIS WAS `demo/grains/engine.mjs`'s BOOT AND IS NOW SHARED. `/grains/`
// was the only page running scsynth, so its boot lived inside it. `/archive/radio/`
// needs the same engine to granulate a live radio stream, and this repo has
// paid twice for two copies of one function (`rowHTML` printing `undefined`
// over every demo name; `moq.mjs` importing a URL that had been renamed away).
// One copy, in the kit, per CLAUDE.md's rule.
//
// What is HERE is what any page needs: bring the engine up, get its graph to
// the speakers, load a compiled definition, talk OSC and be answered. What
// stays in a page is what only that page means: which definitions, which
// buffers, which parameters.
//
// ⚠️ EVERY HARD-WON DETAIL BELOW IS LOAD-BEARING AND WAS MEASURED. They are
// kept verbatim from the engine that proved them; do not tidy one away without
// re-running `node demo/verify.mjs grains` against the live board.
//
// LICENCE: SuperSonic (wasm scsynth) is vendored under `demo/shell/vendor/`
// with its licence files beside it. See LAYOUT.md rule 6.

const VENDOR = '/shell/vendor/';
const WASM = `${VENDOR}scsynth-nrt.wasm`;
const MODULE = `${VENDOR}supersonic.js`;

/**
 * A download hint for the engine, and nothing else: two `<link rel=prefetch>`
 * for the wasm and the module, both on our origin. Nothing is compiled, no
 * context is made and nothing runs. Asked 2026-10-12 (BACKLOG, *"sampler/040:
 * warm SuperCollider before the first key"*), when every sampler page went to
 * scsynth and the first note on each of them paid the boot.
 * ⚠️ IT IS A HINT. The local server answers `no-store`, which a browser will
 * not keep, so on `node demo/server.mjs` this saves nothing and only the
 * deploy can show what it is worth. `loadScsynth` is the half that does not
 * depend on a cache.
 */
export function prefetchScsynth() {
  if (typeof document === 'undefined') return;
  for (const href of [WASM, MODULE]) {
    if (document.head.querySelector(`link[rel="prefetch"][href="${href}"]`)) continue;
    const l = document.createElement('link');
    l.rel = 'prefetch';
    l.href = href;
    document.head.append(l);
  }
}

let loading = null;
/**
 * The module and the wasm bytes, fetched once per page and kept. A page calls
 * this on intent (a pointer over the keys, a focus, the first MIDI message),
 * which is the download; `bootScsynth` then takes the bytes from here rather
 * than asking SuperSonic to fetch them again. A failure is forgotten so the
 * next ask tries again.
 */
export function loadScsynth() {
  loading ??= (async () => {
    const t0 = performance.now();
    const [mod, wasm] = await Promise.all([
      import(MODULE),
      fetch(WASM).then((r) => {
        if (!r.ok) throw new Error(`${WASM} answered ${r.status}`);
        return r.arrayBuffer();
      }),
    ]);
    return { SuperSonic: mod.SuperSonic, osc: mod.osc, wasmBytes: wasm, ms: performance.now() - t0 };
  })();
  loading.catch(() => { loading = null; });
  return loading;
}

/**
 * Bring scsynth up in this tab.
 *
 * @param {{audioContext?: AudioContext, input?: AudioNode,
 *          log?: (s: string) => void, onReply?: (m: any[]) => boolean}} opts
 *   `input` is an AudioNode to feed scsynth's HARDWARE INPUT BUSSES — see the
 *   note on it below, it is the whole reason this file is shared.
 *   `onReply` sees every OSC message first; return true to consume it (that is
 *   how `/grains/` takes `/pgrain` without it filling the reply ring).
 */
export async function bootScsynth({ audioContext, input = null, log = () => {}, onReply = null, scsynthOptions = null } = {}) {
  const t0 = performance.now();
  const { SuperSonic, osc, wasmBytes } = await loadScsynth();
  const moduleMs = performance.now() - t0;

  // ⚠️ `coreBaseURL` ALONE DOES NOT WORK (research §7): the engine fetches
  // `baseURL + 'wasm/scsynth-nrt.wasm'` and 404s. Every URL explicitly.
  // ⚠️ THE INPUT BUS COUNT IS NOT OURS TO SET, AND A COMMENT HERE ONCE CLAIMED
  // IT WAS. The base class defaults `audio.inputChannels` to 0, which looks
  // like the thing to override — but the SuperSonic subclass you actually
  // construct OVERWRITES it: `audio: { outputChannels: t.numOutputBusChannels,
  // inputChannels: t.numInputBusChannels }`, derived from the scsynth options,
  // whose defaults are **2 and 2**. So input busses exist already, at 2 and 3
  // (outputs first, then inputs) — which is exactly the `inbusl 2 inbusr 3` the
  // board uses. Passing `audio: {...}` here is a no-op and was removed rather
  // than left in looking load-bearing.
  const sonic = new SuperSonic({
    baseURL: VENDOR,
    wasmBaseURL: VENDOR,
    workletUrl: `${VENDOR}clockwork_audio_worklet.js`,
    // A copy: the engine posts these bytes to its worklet, and a second boot
    // on the same page must not be handed a buffer the first one gave away.
    wasmBytes: wasmBytes.slice(0),
    ...(scsynthOptions ? { scsynthOptions } : {}),
    ...(audioContext ? { audioContext } : {}),
  });

  const replies = [];
  sonic.on('in', (m) => {
    if (onReply && onReply(m)) return;
    replies.push(m);
    if (replies.length > 400) replies.shift();
  });

  const t1 = performance.now();
  // A failed init (an AudioContext that never started, most often) leaves an
  // engine half up; it is taken down so the caller can boot again.
  try { await sonic.init(); }
  catch (e) { try { await sonic.destroy(); } catch { /* already down */ } throw e; }
  const bootMs = performance.now() - t1;
  const ctx = sonic.audioContext;

  // The meter is IN the path, not a tap off a branch that might be muted — a
  // deafness control has to measure what the speakers would get.
  //
  // 🔴 AND THE WHOLE CHAIN REACHES THE DESTINATION BEFORE ANYTHING ELSE
  // HAPPENS, WHICH COST A RUN. Web Audio PULLS: a node with no path to the
  // destination is never asked to process, and this engine's worklet is where
  // `/b_alloc` is serviced — so with the output left dangling for the caller to
  // connect later, the first buffer answered `allocation timeout (5000ms)` and
  // every allocation after it. It reads exactly like a wedged engine and it is
  // a disconnected graph. The caller gets `out`'s GAIN to blend with, never the
  // connection.
  const meter = ctx.createAnalyser();
  meter.fftSize = 2048;
  const out = ctx.createGain();
  out.gain.value = 0.9;
  sonic.node.disconnect();
  sonic.node.connect(meter);
  meter.connect(out);
  out.connect(ctx.destination);

  // 🔴 THE INPUT BUS — THE BROWSER'S VERSION OF PLUGGING THE INSTRUMENT IN.
  // `Engine_Pappus.sc:518` is `In.ar(inbusl, 1), In.ar(inbusr, 1)`: Pappus
  // does not generate, it granulates whatever is ON A BUS. On the Raspberry Pi
  // that bus is filled by JACK. In a browser nothing filled it, so a Pappus
  // loaded alone granulated silence — which is why `/grains/` also loads
  // `PosSource`, a SECOND definition that manufactures material, and why
  // LESSONS #81 ships that caveat beside its "same instrument at both ends"
  // claim.
  //
  // A live audio node fills it. VERIFIED IN THE VENDORED WORKLET rather than
  // assumed from the node's shape: `clockwork_audio_worklet.js`'s
  // `process(s,t,e)` does `let c = s[0]?.length || 0;` and, when `c > 0`,
  // copies those channels into `get_audio_input_bus()`. Busses 2 and 3 are the
  // first hardware inputs (two output channels come first), which is exactly
  // the `inbusl 2 inbusr 3` the board itself uses.
  //
  // ⚠️ ANYTHING ROUTED IN HERE SUMS WITH WHAT A `PosSource` WRITES to the same
  // bus — two materials in one buffer, a third thing neither end can describe.
  // A page feeding live input must NOT also run a source onto that bus.
  if (input) {
    // 🔴 `sonic.node` IS A FROZEN FAÇADE, NOT AN AudioNode — AND `.input` IS THE
    // REAL ONE. SuperSonic returns `Object.freeze({ connect, disconnect, get
    // context, get numberOfInputs, …, get input(){ return e } })`, where `e` is
    // the AudioWorkletNode. Its `connect` FORWARDS, so `sonic.node.connect(x)`
    // works and reads like an AudioNode — but `x.connect(sonic.node)` throws
    // `Overload resolution failed`, because Web IDL wants an AudioNode and this
    // object is not one. It passes every duck-type check you would think to
    // write: it has `connect`, it reports `numberOfInputs: 1`, its `context` is
    // the right context. MEASURED: four such checks passed and the next line
    // threw anyway.
    //
    // ⚠️ `demo/grains/engine.mjs` NAMED THIS PROPERTY ALL ALONG — its comment
    // read *"nothing is connected to `sonic.node.input`"*, which is the API and
    // not a metaphor. Read the comments already in the file (CLAUDE.md).
    const targ = sonic.node?.input ?? sonic.node;
    const why = !targ ? 'the engine exposes no node'
      : typeof targ.connect !== 'function' ? `engine node is ${targ?.constructor?.name ?? typeof targ}, not an AudioNode`
      : (targ.numberOfInputs ?? 0) < 1 ? `engine node has ${targ.numberOfInputs} inputs, nothing to feed`
      : (input.context !== targ.context) ? 'the input node belongs to a different AudioContext than the engine'
      : null;
    if (why) throw new Error(`scsynth live input refused: ${why}`);
    input.connect(targ);
  }

  log(`SuperCollider up in ${Math.round(bootMs)} ms · ${sonic.mode} · ${ctx.sampleRate} Hz`
    + ` · module ${Math.round(moduleMs)} ms${input ? ' · live input connected' : ''}`);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /**
   * ⚠️ MARK THE REPLY LIST BEFORE THE SEND. research §8's own trap: a matcher
   * that searches the whole history answers with an EARLIER send's `/done`, and
   * a boot has thirty-odd `/done`-shaped replies in flight.
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

  const status = async () => {
    const r = await sendAndWait((m) => m[0] === '/status.reply', 4000, '/status');
    return r ? { ugens: r[2], synths: r[3], groups: r[4], defs: r[5] } : null;
  };

  /**
   * 🔴 THE ANSWER IS `/done /d_recv` IN THE ENGINE'S OWN VOICE. Not
   * `loadSynthDef()`'s return value — research §8 measured it returning
   * `{name, size}` for a definition the server never received — and not
   * `loadedSynthDefs`, measured going 1→2→3 across three sends of which one
   * loaded. Over the engine's ceiling the server says NOTHING AT ALL, so the
   * timeout is the answer rather than an error.
   */
  async function recvDef(url) {
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

  // 🔴 THE ENGINE'S OWN `/done /notify`, NOT A FIXED SLEEP. This was
  // `await sleep(250)` after the send, a quarter of every boot measured on
  // /concepts/sampler/040/ (research/scsynth-sampler-in-browser-2026-10-11.md
  // section 3). scsynth answers `/notify` with `/done /notify <client>`, and
  // that answer is the fact the sleep was standing in for. If no answer comes
  // in a second the boot goes on, as it always did, and says so.
  const tn = performance.now();
  const told = await sendAndWait((m) => m[0] === '/done' && m[1] === '/notify', 1000, '/notify', 1);
  const notifyMs = performance.now() - tn;
  if (!told) log('SuperCollider did not answer /notify within 1 s, going on without it');

  /**
   * One message, timestamped: it runs when the speakers reach `perfMs`, on
   * `performance.now()`'s clock. SuperSonic maps an OSC timetag to the
   * context's output through `getOutputTimestamp` (its NTPTiming), so a bundle
   * tagged T is heard at T rather than started at T. A time already past runs
   * at once, late, and the engine counts it.
   */
  const ntpOf = (perfMs) => (performance.timeOrigin + perfMs) / 1000 + 2208988800;
  const sendAt = (perfMs, address, ...args) => sonic.sendOSC(osc.encodeBundle(ntpOf(perfMs),
    [[address, ...args.map((a) => (a instanceof ArrayBuffer ? new Uint8Array(a) : a))]]));

  return {
    sonic, ctx, out, meter, replies,
    bootMs, moduleMs, notifyMs, notified: !!told,
    send: (...m) => sonic.send(...m),
    sendAt,
    waitFor, sendAndWait, status, recvDef, sleep,
    /** the server's own answer about its node tree — never inferred here */
    queryTree: () => sendAndWait((m) => String(m[0]) === '/g_queryTree.reply', 5000, '/g_queryTree', 0, 0),
  };
}

export { VENDOR };
