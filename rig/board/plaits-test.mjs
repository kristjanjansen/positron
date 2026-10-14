// node rig/board/plaits-test.mjs: Plaits on the board with no Pi, no jackd and no compiler. The
// command lines, the core, the service over a fake host, the build recipe, and posplaits.cc read
// as text against the shim and the board, so the two sides of the pipe cannot drift apart.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as PL from './plaits.mjs';
import { recipe, shellVars, CXXFLAGS } from './plaits/recipe.mjs';
import { KNOBS, PATCHES, P, PARAM_NAMES, MODELS, MODEL_SHORT } from '../../demo/shell/plaits-params.mjs';
import { JACK_ENDS } from '../../demo/shell/graph-registry.mjs';
import { graphOf } from './beat.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n         ${detail}` : ''}`); }
};
const throws = (fn) => { try { fn(); return false; } catch { return true; } };
const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

console.log('\n== the shared parameters ==');
{
  const voiceSrc = read('../../demo/code/plaits-voice.mjs');
  ok('plaits-voice.mjs re-exports the five names from the pure module and defines none of them itself',
    /export \{ P, MODELS, PATCHES, MODEL_SHORT, KNOBS \} from '\/shell\/plaits-params\.mjs'/.test(voiceSrc)
    && !/export const (P|MODELS|PATCHES|MODEL_SHORT|KNOBS)\b/.test(voiceSrc));
  const params = read('../../demo/shell/plaits-params.mjs');
  ok('NEGATIVE CONTROL: the pure module imports nothing, so node and the board can load it', !/^\s*import\b/m.test(params));
  ok('ten knobs, sixteen models, seven patches, as /connect/ and /code/plaits/ show them',
    KNOBS.length === 10 && MODELS.length === 16 && MODEL_SHORT.length === 16 && PATCHES.length === 7
    && PARAM_NAMES.join() === 'model,pitch,harmonics,timbre,morph,timbre CV,FM CV,morph CV,decay,colour', PARAM_NAMES.join());
  ok('every knob but pitch names a parameter id the shim has', KNOBS.every((k) => k.param === 'transpose' || Number.isInteger(P[k.param])));
}

console.log('\n== command lines ==');
{
  ok('a note on is a word and two plain numbers, newline ended', PL.encodeCmd('on', 60, 100 / 127) === 'on 60 0.787402\n');
  ok('a tiny number never prints in exponent form', PL.encodeCmd('set', 11, 1e-9) === 'set 11 0\n' && PL.num(-0.25) === '-0.25');
  ok('NEGATIVE CONTROL: NaN, a string and an unknown word are refused before they reach the pipe',
    throws(() => PL.encodeCmd('on', NaN, 1)) && throws(() => PL.encodeCmd('on', '60', 1)) && throws(() => PL.encodeCmd('ON; rm', 1)));
  ok('a ready line parses to its JSON', PL.parseLine('ready {"port":"posplaits:out_1","src":"6d96a1b7f5f3faf0"}')?.body.port === 'posplaits:out_1');
  ok('NEGATIVE CONTROL: a line that is not `<kind> <json>` is not taken for one',
    PL.parseLine('Cannot lock down 82280346 byte memory area') === null && PL.parseLine('stats {broken') === null);
  const lr = PL.lineReader();
  ok('lines split across chunks come out whole', lr.push('rea').length === 0 && lr.push('dy {}\nsta').join() === 'ready {}'
    && lr.push('ts {"held":1}\n').join() === 'stats {"held":1}');
}

