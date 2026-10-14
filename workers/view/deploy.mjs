// node workers/view/deploy.mjs [--dry-run]: build public/ and ship exactly that build, or refuse.
// A lock spans build and upload, and an upload is refused if public/ differs by one byte from the
// content fingerprint build.mjs recorded, so one agent cannot ship another's tree under its stamp.
// why: lessons/workers-view.md#deploy-header
import { spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(HERE, 'public');
// The wrangler version to run. Raise it on purpose.
// why: lessons/workers-view.md#wrangler
export const WRANGLER = '4.75.0';
// Beside public/, never in it: public/ is uploaded verbatim. `.wrangler/` is gitignored.
export const LOCK = join(HERE, '.wrangler', 'positron-build.lock');
export const RECORD = join(HERE, '.wrangler', 'positron-build.json');

// Hold the build lock until exit; a child build is told via POSITRON_BUILD_LOCK=<pid>. Exit 1 if
// held.
// why: lessons/workers-view.md#lock
export function takeBuildLock(what) {
  let holder = null;
  try { holder = Number(readFileSync(LOCK, 'utf8')); } catch { /* free */ }
  if (holder && String(holder) === process.env.POSITRON_BUILD_LOCK) return;
  const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
  if (holder && holder !== process.pid && alive(holder)) {
    console.error(`\n${what} REFUSED: process ${holder} is building into or deploying from public/ (${LOCK}).`);
    console.error('  Wait for it, or build somewhere else with --out.');
    process.exit(1);
  }
  mkdirSync(dirname(LOCK), { recursive: true });
  writeFileSync(LOCK, String(process.pid));
  process.on('exit', () => {
    try { if (readFileSync(LOCK, 'utf8') === String(process.pid)) unlinkSync(LOCK); } catch { /* gone */ }
  });
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    if (!process.listenerCount(sig)) process.on(sig, () => process.exit(130));
  }
}

/** What build.mjs wrote into public/, recorded by build.mjs as its last step. */
export async function writeBuildRecord(stamp) {
  const files = Object.fromEntries(await fingerprint(PUBLIC));
  mkdirSync(dirname(RECORD), { recursive: true });
  writeFileSync(RECORD, JSON.stringify({ stamp, nonce: process.env.POSITRON_BUILD_NONCE || null, files }));
}

/** Every file under `dir`, by repo-relative path, with a hash of its bytes. */
export async function fingerprint(dir) {
  const out = new Map();
  const walk = async (d) => {
    let entries = [];
    try { entries = await readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(d, e.name);
      if (e.isDirectory()) { await walk(full); continue; }
      if (!e.isFile()) continue;
      out.set(relative(dir, full), createHash('sha256').update(await readFile(full)).digest('hex'));
    }
  };
  await walk(dir);
  return out;
}

// What changed between two fingerprints, in words; reports added, removed and changed files.
// why: lessons/workers-view.md#drift
export function drift(before, after) {
  const notes = [];
  for (const [f, h] of before) {
    if (!after.has(f)) notes.push(`vanished: ${f}`);
    else if (after.get(f) !== h) notes.push(`rewritten: ${f}`);
  }
  for (const f of after.keys()) if (!before.has(f)) notes.push(`appeared: ${f}`);
  return notes;
}

