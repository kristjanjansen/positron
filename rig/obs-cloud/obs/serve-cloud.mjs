// In-container page server + probes on :8890 (cloud twin of obs-docker/serve.mjs).
//   /clock.html  burned-clock page for the OBS browser source (localhost fetch)
//   /now         container Date.now() — clock-skew probe (Worker-proxied from the Mac)
//   /collect     POST beacons -> /tmp/beacons.jsonl ; /beacons returns the tail
//   /cpu         /proc-sampled CPU: total + per-obs-process, 1.5 s window
//   /top         ps snapshot
//   /health      boot info
import http from "node:http";
import { readFileSync, appendFileSync, readdirSync, existsSync } from "node:fs";

const BOOT = Date.now();
const dir = "/opt/obscloud/";
const BEACONS = "/tmp/beacons.jsonl";

function cpuTimes() {
  const stat = readFileSync("/proc/stat", "utf8").split("\n")[0].trim().split(/\s+/).slice(1).map(Number);
  const total = stat.reduce((a, b) => a + b, 0);
  const idle = stat[3] + (stat[4] || 0);
  return { total, idle };
}
function procList() {
  const out = [];
  for (const pid of readdirSync("/proc")) {
    if (!/^\d+$/.test(pid)) continue;
    try {
      const s = readFileSync(`/proc/${pid}/stat`, "utf8");
      const m = s.match(/^(\d+) \((.*)\) \S (?:\S+ ){10}(\d+) (\d+)/);
      if (m) out.push({ pid: +m[1], comm: m[2], cpu: +m[3] + +m[4] });
    } catch {}
  }
  return out;
}

const server = http.createServer((req, res) => {
  const path = req.url.split("?")[0];
  const send = (code, obj, ct = "application/json") => { res.writeHead(code, { "content-type": ct, "cache-control": "no-store" }); res.end(typeof obj === "string" ? obj : JSON.stringify(obj, null, 1)); };
  try {
    if (path === "/now") send(200, String(Date.now()));
    else if (path === "/health") {
      send(200, { ok: true, bootAt: BOOT, uptimeMs: Date.now() - BOOT,
        loadavg: readFileSync("/proc/loadavg", "utf8").trim(),
        mem: readFileSync("/proc/meminfo", "utf8").split("\n").slice(0, 3),
        env: { LOC: process.env.CLOUDFLARE_LOCATION, DEPLOY: (process.env.CLOUDFLARE_DEPLOYMENT_ID || "").slice(0, 8) } });
    } else if (path === "/collect" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        let obj; try { obj = JSON.parse(body); } catch { obj = { raw: body }; }
        try { appendFileSync(BEACONS, JSON.stringify({ recv: Date.now(), ...obj }) + "\n"); } catch {}
        res.writeHead(204); res.end();
      });
    } else if (path === "/beacons") {
      send(200, existsSync(BEACONS) ? readFileSync(BEACONS, "utf8").split("\n").slice(-30).join("\n") : "", "text/plain");
    } else if (path === "/cpu") {
      const t0 = cpuTimes(), p0 = procList();
      setTimeout(() => {
        const t1 = cpuTimes(), p1 = procList();
        const dTotal = t1.total - t0.total;
        const HZ = 100, winS = 1.5;
        const per = p1.map((p) => {
          const prev = p0.find((q) => q.pid === p.pid);
          return prev ? { comm: p.comm, pid: p.pid, corePct: +(((p.cpu - prev.cpu) / HZ / winS) * 100).toFixed(1) } : null;
        }).filter((p) => p && p.corePct > 1).sort((a, b) => b.corePct - a.corePct).slice(0, 8);
        send(200, {
          totalBusyPctOfAllCores: +(((dTotal - (t1.idle - t0.idle)) / dTotal) * 100).toFixed(1),
          visibleCores: readFileSync("/proc/stat", "utf8").split("\n").filter((l) => /^cpu\d/.test(l)).length,
          topProcs: per,
          memAvailable: readFileSync("/proc/meminfo", "utf8").split("\n").find((l) => l.startsWith("MemAvailable")),
        });
      }, 1500);
    } else if (path === "/log") {
      const f = new URL(req.url, "http://x").searchParams.get("f") || "obs";
      const file = { obs: "/var/log/obs.log", xvfb: "/var/log/xvfb.log", pages: "/var/log/pages.log",
        sup: "/var/log/supervisor/supervisord.log" }[f];
      send(200, file && existsSync(file) ? readFileSync(file, "utf8").split("\n").slice(-120).join("\n") : "no such log " + f, "text/plain");
    } else if (path === "/df") {
      import("node:child_process").then(({ execFile }) =>
        execFile("df", ["-h"], (e, so) => send(200, so || String(e), "text/plain")));
    } else if (path === "/top") {
      import("node:child_process").then(({ execFile }) =>
        execFile("ps", ["aux", "--sort=-pcpu"], (e, so) => send(200, (so || String(e)).split("\n").slice(0, 12).join("\n"), "text/plain")));
    } else if (path === "/clock.html" || path === "/") {
      send(200, readFileSync(dir + "clock.html", "utf8"), "text/html");
    } else send(404, "not found", "text/plain");
  } catch (e) { send(500, String(e && e.message || e), "text/plain"); }
});
server.listen(8890, () => console.log("obscloud page server on :8890"));
