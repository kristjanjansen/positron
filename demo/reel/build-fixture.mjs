// The 1965 catalogue for /reel/, built in node only from the committed search cache
// proto/megatimeline/search-cache.jsonl: no search request upstream. It writes metadata
// only (slug, title, series, lead, date, position), no media URLs. Run: node demo/reel/build-fixture.mjs
// See lessons/page-reel.md#reel-1

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const CACHE = 'proto/megatimeline/search-cache.jsonl';
const OUT = 'demo/reel/1965.json';

const rows = [];
for (const line of readFileSync(CACHE, 'utf8').trim().split('\n')) {
  let rec; try { rec = JSON.parse(line); } catch { continue; }
  const key = JSON.parse(rec.key);
  if (key.type !== 'video' && key.type !== 'audio') continue;
  const list = JSON.parse(rec.value).activeList;
  for (const group of list.data || []) {
    for (const it of group.data || []) rows.push({ ...it, __kind: key.type });
  }
}

const seriesOf = (it) =>
  (it.navigationLinks || []).find((n) => n.type === 'series')?.data?.[0]?.name || null;

// Keep durations already fetched: each costs one upstream request, so --no-fetch keeps them.
// See lessons/page-reel.md#reel-2
const prior = existsSync(OUT)
  ? new Map(JSON.parse(readFileSync(OUT, 'utf8')).items.map((i) => [i.slug, i]))
  : new Map();

const seen = new Set();
const items = [];
for (const it of rows) {
  const slug = (it.canonicalUrl || it.url || '').split('/').filter(Boolean).pop();
  if (!slug || seen.has(slug)) continue;
  seen.add(slug);
  const at = Date.parse(it.date);
  if (!Number.isFinite(at)) continue;
  // 1965 ONLY. The search window is expressed in seconds and its edges pick up
  // a day either side, so an item stamped 1966-01-02 arrives in a 1965 search.
  if (at < Date.UTC(1965, 0, 1) || at >= Date.UTC(1966, 0, 1)) continue;
  // The heading is "SERIES: n | TITLE". The part after the pipe is the film.
  const title = String(it.heading || '').split('|').slice(1).join('|').trim() || it.heading;
  items.push({
    slug,
    kind: it.__kind,          // 'video' (silent newsreels) or 'audio' (radio, with sound)
    series: seriesOf(it),
    title,
    lead: (it.lead || '').trim() || null,
    date: it.date.slice(0, 10),
    // Midday, not midnight: the catalogue records only the day, and midday sits in its
    // middle, leaving room either side for a clip drawn at its true length.
    // See lessons/page-reel.md#reel-3
    at: at + 12 * 3600_000,
    ...(prior.get(slug)?.catalogueMs ? { catalogueMs: prior.get(slug).catalogueMs } : {}),
  });
}
items.sort((a, b) => a.at - b.at || a.slug.localeCompare(b.slug));

// Durations: the API has no duration field, so the last shot's endTime is the claim
// (one film's runs 6,880 ms past its last frame; the page redraws after playing).
// One spaced request per film, to ERR's server; skipped entirely with --no-fetch.
// See lessons/page-reel.md#reel-4
if (!process.argv.includes('--no-fetch')) {
  const UA = 'positron/1.0 (+https://positron.studio; research; contact kristjan.jansen@gmail.com)';
  let got = 0, missing = 0;
  for (const [i, it] of items.entries()) {
    if (it.kind !== 'video') continue;      // radio has no shot list; see the page
    if (it.catalogueMs) { got++; continue; }               // already known
    try {
      const r = await fetch(`https://arhiiv.err.ee/api/v1/content/video/${encodeURIComponent(it.slug)}`,
        { headers: { 'user-agent': UA } });
      if (r.ok) {
        const j = await r.json();
        const shots = (j?.data?.description?.data) || (j?.description?.data) || [];
        const end = shots.length ? Math.max(...shots.map((sh) => Number(sh.endTime) || 0)) : 0;
        if (end > 0) { it.catalogueMs = end; got++; } else missing++;
      } else missing++;
    } catch { missing++; }
    if (i % 25 === 0) process.stderr.write(`  ${i}/${items.length}\n`);
    await new Promise((res) => setTimeout(res, 1200));
  }
  console.error(`durations: ${got} from the shot list, ${missing} without one`);
}

const bySeries = {};
for (const i of items) bySeries[i.series || '(none)'] = (bySeries[i.series || '(none)'] || 0) + 1;

writeFileSync(OUT, JSON.stringify({
  source: 'ERR arhiiv (arhiiv.err.ee) — catalogue metadata only, no media',
  built: new Date().toISOString().slice(0, 10),
  count: items.length,
  video: items.filter((i) => i.kind === 'video').length,
  audio: items.filter((i) => i.kind === 'audio').length,
  from: items[0]?.date, to: items[items.length - 1]?.date,
  series: bySeries,
  items,
}, null, 1) + '\n');

console.log(`${items.length} items — ${items.filter((i) => i.kind === 'video').length} film, `
  + `${items.filter((i) => i.kind === 'audio').length} radio — `
  + `${items[0]?.date} to ${items[items.length - 1]?.date}`);
for (const [s, n] of Object.entries(bySeries).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${s}`);
console.log(`wrote ${OUT}`);
