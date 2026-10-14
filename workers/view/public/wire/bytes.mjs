// The BYTES tab of /wire/. Unlike the tab convention it joins and reads history
// when built, because what others left in the room is the subject. Its controls
// live in the tab, and check() presses them in order, awaiting each.
// See lessons/page-wire.md#wire-4

import { el } from '/shell/shell.mjs';
import { openWire, LIMITS, RELAY_BASE } from '/shell/wire.mjs';
import { createTable } from '/shell/table.mjs';
import { howIn, gradeHow } from './how.mjs';

// A page with no numbers: the list is the readout. `null` gives the tab's own
// report a log and no cells.
// What this tab is, in the fixed box under the tab row (`tab-page.mjs` rule 6).
export const about = 'Type a message and send it to see the exact bytes that go out to the relay and come back. Send and keep also stores it, so the next visitor finds it here.';

export const readout = null;

export function build({ panel, log, d }) {
  const q = new URLSearchParams(location.search);
  // One shared room by default, so the history found on load is what others left.
  // The manifest keeps `room: 'fixed'` so the harness does not rename it.
  // See lessons/page-wire.md#wire-5
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
  // No `kind` field: typed messages are chat; `toobig`, `fill` and `chatter` are set
  // by the checks that send them.
  // See lessons/page-wire.md#wire-6
  const TYPE = 'chat';
  const compose = el('div', 'compose');
  const body = el('input', 'body', null, { type: 'text', value: 'hello', 'aria-label': 'what it says' });
  compose.append(el('label', null, 'says'), body);

  // No primary here: the subject is the difference between sending and storing.
  // See lessons/page-wire.md#wire-7
  const SPECS = [
    { id: 'send', label: 'Send' },
    { id: 'store', label: 'Send and keep' },
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

  // One list: live traffic and stored history are the same messages, `stored` the
  // only difference. `text` does not clip, since the exact bytes are the subject.
  // See lessons/page-wire.md#wire-8
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
  // No wrapper: the table draws its own edge.
  // See lessons/page-wire.md#wire-9
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
  // Never awaited without a ceiling: an unreachable history must say so, not hang.
  // See lessons/page-wire.md#wire-10
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
    // The header name must match the worker's `X-Store`; nothing type-checks it.
    // See lessons/page-wire.md#wire-11
    const header = res.headers.get('X-Store') || '';
    const num = (k) => Number(new RegExp(`${k}=(\\d+)`).exec(header)?.[1] ?? 0);
    const held = num('kept'); const seen = num('seen'); const oldest = num('oldest');
    const rows = text.split('\n').filter(Boolean);
    // The history seeds the list, it does not replace it, or a check would wipe the
    // live rows it had just added.
    // See lessons/page-wire.md#wire-12
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
  // Every assert uses the tab's own `A` from check(); they only read what the press
  // already did, so a visitor's press does the same work.
  // See lessons/page-wire.md#wire-13
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
    // `?checks=1` is not advertised here: a visitor's log is not where a page
    // documents its own test switches, and the header above already does.
    log(`room ${ROOM}: open this page in a second browser to see both sides`, 'hi');
  })();

  // ── how it works, last in the tab, drawn on its first showing ─────────────
  // Read off this file: `openWire` to the relay, `startRecording` and
  // `readHistory` against the store, `put` listing a line the moment it goes.
  const kept = `${CAP} kept`;
  const SPEC = {
    caption: 'One WebSocket to a relay that keeps nothing, and a recorder beside it that keeps what you ask it to.',
    // Order is layout: Store, Browser, Relay is the one order of the twelve that
    // draws every return path clean at desk width and on a phone.
    // See lessons/page-wire.md#wire-14
    nodes: [
      { id: 'cfs', label: 'Cloudflare', sub: 'store worker', kind: 'cloud', tech: 'cloudflare',
        children: [
          { id: 'store', label: 'Store', sub: `SQLite, ${kept}`, tech: 'relay',
            note: 'Joins the room as one more WebSocket and writes each message marked **store** into its '
                + `SQLite table. This tab asks it to keep the newest ${CAP}, and nothing older than 24 hours.` },
        ] },
      { id: 'you', label: 'Browser', sub: 'this tab', kind: 'here', tech: 'browser',
        children: [
          { id: 'composer', label: 'composer', sub: 'one JSON line',
            note: 'Wraps what you type in the envelope every page here sends, with **type**, **from**, '
                + `**sent** and **seq**. A line over ${LIMITS.maxBytes.toLocaleString('en')} bytes is refused here and never leaves.` },
          { id: 'list', label: 'message list', sub: 'out, echo, in',
            note: 'Every line as the exact text that went out or came back, with its size in UTF-8 bytes. '
                + 'On arrival it is filled from the history, so you see what other people left.' },
        ] },
      { id: 'cfr', label: 'Cloudflare', sub: 'relay worker', kind: 'cloud', tech: 'cloudflare',
        children: [
          { id: 'relay', label: 'Relay', sub: 'Durable Object', tech: 'relay',
            note: 'One object per room holding every WebSocket in it, and it sends each message to all of '
                + 'them, the sender included. It parses nothing and keeps nothing.' },
        ] },
    ],
    links: [
      { from: 'composer', to: 'list',
        note: 'Your line is listed as out the moment it is sent, before the relay has answered.' },
      { from: 'composer', to: 'relay', label: 'JSON line',
        note: 'Text over one WebSocket, in the room called wire. Send the same as bytes goes as a binary '
            + 'frame instead, which has nowhere to carry the counter.' },
      { from: 'relay', to: 'list', label: 'echo', back: true,
        note: 'The same bytes back to every socket in the room. Your own echo is how this tab knows the '
            + 'relay had it, and how long that took.' },
      { from: 'relay', to: 'store', label: 'every line', back: true,
        note: 'The recorder is a member of the room like you, so the relay sends it every message, and it '
            + 'keeps only the ones marked store.' },
      { from: 'store', to: 'list', label: 'history',
        note: 'An ordinary HTTPS GET answered with one JSON line per message, oldest first, when the tab '
            + 'opens and after each press.' },
    ],
  };
  const how = howIn(panel);

  return {
    wire,
    show() { how.draw(SPEC); },
    async check({ A: tabA }) {
      A = tabA;
      await booted;
      // The order the harness pressed `.pos-controls` in, each one awaited.
      for (const s of SPECS) await run(s.id);

      await gradeHow(A, how, SPEC);
      // The boxes are the parts this tab really uses, each read off the thing
      // it stands for rather than off the picture.
      const relayHost = new URL(RELAY_BASE).host;
      const parts = {
        composer: panel.el.contains(compose),
        list: panel.el.contains(msgs.el),
        relay: wire.state() === 1,
        store: recording,
      };
      const missing = Object.entries(parts).filter(([, ok]) => !ok).map(([k]) => k);
      A('its boxes are the parts this tab uses: the composer, the list, an open relay socket and a recording store',
        missing.length === 0,
        missing.length ? `not true of ${missing.join(', ')}` : `socket open to ${relayHost}, store at ${new URL(STORE).host} recording`);
    },
  };
}
