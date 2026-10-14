// node rig/board/insert-test.mjs --room studio-1 --instrument <JACK instrument>
// The board drops an insert a closed tab left and keeps a live page's; two connections, one polling
// like /grains/, one watching. Refuses by default (exit 2): no JACK instrument to wrap.
// why: lessons/rig-board-tests.md#it-header
import { format, parse, randomId, RELAY_BASE } from '../../demo/shell/wire.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const ROOM = arg('room', 'studio-1');
const RELAY = arg('relay', RELAY_BASE);
const INSTRUMENT = arg('instrument', null);
if (!INSTRUMENT) {
  console.log('\nREFUSED: the insert wraps only a JACK instrument (board.mjs `inst.jack`), and this board has none');
  console.log('since Yoshimi left on 2026-10-13 (archive/yoshimi/README.md). The sampler and the Circuit are on JACK');
  console.log('but are not the instrument slot, so fx.pappus would refuse every case here for the wrong reason.');
  console.log('Name one with --instrument <source> on a board that has it. Nothing was sent to the board.\n');
  process.exit(2);
}
// board.mjs's INSERT_HELD_MS, restated: this process cannot import it, so it waits past it and says
// so.
// why: lessons/rig-board-tests.md#held-ms
const HELD_MS = 15000;
// The board's heartbeat, which is where every page learns about a change it did
// not make. Two of them past the window is the deadline used below.
const BEAT_MS = 5000;

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** One client of the board, with its own `from`, exactly like a tab. */
async function client(label) {
  const from = `${label}-${randomId(6)}`;
  const ws = new WebSocket(`${RELAY}/room/${ROOM}/ws`);
  ws.binaryType = 'arraybuffer';
  let seq = 0, sent = 0;
  const seen = [];
  ws.onmessage = (e) => {
    if (typeof e.data !== 'string') return;
    const { kind, msg } = parse(e.data);
    if (kind === 'json' && msg.from !== from) seen.push({ ...msg, seenAt: Date.now() });
  };
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error(`could not reach ${RELAY}`));
    setTimeout(() => rej(new Error('the relay did not open in 8 s')), 8000);
  });
  const send = (m) => { const line = format(m, { from, seq: seq++, by: 'tool' }); ws.send(line); sent++; return JSON.parse(line).id; };
  // Wait for the answer to this question, matched on `re`: the relay broadcasts other replies too.
  // why: lessons/rig-board-tests.md#ask
  const ask = async (m, type, ms = 90000) => {
    const id = send(m);
    const until = Date.now() + ms;
    while (Date.now() < until) {
      const hit = seen.find((x) => x.type === type && x.re === id);
      if (hit) return hit;
      await sleep(100);
    }
    return null;
  };
  /** Wait for an UNPROMPTED heartbeat that satisfies `want`, asking nothing. */
  const beat = async (want, ms) => {
    const from_ = seen.length;
    const until = Date.now() + ms;
    while (Date.now() < until) {
      const hit = seen.slice(from_).find((x) => x.type === 'board.alive' && want(x));
      if (hit) return hit;
      await sleep(200);
    }
    return null;
  };
  return { from, send, ask, beat, seen, sentCount: () => sent, close: () => ws.close() };
}

console.log(`\n== the insert, and the board taking it out by itself · room "${ROOM}" ==`);

let grainsTab = await client('as-grains');
// Connected and silent all run: what a page that never mentions the granulator looks like.
// why: lessons/rig-board-tests.md#board-tab
const boardTab = await client('as-board');

// Something for the insert to wrap: fx.pappus refuses with nothing on the JACK graph.
// why: lessons/rig-board-tests.md#something
let status = await grainsTab.ask({ type: 'audio.status' }, 'audio.started', 10000);
if (!status) { console.log('  no board answered in this room — nothing to test'); process.exit(1); }
const wasPlaying = status.ok ? status.source : null;
const wasInsert = status.fx === 'pappus';
console.log(`  the board was playing ${wasPlaying ?? 'nothing'}, insert ${wasInsert ? 'in' : 'out'}`);
if (!status.ok || !status.jack) {
  console.log(`  starting ${INSTRUMENT}, because the insert can only wrap a JACK instrument`);
  status = await grainsTab.ask({ type: 'audio.start', source: INSTRUMENT }, 'audio.started', 90000);
  if (!status?.ok) { console.log(`  could not start an instrument: ${status?.reason}`); process.exit(1); }
}

// ── 1. the board says who asked ───────────────────────────────────────────
const on = await grainsTab.ask({ type: 'fx.pappus', on: true }, 'fx.pappus');
ok('the insert goes in when a page asks', on?.ok === true && on?.on === true, on?.reason ?? '');
ok('and the board says WHO asked for it, which nothing could see before',
  on?.fxBy === grainsTab.from && on?.fx === 'pappus',
  `${on?.fxBy} ${on?.fxAgoSec} s ago, held=${on?.fxHeld}`);

