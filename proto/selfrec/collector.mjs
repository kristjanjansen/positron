#!/usr/bin/env node
// selfrec collector — :8894. Serves participant.html and appends beacon rows
// (fetch POST JSON arrays — never sendBeacon, its 64 KB quota burned this
// project twice) to the RESULTS jsonl. One collector per scenario run.
// Env: RESULTS (jsonl path, required). Port fixed at 8894 (selfrec's port).
import http from "http";
import fs from "fs";

const HERE = "/Users/s32863/personal/elektron/proto/selfrec";
const RESULTS = process.env.RESULTS;
const PORT = 8894;
if (!RESULTS) { console.error("collector: RESULTS env required"); process.exit(1); }

let rows = 0;
const server = http.createServer((req, res) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  if (req.method === "GET" && (req.url === "/healthz")) {
    res.writeHead(200, { "content-type": "application/json", ...cors });
    return res.end(JSON.stringify({ ok: true, rows }));
  }
  if (req.method === "GET" && req.url.startsWith("/participant.html")) {
    res.writeHead(200, { "content-type": "text/html", "cache-control": "no-store", ...cors });
    return res.end(fs.readFileSync(`${HERE}/participant.html`));
  }
  if (req.method === "GET" && req.url.startsWith("/replay-grid.html")) {
    res.writeHead(200, { "content-type": "text/html", "cache-control": "no-store", ...cors });
    return res.end(fs.readFileSync(`${HERE}/replay-grid.html`));
  }
  if (req.method === "GET" && req.url.startsWith("/replay-masters.html")) {
    res.writeHead(200, { "content-type": "text/html", "cache-control": "no-store", ...cors });
    return res.end(fs.readFileSync(`${HERE}/replay-masters.html`));
  }
  // the SHARED timeline library, served from the repo (never copied) so the
  // grid imports the same file timeline/lab measured — jam's server does the
  // same aliasing for :8893.
  if (req.method === "GET" && req.url.startsWith("/timeline/")) {
    const rel = req.url.split("?")[0].replace(/^\/+/, "").replace(/\.\./g, "");
    res.writeHead(200, { "content-type": "text/javascript", "cache-control": "no-store", ...cors });
    return res.end(fs.readFileSync(`/Users/s32863/personal/elektron/${rel}`));
  }
  if (req.method === "GET" && req.url === "/hls.min.js") {   // vendored (proto/flipper), 1.7.1
    res.writeHead(200, { "content-type": "text/javascript", ...cors });
    return res.end(fs.readFileSync("/Users/s32863/personal/elektron/proto/flipper/hls.min.js"));
  }
  if (req.method === "POST" && req.url === "/beacon") {
    const chunks = [];
    req.on("data", (d) => chunks.push(d));
    req.on("end", () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString());
        const arr = Array.isArray(body) ? body : [body];
        for (const r of arr) fs.appendFileSync(RESULTS, JSON.stringify({ recvT: Date.now(), ...r }) + "\n");
        rows += arr.length;
        res.writeHead(200, { "content-type": "application/json", ...cors });
        res.end(JSON.stringify({ ok: true, n: arr.length }));
      } catch (e) {
        res.writeHead(400, cors); res.end();
      }
    });
    return;
  }
  res.writeHead(404, cors); res.end();
});
server.listen(PORT, "127.0.0.1", () =>
  console.log(`selfrec-collector on :${PORT} -> ${RESULTS}`));
