// demo/shell/suggest-test.mjs: the chord suggester on the real chord-tables.json, through `suggest()`.
//   node demo/shell/suggest-test.mjs
// Includes negative controls; the sampler is checked both ways (same seed repeats, seeds differ).
// why: lessons/kit-suggest.md#test-header

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suggest, useTables, tablesIn, styleNames, STYLES, keysFitting, pickKey, numeralIn,
  mkRandom, routeTo, rowsFor, mkTake, adaptRows, twoSlots } from './suggest.mjs';
import { parseChord, QUALITIES } from './chords.mjs';
import { RECOGNISED } from './name.mjs';
import { classOf } from '../resources/chord-corpus.mjs';

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

// 2. A minor key table is required: `Am then F` reads as `i then VI`.
// why: lessons/kit-suggest.md#test-minor-key
{
  const r = suggest({ chords: [C(9, 'min'), C(5, 'maj')] }, { style: 'plain' });
  ok('the plain rule answers in a minor key, which a major-only one could not',
    r.ok && r.keyName === 'A minor' && r.from === 'VI' && r.picks.length === 2,
    `${r.from} then ${names(r)}`);
}

// 3. NEGATIVE CONTROL: `Dm then G` fits C major and A minor, so the key is a guess.
// why: lessons/kit-suggest.md#test-ii-v-guess
{
  const r = suggest({ chords: [C(2, 'min'), C(7, 'maj')] }, { style: 'plain' });
  ok('a ii V cannot take its own first chord as the key, and says so',
    r.guessed === true && r.keyName === 'C major' && r.says.includes('a guess'), r.says);
}

// 4. NEGATIVE CONTROL: two chords from no key fall back and say so. A tritone pair of major
//    triads is in no key of either mode.
// why: lessons/kit-suggest.md#test-no-key
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

// 5. Fewer than two chords is refused rather than guessed at.
// why: lessons/kit-suggest.md#test-one-chord
ok('nothing is suggested from one chord',
  suggest({ chords: [C(0, 'maj')] }).ok === false && suggest({ chords: [] }).ok === false,
  suggest({ chords: [C(0, 'maj')] }).says);

console.log('\n== the key, which is a fiat and cannot be deduced ==');

// 6. Two chords fit 3.38 keys of 24 on average and never fewer than 2; three never fit exactly 1.
// why: lessons/kit-suggest.md#test-keys-fit
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

// 7. The minor ii V needs the harmonic minor's major `V` row.
// why: lessons/kit-suggest.md#test-minor-ii-v
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
 * Named devices, asked through the whole path: two played chords and the chord that follows.
 * Seven the recogniser can reach (no `dim7` in its vocabulary).
 * why: lessons/kit-suggest.md#test-devices
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

