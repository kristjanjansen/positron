// archive/box-pappus/box-err.js — the ERR archive half of rig/box/box.mjs and
// rig/box/jacksynth.mjs, removed 2026-09-16. NOT A MODULE; do not import it.
// The blocks are in the order they stood, each headed by where it came from.

// ── box.mjs: the archive source's idle stop ───────────────────────────────

/**
 * ⚠️ AN INFINITE LOOP AGAINST SOMEBODY ELSE'S CDN IS NOT A FEATURE.
 *
 * `-stream_loop -1` keeps the broadcast from ending, which is right while a
 * person is listening — the box is an OBJECT rather than a SESSION and is meant
 * to still be playing at three in the morning. But an archive source left
 * running in an empty room pulls ERR's segments forever for nobody: about
 * 28 MB an hour, continuously, from a public broadcaster we were already
 * blocked by once today. "Still playing" and "still downloading" are the same
 * act here, and only one of them is the point.
 *
 * So the archive — and ONLY the archive; a synth costs nobody anything — stops
 * when the room has been empty for a while. The relay's own `/stats` answers
 * how many sockets are in the room, and the box is one of them.
 */
const ARCHIVE_IDLE_MS = 5 * 60e3;
// ⚠️ THE PICTURE NEEDS THIS MORE THAN THE ARCHIVE DID, and it did not have it.
// The mirror page asks the box to draw AS SOON AS IT LOADS, so one visit leaves
// the renderer and the hardware encoder running for ever — measured: 25% of the
// machine and 2 Mbit/s into an empty room, hours after the last viewer closed
// the tab. The same reasoning was written out in full for ERR's archive this
// morning and not applied one file over. Shorter here because nobody is
// listening to a picture nobody is watching, where a broadcast might reasonably
// play on.
const VIDEO_IDLE_MS = 2 * 60e3;
let archiveWatch = null, aloneSince = null;
let videoWatch = null, videoAloneSince = null;

