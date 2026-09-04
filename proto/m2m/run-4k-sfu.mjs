#!/usr/bin/env node
// 4K-over-SFU driver — run-scale.mjs pattern reduced to 2 participants:
//   P = 4K publisher (pub4k-room.html mode=pub, 3840x2160 canvas by default)
//   1 = probe (mode=full: pulls P, decodes burned rows, reports inbound WxH)
// Usage: ARM=4k30 DURATION=90 [VW=3840 VH=2160 VFPS=30 KBPS=15000 NOISE=0
//        HINT=detail DEGPREF=maintain-resolution CODEC=h264] node run-4k-sfu.mjs
// server.py must be up on :8889 (M2M_PORT=8889 M2M_RESULTS=results/m2m-4k-sfu-<arm>.jsonl)
import { createRequire } from "module";
const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
const { chromium } = require("playwright");
import fs from "fs";
import { execSync } from "child_process";

const ARM = process.env.ARM || "4k30";
const DURATION_S = parseInt(process.env.DURATION || "90", 10);
const VW = process.env.VW || "3840";
const VH = process.env.VH || "2160";
const VFPS = process.env.VFPS || "30";
const KBPS = process.env.KBPS || "15000";
const NOISE = process.env.NOISE === "1" ? "1" : "0";
const HINT = process.env.HINT || "detail";
const DEGPREF = process.env.DEGPREF || "maintain-resolution";
const CODEC = process.env.CODEC || "h264";
// CH=chrome (default) -> REAL Google Chrome (VideoToolbox hw H.264, same encoder
// class as the MoQ 4K matrix). CH=chromium -> Playwright build (OpenH264 sw).
const CH = process.env.CH || "chrome";
const BASE = "http://127.0.0.1:8889";
const HERE = "/Users/s32863/personal/positron/proto/m2m";
const LOGDIR = `${HERE}/logs`;
const UDD_BASE = "/private/tmp/claude-501/-Users-s32863-personal-positron/3e55abee-40f5-4628-b7fd-775f7a2bfd0b/scratchpad/m2m-4k-udd";
fs.mkdirSync(LOGDIR, { recursive: true });

const IDS = ["1", "P"];

const ARGS = [
  "--autoplay-policy=no-user-gesture-required",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
  "--mute-audio",
  // fake capture device (real camera is WEDGED and must never be opened):
  // a one-shot fake-gUM unlocks encoderImplementation/decoderImplementation in
  // getStats (Chrome hides them from capture-less pages to limit fingerprinting)
  "--use-fake-device-for-media-stream",
  "--use-fake-ui-for-media-stream",
];

function ts() { return new Date().toISOString().slice(11, 23); }
function say(...a) { console.log(ts(), ...a); }

function killStale() {
  try {
    const out = execSync(`ps -Ao pid,command | grep -F "${UDD_BASE}" | grep -v grep || true`).toString();
    const pids = out.split("\n").filter(Boolean).map(l => parseInt(l.trim().split(/\s+/)[0], 10));
    if (pids.length) {
      say(`killing ${pids.length} stale chrome pids from previous m2m-4k runs`);
      execSync(`kill ${pids.join(" ")} 2>/dev/null || true`);
    }
  } catch (e) { /* none */ }
}

function cpuSample() {
  const out = execSync("ps -Ao pcpu,command",
    { env: { ...process.env, LC_ALL: "C" }, maxBuffer: 32 * 1024 * 1024 }).toString().split("\n").slice(1);
  let totalPct = 0, oursPct = 0, siblingPct = 0;
  for (const l of out) {
    const m = l.match(/^\s*([\d.,]+)\s+(.*)$/);
    if (!m) continue;
    const pcpu = +m[1].replace(",", ".");
    totalPct += pcpu;
    if (m[2].includes(UDD_BASE)) oursPct += pcpu;
    if (m[2].includes("moq-audio") || m[2].includes("moq-4k-pub") || m[2].includes("moq-safari")) siblingPct += pcpu;
  }
  const load = execSync("sysctl -n vm.loadavg").toString().trim();
  return { totalPct: Math.round(totalPct * 10) / 10, oursPct: Math.round(oursPct * 10) / 10,
           siblingPct: Math.round(siblingPct * 10) / 10, load };
}

