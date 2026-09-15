// megatimeline census — one POST /search per year 1908–2026, limit 1.
// Runs ONCE (resumable: years already in census.json are skipped), writes
// census.json after every year. Plain node ESM, no deps, direct upstream
// (node-side — no CORS involved).
//
// Politeness (architectural): 1.1 s spacing between requests, identifying
// User-Agent, limit 1 (tiny responses). Measured discovery (probe
// 2026-08-27): every search response's activeList carries audioCount,
// videoCount AND photoCount for the time-filtered query regardless of the
// `type` param → ONE request per year covers all three tracks
// (119 requests total, ~2.2 min — not the 354 a per-type census would cost).

import https from 'node:https';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, 'census.json');
const FROM_YEAR = 1908;
const TO_YEAR = 2026;
const SPACING_MS = 1100;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function searchBody(year) {
  return JSON.stringify({
    queryParams: {
      phrase: '*', type: 'all', sortOption: 'old', page: 1, limit: 1,
      timeRange: 'custom',
      timeRangeFrom: Date.UTC(year, 0, 1) / 1000,
      timeRangeTo: Date.UTC(year + 1, 0, 1) / 1000 - 1,
      includeTranscription: false, advancedParams: [],
    },
  });
}

function post(body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: 'arhiiv.err.ee', path: '/api/v1/search', method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'positron-megatimeline-proto/0.1',
        },
      },
      (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve({ status: res.statusCode || 0, body: b }));
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.setTimeout(25000, () => req.destroy(new Error('upstream timeout')));
    req.end(body);
  });
}

async function loadExisting() {
  try {
    return JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    return {
      source: 'arhiiv.err.ee /api/v1/search, one query per UTC year, type:all',
      note: 'counts = activeList.{audioCount,videoCount,photoCount}; UTC year ranges leak ±2-3h at edges (EET local-midnight epochs)',
      generatedAt: null,
      years: {},
    };
  }
}

async function save(census) {
  const tmp = OUT + '.tmp';
  await writeFile(tmp, JSON.stringify(census, null, 1));
  await rename(tmp, OUT);
}

const census = await loadExisting();
const todo = [];
for (let y = FROM_YEAR; y <= TO_YEAR; y++) if (!census.years[y]) todo.push(y);
console.log(`census: ${Object.keys(census.years).length} years cached, ${todo.length} to fetch`);

let requests = 0;
for (const y of todo) {
  const t0 = Date.now();
  try {
    const r = await post(searchBody(y));
    requests++;
    if (r.status !== 200) throw new Error(`http ${r.status}: ${r.body.slice(0, 200)}`);
    const al = JSON.parse(r.body).activeList || {};
    if (al.audioCount == null || al.videoCount == null || al.photoCount == null) {
      throw new Error('counts missing from activeList: ' + JSON.stringify(Object.keys(al)));
    }
    census.years[y] = { audio: al.audioCount, video: al.videoCount, photo: al.photoCount };
    census.generatedAt = new Date().toISOString();
    await save(census);
    console.log(`${y}: audio ${al.audioCount} video ${al.videoCount} photo ${al.photoCount} (${Date.now() - t0} ms)`);
  } catch (e) {
    console.error(`${y}: FAILED — ${e.message} (resumable; rerun to continue)`);
    process.exitCode = 1;
    break;
  }
  await sleep(Math.max(0, SPACING_MS - (Date.now() - t0)));
}

const sums = { audio: 0, video: 0, photo: 0 };
for (const y of Object.values(census.years)) {
  sums.audio += y.audio; sums.video += y.video; sums.photo += y.photo;
}
console.log(`done: ${Object.keys(census.years).length}/${TO_YEAR - FROM_YEAR + 1} years, ${requests} requests this run`);
console.log(`totals: audio ${sums.audio} · video ${sums.video} · photo ${sums.photo}`);
