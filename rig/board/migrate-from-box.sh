#!/bin/bash
# rig/board/migrate-from-box.sh — move a board from the `box` names to the
# `board` names, once. 2026-09-20.
#
#   ./migrate-from-box.sh 192.168.1.213
#
# 🔴 WHY THIS IS NOT `push.sh`. That script ships code to a path that exists and
# restarts a unit that is installed. This rename changes the NAME of all three:
# the install path (`/opt/positron-box` -> `/opt/positron-board`), the systemd
# unit (`positron-box.service` -> `positron-board.service`) and the config file
# (`/etc/default/positron-box` -> `/etc/default/positron-board`). Running
# `push.sh` before this would write into a directory nothing executes and then
# restart a unit that does not exist, and both halves would report success.
#
# ⚠️ IT KEEPS THE OLD INSTALL. `/opt/positron-box` and the old unit file are
# left on disk, disabled. Rolling back is `systemctl disable --now
# positron-board && systemctl enable --now positron-box`, and that is worth more
# than the 40 MB it costs.
#
# ⚠️ IT CARRIES THE OLD CONFIG FORWARD RATHER THAN DEFAULTING IT. `ROOM` and
# `PAPPUS_TINY` are read off the existing file: this board is the studio board
# and its room is `studio-1`, which is a fact about THIS machine and not a
# default any installer should have. `setup.sh` now refuses to guess it.
#
# ⚠️ IT IS IDEMPOTENT. Run it twice and the second run mints no new id, because
# an id that changes on every run is not an id.
set -uo pipefail

IP="${1:-}"
USER_=${BOARD_USER:-positron}
[ -n "$IP" ] || { echo "usage: $0 <board-ip>" >&2; exit 2; }

SRC="$(cd "$(dirname "$0")" && pwd)"
OLD=/opt/positron-box
NEW=/opt/positron-board

echo "== who is listening, before anything is taken away"
# A restart takes the audio away from whoever is on the relay. The room's own
# stats are the only thing that can answer this, and the board's own socket is
# always one of them.
curl -s -m 15 "https://ws.positron.studio/room/studio-1/stats" \
  | sed 's/,/,\n/g' | grep -E '"sockets"|"idleMs"' || echo "   (stats unavailable)"
echo "   1 socket is the board itself. More than 1 means somebody is connected."
echo

echo "== 1. the code, to the new path"
( cd "$SRC/../.." && tar cf - \
    rig/board rig/vis \
    $(cd rig/board && grep -ho "from '\.\./\.\./[^']*'" ./*.mjs | sed "s|from '\.\./\.\./||; s|'$||" | sort -u) \
) | ssh "$USER_@$IP" "sudo mkdir -p $NEW && sudo tar xf - -C $NEW && sudo chown -R $USER_ $NEW && echo '   unpacked'"

echo "== 2. the config, carried forward and given an id"
ssh "$USER_@$IP" "
  set -e
  OLDCFG=/etc/default/positron-box
  NEWCFG=/etc/default/positron-board
  # Read the facts about THIS machine off the old file rather than defaulting them.
  ROOM=\$(grep -m1 '^ROOM=' \$OLDCFG 2>/dev/null | cut -d= -f2-)
  TINY=\$(grep -m1 '^PAPPUS_TINY=' \$OLDCFG 2>/dev/null | cut -d= -f2-)
  AUD=\$(grep -m1 '^BOX_AUDIO=' \$OLDCFG 2>/dev/null | cut -d= -f2-)
  [ -n \"\$ROOM\" ] || { echo '   no ROOM in the old config and this script will not guess one'; exit 3; }
  # Minted once. A second run keeps the id the first run gave.
  if [ -f \$NEWCFG ] && grep -q '^BOARD_ID=' \$NEWCFG; then
    ID=\$(grep -m1 '^BOARD_ID=' \$NEWCFG | cut -d= -f2-)
    echo \"   keeping the id this board already has: \$ID\"
  else
    ID=\"\$(hostname)-\$(head -c4 /dev/urandom | od -An -tx1 | tr -d ' \n')\"
    echo \"   minted \$ID\"
  fi
  {
    echo '# Which relay room the board joins. Anything that knows this name can drive it.'
    echo \"ROOM=\$ROOM\"
    echo '# The name it calls itself in board.hello.'
    echo '# NOT UNIQUE: hostname is raspberrypi on a fresh Pi OS. BOARD_ID is the one that is.'
    echo \"BOARD_NAME=\$(hostname)\"
    echo '# The one name that is this board and no other, minted once at install.'
    echo \"BOARD_ID=\$ID\"
    echo '# ALSA capture device for audio.start.'
    echo \"BOARD_AUDIO=\${AUD:-default}\"
    [ -n \"\$TINY\" ] && echo \"PAPPUS_TINY=\$TINY\"
  } | sudo tee \$NEWCFG >/dev/null
  echo '   written:'
  sed 's/^/     /' \$NEWCFG
"

echo "== 3. the journal, so the next fault leaves a record"
# MEASURED 2026-09-20: /var/log/journal was empty, the journal lived on tmpfs,
# `journalctl --list-boots` showed one boot, and every line from the day the
# output level collapsed was gone. board.mjs says in a comment that the journal
# is the one record that survives a board nobody can reach. It did not.
ssh "$USER_@$IP" "
  sudo mkdir -p /etc/systemd/journald.conf.d /var/log/journal
  printf '%s\n' '[Journal]' 'Storage=persistent' 'SystemMaxUse=200M' \
    | sudo tee /etc/systemd/journald.conf.d/positron.conf >/dev/null
  sudo systemd-tmpfiles --create --prefix /var/log/journal >/dev/null 2>&1 || true
  sudo systemctl restart systemd-journald && echo '   persistent, capped at 200M'
"

echo "== 4. the unit, and the switch"
ssh "$USER_@$IP" "
  set -e
  sudo install -m 644 $NEW/rig/board/positron-board.service /etc/systemd/system/positron-board.service
  sudo sed -i 's/^User=.*/User=$USER_/' /etc/systemd/system/positron-board.service
  sudo systemctl daemon-reload
  # Old one down FIRST: two services dialling one room would put two boards in
  # it, which is exactly what BOARD_ID exists to make visible and what nobody
  # should create on purpose.
  sudo systemctl disable --now positron-box 2>/dev/null || true
  echo \"   positron-box: \$(systemctl is-active positron-box 2>/dev/null || echo inactive)\"
  sudo systemctl enable --now positron-board
  sleep 3
  echo \"   positron-board: \$(systemctl is-active positron-board)\"
"

echo "== 5. what it says for itself"
ssh "$USER_@$IP" 'journalctl -u positron-board -n 14 --no-pager -o cat'

echo
echo "== 6. the id, on the wire rather than in a file"
# A config value nothing reads is an inert control. This asks the board over the
# relay and reads the id back out of its own reply, which is the only form of
# this check that crosses the wire.
node "$SRC/ask.mjs" --room studio-1 board.ping 2>&1 | tail -6

echo
echo "rollback, if it is wrong:"
echo "  ssh $USER_@$IP 'sudo systemctl disable --now positron-board && sudo systemctl enable --now positron-box'"
