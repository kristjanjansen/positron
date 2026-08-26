// §12 CATALOG SHIM player: one browser player that consumes BOTH non-hang MoQ
// catalog dialects through @moq/net, bridging the gap §7 identified:
//   - mediamtx 1.20.1 (drafts 16-19): track ".catalog" = draft-ietf-moq-msf-00
//     JSON, packaging "loc", video = raw AVCC access units (one frame per MoQ
//     group, avc3 in-band params), audio = raw Opus packets (one per group).
//   - IETF moq-pub / Cloudflare (draft-14): track ".catalog" = WARP moq-catalog
//     v1 JSON, packaging "cmaf", video = moof+mdat fMP4 fragments (group per
//     GOP), init segment in a separate track ("0.mp4").
// Measurement: burned-ms binary row (video g2g) + 2 kHz 500 ms-boundary audio
// ticks (aLat, A/V skew) — same rigs as §7-§10.
// Params: ?url=<moq server/relay> &ns=<namespace> &dur=90 &fp=1 (fetch
//   /fingerprint from page origin and pin it) &noaudio=1 &nomeasure=1
import { Connection, Path } from "@moq/net";

const P = new URLSearchParams(location.search);
const MOQ_URL = P.get("url") ?? "https://127.0.0.1:18892/moqmtx";
const NS = P.get("ns") ?? "stream";
const DURATION_S = Number(P.get("dur") ?? 90);
const USE_FP = P.get("fp") !== "0";
const NO_AUDIO = P.get("noaudio") === "1";
const NO_MEASURE = P.get("nomeasure") === "1";

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

const vsamples = [], asamples = [];
const stats = {
	decoded: 0, decodeErrs: 0, badRows: 0, wireFrames: 0, skippedGroups: 0,
	aDecoded: 0, aDecodeErrs: 0, aTicks: 0,
};
function pct(arr, p) {
	if (!arr.length) return null;
	const d = [...arr].sort((a, b) => a - b);
	return d[Math.min(d.length - 1, Math.floor(p * d.length))];
}
function summarize() {
	const vd = vsamples.map((s) => s.delta);
	const ad = asamples.map((s) => s.aLat);
	const sk = asamples.map((s) => s.skew);
	log("SUMMARY", JSON.stringify({
		video: { n: vd.length, p50: pct(vd, 0.5), p90: pct(vd, 0.9), p95: pct(vd, 0.95), p99: pct(vd, 0.99), min: pct(vd, 0), max: pct(vd, 1) },
		audio: { n: ad.length, aLat_p50: pct(ad, 0.5), aLat_p95: pct(ad, 0.95), skew_p50: pct(sk, 0.5), skew_p95: pct(sk, 0.95), skew_max: sk.length ? Math.max(...sk.map(Math.abs)) : null },
		...stats,
	}));
	const rows = [
		...vsamples.map((s) => JSON.stringify({ kind: "v", ...s })),
		...asamples.map((s) => JSON.stringify({ kind: "a", ...s })),
	];
	for (let i = 0; i < rows.length; i += 400)
		fetch("/log", { method: "POST", body: "JSONL " + rows.slice(i, i + 400).join("\nJSONL ") }).catch(() => {});
}

// ---------- shared helpers ----------

function tsToUs(ts, fallback) {
	if (ts && typeof ts === "object" && Number.isFinite(ts.value) && Number.isFinite(ts.scale))
		return Math.round((ts.value / ts.scale) * 1e6);
	return fallback;
}

// In-order group pump: recvGroup() delivers lowest-buffered-sequence first;
// hold out-of-order arrivals up to `window` groups, then jump (counted).
async function* orderedGroups(sub, windowSize) {
	const pending = new Map();
	let expect = null;
	for (;;) {
		const grp = await sub.recvGroup();
		if (!grp) return;
		pending.set(grp.sequence, grp);
		if (expect === null) expect = grp.sequence;
		while (pending.has(expect)) {
			const g = pending.get(expect);
			pending.delete(expect);
			expect++;
			yield g;
		}
		if (pending.size > windowSize) {
			const seqs = [...pending.keys()].sort((a, b) => a - b);
			stats.skippedGroups += seqs[0] - expect;
			log("GROUP_SKIP", `from=${expect}`, `to=${seqs[0]}`);
			expect = seqs[0];
			while (pending.has(expect)) {
				const g = pending.get(expect);
				pending.delete(expect);
				expect++;
				yield g;
			}
		}
	}
}

