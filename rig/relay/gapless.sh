#!/bin/zsh
# Gapless Cloudflare relay: one long-lived uplink fed by a FIFO of TS from whichever source exists.
# setpts=N/FR/TB hides splice jumps. No set -e: a supervisor must survive a failing kill or curl.
# why: lessons/rig-misc.md#gapless-header
cd "$(dirname "$0")"
FF7=/opt/homebrew/opt/ffmpeg@7/bin/ffmpeg
KEY=$(python3 -c "import json;print(json.load(open('../../src/.last-input'))['key'])")
FIFO=/tmp/rig-ts.fifo
rm -f $FIFO; mkfifo $FIFO

# Uplink: discardcorrupt drops a truncated audio packet at a splice; -r 30 pins the output rate.
# why: lessons/rig-misc.md#gapless-uplink
$FF7 -hide_banner -loglevel warning \
  -err_detect ignore_err \
  -f mpegts -fflags +genpts+igndts+discardcorrupt -i $FIFO \
  -vf "setpts=N/30/TB" -r 30 -af "asetpts=N/48000/TB,aresample=async=1" \
  -c:v libx264 -preset veryfast -tune zerolatency -profile:v main \
  -b:v 3000k -maxrate 3500k -bufsize 6000k \
  -g 60 -keyint_min 60 -bf 0 -sc_threshold 0 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -ar 48000 -ac 2 \
  -f flv "rtmps://live.cloudflare.com:443/live/$KEY" &
UPLINK=$!
echo "uplink pid $UPLINK"

# --- feeder: packet-aligned, RAI-gated source splicer -----------------------
python3 splicer.py > $FIFO 2>>/tmp/feeder.log &
FEEDER=$!
echo "feeder (splicer.py) pid $FEEDER"
wait $UPLINK
