// rig/pico/net/test.mjs: the Pico's network code, on Linux in Docker, against
// the real relay, checked from this Mac through demo/shell/wire.mjs and
// demo/shell/graph-registry.mjs.
//
//   node rig/pico/net/test.mjs            build, self test, then wss, ws, and wss with a 4 KB TLS record buffer
//   node rig/pico/net/test.mjs --no-build reuse the binaries already in the Docker volume
//
// 🔴 NOTHING NATIVE RUNS ON THE MAC. The C is compiled and run in the image
// `positron-pico-net:2.2.0`; the binaries live in the Docker volume
// `positron-pico-net-bin`, never in this checkout. Only node runs here.
//
// ⚠️ OUR RELAY ONLY, AND NEVER studio-1. Every run makes its own room,
// `pico-test-<6 hex>`, and every site is `pico-<6 hex>` drawn fresh, so nothing
// here is heard by a page, a board or a person.
//
// Each variant checks, and exits 1 on any FAIL:
//   1. the C node's graph.announce arrives, graphProblem() is '' and
//      createRegistry().ingest() takes it, with the three ports
//   2. graph.ask brings another announce
//   3. light.set to <site>:led:light is logged by the C side as LIGHT #ff8800 ...
//   4. 100 node.ping -> node.pong round trips, p50/p99/max, Mac to relay to container and back
//   5. the container's own 100 relay pings and 100 room echoes (test.probe)
//   6. a 20 KB message in the room, then one more node.ping: does the link survive
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openWire } from '../../../demo/shell/wire.mjs';
import { createRegistry, graphProblem } from '../../../demo/shell/graph-registry.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const IMAGE = 'positron-pico-net:2.2.0';
const VOL = 'positron-pico-net-bin';
const hex = (n) => randomBytes(n).toString('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (ok, what, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${detail ? `  (${detail})` : ''}`); if (!ok) fails++; };
const stats = (v) => {
  const s = [...v].sort((a, b) => a - b);
  const at = (q) => s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)];
  return s.length ? { n: s.length, p50: +at(0.5).toFixed(1), p99: +at(0.99).toFixed(1), max: +s[s.length - 1].toFixed(1) } : { n: 0 };
};

function docker(args, opts = {}) {
  const r = spawnSync('docker', args, { encoding: 'utf8', ...opts });
  if (r.status !== 0) { console.log(r.stdout, r.stderr); throw new Error(`docker ${args.slice(0, 3).join(' ')} failed`); }
  return r.stdout;
}

if (!process.argv.includes('--no-build')) {
  if (spawnSync('docker', ['image', 'inspect', IMAGE]).status !== 0) {
    console.log(`== building ${IMAGE}`);
    docker(['build', '-t', IMAGE, HERE], { stdio: 'inherit' });
  }
  for (const [name, extra] of [['node-linux', ''], ['node-linux-in4k', '-DPOSITRON_TLS_IN=4096']]) {
    console.log(`== compiling ${name} in Docker`);
    process.stdout.write(docker(['run', '--rm', '-v', `${HERE}:/src:ro`, '-v', `${VOL}:/out`, IMAGE, 'sh', '/src/linux/build.sh', name, ...(extra ? [extra] : [])]));
  }
}
console.log('== self test, no network');
const st = spawnSync('docker', ['run', '--rm', '-v', `${VOL}:/out`, IMAGE, '/out/node-linux', '--selftest'], { encoding: 'utf8' });
process.stdout.write(st.stdout);
check(st.status === 0, 'the C self test passes');

