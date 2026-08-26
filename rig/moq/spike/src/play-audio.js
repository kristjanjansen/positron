// AUDIO SPIKE measurement player (RUNBOOK §10): subscribes elektron-audio-test,
// decodes BOTH tracks (VideoDecoder -> canvas + burned-row read; AudioDecoder ->
// WebAudio jitter-buffered playback), and measures:
//   aLat      = audio "glass-to-glass" analog: decode-output wall - tick wall time
//   aPlayLat  = tick wall -> the moment the tick emerges from the WebAudio graph
//               (scheduled ctx time mapped back to wall; excludes device output latency,
//               reported separately as ctx.outputLatency)
//   skew      = aLat - rolling-median video g2g (positive = audio behind video)
//   underruns = late/dropped audio chunks + total gap ms
// One JSONL row per detected tick -> POST /jsonl on the local server.
import { Connection, Path } from "@moq/net";
import * as Container from "@moq/hang/container";

const params = new URLSearchParams(location.search);
const NS = params.get("ns") ?? "elektron-audio-test";
const RELAY = params.get("relay") ?? "https://draft-14.cloudflare.mediaoverquic.com";
const RUN_S = Number(params.get("dur") ?? 90);

const NBLOCKS = 56, BLOCK_W = 20, ROW_X = 40, ROW_Y = 100, ROW_H = 80;
const SR = 48000;
const TICK_EVERY = 500, TICK_THRESH = 0.35, REFRACT_MS = 300;
const WARMUP_MS = 3000; // ignore join catch-up burst

function log(...a) {
	const line = `PLAY ${new Date().toISOString()} ${a.join(" ")}`;
	console.log(line);
	fetch("/log", { method: "POST", body: line }).catch(() => {});
}
function jsonl(obj) {
	fetch("/jsonl", { method: "POST", body: JSON.stringify(obj) }).catch(() => {});
}
window.addEventListener("unhandledrejection", (e) =>
	log("UNHANDLED", e.reason?.constructor?.name, JSON.stringify(e.reason?.message ?? String(e.reason))),
);
window.addEventListener("error", (e) => log("WINDOW_ERR", JSON.stringify(String(e.message))));

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

// rolling video g2g deltas (for the A/V skew reference)
const vDeltas = [];
function vMedian() {
	if (!vDeltas.length) return undefined;
	const s = [...vDeltas].sort((a, b) => a - b);
	return s[Math.floor(s.length / 2)];
}

const wallNow = () => performance.timeOrigin + performance.now();

