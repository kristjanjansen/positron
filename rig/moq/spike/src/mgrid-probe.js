// MULTI-PUBLISHER grid: probe viewer (RUNBOOK §13). Subscribes to ALL publishers
// in the local roster (polled every 1 s — the draft-14 discovery shim), decodes
// every burned row, posts per-publisher JSONL samples to the :8887 collector.
// Rows: {k:"f",pub,t,d} frame g2g | {k:"seen"/"cat"/"first",pub,t} discovery chain
//       {k:"race",pub,phase,att} subscribe race | {k:"close",pub,t,err} track close
//       {k:"silent",pub,t,gap} silence watchdog | {k:"ps",...} per-pub stats
//       {k:"s",...} page stats
// Params: ?name=<rung> &probe=<probe1> &relay= &rowless=1 (skip row decode)
import { Connection, Path } from "@moq/net";
import * as Container from "@moq/hang/container";

const params = new URLSearchParams(location.search);
const NAME = params.get("name") ?? "dev";
const PROBE = params.get("probe") ?? "probe1";
const RELAY = params.get("relay") ?? "https://draft-14.cloudflare.mediaoverquic.com";
const ROWLESS = params.get("rowless") === "1";

const NBLOCKS = 40, BLOCK_W = 8, ROW_Y = 120, ROW_H = 48, W = 320, H = 180;

function log(...a) {
	const line = `MGPROBE ${PROBE} ${new Date().toISOString()} ${a.join(" ")}`;
	console.log(line);
	fetch("/log", { method: "POST", body: line }).catch(() => {});
}
window.addEventListener("unhandledrejection", (e) =>
	log("UNHANDLED", JSON.stringify(String(e.reason?.message ?? e.reason))));
window.addEventListener("error", (e) => log("WINDOW_ERR", JSON.stringify(String(e.message))));

let buf = [];
function row(o) { o.pr = PROBE; buf.push(JSON.stringify(o)); }
setInterval(() => {
	if (!buf.length) return;
	const body = buf.join("\n");
	buf = [];
	fetch(`/jsonl/${NAME}`, { method: "POST", body }).catch(() => {});
}, 2000);

const wall = () => Math.round(performance.timeOrigin + performance.now());
const short = (ns) => ns.replace("elektron-mgrid-", "");

const grid = document.getElementById("grid");
const report = (window.__report = { pubs: 0, live: 0, decoded: 0, decodeErrors: 0, races: 0, closes: 0, silents: 0 });

// per-pub state: ns -> st
const pubs = new Map();

function decodeRow(pctx) {
	const y = ROW_Y + ROW_H / 2;
	const img = pctx.getImageData(0, y, NBLOCKS * BLOCK_W, 1).data;
	const levels = [];
	for (let i = 0; i < NBLOCKS; i++) {
		let s = 0;
		for (let dx = 2; dx < 6; dx++) s += img[(i * BLOCK_W + dx) * 4 + 1];
		levels.push(s / 4);
	}
	const mn = Math.min(...levels), mx = Math.max(...levels);
	if (mx - mn < 60) return { ok: false };
	const thr = (mn + mx) / 2;
	const bits = levels.map((l) => (l > thr ? 1 : 0));
	let low = 0;
	for (let i = 0; i < 32; i++) low = low * 2 + bits[i];
	let ck = 0;
	for (let i = 32; i < 40; i++) ck = ck * 2 + bits[i];
	const bytes = [];
	let v = low;
	for (let i = 3; i >= 0; i--) { bytes[i] = v % 256; v = Math.floor(v / 256); }
	let expect = 0;
	for (const b of bytes) expect ^= b;
	if (expect !== ck) return { ok: false };
	return { ok: true, low };
}

