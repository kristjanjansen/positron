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
  makeSynthVoice, dist, makeBackstop,
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
  sid: null, actSeq: 0, lastSid: null,
  // the per-session OWNER capability, handed to this page alone on the accept
  // frame. It is what authorises the media upload for THIS session without
  // shipping the instrument-wide INSTRUMENT_TOKEN into every request.
  token: null, lastToken: null,
};
const isDup = makeDedupe(30000);

// ============================================================================
// SESSION LOG — the HOST's lane.
//
// The player logs what they MEANT, stamped in the player's clock. We log what
// the instrument ACTUALLY DID, stamped in ours — the same clock the audio
// recording below is stamped in. That is the whole point: audio and actuation
// are natively aligned (one machine, sub-ms), so replaying a stored session
// needs no cross-machine skew correction at all. The two lanes are stored side
// by side and NEVER reconciled into one: `hostActuatedAt − playerSentAt` per
// note (paired through `ref`) IS the measured one-way latency, i.e. the pair of
// lanes is the drift channel. Averaging them would destroy the measurement.
// ============================================================================
const HPEND = [];
const HSTORE = { appended: 0, rejected: 0, total: 0, errors: 0, flushing: false, deleted: null };
const perfToEpochUs = (perfMs) => Math.round((perfMs + performance.timeOrigin) * 1000 + clock.offUs());

// Which session a host-side event belongs to: the live one, or — during the
// post-teardown drain — the one the recorder was finalizing. Every pending row
// carries its own sid so a fast next session can never inherit the last one's
// tail.
const curSid = () => S.sid || (REC.lanes.av.rec ? REC.lanes.av.sid : null) || (REC.lanes.audio.rec ? REC.lanes.audio.sid : null) || S.lastSid;
const LANESEQ = new Map();      // sid -> next seq in this session's `instrument` lane
function hlog(at, kind, raw, disp, extra) {
  const sid = (extra && extra._sid) || curSid();
  if (!sid || HSTORE.deleted) return;
  // ONE seq counter PER SESSION for the whole `instrument` lane — actuations
  // and span markers share a source, so they must share the monotonic sequence
  // the DO enforces, and a recorder still finalizing the PREVIOUS session must
  // not restart at 0. A note's link to the player's lane is `ref`, not `seq`.
  const n = LANESEQ.get(sid) || 0;
  LANESEQ.set(sid, n + 1);
  S.actSeq++;
  HPEND.push({ _sid: sid, seq: n, at: Math.round(at), kind, source: 'instrument', ...(raw ? { raw } : {}), display: disp, ...(extra || {}) });
  if (HPEND.length >= 200) hflush().catch(() => {});
}
// THE DURABILITY BACKSTOP for the host's event lane. A batch that cannot be
// POSTed is written to IndexedDB and drained oldest-first when the network
// returns — selfrec's shape, and ordered, because the DO's monotonic seq per
// (session, source) turns an overtaking batch into a silent loss.
const HBACK = makeBackstop({
  name: 'instr-host-events', log,
  send: async (item) => {
    const r = await fetch(`${WORKER}/session/${item.sid}/events`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: item.body,
    });
    const jj = await r.json().catch(() => ({}));
    // a tombstone is a FINAL answer, not a transport failure: consume the item
    if (r.status === 410) { HSTORE.deleted = jj.deletedBy || 'someone'; HPEND.length = 0; return jj; }
    if (!r.ok) throw new Error(r.status + ' ' + JSON.stringify(jj).slice(0, 120));
    HSTORE.appended += jj.appended; HSTORE.rejected += jj.rejected; HSTORE.total = jj.total;
    return jj;
  },
});
async function hflush() {
  if (HSTORE.flushing || HSTORE.deleted) return null;
  if (!HPEND.length) { if (HBACK.pending()) await HBACK.drain(); return null; }
  HSTORE.flushing = true;
  const sid = HPEND[0]._sid;
  const batch = [];
  for (let i = 0; i < HPEND.length && batch.length < 500;) {
    if (HPEND[i]._sid === sid) batch.push(HPEND.splice(i, 1)[0]); else i++;
  }
  try {
    const body = JSON.stringify({ instrument: S.inst ? S.inst.id : null, events: batch.map(({ _sid, ...e }) => e) });
    const r = await HBACK.offer({ sid, body, bytes: body.length, count: batch.length, label: `${batch.length} host events` });
    if (r.parked) HSTORE.errors++;
    if (!r.ok && !r.parked) { HPEND.unshift(...batch); HSTORE.errors++; }  // backstop not open yet
    return r.result || null;
  } finally { HSTORE.flushing = false; }
}
setInterval(() => { hflush().catch(() => {}); }, 1000);

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

