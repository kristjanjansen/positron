#!/bin/bash
# rig/pico/oled/render.sh - draw wiring.yml into wiring.svg and wiring.png.
# WireViz and Graphviz run in a throwaway container, because this laptop kills
# native binaries it did not get from Homebrew (see HANDOFF, ThreatLocker).
set -euo pipefail
cd "$(dirname "$0")"
docker run --rm -v "$PWD":/w -w /w python:3.12-slim sh -c '
  apt-get update -qq >/dev/null && apt-get install -y -qq graphviz >/dev/null &&
  pip install -q wireviz >/dev/null 2>&1 &&
  wireviz -f sp wiring.yml'
ls -la wiring.svg wiring.png
