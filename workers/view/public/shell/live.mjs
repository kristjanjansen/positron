// demo/shell/live.mjs — the live input Act 1 publishes to and plays back.
//
// Provisioned 2026-09-04 with preferLowLatency:true and recording.mode
// "automatic" — BOTH are required or the LL-HLS pipeline is not engaged and you
// silently get plain HLS. preferLowLatency also means the manifest carries
// PROGRAM-DATE-TIME, which is what makes latency measurable at all: Cloudflare
// strips in-band metadata and only emits PDT on low-latency inputs.
//
// Nothing publishes to it until a viewer holds pub.positron.studio/watch. The
// container starts on the first viewer and stops after the last one leaves, so
// opening one of these demos is what brings the stream up.

export const LIVE = {
  uid: '0e390aa48b55d49a57284e6c2c535477',
  customer: 'customer-mwuu1cmlyif6eluy',
  pub: 'wss://pub.positron.studio/watch',
  pubStatus: 'https://pub.positron.studio/status',
};

export const llhls = () =>
  `https://${LIVE.customer}.cloudflarestream.com/${LIVE.uid}/manifest/video.m3u8?protocol=llhls`;

/**
 * WHEP playback of the same input. Safe to hardcode: it carries only the uid.
 * The WHIP *publish* URL is deliberately absent — that one embeds the stream
 * key, so it lives in a Worker secret and never in this repo.
 */
/**
 * WHEP plays a DIFFERENT input on purpose. Cloudflare's docs: "WHIP and WHEP
 * must be used together: we do not yet support inputs using RTMP/SRT to be
 * played using WHEP." Asking the RTMPS input for WHEP returns 409. So the
 * container publishes the same burned-in pattern to two inputs, and 09 compares
 * them by that clock.
 *
 * Only the uid appears here; the WHIP publish URL embeds a secret and lives in
 * a Worker secret instead.
 */
export const WHEP_UID = '224558e8993d5a5efd234d9d3a320f87';   // "whep-rig"
export const whep = () =>
  `https://${LIVE.customer}.cloudflarestream.com/${WHEP_UID}/webRTC/play`;

export const lifecycle = () =>
  `https://${LIVE.customer}.cloudflarestream.com/${LIVE.uid}/lifecycle`;

/**
 * Hold the publisher up for as long as the page is open. The socket IS the
 * reference count: dropping it is how the container learns nobody is watching.
 */
export function holdPublisher(onState) {
  const ws = new WebSocket(LIVE.pub);
  ws.onopen = () => onState?.({ held: true });
  ws.onclose = () => onState?.({ held: false });
  ws.onerror = () => onState?.({ held: false, error: true });
  ws.onmessage = (e) => { try { onState?.({ held: true, ...JSON.parse(e.data) }); } catch { /* not json */ } };
  addEventListener('pagehide', () => { try { ws.close(); } catch { /* gone */ } });
  return ws;
}

/**
 * How many frames a second this element is actually PUTTING ON SCREEN.
 *
 * 🔴 PRESENTED, NOT DECODED, AND THE DIFFERENCE IS THE ONE BUG BOTH THESE PAGES
 * HAVE ALREADY SHIPPED. `/webrtc/` read `26 fps inbound` beside a black
 * rectangle and its own comment says decoding is not rendering; `/llhls/`
 * measured an iPhone advancing at 0.16x while dropping 3 frames of 507, so
 * every decoder-side counter said the device was fine. `requestVideoFrameCallback`
 * fires once per frame the compositor actually showed, which is the number a
 * person is looking at.
 *
 * 🔴 IT IS HERE BECAUSE BOTH PUB-FED PAGES WANT THE SAME NUMBER AND NEITHER
 * SHOULD TYPE IT. They already share this module for the publisher; a second
 * copy of a frame counter in the other page is how two pages end up reporting
 * two different fps under the same word. If a page with no publisher ever wants
 * it, it belongs in the kit rather than here.
 *
 * ⚠️ AN ABSENT API REPORTS `null`, NEVER `0`. Safari before 15.4 and any engine
 * without `requestVideoFrameCallback` cannot answer, and a zero there reads as
 * a stalled picture rather than as an unasked question. The caller empties its
 * cell on null, which is the kit's own rule about a cell with nothing measured
 * in it.
 * ⚠️ AND IT COUNTS OVER A WHOLE SECOND RATHER THAN DIVIDING TWO TIMESTAMPS. A
 * per-frame interval is a sample of one and swings by several fps between two
 * frames that are both on time.
 *
 * @returns {() => void} stop it.
 */
export function watchPresentedFps(video, onRate, everyMs = 1000) {
  if (typeof video?.requestVideoFrameCallback !== 'function') {
    onRate?.(null);
    return () => {};
  }
  let frames = 0, since = performance.now(), live = true;
  const tick = () => {
    if (!live) return;
    frames++;
    const now = performance.now();
    if (now - since >= everyMs) {
      onRate?.((frames * 1000) / (now - since));
      frames = 0;
      since = now;
    }
    video.requestVideoFrameCallback(tick);
  };
  video.requestVideoFrameCallback(tick);
  return () => { live = false; };
}

/**
 * Wait for the WHIP LEG, which is a different input from the HLS one.
 * 07 previously waited on the HLS manifest — a signal about input A while it
 * was about to play input B, so it asked for WHEP before the WHIP handshake had
 * finished and got a 409. The publisher's own status is the right signal.
 */