// ---------------- camera (optional): the instrument itself --------------------
// The camera becomes the panel's BACKGROUND rather than a second track: the
// published stream stays panel.captureStream(), so switching cameras mid-session
// needs no renegotiation and no replaceTrack, and the burned clock + note flash
// stay composited on top (they are what makes latency measurable).
const camVideo = document.createElement('video');
camVideo.muted = true; camVideo.playsInline = true;
async function listCameras() {
  const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
  const sel = $('videoin');
  if (!sel) return 0;
  const keep = sel.value;
  sel.innerHTML = '<option value="">— no camera (panel only) —</option>';
  for (const d of devs) {
    const o = document.createElement('option');
    o.value = d.deviceId; o.textContent = d.label || `camera ${d.deviceId.slice(0, 8)}`;
    sel.appendChild(o);
  }
  if (keep) sel.value = keep;
  return devs.length;
}
async function openCamera() {
  const sel = $('videoin');
  const deviceId = sel ? sel.value : '';
  if (S.camStream) { for (const t of S.camStream.getTracks()) t.stop(); S.camStream = null; }
  if (!deviceId) { camVideo.srcObject = null; log('camera off — panel only'); return null; }
  // No audio here: the instrument's sound comes from the interface, never the
  // camera mic (a camera mic would be room sound with AGC and EC applied).
  S.camStream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 30 } },
    audio: false,
  });
  camVideo.srcObject = S.camStream;
  await camVideo.play().catch(() => {});
  const s = S.camStream.getVideoTracks()[0].getSettings();
  await listCameras();  // labels appear only after a grant
  log('camera open —', JSON.stringify({ w: s.width, h: s.height, fps: s.frameRate }));
  return s;
}