async function launchParticipant(id) {
  const udd = `${UDD_BASE}-${id}`;
  fs.rmSync(udd, { recursive: true, force: true });
  const ctx = await chromium.launchPersistentContext(udd, {
    headless: true, channel: CH, args: ARGS,
    viewport: { width: 1440, height: 900 },
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  const logStream = fs.createWriteStream(`${LOGDIR}/4k-${id}.console.log`, { flags: "a" });
  page.on("console", m => logStream.write(`${ts()} [${m.type()}] ${m.text()}\n`));
  page.on("pageerror", e => logStream.write(`${ts()} [pageerror] ${e.message}\n`));
  const params = id === "P"
    ? `id=P&n=2&mode=pub&vw=${VW}&vh=${VH}&vfps=${VFPS}&kbps=${KBPS}&noise=${NOISE}&hint=${HINT}&degpref=${DEGPREF}&codec=${CODEC}&gum=keep&cls=pub4k-${ARM}`
    : `id=1&n=2&mode=full&gum=keep&cls=probe-${ARM}`;
  await page.goto(`${BASE}/pub4k-room.html?${params}&cb=${Date.now()}`, { waitUntil: "load" });
  return { id, ctx, page };
}

async function collect(obj) {
  await fetch(`${BASE}/collect`, { method: "POST", body: JSON.stringify(obj) }).catch(() => {});
}

function describe(states) {
  return states.map(s => {
    const tiles = Object.entries(s.tiles || {}).map(([pid, t]) =>
      `${pid}:${t.valid}/${t.samples}` + (t.lastLatencyMs != null ? `@${t.lastLatencyMs}ms` : "") +
      (t.lastW ? ` ${t.lastW}x${t.lastH}` : ""));
    return `${s.id}:${s.phase} frames=${s.frames}` +
      (s.fps != null ? ` fps=${s.fps}` : "") +
      (s.outWH ? ` out=${s.outWH}` : "") +
      (s.qlr ? ` qlr=${s.qlr}` : "") +
      (s.encoderImplementation ? ` enc=${s.encoderImplementation}` : "") +
      (tiles.length ? ` tiles[${tiles.join(" ")}]` : "");
  }).join(" | ");
}

const run = async () => {
  say(`m2m 4K SFU run: arm=${ARM} ${VW}x${VH}@${VFPS} kbps=${KBPS} noise=${NOISE} degpref=${DEGPREF} codec=${CODEC} channel=${CH} duration=${DURATION_S}s`);
  killStale();
  const ro = await fetch(`${BASE}/roster`).catch(() => null);
  if (!ro || !ro.ok) { console.error("server on :8889 not reachable — start server.py first"); process.exit(1); }
  await fetch(`${BASE}/reset`, { method: "POST" });
  await collect({ kind: "arm-start", arm: ARM, t: Date.now(),
                  cfg: { VW, VH, VFPS, KBPS, NOISE, HINT, DEGPREF, CODEC }, cpu: cpuSample() });

  const parts = [];
  for (const id of IDS) {
    parts.push(await launchParticipant(id));
    say(`${id} launched`);
  }

  // wait until probe has a valid decoding tile from P
  const t0 = Date.now();
  for (;;) {
    await new Promise(r => setTimeout(r, 2000));
    const states = await Promise.all(parts.map(p => p.page.evaluate(() => window.__state)));
    const failed = states.find(s => s.phase === "failed");
    if (failed) {
      for (const p of parts) await p.page.screenshot({ path: `${LOGDIR}/4k-${p.id}-${ARM}-fail.png` }).catch(() => {});
      throw new Error(`participant ${failed.id} failed: ${failed.error}`);
    }
    say("mesh:", describe(states));
    const probe = states.find(s => s.id === "1");
    const tile = probe && probe.tiles && probe.tiles["P"];
    if (tile && tile.valid > 0) break;
    if (Date.now() - t0 > 120000) {
      for (const p of parts) await p.page.screenshot({ path: `${LOGDIR}/4k-${p.id}-${ARM}-meshtimeout.png` }).catch(() => {});
      throw new Error("no valid decode in 120s: " + describe(states));
    }
  }
  const meshMs = Date.now() - t0;
  say(`FLOWING in ${meshMs} ms — measuring ${DURATION_S}s`);
  await collect({ kind: "mesh", arm: ARM, meshMs, t: Date.now() });
  for (const p of parts) await p.page.screenshot({ path: `${LOGDIR}/4k-${p.id}-${ARM}-mesh.png` }).catch(() => {});

  const tRun = Date.now();
  let lastCpu = 0;
  while (Date.now() - tRun < DURATION_S * 1000) {
    await new Promise(r => setTimeout(r, 5000));
    const states = await Promise.all(parts.map(p => p.page.evaluate(() => window.__state)));
    say(describe(states));
    if (Date.now() - lastCpu > 15000) {
      lastCpu = Date.now();
      const cpu = cpuSample();
      say(`CPU total=${cpu.totalPct}% ours=${cpu.oursPct}% moq-siblings=${cpu.siblingPct}% load=${cpu.load}`);
      await collect({ kind: "cpu", arm: ARM, t: Date.now(), cpu });
    }
  }

  // real-Chrome pages under 4K encode load can wedge evaluate/close — bound
  // every shutdown step (arms A2/A3 hung here; data was already on disk)
  const bounded = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r("TIMEOUT"), ms))]);
  const finals = await bounded(Promise.all(parts.map(p => p.page.evaluate(() => window.__state))), 10000);
  await collect({ kind: "final", arm: ARM, t: Date.now(), states: finals });
  for (const p of parts) await bounded(p.page.screenshot({ path: `${LOGDIR}/4k-${p.id}-${ARM}-final.png` }).catch(() => {}), 8000);
  await new Promise(r => setTimeout(r, 1500));
  for (const p of parts) await bounded(p.ctx.close().catch(() => {}), 8000);
  killStale();
  say("run done");
  process.exit(0);
};

run().catch(async e => {
  console.error(ts(), "DRIVER FATAL:", e.message || e);
  killStale();
  process.exit(1);
});
