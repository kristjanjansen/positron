#!/usr/bin/env python3
"""Analyze a scale-ladder rung: results/m2m-scale-N{n}.jsonl [+ server log].

Usage: analyze-scale.py <results.jsonl> [server.log] [warmup_s]

Extends analyze.py's discipline (visible-only, checksum-valid, per-pair warmup)
with the ladder's STOP-gate checks:
  (a) <99 % checksum-valid on a probe   (b) pooled p95 > 400 ms
  (c) any track failed to subscribe/flow (d) total CPU > 900 % (75 % of 12 cores)
  (e) any publisher median fps < 12
Plus: join-storm API behavior (from server.py stderr), publisher-side
qualityLimitation/fps, freeze attribution (both-probes = sender/SFU-side).
"""
import json
import re
import sys
import statistics as st
from collections import defaultdict

PATH = sys.argv[1]
SRVLOG = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2].endswith(".log") else None
WARMUP_S = float(sys.argv[3]) if len(sys.argv) > 3 else 10.0

samples, stats_rows, events, cpu_rows, mesh_rows, storm_rows, final_rows = [], [], [], [], [], [], []
with open(PATH) as f:
    for line in f:
        try:
            o = json.loads(line)
        except ValueError:
            continue
        k = o.get("kind")
        if k == "sample":
            samples.append(o)
        elif k == "stats":
            stats_rows.append(o)
        elif k == "event":
            events.append(o)
        elif k == "cpu":
            cpu_rows.append(o)
        elif k == "mesh":
            mesh_rows.append(o)
        elif k == "storm":
            storm_rows.append(o)
        elif k == "final":
            final_rows.append(o)


def pct(vals, p):
    if not vals:
        return float("nan")
    s = sorted(vals)
    return s[min(len(s) - 1, int(round(p / 100 * (len(s) - 1))))]


gates = []  # (id, fired, text)

print(f"== file: {PATH} (warmup {WARMUP_S:.0f}s per pair) ==")
storm_t = storm_rows[-1]["t"] if storm_rows else None
mesh_t = mesh_rows[-1]["t"] if mesh_rows else None
mesh_ms = mesh_rows[-1].get("meshMs") if mesh_rows else None
n_total = (storm_rows or mesh_rows or [{}])[-1].get("n")
print(f"  N={n_total}  join-storm->full-mesh: {mesh_ms} ms")

# ---- events / failures ------------------------------------------------------
fails = [e for e in events if e.get("name") in ("fatal", "pull-failed", "ontrack-unmapped")]
pull_fail_by = defaultdict(int)
for e in fails:
    if e.get("name") == "pull-failed":
        pull_fail_by[(e.get("who"), e.get("from"))] += 1
    print(f"  !! {e.get('who')} {e.get('name')} {e.get('from','')} {str(e.get('error',''))[:160]}")
gave_up = [k for k, v in pull_fail_by.items() if v >= 5]
gates.append(("c-subscribe", bool(gave_up) or not mesh_rows,
              f"tracks failed/gave up: {gave_up}" if gave_up else
              ("mesh never completed" if not mesh_rows else "all tracks subscribed+flowed")))

# ---- per-publisher x per-probe latency --------------------------------------
pairs = defaultdict(list)
for s in samples:
    pairs[(s.get("from"), s.get("to"))].append(s)

