// Worker shell for the QUIC probe, as in rig/containers.
// why: lessons/rig-obs.md#quic-worker
import { Container, getContainer } from "@cloudflare/containers";

export class QuicTest extends Container {
  defaultPort = 8080;
  sleepAfter = "5m"; // not trusted (livelock): /kill explicitly when done; why: lessons/rig-obs.md#quic-worker-sleep
  async fetch(request) {
    const p = new URL(request.url).pathname;
    if (p === "/stop") { await this.stop(); return Response.json({ stopped: true }); }
    if (p === "/kill") { await this.destroy(); return Response.json({ destroyed: true }); }
    return super.fetch(request);
  }
}

export default {
  async fetch(request, env) {
    const t0 = Date.now();
    const c = getContainer(env.QUIC_TEST, "q1");
    const resp = await c.fetch(request);
    const out = new Response(resp.body, resp);
    out.headers.set("x-edge-ms", String(Date.now() - t0));
    return out;
  },
};
