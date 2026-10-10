/* rig/pico/patch/main.c: the Pico of /concepts/070/, a one link MIDI router
 * whose screen draws the route the way the page's patchbay does.
 *
 *   UART0 at 31250 baud, GP0 TX and GP1 RX       DIN MIDI out and in
 *   I2C0 at 400 kHz, GP4 SDA and GP5 SCL, 0x3C   the SSD1306 of rig/pico/oled/
 *   GP10 and GP11 to ground, pulled up           K1 and K2
 *
 * EMULATOR ONLY. The desk router is rig/pico/firmware/ and is not touched by
 * this file: this one is built for the page, the way rig/pico/rings/ is.
 *
 * The routing is rig/route-core/ unchanged, so every byte the synth hears was
 * written to UART0 TX by the core and not copied by the page. Port 0 is DIN
 * in, port 1 is DIN out, and one link joins them:
 *
 *   K1  as played     the link has no ops, a note goes out as it came in
 *   K2  octave up     transpose +12, so 90 3C 64 goes out as 90 48 64
 *
 * Changing route unlinks the old link first, which is how the core releases
 * the notes it still holds (a note off each, then CC 123 on their channel).
 *
 * The screen, 128x64, one bit:
 *
 *        KEYS ────── PICO ────── SYNTH
 *                C4          C5
 *
 *              +12 octave up
 *
 * Every note on that arrives runs a pulse along KEYS to PICO, and every note
 * on the core sends runs one along PICO to SYNTH once the first has arrived. A
 * box lights for a moment as a pulse reaches it, and each wire shows the name
 * of the last note it carried for a short while. The two names differ exactly
 * when the route changes the note.
 *
 * ⚠️ THE SOUND IS NOT DELAYED BY THE PICTURE. The bytes go out at once; only
 * the drawing of the second leg waits for the first to finish.
 *
 * ⚠️ 30 FRAMES A SECOND, AND ONLY WHILE SOMETHING MOVES. Between frames the
 * core waits for an interrupt or the next frame time, so an idle screen costs
 * the emulator nothing, and a UART byte wakes it at once.
 */
#include <string.h>

#include "pico/stdlib.h"
#include "hardware/i2c.h"
#include "hardware/irq.h"
#include "hardware/uart.h"

#include "font_glcd5x7.h"
#include "midi_parse.h"
#include "route_core.h"
#include "ssd1306.h"

/* ── pins ──────────────────────────────────────────────────────────────── */

#define MIDI_UART uart0
#define MIDI_TX_PIN 0
#define MIDI_RX_PIN 1
#define MIDI_BAUD 31250

#define OLED_I2C i2c0
#define OLED_SDA 4
#define OLED_SCL 5
#define OLED_ADDR 0x3C
#define OLED_HZ 400000

static const uint8_t KEY_PIN[2] = { 10, 11 };   /* K1, K2 */

/* ── timing ────────────────────────────────────────────────────────────── */

#define FRAME_US 33333      /* 30 frames a second */
#define LEG_MS 300          /* a pulse crosses one wire in this long */
#define FLASH_MS 120        /* a box stays lit this long when a pulse reaches it */
#define NAME_MS 900         /* a wire keeps its note name this long after the pulse arrives */
#define NPULSE 8            /* pulses in flight per wire, oldest replaced first */

/* ── ports and routes ──────────────────────────────────────────────────── */

enum { PORT_IN = 0, PORT_OUT = 1 };

#define A ROUTE_ABSENT
typedef struct {
  const char *say;        /* drawn under the boxes, plain words */
  uint8_t nops;
  route_opdef op[ROUTE_MAX_OPS];
} route_t;

static const route_t ROUTES[] = {
  { "as played", 0, { { .code = 0 } } },
  { "+12 octave up", 1, { { .code = ROUTE_OP_TRANSPOSE, .arg = { 12, A, A, A, A } } } },
};
#undef A
#define NROUTES ((int)(sizeof ROUTES / sizeof ROUTES[0]))

