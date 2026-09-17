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

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  classify, classifyRaw, parseHeaderBlock, parseAuthResults, trustedAuthserv,
  dmarcPolicy, addressDomain, relatedDomains, labelOf, prefixFor, LABEL_MAX, RANK,
} from './src/spam.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = join(HERE, 'fixtures');
const read = (name) => readFileSync(join(FIX, name), 'utf8');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' · ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' · ' + detail : ''}`); }
};

// ── reading the header block ────────────────────────────────────────────────

console.log('\n== the header block ==');

// 1. A folded header is ONE header. Every real Authentication-Results is folded
//    across three or four lines, so a parser that reads lines on their own sees
//    the verdicts as junk and reports a stamp with nothing in it.
{
  const h = parseHeaderBlock(read('15-arc-cloudflare-full.eml'));
  const arc = h.find(([k]) => k === 'arc-authentication-results')[1];
  ok('a header folded over seven lines comes back as one value',
    arc.includes('smtp.mailfrom=joe@example.com') && arc.includes('mx.cloudflare.net')
    && !arc.includes('\n') && !arc.includes('\t'),
    `${arc.length} characters on one line`);
}

// 2. NEGATIVE CONTROL, AND IT IS THE REASON THIS FILE PARSES RAW TEXT AT ALL.
//    A `Headers` joins two headers of one name into one comma separated string,
//    so a stranger's forged stamp and the receiving server's real one would
//    arrive glued together under the stranger's authserv-id. Read off the raw
//    message they stay two.
{
  const h = parseHeaderBlock(read('10-spoofed-plus-real.eml'));
  const stamps = h.filter(([k]) => k === 'authentication-results');
  ok('two stamps of one name stay two stamps', stamps.length === 2,
    `${stamps.length} found, ids ${stamps.map(([, v]) => v.split(';')[0]).join(' and ')}`);
}

// 3. The block ends at the first blank line, so nothing in a body can pose as
//    a header.
{
  const h = parseHeaderBlock('Subject: real\r\n\r\nAuthentication-Results: mx.cloudflare.net; spf=pass\r\n');
  ok('a header line written in the body is not a header',
    h.length === 1 && h[0][0] === 'subject', `${h.length} header(s)`);
}

// ── RFC 8601 ────────────────────────────────────────────────────────────────

console.log('\n== the stamp ==');

// 4. NEGATIVE CONTROL. A comment contains semicolons and colons, so splitting
//    the value on `;` cuts the comment in half and loses the property that says
//    which address the result is about.
{
  const v = 'mx.cloudflare.net; spf=pass (mx.cloudflare.net: domain of joe@example.com'
    + ' designates 2a00:1440:4824:20::32e as permitted sender) smtp.mailfrom=joe@example.com';
  const p = parseAuthResults(v);
  ok('a comment full of semicolons and colons does not split a result',
    p.results.length === 1 && p.results[0].props['smtp.mailfrom'] === 'joe@example.com',
    `${p.results.length} result, mailfrom ${p.results[0]?.props['smtp.mailfrom']}`);
}

// 5. An ARC set opens with its instance number before the authserv-id.
{
  const p = parseAuthResults('i=1; mx.cloudflare.net; arc=none');
  ok('an ARC stamp reads its instance and still finds the authserv-id',
    p.instance === 1 && p.authservId === 'mx.cloudflare.net',
    `i=${p.instance}, id ${p.authservId}`);
}

// ── whose stamp is believed ─────────────────────────────────────────────────

console.log('\n== whose stamp is believed ==');

