/* rig/route-core/route_core.c: the routing core, `route-core.mjs` in C99.
 *
 * Read `route_core.h` first: it says what this is, where it departs from the
 * plan and where it is smaller than the JS. This file follows the JS function
 * by function, in the same order, so the two can be read side by side.
 *
 * ⚠️ `emit` MUST NOT CALL BACK INTO THE CORE. It is called from inside the
 * dispatch loop and from inside the release of a held stream, and neither is
 * written to be re-entered. An adapter that feeds an output back in as an input
 * queues it, which is also what the JS means by "no feedback of what it writes
 * back into its inputs" (vector 07).
 */
#include "route_core.h"

#include <string.h>

#define NONE 0xFFu
#define F7 0xF7u

enum { SX_NONE, SX_HELD, SX_ALLOWED, SX_DENIED };

/* ── bytes ─────────────────────────────────────────────────────────────── */

typedef struct { uint8_t b[3]; uint8_t len; } msg;

static int is_note(const msg *m) { return (m->b[0] & 0xF0) == 0x80 || (m->b[0] & 0xF0) == 0x90; }
/* ⚠️ A NOTE ON AT VELOCITY 0 IS A RELEASE, here and everywhere below. */
static int is_note_on(const msg *m) { return (m->b[0] & 0xF0) == 0x90 && m->b[2] > 0; }
static int is_channel(const msg *m) { return m->b[0] >= 0x80 && m->b[0] < 0xF0; }
static uint8_t ch_of(const msg *m) { return m->b[0] & 0x0F; }

route_kind route_kind_of(uint8_t st) {
  if (st < 0x80) return ROUTE_OTHER;
  if (st < 0xF0) {
    switch (st & 0xF0) {
      case 0x80: case 0x90: return ROUTE_NOTE;
      case 0xA0: case 0xD0: return ROUTE_TOUCH;
      case 0xB0: return ROUTE_CC;
      case 0xC0: return ROUTE_PROGRAM;
      default: return ROUTE_BEND;                                 /* 0xE0 */
    }
  }
  switch (st) {
    case 0xF0: return ROUTE_SYSEX;
    case 0xF1: case 0xF8: return ROUTE_CLOCK;
    case 0xF2: case 0xF3: case 0xFA: case 0xFB: case 0xFC: return ROUTE_TRANSPORT;
    default: return ROUTE_OTHER;
  }
}

/*
 * Integer division rounded to nearest, ties AWAY FROM ZERO, the JS `divRound`.
 * `den` is always positive here (scale refuses hi <= lo).
 */
static int32_t div_round(int32_t num, int32_t den) {
  int32_t a = num < 0 ? -num : num;
  int32_t q = (a * 2 + den) / (2 * den);
  return num < 0 ? -q : q;
}

/*
 * The JS `curveAt`: `x` through a table by straight lines, rounded by
 * `div_round`. Below the first point it is the first out, above the last the
 * last out. With `wide` each point is a 14 bit bend value, p * 128 except 127,
 * which is 16383, so 64 is the bend's centre and an identity table is exact.
 * ⚠️ THE WIDEST PRODUCT IS 16383 * 16383, ABOUT 2.7e8, and `div_round` doubles
 * it, so it stays inside an int32 with room to spare.
 */
static int32_t at(uint8_t p, int wide) { return !wide ? p : p == 127 ? 16383 : (int32_t)p << 7; }

static int32_t curve_at(const route_curve_t *cv, int32_t x, int wide) {
  uint8_t i;
  if (x <= at(cv->in[0], wide)) return at(cv->out[0], wide);
  for (i = 1; i < cv->n; i++) {
    int32_t x1 = at(cv->in[i], wide);
    if (x <= x1) {
      int32_t x0 = at(cv->in[i - 1], wide), y0 = at(cv->out[i - 1], wide), y1 = at(cv->out[i], wide);
      return y0 + div_round((x - x0) * (y1 - y0), x1 - x0);
    }
  }
  return at(cv->out[cv->n - 1], wide);
}

/* ── ops, link time ───────────────────────────────────────────────────── */

/* ROUTE_ABSENT and ROUTE_INVALID sit far below every range, so one test serves. */
static int is_int(int32_t v, int32_t lo, int32_t hi) { return v >= lo && v <= hi; }
static int opt(int32_t v, int32_t lo, int32_t hi) { return v == ROUTE_ABSENT || is_int(v, lo, hi); }
static uint8_t pack(int32_t v) { return v == ROUTE_ABSENT ? NONE : (uint8_t)v; }

