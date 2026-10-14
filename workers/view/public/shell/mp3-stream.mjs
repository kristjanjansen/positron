// demo/shell/mp3-stream.mjs: an Icecast mount (audio/mpeg or audio/aac) as an AudioNode,
// decoded here because iOS routes no <audio> element into the graph. WebCodecs first,
// decodeAudioData over frame groups as fallback (`stats().path`). No resampling needed.
// why: lessons/kit-mp3-stream.md#header

import { icyDemuxer } from './icy.mjs';
import { createFrameSplitter, framingFor } from './mp3-frames.mjs';

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
  // Built after the headers: the framing is the response's answer.
  // why: lessons/kit-mp3-stream.md#splitter-after-headers
  let splitter = null;
  const st = {
    path: 'starting', rate: 1, bytes: 0, frames: 0, decoded: 0, blocks: 0,
    underruns: 0, skipped: 0, dropped: 0, errors: 0, sampleRate: 0, channels: 0, startedAt: 0,
    // What is actually being read and decoded, reported rather than assumed:
    // 'mpeg' or 'adts', and the codec string the frame headers asked for.
    framing: '', codec: '',
  };
  /**
   * What the wire did, kept here so nobody opens a second connection to measure it.
   * `marks` holds only the first minute, so it stops growing on an endless stream.
   * why: lessons/kit-mp3-stream.md#wire
   */
  const MARK_SECONDS = 60;
  const wire = {
    status: 0, headers: {}, slots: 0, filled: 0,
    marks: [],            // [bytesSoFar, performance.now()] while marks are kept
    gaps: [],             // ms between consecutive reads
    gapMax: 0,
    openedAt: 0,          // performance.now() when the fetch was asked for
    firstByteAt: 0,       // and when the first byte landed
  };
  let stopped = false, decoder = null, ac = null;
  /**
   * Varispeed, the tape kind: pitch follows speed. A live stream cannot sustain it:
   * below 1x the queue grows, above 1x it runs dry (`underruns`).
   * why: lessons/kit-mp3-stream.md#varispeed
   */
  let rate = 1;         // what the block being scheduled starts at
  let target = 1;        // where the listener asked to be
  /**
   * Speed change as a ratio per second, independent of `blockMs`. At 16/s, 1x to 0.125x
   * glides in 0.75 s on top of the 600 ms cushion, which is shown (`arriveAt`), not cut.
   * why: lessons/kit-mp3-stream.md#glide-per-sec
   */
  const GLIDE_PER_SEC = 16;
  /**
   * Context time when the first block at the target speed sounds. 0 at rest, so a page
   * does not open with its rate button pulsing.
   * why: lessons/kit-mp3-stream.md#arrive-at
   */
  let arriveAt = 0;
  /**
   * 6 ms crossfade at every seam: blocks are separate nodes with their own resampling
   * phase and rate ramp. Overlapped, not faded in place, or each join dips.
   * why: lessons/kit-mp3-stream.md#xfade
   */
  const XFADE = 0.006;
  /**
   * How far ahead the queue may run before arriving audio is dropped (30 s; at 0.125x
   * the queue grows about 7 s per second).
   * why: lessons/kit-mp3-stream.md#max-ahead
   */
  const MAX_AHEAD = 30;
  const live = new Set();
  // Are we currently throwing arriving audio away to drain the start-up burst?
  // A latch rather than a bare comparison: without it the queue hovers AT the
  // ceiling for ever, because one drop puts it back under and the next block
  // puts it over again.
  let trimming = false;
  let pending = [];                  // Float32Array[channel][] awaiting a block
  let pendingLen = 0;                // frames (samples per channel) in `pending`
  let nextAt = 0;                    // context time the next block starts at
  let resolveStarted;
  const started = new Promise((r) => { resolveStarted = r; });

  /**
   * Schedule one AudioBuffer end to end with whatever is already queued.
   * `tailSec` is how much of the FRONT of this buffer is a repeat of the last
   * block's ending — see `flush`.
   */
  function schedule(buf, tailSec = 0) {
    if (stopped) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    src.connect(g); g.connect(node);
    live.add(src);
    src.onended = () => { live.delete(src); try { g.disconnect(); } catch { /* gone */ } };


    // Running dry restarts ahead of the clock, and it is counted (`underruns`).
    // why: lessons/kit-mp3-stream.md#cushion
    const now = ctx.currentTime;
    if (nextAt < now + 0.01) {
      if (st.blocks) st.underruns++;
      // Recovery restarts 80 ms ahead, not at `floorMs`: a granulator downstream records
      // every hole. The hole is shortened and counted, not removed.
      // why: lessons/kit-mp3-stream.md#recovery-cushion
      nextAt = now + (st.blocks ? 0.08 : floorMs / 1000);
    }
    // Icecast's start-up burst (4.55 s queued, measured) must not become permanent latency,
    // so it is trimmed, and counted, during a 4 s start-up window that then closes.
    // why: lessons/kit-mp3-stream.md#startup-burst
    const startingUp = !st.blocks || (ctx.currentTime - st.startedAt) < 4;
    // Trim by dropping what arrives, never by moving `nextAt` back (that replays scheduled
    // audio over itself). Past the ceiling it drains to the floor in one cut, once.
    // why: lessons/kit-mp3-stream.md#trim-by-dropping
    const ahead = nextAt - now;
    const ceiling = startingUp ? ceilingMs / 1000 : MAX_AHEAD;
    if (ahead > ceiling) {
      if (!trimming && !startingUp) {
        log(`${ahead.toFixed(0)} s behind the station · rejoining live`);
      }
      trimming = true;
    }
    // Drain all the way back to the floor, not merely under the ceiling —
    // stopping at the ceiling parks the listener that far behind for the rest of
    // the visit, which is the latency this block exists to remove.
    if (trimming && ahead > floorMs / 1000) {
      if (startingUp) st.skipped++; else st.dropped++;
      return;
    }
    trimming = false;
    // Step toward the target by a fixed ratio and ramp linearly across the block, so the
    // wall time is exactly T = 2D/(r0+r1). Standing latency is drained by at most 2% speed.
    // why: lessons/kit-mp3-stream.md#ramp
    const excess = (nextAt - now) - floorMs / 1000;
    const corr = startingUp ? 1
      : Math.max(0.99, Math.min(1.02, 1 + excess * 0.02));

    const r0 = rate;
    const want = target * corr;
    // This block's own wall length at the current rate is the time base.
    const glide = GLIDE_PER_SEC ** (buf.duration / Math.max(0.05, r0));
    const r1 = want > r0 ? Math.min(want, r0 * glide)
             : want < r0 ? Math.max(want, r0 / glide)
             : r0;
    const T = (2 * buf.duration) / (r0 + r1);
    // Media seconds scale into wall seconds by the same average rate.
    const toWall = (sec) => (2 * sec) / (r0 + r1);
    const xfIn = toWall(tailSec);
    const xfOut = toWall(tails ? XFADE : 0);
    rate = r1;
    // The glide is over when the clamp stops biting (`r1 === want`, exact). This block's
    // `nextAt` is when that speed starts to sound.
    // why: lessons/kit-mp3-stream.md#arrived
    if (r1 === want && arriveAt === Infinity) arriveAt = nextAt;
    // Report the asked speed, not the catch-up correction.
    // why: lessons/kit-mp3-stream.md#report-asked
    st.rate = target;
    st.playing = Number(r1.toFixed(3));

    src.playbackRate.setValueAtTime(r0, nextAt);
    if (r1 !== r0) src.playbackRate.linearRampToValueAtTime(r1, nextAt + T);

    // in over the repeated head, hold, out over the part the NEXT block repeats
    g.gain.setValueAtTime(xfIn ? 0 : 1, nextAt);
    if (xfIn) g.gain.linearRampToValueAtTime(1, nextAt + xfIn);
    if (xfOut) {
      g.gain.setValueAtTime(1, nextAt + T - xfOut);
      g.gain.linearRampToValueAtTime(0, nextAt + T);
    }

    src.start(nextAt);
    // The first block's start, not its end: `startedAt` means when sound began.
    // why: lessons/kit-mp3-stream.md#started-at
    if (!st.blocks) st.startedAt = nextAt;
    // The clock advances by the new media only; spending 6 ms of the station per seam
    // ran 2.4% fast and drained the cushion into holes.
    // why: lessons/kit-mp3-stream.md#advance-new-media
    nextAt += T - xfOut;
    st.blocks++;
    if (st.blocks === 1) resolveStarted(st.path);
  }

  /**
   * Turn accumulated per-channel PCM into a block, at the stream's rate. Each block opens
   * with a copy of the last one's ending, so the crossfade overlaps identical audio.
   * why: lessons/kit-mp3-stream.md#flush
   */
  let tails = false;                 // does this path repeat block endings?
  let tail = null;                   // Float32Array[channel], the last XFADE
  function flush(sampleRate) {
    if (!pendingLen || !pending.length) return;
    tails = true;
    const channels = pending.length;
    const xfS = Math.min(Math.round(XFADE * sampleRate), pendingLen);
    const head = tail && tail.length === channels ? tail[0].length : 0;
    const buf = ctx.createBuffer(channels, head + pendingLen, sampleRate);
    for (let c = 0; c < channels; c++) {
      const out = buf.getChannelData(c);
      let at = 0;
      if (head) { out.set(tail[c], 0); at = head; }
      for (const part of pending[c]) { out.set(part, at); at += part.length; }
    }
    // Keep this block's last xfS samples for the next one to open with.
    tail = [];
    for (let c = 0; c < channels; c++) {
      tail.push(buf.getChannelData(c).slice(buf.length - xfS));
    }
    pending = []; pendingLen = 0;
    schedule(buf, head / sampleRate);
  }

  function pushPcm(planes, sampleRate) {
    if (!pending.length) pending = planes.map(() => []);
    for (let c = 0; c < planes.length; c++) pending[c].push(planes[c]);
    pendingLen += planes[0].length;
    if (pendingLen >= (sampleRate * blockMs) / 1000) flush(sampleRate);
  }

  // ── path A: WebCodecs ─────────────────────────────────────────────────────
  // No `description`: without one, WebCodecs takes ADTS-framed AAC, which is what this
  // hands over (mp4a.40.2 at 44100/2 configures in Chrome).
  // why: lessons/kit-mp3-stream.md#webcodecs-no-description
  async function tryWebCodecs(codec, sampleRate, channels) {
    if (typeof AudioDecoder === 'undefined') return null;
    const config = { codec, sampleRate, numberOfChannels: channels };
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
  // It must start on a sync; the splitter gives whole frames, which are a valid file
  // in both framings.
  // why: lessons/kit-mp3-stream.md#decode-group
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
    wire.openedAt = performance.now();
    try {
      res = await fetch(url, {
        signal: ac.signal, cache: 'no-store', headers: { 'Icy-MetaData': '1' },
      });
    } catch (e) { st.errors++; log(`stream fetch failed: ${e.message}`); return; }
    wire.status = res.status;
    // The ICY fields exist only because the relay puts `access-control-expose-headers`
    // on them; read straight from Icecast a browser sees the response and not one
    // header of it.
    for (const k of ['icy-name', 'icy-description', 'icy-genre', 'icy-br',
                     'icy-metaint', 'content-type', 'x-shout-ttfb']) {
      const v = res.headers.get(k);
      if (v) wire.headers[k] = v;
    }
    if (!res.ok || !res.body) { st.errors++; log(`stream answered HTTP ${res.status}`); return; }

    // The framing comes off the response's content-type: the two share a sync word, so the
    // wrong scanner finds 0 frames. An unknown type means sniff, never guess.
    // why: lessons/kit-mp3-stream.md#framing
    const framing = framingFor(res.headers.get('content-type'));
    splitter = createFrameSplitter({ framing });
    st.framing = framing || 'sniffing';

    const metaint = Number(res.headers.get('icy-metaint') || 0);
    // The audio bytes come out of `icyDemuxer`'s `onAudio`.
    // why: lessons/kit-mp3-stream.md#on-audio
    const audioParts = [];
    const eat = icyDemuxer(metaint, {
      onTitle,
      onAudio: (b) => audioParts.push(b),
      // How many metadata slots went by and how many carried text. A stream that
      // never changes its title fills almost none of them, which is a fact about
      // the station rather than about the reader.
      onSlot: () => { wire.slots++; },
      onMeta: () => { wire.filled++; },
    });
    const reader = res.body.getReader();
    let lastRead = 0;

    while (!stopped) {
      let chunk;
      try { ({ value: chunk } = await reader.read()); } catch { break; }
      if (!chunk) break;
      const at = performance.now();
      if (!wire.firstByteAt) { wire.firstByteAt = at; lastRead = at; }
      else {
        const gap = at - lastRead;
        lastRead = at;
        if (gap > wire.gapMax) wire.gapMax = gap;
        if (wire.gaps.length < 4096) wire.gaps.push(gap);
      }
      st.bytes += chunk.length;
      if (at - wire.firstByteAt <= MARK_SECONDS * 1000) wire.marks.push([st.bytes, at]);
      // Metadata comes out first: ICY splices text into the audio, which would click.
      // why: lessons/kit-mp3-stream.md#metadata-first
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
          st.framing = splitter.framing;
          st.codec = f.codec;
          decoder = await tryWebCodecs(f.codec, f.sampleRate, f.channels);
          st.path = decoder ? 'WebCodecs AudioDecoder' : 'decodeAudioData';
          // Rounded: AAC has no bitrate field, so this is derived from a frame and wobbles.
          // why: lessons/kit-mp3-stream.md#rate-rounded
          log(`${st.path} · ${f.codec} · ${f.sampleRate} Hz · ${f.channels} ch`
            + ` · ${Math.round(f.bitrate / 1000)} kbps`);
        }
        if (decoder) {
          // A whole frame is a key frame for this purpose, in both framings:
          // every one can be handed over on its own and the decoder carries its
          // own state across them.
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
     * Ask for a speed. The stream climbs to it, ramped per block as the queue is built,
     * so the only delay is the cushion (about half a second).
     * why: lessons/kit-mp3-stream.md#set-rate
     */
    setRate(r) {
      // The floor is 0.05 so 0.0625 is not silently clamped to another speed.
      // why: lessons/kit-mp3-stream.md#rate-floor
      const was = target;
      target = Math.max(0.05, Math.min(4, Number(r) || 1));
      st.target = target;
      // Only on a real change, since this is also called from a poll.
      // why: lessons/kit-mp3-stream.md#rearm
      if (target !== was) arriveAt = Infinity;
      return target;
    },
    stats: () => ({
      ...st,
      buffered: Math.max(0, nextAt - ctx.currentTime),
      pendingBytes: splitter ? splitter.pending : 0,
      // `arriveIn` is null while the glide runs: the answer is not known yet.
      // why: lessons/kit-mp3-stream.md#settling
      settling: ctx.currentTime < arriveAt,
      arriveIn: Number.isFinite(arriveAt) ? Math.max(0, arriveAt - ctx.currentTime) : null,
    }),
    /**
     * What the connection did: status, ICY headers, arrival gaps and byte marks. No rate
     * here: an early mean measures the start-up burst (185 kbps on a 128 kbps mount).
     * why: lessons/kit-mp3-stream.md#wire-stats
     */
    wire: () => ({ ...wire, marks: wire.marks.slice(), gaps: wire.gaps.slice() }),
    stop() {
      stopped = true;
      try { ac?.abort(); } catch { /* already gone */ }
      try { decoder?.close(); } catch { /* already closed */ }
      try { node.disconnect(); } catch { /* already disconnected */ }
    },
  };
}
