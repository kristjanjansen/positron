// A stand-in for the board's picture with the renderer's cold start modelled.
// Throwaway, scratchpad only. Starts the repo's fake relay, joins studio-1 as a
// board answering video.status/start/params/shader the way board.mjs and
// rig/board/video.mjs do, and streams a pre-encoded H.264 loop into
// studio-1-video framed as sendFrame() frames it.
//
// The cold start: `video.started` answers at once; the "render loop" begins
// COLD_MS later. Lines written to the renderer queue in a pipe and are drained
// once per frame only while the loop runs (v3dpipe's drain_stdin). A shader
// waits 1500 ms for its verdict and is refused "the renderer did not answer"
// otherwise, exactly as video.mjs; a refused line is still drained later.
import { execFileSync } from 'node:child_process';
import path from "node:path";
const REPO = path.resolve(import.meta.dirname, "../../..");
const { startRelay } = await import(`${REPO}/demo/fake-relay.mjs`);
const { format } = await import(`${REPO}/demo/shell/wire.mjs`);

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
const COLD_MS = arg('cold', 2500);
const PORT = arg('port', 0);
const t0 = Date.now();
const say = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(2)}]`, ...a);

const h264 = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=30',
  '-t', '4', '-c:v', 'libx264', '-profile:v', 'baseline', '-level', '3.0', '-bf', '0', '-g', '30', '-pix_fmt', 'yuv420p',
  '-x264-params', 'aud=1:repeat-headers=1', '-f', 'h264', '-'], { maxBuffer: 64 << 20 });
// cut at every access unit delimiter (NAL 9)
const starts = [];
for (let i = 0; i + 4 < h264.length; i++) {
  if (h264[i] === 0 && h264[i + 1] === 0 && h264[i + 2] === 0 && h264[i + 3] === 1 && (h264[i + 4] & 0x1f) === 9) starts.push(i);
}
starts.push(h264.length);
const units = [];
for (let k = 0; k + 1 < starts.length; k++) {
  const u = h264.subarray(starts[k], starts[k + 1]);
  let key = false;
  for (let i = 0; i + 4 < u.length; i++) if (u[i] === 0 && u[i + 1] === 0 && u[i + 2] === 1 && (u[i + 3] & 0x1f) === 5) { key = true; break; }
  units.push({ u, key });
}

const relay = startRelay({ port: PORT, quiet: true });
await new Promise((r) => (relay.server ?? relay).once?.('listening', r) ?? setTimeout(r, 300));
const port = (relay.server ?? relay).address().port;
say(`relay ws://127.0.0.1:${port}, ${units.length} frames (${units.filter((x) => x.key).length} key), cold start ${COLD_MS} ms`);

const FROM = 'standin-board';
let seq = 0;
const ws = new WebSocket(`ws://127.0.0.1:${port}/room/studio-1/ws`);
const send = (m) => ws.send(format(m, { from: FROM, seq: seq++ }));
let vws = null, running = false, loopAt = 0, timer = null, vseq = 0, f = 0;
const pipe = [];
let pendingShader = null;
const counts = { shaderAsked: 0, okInTime: 0, refusedTimeout: 0, compiledLate: 0, compiled: 0, paramsDrained: 0 };
function drain() {
  while (pipe.length) {
    const l = pipe.shift();
    if (l.kind === 'shader') {
      counts.compiled++;
      if (pendingShader) { counts.okInTime++; pendingShader({ ok: true, detail: 'compiled, fading in' }); say('renderer: SHADER-OK (a waiter heard it)'); }
      else { counts.compiledLate++; say('renderer: SHADER-OK with nobody waiting, the board already answered'); }
    } else { counts.paramsDrained++; say(`renderer: ${l.line}`); }
  }
}
function startLoop() {
  vws = new WebSocket(`ws://127.0.0.1:${port}/room/studio-1-video/ws`);
  running = true; loopAt = Date.now() + COLD_MS; vseq = 0; f = 0;
  timer = setInterval(() => {
    if (Date.now() < loopAt || vws.readyState !== 1) return;
    drain();
    const { u, key } = units[f++ % units.length];
    const out = Buffer.allocUnsafe(8 + u.length);
    out.writeUInt32LE(vseq++, 0); out.writeUInt32LE(key ? 1 : 0, 4); u.copy(out, 8);
    vws.send(out);
    if (vseq === 1) say('renderer: first frame out');
  }, 1000 / 30);
}
function stopLoop() { clearInterval(timer); running = false; try { vws?.close(); } catch {} pipe.length = 0; }
const shape = () => ({ room: 'studio-1-video', w: 640, h: 360, fps: 30, codec: 'avc1.42E01E', renderer: 'V3D 4.2 (stand-in)' });

ws.onmessage = async (e) => {
  if (typeof e.data !== 'string') return;
  let m; try { m = JSON.parse(e.data); } catch { return; }
  if (m.from === FROM) return;
  const reply = (type, body) => send({ type, re: m.id, ...body });
  switch (m.type) {
    case 'video.status': say('asked video.status'); return reply('video.started', running ? { ok: true, already: true, ...shape() } : { ok: false, available: true, reason: 'not drawing' });
    case 'video.start': say('asked video.start'); if (!running) startLoop(); return reply('video.started', { ok: true, ...shape() });
    case 'video.params': pipe.push({ kind: 'set', line: `seg ${m.mirrors}` }); say(`asked video.params mirrors ${m.mirrors}`); return reply('video.params', { ok: true, paramsSent: 1, mirrors: m.mirrors });
    case 'video.shader': {
      counts.shaderAsked++;
      say(`asked video.shader, ${m.body?.length} bytes, the loop is ${running && Date.now() >= loopAt ? 'running' : 'not running yet'}`);
      const v = await new Promise((res) => {
        pendingShader = (x) => { pendingShader = null; res(x); };
        setTimeout(() => { if (pendingShader) { pendingShader = null; counts.refusedTimeout++; res({ ok: false, reason: 'the renderer did not answer' }); } }, 1500);
        pipe.push({ kind: 'shader' });
      });
      say(`answered video.shader.applied ok=${v.ok}${v.reason ? ` (${v.reason})` : ''}`);
      return reply('video.shader.applied', v.ok ? { ok: true, bytes: m.body.length, detail: v.detail } : v);
    }
    case 'video.stop': say('asked video.stop'); stopLoop(); return reply('video.stopped', { ok: true });
    default: return;
  }
};
ws.onopen = () => say('board joined studio-1');
process.on('SIGTERM', () => { say('COUNTS', JSON.stringify(counts)); process.exit(0); });
process.on('SIGINT', () => { say('COUNTS', JSON.stringify(counts)); process.exit(0); });
setInterval(() => {}, 1 << 30);
