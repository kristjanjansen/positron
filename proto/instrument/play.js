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
//
// DURABLE now, not just downloadable: the same log is batch-APPENDED to the
// session store in the worker's EU-pinned Sessions DO (rows, not a blob —
// plan-timeline C4), flushed every ~1 s or 200 events, which is the same
// throttle-at-capture rule the HUD uses. The POST is explicit and consented —
// the worker is not tapping the DataChannel, the page is choosing to send.
// "Load session" reads those rows back and replays them through the SAME
// sendRaw() path, so storage replay and live replay are one code path too.
// Either party can delete: the player here, the owner on host.html.

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
const PEND = [];                     // not yet acknowledged by the session store
function record(at, kind, source, raw, disp, extra) {
  const e = { at: Math.round(at), kind, source, ...(raw ? { raw } : {}), display: disp, ...(extra || {}) };
  LOG.push(e);
  store(e);
  return e;
}

// ---------------- the session store (DO SQLite, by explicit POST) -------------
// Batch rule: flush on a 1 s timer OR at 200 pending events, whichever comes
// first — throttle at capture, never one request per note.
const FLUSH_MS = 1000, FLUSH_AT = 200, BATCH_MAX = 500;
S.store = { sid: null, appended: 0, rejected: 0, total: 0, ended: false, deleted: null, errors: 0, flushing: false };
function store(e) {
  if (!S.store.sid || S.store.deleted) return;
  PEND.push(e);
  if (PEND.length >= FLUSH_AT) flush().catch(() => {});
}
const wire = (e) => ({
  at: e.at, kind: e.kind, source: e.source, display: e.display || null,
  ...(e.raw ? { raw: e.raw } : {}), ...(Number.isFinite(e.seq) ? { seq: e.seq } : {}),
  ...(e.payload ? { payload: e.payload } : {}),
});
async function flush() {
  if (!S.store.sid || S.store.flushing || !PEND.length || S.store.deleted) return null;
  S.store.flushing = true;
  const batch = PEND.splice(0, BATCH_MAX);
  try {
    const r = await fetch(`${WORKER}/session/${S.store.sid}/events`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ instrument: S.selected, playerId: MYNAME, events: batch.map(wire) }),
    });
    const jj = await r.json().catch(() => ({}));
    if (r.status === 410) {                        // tombstoned while we buffered
      S.store.deleted = jj.deletedBy || 'someone';
      PEND.length = 0;
      log('session store: deleted by', S.store.deleted, '— nothing more will be written');
      return jj;
    }
    if (!r.ok) throw new Error(r.status + ' ' + JSON.stringify(jj).slice(0, 120));
    S.store.appended += jj.appended; S.store.rejected += jj.rejected; S.store.total = jj.total;
    return jj;
  } catch (e) {
    PEND.unshift(...batch);                        // keep them; the next tick retries
    S.store.errors++;
    log('session store flush failed:', e.message);
    return null;
  } finally { S.store.flushing = false; }
}
setInterval(() => { flush().catch(() => {}); }, FLUSH_MS);

async function endStore(endAtUs) {
  if (!S.store.sid || S.store.deleted) return null;
  for (let i = 0; i < 4 && PEND.length; i++) await flush();
  const r = await fetch(`${WORKER}/session/${S.store.sid}/end`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ endedAt: Math.round(endAtUs) }),
  }).catch(() => null);
  if (!r) return null;
  const jj = await r.json().catch(() => ({}));
  if (r.ok) { S.store.ended = true; S.store.total = jj.session ? jj.session.eventRows : S.store.total; }
  return jj;
}

// Delete: the player's half of the consent story. It is a TOMBSTONE — the row
// stays marked deleted, the event rows go, the audio prefix (if the owner
// recorded any) is swept, and nothing can append to it afterwards.
async function deleteSession(by = 'player', id = S.store.sid) {
  if (!id) return { error: 'no session' };
  const r = await fetch(`${WORKER}/session/${id}/delete`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ by }),
  });
  const jj = await r.json().catch(() => ({}));
  if (r.ok && id === S.store.sid) { S.store.deleted = by; PEND.length = 0; }
  log('delete session', id, '→', JSON.stringify(jj));
  paintStore();
  return jj;
}

