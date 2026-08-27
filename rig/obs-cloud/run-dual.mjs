// Dual-output driver: one OBS instance, MoQ (stream slot, obs-moq -> d14 relay)
// + RTMP (recording slot pre-baked as Custom Output (FFmpeg) -> local mediamtx)
// simultaneously. Works against the obscloud image locally (ws://127.0.0.1:4455)
// or through the CF Worker proxy (OBS_WS_URL=wss://.../obsws).
//
//   node run-dual.mjs verify              profile/plugin sanity (Advanced? RecType? moq_service?)
//   node run-dual.mjs setup [pageUrl]     scenes+video from zero (default page http://127.0.0.1:8890/clock.html)
//   node run-dual.mjs start [relay]       fresh-ns MoQ StartStream + StartRecord; prints ns
//   node run-dual.mjs startrec            StartRecord only
//   node run-dual.mjs measure [n] [nowUrl] grabber on rtmp obsdockrec: burned-row lat n frames
//                                          + docker stats + clock-offset probe via nowUrl
//   node run-dual.mjs stop                StopRecord + StopStream
import { spawn, execFile } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { ObsClient, pct } from "../obs-docker/control.mjs";

const execP = promisify(execFile);
const now = () => performance.timeOrigin + performance.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const resultsDir = fileURLToPath(new URL("../../results/", import.meta.url));
const jl = (f, o) => appendFileSync(resultsDir + f, JSON.stringify(o) + "\n");
const W = 1280, H = 720, FRAME = W * H * 3;
const NBLOCKS = 56, BLOCK_W = 20, ROW_X = 40, ROW_Y = 100, ROW_H = 80;
const RTMP_REC = "rtmp://127.0.0.1:1935/obsdockrec";

function decodeRow(buf, w = W) {
  const y = ROW_Y + ROW_H / 2;
  const levels = [];
  for (let i = 0; i < NBLOCKS; i++) {
    const x = ROW_X + i * BLOCK_W + BLOCK_W / 2;
    const idx = (y * w + x) * 3;
    levels.push((buf[idx] + buf[idx + 1] + buf[idx + 2]) / 3);
  }
  const min = Math.min(...levels), max = Math.max(...levels);
  if (max - min < 60) return null;
  const thr = (min + max) / 2;
  const bits = levels.map((l) => (l > thr ? 1 : 0));
  let ms = 0;
  for (let i = 0; i < 48; i++) ms = ms * 2 + bits[i];
  let ck = 0;
  for (let i = 48; i < 56; i++) ck = ck * 2 + bits[i];
  const bytes = [];
  let v = ms;
  for (let i = 5; i >= 0; i--) { bytes[i] = v % 256; v = Math.floor(v / 256); }
  let expect = 0;
  for (const b of bytes) expect ^= b;
  return expect === ck ? ms : null;
}

