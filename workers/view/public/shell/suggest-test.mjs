// demo/shell/suggest-test.mjs. The chord suggester, with no browser at all.
//
//   node demo/shell/suggest-test.mjs
//
// 🔴 A PACKED TABLE IS UNREADABLE BY EYE, so the only thing between a decoding
// bug and a page proposing the wrong chord confidently is this file. It reads
// the real `demo/resources/chord-tables.json` off the disk, decodes it through
// the same `useTables` a page calls, and asks it the named jazz devices that
// `research/chord-suggester-benchmark-2026-09-23.md` graded.
//
// ⚠️ AND IT ASKS THEM THROUGH `suggest()` RATHER THAN THROUGH THE DECODER. The
// build script already round trips its own packing. What is untested until here
// is everything between a chord somebody played and a chord on a roll: the
// tonic, the two slots, the spelling, and whether the name that comes out can
// be turned back into notes at all.
//
// ⚠️ SIX OF THESE ARE NEGATIVE CONTROLS, including a truncated table, a
// sabotaged unigram and a style that does not exist.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suggest, useTables, tablesIn, styleNames, STYLES, keysFitting, pickKey, numeralIn }
  from './suggest.mjs';
import { parseChord } from './chords.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TABLE_PATH = join(HERE, '..', 'resources', 'chord-tables.json');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? '   ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? '   ' + detail : ''}`); }
};
const C = (root, quality) => ({ root, quality });
const names = (r) => r.picks.map((p) => p.name).join(' and ');

console.log('\n== the rule, before any table is loaded ==');

// 1. The 173 byte rule still answers, which is what a page has before the fetch
//    lands and what it falls back to on a context nothing has seen.
ok('the plain rule answers with no table loaded at all',
  tablesIn() === false && suggest({ chords: [C(0, 'maj'), C(7, 'maj')] },
    { style: 'plain' }).source === 'plain',
  suggest({ chords: [C(0, 'maj'), C(7, 'maj')] }, { style: 'plain' }).says);

// 2. 🔴 A MINOR KEY TABLE IS NOT OPTIONAL, and this was a live gap: `Am then F`
//    reads as `i then VI` and a major-only rule returns nothing at all.
{
  const r = suggest({ chords: [C(9, 'min'), C(5, 'maj')] }, { style: 'plain' });
  ok('the plain rule answers in a minor key, which a major-only one could not',
    r.ok && r.keyName === 'A minor' && r.from === 'VI' && r.picks.length === 2,
    `${r.from} then ${names(r)}`);
}

// 3. NEGATIVE CONTROL, AND IT IS NOT AN EDGE CASE. `Dm then G` fits C major and
//    A minor and neither is rooted on D, so the fiat cannot be applied and the
//    page must say the key is a guess. A ii V is one of the commonest openings
//    there is.
{
  const r = suggest({ chords: [C(2, 'min'), C(7, 'maj')] }, { style: 'plain' });
  ok('a ii V cannot take its own first chord as the key, and says so',
    r.guessed === true && r.keyName === 'C major' && r.says.includes('a guess'), r.says);
}

// 4. NEGATIVE CONTROL: two chords from no key at all fall back to something
//    that always exists, and say that is what happened.
//    ⚠️ THE RESEARCH'S OWN EXAMPLE FOR THIS WAS `C then Eb` AND IT NO LONGER
//    FITS NOTHING, which is the harmonic minor's `V` row earning its keep
//    rather than a regression: in F minor those two are `V` and `III`, and a
//    player going C to Eb really might be in F minor. A tritone pair is the
//    honest replacement, because a major triad a tritone from another major
//    triad is in no key of either mode.
{
  const r = suggest({ chords: [C(0, 'maj'), C(6, 'maj')] }, { style: 'plain' });
  ok('two chords in no key at all get a fifth either side and a sentence saying so',
    r.source === 'fifths' && names(r) === 'Gmaj and Fmaj' && r.says.includes('nothing in'),
    r.says);
  ok('and the pair the research used for this fits F minor now, which is the harmonic V',
    pickKey([C(0, 'maj'), C(3, 'maj')]).key?.mode === 'minor'
    && pickKey([C(0, 'maj'), C(3, 'maj')]).key?.pc === 5,
    `C then Eb reads as ${numeralIn(0, 'maj', pickKey([C(0, 'maj'), C(3, 'maj')]).key)} then `
    + `${numeralIn(3, 'maj', pickKey([C(0, 'maj'), C(3, 'maj')]).key)} in F minor`);
}

// 5. Fewer than two chords is refused rather than guessed at, which is the
//    owner's own condition: *"when have at least 2, suggest 3rd and 4th"*.
ok('nothing is suggested from one chord',
  suggest({ chords: [C(0, 'maj')] }).ok === false && suggest({ chords: [] }).ok === false,
  suggest({ chords: [C(0, 'maj')] }).says);

console.log('\n== the key, which is a fiat and cannot be deduced ==');

// 6. MEASURED: two chords fit 3.33 keys of 24 on average and never fewer than
//    2, and three chords never fit exactly 1, because a major key and its
//    relative minor hold the same seven chords.
//    ⚠️ THE NUMBERS MOVED WHEN THE HARMONIC MINOR'S OWN `V` AND `vii` WERE
//    ADDED, which is honest: a minor key with a major dominant fits MORE
//    progressions, so the average rises from 3.33 to 3.38. The floor of 2 is what the argument
//    rests on and it does not move.
{
  const tri = [[0, 'maj'], [2, 'min'], [4, 'min'], [5, 'maj'], [7, 'maj'], [9, 'min'], [11, 'dim']];
  const counts = [];
  for (const a of tri) for (const b of tri) {
    if (a === b) continue;
    counts.push(keysFitting([C(a[0], a[1]), C(b[0], b[1])]).length);
  }
  const mean = counts.reduce((s, n) => s + n, 0) / counts.length;
  ok('two chords never pin a key down to one',
    Math.min(...counts) >= 2 && counts.length === 42,
    `${counts.length} ordered pairs of C major's own triads fit ${mean.toFixed(2)} keys on `
    + `average and never fewer than ${Math.min(...counts)}`);
}

