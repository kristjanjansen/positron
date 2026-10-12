// The LL-HLS loopback's input, and everything that keeps it empty.
//
// /concepts/video/030/ sends a camera through the `loop` instance onto ONE
// RTMPS live input that nothing else uses ("positron-hls-loopback",
// src/provision-loop.sh). Recording cannot be turned off on RTMPS
// (positron-streaming), so every take is a Stream video counted against the
// account's 1000 storage minutes, and a full cap blocks every new live stream.
// So three things delete, none of them waiting on the page:
//
//   1. per take: LOOP_CLEAN_MS after the take ends, the worker deletes it
//   2. a cron every 10 minutes: anything on the input older than LOOP_OLD_MS
//   3. before a take: refused when the account's storage is over LOOP_CEIL
//
// 🔴 THE INPUT IS DEDICATED, WHICH IS WHAT MAKES "DELETE EVERYTHING ON IT"
// SAFE. Nothing here lists the account's videos and filters; it asks for the
// videos of ONE input by uid, and deletes those. Any other input's recordings
// are not in the answer at all.
// ⚠️ NOTHING `live-inprogress` IS DELETED. That is the take still running; it
// is deleted on the next pass, once it has become a recording.

const API = 'https://api.cloudflare.com/client/v4/accounts';
export const LOOP_CLEAN_MS = 90_000;   // the recording exists about 60 s after the end
export const LOOP_OLD_MS = 5 * 60_000; // the cron's age floor, past any take and its clean
export const LOOP_CEIL = 600;          // storage minutes above which a take is refused
export const LOOP_CAP = 1000;          // the account's cap, read back from the API too

const auth = (env) => ({ authorization: `Bearer ${env.STREAM_TOKEN}` });
const base = (env) => `${API}/${env.ACCOUNT_ID}/stream`;
export const loopReady = (env) => !!(env.STREAM_TOKEN && env.ACCOUNT_ID && env.LOOP_UID);

async function api(env, path, init = {}) {
  const r = await fetch(`${base(env)}${path}`, { ...init, headers: { ...auth(env), ...(init.headers || {}) } });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.success) throw new Error(`stream api ${init.method || 'GET'} ${path.split('?')[0]} ${r.status}`);
  return j.result;
}

/** The account's storage: { used, cap, videos }. */
export async function storage(env) {
  const r = await api(env, '/storage-usage');
  return { used: Math.max(0, +(r.totalStorageMinutes || 0)), cap: r.totalStorageMinutesLimit ?? LOOP_CAP, videos: r.videoCount ?? null };
}

/** Every video on the loopback input, as { uid, state, created, minutes }. */
export async function loopVideos(env) {
  const list = await api(env, `/live_inputs/${env.LOOP_UID}/videos`);
  return (list || []).map((v) => ({
    uid: v.uid, state: v.status?.state || null, created: v.created,
    minutes: +((v.duration > 0 ? v.duration : 0) / 60).toFixed(2), input: v.liveInput || null,
  }));
}

/**
 * The input's current video, from the lifecycle URL Stream publishes for it.
 * `videoUID` is null whenever the input is not live, MEASURED 2026-10-12 on
 * positron-cam, so it is read DURING a take and remembered.
 */
export async function lifecycle(env) {
  if (!env.STREAM_CUSTOMER || !env.LOOP_UID) return null;
  const r = await fetch(`https://${env.STREAM_CUSTOMER}.cloudflarestream.com/${env.LOOP_UID}/lifecycle`, { cache: 'no-store' });
  if (!r.ok) return null;
  return r.json().catch(() => null);
}

async function del(env, uid) {
  const r = await fetch(`${base(env)}/${uid}`, { method: 'DELETE', headers: auth(env) });
  return r.status;
}

/**
 * Delete what is on the input. `olderThanMs` keeps anything younger (the
 * cron's floor; 0 for a per-take clean), `uids` are deleted whatever the list
 * says (the take's own video, read off the lifecycle while it ran).
 * ⚠️ A video whose `liveInput` is not this input is never touched, even if
 * the API ever answered with one: the check is here, not trusted to the URL.
 * Returns what it did in both directions, because a cleanup nobody is told
 * about cannot be told apart from a leak.
 */
export async function clean(env, { olderThanMs = 0, uids = [], why = '' } = {}) {
  const now = Date.now();
  const at = new Date(now).toISOString();
  let list;
  try { list = await loopVideos(env); }
  catch (e) { return { at, why, ok: false, error: String(e.message || e) }; }
  const deleted = [], failed = [], kept = [];
  const wanted = new Set(uids.filter(Boolean));
  for (const v of list) {
    if (v.input && v.input !== env.LOOP_UID) { kept.push({ uid: v.uid, why: 'another input' }); continue; }
    if (v.state === 'live-inprogress') { kept.push({ uid: v.uid, why: 'still live' }); continue; }
    if (!wanted.has(v.uid) && now - Date.parse(v.created) < olderThanMs) { kept.push({ uid: v.uid, why: 'young' }); continue; }
    const s = await del(env, v.uid);
    wanted.delete(v.uid);
    (s === 200 || s === 204 ? deleted : failed).push({ uid: v.uid, state: v.state, minutes: v.minutes, status: s });
  }
  // The take's own video when the list did not have it yet: asked by uid. A
  // 404 means it is already gone or never became a video, both fine.
  const missing = [];
  for (const uid of wanted) {
    const s = await del(env, uid);
    (s === 200 || s === 204 ? deleted : s === 404 ? missing : failed).push({ uid, status: s });
  }
  return {
    at, why, ok: failed.length === 0, listed: list.length,
    deleted, failed, kept, missing: missing.length,
    minutesFreed: +deleted.reduce((s, v) => s + (v.minutes || 0), 0).toFixed(2),
  };
}
