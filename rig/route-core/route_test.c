/* rig/route-core/route_test.c: the C core against the route vectors.
 *
 *   rig/route-core/test.sh            builds and runs this in Docker
 *
 * Reads the lines `vectors-to-lines.mjs` writes on stdin, so neither this file
 * nor the core reads JSON. Runs the same asserts as
 * `demo/shell/route-core-test.mjs` in the same order: per vector the refusals
 * at link time, the output, and what is held at the end when the vector says;
 * then each vector against its own expectation with the last byte flipped,
 * which must FAIL; then the five refusals made directly. After those, a few
 * asserts the JS cannot have, about the limits only C has, the curve table
 * store among them.
 *
 * MEASURED 2026-10-03: 17 vectors (01 to 17, all `index.json` listed that day),
 * 65/65 green, the JS reading 77/77 on the same vectors. Then 22 vectors (18 to
 * 22 added for the five things below), 82/82 green, the JS reading 99/99. sizeof(route_core) is
 * 6064 bytes on x86_64 and 6052 on a Cortex-M4 with the default limits, under
 * the plan's 8 KB. `.text` is 4264 bytes at -Os for the M4, 8172 at -O2 on x86.
 * MEASURED 2026-10-04 after `curve`, `velcurve` and `notecc` (23 to 26) and
 * the curve table store: 26 vectors, 98/98 green, the JS reading 115/115. The
 * 16 new asserts are 3 per new vector and 4 about the table store, which only C
 * has. sizeof(route_core) 6352 on x86_64 and 6340 on the M4, both 288 bytes
 * more: 8 slots of 36. `.text` 5400 at -Os for the M4, 10230 at -O2 on x86.
 *
 * 🔴 SABOTAGED SIX TIMES, 2026-10-03, ON SCRATCH COPIES, never on this
 * checkout, each change alone through `SRC=<copy> test.sh`. Red per sabotage:
 *   1. `div_round` truncates instead of rounding: 2 red (04, 05).
 *   2. the gate's confirm treated as allow: 5 red (09 output and held, 17, and
 *      both C only held pool asserts).
 *   3. the cycle check removed from `route_link`: 2 red (07 refusals and output).
 *   4. the release on unlink sorted DESCENDING: 0 RED. 🔴 NO VECTOR HELD TWO
 *      NOTES AT AN UNLINK. 08 leaves exactly one sounding, so "note offs by
 *      channel then note ascending" (the plan's §12) was a sentence, not a
 *      promise, in either language. A missing vector, found here, and 18 is
 *      that vector.
 *   5. `thin` never records what it kept: 1 red (10).
 *   6. the destination's `accepts` not checked: 1 red (02).
 * And once by accident: the first version of this file compared the refusals
 * BEFORE running the vector, against the count left over from the vector
 * before, and went red on 07, 08, 11 and 17. So that comparison can fail too.
 *
 * 🔴 SABOTAGED AGAIN, 2026-10-03, AFTER 18 TO 22 LANDED, the same way, the
 * copy restored and read 82/82. Red per sabotage, MEASURED:
 *   7. the release on unlink DESCENDING, note offs and CC 123 both: 2 red (18,
 *      and the C only sounding pool assert, which reads the last CC 123).
 *      The same change was 0 red before 18.
 *   8. the release in pool order, the selection sort's comparison removed:
 *      1 red (18).
 *   9. a chunk that is only F7 dropped and the stream left open, as it was:
 *      1 red (19).
 *  10. velocity truncated, the + 500 removed: 2 red (12, 20).
 *  11. velocity's scale taken in 1/256ths, the first thing tried: 1 red (20).
 *  12. thin dropping a backwards t, the difference read signed: 1 red (22).
 * Two of these first failed to BUILD (8 left a variable unused under
 * -Werror; 10 errored at the end of the file for a reason not found, and the
 * same change made with sed built), and a build failure prints no FAIL line,
 * so a count of FAIL lines read 0 red on both. Each was rebuilt and is counted
 * from a run that printed its tally.
 *
 * 🔴 SABOTAGED A THIRD TIME, 2026-10-04, ONCE OR MORE PER NEW OP AND THE TABLE
 * STORE, the same way, the copy restored and read 98/98. Each counted from a run
 * that printed its tally. Red per sabotage, MEASURED:
 *  13. `curve` ignoring its cc: 1 red (23).
 *  14. `curve` ignoring its cls: 1 red (24). It was 0 red in the JS before 24's
 *      l2 stopped being a full identity; this run came after the repair.
 *  15. a bend's point 127 read as 16256: 1 red (24).
 *  16. `curve_at` truncating: 3 red (23, 24, 25).
 *  17. `curve_at` extrapolating below the first point, floored at 0: 1 red
 *      (23, since its first out became 4 instead of 0).
 *  18. `velcurve` without its floor of 1: 1 red (25).
 *  19. `notecc` reading a note on at velocity 0 as a press: 1 red (26).
 *  20. `notecc`'s ROUTE_VEL packed as 127 instead of 0x80: 1 red (26).
 *  21. the store never sharing an equal table: 3 red, all table store asserts.
 *  22. `route_unlink` never freeing a table: 1 red (the slot is not free again).
 *  23. a link refused full keeping the counts it took: 2 red (the store asserts
 *      that read slot 0's count).
 *
 * ⚠️ A CHUNK THAT IS ONLY `F7` WAS DROPPED AND LEFT ITS STREAM OPEN, in the JS
 * and here alike, until 2026-10-03. F7 is a status byte, so it is not a
 * continuation by its first byte; its kind is 'other', so it returned before
 * the open stream was closed. A sender that splits a SysEx so its terminator
 * travels alone lost the terminator at every destination, and the port then
 * took the next stray data bytes as more of that stream. Vector 19 decides it:
 * the F7 is the open stream's last chunk, delivered, held or dropped with it.
 * Fixed in both.
 */
