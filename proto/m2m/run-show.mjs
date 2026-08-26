#!/usr/bin/env node
// P3C SHOW driver — N=12 vs the DEPLOYED Worker, conducted by score.mjs.
// Adapted from run-grid.mjs (grid agent's; that file untouched). Differences:
//   - pages load show.html (P3C copy) and ALWAYS run against the Worker
//   - the operator is NOT a browser page: score.mjs (node WS client) is
//     spawned with a T0 and fires the timed score; this driver only observes
//   - after EVERY score event: programmatic assertions of expected-vs-observed
//     state on both probes (tier map, page sync, pulled set, wall pollers)
//   - STAG=1 -> &stag=1 on the probes (batched/deferred unpull mitigation)
//   - port 8893, udd prefix m2m-p3c, room score-show, results m2m-p3c-*.jsonl
//
// Usage:  M2M_PORT=8893 M2M_RESULTS=…/results/m2m-p3c-<label>.jsonl \
//           python3 grid-server.py &        (static+collector only; media/signaling all Worker)
//         SMOKE=1 node run-show.mjs
//         LABEL=stag0 STAG=0 node run-show.mjs
//         LABEL=stag1 STAG=1 node run-show.mjs
import { createRequire } from "module";
const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
const { chromium } = require("playwright");
import fs from "fs";
import { execSync, spawn } from "child_process";

const SMOKE = process.env.SMOKE === "1";
const STAG = process.env.STAG === "1";
const LABEL = process.env.LABEL || (SMOKE ? "smoke" : "main");
const SCORE_FILE = process.env.SCORE || (SMOKE ? "scores/smoke-score.json" : "scores/demo-score.json");
const REMOTE_URL = process.env.REMOTE_URL || "https://elektron-rtc.kristjan-jansen.workers.dev";
const BASE = "http://127.0.0.1:8893";
const ROOM = "score-show";
const HERE = "/Users/s32863/personal/elektron/proto/m2m";
const LOGDIR = `${HERE}/logs`;
const UDD_BASE = "/private/tmp/claude-501/-Users-s32863-personal-elektron/3e55abee-40f5-4628-b7fd-775f7a2bfd0b/scratchpad/m2m-p3c-udd";
const LS = 4;
const T0_LEAD_MS = 22000;          // all-running -> t0 (setup cast + ready inside this)
fs.mkdirSync(LOGDIR, { recursive: true });

const score = JSON.parse(fs.readFileSync(`${HERE}/${SCORE_FILE}`, "utf8"));

function roomToken(key = "ROOM_TOKEN") {
  const line = fs.readFileSync("/Users/s32863/personal/elektron/.env", "utf8")
    .split("\n").find(l => l.startsWith(key + "="));
  return line ? line.slice(key.length + 1).trim() : "";
}
const TOKEN = roomToken();
if (!TOKEN) { console.error("no ROOM_TOKEN in .env"); process.exit(1); }
const OP_TOKEN = roomToken("OPERATOR_TOKEN");   // operator joins need it

const ROSTER = {
  "1": { name: "Perf-Ada",  role: "performer", view: "full" },
  "2": { name: "Perf-Bela", role: "performer", view: "full" },
  "A": { name: "Live-A", role: "audience", view: "lite" },
  "B": { name: "Live-B", role: "audience", view: "lite" },
  "C": { name: "Live-C", role: "audience", view: "lite" },
  "D": { name: "Live-D", role: "audience", view: "lite" },
  "E": { name: "Live-E", role: "audience", view: "lite" },
  "F": { name: "Live-F", role: "audience", view: "lite" },
  "W": { name: "Wall-W", role: "audience", view: "lite" },
  "X": { name: "Wall-X", role: "audience", view: "lite" },
  "Y": { name: "Wall-Y", role: "audience", view: "lite" },
  "Z": { name: "Wall-Z", role: "audience", view: "lite" },
};
const PROBES = ["1", "2"];
const WALL_IDS = ["W", "X", "Y", "Z"];
const GROUPS = [
  { name: "g0", ids: ["1", "2", "B", "C"] },
  { name: "g1", ids: ["D", "E", "F", "W"] },
  { name: "g2", ids: ["A", "X", "Y", "Z"] },
];
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
  try {
    const out = execSync(`LC_ALL=C ps -Ao pcpu,rss,command | grep -iE "chrom" | grep -v grep || true`).toString();
    let ours = 0, oursRss = 0, other = 0;
    for (const l of out.split("\n")) {
      const m = l.trim().match(/^([0-9.,]+)\s+(\d+)\s+(.*)$/);
      if (!m) continue;
      const cpu = parseFloat(m[1].replace(",", "."));
      if (m[3].includes("m2m-p3c-udd")) { ours += cpu; oursRss += parseInt(m[2], 10); }
      else other += cpu;
    }
    return { ours: Math.round(ours), oursRssMb: Math.round(oursRss / 1024), other: Math.round(other) };
  } catch (e) { return null; }
}

