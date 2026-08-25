#!/usr/bin/env python3
"""LL-HLS TRUE edge lag via blocking playlist reload (_HLS_msn/_HLS_part).

The polling method (edge-lag.sh) is a lower bound: it observes a part some unknown
time after the playlist advertising it was published. Here the edge HOLDS the
response until the requested part exists, so response arrival == the moment the
part became available at the edge.

    edge_lag_raw = t_arrival - (PDT[msn] + (part+1) * PART_TARGET)

where PDT[msn] is the segment's EXT-X-PROGRAM-DATE-TIME (stamped by Cloudflare at
ingest of the segment's first frame) and (part+1)*PART_TARGET is the media offset
of the END of the part — the wall-clock the encoder had burned through when the
part's last frame was captured (encoder runs -re, real time). Same convention as
edge-lag.sh (edge = last_PDT + tail_parts*0.5), so the two are comparable.

Raw lags are stored uncorrected; the local clock offset (sntp, sampled before and
after the run) is subtracted in analysis.

Usage: edge-lag-blocking.py [N_parts] [out.jsonl]
"""
import sys, time, re, json, http.client, datetime, os

UID = os.environ.get('EDGE_LAG_UID') or open('/tmp/li_uid.txt').read().strip()
HOST = 'customer-mwuu1cmlyif6eluy.cloudflarestream.com'
N = int(sys.argv[1]) if len(sys.argv) > 1 else 50
OUT = sys.argv[2] if len(sys.argv) > 2 else None
outf = open(OUT, 'a') if OUT else None

PDT_RE = re.compile(r'#EXT-X-PROGRAM-DATE-TIME:(\S+)')


def parse(body):
    """Return dict: msn0, part_target, targetdur, pdt {msn: epoch}, parts {msn: count},
    last_msn (index of newest, possibly incomplete segment), hint."""
    msn0 = part_target = targetdur = None
    pdt, parts = {}, {}
    hint = hint_next = None
    cur = None
    for line in body.splitlines():
        if line.startswith('#EXT-X-MEDIA-SEQUENCE:'):
            msn0 = int(line.split(':', 1)[1]); cur = msn0
        elif line.startswith('#EXT-X-PART-INF:'):
            m = re.search(r'PART-TARGET=([\d.]+)', line)
            part_target = float(m.group(1))
        elif line.startswith('#EXT-X-TARGETDURATION:'):
            targetdur = float(line.split(':', 1)[1])
        elif line.startswith('#EXT-X-PROGRAM-DATE-TIME:'):
            iso = line.split(':', 1)[1]
            pdt[cur] = datetime.datetime.fromisoformat(iso.replace('Z', '+00:00')).timestamp()
        elif line.startswith('#EXT-X-PART:'):
            parts[cur] = parts.get(cur, 0) + 1
        elif line.startswith('#EXT-X-PRELOAD-HINT:'):
            hint = line
            m = re.search(r'seg_(\d+)_part_(\d+)', line)
            if m:
                hint_next = (int(m.group(1)), int(m.group(2)))
        elif line and not line.startswith('#'):
            cur += 1  # segment URI closes segment `cur`
    return dict(msn0=msn0, part_target=part_target, targetdur=targetdur,
                pdt=pdt, parts=parts, last_msn=cur, hint=hint, hint_next=hint_next)


def connect():
    return http.client.HTTPSConnection(HOST, timeout=15)


def get(conn, path):
    """GET with one silent reconnect on a dropped keep-alive. Returns
    (conn, status, t0, t_hdr, t_body, body)."""
    for attempt in (0, 1):
        try:
            t0 = time.time()
            conn.request('GET', path, headers={'User-Agent': 'edge-lag-rig'})
            r = conn.getresponse()
            t_hdr = time.time()
            body = r.read().decode('utf-8', 'replace')
            t_body = time.time()
            return conn, r.status, t0, t_hdr, t_body, body
        except (http.client.HTTPException, ConnectionError, OSError):
            if attempt:
                raise
            try:
                conn.close()
            except OSError:
                pass
            conn = connect()


conn = connect()

# --- bootstrap: master -> child -> current state ------------------------------
conn, st, *_ , master = get(conn, f'/{UID}/manifest/video.m3u8?protocol=llhls')
if st != 200:
    print(f'master playlist HTTP {st} — is the encoder up?'); sys.exit(1)
