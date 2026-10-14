#!/bin/bash
# ./push.sh [<pi>] [--no-restart]: ship this checkout to the board and restart the service.
# The service runs from /opt/positron-board, not ~/positron, so this writes /opt and prints md5s.
# why: lessons/rig-board-io.md#push-header
set -uo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
USER_=${BOARD_USER:-positron}
DEST=/opt/positron-board
RESTART=1
IP=""
for a in "$@"; do
  case "$a" in
    --no-restart) RESTART=0 ;;
    -*) echo "unknown flag $a" >&2; exit 2 ;;
    *) IP="$a" ;;
  esac
done

# Find the board on port 22: mDNS and ARP guesses both missed it.
# why: lessons/rig-board-io.md#push-find
if [ -z "$IP" ]; then
  base=$(ipconfig getifaddr en0 2>/dev/null | sed 's/\.[0-9]*$//')
  [ -n "$base" ] || { echo "no IPv4 on en0 — pass the address" >&2; exit 1; }
  echo "looking for a host that answers on ssh in ${base}.0/24 ..." >&2
  for i in $(seq 1 254); do (nc -z -G 1 -w 1 "${base}.$i" 22 2>/dev/null && echo "${base}.$i" >> /tmp/positron-ssh.$$) & done
  wait
  for cand in $(sort -u /tmp/positron-ssh.$$ 2>/dev/null); do
    if ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=4 \
           "$USER_@$cand" 'test -d /opt/positron-board' 2>/dev/null; then IP=$cand; break; fi
  done
  rm -f /tmp/positron-ssh.$$
  [ -n "$IP" ] || { echo "nothing on this subnet answers as the board" >&2; exit 1; }
  echo "   found it at $IP" >&2
fi

echo "== shipping to $IP:$DEST"
# rig/board, rig/vis (compiled on the board) and every module rig/board imports from two levels up,
# by tar over ssh. COPYFILE_DISABLE=1 keeps macOS `._` files out.
# why: lessons/rig-board-io.md#push-tar
( cd "$SRC/../.." && COPYFILE_DISABLE=1 tar cf - --no-xattrs --exclude=node_modules --exclude='._*' \
    rig/board rig/vis \
    $(cd rig/board && grep -ho "from '\.\./\.\./[^']*'" ./*.mjs | sed "s|from '\.\./\.\./||; s|'$||" | sort -u) \
) | ssh "$USER_@$IP" "sudo tar xf - -C $DEST && sudo chown -R $USER_ $DEST && echo '   unpacked'"

echo "== the one npm dependency, if package.json moved (rtc.mjs, node-datachannel)"
# A prebuilt linux arm64 binary: 4 s, no compiler (plans/plan-away-webrtc.md §4).
# Never installed on the laptop, which SIGKILLs a native module it did not build.
ssh "$USER_@$IP" "cd $DEST/rig/board && if [ ! -d node_modules/node-datachannel ] || [ package.json -nt node_modules/.package-lock.json ]; then npm install --omit=dev --no-audit --no-fund 2>&1 | tail -1; else echo '   unchanged'; fi"
echo "== building the renderer, if its source changed"
# Rebuild the renderer every push: a stale binary runs the previous shader under the new name.
# why: lessons/rig-board-io.md#push-vis
ssh "$USER_@$IP" 'cd /opt/positron-board/rig/vis 2>/dev/null && {
  for t in v3dbench v3dpipe; do
    if [ ! -x "$t" ] || [ "$t.c" -nt "$t" ]; then
      gcc -O2 -o "$t" "$t.c" -lEGL -lGLESv2 -lgbm 2>&1 | head -5 && echo "   built $t" || echo "   FAILED to build $t"
    fi
  done
  ls -la v3dpipe 2>/dev/null || echo "   no v3dpipe — visuals will report unavailable"
}'

# sclang reads classes only from its Extensions directory, so engine classes are copied there too.
# `/home/$USER_`, not `$HOME`, which the local shell would expand.
# why: lessons/rig-board-io.md#push-sc-ext
SC_EXT="/home/$USER_/.local/share/SuperCollider/Extensions"
echo "== the SuperCollider classes, to the path sclang actually compiles"
# Every class, PosSource.sc included: a missing class stops sclang's compile and READY never
# prints.
# why: lessons/rig-board-io.md#push-classes
ssh "$USER_@$IP" "mkdir -p $SC_EXT/pappus/lib && \
  cp $DEST/rig/board/norns/Engine_Pappus.sc $SC_EXT/pappus/lib/Engine_Pappus.sc && \
  cp $DEST/rig/board/norns/PosSource.sc $SC_EXT/pappus/lib/PosSource.sc && \
  cp $DEST/rig/board/norns/CroneEngine.sc $SC_EXT/CroneEngine.sc && echo '   classes installed'"

echo "== what landed, against what was sent"
# The md5s of the files that will execute (the engine from Extensions), covering every changed
# module.
# why: lessons/rig-board-io.md#push-md5
ssh "$USER_@$IP" "md5sum $DEST/rig/board/board.mjs $DEST/rig/board/jacksynth.mjs $DEST/rig/board/pappus.mjs \
  $DEST/rig/board/scsampler.mjs $DEST/rig/board/sampler.mjs $DEST/rig/board/norns/possampler-defs.scd \
  $DEST/rig/board/norns/run-pappus.scd \
  $DEST/rig/board/scollide.mjs $DEST/rig/board/norns/poscollide-defs.scd \
  $DEST/demo/shell/sclang-lite.mjs $DEST/demo/shell/synthdef.mjs \
  $DEST/rig/board/beat.mjs $DEST/demo/shell/graph-registry.mjs \
  $SC_EXT/pappus/lib/Engine_Pappus.sc $SC_EXT/pappus/lib/PosSource.sc 2>/dev/null"
md5sum "$SRC/board.mjs" "$SRC/jacksynth.mjs" "$SRC/pappus.mjs" "$SRC/scsampler.mjs" "$SRC/sampler.mjs" "$SRC/norns/possampler-defs.scd" "$SRC/norns/run-pappus.scd" \
  "$SRC/scollide.mjs" "$SRC/norns/poscollide-defs.scd" "$SRC/../../demo/shell/sclang-lite.mjs" "$SRC/../../demo/shell/synthdef.mjs" \
  "$SRC/beat.mjs" "$SRC/../../demo/shell/graph-registry.mjs" \
  "$SRC/norns/Engine_Pappus.sc" "$SRC/norns/PosSource.sc" 2>/dev/null \
  || md5 -r "$SRC/board.mjs" "$SRC/jacksynth.mjs" "$SRC/pappus.mjs" "$SRC/scsampler.mjs" "$SRC/sampler.mjs" "$SRC/norns/possampler-defs.scd" "$SRC/norns/run-pappus.scd" \
     "$SRC/scollide.mjs" "$SRC/norns/poscollide-defs.scd" "$SRC/../../demo/shell/sclang-lite.mjs" "$SRC/../../demo/shell/synthdef.mjs" \
     "$SRC/beat.mjs" "$SRC/../../demo/shell/graph-registry.mjs" \
     "$SRC/norns/Engine_Pappus.sc" "$SRC/norns/PosSource.sc"

if [ "$RESTART" = 1 ]; then
  echo "== restarting"
  ssh "$USER_@$IP" 'sudo systemctl restart positron-board && sleep 2 && systemctl is-active positron-board'
  echo "== the first lines it says"
  ssh "$USER_@$IP" 'journalctl -u positron-board -n 12 --no-pager -o cat'
else
  echo "== not restarting (--no-restart); the running board still has the old code"
fi
