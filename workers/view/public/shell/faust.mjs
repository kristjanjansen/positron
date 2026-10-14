// demo/shell/faust.mjs: the Faust engine, loaded once per page by whoever asks first. Exports
// faustRuntime (216,533 B), faustCompiler (6,162,473 B), hasCompiler, faustFactory, faustCompile, faustNode
// (mono for a program with no voice). Nothing on import; loaders memoised, a failed load clears its memo.
// why: lessons/kit-faust.md#header

/**
 * The vendored files, each a whole quoted path: workers/view/build.mjs refuses the build when a vendor
 * path in this file, comments included, has nothing deployed behind it. Never write one in prose.
 * The `.data` file is 53 Faust `.lib` sources, 2,406,429 bytes.
 * why: lessons/kit-faust.md#faust-vendor
 */
export const FAUST_VENDOR = {
  js: '/fau/vendor/libfaust-wasm.js',
  /**
   * `.txt`, so Cloudflare serves it brotli: as `.data` it went out raw at 2,407,445 bytes.
   * It is 99.95 per cent printable; the compiler's internal name does not move with it.
   * why: lessons/kit-faust.md#data-txt
   */
  data: '/fau/vendor/libfaust-wasm.data.txt',
  wasm: '/fau/vendor/libfaust-wasm.wasm',
  mjs: '/fau/vendor/faustwasm.mjs',
};

/**
 * `-ftz 2`, passed explicitly; the page, the ahead of time build and its stale check read this string.
 * why: lessons/kit-faust.md#faust-flags
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
 * Where a captured `console.error` goes: libfaust aborts print there and the glue binds it once, at
 * evaluation, so a forwarder is installed only for that await. Without a sink, lines reach the console.
 * why: lessons/kit-faust.md#sink
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
 * Compile `code` live as a polyphonic instrument; returns the generator `faustNode` takes.
 * It awaits inside the sink, since the abort arrives inside the await.
 * @param {string} name the factory's name. libfaust caches by name and code, so a caller timing a compile passes a fresh one
 * @param {string} code Faust source declaring `freq`, `gain` and `gate`
 * @param {{flags?: string, onAbort?: (line: string) => void, mono?: boolean}} [opt] where the compiler's abort lines go (without one they reach the console), and `mono` for a program with no voice to start
 * @returns {Promise<any>} a `FaustPolyDspGenerator`, compiled, or for `mono` the `{ name, mono: true, factory }` `faustNode` takes; throws with the compiler's message
 * why: lessons/kit-faust.md#faustcompile
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
 * Rebuild `createNode`'s three parts from an ahead of time instrument; pure apart from
 * `WebAssembly.compile`, so build-faust-aot.mjs --check runs it in node. A `mono` meta names one `dsp`.
 * @param {{meta: any, voice?: ArrayBuffer|Uint8Array, effect?: ArrayBuffer|Uint8Array|null, mixer?: ArrayBuffer|Uint8Array, dsp?: ArrayBuffer|Uint8Array}} p
 * why: lessons/kit-faust.md#factoryfromparts
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
 * One ahead of time instrument, fetched once per URL; needs no compiler (3.8 kB against 1 MB).
 * @param {string} url the instrument's `.json`
 * why: lessons/kit-faust.md#faustfactory
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
