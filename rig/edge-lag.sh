#!/bin/zsh
# Measure LL-HLS live-edge lag from EXT-X-PROGRAM-DATE-TIME.
# edge_lag = now - (last PDT + 0.5s * parts_after_that_PDT)
# This is the INGEST->EDGE portion only; player hold-back adds PART-HOLD-BACK on top.
UID_=$(cat /tmp/li_uid.txt)
B=https://customer-mwuu1cmlyif6eluy.cloudflarestream.com
N=${1:-10}

for i in $(seq 1 $N); do
  MASTER=$(curl -s "$B/$UID_/manifest/video.m3u8?protocol=llhls")
  # track ids change every broadcast — never hardcode the prefix
  CHILD=$(echo "$MASTER" | grep -m1 '^stream_.*\.m3u8')
  T0=$(python3 -c 'import time;print(repr(time.time()))')
  BODY=$(curl -s "$B/$UID_/manifest/$CHILD")
  T1=$(python3 -c 'import time;print(repr(time.time()))')
  echo "$BODY" | python3 -c "
import sys,re,datetime
body=sys.stdin.read()
t0,t1=$T0,$T1
pdts=re.findall(r'#EXT-X-PROGRAM-DATE-TIME:(\S+)',body)
if not pdts: print('no PDT'); raise SystemExit
last=datetime.datetime.fromisoformat(pdts[-1].replace('Z','+00:00')).timestamp()
tail=body.split(pdts[-1])[-1].count('#EXT-X-PART:')
hint=1 if 'PRELOAD-HINT' in body else 0
edge=last+tail*0.5
print(f'fetch={1000*(t1-t0):4.0f}ms PDTs={len(pdts):2d} tail_parts={tail} preload={hint}  last_PDT_age={t1-last:5.2f}s  edge_lag={t1-edge:5.2f}s')
"
  sleep 1.5
done
