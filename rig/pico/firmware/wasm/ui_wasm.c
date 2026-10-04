/* rig/pico/firmware/wasm/ui_wasm.c: the OLED UI kit (../ui.c, unchanged) as
 * a WebAssembly module with no imports, so /kit/ can draw each part of the
 * router's screen with the firmware's own code rather than with a JavaScript
 * copy of it that would drift.
 *
 * Strings cross in four 64 byte slots: the page writes UTF-8 into slot i at
 * str(i) and calls a function naming the slots it reads. The frame buffer is
 * 1024 bytes, page major, as ssd1306.c sends it.
 *
 * Built by ./build.sh in the emscripten/emsdk image, nothing native on the Mac.
 */
#include <stdint.h>
#include "../ui.h"

#define EXPORT __attribute__((used, visibility("default")))

static uint8_t frame[UI_W * UI_H / 8];
static char slot[4][64];

EXPORT uint8_t *fb(void) { return frame; }
EXPORT char *str(int i) { return slot[i & 3]; }
EXPORT int nfonts(void) { return UI_NFONTS; }
EXPORT const char *font_name(int i) { return i >= 0 && i < UI_NFONTS ? UI_FONTS[i]->name : ""; }
EXPORT int font_cap(void) { return ui_font_get()->cap; }
EXPORT int font_adv(void) { return ui_font_get()->adv; }

/* Every specimen starts from the same state: a dark screen, no clip, the
 * whole width, and the font asked for (-1 the default). */
EXPORT void begin(int font) {
  ui_bind(frame);
  ui_unclip();
  ui_area(UI_W);
  ui_font_set(font >= 0 && font < UI_NFONTS ? UI_FONTS[font] : UI_FONT_DEFAULT);
  ui_clear();
}

EXPORT void area(int w) { ui_area(w); }
EXPORT int area_w(void) { return ui_area_w(); }
EXPORT int text_w(void) { return ui_text_w(slot[0]); }
EXPORT int text(int x, int y) { return ui_text(x, y, slot[0]); }
EXPORT int text_big(int x, int y) { return ui_text_big(x, y, slot[0]); }
EXPORT void text_inv(int x, int y, int w) { ui_text_inv(x, y, w, slot[0]); }
EXPORT int header(void) { return ui_header(slot[0], slot[1]); }
EXPORT int box_w(void) { return ui_box_w(slot[0]); }
EXPORT int box_h(void) { return ui_box_h(); }
EXPORT void box(int x, int y, int w, int h) { ui_box(x, y, w, h, slot[0]); }
EXPORT void arrow(int x1, int x2, int y) { ui_arrow(x1, x2, y); }
EXPORT void meter(int x, int y, int w, int h, int level, int max) { ui_meter(x, y, w, h, level, max); }
EXPORT void dot(int x, int y, int on) { ui_dot(x, y, on); }
EXPORT void banner(int y, int h) { ui_banner(y, h, slot[0]); }
EXPORT void rect(int x, int y, int w, int h) { ui_rect(x, y, w, h, UI_ON); }
EXPORT void fill(int x, int y, int w, int h, int c) { ui_fill(x, y, w, h, c); }

static const char *const *labels(void) {
  static const char *l[4];
  int i;
  for (i = 0; i < 4; i++) l[i] = slot[i];
  return l;
}
EXPORT int footer(unsigned hot) { return ui_footer(labels(), hot); }
EXPORT int footer_h(void) { return ui_footer_h(); }
/* The column is sized by the labels it is given, which is what the router
 * does with its four words. */
EXPORT int keys_right(unsigned hot, int top) { return ui_keys_right(labels(), hot, labels(), top); }
EXPORT int banner_fit(int y, int h, int n) { return ui_banner_fit(y, h, labels(), n); }
