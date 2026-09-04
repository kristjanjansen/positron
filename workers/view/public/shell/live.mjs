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
 * Wait for the WHIP LEG, which is a different input from the HLS one.
 * 07 previously waited on the HLS manifest — a signal about input A while it
 * was about to play input B, so it asked for WHEP before the WHIP handshake had
 * finished and got a 409. The publisher's own status is the right signal.
 */
export async function waitForWhip({ timeoutMs = 90000, onTick } = {}) {
  const t0 = Date.now();
  const ac = new AbortController();
  const stop = () => ac.abort();
  addEventListener('pagehide', stop, { once: true });
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
export async function waitForManifest({ timeoutMs = 90000, onTick } = {}) {
  const t0 = Date.now();
  // Tie the poll to the page. Without this the loop kept fetching after
  // navigation and every in-flight request surfaced as net::ERR_ABORTED —
  // a leak that read as a page fault.
  const ac = new AbortController();
  const stop = () => ac.abort();
  addEventListener('pagehide', stop, { once: true });
  for (let i = 0; Date.now() - t0 < timeoutMs && !ac.signal.aborted; i++) {
    try {
      const r = await fetch(llhls(), { cache: 'no-store', signal: ac.signal });
      if (r.status === 200) { removeEventListener('pagehide', stop); return { ok: true, waitedMs: Date.now() - t0 }; }
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
