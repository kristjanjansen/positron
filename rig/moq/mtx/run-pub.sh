#!/bin/bash
# §12 publisher: python live source -> ffmpeg WHIP -> mediamtx (path moqmtx)
cd "$(dirname "$0")"
exec python3 gen-frames.py audio.fifo | ffmpeg -hide_banner \
  -f rawvideo -pix_fmt rgb24 -video_size 1280x720 -framerate 30 -i - \
  -f f32le -ar 48000 -ch_layout stereo -i audio.fifo \
  -c:v libx264 -profile:v baseline -level 3.1 -bf 0 -pix_fmt yuv420p -g 60 -b:v 2000k -tune zerolatency \
  -c:a libopus -ar 48000 -ac 2 -application lowdelay \
  -t 3600 -f whip "http://127.0.0.1:18889/moqmtx/whip"
