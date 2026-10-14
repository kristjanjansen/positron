// A direct WebRTC path beside the relay, signalled in the input's room: 3.7 ms p50 round
// trip against the relay's ~72 ms. `pcm` unordered, no retransmits; `ctl` unordered reliable,
// through the same handle() as the relay. Notes are numbered so a late note-off is refused.
// why: lessons/rig-board-io.md#rtc-header

export const MAX_PEERS = 4;
export const PEER_IDLE_MS = 60_000;
// A peer whose pcm channel is this far behind is not draining; a frame for it
// is dropped rather than queued, because a queue here is latency.
export const PCM_BACKLOG = 16 * 1024;
const PEER_RE = /^[A-Za-z0-9_-]{4,40}$/;

/** The key a MIDI message is ordered within: one note, or one controller, on one channel. */
export function midiKey(bytes) {
  if (!Array.isArray(bytes) || bytes.length !== 3) return null;
  const [st, a] = bytes, kind = st & 0xF0, ch = st & 0x0F;
  if (kind === 0x80 || kind === 0x90) return `${ch}:n:${a}`;
  if (kind === 0xB0) return `${ch}:c:${a}`;
  return null;
}

// Apply a numbered message only if newer than the last on its key; unnumbered or keyless pass.
// why: lessons/rig-board-io.md#fresher
export function fresher(last, bytes, n) {
  const key = midiKey(bytes);
  if (key == null || !Number.isFinite(n)) return true;
  const was = last.get(key);
  if (was != null && n <= was) return false;
  last.set(key, n);
  return true;
}

// The key a note is ordered within: node, channel, note; null otherwise.
// why: lessons/rig-board-io.md#note-key
export function noteKey(m) {
  if (!m || (m.type !== 'note.on' && m.type !== 'note.off') || !Number.isInteger(m.note)) return null;
  return `${typeof m.node === 'string' ? m.node : ''}:${Number.isInteger(m.channel) ? m.channel : 0}:${m.note}`;
}

// `fresher` for main-socket notes; unnumbered notes pass, as on the relay.
// why: lessons/rig-board-io.md#fresher-note
export function fresherNote(last, m) {
  const key = noteKey(m);
  if (key == null || !Number.isFinite(m.n)) return true;
  const was = last.get(`note:${key}`);
  if (was != null && m.n <= was) return false;
  last.set(`note:${key}`, m.n);
  return true;
}

