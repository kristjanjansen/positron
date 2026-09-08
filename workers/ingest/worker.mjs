// positron-ingest — a TOKENLESS write path to R2, with caps.
//
// WHY IT IS SEPARATE FROM workers/selfrec. selfrec has the same R2 binding and
// would have been fewer files, but every route there is gated on
// Bearer SELFREC_TOKEN. Adding one unauthenticated route into that file makes
// the auth story "all of them except this one", which is exactly the shape that
// gets read wrong later. The public surface lives here, alone, in one file that
// can be read top to bottom.
//
// WHY TOKENLESS AT ALL. A public demo page cannot hold a secret — the same
// reasoning that made the relay tokenless. So instead of a credential, the
// blast radius is bounded by construction:
//
//   · the SERVER mints the session id, so a client cannot choose its prefix and
//     therefore cannot overwrite anybody else's
//   · every object lands under demo/ingest/<session>/ and nowhere else
//   · a segment is capped, a session is capped in both segments and bytes, and
//     an address is capped in sessions and bytes per hour
//   · everything expires, and a cron sweep actually deletes it
//
// None of those caps are advisory: they are enforced in the Durable Object that
// also does the accounting, so two parallel uploads cannot both pass a check.
//
//   POST /open                  -> { session, expiresAt, limits }
//   PUT  /seg/<session>/<n>     -> store one segment (video/mp2t)
//   POST /close/<session>       -> write index.m3u8 with ENDLIST, return the URL
//   GET  /show/<session>        -> { segments, bytes, closed, url }
//   GET  /limits                -> the caps, so a client can show them
//
// Objects are readable at https://archive.positron.studio/demo/ingest/<session>/
// which is the same public base 14 replay already plays from.

const PUBLIC_BASE = 'https://archive.positron.studio';
const PREFIX = 'demo/ingest';

// ── TIERS ──────────────────────────────────────────────────────────────────
//
// One write path, two kinds of caller. The difference between them was two
// Workers until 2026-09-08 (`positron-ingest` and `elektron-selfrec`), which is
// two implementations of one job whose only real difference is WHO IS ASKING —
// a property of a request, not of a deployment. So it is a table now.
//
// THE ONE RULE THIS FILE MUST NOT GET WRONG: `tierOf` returns `open` unless a
// token VALIDATES. Never "not open" by elimination, never a truthy check on a
// header that might be absent. The open tier is the DEFAULT VALUE, not an
// else-branch, because a mistake in the other direction is not an error — it is
// handing an anonymous caller the untimed path.
const TIERS = {
  open: {
    ttlHours: 6,                            // then the sweep deletes it
    maxSegmentBytes: 24 * 1024 * 1024,
    maxSegments: 45,
    maxSessionBytes: 24 * 1024 * 1024,
    maxSessionsPerHour: 5,                  // per principal
    maxBytesPerHour: 64 * 1024 * 1024,      // per principal
  },
  trusted: {
    ttlHours: null,                         // kept until something deletes it
    maxSegmentBytes: 5 * 1024 * 1024 * 1024,
    maxSegments: Infinity,
    maxSessionBytes: Infinity,
    maxSessionsPerHour: Infinity,
    maxBytesPerHour: Infinity,
  },
};

/**
 * Which tier is asking. `open` unless a token validates — see the note above.
 *
 * Constant-time-ish compare: a length check then a char-by-char XOR, so the
 * answer does not leak the token's prefix through timing. Overkill for a demo
 * store and free to write.
 */
export function tierOf(request, env) {
  let tier = 'open';                        // the DEFAULT, not an else-branch
  const secret = env?.SELFREC_TOKEN;
  if (!secret) return tier;
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return tier;
  const given = auth.slice(7);
  if (given.length !== secret.length) return tier;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= given.charCodeAt(i) ^ secret.charCodeAt(i);
  if (diff === 0) tier = 'trusted';
  return tier;
}

