// demo/shell/chords-test.mjs: the chord parser, with no browser. `node demo/shell/chords-test.mjs`.
// Every past bug returned a good chord that was the wrong chord, so most are negative controls.
// Count them: `grep -c 'NEGATIVE CONTROL' demo/shell/chords-test.mjs`.
// why: lessons/kit-chords.md#test-header

import { parseChord, parseChords, CHORD_GAP, roman, voiceChord, VOICINGS, QUALITIES, QUALITY_SAYS, noteName, ROOT_OCTAVE }
  from './chords.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? '   ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? '   ' + detail : ''}`); }
};
const notes = (s) => { const c = parseChord(s); return c.ok ? c.notes.join(',') : `BAD ${c.why}`; };
const spell = (s) => { const c = parseChord(s); return c.ok ? c.notes.map(noteName).join(' ') : `BAD ${c.why}`; };

console.log('\n== chords ==');

// ── the four examples that decided the grammar ──────────────────────────────

// 1. Given as `Cmaj C9 F/C Fm6/C`, and between them they fix the root, the
//    quality, the extension, the slash bass and the order of all four.
ok('Cmaj is a major triad on middle C', notes('Cmaj') === '60,64,67', spell('Cmaj'));
ok('C9 is a dominant ninth, not C in octave 9',
  notes('C9') === '60,64,67,70,74', spell('C9'));
ok('F/C is F major over a C below it', notes('F/C') === '60,65,69,72', spell('F/C'));
ok('Fm6/C is a minor sixth over a bass', notes('Fm6/C') === '60,65,68,72,74', spell('Fm6/C'));

// 2. NEGATIVE CONTROL: `c5` is the power chord, not a note in octave 5.
// why: lessons/kit-chords.md#t2
ok('c5 is the power chord, root and fifth, not a note in octave 5',
  notes('c5') === '60,67', spell('c5'));

// ── the one place case carries meaning ──────────────────────────────────────

// 3. NEGATIVE CONTROL: a case insensitive walk reads `CM` as C minor.
// why: lessons/kit-chords.md#t3
ok('CM is major and Cm is minor', notes('CM') === '60,64,67' && notes('Cm') === '60,63,67',
  `CM ${spell('CM')}, Cm ${spell('Cm')}`);

// 4. And the capital is normalised rather than special cased, so the numbered
//    ones come for free.
ok('CM7 is a major seventh and Cm7 is a minor seventh',
  notes('CM7') === '60,64,67,71' && notes('Cm7') === '60,63,67,70',
  `CM7 ${spell('CM7')}`);

// 5. NEGATIVE CONTROL the other way: everything but `M` is case blind.
// why: lessons/kit-chords.md#t5
ok('every other spelling is case blind',
  notes('CMAJ') === notes('Cmaj') && notes('cMaJ') === notes('Cmaj')
  && notes('csus4') === notes('CSUS4'),
  `CMAJ ${spell('CMAJ')}`);

// ── the table's order is load bearing ───────────────────────────────────────

// 6. NEGATIVE CONTROL. `m` is a prefix of `maj`, `maj` of `maj7`, `m7` of
//    `m7b5`. A table in any other order loses the seventh or the flat fifth.
{
  const names = QUALITIES.map(([n]) => n);
  let shadowed = null;
  for (let i = 0; i < names.length && !shadowed; i++) {
    for (let j = i + 1; j < names.length; j++) {
      if (names[j] && names[i] && names[j].toLowerCase().startsWith(names[i].toLowerCase())) {
        shadowed = `${names[i]} at ${i} shadows ${names[j]} at ${j}`;
        break;
      }
    }
  }
  ok('no quality in the table shadows a longer one after it', shadowed === null,
    shadowed || `${names.length} qualities, longest first`);
}

// 7. And the longest ones really do win, read off the parser rather than the table.
ok('the longest matching quality wins',
  notes('Cmaj7') === '60,64,67,71' && notes('Cm7b5') === '60,63,66,70',
  `Cmaj7 ${spell('Cmaj7')}, Cm7b5 ${spell('Cm7b5')}`);

// `C2/E`, the chord this table refused, and the counted spellings (159,644 chords).
// why: lessons/kit-chords.md#t-c2e

// 7a. Note numbers written out, so they can be checked against the video by ear.
// why: lessons/kit-chords.md#t7a
ok('C2/E is E3 C4 D4 G4, note numbers 52 60 62 67',
  notes('C2/E') === '52,60,62,67' && spell('C2/E') === 'E3 C4 D4 G4',
  `${parseChord('C2/E').name}   ${spell('C2/E')}   ${notes('C2/E')}`);

// 7b. NEGATIVE CONTROL: give `2` a third and the slash says nothing, and this goes red.
// why: lessons/kit-chords.md#t7b
ok('a 2 chord has no third in it, which is what leaves the slash something to do',
  parseChord('C2').notes.every((n) => (n - 60) % 12 !== 4)
  && parseChord('C2/E').notes.filter((n) => ((n % 12) + 12) % 12 === 4).length === 1,
  spell('C2'));

// 7c. The name that comes back is the one typed; `2` has no `QUALITY_SAYS` entry.
// why: lessons/kit-chords.md#t7c
ok('C2 reads back as C2 rather than as Csus2',
  parseChord('C2').name === 'C2' && parseChord('C2/E').name === 'C2/E',
  `${parseChord('C2').name} and ${parseChord('C2/E').name}`);

// 7d. `2` and `sus2` are the same three notes under two names, asserted rather than hidden.
// why: lessons/kit-chords.md#t7d
ok('2 and sus2 are the same three notes under two names',
  notes('C2') === notes('Csus2') && parseChord('C2').name !== parseChord('Csus2').name,
  `${parseChord('C2').name} ${spell('C2')} against ${parseChord('Csus2').name} ${spell('Csus2')}`);

// 7e. The five counted spellings, each reaching the table and each coming back
//     under the name the page already shows. MEASURED occurrences across both
//     corpora: h7 1,754, o7 882, hdim7 200, h 105, o 85.
{
  const want = { Ch7: 'Cmin7b5', Ch: 'Cmin7b5', Chdim7: 'Cmin7b5', Co7: 'Cdim7', Co: 'Cdim' };
  const wrong = Object.entries(want).filter(([typed, says]) => {
    const c = parseChord(typed);
    return !c.ok || c.name !== says || notes(typed) !== notes(says);
  });
  ok('every spelling added in 2026-09-26 is reachable and says an existing name',
    wrong.length === 0,
    wrong.map(([t]) => t).join(', ') || Object.keys(want).join(' '));
}

// 7f. NEGATIVE CONTROL: no row is unreachable through the splitter's own character class.
// why: lessons/kit-chords.md#t7f
{
  /* The splitter's own class, read off the module rather than copied, so the
     two cannot drift. A row survives the split only if no character of it is a
     gap. */
  const unreachable = QUALITIES.map(([n]) => n).filter((n) => n && CHORD_GAP.test(n));
  ok('no row is spelled with a character the line splitter throws away',
    unreachable.length === 0,
    unreachable.map((n) => JSON.stringify(n)).join(', ') || `${QUALITIES.length} rows`);
}

// 7g. NEGATIVE CONTROL: `C+` is an augmented triad, not C major with nothing refused.
// why: lessons/kit-chords.md#t7g
{
  const r = parseChords('C+');
  ok('C+ reads as an augmented triad rather than as C major',
    r.bad.length === 0 && r.chords.length === 1 && r.chords[0].quality === 'aug'
    && r.chords[0].notes.join() === '60,64,68',
    `${r.chords.map((c) => `${c.name} ${c.notes.join(',')}`).join(' ')}, ${r.bad.length} refused`);
}

// 7h. A lone plus is still a gap; `C+7` is refused in words.
// why: lessons/kit-chords.md#t7h
{
  const a = parseChords('C + G');
  const b = parseChords('C+7');
  ok('a lone plus separates two chords, and C+7 is refused rather than guessed',
    a.bad.length === 0 && a.chords.map((c) => c.name).join(' ') === 'C G'
    && b.chords.length === 0 && b.bad.length === 1,
    `${a.chords.map((c) => c.name).join(' ')}, and C+7: ${b.bad[0]?.why}`);
}

// 7i. `^` is still the separator, so widening it cannot happen quietly.
// why: lessons/kit-chords.md#t7i
{
  const r = parseChords('C^');
  ok('a caret is still eaten by the splitter, which is a known lie and not a fix',
    r.bad.length === 0 && r.chords.length === 1 && r.chords[0].quality === 'maj',
    `${r.chords.map((c) => c.name).join(' ')}, ${r.bad.length} refused`);
}

// ── a slash is a bass, not a chord tone ─────────────────────────────────────

// 8. NEGATIVE CONTROL: the bass is not folded into the stack, or F/C becomes Fadd4.
// why: lessons/kit-chords.md#t8
ok('a bass sits below the root rather than inside the chord',
  parseChord('F/C').notes[0] < parseChord('F/C').notes[1]
  && parseChord('F/C').notes[0] === 60 && parseChord('F/C').notes[1] === 65,
  spell('F/C'));

// 9. NEGATIVE CONTROL. A bass on the root itself goes an octave DOWN rather
//    than doubling it in unison, which is inaudible and reads as a bug.
ok('a bass on the root drops an octave instead of doubling it',
  notes('C/C') === '48,60,64,67', spell('C/C'));

// 10. A bass above the root in pitch class still lands below it in pitch.
ok('a bass whose letter is above the root still sounds below it',
  parseChord('C/G').notes[0] === 55 && parseChord('C/G').notes[1] === 60, spell('C/G'));

// 11. And the bass is reported separately, so a caller can draw it differently.
{
  const c = parseChord('Fm6/C');
  ok('the bass is reported as its own pitch class', c.bass === 0 && c.root === 5,
    `root ${c.root}, bass ${c.bass}`);
}

// ── roots, flats and the letter that is both ────────────────────────────────

// 12. NEGATIVE CONTROL. `b` is a note AND a flat, and only position tells them
//     apart: the first character is the root, so a `b` after it is an accidental.
ok('Bb is B flat and B is B',
  parseChord('Bb').root === 10 && parseChord('B').root === 11,
  `Bb root ${parseChord('Bb').root}, B root ${parseChord('B').root}`);

// 13. NEGATIVE CONTROL. A sharp that runs off the top of the octave wraps
//     rather than going out of range.
ok('B# wraps to C rather than leaving the octave',
  parseChord('B#').root === 0, `root ${parseChord('B#').root}`);

// 14. And Cb wraps the other way.
ok('Cb wraps down to B', parseChord('Cb').root === 11, `root ${parseChord('Cb').root}`);

// ── the separator is everything else ────────────────────────────────────────

// 15. NEGATIVE CONTROL: any separator, so `Cmaj,C9` is two chords.
// why: lessons/kit-chords.md#t15
{
  const want = 'Cmaj,C9,F/C';
  const forms = ['Cmaj C9 F/C', 'Cmaj,C9,F/C', 'Cmaj | C9 | F/C', 'Cmaj->C9->F/C',
    '  Cmaj\n\tC9 ... F/C  ', 'Cmaj; C9; F/C'];
  const got = forms.map((f) => parseChords(f).chords.map((c) => c.text).join(','));
  ok('any separator at all gives the same three chords',
    got.every((g) => g === want), `${forms.length} spellings, all ${got[0]}`);
}

// 16. NEGATIVE CONTROL. `#` and `/` are chord characters and must survive the
//     split, or `F#dim7` becomes `F` and `dim7` and `F/C` becomes two chords.
{
  const r = parseChords('F#dim7 F/C');
  ok('a sharp and a slash are not separators',
    r.chords.length === 2 && r.chords[0].text === 'F#dim7' && r.chords[1].text === 'F/C',
    r.chords.map((c) => c.name).join(' '));
}

