#!/bin/zsh
# Drive ONE viewer->publisher flip (RUNBOOK §13 phase 2).
# Usage: mgrid-flipdrive.sh <flipId>   e.g. f1
# Launches a fresh flip viewer Chrome, waits for it to be steady-viewing,
# POSTs the publish command (timestamped), waits for probes to decode it,
# then tears the flip page down and removes its namespace from the roster.
set -e
FID=$1
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
cd /Users/s32863/personal/elektron/rig/moq/spike

rm -rf "logs/moq-mgrid-$FID-udd"
nohup "$CH" --headless=new --user-data-dir="$PWD/logs/moq-mgrid-$FID-udd" --no-first-run \
  --autoplay-policy=no-user-gesture-required --disable-background-timer-throttling \
  --disable-renderer-backgrounding --disable-backgrounding-occluded-windows \
  --window-size=1400,900 "http://127.0.0.1:8887/mgrid-flip.html?id=$FID&name=flips" \
  > "logs/moq-mgrid-$FID.log" 2>&1 & disown

# wait until the flip page reports viewing all 10 (VSTATS every 10 s) or 45 s
t0=$SECONDS
until grep -q "MGFLIP $FID .*VSTATS viewing=10/10" logs/moq-mgrid.log 2>/dev/null; do
  [ $((SECONDS - t0)) -gt 60 ] && { echo "WARN: $FID not steady after 60s"; break }
  sleep 2
done
grep "MGFLIP $FID " logs/moq-mgrid.log | tail -2

# settle 5 s, then command
sleep 5
TPOST=$(python3 -c 'import time;print(int(time.time()*1000))')
curl -s -X POST http://127.0.0.1:8887/cmd -d "{\"id\":\"$FID\",\"action\":\"publish\"}" > /dev/null
echo "{\"k\":\"flip\",\"id\":\"$FID\",\"ev\":\"cmd_post\",\"t\":$TPOST}" >> /Users/s32863/personal/elektron/results/moq-mgrid-flips.jsonl

# wait until BOTH probes decoded the flip pub (FIRST_FRAME fN) or 30 s
t0=$SECONDS
until [ "$(grep -c "FIRST_FRAME $FID " logs/moq-mgrid.log 2>/dev/null)" -ge 2 ]; do
  [ $((SECONDS - t0)) -gt 30 ] && { echo "WARN: probes did not decode $FID in 30s"; break }
  sleep 1
done
sleep 3   # let jsonl buffers flush

# teardown: kill flip page, deregister
pkill -9 -f "moq-mgrid-$FID-udd" || true
curl -s -X POST http://127.0.0.1:8887/roster -d "{\"action\":\"remove\",\"ns\":\"elektron-mgrid-$FID\"}" > /dev/null
echo "flip $FID complete"
