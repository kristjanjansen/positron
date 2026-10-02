// positron-vain: a broadcast goes into R2 in pieces, and comes back out with
// byte ranges. No SQL, no Cloudflare Stream, no second copy of the truth.
//
// It is the sibling of `workers/ingest` and says so on purpose: same design,
// second deployment, different material. That file's whole argument is that one
// auth story lives in one file, so a second kind of caller gets a second worker
// rather than a second branch. Read its header before changing this one.
//
//   POST /open                 {name, size, type, intent} -> {id, key, pieceBytes, pieces, limits}
//   PUT  /piece/<id>/<n>       the bytes                  -> {ok, n, bytes, sent, etag}
//   POST /close/<id>           {meta}                     -> {ok, url, key, bytes, parts}
//   POST /abort/<id>                                      -> {ok}
//   GET  /limits                                          -> the caps, so a page can show them
//   GET  /list?store=<vain|vain-dev>                      -> the recordings, newest first
//   GET  /show/<id>                                       -> one upload in flight
//   GET  /a/<store>/<recording>/<file>                    -> the bytes, with Range
//
// WHY PIECES OF 16 MiB (plan-vain-upload §3). A Worker's request body limit is
// a property of the ZONE plan, and positron.studio is on Free, where it is
// 100 MB. A two-hour broadcast at the bitrate their own server records is
// 115.2 MB, so it does not fit in one request. A design that never sends more
// than 16 MiB is right on every plan and needs nobody to remember which one
// this is. It also makes an acknowledgement arrive every 16 MiB, from the far
// side of the wire, which is the only kind of progress that is evidence.
//
// 🔴 THE PIECE SIZE IS FIXED BY THIS SERVER AT `/open` AND NEVER ADAPTS. R2
// refuses a multipart upload whose non-trailing parts are not all the same size
// (error 10048, `InvalidPart`), so a client that speeds up when the link looks
// good fails at `complete()`, after every byte has been sent. The refusal is
// brought forward to the piece itself here: a non-final piece that is not
// exactly `pieceBytes` is a 400 at the moment it arrives, rather than a 400
// twenty minutes later about a file that is already uploaded.
//
// 🔴 THE TIER IS THE DEFAULT VALUE, NEVER AN ELSE-BRANCH. `tierOf` returns
// `check` unless a token validates, exactly as `workers/ingest`'s `tierOf`
// returns `open`. A mistake in the other direction is not an error, it is
// handing an anonymous caller the permanent archive. The demo page holds no
// token and cannot hold one, so it can only ever write into the sandbox
// prefix, which the cron below takes away again.
//
// 🔴 AND THE ORIGIN IS A SECOND, INDEPENDENT FENCE. A browser cannot forge
// `Origin`, so even a page that somehow held the token is refused the kept tier
// unless it is the published site. Two gates that fail in different ways, which
// is the shape `demo/shell/feedback.mjs` arrived at for the same problem.
//
// WHY THE READ ROUTE IS HERE AT ALL. plan-vain-upload §9 wants a public bucket
// on a custom domain and nothing in front of it, because an R2 custom domain
// returns its own CORS headers. Making this bucket public is an action this
// machine refuses, so the read path is a worker for now, and §9 already named
// that case: "if the archive ever needs to not be public, that is the moment a
// read worker earns its place, and it will look a great deal like shout's
// /rec/ branch". It does. Every line of `/a/` below is from that branch.

// The MP3 test is `demo/shell/mp3-frames.mjs` and not a sync-word check written
// here. Its docstring is the reason: eleven set bits occur in ordinary audio
// about once every 2 KB by chance, so a bare `0xFF 0xEx` test passes on a JPEG
// often enough to matter. It validates every field and confirms a candidate by
// finding another header one frame later. The module imports nothing and
// touches no browser global, so it bundles into a Worker unchanged; a copy of
// it here would be the second implementation this repo has twice paid for.
import { frameStarts } from '../../demo/shell/mp3-frames.mjs';

// Where the bytes are read back from. It is THIS worker today; the day the
// bucket goes public on `vain.positron.studio` this becomes that host and
// nothing else changes, because every page reads it from `GET /limits`.
const READ_PATH = '/a';

// ── the two prefixes ────────────────────────────────────────────────────────
//
// A directory per recording, so `list({prefix, delimiter: '/'})` returns the
// RECORDINGS rather than every file, ordered by upload time by construction.
// The key encodes the UPLOAD time and never the recorded one: correcting a
// recorded date must never mean copying a 100 MB object.
const STORE = {
  keep:  'vain',        // permanent. Token required, live origin required.
  check: 'vain-dev',    // the sandbox. Expires, and the cron actually deletes it.
};

const LIVE_ORIGIN = 'https://positron.studio';

