#!/usr/bin/env python3
"""WHEP rig server — port 8897 (exclusive to item 6).

- GET  /<file>          -> serves files from rig/whep/, Cache-Control: no-store
- POST /collect         -> appends each JSON line of the body to results/whep.jsonl
- POST /save/<name>     -> writes body VERBATIM to rig/whep/artifacts/<name>
                           (whitelisted names only; used for offer/answer SDPs)
"""
import http.server
import json
import os
import re
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
RESULTS = os.path.join(ROOT, "results", "whep.jsonl")
ARTIFACTS = os.path.join(HERE, "artifacts")
PORT = 8897

SAVE_NAME_RE = re.compile(r"^[a-z0-9._-]{1,64}$")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=HERE, **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (time.strftime("%H:%M:%S"), fmt % args))

    def _read_body(self):
        n = int(self.headers.get("Content-Length", 0))
        return self.rfile.read(n) if n else b""

    def _ok(self, code=200, body=b"ok"):
        self.send_response(code)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        body = self._read_body()
        if self.path == "/collect":
            wrote = 0
            with open(RESULTS, "a") as f:
                for line in body.decode("utf-8", "replace").splitlines():
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                    except ValueError:
                        obj = {"kind": "unparseable", "raw": line[:2000]}
                    if not isinstance(obj, dict):
                        obj = {"kind": "nonobject", "raw": line[:2000]}
                    obj["srv_ts"] = time.time()
                    f.write(json.dumps(obj, separators=(",", ":")) + "\n")
                    wrote += 1
            self._ok(200, ("wrote %d" % wrote).encode())
        elif self.path.startswith("/save/"):
            name = self.path[len("/save/"):]
            if not SAVE_NAME_RE.match(name):
                self._ok(400, b"bad name")
                return
            os.makedirs(ARTIFACTS, exist_ok=True)
            with open(os.path.join(ARTIFACTS, name), "wb") as f:
                f.write(body)
            self._ok(200, b"saved")
        else:
            self._ok(404, b"nope")


if __name__ == "__main__":
    os.makedirs(os.path.dirname(RESULTS), exist_ok=True)
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    sys.stderr.write("whep rig server on :%d, results -> %s\n" % (PORT, RESULTS))
    srv.serve_forever()
