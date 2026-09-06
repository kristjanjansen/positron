// rig/shout/measure.mjs — what a SHOUTcast/Icecast listen actually costs,
// direct against the origin and through the Cloudflare relay, at the same time.
//
//   node rig/shout/measure.mjs 60 https://icecast.err.ee/raadiotallinn.mp3 https://shout.positron.studio/raadiotallinn.mp3
//   node rig/shout/measure.mjs 60 --out results/shout-2026-09-06.json <url> <url>
//
// THE ONE MEASUREMENT WORTH THE TROUBLE is the last one: how much later the
// SAME AUDIO BYTE arrives through Cloudflare. TTFB says nothing about it (a
// burst-on-connect can make the slower path look faster), and playing both and
// listening says nothing you can write down. Icecast hands every listener the
// same MP3 frames, and the relay does not transcode, so the two byte streams
// are identical apart from where each connection happened to start. Take a
// needle out of one, find it in the other, and the difference between the two
// arrival timestamps of that exact byte IS the added latency — no clock sync,
// no correlation window, no assumptions about the encoder.
//
// Everything else here is the context that number needs to be honest in:
// a burst that hides a stall, a mean bitrate that hides a gap.

const args = process.argv.slice(2);
let out = null;
const oi = args.indexOf('--out');
if (oi >= 0) { out = args[oi + 1]; args.splice(oi, 2); }
const seconds = Number(args[0]) || 60;
const urls = args.slice(1);
if (!urls.length) { console.error('usage: measure.mjs <seconds> [--out f.json] <url> [url…]'); process.exit(1); }

// A needle in the middle of the run: past the burst (which is a different
// amount of already-buffered audio per connection, not latency) and far enough
// from the end that the other stream has certainly received it too.
const NEEDLE_AT = 0.55;
const NEEDLE_LEN = 16384;
// A listener with a one-second jitter buffer stalls on a gap longer than this.
const UNDERRUN_MS = 1000;
// 128 kbps MP3 = 16 000 bytes of audio per second of wall clock.
const NOMINAL_BPS = 16000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tap(url) {
  const rec = {
    url, ok: false, error: null, status: 0, headers: {},
    ttfbMs: null, firstByteMs: null, burst250: 0, bytes: 0, chunks: 0,
    gaps: [], marks: [],           // marks: [byteOffsetAtChunkEnd, arrivalMs]
  };
  const parts = [];
  const ctrl = new AbortController();
  const t0 = performance.now();
  const timer = setTimeout(() => ctrl.abort(), seconds * 1000);
  try {
    // No `Icy-MetaData` on purpose: metadata blocks are spliced INTO the byte
    // stream every icy-metaint bytes, so asking for it on one path and not the
    // other would make the two byte streams differ and the needle never match.
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'positron-rig/1' } });
    rec.ttfbMs = performance.now() - t0;
    rec.status = res.status;
    for (const [k, v] of res.headers) if (/^(icy-|content-type|x-shout)/i.test(k)) rec.headers[k] = v;
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    let last = performance.now();
    for await (const chunk of res.body) {
      const now = performance.now();
      if (rec.firstByteMs === null) rec.firstByteMs = now - t0;
      else rec.gaps.push(now - last);
      last = now;
      // Burst measured from the FIRST BYTE, not from the request: with a
      // 250 ms TTFB the whole window closed before anything arrived and every
      // stream reported a burst of zero.
      if (rec.firstByteMs != null && (now - t0) - rec.firstByteMs <= 250) rec.burst250 += chunk.byteLength;
      rec.bytes += chunk.byteLength;
      rec.chunks++;
      parts.push(Buffer.from(chunk));
      rec.marks.push([rec.bytes, now - t0]);
    }
    rec.ok = true;
  } catch (e) {
    // The abort at `seconds` is the normal end of a stream that never ends.
    if (e.name === 'AbortError' || e.cause?.name === 'AbortError') rec.ok = true;
    else rec.error = `${e.name}: ${e.message}`;
  } finally {
    clearTimeout(timer);
  }
  rec.buf = Buffer.concat(parts);
  return rec;
}

/** arrival time (ms since that tap's own start) of the byte at `offset` */
function arrivalOf(rec, offset) {
  // marks are (bytes-received-so-far, when) per chunk: the first mark at or
  // past the offset is the chunk that carried that byte.
  let lo = 0, hi = rec.marks.length - 1;
  if (!rec.marks.length || offset > rec.marks[hi][0]) return null;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (rec.marks[mid][0] < offset) lo = mid + 1; else hi = mid; }
  return rec.marks[lo][1];
}

const pct = (a, p) => (a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : null);
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);

