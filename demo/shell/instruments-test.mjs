// demo/shell/instruments-test.mjs — the desk's taxonomy, with no browser.
//
//   node demo/shell/instruments-test.mjs
//
// 🔴 A LOOKUP TABLE IS THE SHAPE OF CODE THAT PASSES A NAIVE TEST BY ACCIDENT.
// A `describe()` that returned the raw name for everything would satisfy any
// check that only asks whether something came back, so the asserts below name
// the exact maker, and the ones marked NEGATIVE CONTROL are written so that a
// specific wrong implementation fails them.
import { DESK, KINDS, describe, alias, normalise, sounds, resolve, tokenise, reword } from './instruments.mjs';

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

// ── what the real speech models actually said ─────────────────────────────
//
// 🔴 EVERYTHING ABOVE THIS LINE WAS GRADED ON MIS-HEARINGS SOMEBODY INVENTED,
// AND THAT IS WHAT THESE ROWS REPLACE. Asked 2026-09-21: *"do a comprehensive
// rig testing on get good lookups"*, on the grounds that the positives and the
// negative controls were both made up. **48 instructions were synthesised with
// `say` across six voices** (Daniel en_GB, Samantha en_US, Karen en_AU, Moira
// en_IE, Tessa en_ZA, Rishi en_IN), converted to webm/opus, and put through
// **three real Whisper models on Workers AI, once each, 144 calls**. Every
// transcript below is a string a model returned, quoted exactly, including the
// leading space `whisper-tiny-en` puts on everything.
// `research/name-lookups-2026-09-21.md` has all 144 and the arithmetic.
//
// ⚠️ THE SUBSET HERE IS THE SOUND BRANCH'S WORK AND THE SILENCES. A transcript
// the models got word for word is graded by the asserts above; what is worth
// keeping is every row where the name arrived broken and every row where a
// person named nothing.

/** [transcript as returned, models that returned it, what must be found] */
const HEARD = [
  // the name arrived broken and was recovered
  ['Send the Novation to the taskam.', 'whisper', ['Novation Circuit', 'TASCAM']],
  [' Send the Novation to the taskome.', 'tiny-en', ['Novation Circuit', 'TASCAM']],
  ['The evolution plays the circuit and the taskham records it.', 'whisper',
    ['Evolution MK-425C', 'Novation Circuit', 'TASCAM']],
  [' Taspim', 'tiny-en', ['TASCAM']],
  ['Open the IOC driver.', 'turbo', ['Apple IAC Driver']],
  [' Open the ISC driver', 'tiny-en', ['Apple IAC Driver']],
  ['Send the keyboard through the IRC driver to the circuit.', 'turbo',
    ['Evolution MK-425C', 'Apple IAC Driver', 'Novation Circuit']],
  ['Play the MK425C into the circuit.', 'turbo and whisper',
    ['Evolution MK-425C', 'Novation Circuit']],
  ['MK425C', 'turbo and whisper', ['Evolution MK-425C']],
  [' Play the MK425 C into the circuit.', 'tiny-en',
    ['Evolution MK-425C', 'Novation Circuit']],
  ['The fast track row is the recording input.', 'whisper', ['M-Audio Fast Track Pro']],
  [' Fast-trap.', 'tiny-en', ['M-Audio Fast Track Pro']],
  ['Put the Groover box through the audio interface.', 'turbo', ['Novation Circuit']],
  ['put the groove a box through the audio interface.', 'whisper', ['Novation Circuit']],
  [' put the groovabox through the audio interface.', 'tiny-en', ['Novation Circuit']],
  ['Apple Boss is echoing everything back.', 'whisper', ['Apple IAC Driver']],
  [' the apple bosses echoing everything back.', 'tiny-en', ['Apple IAC Driver']],
  ['Use the Mordio Fast Track Pro for the recording.', 'whisper', ['M-Audio Fast Track Pro']],
  [' Connect the Evolution keyboard to the Notation circuit.', 'tiny-en',
    ['Evolution MK-425C', 'Novation Circuit']],
  [' The sound card is on channel 1.', 'all three', ['M-Audio Fast Track Pro']],
];

