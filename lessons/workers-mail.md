# workers-mail

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `workers/mail/src/body.mjs`

### body-header

Above `/** How deep a nested multipart is followed before giving up. */`, lines 1 to 26 before the cut.

~~~js
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
~~~

### split-head

Above `function splitHead(text) {`, lines 34 to 42 before the cut.

~~~js
/**
 * Split a message or a part into its header block and its body.
 *
 * ⚠️ `\r?\n\r?\n`, NEVER `\r\n\r\n`. Mail on the wire is CRLF and the first
 * thing a suspect list for this bug named was "a `\n` where the code splits on
 * `\r\n`". A message that has been through anything that normalised its line
 * endings has no `\r\n\r\n` in it at all, and the old code answered that by
 * returning the ENTIRE message, headers and all, as the person's words.
 */
~~~

### parts

Above `function partsOf(body, boundary) {`, lines 59 to 67 before the cut.

~~~js
/**
 * The parts between one boundary's delimiters.
 *
 * ⚠️ THE CLOSING DELIMITER IS `--boundary--` AND IT IS DROPPED BY ITS SHAPE,
 * not by position. The old code took `slice(1, -1)`, which assumes the message
 * ends with a terminator and an epilogue; a message cut short, or one whose last
 * part runs to the end, loses its LAST part that way, and the last part is where
 * a single-part body lives.
 */
~~~

### qp

Above `function fromQuotedPrintable(s) {`, lines 84 to 91 before the cut.

~~~js
/**
 * Bytes out of a quoted-printable body.
 *
 * ⚠️ BYTES, NOT CHARACTERS, AND THAT IS THE WHOLE POINT. `kõige` travels as
 * `k=C3=B5ige`: two escapes that are ONE letter. A decoder that turns each `=XX`
 * into a character produces two replacement characters and a reader sees
 * mojibake, which reads as a broken sender rather than a broken parser.
 */
~~~

### charset

Above `function decodeCharset(bytes, charset) {`, lines 108 to 115 before the cut.

~~~js
/**
 * Bytes into words, against the charset the sender declared.
 *
 * ⚠️ AN UNKNOWN LABEL FALLS BACK, IT DOES NOT THROW. `new TextDecoder('x-mac-
 * roman')` throws a RangeError, and a throw in here would reach the email
 * handler, which Cloudflare retries three times before bouncing the sender. A
 * message in a charset nobody has heard of is worth showing imperfectly.
 */
~~~

### decode-words

Above `export function decodeWords(s) {`, lines 123 to 141 before the cut.

~~~js
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
~~~

### escapes

Above `return decoded.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s{2,}/g, ' ').t`..., lines 161 to 165 before the cut.

~~~js
// ⚠ THE CONTROL RANGE IS WRITTEN AS ESCAPES, NEVER AS LITERAL BYTES.
// A raw NUL in a source file makes BSD grep call the whole file binary and
// print NOTHING for every search of it, which cost this project a session on
// `timeline/transport.mjs`: a search for a symbol exported forty lines away
// answered "not there".
~~~

### first-text

Above `export function firstText(raw, depth = 0) {`, lines 179 to 203 before the cut.

~~~js
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
~~~

### order

Above `const chosen = parts.find((p) => /^\s*text\/plain/i.test(typeOf(p)))`, lines 212 to 215 before the cut.

~~~js
// ⚠️ THE ORDER IS THE DECISION. Plain text first because that is what a
// reader wants; a nested multipart second because the plain text is usually
// inside it; the first part last, because a part with no type at all is
// text by RFC 2045's default and is better than nothing.
~~~

## `workers/mail/src/index.js`

### index-header

Above `import { firstText, decodeWords } from './body.mjs';`, lines 1 to 35 before the cut.

~~~js
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
~~~

### origin

Above `const ORIGIN = 'https://positron.studio';`, lines 44 to 47 before the cut.

