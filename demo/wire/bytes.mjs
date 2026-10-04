// demo/wire/bytes.mjs: the BYTES tab of `/wire/`, which is the old `/wire/`
// moved into a module (plans/plan-demo-structure.md §3.3, decided 2026-10-04).
//
// 🔴 UNCHANGED IN WHAT IT DOES, AND THAT INCLUDES ONE THING THE TAB CONVENTION
// ARGUES AGAINST. `tab-page.mjs` says a tab's `build` opens nothing and a join
// waits for the first press in its own tab. This tab joins its room and reads
// the history the moment it is built, because what other people left in the
// room IS the subject: *"already on the page when you arrive"*. The brief was
// "today's /wire/ unchanged", so it is, and the tension is reported rather than
// resolved here. It is still lazy in the sense the page can guarantee: open
// `/wire/#notes` and this tab is never built, so nothing of it is opened.
//
// 🔴 ITS CONTROLS ARE NOT IN `.pos-controls`. The harness pressed that row by
// position; inside a tab page it would press them blind in a closed tab and
// every control after them would move. So the buttons live in the tab, and
// `check()` presses them in the order the harness did (send, store, bytes,
// toobig, overfill, clear) and awaits each one, which is what the harness's
// `data-busy` wait did.

import { el } from '/shell/shell.mjs';
import { openWire, LIMITS } from '/shell/wire.mjs';
import { createTable } from '/shell/table.mjs';

// A page with no numbers: the list is the readout. `null` gives the tab's own
// report a log and no cells.
export const readout = null;

