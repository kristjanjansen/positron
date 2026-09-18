// demo/fake-err.mjs: an HLS live edge that is nobody's broadcaster.
//
//   node demo/fake-err.mjs                     # :8902, three channels
//   node demo/fake-err.mjs --port 9300
//
// Then open either page against it:
//   http://127.0.0.1:8890/now/?base=http://127.0.0.1:8902
//   http://127.0.0.1:8890/flipper/?base=http://127.0.0.1:8902/wall
//
// 🔴 WHY THIS EXISTS, AND IT IS THE FIRST RULE IN CLAUDE.MD RATHER THAN A
// CONVENIENCE. `/now/` and `/flipper/` both point at ERR's live HLS, and ERR
// told us our listeners were corrupting their audience figures. The standing
// rule is that a connection to one of their mounts is opened only when a PERSON
// is going to watch it. `/now/`'s self-check alone asks for thirty two-byte
// range probes and pulls a ten minute back-seek off their servers; `/flipper/`
// sweeps eight points per channel every time a cell is opened. So the two pages
// with the most machinery in them were the two nobody could run, and the last
// full suite skipped both in writing.
//
// This is the same answer `demo/fake-station.mjs` gave `/radio/` and
// `demo/fake-tapes.mjs` gave `/tapes/`. A real master playlist, a real sliding
// media playlist with a real PROGRAM-DATE-TIME and a real MEDIA-SEQUENCE, real
// MPEG-TS segments that really decode, real Range replies, and a real schedule
// endpoint, all from a port on this machine.
//
// 🔴 THE REFUSAL IS THE PART THAT MATTERS, NOT THE STREAM. ERR blocks live
// segments BY PROGRAMME, and a refusal is a 403 carrying NO
// `access-control-allow-origin`, which reaches a browser as a CORS failure
// rather than as a status code. Measured 2026-09-06 by sweeping each 2 h window
// at 13 points (`.` = served, `#` = refused, oldest on the left):
//
//     etv       ........#####     the newest ~45 min refused
//     etv2      #########....     the OLDEST ~78 min refused, the edge fine
//     etvpluss  .............     everything served
//
// All three shapes are reproduced, because finding that boundary is most of
// what these two pages ARE: `/now/` lands its back-seek on the newest instant
// that was served, and `/flipper/` starts its picture behind the wall and
// stops loading when it reaches it. A stand-in that served everything would
// leave both of those grading nothing.
//
// ⚠️ THE BOUNDARY SLIDES HERE AND JUMPS AT ERR. Theirs is a programme edge, so
// it sits still for half an hour and then moves by however long that programme
// was. This one is a fixed distance from the live edge, which is deterministic
// and therefore gradeable. It is the one behaviour in this file deliberately
// unlike the thing it stands in for, and the trade is the usual one: a harness
// cannot assert against a quantity that moves for reasons it cannot see.
//
// ⚠️ IT GRADES OUR CODE AND NOTHING ELSE. It cannot tell you that ERR's
// boundary has moved, that a channel has gone off air, that their playlists
// have changed shape, or that the schedule API has been rewritten. A page that
// is green here can still meet all four out there.
//
// ⚠️ NO BURNED CLOCK IN THE PICTURE, AND THE REASON IS THE TOOLCHAIN RATHER
// THAN THE DESIGN. `demo/shell/pattern.mjs`'s `ffmpegFilters()` would burn a
// readable wall clock into every frame, which would let `/now/`'s "a frame from
// the asked-for instant was actually shown" read the instant off the glass
// instead of trusting a timestamp. It needs `drawtext`, `drawtext` needs
// libfreetype, and the ffmpeg on this machine (Homebrew 9.0.1) is built without
// it: `ffmpeg -filters | grep drawtext` returns nothing at all. CLAUDE.md
// already records that `src/publish.sh` pins `ffmpeg@7` for exactly this
// reason. A pool generated with a filter chain that silently draws nothing
// would be worse than no clock, so there is no clock. `testsrc2` still moves
// and counts, so one frame is distinguishable from the next.
//
// ⚠️ IT NEEDS ffmpeg, ONCE. Two hours of picture is generated the first time
// and cached in the system temporary directory: a repository is the wrong place
// for a hundred megabytes of test card. MEASURED on this machine, cold: 55.4 s
// wall for 3600 segments, 97 MB of segment bytes, 105 MB on disk once the
// filesystem has rounded 3600 small files up to whole blocks. Quote the second
// number to anybody worrying about a disk, because it is the one `du` agrees
// with. With no ffmpeg it says so and returns null, because
// a harness that cannot run has to say why rather than serve something that
// reads as a broken page.

