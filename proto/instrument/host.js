// proto/instrument/host.js — the SYNTH OWNER's side of the remote instrument.
//
// Shape (proven in proto/jam/remote-synth.js, peer B):
//   player  --16-B MIDI frames--> DataChannel(unordered, maxRetransmits:0) -->
//   host    --skew-map to local performance.now()--> output.send(bytes, at) -->
//   real hardware --audio interface--> getUserMedia track --> same PC, back.
//
// The host is the ANSWERER: the player offers with recvonly audio+video and a
// 'midi' DataChannel; we replaceTrack our instrument's audio (and the panel
// canvas) onto the transceivers it created. Signaling rides the
// elektron-instrument worker; the worker never sees a MIDI byte.
//
// SAFETY IS THE POINT. Somebody else's fingers are on your hardware:
//   · CC 120 + CC 123 + sustain-off on all 16 channels at session end, at
//     socket death, at page unload, and on the panic button.
//   · realtime status bytes (>= 0xF0, i.e. MIDI clock/start/stop/active-sensing)
//     are dropped at the door — a remote clock would fight the instrument's own.
//   · stuck-note watchdog: any note held past HOLD_MAX_MS gets its note-off
//     manufactured locally, so a dropped note-off on the lossy channel cannot
//     leave the instrument screaming.

import {
  makeClock, parseBin, buildBin, display, noteName, makeDedupe, isRealtime,
  allNotesOffBytes, connectSignal, iceComplete, pcConnected, makeAcMap,
  makeSynthVoice, dist,
} from '/instrument-core.js';

const P = new URLSearchParams(location.search);
const AUTO = P.get('auto') === '1';           // headless: auto-accept requests
const CLOCK = P.get('clock') === 'local' ? 'local' : 'worker';
const ICE = P.get('ice') === 'none' ? [] : [{ urls: 'stun:stun.cloudflare.com:3478' }];
const HOLD_MAX_MS = +(P.get('hold') || 6000);
const SRC_PLAYER = 1;

const $ = (id) => document.getElementById(id);
const logEl = $('log');
const lines = [];
function log(...a) {
  const s = `${new Date().toISOString().slice(11, 23)} ${a.join(' ')}`;
  lines.push(s); if (lines.length > 200) lines.shift();
  logEl.textContent = lines.join('\n'); logEl.scrollTop = 1e6;
  console.log('[host]', ...a);
}
const errors = [];
window.addEventListener('error', (e) => { errors.push(e.message); log('PAGEERR', e.message); });
window.addEventListener('unhandledrejection', (e) => { errors.push(String(e.reason)); log('UNHANDLED', String(e.reason && e.reason.message || e.reason)); });

// ---------------- boot: env, clock, audio ----------------------------------
const ENV = await (await fetch('/env.json')).json();
const WORKER = ENV.WORKER;
const clock = makeClock();
const nowUs = clock.nowUs;

const ac = new AudioContext({ sampleRate: 48000 });
await ac.audioWorklet.addModule('/jam/onset-worklet.js');   // the literal jam file
const acMap = makeAcMap(ac, nowUs);
const synthBus = ac.createGain();
const msDest = ac.createMediaStreamDestination();
synthBus.connect(msDest);
synthBus.connect(ac.destination);
const synthNote = makeSynthVoice(ac, synthBus);

// ---------------- state ------------------------------------------------------
const S = {
  inst: null, registered: false, online: false,
  sig: null, pc: null, ch: null, player: null, sessionSince: null,
  midiAccess: null, midiOut: null, micStream: null, micSettings: null,
  midiRecv: 0, actuated: 0, lateNotes: 0, dropped: 0, filtered: 0, watchdogFired: 0,
  ow: [], lastOw: null, lastActMs: null, held: new Map(), panics: 0, setupMs: null,
};
const isDup = makeDedupe(30000);

// ---------------- registration form ------------------------------------------
const FIELDS = ['name', 'model', 'loc', 'id'];
const saved = JSON.parse(localStorage.getItem('instrument.host') || '{}');
for (const f of FIELDS) if (saved[f]) $('f-' + f).value = saved[f];
if (P.get('instrument')) $('f-id').value = P.get('instrument');
if (P.get('name')) $('f-name').value = P.get('name');
for (const f of FIELDS) $('f-' + f).addEventListener('input', () => {
  localStorage.setItem('instrument.host', JSON.stringify(Object.fromEntries(FIELDS.map((k) => [k, $('f-' + k).value]))));
});

