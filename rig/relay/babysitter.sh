#!/bin/zsh
# Keeps path `rig` ALWAYS publishing: whenever the real encoder is absent,
# publish a slate into the same path. The real encoder overrides us at will
# (overridePublisher). Readers attached to `rig` — i.e. the Cloudflare
# forwarder — should never see the path die.
FF7=/opt/homebrew/opt/ffmpeg@7/bin/ffmpeg
SLATE_PID=""
slate_start() {
  $FF7 -hide_banner -loglevel error -re \
    -f lavfi -i "color=c=0x101820:size=1280x720:rate=30,drawtext=fontfile=/System/Library/Fonts/Supplemental/Courier New Bold.ttf:text='TEHNILINE PAUS':fontsize=64:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-60,drawtext=fontfile=/System/Library/Fonts/Supplemental/Courier New Bold.ttf:textfile=/tmp/overlay.txt:reload=30:fontsize=44:fontcolor=0x8fd4dd:x=(w-text_w)/2:y=(h-text_h)/2+40" \
    -f lavfi -i "anullsrc=r=48000:cl=stereo" \
    -c:v libx264 -preset veryfast -tune zerolatency -profile:v main \
    -b:v 3000k -minrate 3000k -maxrate 3000k -bufsize 3000k \
    -g 60 -keyint_min 60 -bf 0 -sc_threshold 0 -pix_fmt yuv420p \
    -c:a aac -b:a 128k -ar 48000 -ac 2 \
    -f flv rtmp://localhost:1935/rig &
  SLATE_PID=$!
}
while true; do
  ready=$(curl -s http://127.0.0.1:9997/v3/paths/get/rig | python3 -c 'import json,sys;print(json.load(sys.stdin).get("ready"))' 2>/dev/null)
  if [ "$ready" != "True" ]; then
    kill $SLATE_PID 2>/dev/null
    echo "$(date +%T) rig not ready -> publishing slate"
    slate_start
    sleep 3
  fi
  sleep 0.5
done