#define _POSIX_C_SOURCE 200809L  /* strtok_r, in the runner only */
#include "route_core.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_LINE 8192
#define MAX_EV 256
#define MAX_BYTES 512
#define MAX_STEPS 256
#define MAX_TPORTS 32
#define MAX_TLINKS 32

static int pass_n, fail_n;

static void ok(const char *file, const char *what, int cond, const char *detail) {
  if (cond) { pass_n++; printf("  ok   %s%s%s\n", file, *file ? ": " : "", what); }
  else { fail_n++; printf("  FAIL %s%s%s\n", file, *file ? ": " : "", what); if (detail && *detail) printf("       %s\n", detail); }
}

/* ── one event, as it came out or as a vector wants it ───────────────── */

typedef struct { int port; long t; int len; uint8_t b[MAX_BYTES]; } ev;

static ev got[MAX_EV];
static int ngot;

static void emit(void *ctx, uint8_t port, uint32_t t, const uint8_t *bytes, uint16_t len, uint16_t link) {
  (void)ctx; (void)link;
  if (ngot >= MAX_EV || len > MAX_BYTES) { fprintf(stderr, "route_test: output overflow\n"); exit(2); }
  got[ngot].port = port; got[ngot].t = (long)t; got[ngot].len = len;
  memcpy(got[ngot].b, bytes, len);
  ngot++;
}

static int same_ev(const ev *a, const ev *b) {
  return a->port == b->port && a->t == b->t && a->len == b->len && memcmp(a->b, b->b, (size_t)a->len) == 0;
}

static int same_out(const ev *a, int na, const ev *b, int nb) {
  int i;
  if (na != nb) return 0;
  for (i = 0; i < na; i++) if (!same_ev(&a[i], &b[i])) return 0;
  return 1;
}

static void line_of(char *dst, size_t cap, const ev *e, int n) {
  int i, j;
  size_t w = 0;
  dst[0] = 0;
  for (i = 0; i < n && w + 64 < cap; i++) {
    w += (size_t)snprintf(dst + w, cap - w, "%s%d @%ld", i ? " | " : "", e[i].port, e[i].t);
    for (j = 0; j < e[i].len && j < 16 && w + 8 < cap; j++) w += (size_t)snprintf(dst + w, cap - w, " %02X", e[i].b[j]);
  }
}

/* ── one vector, as read ─────────────────────────────────────────────── */

typedef struct { int id; int dir; int accepts; uint8_t policy[ROUTE_KINDS]; route_rule rule[ROUTE_MAX_RULES]; int nrules; } tport;
#define MAX_TPTS 32               /* pairs a vector's table may list; more reads as 255, refused */
typedef struct { int id, from, to, nops; route_opdef op[8]; int32_t pts[8][2 * MAX_TPTS]; } tlink;
typedef struct { char what; int a; long t; int len; uint8_t b[MAX_BYTES]; } tstep;

