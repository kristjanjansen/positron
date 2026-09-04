#!/usr/bin/env node
// m2m TIERED GRID driver — N=12: 2 featured ("1","2", view=full — the two
// performers ARE the measuring probes: they render the full three-tier grid),
// 6 live (A..F, view=lite: publish + signaling only), 4 wall (W,X,Y,Z,
// view=lite: publish + snapshot POST loop).
// Co-tenancy per phase-1c verdict (clean at 5 pages/Chrome); the KILL target
// (A) runs in its OWN Chrome so SIGKILL takes out exactly one participant.
//
// Stages (SMOKE=1 runs ready+short steady only):
//   ready  -> join storm, wait for full grid on both probes
//   steady -> DURATION s (default 120) per-tier latency + wall freshness
//   rotate -> 5 live-page rotations on both probes (tile-switch TTFF)
//   kill   -> SIGKILL A's Chrome; time kill -> left -> dead-marked
//   rejoin -> relaunch A same id; publish-retry + roster restore + repull
//   promote-> W wall->live (spotlight), 15 s, then demote back to wall
//
// Usage:  python3 grid-server.py must be up on :8897 (M2M_RESULTS set!)
//   SMOKE=1 node run-grid.mjs
//   LABEL=main DURATION=120 node run-grid.mjs
import { createRequire } from "module";
const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
const { chromium } = require("playwright");
import fs from "fs";
import { execSync } from "child_process";

const SMOKE = process.env.SMOKE === "1";
const REMOTE = process.env.REMOTE === "1";     // 1 = signaling/tiles/SFU via the DEPLOYED Worker
const REMOTE_URL = process.env.REMOTE_URL || "https://rtc.positron.studio";
const LABEL = process.env.LABEL || (SMOKE ? "smoke" : "main");
const DURATION_S = parseInt(process.env.DURATION || (SMOKE ? "30" : "120"), 10);
const BASE = "http://127.0.0.1:8897";
const ROOM = `grid-${LABEL}`;
const HERE = "/Users/s32863/personal/positron/proto/m2m";
const LOGDIR = `${HERE}/logs`;
const UDD_BASE = "/private/tmp/claude-501/-Users-s32863-personal-positron/3e55abee-40f5-4628-b7fd-775f7a2bfd0b/scratchpad/m2m-grid-udd";
const LS = 4;                 // live page size in the rig: 6 live -> pages of 4+2
fs.mkdirSync(LOGDIR, { recursive: true });

function roomToken(key = "ROOM_TOKEN") {   // token from .env (Worker auth; never committed)
  try {
    const line = fs.readFileSync("/Users/s32863/personal/positron/.env", "utf8")
      .split("\n").find(l => l.startsWith(key + "="));
    return line ? line.slice(key.length + 1).trim() : "";
  } catch (e) { return ""; }
}
const TOKEN = REMOTE ? roomToken() : "";
if (REMOTE && !TOKEN) { console.error("REMOTE=1 but no ROOM_TOKEN in .env"); process.exit(1); }
const OP_TOKEN = REMOTE ? roomToken("OPERATOR_TOKEN") : "";   // operator joins need it

