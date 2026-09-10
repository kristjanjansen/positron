// Delete every Cloudflare Stream recording. Storage is the lever HANDOFF item 5
// names: recording cannot be turned off on the RTMPS path (mode:off also kills
// HLS playback of a live input, and preferLowLatency requires "automatic"),
// deleteRecordingAfterDays bottoms out at 30, and the 1000-minute cap BLOCKS
// NEW LIVE STREAMS when it fills — so this is an outage risk, not a bill.
//
// Checked before this was written: none of the 59 recordings is referenced
// anywhere in the repo, and replay/seek play from R2
// (archive.positron.studio/shows/archive-test/), not from Stream. So clearing
// Stream costs no demo.
//
//   node clear-recordings.mjs           list only, deletes nothing
//   node clear-recordings.mjs --delete  actually delete
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
