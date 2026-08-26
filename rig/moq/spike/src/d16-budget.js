// Draft-16 subscribe-budget re-check (§14.5): churn N subscribes to NONEXISTENT
// namespaces on ONE session, then acquire a LIVE broadcast on the same session.
// Draft-14 behavior (§13.4): ~40-60 churned subscribes exhaust the session permanently.
// Params: ?relay= &churn=60 &live=d16budget/live
import { Connection, Path } from "@moq/net";

const params = new URLSearchParams(location.search);
const RELAY = params.get("relay");
const CHURN = Number(params.get("churn") ?? 60);
const LIVE = params.get("live") ?? "d16budget/live";

const wall = () => (performance.timeOrigin + performance.now()).toFixed(1);
function log(...a) {
	const line = `BUD ${wall()} ${a.join(" ")}`;
	console.log(line);
	fetch("/log", { method: "POST", body: line }).catch(() => {});
}
window.addEventListener("unhandledrejection", (e) =>
	log("UNHANDLED", e.reason?.constructor?.name, JSON.stringify(e.reason?.message ?? String(e.reason))),
);

async function trySub(conn, path, track, timeoutMs) {
	try {
		const bc = conn.consume(Path.from(path));
		const sub = bc.subscribe(track);
		const r = await Promise.race([
			sub.nextGroup().catch((e) => ({ err: e })),
			sub.closed.then((e) => ({ err: e ?? new Error("closed-clean") })),
			new Promise((res) => setTimeout(() => res("timeout"), timeoutMs)),
		]);
		return { r, sub, bc };
	} catch (e) {
		return { r: { err: e } };
	}
}

(async () => {
	try {
		log("START", `relay=${new URL(RELAY).origin}`, `churn=${CHURN}`, `live=${LIVE}`);
		const t0 = performance.now();
		const conn = await Connection.connect(new URL(RELAY), { websocket: { enabled: false } });
		log("CONNECTED", `ms=${(performance.now() - t0).toFixed(0)}`, `version=${conn.version}`);
		let errors = 0, timeouts = 0;
		for (let i = 0; i < CHURN; i++) {
			const { r, sub } = await trySub(conn, `d16budget-none-${i}`, "catalog.json", 3000);
			if (r === "timeout") timeouts++;
			else errors++;
			if (i === 0) log("CHURN_FIRST", JSON.stringify(String(r?.err?.message ?? r)));
			try { sub?.close?.(); } catch {}
			if ((i + 1) % 10 === 0) log("CHURN", `n=${i + 1}`, `errors=${errors}`, `timeouts=${timeouts}`);
		}
		log("CHURN_DONE", `errors=${errors}`, `timeouts=${timeouts}`);
		for (let attempt = 0; attempt < 10; attempt++) {
			const { r, bc } = await trySub(conn, LIVE, "catalog.json", 5000);
			if (r && r !== "timeout" && !r.err) {
				log("LIVE_CATALOG_ACQUIRED", `attempt=${attempt}`);
				const cat = await r.readJson();
				const name = Object.keys(cat?.video?.renditions ?? {})[0];
				const vs = bc.subscribe(name);
				const g = await Promise.race([
					vs.nextGroup().catch((e) => ({ err: e })),
					new Promise((res) => setTimeout(() => res("timeout"), 5000)),
				]);
				if (g && g !== "timeout" && !g.err) {
					const f = await g.readFrame();
					log("LIVE_VIDEO_OK", `bytes=${f?.payload?.byteLength ?? "?"}`);
				} else log("LIVE_VIDEO_FAIL", JSON.stringify(String(g?.err?.message ?? g)));
				log("VERDICT session-still-usable-after-churn");
				return;
			}
			log("LIVE_RETRY", `attempt=${attempt}`, JSON.stringify(String(r?.err?.message ?? r)));
			await new Promise((res) => setTimeout(res, 1000));
		}
		log("LIVE_GIVEUP VERDICT session-exhausted-or-live-missing");
	} catch (e) {
		log("FAIL", e?.constructor?.name, JSON.stringify(e?.message ?? String(e)));
	}
})();
