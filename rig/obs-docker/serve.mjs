// Page server + collector on :8890. Zero deps.
//   /clock.html   the burned-clock page (fed to the OBS browser source)
//   /now          host Date.now() (page clock sync — kills VM clock skew)
//   /collect      POST beacons -> results/obs-docker-beacons.jsonl
import http from "node:http";
import { readFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const beacons = fileURLToPath(new URL("../../results/obs-docker-beacons.jsonl", import.meta.url));

const srv = http.createServer((req, res) => {
  const path = req.url.split("?")[0];
  if (path === "/now") {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(String(Date.now()));
  } else if (path === "/collect" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let obj;
      try { obj = JSON.parse(body); } catch { obj = { raw: body }; }
      try { appendFileSync(beacons, JSON.stringify({ recv: Date.now(), ...obj }) + "\n"); } catch {}
      res.writeHead(204); res.end();
    });
  } else if (path === "/clock.html" || path === "/") {
    res.writeHead(200, { "content-type": "text/html", "cache-control": "no-store" });
    res.end(readFileSync(dir + "clock.html"));
  } else { res.writeHead(404); res.end(); }
});
srv.listen(8890, () => console.log("obsdock page server on :8890"));
