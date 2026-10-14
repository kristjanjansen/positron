// demo/shell/node-runtime-test.mjs: the pure half of node-runtime.mjs and its router, no browser.
// Each claim is also run against a sabotaged copy that must turn it red. createRuntimes() and the
// rt-*.mjs factories need a document; /connect/'s self-check grades those.
// why: lessons/kit-node-runtime.md#test-header

import { NODES } from './nodes.mjs';
import { createBay } from './bay.mjs';
import { addNodes } from './nodes.mjs';
import { RUNTIMES, NOT_YET, SITES, EXTRA_PORTS, plan, routes, knobChoices, knobFor, whyNot, loaderOf } from './node-runtime.mjs';
import { routeAudio } from './audio-router.mjs';
import { PARAM_NAMES, PARAMS, knobRaw } from './synth-params.mjs';

let ok = 0, bad = 0, neg = 0;
const A = (label, pass, detail = '') => {
  if (pass) ok++; else bad++;
  if (label.startsWith('NEGATIVE CONTROL')) neg++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${label}${!pass && detail ? `  [${detail}]` : ''}`);
};

// ── the registry against the catalogue ─────────────────────────────────────
const keys = Object.keys(NODES);
const missing = keys.filter((k) => !Object.hasOwn(RUNTIMES, k) && !Object.hasOwn(NOT_YET, k));
A('every catalogue type has a runtime or a stated reason', !missing.length, missing.join(', '));
const both = keys.filter((k) => Object.hasOwn(RUNTIMES, k) && Object.hasOwn(NOT_YET, k));
A('no type is both running and not yet running', !both.length, both.join(', '));
const stray = [...Object.keys(RUNTIMES), ...Object.keys(NOT_YET)].filter((k) => !Object.hasOwn(NODES, k));
A('neither list names a type the catalogue does not have', !stray.length, stray.join(', '));
A('every reason is a sentence, not an empty string', Object.values(NOT_YET).every((s) => typeof s === 'string' && s.length > 20));
A('a Pi node has a reason too', /Raspberry Pi/.test(whyNot(null, 'pi-1:circuit')));
A('every runtime is a lazy loader, so a visit loads none of them', Object.values(RUNTIMES).every((f) => typeof f === 'function' && f.length === 0));
{
  const typeOf = (id) => ({ 'web:synth': 'synth', 'web:paper': 'paper' })[id] ?? null;
  A('a catalogue type with a runtime is found by its type', loaderOf('web:synth', typeOf) === RUNTIMES.synth);
  A('a Pi node is found by its site, since it is not a catalogue type', loaderOf('pi-1:circuit', typeOf) === SITES['pi-1']);
  A('NEGATIVE CONTROL: a type that does not run has no loader, and neither does a site with none',
    loaderOf('web:paper', typeOf) === null && loaderOf('cf-stream:live', typeOf) === null && loaderOf('pi-12:circuit', typeOf) === null);
}
// The synth's value-in is the catalogue's since 2026-10-14; nodes.mjs is import
// free, so its names are typed there and held to the voice's here.
const catNames = NODES.synth.ports['value-in']?.shape?.names ?? [];
A('the synth\'s catalogue value-in lists exactly the parameters the voice takes, in order',
  catNames.join() === PARAM_NAMES.join(), catNames.join());
A('it is optional, so a page that only plays the synth does not grow it', NODES.synth.ports['value-in']?.optional === true);
A('no extra port doubles a catalogue one', Object.entries(EXTRA_PORTS).every(([t, ps]) => Object.keys(ps).every((p) => !Object.hasOwn(NODES[t]?.ports || {}, p))),
  JSON.stringify(EXTRA_PORTS));
{
  const plain = createBay(), asked = createBay();
  addNodes(plain, 'web', ['synth']);
  addNodes(asked, 'web', ['synth'], { ports: { 'synth:value-in': {} } });
  A('NEGATIVE CONTROL: a synth built with no word about value-in has none', !plain.port('web:synth:value-in'));
  A('asked for, it comes last, after midi-in and audio-out, as /connect/ drew it from EXTRA_PORTS',
    asked.ports().map((p) => p.id.split(':')[2]).join() === 'midi-in,audio-out,value-in', asked.ports().map((p) => p.id).join());
}

// ── plan(): one runtime per linked node ───────────────────────────────────
const L = (from, to) => ({ from, to });
const K = 'web:keys:midi-out', SI = 'web:synth:midi-in', SO = 'web:synth:audio-out', SP = 'web:speaker:audio-in', SC = 'web:scope:audio-in';
const PLAN_CLAIMS = (fn) => {
  const out = [];
  const c = (label, pass) => out.push([label, !!pass]);
  const p1 = fn([L(K, SI)], []);
  c('a first link creates both ends', p1.create.join() === 'web:keys,web:synth' && !p1.close.length);
  const p2 = fn([L(K, SI), L(SO, SP)], ['web:keys', 'web:synth']);
  c('a second link creates only the new end', p2.create.join() === 'web:speaker' && !p2.close.length);
  const p3 = fn([L(SO, SP)], ['web:keys', 'web:synth', 'web:speaker']);
  c('the last unlink of a node closes it', p3.close.join() === 'web:keys' && !p3.create.length);
  const p4 = fn([L(SO, SP), L(SO, SC)], ['web:synth', 'web:speaker', 'web:scope']);
  c('a node keeps its runtime while another link holds it', !p4.close.length);
  const p5 = fn([L(K, 'web:plaits:midi-in')], [], (id) => id !== 'web:plaits');
  c('a node with no runtime is not created', p5.create.join() === 'web:keys');
  const p6 = fn([], ['web:keys', 'web:synth']);
  c('no links closes everything', p6.close.length === 2);
  const p7 = fn([L(K, SI), L(K, 'web:rec:midi-in')], []);
  c('two links out of the keys are one keyboard', p7.create.filter((n) => n === 'web:keys').length === 1);
  return out;
};
for (const [label, pass] of PLAN_CLAIMS(plan)) A(`plan: ${label}`, pass);
const PLAN_SABOTAGE = {
  'never closes': (l, h, r) => ({ ...plan(l, h, r), close: [] }),
  'recreates what it has': (l, h, r) => plan(l, [], r),
  'ignores runs()': (l, h) => plan(l, h),
  'one runtime per link end': (links, h, r) => ({ ...plan(links, h, r), create: links.flatMap((x) => [x.from, x.to].map((p) => p.split(':').slice(0, 2).join(':'))).filter((n) => !h.includes(n) && (r ? r(n) : true)) }),
};
for (const [name, fn] of Object.entries(PLAN_SABOTAGE)) {
  const red = PLAN_CLAIMS(fn).filter(([, p]) => !p).map(([l]) => l);
  A(`NEGATIVE CONTROL: a plan() that ${name} is caught`, red.length > 0, 'every claim stayed green');
}

// ── routes(): only what stays in this tab ──────────────────────────────────
const S = (t) => ({ transport: t });
const ROUTE_LINKS = [
  { from: SO, to: SP, session: S('webaudio') },
  { from: 'web:camera:video-out', to: 'web:screen:video-in', session: S('page') },
  { from: 'pi-1:circuit:audio-out', to: SP, session: S('relay') },
  { from: K, to: SI, session: null },
  { from: 'pi-1:synth:audio-out', to: 'pi-1:jack:audio-in', session: S('jack') },
  { from: 'web:camera:video-out', to: 'cf-stream:live:video-in', session: S('whip') },
];
const ROUTE_CLAIMS = (fn) => {
  const r = fn(ROUTE_LINKS);
  const has = (from, to) => r.some((e) => e.from === from && e.to === to);
  return [
    ['a webaudio link is wired here, as audio', has(SO, SP) && r.find((e) => e.from === SO).medium === 'audio'],
    ['a page link is wired here, as video', has('web:camera:video-out', 'web:screen:video-in') && r.find((e) => e.transport === 'page').medium === 'video'],
    ['a relay link is not', !has('pi-1:circuit:audio-out', SP)],
    ['a light link is the bay\'s, not the router\'s', !has(K, SI)],
    ['a jack link is the Pi\'s, not this tab\'s', !has('pi-1:synth:audio-out', 'pi-1:jack:audio-in')],
    ['a whip link leaves the tab', !has('web:camera:video-out', 'cf-stream:live:video-in')],
    ['exactly two edges', r.length === 2],
  ];
};
for (const [label, pass] of ROUTE_CLAIMS(routes)) A(`routes: ${label}`, pass);
const ROUTE_SABOTAGE = {
  'trusts any session': (links) => links.filter((l) => l.session).map((l) => ({ from: l.from, to: l.to, transport: l.session.transport, medium: 'audio' })),
  'takes every link': (links) => links.map((l) => ({ from: l.from, to: l.to, transport: l.session?.transport, medium: 'audio' })),
  'keeps only audio': (links) => routes(links).filter((e) => e.medium === 'audio'),
};
for (const [name, fn] of Object.entries(ROUTE_SABOTAGE)) {
  const red = ROUTE_CLAIMS(fn).filter(([, p]) => !p);
  A(`NEGATIVE CONTROL: a routes() that ${name} is caught`, red.length > 0, 'every claim stayed green');
}

// ── routeAudio(): disconnect everything, connect what is held ──────────────
function fakeGraph() {
  const wires = new Set();
  const node = (name) => ({
    name,
    connect(dst) { wires.add(`${name}>${dst.name}`); return dst; },
    disconnect() { for (const w of [...wires]) if (w.startsWith(`${name}>`)) wires.delete(w); },
  });
  return { wires, node };
}
const ROUTER_CLAIMS = (fn) => {
  const g = fakeGraph();
  const synth = g.node('synth'), spk = g.node('speaker'), scope = g.node('scope'), detune = { name: 'detune' };
  const ends = { [SO]: synth, [SP]: spk, [SC]: scope, 'web:filter:cutoff-in': detune };
  const run = (edges) => fn({ edges, out: (p) => ends[p], input: (p) => ends[p], outs: [synth] });
  const out = [];
  run([{ from: SO, to: SP }, { from: SO, to: SC }]);
  out.push(['both held edges are wired', g.wires.has('synth>speaker') && g.wires.has('synth>scope')]);
  run([{ from: SO, to: SC }]);
  out.push(['an unlinked edge goes silent', !g.wires.has('synth>speaker') && g.wires.has('synth>scope')]);
  const made = run([{ from: SO, to: 'web:plaits:audio-in' }]);
  out.push(['an edge to a node with no runtime is skipped, not thrown', made.length === 0 && g.wires.size === 0]);
  run([{ from: SO, to: 'web:filter:cutoff-in' }]);
  out.push(['an in may be an AudioParam', g.wires.has('synth>detune')]);
  return out;
};
for (const [label, pass] of ROUTER_CLAIMS(routeAudio)) A(`routeAudio: ${label}`, pass);
const ROUTER_SABOTAGE = {
  'never disconnects': (o) => routeAudio({ ...o, outs: [] }),
  'connects nothing': (o) => routeAudio({ ...o, edges: [] }),
};
for (const [name, fn] of Object.entries(ROUTER_SABOTAGE)) {
  let red = 0;
  try { red = ROUTER_CLAIMS(fn).filter(([, p]) => !p).length; } catch { red = 1; }
  A(`NEGATIVE CONTROL: a router that ${name} is caught`, red > 0, 'every claim stayed green');
}

// ── knobChoices() and knobFor(): one knob, for the parameter a person picks ──
{
  const bay = createBay();
  addNodes(bay, 'web', ['keys', 'knob', 'synth', 'collide', { name: 'synth', as: 'synth-2' }],
    { ports: { 'synth:value-in': {}, 'synth-2:value-in': {} } });
  const names = knobChoices(bay, 'web:knob:value-out', 'web:synth:value-in');
  A('the knob type into a named value-in offers every name, and adds nothing yet', names?.join() === PARAM_NAMES.join()
    && !bay.nodes().some((n) => n.id.startsWith('web:knob-')), names?.join());
  const pair = knobFor(bay, 'web:synth:value-in', 'cutoff');
  A('picking one name makes exactly one knob node, labelled by its parameter', pair[0] === 'web:knob-cutoff:value-out'
    && bay.nodes().filter((n) => n.id.startsWith('web:knob-')).length === 1 && bay.node('web:knob-cutoff').label === 'cutoff'
    && bay.validate(...pair, []).ok);
  const again = knobFor(bay, 'web:synth:value-in', 'cutoff');
  A('a second time adds no second knob node', again.join() === pair.join() && bay.nodes().filter((n) => n.id.startsWith('web:knob-')).length === 1);
  const two = knobFor(bay, 'web:synth-2:value-in', 'cutoff');
  A('the same parameter of a second synth is a knob of its own', two[0] === 'web:knob-cutoff-2:value-out' && !!bay.node('web:knob-cutoff-2')
    && bay.node('web:knob-cutoff-2').label === 'cutoff' && bay.validate(...two, []).ok);
  A('NEGATIVE CONTROL: a value-in with no names offers nothing', knobChoices(bay, 'web:knob:value-out', 'web:collide:value-in') === null);
  A('NEGATIVE CONTROL: anything but the knob type offers nothing', knobChoices(bay, 'web:keys:midi-out', 'web:synth:value-in') === null);
}

// ── the parameter table ────────────────────────────────────────────────────
const round = PARAMS.filter((p) => p.name !== 'wave').every((p) => {
  const r = (p.min + p.max) / 2;
  return Math.abs(knobRaw(p.name, p.value(r)) - r) < 1e-6;
});
A('every continuous knob\'s value reads back to the same dial position', round);
A('a wave knob reads back by name', knobRaw('wave', 'sawtooth') === 2 && PARAMS[0].value(2) === 'sawtooth');
A('NEGATIVE CONTROL: a value past the travel is clamped, not drawn off the dial', knobRaw('cutoff', 40000) === 127 && knobRaw('cutoff', 1) === 0);

console.log(`\n${ok} ok, ${bad} failed, ${neg} of them negative controls`);
process.exit(bad ? 1 : 0);
