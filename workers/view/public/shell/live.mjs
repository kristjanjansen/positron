// demo/shell/live.mjs: Cloudflare Stream inputs, WHIP and WHEP. Left: /stage/'s input, the
// camera's WebRTC input, the LL-HLS loopback publish, the TURN relay and their helpers.
// The retired test pattern and RTMPS camera helpers are in git at be7737d.
// why: lessons/kit-live.md#header

export const LIVE = {
  customer: 'customer-mwuu1cmlyif6eluy',
};

/** What an archived page says when its retired leg is pressed. */
export const RETIRED_LEG = 'this leg was retired 2026-10-13';

/**
 * /stage/'s OWN WebRTC input, fed the MIM film by its own container instance
 * (held at wss://pub.positron.studio/stage/watch). Filled in from the
 * `STAGE_UID=` line `src/provision-stage.sh` prints. While it is null the
 * input does not exist and `stageWhep()` answers null rather than a URL.
 */
export const STAGE_UID = 'c8c838fed78bb43aa588d92ab92bd25f';   // "positron-stage"
export const STAGE_PUB = 'wss://pub.positron.studio/stage/watch';
export const STAGE_PUB_STATUS = 'https://pub.positron.studio/stage/status';
export const stageWhep = () => (STAGE_UID
  ? `https://${LIVE.customer}.cloudflarestream.com/${STAGE_UID}/webRTC/play`
  : null);

/**
 * Hold the publisher up while the page is open: the socket is the reference count.
 * `url` has no default; /stage/ passes STAGE_PUB.
 * why: lessons/kit-live.md#hold-publisher
 */
export function holdPublisher(onState, url) {
  const ws = new WebSocket(url);
  ws.onopen = () => onState?.({ held: true });
  ws.onclose = () => onState?.({ held: false });
  ws.onerror = () => onState?.({ held: false, error: true });
  ws.onmessage = (e) => { try { onState?.({ held: true, ...JSON.parse(e.data) }); } catch { /* not json */ } };
  addEventListener('pagehide', () => { try { ws.close(); } catch { /* gone */ } });
  return ws;
}

/**
 * Wait for the WHIP leg via the publisher's own status, not the HLS manifest (that gave 409).
 * `statusUrl` has no default; /stage/ passes STAGE_PUB_STATUS.
 * why: lessons/kit-live.md#wait-for-whip
 */
