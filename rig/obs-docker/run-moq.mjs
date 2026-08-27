// obs-moq plugin drive: switch the OBS stream service between rtmp_custom and
// moq_service, and verify playback via the deployed self-reporting player
// (elektron-moq-safari) in headless Chrome, whose ?log= hook posts into our
// :8890 collector. Namespace discipline: fresh obsdock-<ts> every start
// (draft-14 same-name rejoin pre-GC bricks the namespace — RUNBOOK §13.4).
//
//   node run-moq.mjs moq <relayUrlOrEnvRef> [versionPin]   switch service to MoQ + StartStream
//   node run-moq.mjs rtmp                                  restore RTMP service + StartStream
//   node run-moq.mjs player <ns> [relay] [secs]            headless-chrome player, report g2g
//   node run-moq.mjs outputs                               GetOutputList (dual-output question)
import { spawn, execFile } from "node:child_process";
import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { ObsClient } from "./control.mjs";

const execP = promisify(execFile);
const now = () => performance.timeOrigin + performance.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const resultsDir = fileURLToPath(new URL("../../results/", import.meta.url));
const scratch = "/private/tmp/claude-501/-Users-s32863-personal-elektron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad/";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PLAYER = "https://elektron-moq-safari.kristjan-jansen.workers.dev/";

// tokens live in .env (chmod 600, gitignored) — read, never print
function envToken(name) {
  const env = readFileSync(fileURLToPath(new URL("../../.env", import.meta.url)), "utf8");
  const m = env.match(new RegExp(`^${name}=(.+)$`, "m"));
  if (!m) throw new Error(name + " not in .env");
  return m[1].trim();
}

const [cmd, a1, a2, a3] = process.argv.slice(2);

if (cmd === "moq" || cmd === "rtmp") {
  const c = new ObsClient();
  await c.connect();
  try { await c.call("StopStream"); await c.waitEvent("StreamStateChanged", (d) => d.outputState === "OBS_WEBSOCKET_OUTPUT_STOPPED", 8000); } catch {}
  if (cmd === "moq") {
    const ns = "obsdock-" + Date.now();
    let server = a1 || "https://draft-14.cloudflare.mediaoverquic.com";
    if (server === "d16") server = "https://draft-16.cloudflare.mediaoverquic.com/" + envToken("MOQ_TOKEN_PUBSUB");
    const settings = { server, key: ns };
    if (a2) settings.version = a2; // e.g. moq-transport-14 / moq-transport-16
    await c.call("SetStreamServiceSettings", { streamServiceType: "moq_service", streamServiceSettings: settings });
    const t0 = now();
    await c.call("StartStream");
    const ev = await c.waitEvent("StreamStateChanged", (d) => d.outputActive === true || d.outputState === "OBS_WEBSOCKET_OUTPUT_STOPPED", 20000).catch((e) => ({ err: e.message }));
    console.log(JSON.stringify({ ns, startMs: ev.t ? +(ev.t - t0).toFixed(0) : null, state: ev.data?.outputState ?? ev.err }));
  } else {
    await c.call("SetStreamServiceSettings", {
      streamServiceType: "rtmp_custom",
      streamServiceSettings: { server: "rtmp://host.docker.internal:1935", key: "obsdock", use_auth: false, bwtest: false },
    });
    await c.call("StartStream");
    const ev = await c.waitEvent("StreamStateChanged", (d) => d.outputActive === true, 20000);
    console.log("rtmp restored, streaming");
  }
  c.close(); process.exit(0);
}

if (cmd === "outputs") {
  const c = new ObsClient();
  await c.connect();
  const r = await c.call("GetOutputList");
  console.log(JSON.stringify(r.data, null, 1));
  c.close(); process.exit(0);
}

if (cmd === "player") {
  const ns = a1;
  const relay = a2 && a2 !== "-" ? (a2 === "d16sub" ? "https://draft-16.cloudflare.mediaoverquic.com/" + envToken("MOQ_TOKEN_SUB") : a2) : null;
  const secs = Number(a3 || 75);
  const udd = scratch + "obsdock-play-udd";
  mkdirSync(udd, { recursive: true });
  let url = PLAYER + "?namespace=" + encodeURIComponent(ns) + "&auto=1&log=" + encodeURIComponent("http://127.0.0.1:8890/collect");
  if (relay) url += "&relay=" + encodeURIComponent(relay);
  const chrome = spawn(CHROME, ["--headless=new", "--user-data-dir=" + udd, "--no-first-run", "--mute-audio",
    "--remote-debugging-port=9223", "--autoplay-policy=no-user-gesture-required", url], { stdio: ["ignore", "ignore", "pipe"] });
  let cerr = "";
  chrome.stderr.on("data", (d) => (cerr += d));
  // CDP: poll window.__report (g2g stats live there; ?log= only carries log lines)
  let cdp = null, cdpId = 1;
  const cdpPending = new Map();
  async function cdpConnect() {
    for (let i = 0; i < 40 && !cdp; i++) {
      try {
        const list = await (await fetch("http://127.0.0.1:9223/json/list")).json();
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
          break;
        }
      } catch {}
      await sleep(500);
    }
    if (!cdp) throw new Error("CDP never connected");
  }
  const evalReport = () => new Promise((resolve) => {
    const id = cdpId++;
    cdpPending.set(id, (r) => { try { resolve(JSON.parse(r.result.value)); } catch { resolve(null); } });
    cdp.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression: "JSON.stringify(window.__report||{})", returnByValue: true } }));
    setTimeout(() => { if (cdpPending.delete(id)) resolve(null); }, 3000);
  });
  await cdpConnect();
  const tEnd = Date.now() + secs * 1000;
  let last = null;
  while (Date.now() < tEnd) {
    await sleep(5000);
    const r = await evalReport();
    if (r) {
      last = r;
      const line = { poll: new Date().toISOString().slice(11, 19), stage: r.stage, version: r.version, fps: r.fps, decoded: r.decoded, errors: r.decodeErrors, g2g_p50: r.g2g_p50, g2g_p95: r.g2g_p95, error: r.error };
      console.log(JSON.stringify(line));
      appendFileSync(resultsDir + "obs-docker-moq.jsonl", JSON.stringify({ t: Date.now(), kind: "moq-player-poll", ns, ...line }) + "\n");
    }
  }
  chrome.kill();
  const summary = { kind: "moq-player-summary", ns, relay: relay ? relay.split("/").slice(0, 3).join("/") : "d14-default", secs,
    final: last && { stage: last.stage, version: last.version, fps: last.fps, decoded: last.decoded, decodeErrors: last.decodeErrors, g2g_p50: last.g2g_p50, g2g_p95: last.g2g_p95, error: last.error } };
  appendFileSync(resultsDir + "obs-docker-moq.jsonl", JSON.stringify({ t: Date.now(), ...summary }) + "\n");
  console.log(JSON.stringify(summary));
  if (!last) console.error("no report; chrome stderr tail:", cerr.slice(-300));
  process.exit(0);
}

console.error("usage: run-moq.mjs moq [server|d16] [versionPin] | rtmp | player <ns> [relay|-|d16sub] [secs] | outputs");
process.exit(2);
