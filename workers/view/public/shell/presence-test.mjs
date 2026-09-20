// demo/shell/presence-test.mjs — the presence rule, with no browser at all.
//
//   node demo/shell/presence-test.mjs
//
// `presenceOf` and `wirePresence` are pure: no clock, no socket, no element. So
// the whole of the policy is gradable here, which matters more than usual for
// this subject, because THE PAGE THAT SHOWS IT CANNOT BE GRADED BY WATCHING.
// The thing on the far end is a Raspberry Pi in another building; the failure
// this component exists to stop is a badge that says `offline` about a board
// that is fine, in the two seconds before the first heartbeat lands, and you
// only ever see it if you happen to be looking at the right two seconds.
//
// SIX OF THESE ARE NEGATIVE CONTROLS: they are written so the bug they name
// would fail them, rather than so today's code passes. Two of them were proved
// by breaking the module on purpose:
//
//   1  the `coming` check moved above the `online` check, which is the
//      plausible ordering bug: a board answering normally would pulse as
//      "coming online" for as long as a page forgot to clear its own flag.
//      MEASURED 28/28 -> 27/28, and the one that went red is the one written
//      for it.
//   2  the "never heard, nobody listening" case answering `offline` instead of
//      `unknown`, which is the exact defect the fourth state exists to prevent.
//      MEASURED 28/28 -> 25/28, and the third failure is the good one: the
//      walk at the bottom stops reaching all four states at all.

