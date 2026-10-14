// demo/shell/moq-audio.mjs: the MoQ audio return from proto/jam (35.8 ms key to ear against
// WebRTC's 77.7). The playout floor is ours, so latency is chosen: 10 -> 36 ms, 40 -> 66 ms.
// why: lessons/kit-moq-audio.md#header

export const MOQ_RELAY = 'https://draft-14.cloudflare.mediaoverquic.com';

/**
 * Connection options for a relay on the LAN. A browser will accept a
 * self-signed certificate for WebTransport if the page PINS it -- but Chrome
 * requires ECDSA P-256 and validity <= 14 DAYS, which is why the repo's old
 * ten-year auto.crt was refused with an error that never mentions validity.
 * `rig/m1/lan-relay.sh cert` mints a 10-day one and prints this hash.
 */
export function pinned(sha256hex) {
  const value = Uint8Array.from(sha256hex.match(/../g).map((h) => parseInt(h, 16)));
  return { webtransport: { serverCertificateHashes: [{ algorithm: 'sha-256', value }] } };
}
const WORKLET = '/proto/jam/playout-worklet.js';
/** The newest transit samples kept for the percentiles. */
export const MOQ_AUDIO_KEEP = 2000;
// The relay wrapper is a classic script that sets window.MoqSynth.
const loadWrapper = () => (window.MoqSynth ? null : import('/proto/jam/moq/www/moq-synth.js'));
const nowUs = () => (performance.timeOrigin + performance.now()) * 1000;

/** Opus, lowest delay the browser will actually accept. */
async function pickOpus(preferUs = 5000) {
  const base = { codec: 'opus', sampleRate: 48000, numberOfChannels: 1, bitrate: 64000 };
  const cands = [
    { ...base, opus: { frameDuration: preferUs, application: 'lowdelay', useinbandfec: false, usedtx: false } },
    { ...base, opus: { frameDuration: preferUs } },
    { ...base, opus: { frameDuration: 10000, application: 'lowdelay' } },
    base,
  ];
  for (const c of cands) {
    try { if ((await AudioEncoder.isConfigSupported(c)).supported) return c; } catch { /* next */ }
  }
  throw new Error('no opus AudioEncoder config supported');
}

/**
 * Publish `bus` to the relay under `ns`. Returns { stats(), close() }. `msDest` must be fed by the
 * same graph (the pacer). groupMs 200 is measured: 0.0% loss on both relays against 50 ms's
 * 0.8 to 2.2%, and the fastest Cloudflare config.
 * why: lessons/kit-moq-audio.md#publish-synth
 */
