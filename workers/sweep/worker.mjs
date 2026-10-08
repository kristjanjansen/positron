// positron-sweep: deletes old Stream recordings of the test inputs, hourly.
//
// WHY. Recording cannot be turned off on the RTMPS path (`positron-streaming`),
// the account cap is 1000 storage minutes, and testing filled 75 per cent of it
// in about three weeks. A full cap blocks new live streams, so the real cost of
// not sweeping is an outage. `deleteRecordingAfterDays` has a minimum of 30,
// which is too coarse.
//
// WHAT. Recordings whose `liveInput` is one of `INPUTS` (the uids of
// `positron-demo` and `positron-cam`, by uid and never by name, because a name
// is a label somebody can change), `created` more than `MAX_AGE_H` hours ago,
// and in state `ready`. Never `live-inprogress`, and nothing still processing.
//
// THE CRON AND THE ROUTE RUN ONE FUNCTION. A cron that can only be observed by
// waiting an hour is one nobody measures, so `POST /sweep` with the bearer
// token runs it now, and `?dry=1` lists what it would delete and deletes
// nothing. Both report what they did in both directions: a cleanup nobody is
// told about cannot be told apart from a leak.

const API = 'https://api.cloudflare.com/client/v4/accounts';

// Free plan: 50 subrequests per invocation. One list plus at most this many
// deletes stays under it; the next hour takes the rest.
const MAX_DELETES = 40;

async function sweep(env, { dry = false } = {}) {
  const inputs = new Set(env.INPUTS.split(',').map((s) => s.trim()).filter(Boolean));
  const maxAgeMs = Number(env.MAX_AGE_H) * 3600_000;
  const auth = { authorization: `Bearer ${env.STREAM_TOKEN}` };
  const base = `${API}/${env.ACCOUNT_ID}/stream`;

  const r = await fetch(base, { headers: auth });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.success) {
    return { ok: false, step: 'list', status: r.status, errors: j?.errors ?? null };
  }

  const now = Date.now();
  const kept = { otherInput: 0, young: 0, notReady: 0 };
  const due = [];
  for (const v of j.result) {
    if (!inputs.has(v.liveInput)) { kept.otherInput++; continue; }
    if (v.status?.state !== 'ready') { kept.notReady++; continue; }
    if (now - Date.parse(v.created) < maxAgeMs) { kept.young++; continue; }
    due.push({ uid: v.uid, name: v.meta?.name ?? null, created: v.created, minutes: +(v.duration / 60).toFixed(2) });
  }

  const batch = due.slice(0, MAX_DELETES);
  const deleted = [];
  const failed = [];
  if (!dry) {
    for (const v of batch) {
      const d = await fetch(`${base}/${v.uid}`, { method: 'DELETE', headers: auth });
      (d.ok ? deleted : failed).push({ ...v, status: d.status });
    }
  }

  return {
    ok: failed.length === 0,
    dry,
    listed: j.result.length,
    due: due.length,
    deferred: due.length - batch.length,
    minutesFreed: +(dry ? batch : deleted).reduce((s, v) => s + v.minutes, 0).toFixed(2),
    kept,
    ...(dry ? { wouldDelete: batch } : { deleted, failed }),
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2) + '\n', {
    status,
    headers: { 'content-type': 'application/json', 'x-robots-tag': 'noindex' },
  });
}

// Length check then XOR over every character, so the answer does not leak
// the token's prefix through timing.
function tokenOk(req, env) {
  const got = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  const want = env.SWEEP_TOKEN || '';
  if (!want || got.length !== want.length) return false;
  let x = 0;
  for (let i = 0; i < want.length; i++) x |= got.charCodeAt(i) ^ want.charCodeAt(i);
  return x === 0;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/sweep' && req.method === 'POST') {
      if (!tokenOk(req, env)) return json({ ok: false, error: 'unauthorized' }, 401);
      const dry = url.searchParams.get('dry') === '1';
      return json(await sweep(env, { dry }));
    }
    return json({ worker: 'positron-sweep', sweep: 'POST /sweep (bearer), ?dry=1 lists only', cron: 'hourly' });
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      sweep(env).then(
        (r) => console.log(JSON.stringify(r)),
        (e) => console.log(JSON.stringify({ ok: false, error: String(e) })),
      ),
    );
  },
};