typedef struct {
  char file[128], name[256];
  tport port[MAX_TPORTS]; int nports;
  tlink link[MAX_TLINKS]; int nlinks;
  tstep step[MAX_STEPS]; int nsteps;
  int refused[MAX_TLINKS][2]; int nrefused;
  ev want[MAX_EV]; int nwant;
  int held[MAX_TPORTS][2]; int nheld;
} vector;

static vector V;

static int hex_bytes(char **save, uint8_t *dst) {
  char *tok;
  int n = 0;
  while ((tok = strtok_r(NULL, " \n", save)) && n < MAX_BYTES) dst[n++] = (uint8_t)strtol(tok, NULL, 16);
  return n;
}

static int num(char **save) { char *t = strtok_r(NULL, " \n", save); return t ? (int)strtol(t, NULL, 10) : -1; }

static int32_t arg_of(char *tok) {
  if (!tok) return ROUTE_INVALID;
  if (!strcmp(tok, "-")) return ROUTE_ABSENT;
  if (!strcmp(tok, "?")) return ROUTE_INVALID;
  if (!strcmp(tok, "v")) return ROUTE_VEL;
  return (int32_t)strtol(tok, NULL, 10);
}

/* A curve's table, `in,out,in,out,...`, into `dst`. Answers the pairs read. */
static uint16_t pts_of(const char *tok, int32_t *dst) {
  int n = 0;
  const char *p = tok;
  for (;;) {
    char *end;
    long v = strtol(p, &end, 10);
    if (n < 2 * MAX_TPTS) dst[n] = (int32_t)v;
    n++;
    if (*end != ',') break;
    p = end + 1;
  }
  return n > 2 * MAX_TPTS ? 255 : (uint16_t)(n % 2 ? 0 : n / 2);   /* an odd count is no table */
}

/* Reads up to the next E. Answers 0 at the end of input. */
static int read_vector(FILE *in) {
  static char buf[MAX_LINE];
  memset(&V, 0, sizeof V);
  while (fgets(buf, sizeof buf, in)) {
    char *save = NULL, *tag = strtok_r(buf, " \n", &save);
    if (!tag) continue;
    switch (tag[0]) {
      case 'V': {
        char *f = strtok_r(NULL, " \n", &save), *rest = strtok_r(NULL, "\n", &save);
        snprintf(V.file, sizeof V.file, "%s", f ? f : "?");
        snprintf(V.name, sizeof V.name, "%s", rest ? rest : "");
        break;
      }
      case 'P': {
        tport *p = &V.port[V.nports++];
        int i;
        p->id = num(&save);
        strtok_r(NULL, " \n", &save);               /* the name, for people */
        p->dir = num(&save); p->accepts = num(&save);
        for (i = 0; i < ROUTE_KINDS; i++) p->policy[i] = (uint8_t)num(&save);
        break;
      }
      case 'R': {
        tport *p = &V.port[num(&save)];
        route_rule *r = &p->rule[p->nrules++];
        int i, len;
        r->verb = (uint8_t)num(&save);
        len = num(&save);
        r->len = (uint8_t)len;
        for (i = 0; i < len && i < ROUTE_RULE_LEN; i++) {
          char *tok = strtok_r(NULL, " \n", &save);
          if (!strcmp(tok, "xx") || !strcmp(tok, "XX")) r->any = (uint8_t)(r->any | (1u << i));
          else r->match[i] = (uint8_t)strtol(tok, NULL, 16);
        }
        break;
      }
      case 'L': {
        tlink *l = &V.link[V.nlinks++];
        int i, j;
        l->id = num(&save); l->from = num(&save); l->to = num(&save); l->nops = num(&save);
        for (i = 0; i < l->nops && i < 8; i++) {
          l->op[i].code = (uint8_t)num(&save);
          for (j = 0; j < ROUTE_OP_ARGS; j++) {
            char *tok = strtok_r(NULL, " \n", &save);
            if (tok && strchr(tok, ',')) {
              l->op[i].npts = pts_of(tok, l->pts[i]);
              l->op[i].pts = l->pts[i];
              l->op[i].arg[j] = ROUTE_ABSENT;
            } else l->op[i].arg[j] = arg_of(tok);
          }
        }
        break;
      }
      case 'I': case 'U': case 'C': case 'D': {
        tstep *s = &V.step[V.nsteps++];
        s->what = tag[0];
        s->a = num(&save);
        if (tag[0] != 'D') s->t = num(&save);
        if (tag[0] == 'I') s->len = hex_bytes(&save, s->b);
        break;
      }
      case 'X': V.refused[V.nrefused][0] = num(&save); V.refused[V.nrefused][1] = num(&save); V.nrefused++; break;
      case 'O': {
        ev *e = &V.want[V.nwant++];
        e->port = num(&save); e->t = num(&save); e->len = hex_bytes(&save, e->b);
        break;
      }
      case 'H': V.held[V.nheld][0] = num(&save); V.held[V.nheld][1] = num(&save); V.nheld++; break;
      case 'E': return 1;
      default: fprintf(stderr, "route_test: a line tagged %s\n", tag); exit(2);
    }
  }
  return 0;
}