{
  const wrong = [];
  for (const [text, who, want] of HEARD) {
    const got = resolve(text).map((h) => h.full);
    for (const w of want) if (!got.some((g) => g.includes(w))) wrong.push(`${who}: ${w} not in ${JSON.stringify(text)}`);
  }
  ok('every instrument a real model mangled is still found, over 20 real transcripts',
    wrong.length === 0, wrong.length ? wrong.join(' | ') : `${HEARD.length} transcripts, ${HEARD.reduce((a, h) => a + h[2].length, 0)} instruments`);
}

// 🔴 THE OTHER HALF, AND IT IS THE HALF THIS MATCHER IS CALIBRATED FOR. Sixteen
// of the forty eight instructions name nothing on this desk, and all three
// models transcribed all sixteen. **48 of 48 resolve to nothing**, which is the
// number that has to stay where it is.
{
  const quiet = [
    'Make it louder.', 'Stop everything.', 'Put the mod wheel on the filter',
    'Can you make it a bit louder please?', 'Turn the reverb down a little.',
    ' Turn the river down a little.', 'Start the recording now.',
    'Clear all the connections.', 'Transpose it up one octave.',
    'What is connected right now?', 'Mute the second channel', 'Set the tempo to 120.',
    'Play a chord and hold it down.', ' Play Accord and hold it down.',
    'Root it to the thing and then send it back.', 'route it to the thing and then send it back.',
    'Give me a bit more bass in the monitors.', 'Give me a bit more base in the monitors.',
    'disconnect everything and start again', 'Send a program change on channel 10.',
  ];
  const noisy = quiet.filter((q) => resolve(q).length);
  ok('NEGATIVE CONTROL: 20 real transcripts of instructions naming nothing are all silent',
    noisy.length === 0,
    noisy.length ? noisy.map((q) => `${JSON.stringify(q)} -> ${resolve(q).map((h) => h.full)}`).join(' | ')
      : `${quiet.length} transcripts, all silent`);
}

// 🔴 NEGATIVE CONTROL FOR THE FLOOR ON WHAT WAS SAID, WHICH IS A CHANGE MADE ON
// THIS EVIDENCE. `card` and `chord` both reduce to `krt`, one edit from `kprt`
// (keyboard) and one from `krkt` (Circuit). Before the floor applied to the
// spoken side, *"The sound card is on channel 1."* found the keyboard and the
// Circuit as well as the soundcard, and *"Play a chord and hold it down."* found
// both of them having named nothing. Four of the thirteen measured false
// positives, and it is the soundcard that must survive.
{
  const card = resolve('The sound card is on channel 1.').map((h) => h.full);
  const chord = resolve('Play a chord and hold it down.').map((h) => h.full);
  ok('NEGATIVE CONTROL: "card" and "chord" reach neither the keyboard nor the Circuit',
    card.length === 1 && card[0] === 'M-Audio Fast Track Pro' && chord.length === 0,
    `card -> ${card.join(', ')}, chord -> ${chord.join(', ') || 'nothing'}`);
}

// 🔴 NEGATIVE CONTROL FOR `control` IN THE STOP LIST, ALL FOUR INFLECTIONS. It
// was the last false positive standing against the real transcripts and it
// stood on all three models. The positive half matters as much: `controller`
// said properly still finds the keyboard, because the exact branch never reads
// the stop list.
{
  const daw = resolve('The Tascam Model 12 door control does nothing at all.').map((h) => h.full);
  const inflected = ['a controlled sound', 'controlling the level', 'the control room',
    'the controls are on the left'].filter((s) => resolve(s).length);
  const real = resolve('The controller has 25 keys on it').map((h) => h.full);
  ok('NEGATIVE CONTROL: no form of "control" reaches the keyboard, and "controller" still does',
    !daw.includes('Evolution MK-425C') && inflected.length === 0
    && real.includes('Evolution MK-425C'),
    `daw -> ${daw.join(', ')}, inflections ${inflected.join(' | ') || 'all silent'}`);
}

