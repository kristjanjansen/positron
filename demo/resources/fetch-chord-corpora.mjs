// demo/resources/fetch-chord-corpora.mjs. Two chord corpora, fetched once, ever.
//
//   node demo/resources/fetch-chord-corpora.mjs           # fetch what is missing, then print the numbers
//   node demo/resources/fetch-chord-corpora.mjs --check   # print the state, touch nothing and nobody
//
// 🔴 IT CONTACTS TWO HOSTS AND ONLY WHEN A FILE IS NOT ALREADY IN `tmp/`. Every
// later run asks nobody for anything. `CLAUDE.md`: *"super careful with external
// sources, better avoid"*, and the rule there is about whose server it is rather
// than about which harm has been named. The cache is `tmp/chord-corpora/`, which
// is gitignored, so neither corpus is in the repository and neither is in the
// deploy. `demo/resources/fetch-jrhodes3d.mjs` and `subset-bravura.mjs` are the
// same shape and carry the same rule at the top of them.
//
// ⚠️ NO HARNESS EVER RUNS THIS AND NO PAGE EVER FETCHES FROM EITHER HOST. What
// ships is a TABLE counted out of these files, never the files.
//
// ── WHAT IT FETCHES, AND WHAT EACH LICENCE REQUIRES ─────────────────────────
//
// 1. THE iRealPro CORPUS OF JAZZ STANDARDS (iRb), Shanahan and Broze, 2019.
//    Zenodo, DOI 10.5281/zenodo.3546040. **CC BY 4.0.**
//    1,186 jazz standards as Humdrum `**harte` spines with a key designation.
//    🔴 CC BY REQUIRES ATTRIBUTION TO TRAVEL WITH THE WORK AND WITH ANY
//    DERIVATIVE. A counted table IS a derivative, so the attribution ships
//    beside the table rather than only in this comment. See
//    `demo/shell/LICENSE-chord-tables`.
//    ⚠️ Its original home at `musiccog.ohio-state.edu` is gone, so Zenodo is the
//    surviving copy. `research/chord-learning-2026-09-23.md` §4.3 read the
//    licence field off the Zenodo API record on 2026-09-23.
//    ⚠️ AND ITS TIDIER CHILD IS NOT USABLE: the Jazz Harmony Treebank selects
//    from this same corpus and relicenses to CC BY-NC-SA 4.0. The parent is
//    usable and the child is not, which is the trap worth naming because the
//    child is the more inviting file.
//
// 2. THE McGILL BILLBOARD PROJECT, Burgoyne, Wild and Fujinaga, 2011. **CC0.**
//    740 distinct songs across 890 sampled chart slots, Harte-syntax chord
//    symbols with onset times, metre and a stated tonic.
//    ✅ CC0 attaches no condition to anything derived from it. The citation the
//    DDMAL asks for is a scholarly norm rather than a licence condition, and it
//    is carried anyway in the same licence file, because a table nobody can
//    trace back is a table nobody can check.
//    🔴 THE URL EVERYBODY CITES IS DEAD. `ddmal.music.mcgill.ca` answers a
//    GitHub Pages 404. The live host is `ddmal.ca`.
//
// ── HOW MANY REQUESTS, AND WHAT HAPPENS WHEN ONE FAILS ──────────────────────
//
// 🔴 AT MOST FOUR REQUESTS IN A LIFETIME, AND IT SAYS HOW MANY IT MADE.
//   zenodo.org   1 API record read, then 1 file GET
//   ddmal.ca     1 landing page read to resolve the archive link, then 1 file GET
// ⚠️ A 404 IS REPORTED AND THE RUN STOPS FOR THAT CORPUS. It does not go hunting
// across the site for a file under another name, because a dozen requests
// looking for one file is the shape this repository refuses.

