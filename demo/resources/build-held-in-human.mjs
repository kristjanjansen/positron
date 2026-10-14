// Parses the Held in Human score into held-in-human.json; everything is derived, labelled
// stated, measured, absent or inferred. Ene Mihkelson's texts are quoted, never rewritten.
// Node only. Run with no flag, or --check to print the running order and write nothing.
// See lessons/page-resources.md#resources-126

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = join(ROOT, 'research', 'held-in-human-score-2026-09-19.txt');
const SRC_REL = 'research/held-in-human-score-2026-09-19.txt';
const PLAN_REL = 'plans/plan-held-in-human-score.md';
const OUT = join(HERE, 'held-in-human.json');

const CHECK = process.argv.includes('--check');

// A second of the score is an integer number of milliseconds everywhere in the
// file: nothing carries more than one decimal. Rounding here rather than at
// every call site is the difference between one convention and twenty.
const ms = (s) => Math.round(s * 1000);
const r2 = (n) => Math.round(n * 100) / 100;
const r3 = (n) => Math.round(n * 1000) / 1000;
const r4 = (n) => Math.round(n * 10000) / 10000;
const clock = (v) => {
	if (v == null) return '(none)';
	const t = Math.abs(v) / 1000;
	const sign = v < 0 ? '-' : '';
	return `${sign}${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
};
const spoken = (v) => `${Math.floor(v / 60000)} min ${Math.floor((v % 60000) / 1000)} s`;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// The score spells one scene three ways: `hold me` in the LUT block, `HoldMe`
// in the duration parameter, `holdme` in the anchor point. An id is what they
// all collapse to, and the `name` field keeps the LUT block's spelling.
const sid = (s) => s.toLowerCase().replace(/\s+/g, '');

// ── read ────────────────────────────────────────────────────────────────────

const raw = readFileSync(SRC, 'utf8');
const lines = raw.split('\n');

// Where each `scene: <name>` block starts. Everything before the first one is
// the parameter header.
const heads = [];
lines.forEach((l, i) => { if (/^scene:\s/.test(l)) heads.push({ i, name: l.replace(/^scene:\s*/, '').trim() }); });
if (!heads.length) throw new Error('build-held-in-human: no `scene:` block in the score');

function blockLines(name) {
	const k = heads.findIndex((h) => h.name === name);
	if (k < 0) throw new Error(`build-held-in-human: no block \`scene: ${name}\``);
	const end = k + 1 < heads.length ? heads[k + 1].i : lines.length;
	return lines.slice(heads[k].i + 1, end);
}
const nonEmpty = (a) => a.filter((l) => l.trim().length > 0);

// The parameter header alternates name and value lines with nothing marking which, so each
// pair is checked (a name has a letter, a value is a number, tuple or LUT word) to catch lost phase.
// See lessons/page-resources.md#resources-127

const NUMERIC = /^-?\d+(\.\d+)?(\s*,\s*-?\d+(\.\d+)?)*$/;
const header = lines
	.slice(0, heads[0].i)
	.map((l) => l.trim())
	.filter((l) => l && !l.startsWith('//'));
if (header.length % 2) throw new Error(`build-held-in-human: the header has ${header.length} lines, which is odd, so a name or a value is missing`);

const params = new Map();
const lutWords = new Set();
for (let i = 0; i < header.length; i += 2) {
	const name = header[i], value = header[i + 1];
	if (!/[A-Za-z]/.test(name) || NUMERIC.test(name)) throw new Error(`build-held-in-human: lost phase at header line ${i}, read \`${name}\` as a parameter name`);
	if (params.has(name)) throw new Error(`build-held-in-human: the parameter \`${name}\` appears twice`);
	if (/^LUT color /.test(name)) lutWords.add(value);
	else if (!NUMERIC.test(value)) throw new Error(`build-held-in-human: lost phase at header line ${i + 1}, read \`${value}\` as the value of \`${name}\``);
	params.set(name, value);
}
const num = (name) => {
	if (!params.has(name)) throw new Error(`build-held-in-human: no parameter \`${name}\``);
	const v = Number(params.get(name));
	if (!Number.isFinite(v)) throw new Error(`build-held-in-human: \`${name}\` is \`${params.get(name)}\`, which is not a number`);
	return v;
};
const tuple = (name) => params.get(name).split(',').map((x) => Number(x.trim()));
const startsWith = (p) => [...params.keys()].filter((k) => k.startsWith(p));

// The running order, read off the first of the score's three orderings; the other two check it.
// See lessons/page-resources.md#resources-128

const lutOrder = startsWith('LUT color ').map((k) => k.slice('LUT color '.length));
const opacityOrder = startsWith('opacity during ').map((k) => k.slice('opacity during '.length).replace(/ scene$/, ''));
const fadeOrder = startsWith('LUT transition time ').map((k) => k.slice('LUT transition time '.length));
const opacityFadeOrder = startsWith('opacity transition time during ').map((k) => k.slice('opacity transition time during '.length).replace(/ scene$/, ''));

const SCENES = lutOrder.map(sid);
const agree = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
if (!agree(SCENES, opacityOrder.map(sid))) throw new Error('build-held-in-human: the LUT block and the opacity block list the scenes in different orders');
if (!agree(SCENES, opacityFadeOrder.map(sid))) throw new Error('build-held-in-human: the opacity values and the opacity fades list the scenes in different orders');
// The LUT fade block is the same sequence with the transition moved to the end,
// which is what makes the loop reading possible at all.
const fadeIds = fadeOrder.map(sid);
const rotated = [...SCENES.slice(1), SCENES[0]];
const fadeRotated = agree(fadeIds, rotated);
if (!fadeRotated && !agree(fadeIds, SCENES)) throw new Error('build-held-in-human: the LUT fade block is in neither the LUT block order nor that order with the transition moved to the end');

const nameOf = new Map(lutOrder.map((n) => [sid(n), n]));

// Durations: five stated, two measured from the score's content, one (the maze) absent.
// See lessons/page-resources.md#resources-129

