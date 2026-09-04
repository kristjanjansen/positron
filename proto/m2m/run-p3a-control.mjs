#!/usr/bin/env node
// P3A control-plane soak — DIRECT against rtc.live.cloudflare.com (no Worker,
// no local proxy: the Worker stays out of the blast radius on purpose).
// Phases: SMOKE (what does sessions/new accept + never-connected lifecycle),
// RAMP (200 sessions / 60 s), HOLD (600 s sparse GET polling; media fleet runs
// concurrently), PUSH (steps of +200 at 5/10/20/40 per s until a hard error
// class), GC (stop polling, probe samples at +30/+60/+120/+300 s).
// Results -> results/m2m-p3a-control.jsonl ; status -> logs/p3a-status.json
// (poll THAT file, never park on notifications).
import fs from "fs";
import crypto from "crypto";

const ROOT = "/Users/s32863/personal/positron";
const HERE = `${ROOT}/proto/m2m`;
const RESULTS = `${ROOT}/results/m2m-p3a-control.jsonl`;
const STATUS = `${HERE}/logs/p3a-status.json`;
fs.mkdirSync(`${HERE}/logs`, { recursive: true });

const env = {};
for (const line of fs.readFileSync(`${ROOT}/.env`, "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const i = t.indexOf("=");
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}
const APP_ID = env.CF_REALTIME_APP_ID, SECRET = env.CF_REALTIME_APP_SECRET;
if (!APP_ID || !SECRET) { console.error("missing CF creds"); process.exit(1); }
const BASE = `https://rtc.live.cloudflare.com/v1/apps/${APP_ID}`;
// CF's edge 1010-blocks default UAs (phase-1 trap) — custom UA required.
const UA = "positron-m2m-rig/1.0 (p3a-soak)";

const RAMP_N = parseInt(process.env.RAMP_N || "200", 10);
const RAMP_S = parseInt(process.env.RAMP_S || "60", 10);
const HOLD_S = parseInt(process.env.HOLD_S || "600", 10);
const PUSH_STEPS = (process.env.PUSH_STEPS || "200@5,200@10,200@20,200@40")
  .split(",").map(s => { const [n, r] = s.split("@"); return { n: +n, rate: +r }; });

function ts() { return new Date().toISOString(); }
function say(...a) { console.log(ts().slice(11, 23), ...a); }
const resFd = fs.openSync(RESULTS, "a");
function jl(obj) { fs.writeSync(resFd, JSON.stringify({ ...obj, srv_ts: Date.now() / 1000 }) + "\n"); }
let PHASE = "init";
const CTR = { created: 0, createErr: 0, polls: 0, pollErr: 0, deaths: 0, replaced: 0 };
function status(extra = {}) {
  fs.writeFileSync(STATUS, JSON.stringify({ phase: PHASE, t: ts(), ...CTR, ...extra }));
}

// ---- minimal synthesized offers --------------------------------------------
function rnd(n, cs = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/") {
  let s = ""; for (let i = 0; i < n; i++) s += cs[crypto.randomInt(cs.length)]; return s;
}
function fp() { return Array.from(crypto.randomBytes(32)).map(b => b.toString(16).padStart(2, "0").toUpperCase()).join(":"); }
function dcOffer() {
  return ["v=0", `o=- ${Date.now()} 2 IN IP4 127.0.0.1`, "s=-", "t=0 0",
    "a=group:BUNDLE 0", "a=msid-semantic: WMS",
    "m=application 9 UDP/DTLS/SCTP webrtc-datachannel", "c=IN IP4 0.0.0.0",
    `a=ice-ufrag:${rnd(4)}`, `a=ice-pwd:${rnd(22)}`, "a=ice-options:trickle",
    `a=fingerprint:sha-256 ${fp()}`, "a=setup:actpass", "a=mid:0",
    "a=sctp-port:5000", "a=max-message-size:262144"].join("\r\n") + "\r\n";
}
function audioRecvOffer() {
  return ["v=0", `o=- ${Date.now()} 2 IN IP4 127.0.0.1`, "s=-", "t=0 0",
    "a=group:BUNDLE 0", "a=msid-semantic: WMS",
    "m=audio 9 UDP/TLS/RTP/SAVPF 111", "c=IN IP4 0.0.0.0", "a=rtcp:9 IN IP4 0.0.0.0",
    `a=ice-ufrag:${rnd(4)}`, `a=ice-pwd:${rnd(22)}`, "a=ice-options:trickle",
    `a=fingerprint:sha-256 ${fp()}`, "a=setup:actpass", "a=mid:0",
    "a=recvonly", "a=rtcp-mux", "a=rtpmap:111 opus/48000/2",
    "a=fmtp:111 minptime=10;useinbandfec=1"].join("\r\n") + "\r\n";
}

// ---- one CF call, fully logged ---------------------------------------------
async function cf(method, sub, body, meta = {}) {
  const t0 = Date.now();
  let status = 0, text = "", hdr = {}, err = null;
  try {
    const ctl = AbortSignal.timeout(15000);
    const r = await fetch(`${BASE}/${sub}`, {
      method, signal: ctl,
      headers: { "Authorization": `Bearer ${SECRET}`, "Content-Type": "application/json", "User-Agent": UA },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    status = r.status;
    text = await r.text();
    for (const k of ["retry-after", "cf-ray", "x-ratelimit-limit", "x-ratelimit-remaining", "cf-cache-status"])
      if (r.headers.get(k)) hdr[k] = r.headers.get(k);
  } catch (e) { err = String(e.message || e).slice(0, 200); }
  const ms = Date.now() - t0;
  let json = null; try { json = JSON.parse(text); } catch { /* raw */ }
  jl({ kind: "api", phase: PHASE, method, sub: sub.slice(0, 60), status, ms, err,
       hdr: Object.keys(hdr).length ? hdr : undefined,
       body: (status >= 400 || err) ? text.slice(0, 500) : undefined, ...meta });
  return { status, ms, json, text, hdr, err };
}

// paced parallel executor: fire at `rate`/s, cap in-flight
async function paced(count, rate, fn) {
  const results = [];
  let inflight = 0, launched = 0, done = 0;
  const interval = 1000 / rate;
  await new Promise(resolve => {
    const t0 = Date.now();
    const timer = setInterval(async () => {
      if (launched >= count) { clearInterval(timer); return; }
      if (inflight >= 40) return; // cap
      const idx = launched++;
      inflight++;
      fn(idx, Date.now() - t0).then(r => { results[idx] = r; })
        .catch(e => { results[idx] = { err: String(e) }; })
        .finally(() => { inflight--; if (++done >= count) resolve(); });
    }, interval);
  });
  return results;
}

function pct(arr, p) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))];
}
function latSummary(rs) {
  const ok = rs.filter(r => r && r.status >= 200 && r.status < 300).map(r => r.ms);
  const bad = rs.filter(r => r && (r.status >= 400 || r.err));
  return { n: rs.length, ok: ok.length, bad: bad.length,
           p50: pct(ok, 50), p90: pct(ok, 90), p99: pct(ok, 99),
           min: ok.length ? Math.min(...ok) : null, max: ok.length ? Math.max(...ok) : null,
           badSample: bad.slice(0, 3).map(r => ({ status: r.status, err: r.err })) };
}

