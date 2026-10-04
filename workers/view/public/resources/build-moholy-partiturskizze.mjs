// Builds `demo/resources/moholy-partiturskizze.json`, Moholy-Nagy's
// Partiturskizze zu einer mechanischen Exzentrik (1924, plate in Bauhausbuecher
// 4, 1925) read off the archive.org scan as data.
//
//   node demo/resources/build-moholy-partiturskizze.mjs          # writes the JSON
//   node demo/resources/build-moholy-partiturskizze.mjs --check  # prints the reading, writes nothing
//
// NODE ONLY. Never shipped to a browser, never imported by a page.
//
// THE SAME KIND OF THING AS `build-held-in-human.mjs`, WITH ONE DIFFERENCE.
// Held in Human is a text that a parser reads. This is a picture, so there is
// nothing to parse: every number below was MEASURED BY HAND on 2026-10-04, in
// pixels, on the one image the scan holds of the plate, and typed here. The
// JSON is generated from these tables so that the fractions, the checks and the
// summary are computed once and never typed.
//
// THE IMAGE. `Schlemmer et al. - 1925 - Die Buehne am Bauhaus.pdf` on
// archive.org, PDF page 47, its one embedded JPEG, 902 x 345 px, extracted with
// `pdfimages -f 47 -l 47 -j` and read pixel by pixel. That JPEG IS the best
// copy the item has: the item's original is that PDF (ABBYY FineReader 10,
// 2014) and every other format in it (the JP2 zip, the page images) is derived
// from it, so no request could have returned more detail (INFERRED from the
// item's file list, which was read: one PDF, then derivatives). The plate is
// photographed flat and SIDEWAYS in it, title on the left.
//
// ORIENTATION. Moholy prints it to be read vertically, title at the top, time
// running DOWN. The scan has time running RIGHT. Everything in the JSON is
// stated in the hung orientation:
//   - `at` / `from` / `to` are fractions of the scored length, 0 at the top of
//     the lanes, 1 at the bottom.
//   - `across` is a fraction of a column's width, 0 at its LEFT edge as hung
//     (which is the BOTTOM of the scan), 1 at its right edge.
//   - directions: scan right = down (with time), scan left = up (against
//     time), scan up = right, scan down = left. The columns run 1, 2, 3, 4
//     from left to right as hung.
//
// THE SCORED LENGTH. Pixel 177 to pixel 852 along the scan, which is where
// column 3 (light) starts and ends. Column 3 is the only one with a stated time
// scale (*"Die Breite der Streifen bedeutet die Dauer"*), so it defines 0 and 1.
// The other columns start and end within two pixels of it. 675 px, so one scan
// pixel is 0.0015 of the length and NOTHING HERE IS FINER THAN THAT.
//
// WHAT `how` MEANS ON EVERY ROW.
//   seen      the shape and its extent are in the pixels; anyone with the same
//             JPEG gets the same numbers within a pixel or two.
//   inferred  my reading: a meaning, a match to the FOLGE list, a label I could
//             not read in this scan. It says why in `note`.
// A hex is `sampled`: the mean RGB of the span's interior in the 2014 JPEG of a
// 1925 print, which is the colour of the scan and not of Moholy's ink.

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'moholy-partiturskizze.json');
const CHECK = process.argv.includes('--check');

const ARCHIVE = 'https://archive.org/details/schlemmer-et-al.-1925-die-buhne-am-bauhaus';
const PDF = 'https://archive.org/download/schlemmer-et-al.-1925-die-buhne-am-bauhaus/Schlemmer%20et%20al.%20-%201925%20-%20Die%20B%C3%BChne%20am%20Bauhaus.pdf';

const X0 = 177; // first pixel of column 3, the top of the score as hung
const X1 = 852; // one past its last pixel, the bottom
const LEN = X1 - X0;
const Y_TOP = 108; // column 3's edges in the scan, used for `across`
const Y_BOT = 168;

const r4 = (n) => Math.round(n * 10000) / 10000;
const frac = (x) => r4((x - X0) / LEN);
// scan y to `across`, 0 at the hung column's left edge (the scan's bottom)
const across = (yHi, yLo) => [r4((Y_BOT - yLo) / (Y_BOT - Y_TOP)), r4((Y_BOT - yHi) / (Y_BOT - Y_TOP))];