// 🔴 NEGATIVE CONTROL FOR THE EXACT BRANCH READING THE STOP LIST. `bus` is the
// IAC Driver's kind and it is ordinary mixing English. The sound floor already
// refused it, so only an exact hearing could reach it, and two did: `the master
// bus` and `a bus compressor` both resolved to the Apple IAC Driver. The test is
// the WHOLE alias, so `virtual bus` is untouched, and that is the positive half.
{
  const mix = ['the master bus', 'a bus compressor', 'the mix bus', 'the aux bus']
    .filter((s) => resolve(s).length);
  const real = resolve('Route the Virtual Bus to the Loopback.').map((h) => h.full);
  ok('NEGATIVE CONTROL: a bare "bus" names nothing, and "virtual bus" still names the IAC Driver',
    mix.length === 0 && real.includes('Apple IAC Driver'),
    `${mix.join(' | ') || 'four mixing phrases silent'}, virtual bus -> ${real.join(', ')}`);
}

// 🔴 NEGATIVE CONTROL FOR THE WINDOW RUNNING FROM ONE TOKEN. Widening it is the
// one LOOSENING in this round, bought by `MK425C` arriving as a single token
// from all three models. These five are the words that a narrower said-side
// floor would have let in, so they are exactly where a wider window would show
// up if it had opened anything. It changed the answer on none of 132 ordinary
// studio phrases and these are five of them.
{
  const loud = ['grab the fader', 'group the channels', 'the disk is full',
    'copper wire on the jack', 'a task for later', 'a grip on it', 'the tusk']
    .filter((s) => resolve(s).length);
  ok('NEGATIVE CONTROL: a one token window opens none of the near misses',
    loud.length === 0,
    loud.length ? loud.map((s) => `${s} -> ${resolve(s).map((h) => h.full)}`).join(' | ')
      : 'seven near misses silent');
}

// 🔴 NEGATIVE CONTROL FOR THE STOP TOKEN EXEMPTION, AND IT IS THE ONE THAT
// PRICED THE OBVIOUS REPAIR. A stop word is ignored only when taking it out
// leaves the sound key the SAME string, which proves it did not contribute. The
// obvious version, dropping stop words and comparing the rest, resolves *"crack
// the gate open"* to the Novation Circuit at distance 0, because `crack gate`
// reduces to `krkt` and so does `circuit`. With the `the` in, the span reduces
// to `krktkt`, a different string, and this refuses it.
{
  const gate = resolve('crack the gate open').map((h) => h.full);
  const machine = resolve('machine from').map((h) => h.full);
  const split = resolve('put the groove a box through the audio interface.').map((h) => h.full);
  ok('NEGATIVE CONTROL: an ignored stop word must change nothing, so "crack the gate" stays silent',
    gate.length === 0 && machine.length === 0 && split.includes('Novation Circuit'),
    /* ⚠️ THE DETAIL NAMES ALL THREE HALVES, because this assert failed under the
       window sabotage for the SPLIT half while its message showed only the two
       silent ones, which sends a reader to the wrong change. */
    `crack the gate -> ${gate.join(', ') || 'nothing'}, machine from -> `
    + `${machine.join(', ') || 'nothing'}, groove a box -> ${split.join(', ') || 'nothing'}`);
}

// 🔴 NEGATIVE CONTROL FOR `Fast Track` ON THE DESK. The word `Pro` is the one a
// speech model drops, four times across three models, so the line name is an
// alias. The negative half is that the two ordinary words it is made of do not
// reach it on their own or in the wrong company.
{
  const ftp = 'M-Audio Fast Track Pro';
  const found = ['Fast Track', 'The fast track row is the recording input.', ' Fast-trap.']
    .every((s) => resolve(s).some((h) => h.full === ftp));
  const loud = ['fast forward', 'the first take', 'the track is long', 'a fast one',
    'arm the track', 'a click track'].filter((s) => resolve(s).length);
  ok('NEGATIVE CONTROL: "fast track" names the soundcard and "fast" and "track" alone do not',
    found && loud.length === 0,
    loud.length ? loud.join(' | ') : 'three hearings found, six ordinary phrases silent');
}