export async function waitForWhip({ timeoutMs = 90000, onTick, signal, statusUrl } = {}) {
  const t0 = Date.now();
  const ac = new AbortController();
  const stop = () => ac.abort();
  addEventListener('pagehide', stop, { once: true });
  // A stop press aborts the poll, so it does not ask Cloudflare until the timeout.
  // why: lessons/kit-live.md#wait-abort
  signal?.addEventListener('abort', stop, { once: true });
  while (Date.now() - t0 < timeoutMs && !ac.signal.aborted) {
    try {
      const s = await (await fetch(statusUrl, { cache: 'no-store', signal: ac.signal })).json();
      if (s?.container?.whip?.publishing) {
        removeEventListener('pagehide', stop);
        return { ok: true, waitedMs: Date.now() - t0 };
      }
      onTick?.({ whip: !!s?.container?.whip?.publishing, err: s?.container?.whip?.error ?? null, waitedMs: Date.now() - t0 });
    } catch {
      if (ac.signal.aborted) return { ok: false, aborted: true, waitedMs: Date.now() - t0 };
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  removeEventListener('pagehide', stop);
  return { ok: false, aborted: ac.signal.aborted, waitedMs: Date.now() - t0 };
}

// Both halves of a WebRTC round trip through Cloudflare, shared by two pages.
// why: lessons/kit-live.md#publish-subscribe

/**
 * Stream answers over UDP only (ice-lite, one udp candidate), so a network dropping UDP
 * gets a 201 and no media. The way round is Cloudflare TURN over TCP 443, minted by our
 * worker. `iceServers` is an option; ICE still chooses and nothing forces relay.
 * why: lessons/kit-live.md#ice-proxy
 */
export const ICE_PROXY = 'https://pub.positron.studio/ice';

/** Cloudflare's STUN, free and unlimited. What a page asks when there is no relay. */
export const STUN_ONLY = [{ urls: 'stun:stun.cloudflare.com:3478' }];

const rtcConfig = (iceServers) => ({
  bundlePolicy: 'max-bundle',
  ...(iceServers?.length ? { iceServers } : {}),
});
const hasTurn = (iceServers) => (iceServers || []).some((s) => [].concat(s.urls).some((u) => /^turns?:/.test(u)));

/**
 * Wait for ICE gathering, capped (no trickle). With a relay, stop shortly after the first
 * relay candidate, since UDP routes never answer on a network that drops UDP.
 * why: lessons/kit-live.md#gathered
 */
async function gathered(pc, iceServers) {
  if (pc.iceGatheringState === 'complete') return;
  const turn = hasTurn(iceServers);
  await new Promise((res) => {
    const t = setTimeout(res, turn ? 5000 : 3000);
    const done = () => { clearTimeout(t); res(); };
    pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') done(); });
    if (turn) {
      pc.addEventListener('icecandidate', (e) => {
        if (e.candidate && / typ relay /.test(e.candidate.candidate)) setTimeout(done, 400);
      });
    }
  });
}

/**
 * Ask our worker for short lived relay servers. Never throws: a page carries
 * on without a relay, and says which it has.
 *   { iceServers, relay: true }                   minted
 *   { iceServers: STUN_ONLY, relay: false, why }  503 (no key yet), 429, or unreachable
 * STUN is kept on the no-relay path because a server-reflexive candidate is
 * what `probeUdp` and a failed connection's stats read UDP reachability from.
 */
export async function fetchIceServers({ log = () => {}, url = ICE_PROXY } = {}) {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    const body = await r.json().catch(() => ({}));
    if (r.ok && body.iceServers?.length) {
      log('a relay over TCP is available for a network that blocks UDP');
      return { iceServers: body.iceServers, relay: true };
    }
    const why = r.status === 404 ? 'the worker has no relay route yet'
      : body.error || `relay ${r.status}`;
    log(`no relay: ${why}`);
    return { iceServers: STUN_ONLY, relay: false, why, status: r.status };
  } catch (e) {
    log(`no relay: ${e.message}`);
    return { iceServers: STUN_ONLY, relay: false, why: e.message };
  }
}

/**
 * Does UDP leave this network? One STUN binding, read as a srflx candidate.
 * known: false never counts as blocked. A network passing only UDP 3478 is not seen.
 * why: lessons/kit-live.md#probe-udp
 */
export async function probeUdp({ timeoutMs = 3000, iceServers = STUN_ONLY } = {}) {
  if (typeof RTCPeerConnection !== 'function') return { known: false, udp: null, ms: 0 };
  const t0 = performance.now();
  const pc = new RTCPeerConnection({ iceServers });
  pc.createDataChannel('udp-probe');
  return new Promise((res) => {
    let over = false;
    const finish = (udp) => {
      if (over) return; over = true;
      clearTimeout(t);
      try { pc.close(); } catch { /* gone */ }
      res({ known: true, udp, ms: Math.round(performance.now() - t0) });
    };
    const t = setTimeout(() => finish(false), timeoutMs);
    pc.onicecandidate = (e) => {
      if (e.candidate && / typ srflx /.test(e.candidate.candidate)) finish(true);
      else if (!e.candidate) finish(false);
    };
    pc.createOffer().then((o) => pc.setLocalDescription(o)).catch(() => finish(false));
  });
}

/**
 * Which path ICE chose, direct or relay, read off the selected pair; a relayed latency is not
 * comparable to a direct one. Never throws; path null means not read yet.
 *   { path: 'direct'|'relay'|null, local, remote, protocol, relayProtocol, rttMs }
 * why: lessons/kit-live.md#read-ice-path
 */
export async function readIcePath(pc) {
  const none = { path: null, local: null, remote: null, protocol: null, relayProtocol: null, rttMs: null };
  if (!pc || pc.connectionState === 'closed') return none;
  const stats = await pc.getStats().catch(() => null);
  if (!stats) return none;
  let pair = null;
  for (const s of stats.values()) {
    if (s.type === 'transport' && s.selectedCandidatePairId) {
      pair = stats.get(s.selectedCandidatePairId) || pair;
    }
  }
  if (!pair) {
    for (const s of stats.values()) {
      if (s.type === 'candidate-pair' && s.state === 'succeeded' && (s.nominated || s.selected)) { pair = s; break; }
    }
  }
  if (!pair) return none;
  const local = stats.get(pair.localCandidateId);
  const remote = stats.get(pair.remoteCandidateId);
  if (!local?.candidateType) return none;
  return {
    path: local.candidateType === 'relay' ? 'relay' : 'direct',
    local: local.candidateType,
    remote: remote?.candidateType ?? null,
    protocol: local.protocol ?? null,
    relayProtocol: local.relayProtocol ?? null,
    rttMs: Number.isFinite(pair.currentRoundTripTime) ? pair.currentRoundTripTime * 1000 : null,
  };
}

/**
 * Subscribe over WHEP into `video`. Both transceivers recvonly (Cloudflare refuses one),
 * srcObject set after unmute (iOS paints black otherwise), and one owned stream
 * for every track (audio and video arrive with different msids).
 * why: lessons/kit-live.md#whep-play
 */
export async function whepPlay(url, video, { log = () => {}, onTrack, iceServers = null } = {}) {
  const pc = new RTCPeerConnection(rtcConfig(iceServers));
  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });

  const inbound = new MediaStream();
  pc.ontrack = (e) => {
    inbound.addTrack(e.track);
    onTrack?.(e);
    const attach = async () => {
      if (video.srcObject !== inbound) video.srcObject = inbound;
      try { await video.play(); log(`attached on ${e.track.kind} unmute`); }
      catch { /* a page that wants a prompt can call playOrPrompt itself */ }
    };
    if (e.track.muted) e.track.addEventListener('unmute', attach, { once: true });
    else attach();
    video.addEventListener('loadedmetadata', () => video.play().catch(() => {}), { once: true });
  };
  pc.onconnectionstatechange = () => log(`pc ${pc.connectionState}`);

  // A failed offer closes the peer connection, and a session the server made
  // before the throw is deleted, or every failed Start leaks one of each.
  let location = null;
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await gathered(pc, iceServers);
    const res = await offerSdp(url, pc.localDescription.sdp, { log });
    location = res.headers.get('location');
    await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() });
  } catch (e) {
    try { pc.close(); } catch { /* already */ }
    if (location) fetch(new URL(location, url), { method: 'DELETE', keepalive: true }).catch(() => {});
    throw e;
  }
  return { pc, inbound, location };
}

