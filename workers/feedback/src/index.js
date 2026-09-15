/**
 * positron-feedback — what a visitor typed, kept. feedback.positron.studio
 *
 * Every shelled page carries a button beside its title. It opens a box, you
 * write a few lines, and the lines travel the same way everything else in this
 * project travels: over the verbatim relay, into a room of their own, to a
 * recorder that joined that room as an ordinary socket. This worker is the
 * recorder and the reader.
 *
 *   POST /arm                          wake the recorder into this origin's room
 *   GET  /feedback?room=&last=&slug=   what is stored, as JSON (or text)
 *   GET  /stats?room=
 *   POST /clear?room=                  needs FEEDBACK_KEY, which is unset by default
 *
 * 🔴 THE ONE THING THIS FILE EXISTS TO GET RIGHT: A SUITE RUN MUST NOT BE ABLE
 * TO WRITE HERE. `demo/verify.mjs` presses every control on every page on every
 * run, and CLAUDE.md records at length what happened the last time a shared
 * resource sat behind forty partitioned ones — one FCM topic, and every run of
 * the suite sent two real notifications to every real subscriber for a day. The
 * lesson it drew is the one applied here: **an allowlist of ONE, never a test
 * for things that LOOK like tests, because the default has to be silence.**
 *
 * So there are two rooms and the SERVER picks which one, from a header a page
 * cannot forge:
 *
 *   Origin: https://positron.studio   ->  room `feedback`      the real one
 *   anything else, or no Origin       ->  room `feedback-dev`  a sandbox
 *
 * A harness runs on 127.0.0.1, so it resolves to the sandbox and its writes
 * land in a different Durable Object that the real table never reads. `curl`
 * sends no Origin at all and gets the sandbox too. There is no parameter, body
 * field or path that can move a write into `feedback` from anywhere else: the
 * room is computed here, from `request.headers.get('origin')`, and nowhere
 * else. ⚠️ The page derives the same room from `location.origin` and CHECKS the
 * two agree, because a page writing into a room nobody is recording is the
 * silent failure this design is trying not to have.
 *
 * ⚠️ READS ARE NOT GUARDED and are not meant to be. `/feedback` takes an
 * explicit `room` so an agent with `curl` — which has no Origin — can read the
 * real one. The page is unlisted, not secret: a token pasted into a public page
 * is a published token, which is the same argument that made the relay
 * tokenless. Nothing here is worth more protection than that buys.
 *
 * What is NOT stored, deliberately: no IP address (the recorder never sees the
 * sender's request — it hears the message over the relay), no user agent, no
 * screen size, no language, no cookie and no lasting visitor id. `sender` is
 * the wire's per-CONNECTION id, which dies with the socket. Nobody typed any of
 * the rest, and a page should keep what a visitor typed.
 */

const RELAY = 'https://ws.positron.studio';

// 🔴 THE ALLOWLIST. One entry, exact match, no prefix test, no pattern.
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
// ⚠️ PER SOCKET, WHICH IS NOT PER PERSON AND THE COMMENT SAYS SO RATHER THAN
// IMPLYING OTHERWISE. The page opens a fresh connection for every send, so this
// does not bind somebody pressing the button over and over — that is bounded in
// the page, where it can be refused with a reason. What this catches is one
// connection held open and flooded, which is the shape a flood actually takes,
// and the only shape the recorder can see: it hears messages over the relay and
// never sees a request, so there is no address here to count against.
const PER_MIN = 20;                        // notes accepted from one socket a minute

export class Feedback {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sql = state.storage.sql;
    this.ws = null;
    this.room = null;
    // ORDER IS THE PRODUCT, so handling is serialised through one chain. A DO's
    // input gate holds events back across a STORAGE await and NOT across
    // anything else, so two frames a millisecond apart would otherwise race
    // each other into the table. positron-store learned this the same way.
    this.chain = Promise.resolve();
    // in memory only, and lost on hibernation — which is fine, because this is
    // an anti-flood and not a security boundary. The boundary is the origin.
    this.rate = new Map();
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

  /**
   * Join the room and do not return until the socket is open, so a caller that
   * sends the moment this answers cannot race its own message into a room the
   * recorder has not reached yet. Same reason positron-store awaits it.
   */
  async #arm(room) {
    this.room = room;
    const meta = await this.#meta();
    meta.lastUse = Date.now();
    await this.state.storage.put('meta', meta);
    await this.state.storage.put('room', room);

    if (this.ws && this.ws.readyState === WebSocket.READY_STATE_OPEN) return true;

