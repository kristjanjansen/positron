#!/usr/bin/env node
// ============================================================================
// CF Containers test workload — the repackage job (proto/selfrec/repackage.mjs)
// transplanted into a container, MINUS the upload leg (writes nothing back to
// R2 — keep the bucket clean). Endpoints:
//   GET /health  -> boot time, uptime, cpu/mem/ffmpeg info (cold-start probe)
//   GET /run     -> pulls the kept proof show's two participants from the R2
//                   public URL, concats each, runs copy-remux on p1 (h264) and
//                   transcode (-bf 0 law) on p2 (vp8), reports wall times.
//   GET /sysinfo -> /proc details (what silicon did we land on)
// Local parity: same ffmpeg args as repackage.mjs; sequential chunk download
// (same as engine) so downloadMs is comparable.
// ============================================================================
import http from "http";
import fs from "fs";
import os from "os";
import { spawnSync } from "child_process";

const PUB = "https://archive.positron.studio";
const SHOW = "sync-20260827T093613";
const BOOT = Date.now();
const PORT = process.env.PORT || 8080;

function ffmpegVersion() {
  const r = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  return (r.stdout || "").split("\n")[0] || "unknown";
}

async function download(pid, work) {
  const t0 = Date.now();
  const man = await (await fetch(`${PUB}/selfrec/${SHOW}/${pid}/manifest.json`)).json();
  const manifestMs = Date.now() - t0;
  const concat = `${work}/concat-${pid}.webm`;
  const out = fs.createWriteStream(concat);
  let inBytes = 0;
  const t1 = Date.now();
  for (const c of man.chunks) {
    const r = await fetch(`${PUB}/${c.key}`);
    if (!r.ok) throw new Error(`download ${c.key}: ${r.status}`);
    const b = Buffer.from(await r.arrayBuffer());
    out.write(b); inBytes += b.length;
  }
  await new Promise((r) => out.end(r));
  const downloadMs = Date.now() - t1;
  return { man, concat, inBytes, manifestMs, downloadMs,
    throughputMbps: +((inBytes * 8) / (downloadMs / 1000) / 1e6).toFixed(1) };
}

function ffmpeg(mode, concat, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const hlsArgs = ["-f", "hls", "-hls_time", "4", "-hls_playlist_type", "vod",
    "-hls_segment_type", "fmp4", "-hls_flags", "independent_segments",
    "-hls_fmp4_init_filename", "init.mp4",
    "-hls_segment_filename", `${outDir}/seg_%05d.m4s`, `${outDir}/index.m3u8`];
  const args = mode === "copy"
    ? ["-y", "-hide_banner", "-loglevel", "error", "-i", concat, "-c", "copy", ...hlsArgs]
    : ["-y", "-hide_banner", "-loglevel", "error", "-i", concat,
       "-fps_mode", "vfr", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-bf", "0",
       "-force_key_frames", "expr:gte(t,n_forced*4)", "-pix_fmt", "yuv420p", ...hlsArgs];
  const t0 = Date.now();
  const r = spawnSync("ffmpeg", args, { encoding: "utf8" });
  const ms = Date.now() - t0;
  if (r.status !== 0) throw new Error(`ffmpeg ${mode}: ${(r.stderr || "").slice(0, 400)}`);
  const files = fs.readdirSync(outDir);
  const outBytes = files.reduce((s, f) => s + fs.statSync(`${outDir}/${f}`).size, 0);
  return { ms, files: files.length, outBytes };
}

