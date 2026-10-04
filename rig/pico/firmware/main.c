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
#include "ui.h"

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
#define DOT_MS 150         /* an activity dot stays lit this long after traffic */

/* ── ports ─────────────────────────────────────────────────────────────── */

enum {
  PORT_DIN_IN = 0,
  PORT_DIN_OUT = 1,
  /* PORT_USB_IN = 2, PORT_USB_OUT = 3: the USB MIDI host seam, not built */
};

/* ── scenes ────────────────────────────────────────────────────────────── */

#define A ROUTE_ABSENT
typedef struct {
  const char *name;       /* the header's right half, capitals, 12 at most */
  const char *ops;        /* the ops as a person reads them, drawn on the arrow */
  uint8_t nops;
  route_opdef op[ROUTE_MAX_OPS];
} scene_t;

static const scene_t SCENES[] = {
  { "THRU", "THRU CH1", 1, {
      { ROUTE_OP_CHANNEL, { 1, A, A, A, A } } } },
  { "OCTAVE UP", "+12 CH2", 2, {
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
static uint32_t seen_in, seen_out;     /* now_ms() + 1 of the last traffic, 0 never */
static bool drawn_in, drawn_out;       /* what the dots showed on the last redraw */

/* Which font the screen uses. A constant in FLASH with a marker in front of
 * it, so a UF2 can be re-pointed at another font by patching ONE byte: the
 * emulator finds "UIFONT" in its flash image and writes the index of a
 * UI_FONTS entry into byte 6 (0xFF keeps UI_FONT_DEFAULT). volatile, so the
 * compiler reads the byte instead of folding the 0xFF it sees here. */
static const volatile uint8_t FONT_PICK[8] __attribute__((used)) = { 'U', 'I', 'F', 'O', 'N', 'T', 0xFF, 0 };

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
  seen_out = now_ms() + 1;
  dirty = true;
}

/* One whole message or SysEx chunk from any input port. */
static void router_in(uint8_t port, const uint8_t *bytes, uint16_t len) {
  int held_before = route_held(&core, PORT_DIN_OUT);
  int sent = route_input(&core, port, now_ms(), bytes, len);
  n_in++;
  seen_in = now_ms() + 1;
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
      dirty = true;                       /* the footer and the deny meter follow the keys */
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

/* ── the screen ────────────────────────────────────────────────────────────
 *
 *   ┌──────────────────────────────┐
 *   │SCENE 2/2            OCTAVE UP│  header: inverted bar, scene and name
 *   │            +12 CH2           │
 *   │[DIN IN]──────────────>[DIN OUT]  the link: two ports and the ops on it
 *   │                              │
 *   │o IN 4                 o OUT 4│  activity: a dot per port, lit 150 ms;
 *   │                              │  DROP n between them once anything drops
 *   ├───────┬───────┬───────┬──────┤
 *   │ PREV  │ NEXT  │ STOP  │  OK  │  footer: what each button does
 *   └──────────────────────────────┘
 *
 * While the gate holds a message the link is replaced by a banner reading
 * HOLD: REPLACE PATCH, the line under it says what K4 does, and the K4 cell
 * is filled and reads OK/NO. Holding K4 fills a meter toward the 1 s deny.
 * Every size comes from the current font, so any UI_FONTS entry lays out. */

static bool dot_lit(uint32_t seen, uint32_t t) { return seen && t + 1 - seen < DOT_MS; }

/* The activity row: a dot and a count under each port. DROP appears only
 * when something was dropped, so it reads as an alert and not as furniture. */
static void draw_activity(int y, uint32_t t) {
  const ui_font *f = ui_font_get();
  char cin[16], cout[16], cdrop[16];
  int wi, wo, wd, dy = y + (f->cap - 5) / 2;
  snprintf(cin, sizeof cin, "IN %lu", (unsigned long)n_in);
  snprintf(cout, sizeof cout, "OUT %lu", (unsigned long)n_out);
  cdrop[0] = 0;
  if (n_dropped) snprintf(cdrop, sizeof cdrop, "DROP %lu", (unsigned long)n_dropped);
  wi = 8 + ui_text_w(cin); wo = 8 + ui_text_w(cout); wd = ui_text_w(cdrop);
  if (cdrop[0] && wi + wo + wd + 12 > UI_W) {
    /* A wide font: the drops matter more than the words IN and OUT, which
     * the boxes above already name. */
    snprintf(cin, sizeof cin, "%lu", (unsigned long)n_in);
    snprintf(cout, sizeof cout, "%lu", (unsigned long)n_out);
    wi = 8 + ui_text_w(cin); wo = 8 + ui_text_w(cout);
  }
  drawn_in = dot_lit(seen_in, t);
  drawn_out = dot_lit(seen_out, t);
  ui_dot(0, dy, drawn_in);
  ui_text(8, y, cin);
  ui_dot(UI_W - wo, dy, drawn_out);
  ui_text(UI_W - wo + 8, y, cout);
  if (cdrop[0]) ui_text(wi + (UI_W - wo - wi - wd) / 2, y, cdrop);   /* centred in the gap */
}

static void redraw(uint32_t t) {
  const ui_font *f = ui_font_get();
  const scene_t *S = &SCENES[scene];
  const int T = f->cap;
  int held = route_held(&core, PORT_DIN_OUT);
  char left[32], banner[40];
  const char *label[4] = { "PREV", "NEXT", "STOP", "OK" };
  int top, bottom, avail, g;

  ui_clear();

  snprintf(left, sizeof left, "SCENE %d/%d", scene + 1, NSCENES);
  if (ui_text_w(left) + 6 + ui_text_w(S->name) > UI_W - 4)
    snprintf(left, sizeof left, "%d/%d", scene + 1, NSCENES);
  top = ui_header(left, S->name) + 1;

  if (held) label[3] = ui_text_w("OK/NO") <= 29 ? "OK/NO" : "OK";
  bottom = ui_footer(label, held ? 8u : 0u) - 1;   /* the last free row */
  avail = bottom - top + 1;

  if (!held) {
    /* [DIN IN] ---ops---> [DIN OUT]: the ops ride just above the arrow
     * when they fit between the boxes, else on their own line above. */
    int bh = ui_box_h(), wl = ui_box_w("DIN IN"), wr = ui_box_w("DIN OUT");
    int ax1 = wl + 2, ax2 = UI_W - wr - 3, ow = ui_text_w(S->ops);
    int ops_rel, ops_x, by, ay;
    if (ow <= ax2 - ax1 - 4) { ops_rel = bh / 2 - 2 - T; ops_x = ax1 + (ax2 - ax1 + 1 - ow) / 2; }
    else { ops_rel = -2 - T; ops_x = (UI_W - ow) / 2; }
    if (ops_rel > 0) ops_rel = 0;
    g = (avail - (bh + T - ops_rel)) / 3;
    by = top + g - ops_rel;
    ay = by + bh / 2;
    ui_box(0, by, wl, bh, "DIN IN");
    ui_box(UI_W - wr, by, wr, bh, "DIN OUT");
    ui_arrow(ax1, ax2, ay);
    ui_text(ops_x, by + ops_rel, S->ops);
    draw_activity(by + bh + g, t);
  } else {
    int lines, bh, sy, by;
    if (held > 1) snprintf(banner, sizeof banner, "HOLD %d: REPLACE PATCH", held);
    else snprintf(banner, sizeof banner, "HOLD: REPLACE PATCH");
    if (ui_text_w(banner) > UI_W - 4) {
      if (held > 1) snprintf(banner, sizeof banner, "HOLD %d:\nREPLACE PATCH", held);
      else snprintf(banner, sizeof banner, "HOLD:\nREPLACE PATCH");
      lines = 2;
    } else lines = 1;
    bh = lines * (T + 3) - 3 + 6;
    g = (avail - (bh + 3 + T + T)) / 3;
    if (g < 2) {
      /* No room for the hint line under the banner (a big font with a two
       * line banner): leave it out, the filled K4 cell still says OK. */
      g = (avail - (bh + T)) / 3;
      ui_banner(top + g, bh, banner);
      draw_activity(top + g + bh + g, t);
      ssd1306_show();
      return;
    }
    by = top + g;
    sy = by + bh + 3;
    ui_banner(by, bh, banner);
    if (keys[3].down && !keys[3].long_fired) {
      /* K4 is down: release now is OK, keep holding and this fills to NO. */
      int nw = ui_text_w("NO");
      ui_meter(0, sy - 1, UI_W - nw - 4, T + 2, (int)(t - keys[3].pressed_at), DENY_HOLD_MS);
      ui_text(UI_W - nw, sy, "NO");
    } else {
      const char *hint = "TAP OK, HOLD NO";
      ui_text((UI_W - ui_text_w(hint)) / 2, sy, hint);
    }
    draw_activity(sy + T + g, t);
  }
  ssd1306_show();
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
  ui_bind(ssd1306_buffer());
  ui_font_set(FONT_PICK[6] < UI_NFONTS ? UI_FONTS[FONT_PICK[6]] : UI_FONT_DEFAULT);

  for (;;) {
    uint32_t t = now_ms();
    while (rx_tail != rx_head) {
      uint8_t b = rx_ring[rx_tail];
      rx_tail = (uint16_t)((rx_tail + 1) % RX_RING);
      midi_parse_byte(&din_parser, b);
    }
    tx_drain();
    if (t != last_keys) { last_keys = t; keys_poll(t); }
    if (dot_lit(seen_in, t) != drawn_in || dot_lit(seen_out, t) != drawn_out) dirty = true;
    if (keys[3].down && !keys[3].long_fired && route_held(&core, PORT_DIN_OUT)) dirty = true;  /* the meter fills */
    if (dirty && t - last_draw >= REDRAW_MS) { dirty = false; last_draw = t; redraw(t); }
    ssd1306_step();                       /* one page, about 3.5 ms */
    tx_drain();
  }
}
