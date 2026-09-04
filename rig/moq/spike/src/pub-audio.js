// AUDIO SPIKE publisher (RUNBOOK §10): video (720p30 H.264, burned-ms row — same
// geometry as pub-safari.js) PLUS WebAudio-synthesized audio -> AudioEncoder
// (Opus 48k stereo, AAC fallback) -> hang legacy container -> @moq/net -> CF
// draft-14 relay. Namespace positron-audio-test (own namespace — never the
// sibling-owned positron-safari-test). NO getUserMedia anywhere: audio samples
// are synthesized directly into AudioData objects.
//
// Audio signal (so the player can measure latency + A/V sync from content alone):
//   - background: 4-note tone sequence (330/392/440/494 Hz), 250 ms/note, amp 0.08
//   - TICK: 6 ms 2 kHz burst at amp 0.9 whenever wall-clock ms crosses a multiple
//     of 500. Audio timestamps are wall-anchored µs (timeOrigin+performance.now()),
//     advanced by exact sample count, so a tick's media timestamp IS its true wall
//     time — the player rounds the detected tick to the nearest 500 ms boundary
//     and gets the publisher wall time exactly (same one-clock trick as the
//     burned-ms video row).
import { Connection, Path, Broadcast } from "@moq/net";
import * as Container from "@moq/hang/container";

const params = new URLSearchParams(location.search);
const NS = params.get("ns") ?? "positron-audio-test";
const RELAY = params.get("relay") ?? "https://draft-14.cloudflare.mediaoverquic.com";
const VCODEC = params.get("codec") ?? "avc1.42001f";
const FPS = 30, GOP = 30;
const SR = 48000, CH = 2, CHUNK = 960; // 20 ms per AudioData
const ABITRATE = 96_000;

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
	ctx.fillStyle = "#00d4ff";
	ctx.fillText("POSITRON AUDIO TEST", 60, 300);
	ctx.fillStyle = "#fff";
	ctx.font = "bold 96px monospace";
	ctx.fillText(new Date(ms).toISOString().slice(11, 23) + " UTC", 60, 430);
	ctx.font = "bold 44px monospace";
	ctx.fillText(new Date(ms).toISOString().slice(0, 10) + "   frame " + frameCounter, 60, 510);
	const x = (frameCounter * 7) % 1200;
	ctx.fillStyle = "#0f0";
	ctx.fillRect(x, 600, 80, 80);
	ctx.fillStyle = "#f0f";
	ctx.fillRect(1200 - x, 600, 40, 40);
	frameCounter++;
}

// --- audio synthesis: samples for absolute wall-clock media time -------------
const NOTES = [330, 392, 440, 494]; // 250 ms each -> 1 s cycle, distinct sequence
const TICK_MS = 6, TICK_HZ = 2000, TICK_EVERY = 500;
function synthChunk(startWallMs) {
	// planar f32: L then R, identical channels (keeps detection trivial)
	const data = new Float32Array(CHUNK * CH);
	for (let i = 0; i < CHUNK; i++) {
		const tMs = startWallMs + (i / SR) * 1000;
		const tSec = tMs / 1000;
		const note = NOTES[Math.floor(tMs / 250) % 4];
		let s = 0.08 * Math.sin(2 * Math.PI * note * tSec);
		const inTick = tMs % TICK_EVERY;
		if (inTick < TICK_MS) s = 0.9 * Math.sin(2 * Math.PI * TICK_HZ * (inTick / 1000));
		data[i] = s;
		data[CHUNK + i] = s;
	}
	return data;
}

