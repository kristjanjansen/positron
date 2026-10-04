// rig/pico/net/linux/main.c: the node's ws.c and node.c, on Linux, against the
// real relay. The test of the board's network code before the board exists.
//
//   node-linux <ws://... | wss://...> --site pico-xxxxxx [--seconds 120]
//   node-linux --selftest
//
// Runs ONLY in Docker (rig/pico/net/test.mjs builds and starts it). The TLS
// side is mbedTLS 3.6.2 from the pico-sdk 2.2.0 submodule, compiled with the
// node's own positron_mbedtls_config.h, so the ciphersuites, curves, record sizes and
// arena are the Pico's. What is NOT the Pico's: a 64 bit CPU at GHz speed, a
// kernel TCP stack, and wired Ethernet behind Docker Desktop. Handshake times
// from here say nothing about the RP2350.
//
// Test verbs it adds on top of node.c (on_other), aimed at its own site:
//   test.probe   run 100 relay pings and 100 room echoes from HERE, then
//                send test.probed with the numbers
//   test.done    close with 1000 and exit 0
#define _GNU_SOURCE
#include <errno.h>
#include <netdb.h>
#include <poll.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/random.h>
#include <sys/socket.h>
#include <time.h>
#include <unistd.h>

#include "mbedtls/ctr_drbg.h"
#include "mbedtls/debug.h"
#include "mbedtls/entropy.h"
#include "mbedtls/error.h"
#include "mbedtls/memory_buffer_alloc.h"
#include "mbedtls/ssl.h"
#include "mbedtls/x509_crt.h"
#include "psa/crypto.h"

#include "../gts_root_r4.h"
#include "../node.h"
#include "../ws.h"

static double t0;
static double now_s(void) { struct timespec ts; clock_gettime(CLOCK_MONOTONIC, &ts); return ts.tv_sec + ts.tv_nsec / 1e9; }
static double ms(void) { return (now_s() - t0) * 1000.0; }
static uint64_t epoch_ms(void *u) { (void)u; struct timespec ts; clock_gettime(CLOCK_REALTIME, &ts); return (uint64_t)ts.tv_sec * 1000 + (uint64_t)ts.tv_nsec / 1000000; }
#define say(...) do { printf("%8.1f ", ms()); printf(__VA_ARGS__); printf("\n"); fflush(stdout); } while (0)

// ---- transport: a socket, with or without TLS
static int fd = -1;
static int tls = 0;
static mbedtls_ssl_context ssl;
static unsigned char arena[96 * 1024];

static int io_send(void *io, const uint8_t *p, size_t n) {
  (void)io;
  while (n) {
    int r = tls ? mbedtls_ssl_write(&ssl, p, n) : (int)send(fd, p, n, MSG_NOSIGNAL);
    if (tls && (r == MBEDTLS_ERR_SSL_WANT_WRITE || r == MBEDTLS_ERR_SSL_WANT_READ)) continue;
    if (r <= 0) return -1;
    p += r; n -= (size_t)r;
  }
  return 0;
}
static uint32_t io_rand(void *io) { (void)io; uint32_t v; if (getrandom(&v, sizeof v, 0) != sizeof v) abort(); return v; }
static void dbg(void *c, int level, const char *file, int line, const char *msg) { (void)c; printf("tls%d %s:%d %s", level, file, line, msg); }
static int bio_send(void *c, const unsigned char *p, size_t n) { (void)c; int r = (int)send(fd, p, n, MSG_NOSIGNAL); return r < 0 ? MBEDTLS_ERR_SSL_INTERNAL_ERROR : r; }
static int bio_recv(void *c, unsigned char *p, size_t n) { (void)c; int r = (int)recv(fd, p, n, 0); return r < 0 ? MBEDTLS_ERR_SSL_INTERNAL_ERROR : r == 0 ? MBEDTLS_ERR_SSL_CONN_EOF : r; }

