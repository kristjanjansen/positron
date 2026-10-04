/* rig/route-core/route_core.h: the routing core in C99, step 6 of
 * `plans/plan-route-core.md` (§11), a line by line port of
 * `demo/shell/route-core.mjs`.
 *
 * A table of ports and links, a closed list of ops, and a gate at the
 * destination. No heap, no JSON, no strings anywhere in the core: every limit
 * below is a compile time constant, the caller owns the one `route_core`
 * struct, and what comes out goes through one callback.
 *
 * 🔴 THE CONTRACT IS the JSON in `demo/shell/route-vectors/`, NOT THIS FILE AND NOT
 * THE JS. `test.sh` converts them to lines with `vectors-to-lines.mjs` and
 * `route_test.c` runs every one. A behaviour here that no vector names is not a
 * promise, and a disagreement with the JS on something no vector covers is a
 * missing vector before it is a bug in either.
 *
 * ⚠️ WHAT THE JS GETS AS STRINGS THIS GETS AS NUMBERS, RESOLVED AT THE EDGE.
 * A port is its slot index, a link id is a u16 the caller chose, an op is an
 * opcode, a kind is `route_kind`. Names live in L2 (`bay.mjs`, the converter),
 * which is the plan's §7: an MCU never parses text.
 *
 * ⚠️ WHERE THIS DEPARTS FROM THE PLAN'S §3 SKETCH, AND WHY:
 *   - An op is 6 bytes, an opcode and FIVE argument bytes, not 5 and four.
 *     `scale` has five arguments (lo, hi, lo2, hi2 and an optional cc) and the
 *     reference kept all five.
 *   - Events are raw MIDI bytes in and out, not the `{port, kind, ch, a, b, t}`
 *     record. The vectors are bytes, a SysEx chunk is bytes, and decoding to a
 *     record and back would be a second place for the two to disagree.
 *   - Held notes are a shared pool of entries, not 256 bytes of bits per
 *     destination. The vectors need them PER LINK (08: removing one link must
 *     not release the other's notes), and 256 bytes a link is 16 KB at 64 links.
 *   - 🔴 A CURVE TABLE DOES NOT FIT IN AN OP, SO IT LIVES IN A TABLE STORE AND
 *     THE OP CARRIES ITS INDEX. Decided 2026-10-04 with `curve` and `velcurve`.
 *     A table is up to ROUTE_CURVE_POINTS `[in, out]` pairs, 32 bytes, and an op
 *     stays 6 bytes, so every link keeps the same size whether it curves or not.
 *     The caller hands the table in with the op (`route_opdef.pts`) and
 *     `route_link` COPIES it into one of ROUTE_MAX_CURVES slots, so the caller's
 *     array may go away. An identical table already in the store is SHARED and
 *     counted, since a profile's curve is drawn once and used by many links;
 *     `route_unlink` gives the slot back when the last op using it goes. A link
 *     whose tables do not fit is refused ROUTE_FULL, checked last like the
 *     other limits, and takes nothing.
 *     The rejected alternative was the table inline in the link: 32 bytes on
 *     every op of every link is 8 KB at 64 links of 4 ops, the whole budget.
 *
 * ⚠️ WHERE THIS IS SMALLER THAN THE JS, ON PURPOSE, AND WHAT IT DOES WHEN FULL:
 *   - A link past ROUTE_MAX_LINKS, or with more than ROUTE_MAX_OPS ops, is
 *     refused `ROUTE_FULL`, a seventh code the JS does not have. It is checked
 *     LAST, so every refusal the JS makes this makes first.
 *   - A note on that finds the sounding pool full is still delivered and
 *     counted in `stats.untracked`. Its channel is still recorded, so the CC 123
 *     on unlink still silences it.
 *   - A confirm that finds no free held entry, or a held stream that overflows
 *     ROUTE_HELD_BYTES, is DROPPED and counted in `stats.held_lost`, and the
 *     rest of that stream is dropped with it. Releasing half a SysEx to a
 *     device after a person said yes is worse than releasing none of it.
 *   - A channel or system message longer than 3 bytes is dropped and counted in
 *     `stats.too_long`. Only a SysEx may be longer.
 */
#ifndef ROUTE_CORE_H
#define ROUTE_CORE_H

#include <stdint.h>

/* ── limits, all overridable with -D ───────────────────────────────────── */

