// workers/view/preview.mjs — build and upload a VERSION, without deploying it.
//
//   node workers/view/preview.mjs            alias from the current git branch
//   node workers/view/preview.mjs staging    alias given by hand
//
// 🔴 WHAT THIS IS FOR, AND IT IS NOT "being careful". It answers one question
// `deploy.mjs` cannot: *is what I am about to ship good, without shipping it
// over somebody else's tree*. With two or three agents in one checkout,
// `public/` is a shared mutable global and a deploy takes whatever is in
// `demo/` at that instant. A version upload puts the same bytes on a URL
// nobody's visitors are on, so the tree can be graded before production moves.
//
// ⚠️ IT DOES NOT TOUCH THE CUSTOM DOMAIN. `versions upload` publishes a version
// and does not point any route at it; `wrangler deploy` is still what moves
// positron.studio. That is the whole distinction and it is why this file exists
// beside `deploy.mjs` rather than as a flag on it.
//
// ⚠️ THE ALIAS IS SET AT UPLOAD AND CANNOT BE CHANGED AFTERWARDS. Cloudflare
// keeps the 1000 most recent versions.
//
// ⚠️ AND IT RUNS THE SAME BUILD AND THE SAME INTERLOCK AS A DEPLOY. A preview
// built from a different tree than the one that gets deployed is a preview that
// grades nothing, which is the failure `deploy.mjs`'s header is about.
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

// ⚠️ `.env` IN THE CWD SHADOWS MACHINE OAUTH (CLAUDE.md), and the documented
// fix is to unset the two variables rather than to require a directory.
const env = { ...process.env };
delete env.CF_API_TOKEN;
delete env.CLOUDFLARE_API_TOKEN;
const up = spawnSync('npx', ['wrangler', 'versions', 'upload', '--preview-alias', alias],
  { cwd: HERE, stdio: 'inherit', env });
if (up.status !== 0) process.exit(up.status ?? 1);
console.log(`\nuploaded as version alias "${alias}", stamp ${stamp}.`);
console.log('positron.studio is UNCHANGED. `node workers/view/deploy.mjs` is what moves it.');
