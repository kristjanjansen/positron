// demo/shell/name-test.mjs. The chord recogniser, with no browser at all.
//
//   node demo/shell/name-test.mjs
//
// 🔴 ONE OF THESE DECIDES WHETHER THE WHOLE LEARNING MODE IS WORTH BUILDING:
// **at a margin of 1.0 the recogniser is never wrong**. If that goes red the
// idea is dead and the honest thing is to say so, because a page that names a
// chord wrongly with confidence is worse than one that says nothing, and this
// page has a particularly bad version of that failure available to it. The
// roll's `setHeld` lights a row when the player's notes match it, so a wrong
// name written into a row is confirmed back to the player the moment they play
// it. The page would have taught somebody its own mistake.
//
// The rest are here because `research/chord-learning-2026-09-23.md` measured
// them and a number in a document goes stale in silence. These run.
//
// ⚠️ TEN OF THESE ARE NEGATIVE CONTROLS, written so that the mistake they
// name would fail them rather than so that today's code passes. The four the
// research calls for by name are the collisions: `Caug` must come back unsure,
// `Csus2` must come back unsure, `C E G B` must come back `Cmaj7` confidently,
// and `C E G A` must come back `Amin7`.

import { nameChord, RECOGNISED, MARGIN, createSettler, createTally, chordKey, notesOf }
  from './name.mjs';
import { parseChord } from './chords.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? '   ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? '   ' + detail : ''}`); }
};
const PC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const nameOf = (notes) => nameChord(notes).name;

console.log('\n== naming ==');

// ── the four collisions the research names, each as its own control ─────────

// 1. NEGATIVE CONTROL. `C E G#` really is `Caug` and `Eaug` and `G#aug`,
//    because an augmented triad divides the octave into three equal major
//    thirds and is its own inversion three times over. A recogniser that names
//    one of them with confidence is guessing and calling it a fact.
{
  const r = nameChord([60, 64, 68]);
  ok('an augmented triad is three chords at once, so the page says it is unsure',
    r.sure === false && r.alts[0].name === 'Caug' && r.alts[1].name === 'Eaug',
    `${r.alts[0].name} or ${r.alts[1].name}, margin ${r.margin.toFixed(1)}`);
}

// 2. NEGATIVE CONTROL. `C D G` read from the other end is `Gsus4`. Same three
//    notes, two names, and no weighting separates them.
{
  const r = nameChord([60, 62, 67]);
  ok('a sus2 and the sus4 a fifth above it are the same three notes, and unsure',
    r.sure === false && r.alts[0].name === 'Csus2' && r.alts[1].name === 'Gsus4',
    `${r.alts[0].name} or ${r.alts[1].name}, margin ${r.margin.toFixed(1)}`);
}

// 3. And the two that MUST be confident, or the margin is set so tight the
//    feature says nothing at all.
{
  const r = nameChord([60, 64, 67, 71]);
  ok('C E G B is a major seventh and the page says so outright',
    r.sure === true && r.name === 'Cmaj7' && r.margin >= 2,
    `${r.name}, margin ${r.margin.toFixed(1)}`);
}
{
  const r = nameChord([60, 64, 67, 69]);
  ok('C E G A is a minor seventh on A, which is the sixths being dropped on purpose',
    r.sure === true && r.name === 'Amin7',
    `${r.name}, margin ${r.margin.toFixed(1)}, and nothing here can say Cmaj6`);
}

// 4. NEGATIVE CONTROL for the vocabulary decision itself. MEASURED: putting the
//    sixths back drops the confident answer rate from 72.0 per cent to 32.8,
//    and `C6` becoming `Am7` is the one arbitrary choice that buys it.
ok('NEGATIVE CONTROL: no sixth and no diminished seventh is in the vocabulary at all',
  RECOGNISED.every(([q]) => !['maj6', 'min6', 'dim7', '6'].includes(q))
  && RECOGNISED.length === 11,
  `${RECOGNISED.length} qualities: ${RECOGNISED.map(([q]) => q).join(' ')}`);

// ── the one real bug the research found, and it is one line ─────────────────

