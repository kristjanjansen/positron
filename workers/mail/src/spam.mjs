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
export const TRUSTED_AUTHSERV = ['cloudflare.net'];

/** Longest label this may hand a reader, brackets included. */
export const LABEL_MAX = 72;

/**
 * Worst first. Exported because the order is a claim the test grades rather
 * than a preference: `forged` must outrank `bulk`, or a spammer gets a quieter
 * label by adding a `List-Unsubscribe`.
 */
export const RANK = ['forged', 'suspect', 'unsigned', 'bulk', 'unknown', 'clean'];

/** How bad an SPF or DKIM result is. Only the ordering matters. */
const SEVERITY = {
  pass: 0,
  neutral: 1, none: 1, policy: 1, nxdomain: 1,
  softfail: 2, temperror: 2, permerror: 2,
  fail: 3,
};
const severityOf = (r) => (r in SEVERITY ? SEVERITY[r] : 1);

// ── reading the header block ────────────────────────────────────────────────

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
export function parseHeaderBlock(text) {
  const src = String(text ?? '');
  // The block ends at the first blank line. CRLF is the wire form; a fixture
  // typed by a person uses LF, and both are accepted.
  const end = src.search(/\r?\n\r?\n/);
  const block = end < 0 ? src : src.slice(0, end);
  const out = [];
  let cur = null;
  for (const line of block.split(/\r?\n/)) {
    // ⚠️ A CONTINUATION LINE BELONGS TO THE HEADER ABOVE IT. Every real
    // `Authentication-Results` is folded across three or four lines, so a
    // parser that reads lines independently sees the verdicts as junk and
    // reports a stamp with nothing in it.
    if (/^[ \t]/.test(line)) {
      if (cur) cur[1] += ` ${line.trim()}`;
      continue;
    }
    const colon = line.indexOf(':');
    if (colon < 1) continue;                 // an mbox `From ` line, or rubbish
    cur = [line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim()];
    out.push(cur);
  }
  return out;
}

/** Headers from whatever the caller has: pairs, a `Headers`, a `Map`, an object. */
export function headerEntries(headers) {
  if (!headers) return [];
  if (Array.isArray(headers)) {
    return headers.map(([k, v]) => [String(k).toLowerCase(), String(v)]);
  }
  if (typeof headers.entries === 'function') {
    return [...headers.entries()].map(([k, v]) => [String(k).toLowerCase(), String(v)]);
  }
  return Object.entries(headers).flatMap(([k, v]) => (Array.isArray(v)
    ? v.map((x) => [k.toLowerCase(), String(x)])
    : [[k.toLowerCase(), String(v)]]));
}

// ── RFC 8601 ────────────────────────────────────────────────────────────────

/**
 * Split on the semicolons that separate results, and on no others.
 * ⚠️ A COMMENT CONTAINS SEMICOLONS AND SO DOES A QUOTED STRING. A real stamp
 * reads `spf=pass (mx.cloudflare.net: domain of joe@example.com designates
 * 2a00:1440:4824:20::32e as permitted sender) smtp.mailfrom=joe@example.com`,
 * and a plain `value.split(';')` cuts that comment in half and loses the
 * property that says which address the result is about.
 */
function splitTop(value) {
  const parts = [];
  let buf = '';
  let depth = 0;                 // RFC 5322 comments nest
  let quoted = false;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === '\\' && (quoted || depth > 0)) { buf += c + (value[++i] ?? ''); continue; }
    if (quoted) { buf += c; if (c === '"') quoted = false; continue; }
    if (c === '"' && depth === 0) { quoted = true; buf += c; continue; }
    if (c === '(') { depth++; buf += c; continue; }
    if (c === ')') { if (depth > 0) depth--; buf += c; continue; }
    if (c === ';' && depth === 0) { parts.push(buf); buf = ''; continue; }
    buf += c;
  }
  parts.push(buf);
  return parts.map((s) => s.trim()).filter(Boolean);
}

/**
 * The text of one result with its comments lifted out, and the comments kept.
 * The comments are kept because the DMARC one carries the sending domain's
 * PUBLISHED POLICY, which is the single fact that decides whether a refusal is
 * ours or the sender's.
 */
