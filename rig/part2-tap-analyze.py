#!/usr/bin/env python3
"""Analyze FLV tap timing: did the encoder emit any media window late?

For video tags: lateness(dts) = (t - t0) - (dts - dts0)/1000, where t0/dts0 come from
a reference tag. Under -re + zerolatency the encoder should emit each frame ~1 frame
after its media time; any periodic stall shows as a sawtooth in lateness and as
arrival gaps >> 33 ms. Buckets lateness and max-arrival-gap by offset-in-GOP part
index (keyframe = GOP start = CF segment start).

Usage: part2-tap-analyze.py tap.jsonl [conn_id]
"""
import sys, json

fn = sys.argv[1]
want_conn = int(sys.argv[2]) if len(sys.argv) > 2 else None
rows = [json.loads(l) for l in open(fn) if l.strip()]
conns = sorted({r['conn'] for r in rows})
if want_conn is None and len(conns) > 1:
    print(f'connections present: {conns} — pass one'); sys.exit(1)
conn = want_conn if want_conn is not None else conns[0]
v = [r for r in rows if r['conn'] == conn and r['type'] == 'v']
print(f'conn {conn}: {len(v)} video tags, dts {v[0]["dts"]}..{v[-1]["dts"]} ms')

# skip encoder warm-up: drop first 10 s
v = [r for r in v if r['dts'] >= 10000]

# reference: median lateness -> 0 (robust to startup offset)
lat = [(r['t'] - v[0]['t']) - (r['dts'] - v[0]['dts']) / 1e3 for r in v]
med = sorted(lat)[len(lat) // 2]
lat = [x - med for x in lat]

q = lambda s, p: sorted(s)[min(len(s) - 1, int(p * len(s)))]
print(f'video tag lateness vs -re schedule (median-centred): '
      f'p5={q(lat,.05)*1e3:.0f} p50={q(lat,.5)*1e3:.0f} p95={q(lat,.95)*1e3:.0f} '
      f'min={min(lat)*1e3:.0f} max={max(lat)*1e3:.0f} ms')

# arrival gaps between consecutive video tags
gaps = [(b['t'] - a['t']) * 1e3 for a, b in zip(v, v[1:])]
print(f'inter-tag arrival gaps: p50={q(gaps,.5):.0f} p95={q(gaps,.95):.0f} '
      f'p99={q(gaps,.99):.0f} max={max(gaps):.0f} ms; '
      f'gaps>100ms: {sum(1 for g in gaps if g>100)}/{len(gaps)}')

# bucket by offset-in-GOP part index
gop_start = None
by_part_lat, by_part_gap = {}, {}
for i, r in enumerate(v):
    if r['key']:
        gop_start = r['dts']
    if gop_start is None:
        continue
    p = int((r['dts'] - gop_start) // 500)
    by_part_lat.setdefault(p, []).append(lat[i])
    if i:
        by_part_gap.setdefault(p, []).append(gaps[i - 1])
print(f'{"gopofs":>6} {"n":>5} {"lat p50":>8} {"lat p95":>8} {"lat max":>8} {"gap p95":>8} {"gap max":>8}')
for p in sorted(by_part_lat):
    L, G = by_part_lat[p], by_part_gap.get(p, [0])
    print(f'{p:>6} {len(L):>5} {q(L,.5)*1e3:>8.0f} {q(L,.95)*1e3:>8.0f} '
          f'{max(L)*1e3:>8.0f} {q(G,.95):>8.0f} {max(G):>8.0f}')
