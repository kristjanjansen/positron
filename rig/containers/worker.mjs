// Worker shell for the CF Containers test — one container class, one named
// instance ("t1"). Every request path is proxied straight into the container's
// node server; the Worker adds edge-side timing headers so cold start can be
// split (edge total vs container-internal uptime).
import { Container, getContainer } from "@cloudflare/containers";

export class RepackTest extends Container {
  defaultPort = 8080;
  sleepAfter = "90s";           // short so sleep->wake cold start is measurable in-session
  async fetch(request) {
    // /stop: force-stop the container (measured stand-in for sleep, since
    // sleepAfter never fired — constructor renewActivityTimeout races the alarm)
    if (new URL(request.url).pathname === "/stop") {
      await this.stop();
      return new Response(JSON.stringify({ stopped: true }), { headers: { "Content-Type": "application/json" } });
    }
    // /kill: hard destroy — needed because node-as-PID-1 ignores the SIGTERM
    // that stop() and rollouts send (15 min to SIGKILL otherwise)
    if (new URL(request.url).pathname === "/kill") {
      await this.destroy();
      return new Response(JSON.stringify({ destroyed: true }), { headers: { "Content-Type": "application/json" } });
    }
    return super.fetch(request);
  }
}

export default {
  async fetch(request, env) {
    const t0 = Date.now();
    const c = getContainer(env.REPACK_TEST, "t1");
    const resp = await c.fetch(request);
    const out = new Response(resp.body, resp);
    out.headers.set("x-edge-ms", String(Date.now() - t0));
    return out;
  },
};
