#!/usr/bin/env python3
"""Audio-spike static server (www/) + POST collectors:
POST /log   -> logs/moq-audio.log (text lines)
POST /jsonl -> logs/moq-audio.jsonl (one JSON object per line)
Own instance so the shared browser.log / pubserver.py (sibling-owned) stay untouched.
"""
import http.server
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(BASE, "www")
LOG = os.path.join(BASE, "logs", "moq-audio.log")
JSONL = os.path.join(BASE, "logs", "moq-audio.jsonl")


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(n).decode("utf-8", "replace")
        path = JSONL if self.path == "/jsonl" else LOG
        with open(path, "a") as f:
            f.write(body + "\n")
        self.send_response(204)
        self.end_headers()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    os.makedirs(os.path.join(BASE, "logs"), exist_ok=True)
    http.server.ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8896), H).serve_forever()
