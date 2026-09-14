// deploy.mjs — build public/ and ship exactly that build, or refuse.
//
//   node workers/view/deploy.mjs            build, interlock, deploy, confirm
//   node workers/view/deploy.mjs --dry-run  everything except the upload
//
// 🔴 WHY THIS EXISTS. `build.mjs` and `npx wrangler deploy` are two commands
// about two different moments, and nothing has ever joined them. With one
// person that is fine. With two agents in one checkout it is this:
//
//   A: node build.mjs        public/ is A's tree
//   B: node build.mjs        public/ is B's tree
//   A: npx wrangler deploy   A ships B's tree, under B's stamp
//
// and every downstream rule quietly stops working. `Attribute a run to a build
// before iterating on it` reads a stamp that is somebody else's.
// `Confirm the stamp changed before asking anyone to retest` confirms it —
// it did change, to the wrong thing. There is no output anywhere that looks
// wrong, which is the worst shape there is.
//
// So: build, fingerprint the output, and refuse to upload if one byte of it
// moved in between. The fingerprint is over CONTENT, not mtimes — a second
// build of the same tree is not a problem and must not read as one.
import { spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(HERE, 'public');

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

/**
 * What changed between two fingerprints, in words. Empty array means identical.
 *
 * ⚠️ IT REPORTS ALL THREE KINDS. An output directory that lost a file between
 * the build and the upload is as wrong as one that gained a changed one, and a
 * check that only looked for modifications would call that clean.
 */
export function drift(before, after) {
  const notes = [];
  for (const [f, h] of before) {
    if (!after.has(f)) notes.push(`vanished: ${f}`);
    else if (after.get(f) !== h) notes.push(`rewritten: ${f}`);
  }
  for (const f of after.keys()) if (!before.has(f)) notes.push(`appeared: ${f}`);
  return notes;
}

// ── run ─────────────────────────────────────────────────────────────────────
// (guarded, so the two functions above can be imported and tested without
// building or deploying anything — which is how their refusal was proved)
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const DRY = process.argv.includes('--dry-run');

  const build = spawnSync(process.execPath, [join(HERE, 'build.mjs')], { stdio: 'inherit' });
  if (build.status !== 0) {
    console.error('\nDEPLOY REFUSED — the build did not pass. Nothing was uploaded.');
    process.exit(1);
  }

  // The stamp that was just built, read back out of the artefact rather than
  // recomputed — a stamp derived twice can disagree with itself, and then the
  // number quoted to a phone is not the number on the edge.
  const shell = await readFile(join(PUBLIC, 'shell', 'shell.mjs'), 'utf8');
  const stamp = (shell.match(/export const BUILD = '([^']+)'/) || [])[1];
  if (!stamp || stamp === 'dev') {
    console.error(`\nDEPLOY REFUSED — public/shell/shell.mjs carries BUILD '${stamp}'.`);
    console.error('  Every device log opens with this line; shipping `dev` makes every report unattributable.');
    process.exit(1);
  }

  const built = await fingerprint(PUBLIC);
  console.log(`\nfingerprinted ${built.size} files · stamp ${stamp}`);

  // ⚠️ THE CHECK IS HERE, AS LATE AS IT CAN BE. Between the build finishing and
  // wrangler opening the first file is the entire window another `node
  // build.mjs` has to land in, and it is seconds wide in practice.
  const beforeUpload = await fingerprint(PUBLIC);
  const moved = drift(built, beforeUpload);
  if (moved.length) {
    console.error('\nDEPLOY REFUSED — public/ changed between the build and the upload:');
    for (const m of moved.slice(0, 10)) console.error('  ' + m);
    if (moved.length > 10) console.error(`  … and ${moved.length - 10} more`);
    console.error('\n  Another build landed on top of this one. Re-run this command;');
    console.error('  and if somebody is building in this checkout, they want --out.');
    process.exit(1);
  }

  if (DRY) {
    console.log('\n--dry-run: interlock held, nothing uploaded.');
    process.exit(0);
  }

  // ⚠️ `.env` IN THE CWD SHADOWS MACHINE OAUTH (CLAUDE.md). Unset the two
  // variables rather than requiring a particular working directory, which is
  // the documented fix and the one nobody has to remember.
  const env = { ...process.env };
  delete env.CF_API_TOKEN;
  delete env.CLOUDFLARE_API_TOKEN;
  const up = spawnSync('npx', ['wrangler', 'deploy'], { cwd: HERE, stdio: 'inherit', env });

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

  // `Confirm the stamp changed before asking anyone to retest — the edge serves
  // the previous build for a few seconds after deploy.` That rule has been
  // carried in prose and performed by hand. Perform it here.
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
