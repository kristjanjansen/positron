#!/usr/bin/env node
// centralrec local server — port 8893 (PROTO B agent's; sibling owns 8894).
// Roles:
//   1. Static file server for proto/centralrec/ (Cache-Control: no-store).
//   2. COLLECTOR: POST /collect -> JSONL (CENTRALREC_RESULTS env), newline-batched
//      bodies accepted (grid-server.py parity), srv_ts appended.
//   3. CHUNK RECEIVER: POST /chunk/<file>?seq=N&run=<label> -> append raw body to
//      RECDIR/<file>.webm. MediaRecorder timeslice chunks are a continuation of one
//      stream, so ordered appends reconstruct the exact recording. Client serializes
//      uploads per file; server VERIFIES seq monotonicity and logs every chunk
//      ({kind:'chunk'}) into the results JSONL — that log IS the file-growth timeline.
//   4. POST /end/<file>?reason= -> {kind:'rec-end'} marker (clean close signal).
// Signaling + SFU are NOT here: pages talk to the DEPLOYED elektron-rtc Worker.
import http from "http";
import fs from "fs";
import path from "path";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, "..", "..");
const PORT = parseInt(process.env.CENTRALREC_PORT || "8893", 10);
const RESULTS = process.env.CENTRALREC_RESULTS ||
  path.join(ROOT, "results", "centralrec-dev.jsonl");
const RECDIR = process.env.CENTRALREC_RECDIR || path.join(HERE, "recordings", "dev");
fs.mkdirSync(path.dirname(RESULTS), { recursive: true });
fs.mkdirSync(RECDIR, { recursive: true });

const FILE_RE = /^[A-Za-z0-9._-]{1,80}$/;
const MIME = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript",
               ".json": "application/json", ".webm": "video/webm" };
const seqState = new Map();       // file -> last seq
let resultsFd = fs.openSync(RESULTS, "a");

function logRow(obj) {
  obj.srv_ts = Date.now() / 1000;
  fs.writeSync(resultsFd, JSON.stringify(obj) + "\n");
}
function readBody(req) {
  return new Promise((res, rej) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => res(Buffer.concat(chunks)));
    req.on("error", rej);
  });
}
function reply(res, code, body, ctype = "text/plain") {
  res.writeHead(code, { "Content-Type": ctype, "Cache-Control": "no-store",
                        "Access-Control-Allow-Origin": "*" });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  try {
    if (req.method === "OPTIONS") return reply(res, 200, "ok");
    if (req.method === "GET" && u.pathname === "/healthz") return reply(res, 200, "ok");

    if (req.method === "POST" && u.pathname === "/collect") {
      const body = await readBody(req);
      let wrote = 0;
      for (const line of body.toString("utf8").split("\n")) {
        const t = line.trim();
        if (!t) continue;
        let obj;
        try { obj = JSON.parse(t); } catch (e) { obj = { kind: "unparseable", raw: t.slice(0, 2000) }; }
        if (typeof obj !== "object" || obj === null) obj = { kind: "nonobject", raw: t.slice(0, 2000) };
        logRow(obj);
        wrote++;
      }
      return reply(res, 200, "wrote " + wrote);
    }

    let m;
    if (req.method === "POST" && (m = u.pathname.match(/^\/chunk\/([^/]+)$/))) {
      const file = m[1];
      if (!FILE_RE.test(file)) return reply(res, 400, "bad file name");
      const seq = parseInt(u.searchParams.get("seq") || "-1", 10);
      const body = await readBody(req);
      const last = seqState.has(file) ? seqState.get(file) : -1;
      const inOrder = seq === last + 1;
      seqState.set(file, seq);
      const p = path.join(RECDIR, file + ".webm");
      fs.appendFileSync(p, body);
      logRow({ kind: "chunk", file, seq, bytes: body.length, inOrder,
               total: fs.statSync(p).size, t: Date.now() });
      if (!inOrder) console.error(`SEQ GAP ${file}: got ${seq} after ${last}`);
      return reply(res, 200, "ok");
    }
    if (req.method === "POST" && (m = u.pathname.match(/^\/end\/([^/]+)$/))) {
      const file = m[1];
      if (!FILE_RE.test(file)) return reply(res, 400, "bad file name");
      const p = path.join(RECDIR, file + ".webm");
      const size = fs.existsSync(p) ? fs.statSync(p).size : 0;
      logRow({ kind: "rec-end", file, reason: u.searchParams.get("reason") || "",
               lastSeq: seqState.get(file) ?? -1, total: size, t: Date.now() });
      return reply(res, 200, "ok");
    }

    if (req.method === "GET") {
      let fp = u.pathname === "/" ? "/recorder.html" : u.pathname;
      fp = path.normalize(fp).replace(/^(\.\.[/\\])+/, "");
      const full = path.join(HERE, fp);
      if (!full.startsWith(HERE) || !fs.existsSync(full) || !fs.statSync(full).isFile())
        return reply(res, 404, "not found");
      return reply(res, 200, fs.readFileSync(full), MIME[path.extname(full)] || "application/octet-stream");
    }
    reply(res, 404, "nope");
  } catch (e) {
    reply(res, 500, String(e && e.message || e));
  }
});
server.listen(PORT, "127.0.0.1", () => {
  console.error(`centralrec server on :${PORT}, results -> ${RESULTS}, recdir -> ${RECDIR}`);
});