/* ── state ─────────────────────────────────────────────────────────────── */

static route_core core;
static midi_parser parser;
static int route = -1;

typedef struct { uint32_t t0; uint8_t note; uint8_t used; } pulse_t;
static pulse_t pulses[2][NPULSE];      /* [0] KEYS to PICO, [1] PICO to SYNTH */
static int pnext[2];

static uint32_t now_ms(void) { return to_ms_since_boot(get_absolute_time()); }

static void pulse_add(int leg, uint8_t note, uint32_t t0) {
  pulse_t *p = &pulses[leg][pnext[leg]];
  pnext[leg] = (pnext[leg] + 1) % NPULSE;
  p->t0 = t0; p->note = note; p->used = 1;
}

/* RX: the interrupt empties the FIFO into this ring. */
#define RX_RING 512
static volatile uint8_t rx_ring[RX_RING];
static volatile uint16_t rx_head, rx_tail;

static void on_uart_rx(void) {
  while (uart_is_readable(MIDI_UART)) {
    uint8_t b = (uint8_t)uart_get_hw(MIDI_UART)->dr;
    uint16_t next = (uint16_t)((rx_head + 1) % RX_RING);
    if (next == rx_tail) continue;
    rx_ring[rx_head] = b;
    rx_head = next;
  }
}

/* TX: what the core sends waits here for room in the FIFO. */
#define TX_RING 1024
static uint8_t tx_ring[TX_RING];
static uint16_t tx_head, tx_tail;

static void tx_put(const uint8_t *b, uint16_t n) {
  for (uint16_t i = 0; i < n; i++) {
    uint16_t next = (uint16_t)((tx_head + 1) % TX_RING);
    if (next == tx_tail) return;
    tx_ring[tx_head] = b[i];
    tx_head = next;
  }
}

static void tx_drain(void) {
  while (tx_tail != tx_head && uart_is_writable(MIDI_UART)) {
    uart_get_hw(MIDI_UART)->dr = tx_ring[tx_tail];
    tx_tail = (uint16_t)((tx_tail + 1) % TX_RING);
  }
}

static bool note_on(const uint8_t *b, uint16_t len) {
  return len == 3 && (b[0] & 0xF0) == 0x90 && b[2];
}

/* Everything the core sends. ⚠️ MUST NOT CALL BACK INTO THE CORE. */
static void emit(void *ctx, uint8_t port, uint32_t t, const uint8_t *b, uint16_t len, uint16_t link) {
  (void)ctx; (void)t; (void)link;
  if (port != PORT_OUT) return;
  tx_put(b, len);
  /* the second leg starts when the first one has arrived */
  if (note_on(b, len)) pulse_add(1, b[1], now_ms() + LEG_MS);
}

static void on_message(void *ctx, const uint8_t *b, uint16_t len) {
  (void)ctx;
  if (note_on(b, len)) pulse_add(0, b[1], now_ms());
  route_input(&core, PORT_IN, now_ms(), b, len);
}

static void route_set(int next) {
  if (next < 0 || next >= NROUTES || next == route) return;
  if (route >= 0) route_unlink(&core, (uint16_t)(route + 1), now_ms());
  route_link(&core, (uint16_t)(next + 1), PORT_IN, PORT_OUT, ROUTES[next].op, ROUTES[next].nops);
  route = next;
}

/* ── the keys ──────────────────────────────────────────────────────────── */

/* Read once a frame, which is the debounce: a bounce is over well inside
 * 33 ms, and the page holds a key at least 40 ms, so a press is always seen. */
static bool down[2];

static bool keys_poll(void) {
  bool changed = false;
  for (int k = 0; k < 2; k++) {
    bool raw = !gpio_get(KEY_PIN[k]);     /* pressed pulls to ground */
    if (raw && !down[k] && k != route) { route_set(k); changed = true; }
    down[k] = raw;
  }
  return changed;
}

