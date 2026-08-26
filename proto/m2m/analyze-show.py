#!/usr/bin/env python3
"""Analyze a P3C scored-show run (results/m2m-p3c-*.jsonl).

Reports, per file:
  - score adherence: operator fire drift vs scored offset; DO echo round trip
  - per-event-type command->visual-effect latency:
      promote  -> tier-frame propagation + (if newly pulled) cmd->first video
      rotate   -> cue propagation + cmd->first frame of the new page
      demote   -> tier-frame propagation + cmd->fresh wall snapshot (<4 s old)
      note cue -> propagation only
  - wave smoothness: per rotate event, worst per-stream featured-tier frame
    gap in [fire-2 s, fire+6 s] vs steady baseline; heavy (>=3 unpulls) vs
    light rotations split
  - disruption to unaffected tiers: featured+live per-stream gap p99 inside
    event windows vs steady
  - correctness: driver assert rows (expected-vs-observed after every event)
  - ledger + CPU contention
With 2+ files: side-by-side wave table (the stag=0 vs stag=1 A/B).
Usage: python3 analyze-show.py results/m2m-p3c-stag0.jsonl [results/m2m-p3c-stag1.jsonl]
"""
import json
import sys
from collections import defaultdict


def pct(sorted_vals, p):
    if not sorted_vals:
        return None
    i = min(len(sorted_vals) - 1, max(0, int(round(p / 100.0 * (len(sorted_vals) - 1)))))
    return sorted_vals[i]


def fmt(v, suf=""):
    return "-" if v is None else "%.0f%s" % (v, suf)


def load(path):
    rows = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    rows.append(json.loads(line))
                except ValueError:
                    pass
    return rows


def stream_gaps(samples, t_lo, t_hi):
    """max inter-sample gap per (to, from) stream inside [t_lo, t_hi]; also all gaps."""
    streams = defaultdict(list)
    for r in samples:
        if t_lo <= r["t"] <= t_hi:
            streams[(r.get("to"), r.get("from"))].append(r["t"])
    per_stream_max, all_gaps = {}, []
    for k, ts_ in streams.items():
        ts_.sort()
        gaps = [b - a for a, b in zip(ts_, ts_[1:])]
        if gaps:
            per_stream_max[k] = max(gaps)
            all_gaps.extend(gaps)
    return per_stream_max, all_gaps