/* The JS `pointsOk`: 2 to 16 pairs, each 0..127, the inputs rising strictly. */
static int points_ok(const route_opdef *o) {
  uint16_t i;
  if (!o->pts || o->npts < 2 || o->npts > ROUTE_CURVE_POINTS) return 0;
  for (i = 0; i < o->npts; i++) {
    if (!is_int(o->pts[2 * i], 0, 127) || !is_int(o->pts[2 * i + 1], 0, 127)) return 0;
    if (i > 0 && o->pts[2 * i] <= o->pts[2 * i - 2]) return 0;
  }
  return 1;
}

/* The JS `ok(args)`, one op. */
static int op_ok(const route_opdef *o) {
  const int32_t *a = o->arg;
  switch (o->code) {
    case ROUTE_OP_CHANNEL:   return is_int(a[0], 1, 16) && opt(a[1], 1, 16);
    case ROUTE_OP_TRANSPOSE: return is_int(a[0], -127, 127);
    case ROUTE_OP_VELOCITY:  return is_int(a[0], 1, 65535);
    case ROUTE_OP_ONLY:
    case ROUTE_OP_DROP:      return is_int(a[0], 0, ROUTE_KINDS - 1);
    case ROUTE_OP_RANGE:     return (a[0] != ROUTE_ABSENT || a[1] != ROUTE_ABSENT) && opt(a[0], 0, 127) && opt(a[1], 0, 127);
    case ROUTE_OP_VRANGE:    return (a[0] != ROUTE_ABSENT || a[1] != ROUTE_ABSENT) && opt(a[0], 1, 127) && opt(a[1], 1, 127);
    case ROUTE_OP_FIXED:     return is_int(a[0], 1, 127);
    case ROUTE_OP_CC:        return is_int(a[0], 0, 127) && is_int(a[1], 0, 127) && opt(a[2], 1, 16);
    case ROUTE_OP_SCALE:     return is_int(a[0], 0, 127) && is_int(a[1], 0, 127) && a[0] < a[1]
                               && is_int(a[2], 0, 127) && is_int(a[3], 0, 127) && opt(a[4], 0, 127);
    case ROUTE_OP_TOGGLE:    return is_int(a[0], 0, 127) && is_int(a[1], 0, 127) && opt(a[2], 0, 127) && opt(a[3], 0, 127);
    case ROUTE_OP_THIN:      return is_int(a[0], 1, 1000);
    case ROUTE_OP_CURVE:     return points_ok(o) && opt(a[2], 0, 127)
                               && (a[1] == ROUTE_ABSENT || a[1] == ROUTE_CC || a[1] == ROUTE_BEND || a[1] == ROUTE_TOUCH)
                               && (a[2] == ROUTE_ABSENT || a[1] == ROUTE_ABSENT || a[1] == ROUTE_CC);
    case ROUTE_OP_VELCURVE:  return points_ok(o);
    case ROUTE_OP_NOTECC:    return is_int(a[0], 0, 127) && is_int(a[1], 0, 127)
                               && (a[2] == ROUTE_VEL || opt(a[2], 0, 127)) && opt(a[3], 0, 127);
    default:                 return 0;
  }
}

/*
 * Authored arguments to the 5 stored bytes. Validated already, so every value
 * fits. ⚠️ TOGGLE'S AND NOTECC'S DEFAULTS ARE RESOLVED HERE, NOT ON THE HOT
 * PATH, notecc's ROUTE_VEL becomes 0x80, which no 7 bit value can be, and the
 * two u16 arguments (velocity's scale, thin's hz) go low byte first. A curve's
 * a[0] is its slot in the table store, written by `route_link` after this.
 */
static void op_pack(route_op *dst, const route_opdef *o) {
  const int32_t *a = o->arg;
  int i;
  dst->code = o->code;
  for (i = 0; i < ROUTE_OP_ARGS; i++) dst->a[i] = pack(a[i]);
  switch (o->code) {
    case ROUTE_OP_TRANSPOSE: dst->a[0] = (uint8_t)(int8_t)a[0]; break;
    case ROUTE_OP_VELOCITY:
    case ROUTE_OP_THIN:      dst->a[0] = (uint8_t)(a[0] & 0xFF); dst->a[1] = (uint8_t)(a[0] >> 8); break;
    case ROUTE_OP_TOGGLE:
    case ROUTE_OP_NOTECC:
      if (a[2] == ROUTE_ABSENT) dst->a[2] = 127;
      if (a[2] == ROUTE_VEL) dst->a[2] = 0x80;
      if (a[3] == ROUTE_ABSENT) dst->a[3] = 0;
      break;
    default: break;
  }
}

static int is_curve(uint8_t code) { return code == ROUTE_OP_CURVE || code == ROUTE_OP_VELCURVE; }

