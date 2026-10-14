// node workers/view/analytics.mjs [--days N | --since DATE] [--no-sweeps] [--without IP] [--json]
// Read-only GraphQL Analytics on the positron.studio zone with wrangler's OAuth token; one query a
// day. Most requests are us, the bot share is a floor, there is no referrer on this plan.
// why: lessons/workers-view.md#analytics-header

import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const ZONE_NAME = 'positron.studio';
// The hosts this worker serves. Everything else on the zone is another worker,
// and mixing them would put `/room/studio-1/stats` in a table of demo slugs.
const SITE_HOSTS = new Set(['positron.studio', 'www.positron.studio']);
const GRAPHQL = 'https://api.cloudflare.com/client/v4/graphql';
const API = 'https://api.cloudflare.com/client/v4';
// A wider filter is refused by name on this zone.
// why: lessons/workers-view.md#span
const MAX_SPAN_HOURS = 24;

// An address touching this many slugs is a sweep, not a visit; a labelled heuristic, opt-in.
// why: lessons/workers-view.md#sweep
const SWEEP_SLUGS = 10;

// Who is asking. Order matters: `HeadlessChrome` contains "headless", so ours is tested first.
// why: lessons/workers-view.md#who

/** Our own harnesses and command-line tools. */
const OURS = /HeadlessChrome|^curl\/|^node$|wrangler|undici|positron-corpus/i;

// A client that says it is a crawler, scanner or non-browser: the sibling project's `bot.ts`
// list (as AI Crawl Control matches), then what turned up in this zone's logs.
// why: lessons/workers-view.md#named-bot
const NAMED_BOT = new RegExp([
  'bot|crawl|spider|scrape|preview|fetch|monitor|lighthouse|headless',
  'gptbot|perplexity|bytespider|ccbot|amazonbot|meta-external|externalhit',
  'l9scan|leakix|zgrab|masscan|nuclei|censys|expanse|shodan',
  'go-http-client|python-requests|okhttp|wget|libwww|java/|axios|got/',
].join('|'), 'i');

const VERIFIED = 'verified';
const BOT = 'bot';
const HARNESS = 'ours';
const BROWSER = 'browser';
const CLASSES = [BROWSER, VERIFIED, BOT, HARNESS];
const CLASS_LABEL = {
  [BROWSER]: 'browser',
  [VERIFIED]: 'verified bot',
  [BOT]: 'named bot',
  [HARNESS]: 'ours',
};
// The same four in a column head, which has ten characters and not fourteen.
const CLASS_HEAD = { [BROWSER]: 'browser', [VERIFIED]: 'verified', [BOT]: 'named', [HARNESS]: 'ours' };

/** Which of the four a request is. `browser` is the residue, not a claim. */
export function classify({ verifiedBotCategory, userAgent }) {
  if (verifiedBotCategory) return VERIFIED;
  const ua = userAgent || '';
  if (OURS.test(ua)) return HARNESS;
  if (!ua || NAMED_BOT.test(ua)) return BOT;
  return BROWSER;
}

// The slug a path belongs to (/proto/deck/ keeps two segments); an unknown shape returns the path.
// why: lessons/workers-view.md#slug-of
export function slugOf(path) {
  if (path === '/' || path === '/index.html') return '/';
  const m = /^\/((?:proto\/)?[a-z0-9][a-z0-9-]*)\/(?:index\.html)?$/.exec(path);
  return m ? m[1] : path;
}

// ── the token ───────────────────────────────────────────────────────────────

/** Where wrangler keeps its OAuth grant, newest location first. */
const CONFIG_PATHS = [
  join(homedir(), 'Library', 'Preferences', '.wrangler', 'config', 'default.toml'),
  join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), '.wrangler', 'config', 'default.toml'),
  join(homedir(), '.wrangler', 'config', 'default.toml'),
];

