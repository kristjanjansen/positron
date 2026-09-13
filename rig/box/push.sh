#!/bin/bash
# rig/box/push.sh — put THIS checkout on the board and restart the service.
#
#   ./push.sh                 find the board, ship, restart, show the log
#   ./push.sh 192.168.1.213   skip the search
#   ./push.sh --no-restart    ship only (a running instrument keeps playing)
#
# `provision.sh` is the first-run path: it installs packages, kernel modules and
# the unit file. This is the loop you use fifty times after that, and it exists
# because doing it by hand got the destination wrong.
#
# ⚠️ THE SERVICE RUNS FROM /opt/positron-box, NOT FROM ~/positron.
# `provision.sh` unpacks into ~/positron and `setup.sh` copies that to /opt.
# A file edited in ~/positron changes nothing, and the copy already on the board
# there is stale — it has no pappus.mjs at all. So this writes to /opt directly
# and prints the md5 of what landed, because "it deployed" and "it says it
# deployed" have been different things here before.
set -uo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
USER_=${BOX_USER:-positron}
DEST=/opt/positron-box
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
# Port 22, not mDNS and not ARP. `positron-box.local` does not resolve from this
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
           "$USER_@$cand" 'test -d /opt/positron-box' 2>/dev/null; then IP=$cand; break; fi
  done
  rm -f /tmp/positron-ssh.$$
  [ -n "$IP" ] || { echo "nothing on this subnet answers as the box" >&2; exit 1; }
  echo "   found it at $IP" >&2
fi

echo "== shipping to $IP:$DEST"
# rig/box plus every module it imports from outside itself, at the paths the
# imports expect. tar over ssh rather than rsync, which a fresh Pi OS Lite does
# not have.
# ⚠️ rig/vis GOES TOO. The renderer is a C program that has to be COMPILED on
# the board, and it lived in /tmp there until 2026-09-11 — one reboot from
# taking every number in plan-visuals §3 with it.
( cd "$SRC/../.." && tar cf - \
    rig/box rig/vis \
    $(cd rig/box && grep -ho "from '\.\./\.\./[^']*'" ./*.mjs | sed "s|from '\.\./\.\./||; s|'$||" | sort -u) \
) | ssh "$USER_@$IP" "sudo tar xf - -C $DEST && sudo chown -R $USER_ $DEST && echo '   unpacked'"

echo "== building the renderer, if its source changed"
# Cheap and idempotent: gcc is fast on two small files, and a binary older than
# its source is the failure this avoids — it would run the PREVIOUS shader and
# report the new one's name.
ssh "$USER_@$IP" 'cd /opt/positron-box/rig/vis 2>/dev/null && {
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
# compiles them from its Extensions directory — /opt/positron-box is not on its
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
ssh "$USER_@$IP" "mkdir -p $SC_EXT/pappus/lib && \
  cp $DEST/rig/box/norns/Engine_Pappus.sc $SC_EXT/pappus/lib/Engine_Pappus.sc && \
  cp $DEST/rig/box/norns/CroneEngine.sc $SC_EXT/CroneEngine.sc && echo '   classes installed'"

echo "== what landed, against what was sent"
# Not "ok" — the md5 of the file that will actually execute. Printing a success
# line is not evidence that a copy happened (CLAUDE.md).
# ⚠️ THE ENGINE'S md5 IS THE ONE FROM THE EXTENSIONS PATH, not from $DEST — see
# the block above. Printing $DEST's copy is printing a file nothing reads.
ssh "$USER_@$IP" "md5sum $DEST/rig/box/box.mjs $DEST/rig/box/pappus.mjs \
  $SC_EXT/pappus/lib/Engine_Pappus.sc 2>/dev/null"
md5sum "$SRC/box.mjs" "$SRC/pappus.mjs" "$SRC/norns/Engine_Pappus.sc" 2>/dev/null \
  || md5 -r "$SRC/box.mjs" "$SRC/pappus.mjs" "$SRC/norns/Engine_Pappus.sc"

if [ "$RESTART" = 1 ]; then
  echo "== restarting"
  ssh "$USER_@$IP" 'sudo systemctl restart positron-box && sleep 2 && systemctl is-active positron-box'
  echo "== the first lines it says"
  ssh "$USER_@$IP" 'journalctl -u positron-box -n 12 --no-pager -o cat'
else
  echo "== not restarting (--no-restart); the running box still has the old code"
fi
