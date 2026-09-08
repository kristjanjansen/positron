// demo/reel/build-fixture.mjs — the 1965 catalogue, from bytes we already have.
//
// NODE ONLY. Never shipped to a browser, never imported by the page.
//
// ZERO UPSTREAM REQUESTS. Every row comes from
// `proto/megatimeline/search-cache.jsonl`, which is committed — a search this
// project already ran and kept. ERR's search endpoint is browser-unreachable
// anyway (its preflight answers 204 with no ACAO), so a page could not do this
// live even if it were polite to try.
//
// WHAT IT WRITES, and what it deliberately does not: slug, title, series, lead,
// date, and the absolute position. NO MEDIA URLS, no segments, no bytes. A
// link's worth of metadata is what ERR publishes to be searched; the media
// stays on their origin and is fetched at play time, once, on a gesture.
//
//   node demo/reel/build-fixture.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const CACHE = 'proto/megatimeline/search-cache.jsonl';
const OUT = 'demo/reel/1965.json';

const rows = [];
for (const line of readFileSync(CACHE, 'utf8').trim().split('\n')) {
  let rec; try { rec = JSON.parse(line); } catch { continue; }
  const key = JSON.parse(rec.key);
  if (key.type !== 'video') continue;
  const list = JSON.parse(rec.value).activeList;
  for (const group of list.data || []) {
    for (const it of group.data || []) rows.push(it);
  }
}

const seriesOf = (it) =>
  (it.navigationLinks || []).find((n) => n.type === 'series')?.data?.[0]?.name || null;

const seen = new Set();
const items = [];
for (const it of rows) {
  const slug = (it.canonicalUrl || it.url || '').split('/').filter(Boolean).pop();
  if (!slug || seen.has(slug)) continue;
  seen.add(slug);
  const at = Date.parse(it.date);
  if (!Number.isFinite(at)) continue;
  // The heading is "SERIES: n | TITLE". The part after the pipe is the film.
  const title = String(it.heading || '').split('|').slice(1).join('|').trim() || it.heading;
  items.push({
    slug,
    series: seriesOf(it),
    title,
    lead: (it.lead || '').trim() || null,
    date: it.date.slice(0, 10),
    at,                       // epoch ms, UTC midnight of the air date — NEGATIVE for 1965
  });
}
items.sort((a, b) => a.at - b.at || a.slug.localeCompare(b.slug));

const bySeries = {};
for (const i of items) bySeries[i.series || '(none)'] = (bySeries[i.series || '(none)'] || 0) + 1;

writeFileSync(OUT, JSON.stringify({
  source: 'ERR arhiiv (arhiiv.err.ee) — catalogue metadata only, no media',
  built: new Date().toISOString().slice(0, 10),
  count: items.length,
  from: items[0]?.date, to: items[items.length - 1]?.date,
  series: bySeries,
  items,
}, null, 1) + '\n');

console.log(`${items.length} films, ${items[0]?.date} to ${items[items.length - 1]?.date}`);
for (const [s, n] of Object.entries(bySeries).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${s}`);
console.log(`wrote ${OUT}`);
