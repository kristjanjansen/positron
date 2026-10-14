// Builds mimproject-images.json, pictures recovered from the Wayback Machine (no video there).
// Measured facts are in mimproject-images-measured.json, keyed by id (a hash of the source URL
// without crop or preset). Run with no flag, or --check to print only.
// See lessons/page-resources.md#resources-67

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MEASURED = join(HERE, 'mimproject-images-measured.json');
const OUT = join(HERE, 'mimproject-images.json');

// The station worker serves the bucket at `/media/<key>`, immutable for a year, so replace
// by new name; its sweep() deletes under `live/` only.
// See lessons/page-resources.md#resources-68
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
 * Removed pictures: four casino adverts a squatter uploaded after the domain lapsed.
 * See lessons/page-resources.md#resources-69
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

// File names must be unique; this throws, since an immutable overwrite cannot be undone.
// See lessons/page-resources.md#resources-70
const seen = new Set();
for (const it of items) {
	if (seen.has(it.key)) throw new Error(`two pictures claim one key: ${it.key}`);
	seen.add(it.key);
}

/**
 * Refuses anything uploaded after 2024 (the domain lapsed); throws rather than filters,
 * so whoever reruns the survey decides.
 * See lessons/page-resources.md#resources-71
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
	// What was ingested then removed, keyed by source URL, and the 196 pictures never captured.
	// See lessons/page-resources.md#resources-72
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
