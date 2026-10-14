// Compiles each Faust program in PROGRAMS ahead of time into demo/resources/faust/ (voice,
// effect and shared mixer wasm, or one wasm for a mono program) for faustFactory(); the view
// build refuses stale output. --check recompiles and compares bytes and an offline RMS.
// See lessons/page-resources.md#resources-60

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { PRESETS } from '../fau/presets.mjs';
import { SYNTH_STEPS } from '../shell/synth-steps.mjs';
import { FAUST_FLAGS, factoryFromParts } from '../shell/faust.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const OUT = join(HERE, 'faust');
const V = join(REPO, 'demo/fau/vendor');
const CHECK = process.argv.includes('--check');

/** The compiler files a different libfaust would change. Recorded by md5 so the build can tell without booting it. */
const COMPILER_FILES = ['demo/fau/vendor/libfaust-wasm.wasm', 'demo/fau/vendor/libfaust-wasm.data.txt',
  'demo/fau/vendor/libfaust-wasm.js', 'demo/fau/vendor/faustwasm.mjs'];
/** The render each RMS is taken over: middle C at velocity 100, half a second, 8 voices, 48 kHz. */
const RENDER = { sampleRate: 48000, block: 128, voices: 8, note: 60, velocity: 100, samples: 24000 };
const MIXER = 'mixer32.wasm';

/**
 * Every program compiled, as `{ id, source, code }`; `source` is `<file>#<id>`, resolved
 * by importing `PRESETS` from demo/fau/presets.mjs or `SYNTH_STEPS` from synth-steps.mjs.
 * See lessons/page-resources.md#resources-61
 */
const organ = PRESETS.find((p) => p.id === 'organ');
if (!organ) { console.error("no preset with id 'organ' in demo/fau/presets.mjs"); process.exit(1); }
const PROGRAMS = [
  { id: 'organ', source: 'demo/fau/presets.mjs#organ', code: organ.code },
  ...SYNTH_STEPS.map((s) => ({ id: s.id, source: `demo/shell/synth-steps.mjs#${s.id}`, code: s.code, mono: !!s.mono })),
];
/**
 * An answer from arithmetic: `os.osc(440) * 0.5` has RMS 0.5 over root two, and 24000
 * samples at 48 kHz are 220 cycles. The mono programs' control instead of a silent key.
 * See lessons/page-resources.md#resources-62
 */
// `volume` and `pitch` default to the same 0.5 and 440, so they predict the same figure.
// See lessons/page-resources.md#resources-63
/** RMS of a band limited saw of amplitude 0.5 at `f` through a two pole Butterworth low pass at `fc()`. */
function harmonicRms(f, fc) {
  let s = 0;
  for (let n = 1; n * f < RENDER.sampleRate / 2; n++) s += (1 / (Math.PI * n)) ** 2 / 2 / (1 + (n * f / fc()) ** 4);
  return Math.sqrt(s);
}
const EXPECT = { sine: 0.5 / Math.SQRT2, volume: 0.5 / Math.SQRT2, pitch: 0.5 / Math.SQRT2,
  // a sawtooth of amplitude 0.5 is 0.5 over root three; os.sawtooth is band
  // limited (no harmonics past Nyquist, so no aliasing), which takes about
  // 1 per cent off: measured 0.28605 against 0.28868, hence its own tolerance
  saw: 0.5 / Math.sqrt(3),
  // slide 6's `wave` starts at 0, the sine, so the render, which picks
  // nothing, predicts the sine's figure
  wave: 0.5 / Math.SQRT2,
  // Filter and LFO from the harmonic series through a two pole Butterworth: 0.26637 at
  // fc 2000 (rendered 0.26628), LFO averaged 0.26275 (rendered 0.26266).
  // See lessons/page-resources.md#resources-64
  filter: harmonicRms(440, () => 2000),
  lfo: (() => { let s = 0; const N = 2000; for (let i = 0; i < N; i++) s += harmonicRms(440, () => 2000 * (1 + 0.5 * Math.sin(2 * Math.PI * i / N))) ** 2; return Math.sqrt(s / N); })() };
