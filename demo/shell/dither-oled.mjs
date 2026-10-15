// demo/shell/dither-oled.mjs: a greyscale picture to the 0.96" OLED's one bit, 1024 byte frame.
// Pure, no DOM: rig/board/screen-camera.mjs runs it on the Pi, and a page or a test can run it too.
// why: lessons/rig-board-panel.md#screen-camera

export const W = 128, H = 64, FRAME_BYTES = (W * H) / 8;

// Ordered 4x4 Bayer, not error diffusion: each pixel is decided alone, so a still scene stays still
// under camera noise. why: lessons/rig-board-panel.md#screen-camera-dither
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/**
 * The 2nd and 98th percentile of a greyscale picture, the range `dither` stretches to full scale.
 * A one bit picture of a dim room is otherwise all dark.
 */
export function levels(gray, lo = 0.02, hi = 0.98) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const n = gray.length, a = n * lo, b = n * hi;
  let acc = 0, min = 0, max = 255, seenMin = false;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (!seenMin && acc > a) { min = v; seenMin = true; }
    if (acc >= b) { max = v; break; }
  }
  return max - min < 16 ? { min: Math.max(0, min - 8), max: Math.min(255, min + 8) } : { min, max };
}

/** 128x64 greyscale (one byte a pixel, row major) to 1024 bytes page major: byte = 8 pixels down, bit 0 on top. */
export function ditherFrame(gray, { stretch = true, out = new Uint8Array(FRAME_BYTES) } = {}) {
  if (gray.length < W * H) throw new Error(`dither-oled: ${gray.length} bytes is not a ${W}x${H} picture`);
  out.fill(0);
  const { min, max } = stretch ? levels(gray) : { min: 0, max: 255 };
  const k = 255 / Math.max(1, max - min);
  for (let y = 0; y < H; y++) {
    const row = y * W, page = (y >> 3) * W, bit = 1 << (y & 7), by = (y & 3) << 2;
    for (let x = 0; x < W; x++) {
      const v = (gray[row + x] - min) * k;
      // threshold (t + 0.5) / 16 of full scale, so mid grey lights half the pixels
      if (v > (BAYER4[by | (x & 3)] + 0.5) * 16) out[page + x] |= bit;
    }
  }
  return out;
}

/** Lit pixels in a frame, 0 to 8192. */
export function litCount(frame) {
  let n = 0;
  for (let i = 0; i < frame.length; i++) { let b = frame[i]; while (b) { n += b & 1; b >>= 1; } }
  return n;
}

/** A frame as text for a terminal, one character per `step` by `step` block: ' ' none lit to '#' all lit. */
export function frameAscii(frame, step = 2) {
  const INK = ' .:o#', lines = [];
  for (let y = 0; y < H; y += step) {
    let s = '';
    for (let x = 0; x < W; x += step) {
      let n = 0;
      for (let j = 0; j < step; j++) for (let i = 0; i < step; i++) n += (frame[((y + j) >> 3) * W + x + i] >> ((y + j) & 7)) & 1;
      s += INK[Math.round((n / (step * step)) * (INK.length - 1))];
    }
    lines.push(s);
  }
  return lines.join('\n');
}