async function runJob() {
  const work = `/tmp/job-${Date.now()}`;
  fs.mkdirSync(work, { recursive: true });
  const tAll = Date.now();
  const report = { show: SHOW, cpus: os.cpus().length,
    cpuModel: (os.cpus()[0] || {}).model || "?",
    memTotalMB: Math.round(os.totalmem() / 1048576) };
  // p1 = h264-in-webm -> copy remux; p2 = vp8 -> transcode (the two local refs)
  const p1 = await download("p1", work);
  report.p1 = { mime: p1.man.mimeType, chunks: p1.man.chunkCount,
    durationMs: p1.man.durationMs, inBytes: p1.inBytes,
    manifestMs: p1.manifestMs, downloadMs: p1.downloadMs, throughputMbps: p1.throughputMbps };
  const c1 = ffmpeg("copy", p1.concat, `${work}/hls-p1`);
  report.p1.copy = { ffmpegMs: c1.ms, files: c1.files, outBytes: c1.outBytes,
    ratio: +(c1.ms / p1.man.durationMs).toFixed(4) };
  const p2 = await download("p2", work);
  report.p2 = { mime: p2.man.mimeType, chunks: p2.man.chunkCount,
    durationMs: p2.man.durationMs, inBytes: p2.inBytes,
    manifestMs: p2.manifestMs, downloadMs: p2.downloadMs, throughputMbps: p2.throughputMbps };
  const c2 = ffmpeg("transcode", p2.concat, `${work}/hls-p2`);
  report.p2.transcode = { ffmpegMs: c2.ms, files: c2.files, outBytes: c2.outBytes,
    ratio: +(c2.ms / p2.man.durationMs).toFixed(4) };
  report.totalMs = Date.now() - tAll;
  report.loadavg = os.loadavg();
  fs.rmSync(work, { recursive: true, force: true });
  return report;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const send = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj, null, 1)); };
  try {
    if (url.pathname === "/health") {
      send(200, { ok: true, bootAt: BOOT, uptimeMs: Date.now() - BOOT,
        cpus: os.cpus().length, cpuModel: (os.cpus()[0] || {}).model || "?",
        memTotalMB: Math.round(os.totalmem() / 1048576),
        ffmpeg: ffmpegVersion(), node: process.version,
        env: { CLOUDFLARE_LOCATION: process.env.CLOUDFLARE_LOCATION,
               CLOUDFLARE_REGION: process.env.CLOUDFLARE_REGION,
               CLOUDFLARE_DEPLOYMENT_ID: (process.env.CLOUDFLARE_DEPLOYMENT_ID || "").slice(0, 8) } });
    } else if (url.pathname === "/run") {
      console.log("run: starting repackage job");
      const report = await runJob();
      console.log(`run: done copy=${report.p1.copy.ffmpegMs}ms transcode=${report.p2.transcode.ffmpegMs}ms total=${report.totalMs}ms`);
      send(200, report);
    } else if (url.pathname === "/net") {
      // Outbound reality check: TCP on 443 (control), 8080+1935 (arbitrary ports),
      // UDP DNS to 1.1.1.1 and 8.8.8.8, UDP NTP to pool. portquiz.net answers on
      // every TCP port. 4 s timeout each => "timeout" = filtered.
      const net = await import("net");
      const dgram = await import("dgram");
      const tcp = (host, port) => new Promise((res) => {
        const t0 = Date.now();
        const s = net.connect({ host, port, timeout: 4000 });
        s.on("connect", () => { s.destroy(); res(`connect ${Date.now() - t0}ms`); });
        s.on("timeout", () => { s.destroy(); res("timeout"); });
        s.on("error", (e) => res(`error ${e.code}`));
      });
      const udp = (host, port, payload) => new Promise((res) => {
        const t0 = Date.now();
        const s = dgram.createSocket("udp4");
        const to = setTimeout(() => { s.close(); res("timeout"); }, 4000);
        s.on("message", () => { clearTimeout(to); s.close(); res(`reply ${Date.now() - t0}ms`); });
        s.on("error", (e) => { clearTimeout(to); res(`error ${e.code}`); });
        s.send(payload, port, host);
      });
      // minimal DNS query for example.com A record
      const dnsQ = Buffer.from("abcd01000001000000000000076578616d706c6503636f6d0000010001", "hex");
      const ntpQ = Buffer.alloc(48); ntpQ[0] = 0x1b;
      send(200, {
        tcp443_portquiz: await tcp("portquiz.net", 443),
        tcp8080_portquiz: await tcp("portquiz.net", 8080),
        tcp1935_portquiz: await tcp("portquiz.net", 1935),
        tcp1935_rtmp_cf: await tcp("live.cloudflare.com", 1935),
        udp53_cloudflare: await udp("1.1.1.1", 53, dnsQ),
        udp53_google: await udp("8.8.8.8", 53, dnsQ),
        udp123_ntp: await udp("time.cloudflare.com", 123, ntpQ),
      });
    } else if (url.pathname === "/sysinfo") {
      const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };
      send(200, { cpuinfo: (read("/proc/cpuinfo") || "").split("\n\n")[0],
        meminfo: (read("/proc/meminfo") || "").split("\n").slice(0, 5),
        cgroupCpuMax: read("/sys/fs/cgroup/cpu.max"),
        cgroupMemMax: read("/sys/fs/cgroup/memory.max"),
        df: spawnSync("df", ["-h", "/tmp"], { encoding: "utf8" }).stdout });
    } else send(404, { err: "not found" });
  } catch (e) {
    console.error("ERROR:", e.message || e);
    send(500, { err: String(e.message || e) });
  }
});
server.listen(PORT, () => console.log(`selfrec-repack test server on :${PORT}, boot ${new Date(BOOT).toISOString()}`));