// ── column 3, light ─────────────────────────────────────────────────────────
//
// [x from, x to (exclusive), colour, sampled hex, note]. These TILE the column:
// the check below refuses a gap or an overlap. Read at y = 115, 130, 145, 160
// with a colour classifier and checked against a 5x enlargement by eye.
// White is unprinted paper; reading it as white light (rather than as nothing
// scored) is INFERRED, since the key defines only black.

const LIGHT = [
	[177, 186, 'black', '#050603'],
	[186, 192, 'white', '#deded7'],
	[192, 197, 'grey', '#6e6f6b', 'darker grey, with a darker line at its lower edge'],
	[197, 208, 'grey', '#a8a9a3', 'lighter grey, slightly mottled'],
	[208, 217, 'yellow', '#cabc5d'],
	[217, 220, 'white', '#d4caae'],
	[220, 245, 'yellow', '#ceb84b'],
	[245, 252, 'black', '#150d08'],
	[252, 256, 'white', '#aba49c'],
	[256, 262, 'blue', '#90a2aa', 'pale, mottled blue'],
	[262, 264, 'black', '#3f342e'],
	[264, 272, 'red', '#cb4829', 'orange red'],
	[272, 303, 'white', '#e4e3dd', 'the column is divided lengthwise here: see the three inside stripes'],
	[303, 328, 'black', '#060404'],
	[328, 339, 'red', '#c74b2b'],
	[339, 343, 'white', '#dfcfbf'],
	[343, 346, 'grey', '#c1c0bf', 'thin grey line across the column, at the limit of the scan'],
	[346, 348, 'white', '#dfcfbf'],
	[348, 349, 'grey', '#bec1b8', 'one pixel grey line, at the limit of the scan'],
	[349, 350, 'white', '#dfcfbf'],
	[350, 351, 'grey', '#bec1b8', 'one pixel grey line, at the limit of the scan'],
	[351, 355, 'white', '#dfcfbf'],
	[355, 367, 'yellow', '#d7c75d'],
	[367, 439, 'black', '#020202', 'the longest single stripe on the plate'],
	[439, 474, 'yellow', '#e0ce60'],
	[474, 477, 'black', '#0e0604'],
	[477, 478, 'grey', '#515150', 'thin grey line across the black'],
	[478, 528, 'black', '#010101'],
	[528, 530, 'yellow', '#bfbd79', 'thin yellow line across the column'],
	[530, 534, 'black', '#280f0a'],
	[534, 539, 'red', '#ba5939'],
	[539, 541, 'white', '#eaded7'],
	[541, 546, 'black', '#141412'],
	[546, 548, 'white', '#eaded7'],
	[548, 549, 'dark red', '#684435', 'one pixel brownish line; colour uncertain at this resolution'],
	[549, 552, 'white', '#eaded7'],
	[552, 560, 'yellow', '#cabb5c'],
	[560, 580, 'blue', '#819cac', 'pale, mottled blue; its last pixel reads as a grey edge where it meets the yellow'],
	[580, 606, 'yellow', '#e0ce5c'],
	[606, 616, 'black', '#070403'],
	[616, 633, 'yellow', '#e0ca5c'],
	[633, 649, 'black', '#030204'],
	[649, 654, 'white', '#e0e2dd'],
	[654, 660, 'blue', '#39698b', 'strong blue, unlike the two pale ones'],
	[660, 686, 'yellow', '#dfcd59'],
	[686, 700, 'black', '#040301'],
	[700, 701, 'grey', '#646462', 'thin light line across the black'],
	[701, 735, 'black', '#040403'],
	[735, 763, 'grey', '#7c7c78', 'TEXTURED: white diagonal streaks on grey, ragged edge against the black before it, a dark rim at its end. Reading it as flashes or phosphorescence is inferred'],
	[763, 765, 'yellow', '#cab76d'],
	[765, 772, 'red', '#c24f2a'],
	[772, 779, 'white', '#e8e7d8'],
	[779, 799, 'yellow', '#e1ce5a'],
	// six black stripes alternating with white: a flicker, read off one run
	[799, 801, 'black', '#1e1410'],
	[801, 803, 'white', '#b6b6b0'],
	[803, 805, 'black', '#1e1410'],
	[805, 808, 'white', '#b6b6b0'],
	[808, 810, 'black', '#1e1410'],
	[810, 812, 'white', '#b6b6b0'],
	[812, 814, 'black', '#1e1410'],
	[814, 816, 'white', '#b6b6b0'],
	[816, 818, 'black', '#1e1410'],
	[818, 821, 'white', '#b6b6b0'],
	[821, 823, 'black', '#1e1410'],
	[823, 852, 'yellow', '#e4d160'],
];