~~~js
// ⚠️ THE ORIGIN THE RECORDER DEMANDS. It refuses a note into the live room whose
// `origin` is not exactly this, which is deliberate: a write has to say where it
// came from rather than slip in while a visitor holds the room open. This worker
// is a first-party sender and says so.
~~~

### read-raw

Above `async function readRaw(message) {`, lines 56 to 80 before the cut.

~~~js
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
~~~

### header

Above `const header = (message, name) => decodeWords(message.headers.get(name) || '');`, lines 88 to 97 before the cut.

~~~js
/**
 * A header, decoded.
 *
 * ⚠️ THIS USED TO SAY "undecoded" AND DEFEND IT. The defence was that a
 * half-implemented decoder produces mojibake that reads as a broken sender,
 * which is true and was the wrong trade: the undecoded form reads as a broken
 * sender TOO, and it reads that way to every writer of Estonian, who is the
 * person this mailbox exists for. `decodeWords` is the whole of RFC 2047 rather
 * than half of it, and it is graded on fixtures.
 */
~~~

### say

Above `async function sayIntoRoom(note, env = {}) {`, lines 104 to 109 before the cut.

~~~js
/**
 * Send one note into the room and wait for the socket to close.
 * ⚠️ A WORKER'S OUTBOUND WEBSOCKET NEEDS `waitUntil` OR THE MESSAGE CAN BE CUT
 * OFF when the handler returns. The email handler awaits this directly, which
 * is simpler and is fine: a mail delivery is allowed to take a second.
 */
~~~

### arm

Above `const armed = await fetch('https://feedback.positron.studio/arm', {`, lines 111 to 120 before the cut.

~~~js
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
~~~

### label

Above `function label(message, raw) {`, lines 158 to 176 before the cut.

~~~js
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
~~~

### sender

Above `const name = String(message.from || 'somebody').slice(0, MAX_NAME);`, lines 207 to 212 before the cut.

~~~js
/**
 * ⚠️ THE SENDER GOES IN THE NAME, AND IT IS THE ENVELOPE SENDER RATHER THAN
 * THE `From:` HEADER. A header can say anything; `message.from` is what the
 * sending server actually presented. Neither is proof of identity and the
 * note does not pretend it is.
 */
~~~

### label-first

Above `const refused = verdict.reject;`, lines 215 to 220 before the cut.

~~~js
/**
 * 🔴 THE LABEL GOES FIRST, AHEAD OF THE SUBJECT. The feedback room is a list
 * somebody scans, and a verdict at the end of a line is a verdict nobody
 * reads. `[ok]` on ordinary mail is four characters and it is deliberate: an
 * empty prefix cannot be told apart from a build that has no labelling in it.
 */
~~~

### foot

Above `const foot = [`, lines 224 to 227 before the cut.

~~~js
// ⚠️ THE FOOT IS BUILT SEPARATELY RATHER THAN JOINED WITH EMPTY STRINGS. A
// conditional entry that is `''` still contributes its separator, so a
// message with nothing to add grew a trailing blank line and one with
// something to add grew three.
~~~

### log

Above `console.log(JSON.stringify({`, lines 244 to 249 before the cut.

~~~js
/**
 * ⚠️ THE DOMAIN, NEVER THE ADDRESS, AND NEVER THE BODY. A stranger's address
 * is theirs, and CLAUDE.md's rule about redacting at the point of capture is
 * the same discipline. The subject is cut to eighty characters because a log
 * line is a trace rather than a copy.
 */
~~~

### speak-first

Above `await sayIntoRoom({ id, name, text }, env);`, lines 264 to 266 before the cut.

~~~js
// 🔴 SPEAK FIRST, REFUSE SECOND. A refusal that leaves no trace is a message
// nobody can ever find out about, and the whole point of labelling instead
// of dropping is that a decision stays visible. The note lands either way.
~~~

## `workers/mail/src/spam.mjs`

### spam-header

Above `/**`, lines 1 to 49 before the cut.

