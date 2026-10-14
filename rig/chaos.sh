#!/bin/zsh
# ./chaos.sh [gaps...] (default 2 5 12 25 60): interrupt RTMPS ingest and log when.
# timeoutSeconds is 10: shorter gaps resume the video UID, longer ones mint a new one.
# why: lessons/rig-misc.md#chaos-header
set -e
cd "$(dirname "$0")"
if (( $# )); then GAPS=($@); else GAPS=(2 5 12 25 60); fi
UP=${UP:-40}            # seconds of healthy streaming between interruptions
COLLECTOR=http://127.0.0.1:8900

mark() { curl -sS -X POST "$COLLECTOR/event" -H 'content-type: application/json' \
           --data "{\"event\":\"$1\",\"detail\":\"$2\"}" >/dev/null || true; }

uid=$(python3 -c "import json;print(json.load(open('../src/.last-input'))['uid'])")
lifecycle="https://customer-mwuu1cmlyif6eluy.cloudflarestream.com/$uid/lifecycle"
video_uid() { curl -s "$lifecycle" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("videoUID",""))' 2>/dev/null; }

start_ingest() { (../src/publish.sh >/tmp/chaos-ffmpeg.log 2>&1 &) ; }
stop_ingest()  { pkill -f "live.cloudflare.com" 2>/dev/null || true; }

echo "gaps: $GAPS   up-time between: ${UP}s"
mark run_start "gaps=$GAPS up=$UP"

stop_ingest; sleep 2
start_ingest
mark ingest_up "initial"
echo "  settling ${UP}s ..."
sleep $UP

for g in $GAPS; do
  before=$(video_uid)
  echo "── gap ${g}s (videoUID before: ${before:0:8}) ──"
  stop_ingest
  mark ingest_down "gap=$g"
  sleep $g

  start_ingest
  mark ingest_up "gap=$g"
  # wait for Cloudflare to report live again, up to 60s
  for i in $(seq 1 60); do
    [ "$(curl -s "$lifecycle" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("live"))' 2>/dev/null)" = "True" ] && break
    sleep 1
  done
  after=$(video_uid)
  if [ "$before" != "$after" ]; then
    echo "  NEW BROADCAST: ${before:0:8} -> ${after:0:8}"
    mark new_video "gap=$g ${before:0:8}->${after:0:8}"
  else
    echo "  same broadcast resumed"
    mark same_video "gap=$g"
  fi
  sleep $UP
done

mark run_end ""
echo "── chaos complete ──"
