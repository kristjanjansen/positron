// workers/view/analytics.mjs — which demos does anybody actually open.
//
//   node workers/view/analytics.mjs                    the last 24 hours
//   node workers/view/analytics.mjs --days 7           merge seven days, one query each
//   node workers/view/analytics.mjs --since 2026-09-10 from that date to now
//   node workers/view/analytics.mjs --no-sweeps        drop clients that walked the index
//   node workers/view/analytics.mjs --without 1.2.3.4  drop a client, usually yours
//   node workers/view/analytics.mjs --json             the same numbers, machine readable
//
// A day is one round trip and about a second. Seven days is seven of them.
//
// NODE ONLY, READ ONLY. It asks Cloudflare's GraphQL Analytics API about the
// `positron.studio` zone and prints. It changes no setting, adds no rule and
// purges nothing. It is not a demo page and has no `mount()`; `verify.mjs` does
// not see it.
//
// 🔴 IT LIVES HERE BECAUSE `workers/view` IS WHAT SERVES THAT ZONE. LAYOUT.md's
// rule is that a directory says WHO RUNS IT, and this runs on the laptop rather
// than on Cloudflare. So does `deploy.mjs`, and so does `build.mjs`: the
// standing pattern is that laptop-side tooling for a worker lives beside the
// worker it acts on. ⚠️ THE ZONE IS WIDER THAN THIS WORKER. `pub`, `shout`,
// `items`, `backlog`, `relay` and the rest are all hosts on `positron.studio`,
// so the zone totals cover them too. Everything that rolls up BY SLUG is
// filtered to `positron.studio` and `www.positron.studio` first, which is the
// site this worker serves.
//
// ── WHAT THE NUMBERS DO NOT MEAN ────────────────────────────────────────────
//
// 🔴 A REQUEST COUNT IS NOT A PERSON, AND ON THIS ZONE MOST OF IT IS US.
// MEASURED 2026-09-16 over 24 hours: the single busiest user agent was a
// desktop Chrome on one Estonian address, the second was a Quest 3, and the
// third was `HeadlessChrome`. Those are this repo's owner, this repo's headset
// and this repo's own `verify.mjs`. A "visitors" figure taken off the top of
// this data and quoted anywhere would be mostly a measurement of us working.
// That is why every table here splits four ways rather than printing one total.
//
// 🔴 AND THE BOT SHARE IS A FLOOR, NEVER A TOTAL. Three layers are readable on
// a Free zone and each one sees something different:
//   · `verifiedBotCategory` is Cloudflare's own verification, so it is the only
//     layer that cannot be faked. It caught 58 requests of 13,350 in that same
//     day, which is not the bot share, it is the HONEST bot share.
//   · the user agent string, which catches a crawler that says what it is
//     (Baiduspider, OAI-SearchBot, a LeakIX vulnerability scanner) and catches
//     nothing at all from one that does not.
//   · headless and command-line clients, which on this site are overwhelmingly
//     our own harnesses.
// A headless crawler wearing an ordinary Chrome user agent is INVISIBLE here.
// `botScore`, `botManagementDecision` and `jsDetectionPassed` are the fields
// that would see it and all three are refused on this plan by name, MEASURED,
// not assumed. The floor is the accepted price of a Free zone. Say "at least",
// never "only".
//
// ⚠️ THERE IS NO REFERRER ON THIS PLAN. `clientRefererHost` and
// `clientRequestReferer` are both refused for this zone, so "where did they
// come from" is answerable as a COUNTRY and not as a link. Do not quote an
// empty referrer table as evidence that nobody links here.
//
// ⚠️ A PAGE OPEN IS COUNTED AS AN HTML RESPONSE, NOT AS A SESSION. A reload is
// a second open, a page kept in a tab for an hour is one, and a page opened
// from the browser's back-forward cache is none. `clients` is distinct client
// addresses, which merges a household behind one address and splits one phone
// that changed network.
//
// ── WHAT IT ASKS FOR, AND WHY THOSE DATASETS ────────────────────────────────
//
// `httpRequests1dGroups` for the day table. It is pre-aggregated rather than
// sampled, it carries Cloudflare's own `uniques`, and MEASURED it reaches 365
// days back on this zone. It cannot break a day down by path.
//
// `httpRequestsAdaptiveGroups` for everything per slug, because it is the only
// dataset with `clientRequestPath` on it. Two measured limits shape the code:
//   🔴 ONE QUERY MAY SPAN AT MOST ONE DAY on this zone, so a week is seven
//      queries merged here rather than one query with a wider filter. The
//      refusal is an error inside a 200 response, which is the failure shape
//      the whole API has.
//   🔴 `count` IS ALREADY THE ESTIMATE. The dataset is sampled and carries
//      `avg.sampleInterval`, so the obvious move is to multiply. PROVED WRONG
//      on 2026-09-15, a whole UTC day: `count` with `requestSource: eyeball`
//      read 22,672 where the unsampled `httpRequests1dGroups` read 22,732,
//      which is 0.26% apart, while `count` times the 1.54 average interval
//      would have read about 35,000. Multiplying would inflate every figure on
//      this page by half.
// `requestSource: "eyeball"` is what makes those two agree: the zone also
// carries `edgeWorkerFetch`, the worker's own subrequests, which are real
// traffic and are not a visitor.
//
// ── AUTHENTICATION ──────────────────────────────────────────────────────────
//
// 🔴 THE MACHINE'S WRANGLER OAUTH TOKEN IS ENOUGH. No API token has to be
// minted; `zone:read` and `account:read` in the OAuth grant carry the whole
// query. It is read out of wrangler's own config file rather than from an
// environment variable, so there is nothing to export and nothing to rotate.
// ⚠️ IT EXPIRES ABOUT HOURLY. When it has, this shells out to
// `npx wrangler whoami`, which refreshes it in place, and reads the file again.
// ⚠️ `.env` IN THE CWD SHADOWS MACHINE OAUTH (CLAUDE.md), and the repo root
// holds one with live secrets. Both spawns unset `CF_API_TOKEN` and
// `CLOUDFLARE_API_TOKEN` and run from this directory, which is the same fix
// `deploy.mjs` uses and the one nobody has to remember.
// 🔴 THE TOKEN NEVER REACHES A LOG. It is never printed, never interpolated
// into a message, and never put on a command line. An error from the API is
// reported by its own text, which carries no credential.

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
// MEASURED on this zone: a wider filter is refused by name. See the header.
const MAX_SPAN_HOURS = 24;