probe_warm = defaultdict(int)
probe_valid = defaultdict(int)
all_lat = []
per_pub_lat = defaultdict(list)
print(f"\n== per-pair (from -> probe) ==")
print(f"  {'pair':>7} {'n_raw':>6} {'valid':>6} {'ok%':>6} {'p50':>7} {'p95':>7} {'max':>7}")
for (frm, to), rows in sorted(pairs.items()):
    t_first = min(r["t"] for r in rows)
    vis = [r for r in rows if r.get("vis") == "visible"]
    warm = [r for r in vis if r["t"] - t_first > WARMUP_S * 1000]
    valid = [r for r in warm if r.get("decOk") and r.get("pidOk") is not False]
    lat = [r["latencyMs"] for r in valid if "latencyMs" in r]
    probe_warm[to] += len(warm)
    probe_valid[to] += len(valid)
    all_lat.extend(lat)
    per_pub_lat[frm].extend(lat)
    okpct = 100.0 * len(valid) / len(warm) if warm else float("nan")
    if lat:
        print(f"  {frm}->{to:>4} {len(rows):>6} {len(valid):>6} {okpct:>5.1f}% "
              f"{pct(lat,50):>7.1f} {pct(lat,95):>7.1f} {max(lat):>7.1f}")
    else:
        print(f"  {frm}->{to:>4} {len(rows):>6} {len(valid):>6} {okpct:>5.1f}%  NO VALID LATENCY")
    why = defaultdict(int)
    for r in warm:
        if not r.get("decOk"):
            why[r.get("decWhy")] += 1
    if why:
        print(f"          decode failures: {dict(why)}")

print(f"\n== per-publisher pooled (both probes) ==")
for frm, lat in sorted(per_pub_lat.items()):
    print(f"  {frm}: n={len(lat)} p50={pct(lat,50):.1f} p95={pct(lat,95):.1f}")

for probe in sorted(probe_warm):
    v = 100.0 * probe_valid[probe] / probe_warm[probe] if probe_warm[probe] else 0
    print(f"\n  probe {probe} overall valid: {probe_valid[probe]}/{probe_warm[probe]} = {v:.2f}%")
    gates.append((f"a-valid-probe{probe}", v < 99.0, f"probe {probe} valid {v:.2f}% (gate <99%)"))

if all_lat:
    p95 = pct(all_lat, 95)
    print(f"\n  POOLED: n={len(all_lat)} p50={pct(all_lat,50):.1f} p95={p95:.1f} p99={pct(all_lat,99):.1f} ms")
    gates.append(("b-p95", p95 > 400.0, f"pooled p95 {p95:.1f} ms (gate >400)"))
else:
    gates.append(("b-p95", True, "no latency samples at all"))

# ---- publisher-side fps + qualityLimitation (post-mesh only) ----------------
print(f"\n== publisher encoders (post-mesh stats) ==")
by_who = defaultdict(list)
for r in stats_rows:
    if mesh_t and r.get("t", 0) < mesh_t:
        continue
    by_who[r.get("who")].append(r)
bad_fps = []
for who, rows in sorted(by_who.items()):
    role = rows[-1].get("role", "?")
    fpss = [r["fps"] for r in rows if r.get("fps") is not None]
    med = st.median(fpss) if fpss else float("nan")
    qlr = sorted(set(r.get("qualityLimitationReason") for r in rows
                     if r.get("qualityLimitationReason") not in (None, "none")))
    qld = rows[-1].get("qualityLimitationDurations") or {}
    rtts = [r["rtt"] * 1000 for r in rows if r.get("rtt") is not None]
    limit = 12 if role == "pub" else 20   # pubs target 15, probes target 30
    if role == "pub" and fpss and med < 12:
        bad_fps.append((who, med))
    print(f"  {who}({role}): fps med={med:.1f} min={min(fpss) if fpss else float('nan'):.1f} "
          f"qlr={qlr or ['none']} cpu_limited_s={qld.get('cpu', 0)} bw_limited_s={qld.get('bandwidth', 0)}"
          + (f" iceRTT p50={pct(rtts,50):.0f}ms" if rtts else ""))
gates.append(("e-pub-fps", bool(bad_fps), f"pubs with median fps<12: {bad_fps or 'none'}"))

# ---- freezes: per (from, probe), attribute sender-side if both probes agree -
print(f"\n== freezes (probe inbound, cumulative at end) ==")
freeze = defaultdict(dict)   # from -> probe -> (count, dur)
for who, rows in by_who.items():
    if not rows or rows[-1].get("role") != "full":
        continue
    last_per_from = {}
    for r in rows:
        for ib in r.get("inbound", []):
            last_per_from[ib.get("from")] = ib
    for frm, ib in last_per_from.items():
        freeze[frm][who] = (ib.get("freezeCount") or 0, ib.get("totalFreezesDuration") or 0)
