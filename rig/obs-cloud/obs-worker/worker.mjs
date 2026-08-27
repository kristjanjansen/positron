// Worker shell for OBS-in-a-CF-Container. Routes:
//   /obsws       -> container :4455 (obs-websocket v5; WS upgrade passthrough,
//                   path rewritten to "/" so obs-websocket sees a clean upgrade)
//   /stop /kill  -> DO lifecycle controls (sleepAfter is not trusted)
//   /*           -> container :8890 (serve-cloud.mjs: /clock.html /now /cpu
//                   /top /health /beacons)
import { Container, getContainer } from "@cloudflare/containers";

export class ObsCloud extends Container {
  defaultPort = 8890;
  sleepAfter = "10m"; // not trusted (livelock) — /kill explicitly when done
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
