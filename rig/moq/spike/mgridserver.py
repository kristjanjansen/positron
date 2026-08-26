#!/usr/bin/env python3
# MULTI-PUBLISHER grid rig server (RUNBOOK §13). Port 8887 (this agent's port).
# - static files from www/
# - POST /log            -> append logs/moq-mgrid.log (+ stdout)
# - POST /jsonl/<name>   -> append results/moq-mgrid-<name>.jsonl (repo results/)
# - GET  /roster         -> {"pubs":[ns,...],"v":N}  (the draft-14 discovery shim:
#                           no SUBSCRIBE_NAMESPACE on CF -> local registry; production
#                           discovery would ride the RtcRoom DO)
# - POST /roster         -> {"action":"add"|"remove"|"clear","ns":...}
# - GET  /cmd?id=X       -> latest command for X or {}
# - POST /cmd            -> {"id":X, ...} stored (server adds tSrv ms)
import http.server, socketserver, sys, os, json, threading, time

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8887
BASE = os.path.dirname(os.path.abspath(__file__))
WWW = os.path.join(BASE, "www")
LOG = os.path.join(BASE, "logs", "moq-mgrid.log")
RESULTS = os.path.abspath(os.path.join(BASE, "..", "..", "..", "results"))
os.makedirs(os.path.join(BASE, "logs"), exist_ok=True)

lock = threading.Lock()
roster = {}   # ns -> {"t": ms}
roster_v = 0
cmds = {}     # id -> cmd dict

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=WWW, **kw)

    def log_message(self, *a):
        pass

    def _json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        global roster_v
        if self.path.startswith("/roster"):
            with lock:
                return self._json({"pubs": sorted(roster.keys()), "v": roster_v})
        if self.path.startswith("/cmd"):
            from urllib.parse import urlparse, parse_qs
            q = parse_qs(urlparse(self.path).query)
            cid = (q.get("id") or [""])[0]
            with lock:
                return self._json(cmds.get(cid, {}))
        return super().do_GET()

    def do_POST(self):
        global roster_v
        n = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(n)
        if self.path == "/log":
            line = body.decode(errors="replace").rstrip("\n")
            with lock:
                with open(LOG, "a") as f:
                    f.write(line + "\n")
            print(line, flush=True)
            return self._json({"ok": True})
        if self.path.startswith("/jsonl/"):
            name = os.path.basename(self.path[len("/jsonl/"):]) or "unnamed"
            p = os.path.join(RESULTS, f"moq-mgrid-{name}.jsonl")
            with lock:
                with open(p, "a") as f:
                    f.write(body.decode(errors="replace").rstrip("\n") + "\n")
            return self._json({"ok": True})
        if self.path == "/roster":
            try:
                o = json.loads(body)
            except Exception:
                return self._json({"err": "bad json"}, 400)
            with lock:
                act = o.get("action")
                if act == "add" and o.get("ns"):
                    roster[o["ns"]] = {"t": int(time.time() * 1000)}
                elif act == "remove" and o.get("ns"):
                    roster.pop(o["ns"], None)
                elif act == "clear":
                    roster.clear()
                else:
                    return self._json({"err": "bad action"}, 400)
                roster_v += 1
                print(f"ROSTER {act} {o.get('ns','')} -> {sorted(roster.keys())}", flush=True)
                return self._json({"ok": True, "v": roster_v})
        if self.path == "/cmd":
            try:
                o = json.loads(body)
            except Exception:
                return self._json({"err": "bad json"}, 400)
            if not o.get("id"):
                return self._json({"err": "no id"}, 400)
            o["tSrv"] = int(time.time() * 1000)
            with lock:
                cmds[o["id"]] = o
            print(f"CMD set {json.dumps(o)}", flush=True)
            return self._json({"ok": True, "tSrv": o["tSrv"]})
        return self._json({"err": "unknown"}, 404)

class S(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

print(f"mgridserver on :{PORT} www={WWW} results={RESULTS}", flush=True)
S(("127.0.0.1", PORT), H).serve_forever()
