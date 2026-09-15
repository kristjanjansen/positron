// demo/shell/feedback.mjs — the box behind the button beside every demo title.
//
// A visitor writes four lines and presses send. The lines go over the project's
// own relay, into a room of their own, to `workers/feedback` — which joined
// that room as an ordinary socket, exactly the way `workers/store` does, so the
// relay still parses nothing. Then the page READS THE NOTE BACK over HTTP
// before it says the word "kept", because an unconfirmed send is the one thing
// a feedback button must never do: a control that reports success it has not
// checked is worse than one that reports failure.
//
// 🔴 A SUITE RUN MUST NOT BE ABLE TO WRITE INTO THE REAL ROOM, and that is the
// whole reason this file is shaped the way it is. `demo/verify.mjs` presses
// every control on every page on every run, and CLAUDE.md records what happened
// the last time a shared resource sat behind forty partitioned ones: one FCM
// topic, and every run of the suite sent two real notifications to every real
// subscriber, for a day, before anyone outside said so. The rule it left behind
// is an allowlist of ONE, never a test for things that LOOK like tests, because
// the default has to be silence.
//
// There are four gates and three of them hold on their own:
//
//   1. THE ROOM COMES FROM THE ORIGIN, exact match, one entry. Anything that is
//      not `https://positron.studio` writes into `feedback-dev`, which is a
//      different Durable Object that the real table never reads.
//   2. THE SERVER DECIDES THE SAME THING, from the `Origin` header on `/arm`,
//      which a page cannot forge. No query parameter, body field or path can
//      move a write into the real room. A harness on 127.0.0.1 is refused the
//      real room by the server, not by its own good manners.
//   3. THE RECORDER REFUSES a note whose declared origin is not the live one,
//      so a write into the real room has to LIE rather than slip in while a
//      real visitor happens to be holding the room open. Proved by sending one:
//      echoed by the relay, refused by the recorder, 0 rows.
//   4. ONLY A PERSON CAN PRESS SEND. `shell.mjs` refuses an untrusted click,
//      so `element.click()` — which is how this harness presses everything —
//      does nothing at all, and `mount()` proves it by trying on every page.
//
// ⚠️ GATE 1 IS ALSO WHY THE ROUND TRIP CAN BE CHECKED AT ALL. The sandbox room
// is a real room with a real recorder and a real table, so `/feedback/` drives
// the whole chain — arm, relay, recorder, SQLite, HTTP read — every time the
// suite runs, and lands in a store nobody reads. A guard that made the feature
// untestable would have been traded for one that makes it untested.

import { el, BUILD } from './shell.mjs';
import { createField } from './field.mjs';
import { openWire, randomId } from './wire.mjs';

export const FEEDBACK_BASE = 'https://feedback.positron.studio';

// 🔴 THE ALLOWLIST. `workers/feedback/src/index.js` holds the same three lines
// and the two are CHECKED AGAINST EACH OTHER on every send — the page says
// which room it expects, the server says which room it picked, and a send
// stops if they differ. A shared decision in two files is a decision that will
// disagree; this one cannot disagree quietly.
export const LIVE_ORIGIN = 'https://positron.studio';
export const LIVE_ROOM = 'feedback';
export const DEV_ROOM = 'feedback-dev';

/** Which room this origin writes into. Exact match, no prefix test. */
export const roomFor = (origin) => (origin === LIVE_ORIGIN ? LIVE_ROOM : DEV_ROOM);

/** Is this the published site, the only place feedback is read from. */
export const isLive = (origin = location.origin) => origin === LIVE_ORIGIN;

// A relay message may be 1000 KiB, which is not a limit anybody typing into a
// four line box will meet. This one is a limit a person can reach by pasting,
// and it is refused IN WORDS with the count, rather than by a `maxlength` that
// silently stops the keyboard working.
const MAX_CHARS = 2000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Resolve, or give up saying so. A measurement that never returns is worse
 *  than one that reports it could not be taken, and a send that hangs leaves a
 *  person staring at a button. */
function within(ms) {
  let done;
  const p = new Promise((res) => { done = res; });
  const timer = setTimeout(() => done(false), ms);
  return { p, hit: () => { clearTimeout(timer); done(true); } };
}

/**
 * Send one note and confirm it is stored. Never throws; it returns what
 * happened in a sentence the panel can print.
 *
 * ⚠️ IT IS NOT THE BUTTON'S HANDLER. The button is guarded on `isTrusted` in
 * `shell.mjs`; this is the plain function underneath it, so `/feedback/` can
 * drive the whole chain as a check without synthesising a press. A page calling
 * it is bound by gates 1 to 3 exactly as a person is.
 *
 * @returns {Promise<{ok:boolean, said:string, id?:string, room?:string}>}
 */
