#!/usr/bin/env node
// ===========================================================================
// STUDIO v0 — THE DoD CHECK, run headlessly, once.
//
//   "one command + one URL runs a complete show, and the replay link works
//    at the end."
//
// So this script does exactly that and nothing else: it starts the engine
// (ONE COMMAND), opens the console page (ONE URL), and then drives the real
// operator surface — it CLICKS GO LIVE, types cues into the cue box, CLICKS
// STOP, reads the replay link out of the DOM, opens it, and measures whether
// the cues land against the burned wall clock in the recorded pixels.
//
// Ground truth is the same as proto/archive/run-measure-archive.mjs:
//   errMs = decoded burned wall clock on the glass at the fire moment − fireAt
// Cue offsets are FRACTIONAL seconds, always (the 6u aliasing lesson).
//
// Usage:  node studio/verify.mjs [--duration=80]
// ===========================================================================
import { createRequire } from "node:module";
const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
const { chromium } = require("playwright");
import fs from "node:fs";
import { spawn, execSync } from "node:child_process";

const ROOT = "/Users/s32863/personal/positron";
const HERE = `${ROOT}/studio`;
const PORT = 8899;
const BASE = `http://127.0.0.1:${PORT}`;
const REMOTE = "https://rtc.positron.studio";
const SCRATCH = "/private/tmp/claude-501/-Users-s32863-personal-positron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad";
const ART = `${HERE}/artifacts`;
fs.mkdirSync(ART, { recursive: true });

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=")[1] : d; };
const DURATION = parseInt(arg("duration", "80"), 10);
const OFFSETS = (arg("offsets", "10.3,22.7,35.1,48.9,62.3")).split(",").map(Number);