/*
 * A slot in the table store holding `o`'s table: an equal one already there,
 * counted once more, or a free one filled. NONE when the store is full.
 */
static uint8_t curve_take(route_core *c, const route_opdef *o) {
  uint8_t s, i, free_at = NONE;
  for (s = 0; s < ROUTE_MAX_CURVES; s++) {
    route_curve_t *cv = &c->curve[s];
    int same = cv->refs && cv->n == o->npts;
    for (i = 0; same && i < cv->n; i++) same = cv->in[i] == o->pts[2 * i] && cv->out[i] == o->pts[2 * i + 1];
    if (same) { cv->refs++; return s; }
    if (!cv->refs && free_at == NONE) free_at = s;
  }
  if (free_at == NONE) return NONE;
  c->curve[free_at].refs = 1;
  c->curve[free_at].n = (uint8_t)o->npts;
  for (i = 0; i < o->npts; i++) {
    c->curve[free_at].in[i] = (uint8_t)o->pts[2 * i];
    c->curve[free_at].out[i] = (uint8_t)o->pts[2 * i + 1];
  }
  return free_at;
}

/* ── ops, the hot path ────────────────────────────────────────────────── */

/*
 * The JS `run(bytes, args, state, t, kind)`: 1 keeps `m` (possibly rewritten),
 * 0 drops it. An op passes anything it is not about unchanged.
 * ⚠️ NEVER CALLED ON A SYSEX. No op but `only` and `drop` is about a SysEx, and
 * every other op in the JS passes one through untouched, so `dispatch` asks
 * only those two and a SysEx is never copied into the 3 byte `msg`.
 */
