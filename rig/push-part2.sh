#!/bin/zsh
# part2-mystery encoder: same encode teed to (a) Cloudflare RTMPS and (b) a local
# FLV-parsing tap that timestamps when each frame's bytes leave the muxer.
# Derived from push-llhls.sh; knobs via env:
#   GOP   (default 60)      keyframe interval in frames @30fps
#   TUNE  (default zerolatency; "none" drops -tune → default lookahead/mbtree/frame-threads)
#   TAP   (default 127.0.0.1:8898; "none" disables the tap leg)
#   AUDIO (default on; "off" → no audio stream)
#   KEYFILE (default $SCRATCH/p2_key.txt)
set -e
FF=${FF:-/opt/homebrew/opt/ffmpeg@7/bin/ffmpeg}
SCRATCH=${SCRATCH:-/private/tmp/claude-501/-Users-s32863-personal-elektron/3e55abee-40f5-4628-b7fd-775f7a2bfd0b/scratchpad}
mkdir -p "$SCRATCH"
KEY=$(cat "${KEYFILE:-$SCRATCH/p2_key.txt}")
FONT=/System/Library/Fonts/Supplemental/Courier\ New\ Bold.ttf
GOP=${GOP:-60}
TUNE=${TUNE:-zerolatency}
TAP=${TAP:-127.0.0.1:8898}
AUDIO=${AUDIO:-on}

EPOCH=$(python3 -c 'import time;print(f"{time.time():.6f}")')
echo "EPOCH_SENT=$EPOCH" > "$SCRATCH/p2_epoch.txt"
printf '%s' "drawtext=fontfile=${FONT}:text='%{pts\:flt\:${EPOCH}}':x=40:y=40:fontsize=64:fontcolor=black:box=1:boxcolor=white:boxborderw=16" > "$SCRATCH/p2_filt.txt"

typeset -a tune_args audio_in audio_codec maps
[[ "$TUNE" != "none" ]] && tune_args=(-tune "$TUNE")
if [[ "$AUDIO" == "on" ]]; then
  audio_in=(-re -f lavfi -i "sine=frequency=1000:sample_rate=48000")
  audio_codec=(-c:a aac -b:a 128k -ar 48000 -ac 2)
  maps=(-map 0:v -map 1:a)
else
  maps=(-map 0:v)
fi

CF="rtmps://live.cloudflare.com:443/live/${KEY}"
if [[ "$TAP" == "none" ]]; then
  OUT=(-f flv "$CF")
else
  OUT=(-f tee "[f=flv]${CF}|[f=flv:onfail=ignore]tcp://${TAP}")
fi

exec "$FF" -hide_banner -loglevel warning \
  -re -f lavfi -i "testsrc2=size=1280x720:rate=30" \
  "${audio_in[@]}" \
  -filter_script:v "$SCRATCH/p2_filt.txt" \
  -c:v libx264 -preset veryfast "${tune_args[@]}" -profile:v main \
  -b:v 3000k -minrate 3000k -maxrate 3000k -bufsize 3000k \
  -g "$GOP" -keyint_min "$GOP" -bf 0 -sc_threshold 0 -pix_fmt yuv420p \
  "${audio_codec[@]}" \
  "${maps[@]}" \
  "${OUT[@]}"
