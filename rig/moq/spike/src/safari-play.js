// SAFARI MoQ TEST player module. Loaded by index.html AFTER the boot script has
// verified WebTransport exists and the user tapped start. Everything is reported
// on-screen (no devtools on iPhone), into window.__report (for CDP probes), and
// via POST /beacon to the Worker (visible in `wrangler tail`).
import { Connection, Path } from "@moq/net";
import * as Container from "@moq/hang/container";

const params = new URLSearchParams(location.search);
const NS = params.get("namespace") ?? params.get("ns") ?? "elektron-safari-test";
const RELAY = params.get("relay") ?? "https://draft-14.cloudflare.mediaoverquic.com";
const CODEC_OVERRIDE = params.get("codec"); // force decoder codec string
const LOG_URL = params.get("log"); // optional extra log collector (local rig runs)

// Burned binary row geometry — must match pub-safari.js exactly.
const NBLOCKS = 56, BLOCK_W = 20, ROW_X = 40, ROW_Y = 100, ROW_H = 80;

const report = (window.__report = window.__report ?? {});
report.stage = "starting";
report.errors = [];
report.decoded = 0;
report.decodeErrors = 0;
report.fps = 0;
report.reconnects = 0;

const $ = (id) => document.getElementById(id);
function setStatus(id, text, cls) {
	const el = $(id);
	if (!el) return;
	el.textContent = text;
	el.className = "st " + (cls ?? "");
}
function showError(e) {
	const msg = `${e?.constructor?.name ?? "Error"}: ${e?.message ?? String(e)}`;
	report.errors.push(msg);
	const el = $("st-err");
	if (el) {
		el.style.display = "block";
		el.textContent = report.errors.slice(-6).join("\n");
	}
	beacon("error", { msg });
	log("ERROR", JSON.stringify(msg));
}
window.addEventListener("unhandledrejection", (e) => showError(e.reason));
window.addEventListener("error", (e) => showError(e.error ?? e.message));

function log(...a) {
	const line = `PLAY ${new Date().toISOString()} ${a.join(" ")}`;
	console.log(line);
	if (LOG_URL) fetch(LOG_URL, { method: "POST", body: line }).catch(() => {});
}
function beacon(event, extra) {
	try {
		const body = JSON.stringify({
			t: new Date().toISOString(),
			ua: navigator.userAgent,
			event,
			ns: NS,
			stage: report.stage,
			version: report.version,
			decoded: report.decoded,
			fps: report.fps,
			g2g_p50: report.g2g_p50,
			decodeErrors: report.decodeErrors,
			firstFrameMs: report.firstFrameMs,
			reconnects: report.reconnects,
			...extra,
		});
		if (navigator.sendBeacon) navigator.sendBeacon("/beacon", body);
		else fetch("/beacon", { method: "POST", body, keepalive: true }).catch(() => {});
	} catch { /* beacons must never break the page */ }
}

const cv = $("cv");
cv.width = 1280; cv.height = 720;
const wctx = cv.getContext("2d", { alpha: false, desynchronized: true });

function decodeRow() {
	const y = ROW_Y + ROW_H / 2;
	const img = wctx.getImageData(ROW_X, y, NBLOCKS * BLOCK_W, 1).data;
	const levels = [];
	for (let i = 0; i < NBLOCKS; i++) {
		let s = 0;
		for (let dx = 6; dx < 14; dx++) s += img[(i * BLOCK_W + dx) * 4 + 1];
		levels.push(s / 8);
	}
	const mn = Math.min(...levels), mx = Math.max(...levels);
	if (mx - mn < 60) return { ok: false };
	const thr = (mn + mx) / 2;
	const bits = levels.map((l) => (l > thr ? 1 : 0));
	let ms = 0;
	for (let i = 0; i < 48; i++) ms = ms * 2 + bits[i];
	let ck = 0;
	for (let i = 48; i < 56; i++) ck = ck * 2 + bits[i];
	const bytes = [];
	let v = ms;
	for (let i = 5; i >= 0; i--) { bytes[i] = v % 256; v = Math.floor(v / 256); }
	let expect = 0;
	for (const b of bytes) expect ^= b;
	if (expect !== ck) return { ok: false };
	return { ok: true, ms };
}