const SESSIONS = [];       // {sid, tCreated, lastOk, dead, tDead, variant}
let CREATE_VARIANT = "empty";  // decided in smoke; "dc-offer" => fresh SDP per call

async function createSession(meta) {
  const body = CREATE_VARIANT === "dc-offer"
    ? { sessionDescription: { type: "offer", sdp: dcOffer() } } : undefined;
  const r = await cf("POST", "sessions/new", body, meta);
  if ((r.status === 200 || r.status === 201) && r.json && r.json.sessionId) {
    CTR.created++;
    SESSIONS.push({ sid: r.json.sessionId, tCreated: Date.now(), lastOk: Date.now(),
                    dead: false, tDead: null, variant: CREATE_VARIANT });
    return r;
  }
  CTR.createErr++;
  return r;
}

// ---- SMOKE ------------------------------------------------------------------
async function smoke() {
  PHASE = "smoke"; status();
  say("SMOKE: sessions/new variants");
  const empty = await cf("POST", "sessions/new", undefined, { variant: "empty" });
  say(`  empty body -> ${empty.status} ${empty.ms}ms keys=${empty.json ? Object.keys(empty.json) : empty.err}`);
  const dc = await cf("POST", "sessions/new", { sessionDescription: { type: "offer", sdp: dcOffer() } }, { variant: "dc-offer" });
  say(`  dc offer   -> ${dc.status} ${dc.ms}ms keys=${dc.json ? Object.keys(dc.json) : dc.err}`);
  const au = await cf("POST", "sessions/new", { sessionDescription: { type: "offer", sdp: audioRecvOffer() } }, { variant: "audio-recv-offer" });
  say(`  audio offer-> ${au.status} ${au.ms}ms keys=${au.json ? Object.keys(au.json) : au.err}`);
  // lifecycle probe on one session per accepted variant
  const probes = [];
  if (empty.json?.sessionId) probes.push({ sid: empty.json.sessionId, variant: "empty" });
  if (dc.json?.sessionId) probes.push({ sid: dc.json.sessionId, variant: "dc-offer" });
  if (au.json?.sessionId) probes.push({ sid: au.json.sessionId, variant: "audio-recv-offer" });
  const tBase = Date.now();
  for (const delay of [5, 15, 35, 65, 95]) {
    const wait = tBase + delay * 1000 - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    for (const p of probes) {
      const g = await cf("GET", `sessions/${p.sid}`, undefined, { probe: "smoke-lifecycle", variant: p.variant, ageS: delay });
      say(`  +${delay}s ${p.variant} GET -> ${g.status} ${g.json ? JSON.stringify(g.json).slice(0, 120) : g.err}`);
    }
  }
  jl({ kind: "smoke-verdict", empty: empty.status, dc: dc.status, audio: au.status });
  return { empty, dc, au };
}

