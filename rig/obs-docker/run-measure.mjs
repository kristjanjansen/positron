// obsdock measurement orchestrator. Zero deps; local ffmpeg for frame grabs.
//
//   node run-measure.mjs setup            remote-configure OBS from zero (proof of full remote drive)
//   node run-measure.mjs screenshot <src> GetSourceScreenshot -> decode burned row (no VNC needed)
//   node run-measure.mjs pipeline [nFrames]   browser-source end-to-end latency (burned row vs wall)
//   node run-measure.mjs scenes [n]       SetCurrentProgramScene -> first new-scene frame, n switches
//   node run-measure.mjs resil-sink       kill+restart mediamtx mid-stream; OBS auto-reconnect?
//   node run-measure.mjs resil-cycle      StopStream/StartStream cycle timing
//   node run-measure.mjs resil-restart    docker restart -> time back to pixels at the sink
import { spawn, execFile } from "node:child_process";
import { appendFileSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { ObsClient, pct } from "./control.mjs";

const execP = promisify(execFile);
const now = () => performance.timeOrigin + performance.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const resultsDir = fileURLToPath(new URL("../../results/", import.meta.url));
const scratch = "/private/tmp/claude-501/-Users-s32863-personal-elektron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad/";
const RTMP_READ = "rtmp://127.0.0.1:1935/obsdock";
const W = 1280, H = 720, FRAME = W * H * 3;
const NBLOCKS = 56, BLOCK_W = 20, ROW_X = 40, ROW_Y = 100, ROW_H = 80;

const jl = (file, obj) => appendFileSync(resultsDir + file, JSON.stringify(obj) + "\n");

// ---- burned-row decode + scene classification ------------------------------
function decodeRow(buf, w = W) {
  const y = ROW_Y + ROW_H / 2;
  const levels = [];
  for (let i = 0; i < NBLOCKS; i++) {
    const x = ROW_X + i * BLOCK_W + BLOCK_W / 2;
    const idx = (y * w + x) * 3;
    levels.push((buf[idx] + buf[idx + 1] + buf[idx + 2]) / 3);
  }
  const min = Math.min(...levels), max = Math.max(...levels);
  if (max - min < 60) return null; // no row present
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

function classify(buf, w = W) {
  // sample top-right patch (clear of row, text, motion square)
  const x = 1216, y = 48;
  const idx = (y * w + x) * 3;
  const r = buf[idx], g = buf[idx + 1], b = buf[idx + 2];
  if (r > 160 && g < 90 && b < 90) return "A";       // red
  if (b > 160 && r < 90 && g < 90) return "B";       // blue
  if (Math.abs(r - 64) < 40 && Math.abs(g - 64) < 40 && Math.abs(b - 64) < 40) return "BROWSER"; // #404040 bg
  return `?(${r},${g},${b})`;
}

// ---- rawvideo grabber ------------------------------------------------------
function spawnGrabber(onFrame, url = RTMP_READ) {
  const args = ["-hide_banner", "-loglevel", "warning",
    "-fflags", "nobuffer", "-flags", "low_delay", "-probesize", "32", "-analyzeduration", "0",
    "-i", url, "-map", "0:v:0", "-fps_mode", "passthrough", "-pix_fmt", "rgb24", "-f", "rawvideo", "pipe:1"];
  const p = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  p.stderr.on("data", (d) => (stderr += d));
  const chunks = [];
  let have = 0, nFrames = 0;
  p.stdout.on("data", (d) => {
    chunks.push(d); have += d.length;
    while (have >= FRAME) {
      const buf = Buffer.concat(chunks);
      const frame = buf.subarray(0, FRAME);
      const rest = buf.subarray(FRAME);
      chunks.length = 0;
      if (rest.length) chunks.push(rest);
      have = rest.length;
      onFrame(frame, now(), nFrames++);
    }
  });
  p.on("exit", (c) => { if (c && c !== 255) console.error("grabber exit", c, stderr.slice(-400)); });
  return p;
}

async function waitFirstFrame(url = RTMP_READ, timeoutMs = 30000) {
  // The stream may not exist yet (sink restarting, OBS reconnecting): ffmpeg
  // then exits with "Input/output error" — respawn until a frame or deadline.
  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    const t = await new Promise((resolve) => {
      const p = spawnGrabber((f, tf, n) => { if (n === 0) { p.kill(); resolve(tf); } }, url);
      const guard = setTimeout(() => { p.kill(); resolve(null); }, Math.max(500, deadline - now()));
      p.on("exit", () => { clearTimeout(guard); setTimeout(() => resolve(null), 250); });
    });
    if (t) return t;
  }
  throw new Error("no frame in " + timeoutMs);
}

// ---- docker stats sampler --------------------------------------------------
async function dockerStats(name = "obsdock-obs") {
  const { stdout } = await execP("docker", ["stats", "--no-stream", "--format", "{{json .}}", name]);
  const j = JSON.parse(stdout);
  return { cpu: parseFloat(j.CPUPerc), mem: j.MemUsage.split("/")[0].trim(), memPct: parseFloat(j.MemPerc) };
}

// ---- setup: full remote configuration from zero ----------------------------
async function setup(c) {
  const t0 = now();
  const ver = (await c.call("GetVersion")).data;
  console.log("OBS", ver.obsVersion, "ws", ver.obsWebSocketVersion, "platform", ver.platformDescription);
  const kinds = (await c.call("GetInputKindList")).data.inputKinds;
  console.log("input kinds:", kinds.join(","));
  if (!kinds.includes("browser_source")) console.error("!! browser_source MISSING");

  await c.call("SetVideoSettings", { baseWidth: W, baseHeight: H, outputWidth: W, outputHeight: H, fpsNumerator: 30, fpsDenominator: 1 });
  await c.call("SetStreamServiceSettings", {
    streamServiceType: "rtmp_custom",
    streamServiceSettings: { server: "rtmp://host.docker.internal:1935", key: "obsdock", use_auth: false, bwtest: false },
  });
  for (const [pn, pv] of [["Mode", "Simple"], ["Reconnect", "true"], ["RetryDelay", "2"], ["MaxRetries", "25"]])
    await c.call("SetProfileParameter", { parameterCategory: "Output", parameterName: pn, parameterValue: pv });
  for (const [pn, pv] of [["VBitrate", "2500"], ["StreamEncoder", "x264"], ["Preset", "veryfast"], ["x264Settings", "tune=zerolatency"], ["ABitrate", "64"]])
    await c.call("SetProfileParameter", { parameterCategory: "SimpleOutput", parameterName: pn, parameterValue: pv });

  const scenes = (await c.call("GetSceneList")).data.scenes.map((s) => s.sceneName);
  const mk = async (name, fn) => { if (!scenes.includes(name)) { await c.call("CreateScene", { sceneName: name }); await fn(); } };
  // OBS color ints are ABGR: red=0xff0000ff, blue=0xffff0000
  await mk("A", () => c.call("CreateInput", { sceneName: "A", inputName: "colorA", inputKind: "color_source_v3", inputSettings: { color: 0xff0000ff, width: W, height: H } }));
  await mk("B", () => c.call("CreateInput", { sceneName: "B", inputName: "colorB", inputKind: "color_source_v3", inputSettings: { color: 0xffff0000, width: W, height: H } }));
  await mk("BROWSER", () => c.call("CreateInput", {
    sceneName: "BROWSER", inputName: "clockpage", inputKind: "browser_source",
    inputSettings: { url: "http://host.docker.internal:8890/clock.html", width: W, height: H, fps_custom: true, fps: 30, shutdown: false, restart_when_active: false },
  }));
  await mk("FEED", () => c.call("CreateInput", {
    sceneName: "FEED", inputName: "netfeed", inputKind: "ffmpeg_source",
    inputSettings: { input: "rtsp://host.docker.internal:8554/feed", is_local_file: false, buffering_mb: 1, reconnect_delay_sec: 2, hw_decode: false, clear_on_media_end: false },
  }));
  await c.call("SetCurrentProgramScene", { sceneName: "BROWSER" });
  console.log(`setup complete in ${(now() - t0).toFixed(0)} ms`);
}

// ---- screenshot verify (works without streaming/VNC) -----------------------
async function screenshot(c, source = "clockpage") {
  const r = await c.call("GetSourceScreenshot", { sourceName: source, imageFormat: "png", imageWidth: W, imageHeight: H });
  const b64 = r.data.imageData.split(",")[1];
  const png = scratch + "shot.png";
  writeFileSync(png, Buffer.from(b64, "base64"));
  await execP("ffmpeg", ["-y", "-i", png, "-pix_fmt", "rgb24", "-f", "rawvideo", scratch + "shot.raw"]);
  const buf = readFileSync(scratch + "shot.raw");
  const t = now();
  const row = decodeRow(buf);
  console.log(JSON.stringify({ source, cls: classify(buf), row, lagVsNow: row ? +(t - row).toFixed(1) : null, png }));
}

// ---- pipeline latency ------------------------------------------------------
async function pipeline(c, nWant = 300) {
  await c.call("SetCurrentProgramScene", { sceneName: "BROWSER" });
  const st = (await c.call("GetStreamStatus")).data;
  if (!st.outputActive) { await c.call("StartStream"); await c.waitEvent("StreamStateChanged", (d) => d.outputActive === true); }
  const before = (await c.call("GetStreamStatus")).data;
  const lat = [];
  let bad = 0;
  const statsSamples = [];
  const statsLoop = (async () => { for (let i = 0; i < 6; i++) { try { statsSamples.push(await dockerStats()); } catch {} } })();
  await new Promise((resolve) => {
    const p = spawnGrabber((f, t) => {
      const ms = decodeRow(f);
      if (ms === null) { bad++; return; }
      lat.push(t - ms);
      jl("obs-docker-pipeline.jsonl", { kind: "frame", t, burned: ms, latMs: +(t - ms).toFixed(1) });
      if (lat.length >= nWant) { p.kill(); resolve(); }
    });
    setTimeout(() => { p.kill(); resolve(); }, 60000);
  });
  await statsLoop;
  const after = (await c.call("GetStreamStatus")).data;
  const obsStats = (await c.call("GetStats")).data;
  const cpu = statsSamples.map((s) => s.cpu);
  const summary = {
    kind: "pipeline-summary", n: lat.length, undecodable: bad,
    p50: +pct(lat, 50).toFixed(1), p95: +pct(lat, 95).toFixed(1), p99: +pct(lat, 99).toFixed(1),
    min: +Math.min(...lat).toFixed(1), max: +Math.max(...lat).toFixed(1),
    skippedDelta: after.outputSkippedFrames - before.outputSkippedFrames,
    totalDelta: after.outputTotalFrames - before.outputTotalFrames,
    obs: { activeFps: +obsStats.activeFps.toFixed(2), avgFrameRenderTime: +obsStats.averageFrameRenderTime.toFixed(2), renderSkipped: obsStats.renderSkippedFrames, outputSkipped: obsStats.outputSkippedFrames, cpuUsage: +obsStats.cpuUsage.toFixed(1), memoryUsage: +obsStats.memoryUsage.toFixed(0) },
    dockerCpuPct: { p50: pct(cpu, 50), max: Math.max(...cpu) }, dockerMem: statsSamples.at(-1)?.mem,
  };
  jl("obs-docker-pipeline.jsonl", summary);
  console.log(JSON.stringify(summary, null, 1));
}

// ---- scene-switch latency --------------------------------------------------
async function scenes(c, nSwitch = 10) {
  const st = (await c.call("GetStreamStatus")).data;
  if (!st.outputActive) { await c.call("StartStream"); await c.waitEvent("StreamStateChanged", (d) => d.outputActive === true); }
  await c.call("SetCurrentProgramScene", { sceneName: "A" });
  await sleep(1500);
  let lastCls = null, pending = null;
  const results = [];
  const p = spawnGrabber((f, t) => {
    const cls = classify(f);
    if (pending && cls === pending.target) {
      const d = { kind: "switch", target: pending.target, cmdToGlassMs: +(t - pending.tSend).toFixed(1), rttMs: +pending.rtt.toFixed(1) };
      results.push(d);
      jl("obs-docker-scenes.jsonl", { t, ...d });
      console.log(JSON.stringify(d));
      pending = null;
    }
    lastCls = cls;
  });
  await sleep(1500);
  for (let i = 0; i < nSwitch; i++) {
    const target = i % 2 ? "A" : "B";
    const tSend = now();
    const r = await c.call("SetCurrentProgramScene", { sceneName: target });
    pending = { target, tSend, rtt: r.rttMs };
    const t0 = now();
    while (pending && now() - t0 < 5000) await sleep(20);
    await sleep(700);
  }
  p.kill();
  const l = results.map((r) => r.cmdToGlassMs);
  const summary = { kind: "switch-summary", n: l.length, p50: +pct(l, 50).toFixed(1), p95: +pct(l, 95).toFixed(1), min: Math.min(...l), max: Math.max(...l) };
  jl("obs-docker-scenes.jsonl", summary);
  console.log(JSON.stringify(summary));
}

// ---- resilience ------------------------------------------------------------
async function resilSink(c) {
  await c.call("SetCurrentProgramScene", { sceneName: "BROWSER" });
  const st = (await c.call("GetStreamStatus")).data;
  if (!st.outputActive) { await c.call("StartStream"); await c.waitEvent("StreamStateChanged", (d) => d.outputActive === true); }
  await sleep(2000);
  const events = [];
  c.onEvent((et, ed, t) => { if (et === "StreamStateChanged") { events.push({ t, state: ed.outputState, active: ed.outputActive, reconnecting: ed.outputReconnecting }); console.log("event", ed.outputState, ((t - tKill) / 1000).toFixed(1) + "s"); } });
  console.log("killing mediamtx (sink) mid-stream...");
  const tKill = now();
  await execP("pkill", ["-f", "mtx-obsdock"]).catch(() => {});
  await sleep(6000);
  console.log("restarting mediamtx...");
  const tRestart = now();
  spawn("/opt/homebrew/bin/mediamtx", [fileURLToPath(new URL("./mtx-obsdock.yml", import.meta.url))], { detached: true, stdio: ["ignore", "ignore", "ignore"] }).unref();
  let tBack = null;
  try { tBack = await waitFirstFrame(RTMP_READ, 90000); } catch (e) { console.error(e.message); }
  const status = (await c.call("GetStreamStatus")).data;
  const summary = {
    kind: "resil-sink", killToRestartMs: +(tRestart - tKill).toFixed(0),
    restartToPixelsMs: tBack ? +(tBack - tRestart).toFixed(0) : null,
    totalOutageMs: tBack ? +(tBack - tKill).toFixed(0) : null,
    events: events.map((e) => ({ state: e.state, atMs: +(e.t - tKill).toFixed(0) })),
    finalActive: status.outputActive, finalReconnecting: status.outputReconnecting,
  };
  jl("obs-docker-resilience.jsonl", { t: Date.now(), ...summary });
  console.log(JSON.stringify(summary, null, 1));
}

async function resilCycle(c) {
  const st = (await c.call("GetStreamStatus")).data;
  if (!st.outputActive) { await c.call("StartStream"); await c.waitEvent("StreamStateChanged", (d) => d.outputActive === true); await sleep(1500); }
  const t0 = now();
  await c.call("StopStream");
  const stopped = await c.waitEvent("StreamStateChanged", (d) => d.outputState === "OBS_WEBSOCKET_OUTPUT_STOPPED");
  const tStopped = stopped.t;
  await sleep(500);
  const t1 = now();
  await c.call("StartStream");
  const started = await c.waitEvent("StreamStateChanged", (d) => d.outputState === "OBS_WEBSOCKET_OUTPUT_STARTED");
  const tPixels = await waitFirstFrame();
  const summary = {
    kind: "resil-cycle", stopMs: +(tStopped - t0).toFixed(0),
    startEventMs: +(started.t - t1).toFixed(0), startToPixelsMs: +(tPixels - t1).toFixed(0),
  };
  jl("obs-docker-resilience.jsonl", { t: Date.now(), ...summary });
  console.log(JSON.stringify(summary));
}

async function resilRestart() {
  const t0 = now();
  await execP("docker", ["restart", "obsdock-obs"]);
  const tRestarted = now();
  let c2 = null, tWs = null;
  for (;;) {
    try { c2 = new ObsClient(); await c2.connect({ timeoutMs: 2000 }); tWs = now(); break; }
    catch { await sleep(500); if (now() - t0 > 120000) throw new Error("ws never came back"); }
  }
  // ws answers before OBS is fully loaded: requests return code 207 (NotReady)
  // for a beat — poll until real answers come back.
  let scenesList = null, tReady = null;
  for (;;) {
    try { scenesList = (await c2.call("GetSceneList")).data.scenes.map((s) => s.sceneName); tReady = now(); break; }
    catch (e) { if (now() - t0 > 120000) throw e; await sleep(300); }
  }
  await c2.call("SetCurrentProgramScene", { sceneName: "BROWSER" });
  const t1 = now();
  await c2.call("StartStream");
  const tPixels = await waitFirstFrame(RTMP_READ, 60000);
  const summary = {
    kind: "resil-restart", dockerRestartMs: +(tRestarted - t0).toFixed(0),
    wsUpMs: +(tWs - t0).toFixed(0), obsReadyMs: +(tReady - t0).toFixed(0), scenesPersisted: scenesList,
    startStreamAtMs: +(t1 - t0).toFixed(0), coldToPixelsMs: +(tPixels - t0).toFixed(0),
  };
  jl("obs-docker-resilience.jsonl", { t: Date.now(), ...summary });
  console.log(JSON.stringify(summary, null, 1));
  c2.close();
}

// ---- main ------------------------------------------------------------------
const [cmd, arg] = process.argv.slice(2);
if (cmd === "resil-restart") { await resilRestart(); process.exit(0); }
const c = new ObsClient();
await c.connect();
if (cmd === "setup") await setup(c);
else if (cmd === "screenshot") await screenshot(c, arg || "clockpage");
else if (cmd === "pipeline") await pipeline(c, Number(arg || 300));
else if (cmd === "scenes") await scenes(c, Number(arg || 10));
else if (cmd === "resil-sink") await resilSink(c);
else if (cmd === "resil-cycle") await resilCycle(c);
else { console.error("unknown cmd"); process.exitCode = 2; }
c.close();
process.exit(process.exitCode || 0);
