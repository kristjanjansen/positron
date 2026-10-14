#!/usr/bin/env node
// RETIRED: cues.positron.studio was deleted, so this no longer answers.
// Cue room to /tmp/overlay.txt for ffmpeg drawtext; only cues with data.burn are burned.
// node rig/overlay-bridge.mjs [room] [file]
// why: lessons/rig-misc.md#overlay-bridge
import { writeFileSync, readFileSync } from 'node:fs';
import path from "node:path";

const ROOM = process.argv[2] || 'burnin';
const FILE = process.argv[3] || '/tmp/overlay.txt';
const cuesToken = () => {
  try {
    const l = readFileSync(path.resolve(import.meta.dirname, "../.env"), 'utf8')
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
