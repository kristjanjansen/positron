// proto/jam/remote-synth.js — the PLAY-A-SYNTH CASE.
//
// A (player)      presses keys -> 16-B MIDI frames up -> receives B's return
//                 AUDIO track (WebRTC Opus) + VIDEO track (canvas synth panel),
//                 detects each note's acoustic onset SAMPLE-ACCURATELY with an
//                 AudioWorklet and the note's visible flash with rVFC pixel
//                 decode. key->ear and key->eye, per leg, truth clock.
// B (synth host)  receives MIDI, synthesizes a PERCUSSIVE instant-attack voice
//                 (square + click, velocity-scaled) into a MediaStream-
//                 AudioDestinationNode; its own AudioWorklet taps the synth bus
//                 (leg 2: B-receive -> B-audio-rendered). A canvas panel burns
//                 the wall clock (house 48-bit-ms + XOR row) and FLASHES per
//                 note, driven from the WebAudio-scheduled voice start.
//
// Legs (all epoch-µs on the same-host truth clock, ±0.15 ms):
//   1  A-send -> B-receive          (MIDI transport)
//   2  B-receive -> B-onset         (synth scheduling, B's worklet)
//   3  B-onset -> A-onset           (audio transport+decode+jitter buffer;
//                                    directly measurable — both ends share the
//                                    truth clock — and identical to
//                                    total − leg1 − leg2 by construction)
//   total = A key -> A onset-detected (decoded-track level; physical ears add
//   A's AudioContext.outputLatency, reported separately)
//
// ct->epoch mapping: nowUs() − ac.currentTime·1e6 is a sawtooth (currentTime
// steps once per render quantum); the rolling MIN over a 2 s window pins the
// quantum edge, giving ct->epoch good to ~±0.3 ms. Both A and B use it, so
// leg-3 numbers carry at most twice that.

const params = new URLSearchParams(location.search);
const ROLE = params.get('peer') || 'a';
const SESSION = params.get('session') || 'x0';
const SRC = { a: 1, b: 2 };

// ---------------- hud / log ----------------
const hud = document.getElementById('hud');
const hudLines = [];
function show(line) {
  hudLines.push(line);
  if (hudLines.length > 26) hudLines.shift();
  hud.textContent = hudLines.join('\n');
}
function log(...a) {
  const line = `[${ROLE}] ${a.join(' ')}`;
  console.log(line);
  show(line);
  fetch('/log/synth-' + ROLE, { method: 'POST', body: JSON.stringify({ t: Date.now(), line }) }).catch(() => {});
}
window.addEventListener('error', (e) => log('PAGEERR', e.message));
window.addEventListener('unhandledrejection', (e) => log('UNHANDLED', String(e.reason && e.reason.message || e.reason)));

