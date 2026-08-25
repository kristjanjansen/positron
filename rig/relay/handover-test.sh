#!/bin/zsh
# Full gapless verification: videoUID stability AND content actually switching.
# Grabs a frame from the live Cloudflare manifest at each phase.
set -e
cd "$(dirname "$0")"
FF7=/opt/homebrew/opt/ffmpeg@7/bin/ffmpeg
UID_=$(python3 -c "import json;print(json.load(open('../../src/.last-input'))['uid'])")
B=https://customer-mwuu1cmlyif6eluy.cloudflarestream.com
LC="$B/$UID_/lifecycle"
OUT=${OUT:-/tmp/handover}
mkdir -p $OUT

vid() { curl -s -m 3 "$LC" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("videoUID") or "-")' 2>/dev/null; }
grab() { $FF7 -hide_banner -loglevel error -y -live_start_index -1 -i "$B/$UID_/manifest/video.m3u8" -ss 2 -frames:v 1 "$OUT/$1.png" 2>/dev/null && echo "  frame -> $1.png"; }
enc_start() {
  local EPOCH=$(python3 -c 'import time;print(f"{time.time():.6f}")')
  printf '%s' "drawtext=fontfile=/System/Library/Fonts/Supplemental/Courier New Bold.ttf:text='LIVE %{pts\\:flt\\:${EPOCH}}':x=40:y=40:fontsize=56:fontcolor=black:box=1:boxcolor=white:boxborderw=14" > /tmp/enc-filt.txt
  ($FF7 -hide_banner -loglevel error -re \
    -f lavfi -i "testsrc2=size=1280x720:rate=30" \
    -f lavfi -i "sine=frequency=440:sample_rate=48000" \
    -filter_script:v /tmp/enc-filt.txt \
    -c:v libx264 -preset veryfast -tune zerolatency -profile:v main -b:v 3000k \
    -g 60 -keyint_min 60 -bf 0 -sc_threshold 0 -pix_fmt yuv420p \
    -c:a aac -b:a 128k -ar 48000 -ac 2 \
    -f flv rtmp://localhost:1935/rig >/tmp/encoder.log 2>&1 &)
}

echo "── phase 0: wait for slate live ──"
for i in $(seq 1 30); do
  [ "$(curl -s -m 3 "$LC" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("live"))' 2>/dev/null)" = "True" ] && break
  sleep 3
done
V0=$(vid); echo "  live, videoUID=$V0"
sleep 5; grab "0-slate"

echo "── phase 1: encoder IN ──"
enc_start; sleep 35
V1=$(vid); echo "  videoUID=$V1  $([ "$V0" = "$V1" ] && echo '✓SAME' || echo '✗NEW')"
grab "1-live"

echo "── phase 2: encoder KILLED (gap 10s) ──"
pkill -f "rtmp://localhost:1935/rig"; sleep 10
V2=$(vid); echo "  videoUID=$V2  $([ "$V0" = "$V2" ] && echo '✓SAME' || echo '✗NEW')"
grab "2-slate-again"

echo "── phase 3: encoder BACK ──"
enc_start; sleep 35
V3=$(vid); echo "  videoUID=$V3  $([ "$V0" = "$V3" ] && echo '✓SAME' || echo '✗NEW')"
grab "3-live-again"

pkill -f "rtmp://localhost:1935/rig" 2>/dev/null || true
echo "── verdict: $([ "$V0" = "$V3" ] && [ "$V0" = "$V2" ] && [ "$V0" = "$V1" ] && echo 'ONE broadcast across all phases' || echo 'broadcast changed') ──"
echo "frames in $OUT"
