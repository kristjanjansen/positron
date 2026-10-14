// positron-feedback: records visitor notes from a relay room. POST /arm, GET /feedback, GET /stats,
// POST /clear (needs FEEDBACK_KEY). The server picks the room from Origin: positron.studio writes
// `feedback`, anything else `feedback-dev`, so a harness run can never write the real one.
// why: lessons/workers-feedback.md#header

import { json as baseJson, OPEN, preflight, callerIp, keyMatches } from '../../_lib/http.mjs';
import { RelayRecorder } from '../../_lib/relay-recorder.mjs';

const RELAY = 'https://ws.positron.studio';

// The allowlist: one entry, exact match, no prefix test, no pattern.
// why: lessons/workers-feedback.md#allowlist
const LIVE_ORIGIN = 'https://positron.studio';
const LIVE_ROOM = 'feedback';
const DEV_ROOM = 'feedback-dev';

/** The server's half of the room decision. The page has the same two lines in
 *  `demo/shell/feedback.mjs` and they are checked against each other on every
 *  send, so a drift between them is loud rather than silent. */
const roomFor = (origin) => (origin === LIVE_ORIGIN ? LIVE_ROOM : DEV_ROOM);

const CAP = 2000;                          // rows kept per room
// Time retention for the SANDBOX only. The real room keeps everything until the
// cap bites: feedback from a closed group that evaporates overnight is worse
// than no feedback, because the button still says it worked.
const DEV_KEEP_MS = 24 * 60 * 60 * 1000;
const IDLE_STOP_MS = 15 * 60 * 1000;       // stop holding the socket open
const ALARM_MS = 30 * 1000;
const MAX_TEXT = 4000;                     // UTF-8 bytes
const MAX_NAME = 80;
// A note is kept only against an arm (an HTTP request whose Origin and address the sender cannot
// set):
// one note per arm for CREDIT_MS, arms counted per address hash and per room.
// why: lessons/workers-feedback.md#credit
const CREDIT_MS = 60 * 1000;
const CREDITS_MAX = 20;
const ARMS = {
  [LIVE_ROOM]: { perAddress: 12, total: 120 },   // an hour
  [DEV_ROOM]: { perAddress: 600, total: 2000 },  // the harness arms once per send
};

