// Builds `demo/resources/mimproject.json`, which is a SECOND corpus and not an
// addition to the first one.
//
// 🔴 IT IS THE OPPOSITE KIND OF THING FROM `corpus.json`, WHICH IS THE WHOLE
// REASON IT IS A SEPARATE FILE. Every row of `corpus.json` is a POINTER to
// something somebody else holds, and its rules follow from that: never copy,
// never re-probe, record what was observed on a date. Every row HERE points at
// a file we hold ourselves, in our own R2 bucket, because the material is
// MIMproject's own and mimproject.org has been down long enough that YouTube
// was the last copy anybody could reach. Merging the two would put "ask nobody
// else's server" and "this server is ours" under one set of rules, and the
// first rule would win by being written down.
//
// Two kinds of input, and the split is the same one `corpus.json` makes:
//   - MEASURED facts (duration, picture size, frame rate, bytes) come from
//     `mimproject-measured.json` (the YouTube channel) and
//     `mimproject-vimeo-measured.json` (Vimeo), read off the files themselves
//     with ffprobe when they were pulled. A duration is a fact about a file,
//     measured once and written down.
//   - EDITORIAL facts (when the work happened, and how we know) are the table
//     below, hand-checked against each video's own title and description and
//     against what is published about the productions.
//
// ⚠️ TWO ROWS ARE NOT OURS AND SAY SO. The opera interview and the Made in
// Estonia Maraton piece were filmed and uploaded by Kanuti Gildi SAAL; the
// productions are co-productions, the recordings are theirs. Their `holder`,
// `source` and `licenceBy` carry that rather than letting "MIMproject" stand
// over the whole file because most of the file is ours.
//
// ⚠️ A YOUTUBE UPLOAD DATE IS NOT A DATE OF WORK, and most of these were
// uploaded years after the thing they show. `uploaded` is carried on every row
// as the fact it is; `when` is filled only where the work's own date is
// stated somewhere, and two rows honestly have `precision: "none"`.
//
//   node demo/resources/build-mimproject.mjs            # writes mimproject.json
//   node demo/resources/build-mimproject.mjs --check    # prints, writes nothing

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MEASURED = join(HERE, 'mimproject-measured.json');
const MEASURED_VIMEO = join(HERE, 'mimproject-vimeo-measured.json');
const OUT = join(HERE, 'mimproject.json');

// Where the files actually are. The station worker serves any object in its
// bucket at `/media/<key>` with Range and `access-control-allow-origin: *`.
// ⚠️ It also serves them `immutable` for a year, so a replacement file needs a
// new name rather than an overwrite.
const BASE = 'https://positron-station.kristjan-jansen.workers.dev/media/mimproject/';

