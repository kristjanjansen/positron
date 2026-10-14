#!/bin/bash
# Run ON the Pi once: sudo ./setup.sh. Installs node 22+ (built-in WebSocket), the packages,
# snd-virmidi and snd-aloop at boot, and a systemd unit with Restart=always.
# why: lessons/rig-board-io.md#setup-header
set -euo pipefail

[ "$(uname -s)" = "Linux" ] || { echo "this runs on the Pi, not on the laptop"; exit 1; }
[ "$(id -u)" = "0" ] || { echo "needs root: sudo ./setup.sh"; exit 1; }

SRC="$(cd "$(dirname "$0")" && pwd)"
DEST=/opt/positron-board
# Minted here rather than in the config heredoc, so the value is stable across a
# re-run: the heredoc is skipped when the file already exists, and an id that
# changed on every setup would be no id at all.
BOARD_ID="${BOARD_ID:-$(hostname)-$(head -c4 /dev/urandom | od -An -tx1 | tr -d ' \n')}"
BOXUSER="${SUDO_USER:-positron}"
# No default room: the room name is the relay's only isolation, so this refuses rather than
# guesses.
# why: lessons/rig-board-io.md#setup-room
if [ -z "${ROOM:-}" ]; then
  echo "setup.sh needs a room: sudo ROOM=<name> ./setup.sh" >&2
  echo "  it used to default to studio-1, which is the studio board's own room." >&2
  exit 2
fi

echo "== packages"
# Packages come from packages.txt (shared with rig/audit.mjs). awk, as node and jq are not there
# yet.
# --no-install-recommends keeps csound's tcl/tk off a headless board.
# why: lessons/rig-board-io.md#setup-packages
PKGS=$(awk -F'\t' '$0 !~ /^#/ && NF >= 3 && $3 == "apt" { printf "%s ", $1 }' "$SRC/packages.txt")
[ -n "$PKGS" ] || { echo "packages.txt read as empty, refusing to provision a silent board" >&2; exit 4; }
echo "   $PKGS"
apt-get update -qq
apt-get install -y -qq --no-install-recommends $PKGS

echo "== node"
NEED=22
HAVE=$(node -v 2>/dev/null | sed 's/^v//;s/\..*//' || echo 0)
if [ "${HAVE:-0}" -lt "$NEED" ]; then
  echo "   node ${HAVE:-none} is below $NEED — installing 24.x from NodeSource"
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y -qq nodejs
fi
node -e 'if (typeof WebSocket !== "function") { console.error("node has no WebSocket global — too old"); process.exit(1) }'
echo "   node $(node -v), WebSocket built in"

echo "== kernel modules (virtual MIDI + loopback audio)"
cat > /etc/modules-load.d/positron-board.conf <<'MOD'
# Virtual MIDI ports: aconnect sees them as ordinary ports, so the patchbay is
# testable with no instrument attached.
snd-virmidi
# Loopback capture: this is BlackHole, for Linux. Gives arecord something real
# to read when no audio interface is plugged in.
snd-aloop
MOD
modprobe snd-virmidi 2>/dev/null || echo "   (snd-virmidi will load at next boot)"
modprobe snd-aloop   2>/dev/null || echo "   (snd-aloop will load at next boot)"

echo "== audio group"
usermod -aG audio "$BOXUSER" || true

