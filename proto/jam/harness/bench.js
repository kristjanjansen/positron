// proto/jam/harness/bench.js — one page, every transport arm.
// Role via ?peer=a|b. Driven by run-bench.mjs through the /msg mailboxes.
// a = sender, b = receiver for all matrix runs (same host, direction moot).
//
// Clocks: all one-way numbers use the LOCAL-server-calibrated epoch-µs clock
// (min-RTT over loopback to /time-local, error ≪1 ms — same-host truth).
// Also computed per page: Date-vs-perf offset and the deployed selfrec /time
// min-RTT offset (the proven coarse method) — reported for agreement.

const params = new URLSearchParams(location.search);
const ROLE = params.get('peer') || 'a';
const SEED = params.get('seed') || 'x0';
const hud = document.getElementById('hud');
const hudLines = [];
function show(line) {
  hudLines.push(line);
  if (hudLines.length > 30) hudLines.shift();
  hud.textContent = hudLines.join('\n');
}
function log(...a) {
  const line = `[${ROLE}] ${a.join(' ')}`;
  console.log(line);
  show(line);
  fetch('/log/bench-' + ROLE, { method: 'POST', body: JSON.stringify({ t: Date.now(), line }) }).catch(() => {});
}
window.addEventListener('error', (e) => log('PAGEERR', e.message));
window.addEventListener('unhandledrejection', (e) => log('UNHANDLED', String(e.reason && e.reason.message || e.reason)));

// ---------------- clock ----------------
const epochUsRaw = () => (performance.timeOrigin + performance.now()) * 1000;
const clock = { offLocalUs: 0, minRttLocalUs: 0, offDateUs: 0, offDeployedUs: null, minRttDeployedUs: null };
const nowUs = () => epochUsRaw() + clock.offLocalUs;

async function calibrate() {
  // 1) local server min-RTT (the truth base)
  let best = { rtt: Infinity, off: 0 };
  for (let i = 0; i < 40; i++) {
    const a = epochUsRaw();
    const j = await (await fetch('/time-local', { cache: 'no-store' })).json();
    const b = epochUsRaw();
    const rtt = b - a;
    if (rtt < best.rtt) best = { rtt, off: j.us + rtt / 2 - b };
  }
  clock.offLocalUs = best.off; clock.minRttLocalUs = Math.round(best.rtt);
  // 2) Date.now vs performance epoch (shared OS wall clock; ±1 ms resolution)
  const ds = [];
  for (let i = 0; i < 200; i++) ds.push(Date.now() * 1000 - epochUsRaw());
  ds.sort((x, y) => x - y);
  clock.offDateUs = Math.round(ds[100]);
  // 3) deployed /time min-RTT (proven coarse method; 8 samples, rate-guard safe)
  try {
    let bd = { rtt: Infinity, off: 0 };
    for (let i = 0; i < 8; i++) {
      const a = epochUsRaw();
      const j = await (await fetch('https://selfrec.positron.studio/time', { cache: 'no-store' })).json();
      const b = epochUsRaw();
      const rtt = b - a;
      if (rtt < bd.rtt) bd = { rtt, off: j.now * 1000 + rtt / 2 - b };
    }
    clock.offDeployedUs = Math.round(bd.off); clock.minRttDeployedUs = Math.round(bd.rtt);
  } catch (e) { log('deployed /time calib failed', e.message); }
}

// ---------------- mailbox ----------------
async function post(boxName, msg) {
  await fetch('/msg/' + boxName, { method: 'POST', body: JSON.stringify(msg) });
}
function reader(boxName) {
  let cursor = 0;
  return async (waitMs = 20000) => {
    const r = await fetch(`/msg/${boxName}?after=${cursor}&wait=${waitMs}`, { cache: 'no-store' });
    const j = await r.json();
    cursor = j.next;
    return j.msgs;
  };
}
async function waitFor(read, pred, timeoutMs = 30000) {
  const t0 = performance.now();
  while (performance.now() - t0 < timeoutMs) {
    for (const m of await read(Math.min(5000, timeoutMs))) if (pred(m)) return m;
  }
  throw new Error('waitFor timeout');
}