// 2. The heartbeat carries the insert, so a page that did not make a change learns of it in 5 s.
// why: lessons/rig-board-tests.md#case-2
{
  const b = await boardTab.beat((m) => m.fx !== undefined, 12000);
  ok('the five-second heartbeat carries the insert and its holder',
    b?.fx === 'pappus' && b?.fxBy === grainsTab.from,
    b ? `board.alive fx=${b.fx} fxBy=${b.fxBy} fxHeld=${b.fxHeld}` : 'no heartbeat in 12 s');
}

// 3. Negative control: a live page keeps its insert, polling params.state every 4 s like /grains/;
// a board that dropped it on a plain 15 s timer fails here.
// why: lessons/rig-board-tests.md#case-3
{
  const until = Date.now() + HELD_MS + 2 * BEAT_MS;
  console.log(`  … holding the insert for ${Math.round((HELD_MS + 2 * BEAT_MS) / 1000)} s while the grains half polls every 4 s, which is what an open tab looks like`);
  const beforeSent = boardTab.sentCount();
  boardTab.seen.length = 0;
  while (Date.now() < until) {
    grainsTab.send({ type: 'params.state' });
    await sleep(4000);
  }
  const beats = boardTab.seen.filter((m) => m.type === 'board.alive');
  const dropped = beats.filter((m) => m.fx !== 'pappus');
  ok('a page that is open and quiet KEEPS its insert past the board\'s window',
    beats.length >= 3 && dropped.length === 0,
    `${beats.length} heartbeats over ${Math.round((HELD_MS + 2 * BEAT_MS) / 1000)} s, ${dropped.length} of them without the insert · the board's window is ${HELD_MS / 1000} s`);
  // 4. A second page arriving changes nothing; this half must send nothing.
  // why: lessons/rig-board-tests.md#case-4
  ok('the board half sent nothing at all, so what held the insert was the grains half being alive',
    boardTab.sentCount() === beforeSent,
    `${boardTab.sentCount() - beforeSent} messages from the board half`);
}

// 5. The drop: the grains socket closes (the relay says nothing), and the board takes the insert
// out
// unprompted, announced on board.alive.
// why: lessons/rig-board-tests.md#case-5
{
  const closedAt = Date.now();
  grainsTab.close();
  console.log(`  … the grains half is gone. the board has ${HELD_MS / 1000} s of window plus a ${BEAT_MS / 1000} s heartbeat to notice`);
  boardTab.seen.length = 0;
  const gone = await boardTab.beat((m) => m.fx === null, HELD_MS + 4 * BEAT_MS);
  const tookSec = gone ? Math.round((gone.seenAt - closedAt) / 1000) : null;
  ok('a closed tab does not keep the insert: the board takes it out with nobody asking',
    gone !== null,
    gone ? `announced ${tookSec} s after the socket closed, against a ${HELD_MS / 1000} s window`
         : `no heartbeat said fx=null within ${(HELD_MS + 4 * BEAT_MS) / 1000} s`);
  ok('and it is not still recorded as held by somebody',
    gone?.fxBy === null && gone?.fxHeld === false,
    gone ? `fxBy=${gone.fxBy} fxHeld=${gone.fxHeld}` : 'nothing to read');
}

// 6. A new instrument comes up with no insert on it (the property, not the race with the
// heartbeat).
// why: lessons/rig-board-tests.md#case-6
{
  const started = await boardTab.ask({ type: 'audio.start', source: INSTRUMENT }, 'audio.started', 120000);
  ok('an instrument started afterwards comes up with no insert on it',
    started?.ok === true && started?.fx === null,
    `source=${started?.source} fx=${started?.fx} fxBy=${started?.fxBy}`);
}

// 7. Negative control the other way: a fresh claim still works and a plain switch-off is obeyed.
// why: lessons/rig-board-tests.md#case-7
{
  grainsTab = await client('as-grains');
  const back = await grainsTab.ask({ type: 'fx.pappus', on: true }, 'fx.pappus');
  ok('a fresh page can still put the insert in, so nothing above passed by it being broken',
    back?.ok === true && back?.on === true && back?.fxBy === grainsTab.from, back?.reason ?? '');
  const off = await grainsTab.ask({ type: 'fx.pappus', on: false }, 'fx.pappus', 90000);
  ok('a plain switch-off is still obeyed',
    off?.ok === true && off?.on === false && off?.fx === null,
    `on=${off?.on} fx=${off?.fx}`);
}

// ── put it back the way it was found ──────────────────────────────────────
if (wasInsert) {
  const back = await grainsTab.ask({ type: 'fx.pappus', on: true }, 'fx.pappus');
  console.log(`  put the insert back: ${back?.on === true ? 'in' : `FAILED — ${back?.reason}`}`);
  // The board drops it again after this process exits: that is case 5, not a bug.
  // why: lessons/rig-board-tests.md#exit-note
  console.log(`  ⚠ the board will drop it again about ${HELD_MS / 1000} s after this process exits, which is the rule working`);
}
grainsTab.close(); boardTab.close();

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
