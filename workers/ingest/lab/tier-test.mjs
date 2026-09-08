// workers/ingest/lab/tier-test.mjs — the one function where a mistake is a leak.
//
// `tierOf` decides whether a caller gets the six-hour capped path or the untimed
// one. Every case below is a way it could wrongly answer `trusted`; "no token"
// and "bad token" are DIFFERENT BUGS and are tested separately, because an
// implementation that returns the default on a missing header can still fall
// through on a present-but-wrong one.
//
//   node workers/ingest/lab/tier-test.mjs

import { tierOf } from '../worker.mjs';

const SECRET = 'a-real-looking-token-0123456789';
const env = { SELFREC_TOKEN: SECRET };
const req = (headers) => new Request('https://x/open', { method: 'POST', headers });

let pass = 0, fail = 0;
const is = (label, got, want) => {
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label} — got ${got}, want ${want}`);
};

console.log('tierOf: everything that is not a valid token must be `open`');
is('no header at all',            tierOf(req({}), env), 'open');
is('empty Authorization',         tierOf(req({ authorization: '' }), env), 'open');
is('malformed — no Bearer',       tierOf(req({ authorization: SECRET }), env), 'open');
is('malformed — Bearer, no value', tierOf(req({ authorization: 'Bearer ' }), env), 'open');
is('wrong token, right length',   tierOf(req({ authorization: `Bearer ${'x'.repeat(SECRET.length)}` }), env), 'open');
is('wrong token, short',          tierOf(req({ authorization: 'Bearer x' }), env), 'open');
is('right token as a PREFIX',     tierOf(req({ authorization: `Bearer ${SECRET}extra` }), env), 'open');
is('token in a query string',     tierOf(new Request(`https://x/open?token=${SECRET}`), env), 'open');
is('lowercase bearer',            tierOf(req({ authorization: `bearer ${SECRET}` }), env), 'open');
is('no secret configured',        tierOf(req({ authorization: `Bearer ${SECRET}` }), {}), 'open');

console.log('and the one case that must be `trusted`');
is('the exact token',             tierOf(req({ authorization: `Bearer ${SECRET}` }), env), 'trusted');

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}`);
process.exit(fail ? 1 : 0);
