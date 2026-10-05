// demo/sync/arrival.mjs: the ARRIVAL tab of /sync/, from the old /cues/
// (plans/plan-demo-structure.md §3.1, step 5).
//
// The first of the four regimes in plans/plan-routing-time.md: AS IT HAPPENS.
// A cue carries no `at`, because it has no moment of its own to wait for: it
// fires on every open copy the instant it lands, and the only number worth
// having is how long the landing took.
//
// WHAT CAME OVER FROM /cues/: fire a cue, fire ten, the name on show, the
// list of what arrived, and the delivery time read off the sender's own stamp.
// WHAT CHANGED ON THE WAY IN, AND WHY:
//   1  🔴 IT IS `openWire` NOW, NOT A HAND-ROLLED `new WebSocket`. That page
//      could not tell a full room from a dead relay, never reconnected, and
//      stamped its own envelope. `demo/shell/wire.mjs` does all three, and the
//      send stamp is the envelope's `sent` since 2026-10-04, written by
//      `format()`, never by this tab.
//   2  🔴 IT JOINS ON THE FIRST PRESS IN THIS TAB, NOT ON LOAD. /cues/ opened
//      its socket the moment the page loaded, so every visit sat in a relay
//      room. Building this tab opens nothing (`tab-page.mjs` rule 1).
//   3  🔴 A SECOND COPY OF THE RECEIVER LIVES IN THE TAB. The old page's one
//      claim was *"every open copy of this page shows the same cue"*, and it
//      graded its own echo, which is one copy. The second copy is a second
//      socket in the same room with its own name on show, so the claim is
//      graded as two copies agreeing rather than inferred from one.
//   4  The message is the plan's flat shape, `{ type: 'cue.set', text }`
//      (plan-routing-time §4.1), rather than a cue whose id was its name.

import { el } from '/shell/shell.mjs';
import { openWire } from '/shell/wire.mjs';
import { createMessageList } from '/shell/messages.mjs';
import { createButtonGroup } from '/shell/button-group.mjs';

const ROOM = new URLSearchParams(location.search).get('room') || 'cues-demo';
const BURST = 10, BURST_GAP_MS = 100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// What this tab is, in the fixed box under the tab row (`tab-page.mjs` rule 6).
export const about = 'A cue goes through the relay and shows on every open screen the moment it lands. Press Send a cue and both screens change together.';

export const readout = { screens: '', received: '', typical: 'ms', slowest: 'ms' };