// 6. NEGATIVE CONTROL, AND IT IS A BUG A REAL PROJECT SHIPPED. Guarding this on
//    the substring `cloudflare` accepts all three of the spoofs below, which is
//    a stranger's stamp read as the receiving server's own.
{
  const yes = ['cloudflare.net', 'mx.cloudflare.net', 'MX.CLOUDFLARE.NET', 'route2.mx.cloudflare.net'];
  const no = ['notcloudflare.net', 'cloudflare.evil.tld', 'mx.cloudflare.net.evil-mx.example',
    'mx.google.com', 'cloudflare.net.', '', 'xcloudflare.net'];
  const badYes = yes.filter((x) => !trustedAuthserv(x));
  const badNo = no.filter((x) => trustedAuthserv(x) && x !== 'cloudflare.net.');
  ok('a trusted authserv-id is an exact match or a DNS label below it',
    badYes.length === 0 && badNo.length === 0,
    `${yes.length} accepted, ${no.length - 1} refused${badYes.length || badNo.length ? ` · wrong: ${[...badYes, ...badNo].join(', ')}` : ''}`);
  // a trailing root dot is the same host and is accepted on purpose
  ok('a trailing root dot is the same host', trustedAuthserv('mx.cloudflare.net.'));
}

// ── the published DMARC policy ──────────────────────────────────────────────

console.log('\n== the published policy ==');

// 7. 🔴 NEGATIVE CONTROL, AND IT IS THE `s.includes` BUG IN ONE LINE. `sp=` is
//    the policy for SUBDOMAINS. The string `sp=reject` CONTAINS the substring
//    `p=reject`, so a guard written that way refuses mail from a domain whose
//    own policy is `p=none` and which asked for it to be delivered.
{
  const only = parseAuthResults('mx.cloudflare.net; dmarc=fail (p=none sp=reject dis=none) header.from=x.example');
  const got = dmarcPolicy(only.results[0]);
  const naive = 'p=none sp=reject dis=none'.includes('p=reject');
  ok('sp=reject is not p=reject', got === 'none',
    `read ${got}, and a substring test would have read reject: ${naive}`);
}

// 8. A policy that is only published for subdomains answers NOTHING, because
//    knowing whether it applies means knowing which domain published the
//    record, and the header does not say.
{
  const p = parseAuthResults('mx.cloudflare.net; dmarc=fail (sp=reject dis=none) header.from=x.example');
  ok('a policy with no p= answers nothing rather than guessing',
    dmarcPolicy(p.results[0]) === '', `read "${dmarcPolicy(p.results[0])}"`);
}

// 9. Both forms are read: the RFC 8601 property and the comment.
{
  const prop = parseAuthResults('mx.cloudflare.net; dmarc=fail header.from=x.example policy.dmarc=reject');
  const comment = parseAuthResults('mx.cloudflare.net; dmarc=fail (p=REJECT sp=NONE dis=REJECT) header.from=x.example');
  ok('the policy is read from the property and from the comment',
    dmarcPolicy(prop.results[0]) === 'reject' && dmarcPolicy(comment.results[0]) === 'reject');
}

// ── addresses ───────────────────────────────────────────────────────────────

console.log('\n== addresses ==');

// 10. NEGATIVE CONTROL. A display name is allowed to be a quoted string with an
//     address inside it. Reading the FIRST angle pair hands back the domain the
//     sender wanted read rather than the one the message is from.
{
  const tricky = '"somebody <ceo@bank.example>" <postmaster@evil-mx.example>';
  ok('a domain comes from the last angle pair, not the first',
    addressDomain(tricky) === 'evil-mx.example', addressDomain(tricky));
  ok('a bare address works too', addressDomain('maarja@gmail.com') === 'gmail.com');
  ok('nothing in, nothing out', addressDomain('') === '' && addressDomain(undefined) === '');
}

// 11. Relatedness is a suffix on a DNS LABEL, never a substring.
ok('mail.example is related to example and notexample is not',
  relatedDomains('mail.example', 'example') && !relatedDomains('notexample', 'example'));

// ── the corpus ──────────────────────────────────────────────────────────────

console.log('\n== twenty messages ==');

