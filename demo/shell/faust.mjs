// demo/shell/faust.mjs: the Faust engine, loaded once per page, by whoever asks first.
//
//   import { faustRuntime, faustCompiler, hasCompiler, faustFactory,
//            faustCompile, faustNode } from '/shell/faust.mjs';
//
// 🔴 WHY THIS IS A MODULE. Until 2026-10-06 `/fau/`'s compiler, its audio and
// its node building were functions inside that page's script, so nothing else
// on the page could reach the compiler it had already paid 6 MB for
// (`plans/plan-live-slides.md` section 4). An ES module is a singleton per
// page, so every loader below is memoised at module level and the module map
// is the registry: a slide on `/fau/` that calls `faustCompiler()` gets the
// page's compiler, and a slide on the front page that calls `faustFactory()`
// gets 3.8 kB of ahead of time Organ and never touches the compiler at all.
//
// ── THE SIX EXPORTS, AND WHAT EACH COSTS THE FIRST TIME ────────────────────
//
//   faustRuntime()          `faustwasm.mjs`, 216,533 B raw, the runtime both paths need
//   faustCompiler()         the runtime plus libfaust, 6,162,473 B raw, once
//   hasCompiler()           true once the compiler has arrived; starts nothing
//   faustFactory(url)       one ahead of time instrument, the Organ is 13,332 B raw
//   faustCompile(name, code) a live compile through `faustCompiler()`
//   faustNode(ctx, parts, voices) an AudioWorkletNode from either, polyphonic
//                           or, for a `mono` program, mono
//
// 🔴 AND A MONO PATH SINCE 2026-10-06, THE SMALLEST ONE THERE IS. The front
// page's `synths` deck plays `process = os.osc(440) * 0.1;`, which declares no
// `freq`, `gain` or `gate`, so there is no key to press: a polyphonic node
// would hold eight voices nobody can start. `faustCompile(..., { mono: true })`
// and an ahead of time `<id>.json` carrying `mono: true` both give
// `{ name, mono: true, factory }`, and `faustNode` builds that through the
// runtime's own `FaustMonoDspGenerator`. A mono node sounds while it is
// connected; it has no notes to let go of.
//
// 🔴 NOTHING HAPPENS ON IMPORT, AND THE RUNTIME IS REACHED ONLY THROUGH
// `import()`. A static import of `faustwasm.mjs` here would cost every page
// that imports this module 216 kB decoded on a visit, which on the front page
// is the trap section 6.2 of the plan names. So this file has no static import
// at all, fetches nothing and builds nothing until a function is called.
//
// ⚠️ WHAT IS DELIBERATELY NOT MEMOISED. `faustCompile` and `faustNode` make a
// new thing on every call, because that is their job: `/fau/` compiles under a
// fresh name on every edit (libfaust caches a factory by name and code, see
// that page), and a node belongs to one context and is destroyed on the next
// compile. A memo of either would be a cache of things that have been thrown
// away. The LOADERS are memoised: the runtime, the compiler, and each ahead of
// time factory by URL.
//
// ⚠️ A FAILED LOAD CLEARS ITS MEMO, so the next press tries again rather than
// being handed the same rejection for the life of the page. That is `/muta/`'s
// `warmUp` shape.

/**
 * ⚠️ MOVED HERE VERBATIM FROM `demo/fau/index.html` ON 2026-10-06, so "this
 * page" below is `/fau/`, and "this file" is now this module, which the build's
 * vendor check reads like any other.
 *
 * 🔴 THE VENDORED FILES, EACH WRITTEN OUT AS A WHOLE QUOTED PATH BECAUSE THAT
 * IS WHAT THE BUILD CHECKS. `workers/view/build.mjs` copies only an
 * allowlist, `demoFiles()` takes neither a `.wasm` nor a subdirectory, and
 * `checkVendorUrls()` refuses the build when a vendor path in this file has
 * nothing deployed behind it. Five explicit lines in that file are what this
 * page costs, which is `LAYOUT.md` rule 6 working as designed: a 6 MB binary
 * should cost somebody a deliberate line.
 * ⚠️ AND THE GUARD READS COMMENTS TOO, WHICH IT PROVED ON ITS FIRST RUN HERE.
 * The line above used to carry a quoted vendor path with an ellipsis standing
 * in for the file name, and the build refused itself over a path that was
 * never a path. Writing one out in prose here is the one way to break this
 * page's own deploy, so it is not done.
 * ⚠️ THE `.data` FILE IS NOT DATA, IT IS SOURCE CODE. 53 `.lib` files of
 * plain Faust totalling 2,406,429 bytes, which the compiler reads out of its
 * own in-memory filesystem. A page that imports three libraries pays for
 * fifty three, and `tubes.lib`, which models valve amplifiers, is 15.7 per
 * cent of the whole download on its own.
 */
