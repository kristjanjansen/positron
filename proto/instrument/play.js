// proto/instrument/play.js — the PLAYER's side: browse someone else's hardware,
// ask for it, play it, hear it come back, and keep the session as a timeline.
//
// Shape (proto/jam/remote-synth.js peer A, with a registry in front):
//   keyboard/Web-MIDI -> 16-B frame -> DataChannel(unordered, maxRetransmits:0)
//   -> host -> real synth -> audio track back on the SAME PeerConnection ->
//   onset worklet -> key→ear round trip, measured sample-accurately.
//
// THE TIMELINE CLAIM, made concrete: every event lands in ONE flat log
//   {at (epoch µs), kind:'midi', source, raw:[status,note,vel], display}
// plus an {kind:'audio-span'} record for the returned audio. "Replay" re-feeds
// that log through the SAME send path the keys use — record and replay are not
// two code paths that happen to agree, they are one path used twice. Replay-
// fired events are tagged and never re-enter the log (jam-core §1.11 overdub).

import {
  makeClock, buildBin, display, noteName, connectSignal, iceComplete, pcConnected,
  makeAcMap, makeOnsetTap, makeMatcher, isRealtime, dist,
} from '/instrument-core.js';

const P = new URLSearchParams(location.search);
const CLOCK = P.get('clock') === 'local' ? 'local' : 'worker';
const ICE = P.get('ice') === 'none' ? [] : [{ urls: 'stun:stun.cloudflare.com:3478' }];
const MYNAME = P.get('name') || 'player-' + Math.random().toString(36).slice(2, 6);
const SRC_PLAYER = 1;

const $ = (id) => document.getElementById(id);
const lines = [];
function log(...a) {
  const s = `${new Date().toISOString().slice(11, 23)} ${a.join(' ')}`;
  lines.push(s); if (lines.length > 200) lines.shift();
  $('log').textContent = lines.join('\n'); $('log').scrollTop = 1e6;
  console.log('[play]', ...a);
}
const errors = [];
window.addEventListener('error', (e) => { errors.push(e.message); log('PAGEERR', e.message); });
window.addEventListener('unhandledrejection', (e) => { errors.push(String(e.reason)); log('UNHANDLED', String(e.reason && e.reason.message || e.reason)); });

const ENV = await (await fetch('/env.json')).json();
const WORKER = ENV.WORKER;
const clock = makeClock();
const nowUs = clock.nowUs;

const ac = new AudioContext({ sampleRate: 48000 });
await ac.audioWorklet.addModule('/jam/onset-worklet.js');
const acMap = makeAcMap(ac, nowUs);

// ---------------- state -------------------------------------------------------
const S = {
  catalog: [], selected: null, sig: null, pc: null, ch: null,
  session: null, setupMs: null, seq: 0,
  sent: 0, acks: 0, onsets: 0, replayFired: 0,
  ow: [], ear: [], audioSpan: null,
  matcher: makeMatcher({ minLatUs: 2000, maxLatUs: 2_000_000, adaptive: true }),
  held: new Map(),
};

// ---------------- the timeline log --------------------------------------------
const LOG = [];
function record(at, kind, source, raw, disp, extra) {
  LOG.push({ at: Math.round(at), kind, source, ...(raw ? { raw } : {}), display: disp, ...(extra || {}) });
}

