#!/bin/zsh
# ./publish.sh [input.mp4]: a test pattern (or a file) to provision.sh's input. Cloudflare LL-HLS
# needs H.264, CBR, a fixed GOP equal to the segment (2 s) and B-frames off.
# why: lessons/src.md#publish
set -e
cd "$(dirname "$0")"
FF=${FF:-/opt/homebrew/opt/ffmpeg@7/bin/ffmpeg}   # needs libfreetype for the clock overlay
[ -x "$FF" ] || FF=ffmpeg

# Fail loudly if provision.sh hasn't run: eval'ing an empty substitution would
# silently publish to rtmps://…/live/ with no key.
[ -f .last-input ] || { echo "publish.sh: .last-input missing — run ./provision.sh first" >&2; exit 1; }
KEY=$(python3 -c "import json;print(json.load(open('.last-input'))['key'])") || exit 1
[ -n "$KEY" ] || { echo "publish.sh: no key in .last-input" >&2; exit 1; }

FPS=30
GOP=$((FPS * 2))

# A monospace bold face, so changing digits do not shift sideways; DejaVu Sans Mono Bold if
# present.
# why: lessons/src.md#font
FONT=""
for f in \
  /opt/homebrew/share/fonts/DejaVuSansMono-Bold.ttf \
  /usr/local/share/fonts/DejaVuSansMono-Bold.ttf \
  /usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf \
  "$HOME/Library/Fonts/DejaVuSansMono-Bold.ttf" \
  "/System/Library/Fonts/Supplemental/Courier New Bold.ttf"
do
  if [ -f "$f" ]; then FONT=$f; break; fi
done
[ -n "$FONT" ] || { echo "publish.sh: no monospace bold font found" >&2; exit 1; }
echo "publish.sh: font $FONT" >&2

if [ -n "$1" ]; then
  INPUT=(-re -stream_loop -1 -i "$1")
else
  # Burn the epoch in for screenshot latency: `%{pts:flt:OFFSET}` works, `basetime` does not.
  # The filter is generated from demo/shell/pattern.mjs. HUE=<0..359> tints it; ROW=1 adds the
  # clock row.
  # why: lessons/src.md#epoch
  EPOCH=$(python3 -c 'import time;print(f"{time.time():.6f}")')
  # An `[ … ] && x` here would be a `set -e` landmine, not a shortcut.
  node ../demo/shell/pattern.mjs \
    --epoch="$EPOCH" --hue="${HUE:-280}" --font="$FONT" \
    > /tmp/ll-filt.txt
  [ -s /tmp/ll-filt.txt ] || { echo "publish.sh: pattern.mjs produced no filter" >&2; exit 1; }
  INPUT=(-re -f lavfi -i "testsrc2=size=1280x720:rate=$FPS" -re -f lavfi -i "sine=frequency=1000:sample_rate=48000" -filter_script:v /tmp/ll-filt.txt)
fi

exec "$FF" -hide_banner -loglevel warning "${INPUT[@]}" \
  -c:v libx264 -preset veryfast -tune zerolatency -profile:v main \
  -b:v 3000k -minrate 3000k -maxrate 3000k -bufsize 3000k \
  -g $GOP -keyint_min $GOP -bf 0 -sc_threshold 0 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -ar 48000 -ac 2 \
  -f flv "rtmps://live.cloudflare.com:443/live/${KEY}"
