// wish.positron.studio, the deployable half; everything it knows is in wish.mjs. Every request runs
// a paid Workers AI model, so the door is default deny: an Origin allowlist (stops accidents, not
// security), a per-address rate limit (per location, a brake not a gate) and a body ceiling.
// why: lessons/workers-wish.md#index-header
import { handle, corsFor, allowedOrigin } from './wish.mjs';
import { createLimiter, addressTag } from './limit.mjs';

// The paid routes' burst and per-minute cap, per visitor; kept per isolate (limit.mjs says why).
const limiter = createLimiter();

// Refused before parsing. Whisper bills by audio minute and speech is about 28 kbit/s, so 1 MB is
// about 3.5 minutes, $0.0018 a call; at the rate limit that bounds one address near $3 an hour.
// why: lessons/workers-wish.md#max-body
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

    // The refusal says what is wrong, not what is allowed: listed origins are headers to try.
    // why: lessons/workers-wish.md#refusal
    if (!allowedOrigin(origin)) {
      return json({ error: 'this agent answers pages on positron.studio' }, 403, cors);
    }

    if (request.method !== 'POST') {
      return json({ error: 'post to /hear, /wish or /wish/code' }, 405, cors);
    }

    // The address is `cf-connecting-ip`, which Cloudflare sets; an empty one shares one bucket.
    // why: lessons/workers-wish.md#address
    if (env.WISH_RATE) {
      const who = request.headers.get('cf-connecting-ip') || 'unknown';
      const { success } = await env.WISH_RATE.limit({ key: who });
      if (!success) {
        return json({ error: 'too many requests from here, wait a minute' }, 429, cors);
      }
    }

    const path = new URL(request.url).pathname;
    const limited = limiter.take(await addressTag(request.headers.get('cf-connecting-ip')), path);
    if (limited) {
      return json({ error: limited.error }, 429, { ...cors, 'retry-after': String(limited.retryAfter) });
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

    const out = await handle(path, body, (m, p) => env.AI.run(m, p));
    return json(out.body, out.status, cors);
  },
};
