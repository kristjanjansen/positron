#!/usr/bin/env python3
"""m2m GRID stub server — port 8897 (grid agent's; server.py untouched).

Roles:
  1. Static file server for proto/m2m/ (Cache-Control: no-store).
  2. SFU PROXY: POST|PUT|GET /cf/<subpath> -> rtc.live.cloudflare.com with the
     bearer secret from .env (custom UA — CF 1010-blocks urllib's default).
     PRODUCTION MAPPING: the sibling's Worker owns this in production.
  3. COLLECTOR: POST /collect -> JSONL (M2M_RESULTS env).
  4. TILE SNAPSHOT STORE (wall tier): POST /tile/<room>/<id> stores a JPEG in
     memory; GET /tile/<room>/<id> serves it (404 if absent or older than TTL).
     X-Tile-Ts response header = server receive time (ms). PRODUCTION MAPPING:
     Worker + cache/R2 or DO storage; protocol identical.
  5. SIGNALING STUB: real RFC6455 WebSocket server at /room/<name>/ws speaking
     EXACTLY the deployed Worker's protocol (workers/rtc/DEPLOYED.md,
     2026-08-26), so stub <-> production is a URL change only:
       c->s  {type:'join', participantId?, name?, role}   # everyone joins tier wall
       c->s  {type:'publish', sessionId, trackNames:[...]}
       c->s  {type:'promote'|'demote', participantId, tier}   # operator only
       s->c  {type:'roster', self:{id, role}, participants:[
                {id,name,role,tier,sessionId,trackNames,joinedAt}]}  # joiner only
       s->c  {type:'joined', participant:{...}}           # everyone else
       s->c  {type:'published', participantId, sessionId, trackNames}  # ALL
       s->c  {type:'promote'|'demote', participantId, tier, by}        # ALL
       s->c  {type:'left', participantId}    # fired by socket close (the DO's
                                             # webSocketClose feature, §3)
       literal "ping" -> literal "pong" (autoresponse parity)
     Socket close (incl. SIGKILL of the page's Chrome) -> immediate `left`
     broadcast, same semantics as the RtcRoom DO. Push-only like the DO, so
     death-detection timing here is an honest local approximation of the
     production path (minus the ~30-40 ms Worker hop).
"""
import base64
import hashlib
import http.server
import json
import os
import re
import ssl
import struct
import sys
import threading
import time
import urllib.request
import urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
RESULTS = os.environ.get("M2M_RESULTS", os.path.join(ROOT, "results", "m2m-grid.jsonl"))
PORT = int(os.environ.get("M2M_PORT", "8897"))
CF_BASE = "https://rtc.live.cloudflare.com/v1/apps"
CF_SUBPATH_RE = re.compile(r"^[A-Za-z0-9/_-]{1,200}$")
NAME_RE = re.compile(r"^[A-Za-z0-9._-]{1,32}$")
TILE_TTL_S = 6.0
WS_MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"


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

FILE_LOCK = threading.Lock()
TILES = {}                       # (room, id) -> (bytes, t)
TILE_LOCK = threading.Lock()

# ---- room state (the stub's "DO") -------------------------------------------
ROOMS = {}                       # room -> {"parts": {id: dict}, "socks": {id: Client}}
ROOM_LOCK = threading.Lock()


class Client:
    def __init__(self, conn, rfile, room, handler):
        self.conn = conn
        self.rfile = rfile
        self.room = room
        self.id = None
        self.send_lock = threading.Lock()

    def send_json(self, obj):
        payload = json.dumps(obj, separators=(",", ":")).encode()
        n = len(payload)
        if n < 126:
            hdr = struct.pack("!BB", 0x81, n)
        elif n < 65536:
            hdr = struct.pack("!BBH", 0x81, 126, n)
        else:
            hdr = struct.pack("!BBQ", 0x81, 127, n)
        with self.send_lock:
            self.conn.sendall(hdr + payload)


def room_state(room):
    with ROOM_LOCK:
        if room not in ROOMS:
            ROOMS[room] = {"parts": {}, "socks": {}}
        return ROOMS[room]


def broadcast(room, obj, exclude=None):
    st = room_state(room)
    with ROOM_LOCK:
        socks = list(st["socks"].items())
    dead = []
    for pid, cl in socks:
        if pid == exclude:
            continue
        try:
            cl.send_json(obj)
        except Exception:
            dead.append(pid)
    for pid in dead:
        drop_participant(room, pid, "send-failed")


