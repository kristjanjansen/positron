// demo/shell/instruments-test.mjs — the desk's taxonomy, with no browser.
//
//   node demo/shell/instruments-test.mjs
//
// 🔴 A LOOKUP TABLE IS THE SHAPE OF CODE THAT PASSES A NAIVE TEST BY ACCIDENT.
// A `describe()` that returned the raw name for everything would satisfy any
// check that only asks whether something came back, so the asserts below name
// the exact maker, and the ones marked NEGATIVE CONTROL are written so that a
// specific wrong implementation fails them.
import { DESK, KINDS, describe, alias, normalise, sounds, resolve } from './instruments.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? `  (${detail})` : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `  (${detail})` : ''}`); }
};

// 1. The name that started it. `MK-425C USB MIDI Keyboard` had no Evolution in
//    it anywhere, which is why a model told to connect `evolution` found nothing.
{
  const d = describe('MK-425C USB MIDI Keyboard');
  ok('the keyboard answers to its maker, which its port name never contained',
    d.maker === 'Evolution' && d.full === 'Evolution MK-425C'
    && d.words.some((w) => w.toLowerCase() === 'evolution'),
    d.full);
}

// 2. Every kind is one of the published list, or the list is decoration.
ok('every entry on the desk has a kind and it is one of KINDS',
  DESK.every((e) => KINDS.includes(e.kind)),
  DESK.map((e) => e.kind).join(', '));

// 3. Each of the four kinds the owner named is actually on the desk.
//    Asked as *"also keyboard drum machine mixer soundcard"*.
{
  const reachable = new Set(DESK.flatMap((e) => [e.kind, ...(e.also || [])]));
  const want = ['keyboard', 'drum machine', 'mixer', 'soundcard'];
  const missing = want.filter((w) => !reachable.has(w));
  ok('the four kinds asked for are each reachable by name',
    missing.length === 0, missing.length ? `missing ${missing.join(', ')}` : want.join(', '));
}

// 4. The direction word comes off, which is what joins two halves of one cable.
ok('a trailing direction word is not part of an instrument name',
  describe('Model 12 MIDI IN').full === describe('Model 12 MIDI OUT').full,
  describe('Model 12 MIDI IN').full);

// 5. NEGATIVE CONTROL. A name nothing recognises gets NO invented brand. A
//    table that guessed would give this one a maker.
{
  const d = describe('Some Unknown Box');
  ok('NEGATIVE CONTROL: an unrecognised name gets no maker, no kind and no invention',
    d.known === false && d.maker === null && d.kind === null && d.full === 'Some Unknown Box',
    `${d.full}, maker ${d.maker}`);
}

// 6. NEGATIVE CONTROL. The empty and absent cases do not throw and do not
//    invent. A page asks about a port before it knows anything about it.
ok('NEGATIVE CONTROL: nothing, an empty string and a number all answer without throwing',
  ['', null, undefined, 42].every((v) => {
    const d = describe(v);
    return d.known === false && typeof d.label === 'string' && d.label.length > 0;
  }),
  `unnamed reads "${describe('').label}"`);

// 7. The loopback is the one thing nobody plays, and it is a BEHAVIOUR flag
//    rather than a label. `/bay/` links instruments by having them played, and
//    a loopback returns everything sent to it.
ok('the virtual bus is the only entry nobody plays',
  describe('IAC Driver Bus 1').plays === false
  && DESK.filter((e) => e.plays === false).length === 1
  && describe('Circuit').plays === true,
  `${DESK.filter((e) => e.plays === false).map((e) => e.model).join(', ')} is not played`);

// 8. NEGATIVE CONTROL. The Circuit and the Circuit Tracks are DIFFERENT
//    instruments and must not collide. Their patch headers differ at one byte,
//    so a table answering `Circuit` for both would hand somebody the wrong one.
{
  const c = describe('Circuit'), t = describe('Circuit Tracks');
  ok('NEGATIVE CONTROL: Circuit and Circuit Tracks are told apart',
    c.model === 'Circuit' && t.model === 'Circuit Tracks' && c.full !== t.full,
    `${c.full} against ${t.full}`);
}

// 8b. NEGATIVE CONTROL, AND IT IS THE ONE THE REAL DESK FOUND. Enriching both
//     of the Model 12's port pairs to `TASCAM Model 12` gave `/bay/` two rows
//     with the same name and nothing to tell them apart. A more specific entry
//     has to win, which means order matters and `find` is order dependent.
{
  const midi = describe('Model 12 MIDI IN');
  const daw = describe('Model 12 DAW Control IN');
  ok('NEGATIVE CONTROL: the Model 12 and its DAW control surface are two rows, not one name twice',
    midi.full !== daw.full && midi.maker === 'TASCAM' && daw.maker === 'TASCAM'
    && /daw/i.test(daw.full) && !/daw/i.test(midi.full),
    `${midi.full} against ${daw.full}`);
}

// 9. The alias line is what a model reads, and it must not repeat the full name
//    it sits beside, or the prompt says one thing twice.
{
  const line = alias('MK-425C USB MIDI Keyboard');
  ok('the alias line offers other words and never repeats the full name',
    line.startsWith('also called:') && !line.includes('Evolution MK-425C')
    && line.includes('Evolution') && line.includes('keyboard'),
    line);
}