static int op_run(const route_core *c, route_link_t *l, int i, msg *m, uint32_t t, route_kind k) {
  const uint8_t *a = l->op[i].a;
  switch (l->op[i].code) {
    case ROUTE_OP_CHANNEL:
      if (!is_channel(m)) return 1;
      if (a[1] != NONE && ch_of(m) != a[1] - 1) return 1;
      m->b[0] = (uint8_t)((m->b[0] & 0xF0) | (a[0] - 1));
      return 1;
    case ROUTE_OP_TRANSPOSE: {
      int n;
      if (!is_note(m)) return 1;
      n = m->b[1] + (int8_t)a[0];
      if (n < 0 || n > 127) return 0;                 /* out of range is a drop, not a clamp */
      m->b[1] = (uint8_t)n; m->len = 3;
      return 1;
    }
    case ROUTE_OP_VELOCITY: {
      /*
       * The scale arrives in THOUSANDTHS, and Math.round of a positive product
       * is floor(x + 1/2), so this is the JS rounding done in integers.
       * ⚠️ IT WAS EXACT WHERE THE JS WAS NOT. `45 * 0.7` is 31.499999999999996
       * in a double, so the JS sent 31 and this sends 32, which is what 31.5
       * rounds to. MEASURED over every scale 0.001 to 4.000 and every velocity:
       * 28 scales disagreed, each on one to three velocities, each a float tie
       * the JS rounded down. The JS does this in thousandths too since
       * 2026-10-03, and vector 20 holds 45 and 85 at 0.7.
       * 1/256ths were tried first and disagreed on 13 of the 30 scales 0.1 to
       * 3.0, because 0.1 is not a sum of powers of two either.
       */
      uint32_t v;
      if (!is_note_on(m)) return 1;
      v = ((uint32_t)m->b[2] * (uint32_t)(a[0] | (a[1] << 8)) + 500u) / 1000u;
      m->b[2] = (uint8_t)(v < 1 ? 1 : v > 127 ? 127 : v); m->len = 3;
      return 1;
    }
    case ROUTE_OP_ONLY: return k == a[0];
    case ROUTE_OP_DROP: return k != a[0];
    case ROUTE_OP_RANGE: {
      uint8_t lo = a[0] == NONE ? 0 : a[0], hi = a[1] == NONE ? 127 : a[1];
      if (!is_note(m)) return 1;
      return !(m->b[1] < lo || m->b[1] > hi);
    }
    case ROUTE_OP_VRANGE: {
      uint8_t lo = a[0] == NONE ? 1 : a[0], hi = a[1] == NONE ? 127 : a[1];
      if (!is_note_on(m)) return 1;                   /* a release always passes */
      return !(m->b[2] < lo || m->b[2] > hi);
    }
    case ROUTE_OP_FIXED:
      if (is_note_on(m)) { m->b[2] = a[0]; m->len = 3; }
      return 1;
    case ROUTE_OP_CC:
      if ((m->b[0] & 0xF0) != 0xB0 || m->b[1] != a[0]) return 1;
      if (a[2] != NONE) m->b[0] = (uint8_t)(0xB0 | (a[2] - 1));
      m->b[1] = a[1]; m->len = 3;
      return 1;
    case ROUTE_OP_SCALE: {
      /* 🔴 LO2 ABOVE HI2 INVERTS, and the rounding is the vectors': ties away from zero. */
      int32_t v;
      if ((m->b[0] & 0xF0) != 0xB0) return 1;
      if (a[4] != NONE && m->b[1] != a[4]) return 1;
      v = m->b[2] < a[0] ? a[0] : m->b[2] > a[1] ? a[1] : m->b[2];
      m->b[2] = (uint8_t)(a[2] + div_round((v - a[0]) * ((int32_t)a[3] - a[2]), (int32_t)a[1] - a[0]));
      m->len = 3;
      return 1;
    }
    case ROUTE_OP_TOGGLE: {
      uint8_t ch;
      if (!is_note(m) || m->b[1] != a[0]) return 1;
      if (!is_note_on(m)) return 0;                   /* the release is dropped */
      ch = ch_of(m);
      l->st[i] ^= (1u << ch);
      m->b[0] = (uint8_t)(0xB0 | ch); m->b[1] = a[1];
      m->b[2] = (l->st[i] & (1u << ch)) ? a[2] : a[3];
      m->len = 3;
      return 1;
    }
    case ROUTE_OP_THIN: {
      /*
       * ⚠️ MEASURED FROM THE LAST ONE KEPT: kept when (t - kept) * hz >= 1000.
       * Written as two tests so it never needs 64 bits: a gap of 1000 ms or
       * more passes at any hz, and below that the product is under 1e6.
       * ⚠️ THE DIFFERENCE IS UNSIGNED, so a millisecond clock that wraps after
       * 49 days still thins correctly, and a t that goes BACKWARDS reads as a
       * long gap and is kept, restarting the budget from it. That is the
       * decided behaviour, in both languages since 2026-10-03 (vector 22): a
       * clock that restarts must not silence the link until it catches up.
       */
      uint32_t hz = (uint32_t)(a[0] | (a[1] << 8)), d;
      if (k != ROUTE_CC && k != ROUTE_BEND && k != ROUTE_TOUCH) return 1;
      if (l->has & (1u << i)) {
        d = t - l->st[i];
        if (d < 1000u && d * hz < 1000u) return 0;
      }
      l->has = (uint8_t)(l->has | (1u << i));
      l->st[i] = t;
      return 1;
    }
    case ROUTE_OP_CURVE: {
      /* ⚠️ A BEND IN ITS OWN 14 BITS, a channel touch (Dn) in its SECOND byte. */
      const route_curve_t *cv = &c->curve[a[0]];
      int32_t v;
      if (k != ROUTE_CC && k != ROUTE_BEND && k != ROUTE_TOUCH) return 1;
      if (a[1] != NONE && k != a[1]) return 1;
      if (a[2] != NONE && (k != ROUTE_CC || m->b[1] != a[2])) return 1;
      if (k == ROUTE_BEND) {
        v = curve_at(cv, m->b[1] | (m->b[2] << 7), 1);
        m->b[1] = (uint8_t)(v & 127); m->b[2] = (uint8_t)(v >> 7);
      } else if ((m->b[0] & 0xF0) == 0xD0) m->b[1] = (uint8_t)curve_at(cv, m->b[1], 0);
      else m->b[2] = (uint8_t)curve_at(cv, m->b[2], 0);
      return 1;
    }
    case ROUTE_OP_VELCURVE: {
      /* 🔴 CLAMPED UP TO 1, so a table that reaches 0 never makes a release. */
      int32_t v;
      if (!is_note_on(m)) return 1;
      v = curve_at(&c->curve[a[0]], m->b[2], 0);
      m->b[2] = (uint8_t)(v < 1 ? 1 : v); m->len = 3;
      return 1;
    }
    case ROUTE_OP_NOTECC: {
      uint8_t ch;
      if (!is_note(m) || m->b[1] != a[0]) return 1;
      ch = ch_of(m);
      m->b[2] = is_note_on(m) ? (a[2] == 0x80 ? m->b[2] : a[2]) : a[3];   /* read before b[0] changes */
      m->b[0] = (uint8_t)(0xB0 | ch); m->b[1] = a[1]; m->len = 3;
      return 1;
    }
    default: return 1;
  }
}

/* ── held: what waits for a person ────────────────────────────────────── */

static uint8_t held_new(route_core *c, uint8_t port) {
  uint8_t s;
  for (s = 0; s < ROUTE_MAX_HELD; s++) {
    if (!c->held[s].used) {
      c->held[s].used = 1; c->held[s].port = port; c->held[s].seq = c->seq++;
      return s;
    }
  }
  return NONE;
}

