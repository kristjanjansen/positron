#!/usr/bin/env bash
# demo/muta/build/build.sh: compile ONE Mutable Instruments module to
# WebAssembly, in a container. The module is the first argument.
#
# 🔴 NOTHING IS INSTALLED ON THE HOST AND THAT IS THE POINT. This laptop runs
# Microsoft Defender and ThreatLocker and SIGKILLs locally compiled binaries;
# LESSONS.md #80 records that the last attempt at a toolchain install produced
# security prompts on the owner's screen rather than a failed build. The
# compiler therefore lives in `emscripten/emsdk`, which OrbStack runs, and the
# only thing that leaves the container is a `.wasm`, which is data that node and a
# browser read, not an executable anything on this machine will try to run.
#
#   demo/muta/build/build.sh plai           build Plaits into demo/muta/vendor/
#   demo/muta/build/build.sh warp           build Warps  into demo/muta/vendor/
#   demo/muta/build/build.sh warp --check   print what WOULD be built, compile nothing
#
# 🔴 ONE SCRIPT, TWO MODULES, WHICH IS THE HAND-ROLLED-CONTROL RULE ARRIVING IN
# THE BUILD SYSTEM. Two near-identical scripts with two hand-maintained
# `EXPORTS` strings is the shape `positron-ui` records for controls and
# `plans/plan-two-more-modules.md` §6 asks for by name before any second module
# is built. What is SHARED is the fetch, the pins, the digest recipe, the
# compile flags, the licence extraction and the provenance file. What stays PER
# MODULE is everything in the `case` below.
#
# 🔴 AND THE DIGEST STAYS PER MODULE ON PURPOSE. It is computed over the two
# pinned commits, the SHIM'S OWN BYTES, the defines and the sorted source list,
# so two modules built by one script can never collide on one digest: their
# shims differ and their source lists differ. Sharing the script does not share
# the identity, which is the whole reason the digest exists.
#
# 🔴 AND THE C SYMBOL PREFIXES ARE PER MODULE AND DO NOT MOVE. Plaits' exports
# are `plai_*` and Warps' are `warp_*`. Renaming Plaits' exports to match the
# page's new slug would mean rebuilding a byte-reproducible artefact for a
# cosmetic reason and changing a digest that exists to prove something. The
# page, the directory and the slug were renamed; the symbols were not.
#
# The upstream source is NOT vendored into this repository. It is cloned at two
# pinned commits into `tmp/plai-src/`, which is gitignored, and the commits are
# written into `demo/muta/vendor/PROVENANCE-<module>.json` beside the artefact.
# Both repositories are MIT (Emilie Gillet): `plaits/` and `warps/` are STM32F
# projects, which is the half of the grant that is MIT, and each makefile says
# so on line 29 (`FAMILY = f37x`, `FAMILY = f4xx`).

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
WORK="$REPO/tmp/plai-src"
OUT="$REPO/demo/muta/vendor"

# Pinned upstream. Change either of these and the source digest changes, which
# is the whole mechanism: the digest is what a second build on another machine
# has to match before anybody may say both ends run the same definition.
EURO_REPO="https://github.com/VCVRack/pichenettes-eurorack.git"
EURO_SHA="9739c0227708fab7a28b4efef7b27a9a1bc098d1"
STMLIB_REPO="https://github.com/pichenettes/stmlib.git"
STMLIB_SHA="c0c42ec91d315a2ec9c0a3845e593b71ffa429db"

IMAGE="emscripten/emsdk:latest"

MODULE="${1:-}"
CHECK=0
[ "${2:-}" = "--check" ] && CHECK=1
[ "${1:-}" = "--check" ] && { echo "usage: build.sh <plai|warp> [--check]"; exit 1; }

