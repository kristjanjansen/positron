#!/usr/bin/env python3
"""Analyze a heavy-media rung: results/m2m-heavy-*.jsonl [+ server log].

Usage: analyze-heavy.py <results.jsonl> [server.log] [warmup_s]

Extends analyze-scale.py (visible-only, checksum-valid, per-pair warmup,
join-storm API parse) with the heavy-media STOP gates:
  (a) <99 % checksum-valid on a probe      (b) pooled video p95 > 400 ms
  (c) any A or V track failed to subscribe/flow
  (d) total CPU > 900 % (75 % of 12 cores) (e) any publisher median fps < 12
  (f) audio concealment > 5 % on a probe   (g) RAM free < 3 GB
Plus: per-sender tone verification (AnalyserNode FFT match rate), audio
jitter-buffer delay, per-CLASS encoder/latency breakdown (light/show/feat/probe).
"""
import json
import re
import sys
import statistics as st
from collections import defaultdict

PATH = sys.argv[1]
SRVLOG = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2].endswith(".log") else None
WARMUP_S = float(sys.argv[3]) if len(sys.argv) > 3 else 10.0

samples, stats_rows, events, cpu_rows = [], [], [], []
mesh_rows, storm_rows, final_rows, tone_rows, abort_rows = [], [], [], [], []
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
        elif k == "tone":
            tone_rows.append(o)
        elif k in ("gate-abort", "mesh-timeout"):
            abort_rows.append(o)


def pct(vals, p):
    if not vals:
        return float("nan")
    s = sorted(vals)
    return s[min(len(s) - 1, int(round(p / 100 * (len(s) - 1))))]


gates = []  # (id, fired, text)

storm = storm_rows[-1] if storm_rows else {}
mesh_t = mesh_rows[-1]["t"] if mesh_rows else None
mesh_ms = mesh_rows[-1].get("meshMs") if mesh_rows else None
n_total = storm.get("n") or (mesh_rows[-1].get("n") if mesh_rows else None)
audio_on = bool(storm.get("audio"))
print(f"== file: {PATH} (warmup {WARMUP_S:.0f}s per pair) ==")
print(f"  label={storm.get('label')} N={n_total} audio={audio_on} "
      f"perInstance={storm.get('perInstance')} pub={storm.get('pub')} "
      f"feat={storm.get('feat')} featured={storm.get('featured')}")
print(f"  join-storm->full-A/V-mesh: {mesh_ms} ms")
for a in abort_rows:
    print(f"  !! ABORT/TIMEOUT ROW: {a.get('kind')} {a.get('why','')}")

# who -> class map (from stats rows)
cls_of = {}
for r in stats_rows:
    if r.get("who") and r.get("cls"):
        cls_of[r["who"]] = r["cls"]

# ---- events / failures ------------------------------------------------------
fails = [e for e in events if e.get("name") in ("fatal", "pull-failed", "ontrack-unmapped",
                                                "setparams-failed", "publish-retry", "connect-retry")]
pull_fail_by = defaultdict(int)
for e in fails:
    if e.get("name") == "pull-failed":
        pull_fail_by[(e.get("who"), e.get("from"))] += 1
    print(f"  !! {e.get('who')} {e.get('name')} {e.get('from', '')} {str(e.get('error', ''))[:160]}")
gave_up = [k for k, v in pull_fail_by.items() if v >= 5]

# ---- VIDEO: per-pair latency ------------------------------------------------
pairs = defaultdict(list)
for s in samples:
    pairs[(s.get("from"), s.get("to"))].append(s)