static int pool_append(route_core *c, uint8_t slot, const uint8_t *bytes, uint16_t len) {
  if ((uint32_t)c->pool_used + 3u + len > ROUTE_HELD_BYTES) return 0;
  c->pool[c->pool_used] = slot;
  c->pool[c->pool_used + 1] = (uint8_t)(len & 0xFF);
  c->pool[c->pool_used + 2] = (uint8_t)(len >> 8);
  memcpy(&c->pool[c->pool_used + 3], bytes, len);
  c->pool_used = (uint16_t)(c->pool_used + 3u + len);
  return 1;
}

/* Close the gaps left by entries that were freed. Records keep their order. */
static void pool_compact(route_core *c) {
  uint16_t r = 0, w = 0;
  while (r < c->pool_used) {
    uint16_t n = (uint16_t)(3u + (c->pool[r + 1] | (c->pool[r + 2] << 8)));
    if (c->held[c->pool[r]].used) {
      if (w != r) memmove(&c->pool[w], &c->pool[r], n);
      w = (uint16_t)(w + n);
    }
    r = (uint16_t)(r + n);
  }
  c->pool_used = w;
}

/* A stream that no longer fits: forget it, count it, drop the rest of it. */
static void held_lose(route_core *c, route_link_t *l, uint8_t slot) {
  if (slot != NONE) { c->held[slot].used = 0; pool_compact(c); }
  if (l) l->sx_mode = SX_DENIED;
  c->stats.held_lost++;
}

/* Every link into `port` whose stream is held learns the person's answer. */
static void held_answer(route_core *c, uint8_t port, uint8_t mode) {
  uint8_t i;
  for (i = 0; i < c->nlinks; i++) {
    route_link_t *l = &c->link[c->order[i]];
    if (l->to == port && l->sx_mode == SX_HELD) l->sx_mode = mode;
  }
}

/* ── the table ────────────────────────────────────────────────────────── */

void route_init(route_core *c, route_emit_fn emit, void *ctx) {
  int i;
  memset(c, 0, sizeof *c);
  for (i = 0; i < ROUTE_MAX_SOUNDING; i++) c->sounding[i].link = NONE;
  c->emit = emit;
  c->ctx = ctx;
}

route_status route_port(route_core *c, uint8_t id, uint8_t dir, uint16_t accepts,
                        const uint8_t *policy, const route_rule *rules, uint8_t nrules) {
  route_port_t *p;
  uint8_t i, s;
  if (id >= ROUTE_MAX_PORTS || dir < ROUTE_IN || dir > ROUTE_BOTH) return ROUTE_BAD_PORT;
  /* A port that accepts a kind nobody named is refused when it is added. */
  if (accepts > 0xFFu || nrules > ROUTE_MAX_RULES) return ROUTE_BAD_PORT;
  for (i = 0; policy && i < ROUTE_KINDS; i++) if (policy[i] > ROUTE_UNSET) return ROUTE_BAD_PORT;
  for (i = 0; i < nrules; i++) if (rules[i].len > ROUTE_RULE_LEN || rules[i].verb > ROUTE_DENY) return ROUTE_BAD_PORT;
  /* Added again, it starts over, as the JS `ports.set` does: nothing held. */
  for (s = 0; s < ROUTE_MAX_HELD; s++) if (c->held[s].used && c->held[s].port == id) c->held[s].used = 0;
  pool_compact(c);
  held_answer(c, id, SX_DENIED);
  p = &c->port[id];
  memset(p, 0, sizeof *p);
  p->used = 1;
  p->dir = dir;
  p->accepts = (uint8_t)accepts;
  for (i = 0; i < ROUTE_KINDS; i++) p->policy[i] = policy ? policy[i] : ROUTE_UNSET;
  p->nrules = nrules;
  for (i = 0; i < nrules; i++) p->rule[i] = rules[i];
  return ROUTE_OK;
}

/* Can `to` reach `from` along the links already made. */
static int reaches(const route_core *c, uint8_t to, uint8_t from) {
  uint8_t seen[(ROUTE_MAX_PORTS + 7) / 8];
  uint8_t stack[ROUTE_MAX_PORTS];
  int sp = 0;
  uint8_t i;
  memset(seen, 0, sizeof seen);
  stack[sp++] = to;
  seen[to >> 3] = (uint8_t)(seen[to >> 3] | (1u << (to & 7)));
  while (sp) {
    uint8_t p = stack[--sp];
    if (p == from) return 1;
    for (i = 0; i < c->nlinks; i++) {
      const route_link_t *l = &c->link[c->order[i]];
      if (l->from == p && !(seen[l->to >> 3] & (1u << (l->to & 7)))) {
        seen[l->to >> 3] = (uint8_t)(seen[l->to >> 3] | (1u << (l->to & 7)));
        stack[sp++] = l->to;
      }
    }
  }
  return 0;
}

