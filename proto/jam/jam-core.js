// proto/jam/jam-core.js — shared engine for jam.html (live duet) and
// jam-interval.html (NINJAM-strategy beat-quantized duet).
//
// Rules carried from the timeline lineage (research/timeline-own-prior-art):
//  - stamp at the source, epoch-µs from the monotonic-anchored clock (§1.8);
//    the relay/peer never re-stamps (§2)
//  - payload = actuatable form (raw MIDI bytes) + display form; on the 16-B
//    wire frame display is derived deterministically from raw at the receiver,
//    the LOG carries both (§3 payload rule)
//  - dedupe(keyFn, windowMs) with bounded GC (§2, built twice before)
//  - LOCAL MONITOR immediate: your own notes never wait for the network;
//    the network copy is for the peer (and the log's remote half)
//  - the jam IS a timeline recording: flat event log {at, kind:'midi', source,
//    raw, display}; replay re-feeds the SAME actuate path (overdub semantics
//    §1.11: replay-fired events are marked and never re-enter the log)
//  - REPLAY IS THE LIBRARY'S: timeline/transport.mjs drives it (vector +
//    lookahead lane + drift channel), via jam-timeline.js. The live path is
//    untouched — it still runs on the 25 ms/120 ms audio-lookahead loop below.

import { makeDeck, pstats } from '/jam-timeline.js';

