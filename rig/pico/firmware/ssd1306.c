/* rig/pico/firmware/ssd1306.c: see ssd1306.h.
 *
 * The init sequence is the micropython-lib driver's (rig/pico/sim/ssd1306.py),
 * the one the real board in rig/pico/oled/ has already been lit with, so the
 * C build and the MicroPython build put the same commands on the wire.
 */
#include "ssd1306.h"

#include <string.h>

static i2c_inst_t *bus;
static uint8_t address;
static uint8_t fb[SSD1306_W * SSD1306_PAGES];  /* page major: byte = 8 vertical pixels */
static int next_page = -1;                     /* -1: nothing on its way */

static void cmd(uint8_t c) {
  uint8_t b[2] = { 0x80, c };                  /* Co=1, D/C=0: one command byte */
  i2c_write_blocking(bus, address, b, 2, false);
}

void ssd1306_init(i2c_inst_t *i2c, uint8_t addr) {
  static const uint8_t seq[] = {
    0xAE,             /* display off */
    0x20, 0x00,       /* horizontal addressing */
    0x40,             /* start line 0 */
    0xA1,             /* column 127 is SEG0 */
    0xA8, 63,         /* multiplex 64 */
    0xC8,             /* scan COM[N] to COM0 */
    0xD3, 0x00,       /* no offset */
    0xDA, 0x12,       /* COM pins for 128x64 */
    0xD5, 0x80,       /* clock divide */
    0xD9, 0xF1,       /* precharge, internal VCC */
    0xDB, 0x30,       /* VCOM deselect */
    0x81, 0xFF,       /* contrast */
    0xA4,             /* follow RAM */
    0xA6,             /* not inverted */
    0x8D, 0x14,       /* charge pump on */
    0xAF,             /* display on */
  };
  size_t i;
  bus = i2c;
  address = addr;
  for (i = 0; i < sizeof seq; i++) cmd(seq[i]);
  ssd1306_clear();
}

void ssd1306_clear(void) { memset(fb, 0, sizeof fb); }

uint8_t *ssd1306_buffer(void) { return fb; }

void ssd1306_show(void) { next_page = 0; }

bool ssd1306_step(void) {
  uint8_t buf[1 + SSD1306_W];
  if (next_page < 0) return false;
  cmd(0x21); cmd(0); cmd(SSD1306_W - 1);      /* columns 0..127 */
  cmd(0x22); cmd((uint8_t)next_page); cmd((uint8_t)next_page);
  buf[0] = 0x40;                               /* Co=0, D/C=1: data to the end */
  memcpy(&buf[1], &fb[next_page * SSD1306_W], SSD1306_W);
  i2c_write_blocking(bus, address, buf, sizeof buf, false);
  if (++next_page >= SSD1306_PAGES) next_page = -1;
  return next_page >= 0;
}
