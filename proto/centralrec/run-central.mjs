#!/usr/bin/env node
// PROTO B driver — central per-participant recording, measured.
// Spawns: server.mjs (:8893, chunk receiver + collector), N publisher pages
// (pub.html, groups of <=4 per Chrome context — the m2m co-tenancy rule), and
// ONE recorder context (recorder.html) whose Chrome is separable in `ps` by its
// user-data-dir substring (CPU attribution: recorder vs publishers vs node).
// Media + signaling ride the DEPLOYED elektron-rtc Worker; rooms are per-run.
//
// Scenarios:
//   SCENARIO=smoke N=2 DUR_S=20   node run-central.mjs
//   SCENARIO=b1    N=8 DUR_S=90   node run-central.mjs        (A runs selfrec ref arm)
//   SCENARIO=b2    N=4|12 DUR_S=60 LABEL=b2n4 node run-central.mjs
//   SCENARIO=b3    N=8 DUR_S=90 KILL_AT_S=30 REJOIN_AFTER_S=10 node run-central.mjs
import { createRequire } from "module";
const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
const { chromium } = require("playwright");
import fs from "fs";
import { execSync, spawn } from "child_process";

const SCENARIO = process.env.SCENARIO || "smoke";
const N = parseInt(process.env.N || (SCENARIO === "smoke" ? "2" : "8"), 10);
const DUR_S = parseInt(process.env.DUR_S || (SCENARIO === "smoke" ? "20" : "90"), 10);
const LABEL = process.env.LABEL || `${SCENARIO}n${N}`;
const KILL_AT_S = parseInt(process.env.KILL_AT_S || "30", 10);
const REJOIN_AFTER_S = parseInt(process.env.REJOIN_AFTER_S || "10", 10);
const RID = process.env.RID || "";
const SIMUL = process.env.SIMUL === "1";
const REMOTE_URL = process.env.REMOTE_URL || "https://rtc.positron.studio";
const PORT = 8893;
const BASE = `http://127.0.0.1:${PORT}`;
const HERE = "/Users/s32863/personal/positron/proto/centralrec";
const ROOT = "/Users/s32863/personal/positron";
const LOGDIR = `${HERE}/logs`;
const ROOM = `centralrec-${LABEL}-${Date.now().toString(36)}`;   // fresh per run (rerun-poison rule)
const RESULTS = `${ROOT}/results/centralrec-${LABEL}.jsonl`;
const RECDIR = `${HERE}/recordings/${LABEL}`;
const UDD_BASE = `/private/tmp/claude-501/-Users-s32863-personal-positron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad/centralrec-udd-${LABEL}`;
fs.mkdirSync(LOGDIR, { recursive: true });
fs.mkdirSync(RECDIR, { recursive: true });

// participant ids: single chars (burned as one byte). Victim for b3 is "K".
const IDS = "ABCDEFGHJKLM".slice(0, N).split("");
const VICTIM = "K";
if (SCENARIO === "b3" && !IDS.includes(VICTIM)) { IDS[IDS.length - 1] = VICTIM; }
const SELFREC_ID = "A";        // B4 reference arm rides in b1 (and smoke)

function roomToken() {
  const line = fs.readFileSync(`${ROOT}/.env`, "utf8").split("\n").find(l => l.startsWith("ROOM_TOKEN="));
  return line ? line.slice("ROOM_TOKEN=".length).trim() : "";
}
const TOKEN = roomToken();
if (!TOKEN) { console.error("no ROOM_TOKEN in .env"); process.exit(1); }

