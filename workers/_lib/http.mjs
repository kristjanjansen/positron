// Shared by the live workers. Each worker's wrangler bundles this file into its
// own script (checked with `wrangler deploy --dry-run`), so nothing here is a
// runtime dependency between workers.

/** `access-control-allow-origin: *` for a route any page may read. */
export const OPEN = { 'access-control-allow-origin': '*' };

/** JSON with an open CORS header; `headers` adds to or overrides it. */
export const json = (o, status = 200, headers = {}) => new Response(JSON.stringify(o), {
  status,
  headers: { 'content-type': 'application/json', ...OPEN, ...headers },
});

/** A preflight answer for `methods`, cached for a day. */
export const preflight = (methods = 'GET, POST, OPTIONS', headers = 'content-type') =>
  new Response(null, {
    status: 204,
    headers: {
      ...OPEN,
      'access-control-allow-methods': methods,
      'access-control-allow-headers': headers,
      'access-control-max-age': '86400',
    },
  });

// The site, this account's workers.dev mirrors and a dev server here or on the LAN.
// An Origin header binds a browser only (curl sends anything): it stops accidents, it is not
// security. Same list as workers/wish/src/wish.mjs.
// why: lessons/workers-lib.md#origins
const SITE = ['https://positron.studio', 'https://www.positron.studio'];
const OURS = /^https:\/\/[a-z0-9-]+\.kristjan-jansen\.workers\.dev$/;
const NEAR = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

/** True when `origin` is one of this project's pages. */
export const ourOrigin = (origin) =>
  !!origin && (SITE.includes(origin) || OURS.test(origin) || NEAR.test(origin));

/** Compare a presented key with the configured one: SHA-256 both, then every
 *  byte, so the time taken says nothing about how much matched. An unset key
 *  refuses everything, so a missing secret is closed rather than open. */
export async function keyMatches(given, want) {
  if (typeof given !== 'string' || !given || typeof want !== 'string' || !want || given.length > 512) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([given, want].map((x) => crypto.subtle.digest('SHA-256', enc.encode(x))));
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** The caller's address as Cloudflare set it. A header the caller supplies
 *  would be a limit the caller opts out of, so only this one is read. */
export const callerIp = (request) => request.headers.get('cf-connecting-ip') || 'unknown';
