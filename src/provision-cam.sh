#!/bin/sh
# Retired: its input and CAM_STREAM_KEY are deleted and /cam answers 410. Kept as a record; runs
# only
# with PROVISION_RETIRED=1, so nobody makes a recording input by accident.
# why: lessons/src.md#cam-retired
[ "$PROVISION_RETIRED" = 1 ] || { echo "src/provision-cam.sh is retired (2026-10-13): see its header" >&2; exit 1; }
# One RTMPS input for the camera, key stored as CAM_STREAM_KEY. preferLowLatency and recording
# automatic (LL-HLS needs both), so every session records against the 1000-minute cap.
# why: lessons/src.md#cam
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
