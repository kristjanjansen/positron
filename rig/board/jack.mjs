// The JACK graph as a value, alsa.mjs's twin: exact `client:port`, one channel per link,
// inputs sum, a plan may own an input, direction and type checked. `apply` answers with the
// graph read back (jack_connect exits 1 for "already" too). A port is not a ready engine.
// why: lessons/rig-board-io.md#jack-header
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const JACK_DOC_V = 1;

// `jack_lsp -c` (with -p, -t) as rows, pure, graded on text captured off the Pi. Connections appear
// from both ends; a column-0 line with no colon (jackd's stderr) goes to `noise`.
// why: lessons/rig-board-io.md#parse-lsp
export function parseJackLsp(text) {
  const rows = [];
  const noise = [];
  for (const line of String(text).split('\n')) {
    if (!line.trim()) continue;
    if (line.startsWith('\t')) {
      const row = rows.at(-1);
      if (!row) { noise.push(line.trim()); continue; }
      const t = line.trim();
      const m = t.match(/^properties:\s*(.*)$/);
      if (m) {
        const props = m[1].split(',').map((s) => s.trim()).filter(Boolean);
        row.dir = props.includes('output') ? 'out' : props.includes('input') ? 'in' : null;
        row.physical = props.includes('physical');
        row.terminal = props.includes('terminal');
      } else {
        row.type = t;
        row.medium = /audio/i.test(t) ? 'audio' : /midi/i.test(t) ? 'midi' : null;
      }
      continue;
    }
    // An indented line belongs to the port above it. One with no port above it
    // is malformed output, not a connection with an invented parent.
    if (/^\s/.test(line)) { const row = rows.at(-1); if (row) row.connected.push(line.trim()); else noise.push(line.trim()); continue; }
    if (!line.includes(':')) { noise.push(line.trim()); continue; }
    rows.push({ port: line.trim(), connected: [] });
  }
  // A non-enumerable list, so `rows` stays the shape `jacksynth.mjs` has
  // always handed around and a caller who wants the noise can still ask.
  Object.defineProperty(rows, 'noise', { value: noise, enumerable: false });
  return rows;
}

const sh = (bin, args) => {
  try { return { out: execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), err: '', code: 0 }; }
  catch (e) { return { out: String(e.stdout ?? ''), err: String(e.stderr ?? e.message ?? ''), code: e.status ?? 1 }; }
};
// jackd's memory-lock complaint is printed on EVERY client's stderr on this
// board and is about jackd, not about the request. Left in, it would sit in
// front of the one line that says what happened.
const clean = (s) => String(s).split('\n').map((l) => l.trim())
  .filter((l) => l && !/^Cannot lock down \d+ byte memory area/.test(l)).join(' ') || null;

// When jackd owns the card, `system:capture_N` is renamed `<input>:capture_N` here and back on
// every connect, exact map only, so everything above never learns which bridge is in use.
// why: lessons/rig-board-io.md#names
let NAMES = new Map(), REAL = new Map();
export function setPortNames(map = {}) {
  NAMES = new Map(Object.entries(map ?? {}));
  REAL = new Map([...NAMES].map(([real, shown]) => [shown, real]));
}
export const portNames = () => Object.fromEntries(NAMES);
/** The name a port is shown by, for a real name off `jack_lsp`. */
export const shownPort = (p) => NAMES.get(p) ?? p;
/** The real name `jack_connect` needs, for a shown one. */
export const realPort = (p) => REAL.get(p) ?? p;
const renameRows = (rows) => {
  if (!NAMES.size) return rows;
  for (const r of rows) { r.port = shownPort(r.port); r.connected = r.connected.map(shownPort); }
  return rows;
};