const TOL = { saw: 0.005 };
{
  const ids = PROGRAMS.map((p) => p.id);
  const twice = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (twice.length) { console.error(`two programs share an id, so they would share files: ${twice.join(', ')}`); process.exit(1); }
}

const md5 = (b) => createHash('md5').update(b).digest('hex');

// ── the compiler, booted in node the way demo/shell/code-lang-test.mjs does ──
const { instantiateFaustModuleFromFile, LibFaust, FaustCompiler, FaustPolyDspGenerator, FaustMonoDspGenerator }
  = await import('../fau/vendor/faustwasm.mjs');
/* The glue is copied out of the repository first: it is CommonJS and package.json would
   make node read it as a module.
   See lessons/page-resources.md#resources-65 */
const tmp = mkdtempSync(join(tmpdir(), 'faust-aot-'));
let compiler;
try {
  copyFileSync(join(V, 'libfaust-wasm.js'), join(tmp, 'libfaust-wasm.js'));
  const mod = await instantiateFaustModuleFromFile(join(tmp, 'libfaust-wasm.js'),
    join(V, 'libfaust-wasm.data.txt'), join(V, 'libfaust-wasm.wasm'));
  compiler = new FaustCompiler(new LibFaust(mod));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

/**
 * Compile one program polyphonically. A program with no `effect` line prints one expected
 * `Aborted(...)` line that cannot be silenced; a real failure is `did not compile` below.
 * See lessons/page-resources.md#resources-66
 */
async function compileOne(p) {
  const gen = p.mono ? new FaustMonoDspGenerator() : new FaustPolyDspGenerator();
  if (!await gen.compile(compiler, p.id, p.code, FAUST_FLAGS)) {
    console.error(`${p.source} did not compile: ${compiler.getErrorMessage()}`);
    process.exit(1);
  }
  return gen;
}

/** RMS of channel 0 over the fixed render, from any parts `createNode` would take. A mono program has no key. */
async function rmsOf(parts, { key = true } = {}) {
  const mono = !!(parts.mono || (parts.factory && !parts.voiceFactory));
  const proc = mono
    ? await new FaustMonoDspGenerator().createOfflineProcessor(RENDER.sampleRate, RENDER.block, parts.factory)
    : await new FaustPolyDspGenerator().createOfflineProcessor(RENDER.sampleRate, RENDER.block,
      RENDER.voices, parts.voiceFactory, parts.mixerModule, parts.effectFactory);
  if (key && !mono) proc.keyOn(0, RENDER.note, RENDER.velocity);
  const [left] = proc.render([], RENDER.samples);
  let s = 0;
  for (const v of left) s += v * v;
  return Math.sqrt(s / left.length);
}

/** One program's files, as `{ name: Buffer }`, and its compiled generator. */
const built = [];
let mixer = null;
for (const p of PROGRAMS) {
  const gen = await compileOne(p);
  if (p.mono) {
    const meta = { name: p.id, mono: true, files: { dsp: `${p.id}.wasm` }, dspSha: gen.factory.shaKey, dsp: gen.factory.json };
    const files = { [`${p.id}.wasm`]: Buffer.from(gen.factory.code), [`${p.id}.json`]: Buffer.from(JSON.stringify(meta) + '\n') };
    built.push({ p, gen, files, live: await rmsOf({ mono: true, factory: gen.factory }) });
    continue;
  }
  const mix = Buffer.from(gen.mixerBuffer);
  if (!mixer) mixer = mix;
  else if (!mixer.equals(mix)) {
    console.error(`REFUSED: ${p.source} compiled a different ${MIXER} from ${PROGRAMS[0].source}, so one shared file would be wrong for one of them`);
    process.exit(1);
  }
  const files = { [`${p.id}.voice.wasm`]: Buffer.from(gen.voiceFactory.code) };
  if (gen.effectFactory) files[`${p.id}.effect.wasm`] = Buffer.from(gen.effectFactory.code);
  const meta = {
    name: p.id,
    files: { voice: `${p.id}.voice.wasm`, effect: gen.effectFactory ? `${p.id}.effect.wasm` : null, mixer: MIXER },
    voiceSha: gen.voiceFactory.shaKey,
    effectSha: gen.effectFactory ? gen.effectFactory.shaKey : null,
    voice: gen.voiceFactory.json,
    effect: gen.effectFactory ? gen.effectFactory.json : null,
  };
  files[`${p.id}.json`] = Buffer.from(JSON.stringify(meta) + '\n');
  built.push({ p, gen, files, live: await rmsOf(gen) });
}

/** A program's parts rebuilt from a set of files, the way a page rebuilds them. */
const fromFiles = (id, f) => {
  const meta = JSON.parse(f[`${id}.json`].toString('utf8'));
  if (meta.mono) return factoryFromParts({ meta, dsp: f[meta.files.dsp] });
  return factoryFromParts({
    meta, voice: f[meta.files.voice], effect: meta.files.effect ? f[meta.files.effect] : null, mixer: f[MIXER],
  });
};

if (!CHECK) {
  const all = { [MIXER]: mixer };
  for (const b of built) {
    Object.assign(all, b.files);
    const aot = await rmsOf(await fromFiles(b.p.id, { ...b.files, [MIXER]: mixer }));
    if (aot !== b.live) { console.error(`REFUSED: ${b.p.id} ahead of time RMS ${aot} is not the live ${b.live}`); process.exit(1); }
    if (!(b.live > 0.001)) { console.error(`REFUSED: ${b.p.id} rendered silent, RMS ${b.live}`); process.exit(1); }
    if (b.p.id in EXPECT && Math.abs(b.live - EXPECT[b.p.id]) > (TOL[b.p.id] ?? 1e-3)) { console.error(`REFUSED: ${b.p.id} RMS ${b.live}, its arithmetic says ${EXPECT[b.p.id]}`); process.exit(1); }
  }
  mkdirSync(OUT, { recursive: true });
  for (const [f, b] of Object.entries(all)) writeFileSync(join(OUT, f), b);
  const prov = {
    what: 'Faust programs compiled ahead of time, so a page can play them with faustwasm.mjs alone and no compiler in the tab: the Organ from /fau/ and the five mono programs of the synths deck on the front page, a sine, the same sine with its volume on a slider, that with its pitch on a slider too, the same with a sawtooth, and the same with a choice of sine or saw.',
    howToRemake: 'node demo/resources/build-faust-aot.mjs (and --check to compare without writing)',
    compiledOn: new Date().toISOString().slice(0, 10),
    compiler: {
      version: compiler.version(),
      files: Object.fromEntries(COMPILER_FILES.map((r) => [r, md5(readFileSync(join(REPO, r)))])),
    },
    flags: FAUST_FLAGS,
    sources: Object.fromEntries(built.map((b) => [b.p.source, md5(b.p.code)])),
    artefacts: Object.fromEntries(Object.entries(all).map(([f, b]) => [f, { md5: md5(b), bytes: b.length }])),
    rms: {
      values: Object.fromEntries(built.map((b) => [b.p.id, b.live])),
      render: RENDER,
      how: 'createOfflineProcessor in node, one keyOn for a polyphonic program and none for a mono one, channel 0. The ahead of time files and a live compile of the same source both gave each value, to every digit.',
    },
    guard: 'workers/view/build.mjs (checkFaustAot) REFUSES the build when a source, the compiler files, the flags or any artefact disagrees with this record.',
  };
  writeFileSync(join(OUT, 'PROVENANCE.json'), JSON.stringify(prov, null, 2) + '\n');
  console.log(`wrote ${Object.keys(all).length} files and PROVENANCE.json to demo/resources/faust/, Faust ${compiler.version()}, flags ${FAUST_FLAGS}`);
  for (const [f, b] of Object.entries(all)) console.log(`  ${f.padEnd(20)} ${String(b.length).padStart(6)} B  ${md5(b)}`);
  for (const b of built) console.log(`  ${b.p.id.padEnd(8)} RMS ${b.live} from the files and from a live compile, source md5 ${md5(b.p.code)}`);
  process.exit(0);
}

// ── --check: nothing is written ───────────────────────────────────────────────
let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? '  ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? '  ' + detail : ''}`); }
};
const prov = existsSync(join(OUT, 'PROVENANCE.json'))
  ? JSON.parse(readFileSync(join(OUT, 'PROVENANCE.json'), 'utf8')) : null;