// The editorial table. Keyed by file name, because that is what a reader of the
// bucket sees. `how` says where the date came from, in the same spirit as
// `corpus.json`'s `when.how`: a date with no provenance is a guess in a
// confident typeface.
const WHEN = {
	'party-container-kumu-oo-2010.mp4': {
		edtf: '2010', precision: 'year', how: 'stated in the video own title',
		note: 'Self Sustainable Party Container at Kumu Art Museum night. Part of the sustainable theatre research MIMproject ran from 2009 to 2011, where the audience generated the power the work needed.',
	},
	'party-container-vabaduse-valjak-2010.mp4': {
		edtf: '2010', precision: 'year', how: 'stated in the video own title',
		note: 'The same container on Vabaduse valjak in Tallinn. Made with Invalid Robot Factory.',
	},
	'greenhouse-projects-helsinki-2010.mp4': {
		edtf: '2010', precision: 'year', how: 'stated in the video own title',
		note: 'Greenhouse projects in Helsinki, made with Varmstudio. Filmed by Taavi Varm.',
	},
	'requiem-for-a-lightbulb.mp4': {
		edtf: '2009', precision: 'year', how: 'stated in the video own description',
		note: 'An audiovisual installation in Kanuti Gildi SAAL with Jan Fedinger. Filmed by Taavet Jansen.',
	},
	'mim-goes-sustainable-2011-kirikustseen.mp4': {
		edtf: '2011', precision: 'year', how: 'stated in the video own title and description',
		note: 'The church scene from the performance MIM goes Sustainable, staged in a temporary theatre container at the end of Kultuurikilomeeter during Tallinn European Capital of Culture year. The theatre was built from construction warming boxes and the audience generated the energy it ran on. The longest recording here at 22 minutes.',
	},
	'mimproject100-window-mapping-2013.mp4': {
		edtf: '2013', precision: 'year', how: 'stated in the video own title',
		note: 'Projection onto the windows of Tallinn Art Hall during the MIMproject 100 exhibition, which presented Manfred MIMi life and creations as 1920 to 2020.',
	},
	'mimproject-concert-kumu-2016.mp4': {
		edtf: '2016-02-27', precision: 'day', how: 'stated in the video own title',
		note: 'A concert at Kumu Art Museum, fast forwarded.',
	},
	'picked-artists-mimstuudio-2015-2016.mp4': {
		edtf: '2015/2016', precision: 'range', how: 'stated in the video own title',
		note: 'Randomly picked artists who performed in MIMstuudio over two years. In order of appearance: ENSync, Id M Theft Able, Erik Alalooga, Arma, MIMproject, dno sound theatre, Andrea Pensado, Ringhold, Autoknack, Tencu, Max Evstropov, Punkt, Nihu, Antez and more.',
	},
	'picked-artists-mimstuudio-2017-2018.mp4': {
		edtf: '2017/2018', precision: 'range', how: 'stated in the video own title',
		note: 'The same idea two years later. In order of appearance: Tatsuro Arai, Cubus Larvik, Eemeli Solehmainen and Dario Cervera, Mei Zhiyong, Laid SoundSystem, Hans Gunter Lock, Waterflower, EKKE, Erik Alalooga, Jessy and more.',
	},
	'happy-new-year-2017.mp4': {
		edtf: '2017-01-02', precision: 'day', how: 'the upload IS the work, so its date is the work date',
		note: 'A new year greeting from MIMstuudio. The only row here where the upload date is the thing itself rather than a later publication of it.',
	},
	'koreograafilise-materjali-esitlus.mp4': {
		edtf: '2017-04-20', precision: 'day', how: 'stated in the video own description',
		note: 'The second public presentation of the opera, in Kanuti Gildi SAAL. Dancers of the Estonian National Ballet performed the translation of Manfred MIMi legacy into body language, mixing classical movement with contemporary.',
	},
	'koreograafilise-materjali-esitlus-karja-kirik.mp4': {
		edtf: '2017-04-20', precision: 'day', how: 'stated in the video own description',
		note: 'One scene from that presentation, set in Karja church.',
	},
	'mimooperi-esietendus-2018.mp4': {
		edtf: '2018-01-19', precision: 'day', how: 'stated in the video own title',
		note: 'The premiere announcement for the first MIMproject opera, made with the Estonian National Opera and Kanuti Gildi SAAL.',
	},
	'eesti-ajalugu-ehmatusest-sundinud-rahvas.mp4': {
		edtf: '2018', precision: 'year', how: 'the production premiered 2018-01-19; the clip does not say which performance it is from',
		note: 'A moment from the opera Estonian History. A Nation Born of Shock, by Manfred MIM, with the Estonian National Opera and Kanuti Gildi SAAL.',
	},
	'manfred-mimi-ooperi-partituuri-leid.mp4': {
		edtf: null, precision: 'none', how: 'nothing in the video states when this happened; the only date is the upload',
		note: 'The finding of the score of Manfred MIMi opera. Part of the opera project, so it is not later than 2017, but nothing says more than that.',
	},
	'mimprojecti-portree.mp4': {
		edtf: null, precision: 'none', how: 'nothing in the video states when this was made; the only date is the upload',
		note: 'A short portrait of MIMproject.',
	},

	// ── from Vimeo. The five Karlsruhe rows are the oldest material here and
	// they push the corpus back to 2008, three years before anything on the
	// YouTube channel. ⚠️ The two clips that give a month disagree, March
	// against April, so only the two of them carry a month and the rest carry
	// the year. A workshop run twice is the obvious reading and nothing states
	// it, so nothing here says it.
	'mim-jam-session-karlsruhe-2008.mp4': {
		edtf: '2008-03', precision: 'month', how: 'the video own description says recorded March 2008',
		note: 'Day 2 of the MIM workshop in Karlsruhe. An evening jam with piano, SuperCollider-processed sound, Ableton Live synths, trumpet and ragga MC.',
	},
	'bee-crawl-karlsruhe-2008.mp4': {
		edtf: '2008-04', precision: 'month', how: 'the video own description says recorded April 2008',
		note: 'Day 2 of the MIM workshop in Karlsruhe. Paar crawling in the face of Queen Bee.',
	},
	'song-about-bees-karlsruhe-2008.mp4': {
		edtf: '2008', precision: 'year', how: 'the same Karlsruhe workshop as the two clips that give a month, and those two say March and April',
		note: 'Day 2 of the MIM workshop in Karlsruhe. A duet of Maike and Taavet, sung in German.',
	},
	'trumpet-in-jungle-karlsruhe-2008.mp4': {
		edtf: '2008', precision: 'year', how: 'the same Karlsruhe workshop as the two clips that give a month, and those two say March and April',
		note: 'Day 3 of the MIM workshop in Karlsruhe. A surround sound installation with SuperCollider and trumpet.',
	},
	'little-sad-robot-karlsruhe-2008.mp4': {
		edtf: '2008', precision: 'year', how: 'the same Karlsruhe workshop as the two clips that give a month, and those two say March and April',
		note: 'Day 4 of the MIM workshop in Karlsruhe. A MaxMSP controlled step motor with an LED torch attached.',
	},
	'electricity-generating-bike-2009.mp4': {
		edtf: null, precision: 'none', how: 'nothing states when this was made; the only date is the upload, 2009-10-31',
		note: 'A bicycle wired to generate electricity. It sits at the head of the sustainable theatre line MIMproject ran from 2009 to 2011, where the audience powered the work, but no text on the video says so.',
	},
	'mim-office-panorama-2011.mp4': {
		edtf: null, precision: 'none', how: 'nothing states when this was shot; the only date is the upload, 2011-04-03',
		note: 'A turn around the MIM office.',
	},
	'making-of-mim-2011.mp4': {
		edtf: null, precision: 'none', how: 'nothing states when this was shot; the only date is the upload, 2011-04-28',
		note: 'Five minutes of MIM being made.',
	},
	'materjali-vastupanu-remixed-2013.mp4': {
		edtf: '2013', precision: 'year', how: 'the festival in the title is Made in Estonia Maraton 2013',
		note: 'MIMproject at the Made in Estonia Maraton short form festival, with a piece called the resistance of material, remixed as a superbowl halftime show. Filmed and uploaded by Kanuti Gildi SAAL, so the recording is theirs.',
	},
	'eesti-ajalugu-ooper-intervjuu-2018.mp4': {
		edtf: '2018-01', precision: 'month', how: 'the description says the conversation happened before the premiere, and the premiere was 2018-01-19',
		note: 'Priit Raud in conversation with members of MIMproject ahead of the opera premiere. Twenty three minutes, the longest thing in this corpus. Filmed and uploaded by Kanuti Gildi SAAL, so the recording is theirs. This is the 720p rendition and a 1080p one exists: wrangler refuses a file over 300 MiB and the 1080p is 712 MB, so putting the better copy here needs an R2 access key and a multipart upload rather than a better download.',
	},
};

