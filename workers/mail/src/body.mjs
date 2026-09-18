// workers/mail/src/body.mjs — the words a person wrote, out of the message a
// machine sent.
//
// 🔴 THIS IS A SEPARATE FILE BECAUSE IT HAD NO TEST AND THE CLASSIFIER HAD
// FIFTY-ONE. `firstText` lived inside `index.js`, which holds a `fetch`, a
// WebSocket and the Worker's own `email` handler, so nothing could import it and
// nothing ever graded it. Meanwhile `spam.mjs` sat beside it with twenty
// fixtures and 51 green asserts. That is the whole story of how a real Gmail
// message put its HTML half in the feedback room while the suite was green: the
// fixtures graded the half that had a seam, and the half with no seam was the
// half that broke.
//
// ⚠️ IT IS STILL NOT A MIME PARSER AND DOES NOT PRETEND TO BE. What it does is
// named here so the gaps are a decision rather than a surprise: it finds the
// boundary, walks INTO a nested multipart, prefers `text/plain`, and decodes
// `base64` and `quoted-printable` bodies and RFC 2047 header words. What it does
// NOT do is reassemble `message/partial`, follow `message/rfc822`, or honour
// `Content-Disposition`.
//
// ⚠️ AND ONE LIMIT IS WORTH STATING PLAINLY BECAUSE IT IS INVISIBLE. `readRaw`
// in `index.js` decodes the whole message as UTF-8 before anything here sees it,
// so a part declaring `charset=iso-8859-1` with NO transfer encoding has already
// lost its bytes by the time it arrives. The case that matters in practice is
// covered: anything non-ASCII from a real mail client arrives `base64` or
// `quoted-printable`, and both of those are pure ASCII on the wire, so the bytes
// survive the trip and are decoded here against the part's own charset.

/** How deep a nested multipart is followed before giving up. */
const MAX_DEPTH = 4;

/** Headers are folded onto continuation lines; a folded header is ONE header. */
const unfold = (head) => head.replace(/\r?\n[ \t]+/g, ' ');

/**
 * Split a message or a part into its header block and its body.
 *
 * ⚠️ `\r?\n\r?\n`, NEVER `\r\n\r\n`. Mail on the wire is CRLF and the first
 * thing a suspect list for this bug named was "a `\n` where the code splits on
 * `\r\n`". A message that has been through anything that normalised its line
 * endings has no `\r\n\r\n` in it at all, and the old code answered that by
 * returning the ENTIRE message, headers and all, as the person's words.
 */
function splitHead(text) {
  const m = text.match(/\r?\n\r?\n/);
  if (!m) return { head: '', body: text };
  return { head: text.slice(0, m.index), body: text.slice(m.index + m[0].length) };
}

/** One header's value out of a header block, unfolded. */
function headerValue(head, name) {
  const re = new RegExp(`^${name}:[ \\t]*(.*)$`, 'im');
  return (unfold(head).match(re) || [])[1] || '';
}

/** A parameter off a `Content-Type`, such as the boundary or the charset. */
const param = (ctype, name) =>
  (ctype.match(new RegExp(`${name}\\s*=\\s*"?([^";\\r\\n]+)"?`, 'i')) || [])[1] || '';

/**
 * The parts between one boundary's delimiters.
 *
 * ⚠️ THE CLOSING DELIMITER IS `--boundary--` AND IT IS DROPPED BY ITS SHAPE,
 * not by position. The old code took `slice(1, -1)`, which assumes the message
 * ends with a terminator and an epilogue; a message cut short, or one whose last
 * part runs to the end, loses its LAST part that way, and the last part is where
 * a single-part body lives.
 */
function partsOf(body, boundary) {
  return body.split(`--${boundary}`)
    .slice(1)                          // before the first delimiter is the preamble
    .filter((c) => !/^--/.test(c))     // `--boundary--` closes the set
    .map((c) => c.replace(/^[ \t]*\r?\n/, ''))
    .filter((c) => c.trim());
}

