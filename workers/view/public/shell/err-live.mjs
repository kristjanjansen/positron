/** err-live.mjs — ERR's live HLS, as the two things a page actually needs:
 *  a MAPPING between the picture's clock and wall-clock time, and an honest
 *  answer to "will ERR hand this segment over?".
 *
 *  Promoted out of `demo/flipper/` on 2026-09-08, where every one of these
 *  lived inline. Both `flipper` and `now` import it — a promotion that leaves
 *  the original as the only caller is not a promotion (LESSONS #30).
 *
 *  THREE FACTS THIS MODULE EXISTS TO CARRY, each paid for once already:
 *
 *  1. ERR blocks live segments BY PROGRAMME, not by age, and a refusal is a
 *     403 with NO `access-control-allow-origin` — which reaches a browser as a
 *     CORS failure, so hls.js holds an empty buffer and the picture just stays
 *     black. `fetch().then(r => r.ok)` is false for a 403 that carries ACAO;
 *     `.catch()` is the 403 that does not. Both mean refused.
 *
 *  2. A SEGMENT THAT HAS FALLEN OFF THE BACK OF THE WINDOW ANSWERS THE SAME
 *     WAY — 403, no ACAO. Measured 2026-09-08: `SN − 1000` refused, `SN − 30`
 *     served, on a channel refusing nothing. So the status code cannot tell a
 *     rights refusal from an expired one, and the discriminator is MEMBERSHIP:
 *     only ever probe segments that are in the playlist you just fetched.
 *
 *  3. A refusal storm is expensive. Three consecutive `fragLoadError`s is
 *     enough to tell a wall from a blip, and the answer is `stopLoad()` rather
 *     than `pause()` — the buffer already holds real material, and pausing
 *     throws away picture the reader can still watch. Arrived at after one run
 *     issued 1794 refused requests and discarded 113 s of picture.
 */

/**
 * 🔴 ONE HOOK, BECAUSE BOTH PAGES COME THROUGH HERE. `?base=` moves every ERR
 * URL either page opens onto another host, and `demo/fake-err.mjs` is what the
 * harness puts there: a stand-in broadcaster with the same playlists, the same
 * sliding window and the same three refusal shapes. Until it existed, the two
 * pages with the most machinery in them were the two nobody could run, because
 * running them meant appearing in a public broadcaster's audience figures.
 *
 * ⚠️ IT REWRITES THE PATH AND NOTHING ELSE, which is the same shape `/tapes/`
 * already uses. With no `base` the parameter is empty and every URL is handed
 * back untouched, so a visit is byte for byte what it was.
 *
 * ⚠️ THREE HOSTS COLLAPSE ONTO ONE AND THAT IS DELIBERATE. `live.err.ee` has
 * the playlists, `www.err.ee` has the schedule and `icecast.err.ee` has the
 * radio mounts, and their paths do not collide, so one base can stand in for
 * all three. A page that needs to know which of the three it is talking to
 * would have to keep the original URL; neither does.
 */
const BASE = (typeof location !== 'undefined'
  ? new URLSearchParams(location.search).get('base') || '' : '').replace(/\/+$/, '');
export const errUrl = (u) => {
  if (!BASE || !u) return u;
  try { const x = new URL(u); return BASE + x.pathname + x.search; } catch { return u; }
};

export const CHANNELS = [
  { id: 'etv', name: 'ETV', url: errUrl('https://live.err.ee/live/etv.m3u8') },
  { id: 'etv2', name: 'ETV2', url: errUrl('https://live.err.ee/live/etv2.m3u8') },
  { id: 'etvpluss', name: 'ETV+', url: errUrl('https://live.err.ee/live/etvpluss.m3u8') },
];

/** WebKit only, and gated on ManagedMediaSource rather than on canPlayType —
 *  which answers "maybe" in Chrome AND in headless Chrome, and so put three
 *  pages on a path they could not play while their asserts stayed green. */
export const NATIVE_HLS = typeof window !== 'undefined'
  && 'ManagedMediaSource' in window
  && !!document.createElement('video').canPlayType('application/vnd.apple.mpegurl');

/** The media playlist behind a master, parsed into the parts a timeline wants.
 *
 *  `pdt` is the ONE `EXT-X-PROGRAM-DATE-TIME` ERR puts on the first segment,
 *  and it is what makes an absolute-wall-clock position domain possible at
 *  all: segment i covers `pdt + Σ EXTINF[0..i)`. `date` is the server's own
 *  clock off the response header, which is how a page can measure the
 *  visitor's clock without ever silently correcting it. */
