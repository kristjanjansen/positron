/**
 * positron-backlog — the history the relay refuses to keep. plan-ws §3.
 *
 * The relay's whole value is that it does not parse: no envelope, no storage,
 * text or binary relayed as-is, and a `ping` answered by the runtime's
 * hibernation autoresponse so an RTT probe never even wakes it. Putting
 * history inside it would make every message a parse and every room a write.
 *
 * So the backlog sits BESIDE it, and fills the only way that keeps that true:
 *
 *   THE RECORDER JOINS THE ROOM AS AN ORDINARY SOCKET.
 *
 * It costs one of the relay's sixteen slots, it sees exactly the order every
 * other member sees — the echo is the ordering point — and it is allowed to
 * parse because it is not the relay. It is also the one place `store: true`
 * can be honoured, which is why that flag lives in the envelope rather than in
 * a query string.
 *
 * The cost, stated rather than hidden: a recorded room is a Durable Object
 * kept awake. Recording is therefore something you turn ON for a room, with an
 * idle stop, not a property every room has.
 *
 *   POST /room/<name>/record   {cap?}   -> starts it; returns when the socket is open
 *   GET  /room/<name>/history?last=|since=|from=&to=|type=   -> NDJSON, oldest first
 *   GET  /room/<name>/stats
 *   POST /room/<name>/clear       one room
 *   POST /clear-all               every room the index knows of
 *
 * `clear-all` needs a list of rooms, and a DO namespace cannot be enumerated —
 * so one reserved instance, `__index`, keeps the names as they start recording.
 * ⚠️ It therefore knows only what was recorded SINCE it existed: rooms from
 * before are unreachable by name and keep up to `cap` rows until something
 * writes to them again, because the prune runs on write. At demo scale that is
 * a handful of rows; if it ever matters, prune on the idle-stop alarm.
 * The public room route refuses any name beginning `__`, so nothing outside
 * this file can address it.
 */

const RELAY = 'https://ws.positron.studio';
const CAP_DEFAULT = 1000;
const CAP_MAX = 1000;
const KEEP_MS = 24 * 60 * 60 * 1000;      // the newer of cap rows or 24 h
const IDLE_STOP_MS = 30 * 60 * 1000;      // stop recording a room nobody uses
const ALARM_MS = 30 * 1000;

