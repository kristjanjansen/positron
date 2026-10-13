// demo/shell/live.mjs: Cloudflare Stream inputs, WHIP and WHEP, shared by the
// pages that publish to Stream or play from it.
//
// RETIRED 2026-10-13, AND GONE FROM THIS FILE THE SAME DAY: the test pattern
// that `/llhls/` and `/webrtc/` played (the inputs positron-demo and whep-rig,
// pub's /watch, /status, /start, /stop and /whip), and `/cam/`'s RTMPS camera
// (the input positron-cam, pub's /cam). Stream deleted the three inputs and pub
// answers those routes 410. What went with them: `LIVE.uid`, `LIVE.pub`,
// `LIVE.pubStatus`, `llhls()`, `lifecycle()`, `waitForManifest`, `WHEP_UID`,
// `whep()`, `WHIP_PROXY`, `whipPublish`, `CAM_PROXY`, `CAM_UID`, `camLlhls()`,
// `camLifecycle()`, and `watchPresentedFps`, which only those two pages called.
// They are in git at be7737d. The archived pages that
// used them are still served and answer a press with `RETIRED_LEG` rather than
// a 90 s wait for a publisher that no longer exists.
//
// What is left: /stage/'s own input, the camera's WebRTC input (video/030), the
// LL-HLS loopback publish (`camPublish`, video/060), the TURN relay, and the
// WHIP and WHEP helpers they share.

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
 * Hold the publisher up for as long as the page is open. The socket IS the
 * reference count: dropping it is how the container learns nobody is watching.
 * `url` has no default since 2026-10-13: the default was the test pattern's
 * /watch, which is retired, and /stage/ passes its own `STAGE_PUB`.
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
 * Wait for the WHIP LEG, which is a different input from the HLS one.
 * 07 previously waited on the HLS manifest — a signal about input A while it
 * was about to play input B, so it asked for WHEP before the WHIP handshake had
 * finished and got a 409. The publisher's own status is the right signal.
 * `statusUrl` has no default since 2026-10-13 (the default was the retired
 * /status); /stage/ passes `STAGE_PUB_STATUS`.
 */
