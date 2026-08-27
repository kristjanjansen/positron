// proto/jam/harness/report.mjs — final matrix report from results/*.json.
//   node harness/report.mjs
// Adds what run-bench's inline table doesn't show: burst-vs-sparse phase
// split, stall shares (>50/>200 ms), missing-seq counts, JSON-vs-binary delta.

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RES = join(dirname(fileURLToPath(import.meta.url)), '..', 'results');
const pct = (s, p) => s.length ? s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))] : null;
const f = (x, d = 2) => x === null || x === undefined ? '—' : x.toFixed(d);

async function row(runId) {
  let j;
  try { j = JSON.parse(await readFile(join(RES, runId + '.json'), 'utf8')); }
  catch { return null; }
  const all = j.recs.map((r) => [r[0], r[1] / 1000]);
  const phase = (lo, hi) => all.filter((r) => r[0] >= lo && r[0] < hi).map((r) => r[1]).sort((a, b) => a - b);
  const ows = all.map((r) => r[1]).sort((a, b) => a - b);
  const sent = j.sent;
  const scale1 = sent === 550;
  const burst = scale1 ? phase(0, 400) : [];
  const sparse = scale1 ? phase(400, 475) : [];
  return {
    runId, sent, recv: j.recv, loss: (1 - j.recv / sent) * 100,
    p50: pct(ows, 50), p95: pct(ows, 95), p99: pct(ows, 99), max: ows[ows.length - 1],
    jit: pct(ows, 95) - pct(ows, 50),
    over50: ows.filter((x) => x > 50).length / ows.length * 100,
    over200: ows.filter((x) => x > 200).length / ows.length * 100,
    burstP50: pct(burst, 50), burstP95: pct(burst, 95),
    sparseP50: pct(sparse, 50), sparseP95: pct(sparse, 95),
  };
}

const ORDER = [
  ['dc-rel', 'DC-direct P2P ordered+reliable'],
  ['dc-unrel', 'DC-direct P2P unordered+maxRtx:0'],
  ['dcturn0-rel', 'DC via local TURN, 0% loss, reliable'],
  ['dcturn0-unrel', 'DC via local TURN, 0% loss, unrel'],
  ['dcturn2-rel', 'DC via local TURN, 2% UDP loss, RELIABLE'],
  ['dcturn2-unrel', 'DC via local TURN, 2% UDP loss, UNREL'],
  ['sfu-rel', 'CF SFU DataChannel reliable'],
  ['sfu-unrel', 'CF SFU DataChannel unordered+maxRtx:0'],
  ['sfu-rel-loss', 'CF SFU DC reliable + CDP2% (no-op check)'],
  ['sfu-unrel-loss', 'CF SFU DC unrel + CDP2% (no-op check)'],
  ['cues-json', 'DO relay elektron-cues (JSON, parsed)'],
  ['jam-json', 'DO relay elektron-jam (JSON verbatim)'],
  ['jam-bin', 'DO relay elektron-jam (16-B binary)'],
  ['jam-bin-cdploss', 'DO binary + CDP2% (no-op check)'],
  ['legacy-json', 'legacy wss://data.elektron.art (JSON)'],
  ['moq-bin', 'MoQ d14 @moq/net (group per note)'],
  ['moq-bin-cdploss', 'MoQ + CDP2% (no-op check)'],
  ['moq-dgram', 'MoQ datagram mode (expect dead on IETF)'],
  ['wslocal-bin', 'local ws relay :8895 (binary)'],
  ['wslocal-json', 'local ws relay :8895 (JSON)'],
  ['wsdocker-bin-loss0', 'local ws relay in Docker, 0% (control)'],
  ['wsdocker-bin-loss2', 'local ws relay in Docker, 2% TCP loss'],
  ['dc-rel-loss', 'DC-direct rel + CDP2% (no-op check)'],
  ['dc-unrel-loss', 'DC-direct unrel + CDP2% (no-op check)'],
];

console.log('run                    n(recv/sent) loss%   p50    p95    p99    max   jit  >50ms >200ms | burst p50/p95 | sparse p50/p95');
for (const [id, label] of ORDER) {
  const r = await row(id);
  if (!r) { console.log(`${id.padEnd(22)} (missing)`); continue; }
  console.log(
    `${id.padEnd(22)} ${String(r.recv).padStart(4)}/${String(r.sent).padEnd(4)} ${f(r.loss, 1).padStart(5)} ${f(r.p50).padStart(6)} ${f(r.p95).padStart(6)} ${f(r.p99).padStart(6)} ${f(r.max, 0).padStart(5)} ${f(r.jit, 1).padStart(5)} ${f(r.over50, 1).padStart(5)} ${f(r.over200, 1).padStart(5)}  | ${f(r.burstP50)}/${f(r.burstP95)} | ${f(r.sparseP50)}/${f(r.sparseP95)}   ${label}`,
  );
}
const jb = await row('jam-bin'), jj = await row('jam-json');
if (jb && jj) console.log(`\nJSON-vs-binary (same DO relay): p50 delta ${f(jj.p50 - jb.p50)} ms, p95 delta ${f(jj.p95 - jb.p95)} ms (json ${f(jj.p50)}/${f(jj.p95)} vs bin ${f(jb.p50)}/${f(jb.p95)})`);
const wb = await row('wslocal-bin'), wj = await row('wslocal-json');
if (wb && wj) console.log(`JSON-vs-binary (local ws, zero network): p50 delta ${f(wj.p50 - wb.p50)} ms (json ${f(wj.p50)} vs bin ${f(wb.p50)})`);
