// demo/shell/live-test.mjs: the WHEP 409 retry with a stubbed fetch, and the failure paths of whepPlay
// and camWhipPublish with a faked RTCPeerConnection. node demo/shell/live-test.mjs
// Seven of 12 are negative controls; `sleep` is injected, so delays are asserted as values.
// why: lessons/kit-live.md#test-header
import { offerSdp, WHEP_RETRY, whepPlay, camWhipPublish } from './live.mjs';

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

// 2. A 409 that clears is not an error.
// why: lessons/kit-live.md#test-409
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

console.log('\n== a failed offer leaks nothing ==');
{
  // A peer connection whose answer is refused, so the throw lands after a 2xx.
  const pcs = [];
  globalThis.RTCPeerConnection = class {
    constructor() { this.closed = false; this.iceGatheringState = 'complete'; this.localDescription = { sdp: 'v=0 offer' }; pcs.push(this); }
    addTransceiver() {} addTrack() {} addEventListener() {}
    async createOffer() { return {}; }
    async setLocalDescription() {}
    async setRemoteDescription() { throw new Error('bad answer'); }
    close() { this.closed = true; }
  };
  globalThis.MediaStream = class { addTrack() {} };
  const sent = [];
  globalThis.fetch = async (url, init) => {
    sent.push({ url: String(url), method: init?.method });
    const ok200 = init?.method === 'POST';
    return { status: ok200 ? 201 : 200, ok: true, text: async () => 'v=0 answer',
      headers: { get: (h) => ({ location: '/whep/s1', 'x-whip-id': 'w1' })[h] ?? null } };
  };

  let err = null;
  try { await whepPlay('https://x/play/whep', {}, {}); } catch (e) { err = e; }
  ok('NEGATIVE CONTROL: a WHEP answer that throws closes its peer connection', err && pcs.at(-1).closed, err?.message);
  ok('NEGATIVE CONTROL: and DELETEs the session the 201 made',
     sent.some((r) => r.method === 'DELETE' && r.url === 'https://x/whep/s1'), JSON.stringify(sent));

  sent.length = 0; err = null;
  try { await camWhipPublish({ getTracks: () => [] }, { url: 'https://x/cam/whip' }); } catch (e) { err = e; }
  ok('NEGATIVE CONTROL: a WHIP answer that throws closes its peer connection', err && pcs.at(-1).closed, err?.message);
  ok('NEGATIVE CONTROL: and DELETEs the session, so the camera input is free',
     sent.some((r) => r.method === 'DELETE' && r.url === 'https://x/cam/whip/w1'), JSON.stringify(sent));

  sent.length = 0; err = null;
  globalThis.fetch = async (url, init) => { sent.push({ url: String(url), method: init?.method });
    return { status: 409, ok: false, text: async () => 'busy', headers: { get: () => null } }; };
  try { await camWhipPublish({ getTracks: () => [] }, { url: 'https://x/cam/whip' }); } catch (e) { err = e; }
  ok('a refused WHIP closes its peer connection and DELETEs nothing, because nothing was made',
     err && pcs.at(-1).closed && !sent.some((r) => r.method === 'DELETE'), err?.message);
}

globalThis.fetch = realFetch;
console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