#ifndef ROUTE_MAX_PORTS
#define ROUTE_MAX_PORTS 32        /* a port id is 0 .. ROUTE_MAX_PORTS - 1 */
#endif
#ifndef ROUTE_MAX_LINKS
#define ROUTE_MAX_LINKS 64
#endif
#ifndef ROUTE_MAX_OPS
#define ROUTE_MAX_OPS 4           /* per link */
#endif
#ifndef ROUTE_MAX_RULES
#define ROUTE_MAX_RULES 2         /* byte prefix rules per port */
#endif
#ifndef ROUTE_RULE_LEN
#define ROUTE_RULE_LEN 8          /* bytes a rule may match; 7 reads a Circuit's byte 6 */
#endif
#ifndef ROUTE_MAX_SOUNDING
#define ROUTE_MAX_SOUNDING 128    /* notes held across ALL links, for the release on unlink */
#endif
#ifndef ROUTE_MAX_HELD
#define ROUTE_MAX_HELD 8          /* messages or SysEx streams waiting for confirm, all ports */
#endif
#ifndef ROUTE_HELD_BYTES
#define ROUTE_HELD_BYTES 1024     /* their bytes; two whole 350 byte Circuit patches fit */
#endif
#ifndef ROUTE_MAX_CURVES
#define ROUTE_MAX_CURVES 8        /* distinct curve tables across ALL links, shared when equal */
#endif

#define ROUTE_CURVE_POINTS 16     /* the plan's §4 table; `route-core.mjs` CURVE_POINTS */

#define ROUTE_OP_ARGS 5

#if ROUTE_MAX_PORTS > 254 || ROUTE_MAX_LINKS > 255 || ROUTE_MAX_HELD > 255 || ROUTE_RULE_LEN > 8 \
    || ROUTE_MAX_CURVES > 254
#error "route_core: a limit outgrew the u8 that indexes it"
#endif

/* ── the vocabulary, numbered. `midi-kinds.mjs` KINDS in the same order ── */

typedef enum {
  ROUTE_NOTE, ROUTE_CC, ROUTE_BEND, ROUTE_TOUCH, ROUTE_PROGRAM,
  ROUTE_CLOCK, ROUTE_TRANSPORT, ROUTE_SYSEX,
  ROUTE_KINDS,                    /* 8, and the count */
  ROUTE_OTHER = ROUTE_KINDS       /* what `kindOf` calls 'other': never routed */
} route_kind;

/* `route-core.mjs` OP_NAMES in the same order. The converter checks the order. */
typedef enum {
  ROUTE_OP_CHANNEL,   /* to, from?            1..16 */
  ROUTE_OP_TRANSPOSE, /* by                   -127..127 */
  ROUTE_OP_VELOCITY,  /* scale x 1000         1..65535, see the note in route_core.c */
  ROUTE_OP_ONLY,      /* kind */
  ROUTE_OP_DROP,      /* kind */
  ROUTE_OP_RANGE,     /* lo?, hi?             0..127, one of them given */
  ROUTE_OP_VRANGE,    /* lo?, hi?             1..127, one of them given */
  ROUTE_OP_FIXED,     /* to                   1..127 */
  ROUTE_OP_CC,        /* from, to, ch?        0..127, 0..127, 1..16 */
  ROUTE_OP_SCALE,     /* lo, hi, lo2, hi2, cc?  lo < hi; lo2 above hi2 inverts */
  ROUTE_OP_TOGGLE,    /* note, cc, on?, off?  on defaults 127, off 0 */
  ROUTE_OP_THIN,      /* hz                   1..1000 */
  ROUTE_OP_CURVE,     /* (pts), cls?, cc?     cls cc, bend or touch; cc only with cls cc or none */
  ROUTE_OP_VELCURVE,  /* (pts)                note on velocity, then 1..127 */
  ROUTE_OP_NOTECC,    /* note, cc, on?, off?  on 0..127 or ROUTE_VEL, default 127; off default 0 */
  ROUTE_OPS
} route_opcode;

typedef enum { ROUTE_ALLOW, ROUTE_CONFIRM, ROUTE_DENY, ROUTE_UNSET } route_verb;

typedef enum { ROUTE_IN = 1, ROUTE_OUT = 2, ROUTE_BOTH = 3 } route_dir;

/* `route-core.mjs` REFUSALS, numbered from 1, plus ROUTE_FULL. */
typedef enum {
  ROUTE_OK = 0,
  ROUTE_DUPLICATE, ROUTE_UNKNOWN_PORT, ROUTE_DIRECTION, ROUTE_UNKNOWN_OP,
  ROUTE_BAD_ARGS, ROUTE_CYCLE,
  ROUTE_FULL,                     /* C only: a limit above, never a JS refusal */
  ROUTE_BAD_PORT                  /* C only, from route_port(): a bad id, kind, verb or rule */
} route_status;

/* An argument the op leaves out. Every op argument at link time is an int32. */
#define ROUTE_ABSENT  INT32_MIN
/* A value the edge could not read as an integer (1.5, a word). Refused as bad-args. */
#define ROUTE_INVALID (INT32_MIN + 1)
/* `notecc`'s on: the note's own velocity, the JS `'vel'`. Not 128, so a number
 * the JS refuses cannot be read here as this. */
#define ROUTE_VEL     (INT32_MIN + 2)

#define ROUTE_NO_LINK 0xFFFFu     /* the link field of what confirm() releases */

/* ── what the caller hands in at table time ────────────────────────────── */

/* One op as authored: an opcode and its arguments in the order listed above.
 * `curve` and `velcurve` also carry their table: `npts` pairs at `pts`, in then
 * out, copied at link time. Every other op leaves `pts` NULL and `npts` 0. */
