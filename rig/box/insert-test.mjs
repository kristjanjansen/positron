// rig/box/insert-test.mjs: the granulator a closed tab leaves behind, and the
// board taking it out by itself.
//
// 🔴 WHY THIS FILE EXISTS AT ALL. An insert left in by a `/grains/` tab that
// was simply CLOSED goes on wrapping whatever the next page plays and feeds its
// own delay: MEASURED 2026-09-12, a steady -6.1 dBFS subsonic drone while
// `box.alive` reported `voices: 0`, true about notes and false about sound.
// Until 2026-09-16 the thing that cleared it was `/box/` sending `fx.pappus
// {on:false, onlyIfIdle:true}` on load. That message is gone, with the last of
// the granulator on that page, so THE BOARD CLEANS UP AFTER ITSELF now. A
// guarantee that used to depend on somebody opening a second page was never a
// guarantee, because nobody had to open one.
//
// The guard lives on the board and the board is the only end that can be
// graded: `/box/` is `rig/box/listen.html`, it is `built: false`, it publishes
// no `__demo` and `demo/verify.mjs` cannot see it. A guard nothing can grade is
// a guard that will rot, so this is the harness.
//
//   node rig/box/insert-test.mjs --room studio-1
//
// ⚠️ IT TOUCHES A SHARED INSTRUMENT and it says so: it switches the insert on
// and off a few times and puts it back the way it found it. It needs an
// instrument on the JACK graph, which `fx.pappus` refuses without — so it
// starts one if nothing is playing and reports what it did.
//
// ⚠️ TWO IDENTITIES, NOT TWO SOCKETS OF CONVENIENCE. The whole mechanism turns
// on `from` being per-connection: the board dates every client by when it last
// sent ANY message, and "the tab was closed" is visible to it only as "that
// `from` stopped talking". So the test opens TWO connections. One pretends to
// be `/grains/` (asks for the insert and keeps polling, exactly as that page
// does) and one pretends to be `/box/` (which now sends nothing at all and only
// watches). One socket doing both would pass vacuously, because a client is
// never held off by its own claim.
//
// ── WHAT THIS PROVES, AND WHAT WOULD MAKE IT FAIL ───────────────────────────
//
//   1  the insert goes in when a page asks, and the board names the holder
//   2  the five-second heartbeat carries it, so a page learns without asking
//   3  NEGATIVE CONTROL: a live page KEEPS its insert past the board's window.
//      A board that swept on a plain timer fails here, and it is the only case
//      that can tell "cleans up after itself" from "drops it after 15 s".
//   4  and a second page merely ARRIVING changes nothing. `/box/` used to send
//      a message here; it sends none, and the insert must survive that.
//   5  THE DROP: the `/grains/` connection CLOSES and the board takes the
//      insert out on its own, announced on `box.alive`, with nobody asking.
//   6  a new instrument does not come up granulated afterwards.
//   7  a plain `fx.pappus {on:false}` is still obeyed, which is what keeps it a
//      thing a person can type at a wedged board.
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
  const send = (m) => { const line = format(m, { from, seq: seq++ }); ws.send(line); sent++; return JSON.parse(line).id; };
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
  /** Wait for an UNPROMPTED heartbeat that satisfies `want`, asking nothing. */
  const beat = async (want, ms) => {
    const from_ = seen.length;
    const until = Date.now() + ms;
    while (Date.now() < until) {
      const hit = seen.slice(from_).find((x) => x.type === 'box.alive' && want(x));
      if (hit) return hit;
      await sleep(200);
    }
    return null;
  };
  return { from, send, ask, beat, seen, sentCount: () => sent, close: () => ws.close() };
}

console.log(`\n== the insert, and the board taking it out by itself · room "${ROOM}" ==`);

let grainsTab = await client('as-grains');
// 🔴 CONNECTED AND SILENT FOR THE WHOLE RUN. This is what `/box/` is now: a page
// that joins the room and asks the board for nothing about the granulator. If a
// check below needed it to speak, the thing being graded would not be the board
// cleaning up after itself.
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
// 🔴 THE WHOLE REPORTING HALF TURNS ON THIS, AND SO DOES CASE 5. A page that
// has to ASK finds out when it next polls; a page that is told finds out in
// five seconds, and the page that needs telling is the one that did NOT make
// the change. `/box/` reads nothing about the insert any more, so this channel
// is now what `insert-test` itself watches.
{
  const b = await boxTab.beat((m) => m.fx !== undefined, 12000);
  ok('the five-second heartbeat carries the insert and its holder',
    b?.fx === 'pappus' && b?.fxBy === grainsTab.from,
    b ? `box.alive fx=${b.fx} fxBy=${b.fxBy} fxHeld=${b.fxHeld}` : 'no heartbeat in 12 s');
}

