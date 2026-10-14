// node clear-recordings.mjs [--delete]: list, or delete, every Stream recording. Recording cannot
// be turned off on RTMPS and the 1000-minute cap blocks new live streams when full.
// why: lessons/rig-obs.md#clear-recordings
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(readFileSync(new URL('../../.env', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=') && !l.startsWith('#'))
  .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));

const base = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/stream`;
const H = { authorization: `Bearer ${env.CF_API_TOKEN}` };

const usage = async () => (await (await fetch(`${base}/storage-usage`, { headers: H })).json()).result;

const before = await usage();
const vids = (await (await fetch(`${base}?per_page=1000`, { headers: H })).json()).result;
console.log(`${vids.length} videos · ${before.totalStorageMinutes} min of the 1000-minute cap`);

if (!process.argv.includes('--delete')) {
  console.log('dry run — pass --delete to remove them');
  process.exit(0);
}

let ok = 0, fail = 0;
for (const v of vids) {
  const r = await fetch(`${base}/${v.uid}`, { method: 'DELETE', headers: H });
  if (r.ok) ok++;
  else { fail++; console.log(`  FAILED ${v.uid} -> ${r.status}`); }
}
await new Promise((r) => setTimeout(r, 3000));
const after = await usage();
console.log(`deleted ${ok}, failed ${fail} · storage ${before.totalStorageMinutes} -> ${after.totalStorageMinutes} min`);
