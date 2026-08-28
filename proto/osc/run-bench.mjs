// proto/osc/run-bench.mjs — drive two headless Chromes through the browser
// arms over CDP. Reuses proto/jam/harness/cdp.mjs verbatim (it is dependency
// free and already proven in the jam matrix; copying it would be the third
// copy of the same 46 lines).
//
//   node proto/osc/run-bench.mjs [--n 300] [--only moq-bundle,moq-msg]
//
// Kills only its OWN chromes (a distinct user-data-dir prefix) and its own
// server. Fresh session id per run -> fresh MoQ namespaces (§13.4).

import { spawn } from 'node:child_process';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CDP } from '../jam/harness/cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const UDD = '/tmp/osc-bench-udd';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const N = Number(arg('--n', 300));
const ONLY = arg('--only', null);
const SHAPES = (arg('--shapes', 'burst,sparse,chord')).split(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SESSION = Date.now().toString(36);

const ARMS = ['dc-direct', 'moq-bundle', 'moq-msg', 'do'];
const kids = [];
function kill() { for (const k of kids) { try { k.kill('SIGKILL'); } catch {} } }
process.on('exit', kill); process.on('SIGINT', () => { kill(); process.exit(1); });

async function main() {
  const server = spawn('node', [join(HERE, 'server.mjs')], { stdio: ['ignore', 'pipe', 'pipe'] });
  kids.push(server);
  server.stdout.on('data', (d) => process.stderr.write('[srv] ' + d));
  server.stderr.on('data', (d) => process.stderr.write('[srv!] ' + d));
  await sleep(900);

  const peers = {};
  for (const [peer, port] of [['a', 9241], ['b', 9242]]) {
    await rm(`${UDD}-${peer}`, { recursive: true, force: true });
    const ch = spawn(CHROME, [
      '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${UDD}-${peer}`,
      '--no-first-run', '--no-default-browser-check', '--disable-gpu',
      '--autoplay-policy=no-user-gesture-required',
      `http://127.0.0.1:8893/bench.html?peer=${peer}&seed=${SESSION}`,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    kids.push(ch);
    peers[peer] = { port };
  }
  await sleep(4000);
  for (const p of ['a', 'b']) peers[p].cdp = await new CDP().connect(peers[p].port, 'bench.html');

  // cdp.eval() has no timeout of its own; a hung arm would hang the matrix.
  const evalIn = (p, expr, ms) => Promise.race([
    peers[p].cdp.eval(expr),
    new Promise((_, rej) => setTimeout(() => rej(new Error(`eval timeout after ${ms} ms`)), ms)),
  ]);
  const evalBoth = (expr, ms = 30000) => Promise.all(['a', 'b'].map((p) => evalIn(p, expr, ms)));

  // wait for the module graph (ESM import of /timeline/osc.mjs + the MoQ bundle)
  let up = false;
  for (let i = 0; i < 40; i++) {
    const r = await evalBoth('!!(window.BENCH && window.BENCH.ready)').catch(() => [false, false]);
    if (r.every(Boolean)) { up = true; break; }
    await sleep(500);
  }
  if (!up) {
    for (const p of ['a', 'b']) console.error(`[${p}] errors:`, peers[p].cdp.errors.slice(0, 6));
    throw new Error('BENCH never became ready in one or both peers');
  }
  await evalBoth('BENCH.calibrate().then(()=>"ok")', 60000);
  console.error('both peers calibrated');

  const rows = [];
  for (const arm of ARMS) {
    if (ONLY && !ONLY.split(',').includes(arm)) continue;
    for (const shape of SHAPES) {
      const n = shape === 'sparse' ? Math.min(N, 120) : N;
      const budget = (shape === 'sparse' ? n * 300 : shape === 'burst' ? n * 40 : Math.ceil(n / 3) * 450) + 60000;
      process.stderr.write(`\n=== ${arm} / ${shape} / n=${n} ===\n`);
      try {
        const call = `BENCH.runArm(${JSON.stringify(arm)},${JSON.stringify(shape)},${n}).then(r=>JSON.stringify(r))`;
        const [, b] = await Promise.all([evalIn('a', call, budget), evalIn('b', call, budget)]);
        const r = JSON.parse(b);
        rows.push({ arm, shape, n, ...r });
        console.log(`${arm.padEnd(11)} ${shape.padEnd(7)} n=${String(n).padEnd(4)} ` +
          `loss ${String(r.lossPct).padEnd(6)}% integrity ${String(r.integrityPct).padEnd(6)}% ` +
          `whole ${String(r.wholeOfSentPct).padEnd(6)}% ` +
          (r.latency ? `p50 ${r.latency.p50} p95 ${r.latency.p95} p99 ${r.latency.p99} ms` : 'no latency') +
          `  [pkts ${r.packets} partial ${r.partial}]`);
      } catch (e) {
        rows.push({ arm, shape, n, error: String(e.message).slice(0, 300) });
        console.log(`${arm}/${shape}: ERROR ${String(e.message).slice(0, 200)}`);
      }
      await evalBoth('(BENCH.teardown(),1)').catch(() => {});
      await sleep(2500);
    }
  }

  await mkdir(join(HERE, 'results'), { recursive: true });
  await writeFile(join(HERE, 'results/bench-browser.json'),
    JSON.stringify({ when: new Date().toISOString(), session: SESSION, rows }, null, 1));
  console.log('\nwrote proto/osc/results/bench-browser.json');
  kill();
  process.exit(0);
}
main().catch((e) => { console.error(e); kill(); process.exit(1); });
