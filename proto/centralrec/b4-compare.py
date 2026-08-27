#!/usr/bin/env python3
"""B4 — quality evidence: central recording (through the SFU, decoded+re-encoded)
vs the SOURCE-SIDE reference recording of the same canvas (pub.html selfrec=1),
both MediaRecorder vp8 @ 1.2 Mbps cap, timeslice 2000 ms.

Frames with the SAME burned wall-clock ms are the SAME drawn canvas frame, so
matched-ms pairs isolate the SFU hop + double encode. Reports:
  - decode success + row contrast (legibility margin) for both arms
  - matched-frame gray PSNR central-vs-source (sampled)
  - bytes/kbps comparison
Usage: python3 b4-compare.py <central.webm> <source.webm>
"""
import json
import os
import subprocess
import sys

NBLOCKS, BLOCK_W, ROW_X, ROW_YC = 64, 9, 32, 68
W, H = 640, 360
FRAME = W * H
ROW_OFF = ROW_YC * W + ROW_X
ROW_LEN = NBLOCKS * BLOCK_W


def decode_row(row):
    levels = []
    for i in range(NBLOCKS):
        b = i * BLOCK_W
        levels.append((row[b + 3] + row[b + 4] + row[b + 5]) / 3.0)
    mn, mx = min(levels), max(levels)
    if mx - mn < 60:
        return None, mx - mn
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
    e = 0
    for b in by:
        e ^= b
    if e != ck:
        return None, mx - mn
    return ms, mx - mn


def frames(path):
    p = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={W}:{H}",
         "-fps_mode", "vfr", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    while True:
        buf = b""
        while len(buf) < FRAME:
            c = p.stdout.read(FRAME - len(buf))
            if not c:
                break
            buf += c
        if len(buf) < FRAME:
            break
        yield buf
    p.stdout.close()
    p.wait()


def scan(path, keep_ms=None):
    """Pass over file: decode stats (+contrast), optionally keep frames by ms."""
    n = ok = 0
    contrasts = []
    ms_list = []
    kept = {}
    for buf in frames(path):
        n += 1
        ms, con = decode_row(buf[ROW_OFF:ROW_OFF + ROW_LEN])
        contrasts.append(con)
        if ms is None:
            continue
        ok += 1
        ms_list.append(ms)
        if keep_ms and ms in keep_ms and ms not in kept:
            kept[ms] = buf
    return {"frames": n, "ok": ok, "meanContrast": round(sum(contrasts) / len(contrasts), 1),
            "minContrast": round(min(contrasts), 1), "ms": ms_list, "kept": kept}


def psnr(a, b):
    se = 0
    for x, y in zip(a, b):
        d = x - y
        se += d * d
    mse = se / len(a)
    if mse == 0:
        return 99.0
    import math
    return 10 * math.log10(255 * 255 / mse)


def main():
    central, source = sys.argv[1], sys.argv[2]
    print("pass 1: index burned ms")
    c1 = scan(central)
    s1 = scan(source)
    common = sorted(set(c1["ms"]) & set(s1["ms"]))
    step = max(1, len(common) // 60)
    sample = set(common[::step][:60])
    print(f"central: {c1['ok']}/{c1['frames']} decoded, contrast mean {c1['meanContrast']} min {c1['minContrast']}")
    print(f"source : {s1['ok']}/{s1['frames']} decoded, contrast mean {s1['meanContrast']} min {s1['minContrast']}")
    print(f"common burned-ms frames: {len(common)} (of {len(c1['ms'])} central / {len(s1['ms'])} source) — PSNR sample {len(sample)}")
    print("pass 2: extract matched frames")
    c2 = scan(central, keep_ms=sample)
    s2 = scan(source, keep_ms=sample)
    ps = []
    for ms in sorted(sample):
        if ms in c2["kept"] and ms in s2["kept"]:
            ps.append(psnr(c2["kept"][ms], s2["kept"][ms]))
    ps.sort()
    rep = {
        "central": {"file": os.path.basename(central), "bytes": os.path.getsize(central),
                    "decoded": f"{c1['ok']}/{c1['frames']}",
                    "meanContrast": c1["meanContrast"], "minContrast": c1["minContrast"]},
        "source": {"file": os.path.basename(source), "bytes": os.path.getsize(source),
                   "decoded": f"{s1['ok']}/{s1['frames']}",
                   "meanContrast": s1["meanContrast"], "minContrast": s1["minContrast"]},
        "matchedFrames": len(ps),
        "psnrCentralVsSource": {
            "p5": round(ps[int(0.05 * (len(ps) - 1))], 2) if ps else None,
            "p50": round(ps[len(ps) // 2], 2) if ps else None,
            "p95": round(ps[int(0.95 * (len(ps) - 1))], 2) if ps else None,
            "min": round(ps[0], 2) if ps else None,
        },
    }
    print(json.dumps(rep, indent=1))
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "artifacts", "b4-compare.json")
    with open(out, "w") as f:
        json.dump(rep, f, indent=1)
    print("saved ->", out)


if __name__ == "__main__":
    main()