console.log('\n== the core: verbs to lines ==');
const lines = [];
let clock = 1_000_000;
const core = PL.createPlaitsCore({ send: (l) => lines.push(l.trim()), now: () => clock });
{
  core.boot();
  ok('boot sets six voices, the first patch\'s trim, then every knob but pitch by id',
    lines[0] === 'voices 6' && lines[1] === 'gain 1.05' && lines.filter((l) => l.startsWith('set ')).length === 9
    && lines.includes(`set ${P.engine} 5`) && lines.includes(`set ${P.lpgColour} 0.6`), lines.join(' | '));
  lines.length = 0;
  const on = core.noteOn({ note: 60, vel: 127 }, { from: 'tab-a' });
  ok('a note on is `on <note> <vel/127>`', on.ok && lines.at(-1) === 'on 60 1');
  core.set({ name: 'pitch', v: 12 });
  ok('pitch is a transpose of the keys and never reaches the host', lines.length === 1 && core.stats().transpose === 12);
  core.noteOn({ note: 62 }, { from: 'tab-a' });
  ok('a key after +12 plays 12 up, at velocity 100 by default', lines.at(-1) === 'on 74 0.787402');
  core.noteOff({ note: 60 });
  ok('a key held from before the transpose lets go of the note it started, not the shifted one', lines.at(-1) === 'off 60');
  ok('NEGATIVE CONTROL: a key nobody holds sends nothing', core.noteOff({ note: 61 }).held === false && lines.at(-1) === 'off 60');
  core.noteOn({ note: 62 });
  ok('the same key again releases its old note first', lines.slice(-2).join(' | ') === 'off 74 | on 74 0.787402', lines.slice(-2).join(' | '));
  ok('NEGATIVE CONTROL: not a note, not a knob, not a number: refused in words, nothing sent',
    (() => { const n = lines.length;
      return !core.noteOn({ note: 128 }).ok && !core.set({ name: 'volume', v: 1 }).ok && !core.set({ name: 'timbre', v: 'x' }).ok
        && /is not one of model/.test(core.set({ name: 'volume', v: 1 }).reason) && lines.length === n; })());
  core.set({ name: 'model', v: 2.6 });
  ok('model rounds and timbre CV clamps to its range', lines.at(-1) === `set ${P.engine} 3`
    && core.set({ name: 'timbre CV', value: -5 }).v === -1 && lines.at(-1) === `set ${P.timbreModAmount} -1`);
  lines.length = 0;
  const pr = core.loadPatch({ index: 1 });
  ok('a patch sets its trim and six knobs, as /connect/\'s picker does', pr.ok && pr.name === 'Soft FM' && lines[0] === 'gain 0.75'
    && lines.includes(`set ${P.engine} 2`) && lines.length === 7, lines.join(' | '));
  ok('a patch by name is the same patch', core.loadPatch({ name: 'Wind' }).index === 6);
  ok('NEGATIVE CONTROL: a patch that does not exist is refused and lists the ones that do',
    !core.loadPatch({ index: 99 }).ok && /Wavetable drift/.test(core.loadPatch({ index: 99 }).reason));
  core.panic();
  ok('panic is one line and forgets every held key', lines.at(-1) === 'panic' && core.stats().held === 0);
}

console.log('\n== the core: a quiet page\'s notes ==');
{
  const out = [];
  let t = 0, seen = null;
  const c = PL.createPlaitsCore({ send: (l) => out.push(l.trim()), now: () => t, heardAt: () => seen });
  c.noteOn({ note: 48 }, { from: 'tab-b' });
  t = PL.QUIET_MS + 1; seen = PL.QUIET_MS - 10;
  c.sweep();
  ok('NEGATIVE CONTROL: a page the board heard from recently keeps its note', out.at(-1).startsWith('on 48'));
  t = 2 * PL.QUIET_MS + 1;
  c.sweep();
  ok('a page quiet past QUIET_MS has its note released', out.at(-1) === 'off 48' && c.stats().quietReleased === 1);
}