import { presenceOf, wirePresence, PRESENCE_STATES, SAYS, MISSES } from './presence.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' · ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' · ' + detail : ''}`); }
};

// The board's real numbers, read off `rig/board/board.mjs`: it sends `board.alive`
// on a 5000 ms interval. Everything below is expressed against that rather
// than against a round number invented here.
const BEAT = 5000;
const T0 = 1_700_000_000_000;                       // an arbitrary but fixed epoch
const at = (ms) => T0 + ms;
const board = (o) => presenceOf({ everyMs: BEAT, ...o });

console.log('\n== the heartbeat ==');

// ── 1. it spoke, so it is here ──────────────────────────────────────────────
ok('a beat that has just landed reads online',
  board({ now: at(20_000), lastSeenAt: at(19_800) }) === 'online',
  '200 ms ago, against a 5 s beat');

// ── 2. NEGATIVE CONTROL: one lost beat is not a dead board ──────────────────
// A badge that goes grey on ordinary jitter is a badge that sends somebody to
// look at working hardware. The window is two beats for exactly this.
ok('NEGATIVE CONTROL: one missed beat is still online',
  board({ now: at(20_000), lastSeenAt: at(13_500) }) === 'online',
  `6.5 s ago, window is ${MISSES} beats`);

// ── 3. two lost beats is silence ────────────────────────────────────────────
ok('two missed beats is offline',
  board({ now: at(20_000), lastSeenAt: at(9_000) }) === 'offline',
  '11 s ago');

// ── 4. the edge is exact, and it is strict ──────────────────────────────────
// Written down because it is the one number a reader of the badge could argue
// about, and because an off-by-one here is invisible in a browser.
{
  const aged = (ms) => board({ now: at(MISSES * BEAT), lastSeenAt: at(MISSES * BEAT - ms) });
  const justInside = aged(MISSES * BEAT - 1);
  const exactly = aged(MISSES * BEAT);
  ok('the window is exactly two beats, and the edge itself is out',
    justInside === 'online' && exactly === 'offline',
    `${MISSES * BEAT - 1} ms in reads ${justInside}, ${MISSES * BEAT} ms reads ${exactly}`);
}

// ── 5. the page owns the number ─────────────────────────────────────────────
// A thing that speaks once a minute is not offline fifty-five seconds in, and
// nothing in this module knows that but the caller.
ok('a slower promise gets a wider window',
  presenceOf({ now: at(90_000), lastSeenAt: at(40_000), everyMs: 60_000 }) === 'online'
  && presenceOf({ now: at(90_000), lastSeenAt: at(40_000), everyMs: 5_000 }) === 'offline',
  'the same silence reads online at a 60 s beat and offline at a 5 s one');

ok('and `misses` widens it too',
  board({ now: at(20_000), lastSeenAt: at(6_000), misses: 3 }) === 'online'
  && board({ now: at(20_000), lastSeenAt: at(6_000), misses: 2 }) === 'offline',
  '14 s of silence: 3 beats forgives it, 2 does not');

console.log('\n== what has not been measured ==');

// ── 6. NEGATIVE CONTROL: silence at the start is not absence ────────────────
// 🔴 THIS IS THE STATE THE COMPONENT EXISTS FOR. A page that opens on
// `offline` is asserting a measurement of hardware in another building that it
// has not taken. CLAUDE.md: "we did not look" must not read as "it is missing".
ok('NEGATIVE CONTROL: nothing heard and no time passed is unknown, not offline',
  board({ now: at(1_200), since: at(0) }) === 'unknown',
  '1.2 s after joining the room, nothing has answered');

// ── 7. and it does become an answer, once enough time has gone by ───────────
ok('nothing heard for the whole window is offline',
  board({ now: at(10_500), since: at(0) }) === 'offline',
  `10.5 s of listening, window is ${MISSES * BEAT / 1000} s`);

// ── 8. NEGATIVE CONTROL: nobody listening is never an answer ────────────────
// `since: null` means this page has not started watching. A badge in that state
// must never claim the thing is gone, however long the tab has been open.
ok('NEGATIVE CONTROL: with nobody listening it stays unknown, however long',
  board({ now: at(0), since: null }) === 'unknown'
  && board({ now: at(86_400_000), since: null }) === 'unknown',
  'a day later, still unknown');

// ── 9. NEGATIVE CONTROL: a stamp from the future is not a measurement ───────
// Every envelope on this relay carries `at`, written by the SENDER's own clock.
// A board running three minutes fast would read as freshly heard from forever
// after it died, which is the worst shape a presence badge has: confidently
// green about something that is gone.
ok('NEGATIVE CONTROL: heard from the future reads unknown, not online',
  board({ now: at(10_000), lastSeenAt: at(190_000) }) === 'unknown',
  'a stamp 3 minutes ahead of this clock');

console.log('\n== coming online ==');

// ── 10. it beats both greys ─────────────────────────────────────────────────
// Yoshimi takes ten to forty seconds to come up on a cold board. For all of it
// the honest answer is that something is happening, and `offline` there reads
// as a dead button.
ok('a deliberate start beats an empty room',
  board({ now: at(30_000), since: at(0), comingSince: at(28_000) }) === 'coming',
  'nothing has ever answered, and a start is 2 s old');

ok('and it beats a board that has gone quiet',
  board({ now: at(40_000), lastSeenAt: at(1_000), comingSince: at(38_000) }) === 'coming',
  '39 s of silence, but something is being started');

// ── 11. NEGATIVE CONTROL: and it loses to a beat ────────────────────────────
// The ordering bug. With the `coming` check above the `online` one, a board
// that is answering normally shows a pulsing badge for as long as a page forgot
// to clear its flag, which reads as "still starting" about a thing that started.
ok('NEGATIVE CONTROL: a live beat outranks a start that is still flagged',
  board({ now: at(30_000), lastSeenAt: at(29_000), comingSince: at(28_000) }) === 'online',
  'beat 1 s ago, start flagged 2 s ago');

// ── 12. a start is allowed an expiry ────────────────────────────────────────
// A thing that has been coming online for ten minutes is not coming online.
{
  const LIMIT = 45_000;                              // the board's cold start, plus room
  const during = board({ now: at(40_000), since: at(0), comingSince: at(0), comingMs: LIMIT });
  const after = board({ now: at(46_000), since: at(0), comingSince: at(0), comingMs: LIMIT });
  ok('a start that outlasts its limit stops claiming to be one',
    during === 'coming' && after === 'offline',
    `40 s in reads ${during}, 46 s in reads ${after}, limit ${LIMIT / 1000} s`);
}

// ── 13. NEGATIVE CONTROL: no limit means the page will clear it ─────────────
ok('NEGATIVE CONTROL: with no limit a start is not timed out behind the page\'s back',
  board({ now: at(600_000), since: at(0), comingSince: at(0), comingMs: null }) === 'coming',
  'ten minutes in, still coming, because nothing told it otherwise');

// ── 14. a start stamped in the future is not a start ────────────────────────
ok('a start that has not begun yet is not coming',
  board({ now: at(10_000), since: at(0), comingSince: at(20_000) }) === 'offline',
  'flagged to begin 10 s from now');

console.log('\n== the rule refuses what it cannot answer ==');

// ── 15. no default for the interval ─────────────────────────────────────────
// 🔴 A DEFAULT HERE WOULD BE A BADGE THAT FLICKERS GREY ON WORKING HARDWARE.
// One second against a five-second beat calls the board gone between every
// beat, and the person who goes to look at the board finds nothing wrong.
{
  let threw = null;
  try { presenceOf({ now: at(0), lastSeenAt: at(0) }); } catch (e) { threw = e.message; }
  ok('an interval nobody declared is refused rather than guessed at',
    threw !== null && /everyMs/.test(threw), threw ?? 'it was accepted');
}

// ── 16. and neither is zero tolerance ───────────────────────────────────────
{
  let threw = null;
  try { board({ now: at(0), lastSeenAt: at(0), misses: 0 }); } catch (e) { threw = e.message; }
  ok('zero missed beats is refused, because a beat is never exactly on time',
    threw !== null && /misses/.test(threw), threw ?? 'it was accepted');
}

{
  let threw = null;
  try { presenceOf({ everyMs: BEAT, lastSeenAt: at(0) }); } catch (e) { threw = e.message; }
  ok('and a call with no clock in it is refused',
    threw !== null && /now/.test(threw), threw ?? 'it was accepted');
}

console.log('\n== the socket ==');

// ── 17. every readyState has an answer, and they are the right ones ─────────
{
  const got = [0, 1, 2, 3].map((ready) => wirePresence({ ready }).state);
  ok('connecting is coming, open is online, closing and closed are offline',
    got.join(',') === 'coming,online,offline,offline', got.join(','));
}

// ── 18. NEGATIVE CONTROL: no socket at all is not a closed socket ───────────
// The same distinction as `unknown` above, one layer down: a page that has not
// opened a wire has not learned that the relay is unreachable.
ok('NEGATIVE CONTROL: a page with no socket reads unknown, not offline',
  wirePresence({}).state === 'unknown' && wirePresence({ ready: null }).state === 'unknown',
  wirePresence({}).why);

// ── 19. the reason survives, because the reason is the useful part ──────────
// `openWire` asks `/room/<name>/stats` when an upgrade fails and can say "the
// room is full at 16 of 16". A badge that drops that is a badge that sends
// somebody to debug a Pi over a relay that refused the socket.
// ⚠️ THE FIXTURE IS `wire.mjs`'s OWN SENTENCE and was copied from it, so it
// changed when that sentence lost its middot on 2026-09-19. A fixture that
// drifts from the string it stands for is a test about nothing.
{
  const full = 'the room is full at 16 of 16 sockets';
  const r = wirePresence({ ready: 3, refusal: full });
  ok('a closed socket carries the relay\'s own reason',
    r.state === 'offline' && r.why === full, r.why);
}

ok('and a reconnect says so rather than looking like a first attempt',
  wirePresence({ ready: 0, reconnects: 0 }).why === 'the socket is opening'
  && wirePresence({ ready: 0, reconnects: 4 }).why === 'the socket is coming back',
  wirePresence({ ready: 0, reconnects: 4 }).why);

// ── 20. a readyState that cannot exist is a bug, not a state ────────────────
{
  let threw = null;
  try { wirePresence({ ready: 7 }); } catch (e) { threw = e.message; }
  ok('a readyState outside 0 to 3 is refused', threw !== null, threw ?? 'it was accepted');
}

console.log('\n== the words ==');

// ── 21. every DERIVED state is reachable ────────────────────────────────────
// A state no input can produce is dead code wearing a colour.
// ⚠️ `checking` IS NOT ONE OF THEM AND MUST NOT BE. It is not a fact about the
// far end: it is this page saying a question is out, so no arrangement of
// heartbeats may produce it. The control at the bottom is that half.
{
  const walk = [
    board({ now: at(1_000), since: at(0) }),
    board({ now: at(2_000), since: at(0), comingSince: at(1_500) }),
    board({ now: at(9_000), since: at(0), lastSeenAt: at(8_800) }),
    board({ now: at(40_000), since: at(0), lastSeenAt: at(8_800) }),
  ];
  ok('one board over forty seconds reaches all four states a heartbeat can produce',
    new Set(walk).size === 4
      && PRESENCE_STATES.filter((s) => s !== 'checking').every((s) => walk.includes(s)),
    walk.join(' -> '));
}

// ── 22. every state has a word, and they are all different ──────────────────
// Two states sharing a word is two states a reader cannot tell apart, which
// undoes the entire reason there are four of them.
{
  const w = PRESENCE_STATES.map((s) => SAYS[s]);
  ok('every state has its own word',
    w.every((x) => typeof x === 'string' && x.length > 0) && new Set(w).size === w.length,
    w.join(' · '));
}

// ── 23. nothing a visitor reads carries an em dash ──────────────────────────
// CLAUDE.md, checked in code rather than swept by hand, for the same reason
// `looper-test.mjs` checks it: a formatter can put one back on every string at
// once and a sweep cannot see that coming.
ok('no em dash in anything the badge says',
  Object.values(SAYS).every((s) => !s.includes('—')),
  `${Object.values(SAYS).length} words`);

// ── 24. NEGATIVE CONTROL: none of them is jargon dressed as a state ─────────
// The banned list in CLAUDE.md is this project's private vocabulary. A badge is
// read by somebody who does not work here.
{
  const banned = ['lookahead', 'horizon', 'tick', 'host', 'commit', 'actuate',
    'lattice', 'deck', 'lane', 'fold', 'adapter', 'heartbeat', 'socket', 'stale'];
  const bad = Object.values(SAYS).filter((s) => banned.some((b) => s.toLowerCase().includes(b)));
  ok('NEGATIVE CONTROL: no word a visitor reads is this project\'s own vocabulary',
    bad.length === 0, bad.length ? bad.join(', ') : Object.values(SAYS).join(' · '));
}

// ── NEGATIVE CONTROL: a heartbeat never invents `checking` ────────────────
// The state means "we asked and nobody has answered yet", which is a fact about
// the PAGE and not about the board. If a derivation could produce it, the grey
// axis would stop meaning what it says: a reader could not tell a question that
// is out from a thing that is genuinely unmeasured.
{
  const cases = [
    { now: at(1_000) },
    { now: at(1_000), since: at(0) },
    { now: at(9_000), since: at(0), lastSeenAt: at(8_800) },
    { now: at(40_000), since: at(0), lastSeenAt: at(8_800) },
    { now: at(2_000), since: at(0), comingSince: at(1_500) },
    { now: at(1_000), since: at(0), lastSeenAt: at(90_000) },
  ];
  const got = cases.map((c) => board(c));
  ok('NEGATIVE CONTROL: no arrangement of heartbeats produces "checking"',
    got.every((g) => g !== 'checking'),
    got.join(' · '));
}

console.log(`\n${pass} ok · ${fail} failed`);
process.exit(fail ? 1 : 0);
