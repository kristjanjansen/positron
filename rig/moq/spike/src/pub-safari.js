// SAFARI MoQ TEST publisher: canvas (burned-ms binary row + human clock) -> WebCodecs
// H.264 (annexb, baseline) -> hang legacy container -> @moq/net -> CF draft-14 relay.
// Long-lived: runs forever in headless Chrome; namespace positron-safari-test.
import { Connection, Path, Broadcast } from "@moq/net";
import * as Container from "@moq/hang/container";

const params = new URLSearchParams(location.search);
const NS = params.get("ns") ?? "positron-safari-test";
const RELAY = params.get("relay") ?? "https://draft-14.cloudflare.mediaoverquic.com";
// Baseline profile level 3.1 (720p30-capable) — the safe cross-browser H.264 flavor.
const CODEC = params.get("codec") ?? "avc1.42001f";
const FPS = 30;
const GOP = 30; // 1 s

// Binary row geometry — matches rig/whep/publish.html exactly (1280x720 reference grid).
const NBLOCKS = 56, BLOCK_W = 20, ROW_X = 40, ROW_Y = 100, ROW_H = 80;

function log(...a) {
	const line = `PUB ${new Date().toISOString()} ${a.join(" ")}`;
	console.log(line);
	fetch("/log", { method: "POST", body: line }).catch(() => {});
}
window.addEventListener("unhandledrejection", (e) =>
	log("UNHANDLED", e.reason?.constructor?.name, JSON.stringify(e.reason?.message ?? String(e.reason))),
);
window.addEventListener("error", (e) => log("WINDOW_ERR", JSON.stringify(String(e.message))));

const cv = document.getElementById("cv");
cv.width = 1280; cv.height = 720;
const ctx = cv.getContext("2d", { alpha: false, desynchronized: true });
let frameCounter = 0;

function draw() {
	const ms = Math.round(performance.timeOrigin + performance.now());
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
	ctx.fillText("POSITRON MOQ TEST", 60, 300);
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
	frameCounter++;
}

(async () => {
	try {
		log("START", `relay=${RELAY}`, `ns=${NS}`, `codec=${CODEC}`);
		const t0 = performance.now();
		const conn = await Connection.connect(new URL(RELAY), { websocket: { enabled: false } });
		log("CONNECTED", `ms=${(performance.now() - t0).toFixed(0)}`, `version=${conn.version}`);
		// Self-healing: if the relay drops the session, reload the page — headless
		// Chrome restarts the whole publisher (fresh connect + catalog republish).
		conn.closed?.then?.((e) => {
			log("CONN_CLOSED", JSON.stringify(String(e?.message ?? e)), "reloading in 2s");
			setTimeout(() => location.reload(), 2000);
		});

		const bc = new Broadcast.Producer();
		conn.publish(Path.from(NS), bc);
		log("PUBLISHED path=" + NS);

		// hang catalog on track "catalog.json" (hang Catalog.RootSchema shape).
		// annexb H.264 = self-contained bitstream (SPS/PPS ride with every keyframe),
		// so the decoder needs NO description — catalog carries just the codec string.
		const catalog = {
			video: {
				renditions: {
					video: {
						codec: CODEC,
						container: { kind: "legacy" },
						codedWidth: 1280,
						codedHeight: 720,
						framerate: FPS,
						optimizeForLatency: true,
					},
				},
			},
		};
		const catTrack = bc.createTrack("catalog.json");
		catTrack.writeJson(catalog);
		log("CATALOG_WRITTEN", JSON.stringify(catalog));
		// CF draft-14 relay is live-edge only: closed groups are never redelivered.
		// Republish the catalog every 2 s so late joiners get it.
		setInterval(() => catTrack.writeJson(catalog), 2000);

		// video track via hang legacy container; cap retention to 2 s so a late
		// subscriber does not trigger a giant replay blast of retained groups.
		const vTrack = bc.createTrack("video", Container.trackInfo({ latencyMax: 2000 }));
		const prod = new Container.Legacy.Producer(vTrack);

		let encoded = 0, encErrors = 0;
		const encoder = new VideoEncoder({
			output: (chunk) => {
				try {
					prod.encode(chunk, chunk.timestamp, chunk.type === "key");
					encoded++;
					if (encoded === 1 || encoded % 1800 === 0)
						log("ENCODED", `n=${encoded}`, `type=${chunk.type}`, `bytes=${chunk.byteLength}`);
				} catch (e) {
					encErrors++;
					log("PROD_ERR", JSON.stringify(String(e?.message ?? e)));
				}
			},
			error: (e) => log("ENC_ERR", JSON.stringify(String(e?.message ?? e))),
		});
		const cfg = {
			codec: CODEC, width: 1280, height: 720, framerate: FPS,
			bitrate: 2_000_000, latencyMode: "realtime",
		};
		if (CODEC.startsWith("avc1")) cfg.avc = { format: "annexb" };
		const support = await VideoEncoder.isConfigSupported(cfg);
		log("ENC_SUPPORT", JSON.stringify(support.supported));
		encoder.configure(cfg);

		let i = 0, dropped = 0;
		setInterval(() => {
			draw();
			if (encoder.encodeQueueSize > 3) { dropped++; return; }
			const ts = Math.round(performance.now() * 1000); // µs monotonic
			const vf = new VideoFrame(cv, { timestamp: ts });
			encoder.encode(vf, { keyFrame: i % GOP === 0 });
			vf.close();
			i++;
		}, 1000 / FPS);
		// STATS every 60 s — this publisher runs for hours; keep the log small.
		setInterval(() => log("STATS", `submitted=${i}`, `encoded=${encoded}`, `dropped=${dropped}`, `encErrs=${encErrors}`, `queue=${encoder.encodeQueueSize}`), 60000);
	} catch (e) {
		log("FAIL", e?.constructor?.name, JSON.stringify(e?.message ?? String(e)), "reloading in 5s");
		setTimeout(() => location.reload(), 5000);
	}
})();
