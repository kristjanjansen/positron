// demo/shell/wire.mjs — the message shape every positron page sends, written
// down once. plan-ws §2.
//
//   { "type": "<verb>", "from": "<connection id>", "at": <epoch ms>,
//     "seq": <per-connection counter>, ... }
//
// Four keys are the envelope; ANYTHING ELSE IS THE SENDER'S OWN BUSINESS and is
// carried verbatim, which is the rule plan-score already settled for p-fields.
//
// `type`, not `t`, which five callers said until they were swept on
// 2026-09-10: `t` means TIME everywhere else in this project
// (`reduce(events ≤ t)`, `t0`, the strip's row `t`), so a key meaning *verb*
// would sit one letter from a key meaning *when* with nothing to catch a
// misread. Three bytes a message; 180 B/s at the relay's own 60 msg/s
// ceiling, against a 512 KiB/s budget.
//
// `from` is minted PER SOCKET, not per person, because `seq` counts a
// connection. Two tabs under one persisted user id interleave two counters and
// manufacture gaps that never happened. A user id is app data and rides along
// beside `from` — they are not the same fact and the envelope should not
// pretend they are.
//
// What `seq` is for, since the first version of this comment was wrong: a
// WebSocket rides TCP, so one sender's messages CANNOT arrive out of order and
// nothing goes missing without the connection dying. It sees the two ways this
// relay loses a message anyway — the caps biting (256 KiB / 512 KiB/s /
// 60 msg/s, dropped silently and counted only in the relay's own /stats) and a
// reconnect gapping. A check written to catch reordering would pass forever.

export const RELAY_BASE = 'wss://ws.positron.studio';
export const HTTP_BASE = 'https://ws.positron.studio';

// Read from workers/relay/src/index.js rather than typed twice: a description
// that can disagree with the config is worse than none.
export const LIMITS = {
  maxBytes: 256 * 1024,
  maxSockets: 16,
  bytesPerSec: 512 * 1024,
  msgPerSec: 60,
};

/**
 * The relay's own lesson, and the demo must not re-learn it: `String.length`
 * counts UTF-16 CODE UNITS, so 4,000 units of emoji is 8,000 bytes on the wire.
 * Every size this module reports is UTF-8 bytes.
 */
export const utf8 = (s) => new TextEncoder().encode(s).byteLength;

export const randomId = (n = 16) => {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => (b % 36).toString(36)).join('');
};

/**
 * The full shape, always. elektron v3 fills its keys with empty strings and
 * says why — "some clients just check for the value in the message, not
 * whether the key exists" — which is a scar, and the cheap way not to re-earn
 * it is to send every envelope key every time.
 */
/**
 * ⚠️ `from`, `at` and `seq` BELONG TO THE ENVELOPE and are written AFTER the
 * message is spread, so a payload field with one of those names is silently
 * replaced. It has happened for real: `source.load` carried the excerpt's start
 * offset as `at`, every send overwrote it with `Date.now()`, and the box asked
 * ffmpeg to seek to second 1,789,103,743,118 of a forty-five minute broadcast.
 * ffmpeg returned sixty seconds of real audio from wherever it decided that
 * was, so the feature made sound, the suite stayed green, and the only control
 * it had did nothing.
 *
 * Throwing is the point. This is a programming error with no correct silent
 * behaviour, it fires on the first send rather than in the field, and the
 * alternative — the value quietly becoming a timestamp — is the failure that
 * cost the afternoon. Name the field something else: `atSec`, `sentBy`, `n`.
 */
const ENVELOPE = ['from', 'at', 'seq'];
export function format(msg, { from, seq, at = Date.now(), id = randomId() }) {
  for (const k of ENVELOPE) {
    if (Object.hasOwn(msg, k)) {
      throw new Error(`wire: "${k}" is an envelope field — ${msg.type || 'this message'} would lose it. Rename the payload field (e.g. "${k}Sec", "${k}Value").`);
    }
  }
  return JSON.stringify({ id, type: '', ...msg, from, at, seq });
}

/**
 * What arrived, told apart rather than guessed at. Binary is a first-class
 * answer here: the relay carries `ArrayBuffer` unchanged, so a frame that is
 * not JSON is not necessarily broken.
 */
export function parse(data) {
  if (typeof data !== 'string') {
    const bytes = data.byteLength ?? data.size ?? 0;
    return { kind: 'binary', msg: null, data, bytes };
  }
  try {
    const msg = JSON.parse(data);
    if (msg && typeof msg === 'object') return { kind: 'json', msg, data, bytes: utf8(data) };
  } catch { /* fall through — an unreadable frame is a fact, not an exception */ }
  return { kind: 'unreadable', msg: null, data, bytes: utf8(data) };
}

/**
 * One room, one socket, and the counters that make a loss visible.
 *
 * Reconnect is included because every positron page lacks it — `cues` logs
 * "relay closed" and stops, so on a phone that changes network our pages
 * quietly stop working. elektron carried `reconnecting-websocket` in both v1
 * and v3; this is that, minus the dependency, plus the thing it did not have:
 * a NEW `from` on every connection, so the restarted counter cannot be read as
 * a duplicate range.
 */
