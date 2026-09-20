#!/bin/bash
# rig/board/setup.sh — run this ON the Pi, once, after the first ssh.
#
#   git clone <this repo> ~/positron && cd ~/positron/rig/board && sudo ./setup.sh
#
# What it does, and why each part is here rather than done by hand:
#   - a current node, because the board uses the BUILT-IN WebSocket client (node
#     22+) rather than an npm dependency. Debian Trixie ships node 20, where
#     `WebSocket` is undefined — a failure that reads as "the relay is down".
#   - alsa-utils, for `aconnect` and `arecord`, which ARE the board.
#   - snd-virmidi and snd-aloop, loaded at boot: virtual MIDI ports and a
#     loopback capture device, so the whole thing is testable with nothing
#     plugged in. They cost nothing when real hardware is attached.
#   - a systemd unit with Restart=always, because nobody is in that room.
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
# 🔴 NO DEFAULT ROOM, AND THIS USED TO READ `${ROOM:-studio-1}`. That default
# pointed EVERY board anybody installed at OUR room. The relay has no
# authentication, no routing and no sender identity, so the room name is the
# only isolation this stack has: two boards in one room flap `boardFrom` twice
# a beat and interleave two `aseq` counters into a single playout ring. An
# installer whose default is somebody else's studio is a footgun with a friendly
# face, so this now REFUSES rather than guesses.
if [ -z "${ROOM:-}" ]; then
  echo "setup.sh needs a room: sudo ROOM=<name> ./setup.sh" >&2
  echo "  it used to default to studio-1, which is the studio board's own room." >&2
  exit 2
fi

echo "== packages"
# 🔴 READ FROM `packages.txt`, NOT TYPED HERE. This line used to install
# `alsa-utils curl git` and nothing else, so a board provisioned from this repo
# came up with no jackd, no yoshimi, no SuperCollider, no csound and no ffmpeg:
# **silent**, while `rig/audit.mjs` held the full list of twelve with reasons
# and was a thing you ran by hand afterwards against a board you already had.
# One list, read by the installer that needs it and by the audit that checks it.
#
# ⚠️ `awk` RATHER THAN node OR jq, because node is one of the things being
# installed three lines down and jq is not on a fresh Pi. The file is tab
# separated so that the `why` column can contain anything.
#
# ⚠️ `--no-install-recommends` ON EVERY ONE. csound's recommends pull tcl/tk
# onto a headless board, and the same argument covers the rest.
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
# ⚠️ PRESERVE THE DEPTH. board.mjs imports '../../demo/shell/wire.mjs', so it must
# sit two levels below $DEST or that resolves off the filesystem root —
# ERR_MODULE_NOT_FOUND file:///demo/shell/wire.mjs, which is what a flattened
# install produced. Checking the files exist at the SOURCE was not enough: what
# matters is whether the import resolves from where it will actually run.
BOXDIR="$DEST/rig/board"
install -d "$BOXDIR" "$BOXDIR/fixtures" "$DEST/demo/shell"
install -m 644 "$SRC"/*.mjs "$BOXDIR/"
install -m 644 "$SRC"/fixtures/* "$BOXDIR/fixtures/"
# Shared modules are IMPORTED from demo/shell rather than copied into rig/board —
# one envelope, one Rhodes, one Moog, both ends. They must come along at the
# exact paths board.mjs expects.
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
[ -f /etc/default/positron-board ] || cat > /etc/default/positron-board <<CFG
# Which relay room the board joins. Anything that knows this name can drive it.
ROOM=$ROOM
# The name it calls itself in board.hello.
# ⚠️ NOT UNIQUE. \`hostname\` is \`raspberrypi\` on a fresh Pi OS, so two boards
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
# 🔴 THE JOURNAL DID NOT SURVIVE A REBOOT AND IT TOOK REAL EVIDENCE WITH IT.
# MEASURED 2026-09-20: /var/log/journal was empty, the journal lived in
# /run/log/journal on tmpfs, `journalctl --list-boots` showed exactly one boot,
# and every line from the day the output level collapsed was gone. board.mjs
# says in a comment that the journal is the one record that survives a board
# nobody can reach; on this board it did not.
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