// 🔴 THE CEILING, AND IT IS AN ASSERT RATHER THAN A PARAGRAPH. Three of the 144
// transcripts lost the name entirely, and a matcher tuned until its table looked
// good would have found something in them. An honest one finds nothing. If any
// of these three ever starts resolving, something has been loosened too far.
{
  const gone = [
    ['Ask them.', 'turbo heard the whole word "tascam" as two others'],
    ['So good.', 'whisper heard the whole word "circuit" as two others'],
  ];
  const found = gone.filter(([s]) => resolve(s).length);
  ok('NEGATIVE CONTROL: a transcript that lost the name resolves to nothing, rather than to something',
    found.length === 0,
    found.length ? found.map(([s]) => `${JSON.stringify(s)} -> ${resolve(s).map((h) => h.full)}`).join(' | ')
      : gone.map(([s]) => JSON.stringify(s)).join(' and ') + ' both silent');
}

// ── where a name sits in the sentence, and what a page may do about it ──────
//
// 🔴 `tokenise()` AND `normalise()` MUST AGREE, AND THE WAY TO BE SURE IS NOT
// TO READ THEM. A correction that lands in a textarea is placed by a character
// offset, and an offset that is one token out rewrites the wrong word while
// looking entirely plausible on screen. `normalise()` is written in terms of
// `tokenise()` for that reason, so this asserts the property rather than the
// two implementations: every token's own slice of the RAW string has to reduce
// back to that token.
{
  const strings = [
    '', ' ', '...', 'Play the MK425C into the circuit.', ' Play the MK425 C into the circuit.',
    'mk four twenty five c', 'The tascam model twelve daw control does nothing at all.',
    'put the groove a box through the audio interface.', 'Set the tempo to 120.',
    'Connect the keyboard to the circuit and transpose it up one semitone.',
    'MK-425C', 'Twenty-five!', 'a1 b2', 'one two three four', '  leading and trailing  ',
  ];
  const bad = [];
  for (const s of strings) {
    const tok = tokenise(s);
    if (tok.map((t) => t.word).join(' ') !== normalise(s)) bad.push(`${JSON.stringify(s)} does not rebuild`);
    for (const t of tok) {
      if (normalise(s.slice(t.at, t.to)) !== t.word) {
        bad.push(`${JSON.stringify(s)} token ${JSON.stringify(t.word)} points at ${JSON.stringify(s.slice(t.at, t.to))}`);
      }
    }
  }
  ok('every token knows where it came from, and its own words reduce back to it',
    bad.length === 0, bad.length ? bad.join(' | ') : `${strings.length} strings, offsets intact`);
}

// 🔴 THE SPANS ARE WHAT MAKES A CORRECTION PLACEABLE, so a hit has to point at
// the words that matched and not merely report that something matched.
{
  const s = 'Play the MK425C into the circuit.';
  const hits = resolve(s);
  const slice = (f) => { const h = hits.find((x) => x.full === f); return h ? s.slice(h.at, h.to) : null; };
  ok('a hit points at the words in the raw sentence, capitals and all',
    slice('Evolution MK-425C') === 'MK425C' && slice('Novation Circuit') === 'circuit',
    `${JSON.stringify(slice('Evolution MK-425C'))} and ${JSON.stringify(slice('Novation Circuit'))}`);
}

/** The three instruments `/wish/` actually has. Everything else on DESK is in
 *  this room and not on that page, which is the whole point of `has`. */
const WISH = new Set(['Evolution MK-425C', 'Novation Circuit', 'TASCAM Model 12']);
const onWish = { has: (f) => WISH.has(f) };