// 5. NEGATIVE CONTROL, AND IT IS THE REASON THIS FILE HAS ITS OWN TABLE.
//    `Cm7` with the fifth left out is `C Eb Bb`. Against `Cmin7` it matches 3
//    and misses 1; against `Cmin7b5` it matches 3 and misses 1. A dead tie,
//    broken by whichever comes first, and `min7b5` sits above `min7` in
//    `chords.mjs`'s `QUALITIES` because that table is ordered longest name
//    first for the PARSER's benefit. That is a fact about strings. This one is
//    ordered by how likely a chord is, which is a fact about music.
{
  const r = nameChord([60, 63, 70]);
  const qs = RECOGNISED.map(([q]) => q);
  ok('a minor seventh with no fifth reads as min7 rather than min7b5',
    r.name === 'Cmin7' && qs.indexOf('min7') < qs.indexOf('min7b5'),
    `${r.name}, with min7 at ${qs.indexOf('min7')} and min7b5 at ${qs.indexOf('min7b5')}`);
  // and the honest half: the two really are tied, so it must not sound sure
  ok('and it is still a tie, so the page does not claim to be sure of it',
    r.sure === false && r.margin === 0,
    `margin ${r.margin.toFixed(1)}, alts ${r.alts.map((a) => a.name).join(' or ')}`);
}

// ── the margin walks a rolled chord, which the research measured note by note ─

// 6. MEASURED in the research at every prefix of a rolled `Cmaj7`, and
//    reproduced here independently. The row that matters is the third: `C` is
//    genuinely the best reading of `C E G` at a margin of 1.0, it is CORRECT,
//    and it is about to be replaced. That is why the settling window is a
//    separate mechanism from the margin and not a substitute for it.
{
  const steps = [[60], [60, 64], [60, 64, 67], [60, 64, 67, 71]];
  const got = steps.map((s) => nameChord(s)).map((r) => `${r.name} ${r.margin.toFixed(1)}`);
  ok('the reading of a rolled chord changes at every note, margins and all',
    got.join(', ') === 'C5 0.5, Cmaj 0.0, Cmaj 1.0, Cmaj7 2.0', got.join(', '));
}

// 7. Two notes do not name a chord, and the one exception is a bare fifth.
//    MEASURED over the 132 chords this vocabulary spells: a perfect fifth is in
//    13 of them and a major third is in 10, so nothing else pins anything down.
ok('a bare fifth is named and every other pair of notes is not',
  nameChord([60, 67]).sure === true && nameChord([60, 67]).name === 'C5'
  && nameChord([60, 64]).sure === false && nameChord([60, 63]).sure === false
  && nameChord([60, 65]).sure === false,
  `C G is ${nameChord([60, 67]).name}, C E is unsure at margin `
  + `${nameChord([60, 64]).margin.toFixed(1)}`);

// 8. A slash bass is free and exact, and it is reported BESIDE the name rather
//    than folded into it. `chords.mjs` already refuses to fold one in the other
//    direction, because that would make `F/C` and `Fadd4` the same chord.
{
  const r = nameChord([55, 60, 64, 67]);
  ok('the lowest note is reported as a bass when it is not the root',
    r.name === 'Cmaj' && r.over === 'G' && r.label === 'Cmaj/G' && r.sure,
    `${r.label}, margin ${r.margin.toFixed(1)}`);
}

// 9. A note the chord cannot explain is counted rather than named. `C E G D` is
//    a `Cmaj` with a D on top, which is true and useful; putting `add9` in the
//    vocabulary buys the name and costs the coverage.
{
  const r = nameChord([60, 64, 67, 74]);
  ok('a note outside the chord is counted, not renamed',
    r.name === 'Cmaj' && r.extra === 1, `${r.name} with ${r.extra} note it cannot explain`);
}

// ── the graded run, which is the reason this file exists ───────────────────

/** Semitones above the root, read off the mask so there is one table. */
const stepsOf = (mask) => {
  const out = [];
  for (let i = 0; i < 12; i++) if (mask & (1 << i)) out.push(i);
  return out;
};

/**
 * Every root position, every inversion, a doubled root, and a fifth omitted
 * where there is one, across 11 qualities and 12 roots.
 *
 * ⚠️ IT IS GENERATED RATHER THAN LISTED, because a list of a few hundred
 * voicings is a list somebody curated, and the one thing a curated list cannot
 * do is contain the case nobody thought of. The research graded 1,704 of these.
 */
