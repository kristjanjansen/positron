#!/bin/bash
# A MoQ relay on the LAN, so the sound stops going to Cloudflare and back.
#
# WHY: measured, the trip to a Cloudflare edge and back is 34.19 ms. On a LAN
# that is the whole cost of the MoQ return path -- transit landed at 37-40 ms
# against a WebRTC cushion of 38-60. A relay in the same room drops transit to
# ~1 ms while KEEPING the thing that makes MoQ worth using: the playout floor is
# ours, so latency is a number we choose rather than one NetEQ imposes.
#
# THE CERTIFICATE IS THE FIDDLY PART, and it is already paid for once
# (rig/moq/RUNBOOK.md §12): a browser will accept a self-signed cert for
# WebTransport via serverCertificateHashes, but Chrome requires
#   * ECDSA P-256, and
#   * validity <= 14 DAYS.
# The repo's old auto.crt is ECDSA and TEN YEARS, which is why it failed. This
# mints a 10-day one and prints the SHA-256 of the DER, which is what the page
# pins.
#
#   ./lan-relay.sh cert     mint a 10-day cert + print the fingerprint
#   ./lan-relay.sh run      run the relay on :4443
#   ./lan-relay.sh print    print the fingerprint of the current cert
set -euo pipefail

DIR="${MOQ_DIR:-$HOME/moq-lan}"
BIN="${MOQ_BIN:-$HOME/moq-rs-draft14/target/release/moq-relay-ietf}"
IP="${MOQ_IP:-$(ipconfig getifaddr en0 2>/dev/null || echo 127.0.0.1)}"
PORT="${MOQ_PORT:-4443}"
mkdir -p "$DIR"

fingerprint() { openssl x509 -in "$DIR/lan.crt" -outform der | openssl dgst -sha256 -hex | sed 's/.*= //'; }

case "${1:-run}" in
  cert)
    # -days 10 is deliberate and load-bearing: 15 would be rejected by Chrome
    # with an error that does not mention validity.
    openssl req -x509 -nodes -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 \
      -keyout "$DIR/lan.key" -out "$DIR/lan.crt" -days 10 \
      -subj "/CN=positron-lan" \
      -addext "subjectAltName=IP:$IP,IP:127.0.0.1,DNS:localhost" \
      -addext "keyUsage=digitalSignature" \
      -addext "extendedKeyUsage=serverAuth" 2>/dev/null
    echo "cert   $DIR/lan.crt  (10 days, ECDSA P-256, SAN IP:$IP)"
    echo "expires $(openssl x509 -in "$DIR/lan.crt" -noout -enddate | sed 's/notAfter=//')"
    echo "sha256 $(fingerprint)"
    ;;
  print) echo "$(fingerprint)" ;;
  run)
    [ -f "$DIR/lan.crt" ] || { echo "no cert yet — run: $0 cert"; exit 1; }
    [ -x "$BIN" ] || { echo "no relay binary at $BIN"; exit 1; }
    echo "relay  https://$IP:$PORT"
    echo "sha256 $(fingerprint)"
    exec "$BIN" --bind "[::]:$PORT" --tls-cert "$DIR/lan.crt" --tls-key "$DIR/lan.key" --dev
    ;;
  *) echo "usage: $0 cert|run|print"; exit 1 ;;
esac
