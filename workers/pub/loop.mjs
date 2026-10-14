// The LL-HLS loopback's dedicated RTMPS input, kept empty: RTMPS always records, and a full
// 1000-minute cap blocks every live stream. Deletes per take, by cron (LOOP_OLD_MS), and refuses
// a take over LOOP_CEIL. Only this input's videos, by uid; never `live-inprogress`.
// why: lessons/workers-pub.md#loop

const API = 'https://api.cloudflare.com/client/v4/accounts';
export const LOOP_CLEAN_MS = 90_000;   // the recording exists about 60 s after the end
export const LOOP_OLD_MS = 5 * 60_000; // the cron's age floor, past any take and its clean
export const LOOP_CEIL = 600;          // storage minutes above which a take is refused
export const LOOP_CAP = 1000;          // the account's cap, read back from the API too

// The ceiling: the LOOP_CEIL var when numeric (0 proves the 507 refusal), else 600, never none.
// why: lessons/workers-pub.md#loop-ceil
export function loopCeil(env) {
  const v = env?.LOOP_CEIL;
  const n = v == null || v === '' ? NaN : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : LOOP_CEIL;
}

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

// The input's current video. `videoUID` is null when the input is not live, so read it mid-take.
// why: lessons/workers-pub.md#lifecycle
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

// Deletes this input's videos older than `olderThanMs`, plus `uids`; checks `liveInput` itself.
// Reports what it did both ways, since an unreported cleanup looks like a leak.
// why: lessons/workers-pub.md#clean
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