// ── what did not parse is reported, never dropped ───────────────────────────

// 17. NEGATIVE CONTROL. A token that vanishes silently is the worst outcome
//     here: the page draws fewer keyboards than the line has words and nothing
//     says why.
{
  const r = parseChords('Cmaj wibble C9');
  ok('a token that did not parse comes back with a reason',
    r.chords.length === 2 && r.bad.length === 1 && r.bad[0].text === 'wibble'
    && typeof r.bad[0].why === 'string' && r.bad[0].why.length > 0,
    `${r.bad.length} refused: ${r.bad.map((b) => `${b.text} (${b.why})`).join(', ')}`);
}

// 18. Two slashes is refused rather than silently taking the first.
ok('more than one slash is refused', parseChord('C/G/E').ok === false,
  parseChord('C/G/E').why);

// 19. And a bass that is not a note is refused rather than ignored.
ok('a slash onto something that is not a note is refused',
  parseChord('C/wat').ok === false, parseChord('C/wat').why);

// 20. An empty line parses to nothing at all and reports nothing bad.
{
  const r = parseChords('   ');
  ok('an empty line is not an error', r.chords.length === 0 && r.bad.length === 0);
}

// ── the voicing, and where middle C is ──────────────────────────────────────

// 21. The default octave is the one `keyboard.mjs` and `midi-decode.mjs` print,
//     so a chord's C4 and a key labelled C4 are the same note.
ok('a chord with no octave is voiced from middle C',
  ROOT_OCTAVE === 4 && noteName(60) === 'C4' && parseChord('C').notes[0] === 60,
  `C4 is ${parseChord('C').notes[0]}`);