const dialogueRows = blockLines('dialogue')
	.filter((l) => l.trim() && !l.trim().startsWith('//'))
	.map((l, i) => {
		// `speaker : text : seconds : pause`. Split from the RIGHT, because the
		// text can hold a colon even though none in this file does, and the two
		// numbers at the end cannot.
		const a = l.lastIndexOf(':'), b = l.lastIndexOf(':', a - 1), c = l.indexOf(':');
		if (a < 0 || b < 0 || c < 0 || c >= b) throw new Error(`build-held-in-human: dialogue line ${i + 1} is not \`speaker : text : seconds : pause\``);
		return {
			n: i + 1,
			speaker: Number(l.slice(0, c).trim()),
			text: l.slice(c + 1, b).trim(),
			durationMs: ms(Number(l.slice(b + 1, a))),
			pauseMs: ms(Number(l.slice(a + 1))),
		};
	});
let t = 0;
for (const d of dialogueRows) { d.atMs = t; t += d.durationMs + d.pauseMs; }
const dialogueMs = t;

const keys = (() => {
	const body = blockLines('intro text');
	const track = body.find((l) => l.trim().length)?.trim();
	if (!/^track \d+;$/.test(track || '')) throw new Error(`build-held-in-human: the intro block opens with \`${track}\`, not a track declaration`);
	const out = [];
	let ended = false;
	for (const l of body.slice(body.indexOf(body.find((x) => x.trim() === track)) + 1)) {
		const s = l.trim();
		if (!s) continue;
		if (s === 'end;') { ended = true; break; }
		const m = s.match(/^(\d+)\s+(\d+);$/);
		if (!m) throw new Error(`build-held-in-human: the intro track holds \`${s}\`, which is not \`<delay> <code>;\``);
		out.push({ delayMs: +m[1], code: +m[2] });
	}
	if (!ended) throw new Error('build-held-in-human: the intro track has no `end;`');
	return { track, events: out };
})();
const introMs = keys.events.reduce((a, e) => a + e.delayMs, 0);

const DUR = { transition: ms(num('duration transition scene')), cylinder: ms(num('duration cylinder scene')), river: ms(num('duration river scene')), holdme: ms(num('duration HoldMe scene')), outro: ms(num('duration outro scene')) };
// Read back off the parameter names rather than typed, so a renamed parameter
// is a build failure instead of a silently missing scene.
for (const k of startsWith('duration ')) {
	const m = k.match(/^duration (.+) scene$/);
	if (!m) continue;
	if (!(sid(m[1]) in DUR)) throw new Error(`build-held-in-human: \`${k}\` names a scene this build does not carry`);
}

const MEASURED = {
	intro: { ms: introMs, how: `the keystroke track's own length, ${keys.events.length} delays summed` },
	dialogue: { ms: dialogueMs, how: `the ${dialogueRows.length} dialogue lines' times and pauses summed` },
};

const scenes = SCENES.map((id, i) => {
	const stated = DUR[id];
	const measured = MEASURED[id];
	const d = stated ?? measured?.ms ?? null;
	return {
		id,
		name: nameOf.get(id),
		loopIndex: i,
		durationMs: d,
		durationHow: stated != null ? 'stated' : measured ? 'measured' : 'absent',
		// Read back from the parameter map: the score spells `HoldMe` differently in two places.
		// See lessons/page-resources.md#resources-130
		durationFrom: stated != null
			? `the parameter \`${[...params.keys()].find((k) => /^duration (.+) scene$/.test(k) && sid(k.match(/^duration (.+) scene$/)[1]) === id)}\``
			: measured ? measured.how : 'the score gives this scene no duration parameter and nothing in it can be summed',
	};
});
const byId = new Map(scenes.map((s) => [s.id, s]));

// The running order a visitor sees starts at the intro. The transition is the
// reset between visitors, which is an inference and is labelled as one below.
const running = SCENES.filter((id) => id !== 'transition');
{
	let fromIntro = 0, fromMaze = null;
	for (const id of running) {
		const s = byId.get(id);
		s.runningIndex = running.indexOf(id);
		s.at = { fromIntroMs: fromIntro, fromMazeEndMs: fromMaze };
		if (s.durationMs == null) { fromIntro = null; fromMaze = 0; continue; }
		if (fromIntro != null) fromIntro += s.durationMs;
		if (fromMaze != null) fromMaze += s.durationMs;
	}
	byId.get('transition').runningIndex = null;
	byId.get('transition').at = { fromIntroMs: null, fromMazeEndMs: null };
}
const knownMs = running.reduce((a, id) => a + (byId.get(id).durationMs ?? 0), 0);

// Events: `time until <what> in <scene> scene` and its three shorter spellings; an unknown
// scene token fails the build.
// See lessons/page-resources.md#resources-131