/**
 * 🔴 WHAT WAS PULLED AND THEN TAKEN OUT AGAIN, AND WHY THE ROW STAYS HERE.
 * A corpus that silently shrinks is one nobody can audit: the difference
 * between "this was never found" and "this was found and removed" is the whole
 * value of an archive's index, and the count is the only thing a reader would
 * have noticed. Each entry says where the original still is, so nothing here
 * is a dead end.
 *
 * ⚠️ IT IS A NOTE, NOT A TOMBSTONE WITH THE FILE STILL BEHIND IT. The object is
 * gone from the bucket and the URL answers 404.
 */
const REMOVED = [
  {
    file: 'we-mim-you-2017.mp4',
    title: 'WE MIM YOU! (13.03.2017)',
    url: 'https://www.youtube.com/watch?v=iTlDzYSoEps',
    when: '2017-03-13',
    removed: '2026-09-19',
    why: 'taken out on instruction. The upload it was copied from is still on the channel.',
  },
  {
    file: 'kogda-to-davno-kosmonautikapaev-2017.mp4',
    title: 'Когда то давно (part) @Kosmonautikapäev 12.04.17',
    url: 'https://www.youtube.com/watch?v=EcaRw-luy4U',
    when: '2017-04-12',
    removed: '2026-09-19',
    why: 'taken out on instruction. The upload it was copied from is still on the channel.',
  },
];