// ── the caps ────────────────────────────────────────────────────────────────
//
// Argued from the material rather than picked (plan-vain-upload §6). 500 MB is
// 8.7 hours of their 128 kbit/s mount, which is longer than any broadcast in
// the material, and 29 minutes of a 48 kHz 24-bit stereo master, which is a
// plausible studio file. The per-address hour is a PLACEHOLDER and says so: it
// should be set from the first month of real use, not from a guess made before
// there is any.
const PIECE_BYTES = 16 * 1024 * 1024;
const TIERS = {
  keep: {
    maxFileBytes: 500 * 1024 * 1024,
    maxBytesPerHour: 4 * 1024 * 1024 * 1024,   // per principal. A placeholder.
    maxSessionsPerHour: 40,
    ttlHours: null,                            // kept until something deletes it
  },
  check: {
    // 🔴 EXACTLY THREE PIECES, AND THE THIRD DIGIT IS THE POINT. This was
    // 8 MiB, which is one piece with room to spare: enough for the harness's
    // own 800 KB check and not enough for anything else, which sounded like
    // the right size for a sandbox. It made the page's own piece loop
    // UNTESTABLE above one piece, on a route whose whole subject is what
    // happens after the first one. The worker's loop was measured at six
    // pieces from node, and the page's is a second implementation of the same
    // sequence that no cap allowed anybody to run.
    //
    // 48 MiB takes a 40 MB file through a non-final piece, a second
    // non-final piece and a short trailing one, which is every case R2's
    // uniform-part rule can refuse. It is still far under a broadcast, and it
    // expires in six hours with a cron that deletes it.
    maxFileBytes: 48 * 1024 * 1024,
    maxBytesPerHour: 256 * 1024 * 1024,
    maxSessionsPerHour: 200,
    ttlHours: 6,
  },
};
// R2's own ceiling, READ from developers.cloudflare.com/r2/platform/limits/ on
// 2026-09-15: 10,000 parts. At 16 MiB that is 156 GiB, three orders of
// magnitude past anything in this material, so it can only ever be hit by a
// declared size that is nonsense.
const MAX_PARTS = 10000;

/**
 * What a file may be, and what the bytes have to say for themselves.
 *
 * 🔴 `File.type` IS A CLIENT CLAIM DERIVED FROM THE EXTENSION. It is a hint for
 * the form and it is never the check. The extension picks the row; the first
 * bytes of piece 0 have to agree with it, and a disagreement is a 415 that
 * NAMES THE FIRST FOUR BYTES, so the person can see why rather than being told
 * no.
 */
const FORMATS = {
  mp3:  { type: 'audio/mpeg', sniff: isMp3 },
  wav:  { type: 'audio/wav',  sniff: (b) => tag(b, 0) === 'RIFF' && tag(b, 8) === 'WAVE' },
  flac: { type: 'audio/flac', sniff: (b) => tag(b, 0) === 'fLaC' },
  ogg:  { type: 'audio/ogg',  sniff: (b) => tag(b, 0) === 'OggS' },
  opus: { type: 'audio/ogg',  sniff: (b) => tag(b, 0) === 'OggS' },
  m4a:  { type: 'audio/mp4',  sniff: (b) => tag(b, 4) === 'ftyp' },
  mp4:  { type: 'audio/mp4',  sniff: (b) => tag(b, 4) === 'ftyp' },
};

const EXPOSE = [
  // A page that cannot read `content-length` or `content-range` cannot draw a
  // scrub bar, which is the whole point of the read route.
  'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag',
  'content-type', 'x-vain-key',
].join(', ');

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,HEAD,PUT,POST,OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
  'access-control-expose-headers': EXPOSE,
  'access-control-max-age': '86400',
};

const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS },
});

// ── helpers on bytes ────────────────────────────────────────────────────────

/** Four ASCII bytes at `i`, or '' when there are not four there. */
function tag(b, i) {
  if (i + 4 > b.length) return '';
  return String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);
}

/** `49 44 33 04`, which is what a 415 has to say rather than "wrong format". */
const hex4 = (b) => [...b.slice(0, 4)].map((x) => x.toString(16).padStart(2, '0')).join(' ');

/** The same four bytes as characters, with anything unprintable as a dot. */
const text4 = (b) => [...b.slice(0, 4)]
  .map((x) => (x >= 0x20 && x < 0x7f ? String.fromCharCode(x) : '.')).join('');

/**
 * An MP3 begins with an ID3v2 tag or with a real Layer III frame, and a tag is
 * not evidence on its own: anything can carry one. So a tag is SKIPPED rather
 * than accepted, and the frames behind it are what answers.
 */
