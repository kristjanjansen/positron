#!/usr/bin/env python3
"""Static server for the §9 resolution/framerate matrix (default :8894).

Serves www/; POST /log appends to logs/moq-4k-matrix.log; POST /jsonl/<name>
appends the body (already JSONL) to <repo>/results/moq-4k-<name>.jsonl."""
import http.server
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "www")
LOG = os.path.join(HERE, "logs", "moq-4k-matrix.log")
RESULTS = os.path.abspath(os.path.join(HERE, "..", "..", "..", "results"))


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(n).decode("utf-8", "replace")
        m = re.fullmatch(r"/jsonl/([A-Za-z0-9_-]{1,40})", self.path)
        if m:
            path = os.path.join(RESULTS, f"moq-4k-{m.group(1)}.jsonl")
        else:
            path = LOG
        with open(path, "a") as f:
            f.write(body + "\n")
        self.send_response(204)
        self.end_headers()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    os.makedirs(RESULTS, exist_ok=True)
    http.server.ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8894), H).serve_forever()
