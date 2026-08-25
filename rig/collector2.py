#!/usr/bin/env python3
"""Telemetry collector for the resilience test.

  POST /collect  <- player telemetry, ~2/s
  POST /event    <- chaos markers (ingest up/down) from chaos.sh
  GET  /*        <- static files from repo root (serves rig/ and src/)

Everything lands in results/resilience.jsonl as one ordered event stream so
player state and ingest state can be aligned on a single timeline.
"""
import json, os, sys, time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "results")
os.makedirs(OUT, exist_ok=True)
PATH = os.path.join(OUT, "resilience.jsonl")


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        kind = {"/collect": "player", "/event": "chaos"}.get(self.path)
        if not kind:
            self.send_response(404); self.end_headers(); return
        n = int(self.headers.get("content-length", 0))
        try:
            rec = json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            self.send_response(400); self.end_headers(); return
        rec["kind"] = kind
        rec["ts"] = time.time()
        with open(PATH, "a") as f:
            f.write(json.dumps(rec) + "\n")
        if kind == "chaos":
            print(f"  [chaos] {rec.get('event')} {rec.get('detail','')}", flush=True)
        self.send_response(204); self.end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8900
    open(PATH, "a").close()
    print(f"collector on :{port}  root={ROOT}  -> {PATH}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
