#!/usr/bin/env python3
"""Live source for the §12 mediamtx chain test (stands in for OBS's compositor).

Emits, paced to wall clock:
  - rawvideo rgb24 1280x720@30 on stdout: gray bg, moving block, and the rig's
    56-block burned-ms binary row (48-bit wall ms + 8-bit XOR checksum) at
    ROW_X=40, ROW_Y=100, ROW_H=80, BLOCK_W=20 (byte-identical geometry to
    rig/whep/publish.html and every §7-§10 player).
  - f32le stereo 48k audio into a FIFO (argv[1]): §10 signal design — 4-note
    background loop (330/392/440/494 Hz, 250 ms each, amp 0.08) + 6 ms 2 kHz
    tick at amp 0.9 whenever wall ms crosses a 500 ms boundary. The player
    recovers a tick's true wall time as the nearest 500 ms boundary (valid
    while end-to-end latency < 250 ms — localhost is far under).
"""
import math
import os
import struct
import sys
import threading
import time

W, H, FPS = 1280, 720, 30
NBLOCKS, BLOCK_W, ROW_X, ROW_Y, ROW_H = 56, 20, 40, 100, 80
SR, CH = 48000, 2
A_CHUNK = 960  # 20 ms

fifo_path = sys.argv[1] if len(sys.argv) > 1 else None

frame = bytearray(b"\x50" * (W * H * 3))  # gray background
# static label strip (dark) so the encoder has some structure
for y in range(300, 340):
    frame[(y * W + 100) * 3:(y * W + 500) * 3] = b"\x20\x28\x30" * 400

white = b"\xff\xff\xff" * BLOCK_W
black = b"\x00\x00\x00" * BLOCK_W

def draw_row(ms):
    bits = []
    v = ms
    bytes6 = [(v >> (8 * i)) & 0xFF for i in range(5, -1, -1)]
    ck = 0
    for b in bytes6:
        ck ^= b
    for i in range(47, -1, -1):
        bits.append((ms >> i) & 1)
    for i in range(7, -1, -1):
        bits.append((ck >> i) & 1)
    line = b"".join(white if b else black for b in bits)
    for y in range(ROW_Y, ROW_Y + ROW_H):
        off = (y * W + ROW_X) * 3
        frame[off:off + len(line)] = line

BLOCK = 60
prev_bx = None
def draw_motion(t):
    global prev_bx
    bx = 100 + int((math.sin(t * 1.3) * 0.5 + 0.5) * (W - 300))
    for y in range(500, 500 + BLOCK):
        if prev_bx is not None:
            off = (y * W + prev_bx) * 3
            frame[off:off + BLOCK * 3] = b"\x50" * (BLOCK * 3)
    for y in range(500, 500 + BLOCK):
        off = (y * W + bx) * 3
        frame[off:off + BLOCK * 3] = b"\xc8\x40\x40" * BLOCK
    prev_bx = bx

NOTES = [330.0, 392.0, 440.0, 494.0]
TICK_LEN = int(0.006 * SR)  # 6 ms

def gen_audio(sample_idx, n, epoch_ms):
    """n frames of stereo f32; sample_idx counts from stream start at epoch_ms."""
    out = bytearray(n * CH * 4)
    for i in range(n):
        t_ms = epoch_ms + (sample_idx + i) * 1000.0 / SR
        t = (sample_idx + i) / SR
        note = NOTES[int(t_ms / 250.0) % 4]
        s = 0.08 * math.sin(2 * math.pi * note * t)
        into_tick = t_ms % 500.0
        if into_tick < (TICK_LEN * 1000.0 / SR):
            s += 0.9 * math.sin(2 * math.pi * 2000.0 * t)
        struct.pack_into("<ff", out, i * 8, s, s)
    return bytes(out)

def audio_thread():
    """Opens the FIFO (blocks until ffmpeg opens the read end — which happens
    only after ffmpeg has probed the video pipe, hence the separate thread),
    then feeds wall-anchored audio like a capture device (§10 design)."""
    aout = open(fifo_path, "wb", buffering=0)
    epoch = time.time()
    epoch_ms = epoch * 1000.0
    aidx = 0
    while True:
        want = int((time.time() - epoch + 0.04) * SR)  # stay 40 ms ahead
        while aidx < want:
            n = min(A_CHUNK, want - aidx)
            aout.write(gen_audio(aidx, n, epoch_ms))
            aidx += n
        time.sleep(0.01)


def main():
    vout = os.fdopen(sys.stdout.fileno(), "wb", buffering=0)
    if fifo_path:
        threading.Thread(target=audio_thread, daemon=True).start()

    epoch = time.time()
    fidx = 0
    while True:
        target = epoch + fidx / FPS
        now = time.time()
        if now < target:
            time.sleep(target - now)
        ms = int(time.time() * 1000)
        draw_row(ms)
        draw_motion(fidx / FPS)
        vout.write(frame)
        fidx += 1

if __name__ == "__main__":
    try:
        main()
    except (BrokenPipeError, KeyboardInterrupt):
        pass