// id -> {tier: TARGET tier (cast by the operator after join), name, role, view}
const ROSTER = {
  "1": { tier: "featured", name: "Perf-Ada",  role: "operator",  view: "full" },
  "2": { tier: "featured", name: "Perf-Bela", role: "performer", view: "full" },
  "A": { tier: "live", name: "Live-A", role: "audience", view: "lite" },
  "B": { tier: "live", name: "Live-B", role: "audience", view: "lite" },
  "C": { tier: "live", name: "Live-C", role: "audience", view: "lite" },
  "D": { tier: "live", name: "Live-D", role: "audience", view: "lite" },
  "E": { tier: "live", name: "Live-E", role: "audience", view: "lite" },
  "F": { tier: "live", name: "Live-F", role: "audience", view: "lite" },
  "W": { tier: "wall", name: "Wall-W", role: "audience", view: "lite" },
  "X": { tier: "wall", name: "Wall-X", role: "audience", view: "lite" },
  "Y": { tier: "wall", name: "Wall-Y", role: "audience", view: "lite" },
  "Z": { tier: "wall", name: "Wall-Z", role: "audience", view: "lite" },
};
const PROBES = ["1", "2"];
// co-tenancy groups; A isolated (SIGKILL target), <=5 pages/instance (H5)
const GROUPS = [
  { name: "g0",    ids: ["1", "2", "B", "C"] },
  { name: "g1",    ids: ["D", "E", "F", "W"] },
  { name: "g2",    ids: ["X", "Y", "Z"] },
  { name: "gkill", ids: ["A"] },
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

function urlFor(id) {
  const r = ROSTER[id];
  return `${BASE}/grid.html?id=${id}&name=${r.name}&room=${ROOM}&role=${r.role}` +
         `&view=${r.view}&ls=${LS}&hold=1&cb=${Date.now()}` +
         (r.role === "operator" && OP_TOKEN ? `&optoken=${encodeURIComponent(OP_TOKEN)}` : "") +
         (REMOTE ? `&remote=${encodeURIComponent(REMOTE_URL)}&token=${encodeURIComponent(TOKEN)}` : "");
}

const pages = new Map();      // id -> {page, group}
const ctxs = new Map();       // groupName -> ctx

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
    const logStream = fs.createWriteStream(`${LOGDIR}/grid-${LABEL}-${id}.console.log`, { flags: "a" });
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
    const lats = tiles.map(([, t]) => t.lastLatencyMs).filter(x => x != null);
    const wall = Object.entries(s.wall || {});
    const wOk = wall.filter(([, w]) => w.freshMs != null).length;
    return `${id}:${s.phase} v=${v}/${tiles.length} wall=${wOk}` +
      (lats.length ? ` lat[${Math.min(...lats)}..${Math.max(...lats)}]` : "");
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
    // 1 other featured + LS visible live tiles, all decoding
    const need = 1 + Math.min(LS, 6);
    if (tiles.filter(t => t.valid > 0).length < need) return false;
    // exactly the 4 wall-tier participants, snapshots fresh in the last 6 s
    const wallIds = Object.keys(ROSTER).filter(x => ROSTER[x].tier === "wall");
    const fresh = wallIds.filter(w => {
      const e = (s.wall || {})[w];
      return e && e.freshMs != null && e.lastT > now - 6000;
    });
    if (fresh.length < wallIds.length) return false;
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
  await e.page.screenshot({ path: `${LOGDIR}/grid-${LABEL}-${id}-${tag}.png` }).catch(() => {});
}

async function waitFor(fn, timeoutMs, what) {
  const t0 = Date.now();
  for (;;) {
    if (await fn()) return Date.now() - t0;
    if (Date.now() - t0 > timeoutMs) throw new Error(`timeout waiting for ${what}`);
    await new Promise(r => setTimeout(r, 500));
  }
}

