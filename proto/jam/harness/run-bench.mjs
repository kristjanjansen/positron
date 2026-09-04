// proto/jam/harness/run-bench.mjs — orchestrates the full latency matrix.
// Launches the jam pair (TWO headless Chromes, jam-udd-a / jam-udd-b), drives
// bench.html in both through the /msg mailboxes, applies CDP loss emulation,
// runs the Docker netem WS variants, computes stats, writes results/matrix.json.
//
//   node harness/run-bench.mjs [--only arm1,arm2] [--scale 1]
//
// Assumes server.mjs (:8893) and relay-local.mjs (:8895) are started by this
// script. Kills ONLY its own processes (jam-udd pattern, tracked pids).

import { spawn, execSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { openSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const JAM = join(HERE, '..');
const SCRATCH = '/private/tmp/claude-501/-Users-s32863-personal-positron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://127.0.0.1:8893';
const args = process.argv.slice(2);
const ONLY = (args.includes('--only') ? args[args.indexOf('--only') + 1] : '').split(',').filter(Boolean);
const SCALE = +(args.includes('--scale') ? args[args.indexOf('--scale') + 1] : 1);
const SESSION = Math.random().toString(36).slice(2, 8);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const kids = [];
function run(cmd, argv, name) {
  const fd = openSync(join(SCRATCH, `jam-${name}.log`), 'a');
  const p = spawn(cmd, argv, { stdio: ['ignore', fd, fd] });
  kids.push(p);
  console.log(`spawned ${name} pid=${p.pid}`);
  return p;
}
function sh(cmd) { try { return execSync(cmd, { encoding: 'utf8' }); } catch (e) { return e.stdout || ''; } }

// ---------- mailbox client ----------
async function post(box, msg) {
  await fetch(`${BASE}/msg/${box}`, { method: 'POST', body: JSON.stringify(msg) });
}
let evtCursor = 0;
async function pollEvt(waitMs = 5000) {
  const r = await fetch(`${BASE}/msg/evt?after=${evtCursor}&wait=${waitMs}`);
  const j = await r.json();
  evtCursor = j.next;
  return j.msgs;
}
const evtLog = [];
async function waitEvt(pred, timeoutMs, label) {
  const t0 = Date.now();
  for (const m of evtLog) if (pred(m)) return m;
  while (Date.now() - t0 < timeoutMs) {
    const msgs = await pollEvt(Math.min(10000, timeoutMs));
    evtLog.push(...msgs);
    for (const m of msgs) if (pred(m)) return m;
  }
  throw new Error(`waitEvt timeout: ${label}`);
}
let cmdId = 0;
async function both(op, extra, timeoutMs = 60000) {
  const id = ++cmdId;
  await post('cmd-b', { op, id, session: SESSION, ...extra });
  await post('cmd-a', { op, id, session: SESSION, ...extra });
  const done = { a: null, b: null };
  for (const role of ['a', 'b']) {
    const m = await waitEvt((e) => e.id === id && e.role === role && (e.kind.endsWith('-done') || e.kind === 'error' || e.kind === 'pong' || e.kind === 'calib'), timeoutMs, `${op} ${role}`);
    if (m.kind === 'error') throw new Error(`${role} ${op} failed: ${m.error}`);
    done[role] = m;
  }
  return done;
}

// ---------- CDP mini client ----------
class CDP {
  constructor() { this.id = 0; this.pending = new Map(); }
  async connect(port, urlMatch) {
    for (let i = 0; i < 60; i++) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        const page = list.find((t) => t.type === 'page' && t.url.includes(urlMatch));
        if (page) {
          this.ws = new WebSocket(page.webSocketDebuggerUrl);
          await new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
          this.ws.onmessage = (e) => {
            const m = JSON.parse(e.data);
            if (m.id && this.pending.has(m.id)) { this.pending.get(m.id)(m); this.pending.delete(m.id); }
          };
          return this;
        }
      } catch {}
      await sleep(500);
    }
    throw new Error('CDP connect failed :' + port);
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, (m) => m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result));
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async setLoss(pct) {
    await this.send('Network.enable');
    await this.send('Network.emulateNetworkConditions', {
      offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1,
      packetLoss: pct,
    });
  }
  async screenshot(file) {
    const r = await this.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(file, Buffer.from(r.data, 'base64'));
  }
}

