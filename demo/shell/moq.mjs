// MoQ leg: browser publishes, Cloudflare's relay carries (draft-14), browser subscribes; both
// ends are hang (IETF moq-pub/sub do not interoperate). Facts in rig/moq/RUNBOOK.md 6-7;
// four of its five traps are marked TRAP n below. The vendor import is by slug, /moq/.
// why: lessons/kit-moq.md#header
import { Connection, Path, Broadcast, Container } from '/moq/moq-vendor.js';
import { ROW, burn, readBurned, hueFor } from './pattern.mjs';

export const MOQ_RELAY = 'https://draft-14.cloudflare.mediaoverquic.com';

/**
 * Can this browser reach the relay at all? Safari has WebTransport but @moq/net blocks it by
 * user agent, correctly (WebKit bug 319818 deadlocks after about 16 MiB); `?transport=force`
 * bypasses it to measure the bug. Cloudflare's relay has no WebSocket listener.
 * why: lessons/kit-moq.md#moq-support
 */
export function moqSupport() {
  const wt = typeof self !== 'undefined' && typeof self.WebTransport === 'function';
  const codecs = typeof self !== 'undefined' && typeof self.VideoEncoder !== 'undefined'
    && typeof self.VideoDecoder !== 'undefined';
  return {
    ok: wt && codecs,
    webTransport: wt,
    webCodecs: codecs,
    // Reported so a device can settle it: the library's error is the same for absent and UA-blocked.
    // why: lessons/kit-moq.md#webkit-tell
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
 * Our own WebTransport for a UA-blocked browser, only when forced and only on WebKit
 * (ManagedMediaSource is the tell); otherwise undefined and the library decides.
 * why: lessons/kit-moq.md#web-transport-for
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

// The pattern lives in pattern.mjs, shared with the ffmpeg publisher; re-exported for callers.
// why: lessons/kit-moq.md#pattern
export { ROW, burn, readBurned, hueFor };

/**
 * The publisher probes codecs in order rather than declaring vp8: Quest 3 and 3S do not
 * hardware-decode VP8 (AV1 they do). The MoQ numbers in HANDOFF are VP8: pass `codec: 'vp8'`.
 * why: lessons/kit-moq.md#codec-preference
 */
export const CODEC_PREFERENCE = [
  // AV1 first. Hardware-decoded on Quest 3/3S, and what NVIDIA's shipping
  // CloudXR.js picks for exactly these headsets. Two levels because an encoder
  // may refuse the higher one: 4.0 covers 1080p30, 3.1 covers 720p30.
  'av01.0.08M.08',
  'av01.0.05M.08',
  // VP9 next: hardware-decoded everywhere that matters and no worse than VP8.
  'vp09.00.10.08',
  // VP8 last, and it stays in the list because it is the one with a measurement
  // behind it. A fallback that has never run is not a fallback.
  'vp8',
];

/**
 * The first candidate this browser will encode, asked of `isConfigSupported`, never a user agent.
 * why: lessons/kit-moq.md#pick-codec
 */
async function pickCodec({ want, width, height, framerate, bitrate, log }) {
  const list = want ? [want] : CODEC_PREFERENCE;
  for (const codec of list) {
    const cfg = { codec, width, height, framerate, bitrate, latencyMode: 'realtime' };
    let sup = null;
    try { sup = await VideoEncoder.isConfigSupported(cfg); } catch { /* a bad string throws; try the next */ }
    if (sup?.supported) return { codec, cfg: sup.config ?? cfg };
    log(`${codec}: this browser will not encode it here`);
  }
  return null;
}

// @param out    canvas decoded frames are drawn into
// @param ns     namespace on the relay; unique per run, a second publisher on one dies
// @param role   'loopback' (publish and subscribe, one clock, exact latency), 'pub' or 'watch'
// @param paint  optional (ctx, w, h, frame) that draws the whole frame in place of the pattern
// @param hue    0..359 for the burned pattern, default a hash of the namespace
//
// The newest latency samples kept for `pct()`, so a long run cannot grow without limit.
// why: lessons/kit-moq.md#start-moq-params
const MOQ_KEEP = 2000;

/**
 * `signal` (an AbortSignal) stops it at any point, including the wait for the
 * catalog, which can take up to 25 tries of about 5 s before this resolves.
 */
export async function startMoq({ out, ns, role = 'loopback', w = 1280, h = 720, fps = 30, log = () => {}, forceTransport = false, hue = null, codec = null, paint = null, signal = null }) {
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
    // WHICH codec actually ran. The publisher probes, so this is a branch, and
    // a branch a harness cannot see is a branch nobody asserts.
    codec: null,
  };
  const samples = [];
  let sampled = 0;
  const timers = [];
  let closed = false, conn = null, encoder = null, decoder = null;
  const stop = () => {
    closed = true;
    timers.forEach(clearInterval);
    for (const c of [encoder, decoder]) { try { if (c && c.state !== 'closed') c.close(); } catch { /* already */ } }
    try { conn?.close?.(); } catch { /* already gone */ }
  };
  const aborted = new Promise((res) => {
    if (signal?.aborted) res('aborted');
    signal?.addEventListener('abort', () => res('aborted'), { once: true });
  });
  signal?.addEventListener('abort', stop, { once: true });
  if (signal?.aborted) { stop(); return api(); }

  const startedAt = performance.timeOrigin + performance.now();
  const t0 = performance.now();
  const relayUrl = new URL(MOQ_RELAY);
  const transport = await webTransportFor(relayUrl, forceTransport);
  if (transport) log('FORCED a self-built WebTransport. Expect a flow-control deadlock, WebKit 319818', 'bad');
  conn = await Connection.connect(relayUrl, {
    websocket: { enabled: false },
    ...(transport ? { transport } : {}),
  });
  if (closed) { stop(); return api(); }
  st.version = conn.version;
  st.sessionMs = Math.round(performance.now() - t0);
  log(`session in ${st.sessionMs}ms, negotiated ${st.version}`, 'hi');

  if (role !== 'watch') {
    const bc = new Broadcast.Producer();
    conn.publish(Path.from(ns), bc);
    st.published = true;

    // Decide the codec BEFORE the catalog, because the catalog is what tells the
    // far end what to configure. Publishing `vp8` and then encoding something
    // else is a decoder rejecting a stream that is perfectly fine.
    const pick = await pickCodec({ want: codec, width: w, height: h, framerate: fps, bitrate: 2_000_000, log });
    if (closed) return api();
    if (!pick) { log('no codec in the preference list can be encoded here', 'bad'); return api(); }
    st.codec = pick.codec;
    log(`encoding ${pick.codec}${codec ? ' (asked for)' : ''}`, 'hi');

    const catalog = {
      video: {
        renditions: {
          video: {
            codec: pick.codec, container: { kind: 'legacy' },
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

    encoder = new VideoEncoder({
      output: (chunk, metadata) => {
        // Carry the decoder description (AV1 and H.264 give it once, on the first chunk), or the far
        // end cannot parse the stream while the publisher looks healthy.
        // why: lessons/kit-moq.md#decoder-description
        const desc = metadata?.decoderConfig?.description;
        if (desc && !catalog.video.renditions.video.description) {
          const b = desc instanceof ArrayBuffer ? new Uint8Array(desc) : new Uint8Array(desc.buffer, desc.byteOffset, desc.byteLength);
          let bin = ''; for (const v of b) bin += String.fromCharCode(v);
          catalog.video.renditions.video.description = btoa(bin);
          catTrack.writeJson(catalog);            // republish at once, not in 2 s
          log(`catalog carries a ${b.length}-byte decoder description`);
        }
        try { prod.encode(chunk, chunk.timestamp, chunk.type === 'key'); st.encoded++; }
        catch (e) { st.encErrs++; log(`producer error ${String(e?.message ?? e).slice(0, 70)}`, 'bad'); }
      },
      error: (e) => { st.encErrs++; log(`encoder error ${String(e?.message ?? e).slice(0, 70)}`, 'bad'); },
    });
    encoder.configure(pick.cfg);

    let i = 0;
    timers.push(setInterval(() => {
      if (closed) return;
      // `paint` replaces the pattern whole: /moq/ passes testsrc2 under the
      // clock and /cam/ can pass a camera. Whatever it draws must still burn
      // the clock row, or every latency this page reports goes blank.
      if (paint) paint(sctx, w, h, i);
      else burn(sctx, w, h, i, { hue: patternHue });
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
        aborted,
      ]);
      if (r && r !== 'timeout' && r !== 'aborted' && !r.err) { group = r; break; }
      if (attempt === 0) log('waiting for the catalog to be announced');
      sub.close?.();
      await Promise.race([new Promise((res) => setTimeout(res, 1000)), aborted]);
    }
    if (closed) return api();
    if (!group) { log('catalog never arrived', 'bad'); return api(); }

    st.catalog = await group.readJson();
    const rends = st.catalog?.video?.renditions ?? {};
    const name = Object.keys(rends)[0];
    if (!name) { log('catalog carries no video rendition', 'bad'); return api(); }
    const rc = rends[name];
    log(`catalog ok · ${rc.codec} ${rc.codedWidth}x${rc.codedHeight} (${rc.container?.kind})`, 'hi');

    const vSub = bc.subscribe(name);
    const consumer = new Container.Consumer(vSub, { format: new Container.Legacy.Format(), latency: 0 });

    decoder = new VideoDecoder({
      output: (vf) => {
        const recv = performance.timeOrigin + performance.now();
        // Match the source size, never scale into ours: `readBurned` samples fixed coordinates.
        // why: lessons/kit-moq.md#match-source
        const fw = vf.displayWidth || vf.codedWidth, fh = vf.displayHeight || vf.codedHeight;
        if (fw && fh && (out.width !== fw || out.height !== fh)) {
          out.width = fw; out.height = fh;                     // this also CLEARS it
          out.style.aspectRatio = `${fw} / ${fh}`;
          log(`output sized to the source · ${fw}x${fh}`);
        }
        octx.drawImage(vf, 0, 0);
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
        else if (role === 'loopback') {
          sampled++;
          if (samples.push(recv - burned) > MOQ_KEEP) samples.shift();
        }
      },
      error: (e) => { st.decErrs++; log(`decode error ${String(e?.message ?? e).slice(0, 70)}`, 'bad'); },
    });
    const dcfg = { codec: rc.codec, optimizeForLatency: true };
    if (rc.description) dcfg.description = Uint8Array.from(atob(rc.description), (c) => c.charCodeAt(0));
    const ds = await VideoDecoder.isConfigSupported(dcfg);
    if (closed) return api();
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
      get stats() { return { ...st, samples: sampled }; },
      /** Rounded: sub-ms precision on a wall-clock delta is false precision. */
      pct(p) {
        if (!samples.length) return null;
        const s = samples.slice().sort((a, b) => a - b);
        return Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))] * 10) / 10;
      },
      stop,
    };
  }
  return api();
}
