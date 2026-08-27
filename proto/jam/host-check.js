// proto/jam/host-check.js — HOST SELF-TEST for the remote-instrument case.
//
// A synth owner, alone, with their real hardware, answering: "what will the
// player actually experience?" Everything measured here was validated in the
// C7 play-a-synth rig; measure-core.js holds the shared kernel (edge-median
// ct->epoch map, adaptive onset<->note matcher, the 16-B frame, the percussive
// stand-in voice). remote-synth.js is untouched.
//
// Signal path (ONE AudioContext, one clock — every stamp is page-epoch µs, so
// no server clock calibration is needed anywhere on this page):
//
//   [synth audio in] --> captureBus --> tapCapture      (leg 2: hardware onset)
//                            |     \-> analyser         (RMS, stuck-note check)
//                            |     \-> directMon        (gain 0 by DEFAULT)
//                            \--(no-network return)--\
//   [WebRTC decoded track] -----------(test C)-------> returnBus
//                                                        |
//                            distanceDelay --> tapReturn (what the PLAYER hears)
//                                          \-> returnMon --> speakers
//
// THE DEFAULT THAT MAKES THIS HONEST: the host monitors the RETURN, never the
// source. Direct monitoring is the reason hosts ship rigs that feel fine to
// them and unplayable to everyone else.

import {
  nowUs, makeAcMap, makeOnsetTap, makeMatcher, pdist,
  buildBin, parseBin, makeVoice, sleep,
} from './measure-core.js';

// ---------------------------------------------------------------- reference
// Measured on this rig (results/matrix.json, jam-synth-summary.json). Used to
// contextualise the host's own numbers — never substituted for them.
const REF = {
  webrtcReturnMs: 77.7,        // Opus return leg, p2p A+V, decoded-track level
  webrtcBufferShare: 0.986,    // ... of which the NetEQ jitter buffer
  moqFloor10Ms: 35.8,          // fixed-floor playout, 10 ms prebuffer
  floorCurve: [[10, 36], [40, 66]], // floor ms -> key->ear ms (slope ≈ 1.0)
  dcDirectMs: 1.0,             // MIDI over a direct DataChannel, one-way
  sfuDcMs: 16.2,               // MIDI via the CF SFU DataChannel hop
  jamRelayMs: 34.5,            // MIDI via the deployed elektron-jam DO relay
};
const BANDS = [
  { max: 45, key: 'inst', label: 'feels like the instrument' },
  { max: 70, key: 'play', label: 'playable' },
  { max: 100, key: 'work', label: 'workable, but you hear the distance' },
  { max: Infinity, key: 'slug', label: 'sluggish — you will fight it' },
];

const P = new URLSearchParams(location.search);
const AUTO = P.get('auto') === '1';
const FORCE_SRC = P.get('src') || '';       // 'loopback' | 'device'
const N_A = +(P.get('na') || 40);
const N_B = +(P.get('nb') || 40);
const N_C = +(P.get('nc') || 60);
const CH = 0;
const PENTA = [60, 62, 64, 67, 69, 72, 74, 76];

// ---------------------------------------------------------------- dom / log
const $ = (id) => document.getElementById(id);
const logEl = $('log');
const errors = [];
const logLines = [];
function log(...a) {
  const s = a.join(' ');
  logLines.push(s);
  if (logLines.length > 400) logLines.shift();
  logEl.textContent = logLines.join('\n');
  logEl.scrollTop = logEl.scrollHeight;
  console.log('[host-check]', s);
}
function fail(where, e) {
  const msg = `${where}: ${(e && e.message) || e}`;
  errors.push(msg);
  log('ERROR ' + msg);
}
window.addEventListener('error', (e) => { errors.push('pageerror: ' + e.message); });
window.addEventListener('unhandledrejection', (e) => {
  errors.push('unhandled: ' + String((e.reason && e.reason.message) || e.reason));
});
const fmt = (v, d = 1) => (v === null || v === undefined || !isFinite(v) ? '—' : (+v).toFixed(d));

// ---------------------------------------------------------------- state
const S = {
  ac: null, acMap: null,
  captureBus: null, returnBus: null, distDelay: null,
  returnMon: null, directMon: null, analyser: null, anaBuf: null,
  tapCapture: null, tapReturn: null,
  micStream: null, micTrack: null, micSettings: null, micCaps: null,
  standInDest: null, standInBus: null, voice: null,
  captureNode: null, decodedNode: null,
  srcMode: 'loopback',
  midiAccess: null, midiPort: null, midiErr: null,
  devices: [], enabled: false,
  distMs: 0,
  pcPlayer: null, pcHost: null, dc: null, anchorTimer: null,
  results: { env: null, A: null, B: null, C: null, D: [], soak: null },
};
const DIST_STEPS = [0, 10, 30, 60, 100];

// ============================================================== 1 · SETUP ===
async function enable() {
  if (S.enabled) return;
  $('setupStatus').textContent = 'starting audio…';

  const ac = new AudioContext({ latencyHint: 'interactive' });
  S.ac = ac;
  await ac.audioWorklet.addModule('/onset-worklet.js');
  if (ac.state !== 'running') await ac.resume().catch(() => {});
  S.acMap = makeAcMap(ac);

  // buses
  S.captureBus = ac.createGain();
  S.returnBus = ac.createGain();
  S.distDelay = ac.createDelay(0.5);
  S.distDelay.delayTime.value = 0;
  S.returnMon = ac.createGain(); S.returnMon.gain.value = 0.8;
  S.directMon = ac.createGain(); S.directMon.gain.value = 0;   // THE default
  S.analyser = ac.createAnalyser(); S.analyser.fftSize = 1024;
  S.anaBuf = new Float32Array(S.analyser.fftSize);

  S.tapCapture = makeOnsetTap(ac, S.acMap, null);
  S.tapReturn = makeOnsetTap(ac, S.acMap, null);

  S.captureBus.connect(S.tapCapture);
  S.captureBus.connect(S.analyser);
  S.captureBus.connect(S.directMon).connect(ac.destination);
  S.returnBus.connect(S.distDelay);
  S.distDelay.connect(S.tapReturn);
  S.distDelay.connect(S.returnMon).connect(ac.destination);
  S.captureBus.connect(S.returnBus);            // no-network return, by default

  // stand-in "hardware": a MediaStream, exactly like a real interface gives
  S.standInBus = ac.createGain();
  S.standInDest = ac.createMediaStreamDestination();
  S.standInBus.connect(S.standInDest);
  S.voice = makeVoice(ac, S.standInBus);

  // ---- audio input: constraints that are the classic ruiner ----------------
  const WANT = {
    echoCancellation: false, autoGainControl: false, noiseSuppression: false,
    sampleRate: 48000, channelCount: 1,
  };
  try {
    S.micStream = await navigator.mediaDevices.getUserMedia({ audio: WANT, video: false });
    S.micTrack = S.micStream.getAudioTracks()[0];
    S.micSettings = S.micTrack.getSettings();
    try { S.micCaps = S.micTrack.getCapabilities(); } catch { S.micCaps = null; }
    log('mic settings ' + JSON.stringify(S.micSettings));
  } catch (e) {
    fail('getUserMedia', e);
  }
  try {
    S.devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput');
  } catch (e) { fail('enumerateDevices', e); }

  // ---- Web MIDI -----------------------------------------------------------
  try {
    S.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    log('midi outputs ' + [...S.midiAccess.outputs.values()].map((o) => o.name).join(', '));
  } catch (e) { S.midiErr = (e && e.message) || String(e); log('no Web MIDI: ' + S.midiErr); }

  fillSelects();
  applySource();
  S.enabled = true;
  for (const b of ['btnA', 'btnB', 'btnC', 'btnSoak']) $(b).disabled = false;
  $('setupStatus').textContent = 'ready';
  renderChecks();
  setInterval(renderChecks, 700);
  log(`ctx sr=${ac.sampleRate} base=${(ac.baseLatency * 1000).toFixed(2)}ms out=${(ac.outputLatency * 1000).toFixed(2)}ms`);
}

