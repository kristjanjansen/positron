#!/usr/bin/env python3
"""Analyze a tiered-grid run (results/m2m-grid-*.jsonl from grid-server.py).

Reports:
  - per-tier glass-to-glass latency (featured / live burned-pixel samples,
    steady window only) + wall snapshot freshness
  - TTFF by cause (initial / rotate / promote / watchdog / repull)
  - rotation: tile-switch TTFF per rotation + featured-tier disturbance check
  - kill -> left-received -> dead-marked timeline per probe
  - rejoin + promotion + demotion timelines
  - error/retry ledger
Usage: python3 analyze-grid.py results/m2m-grid-main.jsonl
"""
import json
import sys
from collections import defaultdict


def pct(sorted_vals, p):
    if not sorted_vals:
        return None
    i = min(len(sorted_vals) - 1, max(0, int(round(p / 100.0 * (len(sorted_vals) - 1)))))
    return sorted_vals[i]


def fmt_ms(v):
    return "-" if v is None else "%.1f" % v


def main(path):
    rows = []
    bad = 0
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except ValueError:
                bad += 1
    print("== %s: %d rows (%d unparseable) ==" % (path, len(rows), bad))

    events = [r for r in rows if r.get("kind") == "event"]
    samples = [r for r in rows if r.get("kind") == "sample"]
    walls = [r for r in rows if r.get("kind") == "wall"]
    driver = {k: [r for r in rows if r.get("kind") == k] for k in
              ("run-start", "storm", "grid-ready", "stage", "stage-end", "rotate-cmd",
               "kill", "dead-confirmed", "relaunch", "rejoin-confirmed",
               "promote-cmd", "promote-confirmed", "demote-confirmed", "final",
               "driver-fatal")}

    if driver["run-start"]:
        rs = driver["run-start"][0]
        print("run: label=%s room=%s smoke=%s" % (rs.get("label"), rs.get("room"), rs.get("smoke")))
    if driver["grid-ready"]:
        print("join storm -> GRID READY: %d ms" % driver["grid-ready"][0]["readyMs"])

    # ---- steady window -------------------------------------------------------
    t0 = t1 = None
    for r in driver["stage"]:
        if r.get("stage") == "steady":
            t0 = r["t"]
    for r in driver["stage-end"]:
        if r.get("stage") == "steady":
            t1 = r["t"]
    if t0 and not t1:
        t1 = max((r.get("t", 0) for r in samples), default=0)

    def in_steady(r):
        return t0 and t0 <= r.get("t", 0) <= t1

    print("\n-- per-tier latency (steady window, %s s) --"
          % ("%.0f" % ((t1 - t0) / 1000) if t0 and t1 else "?"))
    print("%-10s %6s %7s %8s %8s %8s %8s" % ("tier", "n", "valid%", "p50", "p90", "p95", "p99"))
    for tier in ("featured", "live"):
        sel = [r for r in samples if r.get("tier") == tier and in_steady(r)]
        ok = [r for r in sel if r.get("decOk")]
        lats = sorted(r["latencyMs"] for r in ok if r.get("latencyMs") is not None)
        vp = 100.0 * len(ok) / len(sel) if sel else 0
        print("%-10s %6d %6.2f%% %8s %8s %8s %8s" % (
            tier, len(sel), vp, fmt_ms(pct(lats, 50)), fmt_ms(pct(lats, 90)),
            fmt_ms(pct(lats, 95)), fmt_ms(pct(lats, 99))))
        mism = sum(1 for r in ok if r.get("pidOk") is False)
        if mism:
            print("   !! %d pid mismatches in %s" % (mism, tier))
    wsel = [r for r in walls if in_steady(r) and r.get("freshMs") is not None]
    wmiss = sum(1 for r in walls if in_steady(r) and r.get("miss"))
    fr = sorted(r["freshMs"] for r in wsel)
    print("%-10s %6d %7s %8s %8s %8s %8s   (freshness; misses=%d)" % (
        "wall", len(wsel), "-", fmt_ms(pct(fr, 50)), fmt_ms(pct(fr, 90)),
        fmt_ms(pct(fr, 95)), fmt_ms(pct(fr, 99)), wmiss))

    # ---- TTFF by cause -------------------------------------------------------
    ff = [e for e in events if e.get("name") == "first-frame" and e.get("ttffMs") is not None]
    by_cause = defaultdict(list)
    for e in ff:
        by_cause[e.get("cause", "?")].append(e["ttffMs"])
    print("\n-- tile TTFF by cause (pull start -> first valid decode) --")
    for cause, vals in sorted(by_cause.items()):
        vals.sort()
        print("  %-10s n=%-3d p50=%-6s p95=%-6s max=%s ms" % (
            cause, len(vals), fmt_ms(pct(vals, 50)), fmt_ms(pct(vals, 95)), fmt_ms(vals[-1])))

    # ---- rotation ------------------------------------------------------------
    rots = driver["rotate-cmd"]
    if rots:
        print("\n-- rotation (%d commands) --" % len(rots))
        # featured disturbance baseline: p99 inter-sample gap during steady
        feat = sorted([r["t"] for r in samples if r.get("tier") == "featured"
                       and r.get("decOk") and in_steady(r)])
        gaps = sorted(b - a for a, b in zip(feat, feat[1:]))
        base_p99 = pct(gaps, 99)
        print("  featured inter-frame gap baseline (steady): p99 %.0f ms, max %.0f ms"
              % (base_p99 or 0, gaps[-1] if gaps else 0))
        for i, rc in enumerate(rots, 1):
            t = rc["t"]
            tt = [e["ttffMs"] for e in ff if e.get("cause") == "rotate"
                  and t <= e["t"] <= t + 8000]
            fwin = sorted([r["t"] for r in samples if r.get("tier") == "featured"
                           and r.get("decOk") and t - 2000 <= r["t"] <= t + 6000])
            fg = max((b - a for a, b in zip(fwin, fwin[1:])), default=None)
            print("  rot %d: %d new tiles, ttff %s ms; featured max gap %s ms %s" % (
                i, len(tt), sorted(int(x) for x in tt),
                "%.0f" % fg if fg else "-",
                "(UNDISTURBED)" if fg and base_p99 and fg < max(500, 3 * base_p99) else ""))

    # ---- kill timeline -------------------------------------------------------
    for kr in driver["kill"]:
        pid, tk = kr["id"], kr["t"]
        print("\n-- kill %s at t=%d --" % (pid, tk))
        for probe in ("1", "2"):
            lr = [e for e in events if e.get("name") == "left-received"
                  and e.get("who") == probe and e.get("id") == pid and e["t"] >= tk]
            dm = [e for e in events if e.get("name") == "dead-marked"
                  and e.get("who") == probe and e.get("id") == pid and e["t"] >= tk]
            ws = [e for e in events if e.get("name") == "watchdog-stall"
                  and e.get("who") == probe and e.get("from") == pid and e["t"] >= tk]
            print("  probe %s: kill->left-received %s ms, ->dead-marked %s ms%s" % (
                probe,
                "%.0f" % (lr[0]["t"] - tk) if lr else "NEVER",
                "%.0f" % (dm[0]["t"] - tk) if dm else "NEVER",
                (", watchdog fired at +%.0f ms" % (ws[0]["t"] - tk)) if ws else ""))

    # ---- rejoin --------------------------------------------------------------
    for rr in driver["relaunch"]:
        pid, tr = rr["id"], rr["t"]
        print("\n-- rejoin %s (relaunch at t=%d) --" % (pid, tr))
        pub = [e for e in events if e.get("name") == "publish-ok" and e.get("who") == pid and e["t"] >= tr]
        if pub:
            print("  %s publish-ok: attempt %d, connect %d ms, at +%.0f ms" % (
                pid, pub[0].get("attempt", 0), pub[0].get("connectMs", 0), pub[0]["t"] - tr))
        for probe in ("1", "2"):
            f2 = [e for e in ff if e.get("who") == probe and e.get("from") == pid and e["t"] >= tr]
            print("  probe %s: relaunch->first-frame %s ms (ttff %s, cause %s)" % (
                probe, "%.0f" % (f2[0]["t"] - tr) if f2 else "NEVER",
                f2[0]["ttffMs"] if f2 else "-", f2[0].get("cause") if f2 else "-"))

    # ---- promote / demote ----------------------------------------------------
    for pc_ in driver["promote-cmd"]:
        pid, tier, tp = pc_["id"], pc_["tier"], pc_["t"]
        print("\n-- promote %s -> %s at t=%d --" % (pid, tier, tp))
        for probe in ("1", "2"):
            tr_ = [e for e in events if e.get("name") == "tier-received" and e.get("who") == probe
                   and e.get("id") == pid and e["t"] >= tp]
            print("  probe %s: tier frame at +%s ms" % (
                probe, "%.0f" % (tr_[0]["t"] - tp) if tr_ else "NEVER"))
            if tier == "live":
                f2 = [e for e in ff if e.get("who") == probe and e.get("from") == pid and e["t"] >= tp]
                print("            spotlight (cmd->real video): %s ms (ttff %s, cause %s)" % (
                    "%.0f" % (f2[0]["t"] - tp) if f2 else "NEVER",
                    f2[0]["ttffMs"] if f2 else "-", f2[0].get("cause") if f2 else "-"))
            else:
                w2 = [r for r in walls if r.get("to") == probe and r.get("from") == pid
                      and r.get("freshMs") is not None and r["t"] >= tp]
                wf = [r for r in w2 if r["freshMs"] < 4000]   # post-demote CONTENT
                print("            back-on-wall: any snapshot %s ms, FRESH content %s ms" % (
                    "%.0f" % (w2[0]["t"] - tp) if w2 else "NEVER",
                    ("%.0f (age %d)" % (wf[0]["t"] - tp, wf[0]["freshMs"])) if wf else "NEVER"))
        st = [e for e in events if e.get("name") == "self-tier" and e.get("who") == pid and e["t"] >= tp]
        if st:
            print("  %s self-tier %s->%s at +%.0f ms" % (
                pid, st[0].get("from"), st[0].get("to"), st[0]["t"] - tp))

    # ---- ledger --------------------------------------------------------------
    print("\n-- ledger --")
    for name in ("publish-attempt", "publish-ok", "publish-retry", "publish-exhausted",
                 "pulled", "pull-failed", "unpulled", "unpull-error", "watchdog-stall",
                 "watchdog-repull", "stall-recovered", "sid-change", "fatal"):
        n = sum(1 for e in events if e.get("name") == name)
        if n:
            print("  %-18s %d" % (name, n))
    pf = [e for e in events if e.get("name") == "pull-failed"]
    for e in pf[:5]:
        print("    pull-failed %s<-%s: %s" % (e.get("who"), e.get("from"), (e.get("error") or "")[:100]))
    if driver["driver-fatal"]:
        print("  DRIVER FATAL: %s" % driver["driver-fatal"][0].get("error"))
    pulls = [e for e in events if e.get("name") == "pulled" and e.get("durMs") is not None]
    if pulls:
        d = sorted(e["durMs"] for e in pulls)
        print("  pull API durMs: n=%d p50=%s p95=%s" % (len(d), fmt_ms(pct(d, 50)), fmt_ms(pct(d, 95))))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "results/m2m-grid.jsonl")