// ---------- stats ----------
function pct(sorted, p) {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor(p / 100 * sorted.length))];
}
async function analyze(runId, meta) {
  let j;
  try { j = JSON.parse(await readFile(join(JAM, 'results', runId + '.json'), 'utf8')); }
  catch { return { runId, ...meta, error: 'no result file' }; }
  const ows = j.recs.map((r) => r[1] / 1000).sort((a, b) => a - b); // ms
  const row = {
    runId, ...meta, sent: j.sent, recv: j.recv,
    lossPct: +((1 - j.recv / j.sent) * 100).toFixed(2),
    p50: +pct(ows, 50)?.toFixed(2), p95: +pct(ows, 95)?.toFixed(2),
    p99: +pct(ows, 99)?.toFixed(2), min: +ows[0]?.toFixed(2), max: +ows[ows.length - 1]?.toFixed(2),
  };
  row.jitter = row.p95 !== null ? +(row.p95 - row.p50).toFixed(2) : null;
  console.log(`  ${runId}: n=${row.recv}/${row.sent} loss=${row.lossPct}% p50=${row.p50} p95=${row.p95} p99=${row.p99} jitter=${row.jitter} ms`);
  return row;
}

// ---------- main ----------
const rows = [];
let cdpA, cdpB;
const want = (arm) => !ONLY.length || ONLY.includes(arm);

async function doRun(arm, cfg, runId, scale = SCALE, timeoutMs = 200000) {
  await both('run', { arm, cfg, runId, scale }, timeoutMs);
  return analyze(runId, { arm, cfg });
}

