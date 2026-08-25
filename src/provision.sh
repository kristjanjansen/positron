#!/bin/zsh
# Create (or reuse) a Cloudflare Stream live input with LL-HLS enabled,
# and print everything needed to publish and play.
#
#   ./provision.sh [name]
#
# Requires CF_API_TOKEN + CF_ACCOUNT_ID in ../.env
# Token needs Account -> Stream -> Edit.
set -e
cd "$(dirname "$0")"
set -a; . ../.env; set +a
NAME=${1:-low-latency}
API="https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/stream/live_inputs"

# preferLowLatency is the switch. recording.mode MUST be "automatic" or the
# LL-HLS pipeline is not engaged and you silently get plain HLS.
RESP=$(curl -sS -X POST "$API" \
  -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
  --data "{\"meta\":{\"name\":\"$NAME\"},\"preferLowLatency\":true,\
\"recording\":{\"mode\":\"automatic\",\"timeoutSeconds\":10}}")

python3 - "$RESP" <<'PY'
import json, sys, re
d = json.loads(sys.argv[1])
if not d.get('success'):
    print('ERROR:', d.get('errors')); raise SystemExit(1)
r = d['result']
customer = re.search(r'customer-[a-z0-9]+', r.get('webRTC', {}).get('url', '') or '')
customer = customer.group(0) if customer else '<CODE>'
print(f"""
  live input     {r['uid']}
  preferLowLatency {r.get('preferLowLatency')}   recording {r['recording']['mode']}

  RTMPS url      {r['rtmps']['url']}
  RTMPS key      {r['rtmps']['streamKey']}
  SRT url        {r['srt']['url']}   streamId {r['srt']['streamId']}

  LL-HLS         https://{customer}.cloudflarestream.com/{r['uid']}/manifest/video.m3u8?protocol=llhls
  player         src/index.html?uid={r['uid']}
  state          https://{customer}.cloudflarestream.com/{r['uid']}/lifecycle
""")
open('.last-input', 'w').write(json.dumps(
    {'uid': r['uid'], 'key': r['rtmps']['streamKey'], 'customer': customer}))
PY
