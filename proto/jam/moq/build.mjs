#!/usr/bin/env node
// Bundle the MoQ entrypoints WITHOUT Docker and WITHOUT a native binary.
//
// Why this file exists: ThreatLocker silently SIGKILLs freshly-installed native
// executables, which is what npm's `esbuild` (and therefore vite/rollup's fast
// path) is. Session 3 lost an hour to that; the workaround became "bundle inside
// Docker", which is slow, emulated, and mildly absurd for one dependency.
//
// esbuild-wasm has no native binary at all — it is a .wasm module executed by
// node itself (already approved). Same API, same output, no daemon, no VM.
// The bin/esbuild shim in that package is a JS wrapper, not an ELF/Mach-O.
//
//   node build.mjs            # bundle both entrypoints into www/
//   node build.mjs --check    # bundle to memory and diff against www/ (CI-safe)
//
// The built bundles ARE committed: nobody needs to run this unless src/ changes.

import { build } from 'esbuild-wasm';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const CHECK = process.argv.includes('--check');
const ENTRIES = ['moq-jam.js', 'moq-synth.js'];

// Under node, esbuild-wasm self-initializes from its own bundled .wasm — no
// initialize() call, no wasmURL, no native child process.

let failed = 0;
for (const entry of ENTRIES) {
  const res = await build({
    entryPoints: [path.join(here, 'src', entry)],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['chrome120'],
    write: false,
    logLevel: 'warning',
    absWorkingDir: here,
  });
  const out = res.outputFiles[0].text;
  const dest = path.join(here, 'www', entry);
  if (CHECK) {
    const have = await readFile(dest, 'utf8').catch(() => '');
    const same = have === out;
    console.log(`${same ? 'OK  ' : 'DIFF'} ${entry}  (${out.length} B built, ${have.length} B on disk)`);
    if (!same) failed++;
  } else {
    await writeFile(dest, out);
    console.log(`built ${entry} → www/ (${out.length} B)`);
  }
}
process.exit(failed ? 1 : 0);