/**
 * POST an offer and treat a 409 as not yet: the subscribe raced the WHIP handshake.
 * Five retries over about 7 s, same offer, any other status fails at once.
 * Exported so live-test.mjs can drive it with a stubbed fetch.
 * why: lessons/kit-live.md#whep-retry
 */
export const WHEP_RETRY = { tries: 5, firstMs: 600, stepMs: 400 };

export async function offerSdp(url, sdp, { log = () => {}, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  let res = null, waited = 0;
  for (let i = 0; ; i++) {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/sdp' },
      body: sdp,
    });
    if (res.status !== 409 || i >= WHEP_RETRY.tries) break;
    const back = WHEP_RETRY.firstMs + i * WHEP_RETRY.stepMs;
    waited += back;
    log(`409: nothing is publishing to that input yet; asking again in ${back} ms`);
    await sleep(back);
  }
  if (!res.ok) {
    throw new Error(`WHEP ${res.status}`
      + (res.status === 409 ? `: still nothing publishing after ${(waited / 1000).toFixed(1)} s of asking` : ''));
  }
  if (waited) log(`attached after ${(waited / 1000).toFixed(1)} s of waiting for the publish to go live`, 'hi');
  return res;
}

/**
 * A camera onto an LL-HLS input through pub and a container; the key stays in the worker.
 *   MediaRecorder (H.264 in WebM, 2 s keyframes, 100 ms slices) -> pub WebSocket `url`
 *   -> container -> ffmpeg -c:v copy to RTMPS -> the instance's LL-HLS input
 * `url` has no default (/video/llhls/ passes wss://pub.positron.studio/loop). Recording starts
 * on ready. WebM on Chrome, because its fragmented MP4 waits for a whole 2 s GOP.
 * onState({ t, why }): ready, busy, stopped, closed, unsupported
 * why: lessons/kit-live.md#cam-publish
 */

/**
 * The camera's WebRTC input (positron-cam-whip), through pub.positron.studio/cam/whip.
 * One camera at a time; a second gets 409 in words.
 * why: lessons/kit-live.md#cam-whip
 */
