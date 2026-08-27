// proto/jam/moq/src/moq-jam.js — thin note-transport wrapper over @moq/net
// against the CF draft-14 public relay. One note = one single-frame group
// (writeFrame), read with recvGroup so late/out-of-order groups still count.
// Datagram path included for the probe: @moq/net docs state datagrams are
// NEVER delivered over IETF moq-transport (CF d14 is IETF) — we verify.
// Bundled with Docker esbuild (ThreatLocker kills the native binary locally):
//   docker run --rm -v <jam>/moq:/s -v <spike>/node_modules:/s/node_modules \
//     -w /s node:20-alpine sh -c "npx --yes esbuild src/moq-jam.js --bundle \
//     --format=esm --outfile=www/moq-jam.js"
import { Connection, Path, Broadcast, Time } from "@moq/net";

async function connect(relay) {
  return await Connection.connect(new URL(relay), { websocket: { enabled: false } });
}

export async function publisher(relay, ns) {
  const conn = await connect(relay);
  const bc = new Broadcast.Producer();
  conn.publish(Path.from(ns), bc);
  const track = bc.createTrack("notes", { latencyMax: 4000 });
  return {
    kind: "moq-pub",
    send(bytes) {
      track.writeFrame({ payload: new Uint8Array(bytes), timestamp: Time.Timestamp.now() });
    },
    sendDatagram(bytes) {
      track.appendDatagram(Time.Timestamp.now(), new Uint8Array(bytes));
    },
    onMessage() {}, onDatagram() {},
    close() { try { track.close(); bc.close?.(); conn.close?.(); } catch {} },
  };
}

export async function subscriber(relay, ns) {
  const conn = await connect(relay);
  const bc = conn.consume(Path.from(ns));
  const sub = bc.subscribe("notes", { latencyMax: 4000 });
  let msgCb = null, dgramCb = null;
  (async () => {
    for (;;) {
      const g = await sub.recvGroup();
      if (!g) break;
      const f = await g.readFrame();
      if (f && msgCb) msgCb(f.payload);
      g.close();
    }
  })().catch((e) => console.log("moq recvGroup loop end:", e?.message));
  (async () => {
    for (;;) {
      const d = await sub.recvDatagram();
      if (!d) break;
      if (dgramCb) dgramCb(d.payload);
    }
  })().catch((e) => console.log("moq recvDatagram loop end:", e?.message));
  return {
    kind: "moq-sub",
    send() { throw new Error("subscriber cannot send"); },
    sendDatagram() { throw new Error("subscriber cannot send"); },
    onMessage(cb) { msgCb = cb; },
    onDatagram(cb) { dgramCb = cb; },
    close() { try { sub.close(); conn.close?.(); } catch {} },
  };
}

window.MoqJam = { publisher, subscriber };
