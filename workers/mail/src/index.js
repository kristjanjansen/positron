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
 *
 * 🔴 SPAM IS LABELLED, NOT DROPPED. `src/spam.mjs` reads the headers and hands
 * back a short verdict, and the verdict goes on the FRONT of the note, ahead of
 * the subject, where somebody scanning the room reads it in a glance. A dropped
 * message is invisible and unrecoverable; a labelled one costs a reader nothing.
 * The same rule this repo already keeps about a vanished row: a missing thing
 * reads as a thing that was never sent, which is a different and false
 * statement.
 *
 * ⚠️ THERE IS ONE REFUSAL AND IT IS THE SENDER'S OWN INSTRUCTION. A message
 * failing DMARC from a domain that publishes `p=reject` has been declared forged
 * by the domain in its own From line, and `reject` is the answer that domain
 * asked receivers to give. Even then the note is spoken FIRST, so a refusal is
 * recorded rather than silent.
 */

import {
  classifyRaw, classify, parseHeaderBlock, addressDomain, prefixFor,
} from './spam.mjs';

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
 * 🔴 `new Response(raw).text()` LOSES BYTES ON AN 8-BIT BODY AND SAYS NOTHING.
 * So the size is checked rather than assumed, and a mismatch is reported in the
 * note instead of being swallowed. The sibling project at ../trip reads its mail
 * exactly the lossy way.
 *
 * 🔴 AND THE CHECK THAT USED TO STAND HERE WAS WRONG IN BOTH DIRECTIONS.
 * It compared `raw.length`, which counts UTF-16 units, against `rawSize`, which
 * counts BYTES. MEASURED 2026-09-17, three messages through a real `Response`:
 *
 *   pure ASCII, nothing lost      rawSize  22 · .length 22 · re-encoded 22
 *   valid UTF-8, nothing lost     rawSize  48 · .length 44 · re-encoded 48
 *   two invalid 8-bit bytes       rawSize  18 · .length 18 · re-encoded 22
 *
 * The middle row is a FALSE ALARM on every message containing an accented
 * letter, which in this part of the world is most of them. The last row is a
 * MISS on the exact case the check exists for: two invalid bytes each became one
 * replacement character, so the unit count matched while four bytes of content
 * changed. A guard that passes on the case it was written for is worse than no
 * guard, because it is believed.
 *
 * Re-encoding answers both. A message that survived intact re-encodes to exactly
 * the bytes that arrived; a replacement character is three bytes where the
 * original was one or two, so a loss cannot come back to the same length.
 */
async function readRaw(message) {
  const raw = await new Response(message.raw).text();
  const declared = Number(message.rawSize) || 0;
  const back = new TextEncoder().encode(raw).byteLength;
  return { raw, declared, bytes: back, lost: !!declared && back !== declared };
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

/**
 * What the headers say, and never a reason for the handler to fail.
 *
 * 🔴 THE HEADERS ARE READ OFF THE RAW MESSAGE, NOT OFF `message.headers`.
 * A `Headers` joins two headers of one name into one comma separated value, so
 * a stranger's forged `Authentication-Results` and the receiving server's real
 * one would arrive glued together under the STRANGER's authserv-id, which is
 * precisely the one that must not be believed. Read off the raw text they stay
 * two lines and the real one is picked by its name.
 *
 * ⚠️ THE FALLBACK FAILS SAFE. If the raw read gave nothing usable, the `Headers`
 * are used and a joined value parses as one stamp with a nonsense authserv-id,
 * which fails the trust check and answers `unknown`. Unknown labels and never
 * refuses, so the wrong answer in that path is the harmless one.
 *
 * ⚠️ AND A THROW IN HERE WOULD COST THREE INVOCATIONS AND BOUNCE THE SENDER,
 * because Cloudflare retries a failing handler three times before giving up. It
 * is wrapped, and a failure to grade is reported as a failure to grade.
 */
function label(message, raw) {
  try {
    const entries = parseHeaderBlock(raw);
    const seen = entries.some(([k]) => k === 'authentication-results' || k === 'from');
    return seen
      ? classifyRaw(raw, message.from)
      : classify({ headers: message.headers, envelopeFrom: message.from });
  } catch (err) {
    return {
      verdict: 'unknown',
      label: '[unknown · the check did not run]',
      chips: ['unknown', 'the check did not run'],
      reject: false,
      rejectReason: '',
      auth: {},
      flags: {},
      reasons: [`the labeller threw: ${err && err.message}`],
    };
  }
}

export default {
  async email(message, env, ctx) {
    const { raw, declared, bytes, lost } = await readRaw(message);
    const subject = header(message, 'subject').slice(0, MAX_SUBJECT);
    const messageId = header(message, 'message-id').slice(0, 120);
    const body = firstText(raw).slice(0, MAX_BODY);

    const verdict = label(message, raw);

    /**
     * ⚠️ THE SENDER GOES IN THE NAME, AND IT IS THE ENVELOPE SENDER RATHER THAN
     * THE `From:` HEADER. A header can say anything; `message.from` is what the
     * sending server actually presented. Neither is proof of identity and the
     * note does not pretend it is.
     */
    const name = String(message.from || 'somebody').slice(0, MAX_NAME);

    /**
     * 🔴 THE LABEL GOES FIRST, AHEAD OF THE SUBJECT. The feedback room is a list
     * somebody scans, and a verdict at the end of a line is a verdict nobody
     * reads. `[ok]` on ordinary mail is four characters and it is deliberate: an
     * empty prefix cannot be told apart from a build that has no labelling in it.
     */
    const refused = verdict.reject;
    const face = prefixFor(verdict, { refused });

    // ⚠️ THE FOOT IS BUILT SEPARATELY RATHER THAN JOINED WITH EMPTY STRINGS. A
    // conditional entry that is `''` still contributes its separator, so a
    // message with nothing to add grew a trailing blank line and one with
    // something to add grew three.
    const foot = [
      lost ? '[the raw message did not read back at its declared size]' : '',
      refused ? `[refused at the door: ${verdict.rejectReason}]` : '',
    ].filter(Boolean);

    const text = [
      `${face} ${subject || '(no subject)'}`,
      '',
      body || '(no text in this message)',
      ...(foot.length ? ['', ...foot] : []),
    ].join('\n').trim();

    // An id from the Message-ID, so a retry from the sending server is the same
    // note rather than a second one. The recorder inserts OR IGNORE on it.
    const id = messageId || `mail-${Date.now()}-${randomId()}`;

    /**
     * ⚠️ THE DOMAIN, NEVER THE ADDRESS, AND NEVER THE BODY. A stranger's address
     * is theirs, and CLAUDE.md's rule about redacting at the point of capture is
     * the same discipline. The subject is cut to eighty characters because a log
     * line is a trace rather than a copy.
     */
    console.log(JSON.stringify({
      evt: 'mail',
      from: addressDomain(message.from),
      verdict: verdict.verdict,
      chips: verdict.chips,
      auth: verdict.auth,
      reasons: verdict.reasons,
      refused,
      bytes,
      declared,
      lost,
      subject: subject.slice(0, 80),
    }));

    // 🔴 SPEAK FIRST, REFUSE SECOND. A refusal that leaves no trace is a message
    // nobody can ever find out about, and the whole point of labelling instead
    // of dropping is that a decision stays visible. The note lands either way.
    await sayIntoRoom({ id, name, text });

    if (refused) message.setReject(verdict.rejectReason);

    void ctx; void env;
  },
};