// ---- RAMP -------------------------------------------------------------------
async function ramp() {
  PHASE = "ramp"; status();
  const rate = RAMP_N / RAMP_S;
  say(`RAMP: ${RAMP_N} sessions in ${RAMP_S}s (${rate.toFixed(1)}/s), variant=${CREATE_VARIANT}`);
  const t0 = Date.now();
  const rs = await paced(RAMP_N, rate, (idx, tRel) =>
    createSession({ idx, tRel, cum: CTR.created }));
  const sum = latSummary(rs);
  say(`RAMP done in ${((Date.now() - t0) / 1000).toFixed(1)}s: ${JSON.stringify(sum)}`);
  jl({ kind: "ramp-summary", ...sum, wallS: (Date.now() - t0) / 1000, live: SESSIONS.length });
  status({ rampSummary: sum });
}

// ---- HOLD -------------------------------------------------------------------
async function hold() {
  PHASE = "hold"; status();
  const t0 = Date.now();
  say(`HOLD: ${HOLD_S}s, ${SESSIONS.length} sessions, ~60s cadence each + 10-session fast set @10s`);
  const fast = SESSIONS.slice(0, 10);
  let cursor = 0;
  const pollOne = async (s, tag) => {
    const g = await cf("GET", `sessions/${s.sid}`, undefined, { probe: tag, ageS: Math.round((Date.now() - s.tCreated) / 1000) });
    CTR.polls++;
    if (g.status === 200) { s.lastOk = Date.now(); }
    else {
      CTR.pollErr++;
      if (!s.dead && (g.status === 404 || g.status === 410 || g.status === 400)) {
        s.dead = true; s.tDead = Date.now(); CTR.deaths++;
        jl({ kind: "death", sid: s.sid, ageS: (Date.now() - s.tCreated) / 1000,
             sinceLastOkS: (Date.now() - s.lastOk) / 1000, status: g.status, phase: PHASE });
      }
    }
  };
  const slowTimer = setInterval(() => {
    // round-robin the whole population over ~60 s
    const alive = SESSIONS.filter(s => !s.dead);
    if (!alive.length) return;
    const s = alive[cursor++ % alive.length];
    pollOne(s, "hold-slow");
  }, Math.max(50, 60000 / Math.max(1, SESSIONS.length)));
  const fastTimer = setInterval(() => { for (const s of fast) if (!s.dead) pollOne(s, "hold-fast"); }, 10000);
  const hb = setInterval(() => {
    const alive = SESSIONS.filter(s => !s.dead).length;
    say(`HOLD hb: alive=${alive}/${SESSIONS.length} deaths=${CTR.deaths} polls=${CTR.polls} pollErr=${CTR.pollErr}`);
    jl({ kind: "hold-hb", alive, total: SESSIONS.length, ...CTR });
    status({ alive });
  }, 30000);
  await new Promise(r => setTimeout(r, HOLD_S * 1000));
  clearInterval(slowTimer); clearInterval(fastTimer); clearInterval(hb);
  const alive = SESSIONS.filter(s => !s.dead).length;
  say(`HOLD done: alive=${alive}/${SESSIONS.length} deaths=${CTR.deaths}`);
  jl({ kind: "hold-summary", alive, total: SESSIONS.length, ...CTR });
}

