#!/usr/bin/env node
/**
 * DO cue room -> text file -> ffmpeg drawtext burn-in.
 *
 * Subscribes to the cue relay and keeps /tmp/overlay.txt holding the latest
 * message. Any ffmpeg with
 *   drawtext=textfile=/tmp/overlay.txt:reload=30:...
 * burns it into the outgoing video: visible to every viewer on every player,
 * synced with the picture by construction (it travels *in* the picture).
 *
 * Cue convention: {at, until?, data:{burn:"text"}} — only cues with data.burn
 * are burned; `until` clears the overlay when it passes.
 *
 *   node rig/overlay-bridge.mjs [room] [file]
 */
import { writeFileSync, readFileSync } from 'node:fs';

const ROOM = process.argv[2] || 'burnin';
const FILE = process.argv[3] || '/tmp/overlay.txt';
const cuesToken = () => {
  try {
    const l = readFileSync('/Users/s32863/personal/positron/.env', 'utf8')
      .split('\n').find((x) => x.startsWith('CUES_TOKEN='));
    return l ? l.slice(11).trim() : '';
  } catch { return ''; }
};
const TOKEN = cuesToken();       // the worker requires CUES_TOKEN since the review fixes
const URL_ = `wss://cues.positron.studio/room/${ROOM}/ws` +
             (TOKEN ? `?token=${encodeURIComponent(TOKEN)}` : '');

let current = null;               // {text, until}
const write = (s) => { try { writeFileSync(FILE, s); } catch {} };
write('');

function apply(cue) {
  if (!cue?.data?.burn) return;
  const at = cue.at ?? Date.now();
  const delay = Math.max(0, at - Date.now());
  setTimeout(() => {
    current = { text: cue.data.burn, until: cue.until ?? null };
    write(current.text);
    console.log(`[burn] "${current.text}"${current.until ? ` until ${new Date(current.until).toISOString().slice(11, 19)}` : ''}`);
  }, delay);
}

setInterval(() => {
  if (current?.until && Date.now() > current.until) { current = null; write(''); console.log('[burn] cleared'); }
}, 250);

function connect(delay = 1000) {
  const ws = new WebSocket(URL_);
  ws.onopen = () => console.log(`[ws] connected to ${ROOM}`);
  ws.onmessage = (m) => {
    let f; try { f = JSON.parse(m.data); } catch { return; }
    if (f.type === 'cue') apply(f.cue);
    else if (f.type === 'cues') (f.cues || []).forEach(apply);
    else if (f.type === 'cancel' && current) { current = null; write(''); }
  };
  ws.onclose = () => setTimeout(() => connect(Math.min(15000, delay * 2)), delay);
  ws.onerror = () => { try { ws.close(); } catch {} };
}
connect();
console.log(`bridge: ${URL_} -> ${FILE}`);
