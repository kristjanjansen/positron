// rig/pico/net/ws.c: the WebSocket client. See ws.h for what it is and is not.
#include "ws.h"
#include <string.h>

static const char GUID[] = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

// ---- SHA-1, for Sec-WebSocket-Accept only. Not used for anything secret.

typedef struct { uint32_t h[5]; uint8_t b[64]; uint32_t bn; uint64_t len; } sha1_t;

static uint32_t rol(uint32_t x, int n) { return (x << n) | (x >> (32 - n)); }

static void sha1_block(sha1_t *s) {
  uint32_t w[80];
  for (int i = 0; i < 16; i++) w[i] = (uint32_t)s->b[4 * i] << 24 | (uint32_t)s->b[4 * i + 1] << 16 | (uint32_t)s->b[4 * i + 2] << 8 | s->b[4 * i + 3];
  for (int i = 16; i < 80; i++) w[i] = rol(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
  uint32_t a = s->h[0], b = s->h[1], c = s->h[2], d = s->h[3], e = s->h[4];
  for (int i = 0; i < 80; i++) {
    uint32_t f, k;
    if (i < 20) { f = (b & c) | (~b & d); k = 0x5A827999; }
    else if (i < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
    else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
    else { f = b ^ c ^ d; k = 0xCA62C1D6; }
    uint32_t t = rol(a, 5) + f + e + k + w[i];
    e = d; d = c; c = rol(b, 30); b = a; a = t;
  }
  s->h[0] += a; s->h[1] += b; s->h[2] += c; s->h[3] += d; s->h[4] += e;
}

static void sha1_init(sha1_t *s) {
  s->h[0] = 0x67452301; s->h[1] = 0xEFCDAB89; s->h[2] = 0x98BADCFE; s->h[3] = 0x10325476; s->h[4] = 0xC3D2E1F0;
  s->bn = 0; s->len = 0;
}
static void sha1_update(sha1_t *s, const uint8_t *p, size_t n) {
  for (size_t i = 0; i < n; i++) {
    s->b[s->bn++] = p[i];
    s->len += 8;
    if (s->bn == 64) { sha1_block(s); s->bn = 0; }
  }
}
static void sha1_final(sha1_t *s, uint8_t out[20]) {
  uint64_t len = s->len;
  uint8_t pad = 0x80;
  sha1_update(s, &pad, 1);
  pad = 0;
  while (s->bn != 56) sha1_update(s, &pad, 1);
  for (int i = 7; i >= 0; i--) { uint8_t c = (uint8_t)(len >> (8 * i)); sha1_update(s, &c, 1); }
  for (int i = 0; i < 5; i++) { out[4 * i] = s->h[i] >> 24; out[4 * i + 1] = s->h[i] >> 16; out[4 * i + 2] = s->h[i] >> 8; out[4 * i + 3] = s->h[i]; }
}

static void b64(const uint8_t *p, size_t n, char *out) {
  static const char A[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  size_t o = 0;
  for (size_t i = 0; i < n; i += 3) {
    uint32_t v = (uint32_t)p[i] << 16 | (i + 1 < n ? (uint32_t)p[i + 1] << 8 : 0) | (i + 2 < n ? p[i + 2] : 0);
    out[o++] = A[(v >> 18) & 63];
    out[o++] = A[(v >> 12) & 63];
    out[o++] = i + 1 < n ? A[(v >> 6) & 63] : '=';
    out[o++] = i + 2 < n ? A[v & 63] : '=';
  }
  out[o] = 0;
}

void ws_accept_for(const char *key, char out[29]) {
  sha1_t s;
  uint8_t d[20];
  sha1_init(&s);
  sha1_update(&s, (const uint8_t *)key, strlen(key));
  sha1_update(&s, (const uint8_t *)GUID, sizeof GUID - 1);
  sha1_final(&s, d);
  b64(d, 20, out);
}

// ---- small string helpers, no libc beyond memcpy/strlen

static char lower(char c) { return (c >= 'A' && c <= 'Z') ? (char)(c + 32) : c; }

// Finds header `name` (lowercase) in the response block; returns its value
// trimmed, NUL terminated in place, or NULL.
static char *header(char *http, const char *name) {
  size_t nl = strlen(name);
  for (char *line = strstr(http, "\r\n"); line && line[2]; line = strstr(line + 2, "\r\n")) {
    char *h = line + 2;
    size_t i = 0;
    while (i < nl && h[i] && lower(h[i]) == name[i]) i++;
    if (i != nl || h[i] != ':') continue;
    char *v = h + i + 1;
    while (*v == ' ' || *v == '\t') v++;
    char *end = strstr(v, "\r\n");
    if (!end) return NULL;
    while (end > v && (end[-1] == ' ' || end[-1] == '\t')) end--;
    // copy out so the block itself stays searchable
    static char val[128];
    size_t n = (size_t)(end - v) < sizeof val - 1 ? (size_t)(end - v) : sizeof val - 1;
    memcpy(val, v, n);
    val[n] = 0;
    return val;
  }
  return NULL;
}

static bool eq_nocase(const char *a, const char *b) {
  while (*a && *b) if (lower(*a++) != lower(*b++)) return false;
  return *a == *b;
}

// ---- frames

static void fail(ws_t *ws, int code, const char *why) {
  if (ws->state == WS_CLOSED) return;
  ws->state = WS_CLOSED;
  if (ws->c.on_close) ws->c.on_close(ws->c.user, code, why);
}

static int send_frame(ws_t *ws, uint8_t op, const uint8_t *p, size_t n) {
  if (ws->state != WS_OPEN && !(ws->state == WS_CLOSING && op == 0x8)) return -1;
  size_t h = 2;
  if (n > 125) h += n > 0xFFFF ? 8 : 2;
  if (h + 4 + n > WS_TX_MAX) { ws->st.tx_refused_big++; return -2; }
  uint8_t *f = ws->tx;
  f[0] = 0x80 | op;                                   // FIN, one frame per message
  if (n <= 125) f[1] = 0x80 | (uint8_t)n;             // MASK bit: RFC 6455 5.3, every client frame
  else if (n <= 0xFFFF) { f[1] = 0x80 | 126; f[2] = (uint8_t)(n >> 8); f[3] = (uint8_t)n; }
  else { f[1] = 0x80 | 127; for (int i = 0; i < 8; i++) f[2 + i] = (uint8_t)((uint64_t)n >> (56 - 8 * i)); }
  uint32_t m = ws->c.rand32(ws->c.io);
  uint8_t *mk = f + h;
  mk[0] = (uint8_t)(m >> 24); mk[1] = (uint8_t)(m >> 16); mk[2] = (uint8_t)(m >> 8); mk[3] = (uint8_t)m;
  for (size_t i = 0; i < n; i++) f[h + 4 + i] = p[i] ^ mk[i & 3];
  int r = ws->c.send(ws->c.io, f, h + 4 + n);
  if (r < 0) return r;
  ws->st.tx_frames++;
  ws->st.tx_bytes += h + 4 + n;
  return 0;
}

int ws_send_text(ws_t *ws, const char *s, size_t n) { return send_frame(ws, 0x1, (const uint8_t *)s, n); }
int ws_send_ping(ws_t *ws, const uint8_t *p, size_t n) { return n > 125 ? -2 : send_frame(ws, 0x9, p, n); }

int ws_close(ws_t *ws, uint16_t code) {
  if (ws->state != WS_OPEN) { ws->state = WS_CLOSED; return 0; }
  uint8_t b[2] = { (uint8_t)(code >> 8), (uint8_t)code };
  ws->state = WS_CLOSING;
  return send_frame(ws, 0x8, b, 2);
}

void ws_init(ws_t *ws, const ws_cfg_t *cfg) {
  memset(ws, 0, sizeof *ws);
  ws->c = *cfg;
  ws->state = WS_IDLE;
}

int ws_start(ws_t *ws) {
  uint8_t nonce[16];
  for (int i = 0; i < 16; i += 4) {
    uint32_t r = ws->c.rand32(ws->c.io);
    nonce[i] = (uint8_t)r; nonce[i + 1] = (uint8_t)(r >> 8); nonce[i + 2] = (uint8_t)(r >> 16); nonce[i + 3] = (uint8_t)(r >> 24);
  }
  b64(nonce, 16, ws->key);
  ws_accept_for(ws->key, ws->accept);
  // Reuses tx for the request: it is sent before any frame can be.
  char *q = (char *)ws->tx;
  size_t n = 0;
  const char *parts[] = { "GET ", ws->c.path, " HTTP/1.1\r\nHost: ", ws->c.host,
    "\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ", ws->key,
    "\r\nSec-WebSocket-Version: 13\r\nUser-Agent: positron-pico-net\r\n\r\n" };
  for (size_t i = 0; i < sizeof parts / sizeof *parts; i++) {
    size_t l = strlen(parts[i]);
    if (n + l >= WS_TX_MAX) return -2;
    memcpy(q + n, parts[i], l);
    n += l;
  }
  ws->state = WS_UPGRADING;
  return ws->c.send(ws->c.io, ws->tx, n);
}

static int upgrade_done(ws_t *ws) {
  char *h = ws->http;
  // "HTTP/1.1 101 ..."
  int status = 0;
  char *sp = strchr(h, ' ');
  if (sp) for (int i = 1; i <= 3 && sp[i] >= '0' && sp[i] <= '9'; i++) status = status * 10 + (sp[i] - '0');
  if (status != 101) { fail(ws, -status, "upgrade refused"); return -1; }
  char *up = header(h, "upgrade");
  if (!up || !eq_nocase(up, "websocket")) { fail(ws, 1002, "no Upgrade: websocket"); return -1; }
  char *acc = header(h, "sec-websocket-accept");
  if (!acc || strcmp(acc, ws->accept) != 0) { fail(ws, 1002, "Sec-WebSocket-Accept does not match"); return -1; }
  ws->state = WS_OPEN;
  ws->hn = 0; ws->hneed = 2;
  if (ws->c.on_open) ws->c.on_open(ws->c.user);
  return 0;
}

static void frame_end(ws_t *ws) {
  uint8_t op = ws->op;
  if (op & 0x8) {
    if (op == 0x9) { ws->st.rx_ping++; send_frame(ws, 0xA, ws->ctl, ws->ctln); }
    else if (op == 0xA) ws->st.rx_pong++;
    else if (op == 0x8) {
      int code = ws->ctln >= 2 ? (ws->ctl[0] << 8 | ws->ctl[1]) : 1005;
      if (ws->state == WS_OPEN) { ws->state = WS_CLOSING; uint8_t b[2] = { ws->ctl[0], ws->ctl[1] }; send_frame(ws, 0x8, b, ws->ctln >= 2 ? 2 : 0); }
      fail(ws, code, "closed by the server");
    }
  } else if (ws->fin) {
    if (ws->dropping) {
      if (ws->msg_op == 0x2) ws->st.rx_binary++;
      else ws->st.rx_dropped_big++;
    } else {
      ws->st.rx_text++;
      ws->rx[ws->msgn] = 0;
      if (ws->c.on_text) ws->c.on_text(ws->c.user, ws->rx, ws->msgn);
    }
    ws->msgn = 0;
    ws->dropping = false;
  }
  ws->hn = 0; ws->hneed = 2;
}

static int header_done(ws_t *ws) {
  uint8_t *h = ws->hdr;
  ws->fin = h[0] & 0x80;
  ws->op = h[0] & 0x0F;
  if (h[0] & 0x70) { fail(ws, 1002, "reserved bits set"); return -1; }
  if (h[1] & 0x80) { fail(ws, 1002, "server frames must not be masked"); return -1; }
  uint8_t l7 = h[1] & 0x7F;
  if (ws->hn == 2 && l7 >= 126) { ws->hneed = l7 == 126 ? 4 : 10; return 0; }   // more header to read
  if (l7 == 126) ws->plen = (uint64_t)h[2] << 8 | h[3];
  else if (l7 == 127) { ws->plen = 0; for (int i = 0; i < 8; i++) ws->plen = ws->plen << 8 | h[2 + i]; }
  else ws->plen = l7;
  ws->pgot = 0;
  ws->hneed = 0;                                  // reading payload now
  if (ws->op & 0x8) {
    if (ws->plen > 125 || !ws->fin) { fail(ws, 1002, "bad control frame"); return -1; }
    ws->ctln = 0;
  } else if (ws->op == 0x1 || ws->op == 0x2) {
    ws->msg_op = ws->op;
    ws->msgn = 0;
    ws->dropping = ws->op == 0x2;                 // binary is never kept: this node reads JSON
  } else if (ws->op != 0x0) { fail(ws, 1002, "unknown opcode"); return -1; }
  if (ws->plen == 0) frame_end(ws);
  return 0;
}

int ws_feed(ws_t *ws, const uint8_t *p, size_t n) {
  ws->st.rx_bytes += n;
  size_t i = 0;
  if (ws->state == WS_UPGRADING) {
    while (i < n) {
      if (ws->httpn >= WS_HTTP_MAX) { fail(ws, 1002, "upgrade response too long"); return -1; }
      ws->http[ws->httpn++] = (char)p[i++];
      ws->http[ws->httpn] = 0;
      if (ws->httpn >= 4 && memcmp(ws->http + ws->httpn - 4, "\r\n\r\n", 4) == 0) {
        if (upgrade_done(ws) < 0) return -1;
        break;
      }
    }
  }
  while (i < n && (ws->state == WS_OPEN || ws->state == WS_CLOSING)) {
    if (ws->hneed) {
      ws->hdr[ws->hn++] = p[i++];
      if (ws->hn == ws->hneed && header_done(ws) < 0) return -1;
      continue;
    }
    size_t take = (size_t)(ws->plen - ws->pgot);
    if (take > n - i) take = n - i;
    if (ws->op & 0x8) {
      memcpy(ws->ctl + ws->ctln, p + i, take);
      ws->ctln += (uint8_t)take;
    } else if (!ws->dropping) {
      if (ws->msgn + take > WS_RX_MAX) ws->dropping = true;   // too long: read past it, count it at the end
      else { memcpy(ws->rx + ws->msgn, p + i, take); ws->msgn += take; }
    }
    ws->pgot += take;
    i += take;
    if (ws->pgot == ws->plen) frame_end(ws);
  }
  return ws->state == WS_CLOSED ? -1 : 0;
}
