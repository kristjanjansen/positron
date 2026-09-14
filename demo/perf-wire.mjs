// perf-wire.mjs — what the relay costs and how it scales. Writes to a file:
// `node x.mjs | tail` buffers until exit and looks hung.
import { appendFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ⚠️ THIS PATH USED TO BE A DEAD SESSION'S SCRATCHPAD — a hardcoded UUID under
// `/private/tmp/claude-501/…/399cfe11-…//tmp/`, double slash and all. It still
// "worked", because a write creates what it needs, so nothing ever said the
// results were landing somewhere nobody would look. Second one of these in the
// harnesses; `verify-native.mjs` had the other.
const OUT = process.env.PERF_OUT || join(tmpdir(), `perf-wire-${process.pid}.txt`);
const RELAY = 'wss://ws.positron.studio';
// A fixed port for somebody else's dev server: overridable, so a second
// `wrangler dev` on another port is reachable rather than silently missed.
// 127.0.0.1 rather than `localhost`, which can resolve to ::1 and refuse.
const STORE = process.env.STORE || process.env.BACKLOG || 'http://127.0.0.1:8788';
writeFileSync(OUT, `perf-wire ${new Date().toISOString()}\n\n`);
console.log(`writing to ${OUT}`);
const say = (s) => { appendFileSync(OUT, s + '\n'); console.log(s); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const stat = (a) => a.length ? `p50 ${pct(a,.5).toFixed(1)} p95 ${pct(a,.95).toFixed(1)} p99 ${pct(a,.99).toFixed(1)} max ${Math.max(...a).toFixed(1)} n=${a.length}` : 'no samples';

async function open(room) {
  const ws = new WebSocket(`${RELAY}/room/${room}/ws`);
  ws.binaryType = 'arraybuffer';
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  return ws;
}
const room = () => `perf-${Math.random().toString(36).slice(2, 8)}`;

// ── 1. the two round trips: runtime autoresponse vs a hop through the DO ────
{
  const R = room(); const ws = await open(R);
  const pings = [], echoes = [];
  let waiting = null;
  ws.onmessage = (e) => { if (waiting) { waiting(performance.now()); waiting = null; } };
  for (let i = 0; i < 200; i++) {
    const t0 = performance.now();
    const t1 = await new Promise((r) => { waiting = r; ws.send('ping'); });
    pings.push(t1 - t0); await sleep(8);
  }
  for (let i = 0; i < 200; i++) {
    const t0 = performance.now();
    const t1 = await new Promise((r) => { waiting = r; ws.send(JSON.stringify({ type: 'p', from: 'a', at: Date.now(), seq: i })); });
    echoes.push(t1 - t0); await sleep(8);
  }
  say('1. round trip, one socket, sequential');
  say(`   ping->pong  (runtime autoresponse, DO never woken)  ${stat(pings)}`);
  say(`   echo        (through the room's Durable Object)     ${stat(echoes)}`);
  say(`   the DO hop costs  ${(pct(echoes,.5) - pct(pings,.5)).toFixed(1)} ms at p50, ${(pct(echoes,.95) - pct(pings,.95)).toFixed(1)} ms at p95`);
  ws.close();
}

// ── 2. fan-out: does a fuller room cost the sender anything? ────────────────
say('\n2. fan-out — one sender at 20 msg/s, N receivers in the room');
for (const N of [1, 2, 4, 8, 15]) {
  const R = room();
  const socks = [];
  for (let i = 0; i < N; i++) socks.push(await open(R));
  const deliv = [];
  let seen = 0, gaps = 0, last = -1;
  for (const s of socks) s.onmessage = (e) => {
    const m = JSON.parse(e.data); seen++;
    if (s === socks[0]) { deliv.push(Date.now() - m.at); if (last >= 0 && m.seq > last + 1) gaps += m.seq - last - 1; last = m.seq; }
  };
  const sender = socks[0];
  const COUNT = 60;
  for (let i = 0; i < COUNT; i++) { sender.send(JSON.stringify({ type: 'f', from: 'a', at: Date.now(), seq: i, value: 'x'.repeat(200) })); await sleep(50); }
  await sleep(700);
  say(`   N=${String(N).padStart(2)}  delivery ${stat(deliv)}  received ${seen}/${COUNT * N}  lost ${gaps}`);
  for (const s of socks) s.close();
  await sleep(250);
}

// ── 3. size ladder ─────────────────────────────────────────────────────────
say('\n3. message size — one sender, one receiver, 10 each');
for (const KiB of [1, 8, 64, 200, 256]) {
  const R = room(); const ws = await open(R);
  const d = [];
  let waiting = null;
  ws.onmessage = (e) => { if (waiting) { waiting(Date.now()); waiting = null; } };
  const pad = 'x'.repeat(KiB * 1024 - 120);
  let refused = 0;
  for (let i = 0; i < 10; i++) {
    const line = JSON.stringify({ type: 's', from: 'a', at: Date.now(), seq: i, value: pad });
    const bytes = Buffer.byteLength(line);
    if (bytes > 256 * 1024) { refused++; continue; }
    const t0 = Date.now();
    const t1 = await Promise.race([new Promise((r) => { waiting = r; ws.send(line); }), sleep(3000).then(() => null)]);
    if (t1) d.push(t1 - t0);
    await sleep(1100);   // stay under the 512 KiB/s per-socket budget
  }
  say(`   ${String(KiB).padStart(3)} KiB  ${d.length ? stat(d) : 'nothing came back'}${refused ? `  refused by the roof: ${refused}` : ''}`);
  ws.close();
}

// ── 4. where the rate cap bites — measured with the demo's own instrument ───
say('\n4. rate — the receiver counts the hole, which is what `seq` is for');
for (const RATE of [30, 60, 120, 300]) {
  const R = room(); const ws = await open(R);
  let last = -1, missing = 0, got = 0;
  ws.onmessage = (e) => { const m = JSON.parse(e.data); got++; if (last >= 0 && m.seq > last + 1) missing += m.seq - last - 1; last = m.seq; };
  const SEC = 3, total = RATE * SEC;
  const gap = 1000 / RATE;
  const t0 = Date.now();
  for (let i = 0; i < total; i++) {
    ws.send(JSON.stringify({ type: 'r', from: 'a', at: Date.now(), seq: i, value: 'x'.repeat(100) }));
    const due = t0 + (i + 1) * gap; const wait = due - Date.now(); if (wait > 0) await sleep(wait);
  }
  await sleep(900);
  say(`   ${String(RATE).padStart(3)} msg/s  delivered ${got}/${total}  dropped ${missing}  (${((missing / total) * 100).toFixed(1)}%)`);
  ws.close();
  await sleep(400);
}

// ── 5. the backlog (LOCAL wrangler dev — not an edge number) ────────────────
say('\n5. backlog, local wrangler dev — write path and read path');
{
  const R = room();
  await fetch(`${STORE}/room/${R}/record`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cap: 1000 }) });
  const ws = await open(R);
  const N = 300, t0 = Date.now();
  for (let i = 0; i < N; i++) { ws.send(JSON.stringify({ type: 'w', from: 'a', at: Date.now(), seq: i, store: true, value: 'x'.repeat(120) })); await sleep(16); }
  await sleep(1500);
  const wrote = Date.now() - t0;
  const reads = [];
  for (const last of [8, 50, 200]) {
    const r0 = performance.now();
    const res = await fetch(`${STORE}/room/${R}/history?last=${last}`);
    const text = await res.text();
    reads.push(`last=${String(last).padStart(3)} ${text.split('\n').filter(Boolean).length} rows in ${(performance.now() - r0).toFixed(0)} ms`);
  }
  const st = await (await fetch(`${STORE}/room/${R}/stats`)).json();
  say(`   wrote ${st.kept} of ${st.seen} seen in ${wrote} ms  (${(st.kept / (wrote / 1000)).toFixed(0)} kept/s at a 60/s send)`);
  for (const r of reads) say(`   read  ${r}`);
  ws.close();
}
say('\ndone');
process.exit(0);
