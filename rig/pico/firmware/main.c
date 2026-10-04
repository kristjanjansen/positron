/* rig/pico/firmware/main.c: a two port DIN MIDI router on a Pico, with the
 * routing core of rig/route-core/ unchanged at its centre.
 *
 *   UART0 at 31250 baud, GP0 TX and GP1 RX       DIN MIDI out and in
 *   I2C0 at 400 kHz, GP4 SDA and GP5 SCL, 0x3C   the SSD1306 of rig/pico/oled/
 *   GP10..GP13 to ground, pulled up              K1..K4
 *
 * The table is fixed at build time: port 0 is DIN in, port 1 is DIN out, and
 * two scenes each make one link from 0 to 1. Changing scene is a DIFF: unlink
 * the old link (the core releases its held notes and sends CC 123 on every
 * channel it played) and then link the new one.
 *
 *   K1 previous scene, K2 next scene, K3 panic (CC 123 on all 16 channels),
 *   K4 confirm what the gate holds, K4 held for 1 s deny it.
 *
 * ⚠️ THE SEAM FOR USB MIDI HOST is `router_in()` and the switch in `emit()`.
 * A USB host adapter (tinyusb, not linked today) gets whole messages from its
 * USB-MIDI event packets, so it calls `router_in(PORT_USB_IN, ...)` directly
 * and needs no byte parser; its output is one more case in `emit()`. The core
 * already has room for 32 ports.
 */
#include <stdio.h>
#include <string.h>

#include "pico/stdlib.h"
#include "hardware/i2c.h"
#include "hardware/irq.h"
#include "hardware/sync.h"
#include "hardware/uart.h"

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

static const uint8_t KEY_PIN[4] = { 10, 11, 12, 13 };   /* K1..K4 */
#define DEBOUNCE_MS 20
#define DENY_HOLD_MS 1000
#define REDRAW_MS 30

/* ── ports ─────────────────────────────────────────────────────────────── */

enum {
  PORT_DIN_IN = 0,
  PORT_DIN_OUT = 1,
  /* PORT_USB_IN = 2, PORT_USB_OUT = 3: the USB MIDI host seam, not built */
};

/* ── scenes ────────────────────────────────────────────────────────────── */

#define A ROUTE_ABSENT
typedef struct {
  const char *name;       /* 16 characters at most, it is one screen line */
  const char *ops;        /* the ops as a person reads them, one screen line */
  uint8_t nops;
  route_opdef op[ROUTE_MAX_OPS];
} scene_t;

static const scene_t SCENES[] = {
  { "thru", "ch 1", 1, {
      { ROUTE_OP_CHANNEL, { 1, A, A, A, A } } } },
  { "octave up", "tr +12 ch 2", 2, {
      { ROUTE_OP_TRANSPOSE, { 12, A, A, A, A } },
      { ROUTE_OP_CHANNEL, { 2, A, A, A, A } } } },
};
#undef A
#define NSCENES ((int)(sizeof SCENES / sizeof SCENES[0]))

/* ── state ─────────────────────────────────────────────────────────────── */

static route_core core;
static midi_parser din_parser;
static int scene = -1;                 /* index into SCENES, -1 before the first */
static uint32_t n_in, n_out, n_dropped;
static volatile bool dirty = true;

/* RX: the UART interrupt empties the 32 byte FIFO into this ring, so an I2C
 * page write in the main loop never overruns it. */
#define RX_RING 512
static volatile uint8_t rx_ring[RX_RING];
static volatile uint16_t rx_head, rx_tail;
static volatile uint32_t rx_lost;

/* TX: the core's output lands here and the main loop drains it. A 350 byte
 * patch takes 112 ms on the wire at 31250 baud, far longer than the FIFO. */
#define TX_RING 2048
static uint8_t tx_ring[TX_RING];
static uint16_t tx_head, tx_tail;
static uint32_t tx_lost;

static uint32_t now_ms(void) { return to_ms_since_boot(get_absolute_time()); }

static void on_uart_rx(void) {
  while (uart_is_readable(MIDI_UART)) {
    uint8_t b = (uint8_t)uart_get_hw(MIDI_UART)->dr;
    uint16_t next = (uint16_t)((rx_head + 1) % RX_RING);
    if (next == rx_tail) { rx_lost++; continue; }
    rx_ring[rx_head] = b;
    rx_head = next;
  }
}

