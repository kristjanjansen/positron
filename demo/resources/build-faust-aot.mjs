// demo/resources/build-faust-aot.mjs: the Organ, compiled ahead of time.
//
//   node demo/resources/build-faust-aot.mjs          # compiles, writes demo/resources/faust/
//   node demo/resources/build-faust-aot.mjs --check  # compiles, compares, writes nothing
//
// 🔴 WHAT IT MAKES AND WHY. A Faust program compiled by the vendored libfaust
// in node and shipped as its compiled factory plays in a browser through
// `faustwasm.mjs` alone, with no compiler in the tab: 3.8 kB of instrument over
// brotli instead of 1 MB of libfaust (`plans/plan-live-slides.md` sections 1
// and 5). The page that loads it is `demo/shell/faust.mjs`'s `faustFactory()`.
// Four files, plus a provenance record:
//
//   organ.json         the voice and effect JSON, both `shaKey`s, and the file names
//   organ.voice.wasm   one voice, which the runtime replicates
//   organ.effect.wasm  the effect after the mixer, `_, _` for the Organ
//   mixer32.wasm       libfaust's own voice mixer, the same for every instrument
//   PROVENANCE.json    what it was compiled from, by what, with what flags
//
// 🔴 ONE SOURCE. The Organ is read from `demo/fau/presets.mjs`, which `/fau/`
// imports, so the text compiled here is the text that page shows. Edit the
// Organ there and `workers/view/build.mjs` refuses to build until this script
// has been run again, because a stale artefact is silent in the worst
// direction: the slide would play last week's Organ and every number on it
// would still agree with itself. That is `checkCompiledDefs()`'s failure mode
// for `/grains/`, and `checkFaustAot()` is its twin.
//
// 🔴 `--check` RE-COMPILES AND GRADES TWO THINGS, AND IT IS THE STRONGER CHECK.
// The build only compares md5s, because it must not boot a compiler. Here:
//   1. the bytes a fresh compile produces are the bytes on disk, file by file;
//   2. the Organ rendered offline from the files ON DISK, rebuilt through the
//      same `factoryFromParts()` a page uses, has the same RMS as the Organ
//      rendered from a live compile of the current source, and both match the
//      figure PROVENANCE.json recorded.
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
import { FAUST_FLAGS, factoryFromParts } from '../shell/faust.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const OUT = join(HERE, 'faust');
const V = join(REPO, 'demo/fau/vendor');
const CHECK = process.argv.includes('--check');

/** The compiler files a different libfaust would change. Recorded by md5 so the build can tell without booting it. */
const COMPILER_FILES = ['demo/fau/vendor/libfaust-wasm.wasm', 'demo/fau/vendor/libfaust-wasm.data.txt',
  'demo/fau/vendor/libfaust-wasm.js', 'demo/fau/vendor/faustwasm.mjs'];
const NAME = 'organ';
/** The render the RMS is taken over: middle C at velocity 100, half a second, 8 voices, 48 kHz. */
const RENDER = { sampleRate: 48000, block: 128, voices: 8, note: 60, velocity: 100, samples: 24000 };

const md5 = (b) => createHash('md5').update(b).digest('hex');
const organ = PRESETS.find((p) => p.id === NAME);
if (!organ) { console.error(`no preset with id '${NAME}' in demo/fau/presets.mjs`); process.exit(1); }

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

const gen = new FaustPolyDspGenerator();
if (!await gen.compile(compiler, NAME, organ.code, FAUST_FLAGS)) {
  console.error(`the Organ did not compile: ${compiler.getErrorMessage()}`);
  process.exit(1);
}
const files = {
  [`${NAME}.voice.wasm`]: Buffer.from(gen.voiceFactory.code),
  [`${NAME}.effect.wasm`]: Buffer.from(gen.effectFactory.code),
  'mixer32.wasm': Buffer.from(gen.mixerBuffer),
};
const meta = {
  name: NAME,
  files: { voice: `${NAME}.voice.wasm`, effect: `${NAME}.effect.wasm`, mixer: 'mixer32.wasm' },
  voiceSha: gen.voiceFactory.shaKey,
  effectSha: gen.effectFactory.shaKey,
  voice: gen.voiceFactory.json,
  effect: gen.effectFactory.json,
};
files[`${NAME}.json`] = Buffer.from(JSON.stringify(meta) + '\n');

/** RMS of channel 0 over the fixed render, from any parts `createNode` would take. */
async function rmsOf(parts) {
  const p = await new FaustPolyDspGenerator().createOfflineProcessor(RENDER.sampleRate, RENDER.block,
    RENDER.voices, parts.voiceFactory, parts.mixerModule, parts.effectFactory);
  p.keyOn(0, RENDER.note, RENDER.velocity);
  const [left] = p.render([], RENDER.samples);
  let s = 0;
  for (const v of left) s += v * v;
  return Math.sqrt(s / left.length);
}
const fromBytes = (f) => factoryFromParts({
  meta: JSON.parse(f[`${NAME}.json`].toString('utf8')),
  voice: f[`${NAME}.voice.wasm`], effect: f[`${NAME}.effect.wasm`], mixer: f['mixer32.wasm'],
});
const live = await rmsOf(gen);

