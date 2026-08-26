#!/usr/bin/env python3
"""p3b composite analyzer.

Rows:
  csample       grid burned-pixel -> composite page decode (per source pid)
  vsample       viewer decode: lat1/lat2 (grid -> viewer FULL path), latK (composite -> viewer)
  wall          wall snapshot freshness at the composite
  cpu           per-group %CPU (gcomp = composite Chrome tree, ffmpeg)
  stats         composite drawFps + whip outbound + per-tile inbound
  event         whip lifecycle, publish, pulls
  recording-*   Stream API poll results

Usage: python3 analyze-p3b.py ../../results/m2m-p3b-a.jsonl
"""
import json
import sys
from collections import defaultdict


def pct(xs, p):
    if not xs:
        return float("nan")
    s = sorted(xs)
    return s[min(len(s) - 1, int(p * len(s)))]


def fmt(xs, unit="ms"):
    if not xs:
        return "n=0"
    return ("n=%d p50 %.0f / p95 %.0f / p99 %.0f / max %.0f %s"
            % (len(xs), pct(xs, .5), pct(xs, .95), pct(xs, .99), max(xs), unit))


def main(path):
    rows = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    rows.append(json.loads(line))
                except ValueError:
                    pass
    print("rows:", len(rows), "file:", path)

    # steady window
    t0 = t1 = None
    for r in rows:
        if r.get("kind") == "stage" and r.get("stage") == "steady":
            t0 = r["t"]
        if r.get("kind") == "stage-end" and r.get("stage") == "steady":
            t1 = r["t"]
    print("steady window: %s -> %s" % (t0, t1))

    def in_steady(r):
        return t0 is None or (r.get("t") and t0 <= r["t"] <= (t1 or 9e15))

    # --- csample: grid -> composite ---
    by_pid = defaultdict(list)
    inval = 0
    for r in rows:
        if r.get("kind") != "csample" or not in_steady(r):
            continue
        if r.get("decOk") and r.get("pidOk"):
            by_pid[r["from"]].append(r["latencyMs"])
        else:
            inval += 1
    pooled = [x for v in by_pid.values() for x in v]
    print("\n== grid -> COMPOSITE page (csample, steady) ==")
    for pid in sorted(by_pid):
        print("  %s: %s" % (pid, fmt(by_pid[pid])))
    print("  pooled: %s  (invalid/other %d)" % (fmt(pooled), inval))

    # --- vsample: viewer ---
    lat = {"1": [], "2": [], "K": []}
    nv = 0
    for r in rows:
        if r.get("kind") != "vsample" or not in_steady(r):
            continue
        nv += 1
        for k in ("1", "2", "K"):
            v = r.get("lat" + k)
            if v is not None and r.get("pidOk" + k):
                lat[k].append(v)
    print("\n== VIEWER decodes (vsample, steady; frames=%d) ==" % nv)
    print("  grid '1' -> viewer (FULL glass-to-glass): %s" % fmt(lat["1"]))
    print("  grid '2' -> viewer (FULL glass-to-glass): %s" % fmt(lat["2"]))
    print("  composite clock -> viewer:                %s" % fmt(lat["K"]))
    both = lat["1"] + lat["2"]
    print("  featured pooled (THE composite g2g):      %s" % fmt(both))
    if nv:
        print("  decode rates: 1=%.1f%% 2=%.1f%% K=%.1f%%"
              % (100 * len(lat["1"]) / nv, 100 * len(lat["2"]) / nv, 100 * len(lat["K"]) / nv))

    # --- wall freshness at composite ---
    fresh = [r["freshMs"] for r in rows
             if r.get("kind") == "wall" and in_steady(r) and r.get("freshMs") is not None]
    miss = sum(1 for r in rows if r.get("kind") == "wall" and in_steady(r) and r.get("miss"))
    print("\n== wall freshness at composite ==\n  %s  misses=%d" % (fmt(fresh), miss))

    # --- cpu ---
    print("\n== CPU (%% of one core, steady) ==")
    for g in ("gcomp", "gview", "g0", "g1", "ffmpeg"):
        xs = [r[g] for r in rows if r.get("kind") == "cpu" and in_steady(r) and r.get(g) is not None]
        rss = [r.get(g + "RssMb") for r in rows if r.get("kind") == "cpu" and in_steady(r)
               and r.get(g + "RssMb") is not None]
        if xs:
            print("  %-6s p50 %.0f%% / max %.0f%%%s"
                  % (g, pct(xs, .5), max(xs),
                     ("  rss p50 %d MB" % pct(rss, .5)) if rss else ""))

    # --- composite drawFps + whip ---
    dfps = [r["drawFps"] for r in rows if r.get("kind") == "stats" and in_steady(r)
            and r.get("drawFps") is not None]
    wfps = [r["whipFps"] for r in rows if r.get("kind") == "stats" and in_steady(r)
            and r.get("whipFps") is not None]
    qlr = defaultdict(int)
    for r in rows:
        if r.get("kind") == "stats" and in_steady(r) and r.get("whipQlr"):
            qlr[r["whipQlr"]] += 1
    if dfps:
        print("\n== composite health ==\n  drawFps p50 %.0f min %.0f" % (pct(dfps, .5), min(dfps)))
    if wfps:
        print("  whip encoder fps p50 %.0f min %.0f  qlr=%s" % (pct(wfps, .5), min(wfps), dict(qlr)))

    # --- key events / recording timeline ---
    print("\n== timeline ==")
    for r in rows:
        k = r.get("kind")
        if k in ("run-start", "composite-ready", "publish-start", "viewer-first-decode",
                 "publish-end", "recording-ready", "recording-absent", "viewer-reload",
                 "driver-fatal"):
            d = {x: r[x] for x in r if x not in ("kind", "srv_ts")}
            print("  %-20s %s" % (k, json.dumps(d)[:220]))
        if k == "event" and r.get("name") in ("whip-publishing", "whip-failed", "whip-stop",
                                              "publish-exhausted", "watchdog-stall"):
            print("  event:%-14s %s" % (r["name"], json.dumps(
                {x: r[x] for x in r if x not in ("kind", "name", "srv_ts")})[:160]))

    # recording polls, compact
    polls = [r for r in rows if r.get("kind") == "recording-poll"]
    if polls:
        print("\n== recording polls ==")
        for r in polls:
            vs = ";".join("%s:%s:%ss" % ((v.get("uid") or "")[:8], v.get("state"),
                                         v.get("duration")) for v in (r.get("videos") or []))
            print("  +%6.0fs [%s] %s" % ((r.get("sinceMs") or 0) / 1000, r.get("tag"), vs or "NONE"))


if __name__ == "__main__":
    main(sys.argv[1])
