// workers/items — an editorial item, scheduled by an alarm and announced by FCM.
//
// The clean-room half of `plans/plan-radio-messages.md`: one Durable Object owns the
// items, the schedule and the send. What it replaces is a per-minute cron on a
// VM polling MySQL and asking "is anything due?" — almost always told no.
//
// 🔴 AND IT MEASURES ITS OWN PUNCTUALITY, because that is the claim. Cloudflare
// documents millisecond granularity AND up to a minute of delay during
// failover, so every fire records `actual - scheduled` and `/punctuality`
// reports the distribution. Quoting the docs at somebody is not evidence; this
// project's rule is to measure the quantity in question.
//
// ── the item ────────────────────────────────────────────────────────────────
// Designed rather than inherited, then checked against what an existing client
// can consume. Two fields the radio app's schema carries are NOT here:
// `comments_enabled`, which its own Qt client references ZERO times, and
// `updated_at`, likewise. `payload` IS here and is load-bearing — their editor's
// own comment says "fields with no dedicated DB column are sent inside payload",
// and the app reads `payload.author`, `payload.startsAt` and `payload.article_id`.
//
// ── what this deliberately does not do ──────────────────────────────────────
// No media handling, no versioning, no roles, no localisation, no preview. A CMS
// does those and this does not; saying so is the difference between a proposal
// and a pitch.

const TYPES = ['text', 'audio', 'video', 'audiostream', 'videostream', 'article', 'webcontent'];
const STATUSES = ['unpublished', 'new', 'shelved', 'archived'];

const json = (body, status = 200) => new Response(JSON.stringify(body, null, 1), {
  status,
  headers: {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'cache-control': 'no-store',
  },
});

