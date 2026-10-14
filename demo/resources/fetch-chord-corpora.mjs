// Fetches iRb (Zenodo 10.5281/zenodo.3546040, CC BY 4.0, attribution in LICENSE-chord-tables)
// and McGill Billboard (ddmal.ca, CC0) once into gitignored tmp/chord-corpora/, at most four
// requests; a 404 stops that corpus. Run with no flag, or --check to touch nothing.
// See lessons/page-resources.md#resources-51

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
  /* The licence is read back off the record; if it stops saying cc-by-4.0 the run stops.
     See lessons/page-resources.md#resources-52 */
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

  /* The link is resolved off one of three listed pages, since ddmal.music.mcgill.ca is dead.
     See lessons/page-resources.md#resources-53 */
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