console.log('\n== the service over a fake host ==');
{
  const sent = [];
  let exitFn = null, stopped = 0, startedWith = null;
  const fake = { ok: true, ready: {}, send: (l) => sent.push(l.trim()), onExit: (fn) => { exitFn = fn; },
    stats: async () => ({ held: 1, loadPct: 2.5, xruns: 0 }), stop: () => { stopped++; return false; },
    status: () => ({ port: 'posplaits:out_1', src: '6d96a1b7f5f3faf0' }) };
  const svc = PL.createPlaitsService({ start: async (o) => { startedWith = o; return fake; }, sweepMs: 1e6 });
  const said = [];
  const rep = (type, body) => said.push({ type, ...body });
  ok('only Plaits\' messages are Plaits\'', svc.handles({ type: 'plaits.set' }) && svc.handles({ type: 'note.on', node: 'plaits' })
    && svc.handles({ type: 'audio.start', source: 'plaits' }) && !svc.handles({ type: 'note.on' })
    && !svc.handles({ type: 'note.on', node: 'collide' }) && !svc.handles({ type: 'audio.start', source: 'sampler' }));
  await svc.handle({ type: 'note.on', node: 'plaits', note: 60 }, rep);
  ok('NEGATIVE CONTROL: a note before audio.start is dropped, saying how to start it',
    said.at(-1).dropped && /audio\.start \{source: "plaits"\}/.test(said.at(-1).reason) && sent.length === 0);
  await svc.handle({ type: 'audio.start', source: 'plaits', voices: 20 }, rep);
  ok('audio.start raises the host once, clamps voices to 8, and boots it', said.at(-1).type === 'audio.started' && said.at(-1).ok
    && startedWith.voices === 8 && sent[0] === 'voices 8' && said.at(-1).port === 'posplaits:out_1');
  await svc.handle({ type: 'audio.start', source: 'plaits' }, rep);
  ok('a second audio.start is `already`, with no second boot', said.at(-1).already === true && sent.filter((l) => l.startsWith('voices')).length === 1);
  await svc.handle({ type: 'note.on', node: 'plaits', note: 64, vel: 64, from: 'tab-c' }, rep);
  ok('note.on answers note.ack for node plaits and sends the line', said.at(-1).type === 'note.ack' && said.at(-1).node === 'plaits'
    && sent.at(-1) === 'on 64 0.503937');
  await svc.handle({ type: 'plaits.set', name: 'morph', v: 0.25 }, rep);
  await svc.handle({ type: 'plaits.patch', index: 0 }, rep);
  await svc.handle({ type: 'plaits.stats' }, rep);
  ok('plaits.set, plaits.patch and plaits.stats answer under their own names, stats with the host\'s numbers',
    said.slice(-3).map((s) => s.type).join() === 'plaits.set,plaits.patch,plaits.stats' && said.at(-1).engine.loadPct === 2.5
    && said.at(-1).held === 1 && said.at(-1).src === '6d96a1b7f5f3faf0');
  exitFn('SIGSEGV');
  await svc.handle({ type: 'note.on', node: 'plaits', note: 60 }, rep);
  ok('a host that dies is let go, said so, and a note after it is dropped', said.at(-1).dropped && svc.status().exits === 1
    && svc.status().lastExit === 'SIGSEGV' && svc.status().up === false);
  await svc.handle({ type: 'audio.start', source: 'plaits' }, rep);
  await svc.handle({ type: 'audio.stop', source: 'plaits' }, rep);
  ok('audio.stop stops the host and says it was plaits', said.at(-1).type === 'audio.stopped' && said.at(-1).was === 'plaits' && stopped === 1);
  const failing = PL.createPlaitsService({ start: async () => ({ ok: false, reason: 'posplaits is not built on this board' }) });
  await failing.handle({ type: 'audio.start', source: 'plaits' }, rep);
  ok('NEGATIVE CONTROL: a host that cannot start is reported in its own words', said.at(-1).ok === false && /not built/.test(said.at(-1).reason));
  const missing = await PL.startPosPlaits({ bin: '/nonexistent/posplaits' });
  ok('with no binary, starting names the build script and the package it needs, and spawns nothing',
    !missing.ok && /plaits\/build\.sh/.test(missing.reason) && /libjack-jackd2-dev/.test(missing.reason));
}

console.log('\n== the board announces it ==');
{
  const facts = { room: 'studio-1', instruments: { synth: true, plaits: true }, inputs: [], ports: [], jack: true, frameMs: 20,
    gpu: false, plaitsParams: PL.PLAITS_PARAMS };
  const g = graphOf(facts);
  const vin = g.ports.find((p) => p.id === 'pi-1:plaits:value-in');
  ok('beat.mjs carries the knob names onto pi-1:plaits:value-in', vin?.shape.names.join() === PARAM_NAMES.join());
  ok('and pi-1:plaits:audio-out names posplaits:out_1', g.ports.find((p) => p.id === 'pi-1:plaits:audio-out')?.jack.join() === JACK_ENDS.plaits.join());
  const board = read('./board.mjs');
  ok('board.mjs routes Plaits\' verbs, announces it, passes the names, and sweeps a stray posplaits',
    /plaits\.handles\(msg\)/.test(board) && /plaits: plaitsAvailable\(\)/.test(board) && /plaitsParams: PLAITS_PARAMS/.test(board)
    && /'scsynth', 'posplaits'/.test(board) && /plaits\.stop\(\)/.test(board));
}

