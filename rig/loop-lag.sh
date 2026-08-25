#!/bin/zsh
# Perception-lag loop (open item 8): how stale is the newest frame Cloudflare
# will hand a client right now?
#
#   N x { t0 = now
#         grab one live-edge frame  (-live_start_index -1)
#         OCR the millisecond wall clock the splicer burned into the pixels
#         lag = time-of-day(t0) - time-of-day(burned) }
#
# Reports p50/p95. Runs fully headless off the webcam/slate leg of the gapless
# relay (splicer.py burns %{localtime:%T.%3N} into every source-leg frame).
#
# Clock validity: burner and reader are THE SAME MACHINE, so absolute clock
# error cancels exactly — do not correct for it, just note it in the report.
# Player-side perceived lag = THIS pipeline lag + player.latency (2.5-4.0 s
# measured for the tuned hls.js arm).
#
# Usage:  loop-lag.sh [N] [sleep_s]      (defaults: 20 iterations, 2 s apart)
set -u
cd "$(dirname "$0")"
FF7=/opt/homebrew/opt/ffmpeg@7/bin/ffmpeg
FP7=/opt/homebrew/opt/ffmpeg@7/bin/ffprobe
N=${1:-20}
SLEEP=${2:-2}
UID_=$(python3 -c "import json;print(json.load(open('../src/.last-input'))['uid'])")
B=https://customer-mwuu1cmlyif6eluy.cloudflarestream.com
RAW=${RAW:-../results/loop-lag.jsonl}
FRAME=/tmp/loop-lag-frame.png

: > "$RAW"
echo "loop-lag: $N iterations against $B/$UID_ -> $RAW"

for i in $(seq 1 $N); do
  t0=$(python3 -c 'import time;print(f"{time.time():.6f}")')
  if ! $FF7 -hide_banner -loglevel error -y -live_start_index -1 \
        -i "$B/$UID_/manifest/video.m3u8" -frames:v 1 -update 1 "$FRAME" \
        2>/tmp/loop-lag-ff.err; then
    echo "[$i] grab FAILED: $(tail -1 /tmp/loop-lag-ff.err)"
    sleep $SLEEP; continue
  fi
  t1=$(python3 -c 'import time;print(f"{time.time():.6f}")')
  # whitelist colon must be \: at the filter level ('...' quotes the value)
  txt=$($FP7 -v error -f lavfi \
        -i "movie=$FRAME,crop=430:80:0:0,ocr=whitelist='0123456789\\:.'" \
        -show_entries frame_tags=lavfi.ocr.text -of default=nw=1 2>/dev/null | head -1)
  txt=${txt#TAG:lavfi.ocr.text=}
  python3 - "$i" "$t0" "$t1" "$txt" >> "$RAW" <<'PY'
import json, re, sys, time
i, t0, t1, txt = int(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3]), sys.argv[4].strip()
row = {"i": i, "t0": t0, "grab_s": round(t1 - t0, 3), "ocr": txt}
m = re.fullmatch(r"(\d{2}):(\d{2}):(\d{2})\.(\d{3})", txt)
if m:
    h, mn, s, ms = map(int, m.groups())
    burned = h * 3600 + mn * 60 + s + ms / 1000.0
    lt = time.localtime(t0)
    tod0 = lt.tm_hour * 3600 + lt.tm_min * 60 + lt.tm_sec + (t0 % 1)
    lag = tod0 - burned
    if lag < -43200: lag += 86400        # midnight wrap
    elif lag > 43200: lag -= 86400
    row["lag_s"] = round(lag, 3)
else:
    row["error"] = "unparseable OCR"
print(json.dumps(row))
PY
  tail -1 "$RAW"
  sleep $SLEEP
done

python3 - "$RAW" <<'PY'
import json, sys
rows = [json.loads(l) for l in open(sys.argv[1])]
lags = sorted(r["lag_s"] for r in rows if "lag_s" in r)
bad = len(rows) - len(lags)
if not lags:
    sys.exit("no valid samples")
def pct(p):
    k = (len(lags) - 1) * p / 100.0
    f = int(k)
    return lags[f] + (lags[min(f + 1, len(lags) - 1)] - lags[f]) * (k - f)
print(f"\nvalid {len(lags)}/{len(rows)} (rejected {bad})")
print(f"pipeline lag  p50 {pct(50):.3f} s   p95 {pct(95):.3f} s   min {lags[0]:.3f}   max {lags[-1]:.3f}")
print(f"player-perceived = pipeline + player.latency(2.5-4.0 s) "
      f"=> ~{pct(50)+2.5:.1f}-{pct(50)+4.0:.1f} s at p50")
PY