// Narrow stripes INSIDE a wide one, running along the time axis, which is what
// the key calls *"schmale vertikale Streifen"*: simultaneous partial lightings.
// [x from, x to, colour, hex, scan y top, scan y bottom, note]
const LIGHT_INSIDE = [
	[217, 252, 'dark red', '#461309', 160, 168, 'along the left edge of the column, under the yellow stripe and on into the black after it'],
	[273, 303, 'yellow', '#ddc84c', 144, 168, 'the left two fifths of the white stripe'],
	[272, 303, 'black', '#0a0405', 139, 143, 'narrow bar across the middle of the white stripe'],
	[272, 303, 'black', '#0e0d0c', 125, 128, 'second narrow bar, nearer the right edge'],
	[354, 355, 'black', '#000000', 108, 146, 'one pixel line over the right three fifths only, at the end of the white; hex not sampled, too thin'],
	[441, 474, 'black', '#201d13', 120, 124, 'narrow bar near the right edge of the yellow stripe'],
	[498, 534, 'yellow', '#b0a857', 158, 161, 'narrow bar near the left edge of the long black, running on past the thin yellow line'],
];

// ── column 4, music ─────────────────────────────────────────────────────────
//
// The sirens are the coloured bars running along time, read at scan y 86 to 90.
// [x from, x to, colour, hex, note]
const SIRENS = [
	[177, 300, 'blue', '#4b748e', 'starts with the lane; staff strips cross it'],
	[304, 459, 'yellow', '#daca56'],
	[459, 528, 'outline', '#e6e5e0', 'an EMPTY bar: two thin grey edges and no fill, continuing the yellow. A siren at rest, a held tone or a guide line: not readable'],
	[533, 624, 'yellow', '#dccc59'],
	[640, 696, 'red', '#c34826'],
	[755, 773, 'yellow', '#cfc05b'],
	[780, 852, 'grey', '#747273', 'runs two pixels past the end of the light column, to 854; clipped to 1'],
];
const SIREN_INSIDE = [
	[804, 808, 'red', '#b85139', 'a short red block inside the grey bar'],
];

// Staff fragments: grey strips laid ACROSS the lane, with dark dots that are
// noteheads. [centre x, group, note]. A group is a set joined by a drawn
// bracket. NO NOTE, CLEF OR PITCH IS READABLE: a notehead is one or two dark
// pixels in this scan.
const STAFFS = [
	[191, 'a'], [205, 'a'],
	[231, null],
	[249, 'b'], [255, 'b'], [268, 'b'], [276, 'b'],
	[291, null],
	[413, null], [451, null],
	[529, null], [543, null], [554, null],
	[613, null], [634, null],
	[655, 'c'], [685, 'c', 'a yellow stepped figure joins it from the bar side, see the next table'],
	[757, null], [770, null],
	[798, null, 'carries a zigzag line on the far side of the bar'],
	[823, null], [836, null], [846, null],
];
const MUSIC_MARKS = [
	[672, 716, 'yellow stepped figure above the red siren, joined to a staff strip', 'seen', 'what it denotes is not readable'],
	[796, 800, 'zigzag line along a staff strip', 'seen', 'a trill, a glissando or a siren howl drawn as a wave: inferred, unsettled'],
];

// ── columns 1 and 2, form and movement ──────────────────────────────────────
//
// [id, x from, x to, label (hung orientation), folge item or null, how of the
// match, note]. The SHAPES are seen; every FOLGE match is inferred unless the
// glyph is the word itself.

