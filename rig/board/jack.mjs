// rig/board/jack.mjs: the JACK audio graph, as a value.
//
// The ALSA half of this board's patchbay has been a document since session 17
// (`alsa.mjs`): `aconnect -l` parsed, a patch planned before anything changes,
// a half application refused. The JACK half was shell strings in
// `jacksynth.mjs`, 21 of them by 2026-10-11, and nothing could say what a
// re-patch was going to do before it did it. This file is that missing half,
// in the same shape (plans/plan-nodes.md §5.4, plans/plan-nodes-revisited.md §3
// item 3).
//
// 🔴 THE TWO ARMS DO NOT SHARE A VOCABULARY, AND THIS FILE DOES NOT PRETEND
// THEY DO. Written down rather than flattened:
//
//   ALSA (alsa.mjs)                      JACK (this file)
//   a port is `20:0`, found by name      a port is `client:port`, EXACT, no fuzzy match
//   one subscription carries every       one connection carries ONE channel of
//     message class, `carry` subsets       one type; there are no classes, so a
//     are refused because aconnect         `carry` field is refused by name
//     cannot filter
//   stereo does not exist                left and right are two links, and a
//                                          link per channel is the whole point
//   two sources into one port merge      two sources into one input SUM, which is
//     streams                              how this board's capture is mono-sum
//   a plan only adds                     a plan may OWN an input: every source
//                                          feeding it that the document does not
//                                          name is disconnected (`own`)
//   any port may go anywhere             direction and type are checked: an
//                                          output into an input, audio into audio
//
// ⚠️ A WRONG JACK PATCH IS SILENT, LIKE A WRONG MIDI ONE, AND IT IS WORSE:
// a missing right channel still sounds like a working instrument (MEASURED,
// 2026-09-13: mono-left read a note at 1661 Hz where mono-sum read 2029 Hz).
// So `apply` answers with the graph READ BACK, never with the commands having
// run. `jack_connect` exits 1 both when it fails and when the link already
// existed (MEASURED on the board 2026-10-11, both with the text on stderr), so
// an exit status cannot be the verdict.
//
// 🔴 A PORT IS NOT A READY ENGINE. `fx.pappus` once answered ok the moment
// `SuperCollider:out_1` appeared, about seven seconds before the engine had
// compiled, and every command sent in the gap vanished (session 18). This file
// checks the WIRE and nothing behind it: an applied link to a client that is
// still loading reads as connected and carries silence. Waiting for an engine
// is the caller's job and stays there (`pappusFx` waits for `PAPPUS READY`
// before it patches anything).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const JACK_DOC_V = 1;

/**
 * `jack_lsp -c`, optionally with `-p` and `-t`, as rows. Pure, so it is graded
 * against text captured off the board (`fixtures/jack-lsp-c-pi.txt`,
 * `fixtures/jack-lsp-cpt-pi.txt`, both 2026-10-11).
 *
 * The format, read off the Pi rather than off a manual:
 *   yoshimi:left                         a port, at column 0
 *      posboard:input_1                  a connection, three spaces
 *   \tproperties: output,                `-p`, one tab
 *   \t32 bit float mono audio            `-t`, one tab
 *
 * ⚠️ A CONNECTION IS LISTED FROM BOTH ENDS, so a sink's list is everything
 * feeding it. ⚠️ jackd's own complaint (`Cannot lock down 107350048 byte memory
 * area`) goes to STDERR on this board, but a caller that merged the streams
 * would hand it in as a port, so a column-0 line with no colon is not a port
 * and is kept in `noise` rather than dropped or invented into a row.
 */
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

/**
 * The graph as it is now. `{ backend, rows, error }`.
 * ⚠️ AN EMPTY LIST MEANS NO SERVER, NOT NO PORTS: a running jackd always has
 * at least its driver's ports. That is `jacksynth.mjs`'s established reading
 * and it is kept, as `error`, so "jackd is down" never reads as a quiet graph.
 */
export function listJack({ from, text } = {}) {
  if (text != null) return { backend: 'fake', rows: parseJackLsp(text), error: null };
  if (from) return { backend: 'fake', rows: parseJackLsp(readFileSync(from, 'utf8')), error: null };
  const r = sh('jack_lsp', ['-c', '-p', '-t']);
  if (r.code !== 0 && !r.out.trim()) {
    // The useful sentence is jack_lsp's LAST line; the five above it are
    // libjack's shared memory bookkeeping (read off the board 2026-10-11).
    const last = String(r.err).trim().split('\n').map((x) => x.trim()).filter(Boolean).at(-1);
    return { backend: 'jack', rows: [], error: /ENOENT/.test(r.err) ? 'jack_lsp is not installed on this board'
      : /server is not running/.test(r.err) ? 'jackd is not running, so there is no graph' : (last ?? 'jack_lsp failed') };
  }
  const rows = parseJackLsp(r.out);
  return { backend: 'jack', rows, error: rows.length ? null : 'jack_lsp lists no ports at all, so there is no server' };
}

/**
 * A document in canonical form: links deduplicated and sorted, `own` sorted,
 * nothing else kept. Two documents that mean the same thing print the same,
 * which is plans/plan-nodes.md §4.1 rule 3.
 */
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

/**
 * Turn a document into steps WITHOUT touching the graph.
 *
 *   { v: 1,
 *     links: [ { from: 'yoshimi:left', to: 'posboard:input_1' }, ... ],
 *     own:   [ 'posboard:input_1' ] }        optional
 *
 * `links` must be there afterwards. `own` names inputs whose WHOLE feed this
 * document decides, so anything else feeding one of them is disconnected; an
 * input not owned is only ever added to. An owned input that is not on the
 * graph has nothing feeding it and is skipped, not refused.
 *
 * Refused, by name, and then NOTHING is planned: an unknown `v`, a port that is
 * not on the graph, a name with no colon, an input as a source or an output as
 * a destination, audio into MIDI, a port to itself, and any `carry`.
 * Direction and type are checked only when the listing carried them (`-p -t`);
 * `checked` says which were, so a plan made from bare `-c` text does not claim
 * a check it could not make.
 *
 * ⚠️ STEPS DISCONNECT FIRST, THEN CONNECT, which is the order `pappusFx` has
 * always used: a few milliseconds of gap rather than a moment with the wrong
 * source and the right one both summed into the capture.
 */
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
    // ⚠️ NO FUZZY MATCH. `yoshimi` meaning `yoshimi:left` is exactly how a
    // patch ends up with one channel of a stereo instrument and sounds fine.
    // The candidates are offered so a person can pick, never picked for them.
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

/**
 * What a document and a graph disagree about, with no steps: the same reading
 * `plan` makes, for a REPORT. `missing` is a named link that is not there,
 * `extra` a source feeding an owned input that the document did not name.
 */
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
  const r = sh(`jack_${s.act}`, [s.from, s.to]);
  return clean(`${r.out}\n${r.err}`);
}

/**
 * Apply a plan, then READ THE GRAPH BACK and answer from that.
 *
 * Refuses outright unless the plan is clean: there is no "apply the parts that
 * worked", because a half applied patch is a graph whose state nobody wrote
 * down. `run` and `read` are injectable so the whole of this is gradeable on a
 * laptop (`test.mjs`); on the board they are `jack_connect`/`jack_disconnect`
 * and `jack_lsp -c -p -t`.
 *
 * `ok` is the READ BACK: every named link present and nothing unnamed feeding
 * an owned input. A step whose command printed something is kept with its text
 * in `said`, and is not by itself a failure.
 */
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
