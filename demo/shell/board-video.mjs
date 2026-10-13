// demo/shell/board-video.mjs: the Raspberry Pi's picture, received and decoded.
//
// Taken out of /mirror/ on 2026-10-12 (BACKLOG, "shader/010 on the real Pi")
// so that /shader/remote/ can show the board's real picture with the same
// code /mirror/ has run since 2026-09-11, rather than a second copy of it.
//
// WHAT THE BOARD SENDS (rig/board/board.mjs, `sendFrame`). After `video.start`
// on the board's own room, the board joins `<room>-video` (the `room` field of
// its `video.started` reply) and sends one binary frame per H.264 access unit:
//
//   bytes 0..3   uint32 LE, the board's frame counter, 0 at `video.start`
//   bytes 4..7   uint32 LE, flags; bit 0 set on a keyframe
//   bytes 8..    the access unit, Annex B, baseline (`avc1.42E01E`)
//
// ⚠️ THE COUNTER IS THE ONLY WITNESS OF LOSS. The relay drops frames with no
// error, no close and no backpressure (MEASURED: 101 of 361 at 8 Mbit/s), so a
// jump in it is counted and handed to `onLost`.
// ⚠️ A DECODER MUST START ON A KEYFRAME. Fed a delta frame first it reports an
// error once and stays broken, so a joiner waits for bit 0, up to one GOP.
//
// The control messages (`video.start`, `video.params`, `video.shader`,
// `video.status`, `video.stop`) go over whatever socket the page already holds
// to the board; this module only needs `send` for `video.watching`, which tells
// the board somebody is still looking so it can stop when nobody is.
//
//   const v = createBoardVideo({ canvas, send, onFrame, onSeq, onLost, onRate });
//   v.open(reply.room, reply);   // reply = the board's `video.started`
//   v.close();                   // answers { decoded, lost }
import { RELAY_BASE } from './wire.mjs';

/** What /mirror/ asks the board for, and what every page here has asked so far. */
export const BOARD_VIDEO_ASK = Object.freeze({ type: 'video.start', w: 1280, h: 720, fps: 30 });
/** How often a viewer says it is watching. The board stops a picture nobody does. */
export const WATCHING_MS = 10000;

/** One binary frame from the board, split. Answers null for anything too short. */
export function parseBoardFrame(buf) {
  if (!(buf instanceof ArrayBuffer) || buf.byteLength < 8) return null;
  const dv = new DataView(buf);
  return { seq: dv.getUint32(0, true), key: (dv.getUint32(4, true) & 1) === 1, data: new Uint8Array(buf, 8) };
}

/**
 * @param {HTMLCanvasElement} canvas  where a decoded frame is drawn, resized to it.
 * @param {function} [send]           `send(msg)` to the board's room, for `video.watching`.
 * @param {string} [relay]
 * @param {function} [onFrame]        `(decodedCount, videoFrame)` after it is drawn, before it is closed.
 * @param {function} [onSeq]          `(seq, key, firstSeq)` for every frame that arrives, before the decode.
 * @param {function} [onKey]          the first keyframe arrived and decoding starts.
 * @param {function} [onLost]         `(totalLost)` when the counter jumps.
 * @param {function} [onRate]         `(kbit, fps)` once a second while frames arrive.
 * @param {function} [onClose]        the video socket closed, including by `close()`.
 * @param {function} [onError]        `(text)` a decode error or a refused chunk.
 * @param {function} [onText]         `(msg)` a text frame on the video socket, parsed as JSON. Since
 *                                    2026-10-13 for the Pi camera's keyed room (rig/board/camera.mjs),
 *                                    whose board speaks there; the shader picture's room is binary only.
 * @param {function} [onOpen]         the video socket opened.
 */
