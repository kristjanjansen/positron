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
// @moq/hang's Container.Consumer narrates its own group decisions through
// console.warn ("skipping old group" / "skipping slow group" / "buffer reset").
// Those are the only view into why a track stalls, so route them into the log
// sink (capped — a stuttering consumer can warn per group).
let warnBudget = 60;
const rawWarn = console.warn.bind(console);
console.warn = (...a) => {
  rawWarn(...a);
  if (warnBudget-- > 0) log('WARN', a.map((x) => (typeof x === 'string' ? x : String(x))).join(' ').slice(0, 200));
};

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
await ac.audioWorklet.addModule('/playout-worklet.js'); // C8: MoQ return path

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
// Bus keep-alive (C8 defect 2). A started ConstantSourceNode contributes
// EXACTLY zero samples (offset 0) but counts as a playing source, so Chrome
// never marks the bus silent and never hands a downstream AudioWorkletNode an
// empty input array. Without it the pcm-capture tap saw no input at all from
// the second MoQ arm onward — the encoder had nothing to encode, the audio
// track carried zero groups, and A starved through every subscribe retry.
const busKeepAlive = ac.createConstantSource();
busKeepAlive.offset.value = 0;
busKeepAlive.connect(synthBus);
busKeepAlive.start();

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
    pub0: state.moqPub ? { a: state.moqPub.published, v: state.moqPub.vPublished, vDrop: state.moqPub.vDropped } : null,
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
    moqPub: state.moqPub ? state.moqPub.stats() : undefined,
    moqPubRun: state.moqPub && run.pub0
      ? { aPublished: state.moqPub.published - run.pub0.a, vPublished: state.moqPub.vPublished - run.pub0.v, vDropped: state.moqPub.vDropped - run.pub0.vDrop }
      : null,
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
// shared panel scan (post-draw): burned clock row + note flash+seq bits.
// dispUs = when this frame is considered visible, truth-clock µs.
function scanPanel(dispUs) {
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
      scanPanel((performance.timeOrigin + meta.expectedDisplayTime) * 1000 + clock.offLocalUs);
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
  if (state.moqA) state.moqA.beginRun();
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
  const moqRun = state.moqA ? state.moqA.endRun() : null;
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
    moq: moqRun,
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

async function setupP2P({ withVideo = true, withAudio = true, tag = 'x' }) {
  const pc = new RTCPeerConnection({ iceServers: [] });
  state.pc = pc;
  const sig = `synth-sig-${SESSION}-${tag}`;
  if (ROLE === 'a') {
    const ch = pc.createDataChannel('midi', { ordered: false, maxRetransmits: 0 });
    ch.binaryType = 'arraybuffer';
    if (withAudio) pc.addTransceiver('audio', { direction: 'recvonly' });
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
    return { label: `p2p ${withAudio ? (withVideo ? 'A+V' : 'audio-only') : (withVideo ? 'video-only' : 'DC-only')} return, DC-unordered midi` };
  }
  // B: answerer; sends synth audio (+ video) back on the same PC
  pc.ondatachannel = (e) => {
    e.channel.binaryType = 'arraybuffer';
    e.channel.onmessage = (ev) => onWireMidi(ev.data);
  };
  const off = await waitFor(reader(sig), (m) => m.kind === 'offer');
  await pc.setRemoteDescription({ type: 'offer', sdp: off.sdp });
  const audioTrack = withAudio ? msDest.stream.getAudioTracks()[0] : null;
  const videoTrack = withVideo ? panel.captureStream(30).getVideoTracks()[0] : null;
  for (const tx of pc.getTransceivers()) {
    const kind = tx.receiver.track && tx.receiver.track.kind;
    if (kind === 'audio' && audioTrack) { await tx.sender.replaceTrack(audioTrack); tx.direction = 'sendonly'; }
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

// ---------------- (c) MoQ d14 audio(/video) return path (C8) ----------------
// B: synth bus -> pcm-capture worklet (128-frame quanta) -> AudioEncoder Opus
//    low-delay -> 12-B header {seq u32, sendUs f64} + opus bytes -> hang legacy
//    frame (media-ts µs on the truth clock) -> MoQ track 'audio', new group per
//    groupMs of media time (groupMs=0 -> single-frame group per chunk).
//    Optional 'video': panel canvas 30 fps -> VP8 realtime -> 1-B keyflag +
//    bytes -> MoQ track 'video', group per keyframe (1 s GOP).
// A: subscribe (Container.Consumer latency 0) -> FIFO-mapped AudioDecoder
//    (§10.2 trap: decoder output timestamps are fiction — the 12-B header +
//    encoded-chunk ts ride a FIFO through the decoder) -> pcm-playout worklet
//    ring buffer (minimal prebuffer floor, underrun accounting, optional
//    adaptive growth) -> same onset worklet as the WebRTC arms -> destination.
const MOQ_RELAY = 'https://draft-14.cloudflare.mediaoverquic.com';
const pdist = (vals) => {
  if (!vals.length) return null;
  const s = [...vals].sort((x, y) => x - y);
  const pick = (p) => +s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))].toFixed(2);
  return { n: s.length, p50: pick(50), p95: pick(95), p99: pick(99), min: +s[0].toFixed(2), max: +s[s.length - 1].toFixed(2) };
};