const COL1 = [
	['c1-yellow-arrow', 176, 216, 'yellow arrow pointing down the column', 'Pfeile stürzen', 'inferred', 'an arrow pointing down with time; nearly the word itself'],
	['c1-red-disc', 190, 210, 'red disc, a black arrow pointing up into it and a white hollow arrow entering from the right', null, null],
	['c1-ring', 182, 236, 'black ring with two opposed hollow grey arrows inside it', 'Kreise rotieren', 'inferred', 'opposed arrows in a ring read as rotation'],
	['c1-big-arrow', 224, 238, 'large black arrow pointing across the column toward its left edge', 'Pfeile stürzen', 'inferred'],
	['c1-starburst', 238, 300, 'starburst of grey rays around a black disc, a yellow hand pointing into it', 'Elektro-Apparate', 'inferred', 'weak; Blitz Donner fits as well'],
	['c1-crossing-bars', 302, 344, 'red, blue and black bars crossing over thin lines, small arrows up, down, to and fro', 'schießen auf-ab hin-her', 'inferred'],
	['c1-grid', 344, 398, 'grey gridded square with concentric circles, crossed by red and blue bars', 'Gittersysteme von Farben', 'inferred', 'the plainest match after the arrows'],
	['c1-bars-on', 398, 440, 'red, blue and grey bars and small arrows continuing past the grid', 'schießen auf-ab hin-her', 'inferred'],
	['c1-frame', 440, 520, 'frame of thin lines with diagonals converging, like a perspective drawing', null, null],
	['c1-blades', 481, 575, 'two long black blade shapes, one above the other, a curved arrow at their tip', 'Riesen-Apparate schwingen', 'inferred', 'the curved arrow reads as a swing'],
	['c1-red-grid', 516, 558, 'grey grid with red cells, behind the blades', 'Gitter weiter', 'inferred'],
	['c1-red-eye', 617, 636, 'red target disc with a dark centre', 'Räder', 'inferred', 'weak; wheels or lamps'],
	['c1-small-arrows', 642, 658, 'small arrows pointing both ways between the red and blue discs', null, null],
	['c1-blue-eye', 665, 685, 'blue target disc with a dark centre', 'Räder', 'inferred', 'weak'],
	['c1-cable', 688, 704, 'black curved line from the column edge down to the yellow disc, like a cable or a whip', null, null],
	['c1-yellow-eye', 720, 738, 'yellow target disc with a black centre', 'Räder', 'inferred', 'weak'],
	['c1-rays', 730, 800, 'fan of grey rays from the yellow disc toward the figure', 'Explosionen', 'inferred', 'weak; it could as well be a beam of light'],
	['c1-figure', 794, 850, 'tumbling human figure in blue and white inside a circle with crosshairs', 'Clownerie', 'inferred', 'equally Menschmechanik; the only human on the plate, and last'],
];

const COL2 = [
	['c2-arrow', 185, 205, 'black arrow pointing down the column over an open half circle', 'Pfeile stürzen', 'inferred', 'nearly the word itself'],
	['c2-circle-bar', 208, 253, 'orange bar driven diagonally into a small grey circle with coloured ticks and two small inward arrows', 'Kreise rotieren', 'inferred', 'weak'],
	['c2-cue-line', 257, 261, 'black line with its arrowhead at the edge of column 3, pointing right into the light column', null, null, 'it lands on the pale blue light stripe at 256 to 262: a cue from column 2 into the light is inferred'],
	['c2-hollow-arrow', 286, 300, 'hollow white arrow pointing up the column, against time', null, null],
	['c2-ring-arrow', 385, 402, 'small black arrow pointing down with a small ring at its head', null, null],
	['c2-yellow-disc', 394, 429, 'yellow disc with a wedge cut out, a grey bar running down the column from it', 'Kreise rotieren', 'inferred'],
	['c2-blue-disc', 478, 500, 'pale blue disc with a hollow arrow pointing right, on a grey stem', null, null],
	['c2-red-arrow', 549, 577, 'red arrow pointing up the column, against time', null, null, 'an arrow against time before the cinema; rückwärts gedreht is possible but the list puts it after the cinema, so no match is made'],
	['c2-lens', 590, 600, 'small black square with a white circle in it', 'Kino auf Tageswand', 'inferred', 'read as the projector aperture'],
	['c2-funnel', 600, 803, 'grey funnel widening down the column from the square', 'Kino auf Tageswand', 'inferred', 'a projection beam; the strongest match in column 2'],
];

// The FOLGE list, from the page 44 image and the item's OCR, in the book's
// order. Columns 3 and 4 *"sind ohne Schlagworte deutlich"*.
const FOLGE = {
	1: ['Pfeile stürzen', 'Lamellen öffnen sich', 'Kreise rotieren', 'Elektro-Apparate', 'Blitz Donner', 'Gittersysteme von Farben', 'schießen auf-ab hin-her', 'Phosphoreszenz', 'Riesen-Apparate schwingen', 'blitzen', 'Gitter weiter', 'Räder', 'Explosionen', 'Gerüche', 'Clownerie', 'Menschmechanik'],
	2: ['Pfeile stürzen', 'Lamellen öffnen sich', 'Kreise rotieren', 'Kino auf Tageswand', 'rückwärts gedreht', 'Aktion', 'Tempo', 'wild'],
	'3+4': ['sind ohne Schlagworte deutlich'],
};