console.log('\n== the build recipe ==');
{
  const r = recipe();
  ok('the digest computed here is plaits.wasm\'s own, so the board builds the definition the browser plays',
    r.digest === '6d96a1b7f5f3faf0' && r.same && r.sources.length === 31, `${r.digest} against ${r.wasmDigest}`);
  const prov = JSON.parse(read('../../demo/muta/vendor/PROVENANCE-plaits.json'));
  const byteOrder = (() => {
    const list = [...prov.sources].sort().join('\n');
    return execFileSync('shasum', ['-a', '256'], { input: `plaits=${prov.upstream.eurorack.commit}\nstmlib=${prov.upstream.stmlib.commit}\nshim=${prov.shim.sha256}\ndefines=${prov.defines}\nsources=\n${list}\n` }).toString().slice(0, 16);
  })();
  ok('NEGATIVE CONTROL: the same recipe in byte order gives another digest, so the collation is load bearing', byteOrder !== r.digest, byteOrder);
  ok('NEGATIVE CONTROL: a shim that moved by one byte is a different definition',
    recipe({ shim: Buffer.concat([readFileSync(new URL('../../demo/muta/build/plaits_shim.cc', import.meta.url)), Buffer.from(' ')]) }).same === false);
  ok('NEGATIVE CONTROL: a source path that could break out of the shell is refused',
    throws(() => recipe({ provenance: { ...prov, sources: [...prov.sources, "stmlib/x.cc'; rm -rf ~; '"] } }))
    && throws(() => recipe({ provenance: { ...prov, defines: '-DTEST $(id)' } })));
  const vars = shellVars(r);
  ok('the shell assignments carry the pins, 31 quoted sources, -DTEST and -ffp-contract=off',
    vars.includes("EURO_SHA='9739c0227708fab7a28b4efef7b27a9a1bc098d1'") && vars.includes("STMLIB_SHA='c0c42ec91d315a2ec9c0a3845e593b71ffa429db'")
    && (vars.match(/'plaits\/|'stmlib\//g) || []).length === 31 && vars.includes("DEFINES=('-DTEST')") && CXXFLAGS.includes('-ffp-contract=off')
    && vars.includes('SAME=1'));
  const sh = read('./plaits/build.sh');
  ok('build.sh refuses without the JACK headers and names the package', /\/usr\/include\/jack\/jack\.h/.test(sh)
    && /apt-get install -y --no-install-recommends libjack-jackd2-dev/.test(sh) && /-ljack/.test(sh));
  let out = '', code = 0;
  try { out = execFileSync('bash', [new URL('./plaits/build.sh', import.meta.url).pathname], { stdio: ['ignore', 'pipe', 'pipe'] }).toString(); }
  catch (e) { code = e.status; out = String(e.stderr); }
  ok('NEGATIVE CONTROL: on this laptop build.sh refuses before it fetches or compiles anything', code === 2 && /built on the board/.test(out), `${code} ${out}`);
  const push = read('./push.sh');
  ok('push.sh ships the shim and the provenance, runs the build, and prints the new md5s',
    /demo\/muta\/build\/plaits_shim\.cc demo\/muta\/vendor\/PROVENANCE-plaits\.json/.test(push) && /plaits\/build\.sh/.test(push)
    && /plaits\/posplaits\.cc/.test(push));
  ok('packages.txt names libjack-jackd2-dev, commented out until it is approved', /^# libjack-jackd2-dev\t/m.test(read('./packages.txt')));
}

console.log('\n== posplaits.cc against the shim and the board, as text ==');
{
  const host = read('./plaits/posplaits.cc');
  const shim = read('../../demo/muta/build/plaits_shim.cc');
  const decls = [...host.matchAll(/^((?:int|void|float|const char\*) plaits_\w+\([^)]*\));/gm)].map((m) => m[1]);
  const missing = decls.filter((d) => !shim.includes(`${d} {`));
  ok(`every one of the ${decls.length} shim functions the host declares exists in plaits_shim.cc with that signature`,
    decls.length >= 14 && missing.length === 0, missing.join(' ; '));
  const words = ['on', 'off', 'set', 'voices', 'gain', 'panic', 'stats', 'quit'];
  ok('every command word the board writes is one the host reads', words.every((w) => host.includes(`strcmp(word, "${w}")`)));
  const idsOk = [...(host.split('bool param_ok(')[1] ?? '').split('return false')[0].matchAll(/case (\d+):/g)].map((m) => +m[1]);
  ok('every parameter id the knobs use is one the host lets through', Object.values(P).every((id) => idsOk.includes(id)), idsOk.join());
  ok('the host\'s client is the JACK end the graph names', host.includes('kClient[] = "posplaits"') && host.includes('%s:out_1')
    && JACK_ENDS.plaits[0] === 'posplaits:out_1');
  ok('the board\'s limits are the host\'s and the shim\'s', host.includes(`kMaxGain = ${PL.MAX_GAIN}.0f`)
    && shim.includes(`kMaxVoices = ${PL.MAX_VOICES};`) && PATCHES.every((p) => p.gain <= PL.MAX_GAIN));
  ok('the host asks the shim whether jackd\'s rate is the one Plaits is compiled for, and refuses another',
    /if \(!plaits_init\(static_cast<float>\(rate\)\)\)/.test(host) && /return 3;/.test(host));
  ok('NEGATIVE CONTROL: the ids the shim removed (7, 9) are not let through', !idsOk.includes(7) && !idsOk.includes(9));
}

console.log(`\n${pass}/${pass + fail} green`);
process.exit(fail ? 1 : 0);
