#!/usr/bin/env node
// m2m HEAVY-MEDIA driver — extends run-scale.mjs with:
//   * audio=1 everywhere (WebAudio oscillator per participant; probes verify
//     per-sender tones via AnalyserNode — mesh isn't "done" until every remote's
//     AUDIO matches too, not just video checksums)
//   * per-class video configs: lightweight (320x180@15), show (640x360@30
//     ~1.2 Mbps hint=motion), featured (1280x720@30 ~2.5 Mbps hint=motion)
//   * PER_INSTANCE: co-tenant multiple participant PAGES in one Chrome instance
//     to beat the ~800 MB/Chrome RAM wall past N=20 (verify co-tenancy doesn't
//     throttle rVFC/rAF before trusting the numbers!)
//   * vm_stat RAM-free sampling + live abort if free < 3 GB (STOP gate)
// Usage: N=8 DURATION=90 LABEL=av8 [AUDIO=1 PER_INSTANCE=1 PUBW=320 PUBH=180
//        PUBFPS=15 PUBKBPS=0 PUBHINT= PUBCLS=light FEAT=0 FEATW=1280 FEATH=720
//        FEATFPS=30 FEATKBPS=2500] node run-heavy.mjs
// (server.py must be up on :8897 with M2M_RESULTS pointing at this rung's file)
import { createRequire } from "module";
const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
const { chromium } = require("playwright");
import fs from "fs";
import { execSync } from "child_process";

const N = parseInt(process.env.N || "8", 10);
const DURATION_S = parseInt(process.env.DURATION || "90", 10);
const PER_INSTANCE = parseInt(process.env.PER_INSTANCE || "1", 10);
const AUDIO = (process.env.AUDIO || "1") === "1";
const LABEL = process.env.LABEL || `N${N}`;
const PUB = { w: process.env.PUBW || "320", h: process.env.PUBH || "180",
              fps: process.env.PUBFPS || "15", kbps: process.env.PUBKBPS || "0",
              hint: process.env.PUBHINT || "", cls: process.env.PUBCLS || "light" };
const FEAT_COUNT = parseInt(process.env.FEAT || "0", 10);
const FEAT = { w: process.env.FEATW || "1280", h: process.env.FEATH || "720",
               fps: process.env.FEATFPS || "30", kbps: process.env.FEATKBPS || "2500",
               hint: "motion", cls: "feat" };
const BASE = "http://127.0.0.1:8897";
const HERE = "/Users/s32863/personal/elektron/proto/m2m";
const LOGDIR = `${HERE}/logs`;
// DISTINCT prefix from run.mjs/run-scale.mjs AND from the churn sibling — we
// kill stale chromes ONLY under this exact prefix.
const UDD_BASE = "/private/tmp/claude-501/-Users-s32863-personal-elektron/3e55abee-40f5-4628-b7fd-775f7a2bfd0b/scratchpad/m2m-heavy-udd";
fs.mkdirSync(LOGDIR, { recursive: true });

const PROBES = ["1", "2"];
const PUB_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";  // up to 52 pubs -> N=54
const PUBS = PUB_POOL.slice(0, N - 2).split("");
const FEATURED = PUBS.slice(0, FEAT_COUNT);
const IDS = [...PROBES, ...PUBS];
function classFor(id) {
  if (PROBES.includes(id)) return "probe";
  return FEATURED.includes(id) ? "feat" : PUB.cls;
}
function urlFor(id) {
  const p = new URLSearchParams({ id, n: String(N), hold: "1", cb: String(Date.now()) });
  if (AUDIO) p.set("audio", "1");
  if (PROBES.includes(id)) { p.set("mode", "full"); p.set("cls", "probe"); return `${BASE}/room.html?${p}`; }
  p.set("mode", "pub");
  const c = FEATURED.includes(id) ? FEAT : PUB;
  p.set("vw", c.w); p.set("vh", c.h); p.set("vfps", c.fps); p.set("cls", c.cls);
  if (c.kbps !== "0") p.set("kbps", c.kbps);
  if (c.hint) p.set("hint", c.hint);
  return `${BASE}/room.html?${p}`;
}

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
      say(`killing ${pids.length} stale m2m-heavy chrome pids`);
      execSync(`kill ${pids.join(" ")} 2>/dev/null || true`);
    }
  } catch (e) { /* none */ }
}