~~~js
// workers/mail/src/spam.mjs — what a message's own headers say about whether a
// person typed it. Pure: no network, no Worker API, no clock, no global.
//
//   node workers/mail/test.mjs
//
// 🔴 IT LABELS. IT DOES NOT DROP. A message that vanishes is unrecoverable and
// says the wrong thing, because a missing row reads as "nobody wrote" rather
// than "we threw it away". Every verdict here is a prefix on a note somebody
// reads in a second. There is exactly one exception and it is the sender's own
// instruction rather than ours: a DMARC failure on a domain that publishes
// `p=reject` is that domain saying the mail is forged, and `reject` is the
// answer it asked receivers to give.
//
// 🔴 AND IT NEVER GUESSES FROM THE SUBJECT OR THE BODY. Those heuristics are
// language dependent, wrong in both directions, and they are the part somebody
// has to maintain forever. Nothing in this file reads a word of what was
// written.
//
// The signals, strongest first:
//
//   1. `Authentication-Results` / `ARC-Authentication-Results`, the stamp the
//      receiving server writes before a Worker sees the message. Parsed per
//      RFC 8601, comments and all. This is the only signal that can carry a
//      verdict, and the only one that can reject.
//   2. bulk markers: `List-Unsubscribe`, `List-Id`, `Precedence`,
//      `Auto-Submitted`, a null `Return-Path`. They do not mean spam. They mean
//      NOT A PERSON TYPING, which for a contact address is the distinction that
//      matters.
//   3. the envelope sender against the `From:` header. A mismatch is routine for
//      a mailing list and odd from a stranger, so it is a note and never a
//      verdict on its own.
//
// ⚠️ ONE SIGNAL WAS LOOKED AT AND LEFT OUT, SO IT IS NOT RE-OPENED.
// A real Worker delivery carries `X-Cf-Spamh-Score`, reported in
// cloudflare/workerd issue 6740 alongside the missing verdicts. It is not read
// here: Cloudflare documents no scale, no direction and no threshold for it, and
// a number whose meaning is guessed cannot be argued with when it is wrong. It
// is worth revisiting once real mail has arrived and the values can be compared
// against verdicts this file already computes, which is a measurement rather
// than a guess.
//
// ⚠️ THE STAMP CAN BE ABSENT AND THAT IS NOT A VERDICT. It is absent in
// `wrangler dev` (so a harness built only against local delivery grades
// nothing), and cloudflare/workerd issue 6740 reports it absent from a real
// Worker delivery too, with only `ARC-Authentication-Results: i=1;
// mx.google.com; arc=none` standing in for it. Absence answers `unknown`, which
// never rejects and never reads as clean. `demo/shell/caps.mjs` settled the same
// question the same way: "we did not look" must not be reported as "it is
// missing".
~~~

### trusted

Above `export const TRUSTED_AUTHSERV = ['cloudflare.net'];`, lines 51 to 63 before the cut.

~~~js
/**
 * 🔴 WHOSE STAMP IS BELIEVED. An `Authentication-Results` header is ordinary
 * text and a sender may write one saying whatever it likes, so the only ones
 * worth reading are the ones the receiving server wrote. RFC 8601 calls the
 * first field the authserv-id and says a consumer must recognise it.
 *
 * ⚠️ AND THE CHECK IS AN EXACT MATCH OR A DNS LABEL SUFFIX, NEVER A SUBSTRING.
 * CLAUDE.md bans `s.includes(...)` as a guard and this is the case that shows
 * why: a real project shipped `/cloudflare/i` against this field, which accepts
 * `notcloudflare.net`, `cloudflare.evil.tld` and `mx.cloudflare.net.attacker`
 * (reynhartono/cf-email-gateway issue 13). Each of those is a stranger's stamp
 * read as the receiving server's own.
 */
~~~

### rank

Above `export const RANK = ['forged', 'suspect', 'unsigned', 'bulk', 'unknown', 'clean'`..., lines 69 to 73 before the cut.

~~~js
/**
 * Worst first. Exported because the order is a claim the test grades rather
 * than a preference: `forged` must outrank `bulk`, or a spammer gets a quieter
 * label by adding a `List-Unsubscribe`.
 */