async function main() {
  await mkdir(join(JAM, 'results'), { recursive: true });
  // 0) clean slate: kill only our own
  sh(`pkill -f 'jam-udd' 2>/dev/null`); sh(`pkill -f 'proto/jam/server.mjs' 2>/dev/null`); sh(`pkill -f 'proto/jam/relay-local.mjs' 2>/dev/null`);
  sh('docker rm -f jam-netem jam-netem0 2>/dev/null');
  await sleep(700);

  run('node', [join(JAM, 'server.mjs')], 'server');
  run('node', [join(JAM, 'relay-local.mjs')], 'relay');
  for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/time-local'); break; } catch { await sleep(250); } }

  const flags = (udd, port) => [
    '--headless=new', `--user-data-dir=${SCRATCH}/${udd}`, `--remote-debugging-port=${port}`,
    '--no-first-run', '--no-default-browser-check', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-features=IntensiveWakeUpThrottling,WebRtcHideLocalIpsWithMdns',
    '--autoplay-policy=no-user-gesture-required',
    '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-devices',
    '--window-size=1400,900',
  ];
  run(CHROME, [...flags('jam-udd-a', 9231), `${BASE}/harness/bench.html?peer=a&seed=${SESSION}`], 'chrome-a');
  run(CHROME, [...flags('jam-udd-b', 9232), `${BASE}/harness/bench.html?peer=b&seed=${SESSION}`], 'chrome-b');

  const readyA = await waitEvt((m) => m.kind === 'ready' && m.role === 'a', 40000, 'ready a');
  const readyB = await waitEvt((m) => m.kind === 'ready' && m.role === 'b', 40000, 'ready b');
  console.log('clock a:', JSON.stringify(readyA.clock));
  console.log('clock b:', JSON.stringify(readyB.clock));
  const clocks = { a: readyA.clock, b: readyB.clock };

  cdpA = await new CDP().connect(9231, 'bench.html');
  cdpB = await new CDP().connect(9232, 'bench.html');
  const PRELOSS = +(args.includes('--preloss') ? args[args.indexOf('--preloss') + 1] : 0);
  if (PRELOSS) { await cdpB.setLoss(PRELOSS); console.log('PRELOSS', PRELOSS, '% applied to B before any connection'); }

  // ---------- (a) DC direct ----------
  if (want('dc-direct')) {
    try {
      const s = await both('setup', { arm: 'dc-direct' }, 60000);
      console.log('dc-direct setup', JSON.stringify(s.a.info));
      rows.push(await doRun('dc-direct', 'rel-bin', 'dc-rel'));
      rows.push(await doRun('dc-direct', 'unrel-bin', 'dc-unrel'));
      await cdpB.setLoss(2);
      rows.push(await doRun('dc-direct', 'rel-bin', 'dc-rel-loss'));
      rows.push(await doRun('dc-direct', 'unrel-bin', 'dc-unrel-loss'));
      await cdpB.setLoss(0);
    } catch (e) { console.log('ARM FAIL dc-direct:', e.message); rows.push({ arm: 'dc-direct', error: e.message }); await cdpB.setLoss(0).catch(() => {}); }
    await both('teardown', { arm: 'dc-direct' }).catch(() => {});
  }

  // ---------- (b) SFU DataChannels ----------
  if (want('sfu-dc')) {
    try {
      const s = await both('setup', { arm: 'sfu-dc' }, 90000);
      console.log('sfu-dc setup ok', JSON.stringify(s.a.info));
      rows.push(await doRun('sfu-dc', 'rel-bin', 'sfu-rel'));
      rows.push(await doRun('sfu-dc', 'unrel-bin', 'sfu-unrel'));
      await cdpB.setLoss(2);
      rows.push(await doRun('sfu-dc', 'rel-bin', 'sfu-rel-loss'));
      rows.push(await doRun('sfu-dc', 'unrel-bin', 'sfu-unrel-loss'));
      await cdpB.setLoss(0);
    } catch (e) { console.log('ARM FAIL sfu-dc:', e.message); rows.push({ arm: 'sfu-dc', error: e.message }); await cdpB.setLoss(0).catch(() => {}); }
    await both('teardown', { arm: 'sfu-dc' }).catch(() => {});
  }

  // ---------- (c) DO relays ----------
  if (want('do-cues')) {
    try {
      await both('setup', { arm: 'do-cues' }, 30000);
      rows.push(await doRun('do-cues', 'json', 'cues-json'));
    } catch (e) { console.log('ARM FAIL do-cues:', e.message); rows.push({ arm: 'do-cues', error: e.message }); }
    await both('teardown', { arm: 'do-cues' }).catch(() => {});
  }
  if (want('do-jam')) {
    try {
      await both('setup', { arm: 'do-jam' }, 30000);
      rows.push(await doRun('do-jam', 'json', 'jam-json'));
      rows.push(await doRun('do-jam', 'bin', 'jam-bin'));
      await cdpB.setLoss(2); // expect NO effect on TCP-WS (CDP packetLoss is WebRTC-only) — prove it
      rows.push(await doRun('do-jam', 'bin', 'jam-bin-cdploss'));
      await cdpB.setLoss(0);
    } catch (e) { console.log('ARM FAIL do-jam:', e.message); rows.push({ arm: 'do-jam', error: e.message }); await cdpB.setLoss(0).catch(() => {}); }
    await both('teardown', { arm: 'do-jam' }).catch(() => {});
  }

  // ---------- (d) legacy echo ----------
  if (want('legacy')) {
    try {
      await both('setup', { arm: 'legacy' }, 30000);
      rows.push(await doRun('legacy', 'json', 'legacy-json'));
    } catch (e) { console.log('ARM FAIL legacy:', e.message); rows.push({ arm: 'legacy', error: e.message }); }
    await both('teardown', { arm: 'legacy' }).catch(() => {});
  }

  // ---------- (e) MoQ d14 ----------
  if (want('moq')) {
    try {
      await both('setup', { arm: 'moq' }, 60000);
      rows.push(await doRun('moq', 'bin', 'moq-bin'));
      rows.push(await doRun('moq', 'dgram', 'moq-dgram', 0.06, 90000)); // expect 100% loss (IETF: no datagrams)
      await cdpB.setLoss(2); // expect no effect (WebTransport/QUIC, not WebRTC) — verify
      rows.push(await doRun('moq', 'bin', 'moq-bin-cdploss'));
      await cdpB.setLoss(0);
    } catch (e) { console.log('ARM FAIL moq:', e.message); rows.push({ arm: 'moq', error: e.message }); await cdpB.setLoss(0).catch(() => {}); }
    await both('teardown', { arm: 'moq' }).catch(() => {});
  }

  // ---------- (f) local ws relay ----------
  if (want('ws-local')) {
    try {
      await both('setup', { arm: 'ws-local' }, 30000);
      rows.push(await doRun('ws-local', 'bin', 'wslocal-bin'));
      rows.push(await doRun('ws-local', 'json', 'wslocal-json'));
    } catch (e) { console.log('ARM FAIL ws-local:', e.message); rows.push({ arm: 'ws-local', error: e.message }); }
    await both('teardown', { arm: 'ws-local' }).catch(() => {});

    // Docker variants: 0% control then 2% netem loss (real TCP loss on the
    // relay->client egress leg; shows RTO-scale HOL stalls on sparse traffic)
    for (const [name, loss] of [['jam-netem0', 0], ['jam-netem', 2]]) {
      try {
        sh(`pkill -f 'proto/jam/relay-local.mjs' 2>/dev/null`);
        await sleep(500);
        const tc = loss ? `tc qdisc add dev eth0 root netem loss ${loss}% && ` : '';
        sh(`docker run -d --rm --name ${name} --cap-add=NET_ADMIN -p 8895:8895 -v ${JAM}:/app -w /app node:20-alpine sh -c "apk add --no-cache iproute2 >/dev/null 2>&1 && ${tc}node relay-local.mjs"`);
        let up = false;
        for (let i = 0; i < 60; i++) { if (sh(`docker logs ${name} 2>&1`).includes('relay-local on')) { up = true; break; } await sleep(500); }
        if (!up) throw new Error('docker relay did not start: ' + sh(`docker logs ${name} 2>&1`).slice(-300));
        await both('setup', { arm: 'ws-local' }, 30000);
        rows.push(await doRun('ws-local', 'bin', loss ? 'wsdocker-bin-loss2' : 'wsdocker-bin-loss0'));
        await both('teardown', { arm: 'ws-local' }).catch(() => {});
      } catch (e) { console.log(`ARM FAIL ${name}:`, e.message); rows.push({ arm: 'ws-local', cfg: name, error: e.message }); }
      sh(`docker rm -f ${name} 2>/dev/null`);
    }
  }

  // ---------- (a') DC through local Docker coturn + netem: REAL UDP loss ----------
  // CDP packetLoss is a no-op in Chrome 151 headless (verified at 50%), so the
  // unreliable-vs-reliable under-loss question is answered here: both peers
  // relay through coturn (iceTransportPolicy:'relay'); netem on the container
  // egress = genuine 2% UDP loss on each one-way path's second leg.
  if (want('dc-turn')) {
    for (const loss of [0, 2]) {
      try {
        sh('docker rm -f jam-turn 2>/dev/null');
        const tc = loss ? `tc qdisc add dev eth0 root netem loss ${loss}% && ` : '';
        sh(`docker run -d --rm --name jam-turn --user root --cap-add=NET_ADMIN --entrypoint sh -p 3478:3478/udp -p 3478:3478/tcp coturn/coturn:alpine -c "apk add --no-cache iproute2 >/dev/null 2>&1; ${tc}exec turnserver -n --lt-cred-mech --user=jam:jam --realm=jam --listening-port=3478 --no-tls --no-dtls --no-cli --allow-loopback-peers"`);
        let up = false;
        for (let i = 0; i < 60; i++) { if (sh('docker logs jam-turn 2>&1').match(/listener.*started|Total General servers/i)) { up = true; break; } await sleep(500); }
        if (!up) throw new Error('coturn did not start: ' + sh('docker logs jam-turn 2>&1').slice(-400));
        await sleep(1000);
        await both('setup', { arm: 'dc-direct', ice: 'turn' }, 60000);
        rows.push(await doRun('dc-direct', 'rel-bin', `dcturn${loss}-rel`));
        rows.push(await doRun('dc-direct', 'unrel-bin', `dcturn${loss}-unrel`));
        await both('teardown', { arm: 'dc-direct' }).catch(() => {});
      } catch (e) { console.log(`ARM FAIL dc-turn loss=${loss}:`, e.message); rows.push({ arm: 'dc-turn', cfg: 'loss' + loss, error: e.message }); await both('teardown', { arm: 'dc-direct' }).catch(() => {}); }
      sh('docker rm -f jam-turn 2>/dev/null');
    }
  }

  // re-calibrate at end (drift check across the ~20 min run)
  const recal = await both('calib', {}, 30000).catch(() => null);
  const out = { session: SESSION, at: new Date().toISOString(), scale: SCALE, clocks, recal: recal ? { a: recal.a.clock, b: recal.b.clock } : null, rows };
  await writeFile(join(JAM, 'results', 'matrix.json'), JSON.stringify(out, null, 2));
  console.log('\n=== MATRIX (ms one-way, same-host truth clock) ===');
  for (const r of rows) {
    if (r.error) { console.log(`${(r.runId || r.arm).padEnd(20)} ERROR ${r.error}`); continue; }
    console.log(`${r.runId.padEnd(20)} n=${String(r.recv).padStart(4)}/${String(r.sent).padEnd(4)} loss=${String(r.lossPct).padStart(5)}% p50=${String(r.p50).padStart(7)} p95=${String(r.p95).padStart(7)} p99=${String(r.p99).padStart(7)} jit=${String(r.jitter).padStart(6)}`);
  }
}

async function cleanup() {
  for (const p of kids) { try { p.kill(); } catch {} }
  sh(`pkill -f 'jam-udd' 2>/dev/null`);
  sh(`pkill -f 'proto/jam/server.mjs' 2>/dev/null`); sh(`pkill -f 'proto/jam/relay-local.mjs' 2>/dev/null`);
  sh('docker rm -f jam-netem jam-netem0 2>/dev/null');
}
main().then(cleanup, async (e) => { console.error('FATAL', e); await cleanup(); process.exit(1); });