/** Every cap in one place, and served at /limits so the page can display them. */
const LIMITS = {
  // ONE OBJECT MAY BE A WHOLE SESSION.
  //
  // This was 2 MiB, sized for one 4-second segment, which was right while every
  // caller sliced. `keep` stores a whole take as a single object — slicing an
  // eight-second recording buys nothing and costs the dense-sequence fragility
  // — and against that a 2 MiB per-object cap is not a size limit, it is a
  // silent limit on how long a take may be (~18 s at 900 kbps), enforced in the
  // wrong place and reported as "segment too large".
  //
  // Raising it to the session cap changes NO abuse bound: an address is still
  // held to 5 sessions and 64 MiB an hour, and a session to 24 MiB. Those are
  // the guards; this was a shape.
  //
  // R2 itself would take ~5 GiB in one PUT. Nothing here is a platform limit.
  maxSegmentBytes: 24 * 1024 * 1024,      // one object, up to a whole session
  maxSegments: 45,                        // ~3 min at 4 s segments
  maxSessionBytes: 24 * 1024 * 1024,      // one session
  maxSessionsPerHour: 5,                  // per address
  maxBytesPerHour: 64 * 1024 * 1024,      // per address
  ttlHours: 6,                            // then the sweep deletes it
  segmentSeconds: 4,                      // what the playlist declares
};

/**
 * What a segment may be, and what it is called.
 *
 * The first version of this hardcoded .ts and wrote an HLS playlist — which is
 * right for proto/archive (ffmpeg emits real MPEG-TS) and WRONG for a browser,
 * where MediaRecorder emits WebM. An HLS playlist listing WebM segments does not
 * play, so the store is format-aware and only writes a playlist for the format
 * that can actually use one.
 */
const FORMATS = {
  ts:   { ext: 'ts',   type: 'video/mp2t',  hls: true  },
  webm: { ext: 'webm', type: 'video/webm',  hls: false },
  mp4:  { ext: 'mp4',  type: 'video/mp4',   hls: false },
};

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,PUT,POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};
const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status,
  headers: { 'content-type': 'application/json', ...CORS },
});

