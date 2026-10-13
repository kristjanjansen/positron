// rig/board/camera-test.mjs: camera.mjs on a laptop, no camera, no Pi, no relay.
//
//   node rig/board/camera-test.mjs
//
// What it grades: the two listings are read right (and a Pi's own codec nodes
// are never taken for a camera), the splitter cuts real encoder output into one
// unit per frame with the keyframes marked, and the room logic starts the
// camera only for a keyed viewer, only after the relay took the board's key,
// and stops it on the last bye and on silence.
// NEGATIVE CONTROLS, named so the bug they catch would fail them: a splitter
// that cut only at SPS (video.mjs's rule) makes one unit per GOP; a room that
// acted before `cam.key.ok` would start the camera for a message the relay
// never vouched for; a room that counted its own echo as a viewer would never
// stop.
// NOT GRADED HERE: that rpicam-vid on the real board makes this stream, that
// the board has a camera at all, and that the relay drops an unkeyed socket's
// messages (that one is graded against the deployed relay by the session's
// gate check, not here).
import { spawnSync } from 'node:child_process';
import { parseRpicamList, parseV4l2Devices, pickCaptureDevice, findCamera, cameraCommand,
  createAccessUnitSplitter, createCameraRoom } from './camera.mjs';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else fail++; console.log(`${c ? 'ok  ' : 'BAD '} ${m}`); };

// ── listings ─────────────────────────────────────────────────────────────
const RPICAM = `Available cameras
-----------------
0 : imx708_wide [4608x2592 10-bit RGGB] (/base/soc/i2c0mux/i2c@1/imx708@1a)
    Modes: 'SRGGB10_CSI2P' : 1536x864 [120.13 fps - (768, 432)/3072x1728 crop]
`;
const cams = parseRpicamList(RPICAM);
ok(cams.length === 1 && cams[0].sensor === 'imx708_wide', 'rpicam: one camera, its sensor read');
ok(parseRpicamList('No cameras available!').length === 0, 'rpicam: "No cameras available!" is no camera');
ok(parseRpicamList(`    Modes: 'SRGGB10_CSI2P' : 1536x864 [120.13 fps]`).length === 0, 'rpicam: a mode line is not a camera');

const V4L2_PI_ONLY = `bcm2835-codec-decode (platform:bcm2835-codec):
\t/dev/video10
\t/dev/video11
\t/dev/video12
\t/dev/video18
\t/dev/video31
\t/dev/media2

bcm2835-isp (platform:bcm2835-isp):
\t/dev/video13
\t/dev/video14
\t/dev/media0

rpivid (platform:rpivid):
\t/dev/video19
\t/dev/media1
`;
ok(pickCaptureDevice(parseV4l2Devices(V4L2_PI_ONLY)) === null, 'v4l2: the Pi\'s own codec, ISP and HEVC nodes are not a camera');
const V4L2_USB = V4L2_PI_ONLY + `
HD Pro Webcam C920 (usb-0000:01:00.0-1.3):
\t/dev/video0
\t/dev/video1
\t/dev/media3
`;
const pick = pickCaptureDevice(parseV4l2Devices(V4L2_USB));
ok(pick?.device === '/dev/video0' && /C920/.test(pick.name), 'v4l2: a USB webcam is found at its first node');

const fake = (map) => (cmd, args) => map[`${cmd} ${args.join(' ')}`] ?? { ok: false, out: '', why: `${cmd} is not installed` };
let f = findCamera({ source: '', runner: fake({ 'rpicam-hello --list-cameras': { ok: true, out: RPICAM } }) });
ok(f.ok && f.kind === 'csi' && f.cmd === 'rpicam-vid', 'find: a CSI camera wins and is driven by rpicam-vid');
f = findCamera({ source: '', runner: fake({
  'rpicam-hello --list-cameras': { ok: false, out: 'No cameras available!' },
  'v4l2-ctl --list-devices': { ok: true, out: V4L2_USB },
  'v4l2-ctl -d /dev/video0 --list-formats': { ok: true, out: "[0]: 'YUYV'\n[1]: 'MJPG' (Motion-JPEG, compressed)" } }) });