export class Items {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL,
      summary TEXT, url TEXT, tags TEXT, payload TEXT,
      status TEXT NOT NULL, publish_at INTEGER NOT NULL, shelf_at INTEGER,
      created_at INTEGER NOT NULL, announced_at INTEGER
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS fires (
      at INTEGER PRIMARY KEY, scheduled INTEGER NOT NULL, late_ms INTEGER NOT NULL,
      did INTEGER NOT NULL
    )`);
    /**
     * 🔴 THE OBJECT HAS TO REMEMBER WHICH ROOM IT IS, because the ALARM has no
     * request to read it from. `idFromName(room)` gives each room its own
     * object and then tells the object nothing about its own name — so the one
     * place that decides whether an item may reach a phone is the one place
     * with no access to the answer. Written once on the first request that
     * names it, and read back from storage on a cold wake.
     */
    this.room = null;
    ctx.blockConcurrencyWhile(async () => {
      this.room = (await ctx.storage.get('room')) ?? null;
    });

    // 🔴 NOTHING SCHEDULES AN ALARM HERE, AND THAT IS DELIBERATE. The
    // constructor runs BEFORE the handler on a cold wake, so a `setAlarm()` in
    // it overwrites the alarm that is about to fire — Cloudflare documents the
    // resulting livelock, where the handler never runs at all. Arming happens
    // where a due time actually changes: on write, and at the end of a fire.
  }

  /** The next moment anything is due, or null. */
  nextDue() {
    const r = [...this.sql.exec(`
      SELECT MIN(t) AS t FROM (
        SELECT publish_at AS t FROM items WHERE status = 'unpublished'
        UNION ALL
        SELECT shelf_at  AS t FROM items WHERE status = 'new' AND shelf_at IS NOT NULL
      )`)];
    const t = r[0]?.t;
    return t == null ? null : Number(t);
  }

  /**
   * Point the alarm at the next due moment.
   *
   * ⚠️ `getAlarm()` RETURNS NULL INSIDE A RUNNING HANDLER, and it means
   * "running", not "unscheduled". Reading it as the latter is how a schedule
   * gets silently dropped, so this never consults it — it sets unconditionally,
   * which is safe because one object has exactly one alarm and setting replaces.
   */
  async rearm() {
    const due = this.nextDue();
    if (due == null) { await this.ctx.storage.deleteAlarm(); return null; }
    // Never schedule in the past: an alarm at a time already gone fires
    // immediately and re-enters, which is a busy loop wearing a schedule.
    await this.ctx.storage.setAlarm(Math.max(due, Date.now() + 1));
    return due;
  }

  async alarm() {
    const scheduled = this.nextDue();
    const now = Date.now();
    let did = 0;

    // 🔴 THE HANDLER CATCHES ITS OWN FAILURES RATHER THAN THROWING.
    // Cloudflare retries a throwing alarm about six times over roughly two
    // minutes and then NEVER RE-RUNS IT until something calls `setAlarm()`
    // again. Two minutes is nothing against an upstream outage, and the failure
    // is silent — the schedule simply stops. So anything that can fail is
    // caught, and the alarm is re-armed before returning either way.
    try {
      const duePub = [...this.sql.exec(
        `SELECT * FROM items WHERE status = 'unpublished' AND publish_at <= ?`, now)];
      for (const row of duePub) {
        // Visibility first, announcement second. The announcement can fail; the
        // truth about what is published must not depend on it.
        this.sql.exec(`UPDATE items SET status = 'new' WHERE id = ?`, row.id);
        did++;
        try {
          // ⚠️ THE STAMP IS ONLY SET WHEN SOMETHING ACTUALLY WENT OUT. A side
          // room reaches its moment and goes live exactly as the real one does;
          // what it does not do is reach a phone, and `announced_at` is the only
          // field that says so. Stamping it anyway would make the column mean
          // "the announce step ran", which is a quieter and worse lie.
          if (await announce(this.env, row, this.room)) {
            this.sql.exec(`UPDATE items SET announced_at = ? WHERE id = ?`, Date.now(), row.id);
          }
        } catch (e) {
          console.log(`announce failed for ${row.id}: ${e.message}`);
        }
      }
      // new -> shelved, SILENTLY. Announcing a shelving would tell every reader
      // about a card leaving the top of the list, once per item, for ever.
      const dueShelf = [...this.sql.exec(
        `SELECT id FROM items WHERE status = 'new' AND shelf_at IS NOT NULL AND shelf_at <= ?`, now)];
      for (const row of dueShelf) {
        this.sql.exec(`UPDATE items SET status = 'shelved' WHERE id = ?`, row.id);
        did++;
      }
    } catch (e) {
      console.log(`alarm body failed: ${e.message}`);
    }

    if (scheduled != null) {
      this.sql.exec(`INSERT OR REPLACE INTO fires (at, scheduled, late_ms, did) VALUES (?,?,?,?)`,
        now, scheduled, now - scheduled, did);
    }
    await this.rearm();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+/, '');
    if (request.method === 'OPTIONS') return json({});

    // ⚠️ RECORDED, NOT TRUSTED PER REQUEST. The alarm fires with no request at
    // all, so the name has to be on the object before it is needed — and it is
    // written once rather than on every call, so a later request carrying a
    // different `room` for the same object cannot talk it into announcing.
    const named = url.searchParams.get('room') || 'default';
    if (this.room === null) {
      this.room = named;
      await this.ctx.storage.put('room', named);
    }

    if (path === 'items' && request.method === 'POST') {
      const body = await request.json().catch(() => null);
      if (!body) return json({ error: 'body must be JSON' }, 400);
      const bad = validate(body);
      if (bad) return json({ error: bad }, 400);
      const now = Date.now();
      const item = {
        id: body.id || crypto.randomUUID(),
        type: body.type,
        title: body.title,
        summary: body.summary ?? '',
        url: body.url ?? '',
        tags: JSON.stringify(body.tags ?? []),
        payload: JSON.stringify(body.payload ?? {}),
        // `publish_now` is the editor's own word for it, kept because a hook
        // that fires when a stream starts has no future time to name.
        publish_at: body.publish_now ? now : Number(body.publish_at),
        shelf_at: body.shelf_at == null ? null : Number(body.shelf_at),
        status: 'unpublished',
        created_at: now,
      };
      this.sql.exec(
        `INSERT OR REPLACE INTO items
         (id,type,title,summary,url,tags,payload,status,publish_at,shelf_at,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        item.id, item.type, item.title, item.summary, item.url, item.tags,
        item.payload, item.status, item.publish_at, item.shelf_at, item.created_at);
      const armed = await this.rearm();
      return json({ item: out(item), armed_for: armed });
    }

    if (path === 'items' && request.method === 'GET') {
      const status = url.searchParams.get('status');
      const rows = status
        ? [...this.sql.exec(`SELECT * FROM items WHERE status = ? ORDER BY publish_at DESC`, status)]
        : [...this.sql.exec(`SELECT * FROM items ORDER BY publish_at DESC`)];
      return json({ items: rows.map(out), next_due: this.nextDue() });
    }

    const shelve = path.match(/^items\/([^/]+)\/shelve$/);
    if (shelve && request.method === 'POST') {
      this.sql.exec(`UPDATE items SET status = 'shelved' WHERE id = ?`, shelve[1]);
      await this.rearm();
      return json({ ok: true, id: shelve[1] });
    }

    /**
     * 🔴 THE MEASUREMENT YOU CAME FOR. Every fire recorded `actual - scheduled`;
     * this is the distribution, not an average, because the claim under test is
     * about the TAIL — "usually milliseconds, up to a minute during failover"
     * is a statement a mean cannot check.
     */
    if (path === 'punctuality') {
      const rows = [...this.sql.exec(`SELECT late_ms FROM fires ORDER BY late_ms`)]
        .map((r) => Number(r.late_ms));
      const q = (p) => (rows.length ? rows[Math.min(rows.length - 1, Math.floor((p / 100) * rows.length))] : null);
      return json({
        fires: rows.length,
        late_ms: { min: rows[0] ?? null, p50: q(50), p95: q(95), max: rows[rows.length - 1] ?? null },
        all: rows,
        // 🔴 THE NAME THIS OBJECT REMEMBERS, AND WHETHER IT MAY ANNOUNCE. It is
        // written ONCE, at whatever the first request called it, and a later
        // request carrying a different `room` cannot change it — which is the
        // point, and is also a state nothing could see. An object first reached
        // without `?room=` stores `default` and then silently refuses to
        // announce for ever, while every row it holds reads `announced_at:
        // null` and looks like a failed send. Those are opposite diagnoses and
        // they were indistinguishable from outside.
        room: this.room,
        announcing: this.room === ANNOUNCING_ROOM,
        // Which of the three things `announce` needs are actually present. Not
        // the values, obviously: whether there is one.
        has_key: !!this.env?.FIREBASE_SA, has_topic: !!this.env?.FCM_TOPIC,
      });
    }

    /**
     * 🔴 A BROWSER CANNOT FINISH ITS OWN SUBSCRIPTION, AND WITHOUT THIS THE
     * INSTALLED PAGE RECEIVES NOTHING WHILE LOOKING CORRECT.
     *
     * Announcements go to an FCM TOPIC. A page can mint its own device token —
     * that needs only the public config and the VAPID key — but joining a topic
     * is an admin call that requires the service-account key, which must never
     * reach a browser. So the page ends up holding a valid address that is on no
     * topic, and every announcement sails past it: permission granted, worker
     * registered, token minted, silence.
     *
     * This is the half only the server can do, and it is here because this is
     * where the key already is.
     */
    if (path === 'subscribe' && request.method === 'POST') {
      const body = await request.json().catch(() => null);
      if (!body?.token) return json({ error: 'body needs { token }' }, 400);
      if (!this.env.FIREBASE_SA) return json({ error: 'no FIREBASE_SA secret' }, 500);
      const topic = body.topic || this.env.FCM_TOPIC;
      try {
        const sa = JSON.parse(this.env.FIREBASE_SA);
        const bearer = await accessToken(sa);
        const res = await fetch('https://iid.googleapis.com/iid/v1:batchAdd', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${bearer}`,
            'content-type': 'application/json',
            access_token_auth: 'true',
          },
          body: JSON.stringify({ to: `/topics/${topic}`, registration_tokens: [body.token] }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) return json({ error: `subscribe ${res.status}`, detail: j }, 502);
        // ⚠️ `results: [{}]` IS SUCCESS. An empty object per token is what the
        // Instance ID API returns when it worked; a failure carries an `error`
        // key. Reading "empty" as "nothing happened" would report a working
        // subscription as a broken one.
        const failed = (j.results || []).filter((r) => r && r.error);
        return json({ ok: failed.length === 0, topic, results: j.results ?? null });
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    if (path === 'clear' && request.method === 'POST') {
      this.sql.exec(`DELETE FROM items`);
      this.sql.exec(`DELETE FROM fires`);
      await this.ctx.storage.deleteAlarm();
      return json({ ok: true, cleared: true });
    }

    return json({ error: 'use POST /items, GET /items, POST /items/<id>/shelve, GET /punctuality, POST /clear' }, 404);
  }
}

const out = (r) => ({
  id: r.id, type: r.type, title: r.title, summary: r.summary, url: r.url,
  tags: JSON.parse(r.tags || '[]'), payload: JSON.parse(r.payload || '{}'),
  status: r.status, publish_at: Number(r.publish_at),
  shelf_at: r.shelf_at == null ? null : Number(r.shelf_at),
  created_at: Number(r.created_at),
  announced_at: r.announced_at == null ? null : Number(r.announced_at),
});

function validate(b) {
  if (!b.title) return 'title is required';
  if (!TYPES.includes(b.type)) return `type must be one of ${TYPES.join(', ')}`;
  if (!b.publish_now && !Number.isFinite(Number(b.publish_at))) {
    return 'publish_at (ms) or publish_now is required';
  }
  if (b.status && !STATUSES.includes(b.status)) return `status must be one of ${STATUSES.join(', ')}`;
  return null;
}

// ── FCM, the same four steps proved in proto/push/send.mjs ──────────────────
// ⚠️ NOT `firebase-admin`: it is a Node library and this is not Node. What is
// below is `fetch` plus WebCrypto, which is why the prototype could move here
// unchanged instead of being written a second time.
let cachedToken = null;   // { value, expires } — per isolate, which is enough

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function accessToken(sa) {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = b64url(new TextEncoder().encode(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  })));
  // ⚠️ THE PEM'S NEWLINES. A secret read from an env var keeps its literal `\n`
  // escapes, and `importKey` then fails with an opaque DataError that never
  // mentions newlines. This is the line that trap lands on.
  const pem = sa.private_key.replace(/\\n/g, '\n');
  const der = Uint8Array.from(
    atob(pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '')),
    (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key,
    new TextEncoder().encode(`${header}.${claims}`));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${b64url(sig)}`,
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`token ${res.status}: ${JSON.stringify(j)}`);
  cachedToken = { value: j.access_token, expires: Date.now() + (j.expires_in - 60) * 1000 };
  return cachedToken.value;
}

/**
 * 🔴 ONE TOPIC, SO ONE ROOM MAY USE IT. Rooms are separate Durable Objects —
 * `idFromName(room)` — and this was the one thing that is NOT per room: every
 * room's publishes went to the single `FCM_TOPIC`, which is the topic real
 * phones are subscribed to.
 *
 * `demo/verify.mjs` gives every run its own room, `v-items-<random>`, and
 * publishes two items into it on every pass. So the suite sent a real
 * notification to a real phone twice per run, dozens of times in an afternoon —
 * REPORTED, from the other end, as *"why do I get notifications from
 * positron?"*. The harness was correct, the page was correct, the worker was
 * correct, and the thing nobody owned was that a side room shares one loudspeaker
 * with the real one.
 *
 * ⚠️ AN ALLOWLIST OF ONE, NOT A PREFIX TEST. Refusing rooms that look like
 * `v-…` would let the next room that is not the real one through by default,
 * and the default has to be silence: a room has to be NAMED here to be able to
 * reach somebody's phone.
 */
const ANNOUNCING_ROOM = 'items';

async function announce(env, row, room) {
  if (room !== ANNOUNCING_ROOM) return false;
  if (!env.FIREBASE_SA) throw new Error('no FIREBASE_SA secret — nothing to announce with');
  if (!env.FCM_TOPIC) throw new Error('no FCM_TOPIC configured');
  const sa = JSON.parse(env.FIREBASE_SA);
  const bearer = await accessToken(sa);
  const item = out(row);
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { authorization: `Bearer ${bearer}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        message: {
          topic: env.FCM_TOPIC,
          notification: { title: item.title, body: item.summary || '' },
          // ⚠️ EVERY VALUE A STRING — FCM refuses nested objects. The whole item
          // rides along so a client CAN render without a fetch; whether it does
          // is the client's business (the radio app's deliberately re-fetches).
          data: { item_id: item.id, item_type: item.type, item: JSON.stringify(item) },
        },
      }),
    });
  const j = await res.json();
  if (!res.ok) throw new Error(`fcm ${res.status}: ${JSON.stringify(j)}`);
  return j.name;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/' ) {
      return json({ use: ['POST /items', 'GET /items', 'POST /items/<id>/shelve', 'GET /punctuality', 'POST /clear'] });
    }
    // One object for now — a room/channel key is the obvious next axis.
    const id = env.ITEMS.idFromName(url.searchParams.get('room') || 'default');
    return env.ITEMS.get(id).fetch(request);
  },
};
