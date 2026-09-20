#!/bin/bash
# rig/board/push.sh — put THIS checkout on the board and restart the service.
#
#   ./push.sh                 find the board, ship, restart, show the log
#   ./push.sh 192.168.1.213   skip the search
#   ./push.sh --no-restart    ship only (a running instrument keeps playing)
#
# `provision.sh` is the first-run path: it installs packages, kernel modules and
# the unit file. This is the loop you use fifty times after that, and it exists
# because doing it by hand got the destination wrong.
#
# ⚠️ THE SERVICE RUNS FROM /opt/positron-board, NOT FROM ~/positron.
# `provision.sh` unpacks into ~/positron and `setup.sh` copies that to /opt.
# A file edited in ~/positron changes nothing, and the copy already on the board
# there is stale — it has no pappus.mjs at all. So this writes to /opt directly
# and prints the md5 of what landed, because "it deployed" and "it says it
# deployed" have been different things here before.
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

# ── find it ──────────────────────────────────────────────────────────────────
# Port 22, not mDNS and not ARP. `positron-board.local` does not resolve from this
# sandbox (mDNS is multicast UDP) and guessing Raspberry Pi MAC prefixes in the
# ARP cache missed the board entirely while it was sitting on the subnet.
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
# rig/board plus every module it imports from outside itself, at the paths the
# imports expect. tar over ssh rather than rsync, which a fresh Pi OS Lite does
# not have.
# ⚠️ rig/vis GOES TOO. The renderer is a C program that has to be COMPILED on
# the board, and it lived in /tmp there until 2026-09-11 — one reboot from
# taking every number in plan-visuals §3 with it.
( cd "$SRC/../.." && tar cf - \
    rig/board rig/vis \
    $(cd rig/board && grep -ho "from '\.\./\.\./[^']*'" ./*.mjs | sed "s|from '\.\./\.\./||; s|'$||" | sort -u) \
) | ssh "$USER_@$IP" "sudo tar xf - -C $DEST && sudo chown -R $USER_ $DEST && echo '   unpacked'"

echo "== building the renderer, if its source changed"
# Cheap and idempotent: gcc is fast on two small files, and a binary older than
# its source is the failure this avoids — it would run the PREVIOUS shader and
# report the new one's name.
ssh "$USER_@$IP" 'cd /opt/positron-board/rig/vis 2>/dev/null && {
  for t in v3dbench v3dpipe; do
    if [ ! -x "$t" ] || [ "$t.c" -nt "$t" ]; then
      gcc -O2 -o "$t" "$t.c" -lEGL -lGLESv2 -lgbm 2>&1 | head -5 && echo "   built $t" || echo "   FAILED to build $t"
    fi
  done
  ls -la v3dpipe 2>/dev/null || echo "   no v3dpipe — visuals will report unavailable"
}'

# ⚠️ THE ENGINE HAS A SECOND HOME, AND sclang ONLY READS THAT ONE.
#
# `Engine_Pappus.sc` and `CroneEngine.sc` are SuperCollider CLASSES, so sclang
# compiles them from its Extensions directory — /opt/positron-board is not on its
# class path at all. Shipping the engine to /opt and restarting therefore
# changes NOTHING, silently: the service comes up, the engine loads, every
# command works, and it is the previous version of the file.
#
# MEASURED 2026-09-13: an added command read `CroneEngine: no command 'report'`
# and `PAPPUS READY 106 commands` while the copy in /opt had the new one and
# matched its md5. Two copies, two different md5s, and the md5 this script was
# printing was the one nobody compiles. That is LESSONS #39 in a third costume —
# ~/positron against /opt was the first, /opt against Extensions is this one.
# ⚠️ NOT `$HOME`. This string is interpolated into an ssh command by the LOCAL
# shell, so `$HOME` would expand to the Mac's home directory and every path
# below would be built for the wrong machine — a copy that succeeds into
# somewhere nothing reads, which is the exact failure this block exists to fix.
SC_EXT="/home/$USER_/.local/share/SuperCollider/Extensions"
echo "== the SuperCollider classes, to the path sclang actually compiles"
# ⚠️ EVERY CLASS, NOT JUST THE ENGINE. `PosSource.sc` is a class too, so the
# paragraph above applies to it word for word — and it is newer, so it is the
# one most likely to be left behind. A missing class does not fail loudly:
# sclang's compile stops at the first unknown name, `PAPPUS READY` never prints,
# and `fx.pappus` reports "the engine came up but never reported READY".
ssh "$USER_@$IP" "mkdir -p $SC_EXT/pappus/lib && \
  cp $DEST/rig/board/norns/Engine_Pappus.sc $SC_EXT/pappus/lib/Engine_Pappus.sc && \
  cp $DEST/rig/board/norns/PosSource.sc $SC_EXT/pappus/lib/PosSource.sc && \
  cp $DEST/rig/board/norns/CroneEngine.sc $SC_EXT/CroneEngine.sc && echo '   classes installed'"

echo "== what landed, against what was sent"
# Not "ok" — the md5 of the file that will actually execute. Printing a success
# line is not evidence that a copy happened (CLAUDE.md).
# ⚠️ THE ENGINE'S md5 IS THE ONE FROM THE EXTENSIONS PATH, not from $DEST — see
# the block above. Printing $DEST's copy is printing a file nothing reads.
# ⚠️ `jacksynth.mjs` IS IN THIS LIST SINCE 2026-09-18 AND WAS NOT BEFORE. It
# holds the JACK graph: the chain, the insert's patching, the `jack.graph`
# report and the `jack.rebuild` repair. A deploy that landed
# board.mjs and not this one would answer the new verbs with `ReferenceError` on
# a board nobody can ssh to. An md5 that covers one of two changed files is a
# confirmation that can be true while the deploy is broken.
ssh "$USER_@$IP" "md5sum $DEST/rig/board/board.mjs $DEST/rig/board/jacksynth.mjs $DEST/rig/board/pappus.mjs \
  $DEST/rig/board/norns/run-pappus.scd \
  $SC_EXT/pappus/lib/Engine_Pappus.sc $SC_EXT/pappus/lib/PosSource.sc 2>/dev/null"
md5sum "$SRC/board.mjs" "$SRC/jacksynth.mjs" "$SRC/pappus.mjs" "$SRC/norns/run-pappus.scd" \
  "$SRC/norns/Engine_Pappus.sc" "$SRC/norns/PosSource.sc" 2>/dev/null \
  || md5 -r "$SRC/board.mjs" "$SRC/jacksynth.mjs" "$SRC/pappus.mjs" "$SRC/norns/run-pappus.scd" \
     "$SRC/norns/Engine_Pappus.sc" "$SRC/norns/PosSource.sc"

if [ "$RESTART" = 1 ]; then
  echo "== restarting"
  ssh "$USER_@$IP" 'sudo systemctl restart positron-board && sleep 2 && systemctl is-active positron-board'
  echo "== the first lines it says"
  ssh "$USER_@$IP" 'journalctl -u positron-board -n 12 --no-pager -o cat'
else
  echo "== not restarting (--no-restart); the running board still has the old code"
fi