// file, envelope sender (what the sending server presented), verdict, refuse?
// ⚠️ THE ENVELOPE SENDER IS NOT IN THE FILE. It is `message.from` on the Worker
// API, which travels in the SMTP conversation rather than in the message, so it
// is supplied here the way the platform supplies it.
const CORPUS = [
  ['01-person-clean.eml', 'maarja@gmail.com', 'clean', false,
    'a person on Gmail, everything passing. THE CONTROL ON THE WHOLE IDEA'],
  ['02-person-no-spf-record.eml', 'jaan@kodu.example', 'clean', false,
    'NEGATIVE CONTROL: no SPF record published is not a fault, and DKIM carried it'],
  ['03-newsletter.eml', 'bounce-9182@news.example', 'bulk', false,
    'passes everything and is still not a person typing'],
  ['04-autoreply.eml', '', 'bulk', false,
    'an out of office: empty return path, Auto-Submitted, and it passes SPF'],
  ['05-dmarc-fail-no-policy.eml', 'billing@bank.example', 'forged', false,
    'NEGATIVE CONTROL: DMARC failed and no policy is published, so it is labelled and delivered'],
  ['06-dmarc-reject-property.eml', 'bounce@evil-mx.example', 'forged', true,
    'the only refusal: the domain publishes p=reject and the message failed DMARC'],
  ['07-dmarc-reject-comment.eml', 'bounce@evil-mx.example', 'forged', true,
    'the same, with the policy only in the comment'],
  ['08-dmarc-fail-sp-reject.eml', 'post@sub.tolerant.example', 'forged', false,
    'NEGATIVE CONTROL: p=none with sp=reject must not be refused'],
  ['09-spoofed-authserv.eml', 'ceo@bank.example', 'unknown', false,
    'NEGATIVE CONTROL: a stamp the sender wrote about itself, claiming every pass'],
  ['10-spoofed-plus-real.eml', 'x@evil-mx.example', 'forged', true,
    'NEGATIVE CONTROL: a forged stamp ABOVE the real one, and the real one wins'],
  ['11-spf-helo-fails-mailfrom-passes.eml', 'hei@sober.example', 'clean', false,
    'NEGATIVE CONTROL: two SPF results, and the first one is the wrong one'],
  ['12-arc-google-none.eml', 'someone@gmail.com', 'unknown', false,
    'the shape cloudflare/workerd 6740 reports: one ARC line, no verdicts, not ours'],
  ['13-arc-cloudflare-empty.eml', 'someone@elsewhere.example', 'unknown', false,
    'a stamp we believe that says nothing, which is not the same as no stamp'],
  ['14-no-stamp.eml', 'tester@localhost.example', 'unknown', false,
    'what wrangler dev delivers, and the reason this suite cannot live there'],
  ['15-arc-cloudflare-full.eml', 'joe@example.com', 'clean', false,
    'NEGATIVE CONTROL: publishes p=reject and PASSES, so the policy must not refuse it'],
  ['16-envelope-mismatch.eml', 'bounces+7712@mailer.example', 'clean', false,
    'NEGATIVE CONTROL: a person sending through a service, mismatch noted not punished'],
  ['17-dkim-third-party.eml', 'send@relay.example', 'clean', false,
    'signed by the relay rather than the author, and no DMARC result was stamped'],
  ['18-list-resigned.eml', 'bounce@list.example', 'bulk', false,
    'NEGATIVE CONTROL: a list broke one signature and re-signed, which is normal'],
  ['19-spf-fail-no-dmarc.eml', 'sender@nodmarc.example', 'suspect', false,
    'SPF failed and the domain publishes no DMARC record, so there is no policy to obey'],
  ['20-nothing-published.eml', 'post@bare.example', 'unsigned', false,
    'no SPF record, no signature, no DMARC record: nobody vouched for it and nobody refused it'],
];

const seen = [];
for (const [file, env, want, wantReject, why] of CORPUS) {
  const v = classifyRaw(read(file), env);
  seen.push(v);
  ok(`${file.replace(/^\d+-|\.eml$/g, '')} reads ${want}`,
    v.verdict === want && v.reject === wantReject,
    `${v.label}${v.reject ? ' REFUSED' : ''} · ${why}`);
}

