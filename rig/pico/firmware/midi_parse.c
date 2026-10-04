/* rig/pico/firmware/midi_parse.c: see midi_parse.h. */
#include "midi_parse.h"

#include <string.h>

static uint8_t length_of(uint8_t st) {
  switch (st & 0xF0) {
    case 0xC0: case 0xD0: return 2;
    case 0xF0:
      switch (st) {
        case 0xF1: case 0xF3: return 2;
        case 0xF2: return 3;
        case 0xF6: return 1;
        default: return 0;                     /* F4, F5: undefined, dropped */
      }
    default: return 3;
  }
}

static void sx_flush(midi_parser *p) {
  if (p->sxn) p->fn(p->ctx, p->sx, p->sxn);
  p->sxn = 0;
}

/* A status byte that is not real time ends an open SysEx. */
static void sx_close(midi_parser *p) {
  if (!p->in_sx) return;
  p->sx[p->sxn++] = 0xF7;                     /* sx has one byte of room past the chunk */
  sx_flush(p);
  p->in_sx = 0;
}

void midi_parse_init(midi_parser *p, midi_msg_fn fn, void *ctx) {
  memset(p, 0, sizeof *p);
  p->fn = fn;
  p->ctx = ctx;
}

void midi_parse_byte(midi_parser *p, uint8_t b) {
  if (b >= 0xF8) { p->fn(p->ctx, &b, 1); return; }   /* real time, anywhere */
  if (b == 0xF0) {
    sx_close(p);
    p->running = 0; p->have = 0;
    p->in_sx = 1; p->sx[0] = 0xF0; p->sxn = 1;
    return;
  }
  if (b == 0xF7) { sx_close(p); return; }             /* a stray F7 closes nothing */
  if (b >= 0x80) {
    sx_close(p);
    p->need = length_of(b);
    p->running = b < 0xF0 ? b : 0;
    p->have = 0;
    if (!p->need) return;
    p->buf[0] = b; p->have = 1;
    if (p->need == 1) { p->fn(p->ctx, p->buf, 1); p->have = 0; }
    return;
  }
  /* a data byte */
  if (p->in_sx) {
    p->sx[p->sxn++] = b;
    if (p->sxn >= MIDI_SX_CHUNK) sx_flush(p);         /* the next chunk starts bare */
    return;
  }
  if (p->have == 0) {
    if (!p->running) return;                          /* no status to belong to */
    p->buf[0] = p->running; p->have = 1; p->need = length_of(p->running);
  }
  p->buf[p->have++] = b;
  if (p->have >= p->need) { p->fn(p->ctx, p->buf, p->need); p->have = 0; }
}
