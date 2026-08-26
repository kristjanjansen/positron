// Resolution/framerate MATRIX measurement player (RUNBOOK §9). Same pipeline as
// the deployed safari-play.js (catalog retry -> codec from catalog -> VideoDecoder
// -> drawImage onto a 1280x720 canvas -> burned-row decode) but instrumented:
// per-frame g2g deltas + per-second stats batched as JSONL to POST /jsonl/<name>.
// Query params: ?ns= &relay= &name= &codec=
import { Connection, Path } from "@moq/net";
import * as Container from "@moq/hang/container";

const params = new URLSearchParams(location.search);
const NS = params.get("ns") ?? "elektron-4k-test-dev";
const RELAY = params.get("relay") ?? "https://draft-14.cloudflare.mediaoverquic.com";
const NAME = params.get("name") ?? "dev";
const CODEC_OVERRIDE = params.get("codec");

// Burned row geometry — 1280x720 reference grid (frame is always drawn scaled
// onto a 1280x720 canvas, so this works for any source resolution).
const NBLOCKS = 56, BLOCK_W = 20, ROW_X = 40, ROW_Y = 100, ROW_H = 80;

function log(...a) {
	const line = `PLAY4K ${new Date().toISOString()} ${a.join(" ")}`;
	console.log(line);
	fetch("/log", { method: "POST", body: line }).catch(() => {});
}
window.addEventListener("unhandledrejection", (e) => log("UNHANDLED", JSON.stringify(String(e.reason?.message ?? e.reason))));
window.addEventListener("error", (e) => log("WINDOW_ERR", JSON.stringify(String(e.message))));

// ---- JSONL result batching ----
let buf = [];
function row(o) { buf.push(JSON.stringify(o)); }
setInterval(() => {
	if (!buf.length) return;
	const body = buf.join("\n");
	buf = [];
	fetch(`/jsonl/${NAME}`, { method: "POST", body }).catch(() => {});
}, 2000);

const cv = document.getElementById("cv");
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

const report = (window.__report = { stage: "starting", decoded: 0, decodeErrors: 0, fps: 0, reconnects: 0, bytes: 0, rowFail: 0 });

let fpsWindow = 0, bytesWindow = 0, decoderRef = null;
setInterval(() => {
	report.fps = fpsWindow;
	row({ k: "s", t: Date.now(), fps: fpsWindow, decoded: report.decoded, derr: report.decodeErrors,
		bps: bytesWindow, q: decoderRef ? decoderRef.decodeQueueSize : -1, stage: report.stage, rowFail: report.rowFail });
	fpsWindow = 0; bytesWindow = 0;
}, 1000);

async function session(startedAt) {
	report.stage = "connecting";
	const t0 = performance.now();
	const conn = await Connection.connect(new URL(RELAY), { websocket: { enabled: false } });
	const connectMs = Math.round(performance.now() - t0);
	report.stage = "connected";
	log("CONNECTED", `ms=${connectMs}`, `version=${conn.version}`);
	let dead = false;
	conn.closed?.then?.(() => { dead = true; });

	const bc = conn.consume(Path.from(NS));

	report.stage = "catalog";
	let catGroup;
	for (let attempt = 0; attempt < 30 && !dead; attempt++) {
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
	log("CATALOG", JSON.stringify(catalog));

	const dcfg = { codec, optimizeForLatency: true };
	if (cfg.description) dcfg.description = Uint8Array.from(atob(cfg.description), (c) => c.charCodeAt(0));
	// hw/sw decode probe (informational)
	for (const mode of ["prefer-hardware", "prefer-software"]) {
		const s = await VideoDecoder.isConfigSupported({ ...dcfg, hardwareAcceleration: mode }).catch((e) => ({ supported: `threw:${e.message}` }));
		log("DEC_PROBE", mode, JSON.stringify(s.supported));
	}
	const sup = await VideoDecoder.isConfigSupported(dcfg).catch((e) => ({ supported: false, err: e }));
	if (!sup.supported) throw new Error(`VideoDecoder cannot decode ${codec} on this device`);
	let firstFrameLogged = false;
	const decoder = new VideoDecoder({
		output: (vf) => {
			const recvWall = performance.timeOrigin + performance.now();
			wctx.drawImage(vf, 0, 0, 1280, 720);
			if (!firstFrameLogged) {
				firstFrameLogged = true;
				report.stage = "live";
				report.firstFrameMs = Math.round(performance.now() - startedAt);
				log("FIRST_FRAME", `ms=${report.firstFrameMs}`, `${vf.codedWidth}x${vf.codedHeight}`);
				row({ k: "first", t: Date.now(), ms: report.firstFrameMs, w: vf.codedWidth, h: vf.codedHeight, codec });
			}
			vf.close();
			report.decoded++;
			fpsWindow++;
			const dec = decodeRow();
			if (dec.ok) row({ k: "f", t: Math.round(recvWall), d: +(recvWall - dec.ms).toFixed(1) });
			else report.rowFail++;
		},
		error: (e) => { report.decodeErrors++; log("DEC_ERR", JSON.stringify(String(e?.message ?? e))); },
	});
	decoder.configure(dcfg);
	decoderRef = decoder;

	const vSub = bc.subscribe(name);
	const consumer = new Container.Consumer(vSub, { format: new Container.Legacy.Format(), latency: 0 });
	while (!dead) {
		const r = await Promise.race([consumer.next(), new Promise((res) => setTimeout(() => res("timeout"), 15000))]);
		if (r === "timeout") throw new Error("no video data for 15 s (publisher stalled?)");
		if (r === undefined) throw new Error("video track closed by relay");
		if (!r.frame) continue;
		report.bytes += r.frame.payload.byteLength;
		bytesWindow += r.frame.payload.byteLength;
		decoder.decode(new EncodedVideoChunk({
			type: r.frame.keyframe ? "key" : "delta",
			timestamp: r.frame.timestamp,
			data: r.frame.payload,
		}));
	}
	throw new Error("relay connection closed");
}

(async () => {
	const startedAt = performance.now();
	log("START", `relay=${RELAY}`, `ns=${NS}`, `name=${NAME}`);
	for (;;) {
		try {
			await session(startedAt);
		} catch (e) {
			log("SESSION_ERR", JSON.stringify(String(e?.message ?? e)));
			report.stage = "reconnecting";
			report.reconnects++;
			row({ k: "reconnect", t: Date.now(), n: report.reconnects, err: String(e?.message ?? e) });
			await new Promise((r) => setTimeout(r, 2000));
		}
	}
})();