~~~

### header-block

Above `export function parseHeaderBlock(text) {`, lines 87 to 97 before the cut.

~~~js
/**
 * The header block of an RFC 5322 message, as `[name, value]` pairs with the
 * names lowercased and folded lines joined.
 *
 * 🔴 THIS EXISTS BECAUSE `Headers` CANNOT HAND BACK TWO HEADERS OF ONE NAME.
 * `headers.get('authentication-results')` joins every value with a comma, so a
 * stranger's forged stamp and the receiving server's real one arrive glued into
 * one string with one authserv-id at the front, which is the stranger's. Two
 * separate lines are the whole point, so they are read off the raw message
 * where they are still two lines.
 */
~~~

### fold

Above `if (/^[ \t]/.test(line)) {`, lines 107 to 110 before the cut.

~~~js
// ⚠️ A CONTINUATION LINE BELONGS TO THE HEADER ABOVE IT. Every real
// `Authentication-Results` is folded across three or four lines, so a
// parser that reads lines independently sees the verdicts as junk and
// reports a stamp with nothing in it.
~~~

### split-top

Above `function splitTop(value) {`, lines 139 to 146 before the cut.

~~~js
/**
 * Split on the semicolons that separate results, and on no others.
 * ⚠️ A COMMENT CONTAINS SEMICOLONS AND SO DOES A QUOTED STRING. A real stamp
 * reads `spf=pass (mx.cloudflare.net: domain of joe@example.com designates
 * 2a00:1440:4824:20::32e as permitted sender) smtp.mailfrom=joe@example.com`,
 * and a plain `value.split(';')` cuts that comment in half and loses the
 * property that says which address the result is about.
 */
~~~

### comments

Above `function stripComments(s) {`, lines 166 to 171 before the cut.

~~~js
/**
 * The text of one result with its comments lifted out, and the comments kept.
 * The comments are kept because the DMARC one carries the sending domain's
 * PUBLISHED POLICY, which is the single fact that decides whether a refusal is
 * ours or the sender's.
 */
~~~

### equals

Above `return { text: out.replace(/\s*=\s*/g, '=').replace(/\s+/g, ' ').trim(), comment`..., lines 194 to 195 before the cut.

~~~js
// ⚠️ A COMMENT MAY SIT BETWEEN A METHOD AND ITS `=`, so the spacing around
// every `=` is normalised before anything is tokenised.
~~~

### parse-ar

Above `export function parseAuthResults(value) {`, lines 199 to 203 before the cut.

~~~js
/**
 * One `Authentication-Results` or `ARC-Authentication-Results` value, parsed.
 * Returns `{ instance, authservId, version, results }` where each result is
 * `{ method, result, props, comment }`.
 */
~~~

### trusted-authserv

Above `export function trustedAuthserv(id, trusted = TRUSTED_AUTHSERV) {`, lines 240 to 243 before the cut.

~~~js
/**
 * Is this authserv-id one of ours? Exact, or a DNS label below it.
 * 🔴 NOT A SUBSTRING TEST. See the note on `TRUSTED_AUTHSERV`.
 */
~~~

### address-domain

Above `export function addressDomain(s) {`, lines 255 to 260 before the cut.

~~~js
/**
 * The domain of an address, from a bare address or a full `From:` value.
 * ⚠️ THE LAST ANGLE PAIR, NOT THE FIRST, and quoted display names are removed
 * first. `"someone <a@bank.test>" <real@elsewhere.test>` is a legal mailbox and
 * reading the first `<...>` hands back the domain the sender WANTED read.
 */
~~~

### related

Above `export function relatedDomains(a, b) {`, lines 272 to 280 before the cut.

~~~js
/**
 * Do two domains belong together?
 * ⚠️ THIS IS AN APPROXIMATION AND IT NEVER DECIDES A REFUSAL. Real alignment
 * needs the organisational domain, which needs the Public Suffix List, which is
 * a megabyte that goes stale. Without it `a.co.uk` and `b.co.uk` look related
 * and they are not. So it is used for a note in a label and for nothing else,
 * and DMARC, which was computed by somebody who does have the list, is what
 * the verdict rests on.
 */
