// rig/pico/net/node.h: the Pico as a node in the positron graph, over a ws_t.
//
// Transport agnostic like ws.c: no SDK include, no heap, no clock of its own.
// It speaks `demo/shell/wire.mjs`'s envelope ({"id","type",...,"from","at","seq"})
// and `demo/shell/graph-registry.mjs`'s graph, the same way `/wall/` does:
//
//   on open        graph.announce, a graph built ONCE at init from constants and the site id
//   graph.ask      graph.announce again, now
//   light.set      to <site>:led:light, a #rrggbb and up to NODE_PARTS parts: stored, logged, handed on
//   node.ping      to <site>: answered with node.pong {to: <sender>, n: <its n>}
//   every 5 s      graph.announce (the registry calls a site stale after 15 s)
//   every 20 s     the text "ping", which the relay's runtime answers "pong"
//
// Anything else is passed to `on_other` untouched, which is where a test
// harness hangs its own verbs without this file knowing about them.
#ifndef POSITRON_NODE_H
#define POSITRON_NODE_H
#include "ws.h"

#ifndef NODE_PARTS
#define NODE_PARTS 8
#endif
#ifndef NODE_TOKENS
#define NODE_TOKENS 256        // jsmn tokens, 16 bytes each on a 32 bit target; a message needing more is ignored
#endif
#define NODE_ANNOUNCE_MS 5000
#define NODE_PING_MS 20000
#define NODE_DEAD_MS 45000     // nothing heard at all for this long: the transport should reconnect

typedef struct node_rgb { uint8_t r, g, b; } node_rgb_t;
typedef struct node_light {
  node_rgb_t hex;
  uint8_t nparts;
  struct { node_rgb_t hex; uint16_t a, b; } part[NODE_PARTS];   // across, in thousandths of the strip
} node_light_t;

typedef struct node_cfg {
  const char *site;            // "pico-a1b2c3": every node and port id starts with it
  const char *place;           // "studio-1"
  const char *by;              // NULL for a device; "tool" for a test harness (wire.mjs KINDS)
  uint64_t (*now_ms)(void *user);    // wall clock in epoch ms, or 0 when it is not known
  void (*log)(void *user, const char *line);
  void (*on_light)(void *user, const node_light_t *l);
  void (*on_other)(void *user, const char *type, char *msg, size_t n);
  void *user;
} node_cfg_t;

typedef struct node_stats {
  uint32_t announced, asked, lights, pings, pongs_relay, echoes, ignored, unreadable, too_many_tokens;
} node_stats_t;

typedef struct node {
  node_cfg_t c;
  ws_t *ws;
  char from[8];                // per CONNECTION, like wire.mjs's randomId(6)
  uint32_t seq;
  char graph[1024];            // "graph":{...} rendered once
  size_t graphn;
  char out[WS_TX_MAX - 14];
  uint32_t now, last_rx, last_announce, last_ping;
  bool open;
  node_light_t light;
  node_stats_t st;
  uint32_t tok[NODE_TOKENS * 4];   // jsmn tokens (16 bytes each), opaque here so jsmn.h stays out of this header
} node_t;

// Builds the graph. Returns 0, or <0 if the site is not [a-z0-9-] or the graph does not fit.
int node_init(node_t *n, const node_cfg_t *cfg, ws_t *ws);
// Wire these to the ws_cfg_t's on_open and on_text with user = the node.
void node_on_open(void *node);
void node_on_text(void *node, char *msg, size_t len);
// Call often with a monotonic millisecond clock. Returns -1 when the link is dead.
int node_tick(node_t *n, uint32_t mono_ms);
// Sends one message: `body` is the JSON members between type and from, either
// empty or ending in a comma, e.g. "\"to\":\"x\",\"n\":3,".
int node_send(node_t *n, const char *type, const char *body);
int node_announce(node_t *n);
// Exposed for tests: "#rrggbb" to rgb. Returns 0 or -1.
int node_hex(const char *s, size_t len, node_rgb_t *out);
#endif
