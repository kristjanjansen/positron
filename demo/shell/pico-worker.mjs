// demo/shell/pico-worker.mjs: one emulated Pico, paced to real time, off the
// page's main thread. Driven by `createPicoRunner` in pico.mjs; nothing else
// should post to it.
//
// 🔴 A WORKER AND NOT A SLICE ON requestAnimationFrame, AND THE NUMBER IS WHY.
// MEASURED 2026-10-04 in Node on this laptop: the router firmware runs at about
// 0.6 x real time FLAT OUT (38 million emulated instructions a second against
// the 64 million a second the firmware's own busy loop asks for). On the main
// thread a page could give it at most about 10 ms of each 16.7 ms frame, which
// is about 0.36 x and a page that stutters while it does it. Here it gets a
// whole core and the page gets all of its own.
//
// ⚠️ IT IS PACED, NOT FLAT OUT. Each slice runs the board to where real time
// says it should be, so on a machine fast enough to keep up it idles rather
// than racing ahead, and the screen moves at the firmware's own speed. Behind
// by more than 100 ms it forgives the debt rather than sprinting to repay it,
// so a slow machine runs slow and smooth rather than in bursts.
//
// ⚠️ A KEY IS HELD FOR AS LONG IN BOARD TIME AS THE PERSON HELD IT IN WALL
// TIME. Down goes to the pin at once; up is applied when the board's clock has
// counted the same hold, and never sooner than 40 ms, which clears the
// firmware's 20 ms debounce. So a one second press on OK is a one second press
// to the firmware, which is what makes it a deny, however slow the emulator is
// running, and a click with no hold at all is still a tap.
import { createPico } from './pico.mjs';

const SLICE_MS = 16;          // the longest one slice keeps this thread busy
const FRAME_MS = 30;          // at most one screen posted per this much wall time
const STATS_MS = 500;
const MIN_HOLD_MS = 40;

let board = null;
let running = false;
let anchorWall = 0, anchorBoard = 0;
let tx = [];
let lastWrites = -1, lastFrame = 0;
let statWall = 0, statBoard = 0, statBusy = 0, busy = 0, statInstr = 0;
const downAt = new Map();      // key -> board nanos it went down
let events = [];               // { at: nanos, fn } in order, applied as the clock passes them
let timer = null;

const chan = new MessageChannel();
chan.port1.onmessage = () => tick();
const soon = () => chan.port2.postMessage(0);   // a yield with no 4 ms clamp

function rebase() { anchorWall = performance.now(); anchorBoard = board ? board.nanos : 0; }

function at(nanos, fn) {
  events.push({ at: nanos, fn });
  events.sort((a, b) => a.at - b.at);
}

function post(final = false) {
  const now = performance.now();
  if (tx.length) { postMessage({ type: 'tx', bytes: tx }); tx = []; }
  if (board && board.oled.writes !== lastWrites && (final || now - lastFrame >= FRAME_MS)) {
    lastWrites = board.oled.writes;
    lastFrame = now;
    const px = board.pixels();
    postMessage({ type: 'frame', px, nanos: board.nanos }, [px.buffer]);
  }
  if (board && now - statWall >= STATS_MS) {
    const wall = now - statWall;
    postMessage({
      type: 'stats',
      // board time over wall time while running: 1 is keeping up
      speed: (board.nanos - statBoard) / 1e6 / wall,
      // board time over the time this thread spent emulating: what it COULD do
      flatOut: busy - statBusy > 1 ? (board.nanos - statBoard) / 1e6 / (busy - statBusy) : null,
      mips: busy - statBusy > 1 ? (board.instructions - statInstr) / (busy - statBusy) / 1000 : null,
      nanos: board.nanos, rx: board.rxCount, tx: board.txCount,
    });
    statWall = now; statBoard = board.nanos; statBusy = busy; statInstr = board.instructions;
  }
}

function tick() {
  timer = null;
  if (!running || !board) return;
  const t0 = performance.now();
  const target = anchorBoard + (t0 - anchorWall) * 1e6;
  const deadline = t0 + SLICE_MS;
  for (;;) {
    const ev = events[0];
    const until = ev && ev.at < target ? ev.at : target;
    if (!board.run(until, deadline)) break;
    if (ev && ev.at <= board.nanos) { events.shift(); ev.fn(); continue; }
    break;
  }
  busy += performance.now() - t0;
  if (target - board.nanos > 100e6) rebase();      // forgive, do not sprint
  post();
  if (board.nanos >= target) timer = setTimeout(tick, 4);
  else soon();
}

function start() {
  if (running || !board) return;
  running = true;
  rebase();
  statWall = performance.now(); statBoard = board.nanos; statBusy = busy; statInstr = board.instructions;
  soon();
}

function stop() {
  running = false;
  if (timer) { clearTimeout(timer); timer = null; }
  post(true);
}

onmessage = ({ data: m }) => {
  if (m.type === 'boot') {
    const was = running;
    stop();
    board = createPico({ image: m.image, onTx: (b) => tx.push(b) });
    events = []; downAt.clear(); tx = []; lastWrites = -1;
    postMessage({ type: 'booted', font: m.font ?? null });
    if (was || m.run) start();
  } else if (m.type === 'run') {
    if (m.on) start(); else stop();
  } else if (m.type === 'key') {
    if (!board) return;
    if (m.down) {
      board.key(m.k, true);
      downAt.set(m.k, board.nanos);
    } else {
      const from = downAt.get(m.k) ?? board.nanos;
      downAt.delete(m.k);
      const hold = Math.max(MIN_HOLD_MS, Math.min(m.heldMs || 0, 5000));
      const when = from + hold * 1e6;
      if (!running || when <= board.nanos) {
        // nothing is moving the clock, so move it here: a tap on a paused
        // board still has to be a tap the firmware can see
        if (when > board.nanos) board.run(when);
        board.key(m.k, false);
      } else at(when, () => board.key(m.k, false));
    }
  } else if (m.type === 'send') {
    board?.send(m.bytes);
  }
};
