// build.mjs — assemble workers/view/public/ from the repo's protos.
//
// Why a build step instead of pointing wrangler's `assets.directory` at the
// repo root: the repo root holds `.env` (13 live secrets). An assets directory
// is uploaded VERBATIM AND PUBLICLY. So we copy an explicit allowlist of files
// — never a directory glob — into public/, and nothing else can leak.
//
// The layout MIRRORS THE REPO on purpose. Every page's imports then resolve
// untouched, exactly as they do under its own dev server:
//   proto/kurenniemi  `../../timeline/transport.mjs` → /timeline/transport.mjs
//   proto/remixer     `/timeline/transport.mjs`      → /timeline/transport.mjs
//   proto/megatimeline `./viewport.mjs`              → /proto/megatimeline/…
//   proto/megatimeline `/census.json`                → ROOT copy (hence two)
// That is the "solve it in the asset layout, not in the proto" rule.
//
// The JSONL caches (megatimeline's committed search/item caches) are EXPLODED
// into one static JSON file per entry, addressed by a canonical hash of the
// query. A cache hit is then a plain static asset read — no JSONL parsing, no
// Durable Object, no upstream call, ever. That is what keeps ERR calls at zero
// for the queries we already have on disk.

import zlib from 'node:zlib';
import { mkdir, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, join, extname } from 'node:path';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const OUT = join(HERE, 'public');

// the demo story order, single-sourced from demo/manifest.mjs
const { DEMOS: DEMO_MANIFEST } = await import(new URL('../../demo/manifest.mjs', import.meta.url));

// ── the allowlist ───────────────────────────────────────────────────────────
// [ repo-relative source, public/-relative destination ]
const FILES = [
  // shared timeline library — loaded by remixer and kurenniemi, never copied
  // into either proto. One canonical copy, same as the dev servers alias.
  ['timeline/transport.mjs', 'timeline/transport.mjs'],
  ['timeline/media-master.mjs', 'timeline/media-master.mjs'],

  // 1. megatimeline
  ['proto/megatimeline/index.html', 'proto/megatimeline/index.html'],
  ['proto/megatimeline/viewport.mjs', 'proto/megatimeline/viewport.mjs'],
  ['proto/megatimeline/gesture.mjs', 'proto/megatimeline/gesture.mjs'],
  ['proto/megatimeline/census.json', 'census.json'], // page fetches '/census.json'

  // 2. remixer
  ['proto/remixer/index.html', 'proto/remixer/index.html'],
  ['proto/remixer/hls.min.js', 'proto/remixer/hls.min.js'],

  // 3. kurenniemi (corpus + archive.org media; nothing proxied)
  ['proto/kurenniemi/index.html', 'proto/kurenniemi/index.html'],
  ['proto/kurenniemi/corpus.json', 'proto/kurenniemi/corpus.json'],

  // 4. flipper (live ERR channels; streams are CORS-clear, no proxy)
  ['proto/flipper/index.html', 'proto/flipper/index.html'],
  ['proto/flipper/hls.min.js', 'proto/flipper/hls.min.js'],

  // 5. looper — an INSTRUMENT, not a viewer, and the first page here with no
  // upstream of any kind: no ERR, no proxy, no Durable Object, no network at
  // all once loaded. It needs three more library modules than the viewers do,
  // and the AudioWorklet processor, which is fetched at runtime by URL
  // (`addModule('./onset-worklet.js')`) rather than imported — easy to forget,
  // and the failure mode is a silent ear that detects nothing.
  ['timeline/nested.mjs', 'timeline/nested.mjs'],
  ['timeline/score.mjs', 'timeline/score.mjs'],
  ['timeline/logdeck.mjs', 'timeline/logdeck.mjs'],       // nested.mjs imports pstats
  ['proto/looper/index.html', 'proto/looper/index.html'],
  ['proto/looper/looper.mjs', 'proto/looper/looper.mjs'],
  ['proto/looper/synth.mjs', 'proto/looper/synth.mjs'],
  ['proto/looper/peer.mjs', 'proto/looper/peer.mjs'],
  ['proto/looper/onset-worklet.js', 'proto/looper/onset-worklet.js'],

  // ── the demo sequence (plan-demos.md) ─────────────────────────────────────
  // strip.mjs is REQUIRED here: every Act 0 demo imports it, and
  // proto/megatimeline/index.html has imported /timeline/strip.mjs since
  // commit 3647696 without it ever being allowlisted — which is why
  // megatimeline has been dead on the public URL. Adding it fixes both.
  ['timeline/strip.mjs', 'timeline/strip.mjs'],
  ['demo/index.html', 'demo/index.html'],
  ['demo/manifest.mjs', 'demo/manifest.mjs'],
  ['demo/shell/shell.css', 'demo/shell/shell.css'],
  ['demo/shell/shell.mjs', 'demo/shell/shell.mjs'],
  ['demo/shell/transport-bar.mjs', 'demo/shell/transport-bar.mjs'],
  ['demo/shell/strip.mjs', 'demo/shell/strip.mjs'],
  ['demo/shell/fixture.mjs', 'demo/shell/fixture.mjs'],
  ['demo/shell/archive.mjs', 'demo/shell/archive.mjs'],
  ['demo/notes/index.html', 'demo/notes/index.html'],
  ['demo/notes/uuu-positron.md', 'demo/notes/uuu-positron.md'],
  ...demoFiles(),
];