export function build({ panel, log, set }) {
  /**
   * One receiver: a socket, the name it has on show, and the order the cues
   * reached it in. The tab builds two of them, `here` and `other`, and only
   * `here` ever sends.
   */
  function receiver(label) {
    const zone = el('div', 'sync-zone');
    const cap = el('div', 'sync-zone-cap', label);
    const big = el('div', 'sync-cue idle', 'waiting for a cue');
    zone.append(cap, big);
    return { label, zone, big, wire: null, from: null, got: [], names: new Set() };
  }
  const here = receiver('this screen');
  const other = receiver('a second screen');
  const pair = el('div', 'sync-zones');
  pair.append(here.zone, other.zone);

  const btns = createButtonGroup({ buttons: [
    { id: 'fire', label: 'Send a cue', primary: true, onPress: () => run(fireOne) },
    { id: 'burst', label: `Send ${BURST}`, onPress: () => run(fireBurst) },
  ] });

  // The shared list (demo/shell/messages.mjs), the same renderer `wire` uses.
  const msgs = createMessageList({ cap: 40, empty: 'no cues yet', mark: 'mine' });
  panel.add(btns.el, pair, msgs.el);

  let seq = 0, fired = 0;
  const times = [];
  const peers = new Set();     // other `from`s this copy has heard say hello

  function render() {
    set('screens', here.from ? peers.size + 1 : '');
    set('received', here.got.length || '');
    if (times.length) {
      const s = times.slice().sort((a, b) => a - b);
      set('typical', s[Math.floor(s.length / 2)]);
      set('slowest', s[s.length - 1]);
    }
  }

  function onMessage(R, got) {
    if (got.kind !== 'json') return;
    const m = got.msg;
    if (m.type === 'hello' || m.type === 'here') {
      if (R === here && m.from !== here.from) { peers.add(m.from); render(); }
      if (m.type === 'hello' && m.from !== R.from) R.wire.send({ type: 'here' });
      return;
    }
    if (m.type !== 'cue.set') return;
    // THE SENDER STAMPS; the relay never re-stamps. So delivery is honest even
    // though the relay has no idea what time it is. `parse()` has already
    // turned an old sender's `at` into `sent`.
    const deliveryMs = Date.now() - m.sent;
    R.got.push(m.id);
    R.big.className = 'sync-cue';
    R.big.textContent = m.text;
    if (R !== here) return;
    const mine = m.from === here.from;
    times.push(deliveryMs);
    msgs.add({ dir: mine ? 'echo' : 'in', bytes: got.bytes, mark: mine,
               text: `${m.text} ${deliveryMs.toFixed(1)} ms`, hi: mine });
    render();
  }

  /** Both sockets, opened by the first press and never before it. */
  let joining = null;
  function join() {
    if (joining) return joining;
    const open = (R) => new Promise((res) => {
      R.wire = openWire(ROOM, {
        onOpen: (from) => {
          R.from = from;
          R.wire.send({ type: 'hello' });
          res(true);
        },
        onMessage: (got) => onMessage(R, got),
        onClose: () => { if (R === here) log('relay closed, reconnecting', 'bad'); },
      });
      setTimeout(() => res(false), 6000);
    });
    joining = Promise.all([open(here), open(other)]).then(([a, b]) => {
      log(a && b ? `joined ${ROOM} twice, as ${here.from} here and ${other.from} for the other copy`
        : `the relay did not open (${here.wire.stats().refusal || 'no reason given yet'})`, a && b ? 'hi' : 'bad');
      render();
      return a && b;
    });
    return joining;
  }

  function fire() {
    const r = here.wire?.send({ type: 'cue.set', text: `CUE-${String(++seq).padStart(2, '0')}` });
    if (r?.sent) fired++;
  }
  async function fireOne() { fire(); }
  // ⚠️ THE BURST IS SPREAD OUT, so the queue is visible on both copies, and
  // the press is not finished until the last one has gone.
  async function fireBurst() {
    for (let i = 0; i < BURST; i++) { fire(); await sleep(BURST_GAP_MS); }
  }
  let last = Promise.resolve();
  function run(fn) {
    last = (async () => { if (await join()) await fn(); })();
    return last;
  }

  addEventListener('pagehide', () => { here.wire?.close(); other.wire?.close(); });

  return {
    async check({ A }) {
      A('nothing joined the relay before the first press in this tab',
        !here.wire && !other.wire, here.wire ? 'a socket was already open' : 'no socket yet');
      // Pressed the way a finger presses them, so the handlers graded are the
      // ones a person reaches.
      btns.button('fire').click();
      await last;
      btns.button('burst').click();
      await last;
      // the last of a burst can still be in flight; drain before asserting
      // rather than calling a race a failure
      for (let i = 0; i < 30 && (here.got.length < fired || other.got.length < fired); i++) await sleep(100);
      A('relay open, for both copies', here.wire?.state() === 1 && other.wire?.state() === 1,
        `${here.wire?.state()} and ${other.wire?.state()}`);
      A('no secret in this page', !location.href.includes('token') && !ROOM.includes('token'));
      A('own cues echo back', fired > 0 && here.got.length >= fired, `${here.got.length} received of ${fired} fired`);
      A('every cue that arrived is in the list', msgs.count() === Math.min(here.got.length, 40),
        `${msgs.count()} rows for ${here.got.length} cues`);
      A('the cue name on show is the last one that arrived',
        !here.big.classList.contains('idle') && here.big.textContent === `CUE-${String(seq).padStart(2, '0')}`,
        here.big.textContent);
      const s = times.slice().sort((a, b) => a - b);
      const p50 = s[Math.floor(s.length / 2)];
      A('delivery under 250 ms', s.length > 0 && p50 < 250,
        s.length ? `middle ${p50.toFixed(1)} ms of ${s.length}, slowest ${s[s.length - 1].toFixed(1)} ms` : 'nothing timed');
      // 🔴 THE CLAIM THE OLD PAGE COULD ONLY INFER. Two copies, each with its
      // own socket, agree on every cue, on the order, and on the name on show.
      const same = here.got.length === other.got.length && here.got.every((id, i) => other.got[i] === id);
      A('every open copy shows the same cue: the other copy got every cue, in the same order, and shows the same name',
        fired > 0 && same && other.got.length >= fired && other.big.textContent === here.big.textContent,
        `here ${here.got.length} and the other copy ${other.got.length} of ${fired}, `
        + `${same ? 'the same order' : 'a DIFFERENT order'}, showing ${here.big.textContent} and ${other.big.textContent}`);
      A('the two copies are two sockets, not one read twice', !!here.from && !!other.from && here.from !== other.from
        && peers.has(other.from), `${here.from} and ${other.from}, this copy heard ${peers.size} other(s)`);
    },
  };
}
