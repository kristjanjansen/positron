// Media-layer spike PLAYER: CF draft-14 relay -> @moq/net subscribe ->
// hang catalog + legacy container -> WebCodecs decode -> canvas -> burned-row read.
// Modes: default = hang player (catalog.json -> video rendition).
//        ?track=NAME&raw=1 = subscribe an arbitrary track and hexdump first frames
//        (for probing what an IETF moq-pub broadcast actually carries).
import { Connection, Path } from "@moq/net";
import * as Container from "@moq/hang/container";

const params = new URLSearchParams(location.search);
const NS = params.get("ns") ?? "moq-media-x1";
const RELAY = params.get("relay") ?? "https://draft-14.cloudflare.mediaoverquic.com";
const RAW_TRACK = params.get("track");
const DURATION_S = Number(params.get("dur") ?? 75);

const NBLOCKS = 56, BLOCK_W = 20, ROW_X = 40, ROW_Y = 100, ROW_H = 80;

function log(...a) {
	const line = `PLAY ${(performance.now() / 1000).toFixed(3)} ${a.join(" ")}`;
	console.log(line);
	fetch("/log", { method: "POST", body: line }).catch(() => {});
}
window.addEventListener("unhandledrejection", (e) =>
	log("UNHANDLED", e.reason?.constructor?.name, JSON.stringify(e.reason?.message ?? String(e.reason))),
);

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
	if (mx - mn < 60) return { ok: false, why: "low-contrast" };
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
	if (expect !== ck) return { ok: false, why: "checksum" };
	return { ok: true, ms };
}

const samples = [];
function summarize() {
	if (!samples.length) { log("SUMMARY none"); return; }
	const d = samples.map((s) => s.delta).sort((a, b) => a - b);
	const q = (p) => d[Math.min(d.length - 1, Math.floor(p * d.length))];
	log("SUMMARY", JSON.stringify({
		n: d.length, p50: q(0.5), p90: q(0.9), p95: q(0.95), min: d[0], max: d[d.length - 1],
	}));
	fetch("/log", { method: "POST", body: "JSONL " + samples.map((s) => JSON.stringify(s)).join("\nJSONL ") }).catch(() => {});
}