async function pickOpusConfig(preferUs = 0) {
  const base = { codec: 'opus', sampleRate: 48000, numberOfChannels: 1, bitrate: 64000 };
  const cands = [
    ...(preferUs ? [
      { ...base, opus: { frameDuration: preferUs, application: 'lowdelay', useinbandfec: false, usedtx: false } },
      { ...base, opus: { frameDuration: preferUs } },
    ] : []),
    { ...base, opus: { frameDuration: 2500, application: 'lowdelay', useinbandfec: false, usedtx: false } },
    { ...base, opus: { frameDuration: 5000, application: 'lowdelay', useinbandfec: false, usedtx: false } },
    { ...base, opus: { frameDuration: 2500 } },
    { ...base, opus: { frameDuration: 5000 } },
    { ...base, opus: { frameDuration: 10000 } },
    { ...base, opus: { frameDuration: 20000 } },
    { ...base },
  ];
  for (const c of cands) {
    try {
      const s = await AudioEncoder.isConfigSupported(c);
      if (s.supported) return { cfg: c, normalized: s.config || c };
    } catch { /* unsupported member/value — next */ }
  }
  throw new Error('no opus AudioEncoder config supported');
}

// Page-lifetime realtime pull on B's MediaStream destination (see the call site).
let pacerEl = null;
function ensurePacer() {
  if (!pacerEl) {
    pacerEl = new Audio();
    pacerEl.srcObject = msDest.stream;
    pacerEl.muted = true;
  }
  if (pacerEl.paused) pacerEl.play().catch((e) => log('moq pacer play failed', e.message));
  return pacerEl;
}