function resolveScene(token, param) {
	const id = sid(token);
	if (!byId.has(id)) throw new Error(`build-held-in-human: \`${param}\` names the scene \`${token}\`, which is not one of ${SCENES.join(', ')}`);
	return id;
}
const events = [];
for (const key of startsWith('time until ')) {
	let rest = key.slice('time until '.length).replace(/\s+scene$/, '');
	let what, sceneId;
	const at = rest.lastIndexOf(' in ');
	if (at > 0) { what = rest.slice(0, at); sceneId = resolveScene(rest.slice(at + 4), key); }
	else {
		const sp = rest.lastIndexOf(' ');
		if (sp < 0) throw new Error(`build-held-in-human: cannot read a scene out of \`${key}\``);
		what = rest.slice(0, sp); sceneId = resolveScene(rest.slice(sp + 1), key);
	}
	events.push({ id: `${sceneId}:${slug(what)}`, sceneId, sceneName: nameOf.get(sceneId), what, atMs: ms(num(key)), from: key });
}
// Durations and line counts that belong to an event rather than to a scene.
const attach = (id, field, value, from) => {
	const e = events.find((x) => x.id === id);
	if (!e) throw new Error(`build-held-in-human: no event \`${id}\` to carry \`${from}\``);
	e[field] = value; (e.alsoFrom ||= []).push(from);
};
attach('transition:credits', 'durationMs', ms(num('credits scroll duration')), 'credits scroll duration');
attach('dialogue:maze-sound-fade-out', 'durationMs', ms(num('duration of maze sound fade out in dialogue')), 'duration of maze sound fade out in dialogue');
for (const key of startsWith('number of lines ')) {
	const m = key.match(/^number of lines (.+) during (.+) scene$/);
	if (!m) throw new Error(`build-held-in-human: cannot read \`${key}\``);
	attach(`${resolveScene(m[2], key)}:${slug(m[1])}`, 'lines', num(key), key);
}
// The two waits are between scenes rather than inside one, so they carry no
// scene and say what they sit between.
for (const key of startsWith('time after ')) {
	const m = key.match(/^time after (.+?) (until|before) (.+)$/);
	if (!m) throw new Error(`build-held-in-human: cannot read \`${key}\``);
	events.push({ id: `wait:${slug(m[1])}-${m[2]}-${slug(m[3])}`, sceneId: null, sceneName: null, what: `wait after ${m[1]} ${m[2]} the ${m[3]}`, atMs: null, durationMs: ms(num(key)), from: key, wait: { after: m[1], before: m[3] } });
}
// Order them the way the piece plays them: by scene, then by offset, waits last.
events.sort((a, b) => {
	const ai = a.sceneId ? SCENES.indexOf(a.sceneId) : 99, bi = b.sceneId ? SCENES.indexOf(b.sceneId) : 99;
	return ai - bi || (a.atMs ?? 0) - (b.atMs ?? 0);
});
// An event's place on a timeline, where the scene has one. Same two frames the
// scenes use, so a consumer never has to add a scene start to an offset.
for (const e of events) {
	if (!e.sceneId || e.atMs == null) { e.at = { fromIntroMs: null, fromMazeEndMs: null }; continue; }
	const s = byId.get(e.sceneId);
	e.at = {
		fromIntroMs: s.at.fromIntroMs == null ? null : s.at.fromIntroMs + e.atMs,
		fromMazeEndMs: s.at.fromMazeEndMs == null ? null : s.at.fromMazeEndMs + e.atMs,
	};
	if (e.durationMs != null && s.durationMs != null && e.atMs + e.durationMs > s.durationMs) {
		e.overrunsSceneMs = e.atMs + e.durationMs - s.durationMs;
	}
}

// The two channels: whole-piece step data, each point carrying its own `from` and `value`.
// The first point's previous value is the last's, a reading flagged in `ambiguities`.
// See lessons/page-resources.md#resources-132

function channel(read, fade, extra) {
	const pts = SCENES.map((id, i) => ({ index: i, sceneId: id, sceneName: nameOf.get(id), value: read(id), fadeMs: ms(fade(id)) }));
	for (let i = 0; i < pts.length; i++) {
		const prev = pts[(i - 1 + pts.length) % pts.length];
		pts[i].from = prev.value;
		if (extra) extra(pts[i], prev);
	}
	return pts;
}
const opacityPoints = channel(
	(id) => num(`opacity during ${nameOf.get(id)} scene`),
	(id) => num(`opacity transition time during ${nameOf.get(id)} scene`),
	(p) => {
		p.changed = r3(p.value - p.from);
		p.ratePerSecond = p.fadeMs ? r4((p.value - p.from) / (p.fadeMs / 1000)) : 0;
	},
);
const LUT_RECOMMENDATION = 'use 0 if the previous scene has the same LUT';
const lutPoints = channel(
	(id) => params.get(`LUT color ${nameOf.get(id)}`),
	(id) => num(`LUT transition time ${nameOf.get(id)}`),
	(p) => { p.same = p.value === p.from; p.followsRecommendation = p.same ? p.fadeMs === 0 : p.fadeMs > 0; },
);
const lutBreaks = lutPoints.filter((p) => !p.followsRecommendation);

// QandA is `text:seconds:pause`; an empty text is a silence of stated length (8 of 24 rows).
// See lessons/page-resources.md#resources-133

const qaLines = nonEmpty(blockLines('QandA')).map((l, i) => {
	const a = l.lastIndexOf(':'), b = l.lastIndexOf(':', a - 1);
	if (a < 0 || b < 0) throw new Error(`build-held-in-human: QandA line ${i + 1} is not \`text:seconds:pause\``);
	const secs = Number(l.slice(b + 1, a));
	const text = l.slice(0, b);
	return {
		n: i + 1,
		text,
		silence: text.length === 0,
		statedSeconds: secs,
		// A negative time holds until the visitor walks: `durationMs` is null, the value kept beside.
		// See lessons/page-resources.md#resources-134
		durationMs: secs >= 0 ? ms(secs) : null,
		waitsForVisitor: secs < 0,
		pauseMs: ms(Number(l.slice(a + 1))),
	};
});

// The score asks for a number of lines per scene and the block holds one more.
const asks = events.filter((e) => e.lines != null).map((e) => ({ eventId: e.id, sceneId: e.sceneId, atMs: e.atMs, lines: e.lines, from: e.alsoFrom.find((f) => f.startsWith('number of lines')) }));
const asked = asks.reduce((a, x) => a + x.lines, 0);
const spare = qaLines.length - asked;

