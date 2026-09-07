// MoQ leg — browser publishes, Cloudflare's relay carries, browser subscribes.
//
// Everything here was measured before it was written; the source of truth is
// rig/moq/RUNBOOK.md §6-7. The load-bearing facts:
//
//  · A browser CAN speak IETF MoQT to Cloudflare today. @moq/net offers a compat
//    CLIENT_SETUP whose first varint (0x20) is byte-identical to draft-14's
//    CLIENT_SETUP type, offering [lite-02, lite-01, DRAFT_14]; CF picks
//    draft-14. Session in ~125 ms, verified on the wire (§6.2, §6.4).
//  · Video works end to end: 1280x720@30 sustained 90 s, glass-to-glass
//    p50 26.2 ms / p95 42.4 ms over n=2740 frames (§7.1).
//  · A relay CANNOT live in a Container — no public IP, no raw listeners, so
//    inbound QUIC is impossible. Only dial-out clients work (research/
//    cf-containers-2026-08.md). Hence browser-to-browser, not container.
//  · IETF moq-pub/moq-sub do NOT interoperate with hang: the catalog track name
//    (`catalog.json` vs `.catalog`), schema (hang RootSchema vs WARP) and
//    container declaration all differ. Both directions die at that one layer
//    (§7.2, §7.3). So both ends here are hang, which is what was proven.
//
// Four of the five traps from §7.1 are handled below and marked TRAP n. The
// fifth (fresh user-data-dir per headless run) belongs to the harness.
// `/moq/`, not `/08-moq/`: demos are addressed by SLUG now, and this import was
// left behind by that rename — a 404 that took the whole module down, so `moq`
// and `ladder` never reached __demo.ready at all. It escaped the build's own
// missing-import check because that check reads HTML files only, and this is a
// .mjs importing a .js.
import { Connection, Path, Broadcast, Container } from '/moq/moq-vendor.js';
import { ROW, burn, readBurned, hueFor } from './pattern.mjs';

export const MOQ_RELAY = 'https://draft-14.cloudflare.mediaoverquic.com';

/**
 * Can this browser reach the relay at all?
 *
 * CORRECTED TWICE on 2026-09-05. First I claimed Safari has no WebTransport;
 * that was wrong. Then I built a bypass on the assumption the library's block
 * was merely conservative; that was wrong too. What is actually true:
 *
 *  1. macOS Safari 26.6.2 HAS WebTransport and it connects. Asked directly,
 *     `new WebTransport('https://draft-14.cloudflare.mediaoverquic.com')`
 *     reached ready in 140 ms and created a bidirectional stream. WebTransport
 *     shipped in Safari 26.4 (24 Mar 2026) on macOS AND iOS.
 *  2. @moq/net blocks it by USER-AGENT, `bowser.satisfies({ safari: '<0' })`,
 *     which no Safari version can satisfy — a permanent blanket block.
 *  3. THE BLOCK IS CORRECT. Its source comment cites WebKit bug 319818:
 *     Safari's QUIC flow-control window never refills, so a session deadlocks
 *     after ~16 MiB or ~7,600 streams, whichever comes first. MoQ opens one
 *     stream per group, which reaches that in about two minutes.
 *     https://bugs.webkit.org/show_bug.cgi?id=319818 (NEW, P2, Aug 2026)
 *     Also open: 322201, `WebTransport.datagrams` undefined on iOS.
 *
 * Bypassing it reproduces the bug exactly. Measured here: connect 87 ms,
 * catalog fine, first frame at 0.79 s — then SIX frames total in 30 s and
 * nothing more. And it is not the encoder: Safari's WebCodecs does VP8 1280x720
 * at 370 fps (h264 72, vp9 345), so encoding had ~12x headroom.
 *
 * So the bypass is OPT-IN ONLY (`?transport=force` on demo 08), for measuring
 * the bug rather than for shipping. Default behaviour respects the block.
 *
 * The WebSocket route would work — qmux over WebSocket is a real draft
 * (draft-lcurley-qmux-websocket-00) and moq-relay implements a listener — but
 * CLOUDFLARE'S RELAY HAS NO WEBSOCKET LISTENER, so there is nothing to
 * negotiate with. Confirmed by handshake test (four failures out of four) and
 * by cloudflare/moq-rs documenting only WebTransport and raw QUIC. Note for any
 * retest: the correct subprotocols are the cross product, e.g.
 * `qmux-01.moq-lite-05`, NOT the bare `qmux-0N` I tried; and qmux-02 does not
 * exist. The conclusion is unchanged — no listener is no listener.
 *
 * The WebSocket fallback is separately useless here: @moq/net can map
 * https:->wss: with the qmux-02/01/00 subprotocols, but Cloudflare draft-14
 * refuses a WebSocket handshake outright — measured, all three subprotocols AND
 * no subprotocol, four failures out of four.
 */