import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync, rmSync, renameSync, readdirSync,
         statSync, createReadStream } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

/**
 * 🔴 TWO SECONDS A SEGMENT, AND IT IS READ OFF ERR RATHER THAN CHOSEN.
 * `/flipper/`'s own comment prices its wall backoff as *"three segments left six
 * seconds of material"*, and `/now/`'s manifest entry budgets its settle for
 * *"a 218 KB media playlist"*. Both only make sense at 2 s: a two hour window is
 * then 3600 segments, and 3600 lines of `#EXTINF` plus a filename comes to about
 * 218 KB. A stand-in at 6 s would hand the page a 73 KB playlist and quietly
 * remove two thirds of the parsing work it is supposed to be grading.
 */
const SEG_S = 2;
const WINDOW_N = 3600;                    // 2 h, which is what ERR advertises
/**
 * 🔴 THE POOL IS AS LONG AS THE WINDOW, WHICH BUYS EXACTLY ONE SEAM.
 * Segment `sn` is served from pool file `sn % WINDOW_N`, so a playlist of
 * WINDOW_N consecutive sequence numbers contains exactly one wrap, wherever it
 * happens to fall. A shorter pool would be cheaper and would put a
 * discontinuity every few minutes across a window a page seeks around inside.
 */
const POOL_N = WINDOW_N;
const FPS = 10;
const SIZE = '320x180';
const CACHE = join(tmpdir(), 'positron-fake-err');
const POOL = join(CACHE, `pool-${SIZE}-${FPS}-${SEG_S}s-${POOL_N}`);
const TONE = join(CACHE, 'tone-128.mp3');

const IDS = ['etv', 'etv2', 'etvpluss'];

/**
 * 🔴 WHAT ERR WAS MEASURED DOING, 2026-09-06, one sweep of thirteen points
 * across each two hour window. `/flipper/` draws it in its own comment:
 *
 *     etv       ........#####     the newest ~45 min refused
 *     etv2      #########....     the OLDEST ~78 min refused, the edge fine
 *     etvpluss  .............     everything served
 *
 * The third row is as load-bearing as the other two: a stand-in where every
 * channel refused something would make "nothing is served anywhere" look
 * identical to "every fetch from this page is failing".
 */
const MEASURED = {
  etv: { refuse: 'newest', minutes: 45 },
  etv2: { refuse: 'oldest', minutes: 78 },
  etvpluss: { refuse: 'none', minutes: 0 },
};

/**
 * 🔴 AND THE SAME THREE SHAPES WITH THE FIRST TWO SWAPPED, WHICH IS THE
 * DEFAULT, AND THE REASON IS A HOLE IN `/now/` RATHER THAN A PREFERENCE.
 *
 * Both pages open channel 0. `/flipper/` handles a refused live edge: it sweeps
 * back from the edge, finds the boundary, and starts the picture ninety seconds
 * behind it. `/now/` has no such path. Point it at a channel whose newest
 * 45 minutes are refused and hls.js 403s on every fragment at the live edge,
 * the wall handler stops loading, and the page shows black with one log line:
 * MEASURED here, six of its asserts red, all of them downstream of a clock that
 * never starts.
 *
 * ⚠️ WHICH CHANNEL WEARS WHICH SHAPE IS NOT A MEASUREMENT AND MOVES ANYWAY.
 * The block is per PROGRAMME and follows the schedule, so the sweep above is
 * one day at one instant. `/now/`'s own calibration is the evidence: it bands
 * its live gap green between 5 and 10 seconds and its `what` describes a
 * playing picture, neither of which could have been written against a channel
 * that refuses its own edge. So the default gives channel 0 an edge that plays
 * and puts the newest-end shape on channel 1, where a person clicking a cell
 * meets it.
 *
 * ⚠️ `/wall` IS THE MEASURED DAY AND THE HARNESS POINTS `/flipper/` AT IT.
 * `<base>/wall/live/etv.m3u8` is the arrangement above; it is the only way
 * `servedStart` runs its interesting branch, and it is how the question "what
 * does `/now/` do when its edge is refused" gets asked on purpose instead of
 * by accident.
 */