// A mis-heard name is repaired in the words a reader is looking at, and the
// repair says what it replaced. Three real transcripts, three models.
{
  const cases = [
    ['put the groove a box through the audio interface.', 'put the Novation Circuit through the audio interface.', 'groove a box'],
    ['Play the MK425C into the circuit.', 'Play the Evolution MK-425C into the circuit.', 'MK425C'],
    ['The evolution plays the circuit and the taskham records it.',
      'The evolution plays the circuit and the TASCAM Model 12 records it.', 'taskham'],
  ];
  const bad = [];
  for (const [said, want, was] of cases) {
    const r = reword(said, onWish);
    if (r.text !== want) bad.push(`${JSON.stringify(said)} -> ${JSON.stringify(r.text)}`);
    if (!r.fixed.some((f) => f.was === was)) bad.push(`${JSON.stringify(said)} did not report ${JSON.stringify(was)}`);
  }
  ok('a mis-heard name is corrected in the raw words, and the correction says what it replaced',
    bad.length === 0, bad.length ? bad.join(' | ') : `${cases.length} real transcripts repaired and reported`);
}

// 🔴 NEGATIVE CONTROL: AN EXACT HEARING IS NEVER REWRITTEN. This is the assert
// that fails an implementation which simply replaces every hit with its full
// name: `circuit` and `keyboard` are correct English for those instruments and
// `Novation Circuit` is not an improvement on them, it is a page editing
// somebody's sentence for nothing.
{
  const same = ['Connect the keyboard to the circuit and transpose it up one semitone.',
    'The desk needs DOM mode switched on.', 'Send the circuit to the model 12.'];
  const moved = same.filter((s) => reword(s, onWish).text !== s);
  ok('NEGATIVE CONTROL: a sentence that named the instruments properly comes back untouched',
    moved.length === 0, moved.length ? moved.map((s) => JSON.stringify(reword(s, onWish).text)).join(' | ')
      : `${same.length} sentences unchanged`);
}

// 🔴 NEGATIVE CONTROL: NOTHING NAMED, NOTHING CHANGED. The twenty transcripts
// above that resolve to nothing must also come back character for character,
// because `reword` is the half a page hands to a person.
{
  const quiet = ['Make it louder.', 'Stop everything.', 'Put the mod wheel on the filter',
    'Turn the reverb down a little.', 'Play a chord and hold it down.', 'Set the tempo to 120.',
    'Give me a bit more bass in the monitors.', 'Root it to the thing and then send it back.'];
  const moved = quiet.filter((s) => reword(s, onWish).text !== s);
  ok('NEGATIVE CONTROL: an instruction naming nothing is returned exactly as it arrived',
    moved.length === 0, moved.length ? moved.join(' | ') : `${quiet.length} instructions unchanged`);
}

// 🔴 NEGATIVE CONTROL: AN INSTRUMENT THE CALLER DOES NOT HAVE IS REPORTED AND
// NEVER SUBSTITUTED. `/wish/` has no Fast Track Pro and no IAC Driver, so a
// sentence naming one is a fact worth saying and never a word worth changing.
// An implementation that rewrote on `resolve()` alone would fail this, and the
// page would then answer *nothing on this desk* about a name it wrote itself.
{
  const away = [['The fast track row is the recording input.', 'M-Audio Fast Track Pro'],
    ['Apple Boss is echoing everything back.', 'Apple IAC Driver'],
    ['The tascam model twelve daw control does nothing at all.', 'TASCAM Model 12 DAW control']];
  const bad = [];
  for (const [s, name] of away) {
    const r = reword(s, onWish);
    if (r.text !== s) bad.push(`${JSON.stringify(s)} was rewritten to ${JSON.stringify(r.text)}`);
    if (!r.absent.some((a) => a.names.includes(name))) bad.push(`${JSON.stringify(s)} did not report ${name}`);
    if (r.fixed.length) bad.push(`${JSON.stringify(s)} claimed a repair`);
  }
  ok('NEGATIVE CONTROL: a name this desk does not have is reported and never substituted',
    bad.length === 0, bad.length ? bad.join(' | ')
      : away.map(([, n]) => n).join(', ') + ' each named and each left alone');
}