// ---- stack depth: paint below the current frame, run, see how far down it was written
#define PAINT (256 * 1024)
static uintptr_t paint_lo;              // an address, deliberately outliving the frame it was taken in
__attribute__((noinline)) static void stack_paint(void) {
  volatile uint8_t b[PAINT];
  for (size_t i = 0; i < PAINT; i++) b[i] = 0xA5;
  paint_lo = (uintptr_t)b;
}
__attribute__((noinline)) static size_t stack_used(void) {
  size_t i = 0;
  const volatile uint8_t *p = (const volatile uint8_t *)paint_lo;
  while (i < PAINT && p[i] == 0xA5) i++;
  return PAINT - i;                    // bytes written below the painted top
}

// ---- the node
static ws_t ws;
static node_t node;
static int closed = 0, done = 0;
static double opened_at = 0, upgrade_sent_at = 0;

static void on_log(void *u, const char *line) { (void)u; say("%s", line); }
static void on_open(void *u) { opened_at = ms(); say("ws open, upgrade took %.1f ms", opened_at - upgrade_sent_at); node_on_open(u); }
static void on_close(void *u, int code, const char *why) { (void)u; closed = 1; say("ws closed %d (%s)", code, why); }

// ---- probes from this side
#define PROBES 100
static int probe_phase = 0, probe_i = 0;
static double probe_t, rtt_relay[PROBES], rtt_echo[PROBES];
static int lost_relay = 0, lost_echo = 0;

static void probe_next(void) {
  node.last_ping = node.now;                     // keep node.c's own 20 s ping out of phase 1
  probe_t = ms();
  if (probe_phase == 1) ws_send_text(&ws, "ping", 4);
  else { char b[32]; snprintf(b, sizeof b, "\"n\":%d,", probe_i); node_send(&node, "node.probe", b); }
}
static int cmp(const void *a, const void *b) { double x = *(const double *)a, y = *(const double *)b; return x < y ? -1 : x > y; }
static void pct(double *v, int n, double *p50, double *p99, double *mx) {
  qsort(v, (size_t)n, sizeof *v, cmp);
  *p50 = n ? v[n / 2] : -1; *p99 = n ? v[(n * 99 + 99) / 100 - 1] : -1; *mx = n ? v[n - 1] : -1;
}
static void probe_got(double *arr) {
  arr[probe_i++] = ms() - probe_t;
  if (probe_i < PROBES) { probe_next(); return; }
  if (probe_phase == 1) { probe_phase = 2; probe_i = 0; probe_next(); return; }
  probe_phase = 0;
  double a50, a99, amx, b50, b99, bmx;
  pct(rtt_relay, PROBES, &a50, &a99, &amx);
  pct(rtt_echo, PROBES, &b50, &b99, &bmx);
  say("PROBE relay ping->pong (runtime, room not woken) n=%d p50=%.1f p99=%.1f max=%.1f lost=%d", PROBES, a50, a99, amx, lost_relay);
  say("PROBE room echo of own message (through the room object) n=%d p50=%.1f p99=%.1f max=%.1f lost=%d", PROBES, b50, b99, bmx, lost_echo);
  char body[200];
  snprintf(body, sizeof body, "\"relay\":{\"p50\":%.1f,\"p99\":%.1f,\"max\":%.1f},\"echo\":{\"p50\":%.1f,\"p99\":%.1f,\"max\":%.1f},", a50, a99, amx, b50, b99, bmx);
  node_send(&node, "test.probed", body);
}
static void probe_timeout(void) {
  if (!probe_phase || ms() - probe_t < 3000) return;
  if (probe_phase == 1) { lost_relay++; probe_got(rtt_relay); } else { lost_echo++; probe_got(rtt_echo); }
}

