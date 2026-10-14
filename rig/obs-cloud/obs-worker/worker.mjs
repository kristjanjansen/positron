// OBS in a CF Container: /obsws to :4455 (path rewritten to "/"), /stop and /kill, else :8890.
// why: lessons/rig-obs.md#obs-worker-header
import { Container, getContainer } from "@cloudflare/containers";

export class ObsCloud extends Container {
  defaultPort = 8890;
  sleepAfter = "10m"; // not trusted (livelock): /kill explicitly when done; why: lessons/rig-obs.md#obs-worker-sleep
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/stop") { await this.stop(); return Response.json({ stopped: true }); }
    if (url.pathname === "/kill") { await this.destroy(); return Response.json({ destroyed: true }); }
    if (url.pathname === "/obsws") {
      url.pathname = "/";
      return this.containerFetch(new Request(url, request), 4455);
    }
    return this.containerFetch(request, 8890);
  }
}

export default {
  async fetch(request, env) {
    const t0 = Date.now();
    const c = getContainer(env.OBS_CLOUD, "obs1");
    const resp = await c.fetch(request);
    if (resp.webSocket) return resp; // don't rewrap WS upgrade responses
    const out = new Response(resp.body, resp);
    out.headers.set("x-edge-ms", String(Date.now() - t0));
    return out;
  },
};
