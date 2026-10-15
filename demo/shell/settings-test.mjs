// node demo/shell/settings-test.mjs: what /connect/ lets a `settings` answer set, with no browser.
// Seven of the fourteen are NEGATIVE CONTROLS: a checker that accepts everything passes the rest.

import { SETTINGS, paramsText, withParams, checkSettings } from './settings.mjs';
import { PARAMS } from './synth-params.mjs';
import { KNOBS } from './plaits-params.mjs';
import { DEFAULTS } from '../granulator/grain-ring.mjs';

let ok = 0;
const bad = [];
const is = (what, pass, detail = '') => { if (pass) ok++; else bad.push(`${what}${detail ? `  (${detail})` : ''}`); };

const names = (t) => SETTINGS[t].map((s) => s.name);
const of = (t, n) => SETTINGS[t].find((s) => s.name === n);

is('the synth\'s settings are its numeric knob rows, in their order, and wave is not one', names('synth').join() === PARAMS.filter((p) => p.name !== 'wave').map((p) => p.name).join(),
  names('synth').join());
is('the synth\'s cutoff runs over its knob\'s whole travel', of('synth', 'cutoff').lo === 80 && of('synth', 'cutoff').hi === 8000, JSON.stringify(of('synth', 'cutoff')));
is('Plaits\' settings are its knob row by name, with each knob\'s own range', names('plaits').join() === KNOBS.map((k) => k.name).join()
  && of('plaits', 'pitch').lo === -24 && of('plaits', 'model').hi === 15);
is('the grain ring\'s settings are its controls, density and size over their program spec', names('grains').every((n) => n in DEFAULTS)
  && of('grains', 'density').lo === 0.5 && of('grains', 'density').hi === 64 && of('grains', 'size').hi === 4);
is('NEGATIVE CONTROL: a grain control no patch moves is not offered', !names('grains').includes('lock'));
is('a value-in label carries its settings', withParams('synth value-in', 'synth') === `synth value-in (${paramsText('synth')})`
  && /cutoff 80\.\.8000/.test(paramsText('synth')));
is('NEGATIVE CONTROL: a type with no settings keeps its label as it was', withParams('sampler value-in', 'sampler') === 'sampler value-in');

const good = checkSettings('synth', 'web:synth', { cutoff: 400, q: '2' });
is('in range is taken, a numeric string read as a number', !good.why.length && good.set.cutoff === 400 && good.set.q === 2, JSON.stringify(good));
const high = checkSettings('synth', 'web:synth', { cutoff: 40000 });
is('NEGATIVE CONTROL: out of range is refused in words, naming the range', !Object.keys(high.set).length && /cutoff runs 80\.\.8000, and the answer asked 40000/.test(high.why[0]), high.why[0]);
const odd = checkSettings('synth', 'web:synth', { wobble: 3 });
is('NEGATIVE CONTROL: an unknown name is refused and the real ones are listed', /no setting called "wobble"; it has cutoff, q/.test(odd.why[0]), odd.why[0]);
const word = checkSettings('synth', 'web:synth', { cutoff: 'dark' });
is('NEGATIVE CONTROL: a word where a number goes is refused', /takes a number/.test(word.why[0]) && !('cutoff' in word.set), word.why[0]);
const none = checkSettings('sampler', 'web:sampler', { volume: 1 });
is('NEGATIVE CONTROL: a type with no settings refuses them', /takes no settings/.test(none.why[0]), none.why[0]);
const list = checkSettings('synth', 'web:synth', [400]);
is('NEGATIVE CONTROL: settings that are not names and values are refused', list.why.length === 1, list.why[0]);
is('the edges of a range are inside it', !checkSettings('plaits', 'web:plaits', { pitch: -24, timbre: 1 }).why.length);

for (const line of bad) console.log(`FAIL  ${line}`);
console.log(`${ok}/${ok + bad.length} ok`);
process.exit(bad.length ? 1 : 0);