// rolling glass-to-glass window
const deltas = [];
function pushDelta(d) {
	deltas.push(d);
	if (deltas.length > 300) deltas.shift();
}
function quant(p) {
	if (!deltas.length) return undefined;
	const s = [...deltas].sort((a, b) => a - b);
	return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}

let fpsWindow = 0;
setInterval(() => {
	report.fps = fpsWindow;
	fpsWindow = 0;
	if (report.stage === "live") {
		const p50 = quant(0.5), p95 = quant(0.95);
		report.g2g_p50 = p50 !== undefined ? Math.round(p50) : undefined;
		report.g2g_p95 = p95 !== undefined ? Math.round(p95) : undefined;
		setStatus("st-live",
			`LIVE  ${report.fps} fps  |  ${report.decoded} frames decoded  |  ${report.decodeErrors} decode errors`, "ok");
		setStatus("st-g2g",
			p50 !== undefined
				? `glass-to-glass ~${Math.round(p50)} ms p50 / ${Math.round(p95)} ms p95 (±device clock offset — approximate on phones)`
				: "glass-to-glass: waiting for readable timestamps…", "dim");
	}
}, 1000);
setInterval(() => beacon("stats"), 5000);

// @moq/net v0.3.3 hard-blocks WebTransport on ALL Safari via a UA sniff
// (connection/browser.js: `safari: "<0"`, citing WebKit bug 319818 — "flow-control
// window never refills, which permanently stalls sessions"). Safari's actual
// WebTransport is never even tried. connect() accepts a pre-built transport
// though, so on that specific failure we construct the WebTransport ourselves
// and hand it over — this page's whole point is to measure what Safari really does.
async function connectAny() {
	try {
		return await Connection.connect(new URL(RELAY), { websocket: { enabled: false } });
	} catch (e) {
		const uaBlocked = String(e?.message ?? e).includes("no transport available");
		if (!uaBlocked || typeof WebTransport !== "function") throw e;
		setStatus("st-conn", "@moq/net UA-blocks Safari (WebKit bug 319818) — forcing native WebTransport…", "wait");
		log("SAFARI_FALLBACK forcing native WebTransport (library UA-blocks Safari, WebKit bug 319818)");
		beacon("safari-fallback");
		const wt = new WebTransport(RELAY, {
			allowPooling: false,
			congestionControl: "low-latency",
			// same ALPN list @moq/net offers; CF draft-14 negotiates none -> compat SETUP
			protocols: ["moq-lite-05", "moq-lite-04", "moq-lite-03", "moql", "moqt-19", "moqt-18", "moqt-17", "moqt-16", "moqt-15"],
		});
		wt.closed.catch(() => {});
		await wt.ready;
		return await Connection.connect(new URL(RELAY), { transport: wt });
	}
}

