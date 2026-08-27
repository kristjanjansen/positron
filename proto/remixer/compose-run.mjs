// proto/remixer/compose-run.mjs — headless verification of the COMPOSED demo:
// a stored instrument session (a `midi` + `media-span` deck) placed as ONE SPAN
// inside the remixer's arrangement, beside archive layers.
//
//   node proto/remixer/compose-run.mjs
//
// ONE headless Chrome, port 8891 (this agent's), CDP 9331, profile pattern
// `compose-udd`. ZERO upstream ERR calls (compose.html never touches the
// archive API — index.html's own autotest already proved the real-1965 case).
// Kills only its own.

import { spawn, execSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { openSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CDP } from '../jam/harness/cdp.mjs';       // reused verbatim, not copied

const ROOT = dirname(fileURLToPath(import.meta.url));
const SCRATCH = '/private/tmp/claude-501/-Users-s32863-personal-elektron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8891, DBG = 9331;
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sh = (c) => { try { return execSync(c, { encoding: 'utf8' }); } catch (e) { return (e.stdout || '') + ''; } };

const kids = [];
function spawnLogged(cmd, argv, name) {
  const fd = openSync(join(SCRATCH, `compose-${name}.log`), 'a');
  const p = spawn(cmd, argv, { stdio: ['ignore', fd, fd] });
  kids.push(p);
  return p;
}

let cdp = null;
async function main() {
  await mkdir(SCRATCH, { recursive: true });
  sh(`pkill -f 'compose-udd' 2>/dev/null`);
  sh(`pkill -f 'proto/remixer/server.mjs' 2>/dev/null`);
  await sleep(300);

  spawnLogged('node', [join(ROOT, 'server.mjs')], 'server');
  for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/compose.html'); break; } catch { await sleep(250); } }

  spawnLogged(CHROME, [
    '--headless=new', `--user-data-dir=${SCRATCH}/compose-udd`, `--remote-debugging-port=${DBG}`,
    '--no-first-run', '--no-default-browser-check',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--disable-features=IntensiveWakeUpThrottling,CalculateNativeWinOcclusion',
    '--autoplay-policy=no-user-gesture-required',
    '--window-size=1500,1000',
    `${BASE}/compose.html`,
  ], 'chrome');

  cdp = await new CDP().connect(DBG, 'compose.html');
  await cdp.send('Page.enable').catch(() => {});
  await cdp.send('Runtime.enable').catch(() => {});
  const console_ = [];
  cdp.ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
      console_.push((m.params.args || []).map((a) => a.value || a.description).join(' '));
    if (m.method === 'Runtime.exceptionThrown')
      console_.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  });

  for (let i = 0; i < 80; i++) {
    if (await cdp.eval('!!window.__compose').catch(() => false)) break;
    await sleep(500);
  }
  const built = await cdp.eval('window.__compose.summary');
  console.log('built:', JSON.stringify(built));

  const R = await cdp.eval('window.__compose.run()', { awaitPromise: true });
  R.consoleErrors = console_;
  for (const c of R.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}\n        ${c.detail}`);
  console.log(`\n${R.pass}/${R.total}  console errors: ${console_.length}`);

  // The picture: a parent seek that lands on the MIDDLE OF A NOTE inside the
  // nested session — the child's held-note reduce re-asserts it, so the key is
  // lit at a position the parent chose, two domains up.
  const shot = await cdp.eval(`(()=>{const c=window.__compose;
      const n=c.CH.notes.filter(x=>x.off-x.on>60);const t=n[Math.floor(n.length*0.55)];
      c.PA.deck.seek(30000+(t.on+t.off)/2);
      return {note:t.n,childMs:(t.on+t.off)/2,parentMs:30000+(t.on+t.off)/2,
              held:[...c.CH.voices],childPos:c.CH.deck.position()};})()`);
  console.log('shot:', JSON.stringify(shot));
  await sleep(300);
  await cdp.screenshot(join(ROOT, 'compose-nested.png'));
  console.log('screenshot -> proto/remixer/compose-nested.png');

  await writeFile(join(ROOT, 'compose-report.json'), JSON.stringify(R, null, 2));
  return R.pass === R.total && console_.length === 0;
}

let ok = false;
try { ok = await main(); }
catch (e) { console.error('RUN FAILED:', e.stack || e.message); }
finally {
  if (cdp) cdp.close();
  for (const p of kids) { try { p.kill(); } catch {} }
  await sleep(400);
  sh(`pkill -f 'compose-udd' 2>/dev/null`);
  sh(`pkill -f 'proto/remixer/server.mjs' 2>/dev/null`);
  console.log('cleanup done');
  process.exit(ok ? 0 : 1);
}
