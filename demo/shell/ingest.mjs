// demo/shell/ingest.mjs: the one tokenless write path to R2, as a client. The worker mints session ids
// and enforces caps in one Durable Object with a 6 hour TTL. `selfrec` is the token-gated path.
// why: lessons/kit-ingest.md#header

export const INGEST = 'https://ingest.positron.studio';
/** Where an open-tier session's objects are readable, `<base>/<session>/`. The
 *  worker's own `PUBLIC_BASE` and `PREFIX`, and `/limits` answers the same. */
export const ARCHIVE_BASE = 'https://archive.positron.studio/demo/ingest';

/**
 * Open a session. Returns `{ session, limits, expiresAt }`, or null when refused. A refusal is normal
 * (five sessions per address per hour) and carries `retryInS`.
 * why: lessons/kit-ingest.md#opensession
 */
export async function openSession({ log = () => {} } = {}) {
  const r = await fetch(`${INGEST}/open`, { method: 'POST' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    log(`R2 refused: ${j.error || r.status}${j.retryInS ? ` · retry in ${j.retryInS}s` : ''}`, 'bad');
    return null;
  }
  log(`R2 session ${j.session} · up to ${j.limits.maxSegments} pieces`, 'hi');
  return j;
}

/**
 * Store one finished recording as a single object (segment 0, session closed), return its public url.
 * A short take is well under the 2 MiB object cap; slicing one costs a dense-sequence failure mode.
 * why: lessons/kit-ingest.md#putwhole
 */
export async function putWhole(blob, { log = () => {} } = {}) {
  const sess = await openSession({ log });
  if (!sess) return null;
  if (blob.size > sess.limits.maxSegmentBytes) {
    log(`take is ${Math.round(blob.size / 1048576)} MiB, over the `
      + `${Math.round(sess.limits.maxSegmentBytes / 1048576)} MiB an object may be`, 'bad');
    return null;
  }
  const put = await fetch(`${INGEST}/seg/${sess.session}/0?fmt=webm`, { method: 'PUT', body: blob });
  if (!put.ok) {
    const j = await put.json().catch(() => ({}));
    log(`R2 refused the take: HTTP ${put.status} ${j.error || ''}`, 'bad');
    return null;
  }
  const r = await fetch(`${INGEST}/close/${sess.session}?fmt=webm`, { method: 'POST' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { log(`close refused: ${j.error || r.status}`, 'bad'); return null; }
  return { url: j.manifest, session: sess.session, expiresAt: sess.expiresAt, bytes: blob.size };
}

/**
 * A recording of unknown length, shipped as it happens. One PUT at a time, in order, since the worker
 * answers an overtaking piece with 409; one refusal stops the ship. `bytes` is the worker's own count.
 * @param {string} session  a session from `openSession`
 * @returns {{ put(Blob): void, finish(): Promise<object|null>, stats(): object }}
 * why: lessons/kit-ingest.md#createshipper
 */
export function createShipper(session, { fmt = 'webm', log = () => {} } = {}) {
  let chain = Promise.resolve(), next = 0, failed = '';
  const st = { queued: 0, segments: 0, bytes: 0, failed: '' };
  function put(blob) {
    if (!blob || !blob.size || failed) return;
    const n = next++;
    st.queued++;
    chain = chain.then(async () => {
      if (failed) return;
      const r = await fetch(`${INGEST}/seg/${session}/${n}?fmt=${fmt}`, { method: 'PUT', body: blob }).catch(() => null);
      const j = r ? await r.json().catch(() => ({})) : {};
      if (!r || !r.ok) {
        failed = st.failed = `piece ${n} refused: ${r ? `HTTP ${r.status} ${j.error || ''}`.trim() : 'no answer'}`;
        log(failed, 'bad');
        return;
      }
      st.segments = j.segments ?? st.segments + 1;
      st.bytes = j.bytes ?? st.bytes + blob.size;
    });
  }
  /** Wait for every queued piece, then close. Answers the close's body or null. */
  async function finish() {
    await chain;
    if (!st.segments) { log('nothing reached R2, so there is no recording to close', 'warn'); return null; }
    const r = await fetch(`${INGEST}/close/${session}?fmt=${fmt}`, { method: 'POST' }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) { log(`close refused: ${j.error || (r ? r.status : 'no answer')}`, 'bad'); return null; }
    return j;
  }
  return { put, finish, stats: () => ({ ...st }) };
}

/**
 * Prove a stored object is readable, which a 200 on the PUT does not. Reports the length, because
 * a HEAD 200 with `content-length: 0` is the failure this is for.
 * @returns {Promise<{ok: boolean, status: number, bytes: number|null}>}
 * why: lessons/kit-ingest.md#provereadable
 */
export async function proveReadable(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    const len = r.headers.get('content-length');
    return { ok: r.ok, status: r.status, bytes: len == null ? null : Number(len) };
  } catch {
    // A network failure is not a readable object either, and it must not throw
    // into a stop handler whose whole job is to report what landed.
    return { ok: false, status: 0, bytes: null };
  }
}

/** Fetch a stored recording back as one Blob, so playback provably comes from R2. */
export async function fetchBack(manifestUrl, mime, { log = () => {} } = {}) {
  const r = await fetch(manifestUrl);
  if (!r.ok) { log(`manifest came back ${r.status}`, 'bad'); return null; }
  const m = await r.json();
  const base = manifestUrl.replace(/manifest\.json$/, '');
  const segs = (m.segments ?? []).map((seg) =>
    typeof seg === 'string' ? seg : (seg.url ?? seg.key ?? `${seg.n}.webm`));
  if (!segs.length) { log('manifest lists no pieces', 'bad'); return null; }
  const blobs = [];
  for (const seg of segs) {
    const u = seg.startsWith('http') ? seg : `${base}${seg}`;
    const p = await fetch(u);
    if (!p.ok) { log(`piece came back ${p.status}`, 'bad'); return null; }
    blobs.push(await p.blob());
  }
  log(`fetched ${blobs.length === 1 ? 'the file' : `${blobs.length} pieces`} back from R2`, 'hi');
  return new Blob(blobs, { type: mime });
}
