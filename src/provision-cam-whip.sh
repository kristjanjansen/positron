#!/bin/sh
# One WebRTC live input for the camera's WHIP leg, stored as CAM_WHIP_URL on positron-pub,
# recording off. The owner runs it (the URL carries the key). Prints the public UID. Needs
# CF_API_TOKEN, CF_ACCOUNT_ID.
# why: lessons/src.md#cam-whip
set -e
cd "$(dirname "$0")"
. ../.env
RESP=$(curl -sS -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/stream/live_inputs" \
  -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
  -d '{"meta":{"name":"positron-cam-whip"},"recording":{"mode":"off"}}')
UID_=$(printf '%s' "$RESP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["uid"])')
printf '%s' "$RESP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["webRTC"]["url"], end="")' \
  | (cd ../workers/pub && env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN npx wrangler secret put CAM_WHIP_URL >/dev/null)
echo "CAM_WHIP_UID=$UID_"
echo "CAM_WHIP_URL stored on positron-pub"
