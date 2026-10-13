// rig/board/camera.mjs: the Pi's own camera, sent only to holders of a key.
//
// Asked 2026-10-13: *"add pi camera to https://positron.studio/concepts/remote/010/.
// url secret parameter to enable (key in cf secrets)"*. The picture of the
// Circuit, from a camera on the Raspberry Pi it is plugged into, shown on the
// Circuit page only when the page's URL carries the key.
//
// WHO CAN TURN THE CAMERA ON. Only somebody in the room `<room>-cam` on the
// relay, and the relay lets a socket in that room speak or hear nothing until
// its first message carries the key that matches the Cloudflare secret
// `PI_CAM_KEY` (workers/relay/src/index.js, `CAM_ROOM`). The board joins that
// room with the same key from its own environment (`BOARD_CAM_KEY` in
// /etc/default/positron-board) and starts the camera only on a `cam.watching`
// heard there. Nothing on the board's ordinary room can start it: there is no
// camera verb in board.mjs's `handle()`, on purpose, because that room is
// tokenless and anybody can speak in it.
//
// WHEN IT STOPS. Every viewer says `cam.watching` every ten seconds while its
// tab is visible, and `cam.bye` when it stops or leaves. The camera stops on the
// last `cam.bye`, or `CAM_IDLE_MS` after the last `cam.watching` from anybody,
// whichever comes first, and when the board loses the room. A socket count is
// not used, for the reason board.mjs gives at `watchVideoViewers`: the relay
// reported seven sockets in a room nobody was watching.
//
// WHAT IS SENT. The same frame the shader picture uses (demo/shell/board-video.mjs):
// a uint32 LE counter, a uint32 LE flag word with bit 0 on a keyframe, then one
// H.264 access unit in Annex B. So the page decodes it with `createBoardVideo`.
// Text in the room is plain JSON: `cam.started`, `cam.refused`, `cam.stopped`,
// `cam.tick` (the counter and the board's clock once a second, for a delay
// estimate) and `cam.pong`.
//
// ⚠️ THE HARDWARE ENCODER IS SHARED WITH THE SHADER PICTURE. On a Pi 4
// `rpicam-vid` encodes on /dev/video11, which is the device `video.mjs` holds for
// /concepts/remote/050/. Two users of it do not fail, they block (video.mjs
// says so at length), so each refuses while the other runs.
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

/** No `cam.watching` from anybody for this long, and the camera stops. */
export const CAM_IDLE_MS = 25_000;
/** What the page is told to configure its decoder with. Baseline, as every source below is asked for. */
export const CAM_CODEC = 'avc1.42E01F';
/** Over this many bytes queued on the socket, delta frames are dropped until the next keyframe. */
const BACKLOG_BYTES = 2 << 20;

const run = (cmd, args, timeout = 6000) => {
  try {
    const r = spawnSync(cmd, args, { encoding: 'utf8', timeout });
    if (r.error) return { ok: false, out: '', why: r.error.code === 'ENOENT' ? `${cmd} is not installed` : String(r.error.message) };
    return { ok: r.status === 0, out: `${r.stdout || ''}\n${r.stderr || ''}`, status: r.status };
  } catch (e) { return { ok: false, out: '', why: String(e.message) }; }
};

/**
 * `rpicam-hello --list-cameras`, read. A line per camera:
 *   `0 : imx708 [4608x2592 10-bit RGGB] (/base/soc/i2c0mux/i2c@1/imx708@1a)`
 * and `No cameras available!` when there is none.
 */
export function parseRpicamList(text) {
  const out = [];
  for (const line of String(text).split('\n')) {
    const m = line.match(/^\s*(\d+)\s*:\s*(\S+)\s*\[([^\]]*)\]\s*(\(.*\))?/);
    if (m) out.push({ index: +m[1], sensor: m[2], mode: m[3].trim(), path: (m[4] || '').replace(/^\(|\)$/g, '') });
  }
  return out;
}

/**
 * `v4l2-ctl --list-devices`, read: a name line ending in a colon, then the
 * device nodes indented under it.
 */
export function parseV4l2Devices(text) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).split('\n')) {
    if (!line.trim()) continue;
    if (/^\S/.test(line)) { cur = { name: line.replace(/:\s*$/, '').trim(), devices: [] }; blocks.push(cur); }
    else if (cur) cur.devices.push(line.trim());
  }
  return blocks;
}