function fillSelects() {
  const mo = $('midiOut');
  mo.innerHTML = '';
  const opts = [['', 'Built-in stand-in synth (no hardware)']];
  if (S.midiAccess) for (const o of S.midiAccess.outputs.values()) opts.push([o.id, o.name + (o.manufacturer ? ' — ' + o.manufacturer : '')]);
  for (const [v, t] of opts) mo.add(new Option(t, v));
  mo.value = (S.midiAccess && [...S.midiAccess.outputs.values()][0] && FORCE_SRC !== 'loopback')
    ? [...S.midiAccess.outputs.values()][0].id : '';

  const ai = $('audioIn');
  ai.innerHTML = '';
  ai.add(new Option('Stand-in loopback (no hardware)', 'loopback'));
  for (const d of S.devices) ai.add(new Option(d.label || ('input ' + d.deviceId.slice(0, 6)), d.deviceId));
  const wantDevice = FORCE_SRC === 'device' || (FORCE_SRC !== 'loopback' && mo.value !== '' && S.devices.length);
  ai.value = wantDevice ? S.devices[0].deviceId : 'loopback';
}

function applySource() {
  const ac = S.ac;
  const want = $('audioIn').value === 'loopback' ? 'loopback' : 'device';
  const dev = $('audioIn').value;
  S.midiPort = $('midiOut').value && S.midiAccess ? S.midiAccess.outputs.get($('midiOut').value) : null;
  if (S.captureNode) { try { S.captureNode.disconnect(); } catch {} S.captureNode = null; }
  S.srcMode = want;
  try {
    if (want === 'loopback') {
      S.captureNode = ac.createMediaStreamSource(S.standInDest.stream);
    } else {
      if (S.micSettings && S.micSettings.deviceId !== dev) log('note: chosen input differs from the granted stream — re-grant to switch');
      S.captureNode = ac.createMediaStreamSource(S.micStream);
    }
    S.captureNode.connect(S.captureBus);
  } catch (e) { fail('applySource', e); }
  log(`source=${S.srcMode} midi=${S.midiPort ? S.midiPort.name : 'stand-in'}`);
}

function captureTrack() {
  return S.srcMode === 'loopback' ? S.standInDest.stream.getAudioTracks()[0] : S.micTrack;
}

// ---------------------------------------------------------------- checks ---
function chk(state, label, val) { return { state, label, val }; }
function buildChecks() {
  const ac = S.ac;
  const out = [];
  if (!ac) return out;
  const s = S.micSettings || {};
  const has = (k) => Object.prototype.hasOwnProperty.call(s, k);
  const boolChk = (k, name) => {
    if (!has(k)) return chk('info', name, 'not reported by this device');
    return chk(s[k] === false ? 'pass' : 'fail', name, s[k] === false ? 'off' : 'ON — turn it off');
  };
  out.push(boolChk('echoCancellation', 'echo cancellation'));
  out.push(boolChk('autoGainControl', 'auto gain control'));
  out.push(boolChk('noiseSuppression', 'noise suppression'));
  const sr = s.sampleRate || ac.sampleRate;
  out.push(chk(sr === 48000 ? 'pass' : 'warnc', 'sample rate', sr + ' Hz' + (s.sampleRate ? '' : ' (context)')));
  out.push(chk(s.channelCount === 1 ? 'pass' : 'info', 'channels', s.channelCount ?? '—'));
  const baseMs = ac.baseLatency * 1000;
  out.push(chk(baseMs <= 6 ? 'pass' : 'warnc', 'context baseLatency',
    `${baseMs.toFixed(2)} ms (${Math.round(ac.baseLatency * ac.sampleRate)} samples)`));
  const outMs = (ac.outputLatency || 0) * 1000;
  out.push(chk(outMs <= 20 ? 'pass' : 'warnc', 'context outputLatency', outMs ? outMs.toFixed(2) + ' ms' : 'not reported'));
  if (typeof s.latency === 'number') {
    const iMs = s.latency * 1000;
    out.push(chk(iMs <= 6 ? 'pass' : 'warnc', 'interface input buffer',
      `${iMs.toFixed(2)} ms (${Math.round(s.latency * sr)} samples)`));
  } else {
    out.push(chk('info', 'interface input buffer', 'not exposed — check your driver panel'));
  }
  out.push(chk(S.midiPort ? 'pass' : 'info', 'MIDI out',
    S.midiPort ? S.midiPort.name : (S.midiErr ? 'no Web MIDI (' + S.midiErr.slice(0, 28) + ') — stand-in' : 'stand-in synth')));
  out.push(chk(S.srcMode === 'device' ? 'pass' : 'info', 'audio return',
    S.srcMode === 'device' ? (s.deviceId ? (S.devices.find((d) => d.deviceId === s.deviceId)?.label || 'device') : 'device') : 'stand-in loopback'));
  if (!!S.midiPort !== (S.srcMode === 'device')) {
    out.push(chk('fail', 'chain consistency',
      S.midiPort ? 'real MIDI out but stand-in audio in — you are measuring the stand-in'
        : 'real audio in but stand-in MIDI — your synth is never played'));
  }
  out.push(chk('info', 'input level (RMS)', rms() > 0.0005 ? (20 * Math.log10(rms())).toFixed(0) + ' dBFS' : 'silent'));
  return out;
}
function renderChecks() {
  const rows = buildChecks();
  $('checks').innerHTML = rows.map((r) => {
    const mark = { pass: '✓', fail: '✕', warnc: '!', info: '·' }[r.state];
    return `<div class="chk ${r.state}"><span class="mark">${mark}</span><span class="lbl">${r.label}</span><span class="val">${r.val}</span></div>`;
  }).join('');
}
function rms() {
  if (!S.analyser) return 0;
  S.analyser.getFloatTimeDomainData(S.anaBuf);
  let acc = 0;
  for (let i = 0; i < S.anaBuf.length; i++) acc += S.anaBuf[i] * S.anaBuf[i];
  return Math.sqrt(acc / S.anaBuf.length);
}