export const FAUST_VENDOR = {
  js: '/fau/vendor/libfaust-wasm.js',
  /**
   * 🔴 `.txt`, AND THE EXTENSION IS WORTH 2 MB OF SOMEBODY'S BANDWIDTH.
   * MEASURED against the deploy 2026-09-23, which is what `plan-fau.md` §11
   * item 3 asked for and could not do: with its own `.data` name this file
   * came back with **no content-type at all and no content-encoding**,
   * 2,407,445 bytes raw, while the `.wasm` and the `.js` beside it were both
   * brotli. Cloudflare compresses by content type and has no opinion about an
   * extension it has never heard of, so the one file that compresses BEST was
   * the one going out whole.
   * ⚠️ AND IT REALLY IS TEXT: 99.95 per cent of its bytes are printable,
   * because it is 53 Faust library sources concatenated by Emscripten's
   * `file_packager`. It opens with a small WebAssembly module, which is the
   * 0.05 per cent.
   * ⚠️ THE NAME INSIDE THE COMPILER DOES NOT MOVE WITH IT. The glue asks its
   * host for a package called `libfaust-wasm.data` and `faustwasm` answers
   * with whatever bytes it fetched from the path below, so renaming the file
   * on the wire cannot desynchronise anything.
   */
  data: '/fau/vendor/libfaust-wasm.data.txt',
  wasm: '/fau/vendor/libfaust-wasm.wasm',
  mjs: '/fau/vendor/faustwasm.mjs',
};

/**
 * 🔴 `-ftz 2`, PASSED EXPLICITLY RATHER THAN LEFT TO A DEFAULT, and declared
 * here once since 2026-10-06 so the page, the ahead of time build and the
 * build's stale check all read one string. `/fau/` carries the argument for it
 * beside its own `FLAGS`, which is this constant.
 */
export const FAUST_FLAGS = '-ftz 2';

let runtimeP = null;
/** The Faust runtime module, imported once. 216,533 B raw. */
export function faustRuntime() {
  if (!runtimeP) {
    runtimeP = import(FAUST_VENDOR.mjs).catch((e) => { runtimeP = null; throw e; });
  }
  return runtimeP;
}

/**
 * 🔴 WHERE A CAPTURED `console.error` GOES. Moved here verbatim from `/fau/`
 * with the shim below, and the reason is that page's header, item 2:
 * libfaust is built with C++ exception catching off, so a syntax error goes
 * through Emscripten's `abort()`, which prints to `console.error`, and the
 * glue binds `console.error` ONCE, at module evaluation. So a forwarding
 * function is installed for exactly the await in which the glue is evaluated,
 * and only the compiler ever holds it. While a sink is set, a line goes to the
 * sink; otherwise it goes to the real console, so nothing anybody else prints
 * is swallowed.
 */
let sink = null;

let compilerP = null;
let compilerDone = null;
/**
 * The compiler, booted once. Resolves to a `FaustCompiler`.
 * @returns {Promise<any>}
 */
export function faustCompiler() {
  if (!compilerP) {
    compilerP = (async () => {
      const { instantiateFaustModuleFromFile, LibFaust, FaustCompiler } = await faustRuntime();
      const realError = console.error;
      console.error = function (...a) {
        if (sink) { sink(a.map(String).join(' ')); return undefined; }
        return realError.apply(console, a);
      };
      let mod;
      try {
        mod = await instantiateFaustModuleFromFile(FAUST_VENDOR.js, FAUST_VENDOR.data, FAUST_VENDOR.wasm);
      } finally {
        console.error = realError;
      }
      compilerDone = new FaustCompiler(new LibFaust(mod));
      return compilerDone;
    })().catch((e) => { compilerP = null; throw e; });
  }
  return compilerP;
}

/** True once the compiler is in this tab. Starts nothing and fetches nothing. */
export function hasCompiler() {
  return compilerDone !== null;
}

/**
 * Compile `code` live as a polyphonic instrument and return the compiled
 * generator, which is also the `parts` that `faustNode` takes.
 *
 * 🔴 IT AWAITS INSIDE THE SINK. `/fau/` learnt that the hard way: a version
 * that returned the promise and cleared the sink in a `finally` closed the
 * window before the abort arrived, which is inside the await.
 *
 * @param {string} name the factory's name. libfaust caches by name and code, so a caller timing a compile passes a fresh one
 * @param {string} code Faust source declaring `freq`, `gain` and `gate`
 * @param {{flags?: string, onAbort?: (line: string) => void, mono?: boolean}} [opt] where the compiler's abort lines go (without one they reach the console), and `mono` for a program with no voice to start
 * @returns {Promise<any>} a `FaustPolyDspGenerator`, compiled, or for `mono` the `{ name, mono: true, factory }` `faustNode` takes; throws with the compiler's message
 */