const ARGS = [
  "--autoplay-policy=no-user-gesture-required",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
  "--mute-audio",
];
function ts() { return new Date().toISOString().slice(11, 23); }
function say(...a) { console.log(ts(), ...a); }
async function collect(obj) {
  await fetch(`${BASE}/collect`, { method: "POST", body: JSON.stringify(obj) }).catch(() => {});
}
function killByUddPrefix(prefix) {
  try {
    const out = execSync(`ps -Ao pid,command | grep -F "${prefix}" | grep -v grep || true`).toString();
    const pids = out.split("\n").filter(Boolean).map(l => parseInt(l.trim().split(/\s+/)[0], 10));
    if (pids.length) execSync(`kill -9 ${pids.join(" ")} 2>/dev/null || true`);
    return pids.length;
  } catch (e) { return 0; }
}
function cpuSample() {
  // attribute Chrome CPU by udd substring; node side by script path + own pid
  try {
    const out = execSync(`LC_ALL=C ps -Ao pcpu,rss,pid,command | grep -iE "chrom|node" | grep -v grep || true`).toString();
    const agg = { rec: 0, recRssMb: 0, pub: 0, pubRssMb: 0, victim: 0, nodeSrv: 0, nodeDrv: 0, otherChrome: 0 };
    for (const l of out.split("\n")) {
      const m = l.trim().match(/^([0-9.,]+)\s+(\d+)\s+(\d+)\s+(.*)$/);
      if (!m) continue;
      const cpu = parseFloat(m[1].replace(",", "."));
      const rss = parseInt(m[2], 10);
      const pid = parseInt(m[3], 10);
      const cmd = m[4];
      if (cmd.includes(`${UDD_BASE}-rec`)) { agg.rec += cpu; agg.recRssMb += rss / 1024; }
      else if (cmd.includes(`${UDD_BASE}-victim`)) { agg.victim += cpu; agg.pub += cpu; agg.pubRssMb += rss / 1024; }
      else if (cmd.includes(UDD_BASE)) { agg.pub += cpu; agg.pubRssMb += rss / 1024; }
      else if (cmd.includes("centralrec/server.mjs")) agg.nodeSrv += cpu;
      else if (pid === process.pid) agg.nodeDrv += cpu;
      else if (/chrom/i.test(cmd)) agg.otherChrome += cpu;
    }
    for (const k of Object.keys(agg)) agg[k] = Math.round(agg[k] * 10) / 10;
    return agg;
  } catch (e) { return null; }
}
function pubUrl(id, opts = {}) {
  const selfrec = (SCENARIO === "b1" || SCENARIO === "smoke") && id === SELFREC_ID ? "1" : "0";
  return `${BASE}/pub.html?id=${id}&name=pub-${id}&room=${ROOM}&label=${LABEL}` +
         `&kbps=1200&fps=30&selfrec=${selfrec}&hold=${opts.hold === false ? "0" : "1"}` +
         (SIMUL ? "&simul=1" : "") +
         `&remote=${encodeURIComponent(REMOTE_URL)}&token=${encodeURIComponent(TOKEN)}&cb=${Date.now()}`;
}
function recUrl() {
  return `${BASE}/recorder.html?id=REC&room=${ROOM}&label=${LABEL}` +
         (RID ? `&rid=${RID}` : "") +
         `&remote=${encodeURIComponent(REMOTE_URL)}&token=${encodeURIComponent(TOKEN)}&cb=${Date.now()}`;
}

const pages = new Map();     // id -> {page, ctxKey}
const ctxs = new Map();      // key -> context
let recPage = null;

async function launchCtx(key, urls, viewport) {
  const udd = `${UDD_BASE}-${key}`;
  fs.rmSync(udd, { recursive: true, force: true });
  const ctx = await chromium.launchPersistentContext(udd, {
    headless: true, channel: "chromium", args: ARGS,
    viewport: viewport || { width: 900, height: 700 },
  });
  ctxs.set(key, ctx);
  const out = [];
  for (let j = 0; j < urls.length; j++) {
    const { id, url } = urls[j];
    const page = j === 0 ? (ctx.pages()[0] || await ctx.newPage()) : await ctx.newPage();
    const logStream = fs.createWriteStream(`${LOGDIR}/${LABEL}-${id}.console.log`, { flags: "a" });
    page.on("console", m => logStream.write(`${ts()} [${m.type()}] ${m.text()}\n`));
    page.on("pageerror", e => logStream.write(`${ts()} [pageerror] ${e.message}\n`));
    await page.goto(url, { waitUntil: "load" });
    out.push(page);
  }
  return out;
}
async function state(page) { return page.evaluate(() => window.__state).catch(() => null); }
async function waitFor(fn, timeoutMs, what) {
  const t0 = Date.now();
  for (;;) {
    if (await fn()) return Date.now() - t0;
    if (Date.now() - t0 > timeoutMs) throw new Error(`timeout waiting for ${what}`);
    await new Promise(r => setTimeout(r, 500));
  }
}

