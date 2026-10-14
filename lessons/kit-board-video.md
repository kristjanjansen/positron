# Kit lessons: board-video

The longer comments cut from `demo/shell/board-video.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-board-video.md#<anchor>`.

<a id="header"></a>

## `board-video.mjs` module header

```text
demo/shell/board-video.mjs: the Raspberry Pi's picture, received and decoded.

Taken out of /mirror/ on 2026-10-12 (BACKLOG, "shader/010 on the real Pi")
so that /shader/remote/ can show the board's real picture with the same
code /mirror/ has run since 2026-09-11, rather than a second copy of it.

WHAT THE BOARD SENDS (rig/board/board.mjs, `sendFrame`). After `video.start`
on the board's own room, the board joins `<room>-video` (the `room` field of
its `video.started` reply) and sends one binary frame per H.264 access unit:

  bytes 0..3   uint32 LE, the board's frame counter, 0 at `video.start`
  bytes 4..7   uint32 LE, flags; bit 0 set on a keyframe
  bytes 8..    the access unit, Annex B, baseline (`avc1.42E01E`)

⚠️ THE COUNTER IS THE ONLY WITNESS OF LOSS. The relay drops frames with no
error, no close and no backpressure (MEASURED: 101 of 361 at 8 Mbit/s), so a
jump in it is counted and handed to `onLost`.
⚠️ A DECODER MUST START ON A KEYFRAME. Fed a delta frame first it reports an
error once and stays broken, so a joiner waits for bit 0, up to one GOP.

The control messages (`video.start`, `video.params`, `video.shader`,
`video.status`, `video.stop`) go over whatever socket the page already holds
to the board; this module only needs `send` for `video.watching`, which tells
the board somebody is still looking so it can stop when nobody is.

  const v = createBoardVideo({ canvas, send, onFrame, onSeq, onLost, onRate });
  v.open(reply.room, reply);   // reply = the board's `video.started`
  v.close();                   // answers { decoded, lost }
```

<a id="createboardvideo"></a>

## `board-video.mjs` createBoardVideo

```text
@param {HTMLCanvasElement} canvas  where a decoded frame is drawn, resized to it.
@param {function} [send]           `send(msg)` to the board's room, for `video.watching`.
@param {string} [relay]
@param {function} [onFrame]        `(decodedCount, videoFrame)` after it is drawn, before it is closed.
@param {function} [onSeq]          `(seq, key, firstSeq)` for every frame that arrives, before the decode.
@param {function} [onKey]          the first keyframe arrived and decoding starts.
@param {function} [onLost]         `(totalLost)` when the counter jumps.
@param {function} [onRate]         `(kbit, fps)` once a second while frames arrive.
@param {function} [onClose]        the video socket closed, including by `close()`.
@param {function} [onError]        `(text)` a decode error or a refused chunk.
@param {function} [onText]         `(msg)` a text frame on the video socket, parsed as JSON. Since
                                   2026-10-13 for the Pi camera's keyed room (rig/board/camera.mjs),
                                   whose board speaks there; the shader picture's room is binary only.
@param {function} [onOpen]         the video socket opened.
```

<a id="fromsocket"></a>

## `board-video.mjs` fromSocket

```text
Whether binary frames on the socket are drawn. Off while the same frames
arrive another way (`feed`, the Pi camera's direct link on
/remote/circuit/, since 2026-10-13); the socket stays open for text.
```

<a id="hello"></a>

## `board-video.mjs` open hello

```text
⚠️ `hello` IS THE FIRST MESSAGE ON THE SOCKET, and the Pi camera's room
needs it: the relay lets a socket in a keyed room hear nothing until its
first message carries the key (workers/relay/src/index.js `CAM_ROOM`).
In the message, not the URL, so the key is not in a request log.
```
