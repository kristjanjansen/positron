// node demo/connect-e2e.mjs [--times N]: /connect/ end to end, by hand only, NEVER in a suite.
// It asks the REAL model (kimi-k2.6 through demo/wish-local.mjs on :8799), which costs money:
// under a cent a run of seven sentences (about $1.06 per 1000 asks), so a few cents for a session.
// Needs `node demo/server.mjs` (:8890) and `node demo/wish-local.mjs` (:8799) running.
// Each step types a sentence (or presses a pill), plays the keys or the drum machine, and reads
// window.__demo.runtime: what the sampler chose, the synth's wave and cutoff, and the level at the speakers.
// A step is INFRA, not FAIL, when the worker, the network or a timeout is the cause.
// why: lessons/harness.md#connect-e2e
import { writeSync } from 'node:fs';
import { launchChrome, connectCdp } from './chrome.mjs';

const PAGE = process.env.E2E_PAGE || 'http://127.0.0.1:8890';
const API = process.env.E2E_API || 'http://127.0.0.1:8799';
const URL_ = `${PAGE}/connect/?api=${API}`;
const STEP_MS = 90_000;
const times = Number(process.argv[process.argv.indexOf('--times') + 1]) || 1;

const STEPS = [
  { say: 'keys play the piano', play: 'keys', want: (s) => s.sampler === 'Piano' },
  { say: 'switch it to the rhodes', play: 'keys', want: (s) => s.sampler === 'Rhodes' },
  { say: 'add the synth an octave up', play: 'keys', want: (s) => s.sampler === 'Rhodes' && s.synth },
  { pill: 'start new' },
  { say: 'sawtooth synth on the keys', play: 'keys', want: (s) => s.wave === 'sawtooth' },
  { say: 'make it darker', play: 'keys', want: (s, p) => s.wave === 'sawtooth' && s.cutoff < (p?.cutoff ?? 8000) },
  { pill: 'start new' },
  { say: 'the drum machine plays plaits', play: 'seq', want: (s) => s.links.some((l) => l.includes('sequencer:midi-out') && l.includes('plaits')) },
  { say: 'granulate it', play: 'seq', want: (s) => s.links.some((l) => l.includes('grains')) },
];
// A page line that blames the wire, not the model or the page.
const INFRA_RE = /nothing answered|Failed to fetch|did not load: .*\b5\d\d\b|the model did not answer|HTTP 5\d\d|rate limit|ECONN|timed out/i;

