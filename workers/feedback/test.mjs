// node workers/feedback/test.mjs
// The Feedback object on node:sqlite with a fake relay socket: no network.
// A note is kept only against an arm, and arms are counted per real address.
import { DatabaseSync } from 'node:sqlite';
import worker, { Feedback } from './src/index.js';

let pass = 0, fail = 0;
const ok = (c, what, detail = '') => { c ? pass++ : fail++; console.log(`${c ? 'ok  ' : 'FAIL'} ${what}${detail ? `  (${detail})` : ''}`); };

function fakeState() {
  const db = new DatabaseSync(':memory:');
  const kv = new Map();
  return {
    storage: {
      sql: { exec(q, ...a) { const st = db.prepare(q); return /^\s*SELECT/i.test(q) ? st.all(...a) : (st.run(...a), []); } },
      async get(k) { return structuredClone(kv.get(k)); },
      async put(k, v) { kv.set(k, structuredClone(v)); },
      async setAlarm() {},
    },
  };
}
globalThis.WebSocket = { READY_STATE_OPEN: 1 };
let sock = null;
globalThis.fetch = async () => {
  const h = {};
  sock = { readyState: 1, accept() {}, send() {}, close() {}, addEventListener: (t, f) => { h[t] = f; }, fire: (data) => h.message({ data }) };
  return { status: 101, webSocket: sock };
};

const f = new Feedback(fakeState(), {});
const arm = (who = 'aaaa', room = 'feedback') => f.fetch(new Request(`https://x/arm?room=${room}&who=${who}`, { method: 'POST' }));
const say = (i, extra = {}) => sock.fire(JSON.stringify({ type: 'feedback.say', id: `n${i}`, text: `note ${i}`, from: 'x', origin: 'https://positron.studio', ...extra }));
const held = async () => (await (await f.fetch(new Request('https://x/stats?room=feedback'))).json()).held;

// A flood with no arm behind it, each note claiming a fresh `from`.
await arm();
for (let i = 0; i < 50; i++) say(i, { from: `f${i}` });
await f.chain;
ok(await held() === 1, 'one arm keeps one note, whatever `from` each note claims', `${await held()} held of 50`);

// Each arm grants one more.
await arm(); say(100); await f.chain;
ok(await held() === 2, 'a second arm keeps a second note');

// Per address: twelve an hour in the live room.
let refused = 0;
for (let i = 0; i < 15; i++) if ((await arm('bbbb')).status === 429) refused++;
ok(refused === 3, 'one address gets twelve arms an hour in the live room', `${refused} of 15 refused`);
ok((await arm('cccc')).status === 200, 'another address is not blocked by the first');
let keyRefused = 0;
for (let i = 0; i < 15; i++) if ((await arm('key')).status === 429) keyRefused++;
ok(keyRefused === 0, 'a keyed caller (positron-mail) is held only by the room total', `${keyRefused} of 15 refused`);
let r = 0;
for (let i = 0; i < 120; i++) if ((await arm(`z${i}`)).status === 429) r++;
ok(r > 0, 'the room total still binds every caller', `${r} of 120 more refused`);

// An expired credit keeps nothing.
const f2 = new Feedback(fakeState(), {});
await f2.fetch(new Request('https://x/arm?room=feedback&who=dddd', { method: 'POST' }));
f2.credits = f2.credits.map(() => Date.now() - 1);
sock.fire(JSON.stringify({ type: 'feedback.say', id: 'late', text: 'late', origin: 'https://positron.studio' }));
await f2.chain;
ok((await (await f2.fetch(new Request('https://x/stats?room=feedback'))).json()).held === 0, 'an arm older than a minute keeps nothing');

// The entry worker hashes the Cloudflare-set address, never a header the caller picks.
let seen = '';
const env = { NOTES: { idFromName: (n) => n, get: () => ({ fetch: async (u) => { seen = u; return Response.json({ armed: true }); } }) } };
await worker.fetch(new Request('https://feedback.positron.studio/arm', { method: 'POST', headers: { origin: 'https://positron.studio', 'cf-connecting-ip': '203.0.113.9', 'x-forwarded-for': '1.2.3.4' } }), env);
const a = new URL(seen).searchParams.get('who');
await worker.fetch(new Request('https://feedback.positron.studio/arm', { method: 'POST', headers: { origin: 'https://positron.studio', 'cf-connecting-ip': '203.0.113.9', 'x-forwarded-for': '9.9.9.9' } }), env);
const b = new URL(seen).searchParams.get('who');
await worker.fetch(new Request('https://feedback.positron.studio/arm', { method: 'POST', headers: { origin: 'https://positron.studio', 'x-feedback-key': 'wrong' } }), { ...env, FEEDBACK_KEY: 'k3y' });
ok(new URL(seen).searchParams.get('who') !== 'key', 'a wrong key is an ordinary address');
await worker.fetch(new Request('https://feedback.positron.studio/arm', { method: 'POST', headers: { origin: 'https://positron.studio', 'x-feedback-key': 'k3y' } }), { ...env, FEEDBACK_KEY: 'k3y' });
ok(new URL(seen).searchParams.get('who') === 'key', 'the right key is counted as the keyed caller');
ok(a && a === b && !seen.includes('203.0.113.9'), 'the address is hashed from cf-connecting-ip and the raw address never reaches the object', `who=${a}`);
ok(new URL(seen).searchParams.get('room') === 'feedback', 'Origin positron.studio still arms the live room');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
