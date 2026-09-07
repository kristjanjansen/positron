#!/bin/zsh
# Publish a test pattern to the live input created by provision.sh.
#
#   ./publish.sh [input.mp4]     # omit for a synthetic test pattern
#
# Encoder settings are the ones Cloudflare LL-HLS requires:
#   H.264, CBR, fixed GOP, and B-frames OFF (they break LL-HLS).
# GOP == segment length. 2 s is the shortest Cloudflare currently recommends.
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

# MONOSPACE BOLD, whichever one this machine has. The face matters: in a
# proportional font the digits shift sideways as they change, which is jitter in
# exactly the region a reader is watching. The container publisher burns
# DejaVuSansMono-Bold (it ships in ttf-dejavu); prefer the same face here when
# it exists, and fall back to the Courier New Bold this script has always used.
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
  # Burn an absolute epoch into the pixels so latency is measurable from a
  # screenshot alone. %{pts:flt:OFFSET} — note `basetime` does NOT work.
  #
  # The filter is GENERATED from demo/shell/pattern.mjs, which is the one place
  # the pattern is specified — the same module draws the browser-canvas version.
  # This publisher therefore cannot drift from the canvas one; the container's
  # copy can only be kept in step by hand (its image is one COPY'd file).
  #   HUE=<0..359>  distinguish this publisher from the container's two legs
  #   ROW=1         also burn the 56-block machine-readable clock row
  EPOCH=$(python3 -c 'import time;print(f"{time.time():.6f}")')
  # An `[ … ] && x` here would be a `set -e` landmine, not a shortcut.
  ROWFLAG=()
  if [ "${ROW:-0}" = "1" ]; then ROWFLAG=(--row); fi
  node ../demo/shell/pattern.mjs \
    --epoch="$EPOCH" --hue="${HUE:-280}" --label=local --font="$FONT" "${ROWFLAG[@]}" \
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