const cases = [];
for (const [quality, mask] of RECOGNISED) {
  const steps = stepsOf(mask);
  for (let root = 0; root < 12; root++) {
    const want = `${PC[root]}${quality}`;
    const base = steps.map((s) => 60 + root + s);
    for (let inv = 0; inv < base.length; inv++) {
      cases.push({ want, quality, how: inv ? `inversion ${inv}` : 'root position',
        notes: base.map((n, j) => (j < inv ? n + 12 : n)) });
    }
    cases.push({ want, quality, how: 'doubled root',
      notes: [...base, base[0] + 12] });
    if (steps.includes(7) && steps.length > 2) {
      cases.push({ want, quality, how: 'no fifth',
        notes: steps.filter((s) => s !== 7).map((s) => 60 + root + s) });
    }
  }
}

// 10. 🔴 THE ONE THAT DECIDES EVERYTHING. Every case the recogniser is SURE
//     about must be right. Not most of them. The whole point of a margin is
//     that it is a promise, and a promise kept 99 per cent of the time is a
//     page that will one day confirm its own mistake back to somebody who
//     trusted it.
{
  const spoke = [], wrong = [];
  for (const c of cases) {
    const r = nameChord(c.notes);
    if (!r.sure) continue;
    spoke.push(c);
    if (r.name !== c.want) wrong.push(`${c.want} ${c.how} -> ${r.name}`);
  }
  const coverage = (100 * spoke.length / cases.length).toFixed(1);
  ok(`at a margin of ${MARGIN.toFixed(1)} the recogniser is never wrong`,
    wrong.length === 0,
    wrong.length
      ? `${wrong.length} wrong, first five: ${wrong.slice(0, 5).join(', ')}`
      : `${spoke.length} of ${cases.length} voicings answered, ${coverage} per cent, `
        + 'and every one of them right');
}

// 11. And the coverage beside it, because a recogniser that never speaks is
//     also never wrong. MEASURED in the research at 72.0 per cent over its own
//     600 case set; this set is generated differently so the number differs and
//     the FLOOR is what is asserted.
{
  const spoke = cases.filter((c) => nameChord(c.notes).sure).length;
  const pct = 100 * spoke / cases.length;
  ok('NEGATIVE CONTROL: and it speaks about most of them, or silence would be free',
    pct > 55, `${spoke} of ${cases.length}, ${pct.toFixed(1)} per cent`);
}

// 12. Top 1 over everything, which is the honest ceiling. MEASURED in the
//     research at 88.0 per cent on the eleven qualities, and the residue is the
//     four collision classes rather than anything fixable.
{
  const right = cases.filter((c) => nameChord(c.notes).name === c.want).length;
  const pct = 100 * right / cases.length;
  const byQuality = {};
  for (const c of cases) {
    const r = nameChord(c.notes);
    if (r.name !== c.want) byQuality[c.quality] = (byQuality[c.quality] || 0) + 1;
  }
  ok('top 1 over every voicing, wrong answers included, is about what was measured',
    pct > 80, `${right} of ${cases.length}, ${pct.toFixed(1)} per cent, and what is left `
    + `wrong is ${Object.entries(byQuality).map(([q, n]) => `${q} x${n}`).join(' ') || 'nothing'}`);
}

// 13. NEGATIVE CONTROL FOR THE WHOLE APPROACH. The obvious recogniser, the
//     lowest sounding note is the root, scores 100 per cent on root position
//     and MEASURED **exactly zero on every inversion**. It is written out here
//     rather than described, because a number in a comment is not evidence, and
//     because this is the build somebody will reach for next time.
{
  const lowest = (notes) => {
    const low = ((Math.min(...notes) % 12) + 12) % 12;
    const pcs = new Set(notes.map((n) => ((n % 12) + 12) % 12));
    for (const [q, mask] of RECOGNISED) {
      const want = new Set(stepsOf(mask).map((s) => (low + s) % 12));
      if (want.size === pcs.size && [...want].every((p) => pcs.has(p))) return `${PC[low]}${q}`;
    }
    return '';
  };
  const invs = cases.filter((c) => c.how.startsWith('inversion'));
  const naive = invs.filter((c) => lowest(c.notes) === c.want).length;
  const ours = invs.filter((c) => nameChord(c.notes).name === c.want).length;
  ok('NEGATIVE CONTROL: taking the lowest note as the root gets no inversion right',
    naive === 0 && ours > invs.length * 0.5,
    `over ${invs.length} inversions the lowest-note rule gets ${naive} and this one gets ${ours}`);
}

