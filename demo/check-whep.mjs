// demo/check-whep.mjs — can WebRTC media actually reach this machine?
//
// 🔴 WRITTEN AFTER A VPN COST MOST OF A SESSION, 2026-09-25. Every WebRTC page
// here failed, and the failure looked like code every single time: `/stage/`
// was rewritten five ways, the harness was blamed, then headless Chrome was
// blamed. None of them were it. A corporate VPN was passing the HTTPS
// signalling and dropping the UDP media, so Cloudflare ANSWERED every offer
// and not one byte of media ever arrived.
//
// It opens a real browser, negotiates WHEP against the live input, waits, and
// prints what actually crossed. No positron page is involved, so nothing in
// this repository can be the cause of what it reports.
//
//   node demo/check-whep.mjs
//
// MEASURED the same minute, same machine, one toggle apart:
//   VPN ON   status 201  connection failed     0 frames        0 bytes
//   VPN OFF  status 201  connection connected  489 frames  4,428,273 bytes
//
// ⚠️ THE STATUS IS 201 EITHER WAY, which is what makes this so hard to see:
// the handshake is HTTPS and it succeeds, so every log line about signalling
// reads healthy while the picture never starts.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PLAY = 'https://customer-mwuu1cmlyif6eluy.cloudflarestream.com'
  + '/224558e8993d5a5efd234d9d3a320f87/webRTC/play';
const PORT = 9570 + Math.floor(Math.random() * 200);
const dir = mkdtempSync(join(tmpdir(), 'whep-check-'));

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  [`--remote-debugging-port=${PORT}`, `--user-data-dir=${dir}`, '--no-first-run',
    '--autoplay-policy=no-user-gesture-required'], { stdio: 'ignore' });
const bye = () => { try { chrome.kill('SIGKILL'); } catch { /* gone */ } rmSync(dir, { recursive: true, force: true }); };
process.on('exit', bye);

await new Promise((r) => setTimeout(r, 4000));
const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?https://positron.studio/`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0; const waits = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (waits.has(m.id)) { waits.get(m.id)(m); waits.delete(m.id); } };
await new Promise((r) => (ws.onopen = r));
await new Promise((r) => setTimeout(r, 6000));   // let the page's own origin settle

const out = await new Promise((res) => {
  const i = ++id; waits.set(i, res);
  ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { awaitPromise: true, returnByValue: true, expression: `(async () => {
    const pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' });
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await new Promise((r) => { if (pc.iceGatheringState === 'complete') return r();
      const t = setTimeout(r, 4000);
      pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); r(); } }); });
    const r = await fetch(${JSON.stringify(PLAY)}, { method: 'POST', headers: { 'content-type': 'application/sdp' }, body: pc.localDescription.sdp });
    if (r.status >= 300) return { status: r.status, note: 'nothing is publishing to that input' };
    await pc.setRemoteDescription({ type: 'answer', sdp: await r.text() });
    await new Promise((x) => setTimeout(x, 15000));
    let frames = 0, bytes = 0;
    (await pc.getStats()).forEach((s) => { if (s.type === 'inbound-rtp' && s.kind === 'video') { frames = s.framesDecoded || 0; bytes = s.bytesReceived || 0; } });
    return { status: r.status, connection: pc.connectionState, framesDecoded: frames, bytesReceived: bytes };
  })()` } }));
});

const v = out.result?.result?.value || {};
console.log(JSON.stringify(v, null, 1));
if (v.framesDecoded > 0) console.log('\nWebRTC media reaches this machine.');
else {
  console.log('\n🔴 NO MEDIA ARRIVED, AND THE OFFER WAS ANSWERED.');
  console.log('   That is a UDP path problem and not this repository.');
  console.log('   CHECK THE VPN FIRST. It cost most of a session on 2026-09-25.');
}
process.exit(v.framesDecoded > 0 ? 0 : 1);
