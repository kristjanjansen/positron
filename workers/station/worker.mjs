// positron-station: one continuous source for a station that is a schedule.
//
// The whole design is in plans/plan-station.md and the measurements behind it are in
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
// The sliding window, in SECONDS rather than in segments. It was six segments,
// which is sixty seconds of ten-second files and 11.5 s of a relay's 1.92 s
// ones, under a TARGETDURATION of 11: Apple's rule is that a live playlist
// holds at least three target durations, and a player reloading every eleven
// seconds against an 11.5 s window can fall off the back of it. Counting back
// from the edge until sixty seconds are covered gives six of today's segments,
// exactly as before, and keeps MEDIA-SEQUENCE monotonic because every
// duration is positive and the edge only moves forward.
const WINDOW_S = 60;
const TARGETDUR = 11;    // the floor for #EXT-X-TARGETDURATION; see m3u8()

// ------------------------------------------------------------------ relay slots
//
// A `relay` slot plays somebody else's live stream inside this station's one
// playlist. The playlist itself never reads the upstream: each relay entry is a
// URI on this worker, `/relay/<key>/<loop>/<k>.<ext>`, fixed by its position in
// the loop, so a reload can never give one media sequence number two
// addresses. Only the Schedule object talks to the upstream, once for every
// listener at once.
//
// 🔴 WHAT A RELAY SLOT'S DURATION MEANS: it is a window onto the upstream's
// live edge, `dur` seconds long, every time the loop comes round. It is not a
// recording and it does not resume where it left off: in each loop it plays
// whatever the upstream is broadcasting at that wall-clock moment, a little
// behind it. It is declared as a fixed number of `seg`-second entries, so the
// loop has a length before anybody has asked the upstream anything.
//
// Two kinds of source, chosen by the URL:
//
//   ICECAST MP3 (anything not ending .m3u8). The object is the recorder: it
//   holds ONE connection to the mount while somebody is listening, cuts it
//   into pieces of whole MPEG frames as it arrives, and gives each piece to the
//   next entry of the slot that has not been listed yet. An entry that got no
//   piece (nobody was listening when it was due, the upstream stalled, the
//   object was evicted) answers silence of the right length, so a player is
//   never handed a hole. The connection is opened by a playlist request that
//   finds the slot within RELAY_LEAD seconds, and closed RELAY_IDLE ms after
//   the last such request, so a station nobody listens to opens nothing.
//
//   HLS (.m3u8). Entry k of loop l is upstream media sequence `base + k`, the
//   ANCHOR, set the first time a segment of that loop is asked for, as
//   `upstream edge - RELAY_SLACK - (the entry the station clock is in now)`.
//   ⚠️ IT IS BUILT AND DOES NOT SUIT ERR. ERR's live.err.ee radio is AAC in
//   MPEG-TS, and hls.js 1.7.1 cannot follow an MP3 programme with AAC in one
//   MediaSource: an MP3 SourceBuffer is created as `audio/mpeg` with an EMPTY
//   codec string, its codec switch only runs when both codecs are non-empty,
//   so `changeType` is never called and every AAC append afterwards is
//   `bufferAppendNoProgress`. MEASURED locally 2026-10-01 with
//   `demo/fake-err.mjs --radio`: the playhead sat at 29.97 s, the end of the
//   MP3, for fifty seconds. So ERR goes in through its Icecast MP3, which is
//   the station's own format; this path is for an upstream whose HLS matches.
const RELAY_DUR = 600;         // default slot length in the loop, seconds
const RELAY_SEG_HLS = 1.92;    // ERR's live.err.ee segment duration (research/err-live-feeds-2026-08.md)
const RELAY_SEG_MP3 = 383 * 1152 / 44100;   // 10.004898 s, 383 whole frames at 44.1 kHz
const RELAY_BW = 130_000;      // which rung of a master playlist to take, nearest wins
const RELAY_SLACK = 3;         // HLS: segments kept between our edge and the upstream's
const RELAY_PL_TTL = 1000;     // HLS: ms an upstream playlist is reused before it is fetched again
const RELAY_KEEP = 64;         // segments or pieces held in the object's memory
const RELAY_LEAD = 25;         // MP3: seconds before the slot that a listener's playlist opens the mount
const RELAY_IDLE = 20_000;     // MP3: ms without a listener's playlist before the mount is closed

// ------------------------------------------------------------------ retention
//
// 🔴 A LIVE SHOW WRITES ONE R2 OBJECT EVERY TEN SECONDS AND NOTHING USED TO
// DELETE THEM. 360 objects an hour, 160 KB each: 57.6 MB an hour of chunks that
// have already been heard and can never be in a playlist again, because the
// playlist only ever emits the last WINDOW_S seconds. This is a leak measured in
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

// ------------------------------------------------------------------- ID3 tags
//
// A programme's own words about itself, read once at ingest: the ID3v2 tag at
// the head of the file and the 128-byte ID3v1 tag at its tail, whichever exist.
// Asked 2026-10-01: a record is filled "from the file's ID3 tags on upload
// (TIT2 title, TPE1 artist, COMM comment, and anything else useful)". So every
// text frame, comment, user text frame and link is kept, under `meta.id3`, and
// three of them become fixed fields: TIT2 the title, TPE1 (else TPE2) who, COMM
// the description. A picture is recorded as its type and size, not its bytes:
// a record is a row in a table, and a cover belongs in the bucket.
//
// ⚠️ WRITTEN FROM THE ID3v2.3 AND v2.4 SPECIFICATIONS AND TESTED HERE AGAINST
// TAGS ffmpeg WRITES (v2.4, UTF-8 and ISO-8859-1). A v2.2 tag, a UTF-16 tag
// from another tagger and unsynchronisation are handled by the same code and
// were not measured on a real file.

const ID3_KEEP = 2000;   // characters kept of any one value
const ID3_V22 = { TT2: 'TIT2', TP1: 'TPE1', TP2: 'TPE2', TAL: 'TALB', TYE: 'TYER', TCO: 'TCON',
	TRK: 'TRCK', COM: 'COMM', TXX: 'TXXX', WXX: 'WXXX', PIC: 'APIC', TCM: 'TCOM', TT3: 'TIT3', TEN: 'TENC', TSS: 'TSSE' };

// Text in one of ID3's four encodings. Decoded by hand for ISO-8859-1 and
// UTF-16, so nothing rests on which labels a runtime's TextDecoder knows.
function id3Text(b, enc) {
	if (enc === 3) return new TextDecoder().decode(b);
	if (enc === 1 || enc === 2) {
		let le = enc === 1, i = 0;
		if (enc === 1 && b.length >= 2) {
			if (b[0] === 0xff && b[1] === 0xfe) { le = true; i = 2; }
			else if (b[0] === 0xfe && b[1] === 0xff) { le = false; i = 2; }
		}
		let s = '';
		for (; i + 1 < b.length; i += 2) s += String.fromCharCode(le ? b[i] | (b[i + 1] << 8) : (b[i] << 8) | b[i + 1]);
		return s;
	}
	let s = '';
	for (const c of b) s += String.fromCharCode(c);
	return s;
}

// Where the terminator of a string starting at `i` is: one zero byte, or two
// on a two-byte boundary for UTF-16. Returns [end, next].
function id3Term(b, i, enc) {
	if (enc === 1 || enc === 2) {
		for (let j = i; j + 1 < b.length; j += 2) if (b[j] === 0 && b[j + 1] === 0) return [j, j + 2];
		return [b.length, b.length];
	}
	const j = b.indexOf(0, i);
	return j < 0 ? [b.length, b.length] : [j, j + 1];
}

const id3Clean = (s) => s.replace(/\0+$/g, '').replace(/\0/g, ' / ').trim().slice(0, ID3_KEEP);
const unsync = (b) => {
	const out = [];
	for (let i = 0; i < b.length; i++) { out.push(b[i]); if (b[i] === 0xff && b[i + 1] === 0) i++; }
	return new Uint8Array(out);
};
const synchsafe = (b, i) => ((b[i] & 0x7f) << 21) | ((b[i + 1] & 0x7f) << 14) | ((b[i + 2] & 0x7f) << 7) | (b[i + 3] & 0x7f);