// 22. NEGATIVE CONTROL. Extensions go ABOVE the octave rather than being folded
//     into it, or a ninth and a second are the same chord.
ok('a ninth is above the octave, not a second inside it',
  notes('C9') !== notes('Csus2') && parseChord('C9').notes.includes(74),
  `C9 ${spell('C9')} against Csus2 ${spell('Csus2')}`);

// ── the numeral, and the four frames that decided it ────────────────────────

// 25. The reference is four frames of a piano video: `Cmaj` I, `C9` I, `F/C` IV, `Fm6/C` iv.
// why: lessons/kit-chords.md#t25
{
  const r = parseChords('Cmaj C9 F/C Fm6/C');
  ok('the four frames come back exactly as they were labelled',
    r.chords.map((c) => c.roman).join(' ') === 'I I IV iv' && r.key === 0,
    r.chords.map((c) => `${c.text} ${c.roman}`).join(', '));
}

// 26. NEGATIVE CONTROL: the same root in the same key is IV or iv by its third.
// why: lessons/kit-chords.md#t26
{
  const r = parseChords('C F Fm');
  ok('case follows the third, so F is IV and Fm is iv',
    r.chords[1].roman === 'IV' && r.chords[2].roman === 'iv',
    r.chords.map((c) => `${c.text} ${c.roman}`).join(', '));
}