ok('PROVENANCE.json is there', !!prov);
const read = (f) => (existsSync(join(OUT, f)) ? readFileSync(join(OUT, f)) : null);
const diskMixer = read(MIXER);
ok(`${MIXER} is what a fresh compile makes, byte for byte`, !!diskMixer && diskMixer.equals(mixer),
  diskMixer ? `${diskMixer.length} B on disk, ${mixer.length} B compiled` : 'not on disk');
for (const b of built) {
  const { id } = b.p;
  const disk = { [MIXER]: diskMixer };
  for (const f of Object.keys(b.files)) {
    disk[f] = read(f);
    ok(`${f} is what a fresh compile makes, byte for byte`, !!disk[f] && disk[f].equals(b.files[f]),
      disk[f] ? `${disk[f].length} B on disk, ${b.files[f].length} B compiled` : 'not on disk');
  }
  if (Object.values(disk).every(Boolean)) {
    const aot = await rmsOf(await fromFiles(id, disk));
    ok(`${id}: the files on disk sound like a live compile of the source, same RMS`, aot === b.live,
      `ahead of time ${aot}, live ${b.live}`);
    ok(`${id}: and like the figure PROVENANCE.json recorded`, prov?.rms?.values?.[id] === aot, `recorded ${prov?.rms?.values?.[id]}`);
    if (b.p.mono) {
      /* NEGATIVE, FROM ARITHMETIC: see EXPECT. A program that rendered the
         wrong thing loudly enough would pass both comparisons above. */
      ok(`${id}: NEGATIVE, the RMS is the one its arithmetic predicts, not just the same on both paths`,
        Math.abs(aot - EXPECT[id]) < (TOL[id] ?? 1e-3), `rendered ${aot}, predicted ${EXPECT[id]}`);
    } else {
      /* NEGATIVE: the instrument the RMS cannot see past. With no key down the
         same render must be silent, or the comparison above would pass two
         instruments that both render the same nothing. */
      const none = await rmsOf(b.gen, { key: false });
      ok(`${id}: NEGATIVE, with no key down the same render is silent, so the RMS is measuring a note`,
        none === 0 && b.live > 0.001, `no key ${none}, a key ${b.live}`);
    }
  }
  ok(`${id}: the source is the one recorded`, prov?.sources?.[b.p.source] === md5(b.p.code), b.p.source);
}
{
  /* NEGATIVE: a record that names a program this script no longer compiles,
     or misses one it does, is stale in a way no md5 above can see. */
  const want = built.map((b) => b.p.source).sort().join(' ');
  const have = Object.keys(prov?.sources || {}).sort().join(' ');
  ok('PROVENANCE.json names exactly the programs this script compiles', want === have, have === want ? `${built.length}` : `recorded ${have}`);
}
ok('the compiler is the one recorded', prov?.compiler?.version === compiler.version(),
  `${compiler.version()}, recorded ${prov?.compiler?.version}`);
ok('the flags are the ones recorded', prov?.flags === FAUST_FLAGS, FAUST_FLAGS);
console.log(`\n${pass} ok, ${fail} failed${fail ? '. Remake with: node demo/resources/build-faust-aot.mjs' : ''}`);
process.exit(fail ? 1 : 0);