static int find_link(const route_core *c, uint16_t id) {
  int i;
  for (i = 0; i < c->nlinks; i++) if (c->link[c->order[i]].id == id) return i;
  return -1;
}

route_status route_link(route_core *c, uint16_t id, uint8_t from, uint8_t to,
                        const route_opdef *ops, uint8_t nops) {
  route_link_t *l;
  uint8_t i, slot, cv[ROUTE_MAX_OPS];
  if (find_link(c, id) >= 0) return ROUTE_DUPLICATE;
  if (from >= ROUTE_MAX_PORTS || to >= ROUTE_MAX_PORTS || !c->port[from].used || !c->port[to].used)
    return ROUTE_UNKNOWN_PORT;
  if (c->port[from].dir == ROUTE_OUT || c->port[to].dir == ROUTE_IN) return ROUTE_DIRECTION;
  for (i = 0; i < nops; i++) {
    if (ops[i].code >= ROUTE_OPS) return ROUTE_UNKNOWN_OP;
    if (!op_ok(&ops[i])) return ROUTE_BAD_ARGS;
  }
  /* 🔴 A LINK THAT CLOSES A LOOP IS REFUSED NOW, NOT FOUND LATER. A self link
   * is the smallest loop and reaches(x, x) says so at once. */
  if (reaches(c, to, from)) return ROUTE_CYCLE;
  /* ⚠️ LAST ON PURPOSE: every refusal the JS makes, this makes first. */
  if (nops > ROUTE_MAX_OPS || c->nlinks >= ROUTE_MAX_LINKS) return ROUTE_FULL;
  /* The tables last of all, and a link that cannot have every one takes none. */
  for (i = 0; i < nops; i++) {
    cv[i] = NONE;
    if (is_curve(ops[i].code) && (cv[i] = curve_take(c, &ops[i])) == NONE) {
      while (i--) if (cv[i] != NONE) c->curve[cv[i]].refs--;
      return ROUTE_FULL;
    }
  }
  for (slot = 0; c->used[slot]; slot++) {}
  l = &c->link[slot];
  memset(l, 0, sizeof *l);
  l->id = id; l->from = from; l->to = to; l->nops = nops;
  l->sx_mode = SX_NONE; l->sx_verb = ROUTE_UNSET; l->sx_slot = NONE;
  for (i = 0; i < nops; i++) { op_pack(&l->op[i], &ops[i]); if (cv[i] != NONE) l->op[i].a[0] = cv[i]; }
  c->used[slot] = 1;
  c->order[c->nlinks++] = slot;
  return ROUTE_OK;
}

/*
 * Remove a link and release what it left sounding: a note off per held note
 * (channel then note ascending), then CC 123 on every channel it ever
 * delivered a note on. ⚠️ THE RELEASE SKIPS THE GATE ON PURPOSE. It is the
 * safety message, and a port that took the notes takes their release.
 */
int route_unlink(route_core *c, uint16_t id, uint32_t t) {
  int i = find_link(c, id), n = 0, o;
  uint8_t slot, ch;
  route_link_t *l;
  if (i < 0) return 0;
  slot = c->order[i];
  l = &c->link[slot];
  memmove(&c->order[i], &c->order[i + 1], (size_t)(c->nlinks - i - 1));
  c->nlinks--;
  c->used[slot] = 0;
  for (o = 0; o < l->nops; o++) if (is_curve(l->op[o].code)) c->curve[l->op[o].a[0]].refs--;
  /* Smallest key first, each emitted entry freed, so this is a selection sort
   * over a pool of ROUTE_MAX_SOUNDING. Not the hot path. */
  for (;;) {
    int best = -1, k, bk = 0;
    for (k = 0; k < ROUTE_MAX_SOUNDING; k++) {
      const route_sounding_t *s = &c->sounding[k];
      if (s->link == slot && (best < 0 || s->ch * 128 + s->note < bk)) { best = k; bk = s->ch * 128 + s->note; }
    }
    if (best < 0) break;
    {
      uint8_t off[3];
      off[0] = (uint8_t)(0x80 | c->sounding[best].ch); off[1] = c->sounding[best].note; off[2] = 0;
      c->sounding[best].link = NONE;
      c->emit(c->ctx, l->to, t, off, 3, l->id); n++;
    }
  }
  for (ch = 0; ch < 16; ch++) {
    if (l->chans & (1u << ch)) {
      uint8_t all[3];
      all[0] = (uint8_t)(0xB0 | ch); all[1] = 123; all[2] = 0;
      c->emit(c->ctx, l->to, t, all, 3, l->id); n++;
    }
  }
  return n;
}

