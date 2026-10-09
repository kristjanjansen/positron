/* rig/pico/rings/main.c: the rings of /concepts/14/, drawn on a 128x64 SSD1306
 * by a plain RP2040 Pico, from MIDI on its DIN in.
 *
 *   UART0 at 31250 baud, GP1 RX                   DIN MIDI in
 *   I2C0 at 400 kHz, GP4 SDA and GP5 SCL, 0x3C   the SSD1306 of rig/pico/oled/
 *
 * Every pitch from C3 to G4 (48..67) has its own ring around the centre of the
 * screen, low notes inside. A pen sits at the top and the picture turns
 * clockwise under it at 0.7 rad/s, the speed of the shader on that page, so a
 * held note draws an arc on its ring for as long as it is held. On release the
 * arc stops growing, keeps turning and fades over 3 s.
 *
 * ⚠️ THE PANEL IS ONE BIT, SO A FADE IS THINNING. Brightness is the stroke's
 * fade times CC 7 (volume), as the shader does it, and it picks how many of the
 * arc's pixels are drawn: every one, every 2nd, every 4th, every 8th, then none.
 *
 * ⚠️ NO FLOATS IN THE DRAWING. A Cortex-M0+ has no FPU, so an angle is a
 * uint32 where 2^32 is a whole turn, and sine comes from a 1024 entry Q14 table
 * built once at boot. Between frames the core sleeps until the next one, which
 * on the emulator in /concepts/14/ costs nothing to emulate.
 *
 * Shares the router's display and MIDI parser, compiled from
 * rig/pico/firmware/ and never copied.
 */
#include <math.h>
#include <string.h>

#include "pico/stdlib.h"
#include "hardware/i2c.h"
#include "hardware/irq.h"
#include "hardware/uart.h"

#include "midi_parse.h"
#include "ssd1306.h"

#define MIDI_UART uart0
#define MIDI_RX_PIN 1
#define MIDI_BAUD 31250

#define OLED_I2C i2c0
#define OLED_SDA 4
#define OLED_SCL 5
#define OLED_ADDR 0x3C
#define OLED_HZ 400000

#define FRAME_US 33333      /* 30 frames a second */
#define LO 48               /* C3, the innermost ring */
#define HI 67               /* G4, the outermost */
#define R_IN 4              /* pixels, the ring of LO */
#define R_OUT 28            /* pixels, the ring of HI: 64 high, a pen above it */
#define LIFE_MS 3000        /* a released arc fades out over this */
#define MAXS 48             /* strokes kept, oldest dropped first */
/* 0.7 rad/s as a uint32 turn per millisecond: 0.7 / (2 pi) * 2^32 / 1000 */
#define TURN_PER_MS 478499u
#define FULL_SPAN 0xFC000000u   /* a held note never closes its ring: 2 pi less a little */

/* ── sine, Q14, 1024 to a turn ─────────────────────────────────────────── */

static int16_t SIN[1024];

static void sin_init(void) {
  for (int i = 0; i < 1024; i++) SIN[i] = (int16_t)lroundf(16384.0f * sinf((float)i * 6.2831853f / 1024.0f));
}
static inline int32_t isin(uint32_t a) { return SIN[a >> 22]; }
static inline int32_t icos(uint32_t a) { return SIN[(a + 0x40000000u) >> 22]; }

/* ── the strokes ───────────────────────────────────────────────────────── */

typedef struct {
  uint8_t n;            /* the pitch */
  bool held;
  uint32_t on, off;     /* ms since boot */
} stroke_t;

static stroke_t strokes[MAXS];
static int nstrokes;
static int pen[128];    /* note -> index of its stroke while held, -1 none */
static uint8_t volume = 100;   /* CC 7, starts where the knob on the page starts */

static void drop_oldest(void) {
  memmove(&strokes[0], &strokes[1], (size_t)(nstrokes - 1) * sizeof strokes[0]);
  nstrokes--;
  for (int n = 0; n < 128; n++) if (pen[n] >= 0) pen[n]--;   /* a held one at 0 is lost */
}

static uint32_t now_ms(void) { return to_ms_since_boot(get_absolute_time()); }

static void note_on(uint8_t n) {
  if (n < LO || n > HI || pen[n] >= 0) return;
  if (nstrokes == MAXS) drop_oldest();
  strokes[nstrokes] = (stroke_t){ n, true, now_ms(), 0 };
  pen[n] = nstrokes++;
}

