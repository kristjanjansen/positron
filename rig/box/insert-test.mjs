// rig/box/insert-test.mjs — two pages, one Raspberry Pi, and the granulator
// they were fighting over.
//
// 🔴 WHY THIS FILE EXISTS AT ALL. `/box/` sends `fx.pappus {on:false}` on load
// and `/grains/` sends `{on:true}`, so whichever page you opened last won —
// SILENTLY — and the other went on drawing a picture that was no longer true.
// Both halves of the repair (the board REPORTING who holds the insert, and
// `onlyIfIdle` refusing to remove one somebody is still looking at) live on the
// board, and the board is the only end that can be graded: `/box/` is
// `rig/box/listen.html`, it is `built: false`, it publishes no `__demo` and
// `demo/verify.mjs` cannot see it. A guard nothing can grade is a guard that
// will rot, so the guard was put where a harness can reach it and this is the
// harness.
//
//   node rig/box/insert-test.mjs --room studio-1
//
// ⚠️ IT TOUCHES A SHARED INSTRUMENT and it says so: it switches the insert on
// and off a few times and puts it back the way it found it. It needs an
// instrument on the JACK graph, which `fx.pappus` refuses without — so it
// starts one if nothing is playing and reports what it did.
//
// ⚠️ TWO IDENTITIES, NOT TWO SOCKETS OF CONVENIENCE. The whole mechanism turns
// on `from` being per-connection, so the test opens TWO connections: one that
// pretends to be `/grains/` (asks for the insert and keeps talking) and one
// that pretends to be `/box/` (asks for it to go away on load). A single socket
// sending both requests would pass vacuously, because a client is never held
// off by its own claim.
import { format, parse, randomId, RELAY_BASE } from '../../demo/shell/wire.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const ROOM = arg('room', 'studio-1');
const RELAY = arg('relay', RELAY_BASE);
// 📄 `INSERT_HELD_MS` in box.mjs. Read from there in words rather than shared as
// a constant, because this process cannot import the board's copy — so the test
// waits a margin past it and SAYS the number, which is how a disagreement shows
// up as a failure rather than as flake.
const HELD_MS = 15000;

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
  let seq = 0;
  const seen = [];
  ws.onmessage = (e) => {
    if (typeof e.data !== 'string') return;
    const { kind, msg } = parse(e.data);
    if (kind === 'json' && msg.from !== from) seen.push(msg);
  };
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error(`could not reach ${RELAY}`));
    setTimeout(() => rej(new Error('the relay did not open in 8 s')), 8000);
  });
  const send = (m) => { const line = format(m, { from, seq: seq++ }); ws.send(line); return JSON.parse(line).id; };
  /**
   * Ask, and wait for the answer to THIS question.
   *
   * ⚠️ MATCHED ON `re`, NEVER ON TYPE ALONE. The relay broadcasts, so a reply
   * to somebody else's `fx.pappus` — or their QUESTION, which carries the same
   * type — arrives here too. `grains` learned this the expensive way and
   * reported "10 nudges in 1 s" about a board that had moved 2,800 times.
   */
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
  return { from, send, ask, seen, close: () => ws.close() };
}

console.log(`\n== the insert, and who holds it — room "${ROOM}" ==`);

const grainsTab = await client('as-grains');
const boxTab = await client('as-box');

// ── something for the insert to wrap ──────────────────────────────────────
// ⚠️ `fx.pappus` REFUSES WITH NOTHING ON THE JACK GRAPH, so a test that skipped
// this would measure a refusal for the wrong reason and call it arbitration.
let status = await grainsTab.ask({ type: 'audio.status' }, 'audio.started', 10000);
if (!status) { console.log('  no board answered in this room — nothing to test'); process.exit(1); }
const wasPlaying = status.ok ? status.source : null;
const wasInsert = status.fx === 'pappus';
console.log(`  the board was playing ${wasPlaying ?? 'nothing'}, insert ${wasInsert ? 'in' : 'out'}`);
if (!status.ok || !status.jack) {
  console.log('  starting yoshimi, because the insert can only wrap what is on the JACK graph');
  status = await grainsTab.ask({ type: 'audio.start', source: 'yoshimi' }, 'audio.started', 90000);
  if (!status?.ok) { console.log(`  could not start an instrument: ${status?.reason}`); process.exit(1); }
}

// ── 1. the board says who asked ───────────────────────────────────────────
const on = await grainsTab.ask({ type: 'fx.pappus', on: true }, 'fx.pappus');
ok('the insert goes in when a page asks', on?.ok === true && on?.on === true, on?.reason ?? '');
ok('and the board says WHO asked for it, which nothing could see before',
  on?.fxBy === grainsTab.from && on?.fx === 'pappus',
  `${on?.fxBy} ${on?.fxAgoSec} s ago, held=${on?.fxHeld}`);

