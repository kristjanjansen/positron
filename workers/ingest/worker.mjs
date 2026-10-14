// positron-ingest: a tokenless write path to R2 under demo/ingest/<session>/, bounded by caps
// enforced in one Durable Object. The server mints session ids; a cron deletes what expired.
// POST /open, PUT /seg/<session>/<n>, POST /close/<session>, GET /show/<session>, GET /limits.
// why: lessons/workers-ingest.md#header

import { json as baseJson, OPEN } from '../_lib/http.mjs';

const PUBLIC_BASE = 'https://archive.positron.studio';
const PREFIX = 'demo/ingest';

// One tier: a token-gated tier answered 403 on every segment and had no caller.
// why: lessons/workers-ingest.md#one-tier

/** Every cap in one place, and served at /limits so the page can display them. */
const LIMITS = {
  // One object may be a whole session; the abuse bounds are the session and address caps.
  // R2 itself takes about 5 GiB in one PUT, so nothing here is a platform limit.
  // why: lessons/workers-ingest.md#segment-cap
  maxSegmentBytes: 24 * 1024 * 1024,      // one object, up to a whole session
  maxSegments: 45,                        // ~3 min at 4 s segments
  maxSessionBytes: 24 * 1024 * 1024,      // one session
  maxSessionsPerHour: 5,                  // per address
  maxBytesPerHour: 64 * 1024 * 1024,      // per address
  ttlHours: 6,                            // then the sweep deletes it
  segmentSeconds: 4,                      // what the playlist declares
};

// Format-aware: MediaRecorder emits WebM and ffmpeg MPEG-TS, and an HLS playlist of WebM
// segments does not play, so a playlist is written only for a format that can use one.
// why: lessons/workers-ingest.md#formats
const FORMATS = {
  ts:   { ext: 'ts',   type: 'video/mp2t',  hls: true  },
  webm: { ext: 'webm', type: 'video/webm',  hls: false },
  mp4:  { ext: 'mp4',  type: 'video/mp4',   hls: false },
};

const CORS = {
  ...OPEN,
  'access-control-allow-methods': 'GET,PUT,POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};
const json = (o, status = 200) => baseJson(o, status, CORS);

/** Group one address without storing it: truncated SHA-256, same as the pub DO. */
async function addrKey(request) {
  const raw = (request.headers.get('cf-connecting-ip') || '') + '|'
    + (request.headers.get('user-agent') || '').slice(0, 80);
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return [...new Uint8Array(d)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// One Durable Object for all accounting, so two parallel uploads cannot both pass a cap.
// why: lessons/workers-ingest.md#quota
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

  async #open({ addr }) {
    const L = LIMITS;
    const now = Date.now();
    const hourKey = `a:${addr}`;
    const rec = (await this.state.storage.get(hourKey)) || { windowStart: now, sessions: 0, bytes: 0 };
    // a rolling hour, reset rather than decayed
    // why: lessons/workers-ingest.md#window
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
    const expiresAt = now + L.ttlHours * 3600_000;
    await this.state.storage.put(`s:${session}`, {
      addr, createdAt: now, expiresAt, segments: 0, bytes: 0, closed: false,
    });
    return json({ session, expiresAt, tier: 'open', limits: L });
  }

  async #charge({ session, addr, bytes, seq }) {
    const s = await this.#session(session);
    if (!s) return json({ error: 'unknown session' }, 404);
    if (s.closed) return json({ error: 'session already closed' }, 409);
    if (s.addr !== addr) return json({ error: 'session belongs to another client' }, 403);
    // `!= null`: a session the retired trusted tier opened has no expiry, and
    // `Date.now() > null` is true.
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

  // Delete what has expired, from cron: a TTL nothing enforces is not a limit.
  // why: lessons/workers-ingest.md#sweep
  async #sweep() {
    const now = Date.now();
    const all = await this.state.storage.list({ prefix: 's:' });
    let deleted = 0, objects = 0;
    for (const [key, s] of all) {
      // A session with no expiry was opened by the retired trusted tier to be
      // kept; `now <= null` is false, so without this line it would be deleted.
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
    // The per-address hour windows, once their hour is over.
    let windows = 0;
    for (const [key, rec] of await this.state.storage.list({ prefix: 'a:' })) {
      if (now - (rec.windowStart || 0) > 3600_000) { await this.state.storage.delete(key); windows++; }
    }
    return json({ swept: deleted, objects, windows });
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
      const r = await ask(env, 'open', { addr: await addrKey(request) });
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