static void note_off(uint8_t n) {
  if (n >= 128 || pen[n] < 0) return;
  strokes[pen[n]].held = false;
  strokes[pen[n]].off = now_ms();
  pen[n] = -1;
}

static void on_message(void *ctx, const uint8_t *b, uint16_t len) {
  (void)ctx;
  if (len < 3) return;
  uint8_t st = b[0] & 0xF0;
  if (st == 0x90 && b[2]) note_on(b[1]);
  else if (st == 0x80 || st == 0x90) note_off(b[1]);
  else if (st == 0xB0 && b[1] == 7) volume = b[2];
  else if (st == 0xB0 && (b[1] == 123 || b[1] == 120)) for (int n = 0; n < 128; n++) note_off((uint8_t)n);
}

/* ── the UART ring, filled by the interrupt ────────────────────────────── */

#define RX_RING 256
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

/* ── drawing ───────────────────────────────────────────────────────────── */

static uint8_t *fb;

static inline void px(int x, int y) {
  if ((unsigned)x < SSD1306_W && (unsigned)y < SSD1306_H) fb[(y >> 3) * SSD1306_W + x] |= (uint8_t)(1u << (y & 7));
}

/* An arc on a ring of radius r pixels, clockwise from angle a0 (0 at the top)
 * for span, one point per pixel of arc, every `every`th of them drawn. */
static void arc(int r, uint32_t a0, uint32_t span, int every) {
  const int cx = SSD1306_W / 2, cy = SSD1306_H / 2;
  /* one pixel of arc is 2^32 / (2 pi r) of a turn */
  uint32_t step = (uint32_t)(683565275u / (uint32_t)r);
  uint32_t steps = span / step + 1;
  int lx = -999, ly = -999, k = 0;
  for (uint32_t i = 0; i <= steps; i++) {
    uint32_t a = a0 + (i < steps ? i * step : span);
    int x = cx + (int)((r * isin(a) + 8192) >> 14);
    int y = cy - (int)((r * icos(a) + 8192) >> 14);
    if (x == lx && y == ly) continue;
    lx = x; ly = y;
    if (k++ % every == 0) px(x, y);
  }
}

static void redraw(uint32_t t) {
  ssd1306_clear();
  /* the pen, at the top, above the outermost ring */
  px(SSD1306_W / 2, 0); px(SSD1306_W / 2, 1);
  for (int i = 0; i < nstrokes; i++) {
    const stroke_t *s = &strokes[i];
    uint32_t end = s->held ? t : s->off;
    uint32_t dur = end - s->on;
    uint64_t sp = (uint64_t)dur * TURN_PER_MS;
    uint32_t span = sp > FULL_SPAN ? FULL_SPAN : (uint32_t)sp;
    /* a point drawn at time u sits turn(t) - turn(u) clockwise of the pen */
    uint32_t start = (t - end) * TURN_PER_MS;
    /* brightness in 1/127ths: fade times volume, and the fade is linear */
    int fade = s->held ? 1000 : 1000 - (int)((t - s->off) * 1000 / LIFE_MS);
    if (fade <= 0) continue;
    int level = fade * volume / 1000;          /* 0..127 */
    int every = level > 84 ? 1 : level > 42 ? 2 : level > 16 ? 4 : level > 4 ? 8 : 0;
    if (!every) continue;
    int r = R_IN + (R_OUT - R_IN) * (s->n - LO) / (HI - LO);
    arc(r, start, span, every);
  }
  /* strokes that have faded out leave from the front, as on the page */
  while (nstrokes && !strokes[0].held && t - strokes[0].off > LIFE_MS) drop_oldest();
}

static void flush(void) {
  ssd1306_show();
  while (ssd1306_step()) {}
}

int main(void) {
  uart_init(MIDI_UART, MIDI_BAUD);
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

  midi_parser parser;
  midi_parse_init(&parser, on_message, NULL);
  for (int n = 0; n < 128; n++) pen[n] = -1;
  sin_init();
  ssd1306_init(OLED_I2C, OLED_ADDR);
  fb = ssd1306_buffer();

  absolute_time_t next = get_absolute_time();
  for (;;) {
    while (rx_tail != rx_head) {
      uint8_t b = rx_ring[rx_tail];
      rx_tail = (uint16_t)((rx_tail + 1) % RX_RING);
      midi_parse_byte(&parser, b);
    }
    redraw(now_ms());
    flush();
    next = delayed_by_us(next, FRAME_US);
    if (absolute_time_diff_us(get_absolute_time(), next) < 0) next = get_absolute_time();   /* behind: do not sprint */
    sleep_until(next);
  }
}