// `head` is the start of the file (the whole tag, at least); `tail` its last
// 128 bytes, or null. Returns null when neither holds a tag.
export function readId3(head, tail = null) {
	const out = {};
	const b0 = new Uint8Array(head);
	if (b0.length >= 10 && b0[0] === 0x49 && b0[1] === 0x44 && b0[2] === 0x33) {
		const ver = b0[3], flags = b0[5];
		let tag = b0.subarray(10, Math.min(b0.length, 10 + synchsafe(b0, 6)));
		if ((flags & 0x80) && ver < 4) tag = unsync(tag);
		let p = 0;
		if (flags & 0x40) p = ver === 3 ? 4 + ((tag[0] << 24) | (tag[1] << 16) | (tag[2] << 8) | tag[3]) : ver >= 4 ? synchsafe(tag, 0) : 0;
		out.version = `2.${ver}`;
		const idLen = ver === 2 ? 3 : 4, hdr = ver === 2 ? 6 : 10;
		while (p + hdr <= tag.length && tag[p] !== 0) {
			let id = id3Text(tag.subarray(p, p + idLen), 0);
			const size = ver === 2 ? (tag[p + 3] << 16) | (tag[p + 4] << 8) | tag[p + 5]
				: ver >= 4 ? synchsafe(tag, p + 4) : ((tag[p + 4] << 24) | (tag[p + 5] << 16) | (tag[p + 6] << 8) | tag[p + 7]) >>> 0;
			const fmt = ver >= 3 ? tag[p + 9] : 0;
			let d = tag.subarray(p + hdr, Math.min(tag.length, p + hdr + size));
			p += hdr + size;
			if (!/^[A-Z0-9]+$/.test(id) || size <= 0) break;
			if (ver === 2) id = ID3_V22[id] || id;
			// compressed or encrypted frames (v2.3 0x80/0x40, v2.4 0x08/0x04) are skipped
			if ((ver === 3 && (fmt & 0xc0)) || (ver >= 4 && (fmt & 0x0c))) continue;
			if (ver >= 4 && (fmt & 0x02)) d = unsync(d);
			if (ver >= 4 && (fmt & 0x01)) d = d.subarray(4);
			try { id3Frame(out, id, d); } catch { /* one bad frame is not a bad tag */ }
		}
	}
	const t = tail ? new Uint8Array(tail) : null;
	if (t && t.length >= 128 && t[t.length - 128] === 0x54 && t[t.length - 127] === 0x41 && t[t.length - 126] === 0x47) {
		const v1 = t.subarray(t.length - 128);
		const f = (a, n) => id3Clean(id3Text(v1.subarray(a, a + n), 0)).replace(/\s+$/, '');
		const one = { title: f(3, 30), artist: f(33, 30), album: f(63, 30), year: f(93, 4), comment: f(97, v1[125] === 0 && v1[126] ? 28 : 30) };
		for (const k of Object.keys(one)) if (!one[k]) delete one[k];
		if (Object.keys(one).length) out.v1 = one;
	}
	return Object.keys(out).length > (out.version ? 1 : 0) || out.v1 ? out : null;
}

function id3Frame(out, id, d) {
	const add = (k, v) => { if (v) out[k] = out[k] ? `${out[k]} / ${v}` : v; };
	if (id === 'TXXX' || id === 'WXXX') {
		const enc = d[0];
		const [e, n] = id3Term(d, 1, enc);
		const desc = id3Clean(id3Text(d.subarray(1, e), enc));
		const val = id === 'TXXX' ? id3Clean(id3Text(d.subarray(n), enc)) : id3Clean(id3Text(d.subarray(n), 0));
		add(`${id}:${desc}`, val);
	} else if (id[0] === 'T') {
		add(id, id3Clean(id3Text(d.subarray(1), d[0])));
	} else if (id === 'COMM' || id === 'USLT') {
		const enc = d[0];
		const [e, n] = id3Term(d, 4, enc);
		const desc = id3Clean(id3Text(d.subarray(4, e), enc));
		add(desc ? `${id}:${desc}` : id, id3Clean(id3Text(d.subarray(n), enc)));
	} else if (id[0] === 'W') {
		add(id, id3Clean(id3Text(d, 0)));
	} else if (id === 'APIC') {
		const mEnd = d.indexOf(0, 1);
		out.APIC = { mime: id3Text(d.subarray(1, mEnd), 0), type: d[mEnd + 1], bytes: d.length };
	}
}

// The three fixed fields a tag can fill, from the frames above.
function id3Fields(id3) {
	if (!id3) return {};
	// COMM is the frame the standard names; ffmpeg's `-metadata comment=` writes
	// `TXXX:comment` instead (MEASURED here, ffmpeg 9.0.1), so both count.
	const comm = id3.COMM || Object.entries(id3).find(([k]) => k.startsWith('COMM:'))?.[1]
		|| id3['TXXX:comment'] || id3['TXXX:COMMENT'] || id3['TXXX:description'];
	return {
		title: id3.TIT2 || id3.v1?.title || null,
		who: id3.TPE1 || id3.TPE2 || id3.v1?.artist || null,
		description: comm || id3.v1?.comment || null,
	};
}

// ------------------------------------------------------------ the schedule DO

// One object owns the running order and the live segment lists. A Durable
// Object rather than KV because "a schedule change takes effect" has to be a
// number, and KV's up-to-60-second propagation makes it one you cannot measure.
export class Schedule {
	constructor(state, env) {
		this.state = state; this.env = env;
		// Per relay slot, in memory only: the chosen variant, the last upstream
		// playlist and the segments already fetched. Losing it to an eviction
		// costs one master fetch and one playlist fetch, nothing else.
		this.up = new Map();
		// Per Icecast relay slot: the one open connection, the frames not yet
		// cut, and the pieces already given to entries. Memory only, on purpose:
		// a piece is heard within a minute or never.
		this.ice = new Map();
	}

