// elektron-moq-safari: static assets (public/) + a beacon sink so any device
// running the test page (an iPhone in someone's hand, a locked-screen Safari)
// is observable from `wrangler tail elektron-moq-safari` — AND, since the
// BeaconStore DO below, readable AFTER the fact at GET /results. That turns
// the page into an async device-verdict collector: forward the URL to Android
// owners, read their verdicts later without a live tail.
//
// Routes (assets serve everything else):
//   POST /beacon          — page self-reports (JSON, sid per page load) →
//                           console.log for `wrangler tail` + upsert into DO.
//   GET  /results         — compact HTML table, one row per session, newest
//                           first. ?json=1 for the raw records. No auth
//                           (beacons carry no secrets); X-Robots-Tag noindex.
//
// Storage: one SQLite-backed Durable Object instance ("global"), last 200
// sessions, keyed by the page's per-load session id (sid). Beacons without a
// sid (old cached pages) fall back to a UA+IP hash so they still collect.

const MAX_SESSIONS = 200;
const MAX_BODY = 4000; // beacon bodies are small JSON; hard cap vs abuse

// Furthest-stage ranking across both `stage` and `event` beacon fields.
const STAGE_RANK = {
	boot: 1,
	starting: 2,
	start: 2,
	connecting: 3,
	"safari-fallback": 3,
	reconnecting: 3,
	connected: 4,
	catalog: 5,
	subscribed: 6,
	"first-frame": 7,
	live: 7,
};

// ── not ready to be found ───────────────────────────────────────────────────
// moq.positron.studio serves a real HTML page from `public/`, which makes it
// the second indexable surface on this zone after positron.studio itself.
// Same three channels as there, and the same division of labour: the meta tag
// in public/index.html covers the page, public/_headers covers every static
// asset (the edge serves those without ever invoking this Worker), and the
// wrapper below covers everything this Worker answers itself.
const NOINDEX = "noindex, nofollow";

const ROBOTS = `# moq.positron.studio is R&D and is not ready to be found.
# The header X-Robots-Tag does the real work; this file is the polite half.
# Link preview bots are allowed on purpose so pasted links still make a card.
# One User-agent per group: Meta's parser ignores shared groups.

User-agent: Twitterbot
Allow: /

User-agent: Slackbot
Allow: /

User-agent: Slack-ImgProxy
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: meta-externalfetcher
Allow: /

User-agent: LinkedInBot
Allow: /

User-agent: Discordbot
Allow: /

User-agent: TelegramBot
Allow: /

User-agent: WhatsApp
Allow: /

User-agent: *
Content-Signal: search=no, ai-input=no, ai-train=no
Disallow: /
`;

/** ⚠️ A DO RESPONSE HAS IMMUTABLE HEADERS and a 204 must not be given a body. */
function marked(res) {
	const bodyless = res.status === 204 || res.status === 304;
	const out = new Response(bodyless ? null : res.body, res);
	out.headers.set("X-Robots-Tag", NOINDEX);
	return out;
}

const routes = {
	async fetch(request, env) {
		const url = new URL(request.url);
		const stub = () => env.BEACONS.get(env.BEACONS.idFromName("global"));

		if (url.pathname === "/robots.txt" && (request.method === "GET" || request.method === "HEAD")) {
			return new Response(request.method === "HEAD" ? null : ROBOTS, {
				headers: {
					"content-type": "text/plain; charset=utf-8",
					"cache-control": "public, max-age=3600",
				},
			});
		}

		if (request.method === "POST" && url.pathname === "/beacon") {
			const text = (await request.text()).slice(0, MAX_BODY);
			console.log("BEACON", text); // keep the live `wrangler tail` view
			try {
				await stub().fetch("https://do/beacon", {
					method: "POST",
					body: JSON.stringify({
						text,
						ip: request.headers.get("cf-connecting-ip") ?? "",
					}),
				});
			} catch (e) {
				console.log("BEACON_STORE_FAIL", String(e?.message ?? e));
			}
			return new Response(null, { status: 204 });
		}

		if (request.method === "GET" && url.pathname === "/results") {
			const res = await stub().fetch("https://do/results" + url.search);
			const h = new Headers(res.headers);
			h.set("X-Robots-Tag", "noindex, nofollow");
			h.set("Cache-Control", "no-store");
			return new Response(res.body, { status: res.status, headers: h });
		}

		return new Response("not found", { status: 404 });
	},
};