# ── the exact source set, per module ────────────────────────────────────────
# Listed rather than globbed, so adding an engine is a visible edit and the
# digest below cannot drift without somebody typing something.
case "$MODULE" in
plai)
  UPSTREAM_DIR="plaits"
  UPSTREAM_NAME="plaits"
  FAMILY_NOTE="plaits/makefile declares FAMILY = f37x, an STM32F project, so the MIT"
  LICENCE_HEADER="plaits/dsp/voice.h"
  LICENCE_FILE="LICENSE-plaits"
  LICENCE_TITLE="Plaits DSP"
  SLUG_NOTE="This page is called muta and the instrument on it is plated PLAI, the"
  SOURCES=(
    plaits/dsp/voice.cc
    plaits/resources.cc
    plaits/dsp/engine/additive_engine.cc
    plaits/dsp/engine/bass_drum_engine.cc
    plaits/dsp/engine/chord_engine.cc
    plaits/dsp/engine/fm_engine.cc
    plaits/dsp/engine/grain_engine.cc
    plaits/dsp/engine/hi_hat_engine.cc
    plaits/dsp/engine/modal_engine.cc
    plaits/dsp/engine/noise_engine.cc
    plaits/dsp/engine/particle_engine.cc
    plaits/dsp/engine/snare_drum_engine.cc
    plaits/dsp/engine/speech_engine.cc
    plaits/dsp/engine/string_engine.cc
    plaits/dsp/engine/swarm_engine.cc
    plaits/dsp/engine/virtual_analog_engine.cc
    plaits/dsp/engine/waveshaping_engine.cc
    plaits/dsp/engine/wavetable_engine.cc
    plaits/dsp/physical_modelling/modal_voice.cc
    plaits/dsp/physical_modelling/resonator.cc
    plaits/dsp/physical_modelling/string.cc
    plaits/dsp/physical_modelling/string_voice.cc
    plaits/dsp/speech/lpc_speech_synth.cc
    plaits/dsp/speech/lpc_speech_synth_controller.cc
    plaits/dsp/speech/lpc_speech_synth_phonemes.cc
    plaits/dsp/speech/lpc_speech_synth_words.cc
    plaits/dsp/speech/naive_speech_synth.cc
    plaits/dsp/speech/sam_speech_synth.cc
    stmlib/dsp/atan.cc
    stmlib/dsp/units.cc
    stmlib/utils/random.cc
  )
  EXPORTS='["_plai_init","_plai_set_param","_plai_get_param","_plai_render","_plai_out_ptr","_plai_aux_ptr","_plai_scratch_frames","_plai_active_engine","_plai_engine_count","_plai_block_size","_plai_sample_rate","_plai_blocks_rendered","_plai_build","_plai_source_sha","_plai_set_polyphony","_plai_polyphony","_plai_max_voices","_plai_trim","_plai_note_on","_plai_note_off","_plai_all_off","_plai_set_drone","_plai_droning","_plai_held","_plai_voice_note","_plai_voice_level","_plai_voice_state","_plai_steals","_plai_last_voice","_plai_last_stolen","_plai_last_stolen_note","_plai_last_stolen_level","_plai_voice_renders","_plai_voice_bytes","_plai_alloc_bytes"]'
  ;;
warp)
  UPSTREAM_DIR="warps"
  UPSTREAM_NAME="warps"
  FAMILY_NOTE="warps/makefile declares FAMILY = f4xx, an STM32F project, so the MIT"
  LICENCE_HEADER="warps/dsp/modulator.h"
  LICENCE_FILE="LICENSE-warps"
  LICENCE_TITLE="Warps DSP"
  SLUG_NOTE="This page is called muta and the effect on it is plated WARP, the"
  # FIVE FILES CARRY THE WHOLE OF IT. Everything else under `warps/` is
  # drivers, a bootloader, `ui.cc`, `settings.cc` and `cv_scaler.cc`, none of
  # which a browser needs. `modulator.cc` includes `warps/drivers/debug_pin.h`,
  # which is safe ONLY because `-DTEST` below selects its empty branch; without
  # it that header reaches for `stm32f4xx_conf.h`.
  SOURCES=(
    warps/dsp/modulator.cc
    warps/dsp/oscillator.cc
    warps/dsp/vocoder.cc
    warps/dsp/filter_bank.cc
    warps/resources.cc
    stmlib/dsp/atan.cc
    stmlib/dsp/units.cc
    stmlib/utils/random.cc
  )
  EXPORTS='["_warp_init","_warp_set_param","_warp_get_param","_warp_render","_warp_in_l_ptr","_warp_in_r_ptr","_warp_out_ptr","_warp_aux_ptr","_warp_scratch_frames","_warp_block_size","_warp_max_block","_warp_sample_rate","_warp_table_rate","_warp_band_shift","_warp_band_lo","_warp_band_hi","_warp_band_count","_warp_algorithm","_warp_algorithm_blend","_warp_vocoder_amount","_warp_vocoding","_warp_carrier_shape","_warp_blocks_rendered","_warp_frames_rendered","_warp_carry","_warp_build","_warp_source_sha"]'
  ;;