ok(f.ok && f.kind === 'usb' && f.inputFormat === 'mjpeg', 'find: no CSI camera, a USB one with MJPEG');
f = findCamera({ source: '', runner: fake({
  'rpicam-hello --list-cameras': { ok: false, out: 'No cameras available!' },
  'v4l2-ctl --list-devices': { ok: true, out: V4L2_PI_ONLY } }) });
ok(!f.ok && /no camera/.test(f.reason) && /lists no camera/.test(f.detail), 'find: none at all says so, with what was asked');

const [c1, a1] = cameraCommand({ kind: 'csi', cmd: 'rpicam-vid' }, { w: 1280, h: 720, fps: 30, bitrate: 1500000, gop: 30 });
ok(c1 === 'rpicam-vid' && a1.includes('--inline') && a1.join(' ').includes('--intra 30') && a1.at(-1) === '-', 'csi: inline headers, a keyframe each GOP, to stdout');
const [, a2] = cameraCommand({ kind: 'usb', device: '/dev/video0', inputFormat: 'mjpeg' }, { w: 1280, h: 720, fps: 30, bitrate: 1500000, gop: 30, hw: true });
ok(a2.join(' ').includes('-f v4l2 -input_format mjpeg') && a2.includes('h264_v4l2m2m'), 'usb: v4l2 in, the hardware encoder out on a Pi 4');
const [, a3] = cameraCommand({ kind: 'usb', device: '/dev/video0' }, { w: 640, h: 480, fps: 30, bitrate: 1e6, gop: 30, hw: false });
ok(a3.includes('libx264') && a3.join(' ').includes('dump_extra=freq=keyframe'), 'usb: libx264 with headers before each keyframe where there is no hardware encoder');

// ── the splitter, on real encoder output ────────────────────────────────
function encode(extra) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=320x240:rate=30',
    '-frames:v', '90', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency',
    '-profile:v', 'baseline', '-bf', '0', '-g', '30', ...extra, '-f', 'h264', '-'], { maxBuffer: 64 << 20 });
  return r.status === 0 ? r.stdout : null;
}
const stream = encode(['-bsf:v', 'dump_extra=freq=keyframe']);
if (!stream) console.log('skip the splitter on real output: no ffmpeg with libx264 on this machine');
else {
  const cut = (buf, step, mk = createAccessUnitSplitter) => {
    const units = [];
    const s = mk((u, k) => units.push({ u, k }));
    for (let i = 0; i < buf.length; i += step) s(buf.subarray(i, i + step));
    s(Buffer.from([0, 0, 0, 1, 9, 0xf0]));    // an AUD to flush the last frame
    return units;
  };
  for (const step of [188, 4096, 65536]) {
    const u = cut(stream, step);
    ok(u.length === 90, `splitter, ${step} byte chunks: 90 frames in, ${u.length} units out`);
    ok(u.filter((x) => x.k).length === 3, `splitter, ${step} byte chunks: 3 keyframes marked (${u.filter((x) => x.k).length})`);
  }
  const first = cut(stream, 4096)[0].u;
  ok((first[4] & 0x1f) === 7, 'splitter: the first unit opens on the SPS a decoder needs');
  // Every keyframe unit carries its own SPS, so a late joiner can start there.
  const keyed = cut(stream, 4096).filter((x) => x.k);
  ok(keyed.every((x) => (x.u[4] & 0x1f) === 7), 'splitter: every keyframe unit begins with an SPS (dump_extra)');
  const audStream = encode(['-bsf:v', 'h264_metadata=aud=insert']);
  if (audStream) ok(cut(audStream, 4096).length === 90, 'splitter: an encoder that writes access unit delimiters, still 90 units');
  // NEGATIVE CONTROL: cutting at SPS only, video.mjs's rule, is wrong for this stream.
  const spsOnly = (onUnit) => { let b = Buffer.alloc(0); return (c) => {
    b = Buffer.concat([b, c]); const at = [];
    for (let i = 0; i + 4 < b.length; i++) if (b[i] === 0 && b[i + 1] === 0 && b[i + 2] === 0 && b[i + 3] === 1 && (b[i + 4] & 0x1f) === 7) at.push(i);
    for (let i = 0; i + 1 < at.length; i++) onUnit(b.subarray(at[i], at[i + 1]), true);
    if (at.length) b = b.subarray(at.at(-1)); }; };
  ok(cut(stream, 4096, spsOnly).length < 10, 'negative control: an SPS-only splitter makes one unit per GOP on this stream');
}