/* ── dispatch ─────────────────────────────────────────────────────────── */

static route_verb verb_for(const route_port_t *p, route_kind k, const uint8_t *b, uint16_t len) {
  uint8_t r, i;
  if (k == ROUTE_SYSEX && b[0] == 0xF0) {
    for (r = 0; r < p->nrules; r++) {
      /* ⚠️ A FIRST CHUNK SHORTER THAN THE RULE IS JUDGED ON WHAT IT HAS. A
       * head too short to read byte 6 matches the confirm rule rather than
       * slipping past it. */
      const route_rule *ru = &p->rule[r];
      uint8_t n = ru->len < len ? ru->len : (uint8_t)len;
      int hit = 1;
      for (i = 0; i < n; i++) if (!(ru->any & (1u << i)) && ru->match[i] != b[i]) { hit = 0; break; }
      if (hit) return (route_verb)ru->verb;
    }
  }
  if (p->policy[k] != ROUTE_UNSET) return (route_verb)p->policy[k];
  return k == ROUTE_SYSEX ? ROUTE_CONFIRM : ROUTE_ALLOW;   /* the plan's §6 default */
}

static void track(route_core *c, uint8_t slot, route_link_t *l, const msg *m) {
  int k, free_at = -1;
  uint8_t ch = ch_of(m);
  if (!is_note(m)) return;
  for (k = 0; k < ROUTE_MAX_SOUNDING; k++) {
    route_sounding_t *s = &c->sounding[k];
    if (s->link == slot && s->ch == ch && s->note == m->b[1]) {
      if (!is_note_on(m)) s->link = NONE;
      else l->chans = (uint16_t)(l->chans | (1u << ch));
      return;                                       /* on again: still one entry, as in a Set */
    }
    if (s->link == NONE && free_at < 0) free_at = k;
  }
  if (!is_note_on(m)) return;
  l->chans = (uint16_t)(l->chans | (1u << ch));
  if (free_at < 0) { c->stats.untracked++; return; }   /* CC 123 still covers it */
  c->sounding[free_at].link = slot; c->sounding[free_at].ch = ch; c->sounding[free_at].note = m->b[1];
}

static void set_open(route_core *c, uint8_t port, int open) {
  if (open) c->open_sx[port >> 3] = (uint8_t)(c->open_sx[port >> 3] | (1u << (port & 7)));
  else c->open_sx[port >> 3] = (uint8_t)(c->open_sx[port >> 3] & ~(1u << (port & 7)));
}

