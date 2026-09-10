#!/bin/bash
# rig/box/setup.sh — run this ON the Pi, once, after the first ssh.
#
#   git clone <this repo> ~/positron && cd ~/positron/rig/box && sudo ./setup.sh
#
# What it does, and why each part is here rather than done by hand:
#   - a current node, because the box uses the BUILT-IN WebSocket client (node
#     22+) rather than an npm dependency. Debian Trixie ships node 20, where
#     `WebSocket` is undefined — a failure that reads as "the relay is down".
#   - alsa-utils, for `aconnect` and `arecord`, which ARE the box.
#   - snd-virmidi and snd-aloop, loaded at boot: virtual MIDI ports and a
#     loopback capture device, so the whole thing is testable with nothing
#     plugged in. They cost nothing when real hardware is attached.
#   - a systemd unit with Restart=always, because nobody is in that room.
set -euo pipefail

[ "$(uname -s)" = "Linux" ] || { echo "this runs on the Pi, not on the laptop"; exit 1; }
[ "$(id -u)" = "0" ] || { echo "needs root: sudo ./setup.sh"; exit 1; }

SRC="$(cd "$(dirname "$0")" && pwd)"
DEST=/opt/positron-box
BOXUSER="${SUDO_USER:-positron}"
ROOM="${ROOM:-studio-1}"

echo "== packages"
apt-get update -qq
apt-get install -y -qq alsa-utils curl git

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
cat > /etc/modules-load.d/positron-box.conf <<'MOD'
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
install -d "$DEST" "$DEST/fixtures" "$DEST/demo/shell"
install -m 644 "$SRC"/*.mjs "$DEST/"
install -m 644 "$SRC"/fixtures/* "$DEST/fixtures/"
# Shared modules are IMPORTED from demo/shell rather than copied into rig/box —
# one envelope, one Rhodes, one Moog, both ends. They must come along at the
# exact paths box.mjs expects.
#
# Do not hand-maintain this list. It was wire.mjs alone until 2026-09-10, by
# which time synth.mjs also imported rhodes.mjs and moog.mjs — so the service
# would have installed cleanly and died on its first import, on a board in
# another room. Read the imports out of the source, and REFUSE the install when
# one has no file: the rule build.mjs already applies to the deployed site.
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
chown -R "$BOXUSER":"$BOXUSER" "$DEST"

echo "== config"
[ -f /etc/default/positron-box ] || cat > /etc/default/positron-box <<CFG
# Which relay room the box joins. Anything that knows this name can drive it.
ROOM=$ROOM
# The name it calls itself in box.hello.
BOX_NAME=$(hostname)
# ALSA capture device for audio.start. "default" until an interface is plugged
# in; then something like "hw:1,0" — \`arecord -l\` lists them.
BOX_AUDIO=default
CFG

echo "== service"
install -m 644 "$SRC/positron-box.service" /etc/systemd/system/positron-box.service
sed -i "s/^User=.*/User=$BOXUSER/" /etc/systemd/system/positron-box.service
systemctl daemon-reload
systemctl enable --now positron-box

sleep 2
echo
systemctl --no-pager --lines=12 status positron-box || true
echo
echo "MIDI ports ALSA can see:"
aconnect -l 2>/dev/null | sed 's/^/   /' || echo "   (none yet)"
echo
echo "done. from anywhere:"
echo "   node ask.mjs --room $ROOM ports.get"
echo "logs:  journalctl -u positron-box -f"