/**
 * The Pi's own codec, ISP and CSI receiver nodes are video devices too, and
 * none of them is a camera you can open with `-f v4l2`. A USB camera is the
 * block left when they are taken out.
 */
const NOT_A_CAMERA = /bcm2835-codec|bcm2835-isp|rpi-hevc|hevc-dec|pispbe|rp1-cfe|unicam|rpivid|platform:bcm2835/i;
export function pickCaptureDevice(blocks) {
  for (const b of blocks) {
    if (NOT_A_CAMERA.test(b.name)) continue;
    const dev = b.devices.find((d) => /^\/dev\/video\d+$/.test(d));
    if (dev) return { name: b.name, device: dev };
  }
  return null;
}

/**
 * Which camera this board has, asked of the machine every time rather than
 * remembered: a CSI camera through libcamera first, then a USB one through
 * V4L2. `BOARD_CAM_SOURCE=test` is a stand-in picture made by ffmpeg, so the
 * whole path can run on a laptop with no camera and nobody's picture in it.
 */
export function findCamera({ source = process.env.BOARD_CAM_SOURCE || '', runner = run } = {}) {
  if (source === 'test') return { ok: true, kind: 'test', name: 'a test picture (BOARD_CAM_SOURCE=test)' };
  const tried = [];
  for (const cmd of ['rpicam-hello', 'libcamera-hello']) {
    const r = runner(cmd, ['--list-cameras']);
    if (r.why) { tried.push(r.why); continue; }
    const cams = parseRpicamList(r.out);
    if (cams.length) return { ok: true, kind: 'csi', cmd: cmd.replace('-hello', '-vid'), name: cams[0].sensor, mode: cams[0].mode };
    tried.push(`${cmd} lists no camera`);
    break;
  }
  const v = runner('v4l2-ctl', ['--list-devices']);
  if (v.why) tried.push(v.why);
  else {
    const pick = pickCaptureDevice(parseV4l2Devices(v.out));
    if (pick) {
      const f = runner('v4l2-ctl', ['-d', pick.device, '--list-formats']);
      const mjpeg = /MJPG|Motion-JPEG/i.test(f.out || '');
      return { ok: true, kind: 'usb', name: pick.name, device: pick.device, inputFormat: mjpeg ? 'mjpeg' : null };
    }
    tried.push('v4l2-ctl lists no capture device beside the Pi\'s own codec nodes');
  }
  return { ok: false, reason: 'no camera on this board', detail: tried.join('; ') };
}

/** The command that makes Annex B H.264 on stdout, for each kind of source. */
export function cameraCommand(cam, { w, h, fps, bitrate, gop, hw = existsSync('/dev/video11') } = {}) {
  if (cam.kind === 'csi') {
    return [cam.cmd || 'rpicam-vid', ['-t', '0', '-n', '--codec', 'h264', '--inline', '--intra', String(gop),
      '--profile', 'baseline', '--width', String(w), '--height', String(h), '--framerate', String(fps),
      '--bitrate', String(bitrate), '--flush', '-o', '-']];
  }
  // libx264 writes its parameter sets once at the start; `dump_extra` puts them
  // before every keyframe, so a viewer who joins late can start at the next one.
  const x264 = ['-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-profile:v', 'baseline', '-bf', '0',
    '-bsf:v', 'dump_extra=freq=keyframe'];
  const enc = hw ? ['-c:v', 'h264_v4l2m2m'] : x264;
  const tail = ['-pix_fmt', 'yuv420p', ...enc, '-b:v', String(bitrate), '-g', String(gop), '-f', 'h264', '-'];
  if (cam.kind === 'usb') {
    return ['ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'v4l2',
      ...(cam.inputFormat ? ['-input_format', cam.inputFormat] : []),
      '-video_size', `${w}x${h}`, '-framerate', String(fps), '-i', cam.device, ...tail]];
  }
  if (cam.kind === 'test') {
    return ['ffmpeg', ['-hide_banner', '-loglevel', 'error', '-re', '-f', 'lavfi',
      '-i', `testsrc2=size=${w}x${h}:rate=${fps}`, '-pix_fmt', 'yuv420p', ...x264,
      '-b:v', String(bitrate), '-g', String(gop), '-f', 'h264', '-']];
  }
  throw new Error(`camera: no command for a source of kind ${cam.kind}`);
}

