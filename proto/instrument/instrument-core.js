// proto/instrument/instrument-core.js — shared engine for host.html (the synth
// owner) and play.html (the remote player).
//
// Everything here is CARRIED, not invented. The pieces and where they come from:
//
//   16-B binary frame        proto/jam/jam-core.js §payload — actuatable form
//                            (raw MIDI bytes) on the wire, display derived
//                            deterministically at the receiver, the LOG carries
//                            both. Byte 0 is the real status byte, so note-OFF
//                            (0x80) rides the identical frame as note-on.
//   dedupe(key, windowMs)    jam-core.js, bounded GC — required because the MIDI
//                            channel is unordered/maxRetransmits:0.
//   truth clock + skew       workers/selfrec /time protocol: sample N times,
//                            keep the MIN-RTT sample, offset = serverNow +
//                            rtt/2 − clientRecv. Stamp at the source; the relay
//                            NEVER re-stamps (jam-core §2).
//   percussive voice         proto/jam/remote-synth.js — instant-attack square +
//                            click, ~25 ms, so the onset worklet sees exactly
//                            one attack per note. This is the SYNTHETIC SYNTH
//                            stand-in used when no real MIDI hardware is bound.
//   onset matcher            remote-synth.js makeMatcher, adaptive variant:
//                            audio onsets arrive in send order, so match each to
//                            the pending note whose apparent latency is closest
//                            to the rolling median. Heals within one onset of a
//                            concealed attack.
//   ct -> epoch map          remote-synth.js edge-MEDIAN method. Sample the
//                            offset only when ac.currentTime CHANGES; a rolling
//                            min is poisoned by headless render-ahead bursts.
//
// The onset WORKLET itself is not copied: server.mjs mounts proto/jam at /jam/,
// so both pages load the literal /jam/onset-worklet.js file.

export const epochUsRaw = () => (performance.timeOrigin + performance.now()) * 1000;

// ---------------- clock / skew ----------------------------------------------
// source 'worker': the deployed /time endpoint — the real-world case, honest to
//   ~±(min RTT)/2 across the internet.
// source 'local' : the rig server's hrtime-anchored /time-local over loopback —
//   same-host truth, offset error well under 1 ms. The verification harness uses
//   this so the reported one-way MIDI number is the transport, not the clock.
export function makeClock() {
  const c = { offUs: 0, minRttMs: 0, source: null, samples: 0 };
  const nowUs = () => epochUsRaw() + c.offUs;
  async function calibrate(source, base, n = 12) {
    const url = source === 'local' ? '/time-local' : base + '/time';
    let best = { rtt: Infinity, off: 0 };
    for (let i = 0; i < n; i++) {
      const a = epochUsRaw();
      const r = await fetch(url, { cache: 'no-store' });
      const jj = await r.json();
      const b = epochUsRaw();
      const serverUs = source === 'local' ? jj.us : jj.now * 1000;
      const rtt = b - a;
      if (rtt < best.rtt) best = { rtt, off: serverUs + rtt / 2 - b };
    }
    c.offUs = best.off;
    c.minRttMs = +(best.rtt / 1000).toFixed(2);
    c.source = source;
    c.samples = n;
    return { ...c };
  }
  return { nowUs, calibrate, info: () => ({ ...c }), offUs: () => c.offUs };
}