export function openWire(room, {
  base = RELAY_BASE,
  onMessage = () => {},
  onOpen = () => {},
  onClose = () => {},
  reconnect = true,
} = {}) {
  const url = `${base}/room/${room}/ws`;
  let pong = null;
  const seen = new Map();               // from -> last seq, for gap detection
  const stats = {
    from: null, seq: 0, sent: 0, received: 0, echoed: 0,
    bytesOut: 0, bytesIn: 0, gaps: 0, missing: 0, reconnects: 0, refused: 0,
    // Why the last upgrade failed, when it can be known. Null means either
    // "nothing has failed" or "it failed for an ordinary network reason" — the
    // two are distinguished by `reconnects`.
    refusal: null, roomSockets: null,
  };
  let ws = null, closed = false, backoff = 300;

  /**
   * Why the upgrade was refused, asked of the only thing that can answer.
   *
   * Best-effort and never awaited by the reconnect: the point is to put a
   * reason in front of a person, not to gate a retry on a second request that
   * may fail the same way. `refusal` is null until something is known.
   */
  async function diagnose() {
    try {
      const r = await fetch(`${base.replace(/^ws/, 'http')}/room/${room}/stats`, { cache: 'no-store' });
      if (!r.ok) { stats.refusal = `the relay answered ${r.status} when asked about the room`; return; }
      const s2 = await r.json();
      const max = s2.limits?.maxSockets;
      stats.roomSockets = s2.sockets;
      stats.refusal = (max && s2.sockets >= max)
        ? `the room is full — ${s2.sockets} of ${max} sockets, and the relay refuses the next one rather than dropping it`
        : null;                       // reachable and not full: an ordinary network failure
    } catch (e) {
      stats.refusal = `the relay is unreachable (${e.message})`;
    }
  }

  function connect() {
    stats.from = randomId(6);           // per CONNECTION, never per person
    stats.seq = 0;
    let opened = false;
    ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => { opened = true; backoff = 300; onOpen(stats.from); };
    ws.onclose = () => {
      onClose();
      if (closed || !reconnect) return;
      stats.reconnects++;
      // ⚠️ A CLOSE THAT NEVER OPENED IS A REFUSAL, AND THE ROOM BEING FULL IS
      // THE LIKELY ONE. The relay caps a room at MAX_SOCKETS and answers the
      // seventeenth upgrade `503 room full (16)` rather than accepting and
      // dropping — deliberately, because "a client that is told no can retry".
      // But this loop could not hear it: **a browser cannot read the HTTP
      // status of a failed WebSocket upgrade**, by design, the same way it
      // cannot read a response's `Date` header (LESSONS #38). So a full room
      // and a dead relay produced the identical `error` then `close`, and the
      // seventeenth headset in a room would back off to 5 s and retry forever
      // with nothing anywhere saying why.
      //
      // `/stats` is an ordinary CORS-clear GET on the same host (verified:
      // `access-control-allow-origin: *`), and it reports `sockets` against
      // `limits.maxSockets`. So ASK, rather than infer from a silence.
      if (!opened) diagnose();
      setTimeout(connect, backoff);
      backoff = Math.min(backoff * 2, 5000);
    };
    ws.onerror = () => { /* close follows; one report is enough */ };
    ws.onmessage = (e) => {
      // `ping` -> `pong` is answered by the runtime's hibernation autoresponse,
      // so it never wakes the room's Durable Object and times pure network. It
      // is not a message anybody sent, so it is not counted as one.
      if (e.data === 'pong') { pong?.(); return; }
      const got = parse(e.data);
      stats.received++;
      stats.bytesIn += got.bytes;
      if (got.kind === 'json' && got.msg.from) {
        if (got.msg.from === stats.from) stats.echoed++;
        // A gap is only meaningful inside one connection, which is what `from`
        // now identifies. Counted, never repaired here: the page decides.
        const last = seen.get(got.msg.from);
        if (typeof got.msg.seq === 'number') {
          if (last !== undefined && got.msg.seq > last + 1) {
            stats.gaps++;
            stats.missing += got.msg.seq - last - 1;
          }
          seen.set(got.msg.from, got.msg.seq);
        }
      }
      onMessage(got);
    };
  }

  /** Returns the exact line that went out, so the page can show the bytes
   *  rather than a rendering of them — or null if the roof refused it. */
  function send(msg) {
    if (ws?.readyState !== 1) return null;
    const line = format(msg, { from: stats.from, seq: stats.seq });
    const bytes = utf8(line);
    if (bytes > LIMITS.maxBytes) {
      // The relay would drop this silently and count it somewhere we cannot
      // read. Refusing here means the demo can SAY so — but the seq still
      // advances, because the point is that a receiver sees the hole.
      stats.seq++;
      stats.refused++;
      return { line, bytes, sent: false };
    }
    ws.send(line);
    stats.seq++;
    stats.sent++;
    stats.bytesOut += bytes;
    return { line, bytes, sent: true };
  }

  /** No envelope: bytes, unchanged, which is what the relay's contract says it
   *  carries. Nothing in a binary frame can declare a type or a seq — an
   *  asymmetry the page prints rather than papers over. */
  function sendBinary(buf) {
    if (ws?.readyState !== 1) return null;
    ws.send(buf);
    stats.sent++;
    stats.bytesOut += buf.byteLength;
    return { bytes: buf.byteLength, sent: true };
  }

  /** Round trip with nothing woken at the far end. Resolves null on timeout
   *  rather than hanging: a measurement that never returns is worse than one
   *  that says it could not be taken. */
  function ping(timeoutMs = 2000) {
    if (ws?.readyState !== 1) return Promise.resolve(null);
    return new Promise((resolve) => {
      const t0 = performance.now();
      const timer = setTimeout(() => { pong = null; resolve(null); }, timeoutMs);
      pong = () => { clearTimeout(timer); pong = null; resolve(performance.now() - t0); };
      ws.send('ping');
    });
  }

  connect();
  return {
    send,
    sendBinary,
    ping,
    stats: () => ({ ...stats }),
    state: () => ws?.readyState ?? 3,
    close: () => { closed = true; try { ws.close(); } catch { /* already gone */ } },
  };
}
