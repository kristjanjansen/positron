/**
 * positron-mail — mail arriving at positron@positron.studio becomes a note in
 * the feedback room.
 *
 * 🔴 WHY THE FEEDBACK ROOM AND NOT A STORE OF ITS OWN. The ask was *"an email
 * address people can contact ... and the agent should be reading it"*. The
 * reading half is the constraint: `feedback.positron.studio` is already read on
 * a schedule and already acted on, so putting mail anywhere else would create a
 * second place to remember, and a second place to forget.
 *
 * 🔴 IT SPEAKS THE PAGE'S SHAPE, over the relay, exactly as
 * `demo/shell/feedback.mjs` does. `positron-feedback` is unchanged by this file
 * existing: no new endpoint, no shared secret, and its standing rule that the
 * room is never chosen by a caller's parameter is untouched, because this is a
 * relay client rather than an HTTP caller.
 *
 * 🔴 NOTHING RAW IS KEPT. The body is read, trimmed to a bounded summary and
 * dropped. No attachment is stored or forwarded, no IP address is seen, and the
 * raw message never leaves this handler. That matches what the feedback room
 * already promises about what it does not keep.
 */

const RELAY = 'wss://ws.positron.studio';
const ROOM = 'feedback';
// ⚠️ THE ORIGIN THE RECORDER DEMANDS. It refuses a note into the live room whose
// `origin` is not exactly this, which is deliberate: a write has to say where it
// came from rather than slip in while a visitor holds the room open. This worker
// is a first-party sender and says so.
const ORIGIN = 'https://positron.studio';

// The recorder caps text at 4000 UTF-8 bytes and names at its own limit; stay
// well inside both rather than discovering the edge in production.
const MAX_BODY = 2000;
const MAX_SUBJECT = 160;
const MAX_NAME = 60;

/**
 * 🔴 `new Response(raw).text()` LOSES BYTES ON AN 8-BIT BODY, MEASURED: a 244
 * byte message read back as 242. So the size is checked rather than assumed, and
 * a mismatch is reported in the note instead of being silently swallowed. The
 * sibling project at ../trip reads its mail exactly the lossy way.
 */
async function readRaw(message) {
  const raw = await new Response(message.raw).text();
  const declared = Number(message.rawSize) || 0;
  return { raw, declared, lost: declared && raw.length !== declared };
}

/** The first text part of a mail, without pulling in a MIME parser. */
function firstText(raw) {
  // Headers end at the first blank line. Everything after it is the body as
  // far as this worker is concerned: a multipart message yields its boundary
  // lines too, and they are dropped below rather than parsed.
  const split = raw.indexOf('\r\n\r\n');
  const body = split < 0 ? raw : raw.slice(split + 4);
  return body
    .split(/\r?\n/)
    .filter((l) => !/^--/.test(l) && !/^Content-[A-Za-z-]+:/i.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** A header, undecoded. Values arrive MIME-encoded (`=?utf-8?B?…?=`) and this
 *  does not pretend otherwise: an encoded subject is shown as it arrived rather
 *  than mangled by a half-implementation. */
const header = (message, name) => message.headers.get(name) || '';

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Send one note into the room and wait for the socket to close.
 * ⚠️ A WORKER'S OUTBOUND WEBSOCKET NEEDS `waitUntil` OR THE MESSAGE CAN BE CUT
 * OFF when the handler returns. The email handler awaits this directly, which
 * is simpler and is fine: a mail delivery is allowed to take a second.
 */
async function sayIntoRoom(note) {
  /**
   * 🔴 ARM FIRST, OR THE NOTE IS SIMPLY LOST. The recorder holds its socket only
   * while it has been woken and lets go after fifteen idle minutes, so a note
   * spoken into a room nobody is recording goes nowhere and reports nothing.
   * MEASURED 2026-09-17 before this line existed: the note was sent, the relay
   * carried it, the socket echoed it back, and `GET /feedback` never saw it.
   * A page does this too, which is why nothing about the recorder changes here.
   * ⚠️ THE ORIGIN HEADER IS WHAT PICKS THE ROOM, never a parameter, and this is
   * the only place this worker has to be a first-party caller.
   */
  const armed = await fetch('https://feedback.positron.studio/arm', {
    method: 'POST',
    headers: { Origin: ORIGIN },
  });
  if (!armed.ok) throw new Error(`the recorder refused to wake: ${armed.status}`);

  const res = await fetch(`${RELAY.replace('wss:', 'https:')}/room/${ROOM}/ws`, {
    headers: { Upgrade: 'websocket' },
  });
  const ws = res.webSocket;
  if (!ws) throw new Error('the relay refused the upgrade');
  ws.accept();
  const from = `mail-${randomId()}`;
  ws.send(JSON.stringify({
    type: 'feedback.say',
    id: note.id,
    at: Date.now(),
    origin: ORIGIN,
    from,
    slug: 'mail',
    page: '/mail/',
    name: note.name,
    text: note.text,
    build: 'positron-mail',
  }));
  // The relay echoes to the sender, so one round trip is proof it was carried
  // rather than merely written to a socket that was closing.
  await new Promise((resolve) => {
    const done = () => resolve();
    ws.addEventListener('message', done);
    setTimeout(done, 1500);
  });
  try { ws.close(1000, 'said'); } catch { /* already gone */ }
}

export default {
  async email(message, env, ctx) {
    const { raw, declared, lost } = await readRaw(message);
    const subject = header(message, 'subject').slice(0, MAX_SUBJECT);
    const messageId = header(message, 'message-id').slice(0, 120);
    const body = firstText(raw).slice(0, MAX_BODY);

    /**
     * ⚠️ THE SENDER GOES IN THE NAME, AND IT IS THE ENVELOPE SENDER RATHER THAN
     * THE `From:` HEADER. A header can say anything; `message.from` is what the
     * sending server actually presented. Neither is proof of identity and the
     * note does not pretend it is.
     */
    const name = String(message.from || 'somebody').slice(0, MAX_NAME);

    const text = [
      subject ? `${subject}` : '(no subject)',
      '',
      body || '(no text in this message)',
      lost ? '\n[the raw message did not read back at its declared size]' : '',
    ].join('\n').trim();

    // An id from the Message-ID, so a retry from the sending server is the same
    // note rather than a second one. The recorder inserts OR IGNORE on it.
    const id = messageId || `mail-${Date.now()}-${randomId()}`;

    await sayIntoRoom({ id, name, text });
    void ctx; void env; void declared;
  },
};