/** Bytes out of a base64 body. */
function fromBase64(s) {
  const bin = atob(s.replace(/[^A-Za-z0-9+/=]/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Bytes out of a quoted-printable body.
 *
 * ⚠️ BYTES, NOT CHARACTERS, AND THAT IS THE WHOLE POINT. `kõige` travels as
 * `k=C3=B5ige`: two escapes that are ONE letter. A decoder that turns each `=XX`
 * into a character produces two replacement characters and a reader sees
 * mojibake, which reads as a broken sender rather than a broken parser.
 */
function fromQuotedPrintable(s) {
  const text = s.replace(/=\r?\n/g, '');   // a soft line break carries no data
  const out = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '=' && /^[0-9A-Fa-f]{2}$/.test(text.slice(i + 1, i + 3))) {
      out.push(parseInt(text.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      // Anything not escaped is ASCII by definition of the encoding.
      out.push(c.charCodeAt(0) & 0xff);
    }
  }
  return new Uint8Array(out);
}

/**
 * Bytes into words, against the charset the sender declared.
 *
 * ⚠️ AN UNKNOWN LABEL FALLS BACK, IT DOES NOT THROW. `new TextDecoder('x-mac-
 * roman')` throws a RangeError, and a throw in here would reach the email
 * handler, which Cloudflare retries three times before bouncing the sender. A
 * message in a charset nobody has heard of is worth showing imperfectly.
 */
function decodeCharset(bytes, charset) {
  for (const label of [charset, 'utf-8']) {
    try { return new TextDecoder(label).decode(bytes); } catch { /* try the next */ }
  }
  return '';
}

/**
 * A header value with its RFC 2047 encoded words decoded.
 *
 * 🔴 A SUBJECT FROM OUTSIDE ENGLISH WAS UNREADABLE IN THE FEEDBACK ROOM. A note
 * from Estonia opened `[ok] =?utf-8?B?a8O1aWdlIGjDpHN0aQ==?=`, which is the
 * FIRST thing a reader sees, in a mailbox whose whole purpose is somebody
 * writing in their own language.
 *
 * ⚠️ ADJACENT WORDS JOIN WITH NO SPACE BETWEEN THEM. RFC 2047 says the
 * whitespace separating two encoded words is not data: it is there so the header
 * can be folded. Keeping it puts a space in the middle of a word, and the
 * senders it happens to are exactly the ones whose alphabet forced the encoding.
 *
 * ⚠️ AND A DECODED HEADER IS FLATTENED TO ONE LINE. A subject is written into
 * the room as the first line of a note whose other lines are the body, so a
 * decoded `\n` would let a sender forge a line of our own output. This is the
 * one place in this worker where attacker-controlled text reaches a structured
 * format, and it is cheaper to flatten than to escape.
 */
export function decodeWords(s) {
  if (!s) return '';
  const joined = String(s).replace(/(\?=)[ \t]+(?==\?)/g, '$1');
  const decoded = joined.replace(
    /=\?([A-Za-z0-9._-]+?)(?:\*[A-Za-z0-9-]+)?\?([QqBb])\?([^?]*)\?=/g,
    (whole, charset, enc, text) => {
      try {
        const bytes = /^[Bb]$/.test(enc)
          ? fromBase64(text)
          : fromQuotedPrintable(text.replace(/_/g, ' '));
        const out = decodeCharset(bytes, charset.toLowerCase());
        return out || whole;
      } catch {
        // An encoded word that will not decode is shown as it arrived. Mojibake
        // reads as a broken sender; the raw form at least reads as a machine.
        return whole;
      }
    },
  );
  // ⚠ THE CONTROL RANGE IS WRITTEN AS ESCAPES, NEVER AS LITERAL BYTES.
  // A raw NUL in a source file makes BSD grep call the whole file binary and
  // print NOTHING for every search of it, which cost this project a session on
  // `timeline/transport.mjs`: a search for a symbol exported forty lines away
  // answered "not there".
  return decoded.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

/** The words in one part, transfer-decoded and charset-decoded. */
function bodyText(head, body) {
  const cte = headerValue(head, 'content-transfer-encoding').toLowerCase().trim();
  const charset = (param(headerValue(head, 'content-type'), 'charset') || 'utf-8').toLowerCase();
  let text = body;
  if (cte === 'base64') text = decodeCharset(fromBase64(body), charset);
  else if (cte === 'quoted-printable') text = decodeCharset(fromQuotedPrintable(body), charset);
  return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * The first text part of a message.
 *
 * 🔴 ONE ALTERNATIVE, NOT ALL OF THEM. MEASURED on the first real message ever
 * to arrive here, 2026-09-17 at 19:54:32 UTC: a Gmail message reading `hello!`
 * came out as
 *
 *     hello!
 *
 *     <div dir="ltr">hello!</div>
 *
 * A `multipart/alternative` carries the SAME words twice on purpose, once as
 * text and once as HTML, and a reader wants the first of those and never the
 * second. That message is now a fixture, alongside the one two minutes after it
 * that came out right, so the pair grades the fix in both directions.
 *
 * ⚠️ IT WALKS INTO A NESTED MULTIPART. A message with an attachment is a
 * `multipart/mixed` wrapping the `multipart/alternative`, so a parser that reads
 * only the top level hands back the whole inner structure, boundaries and
 * `Content-Type` lines and all, as the person's words.
 *
 * @param {string} raw the whole message, or one part of it during recursion.
 * @param {number} [depth] how many multiparts deep this call already is.
 * @returns {string} the words, with no headers, no boundaries and no HTML half.
 */
export function firstText(raw, depth = 0) {
  const { head, body } = splitHead(raw);
  const ctype = headerValue(head, 'content-type');
  const boundary = param(ctype, 'boundary');

  if (boundary && depth < MAX_DEPTH) {
    const parts = partsOf(body, boundary);
    const typeOf = (p) => headerValue(splitHead(p).head, 'content-type');
    // ⚠️ THE ORDER IS THE DECISION. Plain text first because that is what a
    // reader wants; a nested multipart second because the plain text is usually
    // inside it; the first part last, because a part with no type at all is
    // text by RFC 2045's default and is better than nothing.
    const chosen = parts.find((p) => /^\s*text\/plain/i.test(typeOf(p)))
      ?? parts.find((p) => /^\s*multipart\//i.test(typeOf(p)))
      ?? parts[0];
    if (chosen) return firstText(chosen, depth + 1);
  }

  return bodyText(head, body);
}