*)
  echo "usage: build.sh <plai|warp> [--check]"
  exit 1
  ;;
esac

SHIM="${MODULE}_shim.cc"
WASM="${MODULE}.wasm"
PREFIX="$(printf '%s' "$MODULE" | tr '[:lower:]' '[:upper:]')"

# 🔴 `-DTEST` IS UPSTREAM'S OWN PORTABLE PATH AND IS NOT A PATCH. Without it
# `stmlib/dsp/dsp.h` compiles ARMv7 Thumb inline assembly for three functions
# (`ssat`, `usat`, `vsqrt.f32`) and clang refuses the constraints on any other
# target. The `#ifdef TEST` branch beside them is plain C++ written by the same
# author for the same purpose, and it is what the Rack adapter uses: line 2 of
# `VCVRack/AudibleInstruments/Makefile` is `-DTEST`. A Pi build would need it
# too, because that assembly is 32 bit ARM and the board is aarch64.
# It is in the digest below, because a define that selects different code is
# part of the definition.
DEFINES=(-DTEST)

sha256() { shasum -a 256 "$1" | cut -d' ' -f1; }

# ── fetch, at the pins ──────────────────────────────────────────────────────
mkdir -p "$WORK"
if [ ! -d "$WORK/euro/.git" ]; then
  echo "cloning $EURO_REPO"
  git clone --quiet "$EURO_REPO" "$WORK/euro"
fi
git -C "$WORK/euro" fetch --quiet origin "$EURO_SHA" 2>/dev/null || true
git -C "$WORK/euro" checkout --quiet "$EURO_SHA"

if [ ! -d "$WORK/euro/stmlib/.git" ]; then
  echo "cloning $STMLIB_REPO"
  rm -rf "$WORK/euro/stmlib"
  git clone --quiet "$STMLIB_REPO" "$WORK/euro/stmlib"
fi
git -C "$WORK/euro/stmlib" checkout --quiet "$STMLIB_SHA"

GOT_EURO="$(git -C "$WORK/euro" rev-parse HEAD)"
GOT_STMLIB="$(git -C "$WORK/euro/stmlib" rev-parse HEAD)"
[ "$GOT_EURO" = "$EURO_SHA" ] || { echo "eurorack checkout is $GOT_EURO, not $EURO_SHA"; exit 1; }
[ "$GOT_STMLIB" = "$STMLIB_SHA" ] || { echo "stmlib checkout is $GOT_STMLIB, not $STMLIB_SHA"; exit 1; }

for s in "${SOURCES[@]}"; do
  [ -f "$WORK/euro/$s" ] || { echo "missing source: $s"; exit 1; }
done
[ -f "$HERE/$SHIM" ] || { echo "missing shim: $HERE/$SHIM"; exit 1; }

# ── the source digest ───────────────────────────────────────────────────────
# Over the two pinned commits, the shim's own bytes, and the list of files
# compiled. The commits pin the upstream trees exactly, so this identifies the
# DEFINITION and says nothing about the compiler or the target. That is
# deliberate: a wasm build here and an aarch64 build on the board are two
# translations of the same text, and the digest is what says so.
SHIM_SHA="$(sha256 "$HERE/$SHIM")"
SRC_LIST="$(printf '%s\n' "${SOURCES[@]}" | sort)"
SOURCE_SHA="$(printf '%s=%s\nstmlib=%s\nshim=%s\ndefines=%s\nsources=\n%s\n' \
  "$UPSTREAM_NAME" "$EURO_SHA" "$STMLIB_SHA" "$SHIM_SHA" "${DEFINES[*]}" "$SRC_LIST" | shasum -a 256 | cut -c1-16)"

EMVER="$(docker run --rm "$IMAGE" emcc --version 2>/dev/null | head -1 | sed 's/.*replacement + linker emulating GNU ld) //;s/ .*//')"
BUILD_STAMP="$UPSTREAM_NAME ${EURO_SHA:0:7} stmlib ${STMLIB_SHA:0:7} src ${SOURCE_SHA} emcc ${EMVER}"

echo "module    $MODULE"
echo "eurorack  $EURO_SHA"
echo "stmlib    $STMLIB_SHA"
echo "shim      $SHIM_SHA  ($SHIM)"
echo "sources   ${#SOURCES[@]} files"
echo "digest    $SOURCE_SHA"
echo "emcc      $EMVER"
echo "stamp     $BUILD_STAMP"
[ "$CHECK" = "1" ] && exit 0