/** How many sockets are in a room, or null when the relay will not say. */
async function roomSockets(room) {
  try {
    const r = await fetch(`${RELAY.replace(/^ws/, 'http')}/room/${room}/stats`, { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()).sockets ?? null;
  } catch { return null; }
}

function watchArchiveListeners() {
  if (archiveWatch) return;
  aloneSince = null;
  archiveWatch = setInterval(async () => {
    if (inst?.source !== 'archive') return stopArchiveWatch();
    const sockets = await roomSockets(ROOM);
    if (sockets === null) return;              // cannot tell; do not act on a guess
    if (sockets > 1) { aloneSince = null; return; }
    aloneSince ??= Date.now();
    if (Date.now() - aloneSince < ARCHIVE_IDLE_MS) return;
    log(`archive: nobody has been in ${ROOM} for ${Math.round(ARCHIVE_IDLE_MS / 60000)} min — stopping rather than streaming ERR to an empty room`);
    send({ type: 'audio.stopped', source: 'archive', reason: 'nobody listening' });
    stopAudio();
  }, 60e3);
  archiveWatch.unref?.();
}
function stopArchiveWatch() { if (archiveWatch) { clearInterval(archiveWatch); archiveWatch = null; aloneSince = null; } }

// ── box.mjs: archiveSource(), which picked a broadcast and where in it ────
/**
 * Which broadcast, and where in it.
 *
 * A slug if one is named, otherwise one drawn at random from the cached list of
 * 1965 — which costs the archive NOTHING, because that list is on this box's
 * disk and a year that ended sixty years ago does not change. Then somewhere
 * past the announcer at the top, and far enough from the end that there is
 * something to hear.
 */
async function archiveSource(msg) {
  let slug = msg?.slug;
  let picked = null;
  if (!slug) {
    const list = await errSearch({ limit: 100 });
    if (!list.items?.length) throw new Error('the archive returned no 1965 audio');
    picked = list.items[Math.floor(Math.random() * list.items.length)];
    slug = picked.slug;
  }
  const item = await errItem(slug);
  const atSec = Number.isFinite(msg?.atSec) ? msg.atSec : 60 + Math.floor(Math.random() * 600);
  archiveNow = { slug: item.slug, title: item.title, date: item.date, atSec };
  return { hls: item.hls, atSec, ...archiveNow };
}

// ── box.mjs: the source.search / source.load / source.clear verbs ─────────

    // ── 1965, as grain material ──────────────────────────────────────────
    //
    // ⚠️ The AUDIO archive, not the video one. ERR's 298 video items from 1965
    // are `FILM 16mm m/v negatiiv helita` — silent film negatives — so
    // granulating those granulates nothing, which is a failure this engine has
    // already had once.
    case 'source.search': {
      // ⚠️ A REFUSAL IS AN ANSWER, NOT A CRASH. This used to let the fetch throw
      // and the box replied `box.error` — which no client was listening for, so
      // the page and the harness both sat for their full timeout and reported
      // "no box in this room" about a box that was answering fine. ERR blocked
      // this board's address on 2026-09-11 and that is exactly what it looked
      // like from the outside.
      try {
        const s = await errSearch({ limit: Math.min(msg.limit ?? 100, 100), page: msg.page ?? 1 });
        if (s.cached) log(`source.search: ${s.items.length} of ${s.total} from the local list — the archive was not asked`);
        return reply('source.found', { ok: true, ...s, archive: errStatus() });
      } catch (e) {
        log(`source.search: ${e.message}`);
        return reply('source.found', { ok: false, reason: e.message, holdingOff: !!e.holdingOff, archive: errStatus() });
      }
    }
    // Pull an excerpt and put it in the grain buffers. This is what turns the
    // insert into an instrument: with material in the buffer and recording
    // switched OFF, the granulator plays what you loaded rather than whatever
    // happens to be going into it.
    case 'source.load': {
      if (!fxOn) return reply('source.loaded', { ok: false, reason: 'pappus is not switched on' });
      let item;
      try { item = await errItem(msg.slug); }
      catch (e) {
        log(`source.load: ${e.message}`);
        return reply('source.loaded', { ok: false, reason: e.message, holdingOff: !!e.holdingOff, archive: errStatus() });
      }
      // 60 s because that is exactly the grain buffer's length. Asking for more
      // is silently truncated by the read, which reads as "the end of my
      // excerpt is missing" rather than as a limit.
      const dur = Math.min(msg.dur ?? 60, 60);
      // ⚠️ The offset and length are part of the NAME. Without them two
      // different minutes of the same programme are one file, so the cache
      // would hand back the first excerpt for every later request — a stale
      // answer that is real audio, which is the kind nobody notices.
      const atSec = msg.atSec ?? 0;
      const out = `/tmp/err-${msg.slug.slice(0, 40).replace(/[^a-z0-9-]/gi, '')}-${atSec}-${dur}.wav`;
      // ⚠️ `atSec`, NOT `at`. `at` IS THE ENVELOPE'S TIMESTAMP: `format()` in
      // wire.mjs spreads the message FIRST and then writes `from`/`at`/`seq`
      // over it, so a field called `at` never survives the send. This asked
      // ffmpeg to seek to second 1,789,103,743,118 of a 45-minute broadcast —
      // and ffmpeg answered with sixty seconds of real audio anyway, from
      // wherever it decided that was, so nothing anywhere read as broken while
      // the one control this feature has did nothing at all. Second time in
      // this file: `voices.listed`'s `source` was eaten by the same spread.
      const ex = await errExcerpt({ hls: item.hls, atSec, durSec: dur, out });
      const r = loadBuffers(pappus(), out);
      // ⚠️ CLOSE THE ROLLED VOICES. A roll opens about half of the eight grain
      // voices at pitches of its own, and those keep sounding — so a key press
      // was adding a NINTH voice to a chord that was already going, and moved
      // the sound by four hundredths of an octave. Measured, not reasoned:
      // 515 Hz against 531 Hz for a key an octave apart, which reads as a
      // keyboard that does nothing.
      //
      // Loading material is therefore also the moment the keyboard takes the
      // voices over, and it has to start from silence to own them.
      pappus().notes.panic();
      grainSource = { slug: item.slug, title: item.title, date: item.date, atSec, dur, tookMs: ex.tookMs };
      log(`loaded ${item.date} · ${item.title} · ${dur} s from ${atSec} s ${ex.cached ? '(from the local copy)' : `in ${ex.tookMs} ms`}`);
      return reply('source.loaded', { ok: true, ...grainSource, ...r, cached: ex.cached });
    }
    // Give the buffers back to the input. Named rather than implied, because
    // "the granulator is recording again" is not something a listener can hear
    // until the material has been overwritten.
    case 'source.clear':
      // The lock has to come off with the source. Leaving it on holds the
      // buffer against the very input that is being given back to it, so
      // recording would read as on and the sound would never change again —
      // see loadBuffers for what `lock` and `src` each actually do.
      if (pap) { pap.send('mlock', 0); pap.send('nlock', 0); pap.send('msrc', 2); pap.send('nsrc', 2); pap.notes.panic(); }
      grainSource = null;
      return reply('source.cleared', { ok: true, recording: 'stereo' });

// ── jacksynth.mjs: the `archive` entry in JACK_SYNTHS ─────────────────────
  /**
   * 1965, AS A SOURCE RATHER THAN AS A FEATURE OF THE GRANULATOR.
   *
   * It sits beside the synths because that is what it is: something that makes
   * sound into the JACK graph. Pappus is an INSERT over whatever is playing, so
   * with pappus off you hear the broadcast raw, and with pappus on you hear it
   * granulated — and neither case needs a line of its own anywhere downstream.
   * That is the whole reason to do it this way instead of as a second kind of
   * thing.
   *
   * ⚠️ TWO PROCESSES, BECAUSE FFMPEG HAS NO JACK MUXER. `ffmpeg -devices` lists
   * jack as `D` — a demuxer only — so it can READ the graph (that is how the
   * capture works) and cannot write to it. The way across is the loopback card
   * `snd-aloop`, which `setup.sh` already loads for exactly this class of
   * problem: ffmpeg plays into its playback side, `alsa_in` reads its capture
   * side and registers an ordinary JACK client.
   *
   * The cost is one resampling between two unsynchronised clocks, inside
   * `alsa_in`. A granulator could not care less; for raw playback it is a
   * correction every few minutes, and the honest alternative — a player with a
   * native JACK output — is not installed on this board (no mpv, no sox).
   *
   * ⚠️ `-re` IS A PER-INPUT OPTION and there is one input, so it belongs where
   * it is. Without it ffmpeg pulls the whole broadcast as fast as the network
   * allows and the loopback card's buffer is the only thing pacing it.
   */
  archive: {
    needs: ['jackd', 'ffmpeg', 'alsa_in'],
    // ffmpeg has to open the network stream, and alsa_in has to see a running
    // playback side before it reports a sane rate. Four seconds covers both on
    // this board; the port check below is what actually decides.
    warmup: 5000,
    portMatch: /^err1965:capture_1$/,
    portMatch2: /^err1965:capture_2$/,
    spawnAll: ({ hls, atSec = 0 } = {}) => [
      // ⚠️ `-stream_loop -1`, BECAUSE A BROADCAST ENDS. Measured: the source
      // went silent about six minutes in and everything downstream looked
      // healthy — ffmpeg had simply reached the end of a fifteen-minute sports
      // diary and exited normally. `alsa_in` keeps its JACK port either way, so
      // the graph still had `err1965:capture_1` on it, streaming silence. The
      // box is an OBJECT rather than a SESSION (plan-hardware §8.7): it is
      // supposed to still be playing at three in the morning.
      spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error',
                       '-stream_loop', '-1',
                       '-re', '-ss', String(atSec), '-i', String(hls),
                       '-ac', '2', '-ar', String(RATE),
                       '-f', 'alsa', 'plughw:Loopback,0'],
            { stdio: ['ignore', 'pipe', 'pipe'] }),
      // `-j` names the JACK client, which is what portMatch above looks for.
      // Device 1 is the other end of device 0 on snd-aloop: what is written to
      // one is readable on the other.
      spawn('alsa_in', ['-j', 'err1965', '-d', 'plughw:Loopback,1',
                        '-r', String(RATE), '-c', '2'],
            { stdio: ['ignore', 'pipe', 'pipe'] }),
    ],
  },