/**
 * 🔴 HOW MANY DIFFERENT SLUGS ONE ADDRESS HAS TO TOUCH BEFORE IT IS A SWEEP
 * RATHER THAN A VISIT. This is the one thing that sees the crawler a free zone
 * cannot: MEASURED over seven days, four addresses in one OVH range opened
 * forty-odd different demos each with an ordinary Windows Chrome user agent,
 * four requests apart, and every layer above classed them as a browser.
 * Nobody reads forty demos in a week. A person who does is rare enough that
 * losing them from one table is the cheaper mistake.
 * ⚠️ IT IS A HEURISTIC AND IT IS LABELLED AS ONE EVERYWHERE IT IS PRINTED. It
 * is never subtracted silently, and `--no-sweeps` has to be typed.
 */
const SWEEP_SLUGS = 10;

// ── who is asking ───────────────────────────────────────────────────────────
//
// Order matters and it is not alphabetical. `HeadlessChrome` contains
// "headless", which the crawler pattern also matches, so ours is tested first
// or every harness run is reported as somebody else's crawler.

/** Our own harnesses and command-line tools. */
const OURS = /HeadlessChrome|^curl\/|^node$|wrangler|undici|positron-corpus/i;

/** A client that says it is a crawler, a scanner, or not a browser at all.
 *  The first half is lifted from the sibling project's `bot.ts`, which is the
 *  same list Cloudflare's own free AI Crawl Control matches on. The second half
 *  is what actually turned up in this zone's logs. */
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