// 7. 🔴 THE MINOR ii V IS WHY THE HARMONIC MINOR'S MAJOR `V` IS IN THE DEGREE
//    TABLE. `Dm7b5 G7` has a MAJOR dominant, a natural minor has a minor one,
//    and without that row no key fits the commonest opening in jazz at all.
{
  const k = pickKey([C(2, 'min7b5'), C(7, '7')]);
  ok('a minor ii V finds its key, which a natural minor alone could not',
    k.key?.pc === 0 && k.key?.mode === 'minor' && k.tonic === 0
    && numeralIn(7, '7', k.key) === 'V',
    `${k.fits.length} keys fit and the first is ${k.key.pc} ${k.key.mode}, where G7 is `
    + `${numeralIn(7, '7', k.key)}`);
}

console.log('\n== the counted table ==');

const json = JSON.parse(readFileSync(TABLE_PATH, 'utf8'));
const loaded = useTables(json);

// 8. It decodes at all, and both styles arrive.
ok('the shipped table decodes into two styles through the page-facing call',
  tablesIn() === true && loaded.includes('jazz') && loaded.includes('pop')
  && styleNames().includes('plain') && STYLES.jazz.tri.size > 100,
  `${loaded.join(' and ')}, ${STYLES.jazz.tri.size} jazz trigram contexts and `
  + `${STYLES.jazz.bi.size} bigram, out of ${readFileSync(TABLE_PATH).length} bytes`);

/**
 * 🔴 THE NAMED DEVICES, ASKED THROUGH THE WHOLE PATH. Each row is two chords
 * somebody could really play and the chord the benchmark says the table knows
 * follows them. MEASURED there at 12 of 16 named devices in the top 2; these
 * seven are the ones this page's own recogniser can reach, since it has no
 * `dim7` in its vocabulary by design.
 */