function isMp3(b) {
  let off = 0;
  if (tag(b, 0).slice(0, 3) === 'ID3' && b.length > 10) {
    // The length is syncsafe: seven bits of each of the four size bytes.
    const size = (b[6] & 0x7f) << 21 | (b[7] & 0x7f) << 14 | (b[8] & 0x7f) << 7 | (b[9] & 0x7f);
    off = 10 + size;
    // A tag longer than the piece we were given is not a refusal: it is a file
    // whose first frames we have not seen. Nothing else can be said, so say the
    // tag is enough and let the object be written.
    if (off >= b.length) return true;
  }
  const { frames } = frameStarts(b.subarray(off), 0, { confirm: true, framing: 'mpeg' });
  return frames.length >= 3;
}

/** `20260915-143012` from a Date, which is what sorts a listing by upload time. */
function stamp(ms) {
  const d = new Date(ms);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`
    + `-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

/** Group one address without storing it. Same shape as workers/ingest. */
async function addrKey(request) {
  const raw = (request.headers.get('cf-connecting-ip') || '') + '|'
    + (request.headers.get('user-agent') || '').slice(0, 80);
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return [...new Uint8Array(d)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Which tier is asking. `check` unless a token validates AND the origin is the
 * published site or there is no browser behind the request at all.
 *
 * Constant-time-ish compare, lifted from `workers/ingest`: a length check then
 * a char-by-char XOR, so the answer does not leak the token's prefix.
 */
export function tierOf(request, env) {
  const tier = 'check';                           // the DEFAULT, not an else-branch
  const secret = env?.VAIN_TOKEN;
  if (!secret) return tier;
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return tier;
  const given = auth.slice(7);
  if (given.length !== secret.length) return tier;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= given.charCodeAt(i) ^ secret.charCodeAt(i);
  if (diff !== 0) return tier;
  // The second fence. A browser cannot forge `Origin`; a request with none is
  // not a browser, and holding the token is the whole of its claim.
  const origin = request.headers.get('origin');
  if (origin && origin !== LIVE_ORIGIN) return tier;
  return 'keep';
}

// ── the date model, checked rather than invented ────────────────────────────
//
// 🔴 THERE IS NO NEW DATE MODEL HERE AND THERE MUST NOT BE ONE. Every date in
// this project goes through `normalizeWhen` in `timeline/transport.mjs`: a
// closed-open bracket, a REQUIRED versioned rule so a changed heuristic is one
// query away, and a `kind` saying whether narrowing it would be a repair or a
// falsification. The page runs that function on the real module before it sends
// anything. This is the server refusing to store what it cannot re-audit, which
// is a different job from parsing.
const RULE_RE = /^[a-z0-9][a-z0-9-]*@\d+$/;
const RULE_UNVERSIONED = ['hand', 'unknown'];

function checkWhen(w, where) {
  if (w === undefined || w === null) return null;
  if (typeof w !== 'object' || Array.isArray(w)) throw new Error(`${where} must be an object`);
  const earliest = Number(w.earliest);
  if (!Number.isFinite(earliest)) throw new Error(`${where}.earliest must be a finite number of ms`);
  const latest = w.latest === undefined || w.latest === null ? null : Number(w.latest);
  if (latest !== null && !(latest > earliest)) {
    throw new Error(`${where}: the bracket is closed-open, so latest must be greater than earliest. `
      + 'A crisp position is expressed by leaving the date out entirely.');
  }
  const rule = String(w.rule || '');
  if (!RULE_RE.test(rule) && !RULE_UNVERSIONED.includes(rule)) {
    throw new Error(`${where}.rule '${rule}' must be versioned as '<name>@<int>'. `
      + `The only unversioned literals are ${RULE_UNVERSIONED.join(' and ')}.`);
  }
  if (!['ignorance', 'vagueness'].includes(w.kind)) {
    throw new Error(`${where}.kind must be 'ignorance' or 'vagueness'`);
  }
  // ⚠️ AN OVERRIDE WITH NO `verbatim` AND NO `note` IS NOT AN OVERRIDE, IT IS A
  // NUMBER NOBODY CAN QUESTION. `hand` means a human typed it, so both are
  // required and the refusal says which is missing.
  if (rule === 'hand') {
    if (!String(w.verbatim || '').trim()) throw new Error(`${where}.verbatim is required when the rule is 'hand': what did the person actually write`);
    if (!String(w.note || '').trim()) throw new Error(`${where}.note is required when the rule is 'hand': who corrected it, and when`);
  }
  return {
    earliest, latest,
    rule, kind: w.kind,
    verbatim: w.verbatim == null ? null : String(w.verbatim).slice(0, 200),
    note: w.note == null ? null : String(w.note).slice(0, 400),
  };
}

// ── the Durable Object ──────────────────────────────────────────────────────

/**
 * Who owns an upload in flight.
 *
 * 🔴 IT IS NOT ONE QUESTION, AND ASKING IT AS ONE MEANT THE ARCHIVE TIER COULD
 * NEVER UPLOAD A BYTE. `/open` records the PRINCIPAL, which is the token for a
 * kept upload and a hash of the address for a sandbox one, exactly as
 * `workers/ingest` does so that a trusted caller is not charged against
 * whatever network it happens to be on. Every later route then compared the
 * address hash against a session whose principal was the string `tier:keep`,
 * which can never match: every piece of every kept upload answered 403.
 *
 * MEASURED before this function existed: the sandbox path was green end to end
 * while the archive path could not accept piece 0, and no check that used the
 * sandbox could see it. That is plan-vain-upload's first risk in miniature, one
 * layer down from the one it warns about.
 */
const owns = (s, addr, tier) => (s.tier === 'keep' ? tier === 'keep' : s.addr === addr);

/**
 * One object does all the accounting, so the caps are atomic.
 *
 * A per-request check against isolate state lets two parallel uploads both read
 * "under the cap" and both write, which is how a cap becomes a suggestion.
 *
 * ⚠️ AND EVERY HANDLER IS SERIALISED THROUGH ONE PROMISE CHAIN. The input gate
 * holds events back across a `storage.get`, so handlers cannot interleave
 * there, but it does NOT cover any other await, and the part list is a
 * read-modify-write across one. Two pieces a millisecond apart would race each
 * other into it in the wrong order, and a lost part is a `complete()` that
 * fails after every byte has been sent. Where order is the product, serialise.
 */
export class Uploads {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.chain = Promise.resolve();
  }

  fetch(request) {
    const run = this.chain.then(() => this.#handle(request), () => this.#handle(request));
    // The chain must not be poisoned by one failed handler, and it must not
    // keep the result alive either.
    this.chain = run.then(() => {}, () => {});
    return run;
  }

  async #handle(request) {
    const op = new URL(request.url).pathname.slice(1);
    const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
    if (op === 'open') return this.#open(body);
    if (op === 'claim') return this.#claim(body);
    if (op === 'record') return this.#record(body);
    if (op === 'ready') return this.#ready(body);
    if (op === 'done') return this.#done(body);
    if (op === 'abort') return this.#abort(body);
    if (op === 'get') return json((await this.#session(body.id)) || { missing: true });
    if (op === 'sweep') return this.#sweep();
    return json({ error: 'bad op' }, 400);
  }

  #session(id) {
    return id ? this.state.storage.get(`s:${id}`).then((s) => s || null) : Promise.resolve(null);
  }

  async #open({ addr, tier, name, ext, size, type, contentType }) {
    const L = TIERS[tier] || TIERS.check;
    const now = Date.now();

    if (!Number.isInteger(size) || size <= 0) {
      return json({ error: 'size must be a positive whole number of bytes', size }, 400);
    }
    if (size > L.maxFileBytes) {
      return json({ error: 'that file is larger than this archive takes', size, max: L.maxFileBytes, tier }, 413);
    }
    const pieces = Math.max(1, Math.ceil(size / PIECE_BYTES));
    if (pieces > MAX_PARTS) {
      return json({ error: 'that many pieces is past what R2 will assemble', pieces, max: MAX_PARTS }, 413);
    }

    const hourKey = `a:${addr}`;
    const rec = (await this.state.storage.get(hourKey)) || { windowStart: now, sessions: 0, bytes: 0 };
    if (now - rec.windowStart > 3600_000) { rec.windowStart = now; rec.sessions = 0; rec.bytes = 0; }
    if (rec.sessions >= L.maxSessionsPerHour) {
      const retryInS = Math.ceil((rec.windowStart + 3600_000 - now) / 1000);
      return json({ error: 'too many uploads from here in the last hour', retryInS }, 429);
    }
    rec.sessions++;
    await this.state.storage.put(hourKey, rec);

    // SERVER-MINTED, both of them. A client that picks its own prefix can
    // overwrite somebody else's, and a client that picks its own id can collide
    // with one. This is `workers/ingest`'s rule and it has the same reason.
    const id = [...crypto.getRandomValues(new Uint8Array(8))]
      .map((b) => b.toString(16).padStart(2, '0')).join('');
    const dir = `${STORE[tier] || STORE.check}/${stamp(now)}-${id}`;
    const key = `${dir}/audio.${ext}`;
    const expiresAt = L.ttlHours == null ? null : now + L.ttlHours * 3600_000;

    await this.state.storage.put(`s:${id}`, {
      id, addr, tier, dir, key, ext, contentType,
      name: String(name || '').slice(0, 200),
      declaredSize: size,
      declaredType: String(type || '').slice(0, 80),
      pieceBytes: PIECE_BYTES, pieces,
      next: 0, bytes: 0, parts: [], uploadId: null,
      createdAt: now, expiresAt, closed: false,
    });
    return json({
      id, key, dir, ext, contentType, tier,
      pieceBytes: PIECE_BYTES, pieces, size,
      expiresAt,
      limits: { ...L, pieceBytes: PIECE_BYTES, maxParts: MAX_PARTS },
    });
  }

  /**
   * May piece `n` of `bytes` be written, and is this the one that creates the
   * multipart upload?
   *
   * Charged against the length the Worker actually read, never a declared
   * `content-length`. A declared size that was a lie is caught at piece 0.
   */
  async #claim({ id, addr, tier, n, bytes }) {
    const s = await this.#session(id);
    if (!s) return json({ error: 'unknown upload' }, 404);
    if (!owns(s, addr, tier)) return json({ error: 'that upload belongs to another client' }, 403);
    if (s.closed) return json({ error: 'that upload is already closed' }, 409);
    // `expiresAt == null` is the kept tier, written as an explicit null check
    // because `Date.now() > null` is TRUE and a plain comparison would answer
    // 410 to every permanent upload on its first piece.
    if (s.expiresAt != null && Date.now() > s.expiresAt) return json({ error: 'that upload expired' }, 410);
    if (n !== s.next) return json({ error: 'pieces go in order', expected: s.next, got: n }, 409);

    // 🔴 THE UNIFORM-PART RULE, ENFORCED AT THE PIECE RATHER THAN AT THE END.
    // R2 answers 10048 `InvalidPart` at `complete()` when the non-trailing
    // parts are not all one size, which is a refusal that arrives after the
    // whole file has crossed the wire. Here it costs one piece.
    const last = n === s.pieces - 1;
    const want = last ? s.declaredSize - n * s.pieceBytes : s.pieceBytes;
    if (bytes !== want) {
      return json({
        error: last ? 'the last piece is not the size the declared length leaves for it'
                    : 'every piece but the last must be exactly one piece long',
        n, got: bytes, want, pieceBytes: s.pieceBytes,
      }, 400);
    }
    if (s.bytes + bytes > s.declaredSize) {
      return json({ error: 'that is more than was declared at the start', sent: s.bytes + bytes, declared: s.declaredSize }, 413);
    }

    const L = TIERS[s.tier] || TIERS.check;
    const hourKey = `a:${s.addr}`;
    const rec = (await this.state.storage.get(hourKey)) || { windowStart: Date.now(), sessions: 1, bytes: 0 };
    if (rec.bytes + bytes > L.maxBytesPerHour) {
      const retryInS = Math.ceil((rec.windowStart + 3600_000 - Date.now()) / 1000);
      return json({ error: 'hourly byte cap for this address', used: rec.bytes, max: L.maxBytesPerHour, retryInS }, 429);
    }
    // Reserved now, released never: a piece that is charged and then fails to
    // reach R2 has still used the uplink it is being charged for.
    rec.bytes += bytes;
    await this.state.storage.put(hourKey, rec);
    return json({ ok: true, create: n === 0, key: s.key, contentType: s.contentType, uploadId: s.uploadId, last });
  }

  /** The part landed. Keep its etag, or `complete()` cannot name it. */
  async #record({ id, n, bytes, etag, uploadId }) {
    const s = await this.#session(id);
    if (!s) return json({ error: 'unknown upload' }, 404);
    if (n !== s.next) return json({ error: 'pieces go in order', expected: s.next, got: n }, 409);
    if (n === 0) s.uploadId = uploadId;
    s.parts.push({ partNumber: n + 1, etag });
    s.next = n + 1;
    s.bytes += bytes;
    await this.state.storage.put(`s:${id}`, s);
    return json({ ok: true, n, bytes: s.bytes, pieces: s.pieces, accepted: s.next });
  }

  /** Everything is in. Hand back what `complete()` needs, and nothing else. */
  async #ready({ id, addr, tier }) {
    const s = await this.#session(id);
    if (!s) return json({ error: 'unknown upload' }, 404);
    if (!owns(s, addr, tier)) return json({ error: 'that upload belongs to another client' }, 403);
    if (s.closed) return json({ error: 'that upload is already closed' }, 409);
    if (s.next !== s.pieces) {
      return json({ error: 'not every piece arrived', accepted: s.next, pieces: s.pieces }, 409);
    }
    // 🔴 THE THIRD POINT OF ENFORCEMENT. The declared size was a courtesy at
    // `/open` and the piece sizes were checked one at a time; this is the sum
    // of what was actually read, compared with what was promised. A file that
    // lied at the start cannot be completed here.
    if (s.bytes !== s.declaredSize) {
      return json({ error: 'the bytes read do not match the declared length', read: s.bytes, declared: s.declaredSize }, 409);
    }
    return json({ ok: true, key: s.key, dir: s.dir, uploadId: s.uploadId, parts: s.parts,
      bytes: s.bytes, pieces: s.pieces, pieceBytes: s.pieceBytes, tier: s.tier,
      name: s.name, declaredType: s.declaredType, contentType: s.contentType, createdAt: s.createdAt });
  }

  async #done({ id }) {
    const s = await this.#session(id);
    if (!s) return json({ error: 'unknown upload' }, 404);
    s.closed = true;
    await this.state.storage.put(`s:${id}`, s);
    return json({ ok: true });
  }

  async #abort({ id, addr, tier }) {
    const s = await this.#session(id);
    if (!s) return json({ error: 'unknown upload' }, 404);
    if (!owns(s, addr, tier)) return json({ error: 'that upload belongs to another client' }, 403);
    s.closed = true;
    await this.state.storage.put(`s:${id}`, s);
    return json({ ok: true, key: s.key, uploadId: s.uploadId });
  }

  /**
   * Delete what has expired. A TTL nothing enforces is a comment.
   *
   * ⚠️ SKIP ANYTHING WITH NO EXPIRY, EXPLICITLY. `now <= null` is FALSE, so
   * without this line the sweep falls straight through and deletes every kept
   * session on its first run. That is the worst bug available in this file and
   * it is one coercion away from being written; `workers/ingest` carries the
   * same line with the same warning.
   */
  async #sweep() {
    const now = Date.now();
    const all = await this.state.storage.list({ prefix: 's:' });
    let swept = 0, objects = 0;
    for (const [k, s] of all) {
      if (s.expiresAt == null) continue;
      if (now <= s.expiresAt) continue;
      let cursor;
      do {
        const page = await this.env.ARCHIVE.list({ prefix: `${s.dir}/`, cursor });
        if (page.objects.length) {
          await this.env.ARCHIVE.delete(page.objects.map((o) => o.key));
          objects += page.objects.length;
        }
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);
      // An upload that never completed is not an object, so there is nothing to
      // delete for it, but its multipart upload should not sit for seven days
      // waiting for R2 to abort it either.
      if (s.uploadId && !s.closed) {
        try { await this.env.ARCHIVE.resumeMultipartUpload(s.key, s.uploadId).abort(); } catch { /* already gone */ }
      }
      await this.state.storage.delete(k);
      swept++;
    }
    return json({ swept, objects });
  }
}

