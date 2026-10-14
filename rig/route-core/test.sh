#!/bin/bash
# rig/route-core/test.sh [--arm]: build the C core and run every route vector, inside Docker.
# Nothing native runs on the Mac (it kills local binaries); SRC=<copy> grades a scratch copy.
# why: lessons/rig-misc.md#route-core-test
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="${SRC:-$HERE}"
ARM=0
for a in "$@"; do
  case "$a" in
    --arm) ARM=1 ;;
    *) echo "unknown argument $a" >&2; exit 2 ;;
  esac
done

FLAGS='-std=c99 -pedantic -Wall -Wextra -Werror -Wshadow -O2'

echo "vectors: $(node -e "console.log(JSON.parse(require('fs').readFileSync('$HERE/../../demo/shell/route-vectors/index.json','utf8')).join(' '))")"

node "$HERE/vectors-to-lines.mjs" | docker run --rm -i -v "$SRC":/src:ro gcc:14 sh -c "
  set -e
  gcc $FLAGS -c /src/route_core.c -o /tmp/route_core.o
  gcc $FLAGS -I/src /src/route_test.c /tmp/route_core.o -o /tmp/route_test
  size /tmp/route_core.o
  /tmp/route_test
"

if [ "$ARM" = 1 ]; then
  # Stock Debian toolchain in a throwaway container: a package download every run.
  # why: lessons/rig-misc.md#route-core-toolchain
  docker run --rm -v "$SRC":/src:ro debian:bookworm-slim sh -c "
    set -e
    apt-get update -qq >/dev/null && apt-get install -y -qq gcc-arm-none-eabi binutils-arm-none-eabi >/dev/null
    arm-none-eabi-gcc $FLAGS -Os -mcpu=cortex-m4 -mthumb -ffreestanding -c /src/route_core.c -o /tmp/route_core.o
    arm-none-eabi-size /tmp/route_core.o
    printf '#include \"route_core.h\"\nroute_core core;\nunsigned long route_core_size = sizeof core;\n' > /tmp/sz.c
    arm-none-eabi-gcc $FLAGS -Os -mcpu=cortex-m4 -mthumb -I/src -c /tmp/sz.c -o /tmp/sz.o
    arm-none-eabi-size /tmp/sz.o
  "
fi