export const CAM_WHIP_UID = '54791f4c5c73713859c5413eeb06a008';
export const CAM_WHIP_PROXY = 'https://pub.positron.studio/cam/whip';
export const camWhep = () =>
  `https://${LIVE.customer}.cloudflarestream.com/${CAM_WHIP_UID}/webRTC/play`;

/**
 * WHIP through our worker, for the camera's own input. The DELETE is keepalive,
 * because stop() also runs from pagehide.
 * why: lessons/kit-live.md#cam-whip-publish
 */
export async function camWhipPublish(stream, { url = CAM_WHIP_PROXY, log = () => {}, iceServers = null } = {}) {
  const pc = new RTCPeerConnection(rtcConfig(iceServers));
  for (const t of stream.getTracks()) pc.addTrack(t, stream);
  pc.onconnectionstatechange = () => log(`publish ${pc.connectionState}`);
  let id = null;
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await gathered(pc, iceServers);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/sdp' },
      body: pc.localDescription.sdp,
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`publish ${res.status}: ${body.slice(0, 120)}`);
    id = res.headers.get('x-whip-id');
    await pc.setRemoteDescription({ type: 'answer', sdp: body });
  } catch (e) {
    // The worker holds the one camera input for a session until it hears DELETE.
    try { pc.close(); } catch { /* already */ }
    if (id) fetch(`${url}/${id}`, { method: 'DELETE', keepalive: true }).catch(() => {});
    throw e;
  }
  log(`publishing, id ${id}`, 'hi');
  return {
    pc, id,
    async stop() {
      try { pc.close(); } catch { /* already */ }
      if (id) { try { await fetch(`${url}/${id}`, { method: 'DELETE', keepalive: true }); } catch { /* gone */ } }
    },
  };
}

export function camFormat() {
  if (typeof MediaRecorder === 'undefined') return null;
  if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) return { fmt: 'webm', mimeType: 'video/webm;codecs=h264' };
  if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01F')) return { fmt: 'mp4', mimeType: 'video/mp4;codecs=avc1.42E01F' };
  return null;
}

export function camPublish(stream, { url, log = () => {}, onState = () => {}, sliceMs = 100, bitrate = 2_500_000 } = {}) {
  const f = camFormat();
  const st = { t: 'opening', sid: null, chunks: 0, bytes: 0, readyAt: null, why: null };
  let rec = null, ws = null, done = false;
  const say = (t, why) => {
    if (done && t !== 'closed') return;
    st.t = t; st.why = why || null;
    onState({ t, why: st.why, sid: st.sid });
  };
  const halt = () => {
    try { if (rec && rec.state !== 'inactive') rec.stop(); } catch { /* gone */ }
    rec = null;
  };
  if (!f) {
    queueMicrotask(() => say('unsupported', 'this browser cannot record H.264, which the LL-HLS input needs without a server encode'));
    return { state: st, stop: () => {} };
  }
  ws = new WebSocket(url);
  ws.binaryType = 'arraybuffer';
  ws.onmessage = (e) => {
    let m = {};
    try { m = JSON.parse(e.data); } catch { return; }
    if (m.t === 'hello') {
      st.sid = m.sid;
      ws.send(JSON.stringify({ t: 'open', fmt: f.fmt }));
      log(`asked the publisher for the input (${f.fmt})`);
    } else if (m.t === 'ready') {
      st.readyAt = performance.now();
      rec = new MediaRecorder(stream, { mimeType: f.mimeType, videoBitsPerSecond: bitrate, videoKeyFrameIntervalDuration: 2000 });
      rec.ondataavailable = (ev) => {
        if (!ev.data?.size || ws.readyState !== 1) return;
        st.chunks++; st.bytes += ev.data.size;
        ws.send(ev.data);
      };
      rec.start(sliceMs);
      say('ready');
    } else if (m.t === 'busy' || m.t === 'stopped') {
      halt();
      say(m.t, m.error || m.why);
      done = true;
    }
  };
  ws.onclose = (e) => {
    halt();
    if (!done) { done = true; say('closed', e.reason || `the socket closed (${e.code})`); }
  };
  ws.onerror = () => { /* onclose follows and says it */ };
  return {
    state: st,
    stop() {
      done = true;
      halt();
      try { ws.close(1000, 'camera off'); } catch { /* gone */ }
    },
  };
}