export class Feedback extends RelayRecorder {
  constructor(state, env) {
    super(state, env, { relay: RELAY, alarmMs: ALARM_MS, idleStopMs: IDLE_STOP_MS });
    this.credits = [];         // expiry times, one per arm not yet spent
    this.refused = 0;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS note(
      n INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT UNIQUE, at INTEGER, slug TEXT, page TEXT,
      name TEXT, text TEXT, sender TEXT, build TEXT)`);
    this.sql.exec('CREATE INDEX IF NOT EXISTS note_by_time ON note(at)');
  }

  async #meta() {
    return (await this.state.storage.get('meta')) || { seen: 0, kept: 0, lastUse: 0 };
  }

  // Join the room and return only once the socket is open, so a caller cannot race its own note.
  // why: lessons/workers-feedback.md#arm
  async #arm(room) {
    this.room = room;
    const meta = await this.#meta();
    meta.lastUse = Date.now();
    await this.state.storage.put('meta', meta);
    await this.state.storage.put('room', room);
    return this.join(room);
  }

  /** Count this arm against its address and its room for the past hour.
   *  Answers the refusal, or null when the arm may go ahead. */
  async #admit(room, who) {
    const now = Date.now();
    const lim = ARMS[room] || ARMS[DEV_ROOM];
    const arms = ((await this.state.storage.get('arms')) || []).filter((a) => now - a.at < 3600_000);
    if (arms.length >= lim.total) return 'too many notes this hour';
    if (who !== 'key' && arms.filter((a) => a.who === who).length >= lim.perAddress) return 'too many notes from this address this hour';
    arms.push({ at: now, who });
    await this.state.storage.put('arms', arms);
    this.credits = this.credits.filter((t) => t > now).concat(now + CREDIT_MS).slice(-CREDITS_MAX);
    return null;
  }

  /** Spend one arm's credit on a note, if one is still live. */
  #spend() {
    const now = Date.now();
    this.credits = this.credits.filter((t) => t > now);
    return this.credits.shift() !== undefined;
  }

  async onMessage(data) {
    if (typeof data !== 'string') return;    // a feedback note is never binary
    let m = null;
    try { m = JSON.parse(data); } catch { return; }
    if (!m || m.type !== 'feedback.say') return;

    const meta = await this.#meta();
    meta.seen++;

    // `origin` is the sender's claim and only makes a stray write lie to get
    // in. The limit is the arm credit, which only /arm can grant.
    const wantLive = this.room === LIVE_ROOM;
    const claims = String(m.origin || '');
    const text = String(m.text ?? '').trim();
    const from = String(m.from || '');
    const bad = !text ? 'empty'
      : new TextEncoder().encode(text).byteLength > MAX_TEXT ? 'too long'
      : (wantLive && claims !== LIVE_ORIGIN) ? 'wrong origin for this room'
      : !this.#spend() ? 'no arm for this note'
      : '';
    if (bad) {
      this.refused++;
      await this.state.storage.put('meta', meta);
      return;
    }

    // A repeat of the same id is the page retrying, not a second note.
    this.sql.exec(
      'INSERT OR IGNORE INTO note(id, at, slug, page, name, text, sender, build) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      String(m.id || `${Date.now()}-${from}`),
      // the send stamp: `sent`, or `at` from an older page
      // why: lessons/workers-feedback.md#sent-stamp
      Number(m.sent ?? m.at) || Date.now(),
      String(m.slug ?? '').slice(0, 64),
      String(m.page ?? '').slice(0, 200),
      String(m.name ?? '').trim().slice(0, MAX_NAME),
      text,
      from.slice(0, 32),
      String(m.build ?? '').slice(0, 40),
    );
    meta.kept++;
    this.#prune();
    await this.state.storage.put('meta', meta);
  }

  /** Pruned on write, because a SELECT over a table nobody prunes is a page
   *  that works for a week. The sandbox also ages out; the real room does not. */
  #prune() {
    if (this.room !== LIVE_ROOM) {
      this.sql.exec('DELETE FROM note WHERE at < ?', Date.now() - DEV_KEEP_MS);
    }
    this.sql.exec(
      'DELETE FROM note WHERE n <= (SELECT n FROM note ORDER BY n DESC LIMIT 1 OFFSET ?)',
      CAP,
    );
  }

  recorderMeta() { return this.#meta(); }

  rejoin(room) { return this.#arm(room); }

  #rows(url) {
    const q = url.searchParams;
    const where = [];
    const args = [];
    if (q.get('id')) { where.push('id = ?'); args.push(q.get('id')); }
    if (q.get('slug')) { where.push('slug = ?'); args.push(q.get('slug')); }
    if (q.get('since')) { where.push('at >= ?'); args.push(Number(q.get('since'))); }
    if (q.get('to')) { where.push('at <= ?'); args.push(Number(q.get('to'))); }
    return this.rows('note', where, args, Number(q.get('last')));
  }

  async #counts() {
    const [row] = [...this.sql.exec(
      'SELECT COUNT(*) AS held, MIN(at) AS oldest, MAX(at) AS newest FROM note')];
    return { held: row?.held ?? 0, oldest: row?.oldest ?? 0, newest: row?.newest ?? 0 };
  }

  async fetch(request) {
    const url = new URL(request.url);
    const room = url.searchParams.get('room') || LIVE_ROOM;
    const meta = await this.#meta();

    if (url.pathname === '/arm') {
      const no = await this.#admit(room, url.searchParams.get('who') || '');
      if (no) return json({ armed: false, room, error: no }, 429);
      const armed = await this.#arm(room);
      return json({ armed, room, live: room === LIVE_ROOM, ...(await this.#counts()) });
    }

    if (url.pathname === '/stats') {
      return json({
        room, recording: !!this.ws, cap: CAP,
        seen: meta.seen, stored: meta.kept, refused: this.refused,
        ...(await this.#counts()),
      });
    }

    if (url.pathname === '/clear') {
      this.sql.exec('DELETE FROM note');
      await this.state.storage.put('meta', { seen: 0, kept: 0, lastUse: Date.now() });
      return json({ cleared: true, room });
    }

    if (url.pathname === '/feedback') {
      meta.lastUse = Date.now();
      await this.state.storage.put('meta', meta);
      const rows = this.#rows(url);
      const counts = await this.#counts();
      const notes = rows.map((r) => ({
        id: r.id, at: r.at, when: new Date(r.at).toISOString(),
        slug: r.slug || '', page: r.page || '', name: r.name || '',
        text: r.text || '', sender: r.sender || '', build: r.build || '',
      }));
      const head = {
        ...OPEN,
        'access-control-expose-headers': 'X-Feedback',
        // what the reader is looking at, so nothing has to imply a completeness
        // it cannot check. Same idea as positron-store's X-Store.
        'X-Feedback': `room=${room};held=${counts.held};shown=${notes.length};cap=${CAP}`
          + `;oldest=${counts.oldest};newest=${counts.newest}`,
      };
      if (url.searchParams.get('format') === 'text') {
        const body = notes.map((x) => `${x.when}  ${x.slug || '(no page)'}`
          + `  ${x.name || '(no name)'}\n${x.text}\n`).join('\n');
        return new Response(
          `${room}: ${counts.held} held, ${notes.length} shown\n\n${body}`,
          { headers: { ...head, 'content-type': 'text/plain; charset=utf-8' } });
      }
      return new Response(JSON.stringify({ room, ...counts, shown: notes.length, notes }, null, 2),
        { headers: { ...head, 'content-type': 'application/json; charset=utf-8' } });
    }

    return new Response('not found', { status: 404 });
  }
}

const json = (o, status = 200) => baseJson(o, status, { 'access-control-expose-headers': 'X-Feedback' });

/** 4 bytes of SHA-256: enough to count one address's arms, not to name it. */
async function shortHash(v) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return [...new Uint8Array(d)].slice(0, 4).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// This host answers 200 JSON at `/`, so every response is marked noindex.
// Mark the wrapper, not json(): most responses are a Durable Object's, passed through verbatim.
// why: lessons/workers-feedback.md#noindex
const NOINDEX = 'noindex, nofollow';

const ROBOTS = `# feedback.positron.studio is unlisted and is not ready to be found.
# The header X-Robots-Tag does the real work; this file is the polite half.
# There is nothing here a link preview could render, so nothing is allowed.

User-agent: *
Content-Signal: search=no, ai-input=no, ai-train=no
Disallow: /
`;

// A DO response has immutable headers, and a 204 must not be given a body.
// why: lessons/workers-feedback.md#immutable
function marked(res) {
  const bodyless = res.status === 204 || res.status === 304;
  const out = new Response(bodyless ? null : res.body, res);
  out.headers.set('x-robots-tag', NOINDEX);
  return out;
}

const routes = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/robots.txt' && (request.method === 'GET' || request.method === 'HEAD')) {
      return new Response(request.method === 'HEAD' ? null : ROBOTS, {
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'public, max-age=3600',
        },
      });
    }

    if (request.method === 'OPTIONS') return preflight('GET, POST, OPTIONS', 'content-type');

    if (url.pathname === '/' || url.pathname === '') {
      return json({
        worker: 'positron-feedback',
        what: 'what a visitor typed into the box beside a demo title, carried over the relay and kept',
        usage: [
          'POST /arm                             the room comes from the Origin header, never from you',
          'GET  /feedback?room=feedback&last=50',
          'GET  /feedback?room=feedback&slug=mirror',
          'GET  /feedback?room=feedback&format=text',
          'GET  /stats?room=feedback',
        ],
        rooms: { live: LIVE_ROOM, sandbox: DEV_ROOM, decidedBy: 'the Origin header, exact match' },
        keeps: { cap: CAP, sandboxKeepMs: DEV_KEEP_MS, maxTextBytes: MAX_TEXT },
        stores: 'the text, an optional name, which page, when, and the build stamp. No address, no user agent, no visitor id',
      });
    }

    // The room is decided here from Origin, which a page cannot forge; no query or body reaches it.
    // why: lessons/workers-feedback.md#room-here
    if (url.pathname === '/arm' && request.method === 'POST') {
      const room = roomFor(request.headers.get('origin'));
      // positron-mail arms from Cloudflare's own egress, one address for every
      // mail, so a caller holding FEEDBACK_KEY is counted only in the room total.
      const who = await keyMatches(request.headers.get('x-feedback-key'), env.FEEDBACK_KEY)
        ? 'key' : await shortHash(callerIp(request));
      return env.NOTES.get(env.NOTES.idFromName(room))
        .fetch(`https://x/arm?room=${room}&who=${who}`, { method: 'POST' });
    }