// Guarded, so the functions above can be imported and tested without building or deploying.
// why: lessons/workers-view.md#run
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const DRY = process.argv.includes('--dry-run');
  const STRICT = process.argv.includes('--strict');

  // Lists what is going out uncommitted, out of git, and never refuses: a gate on the normal case
  // becomes a reflex. `--strict` refuses, for when the tree should be clean.
  // why: lessons/workers-view.md#uncommitted
  const REPO = join(HERE, '..', '..');
  const gitLines = (args) => {
    const r = spawnSync('git', args, { cwd: REPO, encoding: 'utf8' });
    return r.status === 0 ? r.stdout.split('\n').filter(Boolean) : [];
  };
  // Only what the BUILD reads. `workers/view/public/` is the build's own
  // output and is always dirty after a build; listing it would bury the signal
  // under 150 lines of the thing we just generated.
  const SHIPPED_FROM = /^(demo|proto|timeline)\//;
  const dirty = [
    ...gitLines(['diff', '--name-only']),
    ...gitLines(['diff', '--cached', '--name-only']),
    ...gitLines(['ls-files', '--others', '--exclude-standard']),
  ].filter((f) => SHIPPED_FROM.test(f))
   .filter((f, i, a) => a.indexOf(f) === i)
   .sort();

  if (dirty.length) {
    console.log(`\n⚠️  ${dirty.length} uncommitted file(s) in the tree this deploy is built from:`);
    for (const f of dirty) console.log(`     ${f}`);
    console.log('   They will go live. Say so to anyone else working in this checkout.');
    if (STRICT) {
      console.error('\nDEPLOY REFUSED — --strict, and the tree is not clean.');
      process.exit(1);
    }
  } else {
    console.log('\nworking tree clean of build inputs — this deploy is committed work only.');
  }


  // The lock is held from before the build to after the upload, so no other
  // build can write into public/ in between; the record is build.mjs's own
  // fingerprint of what it wrote, tagged with this deploy's nonce.
  takeBuildLock('DEPLOY');
  const nonce = randomUUID();
  const build = spawnSync(process.execPath, [join(HERE, 'build.mjs')], {
    stdio: 'inherit', env: { ...process.env, POSITRON_BUILD_LOCK: String(process.pid), POSITRON_BUILD_NONCE: nonce },
  });
  if (build.status !== 0) {
    console.error('\nDEPLOY REFUSED — the build did not pass. Nothing was uploaded.');
    process.exit(1);
  }

  let record = null;
  try { record = JSON.parse(readFileSync(RECORD, 'utf8')); } catch { /* reported below */ }
  if (!record || record.nonce !== nonce) {
    console.error(`\nDEPLOY REFUSED: ${RECORD} is ${record ? 'from another build' : 'missing'}, so nothing says what this build wrote.`);
    process.exit(1);
  }

  // The stamp read back out of the artefact, and it has to be the one the build recorded.
  const shell = await readFile(join(PUBLIC, 'shell', 'shell.mjs'), 'utf8');
  const stamp = (shell.match(/export const BUILD = '([^']+)'/) || [])[1];
  if (!stamp || stamp === 'dev') {
    console.error(`\nDEPLOY REFUSED — public/shell/shell.mjs carries BUILD '${stamp}'.`);
    console.error('  Every device log opens with this line; shipping `dev` makes every report unattributable.');
    process.exit(1);
  }
  if (stamp !== record.stamp) {
    console.error(`\nDEPLOY REFUSED: public/ carries BUILD '${stamp}' and the build recorded '${record.stamp}'.`);
    process.exit(1);
  }

  const built = new Map(Object.entries(record.files));
  console.log(`\nthe build recorded ${built.size} files, stamp ${stamp}`);

  // As late as it can be: the tree about to be uploaded against the build's record.
  const beforeUpload = await fingerprint(PUBLIC);
  const moved = drift(built, beforeUpload);
  if (moved.length) {
    console.error('\nDEPLOY REFUSED: public/ is not what the build wrote:');
    for (const m of moved.slice(0, 10)) console.error('  ' + m);
    if (moved.length > 10) console.error(`  … and ${moved.length - 10} more`);
    console.error('\n  Something wrote into public/ after the build. Re-run this command;');
    console.error('  and if somebody is building in this checkout, they want --out.');
    process.exit(1);
  }

  if (DRY) {
    console.log('\n--dry-run: interlock held, nothing uploaded.');
    process.exit(0);
  }

  // Unset the two token variables: a `.env` in the cwd shadows machine OAuth.
  // why: lessons/workers-view.md#deploy-env
  const env = { ...process.env };
  delete env.CF_API_TOKEN;
  delete env.CLOUDFLARE_API_TOKEN;
  const up = spawnSync('npx', ['--yes', `wrangler@${WRANGLER}`, 'deploy'], { cwd: HERE, stdio: 'inherit', env });

  // Whether or not wrangler succeeded, say if the thing it was reading moved
  // under it. A deploy that raced a build shipped an unknown mixture, and that
  // is worth knowing even when the upload reported success.
  const after = drift(built, await fingerprint(PUBLIC));
  if (after.length) {
    console.error(`\n⚠️  public/ changed DURING the upload (${after.length} file(s)).`);
    console.error('   What is on the edge is a mixture of two builds. Re-run this command.');
    process.exit(1);
  }
  if (up.status !== 0) process.exit(up.status ?? 1);

  // Confirm the edge serves the new stamp; it serves the previous build for a few seconds.
  // why: lessons/workers-view.md#confirm
  const WANT = `export const BUILD = '${stamp}'`;
  let live = false;
  for (let i = 0; i < 20 && !live; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const r = await fetch(`https://positron.studio/shell/shell.mjs?cb=${i}`, { cache: 'no-store' });
      live = (await r.text()).includes(WANT);
    } catch {}
  }
  console.log(live
    ? `\n✅ deployed and CONFIRMED on the edge — BUILD ${stamp}`
    : `\n⚠️  uploaded, but the edge did not show ${stamp} within 30 s.\n`
      + `   Do not ask anyone to retest yet. Check with:\n`
      + `   curl -s https://positron.studio/shell/shell.mjs | grep "const BUILD"`);
}