// ============================================================ 2 · MIDI OUT ==
const sustaining = new Map();
function noteOn(note, vel = 100, sustain = false) {
  if (S.midiPort) { S.midiPort.send([0x90 | CH, note, vel]); return; }
  if (!sustain) { S.voice(note, vel); return; }
  if (sustaining.has(note)) noteOff(note);
  const ac = S.ac, t = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 440 * Math.pow(2, (note - 69) / 12);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.4 * (vel / 127), t);   // instant attack, then holds
  osc.connect(g).connect(S.standInBus);
  osc.start(t);
  sustaining.set(note, { osc, g });
}
function noteOff(note) {
  if (S.midiPort) { S.midiPort.send([0x80 | CH, note, 0]); return; }
  const v = sustaining.get(note);
  if (!v) return;
  sustaining.delete(note);
  const t = S.ac.currentTime;
  v.g.gain.setValueAtTime(v.g.gain.value, t);
  v.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.01);
  v.osc.stop(t + 0.02);
}
function panic() {
  if (S.midiPort) { for (let c = 0; c < 16; c++) { S.midiPort.send([0xB0 | c, 123, 0]); S.midiPort.send([0xB0 | c, 120, 0]); } }
  for (const n of [...sustaining.keys()]) noteOff(n);
  log('panic — all notes off');
}

// ======================================================== A · HARDWARE FLOOR
// Notes out, onsets back, nothing else in the chain. This is the tax the host
// pays before a single byte crosses the network: MIDI wire + the synth's own
// note-on latency + converter + interface input buffer.
async function testA(n = N_A, gapMs = 200, label = 'A') {
  const m = makeMatcher({ minLatUs: -8000, maxLatUs: 900_000 });
  const sent = [];
  S.tapReturn.setSink((us) => m.onset(us));
  const t0 = nowUs();
  for (let i = 0; i < n; i++) {
    const target = t0 + i * gapMs * 1000;
    const tUs = nowUs();
    m.sent(i, tUs);
    sent.push({ seq: i, tUs, target, note: PENTA[i % PENTA.length] });
    noteOn(PENTA[i % PENTA.length], 90 + (i % 30));
    if (S.midiPort) setTimeout(() => noteOff(PENTA[i % PENTA.length]), 120);
    const wait = (target + gapMs * 1000 - nowUs()) / 1000;
    await sleep(Math.max(1, wait));
    if (label === 'A') $('statusA').textContent = `${i + 1}/${n}`;
  }
  await sleep(700);
  m.flush();
  S.tapReturn.setSink(null);
  const lat = [], jit = [];
  let dropped = 0;
  for (const r of sent) {
    const g = m.get(r.seq);
    if (g && g.status === 'matched') lat.push((g.onsetUs - r.tUs) / 1000);
    else dropped++;
    jit.push(Math.abs(r.tUs - r.target) / 1000);
  }
  return {
    n, sent: sent.length, matched: lat.length, dropped,
    keyToSound: pdist(lat), sendJitter: pdist(jit),
    spuriousOnsets: m.spurious(),
    distanceDelayMs: S.distMs,
  };
}

// ====================================================== B · NETWORK ECHO ====
// The deployed elektron-jam relay echoes to ALL clients INCLUDING the sender
// (C0/C1-verified), which is exactly what makes a partnerless RTT test possible.
async function testB(n = N_B, gapMs = 150) {
  let token = '';
  try { token = (await (await fetch('/env.json')).json()).JAM_TOKEN || ''; } catch {}
  const room = 'hostcheck-' + Math.random().toString(36).slice(2, 9);
  const url = `wss://elektron-jam.kristjan-jansen.workers.dev/room/${room}/ws?token=${token}`;
  const ws = new WebSocket(url);
  ws.binaryType = 'arraybuffer';
  const rtts = [];
  const seen = new Set();
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('relay connect timeout')), 12000);
    ws.onopen = () => { clearTimeout(t); res(); };
    ws.onerror = () => { clearTimeout(t); rej(new Error('relay connect failed')); };
  });
  ws.onmessage = (e) => {
    if (!(e.data instanceof ArrayBuffer)) return;
    const f = parseBin(e.data);
    if (seen.has(f.seq)) return;
    seen.add(f.seq);
    rtts.push((nowUs() - f.tUs) / 1000);
  };
  for (let i = 0; i < n; i++) {
    ws.send(buildBin(i, PENTA[i % PENTA.length], 100, 1, nowUs()));
    $('statusB').textContent = `${i + 1}/${n}`;
    await sleep(gapMs);
  }
  await sleep(1200);
  ws.close();
  const d = pdist(rtts);
  return {
    n, received: rtts.length, lost: n - rtts.length, room,
    rtt: d,
    oneWay: d ? { p50: +(d.p50 / 2).toFixed(2), p95: +(d.p95 / 2).toFixed(2) } : null,
    refRelayOneWayMs: REF.jamRelayMs,
  };
}

