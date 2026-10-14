// node workers/view/preview.mjs [alias]: build and upload a version without moving positron.studio,
// so a tree can be graded first. Same build and interlock as a deploy; the alias is set at upload
// and cannot change, and Cloudflare keeps the 1000 most recent versions.
// why: lessons/workers-view.md#preview
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprint, drift } from './deploy.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(HERE, 'public');
const REPO = join(HERE, '..', '..');

/** A Cloudflare preview alias: lowercase, letters digits and dashes only. */
function aliasFrom(name) {
  const a = String(name).toLowerCase().replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 40);
  return a || 'preview';
}

const given = process.argv[2];
const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'],
  { cwd: REPO, encoding: 'utf8' }).stdout?.trim() || '';
const alias = aliasFrom(given || branch);

// Say what is going out uncommitted, for the same reason `deploy.mjs` does: the
// harm was never the shipping, it was the other agent not knowing.
const gitLines = (args) => {
  const r = spawnSync('git', args, { cwd: REPO, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split('\n').filter(Boolean) : [];
};
const SHIPPED_FROM = /^(demo|proto|timeline)\//;
const dirty = [...gitLines(['diff', '--name-only']),
  ...gitLines(['diff', '--cached', '--name-only']),
  ...gitLines(['ls-files', '--others', '--exclude-standard'])]
  .filter((f) => SHIPPED_FROM.test(f)).filter((f, i, a) => a.indexOf(f) === i).sort();
console.log(dirty.length
  ? `\n⚠️  ${dirty.length} uncommitted file(s) in this preview:\n     ${dirty.join('\n     ')}`
  : '\nworking tree clean of build inputs.');

const build = spawnSync(process.execPath, [join(HERE, 'build.mjs')], { stdio: 'inherit' });
if (build.status !== 0) {
  console.error('\nPREVIEW REFUSED — the build did not pass. Nothing was uploaded.');
  process.exit(1);
}
const shell = await readFile(join(PUBLIC, 'shell', 'shell.mjs'), 'utf8');
const stamp = (shell.match(/export const BUILD = '([^']+)'/) || [])[1];
if (!stamp || stamp === 'dev') {
  console.error(`\nPREVIEW REFUSED — public/shell/shell.mjs carries BUILD '${stamp}'.`);
  process.exit(1);
}
const built = await fingerprint(PUBLIC);
const moved = drift(built, await fingerprint(PUBLIC));
if (moved.length) {
  console.error('\nPREVIEW REFUSED — public/ changed between the build and the upload.');
  process.exit(1);
}
console.log(`\nfingerprinted ${built.size} files · stamp ${stamp} · alias ${alias}`);

// Unset the two token variables: a `.env` in the cwd shadows machine OAuth.
// why: lessons/workers-view.md#env
const env = { ...process.env };
delete env.CF_API_TOKEN;
delete env.CLOUDFLARE_API_TOKEN;
const up = spawnSync('npx', ['wrangler', 'versions', 'upload', '--preview-alias', alias],
  { cwd: HERE, stdio: 'inherit', env });
if (up.status !== 0) process.exit(up.status ?? 1);
console.log(`\nuploaded as version alias "${alias}", stamp ${stamp}.`);
console.log('positron.studio is UNCHANGED. `node workers/view/deploy.mjs` is what moves it.');
