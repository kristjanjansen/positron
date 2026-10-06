// demo/shell/midi-graph-test.mjs: this browser's MIDI ports as nodes with ids
// that survive a replug, with a fake MIDIAccess, no browser and no device.
//
//   node demo/shell/midi-graph-test.mjs
//
// Step 3 of `plans/plan-routing-migration.md` §4. The fake is the shape the
// module reads off WebMIDI and nothing more: `inputs` and `outputs` as maps of
// ports carrying `id`, `name`, `manufacturer`, `state`, `send`, `open` and
// `midimessage` listeners, and a `statechange` on the access.
//
// ⚠️ WHAT IS NOT GRADED HERE. Whether a real browser keeps `MIDIPort.id` across
// a replug, and whether CoreMIDI's rename is ` 2` on every macOS, are facts
// about a browser and an OS; both paths are driven here (the id kept, and the id
// changed so only the soft match can keep the port), and neither is measured.
// Nothing here sends a byte to an instrument.
//
// MOST OF THESE ARE NEGATIVE CONTROLS, for the reason `bay-test.mjs` gives: a
// resolver that hands back the remembered id whenever a name looks right passes
// every positive replug check. Each one named NEGATIVE CONTROL has to see a
// guess refused, a listener absent, a byte held or a graph not sent. The count
// is printed at the end: 28 of 60.
//
// 🔴 PROVED BY BREAKING `midi-graph.mjs` ON A SCRATCH COPY, ONE FAULT AT A
// TIME, against 60 green (2026-10-06):
//
//   sabotage                                              red
//   the soft match takes the first of several             3 of 60
//   the path step keyed by name                           4 of 60
//   the path step ignores a disagreeing serial            1 of 60
//   the soft match ignores a disagreeing serial           1 of 60
//   the soft match ignores the manufacturer               1 of 60
//   the soft match ignores the direction                  3 of 60
//   placeholder serials taken as serials                  2 of 60
//   two halves paired by stem when the names differ       1 of 60
//   the graph sent on every scan                          3 of 60
//   unlink releases nothing                               3 of 60
//   every input listens, linked or not                    3 of 60
//   MIDI asked for when the graph is created              2 of 60
//   remembered absent ports left out of route-core        1 of 60
//
// ⚠️ TWO OF THESE WERE GREEN ON THE FIRST RUN AND WERE HOLES IN THE TEST, NOT
// IN THE MODULE: the serial guard on the path step (every serial case was
// settled at step 1 before the path was read) and pairing by stem (every
// output in the test had an input of its own name). Both have asserts now.

import { createMidiGraph, stemOf, placeholderSerial } from './midi-graph.mjs';
import { graphProblem, createRegistry } from './graph-registry.mjs';
import { createBay } from './bay.mjs';

