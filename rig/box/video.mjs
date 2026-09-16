// rig/box/video.mjs — the board draws a picture and sends it, as H.264.
//
// `rig/vis/v3dpipe` renders a generative shader headless on the VideoCore VI
// (EGL surfaceless over GBM — see rig/vis/README.md for why that is the only
// way in on a machine with no screen) and writes raw RGBA to stdout. ffmpeg's
// `h264_v4l2m2m` encoder — the board's HARDWARE encoder on /dev/video11 — turns
// that into an Annex-B byte stream, and this cuts the stream into one message
// per frame.
//
// MEASURED, 30 s, alongside the running instruments: 29.6 fps at 1280x720 for
// 18.6% user + 14.0% sys of 400%, 79 MB, zero audio dropouts, throttled=0x0.
//
// ⚠️ VIDEO GETS ITS OWN SOCKET, AND THAT IS FORCED BY A MEASUREMENT.
// The relay's per-socket budget is `MSG_PER_SEC` 60 (workers/relay/src/index.js)
// and the audio stream is already 50 a second — 48000/960. Thirty video frames
// on the same socket would be 80 against a cap of 60, and the token bucket drops
// the excess SILENTLY: no error, no close, no backpressure, counted only in the
// relay's own /stats. So a picture sharing the audio socket would quietly cost a
// quarter of both. A second socket has its own bucket and its own 512 KiB/s.
//
// ⚠️ AND IT KEEPS THE AUDIO FRAMING UNAMBIGUOUS. Every page in this project
// treats an incoming binary frame as PCM. Putting H.264 on the same socket would
// need a type byte in a header that is already deployed on both ends, or a magic
// number that a 32-bit sequence counter can eventually collide with. A separate
// room needs neither.
import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

/**
 * The PIDs of every ffmpeg encoding video right now.
 *
 * ⚠️ MATCHED ON `rawvideo`, AND THAT IS DELIBERATE RATHER THAN LAZY. The box's
 * AUDIO capture is also an ffmpeg — `-f jack -i posbox` — so `pkill -x ffmpeg`
 * would take the instrument's sound with it. Only the video encoder reads raw
 * frames on stdin, so that is what tells them apart.
 *
 * ⚠️ And read with `ps` rather than `pgrep -f`: a `-f` pattern matches the
 * command line running the check and answers about ITSELF. LESSONS #39, twice
 * in one session.
 */
export function encoderPids() {
  try {
    const out = execFileSync('ps', ['-eo', 'pid,args', '--no-headers'], { encoding: 'utf8' });
    return out.split('\n')
      .filter((l) => /\brawvideo\b/.test(l) && /ffmpeg/.test(l))
      .map((l) => +l.trim().split(/\s+/)[0])
      .filter(Boolean);
  } catch { return []; }
}

/**
 * Kill encoders nobody owns.
 *
 * ⚠️ AN ORPHANED ENCODER BRICKS THE FEATURE UNTIL A REBOOT, and it survives a
 * restart of this service: systemd replaces the node process and nothing reaps
 * what it spawned, so the device stays held and every later `video.start`
 * refuses forever. box.mjs already sweeps orphans at startup for exactly this
 * reason — but only at startup, and an encoder can be orphaned at any time.
 * The caller decides it is safe: it calls this only when IT is not streaming,
 * in which case an encoder on this board is by definition garbage.
 */
export function sweepStrayEncoders(onLog) {
  const pids = encoderPids();
  for (const pid of pids) {
    try { process.kill(pid, 'SIGKILL'); onLog?.(`swept a stray video encoder (pid ${pid}) that was holding /dev/video11`); }
    catch { /* already gone */ }
  }
  return pids.length;
}

export const V3DPIPE = '/opt/positron-box/rig/vis/v3dpipe';

/** Is there a renderer and a hardware encoder on this box? */
export function videoAvailable() {
  return existsSync(V3DPIPE) && existsSync('/dev/video11') && existsSync('/dev/dri/renderD128');
}

