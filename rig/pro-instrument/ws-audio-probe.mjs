// Can our own WebSocket relay carry AUDIO, at the shape a microcontroller would
// send it? Run before buying an ESP32, not after.
//
//   node ws-audio-probe.mjs [seconds]
//
// THE POINT: Opus exists to save bandwidth, and on this relay bandwidth is the
// abundant thing — 512 KiB/s per socket against raw 48 kHz 16-bit mono PCM at
// 96 KB/s. Opus at 48 kHz is ~85% of one ESP32-S3 core (third-party benchmark),
// so encoding trades the SCARCE resource for the plentiful one. Sending raw PCM
// costs no CPU and no encoder frame delay.
//
// What could still kill it is the relay's own cap: 60 msg/s, enforced by a token
// bucket that drops SILENTLY — no error, no close, no backpressure. Measured off
// the wire: MSG_BURST 120 plus 60/s, 298 delivered in three seconds. So this
// probe counts what comes back, per configuration, and the counter is the only
// thing that can see a drop.
//
// The relay echoes to the sender, so round trip and loss are both measured on
// ONE clock and carry no clock offset.
const ROOM = process.env.WS_ROOM || 'audio-probe';
const URL_ = `wss://ws.positron.studio/room/${ROOM}/ws`;
const SECS = Number(process.argv[2] || 8);

// bytes = rate x seconds-per-frame x 2 bytes a sample, mono
const CONFIGS = [
  { label: 'PCM 48k, 20 ms', hz: 50,  bytes: 1920, note: '96 KB/s' },
  { label: 'PCM 48k, 40 ms', hz: 25,  bytes: 3840, note: '96 KB/s, half the messages' },
  { label: 'PCM 24k, 40 ms', hz: 25,  bytes: 1920, note: '48 KB/s' },
  { label: 'Opus 64k, 20 ms', hz: 50, bytes: 160,  note: 'for comparison' },
  { label: 'PCM 48k, 10 ms', hz: 100, bytes: 960,  note: 'deliberately OVER the 60/s cap' },
];

const q = (a, p) => { const t = [...a].sort((x, y) => x - y); return t.length ? t[Math.min(t.length - 1, Math.floor(p / 100 * t.length))] : NaN; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(cfg) {
  const ws = new WebSocket(URL_);
  ws.binaryType = 'arraybuffer';
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });

  const sentAt = new Map();
  const rtts = [];
  let got = 0, lastSeq = -1, gaps = 0;

  ws.onmessage = (e) => {
    const d = e.data;
    if (!(d instanceof ArrayBuffer) || d.byteLength < 12) return;
    const dv = new DataView(d);
    const seq = dv.getUint32(0, true);
    const t0 = sentAt.get(seq);
    if (t0 === undefined) return;
    sentAt.delete(seq);
    rtts.push(performance.now() - t0);
    got++;
    if (lastSeq >= 0 && seq !== lastSeq + 1) gaps += Math.max(0, seq - lastSeq - 1);
    lastSeq = seq;
  };

  const gap = 1000 / cfg.hz;
  const n = Math.round(cfg.hz * SECS);
  const buf = new Uint8Array(cfg.bytes);
  const dv = new DataView(buf.buffer);
  for (let i = 0; i < n; i++) {
    dv.setUint32(0, i, true);
    dv.setFloat64(4, performance.now(), true);
    sentAt.set(i, performance.now());
    if (ws.readyState === 1) ws.send(buf);
    await sleep(gap);
  }
  await sleep(1500);                       // let stragglers land
  ws.close();

  const loss = 100 * (n - got) / n;
  return { ...cfg, sent: n, got, loss, gaps,
           p50: q(rtts, 50), p95: q(rtts, 95), kbps: cfg.bytes * cfg.hz * 8 / 1000 };
}

console.log(`each configuration for ${SECS}s, through the deployed relay, echo timed on one clock\n`);
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('configuration', 18) + pad('kbit/s', 9) + pad('msg/s', 7) + pad('delivered', 12) + pad('loss', 8) + pad('round trip p50/p95', 20) + 'note');
for (const cfg of CONFIGS) {
  const r = await run(cfg);
  console.log(pad(r.label, 18) + pad(r.kbps.toFixed(0), 9) + pad(r.hz, 7)
    + pad(`${r.got}/${r.sent}`, 12) + pad(r.loss.toFixed(1) + '%', 8)
    + pad(`${r.p50?.toFixed(0)} / ${r.p95?.toFixed(0)} ms`, 20) + r.note);
}
console.log('\nThe relay caps at 60 msg/s and 512 KiB/s per socket, and drops silently.');
process.exit(0);