function stripComments(s) {
  let out = '';
  let cur = '';
  const comments = [];
  let depth = 0;
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && (quoted || depth > 0)) {
      const n = s[++i] ?? '';
      if (depth > 0) cur += n; else out += c + n;
      continue;
    }
    if (quoted) { out += c; if (c === '"') quoted = false; continue; }
    if (c === '"' && depth === 0) { quoted = true; out += c; continue; }
    if (c === '(') { depth++; if (depth === 1) cur = ''; else cur += c; continue; }
    if (c === ')') {
      if (depth > 0) { depth--; if (depth === 0) comments.push(cur); else cur += c; }
      continue;
    }
    if (depth > 0) cur += c; else out += c;
  }
  // ⚠️ A COMMENT MAY SIT BETWEEN A METHOD AND ITS `=`, so the spacing around
  // every `=` is normalised before anything is tokenised.
  return { text: out.replace(/\s*=\s*/g, '=').replace(/\s+/g, ' ').trim(), comments };
}

/**
 * One `Authentication-Results` or `ARC-Authentication-Results` value, parsed.
 * Returns `{ instance, authservId, version, results }` where each result is
 * `{ method, result, props, comment }`.
 */
export function parseAuthResults(value) {
  const segs = splitTop(String(value ?? ''));
  if (!segs.length) return null;
  let i = 0;
  let instance = null;
  // An ARC set opens with its instance number: `i=1; mx.cloudflare.net; ...`
  const first = stripComments(segs[0]).text;
  if (/^i=\d+$/i.test(first)) { instance = Number(first.slice(2)); i = 1; }
  const idTokens = stripComments(segs[i] ?? '').text.split(' ').filter(Boolean);
  i++;
  const authservId = (idTokens[0] || '').toLowerCase().replace(/\.$/, '');
  const version = idTokens[1] || '';
  const results = [];
  for (; i < segs.length; i++) {
    const { text, comments } = stripComments(segs[i]);
    if (!text) continue;
    const tokens = text.split(' ').filter(Boolean);
    const head = tokens[0] || '';
    const eq = head.indexOf('=');
    if (eq < 1) continue;                    // a bare `none`, which is not a result
    const props = {};
    for (const t of tokens.slice(1)) {
      const e = t.indexOf('=');
      if (e < 1) continue;
      props[t.slice(0, e).toLowerCase()] = t.slice(e + 1);
    }
    results.push({
      method: head.slice(0, eq).split('/')[0].toLowerCase(),
      result: head.slice(eq + 1).toLowerCase(),
      props,
      comment: comments.join(' ').trim(),
    });
  }
  return { instance, authservId, version, results };
}

/**
 * Is this authserv-id one of ours? Exact, or a DNS label below it.
 * 🔴 NOT A SUBSTRING TEST. See the note on `TRUSTED_AUTHSERV`.
 */
export function trustedAuthserv(id, trusted = TRUSTED_AUTHSERV) {
  const host = String(id || '').toLowerCase().replace(/\.$/, '');
  if (!host) return false;
  return trusted.some((t) => {
    const want = String(t).toLowerCase().replace(/\.$/, '');
    return !!want && (host === want || host.endsWith(`.${want}`));
  });
}

// ── addresses ───────────────────────────────────────────────────────────────

/**
 * The domain of an address, from a bare address or a full `From:` value.
 * ⚠️ THE LAST ANGLE PAIR, NOT THE FIRST, and quoted display names are removed
 * first. `"someone <a@bank.test>" <real@elsewhere.test>` is a legal mailbox and
 * reading the first `<...>` hands back the domain the sender WANTED read.
 */
export function addressDomain(s) {
  const noQuotes = String(s ?? '').replace(/"(?:\\.|[^"\\])*"/g, ' ');
  const angles = noQuotes.match(/<([^<>]*)>/g);
  const addr = (angles && angles.length
    ? angles[angles.length - 1].slice(1, -1)
    : noQuotes).trim();
  const at = addr.lastIndexOf('@');
  if (at < 0) return '';
  return addr.slice(at + 1).toLowerCase().replace(/[\s>.,;]+$/, '');
}

/**
 * Do two domains belong together?
 * ⚠️ THIS IS AN APPROXIMATION AND IT NEVER DECIDES A REFUSAL. Real alignment
 * needs the organisational domain, which needs the Public Suffix List, which is
 * a megabyte that goes stale. Without it `a.co.uk` and `b.co.uk` look related
 * and they are not. So it is used for a note in a label and for nothing else,
 * and DMARC, which was computed by somebody who does have the list, is what
 * the verdict rests on.
 */
export function relatedDomains(a, b) {
  const x = String(a || '').toLowerCase();
  const y = String(b || '').toLowerCase();
  if (!x || !y) return false;
  return x === y || x.endsWith(`.${y}`) || y.endsWith(`.${x}`);
}

// ── picking one answer out of several ───────────────────────────────────────

