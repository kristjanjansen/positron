#!/bin/bash
# §12 BONUS publisher: host python live source (burned-ms row, HOST clock) ->
# host ffmpeg h264+aac fMP4 -> Docker moq-pub (draft-14) -> CF public relay.
# Namespace: elektron-shim-test. One-clock g2g stays valid (burn happens on host).
cd "$(dirname "$0")"
exec python3 gen-frames.py | ffmpeg -hide_banner -loglevel warning \
  -f rawvideo -pix_fmt rgb24 -video_size 1280x720 -framerate 30 -i - \
  -f lavfi -i "sine=frequency=440:sample_rate=48000" \
  -c:v libx264 -preset veryfast -tune zerolatency -profile:v baseline -level 3.1 -bf 0 -g 30 -pix_fmt yuv420p -b:v 2000k \
  -c:a aac -b:a 64k -ac 2 \
  -t 3600 -f mp4 -movflags empty_moov+frag_every_frame+separate_moof+omit_tfhd_offset - \
  | docker run -i --rm --name moq-mtx-cfpub -v moq-target14:/target moq-dev \
    /target/release/moq-pub --name elektron-shim-test "https://draft-14.cloudflare.mediaoverquic.com"
