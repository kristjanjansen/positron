// demo/shell/feedback.mjs: the feedback box. A note goes over the relay to workers/feedback and is
// read back over HTTP before the page says kept. A suite run must never write into the real room:
// the origin picks it, the server and recorder check it, and only a trusted click can send.
// why: lessons/kit-feedback.md#header

import { el, BUILD } from './shell.mjs';
import { createField } from './field.mjs';
import { openWire, randomId } from './wire.mjs';

export const FEEDBACK_BASE = 'https://feedback.positron.studio';

// The allowlist, one entry. workers/feedback/src/index.js holds the same; page and server check
// each other on every send and stop if they differ.
// why: lessons/kit-feedback.md#live-origin
export const LIVE_ORIGIN = 'https://positron.studio';
export const LIVE_ROOM = 'feedback';
export const DEV_ROOM = 'feedback-dev';

/** Which room this origin writes into. Exact match, no prefix test. */
export const roomFor = (origin) => (origin === LIVE_ORIGIN ? LIVE_ROOM : DEV_ROOM);

/** Is this the published site, the only place feedback is read from. */
export const isLive = (origin = location.origin) => origin === LIVE_ORIGIN;

// A limit a person can reach by pasting, refused in words with the count, not by `maxlength`.
// why: lessons/kit-feedback.md#max-chars
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
 * Send one note and confirm it is stored. Never throws; returns a sentence the panel can print.
 * Not the button's handler, so /feedback/ can drive the chain as a check; gates 1 to 3 still apply.
 * @returns {Promise<{ok:boolean, said:string, id?:string, room?:string}>}
 * why: lessons/kit-feedback.md#sendnote
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
    // A full room is a silent outage and a failed upgrade's status is unreadable, so ask `/stats`
    // (sockets against maxSockets). Best effort.
    // why: lessons/kit-feedback.md#full-room
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

    // 3. the only claim worth making: it is in the store, asked of the same address an agent reads.
    // why: lessons/kit-feedback.md#read-back
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
 * The panel, built on the first press. A fixed overlay on `document.body`, so opening it moves
 * nothing on the page and takes no `.pos-stack` gap.
 * why: lessons/kit-feedback.md#openfeedback
 */
export function openFeedback(d, { slug = '', context = null, onSent = null } = {}) {
  let ui = document.querySelector('.pos-fb');
  // The page's context is read on every opening, so a note carries the state it was written about.
  const ctx = () => { try { return String(context?.() ?? '').trim(); } catch { return ''; } };
  if (ui) { ui.fbCtx?.(ctx()); show(ui); return ui; }


  ui = el('div', 'pos-fb');
  const box = el('div', 'pos-fb-box');
  const top = el('div', 'pos-fb-top');
  // The page's name is in the title, `crate feedback`, not in a paragraph.
  // why: lessons/kit-feedback.md#title
  top.append(el('h2', 'pos-fb-h', `${slug || 'this page'} feedback`));
  const x = el('button', 'pos-fb-x', '×', { type: 'button', 'aria-label': 'close' });
  top.append(x);
  box.append(top);

  // No sandbox notice; `roomFor(origin)` still routes non-live origins to `feedback-dev`, and the
  // panel prints the room after a send.
  // why: lessons/kit-feedback.md#no-sandbox

  // No `grow: 'wide'`: that is a flex basis, and in this column the basis is the height.
  // why: lessons/kit-feedback.md#message-field
  const msg = createField({
    label: 'message', rows: 4,
    placeholder: 'what worked, what did not, what is missing',
  });
  box.append(msg.el);
  const ctxEl = el('pre', 'pos-fb-ctx', '');
  box.append(ctxEl);
  ui.fbCtx = (t) => { ctxEl.textContent = t ? `sent with it:\n${t}` : ''; ctxEl.hidden = !t; };
  ui.fbCtx(ctx());

  const row = el('div', 'pos-fb-row');
  const who = createField({ label: 'name', placeholder: 'optional' });
  row.append(who.el);
  /**
   * The ordinary button, not the primary: `button.pos-pri`'s 1px box-shadow ring makes it read taller
   * than the 34 px field beside it. Return fires it.
   * why: lessons/kit-feedback.md#send-button
   */
  const send = el('button', 'pos-fb-send', 'Send', { type: 'button' });
  // What Return does, on the control it does it to. The message box is a
  // textarea, so the combination is the one that works from inside it as well.
  send.title = 'send the note. Cmd or Ctrl and Return does the same';
  row.append(send);
  box.append(row);

  const said = el('p', 'pos-fb-said', '');
  box.append(said);

  const say = (t, kind) => {
    said.textContent = t;
    said.className = `pos-fb-said${kind ? ` ${kind}` : ''}`;
  };

  // One send at a time and refused within 2 s of the last: the relay's bucket (1000/s, 2000 burst)
  // says nothing when it bites, and the recorder's 20 a minute counts a socket, not a person.
  // why: lessons/kit-feedback.md#throttle
  let busy = false, lastAt = 0;
  async function go() {
    if (busy) return;
    if (Date.now() - lastAt < 2000) { say('one at a time, give it a moment', 'bad'); return; }
    busy = true;
    send.disabled = true;
    say('sending');
    try {
      const extra = ctx();
      const note = msg.value().trim();
      const out = await sendNote({ slug, text: note && extra ? `${note}\n\n--- context ---\n${extra}`.slice(0, MAX_CHARS) : note, name: who.value() });
      if (out.ok) { try { onSent?.(note, extra); } catch { /* the page's echo is never load-bearing */ } }
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
  /**
   * Send is the default: Escape closes, Return sends, but Cmd/Ctrl and Return in the textarea.
   * Not a `<form>`, whose submit navigation would stop the page's sound.
   * why: lessons/kit-feedback.md#keydown
   */
  ui.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Enter' || e.altKey || e.shiftKey) return;
    const typing = e.target === msg.input;
    if (typing && !(e.metaKey || e.ctrlKey)) return;
    e.preventDefault();
    go();
  });

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
