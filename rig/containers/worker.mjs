// Worker shell for the Containers test: one instance "t1", every path proxied, edge timing headers
// added so cold start splits into edge total and container uptime.
// why: lessons/rig-containers.md#legacy-worker-header
import { Container, getContainer } from "@cloudflare/containers";

export class RepackTest extends Container {
  defaultPort = 8080;
  sleepAfter = "90s";           // short so sleep->wake cold start is measurable in-session
  async fetch(request) {
    // /stop force-stops the container: sleepAfter never fired.
    // why: lessons/rig-containers.md#legacy-worker-stop
    if (new URL(request.url).pathname === "/stop") {
      await this.stop();
      return new Response(JSON.stringify({ stopped: true }), { headers: { "Content-Type": "application/json" } });
    }
    // /kill destroys it: node as PID 1 ignores SIGTERM (15 min to SIGKILL otherwise).
    // why: lessons/rig-containers.md#legacy-worker-kill
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
