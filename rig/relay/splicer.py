#!/usr/bin/env python3
"""Packet-aligned MPEG-TS source splicer for the gapless relay.

Source priority:  encoder (via mediamtx)  >  webcam  >  slate.
The uplink's Cloudflare socket never closes; sources swap beneath it.

Correctness rules (each one earned by a measured failure):
  * forward only whole 188-byte TS packets — a torn packet wedges the
    downstream decoder into permanent gray;
  * after every switch, gate output until the video PID carries an RAI
    (random-access indicator) so the decoder starts on a clean keyframe;
  * a webcam that dies within 3 s of spawn is benched for 60 s — no flapping.

Env:  SPLICER_WEBCAM=0 disables the webcam tier; SPLICER_CAM_INDEX picks the
avfoundation device (default 0). Webcam audio is intentionally silent
(anullsrc) — venue audio via an open laptop mic is a feedback hazard.

Usage:  splicer.py > FIFO   (see gapless.sh)
"""
import json
import os
import select
import signal
import subprocess
import sys
import time
import urllib.request

FF = "/opt/homebrew/opt/ffmpeg@7/bin/ffmpeg"
API = "http://127.0.0.1:9997/v3/paths/get/rig"
PKT = 188
FONT = "/System/Library/Fonts/Supplemental/Courier New Bold.ttf"
CAM = os.environ.get("SPLICER_CAM_INDEX", "0")
WEBCAM_ENABLED = os.environ.get("SPLICER_WEBCAM", "1") != "0"
WEBCAM_COOLDOWN = 60.0

OVERLAY = (
    f"drawtext=fontfile={FONT}:textfile=/tmp/overlay.txt:reload=30:fontsize=44:"
    "fontcolor=0x8fd4dd:x=(w-text_w)/2:y=h-120"
)

# Millisecond wall clock burned into every source leg: the ground truth for
# perception-lag measurement travels in the pixels themselves.
# %T.%3N = HH:MM:SS.mmm from ONE clock (localtime). The previous
# %{localtime:%H:%M:%S}.%{eif:mod(t*1000,1000)} form was doubly broken:
# over-escaped colons made localtime see 3 args -> drawtext rendered NOTHING,
# and the eif ms field was stream-time, not wall-clock (±1 s bimodal error).
CLOCK = (
    f"drawtext=fontfile={FONT}:"
    r"text='%{localtime\:%T.%3N}':"
    "x=20:y=20:fontsize=48:fontcolor=black:box=1:boxcolor=white:boxborderw=10"
)

ENC = [
    "-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency",
    "-profile:v", "main", "-b:v", "3000k", "-g", "60", "-keyint_min", "60",
    "-bf", "0", "-sc_threshold", "0", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
    "-f", "mpegts", "-muxdelay", "0", "pipe:1",
]


def log(msg):
    print(f"{time.strftime('%H:%M:%S')} splicer: {msg}", file=sys.stderr, flush=True)


def rig_ready():
    try:
        with urllib.request.urlopen(API, timeout=1) as r:
            return json.load(r).get("ready") is True
    except Exception:
        return False


def spawn_live(off):
    # RTMP pull, not RTSP: ffmpeg's RTSP demuxer holds A+V output until it has
    # RTCP sender reports for BOTH streams (~11.6 s measured against mediamtx),
    # which outlives the 6 s warm-up grace — the live tier starve-looped and
    # never engaged. RTMP carries per-message timestamps: first byte in 2.4 s.
    return subprocess.Popen(
        [FF, "-hide_banner", "-loglevel", "error",
         "-i", "rtmp://localhost:1935/rig",
         "-c", "copy", "-output_ts_offset", off,
         "-f", "mpegts", "-muxdelay", "0", "pipe:1"],
        stdout=subprocess.PIPE)


def spawn_webcam(off):
    vf = f"format=yuv420p,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,{OVERLAY},{CLOCK}"
    return subprocess.Popen(
        [FF, "-hide_banner", "-loglevel", "error",
         "-f", "avfoundation", "-framerate", "30", "-video_size", "1280x720",
         "-pix_fmt", "uyvy422", "-i", f"{CAM}:none",
         "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
         "-vf", vf, "-output_ts_offset", off, *ENC],
        stdout=subprocess.PIPE)


def spawn_slate(off):
    src = (
        "color=c=0x101820:size=1280x720:rate=30,"
        f"drawtext=fontfile={FONT}:text='TEHNILINE PAUS':fontsize=64:fontcolor=white:"
        "x=(w-text_w)/2:y=(h-text_h)/2-60,"
        f"drawtext=fontfile={FONT}:textfile=/tmp/overlay.txt:reload=30:fontsize=44:"
        "fontcolor=0x8fd4dd:x=(w-text_w)/2:y=(h-text_h)/2+40,"
        + CLOCK
    )
    return subprocess.Popen(
        [FF, "-hide_banner", "-loglevel", "error", "-re",
         "-f", "lavfi", "-i", src,
         "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
         "-output_ts_offset", off, *ENC],
        stdout=subprocess.PIPE)


