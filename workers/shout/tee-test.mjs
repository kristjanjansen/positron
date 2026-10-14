// node workers/shout/tee-test.mjs: listeners arriving together on demo/fake-station.mjs must open
// one
// upstream. Any fetch to a host other than 127.0.0.1 throws, so it cannot reach a broadcaster.
// why: lessons/workers-shout.md#tee-test
import { startStation } from '../../demo/fake-station.mjs';
import { Mount } from './worker.mjs';

const realFetch = globalThis.fetch;
globalThis.fetch = (u, init) => {
  if (new URL(u).hostname !== '127.0.0.1') throw new Error(`refused: ${u}`);
  return realFetch(u, init);
};

const server = startStation({ port: 0, quiet: true });
if (!server) { console.log('no ffmpeg, cannot run'); process.exit(2); }
await new Promise((r) => server.on('listening', r));
const origin = `http://127.0.0.1:${server.address().port}/mount`;
const health = async () => (await realFetch(origin.replace('/mount', '/health'))).json();

let pass = 0, fail = 0;
const ok = (c, what) => { c ? pass++ : fail++; console.log(`${c ? 'ok  ' : 'FAIL'} ${what}`); };
const listen = (m, n = 32000) => m.fetch(new Request(`https://mount/listen?u=${encodeURIComponent(origin)}&bytes=${n}`));
const drain = async (r) => { let n = 0; const rd = r.body.getReader(); for (;;) { const { value, done } = await rd.read(); if (done) return n; n += value.byteLength; } };

try {
  const m = new Mount({});
  const rs = await Promise.all([listen(m), listen(m), listen(m), listen(m), listen(m)]);
  ok(rs.every((r) => r.status === 200), 'five listeners at once all answered 200');
  ok((await health()).listeners === 1, 'the stand-in counts exactly one listener for five at once');
  ok(JSON.parse(await (await m.fetch(new Request('https://mount/stats'))).text()).upstreamConnections === 1, '/stats reads upstreamConnections 1');
  const got = await Promise.all(rs.map(drain));
  ok(got.every((n) => n >= 32000), `every listener got its 32000 bytes (${got.join(', ')})`);

  // After the linger the origin is hung up; a new listener redials once, and the
  // old pump ending must not drop the new listener.
  m.linger && clearTimeout(m.linger);
  m.linger = null;
  m.reader.cancel(); m.reader = null;
  const [a, b] = await Promise.all([listen(m, 64000), listen(m, 64000)]);
  await new Promise((r) => setTimeout(r, 300));
  ok((await health()).listeners === 1, 'after a redial, still one listener at the stand-in');
  const [na, nb] = await Promise.all([drain(a), drain(b)]);
  ok(na >= 64000 && nb >= 64000, `redialled listeners were not dropped by the old pump (${na}, ${nb})`);

  // Negative control: two separate Mounts are two connections, so the count can fail.
  const m2 = new Mount({});
  const c = await listen(m2, 16000);
  await new Promise((r) => setTimeout(r, 300));
  ok((await health()).listeners === 2, 'control: a second Mount is a second listener, so the check can go red');
  await drain(c);
  for (const x of [m, m2]) { if (x.linger) clearTimeout(x.linger); try { x.reader?.cancel(); } catch {} }
} finally {
  server.close();
  server.closeAllConnections?.();
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