// The live half: PeerConnection (or a fake), signal(msg), handle(msg, reply), frameMs.
// why: lessons/rig-board-io.md#create-rtc
export function createRtc({
  PeerConnection, signal, handle, log = () => {}, now = () => Date.now(),
  iceServers = ['stun:stun.cloudflare.com:3478'], maxPeers = MAX_PEERS, idleMs = PEER_IDLE_MS,
  unitMs, rate, onGone = () => {},
  // Labels a page may open beside pcm and ctl (e.g. `cam`); held, and nothing is sent until asked
  // over ctl.
  // why: lessons/rig-board-io.md#channels
  channels = [], onChannelClosed = () => {},
  // The board's wall clock for rtc.pong's `at`, so a page can estimate the clock offset.
  // why: lessons/rig-board-io.md#wall
  wall = () => Date.now(),
}) {
  const peers = new Map();

  function close(id, why) {
    const p = peers.get(id);
    if (!p) return;
    peers.delete(id);
    try { p.pc.close(); } catch { /* already */ }
    log(`rtc ${id}: closed, ${why} (${peers.size} left)`);
    onGone(p, why);
  }

  function offer(msg) {
    const id = msg.peer;
    if (typeof id !== 'string' || !PEER_RE.test(id) || typeof msg.sdp !== 'string') return;
    if (peers.has(id)) close(id, 'offered again');
    if (peers.size >= maxPeers) {
      signal({ type: 'rtc.refused', peer: id, why: `${maxPeers} direct listeners already, use the relay` });
      return;
    }
    // 10 or 20 ms a frame on this path, the page's choice, 10 unless asked.
    // 10 ms is 972 bytes and one SCTP chunk; 20 is 1,932 and two, and with no
    // retransmits losing either loses the frame (plan §5.3).
    const want = msg.frameMs === 20 ? 20 : 10;
    const frameMs = want % unitMs === 0 ? want : unitMs;
    const p = { id, pc: null, pcm: null, ctl: null, heard: now(), frameMs, parts: frameMs / unitMs,
                pending: [], seq: 0, held: new Set(), notes: new Map(), last: new Map(), sent: 0, dropped: 0, ch: {} };
    let pc;
    try { pc = new PeerConnection(`away-${id}`, { iceServers }); }
    catch (e) { signal({ type: 'rtc.refused', peer: id, why: `no peer connection here: ${e.message}` }); return; }
    p.pc = pc;
    peers.set(id, p);
    pc.onLocalDescription((sdp, kind) => signal({ type: 'rtc.answer', peer: id, sdp, kind }));
    pc.onLocalCandidate((cand, mid) => signal({ type: 'rtc.candidate', peer: id, cand, mid }));
    pc.onStateChange((st) => {
      log(`rtc ${id}: ${st}`);
      if (st === 'failed' || st === 'closed') close(id, st);
    });
    pc.onDataChannel((dc) => {
      const label = dc.getLabel();
      if (label === 'pcm') { p.pcm = dc; return; }
      if (label !== 'ctl') {
        if (!channels.includes(label)) { try { dc.close(); } catch {} return; }
        p.ch[label] = dc;
        try {
          dc.onClosed?.(() => {
            if (p.ch[label] !== dc) return;
            delete p.ch[label];
            onChannelClosed(p, label);
          });
        } catch { /* a fake without onClosed */ }
        return;
      }
      p.ctl = dc;
      const reply = (type, body) => { try { dc.sendMessage(JSON.stringify({ type, ...body })); } catch { /* closing */ } };
      reply('rtc.hello', { frameMs: p.frameMs, audioChannels: 1, rate });
      dc.onMessage((data) => {
        p.heard = now();
        let m;
        try { m = JSON.parse(typeof data === 'string' ? data : data.toString()); } catch { return; }
        if (!m || typeof m !== 'object') return;
        if (m.type === 'rtc.ping') return reply('rtc.pong', { re: m.id, t: m.t, at: wall() });
        if (m.type === 'midi.send') {
          if (!fresher(p.last, m.bytes, m.n)) return;   // overtaken; see the top of this file
          const [st, a, b] = Array.isArray(m.bytes) ? m.bytes : [];
          const kind = st & 0xF0, key = `${st & 0x0F}:${a}`;
          if (kind === 0x90 && b > 0) p.held.add(key); else if (kind === 0x80 || kind === 0x90) p.held.delete(key);
        }
        // The main socket's notes (`note.on` / `note.off`, board.mjs), held per
        // peer for the same reason as `held` above: a peer that goes away lets
        // go of what IT started, and nothing else.
        if (m.type === 'note.on' || m.type === 'note.off') {
          if (!fresherNote(p.last, m)) return;          // overtaken, as midi.send above
          const k = noteKey(m);
          if (k != null) {
            if (m.type === 'note.on' && (m.vel ?? 100) > 0) {
              p.notes.set(k, { ...(typeof m.node === 'string' ? { node: m.node } : {}), channel: Number.isInteger(m.channel) ? m.channel : 0, note: m.note });
            } else p.notes.delete(k);
          }
        }
        handle(m, (type, body) => reply(type, { re: m.id, ...body }), p.id);
      });
    });
    try { pc.setRemoteDescription(msg.sdp, 'offer'); }
    catch (e) { close(id, `offer refused: ${e.message}`); signal({ type: 'rtc.refused', peer: id, why: e.message }); return; }
    log(`rtc ${id}: offered, ${frameMs} ms frames (${peers.size} of ${maxPeers})`);
  }

  function candidate(msg) {
    const p = peers.get(msg.peer);
    if (!p || typeof msg.cand !== 'string' || !msg.cand) return;
    try { p.pc.addRemoteCandidate(msg.cand, typeof msg.mid === 'string' ? msg.mid : '0'); }
    catch (e) { log(`rtc ${p.id}: candidate refused, ${e.message}`); }
  }

  /** One capture unit for every open peer, grouped into that peer's frame size. */
  function pcm(int16) {
    for (const p of peers.values()) {
      if (!p.pcm) continue;
      let open = false;
      try { open = p.pcm.isOpen(); } catch { /* closed under us */ }
      if (!open) continue;
      p.pending.push(int16);
      if (p.pending.length < p.parts) continue;
      const n = p.pending.reduce((s, x) => s + x.length, 0);
      const out = Buffer.allocUnsafe(12 + n * 2);
      out.writeUInt32LE(p.seq++ >>> 0, 0);
      out.writeDoubleLE(performance.now(), 4);
      let o = 12;
      for (const x of p.pending) { Buffer.from(x.buffer, x.byteOffset, x.byteLength).copy(out, o); o += x.byteLength; }
      p.pending = [];
      let backlog = 0;
      try { backlog = p.pcm.bufferedAmount(); } catch { /* */ }
      if (backlog > PCM_BACKLOG) { p.dropped++; continue; }
      try { p.pcm.sendMessageBinary(out); p.sent++; } catch { p.dropped++; }
    }
  }

  function sweep() {
    for (const p of [...peers.values()]) if (now() - p.heard > idleMs) close(p.id, 'nothing on ctl for a minute');
  }

  /** One JSON message on every open `ctl`, for what the board says unasked (a macro turned by hand). */
  function broadcast(msg) {
    let n = 0;
    const line = JSON.stringify(msg);
    for (const p of peers.values()) {
      let open = false;
      try { open = !!p.ctl && p.ctl.isOpen(); } catch { /* closed under us */ }
      if (!open) continue;
      try { p.ctl.sendMessage(line); n++; } catch { /* closing */ }
    }
    return n;
  }

  return {
    offer, candidate, pcm, sweep, peers, broadcast,
    get size() { return peers.size; },
    status: () => [...peers.values()].map((p) => ({ peer: p.id, frameMs: p.frameMs, sent: p.sent, dropped: p.dropped, open: !!p.pcm && !!p.ctl })),
    close() { for (const id of [...peers.keys()]) close(id, 'shutting down'); },
  };
}