// ---------------- catalog -----------------------------------------------------
async function refresh() {
  const r = await fetch(WORKER + '/instruments', { cache: 'no-store' });
  S.catalog = (await r.json()).instruments || [];
  const el = $('list');
  if (!S.catalog.length) { el.innerHTML = '<span class="dim">no instruments registered yet</span>'; return; }
  el.innerHTML = S.catalog.map((i) => `
    <div class="card ${S.selected === i.id ? 'sel' : ''}" data-id="${i.id}">
      <div class="nm">${i.name}
        <span class="pill ${i.online ? (i.busy ? 'busy' : 'on') : 'off'}">${i.online ? (i.busy ? 'busy · ' + (i.player || '') : 'online') : 'offline'}</span>
      </div>
      <div class="meta">${i.model || '—'} · ${i.location || '—'}</div>
      <div class="meta">${(i.caps || []).join(' · ')}</div>
    </div>`).join('');
  for (const c of el.querySelectorAll('.card')) c.onclick = () => select(c.dataset.id);
  if (S.selected) {
    const cur = S.catalog.find((i) => i.id === S.selected);
    $('b-req').disabled = !cur || !cur.online || !!S.session;
  }
  return S.catalog;
}
function select(id) {
  S.selected = id;
  const i = S.catalog.find((x) => x.id === id);
  $('reqstate').textContent = i ? `${i.name} — ${i.online ? (i.busy ? 'busy right now' : 'online, free') : 'offline'}` : '';
  $('b-req').disabled = !i || !i.online || !!S.session;
  refresh();
}
setInterval(() => { if (!S.session) refresh().catch(() => {}); }, 3000);

// ---------------- returned media ----------------------------------------------
const vid = $('vid');
const remoteStream = new MediaStream();
let remoteTap = null;
function onTrack(track) {
  remoteStream.addTrack(track);
  vid.srcObject = remoteStream;
  vid.play().catch((e) => log('vid.play', e.message));
  if (track.kind === 'audio') {
    // the element plays it out loud; the WebAudio tap measures it
    const src = ac.createMediaStreamSource(new MediaStream([track]));
    remoteTap = makeOnsetTap(ac, acMap, (us) => {
      S.onsets++;
      const m = S.matcher.onset(us);
      if (m) {
        const ms = m.latUs / 1000;
        S.ear.push(ms); if (S.ear.length > 400) S.ear.shift();
      }
    });
    src.connect(remoteTap);
    if (!S.audioSpan) {
      // the span goes into the log the moment audio starts flowing and is
      // closed in place when the session ends — an open span is a live
      // recording, not a missing one
      S.audioSpan = { at: Math.round(nowUs()), kind: 'audio-span', source: 'instrument', endAt: null, display: 'instrument audio return (open)', instrument: S.selected, direction: 'instrument→player', codec: 'opus/48k (WebRTC)', transport: 'webrtc' };
      LOG.push(S.audioSpan);
      log('audio return attached');
    }
  }
  log('remote track', track.kind);
}

// ---------------- send path (keys, MIDI, AND replay all go through here) -------
function sendRaw(status, note, vel, { replay = false, atUs = null } = {}) {
  if (isRealtime(status)) return;                      // never forward MIDI clock
  const tUs = atUs === null ? nowUs() : atUs;
  const seq = S.seq++;
  if (S.ch && S.ch.readyState === 'open') {
    S.ch.send(buildBin(seq, status, note, vel, SRC_PLAYER, tUs));
    S.sent++;
  }
  const isOn = (status & 0xf0) === 0x90 && vel > 0;
  if (isOn) S.matcher.sent(seq, tUs);
  const disp = display(status, note, vel);
  if (replay) {
    S.replayFired++;
    feed(`replay  ${disp}  #${seq}`, true);            // marked, and NOT re-logged
  } else {
    record(tUs, 'midi', 'player', [status, note, vel], disp, { seq });
    feed(`${disp}  #${seq}`);
  }
  if (isOn) lightKey(note, true); else lightKey(note, false);
  return seq;
}

// ---------------- input: computer keyboard + Web MIDI in ----------------------
const KEYS = 'asdfghjkl;';
const PENTA = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81];
const keysEl = $('keys');
keysEl.innerHTML = KEYS.split('').map((k, i) => `<div data-n="${PENTA[i]}">${k.toUpperCase()}<br><span class="dim">${noteName(PENTA[i])}</span></div>`).join('');
function lightKey(note, on) {
  for (const d of keysEl.children) if (+d.dataset.n === note) d.classList.toggle('lit', on);
}
const down = new Set();
window.addEventListener('keydown', (e) => {
  if (e.repeat || e.metaKey || e.ctrlKey) return;
  const i = KEYS.indexOf(e.key.toLowerCase());
  if (i < 0) return;
  const n = PENTA[i] + (e.shiftKey ? 12 : 0);
  if (down.has(e.key.toLowerCase())) return;
  down.add(e.key.toLowerCase());
  S.held.set(e.key.toLowerCase(), n);
  sendRaw(0x90, n, 100);
});
window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (!down.has(k)) return;
  down.delete(k);
  const n = S.held.get(k); S.held.delete(k);
  if (n !== undefined) sendRaw(0x80, n, 0);
});