// ---------------- payloads ----------------
// binary note frame, 16 B LE: u8 status, u8 note, u8 vel, u8 src, u32 seq, f64 tSendUs
function buildBin(seq, note, vel, src, tUs) {
  const buf = new ArrayBuffer(16);
  const dv = new DataView(buf);
  dv.setUint8(0, 0x90); dv.setUint8(1, note); dv.setUint8(2, vel); dv.setUint8(3, src);
  dv.setUint32(4, seq, true); dv.setFloat64(8, tUs, true);
  return buf;
}
function parseBin(buf) {
  const dv = new DataView(buf);
  return { status: dv.getUint8(0), note: dv.getUint8(1), vel: dv.getUint8(2), src: dv.getUint8(3), seq: dv.getUint32(4, true), tUs: dv.getFloat64(8, true) };
}
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const disp = (note) => NOTE_NAMES[note % 12] + (Math.floor(note / 12) - 1);
function buildJson(runId, seq, note, vel, tUs) {
  // the timeline payload rule: actuatable form (midi bytes) + display form
  return JSON.stringify({ type: 'note', id: runId + '-' + seq, seq, at: tUs, midi: [0x90, note, vel], display: disp(note) + ' on' });
}

// pentatonic walk for note values (matters not for latency; keeps payloads honest)
const PENTA = [60, 62, 64, 67, 69, 72, 74, 76];
const noteAt = (i) => PENTA[i % PENTA.length];

// ---------------- schedule (sender side) ----------------
// bursts: 10×40 @40 ms (25 notes/s), 1 s gaps → 400 notes
// sparse: 75 @300 ms (3.3 notes/s)          →  75 notes
// chords: 25×3 back-to-back @450 ms         →  75 notes   = 550 total
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function playSchedule(sendNote, scale = 1) {
  let seq = 0;
  const send = (phase) => { sendNote(seq, noteAt(seq), 64 + (seq % 32), phase); seq++; };
  for (let b = 0; b < Math.round(10 * scale); b++) {
    for (let i = 0; i < 40; i++) { send('burst'); await sleep(40); }
    await sleep(1000);
  }
  for (let i = 0; i < Math.round(75 * scale); i++) { send('sparse'); await sleep(300); }
  for (let c = 0; c < Math.round(25 * scale); c++) {
    send('chord'); send('chord'); send('chord');
    await sleep(450);
  }
  return seq;
}

// ---------------- receiver recording ----------------
function makeRecorder(runId) {
  const recs = [];      // [seq, onewayUs]
  const seen = new Set();
  return {
    recs, seen,
    onNote(seq, tUs) {
      const ow = nowUs() - tUs;
      if (seen.has(seq)) return; // dupes possible on unordered links
      seen.add(seq);
      recs.push([seq, Math.round(ow)]);
    },
  };
}

async function senderRun(runId, sendNote, scale) {
  await sleep(600); // receiver arms its handler on the same command; let it win the race
  const t0 = performance.now();
  const sent = await playSchedule(sendNote, scale);
  await post('done-' + runId, { sent, elapsedMs: Math.round(performance.now() - t0) });
  log('run', runId, 'sent', sent);
  return { role: 'a', runId, sent };
}
async function receiverRun(runId, rec) {
  const read = reader('done-' + runId);
  const done = await waitFor(read, (m) => m.sent !== undefined, 240000);
  await sleep(2500); // straggler grace
  const out = { role: 'b', runId, sent: done.sent, recv: rec.recs.length, recs: rec.recs };
  await fetch('/result/' + runId, { method: 'POST', body: JSON.stringify(out) });
  log('run', runId, 'recv', rec.recs.length, '/', done.sent);
  return out;
}

// ---------------- transport arms ----------------
const state = {}; // persistent across commands
const ENV = await (await fetch('/env.json')).json();

