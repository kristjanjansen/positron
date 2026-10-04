#!/bin/bash
# rig/pico/firmware/wasm/build.sh: ../ui.c and its fonts as a WebAssembly
# module for /kit/, built inside the emscripten/emsdk image.
#
#   rig/pico/firmware/wasm/build.sh     writes demo/resources/pico/oled-ui.wasm
#
# STANDALONE_WASM with no entry point, so the module has NO imports and the
# page instantiates it with an empty object: no emscripten JavaScript glue.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
FW="$(cd "$HERE/.." && pwd)"
OUT="$(cd "$FW/../../../demo/resources/pico" && pwd)"
docker run --rm -v "$FW":/fw:ro -v "$OUT":/out emscripten/emsdk:latest sh -c '
  set -e
  emcc -Os -std=c99 -Wall -Wextra -Wno-unused-parameter \
    -sSTANDALONE_WASM --no-entry -sINITIAL_MEMORY=131072 -sSTACK_SIZE=16384 \
    -sEXPORTED_FUNCTIONS=_fb,_str,_nfonts,_font_name,_font_cap,_font_adv,_begin,_area,_area_w,_text_w,_text,_text_big,_text_inv,_header,_box_w,_box_h,_box,_arrow,_meter,_dot,_banner,_rect,_fill,_footer,_footer_h,_keys_right \
    -I/fw /fw/wasm/ui_wasm.c /fw/ui.c -o /out/oled-ui.wasm
'
echo "$OUT/oled-ui.wasm $(wc -c < "$OUT/oled-ui.wasm" | tr -d ' ') bytes"
