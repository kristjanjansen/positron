#!/bin/sh
# One WebRTC live input for /stage/, its WHIP URL stored as STAGE_WHIP_URL on positron-pub. The
# owner runs it: the WHIP URL carries the key. Prints the public input UID. Needs CF_API_TOKEN,
# CF_ACCOUNT_ID.
# why: lessons/src.md#stage
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