export async function sendNote({ slug = '', text = '', name = '', tries = 8 } = {}) {
  const body = String(text || '').trim();
  if (!body) return { ok: false, said: 'there is nothing in the box yet' };
  if (body.length > MAX_CHARS) {
    return { ok: false, said: `that is ${body.length} characters and the box takes ${MAX_CHARS}` };
  }
  const want = roomFor(location.origin);

  // 1. wake the recorder into the room, and do not return until its socket is
  //    open — otherwise this page races its own message into a room nothing is
  //    listening to, which is a send that looks fine and is lost.
  let armed;
  try {
    const r = await fetch(`${FEEDBACK_BASE}/arm`, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return { ok: false, said: `the feedback service answered ${r.status}` };
    armed = await r.json();
  } catch (e) {
    return { ok: false, said: `the feedback service did not answer (${e.name || e})` };
  }
  if (!armed.armed) {
    return { ok: false, said: 'the recorder could not join the room, so nothing would be kept' };
  }
  if (armed.room !== want) {
    // The two halves of the allowlist disagree. Refusing is the only safe act:
    // one of them is wrong and neither can tell which.
    return { ok: false, said: `this page expects ${want} and the service picked ${armed.room}` };
  }

  // 2. the wire. `reconnect: false` because a send is one act with a deadline,
  //    not a session — a retry loop behind a button is a button that keeps
  //    working long after the person has gone.
  const id = randomId(12);
  const open = within(5000);
  const echo = within(5000);
  let wire = null;
  try {
    wire = openWire(armed.room, {
      reconnect: false,
      onOpen: () => open.hit(),
      onMessage: (got) => { if (got.kind === 'json' && got.msg?.id === id) echo.hit(); },
    });
    // ⚠️ A FULL ROOM IS A SILENT OUTAGE AND A BROWSER CANNOT READ THE STATUS OF
    // A FAILED UPGRADE. `studio-1` sat at 16 of 16 for hours reading as a
    // network fault on the Raspberry Pi. `/stats` is an ordinary CORS-clear GET
    // and it answers with `sockets` against `limits.maxSockets`, so ASK rather
    // than infer from a silence. Best effort, and never in the way of the
    // sentence that is already true.
    if (!(await open.p)) {
      let why = '';
      try {
        const s = await (await fetch(
          `https://ws.positron.studio/room/${armed.room}/stats`,
          { cache: 'no-store', signal: AbortSignal.timeout(2500) })).json();
        const max = s.limits?.maxSockets;
        if (max && s.sockets >= max) why = `, and the room is full at ${s.sockets} of ${max}`;
      } catch { /* one unanswered question is not the answer */ }
      return { ok: false, said: `the relay did not open in five seconds${why}` };
    }

    const out = wire.send({
      type: 'feedback.say',
      store: true,                 // the project's word for "this one is worth keeping"
      id,
      slug,
      page: location.pathname,
      name: String(name || '').trim().slice(0, 80),
      text: body,
      origin: location.origin,
      build: BUILD,
    });
    if (!out?.sent) return { ok: false, said: 'the relay refused the message for its size' };

    // The relay sends every message back to its sender, so our own line
    // returning is the proof it was fanned out to the room rather than dropped
    // by the token bucket, which reports nothing to a sender when it bites.
    if (!(await echo.p)) return { ok: false, said: 'the relay did not carry it back' };

    // 3. and the only claim worth making: it is IN THE STORE, asked of the same
    //    address an agent reads. Not an acknowledgement somebody sent us.
    for (let i = 0; i < tries; i++) {
      try {
        const r = await fetch(`${FEEDBACK_BASE}/feedback?room=${armed.room}&id=${id}`,
          { cache: 'no-store', signal: AbortSignal.timeout(4000) });
        if (r.ok) {
          const j = await r.json();
          if (j.shown > 0) {
            return { ok: true, id, room: armed.room, at: j.notes[0].at, said: `kept · ${id}` };
          }
        }
      } catch { /* one slow read is not a failed send */ }
      await sleep(400);
    }
    return { ok: false, said: 'it reached the relay but has not appeared in the store' };
  } finally {
    try { wire?.close(); } catch { /* already gone */ }
  }
}

/**
 * The panel. Built once, on the first press, and shown and hidden after that.
 *
 * 🔴 IT IS A FIXED OVERLAY AND IT IS APPENDED TO `document.body`, not into the
 * page. Two rules meet here. CLAUDE.md: nothing that changes while somebody is
 * looking at it may change how much room it takes — a panel unfolding under the
 * title would push a canvas, a readout, a transport bar and a log down the page
 * every time it opened. And the shell's vertical rhythm lives on
 * `.pos-body > * + *`, so anything dropped inside the page would take a 22 px
 * gap it has no business taking. Fixed and outside, the page does not move.
 */
export function openFeedback(d, { slug = '' } = {}) {
  let ui = document.querySelector('.pos-fb');
  if (ui) { show(ui); return ui; }

  const live = isLive();
  const room = roomFor(location.origin);

  ui = el('div', 'pos-fb');
  const box = el('div', 'pos-fb-box');
  const top = el('div', 'pos-fb-top');
  // 🔴 THE PAGE'S NAME IS IN THE TITLE, WHICH IS WHERE THE NOTE USED TO PUT IT.
  // `feedback` plus a paragraph saying "About crate" is the same fact twice, and
  // the paragraph was the half that cost two lines and a gap. `crate feedback`
  // says which page this is about in the place a reader looks first.
  top.append(el('h2', 'pos-fb-h', `${slug || 'this page'} feedback`));
  const x = el('button', 'pos-fb-x', '×', { type: 'button', 'aria-label': 'close' });
  top.append(x);
  box.append(top);

  // ⚠️ IT SAYS WHERE THE WORDS GO, because a page that is not the published
  // site is not collecting anything and must not look as though it is. This is
  // the only branch in the panel and both halves are true sentences about the
  // same mechanism, not a working control and a broken one.
  // The note is gone: the title carries the page name and the placeholders say
  // what to write and that a name is optional. What a sandbox copy does still
  // has to be said, because that one is not guessable from anything on screen.
  if (!live) {
    box.append(el('p', 'pos-fb-note',
      'This copy is not the published site, so it goes to a sandbox that nobody reads.'));
  }

  // ⚠️ NO `grow: 'wide'`. That variant is a flex BASIS, and the basis in this
  // column is the height — see `.pos-fb-box > .pos-field` in shell.css.
  const msg = createField({
    label: 'message', rows: 4,
    placeholder: 'what worked, what did not, what is missing',
  });
  box.append(msg.el);

  const row = el('div', 'pos-fb-row');
  const who = createField({ label: 'name', placeholder: 'optional' });
  row.append(who.el);
  const send = el('button', 'pos-pri pos-fb-send', 'Send', { type: 'button' });
  row.append(send);
  box.append(row);

  const said = el('p', 'pos-fb-said', '');
  box.append(said);

  const say = (t, kind) => {
    said.textContent = t;
    said.className = `pos-fb-said${kind ? ` ${kind}` : ''}`;
  };

  // ⚠️ ONE SEND AT A TIME, AND A FLOOR UNDER TWO OF THEM, BECAUSE THIS IS THE
  // ONLY PLACE A PERSON HOLDING THE BUTTON DOWN IS BOUNDED. The relay's bucket
  // is 1000 messages a second with a burst of 2000 (read off the deployed
  // worker, not remembered) and it tells a sender NOTHING when it bites, so it
  // is no help at all here. And the recorder's twenty-a-minute cap counts a
  // SOCKET, while every send here opens a fresh one — so it catches a script
  // holding one connection open and floods it, which is the shape a flood
  // actually takes, and it does not bind a person pressing a button. That
  // person is bound here: disabled while one send is in flight, and refused
  // with a reason inside two seconds of the last.
  let busy = false, lastAt = 0;
  async function go() {
    if (busy) return;
    if (Date.now() - lastAt < 2000) { say('one at a time, give it a moment', 'bad'); return; }
    busy = true;
    send.disabled = true;
    say('sending');
    try {
      const out = await sendNote({ slug, text: msg.value(), name: who.value() });
      say(out.said, out.ok ? 'ok' : 'bad');
      d?.log(out.ok ? `feedback sent · ${out.id}` : `feedback not sent: ${out.said}`,
        out.ok ? 'hi' : 'bad');
      if (out.ok) {
        // The text goes, the name stays: somebody writing a second note is the
        // same person. Clearing only on success means a failed send never eats
        // what was written, which is the failure people do not forgive.
        msg.set('');
        lastAt = Date.now();
      }
    } finally {
      busy = false;
      send.disabled = false;
    }
  }
  send.addEventListener('click', go);

  const close = () => hide(ui);
  x.addEventListener('click', close);
  // A press on the dark ground closes it; a press inside the box does not.
  ui.addEventListener('mousedown', (e) => { if (e.target === ui) close(); });
  ui.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  ui.append(box);
  document.body.append(ui);
  show(ui);
  msg.input.focus();
  return ui;
}

function show(ui) {
  ui.hidden = false;
  document.querySelector('.pos-fb-btn')?.setAttribute('aria-expanded', 'true');
}

function hide(ui) {
  ui.hidden = true;
  const btn = document.querySelector('.pos-fb-btn');
  btn?.setAttribute('aria-expanded', 'false');
  btn?.focus();
}
