// rig/box/yoshimi-test.mjs — drive a box running Yoshimi and check that its
// patch stepper moves the SOUND.
//
//   node box.mjs --room studio-1          (on the board; it is the service)
//   node yoshimi-test.mjs --room studio-1 (from anywhere)
//
// The claim under test is not "a program change was sent". Yoshimi's answer to
// a program change it cannot satisfy is to carry on playing what it had — no
// error, no silence, nothing on the wire — so a counter of messages sent reads
// identically whether every patch changed or none did. That is how "the patch
// buttons do nothing" survived a green suite: the buttons were sending 0…127
// into banks whose slots are sparse, and landing on an empty one looks exactly
// like landing on a full one from the sending end.
//
// So this checks by ear: the same note under two
// instruments from two different banks, and a measurement that separates them.
//
// ⚠️ AND IT INCLUDES THE NEGATIVE CONTROL, because a difference test that
// cannot fail is not a test. Step from a real patch onto an EMPTY SLOT in the
// same bank — the old behaviour — and the same measurement must come back
// SAME. If that ever reads as "different", the measurement is picking up drift
// rather than the instrument and every other line here is worthless.
import { format, parse, randomId, RELAY_BASE } from '../../demo/shell/wire.mjs';
import { measure, distance } from './measure.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const ROOM = arg('room', 'studio-1');
const FROM = `yt-${randomId(6)}`;
let seq = 0, pass = 0, fail = 0;
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${n}${d ? `  ${d}` : ''}`); };

const RELAY = arg('relay', RELAY_BASE);
const ws = new WebSocket(`${RELAY}/room/${ROOM}/ws`);
ws.binaryType = 'arraybuffer';
// The id comes back in `re`, and matching on it is the only way to be sure a
// reply is an answer to THIS question — this room is the live one, anyone can
// be in it, and a failure reply carries none of the fields a content match
// would key on. Waiting on `type` alone read another client's answer once and
// then waited ninety seconds for one that had already arrived.
const send = (m) => { const id = randomId(); ws.send(format(m, { from: FROM, seq: seq++, id, by: 'tool' })); return id; };
const answer = (id, type, ms = 8000) => reply(type, ms, (r) => r.re === id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let frames = [], replies = [], lastSeq = -1, gaps = 0, allFrames = 0, firstAt = 0;
ws.onmessage = (e) => {
  if (typeof e.data !== 'string') {
    const s = new DataView(e.data).getUint32(0, true);
    // The box restarts its sequence when the source changes, so a step BACK is
    // a new instrument rather than a loss.
    if (lastSeq >= 0 && s > lastSeq + 1) gaps += s - lastSeq - 1;
    lastSeq = s;
    if (!firstAt) firstAt = performance.now();
    allFrames++;
    frames.push(new Int16Array(e.data.slice(12)));
    return;
  }
  const { kind, msg } = parse(e.data);
  if (kind === 'json' && msg.from !== FROM) replies.push(msg);
};
const reply = (t, ms = 8000, pick = () => true) => new Promise((res, rej) => {
  const t0 = Date.now();
  const iv = setInterval(() => {
    const m = replies.find((r) => r.type === t && pick(r));
    if (m) { clearInterval(iv); res(m); } else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error(`no ${t} in ${ms} ms — is a box in "${ROOM}"?`)); }
  }, 25);
});

// Calibrated against the repeat of the SAME patch in this same run, which is
// printed, so a reader can see the floor the thresholds sit above.
const DIFFERENT = { env: 0.25, oct: 0.60 };
const differs = (d) => d.env >= DIFFERENT.env && d.oct >= DIFFERENT.oct;
const show = (d) => `envelope ${d.env.toFixed(3)} · brightness ${d.oct.toFixed(2)} octaves`;

async function play(where, { hold = 1800, settle = 1300 } = {}) {
  send({ type: 'voice.select', channel: 0, bank: where.bank, program: where.program });
  await wait(700);                 // an .xiz is read off an SD card and parsed
  frames = [];
  send({ type: 'note.on', channel: 0, note: 60, vel: 110 });
  await wait(hold);
  const m = measure(frames);
  send({ type: 'note.off', channel: 0, note: 60 });
  send({ type: 'note.panic' });
  await wait(settle);              // a pad's tail outlives the note by a second
  return m;
}
const line = (label, m) => console.log(`      ${label.padEnd(30)} peak ${m.peak.toFixed(4)} · tail/peak ${m.ratio.toFixed(3)} · centroid ${m.centroid.toFixed(0)} Hz`);

ws.onopen = async () => {
  try {
    console.log(`room ${ROOM}\n`);
    console.log('the box answers');
    ok('box.ping -> box.pong', !!(await answer(send({ type: 'box.ping' }), 'box.pong')));

    console.log('\nyoshimi starts');
    // From a known state. An instrument already running answers
    // `{already:true}` with none of the numbers below in it, and the frame-rate
    // check at the end wants the whole run to be one source from the start.
    await answer(send({ type: 'audio.stop' }), 'audio.stopped', 15000);
    await wait(1200);
    replies = []; frames = []; allFrames = 0; firstAt = 0; lastSeq = -1; gaps = 0;
    const st = await answer(send({ type: 'audio.start', source: 'yoshimi' }), 'audio.started', 90000);
    ok('yoshimi started', st.ok === true, st.reason ?? st.port);
    if (!st.ok) { console.log('\nstopping — no instrument'); process.exit(1); }
    ok('one source, 50 frames a second', st.msgPerSec === 50);

    // The granular insert would put its own ring buffer and reverb tail on
    // BOTH arms of the comparison. Switch it off so what is measured is the
    // instrument.
    const fx = await answer(send({ type: 'fx.pappus', on: false }), 'fx.pappus', 20000);
    ok('the granular insert is out of the way', fx.on === false);

    console.log('\nthe box says what it has');
    const list = await answer(send({ type: 'voices.list', source: 'yoshimi' }), 'voices.listed', 20000);
    const flat = [];
    for (const b of list.banks ?? []) for (const p of b.patches) flat.push({ bank: b.bank, bankName: b.name, program: p.program, name: p.name });
    ok('it read yoshimi\'s own bank map', list.ok === true, `${list.file}`);
    ok('more than one bank', list.bankCount > 1, `${list.count} patches in ${list.bankCount} banks, root ${list.root}`);
    // The shape of the thing that was got wrong: banks are NOT 0,1,2… and
    // slots are NOT a run. A list that looked like either would mean the box
    // had invented one rather than read Yoshimi's.
    ok('bank numbers are yoshimi\'s, not a range', list.banks.every((b, i) => b.bank !== i),
      `first four: ${list.banks.slice(0, 4).map((b) => b.bank).join(', ')}`);
    ok('slots inside a bank are sparse', list.banks.some((b) => b.patches.at(-1).program > b.patches.length),
      list.banks.filter((b) => b.patches.at(-1).program > b.patches.length).length + ' of ' + list.bankCount + ' banks');
    ok('nothing offered is past a program change\'s reach', flat.every((p) => p.program >= 0 && p.program <= 127));
    ok('no patch is offered twice', new Set(flat.map((p) => `${p.bank}/${p.program}`)).size === flat.length);
    ok('every patch has a real name', flat.every((p) => typeof p.name === 'string' && p.name.length > 0 && !/^program \d+$/.test(p.name)));
    ok('bank select is CC 32, read from yoshimi', list.bankCC === 32);
    ok('the bank map agrees with the files on the board', list.stale === false);

    // Two instruments that ought to sound nothing like each other, chosen from
    // the list rather than typed: a struck electric piano and a held organ.
    const pick = (bankName) => flat.find((p) => p.bankName === bankName);
    const A = pick('Rhodes') ?? flat[0];
    const B = pick('Organ') ?? flat.at(-1);
    ok('both instruments are in the list', !!A && !!B && A.bank !== B.bank,
      `${A.bankName}/${A.name} (bank ${A.bank} program ${A.program})  vs  ${B.bankName}/${B.name} (bank ${B.bank} program ${B.program})`);

    console.log('\nsilence first');
    // The frame-rate window starts HERE, not at the first frame. A capture
    // delivers its first second in a burst — 128 frames in the first second,
    // measured — and counting that in makes a clean single source read as 56/s,
    // which is most of the way to the 100/s that means two instruments are
    // streaming at once. A cell that cannot be read is not a fault detector.
    allFrames = 0; firstAt = 0;
    frames = [];
    await wait(700);
    const quiet = measure(frames);
    ok('frames arrive before any note', quiet.n > 20, `${quiet.n} in 700 ms`);
    ok('and they are silent', quiet.peak < 0.002, `peak ${quiet.peak.toExponential(1)}`);

    console.log('\nthe same note under two patches in two banks');
    const a1 = await play(A);  line(`${A.bankName} / ${A.name}`, a1);
    const a2 = await play(A);  line(`${A.bankName} / ${A.name} (again)`, a2);
    const b1 = await play(B);  line(`${B.bankName} / ${B.name}`, b1);
    ok('both patches sound', a1.peak > 0.008 && b1.peak > 0.008, `${a1.peak.toFixed(4)} and ${b1.peak.toFixed(4)}`);
    const floor = distance(a1, a2);
    console.log(`      the same patch twice:   ${show(floor)}   <- the floor`);
    const moved = distance(a1, b1);
    console.log(`      the two patches:        ${show(moved)}`);
    ok('the same patch twice reads as the same patch', !differs(floor), show(floor));
    ok('two patches in two banks sound DIFFERENT', differs(moved), show(moved));

    // ── the negative control ────────────────────────────────────────────────
    // The old stepper walked 0…127 inside one bank, so most presses landed
    // here. Yoshimi keeps playing what it had, which is the point: the check
    // above must come back SAME, and it does, or it could never have failed.
    console.log('\nthe negative control: stepping onto an empty slot, as the old stepper did');
    const bankA = list.banks.find((b) => b.bank === A.bank);
    const have = new Set(bankA.patches.map((p) => p.program));
    const emptyProgram = Array.from({ length: 128 }, (_, i) => i).find((i) => i > A.program && i < bankA.patches.at(-1).program && !have.has(i));
    ok('the enumerated list does not offer the empty slot', emptyProgram !== undefined && !have.has(emptyProgram),
      `bank ${A.bank} slot ${emptyProgram + 1} is a hole between ${A.program + 1} and ${bankA.patches.at(-1).program + 1}`);
    const a3 = await play(A);
    const gapTake = await play({ bank: A.bank, program: emptyProgram });
    line(`${A.bankName} / ${A.name}`, a3);
    line(`program ${emptyProgram} — nothing there`, gapTake);
    const nothing = distance(a3, gapTake);
    console.log(`      after the empty slot:   ${show(nothing)}`);
    ok('an empty slot changes NOTHING, so the check above can fail', !differs(nothing), show(nothing));
    ok('and it is quiet enough to have been a silence, but is not', gapTake.peak > 0.008,
      `peak ${gapTake.peak.toFixed(4)} — the previous patch is still sounding`);

    console.log('\nthe stream');
    const rate = allFrames / Math.max(0.001, (performance.now() - firstAt) / 1000);
    // 50/s is one clean source. Anything above it is two instruments streaming
    // into one socket, which is what the garbled stream sounded like.
    ok('about 50 frames a second — one source, not two', Math.abs(rate - 50) < 6, `${rate.toFixed(1)}/s over ${allFrames} frames`);
    // A CEILING, NOT ZERO — and the count is printed either way. This run
    // streams for about eighty seconds over the open internet, where live-test
    // streams for three, and one run lost 5 frames of 995 to the link. The
    // fault this cell exists to catch is the relay's 60 msg/s cap biting
    // because TWO instruments are streaming at 50/s each, which drops on the
    // order of 40% — two orders of magnitude above this line.
    ok('almost nothing was dropped', gaps < allFrames * 0.01, `${gaps} of ${allFrames} frames, ${(100 * gaps / Math.max(1, allFrames)).toFixed(2)}%`);

    send({ type: 'note.panic' });
    const sp = await answer(send({ type: 'audio.stop' }), 'audio.stopped');
    ok('stops cleanly', sp.ok === true, `was ${sp.was}`);

    console.log(`\n${pass}/${pass + fail} green`);
    process.exit(fail ? 1 : 0);
  } catch (e) { console.error('\n' + e.message); process.exit(1); }
};
