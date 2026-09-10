// proto/looper/server.mjs — static files AND the relay for the looper. Port 8891.
//
//   node proto/looper/server.mjs   ->  http://127.0.0.1:8891/proto/looper/
//
// The relay it needs for a cross-device room is the REAL worker, run locally:
//   cd workers/relay && npx wrangler dev --local --ip 0.0.0.0 --port 8892
// A hand-written stand-in was measured against it and matched on every check,
// which is exactly why it is not here — see archive/plans/looper-local-relay.mjs.
//
// Serves the REPO ROOT so `../../timeline/*.mjs` resolves from the page — the
// instrument imports the shipped library, never a copy.
//
// It binds 0.0.0.0 rather than 127.0.0.1 because plan-uuu-local P3 is "two
// devices, one LAN, no uplink" and a loopback-only bind cannot be that. Say the
// LAN address out loud at startup, since the other device has to type it and
// mDNS is not reliably available.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname, extname, resolve, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
export const PORT = 8891;

const MIME = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript',
               '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };

/** every non-internal IPv4 address, so the other device can be told where to go */
export function lanAddresses() {
  return Object.values(networkInterfaces()).flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal).map((n) => n.address);
}

export function serve(port = PORT, { host = '0.0.0.0' } = {}) {
  const s = createServer(async (req, res) => {
    const rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^([/\\])+/, '');
    if (rel.includes('..')) { res.writeHead(400).end(); return; }
    const file = join(ROOT, rel === '' ? 'proto/looper/index.html' : rel.endsWith('/') ? join(rel, 'index.html') : rel);
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404).end('nope'); }
  });
  return new Promise((r) => s.listen(port, host, () => r(s)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await serve();
  console.log(`looper on http://127.0.0.1:${PORT}/proto/looper/`);
  const addrs = lanAddresses();
  if (!addrs.length) { console.log('  (no LAN address — this host is loopback-only)'); }
  for (const a of addrs) {
    // `?room=NAME` alone shares a loop between TABS on one machine
    // (BroadcastChannel, no network). A second DEVICE needs `&relay=`, which is
    // a full ws:// URL including the room path — the same shape the deployed
    // relay uses, so the page cannot tell a local hop from an edge one.
    console.log(`  another device:  http://${a}:${PORT}/proto/looper/?room=hall&relay=ws://${a}:8892/room/hall/ws`);
  }
  if (addrs.length) {
    console.log('  and the relay for that (the REAL worker, run locally):');
    console.log('     cd workers/relay && npx wrangler dev --local --ip 0.0.0.0 --port 8892');
  }
}
