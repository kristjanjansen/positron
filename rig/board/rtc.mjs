// rig/board/rtc.mjs — a direct path from a browser to one input, beside the relay.
//
// Asked 2026-09-30: *"can we bring roundtrip more down"*, then *"webrtc for
// away"*. `plans/plan-away-webrtc.md` has the whole case. The short of it: the
// relay was ~72 of the 93 ms from a key press to its note arriving back, and
// the laptop and this board are 4.1 ms apart by ping.
//
// MEASURED 2026-09-30, P0, headless Chrome on the laptop to `node-datachannel`
// 0.33.4 on this Pi, signalled through a relay room: the channel opened in
// 158 ms, the selected pair was HOST to HOST over UDP (libdatachannel resolved
// Chrome's `*.local` candidate by itself), and 200 of 200 frames of 1,932 bytes
// came back at p50 3.7 ms, p90 5.2, p99 8.8 round trip.
//
// 🔴 THE RELAY STAYS, AND IT IS STILL WHERE THIS STARTS. Offer, answer and
// candidates travel in the input's own room (`<room>-<name>`), each carrying
// the page's `peer` id, so no new worker exists and two browsers cannot answer
// each other. A page that cannot get a channel open keeps the relay.
//
// 🔴 A DATA CHANNEL IS NOT A WAY ROUND THE MIDI GATE. Every `ctl` message goes
// through the SAME `handle()` as a relay message (`inputs.mjs`), so
// `midiVerdict` decides both paths from one place.
//
// Two channels a browser, opened by the page:
//   pcm  unordered, no retransmits   the frames. A late frame is useless, and
//                                    ordered reliable delivery stalled behind a
//                                    lost packet at a p95 of 417 ms under 2 %
//                                    loss (proto/jam/NOTES.md, measured August).
//   ctl  unordered, reliable         input.want, midi.send, midi.panic,
//                                    audio.status. A note off must arrive, and
//                                    must not queue behind a lost note on.
//
// ⚠️ UNORDERED MEANS A NOTE OFF CAN OVERTAKE ITS NOTE ON on a fast tap, which
// leaves a note stuck on an instrument in another building. So a page numbers
// every `midi.send` (`n`, rising) and `fresher()` refuses anything older than
// the last message applied to the same key. Pure, and tested with the reorder
// as its negative control.

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

/**
 * Should a numbered message be applied, given the last number applied to its
 * key. Updates `last` when it says yes. A message with no number, or with no
 * key, is applied: an older page and a refusal-bound message both reach the
 * gate as they did before.
 */
export function fresher(last, bytes, n) {
  const key = midiKey(bytes);
  if (key == null || !Number.isFinite(n)) return true;
  const was = last.get(key);
  if (was != null && n <= was) return false;
  last.set(key, n);
  return true;
}

/**
 * The live half. `PeerConnection` is node-datachannel's class, or a fake.
 * `signal(msg)` sends into the relay room; `handle(msg, reply)` is the input's
 * own handler; `frameMs` is what the capture delivers per unit.
 */
export function createRtc({
  PeerConnection, signal, handle, log = () => {}, now = () => Date.now(),
  iceServers = ['stun:stun.cloudflare.com:3478'], maxPeers = MAX_PEERS, idleMs = PEER_IDLE_MS,
  unitMs, rate, onGone = () => {},
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
                pending: [], seq: 0, held: new Set(), last: new Map(), sent: 0, dropped: 0 };
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
      if (label !== 'ctl') { try { dc.close(); } catch {} return; }
      p.ctl = dc;
      const reply = (type, body) => { try { dc.sendMessage(JSON.stringify({ type, ...body })); } catch { /* closing */ } };
      reply('rtc.hello', { frameMs: p.frameMs, audioChannels: 1, rate });
      dc.onMessage((data) => {
        p.heard = now();
        let m;
        try { m = JSON.parse(typeof data === 'string' ? data : data.toString()); } catch { return; }
        if (!m || typeof m !== 'object') return;
        if (m.type === 'rtc.ping') return reply('rtc.pong', { re: m.id, t: m.t });
        if (m.type === 'midi.send') {
          if (!fresher(p.last, m.bytes, m.n)) return;   // overtaken; see the top of this file
          const [st, a, b] = Array.isArray(m.bytes) ? m.bytes : [];
          const kind = st & 0xF0, key = `${st & 0x0F}:${a}`;
          if (kind === 0x90 && b > 0) p.held.add(key); else if (kind === 0x80 || kind === 0x90) p.held.delete(key);
        }
        handle(m, (type, body) => reply(type, { re: m.id, ...body }));
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

  return {
    offer, candidate, pcm, sweep, peers,
    get size() { return peers.size; },
    status: () => [...peers.values()].map((p) => ({ peer: p.id, frameMs: p.frameMs, sent: p.sent, dropped: p.dropped, open: !!p.pcm && !!p.ctl })),
    close() { for (const id of [...peers.keys()]) close(id, 'shutting down'); },
  };
}
