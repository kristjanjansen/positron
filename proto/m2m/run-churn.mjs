#!/usr/bin/env node
// m2m CHURN + ENDURANCE driver (churn agent). Server: server.py on :8896
// (M2M_PORT=8896 M2M_RESULTS=results/m2m-churn-<mode>.jsonl).
// Page: room-churn.html (connect-retry + unpull/repull + churn API).
// Modes (MODE env):
//   retry   — deterministic connect-retry verification via failpub hook
//   happy   — N=6 clean join, verify retry is INERT (zero retries fired)
//   soak    — N=8 (6 pubs + 2 probes) 30 min endurance; RSS+CPU every 60 s,
//             SFU session state polled every 5 min
//   rotate  — N=10, probes auto=0; every 10 s unpull 2 + pull 2 for 5 min
//   storm   — N=10 steady; 3x: SIGKILL 4 pubs, watch GC 45 s, relaunch, time
//             full restore
//   pubkill — N=8 steady; 3x: SIGKILL 1 pub, relaunch immediately, time
//             outage->restored per probe tile
// Kills ONLY our own chromes (udd prefix m2m-churn-udd — sibling uses m2m-udd).
import { createRequire } from "module";
const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
const { chromium } = require("playwright");
import fs from "fs";
import { execSync } from "child_process";

const MODE = process.env.MODE || "happy";
const BASE = "http://127.0.0.1:8896";
const HERE = "/Users/s32863/personal/positron/proto/m2m";
const LOGDIR = `${HERE}/logs`;
const UDD_BASE = "/private/tmp/claude-501/-Users-s32863-personal-positron/3e55abee-40f5-4628-b7fd-775f7a2bfd0b/scratchpad/m2m-churn-udd";
fs.mkdirSync(LOGDIR, { recursive: true });

const CFG = {
  retry:   { pubs: [],                probes: [] },
  happy:   { pubs: "ABCD".split(""),  probes: ["1", "2"], measureS: 60 },
  soak:    { pubs: "ABCDEF".split(""), probes: ["1", "2"], measureS: parseInt(process.env.SOAK_S || "1800", 10) },
  rotate:  { pubs: "ABCDEFGH".split(""), probes: ["1", "2"], measureS: parseInt(process.env.ROT_S || "300", 10), rotateEveryS: 10 },
  storm:   { pubs: "ABCDEFGH".split(""), probes: ["1", "2"], cycles: 3, killIds: "ABCD".split(""), gcWatchS: 45, settleS: 30 },
  pubkill: { pubs: "ABCDEF".split(""), probes: ["1", "2"], cycles: 3, killIds: ["C"], gcWatchS: 0, settleS: 20 },
}[MODE];
if (!CFG) { console.error("unknown MODE", MODE); process.exit(1); }
const IDS = [...CFG.probes, ...CFG.pubs];
const N = IDS.length;

const ARGS = [
  "--autoplay-policy=no-user-gesture-required",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
  "--mute-audio",
];

function ts() { return new Date().toISOString().slice(11, 23); }
function say(...a) { console.log(ts(), ...a); }

function psRows() {
  const out = execSync("ps -Ao pid,ppid,pcpu,rss,command",
    { env: { ...process.env, LC_ALL: "C" }, maxBuffer: 32 * 1024 * 1024 }).toString().split("\n").slice(1);
  const rows = [];
  for (const l of out) {
    const m = l.match(/^\s*(\d+)\s+(\d+)\s+([\d.,]+)\s+(\d+)\s+(.*)$/);
    if (m) rows.push({ pid: +m[1], ppid: +m[2], pcpu: +m[3].replace(",", "."), rss: +m[4], cmd: m[5] });
  }
  return rows;
}

function treePids(rows, rootPid) {
  const kids = new Map();
  for (const r of rows) {
    if (!kids.has(r.ppid)) kids.set(r.ppid, []);
    kids.get(r.ppid).push(r.pid);
  }
  const seen = new Set();
  const stack = [rootPid];
  while (stack.length) {
    const pid = stack.pop();
    if (seen.has(pid)) continue;
    seen.add(pid);
    for (const k of kids.get(pid) || []) stack.push(k);
  }
  return [...seen];
}

