#!/usr/bin/env python3
"""Static server for the spike page + POST /log collector -> browser.log."""
import http.server
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "www")
LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "browser.log")


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(n).decode("utf-8", "replace")
        with open(LOG, "a") as f:
            f.write(f"[{self.path}] {body}\n")
        self.send_response(204)
        self.end_headers()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    open(LOG, "w").close()
    http.server.ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8892), H).serve_forever()
