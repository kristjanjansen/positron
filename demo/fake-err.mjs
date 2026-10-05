// demo/fake-err.mjs: an HLS live edge that is nobody's broadcaster.
//
//   node demo/fake-err.mjs                     # :8902, three channels
//   node demo/fake-err.mjs --port 9300
//   node demo/fake-err.mjs --radio             # and the radio channels over HLS, for /station/'s relay slot
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
 * 🔴 1.92 SECONDS A SEGMENT AND 3750 OF THEM, BECAUSE THAT IS WHAT WAS MEASURED.
 * This said two seconds and 3600 until 2026-10-05, under a heading claiming
 * the number was read off ERR. It was not: `research/err-live-feeds-2026-08.md`
 * and `plans/plan-live-timeline.md` both MEASURED `#EXTINF:1.92` on every one
 * of 3750 segments, 7200.00 s exactly, on TV and radio alike, and the radio
 * half of this file already used 1920 ms. A stand-in on a round number lets a
 * page get away with assuming one.
 * 1.92 s is 48 frames at ERR's 25 fps and 90 AAC frames at 48 kHz, so every
 * segment cuts on a keyframe and on an audio frame boundary.
 */
const SEG_MS = 1920;
const SEG_S = SEG_MS / 1000;
const WINDOW_N = 3750;                    // 2 h exactly, measured
/**
 * 🔴 THE POOL IS AS LONG AS THE WINDOW, WHICH BUYS EXACTLY ONE SEAM.
 * Segment `sn` is served from pool file `sn % WINDOW_N`, so a playlist of
 * WINDOW_N consecutive sequence numbers contains exactly one wrap, wherever it
 * happens to fall. A shorter pool would be cheaper and would put a
 * discontinuity every few minutes across a window a page seeks around inside.
 */
