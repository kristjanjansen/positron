#!/bin/bash
# rig/pico/net/build.sh: build the Pico 2 W network node, inside Docker.
#
#   rig/pico/net/build.sh              wss:// to studio-1 (the default)
#   rig/pico/net/build.sh -DRELAY_TLS=0 -DRELAY_ROOM=pico-test-abc123
#
# Writes build-pico2_w/net.uf2, net.elf and net.map beside this file (all
# ignored by git). The map file is what the RAM estimate is read from.
# Wifi credentials come from pico/wifi_secrets.h, which is NOT committed; with
# no such file the UF2 still builds and links and joins nothing.
#
# 🔴 NOTHING NATIVE RUNS ON THE MAC. The compiler is in the image.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
RIG="$(cd "$HERE/../.." && pwd)"
IMAGE=positron-pico-net:2.2.0
docker image inspect positron-pico-sdk:2.2.0 >/dev/null 2>&1 || docker build -t positron-pico-sdk:2.2.0 "$RIG/pico/firmware"
docker image inspect "$IMAGE" >/dev/null 2>&1 || docker build -t "$IMAGE" "$HERE"
out="$HERE/build-pico2_w"
mkdir -p "$out"
docker run --rm -v "$RIG":/rig:ro -v "$out":/out "$IMAGE" sh -c "
  set -e
  cat /opt/pico-sdk/SUBMODULES.txt
  cmake -S /rig/pico/net -B /tmp/b -DPICO_BOARD=pico2_w -DCMAKE_BUILD_TYPE=MinSizeRel $* >/tmp/cmake.log 2>&1 || { cat /tmp/cmake.log; exit 1; }
  cmake --build /tmp/b -j 2>&1 | grep -E 'warning|error|Error' || true
  test -f /tmp/b/net.uf2
  arm-none-eabi-size -A /tmp/b/net.elf | grep -E '^\.(text|rodata|data|bss|heap|stack|flash|ram|uninitialized)|Total' || true
  arm-none-eabi-size /tmp/b/net.elf
  cp /tmp/b/net.uf2 /tmp/b/net.elf /out/
  cp /tmp/b/net.elf.map /out/net.map
"
echo "$out/net.uf2 $(wc -c < "$out/net.uf2" | tr -d ' ') bytes"
