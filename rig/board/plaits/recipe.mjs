// rig/board/plaits/recipe.mjs: what rig/board/plaits/build.sh compiles, read off the provenance of
// the shipped plaits.wasm, so the board builds the same pins, sources and shim the browser plays.
//   node recipe.mjs --shell   prints shell assignments build.sh evals; nothing is fetched or built
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = new URL('.', import.meta.url);
export const PROVENANCE = fileURLToPath(new URL('../../../demo/muta/vendor/PROVENANCE-plaits.json', HERE));
export const SHIM = fileURLToPath(new URL('../../../demo/muta/build/plaits_shim.cc', HERE));
export const HOST = fileURLToPath(new URL('./posplaits.cc', HERE));

/** build.sh's flags plus -ffp-contract=off (plans/plan-plaits-on-pi.md §1.A); the defines stay in the digest. */
export const CXXFLAGS = ['-std=c++11', '-O3', '-fno-exceptions', '-fno-rtti', '-ffp-contract=off'];

const sha256 = (b) => createHash('sha256').update(b).digest('hex');

// demo/muta/build/build.sh's digest. Its `sort` collates by locale, and the shipped digest matches
// ICU's collation (string_voice.cc before string.cc), not byte order; a byte sort gives another digest.
export function sourceDigest({ name = 'plaits', euro, stmlib, shimSha, defines, sources }) {
  const list = [...sources].sort(new Intl.Collator('en').compare).join('\n');
  return sha256(`${name}=${euro}\nstmlib=${stmlib}\nshim=${shimSha}\ndefines=${defines}\nsources=\n${list}\n`).slice(0, 16);
}

/** Everything the build needs, from the provenance and the shim on disk. Throws on a provenance it cannot read. */
export function recipe({ provenance = JSON.parse(readFileSync(PROVENANCE, 'utf8')), shim = readFileSync(SHIM) } = {}) {
  const p = provenance;
  const euro = p.upstream?.eurorack, stm = p.upstream?.stmlib;
  if (!euro?.commit || !stm?.commit || !Array.isArray(p.sources) || !p.sources.length) throw new Error('PROVENANCE-plaits.json has no pins or no source list');
  const bad = p.sources.find((s) => !/^(plaits|stmlib)\/[a-z0-9_/]+\.cc$/.test(s));
  if (bad) throw new Error(`a source path this build will not pass to a shell: ${bad}`);
  const shimSha = sha256(shim);
  const defines = String(p.defines ?? '').trim();
  if (!/^(-D[A-Z0-9_]+)( -D[A-Z0-9_]+)*$/.test(defines)) throw new Error(`defines read as ${JSON.stringify(defines)}`);
  const digest = sourceDigest({ euro: euro.commit, stmlib: stm.commit, shimSha, defines, sources: p.sources });
  return {
    euroRepo: euro.repo, euroSha: euro.commit, stmlibRepo: stm.repo, stmlibSha: stm.commit,
    sources: [...p.sources], defines: defines.split(' '), shimSha, digest,
    wasmDigest: p.sourceSha ?? null, wasmShimSha: p.shim?.sha256 ?? null,
    same: digest === p.sourceSha,
  };
}

/** The shell assignments build.sh evals. Every value is single quoted and checked above, so none can break out. */
export function shellVars(r) {
  const q = (v) => `'${String(v).replace(/'/g, '')}'`;
  return [
    `EURO_REPO=${q(r.euroRepo)}`, `EURO_SHA=${q(r.euroSha)}`, `STMLIB_REPO=${q(r.stmlibRepo)}`, `STMLIB_SHA=${q(r.stmlibSha)}`,
    `SOURCES=(${r.sources.map(q).join(' ')})`, `DEFINES=(${r.defines.map(q).join(' ')})`, `CXXFLAGS=(${CXXFLAGS.map(q).join(' ')})`,
    `SOURCE_SHA=${q(r.digest)}`, `WASM_SOURCE_SHA=${q(r.wasmDigest ?? '')}`, `SAME=${r.same ? 1 : 0}`,
  ].join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] && process.argv.includes('--shell')) {
  try { console.log(shellVars(recipe())); }
  catch (e) { console.error(e.message); process.exit(1); }
}