export async function readPlaylist(masterUrl) {
  const t0 = performance.now();
  const mres = await fetch(masterUrl, { cache: 'no-store' });
  const master = await mres.text();
  const variant = master.split(/\r?\n/).find((l) => l && !l.startsWith('#'));
  if (!variant) throw new Error('master has no variant');
  const plUrl = new URL(variant, masterUrl).href;
  const pres = await fetch(plUrl, { cache: 'no-store' });
  const rtt = performance.now() - t0;
  const text = await pres.text();
  const lines = text.split(/\r?\n/);

  const segs = [];
  let dur = 0, pdt = null, mediaSeq = 0;
  for (const line of lines) {
    if (line.startsWith('#EXTINF:')) dur = Number(line.slice(8).split(',')[0]) || 0;
    else if (line.startsWith('#EXT-X-PROGRAM-DATE-TIME:')) pdt = Date.parse(line.slice(25));
    else if (line.startsWith('#EXT-X-MEDIA-SEQUENCE:')) mediaSeq = Number(line.slice(22)) || 0;
    else if (line && !line.startsWith('#')) {
      segs.push({ url: new URL(line, plUrl).href, durS: dur,
                  sn: Number(line.match(/-(\d+)\.[a-z0-9]+$/)?.[1]) });
      dur = 0;
    }
  }
  // start times, cumulative from the one PDT on the first segment
  let acc = 0;
  for (const s of segs) { s.at = pdt == null ? null : pdt + acc * 1000; acc += s.durS; }

  const serverDate = Date.parse(pres.headers.get('date') || '');
  return {
    url: plUrl, segs, mediaSeq, pdt,
    windowS: acc,
    edge: pdt == null ? null : pdt + acc * 1000,   // newest instant offered
    // the server's clock, and the round trip it was learned over — a caller
    // keeping the MINIMUM-RTT sample gets the tightest bound on the
    // disagreement. An average is dragged by every slow fetch.
    serverDate: Number.isFinite(serverDate) ? serverDate : null, rttMs: rtt,
  };
}

/** Two bytes, to ask ERR whether it will serve one segment.
 *  Only ever called with a segment FROM THE PLAYLIST JUST READ — see fact 2. */
export async function probeSegment(seg) {
  return fetch(seg.url, { headers: { range: 'bytes=0-1' }, cache: 'no-store' })
    .then((r) => (r.ok ? 'served' : 'refused'))
    .catch(() => 'refused');
}

/** Three consecutive fragment load errors is a wall, not a blip; stopLoad()
 *  keeps the picture already buffered instead of throwing it away. */
export function wallHandler(hls, Hls, onWall) {
  let run = 0;
  hls.on(Hls.Events.ERROR, (_e, x) => {
    if (x.details === 'fragLoadError' || x.details === 'fragLoadTimeOut') {
      if (++run >= 3) { run = 0; hls.stopLoad(); onWall?.(x); }
    } else if (x.details === 'fragLoaded' || !x.fatal) run = 0;
  });
  hls.on(Hls.Events.FRAG_LOADED, () => { run = 0; });
}

/** media time → wall clock, and back, on whichever engine is playing.
 *  Both directions are one subtraction; nothing here is new machinery.
 *  The DELTA form is preferred for seeking because it needs no assumption
 *  about where hls.js put its timeline origin, and stays correct across an
 *  instance rebuild. */
export function clockOf(video, hls) {
  return {
    /** the wall-clock instant of the frame on the glass, or null */
    now() {
      if (hls && Number.isFinite(hls.playingDate?.getTime?.())) return hls.playingDate.getTime();
      const start = video.getStartDate?.();
      const s = start && start.getTime();
      return Number.isFinite(s) ? s + video.currentTime * 1000 : null;
    },
    /** move the picture to a wall-clock instant; returns what was asked for */
    seek(wantMs) {
      const cur = this.now();
      if (cur == null) return null;
      video.currentTime += (wantMs - cur) / 1000;
      return wantMs;
    },
    /** the live position the ENGINE is willing to give — never the newest
     *  instant in the playlist, which is inside the hold-back and has no
     *  fetched fragment behind it. */
    live() {
      if (hls && Number.isFinite(hls.liveSyncPosition)) {
        const cur = this.now();
        if (cur == null) return null;
        return cur + (hls.liveSyncPosition - video.currentTime) * 1000;
      }
      const sk = video.seekable;
      if (!sk || !sk.length) return null;
      const start = video.getStartDate?.();
      const s = start && start.getTime();
      return Number.isFinite(s) ? s + sk.end(sk.length - 1) * 1000 : null;
    },
  };
}

