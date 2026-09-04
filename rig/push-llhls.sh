#!/bin/zsh
# LL-HLS-compliant RTMPS push with absolute-epoch burn-in.
# Cloudflare LL-HLS requires: H.264, CBR, fixed GOP 2-4s, B-frames = 0.
set -e
FF=${FF:-/opt/homebrew/opt/ffmpeg@7/bin/ffmpeg}
SCRATCH=${SCRATCH:-/private/tmp/claude-501/-Users-s32863-personal-positron/3e55abee-40f5-4628-b7fd-775f7a2bfd0b/scratchpad}
mkdir -p "$SCRATCH"
KEY=$(cat /tmp/li_key.txt)
FONT=/System/Library/Fonts/Supplemental/Courier\ New\ Bold.ttf

EPOCH=$(python3 -c 'import time;print(f"{time.time():.6f}")')
echo "EPOCH_SENT=$EPOCH" > "$SCRATCH/epoch.txt"

printf '%s' "drawtext=fontfile=${FONT}:text='%{pts\:flt\:${EPOCH}}':x=40:y=40:fontsize=64:fontcolor=black:box=1:boxcolor=white:boxborderw=16" > "$SCRATCH/push_filt.txt"

exec "$FF" -hide_banner -loglevel warning \
  -re -f lavfi -i "testsrc2=size=1280x720:rate=30" \
  -re -f lavfi -i "sine=frequency=1000:sample_rate=48000" \
  -filter_script:v "$SCRATCH/push_filt.txt" \
  -c:v libx264 -preset veryfast -tune zerolatency -profile:v main \
  -b:v 3000k -minrate 3000k -maxrate 3000k -bufsize 3000k \
  -g 60 -keyint_min 60 -bf 0 -sc_threshold 0 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -ar 48000 -ac 2 \
  -f flv "rtmps://live.cloudflare.com:443/live/${KEY}"