// ---- CPU per instance-group + total + other-chrome + RAM free ---------------
function memSample() {
  const out = execSync("vm_stat", { env: { ...process.env, LC_ALL: "C" } }).toString();
  const pick = re => { const m = out.match(re); return m ? parseInt(m[1], 10) : 0; };
  const pg = 16384;
  const freeGb = (pick(/Pages free:\s+(\d+)/) + pick(/Pages inactive:\s+(\d+)/) +
                  pick(/Pages speculative:\s+(\d+)/) + pick(/Pages purgeable:\s+(\d+)/)) * pg / 2 ** 30;
  const strictFreeGb = pick(/Pages free:\s+(\d+)/) * pg / 2 ** 30;
  return { freeGb: Math.round(freeGb * 100) / 100, strictFreeGb: Math.round(strictFreeGb * 100) / 100 };
}

function cpuSample(groups) {
  const out = execSync("ps -Ao pid,ppid,pcpu,rss,command",
    { env: { ...process.env, LC_ALL: "C" }, maxBuffer: 32 * 1024 * 1024 }).toString().split("\n").slice(1);
  const rows = [];
  for (const l of out) {
    const m = l.match(/^\s*(\d+)\s+(\d+)\s+([\d.,]+)\s+(\d+)\s+(.*)$/);
    if (m) rows.push({ pid: +m[1], ppid: +m[2], pcpu: +m[3].replace(",", "."), rss: +m[4], cmd: m[5] });
  }
  const totalPct = Math.round(rows.reduce((a, r) => a + r.pcpu, 0) * 10) / 10;
  const kids = new Map();
  for (const r of rows) {
    if (!kids.has(r.ppid)) kids.set(r.ppid, []);
    kids.get(r.ppid).push(r);
  }
  const ourPids = new Set();
  const perGroup = {};
  let oursPct = 0, oursRssMb = 0;
  for (const g of groups) {
    const root = rows.find(r => r.cmd.includes(`${UDD_BASE}-${g.name}`) && r.cmd.includes("--user-data-dir"));
    if (!root) { perGroup[g.name] = null; continue; }
    let cpu = 0, rssKb = 0, n = 0;
    const stack = [root.pid];
    const seen = new Set();
    while (stack.length) {
      const pid = stack.pop();
      if (seen.has(pid)) continue;
      seen.add(pid); ourPids.add(pid);
      const self = rows.find(r => r.pid === pid);
      if (self) { cpu += self.pcpu; rssKb += self.rss; n++; }
      for (const k of kids.get(pid) || []) stack.push(k.pid);
    }
    perGroup[g.name] = { ids: g.ids.join(""), cpuPct: Math.round(cpu * 10) / 10,
                         rssMb: Math.round(rssKb / 1024), procs: n };
    oursPct += cpu; oursRssMb += rssKb / 1024;
  }
  // "other" = chromium/chrome/ffmpeg processes that are NOT ours (real Chrome,
  // churn sibling on :8896, anything else) — attribution for contention notes
  const otherPct = Math.round(rows.filter(r => !ourPids.has(r.pid) &&
    /[Cc]hrom|ffmpeg/.test(r.cmd)).reduce((a, r) => a + r.pcpu, 0) * 10) / 10;
  return { totalPct, otherChromePct: otherPct, oursPct: Math.round(oursPct * 10) / 10,
           oursRssMb: Math.round(oursRssMb), perGroup };
}

async function collect(obj) {
  await fetch(`${BASE}/collect`, { method: "POST", body: JSON.stringify(obj) });
}

