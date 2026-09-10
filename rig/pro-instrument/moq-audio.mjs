// The MoQ audio return, extracted from proto/jam's measured rig (session 6i,
// 35.8 ms key->ear against WebRTC's 77.7).
//
// WHY IT IS FASTER, in one line: WebRTC's cushion is NetEQ's and cannot be
// hinted away -- it clamps at 20 ms and forcing it destabilises. Here the
// playout floor is OURS, so latency is a number you choose: the measured curve
// maps floor ~1:1 into latency (10 -> 36 ms, 40 -> 66 ms).
//
// Reused rather than rewritten: /proto/jam/moq/www/moq-synth.js (the relay
// wrapper) and /proto/jam/playout-worklet.js (pcm-capture tap + pcm-playout
// ring with an underrun-counting floor).

export const MOQ_RELAY = 'https://draft-14.cloudflare.mediaoverquic.com';
const WORKLET = '/proto/jam/playout-worklet.js';
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
 * Publish `bus` to the relay under `ns`. Returns { stats(), close() }.
 * `msDest` must be a MediaStreamDestination fed by the same graph — see the
 * pacer note below; without it a HEADLESS context free-runs in bursts and the
 * subscriber starves through every retry while everything reports healthy.
 */
export async function publishSynth({ ac, bus, msDest, ns, relay = MOQ_RELAY, groupMs = 50, log = () => {} }) {
  await import('/proto/jam/moq/www/moq-synth.js');
  await ac.audioWorklet.addModule(WORKLET);

  // REALTIME PACING PIN. A headless AudioContext with nothing pulling it renders
  // in bursts (measured 0.2-2.9 s stalls then catch-up), which the capture tap
  // faithfully reproduces and the subscriber sees as starvation. A muted element
  // consuming the stream restores the realtime pull. One element for the page's
  // life: a per-arm one that got paused left the SECOND run with no puller at
  // all and zero groups on the wire.
  const pacer = new Audio();
  pacer.srcObject = msDest.stream;
  pacer.muted = true;
  pacer.play().catch((e) => log('pacer play failed: ' + e.message));

  const pub = await window.MoqSynth.publisher(relay, ns, { withVideo: false });
  log(`moq publishing "${ns}" (relay version ${pub.version ?? '?'})`);

  const cfg = await pickOpus();
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

  // Tap the synth bus. 128-frame quanta; media timestamps are anchored ONCE off
  // the first quantum's context time and then advanced by exact sample count --
  // re-anchoring per quantum would inject the main thread's jitter into the
  // timeline the decoder reads.
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
    close() { try { enc.close(); } catch {} try { pub.close(); } catch {} try { pacer.pause(); } catch {} },
  };
}

/**
 * Subscribe to `ns` and play it out through our OWN ring, whose floor is the
 * latency dial WebRTC does not give you. Returns { node, stats(), close() };
 * `node` is the playout worklet, already connected to the destination, so a
 * caller can tap it for onset detection.
 */
export async function subscribeSynth({ ac, ns, relay = MOQ_RELAY, floorMs = 10, log = () => {} }) {
  await import('/proto/jam/moq/www/moq-synth.js');
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
      if (meta) st.transitMs.push((nowUs() - meta.sendUs) / 1000);
    },
    error: (e) => log('decoder: ' + e.message),
  });
  dec.configure({ codec: 'opus', sampleRate: 48000, numberOfChannels: 1 });

  out.port.onmessage = (e) => { if (e.data?.underruns != null) st.underruns = e.data.underruns; };

  const sub = await window.MoqSynth.subscriber(relay, ns, {
    log,
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
