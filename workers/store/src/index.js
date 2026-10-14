// positron-store: the history the relay will not keep. The recorder joins a room as an ordinary
// socket, so it sees the relay's order; recording is turned on per room, with an idle stop.
// POST /room/<n>/record, GET .../history, .../stats, POST .../clear; POST /clear-all needs a key.
// why: lessons/workers-store.md#header

import { STORE_GRAPH } from './graph.js';
import { json as baseJson, OPEN, preflight, ourOrigin, keyMatches } from '../../_lib/http.mjs';
import { RelayRecorder } from '../../_lib/relay-recorder.mjs';

const RELAY = 'https://ws.positron.studio';
const CAP_DEFAULT = 1000;
const CAP_MAX = 1000;
const KEEP_MS = 24 * 60 * 60 * 1000;      // the newer of cap rows or 24 h
const IDLE_STOP_MS = 30 * 60 * 1000;      // stop recording a room nobody uses
const ALARM_MS = 30 * 1000;
// What one room may hold and how fast it may write. A knob relays about 60
// frames a second; without these a recorded room wrote every one of them and
// could hold 1000 rows of 1 MB each.
const ROW_MAX_BYTES = 64 * 1024;          // a kept frame larger than this is refused
const ROOM_MAX_BYTES = 16 * 1024 * 1024;  // oldest rows go first past this
const KEEP_PER_SEC = 20;                  // rows written per second, steady
const KEEP_BURST = 40;
const SIZE = 'IFNULL(length(CAST(body AS BLOB)), 0) + IFNULL(length(raw), 0) AS b';

// `bay-node.mjs` REANNOUNCE_MS. A registry marks a site stale after STALE_MS,
// 15 s, so the 30 s alarm is too slow to carry this and an in-memory interval
// does it with no storage write.
const REANNOUNCE_MS = 10 * 1000;

export class Store extends RelayRecorder {
  constructor(state, env) {
    super(state, env, { relay: RELAY, alarmMs: ALARM_MS, idleStopMs: IDLE_STOP_MS });
    this.from = null;          // this socket's envelope id, minted per connection like wire.mjs
    this.seq = 0;
    this.beat = null;          // the re-announce interval, alive only while the socket is
    this.meta = null;          // held in memory, written on the alarm and on record/clear
    this.dirty = false;
    this.bytes = null;         // bytes held in msg, read once then kept in step
    this.tokens = KEEP_BURST;
    this.refill = Date.now();
    this.sql.exec(`CREATE TABLE IF NOT EXISTS msg(
      n INTEGER PRIMARY KEY AUTOINCREMENT,
      at INTEGER, sender TEXT, seq INTEGER, type TEXT,
      kind TEXT, body TEXT, raw BLOB)`);
    this.sql.exec('CREATE INDEX IF NOT EXISTS msg_by_time ON msg(at)');
  }

