// The MIDI patchbay as a value: a wrong patch is silent, so every patch is checked before it is
// applied and what cannot be checked is refused. Backends: `alsa` (aconnect) or `fake` (a fixture
// port list).
// why: lessons/rig-board-io.md#alsa-header
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
// Imported directly: push.sh ships only the shell files a board module names.
// why: lessons/rig-board-io.md#midi-kinds
import { KINDS, ALIASES, canonKind } from '../../demo/shell/midi-kinds.mjs';

// The one kind list, shared with bay.mjs; old spellings are accepted through ALIASES.
// why: lessons/rig-board-io.md#carry
export const CARRY = KINDS;
export const CARRY_ALIASES = ALIASES;

export function backend() {
  try {
    execFileSync('which', ['aconnect'], { stdio: 'pipe' });
    return 'alsa';
  } catch { return 'fake'; }
}

// Parse `aconnect -l` (client lines, port lines, Connecting To lines); pure, tested on a fixture.
// why: lessons/rig-board-io.md#parse-aconnect
export function parseAconnect(text) {
  const clients = [];
  let client = null, port = null;
  for (const raw of text.split('\n')) {
    let m = raw.match(/^client (\d+): '(.*?)' \[(.*?)\]/);
    if (m) {
      const attrs = Object.fromEntries(m[3].split(',').map((s) => {
        const i = s.indexOf('=');
        return i < 0 ? [s.trim(), true] : [s.slice(0, i).trim(), s.slice(i + 1).trim()];
      }));
      client = { id: Number(m[1]), name: m[2].trim(), type: attrs.type ?? '', card: attrs.card ?? null, ports: [] };
      clients.push(client);
      port = null;
      continue;
    }
    m = raw.match(/^ {4}(\d+) '(.*?)'\s*$/);
    if (m && client) {
      port = { port: Number(m[1]), name: m[2].trim(), to: [], from: [] };
      client.ports.push(port);
      continue;
    }
    m = raw.match(/^\s+Connecting To: (.*)$/);
    if (m && port) { port.to.push(...refs(m[1])); continue; }
    m = raw.match(/^\s+Connected From: (.*)$/);
    if (m && port) { port.from.push(...refs(m[1])); continue; }
  }
  return clients;
}

