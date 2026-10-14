// demo/shell/board-video.mjs: the Pi's picture, received and decoded. One binary frame per H.264
// access unit on `<room>-video`: uint32 LE counter, uint32 LE flags (bit 0 keyframe), Annex B.
// The counter is the only witness of loss (101 of 361 dropped at 8 Mbit/s); decode starts on a keyframe.
// why: lessons/kit-board-video.md#header
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
 * @param {function} [onText]         `(msg)` a JSON text frame on the video socket, for the Pi camera's keyed room.
 * @param {function} [onOpen]         the video socket opened.
 * why: lessons/kit-board-video.md#createboardvideo
 */
export function createBoardVideo({
  canvas, send = null, relay = RELAY_BASE,
  onFrame = () => {}, onSeq = () => {}, onKey = () => {}, onLost = () => {}, onRate = () => {},
  onClose = () => {}, onError = () => {}, onText = () => {}, onOpen = () => {},
} = {}) {
  const ctx = canvas.getContext('2d');
  let ws = null, decoder = null, decoded = 0, lost = 0, bytes = 0, fps = 0, kbit = null;
  let waitingForKey = true, last = -1, lastSeq = null, lastAt = 0;
  // Whether binary frames on the socket are drawn. Off while the same frames arrive another way
  // (`feed`, the Pi camera's direct link); the socket stays open for text.
  // why: lessons/kit-board-video.md#fromsocket
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
    // `hello` is the first message: a keyed room hears nothing until a first message carries the
    // key (workers/relay/src/index.js `CAM_ROOM`). In the message, not the URL, to stay out of logs.
    // why: lessons/kit-board-video.md#hello
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
