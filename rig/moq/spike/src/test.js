// MoQ browser spike: can @moq/net (kixelated moq-lite JS) talk IETF draft-14 on CF?
import { Connection, Path } from "@moq/net";

const params = new URLSearchParams(location.search);
const NS = params.get("ns") ?? "clock";
const RELAY = params.get("relay") ?? "https://draft-14.cloudflare.mediaoverquic.com";

function log(...a) {
	const line = `${(performance.now() / 1000).toFixed(3)} ${a.join(" ")}`;
	console.log(line);
	fetch("/log", { method: "POST", body: line }).catch(() => {});
}
window.addEventListener("unhandledrejection", (e) =>
	log("UNHANDLED", e.reason?.constructor?.name, JSON.stringify(e.reason?.message ?? String(e.reason))),
);

(async () => {
	try {
		log("START", `relay=${RELAY}`, `ns=${NS}`, `webtransport=${"WebTransport" in window}`);
		const t0 = performance.now();
		const conn = await Connection.connect(new URL(RELAY), { websocket: { enabled: false } });
		log(
			"CONNECTED",
			`ms=${(performance.now() - t0).toFixed(0)}`,
			`class=${conn.constructor.name}`,
			`version=${conn.version}`,
		);
		const bc = conn.consume(Path.from(NS));
		const sub = bc.subscribe("now");
		log("SUBSCRIBE_SENT track=now");
		let frames = 0;
		const deadline = Date.now() + 25000;
		let group;
		while (Date.now() < deadline && frames < 15) {
			group = await Promise.race([
				sub.nextGroup(),
				new Promise((r) => setTimeout(() => r("timeout"), deadline - Date.now())),
			]);
			if (group === "timeout") {
				log("TIMEOUT waiting for group");
				break;
			}
			if (!group) {
				log("TRACK_CLOSED", String(sub.closed.peek?.() ?? ""));
				break;
			}
			log("GROUP", `seq=${group.sequence}`);
			while (frames < 15) {
				const s = await Promise.race([
					group.readString(),
					new Promise((r) => setTimeout(() => r("timeout"), 5000)),
				]);
				if (s === "timeout" || s === undefined) break;
				frames++;
				log("FRAME", JSON.stringify(s), `wall=${Date.now()}`);
			}
		}
		log("DONE", `frames=${frames}`);
	} catch (e) {
		log("FAIL", e?.constructor?.name, JSON.stringify(e?.message ?? String(e)));
	}
	fetch("/done", { method: "POST", body: "done" }).catch(() => {});
})();