  async #meta() {
    if (!this.meta) {
      const m = (await this.state.storage.get('meta')) || {};
      this.meta = { cap: CAP_DEFAULT, seen: 0, kept: 0, lastUse: 0, shed: 0, ...m };
    }
    return this.meta;
  }

  async #saveMeta(m) { this.meta = m; this.dirty = false; await this.state.storage.put('meta', m); }

  async #flushMeta() { if (this.dirty && this.meta) await this.#saveMeta(this.meta); }

  #heldBytes() {
    if (this.bytes === null) {
      const [r] = [...this.sql.exec(`SELECT IFNULL(SUM(${SIZE.replace(' AS b', '')}), 0) AS b FROM msg`)];
      this.bytes = r?.b ?? 0;
    }
    return this.bytes;
  }

  /** A token bucket on kept rows, so the write rate has a ceiling. */
  #mayKeep() {
    const now = Date.now();
    this.tokens = Math.min(KEEP_BURST, this.tokens + ((now - this.refill) / 1000) * KEEP_PER_SEC);
    this.refill = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }

  /** Open the recorder's socket and do not return until it is open, so a
   *  caller that sends immediately afterwards cannot race it into the room. */
  async #record(room, cap) {
    this.room = room;
    const meta = await this.#meta();
    meta.cap = cap;
    meta.lastUse = Date.now();
    await this.#saveMeta(meta);
    await this.state.storage.put('room', room);
    return this.join(room);
  }

  /** A new socket gets a new envelope id and starts announcing itself. */
  opened() {
    this.from = crypto.randomUUID().replace(/-/g, '').slice(0, 6);
    this.seq = 0;
    this.#announce();
    clearInterval(this.beat);
    this.beat = setInterval(() => this.#announce(), REANNOUNCE_MS);
  }

  /** The socket is gone, so the store stops saying it is here. */
  gone() {
    clearInterval(this.beat);
    this.beat = null;
    this.ws = null;
  }

  // `graph.announce` with no `store: true`, so the store never keeps its own or anybody's graph.*.
  // why: lessons/workers-store.md#announce
  #announce() {
    if (!this.ws || this.ws.readyState !== WebSocket.READY_STATE_OPEN) return;
    try {
      this.ws.send(JSON.stringify({
        id: crypto.randomUUID(), type: 'graph.announce', graph: STORE_GRAPH,
        from: this.from, sent: Date.now(), seq: ++this.seq,
      }));
    } catch { /* closing; the close handler stops the beat */ }
  }

  // Keep only `store: true` text: a room of cues at 60/s fills a 1,000-row cap in 17 s.
  // A binary frame has no fields to flag, so it is kept whenever recording is on.
  // why: lessons/workers-store.md#store-flag
  async onMessage(data) {
    const meta = await this.#meta();
    meta.seen++;
    this.dirty = true;
    let row = null;
    if (typeof data === 'string') {
      let m = null;
      try { m = JSON.parse(data); } catch { /* an unreadable frame is a fact */ }
      // Somebody joined and asked who is here. Not our own ask echoed back.
      if (m?.type === 'graph.ask' && m.from !== this.from) this.#announce();
      if (m && typeof m === 'object' && m.store) {
        row = {
          // Column `at` holds the send stamp: read `sent`, fall back to `at` from an older sender.
          // why: lessons/workers-store.md#sent-column
          at: Number(m.sent ?? m.at) || Date.now(),
          sender: String(m.from ?? ''),
          seq: Number.isFinite(m.seq) ? m.seq : null,
          type: String(m.type ?? ''),
          kind: 'json',
          body: data,
          raw: null,
        };
      }
    } else {
      // An outbound DO socket hands binary over as a Blob, and binding a Uint8Array stores an empty
      // BLOB. Convert, then bind the ArrayBuffer.
      // why: lessons/workers-store.md#blob
      const buf = typeof data.arrayBuffer === 'function' ? await data.arrayBuffer() : data;
      row = {
        at: Date.now(), sender: '', seq: null, type: 'binary',
        kind: 'binary', body: null, raw: buf,
      };
    }
    if (!row) return;
    const size = row.body ? new TextEncoder().encode(row.body).byteLength : (row.raw?.byteLength ?? 0);
    if (size > ROW_MAX_BYTES || !this.#mayKeep()) { meta.shed++; return; }
    this.#heldBytes();
    const [{ n }] = [...this.sql.exec(
      'INSERT INTO msg(at, sender, seq, type, kind, body, raw) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING n',
      row.at, row.sender, row.seq, row.type, row.kind, row.body, row.raw,
    )];
    this.bytes += size;
    meta.kept++;
    this.#prune(meta.cap, n);
  }

  /** Pruned on write, by row count, by age and by bytes. Every DELETE is a
   *  range on an index, so it reads only the rows it removes. */
  #prune(cap, newest) {
    // n only ever grows and deletes only take the oldest, so the kept rows are
    // the contiguous range (newest - cap, newest].
    this.#drop('DELETE FROM msg WHERE n <= ? RETURNING ' + SIZE, newest - cap);
    this.#drop('DELETE FROM msg WHERE at < ? RETURNING ' + SIZE, Date.now() - KEEP_MS);
    while (this.bytes > ROOM_MAX_BYTES) {
      if (!this.#drop(`DELETE FROM msg WHERE n IN (SELECT n FROM msg ORDER BY n LIMIT 16) RETURNING ${SIZE}`)) break;
    }
  }

  /** Run one DELETE ... RETURNING size and take the sizes off the byte count. */
  #drop(q, ...args) {
    let gone = 0;
    for (const r of this.sql.exec(q, ...args)) { this.bytes -= r.b; gone++; }
    return gone;
  }

  /** The meta for the alarm, which is also when the counts held in memory are written. */
  async recorderMeta() {
    const meta = await this.#meta();
    await this.#flushMeta();
    return meta;
  }

  rejoin(room, meta) { return this.#record(room, meta.cap); }

  #rows(url) {
    const q = url.searchParams;
    const where = [];
    const args = [];
    if (q.get('since')) { where.push('at >= ?'); args.push(Number(q.get('since'))); }
    if (q.get('from')) { where.push('at >= ?'); args.push(Number(q.get('from'))); }
    if (q.get('to')) { where.push('at <= ?'); args.push(Number(q.get('to'))); }
    if (q.get('type')) { where.push('type = ?'); args.push(q.get('type')); }
    // newest N with `last`, handed back OLDEST FIRST either way, which is the
    // order they were delivered in and the order a reader merges into a live list
    return this.rows('msg', where, args, Number(q.get('last')));
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
      this.bytes = 0;
      meta.seen = 0; meta.kept = 0; meta.shed = 0; meta.lastUse = Date.now();
      await this.#saveMeta(meta);
      return json({ cleared: true, room, ...(await this.#counts()) });
    }

    if (url.pathname.endsWith('/stats')) {
      return json({
        room, recording: !!this.ws, cap: meta.cap,
        seen: meta.seen, kept: meta.kept, shed: meta.shed,
        bytes: this.#heldBytes(), maxBytes: ROOM_MAX_BYTES, keepPerSec: KEEP_PER_SEC,
        ...(await this.#counts()),
      });
    }

    if (url.pathname.endsWith('/history')) {
      meta.lastUse = Date.now();
      this.dirty = true;
      const rows = this.#rows(url);
      const counts = await this.#counts();
      // NDJSON, one message per line, so a `curl` of a room is readable
      // without a tool and a saved file is `jq`-able.
      const lines = rows.map((r) => (r.kind === 'json'
        ? r.body
        : JSON.stringify({
            type: 'binary', sent: r.at, bytes: r.raw?.byteLength ?? 0,
            head: hex(r.raw, 8),
          }))).join('\n');
      // (a BLOB comes back as an ArrayBuffer with no useful .slice() or iterator; hex() wraps it)
      // why: lessons/workers-store.md#blob-out
      return new Response(lines ? `${lines}\n` : '', {
        headers: {
          'content-type': 'application/x-ndjson; charset=utf-8',
          ...OPEN,
          'access-control-expose-headers': 'X-Store',
          // what the reader is looking at, so the page never has to imply
          // completeness it cannot check
          'X-Store': `kept=${counts.held};seen=${meta.seen};stored=${meta.kept};cap=${meta.cap};oldest=${counts.oldest};shed=${meta.shed}`,
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

const json = (o, status = 200) => baseJson(o, status, { 'access-control-expose-headers': 'X-Store' });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return preflight('GET, POST, OPTIONS', 'content-type, x-store-key');

    if (url.pathname === '/' || url.pathname === '') {
      return json({
        worker: 'positron-store',
        what: 'the history the verbatim relay refuses to keep — a recorder joins the room as a socket',
        usage: [
          'POST /room/<name>/record  {cap}',
          'GET  /room/<name>/history?last=200',
          'GET  /room/<name>/history?since=<epoch ms>',
          'GET  /room/<name>/history?from=<ms>&to=<ms>&type=<verb>',
          'GET  /room/<name>/stats',
          'POST /room/<name>/clear      from a positron page',
          'POST /clear-all              x-store-key',
        ],
        retention: { cap: CAP_DEFAULT, keepMs: KEEP_MS, idleStopMs: IDLE_STOP_MS, rowMaxBytes: ROW_MAX_BYTES, roomMaxBytes: ROOM_MAX_BYTES, keepPerSec: KEEP_PER_SEC },
        stores: 'only messages sent with store:true — plus every binary frame, which cannot carry the flag',
      });
    }

    const index = () => env.STORE.get(env.STORE.idFromName('__index'));

    // Every room at once, because per-visitor rooms are never named again. No page is behind it,
    // so it takes STORE_KEY as `x-store-key`; unset refuses.
    // why: lessons/workers-store.md#clear-all
    if (url.pathname === '/clear-all' && request.method === 'POST') {
      if (!await keyMatches(request.headers.get('x-store-key'), env.STORE_KEY)) {
        return json({ error: 'clearing every room needs the x-store-key header' }, 403);
      }
      const { rooms } = await (await index().fetch('https://x/index/list')).json();
      let cleared = 0;
      for (const r of rooms) {
        const res = await env.STORE.get(env.STORE.idFromName(r))
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

    // One room's Clear is a button on /wire/ and /room/history/, so it takes
    // the pages' origin rather than a key a public page would have to carry.
    if (m[2] === 'clear' && (request.method !== 'POST' || !ourOrigin(request.headers.get('origin')))) {
      return json({ error: 'clear a room from its page' }, 403);
    }

    const id = env.STORE.idFromName(m[1]);
    return env.STORE.get(id).fetch(request);
  },
};
