#!/bin/bash
# rig/pico/rings/build.sh: the rings firmware for the RP2040 Pico, built in Docker,
# copied to demo/resources/pico/rings-pico.uf2. Nothing native runs on the Mac.
# why: lessons/rig-pico.md#rings-build
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
