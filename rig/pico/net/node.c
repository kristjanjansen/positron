// rig/pico/net/node.c: the node protocol. See node.h.
#include "node.h"
#include <stdio.h>
#include <string.h>

#define JSMN_STATIC
#define JSMN_STRICT
#include "vendor/jsmn.h"

_Static_assert(sizeof(jsmntok_t) == 16, "node_t.tok is sized for 16 byte jsmn tokens");

#define TOK(n) ((jsmntok_t *)(n)->tok)

static void logf_(node_t *n, const char *fmt, ...) __attribute__((format(printf, 2, 3)));
#include <stdarg.h>
static void logf_(node_t *n, const char *fmt, ...) {
  if (!n->c.log) return;
  char line[200];
  va_list ap;
  va_start(ap, fmt);
  vsnprintf(line, sizeof line, fmt, ap);
  va_end(ap);
  n->c.log(n->c.user, line);
}

static bool id_ok(const char *s, size_t len) {
  if (!len || len > 40) return false;
  for (size_t i = 0; i < len; i++) {
    char c = s[i];
    if (!((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' || c == '_' || c == ':')) return false;
  }
  return true;
}

// The whole graph, rendered once. Nothing in it comes from a message.
int node_init(node_t *n, const node_cfg_t *cfg, ws_t *ws) {
  memset(n, 0, sizeof *n);
  n->c = *cfg;
  n->ws = ws;
  if (!id_ok(cfg->site, strlen(cfg->site)) || strchr(cfg->site, ':') || !id_ok(cfg->place, strlen(cfg->place))) return -1;
  const char *s = cfg->site, *p = cfg->place;
  int w = snprintf(n->graph, sizeof n->graph,
    "\"graph\":{\"v\":1,\"site\":\"%s\",\"place\":\"%s\","
    "\"nodes\":["
      "{\"id\":\"%s:din\",\"kind\":\"device\",\"label\":\"Pico DIN\",\"place\":\"%s\"},"
      "{\"id\":\"%s:led\",\"kind\":\"device\",\"label\":\"Pico light\",\"place\":\"%s\"}],"
    "\"ports\":["
      "{\"id\":\"%s:din:in\",\"label\":\"Pico DIN in\",\"dir\":\"out\",\"medium\":\"midi\",\"emits\":[\"note\",\"cc\",\"clock\"]},"
      "{\"id\":\"%s:din:out\",\"label\":\"Pico DIN out\",\"dir\":\"in\",\"medium\":\"midi\",\"accepts\":[\"note\",\"cc\",\"program\",\"sysex\"]},"
      "{\"id\":\"%s:led:light\",\"label\":\"Pico light\",\"dir\":\"in\",\"medium\":\"value\",\"shape\":{\"channels\":3}}]},",
    s, p, s, p, s, p, s, s, s);
  if (w < 0 || (size_t)w >= sizeof n->graph) return -2;
  n->graphn = (size_t)w;
  return 0;
}

static void rand_id(node_t *n, char *out, int len) {
  static const char A[] = "0123456789abcdefghijklmnopqrstuvwxyz";
  for (int i = 0; i < len; i++) out[i] = A[n->ws->c.rand32(n->ws->c.io) % 36];
  out[len] = 0;
}

int node_send(node_t *n, const char *type, const char *body) {
  if (!n->open) return -1;
  char id[17];
  rand_id(n, id, 16);
  uint64_t at = n->c.now_ms ? n->c.now_ms(n->c.user) : 0;
  int w = snprintf(n->out, sizeof n->out, "{\"id\":\"%s\",\"type\":\"%s\",%s\"from\":\"%s\",\"at\":%llu,\"seq\":%lu%s%s%s}",
                   id, type, body, n->from, (unsigned long long)at, (unsigned long)n->seq,
                   n->c.by ? ",\"by\":\"" : "", n->c.by ? n->c.by : "", n->c.by ? "\"" : "");
  if (w < 0 || (size_t)w >= sizeof n->out) return -2;
  n->seq++;                                   // advances even on a refusal, as wire.mjs's does
  return ws_send_text(n->ws, n->out, (size_t)w);
}

int node_announce(node_t *n) {
  n->last_announce = n->now;
  n->st.announced++;
  return node_send(n, "graph.announce", n->graph);
}

void node_on_open(void *v) {
  node_t *n = v;
  rand_id(n, n->from, 6);
  n->seq = 0;
  n->open = true;
  n->last_rx = n->last_ping = n->now;
  logf_(n, "open as %s, announcing %s", n->from, n->c.site);
  node_announce(n);
}

// ---- reading

static bool tok_is(const char *js, const jsmntok_t *t, const char *s) {
  size_t l = strlen(s);
  return t->type == JSMN_STRING && (size_t)(t->end - t->start) == l && memcmp(js + t->start, s, l) == 0;
}

// Index of the token after this one and everything inside it.
static int skip(const jsmntok_t *t, int i, int count) {
  int todo = 1;
  while (todo > 0 && i < count) {
    todo += (t[i].type == JSMN_OBJECT) ? 2 * t[i].size : (t[i].type == JSMN_ARRAY ? t[i].size : 0);
    todo--;
    i++;
  }
  return i;
}

// The value token of a key in the object at index `obj`, or -1.
static int member(const char *js, const jsmntok_t *t, int count, int obj, const char *key) {
  if (obj < 0 || t[obj].type != JSMN_OBJECT) return -1;
  int i = obj + 1;
  for (int k = 0; k < t[obj].size && i < count; k++) {
    int v = i + 1;
    if (tok_is(js, &t[i], key)) return v;
    i = skip(t, v, count);
  }
  return -1;
}

// A plain string with no escapes, or NULL.
static const char *str(const char *js, const jsmntok_t *t, int i, size_t *len) {
  if (i < 0 || t[i].type != JSMN_STRING) return NULL;
  *len = (size_t)(t[i].end - t[i].start);
  if (memchr(js + t[i].start, '\\', *len)) return NULL;
  return js + t[i].start;
}

static int hexv(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  return -1;
}

int node_hex(const char *s, size_t len, node_rgb_t *out) {
  if (!s || len != 7 || s[0] != '#') return -1;
  uint8_t v[3];
  for (int i = 0; i < 3; i++) {
    int a = hexv(s[1 + 2 * i]), b = hexv(s[2 + 2 * i]);
    if (a < 0 || b < 0) return -1;
    v[i] = (uint8_t)(a << 4 | b);
  }
  out->r = v[0]; out->g = v[1]; out->b = v[2];
  return 0;
}

// A number in [0, 1] as thousandths, without strtod: "0", "1", "0.25", ".5", "1.0".
static int unit(const char *js, const jsmntok_t *t, int i) {
  if (i < 0 || t[i].type != JSMN_PRIMITIVE) return -1;
  const char *s = js + t[i].start, *e = js + t[i].end;
  int whole = 0, frac = 0, scale = 1000;
  while (s < e && *s >= '0' && *s <= '9') whole = whole * 10 + (*s++ - '0');
  if (s < e && *s == '.') {
    s++;
    while (s < e && *s >= '0' && *s <= '9') { scale /= 10; frac += (*s++ - '0') * scale; if (!scale) { while (s < e && *s >= '0' && *s <= '9') s++; break; } }
  }
  if (s != e || whole > 1) return -1;
  int v = whole * 1000 + frac;
  return v > 1000 ? -1 : v;
}

// An unsigned integer, or -1.
static long uint_of(const char *js, const jsmntok_t *t, int i) {
  if (i < 0 || t[i].type != JSMN_PRIMITIVE) return -1;
  long v = 0;
  for (int k = t[i].start; k < t[i].end; k++) {
    if (js[k] < '0' || js[k] > '9' || v > 100000000) return -1;
    v = v * 10 + (js[k] - '0');
  }
  return v;
}

static void on_light(node_t *n, const char *js, const jsmntok_t *t, int count) {
  size_t l = 0;
  const char *hx = str(js, t, member(js, t, count, 0, "hex"), &l);
  node_light_t L;
  memset(&L, 0, sizeof L);
  if (node_hex(hx, l, &L.hex) < 0) { n->st.ignored++; logf_(n, "light.set without a #rrggbb, ignored"); return; }
  int parts = member(js, t, count, 0, "parts");
  if (parts >= 0 && t[parts].type == JSMN_ARRAY) {
    int i = parts + 1;
    for (int k = 0; k < t[parts].size && i < count; k++) {
      int o = i;
      i = skip(t, o, count);
      if (L.nparts >= NODE_PARTS) continue;
      const char *ph = str(js, t, member(js, t, count, o, "hex"), &l);
      int ac = member(js, t, count, o, "across");
      if (node_hex(ph, l, &L.part[L.nparts].hex) < 0 || ac < 0 || t[ac].type != JSMN_ARRAY || t[ac].size != 2) continue;
      int a = unit(js, t, ac + 1), b = unit(js, t, ac + 2);
      if (a < 0 || b < 0 || b < a) continue;
      L.part[L.nparts].a = (uint16_t)a;
      L.part[L.nparts].b = (uint16_t)b;
      L.nparts++;
    }
  }
  n->light = L;
  n->st.lights++;
  char line[160];
  int w = snprintf(line, sizeof line, "LIGHT #%02x%02x%02x parts=%u", L.hex.r, L.hex.g, L.hex.b, L.nparts);
  for (int k = 0; k < L.nparts && w > 0 && (size_t)w < sizeof line - 24; k++)
    w += snprintf(line + w, sizeof line - (size_t)w, " #%02x%02x%02x@%u-%u", L.part[k].hex.r, L.part[k].hex.g, L.part[k].hex.b, L.part[k].a, L.part[k].b);
  if (n->c.log) n->c.log(n->c.user, line);
  if (n->c.on_light) n->c.on_light(n->c.user, &n->light);
}

void node_on_text(void *v, char *js, size_t len) {
  node_t *n = v;
  n->last_rx = n->now;
  if (len == 4 && memcmp(js, "pong", 4) == 0) { n->st.pongs_relay++; if (n->c.on_other) n->c.on_other(n->c.user, "pong", js, len); return; }
  jsmn_parser p;
  jsmn_init(&p);
  jsmntok_t *t = TOK(n);
  int count = jsmn_parse(&p, js, len, t, NODE_TOKENS);
  if (count == JSMN_ERROR_NOMEM) { n->st.too_many_tokens++; return; }
  if (count < 1 || t[0].type != JSMN_OBJECT) { n->st.unreadable++; return; }
  size_t tl = 0, fl = 0, tol = 0;
  const char *type = str(js, t, member(js, t, count, 0, "type"), &tl);
  const char *from = str(js, t, member(js, t, count, 0, "from"), &fl);
  const char *to = str(js, t, member(js, t, count, 0, "to"), &tol);
  if (!type) { n->st.unreadable++; return; }
  if (from && fl == strlen(n->from) && memcmp(from, n->from, fl) == 0) {
    // The relay sends every message back to its sender too. It is the cheapest
    // proof the room heard us, and it is never acted on.
    n->st.echoes++;
    char ty[32];
    size_t k = tl < sizeof ty - 1 ? tl : sizeof ty - 1;
    memcpy(ty, type, k); ty[k] = 0;
    char key[40];
    snprintf(key, sizeof key, "echo:%s", ty);
    if (n->c.on_other) n->c.on_other(n->c.user, key, js, len);
    return;
  }
  char site_port[64];
  snprintf(site_port, sizeof site_port, "%s:led:light", n->c.site);
#define IS(s) (tl == sizeof(s) - 1 && memcmp(type, s, tl) == 0)
#define TO(s) (to && tol == strlen(s) && memcmp(to, s, tol) == 0)
  if (IS("graph.ask")) {
    n->st.asked++;
    logf_(n, "graph.ask, announcing again");
    node_announce(n);
  } else if (IS("light.set")) {
    if (TO(site_port)) on_light(n, js, t, count);
  } else if (IS("node.ping")) {
    if (!TO(n->c.site)) return;
    long k = uint_of(js, t, member(js, t, count, 0, "n"));
    if (!from || !id_ok(from, fl) || k < 0) { n->st.ignored++; return; }
    char body[96];
    snprintf(body, sizeof body, "\"to\":\"%.*s\",\"n\":%ld,", (int)fl, from, k);
    n->st.pings++;
    node_send(n, "node.pong", body);
  } else if (n->c.on_other) {
    char ty[32];
    size_t k = tl < sizeof ty - 1 ? tl : sizeof ty - 1;
    memcpy(ty, type, k); ty[k] = 0;
    n->c.on_other(n->c.user, ty, js, len);
  }
#undef IS
#undef TO
}

int node_tick(node_t *n, uint32_t mono_ms) {
  n->now = mono_ms;
  if (!n->open) return 0;
  if (n->ws->state != WS_OPEN) { n->open = false; return -1; }
  if (mono_ms - n->last_rx > NODE_DEAD_MS) { logf_(n, "nothing heard for %u ms, the link is dead", (unsigned)(mono_ms - n->last_rx)); n->open = false; return -1; }
  if (mono_ms - n->last_announce >= NODE_ANNOUNCE_MS) node_announce(n);
  if (mono_ms - n->last_ping >= NODE_PING_MS) { n->last_ping = mono_ms; ws_send_text(n->ws, "ping", 4); }
  return 0;
}
