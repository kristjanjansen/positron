// rig/board/alsa.mjs — the patchbay, as a value.
//
// plan-hardware §8.4: a wrong MIDI patch is SILENT. Nothing errors, no light
// changes, notes just do not arrive — and you are in another city. So every
// step here is arranged so that a patch is CHECKED before it is applied, and
// anything that cannot be checked is refused by name rather than attempted.
//
// Two backends, chosen by whether `aconnect` exists:
//   alsa  — the board
//   fake  — a fixture, so the whole naming/validation layer is testable on a
//           laptop with no hardware. It is NOT a simulation of MIDI; it stands
//           in for the port list only, and `apply` on it changes nothing.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const CARRY = ['note', 'cc', 'pitchbend', 'aftertouch', 'program', 'clock', 'transport', 'sysex'];

export function backend() {
  try {
    execFileSync('which', ['aconnect'], { stdio: 'pipe' });
    return 'alsa';
  } catch { return 'fake'; }
}

/**
 * Parse `aconnect -l`. Pure, so it is testable against a fixture — which is the
 * only reason the naming layer can be finished before the board arrives.
 *
 * The format is two indent levels and two prose lines:
 *   client 20: 'Circuit' [type=kernel,card=1]
 *       0 'Circuit MIDI 1  '
 *   \tConnecting To: 24:0
 */
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

/**
 * ⚠️ THE TWO ZEROES MUST NOT LOOK ALIKE. `aconnect -l` exits 1 with an empty
 * stdout when the sequencer is unreachable — no `/dev/snd/seq`, modules not
 * loaded, user not in `audio`. Measured in an arm64 Linux container,
 * 2026-09-10. Letting that surface as an empty client list would make "ALSA is
 * broken" indistinguishable from "nothing is plugged in", which is this
 * project's own rule about a partial result that is too tidy.
 *
 * So a failure is a REPORTED FACT rather than a throw: the board stays up and can
 * say what is wrong over the relay, which is the point of a service nobody can
 * walk over to.
 */
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

/**
 * Flatten to the addressable things, with the plumbing hidden. `System` and
 * `Midi Through` are always present and are never what anybody means by "the
 * circuit"; leaving them in the candidate set is how a fuzzy match picks the
 * wrong port and the patch goes silent.
 */
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

/**
 * THE NAMING LAYER IS THE PRODUCT (plan-hardware §8.4). ALSA says `20:0`;
 * nobody says that out loud. This maps what a person says onto a port.
 *
 * Ambiguity is REPORTED, never broken by picking the first — a patch that
 * silently chose the wrong one of two matching devices is the exact failure
 * this whole file is arranged to prevent.
 */
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

/**
 * Turn a patch document into steps, WITHOUT touching the rig. This is the whole
 * point: the answer to "will this work" arrives before anything changes.
 *
 * ⚠️ `carry` is the part `aconnect` cannot do. An ALSA subscription is
 * unfiltered — it carries every message class the source emits, and there is no
 * per-class option on the connection. So a document asking for a SUBSET is
 * refused rather than approximated: applying a full connection where "note
 * only" was asked would leak clock and transport into a rig, which is most of
 * what makes dawless setups painful and exactly what the document was written
 * to control. Refusing is loud; over-connecting is silent.
 * (To verify on the board — see README.)
 */
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

    const carry = link.carry ?? ['all'];
    const bad = carry.filter((c) => c !== 'all' && !CARRY.includes(c));
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

/**
 * Apply a plan. Refuses outright unless the plan is clean — there is no
 * "apply the parts that worked", because a half-applied patch is a rig whose
 * state nobody wrote down.
 */
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
