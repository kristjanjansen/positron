#!/usr/bin/env node
/**
 * Measure Durable Object cue-relay latency. Two WebSocket clients in one
 * process (one clock — no sync error):
 *
 *   RTT        client -> DO -> same client        (ping/pong)
 *   one-way    publisher -> DO -> other client    (cue broadcast)
 *   DO clock   offset of the DO's Date.now() vs local (valid: local is
 *              NTP-synced to ~1 ms)
 *
 *   node rig/do-lag.mjs [wss://...] [n]
 */
const URL_ = process.argv[2] || 'wss://elektron-cues.kristjan-jansen.workers.dev/room/lagtest/ws';
const N = Number(process.argv[3] || 100);

const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(p * a.length))];
const stats = (a) => `p50 ${pct(a, .5).toFixed(1)}  p95 ${pct(a, .95).toFixed(1)}  p99 ${pct(a, .99).toFixed(1)}  max ${Math.max(...a).toFixed(1)} ms  (n=${a.length})`;

const open = (name) => new Promise((res, rej) => {
  const ws = new WebSocket(URL_);
  ws.onopen = () => res(ws);
  ws.onerror = (e) => rej(new Error(`${name}: ${e.message || 'ws error'}`));
});

const pub = await open('pub');
const sub = await open('sub');

const rtts = [], oneway = [], serverHop = [], offsets = [];
let seq = 0;

sub.onmessage = (m) => {
  const f = JSON.parse(m.data);
  if (f.type === 'cue' && f.cue?.data?.k === 'lag') {
    const now = Date.now();
    oneway.push(now - f.cue.data.sent);        // publisher -> DO -> subscriber
    serverHop.push(now - f.cue.serverAt);      // DO -> subscriber only
  }
};

function pingOnce() {
  return new Promise((res) => {
    const t0 = performance.now();
    pub.onmessage = (m) => {
      const f = JSON.parse(m.data);
      if (f.type !== 'pong') return;
      const t3 = performance.now();
      rtts.push(t3 - t0);
      // NTP-style offset: DO clock vs local midpoint
      offsets.push(f.t1 - (Date.now() - (t3 - t0) / 2));
      res();
    };
    pub.send(JSON.stringify({ type: 'ping', t0 }));
  });
}

for (let i = 0; i < N; i++) {
  await pingOnce();
  pub.send(JSON.stringify({
    type: 'cue',
    cue: { id: `lag-${seq}`, at: Date.now() + 60000, data: { k: 'lag', sent: Date.now(), seq: seq++ } },
  }));
  await new Promise((r) => setTimeout(r, 100));
}
await new Promise((r) => setTimeout(r, 1000));

console.log(`target: ${URL_}`);
console.log(`RTT (ping->pong)          ${stats(rtts)}`);
console.log(`one-way (pub->DO->sub)    ${stats(oneway)}`);
console.log(`DO->sub hop (via serverAt)${stats(serverHop)}`);
console.log(`DO clock offset vs local  p50 ${pct(offsets, .5).toFixed(1)} ms`);
pub.close(); sub.close();