/* ── run one vector through a fresh core ─────────────────────────────── */

static route_core core;
static int refused[MAX_TLINKS][2], nrefused;

static void run(void) {
  int i;
  route_init(&core, emit, NULL);
  ngot = 0; nrefused = 0;
  for (i = 0; i < V.nports; i++) {
    tport *p = &V.port[i];
    if (route_port(&core, (uint8_t)p->id, (uint8_t)p->dir, (uint16_t)p->accepts, p->policy, p->rule, (uint8_t)p->nrules) != ROUTE_OK) {
      fprintf(stderr, "route_test: %s port %d was refused\n", V.file, p->id); exit(2);
    }
  }
  for (i = 0; i < V.nlinks; i++) {
    tlink *l = &V.link[i];
    route_status s = route_link(&core, (uint16_t)l->id, (uint8_t)l->from, (uint8_t)l->to, l->op, (uint8_t)l->nops);
    if (s != ROUTE_OK) { refused[nrefused][0] = l->id; refused[nrefused][1] = s; nrefused++; }
  }
  for (i = 0; i < V.nsteps; i++) {
    tstep *s = &V.step[i];
    switch (s->what) {
      case 'I': route_input(&core, (uint8_t)s->a, (uint32_t)s->t, s->b, (uint16_t)s->len); break;
      case 'U': route_unlink(&core, (uint16_t)s->a, (uint32_t)s->t); break;
      case 'C': route_confirm(&core, (uint8_t)s->a, (uint32_t)s->t); break;
      case 'D': route_deny(&core, (uint8_t)s->a); break;
    }
  }
}

/* ── the direct refusals, and the limits only C has ──────────────────── */

static route_opdef op(uint8_t code, int32_t a0, int32_t a1, int32_t a2, int32_t a3, int32_t a4) {
  route_opdef o;
  o.code = code; o.arg[0] = a0; o.arg[1] = a1; o.arg[2] = a2; o.arg[3] = a3; o.arg[4] = a4;
  o.pts = NULL; o.npts = 0;
  return o;
}

#define A ROUTE_ABSENT

