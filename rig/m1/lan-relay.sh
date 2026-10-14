#!/bin/bash
# A MoQ relay on the LAN: transit about 1 ms against 34 ms to a Cloudflare edge and back.
# Chrome pins a self-signed WebTransport cert only if ECDSA P-256 and valid <= 14 days.
# ./lan-relay.sh cert | run | print
# why: lessons/rig-m1.md#lan-relay-header
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
