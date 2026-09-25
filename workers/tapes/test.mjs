// workers/tapes/test.mjs: the proxy's two gates, with no network and no worker.
//
//   node workers/tapes/test.mjs
//
// 🔴 WHAT IT GRADES IS THE SCOPING, WHICH IS THE ONE CLAIM IN THAT FILE WORTH
// DOUBTING. "It caches" can be read off the source; "it is not an open relay"
// is a claim about every input anybody can send, and a proxy that answered for
// one URL it should have refused would be a bandwidth laundromat for whoever
// found it, on this account's egress.
//
// 🔴 A NAMED PROPORTION OF THIS FILE IS NEGATIVE CONTROLS, which is the
// convention in `demo/shell/*-test.mjs` and the reason to believe any of it.
// THIRTEEN of the nineteen are written so that a gate which had been removed
// would fail them, COUNTED rather than claimed. A validator that refuses
// everything is the same bug from the other side, so five of the other six are
// positive controls on inputs that must be accepted, and the REASON is asserted
// as well as the refusal.
//
// ⚠️ WHAT IT DOES NOT GRADE, SAID HERE RATHER THAN DISCOVERED LATER: nothing in
// this file opens a socket, so it says nothing about whether the cache really
// holds, whether Cloudflare honours `cacheTtl`, whether archive.org answers a
// Range, or whether a media element is happy with what comes back. Those need
// the worker deployed and a recording fetched, and the second half of that is
// the thing the standing external-source rule says not to do on a whim.

import { resolveTape, rangeKey, originOk } from './worker.mjs';