export async function publishSynth({ ac, bus, msDest, ns, relay = MOQ_RELAY, groupMs = 200, latencyMax = 100, frameUs = 5000, connect = null, log = () => {} }) {
  await loadWrapper();
  await ac.audioWorklet.addModule(WORKLET);

  // A muted element pulls the stream so a headless context renders in realtime, not in bursts
  // (0.2 to 2.9 s stalls). One for the page's life: a paused per-arm one left the second run silent.
  // why: lessons/kit-moq-audio.md#pacer
  const pacer = new Audio();
  pacer.srcObject = msDest.stream;
  pacer.muted = true;
  pacer.play().catch((e) => log('pacer play failed: ' + e.message));

  // The window the relay retains; at the wrapper's 2000 ms default a late joiner hears everything
  // two seconds old.
  // why: lessons/kit-moq-audio.md#latency-max
  const pub = await window.MoqSynth.publisher(relay, ns, { withVideo: false, latencyMax, connect });
  log(`moq publishing "${ns}" (relay ${pub.version ?? '?'}, retains ${latencyMax} ms)`);

  const cfg = await pickOpus(frameUs);
  const st = { seq: 0, published: 0, bytes: 0, errors: 0, frameUs: cfg.opus?.frameDuration ?? 20000 };
  let groupStart = null;

  const enc = new AudioEncoder({
    output: (chunk) => {
      try {
        // 12-byte header: seq (u32) + send instant in epoch microseconds (f64).
        // The receiver needs the send stamp to attribute transit; the relay
        // never re-stamps anything, so this is the only clock in the payload.
        const out = new Uint8Array(12 + chunk.byteLength);
        const dv = new DataView(out.buffer);
        dv.setUint32(0, st.seq, true);
        dv.setFloat64(4, nowUs(), true);
        chunk.copyTo(out.subarray(12));
        const key = groupStart === null || chunk.timestamp - groupStart >= groupMs * 1000;
        if (key) groupStart = chunk.timestamp;
        pub.audioWrite(out, chunk.timestamp, key);
        st.seq++; st.published++; st.bytes += out.byteLength;
      } catch (e) { if (++st.errors < 5) log('audioWrite: ' + e.message); }
    },
    error: (e) => log('encoder: ' + e.message),
  });
  enc.configure(cfg);

  // Tap the synth bus in 128-frame quanta; timestamps anchor once and advance by sample count,
  // so main-thread jitter never enters the timeline.
  // why: lessons/kit-moq-audio.md#capture-tap
  const cap = new AudioWorkletNode(ac, 'pcm-capture', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
  const sink = ac.createGain(); sink.gain.value = 0;
  bus.connect(cap); cap.connect(sink).connect(ac.destination);

  let anchorUs = null, samples = 0;
  cap.port.onmessage = (e) => {
    const { ct, pcm } = e.data;
    if (!pcm) return;
    if (anchorUs === null) anchorUs = nowUs() - (ac.currentTime - ct) * 1e6;
    const tsUs = Math.round(anchorUs + (samples / ac.sampleRate) * 1e6);
    samples += pcm.length;
    try {
      enc.encode(new AudioData({
        format: 'f32', sampleRate: ac.sampleRate, numberOfFrames: pcm.length,
        numberOfChannels: 1, timestamp: tsUs, data: pcm,
      }));
    } catch (err) { if (++st.errors < 5) log('encode: ' + err.message); }
  };

  return {
    ns,
    stats: () => ({ ...st, used: pub.used?.(), queue: enc.encodeQueueSize }),
    close() {
      // The tap goes too, or each publish leaves a node feeding a closed encoder.
      cap.port.onmessage = null;
      try { bus.disconnect(cap); } catch {} try { cap.disconnect(); } catch {} try { sink.disconnect(); } catch {}
      try { enc.close(); } catch {} try { pub.close(); } catch {} try { pacer.pause(); } catch {}
    },
  };
}

/**
 * Subscribe to `ns` and play it out through our OWN ring, whose floor is the
 * latency dial WebRTC does not give you. Returns { node, stats(), close() };
 * `node` is the playout worklet, already connected to the destination, so a
 * caller can tap it for onset detection.
 */
export async function subscribeSynth({ ac, ns, relay = MOQ_RELAY, floorMs = 10, connect = null, log = () => {} }) {
  await loadWrapper();
  await ac.audioWorklet.addModule(WORKLET);

  const out = new AudioWorkletNode(ac, 'pcm-playout', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] });
  out.connect(ac.destination);
  out.port.postMessage({ cmd: 'floor', ms: floorMs, adaptive: false });

  const st = { frames: 0, decoded: 0, bytes: 0, underruns: 0, lastSeq: -1, gaps: 0, transitMs: [] };
  // The decoder emits in input order, so a FIFO carries each chunk's send stamp
  // through it. Reading a stamp off the AudioData itself would give the MEDIA
  // timestamp, which says when the sound was made and not when it travelled.
  const fifo = [];
  const dec = new AudioDecoder({
    output: (data) => {
      const meta = fifo.shift();
      const pcm = new Float32Array(data.numberOfFrames);
      try { data.copyTo(pcm, { planeIndex: 0, format: 'f32-planar' }); }
      catch { data.copyTo(pcm, { planeIndex: 0 }); }
      data.close();
      out.port.postMessage({ pcm }, [pcm.buffer]);
      st.decoded++;
      if (meta && st.transitMs.push((nowUs() - meta.sendUs) / 1000) > MOQ_AUDIO_KEEP) st.transitMs.shift();
    },
    error: (e) => log('decoder: ' + e.message),
  });
  dec.configure({ codec: 'opus', sampleRate: 48000, numberOfChannels: 1 });

  out.port.onmessage = (e) => { if (e.data?.underruns != null) st.underruns = e.data.underruns; };

  const sub = await window.MoqSynth.subscriber(relay, ns, {
    log, connect,
    onAudio: ({ payload, tsUs }) => {
      if (!payload || payload.byteLength <= 12) return;
      const dv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
      const seq = dv.getUint32(0, true), sendUs = dv.getFloat64(4, true);
      // seq only earns its place if it can see a loss; on this path it can,
      // because a relay under its caps drops silently and says nothing.
      if (st.lastSeq >= 0 && seq !== st.lastSeq + 1) st.gaps += Math.max(0, seq - st.lastSeq - 1);
      st.lastSeq = seq;
      st.frames++; st.bytes += payload.byteLength;
      fifo.push({ seq, sendUs });
      dec.decode(new EncodedAudioChunk({
        type: 'key', timestamp: tsUs, data: payload.subarray(12),
      }));
    },
  });
  log(`moq subscribed "${ns}" (relay version ${sub.version ?? '?'})`);

  return {
    node: out,
    stats() {
      const t = [...st.transitMs].sort((a, b) => a - b);
      const q = (p) => (t.length ? t[Math.min(t.length - 1, Math.floor((p / 100) * t.length))] : NaN);
      return { ...st, transitP50: q(50), transitP95: q(95), floorMs };
    },
    close() { try { dec.close(); } catch {} try { sub.close(); } catch {} },
  };
}
