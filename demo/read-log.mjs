#!/usr/bin/env node
// node demo/read-log.mjs [match] [--all|--bad|--follow|--clear]: logs pages posted to /_log on the
// dev server (localhost only). Off this machine, open the page with ?logs=1 and read
// https://pub.positron.studio/logs?format=text.
// why: lessons/harness.md#read-log

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

// A run is a page plus a build plus a restart of its clock: a time earlier than the last is a
// reload.
// why: lessons/harness.md#runs
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