// ── 2. the heartbeat carries it, so a page learns without asking ──────────
// 🔴 THE WHOLE REPORTING HALF TURNS ON THIS. A page that has to ASK finds out
// when it next polls; a page that is told finds out in five seconds, and the
// page that needs telling is the one that did NOT make the change.
{
  boxTab.seen.length = 0;
  const until = Date.now() + 12000;
  let beat = null;
  while (Date.now() < until && !beat) {
    beat = boxTab.seen.find((m) => m.type === 'box.alive');
    if (!beat) await sleep(200);
  }
  ok('the five-second heartbeat carries the insert and its holder',
    beat?.fx === 'pappus' && beat?.fxBy === grainsTab.from,
    beat ? `box.alive fx=${beat.fx} fxBy=${beat.fxBy} fxHeld=${beat.fxHeld}` : 'no heartbeat in 12 s');
}

// ── 3. the stomp, refused OUT LOUD, while the holder is still talking ─────
{
  // A live tab keeps talking. This is the evidence the board actually has —
  // no lease, nothing to release, and a closed tab is simply silent.
  grainsTab.send({ type: 'params.state' });
  await sleep(300);
  const kept = await boxTab.ask({ type: 'fx.pappus', on: false, onlyIfIdle: true }, 'fx.pappus', 30000);
  ok('another page loading does not take the insert away from a page that is still there',
    kept?.kept === true && kept?.on === true && kept?.fx === 'pappus',
    kept?.reason ?? 'no reply');
  // 🔴 AND IT SAYS SO, WHICH IS THE POINT. An arbitration nobody can see turns
  // a visible problem into an invisible one — the refusal has to name the
  // holder and the ages or the second page is now the one showing a stale
  // picture.
  ok('the refusal names the holder, rather than silently doing nothing',
    typeof kept?.reason === 'string' && kept.reason.includes('another page')
      && kept?.fxBy === grainsTab.from,
    kept?.reason ?? '');
}

// ── 4. the negative control: the old behaviour is still one message away ───
// 🔴 WITHOUT THIS, #3 PASSES ON A BOARD THAT SIMPLY STOPPED SWITCHING THINGS
// OFF. `onlyIfIdle` is opt-in, so a caller that does not send it must still be
// obeyed — that is what keeps `fx.pappus {on:false}` a thing a person can type
// at a wedged board.
{
  const gone = await boxTab.ask({ type: 'fx.pappus', on: false }, 'fx.pappus', 90000);
  ok('a plain switch-off is still obeyed, holder or no holder',
    gone?.ok === true && gone?.on === false && gone?.kept !== true && gone?.fx === null,
    `on=${gone?.on} kept=${gone?.kept ?? false} fxBy=${gone?.fxBy}`);
}

// ── 5. and a holder that went away cannot hold anything ───────────────────
// 🔴 THIS IS THE FAULT `/box/`'s SWITCH-OFF WAS WRITTEN FOR, AND IT MUST STILL
// BE FIXED. An insert left in by a `grains` tab that was CLOSED wraps whatever
// `/box/` plays and feeds its own delay — measured at a steady -6.1 dBFS
// subsonic drone. So: claim it, stop talking for longer than the board's
// window, and check that the claim has expired on its own with nothing
// released and nothing to leak.
{
  const mine = await grainsTab.ask({ type: 'fx.pappus', on: true }, 'fx.pappus');
  ok('the insert goes back in for the second half of the test', mine?.on === true, mine?.reason ?? '');
  console.log(`  … going quiet for ${(HELD_MS + 4000) / 1000} s, which is what a closed tab looks like from the board`);
  await sleep(HELD_MS + 4000);
  const swept = await boxTab.ask({ type: 'fx.pappus', on: false, onlyIfIdle: true }, 'fx.pappus', 90000);
  ok('a holder that stopped talking holds nothing — no lease, nothing to release',
    swept?.on === false && swept?.kept !== true,
    `on=${swept?.on} kept=${swept?.kept ?? false} · the board's window is ${HELD_MS / 1000} s`);
}

// ── put it back the way it was found ──────────────────────────────────────
if (wasInsert) {
  const back = await grainsTab.ask({ type: 'fx.pappus', on: true }, 'fx.pappus');
  console.log(`  put the insert back: ${back?.on === true ? 'in' : `FAILED — ${back?.reason}`}`);
}
grainsTab.close(); boxTab.close();

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
