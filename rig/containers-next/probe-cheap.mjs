#!/usr/bin/env node
// Cold start to the first answer on a path that spawns nothing (/ready, a 404
// from server.mjs), so neither runtime pays the first ffmpeg exec that /health
// does. Legacy waits 8 s after destroy (its instance slot is not released for
// about 6 s, measured in probe.mjs); new waits the same 8 s so the two are
// treated alike. Interleaved, 5 cycles each.
import fs from "fs";
const RT = { legacy: "https://positron-cnt-test.kristjan-jansen.workers.dev", next: "https://positron-cnt-next.kristjan-jansen.workers.dev" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const N = +(process.argv[2] || 5), SETTLE = 8000;
const out = { at: new Date().toISOString(), N, SETTLE, legacy: [], next: [] };
for (const b of Object.values(RT)) await fetch(`${b}/health`).then((r) => r.text());
for (let i = 0; i < N; i++) for (const [name, b] of Object.entries(RT)) {
  await fetch(`${b}/kill`).then((r) => r.text()); await sleep(SETTLE);
  const t0 = performance.now(); const r = await fetch(`${b}/ready`); await r.text();
  const rec = { status: r.status, clientMs: +(performance.now() - t0).toFixed(1), edgeMs: +r.headers.get("x-edge-ms"),
    readyMs: r.headers.get("x-ready-ms") ? +r.headers.get("x-ready-ms") : null, doMs: r.headers.get("x-do-ms") ? +r.headers.get("x-do-ms") : null,
    proxyMs: r.headers.get("x-proxy-ms") ? +r.headers.get("x-proxy-ms") : null, ray: (r.headers.get("cf-ray") || "").split("-")[1] };
  out[name].push(rec); console.error(name, i, JSON.stringify(rec));
}
for (const b of Object.values(RT)) await fetch(`${b}/kill`).then((r) => r.text());
fs.writeFileSync(new URL(`./cheap-${out.at.replace(/[:.]/g, "-")}.json`, import.meta.url), JSON.stringify(out, null, 1));