async function register() {
  const id = ($('f-id').value || '').trim() || ($('f-name').value || 'instrument').toLowerCase().replace(/[^\w.-]+/g, '-').slice(0, 40);
  $('f-id').value = id;
  const caps = [S.midiOut ? 'midi-hardware' : 'synthetic-synth', 'audio-return', 'panel-video'];
  const r = await fetch(WORKER + '/instruments/register', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + ENV.INSTRUMENT_TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify({ id, name: $('f-name').value || id, model: $('f-model').value, location: $('f-loc').value, caps }),
  });
  const jj = await r.json();
  if (!r.ok) { $('s-reg').textContent = 'FAILED ' + JSON.stringify(jj); $('s-reg').className = 'bad'; throw new Error('register: ' + JSON.stringify(jj)); }
  S.inst = jj.instrument; S.registered = true;
  $('s-reg').textContent = `${jj.instrument.name} (${id})`; $('s-reg').className = 'ok';
  $('b-online').disabled = false;
  log('registered', id);
  return jj.instrument;
}

// take the instrument out of the public catalog entirely (an owner must be able
// to leave, not just go quiet)
async function unlist() {
  const id = $('f-id').value;
  const r = await fetch(WORKER + '/instruments/unlist', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + ENV.INSTRUMENT_TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  goOffline();
  S.registered = false;
  $('s-reg').textContent = 'unlisted'; $('s-reg').className = 'dim';
  log('unlisted', id);
  return r.json();
}

// ---------------- Web MIDI ----------------------------------------------------
async function initMidi() {
  try {
    S.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
  } catch (e) { log('Web MIDI unavailable:', e.message, '— synthetic stand-in only'); return; }
  const sel = $('midiout');
  const fill = () => {
    const keep = sel.value;
    sel.innerHTML = '<option value="">— synthetic synth (WebAudio stand-in) —</option>';
    for (const [id, o] of S.midiAccess.outputs) {
      const opt = document.createElement('option');
      opt.value = id; opt.textContent = `${o.name}${o.manufacturer ? ' · ' + o.manufacturer : ''}`;
      sel.appendChild(opt);
    }
    sel.value = keep;
  };
  fill();
  S.midiAccess.onstatechange = fill;
  sel.onchange = () => {
    if (S.midiOut) { panic('output changed'); }
    S.midiOut = sel.value ? S.midiAccess.outputs.get(sel.value) : null;
    log('midi out →', S.midiOut ? S.midiOut.name : 'synthetic stand-in');
  };
  log('Web MIDI ok:', S.midiAccess.outputs.size, 'outputs');
}

// ---------------- audio input + the constraint audit --------------------------
// These four are the whole ballgame. Echo cancellation gates and ducks a synth
// into mush, AGC rides the dynamics, noise suppression eats pads and decays,
// and a 44.1 kHz capture resamples against a 48 kHz Opus path.
const WANT = { echoCancellation: false, autoGainControl: false, noiseSuppression: false, sampleRate: 48000 };
async function listAudioIn() {
  const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput');
  const sel = $('audioin');
  sel.innerHTML = '<option value="">— default device —</option>';
  for (const d of devs) {
    const o = document.createElement('option');
    o.value = d.deviceId; o.textContent = d.label || `audio input ${d.deviceId.slice(0, 8)}`;
    sel.appendChild(o);
  }
  return devs.length;
}
async function openAudio() {
  if (S.micStream) for (const t of S.micStream.getTracks()) t.stop();
  const deviceId = $('audioin').value;
  const audio = { ...WANT, ...(deviceId ? { deviceId: { exact: deviceId } } : {}) };
  S.micStream = await navigator.mediaDevices.getUserMedia({ audio, video: false });
  const track = S.micStream.getAudioTracks()[0];
  const got = track.getSettings();
  S.micSettings = got;
  const rows = [['device', got.label || track.label || 'device', true]];
  for (const [k, want] of Object.entries(WANT)) {
    const have = got[k];
    // undefined = the browser did not surface the setting; report it as such
    // rather than as a pass, so a real rig is not told a lie.
    const ok = have === undefined ? null : have === want;
    rows.push([k, `${have === undefined ? 'not reported' : have} (want ${want})`, ok]);
  }
  $('constraints').innerHTML = rows.map(([k, v, ok]) =>
    `<tr><td class="k">${k}</td><td class="${ok === null ? 'warn' : ok ? 'ok' : 'bad'}">${ok === null ? '?' : ok ? 'PASS' : 'FAIL'} <span class="dim">${v}</span></td></tr>`).join('');
  await listAudioIn();
  log('audio in open —', JSON.stringify({ sr: got.sampleRate, ec: got.echoCancellation, agc: got.autoGainControl, ns: got.noiseSuppression }));
  return got;
}

// ---------------- the panel (what the player watches) -------------------------
const panel = $('panel');
const pctx = panel.getContext('2d', { alpha: false, desynchronized: true });
const flashes = [];   // {seq, note, vel, until}
let frames = 0;
function drawPanel() {
  const t = nowUs();
  pctx.fillStyle = '#0b0d0f'; pctx.fillRect(0, 0, 640, 360);
  pctx.fillStyle = '#7d8791'; pctx.font = 'bold 15px monospace';
  pctx.fillText((S.inst ? S.inst.name : 'unregistered').toUpperCase(), 24, 36);
  pctx.font = '13px monospace';
  pctx.fillText(S.inst ? `${S.inst.model || '—'} · ${S.inst.location || '—'}` : '', 24, 58);
  // burned wall clock: the player can photograph both screens and compare
  pctx.fillStyle = '#79b8ff'; pctx.font = 'bold 30px monospace';
  pctx.fillText(new Date(t / 1000).toISOString().slice(11, 23), 24, 108);
  pctx.fillStyle = '#7d8791'; pctx.font = '13px monospace';
  pctx.fillText(`midi ${S.midiRecv}   actuated ${S.actuated}   held ${S.held.size}`, 24, 140);
  pctx.fillText(`one-way ${S.lastOw === null ? '—' : S.lastOw.toFixed(1) + ' ms'}   out: ${S.midiOut ? S.midiOut.name : 'synthetic'}`, 24, 162);
  // note flash
  const now = performance.now();
  while (flashes.length && flashes[0].until < now) flashes.shift();
  const f = flashes[flashes.length - 1];
  pctx.fillStyle = '#14181c'; pctx.fillRect(380, 190, 236, 140);
  if (f) {
    const a = Math.max(0, (f.until - now) / 140);
    pctx.fillStyle = `rgba(127,209,138,${0.25 + 0.75 * a})`;
    pctx.fillRect(380, 190, 236, 140);
    pctx.fillStyle = '#0b0d0f'; pctx.font = 'bold 44px monospace';
    pctx.fillText(noteName(f.note), 402, 254);
    pctx.font = 'bold 18px monospace';
    pctx.fillText(`v${f.vel}  #${f.seq}`, 402, 292);
  }
  // keyboard strip: every currently-held note lit
  for (let i = 0; i < 36; i++) {
    const n = 48 + i;
    pctx.fillStyle = S.held.has(n) ? '#7fd18a' : '#1c2126';
    pctx.fillRect(24 + i * 9, 300, 7, 30);
  }
  // motion strip so the encoder never starves (remote-synth §panel)
  pctx.fillStyle = `hsl(${frames % 360},70%,55%)`;
  pctx.fillRect(24 + ((frames * 5) % 560), 340, 30, 8);
  frames++;
}
// setInterval, NOT rAF: a background/headless tab stops rAF and the captured
// video track would freeze mid-session.
setInterval(drawPanel, 33);

// ---------------- MIDI actuation ---------------------------------------------
const perfFromEpochUs = (tUs) => (tUs - clock.offUs()) / 1000 - performance.timeOrigin;

function sendToInstrument(bytes, atPerfMs) {
  if (S.midiOut) { S.midiOut.send(bytes, atPerfMs); return; }
  // synthetic stand-in: the WebAudio percussive voice, note-ons only
  const status = bytes[0] & 0xf0;
  if (status === 0x90 && bytes[2] > 0) {
    const d = Math.max(0, atPerfMs - performance.now());
    if (d < 1) synthNote(bytes[1], bytes[2]);
    else setTimeout(() => synthNote(bytes[1], bytes[2]), d);
  }
}

function noteOff(note, ch = 0) {
  sendToInstrument([0x80 | ch, note, 0], 0);
  S.held.delete(note);
}

function actuate(f) {
  const status = f.status;
  if (isRealtime(status)) { S.filtered++; return; }          // MIDI clock etc — never forwarded
  const lead = +($('lead').value || 0);
  const want = perfFromEpochUs(f.tUs) + lead;
  const now = performance.now();
  const at = want <= now ? 0 : want;                          // already due → fire now
  // "late" only means something when a lead was asked for: at lead 0 every note
  // is due on arrival by definition, and counting those would be theatre.
  if (lead > 0 && want <= now) S.lateNotes++;
  sendToInstrument([status, f.note, f.vel], at);
  S.actuated++;
  S.lastActMs = +((at === 0 ? now : want) - perfFromEpochUs(f.tUs)).toFixed(2);
  const kind = status & 0xf0;
  if (kind === 0x90 && f.vel > 0) {
    S.held.set(f.note, { at: now, ch: status & 0x0f });
    flashes.push({ seq: f.seq, note: f.note, vel: f.vel, until: now + 140 });
  } else if (kind === 0x80 || (kind === 0x90 && f.vel === 0)) {
    S.held.delete(f.note);
  }
}

function onWire(buf) {
  const f = parseBin(buf);
  const recvUs = nowUs();
  if (isDup(f.src + ':' + f.seq + ':' + f.status)) { S.dropped++; return; }
  S.midiRecv++;
  S.lastOw = (recvUs - f.tUs) / 1000;
  S.ow.push(S.lastOw); if (S.ow.length > 400) S.ow.shift();
  actuate(f);
  // telemetry ack on the same (lossy) channel — a lost ack costs one HUD
  // sample, never correctness. Sender stamps are echoed verbatim, never
  // re-stamped (jam-core §2).
  if (S.ch && S.ch.readyState === 'open') {
    try { S.ch.send(JSON.stringify({ ack: f.seq, tUs: f.tUs, recvUs: Math.round(recvUs), actMs: S.lastActMs })); } catch {}
  }
  feed(`${display(f.status, f.note, f.vel)}  #${f.seq}  ow ${S.lastOw.toFixed(1)}ms`);
}

const feedEl = $('feed');
function feed(s) {
  const d = document.createElement('div');
  d.textContent = s;
  feedEl.prepend(d);
  while (feedEl.children.length > 60) feedEl.lastChild.remove();
}

// ---------------- safety ------------------------------------------------------
function panic(why = 'manual') {
  for (const b of allNotesOffBytes()) sendToInstrument(b, 0);
  S.held.clear();
  S.panics++;
  $('s-safe').textContent = `all-notes-off fired ×${S.panics} (${why})`;
  $('s-safe').className = 'ok';
  log('PANIC all-notes-off:', why);
}
// stuck-note watchdog: the MIDI channel is maxRetransmits:0, so a note-off CAN
// be lost. Anything held past HOLD_MAX_MS gets a locally manufactured note-off.
setInterval(() => {
  const now = performance.now();
  for (const [n, h] of [...S.held]) {
    if (now - h.at > HOLD_MAX_MS) { noteOff(n, h.ch); S.watchdogFired++; log('watchdog note-off', noteName(n)); }
  }
}, 500);
window.addEventListener('beforeunload', () => { panic('page unload'); if (S.sig) S.sig.send({ type: 'end' }); });

// ---------------- WebRTC (host = answerer) ------------------------------------
async function buildPeer(offer) {
  const t0 = performance.now();
  const pc = new RTCPeerConnection({ iceServers: ICE });
  S.pc = pc;
  pc.onconnectionstatechange = () => {
    $('s-pc').textContent = pc.connectionState;
    $('s-pc').className = pc.connectionState === 'connected' ? 'ok' : pc.connectionState === 'failed' ? 'bad' : 'dim';
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') panic('peer ' + pc.connectionState);
  };
  pc.onicecandidate = (e) => { if (e.candidate) S.sig.send({ type: 'signal', kind: 'ice', payload: e.candidate.toJSON() }); };
  pc.ondatachannel = (e) => {
    const ch = e.channel;
    ch.binaryType = 'arraybuffer';
    S.ch = ch;
    ch.onmessage = (ev) => { if (typeof ev.data !== 'string') onWire(ev.data); };
    ch.onclose = () => panic('midi channel closed');
    log('midi channel from player:', ch.label);
  };
  await pc.setRemoteDescription({ type: 'offer', sdp: offer.sdp });
  // publish: the instrument's audio (or the synthetic stand-in) + the panel
  const audioTrack = (S.midiOut && S.micStream) ? S.micStream.getAudioTracks()[0] : msDest.stream.getAudioTracks()[0];
  const videoTrack = panel.captureStream(15).getVideoTracks()[0];
  for (const tx of pc.getTransceivers()) {
    const kind = tx.receiver.track && tx.receiver.track.kind;
    if (kind === 'audio' && audioTrack) { await tx.sender.replaceTrack(audioTrack); tx.direction = 'sendonly'; }
    if (kind === 'video' && videoTrack) { await tx.sender.replaceTrack(videoTrack); tx.direction = 'sendonly'; }
  }
  await pc.setLocalDescription(await pc.createAnswer());
  S.sig.send({ type: 'signal', kind: 'answer', payload: { sdp: pc.localDescription.sdp } });
  await pcConnected(pc);
  S.setupMs = +(performance.now() - t0).toFixed(0);
  log('peer connected in', S.setupMs, 'ms — returning', S.midiOut && S.micStream ? 'device audio' : 'synthetic audio');
}

function teardown(why) {
  panic(why);
  if (S.pc) { try { S.pc.close(); } catch {} S.pc = null; }
  S.ch = null; S.player = null; S.sessionSince = null;
  $('b-end').disabled = true;
  $('s-player').textContent = '—'; $('s-player').className = 'dim';
  $('s-pc').textContent = '—'; $('s-pc').className = 'dim';
  $('reqbox').style.display = 'none';
}

// ---------------- signaling ---------------------------------------------------
function onFrame(m) {
  if (m.type === 'hello') { S.inst = m.instrument; log('hello — instrument', m.instrument.id); return; }
  if (m.type === 'request') {
    S.pendingReq = m.player;
    const box = $('reqbox');
    box.style.display = '';
    box.innerHTML = `<b>${m.player.name}</b> wants to play <b>${S.inst ? S.inst.name : ''}</b>
      <div class="row" style="margin-top:7px">
        <button id="b-accept" class="go">Accept</button>
        <button id="b-reject" class="stop">Decline</button>
      </div>`;
    $('b-accept').onclick = () => accept(m.player.pid);
    $('b-reject').onclick = () => { S.sig.send({ type: 'reject', player: m.player.pid, reason: 'owner declined' }); box.style.display = 'none'; };
    log('session request from', m.player.name);
    if (AUTO) accept(m.player.pid);
    return;
  }
  if (m.type === 'session' && m.state === 'accepted') {
    S.player = m.name; S.sessionSince = m.since;
    $('s-player').textContent = `${m.name} · since ${new Date(m.since).toISOString().slice(11, 19)}`;
    $('s-player').className = 'ok';
    $('b-end').disabled = false;
    $('reqbox').style.display = 'none';
    return;
  }
  if (m.type === 'session' && m.state === 'ended') { log('session ended:', m.reason); teardown('session ended: ' + m.reason); return; }
  if (m.type === 'signal') {
    if (m.kind === 'offer') buildPeer(m.payload).catch((e) => log('buildPeer failed', e.message));
    else if (m.kind === 'ice' && S.pc) S.pc.addIceCandidate(m.payload).catch(() => {});
    return;
  }
  if (m.type === 'error') log('signal error:', JSON.stringify(m));
}

function accept(pid) { S.sig.send({ type: 'accept', player: pid }); }

async function goOnline() {
  const id = $('f-id').value;
  S.sig = connectSignal({
    base: WORKER, instrument: id, role: 'host', token: ENV.INSTRUMENT_TOKEN,
    name: 'owner', onFrame,
    onClose: () => { S.online = false; $('s-ws').textContent = 'closed'; $('s-ws').className = 'bad'; teardown('signal socket closed'); },
  });
  await S.sig.ready;
  S.online = true;
  $('s-ws').textContent = 'open — listening for players'; $('s-ws').className = 'ok';
  $('hstate').textContent = 'online';
  $('b-online').textContent = 'Go offline';
  $('b-online').className = 'stop';
  $('b-online').onclick = goOffline;
  setInterval(() => S.online && S.sig.send({ type: 'hb' }), 20000);
  log('online as', id);
}
function goOffline() {
  teardown('owner went offline');
  if (S.sig) S.sig.close();
  S.online = false;
  $('hstate').textContent = 'offline';
  $('b-online').textContent = 'Go online';
  $('b-online').className = 'go';
  $('b-online').onclick = () => goOnline().catch((e) => log('goOnline failed', e.message));
}

// ---------------- wire the UI -------------------------------------------------
$('b-register').onclick = () => register().catch((e) => log('register failed', e.message));
$('b-online').onclick = () => goOnline().catch((e) => log('goOnline failed', e.message));
$('b-open').onclick = () => openAudio().catch((e) => { log('openAudio failed', e.message); $('constraints').innerHTML = `<tr><td class="bad">${e.message}</td></tr>`; });
$('b-unlist').onclick = () => unlist().catch((e) => log('unlist failed', e.message));
$('b-panic').onclick = () => panic('manual');
$('b-end').onclick = () => { S.sig.send({ type: 'end' }); teardown('owner ended'); };
$('audioin').onchange = () => { if (S.micStream) openAudio().catch(() => {}); };

setInterval(() => {
  $('s-midi').textContent = S.midiRecv;
  const d = dist(S.ow);
  $('s-ow').textContent = S.lastOw === null ? '—' : `${S.lastOw.toFixed(1)} ms / ${d.p50} ms (n=${d.n})`;
  $('s-ow').className = S.lastOw === null ? 'dim' : 'ok';
  $('s-act').textContent = S.lastActMs === null ? '—'
    : `+${S.lastActMs} ms after stamp · late ${S.lateNotes} · filtered ${S.filtered} · dup ${S.dropped}`;
  $('s-held').textContent = `${S.held.size}${S.watchdogFired ? ` (watchdog fired ${S.watchdogFired}×)` : ''}`;
  const c = clock.info();
  $('s-clock').textContent = c.source ? `${c.source} · min-RTT ${c.minRttMs} ms · off ${(c.offUs / 1000).toFixed(1)} ms` : '—';
}, 400);

// ---------------- driver API for the harness ---------------------------------
window.host = {
  register, goOnline, goOffline, panic, openAudio, listAudioIn, unlist,
  accept: (pid) => accept(pid),
  end: () => { S.sig.send({ type: 'end' }); teardown('owner ended'); },
  state: () => ({
    registered: S.registered, online: S.online, player: S.player, since: S.sessionSince,
    pc: S.pc ? S.pc.connectionState : null, ch: S.ch ? S.ch.readyState : null,
    midiRecv: S.midiRecv, actuated: S.actuated, late: S.lateNotes, filtered: S.filtered,
    dup: S.dropped, held: S.held.size, watchdogFired: S.watchdogFired, panics: S.panics,
    setupMs: S.setupMs, owMs: dist(S.ow), clock: clock.info(),
    micSettings: S.micSettings, usingSynthetic: !S.midiOut,
    errors,
  }),
};

// ---------------- go --------------------------------------------------------
await clock.calibrate(CLOCK, WORKER);
$('s-clock').textContent = JSON.stringify(clock.info());
await initMidi();
await listAudioIn().catch(() => 0);
if (ac.state === 'suspended') await ac.resume();
$('hstate').textContent = 'ready';
log('ready — worker', WORKER, '| clock', CLOCK, JSON.stringify(clock.info()));
window.hostReady = true;
