// node demo/resources/dump-bays.mjs [--base URL]: every concept page's drawn patch, read off
// window.__bays (createPatchbay) in one headless Chrome, into demo/resources/bays.json for
// /social/patchbay/. A visit opens nothing, so this asks no server but the local one.
import { writeFile } from 'node:fs/promises';
import { launchChrome, connectCdp } from '../chrome.mjs';
import { CONCEPTS } from '../shell/concept-list.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const i = process.argv.indexOf('--base');
const BASE = i > 0 ? process.argv[i + 1] : 'http://127.0.0.1:8890';
const OUT = new URL('./bays.json', import.meta.url);

const browser = await launchChrome({ prefix: 'positron-bays', args: ['--disable-gpu', '--mute-audio'] });
process.on('exit', () => browser.close());
const out = [];
try {
  const cdp = await connectCdp(browser.wsUrl);
  const { S } = await cdp.page();
  await S('Page.enable'); await S('Runtime.enable');
  for (const c of CONCEPTS) {
    await S('Page.navigate', { url: `${BASE}/${c.id}/` });
    let bays = null;
    for (let t = 0; t < 40 && !bays; t++) {
      await sleep(250);
      const r = await S('Runtime.evaluate', { expression: 'JSON.stringify((window.__bays || []).map((f) => f()))', returnByValue: true });
      const v = JSON.parse(r?.result?.value || '[]');
      if (v.length && v[0].links.length) bays = v;
    }
    if (!bays) { console.log(`  ${c.id}: no patch`); continue; }
    // A page with several patches: the one with the most links is the page's patch.
    const bay = bays.sort((a, b) => b.links.length - a.links.length)[0];
    out.push({ id: c.id, title: c.title, say: c.say, ...bay });
    console.log(`  ${c.id}: ${bay.nodes.length} boxes, ${bay.links.length} links`);
  }
  cdp.ws.close();
} finally { await browser.close(); }
await writeFile(OUT, JSON.stringify({ made: new Date().toISOString().slice(0, 10), bays: out }, null, 1) + '\n');
console.log(`${out.length} of ${CONCEPTS.length} concept pages -> ${OUT.pathname}`);
