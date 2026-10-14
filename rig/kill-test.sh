#!/bin/zsh
# Does how the encoder dies (SIGSTOP/CONT, SIGKILL, SIGTERM) decide whether Cloudflare keeps
# the broadcast? Each gap is 5 s against timeoutSeconds=10.
# why: lessons/rig-misc.md#kill-test-header
set -e
cd "$(dirname "$0")"
uid=$(python3 -c "import json;print(json.load(open('../src/.last-input'))['uid'])")
LC="https://customer-mwuu1cmlyif6eluy.cloudflarestream.com/$uid/lifecycle"
GAP=${GAP:-5}

vid()  { curl -s "$LC" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("videoUID") or "-")' 2>/dev/null; }
live() { curl -s "$LC" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("live"))' 2>/dev/null; }
wait_live() { for i in $(seq 1 60); do [ "$(live)" = "True" ] && return 0; sleep 1; done; return 1; }
ffpid() { pgrep -f "live.cloudflare.com" | head -1; }
start() { (../src/publish.sh >/tmp/kill-test-ff.log 2>&1 &) ; }

verdict() {  # $1=case  $2=before-uid
  wait_live || { echo "  [$1] never came back live"; return; }
  sleep 3
  local after=$(vid)
  if [ "$2" = "$after" ]; then echo "  [$1] ✓ SAME broadcast kept (${after:0:8})"
  else echo "  [$1] ✗ NEW broadcast (${2:0:8} -> ${after:0:8})"; fi
}

pkill -f "live.cloudflare.com" 2>/dev/null || true; sleep 2
start; wait_live; sleep 15
echo "settled, videoUID=$(vid | cut -c1-8)"

# Case 1: SIGSTOP/CONT, the pure network glitch.
# why: lessons/rig-misc.md#kill-test-1
b=$(vid)
echo "── SIGSTOP ${GAP}s then SIGCONT ──"
kill -STOP $(ffpid)
sleep $GAP
kill -CONT $(ffpid)
verdict "SIGSTOP" "$b"
sleep 15

# Case 2: SIGKILL, dead process with no RTMP goodbye.
# why: lessons/rig-misc.md#kill-test-2
b=$(vid)
echo "── SIGKILL, restart after ${GAP}s ──"
kill -9 $(ffpid)
sleep $GAP
start
verdict "SIGKILL" "$b"
sleep 15

# Case 3: SIGTERM, the clean goodbye.
# why: lessons/rig-misc.md#kill-test-3
b=$(vid)
echo "── SIGTERM, restart after ${GAP}s ──"
kill -TERM $(ffpid)
sleep $GAP
start
verdict "SIGTERM" "$b"

pkill -f "live.cloudflare.com" 2>/dev/null || true
echo "── done ──"
