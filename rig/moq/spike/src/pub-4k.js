// Resolution/framerate MATRIX publisher (RUNBOOK §9). Parameterized clone of
// pub-safari.js: canvas (reference 1280x720 geometry scaled up to WxH) -> WebCodecs
// H.264 annexb -> hang legacy container -> @moq/net -> CF draft-14 relay.
// Query params: ?ns= &relay= &codec= &w= &h= &fps= &bitrate= &statsms=
// Reports hw/sw encoder mode, achieved capture fps, bytes/s, queue depth, drops.
import { Connection, Path, Broadcast } from "@moq/net";
import * as Container from "@moq/hang/container";

const params = new URLSearchParams(location.search);
const NS = params.get("ns") ?? "elektron-4k-test-dev";
const RELAY = params.get("relay") ?? "https://draft-14.cloudflare.mediaoverquic.com";
const CODEC = params.get("codec") ?? "avc1.42001f";
const W = parseInt(params.get("w") ?? "1280", 10);
const H = parseInt(params.get("h") ?? "720", 10);
const FPS = parseInt(params.get("fps") ?? "30", 10);
const BITRATE = parseInt(params.get("bitrate") ?? "2500000", 10);
const STATSMS = parseInt(params.get("statsms") ?? "5000", 10);
const CBR = params.get("cbr") === "1"; // bitrateMode constant — force real bytes for bandwidth-gate runs
const NOISE = params.get("noise") === "1"; // incompressible bottom strip: the ONLY way to force real bitrate (VT won't pad)
const GOP = FPS; // 1 s GOP always

// Binary row geometry — 1280x720 REFERENCE grid (matches safari-play.js decode);
// everything is drawn through a scale transform so the row lands at the same
// place after the player downscales the frame onto its 1280x720 canvas.
const NBLOCKS = 56, BLOCK_W = 20, ROW_X = 40, ROW_Y = 100, ROW_H = 80;
const SX = W / 1280, SY = H / 720;

function log(...a) {
	const line = `PUB4K ${new Date().toISOString()} ${a.join(" ")}`;
	console.log(line);
	fetch("/log", { method: "POST", body: line }).catch(() => {});
}
window.addEventListener("unhandledrejection", (e) =>
	log("UNHANDLED", e.reason?.constructor?.name, JSON.stringify(e.reason?.message ?? String(e.reason))),
);
window.addEventListener("error", (e) => log("WINDOW_ERR", JSON.stringify(String(e.message))));

const cv = document.getElementById("cv");
cv.width = W; cv.height = H;
const ctx = cv.getContext("2d", { alpha: false, desynchronized: true });
let frameCounter = 0;

// Pre-generated noise strips (device pixels, bottom quarter of the frame).
// Cycled per frame so temporal prediction can't collapse them.
const noiseStrips = [];
if (NOISE) {
	const nh = Math.floor(H / 4);
	for (let n = 0; n < 6; n++) {
		const nc = document.createElement("canvas");
		nc.width = W; nc.height = nh;
		const nctx = nc.getContext("2d");
		const id = nctx.createImageData(W, nh);
		const d = id.data;
		for (let p = 0; p < d.length; p += 4) {
			d[p] = (Math.random() * 256) | 0;
			d[p + 1] = (Math.random() * 256) | 0;
			d[p + 2] = (Math.random() * 256) | 0;
			d[p + 3] = 255;
		}
		nctx.putImageData(id, 0, 0);
		noiseStrips.push(nc);
	}
}

function draw() {
	const ms = Math.round(performance.timeOrigin + performance.now());
	ctx.setTransform(SX, 0, 0, SY, 0, 0);
	ctx.fillStyle = "#1a2b3c";
	ctx.fillRect(0, 0, 1280, 720);
	ctx.fillStyle = "#000";
	ctx.fillRect(ROW_X - 20, ROW_Y - 20, NBLOCKS * BLOCK_W + 40, ROW_H + 40);
	const bytes = [];
	let v = ms;
	for (let i = 5; i >= 0; i--) { bytes[i] = v % 256; v = Math.floor(v / 256); }
	let ck = 0;
	for (const b of bytes) ck ^= b;
	const bits = [];
	for (const b of bytes.concat([ck])) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
	ctx.fillStyle = "#fff";
	for (let i = 0; i < NBLOCKS; i++) if (bits[i]) ctx.fillRect(ROW_X + i * BLOCK_W, ROW_Y, BLOCK_W, ROW_H);
	ctx.font = "bold 72px monospace";
	ctx.fillStyle = "#ffd400";
	ctx.fillText("ELEKTRON MOQ " + W + "x" + H + "@" + FPS, 60, 300);
	ctx.fillStyle = "#fff";
	ctx.font = "bold 96px monospace";
	ctx.fillText(new Date(ms).toISOString().slice(11, 23) + " UTC", 60, 430);
	ctx.font = "bold 44px monospace";
	ctx.fillText(new Date(ms).toISOString().slice(0, 10) + "   frame " + frameCounter + "   " + CODEC, 60, 510);
	// motion so the encoder never dedupes
	const x = (frameCounter * 7) % 1200;
	ctx.fillStyle = "#0f0";
	ctx.fillRect(x, 600, 80, 80);
	ctx.fillStyle = "#f0f";
	ctx.fillRect(1200 - x, 600, 40, 40);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	if (noiseStrips.length) {
		const nc = noiseStrips[frameCounter % noiseStrips.length];
		ctx.drawImage(nc, 0, H - nc.height);
	}
	frameCounter++;
}

