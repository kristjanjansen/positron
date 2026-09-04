// proto/osc/bench.js — PHASE 3 browser arms. Two headless Chromes, peer=a
// (sender) and peer=b (receiver), driven by run-bench.mjs over CDP.
//
// THE HYPOTHESIS UNDER TEST (PROGRESS 6i/6l): the jam matrix's 2.9 % MoQ loss
// was 100 % chord notes, caused by back-to-back SINGLE-FRAME groups racing
// under newest-first delivery. An OSC BUNDLE IS SEMANTICALLY A GROUP. So:
//
//   moq-bundle   one BUNDLE  = one group = one frame  (the hypothesis)
//   moq-msg      one MESSAGE = one group = one frame  (the jam shape, control)
//
// Both arms send the SAME logical traffic — the same bundles, the same sizes,
// the same schedule — so the only variable is the grouping. That is the whole
// experiment, and it is why the control arm exists: "MoQ got better" would be
// unattributable without it.

import * as OSC from '/timeline/osc.mjs';

const q = new URLSearchParams(location.search);
const PEER = q.get('peer') || 'a';
const SESSION = q.get('seed') || 'x';
document.getElementById('peer').textContent = PEER;
const logEl = document.getElementById('log');
const log = (s, c = '') => { logEl.innerHTML += `<span class="${c}">${s}</span>\n`; logEl.scrollTop = 1e9; };

// ---- clock: min-RTT against the local truth server; both peers are on this
// host, so after calibration their epochs agree to well under a millisecond.
const rawUs = () => (performance.timeOrigin + performance.now()) * 1000;
let offUs = 0;
const nowUs = () => rawUs() + offUs;
async function calibrate() {
  let best = { rtt: Infinity, off: 0 };
  for (let i = 0; i < 25; i++) {
    const a = rawUs();
    const j = await (await fetch('/time-local', { cache: 'no-store' })).json();
    const b = rawUs();
    if (b - a < best.rtt) best = { rtt: b - a, off: j.us + (b - a) / 2 - b };
  }
  offUs = best.off;
  log(`clock calibrated: offset ${(offUs / 1000).toFixed(3)} ms, min RTT ${(best.rtt / 1000).toFixed(3)} ms`, 'k');
}

// ---- signalling mailbox (never on a measured path) ------------------------
const post = (b, m) => fetch(`/msg/${b}`, { method: 'POST', body: JSON.stringify(m) });
function reader(b) {
  let from = 0;
  return async () => { const j = await (await fetch(`/msg/${b}?from=${from}`)).json(); from = j.next; return j.msgs; };
}
async function waitFor(rd, pred, ms = 25000) {
  const t0 = Date.now();
  for (;;) {
    for (const m of await rd()) if (pred(m)) return m;
    if (Date.now() - t0 > ms) throw new Error('signalling timeout');
  }
}

// ---- payload: real OSC bundles from the real codec -----------------------
const sizeFor = (i) => 3 + (i % 6);                       // 3..8 messages
function bundleFor(bseq, n, tUs) {
  return { n, msgs: Array.from({ length: n }, (_, i) => ({
    address: `/bench/${i}`, types: 'iiid',
    args: [OSC.osc.int(bseq), OSC.osc.int(i), OSC.osc.int(n), OSC.osc.double(tUs)] })) };
}
const encodeWhole = (b) => OSC.encodeBundle({ timetag: OSC.OSC_IMMEDIATE, elements: b.msgs });
const encodeEach = (b) => b.msgs.map((m) => OSC.encodeMessage(m));

function schedule(shape, n) {
  const out = [];
  if (shape === 'burst') for (let i = 0; i < n; i++) out.push(i * 40);
  else if (shape === 'sparse') for (let i = 0; i < n; i++) out.push(i * 300);
  else for (let i = 0; i < n; i++) out.push(Math.floor(i / 3) * 450 + (i % 3) * 4);
  return out;
}