// 9. Does a played chord come back with the chord that really follows it.
// why: lessons/kit-suggest.md#test-measurement
{
  // Three claims: what the table knows, what the drawn page offers, what the argmax pair shows.
  // why: lessons/kit-suggest.md#test-three-claims
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

// 10. Every one came out of the table, not the fallback rule.
// why: lessons/kit-suggest.md#test-from-table
ok('and every one of them came out of the counted table, not out of the fallback',
  DEVICES.every(([, chords]) => suggest({ chords }, { style: 'jazz', temp: 0 }).source === 'corpus'),
  DEVICES.map(([l, ch]) => `${l} ${suggest({ chords: ch }, { style: 'jazz', temp: 0 }).source}`)
    .join(', '));

// 11. Slot B is the continuation most specific to the context, not slot A's runner up.
//     Benchmark: A names the real next chord 48.7 per cent, B 9.9 per cent.
// why: lessons/kit-suggest.md#test-two-slots
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

// 12. NEGATIVE CONTROL: a flat unigram must be able to change slot B.
// why: lessons/kit-suggest.md#test-slot-b-pmi
{
  // At the argmax on both sides, so only the unigram can move slot B.
  // why: lessons/kit-suggest.md#test-argmax-both
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

// 13. The style dial swaps table and spelling: first suggestions differ in 71.2 per cent of
//     shared contexts and 59 of 75 shared symbols are spelled differently.
// why: lessons/kit-suggest.md#test-style-dial
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

// 14. Every suggestion must parse back through `parseChord`; unplayable names fall back to class.
// why: lessons/kit-suggest.md#test-voiceable
{
  const bad = [];
  // Seeded, one stream across all 1,080, so the sweep reaches second and third rows.
  // why: lessons/kit-suggest.md#test-seeded-sweep
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

// 16. The temperature travels in the table: jazz 3.5 and pop 1.4 each match real songs, and
//     one constant would make one of them wrong.
// why: lessons/kit-suggest.md#test-temperature
ok('each style carries its own temperature, and they are not the same number',
  STYLES.jazz.temp > 0 && STYLES.pop.temp > 0 && STYLES.jazz.temp !== STYLES.pop.temp,
  `jazz draws at ${STYLES.jazz.temp} and pop at ${STYLES.pop.temp}`);

// 17. Two runs on one seed are the same line.
// why: lessons/kit-suggest.md#test-repeatable
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

// 19. `temp: 0` is still the argmax: one context, one answer, two hundred draws.
// why: lessons/kit-suggest.md#test-argmax
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

// 20. The page draws slot B, so a drawn A must move it: 1.69 chords a context, moving in
//     68.7 per cent of trigram contexts.
// why: lessons/kit-suggest.md#test-slot-b-moves
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

// 21. The count floor (`row>=3` in build-chord-tables.mjs) holds attestation at 96.6 per cent;
//     sampling without it costs 9.5 points for 1.8 bits.
// why: lessons/kit-suggest.md#test-count-floor
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
  // `MIN_ROW = 3` must still leave most contexts below the `KEEP` ceiling.
  // why: lessons/kit-suggest.md#test-floor-cuts
  ok('NEGATIVE CONTROL: most contexts still hold FEWER rows than the ceiling, so the '
    + 'count floor was not what moved',
    short > n * 0.5,
    `${short} of ${n} contexts hold fewer than ${json.keep} rows, which is `
    + `${(100 * short / n).toFixed(1)} per cent`);
}

console.log('\n== a four chord way home ==');

// 22. The route changes what is offered: one exists on 92.7 per cent of held-out contexts,
//     attested 98.3 per cent of the time.
// why: lessons/kit-suggest.md#test-route
{
  const r = routeTo({ chords: [C(2, 'min7'), C(7, '7')] }, { style: 'jazz', rnd: mkRandom(3) });
  const last = r.steps[r.steps.length - 1];
  ok('a way home is four chords long and the last one is the tonic',
    r.ok && r.steps.length === 4 && last.root === r.tonic
    && r.target === '0maj' && r.targetName === last.name,
    `${r.steps.map((c) => c.name).join(' ')} in ${r.keyName}, home to ${r.targetName}`);

  // 23. Every step of the route is a row the table holds.
  // why: lessons/kit-suggest.md#test-route-rows
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

// 24. The best path alone sends 72.6 per cent of top routes into ii V I; sampling per step gives
//     18.5 per cent over 151 routes, attestation unmoved at 98.3.
// why: lessons/kit-suggest.md#test-route-sampled
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

// 27. NEGATIVE CONTROL: a table truncated to one record must take the device check red.
// why: lessons/kit-suggest.md#test-sabotage
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

// Slot B answered exactly 2.00 chords a context at every prune width, so it is drawn too.
// why: lessons/kit-suggest.md#test-slot-b-two
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

// The beam is a ceiling, not a filter: at five rows the live set is 125, above the old 64.
// why: lessons/kit-suggest.md#test-beam
{
  const ctx = { chords: [C(2, 'min7'), C(7, '7')] };
  const wide = new Set();
  const rnd = mkRandom(17);
  for (let i = 0; i < 100; i++) wide.add(routeTo(ctx, { style: 'jazz', rnd }).steps.map((c) => c.name).join(' '));
  ok('a way home is drawn from many routes, not from the few a narrow beam would leave',
    wide.size > 5, `${wide.size} different ways home over 100 draws`);
}

console.log('\n== a take, which adapts to what is being played now and forgets ==');

// A take that meets the context being asked about: a ii V going somewhere unexpected, three times.
// why: lessons/kit-suggest.md#test-take-line
const TAKE_LINE = [C(2, 'min7'), C(7, '7'), C(3, 'maj7'),
  C(2, 'min7'), C(7, '7'), C(3, 'maj7'),
  C(2, 'min7'), C(7, '7'), C(3, 'maj7'),
  C(9, 'min7'), C(2, '7'), C(7, 'maj7')];

// The take adaptation (+6.32 points of top 1 through this table) must move what comes back.
// why: lessons/kit-suggest.md#test-take
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

// Every chord that can reach the adaptation goes through one function that takes a source and
// counts what it refused, so the page's own suggestions are never learned.
// why: lessons/kit-suggest.md#test-take-source
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

// NEGATIVE CONTROL: a take that never matches hands back exactly the rows it was given.
// why: lessons/kit-suggest.md#test-mix-none
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
  // At weight 0.25 the take's chord enters the list and climbs; it does not take the top.
  // why: lessons/kit-suggest.md#test-mix-climbs
  ok('and a take that HAS met it puts what followed onto the list and above the rest',
    moved.length === rows.length + 1 && moved[1][0] === '11dom'
    && Math.abs(moved.find(([sy]) => sy === '11dom')[1] - 0.3) < 1e-9,
    `${moved.map(([sy, p]) => `${sy} ${(100 * p).toFixed(0)}%`).join('  ')}`);
}

// Nothing is stored. Asserted over suggest.mjs with its comments stripped, so the prose is
// not what is graded.
// why: lessons/kit-suggest.md#test-nothing-stored
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

// The mix weight travels in the table: jazz 0.25, pop 0.1.
// why: lessons/kit-suggest.md#test-mix-style
ok('each style carries its own mixing weight, and they are not the same number',
  STYLES.jazz.mix === 0.25 && STYLES.pop.mix === 0.1,
  `jazz mixes a take in at ${STYLES.jazz.mix} and pop at ${STYLES.pop.mix}`);

// The way home adapts too, since a route is a run of the same lookups.
{
  const ctx = { chords: [C(2, 'min7'), C(7, '7')] };
  const take = mkTake();
  // This take overlaps the route's own context on purpose, so it can reach `routeOver`.
  // why: lessons/kit-suggest.md#test-take-route
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

console.log('\n== what a chord is counted as, and what slot B may offer alone ==');

// Three defects behind one report; every check below went red before the repair, except the
// two controls. Counts in BACKLOG.md.
// why: lessons/kit-suggest.md#test-report-0930

// 29. Every quality is counted under the class the table was built with, graded against the
//     build's own `classOf`, read off `suggest().from`.
// why: lessons/kit-suggest.md#test-classes
{
  const QS = [...new Set([...QUALITIES.map(([n]) => parseChord(`C${n}`)),
    ...RECOGNISED.map(([n]) => parseChord(`C${n}`))].filter((c) => c.ok).map((c) => c.quality))];
  /* The two rows where the build's regex is wrong and this file is right, named
     rather than skipped. Neither is written once in either corpus. */
  const OWN = { 2: 'sus', add9: 'maj' };
  const wrong = [];
  for (const q of QS) {
    const want = OWN[q] ?? classOf(q);
    /* `from` is only a table symbol when the table answered, so the chord is put
       on whichever degree after C the table has rows for. */
    let got = null;
    for (let d = 0; d < 12 && got === null; d++) {
      const r = suggest({ chords: [C(0, 'maj'), C(d, q)] }, { style: 'jazz', temp: 0 });
      if (r.source === 'corpus') got = String(r.from).replace(/^\d+/, '');
    }
    if (got !== want) wrong.push(`${q} read as ${got}, counted as ${want}`);
  }
  ok('every quality a chord can have is read in the class the table was counted with',
    QS.length >= 26 && wrong.length === 0,
    wrong.join(', ') || `${QS.length} qualities, all agreeing with the build's classOf`);
}

// 30. NEGATIVE CONTROL: `2` and `add9` are where the build's classifier is wrong, not this file.
// why: lessons/kit-suggest.md#test-class-exceptions
ok('NEGATIVE CONTROL: `2` and `add9` are the two places the build classifier is wrong, and this is not',
  classOf('2') === 'dom' && classOf('add9') === null
  && String(suggest({ chords: [C(0, 'maj'), C(2, '2')] }, { style: 'jazz', temp: 0 }).from) === '2sus'
  && String(suggest({ chords: [C(0, 'maj'), C(2, 'add9')] }, { style: 'jazz', temp: 0 }).from) === '2maj',
  `classOf says ${classOf('2')} and ${classOf('add9')}`);

// 31. `C#dim7` after `Cmaj7` reaches the table as the passing chord to Dm7.
// why: lessons/kit-suggest.md#test-passing-dim
{
  const r = suggest({ chords: [C(0, 'maj7'), C(1, 'dim7')] }, { style: 'jazz', temp: 0, bTemp: 0 });
  ok('Cmaj7 C#dim7 is read as a passing chord, so the table answers Dm7',
    r.from === '1dim' && r.picks[0]?.name === 'Dmin7', `${r.from}, then ${names(r)}`);
}

// 32. No counted chord has a frequency of zero: slot B divides by it.
// why: lessons/kit-suggest.md#test-zero-freq
{
  const zero = [];
  for (const st of ['jazz', 'pop']) {
    const t = STYLES[st];
    const seen = new Set();
    for (const m of [t.bi, t.tri]) for (const rows of m.values()) for (const [s] of rows) seen.add(s);
    for (const s of seen) if (!(t.uni.get(s) > 0)) zero.push(`${st} ${s}`);
  }
  ok('no chord that can be offered has a frequency of zero in the table',
    zero.length === 0, zero.length ? `${zero.length}: ${zero.slice(0, 6).join(', ')}` : 'every offered symbol has one');
}

// 33. The frequency is the counted one: `8dim` is 70 of 52,924 jazz chords.
// why: lessons/kit-suggest.md#test-counted-freq
{
  const u = STYLES.jazz.uni.get('8dim');
  const want = 70 / 52924;
  ok('the rarest chords carry their counted frequency, to within 8 per cent',
    Math.abs(u / want - 1) < 0.08, `8dim ${u.toExponential(3)} against ${want.toExponential(3)} counted`);
}

// 34. After `Fmaj Cmaj7` slot B must not offer a passing chord alone.
// why: lessons/kit-suggest.md#test-the-report
{
  const ctx = [C(5, 'maj'), C(0, 'maj7')];
  const rnd = mkRandom(42);
  let dim = 0; const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const r = suggest({ chords: ctx }, { style: 'jazz', rnd });
    const b = r.picks.find((p) => p.role === 'other');
    if (b) seen.add(b.name);
    if (b && /dim/.test(b.quality)) dim++;
  }
  ok('after Fmaj Cmaj7 the chord a player is shown is never the passing C#dim7',
    dim === 0 && seen.size >= 2, `${dim} of 500, offering ${[...seen].join(', ')}`);
}

// 35. And across every context both tables hold, drawn and at the argmax.
{
  let n = 0, dim = 0;
  const rnd = mkRandom(3);
  for (const st of ['jazz', 'pop']) for (const k of STYLES[st].tri.keys()) {
    for (const o of [{ temp: 0, bTemp: 0 }, { temp: STYLES[st].temp, bTemp: 1, rnd }]) {
      /* The same two slots `suggest()` draws, read through its own export. */
      const r = twoSlots(STYLES[st], k.split('|'), o);
      if (!r) continue;
      n++;
      if (r?.B && /^\d+dim$/.test(r.B)) dim++;
    }
  }
  ok('slot B never offers a diminished chord alone, in any context either table holds',
    n > 1000 && dim === 0, `${dim} of ${n}`);
}

// 36. NEGATIVE CONTROL: the passing chord stays in the table and slot A still draws it.
// why: lessons/kit-suggest.md#test-narrow
{
  const ctx = [C(5, 'maj'), C(0, 'maj7')];
  const rows = rowsFor(STYLES.jazz, ['0maj', '7maj']).rows.map(([s]) => s);
  const rnd = mkRandom(9);
  let a = 0;
  for (let i = 0; i < 500; i++) {
    const r = suggest({ chords: ctx }, { style: 'jazz', rnd });
    if (r.picks[0]?.name === 'C#dim7') a++;
  }
  ok('NEGATIVE CONTROL: the passing chord stays in the table and slot A still draws it',
    rows.includes('8dim') && a > 0, `rows ${rows.join(' ')}, slot A drew C#dim7 ${a} of 500`);
}

// 37. A table written before the log column still loads, and a zero in its
//     linear column is read as half a step, the most it can have been rounded
//     down from, rather than as a millionth.
{
  const raw = JSON.parse(readFileSync(TABLE_PATH, 'utf8'));
  for (const st of ['jazz', 'pop']) { delete raw[st].ulog; delete raw[st].ul; }
  useTables(raw);
  const u = STYLES.jazz.uni.get('8dim');
  const half = 0.5 / (raw.alpha.length - 1);
  useTables(JSON.parse(readFileSync(TABLE_PATH, 'utf8')));
  ok('an older table with no log column reads a zero as half a step, not a millionth',
    Math.abs(u - half) < 1e-12 && STYLES.jazz.uni.get('8dim') > 0.001,
    `8dim ${u.toFixed(5)} from the linear column alone`);
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
