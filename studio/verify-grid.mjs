#!/usr/bin/env node
// ===========================================================================
// STUDIO — GRID-ARCHIVE CHECK (plan-studio §5's "FIRST v1 feature").
//
// The A/B is closed and is NOT re-run here: per-participant self-recording beat
// central recording decisively (central = 8.1–8.6× the grid's live budget at
// N=54; every join/leave cuts a 130–172 ms frame gap into every OTHER
// participant's file). This checks that the WINNER is wired end to end:
//
//   engine go-live → participant link → the participant browser records ITSELF
//   → chunks land in R2 → the engine's stop runs proto/selfrec/postshow.mjs
//   verbatim → show.json → replay-grid.html composes the tiles against the
//   room's own cue/roster log.
//
// It drives the same surface an operator would: the engine's autopilot with
// --participants=N, then the real replay-grid page at the URL the engine put
// in show.json. Nothing here reaches inside the grid page's implementation
// except its documented test hooks (window.__grid / __deck / __deckStats).
//
//   node studio/verify-grid.mjs [--duration=50] [--participants=1]
// ===========================================================================
import { createRequire } from "node:module";
const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
const { chromium } = require("playwright");
import fs from "node:fs";
import { spawn } from "node:child_process";

const ROOT = "/Users/s32863/personal/positron";
const HERE = `${ROOT}/studio`;
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=")[1] : d; };
const DURATION = parseInt(arg("duration", "50"), 10);
const NPART = parseInt(arg("participants", "1"), 10);
const ts = () => new Date().toISOString().slice(11, 23);
const say = (...a) => console.log(ts(), "grid|", ...a);
const checks = [];
const check = (n, ok, d) => { checks.push({ name: n, ok: !!ok, detail: d });
  say(`${ok ? "PASS" : "FAIL"}  ${n}  ${d || ""}`); return ok; };