probe_warm = defaultdict(int)
probe_valid = defaultdict(int)
all_lat = []
per_pub_lat = defaultdict(list)
per_cls_lat = defaultdict(list)
print(f"\n== VIDEO per-pair (from -> probe) ==")
print(f"  {'pair':>9} {'cls':>6} {'n_raw':>6} {'valid':>6} {'ok%':>6} {'p50':>7} {'p95':>7} {'max':>7}")
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
    per_cls_lat[cls_of.get(frm, "?")].extend(lat)
    okpct = 100.0 * len(valid) / len(warm) if warm else float("nan")
    c = cls_of.get(frm, "?")
    if lat:
        print(f"  {frm}->{to:>4} {c:>6} {len(rows):>6} {len(valid):>6} {okpct:>5.1f}% "
              f"{pct(lat, 50):>7.1f} {pct(lat, 95):>7.1f} {max(lat):>7.1f}")
    else:
        print(f"  {frm}->{to:>4} {c:>6} {len(rows):>6} {len(valid):>6} {okpct:>5.1f}%  NO VALID LATENCY")
    why = defaultdict(int)
    for r in warm:
        if not r.get("decOk"):
            why[r.get("decWhy")] += 1
    if why:
        print(f"          decode failures: {dict(why)}")

print(f"\n== VIDEO pooled per sender-class ==")
for c, lat in sorted(per_cls_lat.items()):
    if lat:
        print(f"  {c:>6}: n={len(lat)} p50={pct(lat, 50):.1f} p95={pct(lat, 95):.1f} p99={pct(lat, 99):.1f}")

for probe in sorted(probe_warm):
    v = 100.0 * probe_valid[probe] / probe_warm[probe] if probe_warm[probe] else 0
    print(f"  probe {probe} overall valid: {probe_valid[probe]}/{probe_warm[probe]} = {v:.2f}%")
    gates.append((f"a-valid-probe{probe}", v < 99.0, f"probe {probe} valid {v:.2f}% (gate <99%)"))

if all_lat:
    p95 = pct(all_lat, 95)
    print(f"  POOLED: n={len(all_lat)} p50={pct(all_lat, 50):.1f} p95={p95:.1f} p99={pct(all_lat, 99):.1f} ms")
    gates.append(("b-p95", p95 > 400.0, f"pooled video p95 {p95:.1f} ms (gate >400)"))
else:
    gates.append(("b-p95", True, "no latency samples at all"))

# ---- AUDIO: tone verification ----------------------------------------------
expected_pairs_per_probe = (n_total - 1) if n_total else None
if audio_on:
    print(f"\n== AUDIO tone verification (AnalyserNode FFT peak vs expected) ==")
    tp = defaultdict(list)
    for r in tone_rows:
        tp[(r.get("from"), r.get("to"))].append(r)
    missing = []
    weak = []
    for (frm, to), rows in sorted(tp.items()):
        warm = [r for r in rows if r["t"] - min(x["t"] for x in rows) > WARMUP_S * 1000] or rows
        m = sum(1 for r in warm if r.get("match"))
        mpct = 100.0 * m / len(warm)
        hzs = [r["hz"] for r in warm if r.get("hz")]
        if mpct < 90:
            weak.append((frm, to, mpct))
        print(f"  {frm}->{to}: match {m}/{len(warm)} = {mpct:.0f}%  "
              f"expected {rows[0].get('expected')} Hz, seen p50 {pct(hzs, 50):.0f} Hz, "
              f"db last {warm[-1].get('db')}")
    probes_seen = sorted(set(to for (_, to) in tp))
    for probe in probes_seen:
        npairs = sum(1 for (_, to) in tp if to == probe)
        if expected_pairs_per_probe and npairs < expected_pairs_per_probe:
            missing.append((probe, npairs))
    flow_bad = bool(missing or weak or gave_up or not mesh_rows)
    gates.append(("c-flow", flow_bad,
                  f"missing audio pairs {missing}, weak(<90%) {weak}, gave-up {gave_up}"
                  if flow_bad else "all A+V tracks subscribed+flowed+verified"))
else:
    gates.append(("c-flow", bool(gave_up) or not mesh_rows,
                  f"tracks failed/gave up: {gave_up}" if gave_up else
                  ("mesh never completed" if not mesh_rows else "all tracks subscribed+flowed")))