// ── the corpus as a whole ───────────────────────────────────────────────────

console.log('\n== what the corpus proves about the labeller ==');

// 12. 🔴 THE CONTROL ON EVERYTHING ABOVE. A labeller stuck on one answer passes
//     any single assert you like. Six of twenty fixtures are ordinary mail from
//     a person and must come out clean, so "always suspicious" fails here.
{
  const clean = seen.filter((v) => v.verdict === 'clean').length;
  ok('six messages from a person come out clean', clean === 6,
    `${clean} clean of ${seen.length}`);
}

// 13. AND EVERY RUNG OF THE LADDER IS REACHED. A branch no fixture exercises is
//     a branch nobody has checked, and this assert is what caught `suspect` and
//     `unsigned` going ungraded through the first eighteen fixtures.
{
  const kinds = new Set(seen.map((v) => v.verdict));
  const missing = RANK.filter((r) => !kinds.has(r));
  ok('every verdict the ladder can reach is reached by a fixture',
    missing.length === 0,
    missing.length ? `never reached: ${missing.join(', ')}`
      : RANK.map((r) => `${r} ${seen.filter((v) => v.verdict === r).length}`).join(' · '));
}

// 13. NEGATIVE CONTROL ON THE REFUSAL ITSELF. Exactly three fixtures may be
//     refused and all three are a DMARC failure against a published p=reject.
//     Nothing else on this page may ever set it.
{
  const refused = seen.filter((v) => v.reject);
  ok('only a DMARC failure against a published p=reject is refused',
    refused.length === 3
    && refused.every((v) => v.verdict === 'forged' && v.auth.policy === 'reject'
      && v.auth.dmarc === 'fail' && v.auth.trusted),
    `${refused.length} refused of ${seen.length}`);
}

// 14. And a refusal always says why, in words a sender can act on.
ok('every refusal carries a reason',
  seen.filter((v) => v.reject).every((v) => v.rejectReason.length > 20),
  seen.find((v) => v.reject)?.rejectReason || 'none');

// 15. The ordering is a claim rather than a preference: a spammer must not get
//     a quieter label by adding a List-Unsubscribe to a forged message.
{
  const forged = read('06-dmarc-reject-property.eml')
    .replace('From:', 'List-Unsubscribe: <https://evil-mx.example/u>\r\nPrecedence: bulk\r\nFrom:');
  const v = classifyRaw(forged, 'bounce@evil-mx.example');
  ok('a bulk marker cannot make a forged message look quieter',
    v.verdict === 'forged' && v.reject === true && v.chips.includes('bulk'),
    `${v.label}`);
  ok('the rank is worst first', RANK[0] === 'forged' && RANK[RANK.length - 1] === 'clean',
    RANK.join(' > '));
}

// 16. NEGATIVE CONTROL. The strongest signal wins even when it is the only one
//     that is bad: a message whose SPF and DKIM both pass and whose DMARC fails
//     is forged, because DMARC is the check that asks whether the passes belong
//     to the domain in the From line.
{
  const v = classify({
    headers: [['authentication-results',
      'mx.cloudflare.net; spf=pass smtp.mailfrom=x@relay.example;'
      + ' dkim=pass header.d=relay.example; dmarc=fail header.from=bank.example policy.dmarc=reject']],
    envelopeFrom: 'x@relay.example',
  });
  ok('two passes do not outvote a DMARC failure',
    v.verdict === 'forged' && v.reject === true, v.label);
}

// ── the label ───────────────────────────────────────────────────────────────

console.log('\n== the label ==');

