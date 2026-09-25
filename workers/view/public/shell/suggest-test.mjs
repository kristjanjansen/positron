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
// ⚠️ SIXTEEN OF THESE ARE NEGATIVE CONTROLS, including a truncated table, a
// sabotaged unigram, a style that does not exist, a sampler held at the argmax,
// a way home to a chord nothing reaches, a beam narrowed until it is an argmax
// again, a take of somebody else's chords and a take fed nothing but the page's
// own suggestions.
//
// 🔴 AND THE SAMPLER'S CHECK IS TWO HALVES OR IT IS NOTHING. `suggest.mjs` draws
// slot A rather than taking the maximum since 2026-09-25, so every number in
// `plans/plan-better-chords-2026-09-25.md` rests on a generator that can be made
// to repeat itself. A check that only asserted *the same seed gives the same
// line* passes on a sampler that always returns the same thing, and a check that
// only asserted *two seeds differ* passes on one nothing can reproduce. Both are
// below, next to each other, for that reason.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suggest, useTables, tablesIn, styleNames, STYLES, keysFitting, pickKey, numeralIn,
  mkRandom, routeTo, rowsFor, mkTake, adaptRows } from './suggest.mjs';
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
  /* 🔴 THIS CHECK WAS ONE ASSERT AND IS THREE SINCE 2026-09-26, BECAUSE RAISING
     `KEEP` TO 5 TOOK THE OLD ONE RED FOR A REASON THAT IS NOT A DEFECT. Slot B
     is the pointwise mutual information pick over a pool of four, and the pool
     could not be filled while the table kept three rows. With five rows,
     `A7 Dm7` offers `Bmin7b5` where it used to offer `G7`: a rarer and more
     specific chord, which is what slot B is FOR and which is exactly why it
     names the real next chord only 9.9 per cent of the time by design.
     ⚠️ SO THE CLAIM IS SPLIT INTO THE THREE THINGS IT WAS CONFLATING: what the
     table KNOWS, what the drawn page OFFERS, and what the argmax pair alone
     happens to show. Losing one of seven at the third is recorded rather than
     tuned away. */
  const CLS = { maj: 'maj', maj7: 'maj', min: 'min', min7: 'min', 7: 'dom',
    dim: 'dim', min7b5: 'hdim', sus4: 'sus', sus2: 'sus', aug: 'aug' };
  const held = [], drawn = [], atArgmax = [];
  for (const [label, chords, wantRoot] of DEVICES) {
    const { key, tonic } = pickKey(chords);
    const ctx = chords.map((c) => `${(((c.root - tonic) % 12) + 12) % 12}${CLS[c.quality]}`);
    const deg = String((((wantRoot - tonic) % 12) + 12) % 12);
    const { rows } = rowsFor(STYLES.jazz, ctx);
    if (rows.some(([sym]) => /^\d+/.exec(sym)[0] === deg)) held.push(label);
    const rnd = mkRandom(24);
    let got = false;
    for (let i = 0; i < 24 && !got; i++) {
      if (suggest({ chords }, { style: 'jazz', rnd }).picks.some((p) => p.root === wantRoot)) got = true;
    }
    if (got) drawn.push(label);
    if (suggest({ chords }, { style: 'jazz', temp: 0 }).picks.some((p) => p.root === wantRoot)) {
      atArgmax.push(label);
    }
    void key;
  }
  ok('the jazz table HOLDS the real next chord for every device it was graded on',
    held.length === DEVICES.length,
    `${held.length} of ${DEVICES.length}, the missing ones being `
    + `${DEVICES.filter(([l]) => !held.includes(l)).map(([l]) => l).join(', ') || 'none'}`);
  ok('and the page reaches it, because the draw gets there where one argmax does not',
    drawn.length === DEVICES.length,
    `${drawn.length} of ${DEVICES.length} offered within 24 draws`);
  ok('AND THE ARGMAX PAIR ALONE LOST ONE WHEN KEEP WENT TO 5, which is slot B '
    + 'reaching further rather than the table forgetting',
    atArgmax.length === DEVICES.length - 1,
    `${atArgmax.length} of ${DEVICES.length} at the argmax pair, the odd one out being `
    + `${DEVICES.filter(([l]) => !atArgmax.includes(l)).map(([l]) => l).join(', ') || 'none'}`);
}

