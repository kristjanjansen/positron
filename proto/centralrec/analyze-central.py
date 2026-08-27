#!/usr/bin/env python3
"""centralrec analysis — house style (proto/m2m analyze-*.py lineage).

Usage: python3 analyze-central.py <label> [--decode]

Reads results/centralrec-<label>.jsonl + recordings/<label>/*.webm and reports:
  - studio downlink Mbps (getStats bytesReceived deltas, per track + total +
    transport-level with wire overhead)
  - CPU (recorder Chrome / publisher Chrome / node) from driver ps samples
  - per-tile achieved fps/resolution from getStats
  - recorded-file facts: size, effective bitrate, and (--decode) full burned-row
    decode via ffmpeg rawvideo pipe: decode rate, pid match, clock span, gaps
  - event timeline extracts (pull/rec lifecycle, b3 kill/rejoin)
Writes artifacts/<label>-analysis.json.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))

# burned-row geometry (identical to the live decoder in pub/recorder pages)
NBLOCKS, BLOCK_W, ROW_X, ROW_Y, ROW_H = 64, 9, 32, 40, 56
ROW_YC = ROW_Y + ROW_H // 2          # 68
W, H = 640, 360


def pctl(xs, p):
    if not xs:
        return None
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(round(p / 100 * (len(xs) - 1))))]


def decode_row(row_bytes):
    levels = []
    for i in range(NBLOCKS):
        base = i * BLOCK_W
        s = row_bytes[base + 3] + row_bytes[base + 4] + row_bytes[base + 5]
        levels.append(s / 3.0)
    mn, mx = min(levels), max(levels)
    if mx - mn < 60:
        return {"ok": False, "why": "low-contrast"}
    thr = (mn + mx) / 2
    bits = [1 if l > thr else 0 for l in levels]
    ms = 0
    for i in range(48):
        ms = ms * 2 + bits[i]
    pid = 0
    for i in range(48, 56):
        pid = pid * 2 + bits[i]
    ck = 0
    for i in range(56, 64):
        ck = ck * 2 + bits[i]
    by = []
    v = ms
    for i in range(6):
        by.append(v % 256)
        v //= 256
    by = by[::-1] + [pid]
    expect = 0
    for b in by:
        expect ^= b
    if expect != ck:
        return {"ok": False, "why": "checksum"}
    return {"ok": True, "ms": ms, "pid": chr(pid)}


def decode_file(path):
    """Full-frame burned-row decode via ffmpeg rawvideo gray pipe."""
    # -fps_mode vfr: MediaRecorder webm has a 1 ms timebase and ffmpeg's default
    # CFR guess duplicates every frame to 1000 fps on a rawvideo pipe (smoke
    # finding: 20767 "frames" in 20 s). vfr emits one frame per coded frame.
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={W}:{H}",
           "-fps_mode", "vfr", "-f", "rawvideo", "-pix_fmt", "gray", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    frame_size = W * H
    row_off = ROW_YC * W + ROW_X
    row_len = NBLOCKS * BLOCK_W
    n = ok = ck_fail = contrast_fail = pid_bad = 0
    first_ms = last_ms = None
    prev_ms = None
    gaps = []            # (at_ms, gap_ms) for gaps > 1000
    deltas = []
    pids = {}
    buf = b""
    while True:
        chunk = p.stdout.read(frame_size - len(buf))
        if not chunk:
            break
        buf += chunk
        if len(buf) < frame_size:
            continue
        row = buf[row_off:row_off + row_len]
        buf = b""
        n += 1
        d = decode_row(row)
        if not d["ok"]:
            if d["why"] == "checksum":
                ck_fail += 1
            else:
                contrast_fail += 1
            continue
        ok += 1
        pids[d["pid"]] = pids.get(d["pid"], 0) + 1
        if first_ms is None:
            first_ms = d["ms"]
        last_ms = d["ms"]
        if prev_ms is not None:
            dt = d["ms"] - prev_ms
            deltas.append(dt)
            if dt > 1000:
                gaps.append((prev_ms, dt))
        prev_ms = d["ms"]
    p.stdout.close()
    p.wait()
    span_s = (last_ms - first_ms) / 1000.0 if first_ms is not None and last_ms > first_ms else None
    return {
        "frames": n, "decodeOk": ok,
        "decodeRate": round(ok / n, 4) if n else None,
        "checksumFail": ck_fail, "contrastFail": contrast_fail,
        "pids": pids,
        "firstMs": first_ms, "lastMs": last_ms, "spanS": round(span_s, 2) if span_s else None,
        "effFps": round(ok / span_s, 2) if span_s else None,
        "interFrameP50": pctl(deltas, 50), "interFrameP95": pctl(deltas, 95),
        "interFrameMax": max(deltas) if deltas else None,
        "gapsOver1s": [(int(a), int(g)) for a, g in gaps[:20]],
    }


def ffprobe(path):
    try:
        out = subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries",
             "stream=codec_name,width,height", "-of", "json", path],
            stderr=subprocess.DEVNULL)
        st = json.loads(out).get("streams", [{}])[0]
    except Exception:
        st = {}
    st["bytes"] = os.path.getsize(path)
    return st


def main():
    label = sys.argv[1]
    do_decode = "--decode" in sys.argv
    results = os.path.join(ROOT, "results", f"centralrec-{label}.jsonl")
    recdir = os.path.join(HERE, "recordings", label)
    rows = [json.loads(l) for l in open(results)]

    rep = {"label": label}
    meta = next((r for r in rows if r.get("kind") == "run-start"), {})
    rep["meta"] = {k: meta.get(k) for k in ("scenario", "n", "durS", "room", "rid", "ids")}
    t0row = next((r for r in rows if r.get("kind") == "t0"), None)
    endrow = next((r for r in rows if r.get("kind") == "run-end"), None)
    T0 = t0row["t"] if t0row else None
    TEND = endrow["t"] if endrow else None

    # ---- studio downlink from recorder getStats -----------------------------
    rec_stats = [r for r in rows if r.get("kind") == "stats" and r.get("role") == "rec"]
    in_window = [r for r in rec_stats if T0 and T0 <= r["t"] <= (TEND or 1e18)]
    per_track = {}
    total_series = []       # (t, sum_bytesReceived)
    transport_series = []
    tile_quality = {}       # pid -> {fps:[], w:[], h:[], freezes, framesDecoded}
    for r in in_window:
        s = 0
        for ib in r.get("inbound", []):
            pid = ib.get("from")
            br = ib.get("bytesReceived") or 0
            s += br
            per_track.setdefault(pid, []).append((r["t"], br))
            q = tile_quality.setdefault(pid, {"fps": [], "w": [], "h": [],
                                              "freezeCount": 0, "totalFreezesDuration": 0,
                                              "framesDecoded": 0, "framesDropped": 0,
                                              "packetsLost": 0})
            if ib.get("fps") is not None:
                q["fps"].append(ib["fps"])
            if ib.get("frameWidth"):
                q["w"].append(ib["frameWidth"])
                q["h"].append(ib["frameHeight"])
            q["freezeCount"] = ib.get("freezeCount") or q["freezeCount"]
            q["totalFreezesDuration"] = ib.get("totalFreezesDuration") or q["totalFreezesDuration"]
            q["framesDecoded"] = ib.get("framesDecoded") or q["framesDecoded"]
            q["framesDropped"] = ib.get("framesDropped") if ib.get("framesDropped") is not None else q["framesDropped"]
            q["packetsLost"] = ib.get("packetsLost") or q["packetsLost"]
        total_series.append((r["t"], s))
        if r.get("transportBytesReceived") is not None:
            transport_series.append((r["t"], r["transportBytesReceived"]))

    def series_mbps(series):
        # RESET-AWARE (b3 finding): Chrome recreates inbound-rtp stat objects on
        # every renegotiation (unpull/repull) — bytesReceived restarts from ~0 on
        # ALL tracks. Accumulate positive deltas; on a negative delta treat the
        # new counter value as bytes-since-reset.
        if len(series) < 2:
            return None
        total = 0
        prev = series[0][1]
        for _, b in series[1:]:
            d = b - prev
            total += d if d >= 0 else b
            prev = b
        span_ms = series[-1][0] - series[0][0]
        if span_ms <= 0:
            return None
        return round(total * 8 / span_ms / 1000, 3)   # bytes over ms -> Mbps

    rep["downlink"] = {
        "totalPayloadMbps": series_mbps(total_series),
        "transportMbps": series_mbps(transport_series),
        "perTrackMbps": {pid: series_mbps(s) for pid, s in sorted(per_track.items())},
        "windowS": round((total_series[-1][0] - total_series[0][0]) / 1000, 1) if len(total_series) > 1 else None,
    }
    rep["tileQuality"] = {
        pid: {"fpsP50": pctl(q["fps"], 50), "fpsMin": min(q["fps"]) if q["fps"] else None,
              "res": f"{pctl(q['w'],50)}x{pctl(q['h'],50)}" if q["w"] else None,
              "freezeCount": q["freezeCount"],
              "totalFreezesDuration": round(q["totalFreezesDuration"], 2),
              "framesDecoded": q["framesDecoded"], "framesDropped": q["framesDropped"],
              "packetsLost": q["packetsLost"]}
        for pid, q in sorted(tile_quality.items())
    }

    # ---- CPU ----------------------------------------------------------------
    cpu = [r for r in rows if r.get("kind") == "cpu" and T0 and r["t"] >= T0]
    if cpu:
        rep["cpu"] = {
            k: {"p50": pctl([c.get(k, 0) for c in cpu], 50),
                "max": max(c.get(k, 0) for c in cpu)}
            for k in ("rec", "pub", "victim", "nodeSrv", "nodeDrv", "recRssMb", "pubRssMb")
        }

    # ---- publisher-side health ----------------------------------------------
    pub_stats = [r for r in rows if r.get("kind") == "stats" and r.get("role") == "pub"
                 and T0 and T0 <= r["t"] <= (TEND or 1e18)]
    by_pub = {}
    for r in pub_stats:
        by_pub.setdefault(r["who"], []).append(r)
    rep["publishers"] = {}
    for pid, rs in sorted(by_pub.items()):
        fps = [r["fps"] for r in rs if r.get("fps") is not None]
        qlr = {}
        for r in rs:
            qlr[r.get("qualityLimitationReason") or "?"] = qlr.get(r.get("qualityLimitationReason") or "?", 0) + 1
        bs = [(r["t"], r.get("bytesSent") or 0) for r in rs if r.get("bytesSent")]
        rep["publishers"][pid] = {"fpsP50": pctl(fps, 50), "qlr": qlr,
                                  "uplinkMbps": series_mbps(bs)}

    # ---- chunk timeline / file facts ----------------------------------------
    chunks = [r for r in rows if r.get("kind") == "chunk"]
    ends = {r["file"]: r for r in rows if r.get("kind") == "rec-end"}
    files = {}
    for c in chunks:
        f = files.setdefault(c["file"], {"chunks": 0, "bytes": 0, "firstT": c["t"], "lastT": c["t"],
                                         "seqGaps": 0})
        f["chunks"] += 1
        f["bytes"] += c["bytes"]
        f["lastT"] = c["t"]
        if not c.get("inOrder", True) and c["seq"] != 0:
            f["seqGaps"] += 1
    rep["recFiles"] = {}
    for name, f in sorted(files.items()):
        path = os.path.join(recdir, name + ".webm")
        entry = dict(f)
        entry["cleanEnd"] = name in ends
        entry["endReason"] = ends.get(name, {}).get("reason")
        if os.path.exists(path):
            entry["probe"] = ffprobe(path)
            dur_s = (f["lastT"] - f["firstT"]) / 1000 + 2.0    # + one timeslice
            entry["effectiveKbps"] = round(entry["probe"]["bytes"] * 8 / dur_s / 1000, 1) if dur_s > 0 else None
            if do_decode:
                entry["burn"] = decode_file(path)
        rep["recFiles"][name] = entry

    # ---- event extracts ------------------------------------------------------
    evs = [r for r in rows if r.get("kind") == "event"]
    keep = ("kill", "rejoin-launch", "rec-ready", "pubs-running")
    rep["timeline"] = [{k: r.get(k) for k in ("kind", "t", "id", "pids")}
                       for r in rows if r.get("kind") in keep]
    rep["events"] = [
        {"t": e["t"], "who": e.get("who"), "name": e["name"],
         **{k: v for k, v in e.items() if k not in ("kind", "t", "who", "name", "srv_ts")}}
        for e in evs
        if e["name"] in ("left-received", "published-received", "pulled", "rec-start",
                         "rec-stop", "rec-first-chunk", "track-arrived", "track-unmuted",
                         "unpulled", "pull-failed", "rec-error", "sig-error", "fatal",
                         "publish-retry", "track-rearrived-ignored")
    ]

    out = os.path.join(HERE, "artifacts", f"{label}-analysis.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as fh:
        json.dump(rep, fh, indent=1, default=str)

    # ---- console summary ----------------------------------------------------
    print(f"== centralrec {label} ({rep['meta']})")
    print(f"downlink: total payload {rep['downlink']['totalPayloadMbps']} Mbps, "
          f"transport {rep['downlink']['transportMbps']} Mbps over {rep['downlink']['windowS']} s")
    print("per-track Mbps:", rep["downlink"]["perTrackMbps"])
    if "cpu" in rep:
        print("cpu %:", {k: v for k, v in rep["cpu"].items() if v["p50"] is not None})
    print("tiles:", {p: f"{q['res']}@{q['fpsP50']}fps fz={q['freezeCount']}"
                     for p, q in rep["tileQuality"].items()})
    for name, f in rep["recFiles"].items():
        line = (f"file {name}: {f['bytes']/1e6:.2f} MB, {f['chunks']} chunks, "
                f"{f.get('effectiveKbps')} kbps, cleanEnd={f['cleanEnd']}({f.get('endReason')})")
        if "burn" in f:
            b = f["burn"]
            line += (f" | burn: {b['decodeOk']}/{b['frames']} ok ({b['decodeRate']}), "
                     f"span {b['spanS']}s effFps {b['effFps']}, "
                     f"maxGap {b['interFrameMax']}ms, pids {b['pids']}")
        print(line)
    print("saved ->", out)


if __name__ == "__main__":
    main()
