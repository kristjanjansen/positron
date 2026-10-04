/* rig/pico/firmware/ui.c: see ui.h. */
#include "ui.h"

#include <string.h>

#include "font8x8.h"
#include "font_glcd5x7.h"
#include "font_misc4x6.h"
#include "font_misc5x7.h"
#include "font_spleen5x8.h"
#include "font_tomthumb.h"

/* ── the fonts ─────────────────────────────────────────────────────────────
 * Each table's header carries its source, its fetch and its licence.
 *   name        cell  adv  source                                 licence
 *   misc4x6     4x6   4    X11 misc-fixed 4x6, xorg font/misc-misc public domain
 *   misc5x7     5x7   5    X11 misc-fixed 5x7, xorg font/misc-misc public domain
 *   spleen5x8   5x8   5    Spleen 5x8 2.2.0, Frederic Cambus      BSD 2-Clause
 *   tomthumb    4x6   4    Tom Thumb 3x5, via Adafruit GFX        BSD 3-Clause
 *   glcd5x7     5x8   6    Adafruit GFX glcdfont.c "classic"      BSD 2-Clause
 *   petme8x8    8x8   8    MicroPython petme128                   MIT
 * The ORDER of UI_FONTS is read by rig/pico/sim/run-router.mjs to pick one by
 * index, so a new font goes on the end. */
const ui_font UI_FONT_MISC4X6   = { "misc4x6",   font_misc4x6,       4, 6, 4, 0, 5 };
const ui_font UI_FONT_MISC5X7   = { "misc5x7",   font_misc5x7,       5, 7, 5, 0, 6 };
const ui_font UI_FONT_SPLEEN5X8 = { "spleen5x8", font_spleen5x8,     5, 8, 5, 1, 6 };
const ui_font UI_FONT_TOMTHUMB  = { "tomthumb",  font_tomthumb,      4, 6, 4, 0, 5 };
const ui_font UI_FONT_GLCD5X7   = { "glcd5x7",   font_glcd5x7,       5, 8, 6, 0, 7 };
const ui_font UI_FONT_PETME8X8  = { "petme8x8",  font_petme128_8x8,  8, 8, 8, 0, 7 };

const ui_font *const UI_FONTS[] = {
  &UI_FONT_MISC4X6, &UI_FONT_MISC5X7, &UI_FONT_SPLEEN5X8,
  &UI_FONT_TOMTHUMB, &UI_FONT_GLCD5X7, &UI_FONT_PETME8X8,
};
const int UI_NFONTS = (int)(sizeof UI_FONTS / sizeof UI_FONTS[0]);
const ui_font *const UI_FONT_DEFAULT = &UI_FONT_GLCD5X7;

/* ── state: one pointer, one font, one clip ───────────────────────────────── */

static uint8_t *fb;
static const ui_font *font = &UI_FONT_GLCD5X7;
static int cx0, cy0, cx1 = UI_W, cy1 = UI_H;   /* clip, x1 and y1 exclusive */

void ui_bind(uint8_t *buffer) { fb = buffer; }
void ui_font_set(const ui_font *f) { if (f) font = f; }
const ui_font *ui_font_get(void) { return font; }

void ui_clip(int x, int y, int w, int h) {
  cx0 = x < 0 ? 0 : x;
  cy0 = y < 0 ? 0 : y;
  cx1 = x + w > UI_W ? UI_W : x + w;
  cy1 = y + h > UI_H ? UI_H : y + h;
}
void ui_unclip(void) { cx0 = 0; cy0 = 0; cx1 = UI_W; cy1 = UI_H; }

/* ── pixels ─────────────────────────────────────────────────────────────── */

void ui_clear(void) { if (fb) memset(fb, 0, UI_W * UI_H / 8); }

void ui_pixel(int x, int y, int c) {
  uint8_t *b, m;
  if (!fb || x < cx0 || x >= cx1 || y < cy0 || y >= cy1) return;
  b = &fb[(y >> 3) * UI_W + x];
  m = (uint8_t)(1u << (y & 7));
  if (c == UI_ON) *b |= m;
  else if (c == UI_OFF) *b &= (uint8_t)~m;
  else *b ^= m;
}

void ui_hline(int x, int y, int w, int c) { int i; for (i = 0; i < w; i++) ui_pixel(x + i, y, c); }
void ui_vline(int x, int y, int h, int c) { int i; for (i = 0; i < h; i++) ui_pixel(x, y + i, c); }

void ui_rect(int x, int y, int w, int h, int c) {
  if (w <= 0 || h <= 0) return;
  ui_hline(x, y, w, c);
  if (h > 1) ui_hline(x, y + h - 1, w, c);
  if (h > 2) { ui_vline(x, y + 1, h - 2, c); if (w > 1) ui_vline(x + w - 1, y + 1, h - 2, c); }
}

void ui_fill(int x, int y, int w, int h, int c) { int j; for (j = 0; j < h; j++) ui_hline(x, y + j, w, c); }

/* ── text ───────────────────────────────────────────────────────────────── */

int ui_text_w(const char *s) {
  int n = (int)strlen(s);
  return n ? n * font->adv - 1 : 0;
}