function avccToAnnexB(data) {
	// replace 4-byte length prefixes with start codes, in place on a copy
	const out = new Uint8Array(data.byteLength);
	out.set(data);
	let off = 0;
	let hasIdr = false;
	while (off + 4 <= out.byteLength) {
		const len = (out[off] << 24) | (out[off + 1] << 16) | (out[off + 2] << 8) | out[off + 3];
		if (len <= 0 || off + 4 + len > out.byteLength) break;
		const nalType = out[off + 4] & 0x1f;
		if (nalType === 5) hasIdr = true;
		out[off] = 0; out[off + 1] = 0; out[off + 2] = 0; out[off + 3] = 1;
		off += 4 + len;
	}
	return { annexb: out, key: hasIdr };
}

function avccHasIdr(data) {
	let off = 0;
	while (off + 4 <= data.byteLength) {
		const len = (data[off] << 24) | (data[off + 1] << 16) | (data[off + 2] << 8) | data[off + 3];
		if (len <= 0 || off + 4 + len > data.byteLength) break;
		if ((data[off + 4] & 0x1f) === 5) return true;
		off += 4 + len;
	}
	return false;
}

// minimal mp4 walkers for the CMAF branch
function findBox(data, path) {
	// path like ["moov","trak","mdia","minf","stbl","stsd"]; returns content Uint8Array
	let region = { buf: data, start: 0, end: data.byteLength };
	for (const name of path) {
		let found = null;
		let off = region.start;
		while (off + 8 <= region.end) {
			const size = (region.buf[off] << 24 >>> 0) + (region.buf[off + 1] << 16) + (region.buf[off + 2] << 8) + region.buf[off + 3];
			const fourcc = String.fromCharCode(region.buf[off + 4], region.buf[off + 5], region.buf[off + 6], region.buf[off + 7]);
			if (size < 8 || off + size > region.end) break;
			if (fourcc === name) { found = { start: off + 8, end: off + size }; break; }
			off += size;
		}
		if (!found) return null;
		region = { buf: region.buf, start: found.start, end: found.end };
	}
	return region.buf.subarray(region.start, region.end);
}

function extractAvcC(initSeg) {
	// pragmatic scan: find "avcC" fourcc, box length is the 4 bytes before it
	for (let i = 0; i + 4 <= initSeg.byteLength; i++) {
		if (initSeg[i] === 0x61 && initSeg[i + 1] === 0x76 && initSeg[i + 2] === 0x63 && initSeg[i + 3] === 0x43) { // 'avcC'
			const size = (initSeg[i - 4] << 24 >>> 0) + (initSeg[i - 3] << 16) + (initSeg[i - 2] << 8) + initSeg[i - 1];
			if (size >= 8 && initSeg[i + 4] === 0x01) // configurationVersion
				return initSeg.subarray(i + 4, i - 4 + size);
		}
	}
	return null;
}

function extractMdats(frag) {
	// a fragment payload may hold [moof][mdat] (possibly repeated)
	const out = [];
	let off = 0;
	while (off + 8 <= frag.byteLength) {
		const size = (frag[off] << 24 >>> 0) + (frag[off + 1] << 16) + (frag[off + 2] << 8) + frag[off + 3];
		const fourcc = String.fromCharCode(frag[off + 4], frag[off + 5], frag[off + 6], frag[off + 7]);
		if (size < 8 || off + size > frag.byteLength) break;
		if (fourcc === "mdat") out.push(frag.subarray(off + 8, off + size));
		off += size;
	}
	return out;
}

async function pickCodec(cands, description) {
	for (const codec of cands) {
		if (!codec) continue;
		try {
			const cfg = { codec, optimizeForLatency: true };
			if (description) cfg.description = description;
			const sup = await VideoDecoder.isConfigSupported(cfg);
			if (sup.supported) return codec;
		} catch { /* invalid codec string */ }
	}
	return null;
}