// Who holds the recording, where that is not us. The work can be a
// co-production and the tape still belong to whoever pointed the camera.
const NOT_OURS = {
	'materjali-vastupanu-remixed-2013.mp4': 'Kanuti Gildi SAAL',
	'eesti-ajalugu-ooper-intervjuu-2018.mp4': 'Kanuti Gildi SAAL',
};

const ms = (s) => Math.round(s * 1000);
const dayMs = (d) => (d ? Date.parse(d + 'T00:00:00Z') : null);

// EDTF to a bracket, for the few shapes this table actually uses. Deliberately
// NOT a general parser: a parser that silently accepts a shape it cannot mean
// is how a wrong date gets a confident number beside it.
function bracket(edtf) {
	if (!edtf) return { earliest: null, latest: null };
	if (/^\d{4}$/.test(edtf)) return { earliest: dayMs(`${edtf}-01-01`), latest: dayMs(`${edtf}-12-31`) };
	if (/^\d{4}-\d{2}-\d{2}$/.test(edtf)) return { earliest: dayMs(edtf), latest: dayMs(edtf) };
	const m = edtf.match(/^(\d{4})-(\d{2})$/);
	if (m) {
		const first = dayMs(`${edtf}-01`);
		return { earliest: first, latest: Date.UTC(+m[1], +m[2], 0) };
	}
	const r = edtf.match(/^(\d{4})\/(\d{4})$/);
	if (r) return { earliest: dayMs(`${r[1]}-01-01`), latest: dayMs(`${r[2]}-12-31`) };
	throw new Error(`build-mimproject: no bracket rule for EDTF ${edtf}`);
}

const measured = JSON.parse(readFileSync(MEASURED, 'utf8'));
const measuredVimeo = JSON.parse(readFileSync(MEASURED_VIMEO, 'utf8'));

function item(v, via) {
	const w = WHEN[v.file];
	if (!w) throw new Error(`build-mimproject: no editorial row for ${v.file}`);
	const { earliest, latest } = bracket(w.edtf);
	const theirs = NOT_OURS[v.file] || null;
	return {
		id: `mim:${v.file.replace(/\.mp4$/, '')}`,
		title: v.title,
		kind: 'video',
		source: theirs || 'MIMproject',
		holder: theirs
			? `${theirs} filmed and uploaded it. The production is a co-production with MIMproject, the recording is theirs.`
			: `MIMproject — ours. The file is in our own R2 bucket; the only other copy anybody can reach is the ${via} upload.`,
		sourceId: v.youtubeId || v.vimeoId,
		url: v.youtube || v.vimeo,
		via,
		file: BASE + v.file,
		fileType: 'video/mp4',
		bytes: v.bytes,
		count: 1,
		when: { edtf: w.edtf, earliest, latest, precision: w.precision, how: w.how },
		uploaded: v.date,
		licence: 'all rights reserved',
		licenceBy: theirs ? `${theirs}, which filmed and uploaded it` : 'MIMproject, which made the work and uploaded it',
		licenceConfidence: theirs ? 'HIGH (statement) — and it is not ours' : 'HIGH — this is our own material',
		http: 200,
		httpFrom: 'probe',
		cors: true,
		durationMs: ms(v.duration),
		picture: { width: v.width, height: v.height, fps: v.fps, vcodec: v.vcodec },
		note: w.note,
	};
}

const items = [
	...measured.videos.map((v) => item(v, 'youtube')),
	...measuredVimeo.videos.map((v) => item(v, 'vimeo')),
];