/**
 * Allowlist entries for every BUILT demo, generated from demo/manifest.mjs so
 * the list stops being hand-maintained (plan-demos.md, order of work step 8).
 *
 * This reads a directory, which the rule above forbids — but the rule exists
 * because the REPO ROOT holds .env. Enumeration here is confined to
 * demo/<nn>-<name>/ and filtered to web extensions, so there is no path by
 * which a secret enters public/.
 */
function demoFiles() {
  const out = [];
  const OK = new Set(['.html', '.mjs', '.js', '.css', '.json']);
  for (const d of DEMO_MANIFEST) {
    if (!d.built) continue;
    const dir = `demo/${d.n}-${d.name}`;
    let entries = [];
    try { entries = readdirSync(join(REPO, dir), { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isFile()) continue;
      if (!OK.has(extname(e.name))) continue;
      out.push([`${dir}/${e.name}`, `${dir}/${e.name}`]);
    }
  }
  return out;
}

// ── deployed-copy rewrites ──────────────────────────────────────────────────
// The ONLY edits made to any proto's bytes, applied to the COPY in public/.
// The files in proto/ are not touched. Each one exists because the source
// hardcodes a dev-server localhost URL that cannot resolve from a phone.
const REWRITES = {
  'proto/megatimeline/index.html': [
    // megatimeline's "PLAY IN REMIXER ↗" hand-off opens `${REMIXER}/?play=…`.
    // Hardcoded to the dev server's port, which is nothing on a phone.
    [`const REMIXER = 'http://localhost:8891';`, `const REMIXER = '/proto/remixer';`],
    // and the desktop help line that quotes the same port
    ['click item = play (remixer :8891)', 'click item = play (opens remixer)'],
  ],
  'proto/flipper/index.html': [
    // flipper has NO viewport meta. research/mobile-2026-08.md §3 lists exactly
    // this bug — "the single biggest bug on three of the four public surfaces"
    // — and fixed it in megatimeline, remixer, kurenniemi and replay. flipper
    // was not in that pass, so it still lays out at 980 px and a phone renders
    // it shrunk to ~40%. Measured at a true 390 px layout it is already fluid:
    // 0 px horizontal overflow, tiles and HUD intact, three live streams
    // playing. So the deployed copy gets the same one line the other three
    // carry, verbatim. proto/flipper/index.html itself is NOT modified — the
    // missing meta is a real gap in that proto and belongs in its own commit.
    ['<meta charset="utf-8">',
      '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'],
  ],
};

// ── canonical query hash (MUST match src/index.js byte for byte) ────────────
const canon = (v) =>
  Array.isArray(v) ? v.map(canon)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]))
      : v;

async function queryHash(queryParams) {
  const bytes = new TextEncoder().encode(JSON.stringify(canon(queryParams)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// ── favicon: a 32x32 PNG wrapped in an ICO container, built here ────────────
// e+ — the positron. A bold lowercase 'e' (a ring with a lower-right aperture
// plus a crossbar) and a superscript plus, in the menu's palette.
function favicon() {
  const N = 32, px = Buffer.alloc(N * N * 4);
  const put = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= N || y >= N) return;
    const i = (y * N + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
  };
  const BG = [0x0b, 0x0e, 0x14], HI = [0xff, 0xd4, 0x00];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) put(x, y, BG);

  // the 'e': an annulus with the lower-right wedge removed
  const cx = 12.2, cy = 19.6, R = 9.6, r = 5.3;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d > R || d < r) continue;
    const a = (Math.atan2(y - cy, x - cx) * 180) / Math.PI;   // y down: +90 = down
    if (a > 22 && a < 88) continue;                            // the aperture
    put(x, y, HI);
  }
  // the crossbar is what makes a ring an 'e'
  for (let y = Math.round(cy - 1.9); y <= Math.round(cy + 1.3); y++)
    for (let x = Math.round(cx - R + 1); x <= Math.round(cx + R - 1); x++) put(x, y, HI);

  // the superscript plus — the charge, and the whole name
  const pxc = 25, pyc = 8, arm = 4, th = 1;
  for (let x = pxc - arm; x <= pxc + arm; x++) for (let y = pyc - th; y <= pyc + th; y++) put(x, y, HI);
  for (let y = pyc - arm; y <= pyc + arm; y++) for (let x = pxc - th; x <= pxc + th; x++) put(x, y, HI);

  const raw = Buffer.alloc(N * (N * 4 + 1));
  for (let y = 0; y < N; y++) {
    raw[y * (N * 4 + 1)] = 0;                                               // filter: none
    px.copy(raw, y * (N * 4 + 1) + 1, y * N * 4, (y + 1) * N * 4);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4);
  ihdr[8] = 8; ihdr[9] = 6;                                                 // 8-bit RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  const dir = Buffer.alloc(22);                       // ICONDIR + one ICONDIRENTRY
  dir.writeUInt16LE(0, 0); dir.writeUInt16LE(1, 2); dir.writeUInt16LE(1, 4);
  dir[6] = N; dir[7] = N; dir[8] = 0; dir[9] = 0;
  dir.writeUInt16LE(1, 10); dir.writeUInt16LE(32, 12);
  dir.writeUInt32LE(png.length, 14); dir.writeUInt32LE(22, 18);
  return Buffer.concat([dir, png]);
}