const REUSE = arg("reuse", "");            // re-check the replay leg of a past run
const run = async () => {
  const log = fs.createWriteStream(`${HERE}/logs/verify-grid.log`, { flags: "a" });
  let show;
  if (REUSE) {
    show = JSON.parse(fs.readFileSync(`${HERE}/runs/${REUSE}/show.json`, "utf8"));
    check("show-completed", true, `reusing ${REUSE} (replay leg only)`);
  } else {
    // ---- the show, driven by the engine's own autopilot -------------------
    say(`autopilot ${DURATION}s with ${NPART} self-recording participant(s)`);
    const eng = spawn("node", [`${HERE}/engine.mjs`, "--autopilot", `--duration=${DURATION}`,
      "--offsets=8.3,20.7,33.1", `--participants=${NPART}`], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    eng.stdout.on("data", (d) => { log.write(d); process.stdout.write("  " + d.toString()); });
    eng.stderr.on("data", (d) => log.write(d));
    const code = await new Promise((r) => eng.on("exit", r));
    check("show-completed", code === 0, `engine exit ${code}`);
    show = JSON.parse(fs.readFileSync(`${HERE}/last-show.json`, "utf8"));
  }
  check("grid-detected-from-cuelog", !!show.grid && show.grid.participants.length === NPART,
        show.grid ? `${show.grid.participants.length} participant(s): ` +
          show.grid.participants.map((p) => `${p.pid} phases=${p.phases.join("/")}`).join(" ") : "no grid in show.json");
  if (!show.grid) throw new Error("no participant self-recorded — nothing to compose");
  check("postshow-ran", show.grid.postshow && show.grid.postshow.exit === 0,
        `exit ${show.grid.postshow && show.grid.postshow.exit}`);
  check("grid-replay-url", !!show.grid.replayUrl, show.grid.replayUrl || "none");

  // ---- open the REAL grid replay page at the engine's own URL -------------
  // The engine has exited, so serve the page from a fresh engine (the console
  // origin is also the static server — same URL, same origin, same imports).
  const eng2 = spawn("node", [`${HERE}/engine.mjs`], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  eng2.stdout.on("data", (d) => log.write(d));
  for (let i = 0; i < 40; i++) {
    const r = await fetch("http://127.0.0.1:8899/healthz").catch(() => null);
    if (r && r.ok) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  const b = await chromium.launch({ headless: true, channel: "chromium",
    args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p.on("pageerror", (e) => log.write(`${ts()} [grid pageerror] ${e.message}\n`));
  p.on("console", (m) => log.write(`${ts()} [grid ${m.type()}] ${m.text()}\n`));
  const tOpen = Date.now();
  await p.goto(show.grid.replayUrl + `&cb=${Date.now()}`, { waitUntil: "load" });
  let g = null;
  for (;;) {
    g = await p.evaluate(() => window.__grid && JSON.parse(JSON.stringify({
      phase: window.__grid.phase, error: window.__grid.error, mode: window.__grid.mode,
      cueLane: window.__grid.cueLane, rangeT: window.__grid.rangeT,
      tiles: Object.keys(window.__grid.tiles), cues: window.__grid.cues.length,
      masterPid: window.__grid.masterPid, hostName: window.__grid.hostName,
    }))).catch(() => null);
    if (g && (g.phase === "running" || g.phase === "failed")) break;
    if (Date.now() - tOpen > 90000) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  check("grid-replay-composes", g && g.phase === "running",
        g ? `phase=${g.phase} tiles=${(g.tiles || []).join(",")} cues=${g.cues} ` +
            `cueLane=${g.cueLane} master=${g.masterPid} error=${g.error || "-"}` : "no state");
  check("grid-tiles-match-participants", g && g.tiles && g.tiles.length === NPART,
        g && g.tiles ? `${g.tiles.length}/${NPART}` : "—");
  check("grid-range-covers-the-show", g && g.rangeT && g.rangeT[1] - g.rangeT[0] > DURATION * 500,
        g && g.rangeT ? `${Math.round((g.rangeT[1] - g.rangeT[0]) / 1000)} s window` : "—");

  // The grid page parks at the range start and waits — it does not autoplay
  // (a tile is `muted playsinline` for iOS, but the transport is still a user
  // action). Click its real play button, then confirm the clock master takes
  // over and the playhead actually advances.
  const t0Play = await p.evaluate(() => window.__grid.playheadT);
  await p.click("#playbtn");
  await new Promise((r) => setTimeout(r, 6000));
  const adv = await p.evaluate(() => ({
    playhead: window.__grid.playheadT, playing: window.__grid.playing,
    master: window.__masterInfo ? window.__masterInfo().pid : null,
    stats: window.__deckStats ? window.__deckStats().stats : null,
  })).catch(() => null);
  check("grid-playhead-advances-on-the-clock-master", adv && adv.playhead - t0Play > 3000,
        adv ? `+${Math.round((adv.playhead - t0Play) / 1000)} s in 6 s · master=${adv.master} ` +
              `playing=${adv.playing}` : "—");
  await p.screenshot({ path: `${HERE}/artifacts/grid-replay.png` });

  // the replay URL carries ROOM_TOKEN as a query param (localhost-only, same as
  // the archive rig) — redact it in anything written to disk
  const report = { t: Date.now(), runId: show.runId,
                   replayUrl: show.grid.replayUrl.replace(/token=[^&]*/, "token=REDACTED"),
                   participants: show.grid.participants, postshow: show.grid.postshow,
                   gridState: g, advance: adv, checks };
  fs.writeFileSync(`${HERE}/artifacts/verify-grid-report.json`, JSON.stringify(report, null, 2));
  fs.appendFileSync(`${ROOT}/results/studio-grid.jsonl`, JSON.stringify({
    kind: "studio-grid-verify", t: Date.now(), runId: show.runId,
    checksPass: checks.filter((c) => c.ok).length, checksTotal: checks.length }) + "\n");
  say(`${checks.filter((c) => c.ok).length}/${checks.length} checks pass → artifacts/verify-grid-report.json`);
  await b.close(); eng2.kill("SIGINT");
  process.exit(checks.every((c) => c.ok) ? 0 : 2);
};
run().catch((e) => { console.error(ts(), "GRID VERIFY FATAL:", e.message || e); process.exit(1); });
