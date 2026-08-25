#!/bin/bash
# Runs INSIDE the moq-dev container. Tests the PUBLIC draft-14 Cloudflare MoQ endpoint (no auth).
# Usage: test-draft14-inner.sh <clock|media> [duration_s]
# Binaries expected at /target/release (volume moq-target14).
set -u
MODE="${1:-clock}"
DUR="${2:-40}"
URL="${MOQ_URL:-https://draft-14.cloudflare.mediaoverquic.com}"
NS="elektron-$(date +%s)-$$"
BIN=/target/release
OUT=/moq/results-draft14
mkdir -p "$OUT"

# unbuffered wall-clock line timestamper (one clock for pub+sub = same VM)
TS='BEGIN{$|=1} printf "%.6f %s", Time::HiRes::time(), $_'

case "$MODE" in
clock)
  echo "namespace=$NS url=$URL mode=clock dur=${DUR}s"
  "$BIN/moq-clock-ietf" --publish --namespace "$NS" "$URL" 2>"$OUT/clock-pub.err" \
    | perl -MTime::HiRes -ne "$TS" > "$OUT/clock-pub.log" &
  PUB=$!
  sleep 3   # let the publisher announce first
  "$BIN/moq-clock-ietf" --namespace "$NS" "$URL" 2>"$OUT/clock-sub.err" \
    | perl -MTime::HiRes -ne "$TS" > "$OUT/clock-sub.log" &
  SUB=$!
  sleep "$DUR"
  pkill -f moq-clock-ietf 2>/dev/null; kill $PUB $SUB 2>/dev/null; wait 2>/dev/null
  echo "--- pub stderr (tail):"; tail -5 "$OUT/clock-pub.err"
  echo "--- sub stderr (tail):"; tail -5 "$OUT/clock-sub.err"
  echo "--- pub lines: $(wc -l < "$OUT/clock-pub.log")  sub lines: $(wc -l < "$OUT/clock-sub.log")"
  # join on tick text, print per-tick latency ms + p50/p95
  perl -e '
    open(P,"<","'"$OUT"'/clock-pub.log"); while(<P>){chomp; my($t,$s)=split(/ /,$_,2); $pub{$s}=$t;}
    open(S,"<","'"$OUT"'/clock-sub.log"); my @d;
    while(<S>){chomp; my($t,$s)=split(/ /,$_,2); next unless exists $pub{$s};
      push @d, ($t-$pub{$s})*1000;}
    @d = sort {$a<=>$b} @d;
    if(@d){ printf "matched=%d p50=%.1fms p95=%.1fms min=%.1f max=%.1f\n",
      scalar(@d), $d[int(@d*0.5)], $d[int(@d*0.95)], $d[0], $d[-1];
    } else { print "NO MATCHED TICKS\n"; }
  '
  ;;
media)
  echo "namespace=$NS url=$URL mode=media dur=${DUR}s"
  # publisher: lavfi test source -> fragmented mp4 (blog flag string) -> moq-pub
  ffmpeg -hide_banner -loglevel warning -re \
    -f lavfi -i "testsrc2=size=640x360:rate=30" -f lavfi -i "sine=frequency=440" \
    -c:v libx264 -preset veryfast -tune zerolatency -bf 0 -g 30 -pix_fmt yuv420p \
    -c:a aac -b:a 64k \
    -f mp4 -movflags empty_moov+frag_every_frame+separate_moof+omit_tfhd_offset - \
    2>"$OUT/media-ffmpeg.err" \
    | "$BIN/moq-pub" --name "$NS" "$URL" 2>"$OUT/media-pub.err" &
  PUB=$!
  sleep 5
  # RUST_LOG=off: draft-14 moq-sub writes tracing to STDOUT which would corrupt the mp4 byte stream
  timeout "$DUR" env RUST_LOG=off "$BIN/moq-sub" --name "$NS" "$URL" 2>"$OUT/media-sub.err" > "$OUT/media-sub.mp4"
  pkill -f moq-pub 2>/dev/null; pkill -x ffmpeg 2>/dev/null; kill $PUB 2>/dev/null; wait 2>/dev/null
  echo "--- pub stderr (tail):"; tail -8 "$OUT/media-pub.err"
  echo "--- sub stderr (tail):"; tail -8 "$OUT/media-sub.err"
  echo "--- received bytes: $(stat -c%s "$OUT/media-sub.mp4" 2>/dev/null || echo 0)"
  ffprobe -hide_banner -show_entries format=format_name,duration -show_entries stream=codec_name,width,height \
    "$OUT/media-sub.mp4" 2>&1 | grep -E 'codec_name|width|height|duration|format_name|Invalid' | head
  ;;
esac