// 10. 🔴 AND EVERY ONE OF THEM READ THE TABLE RATHER THAN FALLING THROUGH TO
//     THE RULE, which is the half that says the number above is about the
//     table. A suggester silently backing off would score the same and mean
//     something else entirely.
ok('and every one of them came out of the counted table, not out of the fallback',
  DEVICES.every(([, chords]) => suggest({ chords }, { style: 'jazz', temp: 0 }).source === 'corpus'),
  DEVICES.map(([l, ch]) => `${l} ${suggest({ chords: ch }, { style: 'jazz', temp: 0 }).source}`)
    .join(', '));

// 11. 🔴 TWO SLOTS, TWO JOBS, AND SLOT B IS NOT SLOT A'S RUNNER UP BY
//     PROBABILITY. It is the continuation most SPECIFIC to this context, which
//     is what separates an idiom from a cliche and is a quantity rather than a
//     taste. MEASURED in the benchmark: slot A names the real next chord 48.7
//     per cent of the time and is the globally commonest chord 16.2 per cent of
//     the time; slot B names it 9.9 per cent and is the global maximum 1.0 per
//     cent, with 90.7 per cent of what it offers still attested.
{
  const rs = DEVICES.map(([, chords]) =>
    suggest({ chords }, { style: 'jazz', rnd: mkRandom(11) }));
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
  /* ⚠️ AT THE ARGMAX ON BOTH SIDES, WHICH IS WHAT MAKES THIS A TEST OF THE PMI
     AND NOT OF THE DRAW. Slot B is chosen from the rows slot A did not take, so
     a sampled A moving would move B for a reason that has nothing to do with
     what is common everywhere. Hold A still and only the unigram can move it. */
  const before = DEVICES.map(([, ch]) =>
    suggest({ chords: ch }, { style: 'jazz', temp: 0 }).picks[1]?.name);
  const real = STYLES.jazz.uni;
  STYLES.jazz.uni = new Map([...real.keys()].map((k) => [k, 1 / real.size]));
  const after = DEVICES.map(([, ch]) =>
    suggest({ chords: ch }, { style: 'jazz', temp: 0 }).picks[1]?.name);
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
  const j = ctxs.map((ch) => names(suggest({ chords: ch }, { style: 'jazz', temp: 0 })));
  const p = ctxs.map((ch) => names(suggest({ chords: ch }, { style: 'pop', temp: 0 })));
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
  /* ⚠️ SEEDED, AND ONE STREAM ACROSS ALL 1,080, so the sweep covers the second
     and third rows of every context it touches rather than only the first. The
     argmax version of this check could never have reached them. */
  const roundTrip = mkRandom(4242);
  for (const style of ['jazz', 'pop']) {
    for (let root = 0; root < 12; root++) {
      for (const q of ['maj', 'min', 'maj7', 'min7', '7', 'min7b5', 'dim', 'sus4', 'aug']) {
        for (const second of [0, 2, 5, 7, 9]) {
          const r = suggest({ chords: [C(root, q), C((root + second) % 12, 'maj')] },
            { style, rnd: roundTrip });
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

console.log('\n== the draw, which is what stopped it being the argmax ==');

const symOf = (r) => r.picks.map((p) => p.name).join('/');

// 16. 🔴 THE TEMPERATURE IS A STYLE FACT AND IT TRAVELS IN THE TABLE. MEASURED
//     by `demo/resources/chord-e4-generators.mjs` against this exact shape:
//     jazz at 3.5 walks ten steps with 53.1 per cent of walks cycling and 7.13
//     distinct chords, against the real songs' 52.7 and 7.42, and pop at 1.4
//     reads 87.3 and 4.67 against 89.0 and 4.65. **The same dial that makes jazz
//     right makes pop wrong**, so a single constant in the module would be the
//     defect rather than the fix.
ok('each style carries its own temperature, and they are not the same number',
  STYLES.jazz.temp > 0 && STYLES.pop.temp > 0 && STYLES.jazz.temp !== STYLES.pop.temp,
  `jazz draws at ${STYLES.jazz.temp} and pop at ${STYLES.pop.temp}`);

// 17. 🔴 THE HALF THAT MAKES EVERY OTHER NUMBER REPEATABLE. Two runs on one
//     seed have to be the same line.
{
  const line = (seed) => {
    const rnd = mkRandom(seed);
    return DEVICES.map(([, ch]) => symOf(suggest({ chords: ch }, { style: 'jazz', rnd })))
      .join(' | ');
  };
  const a = line(1), b = line(1), c = line(2);
  ok('one seed twice is one line, and it is the same line',
    a === b, `${a.slice(0, 60)}…`);
  // 18. NEGATIVE CONTROL for the check above, and it is not optional: a sampler
  //     that always returned the same thing would pass it perfectly.
  ok('NEGATIVE CONTROL: two seeds are two lines, so the one above is not a constant',
    a !== c, `seed 1 gives ${a.slice(0, 40)}… and seed 2 gives ${c.slice(0, 40)}…`);
}

// 19. 🔴 AND THE ARGMAX IS STILL REACHABLE, WHICH IS THE CONTROL THE WHOLE PLAN
//     IS SCORED AGAINST. `temp: 0` is what this file did before 2026-09-25: one
//     context, one answer, two hundred draws.
{
  const ctx = [C(2, 'min7'), C(7, '7')];
  const hot = new Set(), cold = new Set();
  const rnd = mkRandom(99);
  for (let i = 0; i < 200; i++) {
    hot.add(suggest({ chords: ctx }, { style: 'jazz', rnd }).picks[0].name);
    cold.add(suggest({ chords: ctx }, { style: 'jazz', temp: 0 }).picks[0].name);
  }
  ok('NEGATIVE CONTROL: held at the argmax one context answers one chord, and drawn it answers several',
    cold.size === 1 && hot.size > 1,
    `after Dm7 G7 the argmax says ${[...cold].join('')} every time and the draw says `
    + `${[...hot].join(', ')}`);
}

// 20. 🔴 WHAT THE PAGE ACTUALLY DRAWS IS SLOT B, SO THE FIX HAS TO REACH IT.
//     `/nola/` shows the pointwise-mutual-information pick and not the likeliest
//     chord, and slot B is chosen from the rows slot A did not take, so a drawn
//     A moves it. MEASURED over every trigram context in the shipped jazz table:
//     slot B answers 1.69 different chords a context and moves at all in 68.7
//     per cent of them, where before it was one chord, always.
{
  const ctx = [C(0, 'maj7'), C(5, 'maj7')];
  const seen = new Set();
  const rnd = mkRandom(5);
  for (let i = 0; i < 200; i++) {
    const r = suggest({ chords: ctx }, { style: 'jazz', rnd });
    if (r.picks[1]) seen.add(r.picks[1].name);
  }
  ok('the chord the page shows moves too, because slot B reads the rows slot A left',
    seen.size > 1, `after Cmaj7 Fmaj7 the second slot offers ${[...seen].join(', ')}`);
}

// 21. 🔴 THE COUNT FLOOR IS WHAT HOLDS ATTESTATION AT 96.6 PER CENT AND IT IS IN
//     THE TABLE RATHER THAN IN THE SAMPLER. `build-chord-tables.mjs` prunes at
//     `row>=3` and keeps three rows, so there is no tail here to draw from.
//     MEASURED in the plan: sampling without a floor costs 9.5 points of
//     attestation for 1.8 bits, which is the same trade pure PMI was refused for.
{
  let widest = 0, n = 0, short = 0;
  for (const st of [STYLES.jazz, STYLES.pop]) {
    for (const m of [st.tri, st.bi]) for (const rows of m.values()) {
      widest = Math.max(widest, rows.length); n++;
      if (rows.length < json.keep) short++;
    }
  }
  ok('there is no tail in this table to draw from, because the build already cut it',
    widest === json.keep && json.keep === 5 && n > 1000,
    `${n} contexts across both styles, the table declares keep ${json.keep} and the `
    + `widest holds ${widest} rows`);
  /* 🔴 AND THE FLOOR IS STILL DOING THE CUTTING, WHICH IS THE HALF THAT RAISING
     `KEEP` COULD HAVE QUIETLY UNDONE. `MIN_ROW = 3` means a context with no
     fourth row seen three times keeps three however high the ceiling goes. If the
     floor had been dropped instead of the ceiling raised, nearly every context
     would fill all five slots and this number would collapse. */
  ok('NEGATIVE CONTROL: most contexts still hold FEWER rows than the ceiling, so the '
    + 'count floor was not what moved',
    short > n * 0.5,
    `${short} of ${n} contexts hold fewer than ${json.keep} rows, which is `
    + `${(100 * short / n).toFixed(1)} per cent`);
}

console.log('\n== a four chord way home ==');

// 22. 🔴 THE THIRD WORD OF THE COMPLAINT WAS *"not moving anywhere"*, AND THIS
//     IS THE ONLY PART OF THE ANSWER THAT CHANGES WHAT IS OFFERED RATHER THAN
//     HOW IT RANKS. MEASURED over 4,000 held-out jazz contexts against this
//     table's shape: a route exists on 92.7 per cent of them and its transitions
//     are attested in held-out songs 98.3 per cent of the time.
{
  const r = routeTo({ chords: [C(2, 'min7'), C(7, '7')] }, { style: 'jazz', rnd: mkRandom(3) });
  const last = r.steps[r.steps.length - 1];
  ok('a way home is four chords long and the last one is the tonic',
    r.ok && r.steps.length === 4 && last.root === r.tonic
    && r.target === '0maj' && r.targetName === last.name,
    `${r.steps.map((c) => c.name).join(' ')} in ${r.keyName}, home to ${r.targetName}`);

  // 23. 🔴 AND EVERY STEP OF IT IS A ROW THE TABLE HOLDS, which is the half that
  //     says the route is read rather than invented. A beam search over a table
  //     it did not actually consult would look identical from outside.
  {
    const st = STYLES.jazz;
    const deg = (root) => (((root - r.tonic) % 12) + 12) % 12;
    const CLS = { maj: 'maj', maj7: 'maj', min: 'min', min7: 'min', 7: 'dom',
      dim: 'dim', min7b5: 'hdim', sus4: 'sus', sus2: 'sus', aug: 'aug' };
    let ctx = ['2min', '7dom'];
    let off = 0;
    for (const step of r.steps) {
      const want = `${deg(step.root)}${CLS[step.quality] || 'maj'}`;
      const { rows } = rowsFor(st, ctx);
      if (!rows.some(([sym]) => sym === want)) off++;
      ctx = [ctx[ctx.length - 1], want];
    }
    ok('and every chord in it is a row the table holds after the one before it',
      off === 0,
      `${r.steps.length} steps and ${off} of them off the table`);
  }
}

// 24. 🔴 THE ARGMAX PROBLEM RETURNS ONE LEVEL UP, WHICH IS THE PROOF THE LESSON
//     IS GENERAL RATHER THAN A PATCH. MEASURED on the shipped shape: the best
//     path alone puts **72.6 per cent** of its six commonest routes into ii V I
//     and finds 76 distinct routes, and sampling the path per step drops that to
//     **18.5 per cent** over 151 routes with attestation unmoved at 98.3.
{
  const ctx = { chords: [C(2, 'min7'), C(7, '7')] };
  const many = new Set(), one = new Set();
  const rnd = mkRandom(17);
  for (let i = 0; i < 100; i++) {
    many.add(routeTo(ctx, { style: 'jazz', rnd }).steps.map((c) => c.name).join(' '));
    one.add(routeTo(ctx, { style: 'jazz', temp: 0 }).steps.map((c) => c.name).join(' '));
  }
  ok('NEGATIVE CONTROL: the best path alone is one route forever, and the drawn one is several',
    one.size === 1 && many.size > 1,
    `the best path is always ${[...one][0]}, and drawing gives ${many.size} different ways home`);
}

// 25. NEGATIVE CONTROL: a way home nothing in the table reaches answers with a
//     sentence rather than a throw or a route that does not arrive.
{
  const r = routeTo({ chords: [C(2, 'min7'), C(7, '7')] },
    { style: 'jazz', target: '6aug', rnd: mkRandom(1) });
  ok('NEGATIVE CONTROL: a destination nothing reaches is said in words, not thrown',
    r.ok === false && r.steps.length === 0 && r.says.includes('nothing'), r.says);
}

// 26. NEGATIVE CONTROL: the same two boundaries `suggest` has. One chord is not
//     a line, and a style with no counted table cannot know where a line is
//     going, which is a different sentence from not knowing what comes next.
{
  const a = routeTo({ chords: [C(0, 'maj')] }, { style: 'jazz' });
  const b = routeTo({ chords: [C(0, 'maj'), C(7, 'maj')] }, { style: 'plain' });
  ok('NEGATIVE CONTROL: one chord and a style with no table are both refused in words',
    a.ok === false && b.ok === false && a.says !== b.says
    && b.says.includes('where a line is going'),
    `${a.says} / ${b.says}`);
}

// 27. 🔴 THE SABOTAGE, BECAUSE A DECODER THAT READ GARBAGE WOULD STILL ANSWER.
//     A table truncated to one record must take the device check red. If it
//     does not, this whole file is decoration, which is the finding this
//     repository has recorded four times about its own instruments.
{
  const keep = { jazz: STYLES.jazz, pop: STYLES.pop };
  useTables({ ...json,
    jazz: { ...json.jazz, bi: json.jazz.bi.slice(0, 1 + 2 * json.keep),
      tri: json.jazz.tri.slice(0, 2 + 2 * json.keep) } });
  const still = DEVICES.filter(([, chords]) =>
    suggest({ chords }, { style: 'jazz', temp: 0 }).source === 'corpus').length;
  STYLES.jazz = keep.jazz; STYLES.pop = keep.pop;
  ok('SABOTAGE: a table truncated to one record answers from the table almost never',
    still <= 1,
    `${still} of ${DEVICES.length} devices still read the table, against `
    + `${DEVICES.length} with the real one`);
}

// 28. And the real table is back, so the sabotage above cannot leak into a
//     number anybody quotes.
ok('and the real table is back in place after the sabotage',
  DEVICES.every(([, chords]) => suggest({ chords }, { style: 'jazz', temp: 0 }).source === 'corpus'),
  `${DEVICES.length} of ${DEVICES.length} reading the table again`);

console.log('\n== slot B is drawn too, which is what a player is actually shown ==');

// 🔴 THE FINDING THAT PAID FOR THIS SECTION. `chord-e6-keep.mjs` swept the prune
//    at 3, 4, 5, 6 and 8 rows and slot B answered EXACTLY 2.00 distinct chords a
//    context at every one of them, because B is the highest pointwise mutual
//    information row that A did not take: the PMI top unless A collided with it,
//    the PMI second when it did. Two values, for any width of table. The plan's
//    whole lesson had been applied to slot A and slot B is the one on screen.
{
  const ctx = [C(0, 'maj7'), C(5, 'maj7')];
  const drawn = new Set(), argmax = new Set();
  const rnd = mkRandom(5), rnd2 = mkRandom(5);
  for (let i = 0; i < 200; i++) {
    const a = suggest({ chords: ctx }, { style: 'jazz', rnd });
    if (a.picks[1]) drawn.add(a.picks[1].name);
    const b = suggest({ chords: ctx }, { style: 'jazz', rnd: rnd2, bTemp: 0 });
    if (b.picks[1]) argmax.add(b.picks[1].name);
  }
  ok('the second slot answers more than two chords now, because it is drawn rather than maximised',
    drawn.size > 2, `after Cmaj7 Fmaj7 it offers ${[...drawn].join(', ')}`);
  // NEGATIVE CONTROL, and it is the measurement itself turned into a check: held
  // at `bTemp: 0` the same context over the same two hundred draws can answer at
  // most two, whatever slot A does and however wide the table is.
  ok('NEGATIVE CONTROL: held at the argmax the second slot can only ever answer two chords',
    argmax.size <= 2 && argmax.size < drawn.size,
    `${argmax.size} at the argmax against ${drawn.size} drawn, over 200 draws of one context`);
}

// 🔴 THE BEAM IS A CEILING AND NOT A FILTER, AND RAISING `KEEP` IS WHAT MADE
//    THAT WORTH ASSERTING. It read 64 while the table kept three rows, where
//    `3^3` is 27; at five rows the live set is 125, so the old constant would
//    have thrown the lower half away by probability before the draw saw it and
//    turned the route quietly back into an argmax.
{
  const ctx = { chords: [C(2, 'min7'), C(7, '7')] };
  const wide = new Set();
  const rnd = mkRandom(17);
  for (let i = 0; i < 100; i++) wide.add(routeTo(ctx, { style: 'jazz', rnd }).steps.map((c) => c.name).join(' '));
  ok('a way home is drawn from many routes, not from the few a narrow beam would leave',
    wide.size > 5, `${wide.size} different ways home over 100 draws`);
}

console.log('\n== a take, which adapts to what is being played now and forgets ==');

/* 🔴 A TAKE THAT MEETS THE CONTEXT BEING ASKED ABOUT, AND THE FIRST ONE DID NOT.
   A line in a different corner of the key changes nothing, correctly, and a check
   written on one reads as the adaptation never having been wired up at all. This
   is somebody vamping a ii V and going somewhere the table does not expect, three
   times over, which is the whole case the adaptation exists for. */
const TAKE_LINE = [C(2, 'min7'), C(7, '7'), C(3, 'maj7'),
  C(2, 'min7'), C(7, '7'), C(3, 'maj7'),
  C(2, 'min7'), C(7, '7'), C(3, 'maj7'),
  C(9, 'min7'), C(2, '7'), C(7, 'maj7')];

// 🔴 THE LARGEST SINGLE GAIN IN `plans/plan-better-chords-2026-09-25.md`, section
//    6.2, MEASURED at +7.44 points of top 1 on full counts and re-measured at
//    **+6.32 through this table's shape** by `demo/resources/chord-e7-take.mjs`,
//    against a whole bigram-to-trigram step worth 4.5. It has to actually move
//    what comes back or none of that reached the page.
{
  const ctx = [C(2, 'min7'), C(7, '7')];
  const before = suggest({ chords: ctx }, { style: 'jazz', temp: 0 });
  const take = mkTake();
  for (const c of TAKE_LINE) take.heard(c, 'played');
  const after = suggest({ chords: ctx }, { style: 'jazz', temp: 0, take });
  ok('a take of what somebody is playing changes what comes back',
    names(before) !== names(after) && take.counted === TAKE_LINE.length,
    `${names(before)} without it and ${names(after)} after ${take.counted} chords`);
}

// 🔴 THE RULE THIS PAGE ALREADY PAID FOR, AS A COUNTER RATHER THAN AS A CLAIM.
//    Reported on `/nola/`: *"you recorded a suggestion. why>"*. A suggester that
//    learns from its own suggestions writes its own line and calls it yours, so
//    every chord that can reach the adaptation goes through ONE function that
//    takes a source and counts what it refused.
{
  const take = mkTake();
  const ctx = [C(2, 'min7'), C(7, '7')];
  const clean = suggest({ chords: ctx }, { style: 'jazz', temp: 0 }).picks.map((p) => p.name).join('/');
  for (const c of TAKE_LINE) take.heard(c, 'suggested');
  for (const c of TAKE_LINE) take.heard(c);
  for (const c of TAKE_LINE) take.heard(c, 'played ');
  const after = suggest({ chords: ctx }, { style: 'jazz', temp: 0, take }).picks.map((p) => p.name).join('/');
  ok('NEGATIVE CONTROL: a take fed nothing but the page\'s own suggestions learns nothing at all',
    take.counted === 0 && take.refused === TAKE_LINE.length * 3 && take.chords.length === 0
    && clean === after,
    `${take.refused} chords refused and ${take.counted} counted, and the suggestion is `
    + `${after} either way`);
  ok('NEGATIVE CONTROL: there is no default source, so a careless call is the refused one',
    mkTake().heard(C(0, 'maj7')) === false
    && mkTake().heard(C(0, 'maj7'), 'played') === true,
    'heard(chord) is refused and heard(chord, \'played\') is counted');
}

// NEGATIVE CONTROL: the mixing itself, asked directly. A take that never matches
// the context must hand back exactly the rows it was given, or the adaptation is
// adding chords nobody played.
{
  const rows = [['0maj', 0.5], ['7dom', 0.3], ['2min', 0.2]];
  const same = adaptRows(rows, ['9aug', '9aug', '9aug', '9aug'], ['0maj', '5maj'], { weight: 0.3 });
  const moved = adaptRows(rows, ['0maj', '5maj', '11dom', '0maj', '5maj', '11dom'],
    ['0maj', '5maj'], { weight: 0.3 });
  const off = adaptRows(rows, ['0maj', '5maj', '11dom'], ['0maj', '5maj'], { weight: 0 });
  ok('NEGATIVE CONTROL: a take that never met this context changes nothing',
    same.length === rows.length && same.every(([sy], i) => sy === rows[i][0])
    && off.length === rows.length && off.every(([sy], i) => sy === rows[i][0]),
    `${same.length} rows back unchanged, and weight 0 is unchanged too`);
  /* ⚠️ IT ENTERS AND CLIMBS, IT DOES NOT TAKE OVER, WHICH IS WHAT A WEIGHT OF
     0.25 MEANS AND WAS WRITTEN OUT WRONG THE FIRST TIME. At 0.3 against a world
     row holding 0.5 the take's chord cannot reach the top, and asserting that it
     would have been doing the machine's arithmetic a second time and getting it
     wrong. What is promised is that a chord the table never offered here is now
     on the list and above rows it was not in. */
  ok('and a take that HAS met it puts what followed onto the list and above the rest',
    moved.length === rows.length + 1 && moved[1][0] === '11dom'
    && Math.abs(moved.find(([sy]) => sy === '11dom')[1] - 0.3) < 1e-9,
    `${moved.map(([sy, p]) => `${sy} ${(100 * p).toFixed(0)}%`).join('  ')}`);
}

// 🔴 NOTHING IS STORED, AND SECTION 6.1 REFUSED A PERSISTENT PROFILE ON A
//    MEASUREMENT: a composer's ENTIRE body of work is worth +0.60 points, and a
//    stranger's at the same weight reads 0.76 BELOW the baseline. This is
//    asserted over the module's own source with its comments stripped, because
//    an absence asserted over raw source grades the prose, which this repository
//    has already been caught doing twice.
{
  const src = readFileSync(join(HERE, 'suggest.mjs'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const banned = ['localStorage', 'sessionStorage', 'indexedDB', 'fetch(', 'XMLHttpRequest',
    'navigator.', 'document.'];
  const found = banned.filter((b) => src.includes(b));
  ok('NOTHING IS STORED AND NOTHING LEAVES: a take dies with the tab',
    found.length === 0,
    `none of ${banned.join(', ')} appears in the code, and the take is a plain array`);
  const take = mkTake({ window: 4 });
  for (const c of TAKE_LINE) take.heard(c, 'played');
  const kept = take.chords;
  take.clear();
  ok('and the window forgets, and clearing it leaves nothing behind',
    kept.length === 4 && kept[3].root === TAKE_LINE[TAKE_LINE.length - 1].root
    && take.chords.length === 0 && take.counted === 0,
    `${TAKE_LINE.length} chords in, ${kept.length} kept, 0 after clear()`);
}

// 🔴 THE MIX IS A STYLE FACT AND TRAVELS IN THE TABLE, WHICH IS THE THIRD TIME
//    THIS PROJECT HAS FOUND THAT. MEASURED: jazz wants 0.25 and pop 0.1, and pop
//    at 0.25 scores hugely better on top 1 while moving every one of the four
//    measures AWAY from real pop, which is the plan's own caveat that part of the
//    gain is music repeating itself rather than anything about a person.
ok('each style carries its own mixing weight, and they are not the same number',
  STYLES.jazz.mix === 0.25 && STYLES.pop.mix === 0.1,
  `jazz mixes a take in at ${STYLES.jazz.mix} and pop at ${STYLES.pop.mix}`);

// The way home adapts too, since a route is a run of the same lookups.
{
  const ctx = { chords: [C(2, 'min7'), C(7, '7')] };
  const take = mkTake();
  /* ⚠️ THIS TAKE OVERLAPS THE ROUTE'S OWN CONTEXT ON PURPOSE, AND THE FIRST ONE
     DID NOT. A take of chords the route never passes through changes nothing,
     correctly, and a check written on one would have read as the adaptation
     never reaching `routeOver` at all. `Dm7 G7 Em7` round and round makes the
     trigram the route starts on one the take has met twice. */
  for (const c of [C(2, 'min7'), C(7, '7'), C(4, 'min7'),
    C(2, 'min7'), C(7, '7'), C(4, 'min7'),
    C(2, 'min7'), C(7, '7'), C(4, 'min7')]) take.heard(c, 'played');
  const a = routeTo(ctx, { style: 'jazz', rnd: mkRandom(8) });
  const b = routeTo(ctx, { style: 'jazz', rnd: mkRandom(8), take });
  ok('the four chord way home reads the take as well, at every step of the route',
    a.ok && b.ok && a.steps.map((c) => c.name).join(' ') !== b.steps.map((c) => c.name).join(' '),
    `${a.steps.map((c) => c.name).join(' ')} without it and `
    + `${b.steps.map((c) => c.name).join(' ')} with it`);
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