// 27. NEGATIVE CONTROL. A dominant stays UPPER case: its seventh is flat and
//     its third is not, and a numeral describes the third.
{
  const r = parseChords('C C7 C9 C13');
  ok('a dominant is upper case, because a flat seventh is not a minor third',
    r.chords.every((c) => c.roman === 'I'), r.chords.map((c) => c.roman).join(' '));
}

// 28. NEGATIVE CONTROL. The bass is ignored: `F/C` is IV, not a numeral about
//     C, which is the key itself and would read as I.
{
  const r = parseChords('C F/C');
  ok('a slash bass does not move the numeral', r.chords[1].roman === 'IV',
    `${r.chords[1].name} is ${r.chords[1].roman}`);
}

// 29. The whole diatonic set, which is the one row anybody would check by eye.
{
  const r = parseChords('C Dm Em F G Am Bdim');
  ok('a major scale reads I ii iii IV V vi vii°',
    r.chords.map((c) => c.roman).join(' ') === 'I ii iii IV V vi vii\u00b0',
    r.chords.map((c) => c.roman).join(' '));
}

// 30. NEGATIVE CONTROL. A root outside the scale is a FLATTENED degree and
//     never a sharpened one: `bVII` is what everybody writes and `#VI` is what
//     nobody does.
{
  const r = parseChords('C Ab Bb Db');
  ok('a root outside the key is spelled flat',
    r.chords.map((c) => c.roman).join(' ') === 'I bVI bVII bII',
    r.chords.map((c) => c.roman).join(' '));
}