/**
 * The slug a path belongs to. `/` is the index, `/videoradio/` is a demo,
 * `/proto/deck/` keeps both segments because that is where those pages live.
 * ⚠️ It returns the path unchanged when it does not recognise the shape, so a
 * scanner probing `/wp-config.php` shows up as itself rather than as a slug
 * that does not exist.
 */
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

/**
 * A live OAuth token, refreshing it through wrangler if it has expired.
 *
 * ⚠️ THE REFRESH IS WRANGLER'S, NOT OURS. `wrangler whoami` exchanges the
 * refresh token and rewrites the config in place; doing that by hand here would
 * mean a second implementation of a credential rotation, and a bug in it would
 * log the user out of every other tool on this machine.
 */
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
    // ⚠️ stderr, NOT stdout. MEASURED: as a `console.log` this line landed on
    // top of `--json` output and made it unparseable, roughly once an hour and
    // never twice in a row, which is the shape of a bug nobody can reproduce.
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

/**
 * 🔴 A GRAPHQL FAILURE ARRIVES AS HTTP 200 WITH AN `errors` ARRAY AND A NULL
 * `data`. Nothing about the response status says anything went wrong, so a
 * caller that only checks `r.ok` prints an empty table and calls it a quiet
 * week. Both halves are checked here and the API's own words are shown.
 */
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

/**
 * Every slug this repo publishes, so a page nobody opened can be NAMED. Half
 * the question "which demos does anybody open" is the list that never appears
 * in the table, and a table can only show what has a row.
 *
 * ⚠️ IT READS THE CHECKOUT AND THE CHECKOUT CAN DISAGREE WITH THE DEPLOY. A
 * page added since the last deploy has no traffic because it is not live yet,
 * which is not the same finding as a live page nobody wants. Both the heading
 * and this comment say so rather than implying a verdict.
 * ⚠️ AND IT IS ALLOWED TO FAIL. `manifest.mjs` is edited constantly and may be
 * half-written when this runs. A broken import costs this one section and
 * nothing else, which is why it is caught here instead of at the top.
 */
async function publishedSlugs() {
  try {
    const m = await import(new URL('../../demo/manifest.mjs', import.meta.url).href);
    // ⚠️ `targetOf` RETURNS A LINK, NOT A PATH. Four rows read `/mirror/?xr=1`,
    // and `clientRequestPath` never carries a query, so comparing the two
    // directly reported four pages as untouched while the table above them
    // showed their opens. It cost one run and it was visible only because the
    // two lists disagreed on the same screen.
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

// A failure here is nearly always Cloudflare saying no in words worth reading,
// and a Node stack trace buries those words under five lines of this file's own
// internals. Print what the API said and stop.
// ⚠️ IT IS SAFE TO PRINT: every message this file raises is built from the
// API's own text or from a constant. The token is never interpolated into one.
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

// 🔴 CLAMP BEFORE ASKING, NOT AFTER. MEASURED: this zone refuses
// `httpRequestsAdaptiveGroups` older than 4w3d and refuses any single query
// wider than a day, so a `--since 2026-01-01` typed by somebody who has not
// read the header is 260 round trips that all fail the same way. Cut it here,
// say so, and ask once.
// ⚠️ AN `Invalid Date` COMPARES FALSE AGAINST EVERYTHING, so it slips past both
// of the checks below and fails four calls later inside `pageRows`, with a
// message about a filter rather than about the flag that was typed wrong.
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
    // 🔴 BY PATH, NOT BY CODE ALONE. This section said "mostly vulnerability
    // scanners walking a wordlist" over a bare count of 403s, which was a
    // guess dressed as a caption: nothing in a status code names what was
    // asked for, and a 403 on `/` is a completely different event from a 403
    // on `/wp-config.php`. Print what was refused and let the reader decide.
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
