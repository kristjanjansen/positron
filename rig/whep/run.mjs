#!/usr/bin/env node
// WHEP rig driver — two SEPARATE chromium instances (publisher, player) so both
// pages are foreground: background tabs stop buffering AND rVFC with zero errors
// (plan §4.2). Uses playwright 1.60.0 from the npx cache (chromium-1223 already
// installed — no downloads).
import { createRequire } from "module";
const require = createRequire("/Users/s32863/.npm/_npx/705bc6b22212b352/node_modules/");
const { chromium } = require("playwright");
import fs from "fs";

const DURATION_S = parseInt(process.env.DURATION || "30", 10);
const BASE = "http://127.0.0.1:8897";
const LOGDIR = "/Users/s32863/personal/elektron/rig/whep/logs";
fs.mkdirSync(LOGDIR, { recursive: true });

const ARGS = [
  "--autoplay-policy=no-user-gesture-required",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
  "--mute-audio",
];

function ts() { return new Date().toISOString().slice(11, 23); }
function say(...a) { console.log(ts(), ...a); }

async function launchPage(name, url) {
  // channel:'chromium' => NEW headless on the full Chrome-for-Testing binary
  // (headless shell may lack the codec set; CF wants H.264 42e01f).
  const browser = await chromium.launch({ headless: true, channel: "chromium", args: ARGS });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logStream = fs.createWriteStream(`${LOGDIR}/${name}.console.log`, { flags: "a" });
  page.on("console", m => logStream.write(`${ts()} [${m.type()}] ${m.text()}\n`));
  page.on("pageerror", e => logStream.write(`${ts()} [pageerror] ${e.message}\n`));
  await page.goto(`${url}?cb=${Date.now()}`, { waitUntil: "load" });
  return { browser, page };
}

async function waitPhase(page, want, timeoutMs, name) {
  const t0 = Date.now();
  for (;;) {
    const st = await page.evaluate(() => window.__state);
    if (st.phase === want) return st;
    if (st.phase === "failed") throw new Error(`${name} failed: ${st.error}`);
    if (Date.now() - t0 > timeoutMs) throw new Error(`${name} timeout waiting for ${want}; state=${JSON.stringify(st)}`);
    await new Promise(r => setTimeout(r, 500));
  }
}

const run = async () => {
  say(`run start, duration ${DURATION_S}s`);
  // WHIP publish URL (a credential) comes from the gitignored live_input.json, never from the page.
  const { readFileSync } = await import("node:fs");
  const li = JSON.parse(readFileSync(new URL("./live_input.json", import.meta.url), "utf8"));
  const whipUrl = li.result?.webRTC?.url ?? li.webRTC?.url;
  if (!whipUrl) throw new Error("no webRTC.url in rig/whep/live_input.json");
  const pub = await launchPage("publish", `${BASE}/publish.html?whip=${encodeURIComponent(whipUrl)}`);
  const pubState = await waitPhase(pub.page, "publishing", 30000, "publisher");
  say("publisher up:", JSON.stringify(pubState));

  const play = await launchPage("play", `${BASE}/play.html`);
  const playState = await waitPhase(play.page, "playing", 90000, "player");
  say("player up:", JSON.stringify(playState));

  const t0 = Date.now();
  while (Date.now() - t0 < DURATION_S * 1000) {
    await new Promise(r => setTimeout(r, 5000));
    const ps = await play.page.evaluate(() => window.__state);
    const bs = await pub.page.evaluate(() => window.__state);
    const vis = await play.page.evaluate(() => document.visibilityState);
    say(`pub frames=${bs.frames} | play samples=${ps.samples} valid=${ps.valid} captureTimeSeen=${ps.captureTimeSeen} vis=${vis}`);
  }

  const finalPlay = await play.page.evaluate(() => window.__state);
  const finalPub = await pub.page.evaluate(() => window.__state);
  say("FINAL pub:", JSON.stringify(finalPub));
  say("FINAL play:", JSON.stringify(finalPlay));

  await play.browser.close();
  await pub.browser.close();
  say("run done");
};

run().catch(e => { console.error(ts(), "DRIVER FATAL:", e); process.exit(1); });