(async () => {
	const startWall = wallNow();
	log("START", `relay=${RELAY}`, `ns=${NS}`, `dur=${RUN_S}s`);
	const conn = await Connection.connect(new URL(RELAY), { websocket: { enabled: false } });
	log("CONNECTED", `version=${conn.version}`);
	const bc = conn.consume(Path.from(NS));

	// --- catalog with retry (§7.1 trap 2) ---
	let catGroup;
	for (let attempt = 0; attempt < 30; attempt++) {
		const catSub = bc.subscribe("catalog.json");
		catGroup = await Promise.race([
			catSub.nextGroup(),
			catSub.closed.then((e) => ({ err: e })),
			new Promise((r) => setTimeout(() => r("timeout"), 5000)),
		]);
		if (catGroup && catGroup !== "timeout" && !catGroup.err) break;
		catSub.close?.();
		catGroup = undefined;
		await new Promise((r) => setTimeout(r, 1000));
	}
	if (!catGroup) { log("FAIL no catalog"); return; }
	const catalog = await catGroup.readJson();
	log("CATALOG", JSON.stringify(catalog));
	const vName = Object.keys(catalog?.video?.renditions ?? {})[0];
	const aName = Object.keys(catalog?.audio?.renditions ?? {})[0];
	if (!aName) { log("FAIL catalog has no audio"); return; }
	const vCfg = catalog.video.renditions[vName];
	const aCfg = catalog.audio.renditions[aName];

	// --- video decode -> canvas -> burned row ---
	let vDecoded = 0;
	const vDec = new VideoDecoder({
		output: (vf) => {
			const recvWall = wallNow();
			wctx.drawImage(vf, 0, 0, 1280, 720);
			vf.close();
			vDecoded++;
			const dec = decodeRow();
			if (dec.ok && wallNow() - startWall > WARMUP_MS) {
				vDeltas.push(recvWall - dec.ms);
				if (vDeltas.length > 300) vDeltas.shift();
			}
		},
		error: (e) => log("VDEC_ERR", JSON.stringify(String(e?.message ?? e))),
	});
	vDec.configure({ codec: vCfg.codec, optimizeForLatency: true });

	// --- audio decode -> measurement + WebAudio playback ---
	const audioCtx = new AudioContext({ sampleRate: SR, latencyHint: "interactive" });
	await audioCtx.resume().catch(() => {});
	log("AUDIOCTX", `state=${audioCtx.state}`, `rate=${audioCtx.sampleRate}`,
		`baseLatency=${(audioCtx.baseLatency * 1000).toFixed(1)}ms`,
		`outputLatency=${((audioCtx.outputLatency ?? 0) * 1000).toFixed(1)}ms`);

	const adcfg = { codec: aCfg.codec, sampleRate: aCfg.sampleRate, numberOfChannels: aCfg.numberOfChannels };
	if (aCfg.description) adcfg.description = Uint8Array.from(atob(aCfg.description), (c) => c.charCodeAt(0));
	const asup = await AudioDecoder.isConfigSupported(adcfg).catch((e) => ({ supported: false, err: e }));
	log("ADEC_SUPPORT", JSON.stringify(!!asup.supported), aCfg.codec);
	if (!asup.supported) { log("FAIL AudioDecoder unsupported"); return; }

	// jitter buffer: play chunk at wall time (mediaStart + dLive + CUSHION_MS)
	const CUSHION_MS = Number(params.get("cushion") ?? 60);
	let dLiveWin = []; // rolling min of (recvWall - mediaEndMs)
	let aDecoded = 0, aDecErrors = 0, underruns = 0, lateDropMs = 0, ticks = 0;
	let lastTickMediaMs = -1e12;
	const aLats = [], playLats = [], skews = [];

	// Chromium's AudioDecoder regenerates output timestamps by accumulating
	// sample counts from the first chunk — a content skip at join becomes a
	// permanent timestamp offset. Opus 20ms-in/20ms-out is 1:1, so map encoded
	// chunk timestamps through a FIFO and use THOSE as media time.
	const inTsQ = [];
	let tsFixLogged = false;
	const aDec = new AudioDecoder({
		output: (ad) => {
			const recvWall = wallNow();
			aDecoded++;
			const encTs = inTsQ.shift();
			if (!tsFixLogged && encTs !== undefined && aDecoded > 100) {
				tsFixLogged = true;
				log("ADEC_TS_OFFSET", `decoderTs-encTs=${((ad.timestamp - encTs) / 1000).toFixed(1)}ms`);
			}
			const mediaStartMs = (encTs ?? ad.timestamp) / 1000;
			const durMs = (ad.numberOfFrames / ad.sampleRate) * 1000;
			// live-edge estimate
			dLiveWin.push(recvWall - (mediaStartMs + durMs));
			if (dLiveWin.length > 250) dLiveWin.shift();
			const dLive = Math.min(...dLiveWin);

			// pull samples (mono is enough — channels are identical)
			const pcm = new Float32Array(ad.numberOfFrames);
			try {
				ad.copyTo(pcm, { planeIndex: 0, format: "f32-planar" });
			} catch {
				// fallback: interleaved f32
				const inter = new Float32Array(ad.numberOfFrames * ad.numberOfChannels);
				ad.copyTo(inter, { planeIndex: 0 });
				for (let i = 0; i < ad.numberOfFrames; i++) pcm[i] = inter[i * ad.numberOfChannels];
			}

			// schedule playback
			const nowW = wallNow();
			const playWallStart = mediaStartMs + dLive + CUSHION_MS;
			let when = audioCtx.currentTime + (playWallStart - nowW) / 1000;
			const warm = nowW - startWall > WARMUP_MS;
			if (when < audioCtx.currentTime) {
				if (warm) { underruns++; lateDropMs += (audioCtx.currentTime - when) * 1000; }
				when = audioCtx.currentTime + 0.003;
			}
			const buf = audioCtx.createBuffer(1, ad.numberOfFrames, ad.sampleRate);
			buf.copyToChannel(pcm, 0);
			const src = audioCtx.createBufferSource();
			src.buffer = buf;
			src.connect(audioCtx.destination);
			src.start(when);

			// tick detection
			for (let i = 0; i < pcm.length; i++) {
				if (Math.abs(pcm[i]) > TICK_THRESH) {
					const tickMediaMs = mediaStartMs + (i / ad.sampleRate) * 1000;
					if (tickMediaMs - lastTickMediaMs < REFRACT_MS) break;
					lastTickMediaMs = tickMediaMs;
					const tickWall = Math.round(tickMediaMs / TICK_EVERY) * TICK_EVERY;
					const aLat = recvWall - tickWall;
					const playLat = (nowW + (when - audioCtx.currentTime) * 1000 + (i / ad.sampleRate) * 1000) - tickWall;
					const vm = vMedian();
					const skew = vm !== undefined ? aLat - vm : undefined;
					if (warm) {
						ticks++;
						aLats.push(aLat); playLats.push(playLat);
						if (skew !== undefined) skews.push(skew);
						jsonl({ t: new Date().toISOString(), tickWall, aLat: r1(aLat), playLat: r1(playLat), vG2g: vm !== undefined ? r1(vm) : null, skew: skew !== undefined ? r1(skew) : null, underruns, lateDropMs: r1(lateDropMs), dLive: r1(dLive) });
					}
					break;
				}
			}
			ad.close();
		},
		error: (e) => { aDecErrors++; log("ADEC_ERR", JSON.stringify(String(e?.message ?? e))); },
	});
	aDec.configure(adcfg);

	// --- feed both tracks ---
	const vSub = bc.subscribe(vName);
	const vCons = new Container.Consumer(vSub, { format: new Container.Legacy.Format(), latency: 0 });
	const aSub = bc.subscribe(aName);
	const aCons = new Container.Consumer(aSub, { format: new Container.Legacy.Format(), latency: 0 });

	(async () => {
		for (;;) {
			const r = await vCons.next();
			if (r === undefined) { log("VTRACK_CLOSED"); return; }
			if (!r.frame) continue;
			vDec.decode(new EncodedVideoChunk({
				type: r.frame.keyframe ? "key" : "delta",
				timestamp: r.frame.timestamp, data: r.frame.payload,
			}));
		}
	})().catch((e) => log("VLOOP_ERR", JSON.stringify(String(e?.message ?? e))));

	(async () => {
		for (;;) {
			const r = await aCons.next();
			if (r === undefined) { log("ATRACK_CLOSED"); return; }
			if (!r.frame) continue;
			inTsQ.push(r.frame.timestamp);
			aDec.decode(new EncodedAudioChunk({
				type: "key", timestamp: r.frame.timestamp, data: r.frame.payload,
			}));
		}
	})().catch((e) => log("ALOOP_ERR", JSON.stringify(String(e?.message ?? e))));

	const r1 = (x) => Math.round(x * 10) / 10;
	const q = (arr, p) => {
		if (!arr.length) return null;
		const s = [...arr].sort((a, b) => a - b);
		return r1(s[Math.min(s.length - 1, Math.floor(p * s.length))]);
	};
	const statsLine = () => [
		`ticks=${ticks}`, `aDecoded=${aDecoded}`, `vDecoded=${vDecoded}`,
		`aLat_p50=${q(aLats, 0.5)}`, `aLat_p95=${q(aLats, 0.95)}`,
		`playLat_p50=${q(playLats, 0.5)}`, `playLat_p95=${q(playLats, 0.95)}`,
		`skew_p50=${q(skews, 0.5)}`, `skew_max=${skews.length ? r1(Math.max(...skews.map(Math.abs))) : null}`,
		`vG2g_p50=${q(vDeltas, 0.5)}`,
		`underruns=${underruns}`, `lateDropMs=${r1(lateDropMs)}`, `aDecErrors=${aDecErrors}`,
		`ctxOutLat=${((audioCtx.outputLatency ?? 0) * 1000).toFixed(1)}`,
	].join(" ");
	setInterval(() => log("STATS", statsLine()), 10000);
	setTimeout(() => {
		log("FINAL", statsLine());
		jsonl({ final: true, ticks, aDecoded, vDecoded, aLat_p50: q(aLats, 0.5), aLat_p95: q(aLats, 0.95), playLat_p50: q(playLats, 0.5), playLat_p95: q(playLats, 0.95), skew_p50: q(skews, 0.5), skew_p95: q(skews, 0.95), skew_max: skews.length ? r1(Math.max(...skews.map(Math.abs))) : null, vG2g_p50: q(vDeltas, 0.5), underruns, lateDropMs: r1(lateDropMs), aDecErrors });
	}, RUN_S * 1000);
})().catch((e) => log("FAIL", e?.constructor?.name, JSON.stringify(String(e?.message ?? e))));