// ---------------- the panel (what the player watches) -------------------------
const panel = $('panel');
const pctx = panel.getContext('2d', { alpha: false, desynchronized: true });
const flashes = [];   // {seq, note, vel, until}
let frames = 0;
function drawPanel() {
  const t = nowUs();
  pctx.fillStyle = '#0b0d0f'; pctx.fillRect(0, 0, 640, 360);
  // camera as background, aspect-preserving cover; overlay text stays legible
  if (S.camStream && camVideo.readyState >= 2 && camVideo.videoWidth) {
    const vw = camVideo.videoWidth, vh = camVideo.videoHeight;
    const s = Math.max(640 / vw, 360 / vh);
    const dw = vw * s, dh = vh * s;
    pctx.drawImage(camVideo, (640 - dw) / 2, (360 - dh) / 2, dw, dh);
    pctx.fillStyle = 'rgba(11,13,15,0.45)'; pctx.fillRect(0, 0, 640, 180);
  }
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
  const actPerfMs = at === 0 ? now : want;
  S.lastActMs = +(actPerfMs - perfFromEpochUs(f.tUs)).toFixed(2);
  // the host lane: when the instrument was actually driven, in HOST epoch µs —
  // the same clock domain as the audio recording, and `ref` back to the
  // player's own note seq so the two lanes stay pairable.
  hlog(perfToEpochUs(actPerfMs), 'midi-actuated', [status, f.note, f.vel],
    display(status, f.note, f.vel), { ref: f.seq });
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

// ============================================================================
// SESSION AUDIO — the proven selfrec chunk path, pointed at instrument/<sid>/.
//
// MediaRecorder(timeslice 2 s) on the SAME audio track the player is hearing.
// The chunk sequence is ONE logical webm byte stream (only chunk 0 carries the
// header); each chunk is its own R2 object, so a mid-session death loses at
// most one timeslice. Upload = POST → R2 server-side sha256 verify → retry;
// finalize = list what actually landed, compare, then write the manifest.
//
// CONSENT: default OFF, and it is the OWNER's switch. It is their instrument
// and their room; nobody else gets to turn on a microphone in it.
// ============================================================================
// TWO LANES OF MEDIA, one recorder each, both governed by the same consent
// switch (off / audio / audio+video):
//   `audio` — MediaRecorder on the audio track alone, opus in webm. The v0 lane.
//   `av`    — ONE MediaRecorder on `new MediaStream([...audio, ...video])`, so a
//             single webm carries both the instrument's sound and the panel the
//             player was actually watching (camera composited in as background
//             when one is selected). Not two files to re-sync later.
// Each lane writes its OWN `media-span` pair carrying `payload.kind`, so a
// consumer can tell an audio-only span from an A/V span without opening a file.
const REC_MIMES = {
  audio: ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'],
  // h264 first (a Chrome that encodes it makes any later repackage a pure
  // remux); vp8+opus is the guaranteed fallback. selfrec's probe discipline:
  // whichever is chosen, the probe table is reported.
  av: ['video/webm;codecs=h264,opus', 'video/webm;codecs=avc1,opus',
       'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm'],
};
const CONSENT_MODES = { off: [], audio: ['audio'], 'audio+video': ['audio', 'av'] };
const REC = { mode: 'off', lanes: {} };

async function sha256Hex(blob) {
  const d = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function makeLane(lane, what) {
  const R = {
    lane, what, state: 'idle', mime: null, sid: null, token: null, t0: null,
    chunks: 0, bytes: 0, uploaded: 0, failed: 0, attempts: 0,
    verified: 0, verifiedBytes: 0, finalized: false, manifestKey: null,
    error: null, rows: [], probe: {}, degraded: false, missing: [],
    rec: null, stopRes: null, pending: [], seq: 0,
  };
  // the media backstop: a chunk that cannot be POSTed goes to IndexedDB and is
  // drained oldest-first. Nothing is dropped; what is STILL parked when the
  // manifest is written is named there as `missing` with degraded:true.
  R.back = makeBackstop({
    name: `instr-host-${lane}`, log,
    send: async (item) => {
      R.attempts++;
      const r = await fetch(`${WORKER}/session/${item.sid}/${lane}/${item.seq}`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + ENV.INSTRUMENT_TOKEN,
          'X-Session-Token': item.token || '',
          'content-type': lane === 'av' ? 'video/webm' : 'audio/webm',
          'X-Chunk-Sha256': item.sha256,
        },
        body: item.blob,
      });
      const jj = await r.json().catch(() => ({}));
      if (r.status === 410) {                    // deleted mid-recording: final
        R.error = 'session deleted — upload abandoned';
        try { if (R.rec) R.rec.stop(); } catch {}
        return jj;
      }
      if (!r.ok) throw new Error(r.status + ' ' + (jj.error || ''));
      if (jj.size !== item.bytes) throw new Error(`size mismatch ${jj.size}!=${item.bytes}`);
      R.uploaded++;
      R.rows.push({ seq: item.seq, key: jj.key, bytes: item.bytes, sha256: item.sha256 });
      return jj;
    },
  });
  return R;
}
REC.lanes.audio = makeLane('audio', 'instrument audio');
REC.lanes.av = makeLane('av', 'instrument audio + panel video');

