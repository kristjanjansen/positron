#!/usr/bin/env python3
"""§12 page/log server on :8888 (this agent's port).

- Serves rig/moq/spike/www (the shim page + bundle live there, next to the
  other spike bundles, so the Docker esbuild recipe is unchanged).
- GET /fingerprint -> SHA-256 hex of rig/moq/mtx/moq-cert.pem (DER), so the
  page can pin mediamtx's cert via serverCertificateHashes without any TLS
  fetch or Chrome cert flags.
- POST /log -> logs/browser.log ; lines starting with "JSONL " are also
  appended (payload only) to logs/browser.jsonl for results extraction.
"""
import http.server
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "spike", "www"))
LOG = os.path.join(HERE, "logs", "browser.log")
JSONL = os.path.join(HERE, "logs", "browser.jsonl")
CERT = os.path.join(HERE, "moq-cert.pem")


MTX_FP_URL = os.environ.get("MTX_FP_URL", "https://127.0.0.1:18892/moqmtx/fingerprint")


def fingerprint():
    # mediamtx's HTTP/3 (WebTransport) listener ALWAYS uses its own in-memory
    # JIT ECDSA P-256 cert (14-day validity, rotated) — moqServerCert only
    # covers the HTTP/2 side. So proxy the live fingerprint at request time.
    return subprocess.run(
        ["curl", "-sk", MTX_FP_URL], capture_output=True, check=True
    ).stdout.decode().strip()


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_GET(self):
        if self.path == "/fingerprint":
            body = fingerprint().encode()
            self.send_response(200)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(n).decode("utf-8", "replace")
        with open(LOG, "a") as f:
            f.write(f"[{self.path}] {body}\n")
        for line in body.splitlines():
            if line.startswith("JSONL "):
                with open(JSONL, "a") as f:
                    f.write(line[6:] + "\n")
        self.send_response(204)
        self.end_headers()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    http.server.ThreadingHTTPServer(
        ("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8888), H
    ).serve_forever()