// The main socket on the direct path (it used to drop offers silently). handle is the main socket's
// own, async, rejections caught. `frame` is the relay's frame; the direct path sends half.
// why: lessons/rig-board-io.md#main-direct
export function createMainDirect({ PeerConnection = null, signal, handle, frame, rate, log = () => {}, ...rest }) {
  const unit = frame % 2 === 0 ? frame / 2 : frame;
  const run = (m, reply, peer) => {
    Promise.resolve().then(() => handle(m, reply, peer)).catch((err) => {
      log(`handler threw over ctl: ${err.message}`);
      reply('board.error', { error: err.message });
    });
  };
  const rtc = PeerConnection ? createRtc({
    PeerConnection, signal, rate, unitMs: 1000 * unit / rate, log, handle: run,
    // A direct listener that goes away lets go of the notes IT started, one
    // note off each through the same handler. Not a panic, so a note somebody
    // else is holding on the same engine keeps sounding.
    onGone: (p) => {
      for (const n of p.notes.values()) run({ type: 'note.off', ...n }, () => {}, p.id);
      p.notes.clear();
    },
    ...rest,
  }) : null;
  return {
    /** What `board.hello` and `board.alive` say, so a page knows whether to offer. */
    direct: !!rtc,
    // True when the message was the direct path's (answered or refused), false otherwise.
    // why: lessons/rig-board-io.md#signalling
    signalling(msg) {
      if (msg?.type === 'rtc.offer') {
        if (!rtc) { signal({ type: 'rtc.refused', peer: msg.peer, why: 'this board has no direct path, use the relay' }); return true; }
        try { rtc.offer(msg); } catch (err) { log(`offer threw: ${err.message}`); signal({ type: 'rtc.refused', peer: msg.peer, why: err.message }); }
        return true;
      }
      if (msg?.type === 'rtc.candidate') { try { rtc?.candidate(msg); } catch { /* */ } return true; }
      return false;
    },
    /** One capture unit (half a relay frame) for every open peer. */
    unit(int16) { rtc?.pcm(int16); },
    /** A whole relay frame, for a source that only makes whole ones, in units. */
    frame(int16) {
      if (!rtc || !rtc.size) return;
      for (let o = 0; o < int16.length; o += unit) rtc.pcm(int16.subarray(o, o + unit));
    },
    sweep() { rtc?.sweep(); },
    // A listed extra channel a peer opened, or null; `has` says whether the peer exists.
    // why: lessons/rig-board-io.md#channel
    channel: (peer, label) => rtc?.peers.get(peer)?.ch?.[label] ?? null,
    has: (peer) => !!rtc?.peers.has(peer),
    status: () => (rtc ? rtc.status() : null),
    get size() { return rtc ? rtc.size : 0; },
    close() { rtc?.close(); },
  };
}