function startLane(R, tracks) {
  if (!S.sid || R.rec || !tracks.length) return null;
  const mimes = REC_MIMES[R.lane];
  for (const m of mimes) R.probe[m] = MediaRecorder.isTypeSupported(m);
  const mime = mimes.find((m) => R.probe[m]) || '';
  let rec;
  try {
    rec = new MediaRecorder(new MediaStream(tracks), {
      ...(mime ? { mimeType: mime } : {}),
      ...(R.lane === 'av' ? { videoBitsPerSecond: 800000, audioBitsPerSecond: 64000 } : {}),
    });
  } catch (e) { R.error = 'MediaRecorder: ' + e.message; log(R.lane, 'recorder failed', e.message); return null; }
  R.rec = rec;
  R.sid = S.sid; R.token = S.token; R.mime = rec.mimeType || mime; R.state = 'recording';
  R.chunks = 0; R.bytes = 0; R.uploaded = 0; R.failed = 0; R.attempts = 0;
  R.verified = 0; R.verifiedBytes = 0; R.finalized = false; R.manifestKey = null;
  R.error = null; R.rows = []; R.seq = 0; R.pending = []; R.degraded = false; R.missing = [];
  rec.ondataavailable = (ev) => {
    if (!ev.data || !ev.data.size) return;
    const seq = R.seq++;
    R.chunks++; R.bytes += ev.data.size;
    R.pending.push((async () => {
      const sha256 = await sha256Hex(ev.data);
      await R.back.offer({ sid: R.sid, token: R.token, seq, blob: ev.data, bytes: ev.data.size, sha256,
        label: `${R.lane} chunk ${seq}` });
    })());
  };
  rec.onerror = (e) => { R.error = 'recorder: ' + (e.error && e.error.message || e); };
  rec.onstop = () => { R.state = 'stopped'; if (R.stopRes) R.stopRes(); };
  R.t0 = Math.round(nowUs());
  rec.start(2000);
  // media-span START on the log: the media is BY REFERENCE, and the marker on
  // the timeline — not the prefix column — is what makes this a recording of a
  // session rather than a row with a file bolted to it. `kind` names the lane.
  hlog(R.t0, 'media-span', null, `${R.what} recording started (${R.mime})`, {
    payload: { phase: 'start', kind: R.lane,
      mediaRef: { prefix: `instrument/${S.sid}/${R.lane}/`, mime: R.mime, timesliceMs: 2000,
        tracks: tracks.map((t) => t.kind) } },
  });
  log('recording', R.lane, '→', `instrument/${S.sid}/${R.lane}/`, R.mime);
  paintRec();
  return R.mime;
}

async function stopLane(R, why = 'session end') {
  if (!R.rec) return null;
  const rec = R.rec; R.rec = null;
  const stopped = new Promise((res) => { R.stopRes = res; });
  try { rec.stop(); } catch {}
  await stopped;
  await Promise.allSettled(R.pending);          // every chunk offered or parked
  R.state = 'draining';
  // the bounded drain: anything still in IndexedDB after this is DEGRADED and
  // is named in the manifest rather than vanishing.
  const settled = await R.back.settle(30000).catch(() => ({ drained: false, left: -1, rows: [] }));
  const durUs = Math.round(nowUs()) - R.t0;
  // VERIFY: what is actually in R2, compared to what we think we sent.
  let list = { count: 0, objects: [], bytes: 0 };
  try { list = await (await fetch(`${WORKER}/session/${R.sid}/${R.lane}`, { cache: 'no-store' })).json(); }
  catch (e) { R.error = 'list: ' + e.message; }
  const stored = new Map((list.objects || []).map((o) => [o.key, o.size]));
  R.verified = R.rows.filter((row) => stored.get(row.key) === row.bytes).length;
  R.verifiedBytes = R.rows.reduce((n, row) => n + (stored.get(row.key) === row.bytes ? row.bytes : 0), 0);
  const parked = (settled.rows || []).map((r) => r.seq);
  R.missing = [...new Set([...R.rows.filter((row) => stored.get(row.key) !== row.bytes).map((row) => row.seq), ...parked])];
  R.failed = R.missing.length;
  R.degraded = R.missing.length > 0;
  const bk = R.back.stats();
  const manifest = {
    sessionId: R.sid, lane: R.lane, instrument: S.inst ? S.inst.id : null, mime: R.mime, timesliceMs: 2000,
    t0: R.t0, durUs, clock: clock.info(), why, codecProbe: R.probe,
    chunkCount: R.chunks, uploaded: R.uploaded, verified: R.verified,
    bytes: R.verifiedBytes, missing: R.missing, degraded: R.degraded,
    backstop: { parked: bk.parked, drained: bk.sentDrained, direct: bk.sentDirect,
      hwmItems: bk.hwmItems, hwmBytes: bk.hwmBytes, drainMs: bk.drainMs, stillParked: settled.left },
    chunks: R.rows.slice().sort((a, b) => a.seq - b.seq),
    finalizedAt: Math.round(nowUs()),
  };
  try {
    const rr = await fetch(`${WORKER}/session/${R.sid}/${R.lane}/manifest`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + ENV.INSTRUMENT_TOKEN, 'X-Session-Token': R.token || '',
        'content-type': 'application/json' },
      body: JSON.stringify(manifest),
    });
    if (rr.ok) { R.finalized = true; R.manifestKey = (await rr.json()).key; }
  } catch (e) { R.error = 'finalize: ' + e.message; }
  hlog(R.t0 + durUs, 'media-span', null,
    `${R.what} recording ended (${(durUs / 1e6).toFixed(1)} s, ${R.verified} chunks, ${R.verifiedBytes} B)`, {
      _sid: R.sid,   // the session this recording belongs to, even if a new one started
      payload: { phase: 'end', kind: R.lane, durUs, chunkCount: R.chunks, verified: R.verified,
        bytes: R.verifiedBytes, degraded: R.degraded, missing: R.missing, manifestKey: R.manifestKey,
        backstop: manifest.backstop },
    });
  await hflush();
  R.state = 'done';
  log('recording', R.lane, 'finalized —', R.verified, '/', R.chunks, 'chunks,', R.verifiedBytes, 'B',
    R.degraded ? `DEGRADED missing ${JSON.stringify(R.missing)}` : '', R.manifestKey || '(no manifest)');
  paintRec();
  return manifest;
}

