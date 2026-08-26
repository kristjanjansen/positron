#!/usr/bin/env python3
"""Replay-rig static server — port 8885 (this rig's own; siblings untouched).

Serves the WHOLE project root (so /proto/replay/*.html, /proto/m2m/grid.html and
/src/timed-messages.js are all reachable from one origin) with no-store caching,
plus POST /collect -> JSONL (REPLAY_RESULTS env) and GET /healthz.
Everything remote (signaling, cuelog, SFU, Stream VOD) is the deployed Worker /
Cloudflare — this server is static files + collector only.
"""
import http.server
import json
import os
import sys
import threading
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
PORT = int(os.environ.get("REPLAY_PORT", "8885"))
RESULTS = os.environ.get("REPLAY_RESULTS", os.path.join(ROOT, "results", "replay-test.jsonl"))
os.makedirs(os.path.dirname(RESULTS), exist_ok=True)
lock = threading.Lock()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.path == "/healthz":
            body = b"ok"
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self):
        if self.path != "/collect":
            self.send_response(404)
            self.end_headers()
            return
        n = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(n).decode("utf-8", "replace")
        with lock, open(RESULTS, "a") as f:
            for line in raw.split("\n"):
                line = line.strip()
                if not line:
                    continue
                try:
                    json.loads(line)
                    f.write(line + "\n")
                except ValueError:
                    f.write(json.dumps({"kind": "bad-line", "raw": line[:500], "t": time.time() * 1000}) + "\n")
        self.send_response(204)
        self.end_headers()


if __name__ == "__main__":
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"replay-server on :{PORT} root={ROOT} results={RESULTS}", flush=True)
    srv.serve_forever()