export function moqSupport() {
  const wt = typeof self !== 'undefined' && typeof self.WebTransport === 'function';
  const codecs = typeof self !== 'undefined' && typeof self.VideoEncoder !== 'undefined'
    && typeof self.VideoDecoder !== 'undefined';
  return {
    ok: wt && codecs,
    webTransport: wt,
    webCodecs: codecs,
    // Reported so a device can SETTLE this. The library emits the same
    // "WebTransport not supported" message whether the API is absent OR merely
    // UA-blocked, so the error string alone cannot tell them apart — which is
    // how I came to assert iOS lacked it without ever checking.
    webkit: typeof self !== 'undefined' && !!self.ManagedMediaSource,
    why: !wt ? 'this browser has no WebTransport'
      : !codecs ? 'this browser has no WebCodecs'
      : null,
  };
}

/** The exact ALPN list @moq/net offers, so Safari negotiates as Chrome does. */
const MOQ_ALPN = [
  'moq-lite-05', 'moq-lite-04', 'moq-lite-03', 'moql',
  'moqt-19', 'moqt-18', 'moqt-17', 'moqt-16', 'moqt-15',
];

/**
 * A WebTransport we built ourselves, for browsers the library blocklists.
 *
 * OFF unless explicitly forced. Returns undefined otherwise, so the library
 * decides — which is what should happen, both because the block is well-founded
 * and because the library also handles the http:// certificate-fingerprint path
 * we do not. When forced, only WebKit-with-WebTransport takes this route:
 * ManagedMediaSource is the WebKit tell (Chrome lacks it), and Cloudflare
 * negotiates none of the ALPNs above anyway, falling back to the compat
 * CLIENT_SETUP — byte-identical to Chrome, just past the UA check.
 */
async function webTransportFor(url, force) {
  if (!force) return undefined;                    // the block is correct; see above
  if (typeof self === 'undefined' || typeof self.WebTransport !== 'function') return undefined;
  const webkit = !!self.ManagedMediaSource;
  if (!webkit) return undefined;
  const t = new self.WebTransport(url, {
    allowPooling: false,
    congestionControl: 'low-latency',
    protocols: MOQ_ALPN,
  });
  await t.ready;
  return t;
}

// The pattern used to be drawn here, in a copy of rig/whep/publish.html's
// loop. It now lives in ONE place — demo/shell/pattern.mjs — which also carries
// the ffmpeg rendering of the same spec, so the geometry cannot drift between a
// canvas publisher and an ffmpeg one. Re-exported because `moq` and `ladder`
// (and any future reader) know this module's name.
export { ROW, burn, readBurned, hueFor };

/**
 * Start a MoQ leg.
 *
 * @param out    canvas decoded frames are drawn into
 * @param ns     namespace on the relay. Unique per run: two publishers on one
 *               namespace and the second one dies (§6.4).
 * @param role   'loopback' (publish AND subscribe — one device, one clock, so
 *               the latency delta is exact), 'pub', or 'watch'.
 * @param hue    0..359 for the burned pattern. Defaults to a hash of the
 *               namespace, so two publishers on two devices come out different
 *               colours without anyone allocating them.
 */