	async fetch(req) {
		const url = new URL(req.url);
		const op = url.pathname;
		if (op === '/get') return json(await this.read());
		if (op === '/relay') return this.relay(await req.json());
		if (op === '/warm') return this.warm(await req.json());
		if (op === '/put') {
			const body = await req.json();
			const cur = await this.read();
			try { (body.slots || []).forEach(slotOf); } catch (e) { return json({ error: e.message }, 400); }
			const next = {
				epoch: Number.isFinite(body.epoch) ? body.epoch : cur.epoch,
				slots: (body.slots || []).map(slotOf),
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

	// One relay segment: entry `k` of loop `loop` in slot `key`. `kNow` is the
	// entry the station clock is in for that loop, computed by the caller from
	// the same flatten() the playlist uses, and it is only read when this loop
	// has no anchor yet.
	async relay({ key, loop, k, kNow }) {
		const sched = (await this.state.storage.get('sched')) || { slots: [] };
		const slot = sched.slots.find((s) => s.kind === 'relay' && s.key === key);
		if (!slot) return relayErr(404, `no relay slot ${key}`);
		if (slot.via === 'mp3') return this.piece(slot, loop, k);
		const up = this.upFor(slot);
		try {
			const anchors = (await this.state.storage.get(`relay:${key}`)) || {};
			let base = anchors[loop];
			if (base === undefined) {
				const pl = await this.playlist(slot, up, 0);
				if (!pl.segs.length) return relayErr(503, 'the upstream playlist has no segments');
				base = pl.segs[pl.segs.length - 1].sn - RELAY_SLACK - kNow;
				anchors[loop] = base;
				// Three loops of anchors is every loop a player's window can reach.
				for (const l of Object.keys(anchors)) if (Number(l) < loop - 2) delete anchors[l];
				await this.state.storage.put(`relay:${key}`, anchors);
			}
			return await this.segment(slot, up, base + k);
		} catch (e) {
			return relayErr(502, String(e.message || e));
		}
	}

	// A listener's playlist has found an Icecast relay slot within RELAY_LEAD
	// seconds, or inside it. Open the mount if it is not open, and remember when
	// somebody last wanted it: the reader closes itself RELAY_IDLE after that.
	async warm({ key, epoch, total, start, n }) {
		const sched = (await this.state.storage.get('sched')) || { slots: [] };
		const slot = sched.slots.find((s) => s.kind === 'relay' && s.key === key && s.via === 'mp3');
		if (!slot) return json({ key, open: false, why: 'no such Icecast relay slot' }, 404);
		let st = this.ice.get(key);
		if (!st || st.src !== slot.src) {
			if (st?.reader) try { st.reader.cancel(); } catch { /* gone */ }
			st = { src: slot.src, reader: null, opening: null, lastWarm: 0, cur: [], curFrames: 0,
			       fmt: null, prev: null, pieces: new Map(), timing: null, opened: 0, closed: 0 };
			this.ice.set(key, st);
		}
		st.timing = { epoch, total, start, n, seg: slot.seg };
		st.lastWarm = Date.now();
		if (!st.reader && !st.opening) {
			st.opening = (async () => {
				try {
					// 🔴 NO `Icy-MetaData` HEADER, SO THE MOUNT SENDS AUDIO AND NOTHING
					// ELSE. Asking for titles would interleave a metadata block every
					// `icy-metaint` bytes, which the frame walk below would have to
					// strip; this slot has no use for them.
					const r = await fetch(slot.src, { headers: { 'user-agent': 'positron-station relay (+https://positron.studio/station/)' } });
					if (r.status >= 300 || !r.body) { try { await r.body?.cancel(); } catch { /* gone */ } return; }
					st.reader = r.body.getReader();
					st.opened++;
					this.pump(st);
				} catch { /* the next listener's playlist tries again */ }
				finally { st.opening = null; }
			})();
			await st.opening;
		}
		return json({ key, open: !!st.reader, pieces: st.pieces.size, opened: st.opened });
	}

	// Read the mount and cut it into pieces of whole frames, `seg` seconds each.
	// ⚠️ NOT AWAITED by warm(): a mount never ends, and a request that awaited
	// it would never answer.
	async pump(st) {
		const reader = st.reader;
		let buf = new Uint8Array(0);
		try {
			for (;;) {
				if (Date.now() - st.lastWarm > RELAY_IDLE) break;   // nobody is listening
				const { value, done } = await reader.read();
				if (done) break;
				const next = new Uint8Array(buf.length + value.length);
				next.set(buf); next.set(value, buf.length);
				buf = next;
				let p = 0;
				while (p + 4 <= buf.length) {
					const f = frameAt(buf, p);
					if (!f) { p++; continue; }
					// A header is believed only when the next one is where it says.
					// A join into the middle of a stream starts mid-frame, and four
					// bytes of audio can look like a header.
					if (p + f.len + 4 > buf.length) break;
					if (!frameAt(buf, p + f.len)) { p++; continue; }
					if (!st.fmt) st.fmt = { rate: f.rate, ch: f.ch, kbps: f.kbps };
					st.cur.push(buf.slice(p, p + f.len));
					st.curFrames++;
					p += f.len;
					if (st.curFrames >= Math.max(1, Math.round((st.timing.seg * f.rate) / f.spf))) {
						this.place(st, concat(st.cur));
						st.cur = []; st.curFrames = 0;
					}
				}
				buf = buf.slice(p);
			}
		} catch { /* the mount hung up; the next listener's playlist opens it again */ }
		try { await reader.cancel(); } catch { /* already gone */ }
		st.reader = null; st.cur = []; st.curFrames = 0; st.closed++;
	}

	// Give a finished piece to the next entry of the slot that has not been
	// listed yet. An entry is listed when the station clock reaches its start,
	// so a piece placed at or before that moment is final for every listener.
	place(st, bytes) {
		const { epoch, total, start, n, seg } = st.timing;
		const now = Date.now();
		const into = (now - epoch) / 1000;
		let L = Math.floor(into / total);
		let k = Math.ceil((into - L * total - start) / seg - 1e-9);
		if (k < 0) k = 0;
		if (k >= n) { L++; k = 0; }
		// Normally the entry after the last one filled; later than that only if
		// the mount fell behind, and then the entries skipped answer silence.
		if (st.prev) {
			let pl = st.prev.l, pk = st.prev.k + 1;
			if (pk >= n) { pl++; pk = 0; }
			if (pl > L || (pl === L && pk > k)) { L = pl; k = pk; }
		}
		const due = epoch + (L * total + start + k * seg) * 1000;
		// More than a piece early is audio from before the slot began, which
		// nobody will hear: dropped, and the slot starts with the next one.
		if (due - now > seg * 1000) return;
		st.pieces.set(`${L}:${k}`, bytes);
		st.prev = { l: L, k };
		while (st.pieces.size > RELAY_KEEP) st.pieces.delete(st.pieces.keys().next().value);
	}

	piece(slot, loop, k) {
		const st = this.ice.get(slot.key);
		const got = st?.pieces.get(`${loop}:${k}`);
		const bytes = got || silence(st?.fmt, slot.seg);
		return new Response(bytes, { headers: { 'content-type': 'audio/mpeg', 'x-relay': got ? 'live' : 'silence' } });
	}

	upFor(slot) {
		let up = this.up.get(slot.key);
		// A schedule PUT can point the same key at another source.
		if (!up || up.src !== slot.src) {
			up = { src: slot.src, variant: null, pl: null, plAt: 0, plWait: null, segs: new Map() };
			this.up.set(slot.key, up);
		}
		return up;
	}

	// The upstream media playlist, at most RELAY_PL_TTL old, or fresher than
	// `newer` ms if the caller is waiting for a segment that was not in it.
	async playlist(slot, up, newer) {
		const age = Date.now() - up.plAt;
		if (up.pl && age < RELAY_PL_TTL && (!newer || age < newer)) return up.pl;
		if (up.plWait) return up.plWait;
		up.plWait = (async () => {
			try {
				for (let attempt = 0; attempt < 2; attempt++) {
					// 🔴 THE MASTER IS READ ONCE AND ITS VARIANT KEPT. ERR mints a
					// session `?id=` on every master fetch and answers a bare or
					// stale variant URL with 400, so the master is fetched again
					// only when the variant stops answering. One session for the
					// whole station is one listener at the broadcaster, not one per
					// visitor.
					if (!up.variant) up.variant = await pickVariant(slot);
					const r = await fetch(up.variant, { headers: { 'user-agent': 'positron-station relay' } });
					const text = await r.text();
					if (r.status >= 400 || !text.startsWith('#EXTM3U')) {
						up.variant = null;
						if (attempt) throw new Error(`upstream playlist answered ${r.status}`);
						continue;
					}
					const pl = parseMedia(text, up.variant);
					if (pl.map) throw new Error('the upstream is fMP4 (#EXT-X-MAP); a relay slot takes MPEG-TS or packed audio');
					up.pl = pl; up.plAt = Date.now();
					return pl;
				}
			} finally { up.plWait = null; }
		})();
		return up.plWait;
	}

	async segment(slot, up, sn) {
		const hit = up.segs.get(sn);
		if (hit) return relayOk(await hit);
		let pl = await this.playlist(slot, up, 0);
		let s = pl.segs.find((x) => x.sn === sn);
		// Ahead of the upstream: look once more with a fresh playlist, then say
		// so with a 503 that hls.js retries, never with a guess.
		if (!s && pl.segs.length && sn > pl.segs[pl.segs.length - 1].sn) {
			pl = await this.playlist(slot, up, 400);
			s = pl.segs.find((x) => x.sn === sn);
		}
		if (!s) {
			const lo = pl.segs[0]?.sn, hi = pl.segs[pl.segs.length - 1]?.sn;
			return relayErr(sn > hi ? 503 : 410, `upstream segment ${sn} is not in ${lo}..${hi}`);
		}
		const p = (async () => {
			const r = await fetch(s.uri, { headers: { 'user-agent': 'positron-station relay' } });
			if (r.status >= 300) throw new Error(`upstream segment answered ${r.status}`);
			return { bytes: await r.arrayBuffer(), type: r.headers.get('content-type') || 'video/mp2t' };
		})();
		up.segs.set(sn, p);
		while (up.segs.size > RELAY_KEEP) up.segs.delete(up.segs.keys().next().value);
		try { return relayOk(await p); } catch (e) { up.segs.delete(sn); throw e; }
	}
}

// ------------------------------------------------------------ the library DO
//
// What the station plays, described, and which channels it has. Decided
// 2026-10-01 with the owner: the station is ECCM's but "freeflowing stuff,
// its sometimes randomly generated, user contributed, elastic medium", "no
// link to fancy events eccm puts out", so its programme data lives HERE, with
// the station, and not in eccm's D1. Then: "Note we run multiple channels",
// and "Can be n channels".
//
// 🔴 ONE OBJECT, `idFromName('library')`, A SQLITE TABLE PER THING, AND THAT IS
// THE DECISION RATHER THAN A DEFAULT. Three shapes were weighed:
//   - a record inside each channel's Schedule object. Refused: one file plays
//     on several channels, so a title edited on one channel would be stale on
//     the other, and the copies would drift exactly where a listener reads them.
//   - a JSON object in R2 beside each file. Refused: an edit is read, change,
//     write with no lock, two writers lose one edit silently, and listing every
//     programme is one GET per programme.
//   - one object holding one table. Taken: an edit is one UPDATE, a list is one
//     SELECT, the channel registry sits in the same place because a Durable
//     Object namespace cannot be enumerated (positron-streaming says so, from
//     `workers/store`), and it is read off the playlist path entirely: the
//     playlist needs only the frame index in R2, so a slow library can stale a
//     title and can never stop the sound.
// ⚠️ ONE OBJECT IS ONE THREAD. Every /now.json asks it for a few rows; that is
// why the worker holds what it read for LIB_TTL per isolate. A library of tens
// of thousands of rows or hundreds of requests a second would want that cache
// widened before it wanted another shape.
const PROGRAMME_KINDS = ['file', 'live', 'relay', 'generated'];
const FILL_ALWAYS = new Set(['id3', 'format', 'src']);

export class Library {
	constructor(state, env) {
		this.state = state; this.env = env;
		this.sql = state.storage.sql;
		this.sql.exec(`CREATE TABLE IF NOT EXISTS programmes (
			key TEXT PRIMARY KEY, title TEXT, who TEXT, kind TEXT NOT NULL DEFAULT 'file',
			duration REAL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
			meta TEXT NOT NULL DEFAULT '{}')`);
		this.sql.exec(`CREATE TABLE IF NOT EXISTS channels (
			name TEXT PRIMARY KEY, title TEXT, created_at INTEGER NOT NULL)`);
		// The channel that was the whole station until 2026-10-01. Registered from
		// the start, so /channels.json is never empty and never omits it.
		this.sql.exec(`INSERT OR IGNORE INTO channels (name, title, created_at) VALUES (?, NULL, 0)`, DEFAULT_CHANNEL);
	}

	async fetch(req) {
		const op = new URL(req.url).pathname;
		const body = req.method === 'POST' ? await req.json() : {};
		if (op === '/programmes') return json(this.sql.exec('SELECT * FROM programmes ORDER BY key').toArray().map(rowOf));
		if (op === '/pick') {
			const keys = [...new Set(body.keys || [])];
			if (!keys.length) return json([]);
			return json(this.sql.exec(`SELECT * FROM programmes WHERE key IN (${keys.map(() => '?').join(',')})`, ...keys).toArray().map(rowOf));
		}
		if (op === '/write') return this.write(body);
		if (op === '/channels') return json(this.sql.exec('SELECT name, title, created_at FROM channels ORDER BY created_at, name').toArray());
		if (op === '/channel') {
			const { name, title, create } = body;
			const had = this.sql.exec('SELECT name FROM channels WHERE name = ?', name).toArray().length > 0;
			if (!had && !create) return json({ error: `no channel ${name}` }, 404);
			if (!had) this.sql.exec('INSERT INTO channels (name, title, created_at) VALUES (?, ?, ?)', name, title ?? null, Date.now());
			else if (title !== undefined) this.sql.exec('UPDATE channels SET title = ? WHERE name = ?', title, name);
			return json({ ...this.sql.exec('SELECT name, title, created_at FROM channels WHERE name = ?', name).one(), created: !had });
		}
		return new Response('no', { status: 404 });
	}

	// One record, created or changed. `mode` decides who wins over what is there:
	//   'edit'  a person's PUT: every field given replaces the stored one, and a
	//           `meta` key set to null is removed.
	//   'fill'  an upload or the backfill: title and who are written only where
	//           the record has none, so a hand edit is never undone by a file's
	//           tags; kind and duration are the file's facts and always land.
	write({ key, fields = {}, mode = 'edit' }) {
		const now = Date.now();
		const cur = this.sql.exec('SELECT * FROM programmes WHERE key = ?', key).toArray()[0];
		const was = cur ? rowOf(cur) : { key, title: null, who: null, kind: 'file', duration: null, created_at: now, meta: {} };
		const next = { ...was, meta: { ...was.meta } };
		for (const f of ['title', 'who', 'kind', 'duration']) {
			if (fields[f] === undefined) continue;
			if (mode === 'fill' && was[f] != null && !(f === 'duration' || f === 'kind')) continue;
			next[f] = fields[f];
		}
		for (const [k, v] of Object.entries(fields.meta || {})) {
			// What the file or the slot says about itself (its tags, its format, a
			// relay's source) is refreshed by every fill; anything else a fill
			// brings, a description from a tag, only lands where there is none.
			if (mode === 'fill' && !FILL_ALWAYS.has(k) && next.meta[k] !== undefined) continue;
			if (v === null) delete next.meta[k]; else next.meta[k] = v;
		}
		const meta = JSON.stringify(next.meta);
		if (meta.length > 65536) return json({ error: `meta is ${meta.length} bytes, the most is 65536`, key }, 413);
		this.sql.exec(`INSERT INTO programmes (key, title, who, kind, duration, created_at, updated_at, meta)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(key) DO UPDATE SET title = excluded.title, who = excluded.who, kind = excluded.kind,
			duration = excluded.duration, updated_at = excluded.updated_at, meta = excluded.meta`,
			key, next.title, next.who, next.kind, next.duration, was.created_at, now, meta);
		return json({ ...rowOf(this.sql.exec('SELECT * FROM programmes WHERE key = ?', key).one()), created: !cur });
	}
}

// The free fields stay under `meta` rather than beside the fixed ones, so a
// tag or a generator writing `title` into its free JSON can never shadow the
// record's own title.
const rowOf = (r) => ({
	key: r.key, title: r.title, who: r.who, kind: r.kind, duration: r.duration,
	created_at: r.created_at, updated_at: r.updated_at, meta: JSON.parse(r.meta || '{}'),
});

const concat = (parts) => {
	const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
	let o = 0;
	for (const p of parts) { out.set(p, o); o += p.length; }
	return out;
};

// `seg` seconds of digital silence as MPEG audio frames in the mount's own
// format, or 44.1 kHz stereo 128 kbit/s (ERR's) before a frame has been seen.
// A frame whose side information is all zero has no coded samples, and every
// decoder renders it as silence. It stands in for an entry that got no piece,
// so a player meets a quiet stretch rather than a 404 it may give up on.
function silence(fmt, seg) {
	let { rate = 44100, ch = 2, kbps = 128 } = fmt || {};
	let v1 = rate >= 32000;
	let srIdx = (v1 ? [44100, 48000, 32000] : [22050, 24000, 16000]).indexOf(rate);
	let brIdx = (v1 ? BR_V1L3 : BR_V2L3).indexOf(kbps);
	if (srIdx < 0 || brIdx <= 0) { rate = 44100; ch = 2; kbps = 128; v1 = true; srIdx = 0; brIdx = 9; }
	const spf = v1 ? 1152 : 576;
	const len = Math.floor(((v1 ? 144 : 72) * kbps * 1000) / rate);
	const frame = new Uint8Array(len);
	frame[0] = 0xff;
	frame[1] = v1 ? 0xfb : 0xf3;                 // MPEG-1 or -2, Layer III, no CRC
	frame[2] = (brIdx << 4) | (srIdx << 2);
	frame[3] = (ch === 1 ? 3 : 0) << 6;          // stereo, or mono
	const frames = Math.max(1, Math.round((seg * rate) / spf));
	const out = new Uint8Array(len * frames);
	for (let i = 0; i < frames; i++) out.set(frame, i * len);
	return out;
}

const relayOk = ({ bytes, type }) => new Response(bytes, { headers: { 'content-type': type } });
const relayErr = (status, why) => new Response(`${why}\n`, { status, headers: { 'content-type': 'text/plain' } });

// One schedule entry, normalised. A relay slot's source is CONFIG, written by
// the token-holding PUT and nowhere else: the proxy route only ever fetches a
// URL some slot names, so it cannot be turned into an open proxy.
function slotOf(s) {
	const key = String(s.key);
	const title = s.title ? String(s.title).slice(0, 120) : undefined;
	// `who` beside `title`, a running order's own label for a slot. The
	// programme's record wins over both when it has one (titleOf, whoOf).
	const who = s.who ? String(s.who).slice(0, 120) : undefined;
	const label = { ...(title ? { title } : {}), ...(who ? { who } : {}) };
	if (s.kind === 'relay') {
		let src;
		try { src = new URL(String(s.src)); } catch { throw new Error(`relay slot ${key} needs src, an Icecast mount or an HLS playlist URL`); }
		if (!/^https?:$/.test(src.protocol)) throw new Error(`relay slot ${key}: src must be http or https`);
		const via = /\.m3u8$/i.test(src.pathname) ? 'hls' : 'mp3';
		const dur = Number(s.dur) > 0 ? Number(s.dur) : RELAY_DUR;
		const seg = Number(s.seg) > 0 ? Number(s.seg) : via === 'hls' ? RELAY_SEG_HLS : RELAY_SEG_MP3;
		const bw = Number(s.bw) > 0 ? Number(s.bw) : RELAY_BW;
		return { key, kind: 'relay', open: false, src: src.href, via, dur, seg, bw, ...label };
	}
	return {
		key,
		kind: s.kind === 'live' ? 'live' : 'file',
		open: s.kind === 'live' ? s.open !== false : false,
		...label,
		// A file slot may play a window of its file: `from` seconds in, `dur`
		// seconds long. See clipOf().
		...(s.kind !== 'live' && Number(s.from) > 0 ? { from: Number(s.from) } : {}),
		...(s.kind !== 'live' && Number(s.dur) > 0 ? { dur: Number(s.dur) } : {}),
	};
}

// A window into a file, made of the frame index's own segments: the one that
// starts nearest the `from` second, and as many after it as come nearest `dur` seconds,
// never fewer than one. Asked 2026-10-01, *"each in 30 sec or so"*: a forty
// minute programme can hold a thirty second slot. The bytes are the same
// byte ranges as ever, cut on frame boundaries at ingest, never re-encoded,
// so a clip is as long as whole index segments make it (30.01 s for three).
function clipOf(seg, from, dur) {
	if (!from && !dur) return seg;
	let i = 0, at = 0;
	while (i < seg.length - 1 && at + seg[i].d / 2 <= (from || 0)) { at += seg[i].d; i++; }
	if (!dur) return seg.slice(i);
	const out = [];
	let held = 0;
	for (; i < seg.length; i++) {
		if (out.length && held + seg[i].d / 2 > dur) break;
		out.push(seg[i]); held += seg[i].d;
	}
	return out;
}

// A master playlist's variant nearest the slot's bandwidth, or the source
// itself when it is already a media playlist.
async function pickVariant(slot) {
	const r = await fetch(slot.src, { headers: { 'user-agent': 'positron-station relay' } });
	const text = await r.text();
	if (r.status >= 400 || !text.startsWith('#EXTM3U')) throw new Error(`upstream master answered ${r.status}`);
	if (!text.includes('#EXT-X-STREAM-INF')) return r.url || slot.src;
	const lines = text.split(/\r?\n/);
	let best = null;
	for (let i = 0; i < lines.length; i++) {
		if (!lines[i].startsWith('#EXT-X-STREAM-INF:')) continue;
		const bw = Number(/[:,]BANDWIDTH=(\d+)/.exec(lines[i])?.[1]) || 0;
		const uri = lines.slice(i + 1).find((l) => l && !l.startsWith('#'));
		if (!uri) continue;
		const d = Math.abs(bw - slot.bw);
		if (!best || d < best.d) best = { d, uri: new URL(uri, r.url || slot.src).href };
	}
	if (!best) throw new Error('upstream master lists no variant');
	return best.uri;
}

function parseMedia(text, base) {
	let sn = Number(/#EXT-X-MEDIA-SEQUENCE:(\d+)/.exec(text)?.[1]) || 0;
	const segs = [];
	let dur = 0;
	for (const line of text.split(/\r?\n/)) {
		if (line.startsWith('#EXTINF:')) dur = parseFloat(line.slice(8));
		else if (line && !line.startsWith('#')) { segs.push({ sn, uri: new URL(line, base).href, dur }); sn++; }
	}
	return { segs, map: text.includes('#EXT-X-MAP') };
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
// `spans` is the same walk described per slot, for /schedule.json: where each
// slot starts in the loop and how long it lasts, read off the very list the
// playlist is written from, so the table and the playlist cannot disagree.
async function flatten(env, sched) {
	const flat = [], spans = [];
	let t = 0, open = false, missing = [];
	for (let si = 0; si < sched.slots.length; si++) {
		const slot = sched.slots[si];
		const t0 = t, n0 = flat.length;
		const span = (extra = {}) => spans.push({
			i: si, key: slot.key, title: slot.title || null, kind: slot.kind,
			start: round6(t0), dur: round6(t - t0), segments: flat.length - n0,
			open: false, missing: false, ...extra,
		});
		if (slot.kind === 'live') {
			if (slot.open) open = true;
			for (const s of sched.live?.[slot.key] || []) {
				flat.push({ start: t, dur: s.d, uri: s.u, fmt: 'live', key: slot.key, si });
				t += s.d;
			}
			span({ open: !!slot.open });
			continue;
		}
		if (slot.kind === 'relay') {
			// A fixed number of entries of the upstream's segment length, so the
			// loop has a length before anybody has asked the upstream anything.
			const n = Math.max(1, Math.round(slot.dur / slot.seg));
			for (let k = 0; k < n; k++) {
				flat.push({ start: t, dur: slot.seg, relay: slot.key, k, ext: slot.via === 'hls' ? 'ts' : 'mp3', fmt: `relay:${slot.key}`, key: slot.key, si });
				t += slot.seg;
			}
			span({ seg: slot.seg, via: slot.via });
			continue;
		}
		const idx = await readIndex(env, slot.key);
		if (!idx) { missing.push(slot.key); span({ missing: true }); continue; }
		for (const s of clipOf(idx.seg, slot.from, slot.dur)) {
			flat.push({ start: t, dur: s.d, uri: `/media/${slot.key}`, off: s.o, len: s.l, fmt: idx.fmt, key: slot.key, si });
			t += s.d;
		}
		span(slot.dur ? { clip: [slot.from || 0, slot.dur] } : {});
	}
	// A join between two segments of unlike encodes needs #EXT-X-DISCONTINUITY.
	// A join between two of the same is free: twelve segments out of three
	// matching files gave one contiguous buffered range (MEASURED).
	const disc = flat.map((s, i) => (i === 0 ? 0 : s.fmt !== flat[i - 1].fmt ? 1 : 0));
	// The wrap, which only exists on a station that loops. An open live slot
	// stops the loop, so there is no join from the last segment to the first.
	if (!open && flat.length > 1 && flat[0].fmt !== flat[flat.length - 1].fmt) disc[0] = 1;
	// 🔴 INCLUSIVE: `incl[i]` counts segment i's OWN discontinuity. This was
	// `cum`, the count BEFORE i, and m3u8() used it for the header of whichever
	// segment opened the window. So a segment that begins an unlike programme
	// had one discontinuity number while it was first in the window (no tag
	// emitted, header excludes it) and one more on every reload where it was
	// second (tag emitted). hls.js 1.7.1 compares that number for every media
	// sequence number it has seen before and calls a difference
	// `discontinuity sequence mismatch`, raised as `levelParsingError`.
	// MEASURED locally 2026-10-01 against the code before this change, three
	// 30 s files of two encodes, polled once a second: 40 mismatches in 200 s.
	const incl = [];
	let c = 0;
	for (const d of disc) { c += d; incl.push(c); }
	return { flat, spans, total: t, open, missing, disc, incl, discPerLoop: c };
}

// `pre` is the channel's route prefix: '' for the default channel, so its
// relay URIs are exactly the ones it wrote before channels existed and no media
// sequence number changes address across the deploy, and `/c/<name>` for every
// other, so a relay segment is asked of the channel that listed it.
function m3u8(env, sched, f, now, pre = '') {
	const { flat, total, open, disc, incl, discPerLoop } = f;
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
	// Back from the edge until WINDOW_S seconds are covered.
	const last = loop * n + edge;
	let first = last, held = flat[edge].dur;
	while (first > 0 && held < WINDOW_S) { first--; held += flat[first % n].dur; }
	// Every segment's discontinuity number is a function of its media sequence
	// number alone, `cc(a)`, so it is the same on every reload that lists it.
	const cc = (a) => Math.floor(a / n) * discPerLoop + incl[a % n];
	// The longest segment, rounded, and never below the old 11. A file's tail
	// segment can reach fifteen seconds (buildIndex folds a short remainder into
	// it), and an #EXTINF over the target duration is out of spec. It is a
	// function of the running order, so it only changes when the schedule does.
	const target = Math.max(TARGETDUR, Math.round(flat.reduce((m, s) => Math.max(m, s.dur), 0)));
	const lines = [
		'#EXTM3U',
		'#EXT-X-VERSION:7',
		`#EXT-X-TARGETDURATION:${target}`,
		`#EXT-X-MEDIA-SEQUENCE:${first}`,
		`#EXT-X-DISCONTINUITY-SEQUENCE:${cc(first)}`,
	];
	for (let a = first; a <= last; a++) {
		const l = Math.floor(a / n), i = a % n;
		const s = flat[i];
		if (disc[i] && a !== first) lines.push('#EXT-X-DISCONTINUITY');
		lines.push(`#EXT-X-PROGRAM-DATE-TIME:${new Date(sched.epoch + (l * total + s.start) * 1000).toISOString()}`);
		lines.push(`#EXTINF:${s.dur.toFixed(6)},${s.key}`);
		if (s.len !== undefined) lines.push(`#EXT-X-BYTERANGE:${s.len}@${s.off}`);
		// A relay entry's address carries its loop, so one media sequence number
		// is one URI forever. hls.js calls a changed URI `media sequence mismatch`.
		lines.push(s.relay !== undefined ? `${pre}/relay/${encodeURIComponent(s.relay)}/${l}/${s.k}.${s.ext}` : s.uri);
	}
	return lines.join('\n') + '\n';
}

// Where the station is now: the loop, the time inside it, and the segment.
// One function for the playlist's neighbours (/now.json, /schedule.json) so
// they say what m3u8() would.
function position(sched, f, now) {
	const elapsed = Math.max(0, (now - sched.epoch) / 1000);
	if (f.open) return { loop: 0, t: elapsed, i: f.flat.length - 1 };
	let loop = Math.floor(elapsed / f.total);
	if (!Number.isFinite(loop) || loop < 0) loop = 0;
	const t = elapsed - loop * f.total;
	return { loop, t, i: locate(f.flat, t) };
}

// The Icecast relay slots a listener's playlist should keep open: any whose
// span, this loop or the next, starts within RELAY_LEAD seconds or is under way.
function relaysDue(sched, f, now) {
	if (f.open || !f.flat.length) return [];
	const { t } = position(sched, f, now);
	const out = [];
	for (const s of f.spans) {
		if (s.kind !== 'relay' || s.via !== 'mp3') continue;
		const near = [0, f.total].some((o) => t >= s.start + o - RELAY_LEAD && t <= s.start + o + s.dur + 2);
		if (near) out.push({ key: s.key, epoch: sched.epoch, total: f.total, start: s.start, n: s.segments });
	}
	return out;
}

function locate(flat, t) {
	let lo = 0, hi = flat.length - 1;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (flat[mid].start <= t) lo = mid; else hi = mid - 1;
	}
	return lo;
}

// ------------------------------------------------------------------ responses

const CORS = {
	'access-control-allow-origin': '*',
	'access-control-allow-headers': 'range, authorization, content-type',
	'access-control-expose-headers': 'content-length, content-range, accept-ranges',
};

const json = (v, status = 200) =>
	new Response(JSON.stringify(v, null, 1), { status, headers: { 'content-type': 'application/json', ...CORS } });

// ------------------------------------------------------------------ channels
//
// 🔴 A CHANNEL IS A RUNNING ORDER WITH ITS OWN CLOCK, AND THE STATION HAS AS
// MANY AS ANYBODY MAKES. Asked 2026-10-01: "Note we run multiple channels",
// then "Can be n channels". Each one is its own Schedule object, with its own
// running order, epoch, live lists and relay connection, so a channel changing
// its order cannot move another's media sequence. What they share is the bucket
// (every file and index under its one key) and the library below.
//
// 🔴 `main` IS THE STATION AS IT WAS, AND ITS OBJECT KEEPS ITS OLD NAME. Before
// channels there was one object, `idFromName('station')`, holding a running
// order that was on air. `main` is that object, not a new one, so nothing about
// it was reset: same epoch, same rev, same media sequence. Every other channel
// is `idFromName(<its name>)`, which is why `station` may not be a channel's
// name: it would be a second door into `main`'s object.
// The un-prefixed routes (`/station.m3u8`, `/now.json`, `/schedule.json`,
// `/schedule`, `/relay/...`, `/live/...`) are `main`'s and answer exactly as they
// did, so every player and page already pointed at them keeps working.
//
// A channel comes into being when its first running order is PUT, and it is
// written into the library's registry then, because a Durable Object namespace
// cannot be enumerated and /channels.json and the retention sweep both need
// the list.
const DEFAULT_CHANNEL = 'main';
const CHANNEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;
const RESERVED = new Set(['station']);
const validChannel = (ch) => CHANNEL_RE.test(ch) && !RESERVED.has(ch);
const prefixOf = (ch) => (ch === DEFAULT_CHANNEL ? '' : `/c/${ch}`);

function desk(env, ch = DEFAULT_CHANNEL) {
	return env.SCHEDULE.get(env.SCHEDULE.idFromName(ch === DEFAULT_CHANNEL ? 'station' : ch));
}

async function call(env, ch, op, body) {
	const r = await desk(env, ch).fetch(`https://schedule${op}`, {
		method: body === undefined ? 'GET' : 'POST',
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	return r.json();
}

// The library, as [status, value].
async function lib(env, op, body) {
	const r = await env.LIBRARY.get(env.LIBRARY.idFromName('library')).fetch(`https://library${op}`, {
		method: body === undefined ? 'GET' : 'POST',
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	return [r.status, await r.json()];
}

// What the library said, held per isolate for LIB_TTL so a room of visitors
// polling /now.json every two seconds is a read every ten seconds, not a
// hundred a second. A write through this isolate drops what it changed; a
// write through another shows here within LIB_TTL.
const LIB_TTL = 10_000;
const chanCache = { at: 0, v: null };
const progCache = new Map();

async function channelList(env, fresh = false) {
	if (!fresh && chanCache.v && Date.now() - chanCache.at < LIB_TTL) return chanCache.v;
	const [, v] = await lib(env, '/channels');
	chanCache.v = v; chanCache.at = Date.now();
	return v;
}

// A name not in the cached list is asked about once more, fresh, so a channel
// created a second ago in another isolate is not refused for ten seconds.
async function channelExists(env, ch) {
	if (ch === DEFAULT_CHANNEL) return true;
	if ((await channelList(env)).some((c) => c.name === ch)) return true;
	return (await channelList(env, true)).some((c) => c.name === ch);
}

// The records for these keys, or {} when the library cannot answer: a title
// can go stale or fall back to the slot's own, and nothing else depends on it.
async function records(env, keys) {
	const now = Date.now(), out = {}, want = [];
	for (const k of new Set(keys)) {
		const hit = progCache.get(k);
		if (hit && now - hit.at < LIB_TTL) { if (hit.v) out[k] = hit.v; } else want.push(k);
	}
	if (want.length) {
		try {
			const [, rows] = await lib(env, '/pick', { keys: want });
			const got = new Map(rows.map((r) => [r.key, r]));
			for (const k of want) {
				progCache.set(k, { at: now, v: got.get(k) || null });
				if (got.get(k)) out[k] = got.get(k);
			}
		} catch { /* the titles wait for the next read */ }
	}
	return out;
}

// A slot's title and who: the programme's record first, the running order's
// own label second, so an edit to a record reaches every channel that plays it.
const titleOf = (slot, rec) => rec?.title || slot?.title || null;
const whoOf = (slot, rec) => rec?.who || slot?.who || null;

// Where a slot begins in the loop, read off the same spans the table is.
const slotStart = (f, si) => f.spans.find((x) => x.i === si)?.start ?? 0;

// Where one channel is now, for /channels.json and /now.json.
async function onAir(env, ch) {
	const sched = await call(env, ch, '/get');
	const f = await flatten(env, sched);
	if (!f.flat.length) return { sched, f, error: 'the schedule is empty' };
	const at = position(sched, f, Date.now());
	const s = f.flat[at.i];
	return { sched, f, at, s, slot: sched.slots[s.si] };
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
// 🔴 EVERY CHANNEL, AND ORPHANS ONLY WHEN EVERY CHANNEL ANSWERED. A chunk is an
// orphan when no channel's lists mention it, and that is a claim about all of
// them: a sweep that heard from one channel of two would read the other's live
// show as unreferenced and delete it on air. So if any channel's /retain fails,
// the expired chunks the others reported still go and no orphan does.
async function sweep(env, now = Date.now()) {
	const before = await listAll(env, 'live/');
	const chans = (await channelList(env, true)).map((c) => c.name);
	const drop = [], kept = [], failed = [];
	for (const ch of chans) {
		try {
			const r = await call(env, ch, '/retain', { keep: KEEP_SEGS });
			drop.push(...r.drop); kept.push(...r.kept);
		} catch { failed.push(ch); }
	}
	// The DO speaks in playlist URIs (`/media/live/…`); R2 speaks in keys.
	const toKey = (u) => u.replace(/^\/media\//, '');
	const dropped = drop.map(toKey);
	const referenced = new Set(kept.map(toKey));
	let aged = 0;
	const orphans = [];
	if (!failed.length) for (const o of before) {
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
		channels: chans.length,
		unanswered: failed,               // channels whose lists could not be read: no orphan sweep
		expired: dropped.length,          // past the tail window: bytes go, record stays
		orphaned: orphans.length,         // no slot on any channel mentions them
		too_young: aged,                  // the guard held these back
		deleted: gone.length,
		live_objects: { before: before.length, after: after.length },
		live_bytes: { before: bytes(before), after: bytes(after) },
		referenced: referenced.size,
	};
}

// ------------------------------------------------------------------ records
//
// A programme's record from what the station knows about it: the file's tags,
// its frame index, and what the running orders call it. Written in 'fill' mode,
// so a field somebody set by hand is never replaced by a tag.

// The ID3v2 tag at the head of an object, read with two range GETs (the ten
// byte header, then the tag), and the ID3v1 tag in its last 128 bytes.
const ID3_MAX = 8 << 20;
async function id3Of(env, key) {
	const h = await env.MEDIA.get(key, { range: { offset: 0, length: 10 } });
	if (!h) return null;
	const hb = new Uint8Array(await h.arrayBuffer());
	let head = hb;
	if (hb.length === 10 && hb[0] === 0x49 && hb[1] === 0x44 && hb[2] === 0x33) {
		const len = Math.min(ID3_MAX, 10 + synchsafe(hb, 6) + ((hb[5] & 0x10) ? 10 : 0));
		head = new Uint8Array(await (await env.MEDIA.get(key, { range: { offset: 0, length: len } })).arrayBuffer());
	}
	const t = h.size >= 128 ? await env.MEDIA.get(key, { range: { suffix: 128 } }) : null;
	return readId3(head, t ? await t.arrayBuffer() : null);
}

function fileFields(id3, idx, slot) {
	const tag = id3Fields(id3);
	return {
		kind: 'file',
		...(idx ? { duration: idx.dur } : {}),
		title: slot?.title || tag.title || undefined,
		who: tag.who || slot?.who || undefined,
		meta: {
			...(id3 ? { id3 } : {}),
			...(tag.description ? { description: tag.description } : {}),
			...(idx ? { format: { rate: idx.rate, channels: idx.ch, kbps: idx.kbps } } : {}),
		},
	};
}

async function writeRecord(env, key, fields, mode) {
	const [status, v] = await lib(env, '/write', { key, fields, mode });
	progCache.delete(key);
	return [status, v];
}

// A PUT body, checked: the five fields a record has, and nothing else, so a
// misspelt field is a 400 rather than a value silently dropped.
function editOf(body) {
	const fields = {};
	for (const [k, v] of Object.entries(body || {})) {
		if (k === 'title' || k === 'who') {
			if (v !== null && typeof v !== 'string') throw new Error(`${k} is a string or null`);
			fields[k] = v === null ? null : v.trim().slice(0, 200) || null;
		} else if (k === 'kind') {
			if (!PROGRAMME_KINDS.includes(v)) throw new Error(`kind is one of ${PROGRAMME_KINDS.join(', ')}`);
			fields.kind = v;
		} else if (k === 'duration') {
			if (v !== null && !(Number(v) >= 0)) throw new Error('duration is seconds, or null');
			fields.duration = v === null ? null : Number(v);
		} else if (k === 'meta') {
			if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('meta is an object; a key set to null is removed');
			fields.meta = v;
		} else {
			throw new Error(`no field ${k}: a record has title, who, kind, duration and meta, and anything free goes in meta`);
		}
	}
	return fields;
}

// Every channel's running order, for the backfill and the relay check.
async function allSchedules(env) {
	const out = [];
	for (const c of await channelList(env, true)) out.push({ ch: c.name, sched: await call(env, c.name, '/get') });
	return out;
}

// ------------------------------------------------------------------ the worker

export default {
	// Every five minutes. A live show writes six objects a minute, so the worst
	// case between sweeps is thirty chunks over the keep window, about 4.8 MB.
	async scheduled(ev, env, ctx) {
		ctx.waitUntil(sweep(env, ev.scheduledTime || Date.now()).then((r) => console.log('sweep', JSON.stringify(r))));
	},

	async fetch(req, env, ctx) {
		const url = new URL(req.url);
		let p = url.pathname;
		if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

		if (p === '/media' || p.startsWith('/media/')) return media(req, env, p.slice('/media/'.length));

		// Every channel, its title and what it is playing now.
		if (p === '/channels.json' && req.method === 'GET') {
			const list = await channelList(env);
			const now = await Promise.all(list.map((c) => onAir(env, c.name).catch((e) => ({ error: String(e.message || e) }))));
			const recs = await records(env, now.filter((n) => n.slot).map((n) => n.slot.key));
			return json({
				default: DEFAULT_CHANNEL,
				channels: list.map((c, i) => {
					const n = now[i], pre = prefixOf(c.name);
					return {
						name: c.name, title: c.title || c.name, default: c.name === DEFAULT_CHANNEL,
						playlist: `${pre}/station.m3u8`, now: `${pre}/now.json`, schedule: `${pre}/schedule.json`,
						playing: n.slot ? {
							programme: n.s.key, slot: n.s.si, kind: n.slot.kind,
							title: titleOf(n.slot, recs[n.s.key]), who: whoOf(n.slot, recs[n.s.key]),
							into: round6(n.at.t - slotStart(n.f, n.s.si)),
						} : null,
						...(n.error ? { error: n.error } : {}),
					};
				}),
			});
		}

		// Every programme the library knows, with its free fields.
		if (p === '/programmes.json' && req.method === 'GET') {
			const [, rows] = await lib(env, '/programmes');
			return json({ count: rows.length, programmes: rows });
		}

		// `/c/<channel>/...` is that channel; everything else is `main`'s, as it
		// always was. A route that belongs to the whole station (uploads, the
		// bucket, the library) does not answer under a channel's prefix.
		let ch = DEFAULT_CHANNEL;
		const cm = /^\/c\/([^/]+)(\/.*)$/.exec(p);
		if (cm) {
			ch = cm[1]; p = cm[2];
			if (!validChannel(ch)) return json({ error: `a channel name is 1 to 32 of a-z, 0-9 and -, not starting or ending with -, and not ${[...RESERVED].join(', ')}` }, 404);
			// A channel that does not exist yet answers 404 to everything except
			// the PUT that creates it, which is checked for its token below.
			if (!(p === '/schedule' && req.method === 'PUT') && !(await channelExists(env, ch))) {
				return json({ error: `no channel ${ch}`, channels: '/channels.json' }, 404);
			}
		}
		const pre = prefixOf(ch);

		if (p === '/station.m3u8' || p === '/live.m3u8') {
			const sched = await call(env, ch, '/get');
			const f = await flatten(env, sched);
			const now = Date.now();
			const body = m3u8(env, sched, f, now, pre);
			// A listener is reading the playlist, so an Icecast relay slot that
			// is about to play, or playing, gets its mount opened or kept open.
			// This is the only thing that opens one: no playlist, no connection.
			for (const w of relaysDue(sched, f, now)) {
				ctx.waitUntil(desk(env, ch).fetch('https://schedule/warm', { method: 'POST', body: JSON.stringify(w) }).catch(() => {}));
			}
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
			const n = await onAir(env, ch);
			if (n.error) return json({ channel: ch, error: n.error, missing: n.f.missing }, 503);
			const { sched, f, at, s, slot } = n;
			const recs = await records(env, sched.slots.map((x) => x.key));
			return json({
				channel: ch,
				rev: sched.rev, epoch: sched.epoch, open: f.open, missing: f.missing,
				programme: s.key, title: titleOf(slot, recs[s.key]), who: whoOf(slot, recs[s.key]),
				kind: slot.kind, slot: s.si,
				// From the start of the programme, not of the ten second segment it
				// is in: it was `t - s.start` with `s` the segment until 2026-10-01,
				// so every page labelling it "into the programme" counted 0 to 10
				// over and over (MEASURED on eccm's /station, the same 4,5 s three
				// samples running).
				into: round6(at.t - slotStart(f, s.si)),
				segment: at.i, segments: f.flat.length, loop: at.loop,
				total: round6(f.total), station_time: round6(at.t),
				slots: sched.slots.map((x) => ({
					key: x.key, kind: x.kind, open: x.open, title: titleOf(x, recs[x.key]), who: whoOf(x, recs[x.key]),
					segments: x.kind === 'live' ? (sched.live[x.key] || []).length : undefined,
				})),
			});
		}

		// The running order of the loop that is playing now, with wall-clock
		// times. Read off flatten(), the list the playlist is written from.
		if (p === '/schedule.json') {
			const sched = await call(env, ch, '/get');
			const f = await flatten(env, sched);
			const now = Date.now();
			const recs = await records(env, sched.slots.map((x) => x.key));
			const dress = (s) => ({ ...s, title: titleOf(sched.slots[s.i], recs[s.key]), who: whoOf(sched.slots[s.i], recs[s.key]) });
			if (!f.flat.length) return json({ channel: ch, error: 'the schedule is empty', missing: f.missing, slots: f.spans.map(dress), now }, 503);
			const { loop, t, i } = position(sched, f, now);
			const playing = f.flat[i].si;
			// 🔴 WHAT IS COMING, NOT THE LOOP IN ITS OWN ORDER. Asked 2026-10-01,
			// *"i want table of uncoming shows/files + live stuff"*: the slot on
			// air first, then every slot after it, wrapping into the next loop,
			// so the slots before the one playing are listed with the times they
			// will next have. One full loop, each slot once. A station with an
			// open live slot does not loop, so it lists from the playing slot to
			// the end and stops.
			const at = (l, sec) => Math.round(sched.epoch + (l * f.total + sec) * 1000);
			const from = f.spans.findIndex((s) => s.i === playing);
			const order = f.open ? f.spans.slice(from)
				: [...f.spans.slice(from), ...f.spans.slice(0, from)];
			return json({
				channel: ch,
				rev: sched.rev, epoch: sched.epoch, now, open: f.open, loop,
				total: round6(f.total), station_time: round6(t), playing,
				slots: order.map((s) => {
					const l = !f.open && s.i < playing ? loop + 1 : loop;
					return {
						...dress(s), loop: l,
						from: s.missing ? null : at(l, s.start),
						// An open live slot has no end yet.
						to: s.missing || s.open ? null : at(l, s.start + s.dur),
					};
				}),
			});
		}

		// One upstream segment of a relay slot, named by its place in the loop.
		const rel = /^\/relay\/([^/]+)\/(\d+)\/(\d+)\.(ts|mp3)$/.exec(p);
		if (rel && req.method === 'GET') {
			const key = decodeURIComponent(rel[1]), loop = Number(rel[2]), k = Number(rel[3]);
			const sched = await call(env, ch, '/get');
			const f = await flatten(env, sched);
			const span = f.spans.find((s) => s.kind === 'relay' && s.key === key);
			if (!span || k >= span.segments) return new Response('no such relay segment\n', { status: 404, headers: CORS });
			const elapsed = (Date.now() - sched.epoch) / 1000;
			const kNow = Math.floor((elapsed - loop * f.total - span.start) / span.seg);
			const r = await desk(env, ch).fetch('https://schedule/relay', {
				method: 'POST', body: JSON.stringify({ key, loop, k, kNow }),
			});
			const h = new Headers(CORS);
			h.set('content-type', r.headers.get('content-type') || 'video/mp2t');
			if (r.headers.get('x-relay')) h.set('x-relay', r.headers.get('x-relay'));
			// A segment's bytes never change once fetched; an error is retried.
			h.set('cache-control', r.ok ? 'public, max-age=3600' : 'no-store');
			return new Response(r.body, { status: r.status, headers: h });
		}

		if (p === '/schedule' && req.method === 'GET') return json({ channel: ch, ...(await call(env, ch, '/get')) });

		// Everything below writes, and writing needs the token.
		if (!admitted(req, env)) {
			return json({ error: env.STATION_TOKEN ? 'bad token' : 'no STATION_TOKEN configured' }, env.STATION_TOKEN ? 401 : 503);
		}

		if (p === '/schedule' && req.method === 'PUT') {
			const body = await req.json();
			if (!body.epoch) body.epoch = Date.now();
			// 🔴 ONE CHANNEL PER UPSTREAM MOUNT. Each channel's Schedule object
			// holds its own relay connection, so two channels naming one mount
			// would be two listeners at somebody else's server, and CLAUDE.md is
			// explicit that every connection to an ERR mount is counted in a public
			// broadcaster's audience figures. Refused here rather than shared,
			// because the owner asked for the relay on one channel only.
			const mine = new Set((body.slots || []).filter((s) => s.kind === 'relay').map((s) => { try { return new URL(String(s.src)).href; } catch { return null; } }).filter(Boolean));
			if (mine.size) {
				for (const o of await allSchedules(env)) {
					if (o.ch === ch) continue;
					const clash = (o.sched.slots || []).find((s) => s.kind === 'relay' && mine.has(s.src));
					if (clash) return json({ error: `channel ${o.ch} already relays ${clash.src} (slot ${clash.key}); one mount is one connection, so it plays on one channel` }, 409);
				}
			}
			const r = await call(env, ch, '/put', body);
			if (r.error) return json({ channel: ch, ...r }, 400);
			// Created by its first running order, titled by `title` when given.
			const [, c] = await lib(env, '/channel', { name: ch, create: true, ...(typeof body.title === 'string' ? { title: body.title.slice(0, 80) } : {}) });
			chanCache.v = null;
			return json({ channel: ch, channel_title: c.title, created: c.created, ...r });
		}

		// One live chunk, as the recorder cuts it. The recorder is the segmenter:
		// it is already running an ffmpeg against the mount, and a second output
		// writing ten-second pieces costs it nothing it is not already paying.
		// `main` keeps its chunks under `live/<key>/` as before; another channel's
		// go under `live/<channel>/<key>/`, so two channels with a live slot of
		// the same name never write the same object.
		if (p.startsWith('/live/') && p.endsWith('/append') && req.method === 'POST') {
			const key = p.slice('/live/'.length, -'/append'.length);
			const bytes = await req.arrayBuffer();
			const idx = buildIndex(bytes, 1e9);   // one piece, walked for its true duration
			const seq = Number(url.searchParams.get('seq') ?? Date.now());
			const uri = `live/${ch === DEFAULT_CHANNEL ? '' : `${ch}/`}${key}/${String(seq).padStart(6, '0')}.mp3`;
			await env.MEDIA.put(uri, bytes, { httpMetadata: { contentType: 'audio/mpeg' } });
			const r = await call(env, ch, '/append', { key, uri: `/media/${uri}`, dur: idx.dur });
			return json({ channel: ch, ...r, dur: idx.dur, bytes: bytes.byteLength, uri: `/media/${uri}` });
		}

		if (p.startsWith('/live/') && p.endsWith('/close') && req.method === 'POST') {
			return json({ channel: ch, ...(await call(env, ch, '/close', { key: p.slice('/live/'.length, -'/close'.length) })) });
		}

		// Below this line the routes belong to the whole station, not a channel.
		if (cm) return json({ error: 'no such route on a channel', path: url.pathname }, 404);

		// A channel's title, changed without touching its running order (a
		// schedule PUT without an epoch restarts its clock).
		const cn = /^\/channels\/([^/]+)$/.exec(p);
		if (cn && req.method === 'PUT') {
			const body = await req.json();
			if (typeof body.title !== 'string') return json({ error: 'title is a string' }, 400);
			const [status, c] = await lib(env, '/channel', { name: cn[1], title: body.title.slice(0, 80) });
			chanCache.v = null;
			return json(c, status);
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

		// Put a programme in the station: the bytes go to R2 and the frame walk
		// goes beside them. One pass over the object, at ingest, once.
		// Since 2026-10-01 the same request writes its record: the tags it
		// carries (title, who, comment and every other frame), its duration and
		// format, in 'fill' mode so a title somebody set by hand stays. `?title=`
		// and `?who=` set them outright.
		if (p.startsWith('/programme/') && req.method === 'POST') {
			const key = p.slice('/programme/'.length);
			const bytes = await req.arrayBuffer();
			await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: 'audio/mpeg' } });
			const idx = buildIndex(bytes);
			await env.MEDIA.put(`index/${key}.json`, JSON.stringify(idx), { httpMetadata: { contentType: 'application/json' } });
			indexCache.delete(key);
			const id3 = readId3(bytes, bytes.byteLength >= 128 ? bytes.slice(bytes.byteLength - 128) : null);
			let [, record] = await writeRecord(env, key, fileFields(id3, idx, null), 'fill');
			const asked = {};
			for (const f of ['title', 'who']) if (url.searchParams.has(f)) asked[f] = url.searchParams.get(f).trim().slice(0, 200) || null;
			if (Object.keys(asked).length) [, record] = await writeRecord(env, key, asked, 'edit');
			return json({ key, ...idx, seg: idx.seg.length, record });
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

		// One record, edited by a person or written by a generator. Fields given
		// replace what is there; a `meta` key set to null is removed.
		if (p.startsWith('/programmes/') && req.method === 'PUT') {
			const key = decodeURIComponent(p.slice('/programmes/'.length));
			if (!key || key.length > 200) return json({ error: 'a programme key is 1 to 200 characters' }, 400);
			let fields;
			try { fields = editOf(await req.json()); } catch (e) { return json({ error: e.message }, 400); }
			const [status, v] = await writeRecord(env, key, fields, 'edit');
			return json(v, status);
		}

		// 🔴 THE BACKFILL, FOR WHAT WAS IN THE BUCKET BEFORE RECORDS EXISTED.
		// Every object with a frame index gets a record from its tags, its index
		// and the title a running order gives it; every relay and live slot on
		// any channel gets one from the slot. 'fill' mode throughout, so running
		// it twice changes nothing and running it after a hand edit undoes none.
		if (p === '/backfill' && req.method === 'POST') {
			const slots = new Map();
			for (const { sched } of await allSchedules(env)) {
				for (const s of sched.slots || []) {
					const had = slots.get(s.key);
					if (!had || (!had.title && s.title)) slots.set(s.key, s);
				}
			}
			const out = [];
			for (const o of await listAll(env, 'index/')) {
				const key = o.key.slice('index/'.length, -'.json'.length);
				const idx = await readIndex(env, key);
				let id3 = null;
				try { id3 = await id3Of(env, key); } catch { /* an unreadable head is a record without tags */ }
				const [status, v] = await writeRecord(env, key, fileFields(id3, idx, slots.get(key)), 'fill');
				out.push({ status, key, title: v.title, who: v.who, kind: v.kind, duration: v.duration, created: v.created, id3: !!id3 });
			}
			for (const s of slots.values()) {
				if (s.kind !== 'relay' && s.kind !== 'live') continue;
				const [status, v] = await writeRecord(env, s.key, {
					kind: s.kind, title: s.title || undefined, who: s.who || undefined,
					...(s.kind === 'relay' ? { meta: { src: s.src } } : {}),
				}, 'fill');
				out.push({ status, key: s.key, title: v.title, who: v.who, kind: v.kind, created: v.created });
			}
			return json({ count: out.length, records: out });
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
