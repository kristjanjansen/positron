// Draft-16 SUBSCRIBE_NAMESPACE headline test (§14.4): subscribe to a namespace PREFIX
// BEFORE any publisher exists; when a publisher appears, measure announce->track-available.
// Also logs announce-withdrawal (active=false) timing for the death re-check.
// Params: ?relay= (token URL, redacted in logs) &prefix= &dur=seconds
import { Connection, Path } from "@moq/net";

const params = new URLSearchParams(location.search);
const RELAY = params.get("relay");
const PREFIX = params.get("prefix") ?? "d16ann";
const DUR = Number(params.get("dur") ?? 600);

const wall = () => (performance.timeOrigin + performance.now()).toFixed(1);
function log(...a) {
	const line = `ANN ${wall()} ${a.join(" ")}`;
	console.log(line);
	fetch("/log", { method: "POST", body: line }).catch(() => {});
}
window.addEventListener("unhandledrejection", (e) =>
	log("UNHANDLED", e.reason?.constructor?.name, JSON.stringify(e.reason?.message ?? String(e.reason))),
);

async function watch(conn, fullPath) {
	try {
		const tAnn = performance.now();
		let catGroup, bc, catSub, attempt = 0;
		for (; attempt < 20; attempt++) {
			let r;
			try {
				bc = conn.consume(fullPath); // re-consume: an announce flap evicts the cached handle
				catSub = bc.subscribe("catalog.json");
				if (attempt === 0) log("WATCH_CAT_SUB_SENT", `path=${fullPath}`);
				r = await Promise.race([
					catSub.nextGroup(),
					catSub.closed.then((e) => ({ err: e })),
					new Promise((res) => setTimeout(() => res("timeout"), 5000)),
				]);
			} catch (e) {
				r = { err: e };
			}
			if (r && r !== "timeout" && !r.err) { catGroup = r; break; }
			log("WATCH_CAT_RETRY", `attempt=${attempt}`, `dt_ms=${(performance.now() - tAnn).toFixed(1)}`,
				JSON.stringify(String(r?.err?.message ?? r)));
			try { catSub.close?.(); } catch {}
			await new Promise((res) => setTimeout(res, 500));
		}
		if (!catGroup) { log("WATCH_CAT_GIVEUP", `path=${fullPath}`); return; }
		const catalog = await catGroup.readJson();
		log("WATCH_CATALOG", `path=${fullPath}`, `attempt=${attempt}`, `dt_ms=${(performance.now() - tAnn).toFixed(1)}`);
		const rends = catalog?.video?.renditions ?? {};
		const name = Object.keys(rends)[0];
		if (!name) { log("WATCH_NO_RENDITION", `path=${fullPath}`); return; }
		const vSub = bc.subscribe(name);
		const grp = await Promise.race([
			vSub.nextGroup(),
			vSub.closed.then((e) => ({ err: e })),
			new Promise((r) => setTimeout(() => r("timeout"), 15000)),
		]);
		if (!grp || grp === "timeout" || grp.err) {
			log("WATCH_VIDEO_FAIL", `path=${fullPath}`, JSON.stringify(String(grp?.err?.message ?? grp)));
			return;
		}
		const fr = await Promise.race([grp.readFrame(), new Promise((r) => setTimeout(() => r("timeout"), 5000))]);
		if (fr && fr !== "timeout") {
			log("WATCH_FIRST_WIRE_FRAME", `path=${fullPath}`, `bytes=${fr.payload.byteLength}`,
				`dt_ms=${(performance.now() - tAnn).toFixed(1)}`);
		} else {
			log("WATCH_FRAME_TIMEOUT", `path=${fullPath}`);
		}
		// keep draining groups so death->stall is observable
		let lastGroup = grp.sequence, frames = 1;
		void (async () => {
			try {
				for (;;) {
					const g = await vSub.nextGroup();
					if (!g) { log("WATCH_TRACK_END", `path=${fullPath}`, `frames=${frames}`); return; }
					lastGroup = g.sequence;
					for (;;) { const f = await g.readFrame(); if (!f) break; frames++; }
				}
			} catch (e) {
				log("WATCH_TRACK_ERR", `path=${fullPath}`, JSON.stringify(String(e?.message ?? e)), `frames=${frames} lastGroup=${lastGroup}`);
			}
		})();
	} catch (e) {
		log("WATCH_FAIL", `path=${fullPath}`, e?.constructor?.name, JSON.stringify(e?.message ?? String(e)));
	}
}

(async () => {
	try {
		log("START", `relay=${new URL(RELAY).origin}`, `prefix=${PREFIX}`);
		const t0 = performance.now();
		const conn = await Connection.connect(new URL(RELAY), { websocket: { enabled: false }, discovery: true });
		log("CONNECTED", `ms=${(performance.now() - t0).toFixed(0)}`, `version=${conn.version}`);
		const prefixPath = Path.from(PREFIX);
		const ann = conn.announced(prefixPath);
		log("ANN_SUB_SENT", `prefix=${PREFIX}`);
		const handled = new Set();
		// NB: no Promise.race with ann.next() — an orphaned next() eats events.
		setTimeout(() => { log("DUR_END"); ann.close(); }, DUR * 1000);
		for (;;) {
			const ev = await ann.next();
			if (!ev) { log("ANN_STREAM_END"); break; }
			log("ANN_EVENT", `path=${ev.path}`, `active=${ev.active}`);
			if (ev.active && !handled.has(String(ev.path))) {
				handled.add(String(ev.path));
				void watch(conn, Path.join(prefixPath, ev.path));
			}
		}
		log("DONE");
	} catch (e) {
		log("FAIL", e?.constructor?.name, JSON.stringify(e?.message ?? String(e)));
	}
})();