/** Group one address without storing it: truncated SHA-256, same as the pub DO. */
async function addrKey(request) {
  const raw = (request.headers.get('cf-connecting-ip') || '') + '|'
    + (request.headers.get('user-agent') || '').slice(0, 80);
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return [...new Uint8Array(d)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * One DO for all accounting, so the caps are actually atomic.
 *
 * A per-request check against KV or isolate-local state would let two parallel
 * uploads both read "under the cap" and both write — which is how a cap becomes
 * a suggestion. Single object, single thread, no race.
 */
export class Quota {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const op = url.pathname.slice(1);
    const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};

    if (op === 'open') return this.#open(body);
    if (op === 'charge') return this.#charge(body);
    if (op === 'get') return json(await this.#session(body.session) || { missing: true });
    if (op === 'close') return this.#close(body);
    if (op === 'sweep') return this.#sweep();
    return json({ error: 'bad op' }, 400);
  }

  async #session(id) {
    return id ? (await this.state.storage.get(`s:${id}`)) || null : null;
  }

  async #open({ addr, tier = 'open' }) {
    // The caps and the TTL come from the TIER, not from a module constant. An
    // unknown tier resolves to `open`, so a bug upstream cannot widen anything.
    const L = TIERS[tier] || TIERS.open;
    const now = Date.now();
    const hourKey = `a:${addr}`;
    const rec = (await this.state.storage.get(hourKey)) || { windowStart: now, sessions: 0, bytes: 0 };
    // a rolling hour, reset rather than decayed — simpler to reason about
    if (now - rec.windowStart > 3600_000) { rec.windowStart = now; rec.sessions = 0; rec.bytes = 0; }
    if (rec.sessions >= L.maxSessionsPerHour) {
      const retryInS = Math.ceil((rec.windowStart + 3600_000 - now) / 1000);
      return json({ error: 'session limit for this address', retryInS, limits: LIMITS }, 429);
    }
    rec.sessions++;
    await this.state.storage.put(hourKey, rec);

    // SERVER-MINTED, so a client cannot pick its own prefix and cannot collide
    // with or overwrite another session.
    const session = [...crypto.getRandomValues(new Uint8Array(8))]
      .map((b) => b.toString(16).padStart(2, '0')).join('');
    // `ttlHours: null` on the trusted tier means NO EXPIRY: the session record
    // carries no `expiresAt`, and the sweep skips anything without one.
    const expiresAt = L.ttlHours == null ? null : now + L.ttlHours * 3600_000;
    await this.state.storage.put(`s:${session}`, {
      addr, createdAt: now, expiresAt, segments: 0, bytes: 0, closed: false,
    });
    return json({ session, expiresAt, tier, limits: { ...L, segmentSeconds: LIMITS.segmentSeconds } });
  }

  async #charge({ session, addr, bytes, seq }) {
    const s = await this.#session(session);
    if (!s) return json({ error: 'unknown session' }, 404);
    if (s.closed) return json({ error: 'session already closed' }, 409);
    if (s.addr !== addr) return json({ error: 'session belongs to another client' }, 403);
    // `expiresAt == null` means the trusted tier: no expiry. Written as an
    // explicit null check because `Date.now() > null` is TRUE — a plain
    // comparison would 410 every trusted upload on its first segment.
    if (s.expiresAt != null && Date.now() > s.expiresAt) {
      return json({ error: 'session expired' }, 410);
    }
    if (bytes > LIMITS.maxSegmentBytes) {
      return json({ error: 'segment too large', bytes, max: LIMITS.maxSegmentBytes }, 413);
    }
    if (s.segments >= LIMITS.maxSegments) {
      return json({ error: 'segment count cap reached', max: LIMITS.maxSegments }, 507);
    }
    if (s.bytes + bytes > LIMITS.maxSessionBytes) {
      return json({ error: 'session byte cap reached', used: s.bytes, max: LIMITS.maxSessionBytes }, 507);
    }
    // seq must be the next one: no sparse playlists, no overwriting an earlier
    // segment with a different body.
    if (seq !== s.segments) {
      return json({ error: 'out of order', expected: s.segments, got: seq }, 409);
    }

    const hourKey = `a:${addr}`;
    const rec = (await this.state.storage.get(hourKey)) || { windowStart: Date.now(), sessions: 1, bytes: 0 };
    if (rec.bytes + bytes > LIMITS.maxBytesPerHour) {
      return json({ error: 'hourly byte cap for this address', used: rec.bytes, max: LIMITS.maxBytesPerHour }, 429);
    }
    rec.bytes += bytes;
    s.segments++;
    s.bytes += bytes;
    await this.state.storage.put(hourKey, rec);
    await this.state.storage.put(`s:${session}`, s);
    return json({ ok: true, segments: s.segments, bytes: s.bytes });
  }

  async #close({ session, addr }) {
    const s = await this.#session(session);
    if (!s) return json({ error: 'unknown session' }, 404);
    if (s.addr !== addr) return json({ error: 'session belongs to another client' }, 403);
    s.closed = true;
    await this.state.storage.put(`s:${session}`, s);
    return json({ ok: true, segments: s.segments, bytes: s.bytes });
  }

  /**
   * Delete what has expired. Called by cron, because a TTL that nothing enforces
   * is a comment rather than a limit.
   */
  async #sweep() {
    const now = Date.now();
    const all = await this.state.storage.list({ prefix: 's:' });
    let deleted = 0, objects = 0;
    for (const [key, s] of all) {
      // SKIP ANYTHING WITH NO EXPIRY. `now <= null` is FALSE, so without this
      // the sweep would fall straight through and delete every trusted session
      // on its first run — the worst bug available in this file, and it is one
      // coercion away from being written.
      if (s.expiresAt == null) continue;
      if (now <= s.expiresAt) continue;
      const id = key.slice(2);
      // list and delete every object under this session's prefix
      let cursor;
      do {
        const page = await this.env.ARCHIVE.list({ prefix: `${PREFIX}/${id}/`, cursor });
        if (page.objects.length) {
          await this.env.ARCHIVE.delete(page.objects.map((o) => o.key));
          objects += page.objects.length;
        }
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);
      await this.state.storage.delete(key);
      deleted++;
    }
    return json({ swept: deleted, objects });
  }
}

const quota = (env) => env.QUOTA.get(env.QUOTA.idFromName('v1'));

