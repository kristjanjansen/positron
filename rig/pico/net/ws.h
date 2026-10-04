// rig/pico/net/ws.h: a WebSocket CLIENT (RFC 6455) with no I/O and no heap.
//
// SANS-IO ON PURPOSE. It never opens a socket. Bytes that arrive are pushed in
// with ws_feed(); bytes to send leave through the `send` callback. So the same
// file runs on the Pico over lwIP's altcp (plain TCP or TLS) and on Linux over
// mbedTLS sockets, and the Linux run is a test of the code the board runs.
//
// What it does: the HTTP/1.1 upgrade with a random Sec-WebSocket-Key and a
// checked Sec-WebSocket-Accept, masked client frames, text messages (with
// continuation frames reassembled), ping answered with pong, close answered
// with close. Binary messages and messages longer than WS_RX_MAX are read past
// and COUNTED, never buffered, so a big frame in a busy room costs nothing but
// the bytes going by.
#ifndef POSITRON_WS_H
#define POSITRON_WS_H
#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>

#ifndef WS_RX_MAX
#define WS_RX_MAX 4096        // the longest text message kept; longer ones are dropped and counted
#endif
#ifndef WS_TX_MAX
#define WS_TX_MAX 2048        // one whole outgoing frame, header included, sent in ONE call
#endif
#define WS_HTTP_MAX 1024      // the upgrade response's header block

enum ws_state { WS_IDLE, WS_UPGRADING, WS_OPEN, WS_CLOSING, WS_CLOSED };

typedef struct ws_cfg {
  const char *host;           // the Host header, e.g. "ws.positron.studio"
  const char *path;           // e.g. "/room/studio-1/ws"
  // Transport. `send` must take all n bytes or fail (<0); it is called once per frame.
  int (*send)(void *io, const uint8_t *p, size_t n);
  uint32_t (*rand32)(void *io);
  void *io;
  // Events.
  void (*on_open)(void *user);
  void (*on_text)(void *user, char *msg, size_t n);     // NUL terminated, writable, valid only during the call
  void (*on_close)(void *user, int code, const char *why);  // code < 0 is -<HTTP status> of a refused upgrade
  void *user;
} ws_cfg_t;

typedef struct ws_stats {
  uint32_t rx_text, rx_binary, rx_dropped_big, rx_ping, rx_pong;
  uint32_t tx_frames, tx_refused_big;
  uint64_t rx_bytes, tx_bytes;
} ws_stats_t;

typedef struct ws {
  ws_cfg_t c;
  enum ws_state state;
  char key[25], accept[29];
  // the upgrade response
  char http[WS_HTTP_MAX + 1];
  size_t httpn;
  // the frame being read
  uint8_t hdr[14];
  uint8_t hn, hneed;
  uint8_t op;
  bool fin;
  uint64_t plen, pgot;
  // the message being assembled
  uint8_t msg_op;
  bool dropping;
  size_t msgn;
  char rx[WS_RX_MAX + 1];
  uint8_t ctl[125];
  uint8_t ctln;
  uint8_t tx[WS_TX_MAX];
  ws_stats_t st;
} ws_t;

void ws_init(ws_t *ws, const ws_cfg_t *cfg);
// Sends the upgrade request. Call once the transport is connected (and, for
// TLS, once the handshake is done or queued behind it).
int ws_start(ws_t *ws);
// Push received bytes. Returns 0, or <0 on a protocol error (the state is
// WS_CLOSED and on_close has been called).
int ws_feed(ws_t *ws, const uint8_t *p, size_t n);
int ws_send_text(ws_t *ws, const char *s, size_t n);
int ws_send_ping(ws_t *ws, const uint8_t *p, size_t n);
int ws_close(ws_t *ws, uint16_t code);

// Exposed for the self test: base64(sha1(key + RFC 6455 GUID)).
void ws_accept_for(const char *key, char out[29]);
#endif
