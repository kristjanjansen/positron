// rig/board/jack-bay-live.mjs: the bay half of the JACK arm, run against the
// real board, graded on the far side of the wire.
//
//   node rig/board/jack-bay-live.mjs                 the Circuit into the capture, and back out
//   node rig/board/jack-bay-live.mjs --pappus        and the Circuit into the granulator
//   node rig/board/jack-bay-live.mjs --sabotage      never make the link; the level asserts must go red
//
// Written 2026-10-11 (plans/plan-nodes-revisited.md §3 item 3). What it asserts
// is never a drawn wire and never a command having run:
//   - the JACK graph READ BACK by the board after `jack.link` and `jack.unlink`;
//   - the SOUND arriving in the board's main room (`studio-1`, the capture's
//     stream) while the Circuit plays a note, against the same note with the
//     link absent, which is the negative control that proves the level check
//     can fail.
//
// 🔴 IT PLAYS THE CIRCUIT. Note on and note off on channel 1 through the input's
// own gate (`midi.send`, inputs.mjs `midiVerdict`), 400 ms each, and CC 123 at
// the end. No SysEx, no program change, nothing that writes the instrument.
// ⚠️ IT CHANGES THE ONE JACK GRAPH ON THE BOARD for about a minute, and
// `--pappus` switches the granulator on and back off. Whoever is listening to
// `studio-1` hears the Circuit in it while the link is up. It restores what it
// found: the link is unlinked, the granulator left as it was.
import { format, parse, randomId, RELAY_BASE } from '../../demo/shell/wire.mjs';

