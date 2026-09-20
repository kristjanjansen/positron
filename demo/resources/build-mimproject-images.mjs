// Builds `demo/resources/mimproject-images.json`, which is a THIRD corpus.
//
// 🔴 WHAT IT IS AND WHY IT IS NOT IN EITHER OF THE OTHER TWO. `corpus.json`
// holds pointers to things somebody else holds, so its rules are "never copy,
// never re-probe". `mimproject.json` holds the videos, which we hold. This file
// holds PICTURES recovered from a site that no longer exists: every one of the
// four mimproject.org hosts stopped resolving, so the Wayback Machine was the
// only remaining copy, and what came back is ours to hold in the same sense the
// videos are.
//
// 🔴 THE CLAIM THIS WORK REFUTED. The standing note said mimproject.org was
// down and *archive.org has nothing of it*, so the YouTube channel and the
// bucket were what survived. MEASURED 2026-09-19 from the CDX index: **2843
// captures, 778 unique URLs, 421 HTML pages, spanning 2009-10-30 to
// 2026-02-09.** The claim was wrong about pages and pictures. It was RIGHT
// about video: zero mp4, mov, webm, mp3, wav or pdf in the whole index, so the
// videos really do survive only on YouTube and Vimeo.
//
// ⚠️ MEASURED AND EDITORIAL ARE SPLIT, the same way `build-mimproject.mjs`
// splits them. `mimproject-images-measured.json` holds what was read off the
// bytes and off the index and nothing else. The prose, the site descriptions
// and the naming are here.
//
// 🔴 KEYED BY `id`, NEVER BY FILE NAME. The id is a hash of the picture's
// source URL after its crop suffix and its Drupal imagecache preset are taken
// off, so the 1024x1024 crop and the original are ONE picture with one id. A
// name is a thing a re-encode changes, which this project has already paid for
// once: a lookup keyed by file name silently re-credited somebody else's
// recording when a re-encode renamed it.
//
// ⚠️ A DATE IS STATED ONLY WHERE THE PATH CARRIES ONE. WordPress writes
// `/uploads/2017/09/`, which is the month somebody uploaded the file and is NOT
// the date of the work. It is carried as `uploadedPath` and never as `when`,
// for exactly the reason the video corpus keeps `uploaded` and `when` apart.
//
// ⚠️ THIRTY OF THE SIXTY-SEVEN ARE 145x145 THUMBNAILS and say so in
// `thumbnail`. The originals behind them were never captured. A thumbnail is
// worth holding because it is the only surviving picture of that work, and it
// must never be mistaken for a picture somebody can use.
//
//   node demo/resources/build-mimproject-images.mjs          # writes the json
//   node demo/resources/build-mimproject-images.mjs --check  # prints, writes nothing

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MEASURED = join(HERE, 'mimproject-images-measured.json');
const OUT = join(HERE, 'mimproject-images.json');

// The station worker serves any object in its bucket at `/media/<key>` with
// Range and `access-control-allow-origin: *`.
// ⚠️ It also serves them `immutable` for a year, so a replacement needs a NEW
// NAME rather than an overwrite. And its five-minute `sweep()` lists and
// deletes under `live/` ONLY, which is why this prefix is safe there.
const BASE = 'https://positron-station.kristjan-jansen.workers.dev/media/mimproject-images/';

/** What each host was. Four sites lived on that one domain and they are not
 *  one thing: a reader sorting these by site is asking a real question. */
const SITES = {
	'mimproject.org': 'the project site, Drupal until about 2013, and then WordPress until it lapsed',
	taavetjansen: "taavetjansen.mimproject.org, Taavet Jansen's portfolio on the same domain",
	opera: 'opera.mimproject.org, the Eesti ajalugu opera site, in Estonian, English and Russian',
	squarespace: 'images.squarespace-cdn.com, the picture host the 2016 to 2019 pages embedded from',
};

/**
 * 🔴 WHAT WAS TAKEN OUT AND WHY, CARRIED IN THE CORPUS RATHER THAN DELETED
 * QUIETLY. Four pictures were pulled on 2026-09-19: every one of them is
 * advertising for the same Thai online casino, uploaded to
 * `/wp-content/uploads/2025/01/` AFTER the domain had lapsed. They are what a
 * SQUATTER put on mimproject.org.
 *
 * ⚠️ THIS IS A FACT ABOUT THE SURVEY'S QUESTION, NOT A SLIP. The Wayback index
 * was asked what the DOMAIN had held, and a domain outlives the people who had
 * it. Captures from 2009 to 2023 are MIMproject's; the 2025 and 2026 ones are
 * somebody else's business on the same name. Nothing in a CDX row says which,
 * and a build that just counted images would have shipped all four for ever.
 *
 * ⚠️ AND THE ENTRY NEXT DOOR CALLED IT A `2025 revival`, WHICH IS EXACTLY THE
 * WRONG READING and was written here, in `mimproject-images.json` and in two
 * notes before anybody looked at the pictures. A site coming back and a site
 * being taken are the same shape in an index of URLs.
 */