export function createBoardVideo({
  canvas, send = null, relay = RELAY_BASE,
  onFrame = () => {}, onSeq = () => {}, onKey = () => {}, onLost = () => {}, onRate = () => {},
  onClose = () => {}, onError = () => {}, onText = () => {}, onOpen = () => {},
} = {}) {
  const ctx = canvas.getContext('2d');
  let ws = null, decoder = null, decoded = 0, lost = 0, bytes = 0, fps = 0, kbit = null;
  let waitingForKey = true, last = -1, lastSeq = null, lastAt = 0;
  // Whether binary frames on the socket are drawn. Off while the same frames
  // arrive another way (`feed`, the Pi camera's direct link on
  // /remote/circuit/, since 2026-10-13); the socket stays open for text.
  let fromSocket = true;
  let take = null;
  const watching = setInterval(() => {
    if (ws && send && !document.hidden) send({ type: 'video.watching' });
  }, WATCHING_MS);
  watching.unref?.();

  function close() {
    const was = { decoded, lost };
    try { ws?.close(); } catch { /* already */ }
    try { decoder?.close(); } catch { /* already */ }
    ws = null; decoder = null;
    return was;
  }

  /**
   * Open the picture the board's `video.started` reply describes. Answers
   * `{ ok: true }`, or `{ ok: false, reason }` when this browser cannot decode.
   */
  function open(room, info = {}, { hello = null } = {}) {
    close();
    if (typeof VideoDecoder !== 'function') return { ok: false, reason: 'this browser has no WebCodecs, so the board’s picture cannot be decoded here' };
    waitingForKey = true; decoded = 0; lost = 0; bytes = 0; fps = 0; kbit = null; last = -1; lastSeq = null;
    const rate = info.fps ?? 30;
    const dec = decoder = new VideoDecoder({
      output: (vf) => {
        if (canvas.width !== vf.displayWidth) { canvas.width = vf.displayWidth; canvas.height = vf.displayHeight; }
        ctx.drawImage(vf, 0, 0);
        decoded++;
        try { onFrame(decoded, vf); } finally { vf.close(); }
      },
      error: (e) => onError(`decode error: ${String(e.message ?? e).slice(0, 80)}`),
    });
    dec.configure({ codec: info.codec ?? 'avc1.42E01E', optimizeForLatency: true });

    const sock = ws = new WebSocket(`${relay}/room/${room}/ws`);
    sock.binaryType = 'arraybuffer';
    let tick = 0, at = performance.now();
    // ⚠️ `hello` IS THE FIRST MESSAGE ON THE SOCKET, and the Pi camera's room
    // needs it: the relay lets a socket in a keyed room hear nothing until its
    // first message carries the key (workers/relay/src/index.js `CAM_ROOM`).
    // In the message, not the URL, so the key is not in a request log.
    sock.onopen = () => {
      if (ws !== sock) return;
      if (hello) { try { sock.send(JSON.stringify(hello)); } catch { /* closing */ } }
      onOpen();
    };
    sock.onmessage = (e) => {
      if (typeof e.data === 'string') {
        if (ws !== sock) return;
        let m = null;
        try { m = JSON.parse(e.data); } catch { /* not ours */ }
        if (m) onText(m);
        return;
      }
      if (ws !== sock || !fromSocket) return;
      take(e.data);
    };
    take = (data) => {
      const f = parseBoardFrame(data);
      if (!f || !decoder || decoder !== dec) return;
      if (last >= 0 && f.seq > last + 1) { lost += f.seq - last - 1; onLost(lost); }
      last = f.seq;
      const first = lastSeq === null;
      lastSeq = f.seq; lastAt = performance.now();
      onSeq(f.seq, f.key, first);
      bytes += data.byteLength;
      if (waitingForKey) { if (!f.key) return; waitingForKey = false; onKey(); }
      try {
        dec.decode(new EncodedVideoChunk({ type: f.key ? 'key' : 'delta', timestamp: f.seq * 1e6 / rate, data: f.data }));
      } catch (err) { onError(`chunk refused: ${String(err.message ?? err).slice(0, 70)}`); }
      tick++;
      const now = performance.now();
      if (now - at >= 1000) {
        fps = tick * 1000 / (now - at);
        kbit = bytes * 8 / (now - at);
        onRate(kbit, fps);
        tick = 0; at = now; bytes = 0;
      }
    };
    sock.onclose = (e) => onClose(e);
    return { ok: true };
  }

  return {
    open, close,
    isOpen: () => !!ws,
    /** One frame from elsewhere, in the board's frame format. Drawn whether or not the socket's are. */
    feed(buf) { take?.(buf); },
    /** Draw the socket's binary frames, or not. */
    socketFrames(yes) { fromSocket = !!yes; },
    /** After a change of path: start again on the next keyframe, and do not count the gap as loss. */
    expectKey() { waitingForKey = true; last = -1; },
    /** Text on the video socket itself, for a room where the board listens there. False when it is not open. */
    say(msg) {
      if (ws?.readyState !== 1) return false;
      try { ws.send(JSON.stringify(msg)); return true; } catch { return false; }
    },
    decoded: () => decoded,
    lost: () => lost,
    fps: () => fps,
    kbit: () => kbit,
    /** The board's frame counter on the last frame that arrived, and when (performance.now()). */
    lastSeq: () => lastSeq,
    lastAt: () => lastAt,
    dispose() { clearInterval(watching); close(); },
  };
}