// Model A, an inference: one cursor down the block, the negative line to the maze, the rest
// to scenes in score order; every row carries `how: "inferred"`.
// See lessons/page-resources.md#resources-135
const qaBlocks = [];
{
	let cursor = 0;
	if (spare === 1 && qaLines[0].waitsForVisitor) {
		qaBlocks.push({ id: 'maze:qanda', sceneId: 'maze', sceneName: nameOf.get('maze'), atMs: null, lines: 1, first: 1, last: 1, countHow: 'inferred', from: null });
		cursor = 1;
	} else if (spare !== 0) {
		throw new Error(`build-held-in-human: the QandA block holds ${qaLines.length} lines and the score asks for ${asked}, and the spare line is not the one that waits`);
	}
	for (const a of asks) {
		if (!a.lines) { qaBlocks.push({ id: a.eventId, sceneId: a.sceneId, sceneName: nameOf.get(a.sceneId), atMs: a.atMs, lines: 0, first: null, last: null, countHow: 'stated', from: a.from }); continue; }
		qaBlocks.push({ id: a.eventId, sceneId: a.sceneId, sceneName: nameOf.get(a.sceneId), atMs: a.atMs, lines: a.lines, first: cursor + 1, last: cursor + a.lines, countHow: 'stated', from: a.from });
		cursor += a.lines;
	}
	if (cursor !== qaLines.length) throw new Error(`build-held-in-human: the QandA cursor stopped at ${cursor} of ${qaLines.length}`);
}
// Walk each block against the clock. A block whose lines run past the end of
// its own scene says so and says where they land, because that crossing is the
// thing the picture has to show.
for (const b of qaBlocks) {
	if (!b.lines) { b.spanMs = 0; continue; }
	const own = byId.get(b.sceneId);
	let at = b.atMs;
	let span = 0;
	for (let n = b.first; n <= b.last; n++) {
		const L = qaLines[n - 1];
		L.blockId = b.id;
		L.sceneId = b.sceneId;
		// Every line's scene is inferred (the score gives counts, not which lines), so it is labelled.
		// See lessons/page-resources.md#resources-136
		L.how = 'inferred';
		L.from = 'qanda.model';
		L.countHow = b.countHow;
		L.atMs = at;
		// Where the line actually sounds, in the running order's two frames.
		L.at = {
			fromIntroMs: own.at.fromIntroMs == null || at == null ? null : own.at.fromIntroMs + at,
			fromMazeEndMs: own.at.fromMazeEndMs == null || at == null ? null : own.at.fromMazeEndMs + at,
		};
		if (at != null && own.durationMs != null && at >= own.durationMs) {
			// Past the end of the block's own scene. Find which scene it is in.
			let over = at - own.durationMs;
			let k = running.indexOf(own.id) + 1;
			while (k < running.length && byId.get(running[k]).durationMs != null && over >= byId.get(running[k]).durationMs) { over -= byId.get(running[k]).durationMs; k++; }
			L.landsIn = k < running.length ? { sceneId: running[k], sceneName: nameOf.get(running[k]), atMs: over } : null;
		}
		const step = (L.durationMs ?? 0) + L.pauseMs;
		if (at != null) at += step;
		span += step;
	}
	b.spanMs = span;
	b.endsAtMs = b.atMs == null ? null : b.atMs + span;
	if (own.durationMs != null && b.endsAtMs != null && b.endsAtMs > own.durationMs) b.overrunsSceneMs = b.endsAtMs - own.durationMs;
}
for (const L of qaLines) if (!L.blockId) throw new Error(`build-held-in-human: QandA line ${L.n} was assigned to no block`);

// The evidence for model A, computed rather than asserted. The strongest piece
// is arithmetic: the 46.5 second silence puts the line before it half a second
// short of the outro text.
const outroTextEvent = events.find((e) => e.id === 'outro:outro-text');
const longestSilence = qaLines.filter((L) => L.silence).sort((a, b) => b.durationMs - a.durationMs)[0];
const beforeLongest = qaLines[longestSilence.n - 2];
const landsBefore = beforeLongest?.landsIn && beforeLongest.landsIn.sceneId === 'outro'
	? beforeLongest.landsIn.atMs + (beforeLongest.durationMs ?? 0)
	: null;
const outroTextGapMs = landsBefore == null ? null : outroTextEvent.atMs - landsBefore;

// Keystrokes: 13 is Return, 127 Backspace, anything else the character typed.
// See lessons/page-resources.md#resources-137

const kEvents = [];
{
	let at = 0, buf = '';
	for (const e of keys.events) {
		at += e.delayMs;
		const row = { at, delayMs: e.delayMs, code: e.code };
		if (e.code === 127) { row.kind = 'backspace'; row.char = null; row.removed = buf.slice(-1) || null; buf = buf.slice(0, -1); }
		else if (e.code === 13) { row.kind = 'return'; row.char = '\n'; buf += '\n'; }
		else { row.kind = 'type'; row.char = String.fromCharCode(e.code); buf += row.char; }
		row.length = buf.length;
		kEvents.push(row);
	}
	keys.text = buf;
}
const delays = kEvents.map((e) => e.delayMs).sort((a, b) => a - b);
const pct = (p) => delays[Math.min(delays.length - 1, Math.floor(p * delays.length))];
const median = delays.length % 2 ? delays[(delays.length - 1) / 2] : (delays[delays.length / 2 - 1] + delays[delays.length / 2]) / 2;
const lastVisible = [...kEvents].reverse().find((e) => e.kind === 'type' && e.char.trim().length);
const longestGaps = [...kEvents].sort((a, b) => b.delayMs - a.delayMs).slice(0, 8).map((e) => {
	const before = kEvents.slice(0, kEvents.indexOf(e)).reduce((s, x) => x.kind === 'backspace' ? s.slice(0, -1) : s + (x.char ?? ''), '');
	return { gapMs: e.delayMs, atMs: e.at, code: e.code, kind: e.kind, char: e.char, after: before.slice(-28) };
});
// Line ends, which are the Returns plus the last event.
const kLines = (() => {
	const out = []; let start = 0;
	for (const e of kEvents) if (e.kind === 'return') { out.push({ endsAtMs: e.at, tookMs: e.at - start }); start = e.at; }
	if (lastVisible) out.push({ endsAtMs: lastVisible.at, tookMs: lastVisible.at - start });
	return out.map((o, i) => ({ n: i + 1, text: keys.text.split('\n')[i] ?? null, ...o }));
})();
// The correction. One run of backspaces in this track; find it, read what it
// removed off the buffer, and read what was typed in its place up to the next
// word boundary.
const correction = (() => {
	const first = kEvents.findIndex((e) => e.kind === 'backspace');
	if (first < 0) return null;
	let last = first;
	while (kEvents[last + 1]?.kind === 'backspace') last++;
	if (kEvents.slice(last + 1).some((e) => e.kind === 'backspace')) throw new Error('build-held-in-human: the intro track has more than one run of backspaces, so `correction` is no longer one thing');
	const removed = kEvents.slice(first, last + 1).map((e) => e.removed).reverse().join('');
	const typed = [];
	for (let i = last + 1; i < kEvents.length; i++) {
		const e = kEvents[i];
		if (e.kind !== 'type' || !e.char.trim().length) break;
		typed.push(e);
	}
	const lastWrong = kEvents[first - 1];
	const lastRight = typed[typed.length - 1];
	return {
		removed,
		typedInstead: typed.map((e) => e.char).join(''),
		backspaces: last - first + 1,
		lastWrongLetterAtMs: lastWrong.at,
		hesitationMs: kEvents[first].delayMs,
		firstBackspaceAtMs: kEvents[first].at,
		lastBackspaceAtMs: kEvents[last].at,
		backspaceGapsMs: kEvents.slice(first + 1, last + 1).map((e) => e.delayMs),
		pauseAfterMs: kEvents[last + 1].delayMs,
		replacementBeginsAtMs: kEvents[last + 1].at,
		lastRightLetterAtMs: lastRight.at,
		repairMs: lastRight.at - lastWrong.at,
		note: 'The hesitation is longer than the deletion. A score holding the finished string could not carry it.',
	};
})();