(async () => {
	try {
		log("START", `relay=${RELAY}`, `ns=${NS}`, `vcodec=${VCODEC}`, `audio=opus ${SR}Hz x${CH}`);
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

		// --- audio encoder (Opus first, AAC-LC fallback) ---------------------
		let acodec = "opus";
		let asup = await AudioEncoder.isConfigSupported({ codec: "opus", sampleRate: SR, numberOfChannels: CH, bitrate: ABITRATE }).catch(() => ({ supported: false }));
		if (!asup.supported) {
			acodec = "mp4a.40.2";
			asup = await AudioEncoder.isConfigSupported({ codec: acodec, sampleRate: SR, numberOfChannels: CH, bitrate: ABITRATE }).catch(() => ({ supported: false }));
			if (!asup.supported) throw new Error("neither opus nor mp4a.40.2 AudioEncoder supported");
		}
		log("AENC_CODEC", acodec);

		const aTrack = bc.createTrack("audio", Container.trackInfo({ latencyMax: 2000 }));
		const aProd = new Container.Legacy.Producer(aTrack);
		let aDesc; // base64 decoder description from encoder metadata (if any)
		let aEncoded = 0, aGroupStartUs = 0, aFirstOut = false;
		const AGROUP_US = 1_000_000; // new MoQ group per 1 s of audio
		let resolveFirstOut;
		const firstOut = new Promise((r) => (resolveFirstOut = r));
		const aEnc = new AudioEncoder({
			output: (chunk, meta) => {
				try {
					if (!aFirstOut) {
						aFirstOut = true;
						const d = meta?.decoderConfig?.description;
						if (d) {
							const u8 = d instanceof ArrayBuffer ? new Uint8Array(d) : new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
							aDesc = btoa(String.fromCharCode(...u8));
						}
						log("AENC_FIRST", `codec=${acodec}`, `desc=${aDesc ? aDesc.length + "b64" : "none"}`, `type=${chunk.type}`);
						resolveFirstOut();
					}
					// audio "keyframe" = start a new group every AGROUP_US of media time
					const key = aEncoded === 0 || chunk.timestamp - aGroupStartUs >= AGROUP_US;
					if (key) aGroupStartUs = chunk.timestamp;
					aProd.encode(chunk, chunk.timestamp, key);
					aEncoded++;
				} catch (e) {
					log("APROD_ERR", JSON.stringify(String(e?.message ?? e)));
				}
			},
			error: (e) => log("AENC_ERR", JSON.stringify(String(e?.message ?? e))),
		});
		aEnc.configure({ codec: acodec, sampleRate: SR, numberOfChannels: CH, bitrate: ABITRATE });

		// --- audio generation loop: wall-anchored, generate BEHIND real time --
		// (like a capture device delivering 20 ms buffers: a chunk is synthesized
		// and encoded only after its media time has fully elapsed)
		const startPerf = performance.now();
		const startWallMs = performance.timeOrigin + startPerf;
		let samples = 0, aSubmitted = 0;
		setInterval(() => {
			const elapsed = performance.now() - startPerf;
			while (((samples + CHUNK) / SR) * 1000 <= elapsed) {
				const chunkWallMs = startWallMs + (samples / SR) * 1000;
				const ad = new AudioData({
					format: "f32-planar", sampleRate: SR,
					numberOfFrames: CHUNK, numberOfChannels: CH,
					timestamp: Math.round(chunkWallMs * 1000), // µs, wall-anchored
					data: synthChunk(chunkWallMs),
				});
				aEnc.encode(ad);
				ad.close();
				samples += CHUNK;
				aSubmitted++;
			}
		}, 10);

		// --- catalog: wait for the first audio output so description is known --
		await Promise.race([firstOut, new Promise((r) => setTimeout(r, 3000))]);
		const audioRend = {
			codec: acodec, container: { kind: "legacy" },
			sampleRate: SR, numberOfChannels: CH, bitrate: ABITRATE,
		};
		if (aDesc) audioRend.description = aDesc;
		const catalog = {
			video: {
				renditions: {
					video: {
						codec: VCODEC, container: { kind: "legacy" },
						codedWidth: 1280, codedHeight: 720, framerate: FPS,
						optimizeForLatency: true,
					},
				},
			},
			audio: { renditions: { audio: audioRend } },
		};
		const catTrack = bc.createTrack("catalog.json");
		catTrack.writeJson(catalog);
		log("CATALOG_WRITTEN", JSON.stringify(catalog));
		setInterval(() => catTrack.writeJson(catalog), 2000); // live-edge trap (§7.1)

		// --- video (same as pub-safari) --------------------------------------
		const vTrack = bc.createTrack("video", Container.trackInfo({ latencyMax: 2000 }));
		const vProd = new Container.Legacy.Producer(vTrack);
		let vEncoded = 0;
		const vEnc = new VideoEncoder({
			output: (chunk) => {
				try { vProd.encode(chunk, chunk.timestamp, chunk.type === "key"); vEncoded++; }
				catch (e) { log("VPROD_ERR", JSON.stringify(String(e?.message ?? e))); }
			},
			error: (e) => log("VENC_ERR", JSON.stringify(String(e?.message ?? e))),
		});
		const vcfg = { codec: VCODEC, width: 1280, height: 720, framerate: FPS, bitrate: 2_000_000, latencyMode: "realtime" };
		if (VCODEC.startsWith("avc1")) vcfg.avc = { format: "annexb" };
		vEnc.configure(vcfg);
		let vi = 0, vDropped = 0;
		setInterval(() => {
			draw();
			if (vEnc.encodeQueueSize > 3) { vDropped++; return; }
			const ts = Math.round(performance.now() * 1000);
			const vf = new VideoFrame(cv, { timestamp: ts });
			vEnc.encode(vf, { keyFrame: vi % GOP === 0 });
			vf.close();
			vi++;
		}, 1000 / FPS);

		setInterval(() => log("STATS",
			`a_submitted=${aSubmitted}`, `a_encoded=${aEncoded}`, `a_queue=${aEnc.encodeQueueSize}`,
			`v_submitted=${vi}`, `v_encoded=${vEncoded}`, `v_dropped=${vDropped}`), 60000);
	} catch (e) {
		log("FAIL", e?.constructor?.name, JSON.stringify(e?.message ?? String(e)), "reloading in 5s");
		setTimeout(() => location.reload(), 5000);
	}
})();