export async function startMoq({ out, ns, role = 'loopback', w = 1280, h = 720, fps = 30, log = () => {}, forceTransport = false, hue = null }) {
  const patternHue = hue ?? hueFor(ns);
  const gop = fps;                                 // 1 s
  const src = document.createElement('canvas');
  src.width = w; src.height = h;
  const sctx = src.getContext('2d', { alpha: false, desynchronized: true });
  out.width = w; out.height = h;
  const octx = out.getContext('2d', { alpha: false, desynchronized: true, willReadFrequently: true });

  const st = {
    version: null, published: false, catalog: null, firstFrameMs: null,
    decoded: 0, wireFrames: 0, badRows: 0, decErrs: 0, encErrs: 0, encoded: 0,
  };
  const samples = [];
  const timers = [];
  let closed = false;

  const startedAt = performance.timeOrigin + performance.now();
  const t0 = performance.now();
  const relayUrl = new URL(MOQ_RELAY);
  const transport = await webTransportFor(relayUrl, forceTransport);
  if (transport) log('FORCED a self-built WebTransport — expect a flow-control deadlock, WebKit 319818', 'bad');
  const conn = await Connection.connect(relayUrl, {
    websocket: { enabled: false },
    ...(transport ? { transport } : {}),
  });
  st.version = conn.version;
  st.sessionMs = Math.round(performance.now() - t0);
  log(`session in ${st.sessionMs}ms, negotiated ${st.version}`, 'hi');

  if (role !== 'watch') {
    const bc = new Broadcast.Producer();
    conn.publish(Path.from(ns), bc);
    st.published = true;

    const catalog = {
      video: {
        renditions: {
          video: {
            codec: 'vp8', container: { kind: 'legacy' },
            codedWidth: w, codedHeight: h, framerate: fps, optimizeForLatency: true,
          },
        },
      },
    };
    const catTrack = bc.createTrack('catalog.json');
    catTrack.writeJson(catalog);
    // TRAP 1: the relay is live-edge only PER GROUP, and a write-once catalog is
    // a CLOSED group — a subscriber joining later gets nothing at all (measured:
    // 15 s timeout, §7.1). Republish every 2 s.
    timers.push(setInterval(() => catTrack.writeJson(catalog), 2000));

    // TRAP 3: hang's default trackInfo declares a large FETCH window, so a late
    // join triggers a multi-group replay blast. Cap the retention.
    const vTrack = bc.createTrack('video', Container.trackInfo({ latencyMax: 2000 }));
    const prod = new Container.Legacy.Producer(vTrack);

    const encoder = new VideoEncoder({
      output: (chunk) => {
        try { prod.encode(chunk, chunk.timestamp, chunk.type === 'key'); st.encoded++; }
        catch (e) { st.encErrs++; log(`producer error ${String(e?.message ?? e).slice(0, 70)}`, 'bad'); }
      },
      error: (e) => { st.encErrs++; log(`encoder error ${String(e?.message ?? e).slice(0, 70)}`, 'bad'); },
    });
    const cfg = { codec: 'vp8', width: w, height: h, framerate: fps, bitrate: 2_000_000, latencyMode: 'realtime' };
    const sup = await VideoEncoder.isConfigSupported(cfg);
    if (!sup.supported) { log('vp8 encode unsupported here', 'bad'); return api(); }
    encoder.configure(cfg);

    let i = 0;
    timers.push(setInterval(() => {
      if (closed) return;
      burn(sctx, w, h, i, { hue: patternHue, label: `moq ${ns}` });
      // Never queue behind a slow encoder: dropping a frame is cheaper than
      // letting the burned clock drift away from wall time, which would corrupt
      // the measurement rather than just thin it.
      if (encoder.encodeQueueSize > 3) return;
      const vf = new VideoFrame(src, { timestamp: Math.round(performance.now() * 1000) });
      encoder.encode(vf, { keyFrame: i % gop === 0 });
      vf.close();
      i++;
    }, 1000 / fps));
  }

  if (role !== 'pub') {
    const bc = conn.consume(Path.from(ns));

    // TRAP 2: a SUBSCRIBE for a not-yet-announced broadcast is REJECTED
    // (code=4 "Track not found"), not held — and CF has no SUBSCRIBE_NAMESPACE
    // on draft-14, so announced() would hang forever. Retry on a 1 s cadence.
    let group = null;
    for (let attempt = 0; attempt < 25 && !group && !closed; attempt++) {
      const sub = bc.subscribe('catalog.json');
      const r = await Promise.race([
        sub.nextGroup(),
        sub.closed.then((e) => ({ err: e })),
        new Promise((res) => setTimeout(() => res('timeout'), 4000)),
      ]);
      if (r && r !== 'timeout' && !r.err) { group = r; break; }
      if (attempt === 0) log('waiting for the catalog to be announced');
      sub.close?.();
      await new Promise((res) => setTimeout(res, 1000));
    }
    if (!group) { log('catalog never arrived', 'bad'); return api(); }

    st.catalog = await group.readJson();
    const rends = st.catalog?.video?.renditions ?? {};
    const name = Object.keys(rends)[0];
    if (!name) { log('catalog carries no video rendition', 'bad'); return api(); }
    const rc = rends[name];
    log(`catalog ok — ${rc.codec} ${rc.codedWidth}x${rc.codedHeight} (${rc.container?.kind})`, 'hi');

    const vSub = bc.subscribe(name);
    const consumer = new Container.Consumer(vSub, { format: new Container.Legacy.Format(), latency: 0 });

    const decoder = new VideoDecoder({
      output: (vf) => {
        const recv = performance.timeOrigin + performance.now();
        octx.drawImage(vf, 0, 0, w, h);
        vf.close();
        st.decoded++;
        if (st.firstFrameMs == null) {
          st.firstFrameMs = Math.round(recv - startedAt);
          log(`first frame after ${(st.firstFrameMs / 1000).toFixed(2)}s`, 'hi');
        }
        const burned = readBurned(octx);
        // Only a checksum-clean row is a measurement. In loopback both ends
        // share one clock, so the delta is exact rather than an estimate; in
        // watch mode the clocks are unrelated and the delta is meaningless.
        if (burned == null) st.badRows++;
        else if (role === 'loopback') samples.push(recv - burned);
      },
      error: (e) => { st.decErrs++; log(`decode error ${String(e?.message ?? e).slice(0, 70)}`, 'bad'); },
    });
    const dcfg = { codec: rc.codec, optimizeForLatency: true };
    if (rc.description) dcfg.description = Uint8Array.from(atob(rc.description), (c) => c.charCodeAt(0));
    const ds = await VideoDecoder.isConfigSupported(dcfg);
    if (!ds.supported) { log(`decoder rejects ${rc.codec}`, 'bad'); return api(); }
    decoder.configure(dcfg);

    (async () => {
      for (;;) {
        if (closed) return;
        const r = await consumer.next();
        if (r === undefined) { log('track closed'); return; }
        if (!r.frame) continue;                     // end of a group
        st.wireFrames++;
        // TRAP 5: a frame is {payload, timestamp}, not a bare Uint8Array
        decoder.decode(new EncodedVideoChunk({
          type: r.frame.keyframe ? 'key' : 'delta',
          timestamp: r.frame.timestamp,
          data: r.frame.payload,
        }));
      }
    })().catch((e) => { if (!closed) log(`reader stopped ${String(e?.message ?? e).slice(0, 70)}`, 'bad'); });
  }

  function api() {
    return {
      get version() { return st.version; },
      get stats() { return { ...st, samples: samples.length }; },
      /** Rounded: sub-ms precision on a wall-clock delta is false precision. */
      pct(p) {
        if (!samples.length) return null;
        const s = samples.slice().sort((a, b) => a - b);
        return Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))] * 10) / 10;
      },
      stop() {
        closed = true;
        timers.forEach(clearInterval);
        try { conn.close?.(); } catch { /* already gone */ }
      },
    };
  }
  return api();
}