export async function faustCompile(name, code, { flags = FAUST_FLAGS, onAbort = null, mono = false } = {}) {
  const compiler = await faustCompiler();
  const { FaustPolyDspGenerator, FaustMonoDspGenerator } = await faustRuntime();
  const gen = mono ? new FaustMonoDspGenerator() : new FaustPolyDspGenerator();
  const before = sink;
  sink = onAbort;
  try {
    const out = await gen.compile(compiler, name, code, flags);
    if (!out) throw new Error(compiler.getErrorMessage?.() || 'the compiler returned nothing');
    return mono ? { name, mono: true, factory: gen.factory } : gen;
  } finally {
    sink = before;
  }
}

/**
 * Rebuild the three parts `createNode` takes from the bytes and the JSON of an
 * ahead of time instrument. Pure apart from `WebAssembly.compile`, so
 * `demo/resources/build-faust-aot.mjs --check` runs this exact function in node.
 *
 * ⚠️ `createNode` reads only `json`, `module`, `shaKey` and `soundfiles` off a
 * factory (READ, `faustwasm.mjs`, the poly generator's `createNode`), and the
 * `shaKey` pair names the worklet processor, so two instruments on one context
 * register two processors and the same one twice registers one.
 *
 * ⚠️ A `mono` META NAMES ONE FILE, `dsp`, AND NO MIXER, and comes back as
 * `{ name, mono: true, factory }`; its bytes arrive as `dsp`.
 *
 * @param {{meta: any, voice?: ArrayBuffer|Uint8Array, effect?: ArrayBuffer|Uint8Array|null, mixer?: ArrayBuffer|Uint8Array, dsp?: ArrayBuffer|Uint8Array}} p
 */
export async function factoryFromParts({ meta, voice, effect, mixer, dsp }) {
  const one = async (bytes, json, shaKey, poly) => ({
    shaKey, code: new Uint8Array(bytes), module: await WebAssembly.compile(bytes),
    json, poly, soundfiles: {},
  });
  if (meta.mono) return { name: meta.name, mono: true, factory: await one(dsp, meta.dsp, meta.dspSha, false) };
  return {
    name: meta.name,
    voiceFactory: await one(voice, meta.voice, meta.voiceSha, true),
    effectFactory: effect ? await one(effect, meta.effect, meta.effectSha, false) : null,
    mixerModule: await WebAssembly.compile(mixer),
  };
}

const factories = new Map();
/**
 * One ahead of time instrument, fetched once per URL: its JSON names the
 * three `.wasm` files beside it. The Organ is `/resources/faust/organ.json`.
 *
 * 🔴 IT NEEDS NO COMPILER, which is the whole point of it: 3.8 kB over brotli
 * against 1 MB for libfaust, measured to sound the same (`plan-live-slides.md`
 * section 1, and `build-faust-aot.mjs --check` re-measures it in node).
 *
 * @param {string} url the instrument's `.json`
 */
export function faustFactory(url) {
  if (!factories.has(url)) {
    const p = (async () => {
      const at = (f) => new URL(f, new URL(url, globalThis.location?.href)).href;
      const bytes = async (f) => {
        const r = await fetch(at(f));
        if (!r.ok) throw new Error(`${f}: ${r.status}`);
        return r.arrayBuffer();
      };
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      const meta = await r.json();
      if (meta.mono) return factoryFromParts({ meta, dsp: await bytes(meta.files.dsp) });
      const [voice, effect, mixer] = await Promise.all([
        bytes(meta.files.voice), meta.files.effect ? bytes(meta.files.effect) : null, bytes(meta.files.mixer)]);
      return factoryFromParts({ meta, voice, effect, mixer });
    })().catch((e) => { factories.delete(url); throw e; });
    factories.set(url, p);
  }
  return factories.get(url);
}

/**
 * An AudioWorkletNode on `ctx`, from either kind of `parts`: the generator
 * `faustCompile` returns, or what `faustFactory` resolves to. A polyphonic one
 * carries `name`, `voiceFactory`, `effectFactory` and `mixerModule`; a mono one
 * carries `name`, `mono: true` and `factory`, and `voices` means nothing to it.
 *
 * @param {BaseAudioContext} ctx
 * @param {{name: string, voiceFactory?: any, effectFactory?: any, mixerModule?: WebAssembly.Module, mono?: boolean, factory?: any}} parts
 * @param {number} [voices]
 */
export async function faustNode(ctx, parts, voices = 8) {
  const { FaustPolyDspGenerator, FaustMonoDspGenerator } = await faustRuntime();
  if (parts.mono) return new FaustMonoDspGenerator().createNode(ctx, parts.name, parts.factory);
  return new FaustPolyDspGenerator().createNode(ctx, voices, parts.name,
    parts.voiceFactory, parts.mixerModule, parts.effectFactory);
}