// ---- receiver: scores integrity from the WIRE, not from the transport -----
function makeReceiver() {
  const got = new Map();      // bseq -> {count, want, firstAt, tUs}
  let notOurs = 0, packets = 0;
  return {
    got,
    stats: () => ({ packets, notOurs }),
    onPacket(bytes) {
      packets++;
      let pkt;
      try { pkt = OSC.decodePacket(bytes); } catch { notOurs++; return; }
      const { out } = OSC.flattenBundle(pkt);
      if (!out.length) { notOurs++; return; }
      const at = nowUs();
      for (const { message } of out) {
        const a = message.args;
        if (!a || a.length < 4) { notOurs++; continue; }
        const [bseq, , n, tUs] = a;
        let e = got.get(bseq);
        if (!e) got.set(bseq, e = { count: 0, want: n, firstAt: at, tUs, packets: 0 });
        e.count++;
      }
      const first = out[0].message.args[0];
      const e = got.get(first);
      if (e) e.packets++;
    },
  };
}

const pct = (a, p) => (a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(p * a.length))] : null);
const r2 = (x) => (x === null || !Number.isFinite(x) ? null : +x.toFixed(2));

function score(rx, sentSizes) {
  const lat = [];
  let complete = 0, partial = 0;
  for (const [bseq, want] of sentSizes) {
    const e = rx.got.get(bseq);
    if (!e) continue;
    if (e.count === want) complete++; else partial++;
    lat.push((e.firstAt - e.tUs) / 1000);
  }
  const arrived = rx.got.size;
  return {
    bundlesSent: sentSizes.size, bundlesArrived: arrived,
    lossPct: r2((1 - arrived / sentSizes.size) * 100),
    complete, partial,
    integrityPct: arrived ? r2((complete / arrived) * 100) : null,
    wholeOfSentPct: r2((complete / sentSizes.size) * 100),
    ...rx.stats(),
    latency: lat.length ? { n: lat.length, p50: r2(pct(lat, 0.5)), p95: r2(pct(lat, 0.95)),
      p99: r2(pct(lat, 0.99)), min: r2(Math.min(...lat)), max: r2(Math.max(...lat)) } : null,
  };
}

// ==========================================================================
// TRANSPORTS. Each returns {send(bytesArrayOrOne), close()} for the sender and
// wires rx.onPacket for the receiver.
// ==========================================================================
const RELAY = 'https://draft-14.cloudflare.mediaoverquic.com';

async function setupDc(arm, rx) {
  const pc = new RTCPeerConnection({ iceServers: [] });
  const sig = `osc-dc-${SESSION}-${arm}`;
  let ch;
  const ready = new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('dc timeout')), 20000);
    const wire = (c) => {
      c.binaryType = 'arraybuffer';
      c.onmessage = (e) => rx.onPacket(new Uint8Array(e.data));
      c.onopen = () => { clearTimeout(t); res(c); };
      if (c.readyState === 'open') { clearTimeout(t); res(c); }
    };
    if (PEER === 'a') wire(ch = pc.createDataChannel('osc', { ordered: false, maxRetransmits: 0 }));
    else pc.ondatachannel = (e) => wire(ch = e.channel);
  });
  const gather = () => new Promise((r) => { if (pc.iceGatheringState === 'complete') return r(); pc.onicegatheringstatechange = () => pc.iceGatheringState === 'complete' && r(); });
  if (PEER === 'a') {
    await pc.setLocalDescription(await pc.createOffer()); await gather();
    await post(sig, { kind: 'offer', sdp: pc.localDescription.sdp });
    const ans = await waitFor(reader(sig), (m) => m.kind === 'answer');
    await pc.setRemoteDescription({ type: 'answer', sdp: ans.sdp });
  } else {
    const off = await waitFor(reader(sig), (m) => m.kind === 'offer');
    await pc.setRemoteDescription({ type: 'offer', sdp: off.sdp });
    await pc.setLocalDescription(await pc.createAnswer()); await gather();
    await post(sig, { kind: 'answer', sdp: pc.localDescription.sdp });
  }
  const c = await ready;
  return { send: (b) => c.readyState === 'open' && c.send(b), close: () => { try { pc.close(); } catch {} } };
}