~~~

### pick-spf

Above `function pickSpf(results) {`, lines 290 to 298 before the cut.

~~~js
/**
 * 🔴 A MESSAGE CARRIES TWO SPF RESULTS AND THE FIRST ONE IS THE WRONG ONE.
 * A real stamp reads `spf=none (... no SPF records for postmaster@example.com)
 * smtp.helo=smtp.example.com; spf=pass (...) smtp.mailfrom=joe@example.com`.
 * The HELO check is about the sending machine's own name and is routinely
 * `none` on servers whose mail is perfectly good. The one that answers "did
 * this domain authorise this machine" is the `smtp.mailfrom` one, so it is
 * chosen by its property rather than by its position.
 */
~~~

### dmarc-policy

Above `export function dmarcPolicy(result) {`, lines 339 to 354 before the cut.

~~~js
/**
 * The sending domain's PUBLISHED policy, which is the only thing that can
 * license a refusal. It arrives two ways: as an RFC 8601 property
 * `policy.dmarc=reject`, or inside the comment as `(p=REJECT sp=NONE dis=NONE)`.
 *
 * 🔴 `sp=` IS NOT `p=` AND A SUBSTRING TEST CANNOT TELL THEM APART. `sp` is the
 * policy for SUBDOMAINS of the record's domain. A domain publishing
 * `p=none sp=reject` is asking receivers to deliver its own mail and refuse
 * mail from its subdomains, and reading `reject` out of that refuses mail the
 * sender asked to have delivered. The pattern requires the `p` to begin a
 * token.
 *
 * ⚠️ AND WHERE ONLY `sp=` IS AVAILABLE THIS ANSWERS NOTHING, on purpose.
 * Knowing whether `sp` governs means knowing which domain published the record,
 * which the header does not say. No policy means no refusal.
 */
~~~

### classify

Above `export function classify({ headers, envelopeFrom = '', trusted = TRUSTED_AUTHSER`..., lines 365 to 373 before the cut.

~~~js
/**
 * What the headers say. Pure, and every input is a string.
 *
 * @param {object} arg
 * @param {Array|Headers|object} arg.headers   header pairs, a `Headers`, or an object
 * @param {string} [arg.envelopeFrom]          `message.from`, what the sending server presented
 * @param {string[]} [arg.trusted]             authserv-ids whose stamps are believed
 * @returns {object} `{ verdict, label, chips, reject, rejectReason, auth, flags, reasons }`
 */
~~~

### refusal

Above `let reject = false;`, lines 488 to 492 before the cut.

~~~js
// ── 4. the one refusal ────────────────────────────────────────────────────
// 🔴 NARROW ON PURPOSE. Not "this looks like spam": the sending domain's own
// published policy says a message failing DMARC is forged and asks receivers
// to refuse it. Refusing is following that instruction. Everything else on
// this page is a label.
~~~

### no-policy

Above `reasons.push('DMARC failed and the header does not say what policy the domain pu`..., lines 500 to 501 before the cut.

~~~js
// ⚠️ SAY SO RATHER THAN GUESS. A DMARC failure with no published policy in
// the header is exactly the case the ask says not to refuse.
~~~

### via

Above `if (auth.via === 'ar') out.push('via Authentication-Results');`, lines 516 to 538 before the cut.

