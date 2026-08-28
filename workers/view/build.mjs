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
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const OUT = join(HERE, 'public');

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
];

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
// Dark ground, one yellow timeline rule with three ticks — the menu's palette.
function favicon() {
  const N = 32, px = Buffer.alloc(N * N * 4);
  const put = (x, y, [r, g, b]) => {
    const i = (y * N + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
  };
  const BG = [0x0b, 0x0e, 0x14], HI = [0xff, 0xd4, 0x00], DIM = [0x37, 0x3b, 0x45];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) put(x, y, BG);
  for (let x = 3; x < N - 3; x++) { put(x, 16, HI); put(x, 17, HI); }      // the rule
  for (const [x, h] of [[7, 11], [15, 7], [23, 9], [11, 5], [19, 5], [27, 4]])
    for (let y = 17 - h; y < 17; y++) for (let w = 0; w < 2; w++)
      put(x + w, y, h > 6 ? HI : DIM);                                      // ticks
  for (const [x, h] of [[9, 5], [17, 8], [25, 4]])
    for (let y = 18; y < 18 + h; y++) for (let w = 0; w < 2; w++) put(x + w, y, DIM);

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

// the menu page — the only page this worker authors itself
await copyFile(join(HERE, 'menu.html'), join(OUT, 'index.html'));

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