// the two lanes, driven together by the consent mode
function startRec(audioTrack, videoTrack) {
  const want = CONSENT_MODES[REC.mode] || [];
  const out = {};
  if (want.includes('audio') && audioTrack) out.audio = startLane(REC.lanes.audio, [audioTrack]);
  if (want.includes('av') && audioTrack && videoTrack) out.av = startLane(REC.lanes.av, [audioTrack, videoTrack]);
  return out;
}
async function stopRec(why = 'session end') {
  const r = {};
  for (const k of ['audio', 'av']) if (REC.lanes[k].rec) r[k] = await stopLane(REC.lanes[k], why);
  return r;
}

function paintRec() {
  const el = $('s-rec');
  if (!el) return;
  if (REC.mode === 'off') { el.textContent = 'off — nothing is recorded'; el.className = 'dim'; return; }
  const live = (CONSENT_MODES[REC.mode] || []).map((k) => REC.lanes[k]);
  if (live.every((R) => R.state === 'idle')) {
    el.textContent = `armed (${REC.mode}) — will record the next session`; el.className = 'warn'; return;
  }
  el.textContent = live.map((R) => `${R.lane} ${R.state} ${R.verified || R.uploaded}/${R.chunks} · ${(R.bytes / 1024).toFixed(0)} kB`
    + (R.finalized ? ' ✓' : '') + (R.degraded ? ' DEGRADED' : '')).join('  |  ');
  el.className = live.some((R) => R.error || R.degraded) ? 'bad' : live.every((R) => R.finalized) ? 'ok' : 'warn';
}

// one shape for the HUD, the harness and the log: the rolled-up view plus each
// lane in full. `state`/`finalized` roll up across the consented lanes only.
function recSnapshot() {
  const laneSnap = (R) => ({
    lane: R.lane, state: R.state, mime: R.mime, chunks: R.chunks, bytes: R.bytes,
    uploaded: R.uploaded, verified: R.verified, verifiedBytes: R.verifiedBytes,
    finalized: R.finalized, manifestKey: R.manifestKey, failed: R.failed,
    degraded: R.degraded, missing: R.missing, error: R.error, probe: R.probe,
    backstop: R.back.stats(),
  });
  const want = CONSENT_MODES[REC.mode] || [];
  const A = REC.lanes.audio, V = REC.lanes.av;
  const primary = want.includes('av') ? V : A;
  return {
    mode: REC.mode, consent: REC.mode !== 'off', lanes: want,
    state: want.length ? (want.every((k) => REC.lanes[k].state === 'done') ? 'done' : primary.state) : 'idle',
    mime: primary.mime, finalized: want.length ? want.every((k) => REC.lanes[k].finalized) : false,
    chunks: A.chunks + V.chunks, bytes: A.bytes + V.bytes,
    verified: A.verified + V.verified, verifiedBytes: A.verifiedBytes + V.verifiedBytes,
    manifestKey: primary.manifestKey, degraded: A.degraded || V.degraded,
    error: A.error || V.error || null,
    audio: laneSnap(A), av: laneSnap(V),
  };
}