function urlFor(id) {
  const r = ROSTER[id];
  return `${BASE}/show.html?id=${id}&name=${r.name}&room=${ROOM}&role=${r.role}` +
         `&view=${r.view}&ls=${LS}&hold=1&cb=${Date.now()}` +
         (r.view === "full" && STAG ? `&stag=1` : "") +
         (r.role === "operator" && OP_TOKEN ? `&optoken=${encodeURIComponent(OP_TOKEN)}` : "") +
         `&remote=${encodeURIComponent(REMOTE_URL)}&token=${encodeURIComponent(TOKEN)}`;
}

const pages = new Map();
const ctxs = new Map();

async function launchGroup(g) {
  const udd = `${UDD_BASE}-${g.name}`;
  fs.rmSync(udd, { recursive: true, force: true });
  const ctx = await chromium.launchPersistentContext(udd, {
    headless: true, channel: "chromium", args: ARGS,
    viewport: { width: 1600, height: 1000 },
  });
  ctxs.set(g.name, ctx);
  for (let j = 0; j < g.ids.length; j++) {
    const id = g.ids[j];
    const page = j === 0 ? (ctx.pages()[0] || await ctx.newPage()) : await ctx.newPage();
    const logStream = fs.createWriteStream(`${LOGDIR}/show-${LABEL}-${id}.console.log`, { flags: "a" });
    page.on("console", m => logStream.write(`${ts()} [${m.type()}] ${m.text()}\n`));
    page.on("pageerror", e => logStream.write(`${ts()} [pageerror] ${e.message}\n`));
    await page.goto(urlFor(id), { waitUntil: "load" });
    pages.set(id, { page, group: g.name });
  }
  say(`instance ${g.name} up: ${g.ids.join(" ")}`);
}

async function state(id) {
  const e = pages.get(id);
  if (!e) return null;
  return e.page.evaluate(() => window.__state).catch(() => null);
}
async function roster(id) {
  const e = pages.get(id);
  if (!e) return null;
  return e.page.evaluate(() => window.__roster()).catch(() => null);
}
async function allStates() {
  const out = {};
  for (const id of pages.keys()) out[id] = await state(id);
  return out;
}
function describe(st) {
  const probes = PROBES.map(id => {
    const s = st[id];
    if (!s) return `${id}:?`;
    const tiles = Object.entries(s.tiles || {});
    const v = tiles.filter(([, t]) => t.valid > 0).length;
    const wall = Object.entries(s.wall || {});
    const wOk = wall.filter(([, w]) => w.freshMs != null).length;
    return `${id}:${s.phase} pg=${s.livePage + 1}/${s.livePages} v=${v}/${tiles.length} wall=${wOk}`;
  });
  const lites = Object.entries(st).filter(([id]) => !PROBES.includes(id));
  const phases = {};
  for (const [, s] of lites) phases[(s && s.phase) || "?"] = (phases[(s && s.phase) || "?"] || 0) + 1;
  return probes.join(" | ") + ` || lites ${JSON.stringify(phases)}`;
}
function allRunning(st) {
  for (const [id, s] of Object.entries(st)) {
    if (!s || s.phase !== "running") return false;
    if (!PROBES.includes(id) && !(s.framesSent > 0)) return false;
  }
  return true;
}
function gridReady(st) {
  const now = Date.now();
  for (const id of PROBES) {
    const s = st[id];
    if (!s || s.phase !== "running") return false;
    const tiles = Object.values(s.tiles || {});
    if (tiles.filter(t => t.valid > 0).length < 1 + Math.min(LS, 6)) return false;
    const fresh = WALL_IDS.filter(w => {
      const e = (s.wall || {})[w];
      return e && e.freshMs != null && e.lastT > now - 6000;
    });
    if (fresh.length < WALL_IDS.length) return false;
  }
  for (const [id, s] of Object.entries(st)) {
    if (PROBES.includes(id)) continue;
    if (!s || s.phase !== "running" || !(s.framesSent > 0)) return false;
  }
  return true;
}
async function shot(id, tag) {
  const e = pages.get(id);
  if (!e) return;
  await e.page.screenshot({ path: `${LOGDIR}/show-${LABEL}-${id}-${tag}.png` }).catch(() => {});
}
async function waitFor(fn, timeoutMs, what) {
  const t0 = Date.now();
  for (;;) {
    if (await fn()) return Date.now() - t0;
    if (Date.now() - t0 > timeoutMs) throw new Error(`timeout waiting for ${what}`);
    await new Promise(r => setTimeout(r, 500));
  }
}