static void on_other(void *u, const char *type, char *msg, size_t n) {
  (void)u; (void)n;
  if (!strcmp(type, "pong")) { if (probe_phase == 1) probe_got(rtt_relay); return; }
  if (!strcmp(type, "echo:node.probe")) { if (probe_phase == 2) probe_got(rtt_echo); return; }
  if (!strncmp(type, "echo:", 5)) return;
  char to[80];
  snprintf(to, sizeof to, "\"to\":\"%s\"", node.c.site);
  if (!strstr(msg, to)) return;
  if (!strcmp(type, "test.probe")) { say("test.probe: %d relay pings, then %d room echoes", PROBES, PROBES); probe_phase = 1; probe_i = 0; lost_relay = lost_echo = 0; probe_next(); }
  else if (!strcmp(type, "test.done")) { say("test.done"); done = 1; }
}

// ---- self test, no network
static int selftest_out_n;
static uint8_t selftest_out[4096];
static int st_send(void *io, const uint8_t *p, size_t n) { (void)io; memcpy(selftest_out, p, n); selftest_out_n = (int)n; return 0; }
static uint32_t st_rand(void *io) { (void)io; return 0x01020304; }
static char st_last[WS_RX_MAX + 1];
static int st_texts = 0, st_closed_code = 0;
static void st_text(void *u, char *m, size_t n) { (void)u; memcpy(st_last, m, n + 1); st_texts++; }
static void st_close(void *u, int c, const char *w) { (void)u; (void)w; st_closed_code = c; }
static int fails = 0;
#define CHECK(c, what) do { if (c) printf("PASS %s\n", what); else { printf("FAIL %s\n", what); fails++; } } while (0)

static void st_open_ws(ws_t *w) {
  ws_cfg_t c = { .host = "h", .path = "/p", .send = st_send, .rand32 = st_rand, .on_text = st_text, .on_close = st_close };
  ws_init(w, &c);
  ws_start(w);
  char resp[256];
  snprintf(resp, sizeof resp, "HTTP/1.1 101 Switching Protocols\r\nupgrade: WebSocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: %s\r\n\r\n", w->accept);
  ws_feed(w, (const uint8_t *)resp, strlen(resp));
}