const arms = {
  // (a) WebRTC DataChannel P2P, host candidates, no relay
  'dc-direct': {
    async setup(spec) {
      // ice:'turn' = force both peers through the local Docker coturn (the
      // real-UDP-loss lever: CDP packetLoss proved a no-op in Chrome 151)
      const pc = new RTCPeerConnection(spec.ice === 'turn'
        ? { iceServers: [{ urls: 'turn:127.0.0.1:3478?transport=udp', username: 'jam', credential: 'jam' }], iceTransportPolicy: 'relay' }
        : { iceServers: [] });
      state.pc = pc;
      const sig = 'sig-dc-' + spec.session + '-' + spec.id; // unique per setup command
      if (ROLE === 'a') {
        const rel = pc.createDataChannel('rel', { ordered: true });
        const unrel = pc.createDataChannel('unrel', { ordered: false, maxRetransmits: 0 });
        rel.binaryType = 'arraybuffer'; unrel.binaryType = 'arraybuffer';
        state.ch = { rel, unrel };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await new Promise((r) => { if (pc.iceGatheringState === 'complete') r(); pc.onicegatheringstatechange = () => pc.iceGatheringState === 'complete' && r(); });
        await post(sig, { kind: 'offer', sdp: pc.localDescription.sdp });
        const ans = await waitFor(reader(sig), (m) => m.kind === 'answer');
        await pc.setRemoteDescription({ type: 'answer', sdp: ans.sdp });
      } else {
        state.ch = {};
        pc.ondatachannel = (e) => {
          e.channel.binaryType = 'arraybuffer';
          state.ch[e.channel.label] = e.channel;
        };
        const off = await waitFor(reader(sig), (m) => m.kind === 'offer');
        await pc.setRemoteDescription({ type: 'offer', sdp: off.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await new Promise((r) => { if (pc.iceGatheringState === 'complete') r(); pc.onicegatheringstatechange = () => pc.iceGatheringState === 'complete' && r(); });
        await post(sig, { kind: 'answer', sdp: pc.localDescription.sdp });
      }
      await new Promise((res, rej) => {
        const t = setTimeout(() => rej(new Error('pc connect timeout, state=' + pc.connectionState)), 15000);
        const check = () => { if (pc.connectionState === 'connected') { clearTimeout(t); res(); } };
        pc.addEventListener('connectionstatechange', check); check();
      });
      if (ROLE === 'a') {
        for (const c of Object.values(state.ch)) await new Promise((r) => c.readyState === 'open' ? r() : c.onopen = r);
      } else {
        while (!(state.ch.rel && state.ch.unrel)) await sleep(50);
      }
      const pair = pc.sctp && pc.sctp.transport && pc.sctp.transport.iceTransport.getSelectedCandidatePair
        ? pc.sctp.transport.iceTransport.getSelectedCandidatePair() : null;
      log('dc-direct up', pair ? `${pair.local.type}->${pair.remote.type} ${pair.local.address || ''}` : '');
      return { candidates: pair ? { local: pair.local.type, remote: pair.remote.type } : null };
    },
    async run(spec) {
      const chName = spec.cfg.startsWith('unrel') ? 'unrel' : 'rel';
      if (ROLE === 'a') {
        return senderRun(spec.runId, (seq, note, vel) => state.ch[chName].send(buildBin(seq, note, vel, 1, nowUs())), spec.scale);
      }
      const rec = makeRecorder(spec.runId);
      state.ch[chName].onmessage = (e) => { const f = parseBin(e.data); rec.onNote(f.seq, f.tUs); };
      return receiverRun(spec.runId, rec);
    },
    async teardown() { state.pc && state.pc.close(); delete state.pc; delete state.ch; },
  },

  // (b) CF Realtime SFU DataChannels through the elektron-rtc /cf proxy
  'sfu-dc': {
    async setup(spec) {
      const cf = async (method, sub, body) => {
        const r = await fetch('https://rtc.positron.studio/cf/' + sub, {
          method, headers: { Authorization: 'Bearer ' + ENV.ROOM_TOKEN, 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(`cf ${sub} ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
        return j;
      };
      const sig = 'sig-sfu-' + spec.session + '-' + spec.id;
      const pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' });
      state.pc = pc;
      pc.createDataChannel('bootstrap'); // forces the application m-line
      // Establishment path A: datachannel-only offer at sessions/new
      let est = null;
      {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await new Promise((r) => { if (pc.iceGatheringState === 'complete') r(); pc.onicegatheringstatechange = () => pc.iceGatheringState === 'complete' && r(); });
        try {
          const sess = await cf('POST', 'sessions/new', { sessionDescription: { type: 'offer', sdp: pc.localDescription.sdp } });
          state.sid = sess.sessionId;
          if (sess.sessionDescription) { est = sess; log('sfu est path: sessions/new+offer (datachannel-only, no media track)'); }
          else log('sfu sessions/new accepted offer body but returned no answer; sid=' + String(sess.sessionId).slice(0, 8));
        } catch (e) { log('sfu sessions/new+offer refused:', e.message); }
      }
      if (!est) {
        // Establishment path B: fake audio track (m2m-proven) + the app m-line
        if (!state.sid) state.sid = (await cf('POST', 'sessions/new')).sessionId;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const tx = pc.addTransceiver(stream.getAudioTracks()[0], { direction: 'sendonly' });
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await new Promise((r) => { if (pc.iceGatheringState === 'complete') r(); pc.onicegatheringstatechange = () => pc.iceGatheringState === 'complete' && r(); });
        est = await cf('POST', `sessions/${state.sid}/tracks/new`, {
          sessionDescription: { type: 'offer', sdp: pc.localDescription.sdp },
          tracks: [{ location: 'local', mid: tx.mid, trackName: `jam-${ROLE}/mic` }],
        });
        log('sfu est path: tracks/new with fake audio track');
      }
      if (!est.sessionDescription) throw new Error('no answer SDP: ' + JSON.stringify(est).slice(0, 300));
      await pc.setRemoteDescription(est.sessionDescription);
      await new Promise((res, rej) => {
        const t = setTimeout(() => rej(new Error('sfu pc connect timeout, state=' + pc.connectionState)), 15000);
        const check = () => { if (pc.connectionState === 'connected') { clearTimeout(t); res(); } };
        pc.addEventListener('connectionstatechange', check); check();
      });
      log('sfu pc connected, sid', state.sid.slice(0, 8));
      state.ch = {};
      const mk = (name, id, opts) => {
        const c = pc.createDataChannel(name, { negotiated: true, id, ...opts });
        c.binaryType = 'arraybuffer';
        state.ch[name] = c;
        return new Promise((res, rej) => {
          const t = setTimeout(() => rej(new Error('dc open timeout ' + name)), 10000);
          c.onopen = () => { clearTimeout(t); res(); };
          c.onerror = (e) => { clearTimeout(t); rej(new Error('dc error ' + name + ' ' + (e.error && e.error.message || ''))); };
        });
      };
      if (ROLE === 'a') {
        // publish two channels: reliable + unordered/maxRetransmits:0
        const res = await cf('POST', `sessions/${state.sid}/datachannels/new`, {
          dataChannels: [
            { location: 'local', dataChannelName: 'jam-rel' },
            { location: 'local', dataChannelName: 'jam-unrel', ordered: false, maxRetransmits: 0 },
          ],
        });
        log('sfu publish dcs:', JSON.stringify(res).slice(0, 300));
        const byName = Object.fromEntries((res.dataChannels || []).map((d) => [d.dataChannelName, d]));
        await mk('jam-rel', byName['jam-rel'].id);
        await mk('jam-unrel', byName['jam-unrel'].id, { ordered: false, maxRetransmits: 0 });
        await post(sig, { kind: 'published', sessionId: state.sid, resp: res });
      } else {
        const pub = await waitFor(reader(sig), (m) => m.kind === 'published', 60000);
        const res = await cf('POST', `sessions/${state.sid}/datachannels/new`, {
          dataChannels: [
            { location: 'remote', sessionId: pub.sessionId, dataChannelName: 'jam-rel' },
            { location: 'remote', sessionId: pub.sessionId, dataChannelName: 'jam-unrel' },
          ],
        });
        log('sfu subscribe dcs:', JSON.stringify(res).slice(0, 300));
        const byName = Object.fromEntries((res.dataChannels || []).map((d) => [d.dataChannelName, d]));
        await mk('jam-rel', byName['jam-rel'].id);
        await mk('jam-unrel', byName['jam-unrel'].id, { ordered: false, maxRetransmits: 0 });
      }
      log('sfu-dc channels open');
      return { sessionId: state.sid };
    },
    async run(spec) {
      const chName = spec.cfg.startsWith('unrel') ? 'jam-unrel' : 'jam-rel';
      if (ROLE === 'a') {
        return senderRun(spec.runId, (seq, note, vel) => state.ch[chName].send(buildBin(seq, note, vel, 1, nowUs())), spec.scale);
      }
      const rec = makeRecorder(spec.runId);
      state.ch[chName].onmessage = (e) => { const f = parseBin(e.data); rec.onNote(f.seq, f.tUs); };
      return receiverRun(spec.runId, rec);
    },
    async teardown() { state.pc && state.pc.close(); delete state.pc; delete state.ch; delete state.sid; },
  },

  // (c) deployed DO relays: cues (JSON envelope, parsed+restamped server-side)
  // and elektron-jam (verbatim relay: JSON text vs 16-B binary)
  'do-cues': {
    async setup(spec) {
      const ws = new WebSocket(`wss://cues.positron.studio/room/jam-${spec.session}/ws?token=${ENV.CUES_TOKEN}`);
      await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('cues ws error')); });
      state.ws = ws;
      log('do-cues ws open');
    },
    async run(spec) {
      if (ROLE === 'a') {
        return senderRun(spec.runId, (seq, note, vel) => {
          const tUs = nowUs();
          state.ws.send(JSON.stringify({ type: 'cue', cue: { id: spec.runId + '-' + seq, at: tUs, data: { seq, midi: [0x90, note, vel], display: disp(note) + ' on' } } }));
        }, spec.scale);
      }
      const rec = makeRecorder(spec.runId);
      state.ws.onmessage = (e) => {
        try {
          const f = JSON.parse(e.data);
          if (f.type === 'cue' && f.cue && f.cue.data && String(f.cue.id || '').startsWith(spec.runId)) rec.onNote(f.cue.data.seq, f.cue.at);
        } catch {}
      };
      return receiverRun(spec.runId, rec);
    },
    async teardown() { state.ws && state.ws.close(); delete state.ws; },
  },

  'do-jam': {
    async setup(spec) {
      const ws = new WebSocket(`wss://jam.positron.studio/room/jam-${spec.session}/ws?token=${ENV.JAM_TOKEN}`);
      ws.binaryType = 'arraybuffer';
      await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('jam ws error')); });
      state.ws = ws;
      log('do-jam ws open');
    },
    async run(spec) {
      const bin = spec.cfg.includes('bin');
      if (ROLE === 'a') {
        return senderRun(spec.runId, (seq, note, vel) => {
          state.ws.send(bin ? buildBin(seq, note, vel, 1, nowUs()) : buildJson(spec.runId, seq, note, vel, nowUs()));
        }, spec.scale);
      }
      const rec = makeRecorder(spec.runId);
      state.ws.onmessage = (e) => {
        if (e.data instanceof ArrayBuffer) { if (bin) { const f = parseBin(e.data); rec.onNote(f.seq, f.tUs); } return; }
        if (!bin) { try { const f = JSON.parse(e.data); if (f.type === 'note' && f.id.startsWith(spec.runId)) rec.onNote(f.seq, f.at); } catch {} }
      };
      return receiverRun(spec.runId, rec);
    },
    async teardown() { state.ws && state.ws.close(); delete state.ws; },
  },

  // (d) legacy 6-line echo relay (no rooms, text only — binary probed dropped)
  'legacy': {
    async setup() {
      const ws = new WebSocket('wss://data.elektron.art');
      await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('legacy ws error')); });
      state.ws = ws;
      log('legacy ws open');
    },
    async run(spec) {
      if (ROLE === 'a') {
        return senderRun(spec.runId, (seq, note, vel) => state.ws.send(buildJson(spec.runId, seq, note, vel, nowUs())), spec.scale);
      }
      const rec = makeRecorder(spec.runId);
      state.ws.onmessage = (e) => {
        try { const f = JSON.parse(e.data); if (f.type === 'note' && f.id && f.id.startsWith(spec.runId)) rec.onNote(f.seq, f.at); } catch {}
      };
      return receiverRun(spec.runId, rec);
    },
    async teardown() { state.ws && state.ws.close(); delete state.ws; },
  },

  // (e) MoQ d14 public relay via @moq/net (bundle exposes window.MoqJam)
  'moq': {
    async setup(spec) {
      if (!window.MoqJam) throw new Error('MoqJam bundle missing');
      const relay = 'https://draft-14.cloudflare.mediaoverquic.com';
      // fresh namespaces per session (d14 same-name rejoin brick)
      const ns = `jam-${spec.session}-ab`;
      if (ROLE === 'a') state.moq = await window.MoqJam.publisher(relay, ns);
      else state.moq = await window.MoqJam.subscriber(relay, ns);
      log('moq up ns=' + ns);
    },
    async run(spec) {
      if (spec.cfg === 'dgram') {
        // datagram probe: expect NON-delivery over IETF d14 (lib docs say so)
        if (ROLE === 'a') {
          return senderRun(spec.runId, (seq, note, vel) => state.moq.sendDatagram(buildBin(seq, note, vel, 1, nowUs())), 0.06);
        }
        const rec = makeRecorder(spec.runId);
        state.moq.onDatagram((payload) => { const f = parseBin(payload.buffer.slice(payload.byteOffset, payload.byteOffset + 16)); rec.onNote(f.seq, f.tUs); });
        return receiverRun(spec.runId, rec);
      }
      if (ROLE === 'a') {
        return senderRun(spec.runId, (seq, note, vel) => state.moq.send(buildBin(seq, note, vel, 1, nowUs())), spec.scale);
      }
      const rec = makeRecorder(spec.runId);
      state.moq.onMessage((payload) => {
        const buf = payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength);
        const f = parseBin(buf); rec.onNote(f.seq, f.tUs);
      });
      return receiverRun(spec.runId, rec);
    },
    async teardown() { state.moq && state.moq.close(); delete state.moq; },
  },

  // (f) raw local ws relay (relay-local.mjs on :8895, plain or Docker+netem)
  'ws-local': {
    async setup(spec) {
      const ws = new WebSocket(`ws://127.0.0.1:8895/?room=jam-${spec.session}`);
      ws.binaryType = 'arraybuffer';
      await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws-local error')); });
      state.ws = ws;
      log('ws-local open');
    },
    async run(spec) {
      const bin = spec.cfg.includes('bin');
      if (ROLE === 'a') {
        return senderRun(spec.runId, (seq, note, vel) => {
          state.ws.send(bin ? buildBin(seq, note, vel, 1, nowUs()) : buildJson(spec.runId, seq, note, vel, nowUs()));
        }, spec.scale);
      }
      const rec = makeRecorder(spec.runId);
      state.ws.onmessage = (e) => {
        if (e.data instanceof ArrayBuffer) { if (bin) { const f = parseBin(e.data); rec.onNote(f.seq, f.tUs); } return; }
        if (!bin) { try { const f = JSON.parse(e.data); if (f.type === 'note' && f.id.startsWith(spec.runId)) rec.onNote(f.seq, f.at); } catch {} }
      };
      return receiverRun(spec.runId, rec);
    },
    async teardown() { state.ws && state.ws.close(); delete state.ws; },
  },
};