function paintStore() {
  const el = $('h-saved');
  if (!el) return;
  const s = S.store;
  if (s.deleted) { el.textContent = `deleted by ${s.deleted}`; el.className = 'bad'; return; }
  if (!s.sid) { el.textContent = 'not saving (no session)'; el.className = 'dim'; return; }
  const tail = PEND.length ? ` · ${PEND.length} pending` : '';
  el.textContent = `${s.ended ? 'session saved' : 'saving'} · ${s.total} events${tail}${s.errors ? ` · ${s.errors} retries` : ''}`;
  el.className = s.ended ? 'ok' : '';
  const sidEl = $('h-sid');
  if (sidEl) sidEl.textContent = s.sid;
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
    // the hub minted the session id and gave it to BOTH parties on this frame:
    // our notes and the owner's (optional) audio land under the same id
    S.store.sid = m.sid || null;
    S.store.appended = 0; S.store.rejected = 0; S.store.total = 0;
    S.store.ended = false; S.store.deleted = null; S.store.errors = 0;
    if ($('b-del')) $('b-del').disabled = !S.store.sid;
    paintStore();
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
  const endUs = nowUs();
  if (S.audioSpan && !S.audioSpan.endAt) {
    S.audioSpan.endAt = Math.round(endUs);
    S.audioSpan.display = `instrument audio return (${((S.audioSpan.endAt - S.audioSpan.at) / 1e6).toFixed(1)} s)`;
    // the span is stored only now that it is CLOSED: one row, `at` = start,
    // duration in `display`, and source `player` because it records what WE
    // received — the owner's own `media-span` rows (source `instrument`) are
    // the recording's markers and are written by host.js.
    store({ ...S.audioSpan, source: 'player', seq: undefined,
      payload: { endAt: S.audioSpan.endAt, codec: S.audioSpan.codec, transport: S.audioSpan.transport, direction: S.audioSpan.direction } });
  }
  record(endUs, 'session', 'worker', null, 'session ended: ' + reason);
  endStore(endUs).then(paintStore).catch(() => {});
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
// ONE actuate path, fed from two sources: the in-memory log, or rows read back
// out of the session store. Nothing below knows which.
async function replayEvents(evs, speed = 1, from = 'memory') {
  evs = evs.filter((e) => (e.kind === 'midi' || e.kind === 'midi-actuated')
    && Array.isArray(e.raw) && e.raw.length >= 3).sort((a, b) => a.at - b.at);
  if (!evs.length) return { from, fired: 0, logged: LOG.length, grew: 0 };
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
  return { from, fired, logged: before, logAfter: LOG.length, grew: LOG.length - before };
}
const replay = (speed = 1) => replayEvents(LOG.slice(), speed, 'memory');

// ---------------- replay FROM STORAGE -----------------------------------------
// Load a session id back out of the DO and (if the owner consented to record)
// its audio out of R2, then push the notes through the very same sendRaw().
async function loadSession(id) {
  id = (id || '').trim();
  if (!id) return { error: 'no id' };
  const r = await fetch(`${WORKER}/session/${id}?limit=20000`, { cache: 'no-store' });
  const jj = await r.json().catch(() => ({}));
  const el = $('loadstate');
  if (!r.ok) {
    S.loaded = null;
    if (el) {
      el.textContent = jj.tombstone
        ? `session ${id} was deleted by the ${jj.deletedBy} at ${new Date(jj.deletedAt).toISOString().slice(0, 19)} — the notes are gone`
        : `could not load ${id}: ${r.status} ${jj.error || ''}`;
      el.className = 'bad hint';
    }
    log('loadSession', id, r.status, JSON.stringify(jj).slice(0, 160));
    return { status: r.status, ...jj };
  }
  S.loaded = jj;
  const lane = masterLane(jj.events);
  if (el) {
    el.innerHTML = `<span class="ok">${jj.session.id}</span> — ${jj.count} events · `
      + `master lane <b>${lane.name}</b> (${lane.events.length} notes), player intent ${jj.events.filter((e) => e.kind === 'midi').length} · `
      + `${jj.session.endedAt ? 'ended' : 'still open'} · audio: ${jj.session.audioPrefix ? 'yes' : 'none'}`;
    el.className = 'hint';
  }
  if ($('b-replay-stored')) $('b-replay-stored').disabled = !lane.events.length;
  if ($('b-del-stored')) $('b-del-stored').disabled = false;
  S.loadedAudio = null;
  if (jj.session.audioPrefix) await loadAudio(id).catch((e) => log('loadAudio failed', e.message));
  return { id, count: jj.count, master: lane.master, laneNotes: lane.events.length,
    playerNotes: jj.events.filter((e) => e.kind === 'midi').length, session: jj.session, audio: S.loadedAudio };
}

// The chunk sequence is ONE logical webm byte stream (only chunk 0 carries the
// header) — exactly selfrec's shape — so a plain Blob concat in chunk order is
// the whole "concatenation" step. No MSE needed for an opus-only webm.
async function loadAudio(id) {
  const list = await (await fetch(`${WORKER}/session/${id}/audio`, { cache: 'no-store' })).json();
  const chunks = (list.objects || []).filter((o) => /chunk-\d+\.webm$/.test(o.key))
    .sort((a, b) => a.key.localeCompare(b.key));
  if (!chunks.length) return null;
  const parts = [];
  for (const o of chunks) {
    const seq = +o.key.match(/chunk-(\d+)\.webm$/)[1];
    parts.push(await (await fetch(`${WORKER}/session/${id}/audio/${seq}`)).blob());
  }
  const blob = new Blob(parts, { type: 'audio/webm' });
  const el = $('sessaudio');
  const url = URL.createObjectURL(blob);
  S.loadedAudio = { chunks: chunks.length, bytes: blob.size, url, readyState: 0, duration: null };
  if (el) {
    el.src = url;
    el.style.display = '';
    await new Promise((res) => {
      const done = () => res();
      el.addEventListener('loadedmetadata', done, { once: true });
      el.addEventListener('error', done, { once: true });
      setTimeout(done, 4000);
    });
    S.loadedAudio.readyState = el.readyState;
    // MediaRecorder webm carries no duration in its header: a live-recorded
    // stream reads back as Infinity until it has been played through. That is
    // the format, not a broken file — readyState >= 1 is the real proof.
    S.loadedAudio.duration = Number.isFinite(el.duration) ? +el.duration.toFixed(2) : String(el.duration);
  }
  log('audio loaded:', S.loadedAudio.chunks, 'chunks,', S.loadedAudio.bytes, 'bytes, readyState', S.loadedAudio.readyState);
  return S.loadedAudio;
}

// THE HOST CLOCK IS MASTER when replaying from storage.
// The host's `midi-actuated` rows and the audio it recorded are stamped by the
// SAME machine, so they are aligned to sub-ms with no skew estimate involved.
// The player's own `midi` rows are their INTENT, in their own clock — a second
// lane, rendered but never used to time the audio. Do not "fix" this later by
// averaging the two: the difference between the lanes is the measurement.
function masterLane(events) {
  const host = events.filter((e) => e.kind === 'midi-actuated' && Array.isArray(e.raw));
  if (host.length) return { name: 'instrument (host clock — audio-aligned)', events: host, master: 'host' };
  return {
    name: 'player (no host lane stored — audio alignment is skew-limited)',
    events: events.filter((e) => e.kind === 'midi' && Array.isArray(e.raw)), master: 'player',
  };
}
async function replayStored(speed = 1) {
  if (!S.loaded) return { error: 'nothing loaded' };
  const lane = masterLane(S.loaded.events);
  const evs = lane.events.slice().sort((a, b) => a.at - b.at);
  const el = $('sessaudio');
  let audioOffsetS = null;
  if (el && S.loadedAudio && evs.length) {
    // the media-span START marker is the audio's t=0, in the same clock as the
    // master lane — so the offset into the file is a subtraction, not a guess
    const span = S.loaded.events.find((e) => e.kind === 'media-span' && e.payload && e.payload.phase === 'start');
    audioOffsetS = span ? Math.max(0, (evs[0].at - span.at) / 1e6) : 0;
    try { el.currentTime = audioOffsetS; await el.play(); } catch (e) { log('audio play', e.message); }
  }
  const r = await replayEvents(evs, speed, 'storage');
  return { ...r, master: lane.master, lane: lane.name, audioOffsetS, audio: S.loadedAudio ? S.loadedAudio.bytes : 0 };
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
  paintStore();
}, 400);