// rotate a probe until participant pid's live tile is pulled+decoding there
async function ensureVisible(pid) {
  for (const probe of PROBES) {
    for (let i = 0; i < 4; i++) {
      const s = await state(probe);
      const t = s && s.tiles && s.tiles[pid];
      if (t && t.valid > 0) break;
      say(`  probe ${probe}: ${pid} not visible (page ${s && s.livePage}) — rotating`);
      await pages.get(probe).page.evaluate(() => window.__rotate());
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}
// bring a probe to live page 0 (fresh promotions land at the FRONT of page 0)
async function ensurePage0() {
  for (const probe of PROBES) {
    for (let i = 0; i < 4; i++) {
      const s = await state(probe);
      if (!s || s.livePage === 0) break;
      await pages.get(probe).page.evaluate(() => window.__rotate());
      await new Promise(r => setTimeout(r, 2500));
    }
  }
}

const run = async () => {
  say(`GRID run label=${LABEL} room=${ROOM} smoke=${SMOKE} steady=${DURATION_S}s ls=${LS}`);
  const batt = execSync("pmset -g batt").toString().trim().split("\n").pop();
  say("battery:", batt);
  killByUddPrefix(UDD_BASE);
  const hz = await fetch(`${BASE}/healthz`).catch(() => null);
  if (!hz || !hz.ok) { console.error("grid-server.py not reachable on :8897 — start it first"); process.exit(1); }
  await collect({ kind: "run-start", label: LABEL, room: ROOM, smoke: SMOKE, t: Date.now(), batt });

  // ---- launch all HELD, then release together (join storm) -----------------
  for (const g of GROUPS) await launchGroup(g);
  const tStorm = Date.now();
  await Promise.all([...pages.values()].map(e => e.page.evaluate(() => { window.__go = true; }).catch(() => {})));
  say(`RELEASED all ${pages.size}`);
  await collect({ kind: "storm", n: pages.size, t: tStorm });

  // ---- all running (everyone joins at tier wall, Worker rule) ---------------
  // A page whose publish leg EXHAUSTS retries gets reloaded (max 2x) — the
  // production "reload the tab" recovery; every exhaust is in the jsonl.
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
  try {
    await waitFor(async () => {
      const st = await allStates();
      await reviveFailed(st);
      say("join:", describe(st));
      return allRunning(st);
    }, 150000, "all 12 running");
  } catch (e) {
    for (const id of PROBES) await shot(id, "joinfail");
    throw e;
  }
  say("all 12 RUNNING (all wall tier) — CASTING via operator promotes");

  // ---- cast: operator (probe 1) promotes 2 featured + 6 live ----------------
  const tCast = Date.now();
  await collect({ kind: "cast", t: tCast });
  for (const [id, r] of Object.entries(ROSTER)) {
    if (r.tier === "wall") continue;
    await pages.get("1").page.evaluate(([pid, tier]) => window.__promote(pid, tier), [id, r.tier]);
    await new Promise(r2 => setTimeout(r2, 150));
  }

  // ---- ready ----------------------------------------------------------------
  let readyMs;
  const lastRecast = {};
  try {
    readyMs = await waitFor(async () => {
      const st = await allStates();
      await reviveFailed(st);
      // a reloaded page rejoined at tier wall — operator re-promotes it
      for (const [id, r] of Object.entries(ROSTER)) {
        const s = st[id];
        if (r.tier !== "wall" && s && s.phase === "running" && s.tier !== r.tier &&
            Date.now() - (lastRecast[id] || 0) > 5000) {
          lastRecast[id] = Date.now();
          say(`re-promoting ${id} -> ${r.tier} (came back at tier ${s.tier})`);
          await pages.get("1").page.evaluate(
            ([pid, tier]) => window.__promote(pid, tier), [id, r.tier]);
        }
      }
      say("grid:", describe(st));
      return gridReady(st);
    }, 120000, "grid ready");
  } catch (e) {
    for (const id of PROBES) await shot(id, "readyfail");
    throw e;
  }
  say(`GRID READY: storm->ready ${Date.now() - tStorm} ms, cast->ready ${Date.now() - tCast} ms`);
  await collect({ kind: "grid-ready", t: Date.now(), readyMs: Date.now() - tStorm, castMs: Date.now() - tCast });
  for (const id of PROBES) await shot(id, "ready");

  // ---- steady state ---------------------------------------------------------
  say(`STEADY ${DURATION_S}s`);
  const tSteady = Date.now();
  await collect({ kind: "stage", stage: "steady", t: tSteady });
  while (Date.now() - tSteady < DURATION_S * 1000) {
    await new Promise(r => setTimeout(r, 5000));
    say("steady:", describe(await allStates()));
  }
  await collect({ kind: "stage-end", stage: "steady", t: Date.now() });
  for (const id of PROBES) await shot(id, "steady");

  if (!SMOKE) {
    // ---- rotation x5 --------------------------------------------------------
    say("ROTATE x5 (live pages of " + LS + ", 6 live -> 2 pages)");
    await collect({ kind: "stage", stage: "rotate", t: Date.now() });
    for (let i = 1; i <= 5; i++) {
      const tR = Date.now();
      await collect({ kind: "rotate-cmd", i, t: tR });
      for (const id of PROBES)
        await pages.get(id).page.evaluate(() => window.__rotate());
      await new Promise(r => setTimeout(r, 8000));
      say(`rotation ${i} done:`, describe(await allStates()));
    }
    await collect({ kind: "stage-end", stage: "rotate", t: Date.now() });
    for (const id of PROBES) await shot(id, "rotate");
    await new Promise(r => setTimeout(r, 4000));

    // ---- kill a live publisher ungracefully ---------------------------------
    say("KILL live publisher A (SIGKILL its dedicated Chrome)");
    await collect({ kind: "stage", stage: "kill", t: Date.now() });
    await ensureVisible("A");               // tile must be on-screen to measure dead-marking
    await new Promise(r => setTimeout(r, 3000));
    const tKill = Date.now();
    await collect({ kind: "kill", id: "A", t: tKill });
    const nk = killByUddPrefix(`${UDD_BASE}-gkill`);
    say(`SIGKILLed ${nk} processes of gkill at ${new Date(tKill).toISOString()}`);
    pages.delete("A");
    const gk = ctxs.get("gkill"); ctxs.delete("gkill");
    const deadMs = await waitFor(async () => {
      for (const id of PROBES) {
        const s = await state(id);
        const lr = s && s.leftReceived && s.leftReceived.A;
        if (!lr || lr < tKill - 1000) return false;
      }
      return true;
    }, 15000, "both probes receive left(A)");
    say(`A marked DEAD on both probes ~${deadMs} ms after SIGKILL (jsonl has exact left-received)`);
    await collect({ kind: "dead-confirmed", id: "A", t: Date.now(), approxMs: Date.now() - tKill });
    for (const id of PROBES) await shot(id, "kill");
    if (gk) await gk.close().catch(() => {});
    await new Promise(r => setTimeout(r, 5000));

    // ---- rejoin -------------------------------------------------------------
    // Worker rule: rejoin lands at tier WALL; roster restore is visible as the
    // wall snapshot resuming; the operator then re-promotes A to live.
    say("REJOIN: relaunch A with the same id");
    await collect({ kind: "stage", stage: "rejoin", t: Date.now() });
    const tRelaunch = Date.now();
    await collect({ kind: "relaunch", id: "A", t: tRelaunch });
    await launchGroup({ name: "gkill", ids: ["A"] });
    await pages.get("A").page.evaluate(() => { window.__go = true; });
    await waitFor(async () => {
      const s = await state("A");
      return s && s.phase === "running";
    }, 30000, "A running again");
    await collect({ kind: "rejoin-running", id: "A", t: Date.now(), sinceRelaunchMs: Date.now() - tRelaunch });
    say(`A running again at +${Date.now() - tRelaunch} ms — re-promoting to live`);
    await ensurePage0();
    const tRePromote = Date.now();
    await collect({ kind: "promote-cmd", id: "A", tier: "live", context: "rejoin", t: tRePromote });
    await pages.get("1").page.evaluate(() => window.__promote("A", "live"));
    const rejoinMs = await waitFor(async () => {
      for (const id of PROBES) {
        const s = await state(id);
        const t = s && s.tiles && s.tiles.A;
        if (!t || !(t.valid > 0) || t.deadSignaled) return false;
      }
      return true;
    }, 40000, "A restored on both probes");
    say(`A RESTORED: relaunch->decoding ${Date.now() - tRelaunch} ms (repromote->decoding ~${rejoinMs} ms)`);
    await collect({ kind: "rejoin-confirmed", id: "A", t: Date.now(),
                    approxMs: Date.now() - tRelaunch, sinceRepromoteMs: Date.now() - tRePromote });
    for (const id of PROBES) await shot(id, "rejoin");
    await new Promise(r => setTimeout(r, 4000));

    // ---- promote W: wall -> live (spotlight from the crowd) -----------------
    say("PROMOTE W wall->live");
    await collect({ kind: "stage", stage: "promote", t: Date.now() });
    await ensurePage0();                    // promotions land at the front of page 0
    const tProm = Date.now();
    await collect({ kind: "promote-cmd", id: "W", tier: "live", t: tProm });
    await pages.get("1").page.evaluate(() => window.__promote("W", "live"));
    const promMs = await waitFor(async () => {
      for (const id of PROBES) {
        const s = await state(id);
        const t = s && s.tiles && s.tiles.W;
        if (!t || !(t.valid > 0)) return false;
      }
      const sw = await state("W");
      if (!sw || sw.tier !== "live" || sw.wallPosting) return false;
      return true;
    }, 20000, "W live on both probes, wall-post stopped");
    say(`W PROMOTED: real video on both probes in ~${promMs} ms (snapshot loop stopped)`);
    await collect({ kind: "promote-confirmed", id: "W", t: Date.now(), approxMs: Date.now() - tProm });
    for (const id of PROBES) await shot(id, "promote");
    await new Promise(r => setTimeout(r, 10000));

    // ---- demote W back: live -> wall ----------------------------------------
    say("DEMOTE W live->wall");
    const tDem = Date.now();
    await collect({ kind: "promote-cmd", id: "W", tier: "wall", t: tDem });
    await pages.get("1").page.evaluate(() => window.__promote("W", "wall"));
    const demMs = await waitFor(async () => {
      for (const id of PROBES) {
        const s = await state(id);
        if (s && s.tiles && s.tiles.W) return false;        // video tile gone
        const w = s && s.wall && s.wall.W;
        // snapshot read AFTER the demote AND with post-demote content
        // (freshMs < 4 s — the DO fallback happily serves the stale
        // pre-promotion tile first, rmain-1 finding)
        if (!w || w.freshMs == null || w.freshMs > 4000 || w.lastT < tDem) return false;
      }
      const sw = await state("W");
      return sw && sw.tier === "wall" && sw.wallPosting;
    }, 25000, "W back on the wall with fresh snapshots");
    say(`W DEMOTED: back to snapshots in ~${demMs} ms`);
    await collect({ kind: "demote-confirmed", id: "W", t: Date.now(), approxMs: Date.now() - tDem });
    await new Promise(r => setTimeout(r, 5000));
  }

  // ---- final ----------------------------------------------------------------
  const finals = await allStates();
  say("final:", describe(finals));
  await collect({ kind: "final", t: Date.now(), states: finals });
  for (const id of PROBES) await shot(id, "final");
  await shot("W", "final");
  await new Promise(r => setTimeout(r, 1500));       // flush last 1 s batches
  for (const ctx of ctxs.values()) await ctx.close().catch(() => {});
  const leftover = killByUddPrefix(UDD_BASE);
  say(`run done (killed ${leftover} leftover pids) — analyze: python3 ${HERE}/analyze-grid.py <results.jsonl>`);
};

run().catch(async e => {
  console.error(ts(), "DRIVER FATAL:", e.message || e);
  await collect({ kind: "driver-fatal", t: Date.now(), error: String(e.message || e) });
  for (const ctx of ctxs.values()) await ctx.close().catch(() => {});
  killByUddPrefix(UDD_BASE);
  process.exit(1);
});
