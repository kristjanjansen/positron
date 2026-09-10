// HANDOFF item 0: min-RTT clock skew over a REAL LINK, between two machines.
//
//   node skew.mjs <id> [seconds] [room]
//
// Run it on BOTH machines at once with different ids. Everything the project's
// multi-device timing rests on is this number, and it has only ever been
// measured on loopback (peer-to-peer ±0.15 ms, drift 7 µs / 25 min) or against a
// Worker `/time` endpoint (±50 ms, and that was BIAS -- edge path asymmetry, not
// jitter).
//
// It stopped being theoretical today: MoQ transit between these two machines
// read −14.2 ms. A negative latency is the skew showing up, because the send
// stamp is one machine's clock and the read is the other's.
//
// WHY MIN-RTT AND NOT AN AVERAGE: an average is dragged by every queued packet;
// the minimum is the one sample that got through cleanly. The claim under test
// is that min-RTT estimation is SCALE-FREE -- a 311 ms link estimated as well as
// a 1.3 ms one -- but that evidence was still loopback-shaped. If a real link's
// offset spread is materially worse than ±0.15 ms, peer-to-peer estimation alone
// does not carry a multi-device click track, and that is the useful outcome.
//
// This runs in node: peer.mjs uses only WebSocket and performance, both global.
import { createPeer, wsTransport } from '../../proto/looper/peer.mjs';

const id = process.argv[2] || `peer-${Math.floor(Math.random() * 1e6)}`;
const secs = Number(process.argv[3] || 180);
const room = process.argv[4] || 'skew';

const peer = createPeer({
  id,
  transport: wsTransport(`wss://ws.positron.studio/room/${room}/ws`),
  pingEveryMs: 2000,
  pingBurst: 5,
});

console.log(`${id}: pinging in room "${room}" for ${secs}s`);
const t0 = Date.now();
const timer = setInterval(() => {
  const s = peer.stats();
  const el = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`  ${el}s  peers=${s.peers}  minRtt=${s.minRttMs === null ? '—' : s.minRttMs.toFixed(3)}  offset=${s.offsetMs.toFixed(3)}  samples=${s.skewSamples}`);
}, 15000);

await new Promise((r) => setTimeout(r, secs * 1000));
clearInterval(timer);

// Every skew sample the estimator saw, not only the ones it kept -- the SPREAD
// is the quantity under test, and reporting only the kept minimum would hide it.
const sk = peer.log.filter((l) => l.type === 'skew');
const kept = sk.filter((l) => l.kept);
const q = (a, p) => { const t = [...a].sort((x, y) => x - y); return t.length ? t[Math.min(t.length - 1, Math.floor(p / 100 * t.length))] : NaN; };
const rtts = sk.map((l) => l.rtt), offs = sk.map((l) => l.offset), keptOffs = kept.map((l) => l.offset);

console.log(`\n${id} — ${sk.length} samples over ${secs}s`);
if (!sk.length) { console.log('  no peer answered — is the other side running in the same room?'); process.exit(1); }
console.log(`  round trip     min ${Math.min(...rtts).toFixed(3)}  p50 ${q(rtts,50).toFixed(3)}  p95 ${q(rtts,95).toFixed(3)}  max ${Math.max(...rtts).toFixed(3)} ms`);
console.log(`  offset, ALL    p50 ${q(offs,50).toFixed(3)}  spread ${(Math.max(...offs) - Math.min(...offs)).toFixed(3)} ms`);
console.log(`  offset, KEPT   ${keptOffs.length} samples, spread ${keptOffs.length > 1 ? (Math.max(...keptOffs) - Math.min(...keptOffs)).toFixed(3) : '—'} ms`);
console.log(`  settled offset ${peer.offsetMs().toFixed(3)} ms  (this machine + offset = the reference clock)`);
console.log(`\n  loopback for comparison: ±0.15 ms. A materially worse spread here means`);
console.log(`  peer-to-peer estimation alone does not carry a multi-device click track.`);
process.exit(0);
