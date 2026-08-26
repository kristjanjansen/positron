#!/bin/bash
# Runs INSIDE the moq-dev container. Tests the AUTHENTICATED draft-16 CF MoQ endpoint.
# Usage: test-d16-inner.sh <clock|media> [duration_s]
# Env: MOQ_TOKEN_PUBSUB (publisher), MOQ_TOKEN_SUB (subscriber). NEVER printed.
# Binaries expected at /target/release (volume moq-target16).
set -u
MODE="${1:-clock}"
DUR="${2:-40}"
BASE="https://draft-16.cloudflare.mediaoverquic.com"
PUB_URL="$BASE/$MOQ_TOKEN_PUBSUB"
SUB_URL="$BASE/$MOQ_TOKEN_SUB"
NS="d16e2e-$(date +%s)-$$"
BIN=/target/release
OUT=/moq/results-d16
mkdir -p "$OUT"

TS='BEGIN{$|=1} printf "%.6f %s", Time::HiRes::time(), $_'

case "$MODE" in
clock)
  echo "namespace=$NS host=$BASE mode=clock dur=${DUR}s pub=PUBSUB sub=SUB"
  "$BIN/moq-clock-ietf" --publish --namespace "$NS" "$PUB_URL" 2>"$OUT/clock-pub.err" \
    | perl -MTime::HiRes -ne "$TS" > "$OUT/clock-pub.log" &
  PUB=$!
  sleep 3
  "$BIN/moq-clock-ietf" --namespace "$NS" "$SUB_URL" 2>"$OUT/clock-sub.err" \
    | perl -MTime::HiRes -ne "$TS" > "$OUT/clock-sub.log" &
  SUB=$!
  sleep "$DUR"
  pkill -f moq-clock-ietf 2>/dev/null; kill $PUB $SUB 2>/dev/null; wait 2>/dev/null
  echo "--- pub stderr (tail):"; tail -3 "$OUT/clock-pub.err" | sed -e "s#${MOQ_TOKEN_PUBSUB}#<PUBSUB>#g"
  echo "--- sub stderr (tail):"; tail -3 "$OUT/clock-sub.err" | sed -e "s#${MOQ_TOKEN_SUB}#<SUB>#g"
  echo "--- pub lines: $(wc -l < "$OUT/clock-pub.log")  sub lines: $(wc -l < "$OUT/clock-sub.log")"
  perl -e '
    open(P,"<","'"$OUT"'/clock-pub.log"); while(<P>){chomp; my($t,$s)=split(/ /,$_,2); $pub{$s}=$t;}
    open(S,"<","'"$OUT"'/clock-sub.log"); my @all; my @rows;
    while(<S>){chomp; my($t,$s)=split(/ /,$_,2); next unless exists $pub{$s};
      my $d=($t-$pub{$s})*1000; push @all,[$s,$d];}
    # steady state: drop first 4 (join catch-up burst)
    my @d = map {$_->[1]} @all[4..$#all];
    @d = sort {$a<=>$b} @d;
    if(@d){ printf "matched=%d steady_n=%d p50=%.1fms p95=%.1fms min=%.1f max=%.1f\n",
      scalar(@all), scalar(@d), $d[int(@d*0.5)], $d[int(@d*0.95)], $d[0], $d[-1];
    } else { print "NO MATCHED TICKS\n"; }
    open(J,">","'"$OUT"'/clock-latency.jsonl");
    for my $r (@all){ printf J "{\"tick\":\"%s\",\"lat_ms\":%.2f}\n", $r->[0], $r->[1]; }
  '
  ;;
media)
  echo "namespace=$NS host=$BASE mode=media dur=${DUR}s pub=PUBSUB sub=SUB"
  ffmpeg -hide_banner -loglevel warning -re \
    -f lavfi -i "testsrc2=size=640x360:rate=30" -f lavfi -i "sine=frequency=440" \
    -c:v libx264 -preset veryfast -tune zerolatency -bf 0 -g 30 -pix_fmt yuv420p \
    -c:a aac -b:a 64k \
    -f mp4 -movflags empty_moov+frag_every_frame+separate_moof+omit_tfhd_offset - \
    2>"$OUT/media-ffmpeg.err" \
    | "$BIN/moq-pub" --name "$NS" "$PUB_URL" 2>"$OUT/media-pub.err" &
  PUB=$!
  sleep 5
  timeout "$DUR" env RUST_LOG=off "$BIN/moq-sub" --name "$NS" "$SUB_URL" 2>"$OUT/media-sub.err" > "$OUT/media-sub.mp4"
  pkill -f moq-pub 2>/dev/null; pkill -x ffmpeg 2>/dev/null; kill $PUB 2>/dev/null; wait 2>/dev/null
  echo "--- pub stderr (tail):"; tail -8 "$OUT/media-pub.err" | sed -e "s#${MOQ_TOKEN_PUBSUB}#<PUBSUB>#g"
  echo "--- sub stderr (tail):"; tail -8 "$OUT/media-sub.err" | sed -e "s#${MOQ_TOKEN_SUB}#<SUB>#g"
  echo "--- received bytes: $(stat -c%s "$OUT/media-sub.mp4" 2>/dev/null || echo 0)"
  ffprobe -hide_banner -show_entries format=format_name,duration -show_entries stream=codec_name,width,height \
    "$OUT/media-sub.mp4" 2>&1 | grep -E 'codec_name|width|height|duration|format_name|Invalid' | head
  ;;
esac
