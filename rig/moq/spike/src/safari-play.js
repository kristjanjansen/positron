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
report.aDecoded = 0;
report.aDecErrors = 0;
report.aUnderruns = 0;

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
			sid: window.__sid, // per-page-load id set by index.html → BeaconStore row key
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
			audioCodec: report.audioCodec,
			audioState: report.audioState,
			aDecoded: report.aDecoded,
			aLat_p50: report.aLat_p50,
			avSkew_p50: report.avSkew_p50,
			aUnderruns: report.aUnderruns,
			aDecErrors: report.aDecErrors,
			audioLevelDb: report.audioLevelDb,
			silentSeconds: report.silentSeconds,
			pcmDb: report.pcmDb,
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

// rolling audio measurement windows (tick-based; see RUNBOOK §10)
const aLats = [], aSkews = [];
// silence detection (RUNBOOK §10.7): per-session hook installed by the audio
// branch; called once per second from the stats interval. Sets audioState to
// sounding | silent | suspended (+ audioLevelDb / pcmDb / silentSeconds).
let audioTick = null;
const NOISE_FLOOR_DB = -50;
const toDb = (rms) => Math.round(20 * Math.log10(Math.max(rms, 1e-7)));
function aQuant(arr, p) {
	if (!arr.length) return undefined;
	const s = [...arr].sort((a, b) => a - b);
	return s[Math.min(s.length - 1, Math.floor(p * s.length))];
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
		if (report.audioCodec) {
			const al = aQuant(aLats, 0.5), sk = aQuant(aSkews, 0.5);
			report.aLat_p50 = al !== undefined ? Math.round(al) : undefined;
			report.avSkew_p50 = sk !== undefined ? Math.round(sk) : undefined;
			setStatus("st-audio",
				`AUDIO ${report.audioCodec}${report.audioState === "suspended" ? " (ctx suspended — no speaker out)" : ""}: `
				+ `${report.aDecoded} chunks decoded · lat ~${al !== undefined ? Math.round(al) : "?"} ms `
				+ `· A/V skew ${sk !== undefined ? (sk > 0 ? "+" : "") + Math.round(sk) : "?"} ms `
				+ `· ${report.aUnderruns} underruns · ${report.aDecErrors} errors`, "ok");
		}
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

	// --- AUDIO (RUNBOOK §10): if the catalog carries an audio track, decode and
	// play it through WebAudio. Measurement: publisher audio timestamps are
	// wall-anchored µs and a loud 6 ms tick fires at every 500 ms wall boundary,
	// so rounding a detected tick's media time to the nearest 500 ms recovers
	// the publisher wall time exactly (same one-clock trick as the burned video
	// row). aLat carries the device-clock offset on phones, but the A/V skew
	// (aLat − video g2g) cancels it — skew is exact on any device.
	let audioStop = () => {};
	const aName = Object.keys(catalog?.audio?.renditions ?? {})[0];
	if (aName && typeof AudioDecoder !== "function") {
		report.audioCodec = "no AudioDecoder API";
		beacon("audio-unsupported", { audioCodec: "none" });
	} else if (aName) {
		try {
			const aCfg = catalog.audio.renditions[aName];
			const adcfg = { codec: aCfg.codec, sampleRate: aCfg.sampleRate, numberOfChannels: aCfg.numberOfChannels };
			if (aCfg.description) adcfg.description = Uint8Array.from(atob(aCfg.description), (c) => c.charCodeAt(0));
			const asup = await AudioDecoder.isConfigSupported(adcfg).catch(() => ({ supported: false }));
			if (!asup.supported) {
				report.audioCodec = aCfg.codec + " UNSUPPORTED";
				setStatus("st-audio", `AUDIO: catalog offers ${aCfg.codec} but AudioDecoder says unsupported`, "fail");
				beacon("audio-unsupported", { audioCodec: aCfg.codec });
			} else {
				// AudioContext ideally pre-created inside the tap gesture (index.html).
				const audioCtx = window.__audioCtx ?? new AudioContext({ sampleRate: 48000, latencyHint: "interactive" });
				window.__audioCtx = audioCtx;
				audioCtx.resume().catch(() => {});
				report.audioCodec = aCfg.codec;
				report.audioState = audioCtx.state;
				audioCtx.onstatechange = () => { report.audioState = audioCtx.state; };
				log("AUDIO", `codec=${aCfg.codec}`, `ctx=${audioCtx.state}`);
				beacon("audio-start", { audioCodec: aCfg.codec, audioState: audioCtx.state });

				const CUSHION_MS = 60, TICK_EVERY = 500, TICK_THRESH = 0.35, REFRACT_MS = 300;
				const dLiveWin = [];
				let lastTickMediaMs = -1e12;
				const aStart = performance.now();
				const wallNow = () => performance.timeOrigin + performance.now();
				// AudioDecoder output timestamps are regenerated by the browser
				// (sample-count accumulation + Opus pre-skip shift) — carry the
				// ENCODED chunk timestamps through a FIFO instead (Opus 20 ms is
				// 1-in-1-out, verified: without this, a content skip at join
				// showed up as a permanent +500 ms phantom on aLat).
				const inTsQ = [];
				const aDec = new AudioDecoder({
					output: (ad) => {
						const recvWall = wallNow();
						report.aDecoded++;
						const encTs = inTsQ.shift();
						const mediaStartMs = (encTs ?? ad.timestamp) / 1000;
						const durMs = (ad.numberOfFrames / ad.sampleRate) * 1000;
						dLiveWin.push(recvWall - (mediaStartMs + durMs));
						if (dLiveWin.length > 250) dLiveWin.shift();
						const dLive = Math.min(...dLiveWin);
						const pcm = new Float32Array(ad.numberOfFrames);
						try {
							ad.copyTo(pcm, { planeIndex: 0, format: "f32-planar" });
						} catch {
							const inter = new Float32Array(ad.numberOfFrames * ad.numberOfChannels);
							ad.copyTo(inter, { planeIndex: 0 });
							for (let i = 0; i < ad.numberOfFrames; i++) pcm[i] = inter[i * ad.numberOfChannels];
						}
						const warm = performance.now() - aStart > 3000; // skip join catch-up burst
						// jitter buffer: play at wall (mediaStart + live-edge delta + cushion)
						let when = audioCtx.currentTime + (mediaStartMs + dLive + CUSHION_MS - wallNow()) / 1000;
						if (when < audioCtx.currentTime) {
							if (warm) report.aUnderruns++;
							when = audioCtx.currentTime + 0.003;
						}
						if (audioCtx.state === "running") {
							const buf = audioCtx.createBuffer(1, ad.numberOfFrames, ad.sampleRate);
							buf.copyToChannel(pcm, 0);
							const src = audioCtx.createBufferSource();
							src.buffer = buf;
							src.connect(audioCtx.destination);
							src.start(when);
						}
						for (let i = 0; i < pcm.length; i++) {
							if (Math.abs(pcm[i]) > TICK_THRESH) {
								const tickMediaMs = mediaStartMs + (i / ad.sampleRate) * 1000;
								if (tickMediaMs - lastTickMediaMs < REFRACT_MS) break;
								lastTickMediaMs = tickMediaMs;
								const tickWall = Math.round(tickMediaMs / TICK_EVERY) * TICK_EVERY;
								if (warm) {
									const aLat = recvWall - tickWall;
									aLats.push(aLat);
									if (aLats.length > 300) aLats.shift();
									const vm = quant(0.5); // rolling video g2g median
									if (vm !== undefined) {
										aSkews.push(aLat - vm);
										if (aSkews.length > 300) aSkews.shift();
									}
								}
								break;
							}
						}
						ad.close();
					},
					error: (e) => { report.aDecErrors++; showError(e); },
				});
				aDec.configure(adcfg);
				const aSub = bc.subscribe(aName);
				const aCons = new Container.Consumer(aSub, { format: new Container.Legacy.Format(), latency: 0 });
				let aDead = false;
				audioStop = () => {
					aDead = true;
					try { aCons.close(); } catch { /* already closed */ }
					try { aDec.close(); } catch { /* already closed */ }
				};
				(async () => {
					while (!aDead) {
						const r = await aCons.next();
						if (r === undefined) return;
						if (!r.frame) continue;
						inTsQ.push(r.frame.timestamp);
						aDec.decode(new EncodedAudioChunk({ type: "key", timestamp: r.frame.timestamp, data: r.frame.payload }));
					}
				})().catch((e) => { if (!aDead) showError(e); });
			}
		} catch (e) {
			showError(e);
		}
	}

	// --- video frames through hang Container.Consumer ---
	const vSub = bc.subscribe(name);
	const consumer = new Container.Consumer(vSub, { format: new Container.Legacy.Format(), latency: 0 });
	try {
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
	} finally {
		audioStop();
	}
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