static void direct(void) {
  route_opdef o;
  uint8_t i;
  int n;
  printf("\n== route-core C: refusals made directly (NEGATIVE CONTROLS) ==\n");
  route_init(&core, emit, NULL);
  route_port(&core, 0, ROUTE_IN, 0xFF, NULL, NULL, 0);
  route_port(&core, 1, ROUTE_OUT, 0xFF, NULL, NULL, 0);
  o = op(200, A, A, A, A, A);
  ok("", "an op nobody defined is refused: unknown-op", route_link(&core, 1, 0, 1, &o, 1) == ROUTE_UNKNOWN_OP, "");
  o = op(ROUTE_OP_CHANNEL, 17, A, A, A, A);
  ok("", "a channel of 17 is refused: bad-args", route_link(&core, 2, 0, 1, &o, 1) == ROUTE_BAD_ARGS, "");
  o = op(ROUTE_OP_SCALE, 100, 20, 0, 127, A);
  ok("", "a scale whose input range is backwards is refused: bad-args, since only the OUTPUT may invert",
     route_link(&core, 3, 0, 1, &o, 1) == ROUTE_BAD_ARGS, "");
  route_link(&core, 4, 0, 1, NULL, 0);
  ok("", "a second link with the same id is refused: duplicate", route_link(&core, 4, 0, 1, NULL, 0) == ROUTE_DUPLICATE, "");
  ok("", "a port that accepts a kind nobody named is refused when it is added",
     route_port(&core, 2, ROUTE_OUT, 1u << 15, NULL, NULL, 0) == ROUTE_BAD_PORT, "");

  printf("\n== route-core C: the limits only C has ==\n");
  /* One op past the limit, every op valid: refused full, and only full. */
  {
    route_opdef many[ROUTE_MAX_OPS + 1];
    for (i = 0; i < ROUTE_MAX_OPS + 1; i++) many[i] = op(ROUTE_OP_FIXED, 100, A, A, A, A);
    ok("", "a link with one op more than ROUTE_MAX_OPS is refused: full",
       route_link(&core, 5, 0, 1, many, ROUTE_MAX_OPS + 1) == ROUTE_FULL, "");
    many[ROUTE_MAX_OPS].code = 200;
    ok("", "and the same link with an unknown op says unknown-op first, as the JS would",
       route_link(&core, 5, 0, 1, many, ROUTE_MAX_OPS + 1) == ROUTE_UNKNOWN_OP, "");
  }
  /* A held stream larger than the pool is lost whole, never released in part. */
  {
    static uint8_t big[ROUTE_HELD_BYTES];
    route_init(&core, emit, NULL);
    route_port(&core, 0, ROUTE_IN, 0xFF, NULL, NULL, 0);
    route_port(&core, 1, ROUTE_OUT, 0xFF, NULL, NULL, 0);   /* no profile: sysex confirms */
    route_link(&core, 1, 0, 1, NULL, 0);
    memset(big, 0x11, sizeof big);
    big[0] = 0xF0;
    ngot = 0;
    route_input(&core, 0, 0, big, 400);                     /* first chunk fits */
    route_input(&core, 0, 1, big + 1, ROUTE_HELD_BYTES - 1); /* the rest does not */
    n = route_confirm(&core, 1, 2);
    ok("", "a SysEx stream that outgrows the held pool is dropped whole, and confirm releases nothing",
       n == 0 && ngot == 0 && core.stats.held_lost == 1 && route_held(&core, 1) == 0, "");
    big[0] = 0xF0; big[3] = 0xF7;
    route_input(&core, 0, 3, big, 4);
    ok("", "and the next stream is held again, so the loss did not wedge the port",
       route_held(&core, 1) == 1 && route_confirm(&core, 1, 4) == 1 && ngot == 1, "");
  }
  /* A full sounding pool still delivers, and CC 123 still covers the channel. */
  {
    uint8_t on[3] = { 0x90, 0, 100 };
    route_init(&core, emit, NULL);
    route_port(&core, 0, ROUTE_IN, 0xFF, NULL, NULL, 0);
    route_port(&core, 1, ROUTE_OUT, 0xFF, NULL, NULL, 0);
    route_link(&core, 1, 0, 1, NULL, 0);
    ngot = 0;
    for (n = 0; n < ROUTE_MAX_SOUNDING + 1; n++) { on[0] = (uint8_t)(0x90 | (n >> 7)); on[1] = (uint8_t)(n & 127); route_input(&core, 0, 0, on, 3); }
    ok("", "a note on past ROUTE_MAX_SOUNDING is delivered and counted untracked",
       ngot == ROUTE_MAX_SOUNDING + 1 && core.stats.untracked == 1, "");
    ngot = 0;
    route_unlink(&core, 1, 9);
    ok("", "and the unlink releases the tracked ones, then CC 123 on both channels",
       ngot == ROUTE_MAX_SOUNDING + 2 && got[ngot - 1].b[0] == 0xB1 && got[ngot - 1].b[1] == 123, "");
  }
  /* The curve table store: shared when equal, refused whole when full, freed on unlink. */
  {
    static int32_t tab[ROUTE_MAX_CURVES + 1][4];
    route_opdef two[2];
    uint8_t cc[3] = { 0xB0, 1, 64 };
    int free_n = 0;
    route_init(&core, emit, NULL);
    route_port(&core, 0, ROUTE_IN, 0xFF, NULL, NULL, 0);
    route_port(&core, 1, ROUTE_OUT, 0xFF, NULL, NULL, 0);
    for (n = 0; n <= ROUTE_MAX_CURVES; n++) { tab[n][0] = 0; tab[n][1] = n; tab[n][2] = 127; tab[n][3] = 127; }
    o = op(ROUTE_OP_CURVE, A, A, A, A, A); o.pts = tab[0]; o.npts = 2;
    route_link(&core, 1, 0, 1, &o, 1);
    route_link(&core, 2, 0, 1, &o, 1);
    for (n = 0; n < ROUTE_MAX_CURVES; n++) free_n += core.curve[n].refs == 0;
    ok("", "two links with an equal curve table share one slot in the store",
       core.curve[0].refs == 2 && free_n == ROUTE_MAX_CURVES - 1, "");
    for (n = 1; n < ROUTE_MAX_CURVES; n++) {
      o.pts = tab[n];
      route_link(&core, (uint16_t)(10 + n), 0, 1, &o, 1);
    }
    /* Store full. A link with one table already there and one new: refused, and the shared one's count is put back. */
    two[0] = op(ROUTE_OP_CURVE, A, A, A, A, A); two[0].pts = tab[0]; two[0].npts = 2;
    two[1] = op(ROUTE_OP_VELCURVE, A, A, A, A, A); two[1].pts = tab[ROUTE_MAX_CURVES]; two[1].npts = 2;
    ok("", "a link whose new table finds the store full is refused: full, and takes nothing",
       route_link(&core, 3, 0, 1, two, 2) == ROUTE_FULL && core.curve[0].refs == 2 && core.nlinks == ROUTE_MAX_CURVES + 1, "");
    route_unlink(&core, 11, 0);
    ok("", "and once a link using its own table is removed, the slot is free and the same link fits",
       route_link(&core, 3, 0, 1, two, 2) == ROUTE_OK && core.curve[0].refs == 3, "");
    tab[0][1] = 99;                                            /* the caller's array changes after linking */
    ngot = 0;
    route_input(&core, 0, 0, cc, 3);
    ok("", "the table was copied at link time: changing the caller's array changes nothing",
       ngot >= 1 && got[0].b[2] == 64, "");
  }
}

