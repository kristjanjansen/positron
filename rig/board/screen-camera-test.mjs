// rig/board/screen-camera-test.mjs: dither-oled.mjs and screen-camera.mjs with no camera, no relay and no panel.
// node rig/board/screen-camera-test.mjs
import { EventEmitter } from 'node:events';
import { createScreenCamera } from './screen-camera.mjs';
import { ditherFrame, litCount } from '../../demo/shell/dither-oled.mjs';
const ok = (c, m) => { console.log(c ? 'ok  ' : 'BAD ', m); if (!c) process.exitCode = 1; };
const W = 128, H = 64;
ok(litCount(ditherFrame(new Uint8Array(W * H), { stretch: false })) === 0, 'black lights no pixel');
ok(litCount(ditherFrame(new Uint8Array(W * H).fill(255), { stretch: false })) === 8192, 'white lights every pixel');
ok(litCount(ditherFrame(new Uint8Array(W * H).fill(128), { stretch: false })) === 4096, 'mid grey lights half');
const one = new Uint8Array(W * H); one[10 * W + 5] = 255;
const pk = ditherFrame(one, { stretch: false });
ok(pk[128 + 5] === 4 && litCount(pk) === 1, 'pixel (5,10) lands in byte 133, bit 2: page major, bit 0 on top');
let t = 0; const now = () => t;
const sent = [];
let sock;
class WS { constructor(u) { this.u = u; sock = this; this.readyState = 1; this.bufferedAmount = 0; setTimeout(() => this.onopen(), 0); }
  send(s) { const m = JSON.parse(s); sent.push(m); if (m.type === 'cam.key') setTimeout(() => this.onmessage({ data: JSON.stringify({ type: 'cam.key.ok' }) }), 0); }
  close() {} }
let procs = [];
const spawnImpl = (cmd, args) => { const p = new EventEmitter(); p.stdout = new EventEmitter(); p.stderr = new EventEmitter(); p.killed = []; p.kill = (s) => p.killed.push(s); p.cmd = cmd; p.args = args; procs.push(p); return p; };
const drawn = [];
const panel = { frame: (b) => drawn.push(b), status: () => ({ mode: 'raw' }), text: (s) => drawn.push(s) };
let busy = false;
const sc = createScreenCamera({ relay: 'wss://x', room: 'studio-1-cam', key: 'k', WS, spawnImpl, now, panel: () => panel,
  cameraBusy: () => busy, find: () => ({ ok: true, kind: 'usb', name: 'C925e', device: '/dev/video0' }) });
await new Promise((r) => setTimeout(r, 5));
ok(sock.u === 'wss://x/room/studio-1-cam/ws' && sent[0].type === 'cam.key', 'joins the keyed room with the key in the first message');
const hear = (m) => sock.onmessage({ data: JSON.stringify(m) });
busy = true; hear({ type: 'screen.camera', on: true, from: 'tab1' });
ok(sent.at(-1).type === 'screen.camera.refused' && !procs.length, 'refuses while the H.264 camera runs');
busy = false; hear({ type: 'screen.camera', on: true, from: 'tab1' });
ok(procs.length === 1 && sent.at(-1).type === 'screen.camera.started', 'starts on a renewal');
ok(procs[0].args.join(' ').includes('-f v4l2') && procs[0].args.includes('/dev/video0'), 'reads the device by v4l2');
const g = Buffer.alloc(8192, 200); procs[0].stdout.emit('data', g.subarray(0, 5000)); procs[0].stdout.emit('data', Buffer.concat([g.subarray(5000), g]));
const frames = sent.filter((m) => m.type === 'screen.frame');
ok(frames.length === 2 && drawn.length === 2 && Buffer.from(frames[0].b64, 'base64').length === 1024, 'two frames cut from split chunks, drawn and sent as 1024 bytes');
ok(Buffer.compare(Buffer.from(frames[1].b64, 'base64'), Buffer.from(drawn[1])) === 0, 'the page gets the bytes the panel got');
hear({ type: 'screen.camera', on: true, from: 'tab1' });
ok(procs.length === 1, 'a renewal does not start a second capture');
t = 16_000; await new Promise((r) => setTimeout(r, 2100));
ok(procs[0].killed.includes('SIGTERM') && sent.at(-1).type === 'screen.camera.stopped', `stops when nobody renews (${sent.at(-1).why})`);
ok(drawn.at(-1) === 'camera off', 'the screen says camera off');
hear({ type: 'screen.camera', on: true, from: 'tab2' }); ok(procs.length === 2, 'starts again for a new viewer');
procs[1].emit('exit', null, 'SIGKILL'); ok(/taken/.test(sent.at(-1).why) && !sc.running(), 'a sweep by camera.mjs is reported as the camera taken');
hear({ type: 'screen.camera', on: true, from: 'tab2' }); hear({ type: 'screen.camera', on: false, from: 'tab2' });
ok(procs[2].killed.includes('SIGTERM'), 'stop on on:false');
ok(createScreenCamera({ key: '' }).enabled === false, 'no key, nothing joined');
sc.stop(); process.exit();
