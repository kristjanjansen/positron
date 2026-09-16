/**
 * ── getting 1965 into the buffers ────────────────────────────────────────
 *
 * ERR's archive holds **543 audio items from 1965** (POST /api/v1/search, type
 * audio, 1965 in negative unix seconds). Note that this is the RADIO archive,
 * not the film archive: the 298 video items from 1965 are `FILM 16mm m/v
 * negatiiv helita` — silent film negatives — so granulating those would
 * granulate nothing, which is the failure Pappus already had once.
 *
 * Audio is filename-addressed rather than hash-addressed, 64 kbps AAC at
 * **48 kHz**, which is the box's own rate, so nothing is resampled.
 *
 * Two routes in, and they are genuinely different instruments:
 *
 *   LOAD  ffmpeg pulls an excerpt to a WAV, `snapread` puts it straight into
 *         the grain buffers. Exact, repeatable, seekable anywhere in a
 *         45-minute broadcast, no clock drift, and the buffer holds it forever.
 *         This is the one that makes it a SYNTH. It writes a file.
 *
 *   LIVE  ffmpeg plays it into `snd-aloop` and `alsa_in` bridges that into
 *         JACK, so the buffer is a rolling 60-second window of the broadcast.
 *         Nothing is written to disk. ffmpeg has no JACK MUXER — `ffmpeg
 *         -devices` lists jack as `D` only — so the loopback hop is not
 *         avoidable, and `alsa_in` resamples between two unsynchronised clocks,
 *         which no granulator cares about.
 *
 * ⚠️ Rights: this project's ERR posture is stream and link, never copy
 * (plan-archive-timeline §5). LOAD writes a file and a 60-second grain buffer
 * is a recording either way, so this is R&D on one machine and not something to
 * put behind a public button until the licence conversation lands.
 */
export const ERR_API = 'https://arhiiv.err.ee/api/v1';
export const ERR_UA = 'positron-box/1.0 (+https://positron.studio; R&D)';

/**
 * ── BEING A GOOD GUEST AT SOMEBODY ELSE'S ARCHIVE ────────────────────────────
 *
 * ERR is a public broadcaster's archive, not a service we pay for, and on
 * 2026-09-11 a day of testing got this board's address cut off: `arhiiv.err.ee`
 * answered nothing at all from the Pi — connection refused, `curl` code 000 —
 * while Cloudflare answered 200 from the same machine in 14 ms and the same
 * host answered 200 from a laptop on a different address. That is a block, and
 * it was earned. Three things caused it and all three are fixed here.
 *
 *   1. THE SEARCH WAS REPEATED FOR A YEAR THAT ENDED SIXTY YEARS AGO. Every
 *      press of the 1965 button and every run of the test asked again for the
 *      same 543 immutable rows. It is now cached on disk, so a restarted box
 *      does not ask again either.
 *
 *   2. THE EXCERPT WAS RE-PULLED EVERY TIME. This is the heavy one and it does
 *      not look like a request: `errExcerpt` runs ffmpeg against their HLS
 *      playlist, so one "load" is a stream of segment fetches. The same slug at
 *      the same offset now comes off the local disk.
 *
 *   3. A REFUSAL WAS ANSWERED WITH ANOTHER REQUEST. There was no backoff, so
 *      the moment ERR started saying no, we asked faster.
 *
 * Plus a floor between any two requests, because the polite number of requests
 * per second to a stranger's archive is well under one.
 */
const ERR_MIN_GAP_MS = 2000;        // never two requests inside two seconds
const ERR_BACKOFF_MS = [30e3, 60e3, 120e3, 300e3, 900e3];   // then stay at 15 min
const ERR_ITEM_TTL_MS = 10 * 60e3;  // media URLs expire; a short memo, not a store
const ERR_CACHE = (() => {
  // The service restarts often and /tmp does not survive a reboot, so the list
  // lives under the user's cache directory. /tmp is the fallback rather than
  // the default because a cache that evaporates is a cache that re-asks.
  const base = process.env.XDG_CACHE_HOME || (homedir() && `${homedir()}/.cache`) || '/tmp';
  const dir = `${base}/positron-box`;
  try { mkdirSync(dir, { recursive: true }); return dir; } catch { return '/tmp'; }
})();