async function initMidiIn() {
  let access;
  try { access = await navigator.requestMIDIAccess({ sysex: false }); }
  catch (e) { log('Web MIDI unavailable:', e.message, '— computer keyboard only'); return; }
  const sel = $('midiin');
  const fill = () => {
    sel.innerHTML = '<option value="">— computer keyboard (A S D F G H J K L ;) —</option>';
    for (const [id, inp] of access.inputs) {
      const o = document.createElement('option');
      o.value = id; o.textContent = `${inp.name}${inp.manufacturer ? ' · ' + inp.manufacturer : ''}`;
      sel.appendChild(o);
    }
  };
  fill();
  access.onstatechange = fill;
  let bound = null;
  sel.onchange = () => {
    if (bound) bound.onmidimessage = null;
    bound = sel.value ? access.inputs.get(sel.value) : null;
    if (bound) bound.onmidimessage = (e) => { const d = e.data; if (d.length >= 3) sendRaw(d[0], d[1], d[2]); };
    log('midi in →', bound ? bound.name : 'computer keyboard');
  };
  log('Web MIDI ok:', access.inputs.size, 'inputs');
}

// ---------------- session ------------------------------------------------------
async function buildPeer() {
  const t0 = performance.now();
  const pc = new RTCPeerConnection({ iceServers: ICE });
  S.pc = pc;
  pc.onconnectionstatechange = () => {
    $('h-conn').textContent = pc.connectionState;
    $('h-conn').className = pc.connectionState === 'connected' ? 'ok' : pc.connectionState === 'failed' ? 'bad' : 'dim';
  };
  pc.onicecandidate = (e) => { if (e.candidate) S.sig.send({ type: 'signal', kind: 'ice', payload: e.candidate.toJSON() }); };
  pc.ontrack = (e) => onTrack(e.track);
  const ch = pc.createDataChannel('midi', { ordered: false, maxRetransmits: 0 });
  ch.binaryType = 'arraybuffer';
  ch.onmessage = (e) => {
    if (typeof e.data !== 'string') return;
    const m = JSON.parse(e.data);                      // host telemetry ack
    if (m.ack !== undefined) {
      S.acks++;
      const ow = (m.recvUs - m.tUs) / 1000;
      S.ow.push(ow); if (S.ow.length > 400) S.ow.shift();
    }
  };
  ch.onopen = () => { S.ch = ch; log('midi channel open'); };
  pc.addTransceiver('audio', { direction: 'recvonly' });
  pc.addTransceiver('video', { direction: 'recvonly' });
  await pc.setLocalDescription(await pc.createOffer());
  S.sig.send({ type: 'signal', kind: 'offer', payload: { sdp: pc.localDescription.sdp } });
  await pcConnected(pc);
  await new Promise((res, rej) => {
    if (ch.readyState === 'open') return res();
    const t = setTimeout(() => rej(new Error('midi channel open timeout')), 15000);
    ch.addEventListener('open', () => { clearTimeout(t); res(); });
  });
  S.ch = ch;
  S.setupMs = +(performance.now() - t0).toFixed(0);
  const inst = S.catalog.find((i) => i.id === S.selected);
  $('reqstate').textContent = `playing ${inst ? inst.name : S.selected} — it is yours until you end`;
  $('reqstate').className = 'ok hint';
  $('h-setup').textContent = S.setupMs + ' ms (offer → DataChannel open)';
  $('h-setup').className = 'ok';
  log('session live in', S.setupMs, 'ms');
}