def has_rai(pkt):
    if pkt[0] != 0x47:
        return False
    afc = (pkt[3] >> 4) & 0x3
    if afc in (2, 3) and pkt[4] > 0:
        return bool(pkt[5] & 0x40)
    return False


def read_pcr(pkt):
    """PCR in seconds if this packet carries one, else None."""
    if pkt[0] != 0x47:
        return None
    afc = (pkt[3] >> 4) & 0x3
    if afc in (2, 3) and pkt[4] >= 7 and (pkt[5] & 0x10):
        base = (pkt[6] << 25) | (pkt[7] << 17) | (pkt[8] << 9) | (pkt[9] << 1) | (pkt[10] >> 7)
        return base / 90000.0
    return None


class Bench:
    """Remembers when the webcam last failed fast, to avoid flapping."""
    until = 0.0

    @classmethod
    def ok(cls):
        return WEBCAM_ENABLED and time.time() >= cls.until

    @classmethod
    def fail(cls):
        cls.until = time.time() + WEBCAM_COOLDOWN
        log(f"webcam benched for {WEBCAM_COOLDOWN:.0f}s")


def pick():
    """Choose the best available tier right now."""
    if rig_ready():
        return "live"
    if Bench.ok():
        return "webcam"
    return "slate"


def should_switch(tier):
    """True when a better (or the correct) tier differs from the current one."""
    return pick() != tier


STARVE_TIMEOUT = 2.0


def stream(tier, proc, out, state):
    """Forward packets; returns when the source ends, starves, or a better
    tier appears. Tracks the last forwarded PCR in state['pcr'] so the next
    leg can continue the media timeline exactly where this one stopped."""
    gated = True
    buf = b""
    start = time.time()
    last_data = time.time()
    last_check = 0.0
    fd = proc.stdout.fileno()
    os.set_blocking(fd, False)
    while True:
        ready, _, _ = select.select([fd], [], [], 0.5)
        now = time.time()
        if ready:
            chunk = os.read(fd, PKT * 64)
            if not chunk:
                # a webcam that dies fast OR never delivered a keyframe is
                # benched — otherwise a dead camera is retried forever
                if tier == "webcam" and (gated or now - start < 3.0):
                    Bench.fail()
                log(f"{tier}: source EOF")
                return
            last_data = now
            buf += chunk
            n = len(buf) // PKT * PKT
            block, buf = buf[:n], buf[n:]
            if gated:
                for i in range(0, len(block), PKT):
                    if has_rai(block[i:i + PKT]):
                        block = block[i:]
                        gated = False
                        log(f"{tier}: RAI found — output ungated")
                        break
                else:
                    block = b""
            if block:
                # remember the furthest media position we have delivered
                for i in range(len(block) - PKT, -1, -PKT):
                    pcr = read_pcr(block[i:i + PKT])
                    if pcr is not None:
                        state["pcr"] = pcr
                        break
                out.write(block)
                out.flush()
        elif now - last_data > STARVE_TIMEOUT and (not gated or now - start > 6.0):
            # a fresh, still-gated source gets a 6 s warm-up before starvation
            # applies (RTSP connect + first keyframe legitimately take ~3 s)
            # connection open but no data: dead publisher behind a live socket.
            # Absence of data is a switch trigger (measured: a starved RTSP
            # session blocked the old blocking-read loop for 17 minutes).
            if tier == "webcam" and (gated or now - start < 3.0 + STARVE_TIMEOUT):
                Bench.fail()
            log(f"{tier}: starved >{STARVE_TIMEOUT}s, switching")
            return
        if now - last_check > 0.5:
            last_check = now
            if should_switch(tier):
                log(f"{tier}: better tier available, switching")
                return


def main():
    out = sys.stdout.buffer
    signal.signal(signal.SIGCHLD, signal.SIG_IGN)
    spawners = {"live": spawn_live, "webcam": spawn_webcam, "slate": spawn_slate}
    # One continuously ascending MEDIA timeline across every splice: each new
    # leg starts just past the last PCR actually delivered. Wall-clock offsets
    # are wrong under starvation (measured: a 17-minute starved source pushed
    # the next leg ~1000 s ahead of the uplink -> discontinuity storm), and
    # backward jumps are equally fatal. PCR is the ground truth.
    state = {"pcr": 0.0}
    while True:
        tier = pick()
        off = f"{state['pcr'] + 0.1:.3f}"
        log(f"{tier.upper()} (ts_offset {off}s)")
        proc = spawners[tier](off)
        try:
            stream(tier, proc, out, state)
        except BrokenPipeError:
            log("uplink gone, exiting")
            proc.kill()
            return
        finally:
            try:
                proc.kill()
            except Exception:
                pass
        time.sleep(0.2)


if __name__ == "__main__":
    main()