// ---------------- truth clock (same method as bench.js) ----------------
const epochUsRaw = () => (performance.timeOrigin + performance.now()) * 1000;
const clock = { offLocalUs: 0, minRttLocalUs: 0 };
const nowUs = () => epochUsRaw() + clock.offLocalUs;
async function calibrate() {
  let best = { rtt: Infinity, off: 0 };
  for (let i = 0; i < 40; i++) {
    const a = epochUsRaw();
    const j = await (await fetch('/time-local', { cache: 'no-store' })).json();
    const b = epochUsRaw();
    const rtt = b - a;
    if (rtt < best.rtt) best = { rtt, off: j.us + rtt / 2 - b };
  }
  clock.offLocalUs = best.off; clock.minRttLocalUs = Math.round(best.rtt);
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
async function waitFor(read, pred, timeoutMs = 40000) {
  const t0 = performance.now();
  while (performance.now() - t0 < timeoutMs) {
    for (const m of await read(Math.min(5000, timeoutMs))) if (pred(m)) return m;
  }
  throw new Error('waitFor timeout');
}

// ---------------- 16-B MIDI frame (bench convention) ----------------
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

// ---------------- audio graph ----------------
const ac = new AudioContext();
await ac.audioWorklet.addModule('/onset-worklet.js');

// ct->epoch mapping, EDGE-MEDIAN method (probe-verified): sample the offset
// (nowUs − ct·1e6) only at the instant currentTime CHANGES (a 1 ms poll
// catches each 5.33 ms render step within ~2 ms) and keep the rolling MEDIAN
// of the last ~2 s of edges. A rolling MIN is poisoned by render-ahead bursts
// (headless prebuffers ~60 ms at context start and occasionally catches up in
// bursts — the min then maps 60 ms early; measured). Median bias ≈ +1 ms,
// shared by both pages.
const acMap = (() => {
  const edges = [];
  let lastCt = ac.currentTime;
  let offUs = nowUs() - ac.currentTime * 1e6;
  function loop() {
    const ct = ac.currentTime;
    if (ct !== lastCt) {
      lastCt = ct;
      const o = nowUs() - ct * 1e6;
      edges.push(o);
      if (edges.length > 400) edges.shift();
      if (edges.length >= 20) {
        const s = [...edges].sort((x, y) => x - y);
        offUs = s[Math.floor(s.length / 2)];
      }
    }
    setTimeout(loop, 1);
  }
  loop();
  return { ctUs: (ct) => ct * 1e6 + offUs, off: () => offUs, reseed: () => { edges.length = 0; } };
})();

function makeOnsetTap(name, onOnset) {
  const node = new AudioWorkletNode(ac, 'onset-detector', {
    numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
    processorOptions: { onThr: 0.05, offThr: 0.015, silenceMs: 5 },
  });
  // pull the graph: worklet -> zero gain -> destination
  const sink = ac.createGain(); sink.gain.value = 0;
  node.connect(sink).connect(ac.destination);
  node.port.onmessage = (e) => onOnset(acMap.ctUs(e.data.ct), e.data);
  return node;
}

// synth bus (B always; A for the local baseline)
const synthBus = ac.createGain();
synthBus.gain.value = 1;
const msDest = ac.createMediaStreamDestination();
synthBus.connect(msDest);
synthBus.connect(ac.destination); // audible monitor (headless: fake/silent is fine)

// percussive instant-attack voice: square (pitch) + click, velocity-scaled,
// ~25 ms total so 25/s bursts leave ~15 ms of silence between onsets
let noiseBuf = null;
function synthNote(note, vel) {
  const t = ac.currentTime; // ASAP; quantization to the render quantum IS leg 2
  const g = 0.5 * (vel / 127);
  const osc = ac.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 440 * Math.pow(2, (note - 69) / 12);
  const og = ac.createGain();
  og.gain.setValueAtTime(g, t); // NO attack ramp — instant
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
  osc.connect(og).connect(synthBus);
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
  click.connect(cg).connect(synthBus);
  click.start(t); click.stop(t + 0.005);
  return t;
}

// ---------------- onset<->note matcher (order + window; chords merge) -------
// minLatUs may be NEGATIVE for same-page matchers: the ct->epoch mapping
// wobbles ±3 ms, so a true zero-latency onset can map slightly before its note's
// send stamp; discarding it as spurious shifts the whole chain by one note
// (the +40 ms burst artifact caught in smoke run 1).
// adaptive mode (A's remote matcher): a concealed/undetected attack would
// shift a strict in-order zip one note late for the rest of the run (seen at
// full scale through the SFU). Audio onsets always arrive in send order, so
// match each onset to the pending note whose apparent latency is CLOSEST to
// the rolling median of recent matches; notes skipped over are 'unmatched'.
// Heals within one onset of a miss; equals strict order when nothing is lost.
function makeMatcher({ minLatUs = 2000, maxLatUs = 2_000_000, chordUs = 10000, adaptive = false } = {}) {
  const pending = []; // {seq, tUs}
  const out = new Map(); // seq -> {status, onsetUs?}
  let spurious = 0;
  const lats = []; // recent matched latencies, µs
  const med = () => {
    if (lats.length < 8) return null;
    const s = [...lats].sort((x, y) => x - y);
    return s[s.length >> 1];
  };
  return {
    sent(seq, tUs) { pending.push({ seq, tUs }); },
    onset(us) {
      while (pending.length && us - pending[0].tUs > maxLatUs) { out.set(pending[0].seq, { status: 'unmatched' }); pending.shift(); }
      if (!pending.length || us - pending[0].tUs < minLatUs) { spurious++; return; }
      let idx = 0;
      const m = adaptive ? med() : null;
      if (m !== null) {
        let best = Infinity;
        for (let i = 0; i < pending.length; i++) {
          const lat = us - pending[i].tUs;
          if (lat < minLatUs) break; // pending is send-ordered: later notes only get smaller
          const dev = Math.abs(lat - m);
          if (dev < best) { best = dev; idx = i; }
        }
      }
      for (let i = 0; i < idx; i++) { const p = pending.shift(); out.set(p.seq, { status: 'unmatched' }); }
      const head = pending.shift();
      out.set(head.seq, { status: 'matched', onsetUs: us });
      lats.push(us - head.tUs);
      if (lats.length > 30) lats.shift();
      while (pending.length && pending[0].tUs - head.tUs < chordUs) { out.set(pending[0].seq, { status: 'merged', mergedInto: head.seq }); pending.shift(); }
    },
    flush() { for (const p of pending) out.set(p.seq, { status: 'unmatched' }); pending.length = 0; },
    get: (seq) => out.get(seq),
    spurious: () => spurious,
  };
}

// ---------------- canvas synth panel (B) — house burned-clock style ---------
// Geometry shared with A's pixel decoder. 640x360 reference grid.
const NBLOCKS = 56, BLOCK_W = 10, ROW_X = 40, ROW_Y = 24, ROW_H = 36; // 48-bit ms + 8-bit XOR
const SQ_N = 24, SQ_W = 16, SQ_X = 40, SQ_Y = 84, SQ_H = 36;          // 16-bit seq + 8-bit XOR
const FL_X = 460, FL_Y = 150, FL_W = 140, FL_H = 140;                  // per-note flash
const panel = document.getElementById('panel');
const pctx = panel.getContext('2d', { alpha: false, desynchronized: true });
const flashQueue = []; // {seq, note, vel, t0(ct)}
let panelFrames = 0;
const bStats = { midiRecv: 0, synthOnsets: 0, lastLeg1: 0, lastLeg2: 0, lastRecvUs: 0 };

function drawBits(ctx, bits, x, y, w, h) {
  ctx.fillStyle = '#000';
  ctx.fillRect(x - 12, y - 8, bits.length * w + 24, h + 16);
  ctx.fillStyle = '#fff';
  for (let i = 0; i < bits.length; i++) if (bits[i]) ctx.fillRect(x + i * w, y, w, h);
}
function msToBits(ms) {
  const bytes = [];
  let v = ms;
  for (let i = 5; i >= 0; i--) { bytes[i] = v % 256; v = Math.floor(v / 256); }
  let ck = 0;
  for (const b of bytes) ck ^= b;
  const bits = [];
  for (const b of bytes.concat([ck])) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  return bits;
}
function seqToBits(seq) {
  const b0 = (seq >> 8) & 255, b1 = seq & 255;
  const bits = [];
  for (const b of [b0, b1, b0 ^ b1]) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  return bits;
}
function drawPanel() {
  const act = ac.currentTime;
  pctx.fillStyle = '#202020';
  pctx.fillRect(0, 0, 640, 360);
  // burned truth-clock ms (calibrated epoch, so A - burned = one-way on the truth base)
  drawBits(pctx, msToBits(Math.round(nowUs() / 1000)), ROW_X, ROW_Y, BLOCK_W, ROW_H);
  // active notes: flash + seq bits, driven off the WebAudio-scheduled voice start
  while (flashQueue.length && act - flashQueue[0].t0 > 0.06) flashQueue.shift();
  const active = flashQueue.filter((f) => f.t0 <= act);
  const newest = active[active.length - 1];
  if (newest) drawBits(pctx, seqToBits(newest.seq), SQ_X, SQ_Y, SQ_W, SQ_H);
  else { pctx.fillStyle = '#000'; pctx.fillRect(SQ_X - 12, SQ_Y - 8, SQ_N * SQ_W + 24, SQ_H + 16); }
  pctx.fillStyle = '#000';
  pctx.fillRect(FL_X - 10, FL_Y - 10, FL_W + 20, FL_H + 20);
  if (newest) {
    pctx.fillStyle = '#fff';
    pctx.fillRect(FL_X, FL_Y, FL_W, FL_H);
    pctx.fillStyle = '#000';
    pctx.font = 'bold 28px monospace';
    pctx.fillText('#' + newest.seq, FL_X + 14, FL_Y + 80);
  }
  pctx.fillStyle = '#9f9';
  pctx.font = 'bold 20px monospace';
  pctx.fillText(`SYNTH HOST  midi ${bStats.midiRecv}  onsets ${bStats.synthOnsets}`, 40, 180);
  pctx.fillText(`leg1 ${bStats.lastLeg1.toFixed(1)}ms  leg2 ${bStats.lastLeg2.toFixed(1)}ms`, 40, 210);
  pctx.fillText(new Date(nowUs() / 1000).toISOString().slice(11, 23), 40, 240);
  // motion strip so the encoder never starves
  const x = (panelFrames * 7) % 560;
  pctx.fillStyle = `hsl(${panelFrames % 360},80%,60%)`;
  pctx.fillRect(40 + x, 320, 40, 24);
  panelFrames++;
  requestAnimationFrame(drawPanel);
}

// ---------------- B: synth host ----------------
const bState = { run: null };
function bBeginRun(runId) {
  bState.run = {
    runId,
    recs: new Map(), // seq -> {seq, tSendUs, recvUs, note, vel}
    matcher: makeMatcher({ minLatUs: -8000, maxLatUs: 500_000 }),
  };
  return { ok: true, runId };
}
function bEndRun() {
  const run = bState.run;
  if (!run) return { error: 'no run' };
  run.matcher.flush();
  const recs = [];
  for (const r of run.recs.values()) {
    const m = run.matcher.get(r.seq) || { status: 'unmatched' };
    recs.push({ seq: r.seq, tSendUs: r.tSendUs, recvUs: r.recvUs, bStatus: m.status, onsetBUs: m.onsetUs });
  }
  const out = {
    runId: run.runId, recs, spuriousOnsets: run.matcher.spurious(),
    audio: { sampleRate: ac.sampleRate, baseLatency: ac.baseLatency, outputLatency: ac.outputLatency, ctOffUs: Math.round(acMap.off()) },
  };
  bState.run = null;
  return out;
}
function onWireMidi(buf) {
  const f = parseBin(buf);
  const recvUs = nowUs();
  bStats.midiRecv++;
  bStats.lastLeg1 = (recvUs - f.tUs) / 1000;
  bStats.lastRecvUs = recvUs;
  const run = bState.run;
  if (run) {
    if (run.recs.has(f.seq)) return; // dupe on unordered links
    run.recs.set(f.seq, { seq: f.seq, tSendUs: f.tUs, recvUs, note: f.note, vel: f.vel });
    run.matcher.sent(f.seq, recvUs);
  }
  const t0 = synthNote(f.note, f.vel);
  flashQueue.push({ seq: f.seq, note: f.note, vel: f.vel, t0 });
  drawHud();
}

// ---------------- A: player ----------------
const aState = { run: null, video: null, vFrames: 0, vDecoded: 0, vFlashSeen: 0, lastTotal: null, lastEye: null };
const remoteOnsetSink = { fn: null };
const localOnsetSink = { fn: null };

// worklet taps: one on the local synth bus (B leg-2 / A baseline), one on the
// remote track (created at attach time)
const synthTap = makeOnsetTap('synth-bus', (us, d) => {
  bStats.synthOnsets++;
  if (bStats.lastRecvUs) bStats.lastLeg2 = (us - bStats.lastRecvUs) / 1000; // display only
  if (ROLE === 'b' && bState.run) bState.run.matcher.onset(us);
  if (localOnsetSink.fn) localOnsetSink.fn(us, d);
});
synthBus.connect(synthTap);
let remoteTap = null;
function attachRemoteAudio(stream) {
  const srcNode = ac.createMediaStreamSource(stream);
  remoteTap = makeOnsetTap('remote', (us, d) => { if (remoteOnsetSink.fn) remoteOnsetSink.fn(us, d); });
  srcNode.connect(remoteTap);
}

// remote media element (audio must be element-attached to flow into WebAudio;
// this is also "sound reaches A's output" — the element plays out loud)
const vid = document.getElementById('vid');
const remoteStream = new MediaStream();
function onRemoteTrack(track) {
  remoteStream.addTrack(track);
  vid.srcObject = remoteStream;
  vid.play().catch((e) => log('vid.play failed', e.message));
  if (track.kind === 'audio') attachRemoteAudio(new MediaStream([track]));
  if (track.kind === 'video') startVideoDecode();
  log('remote track', track.kind);
}

// ---------------- A: rVFC pixel decode of the synth panel -------------------
const work = document.createElement('canvas');
work.width = 640; work.height = 360;
const wctx = work.getContext('2d', { alpha: false, willReadFrequently: true });
function readBits(x, y, n, w, h) {
  const img = wctx.getImageData(x, y + Math.floor(h / 2), n * w, 1).data;
  const levels = [];
  for (let i = 0; i < n; i++) {
    let s = 0, c = 0;
    for (let dx = Math.floor(w * 0.3); dx < Math.ceil(w * 0.7); dx++) { s += img[(i * w + dx) * 4 + 1]; c++; }
    levels.push(s / c);
  }
  const mn = Math.min(...levels), mx = Math.max(...levels);
  if (mx - mn < 60) return null;
  const thr = (mn + mx) / 2;
  return levels.map((l) => (l > thr ? 1 : 0));
}
function decodeClock() {
  const bits = readBits(ROW_X, ROW_Y, NBLOCKS, BLOCK_W, ROW_H);
  if (!bits) return null;
  let ms = 0;
  for (let i = 0; i < 48; i++) ms = ms * 2 + bits[i];
  let ck = 0;
  for (let i = 48; i < 56; i++) ck = ck * 2 + bits[i];
  const bytes = [];
  let v = ms;
  for (let i = 5; i >= 0; i--) { bytes[i] = v % 256; v = Math.floor(v / 256); }
  let expect = 0;
  for (const b of bytes) expect ^= b;
  return expect === ck ? ms : null;
}
function decodeSeq() {
  const bits = readBits(SQ_X, SQ_Y, SQ_N, SQ_W, SQ_H);
  if (!bits) return null;
  let b0 = 0, b1 = 0, ck = 0;
  for (let i = 0; i < 8; i++) b0 = b0 * 2 + bits[i];
  for (let i = 8; i < 16; i++) b1 = b1 * 2 + bits[i];
  for (let i = 16; i < 24; i++) ck = ck * 2 + bits[i];
  return (b0 ^ b1) === ck ? b0 * 256 + b1 : null;
}
function flashLit() {
  const img = wctx.getImageData(FL_X + 10, FL_Y + FL_H / 2 - 20, 40, 1).data;
  let s = 0;
  for (let i = 0; i < 40; i++) s += img[i * 4 + 1];
  return s / 40 > 120;
}
let vDecodeStarted = false;
let lastPresented = -1;
function startVideoDecode() {
  if (vDecodeStarted) return;
  vDecodeStarted = true;
  const onFrame = (now, meta) => {
    vid.requestVideoFrameCallback(onFrame); // re-arm FIRST (house §4.1)
    if (meta.presentedFrames === lastPresented) return;
    lastPresented = meta.presentedFrames;
    aState.vFrames++;
    try {
      wctx.drawImage(vid, 0, 0, 640, 360);
      const dispUs = (performance.timeOrigin + meta.expectedDisplayTime) * 1000 + clock.offLocalUs;
      const run = aState.run;
      const ms = decodeClock();
      if (ms !== null) {
        aState.vDecoded++;
        if (run) run.burnedOwMs.push(+(dispUs / 1000 - ms).toFixed(2));
      }
      if (flashLit()) {
        const seq = decodeSeq();
        if (seq !== null && run && !run.video.has(seq)) {
          run.video.set(seq, Math.round(dispUs));
          aState.vFlashSeen++;
        }
      }
    } catch (e) { /* decode blip — skip frame */ }
  };
  vid.requestVideoFrameCallback(onFrame);
}

// ---------------- A: schedule (sparse + 25/s bursts + chords) --------------
// scale 1: 6 bursts x 40 @40ms (240) + 80 sparse @300ms + 20 chords x3 @500ms
// = 380 sent, 340 expected distinct onsets (chord trailing notes merge).
const PENTA = [60, 62, 64, 67, 69, 72, 74, 76];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function playSchedule(sendNote, scale = 1, sched = 'mixed') {
  let seq = 0;
  const send = (phase) => { sendNote(seq, PENTA[seq % PENTA.length], 64 + (seq % 32), phase); seq++; };
  if (sched === 'sparse') {
    // singles only, 240 ms apart: every onset unambiguous (for arms where
    // burst concealment merges attacks and poisons per-note matching)
    for (let i = 0; i < Math.max(5, Math.round(320 * scale)); i++) { send('sparse'); await sleep(240); }
    return seq;
  }
  for (let b = 0; b < Math.max(1, Math.round(6 * scale)); b++) {
    for (let i = 0; i < 40; i++) { send('burst'); await sleep(40); }
    await sleep(1000);
  }
  for (let i = 0; i < Math.max(3, Math.round(80 * scale)); i++) { send('sparse'); await sleep(300); }
  for (let c = 0; c < Math.max(2, Math.round(20 * scale)); c++) {
    send('chord'); send('chord'); send('chord');
    await sleep(500);
  }
  return seq;
}

async function rtpSnapshot(pc) {
  if (!pc) return null;
  const out = {};
  const st = await pc.getStats();
  st.forEach((s) => {
    if (s.type === 'inbound-rtp') {
      out[s.kind] = {
        ts: s.timestamp,
        jbDelay: s.jitterBufferDelay, jbEmitted: s.jitterBufferEmittedCount,
        jbTarget: s.jitterBufferTargetDelay, jbMin: s.jitterBufferMinimumDelay,
        packetsReceived: s.packetsReceived, packetsLost: s.packetsLost,
        ...(s.kind === 'audio'
          ? { concealedSamples: s.concealedSamples, totalSamplesReceived: s.totalSamplesReceived }
          : { framesDecoded: s.framesDecoded, framesDropped: s.framesDropped }),
      };
    }
  });
  return out;
}

function setJitterHints(pc, ms) {
  const applied = [];
  for (const r of pc.getReceivers()) {
    const rec = { kind: r.track && r.track.kind };
    try { r.jitterBufferTarget = ms; rec.jitterBufferTarget = r.jitterBufferTarget; } catch (e) { rec.jbtErr = e.message; }
    try { r.playoutDelayHint = ms / 1000; rec.playoutDelayHint = r.playoutDelayHint; } catch (e) { rec.pdhErr = e.message; }
    applied.push(rec);
  }
  return applied;
}

const state = {}; // transport state
async function aRunRemote({ runId, hint = null, scale = 1, sched = 'mixed' }) {
  if (!state.send) throw new Error('no transport');
  let hintApplied = null;
  if (hint !== null && state.pc) {
    hintApplied = setJitterHints(state.pc, hint);
    log('hints applied', JSON.stringify(hintApplied));
    await sleep(1200); // let the jitter buffer converge
  }
  const run = {
    runId,
    recs: new Map(), // seq -> {seq, tUs, phase, note, vel}
    matcher: makeMatcher({ minLatUs: 2000, maxLatUs: 2_000_000, adaptive: true }),
    video: new Map(), // seq -> seenUs
    burnedOwMs: [],
  };
  aState.run = run;
  remoteOnsetSink.fn = (us) => { run.matcher.onset(us); };
  const statsBefore = await rtpSnapshot(state.pc);
  const sent = await playSchedule((seq, note, vel, phase) => {
    const tUs = nowUs();
    run.recs.set(seq, { seq, tUs, phase, note, vel });
    run.matcher.sent(seq, tUs);
    state.send(buildBin(seq, note, vel, SRC[ROLE], tUs));
    drawHud();
  }, scale, sched);
  await sleep(2500); // audio/video return tail
  run.matcher.flush();
  const statsAfter = await rtpSnapshot(state.pc);
  remoteOnsetSink.fn = null;
  aState.run = null;
  const recs = [];
  for (const r of run.recs.values()) {
    const m = run.matcher.get(r.seq) || { status: 'unmatched' };
    recs.push({
      seq: r.seq, phase: r.phase, tUs: r.tUs,
      aStatus: m.status, onsetAUs: m.onsetUs,
      videoUs: run.video.get(r.seq),
    });
  }
  return {
    runId, sent, recs,
    spuriousOnsets: run.matcher.spurious(),
    burnedOwMs: run.burnedOwMs,
    hintApplied,
    statsBefore, statsAfter,
    audio: { sampleRate: ac.sampleRate, baseLatency: ac.baseLatency, outputLatency: ac.outputLatency, ctOffUs: Math.round(acMap.off()) },
    video: { frames: aState.vFrames, decoded: aState.vDecoded, flashSeen: aState.vFlashSeen },
  };
}

// local baseline: A synthesizes its own notes; key -> local onset via synthTap
async function aRunLocal({ runId = 'local', scale = 1 }) {
  const run = { recs: new Map(), matcher: makeMatcher({ minLatUs: -8000, maxLatUs: 500_000 }), rawOnsets: [] };
  localOnsetSink.fn = (us, d) => { run.rawOnsets.push({ us: Math.round(us), ct: +d.ct.toFixed(5), n: d.n, peak: +d.peak.toFixed(3) }); run.matcher.onset(us); };
  const sent = await playSchedule((seq, note, vel, phase) => {
    const tUs = nowUs();
    run.recs.set(seq, { seq, tUs, phase });
    run.matcher.sent(seq, tUs);
    synthNote(note, vel);
    drawHud();
  }, scale);
  await sleep(800);
  run.matcher.flush();
  localOnsetSink.fn = null;
  const recs = [];
  for (const r of run.recs.values()) {
    const m = run.matcher.get(r.seq) || { status: 'unmatched' };
    recs.push({ seq: r.seq, phase: r.phase, tUs: r.tUs, aStatus: m.status, onsetAUs: m.onsetUs });
  }
  return {
    runId, sent, recs, spuriousOnsets: run.matcher.spurious(), rawOnsets: run.rawOnsets,
    audio: { sampleRate: ac.sampleRate, baseLatency: ac.baseLatency, outputLatency: ac.outputLatency, ctOffUs: Math.round(acMap.off()) },
  };
}

// ---------------- transports ----------------
const ENV = await (await fetch('/env.json')).json();
async function cf(method, sub, body) {
  const r = await fetch('https://elektron-rtc.kristjan-jansen.workers.dev/cf/' + sub, {
    method, headers: { Authorization: 'Bearer ' + ENV.ROOM_TOKEN, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`cf ${sub} ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}
const iceComplete = (pc) => new Promise((r) => {
  if (pc.iceGatheringState === 'complete') return r();
  const t = setTimeout(r, 4000);
  pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); r(); } };
});
const pcConnected = (pc, ms = 20000) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('pc connect timeout, state=' + pc.connectionState)), ms);
  const check = () => { if (pc.connectionState === 'connected') { clearTimeout(t); res(); } };
  pc.addEventListener('connectionstatechange', check); check();
});

async function setupP2P({ withVideo = true, tag = 'x' }) {
  const pc = new RTCPeerConnection({ iceServers: [] });
  state.pc = pc;
  const sig = `synth-sig-${SESSION}-${tag}`;
  if (ROLE === 'a') {
    const ch = pc.createDataChannel('midi', { ordered: false, maxRetransmits: 0 });
    ch.binaryType = 'arraybuffer';
    pc.addTransceiver('audio', { direction: 'recvonly' });
    if (withVideo) pc.addTransceiver('video', { direction: 'recvonly' });
    pc.ontrack = (e) => onRemoteTrack(e.track);
    const opened = new Promise((r) => { ch.onopen = r; if (ch.readyState === 'open') r(); });
    await pc.setLocalDescription(await pc.createOffer());
    await iceComplete(pc);
    await post(sig, { kind: 'offer', sdp: pc.localDescription.sdp });
    const ans = await waitFor(reader(sig), (m) => m.kind === 'answer');
    await pc.setRemoteDescription({ type: 'answer', sdp: ans.sdp });
    await pcConnected(pc);
    await opened;
    state.send = (buf) => ch.readyState === 'open' && ch.send(buf);
    return { label: `p2p ${withVideo ? 'A+V' : 'audio-only'} return, DC-unordered midi` };
  }
  // B: answerer; sends synth audio (+ video) back on the same PC
  pc.ondatachannel = (e) => {
    e.channel.binaryType = 'arraybuffer';
    e.channel.onmessage = (ev) => onWireMidi(ev.data);
  };
  const off = await waitFor(reader(sig), (m) => m.kind === 'offer');
  await pc.setRemoteDescription({ type: 'offer', sdp: off.sdp });
  const audioTrack = msDest.stream.getAudioTracks()[0];
  const videoTrack = withVideo ? panel.captureStream(30).getVideoTracks()[0] : null;
  for (const tx of pc.getTransceivers()) {
    const kind = tx.receiver.track && tx.receiver.track.kind;
    if (kind === 'audio') { await tx.sender.replaceTrack(audioTrack); tx.direction = 'sendonly'; }
    if (kind === 'video' && videoTrack) { await tx.sender.replaceTrack(videoTrack); tx.direction = 'sendonly'; }
  }
  await pc.setLocalDescription(await pc.createAnswer());
  await iceComplete(pc);
  await post(sig, { kind: 'answer', sdp: pc.localDescription.sdp });
  await pcConnected(pc);
  return { label: 'p2p synth host' };
}

async function setupSFU({ withVideo = true, tag = 'x' }) {
  const sig = `synth-sfu-${SESSION}-${tag}`;
  const pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' });
  state.pc = pc;
  pc.createDataChannel('bootstrap');
  if (ROLE === 'a') {
    pc.ontrack = (e) => onRemoteTrack(e.track);
    // datachannel-only establishment (C2-proven: sessions/new accepts it)
    await pc.setLocalDescription(await pc.createOffer());
    await iceComplete(pc);
    const sess = await cf('POST', 'sessions/new', { sessionDescription: { type: 'offer', sdp: pc.localDescription.sdp } });
    state.sid = sess.sessionId;
    if (!sess.sessionDescription) throw new Error('sessions/new returned no answer');
    await pc.setRemoteDescription(sess.sessionDescription);
    await pcConnected(pc);
    // publish the MIDI channel
    const res = await cf('POST', `sessions/${state.sid}/datachannels/new`, {
      dataChannels: [{ location: 'local', dataChannelName: 'jam-midi', ordered: false, maxRetransmits: 0 }],
    });
    const ch = pc.createDataChannel('jam-midi', { negotiated: true, id: res.dataChannels[0].id, ordered: false, maxRetransmits: 0 });
    ch.binaryType = 'arraybuffer';
    await new Promise((r, j) => { const t = setTimeout(() => j(new Error('midi dc open timeout')), 10000); ch.onopen = () => { clearTimeout(t); r(); }; });
    state.send = (buf) => ch.readyState === 'open' && ch.send(buf);
    await post(sig, { kind: 'a-ready', sessionId: state.sid });
    // pull B's tracks
    const pub = await waitFor(reader(sig), (m) => m.kind === 'b-published', 60000);
    const want = [{ location: 'remote', sessionId: pub.sessionId, trackName: 'synth-audio' }];
    if (withVideo) want.push({ location: 'remote', sessionId: pub.sessionId, trackName: 'synth-video' });
    // pull with retry: right after B publishes, CF may not have media flowing
    // yet (empty_track_error seen at full scale) — back off and retry
    let resp = null;
    for (let attempt = 1; ; attempt++) {
      resp = await cf('POST', `sessions/${state.sid}/tracks/new`, { tracks: want });
      const bad = (resp.tracks || []).filter((tr) => tr.errorCode);
      if (!bad.length) break;
      if (attempt >= 6) throw new Error(`pull ${bad[0].trackName}: ${bad[0].errorCode} ${bad[0].errorDescription || ''}`);
      log(`pull attempt ${attempt} failed (${bad[0].errorCode}) — retrying`);
      await sleep(1500);
    }
    if (resp.requiresImmediateRenegotiation) {
      await pc.setRemoteDescription(resp.sessionDescription);
      await pc.setLocalDescription(await pc.createAnswer());
      await cf('PUT', `sessions/${state.sid}/renegotiate`, {
        sessionDescription: { type: 'answer', sdp: pc.localDescription.sdp },
      });
    }
    return { label: `SFU ${withVideo ? 'A+V' : 'audio-only'} return + SFU-DC midi`, sid: state.sid };
  }
  // B: publish synth tracks, subscribe the MIDI channel
  const sess = await cf('POST', 'sessions/new');
  state.sid = sess.sessionId;
  const audioTrack = msDest.stream.getAudioTracks()[0];
  const atx = pc.addTransceiver(audioTrack, { direction: 'sendonly' });
  let vtx = null;
  if (withVideo) vtx = pc.addTransceiver(panel.captureStream(30).getVideoTracks()[0], { direction: 'sendonly' });
  await pc.setLocalDescription(await pc.createOffer());
  await iceComplete(pc);
  const tracks = [{ location: 'local', mid: atx.mid, trackName: 'synth-audio' }];
  if (vtx) tracks.push({ location: 'local', mid: vtx.mid, trackName: 'synth-video' });
  const resp = await cf('POST', `sessions/${state.sid}/tracks/new`, {
    sessionDescription: { type: 'offer', sdp: pc.localDescription.sdp }, tracks,
  });
  if (!resp.sessionDescription) throw new Error('tracks/new returned no answer: ' + JSON.stringify(resp).slice(0, 200));
  await pc.setRemoteDescription(resp.sessionDescription);
  await pcConnected(pc);
  const aReady = await waitFor(reader(sig), (m) => m.kind === 'a-ready', 60000);
  const dres = await cf('POST', `sessions/${state.sid}/datachannels/new`, {
    dataChannels: [{ location: 'remote', sessionId: aReady.sessionId, dataChannelName: 'jam-midi' }],
  });
  const ch = pc.createDataChannel('jam-midi', { negotiated: true, id: dres.dataChannels[0].id });
  ch.binaryType = 'arraybuffer';
  ch.onmessage = (ev) => onWireMidi(ev.data);
  await new Promise((r, j) => { const t = setTimeout(() => j(new Error('midi dc open timeout')), 10000); ch.onopen = () => { clearTimeout(t); r(); }; });
  await post(sig, { kind: 'b-published', sessionId: state.sid });
  return { label: 'SFU synth host', sid: state.sid };
}

function teardown() {
  try { state.pc && state.pc.close(); } catch {}
  delete state.pc; delete state.send; delete state.sid;
  // reset A's remote plumbing so the next arm re-attaches cleanly
  for (const t of remoteStream.getTracks()) remoteStream.removeTrack(t);
  vid.srcObject = null;
  vDecodeStarted = false;
  remoteTap = null;
  return { ok: true };
}

// ---------------- hud ----------------
function drawHud() {
  const a = aState;
  const lines = [
    `PLAY-A-SYNTH ${ROLE.toUpperCase()}  session=${SESSION}  sr=${ac.sampleRate}  base=${(ac.baseLatency * 1000).toFixed(1)}ms out=${((ac.outputLatency || 0) * 1000).toFixed(1)}ms  ctOff=${(acMap.off() / 1000).toFixed(1)}ms`,
  ];
  if (ROLE === 'b') {
    lines.push(`midi recv ${bStats.midiRecv}   synth onsets ${bStats.synthOnsets}`);
    lines.push(`last leg1(midi) ${bStats.lastLeg1.toFixed(1)} ms`);
  } else {
    const run = a.run;
    lines.push(`video frames ${a.vFrames}  clock-decoded ${a.vDecoded}  note-flashes ${a.vFlashSeen}`);
    if (run) lines.push(`RUN ${run.runId}: sent ${run.recs.size}  ear-matched ${[...run.recs.keys()].filter((s) => run.matcher.get(s)?.status === 'matched').length}  eye ${run.video.size}`);
  }
  const keep = hudLines.slice(-14);
  hud.textContent = lines.join('\n') + '\n---\n' + keep.join('\n');
}
setInterval(drawHud, 500);

// ---------------- boot + driver API ----------------
await calibrate();
acMap.reseed();
if (ac.state === 'suspended') await ac.resume();
requestAnimationFrame(drawPanel);
log('ready', JSON.stringify({ clock, sr: ac.sampleRate, acState: ac.state }));

// diagnostic probe: (1) currentTime step pattern, (2) immediate-start vs
// future-scheduled voice onset error — separates mapping error from
// osc.start(now) clamping.
async function probe() {
  const steps = [];
  {
    let last = ac.currentTime;
    const t0 = performance.now();
    while (performance.now() - t0 < 400) {
      const ct = ac.currentTime;
      if (ct !== last) { steps.push({ pMs: +(performance.now() - t0).toFixed(2), ct: +ct.toFixed(5), dCtMs: +((ct - last) * 1000).toFixed(2) }); last = ct; }
      await new Promise((r) => setTimeout(r, 1));
    }
  }
  const imm = [], fut = [];
  const onsets = [];
  localOnsetSink.fn = (us, d) => onsets.push({ us, ct: d.ct });
  for (let i = 0; i < 10; i++) {
    const tUs = nowUs();
    const tReq = synthNote(72, 96);
    imm.push({ tUs, tReqCt: tReq });
    await sleep(120);
  }
  for (let i = 0; i < 10; i++) {
    const t0 = ac.currentTime + 0.08;
    const g = 0.35;
    const osc = ac.createOscillator(); osc.type = 'square'; osc.frequency.value = 880;
    const og = ac.createGain();
    og.gain.setValueAtTime(g, t0); og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.02);
    osc.connect(og).connect(synthBus); osc.start(t0); osc.stop(t0 + 0.025);
    fut.push({ t0, mapT0Us: acMap.ctUs(t0) });
    await sleep(150);
  }
  // burst test: 20 notes at 40 ms — does every note produce exactly one onset?
  const burstSent = [];
  const burstOnsets = [];
  localOnsetSink.fn = (us, d) => burstOnsets.push({ ct: +d.ct.toFixed(5), us, peak: +d.peak.toFixed(3), n: d.n });
  for (let i = 0; i < 20; i++) {
    const tUs = nowUs();
    const tReq = synthNote(60 + (i % 8), 64 + (i % 32));
    burstSent.push({ i, tUs, tReqCt: +tReq.toFixed(5) });
    await sleep(40);
  }
  await sleep(300);
  localOnsetSink.fn = null;
  return {
    burst: { sent: burstSent, onsets: burstOnsets },
    steps: steps.slice(0, 40),
    imm: imm.map((x, i) => ({ ...x, onset: onsets[i] || null, keyToOnsetMs: onsets[i] ? +((onsets[i].us - x.tUs) / 1000).toFixed(2) : null, reqToOnsetMs: onsets[i] ? +((onsets[i].ct - x.tReqCt) * 1000).toFixed(2) : null })),
    fut: fut.map((x, i) => { const o = onsets[10 + i]; return { t0: +x.t0.toFixed(5), onCt: o ? +o.ct.toFixed(5) : null, errMs: o ? +((o.ct - x.t0) * 1000).toFixed(3) : null, mapVsWallMs: o ? +((o.us - x.mapT0Us) / 1000).toFixed(2) : null }; }),
    ctOffUs: Math.round(acMap.off()),
  };
}

window.rig = {
  role: ROLE,
  probe,
  clock: () => clock,
  calibrate: async () => { await calibrate(); return clock; },
  setup: async (arm, opts) => (arm === 'p2p' ? setupP2P(opts) : setupSFU(opts)),
  teardown,
  beginRun: bBeginRun,
  endRun: bEndRun,
  runRemote: aRunRemote,
  runLocal: aRunLocal,
  acInfo: () => ({ sampleRate: ac.sampleRate, baseLatency: ac.baseLatency, outputLatency: ac.outputLatency, acState: ac.state, currentTime: ac.currentTime, ctOffUs: Math.round(acMap.off()) }),
};
window.rigReady = true;