static void tx_put(const uint8_t *b, uint16_t n) {
  uint16_t i;
  for (i = 0; i < n; i++) {
    uint16_t next = (uint16_t)((tx_head + 1) % TX_RING);
    if (next == tx_tail) { tx_lost++; return; }
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

/* ── the core's edges ──────────────────────────────────────────────────── */

/* Everything the core sends. ⚠️ MUST NOT CALL BACK INTO THE CORE. */
static void emit(void *ctx, uint8_t port, uint32_t t, const uint8_t *bytes, uint16_t len, uint16_t link) {
  (void)ctx; (void)t; (void)link;
  switch (port) {
    case PORT_DIN_OUT: tx_put(bytes, len); break;
    /* case PORT_USB_OUT: the USB MIDI host seam */
    default: return;
  }
  n_out++;
  dirty = true;
}

/* One whole message or SysEx chunk from any input port. */
static void router_in(uint8_t port, const uint8_t *bytes, uint16_t len) {
  int held_before = route_held(&core, PORT_DIN_OUT);
  int sent = route_input(&core, port, now_ms(), bytes, len);
  n_in++;
  if (sent == 0 && route_held(&core, PORT_DIN_OUT) == held_before) n_dropped++;
  dirty = true;
}

static void on_din_message(void *ctx, const uint8_t *bytes, uint16_t len) {
  (void)ctx;
  router_in(PORT_DIN_IN, bytes, len);
}

/* ── the table ─────────────────────────────────────────────────────────── */

static void table_init(void) {
  /* Port 1 is a Novation Circuit's DIN in. SysEx passes, except a Replace
   * Patch (byte 6 = 01, which writes FLASH) that waits for K4. The rule is
   * vector 09's. Clock is allowed here, unlike vector 09's profile. */
  static const route_rule circuit_rules[1] = {
    { 7, ROUTE_CONFIRM, 0, { 0xF0, 0x00, 0x20, 0x29, 0x01, 0x60, 0x01, 0 } },
  };
  uint8_t policy[ROUTE_KINDS];
  int k;
  for (k = 0; k < ROUTE_KINDS; k++) policy[k] = ROUTE_UNSET;
  policy[ROUTE_SYSEX] = ROUTE_ALLOW;
  route_init(&core, emit, NULL);
  route_port(&core, PORT_DIN_IN, ROUTE_IN, 0xFF, NULL, NULL, 0);
  route_port(&core, PORT_DIN_OUT, ROUTE_OUT, 0xFF, policy, circuit_rules, 1);
}

/* The diff: the old link goes first, with its release, then the new one. */
static void scene_set(int next) {
  next = (next + NSCENES) % NSCENES;
  if (next == scene) return;
  if (scene >= 0) route_unlink(&core, (uint16_t)(scene + 1), now_ms());
  route_link(&core, (uint16_t)(next + 1), PORT_DIN_IN, PORT_DIN_OUT, SCENES[next].op, SCENES[next].nops);
  scene = next;
  dirty = true;
}

/* All notes off on every channel, straight to the wire, past the gate. */
static void all_notes_off(void) {
  uint8_t ch;
  for (ch = 0; ch < 16; ch++) {
    uint8_t m[3] = { (uint8_t)(0xB0 | ch), 123, 0 };
    emit(NULL, PORT_DIN_OUT, now_ms(), m, 3, ROUTE_NO_LINK);
  }
}

/* ── the screen ────────────────────────────────────────────────────────── */

static void redraw(void) {
  char line[SSD1306_COLS + 8];
  int held = route_held(&core, PORT_DIN_OUT);
  ssd1306_clear();
  ssd1306_text(0, "positron router");
  snprintf(line, sizeof line, "%d/%d %s", scene + 1, NSCENES, SCENES[scene].name);
  ssd1306_text(1, line);
  ssd1306_text(2, "din in>din out");
  ssd1306_text(3, SCENES[scene].ops);
  snprintf(line, sizeof line, "in   %lu", (unsigned long)n_in);
  ssd1306_text(4, line);
  snprintf(line, sizeof line, "out  %lu", (unsigned long)n_out);
  ssd1306_text(5, line);
  snprintf(line, sizeof line, "drop %lu", (unsigned long)n_dropped);
  ssd1306_text(6, line);
  if (held) {
    snprintf(line, sizeof line, "HELD %d: K4 ok", held);
    ssd1306_text(7, line);
  }
  ssd1306_show();
}

/* ── the keys ──────────────────────────────────────────────────────────── */

typedef struct {
  bool down;              /* debounced */
  bool raw;
  uint32_t since;         /* when raw last changed */
  uint32_t pressed_at;
  bool long_fired;
} button_t;

static button_t keys[4];

static void key_pressed(int k) {
  switch (k) {
    case 0: scene_set(scene - 1); break;
    case 1: scene_set(scene + 1); break;
    case 2: all_notes_off(); break;
    default: break;                       /* K4 acts on release or at 1 s */
  }
}

static void keys_poll(uint32_t t) {
  int k;
  for (k = 0; k < 4; k++) {
    button_t *K = &keys[k];
    bool raw = !gpio_get(KEY_PIN[k]);     /* pressed pulls to ground */
    if (raw != K->raw) { K->raw = raw; K->since = t; }
    if (raw != K->down && t - K->since >= DEBOUNCE_MS) {
      K->down = raw;
      if (raw) { K->pressed_at = t; K->long_fired = false; key_pressed(k); }
      else if (k == 3 && !K->long_fired) { route_confirm(&core, PORT_DIN_OUT, t); dirty = true; }
    }
    if (k == 3 && K->down && !K->long_fired && t - K->pressed_at >= DENY_HOLD_MS) {
      K->long_fired = true;
      route_deny(&core, PORT_DIN_OUT);
      dirty = true;
    }
  }
}

/* ── main ──────────────────────────────────────────────────────────────── */

int main(void) {
  int k;
  uint32_t last_draw = 0, last_keys = 0;

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

  for (k = 0; k < 4; k++) {
    gpio_init(KEY_PIN[k]);
    gpio_set_dir(KEY_PIN[k], GPIO_IN);
    gpio_pull_up(KEY_PIN[k]);
  }

  midi_parse_init(&din_parser, on_din_message, NULL);
  table_init();
  scene_set(0);
  ssd1306_init(OLED_I2C, OLED_ADDR);

  for (;;) {
    uint32_t t = now_ms();
    while (rx_tail != rx_head) {
      uint8_t b = rx_ring[rx_tail];
      rx_tail = (uint16_t)((rx_tail + 1) % RX_RING);
      midi_parse_byte(&din_parser, b);
    }
    tx_drain();
    if (t != last_keys) { last_keys = t; keys_poll(t); }
    if (dirty && t - last_draw >= REDRAW_MS) { dirty = false; last_draw = t; redraw(); }
    ssd1306_step();                       /* one page, about 3.5 ms */
    tx_drain();
  }
}