// ============================================================================
// EXPECTED-STATE MODEL — fold of setup + events, mirrors client semantics
// ============================================================================
function foldExpected(uptoIdx) {          // -1 = setup only
  const tiers = {};
  for (const id of Object.keys(ROSTER)) tiers[id] = "wall";
  tiers["OP"] = "wall";
  for (const a of score.setup || []) if (a.action !== "cue") tiers[a.participantId] = a.tier;
  let page = 0;
  for (let i = 0; i <= uptoIdx; i++) {
    const ev = score.events[i];
    for (const a of ev.actions || []) {
      if (a.action === "cue") {
        if (a.cue && a.cue.cmd === "rotate") {
          const nLive = Object.values(tiers).filter(t => t === "live").length;
          const pages_ = Math.max(1, Math.ceil(nLive / LS));
          page = (page + 1) % pages_;
        } else if (a.cue && a.cue.cmd === "setLivePage") page = a.cue.page;
      } else tiers[a.participantId] = a.tier;
    }
    const nLive = Object.values(tiers).filter(t => t === "live").length;
    const pages_ = Math.max(1, Math.ceil(nLive / LS));
    if (page >= pages_) page = 0;       // client reconcile clamp
  }
  return { tiers, page };
}
function eventSettleMs(ev) {
  let s = 2500;
  for (const a of ev.actions || []) {
    if (a.action === "cue" && a.cue && a.cue.cmd === "rotate") s = Math.max(s, 6000);
    if (a.action === "promote") s = Math.max(s, 6000);
    if (a.action === "demote" && a.tier === "wall") s = Math.max(s, 8000);
    if (a.action === "demote" && a.tier !== "wall") s = Math.max(s, 6000);
  }
  return s;
}

