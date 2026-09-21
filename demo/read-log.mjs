#!/usr/bin/env node
// demo/read-log.mjs — what a page SAID, where a session can read it.
//
// 🔴 THE POINT OF IT, AND IT IS `read-tap.mjs` ONE STEP ALONG. Asked for
// 2026-09-21: *"build a way to get the logs and debug (like you did with
// tap)"*. Every demo page has a log and every log line is on somebody's screen,
// which is somewhere a session cannot look. An afternoon of this project was
// spent with the person at the desk taking a screenshot of a log so that I
// could read it back, one question at a time, which is exactly the round trip
// `/_tap` was built to stop for MIDI.
//
//   node demo/server.mjs               # must be running; every page posts to it
//   node demo/read-log.mjs             # the last run of every page
//   node demo/read-log.mjs wish        # only pages whose url matches
//   node demo/read-log.mjs --all       # every run, not just the last
//   node demo/read-log.mjs --bad       # only the lines a page marked bad
//   node demo/read-log.mjs --follow    # keep printing as they arrive
//   node demo/read-log.mjs --clear     # start a fresh capture
//
// 🔴 AND FOR A PAGE THAT IS NOT ON THIS MACHINE, THE WORKER ALREADY EXISTS.
// Open the page with `?logs=1` and read it back with
//
//   curl -s 'https://pub.positron.studio/logs?format=text'
//
// which is how a phone, a headset or `https://positron.studio/...` is read at
// all. `shell.mjs` sends to both, and the Worker half is behind that flag on
// purpose: a deployed page shipping every visitor's log by default would be a
// page opening something on load.
//
// 🔴 IT READS A FILE THE DEV SERVER WROTE, AND NOTHING DEPLOYED CAN WRITE IT.
// `shell.mjs` only posts when the page is on localhost, and there is no `/_log`
// route in `workers/view/src/index.js`. Two guards, in that order, so a
// visitor's browser never makes the request rather than making one that 404s.
//
// ⚠️ A PAGE WITH NOTHING LISTENING BEHAVES IDENTICALLY. The post is batched,
// `keepalive`, and its failure is swallowed. A debugging aid that changes what
// it is watching is worse than none.

import { readFileSync, writeFileSync, existsSync, watchFile } from 'node:fs';

const FILE = new URL('../.tap/log.jsonl', import.meta.url);
const arg = process.argv.slice(2);
const flag = (f) => arg.includes(f);
const match = arg.filter((a) => !a.startsWith('--'));

if (flag('--clear')) {
  writeFileSync(FILE, '');
  console.log('log capture cleared. Reload a page.');
  process.exit(0);
}
if (!existsSync(FILE)) {
  console.log('nothing captured yet.\n'
    + '  is `node demo/server.mjs` running, and is a page open on 127.0.0.1?');
  process.exit(0);
}

/** One batch per line. A half written last line is normal while a page posts. */
function batches() {
  const out = [];
  for (const line of readFileSync(FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* still arriving */ }
  }
  return out;
}

/**
 * 🔴 A RUN IS A PAGE PLUS A BUILD PLUS A RESTART OF ITS CLOCK, and the clock is
 * what finds a reload: `performance.now()` starts again at zero, so a line
 * whose time is EARLIER than the one before it on the same page is a new run.
 * Without this, five reloads of `/wish/` read as one run with the times going
 * backwards, which is the most confusing possible shape for a log.
 */
function runs(list) {
  const out = [];
  let cur = null;
  for (const b of list) {
    const key = `${b.url} ${b.build}`;
    const first = b.rows[0];
    const back = cur && cur.key === key && first && first.at < cur.last;
    if (!cur || cur.key !== key || back) {
      cur = { key, url: b.url, page: b.page, build: b.build, rows: [], last: -1 };
      out.push(cur);
    }
    cur.rows.push(...b.rows);
    cur.last = b.rows.length ? b.rows[b.rows.length - 1].at : cur.last;
  }
  return out;
}

const PAINT = { bad: '\x1b[31m', hi: '\x1b[33m', good: '\x1b[32m', ok: '\x1b[32m' };
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

function show(list) {
  let all = runs(list);
  if (match.length) all = all.filter((r) => match.some((m) => r.url.includes(m)));
  if (!flag('--all')) {
    // The LAST run of each page, which is what somebody debugging means.
    const last = new Map();
    for (const r of all) last.set(r.url, r);
    all = [...last.values()];
  }
  if (!all.length) { console.log('nothing captured for that.'); return; }

  for (const r of all) {
    const rows = flag('--bad') ? r.rows.filter((x) => x.kind === 'bad') : r.rows;
    console.log(`\n${DIM}── ${r.url}  ${r.build}  ${r.rows.length} line(s)`
      + `${flag('--bad') ? `, ${rows.length} bad` : ''} ──${OFF}`);
    for (const x of rows) {
      const c = PAINT[x.kind] || '';
      console.log(`  ${DIM}${x.at.toFixed(2).padStart(7)}${OFF} ${c}${x.msg}${OFF}`);
    }
  }
}

if (flag('--follow')) {
  let seen = 0;
  const tick = () => {
    const list = batches();
    if (list.length === seen) return;
    show(list.slice(seen));
    seen = list.length;
  };
  show(batches());
  seen = batches().length;
  console.log(`\n${DIM}following. Ctrl-C to stop.${OFF}`);
  watchFile(FILE, { interval: 400 }, tick);
} else {
  show(batches());
}
