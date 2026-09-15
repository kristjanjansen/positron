// positron-station: one continuous source for a station that is a schedule.
//
// The whole design is in plan-station.md and the measurements behind it are in
// research/station-one-source-2026-09.md. In one paragraph: the station is an
// HLS media playlist whose segments are `#EXT-X-BYTERANGE` ranges into whole
// programme files in R2. This worker writes about 600 bytes of text every
// eleven seconds saying which byte ranges are the next ten seconds of the
// station. No audio passes through it, and no JavaScript runs in the page while
// it plays, which is the only reason it survives a locked iPhone.
//
// 🔴 THE PLAYLIST IS LIVE, NEVER VOD. A `#EXT-X-PLAYLIST-TYPE:VOD` byterange
// playlist made Safari fetch 90 ranges, 14.4 MB, 900 seconds of audio in 463 ms
// before playing a note (MEASURED 2026-09-15 17:17Z). Same audio, same ranges,
// one tag. There is no `#EXT-X-ENDLIST` anywhere in this file and there must
// never be one: a starving playlist that ends is a station that is over.

const SEG_TARGET = 10;   // seconds of audio per segment, before frame alignment
const WINDOW = 6;        // segments in the sliding window
const TARGETDUR = 11;    // #EXT-X-TARGETDURATION, and so the client's reload period

// ------------------------------------------------------------------ retention
//
// 🔴 A LIVE SHOW WRITES ONE R2 OBJECT EVERY TEN SECONDS AND NOTHING USED TO
// DELETE THEM. 360 objects an hour, 160 KB each: 57.6 MB an hour of chunks that
// have already been heard and can never be in a playlist again, because the
// playlist only ever emits the last WINDOW segments. This is a leak measured in
// hours of uptime, not in bugs.
//
// Two rules, and they delete different things:
//
//   1. A live chunk further than KEEP_SEGS from the tail of its slot loses its
//      BYTES. Its entry stays in the slot's list, marked `x`. ⚠️ THE ENTRY MUST
//      STAY: the flattened list's length is the playlist's modulus and every
//      segment's start time is the running sum before it, so dropping a head
//      entry would shorten `n`, move every start time, and make
//      #EXT-X-MEDIA-SEQUENCE go BACKWARDS, which is the one thing a live
//      playlist may never do. The record stays, the audio goes.
//   2. An object under `live/` that no slot's list mentions at all loses
//      everything. That is a chunk from a slot somebody removed from the
//      running order, and nothing can ever reach it again.
//
// ⚠️ RULE 2 NEEDS AN AGE GUARD AND IT IS NOT TIDINESS. `/live/<key>/append`
// puts the object and THEN tells the Durable Object about it; a sweep landing
// between those two lines would delete the chunk a recorder had just uploaded,
// and the recorder would be told nothing. ORPHAN_MIN_AGE is wider than that gap
// by three orders of magnitude.
const KEEP_SEGS = 24;              // live chunks kept as bytes per slot, tail-first
const ORPHAN_MIN_AGE = 60_000;     // ms an unreferenced chunk must survive before it is swept

// ---------------------------------------------------------------- MPEG frames

// MPEG audio Layer III only. A byterange segment has to start on a frame
// boundary: a misaligned one still plays (MEASURED, 1.000x, no audible click),
// but it decodes to slightly less audio than its #EXTINF declares, and a
// wall-clock station turns declared durations into positions, so the shortfall
// accumulates for as long as the station is up.
const BR_V1L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const BR_V2L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
const RATES = [[11025, 12000, 8000], null, [22050, 24000, 16000], [44100, 48000, 32000]];