// ⚠️ NO MIDDOT IN THE JOIN, WHICH IS CLAUDE.md'S RULE ABOUT THE CHARACTER THAT
// REPLACED THE EM DASH. `pedal-test.mjs` already prints its detail on plain
// spaces; `looper-test.mjs` does not, and this is a new file rather than a
// sweep of an old one.
let pass = 0, fail = 0;
const ok = (what, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok    ${what}${detail ? `   ${detail}` : ''}`); }
  else { fail++; console.log(`  FAIL  ${what}${detail ? `   ${detail}` : ''}`); }
};

// A corpus the shape of the real one, small enough to read. The two Saharan ids
// are VERBATIM from `demo/resources/corpus.json` because they are the substring
// trap this repository has already paid for three times in one day.
const II = 'ia:videoplayback-13_202304/Erkki Kurenniemi - Saharan uni II (64 kbps).mp3';
const I = 'ia:videoplayback-13_202304/Erkki Kurenniemi - Saharan uni I (64 kbps).mp3';
const ROWS = [
  { id: II, title: 'Saharan uni II',
    file: 'https://archive.org/download/videoplayback-13_202304/Saharan%20uni%20II.mp3' },
  { id: 'fng:unpublished-series', title: 'a collection nobody can read', file: null },
  { id: 'zen:1', title: 'a thesis', file: 'https://zenodo.org/records/1/files/a.mp3' },
  { id: 'evil:1', title: 'a row pointing at a stranger',
    file: 'https://example.invalid/anything.mp3' },
  { id: 'plain:1', title: 'a row on http', file: 'http://archive.org/download/x.mp3' },
  { id: 'bent:1', title: 'a row whose file is not a URL', file: 'not a url at all' },
];

console.log('[the corpus gate]');

// POSITIVE CONTROL. A gate that refused everything would pass every negative
// below and be worthless, so this one is the first.
{
  const got = resolveTape(ROWS, II);
  ok('a row that is in the corpus resolves to its own file',
    !got.why && got.url.startsWith('https://archive.org/download/'),
    got.why || got.url);
}
{
  const got = resolveTape(ROWS, 'zen:1');
  ok('a second host on the list resolves too', !got.why && got.url.includes('zenodo.org'),
    got.why || got.url);
}

// 🔴 THE SUBSTRING TRAP, AND IT IS THE REASON THIS FILE EXISTS AT ALL.
// `"Saharan uni II".includes("Saharan uni I")` is TRUE, and `Saharan uni I` was
// removed from the corpus on 2026-09-25 while `Saharan uni II` stayed. A
// resolver written on `includes` would hand out the SECOND recording for the
// id of the first, which is not an error anywhere: a working proxy, a playable
// file, and the wrong piece of music.
{
  const got = resolveTape(ROWS, I);
  ok('an id that is a PREFIX of a real id resolves to nothing',
    !!got.why && !got.url, got.why || `it answered ${got.url}`);
}
{
  const got = resolveTape(ROWS, 'Saharan');
  ok('a fragment of an id resolves to nothing', !!got.why && !got.url,
    got.why || `it answered ${got.url}`);
}

// NEGATIVE CONTROLS on everything that is not a playable row.
for (const [id, what] of [
  ['nothing at all', 'an id nobody has'],
  ['fng:unpublished-series', 'a row with no file'],
  ['evil:1', 'a row pointing at a host that is not on the list'],
  ['plain:1', 'a row on plain http'],
  ['bent:1', 'a row whose file is not a URL'],
]) {
  const got = resolveTape(ROWS, id);
  ok(`${what} is refused`, !!got.why && !got.url, got.why || `it answered ${got.url}`);
}

// ⚠️ THE REASON IS ASSERTED, NOT ONLY THE REFUSAL. `bay-test.mjs` does the same
// and for the same reason: a resolver that answered "no" to everything with one
// message would pass every line above.
{
  const a = resolveTape(ROWS, 'nothing at all').why;
  const b = resolveTape(ROWS, 'fng:unpublished-series').why;
  const c = resolveTape(ROWS, 'evil:1').why;
  ok('the three refusals give three different reasons',
    a !== b && b !== c && a !== c, [a, b, c].join(' / '));
  ok('the host refusal names the host and not the list',
    c.includes('example.invalid') && !c.includes('archive.org'), c);
}

console.log('[the range key]');
ok('no range is one key', rangeKey(null) === 'whole', String(rangeKey(null)));
ok('two spellings of the same open range are one key',
  rangeKey('bytes=0-') === rangeKey('BYTES=0-') && rangeKey('bytes=0-') === rangeKey(' bytes=-'),
  `${rangeKey('bytes=0-')} / ${rangeKey('BYTES=0-')} / ${rangeKey(' bytes=-')}`);
ok('two different ranges are two keys', rangeKey('bytes=0-99') !== rangeKey('bytes=100-199'),
  `${rangeKey('bytes=0-99')} vs ${rangeKey('bytes=100-199')}`);
// ⚠️ A MULTIPART RANGE IS NOT CACHED RATHER THAN CACHED WRONG. `null` is the
// worker's signal to go straight upstream and skip the cache entirely, which is
// a slower answer and never a wrong one.
ok('a range shape this does not understand refuses a key rather than inventing one',
  rangeKey('bytes=0-99,200-299') === null && rangeKey('items=1-2') === null,
  'both null');

console.log('[the origin echo]');
ok('the site is echoed', originOk('https://positron.studio') === 'https://positron.studio');
ok('a development server is echoed', originOk('http://127.0.0.1:8890') === 'http://127.0.0.1:8890');
ok('somebody else is not', originOk('https://example.com') === null);
// 🔴 THE SUBSTRING TRAP AGAIN, ONE LAYER DOWN. `endsWith('.positron.studio')`
// is the test rather than `includes('positron.studio')`, because
// `https://positron.studio.example.com` contains the site's name and is not it.
ok('a hostname that merely CONTAINS the site is not the site',
  originOk('https://positron.studio.example.com') === null
  && originOk('https://notpositron.studio') === null,
  'both refused');

console.log(`\n${pass}/${pass + fail} green`);
process.exit(fail ? 1 : 0);
