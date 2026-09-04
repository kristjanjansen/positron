#!/usr/bin/env node
// m2m SFU driver — one SEPARATE persistent chromium context per participant so
// every page is a foreground tab (plan §4.2: background tabs stop rVFC with
// zero errors). playwright 1.60.0 + chromium-1223 from the npx cache — no
// downloads. Unique user-data-dirs under the session scratchpad so OUR chrome
// processes are killable by path without touching sibling agents' chromes.
import { createRequire } from "module";
const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
const { chromium } = require("playwright");
import fs from "fs";
import { execSync } from "child_process";

const IDS = (process.env.IDS || "A,B,C").split(",");
const DURATION_S = parseInt(process.env.DURATION || "120", 10);
const BASE = "http://127.0.0.1:8897";
const HERE = "/Users/s32863/personal/positron/proto/m2m";
const LOGDIR = `${HERE}/logs`;
const UDD_BASE = "/private/tmp/claude-501/-Users-s32863-personal-positron/3e55abee-40f5-4628-b7fd-775f7a2bfd0b/scratchpad/m2m-udd";
fs.mkdirSync(LOGDIR, { recursive: true });

const ARGS = [
  "--autoplay-policy=no-user-gesture-required",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
  "--mute-audio",
];

function ts() { return new Date().toISOString().slice(11, 23); }
function say(...a) { console.log(ts(), ...a); }

// ---- kill ONLY our own stale chromes, matched by OUR udd path --------------
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

// ---- per-participant CPU: root chrome by udd path, walk the process tree ---
function cpuSample() {
  // LC_ALL=C: this machine's locale prints %CPU as "0,2" (comma decimal)
  const out = execSync("ps -Ao pid,ppid,pcpu,rss,command",
    { env: { ...process.env, LC_ALL: "C" }, maxBuffer: 16 * 1024 * 1024 }).toString().split("\n").slice(1);
  const rows = [];
  for (const l of out) {
    const m = l.match(/^\s*(\d+)\s+(\d+)\s+([\d.,]+)\s+(\d+)\s+(.*)$/);
    if (m) rows.push({ pid: +m[1], ppid: +m[2], pcpu: +m[3].replace(",", "."), rss: +m[4], cmd: m[5] });
  }
  const kids = new Map();
  for (const r of rows) {
    if (!kids.has(r.ppid)) kids.set(r.ppid, []);
    kids.get(r.ppid).push(r);
  }
  const result = {};
  for (const id of IDS) {
    const root = rows.find(r => r.cmd.includes(`${UDD_BASE}-${id}`) && r.cmd.includes("--user-data-dir"));
    if (!root) { result[id] = null; continue; }
    let cpu = 0, rssKb = 0, n = 0;
    const stack = [root.pid];
    const seen = new Set();
    while (stack.length) {
      const pid = stack.pop();
      if (seen.has(pid)) continue;
      seen.add(pid);
      const self = rows.find(r => r.pid === pid);
      if (self) { cpu += self.pcpu; rssKb += self.rss; n++; }
      for (const k of kids.get(pid) || []) stack.push(k.pid);
    }
    result[id] = { cpuPct: Math.round(cpu * 10) / 10, rssMb: Math.round(rssKb / 1024), procs: n };
  }
  return result;
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
  await page.goto(`${BASE}/room.html?id=${id}&n=${IDS.length}&cb=${Date.now()}`, { waitUntil: "load" });
  return { id, ctx, page };
}

async function collect(obj) {
  await fetch(`${BASE}/collect`, { method: "POST", body: JSON.stringify(obj) });
}

const run = async () => {
  say(`m2m run: ids=${IDS.join(",")} duration=${DURATION_S}s`);
  killStale();
  // server must already be up
  const ro = await fetch(`${BASE}/roster`).catch(() => null);
  if (!ro || !ro.ok) { console.error("server on :8897 not reachable — start server.py first"); process.exit(1); }
  await fetch(`${BASE}/reset`, { method: "POST" });

  const parts = [];
  for (const id of IDS) {
    parts.push(await launchParticipant(id));
    say(`${id} launched`);
  }

  // wait for full mesh: every page has (n-1) tiles, each with >=1 checksum-valid decode
  const need = IDS.length - 1;
  const t0 = Date.now();
  for (;;) {
    const states = await Promise.all(parts.map(p => p.page.evaluate(() => window.__state)));
    const failed = states.find(s => s.phase === "failed");
    if (failed) {
      for (const p of parts) await p.page.screenshot({ path: `${LOGDIR}/${p.id}-fail.png` }).catch(() => {});
      throw new Error(`participant ${failed.id} failed: ${failed.error}`);
    }
    const done = states.every(s => {
      const tiles = Object.values(s.tiles || {});
      return tiles.length >= need && tiles.every(t => t.valid > 0);
    });
    const desc = states.map(s => `${s.id}:${s.phase} tiles=${Object.entries(s.tiles || {}).map(([k, t]) => `${k}=${t.valid}`).join(",") || "-"}`).join(" | ");
    say("mesh:", desc);
    if (done) break;
    if (Date.now() - t0 > 120000) {
      for (const p of parts) await p.page.screenshot({ path: `${LOGDIR}/${p.id}-meshtimeout.png` }).catch(() => {});
      throw new Error("mesh not complete in 120s: " + desc);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  const meshMs = Date.now() - t0;
  say(`FULL MESH (${IDS.length} pages x ${need} tiles) in ${meshMs} ms — measuring for ${DURATION_S}s`);
  await collect({ kind: "mesh", ids: IDS, meshMs, t: Date.now() });
  for (const p of parts) await p.page.screenshot({ path: `${LOGDIR}/${p.id}-mesh.png` }).catch(() => {});

  const tRun = Date.now();
  let lastCpu = 0;
  while (Date.now() - tRun < DURATION_S * 1000) {
    await new Promise(r => setTimeout(r, 5000));
    const states = await Promise.all(parts.map(p => p.page.evaluate(() => window.__state)));
    const desc = states.map(s => `${s.id}[${Object.entries(s.tiles || {}).map(([k, t]) => `${k}:${t.valid}${t.lastLatencyMs != null ? "@" + t.lastLatencyMs : ""}`).join(" ")}]`).join(" ");
    say(desc);
    if (Date.now() - lastCpu > 30000) {
      lastCpu = Date.now();
      const cpu = cpuSample();
      say("CPU:", JSON.stringify(cpu));
      await collect({ kind: "cpu", t: Date.now(), cpu });
    }
  }

  const finals = await Promise.all(parts.map(p => p.page.evaluate(() => window.__state)));
  for (const s of finals) say("FINAL", JSON.stringify(s));
  await collect({ kind: "final", t: Date.now(), states: finals });
  for (const p of parts) await p.page.screenshot({ path: `${LOGDIR}/${p.id}-final.png` }).catch(() => {});
  // give the last 1 s sample batch a moment to flush
  await new Promise(r => setTimeout(r, 1500));
  for (const p of parts) await p.ctx.close();
  say("run done — analyze with: python3 proto/m2m/analyze.py");
};

run().catch(async e => {
  console.error(ts(), "DRIVER FATAL:", e.message || e);
  killStale();
  process.exit(1);
});