function frameAt(b, i) {
	if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) return null;
	const ver = (b[i + 1] >> 3) & 3;          // 3 MPEG1, 2 MPEG2, 0 MPEG2.5, 1 reserved
	const layer = (b[i + 1] >> 1) & 3;        // 1 is Layer III
	if (ver === 1 || layer !== 1) return null;
	const brIdx = (b[i + 2] >> 4) & 15;
	const srIdx = (b[i + 2] >> 2) & 3;
	if (brIdx === 0 || brIdx === 15 || srIdx === 3) return null;
	const rate = RATES[ver][srIdx];
	const kbps = (ver === 3 ? BR_V1L3 : BR_V2L3)[brIdx];
	const spf = ver === 3 ? 1152 : 576;
	const len = Math.floor((ver === 3 ? 144 : 72) * kbps * 1000 / rate) + ((b[i + 2] >> 1) & 1);
	if (len < 8) return null;
	return { len, rate, kbps, spf, dur: spf / rate, ch: ((b[i + 3] >> 6) & 3) === 3 ? 1 : 2 };
}

function skipId3(b) {
	if (b.length < 10 || b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return 0;
	const size = ((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f);
	return 10 + size + ((b[5] & 0x10) ? 10 : 0);
}

function isXing(b, p, len) {
	const end = Math.min(p + len, b.length) - 4;
	for (let i = p + 4; i < end; i++) {
		if (b[i] === 0x58 && b[i + 1] === 0x69 && b[i + 2] === 0x6e && b[i + 3] === 0x67) return true; // Xing
		if (b[i] === 0x49 && b[i + 1] === 0x6e && b[i + 2] === 0x66 && b[i + 3] === 0x6f) return true; // Info
	}
	return false;
}

// Walk every frame once and cut segments at frame boundaries. Returns the index
// that gets written beside the object in R2.
export function buildIndex(bytes, target = SEG_TARGET) {
	const b = new Uint8Array(bytes);
	let p = skipId3(b);
	const seg = [];
	let off = -1, len = 0, dur = 0, frames = 0, total = 0;
	let rate = 0, ch = 0, kbps = 0, first = true, resync = 0;
	while (p + 4 <= b.length) {
		const f = frameAt(b, p);
		if (!f) { p++; resync++; continue; }
		if (p + f.len > b.length) break;
		if (first) {
			first = false;
			rate = f.rate; ch = f.ch; kbps = f.kbps;
			if (isXing(b, p, f.len)) { p += f.len; continue; }  // a header frame, not audio
		}
		if (off < 0) { off = p; len = 0; dur = 0; }
		len += f.len; dur += f.dur; total += f.dur; frames++; p += f.len;
		if (dur >= target) { seg.push({ o: off, l: len, d: round6(dur) }); off = -1; }
	}
	// The tail. A programme does not divide evenly into ten seconds, and the
	// remainder is usually a fraction of a frame short of one: fold anything
	// under half a target into the segment before it rather than shipping a
	// 26 ms segment that costs a whole HTTP request.
	if (off >= 0 && len > 0) {
		if (seg.length && dur < target / 2) {
			const prev = seg[seg.length - 1];
			prev.l += len;
			prev.d = round6(prev.d + dur);
		} else {
			seg.push({ o: off, l: len, d: round6(dur) });
		}
	}
	return { bytes: b.length, rate, ch, kbps, frames, resync, dur: round6(total), fmt: `${rate}/${ch}`, seg };
}

const round6 = (n) => Math.round(n * 1e6) / 1e6;

// ------------------------------------------------------------ the schedule DO

// One object owns the running order and the live segment lists. A Durable
// Object rather than KV because "a schedule change takes effect" has to be a
// number, and KV's up-to-60-second propagation makes it one you cannot measure.
export class Schedule {
	constructor(state, env) { this.state = state; this.env = env; }

	async fetch(req) {
		const url = new URL(req.url);
		const op = url.pathname;
		if (op === '/get') return json(await this.read());
		if (op === '/put') {
			const body = await req.json();
			const cur = await this.read();
			const next = {
				epoch: Number.isFinite(body.epoch) ? body.epoch : cur.epoch,
				slots: (body.slots || []).map((s) => ({
					key: String(s.key),
					kind: s.kind === 'live' ? 'live' : 'file',
					open: s.kind === 'live' ? s.open !== false : false,
				})),
				rev: (cur.rev || 0) + 1,
				at: Date.now(),
			};
			await this.state.storage.put('sched', next);
			return json(await this.read());
		}
		if (op === '/append') {
			const { key, uri, dur } = await req.json();
			const list = (await this.state.storage.get(`live:${key}`)) || [];
			list.push({ u: uri, d: round6(dur) });
			await this.state.storage.put(`live:${key}`, list);
			return json({ key, segments: list.length });
		}
		// Mark every live entry further than `keep` from the tail as expired and
		// report the ones that changed. The caller deletes exactly those objects
		// from R2, so a second run reports nothing and deletes nothing: the mark
		// is what makes the sweep idempotent.
		if (op === '/retain') {
			const { keep } = await req.json();
			const cur = (await this.state.storage.get('sched')) || { slots: [] };
			const drop = [], kept = [];
			for (const slot of cur.slots) {
				if (slot.kind !== 'live') continue;
				const list = (await this.state.storage.get(`live:${slot.key}`)) || [];
				const cut = Math.max(0, list.length - keep);
				let changed = false;
				for (let i = 0; i < list.length; i++) {
					if (i < cut) { if (!list[i].x) { list[i].x = 1; drop.push(list[i].u); changed = true; } }
					else kept.push(list[i].u);
				}
				if (changed) await this.state.storage.put(`live:${slot.key}`, list);
			}
			return json({ drop, kept });
		}
		if (op === '/close') {
			const { key } = await req.json();
			const cur = await this.state.storage.get('sched');
			if (cur) {
				for (const s of cur.slots) if (s.key === key) s.open = false;
				cur.rev = (cur.rev || 0) + 1; cur.at = Date.now();
				await this.state.storage.put('sched', cur);
			}
			return json(await this.read());
		}
		return new Response('no', { status: 404 });
	}

	async read() {
		const s = (await this.state.storage.get('sched')) || { epoch: 0, slots: [], rev: 0, at: 0 };
		const live = {};
		for (const slot of s.slots) {
			if (slot.kind !== 'live') continue;
			live[slot.key] = (await this.state.storage.get(`live:${slot.key}`)) || [];
		}
		return { ...s, live };
	}
}

// ------------------------------------------------------------ playlist assembly

// A file slot's index is read from R2 on every playlist request. Held here for
// a few seconds per isolate so a burst of listeners is one read, not a hundred.
const indexCache = new Map();
const INDEX_TTL = 15_000;

async function readIndex(env, key) {
	const hit = indexCache.get(key);
	if (hit && Date.now() - hit.at < INDEX_TTL) return hit.v;
	const obj = await env.MEDIA.get(`index/${key}.json`);
	const v = obj ? await obj.json() : null;
	indexCache.set(key, { at: Date.now(), v });
	return v;
}

// Flatten the schedule into one list of segments with cumulative start times.
// A media playlist has no opinion about where its bytes come from, so a file
// slot and a live slot land in the same list and differ only in how the URI is
// written.
async function flatten(env, sched) {
	const flat = [];
	let t = 0, open = false, missing = [];
	for (const slot of sched.slots) {
		if (slot.kind === 'live') {
			if (slot.open) open = true;
			for (const s of sched.live[slot.key] || []) {
				flat.push({ start: t, dur: s.d, uri: s.u, fmt: 'live', key: slot.key });
				t += s.d;
			}
			continue;
		}
		const idx = await readIndex(env, slot.key);
		if (!idx) { missing.push(slot.key); continue; }
		for (const s of idx.seg) {
			flat.push({ start: t, dur: s.d, uri: `/media/${slot.key}`, off: s.o, len: s.l, fmt: idx.fmt, key: slot.key });
			t += s.d;
		}
	}
	// A join between two segments of unlike encodes needs #EXT-X-DISCONTINUITY.
	// A join between two of the same is free: twelve segments out of three
	// matching files gave one contiguous buffered range (MEASURED).
	const disc = flat.map((s, i) => (i === 0 ? 0 : s.fmt !== flat[i - 1].fmt ? 1 : 0));
	if (flat.length > 1 && flat[0].fmt !== flat[flat.length - 1].fmt) disc[0] = 1; // the wrap
	const cum = [];
	let c = 0;
	for (const d of disc) { cum.push(c); c += d; }
	return { flat, total: t, open, missing, disc, cum, discPerLoop: c };
}

function m3u8(env, sched, f, now) {
	const { flat, total, open, disc, cum, discPerLoop } = f;
	if (!flat.length) return null;
	// An epoch in the future is a station that has not started. Left unclamped
	// it is a negative elapsed, a negative loop number, and a playlist whose
	// window bound sits below its first index, which emits a header and no
	// segments. MEASURED once, by typing a round epoch two minutes ahead.
	const elapsed = Math.max(0, (now - sched.epoch) / 1000);
	const n = flat.length;
	let loop = 0, t = elapsed, edge;
	if (open) {
		// 🔴 A LIVE SLOT'S EDGE IS THE LAST SEGMENT THAT EXISTS, NOT THE WALL
		// CLOCK. A live show is a file that does not exist yet, and the recorder
		// is by construction behind the sound: a ten-second piece can only be
		// written ten seconds after it started. Locating the edge by clock would
		// publish a segment before the recorder had cut it, which is a 404 on
		// the live edge on every single reload. The timeline also does not wrap
		// past an open slot.
		t = Math.max(0, elapsed);
		edge = n - 1;
	} else {
		loop = Math.floor(elapsed / total);
		if (!Number.isFinite(loop) || loop < 0) loop = 0;
		t = elapsed - loop * total;
		edge = locate(flat, t);
	}
	// Never below zero. A looping station's window genuinely does reach back
	// into the previous loop, but before the first one has finished there is no
	// previous loop, and a negative #EXT-X-MEDIA-SEQUENCE is not a decimal
	// integer. A short window at startup is the honest shape.
	const first = Math.max(0, loop * n + edge - WINDOW + 1);
	const lines = [
		'#EXTM3U',
		'#EXT-X-VERSION:7',
		`#EXT-X-TARGETDURATION:${TARGETDUR}`,
		`#EXT-X-MEDIA-SEQUENCE:${first}`,
		`#EXT-X-DISCONTINUITY-SEQUENCE:${Math.floor(first / n) * discPerLoop + cum[((first % n) + n) % n]}`,
	];
	for (let a = first; a <= loop * n + edge; a++) {
		const l = Math.floor(a / n), i = ((a % n) + n) % n;
		const s = flat[i];
		if (disc[i] && a !== first) lines.push('#EXT-X-DISCONTINUITY');
		lines.push(`#EXT-X-PROGRAM-DATE-TIME:${new Date(sched.epoch + (l * total + s.start) * 1000).toISOString()}`);
		lines.push(`#EXTINF:${s.dur.toFixed(6)},${s.key}`);
		if (s.len !== undefined) lines.push(`#EXT-X-BYTERANGE:${s.len}@${s.off}`);
		lines.push(s.uri);
	}
	return lines.join('\n') + '\n';
}

function locate(flat, t) {
	let lo = 0, hi = flat.length - 1;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (flat[mid].start <= t) lo = mid; else hi = mid - 1;
	}
	return lo;
}

// ------------------------------------------------------------------ the worker

const CORS = {
	'access-control-allow-origin': '*',
	'access-control-allow-headers': 'range, authorization, content-type',
	'access-control-expose-headers': 'content-length, content-range, accept-ranges',
};

const json = (v, status = 200) =>
	new Response(JSON.stringify(v, null, 1), { status, headers: { 'content-type': 'application/json', ...CORS } });

function desk(env) {
	return env.SCHEDULE.get(env.SCHEDULE.idFromName('station'));
}

async function call(env, op, body) {
	const r = await desk(env).fetch(`https://schedule${op}`, {
		method: body === undefined ? 'GET' : 'POST',
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	return r.json();
}

function admitted(req, env) {
	if (!env.STATION_TOKEN) return false;
	return req.headers.get('authorization') === `Bearer ${env.STATION_TOKEN}`;
}

// List every object in the bucket. The instrument as well as the route: "prove
// it deletes" needs a number before and a number after, and `wrangler r2 bucket
// info` reports a count that lags by minutes (it read `object_count: 0` against
// a bucket holding six objects).
async function listAll(env, prefix = '') {
	const out = [];
	let cursor;
	do {
		const page = await env.MEDIA.list({ prefix, cursor, limit: 1000 });
		for (const o of page.objects) out.push({ key: o.key, size: o.size, uploaded: o.uploaded });
		cursor = page.truncated ? page.cursor : undefined;
	} while (cursor);
	return out;
}

// The sweep. Returns what it did in both directions, because a cleanup nobody
// is told about cannot be told apart from a leak.
async function sweep(env, now = Date.now()) {
	const before = await listAll(env, 'live/');
	const { drop, kept } = await call(env, '/retain', { keep: KEEP_SEGS });
	// The DO speaks in playlist URIs (`/media/live/…`); R2 speaks in keys.
	const toKey = (u) => u.replace(/^\/media\//, '');
	const dropped = drop.map(toKey);
	const referenced = new Set(kept.map(toKey));
	let aged = 0;
	const orphans = [];
	for (const o of before) {
		if (referenced.has(o.key) || dropped.includes(o.key)) continue;
		// ⚠️ The age guard. An object that appeared in the last minute may be a
		// chunk whose /append has not reached the Durable Object yet.
		if (now - new Date(o.uploaded).getTime() < ORPHAN_MIN_AGE) { aged++; continue; }
		orphans.push(o.key);
	}
	const gone = [...new Set([...dropped, ...orphans])];
	for (let i = 0; i < gone.length; i += 100) await env.MEDIA.delete(gone.slice(i, i + 100));
	const after = await listAll(env, 'live/');
	const bytes = (l) => l.reduce((a, o) => a + o.size, 0);
	return {
		at: new Date(now).toISOString(),
		keep: KEEP_SEGS,
		expired: dropped.length,          // past the tail window: bytes go, record stays
		orphaned: orphans.length,         // no slot mentions them at all
		too_young: aged,                  // the guard held these back
		deleted: gone.length,
		live_objects: { before: before.length, after: after.length },
		live_bytes: { before: bytes(before), after: bytes(after) },
		referenced: referenced.size,
	};
}

export default {
	// Every five minutes. A live show writes six objects a minute, so the worst
	// case between sweeps is thirty chunks over the keep window, about 4.8 MB.
	async scheduled(ev, env, ctx) {
		ctx.waitUntil(sweep(env, ev.scheduledTime || Date.now()).then((r) => console.log('sweep', JSON.stringify(r))));
	},

	async fetch(req, env) {
		const url = new URL(req.url);
		const p = url.pathname;
		if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

		if (p === '/media' || p.startsWith('/media/')) return media(req, env, p.slice('/media/'.length));

		if (p === '/station.m3u8' || p === '/live.m3u8') {
			const sched = await call(env, '/get');
			const f = await flatten(env, sched);
			const body = m3u8(env, sched, f, Date.now());
			if (!body) return new Response('# the schedule is empty\n', { status: 503, headers: { 'content-type': 'application/vnd.apple.mpegurl', ...CORS } });
			return new Response(body, {
				headers: {
					'content-type': 'application/vnd.apple.mpegurl',
					// The window moves with the wall clock. A cached playlist is a
					// station that is stuck in the past.
					'cache-control': 'no-store',
					...CORS,
				},
			});
		}

		if (p === '/now.json') {
			const sched = await call(env, '/get');
			const f = await flatten(env, sched);
			if (!f.flat.length) return json({ error: 'the schedule is empty', missing: f.missing }, 503);
			const elapsed = (Date.now() - sched.epoch) / 1000;
			const loop = f.open ? 0 : Math.floor(elapsed / f.total);
			const t = elapsed - loop * f.total;
			const i = f.open ? f.flat.length - 1 : locate(f.flat, Math.max(0, t));
			const s = f.flat[i];
			return json({
				rev: sched.rev, epoch: sched.epoch, open: f.open, missing: f.missing,
				programme: s.key, into: round6(Math.max(0, t) - s.start),
				segment: i, segments: f.flat.length, loop,
				total: round6(f.total), station_time: round6(t),
				slots: sched.slots.map((x) => ({ ...x, segments: x.kind === 'live' ? (sched.live[x.key] || []).length : undefined })),
			});
		}

		if (p === '/schedule' && req.method === 'GET') return json(await call(env, '/get'));

		// Everything below writes, and writing needs the token.
		if (!admitted(req, env)) {
			return json({ error: env.STATION_TOKEN ? 'bad token' : 'no STATION_TOKEN configured' }, env.STATION_TOKEN ? 401 : 503);
		}

		// The bucket, as it is. Token-gated because it names every key.
		if (p === '/objects' && req.method === 'GET') {
			const l = await listAll(env, url.searchParams.get('prefix') || '');
			return json({ count: l.length, bytes: l.reduce((a, o) => a + o.size, 0), objects: l });
		}

		// The same function the cron runs. A cron cannot be triggered on demand
		// in production, and a retention rule that can only be observed by
		// waiting five minutes is one nobody measures.
		if (p === '/sweep' && req.method === 'POST') return json(await sweep(env));

		if (p === '/schedule' && req.method === 'PUT') {
			const body = await req.json();
			if (!body.epoch) body.epoch = Date.now();
			return json(await call(env, '/put', body));
		}

		// Put a programme in the station: the bytes go to R2 and the frame walk
		// goes beside them. One pass over the object, at ingest, once.
		if (p.startsWith('/programme/') && req.method === 'POST') {
			const key = p.slice('/programme/'.length);
			const bytes = await req.arrayBuffer();
			await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: 'audio/mpeg' } });
			const idx = buildIndex(bytes);
			await env.MEDIA.put(`index/${key}.json`, JSON.stringify(idx), { httpMetadata: { contentType: 'application/json' } });
			indexCache.delete(key);
			return json({ key, ...idx, seg: idx.seg.length });
		}

		if (p.startsWith('/reindex/') && req.method === 'POST') {
			const key = p.slice('/reindex/'.length);
			const obj = await env.MEDIA.get(key);
			if (!obj) return json({ error: 'no such object', key }, 404);
			const idx = buildIndex(await obj.arrayBuffer());
			await env.MEDIA.put(`index/${key}.json`, JSON.stringify(idx), { httpMetadata: { contentType: 'application/json' } });
			indexCache.delete(key);
			return json({ key, ...idx, seg: idx.seg.length });
		}

		// One live chunk, as the recorder cuts it. The recorder is the segmenter:
		// it is already running an ffmpeg against the mount, and a second output
		// writing ten-second pieces costs it nothing it is not already paying.
		if (p.startsWith('/live/') && p.endsWith('/append') && req.method === 'POST') {
			const key = p.slice('/live/'.length, -'/append'.length);
			const bytes = await req.arrayBuffer();
			const idx = buildIndex(bytes, 1e9);   // one piece, walked for its true duration
			const seq = Number(url.searchParams.get('seq') ?? Date.now());
			const uri = `live/${key}/${String(seq).padStart(6, '0')}.mp3`;
			await env.MEDIA.put(uri, bytes, { httpMetadata: { contentType: 'audio/mpeg' } });
			const r = await call(env, '/append', { key, uri: `/media/${uri}`, dur: idx.dur });
			return json({ ...r, dur: idx.dur, bytes: bytes.byteLength, uri: `/media/${uri}` });
		}

		if (p.startsWith('/live/') && p.endsWith('/close') && req.method === 'POST') {
			return json(await call(env, '/close', { key: p.slice('/live/'.length, -'/close'.length) }));
		}

		return json({ error: 'no such route', path: p }, 404);
	},
};

async function media(req, env, key) {
	if (!key) return json({ error: 'no key' }, 404);
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
