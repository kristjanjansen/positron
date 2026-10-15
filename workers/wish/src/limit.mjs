// workers/wish/src/limit.mjs: a per-visitor cap on the paid routes (/code, /wish), a burst and a
// per-minute count over stamps, as the relay counts wrong keys and pub counts /ice. In memory, so
// it holds per isolate: a brake on one runaway page or script, not an account-wide gate.
// The address is hashed before it is kept, as the relay does.

/** A writer makes up to 3 calls a sentence, so 6 in 10 s is two sentences back to back. */
export const BURST = { n: 6, ms: 10_000 };
/** About ten sentences a minute, which nobody types; room for a few people behind one address. */
export const PER_MINUTE = { n: 30, ms: 60_000 };
export const LIMITED = ['/code', '/wish'];

/** 4 bytes of SHA-256 of an address, for counting it without keeping it. */
export async function addressTag(ip) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(ip || 'unknown')));
  return [...new Uint8Array(d)].slice(0, 4).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * take(who, path) -> null when the call may go ahead (and is counted), or { status: 429, error,
 * retryAfter } with a reason a page can show as it is. Only LIMITED paths are counted.
 */
export function createLimiter({ burst = BURST, perMinute = PER_MINUTE, now = () => Date.now(), maxKeys = 10_000 } = {}) {
  const stamps = new Map();
  const keep = Math.max(burst.ms, perMinute.ms);
  function take(who, path) {
    if (!LIMITED.includes(path)) return null;
    const t = now();
    const mine = (stamps.get(who) || []).filter((s) => t - s < keep);
    const inBurst = mine.filter((s) => t - s < burst.ms);
    const refuse = (n, win, list) => {
      const wait = Math.max(1, Math.ceil((list[list.length - n] + win - t) / 1000));
      stamps.set(who, mine);
      return { status: 429, retryAfter: wait,
        error: `too many requests from here: at most ${n} in ${win / 1000} s, try again in ${wait} s` };
    };
    if (inBurst.length >= burst.n) return refuse(burst.n, burst.ms, inBurst);
    if (mine.length >= perMinute.n) return refuse(perMinute.n, perMinute.ms, mine);
    mine.push(t);
    stamps.set(who, mine);
    // A map that only grows is a leak: past maxKeys, drop the addresses with nothing recent.
    if (stamps.size > maxKeys) for (const [k, v] of stamps) if (!v.some((s) => t - s < keep)) stamps.delete(k);
    return null;
  }
  return { take, size: () => stamps.size };
}
