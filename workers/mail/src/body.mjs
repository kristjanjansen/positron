// The words a person wrote, out of a raw message; its own file so test.mjs can grade it. Not a
// MIME parser: finds the boundary, walks nested multiparts, prefers text/plain, decodes base64,
// quoted-printable and RFC 2047; no message/partial, message/rfc822 or Content-Disposition.
// why: lessons/workers-mail.md#body-header

/** How deep a nested multipart is followed before giving up. */
const MAX_DEPTH = 4;

/** Headers are folded onto continuation lines; a folded header is ONE header. */
const unfold = (head) => head.replace(/\r?\n[ \t]+/g, ' ');

// Split header block from body on `\r?\n\r?\n`, never `\r\n\r\n`: normalised line endings
// would otherwise return the whole message, headers included, as the person's words.
// why: lessons/workers-mail.md#split-head
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

// The closing `--boundary--` is dropped by its shape, not by position, or a message cut short
// loses its last part, which is where a single-part body lives.
// why: lessons/workers-mail.md#parts
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

// Bytes, not characters: `k=C3=B5ige` is two escapes for one letter.
// why: lessons/workers-mail.md#qp
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

// An unknown charset label falls back rather than throwing: a throw reaches the email handler,
// which Cloudflare retries three times before bouncing the sender.
// why: lessons/workers-mail.md#charset
function decodeCharset(bytes, charset) {
  for (const label of [charset, 'utf-8']) {
    try { return new TextDecoder(label).decode(bytes); } catch { /* try the next */ }
  }
  return '';
}

// RFC 2047 words decoded. Adjacent encoded words join with no space (the whitespace is folding).
// Flattened to one line, so a decoded newline cannot forge a line of our own note.
// why: lessons/workers-mail.md#decode-words
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
  // The control range is written as escapes: a raw NUL makes BSD grep treat the file as binary.
  // why: lessons/workers-mail.md#escapes
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

// The first text part only: a multipart/alternative carries the same words as text and as HTML.
// Walks into nested multiparts (an attachment wraps the alternative). Returns the words only.
// why: lessons/workers-mail.md#first-text
export function firstText(raw, depth = 0) {
  const { head, body } = splitHead(raw);
  const ctype = headerValue(head, 'content-type');
  const boundary = param(ctype, 'boundary');

  if (boundary && depth < MAX_DEPTH) {
    const parts = partsOf(body, boundary);
    const typeOf = (p) => headerValue(splitHead(p).head, 'content-type');
    // Order is the decision: text/plain, then a nested multipart, then the first part (RFC 2045
    // text).
    // why: lessons/workers-mail.md#order
    const chosen = parts.find((p) => /^\s*text\/plain/i.test(typeOf(p)))
      ?? parts.find((p) => /^\s*multipart\//i.test(typeOf(p)))
      ?? parts[0];
    if (chosen) return firstText(chosen, depth + 1);
  }

  return bodyText(head, body);
}
