#!/bin/bash
# rig/pico/firmware/build.sh: build the router for both boards, inside Docker.
#
#   rig/pico/firmware/build.sh          pico (RP2040, the emulator) and pico2_w (RP2350, the desk)
#   rig/pico/firmware/build.sh pico     just one
#
# Writes build-<board>/router.uf2 beside this file. The CMake tree lives in the
# container's /tmp and is thrown away; only the .uf2 comes back, which is ARM
# code and never runs on this Mac.
#
# 🔴 NOTHING NATIVE RUNS ON THE MAC. The compiler, CMake and picotool are all in
# the image `positron-pico-sdk:2.2.0`, built from the Dockerfile here on first use.
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