~~~js
/**
 * 🔴 WHICH SIGNAL DECIDED THIS, ON EVERY MESSAGE, BECAUSE THE ROOM COULD NOT
 * ANSWER IT. Two real messages arrived 2026-09-17 and the second came out
 * `[ok]`. Four characters are the same four whether a real
 * `Authentication-Results` was read or a forwarded `ARC-Authentication-Results`
 * was believed instead, so the one question anybody had about the first real
 * mail this worker ever graded was the one question its own output could not
 * answer. `auth.via` had held the answer the whole time and went only to the
 * console, where nobody was looking.
 *
 * ⚠️ IT IS EMITTED ON THE ORDINARY CASE TOO, WHICH BREAKS THIS FILE'S OWN RULE
 * ABOUT CHIPS ONLY WHERE THEY BEAR ON THE VERDICT, AND THAT IS DELIBERATE.
 * The rule exists so a good message does not wear an alarm. This is not an
 * alarm, it is a provenance, and the argument for saying it every time is the
 * same one that put `[ok]` on ordinary mail in the first place: a chip that
 * appears only in the interesting case cannot be told apart from a build that
 * does not have the chip yet.
 *
 * ⚠️ AND IT MATTERS BECAUSE THE PRIMARY SIGNAL MAY SIMPLY NOT ARRIVE.
 * `workerd#6740` reports `Authentication-Results` absent from a real Worker
 * delivery with only an ARC set carrying `arc=none` in its place. `via ARC`
 * says a PREVIOUS hop concluded this and we forwarded its word for it.
 */
~~~

### silences

Above `out.push(!auth.stamped ? 'no auth stamp'`, lines 543 to 547 before the cut.

~~~js
// ⚠️ THREE DIFFERENT SILENCES AND THEY ARE NOT THE SAME SILENCE. No stamp
// at all is local delivery. A stamp from somebody we do not believe is a
// forwarding hop or a forgery. A trusted stamp carrying nothing is
// cloudflare/workerd 6740. Collapsing them sends a reader to the wrong
// place.
~~~

### p-reject

Above `if (policy === 'reject' && verdict === 'forged') out.push('p=reject');`, lines 561 to 563 before the cut.

~~~js
// ⚠️ ONLY WHERE IT BEARS ON THE VERDICT. A strict domain whose mail PASSED is
// the ordinary good case, and a `p=reject` chip on it reads as an alarm about
// a message that is fine.
~~~

### label-of

Above `export function labelOf(chips) {`, lines 570 to 574 before the cut.

~~~js
/**
 * The bracketed prefix a reader sees ahead of the subject.
 * ⚠️ IT IS CUT BY WHOLE CHIPS AND NEVER MID WORD. A label that ends `dkim fa`
 * is a fact that has become a different fact.
 */
~~~

### prefix-for

Above `export function prefixFor(verdict, { refused = false } = {}) {`, lines 585 to 593 before the cut.

~~~js
/**
 * The prefix a reader sees ahead of the subject, including what the worker did
 * about it.
 *
 * ⚠️ `refused` GOES SECOND, NOT LAST, because the cap cuts from the end and the
 * one chip that must never be cut is the one saying the message was turned away.
 * A label ending `p=reject` reads as a message that was delivered and flagged,
 * which is the opposite of what happened.
 */
~~~

### classify-raw

Above `export function classifyRaw(raw, envelopeFrom = '', opts = {}) {`, lines 600 to 604 before the cut.

~~~js
/**
 * The same thing from a whole raw message, which is how the worker and the test
 * both reach it: the headers are read off the raw text rather than off a
 * `Headers`, so two stamps of one name stay two stamps.
 */
~~~

## `workers/mail/test.mjs`

### test-header

Above `import { readFileSync, readdirSync } from 'node:fs';`, lines 1 to 24 before the cut.

