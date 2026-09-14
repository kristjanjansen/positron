// demo/shell/mp3-stream.mjs — an Icecast MP3 mount as an AudioNode, with no
// media element anywhere in it.
//
// 🔴 WHY THIS EXISTS, MEASURED RATHER THAN ASSUMED. `/radio1965/` played its
// station through `<audio>` and tapped it with `createMediaElementSource`. On an
// iPhone (iOS 18.7, Safari 26.6.1) that tap is silent: across a 50-second run
// the analyser read **0.0000 on every single line** while the element played
// happily (`paused:false, readyState:4, no error`) and the context ran at
// 48 kHz — and a 440 Hz oscillator through the SAME analyser read **0.33–0.80**.
// The graph can hear. WebKit does not route that element into it.
//
// Everything downstream inherits that silence: the granulator ran perfectly, at
// the right grain rate, on nothing. So the page decodes the bytes itself.
//
// ⚠️ THE BYTES WERE NEVER THE PROBLEM. The same page already fetches this mount
// to measure it, and that fetch passes on the phone — `the page could read the
// bytes (CORS) — 141 KiB in 5 s`. What was missing was turning them into
// samples without asking a media element to do it.
//
// ── the two decode paths, and why both ──────────────────────────────────────
//
// A. `AudioDecoder` (WebCodecs), one `EncodedAudioChunk` per MP3 frame. The
//    decoder keeps state across frames, so the output is continuous and there
//    is no seam anywhere. Preferred wherever it will configure.
// B. `decodeAudioData` over a GROUP of frames. Available everywhere, and the
//    reason it is the fallback rather than the choice: every decode starts cold,
//    so each block opens with the decoder's own start-up transient and the
//    blocks have to be butted together. It is a working stream with a seam
//    every so often, which is better than silence.
//
// Which one ran is REPORTED, never assumed — `stats().path`.
//
// ⚠️ NEITHER PATH RESAMPLES AND NEITHER NEEDS TO. An `AudioBuffer` carries its
// own sample rate and `AudioBufferSourceNode` resamples on playback, so a
// 44.1 kHz mount plays correctly into a 48 kHz context for free. Doing it by
// hand would be a pitch bug waiting to happen: 44100 samples fed to a 48000 Hz
// clock is 8.8% sharp, which sounds like a broken instrument rather than a
// broken assumption.

import { icyDemuxer } from './icy.mjs';
import { createFrameSplitter } from './mp3-frames.mjs';

/**
 * @param {AudioContext} ctx
 * @param {{url: string, blockMs?: number, floorMs?: number,
 *          onTitle?: (s: string) => void, log?: (s: string) => void}} opts
 * @returns {{node: GainNode, stats: () => object, stop: () => void,
 *            started: Promise<string>}}
 *   `node` is what the caller connects — to the speakers, to a granulator, or
 *   to both. `started` resolves with the path name once sound is actually
 *   scheduled, so a caller can wait for audio rather than for a fetch.
 */
