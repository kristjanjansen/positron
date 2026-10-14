// positron-mail: mail to positron@positron.studio becomes a note in the feedback room, spoken over
// the relay in the page's shape. Nothing raw is kept. Spam is labelled at the front, not dropped;
// the one refusal is DMARC failing under `p=reject`, and the note is spoken first even then.
// why: lessons/workers-mail.md#index-header

import { firstText, decodeWords } from './body.mjs';
import {
  classifyRaw, classify, parseHeaderBlock, addressDomain, prefixFor,
} from './spam.mjs';

const RELAY = 'wss://ws.positron.studio';
const ROOM = 'feedback';
// The live room's recorder demands exactly this origin; this worker is a first-party sender.
// why: lessons/workers-mail.md#origin
const ORIGIN = 'https://positron.studio';

// The recorder caps text at 4000 UTF-8 bytes and names at its own limit; stay
// well inside both rather than discovering the edge in production.
const MAX_BODY = 2000;
const MAX_SUBJECT = 160;
const MAX_NAME = 60;

// `new Response(raw).text()` loses bytes on an 8-bit body silently. Check loss by re-encoding and
// comparing to rawSize: comparing `.length` (UTF-16 units) to bytes is wrong both ways.
// why: lessons/workers-mail.md#read-raw
async function readRaw(message) {
  const raw = await new Response(message.raw).text();
  const declared = Number(message.rawSize) || 0;
  const back = new TextEncoder().encode(raw).byteLength;
  return { raw, declared, bytes: back, lost: !!declared && back !== declared };
}

// A header with RFC 2047 words decoded.
// why: lessons/workers-mail.md#header
const header = (message, name) => decodeWords(message.headers.get(name) || '');

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

// Send one note and wait for the socket to close; an outbound socket needs the handler awaited.
// why: lessons/workers-mail.md#say
async function sayIntoRoom(note, env = {}) {
  // Arm the recorder first, or a note spoken into an unrecorded room is lost without a trace.
  // The Origin header picks the room, never a parameter.
  // why: lessons/workers-mail.md#arm
  const armed = await fetch('https://feedback.positron.studio/arm', {
    method: 'POST',
    // The key, when this worker has it, lifts the per-address arm limit that
    // every mail would otherwise share from Cloudflare's egress address.
    headers: { Origin: ORIGIN, ...(env.FEEDBACK_KEY ? { 'x-feedback-key': env.FEEDBACK_KEY } : {}) },
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

// Headers are read off the raw text: `Headers` joins two of one name, gluing a forged
// Authentication-Results onto the real one. The fallback fails safe to `unknown`; wrapped, never
// throws.
// why: lessons/workers-mail.md#label
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

    // The envelope sender (what the server presented), not the From header; neither proves
    // identity.
    // why: lessons/workers-mail.md#sender
    const name = String(message.from || 'somebody').slice(0, MAX_NAME);

    // The label goes ahead of the subject, and `[ok]` is explicit so labelling is visibly running.
    // why: lessons/workers-mail.md#label-first
    const refused = verdict.reject;
    const face = prefixFor(verdict, { refused });

    // Built as an array: an empty conditional entry would still add its separator.
    // why: lessons/workers-mail.md#foot
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

    // Log the domain, never the address or body; subject cut to 80 characters.
    // why: lessons/workers-mail.md#log
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

    // Speak first, refuse second, so a refused message still leaves a visible note.
    // why: lessons/workers-mail.md#speak-first
    await sayIntoRoom({ id, name, text }, env);

    if (refused) message.setReject(verdict.rejectReason);

    void ctx; void env;
  },
};
