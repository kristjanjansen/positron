// Pull frames from the live LL-HLS edge and read the burned clock back out.
//
// "947 frames encoded, 0 skipped" says the encoder ran. It does NOT say the
// picture is readable at the other end — that is the green-suite trap this
// project has paid for twice. A decoded checksum is the only thing that proves
// the row survived encode -> CDN -> decode.
//
//   node read-hls.mjs <m3u8> [frames]
import { execFileSync } from 'node:child_process';
import { ROW, CLOCK_BITS } from '../../demo/shell/pattern.mjs';

const clockBytes = (ms) => { const b = []; for (let i = 5; i >= 0; i--) b.push(Number((BigInt(ms) >> BigInt(i * 8)) & 0xffn)); return b; };

function decode(rgb, off) {
  const lv = [];
  for (let i = 0; i < ROW.NBLOCKS; i++) {
    let s = 0; for (let dx = 6; dx < 14; dx++) s += rgb[off + (i * ROW.BLOCK_W + dx) * 3 + 1];
    lv.push(s / 8);
  }
  const mn = Math.min(...lv), mx = Math.max(...lv);
  if (mx - mn < 60) return null;
  const thr = (mn + mx) / 2, bits = lv.map((l) => (l > thr ? 1 : 0));
  let ms = 0; for (let i = 0; i < CLOCK_BITS; i++) ms = ms * 2 + bits[i];
  let ck = 0; for (let i = CLOCK_BITS; i < ROW.NBLOCKS; i++) ck = ck * 2 + bits[i];
  let e = 0; for (const b of clockBytes(ms)) e ^= b;
  return e === ck ? ms : null;
}

const [url, nArg] = process.argv.slice(2);
const n = Number(nArg || 20);
const W = ROW.NBLOCKS * ROW.BLOCK_W, y = ROW.Y + ROW.H / 2;

// Scale to the 1280 grid first: the edge serves several renditions and
// readBurned samples FIXED coordinates, so a 640-wide frame reads as absent.
const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', url, '-frames:v', String(n),
  '-vf', `scale=1280:720:flags=neighbor,crop=${W}:1:${ROW.X}:${y}`,
  '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 26 });

const stride = W * 3;
const got = [];
for (let f = 0; f * stride < raw.length; f++) { const ms = decode(raw, f * stride); if (ms) got.push(ms); }

const frames = Math.floor(raw.length / stride);
console.log(`frames    ${frames} pulled, ${got.length} with a readable row (${(100 * got.length / frames).toFixed(0)}%)`);
if (!got.length) { console.log('row       UNREADABLE in every frame'); process.exit(1); }
console.log(`burned    ${new Date(got[0]).toISOString()} .. ${new Date(got.at(-1)).toISOString()}`);
console.log(`span      ${got.at(-1) - got[0]} ms of source time across ${got.length} frames`);
console.log(`age now   ${Date.now() - got.at(-1)} ms behind THIS machine's clock (includes any clock offset to the encoder)`);