# ---- AUDIO: concealment + jitter buffer from getStats -----------------------
if audio_on:
    print(f"\n== AUDIO inbound stats (post-mesh deltas, per from->probe) ==")
    by_probe_from = defaultdict(list)   # (probe, from) -> [audioInbound rows in t order]
    for r in stats_rows:
        if r.get("role") != "full":
            continue
        if mesh_t and r.get("t", 0) < mesh_t:
            continue
        for ib in r.get("audioInbound", []):
            by_probe_from[(r["who"], ib.get("from"))].append(ib)
    pooled = defaultdict(lambda: [0, 0])   # probe -> [d_concealed, d_total]
    print(f"  {'pair':>9} {'conceal%':>9} {'concEv':>7} {'jbd/smp':>8} {'lost':>5} {'level':>6}")
    for (probe, frm), ibs in sorted(by_probe_from.items()):
        a, b = ibs[0], ibs[-1]
        d_tot = (b.get("totalSamplesReceived") or 0) - (a.get("totalSamplesReceived") or 0)
        d_conc = (b.get("concealedSamples") or 0) - (a.get("concealedSamples") or 0)
        d_ev = (b.get("concealmentEvents") or 0) - (a.get("concealmentEvents") or 0)
        cpct = 100.0 * d_conc / d_tot if d_tot else float("nan")
        jbd = None
        d_em = (b.get("jitterBufferEmittedCount") or 0) - (a.get("jitterBufferEmittedCount") or 0)
        if d_em > 0:
            jbd = ((b.get("jitterBufferDelay") or 0) - (a.get("jitterBufferDelay") or 0)) / d_em * 1000
        pooled[probe][0] += d_conc
        pooled[probe][1] += d_tot
        print(f"  {frm}->{probe:>4} {cpct:>8.2f}% {d_ev:>7} "
              f"{(f'{jbd:7.1f}ms' if jbd is not None else '      --')} "
              f"{b.get('packetsLost') or 0:>5} {b.get('audioLevel') if b.get('audioLevel') is not None else '--':>6}")
    for probe, (dc, dt) in sorted(pooled.items()):
        cpct = 100.0 * dc / dt if dt else float("nan")
        print(f"  probe {probe} pooled concealment: {cpct:.2f}% ({dc}/{dt} samples)")
        gates.append((f"f-conceal-probe{probe}", (cpct == cpct) and cpct > 5.0,
                      f"probe {probe} audio concealment {cpct:.2f}% (gate >5%)"))

# ---- encoders by class ------------------------------------------------------
print(f"\n== encoders (post-mesh stats) ==")
by_who = defaultdict(list)
for r in stats_rows:
    if mesh_t and r.get("t", 0) < mesh_t:
        continue
    by_who[r.get("who")].append(r)
bad_fps = []
for who, rows in sorted(by_who.items(), key=lambda kv: (cls_of.get(kv[0], "?"), kv[0])):
    role = rows[-1].get("role", "?")
    c = cls_of.get(who, "?")
    fpss = [r["fps"] for r in rows if r.get("fps") is not None]
    med = st.median(fpss) if fpss else float("nan")
    qlr = sorted(set(r.get("qualityLimitationReason") for r in rows
                     if r.get("qualityLimitationReason") not in (None, "none")))
    qld = rows[-1].get("qualityLimitationDurations") or {}
    tbs = [r["targetBitrate"] for r in rows if r.get("targetBitrate")]
    rtts = [r["rtt"] * 1000 for r in rows if r.get("rtt") is not None]
    last = rows[-1]
    target_fps = {"light": 15}.get(c, 30 if role != "pub" else None)
    if role == "pub" and fpss and med < 12:
        bad_fps.append((who, med))
    print(f"  {who}({c}): fps med={med:.1f} min={min(fpss) if fpss else float('nan'):.1f} "
          f"out={last.get('outWidth')}x{last.get('outHeight')} "
          f"target={st.median(tbs) / 1000:.0f}kbps " if tbs else
          f"  {who}({c}): fps med={med:.1f} out={last.get('outWidth')}x{last.get('outHeight')} ", end="")
    print(f"qlr={qlr or ['none']} cpu_s={qld.get('cpu', 0)} bw_s={qld.get('bandwidth', 0)}"
          + (f" iceRTT p50={pct(rtts, 50):.0f}ms" if rtts else ""))