const OPEN_EDGE = {
  etv: { refuse: 'oldest', minutes: 78 },
  etv2: { refuse: 'newest', minutes: 45 },
  etvpluss: { refuse: 'none', minutes: 0 },
};
const ARRANGEMENTS = { '': OPEN_EDGE, wall: MEASURED };
/** The radio mounts `/flipper/` puts in its lower five cells. */
const MOUNTS = ['vikerraadio', 'raadio2', 'klassikaraadio', 'raadio4', 'raadiotallinn'];

// ── the picture ────────────────────────────────────────────────────────────

/**
 * Two hours of segmented MPEG-TS, generated once and kept.
 *
 * 🔴 EVERY SEGMENT IS EXACTLY 2.000000 s, WHICH IS WHAT MAKES A SEQUENCE NUMBER
 * A CLOCK. `-g 20` at 10 fps puts a keyframe on every two second boundary and
 * `-sc_threshold 0` stops the encoder inserting its own, so `-hls_time 2` cuts
 * where it is told: verified over 60 segments, one distinct `#EXTINF` value.
 * Without that, segment `sn` would not start at `sn * 2000` and the sliding
 * window's arithmetic would drift against wall time by a few milliseconds per
 * segment, which over a two hour window is minutes.
 *
 * 🔴 IT IS BUILT INTO A TEMPORARY DIRECTORY AND RENAMED INTO PLACE. A run that
 * is Ctrl-C'd halfway through leaves a partial pool, and a partial pool is a
 * stand-in that 403s a random stretch of the window for a reason nobody wrote
 * down. The rename is the commit.
 */
function makePool(say) {
  if (existsSync(POOL) && readdirSync(POOL).filter((f) => f.endsWith('.ts')).length === POOL_N) return true;
  const tmp = `${POOL}.building-${process.pid}`;
  rmSync(tmp, { recursive: true, force: true });
  rmSync(POOL, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const secs = POOL_N * SEG_S;
  say(`building ${(secs / 3600).toFixed(0)} h of picture, about a minute, once · ${POOL}`);
  try {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', `testsrc2=size=${SIZE}:rate=${FPS}:duration=${secs}`,
      '-f', 'lavfi', '-i', `sine=frequency=330:duration=${secs}`,
      '-c:v', 'libx264', '-preset', 'veryfast',
      '-g', String(FPS * SEG_S), '-keyint_min', String(FPS * SEG_S), '-sc_threshold', '0',
      '-pix_fmt', 'yuv420p', '-b:v', '70k', '-maxrate', '90k', '-bufsize', '180k',
      '-c:a', 'aac', '-b:a', '24k', '-ar', '44100', '-ac', '1',
      '-f', 'hls', '-hls_time', String(SEG_S), '-hls_list_size', '0',
      '-hls_flags', 'independent_segments',
      '-hls_segment_filename', join(tmp, 'seg-%05d.ts'), join(tmp, 'pool.m3u8')],
      { timeout: 10 * 60 * 1000 });
  } catch (e) {
    // ⚠️ IT SAYS WHY AND RETURNS FALSE RATHER THAN EXITING, the same as the
    // other two stand-ins. A harness importing this has to be able to report
    // "the stand-in could not be built" as the reason a page was not graded,
    // which is a different sentence from a page that failed.
    console.error('this needs ffmpeg to make its picture, and ffmpeg did not run:');
    console.error(`  ${String(e.message).split('\n')[0]}`);
    rmSync(tmp, { recursive: true, force: true });
    return false;
  }
  // 🔴 REFUSE A SHORT POOL RATHER THAN SERVING IT. ffmpeg exiting 0 having
  // written fewer segments than asked would give a window with a hole in it
  // that answers exactly like a rights refusal, which is the one thing this
  // file exists to be able to tell apart.
  const got = readdirSync(tmp).filter((f) => f.endsWith('.ts')).length;
  if (got !== POOL_N) {
    rmSync(tmp, { recursive: true, force: true });
    console.error(`ffmpeg wrote ${got} segments and ${POOL_N} were asked for; not serving a window with a hole in it`);
    return false;
  }
  renameSync(tmp, POOL);
  return true;
}