static int selftest(void) {
  char acc[29];
  ws_accept_for("dGhlIHNhbXBsZSBub25jZQ==", acc);
  CHECK(!strcmp(acc, "s3pPLMBiTxaQ9kYGzzhZRbK+xOo="), "Sec-WebSocket-Accept matches RFC 6455's own example");

  static ws_t w;
  st_open_ws(&w);
  CHECK(w.state == WS_OPEN, "a 101 with the right accept opens");
  CHECK(strstr((char *)w.tx, "Sec-WebSocket-Version: 13") != NULL, "the upgrade asks for version 13");

  // a text frame split into two fragments, fed one byte at a time
  const uint8_t frag[] = { 0x01, 3, 'a', 'b', 'c', 0x80, 2, 'd', 'e' };
  for (size_t i = 0; i < sizeof frag; i++) ws_feed(&w, frag + i, 1);
  CHECK(st_texts == 1 && !strcmp(st_last, "abcde"), "fragments are reassembled, byte by byte");

  // 16 bit length
  static uint8_t big[4 + 300];
  big[0] = 0x81; big[1] = 126; big[2] = 300 >> 8; big[3] = 300 & 0xff;
  memset(big + 4, 'x', 300);
  ws_feed(&w, big, sizeof big);
  CHECK(st_texts == 2 && strlen(st_last) == 300, "a 300 byte text with a 16 bit length");

  // too long: dropped and counted, and the stream stays in sync
  static uint8_t huge[10 + WS_RX_MAX + 10];
  size_t hl = WS_RX_MAX + 10;
  huge[0] = 0x81; huge[1] = 127; for (int i = 0; i < 8; i++) huge[2 + i] = (uint8_t)((uint64_t)hl >> (56 - 8 * i));
  memset(huge + 10, 'y', hl);
  ws_feed(&w, huge, 10 + hl);
  const uint8_t after[] = { 0x81, 2, 'o', 'k' };
  ws_feed(&w, after, sizeof after);
  CHECK(w.st.rx_dropped_big == 1 && st_texts == 3 && !strcmp(st_last, "ok"), "a text over WS_RX_MAX is read past and counted, the next one arrives");

  // binary is never kept
  const uint8_t bin[] = { 0x82, 3, 1, 2, 3 };
  ws_feed(&w, bin, sizeof bin);
  CHECK(w.st.rx_binary == 1 && st_texts == 3, "binary is counted and not delivered");

  // ping in the middle of a fragmented message gets a masked pong with the same payload
  const uint8_t mid[] = { 0x01, 1, 'A', 0x89, 2, 'h', 'i', 0x80, 1, 'B' };
  ws_feed(&w, mid, sizeof mid);
  uint8_t *o = selftest_out;
  int pong_ok = selftest_out_n == 2 + 4 + 2 && o[0] == 0x8A && o[1] == (0x80 | 2) && (o[6] ^ o[2]) == 'h' && (o[7] ^ o[3]) == 'i';
  CHECK(pong_ok && !strcmp(st_last, "AB"), "a ping between fragments is answered with a masked pong, the message survives");

  // our own frames are masked
  ws_send_text(&w, "hey", 3);
  CHECK(o[0] == 0x81 && o[1] == (0x80 | 3) && (o[6] ^ o[2]) == 'h' && (o[8] ^ o[4]) == 'y', "client text frames carry FIN, MASK and a masked payload");

  // a server frame with the mask bit is a protocol error
  static ws_t w2;
  st_open_ws(&w2);
  const uint8_t masked[] = { 0x81, 0x81, 0, 0, 0, 0, 'x' };
  ws_feed(&w2, masked, sizeof masked);
  CHECK(w2.state == WS_CLOSED && st_closed_code == 1002, "a masked server frame closes with 1002");

  // close is echoed
  static ws_t w3;
  st_open_ws(&w3);
  const uint8_t cl[] = { 0x88, 2, 0x03, 0xE8 };
  ws_feed(&w3, cl, sizeof cl);
  CHECK(w3.state == WS_CLOSED && st_closed_code == 1000 && selftest_out[0] == 0x88, "a server close is answered with a close and reported as 1000");

  // a refused upgrade reports the status
  static ws_t w4;
  ws_cfg_t c = { .host = "h", .path = "/p", .send = st_send, .rand32 = st_rand, .on_close = st_close };
  ws_init(&w4, &c);
  ws_start(&w4);
  const char *r503 = "HTTP/1.1 503 Service Unavailable\r\ncontent-length: 0\r\n\r\n";
  ws_feed(&w4, (const uint8_t *)r503, strlen(r503));
  CHECK(st_closed_code == -503, "a 503 upgrade (the relay's 'room full') is reported as -503");

  // a wrong accept is refused
  static ws_t w5;
  ws_init(&w5, &c);
  ws_start(&w5);
  const char *bad = "HTTP/1.1 101 OK\r\nUpgrade: websocket\r\nSec-WebSocket-Accept: AAAAAAAAAAAAAAAAAAAAAAAAAAA=\r\n\r\n";
  ws_feed(&w5, (const uint8_t *)bad, strlen(bad));
  CHECK(w5.state == WS_CLOSED, "a wrong Sec-WebSocket-Accept is refused");

  // node.c over a fake socket
  static ws_t wn;
  static node_t nd;
  ws_cfg_t cn = { .host = "h", .path = "/p", .send = st_send, .rand32 = st_rand, .on_open = node_on_open, .on_text = node_on_text, .on_close = st_close, .user = &nd };
  ws_init(&wn, &cn);
  node_cfg_t ncf = { .site = "pico-abc123", .place = "studio-1" };
  CHECK(node_init(&nd, &ncf, &wn) == 0, "node_init builds the graph");
  node_cfg_t badc = { .site = "pico\"x", .place = "studio-1" };
  static node_t nb;
  CHECK(node_init(&nb, &badc, &wn) < 0, "a site with a quote in it is refused");
  ws_start(&wn);
  char resp[256];
  snprintf(resp, sizeof resp, "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nSec-WebSocket-Accept: %s\r\n\r\n", wn.accept);
  ws_feed(&wn, (const uint8_t *)resp, strlen(resp));
  CHECK(nd.st.announced == 1, "open sends graph.announce");
  const char *lit = "{\"id\":\"q\",\"type\":\"light.set\",\"to\":\"pico-abc123:led:light\",\"hex\":\"#FF8000\",\"parts\":[{\"hex\":\"#0000ff\",\"across\":[0.2,0.4]},{\"hex\":\"#zz0000\",\"across\":[0,1]},{\"hex\":\"#00ff00\",\"across\":[0.5,1]}],\"from\":\"pagexx\",\"sent\":1,\"seq\":3}";
  char buf[512];
  strcpy(buf, lit);
  node_on_text(&nd, buf, strlen(buf));
  node_light_t *L = &nd.light;
  CHECK(nd.st.lights == 1 && L->hex.r == 0xff && L->hex.g == 0x80 && L->hex.b == 0 && L->nparts == 2 && L->part[0].a == 200 && L->part[0].b == 400 && L->part[1].hex.g == 0xff && L->part[1].b == 1000,
        "light.set: colour, two good parts kept, the bad one skipped, across in thousandths");
  strcpy(buf, "{\"type\":\"light.set\",\"to\":\"pico-other:led:light\",\"hex\":\"#000000\",\"from\":\"p\"}");
  node_on_text(&nd, buf, strlen(buf));
  CHECK(nd.st.lights == 1, "light.set to another port is not ours");
  strcpy(buf, "{\"type\":\"graph.ask\",\"from\":\"p\"}");
  node_on_text(&nd, buf, strlen(buf));
  CHECK(nd.st.announced == 2, "graph.ask announces again");
  strcpy(buf, "{\"type\":\"node.ping\",\"to\":\"pico-abc123\",\"n\":42,\"from\":\"macabc\"}");
  node_on_text(&nd, buf, strlen(buf));
  // unmask what went out
  int h = 2 + ((selftest_out[1] & 0x7f) == 126 ? 2 : 0);
  char outp[600]; int on = selftest_out_n - h - 4;
  for (int i = 0; i < on; i++) outp[i] = (char)(selftest_out[h + 4 + i] ^ selftest_out[h + (i & 3)]);
  outp[on] = 0;
  CHECK(strstr(outp, "\"type\":\"node.pong\",\"to\":\"macabc\",\"n\":42,") != NULL, "node.ping is answered with node.pong to the sender with its n");
  char own[200];
  snprintf(own, sizeof own, "{\"type\":\"graph.ask\",\"from\":\"%s\"}", nd.from);
  node_on_text(&nd, own, strlen(own));
  CHECK(nd.st.asked == 1 && nd.st.echoes == 1, "our own echo is never acted on");
  strcpy(buf, "{\"type\":\"graph.ask\",\"from\":\"p\",\"x\":\"a\\\"b\"}");
  node_on_text(&nd, buf, strlen(buf));
  CHECK(nd.st.asked == 2, "an escaped string elsewhere does not stop the type being read");
  strcpy(buf, "{\"type\":\"graph.ask\",");
  node_on_text(&nd, buf, strlen(buf));
  CHECK(nd.st.unreadable == 1, "a truncated message is unreadable, not a crash");
  printf("selftest: %d failed\n", fails);
  return fails ? 1 : 0;
}