items.sort((a, b) => (a.when.earliest ?? Infinity) - (b.when.earliest ?? Infinity) || a.uploaded.localeCompare(b.uploaded));

const totalMs = items.reduce((a, i) => a + i.durationMs, 0);
const out = {
	subject: 'MIMproject (Tallinn, 2005– ) and MIMstuudio (2014–2018)',
	generated: new Date().toISOString(),
	generator: 'demo/resources/build-mimproject.mjs',
	note: 'A SECOND corpus, and the opposite kind of thing from corpus.json. Every row there is a pointer to something somebody else holds. Every row here points at a file we hold ourselves, because the material is MIMproject own and mimproject.org has been down long enough that the two video sites were the last copies anybody could reach. Pulled from the project own YouTube channel and from Vimeo on 2026-09-19 and put in our R2 bucket. Two rows are recordings Kanuti Gildi SAAL made of co-productions, and they say so.',
	inputs: [
		{ path: 'demo/resources/mimproject-measured.json', generated: measured.pulled, items: measured.videos.length, from: 'youtube' },
		{ path: 'demo/resources/mimproject-vimeo-measured.json', generated: measuredVimeo.pulled, items: measuredVimeo.videos.length, from: 'vimeo' },
	],
	base: BASE,
	site: 'http://www.mimproject.org/ — answers Cloudflare 522, the origin is down. The Wayback Machine holds 2843 page captures from 2009 to 2025 and no video or audio in any of them. archive.org holds no items at all for MIMproject, MIMstuudio or Manfred MIM.',
	channel: measured.channel,
	removed: REMOVED,
	elsewhere: 'One more piece is on Vimeo and cannot be fetched: Pas Musique live at MIM Studio, 2016-01-27, vimeo.com/154239549, 28 minutes. It is Pas Musique own upload with video art by Tencu, and it answers 403 on its metadata to a logged-in session, so it is theirs to release rather than ours to copy.',
	durations: {
		source: 'ffprobe, on the files themselves, when they were pulled',
		measured: measured.pulled,
		what: 'How long each recording actually runs, together with its picture size and frame rate. Read off the file rather than off a page about the file.',
		known: items.length,
		refused: 0,
	},
	counts: {
		items: items.length,
		dated: items.filter((i) => i.when.edtf).length,
		undated: items.filter((i) => !i.when.edtf).length,
		withFile: items.length,
		withDuration: items.length,
		totalMs,
		totalBytes: items.reduce((a, i) => a + i.bytes, 0),
		ours: items.filter((i) => i.source === 'MIMproject').length,
		theirs: items.filter((i) => i.source !== 'MIMproject').length,
		byVia: items.reduce((a, i) => ((a[i.via] = (a[i.via] || 0) + 1), a), {}),
		byPicture: items.reduce((a, i) => ((a[`${i.picture.height}p${i.picture.fps}`] = (a[`${i.picture.height}p${i.picture.fps}`] || 0) + 1), a), {}),
	},
	precisionConventions: {
		'the video own title or description': 'What MIMproject wrote under its own upload. Treated as the best available statement about its own work, which is what it is.',
		'the upload date': 'Carried on every row as `uploaded`, and used as `when` exactly once, where the upload IS the work. Most of these were uploaded years after the thing they show, so an upload date standing in for a work date would be wrong on almost every row.',
		none: 'Nothing states when these happened, and an upload date is not an answer to that question.',
	},
	items,
};

const text = JSON.stringify(out, null, 1) + '\n';
if (process.argv.includes('--check')) {
	console.log(`${items.length} items, ${items.filter((i) => i.when.edtf).length} dated, ${Math.round(totalMs / 60000)} minutes, ${(out.counts.totalBytes / 1e6).toFixed(0)} MB`);
	for (const i of items) console.log(`${String(i.when.edtf ?? '(undated)').padEnd(10)} ${String(Math.round(i.durationMs / 1000) + 's').padStart(6)} ${i.id.slice(4)}`);
} else {
	writeFileSync(OUT, text);
	console.log(`wrote ${OUT}: ${items.length} items, ${Math.round(totalMs / 60000)} minutes, ${(out.counts.totalBytes / 1e6).toFixed(0)} MB`);
}