// ---- launch: PER_INSTANCE pages per persistent context ----------------------
async function launchGroups() {
  const groups = [];
  for (let i = 0; i < IDS.length; i += PER_INSTANCE) {
    groups.push({ name: `g${groups.length}`, ids: IDS.slice(i, i + PER_INSTANCE) });
  }
  const pages = [];   // {id, page}
  for (const g of groups) {
    const udd = `${UDD_BASE}-${g.name}`;
    fs.rmSync(udd, { recursive: true, force: true });
    g.ctx = await chromium.launchPersistentContext(udd, {
      headless: true, channel: "chromium", args: ARGS,
      viewport: { width: 1440, height: 900 },
    });
    for (let j = 0; j < g.ids.length; j++) {
      const id = g.ids[j];
      const page = j === 0 ? (g.ctx.pages()[0] || await g.ctx.newPage()) : await g.ctx.newPage();
      const logStream = fs.createWriteStream(`${LOGDIR}/heavy-${LABEL}-${id}.console.log`, { flags: "a" });
      page.on("console", m => logStream.write(`${ts()} [${m.type()}] ${m.text()}\n`));
      page.on("pageerror", e => logStream.write(`${ts()} [pageerror] ${e.message}\n`));
      await page.goto(urlFor(id), { waitUntil: "load" });
      pages.push({ id, page, group: g.name });
    }
    say(`instance ${g.name} up: ${g.ids.map(i => `${i}(${classFor(i)})`).join(" ")}`);
  }
  return { groups, pages };
}

function meshDone(states) {
  const probeOk = states.filter(s => s.mode === "full").every(s => {
    const tiles = Object.values(s.tiles || {});
    const vOk = tiles.length >= N - 1 && tiles.every(t => t.valid > 0);
    if (!vOk) return false;
    if (!AUDIO) return true;
    const aud = Object.values(s.audio || {});
    return aud.length >= N - 1 && aud.every(a => a.matches > 0);
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
    const aud = Object.values(s.audio || {});
    const aOk = aud.filter(a => a.matches > 0).length;
    return `${s.id}:${s.phase} v=${valid}/${N - 1} a=${aOk}/${N - 1}` +
      (lats.length ? ` lat[${Math.min(...lats)}..${Math.max(...lats)}]` : "");
  });
  const pubs = states.filter(s => s.mode === "pub");
  const fpss = pubs.map(s => s.fps).filter(v => v != null);
  const phases = {};
  for (const s of pubs) phases[s.phase] = (phases[s.phase] || 0) + 1;
  return probes.join(" | ") + ` || pubs ${JSON.stringify(phases)}` +
    (fpss.length ? ` fps[${Math.min(...fpss)}..${Math.max(...fpss)}]` : "");
}

const grab = () => ({ ...window.__state, batchStats: window.__batchStats });

