// rig/box/fluid-test.mjs — drive a box running the FluidSynth instrument.
//
//   docker run ... node box.mjs --room fluid-test     (arm64 Linux)
//   node fluid-test.mjs --room fluid-test             (from anywhere)
//
// The assertion that matters is not "audio arrived" but "the instrument
// CHANGED when we asked it to" — a multitimbral claim that never checks two
// voices sound different is a claim about a config file, not about sound.
import { format, parse, randomId, RELAY_BASE } from '../../demo/shell/wire.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const ROOM = arg('room', 'fluid-test');
const FROM = `ft-${randomId(6)}`;
let seq = 0, pass = 0, fail = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${n}${d ? `  ${d}` : ''}`); };

const ws = new WebSocket(`${RELAY_BASE}/room/${ROOM}/ws`);
ws.binaryType = 'arraybuffer';
const send = (m) => ws.send(format(m, { from: FROM, seq: seq++ }));

let frames = [], replies = [], lastSeq = -1, gaps = 0;
ws.onmessage = (e) => {
  if (typeof e.data !== 'string') {
    const s = new DataView(e.data).getUint32(0, true);
    if (lastSeq >= 0 && s !== lastSeq + 1) gaps += s - lastSeq - 1;
    lastSeq = s;
    const pcm = new Int16Array(e.data, 12);
    let sum = 0; for (let i = 0; i < pcm.length; i++) sum += pcm[i] * pcm[i];
    frames.push({ rms: Math.sqrt(sum / pcm.length) / 32768, at: performance.now() });
    return;
  }
  const { kind, msg } = parse(e.data);
  if (kind === 'json' && msg.from !== FROM) replies.push(msg);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reply = (t, ms = 6000) => new Promise((res, rej) => {
  const t0 = Date.now();
  const iv = setInterval(() => {
    const m = replies.find((r) => r.type === t);
    if (m) { clearInterval(iv); res(m); } else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error(`no ${t} in ${ms}ms`)); }
  }, 25);
});
// The shape of a note over time, which is what tells two instruments apart.
const envelope = async (setup, ms = 1600) => {
  frames = []; await setup(); await wait(ms);
  const f = frames.slice();
  const peak = Math.max(...f.map((x) => x.rms), 0);
  const tail = f.slice(-6).reduce((a, x) => a + x.rms, 0) / 6;
  return { peak, tail, ratio: peak > 0 ? tail / peak : 0, n: f.length };
};

ws.onopen = async () => {
  try {
    console.log(`room ${ROOM}\n`);
    send({ type: 'box.ping' }); await reply('box.pong');
    const hello = replies.find((r) => r.type === 'box.hello');
    ok('the box is there', true, hello ? `instruments: ${JSON.stringify(hello.instruments)}` : '');

    console.log('\nthe instrument starts');
    send({ type: 'audio.start', source: 'fluidsynth' });
    const st = await reply('audio.started');
    ok('fluidsynth started', st.ok === true, st.reason ?? `${st.soundfont}`);
    if (!st.ok) { console.log('\nstopping — no instrument'); process.exit(1); }
    ok('sixteen channels', st.channels === 16);
    ok('named voices are offered', Array.isArray(st.voices) && st.voices.includes('flute'), `${st.voices?.length} names`);

    frames = []; await wait(600);
    const quiet = frames.reduce((a, f) => a + f.rms, 0) / Math.max(1, frames.length);
    ok('silent before a note', quiet < 0.002, `rms ${quiet.toExponential(1)}`);
    ok('but frames are flowing', frames.length > 18, `${frames.length} in 600 ms`);

    console.log('\nsix parts at once — the multitimbral claim');
    const parts = [['piano', 0, 60], ['bass', 1, 36], ['strings', 2, 67], ['rhodes', 3, 72], ['flute', 4, 76], ['vibes', 5, 79]];
    for (const [voice, ch] of parts) { send({ type: 'voice.select', channel: ch, voice }); }
    const sel = await reply('voice.selected');
    ok('a voice can be chosen by name', sel.ok === true, `${sel.voice} -> program ${sel.program}`);
    const chord = await envelope(async () => { for (const [, ch, note] of parts) send({ type: 'note.on', channel: ch, note, vel: 100 }); }, 1800);
    ok('six parts make sound', chord.peak > 0.02, `peak ${chord.peak.toFixed(4)}`);
    send({ type: 'note.panic' }); await wait(500);

    console.log('\ndoes changing the voice change the SOUND?');
    // Piano decays, flute sustains. If voice.select were ignored these would be
    // the same envelope, and "multitimbral" would be a claim about a config file.
    replies = [];
    send({ type: 'voice.select', channel: 0, voice: 'piano' }); await wait(200);
    const piano = await envelope(async () => send({ type: 'note.on', channel: 0, note: 64, vel: 110 }));
    send({ type: 'note.panic' }); await wait(500);
    send({ type: 'voice.select', channel: 0, voice: 'flute' }); await wait(200);
    const flute = await envelope(async () => send({ type: 'note.on', channel: 0, note: 64, vel: 110 }));
    console.log(`      piano tail/peak ${piano.ratio.toFixed(3)}   flute tail/peak ${flute.ratio.toFixed(3)}`);
    ok('both voices sound', piano.peak > 0.01 && flute.peak > 0.01);
    ok('the piano decays', piano.ratio < 0.6, `tail is ${(piano.ratio * 100).toFixed(0)}% of peak`);
    ok('the flute sustains', flute.ratio > piano.ratio * 1.4, `${(flute.ratio * 100).toFixed(0)}% vs ${(piano.ratio * 100).toFixed(0)}%`);

    console.log('\nthe stream');
    ok('nothing was dropped', gaps === 0, `${gaps} gaps`);
    send({ type: 'note.panic' });
    send({ type: 'audio.stop' });
    const sp = await reply('audio.stopped');
    ok('stops cleanly', sp.ok === true, `was ${sp.was}`);

    console.log(`\n${pass}/${pass + fail} green`);
    process.exit(fail ? 1 : 0);
  } catch (e) { console.error('\n' + e.message); process.exit(1); }
};