$('b-refresh').onclick = () => refresh();
$('b-req').onclick = () => requestSession().catch((e) => log('request failed', e.message));
$('b-end').onclick = () => { if (S.sig) S.sig.send({ type: 'end' }); endLocal('you ended it'); };
$('b-dl').onclick = download;
$('b-replay').onclick = () => replay().then((r) => log('replay', JSON.stringify(r)));
$('b-del').onclick = () => {
  if (!S.store.sid) return;
  if (!confirm(`Delete session ${S.store.sid}? The notes and any audio the owner recorded go for good.`)) return;
  deleteSession('player').catch((e) => log('delete failed', e.message));
};
$('b-load').onclick = () => loadSession($('f-sid').value).catch((e) => log('load failed', e.message));
$('b-replay-stored').onclick = () => replayStored().then((r) => log('replay from storage', JSON.stringify(r)));
$('b-del-stored').onclick = () => {
  const id = ($('f-sid').value || '').trim();
  if (!id || !confirm(`Delete session ${id}?`)) return;
  deleteSession('player', id).then(() => loadSession(id)).catch((e) => log('delete failed', e.message));
};

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
  flush, endStore, deleteSession, loadSession, replayStored,
  sid: () => S.store.sid,
  end: () => { if (S.sig) S.sig.send({ type: 'end' }); endLocal('driver ended'); },
  state: () => ({
    selected: S.selected, session: !!S.session, rejected: S.rejected || null,
    pc: S.pc ? S.pc.connectionState : null, ch: S.ch ? S.ch.readyState : null,
    setupMs: S.setupMs, sent: S.sent, acks: S.acks, onsets: S.onsets,
    replayFired: S.replayFired, logged: LOG.length,
    oneWayMidiMs: dist(S.ow), keyToEarMs: dist(S.ear),
    audioSpan: S.audioSpan, clock: clock.info(), catalog: S.catalog.length, errors,
    store: { ...S.store, pending: PEND.length },
    loaded: S.loaded ? { id: S.loaded.session.id, count: S.loaded.count, session: S.loaded.session } : null,
    loadedAudio: S.loadedAudio ? { chunks: S.loadedAudio.chunks, bytes: S.loadedAudio.bytes, readyState: S.loadedAudio.readyState, duration: S.loadedAudio.duration } : null,
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
