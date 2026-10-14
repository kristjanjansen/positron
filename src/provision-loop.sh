#!/bin/sh
# A dedicated RTMPS input for the LL-HLS loopback; stores LOOP_STREAM_KEY, STREAM_TOKEN, ACCOUNT_ID
# on positron-pub, which deletes every take. timeoutSeconds 0 closes a recording at once; the
# 30-day deletion is a net. Needs wrangler 4.148 (rig/containers-next).
# why: lessons/src.md#loop
set -e
cd "$(dirname "$0")"
. ../.env
W=../rig/containers-next/node_modules/.bin/wrangler
RESP=$(curl -sS -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/stream/live_inputs" \
  -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
  -d '{"meta":{"name":"positron-hls-loopback"},"preferLowLatency":true,"deleteRecordingAfterDays":30,"recording":{"mode":"automatic","timeoutSeconds":0}}')
UID_=$(printf '%s' "$RESP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["uid"])')
put() { (cd ../workers/pub && env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN "../$W" secret put "$1" >/dev/null); }
printf '%s' "$RESP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["rtmps"]["streamKey"], end="")' | put LOOP_STREAM_KEY
printf '%s' "$CF_API_TOKEN" | put STREAM_TOKEN
printf '%s' "$CF_ACCOUNT_ID" | put ACCOUNT_ID
echo "LOOP_UID=$UID_"
echo "LOOP_STREAM_KEY, STREAM_TOKEN and ACCOUNT_ID stored on positron-pub"