// ---------------- command loop ----------------
await calibrate();
log('calib', JSON.stringify(clock));
await post('evt', { role: ROLE, kind: 'ready', clock, ua: navigator.userAgent });

const cmds = reader('cmd-' + ROLE);
for (;;) {
  const msgs = await cmds(20000);
  for (const cmd of msgs) {
    try {
      if (cmd.op === 'calib') {
        await calibrate();
        await post('evt', { role: ROLE, kind: 'calib', id: cmd.id, clock });
      } else if (cmd.op === 'setup') {
        const info = await arms[cmd.arm].setup(cmd);
        await post('evt', { role: ROLE, kind: 'setup-done', id: cmd.id, arm: cmd.arm, info: info || null });
      } else if (cmd.op === 'run') {
        const out = await arms[cmd.arm].run(cmd);
        await post('evt', { role: ROLE, kind: 'run-done', id: cmd.id, runId: cmd.runId, sent: out.sent, recv: out.recv });
      } else if (cmd.op === 'teardown') {
        await arms[cmd.arm].teardown(cmd);
        await post('evt', { role: ROLE, kind: 'teardown-done', id: cmd.id, arm: cmd.arm });
      } else if (cmd.op === 'ping') {
        await post('evt', { role: ROLE, kind: 'pong', id: cmd.id });
      }
    } catch (e) {
      log('CMD FAIL', cmd.op, cmd.arm || '', e.message);
      await post('evt', { role: ROLE, kind: 'error', id: cmd.id, op: cmd.op, arm: cmd.arm, error: String(e.message || e) });
    }
  }
}
