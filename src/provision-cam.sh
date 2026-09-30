#!/bin/sh
# One RTMPS live input for /cam/'s own container, and its stream key stored as
# the CAM_STREAM_KEY secret on positron-pub. Run 2026-09-30 on the owner's
# explicit instruction; created input 157863305ec9583187dfbb1c66c031ea.
# preferLowLatency and recording automatic, as src/provision.sh makes the
# /llhls/ input: Stream serves LL-HLS from an RTMPS input only with both, and
# recording cannot be turned off there, so every camera session is a recording
# against the account's 1000 minute cap.
# Prints the input UID, which is public (it is in every HLS play URL) and goes
# into the code. Requires CF_API_TOKEN and CF_ACCOUNT_ID in ../.env.
set -e
cd "$(dirname "$0")"
. ../.env
RESP=$(curl -sS -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/stream/live_inputs" \
  -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
  -d '{"meta":{"name":"positron-cam"},"preferLowLatency":true,"recording":{"mode":"automatic","timeoutSeconds":10}}')
UID_=$(printf '%s' "$RESP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["uid"])')
printf '%s' "$RESP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["rtmps"]["streamKey"], end="")' \
  | (cd ../workers/pub && env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN npx wrangler secret put CAM_STREAM_KEY >/dev/null)
echo "CAM_UID=$UID_"
echo "CAM_STREAM_KEY stored on positron-pub"
