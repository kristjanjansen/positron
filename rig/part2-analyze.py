#!/usr/bin/env python3
"""Per-part-index analysis of edge-lag-blocking JSONL runs (part-2-late mystery).

Usage: part2-analyze.py file.jsonl [file2.jsonl ...]
Prints per-part-index n / p50 / p95 of raw_lag (ms, UNcorrected — per-part deltas are
clock-offset-immune), plus burst structure (how often a part arrived in the same
response as its successors) and inter-arrival gaps by part index.
"""
import sys, json, statistics


def q(v, p):
    v = sorted(v)
    return v[min(len(v) - 1, int(p * len(v)))]


for fn in sys.argv[1:]:
    rows = [json.loads(l) for l in open(fn) if l.strip()]
    rows = [r for r in rows if r.get('status') == 200 and r.get('raw_lag') is not None]
    print(f'\n=== {fn}  (n={len(rows)}) ===')
    by = {}
    for r in rows:
        by.setdefault(r['part'], []).append(r['raw_lag'] * 1e3)
    print(f'{"part":>4} {"n":>4} {"p50 ms":>8} {"p95 ms":>8} {"min":>7} {"max":>7}')
    for p in sorted(by):
        v = by[p]
        print(f'{p:>4} {len(v):>4} {q(v,.5):>8.0f} {q(v,.95):>8.0f} {min(v):>7.0f} {max(v):>7.0f}')
    # arrival gaps: t_hdr[i] - t_hdr[i-1] labelled by the LATER part's index
    gaps = {}
    for a, b in zip(rows, rows[1:]):
        gaps.setdefault(b['part'], []).append((b['t_hdr'] - a['t_hdr']) * 1e3)
    print('arrival gap to previous response, by part index:')
    for p in sorted(gaps):
        v = gaps[p]
        print(f'  part {p}: n={len(v)} p50={q(v,.5):.0f} ms  min={min(v):.0f} max={max(v):.0f}')
    # block_ms by part index (how long the edge held the request)
    blk = {}
    for r in rows:
        blk.setdefault(r['part'], []).append(r['block_ms'])
    print('block_ms (edge hold) by part index:')
    for p in sorted(blk):
        v = blk[p]
        print(f'  part {p}: n={len(v)} p50={q(v,.5):.0f} ms  p95={q(v,.95):.0f}')