const POOL_N = WINDOW_N;
const FPS = 25;                           // ERR's frame rate, measured
const GOP = Math.round((FPS * SEG_MS) / 1000);   // 48
const SIZE = '320x180';
const CACHE = join(tmpdir(), 'positron-fake-err');
const POOL = join(CACHE, `pool-fmp4-${SIZE}-${FPS}-${SEG_MS}ms-${POOL_N}`);
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
 * Two hours of segmented fMP4, generated once and kept.
 *
 * 🔴 fMP4, NOT MPEG-TS, BECAUSE ERR's TELEVISION IS fMP4. MEASURED twice
 * (`research/err-live-feeds-2026-08.md`, `plans/plan-live-timeline.md`):
 * CMAF `.m4s` segments behind one `#EXT-X-MAP` init segment. hls.js takes a
 * different path for each (it transmuxes TS and passes fMP4 through), so a TS
 * stand-in graded a path ERR's picture never takes. This was TS until
 * 2026-10-05.
 *
 * 🔴 EVERY SEGMENT IS EXACTLY 1.92 s, WHICH IS WHAT MAKES A SEQUENCE NUMBER
 * A CLOCK. `-g 48` at 25 fps puts a keyframe on every 1.92 s boundary and
 * `-sc_threshold 0` stops the encoder inserting its own, so `-hls_time 1.92`
 * cuts where it is told. The build refuses a pool whose playlist carries any
 * other `#EXTINF` value.
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
  const count = (d) => readdirSync(d).filter((f) => f.endsWith('.m4s')).length;
  if (existsSync(POOL) && count(POOL) === POOL_N && existsSync(join(POOL, 'init.mp4'))) return true;
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
      '-g', String(GOP), '-keyint_min', String(GOP), '-sc_threshold', '0',
      '-pix_fmt', 'yuv420p', '-b:v', '70k', '-maxrate', '90k', '-bufsize', '180k',
      '-c:a', 'aac', '-b:a', '24k', '-ar', '48000', '-ac', '1',
      '-f', 'hls', '-hls_time', String(SEG_S), '-hls_list_size', '0',
      '-hls_flags', 'independent_segments',
      '-hls_segment_type', 'fmp4', '-hls_fmp4_init_filename', 'init.mp4',
      '-hls_segment_filename', join(tmp, 'seg-%05d.m4s'), join(tmp, 'pool.m3u8')],
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
  const got = count(tmp);
  if (got !== POOL_N || !existsSync(join(tmp, 'init.mp4'))) {
    rmSync(tmp, { recursive: true, force: true });
    console.error(`ffmpeg wrote ${got} segments and ${POOL_N} were asked for; not serving a window with a hole in it`);
    return false;
  }
  // A sequence number is only a clock if every segment is the length the
  // playlist says. Ask ffmpeg's own playlist rather than trusting the flags.
  const lens = new Set((readFileSync(join(tmp, 'pool.m3u8'), 'utf8').match(/#EXTINF:[\d.]+/g) || [])
    .map((l) => Number(l.slice(8)).toFixed(3)));
  if (lens.size !== 1 || !lens.has(SEG_S.toFixed(3))) {
    rmSync(tmp, { recursive: true, force: true });
    console.error(`ffmpeg cut segments of ${[...lens].join(', ')} s and ${SEG_S} was asked for; not serving a clock that drifts`);
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

// ── the radio channels as live.err.ee serves them ──────────────────────────

/**
 * 🔴 AUDIO-ONLY HLS, THE SHAPE ERR'S RADIO HAS ON live.err.ee, FOR THE STATION'S
 * RELAY SLOT. `research/err-live-feeds-2026-08.md` measured it: a master per
 * channel that mints a session `?id=` and lists AAC rungs at 70, 130 and 260
 * kbit/s, a variant that answers 400 without that id, MPEG-TS segments of
 * exactly 1.92 s (90 AAC frames at 48 kHz) and a two hour window, 3750 of them.
 * All of that is reproduced so `workers/station`'s relay can be built and run
 * with zero requests to ERR.
 *
 * ⚠️ OFF UNLESS ASKED FOR (`--radio`, or `startErr({ radio: true })`). It is a
 * second pool, about half a minute to build once, and `/now/` and `/flipper/`
 * do not need it, so their harness runs do not pay for it.
 * ⚠️ IT GRADES OUR CODE AND NOTHING ELSE, the same as everything in this file.
 * Every rung is the same pool at 32 kbit/s mono; only the BANDWIDTH labels differ.
 */
const RADIO_SEG_MS = 1920;
const RADIO_N = 3750;                      // 2 h, which is what ERR advertises
const RADIO_POOL = join(CACHE, `radio-1920ms-${RADIO_N}`);
const RADIO_RUNGS = [70000, 130000, 260000];

function makeRadioPool(say) {
  const have = (d) => existsSync(d) && readdirSync(d).filter((f) => f.endsWith('.ts')).length >= RADIO_N;
  if (have(RADIO_POOL)) return true;
  const tmp = `${RADIO_POOL}.building-${process.pid}`;
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  say(`building 2 h of radio once, about half a minute, in ${RADIO_POOL}`);
  try {
    // A tone with a slow swell, 550 Hz, so it is never mistaken for the
    // station's own 220/330/440 Hz test programmes when somebody listens.
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', `sine=frequency=550:duration=${(RADIO_N * RADIO_SEG_MS) / 1000}`,
      '-af', 'tremolo=f=0.5:d=0.6',
      '-c:a', 'aac', '-b:a', '32k', '-ar', '48000', '-ac', '1',
      '-f', 'hls', '-hls_time', String(RADIO_SEG_MS / 1000), '-hls_list_size', '0',
      '-hls_segment_filename', join(tmp, 'r-%05d.ts'), join(tmp, 'pool.m3u8')],
    { timeout: 10 * 60 * 1000 });
  } catch (e) {
    console.error('the radio pool needs ffmpeg, and ffmpeg did not run:');
    console.error(`  ${String(e.message).split('\n')[0]}`);
    rmSync(tmp, { recursive: true, force: true });
    return false;
  }
  if (!have(tmp)) {
    rmSync(tmp, { recursive: true, force: true });
    console.error(`ffmpeg wrote fewer than ${RADIO_N} radio segments; not serving a window with a hole in it`);
    return false;
  }
  rmSync(RADIO_POOL, { recursive: true, force: true });
  renameSync(tmp, RADIO_POOL);
  return true;
}

/** The newest complete radio segment; `sn * 1920` ms is when it began. */
function radioEdge(atMs = Date.now()) {
  const latest = Math.floor(atMs / RADIO_SEG_MS) - 1;
  return { latest, first: latest - RADIO_N + 1 };
}

function radioMaster(mount) {
  // A fresh session on every ask, fifteen digits, the way ERR mints one.
  const id = String(Math.floor(1e14 + Math.random() * 9e14));
  const out = ['#EXTM3U', '#EXT-X-VERSION:7', '#EXT-X-INDEPENDENT-SEGMENTS'];
  for (const bw of RADIO_RUNGS) {
    out.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bw},CODECS="mp4a.40.2"`, `${mount}/a${bw}.m3u8?id=${id}`);
  }
  out.push('');
  return out.join('\n');
}

function radioMedia(now = Date.now()) {
  const { first, latest } = radioEdge(now);
  const out = ['#EXTM3U', '#EXT-X-VERSION:7',
    `#EXT-X-TARGETDURATION:${Math.ceil(RADIO_SEG_MS / 1000)}`,
    `#EXT-X-MEDIA-SEQUENCE:${first}`,
    `#EXT-X-DISCONTINUITY-SEQUENCE:${Math.floor(first / RADIO_N)}`,
    '#EXT-X-INDEPENDENT-SEGMENTS',
    `#EXT-X-PROGRAM-DATE-TIME:${iso(first * RADIO_SEG_MS)}`];
  for (let sn = first; sn <= latest; sn++) {
    if (sn !== first && sn % RADIO_N === 0) out.push('#EXT-X-DISCONTINUITY');
    out.push(`#EXTINF:${(RADIO_SEG_MS / 1000).toFixed(6)},`, `r-${sn}.ts`);
  }
  out.push('');
  return out.join('\n');
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
  const latest = Math.floor(atMs / SEG_MS) - 1;
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
  const n = Math.round((ch.minutes * 60 * 1000) / SEG_MS);
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

/**
 * 🔴 A FRESH SESSION ON EVERY READ OF THE MASTER, AND A VARIANT THAT REFUSES TO
 * ANSWER WITHOUT ONE IT MINTED. MEASURED (`research/err-live-feeds-2026-08.md`):
 * the master mints `?id=<15 digits>`, a bare variant answers 400, and a stale
 * or foreign id answers `Failed to set session: not found`. Until 2026-10-05 the
 * television half of this file had no session at all, so a page that re-read
 * the master every second, opening a new session at ERR each time, looked
 * exactly like one that opened one.
 * ⚠️ SESSIONS HERE NEVER EXPIRE. How long ERR keeps one is NOT measured, so a
 * page's recovery from an expired session is not graded by this file.
 */
const SESSIONS = new Set();
const SESSION_CAP = 10000;
function mint() {
  const id = String(Math.floor(1e14 + Math.random() * 9e14));
  SESSIONS.add(id);
  if (SESSIONS.size > SESSION_CAP) SESSIONS.delete(SESSIONS.values().next().value);
  return id;
}

function masterPlaylist(id) {
  return ['#EXTM3U',
    '#EXT-X-VERSION:7',
    '#EXT-X-INDEPENDENT-SEGMENTS',
    '#EXT-X-STREAM-INF:BANDWIDTH=180000,AVERAGE-BANDWIDTH=120000,'
    + `RESOLUTION=${SIZE},CODECS="avc1.64000c,mp4a.40.2",FRAME-RATE=${FPS}.000`,
    `${id}/index.m3u8?id=${mint()}`, ''].join('\n');
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
    '#EXT-X-VERSION:7',
    `#EXT-X-TARGETDURATION:${Math.ceil(SEG_S)}`,
    `#EXT-X-MEDIA-SEQUENCE:${first}`,
    `#EXT-X-DISCONTINUITY-SEQUENCE:${Math.floor(first / POOL_N)}`,
    '#EXT-X-INDEPENDENT-SEGMENTS',
    '#EXT-X-MAP:URI="init.mp4"',
    `#EXT-X-PROGRAM-DATE-TIME:${iso(first * SEG_MS)}`];
  for (let sn = first; sn <= latest; sn++) {
    if (sn !== first && sn % POOL_N === 0) out.push('#EXT-X-DISCONTINUITY');
    out.push(`#EXTINF:${SEG_S.toFixed(6)},`, `seg-${sn}.m4s`);
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
export function startErr({ port = 8902, quiet = false, radio = false } = {}) {
  const say = (...a) => { if (!quiet) console.log(...a); };
  const radioHls = radio && makeRadioPool(console.log);
  // ⚠️ THE BUILD NOTICE IGNORES `quiet`, AND THAT IS NOT AN OVERSIGHT. Making
  // the pool blocks for about a minute the first time on a machine, and a
  // harness that goes silent for a minute before Chrome even starts is
  // indistinguishable from a harness that has hung. Everything after it is
  // ordinary chatter and stays quiet.
  if (!makePool(console.log)) return null;
  const poolSize = readdirSync(POOL).filter((f) => f.endsWith('.m4s'))
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
    const seg = /^\/live\/([a-z0-9]+)\/seg-(\d+)\.m4s$/.exec(path);
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
      const file = join(POOL, `seg-${String(sn % POOL_N).padStart(5, '0')}.m4s`);
      if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
      return serveFile(req, res, file, 'video/mp4');
    }
    // The one init segment every `.m4s` decodes against. ⚠️ Whether ERR ever
    // refuses its init segment is NOT measured; here it is always served.
    const init = /^\/live\/([a-z0-9]+)\/init\.mp4$/.exec(path);
    if (init && IDS.includes(init[1])) return serveFile(req, res, join(POOL, 'init.mp4'), 'video/mp4');

    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

    // ── the radio channels over HLS, when asked for ────────────────────────
    if (radioHls) {
      const rm = /^\/live\/([a-z0-9]+)\.m3u8$/.exec(path);
      if (rm && MOUNTS.includes(rm[1])) return text(res, radioMaster(rm[1]), 'application/vnd.apple.mpegurl');
      const rv = /^\/live\/([a-z0-9]+)\/a\d+\.m3u8$/.exec(path);
      if (rv && MOUNTS.includes(rv[1])) {
        // What ERR answers a variant asked for without the master's session.
        if (!/^\d{15}$/.test(url.searchParams.get('id') || '')) {
          res.writeHead(400, { ...CORS, 'content-type': 'text/plain' });
          return res.end('Failed to set session: not found\n');
        }
        return text(res, radioMedia(), 'application/vnd.apple.mpegurl');
      }
      const rs = /^\/live\/([a-z0-9]+)\/r-(\d+)\.ts$/.exec(path);
      if (rs && MOUNTS.includes(rs[1])) {
        const sn = Number(rs[2]);
        const { first, latest } = radioEdge();
        if (sn < first || sn > latest) {
          res.writeHead(404, { ...CORS, 'content-type': 'text/plain' });
          return res.end('not in the window\n');
        }
        return serveFile(req, res, join(RADIO_POOL, `r-${String(sn % RADIO_N).padStart(5, '0')}.ts`), 'video/mp2t');
      }
    }

    // ── the playlists ──────────────────────────────────────────────────────
    const master = /^\/live\/([a-z0-9]+)\.m3u8$/.exec(path);
    if (master && IDS.includes(master[1])) return text(res, masterPlaylist(master[1]), 'application/vnd.apple.mpegurl');
    const media = /^\/live\/([a-z0-9]+)\/index\.m3u8$/.exec(path);
    if (media && IDS.includes(media[1])) {
      if (!SESSIONS.has(url.searchParams.get('id') || '')) {
        res.writeHead(400, { ...CORS, 'content-type': 'text/plain' });
        return res.end('Failed to set session: not found\n');
      }
      return text(res, mediaPlaylist(media[1]), 'application/vnd.apple.mpegurl');
    }

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
  const server = startErr({ port, radio: argv.includes('--radio') });
  if (!server) process.exit(1);
  server.on('listening', () => {
    const p = server.address().port;
    console.log(`stand-in broadcaster on http://127.0.0.1:${p}`);
    console.log(`  http://127.0.0.1:8890/flipper/?base=http://127.0.0.1:${p}`);
    console.log(`  http://127.0.0.1:8890/flipper/?base=http://127.0.0.1:${p}/wall`);
  });
}