async function session(startedAt) {
	report.stage = "connecting";
	setStatus("st-conn", `Connecting to relay…`, "wait");
	const t0 = performance.now();
	const conn = await connectAny();
	const connectMs = Math.round(performance.now() - t0);
	report.stage = "connected";
	report.version = String(conn.version ?? "?");
	report.connectMs = connectMs;
	setStatus("st-conn", `CONNECTED in ${connectMs} ms — negotiated ${report.version}`, "ok");
	log("CONNECTED", `ms=${connectMs}`, `version=${report.version}`);
	beacon("connected", { connectMs });
	let dead = false;
	conn.closed?.then?.((e) => { dead = true; showError(new Error("relay connection closed: " + (e?.message ?? e))); });

	const bc = conn.consume(Path.from(NS));

	// --- catalog (CF rejects subscribe-before-announce with "Track not found" — retry) ---
	report.stage = "catalog";
	let catGroup;
	for (let attempt = 0; attempt < 30 && !dead; attempt++) {
		setStatus("st-catalog", attempt === 0 ? "Looking for broadcast catalog…" : `Looking for broadcast catalog… (attempt ${attempt + 1} — is the publisher up?)`, "wait");
		const catSub = bc.subscribe("catalog.json");
		catGroup = await Promise.race([
			catSub.nextGroup(),
			catSub.closed.then((e) => ({ err: e })),
			new Promise((r) => setTimeout(() => r("timeout"), 5000)),
		]);
		if (catGroup && catGroup !== "timeout" && !catGroup.err) break;
		if (catGroup?.err) log("CATALOG_RETRY", `attempt=${attempt}`, JSON.stringify(String(catGroup.err?.message ?? catGroup.err)));
		catSub.close?.();
		catGroup = undefined;
		await new Promise((r) => setTimeout(r, 1000));
	}
	if (!catGroup) throw new Error("no catalog after 30 attempts — publisher offline?");
	const catalog = await catGroup.readJson();
	const rends = catalog?.video?.renditions ?? {};
	const name = Object.keys(rends)[0];
	if (!name) throw new Error("catalog has no video rendition: " + JSON.stringify(catalog));
	const cfg = rends[name];
	const codec = CODEC_OVERRIDE ?? cfg.codec;
	report.stage = "subscribed";
	report.catalogCodec = codec;
	setStatus("st-catalog", `Catalog found — track "${name}", codec ${codec}, ${cfg.codedWidth}x${cfg.codedHeight}`, "ok");
	log("CATALOG", JSON.stringify(catalog));
	beacon("catalog", { codec });

	// --- decoder ---
	const dcfg = { codec, optimizeForLatency: true };
	if (cfg.description) dcfg.description = Uint8Array.from(atob(cfg.description), (c) => c.charCodeAt(0));
	const sup = await VideoDecoder.isConfigSupported(dcfg).catch((e) => ({ supported: false, err: e }));
	if (!sup.supported) throw new Error(`VideoDecoder cannot decode ${codec} on this device`);
	let firstFrameLogged = report.firstFrameMs !== undefined;
	const decoder = new VideoDecoder({
		output: (vf) => {
			const recvWall = performance.timeOrigin + performance.now();
			wctx.drawImage(vf, 0, 0, 1280, 720);
			vf.close();
			report.decoded++;
			fpsWindow++;
			if (!firstFrameLogged) {
				firstFrameLogged = true;
				report.firstFrameMs = Math.round(performance.now() - startedAt);
				report.stage = "live";
				setStatus("st-first", `First frame ${(report.firstFrameMs / 1000).toFixed(1)} s after start`, "ok");
				log("FIRST_FRAME", `ms=${report.firstFrameMs}`, `${vf.codedWidth}x${vf.codedHeight}`);
				beacon("first-frame", { firstFrameMs: report.firstFrameMs });
			}
			const dec = decodeRow();
			if (dec.ok) pushDelta(recvWall - dec.ms);
		},
		error: (e) => { report.decodeErrors++; showError(e); },
	});
	decoder.configure(dcfg);

	// --- video frames through hang Container.Consumer ---
	const vSub = bc.subscribe(name);
	const consumer = new Container.Consumer(vSub, { format: new Container.Legacy.Format(), latency: 0 });
	while (!dead) {
		const r = await Promise.race([consumer.next(), new Promise((res) => setTimeout(() => res("timeout"), 15000))]);
		if (r === "timeout") throw new Error("no video data for 15 s (publisher stalled?)");
		if (r === undefined) throw new Error("video track closed by relay");
		if (!r.frame) continue; // end of group
		decoder.decode(new EncodedVideoChunk({
			type: r.frame.keyframe ? "key" : "delta",
			timestamp: r.frame.timestamp,
			data: r.frame.payload,
		}));
	}
	throw new Error("relay connection closed");
}

export async function start() {
	const startedAt = performance.now();
	log("START", `relay=${RELAY}`, `ns=${NS}`);
	beacon("start", { relay: RELAY });
	for (;;) {
		try {
			await session(startedAt);
		} catch (e) {
			showError(e);
			report.stage = "reconnecting";
			report.reconnects++;
			setStatus("st-live", `Reconnecting (attempt ${report.reconnects})…`, "wait");
			await new Promise((r) => setTimeout(r, 2000));
		}
	}
}