export default {
	async fetch(request, env) {
		return marked(await routes.fetch(request, env));
	},
};

// ---------------------------------------------------------------------------
// BeaconStore — single SQLite DO holding the last MAX_SESSIONS test sessions.
// One row per page load: first-seen ts kept, latest state wins for the rest.
// ---------------------------------------------------------------------------
export class BeaconStore {
	constructor(state) {
		this.sql = state.storage.sql;
		this.sql.exec(`CREATE TABLE IF NOT EXISTS sessions (
			sid      TEXT PRIMARY KEY,
			first_ts INTEGER NOT NULL,
			last_ts  INTEGER NOT NULL,
			ua       TEXT,
			data     TEXT
		)`);
	}

	async fetch(request) {
		const url = new URL(request.url);
		if (request.method === "POST" && url.pathname === "/beacon") {
			try {
				this.ingest(JSON.parse(await request.text()));
			} catch (e) {
				console.log("INGEST_FAIL", String(e?.message ?? e));
			}
			return new Response(null, { status: 204 });
		}
		if (url.pathname === "/results") return this.results(url);
		return new Response("not found", { status: 404 });
	}

	ingest({ text, ip }) {
		let b;
		try {
			b = JSON.parse(text);
		} catch {
			b = { event: "unparseable", raw: String(text).slice(0, 200) };
		}
		if (typeof b !== "object" || b === null) b = { event: "unparseable" };
		const ua = typeof b.ua === "string" ? b.ua.slice(0, 400) : "";
		// Old cached pages send no sid — hash UA+IP so they still land somewhere.
		const sid = typeof b.sid === "string" && b.sid
			? b.sid.slice(0, 64)
			: "nosid-" + fnv1a(ua + "|" + ip);

		const now = Date.now();
		const row = this.sql.exec("SELECT first_ts, data FROM sessions WHERE sid = ?", sid).toArray()[0];
		const rec = row ? JSON.parse(row.data) : { errors: [], errorCount: 0, furthest: "boot" };

		// Latest defined value wins for the rolling numbers.
		for (const k of ["webtransport", "h264", "codec", "version", "connectMs",
			"firstFrameMs", "decoded", "decodeErrors", "reconnects", "g2g_p50",
			"audioDec", "opus", "aac", "audioCodec", "audioState",
			"aDecoded", "aLat_p50", "avSkew_p50", "aUnderruns", "aDecErrors",
			"audioLevelDb", "silentSeconds", "pcmDb"]) {
			if (b[k] !== undefined && b[k] !== null) rec[k] = b[k];
		}
		if (typeof b.fps === "number") {
			rec.fps = b.fps;
			rec.fpsMax = Math.max(rec.fpsMax ?? 0, b.fps);
		}
		rec.lastEvent = String(b.event ?? "?").slice(0, 40);
		if (b.stage) rec.lastStage = String(b.stage).slice(0, 40);

		// Furthest stage reached (never regresses on reconnect).
		for (const cand of [b.stage, b.event]) {
			const r = STAGE_RANK[cand];
			if (r !== undefined && r > (STAGE_RANK[rec.furthest] ?? 0)) rec.furthest = cand;
		}

		if (["error", "window-error", "player-load-error", "unparseable"].includes(b.event)) {
			rec.errorCount = (rec.errorCount ?? 0) + 1;
			const msg = String(b.msg ?? b.raw ?? "?").slice(0, 300);
			rec.errors = (rec.errors ?? []).filter((m) => m !== msg);
			rec.errors.push(msg);
			rec.errors = rec.errors.slice(-3); // last 3 distinct messages
		}

		this.sql.exec(
			`INSERT INTO sessions (sid, first_ts, last_ts, ua, data) VALUES (?, ?, ?, ?, ?)
			 ON CONFLICT(sid) DO UPDATE SET last_ts = excluded.last_ts,
			   ua = excluded.ua, data = excluded.data`,
			sid, row ? row.first_ts : now, now, ua, JSON.stringify(rec),
		);
		this.sql.exec(
			`DELETE FROM sessions WHERE sid IN
			 (SELECT sid FROM sessions ORDER BY last_ts DESC LIMIT -1 OFFSET ?)`,
			MAX_SESSIONS,
		);
	}