// ---------- video sink (shared) ----------

let firstFrameLogged = false;
function makeVideoDecoder() {
	return new VideoDecoder({
		output: (vf) => {
			const recvWall = performance.timeOrigin + performance.now();
			if (!firstFrameLogged) { firstFrameLogged = true; log("FIRST_FRAME", `${vf.codedWidth}x${vf.codedHeight}`); }
			wctx.drawImage(vf, 0, 0, 1280, 720);
			vf.close();
			stats.decoded++;
			if (NO_MEASURE) return;
			const dec = decodeRow();
			if (dec.ok) vsamples.push({ t: recvWall, burned: dec.ms, delta: recvWall - dec.ms });
			else stats.badRows++;
		},
		error: (e) => { stats.decodeErrs++; log("VDEC_ERR", JSON.stringify(String(e?.message ?? e))); },
	});
}

function recentVideoDeltaMedian() {
	const tail = vsamples.slice(-90).map((s) => s.delta);
	return pct(tail, 0.5);
}

// ---------- LOC branch (mediamtx msf-00) ----------

async function playLocVideo(bc, track, endAt) {
	const codec = await pickCodec([track.codec, "avc1.640028", "avc1.42001f"]); // annexb: no description
	log("VCODEC", `catalog=${track.codec}`, `using=${codec}`, "mode=annexb-inband");
	if (!codec) { log("FAIL no supported video codec"); return; }
	const dec = makeVideoDecoder();
	dec.configure({ codec, optimizeForLatency: true });
	const sub = bc.subscribe(track.name);
	log("VSUB", `track=${track.name}`);
	let n = 0;
	for await (const grp of orderedGroups(sub, 30)) {
		if (Date.now() > endAt) break;
		const fr = await grp.readFrame();
		grp.close?.();
		if (!fr) continue;
		stats.wireFrames++;
		const { annexb, key } = avccToAnnexB(fr.payload);
		if (n === 0 && !key) continue; // wait for first keyframe
		const ts = tsToUs(fr.timestamp, Math.round(n * 1e6 / 30));
		try {
			dec.decode(new EncodedVideoChunk({ type: key ? "key" : "delta", timestamp: ts, data: annexb }));
			n++;
			if (n === 1) log("FIRST_WIRE_FRAME", `key=${key}`, `bytes=${fr.payload.byteLength}`, `group=${grp.sequence}`, `tsUs=${ts}`);
		} catch (e) {
			stats.decodeErrs++;
			log("VDEC_THROW", JSON.stringify(String(e?.message ?? e)));
		}
	}
}

async function playLocAudio(bc, track, endAt) {
	const cfg = { codec: track.codec, sampleRate: track.samplerate || 48000, numberOfChannels: track.channels || 2 };
	if (track.initData) cfg.description = Uint8Array.from(atob(track.initData), (c) => c.charCodeAt(0));
	const sup = await AudioDecoder.isConfigSupported(cfg).catch((e) => ({ supported: false, e }));
	log("ACODEC", `catalog=${track.codec}`, `sr=${cfg.sampleRate}`, `ch=${cfg.numberOfChannels}`, `supported=${sup.supported}`);
	if (!sup.supported) return;
	// tick detection on decoded samples; timestamps NOT trusted (§10.2)
	const scratch = new Float32Array(4096);
	let lastTickWall = 0;
	const dec = new AudioDecoder({
		output: (ad) => {
			const wall = performance.timeOrigin + performance.now();
			stats.aDecoded++;
			if (!NO_MEASURE) {
				const nf = Math.min(ad.numberOfFrames, scratch.length);
				ad.copyTo(scratch.subarray(0, nf), { planeIndex: 0, format: "f32-planar" });
				for (let i = 0; i < nf; i++) {
					if (Math.abs(scratch[i]) > 0.35) {
						if (wall - lastTickWall > 300) {
							lastTickWall = wall;
							// tick true wall time = latest 500 ms boundary (latency < 450 ms assumed)
							let aLat = wall % 500;
							if (aLat > 450) aLat -= 500;
							const vmed = recentVideoDeltaMedian();
							stats.aTicks++;
							asamples.push({ t: wall, aLat, skew: vmed === null ? null : aLat - vmed });
						}
						break;
					}
				}
			}
			ad.close();
		},
		error: (e) => { stats.aDecodeErrs++; log("ADEC_ERR", JSON.stringify(String(e?.message ?? e))); },
	});
	dec.configure(cfg);
	const sub = bc.subscribe(track.name);
	log("ASUB", `track=${track.name}`);
	let n = 0;
	for await (const grp of orderedGroups(sub, 50)) {
		if (Date.now() > endAt) break;
		const fr = await grp.readFrame();
		grp.close?.();
		if (!fr) continue;
		const ts = tsToUs(fr.timestamp, Math.round(n * 20000));
		try {
			dec.decode(new EncodedAudioChunk({ type: "key", timestamp: ts, data: fr.payload }));
			n++;
		} catch (e) {
			stats.aDecodeErrs++;
		}
	}
}