(async () => {
	try {
		log("START", `relay=${RELAY}`, `ns=${NS}`, `codec=${CODEC}`, `${W}x${H}@${FPS}`, `bitrate=${BITRATE}`);
		const t0 = performance.now();
		const conn = await Connection.connect(new URL(RELAY), { websocket: { enabled: false } });
		log("CONNECTED", `ms=${(performance.now() - t0).toFixed(0)}`, `version=${conn.version}`);
		conn.closed?.then?.((e) => {
			log("CONN_CLOSED", JSON.stringify(String(e?.message ?? e)), "reloading in 2s");
			setTimeout(() => location.reload(), 2000);
		});

		const bc = new Broadcast.Producer();
		conn.publish(Path.from(NS), bc);
		log("PUBLISHED path=" + NS);

		const catalog = {
			video: {
				renditions: {
					video: {
						codec: CODEC,
						container: { kind: "legacy" },
						codedWidth: W,
						codedHeight: H,
						framerate: FPS,
						optimizeForLatency: true,
					},
				},
			},
		};
		const catTrack = bc.createTrack("catalog.json");
		catTrack.writeJson(catalog);
		log("CATALOG_WRITTEN", JSON.stringify(catalog));
		setInterval(() => catTrack.writeJson(catalog), 2000); // §7.1 trap 1

		const vTrack = bc.createTrack("video", Container.trackInfo({ latencyMax: 2000 }));
		const prod = new Container.Legacy.Producer(vTrack);

		let encoded = 0, encErrors = 0, encBytes = 0, keyframes = 0;
		const encoder = new VideoEncoder({
			output: (chunk) => {
				try {
					prod.encode(chunk, chunk.timestamp, chunk.type === "key");
					encoded++;
					encBytes += chunk.byteLength;
					if (chunk.type === "key") keyframes++;
					if (encoded === 1) log("FIRST_ENCODED", `type=${chunk.type}`, `bytes=${chunk.byteLength}`);
				} catch (e) {
					encErrors++;
					log("PROD_ERR", JSON.stringify(String(e?.message ?? e)));
				}
			},
			error: (e) => log("ENC_ERR", JSON.stringify(String(e?.message ?? e))),
		});

		const base = {
			codec: CODEC, width: W, height: H, framerate: FPS,
			bitrate: BITRATE, latencyMode: "realtime",
		};
		if (CBR) base.bitrateMode = "constant";
		if (CODEC.startsWith("avc1")) base.avc = { format: "annexb" };
		// hw vs sw: probe explicitly and configure with the strongest supported mode.
		const probe = async (mode) => {
			try {
				const r = await VideoEncoder.isConfigSupported({ ...base, hardwareAcceleration: mode });
				return !!r.supported;
			} catch (e) { return `threw:${e.message}`; }
		};
		const hw = await probe("prefer-hardware");
		const sw = await probe("prefer-software");
		const np = await probe("no-preference");
		log("ENC_PROBE", JSON.stringify({ codec: CODEC, w: W, h: H, fps: FPS, hw, sw, np }));
		let mode;
		if (hw === true) mode = "prefer-hardware";
		else if (np === true) mode = "no-preference";
		else if (sw === true) mode = "prefer-software";
		else { log("ENC_UNSUPPORTED all modes"); throw new Error("encoder config unsupported: " + CODEC + " " + W + "x" + H + "@" + FPS); }
		encoder.configure({ ...base, hardwareAcceleration: mode });
		log("ENC_CONFIGURED", `mode=${mode}`, `(hwProbe=${hw} swProbe=${sw} npProbe=${np})`);

		// drift-corrected capture loop (plain setInterval drifts at 60 fps)
		let i = 0, dropped = 0;
		const interval = 1000 / FPS;
		let nextT = performance.now() + interval;
		const tick = () => {
			draw();
			if (encoder.encodeQueueSize > 3) {
				dropped++;
			} else {
				const ts = Math.round(performance.now() * 1000); // µs monotonic
				const vf = new VideoFrame(cv, { timestamp: ts });
				encoder.encode(vf, { keyFrame: i % GOP === 0 });
				vf.close();
				i++;
			}
			nextT += interval;
			const d = nextT - performance.now();
			if (d < -1000) nextT = performance.now() + interval; // fell way behind: resync
			setTimeout(tick, Math.max(0, d));
		};
		tick();

		let lastEncoded = 0, lastBytes = 0, lastDraw = 0, lastT = performance.now(), maxQ = 0;
		setInterval(() => { maxQ = Math.max(maxQ, encoder.encodeQueueSize); }, 100);
		setInterval(() => {
			const now = performance.now();
			const dt = (now - lastT) / 1000;
			const encFps = (encoded - lastEncoded) / dt;
			const drawFps = (frameCounter - lastDraw) / dt;
			const bps = (encBytes - lastBytes) / dt;
			log("STATS", `drawFps=${drawFps.toFixed(1)}`, `encFps=${encFps.toFixed(1)}`,
				`submitted=${i}`, `encoded=${encoded}`, `dropped=${dropped}`, `encErrs=${encErrors}`,
				`queue=${encoder.encodeQueueSize}`, `maxQ=${maxQ}`, `bytesPerSec=${Math.round(bps)}`, `keyframes=${keyframes}`);
			lastEncoded = encoded; lastBytes = encBytes; lastDraw = frameCounter; lastT = now; maxQ = 0;
		}, STATSMS);
	} catch (e) {
		log("FAIL", e?.constructor?.name, JSON.stringify(e?.message ?? String(e)), "reloading in 5s");
		setTimeout(() => location.reload(), 5000);
	}
})();