	results(url) {
		const rows = this.sql
			.exec("SELECT sid, first_ts, last_ts, ua, data FROM sessions ORDER BY last_ts DESC")
			.toArray()
			.map((r) => ({
				sid: r.sid,
				first: new Date(r.first_ts).toISOString(),
				last: new Date(r.last_ts).toISOString(),
				browser: browserLabel(r.ua),
				ua: r.ua,
				...JSON.parse(r.data),
			}));

		if (url.searchParams.get("json") === "1") {
			return new Response(JSON.stringify(rows, null, 1), {
				headers: { "content-type": "application/json" },
			});
		}

		const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
			(c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
		const num = (v, unit = "") => (v === undefined || v === null ? "·" : esc(v) + unit);
		const tr = (s) => {
			const feat = (s.webtransport === undefined && s.h264 === undefined) ? "·"
				: `WT:${s.webtransport ? "✓" : "✗"} H264:${s.h264 ? "✓" : "✗"}`
				+ (s.audioDec === undefined ? "" : ` Op:${s.opus ? "✓" : "✗"} AAC:${s.aac ? "✓" : "✗"}`);
			// audio column: probe verdict always; stream stats when it played one;
			// audibility verdict (sounding/silent + level) from the AnalyserNode.
			const aState = s.audioState === "sounding" ? " SOUNDING"
				: s.audioState === "silent" ? ` SILENT⚠${s.silentSeconds ? " " + s.silentSeconds + "s" : ""}`
				: s.audioState === "suspended" ? " (susp)"
				: "";
			const aLevel = (s.audioLevelDb !== undefined && s.audioLevelDb !== null) ? ` ${s.audioLevelDb}dB` : "";
			const audio = s.audioState === "no-track" ? "no-track"
				: s.audioCodec === undefined ? "·"
				: `${s.audioCodec}${aState}${aLevel}`
				+ (s.aDecoded ? ` ${s.aDecoded}ch` : "")
				+ (s.aLat_p50 !== undefined && s.aLat_p50 !== null ? ` lat ${s.aLat_p50}ms` : "")
				+ (s.avSkew_p50 !== undefined && s.avSkew_p50 !== null ? ` skew ${s.avSkew_p50 > 0 ? "+" : ""}${s.avSkew_p50}ms` : "")
				+ (s.aUnderruns ? ` ${s.aUnderruns}under` : "")
				+ (s.aDecErrors ? ` ${s.aDecErrors}err` : "");
			const bad = (s.errorCount ?? 0) > 0;
			const live = s.furthest === "live" || s.furthest === "first-frame";
			return `<tr>
				<td title="last ${esc(s.last)} · sid ${esc(s.sid)}">${esc(s.first.slice(5, 19).replace("T", " "))}</td>
				<td title="${esc(s.ua)}">${esc(s.browser)}</td>
				<td class="${live ? "ok" : ""}">${esc(s.furthest)}</td>
				<td>${esc(feat)}</td>
				<td>${num(s.connectMs, " ms")}</td>
				<td>${num(s.firstFrameMs, " ms")}</td>
				<td>${num(s.fps)}${s.fpsMax !== undefined ? " / " + esc(s.fpsMax) : ""}</td>
				<td>${num(s.g2g_p50, " ms")}</td>
				<td>${esc(audio)}</td>
				<td>${num(s.decoded)}</td>
				<td class="${bad ? "err" : ""}">${bad ? esc(s.errorCount) + "× " + esc((s.errors ?? []).slice(-1)[0] ?? "") : "·"}</td>
			</tr>`;
		};

		const html = `<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>MoQ device verdicts</title>
<style>
	body { background:#0b0e14; color:#e6e6e6; font: 13px/1.5 -apple-system, "SF Pro", Helvetica, monospace, sans-serif; padding: 14px; }
	h1 { color:#ffd400; font-size:18px; margin-bottom:6px; }
	p { color:#9ca3af; font-size:12px; margin-bottom:10px; }
	.wrap { overflow-x:auto; }
	table { border-collapse:collapse; white-space:nowrap; }
	th, td { padding: 4px 10px; border-bottom: 1px solid #1f2937; text-align:left; }
	th { color:#9ca3af; font-weight:normal; }
	td.ok { color:#4ade80; }
	td.err { color:#f87171; max-width: 340px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
</style>
<h1>POSITRON MoQ — device verdicts (${rows.length})</h1>
<p>One row per test-page load, newest first, last ${MAX_SESSIONS} kept. Times UTC; hover a row's
time for last-seen + session id, hover the browser for the full UA. <a style="color:#ffd400" href="/results?json=1">raw json</a></p>
<div class="wrap"><table>
<tr><th>first seen (UTC)</th><th>browser</th><th>furthest stage</th><th>features</th><th>connect</th><th>first frame</th><th>fps last/max</th><th>g2g p50</th><th>audio</th><th>frames</th><th>errors</th></tr>
${rows.map(tr).join("\n")}
</table></div>`;
		return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
	}
}

// "Chrome 142 / Android 15", "Mobile Safari 26.5 / iOS 26.5", "Firefox 143 / Windows"…
// Known caveats (unavoidable, UA-string parsing): iPads masquerade as macOS
// desktop Safari; Chrome/Android UA-reduction may freeze the Android version
// at 10 and the Chrome minor at .0; all iOS browsers are WebKit underneath.
function browserLabel(ua = "") {
	const m = (re) => ua.match(re)?.[1];
	let os = "?";
	if (/iPhone|iPod|iPad/.test(ua)) {
		const v = m(/OS (\d+[._]\d+(?:[._]\d+)?) like Mac/);
		os = "iOS" + (v ? " " + v.replace(/_/g, ".") : "");
	} else if (/Android/.test(ua)) {
		const v = m(/Android (\d+(?:\.\d+)*)/);
		os = "Android" + (v ? " " + v : "");
	} else if (/Mac OS X/.test(ua)) os = "macOS";
	else if (/Windows/.test(ua)) os = "Windows";
	else if (/CrOS/.test(ua)) os = "ChromeOS";
	else if (/Linux/.test(ua)) os = "Linux";

	let v, b = "Unknown";
	if ((v = m(/HeadlessChrome\/(\d+)/))) b = "HeadlessChrome " + v;
	else if ((v = m(/CriOS\/(\d+)/))) b = "Chrome " + v;
	else if ((v = m(/FxiOS\/(\d+)/))) b = "Firefox " + v;
	else if ((v = m(/EdgiOS\/(\d+)/)) || (v = m(/EdgA\/(\d+)/)) || (v = m(/Edg\/(\d+)/))) b = "Edge " + v;
	else if ((v = m(/SamsungBrowser\/(\d+(?:\.\d+)?)/))) b = "Samsung Internet " + v;
	else if ((v = m(/OPR\/(\d+)/))) b = "Opera " + v;
	else if ((v = m(/Firefox\/(\d+)/))) b = "Firefox " + v;
	else if ((v = m(/Chrome\/(\d+)/))) b = "Chrome " + v;
	else if (/Safari/.test(ua)) {
		v = m(/Version\/(\d+(?:\.\d+)*)/);
		b = (/iPhone|iPod|Android|Mobile/.test(ua) ? "Mobile Safari" : "Safari") + (v ? " " + v : "");
	}
	return b + " / " + os;
}

function fnv1a(s) {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h.toString(36);
}