static void glyph(int x, int y, char ch, int c, int scale) {
  uint8_t g = (uint8_t)ch;
  const uint8_t *col;
  int i, j;
  if (g < 32 || g > 126) g = '?';
  col = &font->glyph[(g - 32) * font->w];
  for (i = 0; i < font->w; i++)
    for (j = 0; j < font->h; j++)
      if (col[i] >> j & 1) {
        if (scale == 1) ui_pixel(x + i, y + j, c);
        else ui_fill(x + i * scale, y + j * scale, scale, scale, c);
      }
}

int ui_text_c(int x, int y, const char *s, int c) {
  y -= font->top;                     /* y names the capitals' top row */
  for (; *s; s++, x += font->adv) glyph(x, y, *s, c, 1);
  return x;
}

int ui_text(int x, int y, const char *s) { return ui_text_c(x, y, s, UI_ON); }

int ui_text_big(int x, int y, const char *s) {
  y -= font->top * 2;
  for (; *s; s++, x += font->adv * 2) glyph(x, y, *s, UI_ON, 2);
  return x;
}

void ui_text_inv(int x, int y, int w, const char *s) {
  ui_fill(x, y, w, font->cap + 4, UI_ON);
  ui_text_c(x + 2, y + 2, s, UI_OFF);
}

/* ── furniture ──────────────────────────────────────────────────────────── */

int ui_header(const char *left, const char *right) {
  int h = font->cap + 4;
  ui_fill(0, 0, UI_W, h, UI_ON);
  ui_text_c(2, 2, left, UI_OFF);
  ui_text_c(UI_W - 2 - ui_text_w(right), 2, right, UI_OFF);
  return h;
}

int ui_box_w(const char *label) { return ui_text_w(label) + 6; }
int ui_box_h(void) { return font->cap + 6; }

void ui_box(int x, int y, int w, int h, const char *label) {
  ui_rect(x, y, w, h, UI_ON);
  ui_text(x + (w - ui_text_w(label)) / 2, y + (h - font->cap) / 2, label);
}

void ui_arrow(int x1, int x2, int y) {
  int i;
  ui_hline(x1, y, x2 - x1 + 1, UI_ON);
  for (i = 1; i <= 3; i++) ui_vline(x2 - i, y - i, 2 * i + 1, UI_ON);  /* a solid head */
}

void ui_meter(int x, int y, int w, int h, int level, int max) {
  int fill;
  if (max <= 0) max = 1;
  if (level < 0) level = 0;
  if (level > max) level = max;
  ui_rect(x, y, w, h, UI_ON);
  fill = (w - 4) * level / max;
  ui_fill(x + 2, y + 2, fill, h - 4, UI_ON);
}

void ui_dot(int x, int y, int on) {
  /* 5x5 with the corners off: a disc when on, its outline when off. */
  ui_hline(x + 1, y, 3, UI_ON);
  ui_hline(x + 1, y + 4, 3, UI_ON);
  ui_vline(x, y + 1, 3, UI_ON);
  ui_vline(x + 4, y + 1, 3, UI_ON);
  if (on) ui_fill(x + 1, y + 1, 3, 3, UI_ON);
}

void ui_banner(int y, int h, const char *text) {
  char line[2][32];
  int n = 0, k = 0, i, lh = font->cap + 3, top;
  const char *p;
  line[0][0] = line[1][0] = 0;
  for (p = text; *p && n < 2; p++) {
    if (*p == '\n') { line[n][k] = 0; n++; k = 0; continue; }
    if (k < 31) line[n][k++] = *p;
  }
  if (n < 2) line[n][k] = 0;
  n = line[1][0] ? 2 : 1;
  ui_fill(0, y, UI_W, h, UI_ON);
  top = y + (h - (n * lh - 3)) / 2;
  for (i = 0; i < n; i++) ui_text_c((UI_W - ui_text_w(line[i])) / 2, top + i * lh, line[i], UI_OFF);
}

int ui_footer_h(void) { return font->cap + 4; }

int ui_footer(const char *const label[4], unsigned hot) {
  int h = ui_footer_h(), y = UI_H - h, i;
  ui_hline(0, y, UI_W, UI_ON);
  for (i = 0; i < 4; i++) {
    int x = i * 32, w = 32;
    char s[12];
    strncpy(s, label[i] ? label[i] : "", sizeof s - 1);
    s[sizeof s - 1] = 0;
    while (s[0] && ui_text_w(s) > w - 3) s[strlen(s) - 1] = 0;  /* cut, never overlap a rule */
    if (i) ui_vline(x, y, h, UI_ON);
    ui_clip(x + 1, y + 1, w - 1, h - 1);
    if (hot >> i & 1) {
      ui_fill(x + 1, y + 1, w - 1, h - 1, UI_ON);
      ui_text_c(x + 1 + (w - 1 - ui_text_w(s)) / 2, y + 2, s, UI_OFF);
    } else {
      ui_text(x + 1 + (w - 1 - ui_text_w(s)) / 2, y + 2, s);
    }
    ui_unclip();
  }
  return y;
}