n_sender, n_receiver = 0, 0
for frm, per_probe in sorted(freeze.items()):
    counts = {p: c for p, (c, d) in per_probe.items()}
    if any(c > 0 for c in counts.values()):
        both = all(c > 0 for c in counts.values()) and len(counts) > 1
        n_sender += 1 if both else 0
        n_receiver += 0 if both else 1
        durs = {p: round(d, 2) for p, (c, d) in per_probe.items()}
        print(f"  {frm}: counts={counts} durations={durs} -> {'SENDER/SFU-side (both probes)' if both else 'receiver-side (one probe)'}")
if not any(any(c > 0 for c, d in pp.values()) for pp in freeze.values()):
    print("  none")
print(f"  summary: {n_sender} publisher(s) with sender/SFU-side freezes, {n_receiver} with single-probe freezes")

# ---- CPU --------------------------------------------------------------------
print(f"\n== CPU (12 cores = 1200 %) ==")
tot_max = 0
for c in cpu_rows:
    cpu = c.get("cpu") or {}
    tot_max = max(tot_max, cpu.get("totalPct") or 0)
    pubs = [v["cpuPct"] for k, v in (cpu.get("perId") or {}).items() if v and k not in ("1", "2")]
    probes = {k: v["cpuPct"] for k, v in (cpu.get("perId") or {}).items() if v and k in ("1", "2")}
    print(f"  total={cpu.get('totalPct')}% ours={cpu.get('oursPct')}% sibling={cpu.get('siblingPct')}% "
          f"oursRSS={cpu.get('oursRssMb')}MB probes={probes} pubs(mean)={st.mean(pubs) if pubs else float('nan'):.1f}%")
gates.append(("d-cpu", tot_max > 900.0, f"max total CPU {tot_max}% (gate >900% = 75% of 12 cores)"))

# ---- join-storm API behavior from server log --------------------------------
if SRVLOG:
    print(f"\n== SFU API calls (from {SRVLOG}) ==")
    cf_re = re.compile(r"^(\d\d:\d\d:\d\d) CF (POST|PUT) /(\S+) -> (\d+) \((\d+) ms\)")
    calls = defaultdict(list)
    bad = []
    with open(SRVLOG) as f:
        for line in f:
            m = cf_re.match(line.strip())
            if not m:
                continue
            hms, method, path, code, ms = m.group(1), m.group(2), m.group(3), int(m.group(4)), int(m.group(5))
            if path.endswith("sessions/new"):
                kind = "sessions/new"
            elif path.endswith("tracks/new"):
                kind = "tracks/new"
            elif path.endswith("renegotiate"):
                kind = "renegotiate"
            else:
                kind = path
            calls[kind].append((code, ms, hms))
            if code >= 400:
                bad.append((hms, method, path, code))
    for kind, rows in sorted(calls.items()):
        lats = [ms for _, ms, _ in rows]
        codes = defaultdict(int)
        for c, _, _ in rows:
            codes[c] += 1
        print(f"  {kind}: n={len(rows)} codes={dict(codes)} p50={pct(lats,50):.0f} p95={pct(lats,95):.0f} max={max(lats)} ms")
    if bad:
        print(f"  NON-2XX ({len(bad)}): {bad[:20]}")
    else:
        print("  zero non-2xx responses")

# ---- verdict ----------------------------------------------------------------
print(f"\n== STOP-GATES ==")
any_fired = False
for gid, fired, txt in gates:
    any_fired = any_fired or fired
    print(f"  [{'FIRED' if fired else ' ok  '}] {gid}: {txt}")
print(f"\n  RUNG VERDICT: {'GATE FIRED - confirm before climbing' if any_fired else 'PASS - climb'}")
