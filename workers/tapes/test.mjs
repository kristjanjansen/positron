// node workers/tapes/test.mjs: the proxy's two gates, no network. Thirteen of 19 asserts are
// negative controls; it does not grade the cache, Range support or archive.org.
// why: lessons/workers-tapes.md#test-header

import { resolveTape, rangeKey, originOk } from './worker.mjs';

// Detail is joined on plain spaces.
// why: lessons/workers-tapes.md#join
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

// A resolver on `includes` would hand `Saharan uni II` out for the id `Saharan uni I`.
// why: lessons/workers-tapes.md#substring
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

// The reason is asserted too: a resolver refusing everything with one message passes the rest.
// why: lessons/workers-tapes.md#reason
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
// A multipart range gets no key (null), so it goes upstream uncached rather than cached wrong.
// why: lessons/workers-tapes.md#multipart
ok('a range shape this does not understand refuses a key rather than inventing one',
  rangeKey('bytes=0-99,200-299') === null && rangeKey('items=1-2') === null,
  'both null');

console.log('[the origin echo]');
ok('the site is echoed', originOk('https://positron.studio') === 'https://positron.studio');
ok('a development server is echoed', originOk('http://127.0.0.1:8890') === 'http://127.0.0.1:8890');
ok('somebody else is not', originOk('https://example.com') === null);
// `endsWith('.positron.studio')`, since `positron.studio.example.com` contains the name.
// why: lessons/workers-tapes.md#suffix
ok('a hostname that merely CONTAINS the site is not the site',
  originOk('https://positron.studio.example.com') === null
  && originOk('https://notpositron.studio') === null,
  'both refused');

console.log(`\n${pass}/${pass + fail} green`);
process.exit(fail ? 1 : 0);