// The owner's half of the consent story: delete a session outright — the
// player's notes AND the audio this page recorded. Needs INSTRUMENT_TOKEN,
// because it is a claim to own the instrument, not just to have played it.
async function deleteSession(id = S.lastSid) {
  if (!id) return { error: 'no session id' };
  // the per-session ownerToken is the narrow capability; INSTRUMENT_TOKEN is
  // the broad one (a claim to own the hardware). Either is accepted.
  const tok = id === S.sid ? S.token : id === S.lastSid ? S.lastToken : null;
  const r = await fetch(`${WORKER}/session/${id}/delete`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + ENV.INSTRUMENT_TOKEN, 'X-Session-Token': tok || '',
      'content-type': 'application/json' },
    body: JSON.stringify({ by: 'owner' }),
  });
  const jj = await r.json().catch(() => ({}));
  if (r.ok && id === S.sid) { HSTORE.deleted = 'owner'; HPEND.length = 0; }
  const el = $('s-rec');
  if (el && r.ok) { el.textContent = `session ${id} deleted (${jj.eventsDropped} rows, ${jj.audioObjectsPurged} audio objects)`; el.className = 'warn'; }
  log('owner delete', id, '→', JSON.stringify(jj));
  return jj;
}

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
  // record EXACTLY what the player is hearing AND EXACTLY what they are
  // watching — the same track objects that are on the wire, not a second
  // capture. Only the lanes the owner consented to.
  startRec(audioTrack, videoTrack);
  await pc.setLocalDescription(await pc.createAnswer());
  S.sig.send({ type: 'signal', kind: 'answer', payload: { sdp: pc.localDescription.sdp } });
  await pcConnected(pc);
  S.setupMs = +(performance.now() - t0).toFixed(0);
  log('peer connected in', S.setupMs, 'ms — returning', S.midiOut && S.micStream ? 'device audio' : 'synthetic audio');
}