echo "== install to $DEST"
# Keep the depth: board.mjs imports from two levels up, so it must sit two levels below $DEST.
# why: lessons/rig-board-io.md#setup-depth
BOXDIR="$DEST/rig/board"
install -d "$BOXDIR" "$BOXDIR/fixtures" "$DEST/demo/shell"
install -m 644 "$SRC"/*.mjs "$BOXDIR/"
install -m 644 "$SRC"/fixtures/* "$BOXDIR/fixtures/"
# Shared modules are imported from demo/shell; the list is read from the source, and a missing
# file refuses the install.
# why: lessons/rig-board-io.md#setup-imports
MISSING=0
for rel in $(grep -ho "from '\.\./\.\./[^']*'" "$SRC"/*.mjs | sed "s|from '\.\./\.\./||; s|'$||" | sort -u); do
  if [ -f "$SRC/../../$rel" ]; then
    install -d "$DEST/$(dirname "$rel")"
    install -m 644 "$SRC/../../$rel" "$DEST/$rel"
    echo "   + $rel"
  else
    echo "   MISSING: $rel"; MISSING=1
  fi
done
[ "$MISSING" = 0 ] || { echo "refusing to install with an unresolved import"; exit 1; }
install -m 644 "$SRC/package.json" "$BOXDIR/package.json"
chown -R "$BOXUSER":"$BOXUSER" "$DEST"
# The board's ONE npm dependency, node-datachannel, for the direct path to a
# page (rtc.mjs). A prebuilt arm64 binary, no compiler. If it fails the board
# still runs, relay only, and says so at start.
sudo -u "$BOXUSER" sh -c "cd '$BOXDIR' && npm install --omit=dev --no-audit --no-fund" || echo "   node-datachannel did not install; the board will use the relay only"

echo "== config"
[ -f /etc/default/positron-board ] || cat > /etc/default/positron-board <<CFG
# Which relay room the board joins. Anything that knows this name can drive it.
ROOM=$ROOM
# The name it calls itself in board.hello.
# ⚠️ NOT UNIQUE. \`hostname\` is the same stock word on every fresh Pi OS, so two boards
# introduce themselves with the same word. BOARD_ID below is the one that is not.
BOARD_NAME=$(hostname)
# 🔴 THE ONE NAME THAT IS THIS BOARD AND NO OTHER, minted once at install and
# never regenerated. A hostname collides, a socket id changes every reconnect,
# and the room is a place rather than a thing. This is what a second board in
# one room is told apart by.
BOARD_ID=$BOARD_ID
# ALSA capture device for audio.start. "default" until an interface is plugged
# in; then something like "hw:1,0". \`arecord -l\` lists them.
BOARD_AUDIO=default
CFG

echo "== journal"
# Persistent journal: on tmpfs it kept one boot and lost the evidence of a failure.
# why: lessons/rig-board-io.md#setup-journal
mkdir -p /etc/systemd/journald.conf.d
cat > /etc/systemd/journald.conf.d/positron.conf <<JRN
[Journal]
Storage=persistent
SystemMaxUse=200M
JRN
mkdir -p /var/log/journal
systemd-tmpfiles --create --prefix /var/log/journal >/dev/null 2>&1 || true
systemctl restart systemd-journald
echo "   persistent, capped at 200M"

echo "== service"
install -m 644 "$SRC/positron-board.service" /etc/systemd/system/positron-board.service
sed -i "s/^User=.*/User=$BOXUSER/" /etc/systemd/system/positron-board.service
# Prove every import RESOLVES from the installed location, not merely that the
# files were copied. `node --input-type=module -e "import(...)"` is the only
# check that answers the question the service will ask at 3am.
echo "== checking the install actually loads"
if sudo -u "$BOXUSER" node --input-type=module -e "
  import('file://$BOXDIR/synth.mjs').then(()=>console.log('   synth.mjs and its imports resolve'))
    .catch(e=>{console.error('   FAILED:', e.message.split('\n')[0]); process.exit(1)})" ; then
  :
else
  echo "refusing to enable a service that cannot load"; exit 1
fi

systemctl daemon-reload
systemctl enable --now positron-board

sleep 2
echo
systemctl --no-pager --lines=12 status positron-board || true
echo
echo "MIDI ports ALSA can see:"
aconnect -l 2>/dev/null | sed 's/^/   /' || echo "   (none yet)"
echo
echo "done. from anywhere:"
echo "   node ask.mjs --room $ROOM ports.get"
echo "logs:  journalctl -u positron-board -f"
