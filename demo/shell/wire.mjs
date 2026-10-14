// demo/shell/wire.mjs: the message shape every page sends. plan-ws section 2.
//   { type, from, sent, seq, ... }: four envelope keys, everything else carried verbatim.
// `sent` is the sender's own clock; `from` is per socket, because `seq` counts a connection.
// why: lessons/kit-wire.md#header

export const DEFAULT_RELAY = 'wss://ws.positron.studio';

/**
 * `?relay=` points a page at a stand-in relay (demo/fake-relay.mjs), loopback only;
 * anything else is ignored. A public secure origin cannot reach loopback, so local runs only.
 * why: lessons/kit-wire.md#relay-override
 */
export function relayOverride(search) {
  let v;
  try { v = new URLSearchParams(search || '').get('relay'); } catch { return null; }
  if (!v) return null;
  let u;
  try { u = new URL(v); } catch { return null; }
  const loop = ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname);
  if (!/^wss?:$/.test(u.protocol) || !loop || u.pathname.replace(/\/$/, '') !== '' || u.search || u.hash) return null;
  return `${u.protocol}//${u.host}`;
}

const askedRelay = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('relay') : null;
const overridden = typeof location !== 'undefined' ? relayOverride(location.search) : null;
if (askedRelay && !overridden && typeof console !== 'undefined') {
  console.warn(`wire: ?relay=${askedRelay} is not a ws:// or wss:// address on this machine, so it is ignored and the page uses ${DEFAULT_RELAY}`);
}
export const RELAY_BASE = overridden || DEFAULT_RELAY;
export const HTTP_BASE = RELAY_BASE.replace(/^ws/, 'http');

/**
 * A copy of the relay's own `GET /room/<name>/stats` limits; anything that matters should ask.
 * why: lessons/kit-wire.md#limits
 */
export const LIMITS = {
  maxBytes: 1_024_000,
  maxSockets: 128,
  bytesPerSec: 8 * 1024 * 1024,
  msgPerSec: 1000,
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
 * Every envelope key is sent every time. `from`, `sent`, `seq` and `by` belong to the envelope,
 * so a payload field with one of those names throws on the first send rather than being
 * silently replaced. Name it something else.
 * why: lessons/kit-wire.md#envelope
 */
const ENVELOPE = ['from', 'sent', 'seq', 'by'];

/**
 * `page` is a person, `tool` a harness, probe or script (a page under `?selfcheck=1` too).
 * A declaration, not a credential: nothing on this relay authenticates anybody.
 * why: lessons/kit-wire.md#kinds
 */
export const KINDS = ['page', 'tool'];
export function format(msg, { from, seq, sent = Date.now(), id = randomId(), by = null }) {
  for (const k of ENVELOPE) {
    if (Object.hasOwn(msg, k)) {
      throw new Error(`wire: "${k}" is an envelope field, so ${msg.type || 'this message'} would lose it. Rename the payload field (e.g. "${k}Sec", "${k}Value").`);
    }
  }
  // `by` is left OUT when it is the default, so the common case costs no bytes
  // and an old reader sees exactly what it saw before.
  return JSON.stringify({ id, type: '', ...msg, from, sent, seq, ...(by && by !== 'page' ? { by } : {}) });
}

/**
 * What arrived, told apart; binary is a first-class answer. An old-shape message (no `sent`,
 * numeric `at`) has its `at` moved to `sent`, since `at` now means when the event happens.
 * why: lessons/kit-wire.md#normalise
 */
export function normalise(msg) {
  if (msg && typeof msg === 'object' && !('sent' in msg) && typeof msg.at === 'number') {
    msg.sent = msg.at;
    delete msg.at;
  }
  return msg;
}

export function parse(data) {
  if (typeof data !== 'string') {
    const bytes = data.byteLength ?? data.size ?? 0;
    return { kind: 'binary', msg: null, data, bytes };
  }
  try {
    const msg = JSON.parse(data);
    if (msg && typeof msg === 'object') return { kind: 'json', msg: normalise(msg), data, bytes: utf8(data) };
  } catch { /* fall through — an unreadable frame is a fact, not an exception */ }
  return { kind: 'unreadable', msg: null, data, bytes: utf8(data) };
}

/**
 * One room, one socket, and the counters that make a loss visible. Reconnects, with a new
 * `from` on every connection so the restarted counter is not read as a duplicate range.
 * why: lessons/kit-wire.md#open-wire
 */
export function openWire(room, {
  base = RELAY_BASE,
  onMessage = () => {},
  onOpen = () => {},
  onClose = () => {},
  reconnect = true,
  /**
   * What kind of client this is (see `KINDS`): `page` by default, `tool` under `?selfcheck=1`.
   * why: lessons/kit-wire.md#open-wire-by
   */
  by = null,
} = {}) {
  const KIND = by || (typeof location !== 'undefined'
    && ['1', '2'].includes(new URLSearchParams(location.search).get('selfcheck')) ? 'tool' : 'page');
  if (!KINDS.includes(KIND)) {
    throw new Error(`wire: by is one of ${KINDS.join(', ')}, not ${JSON.stringify(KIND)}.`);
  }
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
  let ws = null, closed = false, backoff = 300, retry = null;

  /**
   * Why the upgrade was refused, asked of `/stats`. Best-effort, never awaited by the reconnect.
   * why: lessons/kit-wire.md#diagnose
   */
  async function diagnose() {
    try {
      const r = await fetch(`${base.replace(/^ws/, 'http')}/room/${room}/stats`, { cache: 'no-store' });
      if (!r.ok) { stats.refusal = `the relay answered ${r.status} when asked about the room`; return; }
      const s2 = await r.json();
      const max = s2.limits?.maxSockets;
      stats.roomSockets = s2.sockets;
      stats.refusal = (max && s2.sockets >= max)
        ? `the room is full at ${s2.sockets} of ${max} sockets, and the relay refuses the next one rather than dropping it`
        : null;                       // reachable and not full: an ordinary network failure
    } catch (e) {
      stats.refusal = `the relay is unreachable (${e.message})`;
    }
  }

  function connect() {
    retry = null;
    if (closed) return;
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
      // A close that never opened is a refusal, most likely a full room. A browser cannot read a failed
      // upgrade's status, so ask `/stats` (CORS-clear) rather than infer from silence.
      // why: lessons/kit-wire.md#close-refusal
      if (!opened) diagnose();
      retry = setTimeout(connect, backoff);
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
    const line = format(msg, { from: stats.from, seq: stats.seq, by: KIND });
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
    // A reconnect queued by a blip must not rejoin the room after Leave.
    close: () => { closed = true; clearTimeout(retry); retry = null; try { ws.close(); } catch { /* already gone */ } },
  };
}
