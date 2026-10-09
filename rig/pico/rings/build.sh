#!/bin/bash
# rig/pico/rings/build.sh: build the rings firmware for the plain RP2040 Pico,
# inside Docker, and copy the UF2 to where the page fetches it.
#
#   rig/pico/rings/build.sh
#
# Writes build-pico/rings.uf2 beside this file and demo/resources/pico/rings-pico.uf2.
# The image is the router's, `positron-pico-sdk:2.2.0`, built from
# rig/pico/firmware/Dockerfile on first use.
#
# 🔴 NOTHING NATIVE RUNS ON THE MAC. The compiler, CMake and picotool are all in the image.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
RIG="$(cd "$HERE/../.." && pwd)"
REPO="$(cd "$RIG/.." && pwd)"
IMAGE=positron-pico-sdk:2.2.0

docker image inspect "$IMAGE" >/dev/null 2>&1 || docker build -t "$IMAGE" "$RIG/pico/firmware"

out="$HERE/build-pico"
mkdir -p "$out"
docker run --rm -v "$RIG":/rig:ro -v "$out":/out "$IMAGE" sh -c "
  set -e
  cmake -S /rig/pico/rings -B /tmp/b -DPICO_BOARD=pico -DCMAKE_BUILD_TYPE=MinSizeRel >/tmp/cmake.log 2>&1 || { cat /tmp/cmake.log; exit 1; }
  cmake --build /tmp/b -j 2>&1 | grep -E 'warning|error|Error' || true
  test -f /tmp/b/rings.uf2
  arm-none-eabi-size /tmp/b/rings.elf
  cp /tmp/b/rings.uf2 /out/rings.uf2
"
cp "$out/rings.uf2" "$REPO/demo/resources/pico/rings-pico.uf2"
echo "$out/rings.uf2 $(wc -c < "$out/rings.uf2" | tr -d ' ') bytes, copied to demo/resources/pico/rings-pico.uf2"