gates.append(("e-pub-fps", bool(bad_fps), f"pubs with median fps<12: {bad_fps or 'none'}"))

# ---- probe decode health: rVFC/rAF throttle check (co-tenancy poison) -------
print(f"\n== probe inbound video (decode fps per sender-class, post-mesh) ==")
per_probe_cls_fps = defaultdict(list)
for who, rows in by_who.items():
    if not rows or rows[-1].get("role") != "full":
        continue
    for r in rows:
        for ib in r.get("inbound", []):
            if ib.get("fps") is not None:
                per_probe_cls_fps[(who, cls_of.get(ib.get("from"), "?"))].append(ib["fps"])
for (probe, c), fpss in sorted(per_probe_cls_fps.items()):
    print(f"  probe {probe} <- {c}: decode fps med={st.median(fpss):.1f} p5={pct(fpss, 5):.1f}")

# ---- freezes ---------------------------------------------------------------
print(f"\n== freezes (probe inbound, cumulative) ==")
freeze = defaultdict(dict)
for who, rows in by_who.items():
    if not rows or rows[-1].get("role") != "full":
        continue
    last_per_from = {}
    for r in rows:
        for ib in r.get("inbound", []):
            last_per_from[ib.get("from")] = ib
    for frm, ib in last_per_from.items():
        freeze[frm][who] = (ib.get("freezeCount") or 0, ib.get("totalFreezesDuration") or 0)
any_frozen = False
for frm, per_probe in sorted(freeze.items()):
    counts = {p: c for p, (c, d) in per_probe.items()}
    if any(c > 0 for c in counts.values()):
        any_frozen = True
        both = all(c > 0 for c in counts.values()) and len(counts) > 1
        durs = {p: round(d, 2) for p, (c, d) in per_probe.items()}
        print(f"  {frm}({cls_of.get(frm, '?')}): counts={counts} durations={durs} -> "
              f"{'SENDER/SFU-side (both probes)' if both else 'receiver-side (one probe)'}")
if not any_frozen:
    print("  none")

# ---- CPU + RAM --------------------------------------------------------------
print(f"\n== CPU (12 cores = 1200 %) + RAM ==")
tot_max, min_free = 0, 1e9
for c in cpu_rows:
    cpu = c.get("cpu") or {}
    mem = c.get("mem") or {}
    tot_max = max(tot_max, cpu.get("totalPct") or 0)
    if mem.get("freeGb") is not None:
        min_free = min(min_free, mem["freeGb"])
    print(f"  total={cpu.get('totalPct')}% ours={cpu.get('oursPct')}% "
          f"otherChrome={cpu.get('otherChromePct')}% oursRSS={cpu.get('oursRssMb')}MB "
          f"freeRAM={mem.get('freeGb')}GB")
if cpu_rows:
    per_group = (cpu_rows[-1].get("cpu") or {}).get("perGroup") or {}
    for g, v in sorted(per_group.items()):
        if v:
            print(f"    {g}[{v.get('ids')}]: {v['cpuPct']}% {v['rssMb']}MB {v['procs']} procs")
gates.append(("d-cpu", tot_max > 900.0, f"max total CPU {tot_max}% (gate >900% = 75% of 12 cores)"))
gates.append(("g-ram", (min_free < 3.0) or bool([a for a in abort_rows if a.get('kind') == 'gate-abort']),
              f"min RAM free {min_free if min_free < 1e9 else '?'} GB (gate <3)"))

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
        print(f"  {kind}: n={len(rows)} codes={dict(codes)} p50={pct(lats, 50):.0f} "
              f"p95={pct(lats, 95):.0f} max={max(lats)} ms")
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