// The other texts, carried byte for byte; what this build adds sits in fields beside them.
// See lessons/page-resources.md#resources-138

const wordList = (name) => nonEmpty(blockLines(name)).map((l, i) => {
	const entry = l.replace(/\r$/, '');
	const semi = entry.indexOf(';');
	const row = { n: i + 1, entry, word: semi < 0 ? entry : entry.slice(0, semi) };
	if (semi >= 0) row.suffix = entry.slice(semi + 1).split(',').map(Number);
	if (entry !== entry.trimEnd()) row.trailingSpace = true;
	if (semi < 0 && entry.includes(',')) row.spelledWithCommas = true;
	return row;
});
const mazeOuter = wordList('maze outer');
const mazeInner = wordList('maze inner');

const river = nonEmpty(blockLines('river')).map((l, i) => {
	const plain = l.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
	return {
		n: i + 1,
		text: l,
		plain,
		words: plain ? plain.split(' ').length : 0,
		breaks: (l.match(/<br>/g) || []).length,
		sizeSpans: (l.match(/<size=\d+>/g) || []).length,
		durationMs: null,
	};
});

const outroText = nonEmpty(blockLines('outro'));
if (outroText.length !== 1) throw new Error(`build-held-in-human: the outro block holds ${outroText.length} lines, not one paragraph`);

// Credits: `<br>` separated, a double break opens a group whose first line is its heading.
// See lessons/page-resources.md#resources-139
const creditsRaw = nonEmpty(blockLines('credits'));
const creditGroups = (() => {
	const parts = creditsRaw.join('').split('<br>');
	const groups = []; let cur = null;
	for (const p of parts) {
		if (!p.trim()) { cur = null; continue; }
		if (!cur) { cur = { heading: p.trim(), entries: [] }; groups.push(cur); }
		else cur.entries.push(p.trim());
	}
	return groups;
})();
const creditFor = (h) => creditGroups.find((g) => g.heading === h)?.entries ?? [];

// ── the places the score does not settle ────────────────────────────────────

