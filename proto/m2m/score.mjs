#!/usr/bin/env node
// P3C SCORE — operator client. Executes a timed score (scores/*.json) against
// an RtcRoom on the DEPLOYED Worker: the "operator console" of a show.
//
//   node score.mjs --score scores/demo-score.json --t0 <epochMs> [--room score-show]
//
// Semantics (NOTES.md P3C decision): tier changes ride direct operator
// promote/demote frames (roster state, DO-validated); view choreography
// (rotate / setLivePage / note) rides {type:'cue'} passthrough frames.
// Every fire is telemetered to the local collector: scheduled vs actual fire
// time (score adherence), per-action sends, and the operator's own received
// broadcast echo (round trip through the DO).
//
// A REAL-SHOW feature this rig needed too: if a participant (re)joins
// mid-show, the operator re-fires their expected tier at the current show
// time (fold of setup+events) — a reloaded tab comes back into the cast.
import fs from "fs";

const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, "")] = process.argv[i + 1];
const SCORE_PATH = args.score || "scores/demo-score.json";
const HERE = "/Users/s32863/personal/elektron/proto/m2m";
const score = JSON.parse(fs.readFileSync(SCORE_PATH.startsWith("/") ? SCORE_PATH : `${HERE}/${SCORE_PATH}`, "utf8"));
const ROOM = args.room || score.room || "score-show";
const T0 = parseInt(args.t0 || `${Date.now() + 15000}`, 10);
const BASE = args.base || "http://127.0.0.1:8893";
const REMOTE_URL = args.remote || "https://elektron-rtc.kristjan-jansen.workers.dev";
const OP_ID = "OP";

function roomToken() {
  const line = fs.readFileSync("/Users/s32863/personal/elektron/.env", "utf8")
    .split("\n").find(l => l.startsWith("ROOM_TOKEN="));
  return line ? line.slice("ROOM_TOKEN=".length).trim() : "";
}
const TOKEN = roomToken();
if (!TOKEN) { console.error("no ROOM_TOKEN in .env"); process.exit(1); }

function ts() { return new Date().toISOString().slice(11, 23); }
function say(...a) { console.log(ts(), "[score]", ...a); }
async function collect(obj) {
  await fetch(`${BASE}/collect`, { method: "POST", body: JSON.stringify(obj) }).catch(() => {});
}

// ---- expected-state fold: what tier should pid be at show-time t? ----------
function expectedTiers(tShowMs) {
  const tiers = {};
  for (const a of score.setup || []) if (a.action !== "cue") tiers[a.participantId] = a.tier;
  for (const ev of score.events || []) {
    if (ev.fireAt > tShowMs) break;                     // events sorted by fireAt
    for (const a of ev.actions || []) if (a.action !== "cue") tiers[a.participantId] = a.tier;
  }
  return tiers;                                          // absent => wall (join default)
}

// ---- WS with rejoin (rebuild-never-patch) ----------------------------------
let ws = null, wsOpen = false, wantOpen = true, joined = false;
const pendingEcho = [];        // {key, eventId, sentAt} FIFO for promote/demote echo
function send(frame) {
  if (ws && wsOpen) { ws.send(JSON.stringify(frame)); return true; }
  return false;
}
function connect() {
  ws = new WebSocket(`${REMOTE_URL.replace(/^http/, "ws")}/room/${ROOM}/ws?token=${encodeURIComponent(TOKEN)}`);
  ws.onopen = () => {
    wsOpen = true;
    send({ type: "join", participantId: OP_ID, name: "Operator", role: "operator" });
  };
  ws.onclose = () => {
    wsOpen = false; joined = false;
    if (wantOpen) {
      collect({ kind: "score-ws", state: "reconnecting", t: Date.now() });
      setTimeout(connect, 300);
    }
  };
  ws.onerror = () => { try { ws.close(); } catch (e) { /* noop */ } };
  ws.onmessage = (e) => {
    let f; try { f = JSON.parse(e.data); } catch (err) { return; }
    onFrame(f);
  };
}