    // Clearing needs FEEDBACK_KEY, and with no secret set it refuses rather than allows.
    // why: lessons/workers-feedback.md#clear-key
    if (url.pathname === '/clear' && request.method === 'POST') {
      const key = env.FEEDBACK_KEY;
      if (!await keyMatches(request.headers.get('x-feedback-key'), key)) {
        return json({ error: 'clearing needs the x-feedback-key header' }, 403);
      }
      const room = pickRoom(url.searchParams.get('room'));
      if (!room) return json({ error: 'no such room' }, 404);
      return env.NOTES.get(env.NOTES.idFromName(room)).fetch(`https://x/clear?room=${room}`);
    }

    if (url.pathname === '/feedback' || url.pathname === '/stats') {
      const room = pickRoom(url.searchParams.get('room'));
      if (!room) return json({ error: `room must be ${LIVE_ROOM} or ${DEV_ROOM}` }, 404);
      const u = new URL(url);
      u.searchParams.set('room', room);
      return env.NOTES.get(env.NOTES.idFromName(room)).fetch(u.toString());
    }

    return new Response('use POST /arm, GET /feedback, GET /stats', { status: 404 });
  },
};

export default {
  async fetch(request, env) {
    return marked(await routes.fetch(request, env));
  },
};

/** Two rooms exist and no third can be named into being. A DO namespace that
 *  takes an arbitrary string is a namespace anybody can spray. */
const pickRoom = (name) => {
  if (!name || name === LIVE_ROOM) return LIVE_ROOM;
  if (name === DEV_ROOM) return DEV_ROOM;
  return null;
};