export class Backlog {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sql = state.storage.sql;
    this.ws = null;
    this.room = null;
    this.chain = Promise.resolve();
    this.sql.exec(`CREATE TABLE IF NOT EXISTS msg(
      n INTEGER PRIMARY KEY AUTOINCREMENT,
      at INTEGER, sender TEXT, seq INTEGER, type TEXT,
      kind TEXT, body TEXT, raw BLOB)`);
    this.sql.exec('CREATE INDEX IF NOT EXISTS msg_by_time ON msg(at)');
  }

  async #meta() {
    return (await this.state.storage.get('meta')) || { cap: CAP_DEFAULT, seen: 0, kept: 0, lastUse: 0 };
  }

  async #saveMeta(m) { await this.state.storage.put('meta', m); }

  /** Open the recorder's socket and do not return until it is open, so a
   *  caller that sends immediately afterwards cannot race it into the room. */
  async #record(room, cap) {
    this.room = room;
    const meta = await this.#meta();
    meta.cap = cap;
    meta.lastUse = Date.now();
    await this.#saveMeta(meta);
    await this.state.storage.put('room', room);

    if (this.ws && this.ws.readyState === WebSocket.READY_STATE_OPEN) return true;

    const res = await fetch(`${RELAY}/room/${room}/ws`, { headers: { Upgrade: 'websocket' } });
    if (res.status !== 101 || !res.webSocket) return false;
    const ws = res.webSocket;
    ws.accept();
    // ORDER IS THE PRODUCT here, so handling is serialised through one chain.
    // A DO's input gate holds events back across a STORAGE await, but not
    // across `blob.arrayBuffer()` — and two frames a millisecond apart would
    // then race each other into the table in the wrong order.
    ws.addEventListener('message', (e) => {
      this.chain = this.chain.then(() => this.#onMessage(e.data)).catch(() => {});
    });
    ws.addEventListener('close', () => { if (this.ws === ws) this.ws = null; });
    ws.addEventListener('error', () => { if (this.ws === ws) this.ws = null; });
    this.ws = ws;
    await this.state.storage.setAlarm(Date.now() + ALARM_MS);
    return true;
  }

  /**
   * `store: true` is elektron's, and it is right: the sender knows which
   * messages are worth keeping. Without it a room carrying cues at 60/s fills
   * a 1,000-message cap in seventeen seconds and buries the one line somebody
   * wanted to read back.
   *
   * A binary frame cannot carry the flag — it has no fields — so it is kept
   * whenever recording is on. That asymmetry is real and the page prints it
   * rather than pretending the two paths are the same.
   */
  async #onMessage(data) {
    const meta = await this.#meta();
    meta.seen++;
    let row = null;
    if (typeof data === 'string') {
      let m = null;
      try { m = JSON.parse(data); } catch { /* an unreadable frame is a fact */ }
      if (m && typeof m === 'object' && m.store) {
        row = {
          at: Number(m.at) || Date.now(),
          sender: String(m.from ?? ''),
          seq: Number.isFinite(m.seq) ? m.seq : null,
          type: String(m.type ?? ''),
          kind: 'json',
          body: data,
          raw: null,
        };
      }
    } else {
      // A DO's OUTBOUND client socket hands binary over as a **Blob**, not an
      // ArrayBuffer (measured: `Blob`, size 9, byteLength undefined) — and the
      // SQL bind takes a Uint8Array without complaining and stores an EMPTY
      // blob, so the row reads back at 0 bytes with the frame apparently
      // recorded. Convert, then bind an ArrayBuffer.
      const buf = typeof data.arrayBuffer === 'function' ? await data.arrayBuffer() : data;
      row = {
        at: Date.now(), sender: '', seq: null, type: 'binary',
        kind: 'binary', body: null, raw: buf,
      };
    }
    if (row) {
      this.sql.exec(
        'INSERT INTO msg(at, sender, seq, type, kind, body, raw) VALUES (?, ?, ?, ?, ?, ?, ?)',
        row.at, row.sender, row.seq, row.type, row.kind, row.body, row.raw,
      );
      meta.kept++;
      this.#prune(meta.cap);
    }
    await this.#saveMeta(meta);
  }

  /** Retention is a decision, not a default: a SELECT over a table nobody
   *  prunes is a demo that works for a week. Pruned on write. */
  #prune(cap) {
    this.sql.exec('DELETE FROM msg WHERE at < ?', Date.now() - KEEP_MS);
    this.sql.exec(
      'DELETE FROM msg WHERE n <= (SELECT n FROM msg ORDER BY n DESC LIMIT 1 OFFSET ?)',
      cap,
    );
  }

  async alarm() {
    const meta = await this.#meta();
    const room = this.room || (await this.state.storage.get('room'));
    if (!room) return;
    if (Date.now() - meta.lastUse > IDLE_STOP_MS) {
      try { this.ws?.close(1000, 'idle'); } catch { /* already gone */ }
      this.ws = null;
      return;                              // let the DO sleep
    }
    if (!this.ws) await this.#record(room, meta.cap);
    await this.state.storage.setAlarm(Date.now() + ALARM_MS);
  }

  #rows(url) {
    const q = url.searchParams;
    const where = [];
    const args = [];
    if (q.get('since')) { where.push('at >= ?'); args.push(Number(q.get('since'))); }
    if (q.get('from')) { where.push('at >= ?'); args.push(Number(q.get('from'))); }
    if (q.get('to')) { where.push('at <= ?'); args.push(Number(q.get('to'))); }
    if (q.get('type')) { where.push('type = ?'); args.push(q.get('type')); }
    const w = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    const last = Number(q.get('last'));
    if (Number.isFinite(last) && last > 0) {
      // newest N, then handed back OLDEST FIRST, which is the order they were
      // delivered in and the order a reader merges into a live list
      return [...this.sql.exec(
        `SELECT * FROM (SELECT * FROM msg${w} ORDER BY n DESC LIMIT ?) ORDER BY n ASC`,
        ...args, last,
      )];
    }
    return [...this.sql.exec(`SELECT * FROM msg${w} ORDER BY n ASC`, ...args)];
  }

  async fetch(request) {
    const url = new URL(request.url);

    // the reserved `__index` instance: a set of room names, nothing else
    if (url.pathname === '/index/add') {
      const name = url.searchParams.get('room');
      const rooms = (await this.state.storage.get('rooms')) || [];
      if (name && !rooms.includes(name)) {
        rooms.push(name);
        await this.state.storage.put('rooms', rooms);
      }
      return json({ rooms: rooms.length });
    }
    if (url.pathname === '/index/list') {
      return json({ rooms: (await this.state.storage.get('rooms')) || [] });
    }

    const room = url.pathname.split('/')[2];
    const meta = await this.#meta();

    if (url.pathname.endsWith('/record')) {
      let cap = CAP_DEFAULT;
      try {
        const body = await request.json();
        if (Number.isFinite(body?.cap)) cap = Math.max(1, Math.min(CAP_MAX, Math.floor(body.cap)));
      } catch { /* no body is fine */ }
      const ok = await this.#record(room, cap);
      return json({ recording: ok, room, cap, ...(await this.#counts()) });
    }

    if (url.pathname.endsWith('/clear')) {
      this.sql.exec('DELETE FROM msg');
      meta.seen = 0; meta.kept = 0; meta.lastUse = Date.now();
      await this.#saveMeta(meta);
      return json({ cleared: true, room, ...(await this.#counts()) });
    }

    if (url.pathname.endsWith('/stats')) {
      return json({
        room, recording: !!this.ws, cap: meta.cap,
        seen: meta.seen, kept: meta.kept, ...(await this.#counts()),
      });
    }

    if (url.pathname.endsWith('/history')) {
      meta.lastUse = Date.now();
      await this.#saveMeta(meta);
      const rows = this.#rows(url);
      const counts = await this.#counts();
      // NDJSON, one message per line, so a `curl` of a room is readable
      // without a tool and a saved file is `jq`-able.
      const lines = rows.map((r) => (r.kind === 'json'
        ? r.body
        : JSON.stringify({
            type: 'binary', at: r.at, bytes: r.raw?.byteLength ?? 0,
            head: hex(r.raw, 8),
          }))).join('\n');
      // (a BLOB comes back as an ArrayBuffer, which has no .slice() worth
      //  having and no iterator — hex() wraps it before reading)
      return new Response(lines ? `${lines}\n` : '', {
        headers: {
          'content-type': 'application/x-ndjson; charset=utf-8',
          'access-control-allow-origin': '*',
          'access-control-expose-headers': 'X-Backlog',
          // what the reader is looking at, so the page never has to imply
          // completeness it cannot check
          'X-Backlog': `kept=${counts.held};seen=${meta.seen};stored=${meta.kept};cap=${meta.cap};oldest=${counts.oldest}`,
        },
      });
    }

    return new Response('not found', { status: 404 });
  }

  async #counts() {
    const [row] = [...this.sql.exec('SELECT COUNT(*) AS held, MIN(at) AS oldest FROM msg')];
    return { held: row?.held ?? 0, oldest: row?.oldest ?? 0 };
  }
}

const hex = (buf, n) => (buf
  ? Array.from(new Uint8Array(buf).slice(0, n), (b) => b.toString(16).padStart(2, '0')).join(' ')
  : '');

const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status,
  headers: {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-expose-headers': 'X-Backlog',
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
        },
      });
    }

    if (url.pathname === '/' || url.pathname === '') {
      return json({
        worker: 'positron-backlog',
        what: 'the history the verbatim relay refuses to keep — a recorder joins the room as a socket',
        usage: [
          'POST /room/<name>/record  {cap}',
          'GET  /room/<name>/history?last=200',
          'GET  /room/<name>/history?since=<epoch ms>',
          'GET  /room/<name>/history?from=<ms>&to=<ms>&type=<verb>',
          'GET  /room/<name>/stats',
          'POST /room/<name>/clear',
          'POST /clear-all',
        ],
        retention: { cap: CAP_DEFAULT, keepMs: KEEP_MS, idleStopMs: IDLE_STOP_MS },
        stores: 'only messages sent with store:true — plus every binary frame, which cannot carry the flag',
      });
    }

    const index = () => env.BACKLOG.get(env.BACKLOG.idFromName('__index'));

    // Blunt on purpose, and the button says so: this is demo history, and a
    // page that keeps a room per visitor leaves rooms nobody will ever name
    // again. Clearing one room at a time would never reach them.
    if (url.pathname === '/clear-all' && request.method === 'POST') {
      const { rooms } = await (await index().fetch('https://x/index/list')).json();
      let cleared = 0;
      for (const r of rooms) {
        const res = await env.BACKLOG.get(env.BACKLOG.idFromName(r))
          .fetch(new Request(`https://x/room/${r}/clear`, { method: 'POST' }));
        if (res.ok) cleared++;
      }
      return json({ rooms: rooms.length, cleared });
    }

    // same constraint as the relay: the DO namespace cannot be sprayed. `__`
    // is reserved so the index instance is unreachable from outside.
    const m = url.pathname.match(/^\/room\/([a-zA-Z0-9_-]{1,64})\/(record|history|stats|clear)$/);
    if (!m || m[1].startsWith('__')) {
      return new Response('use /room/<name>/{record,history,stats,clear} or POST /clear-all', { status: 404 });
    }

    // registered at record time, which is the only moment a room is known to
    // be one we keep anything for
    if (m[2] === 'record') await index().fetch(`https://x/index/add?room=${m[1]}`, { method: 'POST' });

    const id = env.BACKLOG.idFromName(m[1]);
    return env.BACKLOG.get(id).fetch(request);
  },
};
