#!/bin/bash
# rig/pico/patch/build.sh: the /archive/pico-router/ firmware for the RP2040 Pico, built in Docker,
# copied to demo/resources/pico/patch-pico.uf2. Nothing native runs on the Mac.
# why: lessons/rig-pico.md#patch-build
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
  cmake -S /rig/pico/patch -B /tmp/b -DPICO_BOARD=pico -DCMAKE_BUILD_TYPE=MinSizeRel >/tmp/cmake.log 2>&1 || { cat /tmp/cmake.log; exit 1; }
  cmake --build /tmp/b -j 2>&1 | grep -E 'warning|error|Error' || true
  test -f /tmp/b/patch.uf2
  arm-none-eabi-size /tmp/b/patch.elf
  cp /tmp/b/patch.uf2 /out/patch.uf2
"
cp "$out/patch.uf2" "$REPO/demo/resources/pico/patch-pico.uf2"
echo "$out/patch.uf2 $(wc -c < "$out/patch.uf2" | tr -d ' ') bytes, copied to demo/resources/pico/patch-pico.uf2"
