// Read the burned clock back out of OBS's own composited frame.
//
// This is the check that the encoder is drawing a READABLE picture before any
// network is involved: OBS screenshot -> ffmpeg crops the one sample line ->
// the same decode readBurned() does. A green "streaming" light says nothing
// about whether the row survived; this does.
//
//   node shot.mjs [source]        default: the whole program output
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { ObsClient } from '../obs-docker/control.mjs';
import { ROW, CLOCK_BITS } from '../../demo/shell/pattern.mjs';   // THE one file

const clockBytes = (ms) => { const b = []; for (let i = 5; i >= 0; i--) b.push(Number((BigInt(ms) >> BigInt(i * 8)) & 0xffn)); return b; };

/** readBurned(), against a raw RGB24 row instead of ImageData (RGBA). */
function decodeRow(rgb) {
  const levels = [];
  for (let i = 0; i < ROW.NBLOCKS; i++) {
    let s = 0;
    for (let dx = 6; dx < 14; dx++) s += rgb[(i * ROW.BLOCK_W + dx) * 3 + 1];  // green
    levels.push(s / 8);
  }
  const mn = Math.min(...levels), mx = Math.max(...levels);
  if (mx - mn < 60) return { ms: null, why: `flat row (contrast ${(mx - mn).toFixed(1)} < 60)` };
  const thr = (mn + mx) / 2;
  const bits = levels.map((l) => (l > thr ? 1 : 0));
  let ms = 0; for (let i = 0; i < CLOCK_BITS; i++) ms = ms * 2 + bits[i];
  let ck = 0; for (let i = CLOCK_BITS; i < ROW.NBLOCKS; i++) ck = ck * 2 + bits[i];
  let expect = 0; for (const b of clockBytes(ms)) expect ^= b;
  return expect === ck ? { ms } : { ms: null, why: `checksum ${ck} != ${expect}` };
}

const src = process.argv[2];
const obs = new ObsClient({ eventSubscriptions: 0 });
await obs.connect();

// call() resolves { data, tResp, rttMs } — tResp is epoch ms at the response.
const req = src ? { sourceName: src }
  : { sourceName: (await obs.call('GetSceneList')).data.currentProgramSceneName };
const r = await obs.call('GetSourceScreenshot', { ...req, imageFormat: 'png', imageWidth: 1280, imageHeight: 720 });
const shot = r.data, t1 = r.tResp;

const png = '/tmp/obs-shot.png';
writeFileSync(png, Buffer.from(shot.imageData.split(',')[1], 'base64'));
const y = ROW.Y + ROW.H / 2;
const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', png,
  '-vf', `crop=${ROW.NBLOCKS * ROW.BLOCK_W}:1:${ROW.X}:${y}`,
  '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 24 });

const { ms, why } = decodeRow(raw);
console.log(`source        ${req.sourceName}`);
console.log(`sample line   y=${y}, x=${ROW.X}..${ROW.X + ROW.NBLOCKS * ROW.BLOCK_W}, ${raw.length} bytes`);
if (ms == null) { console.log(`burned clock  UNREADABLE — ${why}`); process.exit(1); }
console.log(`burned clock  ${ms}  (${new Date(ms).toISOString()})`);
console.log(`ws round trip ${r.rttMs.toFixed(1)} ms`);
console.log(`frame age     ${Math.round(t1 - ms)} ms behind THIS Mac's clock (carries the two machines' clock offset — see note)`);
obs.ws.close();