child = next((l for l in master.splitlines() if l and not l.startswith('#') and '.m3u8' in l), None)
if not child:
    print('no child playlist in master'); sys.exit(1)
child_path = f'/{UID}/manifest/{child}'
sep = '&' if '?' in child_path else '?'

conn, st, *_ , body = get(conn, child_path)
s = parse(body)
if s['part_target'] is None:
    print('child playlist has no PART-INF — not an LL playlist?'); sys.exit(1)
PT = s['part_target']
per_seg = round((s['targetdur'] or 2.0) / PT)
print(f'child={child}')
print(f'PART-TARGET={PT} targetdur={s["targetdur"]} parts/seg={per_seg} '
      f'msn0={s["msn0"]} last_msn={s["last_msn"]} tail_parts={s["parts"].get(s["last_msn"], 0)}')
print(f'hint: {s["hint"]}')

# PRELOAD-HINT is the authoritative "next unpublished part" — use it when present
# (segment part-count varies: TARGETDURATION=3 but real segments are 4x0.5s parts).
if s['hint_next']:
    msn, part = s['hint_next']
else:
    msn, part = s['last_msn'], s['parts'].get(s['last_msn'], 0)
    if part >= per_seg:
        msn, part = msn + 1, 0

# --- blocking loop ------------------------------------------------------------
rows = []
for i in range(N):
    path = f'{child_path}{sep}_HLS_msn={msn}&_HLS_part={part}'
    conn, st, t0, t_hdr, t_body, body = get(conn, path)
    s = parse(body)
    have = s['parts'].get(msn, 0)
    contains = (msn in s['pdt'] or msn <= s['last_msn']) and (have > part or s['last_msn'] > msn)
    pdt_msn = s['pdt'].get(msn)
    raw_lag = (t_hdr - (pdt_msn + (part + 1) * PT)) if pdt_msn is not None else None
    row = dict(i=i, msn=msn, part=part, status=st, t0=t0, t_hdr=t_hdr,
               body_ms=round((t_body - t_hdr) * 1e3, 1),
               block_ms=round((t_hdr - t0) * 1e3, 1),
               pdt_msn=pdt_msn, raw_lag=raw_lag, contains=contains,
               tail_msn=s['last_msn'], tail_parts=s['parts'].get(s['last_msn'], 0))
    rows.append(row)
    if outf:
        outf.write(json.dumps(row) + '\n'); outf.flush()
    lag_s = f'{raw_lag:6.3f}s' if raw_lag is not None else '  n/a  '
    print(f'[{i:3d}] msn={msn} part={part} http={st} block={row["block_ms"]:7.1f}ms '
          f'raw_lag={lag_s} contains={contains}')
    # next target: trust the response's PRELOAD-HINT (authoritative next part)
    naive = (msn, part + 1)
    if s['hint_next']:
        if s['hint_next'] != naive:
            print(f'      hint-advance: naive {naive} -> hint {s["hint_next"]}')
        msn, part = s['hint_next']
    else:
        part += 1
        if part >= per_seg:
            msn, part = msn + 1, 0
        tail = (s['last_msn'], s['parts'].get(s['last_msn'], 0))
        if (msn, part) < tail or msn > tail[0] + 1:
            print(f'      resync: wanted ({msn},{part}), tail at {tail}')
            msn, part = tail
            if part >= per_seg:
                msn, part = msn + 1, 0

# --- summary (RAW, uncorrected) ----------------------------------------------
lags = sorted(r['raw_lag'] for r in rows if r['raw_lag'] is not None and r['status'] == 200)
blocks = sorted(r['block_ms'] for r in rows if r['status'] == 200)
q = lambda v, p: v[min(len(v) - 1, int(p * len(v)))]
if lags:
    print(f'\nRAW (clock-uncorrected) edge lag over n={len(lags)} parts:')
    print(f'  p50={q(lags,.5)*1e3:6.1f} ms  p95={q(lags,.95)*1e3:6.1f} ms  '
          f'min={lags[0]*1e3:6.1f}  max={lags[-1]*1e3:6.1f}')
    print(f'block_ms: p50={q(blocks,.5):6.1f}  p95={q(blocks,.95):6.1f}  '
          f'min={blocks[0]:6.1f}  max={blocks[-1]:6.1f}')
    print(f'non-200: {sum(1 for r in rows if r["status"] != 200)}  '
          f'missing-part: {sum(1 for r in rows if not r["contains"])}')