async function readGrant() {
  for (const path of CONFIG_PATHS) {
    let text;
    try { text = await readFile(path, 'utf8'); } catch { continue; }
    const token = (text.match(/^oauth_token\s*=\s*"([^"]+)"/m) || [])[1];
    if (!token) continue;
    const expires = (text.match(/^expiration_time\s*=\s*"([^"]+)"/m) || [])[1];
    return { token, expires: expires ? new Date(expires) : null, path };
  }
  return null;
}

// A live OAuth token, refreshed through `wrangler whoami` when expired, never by hand.
// why: lessons/workers-view.md#live-token
async function liveToken() {
  let grant = await readGrant();
  if (!grant) {
    console.error('No wrangler OAuth grant on this machine. Looked in:');
    for (const p of CONFIG_PATHS) console.error('  ' + p);
    console.error('\nRun `npx wrangler login` and try again.');
    process.exit(1);
  }
  // A minute of margin: a token that expires mid-query fails halfway through a
  // seven-day merge, which reads as a broken dataset rather than a stale login.
  const stale = grant.expires && grant.expires.getTime() - Date.now() < 60_000;
  if (stale) {
    // stderr, not stdout, or the line lands inside `--json` output.
    // why: lessons/workers-view.md#stderr
    console.error('wrangler OAuth token has expired. Refreshing through `wrangler whoami`.');
    const env = { ...process.env };
    delete env.CF_API_TOKEN;
    delete env.CLOUDFLARE_API_TOKEN;
    spawnSync('npx', ['wrangler', 'whoami'], { cwd: HERE, env, stdio: 'ignore' });
    grant = await readGrant();
    const ok = grant && (!grant.expires || grant.expires.getTime() - Date.now() > 0);
    if (!ok) {
      console.error('The token is still expired after a refresh. Run `npx wrangler login`.');
      process.exit(1);
    }
  }
  return grant.token;
}

// ── the API ─────────────────────────────────────────────────────────────────

// A GraphQL failure is HTTP 200 with `errors` and null `data`; check both and show its words.
// why: lessons/workers-view.md#gql
async function gql(token, query, variables) {
  const r = await fetch(GRAPHQL, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!r.ok) throw new Error(`GraphQL HTTP ${r.status}`);
  const body = await r.json();
  if (body.errors && body.errors.length) {
    throw new Error('Cloudflare refused the query:\n  ' + body.errors.map((e) => e.message).join('\n  '));
  }
  const zone = body.data?.viewer?.zones?.[0];
  if (!zone) throw new Error('Cloudflare returned no zone. Is the token scoped to it?');
  return zone;
}