# ── compile ─────────────────────────────────────────────────────────────────
# -O3, and DELIBERATELY NOT -ffast-math: the point of this exercise is one
# definition compiled twice, and a flag that lets the compiler re-associate
# float arithmetic makes the two translations diverge for a reason that has
# nothing to do with the source.
# STANDALONE_WASM, so the artefact is a `.wasm` and nothing else. No emscripten
# JS glue, because an AudioWorklet cannot use it: there is no `fetch`, no
# `document` and no module loader in there.
cp "$HERE/$SHIM" "$WORK/euro/$SHIM"
mkdir -p "$WORK/euro/.emcache"

docker run --rm \
  --user "$(id -u):$(id -g)" \
  -v "$WORK/euro":/src \
  -w /src \
  -e EM_CACHE=/src/.emcache \
  "$IMAGE" \
  em++ -std=c++11 -O3 -fno-exceptions -fno-rtti -I/src "${DEFINES[@]}" \
    -D${PREFIX}_BUILD="\"$BUILD_STAMP\"" -D${PREFIX}_SOURCE_SHA="\"$SOURCE_SHA\"" \
    "$SHIM" "${SOURCES[@]}" \
    -sSTANDALONE_WASM=1 --no-entry \
    -sEXPORTED_FUNCTIONS="$EXPORTS" \
    -sALLOW_MEMORY_GROWTH=0 -sINITIAL_MEMORY=4MB -sSTACK_SIZE=256KB \
    -sFILESYSTEM=0 -sASSERTIONS=0 \
    -o "$WASM"

mkdir -p "$OUT"
cp "$WORK/euro/$WASM" "$OUT/$WASM"
WASM_BYTES="$(wc -c < "$OUT/$WASM" | tr -d ' ')"
WASM_SHA="$(sha256 "$OUT/$WASM")"

# The licence travels with the code. Both repositories carry the same MIT text
# in every file header; this takes it from the entry point itself so it cannot
# be a paraphrase.
{
  echo "$LICENCE_TITLE, compiled into demo/muta/vendor/$WASM"
  echo
  echo "Source: $EURO_REPO"
  echo "        $EURO_SHA"
  echo "        $STMLIB_REPO"
  echo "        $STMLIB_SHA"
  echo
  echo "The eurorack repository's README states the terms:"
  echo
  sed -n '/^License$/,$p' "$WORK/euro/README.md" | sed 's/^/  /'
  echo "$FAMILY_NOTE"
  echo "half of that grant is the one that applies."
  echo
  echo "The MIT text, verbatim from the header of $LICENCE_HEADER:"
  echo
  sed -n '1,23p' "$WORK/euro/$LICENCE_HEADER" | sed 's|^// \?||' | sed 's/^/  /'
  echo
  echo "The same README asks that derivative works not carry the Mutable"
  echo "Instruments name or the module's name. $SLUG_NOTE"
  echo "panel graphics are not taken, and the attribution above is to the"
  echo "author rather than branding."
} > "$OUT/$LICENCE_FILE"

cat > "$OUT/PROVENANCE-$MODULE.json" <<JSON
{
  "artefact": "$WASM",
  "bytes": $WASM_BYTES,
  "sha256": "$WASM_SHA",
  "sourceSha": "$SOURCE_SHA",
  "build": "$BUILD_STAMP",
  "builtAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "emcc": "$EMVER",
  "defines": "${DEFINES[*]}",
  "image": "$IMAGE",
  "upstream": {
    "eurorack": { "repo": "$EURO_REPO", "commit": "$EURO_SHA", "module": "$UPSTREAM_DIR", "licence": "MIT (STM32F projects)" },
    "stmlib": { "repo": "$STMLIB_REPO", "commit": "$STMLIB_SHA", "licence": "MIT" }
  },
  "shim": { "path": "demo/muta/build/$SHIM", "sha256": "$SHIM_SHA" },
  "sources": [$(printf '"%s",' "${SOURCES[@]}" | sed 's/,$//')],
  "recipe": "demo/muta/build/build.sh $MODULE"
}
JSON

echo
echo "wrote $OUT/$WASM  $WASM_BYTES bytes"
echo "wrote $OUT/$LICENCE_FILE"
echo "wrote $OUT/PROVENANCE-$MODULE.json"