/* ── drawing ───────────────────────────────────────────────────────────── */

static uint8_t *fb;

static void px(int x, int y, bool on) {
  if ((unsigned)x >= SSD1306_W || (unsigned)y >= SSD1306_H) return;
  uint8_t *b = &fb[(y >> 3) * SSD1306_W + x], m = (uint8_t)(1u << (y & 7));
  if (on) *b |= m; else *b &= (uint8_t)~m;
}

static void fill(int x, int y, int w, int h, bool on) {
  for (int j = 0; j < h; j++) for (int i = 0; i < w; i++) px(x + i, y + j, on);
}

#define ADV 6
static int text_w(const char *s) { int n = (int)strlen(s); return n ? n * ADV - 1 : 0; }

static void text(int x, int y, const char *s, bool on) {
  for (; *s; s++, x += ADV) {
    char c = *s < 32 || *s > 126 ? '?' : *s;
    const uint8_t *g = &font_glcd5x7[(c - 32) * 5];
    for (int i = 0; i < 5; i++) for (int j = 0; j < 8; j++) if (g[i] & (1u << j)) px(x + i, y + j, on);
  }
}

/* A patchbay box: a rounded outline and its name, or filled and the name cut
 * out of it while lit. */
#define BOX_H 15
#define BOX_PAD 2
static int box_w(const char *name) { return text_w(name) + 2 * BOX_PAD + 2; }

static void box(int x, int y, const char *name, bool lit) {
  int w = box_w(name);
  if (lit) {
    fill(x + 1, y, w - 2, BOX_H, true);
    fill(x, y + 1, 1, BOX_H - 2, true);
    fill(x + w - 1, y + 1, 1, BOX_H - 2, true);
  } else {
    fill(x + 1, y, w - 2, 1, true);
    fill(x + 1, y + BOX_H - 1, w - 2, 1, true);
    fill(x, y + 1, 1, BOX_H - 2, true);
    fill(x + w - 1, y + 1, 1, BOX_H - 2, true);
  }
  text(x + 1 + BOX_PAD, y + (BOX_H - 7) / 2, name, !lit);
}

static const char *const NOTE[12] = { "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" };
static void note_name(char *out, uint8_t n) {
  int oct = n / 12 - 1;
  strcpy(out, NOTE[n % 12]);
  size_t k = strlen(out);
  if (oct < 0) { out[k++] = '-'; oct = -oct; }
  out[k++] = (char)('0' + oct);
  out[k] = 0;
}

/* The layout, worked out once from the three names. */
static const char *const NAMES[3] = { "KEYS", "PICO", "SYNTH" };
#define BOX_Y 10
#define WIRE_Y (BOX_Y + BOX_H / 2)
#define NAME_Y (BOX_Y + BOX_H + 5)
#define SAY_Y 48
static int bx[3], wire_x0[2], wire_x1[2];

static void layout(void) {
  int w0 = box_w(NAMES[0]), w1 = box_w(NAMES[1]), w2 = box_w(NAMES[2]);
  int wire = (SSD1306_W - w0 - w1 - w2) / 2;
  bx[0] = 0;
  bx[1] = w0 + wire;
  bx[2] = SSD1306_W - w2;
  wire_x0[0] = w0;          wire_x1[0] = bx[1] - 1;
  wire_x0[1] = bx[1] + w1;  wire_x1[1] = bx[2] - 1;
}

