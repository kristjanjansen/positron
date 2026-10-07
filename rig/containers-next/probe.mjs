#!/usr/bin/env node
// Two follow-ups to measure.mjs, kept separate so the main run stays as it was.
//  A. new runtime: where the edge-minus-ready gap goes (x-do-ms, x-proxy-ms), 3 cycles
//  B. legacy: is the 503 after destroy a release delay? kill, wait SETTLE s, request; 3 cycles each at 2, 6, 12 s
import fs from "fs";
const LEGACY = "https://positron-cnt-test.kristjan-jansen.workers.dev";
const NEXT = "https://positron-cnt-next.kristjan-jansen.workers.dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function hit(url) {
  const t0 = performance.now(); const r = await fetch(url); const b = await r.text();
  const h = Object.fromEntries([...r.headers].filter(([k]) => k.startsWith("x-")));
  let up = null; try { up = JSON.parse(b).uptimeMs; } catch {}
  return { status: r.status, clientMs: +(performance.now() - t0).toFixed(1), h, uptimeMs: up, ray: (r.headers.get("cf-ray") || "").split("-")[1] };
}
const out = { at: new Date().toISOString(), A: [], B: [] };
await hit(`${NEXT}/health`);
for (let i = 0; i < 3; i++) {
  await fetch(`${NEXT}/kill`).then((r) => r.text()); await sleep(2000);
  const r = await hit(`${NEXT}/health`); out.A.push(r); console.error("A", JSON.stringify(r));
}
await fetch(`${NEXT}/kill`).then((r) => r.text());
await hit(`${LEGACY}/health`);
for (const settle of [2000, 6000, 12000]) for (let i = 0; i < 3; i++) {
  await fetch(`${LEGACY}/kill`).then((r) => r.text()); await sleep(settle);
  const t0 = performance.now(); const tries = [];
  for (let k = 0; k < 40; k++) { const r = await hit(`${LEGACY}/health`); tries.push(r); if (r.status === 200) break; await sleep(250); }
  const rec = { settle, totalMs: +(performance.now() - t0).toFixed(1), tries: tries.map((t) => ({ s: t.status, c: t.clientMs, e: t.h["x-edge-ms"], up: t.uptimeMs })) };
  out.B.push(rec); console.error("B", JSON.stringify(rec));
}
await fetch(`${LEGACY}/kill`).then((r) => r.text());
fs.writeFileSync(new URL(`./probe-${out.at.replace(/[:.]/g, "-")}.json`, import.meta.url), JSON.stringify(out, null, 1));