let setupDone = false;
function onFrame(f) {
  const now = Date.now();
  if (f.type === "roster") {
    joined = true;
    collect({ kind: "score-roster", t: now, n: (f.participants || []).length,
              rejoin: setupDone });
    if (!setupDone) { setupDone = true; runSetup(); }
    return;
  }
  if ((f.type === "promote" || f.type === "demote") && f.by === OP_ID) {
    const key = `${f.participantId}/${f.tier}`;
    const i = pendingEcho.findIndex(p => p.key === key);
    if (i >= 0) {
      const p = pendingEcho.splice(i, 1)[0];
      collect({ kind: "score-echo", eventId: p.eventId, what: key, echoMs: now - p.sentAt, t: now });
    }
    return;
  }
  if (f.type === "cue" && f.from === OP_ID && f.cue && f.cue.firedAt) {
    collect({ kind: "score-echo", eventId: f.cue.id || null, what: "cue/" + (f.cue.cmd || "?"),
              echoMs: now - f.cue.firedAt, serverAt: f.cue.serverAt || null, t: now });
    return;
  }
  if (f.type === "joined" && f.participant && f.participant.id !== OP_ID) {
    // (re)join mid-show -> re-cast to the tier the score expects RIGHT NOW
    const pid = f.participant.id;
    const tShow = now - T0;
    const want = expectedTiers(Math.max(0, tShow))[pid];
    if (want && want !== "wall" && f.participant.tier !== want) {
      say(`re-cast ${pid} -> ${want} (rejoined at show t=${(tShow / 1000).toFixed(1)}s)`);
      collect({ kind: "score-recast", id: pid, tier: want, tShow, t: now });
      send({ type: want === "wall" ? "demote" : "promote", participantId: pid, tier: want });
      pendingEcho.push({ key: `${pid}/${want}`, eventId: "recast", sentAt: now });
    }
  }
}

// ---- action firing ----------------------------------------------------------
function fireAction(a, eventId, firedAt) {
  if (a.action === "cue") {
    const cue = Object.assign({}, a.cue, { id: eventId, firedAt });
    send({ type: "cue", cue });
  } else {
    send({ type: a.action, participantId: a.participantId, tier: a.tier });
    pendingEcho.push({ key: `${a.participantId}/${a.tier}`, eventId, sentAt: firedAt });
  }
  collect({ kind: "score-action", eventId, t: Date.now(),
            action: a.action, participantId: a.participantId || null,
            tier: a.tier || null, cmd: a.cue ? a.cue.cmd : null });
}

async function runSetup() {
  say(`joined room ${ROOM}; firing setup cast (${(score.setup || []).length} actions), t0 in ${((T0 - Date.now()) / 1000).toFixed(1)}s`);
  for (const a of score.setup || []) {
    fireAction(a, "setup", Date.now());
    await new Promise(r => setTimeout(r, 120));
  }
  collect({ kind: "score-setup-done", t: Date.now(), t0: T0 });
}

// spin the last ~15 ms for ms-accurate fires (node timers are late, never early)
function fireAt(target) {
  return new Promise(res => {
    const lead = target - Date.now() - 15;
    setTimeout(function spin() {
      if (Date.now() >= target) return res(Date.now());
      setTimeout(spin, 1);
    }, Math.max(0, lead));
  });
}

const run = async () => {
  say(`score "${score.title}" -> room ${ROOM}, ${score.events.length} events, t0=${new Date(T0).toISOString()}`);
  await collect({ kind: "score-start", t: Date.now(), t0: T0, score: SCORE_PATH,
                  title: score.title, nEvents: score.events.length, durationMs: score.durationMs });
  connect();
  const tJoin = Date.now();
  while (!setupDone) {
    if (Date.now() - tJoin > 20000) { say("FATAL: no roster in 20 s"); process.exit(1); }
    await new Promise(r => setTimeout(r, 25));
  }
  for (const ev of score.events) {
    const target = T0 + ev.fireAt;
    await fireAt(target);
    const firedAt = Date.now();
    for (const a of ev.actions || []) fireAction(a, ev.id, firedAt);
    const drift = firedAt - target;
    say(`FIRE ${ev.id} (${ev.label || ev.actions.map(a => a.action).join("+")}) drift ${drift >= 0 ? "+" : ""}${drift} ms`);
    collect({ kind: "score-fire", eventId: ev.id, fireAt: ev.fireAt, label: ev.label || null,
              scheduledAt: target, firedAt, driftMs: drift, nActions: (ev.actions || []).length,
              t: firedAt });
  }
  await fireAt(T0 + (score.durationMs || 300000));
  await collect({ kind: "score-end", t: Date.now(), echoPending: pendingEcho.length });
  say(`score complete; ${pendingEcho.length} unmatched echoes`);
  await new Promise(r => setTimeout(r, 1500));           // drain last echoes/collects
  wantOpen = false;
  try { ws.close(1000); } catch (e) { /* noop */ }
  process.exit(0);
};

run().catch(async e => {
  say("FATAL:", e && e.message || e);
  await collect({ kind: "score-fatal", t: Date.now(), error: String(e && e.message || e) });
  process.exit(1);
});
