#!/usr/bin/env python3
"""Static file server + result collector for the latency rig.

Serves rig/ on :8899 and accepts POST /collect with a JSON body,
appending each sample batch to results/llhls.jsonl and echoing a
one-line summary to stdout.
"""
import json, os, sys, time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "..", "results")
os.makedirs(OUT, exist_ok=True)
PATH = os.path.join(OUT, "llhls.jsonl")


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, *a):
        pass  # keep stdout clean for results only

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        # Chrome will happily serve a stale rig page and silently invalidate a run.
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        if self.path != "/collect":
            self.send_response(404)
            self.end_headers()
            return
        n = int(self.headers.get("content-length", 0))
        try:
            rec = json.loads(self.rfile.read(n) or b"{}")
        except Exception as e:
            self.send_response(400)
            self.end_headers()
            return
        rec["server_ts"] = time.time()
        run = str(rec.get("run", "default")).replace("/", "_")[:40]
        with open(os.path.join(OUT, f"{run}.jsonl"), "a") as f:
            f.write(json.dumps(rec) + "\n")
        print(
            f"n={rec.get('n',0):5d} "
            f"p50={rec.get('p50')} p95={rec.get('p95')} p99={rec.get('p99')} "
            f"hls.latency={rec.get('hlsLatency')} dropped={rec.get('dropped')} "
            f"rvfc={rec.get('rvfcFired')}",
            flush=True,
        )
        self.send_response(204)
        self.end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8899
    print(f"serving {ROOT} on :{port}, results -> {PATH}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
