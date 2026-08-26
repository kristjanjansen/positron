// MULTI-PUBLISHER grid: viewer -> publisher FLIP page (RUNBOOK §13, "spotlight
// from the crowd" on MoQ). Starts as a pure viewer: subscribes to ALL roster
// publishers (decodes everything, posts nothing per-frame). Polls /cmd?id= every
// 100 ms; on {action:"publish"} it starts publishing its own canvas on its own
// namespace over the SAME MoQ connection, then registers in the roster.
// Timestamps (same host clock as driver+probes) as {k:"flip",id,ev,t} rows.
// Params: ?id=f1 &name=flips &relay=
import { Connection, Path, Broadcast } from "@moq/net";
import * as Container from "@moq/hang/container";

const params = new URLSearchParams(location.search);
const ID = params.get("id") ?? "f0";
const NS = `elektron-mgrid-${ID}`;
const NAME = params.get("name") ?? "flips";
const RELAY = params.get("relay") ?? "https://draft-14.cloudflare.mediaoverquic.com";
const CODEC = "avc1.42001f", W = 320, H = 180, FPS = 15, BITRATE = 300000, GOP = FPS;
const NBLOCKS = 40, BLOCK_W = 8, ROW_Y = 120, ROW_H = 48;

function log(...a) {
	const line = `MGFLIP ${ID} ${new Date().toISOString()} ${a.join(" ")}`;
	console.log(line);
	fetch("/log", { method: "POST", body: line }).catch(() => {});
}
window.addEventListener("unhandledrejection", (e) =>
	log("UNHANDLED", JSON.stringify(String(e.reason?.message ?? e.reason))));
window.addEventListener("error", (e) => log("WINDOW_ERR", JSON.stringify(String(e.message))));

let buf = [];
function row(o) { buf.push(JSON.stringify(o)); }
setInterval(() => {
	if (!buf.length) return;
	const body = buf.join("\n");
	buf = [];
	fetch(`/jsonl/${NAME}`, { method: "POST", body }).catch(() => {});
}, 500);
const wall = () => Math.round(performance.timeOrigin + performance.now());
const flipEv = (ev) => { const t = wall(); row({ k: "flip", id: ID, ev, t }); log("FLIP_" + ev.toUpperCase(), `t=${t}`); };

const report = (window.__report = { viewing: 0, decoded: 0, derr: 0, publishing: false });
const pubs = new Map();

// ---- viewer side (lean clone of mgrid-probe, no row decode, no per-frame rows) ----
async function runOne(st, conn) {
	const bc = conn.consume(Path.from(st.ns));
	let catGroup;
	for (let att = 0; att < 60 && st.active; att++) {
		const catSub = bc.subscribe("catalog.json");
		catGroup = await Promise.race([
			catSub.nextGroup(),
			catSub.closed.then((e) => ({ err: e ?? "closed" })),
			new Promise((r) => setTimeout(() => r("timeout"), 5000)),
		]);
		if (catGroup && catGroup !== "timeout" && !catGroup.err) break;
		catSub.close?.();
		catGroup = undefined;
		await new Promise((r) => setTimeout(r, 1000));
	}
	if (!catGroup) throw new Error("no catalog");
	const catalog = await catGroup.readJson();
	const cfg = catalog?.video?.renditions?.video;
	if (!cfg) throw new Error("no rendition");
	const decoder = new VideoDecoder({
		output: (vf) => {
			st.pctx.drawImage(vf, 0, 0, W, H);
			vf.close();
			st.decoded++; report.decoded++;
			if (!st.first) { st.first = true; report.viewing++; }
		},
		error: () => { report.derr++; },
	});
	decoder.configure({ codec: cfg.codec, optimizeForLatency: true });
	const vSub = bc.subscribe("video");
	const consumer = new Container.Consumer(vSub, { format: new Container.Legacy.Format(), latency: 0 });
	try {
		for (;;) {
			if (!st.active) return;
			const r = await Promise.race([consumer.next(), new Promise((res) => setTimeout(() => res("timeout"), 10000))]);
			if (r === "timeout") throw new Error("stall");
			if (r === undefined) throw new Error("closed");
			if (!r.frame) continue;
			decoder.decode(new EncodedVideoChunk({
				type: r.frame.keyframe ? "key" : "delta",
				timestamp: r.frame.timestamp, data: r.frame.payload,
			}));
		}
	} finally { try { decoder.close(); } catch {} }
}

