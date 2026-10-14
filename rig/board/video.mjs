// A shader rendered headless on the VideoCore (rig/vis/v3dpipe), encoded by h264_v4l2m2m,
// one message per frame: 29.6 fps at 1280x720 for about a third of one core. Its own socket
// and room: the audio socket is near the relay's cap, and binary frames there are PCM.
// why: lessons/rig-board-io.md#video-header
import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// PIDs of ffmpeg encoding video, matched on `rawvideo` (the audio capture is also ffmpeg), read
// with
// `ps`, since `pgrep -f` matches itself.
// why: lessons/rig-board-io.md#encoder-pids
export function encoderPids() {
  try {
    const out = execFileSync('ps', ['-eo', 'pid,args', '--no-headers'], { encoding: 'utf8' });
    return out.split('\n')
      .filter((l) => /\brawvideo\b/.test(l) && /ffmpeg/.test(l))
      .map((l) => +l.trim().split(/\s+/)[0])
      .filter(Boolean);
  } catch { return []; }
}

// Kill encoders nobody owns: an orphan holds /dev/video11 across a service restart. Called only
// when
// this process is not streaming.
// why: lessons/rig-board-io.md#sweep-encoders
export function sweepStrayEncoders(onLog) {
  const pids = encoderPids();
  for (const pid of pids) {
    try { process.kill(pid, 'SIGKILL'); onLog?.(`swept a stray video encoder (pid ${pid}) that was holding /dev/video11`); }
    catch { /* already gone */ }
  }
  return pids.length;
}

export const V3DPIPE = '/opt/positron-board/rig/vis/v3dpipe';

/** Is there a renderer and a hardware encoder on this board? */
export function videoAvailable() {
  return existsSync(V3DPIPE) && existsSync('/dev/video11') && existsSync('/dev/dri/renderD128');
}

// One access unit per frame. This encoder emits SPS and PPS before every frame (measured 150/150),
// so
// a frame starts at each SPS; with no SPS seen it cuts at any slice NAL rather than buffer forever.
// why: lessons/rig-board-io.md#annexb
export function createAnnexBSplitter(onUnit) {
  let buf = Buffer.alloc(0);
  let sawSps = false;
  return (chunk) => {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    // Find every start code, then decide which of them begin a frame.
    const starts = [];
    for (let i = 0; i + 3 < buf.length; i++) {
      if (buf[i] === 0 && buf[i + 1] === 0) {
        if (buf[i + 2] === 1) { starts.push({ at: i, len: 3 }); i += 2; }
        else if (buf[i + 2] === 0 && buf[i + 3] === 1) { starts.push({ at: i, len: 4 }); i += 3; }
      }
    }
    if (starts.length < 2) return;
    const cuts = [];
    for (const s of starts) {
      const type = buf[s.at + s.len] & 0x1f;
      if (type === 7) sawSps = true;
      const begins = type === 7 || (!sawSps && (type === 1 || type === 5));
      if (begins) cuts.push(s.at);
    }
    // Emit complete units; the tail after the last cut stays buffered.
    // why: lessons/rig-board-io.md#complete
    for (let i = 0; i + 1 < cuts.length; i++) {
      const unit = buf.subarray(cuts[i], cuts[i + 1]);
      let key = false;
      for (const s of starts) {
        if (s.at < cuts[i] || s.at >= cuts[i + 1]) continue;
        if ((buf[s.at + s.len] & 0x1f) === 5) key = true;
      }
      onUnit(Uint8Array.prototype.slice.call(unit), key);
    }
    if (cuts.length) buf = buf.subarray(cuts[cuts.length - 1]);
    // A stream with no cut at all would grow without bound and present as a
    // hang rather than as an error, so say so instead.
    else if (buf.length > 4 << 20) { onUnit(null, false); buf = Buffer.alloc(0); }
  };
}