export function build({ panel, log, d }) {
  const q = new URLSearchParams(location.search);
  // ONE shared room by default. It used to be a room per tab, which made
  // loading the history on arrival meaningless: a fresh room has no past.
  // Sharing it means what you find on load is what other people left. The
  // manifest row keeps `room: 'fixed'` so the harness does not rename it.
  const ROOM = q.get('room') || 'wire';
  const STORE = q.get('store') || 'https://store.positron.studio';
  // Small on purpose: the retention rule is 1,000 messages or 24 hours, and a
  // page cannot show a cap it would take seventeen seconds to reach.
  const CAP = 8;
  // Three of the checks are mechanism, not something a visitor came to press.
  // They stay in the DOM, hidden, and `check()` presses them; `?checks=1` shows
  // them.
  const SHOW_CHECKS = q.has('checks');

  // ── the composer ────────────────────────────────────────────────────────
  // ⚠️ NO `kind` FIELD. A text box whose value went straight into the
  // envelope's `type` asked a visitor to invent a protocol before they could
  // say hello. The kind of a message somebody types into a box is CHAT; the
  // other kinds here (`toobig`, `fill`, `chatter`) are set by the checks that
  // send them, where they mean something.
  const TYPE = 'chat';
  const compose = el('div', 'compose');
  const body = el('input', 'body', null, { type: 'text', value: 'hello', 'aria-label': 'what it says' });
  compose.append(el('label', null, 'says'), body);

  // ⚠️ NO PRIMARY HERE. This page's whole subject is the DIFFERENCE between
  // sending and storing, and lighting one says the other is a variant.
  const SPECS = [
    { id: 'send', label: 'Send' },
    { id: 'store', label: 'Send & store' },
    { id: 'bytes', label: 'Send the same as bytes', check: true },
    { id: 'toobig', label: 'Try one that is too big', check: true },
    { id: 'overfill', label: 'Overfill the history', check: true },
    { id: 'clear', label: 'Clear' },
  ];
  const acts = el('div', 'wire-acts');
  const handlers = new Map();
  const buttons = new Map();
  /** Run a control's handler with the busy sweep on its button, and hand back
   *  the promise, so a check can await exactly what a press does. */
  const run = async (id) => {
    const b = buttons.get(id);
    b.dataset.busy = '1';
    try { await handlers.get(id)(); }
    catch (e) { log(`${id}: ${e.message}`, 'bad'); }
    finally { delete b.dataset.busy; }
  };
  for (const s of SPECS) {
    const b = el('button', '', s.label, { type: 'button' });
    b.onclick = () => { if (!b.dataset.busy) run(s.id); };
    if (s.check && !SHOW_CHECKS) b.hidden = true;
    buttons.set(s.id, b);
    acts.append(b);
  }
  const on = (id, fn) => handlers.set(id, fn);

  // 🔴 ONE LIST. Live traffic and the stored history are the SAME MESSAGES,
  // and `stored` is the whole of the difference between them.
  // 🔴 `table.mjs`, NOT `messages.mjs`: two list components on one site means
  // two places a row can be styled. `text` DOES NOT CLIP: a line of JSON cut
  // with an ellipsis is a line nobody can read, and the exact bytes are the
  // subject. It is the growing column, so it wraps.
  const msgs = createTable({
    cap: 40,
    columns: [
      { key: 'dir', width: 44, hi: true },
      { key: 'size', width: 58, align: 'right' },
      { key: 'text', grow: true },
    ],
    empty: 'nothing sent yet. Press Send, and watch the bytes go out and come back',
  });
  const rowOf = (r) => ({ ...r, size: `${r.bytes} B` });
  // ⚠️ NO WRAPPER AROUND IT. The table draws its own edge, and a padded card
  // around it drew a box inside a box.
  panel.add(compose, acts, msgs.el);

  // ── state ───────────────────────────────────────────────────────────────
  const shown = [];
  let seeded = false;           // the history is the list's first content, once
  const stored = [];            // the exact lines we asked to be stored, in order
  const deliveries = [];
  let recording = false, recordNote = 'not asked yet';
  let lastBinaryIn = null;

  const short = (s, n = 260) => (s.length > n ? `${s.slice(0, n)}…` : s);
  const hex = (buf) => Array.from(new Uint8Array(buf).slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join(' ');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function show(dir, bytes, text, hi, wasStored) {
    shown.push({ dir, bytes, text });
    // The table writes with textContent: a message is data, never markup.
    msgs.add(rowOf({ dir: dir === 'out' ? 'out' : hi ? 'echo' : 'in', bytes, stored: !!wasStored, text: short(text), hi }));
  }

  // ── the wire ────────────────────────────────────────────────────────────
  const wire = openWire(ROOM, {
    onOpen: (from) => log(`joined ${ROOM} as ${from}`, 'hi'),
    onClose: () => log('relay closed', 'bad'),
    onMessage: (got) => {
      if (got.kind === 'binary') { show('bytes in', got.bytes, hex(got.data)); lastBinaryIn = got.data; return; }
      if (got.kind === 'unreadable') { show('in', got.bytes, got.data); return; }
      const mine = got.msg.from === wire.stats().from;
      // The sender stamps `sent` and the relay never re-stamps, which is why this
      // number is honest even though the relay has no idea what time it is.
      if (mine) deliveries.push(Date.now() - got.msg.sent);
      show(mine ? 'echo' : 'in', got.bytes, got.data, mine, mine && stored.includes(got.data));
    },
  });

  /** Wait for a specific line to come back rather than sleeping and hoping. */
  function echoOf(line, ms = 2500) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const timer = setInterval(() => {
        if (shown.some((r) => r.dir === 'echo' && r.text === line)) { clearInterval(timer); resolve(performance.now() - t0); }
        else if (performance.now() - t0 > ms) { clearInterval(timer); resolve(null); }
      }, 15);
    });
  }

  function put(msg) {
    const out = wire.send(msg);
    if (out) show('out', out.bytes, out.sent ? out.line : `refused here: ${out.bytes} B is over the ${LIMITS.maxBytes} B roof`,
      false, out.sent && !!msg.store);
    if (out?.sent && msg.store) stored.push(out.line);
    return out;
  }

  // ── the recorder, asked for before anything is sent ──────────────────────
  // It joins the room as an ordinary socket, so the relay still parses nothing.
  // Never awaited without a ceiling: a page that cannot reach the history must
  // say so, not hang.
  async function startRecording() {
    try {
      const res = await fetch(`${STORE}/room/${ROOM}/record`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cap: CAP }),
        signal: AbortSignal.timeout(4000),
      });
      const j = await res.json();
      recording = !!j.recording;
      recordNote = recording ? `recording, keeps ${j.cap}` : 'the recorder could not join';
    } catch (e) {
      recording = false;
      recordNote = `no history here: ${String(e.name || e)}`;
    }
    log(recordNote, recording ? 'info' : 'bad');
  }

  async function readHistory(query = `last=${CAP * 4}`) {
    const res = await fetch(`${STORE}/room/${ROOM}/history?${query}`, { signal: AbortSignal.timeout(4000) });
    const text = await res.text();
    // ⚠️ THE HEADER NAME IS A CROSS-WIRE RENAME AND NOTHING TYPE-CHECKS IT.
    // It read `X-Backlog` for one deploy while the worker sent `X-Store`, so
    // `held` parsed to 0 and `the cap holds` failed against a working store.
    const header = res.headers.get('X-Store') || '';
    const num = (k) => Number(new RegExp(`${k}=(\\d+)`).exec(header)?.[1] ?? 0);
    const held = num('kept'); const seen = num('seen'); const oldest = num('oldest');
    const rows = text.split('\n').filter(Boolean);
    // ⚠️ THE HISTORY SEEDS THE LIST, IT DOES NOT REPLACE IT, or a check that
    // reads it would wipe the live rows it had just put there.
    if (!seeded) {
      seeded = true;
      msgs.set(rows.map((r) => rowOf({ dir: '', bytes: new TextEncoder().encode(r).length, stored: true, text: short(r) })));
    }
    return { rows, held, seen, oldest };
  }

  /** Our own lines, in the order we sent them, allowing for other people's
   *  messages in a shared room and for the cap having eaten the front. */
  const oursInOrder = (rows) => {
    const ours = rows.filter((r) => stored.includes(r));
    const at = ours.map((r) => stored.indexOf(r));
    return { count: ours.length, ok: at.every((p, i) => i === 0 || p > at[i - 1]) };
  };

  // ── controls ────────────────────────────────────────────────────────────
  // Every assert below is made by the tab's own `A`, which `check()` hands in.
  // A visitor pressing these gets the same work and the asserts are recorded
  // the same way: they only read what the press already did.
  let A = (what, pass, detail) => d.assert(`BYTES: ${what}`, pass, detail);

  on('send', async () => {
    const rtt = await wire.ping();
    const out = put({ type: TYPE, value: body.value, store: false });
    const back = out?.sent ? await echoOf(out.line) : null;
    A('relay open', wire.state() === 1, String(wire.state()));
    A('the message comes back byte for byte', back !== null && out?.sent === true,
      out ? `${out.bytes} B, back in ${back === null ? 'never' : `${back.toFixed(0)} ms`}` : 'not sent');
    A('round trip answered without waking the room', rtt !== null && rtt < 2000,
      rtt === null ? 'no pong' : `${rtt.toFixed(1)} ms`);
    await readHistory().catch(() => {});
  });

  on('store', async () => {
    const out = put({ type: TYPE, value: body.value, store: true });
    const back = out?.sent ? await echoOf(out.line) : null;
    let h = { rows: [], held: 0, seen: 0 };
    let reached = true;
    try { h = await readHistory(); } catch { reached = false; }
    A('a stored message comes back AND lands in the history',
      back !== null && reached && h.rows.includes(out.line),
      out ? `${out.bytes} B, ${h.held} held of ${h.seen} seen` : 'not sent');
    A('the one sent without storing is not in there',
      reached && !h.rows.some((r) => r.includes('"store":false')),
      `${h.rows.length} rows, none of them unstored`);
  });

  on('bytes', async () => {
    const payload = new TextEncoder().encode(`${TYPE}:${body.value}`);
    lastBinaryIn = null;
    const seqBefore = wire.stats().seq;
    const out = wire.sendBinary(payload.buffer);
    if (out) show('bytes out', out.bytes, hex(payload.buffer));
    for (let i = 0; i < 100 && !lastBinaryIn; i++) await sleep(5);
    const got = lastBinaryIn ? new Uint8Array(lastBinaryIn) : null;
    const same = !!got && got.length === payload.length && got.every((b, i) => b === payload[i]);
    A('bytes come back unchanged, not base64', same,
      got ? `${got.length} B in, ${payload.length} B out` : 'nothing came back');
    // The real fact is that the counter did NOT advance: there is nowhere in a
    // binary frame to put one, so this message is invisible to the loss check.
    A('a binary frame carries no counter', out?.sent === true && wire.stats().seq === seqBefore,
      `counter still at ${seqBefore}, the bytes had nowhere to carry it`);
  });

  on('toobig', async () => {
    // Prove the guard fires. The counter still advances, so the NEXT message
    // arrives with a hole in front of it.
    const before = wire.stats().missing;
    const refused = put({ type: 'toobig', value: 'x'.repeat(LIMITS.maxBytes + 1024) });
    const after = put({ type: TYPE, value: 'the one after the hole', store: true });
    if (after?.sent) await echoOf(after.line);
    const s = wire.stats();
    A('one over the roof is refused, not truncated', refused?.sent === false,
      `${refused?.bytes ?? 0} B against a ${LIMITS.maxBytes} B roof`);
    A('the loss shows up as a hole in the count', s.missing > before,
      `${s.missing - before} missing, seen by the receiver`);
  });

  on('overfill', async () => {
    // Retention is a decision, not a default. One that is delivered and NOT
    // stored, then one more than the room holds.
    const passing = put({ type: 'chatter', value: 'delivered, not stored', store: false });
    if (passing?.sent) await echoOf(passing.line);
    for (let i = 1; i <= CAP + 1; i++) put({ type: 'fill', value: `fill ${i}`, store: true });
    await sleep(400);
    let h = { rows: [], held: 0, seen: 0 };
    let reached = true;
    try { h = await readHistory(); } catch { reached = false; }
    const order = oursInOrder(h.rows);
    A('the history answers over an ordinary web request', reached && recording, recordNote);
    A('it hands back our own lines in the order the socket delivered them',
      order.count > 0 && order.ok, `${order.count} of ours among ${h.rows.length}`);
    A('what was not marked store is delivered but not stored',
      passing?.sent === true && !h.rows.some((r) => r.includes('delivered, not stored')),
      `${h.held} held of ${h.seen} seen`);
    A('the cap holds: one more in, the oldest out', h.held === CAP,
      `${h.held} held against a cap of ${CAP}`);
  });

  on('clear', async () => {
    // THIS ROOM, which is what the label says, never the worker's `/clear-all`.
    let wiped = null;
    try {
      const res = await fetch(`${STORE}/room/${ROOM}/clear`, { method: 'POST', signal: AbortSignal.timeout(8000) });
      wiped = await res.json();
    } catch (e) { log(`clear failed: ${String(e.name || e)}`, 'bad'); }
    stored.length = 0;
    let after = { rows: [], held: 0 };
    try { after = await readHistory(); } catch { /* asserted below */ }
    log(wiped ? `cleared ${ROOM}` : 'clear did not answer', wiped ? 'hi' : 'bad');
    A('clearing empties this room and leaves the counts saying so',
      wiped?.cleared === true && after.held === 0, `${after.held} held after, room ${ROOM}`);
  });

  // ── on build: the history, because what somebody else left is the subject ──
  const booted = (async () => {
    await startRecording();
    for (let i = 0; i < 200 && wire.state() !== 1; i++) await sleep(10);
    let opening = { rows: [], held: 0 };
    let openOk = true;
    try { opening = await readHistory(); } catch { openOk = false; msgs.clear('the history did not answer'); }
    A('the history is on the page before anything is sent', openOk && recording,
      openOk ? `${opening.held} held on arrival, ${recordNote}` : recordNote);
    log(`room ${ROOM}: open a second copy to see both sides, ?checks=1 shows the checks`, 'hi');
  })();

  return {
    wire,
    async check({ A: tabA }) {
      A = tabA;
      await booted;
      // The order the harness pressed `.pos-controls` in, each one awaited.
      for (const s of SPECS) await run(s.id);
    },
  };
}