// "24:0, 28:0[real:1]" -> ['24:0','28:0']. The bracket suffix is queue detail.
const refs = (s) => s.split(',').map((x) => x.trim().replace(/\[.*$/, '')).filter(Boolean);

// An unreachable sequencer (aconnect exits 1, empty stdout) is reported as an error, never as an
// empty list, so the board can say what is wrong over the relay.
// why: lessons/rig-board-io.md#list-ports
export function listPorts({ from, fixture = false } = {}) {
  if (from) return { backend: 'fake', clients: parseAconnect(readFileSync(from, 'utf8')), error: null };
  const be = fixture ? 'fake' : backend();
  if (be === 'fake') {
    return { backend: 'fake', clients: parseAconnect(readFileSync(new URL('./fixtures/aconnect-l.txt', import.meta.url), 'utf8')), error: null };
  }
  try {
    const text = execFileSync('aconnect', ['-l'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { backend: 'alsa', clients: parseAconnect(text), error: null };
  } catch (e) {
    // The useful sentence is the LAST line of stderr; the first is an ALSA
    // source-file reference that means nothing to a reader.
    const lines = String(e.stderr ?? e.message).trim().split('\n').filter(Boolean);
    return { backend: 'alsa', clients: [], error: lines.at(-1) ?? 'aconnect failed', hint: hintFor(lines.join(' ')) };
  }
}

// The three ways this fails on a fresh board, each with the thing to do about
// it. A message a reader cannot act on is barely better than a crash.
function hintFor(err) {
  if (/No such file or directory|can't open sequencer/.test(err))
    return 'no ALSA sequencer — check /dev/snd exists and `modprobe snd-seq` (setup.sh loads snd-virmidi, which pulls it in)';
  if (/Permission denied/.test(err)) return 'permission denied — the user needs to be in the `audio` group, and that needs a re-login';
  return null;
}

// Addressable ports without the plumbing (System, Midi Through), which a fuzzy match would pick.
// why: lessons/rig-board-io.md#addressable
export function addressable(clients) {
  const out = [];
  for (const c of clients) {
    if (c.id === 0 || c.name === 'System' || c.name === 'Midi Through') continue;
    for (const p of c.ports) {
      out.push({
        addr: `${c.id}:${p.port}`,
        client: c.name,
        port: p.name,
        card: c.card,
        virtual: /^Virtual Raw MIDI/.test(c.name),
        to: p.to, from: p.from,
      });
    }
  }
  return out;
}

// Map what a person says onto a port; ambiguity is reported, never resolved by picking the first.
// why: lessons/rig-board-io.md#resolve
export function resolve(name, ports) {
  const q = String(name).trim().toLowerCase();
  if (!q) return { ok: false, reason: 'empty name' };

  // An explicit address wins outright and is not guessed at.
  if (/^\d+:\d+$/.test(q)) {
    const hit = ports.find((p) => p.addr === q);
    return hit ? { ok: true, port: hit, how: 'address' }
               : { ok: false, reason: `no port at ${q}` };
  }

  const hay = (p) => `${p.client} ${p.port}`.toLowerCase();
  const tiers = [
    ['exact client', ports.filter((p) => p.client.toLowerCase() === q)],
    ['word', ports.filter((p) => new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(hay(p)))],
    ['substring', ports.filter((p) => hay(p).includes(q))],
  ];
  for (const [how, hits] of tiers) {
    if (hits.length === 1) return { ok: true, port: hits[0], how };
    if (hits.length > 1) {
      return { ok: false, reason: `"${name}" matches ${hits.length} ports`, candidates: hits.map((p) => `${p.addr} ${p.client}`) };
    }
  }
  return { ok: false, reason: `nothing here is called "${name}"`, candidates: ports.map((p) => p.client) };
}

// A patch document to steps without touching the rig. A `carry` subset is refused: an ALSA
// subscription carries every class, and over-connecting is silent.
// why: lessons/rig-board-io.md#alsa-plan
export function plan(doc, ports) {
  const problems = [], steps = [];
  if (!doc || typeof doc !== 'object') return { ok: false, steps, problems: ['patch is not an object'] };
  if (!Array.isArray(ports)) return { ok: false, steps, problems: ['no port list to resolve names against'] };
  if (doc.v !== 1) problems.push(`unknown patch version ${JSON.stringify(doc.v)} — expected 1`);
  if (!Array.isArray(doc.links)) problems.push('patch has no links array');

  for (const [i, link] of (doc.links ?? []).entries()) {
    const where = `link ${i}`;
    const a = resolve(link.from ?? '', ports);
    const b = resolve(link.to ?? '', ports);
    if (!a.ok) problems.push(`${where}: from — ${a.reason}`);
    if (!b.ok) problems.push(`${where}: to — ${b.reason}`);

    const asked = link.carry ?? ['all'];
    const bad = asked.filter((c) => c !== 'all' && !canonKind(c));
    const carry = asked.map((c) => (c === 'all' ? c : canonKind(c) ?? c));
    if (bad.length) problems.push(`${where}: unknown carry ${bad.join(', ')} — known: all, ${CARRY.join(', ')}`);

    const full = carry.length === 1 && carry[0] === 'all';
    if (!full && !bad.length) {
      problems.push(`${where}: carry ${carry.join('+')} needs filtering, and an ALSA subscription cannot filter. `
        + 'Refusing rather than connecting everything, which would leak clock and transport silently.');
    }
    if (!a.ok || !b.ok) continue;
    if (a.port.addr === b.port.addr) { problems.push(`${where}: ${a.port.client} to itself`); continue; }

    const already = a.port.to.includes(b.port.addr);
    steps.push({
      from: a.port.addr, to: b.port.addr,
      label: `${a.port.client} -> ${b.port.client}`,
      carry, resolvedBy: [a.how, b.how],
      action: !full ? 'refused' : already ? 'already connected' : 'connect',
    });
  }
  return { ok: problems.length === 0, steps, problems };
}

// Apply only a clean plan; there is no applying the parts that worked.
// why: lessons/rig-board-io.md#alsa-apply
export function apply(planned, { dry = false } = {}) {
  if (!planned.ok) return { ok: false, ran: [], reason: 'plan has problems; nothing applied' };
  const ran = [];
  for (const s of planned.steps) {
    if (s.action !== 'connect') { ran.push({ ...s, result: s.action }); continue; }
    if (dry || backend() !== 'alsa') { ran.push({ ...s, result: 'dry' }); continue; }
    try {
      execFileSync('aconnect', [s.from, s.to], { stdio: 'pipe' });
      ran.push({ ...s, result: 'connected' });
    } catch (e) {
      ran.push({ ...s, result: 'failed', error: String(e.stderr ?? e.message).trim() });
    }
  }
  return { ok: ran.every((r) => r.result !== 'failed'), ran };
}

/** Cut every subscription. `aconnect -x` is the only way back to a known state. */
export function clearAll({ dry = false } = {}) {
  if (dry || backend() !== 'alsa') return { ok: true, result: 'dry' };
  try { execFileSync('aconnect', ['-x'], { stdio: 'pipe' }); return { ok: true, result: 'cleared' }; }
  catch (e) { return { ok: false, result: 'failed', error: String(e.stderr ?? e.message).trim() }; }
}

// Who feeds a sequencer client, as {id, name} per source port, from `aconnect -l`; `match` is a
// RegExp
// or (id, name) => bool. Used by jacksynth.mjs strayMidiSources.
// why: lessons/rig-board-io.md#sources-of
export function sourcesOf(listing, match) {
  const names = new Map();
  let cur = null, inside = false;
  const from = [];
  for (const line of String(listing).split('\n')) {
    const c = line.match(/^client (\d+): '([^']*)'/);
    if (c) { cur = c[1]; names.set(cur, c[2]); inside = typeof match === 'function' ? match(c[1], c[2]) : match.test(c[2]); continue; }
    const f = line.match(/^\s+Connected From:\s*(.*)$/);
    if (f && inside) for (const id of f[1].match(/\d+:\d+/g) ?? []) from.push(id);
  }
  return from.map((id) => ({ id, name: names.get(id.split(':')[0]) ?? null }));
}