let errGate = Promise.resolve();    // one request at a time, in order
let errNextAt = 0, errFails = 0, errHoldUntil = 0, errLastError = null;

/** Why the archive is not being asked right now, in words a page can print. */
export function errStatus() {
  const waitMs = Math.max(0, errHoldUntil - Date.now());
  return {
    holdingOff: waitMs > 0,
    forMs: waitMs,
    consecutiveFailures: errFails,
    lastError: errLastError,
    cacheDir: ERR_CACHE,
  };
}

/**
 * Every request to ERR goes through here. Serialised, spaced, and it stops
 * asking when it is told no.
 */
async function errFetch(url, init = {}) {
  const run = async () => {
    const waitMs = errHoldUntil - Date.now();
    if (waitMs > 0) {
      // ⚠️ Not an exception the caller should retry past. It names the wait so
      // a client can say "the archive asked us to wait" rather than "failed".
      const e = new Error(`holding off the archive for another ${Math.ceil(waitMs / 1000)} s (${errLastError ?? 'it refused'})`);
      e.holdingOff = true;
      throw e;
    }
    const gap = errNextAt - Date.now();
    if (gap > 0) await new Promise((r) => setTimeout(r, gap));
    errNextAt = Date.now() + ERR_MIN_GAP_MS;
    let res;
    try {
      res = await fetch(url, { ...init, headers: { 'user-agent': ERR_UA, ...(init.headers || {}) } });
    } catch (e) {
      // A refused connection is the loudest "no" there is. Treat it as one.
      hold(`cannot reach the archive (${e.message})`);
      throw new Error(`err: ${e.message}`);
    }
    if (res.status === 429 || res.status === 403 || res.status >= 500) {
      // Honour Retry-After when they bother to say; our own backoff otherwise,
      // whichever is longer. Never shorter than they asked for.
      const after = Number(res.headers.get('retry-after')) * 1000;
      hold(`the archive answered ${res.status}`, Number.isFinite(after) ? after : 0);
      throw new Error(`err ${res.status}`);
    }
    if (!res.ok) throw new Error(`err ${res.status}`);      // a 404 is about the item, not about us
    errFails = 0; errLastError = null;
    return res;
  };
  // Queue behind whatever is in flight, and keep the queue alive through a
  // rejection — a chain that adopts a failure stops serialising after the
  // first one, which is how a rate limiter quietly turns itself off.
  const queued = errGate.then(run, run);
  errGate = queued.then(() => {}, () => {});
  return queued;
}

function hold(why, atLeastMs = 0) {
  const step = ERR_BACKOFF_MS[Math.min(errFails, ERR_BACKOFF_MS.length - 1)];
  errFails++;
  errHoldUntil = Date.now() + Math.max(step, atLeastMs);
  errLastError = why;
}

/** 1965, as the archive's own search wants it: unix seconds, negative. */
export const YEAR_1965 = { from: -157766400, to: -126230401 };

/**
 * Ask the archive for a year of radio. Returns `{slug, date, title, lead}` rows.
 *
 * ⚠️ This cannot be called from a browser: the JSON content type forces a
 * preflight and the OPTIONS answers 204 with no ACAO. From node there is no
 * preflight, which is why it lives on the box.
 */