// 31. NEGATIVE CONTROL. Diminished and augmented take a MARK as well as a case,
//     because case alone cannot tell them from an ordinary minor or major.
{
  const r = parseChords('C Cdim Caug Cm7b5 Cm');
  ok('diminished and augmented carry a mark that case cannot give them',
    r.chords.map((c) => c.roman).join(' ') === 'I i\u00b0 I+ i\u00f8 i',
    r.chords.map((c) => c.roman).join(' '));
}

// 32. The key comes from the FIRST chord, so the same chords in a different
//     order are different numerals, which is what makes it an inference worth
//     saying out loud on the page.
{
  const a = parseChords('C F G'), b = parseChords('G C F');
  ok('the key is the first chord, so the order changes every numeral',
    a.chords.map((c) => c.roman).join(' ') === 'I IV V'
    && b.chords.map((c) => c.roman).join(' ') === 'I IV bVII',
    `${a.chords.map((c) => c.roman).join(' ')} against ${b.chords.map((c) => c.roman).join(' ')}`);
}

// 33. And an empty line has no key to infer, rather than defaulting to C.
ok('an empty line has no key', parseChords('').key === null);

// ── the words ───────────────────────────────────────────────────────────────

// 23. Every quality the table can reach has a name a reader gets shown.
{
  const reachable = QUALITIES.map(([n]) => n).filter((n) => n !== '');
  const unnamed = reachable.filter((n) => {
    const c = parseChord(`C${n}`);
    return !c.ok || !c.quality;
  });
  ok('every quality in the table parses and comes back named', unnamed.length === 0,
    unnamed.join(', ') || `${reachable.length} qualities`);
}

// 24. Nothing a visitor reads carries an em dash or a middot.
{
  const strings = [...Object.values(QUALITY_SAYS), ...QUALITIES.map(([n]) => n),
    parseChord('Cxyz').why, parseChord('C/G/E').why];
  ok('no em dash and no middot in anything the parser says',
    strings.every((s) => !String(s).includes('—') && !String(s).includes('·')),
    `${strings.length} strings`);
}