def analyze(path):
    rows = load(path)
    events = [r for r in rows if r.get("kind") == "event"]
    samples = [r for r in rows if r.get("kind") == "sample" and r.get("decOk")]
    walls = [r for r in rows if r.get("kind") == "wall"]
    fires = [r for r in rows if r.get("kind") == "score-fire"]
    actions = defaultdict(list)
    seen_act = set()
    for r in rows:
        if r.get("kind") == "score-action" and r.get("eventId") not in ("setup",):
            k = (r["eventId"], r.get("action"), r.get("participantId"), r.get("tier"), r.get("cmd"))
            if k in seen_act:
                continue                     # pre-flight residue dedup
            seen_act.add(k)
            actions[r["eventId"]].append(r)
    echoes = [r for r in rows if r.get("kind") == "score-echo"]
    asserts = [r for r in rows if r.get("kind") == "assert"]
    cpu = [r for r in rows if r.get("kind") == "cpu"]
    run0 = next((r for r in rows if r.get("kind") == "run-start"), {})
    t0row = next((r for r in rows if r.get("kind") == "t0"), {})
    T0 = t0row.get("t0")
    if T0:                       # drop pre-show residue (e.g. operator pre-flight rows)
        fires = [r for r in fires if r["firedAt"] >= T0 - 5000]
        echoes = [r for r in echoes if r["t"] >= T0 - 60000]
    label = run0.get("label", "?")
    stag = run0.get("stag")

    print("\n" + "=" * 76)
    print("== %s  (label=%s stag=%s, %d rows) ==" % (path, label, stag, len(rows)))

    ff = [e for e in events if e.get("name") == "first-frame" and e.get("ttffMs") is not None]
    cues_recv = [e for e in events if e.get("name") == "cue-received"]
    tier_recv = [e for e in events if e.get("name") == "tier-received"]
    self_tier = [e for e in events if e.get("name") == "self-tier"]
    unpulls = [e for e in events if e.get("name") == "unpulled"]

    # ---- adherence -----------------------------------------------------------
    drifts = sorted(r["driftMs"] for r in fires)
    print("\n-- score adherence (operator fire vs scored offset, n=%d) --" % len(drifts))
    if drifts:
        print("  drift ms: p50 %s  p95 %s  max %s  min %s" % (
            fmt(pct(drifts, 50)), fmt(pct(drifts, 95)), fmt(drifts[-1]), fmt(drifts[0])))
    et = sorted(r["echoMs"] for r in echoes if r.get("what", "").startswith(("cue/",)) is False)
    ec = sorted(r["echoMs"] for r in echoes if r.get("what", "").startswith("cue/"))
    print("  operator echo RTT through DO: tier n=%d p50 %s p95 %s | cue n=%d p50 %s p95 %s" % (
        len(et), fmt(pct(et, 50)), fmt(pct(et, 95)), len(ec), fmt(pct(ec, 50)), fmt(pct(ec, 95))))

    # ---- per-event cmd -> effect ---------------------------------------------
    print("\n-- per-event command -> visual effect --")
    rotate_stats = []          # (eventId, fire_t, per-probe dict)
    agg = defaultdict(list)    # metric -> values
    for fr in fires:
        ev_id, ft = fr["eventId"], fr["firedAt"]
        lines = []
        for a in actions.get(ev_id, []):
            if a["action"] == "cue" and a.get("cmd") in ("rotate", "note"):
                props = sorted(e["propMs"] for e in cues_recv
                               if e.get("cueId") == ev_id and e.get("propMs") is not None)
                lines.append("cue/%s prop n=%d p50 %s max %s ms" % (
                    a["cmd"], len(props), fmt(pct(props, 50)), fmt(props[-1] if props else None)))
                agg["cue-prop"].extend(props)
                if a.get("cmd") == "rotate":
                    per_probe = {}
                    for probe in ("1", "2"):
                        nf = sorted(e["t"] - ft for e in ff
                                    if e.get("who") == probe and e.get("cause") == "rotate"
                                    and ft <= e["t"] <= ft + 8000)
                        if nf:
                            per_probe[probe] = nf[0]
                            agg["rotate-first-new-frame"].append(nf[0])
                    lines.append("page-switch cmd->new frame: %s ms" % (
                        {k: int(v) for k, v in per_probe.items()} or "already-warm/none"))
                    rotate_stats.append((ev_id, ft, per_probe))
            elif a["action"] in ("promote", "demote"):
                pid, tier = a["participantId"], a["tier"]
                props = sorted(e["t"] - ft for e in tier_recv
                               if e.get("id") == pid and ft <= e["t"] <= ft + 5000)
                props += sorted(e["t"] - ft for e in self_tier
                                if e.get("who") == pid and e.get("to") == tier and ft <= e["t"] <= ft + 5000)
                agg["tier-prop"].extend(props)
                line = "%s %s->%s: tier-frame prop p50 %s ms" % (a["action"], pid, tier,
                                                                 fmt(pct(sorted(props), 50)))
                if tier in ("featured", "live"):
                    vids = {}
                    for probe in ("1", "2"):
                        nf = [e["t"] - ft for e in ff
                              if e.get("who") == probe and e.get("from") == pid
                              and ft <= e["t"] <= ft + 15000]
                        if nf:
                            vids[probe] = int(nf[0])
                            agg["promote-video"].append(nf[0])
                    line += "; cmd->video %s" % (vids if vids else "(already on screen)")
                if tier == "wall":
                    snaps = {}
                    for probe in ("1", "2"):
                        anyw = [w["t"] - ft for w in walls
                                if w.get("to") == probe and w.get("from") == pid and w["t"] >= ft]
                        fresh = [w["t"] - ft for w in walls
                                 if w.get("to") == probe and w.get("from") == pid and w["t"] >= ft
                                 and w.get("freshMs") is not None and w["freshMs"] < 4000]
                        if fresh:
                            snaps[probe] = int(fresh[0])
                            agg["demote-fresh-snap"].append(fresh[0])
                        elif anyw:
                            snaps[probe] = "any@%d" % anyw[0]
                    line += "; cmd->fresh snapshot %s" % (snaps if snaps else "NONE")
                lines.append(line)
        print("  %-18s %s" % (ev_id, ("\n" + " " * 21).join(lines) if lines else "(no actions?)"))

    print("\n-- aggregate cmd->effect --")
    for k in ("tier-prop", "cue-prop", "promote-video", "rotate-first-new-frame", "demote-fresh-snap"):
        v = sorted(agg[k])
        if v:
            print("  %-24s n=%-3d p50 %-6s p95 %-6s max %s ms" % (
                k, len(v), fmt(pct(v, 50)), fmt(pct(v, 95)), fmt(v[-1])))

    # ---- wave smoothness -----------------------------------------------------
    show_end = T0 + (run0.get("durationMs") or 3600000) if T0 else None
    fire_windows = [(fr["firedAt"] - 2000, fr["firedAt"] + 6000) for fr in fires]

    def outside_windows(t):
        return all(not (lo <= t <= hi) for lo, hi in fire_windows)

    feat = [r for r in samples if r.get("tier") == "featured" and T0 and r["t"] >= T0]

    def segment(t):            # inter-window segment index, so steady gaps never span a window
        return sum(1 for lo, _hi in fire_windows if t > lo)

    def steady_gaps_of(sel):
        streams = defaultdict(list)
        for r in sel:
            if outside_windows(r["t"]):
                streams[(r.get("to"), r.get("from"), segment(r["t"]))].append(r["t"])
        gaps = []
        for ts_ in streams.values():
            ts_.sort()
            gaps.extend(b - a for a, b in zip(ts_, ts_[1:]))
        gaps.sort()
        return gaps

    base_gaps = steady_gaps_of(feat)
    base_p99 = pct(base_gaps, 99)
    print("\n-- wave smoothness (featured tier during rotate events) --")
    print("  steady baseline per-stream gap: p99 %s ms  max %s ms (n=%d gaps)" % (
        fmt(base_p99), fmt(base_gaps[-1] if base_gaps else None), len(base_gaps)))
    wave_rows = []
    for ev_id, ft, _pp in rotate_stats:
        per_stream, _ = stream_gaps(feat, ft - 2000, ft + 6000)
        worst = max(per_stream.values()) if per_stream else None
        nunp = len([u for u in unpulls if ft <= u["t"] <= ft + 6000 and u.get("why") == "hidden"])
        heavy = nunp >= 6              # 4-unpull burst per probe (page0->page1), pooled 2 probes
        wave_rows.append((ev_id, worst, nunp, heavy))
        print("  %-14s worst featured gap %6s ms  (unpulls in window: %d%s)" % (
            ev_id, fmt(worst), nunp, ", HEAVY" if heavy else ""))
    hv = sorted(w for _, w, _, h in wave_rows if h and w is not None)
    lv = sorted(w for _, w, _, h in wave_rows if not h and w is not None)
    print("  HEAVY rotations (4-unpull burst/probe): n=%d  p50 %s  max %s ms" % (
        len(hv), fmt(pct(hv, 50)), fmt(hv[-1] if hv else None)))
    print("  light rotations (2-unpull/probe):       n=%d  p50 %s  max %s ms" % (
        len(lv), fmt(pct(lv, 50)), fmt(lv[-1] if lv else None)))

    # ---- disruption to unaffected tiers --------------------------------------
    print("\n-- disruption to unaffected tiers (per-stream gaps, all event windows) --")
    for tier in ("featured", "live"):
        tsel = [r for r in samples if r.get("tier") == tier and T0 and r["t"] >= T0]
        inw, outw = [], []
        for fr in fires:
            targets = {a.get("participantId") for a in actions.get(fr["eventId"], [])}
            sel = [r for r in tsel if r.get("from") not in targets]
            _, g = stream_gaps(sel, fr["firedAt"] - 2000, fr["firedAt"] + 6000)
            inw.extend(g)
        outw = steady_gaps_of(tsel)
        inw.sort()
        print("  %-9s in-window p99 %6s max %6s | steady p99 %6s max %6s ms" % (
            tier, fmt(pct(inw, 99)), fmt(inw[-1] if inw else None),
            fmt(pct(outw, 99)), fmt(outw[-1] if outw else None)))

    # ---- steady latency sanity ----------------------------------------------
    print("\n-- per-tier latency (whole show, decode-valid) --")
    for tier in ("featured", "live"):
        lats = sorted(r["latencyMs"] for r in samples
                      if r.get("tier") == tier and r.get("latencyMs") is not None
                      and T0 and r["t"] >= T0)
        print("  %-9s n=%-6d p50 %s p95 %s p99 %s ms" % (
            tier, len(lats), fmt(pct(lats, 50)), fmt(pct(lats, 95)), fmt(pct(lats, 99))))
    wf = sorted(r["freshMs"] for r in walls if r.get("freshMs") is not None and T0 and r["t"] >= T0)
    print("  %-9s n=%-6d p50 %s p95 %s ms (snapshot freshness)" % (
        "wall", len(wf), fmt(pct(wf, 50)), fmt(pct(wf, 95))))

    # ---- correctness ---------------------------------------------------------
    print("\n-- correctness assertions (driver, after every event) --")
    npass = sum(1 for a in asserts if a.get("pass"))
    print("  %d/%d PASS" % (npass, len(asserts)))
    for a in asserts:
        if not a.get("pass"):
            print("  FAIL %s: %s" % (a.get("eventId"), "; ".join(a.get("fails", []))[:300]))

    # ---- ledger + cpu --------------------------------------------------------
    print("\n-- ledger --")
    for name in ("publish-retry", "publish-exhausted", "pull-failed", "unpull-error",
                 "unpull-batch", "unpull-batch-error", "watchdog-stall", "watchdog-repull",
                 "stall-recovered", "sid-change", "fatal"):
        n = sum(1 for e in events if e.get("name") == name)
        if n:
            print("  %-18s %d" % (name, n))
    for kind in ("page-reload", "score-recast", "score-fatal", "driver-fatal", "ready-timeout"):
        n = sum(1 for r in rows if r.get("kind") == kind)
        if n:
            print("  %-18s %d" % (kind, n))
    ub = sorted(e["durMs"] for e in events if e.get("name") == "unpull-batch" and e.get("durMs"))
    if ub:
        print("  unpull-batch durMs: p50 %s max %s (n=%d)" % (fmt(pct(ub, 50)), fmt(ub[-1]), len(ub)))
    pulls = sorted(e["durMs"] for e in events if e.get("name") == "pulled" and e.get("durMs") is not None)
    if pulls:
        print("  pull API durMs: n=%d p50 %s p95 %s" % (len(pulls), fmt(pct(pulls, 50)), fmt(pct(pulls, 95))))
    if cpu:
        ours = [c["ours"] for c in cpu]
        other = [c["other"] for c in cpu]
        print("  cpu %%: ours mean %d max %d | other-chrome mean %d max %d (n=%d)" % (
            sum(ours) / len(ours), max(ours), sum(other) / len(other), max(other), len(cpu)))
    return {"label": label, "stag": stag, "waves": wave_rows, "base_p99": base_p99,
            "heavy": hv, "light": lv}


def main(paths):
    res = [analyze(p) for p in paths]
    if len(res) >= 2:
        print("\n" + "=" * 76)
        print("== WAVE A/B: worst featured-tier gap per rotation ==")
        print("%-24s" % "" + "".join("%16s" % ("%s(stag=%s)" % (r["label"], r["stag"])) for r in res))
        ids = [w[0] for w in res[0]["waves"]]
        for i, ev_id in enumerate(ids):
            vals = []
            for r in res:
                w = r["waves"][i] if i < len(r["waves"]) else None
                vals.append("%10s%s" % (fmt(w[1]) if w else "-", " H" if w and w[3] else "  "))
            print("%-24s" % ev_id + "".join("%16s" % v for v in vals))
        print("%-24s" % "HEAVY p50/max" + "".join(
            "%16s" % ("%s/%s" % (fmt(pct(r["heavy"], 50)), fmt(r["heavy"][-1] if r["heavy"] else None)))
            for r in res))
        print("%-24s" % "steady p99" + "".join("%16s" % fmt(r["base_p99"]) for r in res))


if __name__ == "__main__":
    main(sys.argv[1:] or ["results/m2m-p3c-smoke.jsonl"])