function killStale() {
  try {
    const out = execSync(`ps -Ao pid,command | grep -F "${UDD_BASE}" | grep -v grep || true`).toString();
    const pids = out.split("\n").filter(Boolean).map(l => parseInt(l.trim().split(/\s+/)[0], 10));
    if (pids.length) {
      say(`killing ${pids.length} stale churn chrome pids`);
      execSync(`kill -9 ${pids.join(" ")} 2>/dev/null || true`);
    }
  } catch (e) { /* none */ }
}

// SIGKILL one participant's whole chrome tree — ungraceful, like a machine drop
function killParticipantHard(id) {
  const rows = psRows();
  const root = rows.find(r => r.cmd.includes(`${UDD_BASE}-${id} `) || r.cmd.endsWith(`${UDD_BASE}-${id}`))
    ? rows.find(r => r.cmd.includes(`${UDD_BASE}-${id}`) && r.cmd.includes("--user-data-dir")) : null;
  const realRoot = root || rows.find(r => r.cmd.includes(`${UDD_BASE}-${id}`) && r.cmd.includes("--user-data-dir"));
  if (!realRoot) { say(`killHard ${id}: no chrome found`); return []; }
  const pids = treePids(rows, realRoot.pid).filter(p => rows.some(r => r.pid === p));
  execSync(`kill -9 ${pids.join(" ")} 2>/dev/null || true`);
  say(`killHard ${id}: SIGKILL ${pids.length} pids (root ${realRoot.pid})`);
  return pids;
}

// CPU/RSS: ours (churn udds) + sibling (m2m-udd / v6 / ffmpeg) + total
function cpuSample(ids) {
  const rows = psRows();
  const totalPct = Math.round(rows.reduce((a, r) => a + r.pcpu, 0) * 10) / 10;
  const siblingPct = Math.round(rows.filter(r =>
    r.cmd.includes("chrome-profile-v6") || r.cmd.includes("/bin/ffmpeg") ||
    r.cmd.includes("v6_filt") || r.cmd.includes("m2m-udd-") ||
    r.cmd.includes("m2m-heavy-udd"))
    .reduce((a, r) => a + r.pcpu, 0) * 10) / 10;
  const perId = {};
  let oursPct = 0, oursRssMb = 0;
  for (const id of ids) {
    const root = rows.find(r => r.cmd.includes(`${UDD_BASE}-${id}`) && r.cmd.includes("--user-data-dir"));
    if (!root) { perId[id] = null; continue; }
    let cpu = 0, rssKb = 0, n = 0;
    for (const pid of treePids(rows, root.pid)) {
      const self = rows.find(r => r.pid === pid);
      if (self) { cpu += self.pcpu; rssKb += self.rss; n++; }
    }
    perId[id] = { cpuPct: Math.round(cpu * 10) / 10, rssMb: Math.round(rssKb / 1024), procs: n };
    oursPct += cpu; oursRssMb += rssKb / 1024;
  }
  return { totalPct, siblingPct, oursPct: Math.round(oursPct * 10) / 10,
           oursRssMb: Math.round(oursRssMb), perId };
}

