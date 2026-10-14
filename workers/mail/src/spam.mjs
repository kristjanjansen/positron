// Whether a person typed it, from headers only (pure; never subject or body). Labels, never drops,
// except DMARC failing under `p=reject`. Signals: trusted Authentication-Results, bulk markers,
// envelope vs From. A missing stamp is `unknown`.
// why: lessons/workers-mail.md#spam-header

// Only stamps the receiving server wrote are believed: exact authserv-id or a DNS label below it,
// never a substring (`/cloudflare/i` accepts `notcloudflare.net`).
// why: lessons/workers-mail.md#trusted
export const TRUSTED_AUTHSERV = ['cloudflare.net'];

/** Longest label this may hand a reader, brackets included. */
export const LABEL_MAX = 72;

// Worst first, and graded: `forged` must outrank `bulk`, or List-Unsubscribe buys a quieter label.
// why: lessons/workers-mail.md#rank
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

// Header pairs off the raw text, names lowercased, folds joined: `Headers` glues two values of one
// name with a comma, so a forged stamp and the real one would arrive as one.
// why: lessons/workers-mail.md#header-block
export function parseHeaderBlock(text) {
  const src = String(text ?? '');
  // The block ends at the first blank line. CRLF is the wire form; a fixture
  // typed by a person uses LF, and both are accepted.
  const end = src.search(/\r?\n\r?\n/);
  const block = end < 0 ? src : src.slice(0, end);
  const out = [];
  let cur = null;
  for (const line of block.split(/\r?\n/)) {
    // A continuation line belongs to the header above; real stamps are folded over 3 or 4 lines.
    // why: lessons/workers-mail.md#fold
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

// Split on result semicolons only: comments and quoted strings contain semicolons too.
// why: lessons/workers-mail.md#split-top
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

// Comments are lifted out and kept: the DMARC one carries the published policy.
// why: lessons/workers-mail.md#comments
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
  // A comment may sit between a method and its `=`, so spacing around `=` is normalised first.
  // why: lessons/workers-mail.md#equals
  return { text: out.replace(/\s*=\s*/g, '=').replace(/\s+/g, ' ').trim(), comments };
}

// Parses one (ARC-)Authentication-Results value into { instance, authservId, version, results },
// each result { method, result, props, comment }.
// why: lessons/workers-mail.md#parse-ar
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

// Exact, or a DNS label below it; never a substring.
// why: lessons/workers-mail.md#trusted-authserv
export function trustedAuthserv(id, trusted = TRUSTED_AUTHSERV) {
  const host = String(id || '').toLowerCase().replace(/\.$/, '');
  if (!host) return false;
  return trusted.some((t) => {
    const want = String(t).toLowerCase().replace(/\.$/, '');
    return !!want && (host === want || host.endsWith(`.${want}`));
  });
}

// ── addresses ───────────────────────────────────────────────────────────────

// The last angle pair, after quoted display names are removed: the first `<...>` can be a decoy.
// why: lessons/workers-mail.md#address-domain
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

// An approximation without the Public Suffix List (`a.co.uk` and `b.co.uk` look related), so it
// only adds a note and never decides a refusal; DMARC decides.
// why: lessons/workers-mail.md#related
export function relatedDomains(a, b) {
  const x = String(a || '').toLowerCase();
  const y = String(b || '').toLowerCase();
  if (!x || !y) return false;
  return x === y || x.endsWith(`.${y}`) || y.endsWith(`.${x}`);
}

// ── picking one answer out of several ───────────────────────────────────────

// Two SPF results arrive: the HELO one is routinely `none`. Choose `smtp.mailfrom` by property.
// why: lessons/workers-mail.md#pick-spf
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

// The published policy, from `policy.dmarc=` or the `(p=... sp=...)` comment. `p` must begin a
// token, since `sp=` (subdomains) is not `p=`. With only `sp=` known it answers nothing.
// why: lessons/workers-mail.md#dmarc-policy
export function dmarcPolicy(result) {
  if (!result) return '';
  const prop = result.props['policy.dmarc'];
  if (prop) return String(prop).toLowerCase().replace(/[^a-z]/g, '');
  const m = /(?:^|[\s(;,])p=([a-z]+)/i.exec(result.comment || '');
  return m ? m[1].toLowerCase() : '';
}

// ── the verdict ─────────────────────────────────────────────────────────────

// What the headers say; pure. Takes { headers (pairs, Headers or object), envelopeFrom, trusted }
// and returns { verdict, label, chips, reject, rejectReason, auth, flags, reasons }.
// why: lessons/workers-mail.md#classify
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

  // 4. The one refusal, narrow on purpose: the sending domain's own policy asks for it.
  // why: lessons/workers-mail.md#refusal
  let reject = false;
  let rejectReason = '';
  if (verdict === 'forged' && auth.trusted) {
    if (policy === 'reject') {
      reject = true;
      rejectReason = `${fromDomain || 'the sending domain'} publishes a DMARC policy of reject and this message failed DMARC`;
    } else if (!policy) {
      // A DMARC failure with no published policy in the header is not refused; say so.
      // why: lessons/workers-mail.md#no-policy
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

  // Which signal decided, on every message, ordinary ones too: `via ARC` means a previous hop's
  // word,
  // and the primary stamp may not arrive at all (workerd 6740).
  // why: lessons/workers-mail.md#via
  if (auth.via === 'ar') out.push('via Authentication-Results');
  else if (auth.via === 'arc') out.push('via ARC');

  if (verdict === 'unknown') {
    // Three silences: no stamp (local delivery), an untrusted stamp (forwarder or forgery), and a
    // trusted stamp with nothing in it (workerd 6740).
    // why: lessons/workers-mail.md#silences
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
  // Only where it bears on the verdict; on mail that passed it reads as a false alarm.
  // why: lessons/workers-mail.md#p-reject
  if (policy === 'reject' && verdict === 'forged') out.push('p=reject');
  if (markers.length && verdict !== 'bulk') out.push('bulk');
  if (mismatch) out.push('from mismatch');
  return out;
}

// Cut by whole chips, never mid word.
// why: lessons/workers-mail.md#label-of
export function labelOf(chips) {
  const kept = [];
  for (const c of chips) {
    const next = [...kept, c];
    if (`[${next.join(' · ')}]`.length > LABEL_MAX) break;
    kept.push(c);
  }
  return `[${(kept.length ? kept : [chips[0] ?? '?']).join(' · ')}]`;
}

// `refused` goes second, since the cap cuts from the end and that chip must survive.
// why: lessons/workers-mail.md#prefix-for
export function prefixFor(verdict, { refused = false } = {}) {
  const chips = verdict && Array.isArray(verdict.chips) ? verdict.chips : ['unknown'];
  if (!refused) return labelOf(chips);
  return labelOf([chips[0], 'refused', ...chips.slice(1)]);
}

// From a whole raw message, so two stamps of one name stay two.
// why: lessons/workers-mail.md#classify-raw
export function classifyRaw(raw, envelopeFrom = '', opts = {}) {
  return classify({ headers: parseHeaderBlock(raw), envelopeFrom, ...opts });
}