async function assertEvent(i, t0) {
  const ev = score.events[i];
  const expected = foldExpected(i);
  const fails = [];
  const rosters = {};
  for (const pid of PROBES) rosters[pid] = await roster(pid);
  // 1. tier map on both probes (self + parts), over the 12 cast ids + OP
  for (const probe of PROBES) {
    const r = rosters[probe];
    if (!r) { fails.push(`${probe}: no roster`); continue; }
    const seen = { [r.self.id]: r.self.tier };
    for (const p of r.parts) if (p.alive) seen[p.id] = p.tier;
    for (const id of [...Object.keys(ROSTER), "OP"]) {
      if (seen[id] == null) fails.push(`${probe}: ${id} missing/dead`);
      else if (seen[id] !== expected.tiers[id])
        fails.push(`${probe}: ${id} tier ${seen[id]} != expected ${expected.tiers[id]}`);
    }
    // 2. live page matches the fold
    if (r.livePage !== expected.page)
      fails.push(`${probe}: livePage ${r.livePage} != expected ${expected.page}`);
    // 3. pulled set == featured(others) + visible live slice of OWN liveOrder
    const featuredOthers = Object.keys(expected.tiers)
      .filter(id => expected.tiers[id] === "featured" && id !== probe).sort();
    const visible = r.liveOrder.slice(r.livePage * LS, (r.livePage + 1) * LS);
    const wantPulled = [...new Set([...featuredOthers, ...visible])].sort();
    if (JSON.stringify(r.pulled) !== JSON.stringify(wantPulled))
      fails.push(`${probe}: pulled [${r.pulled}] != want [${wantPulled}]`);
    // 4. wall pollers == expected wall ids (OP excluded by client rule)
    const wantWall = Object.keys(expected.tiers)
      .filter(id => expected.tiers[id] === "wall" && id !== "OP" && id !== probe).sort();
    if (JSON.stringify(r.wallPolled) !== JSON.stringify(wantWall))
      fails.push(`${probe}: wallPolled [${r.wallPolled}] != want [${wantWall}]`);
  }
  // 5. cross-probe view sync (same deltas -> same order and page)
  const r1 = rosters["1"], r2 = rosters["2"];
  if (r1 && r2) {
    if (JSON.stringify(r1.liveOrder) !== JSON.stringify(r2.liveOrder))
      fails.push(`liveOrder diverged: [${r1.liveOrder}] vs [${r2.liveOrder}]`);
    if (r1.livePage !== r2.livePage)
      fails.push(`livePage diverged: ${r1.livePage} vs ${r2.livePage}`);
  }
  const pass = fails.length === 0;
  say(`ASSERT ${ev.id}: ${pass ? "PASS" : "FAIL " + JSON.stringify(fails)}`);
  await collect({ kind: "assert", eventId: ev.id, t: Date.now(), tShow: Date.now() - t0,
                  pass, fails, expectedPage: expected.page,
                  expectedTiers: expected.tiers });
  return pass;
}