const m = JSON.parse(readFileSync(MEASURED, 'utf8'));

const items = m.items.map((r) => {
	const stem = r.file.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9._-]/g, '-');
	const ext = r.type === 'image/png' ? '.png' : r.type === 'image/gif' ? '.gif'
		: r.type === 'image/svg+xml' ? '.svg' : '.jpg';
	const key = `${r.site}/${stem}${ext}`;
	return {
		id: r.id,
		file: `${stem}${ext}`,
		key: `mimproject-images/${key}`,
		url: BASE + key,
		site: r.site,
		w: r.w, h: r.h, bytes: r.bytes, type: r.type,
		// A 145x145 WordPress thumbnail is the only surviving copy of that work's
		// picture. It is held and it is labelled, never quietly offered as a picture.
		thumbnail: r.w <= 200 && r.h <= 200,
		holder: 'MIMproject',
		via: 'web.archive.org',
		source: r.source,
		wayback: r.wayback,
		capturedAt: r.capturedAt,
		uploadedPath: r.uploadedPath,
		shownOn: r.shownOn,
		shownOnTitles: r.shownOnTitles,
	};
}).sort((a, b) => (a.site === b.site ? a.file.localeCompare(b.file) : a.site.localeCompare(b.site)));

// 🔴 THE FILE NAMES HAVE TO BE UNIQUE AND THIS THROWS RATHER THAN WARNS. Two
// pictures landing on one bucket key would put one of them on top of the other,
// and the bucket serves `immutable`, so the loser would be unrecoverable
// without a rename nobody would know to make.
const seen = new Set();
for (const it of items) {
	if (seen.has(it.key)) throw new Error(`two pictures claim one key: ${it.key}`);
	seen.add(it.key);
}

/**
 * 🔴 AND THE BUILD REFUSES ANYTHING FROM AFTER THE DOMAIN LAPSED. The four
 * casino adverts all came from `/uploads/2025/01/`, and the only thing that
 * separated them from MIMproject's own pictures was somebody opening them. A
 * date cannot prove authorship, but it can carry the one fact that is known:
 * nothing on that domain after 2024 is MIMproject's.
 * ⚠️ IT THROWS RATHER THAN FILTERING. A build that silently dropped rows would
 * hide a real picture with a late upload path just as quietly as it hid these,
 * and the person re-running a survey is the one who should decide.
 */
const late = items.filter((r) => r.uploadedPath && r.uploadedPath >= '2025');
if (late.length) {
	throw new Error(`${late.length} picture(s) uploaded after the domain lapsed: `
		+ `${late.map((r) => r.file).join(', ')}. `
		+ 'Nothing on mimproject.org after 2024 is MIMproject\'s. See `removed` in the measured input.');
}

const bySite = {};
for (const it of items) bySite[it.site] = (bySite[it.site] || 0) + 1;

const doc = {
	subject: 'Pictures recovered from mimproject.org, which is gone',
	generated: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
	generator: 'demo/resources/build-mimproject-images.mjs',
	note: 'Every row is a file we hold, recovered from the Wayback Machine because all four '
		+ 'mimproject.org hosts stopped resolving. A row states where the picture was captured '
		+ 'from and which archived page showed it, and states a date only where the upload path '
		+ 'carries one.',
	surveyedAt: m.surveyedAt,
	sites: SITES,
	archive: m.cdx,
	hostsProbed: m.hostsProbed,
	counts: {
		items: items.length,
		bytes: items.reduce((a, r) => a + r.bytes, 0),
		thumbnailsOnly: items.filter((r) => r.thumbnail).length,
		withAPageThatShowedThem: items.filter((r) => r.shownOn.length).length,
		bySite,
	},
	// 🔴 WHAT IS GONE IS PART OF THE RECORD. 196 pictures are referenced by an
	// archived page and were never captured, and the biggest single loss is the
	// opera production photography. A corpus that listed only what it has would
	// read as though that were everything there was.
	// What was ingested and then taken out, so the next survey does not put it
	// back. Keyed by the source URL, which is the thing that identifies a
	// squatter's upload.
	removed: m.removed,
	notRecovered: {
		note: 'Referenced by an archived page and never captured, so gone.',
		count: m.referenced.notArchived,
		biggest: Object.entries(m.notArchivedByFolder).map(([k, v]) => `${k} (${v})`),
	},
	items,
};

const text = `${JSON.stringify(doc, null, '\t')}\n`;
if (process.argv.includes('--check')) {
	console.log(`${items.length} pictures, ${(doc.counts.bytes / 1e6).toFixed(1)} MB`);
	for (const [s, n] of Object.entries(bySite)) console.log(`  ${s.padEnd(16)}${String(n).padStart(3)}`);
	console.log(`  thumbnails only ${doc.counts.thumbnailsOnly}`);
	console.log(`  not recovered   ${doc.notRecovered.count}`);
} else {
	writeFileSync(OUT, text);
	console.log(`wrote ${OUT}, ${items.length} pictures`);
}