// 14. The round trip, which is the one check that would catch the two
//     directions drifting apart later. Whatever `parseChord` spells, naming its
//     root position notes gives the same string back.
{
  const bad = [];
  for (const [quality] of RECOGNISED) {
    for (let root = 0; root < 12; root++) {
      const symbol = `${PC[root]}${quality}`;
      const c = parseChord(symbol);
      if (!c.ok) { bad.push(`${symbol} would not parse`); continue; }
      const back = nameOf(c.notes);
      if (back !== c.name) bad.push(`${c.name} -> ${back}`);
    }
  }
  ok('every chord the parser spells names back to the same string',
    bad.length === 0,
    bad.length ? bad.slice(0, 5).join(', ') : `${RECOGNISED.length * 12} symbols round tripped`);
}

// 15. And the same round trip through the page's own key, so a tally key cannot
//     drift from the notes the roll draws.
ok('a tally key turns back into the notes of the chord it names',
  notesOf(chordKey(0, 'maj')).join(',') === '60,64,67'
  && notesOf(chordKey(9, 'min7')).join(',') === '69,72,76,79',
  `${chordKey(0, 'maj')} is ${notesOf(chordKey(0, 'maj')).join(',')}`);

console.log('\n== settling ==');

// 16. 🔴 THE WALK DOWN. Lifting three fingers unevenly hands the recogniser
//     `C E G`, then `C E`, then `C`, and every one of those is a legitimate
//     reading of what is held. Settling on the set held when the timer fires
//     names the fragment. Settling on the LARGEST set held during the window
//     names the chord.
{
  const s = createSettler({ windowMs: 200 });
  s.held([60], 0);
  s.held([60, 64], 30);
  s.held([60, 64, 67], 60);
  s.held([60, 64], 100);          // a finger comes up early
  s.held([60], 140);
  ok('a chord settles on the widest set held in the window, not the one left at the end',
    s.settle(200) === null && s.settle(341)?.notes.join(',') === '60,64,67',
    `the window restarts on every change, so it was up at 340 and named `
    + `${s.settle(400) ? 'twice' : 'once'}`);
}
// 17. NEGATIVE CONTROL: settling on the last set instead would have named `C`,
//     which is the defect this exists to stop, written out so it fails if the
//     widest-set rule is ever removed.
{
  const s = createSettler({ windowMs: 200 });
  s.held([60, 64, 67], 0);
  s.held([60], 50);
  const got = s.settle(260);
  ok('NEGATIVE CONTROL: the set held at the moment the timer fires is not what is named',
    got.notes.length === 3 && got.notes.join(',') !== '60',
    `named ${got.notes.join(',')} where the fingers held 60`);
}
// 18. The hands emptying ends the gesture, or two chords in a row would union.
{
  const s = createSettler({ windowMs: 200 });
  s.held([60, 64, 67], 0);
  s.held([], 50);
  s.held([65, 69, 72], 60);
  ok('emptying the hands starts a new gesture rather than adding to the old one',
    s.settle(300).notes.join(',') === '65,69,72',
    'the first chord is gone by the time the second settles');
}
// 19. Fewer than three notes is reported as not enough rather than named.
{
  const s = createSettler({ windowMs: 200, minNotes: 3 });
  s.held([60, 64], 0);
  const got = s.settle(250);
  ok('two notes settle as not enough rather than as a chord',
    got.enough === false && got.notes.length === 2, `${got.notes.length} notes held`);
}

console.log('\n== which chords somebody keeps returning to ==');

