// demo/shell/nodes-test.mjs: the node catalogue (nodes.mjs) against bay.mjs,
// with no browser.
//
//   node demo/shell/nodes-test.mjs
//
// What is graded: every entry's kind and ports are legal for bay.mjs, names
// are unique in the source, addNodes builds a bay bay.mjs links through, and
// every page an entry names is on disk. Lines marked NEGATIVE CONTROL must
// refuse something, so a check that cannot fail is caught.

import { readFileSync, existsSync } from 'node:fs';
import { createBay, MEDIA, NODE_KINDS, TRANSPORT_NAMES } from './bay.mjs';
import { NODES, addNodes, portOf, typeOf } from './nodes.mjs';

let failed = 0, ok = 0;
const check = (name, pass, detail = '') => {
  if (pass) ok++; else failed++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`);
};
const throws = (fn) => { try { fn(); return ''; } catch (e) { return e.message; } };
const names = Object.keys(NODES);

// ── every entry is legal for bay.mjs ──────────────────────────────────────
const badKind = names.filter((n) => !NODE_KINDS.includes(NODES[n].kind));
check('every kind is one of NODE_KINDS', !badKind.length, badKind.join(' ') || `${names.length} entries`);
const badPorts = [];
for (const n of names) for (const [p, spec] of Object.entries(NODES[n].ports)) {
  const { medium, dir } = portOf(p.replace(/-\d+$/, ''), spec);
  if (!MEDIA.includes(medium) || (dir !== 'in' && dir !== 'out')) badPorts.push(`${n}:${p}`);
  if (spec.transports && spec.transports.some((t) => !TRANSPORT_NAMES.includes(t))) badPorts.push(`${n}:${p} transports`);
  if (spec.emits && dir !== 'out') badPorts.push(`${n}:${p} emits on an in`);
  if (spec.accepts && dir !== 'in') badPorts.push(`${n}:${p} accepts on an out`);
}
check('every port is a MEDIA medium, in or out, with known transports', !badPorts.length, badPorts.join(' ') || 'all');
check('NEGATIVE CONTROL: portOf refuses a made-up medium', !MEDIA.includes(portOf('text-in').medium), portOf('text-in').medium);
const noPages = names.filter((n) => !NODES[n].pages?.length);
check('every entry names the pages that build it', !noPages.length, noPages.join(' '));

// ── names are unique ──────────────────────────────────────────────────────
// A duplicate key in an object literal silently keeps the last, so read the source.
const src = readFileSync(new URL('./nodes.mjs', import.meta.url), 'utf8');
const body = src.slice(src.indexOf('export const NODES'), src.indexOf('\n};\n', src.indexOf('export const NODES')));
const keys = [...body.matchAll(/^ {2}('?)([\w-]+)\1: \{/gm)].map((m) => m[2]);
const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
check('no name is written twice in the source', !dupes.length && keys.length === names.length, dupes.join(' ') || `${keys.length} names`);
// Two entries may share an id segment on different pages; within one site the
// pair (site, node) must still say which entry it is, so a page never needs both.
const ambiguous = names.filter((n) => typeOf(n) !== n);
check('a catalogue name always means its own entry, never an instance of another', !ambiguous.length, ambiguous.join(' '));
const instances = { 'knob-cutoff': 'knob', 'midi-2': 'midi', 'scope-pi': 'scope', 'wave-err': 'wave', 'screen-pi': 'screen', 'knob-mix': 'knob-mix', 'knob-volume': 'knob-volume' };
const wrong = Object.entries(instances).filter(([s, t]) => typeOf(s) !== t);
check('an instance string resolves to its type, and an exact name wins over a pattern', !wrong.length, wrong.map(([s]) => `${s} -> ${typeOf(s)}`).join(' ') || 'all');

// ── addNodes builds a bay bay.mjs accepts ─────────────────────────────────
// Every entry with every optional port, on one bay per entry.
const buildFail = [];
for (const n of names) {
  const e = NODES[n];
  const seg = e.node ?? n;
  const ports = Object.fromEntries(Object.keys(e.ports).map((p) => [`${seg}:${p}`, {}]));
  const site = e.place === 'site' ? 'err' : 'web';
  try {
    const bay = createBay();
    const r = addNodes(bay, site, [n], { ports });
    const id = `${e.site ?? site}:${seg}`;
    if (!bay.node(id) || bay.node(id).kind !== e.kind) buildFail.push(`${n} node`);
    if (r.ports.length !== Object.keys(e.ports).length) buildFail.push(`${n} ${r.ports.length} ports`);
    for (const pid of r.ports) if (!bay.port(pid)) buildFail.push(pid);
  } catch (err) { buildFail.push(`${n}: ${err.message}`); }
}
check('addNodes builds every entry with all its ports', !buildFail.length, buildFail.join('; ') || `${names.length} entries`);

// /synth/keyboard's patch, built from the catalogue, linked and played.
{
  const bay = createBay();
  const heard = [];
  addNodes(bay, 'web', ['keys', 'synth', 'speaker'], {
    deliver: { 'synth:midi-in': (e) => heard.push(e.d1), 'keys:midi-in': () => {} },
    label: { synth: 'sine' },
  });
  const a = bay.link('web:keys:midi-out', 'web:synth:midi-in');
  const b = bay.link('web:synth:audio-out', 'web:speaker:audio-in');
  check('the keyboard page links keys to synth to speakers', a.ok && b.ok, a.why || b.why || '');
  bay.send('web:keys:midi-out', { cls: 'note', ch: 1, d1: 60, d2: 100 });
  check('a note sent on keys:midi-out reaches the deliver the page passed', heard[0] === 60, JSON.stringify(heard));
  check('a page label overrides the default', bay.node('web:synth').label === 'sine', bay.node('web:synth').label);
  check('an optional port with a deliver is added', !!bay.port('web:keys:midi-in'));
  check('NEGATIVE CONTROL: an optional port nobody asked for is left out', !bay.port('web:keys:value-in'));
  const c = bay.link('web:synth:audio-out', 'web:keys:midi-out');
  check('NEGATIVE CONTROL: the bay still refuses a link the ports do not fit', !c.ok, c.why || 'linked');
}

// Per instance: knobs by string, drums by object, a station on its own site, a repeat.
{
  const bay = createBay();
  const r = addNodes(bay, 'web', ['knob-cutoff', { name: 'drum', as: 'kick', label: 'kick, SuperCollider' },
    { name: 'station', site: 'err', as: 'vikerraadio', label: 'Vikerraadio' }, 'machines', 'recording'],
  { ports: { 'machines:value-out-2': {}, 'machines:value-out-3': {} } });
  check('a knob instance takes its parameter as its label', bay.node('web:knob-cutoff')?.label === 'cutoff', bay.node('web:knob-cutoff')?.label);
  check('a drum instance is named by its voice', bay.node('web:kick')?.label === 'kick, SuperCollider');
  const st = bay.node('err:vikerraadio');
  check('a station sits on its broadcaster\'s site and asks for consent', st?.place === 'err' && st?.net === 'err' && st?.consent === true, JSON.stringify(st && { place: st.place, consent: st.consent }));
  check('a repeated port is added once per number asked', ['web:machines:value-out', 'web:machines:value-out-2', 'web:machines:value-out-3'].every((id) => bay.port(id)), r.ports.filter((p) => p.includes('machines')).join(' '));
  check('a fixed-site entry ignores the page site', !!bay.node('cf-r2:recording') && bay.node('cf-r2:recording').place === 'cloudflare');
  const l = bay.link('err:vikerraadio:audio-out', 'web:kick:midi-in');
  check('NEGATIVE CONTROL: audio into a midi-in is refused', !l.ok, l.why || 'linked');
}

// ── an unknown name throws, naming the catalogue ──────────────────────────
const m1 = throws(() => addNodes(createBay(), 'web', ['sinth']));
check('NEGATIVE CONTROL: an unknown name throws, naming the catalogue', /nodes\.mjs/.test(m1) && /sinth/.test(m1), m1);
const m2 = throws(() => addNodes(createBay(), 'web', ['keys'], { deliver: { 'keys:midi-inn': () => {} } }));
check('NEGATIVE CONTROL: a deliver for a port the type does not have throws', /nodes\.mjs/.test(m2) && /midi-inn/.test(m2), m2);
const m3 = throws(() => addNodes(createBay(), 'web', [{ name: 'knob-cutoff' }]));
check('NEGATIVE CONTROL: the object form takes only a catalogue name, not an instance', /nodes\.mjs/.test(m3), m3);

// ── every page listed exists on disk ──────────────────────────────────────
const root = new URL('../', import.meta.url);
const listed = new Set(names.flatMap((n) => [...NODES[n].pages, ...Object.keys(NODES[n].labels || {})]));
const missing = [...listed].filter((p) => !existsSync(new URL(`${p}/index.html`, root)));
check('every page in pages and labels is demo/<page>/index.html', !missing.length, missing.join(' ') || `${listed.size} pages`);
const strays = Object.entries(NODES).flatMap(([n, e]) => Object.keys(e.labels || {}).filter((p) => !e.pages.includes(p)).map((p) => `${n} ${p}`));
check('a page with its own label also builds the type', !strays.length, strays.join(' '));
check('NEGATIVE CONTROL: a page that is not there is reported missing', !existsSync(new URL('synth/nothing/index.html', root)));

console.log(`\n${names.length} entries, ${listed.size} pages`);
console.log(`${ok} ok, ${failed} failed`);
process.exit(failed ? 1 : 0);