// ── run ─────────────────────────────────────────────────────────────────────
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// the menu page — the only page this worker authors itself. Its list is
// GENERATED from demo/manifest.mjs (plan-demos.md step 8) so there is no second
// place to forget. Number and name only; a row with no target renders greyed.
{
  function rowHTML(d) {
  const href = d.built ? `/demo/${d.n}-${d.name}/` : (d.page || null);
  const tags = (d.tags || []).map((t) => `<span class="d-tag">${t}</span>`).join('');
  const why = !href && d.why ? `<span class="d-why">${d.why}</span>` : '';
  const open = href ? `<a href="${href}">` : '<a>';
  return `<li class="d-row${href ? '' : ' todo'}">${open}`
    + `<span class="n">${d.n}</span>`
    + `<span class="nm">${d.name}</span>`
    + `<span class="d-one">${d.one || ''}</span>`
    + `<span class="d-meta">${tags}${why}</span>`
    + '</a></li>';
}
  const rows = DEMO_MANIFEST.map((d) => '  ' + rowHTML(d)).join('\n');
  const menu = await readFile(join(HERE, 'menu.html'), 'utf8');
  if (!menu.includes('<!--DEMOS-->')) throw new Error('menu.html lost its <!--DEMOS--> marker');
  await writeFile(join(OUT, 'index.html'), menu.replace('<!--DEMOS-->', rows));
}

// favicon.ico — generated, not committed. Browsers request /favicon.ico for
// every page whether or not the HTML asks for one; without this the four
// protos (which declare no icon, and three of which we must not edit) each log
// a 404 to the console, and "zero console errors" stops being true.
await writeFile(join(OUT, 'favicon.ico'), favicon());

for (const [src, dst] of FILES) {
  const to = join(OUT, dst);
  await mkdir(dirname(to), { recursive: true });
  const rewrites = REWRITES[src];
  if (rewrites) {
    let text = await readFile(join(REPO, src), 'utf8');
    for (const [from, into] of rewrites) {
      if (!text.includes(from)) throw new Error(`rewrite target vanished in ${src}: ${from}`);
      text = text.split(from).join(into);
    }
    await writeFile(to, text);
    console.log(`  rewrote ${dst} (${rewrites.length} substitution(s))`);
  } else {
    await copyFile(join(REPO, src), to);
  }
}
console.log(`copied ${FILES.length} files`);

// explode the committed JSONL caches into addressable static assets
async function explode(jsonl, key2path) {
  let n = 0;
  const text = await readFile(join(REPO, jsonl), 'utf8');
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const { key, value } = JSON.parse(line);
    const rel = await key2path(key);
    if (!rel) continue;
    const to = join(OUT, rel);
    await mkdir(dirname(to), { recursive: true });
    // `value` is the upstream response body, already a JSON string
    await writeFile(to, typeof value === 'string' ? value : JSON.stringify(value));
    n++;
  }
  return n;
}

const nSearch = await explode('proto/megatimeline/search-cache.jsonl', async (key) => {
  // dev-server key === JSON.stringify(body.queryParams)
  return `cache/search/${await queryHash(JSON.parse(key))}.json`;
});
const nItem = await explode('proto/megatimeline/items-cache.jsonl', async (key) => {
  const m = key.match(/^(audio|video|photo):([a-z0-9-]+)$/);
  return m ? `cache/item/${m[1]}/${m[2]}.json` : null;
});
console.log(`cache: ${nSearch} search results, ${nItem} items — served as static assets`);
