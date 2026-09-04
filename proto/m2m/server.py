#!/usr/bin/env python3
"""m2m SFU prototype server — port 8897 (exclusive to this prototype).

Roles (all in one small process for the local prototype):
  1. Static file server for proto/m2m/ (Cache-Control: no-store — plan §4.2 trap).
  2. REGISTRY (the "room"): POST /join {participantId, sessionId, trackName}
     -> upsert; GET /roster -> {participants:[...]}; POST /reset -> clear.
     PRODUCTION MAPPING: this registry is exactly what the workers/cues Durable
     Object room does (workers/cues/, deployed at elektron-cues.…workers.dev):
     one DO instance per room, joins broadcast over WebSocket instead of being
     polled, and the 500-cue backlog covers late joiners. Swap poll->WS push and
     this file's registry disappears into a ~30-line DO handler.
  3. COLLECTOR: POST /collect -> appends JSON lines to results/m2m-sfu.jsonl.
  4. SFU PROXY: POST|PUT /cf/<subpath> -> https://rtc.live.cloudflare.com/v1/
     apps/{APP_ID}/<subpath> with the bearer secret from .env. Keeps the app
     secret out of the pages and sidesteps CORS. PRODUCTION MAPPING: this is the
     one part that MUST stay server-side (a Worker route) — the app secret can
     mint sessions and pull any track in the app.
  5. POST /save/<name> -> artifacts/<name> verbatim (SDP evidence).
"""
import http.server
import json
import os
import re
import ssl
import sys
import threading
import time
import urllib.request
import urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
RESULTS_DEFAULT = os.path.join(ROOT, "results", "m2m-sfu.jsonl")
RESULTS = os.environ.get("M2M_RESULTS", RESULTS_DEFAULT)
ARTIFACTS = os.path.join(HERE, "artifacts")
PORT = int(os.environ.get("M2M_PORT", "8897"))  # churn agent runs a 2nd instance on 8896
SAVE_NAME_RE = re.compile(r"^[a-z0-9._-]{1,64}$")
CF_BASE = "https://rtc.live.cloudflare.com/v1/apps"
CF_SUBPATH_RE = re.compile(r"^[A-Za-z0-9/_-]{1,200}$")


def load_env():
    env = {}
    with open(os.path.join(ROOT, ".env")) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


ENV = load_env()
APP_ID = ENV["CF_REALTIME_APP_ID"]
APP_SECRET = ENV["CF_REALTIME_APP_SECRET"]

REGISTRY = {}  # participantId -> {participantId, sessionId, trackName, t}
REG_LOCK = threading.Lock()
FILE_LOCK = threading.Lock()


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

    def _reply(self, code=200, body=b"ok", ctype="text/plain"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _json(self, obj, code=200):
        self._reply(code, json.dumps(obj, separators=(",", ":")).encode(),
                    "application/json")

    # ---- SFU proxy ---------------------------------------------------------
    def _proxy_cf(self, method, body):
        sub = self.path[len("/cf/"):]
        if not CF_SUBPATH_RE.match(sub):
            self._reply(400, b"bad cf subpath")
            return
        url = "%s/%s/%s" % (CF_BASE, APP_ID, sub)
        req = urllib.request.Request(url, data=body, method=method, headers={
            "Authorization": "Bearer " + APP_SECRET,
            "Content-Type": "application/json",
            # Cloudflare's edge 1010-blocks the default Python-urllib UA
            "User-Agent": "positron-m2m-rig/1.0 (curl-compatible)",
        })
        t0 = time.time()
        try:
            with urllib.request.urlopen(req, timeout=20,
                                        context=ssl.create_default_context()) as r:
                resp_body = r.read()
                code = r.status
        except urllib.error.HTTPError as e:
            resp_body = e.read()
            code = e.code
        except Exception as e:  # network error — surface as 502
            resp_body = json.dumps({"proxyError": str(e)}).encode()
            code = 502
        sys.stderr.write("%s CF %s /%s -> %d (%.0f ms)\n" % (
            time.strftime("%H:%M:%S"), method, sub, code, (time.time() - t0) * 1000))
        self._reply(code, resp_body, "application/json")

    # ---- routes ------------------------------------------------------------
    def do_GET(self):
        if self.path.startswith("/cf/"):        # e.g. GET sessions/{sid} — track GC state
            self._proxy_cf("GET", None)
            return
        if self.path == "/roster":
            with REG_LOCK:
                parts = sorted(REGISTRY.values(), key=lambda p: p["t"])
            self._json({"participants": parts})
            return
        super().do_GET()

    def do_PUT(self):
        body = self._read_body()
        if self.path.startswith("/cf/"):
            self._proxy_cf("PUT", body)
        else:
            self._reply(404, b"nope")

    def do_POST(self):
        body = self._read_body()
        if self.path.startswith("/cf/"):
            self._proxy_cf("POST", body)
        elif self.path == "/join":
            try:
                obj = json.loads(body)
                pid = str(obj["participantId"])
                row = {"participantId": pid,
                       "sessionId": str(obj["sessionId"]),
                       "trackName": str(obj["trackName"]),
                       "t": time.time()}
            except (ValueError, KeyError) as e:
                self._reply(400, ("bad join: %s" % e).encode())
                return
            with REG_LOCK:
                REGISTRY[pid] = row
            self._json({"ok": True, "count": len(REGISTRY)})
        elif self.path == "/reset":
            with REG_LOCK:
                REGISTRY.clear()
            self._reply(200, b"reset")
        elif self.path == "/collect":
            wrote = 0
            with FILE_LOCK:
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
            self._reply(200, ("wrote %d" % wrote).encode())
        elif self.path.startswith("/save/"):
            name = self.path[len("/save/"):]
            if not SAVE_NAME_RE.match(name):
                self._reply(400, b"bad name")
                return
            os.makedirs(ARTIFACTS, exist_ok=True)
            with open(os.path.join(ARTIFACTS, name), "wb") as f:
                f.write(body)
            self._reply(200, b"saved")
        else:
            self._reply(404, b"nope")


if __name__ == "__main__":
    os.makedirs(os.path.dirname(RESULTS), exist_ok=True)
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    sys.stderr.write("m2m server on :%d, results -> %s, app %s…\n"
                     % (PORT, RESULTS, APP_ID[:8]))
    srv.serve_forever()