/**
 * 🔴 THE SESSION THAT SEPARATES THE TWO SCORINGS, AND IT IS BUILT SO THAT RAW
 * COUNT GETS IT WRONG. Four loop chords held 1,400 ms each and two passing
 * chords held 150 ms each, and the passing ones are played TWICE as often. That
 * is the research's own finding in a smaller shape: on its 100 event session the
 * raw tally read `Fmaj7 x19  Em x17  C x16`, so the two passing chords WON on
 * count and any policy built on event count picks them.
 * ⚠️ THE GAP IS THERE BY CONSTRUCTION AND THAT IS THE HONEST LIMIT. Nobody has
 * measured what a real player's hold times look like. If the real gap is a
 * factor of two rather than ten, this gate is a much harder choice and might
 * not exist at all.
 */
const session = (() => {
  const evts = [];
  let t = 0;
  const play = (key, ms) => { evts.push({ key, at: t, ms }); t += ms + 40; };
  for (let bar = 0; bar < 8; bar++) {
    for (const key of ['0:maj', '7:maj', '9:min', '5:maj']) {
      play('4:min', 150);          // a passing chord on the way in
      play(key, 1400);
      play('10:maj', 150);         // and one on the way out
    }
  }
  return evts;
})();

// 20. The finding, run rather than quoted.
{
  const counts = new Map(), times = new Map();
  for (const e of session) {
    counts.set(e.key, (counts.get(e.key) || 0) + 1);
    times.set(e.key, (times.get(e.key) || 0) + e.ms);
  }
  const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k);
  const loop = ['0:maj', '7:maj', '9:min', '5:maj'];
  const byCount = top(counts), byTime = top(times);
  ok('counting events puts passing chords in the top four and counting time held does not',
    byCount.filter((k) => loop.includes(k)).length < 4
    && byTime.filter((k) => loop.includes(k)).length === 4,
    `by count ${byCount.join(' ')}, by time held ${byTime.join(' ')}`);
}

// 21. 🔴 A TOTAL ON ITS OWN ADMITS EVERYTHING EVENTUALLY, AND THE RESEARCH DID
//     NOT MEASURE THIS BECAUSE IT SCORED A TOP FOUR RATHER THAN A THRESHOLD.
//     Run here with the hold gate switched off, which is the build the research
//     describes, the two passing chords bank 4.8 s each against the loop
//     chords' 11.2 and a 2,000 ms threshold lets all six in. Ranked, the top
//     four are right; admitted, everything arrives. This is the control that
//     says the gate below is doing something.
{
  const t = createTally({ admitMs: 2000, minHoldMs: 0, slots: 6 });
  for (const e of session) { t.hold(e.key, e.at); t.check(e.at + e.ms); t.release(e.at + e.ms); }
  const end = session[session.length - 1].at + 200;
  const scores = t.scores(end);
  const loop = ['0:maj', '7:maj', '9:min', '5:maj'];
  ok('NEGATIVE CONTROL: with no hold gate a total admits the chords you passed through too',
    scores.slice(0, 4).every((s) => loop.includes(s.key)) && t.rows().length === 6,
    scores.map((s) => `${s.key} ${(s.ms / 1000).toFixed(1)}s`).join(', ')
    + `, and all ${t.rows().length} were admitted`);
}

// 22. ✅ AND THE REPAIR IS THE OTHER SCORING THE RESEARCH ALREADY MEASURED AT
//     4 OF 4: a hold shorter than the gate banks nothing at all, so a chord you
//     only ever pass through never accrues however often you arrive at it.
{
  const t = createTally({ admitMs: 2000, slots: 6 });
  for (const e of session) { t.hold(e.key, e.at); t.check(e.at + e.ms); t.release(e.at + e.ms); }
  const end = session[session.length - 1].at + 200;
  const scores = t.scores(end);
  const loop = ['0:maj', '7:maj', '9:min', '5:maj'];
  ok('with the hold gate the two passing chords never score at all and never get in',
    t.rows().length === 4 && t.rows().every((k) => loop.includes(k))
    && scores.filter((s) => s.ms > 0).length === 4,
    scores.map((s) => `${s.key} ${(s.ms / 1000).toFixed(1)}s`).join(', '));
}

// 23. NEGATIVE CONTROL for the gate itself, or it could be a number nothing
//     reads. Raised above the loop chords' own hold length, nothing gets in.
{
  const t = createTally({ admitMs: 2000, minHoldMs: 2000, slots: 6 });
  for (const e of session) { t.hold(e.key, e.at); t.check(e.at + e.ms); t.release(e.at + e.ms); }
  ok('NEGATIVE CONTROL: a gate above every hold in the session admits nothing',
    t.rows().length === 0,
    `${t.rows().length} rows, where the longest hold in this session is 1400 ms`);
}