const argv = process.argv.slice(2);
const PAPPUS = argv.includes('--pappus');
const SABOTAGE = argv.includes('--sabotage');
const MAIN = 'studio-1', INPUT = 'studio-1-circuit';
const CIRCUIT = 'pi-1:circuit:audio-out', CAPTURE = 'pi-1:capture:audio-in';
const GRAN_IN = 'pi-1:pappus:audio-in';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ` | ${detail}` : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` | ${detail}` : ''}`); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function room(name) {
  const FROM = `jbl-${randomId(6)}`;
  let seq = 0;
  const ws = new WebSocket(`${RELAY_BASE}/room/${name}/ws`);
  ws.binaryType = 'arraybuffer';
  const waiters = [];
  const frames = [];
  ws.onmessage = (e) => {
    if (typeof e.data !== 'string') {
      const b = Buffer.from(e.data);
      const pcm = new Int16Array(b.buffer.slice(b.byteOffset + 12, b.byteOffset + b.length));
      let s = 0; for (const v of pcm) s += v * v;
      frames.push({ t: performance.now(), rms: Math.sqrt(s / Math.max(1, pcm.length)) / 32768 });
      if (frames.length > 3000) frames.splice(0, 1000);
      return;
    }
    const { kind, msg } = parse(e.data);
    if (kind !== 'json' || msg.from === FROM) return;
    for (const w of [...waiters]) if (msg.type === w.type && (!w.id || msg.re === w.id)) { waiters.splice(waiters.indexOf(w), 1); w.done(msg); }
  };
  const open = new Promise((r) => { ws.onopen = r; });
  const send = (m) => { const id = `q${randomId(6)}`; ws.send(format(m, { from: FROM, seq: seq++, id })); return id; };
  const ask = async (m, type, ms = 8000) => {
    await open;
    const id = send(m);
    return new Promise((r) => { const w = { type, id, done: r }; waiters.push(w); setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); r(null); } }, ms); });
  };
  // Every message is the board's proof somebody is here (board.mjs
  // `clientSeen`), which is what keeps an insert this socket asked for.
  const ping = setInterval(() => { if (ws.readyState === 1) send({ type: 'board.ping' }); }, 3000);
  return { open, send, ask, frames, close: () => { clearInterval(ping); ws.close(); } };
}

const main = room(MAIN), input = room(INPUT);
await Promise.all([main.open, input.open]);
const db = (x) => (20 * Math.log10(Math.max(x, 1e-6))).toFixed(1);
/** Play one note on the Circuit and answer the loudest 20 ms frame in the main room around it. */
async function noteLevel(note = 60) {
  await wait(300);
  const k = main.frames.length;
  const floor = Math.max(...main.frames.slice(-15).map((f) => f.rms), 1e-6);
  input.send({ type: 'midi.send', bytes: [0x90, note, 100] });
  await wait(450);
  input.send({ type: 'midi.send', bytes: [0x80, note, 0] });
  await wait(500);
  const peak = Math.max(1e-6, ...main.frames.slice(k).map((f) => f.rms));
  return { floor, peak, rise: 20 * Math.log10(peak / floor), frames: main.frames.length - k };
}
const linkLine = (a, b) => `${a} -> ${b}`;

console.log('\n== the board, before anything moves ==');
let st = await main.ask({ type: 'audio.status' }, 'audio.started', 5000);
if (!st?.ok || st.source !== 'yoshimi') {
  console.log('  starting yoshimi, so the capture exists (about 15 s)');
  st = await main.ask({ type: 'audio.start', source: 'yoshimi' }, 'audio.started', 30000);
}
ok('yoshimi is the board\'s instrument, so the capture is on the graph', st?.ok && st.source === 'yoshimi', st ? `${st.source} ${st.reason ?? ''}` : 'no answer');
await wait(1500);
ok('the main room is streaming the capture', main.frames.length > 20, `${main.frames.length} frames`);
const before = await main.ask({ type: 'jack.graph' }, 'jack.graph', 5000);
ok('the board\'s own chain is intact before the test', before?.chain?.intact === true, JSON.stringify(before?.chain?.extra ?? before));
const links0 = await main.ask({ type: 'jack.links' }, 'jack.links', 5000);
ok('the board holds no bay link to begin with', links0?.links?.length === 0, JSON.stringify(links0?.links));

console.log('\n== NEGATIVE CONTROL: the Circuit with no link is not in the main room ==');
const off0 = await noteLevel(60);
ok('a Circuit note does not lift the main room with nothing linked', off0.rise < 10, `rise ${off0.rise.toFixed(1)} dB, peak ${db(off0.peak)} dBFS`);

console.log('\n== the Circuit into the capture, as one bay link ==');
const bad = await main.ask({ type: 'jack.link', link: linkLine(GRAN_IN, CAPTURE) }, 'jack.linked', 5000);
ok('NEGATIVE CONTROL: the granulator\'s input as a source is refused by name, and nothing moves',
  bad && bad.ok === false && bad.problems?.some((p) => /not an audio output/.test(p)), JSON.stringify(bad?.problems));
let lk = null;
if (!SABOTAGE) lk = await main.ask({ type: 'jack.link', link: linkLine(CIRCUIT, CAPTURE) }, 'jack.linked', 8000);
ok('the link is one JACK row, the taken channel into the capture',
  lk?.rows?.length === 1 && lk.rows[0].from === 'circuit:capture_1' && lk.rows[0].to === 'posboard:input_1', JSON.stringify(lk?.rows));
ok('READ BACK: posboard:input_1 is fed by the Circuit and still by both Yoshimi channels',
  ['circuit:capture_1', 'yoshimi:left', 'yoshimi:right'].every((p) => lk?.feeding?.['posboard:input_1']?.includes(p)), JSON.stringify(lk?.feeding));
const on1 = await noteLevel(62);
ok('FAR SIDE: a Circuit note now arrives in the main room', on1.rise > 20, `rise ${on1.rise.toFixed(1)} dB, peak ${db(on1.peak)} dBFS over ${on1.frames} frames`);

console.log('\n== the board\'s own re-patch keeps the link (§5 item 6) ==');
const rb = await main.ask({ type: 'jack.rebuild' }, 'jack.rebuild', 8000);
ok('jack.rebuild moves nothing and reads the chain intact with the link in it', rb?.ok === true && rb.changed === 0, `changed ${rb?.changed}, ${rb?.reason ?? ''}`);
const links1 = await main.ask({ type: 'jack.links' }, 'jack.links', 5000);
ok('jack.links lists the link, intact on the graph', links1?.links?.length === 1 && links1.links[0].intact === true, JSON.stringify(links1?.links?.map((l) => [l.link, l.intact])));

if (PAPPUS) {
  console.log('\n== the Circuit into the granulator ==');
  const fx = await main.ask({ type: 'fx.pappus', on: true }, 'fx.pappus', 90000);
  ok('the granulator is up', fx?.ok && fx.on === true, fx ? `${fx.reason ?? ''} ready ${fx.ready}` : 'no answer in 90 s');
  const gl = await main.ask({ type: 'jack.link', link: linkLine(CIRCUIT, GRAN_IN) }, 'jack.linked', 8000);
  ok('one bay link is two JACK rows, the mono Circuit into both granulator inputs',
    gl?.rows?.map((r) => r.to).join() === 'SuperCollider:in_1,SuperCollider:in_2', JSON.stringify(gl?.rows ?? gl?.problems));
  ok('READ BACK: both granulator inputs are fed by the Circuit, beside Yoshimi',
    gl?.feeding?.['SuperCollider:in_1']?.includes('circuit:capture_1') && gl?.feeding?.['SuperCollider:in_2']?.includes('circuit:capture_1'), JSON.stringify(gl?.feeding));
  // Take the direct Circuit row out, so what arrives is only what came THROUGH the granulator.
  const un = await main.ask({ type: 'jack.unlink', link: linkLine(CIRCUIT, CAPTURE) }, 'jack.unlinked', 8000);
  ok('the direct link comes out again', un?.ok && un.cut?.length === 1, JSON.stringify(un?.cut));
  const g1 = await noteLevel(64);
  ok('FAR SIDE: a Circuit note arrives in the main room through the granulator', g1.rise > 10, `rise ${g1.rise.toFixed(1)} dB, peak ${db(g1.peak)} dBFS`);
  const fxOff = await main.ask({ type: 'fx.pappus', on: false }, 'fx.pappus', 10000);
  const fxOn2 = await main.ask({ type: 'fx.pappus', on: true }, 'fx.pappus', 30000);
  const links2 = await main.ask({ type: 'jack.links' }, 'jack.links', 5000);
  ok('fx.pappus off and on again keep the granulator link, rather than owning it away',
    fxOff?.ok && fxOn2?.ok && links2?.links?.find((l) => l.link === linkLine(CIRCUIT, GRAN_IN))?.intact === true, JSON.stringify(links2?.links?.map((l) => [l.link, l.intact])));
  const ug = await main.ask({ type: 'jack.unlink', link: linkLine(CIRCUIT, GRAN_IN) }, 'jack.unlinked', 8000);
  ok('READ BACK: unlinked, the granulator is fed by Yoshimi only',
    ug?.ok && !ug.feeding?.['SuperCollider:in_1']?.includes('circuit:capture_1') && ug.feeding?.['SuperCollider:in_1']?.includes('yoshimi:left'), JSON.stringify(ug?.feeding));
  const fxEnd = await main.ask({ type: 'fx.pappus', on: false }, 'fx.pappus', 10000);
  ok('and the granulator goes back out of the chain, as it was found', fxEnd?.ok && fxEnd.on === false);
} else {
  console.log('\n== unlinked ==');
  const un = await main.ask({ type: 'jack.unlink', link: linkLine(CIRCUIT, CAPTURE) }, 'jack.unlinked', 8000);
  ok('READ BACK: the Circuit row is cut and both Yoshimi rows stay',
    un?.ok && un.cut?.length === 1 && !un.feeding?.['posboard:input_1']?.includes('circuit:capture_1')
    && ['yoshimi:left', 'yoshimi:right'].every((p) => un.feeding?.['posboard:input_1']?.includes(p)), JSON.stringify(un?.feeding));
}

console.log('\n== a link that repeats the board\'s own chain, unlinked, leaves the room sounding ==');
const yl = await main.ask({ type: 'jack.link', link: linkLine('pi-1:yoshimi:audio-out', CAPTURE) }, 'jack.linked', 8000);
const yu = await main.ask({ type: 'jack.unlink', link: linkLine('pi-1:yoshimi:audio-out', CAPTURE) }, 'jack.unlinked', 8000);
ok('NEGATIVE CONTROL: unlinking it cuts nothing, because the chain still wants both rows',
  yl?.ok && yu?.ok && yu.cut?.length === 0 && yu.kept?.length === 2, `cut ${yu?.cut?.length} kept ${yu?.kept?.length}`);
const off2 = await noteLevel(60);
ok('NEGATIVE CONTROL: with every link gone, a Circuit note is out of the main room again', off2.rise < 10, `rise ${off2.rise.toFixed(1)} dB`);
const after = await main.ask({ type: 'jack.graph' }, 'jack.graph', 5000);
ok('the board\'s own chain is intact afterwards, as it was found', after?.chain?.intact === true, JSON.stringify(after?.chain?.missing));

input.send({ type: 'midi.send', bytes: [0xB0, 123, 0] });
await wait(300);
main.close(); input.close();
console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