// The page 44 key, from the item's OCR text, checked against the page image.
// OCR slips corrected and listed in `keyCorrections`; nothing else changed.
const KEY = 'Nebenstehend die PARTITUR-SKIZZE einer MECHANISCHEN EXZENTRIK (siehe Seite 47) für ein Varieté. Die Bühne ist in drei Teile gegliedert. Der untere Teil für größere Formen und Bewegungen: I. BÜHNE. Die II. BÜHNE (oben) mit aufklappbarer Glasplatte für kleinere Formen und Bewegungen. (Die Glasplatte ist zugleich präparierte PROJEKTIONSWAND für von der Rückseite der Bühne projizierte Filmvorführungen.) Auf der III. (ZWISCHEN-)BÜHNE mechanische Musikapparate; meist ohne Resonanzkasten, nur mit Schalltrichtern (Schlag-, Geräusch- und Blas-Instrumente). Einzelne Wände der Bühne sind doppelt mit weißer Leinwand bespannt, die farbige Lichter aus Scheinwerfern und Lichtbäumen durchlassen und zerstreuen. Die 1. und 2. Kolonne der Partitur bedeuten in senkrecht abwärtsgehender Kontinuität Form- und Bewegungsvorgänge. Die 3. Kolonne zeigt nacheinander folgende Lichtwirkungen: Die Breite der Streifen bedeutet die Dauer. Schwarz = Finsternis. Die in den breiten Streifen vorhandenen schmalen vertikalen Streifen sind gleichzeitige Teilbeleuchtungen der Bühne. Die 4. Kolonne ist für Musik vorgesehen; hier nur in den Absichten angedeutet. Die farbigen Vertikalstreifen bedeuten verschiedenartig heulende Sirenentöne, die einen großen Teil der Vorgänge begleiten. Die Gleichzeitigkeit ist in der Partitur aus der Horizontale zu lesen.';
const KEY_CORRECTIONS = [
	'OCR "EXZENTERIK" read as EXZENTRIK, as the plate title spells it',
	'OCR "Variet@" read as Varieté',
	'the book separates sentences with a square ornament, OCR "@"; given here as full stops',
	'OCR "ı." read as 1.; line-break hyphens joined; "Teilder", "ausder Horizontalezulesen" spaced',
];

// ── build ───────────────────────────────────────────────────────────────────

const errors = [];
const span = (x0, x1) => ({ from: frac(Math.max(x0, X0)), to: frac(Math.min(x1, X1)), px: [x0, x1] }); // px kept raw; a glyph one pixel outside the light column is clipped to 0 or 1

let cursor = X0;
const light = LIGHT.map(([x0, x1, colour, hex, note], i) => {
	if (x0 !== cursor) errors.push(`light row ${i} starts at ${x0}, the previous one ended at ${cursor}`);
	if (x1 <= x0) errors.push(`light row ${i} is empty`);
	cursor = x1;
	const row = { ...span(x0, x1), colour, hex, hexHow: 'sampled', inside: false, how: 'seen' };
	if (colour === 'white') row.reading = { text: 'unprinted paper, read as white light', how: 'inferred' };
	if (colour === 'black') row.reading = { text: 'Finsternis, darkness, by the key', how: 'seen' };
	if (note) row.note = note;
	return row;
});
if (cursor !== X1) errors.push(`light column ends at ${cursor}, expected ${X1}`);

const lightInside = LIGHT_INSIDE.map(([x0, x1, colour, hex, yHi, yLo, note]) => {
	const host = light.filter((r) => r.px[0] < x1 && r.px[1] > x0).map((r) => `${r.colour} ${r.px[0]}-${r.px[1]}`);
	return { ...span(x0, x1), colour, hex, hexHow: hex === '#000000' ? 'chosen' : 'sampled', inside: true, across: across(yHi, yLo), over: host, how: 'seen', note };
});