async function runOne(st, conn) {
	const p = st.short;
	const bc = conn.consume(Path.from(st.ns));

	// catalog with retry (subscribe-before-announce is rejected on CF §7.1 trap 2;
	// closed catalog groups are never redelivered -> wait for the 2 s republish)
	let catGroup;
	for (let att = 0; att < 60 && st.active; att++) {
		const catSub = bc.subscribe("catalog.json");
		catGroup = await Promise.race([
			catSub.nextGroup(),
			catSub.closed.then((e) => ({ err: e ?? "closed-zero-groups" })),
			new Promise((r) => setTimeout(() => r("timeout"), 5000)),
		]);
		if (catGroup && catGroup !== "timeout" && !catGroup.err) break;
		report.races++;
		st.races++;
		row({ k: "race", pub: p, phase: "catalog", att, t: wall(), err: String(catGroup?.err?.message ?? catGroup?.err ?? catGroup) });
		catSub.close?.();
		catGroup = undefined;
		await new Promise((r) => setTimeout(r, 1000));
	}
	if (!catGroup) throw new Error("no catalog after 60 attempts");
	const catalog = await catGroup.readJson();
	const cfg = catalog?.video?.renditions?.video;
	if (!cfg) throw new Error("no video rendition");
	if (!st.catLogged) { st.catLogged = true; row({ k: "cat", pub: p, t: wall() }); }

	const decoder = new VideoDecoder({
		output: (vf) => {
			const recvWall = performance.timeOrigin + performance.now();
			st.lastFrame = recvWall;
			if (st.silent) { st.silent = false; row({ k: "resume", pub: p, t: Math.round(recvWall) }); }
			st.pctx.drawImage(vf, 0, 0, W, H);
			vf.close();
			st.decoded++; report.decoded++; st.fpsW++;
			if (!st.firstLogged) {
				st.firstLogged = true;
				report.live++;
				row({ k: "first", pub: p, t: Math.round(recvWall) });
				log("FIRST_FRAME", p, `t=${Math.round(recvWall)}`);
			}
			if (ROWLESS) return;
			const dec = decodeRow(st.pctx);
			if (dec.ok) {
				const d = (((recvWall - dec.low) % 4294967296) + 4294967296) % 4294967296;
				row({ k: "f", pub: p, t: Math.round(recvWall), d: +d.toFixed(1) });
			} else st.rowFail++;
		},
		error: (e) => { st.derr++; report.decodeErrors++; row({ k: "derr", pub: p, t: wall(), err: String(e?.message ?? e) }); },
	});
	decoder.configure({ codec: cfg.codec, optimizeForLatency: true });
	st.decoder = decoder;

	const vSub = bc.subscribe("video");
	const consumer = new Container.Consumer(vSub, { format: new Container.Legacy.Format(), latency: 0 });
	let got = false;
	try {
		for (;;) {
			if (!st.active) return;
			const r = await Promise.race([
				consumer.next(),
				new Promise((res) => setTimeout(() => res("timeout"), got ? 10000 : 5000)),
			]);
			if (r === "timeout") {
				if (!got) { report.races++; st.races++; row({ k: "race", pub: p, phase: "video", t: wall(), err: "ok-zero-groups-5s" }); }
				throw new Error(got ? "video stalled 10 s" : "video zero groups 5 s");
			}
			if (r === undefined) {
				report.closes++;
				row({ k: "close", pub: p, t: wall(), lastF: Math.round(st.lastFrame || 0) });
				throw new Error("video track closed");
			}
			if (!r.frame) continue;
			got = true;
			decoder.decode(new EncodedVideoChunk({
				type: r.frame.keyframe ? "key" : "delta",
				timestamp: r.frame.timestamp,
				data: r.frame.payload,
			}));
		}
	} finally {
		try { decoder.close(); } catch {}
		st.decoder = null;
	}
}

function startPub(ns, conn) {
	const cvp = document.createElement("canvas");
	cvp.width = W; cvp.height = H;
	grid.appendChild(cvp);
	const st = {
		ns, short: short(ns), active: true, decoded: 0, derr: 0, rowFail: 0, races: 0,
		fpsW: 0, lastFrame: 0, silent: false, firstLogged: false, catLogged: false,
		decoder: null, pctx: cvp.getContext("2d", { alpha: false, willReadFrequently: true }),
	};
	pubs.set(ns, st);
	report.pubs++;
	row({ k: "seen", pub: st.short, t: wall() });
	(async () => {
		while (st.active) {
			try { await runOne(st, conn); }
			catch (e) {
				if (st.firstLogged) { st.firstLogged = false; report.live--; }
				row({ k: "sess", pub: st.short, t: wall(), err: String(e?.message ?? e) });
			}
			await new Promise((r) => setTimeout(r, 1000));
		}
	})();
}

(async () => {
	log("START", `relay=${RELAY}`, `name=${NAME}`);
	const t0 = performance.now();
	const conn = await Connection.connect(new URL(RELAY), { websocket: { enabled: false } });
	log("CONNECTED", `ms=${(performance.now() - t0).toFixed(0)}`, `version=${conn.version}`);
	conn.closed?.then?.((e) => {
		log("CONN_CLOSED", JSON.stringify(String(e?.message ?? e)), "reloading in 2s");
		row({ k: "connclosed", t: wall() });
		setTimeout(() => location.reload(), 2000);
	});

	// roster poll = discovery (1 s)
	setInterval(async () => {
		const r = await fetch("/roster").then((r) => r.json()).catch(() => null);
		if (!r) return;
		for (const ns of r.pubs) if (!pubs.has(ns)) startPub(ns, conn);
		for (const [ns, st] of pubs) if (!r.pubs.includes(ns) && st.active) {
			st.active = false;
			pubs.delete(ns);
			report.pubs--;
			if (st.firstLogged) report.live--;
			row({ k: "removed", pub: st.short, t: wall() });
		}
	}, 1000);

	// silence watchdog (death detection heuristic): >500 ms without a frame at 15 fps
	setInterval(() => {
		const now = performance.timeOrigin + performance.now();
		for (const st of pubs.values()) {
			if (st.firstLogged && !st.silent && st.lastFrame && now - st.lastFrame > 500) {
				st.silent = true;
				report.silents++;
				row({ k: "silent", pub: st.short, t: Math.round(now), lastF: Math.round(st.lastFrame) });
			}
		}
	}, 100);

	// per-pub + page stats every 2 s
	setInterval(() => {
		let q = 0;
		for (const st of pubs.values()) {
			row({ k: "ps", pub: st.short, t: wall(), fps: +(st.fpsW / 2).toFixed(1), dec: st.decoded, derr: st.derr, rf: st.rowFail, q: st.decoder ? st.decoder.decodeQueueSize : -1 });
			q = Math.max(q, st.decoder ? st.decoder.decodeQueueSize : 0);
			st.fpsW = 0;
		}
		row({ k: "s", t: wall(), pubs: report.pubs, live: report.live, dec: report.decoded, derr: report.decodeErrors, races: report.races, closes: report.closes, silents: report.silents, maxQ: q });
	}, 2000);
})();