function teardown(why) {
  panic(why);
  stopRec(why).catch((e) => log('stopRec failed', e.message));
  hflush().catch(() => {});
  if (S.pc) { try { S.pc.close(); } catch {} S.pc = null; }
  S.ch = null; S.player = null; S.sessionSince = null; S.sid = null;
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
    S.sid = m.sid || null; S.lastSid = S.sid || S.lastSid; S.actSeq = 0;
    // the OWNER capability for this session, ours alone (the player got a
    // different one on their own copy of this frame)
    S.token = m.token || null; S.lastToken = S.token || S.lastToken;
    HSTORE.deleted = null; HSTORE.appended = 0; HSTORE.rejected = 0; HSTORE.total = 0;
    $('s-player').textContent = `${m.name} · since ${new Date(m.since).toISOString().slice(11, 19)}`;
    $('s-player').className = 'ok';
    $('b-end').disabled = false;
    $('reqbox').style.display = 'none';
    if ($('s-sid')) $('s-sid').textContent = S.sid || '—';
    if ($('b-delsess')) $('b-delsess').disabled = !S.sid;
    paintRec();
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
$('b-cam').onclick = () => openCamera().catch((e) => log('openCamera failed', e.message));
// Live switch: changing the picker mid-session swaps the background only — the
// published track is the canvas, so there is nothing to renegotiate.
$('videoin').onchange = () => { if (S.camStream || $('videoin').value) openCamera().catch(() => {}); };
// consent: OFF unless the owner says otherwise, every page load, and NOT
// persisted — a setting remembered from last week is not consent for today.
// Three states now, because a camera is a bigger ask than a microphone:
//   off · audio · audio+video
const RECQ = P.get('rec');
$('rec-mode').value = RECQ === 'av' || RECQ === 'audio+video' ? 'audio+video'
  : RECQ === '1' || RECQ === 'audio' ? 'audio' : 'off';
REC.mode = $('rec-mode').value;
$('rec-mode').onchange = () => {
  const want = CONSENT_MODES[$('rec-mode').value] ? $('rec-mode').value : 'off';
  REC.mode = want;
  const keep = CONSENT_MODES[want];
  // stop any lane the owner just withdrew consent for, immediately
  for (const k of ['audio', 'av']) {
    if (!keep.includes(k) && REC.lanes[k].rec) stopLane(REC.lanes[k], 'owner switched ' + k + ' recording off').catch(() => {});
  }
  if (S.pc && S.sid) {
    const tracks = S.pc.getSenders().map((s) => s.track).filter(Boolean);
    startRec(tracks.find((t) => t.kind === 'audio'), tracks.find((t) => t.kind === 'video'));
  }
  log('recording consent:', REC.mode);
  paintRec();
};
$('b-delsess').onclick = () => {
  const id = ($('f-delsid').value || '').trim() || S.lastSid;
  if (!id || !confirm(`Delete session ${id}? Notes and audio both go.`)) return;
  deleteSession(id).catch((e) => log('delete failed', e.message));
};

setInterval(() => {
  $('s-midi').textContent = S.midiRecv;
  const d = dist(S.ow);
  $('s-ow').textContent = S.lastOw === null ? '—' : `${S.lastOw.toFixed(1)} ms / ${d.p50} ms (n=${d.n})`;
  $('s-ow').className = S.lastOw === null ? 'dim' : 'ok';
  $('s-act').textContent = S.lastActMs === null ? '—'
    : `+${S.lastActMs} ms after stamp · late ${S.lateNotes} · filtered ${S.filtered} · dup ${S.dropped}`;
  $('s-held').textContent = `${S.held.size}${S.watchdogFired ? ` (watchdog fired ${S.watchdogFired}×)` : ''}`;
  $('s-hlog').textContent = S.sid || S.lastSid
    ? `${HSTORE.total} rows${HPEND.length ? ` · ${HPEND.length} pending` : ''}${HSTORE.deleted ? ' · DELETED' : ''}`
    : '—';
  paintRec();
  const c = clock.info();
  $('s-clock').textContent = c.source ? `${c.source} · min-RTT ${c.minRttMs} ms · off ${(c.offUs / 1000).toFixed(1)} ms` : '—';
}, 400);

// ---------------- driver API for the harness ---------------------------------
window.host = {
  register, goOnline, goOffline, panic, openAudio, listAudioIn, openCamera, listCameras, unlist,
  accept: (pid) => accept(pid),
  deleteSession, stopRec, hflush,
  // accepts 'off' | 'audio' | 'audio+video' (and the old boolean, for callers
  // that predate the camera lane)
  setConsent: (mode) => {
    $('rec-mode').value = mode === true ? 'audio' : mode === false ? 'off' : (CONSENT_MODES[mode] ? mode : 'off');
    $('rec-mode').onchange();
    return REC.mode;
  },
  sid: () => S.sid || S.lastSid,
  token: () => S.token || S.lastToken,
  backstops: () => ({ events: HBACK.stats(), audio: REC.lanes.audio.back.stats(), av: REC.lanes.av.back.stats() }),
  rec: () => recSnapshot(),
  end: () => { S.sig.send({ type: 'end' }); teardown('owner ended'); },
  state: () => ({
    registered: S.registered, online: S.online, player: S.player, since: S.sessionSince,
    sid: S.sid, lastSid: S.lastSid,
    hostLog: { ...HSTORE, pending: HPEND.length, laneRowsLogged: S.actSeq, backstop: HBACK.stats() },
    rec: recSnapshot(),
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
// the durability backstops, opened before anything can need them
await Promise.all([HBACK, REC.lanes.audio.back, REC.lanes.av.back]
  .map((b) => b.open().catch((e) => log('backstop unavailable:', e.message))));
await listAudioIn().catch(() => 0);
await listCameras().catch(() => 0);
if (ac.state === 'suspended') await ac.resume();
$('hstate').textContent = 'ready';
log('ready — worker', WORKER, '| clock', CLOCK, JSON.stringify(clock.info()));
window.hostReady = true;