function spawnGrabber(onFrame, url) {
  const p = spawn("ffmpeg", ["-hide_banner", "-loglevel", "warning",
    "-fflags", "nobuffer", "-flags", "low_delay", "-probesize", "32", "-analyzeduration", "0",
    "-i", url, "-map", "0:v:0", "-fps_mode", "passthrough", "-pix_fmt", "rgb24", "-f", "rawvideo", "pipe:1"],
    { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  p.stderr.on("data", (d) => (stderr += d));
  const chunks = [];
  let have = 0, n = 0;
  p.stdout.on("data", (d) => {
    chunks.push(d); have += d.length;
    while (have >= FRAME) {
      const buf = Buffer.concat(chunks);
      const frame = buf.subarray(0, FRAME);
      const rest = buf.subarray(FRAME);
      chunks.length = 0;
      if (rest.length) chunks.push(rest);
      have = rest.length;
      onFrame(frame, now(), n++);
    }
  });
  p.on("exit", (c) => { if (c && c !== 255) console.error("grabber exit", c, stderr.slice(-300)); });
  return p;
}

async function clockOffset(nowUrl, n = 10) {
  // δ = containerClock − macClock, min-RTT estimator
  const s = [];
  for (let i = 0; i < n; i++) {
    try {
      const t0 = now();
      const srv = Number(await (await fetch(nowUrl, { cache: "no-store" })).text());
      const t1 = now();
      s.push({ off: srv - (t0 + t1) / 2, rtt: t1 - t0 });
    } catch {}
  }
  s.sort((a, b) => a.rtt - b.rtt);
  return s.length ? { offMs: +s[0].off.toFixed(1), rttMs: +s[0].rtt.toFixed(1), n: s.length } : null;
}

async function dockerStats(name = "obscloud-local") {
  try {
    const { stdout } = await execP("docker", ["stats", "--no-stream", "--format", "{{json .}}", name]);
    const j = JSON.parse(stdout);
    return { cpu: parseFloat(j.CPUPerc), mem: j.MemUsage.split("/")[0].trim() };
  } catch { return null; }
}

const [cmd, a1, a2] = process.argv.slice(2);
const c = new ObsClient();
await c.connect({ timeoutMs: 15000 });

if (cmd === "verify") {
  const ver = (await c.call("GetVersion")).data;
  const mode = (await c.call("GetProfileParameter", { parameterCategory: "Output", parameterName: "Mode" })).data;
  const rectype = (await c.call("GetProfileParameter", { parameterCategory: "AdvOut", parameterName: "RecType" })).data;
  const ffurl = (await c.call("GetProfileParameter", { parameterCategory: "AdvOut", parameterName: "FFURL" })).data;
  const fftofile = (await c.call("GetProfileParameter", { parameterCategory: "AdvOut", parameterName: "FFOutputToFile" })).data;
  const profiles = (await c.call("GetProfileList")).data;
  let moqSvc = "n/a";
  try { moqSvc = JSON.stringify((await c.call("GetStreamServiceSettings")).data.streamServiceType); } catch (e) { moqSvc = "err " + e.message; }
  console.log(JSON.stringify({ obs: ver.obsVersion, ws: ver.obsWebSocketVersion,
    profiles, outputMode: mode.parameterValue, recType: rectype.parameterValue,
    ffUrl: ffurl.parameterValue, ffToFile: fftofile.parameterValue, svc: moqSvc }, null, 1));
} else if (cmd === "setup") {
  const pageUrl = a1 || "http://127.0.0.1:8890/clock.html";
  const t0 = now();
  await c.call("SetVideoSettings", { baseWidth: W, baseHeight: H, outputWidth: W, outputHeight: H, fpsNumerator: 30, fpsDenominator: 1 });
  const scenes = (await c.call("GetSceneList")).data.scenes.map((s) => s.sceneName);
  const mk = async (name, fn) => { if (!scenes.includes(name)) { await c.call("CreateScene", { sceneName: name }); await fn(); } };
  await mk("A", () => c.call("CreateInput", { sceneName: "A", inputName: "colorA", inputKind: "color_source_v3", inputSettings: { color: 0xff0000ff, width: W, height: H } }));
  await mk("B", () => c.call("CreateInput", { sceneName: "B", inputName: "colorB", inputKind: "color_source_v3", inputSettings: { color: 0xffff0000, width: W, height: H } }));
  await mk("BROWSER", () => c.call("CreateInput", {
    sceneName: "BROWSER", inputName: "clockpage", inputKind: "browser_source",
    inputSettings: { url: pageUrl, width: W, height: H, fps_custom: true, fps: 30, shutdown: false, restart_when_active: false },
  }));
  await c.call("SetCurrentProgramScene", { sceneName: "BROWSER" });
  console.log(JSON.stringify({ setupMs: +(now() - t0).toFixed(0), pageUrl }));
} else if (cmd === "start" || cmd === "startrec") {
  if (cmd === "start") {
    try { await c.call("StopStream"); await c.waitEvent("StreamStateChanged", (d) => d.outputState === "OBS_WEBSOCKET_OUTPUT_STOPPED", 8000); } catch {}
    const ns = "obscloud-" + Date.now();
    await c.call("SetStreamServiceSettings", { streamServiceType: "moq_service",
      streamServiceSettings: { server: a1 || "https://draft-14.cloudflare.mediaoverquic.com", key: ns } });
    const evP = c.waitEvent("StreamStateChanged", (d) => d.outputActive === true || d.outputState === "OBS_WEBSOCKET_OUTPUT_STOPPED", 25000).catch((e) => ({ err: e.message }));
    const t0 = now();
    await c.call("StartStream");
    const ev = await evP;
    console.log(JSON.stringify({ ns, streamStartMs: ev.t ? +(ev.t - t0).toFixed(0) : null, state: ev.data?.outputState ?? ev.err }));
  }
  const evR = c.waitEvent("RecordStateChanged", (d) => d.outputActive === true || d.outputState === "OBS_WEBSOCKET_OUTPUT_STOPPED", 25000).catch((e) => ({ err: e.message }));
  const t1 = now();
  try {
    await c.call("StartRecord");
    const ev2 = await evR;
    console.log(JSON.stringify({ recordStartMs: ev2.t ? +(ev2.t - t1).toFixed(0) : null, recState: ev2.data?.outputState ?? ev2.err }));
  } catch (e) {
    console.log(JSON.stringify({ recordStartError: e.message, code: e.code }));
  }
} else if (cmd === "measure") {
  const nWant = Number(a1 || 300);
  const nowUrl = a2 || "http://127.0.0.1:8891/now";
  const off = await clockOffset(nowUrl);
  const lat = [];
  let bad = 0;
  const stats = [];
  const statsLoop = (async () => { for (let i = 0; i < 8; i++) { const s = await dockerStats(); if (s) stats.push(s); } })();
  await new Promise((resolve) => {
    const p = spawnGrabber((f, t) => {
      const ms = decodeRow(f);
      if (ms === null) { bad++; return; }
      lat.push(t - ms + (off ? off.offMs : 0));
      if (lat.length >= nWant) { p.kill(); resolve(); }
    }, RTMP_REC);
    setTimeout(() => { p.kill(); resolve(); }, 90000);
  });
  await statsLoop;
  const rec = (await c.call("GetRecordStatus")).data;
  const st = (await c.call("GetStreamStatus")).data;
  const cpu = stats.map((s) => s.cpu);
  const summary = { kind: "dual-rtmp-leg", n: lat.length, undecodable: bad,
    p50: +pct(lat, 50).toFixed(1), p95: +pct(lat, 95).toFixed(1), p99: +pct(lat, 99).toFixed(1),
    min: lat.length ? +Math.min(...lat).toFixed(1) : null, max: lat.length ? +Math.max(...lat).toFixed(1) : null,
    clockOffset: off, recActive: rec.outputActive, streamActive: st.outputActive,
    streamSkipped: st.outputSkippedFrames, streamTotal: st.outputTotalFrames,
    dockerCpuPct: cpu.length ? { p50: +pct(cpu, 50).toFixed(0), max: Math.max(...cpu) } : null,
    dockerMem: stats.at(-1)?.mem };
  jl("obs-cloud-dual.jsonl", { t: Date.now(), ...summary });
  console.log(JSON.stringify(summary, null, 1));
} else if (cmd === "stop") {
  try { await c.call("StopRecord"); } catch (e) { console.log("StopRecord:", e.message); }
  try { await c.call("StopStream"); } catch (e) { console.log("StopStream:", e.message); }
  console.log("stopped");
} else {
  console.error("usage: run-dual.mjs verify|setup [pageUrl]|start [relay]|startrec|measure [n] [nowUrl]|stop");
  process.exitCode = 2;
}
c.close();
process.exit(process.exitCode || 0);
