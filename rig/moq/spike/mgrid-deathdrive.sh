#!/bin/zsh
# Drive ONE publisher-death round (RUNBOOK §13 phase 3).
# Usage: mgrid-deathdrive.sh <round>    e.g. 1
# Precondition: victim publisher p10 runs ALONE in Chrome udd moq-mgrid-victim<round>-udd.
# SIGKILLs the victim's whole Chrome tree (no clean QUIC close), timestamps the kill,
# waits for probe close/silent events, then relaunches the victim fresh (rejoin timing).
set -e
R=$1
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
cd /Users/s32863/personal/positron/rig/moq/spike
RES=/Users/s32863/personal/positron/results/moq-mgrid-death.jsonl

TK0=$(python3 -c 'import time;print(int(time.time()*1000))')
pkill -9 -f "moq-mgrid-victim${R}-udd"
TK1=$(python3 -c 'import time;print(int(time.time()*1000))')
echo "{\"k\":\"kill\",\"round\":$R,\"t0\":$TK0,\"t1\":$TK1}" >> $RES
echo "killed victim round=$R at $TK0 (kill took $((TK1-TK0)) ms)"

# wait for both probes to log a close OR silent for p10, cap 60 s
t0=$SECONDS
until [ "$(grep -aE '"k":"(close|silent)","pub":"p10"' /Users/s32863/personal/positron/results/moq-mgrid-death-run.jsonl 2>/dev/null | awk -v T=$TK0 -F'"t":' '{split($2,a,/[,}]/); if (a[1]+0>=T) c++} END {print c+0}')" -ge 2 ]; do
  [ $((SECONDS - t0)) -gt 60 ] && { echo "WARN: <2 death events after 60s"; break }
  sleep 1
done
sleep 3

# relaunch victim fresh (rejoin) — new udd for the NEXT round number
NR=$((R+1))
TR=$(python3 -c 'import time;print(int(time.time()*1000))')
rm -rf "logs/moq-mgrid-victim${NR}-udd"
nohup "$CH" --headless=new --user-data-dir="$PWD/logs/moq-mgrid-victim${NR}-udd" --no-first-run \
  --autoplay-policy=no-user-gesture-required --disable-background-timer-throttling \
  --disable-renderer-backgrounding --disable-backgrounding-occluded-windows \
  --window-size=400,250 "http://127.0.0.1:8887/mgrid-pub.html?ids=p10" \
  > "logs/moq-mgrid-victim${NR}.log" 2>&1 & disown
echo "{\"k\":\"relaunch\",\"round\":$R,\"t\":$TR}" >> $RES
echo "relaunched victim (round $NR udd) at $TR"
