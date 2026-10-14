// node workers/store/test.mjs
// The Store object on node:sqlite with a fake relay socket: no network, no
// wrangler. Checks the write ceiling, the row and byte caps, and the clear auth.
import { DatabaseSync } from 'node:sqlite';
import { Store } from './src/index.js';
import worker from './src/index.js';

let pass = 0, fail = 0;
const ok = (c, what, detail = '') => { c ? pass++ : fail++; console.log(`${c ? 'ok  ' : 'FAIL'} ${what}${detail ? `  (${detail})` : ''}`); };

function fakeState() {
  const db = new DatabaseSync(':memory:');
  const kv = new Map();
  let puts = 0;
  const sql = {
    exec(q, ...args) {
      // the DO binds an ArrayBuffer as a BLOB; node:sqlite wants a Uint8Array
      args = args.map((a) => (a instanceof ArrayBuffer ? new Uint8Array(a) : a));
      const st = db.prepare(q);
      return /^\s*(SELECT|INSERT[\s\S]*RETURNING|DELETE[\s\S]*RETURNING)/i.test(q) ? st.all(...args) : (st.run(...args), []);
    },
  };
  return {
    storage: {
      sql,
      async get(k) { return kv.get(k); },
      async put(k, v) { puts++; kv.set(k, structuredClone(v)); },
      async setAlarm() {},
    },
    puts: () => puts,
  };
}

globalThis.WebSocket = { READY_STATE_OPEN: 1 };
let sock = null;
globalThis.fetch = async () => {
  const h = {};
  sock = { readyState: 1, accept() {}, send() {}, close() {}, addEventListener: (t, f) => { h[t] = f; }, fire: (data) => h.message({ data }) };
  return { status: 101, webSocket: sock };
};
const post = (path, body) => new Request(`https://x${path}`, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

const state = fakeState();
const s = new Store(state, {});
await s.fetch(post('/room/r/record', { cap: 1000 }));
const putsAfterRecord = state.puts();

// 300 frames as fast as a knob sends them, every one marked store.
for (let i = 0; i < 300; i++) sock.fire(JSON.stringify({ type: 'k', from: 'a', sent: Date.now(), seq: i, store: true, v: i }));
await s.chain;
let st = await (await s.fetch(new Request('https://x/room/r/stats'))).json();
ok(state.puts() === putsAfterRecord, 'no KV write per relayed frame', `${state.puts() - putsAfterRecord} puts for 300 frames`);
ok(st.kept <= 41 && st.shed >= 259, 'a burst is held to the keep ceiling', `kept ${st.kept}, shed ${st.shed} of ${st.seen}`);

// A frame over the row ceiling is refused, not stored.
s.tokens = 40;
sock.fire(new Uint8Array(70 * 1024).buffer);
await s.chain;
st = await (await s.fetch(new Request('https://x/room/r/stats'))).json();
ok(st.held === 40 && st.shed === 261, 'a 70 KB binary frame is not kept', `held ${st.held}, shed ${st.shed}`);
s.tokens = 40;
sock.fire(new Uint8Array(1024).buffer);
await s.chain;
st = await (await s.fetch(new Request('https://x/room/r/stats'))).json();
ok(st.held === 41, 'control: a 1 KB binary frame is kept', `held ${st.held}`);

// Byte cap: 300 frames of 60 KB, refilled bucket each time, must stay under 16 MiB.
for (let i = 0; i < 300; i++) { s.tokens = 40; sock.fire(new Uint8Array(60 * 1024).fill(i).buffer); await s.chain; }
await s.chain;
st = await (await s.fetch(new Request('https://x/room/r/stats'))).json();
const [{ b }] = state.storage.sql.exec('SELECT SUM(IFNULL(length(CAST(body AS BLOB)), 0) + IFNULL(length(raw), 0)) AS b FROM msg');
ok(b <= 16 * 1024 * 1024 && b > 15 * 1024 * 1024 && st.bytes === b, 'the room stays under its byte cap and the count agrees with the table', `${b} bytes held, counted ${st.bytes}`);

// Row cap, as /wire/'s overfill checks it: cap 8, nine in, eight held.
const s2 = new Store(fakeState(), {});
await s2.fetch(post('/room/w/record', { cap: 8 }));
for (let i = 1; i <= 9; i++) sock.fire(JSON.stringify({ type: 'fill', value: `fill ${i}`, store: true }));
await s2.chain;
const hist = await s2.fetch(new Request('https://x/room/w/history?last=32'));
const rows = (await hist.text()).split('\n').filter(Boolean);
ok(rows.length === 8 && rows[0].includes('fill 2') && /kept=8/.test(hist.headers.get('X-Store')), 'cap 8: one more in, the oldest out', `${rows.length} rows, first ${rows[0]}`);

// Meta reaches storage on the alarm.
const before = state.puts();
await s.alarm();
ok(state.puts() > before, 'the alarm writes the counts it held in memory');

// Auth on the entry worker.
const env = { STORE: { idFromName: (n) => n, get: () => ({ fetch: async () => Response.json({ cleared: true, rooms: [] }) }) } };
const req = (path, h = {}) => new Request(`https://store.positron.studio${path}`, { method: 'POST', headers: h });
ok((await worker.fetch(req('/clear-all'), env)).status === 403, '/clear-all with no key set: 403');
ok((await worker.fetch(req('/clear-all', { 'x-store-key': 'nope' }), { ...env, STORE_KEY: 'k3y' })).status === 403, '/clear-all with a wrong key: 403');
ok((await worker.fetch(req('/clear-all', { 'x-store-key': 'k3y' }), { ...env, STORE_KEY: 'k3y' })).status === 200, '/clear-all with the key: 200');
ok((await worker.fetch(req('/room/wire/clear'), env)).status === 403, 'room clear with no Origin: 403');
ok((await worker.fetch(req('/room/wire/clear', { origin: 'https://evil.example' }), env)).status === 403, 'room clear from another site: 403');
ok((await worker.fetch(req('/room/wire/clear', { origin: 'https://positron.studio' }), env)).status === 200, 'room clear from positron.studio: 200');
ok((await worker.fetch(req('/room/wire/clear', { origin: 'http://127.0.0.1:8890' }), env)).status === 200, 'room clear from the local dev server: 200');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