// Page-lifetime PCM capture tap on the synth bus (C8 defect 2, second half).
// A capNode built fresh per arm and torn down with the arm NEVER received input
// on the second build: ac stayed 'running' at realtime, the pacer kept pulling,
// the encoder stayed 'configured', yet process() saw an empty input array
// forever (cap=0 over 55 s). Building the tap ONCE and only swapping the
// consumer per arm sidesteps the whole rebuild path; the node that works on arm
// one is the node every later arm uses.
let capNodeShared = null, capSinkShared = null, capConsumer = null;
function ensureCapture() {
  if (!capNodeShared) {
    capNodeShared = new AudioWorkletNode(ac, 'pcm-capture', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
    capSinkShared = ac.createGain(); capSinkShared.gain.value = 0;
    capNodeShared.connect(capSinkShared).connect(ac.destination);
    synthBus.connect(capNodeShared);
    capNodeShared.port.onmessage = (e) => { if (capConsumer) capConsumer(e); };
  }
  return capNodeShared;
}

async function bStartMoqPublish({ withVideo, groupMs, frameUs = 0, tag }) {
  await import('/moq/www/moq-synth.js');
  const ns = `obsynth-${Date.now().toString(36)}-${tag}`; // §13.4 fresh-name discipline
  const pub = await window.MoqSynth.publisher(MOQ_RELAY, ns, { withVideo });
  log('moq pub connected', ns, 'version', pub.version || '?');
  const { cfg, normalized } = await pickOpusConfig(frameUs);
  const frameDurUs = (cfg.opus && cfg.opus.frameDuration) || 20000;
  const mp = {
    ns, pub, seq: 0, published: 0, bytes: 0, vPublished: 0, vDropped: 0,
    groupMsUs: groupMs * 1000, frameDurUs, encCfg: cfg, encCfgNorm: normalized,
    aDesc: null, groupStart: null, vEnc: null, vTimer: null, encErrors: 0,
    setGroupMs(ms) { this.groupMsUs = ms * 1000; },
    stats() {
      return {
        ns: this.ns, published: this.published, bytes: this.bytes, encQueue: this.enc ? this.enc.encodeQueueSize : null,
        vPublished: this.vPublished, vDropped: this.vDropped, encErrors: this.encErrors,
        groupMs: this.groupMsUs / 1000, frameDurUs: this.frameDurUs,
        renderDeficitMs: this.renderDeficitMs, maxRenderDeficitMs: this.maxRenderDeficitMs,
      };
    },
  };
  let firstOutResolve;
  const firstOut = new Promise((r) => (firstOutResolve = r));
  const enc = new AudioEncoder({
    output: (chunk, meta) => {
      try {
        if (mp.aDesc === null) {
          const d = meta && meta.decoderConfig && meta.decoderConfig.description;
          if (d) {
            const u8 = d instanceof ArrayBuffer ? new Uint8Array(d) : new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
            mp.aDesc = btoa(String.fromCharCode(...u8));
          } else mp.aDesc = '';
          firstOutResolve();
        }
        const sendUs = nowUs();
        const payload = new Uint8Array(12 + chunk.byteLength);
        const dv = new DataView(payload.buffer);
        dv.setUint32(0, mp.seq, true);
        dv.setFloat64(4, sendUs, true);
        chunk.copyTo(payload.subarray(12));
        const key = mp.groupStart === null || mp.groupMsUs === 0 || chunk.timestamp - mp.groupStart >= mp.groupMsUs;
        if (key) mp.groupStart = chunk.timestamp;
        pub.audioWrite(payload, chunk.timestamp, key);
        mp.seq++; mp.published++; mp.bytes += payload.byteLength;
      } catch (e) { mp.encErrors++; if (mp.encErrors < 5) log('moq audioWrite err', e.message); }
    },
    error: (e) => log('moq aenc err', e.message),
  });
  enc.configure(cfg);
  mp.enc = enc;

  // realtime pacing pin: in the WebRTC arms the PC pulls msDest and keeps B's
  // context rendering realtime; without a consumer the headless context
  // free-runs in bursts (observed: 0.2-2.9 s render stalls + catch-up bursts
  // -> A-side starve/trim thrash + early-biased ct map). A muted audio element
  // consuming msDest restores the realtime pull.
  //
  // ONE element for the page's whole life (C8 defect 2): a per-arm element that
  // teardown paused + detached left the SECOND MoQ arm with no puller at all —
  // B's context never advanced, the capture worklet never posted a quantum, the
  // audio track carried zero groups, and A's subscriber (correctly) starved
  // through all 15 retries. Never paused, never re-pointed.
  const pacer = ensurePacer();
  // PCM capture: worklet tap on the synth bus, 128-frame quanta, epoch-µs
  // media timestamps anchored once (edge-median ct map) + exact sample count
  const capNode = ensureCapture();
  let anchorUs = null, samples = 0;
  mp.capMsgs = 0;
  capConsumer = (e) => {
    mp.capMsgs++;
    const { ct, pcm } = e.data;
    if (!pcm || enc.state !== 'configured') return;
    if (anchorUs === null) { anchorUs = acMap.ctUs(ct); samples = 0; }
    const ts = anchorUs + (samples / 48000) * 1e6;
    samples += pcm.length;
    // render-deficit diagnostic: how far B's context lags wall-clock realtime
    const deficitMs = (nowUs() - (anchorUs + (samples / 48000) * 1e6)) / 1000;
    mp.renderDeficitMs = +deficitMs.toFixed(1);
    if (deficitMs > (mp.maxRenderDeficitMs || 0)) mp.maxRenderDeficitMs = +deficitMs.toFixed(1);
    try {
      const ad = new AudioData({
        format: 'f32-planar', sampleRate: 48000, numberOfFrames: pcm.length,
        numberOfChannels: 1, timestamp: Math.round(ts), data: pcm,
      });
      enc.encode(ad);
      ad.close();
    } catch (err) { mp.encErrors++; }
  };
  mp.capNode = capNode; mp.pacer = pacer;

  if (withVideo) {
    const vEnc = new VideoEncoder({
      output: (chunk) => {
        try {
          const p = new Uint8Array(1 + chunk.byteLength);
          p[0] = chunk.type === 'key' ? 1 : 0;
          chunk.copyTo(p.subarray(1));
          pub.videoWrite(p, chunk.timestamp, chunk.type === 'key');
          mp.vPublished++;
        } catch (e) { if (mp.vPublished < 3) log('moq videoWrite err', e.message); }
      },
      error: (e) => log('moq venc err', e.message),
    });
    vEnc.configure({ codec: 'vp8', width: 640, height: 360, framerate: 30, bitrate: 2_000_000, latencyMode: 'realtime' });
    let vFrame = 0;
    mp.vEnc = vEnc;
    mp.vTimer = setInterval(() => {
      if (vEnc.state !== 'configured') return;
      if (vEnc.encodeQueueSize > 3) { mp.vDropped++; return; }
      const vf = new VideoFrame(panel, { timestamp: Math.round(nowUs()) });
      vEnc.encode(vf, { keyFrame: vFrame % 30 === 0 });
      vf.close();
      vFrame++;
    }, 1000 / 30);
  }

  // publisher heartbeat: separates "B never produced" from "B produced and the
  // relay never asked" (track.used) from "B produced, relay subscribed, and it
  // still did not arrive".
  mp.diagTimer = setInterval(() => {
    const u = pub.used ? pub.used() : null;
    // capture-starvation guard: a context with nothing pulling it renders
    // nothing, so the whole return path is silent with no error anywhere.
    if (mp.capMsgs === (mp.lastCapMsgs || 0)) {
      mp.capStalls = (mp.capStalls || 0) + 1;
      if (mp.capStalls <= 5) {
        log(`CAPSTALL cap=${mp.capMsgs} ac=${ac.state}/${ac.currentTime.toFixed(2)}`);
        try { ac.resume(); } catch {} ensurePacer();
        if (mp.capStalls === 2) { // last resort: rebuild the shared tap
          try { synthBus.disconnect(capNodeShared); } catch {}
          try { capNodeShared.disconnect(); capSinkShared.disconnect(); } catch {}
          capNodeShared = null;
          const c = capConsumer; ensureCapture(); capConsumer = c;
          log('CAPSTALL rebuilt shared capture tap');
        }
        if (mp.capStalls === 3) {
          // Decide it: a capture node fed by its OWN started oscillator. Posts
          // => the worklet thread is alive and the synth bus is the silent one;
          // silent => the AudioWorklet scope itself is dead.
          try {
            const n = new AudioWorkletNode(ac, 'pcm-capture', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
            const g = ac.createGain(); g.gain.value = 0;
            n.connect(g).connect(ac.destination);
            const o = ac.createOscillator(); o.frequency.value = 440; o.connect(n); o.start();
            let got = 0; n.port.onmessage = () => { got++; };
            setTimeout(() => { log(`CAPPROBE isolated-source msgs=${got}`); try { o.stop(); o.disconnect(); n.disconnect(); g.disconnect(); } catch {} }, 1000);
          } catch (e) { log('CAPPROBE failed', e.message); }
        }
      }
    } else mp.capStalls = 0;
    mp.lastCapMsgs = mp.capMsgs;
    log(`PUBHB a=${mp.published} v=${mp.vPublished} vDrop=${mp.vDropped} encQ=${enc.encodeQueueSize}`
      + ` used=${u ? `${u.audio}/${u.video}` : '?'} closed=${pub.isClosed()} deficit=${mp.renderDeficitMs}`
      + ` cap=${mp.capMsgs} encState=${enc.state} ac=${ac.state}/${ac.currentTime.toFixed(2)} pacer=${pacer.paused ? 'paused' : 'playing'}`);
  }, 3000);

  await Promise.race([firstOut, sleep(3000)]);
  state.moqPub = mp;
  return {
    ns,
    acfg: {
      codec: 'opus', sampleRate: 48000, numberOfChannels: 1,
      desc: mp.aDesc || null, frameDurUs, groupMs, encCfg: { bitrate: cfg.bitrate, opus: cfg.opus || null }, encCfgNorm: normalized,
    },
  };
}

async function aStartMoqSubscribe({ ns, acfg, withVideo, floorMs, adaptive }) {
  await import('/moq/www/moq-synth.js');
  const playNode = new AudioWorkletNode(ac, 'pcm-playout', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] });
  remoteTap = makeOnsetTap('moq-remote', (us, d) => { if (remoteOnsetSink.fn) remoteOnsetSink.fn(us, d); });
  playNode.connect(remoteTap);
  playNode.connect(ac.destination); // audible monitor (headless: fake sink)
  const ma = {
    ns, playNode, floorMs, adaptive,
    recvTotal: 0, decodedTotal: 0, decErrors: 0, gapInsertMsTotal: 0, discontTotal: 0,
    staleDropped: 0, // join-replay chunks (apparent transit > 400 ms) never fed to the ring
    vRecv: 0, vDecoded: 0, vDecErrors: 0,
    vGroups: 0, vLastGroup: null, vLastRecvUs: 0, vDiscont: 0, vStalls: 0,
    worklet: { latest: null },
    run: null,
    setFloor(ms, adapt = false) {
      this.floorMs = ms; this.adaptive = adapt;
      playNode.port.postMessage({ cmd: 'floor', ms, adaptive: adapt, maxMs: 250 });
    },
    beginRun() {
      this.run = {
        transit: [], decodeMs: [], buffered: [], floorSeen: [],
        seqs: new Set(), seqMin: Infinity, seqMax: -1, dup: 0,
        gap0: this.gapInsertMsTotal, dec0: this.decErrors, disc0: this.discontTotal,
        stale0: this.staleDropped,
        v0: { recv: this.vRecv, dec: this.vDecoded, decErr: this.vDecErrors, groups: this.vGroups, resubs: this.vResubs || 0, stalls: this.vStalls, disc: this.vDiscont },
        starves: [],
        w0: this.worklet.latest ? { ...this.worklet.latest } : null,
      };
    },
    endRun() {
      const r = this.run; this.run = null;
      if (!r) return null;
      const w1 = this.worklet.latest;
      const expected = r.seqMax >= r.seqMin ? r.seqMax - r.seqMin + 1 : 0;
      const recv = r.seqs.size;
      return {
        ns: this.ns, floorMsSet: this.floorMs, adaptive: this.adaptive,
        recvChunks: recv, expectedChunks: expected,
        lostChunks: Math.max(0, expected - recv),
        lostPct: expected ? +((100 * (expected - recv)) / expected).toFixed(3) : null,
        dupChunks: r.dup,
        discontinuities: this.discontTotal - r.disc0,
        transitMs: pdist(r.transit), decodeMs: pdist(r.decodeMs),
        ringBufferedMs: pdist(r.buffered),
        floorMsEnd: r.floorSeen.length ? r.floorSeen[r.floorSeen.length - 1] : this.floorMs,
        underruns: w1 && r.w0 ? w1.underruns - r.w0.underruns : null,
        underrunMs: w1 && r.w0 ? +(w1.underrunMs - r.w0.underrunMs).toFixed(1) : null,
        trimmedMs: w1 && r.w0 && w1.trimmedMs !== undefined ? +(w1.trimmedMs - (r.w0.trimmedMs || 0)).toFixed(1) : null,
        trimEvents: w1 && r.w0 && w1.trimEvents !== undefined ? w1.trimEvents - (r.w0.trimEvents || 0) : null,
        gapInsertMs: +(this.gapInsertMsTotal - r.gap0).toFixed(1),
        staleDropped: this.staleDropped - r.stale0,
        video: {
          recv: this.vRecv - r.v0.recv, decoded: this.vDecoded - r.v0.dec,
          decErrors: this.vDecErrors - r.v0.decErr, groups: this.vGroups - r.v0.groups,
          discont: this.vDiscont - r.v0.disc, stalls: this.vStalls - r.v0.stalls,
          resubs: (this.vResubs || 0) - r.v0.resubs,
        },
        starveCount: r.starves.length,
        starvesTop: [...r.starves].sort((x, y) => y.durMs - x.durMs).slice(0, 5),
        decErrors: this.decErrors - r.dec0,
      };
    },
  };
  playNode.port.onmessage = (e) => {
    if (e.data.stats) {
      ma.worklet.latest = e.data.stats;
      if (ma.run) {
        ma.run.buffered.push(+e.data.stats.bufferedMs.toFixed(2));
        ma.run.floorSeen.push(+e.data.stats.floorMs.toFixed(1));
      }
    }
    if (e.data.starve && ma.run) {
      ma.run.starves.push({ atUs: Math.round(acMap.ctUs(e.data.starve.ct)), durMs: +e.data.starve.durMs.toFixed(1) });
      if (ma.run.starves.length > 300) ma.run.starves.shift();
    }
  };
  ma.setFloor(floorMs, adaptive);

  const adcfg = { codec: acfg.codec, sampleRate: acfg.sampleRate, numberOfChannels: acfg.numberOfChannels };
  if (acfg.desc) adcfg.description = Uint8Array.from(atob(acfg.desc), (c) => c.charCodeAt(0));
  const inQ = []; // §10.2: FIFO of encoded-chunk metadata through the decoder
  let lastEndTs = null;
  const dec = new AudioDecoder({
    output: (ad) => {
      const decUs = nowUs();
      const meta = inQ.shift();
      ma.decodedTotal++;
      // gap insert: keep the ring aligned with source time across lost chunks
      if (meta) {
        if (lastEndTs !== null && meta.tsUs - lastEndTs > 1000) {
          const gapUs = Math.min(meta.tsUs - lastEndTs, 500000);
          const n = Math.round((gapUs / 1e6) * 48000);
          playNode.port.postMessage({ silence: n });
          ma.gapInsertMsTotal += gapUs / 1000;
        }
        lastEndTs = meta.tsUs + acfg.frameDurUs;
      }
      const pcm = new Float32Array(ad.numberOfFrames);
      try {
        ad.copyTo(pcm, { planeIndex: 0, format: 'f32-planar' });
      } catch {
        const inter = new Float32Array(ad.numberOfFrames * ad.numberOfChannels);
        ad.copyTo(inter, { planeIndex: 0 });
        for (let i = 0; i < ad.numberOfFrames; i++) pcm[i] = inter[i * ad.numberOfChannels];
      }
      playNode.port.postMessage({ pcm }, [pcm.buffer]);
      if (meta && ma.run) {
        ma.run.transit.push((meta.recvUs - meta.sendUs) / 1000);
        ma.run.decodeMs.push((decUs - meta.recvUs) / 1000);
      }
      ad.close();
    },
    error: (e) => { ma.decErrors++; if (ma.decErrors < 5) log('moq adec err', e.message); },
  });
  dec.configure(adcfg);
  ma.dec = dec;

  // VideoDecoder errors are FATAL (the decoder closes and never emits again), so
  // a single bad chunk would otherwise end the eye measurement for the run.
  // Rebuildable decoder + "wait for a keyframe" flag = one lost GOP, not the arm.
  let vDec = null;
  ma.vGotKey = false;
  const makeVDec = () => {
    const d = new VideoDecoder({
      output: (vf) => {
        aState.vFrames++;
        ma.vDecoded++;
        try {
          wctx.drawImage(vf, 0, 0, 640, 360);
          // decode-out time = "visible" here (no display leg; ~1 vsync
          // optimistic vs the WebRTC arms' expectedDisplayTime — noted)
          scanPanel(nowUs());
        } catch { /* scan blip */ }
        vf.close();
      },
      error: (e) => {
        ma.vDecErrors++;
        if (ma.vDecErrors < 6) log('moq vdec err', e.message);
        ma.vGotKey = false; // resync on the next keyframe with a fresh decoder
      },
    });
    d.configure({ codec: 'vp8', optimizeForLatency: true });
    return d;
  };
  if (withVideo) { vDec = makeVDec(); ma.vDec = vDec; }

  const sub = await window.MoqSynth.subscriber(MOQ_RELAY, ns, {
    log: (l) => log(l),
    onAudio: ({ payload, tsUs, continuous }) => {
      const recvUs = nowUs();
      ma.recvTotal++;
      if (!continuous && ma.recvTotal > 1) ma.discontTotal++;
      if (payload.byteLength < 13) return;
      const dv = new DataView(payload.buffer, payload.byteOffset, 12);
      const seq = dv.getUint32(0, true);
      const sendUs = dv.getFloat64(4, true);
      // join-replay filter: with 1 s groups the OPEN group replays from its
      // start on subscribe (§3.6) — chunks already >400 ms old are useless for
      // playout and would flood the ring; drop pre-decode, count separately.
      if (recvUs - sendUs > 400_000) { ma.staleDropped++; return; }
      if (ma.run) {
        if (ma.run.seqs.has(seq)) ma.run.dup++;
        else {
          ma.run.seqs.add(seq);
          if (seq < ma.run.seqMin) ma.run.seqMin = seq;
          if (seq > ma.run.seqMax) ma.run.seqMax = seq;
        }
      }
      inQ.push({ seq, sendUs, recvUs, tsUs });
      try {
        dec.decode(new EncodedAudioChunk({ type: 'key', timestamp: tsUs, data: payload.subarray(12) }));
      } catch (e) { inQ.pop(); ma.decErrors++; }
    },
    onVideo: withVideo ? ({ payload, tsUs, group, continuous }) => {
      ma.vRecv++;
      ma.vLastRecvUs = nowUs();
      if (group !== ma.vLastGroup) { ma.vGroups++; ma.vLastGroup = group; if (ma.vGroups <= 40) log(`vgroup ${group} cont=${continuous} at v=${ma.vRecv}`); }
      if (!continuous) ma.vDiscont++;
      const key = payload[0] === 1;
      if (vDec.state === 'closed') { vDec = makeVDec(); ma.vDec = vDec; ma.vGotKey = false; }
      if (!ma.vGotKey) { if (!key) return; ma.vGotKey = true; }
      try {
        vDec.decode(new EncodedVideoChunk({ type: key ? 'key' : 'delta', timestamp: tsUs, data: payload.subarray(1) }));
      } catch (e) { ma.vDecErrors++; }
    } : undefined,
  });
  ma.sub = sub;
  if (withVideo) {
    // Video-stall watchdog + self-heal. CF d14 gives no death signal (§13.4) and
    // never redelivers a closed group, so a video track that goes quiet while
    // audio still flows stays quiet forever: the only recovery is dropping the
    // subscription and taking the live edge again. Budgeted (subscribe credits
    // are finite per session, §13.4) and logged so a heal is visible in the run.
    ma.vLastRecvUs = nowUs();
    ma.vResubs = 0;
    ma.healing = false;
    ma.diagTimer = setInterval(() => {
      const gapMs = (nowUs() - ma.vLastRecvUs) / 1000;
      if (gapMs <= 1500 || ma.healing) return;
      if (ma.vStalls < 20) {
        ma.vStalls++;
        log(`VSTALL ${gapMs.toFixed(0)}ms  vRecv=${ma.vRecv} vDec=${ma.vDecoded} vDecErr=${ma.vDecErrors}`
          + ` vGroups=${ma.vGroups} lastGroup=${ma.vLastGroup} vDiscont=${ma.vDiscont} | aRecv=${ma.recvTotal} aDec=${ma.decodedTotal}`);
      }
      if (ma.vResubs >= 8 || !ma.sub.resubscribe) return;
      ma.healing = true;
      ma.vResubs++;
      ma.vGotKey = false;
      if (ma.vDec.state === 'closed') { vDec = makeVDec(); ma.vDec = vDec; }
      ma.sub.resubscribe('video')
        .then((ok) => log(`VHEAL #${ma.vResubs} ${ok ? 'ok' : 'FAILED'}`))
        .catch((e) => log(`VHEAL #${ma.vResubs} err ${e && e.message}`))
        .finally(() => { ma.vLastRecvUs = nowUs(); ma.healing = false; });
    }, 500);
  }
  state.moqA = ma;
  log('moq sub live', ns, 'floor', floorMs, 'adaptive', String(adaptive));
  return ma;
}

