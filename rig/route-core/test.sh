#!/bin/bash
# rig/route-core/test.sh: build the C routing core and run it against every
# vector `demo/shell/route-vectors/index.json` lists, inside Docker.
#
#   rig/route-core/test.sh             gcc, -Wall -Wextra -Werror, then the vectors
#   rig/route-core/test.sh --arm       also a Cortex-M4 build, and its .text/.bss
#   SRC=/some/copy rig/route-core/test.sh   grade a scratch copy (how it was sabotaged)
#
# 🔴 NOTHING NATIVE RUNS ON THE MAC. This laptop kills any binary compiled or
# downloaded under the home directory (exit 137), so the compiler, the binary
# and the run all live in the container, and the binary is written to the
# container's /tmp, never into this checkout. Only `node` runs here, to turn the
# JSON into lines, and it pipes them straight into the container's stdin.
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
  # ⚠️ The stock Debian toolchain, installed into a throwaway container each
  # run. Nothing is kept, so this costs a package download every time.
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