// ---------- CMAF branch (WARP / moq-pub) ----------

async function playCmafVideo(bc, track, endAt) {
	// 1. init segment from the init track
	const initName = track.initTrack ?? "0.mp4";
	let initSeg = null;
	for (let attempt = 0; attempt < 10 && !initSeg; attempt++) {
		const isub = bc.subscribe(initName);
		const g = await Promise.race([isub.nextGroup(), new Promise((r) => setTimeout(() => r(null), 4000))]);
		if (g) {
			const fr = await g.readFrame();
			if (fr?.payload?.byteLength) initSeg = fr.payload;
		}
		isub.close?.();
		if (!initSeg) await new Promise((r) => setTimeout(r, 800));
	}
	if (!initSeg) { log("FAIL no init segment on", initName); return; }
	const avcC = extractAvcC(initSeg);
	log("INIT", `track=${initName}`, `bytes=${initSeg.byteLength}`, `avcC=${avcC ? avcC.byteLength : "none"}`);
	if (!avcC) { log("FAIL avcC not found in init segment"); return; }
	const codec = await pickCodec([track.codec, "avc1.64001E", "avc1.42001f"], avcC);
	log("VCODEC", `catalog=${track.codec}`, `using=${codec}`, "mode=avcc+description");
	if (!codec) { log("FAIL no supported video codec"); return; }
	const dec = makeVideoDecoder();
	dec.configure({ codec, optimizeForLatency: true, description: avcC });

	// 2. media track: group per GOP, one moof+mdat fragment per frame
	const sub = bc.subscribe(track.name);
	log("VSUB", `track=${track.name}`);
	let n = 0;
	for await (const grp of orderedGroups(sub, 8)) {
		let first = true;
		for (;;) {
			if (Date.now() > endAt) return;
			const fr = await Promise.race([grp.readFrame(), new Promise((r) => setTimeout(() => r("timeout"), 10000))]);
			if (fr === "timeout") { log("VIDEO_TIMEOUT in group"); return; }
			if (!fr) break; // end of group
			stats.wireFrames++;
			for (const mdat of extractMdats(fr.payload)) {
				const key = first || avccHasIdr(mdat);
				const ts = tsToUs(fr.timestamp, Math.round(n * 1e6 / 30));
				try {
					dec.decode(new EncodedVideoChunk({ type: key ? "key" : "delta", timestamp: ts, data: mdat }));
					n++;
					if (n === 1) log("FIRST_WIRE_FRAME", `key=${key}`, `bytes=${mdat.byteLength}`, `group=${grp.sequence}`);
				} catch (e) {
					stats.decodeErrs++;
					log("VDEC_THROW", JSON.stringify(String(e?.message ?? e)));
				}
				first = false;
			}
		}
	}
}

// ---------- main ----------