// Concurrently, and started in the same tick: the alignment below compares
// wall-clock arrival across taps, so anything that staggers the starts shows up
// as latency that nobody paid.
const startedAt = Date.now();
const recs = await Promise.all(urls.map(tap));

const report = { at: new Date(startedAt).toISOString(), seconds, streams: [], pairs: [] };
for (const rec of recs) {
  const secs = rec.bytes && rec.marks.length ? rec.marks.at(-1)[1] / 1000 : 0;
  report.streams.push({
    url: rec.url, ok: rec.ok, error: rec.error, status: rec.status, headers: rec.headers,
    ttfbMs: r2(rec.ttfbMs), firstByteMs: r2(rec.firstByteMs),
    burstKiB250ms: r2(rec.burst250 / 1024),
    bytes: rec.bytes, chunks: rec.chunks,
    kbps: r2((rec.bytes * 8) / 1000 / (secs || 1)),
    gapP50: r2(pct(rec.gaps, 0.5)), gapP95: r2(pct(rec.gaps, 0.95)), gapMax: r2(pct(rec.gaps, 1)),
    underruns: rec.gaps.filter((g) => g > UNDERRUN_MS).length,
    // Icecast sends FASTER than realtime on connect to prime the listener's
    // buffer. This is how much audio you are holding beyond what has actually
    // elapsed — the reason a stream can read 152 kbps at a nominal 128.
    aheadOfRealtimeS: r2(rec.bytes / (NOMINAL_BPS) - secs),
  });
}

for (let i = 1; i < recs.length; i++) {
  const a = recs[0], b = recs[i];
  const pair = { from: a.url, to: b.url, addedMs: null, why: null };
  if (a.buf.length < NEEDLE_LEN * 3 || b.buf.length < NEEDLE_LEN * 3) {
    pair.why = 'not enough bytes to align';
  } else {
    const at = Math.floor(a.buf.length * NEEDLE_AT);
    const needle = a.buf.subarray(at, at + NEEDLE_LEN);
    const found = b.buf.indexOf(needle);
    if (found < 0) pair.why = 'needle not found — the two paths are not the same bytes';
    else {
      const ta = arrivalOf(a, at + NEEDLE_LEN);
      const tb = arrivalOf(b, found + NEEDLE_LEN);
      pair.addedMs = r2(tb - ta);
      pair.needleAtA = at; pair.foundAtB = found;
      // Part of `addedMs` is paid ONCE at connect and part is paid on every
      // byte. Splitting them is the difference between "the relay is slow to
      // answer" and "the relay carries audio late", which have different fixes.
      pair.ttfbDeltaMs = r2(b.ttfbMs - a.ttfbMs);
      pair.carriedMs = r2((tb - ta) - (b.ttfbMs - a.ttfbMs));
      // How far apart the two connections started in the stream. Icecast bursts
      // a few seconds of already-encoded audio on connect, and two listeners
      // rarely get the same amount, so this is NOT latency — it is where each
      // one was handed the microphone. Reported so nobody reads it as latency.
      pair.startSkewBytes = found - at;
    }
  }
  report.pairs.push(pair);
}

const line = (s) => console.log(s);
line(`\nshoutcast — ${seconds}s, ${new Date(startedAt).toISOString()}`);
for (const s of report.streams) {
  line(`\n  ${s.url}`);
  line(`    ttfb ${s.ttfbMs} ms · first byte ${s.firstByteMs} ms · burst ${s.burstKiB250ms} KiB in 250 ms`);
  line(`    ${(s.bytes / 1024).toFixed(0)} KiB in ${s.chunks} chunks · ${s.kbps} kbps`);
  line(`    chunk gap p50 ${s.gapP50} / p95 ${s.gapP95} / max ${s.gapMax} ms · ${s.underruns} over ${UNDERRUN_MS} ms`);
  line(`    holding ${s.aheadOfRealtimeS}s of audio beyond realtime (icecast burst)`);
  if (s.headers['icy-name']) line(`    ${s.headers['icy-name']}${s.headers['icy-br'] ? ` · ${s.headers['icy-br']} kbps` : ''}`);
  if (s.error) line(`    ERROR ${s.error}`);
}
for (const p of report.pairs) {
  line(`\n  same byte, both paths: ${p.addedMs == null ? p.why : `${p.addedMs} ms later through the second`}`);
  if (p.addedMs != null) line(`    of which ${p.ttfbDeltaMs} ms is connect (ttfb delta) and ${p.carriedMs} ms is carry`);
  if (p.startSkewBytes != null) {
    line(`    (connections started ${(p.startSkewBytes / 16000).toFixed(1)} s apart in the stream — burst, not latency)`);
  }
}
if (out) {
  const { writeFile } = await import('node:fs/promises');
  await writeFile(out, JSON.stringify(report, null, 2));
  line(`\nwrote ${out}`);
}
