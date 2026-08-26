#!/usr/bin/env python3
"""Analyze churn/endurance runs: analyze-churn.py <mode> <results.jsonl>

Modes: happy | soak | rotate | storm | pubkill | retry
Shared discipline from analyze.py: visible-only, checksum-valid, pidOk.
"""
import json
import sys
import statistics as st
from collections import defaultdict

MODE = sys.argv[1]
PATH = sys.argv[2]

rows = []
with open(PATH) as f:
    for line in f:
        try:
            rows.append(json.loads(line))
        except ValueError:
            pass

by_kind = defaultdict(list)
for r in rows:
    by_kind[r.get("kind")].append(r)
samples = by_kind["sample"]
events = by_kind["event"]
stats_rows = by_kind["stats"]
cpu_rows = by_kind["cpu"]


def ev(name):
    return [e for e in events if e.get("name") == name]


def pct(vals, p):
    if not vals:
        return float("nan")
    s = sorted(vals)
    return s[min(len(s) - 1, int(round(p / 100 * (len(s) - 1))))]


def slope(xs, ys):
    """least-squares slope (unit of y per unit of x)"""
    n = len(xs)
    if n < 2:
        return float("nan")
    mx, my = st.mean(xs), st.mean(ys)
    den = sum((x - mx) ** 2 for x in xs)
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / den if den else float("nan")


def valid_samples():
    return [s for s in samples if s.get("vis") == "visible" and s.get("decOk")
            and s.get("pidOk") is not False and "latencyMs" in s]


mesh_t = by_kind["mesh"][-1]["t"] if by_kind["mesh"] else (samples[0]["t"] if samples else 0)
print(f"== {MODE}: {PATH} ==")
if by_kind["mesh"]:
    print(f"  mesh: {by_kind['mesh'][-1].get('meshMs')} ms")

# ---- publish/retry accounting (all modes) -----------------------------------
att = defaultdict(int)
for e in ev("publish-attempt"):
    att[e["who"]] = max(att[e["who"]], e.get("attempt", 1))
retries = ev("publish-retry")
print(f"\n== retry logic ==")
print(f"  publish-attempt max per participant: {dict(sorted(att.items()))}")
print(f"  publish-retry events: {len(retries)}")
for e in retries:
    print(f"    {e['who']} attempt {e.get('attempt')} reason={e.get('reason')} willRetry={e.get('willRetry')}")
for e in ev("publish-exhausted"):
    print(f"  EXHAUSTED: {e['who']} after {e.get('attempts')} reason={e.get('reason')}")
for e in ev("publish-ok"):
    if e.get("attempt", 1) > 1:
        print(f"  recovered: {e['who']} ok on attempt {e['attempt']} connectMs={e.get('connectMs')}")

if MODE == "retry":
    for r in by_kind["retry-check"]:
        print(f"  retry-check {r['who']}: expect={r['expect']} phase={r['phase']} "
              f"attempts={r['attempts']} retries={r['retries']} err={str(r.get('error'))[:120]}")
    ok_events = {e["who"]: e for e in ev("publish-ok")}
    print(f"  publish-ok: { {k: (v.get('attempt'), v.get('connectMs')) for k, v in ok_events.items()} }")
    sys.exit(0)

# ---- pooled latency ---------------------------------------------------------
vs = valid_samples()
post = [s for s in vs if s["t"] > mesh_t + 10000]
lat = [s["latencyMs"] for s in post]
warm_all = [s for s in samples if s.get("vis") == "visible" and s["t"] > mesh_t + 10000]
vpct = 100.0 * len([s for s in warm_all if s.get("decOk") and s.get("pidOk") is not False]) / len(warm_all) if warm_all else float("nan")
print(f"\n== latency (post-mesh+10s) ==")
print(f"  n={len(lat)} valid={vpct:.2f}% p50={pct(lat,50):.1f} p95={pct(lat,95):.1f} p99={pct(lat,99):.1f} ms")

