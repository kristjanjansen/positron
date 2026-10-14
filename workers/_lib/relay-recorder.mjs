// A Durable Object that keeps a relay room by joining it as an ordinary socket,
// the shape positron-store and positron-feedback share. Bundled into each
// worker by wrangler, like http.mjs. A subclass supplies `onMessage(data)` and
// `recorderMeta()` (its stored meta with `lastUse`, and anything it must write
// on the alarm), and may override `opened()` and `gone()`.

export class RelayRecorder {
  /**
   * @param {object} state  the DO's state
   * @param {object} env
   * @param {{ relay: string, alarmMs: number, idleStopMs: number }} o
   */
  constructor(state, env, { relay, alarmMs, idleStopMs }) {
    this.state = state;
    this.env = env;
    this.sql = state.storage.sql;
    this.relay = relay;
    this.alarmMs = alarmMs;
    this.idleStopMs = idleStopMs;
    this.ws = null;
    this.room = null;
    // ORDER IS THE PRODUCT, so handling is serialised through one chain. A DO's
    // input gate holds events back across a STORAGE await and not across
    // `blob.arrayBuffer()`, so two frames a millisecond apart would otherwise
    // race each other into the table in the wrong order.
    this.chain = Promise.resolve();
  }

  /** Join `room` on the relay and do not return until the socket is open, so
   *  a caller that sends the moment this answers cannot race its own message
   *  into a room the recorder has not reached yet. False when refused. */
  async join(room) {
    if (this.ws && this.ws.readyState === WebSocket.READY_STATE_OPEN) return true;
    const res = await fetch(`${this.relay}/room/${room}/ws`, { headers: { Upgrade: 'websocket' } });
    if (res.status !== 101 || !res.webSocket) return false;
    const ws = res.webSocket;
    ws.accept();
    ws.addEventListener('message', (e) => {
      this.chain = this.chain.then(() => this.onMessage(e.data)).catch(() => {});
    });
    ws.addEventListener('close', () => { if (this.ws === ws) this.gone(); });
    ws.addEventListener('error', () => { if (this.ws === ws) this.gone(); });
    this.ws = ws;
    this.opened();
    await this.state.storage.setAlarm(Date.now() + this.alarmMs);
    return true;
  }

  /** The socket just opened. */
  opened() {}

  /** The socket is gone. */
  gone() { this.ws = null; }

  /** Rejoin a dropped socket every `alarmMs`, and let the object sleep once
   *  nobody has used the room for `idleStopMs`. */
  async alarm() {
    const meta = await this.recorderMeta();
    const room = this.room || (await this.state.storage.get('room'));
    if (!room) return;
    this.room = room;
    if (Date.now() - meta.lastUse > this.idleStopMs) {
      try { this.ws?.close(1000, 'idle'); } catch { /* already gone */ }
      this.gone();
      return;
    }
    if (!this.ws) await this.rejoin(room, meta);
    await this.state.storage.setAlarm(Date.now() + this.alarmMs);
  }

  /** The alarm found the socket gone: join again. A subclass that records
   *  more than the room name on joining overrides this. */
  rejoin(room) { return this.join(room); }

  /** `SELECT * FROM table`, filtered by `where` (SQL strings) and `args`,
   *  oldest first; with `last`, only the newest `last` rows, still oldest first. */
  rows(table, where, args, last) {
    const w = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    if (Number.isFinite(last) && last > 0) {
      return [...this.sql.exec(
        `SELECT * FROM (SELECT * FROM ${table}${w} ORDER BY n DESC LIMIT ?) ORDER BY n ASC`,
        ...args, last,
      )];
    }
    return [...this.sql.exec(`SELECT * FROM ${table}${w} ORDER BY n ASC`, ...args)];
  }
}
