// workers/wish — the deployable half. Everything it knows is in `wish.mjs`.
//
// 🔴 THIS FILE USED TO SAY THERE WAS NO HOSTNAME, AND THAT WAS THE RIGHT
// DEFAULT UNTIL SOMEBODY DECIDED OTHERWISE. Asked 2026-09-21: *"In bg can you
// take wish testing gindings, do fixes and do worker and make it working in
// prod"*, corrected to *"I meqn work in local dev"* and then corrected back to
// *"No actuall in prod"*. It is their account and their call, so this is on
// `wish.positron.studio` now, and the comment that used to sit here is the
// reason every line below exists.
//
// 🔴 WHAT IT COSTS TO CALL. Every request runs one Workers AI model on a paid
// account: `/hear` a Whisper and `/wish` a Llama. There is no cache, nothing is
// free, and a loop calling this spends money for as long as it runs.
//
// 🔴 SO THE FRONT DOOR IS DEFAULT DENY, IN THREE CHEAP LAYERS, AND ONLY ONE OF
// THEM IS WORTH ANYTHING AGAINST SOMEBODY TRYING.
//
//  1. **An `Origin` allowlist.** A browser sets that header and a page cannot
//     forge it, so this stops a stray tab on another site and a crawler, which
//     send the wrong origin or none at all. ⚠️ **IT IS NOT SECURITY AND MUST
//     NOT BE DESCRIBED AS SECURITY.** Anything that is not a browser sends
//     whatever it likes, so `curl -H 'origin: https://positron.studio'` walks
//     straight through. What it buys is that the accidents cannot happen.
//  2. **A rate limit per address.** This is the layer that bounds the bill when
//     somebody IS trying. ⚠️ Cloudflare's own documentation calls it
//     *"permissive, eventually consistent, and intentionally designed to not be
//     used as an accurate accounting system"*, and the counter is **per
//     location**: the real ceiling is this number times the number of data
//     centres a caller can reach, not this number. It is a brake, not a gate.
//  3. **A size ceiling on the body.** `/hear` carries base64 audio and the
//     older two models take a byte array at 3.57 bytes per byte, so an
//     unbounded body is an unbounded prompt on somebody else's meter.
//
// ⚠️ AND THE PAGE STILL POINTS AT `demo/wish-local.mjs` WHEN IT IS SERVED FROM
// THIS MACHINE. See `demo/wish/index.html`: the default follows where the page
// came from, and `?api=` overrides both.
import { handle, corsFor, allowedOrigin } from './wish.mjs';

/**
 * 🔴 A BODY LARGER THAN THIS IS REFUSED BEFORE IT IS PARSED, AND THE NUMBER IS
 * ARITHMETIC RATHER THAN A ROUND FIGURE.
 *
 * Whisper is billed by the **audio minute**: `whisper-large-v3-turbo` is 46.63
 * neurons a minute and neurons are $0.011 a thousand. MEASURED on this page's
 * own recordings, one spoken sentence is 12,863 bytes of webm/opus for 3.68 s,
 * which is about 28 kbit/s, so a megabyte of body is roughly **three and a half
 * minutes** of speech, 163 neurons, about **$0.0018** for one call.
 *
 * ⚠️ **THE FIRST DRAFT OF THIS SAID FOUR MEGABYTES AND THE ARITHMETIC IS WHY
 * IT DOES NOT.** At four megabytes one call is fourteen minutes of audio, and
 * the rate limit next door allows thirty of those a minute, which is about
 * **fifteen dollars an hour** from one address in one Cloudflare location. At
 * one megabyte the same worst case is about three. Neither number is a real
 * utterance: an instruction to a desk is a sentence.
 */
const MAX_BODY = 1_000_000;

/** A desk has a handful of ports. A thousand is somebody building a prompt. */
const MAX_PORTS = 64;

const json = (body, status, cors) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', ...cors },
});

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin');
    const cors = corsFor(origin);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    /* 🔴 THE REFUSAL SAYS WHAT IS WRONG AND NOT WHAT IS ALLOWED. A list of
       origins in an error body is a list of headers to try. */
    if (!allowedOrigin(origin)) {
      return json({ error: 'this agent answers pages on positron.studio' }, 403, cors);
    }

    if (request.method !== 'POST') {
      return json({ error: 'post to /hear or /wish' }, 405, cors);
    }

    /* ⚠️ THE ADDRESS COMES FROM `cf-connecting-ip`, WHICH CLOUDFLARE SETS AND
       OVERWRITES. A header a caller supplies is a rate limit a caller opts out
       of. An empty one falls back to a single shared bucket rather than to no
       limit, because the default has to be the safe side. */
    if (env.WISH_RATE) {
      const who = request.headers.get('cf-connecting-ip') || 'unknown';
      const { success } = await env.WISH_RATE.limit({ key: who });
      if (!success) {
        return json({ error: 'too many requests from here, wait a minute' }, 429, cors);
      }
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY) {
      return json({ error: `body is over ${MAX_BODY} bytes` }, 413, cors);
    }
    let body;
    try { body = JSON.parse(raw || '{}'); } catch {
      return json({ error: 'body is JSON' }, 400, cors);
    }
    if (Array.isArray(body.ports) && body.ports.length > MAX_PORTS) {
      return json({ error: `a desk here has at most ${MAX_PORTS} ports` }, 400, cors);
    }

    const out = await handle(new URL(request.url).pathname, body, (m, p) => env.AI.run(m, p));
    return json(out.body, out.status, cors);
  },
};