// Every slug the checkout publishes, so an unopened page can be named. The checkout can differ
// from the deploy, and a broken manifest import costs only this section.
// why: lessons/workers-view.md#published
async function publishedSlugs() {
  try {
    const m = await import(new URL('../../demo/manifest.mjs', import.meta.url).href);
    // `targetOf` returns a link with a query; `clientRequestPath` never has one, so strip it.
    // why: lessons/workers-view.md#target-path
    const clean = (t) => String(t).split(/[?#]/)[0];
    return m.DEMOS.map((d) => ({ name: d.name, path: clean(m.targetOf(d) || '') })).filter((d) => d.path);
  } catch {
    return null;
  }
}

/** The zone id, resolved rather than pasted in. A hard-coded id is a fact
 *  about one account that nothing corrects when it stops being true. */
async function resolveZone(token) {
  const r = await fetch(`${API}/zones?name=${encodeURIComponent(ZONE_NAME)}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const body = await r.json();
  if (!body.success) {
    throw new Error('Could not list zones:\n  ' + (body.errors || []).map((e) => e.message).join('\n  '));
  }
  const zone = (body.result || []).find((z) => z.name === ZONE_NAME);
  if (!zone) throw new Error(`No zone named ${ZONE_NAME} on this account.`);
  return { id: zone.id, plan: zone.plan?.name || 'unknown', since: (zone.activated_on || zone.created_on || '').slice(0, 10) };
}

const Q_DAYS = `query($z:String!,$a:Date!,$b:Date!){ viewer { zones(filter:{zoneTag:$z}) {
  httpRequests1dGroups(limit: 60, filter: {date_geq:$a, date_leq:$b}, orderBy: [date_ASC]) {
    dimensions { date } sum { requests pageViews bytes } uniq { uniques } } } } }`;

const Q_TOTAL = `query($z:String!,$a:Time!,$b:Time!){ viewer { zones(filter:{zoneTag:$z}) {
  httpRequestsOverviewAdaptiveGroups(limit: 1, filter: {datetime_geq:$a, datetime_lt:$b}) {
    sum { requests pageViews bytes } } } } }`;

// One day at a time, by measured necessity. The dimensions are everything the
// rest of this file needs, so a day costs exactly one round trip.
const Q_PAGES = `query($z:String!,$a:Time!,$b:Time!){ viewer { zones(filter:{zoneTag:$z}) {
  httpRequestsAdaptiveGroups(
    limit: 10000,
    filter: {datetime_geq:$a, datetime_lt:$b, requestSource:"eyeball", edgeResponseContentTypeName:"html"},
    orderBy: [count_DESC]
  ) {
    count
    dimensions { clientRequestHTTPHost clientRequestPath clientIP clientCountryName verifiedBotCategory userAgent edgeResponseStatus }
  } } } }`;

/** Every HTML request in a window, as one flat list, asked a day at a time. */
async function pageRows(token, zoneId, from, to) {
  const rows = [];
  for (let a = new Date(from); a < to;) {
    const b = new Date(Math.min(a.getTime() + MAX_SPAN_HOURS * 36e5, to.getTime()));
    const zone = await gql(token, Q_PAGES, { z: zoneId, a: a.toISOString(), b: b.toISOString() });
    for (const row of zone.httpRequestsAdaptiveGroups) rows.push({ ...row.dimensions, count: row.count });
    a = b;
  }
  return rows;
}

// ── printing ────────────────────────────────────────────────────────────────

const n = (v) => Number(v).toLocaleString('en-US');
const mb = (v) => (v >= 1e9 ? (v / 1e9).toFixed(1) + ' GB' : (v / 1e6).toFixed(1) + ' MB');
const lpad = (s, w) => String(s).padStart(w);
/** Pad right, and CLIP rather than overflow. A cell wider than its column
 *  pushes every column after it along, which turns a table into a list of
 *  ragged lines exactly where the values got interesting. */
const pad = (s, w) => {
  const v = String(s);
  return v.length > w - 1 ? v.slice(0, w - 2) + '… ' : v.padEnd(w);
};

function heading(text) {
  console.log('\n' + text.toUpperCase());
  console.log('-'.repeat(text.length));
}

/** A row of counts split by class, in one fixed order so two tables line up. */
function splitCells(split) {
  return CLASSES.map((c) => lpad(split[c] ? n(split[c]) : '.', 10)).join('');
}

function tally(map, key, cls, count, ip) {
  let e = map.get(key);
  if (!e) { e = { total: 0, clients: new Set(), split: {} }; map.set(key, e); }
  e.total += count;
  e.split[cls] = (e.split[cls] || 0) + count;
  if (ip) e.clients.add(ip);
  return e;
}

// ── run ─────────────────────────────────────────────────────────────────────

// Print the API's own words and stop; no message here carries the token.
// why: lessons/workers-view.md#fail
const fail = (err) => { console.error('\n' + (err?.message || err)); process.exit(1); };
process.on('uncaughtException', fail);
process.on('unhandledRejection', fail);

const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i < 0 ? null : argv[i + 1]; };

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`
which demos does anybody open, off Cloudflare's zone analytics for ${ZONE_NAME}.

  --days N          merge N whole days ending now (default 1)
  --since YYYY-MM-DD  from that date to now
  --without IP[,IP] drop those client addresses from every table
  --no-sweeps       drop clients that touched ${SWEEP_SLUGS}+ different slugs
  --json            the same numbers, machine readable

Read the top of this file before quoting any figure out of it.
`);
  process.exit(0);
}

const JSON_OUT = argv.includes('--json');
const NO_SWEEPS = argv.includes('--no-sweeps');
const DAYS = Number(flag('--days') || 0);
const SINCE = flag('--since');
const WITHOUT = new Set((flag('--without') || '').split(',').map((s) => s.trim()).filter(Boolean));

const to = new Date();
let from = SINCE
  ? new Date(`${SINCE}T00:00:00Z`)
  : new Date(to.getTime() - (DAYS > 0 ? DAYS * 864e5 : 864e5));

// Clamp before asking: older than 4w3d or wider than a day is refused, so cut and say so.
// An `Invalid Date` compares false to everything, so it is checked first.
// why: lessons/workers-view.md#clamp
if (Number.isNaN(from.getTime())) {
  console.error(`--since ${SINCE} is not a date. Write it as YYYY-MM-DD.`);
  process.exit(1);
}
const OLDEST = new Date(to.getTime() - 30 * 864e5);
let clamped = false;
if (from < OLDEST) { from = OLDEST; clamped = true; }
if (from >= to) {
  console.error('That window ends before it starts. Check --since.');
  process.exit(1);
}

const token = await liveToken();
const zone = await resolveZone(token);

const day = (d) => new Date(d).toISOString().slice(0, 10);
const daysBack = (k) => new Date(Date.now() - k * 864e5).toISOString().slice(0, 10);

const [dayZone, totalZone, rows, published] = await Promise.all([
  gql(token, Q_DAYS, { z: zone.id, a: daysBack(29), b: daysBack(0) }),
  gql(token, Q_TOTAL, { z: zone.id, a: from.toISOString(), b: to.toISOString() }),
  pageRows(token, zone.id, from, to),
  publishedSlugs(),
]);

// ── fold ────────────────────────────────────────────────────────────────────

// A `Host:` header carries a port when a scanner puts one there, and
// `positron.studio:8443` is this site however odd the request looks. Strip it
// before matching, or those requests are filed under another worker.
const hostOf = (h) => String(h || '').replace(/:\d+$/, '');

const kept = rows.filter((r) => !WITHOUT.has(r.clientIP));
const site = kept.filter((r) => SITE_HOSTS.has(hostOf(r.clientRequestHTTPHost)));
const served = site.filter((r) => r.edgeResponseStatus >= 200 && r.edgeResponseStatus < 300);

// Who walked the whole index. Built before anything is folded, because a
// sweeper has to be recognised from ALL of its requests rather than from the
// one being counted.
const clientSlugs = new Map();
for (const r of served) {
  const s = clientSlugs.get(r.clientIP) || new Set();
  s.add(slugOf(r.clientRequestPath));
  clientSlugs.set(r.clientIP, s);
}
const sweepers = new Set([...clientSlugs].filter(([, s]) => s.size >= SWEEP_SLUGS).map(([ip]) => ip));
const sweptOpens = served.filter((r) => sweepers.has(r.clientIP)).reduce((a, r) => a + r.count, 0);

const opened = NO_SWEEPS ? served.filter((r) => !sweepers.has(r.clientIP)) : served;

const bySlug = new Map();
const byClass = new Map();
const byCountry = new Map();
const byClient = new Map();
const byOther = new Map();
const refused = new Map();

for (const r of site) {
  if (r.edgeResponseStatus >= 300) {
    // By path, not by status alone: a 403 on `/` and one on `/wp-config.php` are different events.
    // why: lessons/workers-view.md#by-path
    const key = `${r.edgeResponseStatus} ${r.clientRequestPath}`;
    refused.set(key, (refused.get(key) || 0) + r.count);
  }
}
for (const r of opened) {
  const cls = classify(r);
  tally(bySlug, slugOf(r.clientRequestPath), cls, r.count, r.clientIP);
  tally(byClass, r.verifiedBotCategory ? `${CLASS_LABEL[cls]} (${r.verifiedBotCategory})` : CLASS_LABEL[cls], cls, r.count, r.clientIP);
  tally(byCountry, r.clientCountryName || '??', cls, r.count, r.clientIP);
  const client = tally(byClient, r.clientIP, cls, r.count, null);
  client.ua = client.ua || r.userAgent;
  client.country = client.country || r.clientCountryName;
  client.slugs = clientSlugs.get(r.clientIP)?.size || 0;
}
for (const r of kept) {
  const host = hostOf(r.clientRequestHTTPHost);
  if (!SITE_HOSTS.has(host)) byOther.set(host, (byOther.get(host) || 0) + r.count);
}

const rank = (map) => [...map.entries()].sort((a, b) => b[1].total - a[1].total);
// A page this checkout publishes that nothing in the window asked for. The
// browser column is what counts here: a slug whose only opens were a crawler's
// is untouched in the sense the question means.
const untouched = published
  ? published.filter(({ path }) => (bySlug.get(slugOf(path))?.split[BROWSER] || 0) === 0).map((d) => d.name)
  : null;
const openTotal = opened.reduce((a, r) => a + r.count, 0);
const humanOpens = opened.filter((r) => classify(r) === BROWSER);
const humanTotal = humanOpens.reduce((a, r) => a + r.count, 0);
const humanClients = new Set(humanOpens.map((r) => r.clientIP)).size;
const botTotal = opened.filter((r) => [VERIFIED, BOT].includes(classify(r))).reduce((a, r) => a + r.count, 0);

if (JSON_OUT) {
  console.log(JSON.stringify({
    zone: { name: ZONE_NAME, id: zone.id, plan: zone.plan, since: zone.since },
    window: { from: from.toISOString(), to: to.toISOString() },
    zoneRequests: totalZone.httpRequestsOverviewAdaptiveGroups[0]?.sum || null,
    days: dayZone.httpRequests1dGroups.map((d) => ({ date: d.dimensions.date, ...d.sum, uniques: d.uniq.uniques })),
    slugs: rank(bySlug).map(([slug, e]) => ({ slug, opens: e.total, clients: e.clients.size, split: e.split })),
    classes: rank(byClass).map(([k, e]) => ({ who: k, requests: e.total, clients: e.clients.size })),
    countries: rank(byCountry).map(([k, e]) => ({ country: k, opens: e.total, clients: e.clients.size })),
    clients: rank(byClient).slice(0, 20).map(([ip, e]) => ({ ip, country: e.country, opens: e.total, slugs: e.slugs, ua: e.ua })),
    sweeps: { threshold: SWEEP_SLUGS, addresses: sweepers.size, opens: sweptOpens, excluded: NO_SWEEPS },
    untouched,
    otherHosts: [...byOther.entries()].sort((a, b) => b[1] - a[1]),
    refused: [...refused.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50),
  }, null, 2));
  process.exit(0);
}

// ── print ───────────────────────────────────────────────────────────────────

const span = `${from.toISOString().slice(0, 16).replace('T', ' ')} to ${to.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
console.log(`\n${ZONE_NAME} · zone ${zone.id} · ${zone.plan} · live since ${zone.since}`);
console.log(`window ${span}`);
if (clamped) console.log('clamped to 30 days: Cloudflare keeps no per-path detail for this zone before that.');
if (WITHOUT.size) console.log(`excluding ${[...WITHOUT].join(', ')}`);

const t = totalZone.httpRequestsOverviewAdaptiveGroups[0]?.sum;
if (t) console.log(`whole zone in that window: ${n(t.requests)} requests · ${mb(t.bytes)}`);

heading('every day on the zone');
console.log(pad('date', 12) + lpad('requests', 10) + lpad('page views', 12) + lpad('visitors', 10) + lpad('bytes', 11));
const today = day(Date.now());
for (const d of dayZone.httpRequests1dGroups) {
  console.log(pad(d.dimensions.date, 12) + lpad(n(d.sum.requests), 10) + lpad(n(d.sum.pageViews), 12)
    + lpad(n(d.uniq.uniques), 10) + lpad(mb(d.sum.bytes), 11)
    + (d.dimensions.date === today ? '  so far' : ''));
}
console.log('\nvisitors is Cloudflare\'s own daily estimate for the whole zone, bots included.');

heading('what was opened');
console.log(pad('slug', 20) + lpad('opens', 8) + lpad('clients', 9) + CLASSES.map((c) => lpad(CLASS_HEAD[c], 10)).join(''));
for (const [slug, e] of rank(bySlug)) {
  console.log(pad(slug, 20) + lpad(n(e.total), 8) + lpad(n(e.clients.size), 9) + splitCells(e.split));
}
console.log(`\n${n(openTotal)} page opens · ${n(humanTotal)} from something that looks like a browser,`);
console.log(`on ${n(humanClients)} distinct addresses · at least ${n(botTotal)} from a crawler or a scanner.`);
if (NO_SWEEPS) {
  console.log(`\n--no-sweeps: ${n(sweptOpens)} opens from ${n(sweepers.size)} address(es) that each touched`);
  console.log(`${SWEEP_SLUGS} or more different slugs are NOT in the table above.`);
} else if (sweepers.size) {
  console.log(`\n${n(sweptOpens)} of those opens came from ${n(sweepers.size)} address(es) that each touched`);
  console.log(`${SWEEP_SLUGS} or more different slugs, which is a sweep of the index rather than a visit.`);
  console.log('Run again with --no-sweeps to see the table without them.');
}

heading('nobody opened these in a browser');
if (untouched === null) {
  console.log('demo/manifest.mjs would not import, so this list could not be built.');
} else if (!untouched.length) {
  console.log(`Every one of the ${published.length} slugs this checkout publishes was opened at least once.`);
} else {
  console.log(untouched.join(' · '));
  console.log(`\n${untouched.length} of ${published.length} slugs in THIS CHECKOUT, which is not the same list as`);
  console.log('what is deployed. A page added since the last deploy cannot have been opened.');
}

heading('who asked');
console.log(pad('class', 42) + lpad('opens', 9) + lpad('clients', 9));
for (const [who, e] of rank(byClass)) console.log(pad(who, 42) + lpad(n(e.total), 9) + lpad(n(e.clients.size), 9));
console.log('\nA crawler wearing an ordinary browser user agent is counted as a browser.');
console.log('The two figures that would catch it, bot score and JS detection, are refused on this plan.');

heading('where from');
const geo = rank(byCountry).slice(0, 16);
console.log(geo.map(([c, e]) => `${c} ${n(e.total)}`).join(' · ') || 'nothing');
console.log('\nNo referrer is readable on a Free zone, so this is the only origin signal there is.');

heading('busiest clients');
console.log('One of these is probably you. `--without <address>` drops it from every table above.');
console.log('`slugs` is how many different pages it touched. A high one is a sweep, not a reader.');
console.log(pad('address', 40) + lpad('cc', 4) + lpad('opens', 8) + lpad('slugs', 7) + '  agent');
for (const [ip, e] of rank(byClient).slice(0, 12)) {
  const ua = (e.ua || '(no user agent)').replace(/^Mozilla\/5\.0 /, '');
  console.log(pad(ip, 40) + lpad(e.country || '??', 4) + lpad(n(e.total), 8) + lpad(n(e.slugs), 7)
    + '  ' + (ua.length > 52 ? ua.slice(0, 51) + '…' : ua));
}

if (refused.size) {
  const refusals = [...refused.entries()].sort((a, b) => b[1] - a[1]);
  const total = refusals.reduce((a, [, c]) => a + c, 0);
  heading('asked for and not served');
  console.log(pad('what', 46) + lpad('times', 8));
  for (const [what, c] of refusals.slice(0, 12)) console.log(pad(what, 46) + lpad(n(c), 8));
  console.log(`\n${n(total)} refusals over ${n(refusals.length)} distinct paths. These are NOT in any table above.`);
}

if (byOther.size) {
  heading('other hosts on this zone');
  console.log([...byOther.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
    .map(([h, c]) => `${h} ${n(c)}`).join(' · '));
  console.log('Counted for completeness. They are other workers and are not demo pages.');
}

console.log('');