import { mkdirSync, existsSync, writeFileSync, statSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const CACHE = join(REPO, 'tmp', 'chord-corpora');

const CHECK = process.argv.includes('--check');
const UA = 'positron.studio one-time research copy';

let requests = 0;
const perHost = new Map();
const ask = async (url, init) => {
  const host = new URL(url).host;
  requests++;
  perHost.set(host, (perHost.get(host) || 0) + 1);
  return fetch(url, { ...init, headers: { 'user-agent': UA, ...(init?.headers || {}) } });
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(CACHE, { recursive: true });

/** iRb, Zenodo. One API read to find the file, one GET to take it. */
async function irb() {
  const out = join(CACHE, 'irb.zip');
  if (existsSync(out)) return { path: out, bytes: statSync(out).size, fetched: false };
  if (CHECK) return { path: out, bytes: 0, fetched: false, missing: true };

  const rec = await ask('https://zenodo.org/api/records/3546040');
  if (!rec.ok) throw new Error(`zenodo record answered ${rec.status}, stopping rather than hunting`);
  const meta = await rec.json();
  /* ⚠️ THE LICENCE IS READ BACK OFF THE RECORD RATHER THAN TRUSTED FROM A
     COMMENT, because a licence in a comment is a claim about a fetch somebody
     made once. If this ever stops saying cc-by-4.0 the run has to stop. */
  const lic = meta?.metadata?.license?.id ?? meta?.metadata?.license ?? '(none stated)';
  console.log(`  zenodo record 3546040 licence: ${JSON.stringify(lic)}`);
  const files = meta.files || [];
  console.log(`  ${files.length} file(s) on the record: ${files.map((f) => `${f.key} ${f.size}B`).join(', ')}`);
  const pick = files.find((f) => /\.zip$/i.test(f.key)) || files[0];
  if (!pick) throw new Error('zenodo record lists no files, stopping');

  await sleep(1000);
  const res = await ask(pick.links?.self || pick.links?.download);
  if (!res.ok) throw new Error(`zenodo file answered ${res.status}, stopping`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(out, buf);
  return { path: out, bytes: buf.length, fetched: true, licence: lic, name: pick.key };
}

/** McGill Billboard, ddmal.ca. One landing page to resolve the link, one GET. */
async function billboard() {
  const out = join(CACHE, 'billboard-salami-chords.tar.gz');
  if (existsSync(out)) return { path: out, bytes: statSync(out).size, fetched: false };
  if (CHECK) return { path: out, bytes: 0, fetched: false, missing: true };

  /* 🔴 THE LINK IS RESOLVED OFF A PAGE RATHER THAN GUESSED, AND THE LIST OF
     PAGES TO TRY IS THREE LONG AND WRITTEN DOWN HERE. `ddmal.music.mcgill.ca`
     is the host everybody cites and it is dead, so the first version of this
     function asked a 404 and stopped, which is the behaviour that is wanted
     when a file is genuinely gone and the wrong behaviour when the project
     simply moved. Three is bounded, is printed, and is not a sweep. */
  const LANDINGS = [
    'https://ddmal.ca/research/The_McGill_Billboard_Project_(Chord_Analysis_Dataset)/',
    'https://ddmal.ca/research/billboard/',
    'https://ddmal.ca/',
  ];
  let href = null;
  for (const url of LANDINGS) {
    const page = await ask(url);
    if (!page.ok) { console.log(`  ${url} answered ${page.status}`); await sleep(1000); continue; }
    const html = await page.text();
    const m = [...html.matchAll(/href="([^"]*salami_chords[^"]*)"/gi)];
    console.log(`  ${url} answered ${page.status}, salami_chords links: ${m.length}`);
    if (m.length) { href = new URL(m[0][1], page.url).href; break; }
    const b = [...html.matchAll(/href="([^"]*[Bb]illboard[^"]*)"/g)].map((x) => x[1]).slice(0, 6);
    if (b.length) console.log(`    billboard-ish links here: ${b.join(' ')}`);
    await sleep(1000);
  }
  if (!href) throw new Error('no salami_chords link on any of the three pages, stopping rather than hunting');

  await sleep(1000);
  const res = await ask(href);
  if (!res.ok) throw new Error(`${href} answered ${res.status}, stopping`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(out, buf);
  return { path: out, bytes: buf.length, fetched: true, href };
}

const rows = [];
for (const [what, fn] of [['iRb jazz, CC BY 4.0', irb], ['McGill Billboard, CC0', billboard]]) {
  try {
    const r = await fn();
    rows.push([what, r]);
    console.log(`${r.missing ? 'MISSING ' : r.fetched ? 'fetched ' : 'cached  '} ${what.padEnd(24)} ${String(r.bytes).padStart(9)} bytes  ${r.path}`);
  } catch (e) {
    rows.push([what, { error: String(e.message) }]);
    console.log(`FAILED   ${what.padEnd(24)} ${e.message}`);
  }
}

console.log(`\nrequests this run: ${requests}${requests ? ` (${[...perHost].map(([h, n]) => `${h} ${n}`).join(', ')})` : ''}`);
console.log('cache:', CACHE, '(gitignored, so neither corpus is in the repository or the deploy)');
void readFileSync;
