#!/usr/bin/env python3
"""Summarize a m2m-4k-sfu-*.jsonl arm: g2g percentiles, received sizes,
publisher fps/qlr/encoder timeline, steady-state split (first 20 s dropped)."""
import json
import statistics
import sys


def pct(sorted_vals, p):
    if not sorted_vals:
        return None
    return round(sorted_vals[min(len(sorted_vals) - 1, int(len(sorted_vals) * p / 100))], 1)


def main(path):
    lat, sizes, pstats, inb = [], {}, [], []
    n = decfail = 0
    t0 = None
    for line in open(path):
        r = json.loads(line)
        if r.get("kind") == "sample" and r.get("from") == "P":
            n += 1
            if t0 is None:
                t0 = r["t"]
            wh = (r.get("w"), r.get("h"))
            sizes[wh] = sizes.get(wh, 0) + 1
            if r.get("decOk"):
                lat.append((r["t"], r["latencyMs"]))
            else:
                decfail += 1
        if r.get("kind") == "stats" and r.get("who") == "P" and r.get("fps") is not None:
            pstats.append(r)
        if r.get("kind") == "stats" and r.get("who") == "1":
            for i in r.get("inbound", []):
                if i.get("from") == "P":
                    i["t"] = r["t"]
                    inb.append(i)
    all_l = sorted(v for _, v in lat)
    ss = sorted(v for t, v in lat if t - t0 > 20000)  # steady state
    print(f"samples {n} valid {len(lat)} decfail {decfail}")
    print(f"g2g ALL    p50 {pct(all_l,50)} p95 {pct(all_l,95)} p99 {pct(all_l,99)}")
    print(f"g2g STEADY p50 {pct(ss,50)} p95 {pct(ss,95)} p99 {pct(ss,99)} (n={len(ss)})")
    print("received sizes:", sizes)
    if pstats:
        fpss = [r["fps"] for r in pstats]
        ss_f = [r["fps"] for r in pstats if r["t"] - pstats[0]["t"] > 20000]
        last = pstats[-1]
        print(f"pub fps all min/med/max {min(fpss)}/{statistics.median(fpss)}/{max(fpss)}"
              f"  steady med {statistics.median(ss_f) if ss_f else None}")
        print("last qlr:", last.get("qualityLimitationReason"),
              "durations:", last.get("qualityLimitationDurations"),
              "resChanges:", last.get("qualityLimitationResolutionChanges"))
        print("encoder:", last.get("encoderImplementation"), "| codec:", last.get("codec"),
              "| fmtp:", last.get("fmtp"))
        if last.get("framesEncoded"):
            print("encode ms/frame (incl. hw queue):",
                  round(1000 * last["totalEncodeTime"] / last["framesEncoded"], 1))
        dur = (pstats[-1]["t"] - pstats[0]["t"]) / 1000
        if dur > 0:
            print("avg send Mbps:", round(8 * (pstats[-1]["bytesSent"] - pstats[0]["bytesSent"]) / dur / 1e6, 2),
                  "targetBitrate last:", last.get("targetBitrate"))
    if inb:
        li = inb[-1]
        print("probe inbound last:", {k: li.get(k) for k in
              ["fps", "frameWidth", "frameHeight", "framesDecoded", "framesDropped",
               "freezeCount", "totalFreezesDuration", "packetsLost", "nackCount",
               "pliCount", "decoderImplementation", "codec"]})
        whs = {}
        for i in inb:
            wh = (i.get("frameWidth"), i.get("frameHeight"))
            whs[wh] = whs.get(wh, 0) + 1
        print("inbound stats WxH poll counts:", whs)


if __name__ == "__main__":
    main(sys.argv[1])
