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
  makeAcMap, makeOnsetTap, makeMatcher, isRealtime, dist, makeBackstop,
} from '/instrument-core.js';
// the SHARED timeline library, served from the repo (never copied) — the same
// file timeline/lab measured and proto/jam + proto/selfrec import.
import { makeLogDeck, pstats } from '/timeline/logdeck.mjs';

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
  // per-session PLAYER capabilities this page has been handed, by session id.
  // They never leave this tab and are never shown in the UI.
  tokens: {},
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
S.store = { sid: null, token: null, appended: 0, rejected: 0, total: 0, ended: false, deleted: null, errors: 0, flushing: false };
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
// THE DURABILITY BACKSTOP. A batch that cannot be POSTed is written to
// IndexedDB and drained oldest-first when the network returns — selfrec's
// proven buffer, so a tab killed during an outage loses at most the ≤1 s that
// had not been batched yet, instead of the whole outage. Order matters: the DO
// enforces a monotonic seq per (session, source), so an overtaking batch would
// make the parked one a silent duplicate. See makeBackstop.
const PBACK = makeBackstop({
  name: 'instr-play-events', log,
  send: async (item) => {
    const r = await fetch(`${WORKER}/session/${item.sid}/events`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: item.body,
    });
    const jj = await r.json().catch(() => ({}));
    if (r.status === 410) {                        // a tombstone is a FINAL answer
      S.store.deleted = jj.deletedBy || 'someone';
      PEND.length = 0;
      log('session store: deleted by', S.store.deleted, '— nothing more will be written');
      return jj;
    }
    if (!r.ok) throw new Error(r.status + ' ' + JSON.stringify(jj).slice(0, 120));
    S.store.appended += jj.appended; S.store.rejected += jj.rejected; S.store.total = jj.total;
    return jj;
  },
});
async function flush() {
  if (!S.store.sid || S.store.flushing || S.store.deleted) return null;
  if (!PEND.length) { if (PBACK.pending()) await PBACK.drain(); return null; }
  S.store.flushing = true;
  const batch = PEND.splice(0, BATCH_MAX);
  try {
    const body = JSON.stringify({ instrument: S.selected, playerId: MYNAME, events: batch.map(wire) });
    const r = await PBACK.offer({ sid: S.store.sid, body, bytes: body.length, count: batch.length,
      label: `${batch.length} player events` });
    if (r.parked) S.store.errors++;
    if (!r.ok && !r.parked) { PEND.unshift(...batch); S.store.errors++; }   // backstop not open yet
    return r.result || null;
  } finally { S.store.flushing = false; }
}
setInterval(() => { flush().catch(() => {}); }, FLUSH_MS);