/**
 * Cut Annex B into one access unit per frame, for an encoder that does NOT
 * repeat SPS and PPS on every frame.
 *
 * ⚠️ `video.mjs`'s splitter cuts at each SPS, which is right for
 * `h264_v4l2m2m` (MEASURED there: parameter sets before every frame) and wrong
 * here: `rpicam-vid --inline` and libx264 with `dump_extra` put them before a
 * keyframe only, so cutting at SPS would make each unit a whole second of
 * frames. A frame begins at an access unit delimiter, at a parameter set or SEI
 * not already inside a frame's header, or at the FIRST slice of a picture that
 * no header precedes.
 * ⚠️ FIRST SLICE, NOT ANY SLICE. MEASURED 2026-10-13 on libx264 with
 * `-tune zerolatency`: three slices per frame (sliced threads), so cutting at
 * every slice made 270 units of 90 frames. A slice whose `first_mb_in_slice` is
 * 0 starts a picture, and that field is the first Exp-Golomb code after the NAL
 * header byte, so it is 0 exactly when the top bit of the next byte is set.
 */
export function createAccessUnitSplitter(onUnit) {
  let buf = Buffer.alloc(0);
  const HEAD = new Set([9, 7, 8, 6]);
  return (chunk) => {
    buf = buf.length ? Buffer.concat([buf, chunk]) : Buffer.from(chunk);
    const nals = [];
    for (let i = 0; i + 3 < buf.length; i++) {
      if (buf[i] === 0 && buf[i + 1] === 0) {
        if (buf[i + 2] === 1) { nals.push({ at: i, type: buf[i + 3] & 0x1f }); i += 2; }
        else if (buf[i + 2] === 0 && i + 4 < buf.length && buf[i + 3] === 1) { nals.push({ at: i, type: buf[i + 4] & 0x1f }); i += 3; }
      }
    }
    const cuts = [];
    let prev = null;
    for (const n of nals) {
      const t = n.type;
      const firstSlice = (buf[n.at + (buf[n.at + 2] === 1 ? 4 : 5)] & 0x80) !== 0;
      let begins;
      if (t === 9) begins = true;
      else if (t === 7) begins = prev !== 9;
      else if (t === 8 || t === 6) begins = !HEAD.has(prev);
      else if (t === 1 || t === 5) begins = firstSlice && !HEAD.has(prev);
      else begins = false;
      if (begins) cuts.push(n.at);
      prev = t;
    }
    for (let i = 0; i + 1 < cuts.length; i++) {
      const unit = buf.subarray(cuts[i], cuts[i + 1]);
      const key = nals.some((n) => n.at >= cuts[i] && n.at < cuts[i + 1] && n.type === 5);
      onUnit(Uint8Array.prototype.slice.call(unit), key);
    }
    if (cuts.length) buf = buf.subarray(cuts[cuts.length - 1]);
    else if (buf.length > 4 << 20) { onUnit(null, false); buf = Buffer.alloc(0); }
  };
}