function onFrame(m) {
  if (m.type === 'hello') { log('signal hello —', m.instrument.name, m.online ? 'online' : 'OFFLINE'); return; }
  if (m.type === 'requested') { $('reqstate').textContent = 'asked the owner — waiting…'; return; }
  if (m.type === 'rejected') {
    const why = m.reason === 'busy'
      ? `busy — ${m.heldBy} has it since ${new Date(m.heldSince).toISOString().slice(11, 19)}${m.waiting ? `, ${m.waiting} also waiting` : ''}`
      : m.reason;
    $('reqstate').textContent = 'declined: ' + why;
    $('reqstate').className = 'bad hint';
    S.rejected = why;
    log('REJECTED:', why);
    if (S.sig) S.sig.close();
    S.sig = null;
    return;
  }
  if (m.type === 'session' && m.state === 'accepted') {
    S.session = { instrument: m.instrument, since: m.since };
    $('reqstate').textContent = 'accepted — connecting media…';
    $('reqstate').className = 'ok hint';
    $('b-end').disabled = false; $('b-req').disabled = true;
    record(nowUs(), 'session', 'worker', null, 'session accepted on ' + m.instrument, { instrument: m.instrument });
    buildPeer().catch((e) => log('buildPeer failed', e.message));
    return;
  }
  if (m.type === 'session' && m.state === 'ended') { endLocal(m.reason); return; }
  if (m.type === 'signal') {
    if (m.kind === 'answer') S.pc.setRemoteDescription({ type: 'answer', sdp: m.payload.sdp }).catch((e) => log('setRemote', e.message));
    else if (m.kind === 'ice' && S.pc) S.pc.addIceCandidate(m.payload).catch(() => {});
    return;
  }
  if (m.type === 'instrument') log('instrument', m.online ? 'came online' : 'went OFFLINE');
  if (m.type === 'error') log('signal error', JSON.stringify(m));
}

async function requestSession() {
  if (!S.selected) return;
  S.rejected = null;
  S.sig = connectSignal({
    base: WORKER, instrument: S.selected, role: 'player', name: MYNAME, onFrame,
    onClose: () => { if (S.session) endLocal('signal socket closed'); },
  });
  await S.sig.ready;
  S.sig.send({ type: 'request', name: MYNAME });
}

function endLocal(reason) {
  if (S.audioSpan && !S.audioSpan.endAt) {
    S.audioSpan.endAt = Math.round(nowUs());
    S.audioSpan.display = `instrument audio return (${((S.audioSpan.endAt - S.audioSpan.at) / 1e6).toFixed(1)} s)`;
  }
  record(nowUs(), 'session', 'worker', null, 'session ended: ' + reason);
  if (S.pc) { try { S.pc.close(); } catch {} S.pc = null; }
  S.ch = null; S.session = null;
  $('b-end').disabled = true;
  $('reqstate').textContent = 'session ended: ' + reason;
  $('reqstate').className = 'hint';
  log('session ended:', reason);
}