const sirens = [
	...SIRENS.map(([x0, x1, colour, hex, note]) => ({ ...span(x0, x1), colour, hex, hexHow: 'sampled', inside: false, how: 'seen', ...(note ? { note } : {}) })),
	...SIREN_INSIDE.map(([x0, x1, colour, hex, note]) => ({ ...span(x0, x1), colour, hex, hexHow: 'sampled', inside: true, how: 'seen', note })),
];
const staffs = STAFFS.map(([x, group, note]) => ({ at: frac(x), px: x, kind: 'staff fragment', group, how: 'seen', readable: false, ...(note ? { note } : {}) }));
const musicMarks = MUSIC_MARKS.map(([x0, x1, label, how, note]) => ({ ...span(x0, x1), at: frac((x0 + x1) / 2), label, how, note }));

const marks = (rows) => rows.map(([id, x0, x1, label, folge, matchHow, note]) => {
	const m = { id, ...span(x0, x1), at: frac((x0 + x1) / 2), label, how: 'seen' };
	if (folge) m.folge = { item: folge, how: matchHow };
	if (note) m.note = note;
	return m;
});
const col1 = marks(COL1);
const col2 = marks(COL2);

const folge = Object.entries(FOLGE).map(([col, items]) => ({
	column: col,
	items: items.map((item) => {
		const pool = col === '1' ? col1 : col === '2' ? col2 : [];
		const hits = pool.filter((m) => m.folge && m.folge.item === item).map((m) => m.id);
		return { item, matches: hits, how: hits.length ? 'inferred' : null, ...(hits.length || col === '3+4' ? {} : { note: 'no glyph matched' }) };
	}),
}));
for (const m of [...col1, ...col2]) {
	if (m.folge && !Object.values(FOLGE).flat().includes(m.folge.item)) errors.push(`${m.id} names "${m.folge.item}", which is not in the FOLGE list`);
}

const all = [...light, ...lightInside, ...sirens, ...staffs, ...musicMarks, ...col1, ...col2];
for (const r of all) {
	for (const k of ['from', 'to', 'at']) if (k in r && (r[k] < 0 || r[k] > 1)) errors.push(`${r.id || r.colour || r.kind} ${k}=${r[k]} is outside 0..1`);
	if (r.how !== 'seen' && r.how !== 'inferred') errors.push(`a row has no how: ${JSON.stringify(r).slice(0, 80)}`);
}
if (errors.length) {
	console.error('build-moholy-partiturskizze: refused\n  ' + errors.join('\n  '));
	process.exit(1);
}

