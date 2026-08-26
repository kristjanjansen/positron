#!/bin/bash
# Draft-16 auth semantics test — runs INSIDE moq-dev container.
# Env: MOQ_TOKEN_PUBSUB, MOQ_TOKEN_SUB (never printed; output redacted).
BIN=/target/release
BASE="https://draft-16.cloudflare.mediaoverquic.com"

redact() { sed -e "s#${MOQ_TOKEN_PUBSUB}#<PUBSUB>#g" -e "s#${MOQ_TOKEN_SUB}#<SUB>#g"; }
ts() { perl -MTime::HiRes=time -ne 'printf "%.3f %s", time, $_'; }

run_case() {
  local label=$1 url=$2 mode=$3 ns=$4 secs=$5 log=${6:-info}
  echo "=== CASE $label mode=$mode ns=$ns log=$log ==="
  perl -MTime::HiRes=time -e 'printf "%.3f START\n", time'
  if [ "$mode" = publish ]; then
    RUST_LOG=$log timeout "$secs" $BIN/moq-clock-ietf --publish --namespace "$ns" "$url" 2>&1 | redact | ts
  else
    RUST_LOG=$log timeout "$secs" $BIN/moq-clock-ietf --namespace "$ns" "$url" 2>&1 | redact | ts
  fi
  echo "=== END $label exit=$? ==="
}

case "$1" in
  none)     run_case none-sub    "$BASE"                     subscribe d16auth-none 10 ;;
  garbage)  run_case garbage-sub "$BASE/not-a-real-token-xyz" subscribe d16auth-garb 10 ;;
  sub-sub)  run_case sub-sub     "$BASE/$MOQ_TOKEN_SUB"      subscribe d16auth-ss   8  ;;
  sub-pub)  run_case sub-pub     "$BASE/$MOQ_TOKEN_SUB"      publish   d16auth-sp   12 debug ;;
  pubsub-pub) run_case pubsub-pub "$BASE/$MOQ_TOKEN_PUBSUB"  publish   d16auth-pp   10 ;;
  latency)
    # 5 connect runs with PUBSUB (subscribe mode), start->connected delta
    for i in 1 2 3 4 5; do
      echo "--- run $i ---"
      perl -MTime::HiRes=time -e 'printf "%.3f START\n", time'
      RUST_LOG=info timeout 6 $BIN/moq-clock-ietf --namespace d16auth-lat "$BASE/$MOQ_TOKEN_PUBSUB" 2>&1 | redact | ts | grep -m1 -i "connect"
      pkill -f moq-clock-ietf 2>/dev/null
    done ;;
  *) echo "usage: $0 none|garbage|sub-sub|sub-pub|pubsub-pub|latency"; exit 1 ;;
esac
