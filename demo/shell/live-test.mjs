// demo/shell/live-test.mjs — the WHEP retry, with a stubbed fetch and no browser.
//
//   node demo/shell/live-test.mjs
//
// It exists for one reason: `offerSdp` retries a 409, and a retry nobody has
// watched fire is a retry nobody knows they have. Three of the six checks below
// are NEGATIVE CONTROLS — they require the guard to NOT fire — because a retry
// that fires on everything would turn a permanent 404 into a seven-second hang
// and a page that reads as slow rather than as wrong.
//
// `sleep` is injected, so this runs in milliseconds rather than in the ~7 s the
// real backoff takes. The delays are asserted as VALUES instead.
import { offerSdp, WHEP_RETRY } from './live.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' · ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' · ' + detail : ''}`); }
};

/** A fetch that answers with the given statuses in order, and counts calls. */
function stub(statuses) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const status = statuses[Math.min(calls.length, statuses.length - 1)];
    calls.push({ url, body: init?.body, status });
    return {
      status,
      ok: status >= 200 && status < 300,
      text: async () => 'v=0 answer',
      headers: { get: () => 'https://x/whep/1' },
    };
  };
  return calls;
}
const realFetch = globalThis.fetch;
const napped = [];
const nap = async (ms) => { napped.push(ms); };

console.log('\n== the WHEP 409 retry ==');

// 1. The ordinary case: one call, no waiting at all.
{
  const calls = stub([201]);
  napped.length = 0;
  const res = await offerSdp('https://x/whep', 'v=0 offer', { sleep: nap });
  ok('a 201 is one request and no waiting', calls.length === 1 && napped.length === 0 && res.status === 201,
     `${calls.length} request(s), ${napped.length} waits`);
}

// 2. 🔴 THE ONE THIS EXISTS FOR. A 409 that clears is not an error.
{
  const calls = stub([409, 409, 201]);
  napped.length = 0;
  const res = await offerSdp('https://x/whep', 'v=0 offer', { sleep: nap });
  ok('a 409 that clears is retried and then succeeds', calls.length === 3 && res.status === 201,
     `${calls.length} requests, waited ${napped.join('+')} ms`);
  ok('...and it backs off rather than spinning',
     napped.length === 2 && napped[0] === WHEP_RETRY.firstMs && napped[1] > napped[0],
     `${napped.join(' then ')} ms`);
  ok('...re-posting the SAME offer, because a 409 created nothing to leak',
     calls.every((c) => c.body === 'v=0 offer'), `${calls.length} identical bodies`);
}

// 3. NEGATIVE CONTROL: it must give up, not wait forever.
{
  const calls = stub([409]);
  napped.length = 0;
  let err = null;
  try { await offerSdp('https://x/whep', 'v=0 offer', { sleep: nap }); } catch (e) { err = e; }
  ok('a 409 that never clears gives up, and says how long it asked for',
     calls.length === WHEP_RETRY.tries + 1 && /still nothing publishing after/.test(err?.message || ''),
     err?.message || 'no error at all');
}

// 4. NEGATIVE CONTROL: a permanent failure must NOT be retried. A 404 does not
//    become a 201 by being asked again, and turning one into seven seconds of
//    waiting is how a wrong page starts reading as a slow one.
{
  const calls = stub([404]);
  napped.length = 0;
  let err = null;
  try { await offerSdp('https://x/whep', 'v=0 offer', { sleep: nap }); } catch (e) { err = e; }
  ok('a 404 fails at once, with no retry and no waiting',
     calls.length === 1 && napped.length === 0 && /WHEP 404/.test(err?.message || ''),
     `${calls.length} request(s), ${napped.length} waits · ${err?.message}`);
}

// 5. NEGATIVE CONTROL: nor a 500, which is the one a retry looks most sensible
//    for. It is not this function's job — the caller can decide to try again,
//    and it will know that it did.
{
  const calls = stub([500]);
  napped.length = 0;
  let err = null;
  try { await offerSdp('https://x/whep', 'v=0 offer', { sleep: nap }); } catch (e) { err = e; }
  ok('a 500 fails at once too: only 409 means “not yet”',
     calls.length === 1 && napped.length === 0, `${calls.length} request(s), ${err?.message}`);
}

globalThis.fetch = realFetch;
console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