const run = async () => {
  say(`m2m HEAVY run [${LABEL}]: N=${N} audio=${AUDIO} perInstance=${PER_INSTANCE} ` +
      `pub=${PUB.w}x${PUB.h}@${PUB.fps}/${PUB.kbps}kbps/${PUB.hint || "-"} ` +
      (FEAT_COUNT ? `feat=${FEATURED.join("")}@${FEAT.w}x${FEAT.h}/${FEAT.kbps}kbps ` : "") +
      `duration=${DURATION_S}s`);
  killStale();
  const ro = await fetch(`${BASE}/roster`).catch(() => null);
  if (!ro || !ro.ok) { console.error("server on :8897 not reachable — start server.py first"); process.exit(1); }
  await fetch(`${BASE}/reset`, { method: "POST" });

  const mem0 = memSample();
  say(`RAM before launch: ${mem0.freeGb} GB available`);
  const { groups, pages } = await launchGroups();
  const held = await Promise.all(pages.map(p => p.page.evaluate(() => window.__state.phase)));
  say("phases before release:", held.join(","));

  // ---- JOIN STORM ----------------------------------------------------------
  const tStorm = Date.now();
  await Promise.all(pages.map(p => p.page.evaluate(() => { window.__go = true; })));
  say(`RELEASED all ${N} at ${new Date(tStorm).toISOString()}`);
  await collect({ kind: "storm", n: N, t: tStorm, ids: IDS, label: LABEL, audio: AUDIO,
                  perInstance: PER_INSTANCE, pub: PUB, feat: FEAT_COUNT ? FEAT : null,
                  featured: FEATURED });

  // ---- mesh wait -----------------------------------------------------------
  for (;;) {
    await new Promise(r => setTimeout(r, 2000));
    const states = await Promise.all(pages.map(p => p.page.evaluate(grab)));
    const failed = states.find(s => s.phase === "failed");
    if (failed) {
      for (const p of pages.filter(x => PROBES.includes(x.id) || x.id === failed.id))
        await p.page.screenshot({ path: `${LOGDIR}/heavy-${LABEL}-${p.id}-fail.png` }).catch(() => {});
      throw new Error(`participant ${failed.id} failed: ${failed.error}`);
    }
    say("mesh:", describe(states));
    if (meshDone(states)) break;
    if (Date.now() - tStorm > 240000) {
      for (const p of pages.filter(x => PROBES.includes(x.id)))
        await p.page.screenshot({ path: `${LOGDIR}/heavy-${LABEL}-${p.id}-meshtimeout.png` }).catch(() => {});
      await collect({ kind: "mesh-timeout", n: N, t: Date.now(), label: LABEL, states });
      throw new Error("mesh (A/V) not complete in 240s: " + describe(states));
    }
  }
  const meshMs = Date.now() - tStorm;
  say(`FULL A/V MESH in ${meshMs} ms — measuring ${DURATION_S}s`);
  await collect({ kind: "mesh", n: N, ids: IDS, meshMs, t: Date.now(), label: LABEL });
  for (const p of pages.filter(x => PROBES.includes(x.id)))
    await p.page.screenshot({ path: `${LOGDIR}/heavy-${LABEL}-${p.id}-mesh.png` }).catch(() => {});

  // ---- measurement window --------------------------------------------------
  const tRun = Date.now();
  let lastCpu = 0;
  while (Date.now() - tRun < DURATION_S * 1000) {
    await new Promise(r => setTimeout(r, 5000));
    const states = await Promise.all(pages.map(p => p.page.evaluate(grab)));
    say(describe(states));
    if (Date.now() - lastCpu > 15000) {
      lastCpu = Date.now();
      const cpu = cpuSample(groups);
      const mem = memSample();
      say(`CPU total=${cpu.totalPct}% ours=${cpu.oursPct}% otherChrome=${cpu.otherChromePct}% ` +
          `rss=${cpu.oursRssMb}MB freeRAM=${mem.freeGb}GB`);
      await collect({ kind: "cpu", n: N, t: Date.now(), label: LABEL, cpu, mem });
      if (mem.freeGb < 3) {                      // STOP gate: protect the machine
        await collect({ kind: "gate-abort", n: N, t: Date.now(), label: LABEL,
                        why: `RAM free ${mem.freeGb} GB < 3 GB`, cpu, mem });
        for (const p of pages.filter(x => PROBES.includes(x.id)))
          await p.page.screenshot({ path: `${LOGDIR}/heavy-${LABEL}-${p.id}-ramabort.png` }).catch(() => {});
        throw new Error(`STOP GATE: RAM free ${mem.freeGb} GB < 3 GB — aborting rung`);
      }
    }
  }

  const finals = await Promise.all(pages.map(p => p.page.evaluate(grab)));
  await collect({ kind: "final", n: N, t: Date.now(), label: LABEL, states: finals });
  for (const p of pages.filter(x => PROBES.includes(x.id) || x.id === PUBS[0]))
    await p.page.screenshot({ path: `${LOGDIR}/heavy-${LABEL}-${p.id}-final.png` }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));   // flush last 1 s sample batch
  for (const g of groups) await g.ctx.close();
  say(`run done — analyze with: python3 ${HERE}/analyze-heavy.py <results.jsonl> <server.log>`);
};

run().catch(async e => {
  console.error(ts(), "DRIVER FATAL:", e.message || e);
  killStale();
  process.exit(1);
});
