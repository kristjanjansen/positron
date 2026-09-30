#!/bin/sh
# One WebRTC live input for /stage/'s own container, and its WHIP URL stored as
# the STAGE_WHIP_URL secret on positron-pub. Run by the owner, because the WHIP
# URL carries the input's key and an agent may not write secrets.
# Prints the input UID, which is public (it is in every WHEP play URL) and goes
# into the code. Requires CF_API_TOKEN and CF_ACCOUNT_ID in ../.env.
set -e
cd "$(dirname "$0")"
. ../.env
RESP=$(curl -sS -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/stream/live_inputs" \
  -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
  -d '{"meta":{"name":"positron-stage"},"recording":{"mode":"off"}}')
UID_=$(printf '%s' "$RESP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["uid"])')
printf '%s' "$RESP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["webRTC"]["url"], end="")' \
  | (cd ../workers/pub && env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN npx wrangler secret put STAGE_WHIP_URL >/dev/null)
echo "STAGE_UID=$UID_"
echo "STAGE_WHIP_URL stored on positron-pub"