    const res = await fetch(`${RELAY}/room/${room}/ws`, { headers: { Upgrade: 'websocket' } });
    if (res.status !== 101 || !res.webSocket) return false;
    const ws = res.webSocket;
    ws.accept();
    ws.addEventListener('message', (e) => {
      this.chain = this.chain.then(() => this.#onMessage(e.data)).catch(() => {});
    });
    ws.addEventListener('close', () => { if (this.ws === ws) this.ws = null; });
    ws.addEventListener('error', () => { if (this.ws === ws) this.ws = null; });
    this.ws = ws;
    await this.state.storage.setAlarm(Date.now() + ALARM_MS);
    return true;
  }

  /** How many notes this socket has landed in the current minute. */
  #overRate(from) {
    const minute = Math.floor(Date.now() / 60000);
    const seen = this.rate.get(from);
    if (!seen || seen.minute !== minute) { this.rate.set(from, { minute, n: 1 }); return false; }
    seen.n++;
    return seen.n > PER_MIN;
  }

  async #onMessage(data) {
    if (typeof data !== 'string') return;    // a feedback note is never binary
    let m = null;
    try { m = JSON.parse(data); } catch { return; }
    if (!m || m.type !== 'feedback.say') return;

    const meta = await this.#meta();
    meta.seen++;

    // ⚠️ THE SENDER'S OWN CLAIM ABOUT WHERE IT IS, and it is the BELT rather
    // than the braces: a message can say anything. The braces are `/arm`, which
    // will not put this recorder in the real room for any other origin. What
    // this adds is that a write into the real room has to LIE to get in, rather
    // than slip in while a real visitor happens to be holding the room open.
    const wantLive = this.room === LIVE_ROOM;
    const claims = String(m.origin || '');
    const text = String(m.text ?? '').trim();
    const from = String(m.from || '');
    const bad = !text ? 'empty'
      : new TextEncoder().encode(text).byteLength > MAX_TEXT ? 'too long'
      : (wantLive && claims !== LIVE_ORIGIN) ? 'wrong origin for this room'
      : this.#overRate(from) ? 'over the per minute cap'
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
      Number(m.at) || Date.now(),
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

  async alarm() {
    const meta = await this.#meta();
    const room = this.room || (await this.state.storage.get('room'));
    if (!room) return;
    this.room = room;
    if (Date.now() - meta.lastUse > IDLE_STOP_MS) {
      try { this.ws?.close(1000, 'idle'); } catch { /* already gone */ }
      this.ws = null;
      return;                                // let the object sleep
    }
    if (!this.ws) await this.#arm(room);
    await this.state.storage.setAlarm(Date.now() + ALARM_MS);
  }

  #rows(url) {
    const q = url.searchParams;
    const where = [];
    const args = [];
    if (q.get('id')) { where.push('id = ?'); args.push(q.get('id')); }
    if (q.get('slug')) { where.push('slug = ?'); args.push(q.get('slug')); }
    if (q.get('since')) { where.push('at >= ?'); args.push(Number(q.get('since'))); }
    if (q.get('to')) { where.push('at <= ?'); args.push(Number(q.get('to'))); }
    const w = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    const last = Number(q.get('last'));
    if (Number.isFinite(last) && last > 0) {
      // newest N, handed back OLDEST FIRST, which is the order they were written
      return [...this.sql.exec(
        `SELECT * FROM (SELECT * FROM note${w} ORDER BY n DESC LIMIT ?) ORDER BY n ASC`,
        ...args, last,
      )];
    }
    return [...this.sql.exec(`SELECT * FROM note${w} ORDER BY n ASC`, ...args)];
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
        'access-control-allow-origin': '*',
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

const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status,
  headers: {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-expose-headers': 'X-Feedback',
  },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
          'access-control-max-age': '86400',
        },
      });
    }

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

    // 🔴 THE ROOM IS DECIDED HERE AND NOWHERE ELSE, from a header a page cannot
    // forge. No query parameter reaches this line and no body is read.
    if (url.pathname === '/arm' && request.method === 'POST') {
      const room = roomFor(request.headers.get('origin'));
      return env.NOTES.get(env.NOTES.idFromName(room))
        .fetch(`https://x/arm?room=${room}`, { method: 'POST' });
    }

    // Clearing is the one destructive act, so it needs a secret — and with no
    // secret set it refuses rather than allows. `wrangler secret put FEEDBACK_KEY`.
    if (url.pathname === '/clear' && request.method === 'POST') {
      const key = env.FEEDBACK_KEY;
      if (!key || request.headers.get('x-feedback-key') !== key) {
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

/** Two rooms exist and no third can be named into being. A DO namespace that
 *  takes an arbitrary string is a namespace anybody can spray. */
const pickRoom = (name) => {
  if (!name || name === LIVE_ROOM) return LIVE_ROOM;
  if (name === DEV_ROOM) return DEV_ROOM;
  return null;
};