const creditsEvent = events.find((e) => e.id === 'transition:credits');
const afterCredits = events.find((e) => e.id.startsWith('wait:credits-until'));
const creditsEndMs = creditsEvent.atMs + creditsEvent.durationMs;
const ambiguities = [
	{
		id: 'transition-clock',
		where: 'the transition scene',
		what: `The credits begin at ${creditsEvent.atMs} ms and scroll for ${creditsEvent.durationMs} ms, so they end at ${creditsEndMs} ms, which is ${creditsEndMs - DUR.transition} ms past the scene's stated duration of ${DUR.transition} ms. And \`${afterCredits.from}\` does not say which end of the credits it counts from.`,
		readings: [
			{ id: 'after-the-scroll', gapToIntroMs: creditsEndMs + afterCredits.durationMs, how: 'the wait runs from the end of the scroll, and the stated duration governs something else' },
			{ id: 'after-the-start', gapToIntroMs: creditsEvent.atMs + afterCredits.durationMs, how: 'the wait runs from the credits appearing, which puts the intro inside the stated duration' },
			{ id: 'the-scene-decides', gapToIntroMs: DUR.transition, how: 'the credits are an overlay on their own clock and the scene is the stated duration' },
			{ id: 'the-scroll-decides', gapToIntroMs: creditsEndMs, how: 'the scene ends when the scroll does' },
		],
		settled: false,
		carriedAs: 'events[transition:credits].overrunsSceneMs is the 2 s, and order.entry holds both waits with their own durations',
	},
	{
		id: 'maze-length',
		where: 'the maze scene',
		what: 'The only scene with no duration parameter, and the only QandA line with a negative time asks the visitor to walk towards the stairs. Nothing in the score says what ends it.',
		readings: [{ id: 'waits-for-the-visitor', how: 'the negative time holds until she walks' }],
		settled: false,
		carriedAs: 'scenes[maze].durationMs is null and durationHow is `absent`',
	},
	{
		id: 'qanda-assignment',
		where: 'the QandA block',
		what: `The block holds ${qaLines.length} lines and the score asks for ${asked}. One line belongs to a scene the score gives no count for.`,
		readings: [
			{ id: 'model-a', how: 'line 1 belongs to the maze and the cursor runs down the rest in the order the score asks for them' },
			{ id: 'model-b', how: 'the cursor starts at line 1, which puts the walk instruction inside the cylinder and leaves the last line unspoken' },
		],
		settled: false,
		carriedAs: 'qanda.blocks[0].countHow is `inferred`, and EVERY line carries how: `inferred`, because the score counts lines per scene and never names them',
	},
	{
		id: 'lut-off-by-one',
		where: 'the LUT fade block',
		what: `The score's own recommendation is to ${LUT_RECOMMENDATION}. ${lutBreaks.length} scenes break it and they are adjacent: ${lutBreaks.map((p) => `${p.sceneName} takes ${p.fadeMs} ms into ${p.same ? 'the same LUT' : `${p.from} to ${p.value}`}`).join(', ')}. Swapping the two fixes both.`,
		readings: [
			{ id: 'shifted-by-one', how: 'the fade list is off by one against the colour list' },
			{ id: 'deliberate', how: 'the hard cut into green arrives with the first spoken line and the 5 s is a harmless ramp between two identical tables' },
		],
		settled: false,
		carriedAs: 'channels.lut.points[].followsRecommendation',
	},
	{
		id: 'the-loop',
		where: 'the order',
		what: `\`LUT transition time transition\` is ${ms(num('LUT transition time transition'))} ms and the transition is ${params.get('LUT color transition')}. The recommendation is satisfied only if the scene before it carries the same LUT, and the only candidate is the outro.`,
		readings: [{ id: 'outro-into-transition', how: 'the piece loops, and the transition is the reset between visitors' }],
		settled: false,
		carriedAs: 'order.loops is true with how: `inferred`, and both channels take their first point\'s previous value from the last',
	},
	{
		id: 'river-pacing',
		where: 'the river scene',
		what: `${river.length} fragments in a ${DUR.river} ms scene, running from ${Math.min(...river.map((f) => f.words))} word to ${Math.max(...river.map((f) => f.words))}, and the block carries no timing at all. The dialogue and the QandA both carry seconds per line.`,
		readings: [{ id: 'paced-elsewhere', how: 'something outside the score paces them, or the sound design does, or they are run by hand' }],
		settled: false,
		carriedAs: 'every texts.river[].durationMs is null',
	},
	{
		id: 'maze-suffixes',
		where: 'the inner maze list',
		what: `${mazeInner.filter((w) => w.suffix).length} entries carry a \`;n,n\` suffix using the values ${[...new Set(mazeInner.flatMap((w) => w.suffix ?? []))].sort((a, b) => a - b).join(', ')}. Nothing in the score says what they select.`,
		readings: [
			{ id: 'scene-presence', how: 'seven distinct values over an eight scene piece reads as which scenes the object is in' },
			{ id: 'variant-index', how: 'a material or variant index' },
			{ id: 'maze-json-position', how: 'positions in maze.json, which the score does not hold' },
		],
		settled: false,
		carriedAs: 'texts.mazeInner[].suffix is the parsed numbers and nothing is claimed about them',
	},
	{
		id: 'trailing-keypress',
		where: 'the intro keystroke track',
		what: `The last event is a space typed ${kEvents[kEvents.length - 1].delayMs} ms after the final full stop, which is the longest gap in the track.`,
		readings: [{ id: 'a-cue', how: 'it advances the piece' }, { id: 'a-stray', how: 'it is a keypress left in the recording' }],
		settled: false,
		carriedAs: 'the last row of keystrokes.events, and keystrokes.longestGaps[0]',
	},
	{
		id: 'radish',
		where: 'the inner maze list',
		what: `\`${mazeInner.find((w) => w.spelledWithCommas)?.entry}\` is the only entry that spells a word out with commas.`,
		readings: [{ id: 'per-letter-objects', how: 'each letter is placed as its own object' }, { id: 'parser-artefact', how: 'a comma separated field that was never meant to be read as a word' }],
		settled: false,
		carriedAs: 'texts.mazeInner[].spelledWithCommas',
	},
];

// ── the document ────────────────────────────────────────────────────────────

const counts = {
	scenes: scenes.length,
	scenesRunning: running.length,
	scenesStated: scenes.filter((s) => s.durationHow === 'stated').length,
	scenesMeasured: scenes.filter((s) => s.durationHow === 'measured').length,
	scenesAbsent: scenes.filter((s) => s.durationHow === 'absent').length,
	events: events.length,
	waits: events.filter((e) => e.wait).length,
	channels: 2,
	channelPoints: opacityPoints.length + lutPoints.length,
	qandaLines: qaLines.length,
	qandaSilences: qaLines.filter((L) => L.silence).length,
	qandaAsked: asked,
	qandaBlocks: qaBlocks.length,
	qandaBlocksStated: qaBlocks.filter((b) => b.countHow === 'stated').length,
	qandaBlocksInferred: qaBlocks.filter((b) => b.countHow === 'inferred').length,
	// Every line, because the score counts lines per scene and never names them.
	qandaLinesAssignedByInference: qaLines.filter((L) => L.how === 'inferred').length,
	keystrokeEvents: kEvents.length,
	dialogueLines: dialogueRows.length,
	riverFragments: river.length,
	mazeOuterWords: mazeOuter.length,
	mazeInnerWords: mazeInner.length,
	creditGroups: creditGroups.length,
	ambiguities: ambiguities.length,
	knownMs,
	unknownScenes: scenes.filter((s) => s.durationMs == null).map((s) => s.id),
};

