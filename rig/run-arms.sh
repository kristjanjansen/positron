#!/bin/zsh
# Run the three hls.js recovery arms sequentially in ONE foreground Chrome tab.
# Sequential is mandatory: a backgrounded tab stops buffering and stops rVFC,
# so two arms cannot be measured concurrently on one machine.
set -e
BASE="http://127.0.0.1:8899/measure-llhls.html"
DWELL=${DWELL:-70}

open -a "Google Chrome" "$BASE?cb=$RANDOM&run=warmup&fix=none" >/dev/null
sleep 3

for arm in none config seek; do
  echo "── arm: $arm (cold start, ${DWELL}s) ────────────────────"
  # about:blank first => genuine cold start, not a hot reload of a running player
  osascript -e 'tell application "Google Chrome" to set URL of active tab of front window to "about:blank"' >/dev/null
  sleep 2
  osascript -e "tell application \"Google Chrome\" to set URL of active tab of front window to \"$BASE?cb=$RANDOM&run=$arm&fix=$arm\"" >/dev/null
  sleep $DWELL
done

osascript -e 'tell application "Google Chrome" to set URL of active tab of front window to "about:blank"' >/dev/null
echo "── done ────────────────────"