async function ask(env, op, body) {
  const r = await quota(env).fetch(`https://q/${op}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  return { status: r.status, body: await r.json() };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    if (request.method === 'GET' && parts[0] === 'limits') return json({ limits: LIMITS, publicBase: `${PUBLIC_BASE}/${PREFIX}` });

    if (request.method === 'POST' && parts[0] === 'open' && parts.length === 1) {
      // The PRINCIPAL is the address for an anonymous caller and the token's
      // tier for a trusted one, so a trusted caller's quota is not charged
      // against whatever network it happens to be on.
      const tier = tierOf(request, env);
      const addr = tier === 'trusted' ? 'tier:trusted' : await addrKey(request);
      const r = await ask(env, 'open', { addr, tier });
      return json(r.body, r.status);
    }

    // PUT /seg/<session>/<n>
    if (request.method === 'PUT' && parts[0] === 'seg' && parts.length === 3) {
      const [, session, seqRaw] = parts;
      const seq = Number(seqRaw);
      if (!/^[0-9a-f]{16}$/.test(session) || !Number.isInteger(seq) || seq < 0) {
        return json({ error: 'bad session or sequence' }, 400);
      }
      const fmt = FORMATS[url.searchParams.get('fmt') || 'ts'];
      if (!fmt) return json({ error: 'bad fmt', allowed: Object.keys(FORMATS) }, 400);
      // Read the body FIRST so the charge is against the real length rather than
      // a client-declared content-length.
      const buf = await request.arrayBuffer();
      const addr = await addrKey(request);
      const charged = await ask(env, 'charge', { session, addr, bytes: buf.byteLength, seq });
      if (charged.status !== 200) return json(charged.body, charged.status);
      const key = `${PREFIX}/${session}/seg${String(seq).padStart(5, '0')}.${fmt.ext}`;
      await env.ARCHIVE.put(key, buf, { httpMetadata: { contentType: fmt.type } });
      return json({ ok: true, key, ...charged.body });
    }

    // POST /close/<session>
    if (request.method === 'POST' && parts[0] === 'close' && parts.length === 2) {
      const session = parts[1];
      if (!/^[0-9a-f]{16}$/.test(session)) return json({ error: 'bad session' }, 400);
      const addr = await addrKey(request);
      const closed = await ask(env, 'close', { session, addr });
      if (closed.status !== 200) return json(closed.body, closed.status);
      const n = closed.body.segments;
      const fmt = FORMATS[url.searchParams.get('fmt') || 'ts'] || FORMATS.ts;
      const names = [];
      for (let i = 0; i < n; i++) names.push(`seg${String(i).padStart(5, '0')}.${fmt.ext}`);

      // ALWAYS a manifest, because every format needs an ordered list and a
      // player that cannot use HLS still needs to know what to fetch.
      const base = `${PUBLIC_BASE}/${PREFIX}/${session}`;
      await env.ARCHIVE.put(`${PREFIX}/${session}/manifest.json`, JSON.stringify({
        session, segments: names, bytes: closed.body.bytes,
        segmentSeconds: LIMITS.segmentSeconds, format: fmt.ext, base,
      }), { httpMetadata: { contentType: 'application/json' } });

      // A VOD playlist ONLY for a format that can be in one. proto/archive's
      // ffmpeg output is real MPEG-TS and plays; WebM in an m3u8 does not.
      let hlsUrl = null;
      if (fmt.hls) {
        const lines = [
          '#EXTM3U', '#EXT-X-VERSION:3', '#EXT-X-PLAYLIST-TYPE:VOD',
          `#EXT-X-TARGETDURATION:${LIMITS.segmentSeconds}`, '#EXT-X-MEDIA-SEQUENCE:0',
        ];
        for (const nm of names) lines.push(`#EXTINF:${LIMITS.segmentSeconds}.000,`, nm);
        lines.push('#EXT-X-ENDLIST', '');
        await env.ARCHIVE.put(`${PREFIX}/${session}/index.m3u8`, lines.join('\n'), {
          httpMetadata: { contentType: 'application/vnd.apple.mpegurl' },
        });
        hlsUrl = `${base}/index.m3u8`;
      }
      return json({
        ok: true, segments: n, bytes: closed.body.bytes, format: fmt.ext,
        manifest: `${base}/manifest.json`, hls: hlsUrl, base,
      });
    }

    if (request.method === 'GET' && parts[0] === 'show' && parts.length === 2) {
      const r = await ask(env, 'get', { session: parts[1] });
      return json({ ...r.body, url: `${PUBLIC_BASE}/${PREFIX}/${parts[1]}/index.m3u8` }, r.status);
    }

    return json({
      worker: 'positron-ingest',
      note: 'tokenless, capped. POST /open, PUT /seg/<session>/<n>, POST /close/<session>',
      limits: LIMITS,
    }, 404);
  },

  /** Cron: enforce the TTL. */
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(ask(env, 'sweep', {}));
  },
};