// ---------------- record / download / replay ----------------------------------
function sessionJsonl() {
  const meta = {
    kind: 'session-meta', at: LOG.length ? LOG[0].at : Math.round(nowUs()),
    instrument: S.selected, player: MYNAME, clock: clock.info(),
    setupMs: S.setupMs, oneWayMidiMs: dist(S.ow), keyToEarMs: dist(S.ear),
    notesSent: S.sent, onsets: S.onsets, worker: WORKER,
  };
  return [meta, ...LOG].map((r) => JSON.stringify(r)).join('\n') + '\n';
}
function download() {
  const blob = new Blob([sessionJsonl()], { type: 'application/x-ndjson' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `instrument-session-${S.selected || 'x'}-${Date.now()}.jsonl`;
  a.click();
  return LOG.length;
}
// Replay: same sendRaw() the keys use. Timing comes from the log's own `at`
// deltas, so a replay is the performance again, not a re-render of it.
async function replay(speed = 1) {
  const evs = LOG.filter((e) => e.kind === 'midi').sort((a, b) => a.at - b.at);
  if (!evs.length) return { fired: 0, logged: 0 };
  const before = LOG.length;
  const t0 = evs[0].at;
  const start = performance.now() + 200;
  let fired = 0;
  await new Promise((res) => {
    for (const e of evs) {
      const at = start + ((e.at - t0) / 1000) / speed;
      setTimeout(() => {
        sendRaw(e.raw[0], e.raw[1], e.raw[2], { replay: true });
        if (++fired === evs.length) res();
      }, Math.max(0, at - performance.now()));
    }
  });
  return { fired, logged: before, logAfter: LOG.length, grew: LOG.length - before };
}

// ---------------- feed / HUD ---------------------------------------------------
const feedEl = $('feed');
function feed(s, replayTag) {
  const d = document.createElement('div');
  d.textContent = s;
  if (replayTag) d.className = 'replay';
  feedEl.prepend(d);
  while (feedEl.children.length > 60) feedEl.lastChild.remove();
}
setInterval(() => {
  $('h-sent').textContent = S.sent;
  const ow = dist(S.ow), ear = dist(S.ear);
  $('h-ow').textContent = ow ? `${ow.p50} ms` : '—';
  $('h-ow').className = 'num ' + (ow ? 'ok' : 'dim');
  $('h-ear').textContent = ear ? `${ear.p50} ms` : '—';
  $('h-ear').className = 'num ' + (ear ? 'ok' : 'dim');
  $('h-ons').textContent = `${S.onsets} (acks ${S.acks})`;
  $('h-log').textContent = `${LOG.length} events${S.replayFired ? ` · replay fired ${S.replayFired}` : ''}`;
  const c = clock.info();
  $('h-clock').textContent = c.source ? `${c.source} · min-RTT ${c.minRttMs} ms` : '—';
}, 400);

$('b-refresh').onclick = () => refresh();
$('b-req').onclick = () => requestSession().catch((e) => log('request failed', e.message));
$('b-end').onclick = () => { if (S.sig) S.sig.send({ type: 'end' }); endLocal('you ended it'); };
$('b-dl').onclick = download;
$('b-replay').onclick = () => replay().then((r) => log('replay', JSON.stringify(r)));

// ---------------- driver API for the harness ----------------------------------
async function autoPlay(n = 64, gapMs = 220, holdMs = 90) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < n; i++) {
    const note = PENTA[i % PENTA.length];
    sendRaw(0x90, note, 90 + (i % 30));
    await sleep(holdMs);
    sendRaw(0x80, note, 0);
    await sleep(Math.max(0, gapMs - holdMs));
  }
  await sleep(1500);            // let the audio return tail land
  S.matcher.flush();
  return { sent: S.sent, onsets: S.onsets, acks: S.acks };
}
window.player = {
  refresh, select, requestSession, autoPlay, replay, download,
  sessionJsonl,
  end: () => { if (S.sig) S.sig.send({ type: 'end' }); endLocal('driver ended'); },
  state: () => ({
    selected: S.selected, session: !!S.session, rejected: S.rejected || null,
    pc: S.pc ? S.pc.connectionState : null, ch: S.ch ? S.ch.readyState : null,
    setupMs: S.setupMs, sent: S.sent, acks: S.acks, onsets: S.onsets,
    replayFired: S.replayFired, logged: LOG.length,
    oneWayMidiMs: dist(S.ow), keyToEarMs: dist(S.ear),
    audioSpan: S.audioSpan, clock: clock.info(), catalog: S.catalog.length, errors,
  }),
  log: () => LOG,
};

// ---------------- go -----------------------------------------------------------
await clock.calibrate(CLOCK, WORKER);
await initMidiIn();
if (ac.state === 'suspended') await ac.resume();
await refresh();
if (P.get('instrument')) select(P.get('instrument'));
$('pstate').textContent = 'ready';
log('ready as', MYNAME, '| worker', WORKER, '| clock', JSON.stringify(clock.info()));
window.playerReady = true;