/* Draws one frame. Answers whether anything is still moving. */
static bool redraw(uint32_t t) {
  bool moving = false;
  bool lit[3] = { false, false, false };
  ssd1306_clear();

  for (int leg = 0; leg < 2; leg++) {
    int x0 = wire_x0[leg], x1 = wire_x1[leg];
    fill(x0, WIRE_Y, x1 - x0 + 1, 1, true);
    const pulse_t *last = NULL;
    for (int i = 0; i < NPULSE; i++) {
      pulse_t *p = &pulses[leg][i];
      if (!p->used) continue;
      int32_t age = (int32_t)(t - p->t0);
      if (age < 0) { moving = true; continue; }                  /* waiting for the first leg */
      if (age < LEG_MS) {
        int x = x0 + (x1 - x0) * age / LEG_MS;
        fill(x - 1, WIRE_Y - 1, 3, 3, true);
        moving = true;
      } else if (age < LEG_MS + FLASH_MS) {
        lit[leg + 1] = true;
        moving = true;
      }
      if (leg == 0 && age < FLASH_MS) lit[0] = true;           /* the key that sent it */
      if (age < LEG_MS + NAME_MS) {
        moving = true;
        if (!last || (int32_t)(p->t0 - last->t0) > 0) last = p;
      } else p->used = 0;
    }
    if (last) {
      char nm[6];
      note_name(nm, last->note);
      text((x0 + x1 + 1 - text_w(nm)) / 2, NAME_Y, nm, true);
    }
  }
  for (int b = 0; b < 3; b++) box(bx[b], BOX_Y, NAMES[b], lit[b]);

  const char *say = ROUTES[route].say;
  text((SSD1306_W - text_w(say)) / 2, SAY_Y, say, true);
  return moving;
}

int main(void) {
  uart_init(MIDI_UART, MIDI_BAUD);
  gpio_set_function(MIDI_TX_PIN, GPIO_FUNC_UART);
  gpio_set_function(MIDI_RX_PIN, GPIO_FUNC_UART);
  uart_set_format(MIDI_UART, 8, 1, UART_PARITY_NONE);
  uart_set_hw_flow(MIDI_UART, false, false);
  irq_set_exclusive_handler(UART0_IRQ, on_uart_rx);
  irq_set_enabled(UART0_IRQ, true);
  uart_set_irq_enables(MIDI_UART, true, false);

  i2c_init(OLED_I2C, OLED_HZ);
  gpio_set_function(OLED_SDA, GPIO_FUNC_I2C);
  gpio_set_function(OLED_SCL, GPIO_FUNC_I2C);
  gpio_pull_up(OLED_SDA);
  gpio_pull_up(OLED_SCL);

  for (int k = 0; k < 2; k++) {
    gpio_init(KEY_PIN[k]);
    gpio_set_dir(KEY_PIN[k], GPIO_IN);
    gpio_pull_up(KEY_PIN[k]);
  }

  route_init(&core, emit, NULL);
  route_port(&core, PORT_IN, ROUTE_IN, 0xFF, NULL, NULL, 0);
  route_port(&core, PORT_OUT, ROUTE_OUT, 0xFF, NULL, NULL, 0);
  route_set(0);
  midi_parse_init(&parser, on_message, NULL);
  layout();
  ssd1306_init(OLED_I2C, OLED_ADDR);
  fb = ssd1306_buffer();

  bool dirty = true, moving = false, sending = false;
  absolute_time_t next = get_absolute_time();
  for (;;) {
    while (rx_tail != rx_head) {
      uint8_t b = rx_ring[rx_tail];
      rx_tail = (uint16_t)((rx_tail + 1) % RX_RING);
      midi_parse_byte(&parser, b);
      dirty = true;
    }
    tx_drain();
    if (sending) { sending = ssd1306_step(); continue; }   /* one page, then look at the UART again */
    if (time_reached(next)) {
      if (keys_poll()) dirty = true;
      if (dirty || moving) {
        dirty = false;
        moving = redraw(now_ms());
        ssd1306_show();
        sending = true;
      }
      next = delayed_by_us(next, FRAME_US);
      if (absolute_time_diff_us(get_absolute_time(), next) < 0) next = get_absolute_time();   /* behind: do not sprint */
      continue;
    }
    if (tx_tail == tx_head && rx_tail == rx_head) best_effort_wfe_or_timeout(next);
  }
}