// The voicings. Each is a NEGATIVE CONTROL for root position, a spelling a hand cannot use.
// why: lessons/kit-chords.md#t-voicings
{
  const LO = 48, HI = 72;                       // the two octaves `/nola/` draws
  const span = (ns) => Math.max(...ns) - Math.min(...ns);

  // 1. close voicing really is the smallest span there is
  {
    const { notes: c } = parseChord('Cmaj7').ok ? parseChord('Cmaj7') : {};
    const root = parseChord('Cmaj7').notes;
    const close = voiceChord(root, { mode: 'close', lo: LO, hi: HI }).notes;
    ok('a close voicing is narrower than the spelling it came from',
      span(close) < span(root), `${span(close)} semitones against ${span(root)}`);
    ok('and it holds the same pitch classes, because a voicing moves notes rather than changing them',
      new Set(close.map((n) => n % 12)).size === new Set(root.map((n) => n % 12)).size
      && close.every((n) => root.some((r) => (r - n) % 12 === 0)),
      close.join(','));
    void c;
  }

  // 2. NEGATIVE CONTROL: root position is left exactly as it was
  {
    const root = parseChord('Fm6/C').notes;
    const same = voiceChord(root, { mode: 'root', lo: LO, hi: HI }).notes;
    ok('NEGATIVE CONTROL: root position is not rearranged, only moved to fit',
      same.every((n, i) => (n - same[0]) === (root[i] - root[0])),
      `${root.join(',')} became ${same.join(',')}`);
  }

  // 3. leading picks the inversion nearest the hand, not the lowest one
  {
    const first = voiceChord(parseChord('Cmaj').notes, { mode: 'close', lo: LO, hi: HI }).notes;
    const led = voiceChord(parseChord('F').notes,
      { mode: 'lead', lo: LO, hi: HI, near: first }).notes;
    const plain = voiceChord(parseChord('F').notes, { mode: 'close', lo: LO, hi: HI }).notes;
    const move = (a, b) => a.reduce((s, n) => s + Math.min(...b.map((m) => Math.abs(m - n))), 0);
    // Measured over a line, not one pair, since one pair can tie (Cmaj to F is 8 semitones either way).
    // why: lessons/kit-chords.md#t-line
    const LINE = ['Cmaj', 'F/C', 'G7', 'Am', 'Dm', 'G', 'Cmaj'];
    const walk = (mode) => {
      let prev = [], total = 0;
      for (const text of LINE) {
        const parsed = parseChord(text);
        const { notes } = voiceChord(parsed.notes,
          { mode, lo: LO, hi: HI, near: prev, bass: parsed.bass !== null });
        if (prev.length) total += move(notes, prev);
        prev = notes;
      }
      return total;
    };
    ok('leading moves the hand less than closing does over a whole line of chords',
      walk('lead') < walk('close'),
      `${walk('lead')} semitones against ${walk('close')} for close and ${walk('root')} for root`);
    ok('and on one pair it can tie, which is why the line above is what is measured',
      move(led, first) <= move(plain, first),
      `${move(led, first)} semitones against ${move(plain, first)}`);
    // NEGATIVE CONTROL: with nothing to lead from it is simply the close one
    const cold = voiceChord(parseChord('F').notes, { mode: 'lead', lo: LO, hi: HI, near: [] }).notes;
    ok('NEGATIVE CONTROL: with no previous chord, leading is the close voicing',
      cold.join(',') === plain.join(','), `${cold.join(',')} against ${plain.join(',')}`);
  }

  // 4. the bass of a slash chord stays underneath, in every mode
  {
    const parsed = parseChord('F/C');
    for (const mode of VOICINGS) {
      const { notes } = voiceChord(parsed.notes, { mode, lo: LO, hi: HI, bass: true });
      ok(`the slash bass is still the lowest note in the ${mode} voicing`,
        notes[0] === Math.min(...notes) && ((notes[0] % 12) === parsed.bass),
        notes.join(','));
    }
  }

  // 5. The claim is the span, about a hand: `Fm6/C` in root position spans 14 semitones.
  // why: lessons/kit-chords.md#t-span
  {
    const LINE = ['Cmaj', 'C9', 'F/C', 'Fm6/C', 'Bmaj7', 'Ab7', 'Dm'];
    const spanOf = (text, mode) => {
      const parsed = parseChord(text);
      const { notes } = voiceChord(parsed.notes,
        { mode, lo: LO, hi: HI, bass: parsed.bass !== null });
      return span(notes);
    };
    const closeSpans = LINE.map((t) => spanOf(t, 'close'));
    const rootSpans = LINE.map((t) => spanOf(t, 'root'));
    // The invariant is that close never widens a chord; a slash bass cannot be one octave wide.
    // why: lessons/kit-chords.md#t-never-widens
    ok('a close voicing never widens a chord, bass and all',
      closeSpans.every((n, i) => n <= rootSpans[i]),
      closeSpans.map((n, i) => `${LINE[i]} ${rootSpans[i]}->${n}`).join(', '));
    ok('and every chord with no slash bass ends up inside one octave, which is one hand',
      LINE.filter((t) => parseChord(t).bass === null).every((t) => spanOf(t, 'close') <= 12),
      LINE.filter((t) => parseChord(t).bass === null)
        .map((t) => `${t} ${spanOf(t, 'close')}`).join(', '));
    ok('NEGATIVE CONTROL: and in root position some of them are wider than a hand',
      rootSpans.some((n) => n > 12),
      `widest ${Math.max(...rootSpans)} semitones, on `
      + `${LINE[rootSpans.indexOf(Math.max(...rootSpans))]}`);
    // and everything still lands on the keys, in both modes
    const outsideAny = LINE.flatMap((text) => VOICINGS.map((mode) => {
      const parsed = parseChord(text);
      const { outside } = voiceChord(parsed.notes,
        { mode, lo: LO, hi: HI, bass: parsed.bass !== null });
      return outside.length ? `${text} ${mode}` : null;
    })).filter(Boolean);
    ok('and every chord in every voicing lands on the two octaves this keyboard draws',
      outsideAny.length === 0, outsideAny.join(', ') || 'all of them inside 48 to 72');
  }

  // 6. Split voicing: `Cmaj7 Dm7 Em7 Fmaj7` written out from the picture, checkable by eye.
  // Measured sabotage: root left in 4 red, dropped from slash 2, by span 1, fifth dropped 5.
  // why: lessons/kit-chords.md#t-split
  {
    const splitOf = (line) => {
      let prev = [], out = [];
      for (const text of line) {
        const parsed = parseChord(text);
        const { notes } = voiceChord(parsed.notes,
          { mode: 'split', lo: LO, hi: HI, near: prev, bass: parsed.bass !== null });
        out.push(notes);
        prev = notes;
      }
      return out;
    };
    const FOUR = ['Cmaj7', 'Dm7', 'Em7', 'Fmaj7'];
    const got = splitOf(FOUR);
    /* C3 / E3 G3 B3, D3 / F3 A3 C4, E3 / G3 B3 D4, F3 / A3 C4 E4. */
    const WANT = [[48, 52, 55, 59], [50, 53, 57, 60], [52, 55, 59, 62], [53, 57, 60, 64]];
    ok('the four chords in the picture come out as the picture has them',
      got.map((n) => n.join(',')).join(' / ') === WANT.map((n) => n.join(',')).join(' / '),
      got.map((n, i) => `${FOUR[i]} ${n.map(noteName).join(' ')}`).join(', '));
    ok('and the left hand walks C D E F, one note a chord',
      got.map((n) => noteName(n[0])).join(' ') === 'C3 D3 E3 F3',
      got.map((n) => noteName(n[0])).join(' '));

    // The claim is about the hand above, so the hand above is what is measured.
    // why: lessons/kit-chords.md#t-split-hand
    const move = (a, b) => a.reduce((s, n) => s + Math.min(...b.map((m) => Math.abs(m - n))), 0);
    const hand = got.slice(1).reduce((s, n, i) => s + move(n.slice(1), got[i].slice(1)), 0);
    const worst = Math.max(...got.slice(1).map((n, i) =>
      Math.max(...n.slice(1).map((x) => Math.min(...got[i].slice(1).map((y) => Math.abs(y - x)))))));
    ok('and the hand above barely moves, no note of it further than a whole tone',
      worst <= 2 && hand <= 16, `${hand} semitones over three changes, worst single move ${worst}`);

    // Rootless is asserted as an absence; a mode that left the root in would pass everything else.
    // why: lessons/kit-chords.md#t-rootless
    const rootless = FOUR.every((text, i) => {
      const r = parseChord(text).root;
      return got[i].slice(1).every((n) => (((n % 12) + 12) % 12) !== r);
    });
    ok('the root is not in the right hand, which is the whole of what this mode is',
      rootless, FOUR.map((t, i) =>
        `${t} over ${noteName(got[i][0])} without ${noteName(parseChord(t).root + 60)[0]}`).join(', '));
    ok('NEGATIVE CONTROL: and in the other three modes it is right there in the hand',
      ['root', 'close', 'lead'].every((mode) => {
        const c = parseChord('Cmaj7');
        const { notes } = voiceChord(c.notes, { mode, lo: LO, hi: HI });
        return notes.some((n) => (((n % 12) + 12) % 12) === c.root);
      }), 'Cmaj7 keeps its C in root, close and lead');

    // Nothing is lost: a split voicing holds exactly the spelling's pitch classes.
    // why: lessons/kit-chords.md#t-nothing-lost
    {
      const pcs = (ns) => [...new Set(ns.map((n) => ((n % 12) + 12) % 12))].sort((a, b) => a - b).join(',');
      const EVERY = ['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'Cmaj', 'c5', 'Csus2', 'C13', 'F/C', 'Fm6/C'];
      const lost = EVERY.filter((text) => {
        const parsed = parseChord(text);
        const { notes } = voiceChord(parsed.notes,
          { mode: 'split', lo: LO, hi: HI, bass: parsed.bass !== null });
        return pcs(notes) !== pcs(parsed.notes);
      });
      ok('a split voicing holds every note the symbol names, triads and slash chords included',
        lost.length === 0, lost.length ? `lost a note in ${lost.join(', ')}` : `all ${EVERY.length} of them`);
    }

    // A triad still loses its root, leaving two notes in the right hand: a decision.
    // why: lessons/kit-chords.md#t-triad
    {
      const { notes } = voiceChord(parseChord('Cmaj').notes, { mode: 'split', lo: LO, hi: HI });
      ok('a triad is two notes in the right hand over its root, not three with the fifth gone',
        notes.length === 3 && noteName(notes[0]) === 'C3'
        && notes.slice(1).map(noteName).join(' ') === 'E3 G3',
        notes.map(noteName).join(' '));
      const five = voiceChord(parseChord('c5').notes, { mode: 'split', lo: LO, hi: HI }).notes;
      ok('and a power chord is one note over its own root, which is still both of its notes',
        five.map(noteName).join(' ') === 'C3 G3', five.map(noteName).join(' '));
    }

    // A slash chord keeps its root, because the note underneath is not the root.
    // why: lessons/kit-chords.md#t-slash-root
    {
      const parsed = parseChord('Fm6/C');
      const { notes } = voiceChord(parsed.notes, { mode: 'split', lo: LO, hi: HI, bass: true });
      ok('a slash chord keeps its named bass underneath and its root in the hand',
        (((notes[0] % 12) + 12) % 12) === parsed.bass
        && notes[0] === Math.min(...notes)
        && notes.slice(1).some((n) => (((n % 12) + 12) % 12) === parsed.root),
        notes.map(noteName).join(' '));
    }

    // NEGATIVE CONTROL for placement: the hand must move less over a line than with nothing to lead from.
    // why: lessons/kit-chords.md#t-placement
    {
      const LINE = ['Cmaj7', 'A7', 'Dm7', 'G7', 'Em7', 'A7', 'Dm7', 'G7'];
      const led = splitOf(LINE);
      let cold = [], total = 0, coldTotal = 0;
      for (const text of LINE) {
        const parsed = parseChord(text);
        cold.push(voiceChord(parsed.notes, { mode: 'split', lo: LO, hi: HI, near: [] }).notes);
      }
      for (let i = 1; i < LINE.length; i++) {
        total += move(led[i].slice(1), led[i - 1].slice(1));
        coldTotal += move(cold[i].slice(1), cold[i - 1].slice(1));
      }
      ok('NEGATIVE CONTROL: the hand is led rather than placed, so a line moves less than the same chords placed alone',
        total < coldTotal, `${total} semitones led against ${coldTotal} with nothing to lead from`);
    }
  }
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
