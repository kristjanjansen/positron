#!/usr/bin/env node
// m2m SCALE LADDER driver — extends run.mjs's pattern for the two-class design:
//   N total = (N-2) LIGHTWEIGHT PUBLISHERS (mode=pub: 320x180@15 cheap canvas,
//   publish only, pull nothing) + 2 PROBES ("1","2", mode=full: pull ALL N-1
//   remote tracks on ONE PeerConnection, render, decode burned rows).
// All pages load held (hold=1) and are released simultaneously -> a real join
// storm hits the SFU API within ~1 s; server.py's stderr logs every CF call.
// Usage: N=8 DURATION=90 node run-scale.mjs   (server.py must be up on :8897)
import { createRequire } from "module";
const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
const { chromium } = require("playwright");
import fs from "fs";
import { execSync } from "child_process";

const N = parseInt(process.env.N || "8", 10);
const DURATION_S = parseInt(process.env.DURATION || "90", 10);
const BASE = "http://127.0.0.1:8897";
const HERE = "/Users/s32863/personal/positron/proto/m2m";
const LOGDIR = `${HERE}/logs`;
const UDD_BASE = "/private/tmp/claude-501/-Users-s32863-personal-positron/3e55abee-40f5-4628-b7fd-775f7a2bfd0b/scratchpad/m2m-udd";
fs.mkdirSync(LOGDIR, { recursive: true });

const PROBES = ["1", "2"];
const PUBS = "ABCDEFGHIJKLMNOPQR".slice(0, N - 2).split("");
const IDS = [...PROBES, ...PUBS];
const MODE = Object.fromEntries(IDS.map(id => [id, PROBES.includes(id) ? "full" : "pub"]));

const ARGS = [
  "--autoplay-policy=no-user-gesture-required",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
  "--mute-audio",
];

function ts() { return new Date().toISOString().slice(11, 23); }
function say(...a) { console.log(ts(), ...a); }

function killStale() {
  try {
    const out = execSync(`ps -Ao pid,command | grep -F "${UDD_BASE}" | grep -v grep || true`).toString();
    const pids = out.split("\n").filter(Boolean).map(l => parseInt(l.trim().split(/\s+/)[0], 10));
    if (pids.length) {
      say(`killing ${pids.length} stale chrome pids from previous m2m runs`);
      execSync(`kill ${pids.join(" ")} 2>/dev/null || true`);
    }
  } catch (e) { /* none */ }
}

// ---- CPU: per-participant trees + TOTAL system + sibling-agent attribution --
function cpuSample() {
  const out = execSync("ps -Ao pid,ppid,pcpu,rss,command",
    { env: { ...process.env, LC_ALL: "C" }, maxBuffer: 32 * 1024 * 1024 }).toString().split("\n").slice(1);
  const rows = [];
  for (const l of out) {
    const m = l.match(/^\s*(\d+)\s+(\d+)\s+([\d.,]+)\s+(\d+)\s+(.*)$/);
    if (m) rows.push({ pid: +m[1], ppid: +m[2], pcpu: +m[3].replace(",", "."), rss: +m[4], cmd: m[5] });
  }
  const totalPct = Math.round(rows.reduce((a, r) => a + r.pcpu, 0) * 10) / 10;
  const siblingPct = Math.round(rows.filter(r =>
    r.cmd.includes("chrome-profile-v6") || r.cmd.includes("/bin/ffmpeg") || r.cmd.includes("v6_filt"))
    .reduce((a, r) => a + r.pcpu, 0) * 10) / 10;
  const kids = new Map();
  for (const r of rows) {
    if (!kids.has(r.ppid)) kids.set(r.ppid, []);
    kids.get(r.ppid).push(r);
  }
  const perId = {};
  let oursPct = 0, oursRssMb = 0;
  for (const id of IDS) {
    const rootReal = rows.find(r => r.cmd.includes(`${UDD_BASE}-${id}`) && r.cmd.includes("--user-data-dir"));
    if (!rootReal) { perId[id] = null; continue; }
    let cpu = 0, rssKb = 0, n = 0;
    const stack = [rootReal.pid];
    const seen = new Set();
    while (stack.length) {
      const pid = stack.pop();
      if (seen.has(pid)) continue;
      seen.add(pid);
      const self = rows.find(r => r.pid === pid);
      if (self) { cpu += self.pcpu; rssKb += self.rss; n++; }
      for (const k of kids.get(pid) || []) stack.push(k.pid);
    }
    perId[id] = { cpuPct: Math.round(cpu * 10) / 10, rssMb: Math.round(rssKb / 1024), procs: n };
    oursPct += cpu; oursRssMb += rssKb / 1024;
  }
  return { totalPct, siblingPct, oursPct: Math.round(oursPct * 10) / 10,
           oursRssMb: Math.round(oursRssMb), perId };
}

