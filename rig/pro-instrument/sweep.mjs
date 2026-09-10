// Sweep the MoQ publisher's knobs across both relays and report loss and latency.
//
//   node sweep.mjs [repeats]        default 2
//
// WHY IT EXISTS: a single run once showed 31% loss over Cloudflare and two later
// runs at the IDENTICAL config showed 2.4% and 3.9%. One run is an anecdote, and
// an anecdote with a percentage sign on it reads like a finding. So every config
// is run more than once and the SPREAD is printed beside the median -- if the
// spread is wider than the difference between configs, the sweep has not
// separated anything and says so.
//
// The LAN relay is the control on every row: a change that helps on both is
// about the ENCODING, one that helps only over distance is about the PATH.
import { spawn, execFileSync } from 'node:child_process';

const HOST = process.env.PRO_HOST || 'mbp';
const LAN_RELAY = 'https://192.168.1.241:4443';
const LAN_PUB = 'https://127.0.0.1:4443';
const CERT = process.env.MOQ_CERT || '816dec73811a251e2ab4eae785c1641f5c319e2b31e51f44e2c284b6f297f5cd';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CONFIGS = [
  { label: 'baseline',      latencyMax: 100, groupMs: 50,  frameUs: 5000 },
  { label: 'retain 300',    latencyMax: 300, groupMs: 50,  frameUs: 5000 },
  { label: 'group 200',     latencyMax: 100, groupMs: 200, frameUs: 5000 },
  { label: 'frame 10 ms',   latencyMax: 100, groupMs: 50,  frameUs: 10000 },
  { label: 'frame 20 ms',   latencyMax: 100, groupMs: 50,  frameUs: 20000 },
];

function launch(cfg, relay) {
  const args = ['--ableton', '--latencyMax', cfg.latencyMax, '--groupMs', cfg.groupMs, '--frameUs', cfg.frameUs];
  if (relay === 'lan') args.push('--relay', LAN_PUB, '--relay-for', LAN_RELAY, '--cert', CERT);
  const remote = `export PATH=/opt/homebrew/bin:$PATH; cd ~/positron
    pkill -f 'pro-synth-udd' 2>/dev/null; pkill -f launch-synth 2>/dev/null; sleep 2
    nohup node rig/pro-instrument/launch-synth.mjs ${args.join(' ')} > /tmp/bridge.log 2>&1 &
    sleep 14; grep -cE 'audio in:' /tmp/bridge.log`;
  const out = execFileSync('ssh', ['-o', 'BatchMode=yes', HOST, remote], { encoding: 'utf8' }).trim();
  return out.endsWith('1');           // the capture line is the readiness signal
}

let port = 9300;
async function measure(notes = 12, gap = 1300) {
  const udd = `/private/tmp/sweep-udd-${port}`;
  const ch = spawn(CHROME, ['--headless=new', `--user-data-dir=${udd}`, '--no-first-run',
    '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${port}`,
    'http://127.0.0.1:8890/rig/pro-instrument/play.html?room=proinst'], { stdio: 'ignore' });
  const p = port++;
  await sleep(8000);
  let ws;
  try {
    const l = await (await fetch(`http://127.0.0.1:${p}/json/list`)).json();
    const page = l.find((t) => t.type === 'page' && t.url.includes('play.html'));
    ws = await new Promise((r, j) => { const s = new WebSocket(page.webSocketDebuggerUrl); s.onopen = () => r(s); s.onerror = j; });
  } catch { ch.kill(); return null; }
  let id = 1; const pend = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (pend.has(d.id)) { pend.get(d.id)(d.result); pend.delete(d.id); } };
  const ev = (e, aw = true) => new Promise((r) => { const i = id++; pend.set(i, (x) => r(x?.result?.value)); ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression: e, returnByValue: true, awaitPromise: aw } })); });

  for (let i = 0; i < 25; i++) {
    const st = JSON.parse(await ev('JSON.stringify([document.getElementById("d").textContent, document.getElementById("a").textContent])', false) || '["",""]');
    if (String(st[0]).includes('open') && String(st[1]).includes('live')) break;
    await sleep(1000);
  }
  await ev('document.querySelectorAll("#cases button")[1].click()', false);
  for (let i = 0; i < 25; i++) { if (await ev('!!window.__moq', false)) break; await sleep(1000); }
  await sleep(2500);
  await ev(`(async()=>{const s=[60,62,64,65,67,69,71,72];for(let i=0;i<${notes};i++){window.__play.note(s[i%8],"dc");await new Promise(r=>setTimeout(r,${gap}))}return 1})()`);
  await sleep(2000);
  const ears = JSON.parse(await ev('JSON.stringify(window.__play.ears.mq)', false) || '[]');
  const st = JSON.parse(await ev('JSON.stringify(window.__moq?window.__moq.stats():null)', false) || 'null');
  ch.kill();
  if (!st || st.decoded < 500) return null;            // too few frames is not a sample
  const q = (a, pp) => { const t = [...a].sort((x, y) => x - y); return t.length ? t[Math.min(t.length - 1, Math.floor(pp / 100 * t.length))] : NaN; };
  return { ear: q(ears, 50), n: ears.length, decoded: st.decoded, gaps: st.gaps,
           loss: 100 * st.gaps / Math.max(1, st.gaps + st.decoded) };
}

const REPEATS = Number(process.argv[2] || 2);
const rows = [];
for (const relay of ['lan', 'cf']) {
  for (const cfg of CONFIGS) {
    const runs = [];
    for (let r = 0; r < REPEATS; r++) {
      if (!launch(cfg, relay)) { console.log(`  ${relay} ${cfg.label}: bridge did not come up`); continue; }
      const m = await measure();
      if (m) runs.push(m); else console.log(`  ${relay} ${cfg.label}: run discarded (too few frames)`);
    }
    if (!runs.length) { rows.push({ relay, cfg, bad: true }); continue; }
    const losses = runs.map((r) => r.loss).sort((a, b) => a - b);
    const ears = runs.map((r) => r.ear).sort((a, b) => a - b);
    rows.push({ relay, cfg, n: runs.length,
      lossMed: losses[Math.floor(losses.length / 2)], lossMin: losses[0], lossMax: losses.at(-1),
      earMed: ears[Math.floor(ears.length / 2)], earMin: ears[0], earMax: ears.at(-1) });
    const r = rows.at(-1);
    console.log(`  ${relay.padEnd(3)} ${cfg.label.padEnd(12)} loss ${r.lossMed.toFixed(1)}% [${r.lossMin.toFixed(1)}–${r.lossMax.toFixed(1)}]   ear ${r.earMed.toFixed(0)} ms [${r.earMin.toFixed(0)}–${r.earMax.toFixed(0)}]   n=${r.n}`);
  }
}
console.log('\n| relay | config | loss median [spread] | key→ear median [spread] | runs |');
console.log('|---|---|---|---|---|');
for (const r of rows) {
  if (r.bad) { console.log(`| ${r.relay} | ${r.cfg.label} | — no valid run — | | 0 |`); continue; }
  console.log(`| ${r.relay} | ${r.cfg.label} | ${r.lossMed.toFixed(1)}% [${r.lossMin.toFixed(1)}–${r.lossMax.toFixed(1)}] | ${r.earMed.toFixed(0)} ms [${r.earMin.toFixed(0)}–${r.earMax.toFixed(0)}] | ${r.n} |`);
}
console.log('\nIf a spread overlaps the gap between two configs, this sweep has NOT separated them.');