typedef struct {
  uint8_t code;
  int32_t arg[ROUTE_OP_ARGS];
  const int32_t *pts;
  uint16_t npts;
} route_opdef;

/* A byte prefix rule. Bit i of `any` set means byte i matches anything. */
typedef struct {
  uint8_t len;
  uint8_t verb;
  uint8_t any;
  uint8_t match[ROUTE_RULE_LEN];
} route_rule;

/* ── the state, all of it ──────────────────────────────────────────────── */

typedef struct {
  uint8_t code;
  uint8_t a[ROUTE_OP_ARGS];       /* packed; 0xFF is absent where an argument may be */
} route_op;

typedef struct {
  uint16_t id;
  uint8_t from, to;
  uint8_t nops;
  uint8_t has;                    /* bit i: op i's state has been set (thin's first kept) */
  uint8_t sx_mode;                /* the SysEx stream in flight here: none, held, allowed, denied */
  uint8_t sx_verb;                /* the gate's verb on that stream's first chunk */
  uint8_t sx_slot;                /* its held entry while sx_mode is held */
  uint16_t chans;                 /* bit per channel a note on was delivered on */
  route_op op[ROUTE_MAX_OPS];
  uint32_t st[ROUTE_MAX_OPS];     /* toggle: lit channels; thin: t of the last kept */
} route_link_t;

typedef struct {
  uint8_t used;
  uint8_t dir;
  uint8_t accepts;                /* bit per route_kind */
  uint8_t nrules;
  uint8_t policy[ROUTE_KINDS];    /* route_verb, ROUTE_UNSET for the default */
  route_rule rule[ROUTE_MAX_RULES];
} route_port_t;

typedef struct {
  uint8_t used;
  uint8_t port;
  uint32_t seq;                   /* release order */
} route_held_t;

typedef struct {
  uint8_t link;                   /* slot, 0xFF when free */
  uint8_t ch;
  uint8_t note;
} route_sounding_t;

/* A curve table in the store. Points rise strictly in `in`, validated at link time. */
typedef struct {
  uint16_t refs;                  /* ops using it; 0 is a free slot */
  uint8_t n;                      /* points, 2 .. ROUTE_CURVE_POINTS */
  uint8_t in[ROUTE_CURVE_POINTS];
  uint8_t out[ROUTE_CURVE_POINTS];
} route_curve_t;

typedef struct {
  uint32_t untracked, held_lost, too_long;
} route_stats;

typedef void (*route_emit_fn)(void *ctx, uint8_t port, uint32_t t,
                              const uint8_t *bytes, uint16_t len, uint16_t link);

typedef struct {
  route_port_t port[ROUTE_MAX_PORTS];
  route_link_t link[ROUTE_MAX_LINKS];          /* slots */
  uint8_t used[ROUTE_MAX_LINKS];
  uint8_t order[ROUTE_MAX_LINKS];              /* slots in the order the links were made */
  uint8_t nlinks;
  uint8_t open_sx[(ROUTE_MAX_PORTS + 7) / 8];  /* bit per input port while a SysEx is open */
  route_sounding_t sounding[ROUTE_MAX_SOUNDING];
  route_held_t held[ROUTE_MAX_HELD];
  uint32_t seq;
  uint16_t pool_used;
  uint8_t pool[ROUTE_HELD_BYTES];              /* records: slot, len lo, len hi, bytes */
  route_curve_t curve[ROUTE_MAX_CURVES];       /* the table store; an op holds a slot */
  route_stats stats;
  route_emit_fn emit;
  void *ctx;
} route_core;

/* ── the calls, the JS `createCore()` methods one for one ──────────────── */

void route_init(route_core *c, route_emit_fn emit, void *ctx);

/* `addPort`. `accepts` is a mask of route_kind bits, 0xFF for every kind; a bit
 * above ROUTE_SYSEX is a kind nobody named and is refused. `policy` may be NULL. */
route_status route_port(route_core *c, uint8_t id, uint8_t dir, uint16_t accepts,
                        const uint8_t *policy, const route_rule *rules, uint8_t nrules);

/* `link`: ROUTE_OK, or why not. */
route_status route_link(route_core *c, uint16_t id, uint8_t from, uint8_t to,
                        const route_opdef *ops, uint8_t nops);

/* `unlink`: emits the release. Answers how many events it emitted. */
int route_unlink(route_core *c, uint16_t id, uint32_t t);

/* `input`: one message or SysEx chunk in. Answers how many events it emitted. */
int route_input(route_core *c, uint8_t port, uint32_t t, const uint8_t *bytes, uint16_t len);

/* `confirm`, `deny`, `held`. */
int route_confirm(route_core *c, uint8_t port, uint32_t t);
int route_deny(route_core *c, uint8_t port);
int route_held(const route_core *c, uint8_t port);

/* `kindOf` from `midi-kinds.mjs`, on a status byte. */
route_kind route_kind_of(uint8_t status);

#endif
