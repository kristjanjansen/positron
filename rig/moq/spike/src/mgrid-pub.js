// MULTI-PUBLISHER grid: lightweight publisher page (RUNBOOK §13).
// Co-tenancy: ONE page runs K publisher pipelines (?ids=p1,p2,p3,p4,p5) — each
// pipeline has its OWN Connection (own WebTransport/QUIC session, so relay
// fan-in semantics = one session per publisher), own namespace
// positron-mgrid-p{N}, own 320x180@15 canvas (id + burned-ms row), H.264
// baseline annexb ~300 kbps, catalog republish every 2 s (§7.1 trap 1).
// Self-registers each ns into the local roster (draft-14 has no
// SUBSCRIBE_NAMESPACE -> discovery shim). headless=new rejects multiple URLs
// ("Multiple targets are not supported") — hence in-page co-tenancy.
// Params: ?ids= &relay= &fps= &bitrate= &statsms= &noroster=1
import { Connection, Path, Broadcast } from "@moq/net";
import * as Container from "@moq/hang/container";

const params = new URLSearchParams(location.search);
const IDS = (params.get("ids") ?? params.get("id") ?? "p0").split(",");
const RELAY = params.get("relay") ?? "https://draft-14.cloudflare.mediaoverquic.com";
const CODEC = params.get("codec") ?? "avc1.42001f"; // H.264 baseline 3.1
const W = 320, H = 180, FPS = parseInt(params.get("fps") ?? "15", 10);
const BITRATE = parseInt(params.get("bitrate") ?? "300000", 10);
const STATSMS = parseInt(params.get("statsms") ?? "10000", 10);
const GOP = FPS; // 1 s

// Burned row: 40 blocks x 8 px, full width. 32-bit low wall-ms + 8-bit XOR checksum.
const NBLOCKS = 40, BLOCK_W = 8, ROW_Y = 120, ROW_H = 48;

function mklog(id) {
	return (...a) => {
		const line = `MGPUB ${id} ${new Date().toISOString()} ${a.join(" ")}`;
		console.log(line);
		fetch("/log", { method: "POST", body: line }).catch(() => {});
	};
}
window.addEventListener("unhandledrejection", (e) =>
	mklog("page")("UNHANDLED", JSON.stringify(String(e.reason?.message ?? e.reason))));
window.addEventListener("error", (e) => mklog("page")("WINDOW_ERR", JSON.stringify(String(e.message))));

function drawFrame(ctx, id, hue, frameCounter) {
	const ms = Math.round(performance.timeOrigin + performance.now());
	ctx.fillStyle = `hsl(${hue} 45% 22%)`;
	ctx.fillRect(0, 0, W, H);
	ctx.fillStyle = "#fff";
	ctx.font = "bold 44px monospace";
	ctx.fillText(id, 12, 50);
	ctx.font = "16px monospace";
	ctx.fillText(new Date(ms).toISOString().slice(11, 23), 12, 78);
	const x = (frameCounter * 9) % (W - 24);
	ctx.fillStyle = "#0f0";
	ctx.fillRect(x, 88, 24, 24);
	ctx.fillStyle = "#000";
	ctx.fillRect(0, ROW_Y - 6, W, ROW_H + 12);
	const low = ms % 4294967296;
	const bytes = [];
	let v = low;
	for (let i = 3; i >= 0; i--) { bytes[i] = v % 256; v = Math.floor(v / 256); }
	let ck = 0;
	for (const b of bytes) ck ^= b;
	const bits = [];
	for (const b of bytes.concat([ck])) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
	ctx.fillStyle = "#fff";
	for (let i = 0; i < NBLOCKS; i++) if (bits[i]) ctx.fillRect(i * BLOCK_W, ROW_Y, BLOCK_W, ROW_H);
}