/**
 * 🔴 A MESSAGE CARRIES TWO SPF RESULTS AND THE FIRST ONE IS THE WRONG ONE.
 * A real stamp reads `spf=none (... no SPF records for postmaster@example.com)
 * smtp.helo=smtp.example.com; spf=pass (...) smtp.mailfrom=joe@example.com`.
 * The HELO check is about the sending machine's own name and is routinely
 * `none` on servers whose mail is perfectly good. The one that answers "did
 * this domain authorise this machine" is the `smtp.mailfrom` one, so it is
 * chosen by its property rather than by its position.
 */
function pickSpf(results) {
  const spfs = results.filter((r) => r.method === 'spf');
  if (!spfs.length) return { result: '', scope: '', domain: '' };
  const mailfrom = spfs.find((r) => 'smtp.mailfrom' in r.props);
  if (mailfrom) {
    return {
      result: mailfrom.result,
      scope: 'mailfrom',
      domain: addressDomain(mailfrom.props['smtp.mailfrom']),
    };
  }
  const helo = spfs.find((r) => 'smtp.helo' in r.props);
  if (helo) return { result: helo.result, scope: 'helo', domain: String(helo.props['smtp.helo'] || '').toLowerCase() };
  return { result: spfs[0].result, scope: 'unscoped', domain: '' };
}

