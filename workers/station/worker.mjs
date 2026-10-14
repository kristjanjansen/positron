// positron-station: GET /media/<key> out of its bucket (MIM videos and pictures, kristjanjansen/).
// The radio station moved to eccm (src/station/station.mjs there). The name stays so URLs keep
// working; Range requests answer 206, which the videos need for seeking.
// why: lessons/workers-station.md#door

import { OPEN } from '../_lib/http.mjs';

const CORS = {
	...OPEN,
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
	// archive/ here is cold storage, not media, and this door is the bucket's only public route.
	// Read it with `wrangler r2 object get --remote`.
	// why: lessons/workers-station.md#archive-prefix
	let name;
	try { name = decodeURIComponent(key); } catch { return new Response('bad escape in key\n', { status: 400, headers: CORS }); }
	if (name.replace(/^\/+/, '').startsWith('archive/')) return new Response('no such object\n', { status: 404, headers: CORS });
	let obj;
	// R2 throws on a range it cannot satisfy rather than answering null.
	try { obj = await env.MEDIA.get(name, { range: req.headers }); } catch { return new Response('range not satisfiable\n', { status: 416, headers: CORS }); }
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