// arm (c): DC-direct MIDI up (unchanged) + MoQ d14 return.
// video: 'none' (audio-only) | 'moq' (VP8 over MoQ) | 'webrtc' (P2P video-only
// PC — the hybrid combo). floorMs = playout ring prebuffer; groupMs = MoQ
// group span (0 = single-frame group per chunk).
async function setupMoq({ video = 'none', floorMs = 20, adaptive = false, groupMs = 1000, frameUs = 0, tag = 'moq' }) {
  const p2p = await setupP2P({ withVideo: video === 'webrtc', withAudio: false, tag });
  const sig2 = `synth-moq-${SESSION}-${tag}`;
  if (ROLE === 'b') {
    const { ns, acfg } = await bStartMoqPublish({ withVideo: video === 'moq', groupMs, frameUs, tag });
    await post(sig2, { kind: 'moq-ns', ns, acfg });
    return { label: `moq synth host ns=${ns} (${video} video), ${p2p.label}`, ns, acfg };
  }
  const m = await waitFor(reader(sig2), (x) => x.kind === 'moq-ns', 60000);
  await aStartMoqSubscribe({ ns: m.ns, acfg: m.acfg, withVideo: video === 'moq', floorMs, adaptive });
  return { label: `moq return (${video} video) floor=${floorMs}ms + ${p2p.label}`, ns: m.ns, acfg: m.acfg };
}