def drop_participant(room, pid, why):
    st = room_state(room)
    with ROOM_LOCK:
        existed = pid in st["parts"]
        st["parts"].pop(pid, None)
        st["socks"].pop(pid, None)
    if existed:
        sys.stderr.write("%s WS %s/%s LEFT (%s)\n" % (time.strftime("%H:%M:%S"), room, pid, why))
        broadcast(room, {"type": "left", "participantId": pid})


def handle_frame(room, cl, obj):
    st = room_state(room)
    t = obj.get("type")
    if t == "join":
        pid = str(obj.get("participantId") or obj.get("name")
                  or ("p%d" % (int(time.time() * 1000) % 100000)))[:64]
        cl.id = pid
        row = {"id": pid, "name": str(obj.get("name") or pid)[:64],
               "role": str(obj.get("role") or "audience")[:16],
               "tier": "wall",                      # everyone joins at tier wall (DEPLOYED.md)
               "sessionId": None, "trackNames": [], "joinedAt": int(time.time() * 1000)}
        with ROOM_LOCK:
            st["parts"][pid] = row
            st["socks"][pid] = cl
            roster = list(st["parts"].values())
        cl.send_json({"type": "roster", "self": {"id": pid, "role": row["role"]},
                      "participants": roster, "perm": {"publish": {}}})
        broadcast(room, {"type": "joined", "participant": row}, exclude=pid)
        sys.stderr.write("%s WS %s/%s joined (%s), n=%d\n"
                         % (time.strftime("%H:%M:%S"), room, pid, row["role"], len(roster)))
    elif t == "publish":
        with ROOM_LOCK:
            row = st["parts"].get(cl.id)
            if row:
                row["sessionId"] = str(obj.get("sessionId") or "")
                row["trackNames"] = [str(x) for x in (obj.get("trackNames") or [])]
        if row:
            broadcast(room, {"type": "published", "participantId": cl.id,
                             "sessionId": row["sessionId"], "trackNames": row["trackNames"]})
    elif t in ("promote", "demote"):
        with ROOM_LOCK:
            sender = st["parts"].get(cl.id)
        if not sender or sender.get("role") != "operator":
            return                                  # operator only (Worker parity)
        pid = str(obj.get("participantId") or "")
        tier = str(obj.get("tier") or "")
        if tier not in ("featured", "live", "wall"):
            return
        with ROOM_LOCK:
            row = st["parts"].get(pid)
            if row:
                row["tier"] = tier
        if row:
            broadcast(room, {"type": t, "participantId": pid, "tier": tier, "by": cl.id})
            sys.stderr.write("%s WS %s/%s -> tier %s (%s by %s)\n"
                             % (time.strftime("%H:%M:%S"), room, pid, tier, t, cl.id))
    # unknown frames ignored (forward-compat with the real Worker's protocol)