// ── 3. THE NEGATIVE CONTROL: a live page keeps its insert ─────────────────
//
// 🔴 WITHOUT THIS, CASE 5 PASSES ON A BOARD THAT SIMPLY DROPS THE INSERT AFTER
// FIFTEEN SECONDS WHATEVER IS HAPPENING. That board would be worse than the bug
// it replaced: `/grains/` would lose the granulator under itself every quarter
// minute while somebody was listening to it. So the claim being graded is not
// "it goes away", it is "it goes away WHEN AND ONLY WHEN nobody is holding it".
//
// ⚠️ IT POLLS THE WAY `/grains/` DOES AND NO FASTER: `params.state` on a 4 s
// interval, which is that page's own `setInterval`. A test that talked
// continuously would prove something no real page does.
{
  const until = Date.now() + HELD_MS + 2 * BEAT_MS;
  console.log(`  … holding the insert for ${Math.round((HELD_MS + 2 * BEAT_MS) / 1000)} s while the grains half polls every 4 s, which is what an open tab looks like`);
  const beforeSent = boxTab.sentCount();
  boxTab.seen.length = 0;
  while (Date.now() < until) {
    grainsTab.send({ type: 'params.state' });
    await sleep(4000);
  }
  const beats = boxTab.seen.filter((m) => m.type === 'box.alive');
  const dropped = beats.filter((m) => m.fx !== 'pappus');
  ok('a page that is open and quiet KEEPS its insert past the board\'s window',
    beats.length >= 3 && dropped.length === 0,
    `${beats.length} heartbeats over ${Math.round((HELD_MS + 2 * BEAT_MS) / 1000)} s, ${dropped.length} of them without the insert · the board's window is ${HELD_MS / 1000} s`);
  // ── 4. and a second page ARRIVING changes nothing ───────────────────────
  // `/box/` used to send `fx.pappus {on:false, onlyIfIdle:true}` right here, on
  // connect. It sends nothing now, and this is the assert that says so: if this
  // half ever speaks again, the case above stops being about the board.
  ok('the box half sent nothing at all, so what held the insert was the grains half being alive',
    boxTab.sentCount() === beforeSent,
    `${boxTab.sentCount() - beforeSent} messages from the box half`);
}

// ── 5. THE DROP: a closed tab, and the board clearing up after it ─────────
//
// 🔴 THIS IS THE FAULT THE WHOLE FILE IS ABOUT. The socket CLOSES, which is
// what a tab being shut looks like from the relay. The relay says nothing about
// it, because `workers/relay/src/index.js` forwards frames verbatim, never
// parses one, and its `webSocketClose()` is an empty method. The board
// sees only that a `from` stopped talking.
//
// ⚠️ NOBODY ASKS FOR THIS. The watching half sends no message; it waits for an
// unprompted `box.alive`. A check that asked would be grading the reply to its
// own question rather than the board acting on its own.
{
  const closedAt = Date.now();
  grainsTab.close();
  console.log(`  … the grains half is gone. the board has ${HELD_MS / 1000} s of window plus a ${BEAT_MS / 1000} s heartbeat to notice`);
  boxTab.seen.length = 0;
  const gone = await boxTab.beat((m) => m.fx === null, HELD_MS + 4 * BEAT_MS);
  const tookSec = gone ? Math.round((gone.seenAt - closedAt) / 1000) : null;
  ok('a closed tab does not keep the insert: the board takes it out with nobody asking',
    gone !== null,
    gone ? `announced ${tookSec} s after the socket closed, against a ${HELD_MS / 1000} s window`
         : `no heartbeat said fx=null within ${(HELD_MS + 4 * BEAT_MS) / 1000} s`);
  ok('and it is not still recorded as held by somebody',
    gone?.fxBy === null && gone?.fxHeld === false,
    gone ? `fxBy=${gone.fxBy} fxHeld=${gone.fxHeld}` : 'nothing to read');
}

// ── 6. a new instrument does not come up granulated ──────────────────────
//
// `startAudio` re-patches a switched-on insert onto whatever comes up, which is
// right for the page holding it and is how a closed tab's granulator used to
// end up wrapping the next person's yoshimi. The board sweeps at the top of
// that call too, so the five seconds between the drop and the next heartbeat
// are not audible either.
//
// ⚠️ THIS ASSERTS THE PROPERTY, NOT THE RACE. Beating the heartbeat from
// outside the board is not something this can time reliably, so what is checked
// is the thing that matters: the instrument comes up with no insert on it.
{
  const started = await boxTab.ask({ type: 'audio.start', source: 'yoshimi' }, 'audio.started', 120000);
  ok('an instrument started afterwards comes up with no insert on it',
    started?.ok === true && started?.fx === null,
    `source=${started?.source} fx=${started?.fx} fxBy=${started?.fxBy}`);
}

// ── 7. the negative control for the other direction ──────────────────────
//
// 🔴 WITHOUT THIS, EVERY CASE ABOVE PASSES ON A BOARD THAT STOPPED PUTTING THE
// INSERT IN AT ALL. A fresh connection claims it, and a plain switch-off is
// still obeyed, which is what keeps `fx.pappus {on:false}` a thing a person can
// type at a wedged board.
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
  // ⚠️ AND THE BOARD WILL TAKE IT STRAIGHT BACK OUT when this process exits,
  // because a closed socket is exactly what case 5 is about. Said here so the
  // next reader does not report it as a bug.
  console.log(`  ⚠ the board will drop it again about ${HELD_MS / 1000} s after this process exits, which is the rule working`);
}
grainsTab.close(); boxTab.close();

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