/**
 * Thirty seconds of something with a shape to it, for the five radio cells.
 * The same two tones a fifth apart `fake-station.mjs` makes, and for the same
 * reason written there: a check that counts frames passes over silence and a
 * check that measures a level does not.
 */
function makeTone() {
  if (existsSync(TONE)) return readFileSync(TONE);
  mkdirSync(CACHE, { recursive: true });
  try {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', 'sine=frequency=220:duration=30',
      '-f', 'lavfi', '-i', 'sine=frequency=330:duration=30',
      '-filter_complex',
      '[1:a]tremolo=f=2:d=0.9[p];[0:a][p]amix=inputs=2:duration=shortest,'
      + 'aformat=sample_fmts=s16:channel_layouts=stereo[a]',
      '-map', '[a]', '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', TONE]);
  } catch { return null; }   // the radio cells are the small half; the picture is the subject
  return readFileSync(TONE);
}

// ── where the live edge is, right now ──────────────────────────────────────

/**
 * The newest COMPLETE segment, and the oldest one still in the window.
 *
 * Segment `sn` covers `[sn * 2000, sn * 2000 + 2000)` in wall milliseconds, so
 * the sequence number IS the clock and nothing has to be remembered between
 * requests. The edge is one segment behind the present because a segment that
 * is still being written is not offered by anybody.
 */
function edge(atMs = Date.now()) {
  const latest = Math.floor(atMs / (SEG_S * 1000)) - 1;
  return { latest, first: latest - WINDOW_N + 1 };
}

/**
 * Will this channel hand this segment over?
 *
 * Two ways to be refused and they are indistinguishable from outside, which is
 * `err-live.mjs`'s fact 2 and is reproduced on purpose: a segment that has
 * fallen off the back of the window answers exactly like a rights refusal. That
 * is why both pages only ever probe segments they just read out of a playlist.
 */
function serves(arrangement, id, sn, now = Date.now()) {
  const { first, latest } = edge(now);
  if (sn < first || sn > latest) return false;
  const ch = ARRANGEMENTS[arrangement][id];
  const n = Math.round((ch.minutes * 60) / SEG_S);
  if (ch.refuse === 'newest') return sn <= latest - n;
  if (ch.refuse === 'oldest') return sn >= first + n;
  return true;
}

// ── what a browser is allowed to read ──────────────────────────────────────

/**
 * 🔴 `date` HAS TO BE EXPOSED OR `readPlaylist` READS NOTHING. It is not a
 * CORS-safelisted response header, so a cross-origin page cannot see it without
 * being told it may, and `readPlaylist` uses it as the server's own clock.
 * ⚠️ WHETHER ERR EXPOSES IT IS NOT KNOWN HERE and was not checked, because
 * checking means asking them. Nothing on either page asserts against
 * `serverDate`, so the difference cannot make a check pass here that would fail
 * there; if one is ever written, that is the first thing to confirm.
 */
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'range',
  'access-control-expose-headers':
    'content-length, content-range, accept-ranges, content-type, date',
};

/** `bytes=N-`, `bytes=N-M`, `bytes=-N`, against a known total. Same as `fake-tapes.mjs`. */
function parseRange(header, total) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header || '').trim());
  if (!m) return null;
  const [, a, b] = m;
  if (a === '' && b === '') return null;
  let from = a === '' ? total - Number(b) : Number(a);
  let to = a === '' ? total - 1 : (b === '' ? total - 1 : Number(b));
  from = Math.max(0, from); to = Math.min(total - 1, to);
  if (from > to) return null;
  return { from, to };
}