// ---- main
int main(int argc, char **argv) {
  t0 = now_s();
  setvbuf(stdout, NULL, _IOLBF, 0);
  if (argc > 1 && !strcmp(argv[1], "--selftest")) return selftest();
  const char *url = NULL, *site = NULL;
  int seconds = 120;
  for (int i = 1; i < argc; i++) {
    if (!strcmp(argv[i], "--site") && i + 1 < argc) site = argv[++i];
    else if (!strcmp(argv[i], "--seconds") && i + 1 < argc) seconds = atoi(argv[++i]);
    else url = argv[i];
  }
  if (!url || !site) { fprintf(stderr, "usage: node-linux <ws[s]://host/path> --site pico-xxxxxx [--seconds n]\n"); return 2; }
  tls = !strncmp(url, "wss://", 6);
  const char *hp = url + (tls ? 6 : 5);
  char host[128], path[256], port[8];
  const char *slash = strchr(hp, '/');
  snprintf(host, sizeof host, "%.*s", (int)(slash ? slash - hp : (long)strlen(hp)), hp);
  snprintf(path, sizeof path, "%s", slash ? slash : "/");
  snprintf(port, sizeof port, "%s", tls ? "443" : "80");
  say("%s to %s%s, site %s, TLS_IN %d, WS_RX_MAX %d", tls ? "wss" : "ws", host, path, site, MBEDTLS_SSL_IN_CONTENT_LEN, WS_RX_MAX);

  double a = ms();
  struct addrinfo hints = { .ai_family = AF_INET, .ai_socktype = SOCK_STREAM }, *ai;
  if (getaddrinfo(host, port, &hints, &ai)) { say("DNS failed"); return 1; }
  double b = ms();
  fd = socket(ai->ai_family, ai->ai_socktype, 0);
  if (connect(fd, ai->ai_addr, ai->ai_addrlen)) { say("connect failed: %s", strerror(errno)); return 1; }
  double c = ms();
  say("TIME dns %.1f ms, tcp connect %.1f ms", b - a, c - b);
  freeaddrinfo(ai);

  mbedtls_memory_buffer_alloc_init(arena, sizeof arena);
  static mbedtls_ssl_config conf;
  static mbedtls_x509_crt ca;
  static mbedtls_entropy_context ent;
  static mbedtls_ctr_drbg_context drbg;
  if (tls) {
    psa_status_t ps = psa_crypto_init();
    if (ps != PSA_SUCCESS) { say("psa_crypto_init %d", (int)ps); return 1; }
    mbedtls_entropy_init(&ent);
    mbedtls_ctr_drbg_init(&drbg);
    mbedtls_ctr_drbg_seed(&drbg, mbedtls_entropy_func, &ent, (const unsigned char *)"positron", 8);
    mbedtls_x509_crt_init(&ca);
    int r = mbedtls_x509_crt_parse(&ca, (const unsigned char *)GTS_ROOT_R4_PEM, sizeof GTS_ROOT_R4_PEM);
    if (r) { say("CA parse %d", r); return 1; }
    mbedtls_ssl_config_init(&conf);
    mbedtls_ssl_config_defaults(&conf, MBEDTLS_SSL_IS_CLIENT, MBEDTLS_SSL_TRANSPORT_STREAM, MBEDTLS_SSL_PRESET_DEFAULT);
    mbedtls_ssl_conf_authmode(&conf, MBEDTLS_SSL_VERIFY_REQUIRED);
    mbedtls_ssl_conf_ca_chain(&conf, &ca, NULL);
    mbedtls_ssl_conf_rng(&conf, mbedtls_ctr_drbg_random, &drbg);
    // Groups and ciphersuites are mbedTLS's defaults filtered by the config,
    // exactly what altcp_tls_create_config_client() gives the Pico.
    if (getenv("TLS_DEBUG")) { mbedtls_debug_set_threshold(atoi(getenv("TLS_DEBUG"))); mbedtls_ssl_conf_dbg(&conf, dbg, NULL); }
    mbedtls_ssl_init(&ssl);
    if ((r = mbedtls_ssl_setup(&ssl, &conf))) { say("ssl_setup %d", r); return 1; }
    mbedtls_ssl_set_hostname(&ssl, host);
    mbedtls_ssl_set_bio(&ssl, NULL, bio_send, bio_recv, NULL);
    size_t cur, blk;
    mbedtls_memory_buffer_alloc_cur_get(&cur, &blk);
    say("ARENA before handshake %zu bytes in %zu blocks", cur, blk);
    stack_paint();
    double h0 = ms();
    while ((r = mbedtls_ssl_handshake(&ssl))) {
      if (r == MBEDTLS_ERR_SSL_WANT_READ || r == MBEDTLS_ERR_SSL_WANT_WRITE) continue;
      char e[120];
      mbedtls_strerror(r, e, sizeof e);
      say("TLS handshake FAILED -0x%04x %s, verify flags 0x%x", -r, e, mbedtls_ssl_get_verify_result(&ssl));
      return 1;
    }
    double h1 = ms();
    say("TIME tls handshake %.1f ms, %s %s, certificate verified against the pinned GTS Root R4 (flags 0x%x)",
        h1 - h0, mbedtls_ssl_get_version(&ssl), mbedtls_ssl_get_ciphersuite(&ssl), mbedtls_ssl_get_verify_result(&ssl));
    size_t mx, mb;
    mbedtls_memory_buffer_alloc_max_get(&mx, &mb);
    mbedtls_memory_buffer_alloc_cur_get(&cur, &blk);
    say("ARENA after handshake: in use %zu bytes, peak %zu bytes (64 bit host, an upper bound for the Pico)", cur, mx);
    say("STACK the handshake wrote %zu bytes of stack below main's frame (64 bit host, -O2)", stack_used());
  }

  ws_cfg_t wc = { .host = host, .path = path, .send = io_send, .rand32 = io_rand, .on_open = on_open, .on_text = node_on_text, .on_close = on_close, .user = &node };
  ws_init(&ws, &wc);
  node_cfg_t nc = { .site = site, .place = "studio-1", .by = "tool", .now_ms = epoch_ms, .log = on_log, .on_other = on_other, .user = NULL };
  if (node_init(&node, &nc, &ws)) { say("bad site"); return 2; }
  upgrade_sent_at = ms();
  if (ws_start(&ws)) { say("upgrade send failed"); return 1; }

  uint8_t buf[4096];
  while (!closed && !done && ms() < seconds * 1000.0) {
    struct pollfd p = { .fd = fd, .events = POLLIN };
    int pending = tls && (mbedtls_ssl_get_bytes_avail(&ssl) || mbedtls_ssl_check_pending(&ssl));
    if (pending || poll(&p, 1, 20) > 0) {
      int r;
      if (tls) {
        r = mbedtls_ssl_read(&ssl, buf, sizeof buf);
        if (r == MBEDTLS_ERR_SSL_WANT_READ || r == MBEDTLS_ERR_SSL_WANT_WRITE) r = -9999;
        else if (r <= 0) { char e[120]; mbedtls_strerror(r, e, sizeof e); say("TLS read ended -0x%04x %s", -r, e); break; }
      } else {
        r = (int)recv(fd, buf, sizeof buf, 0);
        if (r <= 0) { say("socket closed"); break; }
      }
      if (r > 0) ws_feed(&ws, buf, (size_t)r);
    }
    if (node_tick(&node, (uint32_t)ms()) < 0) break;
    probe_timeout();
  }
  if (!closed) { ws_close(&ws, 1000); }
  if (tls) {
    mbedtls_ssl_close_notify(&ssl);
    size_t mx, mb;
    mbedtls_memory_buffer_alloc_max_get(&mx, &mb);
    say("ARENA peak over the whole run %zu bytes", mx);
  }
  say("STATS ws rx_text %u rx_binary %u rx_dropped_big %u tx_frames %u | node announced %u asked %u lights %u pings %u echoes %u ignored %u unreadable %u too_many_tokens %u",
      ws.st.rx_text, ws.st.rx_binary, ws.st.rx_dropped_big, ws.st.tx_frames,
      node.st.announced, node.st.asked, node.st.lights, node.st.pings, node.st.echoes, node.st.ignored, node.st.unreadable, node.st.too_many_tokens);
  close(fd);
  return done ? 0 : 1;
}