function teardown() {
  try { state.pc && state.pc.close(); } catch {}
  delete state.pc; delete state.send; delete state.sid;
  if (state.moqPub) {
    const mp = state.moqPub;
    try { mp.vTimer && clearInterval(mp.vTimer); } catch {}
    try { mp.diagTimer && clearInterval(mp.diagTimer); } catch {}
    // capture tap is page-lifetime (ensureCapture) — detach the consumer only
    capConsumer = null;
    try { mp.enc.close(); } catch {}
    try { mp.vEnc && mp.vEnc.close(); } catch {}
    try { mp.pub.close(); } catch {}
    // pacer deliberately left running — see ensurePacer()
    delete state.moqPub;
  }
  if (state.moqA) {
    const ma = state.moqA;
    try { ma.diagTimer && clearInterval(ma.diagTimer); } catch {}
    try { ma.sub.close(); } catch {}
    try { ma.dec.close(); } catch {}
    try { ma.vDec && ma.vDec.close(); } catch {}
    try { ma.playNode.port.onmessage = null; } catch {}
    try { ma.playNode.disconnect(); } catch {}
    delete state.moqA;
  }
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
    if (state.moqPub) {
      const s = state.moqPub.stats();
      lines.push(`MOQ PUB ${s.ns}  chunks ${s.published}  q ${s.encQueue}  vframes ${s.vPublished}  groupMs ${s.groupMs}  frameDur ${(s.frameDurUs / 1000).toFixed(1)}ms`);
    }
  } else {
    const run = a.run;
    lines.push(`video frames ${a.vFrames}  clock-decoded ${a.vDecoded}  note-flashes ${a.vFlashSeen}`);
    if (state.moqA) {
      const w = state.moqA.worklet.latest;
      lines.push(`MOQ SUB ${state.moqA.ns}  recv ${state.moqA.recvTotal}  dec ${state.moqA.decodedTotal}  decErr ${state.moqA.decErrors}  gapIns ${state.moqA.gapInsertMsTotal.toFixed(0)}ms`);
      if (w) lines.push(`MOQ RING buf ${w.bufferedMs.toFixed(1)}ms  floor ${w.floorMs.toFixed(1)}ms  underruns ${w.underruns} (${w.underrunMs.toFixed(0)}ms)  ${w.started ? 'playing' : 'prebuffering'}`);
    }
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
  setup: async (arm, opts) => (arm === 'p2p' ? setupP2P(opts) : arm === 'moq' ? setupMoq(opts) : setupSFU(opts)),
  teardown,
  setFloor: (ms, adaptive = false) => { if (!state.moqA) throw new Error('no moq sub'); state.moqA.setFloor(ms, adaptive); return { ok: true, ms, adaptive }; },
  setGroupMs: (ms) => { if (!state.moqPub) throw new Error('no moq pub'); state.moqPub.setGroupMs(ms); return { ok: true, ms }; },
  moqInfo: () => ({
    pub: state.moqPub ? state.moqPub.stats() : null,
    sub: state.moqA ? { ns: state.moqA.ns, recv: state.moqA.recvTotal, decoded: state.moqA.decodedTotal, decErrors: state.moqA.decErrors, gapInsertMs: +state.moqA.gapInsertMsTotal.toFixed(1), worklet: state.moqA.worklet.latest, vRecv: state.moqA.vRecv, vDecoded: state.moqA.vDecoded, vDecErrors: state.moqA.vDecErrors, vGroups: state.moqA.vGroups, vDiscont: state.moqA.vDiscont, vStalls: state.moqA.vStalls } : null,
    pubUsed: state.moqPub && state.moqPub.pub.used ? state.moqPub.pub.used() : null,
  }),
  beginRun: bBeginRun,
  endRun: bEndRun,
  runRemote: aRunRemote,
  runLocal: aRunLocal,
  acInfo: () => ({ sampleRate: ac.sampleRate, baseLatency: ac.baseLatency, outputLatency: ac.outputLatency, acState: ac.state, currentTime: ac.currentTime, ctOffUs: Math.round(acMap.off()) }),
};
window.rigReady = true;
