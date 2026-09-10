// Separate the relay's two costs.
//   ping -> pong  is answered by the WORKER RUNTIME's hibernation autoresponse.
//                 It never wakes the Durable Object, so it is pure network:
//                 this machine to Cloudflare's edge and back.
//   echo          goes through the room's Durable Object and back.
// The difference is the DO. Everything else is geography.
const URL_ = 'wss://ws.positron.studio/room/rttprobe/ws';
const N = 60;
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; };

const ws = new WebSocket(URL_);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });

const pongs = [], echoes = [];
let mode = 'ping', t0 = 0, resolve = null;
ws.onmessage = (m) => {
  const dt = performance.now() - t0;
  const s = typeof m.data === 'string' ? m.data : '';
  if (mode === 'ping' && s === 'pong') { pongs.push(dt); resolve?.(); }
  else if (mode === 'echo' && s.includes('"probe"')) { echoes.push(dt); resolve?.(); }
};
const once = (send) => new Promise((r) => { resolve = r; t0 = performance.now(); send(); setTimeout(r, 2000); });

for (let i = 0; i < N; i++) { await once(() => ws.send('ping')); await new Promise((r) => setTimeout(r, 60)); }
mode = 'echo';
for (let i = 0; i < N; i++) { await once(() => ws.send(JSON.stringify({ type: 'probe', from: 'rtt', at: Date.now(), i }))); await new Promise((r) => setTimeout(r, 60)); }
ws.close();

const pad = (s, n) => String(s).padEnd(n);
console.log(pad('what', 42) + pad('typical', 12) + pad('worst 1 in 20', 15) + 'n');
console.log(pad('this Mac -> Cloudflare edge -> back', 42) + pad(q(pongs,50).toFixed(2)+' ms', 12) + pad(q(pongs,95).toFixed(2)+' ms', 15) + pongs.length);
console.log(pad('  ... same trip THROUGH the Durable Object', 42) + pad(q(echoes,50).toFixed(2)+' ms', 12) + pad(q(echoes,95).toFixed(2)+' ms', 15) + echoes.length);
console.log('');
console.log('the Durable Object itself costs', (q(echoes,50) - q(pongs,50)).toFixed(2), 'ms at typical');
console.log('');
console.log('A note to the Pro is TWO of these trips: out to the edge and down to');
console.log('the Pro, then its receipt back up and down to me. Predicted round trip:');
console.log('  2 x', q(echoes,50).toFixed(2), '=', (2*q(echoes,50)).toFixed(1), 'ms');