// The graph now: { backend, rows, error }. An empty list means no server, reported as `error`.
// why: lessons/rig-board-io.md#list
export function listJack({ from, text } = {}) {
  if (text != null) return { backend: 'fake', rows: renameRows(parseJackLsp(text)), error: null };
  if (from) return { backend: 'fake', rows: renameRows(parseJackLsp(readFileSync(from, 'utf8'))), error: null };
  const r = sh('jack_lsp', ['-c', '-p', '-t']);
  if (r.code !== 0 && !r.out.trim()) {
    // jack_lsp's last line is the useful one; the rest is libjack bookkeeping.
    // why: lessons/rig-board-io.md#last-line
    const last = String(r.err).trim().split('\n').map((x) => x.trim()).filter(Boolean).at(-1);
    return { backend: 'jack', rows: [], error: /ENOENT/.test(r.err) ? 'jack_lsp is not installed on this board'
      : /server is not running/.test(r.err) ? 'jackd is not running, so there is no graph' : (last ?? 'jack_lsp failed') };
  }
  const rows = renameRows(parseJackLsp(r.out));
  return { backend: 'jack', rows, error: rows.length ? null : 'jack_lsp lists no ports at all, so there is no server' };
}

// Canonical form: links deduplicated and sorted, `own` sorted, nothing else.
// why: lessons/rig-board-io.md#canonical
export function canonical(doc) {
  const key = (l) => `${l.from}\u0000${l.to}`;
  const links = uniqLinks(doc).sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
  const own = uniqOwn(doc).sort();
  return { v: doc?.v, links, ...(own.length ? { own } : {}) };
}
// In the document's own order, duplicates dropped. Steps and reports follow the
// order the caller wrote, so a plan reads in the order a person thinks of the
// chain; only the PRINTED form is sorted.
const uniqLinks = (doc) => {
  const seen = new Set(), out = [];
  for (const l of doc?.links ?? []) {
    if (!l || typeof l !== 'object') continue;
    const k = `${l.from}\u0000${l.to}`;
    if (!seen.has(k)) { seen.add(k); out.push({ from: l.from, to: l.to }); }
  }
  return out;
};
const uniqOwn = (doc) => [...new Set(Array.isArray(doc?.own) ? doc.own : [])];

// A document to steps without touching the graph: {v: 1, links, own?}. Refused by name, planning
// nothing: bad v, missing or colonless ports, wrong direction or type, self links, any `carry`.
// `checked` says which checks the listing allowed. Disconnect first, then connect.
// why: lessons/rig-board-io.md#plan
export function plan(doc, rows) {
  const problems = [], steps = [];
  if (!doc || typeof doc !== 'object') return { ok: false, steps, problems: ['patch is not an object'] };
  if (!Array.isArray(rows)) return { ok: false, steps, problems: ['no port list to plan against'] };
  if (doc.v !== JACK_DOC_V) problems.push(`unknown patch version ${JSON.stringify(doc.v)}, expected ${JACK_DOC_V}`);
  if (!Array.isArray(doc.links)) problems.push('patch has no links array');
  if (doc.own != null && !Array.isArray(doc.own)) problems.push('own is not a list of input ports');

  const byName = new Map(rows.map((r) => [r.port, r]));
  const checked = {
    direction: rows.some((r) => r.dir != null),
    type: rows.some((r) => r.medium != null),
  };
  const find = (name) => {
    const n = String(name ?? '');
    if (!n) return { ok: false, reason: 'empty port name' };
    const hit = byName.get(n);
    if (hit) return { ok: true, row: hit };
    // No fuzzy match: `yoshimi` for `yoshimi:left` is how one stereo channel gets lost; candidates
    // are offered.
    // why: lessons/rig-board-io.md#no-fuzzy
    const client = n.includes(':') ? n.slice(0, n.indexOf(':')) : n;
    const candidates = rows.filter((r) => r.port.startsWith(`${client}:`)).map((r) => r.port);
    return { ok: false, reason: n.includes(':') ? `${n} is not on the graph` : `${n} is a client, not a port; JACK links one channel at a time`,
             ...(candidates.length ? { candidates } : {}) };
  };

  const c = canonical(doc);
  for (const [i, link] of (doc.links ?? []).entries()) {
    const where = `link ${i}`;
    if (!link || typeof link !== 'object') { problems.push(`${where}: not an object`); continue; }
    if ('carry' in link) {
      problems.push(`${where}: carry is an ALSA word. A JACK connection carries the whole of one channel and has no message classes to choose from`);
    }
    const a = find(link.from), b = find(link.to);
    if (!a.ok) problems.push(`${where}: from, ${a.reason}${a.candidates ? ` (on the graph: ${a.candidates.join(', ')})` : ''}`);
    if (!b.ok) problems.push(`${where}: to, ${b.reason}${b.candidates ? ` (on the graph: ${b.candidates.join(', ')})` : ''}`);
    if (!a.ok || !b.ok) continue;
    if (a.row.port === b.row.port) { problems.push(`${where}: ${a.row.port} to itself`); continue; }
    if (a.row.dir === 'in') problems.push(`${where}: ${a.row.port} is an input, so it cannot be a source`);
    if (b.row.dir === 'out') problems.push(`${where}: ${b.row.port} is an output, so it cannot be a destination`);
    if (a.row.medium && b.row.medium && a.row.medium !== b.row.medium) {
      problems.push(`${where}: ${a.row.port} is ${a.row.medium} and ${b.row.port} is ${b.row.medium}`);
    }
  }
  for (const p of doc.own ?? []) {
    const r = byName.get(p);
    if (r && r.dir === 'out') problems.push(`own: ${p} is an output, and only an input has a feed to own`);
  }
  if (problems.length) return { ok: false, steps: [], problems, checked, doc: c };

  const d = diff(doc, rows);
  for (const [f, t] of d.extra) steps.push(step('disconnect', f, t));
  for (const [f, t] of d.missing) steps.push(step('connect', f, t));
  return { ok: true, steps, problems, checked, doc: c, already: c.links.length - d.missing.length };
}

