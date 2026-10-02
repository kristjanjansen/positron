// positron-station, since 2026-10-02 only the door to its bucket's media.
//
// The radio station that was here moved to eccm with its programmes, records
// and channels (asked in eccm: "do the station. when working, discard the
// positron one"): it is src/station/station.mjs in
// https://github.com/kristjanjansen/eccm, at /stream on eccm's Worker, and the
// station code that stood in this file is in git history before this commit.
// What stays is GET /media/<key>, because the bucket holds more than the
// station did and those objects are read through this address: the MIM project
// videos and pictures (demo/resources/mimproject*.json, the FILM constants in
// workers/pub/container/server.mjs) and kristjanjansen/. The Worker keeps its
// name so every one of those URLs keeps working. Range requests answer 206,
// which the videos need for seeking.

const CORS = {
	'access-control-allow-origin': '*',
	'access-control-allow-headers': 'range, authorization, content-type',
	'access-control-expose-headers': 'content-length, content-range, accept-ranges',
};

export default {
	async fetch(req, env) {
		const p = new URL(req.url).pathname;
		if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
		if ((req.method === 'GET' || req.method === 'HEAD') && p.startsWith('/media/')) return media(req, env, p.slice('/media/'.length));
		return new Response('the station moved to https://eccm.positron.studio/radio; this address serves /media/ only\n', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', ...CORS } });
	},
};

async function media(req, env, key) {
	if (!key) return new Response('no key\n', { status: 404, headers: CORS });
	const obj = await env.MEDIA.get(decodeURIComponent(key), { range: req.headers });
	if (!obj) return new Response('no such object\n', { status: 404, headers: CORS });
	const h = new Headers(CORS);
	obj.writeHttpMetadata(h);
	h.set('etag', obj.httpEtag);
	h.set('accept-ranges', 'bytes');
	h.set('cache-control', 'public, max-age=31536000, immutable');
	const r = obj.range;
	if (r && (r.offset !== undefined || r.length !== undefined || r.suffix !== undefined)) {
		const off = r.suffix !== undefined ? obj.size - r.suffix : (r.offset ?? 0);
		const len = r.suffix !== undefined ? r.suffix : (r.length ?? obj.size - off);
		h.set('content-range', `bytes ${off}-${off + len - 1}/${obj.size}`);
		h.set('content-length', String(len));
		return new Response(obj.body, { status: 206, headers: h });
	}
	h.set('content-length', String(obj.size));
	return new Response(obj.body, { headers: h });
}