// ---- PUSH -------------------------------------------------------------------
async function push() {
  PHASE = "push"; status();
  let hardStop = null;
  for (const step of PUSH_STEPS) {
    const startCum = CTR.created;
    say(`PUSH step: +${step.n} @${step.rate}/s (cum ${startCum} -> ${startCum + step.n})`);
    let consecBad = 0, badInStep = 0;
    const rs = [];
    const stepRes = await paced(step.n, step.rate, async (idx, tRel) => {
      if (hardStop) return { skipped: true };
      const r = await createSession({ idx, tRel, cum: CTR.created, step: `${step.n}@${step.rate}` });
      rs.push(r);
      const bad = r.status >= 400 || r.err;
      if (bad) { consecBad++; badInStep++; } else consecBad = 0;
      if (r.status === 429 || r.status === 1015 || consecBad >= 3 || badInStep >= 8) {
        hardStop = { status: r.status, err: r.err, body: r.text?.slice(0, 300), hdr: r.hdr,
                     atCum: CTR.created + CTR.createErr, consecBad, badInStep };
      }
      return r;
    });
    const sum = latSummary(stepRes.filter(r => r && !r.skipped));
    say(`  step done: ${JSON.stringify(sum)}${hardStop ? " HARD STOP: " + JSON.stringify(hardStop) : ""}`);
    jl({ kind: "push-step", step: `${step.n}@${step.rate}`, ...sum, cum: CTR.created, hardStop });
    status({ lastStep: sum, hardStop });
    if (hardStop) break;
    await new Promise(r => setTimeout(r, 5000)); // breather between steps
  }
  jl({ kind: "push-summary", created: CTR.created, createErr: CTR.createErr, hardStop });
  return hardStop;
}

// ---- GC probe ---------------------------------------------------------------
async function gcProbe() {
  PHASE = "gc"; status();
  const tStop = Date.now();
  // samples: 10 long-polled ramp sessions, 10 unpolled push sessions (tail)
  const rampSample = SESSIONS.slice(0, RAMP_N).filter(s => !s.dead).slice(0, 10);
  const pushSample = SESSIONS.slice(RAMP_N).filter(s => !s.dead).slice(-10);
  say(`GC probe: ${rampSample.length} polled-ramp + ${pushSample.length} unpolled-push sessions at +30/+60/+120/+300s`);
  for (const mark of [30, 60, 120, 300]) {
    const wait = tStop + mark * 1000 - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    for (const [tag, group] of [["gc-ramp", rampSample], ["gc-push", pushSample]]) {
      let ok = 0, gone = 0;
      for (const s of group) {
        const g = await cf("GET", `sessions/${s.sid}`, undefined, { probe: tag, mark, ageS: Math.round((Date.now() - s.tCreated) / 1000) });
        if (g.status === 200) ok++; else gone++;
      }
      say(`  +${mark}s ${tag}: ${ok} ok / ${gone} gone`);
      jl({ kind: "gc-mark", tag, mark, ok, gone });
    }
    status({ gcMark: mark });
  }
}

// ---- main -------------------------------------------------------------------
const run = async () => {
  jl({ kind: "p3a-start", rampN: RAMP_N, rampS: RAMP_S, holdS: HOLD_S, pushSteps: PUSH_STEPS });
  const sm = await smoke();
  // Fresh dc offer per call if that variant was accepted; else empty body.
  CREATE_VARIANT = ((sm.dc.status === 200 || sm.dc.status === 201) && sm.dc.json?.sessionId)
    ? "dc-offer" : "empty";
  say(`fleet variant: ${CREATE_VARIANT}`);
  await ramp();
  await hold();
  await push();
  await gcProbe();
  PHASE = "done"; status();
  jl({ kind: "p3a-done", ...CTR });
  say("P3A control run DONE", JSON.stringify(CTR));
};

run().catch(e => { PHASE = "fatal"; status({ error: String(e) }); console.error("FATAL", e); jl({ kind: "fatal", error: String(e) }); process.exit(1); });
