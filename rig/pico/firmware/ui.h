/* rig/pico/firmware/ui.h: a tiny immediate-mode drawing kit over a 128x64
 * 1-bit frame buffer.
 *
 * Every call draws straight into the buffer bound with ui_bind() and returns.
 * Nothing is allocated, nothing is retained between frames: a screen is
 * ui_clear() followed by the calls that describe it, every time. The buffer is
 * page major, which is what ssd1306.c sends: byte (page * 128 + x) holds the 8
 * vertical pixels x, page*8 .. page*8+7, bit 0 at the top.
 *
 * Colours: UI_OFF darkens, UI_ON lights, UI_INV flips what is there. Text is
 * drawn transparently, only the glyph's own pixels are touched, so dark text on
 * a lit bar is ui_fill(.., UI_ON) and then ui_text_c(.., UI_OFF).
 *
 * Fonts are data, not code: a ui_font names a column table, its cell and its
 * advance. Several are compiled in (ui.c lists them with their sources) and
 * one is current at a time, set with ui_font_set().
 */
#ifndef POSITRON_UI_H
#define POSITRON_UI_H

#include <stdint.h>

#define UI_W 128
#define UI_H 64

enum { UI_OFF = 0, UI_ON = 1, UI_INV = 2 };

typedef struct {
  const char *name;
  const uint8_t *glyph;   /* ASCII 32..126, `w` bytes a glyph, bit 0 at the top */
  uint8_t w, h;           /* the cell as stored */
  uint8_t adv;            /* pixels from one character to the next */
  uint8_t top;            /* first row of a capital letter inside the cell */
  uint8_t cap;            /* rows a capital letter occupies */
} ui_font;

extern const ui_font UI_FONT_MISC4X6, UI_FONT_MISC5X7, UI_FONT_SPLEEN5X8,
                     UI_FONT_TOMTHUMB, UI_FONT_GLCD5X7, UI_FONT_PETME8X8;
/* Every compiled font, in a fixed order. The emulator picks one by index. */
extern const ui_font *const UI_FONTS[];
extern const int UI_NFONTS;
extern const ui_font *const UI_FONT_DEFAULT;

void ui_bind(uint8_t *fb);
void ui_font_set(const ui_font *f);
const ui_font *ui_font_get(void);

/* Every pixel write is clipped to this rectangle; ui_unclip() is the screen. */
void ui_clip(int x, int y, int w, int h);
void ui_unclip(void);

void ui_clear(void);
void ui_pixel(int x, int y, int c);
void ui_hline(int x, int y, int w, int c);
void ui_vline(int x, int y, int h, int c);
void ui_rect(int x, int y, int w, int h, int c);       /* a one pixel outline */
void ui_fill(int x, int y, int w, int h, int c);       /* solid, or UI_INV flips */

/* Text in the current font. `y` is the top of the CAPITALS, not of the cell,
 * so two fonts with different cells line up on the same y. Returns the x after
 * the last character. ui_text_w is the inked width of `s`. */
int ui_text_w(const char *s);
int ui_text(int x, int y, const char *s);               /* lit */
int ui_text_c(int x, int y, const char *s, int c);
int ui_text_big(int x, int y, const char *s);           /* the current font at 2x */
/* A filled bar `w` wide, two pixels taller than the capitals on each side,
 * with `s` dark inside it, left aligned after a two pixel inset. */
void ui_text_inv(int x, int y, int w, const char *s);

/* The width the furniture spans, from x 0. The screen by default; a page with
 * its key labels in a column on the right narrows it to the column's rule, so
 * the header and the banner stop where the keys begin. Pixels are not clipped
 * by it: it is a layout width, not a clip. */
void ui_area(int w);
int ui_area_w(void);

/* The furniture. Each returns or takes positions in pixels. */
/* A lit bar across the area, `left` and `right` dark inside it. `right` is
 * cut a letter at a time until the two cannot touch. Returns its height. */
int ui_header(const char *left, const char *right);
void ui_box(int x, int y, int w, int h, const char *label);  /* label centred */
int ui_box_w(const char *label);                        /* the box ui_box needs */
int ui_box_h(void);
void ui_arrow(int x1, int x2, int y);                   /* x1 to x2, head at x2 */
void ui_meter(int x, int y, int w, int h, int level, int max);
void ui_dot(int x, int y, int on);                      /* 5x5: a disc or a ring */
/* A full-width lit block from y, `h` high, `text` dark and centred; a '\n' in
 * `text` starts a second line. */
void ui_banner(int y, int h, const char *text);
/* The bottom row, one cell per button. A set bit in `hot` fills that cell.
 * Returns the y of its top rule. */
int ui_footer(const char *const label[4], unsigned hot);
int ui_footer_h(void);
/* The same four labels as a column down the RIGHT edge, for a module whose
 * buttons sit beside the screen: four cells 16 rows tall, label[0] at the top,
 * each centred level with its button. As wide as the widest label in `width`
 * (the labels this column will ever show, so it does not change width when one
 * of them does). Returns the x of its left rule. */
int ui_keys_right(const char *const label[4], unsigned hot, const char *const width[4]);
int ui_keys_right_w(const char *const width[4]);

#endif
