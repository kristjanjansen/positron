#!/usr/bin/env python3
"""Egress telemetry from P3A media-run kind:"egress" rows (transport-level
byte counters per page, sampled window-start/mid/window-end by the driver).

Per-role wire rates (SFU->client bytesReceived = CF billable egress class),
per-track egress rate at the probes, overhead vs media payload, and the
plan §4 extrapolation to the three event scales.
"""
import json
import sys
from collections import defaultdict

PATH = sys.argv[1]
rows = []
with open(PATH) as f:
    for line in f:
        try:
            o = json.loads(line)
        except ValueError:
            continue
        if o.get("kind") == "egress":
            rows.append(o)

if len(rows) < 2:
    print("need >=2 egress samples, got %d" % len(rows))
    sys.exit(1)

first, last = rows[0], rows[-1]
print("egress samples: %d (%s .. %s), label=%s n=%s" % (
    len(rows), first.get("tag"), last.get("tag"), last.get("label"), last.get("n")))

f_by = {r["id"]: r for r in first["rows"]}
l_by = {r["id"]: r for r in last["rows"]}
ids = [i for i in l_by if i in f_by]

MB = 1e6
tot = defaultdict(float)
per_role = defaultdict(lambda: defaultdict(float))
per_role_n = defaultdict(int)
probe_in_tracks = 0
print("\nper-page deltas over the window:")
print("  %-4s %-6s %7s %7s %8s %8s %8s %8s %6s" % (
    "id", "cls", "dt_s", "wireTx", "wireRx", "inV", "inA", "outV", "nInV"))
for i in ids:
    a, b = f_by[i], l_by[i]
    dt = (b["tPage"] - a["tPage"]) / 1000.0
    if dt <= 0:
        continue
    d = {k: (b.get(k) or 0) - (a.get(k) or 0)
         for k in ("wireSent", "wireRecv", "outV", "outA", "inV", "inA",
                   "outVRetrans", "outVHeader", "inVHeader", "inAHeader", "outAHeader")}
    cls = b.get("cls", "?")
    print("  %-4s %-6s %7.1f %6.1fM %6.1fM %7.1fM %7.1fM %7.1fM %6d" % (
        i, cls, dt, d["wireSent"] / MB, d["wireRecv"] / MB, d["inV"] / MB,
        d["inA"] / MB, d["outV"] / MB, b.get("nInV") or 0))
    for k, v in d.items():
        tot[k] += v
        per_role[cls][k] += v
    per_role[cls]["dt"] += dt
    per_role_n[cls] += 1
    if cls == "probe":
        probe_in_tracks += (b.get("nInV") or 0)
    tot["dt"] += dt

dt_avg = tot["dt"] / max(1, len(ids))
print("\n== window ~%.0f s, %d pages ==" % (dt_avg, len(ids)))

def mbps(x, dt):
    return x * 8 / dt / 1e6

def gbh(x, dt):
    return x / dt * 3600 / 1e9

print("fleet wire RX (SFU->clients, = billable egress class): %.1f MB  -> %.2f Mbps  -> %.2f GB/h" % (
    tot["wireRecv"] / MB, mbps(tot["wireRecv"], dt_avg), gbh(tot["wireRecv"], dt_avg)))
print("fleet wire TX (clients->SFU, ingress, free):           %.1f MB  -> %.2f Mbps" % (
    tot["wireSent"] / MB, mbps(tot["wireSent"], dt_avg)))
print("RTP payload split of RX: video %.1f MB + audio %.1f MB (+headers %.1f MB) = %.1f MB; wire/rtp-total ratio %.3f" % (
    tot["inV"] / MB, tot["inA"] / MB, (tot["inVHeader"] + tot["inAHeader"]) / MB,
    (tot["inV"] + tot["inA"] + tot["inVHeader"] + tot["inAHeader"]) / MB,
    tot["wireRecv"] / max(1, tot["inV"] + tot["inA"] + tot["inVHeader"] + tot["inAHeader"])))

pr = per_role.get("probe", {})
if pr and probe_in_tracks:
    n_probe = per_role_n["probe"]
    dtp = pr["dt"] / n_probe
    ntr = probe_in_tracks / n_probe          # A/V *video* tracks per probe
    wire_per_probe = pr["wireRecv"] / n_probe
    print("\n== per-pulled-participant (probe pulls %d A+V pairs) ==" % ntr)
    per_part = wire_per_probe / ntr
    print("wire RX per probe: %.1f MB -> %.2f Mbps; per pulled participant (V+A): %.3f Mbps -> %.4f GB/h" % (
        wire_per_probe / MB, mbps(wire_per_probe, dtp), mbps(per_part, dtp), gbh(per_part, dtp)))
    v_per = pr["inV"] / n_probe / ntr
    a_per = pr["inA"] / n_probe / ntr
    print("  payload per participant: video %.3f Mbps, audio %.1f kbps" % (
        mbps(v_per, dtp), mbps(a_per, dtp) * 1000))
    # transferable overhead: wire bytes per RTP payload byte
    overhead = wire_per_probe / max(1, (pr["inV"] + pr["inA"]) / n_probe)
    print("  wire/payload overhead factor: %.3f" % overhead)
    print("\n== §4 extrapolation (overhead-adjusted; model assumes 1 Mbps f / 0.25 q / 32 kbps audio media) ==")
    for name, mbps_model, gb2h_model, usd in [
            ("workshop 10 all-see-all", 93, 84, 4.20),
            ("intimate 40 (simulcast 12-tile)", 190, 171, 8.60),
            ("big show 225 (9q+1f)", 731, 658, 32.90)]:
        adj = mbps_model * overhead
        gb = adj * 0.45 / 1000 * 2 * 1000  # Mbps * 0.45 GB/h per Mbps * 2h
        print("  %-34s model %4d Mbps / %4d GB per 2h ($%.2f) -> measured-overhead %4.0f Mbps / %4.0f GB ($%.2f)" % (
            name, mbps_model, gb2h_model, usd, adj, gb, gb * 0.05))