// ==================================================== C · FULL LOOP (SELF) ==
// Two PeerConnections in this one page. MIDI goes up a DataChannel exactly as
// it would to a remote player; the answering PC sends the REAL SYNTH's audio
// back over Opus; the decoded track is what we onset-detect. The synth is in
// the chain for real — only the wire is short.
//
// C7 finding carried forward: an audio-only p2p return lets NetEQ wander
// (72 -> 135 -> 210+ ms across runs); adding a video track PINS it (3/3 runs).
// The anchor checkbox exposes that as a host-facing choice.
async function setupLoop(withAnchor) {
  const pcPlayer = new RTCPeerConnection({ iceServers: [] });
  const pcHost = new RTCPeerConnection({ iceServers: [] });
  S.pcPlayer = pcPlayer; S.pcHost = pcHost;
  // buffer trickled candidates until the far side has a remote description —
  // both PCs gather before the answer exists, and addIceCandidate throws then.
  const wire = (from, to) => {
    const q = [];
    from.onicecandidate = (e) => {
      if (!e.candidate) return;
      if (to.remoteDescription) to.addIceCandidate(e.candidate).catch(() => {});
      else q.push(e.candidate);
    };
    to.addEventListener('signalingstatechange', () => {
      if (to.remoteDescription) while (q.length) to.addIceCandidate(q.shift()).catch(() => {});
    });
  };
  wire(pcPlayer, pcHost); wire(pcHost, pcPlayer);

  const dc = pcPlayer.createDataChannel('midi', { ordered: false, maxRetransmits: 0 });
  dc.binaryType = 'arraybuffer';
  S.dc = dc;
  pcPlayer.addTransceiver('audio', { direction: 'recvonly' });
  if (withAnchor) pcPlayer.addTransceiver('video', { direction: 'recvonly' });

  const hostRecv = { fn: null };
  pcHost.ondatachannel = (e) => {
    e.channel.binaryType = 'arraybuffer';
    e.channel.onmessage = (ev) => hostRecv.fn && hostRecv.fn(parseBin(ev.data), nowUs());
  };
  const gotTrack = new Promise((res) => {
    pcPlayer.ontrack = (e) => { if (e.track.kind === 'audio') res(e.track); };
  });

  await pcPlayer.setLocalDescription(await pcPlayer.createOffer());
  await pcHost.setRemoteDescription(pcPlayer.localDescription);
  const aTrack = captureTrack();
  let vTrack = null;
  if (withAnchor) vTrack = startAnchor();
  for (const tx of pcHost.getTransceivers()) {
    const kind = tx.receiver.track && tx.receiver.track.kind;
    if (kind === 'audio' && aTrack) { await tx.sender.replaceTrack(aTrack); tx.direction = 'sendonly'; }
    if (kind === 'video' && vTrack) { await tx.sender.replaceTrack(vTrack); tx.direction = 'sendonly'; }
  }
  await pcHost.setLocalDescription(await pcHost.createAnswer());
  await pcPlayer.setRemoteDescription(pcHost.localDescription);

  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('loop connect timeout, state=' + pcPlayer.connectionState)), 15000);
    const c = () => { if (pcPlayer.connectionState === 'connected') { clearTimeout(t); res(); } };
    pcPlayer.addEventListener('connectionstatechange', c); c();
  });
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('dc open timeout')), 10000);
    if (dc.readyState === 'open') { clearTimeout(t); res(); } else dc.onopen = () => { clearTimeout(t); res(); };
  });
  const track = await Promise.race([gotTrack, sleep(8000).then(() => null)]);
  if (!track) throw new Error('no return track');

  // the decoded track becomes the return the host monitors
  const stream = new MediaStream([track]);
  const el = $('remoteAudio');
  el.srcObject = stream; el.volume = 0;
  await el.play().catch(() => {});
  S.decodedNode = S.ac.createMediaStreamSource(stream);
  try { S.captureBus.disconnect(S.returnBus); } catch {}
  S.decodedNode.connect(S.returnBus);
  return { dc, hostRecv, pcPlayer, pcHost };
}
function teardownLoop() {
  try { S.decodedNode && S.decodedNode.disconnect(); } catch {}
  S.decodedNode = null;
  try { S.captureBus.connect(S.returnBus); } catch {}
  for (const pc of [S.pcPlayer, S.pcHost]) { try { pc && pc.close(); } catch {} }
  S.pcPlayer = S.pcHost = S.dc = null;
  if (S.anchorTimer) { cancelAnimationFrame(S.anchorTimer); S.anchorTimer = null; }
  $('remoteAudio').srcObject = null;
}
function startAnchor() {
  const c = $('anchor');
  const g = c.getContext('2d', { alpha: false });
  let f = 0;
  const draw = () => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#fff'; g.fillRect((f * 3) % 56, 20, 8, 24);
    f++;
    S.anchorTimer = requestAnimationFrame(draw);
  };
  draw();
  return c.captureStream(30).getVideoTracks()[0];
}
async function rtpAudio(pc) {
  const st = await pc.getStats();
  let o = null;
  st.forEach((s) => {
    if (s.type === 'inbound-rtp' && s.kind === 'audio') {
      o = {
        jbDelay: s.jitterBufferDelay, jbEmitted: s.jitterBufferEmittedCount,
        jbTarget: s.jitterBufferTargetDelay, jbMin: s.jitterBufferMinimumDelay,
        packetsReceived: s.packetsReceived, packetsLost: s.packetsLost,
        concealedSamples: s.concealedSamples, totalSamplesReceived: s.totalSamplesReceived,
      };
    }
  });
  return o;
}

async function testC(n = N_C, gapMs = 200) {
  const withAnchor = $('vAnchor').checked;
  const loop = await setupLoop(withAnchor);
  try {
    const mCap = makeMatcher({ minLatUs: -8000, maxLatUs: 900_000 });
    const mRet = makeMatcher({ minLatUs: -8000, maxLatUs: 2_000_000, adaptive: true });
    const recs = new Map();
    loop.hostRecv.fn = (f, recvUs) => {
      const r = recs.get(f.seq);
      if (r) r.recvUs = recvUs;
      mCap.sent(f.seq, recvUs);
      noteOn(f.note, f.vel);                    // the REAL synth is played here
      if (S.midiPort) setTimeout(() => noteOff(f.note), 120);
    };
    S.tapCapture.setSink((us) => mCap.onset(us));
    S.tapReturn.setSink((us) => mRet.onset(us));
    await sleep(900);                            // let the jitter buffer settle
    const before = await rtpAudio(loop.pcPlayer);
    for (let i = 0; i < n; i++) {
      const tUs = nowUs();
      recs.set(i, { seq: i, tUs, note: PENTA[i % PENTA.length] });
      mRet.sent(i, tUs);
      loop.dc.send(buildBin(i, PENTA[i % PENTA.length], 90 + (i % 30), 1, tUs));
      $('statusC').textContent = `${i + 1}/${n}`;
      await sleep(gapMs);
    }
    await sleep(2500);
    mCap.flush(); mRet.flush();
    S.tapCapture.setSink(null); S.tapReturn.setSink(null);
    const after = await rtpAudio(loop.pcPlayer);

    const leg1 = [], leg2 = [], leg3 = [], total = [];
    let dropped = 0;
    for (const r of recs.values()) {
      const gr = mRet.get(r.seq), gc = mCap.get(r.seq);
      if (r.recvUs !== undefined) leg1.push((r.recvUs - r.tUs) / 1000);
      const capOk = gc && gc.status === 'matched';
      const retOk = gr && gr.status === 'matched';
      if (capOk && r.recvUs !== undefined) leg2.push((gc.onsetUs - r.recvUs) / 1000);
      if (retOk) total.push((gr.onsetUs - r.tUs) / 1000);
      else dropped++;
      if (capOk && retOk) leg3.push((gr.onsetUs - gc.onsetUs) / 1000);
    }
    let bufferMs = null, concealPct = null;
    if (before && after && after.jbEmitted > before.jbEmitted) {
      bufferMs = +(((after.jbDelay - before.jbDelay) / (after.jbEmitted - before.jbEmitted)) * 1000).toFixed(2);
    }
    if (after && after.totalSamplesReceived) {
      concealPct = +(100 * (after.concealedSamples - (before?.concealedSamples || 0)) /
        Math.max(1, after.totalSamplesReceived - (before?.totalSamplesReceived || 0))).toFixed(2);
    }
    const tot = pdist(total);
    const l3 = pdist(leg3);
    return {
      n, matched: total.length, dropped, withAnchor,
      leg1_midi: pdist(leg1), leg2_hardware: pdist(leg2), leg3_return: l3, total: tot,
      bufferMs, jbTargetMs: after ? +((after.jbTarget || 0) * 1000).toFixed(1) : null,
      codecTransportMs: (l3 && bufferMs !== null) ? +(l3.p50 - bufferMs).toFixed(2) : null,
      concealPct,
      packetsLost: after ? after.packetsLost - (before?.packetsLost || 0) : null,
      distanceDelayMs: S.distMs,
    };
  } finally {
    teardownLoop();
  }
}