// onFrame(bytes, key) per access unit; stop() kills both. 2 Mbit/s: 2 and 4 arrive intact through
// the
// relay, 8 loses 28% silently.
// why: lessons/rig-board-io.md#start-video
export function startVideo({ w = 1280, h = 720, fps = 30, bitrate = 2_000_000,
                             gop = 30, passes = 1, onFrame, onLog } = {}) {
  if (!videoAvailable()) {
    return { ok: false, reason: `no renderer at ${V3DPIPE} or no hardware encoder at /dev/video11` };
  }
  // The encoder is exclusive and a second ffmpeg on it blocks forever; since this process is not
  // streaming here, anything holding it is an orphan and is cleared. `pgrep -x`, never `-f`.
  // why: lessons/rig-board-io.md#exclusive
  const swept = sweepStrayEncoders(onLog);
  if (swept) {
    onLog?.(`waiting for the device to come back after sweeping ${swept}`);
  }
  const still = encoderPids().length;
  if (still > 0) {
    return { ok: false, reason: `${still} encoder process(es) still hold /dev/video11 and would not die — the device needs a reboot`, held: still };
  }
  // 0 frames means forever. stdin is a pipe: the renderer's control channel (stdout pixels, stderr
  // timings).
  // why: lessons/rig-board-io.md#forever
  const render = spawn(V3DPIPE, [String(w), String(h), '0', String(passes)],
    { stdio: ['pipe', 'pipe', 'pipe'] });
  const enc = spawn('ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-r', String(fps), '-i', '-',
    '-pix_fmt', 'yuv420p', '-c:v', 'h264_v4l2m2m',
    '-b:v', String(bitrate),
    // A joiner waits for an IDR: up to one second at -g 30; shorter GOPs cost bitrate.
    // why: lessons/rig-board-io.md#gop
    '-g', String(gop),
    '-f', 'h264', '-',
  ], { stdio: ['pipe', 'pipe', 'pipe'] });
  render.stdout.pipe(enc.stdin);

  let frames = 0, bytes = 0, keys = 0, biggest = 0;
  // Which GPU drew it, read from the renderer's first line (a software rasteriser is 20x slower).
  // why: lessons/rig-board-io.md#renderer
  let renderer = null;
  const split = createAnnexBSplitter((unit, key) => {
    if (unit === null) { onLog?.('the encoder produced no frame boundary in 4 MB — stopping rather than buffering'); return; }
    frames++; bytes += unit.byteLength; if (key) keys++;
    if (unit.byteLength > biggest) biggest = unit.byteLength;
    onFrame?.(unit, key);
  });
  enc.stdout.on('data', split);
  // v3dpipe reports timing on stderr; stdout is pixels.
  // why: lessons/rig-board-io.md#stderr
  render.stderr?.on('data', (d) => {
    const t = String(d).trim();
    if (!t) return;
    const m = t.match(/^renderer\s+(.+?)\s\s/);
    if (m && !renderer) renderer = m[1].trim();
    // The renderer's SHADER-OK/LIVE/REFUSED line is the verdict; a pipe write succeeds regardless.
    // why: lessons/rig-board-io.md#verdict
    for (const line of t.split('\n')) {
      if (/^SHADER-OK/.test(line)) pendingShader?.({ ok: true, detail: 'compiled, fading in' });
      else if (/^SHADER-REFUSED/.test(line)) pendingShader?.({ ok: false, reason: line.replace(/^SHADER-REFUSED\s*/, '').slice(0, 160) });
    }
    onLog?.(`render: ${t}`);
  });
  // Set while a shader is in flight; called by the line above, once.
  let pendingShader = null;
  enc.stderr?.on('data', (d) => { const t = String(d).trim(); if (t) onLog?.(`ffmpeg: ${t}`); });
  let stopping = false;
  for (const [name, p] of [['renderer', render], ['encoder', enc]]) {
    p.on('exit', (code, sig) => {
      if (stopping) return;
      onLog?.(`⚠ the ${name} exited (${sig ?? code}) — the picture has stopped`);
    });
  }

  // The picture's settings, owned here: the channel is one-way, so a reader reads what was sent.
  // why: lessons/rig-board-io.md#params
  const params = { seg: 8, fb: 0.78, scale: 4, warp: 0.08, hue: 1 };

  return {
    ok: true, w, h, fps, bitrate, gop, passes,
    params: () => ({ ...params }),
    // A new shader body in base64 (one command per line), with no #version: the board compiles 310
    // es,
    // the browser 300 es. The renderer keeps the running picture if it does not build.
    // why: lessons/rig-board-io.md#shader
    shader: async (body) => {
      if (typeof body !== 'string' || !body.length) return { ok: false, reason: 'no shader body' };
      if (body.length > 12000) return { ok: false, reason: `${body.length} bytes — larger than the channel takes` };
      if (/#version/.test(body)) return { ok: false, reason: 'send the body without a #version line — each end adds its own' };
      try {
        // Wait for the compiler's verdict on stderr (the board took 35 ms), up to a second.
        // why: lessons/rig-board-io.md#wait-compiler
        const verdict = new Promise((res) => {
          pendingShader = (v) => { pendingShader = null; res(v); };
          setTimeout(() => { if (pendingShader) { pendingShader = null; res({ ok: false, reason: 'the renderer did not answer' }); } }, 1500);
        });
        render.stdin.write(`shader ${Buffer.from(body, 'utf8').toString('base64')}\n`);
        const v = await verdict;
        return v.ok ? { ok: true, bytes: body.length, detail: v.detail } : v;
      } catch (e) { return { ok: false, reason: String(e.message).slice(0, 80) }; }
    },
    /** One parameter down the control channel. Clamped at the far end too. */
    set: (key, value) => {
      if (!['seg', 'fb', 'scale', 'warp', 'hue'].includes(key) || !Number.isFinite(value)) return false;
      params[key] = value;
      try { render.stdin.write(`${key} ${value}\n`); return true; }
      catch { return false; }
    },
    stats: () => ({ frames, bytes, keys, biggestFrame: biggest, renderer,
                    meanFrameBytes: frames ? Math.round(bytes / frames) : 0 }),
    stop: () => {
      stopping = true;
      for (const p of [render, enc]) { try { p.kill('SIGTERM'); } catch { /* gone */ } }
      // SIGKILL after a grace period: an ffmpeg survived SIGTERM, held /dev/video11, and six
      // stacked up.
      // why: lessons/rig-board-io.md#sigkill
      setTimeout(() => {
        for (const p of [render, enc]) { try { p.kill('SIGKILL'); } catch { /* gone */ } }
      }, 800).unref?.();
    },
  };
}