~~~js
// workers/mail/test.mjs — what the spam labeller says about twenty real
// header blocks, with no browser, no network and no message from anybody.
//
//   node workers/mail/test.mjs
//
// `classify` is pure: it holds no socket, no clock and no Worker API, so the
// whole of the labelling decision is gradable here. That matters more than
// usual for this subject, because THE SIGNAL IT READS CANNOT BE PRODUCED
// LOCALLY. `wrangler dev` delivers a message with no `Authentication-Results`
// header at all, so a harness built on local delivery exercises exactly one of
// the cases below (`14-no-stamp.eml`) and grades nothing else. The fixtures are
// the only way to reach the other nineteen.
//
// ⚠️ THE FIXTURES ARE SHAPED LIKE REAL MAIL, NOT LIKE CONVENIENT INPUT. Every
// `Authentication-Results` here is folded across lines with a tab, carries
// comments with colons and semicolons inside them, and arrives CRLF, because
// each of those has its own way of breaking a parser and a fixture that avoids
// them grades a parser that would fail in production.
//
// NINE OF THESE ARE NEGATIVE CONTROLS: they are written so that the bug they
// name would fail them, rather than so that today's code passes. Six of the
// twenty fixtures are ordinary mail from a person and MUST come out clean,
// which is the control on the whole idea: a labeller that says "suspicious"
// about everything is useless and would take this suite red.
~~~

### t2

Above `{`, lines 61 to 65 before the cut.

~~~js
// 2. NEGATIVE CONTROL, AND IT IS THE REASON THIS FILE PARSES RAW TEXT AT ALL.
//    A `Headers` joins two headers of one name into one comma separated string,
//    so a stranger's forged stamp and the receiving server's real one would
//    arrive glued together under the stranger's authserv-id. Read off the raw
//    message they stay two.
~~~

### t6

Above `{`, lines 109 to 111 before the cut.

~~~js
// 6. NEGATIVE CONTROL, AND IT IS A BUG A REAL PROJECT SHIPPED. Guarding this on
//    the substring `cloudflare` accepts all three of the spoofs below, which is
//    a stranger's stamp read as the receiving server's own.
~~~

### t7

Above `{`, lines 129 to 132 before the cut.

~~~js
// 7. 🔴 NEGATIVE CONTROL, AND IT IS THE `s.includes` BUG IN ONE LINE. `sp=` is
//    the policy for SUBDOMAINS. The string `sp=reject` CONTAINS the substring
//    `p=reject`, so a guard written that way refuses mail from a domain whose
//    own policy is `p=none` and which asked for it to be delivered.
~~~

### corpus

Above `const CORPUS = [`, lines 181 to 184 before the cut.

~~~js
// file, envelope sender (what the sending server presented), verdict, refuse?
// ⚠️ THE ENVELOPE SENDER IS NOT IN THE FILE. It is `message.from` on the Worker
// API, which travels in the SMTP conversation rather than in the message, so it
// is supplied here the way the platform supplies it.
~~~

### t12

Above `{`, lines 241 to 243 before the cut.

~~~js
// 12. 🔴 THE CONTROL ON EVERYTHING ABOVE. A labeller stuck on one answer passes
//     any single assert you like. Six of twenty fixtures are ordinary mail from
//     a person and must come out clean, so "always suspicious" fails here.
~~~

### t13

Above `{`, lines 250 to 252 before the cut.

~~~js
// 13. AND EVERY RUNG OF THE LADDER IS REACHED. A branch no fixture exercises is
//     a branch nobody has checked, and this assert is what caught `suspect` and
//     `unsigned` going ungraded through the first eighteen fixtures.
~~~

### t13b

Above `{`, lines 262 to 264 before the cut.

~~~js
// 13. NEGATIVE CONTROL ON THE REFUSAL ITSELF. Exactly three fixtures may be
//     refused and all three are a DMARC failure against a published p=reject.
//     Nothing else on this page may ever set it.
~~~

### t16

Above `{`, lines 292 to 295 before the cut.

~~~js
// 16. NEGATIVE CONTROL. The strongest signal wins even when it is the only one
//     that is bad: a message whose SPF and DKIM both pass and whose DMARC fails
//     is forged, because DMARC is the check that asks whether the passes belong
//     to the domain in the From line.
~~~

### t19

Above `{`, lines 334 to 338 before the cut.

~~~js
// 19. A clean message from a person says so, because the alternative is an empty
//     prefix, which cannot be told apart from a build that has no labelling in
//     it. It now also says WHICH stamp decided, for the same reason one step on:
//     a label that names its source only in the interesting case cannot be told
//     apart from a build that does not name it at all.
~~~