const order = (rows) => rows.filter((r) => !r.inside).map((r) => r.colour);
const doc = {
	meta: {
		what: 'Moholy-Nagy\'s Partiturskizze zu einer mechanischen Exzentrik read off the archive.org scan as four lanes of spans and marks, every row marked seen or inferred.',
		title: 'Partiturskizze zu einer mechanischen Exzentrik. Synthese von Form, Bewegung, Ton, Licht (Farbe) und Geruch',
		titleHow: 'seen',
		author: 'László Moholy-Nagy',
		date: 'compiled by spring 1924, published 1925',
		dateHow: 'read: the book\'s imprint says it was compiled in spring 1924 and delayed',
		measured: '2026-10-04',
		builtBy: 'demo/resources/build-moholy-partiturskizze.mjs',
	},
	source: {
		book: 'Oskar Schlemmer, L. Moholy-Nagy, Farkas Molnár, Die Bühne im Bauhaus, Bauhausbücher 4, Albert Langen Verlag, München, 1925',
		keyPage: 44,
		platePage: 47,
		platePageHow: 'read: the key says "(siehe Seite 47)"; the plate is also page 47 of the scan PDF',
		archive: ARCHIVE,
		file: PDF,
		image: 'PDF page 47, its one embedded JPEG, 902 x 345 px, plate photographed flat and sideways',
		licence: 'archive.org marks the item with the Public Domain Mark',
		key: KEY,
		keyCorrections: KEY_CORRECTIONS,
		folge: FOLGE,
	},
	frame: {
		orientation: 'as printed and hung: title at the top, time running down, columns 1 to 4 left to right. The scan has it sideways with time running right',
		positions: 'fractions of the scored length, 0 at the top of the lanes and 1 at the bottom',
		across: 'fraction of a column\'s width, 0 at its left edge as hung',
		scoredLengthPx: [X0, X1],
		scoredLengthHow: 'seen: the extent of column 3, the only column with a stated time scale; the others start and end within two pixels of it',
		resolution: r4(1 / LEN),
		resolutionNote: 'one scan pixel; nothing on the plate is located more finely than this, and one pixel stripes are at the limit of what the scan shows',
	},
	unit: {
		unit: 'fraction',
		given: false,
		how: 'seen',
		note: 'Moholy gave no unit, no tempo and no total length, on the plate or in the key. A page that plays this must choose a total duration and say that it chose it.',
		suggested: {
			totalSeconds: 480,
			how: 'inferred',
			reasoning: 'It is a variety number (*"für ein Varieté"*), and an act of five to ten minutes is the usual size of one; that range is my assumption, not a source. At 480 s one scan pixel is 0.71 s, so the one pixel lines last under a second and still read as flashes, the six-stripe flicker near the end alternates at about 1.4 s, and the longest darkness (367 to 439) lasts 51 s. Anything from 300 s to 600 s keeps the thinnest stripe above 0.4 s and the longest darkness under 65 s. How Theater der Klänge timed it in 1987 is not known here and would be the better source.',
		},
	},
	stage: {
		how: 'seen',
		note: 'the axonometric beside the title, part of the score: I. Bühne below, II. Bühne above with its glass Projektionswand, labelled on the plate. The III. (Zwischen-)Bühne with the music machines is in the key and not legible as a label in this scan',
	},
	lanes: [
		{ n: 1, name: 'Form + Bewegung (I. Bühne)', nameHow: 'seen', stage: 'I. Bühne', marks: col1 },
		{ n: 2, name: 'Form + Bewegung + Kino (II. Bühne)', nameHow: 'inferred', nameNote: 'the column label is too small to read in this scan; the wording is from the museum photographs read earlier today and fits the key', stage: 'II. Bühne', marks: col2 },
		{ n: 3, name: 'Licht (Farbe)', nameHow: 'seen', scale: 'stripe width is duration (the key)', spans: [...light, ...lightInside] },
		{ n: 4, name: 'Ton (Musik)', nameHow: 'seen', intent: true, intentNote: 'the key: "hier nur in den Absichten angedeutet", only indicated as intentions. The coloured bars are the sirens; the staff fragments stand in for music not yet written', spans: sirens, marks: [...staffs, ...musicMarks] },
	],
	folgeMatches: folge,
	unreadable: [
		'every notehead, clef and pitch in the staff fragments of column 4: a notehead is one or two dark pixels',
		'the column 2 label (taken from the museum photographs, marked inferred)',
		'the small handwritten-looking annotations beside several column 1 and 2 glyphs',
		'one pixel lines in column 3 (343 to 351, 354, 477, 548, 700): their presence is seen, their exact width and colour are not',
		'whether the empty outline bar in column 4 (459 to 528) is a sound or a guide',
		'what the yellow stepped figure and the zigzag in column 4 denote',
	],
	unmatched: {
		column1: FOLGE[1].filter((it) => !col1.some((m) => m.folge && m.folge.item === it)),
		column2: FOLGE[2].filter((it) => !col2.some((m) => m.folge && m.folge.item === it)),
		note: 'Gerüche has no glyph I can identify: smell is a word in the running order and nothing on the plate',
	},
	summary: {
		lightSpans: light.length,
		lightInside: lightInside.length,
		lightOrder: order(light),
		sirens: sirens.filter((r) => !r.inside).length,
		sirenInside: sirens.filter((r) => r.inside).length,
		sirenOrder: order(sirens),
		staffFragments: staffs.length,
		column1Marks: col1.length,
		column2Marks: col2.length,
	},
};

if (CHECK) {
	console.log(`light ${light.length} spans + ${lightInside.length} inside`);
	for (const r of [...light, ...lightInside].sort((a, b) => a.from - b.from)) console.log(`  ${r.from.toFixed(4)} to ${r.to.toFixed(4)}  ${r.inside ? 'inside ' : ''}${r.colour}`);
	console.log(`sirens ${doc.summary.sirens} + ${doc.summary.sirenInside} inside, staffs ${staffs.length}, col1 ${col1.length}, col2 ${col2.length}`);
	console.log('unmatched', JSON.stringify(doc.unmatched));
} else {
	writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n');
	console.log(`wrote ${OUT}: ${light.length} light spans, ${lightInside.length} inside, ${doc.summary.sirens} sirens, ${staffs.length} staffs, ${col1.length} + ${col2.length} marks`);
}