// ── the playlists ──────────────────────────────────────────────────────────

const iso = (ms) => new Date(ms).toISOString().replace('Z', '+00:00');

function masterPlaylist(id) {
  return ['#EXTM3U',
    '#EXT-X-VERSION:6',
    '#EXT-X-INDEPENDENT-SEGMENTS',
    '#EXT-X-STREAM-INF:BANDWIDTH=180000,AVERAGE-BANDWIDTH=120000,'
    + `RESOLUTION=${SIZE},CODECS="avc1.4d400d,mp4a.40.2",FRAME-RATE=${FPS}.000`,
    `${id}/index.m3u8`, ''].join('\n');
}

/**
 * The sliding window, built fresh on every ask.
 *
 * ONE `#EXT-X-PROGRAM-DATE-TIME`, on the first segment, which is what ERR sends
 * and what makes an absolute wall-clock position domain possible at all: the
 * rest is `pdt + Σ EXTINF`. A PDT on every segment would let a page be sloppy
 * about that accumulation and still look correct here.
 *
 * The wrap seam carries `#EXT-X-DISCONTINUITY`, because the pool's timestamps
 * run backwards there. Without it a player reads a two hour jump backwards in
 * PTS as a broken stream rather than as a new stretch of material.
 */
function mediaPlaylist(id, now = Date.now()) {
  const { first, latest } = edge(now);
  const out = ['#EXTM3U',
    '#EXT-X-VERSION:6',
    `#EXT-X-TARGETDURATION:${SEG_S}`,
    `#EXT-X-MEDIA-SEQUENCE:${first}`,
    `#EXT-X-DISCONTINUITY-SEQUENCE:${Math.floor(first / POOL_N)}`,
    '#EXT-X-INDEPENDENT-SEGMENTS',
    `#EXT-X-PROGRAM-DATE-TIME:${iso(first * SEG_S * 1000)}`];
  for (let sn = first; sn <= latest; sn++) {
    if (sn !== first && sn % POOL_N === 0) out.push('#EXT-X-DISCONTINUITY');
    out.push(`#EXTINF:${SEG_S}.000000,`, `seg-${sn}.ts`);
  }
  out.push('');
  return out.join('\n');
}

// ── what was on ────────────────────────────────────────────────────────────

/**
 * A day of programmes on a half hour grid, in the shape
 * `www.err.ee/api/tvSchedule/getTimelineSchedule` answers: a flat array whose
 * entries carry `startTime` in epoch SECONDS.
 *
 * 🔴 CONTIGUOUS ACROSS MIDNIGHT, WHICH IS THE ONLY HARD PART. `/now/` asks for
 * two days when its window reaches back past midnight, flattens both, and
 * asserts that every programme starts exactly where the previous one ended. A
 * grid that stopped at 23:30 and started again at 00:30 would fail that, on a
 * page that is working.
 *
 * ⚠️ THE NAMES SAY WHAT THEY ARE. A reader looking at the schedule row of a
 * page pointed at this should be able to tell in one glance that they are not
 * looking at Estonian television.
 */
function schedule(dayDate) {
  const day = new Date(dayDate);
  day.setHours(0, 0, 0, 0);
  const rows = [];
  for (let i = 0; i < 48; i++) {
    const at = day.getTime() + i * 30 * 60 * 1000;
    const hh = String(new Date(at).getHours()).padStart(2, '0');
    const mm = String(new Date(at).getMinutes()).padStart(2, '0');
    rows.push({
      startTime: Math.round(at / 1000),
      programName: `Stand-in ${hh}:${mm}`,
      automaticReplay: i % 3 === 2 ? 'Y' : 'N',
    });
  }
  return rows;
}

// ── the server ─────────────────────────────────────────────────────────────

/**
 * Start it. `port: 0` lets the OS choose, which is what a harness should do: a
 * fixed port is a shared mutable global, and this repo has paid for that twice.
 *
 * Returns the server, or `null` when there is no picture to serve.
 */