const doc = {
	meta: {
		what: 'The Held in Human score read as data, so a picture of the piece can be drawn without re-reading it. Eight scenes, the events inside them, two channels that run the whole piece, the spoken lines with their silences, and the intro as the keystroke recording it is.',
		piece: 'Held in Human',
		kind: 'Unity mixed reality piece',
		year: creditGroups.find((g) => /^vares\.digital/.test(g.heading))?.heading.split(' ').pop() ?? null,
		authors: creditFor('Authors'),
		producer: creditFor('Producer'),
		credits: creditGroups.map((g) => ({ role: g.heading, entries: g.entries })),
		rights: 'Somebody else\'s work. The texts here are quoted and none of them is rewritten. The intro and the outro are a published author\'s, named in the credits, in translation. Nothing here may be republished or used as a fixture without the authors\' word.',
		source: { path: SRC_REL, supplied: '2026-09-19', bytes: Buffer.byteLength(raw), lines: lines.length, note: 'The score itself, kept verbatim including its own comments.' },
		reading: { path: PLAN_REL, note: 'The prose analysis this file is the machine readable form of. Where the two disagree, this file was derived from the score and the document was not.' },
		generated: new Date().toISOString(),
		generator: 'demo/resources/build-held-in-human.mjs',
		labels: {
			stated: 'the score says it in so many words',
			measured: 'derived by summing the score\'s own content',
			absent: 'the score does not carry it, and nothing here invents it',
			inferred: 'our reading of the score rather than the score\'s statement',
		},
	},
	counts,
	piece: {
		knownMs,
		known: spoken(knownMs),
		knownClock: clock(knownMs),
		from: 'the first keystroke of the intro to the end of the outro',
		unknown: counts.unknownScenes,
		note: 'The maze has no length in the score, so this total is the running order with the maze taken out. The transition is not in it either: it is the reset between visitors rather than part of a visit.',
	},
	order: {
		loop: SCENES,
		running,
		how: 'stated',
		from: 'The score lists the scenes three times as an order: the LUT colour block, the opacity block, and the LUT fade block with the transition moved to the end. All three agree.',
		// The third ordering is the second's with the transition moved to the
		// end, which is a fact about the file rather than a reading of it, and
		// it is what makes the loop reading possible at all.
		fadeBlockPutsTransitionLast: fadeRotated,
		loops: true,
		loopsHow: 'inferred',
		loopsFrom: `\`LUT transition time transition\` is 0 and the transition is ${params.get('LUT color transition')}, which satisfies the score's own recommendation only if the outro precedes it.`,
		entry: events.filter((e) => e.wait).map((e) => ({ id: e.id, durationMs: e.durationMs, from: e.from })),
	},
	scenes,
	events,
	channels: {
		opacity: {
			what: 'How much of the real room the visitor can see, as a step per scene with a ramp into each step.',
			unit: 'fraction of the general opacity level, 0 to 1',
			generalLevel: num('general opacity level'),
			generalLevelNote: 'The master dimmer is at 1.0, so the per scene values are the real ones. The score warns that dimming reduces contrast and makes the picture dull.',
			loop: true,
			points: opacityPoints,
		},
		lut: {
			what: 'A colour lookup table on the passthrough image, as a step per scene with a ramp into each step.',
			unit: 'a named table',
			values: [...lutWords].sort(),
			recommendation: LUT_RECOMMENDATION,
			breaksRecommendation: lutBreaks.map((p) => p.sceneId),
			loop: true,
			points: lutPoints,
		},
	},
	qanda: {
		what: 'One voice, one cursor down one list, read by four scenes. An empty line is a silence of a stated length and is a real event.',
		format: 'text:seconds:pause',
		asked,
		present: qaLines.length,
		spare,
		model: {
			id: 'model-a',
			how: 'inferred',
			what: 'The block holds one more line than the score asks for. Line 1 is the only one with a negative time and the only one that asks the visitor to do something, so it goes to the maze, which is the only scene with no duration and the only one that can wait. The score states how many lines each scene takes and never states which, so the assignment of EVERY line rests on this reading, not only the spare one.',
			evidence: [
				{ id: 'the-negative-time', what: `line 1 is \`${qaLines[0].statedSeconds}\` seconds, which is not a duration, and the maze is the only scene with no duration parameter` },
				{ id: 'the-last-line', what: `under this reading the last line spoken in the piece is \`${qaLines[qaLines.length - 1].text}\`; under the alternative the score lists a line nobody ever says` },
				{
					id: 'the-long-silence',
					what: `the ${longestSilence.durationMs} ms silence puts \`${beforeLongest.text}\` ending at ${landsBefore} ms into the outro and the outro text appears at ${outroTextEvent.atMs} ms, ${outroTextGapMs} ms later`,
					gapMs: outroTextGapMs,
					strongest: true,
				},
			],
			alternative: 'the cursor starts at line 1, which puts the walk instruction inside the cylinder and leaves the last line unspoken',
		},
		blocks: qaBlocks,
		lines: qaLines,
	},
	keystrokes: {
		what: 'The intro is not a string, it is a recording of somebody typing, with the pauses and one change of mind left in.',
		format: '<delay in ms> <character code>;',
		track: keys.track,
		codes: { 13: 'return', 127: 'backspace' },
		text: keys.text,
		stats: {
			events: kEvents.length,
			typed: kEvents.filter((e) => e.kind === 'type').length,
			returns: kEvents.filter((e) => e.kind === 'return').length,
			backspaces: kEvents.filter((e) => e.kind === 'backspace').length,
			charactersOnScreen: keys.text.length,
			spanMs: introMs,
			lastVisibleAtMs: lastVisible.at,
			shortestGapMs: delays[0],
			medianGapMs: median,
			meanGapMs: Math.round(delays.reduce((a, b) => a + b, 0) / delays.length),
			p90GapMs: pct(0.9),
			p99GapMs: pct(0.99),
			longestGapMs: delays[delays.length - 1],
			gapsOverOneSecond: delays.filter((d) => d >= 1000).length,
			gapsOverTwoSeconds: delays.filter((d) => d >= 2000).length,
			// Uses the 306 characters left on screen, not the 307 keys pressed (six backspaces).
			// See lessons/page-resources.md#resources-140
			wordsPerMinute: r2((keys.text.length / 5) / (introMs / 60000)),
			wordsPerMinuteToLastVisible: r2((keys.text.length / 5) / (lastVisible.at / 60000)),
			wordsPerMinuteBasis: `characters left on screen (${keys.text.length}) at five characters a word, not keys pressed (${kEvents.filter((e) => e.kind === 'type').length})`,
		},
		longestGaps,
		lines: kLines,
		correction,
		events: kEvents,
	},
	texts: {
		note: 'Quoted, never rewritten. The markup, the trailing spaces, the suffixes and the punctuation are the authors\'.',
		dialogue: {
			what: 'Sixteen lines, two speakers, strictly alternating.',
			format: 'speaker : text : seconds : pause',
			durationMs: dialogueMs,
			speakers: [...new Set(dialogueRows.map((d) => d.speaker))].sort(),
			lines: dialogueRows,
		},
		river: {
			what: 'Fifteen fragments, no timing in the score at all.',
			sceneDurationMs: DUR.river,
			evenlyMs: Math.round(DUR.river / river.length),
			sizeSpans: river.reduce((a, f) => a + f.sizeSpans, 0),
			closingTagForm: '</size=18>, carrying the value back',
			fragments: river,
		},
		outro: { what: 'One paragraph, line breaks set by the author rather than wrapped.', text: outroText[0], breaks: (outroText[0].match(/<br>/g) || []).length },
		mazeOuter: mazeOuter,
		mazeInner: mazeInner,
		credits: { raw: creditsRaw, groups: creditGroups, note: 'One group holds two roles, because the score separates that pair with a line break rather than the double break it uses everywhere else.' },
	},
	room: {
		what: 'Where things stand. Every placement in the score has right = 0, so a placement here is a height, a distance and an angle.',
		axes: 'right, up, back, which is the score\'s own comment and is not Unity\'s frame',
		placements: [...params.keys()]
			.filter((k) => /(position|placement|offset|anchorpoint)$|^(dialogue placement|inner maze offset)/.test(k))
			.map((k) => {
				const v = tuple(k);
				const rot = [...params.keys()].find((x) => x !== k && /(rotation|orientation)/.test(x) && (x.replace(/(rotation|orientation)/, '').trim() === k.replace(/(position|placement|offset|anchorpoint)/, '').trim() || x.replace(/ (rotation|orientation)$/, '') === k.replace(/ (position|placement|offset|anchorpoint)$/, '')));
				return { name: k, right: v[0], up: v[1], back: v[2], rotation: rot ? num(rot) : null, rotationFrom: rot ?? null };
			}),
		cylinderRadius: num('cylinder radius'),
		riverOrientation: num('river orientation'),
		textColour: tuple('text color'),
	},
	ambiguities,
	parameters: Object.fromEntries(params),
};

