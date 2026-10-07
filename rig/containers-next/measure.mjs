#!/usr/bin/env node
// Cold start of the legacy Container class against the new durable_object
// runtime, same image, same server.mjs, standard-1, same client, same hour.
// Cycles are INTERLEAVED (legacy, new, legacy, new...) so both runtimes see
// the same network and the same time of day.
//   node measure.mjs [N_COLD=10] [N_WARM=20] [N_SNAP=10] [N_FRESH=5]
// Writes results-<iso>.json beside this file. Ends with both containers
// destroyed.
import fs from "fs";

const LEGACY = "https://positron-cnt-test.kristjan-jansen.workers.dev";
const NEXT = "https://positron-cnt-next.kristjan-jansen.workers.dev";
const [N_COLD = 10, N_WARM = 20, N_SNAP = 10, N_FRESH = 5] = process.argv.slice(2).map(Number);
const KILL_SETTLE_MS = 2000;   // after destroy, before the timed request
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.error(...a);

async function hit(url) {
  const t0 = performance.now();
  const r = await fetch(url, { headers: { "cache-control": "no-store" } });
  const body = await r.text();
  const ms = performance.now() - t0;
  let j = null; try { j = JSON.parse(body); } catch {}
  const h = (k) => r.headers.get(k);
  return {
    status: r.status, clientMs: +ms.toFixed(1),
    edgeMs: h("x-edge-ms") != null ? +h("x-edge-ms") : null,
    readyMs: h("x-ready-ms") != null ? +h("x-ready-ms") : null,
    polls: h("x-polls") != null ? +h("x-polls") : null,
    cold: h("x-cold"), ray: (h("cf-ray") || "").split("-")[1] || null,
    uptimeMs: j && j.uptimeMs != null ? j.uptimeMs : null,
    location: j && j.env ? j.env.CLOUDFLARE_LOCATION || null : null,
    err: j && j.err ? j.err : (r.status !== 200 ? body.slice(0, 160) : null),
  };
}

// time from the first request to the first 200, retrying a non-200 every 250 ms
async function toFirst200(url) {
  const t0 = performance.now();
  const attempts = [];
  for (let i = 0; i < 40; i++) {
    const a = await hit(url);
    attempts.push(a);
    if (a.status === 200) {
      return { ...a, totalMs: +(performance.now() - t0).toFixed(1), attempts: attempts.length,
        nonOk: attempts.filter((x) => x.status !== 200).map((x) => `${x.status} ${x.err || ""}`.trim()) };
    }
    await sleep(250);
  }
  return { status: "gave-up", totalMs: +(performance.now() - t0).toFixed(1), attempts: attempts.length,
    nonOk: attempts.map((x) => `${x.status} ${x.err || ""}`.trim()) };
}

async function kill(base, q = "") { const r = await fetch(`${base}/kill${q}`); return r.status === 200 ? r.json().catch(() => ({})) : { status: r.status }; }

function stats(xs) {
  const v = xs.filter((x) => typeof x === "number").sort((a, b) => a - b);
  if (!v.length) return null;
  const q = (p) => v[Math.min(v.length - 1, Math.ceil(p * v.length) - 1)];
  const med = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
  return { n: v.length, median: +med.toFixed(1), p90: q(0.9), min: v[0], max: v[v.length - 1] };
}

const out = { startedAt: new Date().toISOString(), params: { N_COLD, N_WARM, N_SNAP, N_FRESH, KILL_SETTLE_MS },
  legacy: { cold: [], warm: [] }, next: { cold: [], warm: [], snapshot: null, snapCold: [], freshDo: [] } };

// make sure both are up once, so the first cycle is a stop->start like every other
log("prime"); await toFirst200(`${LEGACY}/health`); await toFirst200(`${NEXT}/health`);

for (let i = 0; i < N_COLD; i++) {
  for (const [name, base] of [["legacy", LEGACY], ["next", NEXT]]) {
    const k = await kill(base);
    await sleep(KILL_SETTLE_MS);
    const r = await toFirst200(`${base}/health`);
    r.at = new Date().toISOString(); r.kill = k;
    out[name].cold.push(r);
    log(name, "cold", i, r.status, "total", r.totalMs, "edge", r.edgeMs, "uptime", r.uptimeMs, "ready", r.readyMs, r.ray, r.location, r.nonOk.length ? r.nonOk : "");
  }
}

for (let i = 0; i < N_WARM; i++) {
  for (const [name, base] of [["legacy", LEGACY], ["next", NEXT]]) {
    const r = await hit(`${base}/health`); r.at = new Date().toISOString();
    out[name].warm.push(r);
  }
  await sleep(200);
}
log("warm legacy", stats(out.legacy.warm.map((x) => x.edgeMs)), "next", stats(out.next.warm.map((x) => x.edgeMs)));

if (N_SNAP > 0) {
  // container is running from the warm phase; snapshot it, then start from it
  const s = await (await fetch(`${NEXT}/snap`)).json();
  out.next.snapshot = s; log("snapshot", s);
  if (s.ok) for (let i = 0; i < N_SNAP; i++) {
    const k = await kill(NEXT);
    await sleep(KILL_SETTLE_MS);
    const r = await toFirst200(`${NEXT}/health?from=snap`); r.at = new Date().toISOString(); r.kill = k;
    out.next.snapCold.push(r);
    log("next snap", i, r.status, "total", r.totalMs, "edge", r.edgeMs, "uptime", r.uptimeMs, "ready", r.readyMs, r.ray, r.location);
  }
}

// a DO that has never existed, so DO creation is inside the number too
const tag = Date.now().toString(36);
for (let i = 0; i < N_FRESH; i++) {
  const q = `?do=fresh-${tag}-${i}`;
  const r = await toFirst200(`${NEXT}/health${q}`); r.at = new Date().toISOString();
  out.next.freshDo.push(r);
  log("next fresh DO", i, r.status, "total", r.totalMs, "edge", r.edgeMs, "ready", r.readyMs, r.location);
  r.kill = await kill(NEXT, q);
}

out.endKill = { legacy: await kill(LEGACY), next: await kill(NEXT) };
out.endedAt = new Date().toISOString();

const S = (arr, k) => stats(arr.filter((x) => x.status === 200).map((x) => x[k]));
out.summary = {
  legacy: { coldTotalMs: S(out.legacy.cold, "totalMs"), coldEdgeMs: S(out.legacy.cold, "edgeMs"), coldUptimeMs: S(out.legacy.cold, "uptimeMs"),
    warmClientMs: S(out.legacy.warm, "clientMs"), warmEdgeMs: S(out.legacy.warm, "edgeMs") },
  next: { coldTotalMs: S(out.next.cold, "totalMs"), coldEdgeMs: S(out.next.cold, "edgeMs"), coldReadyMs: S(out.next.cold, "readyMs"), coldUptimeMs: S(out.next.cold, "uptimeMs"),
    warmClientMs: S(out.next.warm, "clientMs"), warmEdgeMs: S(out.next.warm, "edgeMs"),
    snapTotalMs: S(out.next.snapCold, "totalMs"), snapEdgeMs: S(out.next.snapCold, "edgeMs"), snapReadyMs: S(out.next.snapCold, "readyMs"),
    freshTotalMs: S(out.next.freshDo, "totalMs"), freshEdgeMs: S(out.next.freshDo, "edgeMs"), freshReadyMs: S(out.next.freshDo, "readyMs") },
};
const file = new URL(`./results-${out.startedAt.replace(/[:.]/g, "-")}.json`, import.meta.url);
fs.writeFileSync(file, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.summary, null, 1));
log("wrote", file.pathname);