/**
 * Cut an Annex-B byte stream into one access unit per frame.
 *
 * ⚠️ THIS ENCODER PUTS SPS AND PPS BEFORE EVERY SINGLE FRAME, which is more
 * than "inline headers" and exactly what a lossy fan-out wants — a viewer who
 * joins mid-stream has the parameter sets the moment the next IDR arrives.
 * MEASURED on this board's stack (ffmpeg 7.1.5, kernel 6.18.34) over 150 frames
 * at -g 30: 150 SPS, 150 PPS, 5 IDR, pattern `7,8,5, 7,8,1, 7,8,1, …`. libx264
 * on the same input emits 5 and 5. There is an open upstream report that
 * `h264_v4l2m2m` omits inline parameter sets and is therefore unusable for live
 * streaming; it does not reproduce here, and that was checked because it would
 * have killed this file outright.
 *
 * So a new frame begins at each SPS. That is a property of this encoder rather
 * than of H.264, so the splitter falls back to cutting at any slice NAL when no
 * SPS has been seen — otherwise a stack that does NOT emit them would buffer the
 * entire stream into one enormous message and look like a hang.
 */
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
    // Emit every COMPLETE unit — everything between one cut and the next. The
    // tail after the last cut is incomplete by definition and stays buffered.
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

/**
 * Start rendering and encoding. `onFrame(bytes, key)` gets one access unit per
 * frame; `stop()` kills both processes.
 *
 * The bitrate default is 2 Mbit/s, which is not a taste: MEASURED Pi →
 * Cloudflare → laptop, 2 and 4 Mbit/s arrive byte-identical with zero gaps,
 * 5 passes despite nominally exceeding the cap, and 8 loses 28% of frames
 * silently. Design to 4 and measure; ship 2, which is 48% of one socket's byte
 * budget and leaves room for the keyframes to be six times the mean.
 */