class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=HERE, **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, fmt, *args):
        msg = fmt % args
        if "/tile/" in msg or "/collect" in msg:   # high-frequency, keep stderr readable
            return
        sys.stderr.write("%s %s\n" % (time.strftime("%H:%M:%S"), msg))

    def _read_body(self):
        n = int(self.headers.get("Content-Length", 0))
        return self.rfile.read(n) if n else b""

    def _reply(self, code=200, body=b"ok", ctype="text/plain", extra=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _json(self, obj, code=200):
        self._reply(code, json.dumps(obj, separators=(",", ":")).encode(), "application/json")

    # ---- SFU proxy (verbatim pattern from server.py) ------------------------
    def _proxy_cf(self, method, body):
        sub = self.path[len("/cf/"):]
        if not CF_SUBPATH_RE.match(sub):
            self._reply(400, b"bad cf subpath")
            return
        url = "%s/%s/%s" % (CF_BASE, APP_ID, sub)
        req = urllib.request.Request(url, data=body, method=method, headers={
            "Authorization": "Bearer " + APP_SECRET,
            "Content-Type": "application/json",
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
        except Exception as e:
            resp_body = json.dumps({"proxyError": str(e)}).encode()
            code = 502
        sys.stderr.write("%s CF %s /%s -> %d (%.0f ms)\n" % (
            time.strftime("%H:%M:%S"), method, sub, code, (time.time() - t0) * 1000))
        self._reply(code, resp_body, "application/json")

    # ---- WebSocket signaling ------------------------------------------------
    def _ws_upgrade(self):
        m = re.match(r"^/room/([A-Za-z0-9._-]{1,32})/ws(\?.*)?$", self.path)
        key = self.headers.get("Sec-WebSocket-Key")
        if not m or not key:
            self._reply(400, b"bad ws request")
            return
        room = m.group(1)
        accept = base64.b64encode(hashlib.sha1((key + WS_MAGIC).encode()).digest()).decode()
        self.connection.sendall(
            b"HTTP/1.1 101 Switching Protocols\r\n"
            b"Upgrade: websocket\r\nConnection: Upgrade\r\n"
            b"Sec-WebSocket-Accept: " + accept.encode() + b"\r\n\r\n")
        self.close_connection = True
        cl = Client(self.connection, self.rfile, room, self)
        try:
            self._ws_loop(room, cl)
        except Exception as e:
            sys.stderr.write("%s WS %s/%s error: %s\n"
                             % (time.strftime("%H:%M:%S"), room, cl.id, e))
        finally:
            if cl.id:
                drop_participant(room, cl.id, "socket-closed")

    def _ws_read_exact(self, n):
        buf = b""
        while len(buf) < n:
            chunk = self.rfile.read(n - len(buf))
            if not chunk:
                raise ConnectionError("eof")
            buf += chunk
        return buf

    def _ws_loop(self, room, cl):
        while True:
            hdr = self._ws_read_exact(2)
            opcode = hdr[0] & 0x0F
            masked = hdr[1] & 0x80
            ln = hdr[1] & 0x7F
            if ln == 126:
                ln = struct.unpack("!H", self._ws_read_exact(2))[0]
            elif ln == 127:
                ln = struct.unpack("!Q", self._ws_read_exact(8))[0]
            if ln > 1 << 20:
                raise ConnectionError("frame too big")
            mask = self._ws_read_exact(4) if masked else b"\x00" * 4
            payload = self._ws_read_exact(ln)
            if masked:
                payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
            if opcode == 8:                       # close
                raise ConnectionError("client close frame")
            if opcode == 9:                       # ping -> pong
                with cl.send_lock:
                    cl.conn.sendall(struct.pack("!BB", 0x8A, len(payload)) + payload)
                continue
            if opcode not in (1, 2):
                continue
            if payload == b"ping":                # literal ping -> literal pong (Worker parity)
                with cl.send_lock:
                    cl.conn.sendall(struct.pack("!BB", 0x81, 4) + b"pong")
                continue
            try:
                obj = json.loads(payload.decode("utf-8", "replace"))
            except ValueError:
                continue
            handle_frame(room, cl, obj)

    # ---- routes -------------------------------------------------------------
    def do_GET(self):
        if re.match(r"^/room/[A-Za-z0-9._-]{1,32}/ws", self.path):
            if (self.headers.get("Upgrade") or "").lower() == "websocket":
                self._ws_upgrade()
            else:
                self._reply(426, b"websocket only")
            return
        if self.path.startswith("/cf/"):
            self._proxy_cf("GET", None)
            return
        m = re.match(r"^/tile/([A-Za-z0-9._-]{1,32})/([A-Za-z0-9._-]{1,32})(\?.*)?$", self.path)
        if m:
            with TILE_LOCK:
                ent = TILES.get((m.group(1), m.group(2)))
            if not ent or time.time() - ent[1] > TILE_TTL_S:
                self._reply(404, b"no tile")
            else:
                age = int((time.time() - ent[1]) * 1000)
                self._reply(200, ent[0], "image/jpeg",
                            {"X-Tile-Age-Ms": str(age), "X-Tile-Source": "stub"})
            return
        if self.path.startswith("/rtc-status/"):
            room = self.path[len("/rtc-status/"):]
            st = room_state(room)
            with ROOM_LOCK:
                self._json({"participants": list(st["parts"].values())})
            return
        if self.path == "/healthz":
            self._reply(200, b"ok")
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
            return
        m = re.match(r"^/tile/([A-Za-z0-9._-]{1,32})/([A-Za-z0-9._-]{1,32})(\?.*)?$", self.path)
        if m:
            if len(body) > 64 * 1024:            # Worker parity: 64 KB cap
                self._reply(413, b"too big")
                return
            if not body.startswith(b"\xff\xd8"):  # Worker parity: JPEG magic
                self._reply(415, b"not jpeg")
                return
            with TILE_LOCK:
                TILES[(m.group(1), m.group(2))] = (body, time.time())
            self._reply(200, b"ok")
            return
        if self.path == "/collect":
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
            return
        self._reply(404, b"nope")


if __name__ == "__main__":
    os.makedirs(os.path.dirname(RESULTS), exist_ok=True)
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    http.server.ThreadingHTTPServer.daemon_threads = True
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    sys.stderr.write("m2m GRID server on :%d, results -> %s, app %s…\n"
                     % (PORT, RESULTS, APP_ID[:8]))
    srv.serve_forever()