async function endStore(endAtUs) {
  if (!S.store.sid || S.store.deleted) return null;
  // drain BOTH the memory tail and anything parked in IndexedDB before
  // stamping the end — an outage that ran into the last second must not turn
  // into a truncated session.
  for (let i = 0; i < 4 && PEND.length; i++) await flush();
  if (PBACK.pending()) await PBACK.settle(20000).catch(() => null);
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
// The playerToken is what makes this MY delete rather than anyone-with-the-id's.
// It was handed to this page alone on the accept frame; a session loaded by id
// from someone else's link has no token here, and the delete is refused.
async function deleteSession(by = 'player', id = S.store.sid, token) {
  if (!id) return { error: 'no session' };
  const tok = token !== undefined ? token : (id === S.store.sid ? S.store.token : S.tokens[id]) || '';
  const r = await fetch(`${WORKER}/session/${id}/delete`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'X-Session-Token': tok },
    body: JSON.stringify({ by }),
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
    // …along with OUR half of the capability pair. The owner got a different
    // token on their own copy of this frame; neither party sees the other's.
    S.store.token = m.token || null;
    if (S.store.sid && S.store.token) S.tokens[S.store.sid] = S.store.token;
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
// ============================================================================
// REPLAY — the shared timeline library drives it (timeline/transport.mjs +
// timeline/logdeck.mjs), not a hand-rolled setTimeout fan-out.
//
// What used to be here was the graveyard arm from
// research/timeline-own-prior-art-2026-08.md §2, verbatim: `play()` armed ONE
// setTimeout per event against `performance.now() + 200`, with no cancellation
// path, no position, no pause, no seek and no rate that meant anything. It was
// measured before it was replaced (proto/instrument/NOTES.md C12): tight on a
// clean run (p50 2.2 ms) and catastrophic the moment anything moved — a restart
// from the middle left **116 orphan fires** ringing from the abandoned run, and
// the stored-audio path put the recording **1075 ms ahead** of the first note.
//
// Three adapters, one deck, one playhead:
//   `midi-actuated`  the HOST lane (instrument clock). AUDIBLE — this is the
//                    lane that drives the notes and the audio alignment.
//                    reduce = held-note fold; assertState = silence + re-assert.
//   `midi`           the PLAYER lane (player clock, intent). A SECOND VISIBLE
//                    lane; it renders, it never sounds and it never times the
//                    audio. The difference between the lanes is the
//                    measurement — see DEPLOYED.md; do not average them.
//   `media-span`     the recorded audio / A/V. Its element is the CLOCK MASTER:
//                    the library's vector is SLAVED to el.currentTime through
//                    transport.sync(), exactly as proto/selfrec/replay-grid.html
//                    does it. If the file stalls, the playhead stalls with it,
//                    so notes and audio cannot drift apart.
// ============================================================================
const TICKHOST = P.get('tickhost') || 'main';   // foreground-critical: the lab's
                                                // documented opt-in (6.4 vs 15.3 ms p95)
const SYNC_TOL_MS = 40;                         // don't churn the lookahead on frame quantization

// the notes this page believes it is currently sounding on the instrument
const VOICES = new Set();
function replaySend(raw) {
  sendRaw(raw[0], raw[1], raw[2], { replay: true });
  if ((raw[0] & 0xf0) === 0x90 && raw[2] > 0) VOICES.add(raw[1]); else VOICES.delete(raw[1]);
}
function silenceAll() {
  for (const n of [...VOICES]) sendRaw(0x80, n, 0, { replay: true });
  VOICES.clear();
}
const heldFold = (payloads) => {
  const held = new Map();
  for (const p of payloads) {
    const [status, note, vel] = p.raw;
    if ((status & 0xf0) === 0x90 && vel > 0) held.set(note, p); else held.delete(note);
  }
  return held;
};

const RS = window.__replay = {          // replay-transport state, for the HUD + harness
  deck: null, kinds: [], fires: { 'midi-actuated': 0, midi: 0, 'media-span': 0 },
  intentHeld: [], master: null, syncCorrections: [], firstNoteMediaMs: null,
  audioOffsetS: null, spanPos0: null, hostName: null, from: null,
};

// ---- lane 1: the HOST lane. The only audible one. ---------------------------
const actuatedAdapter = {
  caps: {
    kind: 'midi-actuated', domain: 'wall', unit: 'ms', lane: 'host (instrument clock)',
    seekable: true, reducible: true, audible: true, rates: [0.25, 0.5, 1, 2, 4],
    catchUp: 'burst',            // musical: a note is never silently dropped
  },
  actuate(p) {
    RS.fires['midi-actuated']++;
    if (RS.firstNoteMediaMs === null && RS.master && RS.master.el)
      RS.firstNoteMediaMs = Math.round(RS.master.el.currentTime * 1000);
    replaySend(p.raw);
  },
  reduce: heldFold,
  assertState(held) { silenceAll(); for (const p of held.values()) replaySend(p.raw); },
};

// ---- lane 2: the PLAYER lane. Rendered, never sounded. ----------------------
const intentAdapter = {
  caps: {
    kind: 'midi', domain: 'wall', unit: 'ms', lane: 'player (intent)',
    seekable: true, reducible: true, audible: false, rates: [0.25, 0.5, 1, 2, 4],
    catchUp: 'reduce',           // cosmetic: a missed window is re-folded, not machine-gunned
  },
  actuate(p) {
    RS.fires.midi++;
    const [status, note, vel] = p.raw;
    const s = new Set(RS.intentHeld);
    if ((status & 0xf0) === 0x90 && vel > 0) s.add(note); else s.delete(note);
    paintIntent(s);
  },
  reduce(payloads) { return new Set(heldFold(payloads).keys()); },
  assertState(set) { paintIntent(set); },
};
function paintIntent(heldish) {
  const keys = heldish instanceof Set ? [...heldish] : [...heldish.keys()];
  RS.intentHeld = keys.slice().sort((a, b) => a - b);
  const el = $('lane-intent');
  if (el) for (const d of el.children) d.classList.toggle('lit', keys.includes(+d.dataset.n));
}

// ---- lane 3: the recorded media. CLOCK MASTER via transport.sync(). ---------
function assertSpan(sp, pos, present) {
  const u = pos - sp.pos0;
  const absent = !present || u < 0 || (sp.durMs && u > sp.durMs);
  if (absent) { if (!sp.el.paused) sp.el.pause(); return; }
  const want = u / 1000;
  if (Math.abs(sp.el.currentTime - want) > 0.05) { try { sp.el.currentTime = want; } catch {} }
  sp.el.playbackRate = Math.max(0.0625, Math.min(16, RS.deck ? RS.deck.targetRate() : 1));
  if (RS.deck && RS.deck.playing()) sp.el.play().catch(() => {}); else sp.el.pause();
}
const spanAdapter = {
  caps: {
    kind: 'media-span', domain: 'wall', unit: 'ms',
    seekable: true, reducible: true, clockMaster: true,
    // an HTMLMediaElement is not a sample-accurate slave: seeks land on a frame
    seekAccuracyMs: 40, rates: [0.25, 0.5, 1, 2, 4], syncToleranceMs: SYNC_TOL_MS,
    catchUp: 'reduce',           // a missed span boundary is re-asserted, never burst
  },
  actuate(p) {
    RS.fires['media-span']++;
    const sp = RS.spans[p.lane];
    if (sp) assertSpan(sp, RS.deck ? RS.deck.position() : p.at, p.phase === 'enter');
  },
  reduce(payloads, pos) {
    const present = new Set();
    for (const p of payloads) { if (p.phase === 'enter') present.add(p.lane); else present.delete(p.lane); }
    for (const lane of [...present]) {
      const sp = RS.spans[lane], u = sp ? pos - sp.pos0 : -1;
      if (!sp || u < 0 || (sp.durMs && u > sp.durMs)) present.delete(lane);
    }
    return present;
  },
  assertState(present, info) {
    for (const [lane, sp] of Object.entries(RS.spans || {})) assertSpan(sp, info.pos, present.has(lane));
  },
};

// The master drives the library, never the other way round. A rAF loop is the
// right place for this: it is a servo + paint, not an event engine.
let masterAdvance = { t: null, wall: 0 };
function driveFromMaster() {
  const m = RS.master;
  if (!RS.deck || !RS.deck.playing() || !m || !m.el || m.el.paused) return;
  const mediaT = m.pos0 + m.el.currentTime * 1000;
  const now = performance.now();
  if (masterAdvance.t !== null && mediaT === masterAdvance.t && now - masterAdvance.wall > 1000) return; // stalled: free-run
  if (masterAdvance.t === null || mediaT !== masterAdvance.t) masterAdvance = { t: mediaT, wall: now };
  const corr = RS.deck.sync(mediaT, { toleranceMs: SYNC_TOL_MS });
  if (corr) { RS.syncCorrections.push(+corr.toFixed(1)); if (RS.syncCorrections.length > 400) RS.syncCorrections.shift(); }
}

// ---- building the deck ------------------------------------------------------
function disposeDeck() {
  if (RS.deck) { RS.deck.pause(); silenceAll(); RS.deck.dispose(); }
  RS.deck = null; RS.spans = {}; RS.master = null; RS.intentPayloads = null;
  RS.fires = { 'midi-actuated': 0, midi: 0, 'media-span': 0 };
  RS.firstNoteMediaMs = null; RS.syncCorrections = []; masterAdvance = { t: null, wall: 0 };
}

/** Build the one deck. `hostRows` are audible; `intentRows` render only;
 *  `media` (optional) is {lane, el, atUs, durMs} — the clock master. */
function buildDeck({ hostRows, intentRows = [], media = null, from }) {
  disposeDeck();
  const lanes = [{ kind: 'midi-actuated', rows: hostRows, adapter: actuatedAdapter }];
  if (intentRows.length) lanes.push({ kind: 'midi', rows: intentRows, adapter: intentAdapter });
  if (media) {
    RS.spans[media.lane] = { lane: media.lane, el: media.el, durMs: media.durMs, pos0: 0, atUs: media.atUs };
    lanes.push({
      kind: 'media-span', rows: [{ at: media.atUs, lane: media.lane }], adapter: spanAdapter,
      // one row, TWO items: a span is an interval, not an instant
      expand: (row) => [
        { atUs: row.at, id: `span-${row.lane}-in`, payload: { lane: row.lane, phase: 'enter' } },
        { atUs: row.at + (media.durMs || 0) * 1000, id: `span-${row.lane}-out`,
          payload: { lane: row.lane, phase: 'exit' } },
      ],
    });
  }
  const deck = makeLogDeck({
    lanes, leadInMs: 250, tailMs: 500, tickHost: TICKHOST,
    onPosition: (pos) => { RS.pos = pos; },
  });
  RS.deck = deck;
  RS.from = from;
  RS.hostName = deck.hostName;
  RS.kinds = Object.keys(deck.caps());
  if (media) {
    const sp = RS.spans[media.lane];
    sp.pos0 = deck.toPos(media.atUs);
    RS.spanPos0 = sp.pos0;
    RS.master = sp;
    RS.audioOffsetS = hostRows.length ? +((hostRows[0].at - media.atUs) / 1e6).toFixed(3) : null;
  } else { RS.master = null; RS.spanPos0 = null; RS.audioOffsetS = null; }
  // play / pause / rate are NOT seeks, so the library does not re-assert on
  // them (correctly — nothing should re-fire). The media element still has to
  // follow the transport, so it is followed here, once, per state change.
  deck.transport.onState((st) => {
    if (st.reason !== 'play' && st.reason !== 'pause' && st.reason !== 'rate') return;
    const r = Math.max(0.0625, Math.min(16, deck.targetRate()));
    for (const sp of Object.values(RS.spans)) {
      sp.el.playbackRate = r;
      const u = deck.position() - sp.pos0;
      if (deck.playing() && u >= 0 && (!sp.durMs || u <= sp.durMs)) sp.el.play().catch(() => {});
      else sp.el.pause();
    }
  });
  deck.seek(deck.range[0]);
  paintTransport();
  return deck;
}

/** Play the armed deck from the top and resolve when the audible lane is done.
 *  Same return shape the harness has always seen. */
async function runDeck(deck, speed, from, expectFires) {
  const before = LOG.length;
  deck.seek(deck.range[0]);
  deck.play(speed);
  await new Promise((res) => {
    const iv = setInterval(() => {
      if (!RS.deck || RS.deck !== deck) { clearInterval(iv); return res(); }
      if (!deck.playing()) return;                                  // paused by a human
      if (RS.fires['midi-actuated'] >= expectFires || deck.position() >= deck.range[1]) { clearInterval(iv); res(); }
    }, 20);
  });
  deck.pause();
  silenceAll();
  if (RS.master) RS.master.el.pause();
  return { from, fired: RS.fires['midi-actuated'], logged: before,
    logAfter: LOG.length, grew: LOG.length - before };
}

// Replay: same sendRaw() the keys use. ONE actuate path, fed from two sources —
// the in-memory log, or rows read back out of the session store.
async function replayEvents(evs, speed = 1, from = 'memory') {
  evs = evs.filter((e) => (e.kind === 'midi' || e.kind === 'midi-actuated')
    && Array.isArray(e.raw) && e.raw.length >= 3).sort((a, b) => a.at - b.at);
  if (!evs.length) return { from, fired: 0, logged: LOG.length, grew: 0 };
  const deck = buildDeck({ hostRows: evs, from });
  return runDeck(deck, speed, from, evs.length);
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
  if ($('b-arm-stored')) $('b-arm-stored').disabled = !lane.events.length;
  if ($('b-del-stored')) $('b-del-stored').disabled = false;
  S.loadedAudio = null;
  // PREFER THE A/V SPAN. If the owner consented to video, the `av` lane holds
  // one webm with both the instrument's sound and the panel the player was
  // watching — that is the fuller record, so it wins. Audio-only is the
  // fallback, not the default.
  if (jj.session.avPrefix) await loadMedia(id, 'av').catch((e) => log('loadMedia av failed', e.message));
  if (!S.loadedAudio && jj.session.audioPrefix) await loadMedia(id, 'audio').catch((e) => log('loadMedia audio failed', e.message));
  return { id, count: jj.count, master: lane.master, laneNotes: lane.events.length,
    playerNotes: jj.events.filter((e) => e.kind === 'midi').length, session: jj.session, audio: S.loadedAudio };
}

// The chunk sequence is ONE logical webm byte stream (only chunk 0 carries the
// header) — exactly selfrec's shape — so a plain Blob concat in chunk order is
// the whole "concatenation" step. No MSE needed, for the opus-only webm OR for
// the muxed vp8/h264+opus one: the same concat feeds a <video> element.
async function loadMedia(id, lane = 'audio') {
  const list = await (await fetch(`${WORKER}/session/${id}/${lane}`, { cache: 'no-store' })).json();
  const chunks = (list.objects || []).filter((o) => /chunk-\d+\.webm$/.test(o.key))
    .sort((a, b) => a.key.localeCompare(b.key));
  if (!chunks.length) return null;
  const parts = [];
  for (const o of chunks) {
    const seq = +o.key.match(/chunk-(\d+)\.webm$/)[1];
    parts.push(await (await fetch(`${WORKER}/session/${id}/${lane}/${seq}`)).blob());
  }
  const type = lane === 'av' ? 'video/webm' : 'audio/webm';
  const blob = new Blob(parts, { type });
  const el = mediaEl(lane);
  const url = URL.createObjectURL(blob);
  S.loadedAudio = { lane, chunks: chunks.length, bytes: blob.size, url, readyState: 0,
    duration: null, videoWidth: 0, videoHeight: 0 };
  if (el) {
    // only one element visible at a time — whichever lane won
    $('sessaudio').style.display = lane === 'audio' ? '' : 'none';
    $('sessvideo').style.display = lane === 'av' ? '' : 'none';
    el.src = url;
    await new Promise((res) => {
      const done = () => res();
      el.addEventListener('loadedmetadata', done, { once: true });
      el.addEventListener('error', done, { once: true });
      setTimeout(done, 5000);
    });
    S.loadedAudio.readyState = el.readyState;
    // MediaRecorder webm carries no duration in its header: a live-recorded
    // stream reads back as Infinity until it has been played through. That is
    // the format, not a broken file — readyState >= 1 is the real proof.
    S.loadedAudio.duration = Number.isFinite(el.duration) ? +el.duration.toFixed(2) : String(el.duration);
    if (lane === 'av') { S.loadedAudio.videoWidth = el.videoWidth; S.loadedAudio.videoHeight = el.videoHeight; }
  }
  log(lane, 'media loaded:', S.loadedAudio.chunks, 'chunks,', S.loadedAudio.bytes, 'bytes, readyState',
    S.loadedAudio.readyState, lane === 'av' ? `${S.loadedAudio.videoWidth}x${S.loadedAudio.videoHeight}` : '');
  return S.loadedAudio;
}
const mediaEl = (lane) => $(lane === 'av' ? 'sessvideo' : 'sessaudio');

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
/** Arm ONE deck over the stored session: host lane (audible) + player-intent
 *  lane (visible) + the recorded media span (clock master). Idempotent per
 *  loaded session; the transport controls drive this same deck. */
function armStored() {
  if (!S.loaded) return { error: 'nothing loaded' };
  const lane = masterLane(S.loaded.events);
  const hostRows = lane.events.slice().sort((a, b) => a.at - b.at);
  if (!hostRows.length) return { error: 'no notes in the master lane' };
  // the player's intent lane is a SECOND lane — never the same rows twice
  const intentRows = lane.master === 'host'
    ? S.loaded.events.filter((e) => e.kind === 'midi' && Array.isArray(e.raw)).sort((a, b) => a.at - b.at)
    : [];
  const mediaLane = S.loadedAudio ? S.loadedAudio.lane : null;
  const el = mediaLane ? mediaEl(mediaLane) : null;
  let media = null;
  if (el && S.loadedAudio) {
    // the media-span START marker for THIS lane is the file's t=0, in the same
    // clock as the master lane — so the offset into it is a subtraction, not a
    // guess. `payload.kind` is what tells the two lanes' spans apart.
    const spans = S.loaded.events.filter((e) => e.kind === 'media-span' && e.payload && e.payload.phase === 'start');
    const span = spans.find((e) => (e.payload.kind || 'audio') === mediaLane) || spans[0];
    const end = S.loaded.events.find((e) => e.kind === 'media-span' && e.payload && e.payload.phase === 'end'
      && (e.payload.kind || 'audio') === mediaLane);
    if (span) {
      const durMs = end && Number.isFinite(end.payload.durUs) ? Math.round(end.payload.durUs / 1000)
        : (Number.isFinite(el.duration) && el.duration > 0 ? Math.round(el.duration * 1000) : 0);
      media = { lane: mediaLane, el, atUs: span.at, durMs };
    }
  }
  const deck = buildDeck({ hostRows, intentRows, media, from: 'storage' });
  return { armed: true, master: lane.master, lane: lane.name, mediaLane,
    hostNotes: hostRows.length, intentNotes: intentRows.length,
    audioOffsetS: RS.audioOffsetS, spanPos0: RS.spanPos0,
    range: deck.range, durationMs: Math.round(deck.durationMs), tickHost: deck.hostName };
}

async function replayStored(speed = 1) {
  const a = armStored();
  if (a.error) return a;
  const deck = RS.deck;
  const r = await runDeck(deck, speed, 'storage', a.hostNotes);
  // `advanced` used to be a 700 ms sleep BEFORE the notes started, which is
  // precisely what put the audio 1075 ms ahead of them (NOTES C12). It is now
  // read off the master's own progress during the replay — no lead, no sleep.
  const advanced = RS.master ? +(RS.master.el.currentTime - (RS.audioOffsetS || 0)).toFixed(3) : null;
  return { ...r, master: a.master, lane: a.lane, audioOffsetS: a.audioOffsetS,
    mediaLane: a.mediaLane, advanced,
    intentFired: RS.fires.midi, intentNotes: a.intentNotes,
    firstNoteMediaMs: RS.firstNoteMediaMs,
    alignErrMs: RS.firstNoteMediaMs === null || a.audioOffsetS === null
      ? null : Math.round(RS.firstNoteMediaMs - a.audioOffsetS * 1000),
    syncCorrections: RS.syncCorrections.length,
    drift: pstats(deck.drift().filter((d) => d.kind === 'midi-actuated').map((d) => d.deltaMs)),
    tickHost: deck.hostName,
    videoWidth: S.loadedAudio ? S.loadedAudio.videoWidth : 0,
    videoHeight: S.loadedAudio ? S.loadedAudio.videoHeight : 0,
    audio: S.loadedAudio ? S.loadedAudio.bytes : 0 };
}

// ---------------- transport UI (play / pause / scrubber / rate) ---------------
const RATES = [0.25, 0.5, 1, 2, 4];
function paintTransport() {
  const bar = $('rt-bar'); if (!bar) return;
  const d = RS.deck;
  bar.style.display = d ? '' : 'none';
  if (!d) return;
  const pos = d.position(), r0 = d.range[0], r1 = d.range[1];
  const frac = Math.max(0, Math.min(1, (pos - r0) / Math.max(1, r1 - r0)));
  $('rt-ph').style.left = `calc(${(frac * 100).toFixed(3)}% - 1px)`;
  $('rt-play').textContent = d.playing() ? '❚❚' : '▶';
  $('rt-rate').textContent = `${d.targetRate().toFixed(2)}×`;
  $('rt-read').textContent =
    `${((pos - r0) / 1000).toFixed(1)}s / ${((r1 - r0) / 1000).toFixed(1)}s` +
    `  host ${RS.fires['midi-actuated']}  intent ${RS.fires.midi}` +
    (RS.master ? `  media ${RS.master.el.currentTime.toFixed(2)}s` : '  (no media)') +
    `  ${RS.hostName}`;
  const host = $('lane-host');
  if (host) for (const el of host.children) el.classList.toggle('lit', VOICES.has(+el.dataset.n));
}
function wireTransport() {
  const scrub = $('rt-scrub');
  if (!scrub) return;
  for (const id of ['lane-host', 'lane-intent']) {
    const el = $(id);
    if (el) el.innerHTML = [...new Set(PENTA.concat(PENTA.map((n) => n + 12)))].sort((a, b) => a - b)
      .map((n) => `<i data-n="${n}" title="${noteName(n)}"></i>`).join('');
  }
  $('rt-play').onclick = () => { if (!RS.deck) return; RS.deck.playing() ? pauseReplay() : playReplay(); };
  $('rt-stepdn').onclick = () => bumpRate(-1);
  $('rt-stepup').onclick = () => bumpRate(1);
  scrub.onclick = (e) => {
    if (!RS.deck) return;
    const r = scrub.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    RS.deck.seek(RS.deck.range[0] + f * (RS.deck.range[1] - RS.deck.range[0]));
  };
  requestAnimationFrame(function loop() { driveFromMaster(); paintTransport(); requestAnimationFrame(loop); });
}
// Pause SILENCES (a real instrument cannot be left holding a note), and play
// re-asserts what the reducer says should be held at the current position —
// both through the library's own assertState, so pause/resume across a held
// note is lossless without this page knowing anything about notes twice.
function pauseReplay() {
  if (!RS.deck) return;
  RS.deck.pause();
  silenceAll();
  if (RS.master) RS.master.el.pause();
}
function playReplay(r) {
  if (!RS.deck) return null;
  RS.deck.assertAt(RS.deck.position(), 'midi-actuated');
  RS.deck.play(r);
  return RS.deck.position();
}
function bumpRate(dir) {
  if (!RS.deck) return;
  const cur = RS.deck.targetRate();
  let i = RATES.findIndex((r) => r >= cur - 1e-6);
  i = Math.max(0, Math.min(RATES.length - 1, (i < 0 ? 2 : i) + dir));
  RS.deck.setRate(RATES[i]);                       // SEAM 2: arms, does not play
  if (RS.master) RS.master.el.playbackRate = RATES[i];
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
$('b-arm-stored').onclick = () => { const a = armStored(); log('armed', JSON.stringify(a)); if (!a.error) playReplay(); };
wireTransport();
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
// The replay TRANSPORT, exposed as the deck it is: play / pause / seek / rate
// over the same three-lane timeline the UI drives. Every number below comes out
// of timeline/transport.mjs, not out of this page.
const transport = {
  arm: () => armStored(),
  play: (r) => playReplay(r),
  pause: () => { pauseReplay(); return transport.pos(); },
  seek: (p) => (RS.deck ? RS.deck.seek(p) : null),
  /** position (ms) of a stored row's epoch-µs stamp — the log→timeline map */
  posOf: (atUs) => (RS.deck ? RS.deck.toPos(atUs) : null),
  seekFrac: (f) => (RS.deck ? RS.deck.seek(RS.deck.range[0] + f * (RS.deck.range[1] - RS.deck.range[0])) : null),
  setRate: (r) => { if (!RS.deck) return null; RS.deck.setRate(r); if (RS.master) RS.master.el.playbackRate = r; return RS.deck.targetRate(); },
  pos: () => (RS.deck ? RS.deck.position() : null),
  range: () => (RS.deck ? RS.deck.range : null),
  playing: () => (RS.deck ? RS.deck.playing() : false),
  rate: () => (RS.deck ? RS.deck.rate() : null),
  targetRate: () => (RS.deck ? RS.deck.targetRate() : null),
  /** what the instrument is ACTUALLY sounding right now */
  sounding: () => [...VOICES].sort((a, b) => a - b),
  /** C2's left-hand side: reduce(prefix <= pos) through the library's reducer */
  expectedSounding: (pos) => (RS.deck ? RS.deck.reducedKeys('midi-actuated', pos === undefined ? RS.deck.position() : pos) : null),
  intentHeld: () => RS.intentHeld.slice(),
  expectedIntent: (pos) => (RS.deck ? RS.deck.reducedKeys('midi', pos === undefined ? RS.deck.position() : pos) : null),
  /** the audio's own position vs where the playhead says it should be */
  alignment: () => {
    if (!RS.deck || !RS.master) return null;
    const pos = RS.deck.position();
    const mediaMs = RS.master.el.currentTime * 1000;
    const expected = pos - RS.master.pos0;
    return { pos: +pos.toFixed(1), mediaMs: +mediaMs.toFixed(1), expectedMediaMs: +expected.toFixed(1),
      errMs: +(mediaMs - expected).toFixed(1), spanPos0: RS.spanPos0, audioOffsetS: RS.audioOffsetS,
      mediaRate: RS.master.el.playbackRate, paused: RS.master.el.paused };
  },
  fires: () => ({ ...RS.fires }),
  drift: (kind = 'midi-actuated') => pstats(RS.deck ? RS.deck.drift().filter((d) => d.kind === kind).map((d) => d.deltaMs) : []),
  stats: () => (RS.deck ? { stats: RS.deck.stats(), audit: RS.deck.audit(), caps: RS.deck.caps(),
    host: RS.deck.hostName, syncCorrections: RS.syncCorrections.slice(-20),
    driftStats: RS.deck.sched.driftStats() } : null),
  dispose: () => disposeDeck(),
};

window.player = {
  refresh, select, requestSession, autoPlay, replay, download,
  sessionJsonl, transport,
  flush, endStore, deleteSession, loadSession, replayStored, loadMedia,
  sid: () => S.store.sid,
  token: (id) => (id ? S.tokens[id] : S.store.token) || null,
  backstop: () => PBACK.stats(),
  settle: (ms) => PBACK.settle(ms),
  end: () => { if (S.sig) S.sig.send({ type: 'end' }); endLocal('driver ended'); },
  state: () => ({
    selected: S.selected, session: !!S.session, rejected: S.rejected || null,
    pc: S.pc ? S.pc.connectionState : null, ch: S.ch ? S.ch.readyState : null,
    setupMs: S.setupMs, sent: S.sent, acks: S.acks, onsets: S.onsets,
    replayFired: S.replayFired, logged: LOG.length,
    oneWayMidiMs: dist(S.ow), keyToEarMs: dist(S.ear),
    audioSpan: S.audioSpan, clock: clock.info(), catalog: S.catalog.length, errors,
    store: { ...S.store, token: S.store.token ? 'held' : null, pending: PEND.length, backstop: PBACK.stats() },
    // what the page BELIEVES it logged, for the "zero events lost" comparison
    loggedMidi: LOG.filter((e) => e.kind === 'midi').length,
    loaded: S.loaded ? { id: S.loaded.session.id, count: S.loaded.count, session: S.loaded.session } : null,
    loadedAudio: S.loadedAudio ? { lane: S.loadedAudio.lane, chunks: S.loadedAudio.chunks, bytes: S.loadedAudio.bytes,
      readyState: S.loadedAudio.readyState, duration: S.loadedAudio.duration,
      videoWidth: S.loadedAudio.videoWidth, videoHeight: S.loadedAudio.videoHeight } : null,
  }),
  log: () => LOG,
};

// ---------------- go -----------------------------------------------------------
await clock.calibrate(CLOCK, WORKER);
await PBACK.open().catch((e) => log('event backstop unavailable:', e.message));
await initMidiIn();
if (ac.state === 'suspended') await ac.resume();
await refresh();
if (P.get('instrument')) select(P.get('instrument'));
$('pstate').textContent = 'ready';
log('ready as', MYNAME, '| worker', WORKER, '| clock', JSON.stringify(clock.info()));
window.playerReady = true;