/* One message or chunk in, the events out, in link order. */
int route_input(route_core *c, uint8_t port, uint32_t t, const uint8_t *bytes, uint16_t len) {
  route_kind kind;
  int cont = 0, n = 0;
  uint8_t i;
  if (len == 0 || port >= ROUTE_MAX_PORTS) return 0;
  kind = route_kind_of(bytes[0]);
  /* 🔴 A CHUNK THAT IS ONLY F7, OR STARTS WITH ONE, IS THE OPEN STREAM'S LAST
   * CHUNK (vector 19). Its kind reads 'other', and until 2026-10-03 it was
   * dropped here and in the JS alike and left the stream open. With no stream
   * open it is still dropped. */
  if (bytes[0] < 0x80 || bytes[0] == F7) {
    if (!(c->open_sx[port >> 3] & (1u << (port & 7)))) return 0;   /* data with no status and no open SysEx */
    kind = ROUTE_SYSEX; cont = 1;
  }
  if (kind == ROUTE_SYSEX) set_open(c, port, memchr(bytes, F7, len) == NULL);
  if (kind == ROUTE_OTHER) return 0;
  if (kind != ROUTE_SYSEX && len > 3) { c->stats.too_long++; return 0; }

  for (i = 0; i < c->nlinks; i++) {
    uint8_t slot = c->order[i];
    route_link_t *l = &c->link[slot];
    route_port_t *dest;
    route_kind k = kind;
    route_verb verb;
    msg m;
    int j, keep = 1;
    if (l->from != port) continue;
    memset(&m, 0, sizeof m);
    if (kind != ROUTE_SYSEX) { memcpy(m.b, bytes, len); m.len = (uint8_t)len; }
    for (j = 0; j < l->nops && keep; j++) {
      /* A continuation chunk has no status byte, so its kind is carried, not read. */
      k = kind == ROUTE_SYSEX ? ROUTE_SYSEX : route_kind_of(m.b[0]);
      if (k == ROUTE_SYSEX && l->op[j].code != ROUTE_OP_ONLY && l->op[j].code != ROUTE_OP_DROP) continue;
      keep = op_run(c, l, j, &m, t, k);
    }
    if (!keep) continue;
    k = kind == ROUTE_SYSEX ? ROUTE_SYSEX : route_kind_of(m.b[0]);
    dest = &c->port[l->to];
    if (!(dest->accepts & (1u << k))) continue;
    /* ── the gate, at the destination ── */
    if (cont) {
      verb = (route_verb)l->sx_verb;
      if (l->sx_mode == SX_HELD) {
        if (!pool_append(c, l->sx_slot, bytes, len)) held_lose(c, l, l->sx_slot);
        verb = ROUTE_UNSET;                           /* held, or lost: nothing out either way */
      } else if (l->sx_mode == SX_ALLOWED) verb = ROUTE_ALLOW;
      else if (l->sx_mode == SX_DENIED) verb = ROUTE_DENY;
    } else {
      const uint8_t *b = k == ROUTE_SYSEX ? bytes : m.b;
      uint16_t bl = k == ROUTE_SYSEX ? len : m.len;
      verb = verb_for(dest, k, b, bl);
      if (k == ROUTE_SYSEX) { l->sx_mode = SX_NONE; l->sx_verb = (uint8_t)verb; l->sx_slot = NONE; }
      if (verb == ROUTE_CONFIRM) {
        uint8_t s = held_new(c, l->to);
        if (s == NONE) held_lose(c, k == ROUTE_SYSEX ? l : NULL, NONE);
        else if (!pool_append(c, s, b, bl)) held_lose(c, k == ROUTE_SYSEX ? l : NULL, s);
        else if (k == ROUTE_SYSEX) { l->sx_mode = SX_HELD; l->sx_slot = s; }
        verb = ROUTE_UNSET;
      }
    }
    if (verb != ROUTE_ALLOW) continue;
    if (k == ROUTE_SYSEX) c->emit(c->ctx, l->to, t, bytes, len, l->id);
    else { track(c, slot, l, &m); c->emit(c->ctx, l->to, t, m.b, m.len, l->id); }
    n++;
  }
  return n;
}

/* ── a person's answer ────────────────────────────────────────────────── */

/* The used held entries at `port`, oldest first. */
static uint8_t held_at(const route_core *c, uint8_t port, uint8_t *out) {
  uint8_t s, n = 0, a, b;
  for (s = 0; s < ROUTE_MAX_HELD; s++) if (c->held[s].used && c->held[s].port == port) out[n++] = s;
  for (a = 1; a < n; a++) {
    for (b = a; b > 0 && c->held[out[b]].seq < c->held[out[b - 1]].seq; b--) {
      uint8_t x = out[b]; out[b] = out[b - 1]; out[b - 1] = x;
    }
  }
  return n;
}

/* A person said yes: release everything held at `port`, at time `t`. Once. */
int route_confirm(route_core *c, uint8_t port, uint32_t t) {
  uint8_t list[ROUTE_MAX_HELD], n, e;
  int out = 0;
  if (port >= ROUTE_MAX_PORTS || !c->port[port].used) return 0;
  n = held_at(c, port, list);
  for (e = 0; e < n; e++) {
    uint16_t r = 0;
    while (r < c->pool_used) {
      uint16_t len = (uint16_t)(c->pool[r + 1] | (c->pool[r + 2] << 8));
      if (c->pool[r] == list[e]) { c->emit(c->ctx, port, t, &c->pool[r + 3], len, ROUTE_NO_LINK); out++; }
      r = (uint16_t)(r + 3u + len);
    }
  }
  for (e = 0; e < n; e++) c->held[list[e]].used = 0;
  pool_compact(c);
  held_answer(c, port, SX_ALLOWED);
  return out;
}

/* A person said no: drop everything held at `port`. Answers how many. */
int route_deny(route_core *c, uint8_t port) {
  uint8_t list[ROUTE_MAX_HELD], n, e;
  if (port >= ROUTE_MAX_PORTS || !c->port[port].used) return 0;
  n = held_at(c, port, list);
  for (e = 0; e < n; e++) c->held[list[e]].used = 0;
  pool_compact(c);
  held_answer(c, port, SX_DENIED);
  return n;
}

/* How many messages or SysEx streams are waiting at `port`. */
int route_held(const route_core *c, uint8_t port) {
  uint8_t s;
  int n = 0;
  for (s = 0; s < ROUTE_MAX_HELD; s++) if (c->held[s].used && c->held[s].port == port) n++;
  return n;
}