// ---------------- 16-B frame (jam-core.js payload rule) ----------------------
export function buildBin(seq, status, note, vel, src, tUs) {
  const buf = new ArrayBuffer(16);
  const dv = new DataView(buf);
  dv.setUint8(0, status); dv.setUint8(1, note); dv.setUint8(2, vel); dv.setUint8(3, src);
  dv.setUint32(4, seq, true); dv.setFloat64(8, tUs, true);
  return buf;
}
export function parseBin(buf) {
  const dv = new DataView(buf);
  return {
    status: dv.getUint8(0), note: dv.getUint8(1), vel: dv.getUint8(2), src: dv.getUint8(3),
    seq: dv.getUint32(4, true), tUs: dv.getFloat64(8, true),
  };
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const noteName = (n) => NOTE_NAMES[n % 12] + (Math.floor(n / 12) - 1);
export const display = (status, note, vel) =>
  `${(status & 0xf0) === 0x90 && vel > 0 ? 'on ' : 'off'} ${noteName(note)} v${vel} ch${(status & 0x0f) + 1}`;

// ---------------- dedupe (jam-core.js, bounded GC) ---------------------------
export function makeDedupe(windowMs = 30000) {
  const seen = new Map();
  return (key) => {
    const t = performance.now();
    if (seen.has(key) && t - seen.get(key) < windowMs) return true;
    seen.set(key, t);
    if (seen.size > 4096) for (const [k, v] of seen) if (t - v > windowMs) seen.delete(k);
    return false;
  };
}

// ---------------- MIDI hygiene ----------------------------------------------
// Realtime bytes (0xF8 clock, 0xFA start, 0xFC stop, 0xFE active sensing…) are
// never forwarded: a remote clock would fight the instrument's own tempo and
// active-sensing at 300 ms would flood the DataChannel for nothing.
export const isRealtime = (status) => status >= 0xf0;
export const ALL_NOTES_OFF = 123;   // CC 123
export const ALL_SOUND_OFF = 120;   // CC 120
export function allNotesOffBytes() {
  const out = [];
  for (let ch = 0; ch < 16; ch++) {
    out.push([0xb0 | ch, ALL_SOUND_OFF, 0]);
    out.push([0xb0 | ch, ALL_NOTES_OFF, 0]);
    out.push([0xb0 | ch, 64, 0]);   // sustain pedal off, else CC123 is undone
  }
  return out;
}

// ---------------- signaling client (WS to elektron-instrument) ---------------
export function connectSignal({ base, instrument, role, token, name, pid, onFrame, onClose }) {
  const wsBase = base.replace(/^http/, 'ws');
  const q = new URLSearchParams({ instrument, role, name: name || role });
  if (token) q.set('token', token);
  if (pid) q.set('pid', pid);
  const ws = new WebSocket(`${wsBase}/ws?${q}`);
  const api = {
    ws,
    send: (o) => ws.readyState === 1 && ws.send(JSON.stringify(o)),
    close: () => { try { ws.close(); } catch {} },
    ready: new Promise((res, rej) => { ws.onopen = () => res(api); ws.onerror = () => rej(new Error('signal ws failed')); }),
  };
  ws.onmessage = (e) => { if (typeof e.data === 'string' && e.data !== 'pong') { try { onFrame(JSON.parse(e.data)); } catch {} } };
  ws.onclose = (e) => onClose && onClose(e);
  return api;
}

// ---------------- WebRTC helpers (remote-synth.js) ---------------------------
export const iceComplete = (pc, ms = 4000) => new Promise((r) => {
  if (pc.iceGatheringState === 'complete') return r();
  const t = setTimeout(r, ms);
  pc.addEventListener('icegatheringstatechange', () => {
    if (pc.iceGatheringState === 'complete') { clearTimeout(t); r(); }
  });
});
export const pcConnected = (pc, ms = 25000) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('pc connect timeout, state=' + pc.connectionState)), ms);
  const check = () => { if (pc.connectionState === 'connected') { clearTimeout(t); res(); } };
  pc.addEventListener('connectionstatechange', check);
  check();
});

// ---------------- audio: ct->epoch edge-median map (remote-synth.js) ---------
export function makeAcMap(ac, nowUs) {
  const edges = [];
  let lastCt = ac.currentTime;
  let offUs = nowUs() - ac.currentTime * 1e6;
  (function loop() {
    const ct = ac.currentTime;
    if (ct !== lastCt) {
      lastCt = ct;
      edges.push(nowUs() - ct * 1e6);
      if (edges.length > 400) edges.shift();
      if (edges.length >= 20) {
        const s = [...edges].sort((x, y) => x - y);
        offUs = s[s.length >> 1];
      }
    }
    setTimeout(loop, 1);
  })();
  return { ctUs: (ct) => ct * 1e6 + offUs, off: () => offUs, reseed: () => { edges.length = 0; } };
}

export function makeOnsetTap(ac, acMap, onOnset, opts = {}) {
  const node = new AudioWorkletNode(ac, 'onset-detector', {
    numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
    processorOptions: { onThr: opts.onThr ?? 0.05, offThr: opts.offThr ?? 0.015, silenceMs: opts.silenceMs ?? 5 },
  });
  const sink = ac.createGain(); sink.gain.value = 0;
  node.connect(sink).connect(ac.destination);   // pull the graph
  node.port.onmessage = (e) => onOnset(acMap.ctUs(e.data.ct), e.data);
  return node;
}