/** A message may carry several signatures. One passing signature is a pass. */
function pickDkim(results, fromDomain) {
  const ds = results.filter((r) => r.method === 'dkim');
  if (!ds.length) return { result: '', domain: '', signers: 0, aligned: null };
  const passes = ds.filter((r) => r.result === 'pass');
  if (passes.length) {
    const aligned = passes.find((r) => relatedDomains(r.props['header.d'], fromDomain));
    const chosen = aligned || passes[0];
    return {
      result: 'pass',
      domain: String(chosen.props['header.d'] || '').toLowerCase(),
      signers: ds.length,
      aligned: fromDomain ? !!aligned : null,
    };
  }
  const worst = ds.reduce((a, b) => (severityOf(b.result) > severityOf(a.result) ? b : a));
  return {
    result: worst.result,
    domain: String(worst.props['header.d'] || '').toLowerCase(),
    signers: ds.length,
    aligned: false,
  };
}

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
export function dmarcPolicy(result) {
  if (!result) return '';
  const prop = result.props['policy.dmarc'];
  if (prop) return String(prop).toLowerCase().replace(/[^a-z]/g, '');
  const m = /(?:^|[\s(;,])p=([a-z]+)/i.exec(result.comment || '');
  return m ? m[1].toLowerCase() : '';
}

// ── the verdict ─────────────────────────────────────────────────────────────

/**
 * What the headers say. Pure, and every input is a string.
 *
 * @param {object} arg
 * @param {Array|Headers|object} arg.headers   header pairs, a `Headers`, or an object
 * @param {string} [arg.envelopeFrom]          `message.from`, what the sending server presented
 * @param {string[]} [arg.trusted]             authserv-ids whose stamps are believed
 * @returns {object} `{ verdict, label, chips, reject, rejectReason, auth, flags, reasons }`
 */
export function classify({ headers, envelopeFrom = '', trusted = TRUSTED_AUTHSERV } = {}) {
  const entries = headerEntries(headers);
  const all = (name) => entries.filter(([k]) => k === name).map(([, v]) => v);
  const one = (name) => all(name)[0] || '';

  const fromHeader = one('from');
  const fromDomain = addressDomain(fromHeader);
  const envDomain = addressDomain(envelopeFrom);

  // ── 1. the stamp ──────────────────────────────────────────────────────────
  const stamps = [];
  for (const v of all('authentication-results')) stamps.push({ kind: 'ar', parsed: parseAuthResults(v) });
  for (const v of all('arc-authentication-results')) stamps.push({ kind: 'arc', parsed: parseAuthResults(v) });

  const believed = stamps.filter((s) => s.parsed && trustedAuthserv(s.parsed.authservId, trusted));
  const strangers = stamps.length - believed.length;

  // Among the stamps we believe, the useful one is the one carrying verdicts.
  // A trusted stamp saying only `arc=none` is the cloudflare/workerd 6740 case
  // and it answers nothing, so it must not outrank a stamp that answers.
  const scored = believed.map((s) => ({
    ...s,
    carries: s.parsed.results.filter((r) => ['spf', 'dkim', 'dmarc'].includes(r.method)).length,
    // a plain stamp beats an ARC one at equal information: ARC is a record of
    // what a PREVIOUS hop concluded, forwarded along.
    order: s.kind === 'ar' ? 0 : 1,
  }));
  scored.sort((a, b) => (b.carries - a.carries) || (a.order - b.order));
  const stamp = scored[0] || null;
  const results = stamp ? stamp.parsed.results : [];

  const spf = pickSpf(results);
  const dkim = pickDkim(results, fromDomain);
  const dmarcResult = results.find((r) => r.method === 'dmarc') || null;
  const dmarc = dmarcResult ? dmarcResult.result : '';
  const policy = dmarcPolicy(dmarcResult);

  const auth = {
    stamped: stamps.length > 0,
    trusted: !!stamp,
    strangers,
    authservId: stamp ? stamp.parsed.authservId : '',
    via: stamp ? stamp.kind : '',
    spf: spf.result,
    spfScope: spf.scope,
    spfDomain: spf.domain,
    dkim: dkim.result,
    dkimDomain: dkim.domain,
    dkimAligned: dkim.aligned,
    dmarc,
    policy,
  };

  // ── 2. bulk markers ───────────────────────────────────────────────────────
  const markers = [];
  if (all('list-unsubscribe').length) markers.push('List-Unsubscribe');
  if (all('list-id').length) markers.push('List-Id');
  const prec = one('precedence').toLowerCase().trim();
  if (/^(bulk|list|junk)$/.test(prec)) markers.push(`Precedence: ${prec}`);
  // RFC 3834: `no` is the value that means a person sent it. Anything else is
  // a machine announcing itself, which is the thing worth knowing.
  const auto = one('auto-submitted').toLowerCase().trim().split(';')[0].trim();
  if (auto && auto !== 'no') markers.push(`Auto-Submitted: ${auto}`);
  if (all('x-auto-response-suppress').length) markers.push('X-Auto-Response-Suppress');
  // An empty return path is where a bounce goes, and it says the sender does
  // not want an answer.
  if (one('return-path').trim() === '<>') markers.push('empty Return-Path');

  const mismatch = !!(envDomain && fromDomain && !relatedDomains(envDomain, fromDomain));
  const flags = { bulk: markers, markers, mismatch, envDomain, fromDomain };

  // ── 3. the ladder ─────────────────────────────────────────────────────────
  const reasons = [];
  let verdict;

  if (!auth.stamped) {
    verdict = 'unknown';
    reasons.push('no authentication stamp on this message');
  } else if (!auth.trusted) {
    verdict = 'unknown';
    reasons.push(`${stamps.length} stamp${stamps.length === 1 ? '' : 's'}, none from a receiver this worker believes`);
  } else if (!spf.result && !dkim.result && !dmarc) {
    verdict = 'unknown';
    reasons.push(`the stamp from ${auth.authservId} carries no SPF, DKIM or DMARC result`);
  } else if (dmarc === 'fail') {
    verdict = 'forged';
    reasons.push(`DMARC failed, so ${fromDomain || 'the From domain'} did not authorise this`);
  } else if (spf.result === 'fail' || dkim.result === 'fail') {
    verdict = 'suspect';
    if (spf.result === 'fail') reasons.push(`SPF failed for ${spf.domain || 'the envelope sender'}`);
    if (dkim.result === 'fail') reasons.push('a DKIM signature did not verify');
  } else if (spf.result !== 'pass' && dkim.result !== 'pass') {
    verdict = 'unsigned';
    reasons.push(`nothing vouched for this: SPF ${spf.result || 'absent'}, DKIM ${dkim.result || 'absent'}`);
  } else {
    verdict = 'clean';
  }

  if (markers.length) {
    reasons.push(`sent by a machine: ${markers.join(', ')}`);
    // Bulk outranks a clean pass and an absent stamp, and nothing else. A
    // `List-Unsubscribe` must never make a forged message look quieter.
    if (RANK.indexOf('bulk') < RANK.indexOf(verdict)) verdict = 'bulk';
  }
  if (mismatch) {
    reasons.push(`the sending server said ${envDomain} and the message says ${fromDomain}`);
  }
  if (strangers) {
    reasons.push(`${strangers} stamp${strangers === 1 ? '' : 's'} from a receiver this worker does not believe, ignored`);
  }
  if (dkim.result === 'pass' && dkim.aligned === false) {
    reasons.push(`the DKIM signature is ${dkim.domain || 'a third party'}, not ${fromDomain}`);
  }

  // ── 4. the one refusal ────────────────────────────────────────────────────
  // 🔴 NARROW ON PURPOSE. Not "this looks like spam": the sending domain's own
  // published policy says a message failing DMARC is forged and asks receivers
  // to refuse it. Refusing is following that instruction. Everything else on
  // this page is a label.
  let reject = false;
  let rejectReason = '';
  if (verdict === 'forged' && auth.trusted) {
    if (policy === 'reject') {
      reject = true;
      rejectReason = `${fromDomain || 'the sending domain'} publishes a DMARC policy of reject and this message failed DMARC`;
    } else if (!policy) {
      // ⚠️ SAY SO RATHER THAN GUESS. A DMARC failure with no published policy in
      // the header is exactly the case the ask says not to refuse.
      reasons.push('DMARC failed and the header does not say what policy the domain publishes, so this is labelled and delivered');
    } else {
      reasons.push(`DMARC failed and the domain publishes p=${policy}, which does not ask for a refusal`);
    }
  }

  const chips = chipsFor(verdict, auth, markers, mismatch, policy);
  return { verdict, chips, label: labelOf(chips), reject, rejectReason, auth, flags, reasons };
}

/** The short form, in the order a reader scans. */
function chipsFor(verdict, auth, markers, mismatch, policy) {
  const out = [verdict === 'clean' ? 'ok' : verdict];

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
  if (auth.via === 'ar') out.push('via Authentication-Results');
  else if (auth.via === 'arc') out.push('via ARC');

  if (verdict === 'unknown') {
    // ⚠️ THREE DIFFERENT SILENCES AND THEY ARE NOT THE SAME SILENCE. No stamp
    // at all is local delivery. A stamp from somebody we do not believe is a
    // forwarding hop or a forgery. A trusted stamp carrying nothing is
    // cloudflare/workerd 6740. Collapsing them sends a reader to the wrong
    // place.
    out.push(!auth.stamped ? 'no auth stamp'
      : !auth.trusted ? 'no trusted stamp'
        : 'stamp says nothing');
    if (markers.length) out.push('bulk');
    if (mismatch) out.push('from mismatch');
    return out;
  }
  if (auth.dmarc && auth.dmarc !== 'pass') out.push(`dmarc ${auth.dmarc}`);
  if (!auth.dmarc) out.push('no dmarc');
  if (auth.spf && auth.spf !== 'pass') out.push(`spf ${auth.spf}`);
  if (!auth.spf) out.push('no spf');
  if (auth.dkim && auth.dkim !== 'pass') out.push(`dkim ${auth.dkim}`);
  if (!auth.dkim) out.push('no dkim');
  // ⚠️ ONLY WHERE IT BEARS ON THE VERDICT. A strict domain whose mail PASSED is
  // the ordinary good case, and a `p=reject` chip on it reads as an alarm about
  // a message that is fine.
  if (policy === 'reject' && verdict === 'forged') out.push('p=reject');
  if (markers.length && verdict !== 'bulk') out.push('bulk');
  if (mismatch) out.push('from mismatch');
  return out;
}

/**
 * The bracketed prefix a reader sees ahead of the subject.
 * ⚠️ IT IS CUT BY WHOLE CHIPS AND NEVER MID WORD. A label that ends `dkim fa`
 * is a fact that has become a different fact.
 */
export function labelOf(chips) {
  const kept = [];
  for (const c of chips) {
    const next = [...kept, c];
    if (`[${next.join(' · ')}]`.length > LABEL_MAX) break;
    kept.push(c);
  }
  return `[${(kept.length ? kept : [chips[0] ?? '?']).join(' · ')}]`;
}

/**
 * The prefix a reader sees ahead of the subject, including what the worker did
 * about it.
 *
 * ⚠️ `refused` GOES SECOND, NOT LAST, because the cap cuts from the end and the
 * one chip that must never be cut is the one saying the message was turned away.
 * A label ending `p=reject` reads as a message that was delivered and flagged,
 * which is the opposite of what happened.
 */
export function prefixFor(verdict, { refused = false } = {}) {
  const chips = verdict && Array.isArray(verdict.chips) ? verdict.chips : ['unknown'];
  if (!refused) return labelOf(chips);
  return labelOf([chips[0], 'refused', ...chips.slice(1)]);
}

/**
 * The same thing from a whole raw message, which is how the worker and the test
 * both reach it: the headers are read off the raw text rather than off a
 * `Headers`, so two stamps of one name stay two stamps.
 */
export function classifyRaw(raw, envelopeFrom = '', opts = {}) {
  return classify({ headers: parseHeaderBlock(raw), envelopeFrom, ...opts });
}