export async function errSearch({ from = YEAR_1965.from, to = YEAR_1965.to, limit = 100, page = 1, fresh = false } = {}) {
  // ⚠️ CACHED ON DISK AND NOT EXPIRED. 1965 is over: the rows for a closed year
  // do not change, so a TTL here would only mean asking a stranger's server
  // again for an answer we already have. `fresh: true` is the escape hatch for
  // the day somebody wants a different year, and nothing calls it.
  const key = `${ERR_CACHE}/search-${from}-${to}-${page}-${limit}.json`;
  if (!fresh && existsSync(key)) {
    try { return { ...JSON.parse(readFileSync(key, 'utf8')), cached: true }; }
    catch { /* a corrupt cache is not a reason to fail; ask again below */ }
  }
  const res = await errFetch(`${ERR_API}/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ queryParams: {
      phrase: '*', type: 'audio', sortOption: 'old', page, limit,
      timeRange: 'custom', timeRangeFrom: from, timeRangeTo: to,
      includeTranscription: false, advancedParams: [],
    } }),
  });
  const j = await res.json();
  const block = j.activeList?.data?.find((d) => d.type === 'audio');
  const out = {
    total: j.activeList?.audioCount ?? 0,
    items: (block?.data || []).map((it) => ({
      slug: it.url, date: (it.date || '').slice(0, 10),
      title: it.heading, lead: (it.lead || '').slice(0, 300),
      series: it.navigationLinks?.find((n) => n.type === 'series')?.data?.[0]?.name || null,
    })),
  };
  // Only a list that actually has rows is worth keeping — caching an empty
  // answer would turn one bad minute into a permanently empty archive.
  if (out.items.length) { try { writeFileSync(key, JSON.stringify(out)); } catch { /* the cache is an optimisation */ } }
  return { ...out, cached: false };
}

/** One item, resolved to the media URL. Re-resolve at play time; never store it. */
const itemMemo = new Map();
export async function errItem(slug) {
  // A SHORT memo, not a store. The comment above is the reason: these media
  // URLs are signed and expire, so holding one for an hour would hand ffmpeg a
  // dead link. Ten minutes covers a session of pressing the button without
  // asking again for every press.
  const hit = itemMemo.get(slug);
  if (hit && Date.now() - hit.at < ERR_ITEM_TTL_MS) return hit.item;
  const res = await errFetch(`${ERR_API}/content/audio/${slug}`);
  const j = await res.json();
  const info = j.info || {}, hls = j.media?.src?.hls;
  if (!hls) throw new Error(`no media for ${slug}`);
  const item = {
    slug, title: info.title, date: (info.date || '').slice(0, 10),
    // The API returns it protocol-relative.
    hls: hls.startsWith('//') ? `https:${hls}` : hls,
    // "" means ERR offers no download for this item, which is most of them.
    downloadUrl: info.downloadUrl || null,
  };
  itemMemo.set(slug, { at: Date.now(), item });
  return item;
}

/**
 * Pull `durSec` starting at `atSec` into a mono 48 kHz WAV.
 *
 * Mono on purpose: `snapread` is per BUFFER and the same file is read into both
 * sides, which is the engine's own documented way of loading an old one-file
 * snapshot — "asking for the SAME file twice … comes back as the mono recording
 * it was". A stereo file would need splitting first for no gain here.
 *
 * 60 seconds because that is exactly the grain buffer's length
 * (Engine_Pappus.sc:24, `bufdur = 60.0`). Asking for more is silently truncated
 * by the read, which would read as "the end of my excerpt is missing".
 */
export async function errExcerpt({ hls, atSec = 0, durSec = 60, out, ffmpeg = 'ffmpeg' }) {
  // ⚠️ THIS IS THE HEAVY REQUEST AND IT DOES NOT LOOK LIKE ONE. There is no
  // `fetch` on this line, so it read as local work — but ffmpeg opens their HLS
  // playlist and pulls segment after segment, which is by far the most traffic
  // this box sends to ERR. Pressing the button four times pulled four minutes
  // of their bandwidth for the same four minutes of audio.
  //
  // An excerpt is immutable: the same slug at the same offset for the same
  // length is the same audio forever. So it is kept, and asked for once.
  if (existsSync(out)) {
    try {
      // Bigger than a WAV header, or it is a failed pull dressed as a cache hit.
      if (statSync(out).size > 1024) return { out, atSec, durSec, tookMs: 0, cached: true };
    } catch { /* fall through and pull it */ }
  }
  const args = ['-hide_banner', '-loglevel', 'error', '-ss', String(atSec), '-t', String(durSec),
                '-i', hls, '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s16le', '-y', out];
  const t = Date.now();
  await execFileP(ffmpeg, args, { maxBuffer: 1 << 20 });
  sweepExcerpts();
  return { out, atSec, durSec, tookMs: Date.now() - t, cached: false };
}

/**
 * Keep the excerpt cache bounded.
 *
 * A minute of 48 kHz mono is 5.8 MB and the board has a small card, so an
 * unbounded cache trades one problem for another. Twelve is about seventy
 * megabytes and more different excerpts than a session uses; the oldest go
 * first, which is also the ones least likely to be asked for again.
 */
const EXCERPT_KEEP = 12;
function sweepExcerpts() {
  try {
    const files = readdirSync('/tmp')
      .filter((f) => f.startsWith('err-') && f.endsWith('.wav'))
      .map((f) => ({ f: `/tmp/${f}`, at: statSync(`/tmp/${f}`).mtimeMs }))
      .sort((a, b) => b.at - a.at);
    for (const { f } of files.slice(EXCERPT_KEEP)) { try { unlinkSync(f); } catch { /* gone */ } }
  } catch { /* the sweep is housekeeping, never a reason to fail a load */ }
}

/**
 * Load a WAV into all four grain buffers and stop the granulators recording
 * over it.
 *
 * ⚠️ `msrc 1` is OFF, and OFF HOLDS — the engine is explicit that it does not
 * record silence over the top, because "the destructive reading would quietly
 * erase a snapshot you just loaded". So the order is load, then OFF; the other
 * way round works too, but OFF first is what keeps a live input from writing
 * over the first half of the excerpt while the second half is still loading.
 */
/**
 * ⚠️ `src 1` IS NOT "HOLD". IT ERASES THE BUFFER, AND IT TOOK A DAY TO SEE.
 *
 * The engine's own comment calls `msrc 1` "OFF (hold what the buffer already
 * has)", and the record gain does go to zero — but the write head does not
 * stop. `Engine_Pappus.sc:489-508`:
 *
 *   sos    = msos.max(mlock)          ... 0 when neither is set
 *   sosret = (sos * 1.05).clip(0, 1)  ... how much of the OLD sample is kept
 *   sosin  = ((1 - sos) * 4).clip(0, 1) * run * (ssel > 1.5)
 *   BufWr.ar((cap * sosin) + (old * sosret), ...)
 *
 * With `src` 1 the input term is zero AND the retain term is zero, so the
 * buffer is written with `0 * new + 0 * old` — silence — sweeping the whole
 * live window at real time. Sixty seconds of 1965 went in and were wiped
 * within one pass of the window, which is one to twelve seconds.
 *
 * That is why every reading of this feature was wrong in the same direction:
 * a take started a second or two after the load still caught some of it, so
 * it "made a sound" and "sounded unlike the synth" — both true, both about
 * material that was already being erased. Measured after the fix: silent
 * within ~2 s before, and **still sounding 90 s later** after.
 *
 * HOLDING is `lock`, which is what makes `sosret` 1 so the write becomes a
 * rewrite of what is already there. Both are needed: the lock to keep the
 * material, the src to stop the input being mixed into it.
 */
export function loadBuffers(pap, wavPath) {
  pap.send('msrc', 1);
  pap.send('nsrc', 1);
  pap.send('mlock', 1);
  pap.send('nlock', 1);
  for (const b of [1, 2, 3, 4]) pap.send('snapread', b, wavPath);
  return { loaded: wavPath, buffers: 4, recording: 'off', held: true };
}
