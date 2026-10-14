#!/bin/bash
# rig/board/plaits/build.sh [--force]: build posplaits ON THE BOARD, from the pins and source list in
# demo/muta/vendor/PROVENANCE-plaits.json, beside this file. push.sh runs it; it rebuilds only when
# the recipe, the shim or the host changed. Never run on the laptop, which kills what it compiles.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
SHIM="$ROOT/demo/muta/build/plaits_shim.cc"
WORK="${PLAITS_SRC:-$HOME/.cache/positron-plaits}"
BIN="$HERE/posplaits"
STAMP="$HERE/posplaits.stamp"
FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

say() { echo "   $*"; }

[ "$(uname -s)" = "Linux" ] || { echo "posplaits is built on the board, not here (uname says $(uname -s))" >&2; exit 2; }
# The one install route A needs, named rather than guessed at.
if [ ! -f /usr/include/jack/jack.h ]; then
  echo "   NOT BUILT: the JACK headers are missing (/usr/include/jack/jack.h)." >&2
  echo "   install them with: sudo apt-get install -y --no-install-recommends libjack-jackd2-dev" >&2
  exit 3
fi
command -v g++ >/dev/null || { echo "   NOT BUILT: no g++ (build-essential, rig/board/packages.txt)" >&2; exit 3; }
command -v git >/dev/null || { echo "   NOT BUILT: no git" >&2; exit 3; }
[ -f "$SHIM" ] || { echo "   NOT BUILT: $SHIM was not shipped (push.sh lists it)" >&2; exit 3; }

VARS="$(node "$HERE/recipe.mjs" --shell)" || { echo "   NOT BUILT: recipe.mjs could not read the provenance" >&2; exit 3; }
eval "$VARS"
[ "$SAME" = 1 ] || say "the source digest here is $SOURCE_SHA and plaits.wasm's is $WASM_SOURCE_SHA, so the two are not one definition"

GXX="$(g++ -dumpfullversion 2>/dev/null || g++ -dumpversion)"
ARCH="$(uname -m)"
BUILD_STAMP="plaits ${EURO_SHA:0:7} stmlib ${STMLIB_SHA:0:7} src ${SOURCE_SHA} g++ ${GXX} ${ARCH}"
HOST_SHA="$(sha256sum "$HERE/posplaits.cc" | cut -d' ' -f1)"
WANT="$BUILD_STAMP host ${HOST_SHA:0:16} flags ${CXXFLAGS[*]} ${DEFINES[*]}"
if [ "$FORCE" = 0 ] && [ -x "$BIN" ] && [ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$WANT" ]; then
  say "posplaits unchanged ($SOURCE_SHA)"
  exit 0
fi

# Fetch at the pins, as demo/muta/build/build.sh does; the checkout is reused across builds.
mkdir -p "$WORK"
if [ ! -d "$WORK/euro/.git" ]; then git clone --quiet "$EURO_REPO" "$WORK/euro" || { echo "   NOT BUILT: clone of $EURO_REPO failed" >&2; exit 4; }; fi
git -C "$WORK/euro" fetch --quiet origin "$EURO_SHA" 2>/dev/null || true
git -C "$WORK/euro" checkout --quiet "$EURO_SHA" || { echo "   NOT BUILT: $EURO_SHA is not in the checkout" >&2; exit 4; }
if [ ! -d "$WORK/euro/stmlib/.git" ]; then
  rm -rf "$WORK/euro/stmlib"
  git clone --quiet "$STMLIB_REPO" "$WORK/euro/stmlib" || { echo "   NOT BUILT: clone of $STMLIB_REPO failed" >&2; exit 4; }
fi
git -C "$WORK/euro/stmlib" fetch --quiet origin "$STMLIB_SHA" 2>/dev/null || true
git -C "$WORK/euro/stmlib" checkout --quiet "$STMLIB_SHA" || { echo "   NOT BUILT: $STMLIB_SHA is not in the checkout" >&2; exit 4; }
[ "$(git -C "$WORK/euro" rev-parse HEAD)" = "$EURO_SHA" ] || { echo "   NOT BUILT: eurorack is not at $EURO_SHA" >&2; exit 4; }
[ "$(git -C "$WORK/euro/stmlib" rev-parse HEAD)" = "$STMLIB_SHA" ] || { echo "   NOT BUILT: stmlib is not at $STMLIB_SHA" >&2; exit 4; }
for s in "${SOURCES[@]}"; do [ -f "$WORK/euro/$s" ] || { echo "   NOT BUILT: missing source $s" >&2; exit 4; }; done

say "compiling ${#SOURCES[@]} sources, the shim and the host ($BUILD_STAMP)"
T0=$(date +%s)
rm -f "$BIN.new"
( cd "$WORK/euro" && g++ "${CXXFLAGS[@]}" "${DEFINES[@]}" -I"$WORK/euro" \
    -DPLAITS_BUILD="\"$BUILD_STAMP\"" -DPLAITS_SOURCE_SHA="\"$SOURCE_SHA\"" \
    "$SHIM" "$HERE/posplaits.cc" "${SOURCES[@]}" \
    -o "$BIN.new" -ljack -lpthread ) 2>&1 | grep -v "^$" | tail -20
[ -x "$BIN.new" ] || { echo "   FAILED to build posplaits" >&2; exit 5; }
mv -f "$BIN.new" "$BIN"
echo "$WANT" > "$STAMP"
say "built posplaits in $(( $(date +%s) - T0 )) s"
"$BIN" --version