// ---------------- synthetic synth stand-in (remote-synth.js voice) -----------
// Percussive, instant attack, ~25 ms: one unambiguous onset per note. This is
// what a real MIDI cable + audio interface returns in the hardware case.
export function makeSynthVoice(ac, out) {
  let noiseBuf = null;
  return function synthNote(note, vel) {
    const t = ac.currentTime;
    const g = 0.5 * (vel / 127);
    const osc = ac.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 440 * Math.pow(2, (note - 69) / 12);
    const og = ac.createGain();
    og.gain.setValueAtTime(g, t);                       // NO attack ramp
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    osc.connect(og).connect(out);
    osc.start(t); osc.stop(t + 0.025);
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, Math.round(ac.sampleRate * 0.01), ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const click = ac.createBufferSource(); click.buffer = noiseBuf;
    const cg = ac.createGain();
    cg.gain.setValueAtTime(0.6 * g, t);
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.004);
    click.connect(cg).connect(out);
    click.start(t); click.stop(t + 0.005);
    return t;
  };
}

// ---------------- onset<->note matcher (remote-synth.js, adaptive) -----------
export function makeMatcher({ minLatUs = 2000, maxLatUs = 2_000_000, chordUs = 10000, adaptive = true } = {}) {
  const pending = [];
  const out = new Map();
  const lats = [];
  let spurious = 0;
  const med = () => {
    if (lats.length < 8) return null;
    const s = [...lats].sort((x, y) => x - y);
    return s[s.length >> 1];
  };
  return {
    sent(seq, tUs) { pending.push({ seq, tUs }); },
    onset(us) {
      while (pending.length && us - pending[0].tUs > maxLatUs) { out.set(pending[0].seq, { status: 'unmatched' }); pending.shift(); }
      if (!pending.length || us - pending[0].tUs < minLatUs) { spurious++; return null; }
      let idx = 0;
      const m = adaptive ? med() : null;
      if (m !== null) {
        let best = Infinity;
        for (let i = 0; i < pending.length; i++) {
          const lat = us - pending[i].tUs;
          if (lat < minLatUs) break;
          const dev = Math.abs(lat - m);
          if (dev < best) { best = dev; idx = i; }
        }
      }
      for (let i = 0; i < idx; i++) { const p = pending.shift(); out.set(p.seq, { status: 'unmatched' }); }
      const head = pending.shift();
      out.set(head.seq, { status: 'matched', onsetUs: us });
      const lat = us - head.tUs;
      lats.push(lat);
      if (lats.length > 30) lats.shift();
      while (pending.length && pending[0].tUs - head.tUs < chordUs) { out.set(pending[0].seq, { status: 'merged' }); pending.shift(); }
      return { seq: head.seq, latUs: lat };
    },
    flush() { for (const p of pending) out.set(p.seq, { status: 'unmatched' }); pending.length = 0; },
    get: (seq) => out.get(seq),
    spurious: () => spurious,
  };
}

