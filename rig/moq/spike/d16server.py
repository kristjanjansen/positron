#!/usr/bin/env python3
"""Static server + POST /log collector with SERVER-SIDE timestamps (one clock for all
pages) -> logs/moq-d16-announce.log. Port argv[1], default 8886. (draft-16 agent, §14)"""
import http.server
import os
import sys
import time

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "www")
LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs", "moq-d16-announce.log")


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(n).decode("utf-8", "replace")
        ts = f"{time.time():.3f}"
        with open(LOG, "a") as f:
            for line in body.splitlines():
                f.write(f"{ts} [{self.path}] {line}\n")
        self.send_response(204)
        self.end_headers()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    open(LOG, "w").close()
    http.server.ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8886), H).serve_forever()