/**
 * 🔴 WHERE THE BROADCASTER STOPS SERVING, FOUND BY ASKING IT TWO BYTES AT A
 * TIME. Promoted out of `demo/flipper/` on 2026-09-18, where it was called
 * `servedStart` and was the only thing on either page that could survive a
 * refused live edge. `/now/` had no such path at all: pointed at a channel
 * whose newest forty-five minutes are refused it showed black and took six
 * asserts red, all downstream of a clock that never started. Both pages call
 * this now, which is what makes it a promotion rather than a move.
 *
 * It sweeps BACK from the live edge because the answer is nearly always at the
 * edge and nearly always "yes": the first ask is the newest segment in the
 * playlist, and on a channel that serves its edge that is the only request this
 * ever makes. A channel that refuses its edge costs up to `steps` asks.
 *
 * 🔴 ONLY EVER SEGMENTS FROM THE PLAYLIST JUST READ — fact 2 at the top of this
 * file. A segment that has fallen off the back of the window answers 403 with
 * no ACAO, exactly like a rights refusal, so membership is the only thing that
 * tells the two apart.
 *
 * @param {object} pl a `readPlaylist` result
 * @param {{steps?: number, backoffS?: number}} [opts]
 * @returns {Promise<object|null>} null when there was no playlist to ask about
 *
 * The result always carries `probes` (what was asked, newest first) and
 * `blockedMin`. Exactly one of three shapes is true:
 *   `edgeServed`  the newest segment was handed over; nothing is blocked
 *   `position`    something newer than it is refused, and this is where to
 *                 start: `backoffS` behind the newest instant that was served
 *   `none`        every point asked was refused, across the whole window
 */
export async function findServedEdge(pl, { steps = 8, backoffS = 90 } = {}) {
  const segs = pl?.segs;
  if (!segs?.length) return null;
  const last = segs.length - 1;
  const durS = segs[last].durS || 2;
  const probes = [];
  for (let k = 0; k < steps; k++) {
    const i = Math.max(0, last - Math.round((k * last) / (steps - 1)));
    const seg = segs[i];
    const state = await probeSegment(seg);
    probes.push({ i, sn: seg.sn, at: seg.at, state });
    if (state !== 'served') continue;
    // The edge itself is served: leave the live-edge policy to the engine
    // rather than pinning a position on top of it.
    if (k === 0) {
      return { probes, edgeServed: true, blockedMin: 0,
               boundaryAt: seg.at, boundarySn: seg.sn, durS };
    }
    // How far BEFORE the boundary to start. Three segments left six seconds of
    // material and then the playhead walked straight into the blackout, where
    // hls.js retried refused fragments 1794 times in one run. This buys enough
    // picture to be worth watching; `wallHandler` stops the storm at the far
    // end of it.
    const at = Math.max(0, i - Math.round(backoffS / durS));
    return {
      probes, edgeServed: false,
      // THE SN, NOT THE INDEX: positions slide as the window rolls, and a
      // later probe's index means nothing in the timeline the engine holds.
      // The sequence number is the one coordinate both agree on.
      position: at * durS, sn: segs[at].sn, startAt: segs[at].at,
      boundaryAt: seg.at, boundarySn: seg.sn, durS,
      blockedMin: ((last - at) * durS) / 60,
    };
  }
  return { probes, none: true, blockedMin: ((last + 1) * durS) / 60, durS };
}

/**
 * The same question asked of several channels, one after another.
 *
 * ⚠️ THIS IS SELF-CHECK WORK AND BOTH CALLERS GATE IT. A visitor watching one
 * channel has no use for what the other two are refusing, and asking costs a
 * playlist and a probe per channel on somebody else's server. What it buys is
 * the only thing that can tell a working boundary finder from one that answers
 * the same way whatever it is asked: the three channels wear three different
 * shapes, so a run sees a refused edge and a served edge in the same breath.
 */
export async function surveyChannels(channels, opts = {}) {
  const out = [];
  for (const ch of channels) {
    try {
      const pl = await readPlaylist(ch.url);
      const found = await findServedEdge(pl, opts);
      out.push({ id: ch.id, name: ch.name, ...(found || { unreachable: true }) });
    } catch { out.push({ id: ch.id, name: ch.name, unreachable: true, probes: [] }); }
  }
  return out;
}

/**
 * One line saying what a survey found, for a log and for an assert's detail.
 * `etv 3 of 4 refused, boundary 16:02 · etv2 edge served · etvpluss edge served`
 */
export function describeSurvey(rows) {
  return rows.map((r) => {
    if (r.unreachable) return `${r.id} unreachable`;
    if (r.none) return `${r.id} refused everything`;
    if (r.edgeServed) return `${r.id} edge served`;
    const no = r.probes.filter((p) => p.state === 'refused').length;
    return `${r.id} ${no} of ${r.probes.length} refused, ${Math.round(r.blockedMin)} min blocked`;
  }).join(' · ');
}