const DEVICES = [
  ['a ii V in C', [C(2, 'min7'), C(7, '7')], 0, 'the major ii V I'],
  ['a minor ii V', [C(2, 'min7b5'), C(7, '7')], 0, 'the minor ii V i'],
  ['a secondary dominant', [C(0, 'maj7'), C(9, '7')], 2, 'the V of ii'],
  ['a chain of dominants', [C(9, '7'), C(2, 'min7')], 7, 'the next link'],
  ['a ii V a tone down', [C(5, 'min7'), C(10, '7')], 3, 'the same shape moved'],
  ['I then ii', [C(0, 'maj7'), C(2, 'min7')], 7, 'the dominant it sets up'],
  ['vi then ii', [C(9, 'min7'), C(2, 'min7')], 7, 'the dominant it sets up'],
];

// 9. 🔴 THE MEASUREMENT THE WHOLE TABLE IS FOR. Not *does it decode* but *does
//    a chord somebody played come back with the chord that really follows it*.
{
  const missed = [], atA = [];
  for (const [label, chords, wantRoot] of DEVICES) {
    const r = suggest({ chords }, { style: 'jazz' });
    const roots = r.picks.map((p) => p.root);
    if (roots[0] === wantRoot) atA.push(label);
    else if (!roots.includes(wantRoot)) missed.push(`${label} gave ${names(r)}`);
  }
  ok('the jazz table names the real next chord for the devices it was graded on',
    missed.length === 0,
    missed.length ? missed.join('; ')
      : `${atA.length} of ${DEVICES.length} at the first slot and the rest at the second`);
}

// 10. 🔴 AND EVERY ONE OF THEM READ THE TABLE RATHER THAN FALLING THROUGH TO
//     THE RULE, which is the half that says the number above is about the
//     table. A suggester silently backing off would score the same and mean
//     something else entirely.
ok('and every one of them came out of the counted table, not out of the fallback',
  DEVICES.every(([, chords]) => suggest({ chords }, { style: 'jazz' }).source === 'corpus'),
  DEVICES.map(([l, ch]) => `${l} ${suggest({ chords: ch }, { style: 'jazz' }).source}`).join(', '));

// 11. 🔴 TWO SLOTS, TWO JOBS, AND SLOT B IS NOT SLOT A'S RUNNER UP BY
//     PROBABILITY. It is the continuation most SPECIFIC to this context, which
//     is what separates an idiom from a cliche and is a quantity rather than a
//     taste. MEASURED in the benchmark: slot A names the real next chord 48.7
//     per cent of the time and is the globally commonest chord 16.2 per cent of
//     the time; slot B names it 9.9 per cent and is the global maximum 1.0 per
//     cent, with 90.7 per cent of what it offers still attested.
{
  const rs = DEVICES.map(([, chords]) => suggest({ chords }, { style: 'jazz' }));
  const two = rs.filter((r) => r.picks.length === 2);
  const differ = two.filter((r) => r.picks[0].name !== r.picks[1].name).length;
  ok('the two slots are two different chords and two different reasons',
    two.length >= DEVICES.length - 1 && differ === two.length
    && two.every((r) => r.picks[0].role === 'usual' && r.picks[1].role === 'other')
    && two.every((r) => r.picks[0].why !== r.picks[1].why),
    two.map((r) => `${r.picks[0].name} then ${r.picks[1].name}`).join(', '));
}

// 12. NEGATIVE CONTROL for slot B's ranking. It is chosen by pointwise mutual
//     information against the unigram, so a unigram forced flat must be able to
//     change it. A slot B that never moved would be the second most probable
//     row wearing a different name.
{
  const before = DEVICES.map(([, ch]) => suggest({ chords: ch }, { style: 'jazz' }).picks[1]?.name);
  const real = STYLES.jazz.uni;
  STYLES.jazz.uni = new Map([...real.keys()].map((k) => [k, 1 / real.size]));
  const after = DEVICES.map(([, ch]) => suggest({ chords: ch }, { style: 'jazz' }).picks[1]?.name);
  STYLES.jazz.uni = real;
  const moved = before.filter((n, i) => n !== after[i]).length;
  ok('NEGATIVE CONTROL: flattening what is common everywhere moves what slot B offers',
    moved > 0,
    `${moved} of ${before.length} second suggestions changed, so slot B really is ranked `
    + 'against how common a chord is rather than by probability alone');
}