async function setupMoq(arm, rx) {
  if (!window.MoqJam) throw new Error('MoqJam bundle missing');
  // §13.4 fresh-name discipline: a same-name rejoin BRICKS the namespace
  // relay-wide until announce GC, so every run takes a new one.
  const ns = `osc-${SESSION}-${arm}`;
  // ORDERING IS LOAD-BEARING ON d14. There is no SUBSCRIBE_NAMESPACE, so a
  // subscriber that consumes a path before the publisher has announced it does
  // not wait — it fails, and the failure is permanent for that subscription
  // (and each failed attempt permanently burns one of the session's ~40-60
  // subscribe credits, RUNBOOK §13.4). So: publisher up FIRST, then announce
  // over the mailbox, and only then does the subscriber consume. Getting this
  // wrong reads exactly like catastrophic transport loss — the first run of
  // this arm reported 100 % loss for precisely this reason, not for anything
  // MoQ did.
  const gate = `moq-up-${SESSION}-${arm}`;
  if (PEER === 'a') {
    const pub = await window.MoqJam.publisher(RELAY, ns);
    // give the relay a moment to register the announce before anyone consumes
    await new Promise((r) => setTimeout(r, 1500));
    await post(gate, { up: true });
    return { send: (b) => pub.send(b), close: () => pub.close() };
  }
  await waitFor(reader(gate), (m) => m.up === true, 40000);
  const sub = await window.MoqJam.subscriber(RELAY, ns);
  sub.onMessage((p) => rx.onPacket(p));
  return { send: () => {}, close: () => sub.close() };
}

async function setupDo(arm, rx) {
  const env = await (await fetch('/env.json')).json();
  const ws = new WebSocket(`wss://osc.positron.studio/room/osc-${SESSION}-${arm}/ws?token=${env.OSC_TOKEN}`);
  ws.binaryType = 'arraybuffer';
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('do ws failed')); });
  // the relay echoes to the sender too; peer b is the one that scores
  if (PEER === 'b') ws.onmessage = (e) => e.data instanceof ArrayBuffer && rx.onPacket(new Uint8Array(e.data));
  return { send: (b) => ws.readyState === 1 && ws.send(b), close: () => ws.close() };
}

const SETUP = { 'dc-direct': setupDc, 'moq-bundle': setupMoq, 'moq-msg': setupMoq, 'do': setupDo };

// ==========================================================================
let rx = null, tp = null, sentSizes = null;

async function runArm(arm, shape, n) {
  rx = makeReceiver();
  tp = await SETUP[arm](arm + '-' + shape, rx);
  log(`${arm}/${shape}: transport up`, 'k');
  await post(`ready-${SESSION}-${arm}-${shape}`, { peer: PEER });
  // both peers must be connected before the first send, or the receiver's
  // subscription misses the opening groups (and on MoQ that is unrecoverable)
  await waitFor(reader(`ready-${SESSION}-${arm}-${shape}`), (m) => m.peer !== PEER, 30000);
  await new Promise((r) => setTimeout(r, 1200));

  if (PEER === 'a') {
    const times = schedule(shape, n);
    sentSizes = new Map();
    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      const wait = times[i] - (Date.now() - t0);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      const b = bundleFor(i, sizeFor(i), nowUs());
      sentSizes.set(i, b.n);
      // THE ONLY DIFFERENCE BETWEEN THE TWO MoQ ARMS:
      if (arm === 'moq-msg') for (const m of encodeEach(b)) tp.send(m);   // N groups
      else tp.send(encodeWhole(b));                                       // ONE group
    }
    log(`${arm}/${shape}: sent ${n} bundles`, 'k');
    return { role: 'sender', sent: n };
  }
  await new Promise((r) => setTimeout(r, schedule(shape, n)[n - 1] + 6000));
  const s = score(rx, new Map(Array.from({ length: n }, (_, i) => [i, sizeFor(i)])));
  log(`${arm}/${shape}: loss ${s.lossPct}% integrity ${s.integrityPct}% p50 ${s.latency && s.latency.p50}`, 'w');
  return { role: 'receiver', ...s };
}

window.BENCH = {
  calibrate,
  runArm,
  teardown() { try { tp && tp.close(); } catch {} tp = null; },
  ready: true,
};
log('bench loaded, peer=' + PEER, 'k');