// 24. 🔴 ADMIT AND PIN. MEASURED in the research at **4 list changes against
//     29, and 0 pure re-sorts against 22**. A pure re-sort is the same four
//     chords in a different order: nothing new happened, the reader learned
//     nothing, and every row they were looking at moved. This asserts the
//     invariant rather than the count, which is the stronger claim: every
//     snapshot of the list is a PREFIX of the one after it, so no row can have
//     moved and none can have gone.
{
  const t = createTally({ admitMs: 2000, slots: 6 });
  const shots = [];
  for (const e of session) {
    t.hold(e.key, e.at);
    t.check(e.at + e.ms);
    t.release(e.at + e.ms);
    shots.push(t.rows().join(' '));
  }
  const uniq = [...new Set(shots)];
  const prefixes = uniq.every((s, i) => i === 0 || s.startsWith(uniq[i - 1]));
  ok('a row never moves and never leaves, so every list is the one before it plus rows',
    prefixes && uniq.length === 5,
    `${uniq.length} different lists over ${session.length} chords, all of them appends, `
    + `ending ${t.rows().join(' ')}`);
}

// 25. A full list says so rather than evicting.
{
  const t = createTally({ slots: 2 });
  /* Each one arrived at twice, because two arrivals is what admits now. */
  for (const [i, key] of ['0:maj', '7:maj', '9:min'].entries()) {
    for (const visit of [0, 1]) {
      t.hold(key, i * 2000 + visit * 800);
      t.release(i * 2000 + visit * 800 + 500);
    }
  }
  const r = t.check(9000);
  ok('a full list refuses a new chord out loud rather than dropping an old one',
    t.rows().length === 2 && r.full === true && r.sayFull === true
    && t.check(10000).sayFull === false,
    `${t.rows().join(' ')} held, and it says it is full once rather than every time`);
}

// 26. The timer the page hangs off, so admission needs no polling at all. The
//     page sets one timeout at `max(0, dueAt - now)` and nothing runs while
//     somebody is looking at a page and not playing it.
{
  const t = createTally({ times: 2, minHoldMs: 400 });
  t.hold('0:maj', 1000);
  /* ⚠️ READ BEFORE THE NEXT HOLD, not inside the assert. The first version of
     this check called `dueAt` from the assert expression, which runs after
     every line above it, so both readings came from the SECOND hold and the
     numbers agreed for the wrong reason. */
  const first = t.dueAt(1000), mid = t.dueAt(2500);
  t.release(3100);
  t.hold('0:maj', 4000);
  const second = t.dueAt(4000);
  /* 🔴 THE FIRST ARRIVAL HAS NO DUE TIME AT ALL, and that is the change from a
     total to a count said as a number. No amount of holding admits a chord you
     have only arrived at once: you have to let go and come back. The second
     arrival is due the moment it passes the floor. */
  ok('a first arrival never falls due however long it is held, and the second does at the floor',
    first === null && mid === null && second === 4400,
    `a first hold from 1000 is due at ${first} and still ${mid} at 2500, and a second `
    + `hold from 4000 is due at ${second}`);
}

// 27. And the count is of ARRIVALS YOU STAYED AT, which is the floor doing the
//     work the research says it has to do.
{
  const t = createTally({ times: 2, minHoldMs: 400 });
  for (let i = 0; i < 6; i++) { t.hold('0:maj', i * 1000); t.release(i * 1000 + 100); }
  const passing = t.check(9000).admitted.length;
  t.hold('7:maj', 20000); t.release(20500);
  t.hold('7:maj', 22000); t.release(22500);
  const stayed = t.check(23000).admitted.length;
  ok('NEGATIVE CONTROL: six passes through a chord admit nothing, two real arrivals admit it',
    passing === 0 && stayed === 1 && t.rows().join(' ') === '7:maj',
    `six holds of 100 ms admitted ${passing}, two holds of 500 ms admitted ${stayed}, `
    + `and the list reads ${t.rows().join(' ') || 'nothing'}`);
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