export function makeJam(opts) {
  const { mode, transportName, role, session, tempoBpm = 100, tickHost = 'worker' } = opts;
  const other = role === 'a' ? 'b' : 'a';
  const SRC = { a: 1, b: 2 };

  // ---------- clock (same-host truth: local server min-RTT) ----------
  const epochUsRaw = () => (performance.timeOrigin + performance.now()) * 1000;
  let offLocalUs = 0;
  const nowUs = () => epochUsRaw() + offLocalUs;
  async function calibrate() {
    let best = { rtt: Infinity, off: 0 };
    for (let i = 0; i < 25; i++) {
      const a = epochUsRaw();
      const j = await (await fetch('/time-local', { cache: 'no-store' })).json();
      const b = epochUsRaw();
      if (b - a < best.rtt) best = { rtt: b - a, off: j.us + (b - a) / 2 - b };
    }
    offLocalUs = best.off;
  }

  // ---------- synth (WebAudio, immediate local monitor) ----------
  // Voices are TRACKED (note -> live nodes + envelope end) so that seek can do
  // the honest thing: silence everything, then re-assert what should be
  // sounding. Without a voice registry there is no held-note state to reduce to.
  const ac = new AudioContext();
  const VOICE_MS = 400;                    // this instrument's one-shot envelope
  const voices = new Map();                // note -> {osc, gain, untilMs}
  function playNote(note, vel, whenAcTime = 0, detuneCents = 0) {
    const t = whenAcTime || ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 440 * Math.pow(2, (note - 69) / 12);
    osc.detune.value = detuneCents;
    const g = 0.12 * (vel / 127);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(g, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain).connect(ac.destination);
    osc.start(t); osc.stop(t + 0.4);
    const v = { osc, gain, untilMs: performance.now() + (t - ac.currentTime) * 1000 + VOICE_MS };
    voices.set(note, v);                   // retrigger: newest voice owns the slot
    osc.onended = () => { if (voices.get(note) === v) voices.delete(note); };
  }
  /** kill every live voice now (seek / panic). */
  function silenceAll() {
    for (const v of voices.values()) {
      try { v.gain.gain.cancelScheduledValues(ac.currentTime); v.gain.gain.setValueAtTime(0, ac.currentTime); v.osc.stop(ac.currentTime); } catch {}
    }
    voices.clear();
  }
  /** the actually-sounding note set — the observable side of the reducer. */
  function soundingNotes() {
    const now = performance.now();
    for (const [n, v] of voices) if (v.untilMs <= now) voices.delete(n);
    return [...voices.keys()].sort((a, b) => a - b);
  }

  // ---------- payload (same 16-B frame as the bench) ----------
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

  // ---------- dedupe(keyFn, windowMs) — the lineage primitive ----------
  function makeDedupe(windowMs) {
    const seen = new Map(); // key -> tMs
    return (key) => {
      const t = performance.now();
      if (seen.has(key) && t - seen.get(key) < windowMs) return true;
      seen.set(key, t);
      if (seen.size > 4096) for (const [k, v] of seen) { if (t - v > windowMs) seen.delete(k); }
      return false;
    };
  }
  const isDup = makeDedupe(30000);

  // ---------- the event log (the jam IS a timeline recording) ----------
  const log = []; // {at(µs), kind:'midi', source, raw:[s,n,v], display, owMs?}
  function record(at, source, raw, display, owMs) {
    log.push({ at: Math.round(at), kind: 'midi', source, raw, display, ...(owMs !== undefined ? { owMs: +owMs.toFixed(2) } : {}) });
  }

  // ---------- HUD ----------
  const owWindow = []; // rolling one-way ms for remote notes
  const stats = { sentLocal: 0, recvRemote: 0, dupDropped: 0, replayFired: 0, waitMsLast: 0, drift: null };
  const hudEl = document.getElementById('hud');
  const flashEl = document.getElementById('flash');
  function rollP50() {
    if (!owWindow.length) return null;
    const s = [...owWindow].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  }
  function drawHud(extra = '') {
    const p50 = rollP50();
    hudEl.textContent = [
      `peer ${role.toUpperCase()}  transport=${transportName}  mode=${mode}${mode === 'interval' ? ` tempo=${tempoBpm}bpm beat=${beatMs()}ms` : ''}`,
      `local notes sent   ${stats.sentLocal}`,
      `remote notes recv  ${stats.recvRemote}  (dups dropped ${stats.dupDropped})`,
      `remote one-way p50 ${p50 === null ? '—' : p50.toFixed(1) + ' ms'}  (rolling ${owWindow.length})`,
      mode === 'interval' ? `last quantize wait ${stats.waitMsLast.toFixed(0)} ms` : '',
      `log ${log.length} events   replay fired ${stats.replayFired}`,
      // transport deck: the timeline library's own numbers — position from the
      // {p0,t0,rate} vector, error from the drift channel (NOT the live owMs)
      // targetRate (not rate) so a PAUSED deck reads 0.50×, not 0.00× — the
      // library's seam-2 fix; rate() is still 0 while paused, as it must be.
      deck ? `TRANSPORT  ${deck.playing() ? 'PLAY' : 'PAUSE'} ${deck.targetRate().toFixed(2)}×  pos ${(deck.position() / 1000).toFixed(2)} / ${(deck.durationMs / 1000).toFixed(2)} s  host=${deck.hostName}` : '',
      deck && stats.drift ? `drift (library channel)  p50 ${stats.drift.p50} ms  p95 ${stats.drift.p95} ms  max ${stats.drift.max} ms  n ${stats.drift.n}` : '',
      deck ? `sounding ${soundingNotes().join(' ') || '—'}` : '',
      extra,
    ].filter(Boolean).join('\n');
  }
  function flash(text, remote) {
    const d = document.createElement('div');
    d.textContent = text;
    d.className = remote ? 'note remote' : 'note local';
    flashEl.prepend(d);
    while (flashEl.children.length > 24) flashEl.lastChild.remove();
  }

  // ---------- beat grid (interval mode): epoch-anchored, so both peers share
  // phase with zero negotiation — the beat boundary is a property of the wall
  // clock, not of either peer ----------
  const beatMs = () => 60000 / tempoBpm;
  function nextBeatUs(afterUs) {
    const b = beatMs() * 1000;
    return Math.ceil(afterUs / b) * b;
  }

  // ---------- lookahead scheduler (tracker's tight-lane loop: a 25 ms timer
  // schedules everything inside a 120 ms horizon at sample accuracy) ----------
  const pending = []; // {fireUs, fn}
  setInterval(() => {
    const horizon = nowUs() + 120000;
    for (let i = pending.length - 1; i >= 0; i--) {
      if (pending[i].fireUs <= horizon) {
        const { fireUs, fn } = pending.splice(i, 1)[0];
        const inS = Math.max(0, (fireUs - nowUs()) / 1e6);
        fn(ac.currentTime + inS);
      }
    }
  }, 25);
  function scheduleAt(fireUs, fn) { pending.push({ fireUs, fn }); }

  // ---------- actuate: ONE render path for live-local, live-remote, replay ----
  function actuate(raw, source, whenAcTime = 0, meta = {}) {
    playNote(raw[1], raw[2], whenAcTime, source === role ? 0 : 6);
    flash(`${meta.tag || (source === role ? 'you' : 'peer')}  ${disp(raw[1])}  ${meta.note || ''}`, source !== role);
    drawHud();
  }

  // ---------- transports ----------
  let seq = 0;
  let sendRaw = null; // (ArrayBuffer) => void
  async function post(box, msg) { await fetch('/msg/' + box, { method: 'POST', body: JSON.stringify(msg) }); }
  function reader(box) {
    let cursor = 0;
    return async (waitMs = 20000) => {
      const r = await fetch(`/msg/${box}?after=${cursor}&wait=${waitMs}`, { cache: 'no-store' });
      const j = await r.json();
      cursor = j.next; return j.msgs;
    };
  }
  async function waitFor(read, pred, timeoutMs = 20000) {
    const t0 = performance.now();
    while (performance.now() - t0 < timeoutMs) {
      for (const m of await read(5000)) if (pred(m)) return m;
    }
    throw new Error('signal timeout');
  }

  function onWire(buf) {
    const f = parseBin(buf);
    if (f.src === SRC[role]) return;            // own echo (DO loopback) — monitor already played
    if (isDup(f.src + ':' + f.seq)) { stats.dupDropped++; return; }
    const recvUs = nowUs();
    const owMs = (recvUs - f.tUs) / 1000;
    owWindow.push(owMs);
    if (owWindow.length > 50) owWindow.shift();
    stats.recvRemote++;
    const raw = [f.status, f.note, f.vel];
    if (mode === 'interval') {
      const fireUs = nextBeatUs(recvUs);
      stats.waitMsLast = (fireUs - recvUs) / 1000;
      scheduleAt(fireUs, (acT) => actuate(raw, other, acT, { note: `ow ${owMs.toFixed(1)}ms +q${stats.waitMsLast.toFixed(0)}ms` }));
      record(fireUs, other, raw, disp(f.note) + ' on', owMs); // logged at its MUSICAL time
    } else {
      actuate(raw, other, 0, { note: `ow ${owMs.toFixed(1)}ms` });
      record(recvUs, other, raw, disp(f.note) + ' on', owMs);
    }
  }

  const transports = {
    async dc() {
      const pc = new RTCPeerConnection({ iceServers: [] });
      const sig = `demo-sig-${session}-${mode}`;
      let ch;
      const ready = new Promise((res, rej) => {
        const t = setTimeout(() => rej(new Error('dc timeout')), 10000);
        const arm = (c) => {
          c.binaryType = 'arraybuffer';
          c.onmessage = (e) => onWire(e.data);
          c.onopen = () => { clearTimeout(t); res(c) };
          if (c.readyState === 'open') { clearTimeout(t); res(c); }
        };
        if (role === 'a') arm(ch = pc.createDataChannel('duet', { ordered: false, maxRetransmits: 0 }));
        else pc.ondatachannel = (e) => arm(ch = e.channel);
      });
      if (role === 'a') {
        await pc.setLocalDescription(await pc.createOffer());
        await new Promise((r) => { if (pc.iceGatheringState === 'complete') r(); pc.onicegatheringstatechange = () => pc.iceGatheringState === 'complete' && r(); });
        await post(sig, { kind: 'offer', sdp: pc.localDescription.sdp });
        const ans = await waitFor(reader(sig), (m) => m.kind === 'answer');
        await pc.setRemoteDescription({ type: 'answer', sdp: ans.sdp });
      } else {
        const off = await waitFor(reader(sig), (m) => m.kind === 'offer');
        await pc.setRemoteDescription({ type: 'offer', sdp: off.sdp });
        await pc.setLocalDescription(await pc.createAnswer());
        await new Promise((r) => { if (pc.iceGatheringState === 'complete') r(); pc.onicegatheringstatechange = () => pc.iceGatheringState === 'complete' && r(); });
        await post(sig, { kind: 'answer', sdp: pc.localDescription.sdp });
      }
      const c = await ready;
      return { send: (buf) => c.readyState === 'open' && c.send(buf), label: 'dc-direct (unordered, maxRetransmits:0)' };
    },
    async do() {
      const env = await (await fetch('/env.json')).json();
      // elektron-jam was retired 2026-09-04; positron-ws does the same job
      // tokenless (ws.positron.studio). The 34.5 ms p50 recorded in
      // plan-looper.md was measured against elektron-jam and keeps that name.
      const ws = new WebSocket(`wss://ws.positron.studio/room/duet-${session}-${mode}/ws`);
      ws.binaryType = 'arraybuffer';
      await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('do ws failed')); });
      ws.onmessage = (e) => { if (e.data instanceof ArrayBuffer) onWire(e.data); };
      return { send: (buf) => ws.readyState === 1 && ws.send(buf), label: 'DO relay (positron-ws, binary)' };
    },
    async moq() {
      if (!window.MoqJam) throw new Error('MoqJam bundle missing');
      const relay = 'https://draft-14.cloudflare.mediaoverquic.com';
      const pub = await window.MoqJam.publisher(relay, `duet-${session}-${mode}-${role}`);
      const sub = await window.MoqJam.subscriber(relay, `duet-${session}-${mode}-${other}`);
      sub.onMessage((p) => onWire(p.buffer.slice(p.byteOffset, p.byteOffset + p.byteLength)));
      return { send: (buf) => pub.send(buf), label: 'MoQ d14 (one group per note)' };
    },
  };

  // ---------- local note entry (keyboard or auto driver) ----------
  function noteOn(note, vel = 96) {
    if (ac.state === 'suspended') ac.resume();
    const tUs = nowUs();
    actuate([0x90, note, vel], role, 0, {});          // LOCAL MONITOR — immediate
    record(tUs, role, [0x90, note, vel], disp(note) + ' on');
    stats.sentLocal++;
    if (sendRaw) sendRaw(buildBin(seq, note, vel, SRC[role], tUs));
    seq++;
    drawHud();
  }

  // keyboard: home row = pentatonic (the "row = pentatonic" rule)
  const KEYS = 'asdfghjkl;';
  const PENTA = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81];
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const i = KEYS.indexOf(e.key);
    if (i >= 0) noteOn(PENTA[i]);
  });

  // ---------- replay: the TIMELINE LIBRARY drives the SAME actuate path ------
  // The `midi` adapter in the library's shape. reduce() is the C2 reducer in
  // miniature: fold note-on/note-off (plus this instrument's one-shot envelope
  // expiry) over events ≤ t to get the sounding set; assertState() is what
  // makes seek meaningful — silence everything, re-assert what should be held.
  const midiAdapter = {
    caps: {
      kind: 'midi', domain: 'wall', unit: 'ms',
      seekable: true, reducible: true, rates: [0.5, 1, 2],
      catchUp: 'burst',            // musical: never silently drop a note
    },
    actuate(p) { actuate(p.raw, p.source, 0, { tag: `replay:${p.source}` }); },
    reduce(payloads, posMs) {
      const held = new Map();
      for (const p of payloads) {
        const [status, note, vel] = p.raw;
        if ((status & 0xf0) === 0x90 && vel > 0) held.set(note, p); else held.delete(note);
      }
      for (const [note, p] of held) if (posMs - p.at >= VOICE_MS) held.delete(note);
      return held;
    },
    assertState(held) {
      silenceAll();
      for (const p of held.values()) actuate(p.raw, p.source, 0, { tag: 'reassert' });
    },
  };

  let deck = null, deckLogLen = -1;
  /** the deck is a view of a log SNAPSHOT; rebuild it when the log has grown. */
  function ensureDeck() {
    if (deck && deckLogLen === log.length) return deck;
    if (deck) deck.dispose();
    deckLogLen = log.length;
    let lastHud = 0;
    deck = log.length ? makeDeck({
      log, adapter: midiAdapter, kind: 'midi', tickHost,
      // the position observable drives the HUD, throttled to ~10 Hz: a 60 Hz
      // redraw is main-thread work that would show up in the firing error
      onPosition: () => { const t = performance.now(); if (t - lastHud > 100) { lastHud = t; drawHud(); } },
      onDrift: (rows, all) => { stats.drift = pstats(all.map((r) => r.deltaMs)); stats.replayFired = all.length; },
    }) : null;
    return deck;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** full-session replay at 1× — same signature the harness has always used. */
  async function replay() {
    const d = ensureDeck();
    if (!d) return { fired: 0, logged: 0 };
    const logBefore = log.length;
    d.resetDrift(); stats.drift = null; stats.replayFired = 0;
    silenceAll();
    d.pause(); d.seek(0); d.setRate(1); d.play();   // seam 2: setRate no longer plays
    const deadline = performance.now() + d.durationMs + 15000;
    while (d.fireCount() < d.items.length && performance.now() < deadline) await sleep(50);
    await sleep(150);
    d.pause();
    const rows = d.drift();
    drawHud('REPLAY DONE');
    return {
      fired: rows.length, logged: log.length, scheduled: d.items.length,
      logGrewBy: log.length - logBefore, host: d.hostName,
      drift: pstats(rows.map((r) => r.deltaMs)),
      origins: rows.reduce((a, r) => (a[r.origin] = (a[r.origin] || 0) + 1, a), {}),
      audit: d.audit().fires.reduce((a, f) => (a[f.fires] = (a[f.fires] || 0) + 1, a), {}),
      armedAfter: d.audit().armed,
    };
  }

  // ---------- auto driver (headless verification): a musical 60 s duet ------
  function autoPlay(durationMs = 60000) {
    const line = role === 'a' ? [0, 2, 4, 2, 5, 4, 2, 0] : [7, 5, 4, 5, 2, 4, 5, 7];
    let i = 0;
    const t0 = performance.now();
    return new Promise((res) => {
      const iv = setInterval(() => {
        if (performance.now() - t0 > durationMs) { clearInterval(iv); res(stats); return; }
        noteOn(PENTA[line[i % line.length]]);
        if (i % 8 === 7) noteOn(PENTA[(line[i % line.length] + 2) % 10]); // occasional dyad
        i++;
      }, 400 + (role === 'b' ? 35 : 0)); // slight phase offset so peers interleave
    });
  }

  // ---------- boot ----------
  async function start() {
    await calibrate();
    let t;
    try {
      t = await transports[transportName]();
    } catch (e) {
      if (transportName !== 'do') {
        drawHud(`transport ${transportName} FAILED (${e.message}) — falling back to DO relay`);
        t = await transports.do();
      } else throw e;
    }
    sendRaw = t.send;
    drawHud(`ready — ${t.label}`);
    return t.label;
  }

  return {
    start, noteOn, replay, autoPlay, nowUs,
    stats: () => ({ ...stats, p50: rollP50(), logged: log.length, offLocalUs }),
    log: () => log,
    // transport deck (library-driven) + the reducer's observable side.
    // deck() builds it from the current log snapshot; deckIfAny() never builds
    // (the UI polls with it, so the live jam never spins up a worker).
    deck: ensureDeck, deckIfAny: () => deck, soundingNotes, silenceAll, drawHud,
  };
}