export function startVideo({ w = 1280, h = 720, fps = 30, bitrate = 2_000_000,
                             gop = 30, passes = 1, onFrame, onLog } = {}) {
  if (!videoAvailable()) {
    return { ok: false, reason: `no renderer at ${V3DPIPE} or no hardware encoder at /dev/video11` };
  }
  // ⚠️ THE HARDWARE ENCODER IS A SINGLE EXCLUSIVE DEVICE. A second ffmpeg on
  // /dev/video11 does not fail — it BLOCKS, forever, looking exactly like an
  // encoder that produces no bytes. Stacking them is what wedged the device
  // badly enough to need a reboot on 2026-09-11. Refuse instead, and say what
  // is holding it.
  //
  // ⚠️ `pgrep -x`, NEVER `-f`: a `-f` pattern matches the very command line
  // running the check, so it always answers "held" — including about itself.
  // That is LESSONS #39, and it cost twenty minutes twice in one session.
  // The caller only reaches here when it is NOT already streaming, so anything
  // holding the device is an orphan — from a killed run, or from a restart of
  // this service that left its child behind. Clear it rather than refusing
  // forever: refusing was correct about the danger and wrong about the remedy,
  // and it left the feature permanently unavailable with an accurate message.
  const swept = sweepStrayEncoders(onLog);
  if (swept) {
    onLog?.(`waiting for the device to come back after sweeping ${swept}`);
  }
  const still = encoderPids().length;
  if (still > 0) {
    return { ok: false, reason: `${still} encoder process(es) still hold /dev/video11 and would not die — the device needs a reboot`, held: still };
  }
  // 0 frames means FOREVER — see the comment in rig/vis/v3dpipe.c. It meant
  // "render none and exit" until 2026-09-11, which left ffmpeg waiting on a
  // pipe nothing would ever come down while every status said the picture was
  // up.
  // ⚠️ stdin IS A PIPE, not 'ignore': it is the renderer's control channel.
  // stdout carries the pixels and stderr the timings, so a parameter has
  // nowhere else to arrive — and the alternative, restarting with new argv,
  // costs seconds and cycles the exclusive hardware encoder that wedged this
  // board once already.
  const render = spawn(V3DPIPE, [String(w), String(h), '0', String(passes)],
    { stdio: ['pipe', 'pipe', 'pipe'] });
  const enc = spawn('ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-r', String(fps), '-i', '-',
    '-pix_fmt', 'yuv420p', '-c:v', 'h264_v4l2m2m',
    '-b:v', String(bitrate),
    // ⚠️ A JOINER WAITS FOR AN IDR, and that is a GOP choice rather than a bug.
    // At -g 30 and 30 fps that is up to one second of black for someone who has
    // just opened the page. Shorter GOPs cost bitrate; this is the knob.
    '-g', String(gop),
    '-f', 'h264', '-',
  ], { stdio: ['pipe', 'pipe', 'pipe'] });
  render.stdout.pipe(enc.stdin);

  let frames = 0, bytes = 0, keys = 0, biggest = 0;
  // ⚠️ WHICH GPU DREW IT, CAPTURED FROM THE RENDERER'S OWN FIRST LINE. The page
  // names the chip under its own picture; the streamed picture deserves the
  // same, or one pane is attributed and the other is anonymous. And it must be
  // READ rather than declared here: `v3dpipe` prints what EGL actually gave it,
  // which is the difference between the real v3d driver and a software
  // rasteriser that would quietly be twenty times slower.
  let renderer = null;
  const split = createAnnexBSplitter((unit, key) => {
    if (unit === null) { onLog?.('the encoder produced no frame boundary in 4 MB — stopping rather than buffering'); return; }
    frames++; bytes += unit.byteLength; if (key) keys++;
    if (unit.byteLength > biggest) biggest = unit.byteLength;
    onFrame?.(unit, key);
  });
  enc.stdout.on('data', split);
  // ⚠️ v3dpipe reports its own timing on STDERR, which is the only place the
  // render rate is visible — its stdout is the pixels.
  render.stderr?.on('data', (d) => {
    const t = String(d).trim();
    if (!t) return;
    const m = t.match(/^renderer\s+(.+?)\s\s/);
    if (m && !renderer) renderer = m[1].trim();
    // 🔴 THE RENDERER'S VERDICT IS THE ONLY ONE WORTH REPORTING. Writing to a
    // pipe succeeds whether or not the shader on the other end compiles, so
    // `shader()` used to answer `ok: true` for a body the renderer then
    // refused — a count of what was QUEUED reading identically to what
    // LANDED, which is `createMidiLane.scheduled()` in a new costume. The
    // caller waits for one of these lines instead.
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

  // What the picture is set to right now. Kept here rather than asked of the
  // renderer, because it has no way to answer — a one-way channel means this
  // end owns the truth, and a client reading it back is reading what was SENT.
  const params = { seg: 8, fb: 0.78, scale: 4, warp: 0.08, hue: 1 };

  return {
    ok: true, w, h, fps, bitrate, gop, passes,
    params: () => ({ ...params }),
    /**
     * A whole new picture, down the same channel.
     *
     * ⚠️ BASE64, BECAUSE THE CHANNEL IS ONE COMMAND PER LINE. GLSL has
     * newlines; escaping them would be a small format nobody else implements,
     * and base64 is already in both standard libraries.
     *
     * ⚠️ AND THE BODY CARRIES NO `#version` LINE. The board compiles as
     * `310 es` and the browser as `300 es`, so the header belongs to each end
     * and only the body travels. A body arriving with its own header would
     * compile on exactly one of them.
     *
     * The renderer compiles it on its own thread and keeps the running picture
     * if it will not build — it prints SHADER-OK, SHADER-LIVE or
     * SHADER-REFUSED, which is what the caller hears back.
     */
    shader: async (body) => {
      if (typeof body !== 'string' || !body.length) return { ok: false, reason: 'no shader body' };
      if (body.length > 12000) return { ok: false, reason: `${body.length} bytes — larger than the channel takes` };
      if (/#version/.test(body)) return { ok: false, reason: 'send the body without a #version line — each end adds its own' };
      try {
        // ⚠️ WAIT FOR THE COMPILER, NOT FOR THE PIPE. A write to stdin succeeds
        // whatever the GLSL says; the answer that matters comes back on stderr
        // one frame later. A second is generous — the board took 35 ms.
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
      // ⚠️ AND MAKE SURE, BECAUSE SIGTERM DID NOT. An ffmpeg holding
      // /dev/video11 survived SIGTERM and kept the device for minutes, so every
      // later `video.start` queued behind it and read from the outside as "the
      // encoder produces no bytes". Six of them stacked up that way and the
      // device ended up needing a REBOOT. The board had already recorded this
      // exact lesson about an instrument: a graceful quit plus SIGTERM left the
      // process alive for two minutes once, and SIGKILL after a grace period is
      // the only guarantee. It was not applied here.
      setTimeout(() => {
        for (const p of [render, enc]) { try { p.kill('SIGKILL'); } catch { /* gone */ } }
      }, 800).unref?.();
    },
  };
}
