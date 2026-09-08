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

export const CHANNELS = [
  { id: 'etv', name: 'ETV', url: 'https://live.err.ee/live/etv.m3u8' },
  { id: 'etv2', name: 'ETV2', url: 'https://live.err.ee/live/etv2.m3u8' },
  { id: 'etvpluss', name: 'ETV+', url: 'https://live.err.ee/live/etvpluss.m3u8' },
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