export function startErr({ port = 8902, quiet = false } = {}) {
  const say = (...a) => { if (!quiet) console.log(...a); };
  // ⚠️ THE BUILD NOTICE IGNORES `quiet`, AND THAT IS NOT AN OVERSIGHT. Making
  // the pool blocks for about a minute the first time on a machine, and a
  // harness that goes silent for a minute before Chrome even starts is
  // indistinguishable from a harness that has hung. Everything after it is
  // ordinary chatter and stays quiet.
  if (!makePool(console.log)) return null;
  const poolSize = readdirSync(POOL).filter((f) => f.endsWith('.ts'))
    .reduce((n, f) => n + statSync(join(POOL, f)).size, 0);
  const tone = makeTone();
  say(`${POOL_N} segments of ${SEG_S}s, ${(poolSize / 1048576).toFixed(0)} MB · ${POOL}`);
  for (const [name, arr] of Object.entries(ARRANGEMENTS)) {
    say(`  ${name ? `/${name}/` : 'default'}: ${IDS.map((id) => `${id} ${
      arr[id].refuse === 'none' ? 'all served' : `${arr[id].refuse} ${arr[id].minutes} min refused`
    }`).join(' · ')}`);
  }

  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    // ⚠️ THE ARRANGEMENT IS A LEADING PATH SEGMENT, SO NOTHING IN A PAGE HAS
    // TO KNOW ABOUT IT. `?base=http://127.0.0.1:PORT/wall` reaches `errUrl` as
    // an ordinary prefix, and every URL below it is relative, so the master
    // playlist's variant and the variant's segments follow without a word.
    const pre = /^\/(wall)(\/.*)$/.exec(url.pathname);
    const arrangement = pre ? pre[1] : '';
    const path = pre ? pre[2] : url.pathname;

    // ── a segment ──────────────────────────────────────────────────────────
    const seg = /^\/live\/([a-z0-9]+)\/seg-(\d+)\.ts$/.exec(path);
    if (seg && IDS.includes(seg[1])) {
      const [, id, snText] = seg;
      const sn = Number(snText);
      if (!serves(arrangement, id, sn)) {
        /**
         * 🔴 403 AND NOT ONE CORS HEADER, WHICH IS THE WHOLE POINT OF THE
         * REFUSAL. In a browser this is not a status code at all: the fetch
         * rejects and hls.js reports a fragment load error with nothing in it
         * that names a 403. `probeSegment` catches exactly this and calls it
         * refused; a 403 that DID carry `access-control-allow-origin` would be
         * readable, `r.ok` would be false, and the page would take the other of
         * its two paths. Both mean refused and both are reproduced by not
         * writing the header.
         *
         * ⚠️ NO `access-control-allow-origin` MEANS OPTIONS TOO. Answering a
         * preflight for a segment that is then refused would let a page learn
         * something about the refusal that ERR does not tell it.
         */
        res.writeHead(403, { 'content-type': 'text/plain' });
        return res.end('rights\n');
      }
      const file = join(POOL, `seg-${String(sn % POOL_N).padStart(5, '0')}.ts`);
      if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
      return serveFile(req, res, file, 'video/mp2t');
    }

    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

    // ── the playlists ──────────────────────────────────────────────────────
    const master = /^\/live\/([a-z0-9]+)\.m3u8$/.exec(path);
    if (master && IDS.includes(master[1])) return text(res, masterPlaylist(master[1]), 'application/vnd.apple.mpegurl');
    const media = /^\/live\/([a-z0-9]+)\/index\.m3u8$/.exec(path);
    if (media && IDS.includes(media[1])) return text(res, mediaPlaylist(media[1]), 'application/vnd.apple.mpegurl');

    // ── what was on ────────────────────────────────────────────────────────
    if (path === '/api/tvSchedule/getTimelineSchedule') {
      const y = Number(url.searchParams.get('year'));
      const mo = Number(url.searchParams.get('month'));
      const da = Number(url.searchParams.get('day'));
      const when = Number.isFinite(y) && y ? new Date(y, mo - 1, da) : new Date();
      res.writeHead(200, { ...CORS, 'content-type': 'application/json', 'cache-control': 'no-store' });
      return res.end(JSON.stringify(schedule(when)));
    }

    // ── the five radio cells ───────────────────────────────────────────────
    const mount = /^\/([a-z0-9]+)\.mp3$/.exec(path);
    if (mount && MOUNTS.includes(mount[1])) return serveMount(req, res, tone, say);

    // ⚠️ IT SAYS WHAT IT DOES NOT HAVE. A bare 404 from a stand-in reads as the
    // channel being off air, which is a claim this file is not entitled to make
    // about anybody's broadcaster. And this path is never a refusal: a refusal
    // here is a 403 with no CORS, and answering a typo the same way would make
    // a wrong URL indistinguishable from rights.
    res.writeHead(404, { ...CORS, 'content-type': 'text/plain' });
    return res.end(`no such channel or path here: ${path}\n`);
  });

  server.listen(port, '127.0.0.1');
  return server;
}