const vault = (env) => env.UPLOADS.get(env.UPLOADS.idFromName('v1'));

async function ask(env, op, body) {
  const r = await vault(env).fetch(`https://u/${op}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  return { status: r.status, body: await r.json() };
}

// ── the read path ───────────────────────────────────────────────────────────
//
// A PATTERN, NOT A PATH PARAMETER, for the reason `workers/shout` gives about
// its own `/rec/`: `?key=` would make this an open reader for every object in
// the bucket, including ones a later feature puts there. A recording directory
// is a datestamp and sixteen hex characters, and a file in it is one of three
// names. No slashes to traverse, no dots beyond the one.
const READ_DIR = /^\d{8}-\d{6}-[0-9a-f]{16}$/;
const READ_FILE = /^(audio\.(mp3|wav|flac|ogg|opus|m4a|mp4)|meta\.json)$/;
// A recording never changes once it is written. Worth caching at the edge and
// worth a client keeping. The sidecar is NOT: it is the one rewritable thing in
// this design, and a cached correction that nobody sees is the whole reason §8
// put the editable half in its own object.
const AUDIO_CACHE = 'public, max-age=86400, immutable';

async function serveObject(env, req, key) {
  const range = req.headers.get('range');
  const isMeta = key.endsWith('/meta.json');
  let object;
  try {
    object = await (req.method === 'HEAD' && !range
      ? env.ARCHIVE.head(key)
      : env.ARCHIVE.get(key, range ? { range: req.headers } : {}));
  } catch (e) {
    // R2 throws on a range it cannot satisfy. 416 is the answer a client can
    // act on; a 500 here would read as the archive being down.
    return new Response(`that range is not in this file: ${e.message}`, { status: 416, headers: CORS });
  }
  if (!object) return new Response('no such recording', { status: 404, headers: CORS });

  const h = new Headers(CORS);
  object.writeHttpMetadata(h);
  h.set('etag', object.httpEtag);
  h.set('accept-ranges', 'bytes');
  h.set('cache-control', isMeta ? 'no-store' : AUDIO_CACHE);
  h.set('x-vain-key', key);
  if (object.uploaded) h.set('last-modified', new Date(object.uploaded).toUTCString());

  // 🔴 A RANGE ANSWERS 206, AND A GUARD WRITTEN ON `ok` REPORTS A WORKING SEEK
  // AS A BROKEN ORIGIN. `shout`'s branch carries that line for the same reason.
  if (range && object.range) {
    const off = object.range.offset ?? 0;
    const len = object.range.length ?? (object.size - off);
    h.set('content-range', `bytes ${off}-${off + len - 1}/${object.size}`);
    h.set('content-length', String(len));
    return new Response(req.method === 'HEAD' ? null : object.body, { status: 206, headers: h });
  }
  h.set('content-length', String(object.size));
  return new Response(req.method === 'HEAD' ? null : (object.body ?? null), { status: 200, headers: h });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const readBase = `${url.origin}${READ_PATH}`;

    // GET /a/<store>/<recording>/<file>
    if ((request.method === 'GET' || request.method === 'HEAD')
        && parts[0] === 'a' && parts.length === 4) {
      const [, store, dir, file] = parts;
      if (!Object.values(STORE).includes(store) || !READ_DIR.test(dir) || !READ_FILE.test(file)) {
        return new Response('no such recording', { status: 404, headers: CORS });
      }
      return serveObject(env, request, `${store}/${dir}/${file}`);
    }

    if (request.method === 'GET' && parts[0] === 'limits' && parts.length === 1) {
      return json({
        limits: { ...TIERS.check, pieceBytes: PIECE_BYTES, maxParts: MAX_PARTS },
        tiers: TIERS, pieceBytes: PIECE_BYTES, maxParts: MAX_PARTS,
        formats: Object.keys(FORMATS),
        stores: STORE, readBase,
        // What the tier would be for THIS request, so a page can say which
        // store it is about to write into rather than assuming.
        tier: tierOf(request, env),
      });
    }

    // GET /list?store=vain
    //
    // 🔴 `list()` IS THE INDEX, AND THERE IS NO OTHER ONE. A directory per
    // recording means one call with a delimiter returns the RECORDINGS rather
    // than every file, ordered by upload time because the key begins with it,
    // and reversed here for newest first. plan-vain-upload §8 is explicit that
    // a cached `index.json` waits until a sweep is MEASURABLY slow: building
    // the cache first means building a cache nobody can measure against the
    // thing it caches. The honest ceiling is 1,000 keys a page and it is
    // reported rather than discovered.
    if (request.method === 'GET' && parts[0] === 'list' && parts.length === 1) {
      const store = url.searchParams.get('store') === STORE.keep ? STORE.keep : STORE.check;
      const page = await env.ARCHIVE.list({ prefix: `${store}/`, delimiter: '/', limit: 1000 });
      const dirs = (page.delimitedPrefixes || []).map((p) => p.replace(/\/$/, '')).reverse();
      return json({
        store, recordings: dirs, count: dirs.length,
        truncated: !!page.truncated, pageLimit: 1000,
        readBase,
      });
    }

    // GET /show/<id>: what the accounting object thinks, for a page that lost
    // its own record of an upload in flight.
    if (request.method === 'GET' && parts[0] === 'show' && parts.length === 2) {
      const r = await ask(env, 'get', { id: parts[1] });
      return json(r.body, r.status);
    }

    if (request.method === 'POST' && parts[0] === 'open' && parts.length === 1) {
      const body = await request.json().catch(() => ({}));
      const tier = tierOf(request, env);
      // `intent: 'check'` FORCES the sandbox even for a caller that could have
      // had the archive. It is how a page runs the whole route as a check
      // without a special case anywhere else, and a gate that can only ever
      // narrow cannot widen anything by mistake.
      const wanted = body.intent === 'check' ? 'check' : tier;
      const name = String(body.name || '');
      const ext = (name.split('.').pop() || '').toLowerCase();
      const fmt = FORMATS[ext];
      if (!fmt) {
        return json({
          error: 'this archive takes audio files, and that name does not end in one of these',
          ext: ext || null, allowed: Object.keys(FORMATS),
        }, 400);
      }
      const addr = wanted === 'keep' ? 'tier:keep' : await addrKey(request);
      const r = await ask(env, 'open', {
        addr, tier: wanted, name, ext, contentType: fmt.type,
        size: Number(body.size), type: body.type,
      });
      if (r.status !== 200) return json(r.body, r.status);
      return json({ ...r.body, readBase, url: `${readBase}/${r.body.key}` });
    }

    // PUT /piece/<id>/<n>
    if (request.method === 'PUT' && parts[0] === 'piece' && parts.length === 3) {
      const [, id, nRaw] = parts;
      const n = Number(nRaw);
      if (!/^[0-9a-f]{16}$/.test(id) || !Number.isInteger(n) || n < 0) {
        return json({ error: 'bad upload id or piece number' }, 400);
      }
      // THE BODY IS READ FIRST, so the charge is against the real length rather
      // than a header anybody can type.
      const buf = await request.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const addr = await addrKey(request);
      const claim = await ask(env, 'claim', { id, addr, tier: tierOf(request, env), n, bytes: buf.byteLength });
      if (claim.status !== 200) return json(claim.body, claim.status);

      let uploadId = claim.body.uploadId;
      if (claim.body.create) {
        // 🔴 THE MAGIC NUMBER IS CHECKED BEFORE ANYTHING EXISTS IN R2. A refused
        // first piece leaves the bucket untouched: no object, and not even a
        // multipart upload waiting seven days to be abandoned. It is also why a
        // harness run that only ever tests the refusal writes nothing at all.
        const ext = claim.body.key.split('.').pop();
        const fmt = FORMATS[ext];
        if (!fmt.sniff(bytes)) {
          return json({
            error: `that file is named .${ext} and does not begin like one`,
            saw: hex4(bytes), text: text4(bytes), ext,
          }, 415);
        }
        const mpu = await env.ARCHIVE.createMultipartUpload(claim.body.key, {
          httpMetadata: { contentType: claim.body.contentType },
        });
        uploadId = mpu.uploadId;
      }
      const mpu = env.ARCHIVE.resumeMultipartUpload(claim.body.key, uploadId);
      const part = await mpu.uploadPart(n + 1, buf);
      const rec = await ask(env, 'record', { id, n, bytes: buf.byteLength, etag: part.etag, uploadId });
      if (rec.status !== 200) return json(rec.body, rec.status);
      return json({ ok: true, n, bytes: buf.byteLength, etag: part.etag, ...rec.body });
    }

    // POST /close/<id>
    if (request.method === 'POST' && parts[0] === 'close' && parts.length === 2) {
      const id = parts[1];
      if (!/^[0-9a-f]{16}$/.test(id)) return json({ error: 'bad upload id' }, 400);
      const body = await request.json().catch(() => ({}));
      const addr = await addrKey(request);
      const meta = body.meta || {};

      let when, whenRead;
      try {
        when = checkWhen(meta.when, 'when');
        whenRead = checkWhen(meta.whenRead, 'whenRead');
      } catch (e) {
        return json({ error: String(e.message) }, 400);
      }

      const ready = await ask(env, 'ready', { id, addr, tier: tierOf(request, env) });
      if (ready.status !== 200) return json(ready.body, ready.status);
      const s = ready.body;

      // 🔴 THE AUDIO IS WRITTEN FIRST AND THE SIDECAR LAST, AND THE ORDER IS THE
      // WHOLE ANSWER TO THE TWO-WRITE PROBLEM. A half-failure then leaves audio
      // with no sidecar, which can be repaired by reading the audio again. The
      // other order leaves a record pointing at nothing, which is a ghost that
      // outlives everybody who remembers what it was.
      const mpu = env.ARCHIVE.resumeMultipartUpload(s.key, s.uploadId);
      const object = await mpu.complete(s.parts);

      const uploadedAt = new Date().toISOString();
      const record = {
        id, key: s.key, dir: s.dir, tier: s.tier,
        name: s.name,
        title: String(meta.title || '').slice(0, 200) || s.name,
        by: String(meta.by || '').slice(0, 120),
        note: String(meta.note || '').slice(0, 600),
        bytes: object.size, pieces: s.pieces, pieceBytes: s.pieceBytes,
        parts: s.parts.length,
        type: s.contentType, declaredType: s.declaredType,
        etag: object.httpEtag,
        uploadedAt,
        // Both rows, always. A read date carries its versioned rule and a typed
        // one carries `hand`, so a reader can tell them apart without being
        // told anything, and the read one is still there to re-audit when the
        // heuristic that produced it changes.
        when: when || whenRead || null,
        whenRead: whenRead || null,
        audio: `${readBase}/${s.key}`,
      };
      const metaKey = `${s.dir}/meta.json`;
      await env.ARCHIVE.put(metaKey, JSON.stringify(record, null, 2), {
        httpMetadata: { contentType: 'application/json' },
      });
      await ask(env, 'done', { id });
      return json({
        ok: true, key: s.key, dir: s.dir, bytes: object.size, parts: s.parts.length,
        pieces: s.pieces, url: `${readBase}/${s.key}`, meta: `${readBase}/${metaKey}`,
        record,
      });
    }

    if (request.method === 'POST' && parts[0] === 'abort' && parts.length === 2) {
      const id = parts[1];
      if (!/^[0-9a-f]{16}$/.test(id)) return json({ error: 'bad upload id' }, 400);
      const addr = await addrKey(request);
      const r = await ask(env, 'abort', { id, addr, tier: tierOf(request, env) });
      if (r.status !== 200) return json(r.body, r.status);
      if (r.body.uploadId) {
        try { await env.ARCHIVE.resumeMultipartUpload(r.body.key, r.body.uploadId).abort(); } catch { /* already gone */ }
      }
      return json({ ok: true });
    }

    return json({
      worker: 'positron-vain',
      note: 'POST /open, PUT /piece/<id>/<n>, POST /close/<id>, POST /abort/<id>, GET /limits',
      readBase,
    }, 404);
  },

  /** Cron: the sandbox tier's TTL, enforced rather than described. */
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(ask(env, 'sweep', {}));
  },
};