async function runPublisher(id) {
	const log = mklog(id);
	const NS = `positron-mgrid-${id}`;
	const cv = document.createElement("canvas");
	cv.width = W; cv.height = H;
	document.getElementById("grid").appendChild(cv);
	const ctx = cv.getContext("2d", { alpha: false, desynchronized: true });
	let hue = 0; for (const c of id) hue = (hue * 31 + c.charCodeAt(0)) % 360;

	for (let attempt = 1; attempt <= 5; attempt++) {
		try {
			log("START", `ns=${NS}`, `attempt=${attempt}`, `${W}x${H}@${FPS}`, `bitrate=${BITRATE}`);
			const t0 = performance.now();
			const conn = await Connection.connect(new URL(RELAY), { websocket: { enabled: false } });
			log("CONNECTED", `ms=${(performance.now() - t0).toFixed(0)}`, `version=${conn.version}`);
			conn.closed?.then?.((e) => {
				log("CONN_CLOSED", JSON.stringify(String(e?.message ?? e)), "reloading page in 2s");
				setTimeout(() => location.reload(), 2000);
			});

			const bc = new Broadcast.Producer();
			conn.publish(Path.from(NS), bc);
			const catalog = {
				video: { renditions: { video: {
					codec: CODEC, container: { kind: "legacy" },
					codedWidth: W, codedHeight: H, framerate: FPS, optimizeForLatency: true,
				} } },
			};
			const catTrack = bc.createTrack("catalog.json");
			catTrack.writeJson(catalog);
			setInterval(() => catTrack.writeJson(catalog), 2000); // §7.1 trap 1
			log("PUBLISHED", `path=${NS}`, `tPub=${Math.round(performance.timeOrigin + performance.now())}`);

			const vTrack = bc.createTrack("video", Container.trackInfo({ latencyMax: 2000 }));
			const prod = new Container.Legacy.Producer(vTrack);

			let encoded = 0, encErrors = 0, encBytes = 0, frameCounter = 0;
			const encoder = new VideoEncoder({
				output: (chunk) => {
					try {
						prod.encode(chunk, chunk.timestamp, chunk.type === "key");
						encoded++; encBytes += chunk.byteLength;
						if (encoded === 1) log("FIRST_ENCODED", `t=${Math.round(performance.timeOrigin + performance.now())}`, `bytes=${chunk.byteLength}`);
					} catch (e) { encErrors++; log("PROD_ERR", JSON.stringify(String(e?.message ?? e))); }
				},
				error: (e) => log("ENC_ERR", JSON.stringify(String(e?.message ?? e))),
			});
			const cfg = {
				codec: CODEC, width: W, height: H, framerate: FPS, bitrate: BITRATE,
				latencyMode: "realtime", avc: { format: "annexb" },
			};
			const sup = await VideoEncoder.isConfigSupported(cfg).catch((e) => ({ supported: false, err: e }));
			if (!sup.supported) throw new Error("encoder unsupported: " + CODEC);
			encoder.configure(cfg); // no hw preference: tiny frames, keep VT sessions free

			if (params.get("noroster") !== "1") {
				fetch("/roster", { method: "POST", body: JSON.stringify({ action: "add", ns: NS }) })
					.then(() => log("ROSTERED", `t=${Math.round(performance.timeOrigin + performance.now())}`))
					.catch((e) => log("ROSTER_ERR", JSON.stringify(String(e?.message ?? e))));
			}

			let i = 0, dropped = 0;
			const interval = 1000 / FPS;
			let nextT = performance.now() + interval;
			const tick = () => {
				drawFrame(ctx, id, hue, frameCounter++);
				if (encoder.encodeQueueSize > 3) { dropped++; }
				else {
					const ts = Math.round(performance.now() * 1000);
					const vf = new VideoFrame(cv, { timestamp: ts });
					encoder.encode(vf, { keyFrame: i % GOP === 0 });
					vf.close();
					i++;
				}
				nextT += interval;
				const d = nextT - performance.now();
				if (d < -1000) nextT = performance.now() + interval;
				setTimeout(tick, Math.max(0, d));
			};
			tick();

			let lastEncoded = 0, lastBytes = 0, lastT = performance.now(), maxQ = 0;
			setInterval(() => { maxQ = Math.max(maxQ, encoder.encodeQueueSize); }, 100);
			setInterval(() => {
				const now = performance.now();
				const dt = (now - lastT) / 1000;
				log("STATS", `encFps=${((encoded - lastEncoded) / dt).toFixed(1)}`, `encoded=${encoded}`,
					`dropped=${dropped}`, `encErrs=${encErrors}`, `q=${encoder.encodeQueueSize}`, `maxQ=${maxQ}`,
					`Bps=${Math.round((encBytes - lastBytes) / dt)}`);
				lastEncoded = encoded; lastBytes = encBytes; lastT = now; maxQ = 0;
			}, STATSMS);
			return; // established
		} catch (e) {
			log("ATTEMPT_FAIL", `attempt=${attempt}`, JSON.stringify(String(e?.message ?? e)));
			await new Promise((r) => setTimeout(r, 2000));
		}
	}
	mklog(id)("ESTABLISH_FAIL after 5 attempts"); // STOP-gate signal
}

for (const id of IDS) runPublisher(id);
