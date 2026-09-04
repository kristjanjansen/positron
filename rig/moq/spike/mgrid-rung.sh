#!/bin/zsh
# Launch one multi-publisher ladder rung (RUNBOOK §13).
# Usage: mgrid-rung.sh <N> <rungname> <idprefix> [pubs_per_page]
# Kills ONLY moq-mgrid-* Chromes, clears the roster, launches probes first,
# then ceil(N/K) publisher pages of K co-tenant pipelines each.
# idprefix MUST be fresh per rung: CF draft-14 pins a namespace to the FIRST
# announce; after an unclean kill the name is dead for minutes (§13 finding).
set -e
N=$1; RUNG=$2; PFX=$3; K=${4:-5}
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
cd /Users/s32863/personal/positron/rig/moq/spike

pkill -9 -f 'moq-mgrid-.*-udd' 2>/dev/null || true
sleep 1
curl -s -X POST http://127.0.0.1:8887/roster -d '{"action":"clear"}' > /dev/null

launch() { # $1 udd-tag $2 url $3 winsize
  rm -rf "logs/moq-mgrid-$1-udd"
  nohup "$CH" --headless=new --user-data-dir="$PWD/logs/moq-mgrid-$1-udd" --no-first-run \
    --autoplay-policy=no-user-gesture-required --disable-background-timer-throttling \
    --disable-renderer-backgrounding --disable-backgrounding-occluded-windows \
    --window-size=${3:-800,600} "$2" > "logs/moq-mgrid-$1.log" 2>&1 & disown
}

# probes first (empty roster; they discover publishers via the roster poll)
launch "$RUNG-probe1" "http://127.0.0.1:8887/mgrid-probe.html?name=$RUNG&probe=probe1" "1400,900"
launch "$RUNG-probe2" "http://127.0.0.1:8887/mgrid-probe.html?name=$RUNG&probe=probe2" "1400,900"
sleep 3

# publishers in co-tenant chunks of K
i=1; c=1
while [ $i -le $N ]; do
  ids=""
  j=0
  while [ $j -lt $K ] && [ $i -le $N ]; do
    ids="$ids,$PFX$i"; i=$((i+1)); j=$((j+1))
  done
  ids=${ids#,}
  launch "$RUNG-c$c" "http://127.0.0.1:8887/mgrid-pub.html?ids=$ids" "800,400"
  c=$((c+1))
  sleep 0.5
done
echo "rung $RUNG: N=$N launched ($((c-1)) publisher pages, 2 probes)"
