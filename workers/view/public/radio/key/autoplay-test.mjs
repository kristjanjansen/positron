// demo/radio/key/autoplay-test.mjs. Autoplay's chord choice and voice
// leading, with no browser at all.
//
//   node demo/radio/key/autoplay-test.mjs
//
// Mostly NEGATIVE CONTROLS, written so that the bug each names would fail it:
// a chooser that ignores the chroma, one that never repeats or always repeats,
// a voicer that always returns root position, one that leaves the range, one
// that measures motion to the nearest note rather than voice to voice. Count
// them with `grep -c 'NEGATIVE CONTROL' demo/radio/key/autoplay-test.mjs`.

import { triad, romanOf, fit, chromaSays, walkNext, chooseChord, placements, motion, voiceLead, rootPosition, chromaEase, WALK }
  from './autoplay.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? '   ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? '   ' + detail : ''}`); }
};
const chroma = (weights) => { const c = new Array(12).fill(0.01); for (const [pc, w] of Object.entries(weights)) c[+pc] = w; return c; };
const C = { tonic: 0, mode: 'major', confidence: 0.6 };
const Am = { tonic: 9, mode: 'minor', confidence: 0.6 };
const RANGE = { lo: 52, hi: 71, home: 60 };

console.log('\n== the chords of a key ==');
ok('C major I is C E G', triad(0, 'major', 0).join() === '0,4,7');
ok('C major vi is A C E', triad(0, 'major', 5).join() === '9,0,4');
ok('A minor III is C E G', triad(9, 'minor', 2).join() === '0,4,7');
ok('numerals in major', [0, 1, 2, 3, 4, 5, 6].map((s) => romanOf(0, 'major', s)).join(' ') === 'I ii iii IV V vi vii°');
ok('numerals in natural minor', [0, 1, 2, 3, 4, 5, 6].map((s) => romanOf(9, 'minor', s)).join(' ') === 'i ii° III iv v VI VII');

console.log('\n== the chord follows the radio ==');
// The station sounding F A C: IV in C major.
const fac = chroma({ 5: 1, 9: 0.9, 0: 0.8 });
let r = chooseChord(fac, C, 0);
ok('F A C in C major picks IV', r.step === 3 && r.how === 'radio', `${r.roman} ${r.how}`);
// NEGATIVE CONTROL: a chooser that ignores the chroma and walks would play IV
// here too after I, so ask from a chord the walk would not go to IV from.
r = chooseChord(fac, C, 4);
ok('NEGATIVE CONTROL: from V, F A C still picks IV, not the walk\'s vi', r.step === 3, r.roman);
r = chooseChord(chroma({ 7: 1, 11: 0.9, 2: 0.8 }), C, 0);
ok('G B D in C major picks V', r.step === 4, r.roman);
r = chooseChord(chroma({ 9: 1, 0: 0.9, 4: 0.8 }), C, 0);
ok('A C E in C major picks vi', r.step === 5, r.roman);
r = chooseChord(chroma({ 2: 1, 5: 0.9, 9: 0.8 }), C, 0);
ok('D F A in C major picks ii, which the old loop never played', r.step === 1, r.roman);
r = chooseChord(chroma({ 5: 1, 9: 0.9, 0: 0.8 }), Am, 0);
ok('the same F A C in A minor is VI', r.step === 5 && r.roman === 'VI', r.roman);
// NEGATIVE CONTROL: the repeat cost is mild. A station still plainly on the
// chord that is sounding keeps it, or a chooser that never repeats passes.
r = chooseChord(fac, C, 3);
ok('NEGATIVE CONTROL: F A C while IV is sounding stays on IV', r.step === 3, r.roman);
// ...and it is a cost at all: C, E, G and A nearly level fit I and vi
// almost exactly as well (C and E in both, G against A), and the near tie is
// broken toward whichever is NOT sounding. With no repeat cost the I's lean
// keeps I from I, and vi's own fit keeps vi from vi.
const split = chroma({ 0: 1, 4: 1, 7: 0.9, 9: 1 });
const fromI = chooseChord(split, C, 0).step, fromVi = chooseChord(split, C, 5).step;
ok('NEGATIVE CONTROL: a near tie between I and vi moves off the chord sounding', fromI === 5 && fromVi === 0, `from I ${fromI}, from vi ${fromVi}`);
// vii° needs far more than its share to be chosen.
r = chooseChord(chroma({ 11: 1, 2: 1, 5: 1, 7: 0.9 }), C, 0);
ok('B D F with a strong G under it reads as V, not vii°', r.step === 4, r.roman);

console.log('\n== when the radio says nothing, it walks ==');
ok('an empty chroma says nothing', !chromaSays(new Array(12).fill(0)));
ok('a flat chroma says nothing', !chromaSays(new Array(12).fill(0.08)));
ok('NEGATIVE CONTROL: a triad\'s chroma does say something', chromaSays(fac));
ok('the walk is I IV V vi and round', [0, 3, 4, 5].map(walkNext).join() === '3,4,5,0' && WALK.join() === '0,3,4,5');
ok('from off the walk it goes home', walkNext(1) === 0 && walkNext(null) === 0);
r = chooseChord(new Array(12).fill(0.08), C, 3);
ok('a flat chroma walks from IV to V', r.step === 4 && r.how === 'walk', `${r.roman} ${r.how}`);
r = chooseChord(fac, { ...C, confidence: 0.02 }, 4);
ok('NEGATIVE CONTROL: low confidence walks even when the chroma is clear', r.step === 5 && r.how === 'walk', `${r.roman} ${r.how}`);
r = chooseChord(null, C, null);
ok('no chroma at all walks to I', r.step === 0 && r.how === 'walk');

console.log('\n== voicing ==');
const ps = placements([0, 4, 7], RANGE.lo, RANGE.hi);
ok('every close position of C major inside 52..71', ps.length > 0 && ps.every((p) => p[0] >= 52 && p[2] <= 71 && p[2] - p[0] <= 9), ps.map((p) => p.join(' ')).join(' | '));
ok('it offers all three inversions', new Set(ps.map((p) => p[0] % 12)).size === 3);
ok('motion pairs voice to voice', motion([60, 64, 67], [60, 65, 69]) === 3);
// NEGATIVE CONTROL: measured to the nearest note, as the kit's `lead` voicing
// does, this is 5 (64 and 67 stay, 72 is 5 from 67). Paired, lowest to
// lowest, it is the 12 semitones the three voices really travel.
ok('NEGATIVE CONTROL: two voices cannot share one target', motion([60, 64, 67], [64, 67, 72]) === 12);
let v = voiceLead(null, [0, 4, 7], RANGE);
ok('a first chord is root position near home', v.notes.join() === '60,64,67' && v.motion === null, v.notes.join(' '));
v = voiceLead([60, 64, 67], [5, 9, 0], RANGE);
ok('C to F holds C and moves 3', v.notes.join() === '60,65,69' && v.motion === 3 && v.held === 1, `${v.notes.join(' ')} motion ${v.motion}`);
v = voiceLead([60, 64, 67], [7, 11, 2], RANGE);
ok('C to G holds G and moves 3', v.notes.join() === '59,62,67' && v.motion === 3 && v.held === 1, `${v.notes.join(' ')} motion ${v.motion}`);
v = voiceLead([60, 64, 67], [9, 0, 4], RANGE);
ok('C to Am holds C and E and moves 2', v.notes.join() === '60,64,69' && v.motion === 2 && v.held === 2, `${v.notes.join(' ')} motion ${v.motion}`);
// Root position for the same move, the old autoplay, for comparison.
const old = motion(rootPosition(0, 'major', 0, 48), rootPosition(0, 'major', 3, 48));
ok('root position C to F moves more than led', old > 3, `root position ${old}`);
// A long walk round the circle of fifths, always moving least, sinks a
// semitone or two a chord and the range is what turns it round. Printed, not
// graded: the middle voice averages 58.0 here against a range middle of 61.5,
// on the most one-sided progression there is. On the three R2 recordings it
// averaged 61.8, 63.9 and 65.5 (autoplay-chords.mjs), so no pull to the middle
// was added.
let prev = [60, 64, 67], all = [];
for (let i = 0; i < 48; i++) {
  const w = voiceLead(prev, triad((i * 7) % 12, 'major', 0), RANGE);
  prev = w.notes; all.push(w.notes);
}
const midAvg = all.reduce((s, n) => s + n[1], 0) / all.length;
ok('48 chords round the fifths stay inside 52..71', all.every((n) => n[0] >= 52 && n[2] <= 71));
console.log(`  (middle voice averages ${midAvg.toFixed(1)}, range middle 61.5)`);
ok('every chord it returns has the chord\'s notes', [[0, 4, 7], [2, 5, 9], [11, 2, 5]].every((pcs) => {
  const w = voiceLead([55, 60, 64], pcs, RANGE); return w.notes.map((n) => n % 12).sort().join() === [...pcs].sort().join();
}));

console.log('\n== the short chroma ==');
const acc = new Array(12).fill(0);
for (let i = 0; i < 30; i++) chromaEase(acc, fac, 0.1, 3);
ok('3 s of F A C eases the window most of the way there', acc[5] > 0.6 && acc[5] < 0.7, acc[5].toFixed(3));
for (let i = 0; i < 30; i++) chromaEase(acc, chroma({ 7: 1, 11: 0.9, 2: 0.8 }), 0.1, 3);
ok('3 s of G B D after it now reads V', chooseChord(acc, C, 3).step === 4, chooseChord(acc, C, 3).roman);

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