(async () => {
	try {
		log("START", `url=${MOQ_URL}`, `ns=${NS}`, `dur=${DURATION_S}`);
		const opts = { websocket: { enabled: false } };
		if (USE_FP) {
			try {
				const fp = (await (await fetch("/fingerprint")).text()).trim();
				if (/^[0-9a-f]{64}$/.test(fp)) {
					opts.webtransport = { serverCertificateHashes: [{ algorithm: "sha-256", value: fp }] };
					log("FINGERPRINT", fp.slice(0, 16) + "…");
				}
			} catch { log("FINGERPRINT none (page origin has no /fingerprint)"); }
		}
		const t0 = performance.now();
		const conn = await Connection.connect(new URL(MOQ_URL), opts);
		log("CONNECTED", `ms=${(performance.now() - t0).toFixed(0)}`, `class=${conn.constructor?.name}`, `version=${String(conn.version)}`);
		const bc = conn.consume(Path.from(NS));

		// catalog with retry (publisher may not be up yet; §7.1 trap 2)
		let catGroup = null, catSub = null;
		for (let attempt = 0; attempt < 30 && !catGroup; attempt++) {
			catSub = bc.subscribe(".catalog");
			const r = await Promise.race([
				catSub.nextGroup(),
				catSub.closed?.then?.((e) => ({ err: e ?? "closed" })) ?? new Promise(() => {}),
				new Promise((res) => setTimeout(() => res("timeout"), 5000)),
			]);
			if (r && r !== "timeout" && !r.err) { catGroup = r; break; }
			log("CATALOG_RETRY", `attempt=${attempt}`, JSON.stringify(String(r?.err?.message ?? r?.err ?? r)));
			catSub.close?.();
			await new Promise((res) => setTimeout(res, 1000));
		}
		if (!catGroup) { log("CATALOG_FAIL gave up"); return; }
		const catalog = await catGroup.readJson();
		log("CATALOG", JSON.stringify(catalog));

		const tracks = catalog?.tracks ?? [];
		// codec lives at track level in msf-00, under selectionParams in WARP moq-catalog v1
		const codecOf = (t) => t.codec ?? t.selectionParams?.codec ?? "";
		const vTrack = tracks.find((t) => /^(avc1|avc3|hev1|hvc1|av01|vp09|vp8)/.test(codecOf(t))) ?? null;
		const aTrack = tracks.find((t) => /^(opus|mp4a|flac|pcm)/.test(codecOf(t))) ?? null;
		if (vTrack && !vTrack.codec) vTrack.codec = codecOf(vTrack);
		if (aTrack && !aTrack.codec) aTrack.codec = codecOf(aTrack);
		// packaging is per-track in msf-00, but under commonTrackFields in WARP moq-catalog v1
		const packaging = vTrack?.packaging ?? catalog?.commonTrackFields?.packaging ?? tracks[0]?.packaging;
		log("SHIM_BRANCH", `packaging=${packaging}`, `video=${vTrack?.name}/${vTrack?.codec}`, `audio=${aTrack?.name}/${aTrack?.codec}`);
		if (!vTrack) { log("FAIL no video track in catalog"); return; }

		const endAt = Date.now() + DURATION_S * 1000;
		const iv = setInterval(() => {
			log("STATS", JSON.stringify({ ...stats, vsamples: vsamples.length, aticks: asamples.length, vqueue: undefined }));
			if (Date.now() > endAt + 5000) clearInterval(iv);
		}, 10000);

		const jobs = [];
		if (packaging === "cmaf") {
			jobs.push(playCmafVideo(bc, vTrack, endAt));
			// CMAF audio (AAC) intentionally skipped: Chromium AAC support varies; video is the target
		} else {
			jobs.push(playLocVideo(bc, vTrack, endAt));
			if (aTrack && !NO_AUDIO) jobs.push(playLocAudio(bc, aTrack, endAt));
		}
		await Promise.race([
			Promise.all(jobs),
			new Promise((r) => setTimeout(r, DURATION_S * 1000 + 20000)),
		]);
		summarize();
		log("DONE");
	} catch (e) {
		log("FAIL", e?.constructor?.name, JSON.stringify(e?.message ?? String(e)));
		if (e?.errors) for (const sub of e.errors) log("FAIL_SUB", sub?.constructor?.name, JSON.stringify(sub?.message ?? String(sub)), `source=${sub?.source ?? ""}`);
		summarize();
	}
})();
