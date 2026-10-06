// demo/resources/build-faust-aot.mjs: Faust programs, compiled ahead of time.
//
//   node demo/resources/build-faust-aot.mjs          # compiles, writes demo/resources/faust/
//   node demo/resources/build-faust-aot.mjs --check  # compiles, compares, writes nothing
//
// 🔴 WHAT IT MAKES AND WHY. A Faust program compiled by the vendored libfaust
// in node and shipped as its compiled factory plays in a browser through
// `faustwasm.mjs` alone, with no compiler in the tab: 3.8 kB of instrument over
// brotli instead of 1 MB of libfaust (`plans/plan-live-slides.md` sections 1
// and 5). The page that loads it is `demo/shell/faust.mjs`'s `faustFactory()`.
// Per program, plus one mixer and one provenance record:
//
//   <id>.json          the voice and effect JSON, both `shaKey`s, and the file names
//   <id>.voice.wasm    one voice, which the runtime replicates
//   <id>.effect.wasm   the effect after the mixer, only when the program declares one
//   mixer32.wasm       libfaust's own voice mixer, the same for every instrument
//   PROVENANCE.json    what each was compiled from, by what, with what flags
//
// 🔴 A LIST OF PROGRAMS SINCE 2026-10-06, NOT THE ONE ORGAN. `PROGRAMS` below is
// the Organ from `demo/fau/presets.mjs` and every step of the `synths` deck
// from `demo/shell/synth-steps.mjs`, each named by the file and id it is read
// from. A program with no `effect` line has no effect file and its JSON says
// `effect: null`, which `factoryFromParts()` already takes.
// ⚠️ ONE MIXER FOR ALL OF THEM, AND THAT IS CHECKED RATHER THAN ASSUMED. Every
// program here is two channels out, so libfaust writes the same 502 bytes for
// each; a compile whose mixer differs from the first one's is refused, because
// a shared file that is right for one instrument and wrong for another would
// play quietly wrong.
//
// 🔴 ONE SOURCE. Every program is read from the module its page or deck
// imports, so the text compiled here is the text the page shows. Edit one and
// `workers/view/build.mjs` refuses to build until this script has been run
// again, because a stale artefact is silent in the worst direction: the slide
// would play last week's program and every number on it would still agree
// with itself. That is `checkCompiledDefs()`'s failure mode for `/grains/`,
// and `checkFaustAot()` is its twin.
//
// 🔴 `--check` RE-COMPILES AND GRADES TWO THINGS, AND IT IS THE STRONGER CHECK.
// The build only compares md5s, because it must not boot a compiler. Here:
//   1. the bytes a fresh compile produces are the bytes on disk, file by file;
//   2. each program rendered offline from the files ON DISK, rebuilt through
//      the same `factoryFromParts()` a page uses, has the same RMS as that
//      program rendered from a live compile of the current source, and both
//      match the figure PROVENANCE.json recorded for it.
// ⚠️ THE RMS IS AN OFFLINE RENDER IN NODE, NOT THE BROWSER FIGURE. The planning
// probe read 0.029763811585458978 off an analyser window in headless Chrome,
// both paths alike; that is a realtime window whose position depends on when
// it was read. This one is `createOfflineProcessor` with one `keyOn` and a
// fixed number of samples, so it is exactly reproducible and needs no browser,
// no audio device and no harness run.

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
 * Every program this script compiles, as `{ id, source, code }`. `source` is
 * `<file>#<id>`, the key PROVENANCE.json and `checkFaustAot()` both use, and
 * the build resolves it by importing that file, so the two must name the same
 * export the same way: `PRESETS` in `demo/fau/presets.mjs`, `SYNTH_STEPS` in
 * `demo/shell/synth-steps.mjs`.
 */
const organ = PRESETS.find((p) => p.id === 'organ');
if (!organ) { console.error("no preset with id 'organ' in demo/fau/presets.mjs"); process.exit(1); }
const PROGRAMS = [
  { id: 'organ', source: 'demo/fau/presets.mjs#organ', code: organ.code },
  ...SYNTH_STEPS.map((s) => ({ id: s.id, source: `demo/shell/synth-steps.mjs#${s.id}`, code: s.code })),
];
{
  const ids = PROGRAMS.map((p) => p.id);
  const twice = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (twice.length) { console.error(`two programs share an id, so they would share files: ${twice.join(', ')}`); process.exit(1); }
}

const md5 = (b) => createHash('md5').update(b).digest('hex');

// ── the compiler, booted in node the way demo/shell/code-lang-test.mjs does ──
const { instantiateFaustModuleFromFile, LibFaust, FaustCompiler, FaustPolyDspGenerator }
  = await import('../fau/vendor/faustwasm.mjs');
/* ⚠️ THE GLUE IS COPIED OUT OF THE REPOSITORY FIRST, because it is CommonJS
   shaped and the repository's own `package.json` scope would have node read it
   as a module. `code-lang-test.mjs` does the same for the same reason. */
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
 * Compile one program polyphonically.
 * ⚠️ A PROGRAM WITH NO `effect` LINE PRINTS ONE `Aborted(...)` LINE, and that
 * is the expected absence rather than a failure: the poly generator tries to
 * compile the effect, libfaust aborts on a name that is not there, and the
 * generator carries on with no effect. It cannot be held back here, because
 * the glue bound `console.error` once when it was evaluated (`faust.mjs`
 * says why), so four of the six programs print it. A real failure is the
 * `did not compile` line below, with the compiler's own message.
 */
async function compileOne(p) {
  const gen = new FaustPolyDspGenerator();
  if (!await gen.compile(compiler, p.id, p.code, FAUST_FLAGS)) {
    console.error(`${p.source} did not compile: ${compiler.getErrorMessage()}`);
    process.exit(1);
  }
  return gen;
}

/** RMS of channel 0 over the fixed render, from any parts `createNode` would take. */
async function rmsOf(parts, { key = true } = {}) {
  const proc = await new FaustPolyDspGenerator().createOfflineProcessor(RENDER.sampleRate, RENDER.block,
    RENDER.voices, parts.voiceFactory, parts.mixerModule, parts.effectFactory);
  if (key) proc.keyOn(0, RENDER.note, RENDER.velocity);
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
  }
  mkdirSync(OUT, { recursive: true });
  for (const [f, b] of Object.entries(all)) writeFileSync(join(OUT, f), b);
  const prov = {
    what: 'Faust programs compiled ahead of time, so a page can play them with faustwasm.mjs alone and no compiler in the tab: the Organ from /fau/ and every step of the synths deck on the front page.',
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
      how: 'createOfflineProcessor in node, one keyOn, channel 0. The ahead of time files and a live compile of the same source both gave each value, to every digit.',
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
    /* NEGATIVE: the instrument the RMS cannot see past. With no key down the
       same render must be silent, or the comparison above would pass two
       instruments that both render the same nothing. */
    const none = await rmsOf(b.gen, { key: false });
    ok(`${id}: NEGATIVE, with no key down the same render is silent, so the RMS is measuring a note`,
      none === 0 && b.live > 0.001, `no key ${none}, a key ${b.live}`);
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
