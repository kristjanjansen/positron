// demo/shell/board-collide.mjs: a SuperCollider program played on the board,
// from a page. plans/plan-pi-supercollider-defs.md step 2 (2026-10-12).
//
// The board compiles the program TEXT itself with the same `sclang-lite.mjs`
// this page uses (`rig/board/scollide.mjs`), so this module never sends a byte
// of SynthDef and never sends OSC. It sends verbs and keeps the board's clock:
//
//   start()                    audio.start { source: 'collide' }
//   load(name, text)           sc.load { name, text, sha }, `sha` this tab's own
//                              SHA-256 of the same compile, so `same` in the
//                              answer says whether both ends made one program
//   hits([{ name, perfAt, args?, choke? }])
//                              ONE sc.hit message, each `at` on the BOARD's clock
//   noteOn / noteOff / panic   note.* { node: 'collide' }
//   set(name, param, value)    sc.set
//   stats()                    sc.stats
//
// 🔴 THE BOARD IS THE CLOCK WHILE IT IS IN THE ROOM (plan §2.2). `clock.ping`
// in bursts, the sample with the smallest round trip kept and never an
// average, with `skewSample` IMPORTED from `proto/looper/peer.mjs`, which is the
// estimator `/concepts/clock/020/` was graded on (an injected 230 to 270 ms
// skew found to within 2.4 ms). A hit's `at` is then this tab's moment plus the
// offset, so the board only turns milliseconds into an OSC timetag.
// ⚠️ A HIT BEFORE THE CLOCK IS KNOWN IS REFUSED HERE, not sent at offset 0: on a
// board whose clock is 250 ms away that is every hit a quarter second out, and
// the board would count it as somebody else's lateness.
//
// 🔴 HOW FAR AHEAD, PER PATH (plan §2.4): 250 ms on the relay, 150 direct.
// `AHEAD` holds both; the page picks by `board.stats().via`.
//
// ⚠️ THE `board` IS ANYTHING WITH `ask(msg, type, ms)` AND `send(msg)`. On a page
// it is `createBoard` from `board.mjs`, whose harness guard (`?selfcheck=1`
// refuses every send) applies to all of this. In node it is a socket on a
// loopback relay (`board-collide-test.mjs`), which is how step 2 is measured.

import { compile } from './sclang-lite.mjs';
// Two levels up, so it resolves in the browser (/shell/ -> /proto/) and in node
// (demo/shell/ -> proto/) alike.
import { skewSample, epochNow } from '../../proto/looper/peer.mjs';

/** Lead per path, ms (plan §2.4, COMPUTED there; step 6 measures it on the Pi). */
export const AHEAD = Object.freeze({ relay: 250, direct: 150 });

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
/** This tab's SHA-256 of `text` compiled under `name` at bus 0, which is what the board compares. */
export async function shaOf(name, text) {
  const r = compile(text, { name });
  if (!r.ok) return null;
  return hex(await crypto.subtle.digest('SHA-256', r.bytes));
}

/**
 * @param {object} o
 * @param {{ ask: Function, send: Function }} o.board
 * @param {() => number} [o.now]         this tab's epoch ms
 * @param {number} [o.timeOrigin]        `performance.timeOrigin`
 * @param {Function} [o.skew]            the estimator, `skewSample` (a test sabotages it)
 * @param {(line: string, kind?: string) => void} [o.log]
 */
export function createBoardCollide({ board, now = epochNow, timeOrigin = performance.timeOrigin, skew = skewSample,
  log = () => {} } = {}) {
  if (!board?.ask || !board?.send) throw new Error('board-collide: a board with ask() and send() is required');
  let best = null, pings = 0, pongs = 0, timer = null, handed = 0, unclocked = 0;
  const samples = [];

  /** One round trip. Sequential within a burst, so no sample waits behind another. */
  async function pingOnce() {
    const t0 = now();
    pings++;
    const r = await board.ask({ type: 'clock.ping', t0 }, 'clock.pong', 3000);
    if (!r || r.t0 !== t0 || !Number.isFinite(r.t1)) return null;
    const s = skew(t0, r.t1, now());
    pongs++;
    samples.push(s);
    if (!best || s.rtt < best.rtt) best = s;
    return s;
  }
  async function burst(n = 5) { for (let i = 0; i < n; i++) await pingOnce(); return best; }
  /** Keep the clock: a burst now and one every `everyMs`, as peer.mjs does. */
  function keepClock({ everyMs = 2000, of = 5 } = {}) {
    clearInterval(timer);
    const first = burst(of);
    timer = setInterval(() => { burst(of); }, everyMs);
    return first;
  }
  /** The board's clock at a moment on this tab's `performance.now()`. */
  const boardAt = (perfAt) => timeOrigin + perfAt + best.offset;

  async function start() {
    return board.ask({ type: 'audio.start', source: 'collide' }, 'audio.started', 15000);
  }
  async function load(name, text) {
    const sha = await shaOf(name, text);
    const r = await board.ask({ type: 'sc.load', name, text, ...(sha ? { sha } : {}) }, 'sc.loaded', 8000);
    if (r && r.same === false) log(`the board compiled ${name} to different bytes from this tab, so the two sides are not playing one program`, 'bad');
    return r;
  }
  /** One message for every hit in `list`. Answers the message id, or null. */
  function hits(list) {
    if (!best) { unclocked += list.length; return null; }
    const id = board.send({ type: 'sc.hit', hits: list.map((h) => ({ name: h.name, at: boardAt(h.perfAt),
      ...(h.args ? { args: h.args } : {}), ...(h.choke ? { choke: h.choke } : {}) })) });
    if (id) handed += list.length;
    return id;
  }
  const noteOn = (name, note, vel = 100, perfAt = null) => board.send({ type: 'note.on', node: 'collide', name, note, vel,
    ...(perfAt != null && best ? { at: boardAt(perfAt) } : {}) });
  const noteOff = (name, note) => board.send({ type: 'note.off', node: 'collide', name, note });
  const panic = () => board.send({ type: 'note.panic', node: 'collide' });
  const set = (name, param, value) => board.send({ type: 'sc.set', name, param, value });
  const stats = () => board.ask({ type: 'sc.stats' }, 'sc.stats', 3000);

  return {
    start, load, hits, noteOn, noteOff, panic, set, stats, burst, keepClock, boardAt,
    /** Board minus tab, ms, from the fastest round trip so far; null before one. */
    offset: () => (best ? best.offset : null),
    rtt: () => (best ? best.rtt : null),
    clock: () => ({ pings, pongs, samples: samples.length, offset: best?.offset ?? null, rtt: best?.rtt ?? null }),
    handed: () => handed,
    unclocked: () => unclocked,
    stop: () => { clearInterval(timer); timer = null; },
  };
}