/** One line, written at once (no buffering behind a pipe). */
const say = (line) => writeSync(1, `${line}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const within = (p, ms, what) => Promise.race([p, sleep(ms).then(() => { throw new Error(`${what} timed out after ${ms / 1000} s`); })]);

async function up(url) {
  try { await fetch(url, { signal: AbortSignal.timeout(3000) }); return true; } catch { return false; }
}
if (!(await up(`${PAGE}/connect/`))) { say(`INFRA: nothing answers at ${PAGE}; start node demo/server.mjs`); process.exit(2); }
if (!(await up(API))) { say(`INFRA: nothing answers at ${API}; start node demo/wish-local.mjs`); process.exit(2); }

const chrome = await launchChrome({ prefix: 'connect-e2e', args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
let code = 0;
try {
  const cdp = await connectCdp(chrome.wsUrl, { timeout: STEP_MS });
  for (let run = 1; run <= times; run++) {
    const rows = await oneRun(cdp, run);
    say(`\nrun ${run}`);
    say('| step | result | s | peak | sampler | synth | wave | cutoff | why |');
    say('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const r of rows) say(`| ${r.step} | ${r.result} | ${r.s ?? ''} | ${r.peak ?? ''} | ${r.sampler ?? ''} | ${r.synth ?? ''} | ${r.wave ?? ''} | ${r.cutoff ?? ''} | ${r.why ?? ''} |`);
    if (rows.some((r) => r.result === 'FAIL')) code = 1;
    else if (rows.some((r) => r.result === 'INFRA') && code === 0) code = 2;
  }
  cdp.close();
} catch (e) {
  say(`INFRA: ${e.message}`);
  code = 2;
} finally {
  await chrome.close();
}
process.exit(code);

async function oneRun(cdp, run) {
  const { S, targetId } = await cdp.page();
  const ev = async (expr) => (await S('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.value;
  const logsFrom = (t) => ev(`window.__demo.logs.filter((x) => x.t >= ${t}).map((x) => \`\${x.kind} \${x.msg}\`)`);
  const rows = [];
  try {
    await S('Runtime.enable');
    await S('Page.navigate', { url: URL_ });
    for (let i = 0; i < 40 && !(await ev('!!window.__demo?.ready')); i++) await sleep(250);
    let prev = null;
    for (const st of STEPS) {
      if (st.pill) {
        await ev(`[...document.querySelectorAll('.cn-pill')].find((b) => /start new/i.test(b.textContent))?.click()`);
        await sleep(800);
        say(`run ${run} -- pill "${st.pill}"`);
        rows.push({ step: `(${st.pill})`, result: 'pressed' });
        prev = null;
        continue;
      }
      const t0 = Date.now(), mark = await ev('performance.now()');
      say(`run ${run} .. "${st.say}"`);
      let row;
      try {
        row = await within(step(st, prev), STEP_MS, `"${st.say}"`);
      } catch (e) {
        const lines = (await logsFrom(mark).catch(() => [])) || [];
        const infra = lines.find((l) => INFRA_RE.test(l));
        row = { result: infra || /timed out/.test(e.message) ? 'INFRA' : 'FAIL', why: (infra || e.message).trim().slice(0, 160), stop: true };
      }
      if (row.result === 'FAIL' || row.result === 'PASS') {
        const lines = (await logsFrom(mark)) || [];
        const infra = lines.find((l) => INFRA_RE.test(l));
        if (row.result === 'FAIL' && infra) { row.result = 'INFRA'; row.why = infra.trim().slice(0, 160); }
        else if (row.result === 'FAIL') row.why ||= (lines.filter((l) => /^(warn|bad) /.test(l)).pop() || '').slice(0, 160);
      }
      row.step = st.say;
      row.s = ((Date.now() - t0) / 1000).toFixed(1);
      say(`run ${run} ${row.result} "${st.say}" ${row.s}s peak ${row.peak} sampler ${row.sampler} synth ${row.synth} wave ${row.wave} cutoff ${row.cutoff}`);
      say(`     links: ${row.links?.join(' | ') || '(none)'}${row.why ? `\n     why: ${row.why}` : ''}`);
      rows.push(row);
      if (row.result === 'PASS') prev = row;
      // A step that never finished may still be pressing keys, so the rest of this run is not graded.
      if (row.stop) { for (const rest of STEPS.slice(STEPS.indexOf(st) + 1)) rows.push({ step: rest.say ?? `(${rest.pill})`, result: 'skipped' }); break; }
    }
  } finally {
    await cdp.send('Target.closeTarget', { targetId }).catch(() => {});
  }
  return rows;

  async function step(st, prev) {
    await ev(`(() => { const i = document.querySelector('.cn-ask input'); i.value = ${JSON.stringify(st.say)}; i.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('.cn-ask').requestSubmit(); })()`);
    // The ask is over when the send button stops shimmering.
    await sleep(300);
    while (await ev(`!!document.querySelector('.cn-ask button[data-busy]')`)) await sleep(400);
    await ev('window.__demo.runtime.idle()');
    await sleep(1500);
    const playJs = st.play === 'seq'
      ? `(async () => { const s = window.__demo.runtime.get('web:sequencer'); s?.face?.querySelector('.tbar-toggle')?.click(); await new Promise((r) => setTimeout(r, 4000)); })()`
      : `(async () => { const k = window.__demo.runtime.get('web:keys')?.kb; if (!k) return; for (const n of [48, 55, 60, 64, 67, 72]) { k.press(k.keyOf(n)); await new Promise((r) => setTimeout(r, 300)); k.release(k.keyOf(n)); } })()`;
    let peak = 0;
    const playing = ev(playJs);
    for (let i = 0; i < 16; i++) { await sleep(250); peak = Math.max(peak, (await ev('window.__demo.runtime.level?.() ?? 0')) || 0); }
    await playing;
    if (st.play === 'seq') await ev(`window.__demo.runtime.get('web:sequencer')?.face?.querySelector('.tbar-toggle')?.click()`);
    const s = await ev(`(() => { const R = window.__demo.runtime; const sam = R.get('web:sampler'), syn = R.get('web:synth');
      const links = [...document.querySelectorAll('.cn-hit')].map((h) => h.querySelector('title')?.textContent?.split('\\n')[0] || '');
      return { sampler: sam?.chosen?.() ?? null, synth: !!syn, wave: syn?.param?.('wave') ?? null, cutoff: syn?.param?.('cutoff') ?? null, links }; })()`);
    s.peak = +peak.toFixed(4);
    s.result = s.peak > 0.005 && st.want(s, prev) ? 'PASS' : 'FAIL';
    if (s.result === 'FAIL' && !(s.peak > 0.005)) s.why = `silent at the speakers (peak ${s.peak})`;
    return s;
  }
}