// ==================================================== D · SIMULATED DISTANCE
function setDistance(idx) {
  S.distMs = DIST_STEPS[idx];
  if (S.distDelay) S.distDelay.delayTime.setTargetAtTime(S.distMs / 1000, S.ac.currentTime, 0.01);
  $('distNow').innerHTML = `${S.distMs}<span class="unit"> ms added</span>`;
}
async function testD() {
  const r = await testA(14, 200, 'D');
  const rec = { addedMs: S.distMs, keyToSound: r.keyToSound, matched: r.matched };
  S.results.D = S.results.D.filter((x) => x.addedMs !== S.distMs).concat([rec])
    .sort((a, b) => a.addedMs - b.addedMs);
  return rec;
}

// ==================================================== STUCK-NOTE SOAK =======
// A 60 s run of on/off pairs. A stuck note = the instrument is still sounding
// 300 ms after its note-off. Catches lost note-offs, MIDI buffer overruns and
// the envelope bugs that only show up under sustained play.
async function testSoak(seconds) {
  const t0 = nowUs();
  const m = makeMatcher({ minLatUs: -8000, maxLatUs: 900_000 });
  S.tapReturn.setSink((us) => m.onset(us));
  let i = 0, stuck = 0;
  const residuals = [];
  const sent = [];
  const floorRms = rms();
  while ((nowUs() - t0) / 1e6 < seconds) {
    const note = PENTA[i % PENTA.length];
    const tUs = nowUs();
    m.sent(i, tUs); sent.push({ seq: i, tUs });
    noteOn(note, 100, true);
    await sleep(120);
    noteOff(note);
    await sleep(300);
    const r = rms();
    residuals.push(r);
    if (r > Math.max(0.01, floorRms * 4)) stuck++;
    i++;
    if (i % 5 === 0) $('statusSoak').textContent = `${((nowUs() - t0) / 1e6).toFixed(0)}/${seconds}s · ${i} notes · ${stuck} stuck`;
  }
  panic();
  await sleep(300);
  const afterPanic = rms();
  await sleep(500);
  m.flush();
  S.tapReturn.setSink(null);
  const lat = [];
  let dropped = 0;
  for (const r of sent) {
    const g = m.get(r.seq);
    if (g && g.status === 'matched') lat.push((g.onsetUs - r.tUs) / 1000); else dropped++;
  }
  return {
    seconds, notes: i, stuck, dropped, matched: lat.length,
    keyToSound: pdist(lat),
    residualRms: pdist(residuals.map((x) => +(x * 1000).toFixed(3))),
    silentAfterPanic: afterPanic <= Math.max(0.01, floorRms * 4),
    noiseFloorRms: +(floorRms * 1000).toFixed(3),
  };
}

// ==================================================== THE REPORT ============
function snapshotEnv() {
  const ac = S.ac;
  const s = S.micSettings || {};
  return {
    sampleRate: ac ? ac.sampleRate : null,
    baseLatencyMs: ac ? +(ac.baseLatency * 1000).toFixed(2) : null,
    outputLatencyMs: ac ? +((ac.outputLatency || 0) * 1000).toFixed(2) : null,
    inputLatencyMs: typeof s.latency === 'number' ? +(s.latency * 1000).toFixed(2) : null,
    inputBufferSamples: typeof s.latency === 'number' && ac ? Math.round(s.latency * ac.sampleRate) : null,
    constraints: {
      echoCancellation: s.echoCancellation, autoGainControl: s.autoGainControl,
      noiseSuppression: s.noiseSuppression, sampleRate: s.sampleRate, channelCount: s.channelCount,
    },
    checks: buildChecks().map((c) => ({ state: c.state, label: c.label, value: String(c.val) })),
    midiOut: S.midiPort ? S.midiPort.name : null,
    midiAvailable: !!S.midiAccess,
    source: S.srcMode,
    monitorsReturnPath: $('monReturn').checked,
    ua: navigator.userAgent,
  };
}

function bandFor(ms) { return BANDS.find((b) => ms <= b.max); }

