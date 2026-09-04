#!/usr/bin/env node
// Cue operator for the replay test — node WS client to the DEPLOYED elektron-rtc
// room. Sends 12 cues at known offsets from BASE_MS (the publisher's T0 stamp):
//   even seq: "now" cues       — sent AT the fire moment, at = Date.now()
//   odd  seq: scheduled cues   — sent 2 s early,          at = send + 2000
// Every cue carries the operator's own stamps (at + sentAt) — these travel and
// persist VERBATIM (the DO never re-stamps them; its clock is untrusted).
// Usage: BASE_MS=<epoch ms> [ROOM=replay-test] [OUT=…/operator-log.json] node operator.mjs
import fs from "fs";

const ROOT = "/Users/s32863/personal/positron";
const ENV = fs.readFileSync(`${ROOT}/.env`, "utf8").split("\n");
const TOKEN = ENV.find(l => l.startsWith("ROOM_TOKEN=")).slice(11).trim();
const OP_TOKEN = (ENV.find(l => l.startsWith("OPERATOR_TOKEN=")) || "").slice(15).trim();
const REMOTE = "https://rtc.positron.studio";
const ROOM = process.env.ROOM || "replay-test";
const BASE = parseInt(process.env.BASE_MS || "0", 10);
const OUT = process.env.OUT || `${ROOT}/proto/replay/artifacts/operator-log.json`;
if (!BASE) { console.error("BASE_MS required"); process.exit(1); }

const OFFSETS_S = (process.env.OFFSETS || "12,27,42,57,72,87,102,117,132,147,162,177")
  .split(",").map(Number);
const plan = OFFSETS_S.map((off, i) => ({
  seq: i + 1,
  id: `CUE-${String(i + 1).padStart(2, "0")}`,
  mode: i % 2 === 0 ? "now" : "scheduled",
  nominalAt: BASE + off * 1000,
}));

function ts() { return new Date().toISOString().slice(11, 23); }
const log = { base: BASE, room: ROOM, cues: [] };

const ws = new WebSocket(`${REMOTE.replace("https", "wss")}/room/${ROOM}/ws?token=${TOKEN}`);
ws.onerror = (e) => { console.error("ws error", e.message || e); process.exit(1); };
ws.onopen = () => ws.send(JSON.stringify({ type: "join", participantId: "op", name: "Operator", role: "operator", opToken: OP_TOKEN }));
ws.onmessage = async (m) => {
  let f; try { f = JSON.parse(m.data); } catch { return; }
  if (f.type !== "roster") return;
  console.log(ts(), `operator joined room ${ROOM}; sending ${plan.length} cues (base ${BASE})`);
  for (const c of plan) {
    // "now": wake at the fire moment; "scheduled": wake 2 s early.
    const wake = c.mode === "now" ? c.nominalAt : c.nominalAt - 2000;
    const wait = wake - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    const sentAt = Date.now();
    const at = c.mode === "now" ? sentAt : c.nominalAt;
    const cue = { id: c.id, at, sentAt, data: { text: c.id, mode: c.mode } };
    ws.send(JSON.stringify({ type: "cue", cue }));
    log.cues.push({ ...c, at, sentAt });
    console.log(ts(), `sent ${c.id} mode=${c.mode} at=${at} (nominal ${c.nominalAt}, drift ${at - c.nominalAt} ms)`);
  }
  await new Promise(r => setTimeout(r, 1000));
  fs.writeFileSync(OUT, JSON.stringify(log, null, 2));
  console.log(ts(), `operator done — log ${OUT}`);
  ws.close();
  process.exit(0);
};
setTimeout(() => { console.error("operator timeout"); process.exit(1); }, (200 + OFFSETS_S[OFFSETS_S.length - 1]) * 1000);
