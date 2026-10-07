#!/usr/bin/env node
// Phase 1 of the pub port (2026-10-07): pub's WebSocket lifecycle on the new
// runtime. Two DOs at once, one holding monitor() and one not. Each: open a
// hibernatable socket, send text and binary (binary is forwarded into the
// container), hold SILENT for HOLD_MS so the DO can hibernate between alarm
// sweeps, ask again, close, then leave the DO alone past the inactivity
// timeout and ask only whether the container is still running.
import fs from "fs";
const BASE = "https://positron-cnt-next.kristjan-jansen.workers.dev";
const HOLD_MS = Number(process.env.HOLD_MS || 270_000);
const AFTER_MS = Number(process.env.AFTER_MS || 150_000);
const tag = process.env.TAG || "1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.error(new Date().toISOString(), ...a);

async function one(name, mon) {
  const rec = { name, mon, msgs: [] };
  const t0 = performance.now();
  const ws = new WebSocket(`${BASE.replace("https", "wss")}/ws?do=${name}&mon=${mon}`);
  ws.binaryType = "arraybuffer";
  const waiters = [];
  ws.onmessage = (e) => { const m = JSON.parse(e.data); m.atMs = Math.round(performance.now() - t0); rec.msgs.push(m); log(name, JSON.stringify(m).slice(0, 300)); const w = waiters.shift(); if (w) w(m); };
  ws.onclose = (e) => { rec.close = { code: e.code, reason: e.reason, atMs: Math.round(performance.now() - t0) }; log(name, "closed", e.code); };
  const next = () => new Promise((r) => waiters.push(r));
  const hello = next();
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  rec.openMs = Math.round(performance.now() - t0);
  await hello;
  await sleep(4000); // let the container boot
  ws.send("first"); await next();
  for (const size of [9, 1024, 65536, 524288]) {
    const b = new Uint8Array(size); for (let i = 0; i < size; i++) b[i] = (i * 7 + 3) & 255;
    let sum = 0; for (const x of b) sum = (sum + x) % 65521;
    ws.send(b); const m = await next(); m.expectSum = sum; m.ok = m.bytes === size && m.sum === sum;
  }
  await sleep(HOLD_MS);
  ws.send("after hold"); await next();
  ws.close(1000, "done");
  await sleep(2000);
  rec.closedAt = Date.now();
  return rec;
}

const names = [`ws-mon-${tag}`, `ws-nomon-${tag}`];
const recs = await Promise.all([one(names[0], 1), one(names[1], 0)]);
log("both closed; leaving the DOs alone for", AFTER_MS, "ms");
await sleep(AFTER_MS);
for (const r of recs) {
  r.peek = await (await fetch(`${BASE}/ws/peek?do=${r.name}`)).json();
  r.ticks = await (await fetch(`${BASE}/ws/ticks?do=${r.name}`)).json();
  log(r.name, "peek after", AFTER_MS, JSON.stringify(r.peek));
}
const f = `ws-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(f, JSON.stringify(recs, null, 1));
log("wrote", f);