function buildRemedy(R) {
  const env = R.env, A = R.A, C = R.C, B = R.B;
  const legs = [];
  if (C && C.total) {
    if (C.leg1_midi) legs.push({ k: 'midi', name: 'MIDI up', ms: C.leg1_midi.p50 });
    if (C.leg2_hardware) legs.push({ k: 'hw', name: 'your instrument + interface', ms: C.leg2_hardware.p50 });
    if (C.leg3_return) legs.push({ k: 'ret', name: 'audio return (encode + buffer + decode)', ms: C.leg3_return.p50 });
  } else if (A && A.keyToSound) {
    legs.push({ k: 'hw', name: 'your instrument + interface', ms: A.keyToSound.p50 });
  }
  if (env && env.outputLatencyMs) legs.push({ k: 'out', name: 'your own output buffer', ms: env.outputLatencyMs });
  if (!legs.length) return null;
  const dom = legs.reduce((a, b) => (b.ms > a.ms ? b : a));
  const bufS = env && env.inputBufferSamples;
  const bufMs = env && env.inputLatencyMs;
  let text;
  if (dom.k === 'hw') {
    if (bufS && bufS > 128) {
      const saving = (bufMs - (128 / env.sampleRate) * 1000).toFixed(1);
      text = `Your interface buffer is ${bufS} samples = ${bufMs} ms. Try 128 samples (${((128 / env.sampleRate) * 1000).toFixed(1)} ms) — that is ${saving} ms off every note, on the input side alone, for free.`;
    } else if (bufS) {
      text = `Your input buffer is already tight (${bufS} samples = ${bufMs} ms); what is left is the instrument itself. If ${fmt(dom.ms)} ms is too much, the fix is a different sound (shorter attack) or a different instrument — a digital synth's own note-on latency is not adjustable from here.`;
    } else {
      text = `The instrument + interface leg dominates at ${fmt(dom.ms)} ms and your driver does not expose its buffer. Open the interface control panel and set the buffer to 128 samples (2.7 ms at 48 kHz), then re-run test A — anything above ~6 ms of buffer is money left on the table.`;
    }
  } else if (dom.k === 'ret') {
    const share = C && C.bufferMs !== null && C.leg3_return ? Math.round(100 * C.bufferMs / C.leg3_return.p50) : Math.round(REF.webrtcBufferShare * 100);
    text = `The audio return dominates at ${fmt(dom.ms)} ms, and ${share}% of it is the receiver's jitter buffer, not the wire. You cannot hint it away — measured here: jitterBufferTarget=0 and playoutDelayHint=0 make it WORSE, never better (${REF.webrtcReturnMs} ms → 211 ms in the rig). The only real lever is a different return transport with a fixed playout floor: the MoQ + WebCodecs path measured ${REF.moqFloor10Ms} ms end to end at a 10 ms floor against WebRTC's ${REF.webrtcReturnMs} ms return. If you must stay on WebRTC, keep a video track in the session — it pins the buffer (measured 3/3 runs; audio-only wandered 72 → 310 ms).`;
  } else if (dom.k === 'midi') {
    const ow = B && B.oneWay ? B.oneWay.p50 : REF.jamRelayMs;
    text = `The MIDI leg dominates at ${fmt(dom.ms)} ms. Over a real link that becomes your network echo figure (${fmt(ow)} ms one-way here). Direct peer-to-peer DataChannel measured ${REF.dcDirectMs} ms; an SFU hop ${REF.sfuDcMs} ms; a worker relay ${REF.jamRelayMs} ms. If you are on a relay, moving to direct P2P is the single biggest win available on this leg.`;
  } else {
    text = `Your own output buffer (${fmt(dom.ms)} ms) is the biggest single piece. Lower the output buffer in your interface panel — the player pays this twice over, once on your side and once on theirs.`;
  }
  return { dominant: dom, legs, text };
}

function buildReport() {
  const R = S.results;
  R.env = snapshotEnv();
  R.generatedAt = new Date().toISOString();
  const C = R.C, A = R.A;
  const trackMs = C && C.total ? C.total.p50 : (A && A.keyToSound ? A.keyToSound.p50 : null);
  const earMs = trackMs === null ? null : trackMs + (R.env.outputLatencyMs || 0);
  R.headline = {
    keyToTrackMs: trackMs, keyToEarMs: earMs === null ? null : +earMs.toFixed(1),
    band: earMs === null ? null : bandFor(earMs).key,
    bandLabel: earMs === null ? null : bandFor(earMs).label,
    basis: C ? 'full loop (test C) + your output latency' : 'hardware floor only (test A) — run C for the real number',
  };
  R.remedy = buildRemedy(R);
  R.playoutCurve = (() => {
    if (!C || !C.total) return null;
    const nonBuffer = C.bufferMs === null ? null : +(C.total.p50 - C.bufferMs).toFixed(2);
    if (nonBuffer === null) return null;
    return {
      measuredBufferMs: C.bufferMs, nonBufferMs: nonBuffer,
      points: [10, 20, 30, 40, 60, 80, 120].map((f) => ({ floorMs: f, keyToEarMs: +(nonBuffer + f + (R.env.outputLatencyMs || 0)).toFixed(1) })),
      reference: REF.floorCurve,
    };
  })();
  R.dropped = {
    testA: A ? A.dropped : null, testC: C ? C.dropped : null,
    soak: R.soak ? R.soak.dropped : null,
    relayLost: R.B ? R.B.lost : null,
  };
  R.reference = REF;
  renderReport(R);
  window.__hcReport = R;
  return R;
}

function distRow(name, d, extra = '') {
  if (!d) return `<tr><td>${name}</td><td class="num muted" colspan="4">not run</td><td></td></tr>`;
  return `<tr><td>${name}</td><td class="num">${fmt(d.p50)}</td><td class="num">${fmt(d.p95)}</td>
    <td class="num">${fmt(d.min)}</td><td class="num">${fmt(d.max)}</td><td class="muted">n=${d.n} ${extra}</td></tr>`;
}

