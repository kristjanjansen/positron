// workers/wish — the deployable half. Everything it knows is in `wish.mjs`.
//
// 🔴 NO ROUTE AND NO workers.dev SUBDOMAIN, DELIBERATELY. Every call spends
// somebody's account, so this is not on a hostname a crawler or a stray tab can
// find. It is here so the thing can be deployed when somebody decides to; today
// the page talks to `demo/wish-local.mjs` instead.
import { handle, CORS } from './wish.mjs';

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'post to /hear or /wish' }), {
        status: 405, headers: { 'content-type': 'application/json', ...CORS } });
    }
    let body;
    try { body = await request.json(); } catch {
      return new Response(JSON.stringify({ error: 'body is JSON' }), {
        status: 400, headers: { 'content-type': 'application/json', ...CORS } });
    }
    const out = await handle(new URL(request.url).pathname, body, (m, p) => env.AI.run(m, p));
    return new Response(JSON.stringify(out.body), {
      status: out.status, headers: { 'content-type': 'application/json', ...CORS } });
  },
};