export async function waitForWhip({ timeoutMs = 90000, onTick, signal } = {}) {
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
      const s = await (await fetch(LIVE.pubStatus, { cache: 'no-store', signal: ac.signal })).json();
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

/** Poll the manifest until Cloudflare is actually serving it (204 -> 200). */
/**
 * Does the media playlist actually carry segments yet?
 *
 * Cloudflare serves the MASTER manifest with HTTP 200 as soon as ingest
 * starts — before the child playlist has a single #EXTINF. Starting the
 * player then makes it request fragments that do not exist: measured on an
 * iPhone as a continuous fragLoadError flood (loaded=0, total=0) with
 * rebuilds every 2-6 s for the best part of a minute, ending in playback
 * once the pipeline finally filled. "A long time with stalls, then finally
 * good playback" was this, not the encoder and not the latency target.
 *
 * Two segments, not one: one is a single GOP with nothing behind it, so the
 * player arrives at the live edge with nothing to decode into.
 */
async function segmentsReady(signal, want = 2) {
  const top = await fetch(llhls(), { cache: 'no-store', signal });
  if (top.status !== 200) return { ok: false, status: top.status };
  const text = await top.text();
  const rel = text.split('\n').find((x) => x.trim() && !x.startsWith('#'));
  if (!rel) return { ok: false, status: 'no variants' };
  const media = new URL(rel.trim(), top.url || llhls()).toString();
  const child = await fetch(media, { cache: 'no-store', signal });
  if (child.status !== 200) return { ok: false, status: `child ${child.status}` };
  const body = await child.text();
  const segs = (body.match(/^#EXTINF:/gm) || []).length;
  return { ok: segs >= want, status: `${segs} segment(s)`, segs };
}

export async function waitForManifest({ timeoutMs = 90000, onTick, signal } = {}) {
  const t0 = Date.now();
  // Tie the poll to the page. Without this the loop kept fetching after
  // navigation and every in-flight request surfaced as net::ERR_ABORTED —
  // a leak that read as a page fault.
  const ac = new AbortController();
  const stop = () => ac.abort();
  addEventListener('pagehide', stop, { once: true });
  // And to the page's own stop. See the note on `waitForWhip` above: a visitor
  // who presses during the half minute this poll covers has not left.
  signal?.addEventListener('abort', stop, { once: true });
  for (let i = 0; Date.now() - t0 < timeoutMs && !ac.signal.aborted; i++) {
    try {
      const r = await segmentsReady(ac.signal);
      if (r.ok) {
        removeEventListener('pagehide', stop);
        return { ok: true, waitedMs: Date.now() - t0, segs: r.segs };
      }
      onTick?.({ status: r.status, waitedMs: Date.now() - t0 });
    } catch (e) {
      if (ac.signal.aborted) return { ok: false, aborted: true, waitedMs: Date.now() - t0 };
      onTick?.({ status: 'err', waitedMs: Date.now() - t0 });
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

/** Where a browser asks OUR worker to publish for it. The worker holds the key. */
export const WHIP_PROXY = 'https://pub.positron.studio/whip';

/**
 * Publish a MediaStream to the live input, WITHOUT ever seeing the credential.
 *
 * Cloudflare's WHIP publish URL carries the stream key in its path, so a public
 * page cannot hold it. The worker does, and proxies the handshake: one POST of
 * an offer, one answer. WHIP to Cloudflare is single-shot SDP with no trickle,
 * so that is the whole exchange — media then flows browser to Cloudflare
 * DIRECTLY over ICE/DTLS/SRTP and never touches the worker.
 *
 * Measured 2026-09-08 from a canvas: HTTP 201, connected/connected, 140 frames
 * and 511 KB sent in the first six seconds.
 *
 * `stop()` matters. The worker hands back an opaque id because Cloudflare's own
 * resource URL is ALSO credential-bearing; DELETE goes back through the worker.
 */
export async function whipPublish(stream, { log = () => {} } = {}) {
  const pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' });
  for (const t of stream.getTracks()) pc.addTrack(t, stream);
  pc.onconnectionstatechange = () => log(`publish ${pc.connectionState}`);

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  if (pc.iceGatheringState !== 'complete') {
    await new Promise((res) => {
      const t = setTimeout(res, 3000);
      pc.addEventListener('icegatheringstatechange', () => {
        if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); }
      });
    });
  }
  const res = await fetch(WHIP_PROXY, {
    method: 'POST',
    headers: { 'content-type': 'application/sdp' },
    body: pc.localDescription.sdp,
  });
  const body = await res.text();
  if (!res.ok) { pc.close(); throw new Error(`publish ${res.status}: ${body.slice(0, 120)}`); }
  const id = res.headers.get('x-whip-id');
  await pc.setRemoteDescription({ type: 'answer', sdp: body });
  log(`publishing · id ${id}`, 'hi');
  return {
    pc, id,
    async stop() {
      try { pc.close(); } catch { /* already */ }
      if (id) { try { await fetch(`${WHIP_PROXY}/${id}`, { method: 'DELETE' }); } catch { /* gone */ } }
    },
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
export async function whepPlay(url, video, { log = () => {}, onTrack } = {}) {
  const pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' });
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
  if (pc.iceGatheringState !== 'complete') {
    await new Promise((res) => {
      const t = setTimeout(res, 3000);
      pc.addEventListener('icegatheringstatechange', () => {
        if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); }
      });
    });
  }
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