function renderReport(R) {
  const C = R.C, A = R.A, B = R.B;
  const h = R.headline;
  const vclass = h.band === 'inst' ? 'v-inst' : (h.band === 'slug' || h.band === 'work' ? (h.band === 'slug' ? 'v-slug' : 'v-play') : 'v-play');
  let html = '';

  html += `<div class="verdict ${h.keyToEarMs === null ? '' : vclass}">
    <div style="color:var(--dim);font-size:12px;text-transform:uppercase;letter-spacing:.08em">what the player feels, key to ear</div>
    <div class="big" style="margin:4px 0">${h.keyToEarMs === null ? '—' : fmt(h.keyToEarMs)}<span class="unit"> ms · ${h.bandLabel || ''}</span></div>
    <div class="hint">${h.basis}. Bands: ≤45 feels like the instrument · 45–70 playable · 70–100 audible distance · &gt;100 sluggish.
    ${C ? `Measured at the decoded track: ${fmt(h.keyToTrackMs)} ms; +${fmt(R.env.outputLatencyMs)} ms for your own output buffer.` : ''}</div>
  </div>`;

  // per-leg decomposition
  if (C && C.total) {
    const parts = [
      ['MIDI up', C.leg1_midi ? C.leg1_midi.p50 : 0, '#7dd3fc'],
      ['instrument + interface', C.leg2_hardware ? C.leg2_hardware.p50 : 0, '#4ade80'],
      ['codec + transport', C.codecTransportMs ?? 0, '#fbbf24'],
      ['jitter buffer', C.bufferMs ?? 0, '#f87171'],
      ['your output buffer', R.env.outputLatencyMs || 0, '#a78bfa'],
    ];
    const sum = parts.reduce((a, p) => a + Math.max(0, p[1]), 0) || 1;
    html += `<div style="margin-top:16px"><h2>Where the milliseconds go</h2>
      <div class="bar">${parts.map((p) => `<span style="width:${(100 * Math.max(0, p[1]) / sum).toFixed(2)}%;background:${p[2]}"></span>`).join('')}</div>
      <div class="legend">${parts.map((p) => `<span><i style="background:${p[2]}"></i>${p[0]} ${fmt(p[1])} ms</span>`).join('')}</div></div>`;
  }

  html += `<div style="margin-top:18px"><h2>Numbers (ms)</h2><table>
    <tr><th>leg</th><th class="num">p50</th><th class="num">p95</th><th class="num">min</th><th class="num">max</th><th></th></tr>
    ${distRow('A · hardware floor (key→sound)', A && A.keyToSound, A ? `${A.dropped} dropped` : '')}
    ${distRow('A · send jitter', A && A.sendJitter)}
    ${distRow('B · relay RTT', B && B.rtt, B ? `one-way ≈ ${fmt(B.oneWay && B.oneWay.p50)} · ${B.lost} lost` : '')}
    ${distRow('C · leg 1 MIDI up', C && C.leg1_midi)}
    ${distRow('C · leg 2 instrument', C && C.leg2_hardware)}
    ${distRow('C · leg 3 audio return', C && C.leg3_return, C ? `buffer ${fmt(C.bufferMs)} · codec+wire ${fmt(C.codecTransportMs)}` : '')}
    ${distRow('C · TOTAL key→track', C && C.total, C ? `${C.dropped} dropped · conceal ${fmt(C.concealPct, 2)}%` : '')}
    ${R.soak ? distRow('soak · key→sound', R.soak.keyToSound, `${R.soak.notes} notes`) : ''}
  </table></div>`;

  if (R.D && R.D.length) {
    const base = R.D.find((x) => x.addedMs === 0);
    html += `<div style="margin-top:18px"><h2>Simulated distance (measured, not assumed)</h2><table>
      <tr><th>added</th><th class="num">measured p50</th><th class="num">delta vs 0 ms</th><th></th></tr>
      ${R.D.map((x) => `<tr><td>${x.addedMs} ms</td><td class="num">${fmt(x.keyToSound && x.keyToSound.p50)}</td>
        <td class="num">${base && x.keyToSound && base.keyToSound ? fmt(x.keyToSound.p50 - base.keyToSound.p50) : '—'}</td>
        <td class="muted">n=${x.matched}</td></tr>`).join('')}
    </table></div>`;
  }

  if (R.playoutCurve) {
    const pc = R.playoutCurve;
    const max = Math.max(...pc.points.map((p) => p.keyToEarMs));
    html += `<div style="margin-top:18px"><h2>If you could change the playout buffer</h2>
      <p class="hint" style="margin-top:0">Your fixed legs total ${fmt(pc.nonBufferMs)} ms; the buffer measured
      ${fmt(pc.measuredBufferMs)} ms on top. WebRTC does not let you set a floor — a fixed-floor transport does,
      and the rig's measured floor→latency curve is 1:1 (${pc.reference.map((r) => `${r[0]}→${r[1]}`).join(' ms, ')} ms).</p>
      <div class="curve">${pc.points.map((p) => {
        const band = bandFor(p.keyToEarMs);
        const col = band.key === 'inst' ? '#4ade80' : band.key === 'play' ? '#fbbf24' : '#f87171';
        return `<div style="margin:2px 0">${String(p.floorMs).padStart(3)} ms floor
          <span class="track" style="width:${(180 * p.keyToEarMs / max).toFixed(0)}px;background:${col}"></span>
          ${fmt(p.keyToEarMs)} ms <span class="muted">${band.label}</span></div>`;
      }).join('')}</div></div>`;
  }

  if (R.soak) {
    const s = R.soak;
    html += `<div style="margin-top:18px"><h2>Stuck notes &amp; drops</h2>
      <div class="chk ${s.stuck === 0 ? 'pass' : 'fail'}"><span class="mark">${s.stuck === 0 ? '✓' : '✕'}</span>
        <span class="lbl">stuck notes over ${s.seconds}s (${s.notes} on/off pairs)</span><span class="val">${s.stuck}</span></div>
      <div class="chk ${s.silentAfterPanic ? 'pass' : 'fail'}"><span class="mark">${s.silentAfterPanic ? '✓' : '✕'}</span>
        <span class="lbl">silent after all-notes-off</span><span class="val">${s.silentAfterPanic ? 'yes' : 'NO — something is still sounding'}</span></div>
      <div class="chk ${s.dropped === 0 ? 'pass' : 'warnc'}"><span class="mark">${s.dropped === 0 ? '✓' : '!'}</span>
        <span class="lbl">notes sent but never heard</span><span class="val">${s.dropped} / ${s.notes}</span></div>
      ${C ? `<div class="chk ${C.dropped === 0 ? 'pass' : 'warnc'}"><span class="mark">${C.dropped === 0 ? '✓' : '!'}</span>
        <span class="lbl">dropped over the full loop (test C)</span><span class="val">${C.dropped} / ${C.n}</span></div>` : ''}
      ${B ? `<div class="chk ${B.lost === 0 ? 'pass' : 'warnc'}"><span class="mark">${B.lost === 0 ? '✓' : '!'}</span>
        <span class="lbl">notes lost on the relay</span><span class="val">${B.lost} / ${B.n}</span></div>` : ''}
    </div>`;
  }

  if (R.remedy) {
    html += `<div style="margin-top:18px"><h2>What to fix first</h2>
      <p class="note" style="margin-top:0">Biggest single leg: <strong>${R.remedy.dominant.name}</strong> at ${fmt(R.remedy.dominant.ms)} ms.</p>
      <div class="remedy">${R.remedy.text}</div></div>`;
  }

  if (R.env.source === 'loopback' || !R.env.midiOut) {
    html += `<div style="margin-top:18px"><h2>These numbers are from the stand-in, not your instrument</h2>
      <p class="note" style="margin-top:0">No hardware was in the chain — the built-in voice stood in for it.
      Everything above is real measurement of the <em>software</em> floor; plugging your synth in adds four
      things this run could not see:</p>
      <ul class="note" style="margin-top:6px">
        <li><strong>The MIDI wire.</strong> Here it was a function call. USB-MIDI adds roughly 1–3 ms,
          DIN more, and a cheap interface's MIDI buffering can add far more.</li>
        <li><strong>Your instrument's own note-on latency.</strong> The stand-in starts on an exact sample.
          A real digital synth takes 2–10 ms to reach its first sample, an analogue one is faster but its
          envelope attack is part of what the player hears.</li>
        <li><strong>The A/D converter and your interface's input buffer.</strong> 3–15 ms depending on
          buffer size — this is the one number you can actually change, and test A will show it move.</li>
        <li><strong>Real wire time.</strong> Test C's loop had none, so leg 3 (${fmt(C && C.leg3_return && C.leg3_return.p50)} ms)
          is the pure codec + jitter-buffer floor with a zero-length network. That floor is the point:
          it is what your player pays before the internet is even involved.</li>
      </ul>
      <p class="note">Pick a real MIDI output and a real audio input above and run A and C again.</p></div>`;
  }

  html += `<details style="margin-top:18px"><summary>Raw JSON</summary>
    <pre style="font-size:11px;color:#8b94a3;white-space:pre-wrap;max-height:340px;overflow:auto">${
      JSON.stringify(R, null, 1).replace(/</g, '&lt;')}</pre></details>`;

  $('report').innerHTML = html;
}

