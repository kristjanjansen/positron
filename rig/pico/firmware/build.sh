#!/bin/bash
# rig/pico/firmware/build.sh [pico|pico2_w]: build the router in Docker (positron-pico-sdk:2.2.0).
# Only build-<board>/router.uf2 comes back; nothing native runs on the Mac.
# why: lessons/rig-pico.md#firmware-build
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
RIG="$(cd "$HERE/../.." && pwd)"
IMAGE=positron-pico-sdk:2.2.0
BOARDS=("$@")
[ ${#BOARDS[@]} -eq 0 ] && BOARDS=(pico pico2_w)

docker image inspect "$IMAGE" >/dev/null 2>&1 || docker build -t "$IMAGE" "$HERE"

for board in "${BOARDS[@]}"; do
  out="$HERE/build-$board"
  mkdir -p "$out"
  echo "== $board"
  docker run --rm -v "$RIG":/rig:ro -v "$out":/out "$IMAGE" sh -c "
    set -e
    cmake -S /rig/pico/firmware -B /tmp/b -DPICO_BOARD=$board -DCMAKE_BUILD_TYPE=MinSizeRel >/tmp/cmake.log 2>&1 || { cat /tmp/cmake.log; exit 1; }
    cmake --build /tmp/b -j 2>&1 | grep -E 'warning|error|Error' || true
    test -f /tmp/b/router.uf2
    arm-none-eabi-size /tmp/b/router.elf
    cp /tmp/b/router.uf2 /out/router.uf2
  "
  echo "$out/router.uf2 $(wc -c < "$out/router.uf2" | tr -d ' ') bytes"
done