// ---------------- IndexedDB backstop (proto/selfrec/participant.html) --------
// selfrec's proven "never drop" buffer, generalised from one media chunk to any
// unit of work, so the SAME shape guards both lanes: the event batches and the
// media chunks. Park on failure, drain oldest-first on reconnect, track a
// high-water mark, and never lose an item silently — what cannot be sent by
// finalize time is REPORTED, not forgotten.
//
// ORDER IS PART OF CORRECTNESS here, which is the one thing selfrec did not
// have to care about: the session DO enforces a monotonic `seq` per (session,
// source), so a batch that overtook a parked one would be rejected as a
// duplicate and the parked one lost forever. Hence the rule: **once anything is
// parked, everything later is parked too, and the drain is the only sender.**
export function makeBackstop({ name, store = 'q', send, log = () => {} }) {
  let db = null, k = 0, draining = false, timer = null, backoffMs = 400;
  const BACKOFF_MAX = 5000;
  const M = {
    name, ready: false, parked: 0, items: 0, bytes: 0, hwmItems: 0, hwmBytes: 0,
    sentDirect: 0, sentDrained: 0, failures: 0, exhausted: 0,
    firstParkAt: null, onlineAt: null, drainedAt: null, drainMs: null,
  };
  const write = (fn) => new Promise((res, rej) => {
    const t = db.transaction(store, 'readwrite');
    fn(t.objectStore(store));
    t.oncomplete = res; t.onerror = () => rej(t.error);
  });

  async function all() {
    const rows = await new Promise((res, rej) => {
      const r = db.transaction(store, 'readonly').objectStore(store).getAll();
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return rows.sort((a, b) => a.k - b.k);
  }
  async function account(rows) {
    rows = rows || await all();
    M.items = rows.length;
    M.bytes = rows.reduce((n, r) => n + (r.bytes || 0), 0);
    if (M.items > M.hwmItems) M.hwmItems = M.items;
    if (M.bytes > M.hwmBytes) M.hwmBytes = M.bytes;
    return rows;
  }
  async function park(rec, why) {
    await write((s) => s.put({ ...rec, k: ++k, parkedAt: Date.now() }));
    M.parked++;
    if (M.firstParkAt === null) M.firstParkAt = Date.now();
    await account();
    log(`backstop parked ${rec.label || ''} — ${M.items} items / ${M.bytes} B — ${String(why).slice(0, 100)}`);
    schedule();
  }
  function schedule() {
    if (timer) return;
    timer = setTimeout(() => { timer = null; drain().catch(() => {}); }, backoffMs);
  }
  async function drain() {
    if (draining || !M.ready) return M;
    draining = true;
    try {
      const rows = await account();
      if (!rows.length) return M;
      if (!navigator.onLine) { backoffMs = Math.min(BACKOFF_MAX, backoffMs * 2); schedule(); return M; }
      for (const r of rows) {                       // OLDEST FIRST — see above
        try {
          await send(r);
          M.sentDrained++;
          await write((s) => s.delete(r.k));
          await account();
          backoffMs = 400;
        } catch (e) {
          M.failures++;
          backoffMs = Math.min(BACKOFF_MAX, backoffMs * 2);
          log(`backstop drain retry in ${backoffMs} ms — ${String(e && e.message || e).slice(0, 100)}`);
          schedule();
          return M;
        }
      }
      if (M.firstParkAt !== null && !M.items && M.drainedAt === null) {
        M.drainedAt = Date.now();
        M.drainMs = M.drainedAt - (M.onlineAt || M.firstParkAt);
        log(`backstop drained: ${M.sentDrained} items in ${M.drainMs} ms (high water ${M.hwmItems} items / ${M.hwmBytes} B)`);
      }
      return M;
    } finally { draining = false; }
  }

  // THE ONLY ENTRY POINT. Direct when the queue is empty and the network is
  // believed up; parked otherwise. `send` must throw to mean "not delivered".
  async function offer(rec) {
    if (!M.ready) { try { const r = await send(rec); M.sentDirect++; return { ok: true, result: r }; } catch (e) { return { ok: false, lost: true, error: e }; } }
    if (M.items || draining || !navigator.onLine) {
      await park(rec, navigator.onLine ? 'backstop queue not empty (order)' : 'navigator offline');
      return { ok: false, parked: true };
    }
    try { const r = await send(rec); M.sentDirect++; return { ok: true, result: r }; }
    catch (e) { M.failures++; await park(rec, e && e.message || e); return { ok: false, parked: true }; }
  }

  // bounded wait used at finalize: what is still parked afterwards is the
  // DEGRADED set and must be named in the manifest, never dropped quietly.
  async function settle(ms = 45000) {
    const t0 = Date.now();
    for (;;) {
      const rows = await account();
      if (!rows.length && !draining) return { drained: true, left: 0, rows: [] };
      if (Date.now() - t0 > ms) { M.exhausted = rows.length; return { drained: false, left: rows.length, rows }; }
      schedule();
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  async function open() {
    db = await new Promise((res, rej) => {
      const r = indexedDB.open(name, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(store, { keyPath: 'k' });
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    // rows left by a crashed previous run of the same name belong to a dead
    // session; replaying them into this one would corrupt it (selfrec §main)
    await write((s) => s.clear());
    M.ready = true;
    return M;
  }
  addEventListener('online', () => {
    M.onlineAt = Date.now();
    backoffMs = 400;
    if (timer) { clearTimeout(timer); timer = null; }
    drain().catch(() => {});
  });
  addEventListener('offline', () => { M.offlineAt = Date.now(); });

  return { open, offer, drain, settle, all, stats: () => ({ ...M }), pending: () => M.items };
}

// ---------------- stats ------------------------------------------------------
export function dist(vals) {
  if (!vals || !vals.length) return null;
  const s = [...vals].sort((a, b) => a - b);
  const at = (p) => +s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))].toFixed(2);
  return { n: s.length, p50: at(50), p95: at(95), p99: at(99), min: +s[0].toFixed(2), max: +s[s.length - 1].toFixed(2) };
}