const ts = () => new Date().toISOString().slice(11, 23);
const say = (...a) => console.log(ts(), "vfy|", ...a);
const envVal = (k) => {
  const l = fs.readFileSync(`${ROOT}/.env`, "utf8").split("\n").find((x) => x.startsWith(k + "="));
  return l ? l.slice(k.length + 1).trim() : "";
};
const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok: !!ok, detail });
  say(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail || ""}`); return ok; };
const pct = (s, p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];

let engine = null, ctx = null;
const bye = () => {
  try { ctx && ctx.close(); } catch {}
  try { engine && engine.kill("SIGINT"); } catch {}
  try { execSync(`ps -Ao pid,command | grep -F "${SCRATCH}/verify-udd" | grep -v grep | awk '{print $1}' | xargs kill -9 2>/dev/null || true`); } catch {}
};

const run = async () => {
  // ---- ONE COMMAND --------------------------------------------------------
  say("starting the engine: node studio/engine.mjs");
  const elog = fs.createWriteStream(`${HERE}/logs/verify-engine.log`, { flags: "a" });
  engine = spawn("node", [`${HERE}/engine.mjs`], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  engine.stdout.on("data", (d) => { elog.write(d); process.stdout.write("  " + d.toString()); });
  engine.stderr.on("data", (d) => elog.write(d));
  const tB = Date.now();
  for (;;) {
    const r = await fetch(`${BASE}/healthz`).catch(() => null);
    if (r && r.ok) break;
    if (Date.now() - tB > 20000) throw new Error("engine never came up on " + PORT);
    await new Promise((r) => setTimeout(r, 250));
  }
  check("engine-one-command", true, `${BASE} up in ${Date.now() - tB} ms`);

  // ---- ONE URL: the console -----------------------------------------------
  const udd = `${SCRATCH}/verify-udd`;
  fs.rmSync(udd, { recursive: true, force: true });
  ctx = await chromium.launchPersistentContext(udd, {
    headless: true, channel: "chromium",
    args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio",
           "--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
    viewport: { width: 1440, height: 940 },
  });
  const con = ctx.pages()[0] || await ctx.newPage();
  const cl = fs.createWriteStream(`${HERE}/logs/verify-console.log`, { flags: "a" });
  con.on("console", (m) => cl.write(`${ts()} [${m.type()}] ${m.text()}\n`));
  con.on("pageerror", (e) => cl.write(`${ts()} [pageerror] ${e.message}\n`));
  await con.goto(`${BASE}/`, { waitUntil: "load" });
  await con.waitForFunction(() => window.__x || document.getElementById("phase").textContent === "idle",
                            { timeout: 15000 });
  check("console-one-url", true, `${BASE}/ shows phase=idle`);

  // ---- SOUND: the 5 s check, clicked on the real button, BEFORE the show ---
  // A sound check that does not traverse the real publish path is theatre, so
  // this one records with the show's own encode, uploads through the real
  // wrangler→R2 transport and fetches the result back over public HTTPS. The
  // configured source here is SILENT, and the check must call that a PASS —
  // a silent show is a valid show — while still being able to tell it from a
  // silently broken one (it measures the level at both ends to do so).
  const tSc = Date.now();
  await con.click("#btnCheck");
  await con.waitForFunction(
    () => /^[✓✗]/.test(document.getElementById("soundVerdict").textContent), { timeout: 180000 });
  const scText = await con.textContent("#soundVerdict");
  const scStatus = await fetch(`${BASE}/api/status`).then((r) => r.json());
  const sc = scStatus.sound.lastCheck;
  check("soundcheck-through-the-real-publish-path",
        sc && sc.ok && sc.legs.every((l) => l.ok) && sc.afterR2 && sc.afterR2.frames > 0,
        `${Date.now() - tSc} ms · ${sc && sc.legs.map((l) => l.name + ":" + (l.ok ? "ok" : "FAIL")).join(" ")}`);
  check("soundcheck-calls-a-silent-show-valid", /^✓/.test(scText) && /SILENT/.test(scText),
        scText.split("\n")[0].slice(0, 110));

  // ---- GO LIVE: a real click on the real button ---------------------------
  const tGo = Date.now();
  await con.click("#btnGo");
  await con.waitForFunction(() => document.getElementById("phase").textContent === "live",
                            { timeout: 60000 });
  const st0 = await fetch(`${BASE}/api/status`).then((r) => r.json());
  const T0 = st0.T0, ROOM = st0.room;
  const timeToLive = T0 - tGo;
  check("go-live", !!T0 && st0.t0Exact, `T0=${T0} native, click→live ${timeToLive} ms`);
  check("legs-up", ["source", "record", "archive", "room"].every((l) => st0.legs[l] && st0.legs[l].up),
        Object.entries(st0.legs).map(([k, v]) => `${k}:${v.up ? "up" : "down"}`).join(" "));

  // ---- SOUND while live: the meter must be honest about a SILENT show ------
  await con.waitForFunction(() => /SILENT|dBFS/.test(document.getElementById("vuTxt").textContent),
                            { timeout: 20000 }).catch(() => {});
  const vuTxt = await con.textContent("#vuTxt");
  const vuStat = await fetch(`${BASE}/api/status`).then((r) => r.json());
  check("vu-meter-reads-the-record-leg",
        vuStat.sound.meter && vuStat.sound.meter.frames > 0,
        `${vuStat.sound.meter && vuStat.sound.meter.frames} metered frames from the record leg's own astats`);
  check("vu-says-silent-BY-CONFIGURATION-not-fault", /SILENT — as configured/.test(vuTxt || ""), vuTxt);

  // ---- ROOM: the roster, a real promote/demote, the permission window ------
  // The source page joins the room as `stage` (role audience), so there is a
  // real face to click without inventing a participant.
  await con.waitForFunction(() => document.querySelectorAll("#roster .who").length > 0,
                            { timeout: 20000 }).catch(() => {});
  const roster0 = await fetch(`${BASE}/api/status`).then((r) => r.json());
  const ids = (roster0.roster ? roster0.roster.participants : []).map((p) => p.id);
  check("roster-folds-the-DO-deltas", ids.includes("engine") && ids.includes("stage"),
        `roster=${ids.join(",")} (engine=operator, stage=the source page)`);

  await con.click('#roster .who[data-id="stage"]');
  await con.click('#tierBox button[data-tier="featured"]');
  await con.waitForFunction(
    () => /featured/.test(document.querySelector('#roster .who[data-id="stage"]').textContent),
    { timeout: 8000 }).catch(() => {});
  const afterPromote = await fetch(`${BASE}/api/status`).then((r) => r.json());
  const stage = afterPromote.roster.participants.find((p) => p.id === "stage");
  check("promote-through-the-real-UI", stage && stage.tier === "featured" &&
        afterPromote.lastTier && afterPromote.lastTier.echoMs != null,
        `stage → ${stage && stage.tier}, DO echo ${afterPromote.lastTier && afterPromote.lastTier.echoMs} ms`);
  await con.click('#tierBox button[data-tier="wall"]');
  await new Promise((r) => setTimeout(r, 1500));
  const afterDemote = await fetch(`${BASE}/api/status`).then((r) => r.json());
  const stage2 = afterDemote.roster.participants.find((p) => p.id === "stage");
  check("demote-through-the-real-UI", stage2 && stage2.tier === "wall",
        `stage → ${stage2 && stage2.tier}, echo ${afterDemote.lastTier && afterDemote.lastTier.echoMs} ms`);

  await con.uncheck("#permWin");
  await new Promise((r) => setTimeout(r, 1200));
  const permOff = await fetch(`${BASE}/api/status`).then((r) => r.json());
  const closed = permOff.roster.perm.publish.audience === false &&
                 permOff.roster.participants.find((p) => p.id === "stage").mayPublish === false;
  // The checkbox mirrors the ENGINE's fold, not the click, so it flips back for
  // the ~40 ms until the DO echoes. Wait for the mirror to settle or `check()`
  // is a no-op on an already-checked box and sends nothing.
  await con.waitForFunction(() => document.getElementById("permWin").checked === false,
                            { timeout: 6000 }).catch(() => {});
  await con.check("#permWin");
  await new Promise((r) => setTimeout(r, 1200));
  const permOn = await fetch(`${BASE}/api/status`).then((r) => r.json());
  check("permission-window-toggles-and-resolves-per-participant", closed &&
        permOn.roster.participants.find((p) => p.id === "stage").mayPublish === true,
        `closed→stage.mayPublish=false, reopened→true (DO order: per-participant → per-role → open)`);

  // ---- cues, typed into the cue box at FRACTIONAL offsets ------------------
  const fired = [];
  let shotDone = false;
  for (let i = 0; i < OFFSETS.length; i++) {
    const when = T0 + OFFSETS[i] * 1000;
    while (Date.now() < when) await new Promise((r) => setTimeout(r, 20));
    const id = `CUE-${String(i + 1).padStart(2, "0")}`;
    await con.fill("#cue", id);
    await con.click("#btnCue");
    fired.push(id);
    say(`typed ${id} at +${OFFSETS[i]}s`);
    if (!shotDone && i >= 2) {
      shotDone = true;
      await con.screenshot({ path: `${ART}/console-mid-show.png` });
      say(`console screenshot → ${ART}/console-mid-show.png`);
    }
  }
  while (Date.now() - T0 < DURATION * 1000) {
    await new Promise((r) => setTimeout(r, 5000));
    const s = await fetch(`${BASE}/api/status`).then((r) => r.json());
    say(`+${Math.round((Date.now() - T0) / 1000)}s segs=${s.spans} cues=${s.cues.length} ` +
        `fps=${s.health && s.health.fps} lag=${s.uploader.lastLagMs} cpu=${s.health && s.health.cpuPct}%`);
  }
  await con.screenshot({ path: `${ART}/console-late-show.png` });

  // the strip must be reading the deck's drift channel, not page state
  const stripSrc = await con.textContent("#stripsrc");
  check("strip-reads-drift-channel", /deck\.drift\(\) n=\d+/.test(stripSrc || ""), stripSrc);

  // ---- STOP: a real click -------------------------------------------------
  const tStopClick = Date.now();
  await con.click("#btnStop");
  await con.waitForFunction(() => document.getElementById("phase").textContent === "done",
                            { timeout: 400000 });
  const stopToDone = Date.now() - tStopClick;

  // ---- THE REPLAY LINK, read out of the console's DOM ----------------------
  const replayUrl = await con.getAttribute("#replay", "href");
  const replayVisible = await con.isVisible("#replay");
  check("replay-link-appears-at-stop", replayVisible && !!replayUrl && replayUrl.includes("anchor=stamp"),
        `after ${stopToDone} ms`);
  await con.screenshot({ path: `${ART}/console-stopped.png` });

  const show = await fetch(`${BASE}/api/status`).then((r) => r.json());
  const meta = JSON.parse(fs.readFileSync(`${HERE}/runs/${show.runId}/show.json`, "utf8"));
  check("reconcile-green", meta.reconcile.ok,
        meta.reconcile.checks.map((c) => `${c.name}:${c.ok ? "ok" : "FAIL"}`).join(" "));
  check("timeline-jsonl-indexed-and-readable", meta.timeline && meta.timeline.rows > 0,
        `${meta.timeline && meta.timeline.rows} rows, ${meta.timeline && meta.timeline.indexBytes} B sidecar`);
  check("timeline-uploaded-beside-show",
        meta.reconcile.checks.find((c) => c.name === "sidecar-timeline.jsonl").ok, meta.timelineUrl);

  // ---- OPEN THE LINK and measure that the cues LAND -----------------------
  const TOKEN = envVal("ROOM_TOKEN");
  const cuelog = await (await fetch(`${REMOTE}/room/${ROOM}/cuelog?token=${TOKEN}`)).json();
  const cancelled = new Set(cuelog.cues.filter((e) => e.kind === "cancel").map((e) => e.id));
  const CUES = cuelog.cues.filter((e) => e.cue && !cancelled.has(e.cue.id))
    .map((e) => ({ id: e.cue.id, at: e.cue.at }));
  check("cuelog-has-every-cue", CUES.length === fired.length, `${CUES.length}/${fired.length}`);

  const rep = await ctx.newPage();
  rep.on("pageerror", (e) => cl.write(`${ts()} [replay pageerror] ${e.message}\n`));
  await rep.goto(replayUrl + `&cb=${Date.now()}`, { waitUntil: "load" });
  const tR = Date.now();
  let s = null;
  for (;;) {
    s = await rep.evaluate(() => window.__state).catch(() => null);
    if (s && s.phase === "running") break;
    if (s && s.phase === "failed") throw new Error("replay page failed: " + s.error);
    if (Date.now() - tR > 60000) throw new Error("replay page never running");
    await new Promise((r) => setTimeout(r, 400));
  }
  say(`replay RUNNING from R2 (native stamp anchor) in ${Date.now() - tR} ms`);
  const lastCueVodT = (CUES[CUES.length - 1].at - T0) / 1000;
  for (;;) {
    s = await rep.evaluate(() => window.__state);
    const ct = await rep.evaluate(() => document.getElementById("vid").currentTime);
    if (s.fires.length + s.missed.length >= CUES.length && ct > lastCueVodT + 4 && s.t0.content != null) break;
    if (s.ended || ct >= meta.durationMs / 1000 - 1) break;
    say(`replay +${ct.toFixed(0)}s fires=${s.fires.length} caught=${s.missed.length} ` +
        `rvfc=${s.rvfc.validClock}/${s.rvfc.samples}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  await rep.screenshot({ path: `${ART}/replay-final.png` });

  const T0content = s.t0.content;
  const anchorDelta = T0content != null ? Math.round((T0content - T0) * 10) / 10 : null;
  const rows = CUES.map((c) => {
    const f = s.fires.find((x) => x.id === c.id && x.kind === "fired");
    return { id: c.id, at: c.at, fired: !!f,
             errMs: f && f.decOk ? Math.round(f.decClockMs - c.at) : null,
             engineLateMs: f ? Math.round(f.lateMs) : null };
  });
  const errs = rows.filter((r) => r.errMs != null).map((r) => r.errMs).sort((a, b) => a - b);
  const abs = errs.map(Math.abs).sort((a, b) => a - b);
  const summary = { n: errs.length, p50: pct(errs, .5), p95: pct(errs, .95),
                    absP50: pct(abs, .5), absP95: pct(abs, .95),
                    min: errs[0], max: errs[errs.length - 1] };
  say("per-cue err (decoded burned clock @ fire − fireAt, ms): " +
      rows.map((r) => `${r.id}:${r.errMs}`).join(" "));
  check("all-cues-fired-in-replay", rows.every((r) => r.fired),
        rows.filter((r) => !r.fired).map((r) => r.id).join(",") || `all ${rows.length}`);
  check("all-fire-frames-decoded", rows.every((r) => !r.fired || r.errMs != null), "decOk on every fire");
  check("cue-abs-p95-under-150ms", summary.absP95 <= 150, `absP95=${summary.absP95} ms`);
  // ANCHOR GATE — read the comment before touching the number. CLOSED
  // 2026-08-30 by studio/anchor-probe.mjs; NOTES.md §anchor has the full trail.
  //
  // content−native is FRAME-QUANTISED and was never a constant: it is the sum
  // of (a) how stale the pixels of the frame we stamp are, and (b) how many
  // source frames the encoder swallows before media t=0 exists. Measured over
  // 11 identical legacy runs its support was ~95 ms wide (−24…+42), in 33 ms
  // steps. The old −45.3 here and the −15 in proto/archive are ONE FRAME apart
  // at 30 fps — two draws from that distribution, not two rigs disagreeing.
  //
  // The engine now (1) discards the stale re-capture Page.startScreencast
  // returns first and (2) stamps the CDP frame-SWAP time of the first frame it
  // actually writes. That is asserted below as a construction, not as a
  // statistic. The value gate stays on the budget that matters — a third of the
  // 150 ms cue budget — because the browser's own content anchor carries a
  // ~one-frame rVFC pairing bias of its own (see NOTES), so its absolute value
  // is not ground truth. The number that IS ground truth is the per-cue error.
  say(`ANCHOR content−native = ${anchorDelta} ms ` +
      `(one frame @30fps = 33 ms; spread ${s.t0.spreadMs} ms; ` +
      `offline cross-check: node studio/anchor-probe.mjs --run=${show.runId})`);
  check("native-anchor-under-third-of-cue-budget", anchorDelta != null && Math.abs(anchorDelta) <= 50,
        `content−native=${anchorDelta} ms`);
  // The regression guard for the fix — deterministic, so it cannot flake at n=5.
  const anc = meta.anchor || {};
  check("anchor-is-the-swap-of-a-written-frame",
        anc.mode === "swap" && anc.skippedFirstFrame === true &&
        anc.swapMinusArriveMs != null && Math.abs(anc.swapMinusArriveMs) <= 25,
        `mode=${anc.mode} skippedFirst=${anc.skippedFirstFrame} swap−arrive=${anc.swapMinusArriveMs} ms`);
  check("burn-decode-rate", s.rvfc.samples > 0 && s.rvfc.validClock / s.rvfc.samples > 0.95,
        `${s.rvfc.validClock}/${s.rvfc.samples}`);

  const report = {
    t: Date.now(), runId: show.runId, room: ROOM, replayUrl,
    headline: {
      timeToLiveMs: timeToLive, stopClickToReplayLinkMs: stopToDone,
      uploadLagMs: meta.uploader && meta.uploader.lagMs,
      diskHighWater: meta.uploader && meta.uploader.diskHighWater,
      segments: meta.segments, durationMs: meta.durationMs,
      cueEngineDriftMs: meta.cueDriftMs, replayCueErrMs: summary,
      contentMinusNativeMs: anchorDelta, timelineRows: meta.timeline,
    },
    perCue: rows, checks, show: meta,
  };
  fs.writeFileSync(`${ART}/verify-report.json`, JSON.stringify(report, null, 2));
  fs.appendFileSync(`${ROOT}/results/studio-verify.jsonl`,
    JSON.stringify({ t: Date.now(), kind: "studio-v0-dod", ...report.headline,
                     checksPass: checks.filter((c) => c.ok).length, checksTotal: checks.length }) + "\n");
  say(`report → ${ART}/verify-report.json  ·  ${checks.filter((c) => c.ok).length}/${checks.length} checks pass`);
  bye();
  process.exit(checks.every((c) => c.ok) ? 0 : 2);
};

run().catch(async (e) => { console.error(ts(), "VERIFY FATAL:", e.message || e); bye(); process.exit(1); });