function startView(ns, conn) {
	const cvp = document.createElement("canvas");
	cvp.width = W; cvp.height = H;
	document.getElementById("grid").appendChild(cvp);
	const st = { ns, active: true, decoded: 0, first: false, pctx: cvp.getContext("2d", { alpha: false }) };
	pubs.set(ns, st);
	(async () => {
		while (st.active) {
			try { await runOne(st, conn); }
			catch (e) { if (st.first) { st.first = false; report.viewing--; } }
			await new Promise((r) => setTimeout(r, 1000));
		}
	})();
}

// ---- publisher side (started on command; lean clone of mgrid-pub) ----
function startPublishing(conn) {
	const cv = document.getElementById("cv");
	cv.width = W; cv.height = H;
	const ctx = cv.getContext("2d", { alpha: false, desynchronized: true });
	let frameCounter = 0;
	let hue = 0; for (const c of ID) hue = (hue * 31 + c.charCodeAt(0)) % 360;
	function draw() {
		const ms = Math.round(performance.timeOrigin + performance.now());
		ctx.fillStyle = `hsl(${hue} 60% 30%)`;
		ctx.fillRect(0, 0, W, H);
		ctx.fillStyle = "#fff";
		ctx.font = "bold 44px monospace";
		ctx.fillText(ID, 12, 50);
		ctx.font = "16px monospace";
		ctx.fillText(new Date(ms).toISOString().slice(11, 23), 12, 78);
		const x = (frameCounter * 9) % (W - 24);
		ctx.fillStyle = "#ff0";
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
		frameCounter++;
	}

	const bc = new Broadcast.Producer();
	conn.publish(Path.from(NS), bc);
	flipEv("publish_called");
	const catalog = {
		video: { renditions: { video: {
			codec: CODEC, container: { kind: "legacy" },
			codedWidth: W, codedHeight: H, framerate: FPS, optimizeForLatency: true,
		} } },
	};
	const catTrack = bc.createTrack("catalog.json");
	catTrack.writeJson(catalog);
	setInterval(() => catTrack.writeJson(catalog), 2000);
	flipEv("catalog_written");
	const vTrack = bc.createTrack("video", Container.trackInfo({ latencyMax: 2000 }));
	const prod = new Container.Legacy.Producer(vTrack);
	let encoded = 0;
	const encoder = new VideoEncoder({
		output: (chunk) => {
			try {
				prod.encode(chunk, chunk.timestamp, chunk.type === "key");
				encoded++;
				if (encoded === 1) flipEv("first_encoded");
			} catch (e) { log("PROD_ERR", JSON.stringify(String(e?.message ?? e))); }
		},
		error: (e) => log("ENC_ERR", JSON.stringify(String(e?.message ?? e))),
	});
	encoder.configure({
		codec: CODEC, width: W, height: H, framerate: FPS, bitrate: BITRATE,
		latencyMode: "realtime", avc: { format: "annexb" },
	});
	fetch("/roster", { method: "POST", body: JSON.stringify({ action: "add", ns: NS }) })
		.then(() => flipEv("rostered"))
		.catch((e) => log("ROSTER_ERR", JSON.stringify(String(e?.message ?? e))));
	let i = 0;
	const interval = 1000 / FPS;
	let nextT = performance.now() + interval;
	const tick = () => {
		draw();
		if (encoder.encodeQueueSize <= 3) {
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
	report.publishing = true;
}

(async () => {
	log("START", `relay=${RELAY}`, `ns=${NS}`);
	const t0 = performance.now();
	const conn = await Connection.connect(new URL(RELAY), { websocket: { enabled: false } });
	log("CONNECTED", `ms=${(performance.now() - t0).toFixed(0)}`, `version=${conn.version}`);
	conn.closed?.then?.((e) => log("CONN_CLOSED", JSON.stringify(String(e?.message ?? e))));

	setInterval(async () => {
		const r = await fetch("/roster").then((r) => r.json()).catch(() => null);
		if (!r) return;
		for (const ns of r.pubs) if (!pubs.has(ns) && ns !== NS) startView(ns, conn);
	}, 1000);

	setInterval(() => log("VSTATS", `viewing=${report.viewing}/${pubs.size}`, `dec=${report.decoded}`, `derr=${report.derr}`, `publishing=${report.publishing}`), 10000);

	// command poll: 100 ms
	let flipped = false;
	const poll = setInterval(async () => {
		if (flipped) return;
		const c = await fetch(`/cmd?id=${ID}`).then((r) => r.json()).catch(() => null);
		if (c && c.action === "publish" && !flipped) {
			flipped = true;
			clearInterval(poll);
			flipEv("cmd_recv");
			try { startPublishing(conn); } catch (e) { log("FLIP_FAIL", JSON.stringify(String(e?.message ?? e))); }
		}
	}, 100);
})();