/** PIDs of camera encoders: rpicam-vid or libcamera-vid, or an ffmpeg reading `-f v4l2`. Never the audio ffmpeg (`-f jack`) or the shader one (`-f rawvideo`). */
export function cameraPids() {
  try {
    const out = execFileSync('ps', ['-eo', 'pid,args', '--no-headers'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split('\n')
      .filter((l) => /\b(rpicam|libcamera)-vid\b/.test(l) || (/ffmpeg/.test(l) && /\s-f v4l2\s/.test(l)))
      .map((l) => +l.trim().split(/\s+/)[0])
      .filter((pid) => pid && pid !== process.pid);
  } catch { return []; }
}
export function sweepStrayCameras(onLog) {
  const pids = cameraPids();
  for (const pid of pids) {
    try { process.kill(pid, 'SIGKILL'); onLog?.(`swept a stray camera encoder (pid ${pid})`); } catch { /* gone */ }
  }
  return pids.length;
}

/** Start the camera's encoder. `onFrame(unit, key)` per frame; `onExit(why)` if it stops on its own. */
export function startCamera(cam, { w = 1280, h = 720, fps = 30, bitrate = 1_500_000, gop = 30,
  onFrame, onLog, onExit, spawnImpl = spawn } = {}) {
  let cmd, args;
  try { [cmd, args] = cameraCommand(cam, { w, h, fps, bitrate, gop }); }
  catch (e) { return { ok: false, reason: e.message }; }
  let p;
  try { p = spawnImpl(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { return { ok: false, reason: `${cmd} would not start: ${e.message}` }; }
  let frames = 0, bytes = 0, keys = 0, stopping = false;
  const split = createAccessUnitSplitter((unit, key) => {
    if (unit === null) { onLog?.('the camera encoder produced no frame boundary in 4 MB'); return; }
    frames++; bytes += unit.byteLength; if (key) keys++;
    onFrame?.(unit, key);
  });
  p.stdout.on('data', split);
  // rpicam-vid talks a lot on stderr at start; keep the last lines for a reason.
  const tail = [];
  p.stderr?.on('data', (d) => {
    for (const line of String(d).split('\n')) {
      const t = line.trim();
      if (!t) continue;
      tail.push(t); if (tail.length > 6) tail.shift();
    }
  });
  p.on('error', (e) => { if (!stopping) onExit?.(`${cmd}: ${e.message}`); });
  p.on('exit', (code, sig) => {
    if (stopping) return;
    onExit?.(`${cmd} exited (${sig ?? code})${tail.length ? `: ${tail.slice(-2).join(' / ').slice(0, 200)}` : ''}`);
  });
  return {
    ok: true, cmd, w, h, fps, bitrate, gop,
    stats: () => ({ frames, bytes, keys }),
    stop() {
      stopping = true;
      try { p.kill('SIGTERM'); } catch { /* gone */ }
      // SIGTERM is a request; video.mjs records an encoder that ignored it and
      // held the device for minutes.
      setTimeout(() => { try { p.kill('SIGKILL'); } catch { /* gone */ } }, 800).unref?.();
    },
  };
}

/**
 * The board's side of the keyed room. Joins it, proves the key, and runs the
 * camera while a keyed viewer is watching.
 *
 * @param {string} relay       wss base, as board.mjs has it
 * @param {string} room        `<room>-cam`
 * @param {string} key         BOARD_CAM_KEY; empty means the feature is off and nothing is joined
 * @param {function} encoderBusy  true while the shader picture holds the hardware encoder
 */
export function createCameraRoom({ relay, room, key, log = () => {}, encoderBusy = () => false,
  find = findCamera, start = startCamera, WS = globalThis.WebSocket, idleMs = CAM_IDLE_MS,
  size = {}, now = () => Date.now() } = {}) {
  if (!key) {
    log('camera: BOARD_CAM_KEY is not set, so the camera room is not joined and the camera never starts');
    return { enabled: false, running: () => false, status: () => ({ enabled: false }), stop() {} };
  }
  const FROM = `board-cam-${randomBytes(3).toString('hex')}`;
  const viewers = new Map();       // from -> last cam.watching
  let ws = null, authed = false, cam = null, shape = null, seq = 0, sent = 0, skipping = false;
  let backoff = 1000, closed = false, refusedKey = false, tick = null;
  // A refusal is remembered for half a minute, so a viewer's heartbeat every
  // ten seconds does not ask the machine for its cameras every ten seconds.
  let refusal = null;

  const say = (m) => { if (ws?.readyState === 1 && authed) ws.send(JSON.stringify({ ...m, from: FROM })); };

  function sendFrame(unit, key) {
    if (ws?.readyState !== 1 || !authed) return;
    // A slow link backs up in the socket; dropping deltas until the next
    // keyframe keeps the picture current rather than ever later.
    if (ws.bufferedAmount > BACKLOG_BYTES) { skipping = true; }
    if (skipping) { if (!key) { seq++; return; } skipping = false; }
    const out = Buffer.allocUnsafe(8 + unit.byteLength);
    out.writeUInt32LE(seq++ >>> 0, 0);
    out.writeUInt32LE(key ? 1 : 0, 4);
    Buffer.from(unit.buffer, unit.byteOffset, unit.byteLength).copy(out, 8);
    ws.send(out);
    sent++;
  }

  function end(why) {
    if (!cam) return;
    const st = cam.stats();
    cam.stop(); cam = null; shape = null;
    clearInterval(tick); tick = null;
    log(`camera: stopped, ${why}, after ${st.frames} frames`);
    say({ type: 'cam.stopped', why, ...st });
  }

  function begin() {
    if (cam) return;
    if (refusal && now() - refusal.at < 30_000) { say(refusal.msg); return; }
    refusal = null;
    if (encoderBusy()) { say({ type: 'cam.refused', why: 'the hardware encoder is drawing the shader picture (/concepts/remote/050/), so the camera waits' }); return; }
    sweepStrayCameras((l) => log(`camera: ${l}`));
    const found = find();
    if (!found.ok) {
      log(`camera: ${found.reason} (${found.detail})`);
      refusal = { at: now(), msg: { type: 'cam.refused', why: found.reason, detail: found.detail } };
      say(refusal.msg);
      return;
    }
    seq = 0; sent = 0; skipping = false;
    const r = start(found, { ...size, onFrame: sendFrame, onLog: (l) => log(`camera: ${l}`),
      onExit: (why) => { if (!cam) return; log(`camera: ${why}`); const st = cam.stats(); cam = null; shape = null; clearInterval(tick); tick = null; say({ type: 'cam.stopped', why, ...st }); } });
    if (!r.ok) { log(`camera: ${r.reason}`); say({ type: 'cam.refused', why: r.reason }); return; }
    cam = r;
    shape = { w: r.w, h: r.h, fps: r.fps, bitrate: r.bitrate, gop: r.gop, codec: CAM_CODEC, camera: found.name, kind: found.kind };
    log(`camera: up, ${found.kind} ${found.name}, ${r.w}x${r.h} at ${r.fps} fps, ${(r.bitrate / 1e6).toFixed(1)} Mbit/s`);
    say({ type: 'cam.started', ok: true, ...shape });
    // The counter and this clock once a second, so a viewer can estimate the
    // delay against its own clock. Both clocks are NTP set; the estimate is
    // worth what their agreement is worth, and the page says so.
    tick = setInterval(() => say({ type: 'cam.tick', seq, at: now() }), 1000);
    tick.unref?.();
  }

  function heard(m) {
    if (!m || typeof m.from !== 'string' || m.from === FROM) return;
    if (m.type === 'cam.watching') {
      const isNew = !viewers.has(m.from);
      viewers.set(m.from, now());
      if (!cam) begin();
      else if (isNew) say({ type: 'cam.started', ok: true, ...shape });
    } else if (m.type === 'cam.bye') {
      viewers.delete(m.from);
      if (!viewers.size) end('the last viewer left');
    } else if (m.type === 'cam.ping') {
      say({ type: 'cam.pong', t: m.t, to: m.from, at: now() });
    }
  }

  const prune = setInterval(() => {
    const cut = now() - idleMs;
    for (const [k, t] of viewers) if (t < cut) viewers.delete(k);
    if (cam && !viewers.size) end(`no keyed viewer has said it is watching for ${Math.round(idleMs / 1000)} s`);
  }, 5000);
  prune.unref?.();

  function connect() {
    if (closed) return;
    authed = false;
    ws = new WS(`${relay}/room/${room}/ws`);
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
      backoff = 1000;
      // The key goes in the first message, never in the URL or a header, so it
      // is not written into the relay's request logs.
      ws.send(JSON.stringify({ type: 'cam.key', key, from: FROM }));
    };
    ws.onmessage = (e) => {
      if (typeof e.data !== 'string') return;          // frames, our own or nobody's
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.type === 'cam.key.ok') { authed = true; refusedKey = false; log(`camera: joined ${room}, the relay took this board's key`); return; }
      if (authed) heard(m);
    };
    ws.onclose = (e) => {
      const was = authed;
      authed = false; ws = null;
      viewers.clear();
      end('the board lost the camera room');
      if (closed) return;
      if (e?.code === 4003) {
        if (!refusedKey) log(`camera: the relay refused this board's key for ${room}; BOARD_CAM_KEY does not match the PI_CAM_KEY secret`);
        refusedKey = true;
        backoff = 5 * 60_000;
      } else if (was) log(`camera: left ${room} (${e?.code ?? '?'}), rejoining`);
      setTimeout(connect, backoff).unref?.();
      backoff = Math.min(backoff * 2, 5 * 60_000);
    };
    ws.onerror = () => { /* close follows */ };
  }
  sweepStrayCameras((l) => log(`camera: ${l}`));
  connect();

  return {
    enabled: true,
    running: () => !!cam,
    status: () => ({ enabled: true, joined: authed, running: !!cam, viewers: viewers.size, sent, shape }),
    stop() { closed = true; clearInterval(prune); end('the board is stopping'); try { ws?.close(); } catch { /* gone */ } },
  };
}