export async function waitForWhip({ timeoutMs = 90000, onTick, signal, statusUrl } = {}) {
  const t0 = Date.now();
  const ac = new AbortController();
  const stop = () => ac.abort();
  addEventListener('pagehide', stop, { once: true });
  // 🔴 A PAGE THAT CAN BE STOPPED HAS TO BE ABLE TO STOP THIS. Added 2026-09-29
  // when both streaming pages gained a three state toggle whose middle state is
  // half a minute long: a press during `starting` closes the socket, and
  // without this the poll went on asking Cloudflare for a publisher nobody was
  // waiting for until the timeout. `pagehide` was the only way out and a
  // visitor who has pressed stop has not left the page.
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

// ── publish and subscribe, shared ──────────────────────────────────────────
//
// Both halves of a WebRTC round trip through Cloudflare, in one place because
// two pages need them and each carries lessons that were paid for once.

/**
 * 🔴 STREAM ANSWERS OVER UDP ONLY, AND A NETWORK THAT DROPS UDP GETS A 201 AND
 * NO MEDIA. MEASURED 2026-09-30 on a phone hotspot: both the WHIP and the WHEP
 * answer are `a=ice-lite` with one candidate, `udp 141.101.90.0 1473 typ host`,
 * and nothing over TCP. A `tcptype passive` candidate munged into a real answer,
 * at that port and at 443, was applied by Chrome and ICE still failed. So the
 * way round is a relay the browser reaches over TCP: Cloudflare Realtime TURN,
 * `turns:turn.cloudflare.com:443?transport=tcp`, minted by our worker so the
 * TURN key never reaches a page.
 *
 * `iceServers` is an OPTION on both helpers rather than a fork of them. Absent,
 * a peer connection is built exactly as it always was. Present, ICE is handed
 * the relay as one more route and still chooses; nothing forces relay, so a
 * network with working UDP keeps its direct path and costs no relay bytes.
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
 * Wait for ICE gathering, capped, because WHIP and WHEP to Cloudflare take no
 * trickle and the offer has to carry every candidate it is going to have.
 * ⚠️ WITH A RELAY, STOP SHORTLY AFTER THE FIRST RELAY CANDIDATE. On a network
 * that drops UDP the relay's UDP routes never answer, so gathering would sit
 * out the whole cap for nothing; the TCP relay candidate is the one that works
 * there, and waiting a moment past it lets any sibling arrive.
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
 * Does UDP leave this network? One STUN binding request to Cloudflare, read as
 * a server-reflexive candidate. An answer is proof that UDP gets out and back;
 * silence within the cap is reported as `udp: false`.
 * ⚠️ `known: false` when the browser cannot ask at all, which never counts as
 * blocked: "we did not look" must not read as "it is missing".
 * ⚠️ WHAT IT CANNOT SEE: a network that lets UDP to 3478 through and drops it
 * elsewhere. That shape was not met here and is not claimed.
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
 * Which path did ICE choose: `direct` or `relay`. Read off the SELECTED
 * candidate pair, because a relay candidate being gathered says nothing about
 * whether the media uses it.
 *
 * 🔴 A RELAYED LATENCY IS NOT COMPARABLE TO A DIRECT ONE, which is why a page
 * shows this cell beside its latency. Through TURN the media takes an extra hop
 * to Cloudflare's relay and, on the TCP route, pays head of line blocking too.
 *
 * The selected pair is the transport's `selectedCandidatePairId` where the
 * browser reports it (Chrome, Safari), and otherwise the nominated succeeded
 * pair (Firefox has no transport stats). The local candidate's `candidateType`
 * of `relay` is the whole test.
 *
 * Never throws. `path: null` means the pair could not be read yet, which is not
 * `direct`: "we did not look" must not read as an answer.
 *   { path: 'direct'|'relay'|null, local, remote, protocol, relayProtocol, rttMs }
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
 * Subscribe over WHEP into `video`, and hand back the stream we own.
 *
 * Promoted out of `webrtc` so a second page cannot copy it — it carries three
 * things that were each learned the hard way:
 *
 *  · Cloudflare REFUSES a single-track offer, both ways, so both transceivers
 *    are offered `recvonly` even when only one is wanted.
 *  · A WebRTC track ARRIVES MUTED and unmutes only when media flows. Assigning
 *    `srcObject` before that gives iOS a stream with no frames, and it paints
 *    black and stays there while decoding succeeds behind it.
 *  · Adopting `e.streams[0]` per track LOSES a track: Cloudflare sends audio and
 *    video with different msids, so the second `ontrack` replaces the first.
 *    One stream that we own, every arriving track added to it.
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

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await gathered(pc, iceServers);
  const res = await offerSdp(url, pc.localDescription.sdp, { log });
  await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() });
  return { pc, inbound, location: res.headers.get('location') };
}

/**
 * POST an offer, and treat a 409 as NOT YET rather than NO.
 *
 * 🔴 THIS IS `keep`'s UNEXPLAINED 409, AND IT WAS A RACE. Cloudflare answers a
 * WHEP subscribe with 409 while the input is not publishing — and a page that
 * publishes and then immediately subscribes is asking in the gap between the
 * WHIP POST returning and ICE/DTLS finishing, which is a window of a second or
 * so that usually closes first and sometimes does not. `waitForWhip` above was
 * written for the same fault on a different page, where the container's own
 * status was available to wait on; a page publishing from itself has no such
 * signal, so the honest move is to ask again.
 *
 * ⚠️ A RECOVERY ACTION IS NOT FREE (CLAUDE.md). It is bounded at five retries
 * over ~7 s, it YIELDS rather than spinning, it re-posts the SAME offer (a 409
 * means nothing was created, so there is no second session to leak), and every
 * other status fails immediately — a 404 or a 500 is not going to become a 201
 * by being asked twice.
 *
 * Exported so `demo/shell/live-test.mjs` can drive it with a stubbed fetch:
 * a guard nobody has seen fire is a guard nobody knows they have.
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
 * A CAMERA ONTO AN LL-HLS INPUT, through the Pub Durable Object and a
 * container instance, with the key never leaving the worker.
 * plans/plan-cam-llhls.md.
 *
 *   page MediaRecorder (H.264 in WebM, 2 s keyframes, 100 ms slices)
 *     -> a pub WebSocket (`url`) -> one POST per chunk into the container
 *     -> ffmpeg -c:v copy to RTMPS -> that instance's own LL-HLS input
 *
 * 🔴 `url` HAS NO DEFAULT SINCE 2026-10-13. The default was /cam/'s RTMPS camera,
 * `wss://pub.positron.studio/cam`, whose input (positron-cam) was deleted that
 * day and whose route answers 410. The one caller left is /video/ll-hls-loopback/,
 * which passes `wss://pub.positron.studio/loop` (its own input,
 * positron-hls-loopback).
 * 🔴 ITS OWN INPUT, NOT THE TEST PATTERN'S. It borrowed that one by handover
 * until 2026-09-30 and /llhls/ stalled while a camera was tested on it. One
 * camera at a time; a second is refused, and that arrives here as `busy` with
 * the worker's own words, so a page shows them rather than a black box.
 * ⚠️ RECORDING STARTS ON `ready`, NEVER BEFORE. The first chunk carries the
 * WebM header, and a header that reaches the container before ffmpeg exists
 * is a stream ffmpeg can never start.
 * ⚠️ WEBM ON CHROME, NOT MP4, EVEN THOUGH FLV LOOKS MORE LIKE MP4. MEASURED in
 * the plan: Chrome's fragmented MP4 ignores the slice and waits for a whole
 * 2 s GOP. The MP4 arm is for Safari and its cadence is NOT measured.
 *
 * onState({ t, why }): t is one of
 *   ready     the container is publishing what this records
 *   busy      refused, with the worker's reason (another camera is on it)
 *   stopped  the worker ended it (idle, length cap, Stream stopped taking bytes)
 *   closed    the socket closed with nothing said
 *   unsupported  this browser cannot record H.264
 */

/**
 * The camera's WebRTC input ("positron-cam-whip", src/provision-cam-whip.sh,
 * recording off), published through `pub.positron.studio/cam/whip` so the key
 * stays in the worker. /video/webrtc-loopback/'s WebRTC loopback since 2026-10-13,
 * and the archived /cam/'s WebRTC leg. It borrowed the test pattern's WHIP
 * input until 2026-09-30 and was refused with 409 whenever somebody held the
 * (now retired) /watch. One camera at a time; a second gets 409 in words.
 */
export const CAM_WHIP_UID = '54791f4c5c73713859c5413eeb06a008';
export const CAM_WHIP_PROXY = 'https://pub.positron.studio/cam/whip';
export const camWhep = () =>
  `https://${LIVE.customer}.cloudflarestream.com/${CAM_WHIP_UID}/webRTC/play`;

/**
 * WHIP through our worker, for the camera's own input. It began as a copy of
 * `whipPublish`, the test pattern's publish, which was retired 2026-10-13 and
 * is gone from this file.
 * ⚠️ THE DELETE IS `keepalive`, because the worker holds the input for this
 * session until it hears it, and `stop()` also runs from `pagehide`, where an
 * ordinary fetch is cancelled with the page.
 */
export async function camWhipPublish(stream, { url = CAM_WHIP_PROXY, log = () => {}, iceServers = null } = {}) {
  const pc = new RTCPeerConnection(rtcConfig(iceServers));
  for (const t of stream.getTracks()) pc.addTrack(t, stream);
  pc.onconnectionstatechange = () => log(`publish ${pc.connectionState}`);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await gathered(pc, iceServers);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/sdp' },
    body: pc.localDescription.sdp,
  });
  const body = await res.text();
  if (!res.ok) { pc.close(); throw new Error(`publish ${res.status}: ${body.slice(0, 120)}`); }
  const id = res.headers.get('x-whip-id');
  await pc.setRemoteDescription({ type: 'answer', sdp: body });
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