// ── the room ─────────────────────────────────────────────────────────────
class FakeWS {
  static last = null;
  constructor(url) { this.url = url; this.readyState = 0; this.sent = []; this.bufferedAmount = 0; FakeWS.last = this;
    queueMicrotask(() => { this.readyState = 1; this.onopen?.(); }); }
  send(d) { this.sent.push(d); }
  close() { this.readyState = 3; this.onclose?.({ code: 1000 }); }
  hear(m) { this.onmessage?.({ data: JSON.stringify(m) }); }
  texts() { return this.sent.filter((d) => typeof d === 'string').map((d) => JSON.parse(d)); }
}
let clock = 1_000_000;
const started = [], stopped = [];
const fakeStart = (cam, opts) => {
  const h = { ok: true, w: 1280, h: 720, fps: 30, bitrate: 1500000, gop: 30, stats: () => ({ frames: 3, bytes: 30, keys: 1 }),
    stop: () => stopped.push(clock), frame: (k) => opts.onFrame(new Uint8Array([0, 0, 0, 1, k ? 0x65 : 0x41]), k) };
  started.push(h); return h;
};
const tick = (ms) => { clock += ms; };
const room = createCameraRoom({ relay: 'wss://x', room: 'studio-1-cam', key: 'k'.repeat(64), WS: FakeWS,
  find: () => ({ ok: true, kind: 'test', name: 'test' }), start: fakeStart, now: () => clock, log: () => {} });
await new Promise((r) => setTimeout(r, 0));
const ws = FakeWS.last;
ok(ws.url === 'wss://x/room/studio-1-cam/ws' && !ws.url.includes('k'.repeat(8)), 'room: joins <room>-cam, and the key is not in the URL');
ok(ws.texts()[0]?.type === 'cam.key' && ws.texts()[0].key === 'k'.repeat(64), 'room: the first message proves the key');
ws.hear({ type: 'cam.watching', from: 'page-1' });
ok(started.length === 0, 'negative control: a viewer heard before the relay took the key starts nothing');
ws.hear({ type: 'cam.key.ok' });
ws.hear({ type: 'cam.watching', from: room.status && FakeWS.last.texts()[0].from });
ok(started.length === 0, 'room: its own echo is not a viewer');
ws.hear({ type: 'cam.watching', from: 'page-1' });
ok(started.length === 1 && room.running(), 'room: a keyed viewer starts the camera');
ok(ws.texts().some((m) => m.type === 'cam.started' && m.codec && m.w === 1280), 'room: says cam.started with the shape a decoder needs');
started[0].frame(true); started[0].frame(false);
const bins = ws.sent.filter((d) => typeof d !== 'string');
ok(bins.length === 2 && bins[0].readUInt32LE(0) === 0 && bins[0].readUInt32LE(4) === 1 && bins[1].readUInt32LE(0) === 1 && bins[1].readUInt32LE(4) === 0,
  'room: frames go out with the counter and the keyframe bit, board-video.mjs\'s header');
ws.hear({ type: 'cam.watching', from: 'page-2' });
ws.hear({ type: 'cam.bye', from: 'page-1' });
ok(room.running(), 'room: one viewer leaving keeps it on for the other');
ws.hear({ type: 'cam.bye', from: 'page-2' });
ok(!room.running() && stopped.length === 1, 'room: the last bye stops it');
ws.hear({ type: 'cam.watching', from: 'page-3' });
ok(room.running() && started.length === 2, 'room: a new viewer starts it again');
tick(30_000);
await new Promise((r) => setTimeout(r, 5200));
ok(!room.running() && stopped.length === 2, 'room: silence past CAM_IDLE_MS stops it');
ws.hear({ type: 'cam.watching', from: 'page-4' });
ws.close();
ok(!room.running(), 'room: losing the room stops the camera');
room.stop();
const off = createCameraRoom({ relay: 'wss://x', room: 'r-cam', key: '', WS: FakeWS, log: () => {} });
ok(off.enabled === false && !off.running(), 'room: no key set, nothing joined and nothing started');

console.log(`\n${pass} ok, ${fail} bad`);
process.exit(fail ? 1 : 0);