// ============================================================================
const run = async () => {
  say(`SHOW run label=${LABEL} room=${ROOM} smoke=${SMOKE} stag=${STAG} score=${SCORE_FILE} (${score.events.length} events, ${score.durationMs / 1000}s)`);
  const batt = execSync("pmset -g batt").toString().trim().split("\n").pop();
  say("battery:", batt);
  killByUddPrefix(UDD_BASE);
  const hz = await fetch(`${BASE}/healthz`).catch(() => null);
  if (!hz || !hz.ok) { console.error("server not reachable on :8893 — start grid-server.py with M2M_PORT=8893 first"); process.exit(1); }
  await collect({ kind: "run-start", label: LABEL, room: ROOM, smoke: SMOKE, stag: STAG,
                  score: SCORE_FILE, t: Date.now(), batt });

  for (const g of GROUPS) await launchGroup(g);
  const tStorm = Date.now();
  await Promise.all([...pages.values()].map(e => e.page.evaluate(() => { window.__go = true; }).catch(() => {})));
  say(`RELEASED all ${pages.size}`);
  await collect({ kind: "storm", n: pages.size, t: tStorm });

  const reloads = {};
  async function reviveFailed(st) {
    for (const [id, s] of Object.entries(st)) {
      if (!s || s.phase !== "failed") continue;
      reloads[id] = (reloads[id] || 0) + 1;
      if (reloads[id] > 2) throw new Error(`participant ${id} failed after ${reloads[id] - 1} reloads: ${s.error}`);
      say(`participant ${id} publish-exhausted — reloading (${reloads[id]}/2)`);
      await collect({ kind: "page-reload", id, n: reloads[id], t: Date.now() });
      await pages.get(id).page.goto(urlFor(id).replace("hold=1", "hold=0") + `&rl=${reloads[id]}`,
        { waitUntil: "load" }).catch(() => {});
    }
  }
  await waitFor(async () => {
    const st = await allStates();
    await reviveFailed(st);
    say("join:", describe(st));
    return allRunning(st);
  }, 150000, "all 12 running");
  say("all 12 RUNNING (tier wall) — spawning the operator (score.mjs)");

  // ---- spawn the operator with a t0 far enough out for cast + ready ---------
  const T0 = Date.now() + T0_LEAD_MS;
  const scoreLog = fs.createWriteStream(`${LOGDIR}/show-${LABEL}-score.log`, { flags: "a" });
  const op = spawn("node", [`${HERE}/score.mjs`, "--score", SCORE_FILE, "--t0", String(T0),
                            "--room", ROOM, "--base", BASE, "--remote", REMOTE_URL],
                   { cwd: HERE, stdio: ["ignore", "pipe", "pipe"] });
  op.stdout.on("data", d => { process.stdout.write(String(d)); scoreLog.write(String(d)); });
  op.stderr.on("data", d => { process.stderr.write(String(d)); scoreLog.write(String(d)); });
  let opExit = null;
  op.on("exit", (code) => { opExit = code; say(`score.mjs exited code ${code}`); });
  await collect({ kind: "t0", t0: T0, t: Date.now() });

  // ---- ready before t0 ------------------------------------------------------
  try {
    const readyMs = await waitFor(async () => {
      const st = await allStates();
      await reviveFailed(st);
      say("cast:", describe(st));
      return gridReady(st);
    }, T0 - Date.now() - 2000, "grid ready before t0");
    say(`GRID READY ${readyMs} ms after storm, ${T0 - Date.now()} ms of lead left`);
    await collect({ kind: "grid-ready", t: Date.now(), leadLeftMs: T0 - Date.now() });
  } catch (e) {
    say(`WARNING: ${e.message} — show proceeds, assertions will catch residue`);
    await collect({ kind: "ready-timeout", t: Date.now() });
  }
  for (const id of PROBES) await shot(id, "ready");

  // ---- assertion + screenshot + cpu schedule --------------------------------
  const cpuTimer = setInterval(async () => {
    const c = cpuSample();
    if (c) await collect(Object.assign({ kind: "cpu", t: Date.now() }, c));
  }, 10000);

  const jobs = [];       // [{at, fn, tag}]
  score.events.forEach((ev, i) => {
    jobs.push({ at: T0 + ev.fireAt + eventSettleMs(ev), tag: `assert-${ev.id}`,
                fn: () => assertEvent(i, T0) });
  });
  // screenshots at the dramaturgical moments (smoke score has its own ids)
  const shotPlan = SMOKE
    ? [["s01-spotlight-W", 4000, "spotlight"], ["s03-swap", 5000, "swap"]]
    : [["e01-spotlight-W", 4000, "spotlight"],
       ["e05-wave1-2", 1200, "wave-mid"],       // mid-sweep, tiles switching
       ["e06-wave1-3", 5000, "wave-settled"],
       ["e10-duet", 5000, "duet"],
       ["e17-spotlight-X", 4000, "spotlight-X"]];
  for (const [evId, dt, tag] of shotPlan) {
    const ev = score.events.find(e => e.id === evId);
    if (ev) jobs.push({ at: T0 + ev.fireAt + dt, tag: `shot-${tag}`,
                        fn: async () => { for (const id of PROBES) await shot(id, tag); } });
  }
  jobs.sort((a, b) => a.at - b.at);
  for (const job of jobs) {
    const wait = job.at - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    await job.fn();
  }

  // ---- wrap up --------------------------------------------------------------
  const endAt = T0 + (score.durationMs || 300000) + 4000;
  if (endAt > Date.now()) await new Promise(r => setTimeout(r, endAt - Date.now()));
  clearInterval(cpuTimer);
  const finals = await allStates();
  say("final:", describe(finals));
  await collect({ kind: "final", t: Date.now(), states: finals });
  for (const id of PROBES) await shot(id, "final");
  await new Promise(r => setTimeout(r, 1500));
  if (opExit == null) { try { op.kill("SIGTERM"); } catch (e) { /* noop */ } }
  for (const ctx of ctxs.values()) await ctx.close().catch(() => {});
  const leftover = killByUddPrefix(UDD_BASE);
  say(`run done (killed ${leftover} leftover pids) — analyze: python3 ${HERE}/analyze-show.py <results.jsonl>`);
};

run().catch(async e => {
  console.error(ts(), "DRIVER FATAL:", e.message || e);
  await collect({ kind: "driver-fatal", t: Date.now(), error: String(e.message || e) });
  for (const ctx of ctxs.values()) await ctx.close().catch(() => {});
  killByUddPrefix(UDD_BASE);
  process.exit(1);
});
