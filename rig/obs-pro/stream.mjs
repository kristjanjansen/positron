// node stream.mjs hls|whip|moq [secs] | off: the M1's OBS over one transport at a time (one service
// slot). WHIP needs its own input: Cloudflare answers 409 to WHEP of an RTMP input.
// Secrets come from the Cloudflare API at run time and are never printed.
// why: lessons/rig-obs.md#obs-stream-header
import { readFileSync } from 'node:fs';
import { ObsClient } from '../obs-docker/control.mjs';

// RETIRED for `hls` and `whip`: both inputs were deleted, so those modes exit 2. `moq` and `off`
// run.
// why: lessons/rig-obs.md#obs-stream-retired
const HLS_UID  = '0e390aa48b55d49a57284e6c2c535477';   // "positron-demo", deleted
const WHEP_UID = '224558e8993d5a5efd234d9d3a320f87';   // "whep-rig", deleted
const RELAY    = 'https://draft-14.cloudflare.mediaoverquic.com';

const [mode, secsArg] = process.argv.slice(2);
if ((mode === 'hls' || mode === 'whip') && !process.argv.includes('--anyway')) {
  console.log(`rig/obs-pro/stream.mjs ${mode} is retired (2026-10-13): its Stream input was deleted. See the header.`);
  process.exit(2);
}
const secs = Number(secsArg || 30);

const env = Object.fromEntries(readFileSync(new URL('../../.env', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=') && !l.startsWith('#'))
  .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const cf = (p) => fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/stream${p}`,
  { headers: { authorization: `Bearer ${env.CF_API_TOKEN}` } }).then((r) => r.json());

const obs = new ObsClient({ eventSubscriptions: 64 });   // Outputs
await obs.connect();
const stop = async () => { try { await obs.call('StopStream'); } catch { /* not streaming */ } };

if (mode === 'off') { await stop(); console.log('stopped'); obs.close(); process.exit(0); }
if (!['hls', 'whip', 'moq'].includes(mode)) { console.log('usage: stream.mjs hls|whip|moq [secs] | off'); obs.close(); process.exit(1); }

await stop();
await new Promise((r) => setTimeout(r, 1500));

let uid = null, label = '';
if (mode === 'hls') {
  const i = (await cf(`/live_inputs/${HLS_UID}`)).result; uid = HLS_UID;
  await obs.call('SetStreamServiceSettings', { streamServiceType: 'rtmp_custom',
    streamServiceSettings: { server: i.rtmps.url, key: i.rtmps.streamKey, use_auth: false } });
  label = `rtmp_custom -> ${i.rtmps.url} (key set, not printed)`;
} else if (mode === 'whip') {
  const i = (await cf(`/live_inputs/${WHEP_UID}`)).result; uid = WHEP_UID;
  // OBS's whip_custom takes the endpoint in `server` and a bearer in `bearer_token`.
  // Cloudflare embeds its credential in the URL path, so the token is empty.
  await obs.call('SetStreamServiceSettings', { streamServiceType: 'whip_custom',
    streamServiceSettings: { server: i.webRTC.url, bearer_token: '' } });
  label = 'whip_custom -> whep-rig publish url (not printed)';
} else {
  // Fresh namespace EVERY start: on draft-14 a same-name rejoin before GC
  // bricks the namespace (rig/obs-docker RUNBOOK 13.4).
  const ns = `obs-pro-${Date.now()}`;
  await obs.call('SetStreamServiceSettings', { streamServiceType: 'moq_service',
    streamServiceSettings: { server: RELAY, key: ns } });
  label = `moq_service -> ${RELAY} ns=${ns}`;
  console.log(`namespace ${ns}`);
}
console.log(`service   ${label}`);

const before = (await cf('/storage-usage')).result;
await obs.call('StartStream');
const t0 = Date.now();
console.log(`started   ${mode} for ${secs}s ...`);

let connectedAt = null;
for (let i = 0; i < secs; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  if (uid && !connectedAt) {
    const s = (await cf(`/live_inputs/${uid}`)).result.status?.current;
    if (s?.state === 'connected') { connectedAt = Date.now(); console.log(`connected ${connectedAt - t0} ms after StartStream (${s.ingestProtocol})`); }
  }
}

const st = (await obs.call('GetStreamStatus')).data;
console.log(`obs       ${st.outputActive ? 'active' : 'INACTIVE'} · ${st.outputSkippedFrames} skipped / ${st.outputTotalFrames} frames · ${(st.outputBytes / 1e6).toFixed(1)} MB`);
if (uid && !connectedAt) console.log(`cloudflare NEVER went connected in ${secs}s — the input did not accept the publish`);

await stop();
const after = (await cf('/storage-usage')).result;
console.log(`storage   ${before.totalStorageMinutes} -> ${after.totalStorageMinutes} min of 1000 cap`);
obs.close();