async function launchParticipant(id, extraQuery) {
  const udd = `${UDD_BASE}-${id}`;
  fs.rmSync(udd, { recursive: true, force: true });
  const ctx = await chromium.launchPersistentContext(udd, {
    headless: true, channel: "chromium", args: ARGS,
    viewport: { width: 1440, height: 900 },
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  const logStream = fs.createWriteStream(`${LOGDIR}/churn-${id}.console.log`, { flags: "a" });
  page.on("console", m => logStream.write(`${ts()} [${m.type()}] ${m.text()}\n`));
  page.on("pageerror", e => logStream.write(`${ts()} [pageerror] ${e.message}\n`));
  const mode = CFG.probes.includes(id) ? "full" : "pub";
  await page.goto(`${BASE}/room-churn.html?id=${id}&n=${N}&mode=${mode}&${extraQuery || ""}&cb=${Date.now()}`,
    { waitUntil: "load" });
  return { id, ctx, page, dead: false };
}

async function collect(obj) {
  await fetch(`${BASE}/collect`, { method: "POST", body: JSON.stringify(obj) }).catch(() => {});
}
async function cfGet(sub) {
  const r = await fetch(`${BASE}/cf/${sub}`).catch(() => null);
  if (!r) return { code: 0, body: null };
  const body = await r.json().catch(() => null);
  return { code: r.status, body };
}
async function roster() {
  const r = await fetch(`${BASE}/roster`);
  return (await r.json()).participants;
}

async function safeState(part) {
  if (part.dead) return null;
  try { return await part.page.evaluate(() => window.__state); }
  catch (e) { return null; }
}
async function states(parts) {
  return (await Promise.all(parts.map(p => safeState(p)))).filter(Boolean);
}

function describe(sts) {
  const probes = sts.filter(s => s.mode === "full").map(s => {
    const tiles = Object.values(s.tiles || {});
    const valid = tiles.filter(t => t.valid > 0).length;
    const lats = tiles.map(t => t.lastLatencyMs).filter(v => v != null);
    return `${s.id}:${s.phase} tiles=${valid}/${tiles.length}` +
      (lats.length ? ` lat[${Math.min(...lats)}..${Math.max(...lats)}]` : "");
  });
  const pubs = sts.filter(s => s.mode === "pub");
  const phases = {};
  for (const s of pubs) phases[s.phase] = (phases[s.phase] || 0) + 1;
  const retries = sts.filter(s => s.pubRetries > 0).map(s => `${s.id}:${s.pubRetries}`);
  return probes.join(" | ") + ` || pubs ${JSON.stringify(phases)}` +
    (retries.length ? ` RETRIES[${retries.join(",")}]` : "");
}

async function meshWait(parts, needTiles, timeoutMs) {
  const t0 = Date.now();
  for (;;) {
    await new Promise(r => setTimeout(r, 2000));
    const sts = await states(parts);
    const failed = sts.find(s => s.phase === "failed");
    if (failed) throw new Error(`participant ${failed.id} failed: ${failed.error}`);
    say("mesh:", describe(sts));
    const probeOk = sts.filter(s => s.mode === "full").every(s => {
      const tiles = Object.values(s.tiles || {});
      return tiles.filter(t => t.valid > 0).length >= needTiles;
    });
    const pubOk = sts.filter(s => s.mode === "pub").every(s => s.phase === "running" && (s.framesSent || 0) > 0);
    if (probeOk && pubOk) return Date.now() - t0;
    if (Date.now() - t0 > timeoutMs) {
      for (const p of parts.filter(x => CFG.probes.includes(x.id)))
        await p.page.screenshot({ path: `${LOGDIR}/churn-${p.id}-${MODE}-meshtimeout.png` }).catch(() => {});
      throw new Error("mesh not complete in " + timeoutMs + "ms: " + describe(sts));
    }
  }
}

// generic measurement loop with 60 s CPU/RSS + optional 5-min session polls
async function measure(parts, seconds, opts = {}) {
  const t0 = Date.now();
  let lastCpu = 0, lastSess = 0, lastLog = 0;
  while (Date.now() - t0 < seconds * 1000) {
    await new Promise(r => setTimeout(r, 5000));
    const sts = await states(parts);
    if (Date.now() - lastLog > (opts.logEveryMs || 10000)) {
      lastLog = Date.now();
      say(`[${Math.round((Date.now() - t0) / 1000)}s]`, describe(sts));
    }
    if (Date.now() - lastCpu > (opts.cpuEveryMs || 60000)) {
      lastCpu = Date.now();
      const cpu = cpuSample(IDS);
      say(`CPU total=${cpu.totalPct}% ours=${cpu.oursPct}% sibling=${cpu.siblingPct}% rss=${cpu.oursRssMb}MB`);
      await collect({ kind: "cpu", mode: MODE, t: Date.now(), cpu });
    }
    if (opts.sessionPollIds && Date.now() - lastSess > 300000) {
      lastSess = Date.now();
      for (const pid of opts.sessionPollIds) {
        const part = (await roster()).find(p => p.participantId === pid);
        if (!part) continue;
        const r = await cfGet(`sessions/${part.sessionId}`);
        await collect({ kind: "session-poll", mode: MODE, t: Date.now(), who: pid,
          sessionId: part.sessionId, code: r.code,
          tracks: (r.body && r.body.tracks || []).map(t => ({ trackName: t.trackName, status: t.status, location: t.location })) });
        say(`session-poll ${pid}: HTTP ${r.code} tracks=${JSON.stringify((r.body && r.body.tracks || []).map(t => t.status))}`);
      }
    }
  }
}

// wait until, on BOTH probes, tiles[id].firstValidT > sinceWall for all ids
async function waitRestored(parts, killedIds, sinceWall, timeoutMs) {
  const t0 = Date.now();
  const probes = parts.filter(p => CFG.probes.includes(p.id));
  for (;;) {
    await new Promise(r => setTimeout(r, 1000));
    const sts = await Promise.all(probes.map(p => safeState(p)));
    const perId = {};
    let all = true;
    for (const id of killedIds) {
      const ok = sts.every(s => s && s.tiles[id] && s.tiles[id].firstValidT > sinceWall);
      perId[id] = ok;
      all = all && ok;
    }
    if (all) return Date.now() - t0;
    if (Date.now() - t0 > timeoutMs) {
      say("RESTORE TIMEOUT", JSON.stringify(perId));
      for (const p of probes)
        await p.page.screenshot({ path: `${LOGDIR}/churn-${p.id}-${MODE}-restoretimeout.png` }).catch(() => {});
      return -1;
    }
  }
}

// ---------------------------------------------------------------------------
const run = async () => {
  say(`m2m CHURN run: MODE=${MODE} N=${N} (pubs=${CFG.pubs.join("")} probes=${CFG.probes.join("")})`);
  killStale();
  const ro = await fetch(`${BASE}/roster`).catch(() => null);
  if (!ro || !ro.ok) { console.error("server on :8896 not reachable — start server.py (M2M_PORT=8896) first"); process.exit(1); }
  await fetch(`${BASE}/reset`, { method: "POST" });

  // ---- MODE retry: deterministic failpub verification ----------------------
  if (MODE === "retry") {
    say("retry check 1: failpub=2 -> expect 2 retries then success on attempt 3");
    const z = await launchParticipant("Z", "failpub=2&ct=8000");
    const t0 = Date.now();
    for (;;) {
      await new Promise(r => setTimeout(r, 2000));
      const s = await safeState(z);
      say(`Z phase=${s.phase} attempts=${s.pubAttempts} retries=${s.pubRetries}`);
      if (s.phase === "running" || s.phase === "failed") break;
      if (Date.now() - t0 > 90000) { say("Z TIMEOUT"); break; }
    }
    const zs = await safeState(z);
    await collect({ kind: "retry-check", who: "Z", t: Date.now(), expect: "success-on-3",
      phase: zs.phase, attempts: zs.pubAttempts, retries: zs.pubRetries, error: zs.error });
    await z.ctx.close().catch(() => {});

    say("retry check 2: failpub=3 -> expect exhausted after 3 attempts");
    const y = await launchParticipant("Y", "failpub=3&ct=8000");
    const t1 = Date.now();
    for (;;) {
      await new Promise(r => setTimeout(r, 2000));
      const s = await safeState(y);
      say(`Y phase=${s.phase} attempts=${s.pubAttempts} retries=${s.pubRetries}`);
      if (s.phase === "running" || s.phase === "failed") break;
      if (Date.now() - t1 > 90000) { say("Y TIMEOUT"); break; }
    }
    const ys = await safeState(y);
    await collect({ kind: "retry-check", who: "Y", t: Date.now(), expect: "exhausted",
      phase: ys.phase, attempts: ys.pubAttempts, retries: ys.pubRetries, error: String(ys.error).slice(0, 300) });
    await y.ctx.close().catch(() => {});
    say("retry mode done");
    return;
  }

  // ---- launch all, held, then storm-release --------------------------------
  const parts = [];
  const extra = (id) => "hold=1" + (MODE === "rotate" && CFG.probes.includes(id) ? "&auto=0" : "");
  for (const id of IDS) {
    parts.push(await launchParticipant(id, extra(id)));
    say(`${id} launched (${CFG.probes.includes(id) ? "full" : "pub"})`);
  }
  const tStorm = Date.now();
  await Promise.all(parts.map(p => p.page.evaluate(() => { window.__go = true; })));
  say(`RELEASED all ${N}`);
  await collect({ kind: "storm", mode: MODE, n: N, t: tStorm, ids: IDS });

  if (MODE === "rotate") {
    // wait until everyone is publishing/running (probes pull nothing yet)
    for (;;) {
      await new Promise(r => setTimeout(r, 2000));
      const sts = await states(parts);
      const failed = sts.find(s => s.phase === "failed");
      if (failed) throw new Error(`participant ${failed.id} failed: ${failed.error}`);
      const allRun = sts.length === N && sts.every(s => s.phase === "running");
      say("join:", sts.map(s => `${s.id}:${s.phase}`).join(" "));
      if (allRun) break;
      if (Date.now() - tStorm > 120000) throw new Error("join not complete in 120s");
    }
    say("all running; initial working set = A..F on both probes");
    const probes = parts.filter(p => CFG.probes.includes(p.id));
    const initial = CFG.pubs.slice(0, 6);
    for (const pr of probes) {
      for (const pid of initial) {
        const res = await pr.page.evaluate((x) => window.__pullPid(x), pid).catch(e => "ERR:" + e.message);
        say(`probe ${pr.id} pull ${pid}: ${res}`);
      }
    }
    const meshMs = await meshWait(parts, 6, 60000);
    say(`initial 6-tile grids up in ${meshMs} ms — rotating every ${CFG.rotateEveryS}s for ${CFG.measureS}s`);
    await collect({ kind: "mesh", mode: MODE, n: N, meshMs, t: Date.now() });

    // rotation state per probe: ws = in-grid, out = benched
    const rot = new Map(probes.map(p => [p.id, { ws: [...initial], out: CFG.pubs.slice(6) }]));
    const tRun = Date.now();
    let nRot = 0, lastCpu = 0;
    while (Date.now() - tRun < CFG.measureS * 1000) {
      await new Promise(r => setTimeout(r, CFG.rotateEveryS * 1000));
      nRot++;
      await collect({ kind: "rotation", mode: MODE, n: nRot, t: Date.now() });
      await Promise.all(probes.map(async pr => {
        const st = rot.get(pr.id);
        const dropping = st.ws.splice(0, 2);
        const adding = st.out;
        for (const pid of dropping) {
          const r = await pr.page.evaluate((x) => window.__unpullPid(x).then(() => "ok", e => "ERR:" + e.message), pid);
          if (r !== "ok") say(`probe ${pr.id} unpull ${pid}: ${r}`);
        }
        for (const pid of adding) {
          const r = await pr.page.evaluate((x) => window.__pullPid(x).then(v => v, e => "ERR:" + e.message), pid);
          if (String(r).startsWith("ERR")) say(`probe ${pr.id} pull ${pid}: ${r}`);
        }
        st.ws.push(...adding);
        st.out = dropping;
      }));
      say(`rotation ${nRot} done (each probe: -2 +2)`);
      if (Date.now() - lastCpu > 60000) {
        lastCpu = Date.now();
        const cpu = cpuSample(IDS);
        say(`CPU total=${cpu.totalPct}% ours=${cpu.oursPct}% sibling=${cpu.siblingPct}% rss=${cpu.oursRssMb}MB`);
        await collect({ kind: "cpu", mode: MODE, t: Date.now(), cpu });
      }
    }
    say(`${nRot} rotations complete`);
  } else {
    // full-auto modes: probes pull all N-1
    const meshMs = await meshWait(parts, N - 1, 180000);
    say(`FULL MESH in ${meshMs} ms`);
    await collect({ kind: "mesh", mode: MODE, n: N, meshMs, t: Date.now() });
    for (const p of parts.filter(x => CFG.probes.includes(x.id)))
      await p.page.screenshot({ path: `${LOGDIR}/churn-${p.id}-${MODE}-mesh.png` }).catch(() => {});

    if (MODE === "happy" || MODE === "soak") {
      await measure(parts, CFG.measureS, MODE === "soak"
        ? { sessionPollIds: ["1", "A"], logEveryMs: 30000 } : {});
    }

    if (MODE === "storm" || MODE === "pubkill") {
      say(`steady state 60 s before kill cycles`);
      await measure(parts, 60, {});
      for (let cycle = 1; cycle <= CFG.cycles; cycle++) {
        say(`==== ${MODE} cycle ${cycle}/${CFG.cycles}: killing ${CFG.killIds.join(",")} ====`);
        const rosterBefore = await roster();
        const deadSessions = CFG.killIds.map(id => ({
          id, sessionId: (rosterBefore.find(p => p.participantId === id) || {}).sessionId }));
        const tKill = Date.now();
        for (const id of CFG.killIds) {
          const pids = killParticipantHard(id);
          const part = parts.find(p => p.id === id);
          if (part) { part.dead = true; part.ctx.close().catch(() => {}); }
          await collect({ kind: "kill", mode: MODE, cycle, who: id, t: Date.now(), pids: pids.length });
        }
        say(`killed at ${new Date(tKill).toISOString()}`);

        // GC watch: poll the dead sessions' SFU state every 2 s
        if (CFG.gcWatchS > 0) {
          const tGc = Date.now();
          while (Date.now() - tGc < CFG.gcWatchS * 1000) {
            await new Promise(r => setTimeout(r, 2000));
            for (const d of deadSessions) {
              if (!d.sessionId) continue;
              const r = await cfGet(`sessions/${d.sessionId}`);
              await collect({ kind: "gc-poll", mode: MODE, cycle, who: d.id, t: Date.now(),
                sinceKillMs: Date.now() - tKill, code: r.code,
                tracks: (r.body && r.body.tracks || []).map(t => ({ trackName: t.trackName, status: t.status })),
                error: r.body && r.body.errorCode || null });
            }
            const sts = await states(parts);
            say(`[gc ${Math.round((Date.now() - tKill) / 1000)}s]`, describe(sts));
          }
        }

        // relaunch same ids (retry logic armed), registry upserts new sessionId
        say(`relaunching ${CFG.killIds.join(",")}`);
        const tRelaunch = Date.now();
        for (const id of CFG.killIds) {
          const idx = parts.findIndex(p => p.id === id);
          parts[idx] = await launchParticipant(id, "");   // no hold
          await collect({ kind: "relaunch", mode: MODE, cycle, who: id, t: Date.now() });
        }
        const restoreMs = await waitRestored(parts, CFG.killIds, tKill, 120000);
        say(`cycle ${cycle}: restored in ${restoreMs} ms after relaunch (${Date.now() - tKill} ms after kill)`);
        await collect({ kind: "restored", mode: MODE, cycle, t: Date.now(),
          tKill, tRelaunch, restoreAfterRelaunchMs: restoreMs,
          outageMs: restoreMs >= 0 ? Date.now() - tKill : -1 });
        for (const p of parts.filter(x => CFG.probes.includes(x.id)))
          await p.page.screenshot({ path: `${LOGDIR}/churn-${p.id}-${MODE}-c${cycle}.png` }).catch(() => {});
        say(`settle ${CFG.settleS}s`);
        await measure(parts, CFG.settleS, {});
      }
    }
  }

  // ---- wrap up -------------------------------------------------------------
  const finals = await states(parts);
  await collect({ kind: "final", mode: MODE, n: N, t: Date.now(), states: finals });
  for (const p of parts.filter(x => CFG.probes.includes(x.id)))
    await p.page.screenshot({ path: `${LOGDIR}/churn-${p.id}-${MODE}-final.png` }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  for (const p of parts) if (!p.dead) await p.ctx.close().catch(() => {});
  say(`run done (MODE=${MODE})`);
};

run().catch(async e => {
  console.error(ts(), "DRIVER FATAL:", e.message || e);
  killStale();
  process.exit(1);
});