async function launchParticipant(id) {
  const udd = `${UDD_BASE}-${id}`;
  fs.rmSync(udd, { recursive: true, force: true });
  const ctx = await chromium.launchPersistentContext(udd, {
    headless: true, channel: "chromium", args: ARGS,
    viewport: { width: 1440, height: 900 },
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  const logStream = fs.createWriteStream(`${LOGDIR}/${id}.console.log`, { flags: "a" });
  page.on("console", m => logStream.write(`${ts()} [${m.type()}] ${m.text()}\n`));
  page.on("pageerror", e => logStream.write(`${ts()} [pageerror] ${e.message}\n`));
  await page.goto(`${BASE}/room.html?id=${id}&n=${N}&mode=${MODE[id]}&hold=1&cb=${Date.now()}`,
    { waitUntil: "load" });
  return { id, ctx, page };
}

async function collect(obj) {
  await fetch(`${BASE}/collect`, { method: "POST", body: JSON.stringify(obj) });
}

function meshDone(states) {
  const probeOk = states.filter(s => s.mode === "full").every(s => {
    const tiles = Object.values(s.tiles || {});
    return tiles.length >= N - 1 && tiles.every(t => t.valid > 0);
  });
  const pubOk = states.filter(s => s.mode === "pub").every(s =>
    s.phase === "running" && (s.framesSent || 0) > 0);
  return probeOk && pubOk;
}

function describe(states) {
  const probes = states.filter(s => s.mode === "full").map(s => {
    const tiles = Object.values(s.tiles || {});
    const valid = tiles.filter(t => t.valid > 0).length;
    const lats = tiles.map(t => t.lastLatencyMs).filter(v => v != null);
    return `${s.id}:${s.phase} tiles=${valid}/${tiles.length}/${N - 1}` +
      (lats.length ? ` lat[${Math.min(...lats)}..${Math.max(...lats)}]` : "");
  });
  const pubs = states.filter(s => s.mode === "pub");
  const fpss = pubs.map(s => s.fps).filter(v => v != null);
  const phases = {};
  for (const s of pubs) phases[s.phase] = (phases[s.phase] || 0) + 1;
  return probes.join(" | ") + ` || pubs ${JSON.stringify(phases)}` +
    (fpss.length ? ` fps[${Math.min(...fpss)}..${Math.max(...fpss)}]` : "");
}

const run = async () => {
  say(`m2m SCALE run: N=${N} (pubs=${PUBS.join("")}, probes=${PROBES.join("")}) duration=${DURATION_S}s`);
  killStale();
  const ro = await fetch(`${BASE}/roster`).catch(() => null);
  if (!ro || !ro.ok) { console.error("server on :8897 not reachable — start server.py first"); process.exit(1); }
  await fetch(`${BASE}/reset`, { method: "POST" });

  // launch everyone HELD (probes first so their pages are warmest is irrelevant
  // — held pages do nothing until release)
  const parts = [];
  for (const id of IDS) {
    parts.push(await launchParticipant(id));
    say(`${id} launched (${MODE[id]})`);
  }
  const held = await Promise.all(parts.map(p => p.page.evaluate(() => window.__state.phase)));
  say("phases before release:", held.join(","));

  // ---- JOIN STORM: release all N at once ----------------------------------
  const tStorm = Date.now();
  await Promise.all(parts.map(p => p.page.evaluate(() => { window.__go = true; })));
  say(`RELEASED all ${N} at ${new Date(tStorm).toISOString()}`);
  await collect({ kind: "storm", n: N, t: tStorm, ids: IDS });

  // ---- mesh wait -----------------------------------------------------------
  for (;;) {
    await new Promise(r => setTimeout(r, 2000));
    const states = await Promise.all(parts.map(p => p.page.evaluate(() => window.__state)));
    const failed = states.find(s => s.phase === "failed");
    if (failed) {
      for (const p of parts.filter(x => PROBES.includes(x.id) || x.id === failed.id))
        await p.page.screenshot({ path: `${LOGDIR}/${p.id}-N${N}-fail.png` }).catch(() => {});
      throw new Error(`participant ${failed.id} failed: ${failed.error}`);
    }
    say("mesh:", describe(states));
    if (meshDone(states)) break;
    if (Date.now() - tStorm > 180000) {
      for (const p of parts.filter(x => PROBES.includes(x.id)))
        await p.page.screenshot({ path: `${LOGDIR}/${p.id}-N${N}-meshtimeout.png` }).catch(() => {});
      await collect({ kind: "mesh-timeout", n: N, t: Date.now(), states });
      throw new Error("mesh not complete in 180s: " + describe(states));
    }
  }
  const meshMs = Date.now() - tStorm;
  say(`FULL MESH (2 probes x ${N - 1} tiles + ${PUBS.length} pubs flowing) in ${meshMs} ms — measuring ${DURATION_S}s`);
  await collect({ kind: "mesh", n: N, ids: IDS, meshMs, t: Date.now() });
  for (const p of parts.filter(x => PROBES.includes(x.id)))
    await p.page.screenshot({ path: `${LOGDIR}/${p.id}-N${N}-mesh.png` }).catch(() => {});

  // ---- measurement window --------------------------------------------------
  const tRun = Date.now();
  let lastCpu = 0;
  while (Date.now() - tRun < DURATION_S * 1000) {
    await new Promise(r => setTimeout(r, 5000));
    const states = await Promise.all(parts.map(p => p.page.evaluate(() => window.__state)));
    say(describe(states));
    if (Date.now() - lastCpu > 15000) {
      lastCpu = Date.now();
      const cpu = cpuSample();
      say(`CPU total=${cpu.totalPct}% ours=${cpu.oursPct}% sibling=${cpu.siblingPct}% rss=${cpu.oursRssMb}MB`);
      await collect({ kind: "cpu", n: N, t: Date.now(), cpu });
    }
  }

  const finals = await Promise.all(parts.map(p => p.page.evaluate(() => window.__state)));
  await collect({ kind: "final", n: N, t: Date.now(), states: finals });
  for (const p of parts.filter(x => PROBES.includes(x.id) || x.id === "A"))
    await p.page.screenshot({ path: `${LOGDIR}/${p.id}-N${N}-final.png` }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));   // flush last 1 s sample batch
  for (const p of parts) await p.ctx.close();
  say(`run done — analyze with: python3 ${HERE}/analyze-scale.py <results.jsonl>`);
};

run().catch(async e => {
  console.error(ts(), "DRIVER FATAL:", e.message || e);
  killStale();
  process.exit(1);
});