### t19b

Above `{`, lines 345 to 349 before the cut.

~~~js
// 19b. 🔴 THE PROVENANCE CHIP, WITH THE NEGATIVE CONTROL THAT GIVES IT MEANING.
//      The question this answers is whether a verdict was read off a real
//      `Authentication-Results` or off a forwarded ARC set, and it is only worth
//      a chip if the two fixtures come out DIFFERENT. A message whose only stamp
//      is ARC must say so; one with the real header must not.
~~~

### t20

Above `{`, lines 367 to 370 before the cut.

~~~js
// 20. 🔴 NEGATIVE CONTROL ON THE CAP AND THE REFUSAL TOGETHER. The longest label
//     in the corpus is one chip under the limit, so appending `refused` to the
//     END of it would be cut off by the cap and the label would read as a
//     message that was delivered and flagged. It goes second.
~~~

### words

Above `console.log('\n== the words a person wrote ==');`, lines 394 to 401 before the cut.

~~~js
// ── the words a person wrote ────────────────────────────────────────────────
//
// 🔴 THIS SECTION EXISTS BECAUSE THERE WAS NONE. `firstText` lived inside
// `index.js` where nothing could import it, so the parser had ZERO asserts while
// the classifier beside it had fifty-one, and the first real message ever to
// arrive put its HTML half in the feedback room while this suite was green. The
// two fixtures at the top of the table are that message and the one two minutes
// after it, captured from the sender's own mailbox rather than reconstructed.
~~~

### envelope

Above `{`, lines 432 to 435 before the cut.

~~~js
// 🔴 THE SWEEP THAT WOULD HAVE CAUGHT THE ORIGINAL BUG ON ITS OWN. Not one
// reader ever wants to see a boundary, a `Content-Type` line or a tag: those are
// the envelope, and every way this parser has failed has been by handing part of
// the envelope back as the message.
~~~

### shipped-bug

Above `{`, lines 443 to 446 before the cut.

~~~js
// NEGATIVE CONTROL, AND IT IS THE WHOLE POINT OF THE PAIR AT THE TOP. The defect
// that was actually shipped is put back here in miniature: keeping every part
// rather than the first. If that reads as PASSING, this suite cannot see the bug
// it was written for.
~~~

### subject-line

Above `{`, lines 475 to 478 before the cut.

~~~js
// 🔴 A SUBJECT IS THE FIRST LINE OF A NOTE WHOSE OTHER LINES ARE THE BODY, so a
// decoded newline would let a sender write a line of our own output. This is the
// only place in this worker where text from a stranger reaches a structured
// format.
~~~

### t20b

Above `{`, lines 507 to 510 before the cut.

~~~js
// 20. The claim in this file's first paragraph, checked rather than repeated.
//     A smoke test on the source rather than a proof, and it fires on the one
//     thing that would actually happen: somebody reaching for the network to
//     look a domain up.
~~~

### decomment

Above `const decomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*`..., lines 512 to 521 before the cut.

~~~js
/**
 * ⚠️ THE COMMENTS COME OUT FIRST, AND THAT IS NOT A LOOSENING. This check read
 * the whole file including its prose, so `body.mjs` failed it for the word
 * WebSocket inside a sentence EXPLAINING that the parser was moved out of the
 * file which holds one. A guard that fires on an accurate comment teaches its
 * author to write a worse comment, and the next author quietly stops writing
 * them. What is being asserted is about the CODE.
 * ⚠️ AND A STRIPPER IS A THING THAT CAN BE WRONG, so the control below plants
 * a real call and requires this to catch it.
 */
~~~

### planted

Above `const planted = decomment('${body}\nawait fetch('https://example.com');');`, lines 538 to 540 before the cut.

~~~js
// 🔴 THE GUARD, BROKEN ON PURPOSE. A check that only ever prints `ok` is not
// evidence that it can print anything else. One real call planted in code, and
// the same words planted in a comment, must come out as a hit and a miss.
~~~