// 10. NEGATIVE CONTROL. An unknown port contributes no alias line at all,
//     rather than a line saying nothing, which would be furniture in a prompt.
ok('NEGATIVE CONTROL: an unrecognised port adds no alias line',
  alias('Some Unknown Box') === '' && alias('') === '',
  'both empty');

// 11. Every word is a string somebody could type, and the raw name is among
//     them, because a reader may type what they see on the row.
{
  const d = describe('MK-425C USB MIDI Keyboard');
  ok('the words include the raw port name, because a reader types what is on the row',
    d.words.includes('MK-425C USB MIDI Keyboard')
    && d.words.every((w) => typeof w === 'string' && w.length > 0),
    `${d.words.length} words`);
}

// 12. No duplicates, or a prompt lists the same word twice and a picker shows it.
{
  const d = describe('Circuit');
  ok('the words are deduplicated',
    new Set(d.words.map((w) => w.toLowerCase())).size === d.words.length,
    d.words.join(' | '));
}

// 13. Nothing the desk says carries an em dash or a middot, which is a rule
//     about everything a reader looks at and these strings reach a page.
{
  const all = DESK.flatMap((e) => [e.maker, e.model, e.kind, e.note, ...(e.also || [])]).join(' ');
  ok('nothing in the taxonomy carries an em dash or a middot',
    !all.includes('—') && !all.includes('·'), `${all.length} characters`);
}

// 14. A note is one sentence. It reaches a hover and a prompt, and the standing
//     rule for a note is two sentences at most with about forty words.
ok('every note is one short sentence',
  DESK.every((e) => !e.note || (e.note.split(/\s+/).length <= 20 && !/\.\s/.test(e.note))),
  DESK.map((e) => e.note.split(/\s+/).length).join(', ') + ' words');

// ── hearing a name wrong ──────────────────────────────────────────────────
//
// 🔴 EVERY NEGATIVE CONTROL BELOW IS A REAL FALSE MATCH FROM THE FIRST BUILD,
// not an invented worry. `connect` matched Novation Circuit at one edit,
// `machine from` matched the Model 12's DAW control, and `keyboard` matched the
// M-Audio Fast Track Pro. Reported from the other side in the same minute:
// *"circuit gets mistaken for secury"*. A matcher like this fails by being too
// helpful, so the asserts that matter are the ones about silence.

// 16. Spoken digits become a model number, which is what a person says out loud.
ok('a spoken model number normalises to digits',
  normalise('mk four twenty five c') === 'mk 425 c'
  && normalise('Model  12!') === 'model 12',
  `"${normalise('mk four twenty five c')}"`);

// 17. The sound key brings together what a microphone confuses, and it is the
//     two-tokens-into-one case that a token by token comparison cannot reach.
ok('tascam and task am reduce to the same sound',
  sounds('tascam') === sounds('task am') && sounds('tascam').length >= 4,
  `${sounds('tascam')} for both`);

// 18. The cases this was asked for.
{
  const a = resolve('connect evolution to circuit').map((h) => h.full);
  const b = resolve('connect the task am to the circus').map((h) => h.full);
  ok('a sentence naming the instruments properly resolves both, exactly',
    a.includes('Evolution MK-425C') && a.includes('Novation Circuit')
    && resolve('connect evolution to circuit').every((h) => h.how === 'exact'),
    a.join(', '));
  ok('and a mis-heard sentence still resolves them, by sound',
    b.includes('Novation Circuit') && b.some((f) => f.startsWith('TASCAM')),
    b.join(', '));
}

// 19. NEGATIVE CONTROL. An instruction that names no instrument resolves to
//     NOTHING. Three sentences, all of them things somebody would really say.
{
  const quiet = ['can you make it a bit louder please',
    'put the mod wheel on the master filter',
    'connect it to the thing and then route it'];
  const noisy = quiet.filter((q) => resolve(q).length);
  ok('NEGATIVE CONTROL: an instruction naming no instrument resolves to nothing',
    noisy.length === 0,
    noisy.length ? `matched in: ${noisy.join(' | ')}` : `${quiet.length} sentences, all silent`);
}

// 20. NEGATIVE CONTROL, AND THE SHARPEST ONE. `connect` is one edit from
//     `circuit` by sound and shares its first letter, so no threshold separates
//     them. The stop list does, and this is the assert that says so.
ok('NEGATIVE CONTROL: the verb "connect" never resolves to the Circuit',
  !resolve('connect').length && !resolve('connect connect').length
  && resolve('circuit').some((h) => h.full === 'Novation Circuit'),
  'the verb is silent and the noun is not');

// 21. NEGATIVE CONTROL. The instrument that is not plugged in is never offered,
//     however many aliases it shares with one that is.
ok('NEGATIVE CONTROL: an instrument that is not on the desk is never resolved',
  DESK.some((e) => e.present === false)
  && !resolve('connect the novation drum machine').some((h) => /Tracks/.test(h.full)),
  resolve('connect the novation drum machine').map((h) => h.full).join(', ') || 'nothing');

// 22. An exact hit always beats a sound-alike for the same instrument, or a
//     sentence that named a thing properly could be "corrected" to something
//     else, which is the worst thing this could do.
{
  const h = resolve('circuit').find((x) => x.full === 'Novation Circuit');
  ok('an exact hit wins, so a properly named instrument is never re-interpreted',
    h && h.how === 'exact' && h.cost === 0, h ? `${h.how} ${h.cost}` : 'no hit');
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