const step = (act, from, to) => ({ act, from, to, cmd: `jack_${act} "${from}" "${to}"` });

// What a document and the graph disagree about, for a report: `missing` and `extra`.
// why: lessons/rig-board-io.md#diff
export function diff(doc, rows) {
  const byName = new Map(rows.map((r) => [r.port, r]));
  const links = uniqLinks(doc);
  const has = (from, to) => (byName.get(to)?.connected ?? []).includes(from);
  const missing = links.filter((l) => !has(l.from, l.to)).map((l) => [l.from, l.to]);
  const extra = [];
  for (const sink of uniqOwn(doc)) {
    for (const src of byName.get(sink)?.connected ?? []) {
      if (!links.some((l) => l.from === src && l.to === sink)) extra.push([src, sink]);
    }
  }
  return { missing, extra, intact: missing.length === 0 && extra.length === 0 };
}

/** One step on the real graph. Answers the text, because the exit status cannot tell failure from "already". */
export function runStep(s) {
  const r = sh(`jack_${s.act}`, [realPort(s.from), realPort(s.to)]);
  return clean(`${r.out}\n${r.err}`);
}

// Apply a clean plan only, then read the graph back; run and read are injectable for tests. `ok` is
// the read-back; a step's output text is kept in `said`, not a failure by itself.
// why: lessons/rig-board-io.md#apply
export function apply(planned, { dry = false, run = runStep, read = () => listJack().rows } = {}) {
  if (!planned?.ok) return { ok: false, ran: [], reason: 'plan has problems; nothing applied', problems: planned?.problems ?? [] };
  if (dry) return { ok: true, dry: true, ran: planned.steps.map((s) => ({ ...s, result: 'dry' })) };
  const ran = planned.steps.map((s) => ({ ...s, said: run(s) }));
  const after = diff(planned.doc, read());
  return { ok: after.intact, dry: false, ran, after };
}

/** List, plan and apply in one call, for the module's own callers. */
export function patch(doc, opts = {}) {
  const rows = opts.rows ?? listJack().rows;
  const planned = plan(doc, rows);
  const applied = apply(planned, opts);
  return { ...applied, planned };
}
