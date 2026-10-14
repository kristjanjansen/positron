// Fetches each film's thumbnail path once, spaced, into tiles.json for /floor/ to read in one GET.
// Usage: node demo/floor/build-tiles.mjs [--limit 40]. Resumable: asks only about unknown films.
// A film with no thumbnail is written as photo: null, so the next run does not ask again.
// See lessons/page-floor.md#floor-1

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const CATALOGUE = join(here, '..', 'reel', '1965.json');
const OUT = join(here, 'tiles.json');
const UA = 'positron/1.0 (+https://positron.studio; research; contact kristjan.jansen@gmail.com)';
const PAUSE_MS = 350;

const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const catalogue = JSON.parse(readFileSync(CATALOGUE, 'utf8'));
// FILM ONLY. The radio half of 1965 is 494 of the 792 items and has no picture
// at all — a floor tile for a radio programme would be a blank square claiming
// to be a film.
const films = catalogue.items.filter((it) => it.kind === 'video');

const prior = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { tiles: [] };
const known = new Map(prior.tiles.map((t) => [t.slug, t]));

let asked = 0, got = 0, blank = 0, cached = 0;
const out = [];

for (const it of films) {
  if (out.length >= LIMIT) break;
  const had = known.get(it.slug);
  if (had && had.photo !== undefined) { out.push(had); cached++; continue; }

  await sleep(PAUSE_MS);
  asked++;
  let photo = null;
  try {
    const r = await fetch(
      `https://arhiiv.err.ee/api/v1/content/video/${encodeURIComponent(it.slug)}`,
      { headers: { 'user-agent': UA, accept: 'application/json' } },
    );
    if (r.ok) {
      const j = await r.json();
      const info = j?.data?.info || j?.info || {};
      // photoUrl is the relative path the resizer takes (thumbnails/<year>/<file>.jpg); videoPhotoUrl
      // is the same file on a host with no CORS. The relative one travels, via our own origin.
      // See lessons/page-floor.md#floor-2
      const rel = String(info.photoUrl || '').trim();
      photo = /^thumbnails\/\d{4}\/[A-Za-z0-9_.-]+\.jpg$/.test(rel) ? rel : null;
    }
  } catch { /* a network failure is a miss this run, not a permanent one */ }

  if (photo) got++; else blank++;
  out.push({ slug: it.slug, title: it.title, series: it.series, date: it.date, at: it.at, photo });
  if (asked % 25 === 0) process.stderr.write(`  asked ${asked}, found ${got}, blank ${blank}\n`);
}

const doc = {
  source: 'ERR arhiiv (arhiiv.err.ee) — catalogue metadata and thumbnail paths only, no media',
  built: new Date().toISOString().slice(0, 10),
  note: 'photo is the archive\'s own relative thumbnail path; /floor/ asks '
    + 'positron.studio/err-img for it so the bytes arrive same-origin and WebGL '
    + 'is allowed to read them',
  count: out.length,
  withPhoto: out.filter((t) => t.photo).length,
  tiles: out,
};
writeFileSync(OUT, `${JSON.stringify(doc, null, 1)}\n`);
process.stderr.write(`\n${doc.count} films · ${doc.withPhoto} with a picture · `
  + `${cached} already known · ${asked} asked this run\n`);