let serverProc = null;
async function main() {
  say(`centralrec run: scenario=${SCENARIO} N=${N} dur=${DUR_S}s label=${LABEL} room=${ROOM}` + (RID ? ` rid=${RID}` : ""));
  const batt = execSync("pmset -g batt").toString().trim().split("\n").pop();
  say("battery:", batt);
  killByUddPrefix(UDD_BASE);

  // ---- server ---------------------------------------------------------------
  serverProc = spawn("node", [`${HERE}/server.mjs`], {
    env: { ...process.env, CENTRALREC_PORT: String(PORT), CENTRALREC_RESULTS: RESULTS, CENTRALREC_RECDIR: RECDIR },
    stdio: ["ignore", "inherit", "inherit"],
  });
  await waitFor(async () => {
    const r = await fetch(`${BASE}/healthz`).catch(() => null);
    return r && r.ok;
  }, 10000, "server healthz");
  await collect({ kind: "run-start", scenario: SCENARIO, n: N, durS: DUR_S, label: LABEL,
                  room: ROOM, rid: RID || null, t: Date.now(), batt, ids: IDS });

  // ---- publishers (victim isolated in its own context for b3) ---------------
  const groups = [];
  const normal = IDS.filter(id => !(SCENARIO === "b3" && id === VICTIM));
  for (let i = 0; i < normal.length; i += 4)
    groups.push({ key: `pg${groups.length}`, ids: normal.slice(i, i + 4) });
  if (SCENARIO === "b3") groups.push({ key: "victim", ids: [VICTIM] });
  for (const g of groups) {
    const pp = await launchCtx(g.key, g.ids.map(id => ({ id, url: pubUrl(id) })));
    g.ids.forEach((id, j) => pages.set(id, { page: pp[j], ctxKey: g.key }));
    say(`ctx ${g.key} up: ${g.ids.join(" ")}`);
  }
  const tStorm = Date.now();
  await Promise.all([...pages.values()].map(e => e.page.evaluate(() => { window.__go = true; }).catch(() => {})));
  say(`released ${pages.size} publishers (join storm)`);
  await collect({ kind: "storm", n: pages.size, t: tStorm });

  const reloads = {};
  async function reviveFailed() {
    for (const [id, e] of pages.entries()) {
      const s = await state(e.page);
      if (!s || s.phase !== "failed") continue;
      reloads[id] = (reloads[id] || 0) + 1;
      if (reloads[id] > 2) throw new Error(`publisher ${id} failed after ${reloads[id] - 1} reloads: ${s.error}`);
      say(`publisher ${id} exhausted — reload ${reloads[id]}/2`);
      await collect({ kind: "page-reload", id, n: reloads[id], t: Date.now() });
      await e.page.goto(pubUrl(id, { hold: false }) + `&rl=${reloads[id]}`, { waitUntil: "load" }).catch(() => {});
    }
  }
  await waitFor(async () => {
    await reviveFailed();
    const sts = await Promise.all([...pages.values()].map(e => state(e.page)));
    const running = sts.filter(s => s && s.phase === "running" && s.framesSent > 0).length;
    say(`pubs: ${running}/${pages.size} running+sending`);
    return running === pages.size;
  }, 120000, "all publishers running");
  say("all publishers RUNNING — launching recorder");
  await collect({ kind: "pubs-running", t: Date.now(), ms: Date.now() - tStorm });

  // ---- recorder -------------------------------------------------------------
  const tRecLaunch = Date.now();
  [recPage] = await launchCtx("rec", [{ id: "REC", url: recUrl() }], { width: 800, height: 600 });
  await waitFor(async () => {
    const s = await state(recPage);
    if (!s) return false;
    say(`recorder: pulled=${s.pulled} recording=${s.recording}/${N}`);
    return s.recording >= N;
  }, 90000, `recorder recording all ${N}`);
  const recReadyMs = Date.now() - tRecLaunch;
  say(`recorder RECORDING ALL ${N} in ${recReadyMs} ms from launch`);
  await collect({ kind: "rec-ready", t: Date.now(), fromLaunchMs: recReadyMs, n: N });
  await recPage.screenshot({ path: `${LOGDIR}/${LABEL}-rec-ready.png` }).catch(() => {});

  // ---- measured window ------------------------------------------------------
  const T0 = Date.now();
  await collect({ kind: "t0", t: T0 });
  const cpuTimer = setInterval(async () => {
    const c = cpuSample();
    if (c) await collect(Object.assign({ kind: "cpu", t: Date.now() }, c));
  }, 5000);

  const endAt = T0 + DUR_S * 1000;
  let killed = false, rejoined = false;
  while (Date.now() < endAt) {
    if (SCENARIO === "b3" && !killed && Date.now() >= T0 + KILL_AT_S * 1000) {
      const tK = Date.now();
      const nKilled = killByUddPrefix(`${UDD_BASE}-victim `.trimEnd());  // exact ctx udd
      killed = true;
      say(`SIGKILL victim ${VICTIM}: ${nKilled} pids at T0+${(tK - T0) / 1000}s`);
      await collect({ kind: "kill", id: VICTIM, pids: nKilled, t: tK });
      ctxs.get("victim")?.close().catch(() => {});   // reap playwright's handle
      ctxs.delete("victim");
      pages.delete(VICTIM);
    }
    if (SCENARIO === "b3" && killed && !rejoined && Date.now() >= T0 + (KILL_AT_S + REJOIN_AFTER_S) * 1000) {
      const tR = Date.now();
      const [vp] = await launchCtx("victim2", [{ id: VICTIM, url: pubUrl(VICTIM, { hold: false }) + "&rl=rejoin" }]);
      pages.set(VICTIM, { page: vp, ctxKey: "victim2" });
      rejoined = true;
      say(`victim ${VICTIM} relaunched at T0+${(tR - T0) / 1000}s`);
      await collect({ kind: "rejoin-launch", id: VICTIM, t: tR });
    }
    const s = await state(recPage);
    if (s) await collect({ kind: "rec-hud", t: Date.now(), recording: s.recording,
                           pulled: s.pulled, files: s.recFiles });
    await new Promise(r => setTimeout(r, 5000));
  }
  clearInterval(cpuTimer);

  // ---- clean shutdown -------------------------------------------------------
  say("run window over — stopping recorders");
  await recPage.screenshot({ path: `${LOGDIR}/${LABEL}-rec-final.png` }).catch(() => {});
  await recPage.evaluate(() => window.__stopAll()).catch(e => say("stopAll err", e.message));
  const sr = pages.get(SELFREC_ID);
  if (sr) await sr.page.evaluate(() => window.__stopSelfRec && window.__stopSelfRec()).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));      // final chunk + /end flush
  const finalRec = await state(recPage);
  await collect({ kind: "final", t: Date.now(), rec: finalRec });
  await collect({ kind: "run-end", t: Date.now(), label: LABEL, room: ROOM });
  for (const ctx of ctxs.values()) await ctx.close().catch(() => {});
  const leftover = killByUddPrefix(UDD_BASE);
  serverProc.kill("SIGTERM");
  say(`done (killed ${leftover} leftover pids). results=${RESULTS} recdir=${RECDIR}`);
}

main().catch(async e => {
  console.error(ts(), "DRIVER FATAL:", e.message || e);
  await collect({ kind: "driver-fatal", t: Date.now(), error: String(e.message || e) });
  for (const ctx of ctxs.values()) await ctx.close().catch(() => {});
  killByUddPrefix(UDD_BASE);
  if (serverProc) serverProc.kill("SIGTERM");
  process.exit(1);
});
