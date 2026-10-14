/**
 * err-live.mjs: ERR's live HLS as a media-to-wall-clock mapping and an honest answer to whether ERR
 * serves a segment. A refusal (by programme, or off the window's back) is a 403, often without ACAO;
 * only probe playlist members. After three `fragLoadError`s, `stopLoad()`, never `pause()`.
 * why: lessons/kit-err-live.md#header
 */

/**
 * One hook: `?base=` rewrites the path of every ERR URL onto another host (demo/fake-err.mjs in
 * the harness). Empty base leaves URLs untouched; live, www and icecast paths do not collide.
 * why: lessons/kit-err-live.md#base
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

/**
 * The media playlist behind a master. `pdt` anchors wall clock; `date` is the server's clock.
 * Pass `variant` back to refresh, or every fetch mints a new ERR session. A refused playlist throws;
 * `masterRead` says whether the master was read.
 * why: lessons/kit-err-live.md#readplaylist
 */
export async function readPlaylist(masterUrl, { variant = null } = {}) {
  const t0 = performance.now();
  let plUrl = variant, pres = null, masterRead = false;
  if (plUrl) {
    pres = await fetch(plUrl, { cache: 'no-store' }).catch(() => null);
    if (!pres?.ok) { pres = null; plUrl = null; }
  }
  if (!pres) {
    const mres = await fetch(masterUrl, { cache: 'no-store' });
    if (!mres.ok) throw new Error(`master ${mres.status}`);
    masterRead = true;
    const master = await mres.text();
    const line = master.split(/\r?\n/).find((l) => l && !l.startsWith('#'));
    if (!line) throw new Error('master has no variant');
    plUrl = new URL(line, masterUrl).href;
    pres = await fetch(plUrl, { cache: 'no-store' });
    if (!pres.ok) throw new Error(`variant ${pres.status}`);
  }
  const rtt = performance.now() - t0;
  const text = await pres.text();
  const lines = text.split(/\r?\n/);

  const segs = [];
  let dur = 0, pdt = null, mediaSeq = 0;
  for (const line of lines) {
    if (line.startsWith('#EXTINF:')) dur = Number(line.slice(8).split(',')[0]) || 0;
    else if (line.startsWith('#EXT-X-PROGRAM-DATE-TIME:')) pdt ??= Date.parse(line.slice(25));
    else if (line.startsWith('#EXT-X-MEDIA-SEQUENCE:')) mediaSeq = Number(line.slice(22)) || 0;
    else if (line && !line.startsWith('#')) {
      // The sequence number is `MEDIA-SEQUENCE + index`, as hls.js's `frag.sn`, never parsed from the name.
      // why: lessons/kit-err-live.md#sn
      segs.push({ url: new URL(line, plUrl).href, durS: dur, sn: mediaSeq + segs.length });
      dur = 0;
    }
  }
  // start times, cumulative from the one PDT on the first segment
  // (`??=` keeps the FIRST, so a playlist with a PDT on every segment would
  // still be anchored at its head rather than two hours in the future)
  let acc = 0;
  for (const s of segs) { s.at = pdt == null ? null : pdt + acc * 1000; acc += s.durS; }

  const serverDate = Date.parse(pres.headers.get('date') || '');
  return {
    url: plUrl, variant: plUrl, masterRead, segs, mediaSeq, pdt,
    windowS: acc,
    edge: pdt == null ? null : pdt + acc * 1000,   // newest instant offered
    // the server's clock, and the round trip it was learned over — a caller
    // keeping the MINIMUM-RTT sample gets the tightest bound on the
    // disagreement. An average is dragged by every slow fetch.
    serverDate: Number.isFinite(serverDate) ? serverDate : null, rttMs: rtt,
  };
}

/**
 * Two bytes, to ask ERR whether it will serve one segment from the playlist just read.
 * why: lessons/kit-err-live.md#probesegment
 */
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
 * Where the broadcaster stops serving, swept back from the live edge two bytes at a time (one ask
 * when the edge is served, up to `steps`). Only segments from the playlist just read.
 * @param {object} pl a `readPlaylist` result
 * @param {{steps?: number, backoffS?: number}} [opts]
 * @returns {Promise<object|null>} null when there was no playlist; carries `probes`, `blockedMin`
 *   and one of `edgeServed`, `position` (start `backoffS` behind the newest served) or `none`
 * why: lessons/kit-err-live.md#findservededge
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
    // Start `backoffS` before the boundary: three segments left 6 s and then 1794 refused retries.
    // why: lessons/kit-err-live.md#backoff
    const at = Math.max(0, i - Math.round(backoffS / durS));
    return {
      probes, edgeServed: false,
      // The sn, not the index: positions slide as the window rolls.
      // why: lessons/kit-err-live.md#position-sn
      position: at * durS, sn: segs[at].sn, startAt: segs[at].at,
      boundaryAt: seg.at, boundarySn: seg.sn, durS,
      blockedMin: ((last - at) * durS) / 60,
    };
  }
  return { probes, none: true, blockedMin: ((last + 1) * durS) / 60, durS };
}

/**
 * The same question asked of several channels in turn. Self-check work, gated by both callers:
 * it costs somebody else's server.
 * why: lessons/kit-err-live.md#surveychannels
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