// ==================================================== 5 · KEYBOARD =========
const KEYMAP = {
  a: 60, s: 62, d: 64, f: 65, g: 67, h: 69, j: 71, k: 72,
  q: 72, w: 74, e: 76, r: 77, t: 79, y: 81, u: 83, i: 84,
};
function buildKbd() {
  $('kbd').innerHTML = Object.keys(KEYMAP).map((k) => `<div class="k" data-k="${k}">${k}</div>`).join('');
  $('kbd').addEventListener('pointerdown', (e) => {
    const k = e.target.closest('.k'); if (!k) return;
    hit(k.dataset.k, true); setTimeout(() => hit(k.dataset.k, false), 140);
  });
}
const held = new Set();
function hit(k, down) {
  const n = KEYMAP[k]; if (n === undefined) return;
  const el = document.querySelector(`.k[data-k="${k}"]`);
  if (down) {
    if (held.has(k)) return;
    held.add(k); el && el.classList.add('lit');
    if (S.dc && S.dc.readyState === 'open') S.dc.send(buildBin(90000 + n, n, 100, 1, nowUs()));
    else noteOn(n, 100, true);
  } else {
    held.delete(k); el && el.classList.remove('lit');
    noteOff(n);
  }
}
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.code === 'Space') { e.preventDefault(); panic(); return; }
  if (KEYMAP[e.key] !== undefined) { e.preventDefault(); hit(e.key, true); }
});
window.addEventListener('keyup', (e) => { if (KEYMAP[e.key] !== undefined) hit(e.key, false); });

// ==================================================== WIRING ===============
function busy(on, ids = ['btnA', 'btnB', 'btnC', 'btnSoak', 'btnD', 'btnReport']) {
  for (const i of ids) $(i).disabled = on || (!S.enabled && i !== 'btnReport');
}
async function guard(statusId, fn, name) {
  busy(true);
  $(statusId).textContent = 'running…';
  try {
    const r = await fn();
    $(statusId).textContent = 'done';
    log(name + ' ' + JSON.stringify(r));
    return r;
  } catch (e) {
    $(statusId).textContent = 'failed: ' + ((e && e.message) || e);
    fail(name, e);
    return null;
  } finally { busy(false); }
}

$('btnEnable').onclick = () => enable().catch((e) => fail('enable', e));
$('midiOut').onchange = () => { applySource(); renderChecks(); };
$('audioIn').onchange = () => { applySource(); renderChecks(); };
$('monReturn').onchange = (e) => {
  const on = e.target.checked;
  if (!S.ac) return;
  const lvl = +$('monLevel').value / 100;
  S.returnMon.gain.value = on ? lvl : 0;
  S.directMon.gain.value = on ? 0 : lvl;
  $('monPill').textContent = on ? 'return-path monitoring' : 'DIRECT monitoring — you are lying to yourself';
  $('monPill').className = 'pill' + (on ? ' on' : '');
};
$('monLevel').oninput = (e) => {
  if (!S.ac) return;
  const lvl = +e.target.value / 100;
  if ($('monReturn').checked) S.returnMon.gain.value = lvl; else S.directMon.gain.value = lvl;
};
$('dist').oninput = (e) => setDistance(+e.target.value);
$('btnA').onclick = async () => { S.results.A = await guard('statusA', () => testA(), 'A') || S.results.A; };
$('btnB').onclick = async () => { S.results.B = await guard('statusB', () => testB(), 'B') || S.results.B; };
$('btnC').onclick = async () => { S.results.C = await guard('statusC', () => testC(), 'C') || S.results.C; };
$('btnD').onclick = async () => { await guard('statusD', () => testD(), 'D'); };
$('btnSoak').onclick = async () => {
  S.results.soak = await guard('statusSoak', () => testSoak(+$('soakSec').value), 'soak') || S.results.soak;
};
$('btnReport').onclick = () => { try { buildReport(); $('statusR').textContent = 'built'; } catch (e) { fail('report', e); } };
buildKbd();
$('soakSec').value = P.get('soak') || 60;

// ==================================================== AUTOMATION ===========
// Exposed for harness/run-hostcheck.mjs. Same code paths as the buttons.
window.__hc = {
  ready: true,
  enable,
  state: () => ({ enabled: S.enabled, src: S.srcMode, midi: !!S.midiPort, errors }),
  errors: () => errors,
  results: () => S.results,
  runA: (n) => testA(n || N_A).then((r) => (S.results.A = r)),
  runB: (n) => testB(n || N_B).then((r) => (S.results.B = r)),
  runC: (n) => testC(n || N_C).then((r) => (S.results.C = r)),
  runSoak: (s) => testSoak(s).then((r) => (S.results.soak = r)),
  setDistance: (idx) => { $('dist').value = idx; setDistance(idx); },
  runD: () => testD(),
  report: () => buildReport(),
};
window.__hcAuto = async (o = {}) => {
  await enable();
  await sleep(400);
  S.results.A = await testA(o.na || 30);
  if (!o.skipB) { try { S.results.B = await testB(o.nb || 20); } catch (e) { fail('B', e); } }
  try { S.results.C = await testC(o.nc || 40); } catch (e) { fail('C', e); }
  for (const idx of (o.dist || [0, 2, 3])) {
    window.__hc.setDistance(idx);
    await sleep(300);
    await testD();
  }
  window.__hc.setDistance(0);
  await sleep(200);
  S.results.soak = await testSoak(o.soak || 8);
  buildReport();
  return { errors, ok: errors.length === 0 };
};
log('host-check loaded' + (AUTO ? ' (auto)' : ''));
if (AUTO) window.__hcAuto({ soak: +(P.get('soak') || 8) }).catch((e) => fail('auto', e));