(async () => {
	try {
		log("START", `relay=${RELAY}`, `ns=${NS}`, RAW_TRACK ? `rawtrack=${RAW_TRACK}` : "mode=hang");
		const t0 = performance.now();
		const conn = await Connection.connect(new URL(RELAY), { websocket: { enabled: false } });
		log("CONNECTED", `ms=${(performance.now() - t0).toFixed(0)}`, `version=${conn.version}`);
		const bc = conn.consume(Path.from(NS));

		if (RAW_TRACK) {
			// probe mode: dump whatever this track carries
			const sub = bc.subscribe(RAW_TRACK);
			log("RAW_SUBSCRIBE_SENT", RAW_TRACK);
			sub.closed.then((e) => log("RAW_TRACK_CLOSED", JSON.stringify(String(e?.message ?? e))));
			for (let g = 0; g < 3; g++) {
				const grp = await Promise.race([sub.nextGroup(), new Promise((r) => setTimeout(() => r("timeout"), 10000))]);
				if (grp === "timeout") { log("RAW_TIMEOUT waiting for group"); break; }
				if (!grp) { log("RAW_NO_GROUP (track closed)"); break; }
				log("RAW_GROUP", `seq=${grp.sequence}`);
				for (let f = 0; f < 4; f++) {
					const fr = await Promise.race([grp.readFrame(), new Promise((r) => setTimeout(() => r("timeout"), 5000))]);
					if (fr === "timeout" || !fr) break;
					const p = fr.payload;
					const hex = [...p.slice(0, 48)].map((b) => b.toString(16).padStart(2, "0")).join("");
					const txt = new TextDecoder("utf-8", { fatal: false }).decode(p.slice(0, 200)).replace(/[^\x20-\x7e]/g, ".");
					log("RAW_FRAME", `len=${p.byteLength}`, `ts=${JSON.stringify(fr.timestamp)}`, `hex=${hex}`, `txt=${JSON.stringify(txt)}`);
				}
			}
			log("RAW_DONE");
			return;
		}

		// --- hang path: catalog first ---
		// CF rejects a SUBSCRIBE for a not-yet-announced broadcast with code=4 "Track not
		// found" instead of holding it, so retry until the publisher shows up.
		let catGroup;
		for (let attempt = 0; attempt < 20; attempt++) {
			const catSub = bc.subscribe("catalog.json");
			if (attempt === 0) log("CATALOG_SUBSCRIBE_SENT");
			catGroup = await Promise.race([
				catSub.nextGroup(),
				catSub.closed.then((e) => ({ err: e })),
				new Promise((r) => setTimeout(() => r("timeout"), 5000)),
			]);
			if (catGroup && catGroup !== "timeout" && !catGroup.err) break;
			if (catGroup?.err) log("CATALOG_RETRY", `attempt=${attempt}`, JSON.stringify(String(catGroup.err?.message ?? catGroup.err)));
			else log("CATALOG_RETRY", `attempt=${attempt}`, String(catGroup));
			catSub.close?.();
			catGroup = undefined;
			await new Promise((r) => setTimeout(r, 1000));
		}
		if (!catGroup) { log("CATALOG_FAIL gave up"); return; }
		const catalog = await catGroup.readJson();
		log("CATALOG", JSON.stringify(catalog));
		const rends = catalog?.video?.renditions ?? {};
		const name = Object.keys(rends)[0];
		if (!name) { log("NO_VIDEO_RENDITION"); return; }
		const cfg = rends[name];
		log("RENDITION", name, `codec=${cfg.codec}`, `container=${cfg.container?.kind}`);

		// --- video track through hang Container.Consumer ---
		const vSub = bc.subscribe(name);
		const consumer = new Container.Consumer(vSub, { format: new Container.Legacy.Format(), latency: 0 });

		let decoded = 0, decodeErrs = 0, badRows = 0, firstWH = null;
		const decoder = new VideoDecoder({
			output: (vf) => {
				const recvWall = performance.timeOrigin + performance.now();
				if (!firstWH) { firstWH = `${vf.codedWidth}x${vf.codedHeight}`; log("FIRST_FRAME", firstWH); }
				wctx.drawImage(vf, 0, 0, 1280, 720);
				vf.close();
				decoded++;
				const dec = decodeRow();
				if (dec.ok) {
					samples.push({ t: recvWall, burned: dec.ms, delta: recvWall - dec.ms });
				} else badRows++;
			},
			error: (e) => { decodeErrs++; log("DEC_ERR", JSON.stringify(String(e?.message ?? e))); },
		});
		const dcfg = { codec: cfg.codec, optimizeForLatency: true };
		if (cfg.description) dcfg.description = Uint8Array.from(atob(cfg.description), (c) => c.charCodeAt(0));
		const sup = await VideoDecoder.isConfigSupported(dcfg);
		log("DEC_SUPPORT", JSON.stringify(sup.supported));
		decoder.configure(dcfg);

		const endAt = Date.now() + DURATION_S * 1000;
		setInterval(() => log("STATS", `decoded=${decoded}`, `samples=${samples.length}`, `badRows=${badRows}`, `decErrs=${decodeErrs}`, `queue=${decoder.decodeQueueSize}`), 10000);
		let gotFrames = 0;
		while (Date.now() < endAt) {
			const r = await Promise.race([consumer.next(), new Promise((res) => setTimeout(() => res("timeout"), 15000))]);
			if (r === "timeout") { log("VIDEO_TIMEOUT no frame in 15s"); break; }
			if (r === undefined) { log("VIDEO_CLOSED"); break; }
			if (!r.frame) continue; // end of group
			gotFrames++;
			if (gotFrames === 1) log("FIRST_WIRE_FRAME", `key=${r.frame.keyframe}`, `bytes=${r.frame.payload.byteLength}`, `group=${r.group}`);
			decoder.decode(new EncodedVideoChunk({
				type: r.frame.keyframe ? "key" : "delta",
				timestamp: r.frame.timestamp,
				data: r.frame.payload,
			}));
		}
		summarize();
		log("DONE", `wireFrames=${gotFrames}`, `decoded=${decoded}`);
	} catch (e) {
		log("FAIL", e?.constructor?.name, JSON.stringify(e?.message ?? String(e)));
		summarize();
	}
})();