export function createMp3Stream(ctx, { url, blockMs = 250, floorMs = 600, ceilingMs = 2500,
                                       onTitle = () => {}, log = () => {} } = {}) {
  const node = ctx.createGain();
  const splitter = createFrameSplitter();
  const st = {
    path: 'starting', rate: 1, bytes: 0, frames: 0, decoded: 0, blocks: 0,
    underruns: 0, skipped: 0, dropped: 0, errors: 0, sampleRate: 0, channels: 0, startedAt: 0,
  };
  let stopped = false, decoder = null, ac = null;
  /**
   * 🔴 VARISPEED, AND IT IS THE TAPE KIND: PITCH FOLLOWS SPEED. We schedule the
   * buffers ourselves, so this is one `playbackRate` — which is only true
   * because the media element is gone. It could not have been done at all while
   * WebKit owned the playback.
   *
   * ⚠️ AND A LIVE STREAM CANNOT SUSTAIN IT, WHICH IS THE INTERESTING PART.
   * Bytes arrive at exactly 1×. Below 1× the queue GROWS without bound — you
   * fall behind the station and stay behind, for ever, by construction. Above
   * 1× you consume faster than the wire delivers and run dry the moment the
   * cushion is spent; `underruns` is what says so. Neither is a bug to fix,
   * both are the price of the gesture, and the page shows both numbers rather
   * than hiding a limit it cannot remove.
   */
  let rate = 1;         // what the block being scheduled starts at
  let target = 1;        // where the listener asked to be
  const GLIDE = 1.10;    // per block, so the climb is a constant RATIO
  /**
   * 🔴 SIX MILLISECONDS OF CROSSFADE AT EVERY SEAM, AND IT IS NOT DECORATION.
   * Blocks are separate `AudioBufferSourceNode`s butted end to end, and three
   * things make that join discontinuous: each node resamples 44.1k into a 48k
   * context with its OWN interpolation phase, `playbackRate` is ramping across
   * the block, and the catch-up correction changes it per block. REPORTED as
   * "0.5 has real clicks in sound" — and MEASURED with `underruns: 0` through
   * the whole run, which is what rules out starvation and leaves the seam.
   *
   * ⚠️ A FADE WITHOUT AN OVERLAP WOULD BE WORSE. Fading each block in and out
   * in place guarantees continuity and digs an amplitude notch at every join —
   * four per second, heard as flutter. Overlapping means 6 ms where two
   * consecutive pieces sound together, which is a smear nobody can hear rather
   * than a click everybody can.
   */
  const XFADE = 0.006;
  /**
   * How far ahead the queue may run before arriving audio is DROPPED.
   * At 0.125x the queue grows about seven seconds per second, so without a
   * ceiling this schedules unbounded nodes and holds unbounded memory. Thirty
   * seconds is a generous window of slowed radio; past it the stream has to
   * give something up, and it says so.
   */
  const MAX_AHEAD = 30;
  const live = new Set();
  let pending = [];                  // Float32Array[channel][] awaiting a block
  let pendingLen = 0;                // frames (samples per channel) in `pending`
  let nextAt = 0;                    // context time the next block starts at
  let resolveStarted;
  const started = new Promise((r) => { resolveStarted = r; });

  /** Schedule one AudioBuffer end to end with whatever is already queued. */
  function schedule(buf) {
    if (stopped) return;
    // Past the ceiling there is nowhere to put this. Dropping ARRIVING audio
    // skips forward in the source; it does not leave a silence.
    if (nextAt - ctx.currentTime > MAX_AHEAD) { st.dropped++; return; }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    src.connect(g); g.connect(node);
    live.add(src);
    src.onended = () => { live.delete(src); try { g.disconnect(); } catch { /* gone */ } };


    // 🔴 THE CUSHION, AND RUNNING DRY IS A COUNTER RATHER THAN A GUESS.
    // If the queue has fallen behind the clock there is nothing to do but
    // restart ahead of it — but that is a DROPOUT, and this repo has already
    // paid for a playout that trimmed audio silently (`pcm-playout`, LESSONS
    // #52: bit-clean and still broken, because every stage that can discard
    // data needs a counter a page actually displays).
    const now = ctx.currentTime;
    if (nextAt < now + 0.01) {
      if (st.blocks) st.underruns++;
      // 🔴 A SMALL CUSHION ON RECOVERY, NOT THE STARTING ONE. This restarted at
      // `floorMs` (600 ms), so every late block tore a 600 ms hole in the sound
      // — and this page feeds the audio to a granulator whose ring RECORDS the
      // hole, which then gets granulated. Reported as "audio has holes,
      // granulator seems to operate on holes too". The opening cushion is for
      // building a queue from nothing; recovery just needs to be ahead of the
      // clock. ⚠️ The hole is not removed, only shortened — it is counted, and
      // `underruns` is the number to watch.
      nextAt = now + (st.blocks ? 0.08 : floorMs / 1000);
    }
    // 🔴 A LIVE STREAM MUST NOT ACCUMULATE LATENCY, AND THE BURST MAKES IT.
    // Icecast hands a new listener several seconds faster than realtime to prime
    // their buffer — MEASURED here at **4.55 s queued** after six seconds of
    // listening, and that never comes back on its own: from then on you are
    // four and a half seconds behind a live radio station for ever. Past the
    // ceiling the OLDEST audio is dropped and the clock moves up.
    //
    // ⚠️ IT IS COUNTED, because a stage that silently discards audio is exactly
    // the defect LESSONS #52 is about — a stream that measured bit-clean while
    // `pcm-playout` trimmed 15 ms mid-note, with no counter any page displayed.
    // 🔴 THE BURST IS TRIMMED DURING A START-UP WINDOW, NOT "BEFORE THE FIRST
    // BLOCK". Restricting it to `!st.blocks` looked right and never fired:
    // Icecast's several seconds arrive in the second AFTER the first block is
    // scheduled, so the cap was always asked too early. MEASURED: `buffered`
    // sat at **4.5 s for the whole run**, with `skipped: 0` — permanently that
    // far behind the station, and every speed change inaudible until 4.5 s of
    // already-scheduled audio had played out.
    //
    // ⚠️ Trimming LATER is what tears holes mid-listen, so the window is short
    // and closes for good. Inside it nobody is listening yet; outside it the
    // drift correction below does the work without dropping anything.
    const startingUp = !st.blocks || (ctx.currentTime - st.startedAt) < 4;
    if (startingUp && nextAt - now > ceilingMs / 1000) {
      st.skipped++;
      nextAt = now + floorMs / 1000;
    }
    // 🔴 THE SPEED CLIMBS, IT DOES NOT JUMP — and the arithmetic for it is
    // exact rather than approximate. Step this block's end rate a fixed RATIO
    // toward the target (a constant ratio is what reads as a smooth climb; a
    // constant increment crawls at the bottom and leaps at the top), then ramp
    // `playbackRate` linearly across the block.
    //
    // ⚠️ A RAMPING RATE BREAKS `duration / rate`, WHICH IS WHY THIS IS WORTH
    // WRITING DOWN. The wall time T to consume D seconds of media while the
    // rate goes linearly from r0 to r1 satisfies ∫rate dt = D, so
    // T·(r0+r1)/2 = D and **T = 2D/(r0+r1)**. That is exact, not a small-change
    // approximation — get it wrong and the queue drifts against the clock and
    // starts tearing the holes this file already has a section about.
    // 🔴 AND A STANDING QUEUE IS CORRECTED BY PLAYING FRACTIONALLY FASTER,
    // NEVER BY DROPPING. Once the start-up window has closed, any excess
    // latency is drained with a speed correction of at most 2% — far under the
    // ~6% where a pitch change becomes noticeable, and it costs no audio at all.
    // This is what every streaming player does and it is strictly better than a
    // hole: the listener loses nothing, they just catch up.
    const excess = (nextAt - now) - floorMs / 1000;
    const corr = startingUp ? 1
      : Math.max(0.99, Math.min(1.02, 1 + excess * 0.02));

    const r0 = rate;
    const want = target * corr;
    const r1 = want > r0 ? Math.min(want, r0 * GLIDE)
             : want < r0 ? Math.max(want, r0 / GLIDE)
             : r0;
    const T = (2 * buf.duration) / (r0 + r1);
    rate = r1;
    // ⚠️ REPORT WHAT WAS ASKED FOR, NOT THE CORRECTION. `rate` carries a
    // fraction of a percent of catch-up that nobody chose and nobody can hear;
    // printing it as the speed would make a control that reads 1.004 when the
    // listener pressed 1.
    st.rate = target;
    st.playing = Number(r1.toFixed(3));

    src.playbackRate.setValueAtTime(r0, nextAt);
    if (r1 !== r0) src.playbackRate.linearRampToValueAtTime(r1, nextAt + T);

    // in, hold, out — and the next block starts XFADE before this one ends
    const xf = Math.min(XFADE, T / 3);
    g.gain.setValueAtTime(st.blocks ? 0 : 1, nextAt);
    if (st.blocks) g.gain.linearRampToValueAtTime(1, nextAt + xf);
    g.gain.setValueAtTime(1, nextAt + T - xf);
    g.gain.linearRampToValueAtTime(0, nextAt + T);

    src.start(nextAt);
    nextAt += T - xf;
    st.blocks++;
    if (st.blocks === 1) { st.startedAt = nextAt; resolveStarted(st.path); }
  }

  /** Turn accumulated per-channel PCM into a block, at the STREAM's rate. */
  function flush(sampleRate) {
    if (!pendingLen || !pending.length) return;
    const channels = pending.length;
    const buf = ctx.createBuffer(channels, pendingLen, sampleRate);
    for (let c = 0; c < channels; c++) {
      const out = buf.getChannelData(c);
      let at = 0;
      for (const part of pending[c]) { out.set(part, at); at += part.length; }
    }
    pending = []; pendingLen = 0;
    schedule(buf);
  }

  function pushPcm(planes, sampleRate) {
    if (!pending.length) pending = planes.map(() => []);
    for (let c = 0; c < planes.length; c++) pending[c].push(planes[c]);
    pendingLen += planes[0].length;
    if (pendingLen >= (sampleRate * blockMs) / 1000) flush(sampleRate);
  }

  // ── path A: WebCodecs ─────────────────────────────────────────────────────
  async function tryWebCodecs(sampleRate, channels) {
    if (typeof AudioDecoder === 'undefined') return null;
    const config = { codec: 'mp3', sampleRate, numberOfChannels: channels };
    try {
      const sup = await AudioDecoder.isConfigSupported(config);
      if (!sup?.supported) return null;
    } catch { return null; }
    const dec = new AudioDecoder({
      output: (data) => {
        try {
          const n = data.numberOfFrames, ch = data.numberOfChannels;
          const planes = [];
          for (let c = 0; c < ch; c++) {
            const p = new Float32Array(n);
            // ⚠️ TWO SPELLINGS, because implementations disagree about whether
            // `format` may be omitted. `moq-audio.mjs` carries the same pair.
            try { data.copyTo(p, { planeIndex: c, format: 'f32-planar' }); }
            catch { data.copyTo(p, { planeIndex: c }); }
            planes.push(p);
          }
          st.decoded++;
          pushPcm(planes, data.sampleRate || sampleRate);
        } finally { data.close(); }
      },
      error: (e) => { st.errors++; log(`decoder: ${e.message}`); },
    });
    dec.configure(config);
    return dec;
  }

  // ── path B: decodeAudioData over a group of frames ────────────────────────
  // ⚠️ IT MUST START ON A SYNC. `decodeAudioData` refuses — or worse, silently
  // mis-decodes — a buffer that begins part-way through a frame, which is
  // exactly what an Icecast listener's first read is. The splitter guarantees
  // whole frames, so a group of them is a valid tiny MP3 file.
  const groupFrames = [];
  async function decodeGroup(sampleRate) {
    if (!groupFrames.length) return;
    const total = groupFrames.reduce((s, f) => s + f.length, 0);
    const blob = new Uint8Array(total);
    let at = 0;
    for (const f of groupFrames) { blob.set(f, at); at += f.length; }
    groupFrames.length = 0;
    try {
      // A COPY, because decodeAudioData may detach the buffer it is given.
      const buf = await ctx.decodeAudioData(blob.buffer.slice(0));
      st.decoded++;
      schedule(buf);
    } catch (e) { st.errors++; log(`decodeAudioData refused a block: ${e.message}`); }
  }

  // ── the socket ────────────────────────────────────────────────────────────
  (async () => {
    ac = new AbortController();
    let res;
    try {
      res = await fetch(url, {
        signal: ac.signal, cache: 'no-store', headers: { 'Icy-MetaData': '1' },
      });
    } catch (e) { st.errors++; log(`stream fetch failed: ${e.message}`); return; }
    if (!res.ok || !res.body) { st.errors++; log(`stream answered HTTP ${res.status}`); return; }

    const metaint = Number(res.headers.get('icy-metaint') || 0);
    // 🔴 THE AUDIO COMES OUT OF `onAudio`, AND IT DID NOT EXIST UNTIL THIS FILE
    // NEEDED IT. `icyDemuxer` returns void: both earlier callers wanted only the
    // station's text and let an `<audio>` element fetch the stream a SECOND time
    // for the sound, so the audio bytes were demuxed and dropped. MEASURED here
    // before it was added — 473,293 bytes read, the title decoded correctly, and
    // `frames: 0`, because `eat()` handed nothing back to decode.
    const audioParts = [];
    const eat = icyDemuxer(metaint, { onTitle, onAudio: (b) => audioParts.push(b) });
    const reader = res.body.getReader();

    while (!stopped) {
      let chunk;
      try { ({ value: chunk } = await reader.read()); } catch { break; }
      if (!chunk) break;
      st.bytes += chunk.length;
      // ⚠️ THE METADATA COMES OUT FIRST. `icy.mjs` splices 16-byte-aligned text
      // blocks INTO the audio, so feeding raw bytes to the frame splitter would
      // hand the decoder a title as if it were audio — a click every few
      // seconds, on a stream that is otherwise perfect.
      audioParts.length = 0;
      eat(chunk);
      if (!audioParts.length) continue;
      // ⚠️ ONE `push` PER RUN, in order. Concatenating them first would be a
      // copy for nothing; the splitter already carries a straddling tail, which
      // is the same job.
      const frames = [];
      for (const part of audioParts) frames.push(...splitter.push(part));

      for (const f of frames) {
        st.frames++;
        if (!st.sampleRate) {
          st.sampleRate = f.sampleRate; st.channels = f.channels;
          decoder = await tryWebCodecs(f.sampleRate, f.channels);
          st.path = decoder ? 'WebCodecs AudioDecoder' : 'decodeAudioData';
          log(`${st.path} · ${f.sampleRate} Hz · ${f.channels} ch · ${f.bitrate / 1000} kbps`);
        }
        if (decoder) {
          // A whole MP3 frame is a key frame for this purpose: every one can be
          // handed over on its own and the decoder carries its own state.
          decoder.decode(new EncodedAudioChunk({
            type: 'key',
            timestamp: Math.round((st.frames * f.samplesPerFrame * 1e6) / f.sampleRate),
            data: f.bytes,
          }));
        } else {
          groupFrames.push(f.bytes.slice());
          const ms = (groupFrames.length * f.samplesPerFrame * 1000) / f.sampleRate;
          if (ms >= blockMs) await decodeGroup(f.sampleRate);
        }
      }
      if (decoder && pendingLen) flush(st.sampleRate);
    }
    try { await reader.cancel(); } catch { /* an endless stream never ends */ }
  })();

  return {
    node,
    started,
    /**
     * 0.25 .. 2, and it takes effect AT ONCE.
     *
     * 🔴 SETTING THE RATE ALONE MADE THE CHANGE ARRIVE MINUTES LATER. A new rate
     * only applies to blocks scheduled AFTER it, and there is always a queue —
     * worse, at 0.25x every queued block takes four times as long to play, so
     * the backlog ahead of the change stretches with it. Reported as "changing
     * speeds taking forever", and it was: seconds of already-scheduled audio had
     * to drain at the OLD speed first, and at a slow rate that drain got slower.
     *
     * So the queue is thrown away and rebuilt. ⚠️ That is a deliberate
     * discontinuity — a click, and a small gap while the cushion refills — which
     * is the honest cost of a control that responds. A rate change the listener
     * cannot hear for ten seconds is not a control.
     */
    /**
     * Ask for a speed. The stream CLIMBS to it over about a second.
     *
     * 🔴 AN EARLIER VERSION SET THE RATE AND WAITED, AND THE CHANGE ARRIVED
     * MINUTES LATER. A new rate only applies to blocks scheduled after it, and
     * at 0.25x every queued block takes four times as long to drain — so the
     * backlog ahead of the change stretched with it. Reported as "changing
     * speeds taking forever", and it was.
     *
     * The fix after that threw the queue away, which worked and cost a click and
     * a gap. This one needs neither: the ramp is applied per block as the queue
     * is BUILT, so the only delay is the cushion — about half a second — and
     * what you hear is a tape coming up to speed rather than a cut.
     */
    setRate(r) {
      target = Math.max(0.1, Math.min(4, Number(r) || 1));
      st.target = target;
      return target;
    },
    stats: () => ({
      ...st,
      buffered: Math.max(0, nextAt - ctx.currentTime),
      pendingBytes: splitter.pending,
    }),
    stop() {
      stopped = true;
      try { ac?.abort(); } catch { /* already gone */ }
      try { decoder?.close(); } catch { /* already closed */ }
      try { node.disconnect(); } catch { /* already disconnected */ }
    },
  };
}