function text(res, body, type) {
  res.writeHead(200, { ...CORS, 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

/** A segment, with Range, because `probeSegment` asks for two bytes. */
function serveFile(req, res, file, type) {
  let total;
  try { total = statSync(file).size; } catch {
    res.writeHead(404, { ...CORS, 'content-type': 'text/plain' });
    return res.end('the pool is missing a segment it said it had\n');
  }
  const range = parseRange(req.headers.range, total);
  const head = { ...CORS, 'content-type': type, 'accept-ranges': 'bytes', 'cache-control': 'no-store' };
  if (req.headers.range && !range) {
    res.writeHead(416, { ...head, 'content-range': `bytes */${total}` });
    return res.end();
  }
  const from = range ? range.from : 0;
  const to = range ? range.to : total - 1;
  res.writeHead(range ? 206 : 200, {
    ...head,
    'content-length': String(to - from + 1),
    ...(range ? { 'content-range': `bytes ${from}-${to}/${total}` } : {}),
  });
  if (req.method === 'HEAD') return res.end();
  createReadStream(file, { start: from, end: to }).pipe(res);
}

/**
 * A radio mount, paced against the clock rather than against the timer.
 *
 * The short version of what `fake-station.mjs` writes at length: sending a
 * fixed chunk per `setInterval` tick sends at the rate node's timers actually
 * fire, which measured 2.3 % slow from inside a page. Bytes owed since the
 * connection opened is the quantity that cannot drift.
 */
function serveMount(req, res, tone, say) {
  if (!tone) { res.writeHead(503, { 'content-type': 'text/plain' }); return res.end('no audio\n'); }
  const BYTES_PER_S = (128 * 1000) / 8;
  res.writeHead(200, {
    ...CORS, 'content-type': 'audio/mpeg', 'cache-control': 'no-store',
    'icy-name': 'a stand-in, not a radio station',
  });
  let at = Math.floor(Math.random() * tone.length), sent = 0;
  const t0 = Date.now();
  const timer = setInterval(() => {
    let need = Math.max(0, Math.round(((Date.now() - t0) / 1000) * BYTES_PER_S) + 65536 - sent);
    while (need > 0) {
      const end = Math.min(at + need, tone.length);
      const slice = tone.subarray(at, end);
      res.write(slice);
      sent += slice.length; need -= slice.length;
      at = end === tone.length ? 0 : end;
    }
  }, 50);
  const stop = () => { clearInterval(timer); say(`  a radio cell closed after ${(sent / 1024).toFixed(0)} KB`); };
  req.on('close', stop);
  res.on('error', stop);
}

// Run directly: a broadcaster on 8902 (or `--port`), and the URLs to open.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const argv = process.argv.slice(2);
  const port = Number(argv[argv.indexOf('--port') + 1]) || 8902;
  const server = startErr({ port });
  if (!server) process.exit(1);
  server.on('listening', () => {
    const p = server.address().port;
    console.log(`stand-in broadcaster on http://127.0.0.1:${p}`);
    console.log(`  http://127.0.0.1:8890/now/?base=http://127.0.0.1:${p}`);
    console.log(`  http://127.0.0.1:8890/flipper/?base=http://127.0.0.1:${p}/wall`);
  });
}