// 🔴 THE DECISION THAT WAS OPEN, AND IT IS GRADED HERE BECAUSE `/wish/` CANNOT
// REACH IT. `HANDOFF.md` asked what a page does with two hits for one
// instruction. Two shapes look alike and only one is an ambiguity.
//
// **A name inside a longer name is not two instruments.** `tascam model twelve
// daw control` contains `tascam model twelve`, and somebody who said the long
// one said the long one.
{
  const s = 'The tascam model twelve daw control does nothing at all.';
  const names = reword(s).hits.map((h) => h.full);
  ok('a more specific name beats the name inside it, so one span names one instrument',
    names.length === 1 && names[0] === 'TASCAM Model 12 DAW control', names.join(', ') || 'nothing');
}

// 🔴 NEGATIVE CONTROL: TWO INSTRUMENTS THE CALLER REALLY HAS, ON ONE SPAN, IS
// NEVER REPAIRED. `audio interface` is an alias of the TASCAM Model 12 AND of
// the M-Audio Fast Track Pro, both exact, both at distance 0, and no threshold
// and no cleverer phonetic key can separate them. A page that picked one would
// be printing a coin toss as a fact. Both names are reported, the words stand,
// and a person fixes it by typing one of them.
// ⚠️ IT IS GRADED WITH A DESK THAT HAS BOTH, on purpose: `/wish/` carries three
// instruments and the ambiguity cannot arise there, so a check written against
// that page would pass while measuring nothing.
{
  const both = { has: (f) => f === 'TASCAM Model 12' || f === 'M-Audio Fast Track Pro' };
  const s = 'Send it through the audio interface.';
  const r = reword(s, both);
  const u = r.unsure[0];
  ok('NEGATIVE CONTROL: one span naming two instruments on the desk is reported and never picked',
    r.text === s && r.fixed.length === 0 && !!u && u.names.length === 2
      && u.names.includes('TASCAM Model 12') && u.names.includes('M-Audio Fast Track Pro'),
    u ? `${JSON.stringify(u.was)} -> ${u.names.join(' or ')}, nothing rewritten` : 'no ambiguity reported');
}

// 🔴 AND THE SAME REFUSAL ON A MIS-HEARD SPAN, WHICH IS THE ONLY VERSION OF IT
// THAT CAN BE GOT WRONG. FOUND BY SABOTAGE: dropping the `continue` after an
// ambiguity is reported left the check above FULLY GREEN, because
// `audio interface` is an exact hearing and nothing was ever going to be
// rewritten there. The branch that matters is a span that WOULD have been
// repaired had it named one thing, and there is a real transcript of it:
// `whisper` returned *"Send the Novation to the taskam."*, and `taskam` reaches
// the TASCAM Model 12 and its DAW control surface at the same distance.
{
  const both = { has: (f) => f.startsWith('TASCAM') };
  const s = 'Send the Novation to the taskam.';
  const r = reword(s, both);
  const u = r.unsure[0];
  ok('NEGATIVE CONTROL: a mis-heard span naming two instruments is refused rather than guessed',
    r.text === s && r.fixed.length === 0 && !!u && u.was === 'taskam' && u.names.length === 2,
    u ? `${JSON.stringify(u.was)} -> ${u.names.join(' or ')}, ${r.fixed.length} repaired`
      : `no ambiguity reported, ${r.fixed.length} repaired`);
}

// 🔴 AND A REPAIR MUST NOT BE ABLE TO PRODUCE A NAME NOTHING DOWNSTREAM KNOWS.
// Whatever `reword` writes into the box is read next by a language model whose
// vocabulary is the caller's own alias list, so the two lists have to hold the
// same strings. This is the two-derivations-of-one-fact rule: the check is that
// a name `reword` can write is a name `describe()` gives for a port on the
// desk, which is where the page builds its aliases from.
{
  const ports = ['MK-425C USB MIDI Keyboard', 'Circuit', 'Model 12 MIDI IN'];
  const known = new Set(ports.map((p) => describe(p).full));
  const writes = ['put the groove a box through it', 'Play the MK425C', 'the taskham records it']
    .flatMap((s) => reword(s, { has: (f) => known.has(f) }).fixed.map((f) => f.full));
  ok('every name a repair can write is a name the desk already answers to',
    writes.length === 3 && writes.every((w) => known.has(w)), writes.join(', ') || 'nothing written');
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