async function variant({ label, scheme, bin, probe = true }) {
  const room = `pico-test-${hex(3)}`;
  const site = `pico-${hex(3)}`;
  const url = `${scheme}://ws.positron.studio/room/${room}/ws`;
  console.log(`\n== ${label}: ${url}, site ${site}`);
  const lines = [];
  const waiters = [];
  const cname = `pico-net-${hex(4)}`;
  const child = spawn('docker', ['run', '--rm', '--name', cname, '-v', `${VOL}:/out`, IMAGE, `/out/${bin}`, url, '--site', site, '--seconds', '120']);
  let buf = '';
  const exited = new Promise((r) => child.on('exit', (code) => r(code)));
  child.stdout.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      lines.push(line);
      console.log(`   C| ${line}`);
      for (const w of [...waiters]) if (w.re.test(line)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(line); }
    }
  });
  child.stderr.on('data', (d) => process.stdout.write(`   C! ${d}`));
  const waitLine = (re, ms = 10_000) => {
    const hit = lines.find((l) => re.test(l));
    if (hit) return Promise.resolve(hit);
    return new Promise((resolve) => { const w = { re, resolve }; waiters.push(w); setTimeout(() => { const k = waiters.indexOf(w); if (k >= 0) { waiters.splice(k, 1); resolve(null); } }, ms); });
  };

  const reg = createRegistry();
  let me = null;
  const heard = [];
  const msgWaiters = [];
  let openDone;
  const opened = new Promise((r) => { openDone = r; setTimeout(r, 15_000); });
  const wire = openWire(room, {
    by: 'tool', reconnect: false,
    onOpen: (from) => { me = from; openDone(); },
    onMessage: (got) => {
      if (got.kind !== 'json' || got.msg.from === me) return;
      heard.push({ t: performance.now(), msg: got.msg });
      for (const w of [...msgWaiters]) if (w.ok(got.msg)) { msgWaiters.splice(msgWaiters.indexOf(w), 1); w.resolve(got.msg); }
    },
  });
  const waitMsg = (ok, ms = 10_000, since = 0) => {
    const hit = heard.find((h) => h.t >= since && ok(h.msg));
    if (hit) return Promise.resolve(hit.msg);
    return new Promise((resolve) => { const w = { ok, resolve }; msgWaiters.push(w); setTimeout(() => { const k = msgWaiters.indexOf(w); if (k >= 0) { msgWaiters.splice(k, 1); resolve(null); } }, ms); });
  };
  await opened;
  check(!!me, 'the Mac joined the test room through wire.mjs');
  const out = { label, room, site };

  // 1. announce
  const ann = await waitMsg((m) => m.type === 'graph.announce' && m.graph?.site === site, 20_000);
  check(!!ann, 'graph.announce from the C node arrived');
  if (ann) {
    const prob = graphProblem(ann.graph);
    check(prob === '', "graphProblem(graph) is ''", prob || 'empty');
    const took = reg.ingest(ann);
    check(took === true, 'createRegistry().ingest() took the announcement');
    const m = reg.merged();
    const ids = m.ports.map((p) => p.id).sort();
    check(ids.join() === [`${site}:din:in`, `${site}:din:out`, `${site}:led:light`].sort().join(), 'the registry lists the three ports', ids.join(' '));
    const light = m.ports.find((p) => p.id === `${site}:led:light`);
    check(light?.medium === 'value' && light?.shape?.channels === 3 && light?.dir === 'in', 'the light port is an input, medium value, three channels');
    check(['id', 'type', 'from', 'at', 'seq'].every((k) => k in ann) && typeof ann.seq === 'number' && typeof ann.at === 'number', 'the envelope has id, type, from, at, seq', `at ${ann.at}, seq ${ann.seq}, by ${ann.by}`);
    out.announceBytes = Buffer.byteLength(JSON.stringify(ann));
  }

  // 2. graph.ask
  const t0 = performance.now();
  wire.send({ type: 'graph.ask' });
  const again = await waitMsg((m) => m.type === 'graph.announce' && m.graph?.site === site, 5000, t0);
  out.askMs = again ? +(performance.now() - t0).toFixed(1) : null;
  check(!!again, 'graph.ask brought another announce', `${out.askMs} ms`);

  // 3. light.set
  wire.send({ type: 'light.set', to: `${site}:led:light`, hex: '#ff8800', name: 'test', parts: [{ hex: '#0000ff', across: [0.2, 0.4] }], sender: 'pico-net-test' });
  const lit = await waitLine(/LIGHT #ff8800 parts=1 #0000ff@200-400/, 5000);
  check(!!lit, 'the C side logged the colour and the part', lit?.trim() || 'nothing');
  wire.send({ type: 'light.set', to: `pico-zzzzzz:led:light`, hex: '#123456' });
  await sleep(500);
  check(!lines.some((l) => /LIGHT #123456/.test(l)), 'a light.set to another port is ignored');

  // 4. node.ping round trips
  const rtt = [];
  let lost = 0;
  for (let n = 0; n < 100; n++) {
    const s = performance.now();
    wire.send({ type: 'node.ping', to: site, n });
    const p = await waitMsg((m) => m.type === 'node.pong' && m.to === me && m.n === n, 3000, s);
    if (p) rtt.push(performance.now() - s); else lost++;
  }
  out.nodePing = { ...stats(rtt), lost };
  check(rtt.length >= 99, '100 node.ping answered', JSON.stringify(out.nodePing));
  const base = [];
  for (let n = 0; n < 100; n++) { const r = await wire.ping(2000); if (r != null) base.push(r); }
  out.macRelayPing = stats(base);

  // 5. the container's own probes
  if (probe) {
    wire.send({ type: 'test.probe', to: site });
    const pr = await waitMsg((m) => m.type === 'test.probed', 40_000);
    check(!!pr, 'the C node ran its own probes and reported them');
    if (pr) out.cProbe = { relay: pr.relay, echo: pr.echo };
  }

  // 6. a big message in the room
  const big = 'x'.repeat(20_000);
  wire.send({ type: 'test.big', pad: big });
  await sleep(1500);
  const s6 = performance.now();
  wire.send({ type: 'node.ping', to: site, n: 9999 });
  const after = await waitMsg((m) => m.type === 'node.pong' && m.n === 9999, 4000, s6);
  out.survivesBig = !!after;
  out.bigLines = lines.filter((l) => /TLS read ended|closed|socket/.test(l));

  wire.send({ type: 'test.done', to: site });
  const code = await Promise.race([exited, sleep(8000).then(() => 'timeout')]);
  if (code === 'timeout') spawnSync('docker', ['kill', cname]);
  wire.close();
  const grab = (re) => lines.find((l) => re.test(l))?.replace(/^\s*[\d.]+ /, '') || null;
  out.tls = grab(/TIME tls handshake/);
  out.tcp = grab(/TIME dns/);
  out.upgrade = grab(/ws open, upgrade took/);
  out.arena = [grab(/ARENA after handshake/), grab(/ARENA peak over the whole run/)].filter(Boolean);
  out.stats = grab(/^.*STATS/);
  return out;
}

const results = [];
results.push(await variant({ label: 'wss, TLS IN 16 KB (the build for the board)', scheme: 'wss', bin: 'node-linux' }));
check(results.at(-1).survivesBig, 'wss 16 KB: the link survives a 20 KB message in the room');
results.push(await variant({ label: 'plain ws, for comparison', scheme: 'ws', bin: 'node-linux' }));
check(results.at(-1).survivesBig, 'ws: the link survives a 20 KB message in the room');
results.push(await variant({ label: 'wss, TLS IN 4 KB (is a smaller buffer safe?)', scheme: 'wss', bin: 'node-linux-in4k', probe: false }));
console.log(`\nNOTE wss 4 KB: the link ${results.at(-1).survivesBig ? 'SURVIVED' : 'DID NOT SURVIVE'} a 20 KB message in the room (expected not to)`);

console.log('\n== summary');
console.log(JSON.stringify(results, null, 2));
console.log(`\n${fails} failed`);
process.exit(fails ? 1 : 0);