// ── report ──────────────────────────────────────────────────────────────────

// What an event carries beyond its own start. A QandA event's length lives on
// its block rather than on the event, so the overrun that matters most in this
// piece would be invisible here if the table only read the event.
function eventExtra(e) {
	const b = qaBlocks.find((x) => x.id === e.id);
	const bits = [
		e.durationMs != null ? `for ${e.durationMs / 1000}s` : null,
		e.lines != null ? `${e.lines} lines` : null,
		b && b.spanMs ? `${b.spanMs / 1000}s, ends at ${clock(b.endsAtMs)}` : null,
		e.overrunsSceneMs ? `past the scene end by ${e.overrunsSceneMs / 1000}s` : null,
		b?.overrunsSceneMs ? `past the scene end by ${b.overrunsSceneMs / 1000}s, into the ${qaLines[b.last - 1].landsIn?.sceneName ?? 'next scene'}` : null,
	].filter(Boolean);
	return bits.length ? `  (${bits.join(', ')})` : '';
}

function table() {
	const out = [];
	out.push(`Held in Human, ${scenes.length} scenes. Running order from the intro, the transition is the reset between visitors.`);
	out.push('');
	out.push('  #  scene       length     how        starts     ends       opacity  LUT');
	const row = (s) => {
		const start = s.at.fromIntroMs != null ? clock(s.at.fromIntroMs) : `+${clock(s.at.fromMazeEndMs)}`;
		const endRaw = s.durationMs == null ? null : (s.at.fromIntroMs != null ? s.at.fromIntroMs + s.durationMs : s.at.fromMazeEndMs + s.durationMs);
		const end = endRaw == null ? '?' : (s.at.fromIntroMs != null ? clock(endRaw) : `+${clock(endRaw)}`);
		const op = opacityPoints.find((p) => p.sceneId === s.id), lut = lutPoints.find((p) => p.sceneId === s.id);
		return `  ${String(s.runningIndex + 1).padStart(1)}  ${s.name.padEnd(11)}${(s.durationMs == null ? '(waits)' : clock(s.durationMs)).padEnd(11)}${s.durationHow.padEnd(11)}${start.padEnd(11)}${end.padEnd(11)}${String(op.value).padEnd(9)}${lut.value}${lut.fadeMs ? ` over ${lut.fadeMs / 1000}s` : ''}`;
	};
	for (const id of running) {
		const s = byId.get(id);
		out.push(row(s));
		for (const e of events.filter((e) => e.sceneId === id)) {
			const abs = e.at.fromIntroMs != null ? clock(e.at.fromIntroMs) : `+${clock(e.at.fromMazeEndMs)}`;
			out.push(`        ${clock(e.atMs).padEnd(9)} ${abs.padEnd(10)} ${e.what}${eventExtra(e)}`);
		}
	}
	const tr = byId.get('transition');
	out.push('');
	out.push(`     ${tr.name.padEnd(11)}${clock(tr.durationMs).padEnd(11)}${tr.durationHow.padEnd(11)}between visitors, and the score does not settle when the next intro starts`);
	for (const e of events.filter((e) => e.sceneId === 'transition' || e.wait)) {
		out.push(`        ${(e.atMs == null ? 'wait' : clock(e.atMs)).padEnd(9)} ${' '.repeat(10)} ${e.what}${eventExtra(e)}`);
	}
	out.push('');
	out.push('  + is measured from the end of the maze, whose length the score does not give.');
	out.push('');
	out.push(`intro to the end of the outro: ${(knownMs / 1000).toFixed(1)} s, ${spoken(knownMs)}, with the maze taken out`);
	out.push(`QandA: ${qaLines.length} lines present, ${asked} asked for, ${spare} spare, ${counts.qandaSilences} of them silences. Model A assigns the spare to the maze.`);
	out.push(`keystrokes: ${kEvents.length} events, ${introMs} ms, median gap ${median} ms, longest ${delays[delays.length - 1]} ms`);
	out.push(`ambiguities the score does not settle: ${ambiguities.length}`);
	return out.join('\n');
}

console.log(table());
if (!CHECK) {
	writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n');
	console.log(`\nwrote ${OUT}`);
	console.log(`${counts.scenes} scenes (${counts.scenesStated} stated, ${counts.scenesMeasured} measured, ${counts.scenesAbsent} absent), ${counts.events} events, ${counts.channelPoints} channel points, ${counts.qandaLines} QandA lines, ${counts.keystrokeEvents} keystrokes, ${counts.ambiguities} ambiguities`);
} else {
	console.log('\n--check: nothing written');
}
