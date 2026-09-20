#!/bin/bash
# rig/board/provision.sh — find the board on the LAN and set it up, from here.
#
#   ./provision.sh              sweep the subnet for it
#   ./provision.sh 192.168.1.57 go straight to it
#
# Why a sweep rather than `positron-board.local`: mDNS is multicast UDP and does
# not survive every sandbox — a `.local` lookup here returns "Unknown host"
# while plain IPs on the same subnet answer fine. Rather than depend on name
# resolution that may or may not exist, ask every address whether it is the board.
set -uo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
USER_=${BOARD_USER:-positron}

find_box() {
  local base
  base=$(ipconfig getifaddr en0 2>/dev/null | sed 's/\.[0-9]*$//')
  [ -n "$base" ] || { echo "no IPv4 on en0" >&2; return 1; }
  echo "sweeping ${base}.0/24 for a host that answers as the board ..." >&2
  # Warm the ARP cache in parallel, then ask only the hosts that replied.
  for i in $(seq 1 254); do (ping -c 1 -W 300 "${base}.$i" >/dev/null 2>&1 &) ; done
  sleep 3
  for ip in $(arp -an | grep -oE '\(([0-9]{1,3}\.){3}[0-9]{1,3}\)' | tr -d '()' | sort -u); do
    case "$ip" in *.255|*.0) continue;; esac
    # A 2 s budget each: the board answers instantly, everything else times out.
    name=$(ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
              -o ConnectTimeout=2 "$USER_@$ip" 'hostname -s' 2>/dev/null) || continue
    if [ -n "$name" ]; then echo "  found $name at $ip" >&2; echo "$ip"; return 0; fi
  done
  echo "  nothing answered as $USER_ — is it powered and on this subnet?" >&2
  return 1
}

IP=${1:-}
[ -n "$IP" ] || IP=$(find_box) || exit 1

echo "== who is there"
ssh "$USER_@$IP" 'echo "   $(hostname -s) · $(uname -srm) · $(nproc) cores · $(free -m | awk "/Mem:/{print \$2}") MB"'

echo "== copying the board"
# Ship rig/board plus every module it imports, at the paths it expects. tar over
# ssh rather than rsync: rsync is not installed on a fresh Pi OS Lite.
( cd "$SRC/../.." && tar cf - \
    rig/board \
    $(cd rig/board && grep -ho "from '\.\./\.\./[^']*'" ./*.mjs | sed "s|from '\.\./\.\./||; s|'$||" | sort -u) \
) | ssh "$USER_@$IP" 'rm -rf ~/positron && mkdir -p ~/positron && tar xf - -C ~/positron && echo "   unpacked"'

echo "== setup (needs sudo on the board)"
# ⚠️ THE ROOM COMES FROM THE CALLER AND HAS NO DEFAULT. It used to read
# `${ROOM:-studio-1}`, which pointed every board anybody provisioned at the
# studio board's own room. `setup.sh` refuses without one.
[ -n "${ROOM:-}" ] || { echo "provision.sh needs a room: ROOM=<name> ./provision.sh" >&2; exit 2; }
ssh -t "$USER_@$IP" "cd ~/positron/rig/board && sudo ROOM='$ROOM' ./setup.sh"

echo
echo "== checks that need the board, which nothing here could fake"
ssh "$USER_@$IP" 'cd ~/positron/rig/board && node test.mjs 2>&1 | tail -3; echo; node bench.mjs'
echo
echo "== what ALSA can actually see now"
ssh "$USER_@$IP" 'aconnect -l 2>&1 | head -20; echo; arecord -l 2>&1 | head -10'
