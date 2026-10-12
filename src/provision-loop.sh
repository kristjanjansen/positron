#!/bin/sh
# One RTMPS live input DEDICATED to /concepts/video/030/'s LL-HLS loopback,
# "positron-hls-loopback", and its stream key stored as LOOP_STREAM_KEY on
# positron-pub. Run 2026-10-12, asked for through the session: *"A live input
# DEDICATED to this loopback (its own id, its own name like
# positron-hls-loopback), so a sweep can delete everything on it without
# touching any other input or recording."*
#
# preferLowLatency and recording automatic, as src/provision-cam.sh: Stream
# serves LL-HLS from an RTMPS input only with both, and recording cannot be
# turned off there. So every take is a recording against the account's 1000
# minute cap, and positron-pub deletes it (per take about 90 s after it ends,
# and a cron every 10 minutes for anything older than 5).
# timeoutSeconds 0: the recording closes the moment the publisher goes, which
# is the earliest its video can be deleted.
# deleteRecordingAfterDays 30, the platform's minimum: the last net under the
# two above, never the plan.
#
# Also stores the Stream API token and the account id the worker deletes with
# (STREAM_TOKEN, ACCOUNT_ID), the same pair positron-sweep holds.
# Prints the input UID, which is public (it is in every HLS play URL) and goes
# into the code. Requires CF_API_TOKEN and CF_ACCOUNT_ID in ../.env.
# ⚠️ wrangler 4.148 (rig/containers-next): the npx one in this checkout cannot
# read positron-pub's `durable_object` container entry.
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