// 13. 🔴 THE STYLE DIAL IS A CONTROL THAT DOES SOMETHING, AND HALF OF IT IS THE
//     SPELLING. MEASURED in the benchmark: the two tables disagree on the first
//     suggestion for 71.2 per cent of shared bigram contexts, AND 59 of 75
//     shared symbols are written differently, jazz writing `min7` and `maj7`
//     where pop writes `min` and `maj`. A dial that swapped the table and kept
//     one spelling would be half a dial.
{
  const ctxs = [[C(2, 'min7'), C(7, '7')], [C(0, 'maj7'), C(5, 'maj7')],
    [C(9, 'min7'), C(2, 'min7')], [C(0, 'maj'), C(7, 'maj')], [C(5, 'maj'), C(0, 'maj')]];
  const j = ctxs.map((ch) => names(suggest({ chords: ch }, { style: 'jazz' })));
  const p = ctxs.map((ch) => names(suggest({ chords: ch }, { style: 'pop' })));
  const differ = j.filter((s, i) => s !== p[i]).length;
  ok('the two styles answer differently, in the chord and in how it is spelled',
    differ >= 4 && j.some((s) => /min7|maj7/.test(s)),
    ctxs.map((_, i) => `${j[i]} against ${p[i]}`).join(' | '));
}

// 14. 🔴 A NAME THE PAGE CANNOT VOICE IS A LABEL THAT LIES ABOUT ITS OWN DOTS.
//     Every suggestion has to go back through `parseChord`, because the roll
//     draws the notes and the label side by side and they must be the same
//     chord. `aug(b7,9)` is a real spelling in that table and nothing here can
//     play it, so it falls back to its class rather than being drawn over notes
//     that are not it.
{
  const bad = [];
  for (const style of ['jazz', 'pop']) {
    for (let root = 0; root < 12; root++) {
      for (const q of ['maj', 'min', 'maj7', 'min7', '7', 'min7b5', 'dim', 'sus4', 'aug']) {
        for (const second of [0, 2, 5, 7, 9]) {
          const r = suggest({ chords: [C(root, q), C((root + second) % 12, 'maj')] }, { style });
          for (const p of r.picks) {
            const back = parseChord(p.name);
            if (!back.ok || back.root !== p.root) bad.push(`${style} ${p.name}`);
          }
        }
      }
    }
  }
  ok('every chord this module proposes can be parsed back into the notes it names',
    bad.length === 0,
    bad.length ? `${bad.length} bad, first five ${bad.slice(0, 5).join(', ')}`
      : '1,080 contexts across both styles and every suggestion round trips');
}

// 15. NEGATIVE CONTROL: a style nobody loaded falls back to the rule rather
//     than throwing or going silent.
{
  const r = suggest({ chords: [C(0, 'maj'), C(7, 'maj')] }, { style: 'nothing-by-that-name' });
  ok('NEGATIVE CONTROL: an unknown style answers from the rule rather than failing',
    r.ok === true && r.source === 'plain', `${r.source}, ${names(r)}`);
}

// 16. 🔴 THE SABOTAGE, BECAUSE A DECODER THAT READ GARBAGE WOULD STILL ANSWER.
//     A table truncated to one record must take the device check red. If it
//     does not, this whole file is decoration, which is the finding this
//     repository has recorded four times about its own instruments.
{
  const keep = { jazz: STYLES.jazz, pop: STYLES.pop };
  useTables({ ...json,
    jazz: { ...json.jazz, bi: json.jazz.bi.slice(0, 1 + 2 * json.keep),
      tri: json.jazz.tri.slice(0, 2 + 2 * json.keep) } });
  const still = DEVICES.filter(([, chords]) =>
    suggest({ chords }, { style: 'jazz' }).source === 'corpus').length;
  STYLES.jazz = keep.jazz; STYLES.pop = keep.pop;
  ok('SABOTAGE: a table truncated to one record answers from the table almost never',
    still <= 1,
    `${still} of ${DEVICES.length} devices still read the table, against `
    + `${DEVICES.length} with the real one`);
}

// 17. And the real table is back, so the sabotage above cannot leak into a
//     number anybody quotes.
ok('and the real table is back in place after the sabotage',
  DEVICES.every(([, chords]) => suggest({ chords }, { style: 'jazz' }).source === 'corpus'),
  `${DEVICES.length} of ${DEVICES.length} reading the table again`);

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
