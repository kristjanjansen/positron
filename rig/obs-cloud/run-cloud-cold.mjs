// Cloud cold-start → pixels, staged timestamps. Assumes the instance is DEAD
// (/kill'ed). Wakes it with /health, polls obs-websocket readiness through the
// Worker proxy, runs setup, starts a fresh-ns MoQ stream, then launches the
// deployed player in headless Chrome and reports time-to-first-decoded-frame.
//   node run-cloud-cold.mjs <workerBase> [playerSecs]
import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ObsClient } from "../obs-docker/control.mjs";

const BASE = process.argv[2] || "https://positron-obscloud.kristjan-jansen.workers.dev";
const SECS = Number(process.argv[3] || 60);
const WS = BASE.replace("https://", "wss://") + "/obsws";
const PLAYER = "https://moq.positron.studio/";
const scratch = "/private/tmp/claude-501/-Users-s32863-personal-positron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad/";
const resultsDir = fileURLToPath(new URL("../../results/", import.meta.url));
const now = () => performance.timeOrigin + performance.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = 1280, H = 720;

process.on("unhandledRejection", (e) => console.error("unhandled:", e?.message || e));

const t0 = now();
const stamp = (k, extra = {}) => { const o = { k, atMs: +(now() - t0).toFixed(0), ...extra }; console.log(JSON.stringify(o)); return o.atMs; };

// 1. wake with /health
let health = null;
for (;;) {
  try {
    const r = await fetch(BASE + "/health", { signal: AbortSignal.timeout(10000) });
    if (r.ok) { health = await r.json(); break; }
  } catch {}
  await sleep(1000);
  if (now() - t0 > 180000) throw new Error("container never healthy");
}
stamp("container-health-200", { uptimeMs: health.uptimeMs, loc: health.env?.LOC });

// 2. obs-websocket ready (through Worker; retry connect + 207 window)
let c = null;
for (;;) {
  try {
    c = new ObsClient({ url: WS });
    await c.connect({ timeoutMs: 5000 });
    break;
  } catch { c = null; await sleep(1000); if (now() - t0 > 180000) throw new Error("ws never up"); }
}
stamp("obsws-identified");
for (;;) {
  try { (await c.call("GetSceneList")).data; break; }
  catch {
    await sleep(500);
    if (c.closed) { // proxy dropped us (OBS mid-boot) — reconnect fresh
      try { c = new ObsClient({ url: WS }); await c.connect({ timeoutMs: 5000 }); } catch { c = { call: () => Promise.reject(new Error("dead")), closed: true, waitEvent: () => Promise.reject(new Error("dead")), close: () => {} }; }
    }
    if (now() - t0 > 180000) throw new Error("obs never ready");
  }
}
stamp("obs-ready");

// 3. setup from zero (fresh disk every boot — scenes never persist)
const tS = now();
await c.call("SetVideoSettings", { baseWidth: W, baseHeight: H, outputWidth: W, outputHeight: H, fpsNumerator: 30, fpsDenominator: 1 });
const scenes = (await c.call("GetSceneList")).data.scenes.map((s) => s.sceneName);
if (!scenes.includes("BROWSER")) {
  await c.call("CreateScene", { sceneName: "BROWSER" });
  await c.call("CreateInput", {
    sceneName: "BROWSER", inputName: "clockpage", inputKind: "browser_source",
    inputSettings: { url: "http://127.0.0.1:8890/clock.html", width: W, height: H, fps_custom: true, fps: 30, shutdown: false, restart_when_active: false },
  });
}
if (!scenes.includes("A")) { await c.call("CreateScene", { sceneName: "A" }); await c.call("CreateInput", { sceneName: "A", inputName: "colorA", inputKind: "color_source_v3", inputSettings: { color: 0xff0000ff, width: W, height: H } }); }
if (!scenes.includes("B")) { await c.call("CreateScene", { sceneName: "B" }); await c.call("CreateInput", { sceneName: "B", inputName: "colorB", inputKind: "color_source_v3", inputSettings: { color: 0xffff0000, width: W, height: H } }); }
await c.call("SetCurrentProgramScene", { sceneName: "BROWSER" });
stamp("setup-done", { setupMs: +(now() - tS).toFixed(0) });