// 17. It has to fit where a reader scans, and be cut by whole chips. A label
//     ending `dkim fa` is a fact that has become a different fact.
{
  const long = seen.map((v) => v.label).sort((a, b) => b.length - a.length)[0];
  ok('every label fits inside the cap',
    seen.every((v) => v.label.length <= LABEL_MAX),
    `longest ${long.length} of ${LABEL_MAX}: ${long}`);
  const cut = labelOf(['forged', 'dmarc fail', 'spf fail', 'dkim fail', 'p=reject',
    'bulk', 'from mismatch', 'and more still']);
  ok('a label too long is cut between chips, never inside one',
    cut.length <= LABEL_MAX && !cut.includes('and mor') && cut.startsWith('[forged · '),
    `${cut.length} chars: ${cut}`);
}

// 18. CLAUDE.md, and the two formatters that were stamping them are why this is
//     checked in code rather than swept by hand.
{
  const strings = [...seen.map((v) => v.label), ...seen.flatMap((v) => v.reasons),
    ...seen.map((v) => v.rejectReason)];
  ok('no em dash in anything a reader sees',
    strings.every((s) => !s.includes('—')), `${strings.length} strings`);
}

// 19. A clean message from a person says so in four characters, because the
//     alternative is an empty prefix, which cannot be told apart from a build
//     that has no labelling in it.
ok('a clean message is labelled, not left blank',
  classifyRaw(read('01-person-clean.eml'), 'maarja@gmail.com').label === '[ok]');

// 20. 🔴 NEGATIVE CONTROL ON THE CAP AND THE REFUSAL TOGETHER. The longest label
//     in the corpus is one chip under the limit, so appending `refused` to the
//     END of it would be cut off by the cap and the label would read as a
//     message that was delivered and flagged. It goes second.
{
  const v = classifyRaw(read('06-dmarc-reject-property.eml'), 'bounce@evil-mx.example');
  const p = prefixFor(v, { refused: true });
  ok('a refusal survives the cap, and the chip it displaces does not',
    p.includes('refused') && p.length <= LABEL_MAX && p.startsWith('[forged · refused'),
    `${p.length} of ${LABEL_MAX}: ${p}`);
  const naive = labelOf([...v.chips, 'refused']);
  ok('appending it at the end would have lost it',
    !naive.includes('refused'), `${naive.length} chars: ${naive}`);
  ok('an unrefused message gains no chip',
    prefixFor(v, { refused: false }) === v.label);
}

// 21. What the note actually opens with, which is the thing a reader sees.
{
  const v = classifyRaw(read('03-newsletter.eml'), 'bounce-9182@news.example');
  const opening = `${prefixFor(v, { refused: false })} Your weekly roundup`;
  ok('the note opens with the verdict and then the subject',
    opening === '[bulk] Your weekly roundup', opening);
}

// ── the module keeps its promise ────────────────────────────────────────────

console.log('\n== pure ==');

// 20. The claim in this file's first paragraph, checked rather than repeated.
//     A smoke test on the source rather than a proof, and it fires on the one
//     thing that would actually happen: somebody reaching for the network to
//     look a domain up.
{
  const src = readFileSync(join(HERE, 'src', 'spam.mjs'), 'utf8');
  const banned = [/\bfetch\s*\(/, /\bWebSocket\b/, /\bcaches\b/, /^import\s/m,
    /\brequire\s*\(/, /\bDate\s*\.\s*now\b/, /\bcrypto\b/];
  const hits = banned.filter((r) => r.test(src)).map((r) => String(r));
  ok('the classifier reaches for no network, no clock and no import',
    hits.length === 0, hits.length ? hits.join(' ') : `${src.length} characters read`);
}

// 21. Every fixture on disk is in the table above. A fixture nobody asserts on
//     is a case somebody thought about and then did not check.
{
  const onDisk = readdirSync(FIX).filter((f) => f.endsWith('.eml')).sort();
  const inTable = CORPUS.map(([f]) => f).sort();
  ok('every fixture on disk is asserted on',
    onDisk.length === inTable.length && onDisk.every((f, i) => f === inTable[i]),
    `${onDisk.length} on disk, ${inTable.length} in the table`);
}

console.log(`\n${pass}/${pass + fail} green${fail ? ` · ${fail} FAILED` : ''}\n`);
process.exit(fail ? 1 : 0);
