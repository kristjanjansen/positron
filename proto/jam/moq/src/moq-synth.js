// proto/jam/moq/src/moq-synth.js — MoQ return-path transport for the
// play-a-synth rig (C8): hang legacy container (varint µs timestamp + payload)
// over @moq/net against the CF draft-14 public relay.
//
// Publisher: tracks 'audio' (+ 'video'), new group every groupMs of media time
// (key frames passed by the caller). Subscriber: Container.Consumer latency 0,
// with the §7.1 subscribe-before-announce retry. Fresh namespace per setup
// (§13.4 discipline) is the CALLER's job.
//
// Bundle (ThreatLocker kills native esbuild — §6.3 Docker recipe):
//   docker run --rm -v <jam>/moq:/s -v <spike>/node_modules:/s/node_modules \
//     -w /s node:20-alpine sh -c "npx --yes esbuild src/moq-synth.js --bundle \
//     --format=esm --outfile=www/moq-synth.js"
import { Connection, Path, Broadcast } from "@moq/net";
import * as Container from "@moq/hang/container";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function publisher(relay, ns, { withVideo = false, latencyMax = 2000 } = {}) {
  const conn = await Connection.connect(new URL(relay), { websocket: { enabled: false } });
  const bc = new Broadcast.Producer();
  conn.publish(Path.from(ns), bc);
  const aTrack = bc.createTrack("audio", Container.trackInfo({ latencyMax }));
  const aProd = new Container.Legacy.Producer(aTrack);
  let vProd = null;
  if (withVideo) {
    const vTrack = bc.createTrack("video", Container.trackInfo({ latencyMax }));
    vProd = new Container.Legacy.Producer(vTrack);
  }
  let closed = false;
  conn.closed?.then?.(() => { closed = true; });
  return {
    version: conn.version,
    isClosed: () => closed,
    // key=true starts a new MoQ group (caller decides the grouping policy)
    audioWrite(payloadU8, tsUs, key) { aProd.encode(payloadU8, tsUs, key); },
    videoWrite(payloadU8, tsUs, key) { if (vProd) vProd.encode(payloadU8, tsUs, key); },
    close() {
      try { aProd.close(); } catch {}
      try { vProd && vProd.close(); } catch {}
      try { bc.close?.(); } catch {}
      try { conn.close?.(); } catch {}
    },
  };
}

// onFrame({payload, tsUs, continuous, group}) — called in delivery order
// (Container.Consumer reorders groups, skips slow ones at latency target 0).
// Retries the subscription while the announce is racing (§7.1 trap 2), with a
// bounded count so a dead namespace does not eat the per-session subscribe
// budget (§13.4).
async function subscribeLoop(bc, name, onFrame, log, stopped, subOpts) {
  let attempts = 0;
  for (; attempts < 15 && !stopped.v; attempts++) {
    const sub = subOpts ? bc.subscribe(name, subOpts) : bc.subscribe(name);
    const cons = new Container.Consumer(sub, { format: new Container.Legacy.Format(), latency: 0 });
    const first = await Promise.race([
      cons.next(),
      new Promise((r) => setTimeout(() => r("timeout"), 3000)),
    ]);
    if (first && first !== "timeout") {
      log(`moq sub '${name}' live after ${attempts + 1} attempt(s)`);
      let r = first;
      (async () => {
        while (r !== undefined && !stopped.v) {
          if (r.frame) onFrame({ payload: r.frame.payload, tsUs: r.frame.timestamp, continuous: r.continuous, group: r.group });
          r = await cons.next();
        }
        log(`moq sub '${name}' loop end`);
      })().catch((e) => log(`moq sub '${name}' loop err: ${e && e.message}`));
      stopped.closers.push(() => { try { cons.close(); } catch {} });
      return;
    }
    try { cons.close(); } catch {}
    await sleep(700);
  }
  if (!stopped.v) throw new Error(`moq subscribe '${name}' dead after ${attempts} attempts`);
}

export async function subscriber(relay, ns, { onAudio, onVideo, log = () => {}, subOpts = null } = {}) {
  const conn = await Connection.connect(new URL(relay), { websocket: { enabled: false } });
  const bc = conn.consume(Path.from(ns));
  const stopped = { v: false, closers: [] };
  await subscribeLoop(bc, "audio", onAudio, log, stopped, subOpts);
  if (onVideo) await subscribeLoop(bc, "video", onVideo, log, stopped, subOpts);
  return {
    version: conn.version,
    close() {
      stopped.v = true;
      for (const c of stopped.closers) c();
      try { bc.close?.(); } catch {}
      try { conn.close?.(); } catch {}
    },
  };
}

import { Time } from "@moq/net";
const raw = { Connection, Path, Broadcast, Time, Container };
window.MoqSynth = { publisher, subscriber, raw };
export default { publisher, subscriber, raw };