// 4. fresh-ns MoQ start
const ns = "obscloud-" + Date.now();
await c.call("SetStreamServiceSettings", { streamServiceType: "moq_service",
  streamServiceSettings: { server: "https://draft-14.cloudflare.mediaoverquic.com", key: ns } });
const evP = c.waitEvent("StreamStateChanged", (d) => d.outputActive === true || d.outputState === "OBS_WEBSOCKET_OUTPUT_STOPPED", 30000).catch((e) => ({ err: e.message }));
const tStart = now();
await c.call("StartStream");
const ev = await evP;
stamp("stream-started", { ns, eventMs: ev.t ? +(ev.t - tStart).toFixed(0) : null, state: ev.data?.outputState ?? ev.err });

// 5. player: headless chrome on the deployed page, CDP-poll first decoded frame
const udd = scratch + "obscloud-cold-udd";
mkdirSync(udd, { recursive: true });
const url = PLAYER + "?namespace=" + encodeURIComponent(ns) + "&auto=1&log=" + encodeURIComponent("http://127.0.0.1:8890/collect");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const chrome = spawn(CHROME, ["--headless=new", "--user-data-dir=" + udd, "--no-first-run", "--mute-audio",
  "--remote-debugging-port=9224", "--autoplay-policy=no-user-gesture-required", url], { stdio: ["ignore", "ignore", "pipe"] });
let cdp = null, cdpId = 1;
const cdpPending = new Map();
for (let i = 0; i < 60 && !cdp; i++) {
  try {
    const list = await (await fetch("http://127.0.0.1:9224/json/list")).json();
    const page = list.find((t) => t.type === "page" && t.url.includes("namespace=" + ns));
    if (page) {
      cdp = await new Promise((resolve, reject) => {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        ws.addEventListener("open", () => resolve(ws));
        ws.addEventListener("error", reject);
        ws.addEventListener("message", (m) => {
          const msg = JSON.parse(m.data);
          if (msg.id && cdpPending.has(msg.id)) { cdpPending.get(msg.id)(msg.result); cdpPending.delete(msg.id); }
        });
      });
    }
  } catch {}
  if (!cdp) await sleep(300);
}
if (!cdp) throw new Error("CDP never connected");
const evalReport = () => new Promise((resolve) => {
  const id = cdpId++;
  cdpPending.set(id, (r) => { try { resolve(JSON.parse(r.result.value)); } catch { resolve(null); } });
  cdp.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression: "JSON.stringify(window.__report||{})", returnByValue: true } }));
  setTimeout(() => { if (cdpPending.delete(id)) resolve(null); }, 2000);
});
let firstFrameAt = null, last = null;
const tPlayer = now();
while (now() - tPlayer < SECS * 1000) {
  const r = await evalReport();
  if (r) {
    last = r;
    if (!firstFrameAt && r.decoded > 0) {
      firstFrameAt = now();
      stamp("first-decoded-frame", { playerWaitMs: +(firstFrameAt - tPlayer).toFixed(0) });
    }
  }
  await sleep(firstFrameAt ? 5000 : 250);
}
const summary = { kind: "cloud-cold", ns, base: BASE,
  totalColdToPixelsMs: firstFrameAt ? +(firstFrameAt - t0).toFixed(0) : null,
  final: last && { stage: last.stage, version: last.version, fps: last.fps, decoded: last.decoded, decodeErrors: last.decodeErrors, g2g_p50: last.g2g_p50, g2g_p95: last.g2g_p95, error: last.error } };
appendFileSync(resultsDir + "obs-cloud-run.jsonl", JSON.stringify({ t: Date.now(), ...summary }) + "\n");
console.log(JSON.stringify(summary));
chrome.kill();
c.close();
process.exit(0);