# ---- per-minute table (soak / general drift) --------------------------------
if MODE in ("soak", "happy", "rotate"):
    print(f"\n== per-minute (from mesh) ==")
    binned = defaultdict(list)
    for s in vs:
        if s["t"] < mesh_t:
            continue
        binned[int((s["t"] - mesh_t) // 60000)].append(s["latencyMs"])
    # freezes + jitter buffer per minute from probe stats
    frz = defaultdict(dict)   # minute -> who -> total freeze dur (cumulative max)
    jbd = defaultdict(list)   # minute -> jbd-per-frame deltas
    prev = {}                 # (who, from) -> (jbDelay, jbCount)
    for r in sorted(stats_rows, key=lambda x: x["t"]):
        if r.get("role") != "full" or r["t"] < mesh_t:
            continue
        m = int((r["t"] - mesh_t) // 60000)
        tot = sum((ib.get("totalFreezesDuration") or 0) for ib in r.get("inbound", []))
        frz[m][r["who"]] = max(frz[m].get(r["who"], 0), tot)
        for ib in r.get("inbound", []):
            key = (r["who"], ib.get("from"))
            d, c = ib.get("jitterBufferDelay"), ib.get("jitterBufferEmittedCount")
            if d is None or c is None:
                continue
            if key in prev and c > prev[key][1]:
                jbd[m].append((d - prev[key][0]) / (c - prev[key][1]) * 1000)
            prev[key] = (d, c)
    # rss per minute
    rss = defaultdict(list)
    probe_cpu = defaultdict(list)
    for c in cpu_rows:
        m = int((c["t"] - mesh_t) // 60000)
        cc = c.get("cpu") or {}
        if cc.get("oursRssMb"):
            rss[m].append(cc["oursRssMb"])
        for pid in ("1", "2"):
            v = (cc.get("perId") or {}).get(pid)
            if v:
                probe_cpu[m].append(v["cpuPct"])
    print(f"  {'min':>4} {'n':>6} {'p50':>7} {'p95':>7} {'p99':>7} {'frzS':>6} {'jbd/f':>6} {'RSS_MB':>7} {'probeCPU':>8}")
    frz_prev = 0
    minutes = sorted(binned)
    p50s, rsss = [], []
    for m in minutes:
        l = binned[m]
        ftot = sum(frz.get(m, {}).values())
        fdelta = max(0.0, ftot - frz_prev) if frz.get(m) else 0.0
        if frz.get(m):
            frz_prev = ftot
        rm = st.mean(rss[m]) if rss.get(m) else float("nan")
        jm = st.mean(jbd[m]) if jbd.get(m) else float("nan")
        pc = st.mean(probe_cpu[m]) if probe_cpu.get(m) else float("nan")
        print(f"  {m:>4} {len(l):>6} {pct(l,50):>7.1f} {pct(l,95):>7.1f} {pct(l,99):>7.1f} "
              f"{fdelta:>6.2f} {jm:>6.1f} {rm:>7.0f} {pc:>8.1f}")
        p50s.append((m, pct(l, 50)))
        if rss.get(m):
            rsss.append((m, rm))
    if len(p50s) > 2:
        sl = slope([x for x, _ in p50s], [y for _, y in p50s])
        print(f"\n  p50 drift slope: {sl:+.3f} ms/min over {len(p50s)} min")
    if len(rsss) > 2:
        sl = slope([x for x, _ in rsss], [y for _, y in rsss])
        print(f"  RSS slope: {sl:+.2f} MB/min (total across our {len(cpu_rows and (cpu_rows[-1].get('cpu') or {}).get('perId') or [])} chromes)")
        per_id_first = (cpu_rows[0].get("cpu") or {}).get("perId") or {}
        per_id_last = (cpu_rows[-1].get("cpu") or {}).get("perId") or {}
        deltas = {k: (per_id_last.get(k) or {}).get("rssMb", 0) - (per_id_first.get(k) or {}).get("rssMb", 0)
                  for k in per_id_last if per_id_last.get(k) and per_id_first.get(k)}
        print(f"  per-chrome RSS delta first->last: {deltas}")

# ---- session polls (soak) ---------------------------------------------------
if by_kind["session-poll"]:
    print(f"\n== SFU session polls ==")
    for r in by_kind["session-poll"]:
        print(f"  t+{int((r['t']-mesh_t)/1000):>5}s {r['who']}: HTTP {r['code']} "
              f"tracks={[t.get('status') for t in r.get('tracks', [])]}"
              + (f" err={r.get('error')}" if r.get("error") else ""))

# ---- track death events -----------------------------------------------------
tm = ev("track-mute") + ev("track-ended")
if tm and MODE in ("soak", "happy"):
    print(f"\n== spontaneous track mute/ended (no kills in this mode!) ==")
    for e in tm:
        print(f"  t+{int((e['t']-mesh_t)/1000)}s {e['who']}: {e['name']} from={e.get('from')}")
elif MODE in ("soak", "happy"):
    print(f"\n  track-mute/ended events: none (no spontaneous track death)")

# ---- rotate specifics -------------------------------------------------------
if MODE == "rotate":
    rots = by_kind["rotation"]
    t_rot0 = rots[0]["t"] if rots else mesh_t
    pulls = [e for e in ev("pulled") if e["t"] > t_rot0]
    init_pulls = [e for e in ev("pulled") if e["t"] <= t_rot0]
    unpulls = ev("unpulled")
    ffs = [e for e in ev("first-frame") if e.get("ttffMs") is not None and e["t"] > t_rot0]
    print(f"\n== rotation ops ({len(rots)} rotations) ==")
    for name, evs, key in (("pull(renego)", pulls, "durMs"), ("unpull(close)", unpulls, "durMs"),
                           ("tile-switch TTFF", ffs, "ttffMs")):
        v = [e[key] for e in evs if e.get(key) is not None]
        if v:
            print(f"  {name}: n={len(v)} p50={pct(v,50):.0f} p95={pct(v,95):.0f} max={max(v):.0f} ms")
    if init_pulls:
        v = [e["durMs"] for e in init_pulls if e.get("durMs")]
        print(f"  (initial pulls: n={len(v)} p50={pct(v,50):.0f} ms)")
    # degradation: first vs second half of rotation window
    if pulls:
        tmid = t_rot0 + (pulls[-1]["t"] - t_rot0) / 2
        h1 = [e["durMs"] for e in pulls if e["t"] <= tmid]
        h2 = [e["durMs"] for e in pulls if e["t"] > tmid]
        print(f"  pull durMs 1st-half p50={pct(h1,50):.0f} vs 2nd-half p50={pct(h2,50):.0f} ms")
        f1 = [e["ttffMs"] for e in ffs if e["t"] <= tmid]
        f2 = [e["ttffMs"] for e in ffs if e["t"] > tmid]
        print(f"  TTFF 1st-half p50={pct(f1,50):.0f} vs 2nd-half p50={pct(f2,50):.0f} ms")
    errs = ev("unpull-error") + ev("pull-failed")
    print(f"  API errors during churn: {len(errs)}")
    for e in errs:
        print(f"    {e['who']} {e['name']} from={e.get('from')} {str(e.get('error'))[:120]}")
    napi = 2 * len(pulls) + len(unpulls) + len(init_pulls) * 2
    print(f"  ~API calls: {napi} over {(pulls[-1]['t']-t_rot0)/1000:.0f}s" if pulls else "")

# ---- storm / pubkill specifics ----------------------------------------------
if MODE in ("storm", "pubkill"):
    kills = by_kind["kill"]
    cycles = sorted(set(k["cycle"] for k in kills))
    print(f"\n== kill cycles ==")
    for cy in cycles:
        ck = [k for k in kills if k["cycle"] == cy]
        t_kill = min(k["t"] for k in ck)
        killed = [k["who"] for k in ck]
        rel = [r for r in by_kind["relaunch"] if r["cycle"] == cy]
        t_rel = min(r["t"] for r in rel) if rel else None
        res = [r for r in by_kind["restored"] if r["cycle"] == cy]
        print(f"\n  cycle {cy}: killed {killed} at t+{int((t_kill-mesh_t)/1000)}s"
              + (f", relaunch +{int((t_rel-t_kill)/1000)}s" if t_rel else ""))
        # what did probes see on the dead tracks?
        for id_ in killed:
            mutes = [e for e in ev("track-mute") if e.get("from") == id_ and t_kill <= e["t"] < (t_rel or 1e18)]
            ends = [e for e in ev("track-ended") if e.get("from") == id_ and t_kill <= e["t"] < (t_rel or 1e18)]
            mt = [f"{e['who']}@{(e['t']-t_kill)/1000:.1f}s" for e in mutes]
            et = [f"{e['who']}@{(e['t']-t_kill)/1000:.1f}s" for e in ends]
            print(f"    {id_}: mute[{' '.join(mt) or '-'}] ended[{' '.join(et) or '-'}]")
        # GC polls: status transitions per dead session
        gps = [g for g in by_kind["gc-poll"] if g["cycle"] == cy]
        for id_ in killed:
            mine = sorted([g for g in gps if g["who"] == id_], key=lambda g: g["sinceKillMs"])
            trans = []
            last = None
            for g in mine:
                cur = (g["code"], tuple(t.get("status") for t in g.get("tracks", [])), g.get("error"))
                if cur != last:
                    trans.append(f"+{g['sinceKillMs']/1000:.0f}s:{g['code']}/{','.join(str(s) for s in cur[1]) or '-'}"
                                 + (f"/{cur[2]}" if cur[2] else ""))
                    last = cur
            if trans:
                print(f"    {id_} SFU session: {' -> '.join(trans)}")
        # restore: repull events + first frames after relaunch
        if t_rel:
            for id_ in killed:
                det = [e for e in ev("repull-detected") if e.get("from") == id_ and e["t"] > t_rel - 1000]
                ffs = [e for e in ev("first-frame") if e.get("from") == id_ and e["t"] > t_rel]
                dd = [f"{e['who']}+{(e['t']-t_rel)/1000:.1f}s" for e in det[:2]]
                ff = [f"{e['who']}+{(e['t']-t_rel)/1000:.1f}s(ttff {e.get('ttffMs')}ms)" for e in ffs[:2]]
                pa = max([e.get("attempt", 1) for e in ev("publish-ok") if e["who"] == id_ and e["t"] > t_rel], default=None)
                print(f"    {id_} restore: detected[{' '.join(dd) or '-'}] first-frame[{' '.join(ff) or '-'}]"
                      + (f" pubAttempts={pa}" if pa else ""))
        for r in res:
            print(f"    RESTORED: outage {r.get('outageMs')} ms total ({r.get('restoreAfterRelaunchMs')} ms after relaunch)")

# ---- CPU summary ------------------------------------------------------------
if cpu_rows:
    tot = [c["cpu"]["totalPct"] for c in cpu_rows if c.get("cpu")]
    ours = [c["cpu"]["oursPct"] for c in cpu_rows if c.get("cpu")]
    sib = [c["cpu"]["siblingPct"] for c in cpu_rows if c.get("cpu")]
    print(f"\n== CPU == total max {max(tot):.0f}% ours max {max(ours):.0f}% sibling max {max(sib):.0f}% "
          f"(of 1200%)")
