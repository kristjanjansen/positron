// demo/shell/ingest.mjs — the one tokenless write path to R2, as a client.
//
// `ingest.positron.studio` mints session ids server-side and enforces
// per-segment / per-session / per-address caps in a single Durable Object, with
// a 6-hour TTL and a cron that actually deletes. `selfrec` is the token-gated
// path and stays separate: a public page cannot hold a secret, which is the
// whole reason this exists.
//
// Promoted out of `demo/capture/index.html` so a second page cannot copy it —
// and with one correctness fix that the copy did not have. See `ship()`.

export const INGEST = 'https://ingest.positron.studio';

/**
 * Open a session. Returns `{ session, limits, expiresAt }` or null when refused.
 *
 * A refusal is normal and is not an error: five sessions per address per hour is
 * a real cap, and the answer carries `retryInS`. Callers should say so rather
 * than reading as broken.
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
 * Store one finished recording as a SINGLE object, and return its public url.
 *
 * The API is segment-shaped because `record` proved the disk economics of
 * ship-then-delete: across a SHOW you never hold the whole thing and the
 * high-water stays at two segments however long it runs. That argument does not
 * reach a short take — a few hundred KB, well under the 2 MiB an object may be —
 * and slicing one costs real fragility for nothing: the worker requires a DENSE
 * sequence, so one refused piece poisons every later one, and a WebM assembled
 * from timeslice chunks only plays if its header chunk arrived first.
 *
 * So a whole recording goes as segment 0 and the session is closed immediately.
 * What lands in R2 is a complete, directly playable file.
 *
 * `shipper()` — the queued per-slice version — was here and is in the history if
 * a long recording ever needs it. It fixed a real latent bug in `capture` on the
 * way: that page fires its uploads without awaiting them, so two PUTs can be in
 * flight and arrive swapped, which the worker answers with 409 out-of-order. At
 * a 2 s timeslice it has never raced; it is still worth knowing.
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
 * Prove a stored object is READABLE, which a 200 on the PUT does not.
 *
 * 🔴 "UPLOADED" AND "READABLE" ARE TWO CLAIMS AND ONLY ONE OF THEM IS THE ONE
 * ANYBODY CARES ABOUT. A PUT answering 200 says a worker accepted the bytes. It
 * does not say the object is retrievable at the public URL, and the gap between
 * those two is exactly where a recording goes missing while every log line reads
 * fine. `proto/selfrec/participant.html` makes both claims separately and this
 * is that discipline in one function.
 *
 * ⚠️ IT REPORTS THE LENGTH RATHER THAN ONLY A BOOLEAN, because a 200 on a HEAD
 * with `content-length: 0` is the failure this is for: the object exists and is
 * empty. A caller comparing that against what it sent is making the real check.
 *
 * @returns {Promise<{ok: boolean, status: number, bytes: number|null}>}
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
