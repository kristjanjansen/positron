// proto/osc/bench-node.mjs — PHASE 3, the arms that need no browser.
//
//   node proto/osc/bench-node.mjs [--n 300] [--only do,local]
//
// Two WebSockets in ONE node process, so there is exactly ONE clock and the
// one-way latency has no clock-sync error at all (rig/do-lag.mjs's trick). That
// is worth more here than realism: the question is what the TRANSPORT costs,
// and a two-machine measurement would fold in an NTP estimate we do not need.
//
// WHAT IS MEASURED, per arm:
//   latency   one-way p50/p95/p99, from the sender's stamp inside the packet
//   loss      1 - bundlesReceived/bundlesSent
//   INTEGRITY the number that matters: of the bundles that arrived at all, how
//             many arrived COMPLETE (n of n)? A transport that delivers 4 of a
//             5-message chord has not "mostly worked" — it has produced a
//             chord nobody played.
//
// Three traffic arms, because bundle integrity is a function of ARRIVAL RATE:
//   burst   back-to-back bundles, 40 ms apart      (the chord-racing case)
//   sparse  300 ms apart                            (the phrase-gap case)
//   chord   3 bundles back-to-back, then a gap      (the exact 6f shape)

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as OSC from '../../timeline/osc.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const N = Number(arg('--n', 300));
const ONLY = arg('--only', null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowUs = () => (performance.timeOrigin + performance.now()) * 1000;

const pct = (a, p) => (a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(p * a.length))] : null);
const stat = (a) => ({ n: a.length, p50: r2(pct(a, 0.5)), p95: r2(pct(a, 0.95)), p99: r2(pct(a, 0.99)), min: r2(Math.min(...a)), max: r2(Math.max(...a)) });
const r2 = (x) => (x === null || !Number.isFinite(x) ? null : +x.toFixed(2));

// ---------------------------------------------------------------------------
// THE PAYLOAD. A real OSC bundle, built by our real codec — not a stand-in.
// Every element carries the group's identity so the receiver can judge
// integrity from the WIRE, without trusting the transport's own framing.
// ---------------------------------------------------------------------------
function makeBundle(bseq, n, tUs) {
  return OSC.encodeBundle({
    timetag: OSC.OSC_IMMEDIATE,
    elements: Array.from({ length: n }, (_, i) => ({
      address: `/bench/${i}`,
      types: 'iiid',
      args: [OSC.osc.int(bseq), OSC.osc.int(i), OSC.osc.int(n), OSC.osc.double(tUs)],
    })),
  });
}
/** decode a received packet into {bseq, n, got, tUs} — or null if it is not ours */
function readBundle(bytes) {
  let pkt;
  try { pkt = OSC.decodePacket(bytes); } catch { return null; }
  const { out } = OSC.flattenBundle(pkt);
  if (!out.length) return null;
  const a = out[0].message.args;
  if (!a || a.length < 4) return null;
  return { bseq: a[0], n: a[2], got: out.length, tUs: a[3], isBundle: !!pkt.bundle };
}

/** the traffic schedules, in ms offsets from t0 */
function schedule(shape, n) {
  const out = [];
  if (shape === 'burst') for (let i = 0; i < n; i++) out.push(i * 40);
  else if (shape === 'sparse') for (let i = 0; i < n; i++) out.push(i * 300);
  else for (let i = 0; i < n; i++) out.push(Math.floor(i / 3) * 450 + (i % 3) * 4);  // chord triples
  return out;
}
const sizeFor = (i) => 3 + (i % 6);          // 3..8 messages per bundle

// ---------------------------------------------------------------------------
// ARM: the DO relay (elektron-osc). Reliable, ordered, and the natural
// recorder/ordering point — one WS message in, one WS message out.
// ---------------------------------------------------------------------------
async function armDo(shape, n, room) {
  const env = Object.fromEntries((await readFile(join(HERE, '../../.env'), 'utf8'))
    .split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
  const tok = env.OSC_TOKEN;
  if (!tok) throw new Error('OSC_TOKEN missing from .env');
  const url = `wss://elektron-osc.kristjan-jansen.workers.dev/room/${room}/ws?token=${tok}`;
  const pub = new WebSocket(url), sub = new WebSocket(url);
  pub.binaryType = sub.binaryType = 'arraybuffer';
  await Promise.all([pub, sub].map((w) => new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('ws open timeout')), 15000);
    w.onopen = () => { clearTimeout(t); res(); };
    w.onerror = (e) => { clearTimeout(t); rej(new Error('ws error')); };
  })));
  const got = [];
  // The relay echoes to EVERY socket including the sender, so `sub` and `pub`
  // both receive; we count on `sub` only, and ignore pub's echo.
  sub.onmessage = (e) => { if (e.data instanceof ArrayBuffer) got.push({ b: new Uint8Array(e.data), at: nowUs() }); };
  await sleep(300);
  const r = await drive(shape, n, (bytes) => pub.send(bytes), got);
  pub.close(); sub.close();
  return r;
}

