#!/bin/zsh
# Gapless Cloudflare relay: ONE long-lived uplink ffmpeg whose socket never
# closes, fed by a FIFO of concatenated MPEG-TS from whichever source exists.
#
#   encoder --rtmp--> mediamtx --\
#                                 feeder loop --TS--> FIFO --> uplink ffmpeg --RTMPS--> Cloudflare
#   slate (lavfi) ---------------/
#
# The uplink re-encodes with setpts=N/FR/TB so timestamp jumps at splice
# points vanish; source switches become instant cuts. Cost: one extra encode.
#
# NO set -e: this is a supervisor. A failing kill/curl must never take the
# feeder down (it did: an orphaned slate then feeds the FIFO forever).
cd "$(dirname "$0")"
FF7=/opt/homebrew/opt/ffmpeg@7/bin/ffmpeg
KEY=$(python3 -c "import json;print(json.load(open('../../src/.last-input'))['key'])")
FIFO=/tmp/rig-ts.fifo
rm -f $FIFO; mkfifo $FIFO

# --- uplink: never exits, never closes the CF socket -----------------------
# discardcorrupt: a splice can truncate the old leg's audio PES mid-frame —
# drop that one packet instead of letting it cascade into an encoder death.
# -r 30 pins output fps so timestamp debris can never re-infer a bogus rate.
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
