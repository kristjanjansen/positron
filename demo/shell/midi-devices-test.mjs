// demo/shell/midi-devices-test.mjs: createMidiDevices against a real bay and a fake MIDIAccess.
//   node demo/shell/midi-devices-test.mjs
// Three of the 9 are negative controls, marked `NEGATIVE CONTROL`.
// why: lessons/kit-midi-devices.md#test-header

import { createBay } from './bay.mjs';

let failed = 0, ok = 0;
const check = (name, pass, detail = '') => {
  if (pass) ok++; else failed++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`);
};

globalThis.navigator ??= {};
const { createMidiDevices } = await import('./midi-devices.mjs');

const S = 'web';
const bay = createBay();
bay.addNode({ id: `${S}:synth`, kind: 'engine' });
bay.addPort({ id: `${S}:synth:midi-in`, dir: 'in', medium: 'midi', accepts: ['note'] });
bay.addNode({ id: `${S}:keys`, kind: 'device' });
bay.addPort({ id: `${S}:keys:midi-in`, dir: 'in', medium: 'midi', accepts: ['note'] });

// a MIDI input whose listener a test can fire
const input = (id, name) => {
  const ls = [];
  return { id, name, state: 'connected', addEventListener: (k, fn) => ls.push(fn), fire(data) { for (const f of ls) f({ target: this, data }); } };
};
const a = input('port-a', 'Keystation'), b = input('port-b', 'nanoKEY');
const access = { inputs: new Map([[a.id, a]]), onstatechange: null };
let changes = 0;
const logs = [];
const md = createMidiDevices({ bay, site: S, to: [`${S}:synth:midi-in`, `${S}:keys:midi-in`], onChange: () => changes++, log: (l) => logs.push(l) });
md.attach(access);

const linksFrom = (node) => bay.links().filter((l) => l.from === `${node}:midi-out`);
check('an input is a device node named after it', bay.node(`${S}:midi`)?.kind === 'device' && bay.node(`${S}:midi`)?.label === 'Keystation', bay.node(`${S}:midi`)?.label);
check('its midi-out is linked to both named in-ports', linksFrom(`${S}:midi`).length === 2, `${linksFrom(`${S}:midi`).length} links`);
check('the page is told the inputs were read', changes === 1, `${changes}`);

a.fire([0x90, 60, 100]);
const sent = linksFrom(`${S}:midi`).reduce((n, l) => n + (l.sent || 0), 0);
check('a note on travels along its links', sent === 2, `sent ${sent}`);
check('NEGATIVE CONTROL: a pitch bend is not sent by default', (a.fire([0xe0, 0, 64]), linksFrom(`${S}:midi`).reduce((n, l) => n + (l.sent || 0), 0)) === 2);

// a second device, then the first one goes, holding a note
access.inputs.set(b.id, b);
access.onstatechange();
check('a second input is the next node id', !!bay.node(`${S}:midi-2`) && md.plugged.has(`${S}:midi-2`), [...md.plugged].join(' '));
access.inputs.delete(a.id);
access.onstatechange();
check('an unplugged device loses its links and leaves plugged', linksFrom(`${S}:midi`).length === 0 && !md.plugged.has(`${S}:midi`), `${linksFrom(`${S}:midi`).length} links`);
check('NEGATIVE CONTROL: the device still plugged in keeps its links', linksFrom(`${S}:midi-2`).length === 2, `${linksFrom(`${S}:midi-2`).length}`);
access.inputs.set(a.id, a);
access.onstatechange();
check('NEGATIVE CONTROL: a replug gets its old node id back, not a third one', md.plugged.has(`${S}:midi`) && !bay.node(`${S}:midi-3`), [...md.plugged].join(' '));

console.log(`\n${ok} ok, ${failed} failed`);
process.exit(failed ? 1 : 0);