/** ARM: a local loopback control. Not a network — it isolates OUR OWN codec +
 *  harness cost, so every network number below can be read as network cost. */
async function armLocal(shape, n) {
  const got = [];
  const r = await drive(shape, n, (bytes) => got.push({ b: new Uint8Array(bytes), at: nowUs() }), got);
  return r;
}

/** shared driver: send on the schedule, then wait out the tail and score. */
async function drive(shape, n, send, got) {
  const times = schedule(shape, n);
  const sent = new Map();
  const t0 = Date.now();
  let bytesSent = 0;
  for (let i = 0; i < n; i++) {
    const wait = times[i] - (Date.now() - t0);
    if (wait > 0) await sleep(wait);
    const size = sizeFor(i);
    const bytes = makeBundle(i, size, nowUs());
    sent.set(i, size);
    bytesSent += bytes.length;
    send(bytes);
  }
  await sleep(3000);                                   // tail: let stragglers land
  return score(sent, got, bytesSent);
}

function score(sent, got, bytesSent) {
  const lat = [];
  const seen = new Map();                              // bseq -> got count
  let notOurs = 0, splitPackets = 0;
  for (const g of got) {
    const r = readBundle(g.b);
    if (!r) { notOurs++; continue; }
    if (seen.has(r.bseq)) { splitPackets++; seen.set(r.bseq, seen.get(r.bseq) + r.got); continue; }
    seen.set(r.bseq, r.got);
    lat.push((g.at - r.tUs) / 1000);
  }
  let complete = 0, partial = 0;
  for (const [bseq, want] of sent) {
    const g = seen.get(bseq);
    if (g === undefined) continue;
    if (g === want) complete++; else partial++;
  }
  const arrived = seen.size;
  return {
    bundlesSent: sent.size, bundlesArrived: arrived,
    lossPct: +((1 - arrived / sent.size) * 100).toFixed(2),
    complete, partial,
    integrityPct: arrived ? +((complete / arrived) * 100).toFixed(2) : null,
    // the number that matters end to end: of everything SENT, how much arrived WHOLE
    wholeOfSentPct: +((complete / sent.size) * 100).toFixed(2),
    splitPackets, notOurs, bytesSent,
    latency: lat.length ? stat(lat) : null,
  };
}

// ---------------------------------------------------------------------------
async function main() {
  const rows = [];
  const session = Date.now().toString(36);
  const arms = { local: armLocal, do: armDo };
  for (const [name, fn] of Object.entries(arms)) {
    if (ONLY && !ONLY.split(',').includes(name)) continue;
    for (const shape of ['burst', 'sparse', 'chord']) {
      const n = shape === 'sparse' ? Math.min(N, 120) : N;   // sparse at 300 ms would take 90 s at n=300
      process.stderr.write(`\n--- ${name} / ${shape} / n=${n} ---\n`);
      try {
        const r = await fn(shape, n, `osc-${session}-${shape}`);
        rows.push({ arm: name, shape, ...r });
        console.log(`${name.padEnd(6)} ${shape.padEnd(7)} n=${String(r.bundlesSent).padEnd(4)} ` +
          `loss ${String(r.lossPct).padEnd(6)}% integrity ${String(r.integrityPct).padEnd(6)}% ` +
          `whole ${String(r.wholeOfSentPct).padEnd(6)}% ` +
          (r.latency ? `p50 ${r.latency.p50} p95 ${r.latency.p95} p99 ${r.latency.p99} ms` : 'no latency'));
      } catch (e) {
        rows.push({ arm: name, shape, error: e.message });
        console.log(`${name}/${shape}: ERROR ${e.message}`);
      }
    }
  }
  await mkdir(join(HERE, 'results'), { recursive: true });
  await writeFile(join(HERE, 'results/bench-node.json'), JSON.stringify({ when: new Date().toISOString(), session, rows }, null, 1));
  console.log('\nwrote proto/osc/results/bench-node.json');
}
main();
