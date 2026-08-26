// Media-layer spike PUBLISHER: canvas (burned-ms binary row) -> WebCodecs VP8
// -> hang legacy container -> @moq/net -> CF draft-14 relay.
import { Connection, Path, Broadcast } from "@moq/net";
import * as Container from "@moq/hang/container";

const params = new URLSearchParams(location.search);
const NS = params.get("ns") ?? "moq-media-x1";
const RELAY = params.get("relay") ?? "https://draft-14.cloudflare.mediaoverquic.com";
const CODEC = params.get("codec") ?? "vp8";
const FPS = 30;
const GOP = 30; // 1 s

// Binary row geometry — matches rig/whep/publish.html exactly (1280x720 reference grid).
const NBLOCKS = 56, BLOCK_W = 20, ROW_X = 40, ROW_Y = 100, ROW_H = 80;

function log(...a) {
	const line = `PUB ${(performance.now() / 1000).toFixed(3)} ${a.join(" ")}`;
	console.log(line);
	fetch("/log", { method: "POST", body: line }).catch(() => {});
}
window.addEventListener("unhandledrejection", (e) =>
	log("UNHANDLED", e.reason?.constructor?.name, JSON.stringify(e.reason?.message ?? String(e.reason))),
);

const cv = document.getElementById("cv");
cv.width = 1280; cv.height = 720;
const ctx = cv.getContext("2d", { alpha: false, desynchronized: true });
let frameCounter = 0;

function draw() {
	const ms = Math.round(performance.timeOrigin + performance.now());
	ctx.fillStyle = "#404040";
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
	ctx.font = "bold 64px monospace";
	ctx.fillText(String(ms), 60, 320);
	ctx.font = "bold 48px monospace";
	ctx.fillText("moq-media pub / frame " + frameCounter, 60, 400);
	ctx.fillText(new Date(ms).toISOString().slice(11, 23), 60, 470);
	// motion so the encoder never dedupes
	const x = (frameCounter * 7) % 1200;
	ctx.fillStyle = "#0f0";
	ctx.fillRect(x, 600, 80, 80);
	frameCounter++;
}

(async () => {
	try {
		log("START", `relay=${new URL(RELAY).origin}`, `ns=${NS}`, `codec=${CODEC}`);
		const t0 = performance.now();
		const conn = await Connection.connect(new URL(RELAY), { websocket: { enabled: false } });
		log("CONNECTED", `ms=${(performance.now() - t0).toFixed(0)}`, `version=${conn.version}`);

		const bc = new Broadcast.Producer();
		conn.publish(Path.from(NS), bc);
		log("PUBLISHED path=" + NS);

		// hang catalog on track "catalog.json" (hang Catalog.RootSchema shape)
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
		// CF draft-14 relay is live-edge only: a closed group written before a subscriber
		// joins is never redelivered. Republish the catalog every 2 s so late joiners get it.
		setInterval(() => catTrack.writeJson(catalog), 2000);

		// video track via hang legacy container producer; cap retention to 2 s so a late
		// subscriber does not trigger a giant replay blast of retained groups.
		const vTrack = bc.createTrack("video", Container.trackInfo({ latencyMax: 2000 }));
		const prod = new Container.Legacy.Producer(vTrack);

		let encoded = 0, encErrors = 0;
		const encoder = new VideoEncoder({
			output: (chunk) => {
				try {
					prod.encode(chunk, chunk.timestamp, chunk.type === "key");
					encoded++;
					if (encoded === 1 || encoded % 150 === 0)
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
		setInterval(() => log("STATS", `submitted=${i}`, `encoded=${encoded}`, `dropped=${dropped}`, `queue=${encoder.encodeQueueSize}`), 10000);
	} catch (e) {
		log("FAIL", e?.constructor?.name, JSON.stringify(e?.message ?? String(e)));
	}
})();