let pass = 0, fail = 0, neg = 0;
const ok = (name, cond, detail = '') => {
  if (/NEGATIVE CONTROL/.test(name)) neg++;
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const hex = (b) => [...b].map((x) => x.toString(16).toUpperCase().padStart(2, '0')).join(' ');

// ── the fake ───────────────────────────────────────────────────────────────

function fakePort(type, { id, name, manufacturer = 'Novation', serial } = {}) {
  const ls = new Set();
  const p = {
    type, id, name, manufacturer, state: 'connected', opened: 0, sent: [],
    addEventListener: (t, f) => { if (t === 'midimessage') ls.add(f); },
    removeEventListener: (t, f) => { if (t === 'midimessage') ls.delete(f); },
    listeners: () => ls.size,
    open: () => { p.opened++; return Promise.resolve(p); },
    send: (bytes) => { if (p.state === 'disconnected') throw new Error('InvalidStateError'); p.sent.push([...bytes]); },
    play: (bytes, t = 0) => { for (const f of ls) f({ data: Uint8Array.from(bytes), timeStamp: t }); },
  };
  if (serial !== undefined) p.serial = serial;
  return p;
}

function fakeAccess({ sysexEnabled = false } = {}) {
  const ls = new Set();
  const a = {
    sysexEnabled, inputs: new Map(), outputs: new Map(),
    addEventListener: (t, f) => { if (t === 'statechange') ls.add(f); },
    removeEventListener: (t, f) => { if (t === 'statechange') ls.delete(f); },
    stateListeners: () => ls.size,
    plug(type, o) {
      const p = fakePort(type, o);
      (type === 'input' ? a.inputs : a.outputs).set(p.id, p);
      for (const f of ls) f({ port: p });
      return p;
    },
    plugMany(list) {
      const ps = list.map(([type, o]) => { const p = fakePort(type, o); (type === 'input' ? a.inputs : a.outputs).set(p.id, p); return p; });
      for (const f of ls) f({ port: ps[0] });
      return ps;
    },
    unplug(p) {
      p.state = 'disconnected';
      (p.type === 'input' ? a.inputs : a.outputs).delete(p.id);
      for (const f of ls) f({ port: p });
    },
    // both halves of one device, the way CoreMIDI shows a Circuit
    device(name, o = {}) {
      return { input: a.plug('input', { id: `${o.idIn ?? 'i-' + name}`, name, ...o }),
               output: a.plug('output', { id: `${o.idOut ?? 'o-' + name}`, name, ...o }) };
    },
  };
  return a;
}

const ids = (g) => g.ports.map((p) => p.id).sort();

// ── a visit asks for nothing ──────────────────────────────────────────────

console.log('\n== a visit opens nothing ==');
{
  let asked = 0, said = 0;
  const access = fakeAccess();
  access.device('Circuit');
  const mg = createMidiGraph({ site: 'tab-1', announce: () => said++, request: async () => { asked++; return access; } });
  ok('NEGATIVE CONTROL: creating the graph asks for MIDI zero times', asked === 0, `asked ${asked}`);
  ok('NEGATIVE CONTROL: and announces nothing before access exists', said === 0 && mg.announce() === null, `said ${said}`);
  await mg.start();
  ok('start() asks once', asked === 1);
  ok('and announces the graph once', said === 1);
  ok('NEGATIVE CONTROL: no input listens while no link starts at it',
    [...access.inputs.values()].every((p) => p.listeners() === 0 && p.opened === 0));
  let opts = null;
  const mg2 = createMidiGraph({ site: 'tab-2', request: async (o) => { opts = o; return access; } });
  await mg2.start();
  ok('start() asks without SysEx unless told to', opts && opts.sysex === false, JSON.stringify(opts));
  ok('a site with a colon in it is refused', (() => { try { createMidiGraph({ site: 'a:b' }); return false; } catch { return true; } })());
}

// ── the graph ─────────────────────────────────────────────────────────────

console.log('\n== what the graph says ==');
{
  const access = fakeAccess();
  access.device('Circuit');
  access.device('MK-425C USB MIDI Keyboard', { manufacturer: 'Evolution' });
  const sent = [];
  const mg = createMidiGraph({ site: 'tab-1', announce: (g) => sent.push(g) }).attach(access);
  const g = mg.graph();
  ok('the graph is one graph-registry can read', graphProblem(g) === '', graphProblem(g));
  ok('one device node per device, its two halves paired', g.nodes.length === 2
    && g.nodes.every((n) => n.kind === 'device'), g.nodes.map((n) => n.id).join(' '));
  ok('ids are site:node:port from the name seen first', JSON.stringify(ids(g)) === JSON.stringify(
    ['tab-1:circuit:in', 'tab-1:circuit:out', 'tab-1:mk-425c-usb-midi-keyboard:in', 'tab-1:mk-425c-usb-midi-keyboard:out']), ids(g).join(' '));
  const out = g.ports.find((p) => p.id === 'tab-1:circuit:out'), inn = g.ports.find((p) => p.id === 'tab-1:circuit:in');
  ok('a WebMIDI input is the device\'s out port, a WebMIDI output its in port', out.dir === 'out' && inn.dir === 'in' && out.medium === 'midi');
  ok('NEGATIVE CONTROL: with no SysEx access the in port refuses sysex by name', inn.never.includes('sysex') && !inn.accepts.includes('sysex'));
  const reg = createRegistry({ now: () => 0 });
  reg.ingest({ from: 's1', type: 'graph.announce', graph: sent.at(-1) });
  const bay = reg.fill(createBay({ now: () => 0 }));
  const v = bay.validate('tab-1:mk-425c-usb-midi-keyboard:out', 'tab-1:circuit:in');
  ok('announced through a registry, a bay can link keyboard to Circuit', v.ok, v.why);
  const vb = bay.validate('tab-1:circuit:in', 'tab-1:circuit:out');
  ok('NEGATIVE CONTROL: and refuses a link backwards', !vb.ok);

  const n0 = sent.length;
  access.inputs.get('i-Circuit').state = 'connected';
  for (const f of [access]) f.plug('input', { id: 'i-Circuit', name: 'Circuit' });   // the same port, said again
  ok('NEGATIVE CONTROL: a statechange that changes nothing sends no graph', sent.length === n0, `${sent.length - n0} sent`);
  ok('announce() sends it again anyway, which answers graph.ask', mg.announce() && sent.length === n0 + 1);
  access.unplug(access.outputs.get('o-Circuit'));
  ok('a half unplugged leaves the graph and the graph is sent', sent.length === n0 + 2
    && !ids(sent.at(-1)).includes('tab-1:circuit:in') && ids(sent.at(-1)).includes('tab-1:circuit:out'));
}

// ── identity: Circuit becomes Circuit 2 ───────────────────────────────────

console.log('\n== a replug keeps the id ==');
{
  const access = fakeAccess();
  const kb = access.device('MK-425C USB MIDI Keyboard', { manufacturer: 'Evolution' });
  let c = access.device('Circuit');
  const first = c.output;
  const mg = createMidiGraph({ site: 'tab-1' }).attach(access);
  const before = ids(mg.graph());
  const r = mg.link('tab-1:mk-425c-usb-midi-keyboard:out', 'tab-1:circuit:in');
  ok('a link from keyboard to Circuit is made', r.ok, JSON.stringify(r));
  kb.input.play([0x90, 60, 100]);
  ok('a note reaches the Circuit', hex(c.output.sent.at(-1) || []) === '90 3C 64');

  // Replug with the browser's id kept and the name changed: the path holds it.
  access.unplug(c.input); access.unplug(c.output);
  c = { input: access.plug('input', { id: 'i-Circuit', name: 'Circuit 2' }), output: access.plug('output', { id: 'o-Circuit', name: 'Circuit 2' }) };
  ok('renamed Circuit 2 with its id kept: the same port ids', JSON.stringify(ids(mg.graph())) === JSON.stringify(before), ids(mg.graph()).join(' '));
  ok('the label follows the name', mg.graph().ports.find((p) => p.id === 'tab-1:circuit:in').label === 'Circuit 2');

  // Replug with a new browser id as well: only the soft match can keep it.
  const old = c.output;
  access.unplug(c.input); access.unplug(c.output);
  kb.input.play([0x90, 61, 100]);
  ok('NEGATIVE CONTROL: with the Circuit gone a note is lost and counted, not thrown', mg.counts().lost === 1, JSON.stringify(mg.counts()));
  c = { input: access.plug('input', { id: 'i-new', name: 'Circuit 3' }), output: access.plug('output', { id: 'o-new', name: 'Circuit 3' }) };
  ok('a new browser id and a new name: one absent Circuit, one new one, same ids', JSON.stringify(ids(mg.graph())) === JSON.stringify(before), ids(mg.graph()).join(' '));
  kb.input.play([0x90, 62, 100]);
  ok('the link made before the replug delivers to the NEW port', hex(c.output.sent.at(-1) || []) === '90 3E 64');
  ok('NEGATIVE CONTROL: and nothing to either object it was before', first.sent.length === 1 && old.sent.length === 0, `${first.sent.length} and ${old.sent.length}`);
}

console.log('\n== never guessed between ==');
{
  // Two identical units, both replugged with new ids: there is no telling them apart.
  const access = fakeAccess();
  const a = access.device('Circuit', { idIn: 'i-a', idOut: 'o-a' });
  const b = access.plug('input', { id: 'i-b', name: 'Circuit 2' });
  const mg = createMidiGraph({ site: 't' }).attach(access);
  const g0 = ids(mg.graph());
  ok('two identical units are two nodes', g0.includes('t:circuit:out') && g0.includes('t:circuit-2:out'), g0.join(' '));
  access.unplug(a.input); access.unplug(b);
  access.plug('input', { id: 'i-c', name: 'Circuit' });
  const g1 = ids(mg.graph());
  ok('NEGATIVE CONTROL: two absent, one new: neither id is given to it', !g1.includes('t:circuit:out') && !g1.includes('t:circuit-2:out'), g1.join(' '));

  const acc2 = fakeAccess();
  const one = acc2.plug('input', { id: 'i-1', name: 'Circuit' });
  const mg2 = createMidiGraph({ site: 't' }).attach(acc2);
  acc2.unplug(one);
  // Both arrive before one statechange, the way a hub coming up reports them.
  // One at a time, the first would rightly take the id: at that moment exactly
  // one remembered port met exactly one new one.
  acc2.plugMany([['input', { id: 'i-2', name: 'Circuit' }], ['input', { id: 'i-3', name: 'Circuit 2' }]]);
  const g2 = ids(mg2.graph());
  ok('NEGATIVE CONTROL: one absent, two new: neither takes the old id', !g2.includes('t:circuit:out'), g2.join(' '));

  const acc3 = fakeAccess();
  const nov = acc3.plug('input', { id: 'i-1', name: 'Circuit' });
  const mg3 = createMidiGraph({ site: 't' }).attach(acc3);
  acc3.unplug(nov);
  acc3.plug('input', { id: 'i-9', name: 'Circuit', manufacturer: 'Somebody Else' });
  const g3 = ids(mg3.graph());
  ok('NEGATIVE CONTROL: the same name from another manufacturer is not the Circuit', !g3.includes('t:circuit:out'), g3.join(' '));

  const acc4 = fakeAccess();
  const o4 = acc4.plug('output', { id: 'o-1', name: 'Circuit' });
  const mg4 = createMidiGraph({ site: 't' }).attach(acc4);
  acc4.unplug(o4);
  acc4.plug('input', { id: 'i-1', name: 'Circuit' });
  const g4 = mg4.graph();
  ok('NEGATIVE CONTROL: an input is never matched to a remembered output', !ids(g4).includes('t:circuit:in') && ids(g4).includes('t:circuit:out'), ids(g4).join(' '));
}

console.log('\n== serials first, placeholders refused ==');
{
  ok('a Digitone II\'s serial is a placeholder', placeholderSerial('000000000001') && placeholderSerial('') && placeholderSerial('FFFFFFFF'));
  ok('NEGATIVE CONTROL: a real serial is not', !placeholderSerial('A1B2C3') && !placeholderSerial('100000000001'));
  ok('the stem takes off what a replug and a unit number add', stemOf('Circuit 2') === 'Circuit' && stemOf('Circuit (2)') === 'Circuit'
    && stemOf('Circuit #2') === 'Circuit' && stemOf('Circuit MIDI 1 2') === 'Circuit MIDI' && stemOf('MK-425C USB MIDI Keyboard') === 'MK-425C USB MIDI Keyboard');

  // Two identical units with real serials come back on each other's paths.
  const access = fakeAccess();
  access.plug('input', { id: 'p1', name: 'Digitakt', manufacturer: 'Elektron', serial: 'SN-A' });
  access.plug('input', { id: 'p2', name: 'Digitakt 2', manufacturer: 'Elektron', serial: 'SN-B' });
  const mg = createMidiGraph({ site: 't' }).attach(access);
  const was = Object.fromEntries(mg.remembered().map((e) => [e.serial, e.slug]));
  access.unplug(access.inputs.get('p1')); access.unplug(access.inputs.get('p2'));
  access.plug('input', { id: 'p2', name: 'Digitakt', manufacturer: 'Elektron', serial: 'SN-A' });
  access.plug('input', { id: 'p1', name: 'Digitakt 2', manufacturer: 'Elektron', serial: 'SN-B' });
  const now = Object.fromEntries(mg.remembered().map((e) => [e.serial, e.slug]));
  ok('swapped paths: each unit keeps its own id by serial', was['SN-A'] === now['SN-A'] && was['SN-B'] === now['SN-B'] && was['SN-A'] !== was['SN-B'], JSON.stringify(now));
  // A different unit on a known path, while the one that used it is away.
  access.unplug(access.inputs.get('p2'));
  access.plug('input', { id: 'p2', name: 'Digitakt', manufacturer: 'Elektron', serial: 'SN-C' });
  const third = mg.remembered().find((e) => e.serial === 'SN-C');
  ok('NEGATIVE CONTROL: a path, or a name, whose serial disagrees is not taken', third && third.slug !== was['SN-A'] && third.slug !== was['SN-B'], third?.slug);

  // Placeholder serials say nothing, so two units with them and new paths are not guessed.
  const acc2 = fakeAccess();
  acc2.plug('input', { id: 'q1', name: 'Digitone II', manufacturer: 'Elektron', serial: '000000000001' });
  acc2.plug('input', { id: 'q2', name: 'Digitone II 2', manufacturer: 'Elektron', serial: '000000000001' });
  const mg2 = createMidiGraph({ site: 't' }).attach(acc2);
  const g0 = ids(mg2.graph());
  acc2.unplug(acc2.inputs.get('q1')); acc2.unplug(acc2.inputs.get('q2'));
  acc2.plug('input', { id: 'q3', name: 'Digitone II', manufacturer: 'Elektron', serial: '000000000001' });
  const g1 = ids(mg2.graph());
  ok('NEGATIVE CONTROL: a placeholder serial matches nobody', g1.every((x) => !g0.includes(x)), `${g0.join(' ')} then ${g1.join(' ')}`);
}

console.log('\n== remembered across a reload ==');
{
  const access = fakeAccess();
  access.device('Circuit');
  access.device('Circuit 2', { idIn: 'i-x', idOut: 'o-x' });   // a second unit, so a reload has to tell them apart
  let kept = null;
  const mg = createMidiGraph({ site: 't', onRemember: (m) => { kept = m; } }).attach(access);
  const g0 = ids(mg.graph());
  ok('onRemember hands over what to keep, each unit\'s halves on one node', Array.isArray(kept)
    && kept.map((e) => e.slug + ':' + e.dir).sort().join(' ') === 'circuit-2:in circuit-2:out circuit:in circuit:out',
    kept?.map((e) => e.slug + ':' + e.dir).join(' '));
  // An output whose name matches neither waiting input could be the half of either.
  const acc9 = fakeAccess();
  acc9.plugMany([['input', { id: 'a', name: 'Circuit' }], ['input', { id: 'b', name: 'Circuit 2' }], ['output', { id: 'c', name: 'Circuit 3' }]]);
  const g9 = ids(createMidiGraph({ site: 't' }).attach(acc9).graph());
  ok('NEGATIVE CONTROL: a half that could pair with two devices pairs with neither', g9.includes('t:circuit-3:in') && !g9.includes('t:circuit:in') && !g9.includes('t:circuit-2:in'), g9.join(' '));
  // A reload: a new page, the memory handed back, the second unit on its old path.
  const acc2 = fakeAccess();
  acc2.plug('input', { id: 'i-x', name: 'Circuit 2' });
  const mg2 = createMidiGraph({ site: 't', memory: JSON.parse(JSON.stringify(kept)) }).attach(acc2);
  ok('the second unit keeps circuit-2 after a reload', ids(mg2.graph()).join(' ') === 't:circuit-2:out', ids(mg2.graph()).join(' '));
  const mg3 = createMidiGraph({ site: 't' }).attach(acc2);
  ok('NEGATIVE CONTROL: with no memory the same port is circuit, which is why memory matters', ids(mg3.graph()).join(' ') === 't:circuit:out', ids(mg3.graph()).join(' '));
  { const r2 = mg2.link('t:circuit-2:out', 't:circuit:in'); ok('a remembered absent device can be linked before it returns', r2.ok, JSON.stringify(r2)); }
  ok('NEGATIVE CONTROL: a port nobody has ever seen cannot', mg2.link('t:circuit-2:out', 't:moog:in').reason === 'unknown-port');
  void g0;
}

// ── links through route-core ──────────────────────────────────────────────

console.log('\n== links run through route-core ==');
{
  const access = fakeAccess();
  const kb = access.device('Keys', { manufacturer: 'Evolution' });
  const c = access.device('Circuit');
  const mg = createMidiGraph({ site: 't', now: () => 5 }).attach(access);
  const r = mg.link('t:keys:out', 't:circuit:in', [{ op: 'transpose', by: 12 }, { op: 'channel', to: 10 }]);
  ok('a link with ops is made', r.ok, JSON.stringify(r));
  ok('the keyboard listens now, and was opened', kb.input.listeners() === 1 && kb.input.opened === 1);
  ok('NEGATIVE CONTROL: the Circuit\'s own out does not listen, no link starts there', c.input.listeners() === 0);
  kb.input.play([0x90, 60, 100]);
  ok('the ops ran: an octave up, onto channel 10', hex(c.output.sent.at(-1)) === '99 48 64', hex(c.output.sent.at(-1)));
  ok('NEGATIVE CONTROL: the keyboard\'s own output got nothing', kb.output.sent.length === 0);
  ok('NEGATIVE CONTROL: backwards is refused by route-core', mg.link('t:circuit:in', 't:keys:out').reason === 'direction');
  ok('NEGATIVE CONTROL: an op route-core does not have is refused', mg.link('t:circuit:out', 't:keys:in', [{ op: 'arpeggiate' }]).reason === 'unknown-op');
  const n = mg.unlink(r.id);
  const tail = c.output.sent.slice(-2).map(hex);
  ok('unlink releases the held note, then CC 123 on its channel', n === 2 && tail[0] === '89 48 00' && tail[1] === 'B9 7B 00', tail.join(' / '));
  ok('NEGATIVE CONTROL: and the keyboard stops listening', kb.input.listeners() === 0 && mg.listening().length === 0);
  kb.input.play([0x90, 64, 100]);
  ok('NEGATIVE CONTROL: a note after unlink goes nowhere', c.output.sent.length === 3, `${c.output.sent.length}`);
}

console.log('\n== SysEx meets the gate ==');
{
  const PATCH_FLASH = [0xF0, 0x00, 0x20, 0x29, 0x01, 0x60, 0x01, 0x00, 0xF7];   // byte 6 01: Replace Patch, writes flash
  const PATCH_RAM = [0xF0, 0x00, 0x20, 0x29, 0x01, 0x60, 0x00, 0x00, 0xF7];     // byte 6 00: Replace Current Patch

  const plain = fakeAccess();
  const pk = plain.device('Keys'), pc = plain.device('Circuit');
  const mgp = createMidiGraph({ site: 't' }).attach(plain);
  mgp.link('t:keys:out', 't:circuit:in');
  pk.input.play(PATCH_RAM);
  ok('NEGATIVE CONTROL: with no SysEx access no SysEx is sent', pc.output.sent.length === 0);

  const access = fakeAccess({ sysexEnabled: true });
  const k = access.device('Keys'), c = access.device('Circuit');
  const circuit = { rules: [{ match: [0xF0, 0x00, 0x20, 0x29, 0x01, 0x60, 0x00], do: 'allow' }] };
  const mg = createMidiGraph({ site: 't', policyFor: (e) => (e.stem === 'Circuit' ? circuit : {}) }).attach(access);
  ok('with SysEx access the in port accepts it', mg.graph().ports.find((p) => p.id === 't:circuit:in').accepts.includes('sysex'));
  mg.link('t:keys:out', 't:circuit:in');
  k.input.play(PATCH_RAM);
  ok('a profile rule lets Replace Current Patch through', c.output.sent.length === 1 && hex(c.output.sent[0]) === hex(PATCH_RAM));
  k.input.play(PATCH_FLASH);
  ok('NEGATIVE CONTROL: Replace Patch is held, not sent', c.output.sent.length === 1 && mg.held('t:circuit:in') === 1, `held ${mg.held('t:circuit:in')}`);
  ok('a person says yes and it goes', mg.confirm('t:circuit:in') === 1 && hex(c.output.sent.at(-1)) === hex(PATCH_FLASH));
  k.input.play(PATCH_FLASH);
  ok('NEGATIVE CONTROL: a no drops it', mg.deny('t:circuit:in') === 1 && c.output.sent.length === 2);
}

console.log('\n== close ==');
{
  const access = fakeAccess();
  const k = access.device('Keys'), c = access.device('Circuit');
  const mg = createMidiGraph({ site: 't' }).attach(access);
  mg.link('t:keys:out', 't:circuit:in');
  k.input.play([0x90, 60, 1]);
  mg.close();
  ok('close releases what was sounding', hex(c.output.sent.at(-1)) === 'B0 7B 00' && hex(c.output.sent.at(-2)) === '80 3C 00');
  ok('NEGATIVE CONTROL: and leaves no listener behind', k.input.listeners() === 0 && access.stateListeners() === 0);
}

console.log(`\n${pass}/${pass + fail} passed, ${neg} of them negative controls`);
if (fail) process.exit(1);