int main(void) {
  char want[2048], have[2048];
  int i, nvec = 0;
  printf("\n== route-core C: every vector ==\n");
  while (read_vector(stdin)) {
    int same_ref;
    nvec++;
    run();
    same_ref = nrefused == V.nrefused;
    for (i = 0; same_ref && i < nrefused; i++)
      same_ref = refused[i][0] == V.refused[i][0] && refused[i][1] == V.refused[i][1];
    {
      char d[256] = "";
      size_t w = 0;
      w += (size_t)snprintf(d + w, sizeof d - w, "want [");
      for (i = 0; i < V.nrefused; i++) w += (size_t)snprintf(d + w, sizeof d - w, " %d:%d", V.refused[i][0], V.refused[i][1]);
      w += (size_t)snprintf(d + w, sizeof d - w, " ] got [");
      for (i = 0; i < nrefused; i++) w += (size_t)snprintf(d + w, sizeof d - w, " %d:%d", refused[i][0], refused[i][1]);
      snprintf(d + w, sizeof d - w, " ]");
      ok(V.file, "refusals at link time", same_ref, d);
    }
    {
      char d[4200];
      line_of(want, sizeof want, V.want, V.nwant);
      line_of(have, sizeof have, got, ngot);
      snprintf(d, sizeof d, "want [%s]\n       got  [%s]", want, have);
      ok(V.file, V.name, same_out(got, ngot, V.want, V.nwant), d);
    }
    if (V.nheld) {
      int good = 1;
      char d[256] = "";
      size_t w = 0;
      for (i = 0; i < V.nheld; i++) {
        int h = route_held(&core, (uint8_t)V.held[i][0]);
        if (h != V.held[i][1]) good = 0;
        w += (size_t)snprintf(d + w, sizeof d - w, "port %d want %d got %d  ", V.held[i][0], V.held[i][1], h);
      }
      ok(V.file, "held at the end", good, d);
    }
    /* NEGATIVE CONTROL: the comparison above must be able to say no. */
    {
      int differs;
      if (V.nwant) {
        ev *last = &V.want[V.nwant - 1];
        last->b[last->len - 1] ^= 1;
        differs = !same_out(got, ngot, V.want, V.nwant);
        last->b[last->len - 1] ^= 1;
      } else {
        ev fake;
        memset(&fake, 0, sizeof fake);
        fake.port = 250; fake.len = 1; fake.b[0] = 0xF8;
        differs = !same_out(got, ngot, &fake, 1);
      }
      ok(V.file, "one byte changed in the expectation reads as different (NEGATIVE CONTROL)", differs, "");
    }
  }
  ok("", "at least ten vectors were read", nvec >= 10, "");
  direct();
  printf("\nsizeof(route_core) %u bytes with ports %d, links %d, ops %d, sounding %d, held %d, held bytes %d\n",
         (unsigned)sizeof(route_core), ROUTE_MAX_PORTS, ROUTE_MAX_LINKS, ROUTE_MAX_OPS,
         ROUTE_MAX_SOUNDING, ROUTE_MAX_HELD, ROUTE_HELD_BYTES);
  printf("%d vectors, %d/%d passed\n", nvec, pass_n, pass_n + fail_n);
  return fail_n ? 1 : 0;
}