if (!CHECK) {
  const aot = await rmsOf(await fromBytes(files));
  if (aot !== live) { console.error(`REFUSED: ahead of time RMS ${aot} is not the live ${live}`); process.exit(1); }
  if (!(live > 0.001)) { console.error(`REFUSED: the Organ rendered silent, RMS ${live}`); process.exit(1); }
  mkdirSync(OUT, { recursive: true });
  for (const [f, b] of Object.entries(files)) writeFileSync(join(OUT, f), b);
  const prov = {
    what: 'The Organ preset from /fau/, compiled ahead of time so a page can play it with faustwasm.mjs alone and no compiler in the tab.',
    howToRemake: 'node demo/resources/build-faust-aot.mjs (and --check to compare without writing)',
    compiledOn: new Date().toISOString().slice(0, 10),
    compiler: {
      version: compiler.version(),
      files: Object.fromEntries(COMPILER_FILES.map((r) => [r, md5(readFileSync(join(REPO, r)))])),
    },
    flags: FAUST_FLAGS,
    sources: { [`demo/fau/presets.mjs#${NAME}`]: md5(organ.code) },
    artefacts: Object.fromEntries(Object.entries(files).map(([f, b]) => [f, { md5: md5(b), bytes: b.length }])),
    rms: {
      value: live,
      render: RENDER,
      how: 'createOfflineProcessor in node, one keyOn, channel 0. The ahead of time files and a live compile of the same source both gave this, to every digit.',
    },
    guard: 'workers/view/build.mjs (checkFaustAot) REFUSES the build when the source, the compiler files, the flags or any artefact disagrees with this record.',
  };
  writeFileSync(join(OUT, 'PROVENANCE.json'), JSON.stringify(prov, null, 2) + '\n');
  console.log(`wrote ${Object.keys(files).length} files and PROVENANCE.json to demo/resources/faust/`);
  for (const [f, b] of Object.entries(files)) console.log(`  ${f.padEnd(20)} ${String(b.length).padStart(6)} B  ${md5(b)}`);
  console.log(`  Faust ${compiler.version()}, flags ${FAUST_FLAGS}, Organ source md5 ${md5(organ.code)}`);
  console.log(`  RMS ${live} from the files and from a live compile, the same to every digit`);
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
const disk = {};
for (const f of Object.keys(files)) {
  const p = join(OUT, f);
  disk[f] = existsSync(p) ? readFileSync(p) : null;
  ok(`${f} is what a fresh compile makes, byte for byte`, !!disk[f] && disk[f].equals(files[f]),
    disk[f] ? `${disk[f].length} B on disk, ${files[f].length} B compiled` : 'not on disk');
}
if (Object.values(disk).every(Boolean)) {
  const aot = await rmsOf(await fromBytes(disk));
  ok('the files on disk sound like a live compile of the source, same RMS', aot === live,
    `ahead of time ${aot}, live ${live}`);
  ok('and like the figure PROVENANCE.json recorded', prov?.rms?.value === aot, `recorded ${prov?.rms?.value}`);
  /* NEGATIVE: the instrument the RMS cannot see past. A different note must
     give a different RMS, or the comparison above would pass two instruments
     that both render the same nothing. */
  const other = await (async () => {
    const p = await new FaustPolyDspGenerator().createOfflineProcessor(RENDER.sampleRate, RENDER.block,
      RENDER.voices, gen.voiceFactory, gen.mixerModule, gen.effectFactory);
    const [l] = p.render([], RENDER.samples);
    let s = 0; for (const v of l) s += v * v; return Math.sqrt(s / l.length);
  })();
  ok('NEGATIVE: with no key down the same render is silent, so the RMS is measuring a note', other === 0 && live > 0.001,
    `no key ${other}, a key ${live}`);
}
ok('the source is the one recorded', prov?.sources?.[`demo/fau/presets.mjs#${NAME}`] === md5(organ.code));
ok('the compiler is the one recorded', prov?.compiler?.version === compiler.version(),
  `${compiler.version()}, recorded ${prov?.compiler?.version}`);
ok('the flags are the ones recorded', prov?.flags === FAUST_FLAGS, FAUST_FLAGS);
console.log(`\n${pass} ok, ${fail} failed${fail ? '. Remake with: node demo/resources/build-faust-aot.mjs' : ''}`);
process.exit(fail ? 1 : 0);
